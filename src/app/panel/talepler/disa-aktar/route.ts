import { oturumKullanicisi } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  altBaslikYaz,
  bicimCoz,
  disaAktarmaYaniti,
} from "@/lib/rapor/disa-aktarma";
import type { XlsxSutun } from "@/lib/rapor/xlsx";
import { panoIlaniOnaylayabilirMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";

export const dynamic = "force-dynamic";

/**
 * Pano ilanlarının dosya çıktısı (15 Ağustos 2026 · Aşama 2c'nin kalanı).
 *
 * ============================================================================
 * KAPI EKRANINKİNDEN DAR — VE BU BİLİNÇLİ
 * ============================================================================
 * Panoyu HERKES görüyor (`talepPanosuGorebilirMi` koşulsuz `true`), öğrenciler
 * dahil. Ama "dosya = ekranın kopyası" ilkesi burada olduğu gibi uygulanamaz:
 * ekranda ilanlar sayfalanmış ve süzgeçli akarken, dosya ilan sahiplerinin
 * ad-okul-il bilgisini tek tabloda toplu hâlde dışarı çıkarır. Aynı gerekçeyle
 * etkinlik listesi çıktısı da öğrenciye kapatılmıştı (10 Ağustos 2026).
 *
 * Dosya, panoyu MODERE EDENE veriliyor: `panoIlaniOnaylayabilirMi` — yani
 * onay/ret kararını veren merkez. Listeyi bir dosyada görmesi zaten işinin
 * parçası.
 *
 * KAPATILAN VE SÜRESİ GEÇEN İLANLAR DA DOSYADA: ekran onları gizliyor çünkü
 * pano bir "şu an aktif" görünümü. Dosyanın sorusu ise "panoda ne oldu" ve
 * kapanmış ilanlar o sorunun cevabının parçası; durum sütunu ikisini ayırıyor.
 */

const SUTUNLAR: readonly XlsxSutun[] = [
  { baslik: "Başlık", genislik: 40 },
  { baslik: "Kategori", genislik: 24 },
  { baslik: "Çalışma grubu", genislik: 28 },
  { baslik: "İçerik", genislik: 60 },
  { baslik: "Açan", genislik: 24 },
  { baslik: "Okul", genislik: 34 },
  { baslik: "İl", genislik: 14 },
  { baslik: "Onay durumu", genislik: 16 },
  { baslik: "Ret gerekçesi", genislik: 36 },
  { baslik: "Durum", genislik: 14 },
  { baslik: "Açılış tarihi", genislik: 14 },
  { baslik: "Son geçerlilik", genislik: 14 },
];

const TUR_ETIKETLERI: Record<string, string> = {
  DESTEK: "Teknik destek talebi",
  DUYURU: "Duyuru / tanıtım desteği",
  EKIP_ARKADASI: "Ekip arkadaşı arama",
  MENTOR: "Mentör talebi",
  GENEL: "Genel",
};

const ONAY_ETIKETLERI: Record<string, string> = {
  ONAY_GEREKMEZ: "Onay gerekmez",
  BEKLIYOR: "Onay bekliyor",
  ONAYLANDI: "Onaylandı",
  REDDEDILDI: "Reddedildi",
};

export async function GET(istek: Request) {
  const kullanici = await oturumKullanicisi();
  if (!kullanici || !panoIlaniOnaylayabilirMi(kullanici)) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const ilanlar = await prisma.talep.findMany({
    orderBy: { olusturmaTarihi: "desc" },
    select: {
      id: true,
      tur: true,
      baslik: true,
      icerik: true,
      onayDurumu: true,
      retGerekcesi: true,
      kapatildiMi: true,
      olusturmaTarihi: true,
      sonGecerlilik: true,
      calismaGrubu: { select: { ad: true } },
      acan: {
        select: {
          ad: true,
          soyad: true,
          kurum: { select: { ad: true } },
          il: { select: { ad: true } },
        },
      },
    },
  });

  const bicim = bicimCoz(new URL(istek.url));
  const simdi = new Date();

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "GORUNTULEME",
    hedefTip: "ROL",
    hedefId: "pano",
    detay: `Pano ilanları ${bicim.toUpperCase()} olarak dışa aktarıldı (${ilanlar.length} kayıt)`,
  });

  const satirlar = ilanlar.map((ilan) => [
    ilan.baslik,
    ilan.tur ? (TUR_ETIKETLERI[ilan.tur] ?? ilan.tur) : "Kategorisiz",
    ilan.calismaGrubu?.ad ?? "",
    ilan.icerik,
    `${ilan.acan.ad} ${ilan.acan.soyad}`,
    ilan.acan.kurum?.ad ?? "",
    ilan.acan.il?.ad ?? "",
    ONAY_ETIKETLERI[ilan.onayDurumu] ?? ilan.onayDurumu,
    ilan.retGerekcesi ?? "",
    ilan.kapatildiMi
      ? "Kapatıldı"
      : ilan.sonGecerlilik < simdi
        ? "Süresi geçti"
        : "Açık",
    ilan.olusturmaTarihi,
    ilan.sonGecerlilik,
  ]);

  return disaAktarmaYaniti({
    bicim,
    dosyaAdi: "genctek-pano-ilanlari",
    baslik: "GençTek Ekosistemi",
    altBaslik: altBaslikYaz("Pano ilanları", satirlar.length),
    sutunlar: SUTUNLAR,
    satirlar,
  });
}
