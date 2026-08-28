/**
 * Ürünün VİTRİN KAPAĞI — hangi ekin kart görseli olduğu (28 Ağustos 2026 ·
 * istek: "vitrine ürün eklerken bir tane ürün görseli ekleyebilelim").
 *
 * Saf: veritabanı, oturum ya da Next.js bilmez. Ekranlar ve sunucu eylemleri
 * yalnızca buradaki kararı uygular — vitrin kartı, ürün detayı ve profil aynı
 * kapağı göstermeli, üç ekranda üç ayrı "ilk görseli al" satırı yazılsaydı
 * ilkini değiştiren diğer ikisini unuturdu.
 */

/** Kapak seçimi için gereken en dar ek görünümü. */
export interface KapakAdayi {
  id: number;
  mimeTipi: string;
  kapakMi: boolean;
}

/** Ek görsel mi? Kapak yalnızca görsel olabilir; pdf kapak kırık kart demek. */
export function gorselMi(mimeTipi: string): boolean {
  return mimeTipi.startsWith("image/");
}

/**
 * Kartta gösterilecek kapağı seçer.
 *
 * SIRA: sahibinin işaretlediği ek → yoksa EN ESKİ görsel ek → yoksa kapak yok.
 *
 * İkinci basamak geriye dönük uyum içindir: `kapak_mi` sütunu açılmadan önce
 * girilmiş ürünlerin görselleri var ve hepsini kapaksız bırakmak, elde duran
 * veriyi görmezden gelmek olurdu. Sahibi kapağını seçtiği anda birinci basamak
 * devreye girer ve gösterim onun tercihine döner.
 *
 * "En eski" = en küçük kimlik. `yuklenmeTarihi` yerine kimlik kullanılıyor:
 * aynı formdan gelen dosyalar aynı saniyede yazılıyor ve tarih onları
 * ayırmıyor; kimlik yükleme sırasını her zaman koruyor.
 */
export function kapakEkiSec<T extends KapakAdayi>(ekler: readonly T[]): T | null {
  const isaretli = ekler.find((ek) => ek.kapakMi && gorselMi(ek.mimeTipi));
  if (isaretli) return isaretli;

  const gorseller = ekler.filter((ek) => gorselMi(ek.mimeTipi));
  if (gorseller.length === 0) return null;

  return gorseller.reduce((enEski, ek) => (ek.id < enEski.id ? ek : enEski));
}
