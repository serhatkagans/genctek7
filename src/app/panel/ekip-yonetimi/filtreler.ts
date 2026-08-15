import type { Prisma } from "@/generated/prisma/client";
import type { EkipTuru } from "@/generated/prisma/enums";
import { ekipTuruGecerliMi } from "@/lib/ekip/kurallar";
import { koordinatorIlKodu, projeYoneticisiMi } from "@/lib/yetki/izinler";
import type { OturumKullanicisi } from "@/lib/yetki/tipler";
import { tekil, type SorguParametreleri } from "../ogrenciler/filtreler";

/**
 * Merkezi ekip listesinin süzgeçleri — ekran ve dosya ortak kullanır.
 */
export interface EkipYonetimSuzgeci {
  ilKodu: string | null;
  tur: EkipTuru | null;
  ara: string | null;
  danismansizMi: boolean;
  kapalilarMi: boolean;
}

/**
 * Süzgeçler + KAPSAM.
 *
 * İL YETKİDEN GELİR, adresten değil: koordinatör kendi iline sabitlenir.
 * Okullar ve Okul Eksik Durum ekranlarındaki kararın aynısı.
 */
export function ekipSuzgeciniCoz(
  kullanici: OturumKullanicisi,
  parametreler: SorguParametreleri,
): EkipYonetimSuzgeci {
  const merkezMi = projeYoneticisiMi(kullanici);
  const tur = tekil(parametreler.tur) ?? "";

  return {
    ilKodu: merkezMi ? tekil(parametreler.il) : koordinatorIlKodu(kullanici),
    tur: ekipTuruGecerliMi(tur) ? tur : null,
    ara: tekil(parametreler.ara),
    danismansizMi: tekil(parametreler.danismansiz) === "1",
    kapalilarMi: tekil(parametreler.kapali) === "1",
  };
}

/**
 * Süzgeçlerin sorguya çevrilmiş hâli.
 *
 * ============================================================================
 * "DANIŞMANSIZ" SORGUDA DA PASİF DANIŞMANI KAPSAR
 * ============================================================================
 * `lib/ekip/kurallar.ts · ekipDanismansizMi` ile aynı tanım: alanı boş olan
 * VEYA danışmanı pasif olan ekip. Sorguda yalnızca `danismanKullaniciId: null`
 * arasaydık, görevden ayrılmış öğretmenin yazılı kaldığı ekipler listede hiç
 * görünmezdi — oysa en çok onların görünmesi gerekiyor. Ekran ve sorgu farklı
 * tanım kullansaydı, listedeki satır sayısıyla rozetteki sayı tutmazdı.
 *
 * KAPALI EKİPLER VARSAYILAN OLARAK DIŞARIDA: kapatılmış ekibin danışmanı
 * olmaması bir eksiklik değil, olağan sonuç. Görev listesini kapanmış işlerle
 * doldurmamak için `?kapali=1` istenmedikçe elenir.
 */
export function ekipKosulu(
  suzgec: EkipYonetimSuzgeci,
): Prisma.EkipWhereInput {
  const ara = suzgec.ara?.trim();

  return {
    ...(suzgec.kapalilarMi ? {} : { aktif: true }),
    ...(suzgec.ilKodu ? { ilKodu: suzgec.ilKodu } : {}),
    ...(suzgec.tur ? { tur: suzgec.tur } : {}),
    ...(ara ? { ad: { contains: ara, mode: "insensitive" as const } } : {}),
    ...(suzgec.danismansizMi
      ? {
          OR: [
            { danismanKullaniciId: null },
            { danisman: { aktif: false } },
          ],
        }
      : {}),
  };
}

/** Süzgeçleri koruyan sorgu dizesi. */
export function ekipSorgusu(
  suzgec: EkipYonetimSuzgeci,
  ekler: Record<string, string | number | undefined> = {},
): string {
  const sorgu = new URLSearchParams();
  if (suzgec.ilKodu) sorgu.set("il", suzgec.ilKodu);
  if (suzgec.tur) sorgu.set("tur", suzgec.tur);
  if (suzgec.ara) sorgu.set("ara", suzgec.ara);
  if (suzgec.danismansizMi) sorgu.set("danismansiz", "1");
  if (suzgec.kapalilarMi) sorgu.set("kapali", "1");

  for (const [anahtar, deger] of Object.entries(ekler)) {
    if (deger !== undefined && deger !== "") sorgu.set(anahtar, String(deger));
  }

  return sorgu.toString();
}
