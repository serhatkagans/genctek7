import { oturumKullanicisi } from "@/lib/auth/oturum";
import {
  AYAR_ANAHTARLARI,
  ayarSayi,
  VARSAYILAN_DISA_AKTARMA_UST_SINIRI,
} from "@/lib/ayar";
import {
  altBaslikYaz,
  bicimCoz,
  disaAktarmaYaniti,
} from "@/lib/rapor/disa-aktarma";
import { KIRILIM_ETIKETLERI } from "@/lib/rapor/okul-eksikleri";
import {
  eksikOkullar,
  eksikSayimlari,
} from "@/lib/rapor/okul-eksikleri-ozeti";
import type { XlsxSutun } from "@/lib/rapor/xlsx";
import { yonetimPanosuGorebilirMi } from "@/lib/yetki/izinler";
import type { SorguParametreleri } from "../../ogrenciler/filtreler";
import { eksikSuzgeciniCoz, kirilimCoz } from "../filtreler";

export const dynamic = "force-dynamic";

/**
 * Okul eksik durum analizinin dosya çıktısı (15 Ağustos 2026 · Aşama 3c).
 *
 * Kapı ekranınkiyle aynı (`yonetimPanosuGorebilirMi`) ve süzgeç çözümlemesi de
 * ortak — koordinatörün il kısıtı orada uygulanıyor, yani adres çubuğuna başka
 * il kodu yazarak o ilin dosyasını almak mümkün değil.
 *
 * DOSYA AÇIK SEKMENİN LİSTESİ, dört kırılımın tamamı değil. Dördü tek dosyaya
 * konsaydı satırlar tekrarlanırdı: "öğrenci var, temsilci yok" listesindeki her
 * okul "temsilci yok" listesinde de var ve toplamı alan kişi eksiği iki kez
 * sayardı. Kırılım dosya adında ve alt başlıkta yazılı.
 *
 * ERİŞİM KAYDI YAZILMIYOR: dosyada kişisel veri yok, okul başına sayı var —
 * yönetim panosu çıktısıyla aynı gerekçe (bkz. yonetim/disa-aktar).
 */

const SUTUNLAR: readonly XlsxSutun[] = [
  { baslik: "İl", genislik: 14 },
  { baslik: "İlçe", genislik: 18 },
  { baslik: "Okul", genislik: 42 },
  { baslik: "Okul türü", genislik: 28 },
  { baslik: "Kurum kodu", genislik: 12 },
  { baslik: "Öğrenci sayısı", genislik: 13 },
  { baslik: "Danışman sayısı", genislik: 14 },
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
  const suzgec = eksikSuzgeciniCoz(kullanici, parametreler);
  const kirilim = kirilimCoz(parametreler);

  const [sayimlar, ustSinir] = await Promise.all([
    eksikSayimlari(suzgec),
    ayarSayi(
      AYAR_ANAHTARLARI.DISA_AKTARMA_UST_SINIRI,
      VARSAYILAN_DISA_AKTARMA_UST_SINIRI,
    ),
  ]);
  const toplam = sayimlar[kirilim];

  if (toplam > ustSinir) {
    return new Response(
      `Bu süzgeçlerle ${toplam} okul var; tek dosyada en fazla ${ustSinir} kayıt indirilebilir. ` +
        "Lütfen il, ilçe veya okul türü süzgeciyle daraltın.",
      { status: 413, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  /*
   * Dosya EKRANIN SAYFASINI DEĞİL kümenin tamamını taşır: ekran 50'şer okul
   * gösteriyor, dosya ise görev listesinin kendisi. Sayfa taşınsaydı indirilen
   * dosya sessizce ilk 50 satırdan ibaret kalırdı.
   */
  const okullar = await eksikOkullar(kirilim, suzgec, 1, toplam || 1);

  const satirlar = okullar.map((okul) => [
    okul.ilAdi,
    okul.ilceAdi,
    okul.ad,
    okul.okulTuru,
    // Kurum kodu kimliktir, sayı değil — Excel onu hesaplanabilir yapmamalı.
    String(okul.kurumKodu),
    okul.ogrenciSayisi,
    okul.ogretmenSayisi,
  ]);

  return disaAktarmaYaniti({
    bicim: bicimCoz(adres),
    dosyaAdi: `genctek-okul-eksik-${kirilim}`,
    baslik: "GençTek Ekosistemi",
    altBaslik: altBaslikYaz(
      `${KIRILIM_ETIKETLERI[kirilim]} · ${suzgec.egitimOgretimYili} dönemi`,
      satirlar.length,
    ),
    sutunlar: SUTUNLAR,
    satirlar,
  });
}
