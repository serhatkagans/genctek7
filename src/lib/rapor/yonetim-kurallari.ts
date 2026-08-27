import type { Prisma } from "@/generated/prisma/client";
import { SAYIMDA_DANISMAN } from "./sayim-kosullari";
import { okulTuruKosulu } from "../okul/turler";
/**
 * Yönetim panosunun saf kuralları.
 *
 * Sayımlardan (yonetim-ozeti.ts) AYRI dosyada: o dosya veritabanına bağlanıyor,
 * bu dosya yalnızca hesap yapıyor ve testten doğrudan çağrılabiliyor
 * (bkz. tests/yonetim-panosu.test.ts). Aynı ayrım projede başka yerlerde de var
 * — kural dosyaları hiçbir zaman prisma'ya dokunmuyor.
 */

export interface OzetToplami {
  ilce: number;
  okul: number;
  ogretmen: number;
  danismanOgretmen: number;
  ogrenci: number;
  /** Danışman öğretmen atanmamış aktif okul. */
  danismansizOkul: number;
  /** İl koordinatörü atanmamış il — yalnızca il kartlarında dolar. */
  koordinatorsuzIl: number;
  /** Aktif danışman ataması olmayan öğrenci. */
  danismansizOgrenci: number;
  /** Bu eğitim-öğretim yılının etkinlikleri — yalnızca il kartlarında dolar. */
  faaliyet: number;
  /** Bitmiş ama raporu yazılmamış etkinlik. */
  raporsuzFaaliyet: number;
}

/**
 * Kart listesinin üstünde gösterilen toplam.
 *
 * Ayrı bir sorgu ile ÇEKİLMEZ, kartlardan toplanır: iki kaynak kullanılsaydı
 * kartların toplamı ile başlıktaki sayı birbirini tutmayabilir ve hangisinin
 * doğru olduğu anlaşılmazdı (ilçesi boş bir kayıt tam olarak bunu yapardı).
 *
 * ALAN EKSİKLİĞİ BASAMAĞI SÖYLER; her satır kendi basamağında bir birimdir:
 *
 *   - Okul kartında `okulSayisi` yoktur, kartın kendisi bir okuldur → satır bir
 *     okul sayılır. Sıfır sayılsaydı ilçenin okul toplamı, ekranda okullar
 *     dururken 0 görünürdü.
 *   - İlçe kartında `ilceSayisi` yoktur, kartın kendisi bir ilçedir → satır bir
 *     ilçe sayılır. Okul kartında ise ilçe diye bir şey yok, sıfır sayılır;
 *     ölçüt olarak `okulSayisi`ın varlığına bakılır, çünkü basamağı ayıran alan
 *     odur.
 *   - Okul kartında "danışmansız okul" alanı yoktur: koordinatör sayısı
 *     sıfırsa o kartın kendisi boş bir okuldur.
 *   - `koordinatorAdi` yalnızca il kartında bulunur; boş olan il, merkezin
 *     dolduracağı yerdir. Alan hiç yoksa (ilçe/okul kartı) sayılmaz —
 *     `undefined` ile `null` bilerek ayrı tutuluyor.
 */
export function ozetToplami(
  satirlar: readonly {
    ilceSayisi?: number;
    okulSayisi?: number;
    danismansizOkulSayisi?: number;
    ogretmenSayisi: number;
    danismanOgretmenSayisi: number;
    ogrenciSayisi: number;
    danismansizOgrenciSayisi: number;
    faaliyetSayisi?: number;
    raporsuzFaaliyetSayisi?: number;
    koordinatorAdi?: string | null;
  }[],
): OzetToplami {
  return satirlar.reduce<OzetToplami>(
    (toplam, satir) => ({
      ilce:
        toplam.ilce +
        (satir.ilceSayisi ?? (satir.okulSayisi === undefined ? 0 : 1)),
      okul: toplam.okul + (satir.okulSayisi ?? 1),
      ogretmen: toplam.ogretmen + satir.ogretmenSayisi,
      danismanOgretmen: toplam.danismanOgretmen + satir.danismanOgretmenSayisi,
      ogrenci: toplam.ogrenci + satir.ogrenciSayisi,
      danismansizOkul:
        toplam.danismansizOkul +
        (satir.danismansizOkulSayisi ??
          (satir.danismanOgretmenSayisi === 0 ? 1 : 0)),
      koordinatorsuzIl:
        toplam.koordinatorsuzIl + (satir.koordinatorAdi === null ? 1 : 0),
      danismansizOgrenci:
        toplam.danismansizOgrenci + satir.danismansizOgrenciSayisi,
      /*
       * Etkinlik yalnızca İL kartında sorulur (bkz. yonetim-ozeti.ts ·
       * ilOzetleriniGetir); ilçe ve okul satırında alan yoktur ve sıfır
       * sayılır. Okuldaki gibi "satır bir birimdir" kuralı burada YOK, çünkü
       * bir ilçe kartı bir etkinlik değildir.
       */
      faaliyet: toplam.faaliyet + (satir.faaliyetSayisi ?? 0),
      raporsuzFaaliyet:
        toplam.raporsuzFaaliyet + (satir.raporsuzFaaliyetSayisi ?? 0),
    }),
    {
      ilce: 0,
      okul: 0,
      ogretmen: 0,
      danismanOgretmen: 0,
      ogrenci: 0,
      danismansizOkul: 0,
      koordinatorsuzIl: 0,
      danismansizOgrenci: 0,
      faaliyet: 0,
      raporsuzFaaliyet: 0,
    },
  );
}

/** İl kartlarının sıralama ölçütü. */
export type IlSiralamasi = "ad" | "ogrenci" | "bosluk";

export function ilSiralamasiCoz(deger: string | undefined): IlSiralamasi {
  return deger === "ogrenci" || deger === "bosluk" ? deger : "ad";
}

/** Türkçe harflere göre karşılaştırma — "Iğdır" ile "İstanbul" doğru sırada. */
function adaGore(a: { ad: string }, b: { ad: string }): number {
  return a.ad.localeCompare(b.ad, "tr");
}

/**
 * Arama metnini karşılaştırılabilir hâle getirir.
 *
 * Küçültme TÜRKÇE yapılır: "Isparta" araması İngilizce küçültmeyle "ısparta"
 * değil "isparta" olur ve ile hiç ulaşılamazdı.
 */
function sadelestir(metin: string): string {
  return metin.trim().toLocaleLowerCase("tr");
}

export interface IlSuzgeci {
  ara?: string;
  sirala?: IlSiralamasi;
}

/**
 * 81 ilin kart listesini süzer ve sıralar.
 *
 * SIRALAMA VERİTABANINDA DEĞİL BURADA: "boşluğu çok olan üstte" ölçütü üç ayrı
 * sayımın bileşimi (koordinatörsüz il, danışmansız okul, danışmansız
 * öğrenci) ve bu sayımlar ayrı sorgulardan geliyor — tek bir `orderBy` ile
 * ifade edilemezdi. Liste 81 satır; sıralamanın maliyeti yok.
 *
 * "Boşluk" sıralaması TOPLAM BİR PUAN DEĞİL, sıralı bir karşılaştırmadır: önce
 * koordinatörü olmayan iller, sonra danışmansız okulu çok olanlar, sonra
 * danışmansız öğrencisi çok olanlar. Üç sayı toplansaydı 200 danışmansız
 * öğrencisi olan bir il, koordinatörü hiç olmayan ilin üstüne çıkardı; oysa
 * ikisi aynı ağırlıkta iş değil.
 */
export function illeriSuz<
  T extends {
    ad: string;
    danismansizOkulSayisi: number;
    danismansizOgrenciSayisi: number;
    ogrenciSayisi: number;
    koordinatorAdi: string | null;
  },
>(iller: readonly T[], suzgec: IlSuzgeci = {}): T[] {
  const aranan = sadelestir(suzgec.ara ?? "");
  const suzulmus = aranan
    ? iller.filter((il) => sadelestir(il.ad).includes(aranan))
    : [...iller];

  if (suzgec.sirala === "ogrenci") {
    return suzulmus.sort(
      (a, b) => b.ogrenciSayisi - a.ogrenciSayisi || adaGore(a, b),
    );
  }

  if (suzgec.sirala === "bosluk") {
    return suzulmus.sort(
      (a, b) =>
        Number(a.koordinatorAdi === null ? 0 : 1) -
          Number(b.koordinatorAdi === null ? 0 : 1) ||
        b.danismansizOkulSayisi - a.danismansizOkulSayisi ||
        b.danismansizOgrenciSayisi - a.danismansizOgrenciSayisi ||
        adaGore(a, b),
    );
  }

  return suzulmus.sort(adaGore);
}

/**
 * Bir birimin kartında gösterilecek uyarı satırları.
 *
 * SIFIR OLAN UYARI YAZILMAZ: "0 danışmansız öğrenci" bir haber değil, gürültü.
 * Kart yalnızca yapılacak iş varken kırmızıya döner, böylece ekranda kırmızı
 * görmek bir anlam taşır.
 */
export function birimUyarilari(satir: {
  danismansizOkulSayisi?: number;
  danismansizOgrenciSayisi: number;
  raporsuzFaaliyetSayisi?: number;
}): string[] {
  const uyarilar: string[] = [];

  if (satir.danismansizOkulSayisi) {
    uyarilar.push(`${satir.danismansizOkulSayisi} okulda danışman öğretmen yok`);
  }
  if (satir.danismansizOgrenciSayisi) {
    uyarilar.push(`${satir.danismansizOgrenciSayisi} öğrencinin danışmanı yok`);
  }
  if (satir.raporsuzFaaliyetSayisi) {
    uyarilar.push(`${satir.raporsuzFaaliyetSayisi} etkinliğin raporu eksik`);
  }

  return uyarilar;
}

/** Yol izindeki tek basamak; `yol` yoksa bulunulan sayfadır (bkz. YolIzi). */
export interface YonetimAdimi {
  etiket: string;
  yol?: string;
}

/** Yol izinin işaret ettiği yer — hangi basamağa kadar inildiği. */
export interface YonetimYeri {
  il?: { ilKodu: string; ad: string } | null;
  ilce?: { ilceKodu: string; ad: string } | null;
  /** Okulun panoda kendi ekranı yoktur; yalnızca ad olarak yazılır. */
  okul?: { ad: string } | null;
}

/**
 * Envanter ekranlarının (Öğrenciler / Öğretmenler) yol izi.
 *
 * 12 AĞUSTOS 2026 · istek: "panoda il, sonra ilçe seçince yol izi çıkıyor ama
 * oradan öğrencilere ya da öğretmenlere geçince kayboluyor; geri dönmek için
 * tarayıcının geri düğmesine basmak gerekiyor".
 *
 * Envanterler pano kartlarından ve ilçe ekranındaki okul kartlarından açılıyor;
 * il koordinatörü ile merkezin menüsünde bu ekranların sekmesi YOK, tek kapı
 * pano (bkz. app/panel/layout.tsx). Dolayısıyla ekranın üstündeki bu şerit
 * süsleme değil, geri dönüş yolunun kendisi.
 *
 * BASAMAKLAR SÜZGEÇTEN TÜRETİLİR, "nereden gelindi" bilgisinden değil: adres
 * çubuğundaki il/ilçe/okul zaten kırılımın hangi basamağında olunduğunu
 * söylüyor. Ayrı bir "kaynak" parametresi taşınsaydı süzgeç elle değiştirildiği
 * anda şerit ekrandaki listeyle çelişirdi.
 *
 * Kapsam kontrolü BURADA YAPILMAZ: hangi ilin basamaklarının yazılabileceğine
 * çağıran ekran karar verir (bkz. yonetimPanosuIlErisimi) — bu dosya prisma'ya
 * da yetkiye de dokunmaz.
 */
export function yonetimYolIzi(
  sonAdim: string,
  yer: YonetimYeri = {},
): YonetimAdimi[] {
  const adimlar: YonetimAdimi[] = [
    { etiket: "Yönetim Paneli", yol: "/panel/yonetim" },
  ];

  if (yer.il) {
    adimlar.push({
      etiket: yer.il.ad,
      yol: `/panel/yonetim/il/${yer.il.ilKodu}`,
    });
  }
  if (yer.ilce) {
    adimlar.push({
      etiket: yer.ilce.ad,
      yol: `/panel/yonetim/ilce/${yer.ilce.ilceKodu}`,
    });
  }
  if (yer.okul) {
    adimlar.push({ etiket: yer.okul.ad });
  }

  adimlar.push({ etiket: sonAdim });
  return adimlar;
}

/**
 * Okul özeti sorgusunun süzgeçleri.
 *
 * GENELLEŞTİRİLDİ (15 Ağustos 2026 · Aşama 4): imza eskiden `(ilceKodu: string)`
 * idi ve yalnızca kırılımın son basamağına hizmet ediyordu. Okullar ekranı
 * (`panel/okullar`) aynı sayıları düz ve aranabilir bir listede gösteriyor;
 * ikinci bir okul sorgusu yazılsaydı sayımlar er ya da geç ayrışır ve iki ekran
 * AYNI OKUL için farklı öğrenci sayısı gösterirdi.
 */
export type EkipDurumu = "hepsi" | "ekipli" | "ekipsiz";

export function ekipDurumuGecerliMi(deger: string): deger is EkipDurumu {
  return deger === "hepsi" || deger === "ekipli" || deger === "ekipsiz";
}

export interface OkulSuzgeci {
  ilKodu?: string | null;
  ilceKodu?: string | null;
  okulTuru?: string | null;
  /** Okul adı ya da ilçe adı içinde arama. */
  ara?: string | null;
  /**
   * Okulda tanımlı ekip var mı (Aşama 5 ile açıldı).
   *
   * Manisa panelindeki "Ekip Tanımlanan / Ekip Tanımlanmayan" sekmelerinin
   * karşılığı. Yalnızca OKUL TAKIMI türündeki ekipler sayılır: çalışma grubu
   * ve il ekibi bir okula bağlı değil (şemadaki `ck_ekip_okul_takimi_kurum`),
   * dolayısıyla "bu okulun ekibi var mı" sorusuna cevap vermezler.
   */
  ekipDurumu?: EkipDurumu;
  /**
   * Okulda GençTek danışman öğretmeni var mı (27 Ağustos 2026 · istek:
   * "filtreye danışmanlı okullar danışmansız okullar sütunu ekle").
   *
   * "Danışman" tanımı SAYIM KOŞULLARINDAN geliyor (sayim-kosullari.ts ·
   * SAYIMDA_DANISMAN), yani tablodaki "Danışman" sütununun saydığı kümenin ta
   * kendisi. Burada yeniden yazılsaydı süzgeç, aynı ekranda gösterdiği sayıyla
   * çelişebilirdi — "danışmansız" süzgecinde danışman sayısı 1 olan bir satır.
   *
   * Koşul `some`/`none` ile kuruluyor, sayıyı sonradan süzerek değil: süzme,
   * sayfalamadan ÖNCE bütün okulları çekmeyi gerektirirdi.
   */
  danismanDurumu?: DanismanDurumu;
  atla?: number;
  al?: number;
}

export type DanismanDurumu = "hepsi" | "danismanli" | "danismansiz";

export function danismanDurumuGecerliMi(
  deger: string,
): deger is DanismanDurumu {
  return (
    deger === "hepsi" || deger === "danismanli" || deger === "danismansiz"
  );
}

export function okulKosulu(suzgec: OkulSuzgeci): Prisma.KurumWhereInput {
  const ara = suzgec.ara?.trim();

  return {
    aktif: true,
    ...(suzgec.ilKodu ? { ilKodu: suzgec.ilKodu } : {}),
    ...(suzgec.ilceKodu ? { ilceKodu: suzgec.ilceKodu } : {}),
    /*
      TÜR KOŞULU AYRI YARDIMCIDAN (26 Ağustos 2026): süzgeçteki "Diğer"
      seçeneği bir tür adı değil, "standart listede olmayan türler" koşuludur
      (bkz. lib/okul/turler.ts · okulTuruKosulu).
    */
    ...okulTuruKosulu(suzgec.okulTuru),
    ...(suzgec.ekipDurumu === "ekipli"
      ? { ekipler: { some: { aktif: true } } }
      : suzgec.ekipDurumu === "ekipsiz"
        ? { ekipler: { none: { aktif: true } } }
        : {}),
    ...(suzgec.danismanDurumu === "danismanli"
      ? { kullanicilar: { some: SAYIMDA_DANISMAN } }
      : suzgec.danismanDurumu === "danismansiz"
        ? { kullanicilar: { none: SAYIMDA_DANISMAN } }
        : {}),
    ...(ara
      ? {
          OR: [
            { ad: { contains: ara, mode: "insensitive" as const } },
            { ilce: { ad: { contains: ara, mode: "insensitive" as const } } },
            /*
             * KURUM KODU TAM EŞLEŞME. Kod bir kimliktir; "758" yazan kişi
             * içinde 758 geçen 40 okulu değil, o kodlu okulu arıyor. Sayıya
             * çevrilemeyen metin bu dalı hiç açmıyor.
             */
            ...(Number.isInteger(Number(ara))
              ? [{ kurumKodu: Number(ara) }]
              : []),
          ],
        }
      : {}),
  };
}
