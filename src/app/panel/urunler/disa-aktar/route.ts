import { oturumKullanicisi } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  altBaslikYaz,
  bicimCoz,
  disaAktarmaYaniti,
} from "@/lib/rapor/disa-aktarma";
import type { XlsxSutun } from "@/lib/rapor/xlsx";
import { projeYoneticisiMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";

export const dynamic = "force-dynamic";

/**
 * Market ürünlerinin dosya çıktısı (15 Ağustos 2026 · Aşama 2c'nin kalanı).
 *
 * ============================================================================
 * YALNIZCA PAYLAŞILAN ÜRÜNLER, YALNIZCA MERKEZE
 * ============================================================================
 * Market ekranı iki kümeyi birden gösteriyor: markette paylaşılanlar + KİŞİNİN
 * KENDİ ürünleri (paylaşılmamış olanlar dahil). Dosyaya yalnızca
 * `markettePaylasilsin` olanlar giriyor — paylaşılmamış ürün, sahibinin
 * kendine sakladığı kayıttır ve toplu bir dosyada başkasının eline geçmesi
 * ekranın vaadini bozardı.
 *
 * Kapı merkez: markete bakan ve "hangi ürünler çıktı" sorusunu soran taraf o.
 * Öğrenci ve öğretmen kendi ürününü zaten profilinde görüyor.
 */

const SUTUNLAR: readonly XlsxSutun[] = [
  { baslik: "Başlık", genislik: 40 },
  { baslik: "Açıklama", genislik: 60 },
  { baslik: "Geliştiren ekip", genislik: 30 },
  { baslik: "Sahibi", genislik: 24 },
  { baslik: "İl", genislik: 14 },
  { baslik: "Okul", genislik: 34 },
  { baslik: "Ürün tarihi", genislik: 14 },
  { baslik: "Eklenme tarihi", genislik: 14 },
  { baslik: "Görüntülenme", genislik: 13 },
  { baslik: "Bağlantı tıklaması", genislik: 16 },
  { baslik: "Ek sayısı", genislik: 11 },
  { baslik: "Bağlantı sayısı", genislik: 13 },
];

export async function GET(istek: Request) {
  const kullanici = await oturumKullanicisi();
  if (!kullanici || !projeYoneticisiMi(kullanici)) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const urunler = await prisma.kullaniciKazanim.findMany({
    where: { tip: "URUN", markettePaylasilsin: true },
    orderBy: { olusturmaTarihi: "desc" },
    select: {
      baslik: true,
      aciklama: true,
      gelistirenEkip: true,
      tarih: true,
      olusturmaTarihi: true,
      goruntulenmeSayisi: true,
      baglantiTiklamasi: true,
      kullanici: {
        select: {
          ad: true,
          soyad: true,
          il: { select: { ad: true } },
          kurum: { select: { ad: true } },
        },
      },
      _count: { select: { ekler: true, baglantilar: true } },
    },
  });

  const bicim = bicimCoz(new URL(istek.url));

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "GORUNTULEME",
    hedefTip: "ROL",
    hedefId: "market",
    detay: `Market ürünleri ${bicim.toUpperCase()} olarak dışa aktarıldı (${urunler.length} kayıt)`,
  });

  const satirlar = urunler.map((urun) => [
    urun.baslik,
    urun.aciklama ?? "",
    urun.gelistirenEkip ?? "",
    `${urun.kullanici.ad} ${urun.kullanici.soyad}`,
    urun.kullanici.il?.ad ?? "",
    urun.kullanici.kurum?.ad ?? "",
    urun.tarih,
    urun.olusturmaTarihi,
    urun.goruntulenmeSayisi,
    urun.baglantiTiklamasi,
    urun._count.ekler,
    urun._count.baglantilar,
  ]);

  return disaAktarmaYaniti({
    bicim,
    dosyaAdi: "genctek-market-urunleri",
    baslik: "GençTek Ekosistemi",
    altBaslik: altBaslikYaz("Markette paylaşılan ürünler", satirlar.length),
    sutunlar: SUTUNLAR,
    satirlar,
  });
}
