import { prisma } from "../db";
import {
  KIRILIMLAR,
  kirilimKosulu,
  type EksikKirilimi,
  type EksikSuzgeci,
} from "./okul-eksikleri";
import { SAYIMDA_DANISMAN, SAYIMDA_OGRENCI } from "./sayim-kosullari";

/**
 * Okul eksik durum analizinin sorguları (15 Ağustos 2026 · Aşama 3).
 *
 * Kurallar ve koşullar `okul-eksikleri.ts` içinde ve birim testli; burada
 * yalnızca veritabanına gidiş var. Ayrım `yonetim-kurallari` / `yonetim-ozeti`
 * ikilisiyle aynı.
 *
 * BU DOSYA KAPSAM SORMAZ: hangi ilin sorulabileceğine ekran karar verir
 * (bkz. lib/yetki/izinler.ts · yonetimPanosuIlErisimi).
 */

export type EksikSayimlari = Record<EksikKirilimi, number>;

/**
 * Dört kırılımın sayıları.
 *
 * DÖRT AYRI `count`, tek sorgudan türetme değil. Dördü tek sorguya sığdırmak
 * için okulların tamamını ilişkileriyle çekmek gerekirdi; ülke genelinde bu on
 * binlerce satır demek. Sayılar `none`/`some` ile veritabanında hesaplanıyor ve
 * dört sorgu paralel gidiyor.
 */
export async function eksikSayimlari(
  suzgec: EksikSuzgeci,
): Promise<EksikSayimlari> {
  const [danismanYok, ogrenciYok, temsilciYok, ogrenciVarTemsilciYok] =
    await Promise.all(
      KIRILIMLAR.map((kirilim) =>
        prisma.kurum.count({ where: kirilimKosulu(kirilim, suzgec) }),
      ),
    );

  return { danismanYok, ogrenciYok, temsilciYok, ogrenciVarTemsilciYok };
}

export interface EksikOkulSatiri {
  kurumKodu: number;
  ad: string;
  okulTuru: string;
  ilAdi: string;
  ilceAdi: string;
  ogrenciSayisi: number;
  ogretmenSayisi: number;
}

/**
 * Bir kırılımın okul listesi.
 *
 * SAYFA BAŞINA SINIR VAR: ülke genelinde "temsilci yok" listesi on binlerce
 * satır olabilir ve tek sayfaya basılamaz. Sayım ayrı yapıldığı için toplam
 * yine doğru görünür — kırpılan liste, kırpıldığını söyleyen bir sayının
 * yanında duruyor.
 *
 * Öğrenci ve öğretmen sayısı satırda duruyor çünkü listedeki asıl karar bunlara
 * bakarak veriliyor: "danışman yok" listesinde 200 öğrencili bir okul ile boş
 * bir okul aynı aciliyette değil.
 */
export async function eksikOkullar(
  kirilim: EksikKirilimi,
  suzgec: EksikSuzgeci,
  sayfa: number,
  sayfaBoyutu: number,
): Promise<EksikOkulSatiri[]> {
  const okullar = await prisma.kurum.findMany({
    where: kirilimKosulu(kirilim, suzgec),
    orderBy: [{ ilce: { ad: "asc" } }, { ad: "asc" }],
    skip: Math.max(0, (sayfa - 1) * sayfaBoyutu),
    take: sayfaBoyutu,
    select: {
      kurumKodu: true,
      ad: true,
      okulTuru: true,
      il: { select: { ad: true } },
      ilce: { select: { ad: true } },
      _count: { select: { kullanicilar: true } },
    },
  });

  if (okullar.length === 0) return [];

  /*
   * `_count.kullanicilar` HAM SAYIDIR: okuldaki her kullanıcıyı sayar, rolüne
   * bakmaz. Öğrenci ve öğretmen ayrımı için iki `groupBy` daha gerekiyor —
   * yalnızca GÖRÜNEN sayfanın okulları için, listenin tamamı için değil.
   */
  const kodlar = okullar.map((okul) => okul.kurumKodu);
  const [ogrenciler, ogretmenler] = await Promise.all([
    prisma.kullanici.groupBy({
      by: ["kurumKodu"],
      where: { kurumKodu: { in: kodlar }, ...SAYIMDA_OGRENCI },
      _count: { _all: true },
    }),
    prisma.kullanici.groupBy({
      by: ["kurumKodu"],
      where: { kurumKodu: { in: kodlar }, ...SAYIMDA_DANISMAN },
      _count: { _all: true },
    }),
  ]);

  const ogrenciSayisi = new Map(
    ogrenciler.map((satir) => [satir.kurumKodu, satir._count._all]),
  );
  const ogretmenSayisi = new Map(
    ogretmenler.map((satir) => [satir.kurumKodu, satir._count._all]),
  );

  return okullar.map((okul) => ({
    kurumKodu: okul.kurumKodu,
    ad: okul.ad,
    okulTuru: okul.okulTuru,
    ilAdi: okul.il?.ad ?? "",
    ilceAdi: okul.ilce?.ad ?? "",
    ogrenciSayisi: ogrenciSayisi.get(okul.kurumKodu) ?? 0,
    ogretmenSayisi: ogretmenSayisi.get(okul.kurumKodu) ?? 0,
  }));
}
