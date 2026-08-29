import {
  type YonetimAdimi,
  yonetimYolIzi,
} from "@/lib/rapor/yonetim-kurallari";
import { yonetimYeriniGetir } from "@/lib/rapor/yonetim-ozeti";
import {
  yonetimPanosuGorebilirMi,
  yonetimPanosuIlErisimi,
} from "@/lib/yetki/izinler";
import type { OturumKullanicisi } from "@/lib/yetki/tipler";

/**
 * Öğrenci ve öğretmen envanterlerinin yol izi.
 *
 * İKİ EKRAN AYNI ŞERİDİ KULLANIR: listeler ayrı ama panodaki yerleri aynı ve
 * ikisine de aynı kartlardan giriliyor. Ayrı yazılsalardı biri düzeltildiğinde
 * öbürü eski hâlinde kalırdı — 12 Ağustos'taki şikâyet de tam olarak bir
 * ekrandaki şeridin öbüründe olmamasıydı.
 *
 * `null` YALNIZCA panoyu açamayan kullanıcıda döner: danışman öğretmen için
 * "Yönetim Paneli" bir yol değil, kapalı bir kapıdır — onun listesine girişi
 * Panel'deki "Öğrencilerim" kartı (13 Ağustos 2026'dan beri menüde sekme değil,
 * bkz. app/panel/layout.tsx). O kullanıcıda başlığın geri bağlantısı Panel'i
 * gösterir; şerit basılmaz.
 */
export async function envanterYolIzi(
  kullanici: OturumKullanicisi,
  sonAdim: string,
  filtreler: {
    ilKodu?: string | null;
    ilceKodu?: string | null;
    kurumKodu?: number | null;
  },
): Promise<YonetimAdimi[] | null> {
  if (!yonetimPanosuGorebilirMi(kullanici)) return null;

  const yer = await yonetimYeriniGetir(filtreler);

  /*
   * KAPSAM DIŞI İLİN BASAMAĞI YAZILMAZ. Süzgeçler yalnızca daraltır, yani
   * adres çubuğuna başka ilin kodu yazılabiliyor (liste boş döner). Şerit o
   * ilin adını basmış olsaydı hem kapsam dışı bir il adı sızardı hem de
   * açılamayan bir ekrana bağlantı verilmiş olurdu. Basamak düşünce şerit de
   * düşer (aşağıdaki kurala göre); panoya dönüş yolu başlığın geri
   * bağlantısında zaten duruyor.
   */
  const erisilir = yer.il
    ? yonetimPanosuIlErisimi(kullanici, yer.il.ilKodu)
    : true;
  const gosterilecekYer = erisilir ? yer : {};

  /*
   * ŞERİT DÜZ LİSTEDE DE BASILIR (29 Ağustos 2026 · istek: "yönetim
   * panelindeki tüm kartlara uygula").
   *
   * 27 Ağustos'ta buradan `null` dönüyordu: süzgeçsiz listede şerit yalnızca
   * "Yönetim Paneli › Öğretmenler" diyordu ve hemen altındaki başlığın geri
   * bağlantısı da "Yönetim Paneli" olduğu için aynı iki kelime üst üste iki
   * kez basılıyordu ("üstte iki tane navigasyon var, üsttekini kaldır").
   * TEKRARIN KAYNAĞI GERİ BAĞLANTISIYDI ve o kalktı — panodan açılan her ekran
   * gibi bu ikisi de yolunu yalnızca şeritte gösteriyor. Kırılımdan gelindiğinde
   * arada il/ilçe/okul basamakları da duruyor, yani şerit iki durumu tek
   * biçimde anlatıyor.
   */

  return yonetimYolIzi(sonAdim, gosterilecekYer);
}
