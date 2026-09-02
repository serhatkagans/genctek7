import { permanentRedirect } from "next/navigation";

/**
 * Eski "KVKK ve Belgelerim" ekranı.
 *
 * Belge akışı 5 Ağustos 2026'da menüden kaldırıldı ve profilin en altına
 * taşındı (istek: "KVKK metni üye olunurken görülsün sadece. Menüden
 * kaldırılacak."). Profil 20 Ağustos'ta panelle birleşince bölüm Panel'in en
 * altına indi ve hedef `/panel#kvkk` oldu. İçerik aynı: yürürlükteki metinler,
 * onay tarihleri ve metni güncellenen belgeler için yeniden onay.
 *
 * BU YOL SİLİNMEDİ. Adres bildirim e-postalarında ve kullanıcıların yer
 * imlerinde duruyor; buraya gelen kişiye 404 göstermek, onayladığı belgeyi
 * kaybettiğini düşündürürdü — oysa KVKK açısından belgeye erişebilmesi
 * gereken tam da bu kişi.
 */
export default function KvkkSayfasi(): never {
  /*
   * HEDEF ÜÇÜNCÜ KEZ DEĞİŞTİ: `/panel#kvkk` → `/panel` → `/panel/kisisel-verilerim`.
   *
   * 21 Ağustos 2026'da belge bölümü panelden kalkınca çapa da kalkmıştı ve
   * adres panelin kendisine düşüyordu — gelen kişi aradığı metinleri hiçbir
   * yerde bulamıyordu. 2 Eylül 2026'da (Genelge 4/ç) açılan Kişisel Verilerim
   * ekranı yürürlükteki metinleri katlı hâlde taşıyor; bu adresi bekleyen kişi
   * tam olarak oraya gitmeli.
   *
   * YÖNLENDİRME KALICI VE SAYFA SİLİNMEDİ: adres bildirim e-postalarında ve
   * yer imlerinde duruyor.
   */
  permanentRedirect("/panel/kisisel-verilerim");
}
