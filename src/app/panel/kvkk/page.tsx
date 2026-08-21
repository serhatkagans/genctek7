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
   * 21 Ağustos 2026: hedef `/panel#kvkk` idi; belge bölümü panelden kalkınca
   * çapa da kalktı (istek: "kvkk olmasın"). Adres yine 404 vermiyor — yer
   * imlerinde ve eski e-postalarda duruyor.
   */
  permanentRedirect("/panel");
}
