import { ChevronLeft, ChevronRight, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import {
  SutunMetinSuzgeci,
  SutunSecimSuzgeci,
  SutunSuzgecDugmesi,
  SutunSuzgecSatiri,
} from "@/components/SutunSuzgeci";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import { prisma } from "@/lib/db";
import {
  KISI_GOREV_ETIKETLERI,
  KISI_GOREVLERI,
  KISI_TURLERI,
  KISI_SUZGEC_PARAMETRELERI,
  KISI_TURU_ETIKETLERI,
  type KisiGorevi,
  type KisiTuru,
  kisiKosulu,
  kisiSuzgeciDoluMu,
  kisiSuzgeciniCoz,
} from "@/lib/kisi/il-suzgeci";
import { erisimLoglaCoklu } from "@/lib/yetki/log";
import type { OturumKullanicisi } from "@/lib/yetki/tipler";

/**
 * İLİN KİŞİ LİSTESİ — ad · tür · görev · kurum · e-posta · telefon
 * (31 Ağustos 2026 · istek: "Burada liste çıksın ilindeki öğretmen listesi,
 * öğrenci listesi … bu alandaki listenin filtreleri … görsel gibi olsun").
 *
 * ===========================================================================
 * SÜZGEÇLER SÜTUN BAŞLIKLARININ ALTINDA
 * ===========================================================================
 * Görselde her sütun başlığının yanında bir süzgeç düğmesi var (Excel'in
 * otomatik süzgeci). Panelde bunun karşılığı `components/SutunSuzgeci.tsx`:
 * başlığın altında, sütunun kendi hücresinde duran bir kutu. Aynı desen
 * Okullar, Öğretmenler, Öğrenciler ve Paydaşlar ekranlarında da kullanılıyor —
 * bu liste onlardan farklı bir süzgeç dili konuşmuyor.
 *
 * SÜZGEÇ SUNUCUDA ÇALIŞIYOR, İSTEMCİDE DEĞİL: liste sayfalı ve istemci
 * yalnızca o sayfadaki 50 satırı süzebilirdi — "sonuç yok" derken aslında
 * sonraki sayfada eşleşen kayıt olurdu.
 *
 * ===========================================================================
 * NİYE AYRI BİR BİLEŞEN
 * ===========================================================================
 * Liste ilk olarak Ekiplerim ekranında istendi ("ekip kuracağım kişileri
 * göreyim") ama sorusu ekibe özgü değil: "ilimde kim var, nasıl ulaşırım".
 * Ekranın gövdesine gömülseydi ikinci bir yerde istendiğinde kopyalanırdı —
 * EkipEnvanteri'nde verilen kararın aynısı.
 *
 * KAPIYI ÇAĞIRAN SORAR: bileşen yetki sormuyor. Çağıran ekranın kendi kapısı
 * var ve kapsamı (`ilKodu`) da o veriyor; burada üçüncü kez sorulsaydı
 * "boş liste" ile "yetkiniz yok" ayrımı bileşenin içinde kalırdı.
 */

const SAYFA_BOYUTU = 50;

/** Sütun süzgeçlerinin bağlandığı form; bkz. components/SutunSuzgeci.tsx. */
const SUZGEC_FORMU = "il-kisi-suzgeci";

const SINIF_SAYFA_BUTON =
  "inline-flex items-center gap-1 rounded-md border border-cizgi px-3 py-1.5 text-sm font-medium text-metin transition hover:bg-zemin";

/**
 * Kişinin YÜRÜRLÜKTEKİ görevleri, ekranda yazılacak sırayla.
 *
 * BOŞ DÖNEBİLİR ve bu olağan: ilin çoğu öğrencisinin bir görevi yok. Hücre o
 * zaman "—" basıyor; "görevi yok" yazmak, olmayan bir durumu her satırda
 * tekrarlamak olurdu.
 */
function goreviYaz(kisi: {
  roller: { rolKodu: string }[];
  gorevRolleri: { rolKodu: string }[];
  mentorluk: { durum: string } | null;
}): string[] {
  const gorevler: KisiGorevi[] = [];
  if (kisi.mentorluk?.durum === "ONAYLANDI") gorevler.push("MENTOR");
  for (const rol of kisi.roller) {
    if (rol.rolKodu === "DANISMAN") gorevler.push("DANISMAN");
    if (rol.rolKodu === "IL_KOORDINATOR") gorevler.push("IL_KOORDINATOR");
  }
  for (const gorev of kisi.gorevRolleri) {
    const kod = gorev.rolKodu as KisiGorevi;
    if (KISI_GOREVLERI.includes(kod) && !gorevler.includes(kod)) {
      gorevler.push(kod);
    }
  }
  return gorevler.map((gorev) => KISI_GOREV_ETIKETLERI[gorev]);
}

/** Satırın türü — rolünden okunuyor, ayrı bir sütunda tutulmuyor. */
function turuYaz(kisi: { roller: { rolKodu: string }[] }): KisiTuru {
  const roller = kisi.roller.map((rol) => rol.rolKodu);
  if (roller.includes("OGRENCI")) return "OGRENCI";
  if (roller.includes("PAYDAS_TEMSILCISI")) return "PAYDAS";
  return "OGRETMEN";
}

export async function IlKisiListesi({
  kullanici,
  parametreler,
  yol,
  ilKodu,
  ilAdi,
  ekipler = [],
  ekleEylemi,
  eklemeNotu = null,
  secimFormu = null,
}: {
  kullanici: OturumKullanicisi;
  parametreler: Record<string, string | string[] | undefined>;
  /** Süzgeç ve sayfalama bağlantılarının döneceği adres. */
  yol: string;
  /** Listenin ili; `null` ise ülke geneli (merkez). */
  ilKodu: string | null;
  ilAdi?: string | null;
  /**
   * EKİBE EKLEME SÜTUNU (31 Ağustos 2026 · istek: "öğrenci listesi geliyor
   * altta ama kişi ekleme yok, ekip için öğrenci nasıl seçecek").
   *
   * Liste ilk turda yalnızca OKUMA içindi: "ilimde kim var, nasıl ulaşırım".
   * Kişiyi ekibe koymanın yolu ekibin kendi sayfasındaki "Üye ekle"
   * süzgeciydi ve o ekran hâlâ duruyor. Ama listeyi ekip kurma formunun
   * altında gören kişi, doğal olarak "şu satırdaki öğrenciyi ekibime al"
   * bekliyor — iki ekran arasında gidip gelmek, aynı süzgeci iki kez kurmak
   * demekti.
   *
   * LİSTE BOŞ GELİRSE SÜTUN HİÇ BASILMIYOR: eklenecek ekibi olmayan kişiye
   * (henüz ekip kurmamış koordinatör) her satırda boş bir açılır liste
   * göstermenin anlamı yok.
   */
  ekipler?: readonly { id: number; ad: string }[];
  /** `ekibeUyeEkleEylemi`; ekip listesi boşken hiç çağrılmıyor. */
  ekleEylemi?: (veri: FormData) => Promise<void>;
  /**
   * SÜTUN BASILMADIĞINDA OKUNAN CÜMLE (31 Ağustos 2026 · istek: "hâlâ ekip
   * nasıl öğrenci seçeceğini göremiyorum").
   *
   * Sütun, eklenecek AÇIK EKİP yoksa gizleniyordu ve gizlenirken hiçbir şey
   * söylemiyordu: henüz ekip kurmamış koordinatör, listeyi görüyor ama
   * kişileri nereye ekleyeceğine dair tek bir iz bulamıyordu. Eksik olan şey
   * bir düğme değil, bir CÜMLEYDİ — "önce ekibi kur" bilgisi ekranda hiç
   * yazmıyordu.
   *
   * Metni ÇAĞIRAN veriyor çünkü sebebi yalnızca o biliyor: ekip yok mu, yoksa
   * bu kullanıcı için ekleme başka ekrandan mı yapılıyor.
   */
  eklemeNotu?: string | null;
  /**
   * EKİP KURMA FORMUNUN `id`si (31 Ağustos 2026 · istek: "ekibi oluşturduktan
   * sonra geliyor, ben ekibi oluştururken eklemek istiyorum").
   *
   * Verilirse her satıra bir kutucuk basılıyor ve kutucuklar HTML'in `form`
   * özniteliğiyle O FORMA bağlanıyor — liste formun dışında durduğu hâlde
   * "Ekibi kur" düğmesine basıldığında işaretli kişiler de gidiyor (aynı
   * numara sütun süzgeçlerinde de kullanılıyor).
   *
   * SÜZGEÇ GÖNDERİLİNCE İŞARETLER SIFIRLANIR ve bu kaçınılmaz: süzme sunucuda
   * yapılıyor, yani sayfa yeniden çiziliyor. Kart başlığındaki cümle bunu
   * söylüyor — önce süz, sonra işaretle.
   */
  secimFormu?: string | null;
}) {
  const eklemeVar = ekipler.length > 0 && ekleEylemi !== undefined;
  /* Altı sabit sütun + varsa "Yeni ekibe" + varsa "Ekibe ekle". */
  const sutunSayisi = 6 + (secimFormu ? 1 : 0) + (eklemeVar ? 1 : 0);
  const suzgec = kisiSuzgeciniCoz(parametreler);
  const suzgecDolu = kisiSuzgeciDoluMu(suzgec);
  const nerede = kisiKosulu(suzgec, {
    ilKodu,
    egitimOgretimYili: kullanici.egitimOgretimYili,
  });

  const istenenSayfa = Number.parseInt(
    (Array.isArray(parametreler.ksayfa)
      ? parametreler.ksayfa[0]
      : parametreler.ksayfa) ?? "1",
    10,
  );

  const toplam = await prisma.kullanici.count({ where: nerede });
  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA_BOYUTU));
  const sayfa = Math.min(
    Math.max(1, Number.isFinite(istenenSayfa) ? istenenSayfa : 1),
    sonSayfa,
  );

  const kisiler = await prisma.kullanici.findMany({
    where: nerede,
    orderBy: [{ ad: "asc" }, { soyad: "asc" }],
    skip: (sayfa - 1) * SAYFA_BOYUTU,
    take: SAYFA_BOYUTU,
    select: {
      id: true,
      ad: true,
      soyad: true,
      sinif: true,
      brans: true,
      kurum: { select: { ad: true } },
      roller: { where: { bitisTarihi: null }, select: { rolKodu: true } },
      gorevRolleri: {
        where: { egitimOgretimYili: kullanici.egitimOgretimYili },
        select: { rolKodu: true },
      },
      mentorluk: { select: { durum: true } },
      /*
        İLETİŞİM İKİ TABLODAN: öğrencininki `ogrenci_profil`de, diğerlerininki
        `ogretmen_profil`de. İkisi de KİŞİNİN KENDİ girdiği bilgi — e-Okul'dan
        gelmiyor ve gecelik senkronda üzerine yazılmıyor. Profili hiç
        açılmamış kişide ikisi de boş kalır ve hücre "—" basar.
      */
      ogrenciProfil: { select: { eposta: true, telefon: true } },
      ogretmenProfil: { select: { eposta: true, telefon: true } },
      /*
        PAYDAŞIN KURUMU: paydaş temsilcisinin okulu yoktur, temsil ettiği kurum
        onay gördüğü başvuru satırından okunuyor (başvuru ile kullanıcı
        arasındaki tek bağ budur — bkz. model DisKullaniciBasvurusu).
      */
      disBasvurusu: { select: { paydas: { select: { ad: true } } } },
    },
  });

  /*
   * KVKK KAYDI: liste ad, okul ve DOĞRUDAN İLETİŞİM BİLGİSİ gösteriyor;
   * öğrenci ve öğretmen envanterlerinde olduğu gibi kimin baktığı deftere
   * geçiyor. Kayıt satır başına açılıyor — "listeye baktı" demek, altı ay
   * sonra "hangi öğrencinin telefonunu gördü" sorusunu cevaplamazdı.
   */
  await erisimLoglaCoklu(
    kisiler.map((kisi) => ({
      kullaniciId: kullanici.id,
      islem: "GORUNTULEME" as const,
      hedefTip: turuYaz(kisi) === "OGRENCI" ? ("OGRENCI" as const) : ("OGRETMEN" as const),
      hedefId: kisi.id,
      detay: "İl kişi listesi görüntülendi",
    })),
  );

  /** Süzgeç formunun taşıması gereken, kendine ait olmayan parametreler. */
  const digerParametreler = Object.entries(parametreler).filter(
    ([ad, deger]) =>
      deger !== undefined &&
      !(KISI_SUZGEC_PARAMETRELERI as readonly string[]).includes(ad),
  );

  function sayfaBaglantisi(hedefSayfa: number): string {
    const sorgu = new URLSearchParams();
    for (const [ad, deger] of Object.entries(parametreler)) {
      if (deger === undefined || ad === "ksayfa") continue;
      for (const tek of Array.isArray(deger) ? deger : [deger]) {
        sorgu.append(ad, tek);
      }
    }
    if (hedefSayfa > 1) sorgu.set("ksayfa", String(hedefSayfa));
    const metin = sorgu.toString();
    return metin ? `${yol}?${metin}` : yol;
  }

  return (
    <Kart>
      <KartBasligi
        baslik={ilAdi ? `${ilAdi} kişi listesi` : "Kişi listesi"}
        aciklama={
          toplam > SAYFA_BOYUTU
            ? `Öğretmen, öğrenci ve paydaşlar · ${toplam} kişi · sayfa ${sayfa}/${sonSayfa}`
            : `Öğretmen, öğrenci ve paydaşlar · ${toplam} kişi`
        }
        Ikon={Users}
      />

      {!eklemeVar && eklemeNotu && (
        <BilgiKutusu cesit="uyari">{eklemeNotu}</BilgiKutusu>
      )}

      {/*
        FORM TABLONUN DIŞINDA ve GÖRÜNMEZ: sütun süzgeçleri ona
        `form="il-kisi-suzgeci"` ile bağlanıyor (gerekçesi
        components/SutunSuzgeci.tsx başlığında). Burada gösterilecek bir alanı
        yok — bu listenin BÜTÜN süzgeçlerinin sütunu var, dolayısıyla "Filtreler"
        kartı boş bir kutu olurdu.

        SAYFADAKİ ÖBÜR SÜZGEÇLER GİZLİ ALANLARLA TAŞINIYOR: aynı adreste ekip
        envanteri de süzülüyor (`ara`, `tur`, `sayfa`) ve kişi süzgeci
        gönderildiğinde onların kaybolmaması gerekiyor.
      */}
      <form id={SUZGEC_FORMU} method="get" className="hidden">
        {digerParametreler.map(([ad, deger]) =>
          (Array.isArray(deger) ? deger : [deger as string]).map(
            (tek, sira) => (
              <input key={`${ad}-${sira}`} type="hidden" name={ad} value={tek} />
            ),
          ),
        )}
      </form>

      <div className="overflow-x-auto rounded-kart border border-cizgi">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-cizgi bg-zemin text-metin-yumusak">
            <tr>
              <th className="px-4 py-3 font-medium">Ad Soyad</th>
              <th className="px-4 py-3 font-medium">Tür</th>
              <th className="px-4 py-3 font-medium">Görev</th>
              <th className="px-4 py-3 font-medium">Kurum</th>
              <th className="px-4 py-3 font-medium">E-posta</th>
              {secimFormu && (
                <th className="px-4 py-3 font-medium">Yeni ekibe</th>
              )}
              <th className="px-4 py-3 font-medium">Telefon</th>
              {eklemeVar && (
                <th className="px-4 py-3 font-medium">Ekibe ekle</th>
              )}
            </tr>

            {/*
              ALTI SÜTUNUN ALTISINDA DA SÜZGEÇ VAR — görselde de öyle. Öğretmen
              ve öğrenci ekranlarında iletişim sütunları süzgeçsiz bırakılmıştı
              ("aramanın değil ulaşmanın konusu"); burada bırakılmadı çünkü bu
              listenin işi TAM OLARAK ulaşmak: elinde yalnızca bir telefon ya da
              e-posta olan koordinatörün "bu kim" sorusunu cevaplıyor.
            */}
            <SutunSuzgecSatiri>
              <SutunMetinSuzgeci
                form={SUZGEC_FORMU}
                ad="kad"
                deger={suzgec.ad}
                ipucu="Ad veya soyad"
              />
              <SutunSecimSuzgeci
                form={SUZGEC_FORMU}
                ad="ktur"
                deger={suzgec.tur}
                bosEtiket="Tüm türler"
                etiket="Tür"
                secenekler={KISI_TURLERI.map((tur) => ({
                  deger: tur,
                  etiket: KISI_TURU_ETIKETLERI[tur],
                }))}
              />
              <SutunSecimSuzgeci
                form={SUZGEC_FORMU}
                ad="kgorev"
                deger={suzgec.gorev}
                bosEtiket="Tüm görevler"
                etiket="Görev"
                secenekler={KISI_GOREVLERI.map((gorev) => ({
                  deger: gorev,
                  etiket: KISI_GOREV_ETIKETLERI[gorev],
                }))}
              />
              <SutunMetinSuzgeci
                form={SUZGEC_FORMU}
                ad="kkurum"
                deger={suzgec.kurum}
                ipucu="Okul ya da kurum"
              />
              <SutunMetinSuzgeci
                form={SUZGEC_FORMU}
                ad="keposta"
                deger={suzgec.eposta}
                ipucu="E-posta"
              />
              <SutunMetinSuzgeci
                form={SUZGEC_FORMU}
                ad="ktel"
                deger={suzgec.telefon}
                ipucu="Telefon"
              />
            </SutunSuzgecSatiri>

            {/*
              GÖNDER DÜĞMESİ KENDİ SATIRINDA: altı sütunun altısı da dolu,
              yani düğmeye ayıracak boş hücre kalmadı. `colSpan` ile tabloyu
              baştan sona kaplıyor ve süzgeç kutularının hemen altında duruyor.
            */}
            <tr className="border-b border-cizgi bg-kart">
              <SutunSuzgecDugmesi
                form={SUZGEC_FORMU}
                colSpan={sutunSayisi}
              />
            </tr>
          </thead>
          <tbody>
            {kisiler.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-4 text-metin-yumusak"
                  colSpan={sutunSayisi}
                >
                  {suzgecDolu
                    ? "Bu süzgeçlere uyan kişi yok."
                    : "Kapsamınızda listelenecek kişi yok."}
                </td>
              </tr>
            ) : (
              kisiler.map((kisi) => {
                const tur = turuYaz(kisi);
                const gorevler = goreviYaz(kisi);
                const eposta =
                  kisi.ogrenciProfil?.eposta ?? kisi.ogretmenProfil?.eposta;
                const telefon =
                  kisi.ogrenciProfil?.telefon ?? kisi.ogretmenProfil?.telefon;
                const kurum =
                  kisi.kurum?.ad ?? kisi.disBasvurusu?.paydas?.ad ?? null;

                return (
                  <tr
                    key={kisi.id}
                    className="border-b border-cizgi last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-metin">
                      {/*
                        AD BİR BAĞLANTI DEĞİL: bu listede öğrenci, öğretmen ve
                        paydaş satırları yan yana duruyor ve üçünün profili üç
                        ayrı ekranda, üç ayrı yetki kapısının arkasında. Hepsini
                        bağlantı yapmak, satırların bir kısmında 404'e giden bir
                        liste demekti; kişinin kendi ekranına envanterlerden
                        gidiliyor.
                      */}
                      {kisi.ad} {kisi.soyad}
                      <span className="ml-2 font-normal text-metin-yumusak">
                        {kisi.sinif ?? kisi.brans ?? ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-metin-yumusak">
                      {KISI_TURU_ETIKETLERI[tur]}
                    </td>
                    <td className="px-4 py-3 text-metin-yumusak">
                      {gorevler.length > 0 ? gorevler.join(" · ") : "—"}
                    </td>
                    <td className="px-4 py-3 text-metin-yumusak">
                      {kurum ?? "—"}
                    </td>
                    {/*
                      İLETİŞİM SÜTUNLARI TIKLANABİLİR (`mailto:` / `tel:`) —
                      panelin öbür listeleriyle aynı biçim.
                    */}
                    <td className="px-4 py-3">
                      {eposta ? (
                        <a
                          href={`mailto:${eposta}`}
                          className="break-all text-vurgu-metin"
                        >
                          {eposta}
                        </a>
                      ) : (
                        <span className="text-metin-yumusak">—</span>
                      )}
                    </td>
                    {secimFormu && (
                      <td className="px-4 py-3">
                        {/*
                          KUTUCUK FORMUN DIŞINDA AMA FORMA BAĞLI: `form`
                          özniteliği onu ekip kurma formuna bağlıyor. Adı
                          `uyeId` ve aynı ad her satırda tekrarlanıyor —
                          sunucu `getAll("uyeId")` ile işaretlilerin tamamını
                          okuyor (bkz. ekipler/eylemler.ts · ekipKurEylemi).
                        */}
                        <input
                          type="checkbox"
                          form={secimFormu}
                          name="uyeId"
                          value={kisi.id}
                          aria-label={`${kisi.ad} ${kisi.soyad} yeni ekibe eklensin`}
                          className="h-4 w-4 rounded border-cizgi accent-[var(--renk-birincil)]"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 tabular-nums">
                      {telefon ? (
                        <a href={`tel:${telefon}`} className="text-vurgu-metin">
                          {telefon}
                        </a>
                      ) : (
                        <span className="text-metin-yumusak">—</span>
                      )}
                    </td>
                    {eklemeVar && ekleEylemi && (
                      <td className="px-4 py-3">
                        {/*
                          HER SATIRIN KENDİ FORMU: hangi kişinin eklendiği
                          gizli alanda yazılı, hangi ekibe ekleneceğini satırın
                          kendi açılır listesi söylüyor. Tek bir "seçilenleri
                          ekle" formu da yapılabilirdi ama o, onay kutuları ve
                          sayfalar arası seçim taşımak demekti — koordinatör
                          çoğu zaman tek tek ekliyor.

                          KAPI SUNUCUDA: eylem ekibi, ilini ve kişinin o ilde
                          olup olmadığını yeniden soruyor (bkz. ekipler/
                          eylemler.ts · ekibeUyeEkleEylemi). Buradaki liste
                          yalnızca bir kolaylık; ekranda görünmek yetki değil.

                          TEK EKİP VARSA AÇILIR LİSTE YİNE BASILIYOR: adı
                          görünmeyen bir "Ekle" düğmesi, kişiyi nereye
                          eklediğini söylemezdi.
                        */}
                        <form
                          action={ekleEylemi}
                          className="flex flex-wrap items-center gap-1.5"
                        >
                          <input
                            type="hidden"
                            name="kullaniciId"
                            value={kisi.id}
                          />
                          <select
                            name="ekipId"
                            defaultValue={ekipler[0]?.id}
                            aria-label={`${kisi.ad} ${kisi.soyad} için ekip`}
                            className="min-w-32 rounded-kart border border-cizgi bg-kart px-2 py-1 text-sm text-metin"
                          >
                            {ekipler.map((ekip) => (
                              <option key={ekip.id} value={ekip.id}>
                                {ekip.ad}
                              </option>
                            ))}
                          </select>
                          <button type="submit" className={SINIF_IKINCIL_BUTON}>
                            <UserPlus size={15} aria-hidden />
                            Ekle
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {sonSayfa > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          {sayfa > 1 ? (
            <Link href={sayfaBaglantisi(sayfa - 1)} className={SINIF_SAYFA_BUTON}>
              <ChevronLeft size={15} aria-hidden />
              Önceki
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-metin-yumusak">
            Sayfa {sayfa} / {sonSayfa}
          </span>
          {sayfa < sonSayfa ? (
            <Link href={sayfaBaglantisi(sayfa + 1)} className={SINIF_SAYFA_BUTON}>
              Sonraki
              <ChevronRight size={15} aria-hidden />
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </Kart>
  );
}
