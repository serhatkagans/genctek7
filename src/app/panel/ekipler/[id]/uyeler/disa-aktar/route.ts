import { oturumKullanicisi } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { EKIP_TURU_ETIKETLERI, buEkibiYonetebilirMi } from "@/lib/ekip/kurallar";
import { adParcasi } from "@/lib/rapor/csv";
import {
  altBaslikYaz,
  bicimCoz,
  disaAktarmaYaniti,
} from "@/lib/rapor/disa-aktarma";
import type { XlsxSutun } from "@/lib/rapor/xlsx";
import { erisimLoglaCoklu } from "@/lib/yetki/log";

export const dynamic = "force-dynamic";

/**
 * TEK EKİBİN ÜYE LİSTESİ (15 Ağustos 2026 · Aşama 5'ten kalan satır bazlı çıktı).
 *
 * Manisa panelinde ekip listesindeki her satırın kendi Excel ikonu var; bu
 * onun karşılığı. Merkezi ekip listesi "hangi ekipler var" sorusunu, bu ise
 * "şu ekipte kimler var" sorusunu cevaplıyor — ikincisi ekip detayına girmeden
 * alınabilmeli, çünkü asıl kullanım yüzlerce ekibin içinden birkaçının üye
 * listesini toplamak.
 *
 * KAPI KAYIT SEVİYESİNDE: `buEkibiYonetebilirMi` — koordinatör yalnızca kendi
 * ilinin ekibini indirir, merkez hepsini. `ekipYonetebilirMi` (rol seviyesi)
 * yetmezdi: o, "bu rol ekip yönetir mi" diyor ve bir koordinatöre başka ilin
 * ekibini açardı.
 */

const SUTUNLAR: readonly XlsxSutun[] = [
  { baslik: "Ad", genislik: 18 },
  { baslik: "Soyad", genislik: 18 },
  { baslik: "Sınıf / branş", genislik: 18 },
  { baslik: "Okul", genislik: 38 },
  { baslik: "İl", genislik: 14 },
  { baslik: "Eklenme tarihi", genislik: 14 },
];

export async function GET(
  istek: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const kullanici = await oturumKullanicisi();
  if (!kullanici) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const { id } = await params;
  const ekipId = Number.parseInt(id, 10);
  if (!Number.isInteger(ekipId)) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const ekip = await prisma.ekip.findUnique({
    where: { id: ekipId },
    select: {
      id: true,
      ad: true,
      tur: true,
      ilKodu: true,
      il: { select: { ad: true } },
      kurum: { select: { ad: true } },
      danisman: { select: { ad: true, soyad: true } },
    },
  });

  // Yetkisizde de "bulunamadı": ekibin varlığı bile sızmamalı.
  if (!ekip || !buEkibiYonetebilirMi(kullanici, ekip.ilKodu)) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const uyeler = await prisma.ekipUyesi.findMany({
    where: { ekipId },
    orderBy: [{ kullanici: { ad: "asc" } }, { kullanici: { soyad: "asc" } }],
    select: {
      eklenmeTarihi: true,
      kullanici: {
        select: {
          id: true,
          ad: true,
          soyad: true,
          sinif: true,
          brans: true,
          kurum: { select: { ad: true } },
          il: { select: { ad: true } },
        },
      },
    },
  });

  const bicim = bicimCoz(new URL(istek.url));

  await erisimLoglaCoklu(
    uyeler.map((uye) => ({
      kullaniciId: kullanici.id,
      islem: "GORUNTULEME" as const,
      hedefTip: "OGRENCI" as const,
      hedefId: uye.kullanici.id,
      detay: `Ekip üye listesi ${bicim.toUpperCase()} olarak dışa aktarıldı: ${ekip.ad}`,
    })),
  );

  const satirlar = uyeler.map((uye) => [
    uye.kullanici.ad,
    uye.kullanici.soyad,
    uye.kullanici.sinif ?? uye.kullanici.brans ?? "",
    uye.kullanici.kurum?.ad ?? "",
    uye.kullanici.il?.ad ?? "",
    uye.eklenmeTarihi,
  ]);

  return disaAktarmaYaniti({
    bicim,
    dosyaAdi: `genctek-ekip-${adParcasi(ekip.ad, String(ekip.id))}`,
    baslik: "GençTek Ekosistemi",
    altBaslik: altBaslikYaz(
      `${ekip.ad} · ${EKIP_TURU_ETIKETLERI[ekip.tur]} · ${
        ekip.kurum?.ad ?? ekip.il?.ad ?? ""
      }${ekip.danisman ? ` · Danışman: ${ekip.danisman.ad} ${ekip.danisman.soyad}` : " · Danışman atanmadı"}`,
      satirlar.length,
    ),
    sutunlar: SUTUNLAR,
    satirlar,
  });
}
