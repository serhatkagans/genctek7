import { oturumKullanicisi } from "@/lib/auth/oturum";
import {
  AYAR_ANAHTARLARI,
  ayarSayi,
  VARSAYILAN_DISA_AKTARMA_UST_SINIRI,
} from "@/lib/ayar";
import { prisma } from "@/lib/db";
import { ekSinirlariniGetir } from "@/lib/faaliyet/ek-kaydet";
import { ekTuruBelirle } from "@/lib/faaliyet/ek-kurallar";
import {
  DOKUM_SUTUNLARI,
  dokumHucreleri,
  dokumSatirlari,
  katilimciTuru,
  type DokumFaaliyeti,
} from "@/lib/rapor/etkinlik-dokumu";
import {
  altBaslikYaz,
  bicimCoz,
  disaAktarmaYaniti,
} from "@/lib/rapor/disa-aktarma";
import { faaliyetDisaAktarabilirMi } from "@/lib/yetki/izinler";
import { raporlanabilirFaaliyetFiltresi } from "@/lib/yetki/kapsam";
import { erisimLoglaCoklu } from "@/lib/yetki/log";

export const dynamic = "force-dynamic";

/**
 * TAMAMLANAN ETKİNLİKLERİN RAPOR DÖKÜMÜ (XLSX) — 15 Ağustos 2026.
 *
 * `manisa-farklari-plani.md` · Aşama 1c. Satır üretimi ve sayımlar
 * `lib/rapor/etkinlik-dokumu.ts` içinde ve birim testli; burada yalnızca kapı,
 * sorgu ve dosyaya çevirme var.
 *
 * KAPI ETKİNLİK LİSTESİ ÇIKTISIYLA AYNI (`faaliyetDisaAktarabilirMi`): dosya
 * aynı kayıtların özetini taşıyor, ikinci bir yetki ekseni açmanın gerekçesi
 * yok. Öğrenci ekranda düğmeyi görmüyor ve adres çubuğundan da alamıyor.
 *
 * KAPSAM RAPORLAR EKRANININ KAPSAMIDIR (`raporlanabilirFaaliyetFiltresi`),
 * etkinlik listesininki değil. İkisi FARKLI: etkinlik listesinde danışman
 * öğretmen okulunun bütün etkinliklerini görür, raporlar ekranında yalnızca
 * KENDİ açtıklarını (raporu yazma yetkisi orada). Döküm düğmesi raporlar
 * ekranında duruyor ve yanında "N etkinlik" yazıyor; rota etkinlik listesinin
 * kapsamını kullansaydı danışmanın indirdiği dosyada düğmede yazandan fazla
 * satır çıkar ve fark kimseye görünmezdi.
 *
 * Bu yüzden ADRES SÜZGECİ DE YOK: düğmenin gittiği yerde süzgeç kutusu
 * bulunmuyor, dosya ekranın gösterdiği kümenin tamamı. Süzgeç isteniyorsa
 * ekranda karşılığı açılmalı — dosyanın ekranda olmayan bir daraltmayı
 * taşıması, iki yerin ayrışmasının başlangıcı olurdu.
 */

/**
 * Dökümde YALNIZCA BİTMİŞ ETKİNLİKLER var.
 *
 * Bitiş tarihi geçmemiş etkinliğin katılımcı, fotoğraf ve rapor sütunları
 * doğal olarak boş olurdu ve bu boşluk dosyada bir eksiklik gibi okunurdu;
 * oysa etkinlik henüz yapılmamıştır. "Ne planlandı" sorusunun dosyası ayrı
 * ve zaten var (panel/etkinlikler/disa-aktar).
 *
 * İPTAL EDİLEN ETKİNLİK DE YOK: `durum: "AKTIF"` koşulu iptalleri eliyor.
 * İptal, "bu etkinlik yapılmadı" demektir — `kirilim-istatistigi.ts` ile aynı
 * gerekçe.
 */
function bitmisFiltresi(simdi: Date) {
  return {
    durum: "AKTIF" as const,
    OR: [
      { bitisTarihi: { not: null, lte: simdi } },
      { bitisTarihi: null, tarih: { lte: simdi } },
    ],
  };
}

export async function GET(istek: Request) {
  const kullanici = await oturumKullanicisi();
  if (!kullanici) {
    return new Response("Bulunamadı", { status: 404 });
  }
  if (!faaliyetDisaAktarabilirMi(kullanici)) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const simdi = new Date();

  const nerede = {
    AND: [raporlanabilirFaaliyetFiltresi(kullanici), bitmisFiltresi(simdi)],
  };

  const [toplam, ustSinir, ekSinirlari] = await Promise.all([
    prisma.faaliyet.count({ where: nerede }),
    ayarSayi(
      AYAR_ANAHTARLARI.DISA_AKTARMA_UST_SINIRI,
      VARSAYILAN_DISA_AKTARMA_UST_SINIRI,
    ),
    ekSinirlariniGetir(),
  ]);

  if (toplam > ustSinir) {
    return new Response(
      `Kapsamınızda ${toplam} bitmiş etkinlik var; tek dosyada en fazla ${ustSinir} kayıt indirilebilir.`,
      { status: 413, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const faaliyetler = await prisma.faaliyet.findMany({
    where: nerede,
    // En yeni etkinlik üstte: dosyayı açan kişinin aradığı genelde son dönem.
    orderBy: [{ tarih: "desc" }],
    select: {
      id: true,
      ad: true,
      tarih: true,
      duzenleyen: { select: { ad: true, soyad: true } },
      temelEtkinlikProgrami: { select: { ad: true } },
      calismaGruplari: { select: { calismaGrubu: { select: { ad: true } } } },
      il: { select: { ad: true } },
      ilce: { select: { ad: true } },
      kurum: {
        select: {
          ad: true,
          il: { select: { ad: true } },
          ilce: { select: { ad: true } },
        },
      },
      basvurular: {
        select: {
          durum: true,
          katilimciId: true,
          katilimci: {
            select: {
              kurumKodu: true,
              roller: {
                where: { bitisTarihi: null },
                select: { rolKodu: true },
              },
            },
          },
        },
      },
      // Silinen ek dosyada sayılmaz: kayıt log için duruyor, içerik yok.
      ekler: { where: { silindiMi: false }, select: { mimeTipi: true } },
      _count: { select: { belgeler: true } },
      rapor: { select: { degerlendirme: true, olusturmaTarihi: true } },
    },
  });

  await erisimLoglaCoklu(
    faaliyetler.map((faaliyet) => ({
      kullaniciId: kullanici.id,
      islem: "GORUNTULEME" as const,
      hedefTip: "FAALIYET" as const,
      hedefId: faaliyet.id,
      detay: "Etkinlik rapor dökümü Excel olarak dışa aktarıldı",
    })),
  );

  const dokumler: DokumFaaliyeti[] = faaliyetler.map((faaliyet) => {
    const gorseller = faaliyet.ekler.filter(
      (ek) => ekTuruBelirle(ek.mimeTipi, ekSinirlari) === "GORSEL",
    ).length;

    return {
      id: faaliyet.id,
      ad: faaliyet.ad,
      tarih: faaliyet.tarih,
      duzenleyenAdSoyad: `${faaliyet.duzenleyen.ad} ${faaliyet.duzenleyen.soyad}`,
      programAdi: faaliyet.temelEtkinlikProgrami?.ad ?? null,
      gruplar: faaliyet.calismaGruplari.map((bag) => bag.calismaGrubu.ad),
      /*
       * İL VE İLÇE FAALİYETTE DEĞİL OKULDA OLABİLİR. `Faaliyet.ilKodu` yalnızca
       * kapsam=IL olduğunda dolduruluyor; kapsam=OKUL kayıtlarında yerin
       * tamamı kurum üzerinden gelir. Yalnızca faaliyetin kendi alanlarına
       * bakılsaydı OKUL etkinliklerinin -yani çoğunluğun- il ve ilçe sütunları
       * boş kalırdı. Gerçek veriyle denenince görüldü (15 Ağustos 2026).
       */
      ilAdi: faaliyet.il?.ad ?? faaliyet.kurum?.il?.ad ?? null,
      ilceAdi: faaliyet.ilce?.ad ?? faaliyet.kurum?.ilce?.ad ?? null,
      okulAdi: faaliyet.kurum?.ad ?? null,
      katilimcilar: faaliyet.basvurular.map((basvuru) => ({
        durum: basvuru.durum,
        katilimciId: basvuru.katilimciId,
        kurumKodu: basvuru.katilimci.kurumKodu,
        tur: katilimciTuru(
          basvuru.katilimci.roller.map((rol) => rol.rolKodu),
        ),
      })),
      fotografSayisi: gorseller,
      /*
       * BELGE SAYISI iki kaynağı toplar: görsel olmayan ekler (yüklenen PDF'ler)
       * ve üretilmiş katılım/teşekkür belgeleri. İkisi ayrı sütun olsaydı,
       * "bu etkinlikten kaç belge çıktı" sorusu için dosyayı açan kişinin iki
       * sütunu toplaması gerekirdi.
       */
      belgeSayisi: faaliyet.ekler.length - gorseller + faaliyet._count.belgeler,
      raporTarihi: faaliyet.rapor?.olusturmaTarihi ?? null,
      raporOzeti: faaliyet.rapor?.degerlendirme ?? null,
    };
  });

  const satirlar = dokumSatirlari(dokumler).map(dokumHucreleri);

  /*
   * ORTAK YÜZEYE GEÇTİ (15 Ağustos 2026). Bu rota Aşama 1'de, `disa-aktarma.ts`
   * daha yokken yazılmış ve doğrudan `xlsxYaniti` çağırıyordu; Aşama 2'de altı
   * rota çevrilirken atlanmış. Sonuç: `?bicim=csv` çalışmıyordu ve doğrulama
   * betiği XLSX ikili verisini metin diye ayrıştırıp "0 satır" raporluyordu —
   * yani rotayı sınadığını sanıyor ama hiçbir şey doğrulamıyordu.
   */
  return disaAktarmaYaniti({
    bicim: bicimCoz(new URL(istek.url)),
    dosyaAdi: "genctek-etkinlik-raporlari",
    baslik: "GençTek Ekosistemi",
    altBaslik: altBaslikYaz("Tamamlanan Etkinlik Raporları", toplam),
    sutunlar: DOKUM_SUTUNLARI,
    satirlar,
  });
}
