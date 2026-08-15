import { oturumKullanicisi } from "@/lib/auth/oturum";
import {
  AYAR_ANAHTARLARI,
  ayarSayi,
  VARSAYILAN_DISA_AKTARMA_UST_SINIRI,
} from "@/lib/ayar";
import { prisma } from "@/lib/db";
import {
  altBaslikYaz,
  bicimCoz,
  disaAktarmaYaniti,
} from "@/lib/rapor/disa-aktarma";
import type { XlsxSutun } from "@/lib/rapor/xlsx";
import { okulOzetleriniGetir } from "@/lib/rapor/yonetim-ozeti";
import { okulKosulu } from "@/lib/rapor/yonetim-kurallari";
import { yonetimPanosuGorebilirMi } from "@/lib/yetki/izinler";
import type { SorguParametreleri } from "../../ogrenciler/filtreler";
import { listeBasilsinMi, okulSuzgeciniCoz } from "../filtreler";

export const dynamic = "force-dynamic";

/**
 * Okul listesinin dosya çıktısı (15 Ağustos 2026 · Aşama 4e).
 *
 * Kapı ve süzgeç çözümlemesi ekranınkiyle ortak; koordinatörün il kısıtı
 * `okulSuzgeciniCoz` içinde uygulanıyor, yani adres çubuğuna başka il kodu
 * yazarak o ilin dosyası alınamıyor.
 *
 * SÜZGEÇSİZ İNDİRME REDDEDİLİR (`listeBasilsinMi`). Ekran süzgeçsiz açılışta
 * liste basmıyor; rota bassaydı, ekranda gösterilmeyen ülke geneli listesi
 * adres çubuğundan alınabilirdi. Üst sınır zaten çoğu durumda devreye girerdi
 * ama sınır bir performans korkuluğu, kapsam kararı değil — ikisi ayrı ayrı
 * söylenmeli.
 *
 * ERİŞİM KAYDI YAZILMIYOR: dosyada kişisel veri yok, okul başına sayı var
 * (yönetim panosu çıktısıyla aynı gerekçe).
 */

const SUTUNLAR: readonly XlsxSutun[] = [
  { baslik: "İl", genislik: 14 },
  { baslik: "İlçe", genislik: 18 },
  { baslik: "Okul", genislik: 42 },
  { baslik: "Okul türü", genislik: 28 },
  { baslik: "Kurum kodu", genislik: 12 },
  { baslik: "Öğretmen", genislik: 11 },
  { baslik: "Danışman öğretmen", genislik: 16 },
  { baslik: "Öğrenci", genislik: 10 },
  { baslik: "Danışmansız öğrenci", genislik: 17 },
  { baslik: "Okul takımı sayısı", genislik: 16 },
];

export async function GET(istek: Request) {
  const kullanici = await oturumKullanicisi();
  if (!kullanici || !yonetimPanosuGorebilirMi(kullanici)) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const adres = new URL(istek.url);
  const parametreler: SorguParametreleri = Object.fromEntries(
    adres.searchParams.entries(),
  );
  const suzgec = okulSuzgeciniCoz(kullanici, parametreler);

  if (!listeBasilsinMi(suzgec)) {
    return new Response(
      "Önce bir il seçin ya da arama yapın; ülke genelindeki okulların tamamı tek dosyada indirilemez.",
      { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const [toplam, ustSinir] = await Promise.all([
    prisma.kurum.count({ where: okulKosulu(suzgec) }),
    ayarSayi(
      AYAR_ANAHTARLARI.DISA_AKTARMA_UST_SINIRI,
      VARSAYILAN_DISA_AKTARMA_UST_SINIRI,
    ),
  ]);

  if (toplam > ustSinir) {
    return new Response(
      `Bu süzgeçlerle ${toplam} okul var; tek dosyada en fazla ${ustSinir} kayıt indirilebilir. ` +
        "Lütfen ilçe veya okul türü süzgeciyle daraltın.",
      { status: 413, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  // Dosya ekranın sayfasını değil kümenin tamamını taşır.
  const okullar = await okulOzetleriniGetir(suzgec);

  const satirlar = okullar.map((okul) => [
    okul.ilAdi,
    okul.ilceAdi,
    okul.ad,
    okul.okulTuru,
    // Kurum kodu kimliktir, sayı değil.
    String(okul.kurumKodu),
    okul.ogretmenSayisi,
    okul.danismanOgretmenSayisi,
    okul.ogrenciSayisi,
    okul.danismansizOgrenciSayisi,
    okul.ekipSayisi,
  ]);

  return disaAktarmaYaniti({
    bicim: bicimCoz(adres),
    dosyaAdi: "genctek-okullar",
    baslik: "GençTek Ekosistemi",
    altBaslik: altBaslikYaz("Okul listesi", satirlar.length),
    sutunlar: SUTUNLAR,
    satirlar,
  });
}
