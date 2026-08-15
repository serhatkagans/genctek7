import { oturumKullanicisi } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  egitimOgretimYiliAraligi,
  yilBicimiGecerliMi,
} from "@/lib/ogretmen/gorev-yillari";
import { adParcasi } from "@/lib/rapor/csv";
import {
  altBaslikYaz,
  basliklardanSutunlar,
  bicimCoz,
  disaAktarmaYaniti,
} from "@/lib/rapor/disa-aktarma";
import {
  DUZEY_ETIKETLERI,
  duzeyGecerliMi,
  KIRILIM_ETIKETLERI,
  kirilimBasliklari,
  kirilimGecerliMi,
  kirilimHucreleri,
  kirilimSatirlari,
} from "@/lib/rapor/kirilim-istatistigi";
import { projeYoneticisiMi } from "@/lib/yetki/izinler";

export const dynamic = "force-dynamic";

/**
 * PROGRAM / ÇALIŞMA GRUBU KIRILIMLI ETKİNLİK İSTATİSTİĞİ — CSV
 * (14 Ağustos 2026 · istek: "proje yöneticisi için tüm illerde ve okullarda …
 * istatistiğini csv formatında çıktı alabileceğimiz bir alan olabilir mi, ama
 * program ve çalışma gruplarını ayrı ayrı alsın").
 *
 * İKİ PARAMETRE, ALTI DOSYA: `kirilim` (program | grup) × `duzey`
 * (ulke | il | okul). Altı ayrı rota yazmak, aynı sorgunun altı kopyasını
 * doğururdu; toplama işi saf katmanda (lib/rapor/kirilim-istatistigi.ts) ve
 * birim testli.
 *
 * YALNIZCA PROJE YÖNETİCİSİ. Kapsam filtresi YOK — çıktı ülke geneli ve istek
 * de bunu istiyor. İl koordinatörüne açılsaydı ya kendi iliyle sınırlanması
 * (ayrı bir kural) ya da tüm illeri görmesi gerekirdi; ikisi de bu isteğin
 * dışında. Yetkisi olmayan 404 alır — rotanın varlığı sızmasın.
 *
 * ERİŞİM LOGU YAZILMIYOR, emsali yönetim panosu CSV'si: çıktıda kişisel veri
 * yok, birim başına SAYI var. Öğrenci/öğretmen envanteri çıktılarında tam tersi
 * geçerli ve orada her satır loglanıyor.
 *
 * ÜST SINIR SORULMUYOR (aynı gerekçe): en kötü hâlde satır sayısı
 * okul × birim mertebesinde ve etkinliği olmayan okul dosyaya hiç girmiyor.
 *
 * İPTAL EDİLEN ETKİNLİK SAYILMAZ: iptal, "bu etkinlik yapılmadı" demektir ve
 * istatistiğe girseydi program başına düzenlenen etkinlik sayısı olduğundan
 * fazla görünürdü. Kayıt silinmiyor, yalnızca sayımın dışında (bkz. durum
 * alanı · FaaliyetDurumu).
 */

export async function GET(istek: Request) {
  const kullanici = await oturumKullanicisi();
  if (!kullanici || !projeYoneticisiMi(kullanici)) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const adres = new URL(istek.url);
  const kirilimParam = adres.searchParams.get("kirilim") ?? "program";
  const duzeyParam = adres.searchParams.get("duzey") ?? "il";
  const yilParam = (adres.searchParams.get("yil") ?? "").trim();

  if (!kirilimGecerliMi(kirilimParam) || !duzeyGecerliMi(duzeyParam)) {
    return new Response("Geçersiz kırılım ya da düzey.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  /*
   * YIL SÜZGECİ İSTEĞE BAĞLI: boş bırakılırsa tüm yıllar. Varsayılan olarak
   * içinde bulunulan yıla kısılsaydı, "geçen yıl hangi program kaç kez
   * yapıldı" sorusu dosyada hiç görünmezdi ve kullanıcı eksikliği fark
   * etmezdi. Geçersiz yıl sessizce yok sayılmaz — yazım hatası, boş bir
   * dosyayı "hiç etkinlik yok" diye okutur.
   */
  if (yilParam && !yilBicimiGecerliMi(yilParam)) {
    return new Response(
      "Eğitim öğretim yılı 2025-2026 biçiminde olmalıdır.",
      { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }
  const aralik = yilParam ? egitimOgretimYiliAraligi(yilParam) : null;

  /*
   * TEK BİR GRUBA / PROGRAMA DARALTMA (14 Ağustos 2026 · istek: çıktı
   * sayfasında çalışma grubu ve program listeleri seçilebilsin — "Oyun
   * Tasarımı, Siber Güvenlik, … bunlar gibi").
   *
   * Süzgeç KİMLİKLE geliyor, adla değil: ad, Sistem Ayarları'ndan
   * değiştirilebilir ve iki grup birbirine çok benzeyen adlar taşıyabiliyor
   * ("Genç X" ile "GençX" aynı anda kayıtlı). Kimlikle gelen seçim, adın
   * yazımından bağımsız olarak doğru kaydı bulur.
   *
   * Ad, süzgeç eşleştiği için ayrıca OKUNUYOR: satır toplama saf katmanda ve
   * orada birim ADIYLA tutuluyor (bkz. kirilimSatirlari · birim). Var olmayan
   * bir kimlik gelirse boş dosya değil hata dönüyor — boş dosya "hiç etkinlik
   * yok" diye okunurdu.
   */
  const grupId = Number.parseInt(adres.searchParams.get("grup") ?? "", 10);
  const programId = Number.parseInt(adres.searchParams.get("program") ?? "", 10);

  const [grup, program] = await Promise.all([
    Number.isFinite(grupId)
      ? prisma.calismaGrubu.findUnique({
          where: { id: grupId },
          select: { id: true, ad: true },
        })
      : null,
    Number.isFinite(programId)
      ? prisma.temelEtkinlikProgrami.findUnique({
          where: { id: programId },
          select: { id: true, ad: true },
        })
      : null,
  ]);

  if ((Number.isFinite(grupId) && !grup) || (Number.isFinite(programId) && !program)) {
    return new Response("Seçilen çalışma grubu ya da program bulunamadı.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const faaliyetler = await prisma.faaliyet.findMany({
    where: {
      durum: "AKTIF",
      ...(aralik
        ? { tarih: { gte: aralik.baslangic, lte: aralik.bitis } }
        : {}),
      // Süzgeçler kırılımdan BAĞIMSIZ uygulanır: "Robotik grubuna bağlı
      // etkinlikler, programlarına göre" da geçerli bir sorudur.
      ...(grup ? { calismaGruplari: { some: { calismaGrubuId: grup.id } } } : {}),
      ...(program ? { temelEtkinlikProgramiId: program.id } : {}),
    },
    select: {
      id: true,
      kontenjan: true,
      ilKodu: true,
      il: { select: { ad: true } },
      kurumKodu: true,
      kurum: {
        select: { ad: true, ilKodu: true, il: { select: { ad: true } } },
      },
      temelEtkinlikProgrami: { select: { ad: true } },
      calismaGruplari: { select: { calismaGrubu: { select: { ad: true } } } },
      rapor: { select: { faaliyetId: true } },
      basvurular: { select: { durum: true, katildiMi: true } },
    },
  });

  const satirlar = kirilimSatirlari(
    faaliyetler.map((faaliyet) => ({
      id: faaliyet.id,
      kontenjan: faaliyet.kontenjan,
      raporVarMi: faaliyet.rapor !== null,
      /*
       * ETKİNLİĞİN İLİ: kapsam=IL'de kendi ili, kapsam=OKUL'da OKULUN ili.
       * Okul etkinliğinin `il_kodu` sütunu boştur; okulun ilinden okunmasaydı
       * bütün okul etkinlikleri "(ulusal etkinlik)" satırına düşerdi.
       */
      ilKodu: faaliyet.ilKodu ?? faaliyet.kurum?.ilKodu ?? null,
      ilAdi: faaliyet.il?.ad ?? faaliyet.kurum?.il.ad ?? null,
      kurumKodu: faaliyet.kurumKodu,
      kurumAdi: faaliyet.kurum?.ad ?? null,
      programAdi: faaliyet.temelEtkinlikProgrami?.ad ?? null,
      gruplar: faaliyet.calismaGruplari.map(
        (bag) => bag.calismaGrubu.ad,
      ),
      basvurular: faaliyet.basvurular,
    })),
    {
      kirilim: kirilimParam,
      duzey: duzeyParam,
      /*
       * SATIR SÜZGECİ yalnızca kırılımla AYNI alanda uygulanır: grup kırılımında
       * seçilen grup, program kırılımında seçilen program. Çapraz durumda
       * (grup seçilip program kırılımı alındığında) etkinlikler zaten sorguda
       * süzülmüş oluyor ve satırlar programlara göre açılmalı.
       */
      birim: kirilimParam === "grup" ? (grup?.ad ?? null) : (program?.ad ?? null),
    },
  );

  const dosyaAdi = [
    "genctek-etkinlik",
    kirilimParam === "program" ? "program" : "calisma-grubu",
    duzeyParam,
    grup ? adParcasi(grup.ad, "grup") : null,
    program ? adParcasi(program.ad, "program") : null,
    yilParam ? yilParam : null,
  ]
    .filter(Boolean)
    .join("-");

  const secim = { kirilim: kirilimParam, duzey: duzeyParam };

  return disaAktarmaYaniti({
    bicim: bicimCoz(adres),
    dosyaAdi,
    baslik: "GençTek Ekosistemi",
    altBaslik: altBaslikYaz(
      `${KIRILIM_ETIKETLERI[kirilimParam]} kırılımı · ${DUZEY_ETIKETLERI[duzeyParam]}`,
      satirlar.length,
    ),
    sutunlar: basliklardanSutunlar(kirilimBasliklari(secim)),
    satirlar: satirlar.map((satir) => kirilimHucreleri(satir, secim)),
  });
}
