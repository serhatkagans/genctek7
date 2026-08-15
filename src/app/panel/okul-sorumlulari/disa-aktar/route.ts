import { oturumKullanicisi } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  altBaslikYaz,
  bicimCoz,
  disaAktarmaYaniti,
} from "@/lib/rapor/disa-aktarma";
import type { XlsxSutun } from "@/lib/rapor/xlsx";
import { rolEnvanteriGorebilirMi } from "@/lib/yetki/izinler";
import { erisimLoglaCoklu } from "@/lib/yetki/log";
import { okulSorumlusuKosulu } from "../filtreler";

export const dynamic = "force-dynamic";

/**
 * YEĞİTEK okul sorumlularının dosya çıktısı (15 Ağustos 2026 · Aşama 2c).
 *
 * Liste ülke geneli ve yalnızca merkeze açık; dosya da öyle. Ekranın kapısı
 * `rolEnvanteriGorebilirMi` ve burada aynen soruluyor.
 *
 * ÜST SINIR SORULMUYOR, ekrandaki gibi `take: 500` de UYGULANMIYOR: ekran
 * listeyi okunabilir tutmak için kırpıyor, dosya ise merkezin elindeki tam
 * envanter olmalı. İşaretli sorumlu sayısı okul sayısıyla sınırlı ve büyüme
 * ihtimali yok — kırpılsaydı eksikliği fark edilmeyen bir envanter çıkardı.
 */

const SUTUNLAR: readonly XlsxSutun[] = [
  { baslik: "Ad", genislik: 18 },
  { baslik: "Soyad", genislik: 18 },
  { baslik: "Branş", genislik: 24 },
  { baslik: "İl", genislik: 14 },
  { baslik: "İlçe", genislik: 16 },
  { baslik: "Okul", genislik: 38 },
  { baslik: "E-posta", genislik: 28 },
  { baslik: "Telefon", genislik: 16 },
  { baslik: "Danışmanlık durumu", genislik: 20 },
  { baslik: "İşaretlenme tarihi", genislik: 16 },
];

export async function GET(istek: Request) {
  const kullanici = await oturumKullanicisi();
  if (!kullanici || !rolEnvanteriGorebilirMi(kullanici)) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const adres = new URL(istek.url);
  const aranan = (adres.searchParams.get("ara") ?? "").trim();

  const sorumlular = await prisma.ogretmenProfil.findMany({
    where: okulSorumlusuKosulu(aranan),
    orderBy: [
      { kullanici: { il: { ad: "asc" } } },
      { kullanici: { ad: "asc" } },
    ],
    select: {
      kullaniciId: true,
      yegitekIsaretlemeTarihi: true,
      eposta: true,
      telefon: true,
      kullanici: {
        select: {
          ad: true,
          soyad: true,
          brans: true,
          kurum: { select: { ad: true } },
          il: { select: { ad: true } },
          ilce: { select: { ad: true } },
          roller: {
            where: { rolKodu: "DANISMAN", bitisTarihi: null },
            select: { rolKodu: true },
          },
        },
      },
    },
  });

  const bicim = bicimCoz(adres);

  /*
   * Dosya e-posta ve telefon taşıyor — ekranda da görünüyorlar ama indirme,
   * bu iletişim bilgilerini sistemin dışına çıkarıyor. Kayıt bazında loglanır.
   */
  await erisimLoglaCoklu(
    sorumlular.map((sorumlu) => ({
      kullaniciId: kullanici.id,
      islem: "GORUNTULEME" as const,
      hedefTip: "OGRETMEN" as const,
      hedefId: sorumlu.kullaniciId,
      detay: `Okul sorumlusu listesi ${bicim.toUpperCase()} olarak dışa aktarıldı`,
    })),
  );

  const satirlar = sorumlular.map((sorumlu) => [
    sorumlu.kullanici.ad,
    sorumlu.kullanici.soyad,
    sorumlu.kullanici.brans ?? "",
    sorumlu.kullanici.il?.ad ?? "",
    sorumlu.kullanici.ilce?.ad ?? "",
    sorumlu.kullanici.kurum?.ad ?? "",
    sorumlu.eposta ?? "",
    sorumlu.telefon ?? "",
    /*
     * "Danışmanlığı bitmiş" satırlar listenin en işe yarar bilgisi: işaret
     * danışman öğretmene konuyor ama görevi bırakan kişide kalmaya devam
     * ediyor. Ekranda da böyle yazıyor; dosyada gizlenseydi merkez düzeltmesi
     * gereken kaydı göremezdi.
     */
    sorumlu.kullanici.roller.length > 0
      ? "Aktif danışman"
      : "Danışmanlığı bitmiş",
    sorumlu.yegitekIsaretlemeTarihi,
  ]);

  return disaAktarmaYaniti({
    bicim,
    dosyaAdi: "genctek-okul-sorumlulari",
    baslik: "GençTek Ekosistemi",
    altBaslik: altBaslikYaz("YEĞİTEK okul sorumluları", satirlar.length),
    sutunlar: SUTUNLAR,
    satirlar,
  });
}
