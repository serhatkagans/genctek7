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
 * `null` dönerse şerit basılmaz. İki hâlde döner: (1) panoyu açamayan kullanıcı
 * (danışman öğretmen) için "Yönetim Paneli" bir yol değil, kapalı bir kapıdır —
 * onun listesine girişi Panel'deki "Öğrencilerim" kartı (13 Ağustos 2026'dan
 * beri menüde sekme değil, bkz. app/panel/layout.tsx); (2) arada il/ilçe/okul
 * basamağı yoksa şerit başlığın söylediğini tekrar ederdi (aşağıya bakın).
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
   * ŞERİT YALNIZCA KIRILIMDAN GELİNDİĞİNDE (27 Ağustos 2026 · istek: "üstte
   * iki tane navigasyon var, üsttekini kaldır").
   *
   * Süzgeçsiz listede şeridin basacağı tek şey "Yönetim Paneli › Öğretmenler"
   * idi; hemen altında başlığın geri bağlantısı "Yönetim Paneli", başlığın
   * kendisi "Öğretmenler" — aynı iki kelime üst üste iki kez. Şerit ancak
   * arada bir il/ilçe/okul basamağı varsa yeni bir şey söylüyor; 12
   * Ağustos'taki istek de zaten oydu (ilçe kırılımından gelince dönüş yolu
   * kalmıyordu), o hâlde şerit yerinde duruyor.
   */
  if (!gosterilecekYer.il && !gosterilecekYer.ilce && !gosterilecekYer.okul) {
    return null;
  }

  return yonetimYolIzi(sonAdim, gosterilecekYer);
}
