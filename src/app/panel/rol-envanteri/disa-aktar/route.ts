import { oturumKullanicisi } from "@/lib/auth/oturum";
import {
  altBaslikYaz,
  bicimCoz,
  disaAktarmaYaniti,
} from "@/lib/rapor/disa-aktarma";
import {
  ilKoordinatorDurumlari,
  kurumDanismanDurumlari,
} from "@/lib/rapor/rol-envanteri";
import type { XlsxSutun } from "@/lib/rapor/xlsx";
import { rolEnvanteriGorebilirMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";

export const dynamic = "force-dynamic";

/**
 * Rol/atama envanterinin dosya çıktısı (15 Ağustos 2026 · Aşama 2c'nin kalanı).
 *
 * İKİ KIRILIM, TEK DOSYA DEĞİL: `?kirilim=okul` ile okul kırılımı, verilmezse
 * il kırılımı iner. Yönetim panosu çıktısındaki kararın aynısı — iki farklı
 * satır anlamını (bir satır = bir il / bir satır = bir okul) aynı dosyaya
 * zorlamak, koordinatör sütununu okul satırlarında boş bırakırdı.
 *
 * ÜST SINIR SORULMUYOR: il kırılımı 81 satır, okul kırılımı ise yalnızca
 * öğrencisi ya da danışmanı olan kurumları içeriyor. Kişisel veri sütunu var
 * (koordinatör adı) ama kişi başına satır yok — bu yüzden log tek satır.
 */

const IL_SUTUNLARI: readonly XlsxSutun[] = [
  { baslik: "İl kodu", genislik: 9 },
  { baslik: "İl", genislik: 18 },
  { baslik: "İl koordinatörü", genislik: 24 },
  { baslik: "Branş", genislik: 22 },
  { baslik: "Atama tarihi", genislik: 14 },
  { baslik: "Öğretmen", genislik: 11 },
  { baslik: "Öğrenci", genislik: 10 },
  { baslik: "Atanmamış öğrenci", genislik: 16 },
];

const OKUL_SUTUNLARI: readonly XlsxSutun[] = [
  { baslik: "İl", genislik: 14 },
  { baslik: "İlçe", genislik: 18 },
  { baslik: "Okul", genislik: 40 },
  { baslik: "Kurum kodu", genislik: 12 },
  { baslik: "Danışman sayısı", genislik: 14 },
  { baslik: "Öğrenci sayısı", genislik: 13 },
  { baslik: "İl koordinatörü", genislik: 24 },
];

export async function GET(istek: Request) {
  const kullanici = await oturumKullanicisi();
  if (!kullanici || !rolEnvanteriGorebilirMi(kullanici)) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const adres = new URL(istek.url);
  const okulKirilimi = adres.searchParams.get("kirilim") === "okul";
  const bicim = bicimCoz(adres);

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "GORUNTULEME",
    hedefTip: "ROL",
    hedefId: "envanter",
    detay: `Rol/atama envanteri ${bicim.toUpperCase()} olarak dışa aktarıldı (${
      okulKirilimi ? "okul" : "il"
    } kırılımı)`,
  });

  if (okulKirilimi) {
    const kurumlar = await kurumDanismanDurumlari();

    return disaAktarmaYaniti({
      bicim,
      dosyaAdi: "genctek-rol-envanteri-okul",
      baslik: "GençTek Ekosistemi",
      altBaslik: altBaslikYaz("Rol envanteri · okul kırılımı", kurumlar.length),
      sutunlar: OKUL_SUTUNLARI,
      satirlar: kurumlar.map((kurum) => [
        kurum.ilAdi,
        kurum.ilceAdi,
        kurum.kurumAdi,
        // Kurum kodu kimliktir, sayı değil.
        String(kurum.kurumKodu),
        kurum.danismanSayisi,
        kurum.ogrenciSayisi,
        kurum.ilKoordinatoru
          ? `${kurum.ilKoordinatoru.ad} ${kurum.ilKoordinatoru.soyad}`
          : "",
      ]),
    });
  }

  const iller = await ilKoordinatorDurumlari();

  return disaAktarmaYaniti({
    bicim,
    dosyaAdi: "genctek-rol-envanteri-il",
    baslik: "GençTek Ekosistemi",
    altBaslik: altBaslikYaz("Rol envanteri · il kırılımı", iller.length),
    sutunlar: IL_SUTUNLARI,
    satirlar: iller.map((il) => [
      // İl kodu METİN kalır: "06" baştaki sıfırı korumalı.
      il.ilKodu,
      il.ilAdi,
      /*
       * KOORDİNATÖRSÜZ İL BOŞ HÜCRE DEĞİL, AÇIK METİN. Boş hücre "veri
       * gelmedi" diye de okunabilirdi; oysa bu ekranın asıl bulgusu tam olarak
       * bu satırlar (ekranda da "boş iller" diye ayrı sayılıyor).
       */
      il.koordinator
        ? `${il.koordinator.ad} ${il.koordinator.soyad}`
        : "Koordinatör atanmamış",
      il.koordinator?.brans ?? "",
      il.koordinator?.atamaTarihi ?? null,
      il.ogretmenSayisi,
      il.ogrenciSayisi,
      il.atanmamisOgrenciSayisi,
    ]),
  });
}
