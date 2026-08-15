import { prisma } from "../db";
import { egitimOgretimYili, egitimOgretimYiliAraligi } from "../ogretmen/gorev-yillari";
import { OGRETMEN } from "../yetki/kapsam";
import { okulKosulu, type OkulSuzgeci } from "./yonetim-kurallari";
import { SAYIMDA_DANISMAN, SAYIMDA_OGRENCI } from "./sayim-kosullari";
import { bitmisFaaliyetKosulu } from "./istatistik";
import type { YonetimYeri } from "./yonetim-kurallari";

/**
 * Yönetim panosunun sayımları — il → ilçe → okul kırılımı.
 *
 * Panonun tek soruyu üç düzeyde sorması bilinçli: "burada kaç okul, kaç
 * öğretmen, kaç danışman öğretmen, kaç öğrenci var". Merkez ile başlar,
 * koordinatör ilçeden başlar; sayının anlamı ikisinde de aynıdır, yalnızca
 * kapsam daralır.
 *
 * BU DOSYA KAPSAM SORMAZ. Hangi ilin sorulabileceğine çağıran ekran karar
 * verir (bkz. lib/yetki/izinler.ts · yonetimPanosuIlErisimi); burası yalnızca
 * sayar. Aynı ayrım merkez istatistiklerinde de var (bkz. istatistik.ts).
 *
 * "OKUL KOORDİNATÖRÜ" = DANISMAN rolü. Kurumsal dilde okul düzeyindeki sorumlu
 * bu adla anılıyor, sistemdeki rolün adı ise danışman öğretmen — ikisi aynı
 * kişidir (bkz. README · Adlandırma).
 *
 * Sayımlar `groupBy` ile TEK sorguda alınır, birim başına ayrı `count` ile
 * değil: 81 ilin panosu üç sorgu yerine 243 sorgu açardı.
 */

/** groupBy sonucunu "kod → sayı" haritasına çevirir. */
function sayimHaritasi<A extends string>(
  satirlar: readonly ({ _count: { _all: number } } & {
    [K in A]: string | number | null;
  })[],
  alan: A,
): Map<string, number> {
  const harita = new Map<string, number>();
  for (const satir of satirlar) {
    const kod = satir[alan];
    // Kimlik alanları e-Okul'dan gelir ve boş olabilir; kodsuz satır hiçbir
    // kartın altına düşmez, sayılmaz da.
    if (kod === null) continue;
    harita.set(String(kod), satir._count._all);
  }
  return harita;
}

/**
 * Öğretmen kümesi ENVANTERLE AYNI TANIMDAN gelir (bkz. lib/yetki/kapsam.ts ·
 * OGRETMEN): öğrenci, merkez ve dış kullanıcı rolü olmayan herkes. Görev almamış
 * öğretmen de sayılır — panonun sorduğu soru "kaç danışman var" değil, "burada
 * kaç öğretmen var"; ikincisi zaten koordinatör satırında duruyor.
 *
 * `aktif: true` KOŞULU EKLENİR, envanter listesinde bu koşul yokken. Şeritteki
 * öğretmen sayısı danışman öğretmen sayısını KAPSAMAK zorunda ve koordinatör
 * sayımı aktif kullanıcıya bakıyor; iki ölçüt ayrılsaydı pasif bir danışman
 * öğretmen sütununda görünüp koordinatör sütununda görünmez, üstteki sayı alttan
 * küçük kalabilirdi.
 */
const AKTIF_OGRETMEN = { aktif: true, ...OGRETMEN };

/**
 * Danışman öğretmen olmayan aktif okul.
 *
 * Kapalı okul sayılmaz: sayının karşılığı bir iştir ("buraya danışman ata") ve
 * kapalı okula danışman atanmaz. Koşul `none` ile kuruluyor, "koordinatör sayısı
 * sıfır" diye sonradan süzülerek değil — süzme, okulları tek tek çekmeyi
 * gerektirirdi (81 il için bunu yapmıyoruz, bkz. dosya başlığı).
 */
const DANISMANSIZ_OKUL = {
  aktif: true,
  kullanicilar: { none: SAYIMDA_DANISMAN },
};

/**
 * Danışmanı olmayan aktif öğrenci.
 *
 * Merkez bu boşluğu zaten takip ediyordu ama YALNIZCA ÜLKE TOPLAMI olarak
 * (bkz. istatistik.ts · MerkezBoslugu). "412 öğrencinin danışmanı yok" cümlesi
 * kimin işi olduğunu söylemiyordu; kırılımı yapan ekran burası olduğu için sayı
 * buraya da iniyor.
 */
const DANISMANSIZ_OGRENCI = {
  ...SAYIMDA_OGRENCI,
  ogrenciAtamalari: { none: { bitisTarihi: null } },
};

/**
 * Panonun etkinlik ekseni — İÇİNDE BULUNULAN eğitim-öğretim yılı.
 *
 * Tarih aralığı olmadan sayılsaydı sistemin ilk yılından beri biriken her
 * etkinlik aynı kutuda toplanır ve "bu ilde iş var mı" sorusu cevapsız kalırdı;
 * boş bir il, üç yıl önceki tek etkinliğiyle dolu görünürdü.
 *
 * İPTAL EDİLEN ETKİNLİK SAYILMAZ (`durum: AKTIF`): iptal, yapılmamış demektir.
 */
function buYilinFaaliyetleri() {
  const aralik = egitimOgretimYiliAraligi(egitimOgretimYili(new Date()));
  return {
    durum: "AKTIF" as const,
    ...(aralik === null
      ? {}
      : { tarih: { gte: aralik.baslangic, lte: aralik.bitis } }),
  };
}

export interface IlOzeti {
  ilKodu: string;
  ad: string;
  ilceSayisi: number;
  okulSayisi: number;
  /** Danışman öğretmen atanmamış aktif okul sayısı — doldurulacak boşluk. */
  danismansizOkulSayisi: number;
  ogretmenSayisi: number;
  danismanOgretmenSayisi: number;
  ogrenciSayisi: number;
  /** Aktif danışman ataması olmayan öğrenci — takipsiz kalanlar. */
  danismansizOgrenciSayisi: number;
  /** Bu eğitim-öğretim yılında ilde yapılan etkinlik. */
  faaliyetSayisi: number;
  /** Bitmiş ama raporu yazılmamış etkinlik. */
  raporsuzFaaliyetSayisi: number;
  /** İlin görevdeki koordinatörü — boşsa merkezin doldurması gereken yer. */
  koordinatorAdi: string | null;
}

/**
 * Tüm illerin özeti — merkezin panosu.
 *
 * Kayıtsız il de listede kalır (bütün sayıları sıfır görünür): pano "nerede iş
 * var" kadar "nerede hiç yok" sorusunu da cevaplıyor, sıfırlar elenirse boş il
 * ekrandan tamamen kaybolurdu.
 *
 * ETKİNLİK YALNIZCA BU BASAMAKTA SORULUR, ilçe ve okul özetlerinde yok. Faaliyet
 * kaydının ilçesi ve kurumu BOŞ OLABİLİR (il geneli etkinliğin ilçesi yoktur);
 * alt basamakta da sorulsaydı ilçelerin toplamı ilin sayısından küçük çıkar,
 * merkez aynı ili iki ekranda iki farklı sayıyla görürdü. Etkinliğin ilçe
 * kırılımı gereken yer Etkinlikler ekranıdır, pano değil.
 */
export async function ilOzetleriniGetir(): Promise<IlOzeti[]> {
  const [
    iller,
    ilceler,
    okullar,
    bosOkullar,
    ogretmenler,
    koordinatorler,
    ogrenciler,
    danismansizlar,
    faaliyetler,
    raporsuzlar,
    gorevliler,
  ] = await Promise.all([
    prisma.il.findMany({
      orderBy: { ad: "asc" },
      select: { ilKodu: true, ad: true },
    }),
    prisma.ilce.groupBy({ by: ["ilKodu"], _count: { _all: true } }),
    prisma.kurum.groupBy({
      by: ["ilKodu"],
      where: { aktif: true },
      _count: { _all: true },
    }),
    prisma.kurum.groupBy({
      by: ["ilKodu"],
      where: DANISMANSIZ_OKUL,
      _count: { _all: true },
    }),
    prisma.kullanici.groupBy({
      by: ["ilKodu"],
      where: AKTIF_OGRETMEN,
      _count: { _all: true },
    }),
    prisma.kullanici.groupBy({
      by: ["ilKodu"],
      where: SAYIMDA_DANISMAN,
      _count: { _all: true },
    }),
    prisma.kullanici.groupBy({
      by: ["ilKodu"],
      where: SAYIMDA_OGRENCI,
      _count: { _all: true },
    }),
    prisma.kullanici.groupBy({
      by: ["ilKodu"],
      where: DANISMANSIZ_OGRENCI,
      _count: { _all: true },
    }),
    prisma.faaliyet.groupBy({
      by: ["ilKodu"],
      where: buYilinFaaliyetleri(),
      _count: { _all: true },
    }),
    prisma.faaliyet.groupBy({
      by: ["ilKodu"],
      where: {
        AND: [
          buYilinFaaliyetleri(),
          bitmisFaaliyetKosulu(new Date()),
          { rapor: { is: null } },
        ],
      },
      _count: { _all: true },
    }),
    /*
     * İl koordinatörü ROL KAYDINDAN okunur, kullanıcının kendi ilinden değil:
     * koordinatörün görev ili ile kimlik ili farklı olabilir ve panoda ilin
     * sorumlusu sorulur.
     */
    prisma.kullaniciRol.findMany({
      where: {
        rolKodu: "IL_KOORDINATOR",
        bitisTarihi: null,
        kullanici: { aktif: true },
      },
      select: {
        ilKodu: true,
        kullanici: { select: { ad: true, soyad: true } },
      },
    }),
  ]);

  const ilceSayilari = sayimHaritasi(ilceler, "ilKodu");
  const okulSayilari = sayimHaritasi(okullar, "ilKodu");
  const bosOkulSayilari = sayimHaritasi(bosOkullar, "ilKodu");
  const ogretmenSayilari = sayimHaritasi(ogretmenler, "ilKodu");
  const danismanSayilari = sayimHaritasi(koordinatorler, "ilKodu");
  const ogrenciSayilari = sayimHaritasi(ogrenciler, "ilKodu");
  const danismansizSayilari = sayimHaritasi(danismansizlar, "ilKodu");
  const faaliyetSayilari = sayimHaritasi(faaliyetler, "ilKodu");
  const raporsuzSayilari = sayimHaritasi(raporsuzlar, "ilKodu");
  const koordinatorAdlari = new Map(
    gorevliler.flatMap((rol) =>
      rol.ilKodu === null
        ? []
        : [[rol.ilKodu, `${rol.kullanici.ad} ${rol.kullanici.soyad}`] as const],
    ),
  );

  return iller.map((il) => ({
    ilKodu: il.ilKodu,
    ad: il.ad,
    ilceSayisi: ilceSayilari.get(il.ilKodu) ?? 0,
    okulSayisi: okulSayilari.get(il.ilKodu) ?? 0,
    danismansizOkulSayisi: bosOkulSayilari.get(il.ilKodu) ?? 0,
    ogretmenSayisi: ogretmenSayilari.get(il.ilKodu) ?? 0,
    danismanOgretmenSayisi: danismanSayilari.get(il.ilKodu) ?? 0,
    ogrenciSayisi: ogrenciSayilari.get(il.ilKodu) ?? 0,
    danismansizOgrenciSayisi: danismansizSayilari.get(il.ilKodu) ?? 0,
    faaliyetSayisi: faaliyetSayilari.get(il.ilKodu) ?? 0,
    raporsuzFaaliyetSayisi: raporsuzSayilari.get(il.ilKodu) ?? 0,
    koordinatorAdi: koordinatorAdlari.get(il.ilKodu) ?? null,
  }));
}

export interface IlceOzeti {
  ilceKodu: string;
  ad: string;
  okulSayisi: number;
  danismansizOkulSayisi: number;
  ogretmenSayisi: number;
  danismanOgretmenSayisi: number;
  ogrenciSayisi: number;
  danismansizOgrenciSayisi: number;
}

/**
 * Bir ilin ilçe özetleri — il koordinatörünün panosu.
 *
 * Kişi sayıları kullanıcının İLÇE KODUNDAN gelir, okulunun ilçesinden değil.
 * İkisi normalde aynıdır (ikisi de e-Okul kaynaklı) ama kart, tıklandığında
 * açılan listeyle aynı ölçütü kullanmak zorunda: öğrenci ve öğretmen
 * envanterleri de `ilceKodu` ile süzülüyor (bkz. lib/yetki/kapsam.ts). Başka
 * bir ölçüt seçilseydi kartta 12 yazıp listede 11 kişi çıkabilirdi.
 */
export async function ilceOzetleriniGetir(ilKodu: string): Promise<IlceOzeti[]> {
  const [
    ilceler,
    okullar,
    bosOkullar,
    ogretmenler,
    koordinatorler,
    ogrenciler,
    danismansizlar,
  ] = await Promise.all([
      prisma.ilce.findMany({
        where: { ilKodu },
        orderBy: { ad: "asc" },
        select: { ilceKodu: true, ad: true },
      }),
      prisma.kurum.groupBy({
        by: ["ilceKodu"],
        where: { ilKodu, aktif: true },
        _count: { _all: true },
      }),
      prisma.kurum.groupBy({
        by: ["ilceKodu"],
        where: { ilKodu, ...DANISMANSIZ_OKUL },
        _count: { _all: true },
      }),
      prisma.kullanici.groupBy({
        by: ["ilceKodu"],
        where: { ilKodu, ...AKTIF_OGRETMEN },
        _count: { _all: true },
      }),
      prisma.kullanici.groupBy({
        by: ["ilceKodu"],
        where: { ilKodu, ...SAYIMDA_DANISMAN },
        _count: { _all: true },
      }),
      prisma.kullanici.groupBy({
        by: ["ilceKodu"],
        where: { ilKodu, ...SAYIMDA_OGRENCI },
        _count: { _all: true },
      }),
      prisma.kullanici.groupBy({
        by: ["ilceKodu"],
        where: { ilKodu, ...DANISMANSIZ_OGRENCI },
        _count: { _all: true },
      }),
    ]);

  const okulSayilari = sayimHaritasi(okullar, "ilceKodu");
  const bosOkulSayilari = sayimHaritasi(bosOkullar, "ilceKodu");
  const ogretmenSayilari = sayimHaritasi(ogretmenler, "ilceKodu");
  const danismanSayilari = sayimHaritasi(koordinatorler, "ilceKodu");
  const ogrenciSayilari = sayimHaritasi(ogrenciler, "ilceKodu");
  const danismansizSayilari = sayimHaritasi(danismansizlar, "ilceKodu");

  return ilceler.map((ilce) => ({
    ilceKodu: ilce.ilceKodu,
    ad: ilce.ad,
    okulSayisi: okulSayilari.get(ilce.ilceKodu) ?? 0,
    danismansizOkulSayisi: bosOkulSayilari.get(ilce.ilceKodu) ?? 0,
    ogretmenSayisi: ogretmenSayilari.get(ilce.ilceKodu) ?? 0,
    danismanOgretmenSayisi: danismanSayilari.get(ilce.ilceKodu) ?? 0,
    ogrenciSayisi: ogrenciSayilari.get(ilce.ilceKodu) ?? 0,
    danismansizOgrenciSayisi: danismansizSayilari.get(ilce.ilceKodu) ?? 0,
  }));
}

export interface OkulOzeti {
  kurumKodu: number;
  ad: string;
  okulTuru: string;
  /** Düz listede gösterilebilsin diye; kırılım ekranında zaten belli. */
  ilAdi: string;
  ilceAdi: string;
  ogretmenSayisi: number;
  danismanOgretmenSayisi: number;
  ogrenciSayisi: number;
  danismansizOgrenciSayisi: number;
  /** Okula bağlı AÇIK okul takımı sayısı (Aşama 5). */
  ekipSayisi: number;
}

/**
 * Okul özetleri — kırılımın son basamağı ve Okullar ekranının ortak sorgusu.
 *
 * Kişi sayıları KURUM KODUNDAN gelir; okul düzeyinde ilçe kodu değil kurum kodu
 * tek doğruluk kaynağıdır ve envanter ekranlarının okul süzgeci de bu alanı
 * kullanıyor.
 *
 * SAYIMLAR YALNIZCA GETİRİLEN OKULLAR İÇİN hesaplanıyor (`in: kodlar`). İlçe
 * ölçeğinde bu 30-50 okul; ulusal ölçekte sayfa boyutuyla sınırlanması ŞART,
 * yoksa dört `groupBy` on binlerce satır üzerinde çalışır. Sayfalama bu yüzden
 * isteğe bağlı bir iyileştirme değil, sorgunun ön koşulu.
 */
export async function okulOzetleriniGetir(
  suzgec: OkulSuzgeci,
): Promise<OkulOzeti[]> {
  const okullar = await prisma.kurum.findMany({
    where: okulKosulu(suzgec),
    orderBy: [{ ilce: { ad: "asc" } }, { ad: "asc" }],
    ...(suzgec.atla === undefined ? {} : { skip: suzgec.atla }),
    ...(suzgec.al === undefined ? {} : { take: suzgec.al }),
    select: {
      kurumKodu: true,
      ad: true,
      okulTuru: true,
      il: { select: { ad: true } },
      ilce: { select: { ad: true } },
      // Kapalı ekip sayılmaz: "bu okulun ekibi var mı" sorusu açık ekibi sorar.
      _count: { select: { ekipler: { where: { aktif: true } } } },
    },
  });

  if (okullar.length === 0) return [];

  const kodlar = okullar.map((okul) => okul.kurumKodu);
  const [ogretmenler, koordinatorler, ogrenciler, danismansizlar] =
    await Promise.all([
      prisma.kullanici.groupBy({
        by: ["kurumKodu"],
        where: { kurumKodu: { in: kodlar }, ...AKTIF_OGRETMEN },
        _count: { _all: true },
      }),
      prisma.kullanici.groupBy({
        by: ["kurumKodu"],
        where: { kurumKodu: { in: kodlar }, ...SAYIMDA_DANISMAN },
        _count: { _all: true },
      }),
      prisma.kullanici.groupBy({
        by: ["kurumKodu"],
        where: { kurumKodu: { in: kodlar }, ...SAYIMDA_OGRENCI },
        _count: { _all: true },
      }),
      prisma.kullanici.groupBy({
        by: ["kurumKodu"],
        where: { kurumKodu: { in: kodlar }, ...DANISMANSIZ_OGRENCI },
        _count: { _all: true },
      }),
    ]);

  const ogretmenSayilari = sayimHaritasi(ogretmenler, "kurumKodu");
  const danismanSayilari = sayimHaritasi(koordinatorler, "kurumKodu");
  const ogrenciSayilari = sayimHaritasi(ogrenciler, "kurumKodu");
  const danismansizSayilari = sayimHaritasi(danismansizlar, "kurumKodu");

  /*
   * Okul basamağında "danışmansız okul" AYRICA SORULMAZ: kartın kendisi bir
   * okul, koordinatör sayısı da zaten kartta yazıyor. Sıfır olan satır boş
   * okuldur; toplam da bunun üzerinden hesaplanır
   * (bkz. yonetim-kurallari.ts · ozetToplami).
   */
  return okullar.map((okul) => ({
    kurumKodu: okul.kurumKodu,
    ad: okul.ad,
    okulTuru: okul.okulTuru,
    ilAdi: okul.il?.ad ?? "",
    ilceAdi: okul.ilce?.ad ?? "",
    ogretmenSayisi: ogretmenSayilari.get(String(okul.kurumKodu)) ?? 0,
    danismanOgretmenSayisi:
      danismanSayilari.get(String(okul.kurumKodu)) ?? 0,
    ogrenciSayisi: ogrenciSayilari.get(String(okul.kurumKodu)) ?? 0,
    danismansizOgrenciSayisi:
      danismansizSayilari.get(String(okul.kurumKodu)) ?? 0,
    ekipSayisi: okul._count.ekipler,
  }));
}

/*
 * Toplam hesabı bilerek BURADA DEĞİL: saf bir hesap olduğu için kural
 * dosyasında duruyor ve testten doğrudan çağrılıyor
 * (bkz. yonetim-kurallari.ts · ozetToplami).
 */

/**
 * Envanter süzgecinin işaret ettiği yeri adlarıyla getirir — yol izi için.
 *
 * TEK SORGU, EN DAR BASAMAKTAN: okul verilmişse ili ve ilçesi okul kaydından
 * gelir, ilçe verilmişse ili ilçe kaydından. Basamaklar ayrı ayrı sorulsaydı
 * hem üç sorgu açılırdı hem de adres çubuğunda tutarsız bir çift (bir ilin
 * kodu, başka bir ilin ilçesi) yazıldığında şerit olmayan bir yeri gösterirdi.
 *
 * Süzgeçte yer yoksa (`{}`) sorgu da açılmaz: envanterin süzgeçsiz hâli
 * panonun altındaki ekranın kendisidir, basamağı yoktur.
 */
export async function yonetimYeriniGetir(filtreler: {
  ilKodu?: string | null;
  ilceKodu?: string | null;
  kurumKodu?: number | null;
}): Promise<YonetimYeri> {
  if (filtreler.kurumKodu !== null && filtreler.kurumKodu !== undefined) {
    const okul = await prisma.kurum.findUnique({
      where: { kurumKodu: filtreler.kurumKodu },
      select: {
        ad: true,
        ilKodu: true,
        ilceKodu: true,
        il: { select: { ad: true } },
        ilce: { select: { ad: true } },
      },
    });
    if (!okul) return {};
    return {
      il: { ilKodu: okul.ilKodu, ad: okul.il.ad },
      ilce: { ilceKodu: okul.ilceKodu, ad: okul.ilce.ad },
      okul: { ad: okul.ad },
    };
  }

  if (filtreler.ilceKodu) {
    const ilce = await prisma.ilce.findUnique({
      where: { ilceKodu: filtreler.ilceKodu },
      select: { ad: true, ilKodu: true, il: { select: { ad: true } } },
    });
    if (!ilce) return {};
    return {
      il: { ilKodu: ilce.ilKodu, ad: ilce.il.ad },
      ilce: { ilceKodu: filtreler.ilceKodu, ad: ilce.ad },
    };
  }

  if (filtreler.ilKodu) {
    const il = await prisma.il.findUnique({
      where: { ilKodu: filtreler.ilKodu },
      select: { ad: true },
    });
    return il ? { il: { ilKodu: filtreler.ilKodu, ad: il.ad } } : {};
  }

  return {};
}
