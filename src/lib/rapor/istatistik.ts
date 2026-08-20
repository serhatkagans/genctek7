import type { Prisma } from "@/generated/prisma/client";
import type { OnayBelgesi } from "@/generated/prisma/enums";
import { prisma } from "../db";
import { belgeGuncellemeTarihleri } from "../kvkk/onay";
import { bekleyenTalepSayisi } from "../danisman/talep";
import {
  danismanMi,
  ilKoordinatoruMu,
  koordinatorIlKodu,
  projeYoneticisiMi,
} from "../yetki/izinler";
import {
  baglantiKarariFiltresi,
  ogrenciKapsamFiltresi,
  raporlanabilirFaaliyetFiltresi,
} from "../yetki/kapsam";
import type { OturumKullanicisi } from "../yetki/tipler";

/**
 * Merkez (YEĞİTEK) istatistikleri — analiz isteği Bölüm 5.
 *
 * Yalnızca proje yöneticisine gösterilir ve bilerek KAPSAM FİLTRESİZDİR: sayım
 * ülke genelidir. Çağıran ekran yetkiyi kontrol etmek zorundadır; bu dosya
 * "kim sorabilir" sorusunu cevaplamaz, yalnızca sayar.
 *
 * Sayımlar tek tek `count` ile yapılıyor, tek büyük bir sorguyla değil:
 * okunabilirlik kazancı, altı küçük sayımın maliyetinden fazla. Hepsi
 * paralel çalışıyor.
 */

export interface MerkezIstatistikleri {
  toplamOgrenci: number;
  /** En az bir çalışma grubu seçmiş öğrenci sayısı (kişi başına tekil). */
  calismaGrubunaKayitliOgrenci: number;
  okulTemsilcisi: number;
  ilTemsilcisi: number;
  ilceTemsilcisi: number;
  danismanOgretmen: number;
  ilKoordinatoru: number;
  /** Koordinatörü olmayan il sayısı — boşluk göstergesi. */
  koordinatorsuzIl: number;
}

export async function merkezIstatistikleriniGetir(
  egitimOgretimYili: string,
): Promise<MerkezIstatistikleri> {
  const aktifRol = { bitisTarihi: null } as const;

  const [
    toplamOgrenci,
    calismaGrubunaKayitliOgrenci,
    okulTemsilcisi,
    ilTemsilcisi,
    ilceTemsilcisi,
    danismanOgretmen,
    ilKoordinatoru,
    toplamIl,
    koordinatorluIl,
  ] = await Promise.all([
    prisma.kullanici.count({
      where: { aktif: true, roller: { some: { rolKodu: "OGRENCI", ...aktifRol } } },
    }),
    /*
     * ÖĞRENCİ sayılır, seçim değil: bir öğrenci birden çok grup seçebiliyor
     * (üst sınır kaldırıldı, bkz. lib/ayar.ts). Satır sayılsaydı "kaç öğrenci
     * gruba kayıtlı" sorusu, seçim sayısıyla karışırdı.
     */
    prisma.kullanici.count({
      where: { aktif: true, calismaGruplari: { some: {} } },
    }),
    prisma.ogrenciGorevRolu.count({
      where: { rolKodu: "OKUL_TEMSILCISI", egitimOgretimYili },
    }),
    prisma.ogrenciGorevRolu.count({
      where: { rolKodu: "IL_TEMSILCISI", egitimOgretimYili },
    }),
    prisma.ogrenciGorevRolu.count({
      where: { rolKodu: "ILCE_TEMSILCISI", egitimOgretimYili },
    }),
    prisma.kullanici.count({
      where: { aktif: true, roller: { some: { rolKodu: "DANISMAN", ...aktifRol } } },
    }),
    prisma.kullanici.count({
      where: {
        aktif: true,
        roller: { some: { rolKodu: "IL_KOORDINATOR", ...aktifRol } },
      },
    }),
    prisma.il.count(),
    prisma.kullaniciRol
      .findMany({
        where: { rolKodu: "IL_KOORDINATOR", ...aktifRol },
        select: { ilKodu: true },
        distinct: ["ilKodu"],
      })
      .then((satirlar) => satirlar.length),
  ]);

  return {
    toplamOgrenci,
    calismaGrubunaKayitliOgrenci,
    okulTemsilcisi,
    ilTemsilcisi,
    ilceTemsilcisi,
    danismanOgretmen,
    ilKoordinatoru,
    koordinatorsuzIl: toplamIl - koordinatorluIl,
  };
}

/**
 * "Bitmiş faaliyet" koşulu — İKİ KOŞULUN BİRLEŞİMİ: çok günlüde bitiş tarihi,
 * tek günlükte tarihin kendisi. Prisma tek koşulda "varsa şuna, yoksa buna bak"
 * diyemediği için OR kuruluyor.
 *
 * DIŞARI AÇIK ÇÜNKÜ İKİ YERDE SORULUYOR: merkezin boşluk sayımı ve yönetim
 * panosunun il kırılımı (bkz. yonetim-ozeti.ts). Koşul iki dosyada ayrı ayrı
 * yazılsaydı, biri düzeltilip öbürü unutulduğunda aynı soru iki ekranda iki
 * farklı sayı verirdi.
 */
export function bitmisFaaliyetKosulu(simdi: Date): Prisma.FaaliyetWhereInput {
  return {
    OR: [
      { bitisTarihi: { not: null, lte: simdi } },
      { bitisTarihi: null, tarih: { lte: simdi } },
    ],
  };
}

export interface FaaliyetKatilimSayisi {
  /** Seçilmiş başvuru sayısı — aynı kişi iki faaliyete katıldıysa iki kez. */
  toplamKatilim: number;
  /** Kaç FARKLI kişi katıldı. */
  tekilKatilimci: number;
}

/**
 * Faaliyetlere katılan kişi sayısı: toplam ve tekil.
 *
 * İKİSİ AYRI SORULARDIR ve karıştırılırsa rapor yanlış olur. "Bu yıl 400
 * katılım oldu" ile "bu yıl 120 farklı öğrenciye ulaştık" bambaşka şeyler
 * söyler; ikincisi programın erişimini, birincisi yükünü ölçer.
 *
 * Yalnızca SECILDI sayılır: yedek ve reddedilen başvuru katılım değildir.
 */
export async function faaliyetKatilimSayisi(
  faaliyetId?: number,
): Promise<FaaliyetKatilimSayisi> {
  const nerede = {
    durum: "SECILDI" as const,
    ...(faaliyetId === undefined ? {} : { faaliyetId }),
  };

  const [toplamKatilim, tekiller] = await Promise.all([
    prisma.basvuru.count({ where: nerede }),
    prisma.basvuru.findMany({
      where: nerede,
      select: { katilimciId: true },
      distinct: ["katilimciId"],
    }),
  ]);

  return { toplamKatilim, tekilKatilimci: tekiller.length };
}

/**
 * Merkezin DİKKAT ETMESİ gereken boşluklar.
 *
 * `merkezIstatistikleriniGetir` bir SAYIMDIR: kaç öğrenci, kaç öğretmen var.
 * Bu fonksiyon farklı bir soruyu cevaplar: nerede iş birikmiş, nerede boşluk
 * var. İkisi ayrı tutuluyor çünkü ekranda da ayrı gösteriliyorlar — hepsi tek
 * listede olsaydı acil olanlar sayım kalabalığında kaybolurdu.
 *
 * Her alan bir EYLEME karşılık gelir; "bilgi olsun" diye sayı eklenmiyor.
 */
export interface MerkezBoslugu {
  /** Aktif danışman ataması olmayan öğrenciler — sistemde takipsiz kalanlar. */
  danismansizOgrenci: number;
  /** Bitmiş ama raporu yazılmamış faaliyetler. */
  raporsuzFaaliyet: number;
  /** Onay bekleyen faaliyet (öğrenci ve öğretmen önerileri dâhil). */
  bekleyenFaaliyetOnayi: number;
  /** Kaynak ilin kararını bekleyen il dışı başvurular. */
  bekleyenIlDisiBasvuru: number;
  /** Karara bağlanmamış bağlantı istekleri. */
  bekleyenBaglantiIstegi: number;
  /**
   * Göreve bağlı belgelerinden (taahhütname, gizlilik sözleşmesi) en az birini
   * onaylamamış ya da onayı eskimiş koordinatörler.
   */
  belgesiEksikKoordinator: number;
  /**
   * Karara bağlanmamış danışman DEĞİŞİKLİĞİ talepleri (20 Ağustos 2026).
   *
   * Bekleyen talep, öğrencinin ekranında "onay bekliyor" satırı olarak duran
   * ve karşılığı bir başkasının tıklamasına bağlı olan tek iş; sayaç
   * olmasaydı, cevap vermeyen öğretmenin farkına ancak öğrenci sorunca
   * varılırdı.
   */
  bekleyenDanismanTalebi: number;
}

export async function merkezBosluklariniGetir(
  /**
   * Belgelerin son güncelleme tarihleri; bir belgede null ise metin hiç
   * değişmemiştir (bkz. lib/kvkk/onay.ts · belgeGuncellemeTarihleri).
   */
  belgeGuncellemeleri: Map<OnayBelgesi, Date | null>,
): Promise<MerkezBoslugu> {
  const simdi = new Date();
  const bitmisKosulu = bitmisFaaliyetKosulu(simdi);

  /*
   * Belge eksiği: hiç onaylamamış YA DA metin onaydan sonra güncellenmiş
   * olanlar. İkincisi olmasaydı metin değiştiğinde herkes "onaylı" görünmeye
   * devam ederdi (bkz. lib/kvkk/kurallar.ts · onayiGerekiyorMu).
   *
   * Koordinatörün göreve bağlı İKİ belgesi var; birini onaylayıp diğerini
   * atlayan da bu sayıya girer, çünkü ikisi ayrı yükümlülüktür.
   */
  const koordinatorBelgeleri: OnayBelgesi[] = [
    "TAAHHUTNAME",
    "GIZLILIK_SOZLESMESI",
  ];

  const belgeEksigi = koordinatorBelgeleri.flatMap((belge) => {
    const guncelleme = belgeGuncellemeleri.get(belge) ?? null;
    const kosullar: Prisma.KullaniciWhereInput[] = [
      { onaylar: { none: { belge } } },
    ];
    if (guncelleme !== null) {
      kosullar.push({
        onaylar: { some: { belge, onayTarihi: { lt: guncelleme } } },
      });
    }
    return kosullar;
  });

  const [
    danismansizOgrenci,
    raporsuzFaaliyet,
    bekleyenFaaliyetOnayi,
    bekleyenIlDisiBasvuru,
    bekleyenBaglantiIstegi,
    belgesiEksikKoordinator,
    bekleyenDanismanTalebi,
  ] = await Promise.all([
    prisma.kullanici.count({
      where: {
        aktif: true,
        roller: { some: { rolKodu: "OGRENCI", bitisTarihi: null } },
        ogrenciAtamalari: { none: { bitisTarihi: null } },
      },
    }),
    prisma.faaliyet.count({
      where: { AND: [{ durum: "AKTIF" }, { rapor: { is: null } }, bitmisKosulu] },
    }),
    prisma.faaliyet.count({ where: { onayDurumu: "BEKLIYOR" } }),
    prisma.basvuru.count({ where: { kaynakIlOnayDurumu: "BEKLIYOR" } }),
    prisma.baglantiIstegi.count({ where: { onayDurumu: "BEKLIYOR" } }),
    prisma.kullanici.count({
      where: {
        aktif: true,
        roller: { some: { rolKodu: "IL_KOORDINATOR", bitisTarihi: null } },
        OR: belgeEksigi,
      },
    }),
    prisma.danismanTalebi.count({ where: { durum: "BEKLIYOR" } }),
  ]);

  return {
    danismansizOgrenci,
    raporsuzFaaliyet,
    bekleyenFaaliyetOnayi,
    bekleyenIlDisiBasvuru,
    bekleyenBaglantiIstegi,
    belgesiEksikKoordinator,
    bekleyenDanismanTalebi,
  };
}

/**
 * "Dikkat gerektirenler" panosunun bir kullanıcı için hâli.
 *
 * `null` alan "bu sayı sıfır" DEMEK DEĞİLDİR: "bu rolde gösterilmez" demektir.
 * İkisi ayrılmak zorunda çünkü ekran sıfırı SÖNÜK AMA GÖRÜNÜR basıyor
 * (bkz. app/panel/page.tsx) — sıfır iyi haberdir, gizlenirse "böyle bir ölçüt
 * yok" izlenimi verir. Gösterilmeyecek satırın hiç basılmaması ise başka bir
 * karardır ve o kararı bu tip taşıyor.
 */
export type BekleyenIsler = { [K in keyof MerkezBoslugu]: number | null };

/**
 * Kullanıcının KENDİ kapsamındaki bekleyen işler (13 Ağustos 2026 · inceleme
 * bulgusu).
 *
 * ÖNCEDEN NE VARDI: pano yalnızca proje yöneticisinde basılıyordu. Sonuç,
 * göstergenin gözlemleyende olup KARAR VERENDE olmamasıydı — merkez "ülke
 * genelinde 14 bağlantı isteği bekliyor" satırını görüyor, o isteklerin
 * onayını verecek danışman ve il koordinatörü hiçbir sayaç görmüyordu. Bildirim
 * vardı ama bildirim okununca düşer; bekleyen iş düşmez.
 *
 * ROLE GÖRE HANGİ SATIRLAR: ölçüt "bu kişi bu sayıyı görünce BİR ŞEY
 * YAPABİLİYOR mu" (bkz. MerkezBoslugu başlığı: "her alan bir eyleme karşılık
 * gelir"). Bu yüzden:
 *
 *   · Danışman öğretmen — kendi açtığı raporsuz etkinlikler ve kendi
 *     öğrencilerinin bekleyen bağlantı istekleri. "Danışmansız öğrenci"
 *     BASILMAZ: danışmanı öğrenci seçer, öğretmenin kendine öğrenci atama
 *     yetkisi yoktur; yapamayacağı bir işin sayacı yalnızca gürültü olurdu.
 *   · İl koordinatörü — bunlara ek olarak ilindeki danışmansız öğrenciler.
 *   · Merkez — altı satırın tamamı, ülke geneli (davranışı DEĞİŞMEDİ).
 *
 * KOORDİNATÖRDE "onay bekleyen etkinlik" ve "il dışı başvuru" BİLEREK YOK:
 * ikisi de o rolde zaten ölçüm kartı olarak duruyor. Aynı sayıyı aynı ekranda
 * iki kez basmak, 13 Ağustos'ta tam tersi yönde temizlenen bir hataydı.
 *
 * Yetkisi olmayan (öğrenci, dış kullanıcı) `null` alır ve bölüm hiç basılmaz.
 */
export async function bekleyenIsleriGetir(
  kullanici: OturumKullanicisi,
): Promise<BekleyenIsler | null> {
  /*
   * Merkez eski yoldan geçer: belge tarihleri YALNIZCA orada gerekiyor ve
   * sorguyu herkes için açmak, satırı hiç basılmayacak bir sayaç uğruna her
   * panel açılışına bir gidiş dönüş eklerdi.
   */
  if (projeYoneticisiMi(kullanici)) {
    return merkezBosluklariniGetir(await belgeGuncellemeTarihleri());
  }

  const koordinatorMu = ilKoordinatoruMu(kullanici);
  if (!koordinatorMu && !danismanMi(kullanici)) return null;

  const bitmisKosulu = bitmisFaaliyetKosulu(new Date());

  /*
   * Danışman talebi kuyruğu, danışman öğretmende de basılır: kendisinden
   * istenen talepler onun işi. Koordinatörde ise ilindeki BÜTÜN bekleyenler
   * sayılıyor — tıkanan talebi çözecek ikinci kişi o (bkz. lib/danisman/talep.ts).
   */
  const sorumluIl = koordinatorMu ? koordinatorIlKodu(kullanici) : null;

  const [
    danismansizOgrenci,
    raporsuzFaaliyet,
    bekleyenBaglantiIstegi,
    bekleyenDanismanTalebi,
  ] = await Promise.all([
      koordinatorMu
        ? prisma.kullanici.count({
            where: {
              AND: [
                { aktif: true },
                ogrenciKapsamFiltresi(kullanici),
                { ogrenciAtamalari: { none: { bitisTarihi: null } } },
              ],
            },
          })
        : Promise.resolve(null),
      /*
       * Kapsam RAPOR yetkisinden okunuyor, görünürlükten değil: koordinatör
       * başka illerin ulusal etkinliklerini listede görebiliyor ama onların
       * raporunu yazmıyor (bkz. raporlanabilirFaaliyetFiltresi). Danışmanda
       * filtre zaten "kendi açtıkları"na iniyor.
       */
      prisma.faaliyet.count({
        where: {
          AND: [
            { durum: "AKTIF" },
            { rapor: { is: null } },
            bitmisKosulu,
            raporlanabilirFaaliyetFiltresi(kullanici),
          ],
        },
      }),
      /*
       * Ekranda karar verilebilen istekle BİREBİR aynı filtre
       * (bkz. yazismalar/page.tsx). Ayrı bir koşul yazılsaydı sayaç "3 istek
       * bekliyor" derken açılan listede iki satır çıkabilirdi.
       */
      prisma.baglantiIstegi.count({
        where: {
          AND: [{ onayDurumu: "BEKLIYOR" }, baglantiKarariFiltresi(kullanici)],
        },
      }),
      bekleyenTalepSayisi(kullanici.id, sorumluIl),
    ]);

  return {
    danismansizOgrenci,
    raporsuzFaaliyet,
    bekleyenFaaliyetOnayi: null,
    bekleyenIlDisiBasvuru: null,
    bekleyenBaglantiIstegi,
    belgesiEksikKoordinator: null,
    bekleyenDanismanTalebi,
  };
}
