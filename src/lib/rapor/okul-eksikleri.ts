import type { Prisma } from "@/generated/prisma/client";
import { okulTuruKosulu } from "../okul/turler";
import { SAYIMDA_DANISMAN, SAYIMDA_OGRENCI } from "./sayim-kosullari";

/**
 * OKUL EKSİK DURUM ANALİZİ (15 Ağustos 2026).
 *
 * Manisa farkları turu. Manisa GençTek panelindeki "Okul Eksik
 * Durumlar" ekranının karşılığı: hangi okulda danışman, öğrenci ya da temsilci
 * eksik. Bizde bu bilginin tek izi Yönetim Paneli'ndeki `danismansizOkul`
 * sayacıydı — bir SAYI, ama "hangi okullar" sorusunun cevabı yoktu ve sayıyı
 * gören kişi aksiyona geçemiyordu.
 *
 * ============================================================================
 * DÖRT KIRILIM, ÜÇÜ TEKİL BİRİ KESİŞİM
 * ============================================================================
 * Dördüncüsü ilk ikisinin kesişimi ama AYRI BİR SEKME hak ediyor: "öğrenci yok"
 * listesindeki bir okulda temsilci olmaması normaldir (temsilci öğrenciler
 * arasından seçilir). Asıl eksik, öğrencisi OLUP temsilcisi olmayan okuldur ve
 * o okul "temsilci yok" listesinin içinde 100 kaydın arasında kaybolur. Manisa
 * panelinde de ayrı duruyor (13 kayıt).
 *
 * ============================================================================
 * DÖNEM ZORUNLU
 * ============================================================================
 * Temsilcilik `OgrenciGorevRolu` üzerinden ve DÖNEM BAZLI. Yıl verilmeseydi
 * geçen yılın temsilcisi bu yılın eksiğini gizlerdi: okul "temsilcisi var" diye
 * görünür, oysa bu dönem kimse atanmamıştır. Çağıran her zaman bir yıl verir.
 *
 * ============================================================================
 * BU DOSYA VERİTABANINA BAKMAZ, KAPSAM DA SORMAZ
 * ============================================================================
 * Yalnızca KOŞUL üretir; sorgular `okul-eksikleri-ozeti.ts` içinde
 * (`yonetim-kurallari` / `yonetim-ozeti` ayrımının aynısı). Ayrım pratik bir
 * gereklilik de: koşullar birim testle sınanıyor ve testler Prisma istemcisini
 * yükleyemiyor.
 *
 * Hangi ilin sorulabileceğine EKRAN karar verir (bkz. yonetimPanosuIlErisimi).
 *
 * "Aktif öğrenci" ve "aktif danışman" tanımları `sayim-kosullari.ts`'ten ithal
 * ediliyor, burada yeniden yazılmıyor — iki ekranın aynı kelimeyle farklı
 * kümeleri sayması, fark edilmesi en zor tutarsızlık türü.
 */

/** Hangi eksikliğin sorulduğu. */
export type EksikKirilimi =
  | "danismanYok"
  | "ogrenciYok"
  | "temsilciYok"
  | "ogrenciVarTemsilciYok";

export const KIRILIM_ETIKETLERI: Record<EksikKirilimi, string> = {
  danismanYok: "Danışman yok",
  ogrenciYok: "Öğrenci yok",
  temsilciYok: "Temsilci yok",
  ogrenciVarTemsilciYok: "Öğrenci var, temsilci yok",
};

export const KIRILIM_ACIKLAMALARI: Record<EksikKirilimi, string> = {
  danismanYok:
    "Okulda GençTek danışmanlığı üstlenmiş aktif öğretmen bulunmuyor.",
  ogrenciYok: "Okulda sisteme kayıtlı aktif öğrenci bulunmuyor.",
  temsilciYok: "Bu dönem için okul temsilcisi atanmamış.",
  ogrenciVarTemsilciYok:
    "Öğrencisi olduğu hâlde bu dönem temsilcisi atanmamış okullar — listenin aksiyon gerektiren kısmı.",
};

export const KIRILIMLAR: readonly EksikKirilimi[] = [
  "danismanYok",
  "ogrenciYok",
  "temsilciYok",
  "ogrenciVarTemsilciYok",
];

export function kirilimGecerliMi(deger: string): deger is EksikKirilimi {
  return (KIRILIMLAR as readonly string[]).includes(deger);
}

/** Ekranın ve dosyanın ortak süzgeçleri. */
export interface EksikSuzgeci {
  /** Merkez için null (ülke geneli); koordinatörde kendi ili. */
  ilKodu: string | null;
  ilceKodu: string | null;
  okulTuru: string | null;
  /** Okul adı ya da ilçe adı içinde arama. */
  ara: string | null;
  egitimOgretimYili: string;
}

/**
 * Süzgeçlerin okul sorgusuna çevrilmiş hâli — kırılımdan BAĞIMSIZ kısım.
 *
 * KAPALI OKUL HİÇBİR KIRILIMDA YOK (`aktif: true`). Her satırın karşılığı bir
 * iştir ("buraya danışman ata", "temsilci seç") ve kapalı okula bunların hiçbiri
 * yapılmaz. `DANISMANSIZ_OKUL` da aynı gerekçeyle böyle kurulmuştu.
 */
function ortakKosul(suzgec: EksikSuzgeci): Prisma.KurumWhereInput {
  const ara = suzgec.ara?.trim();

  return {
    aktif: true,
    ...(suzgec.ilKodu ? { ilKodu: suzgec.ilKodu } : {}),
    ...(suzgec.ilceKodu ? { ilceKodu: suzgec.ilceKodu } : {}),
    /* "Diğer" bir tür adı değil, koşul (bkz. lib/okul/turler.ts). */
    ...okulTuruKosulu(suzgec.okulTuru),
    ...(ara
      ? {
          OR: [
            { ad: { contains: ara, mode: "insensitive" as const } },
            { ilce: { ad: { contains: ara, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
}

/**
 * Bu dönem okul temsilcisi ATANMAMIŞ olma koşulu.
 *
 * Kapsam görevin KENDİ `kurumKodu` sütunundan okunuyor, öğrencinin kaydından
 * değil: öğrenci okul değiştirdiğinde dönem içinde verilmiş görev, verildiği
 * okulda kalır (şemadaki `ck_ogrenci_gorev_kapsam` notu). Öğrenciden
 * türetilseydi, temsilcisi başka okula geçen bir okul "temsilcisi var" diye
 * görünmeye devam ederdi.
 */
function temsilcisizKosul(yil: string): Prisma.KurumWhereInput {
  return {
    ogrenciGorevleri: {
      none: { rolKodu: "OKUL_TEMSILCISI", egitimOgretimYili: yil },
    },
  };
}

/** Bir kırılımın okul koşulu. */
export function kirilimKosulu(
  kirilim: EksikKirilimi,
  suzgec: EksikSuzgeci,
): Prisma.KurumWhereInput {
  const ortak = ortakKosul(suzgec);

  switch (kirilim) {
    case "danismanYok":
      return { ...ortak, kullanicilar: { none: SAYIMDA_DANISMAN } };
    case "ogrenciYok":
      return { ...ortak, kullanicilar: { none: SAYIMDA_OGRENCI } };
    case "temsilciYok":
      return { ...ortak, ...temsilcisizKosul(suzgec.egitimOgretimYili) };
    case "ogrenciVarTemsilciYok":
      return {
        ...ortak,
        kullanicilar: { some: SAYIMDA_OGRENCI },
        ...temsilcisizKosul(suzgec.egitimOgretimYili),
      };
  }
}
