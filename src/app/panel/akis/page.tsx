import { permanentRedirect } from "next/navigation";

/**
 * ESKİ AKIŞ EKRANI — 21 Ağustos 2026'da kaldırıldı.
 *
 * İstek: "Akış · Kendini tanıt, çalışmanı paylaş · 2 gönderi — akışı da
 * kaldır." Bölüm 12 Ağustos'ta ayrı sekme, 14 Ağustos'ta Bağlantılarım'ın
 * içinde bir bölümdü; şimdi bölüm de (`AkisBolumu.tsx`) eylemleri de
 * (`eylemler.ts`) silindi.
 *
 * ADRES SİLİNMEDİ, YÖNLENDİRİYOR: `/panel/akis` bildirimlerde, yer imlerinde
 * ve eski gönderi bağlantılarında geçiyordu; 404 yerine Bağlantılarım'a
 * düşüyor. Emsali `/panel/baglantilar`.
 *
 * VERİ DURUYOR: `gonderi` ve `yorum` tabloları ile kişilerin "Hakkımda"
 * metinleri yerinde. Metni düzenleyen eylem, onu basan tek ekranın (Panel'deki
 * "Hakkımda" kartı) yanına taşındı: `profil/hakkinda-eylemi.ts`.
 */
export default function AkisYonlendirmesi(): never {
  permanentRedirect("/panel/yazismalar");
}
