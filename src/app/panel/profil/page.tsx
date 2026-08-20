import { permanentRedirect } from "next/navigation";

/**
 * Eski "Profilim" ekranı.
 *
 * PANEL İLE BİRLEŞTİ (20 Ağustos 2026 · istek: "panel ile profil birleşecek
 * tek panel kalacak, düzenleme ve görüntüleme panelden olacak").
 *
 * 7 Ağustos'ta yüzey ikiye bölünmüştü: burası GÖSTERİR, `/panel` DÜZENLER.
 * Bölünmenin bedeli, her bölümün iki yerde durmasıydı — kullanıcı bir kaydı
 * girdikten sonra nasıl göründüğünü görmek için öbür ekrana geçiyor, oradan
 * düzeltmek için geri dönüyordu. İki ekranın kartları da zamanla ayrışmaya
 * açıktı: birine eklenen alan öbüründe sessizce eksik kalıyordu.
 *
 * Ekranın TAMAMI `/panel` içinde: kimlik bilgileri, hakkımda, iletişim,
 * çalışma grupları, kayıtlar, CV, katkı kartı, nişanlar, Rotam ve KVKK
 * onayları. Hiçbir bölüm ve hiçbir yetki kaybolmadı.
 *
 * YOL SİLİNMEDİ, YÖNLENDİRİYOR: adres bildirim e-postalarında, yer imlerinde
 * ve `/panel/profil#kvkk` çapasıyla eski şeritlerde duruyor. Çapa adres
 * satırında kaldığı için `/panel#kvkk` olarak da doğru bölüme iniyor —
 * yönlendirmede çapa yazılmıyor, çünkü tarayıcı gelen çapayı kendisi taşıyor
 * ve buraya çapasız gelen kullanıcıyı KVKK bölümüne atmak yanlış olurdu.
 *
 * FOTOĞRAF ROTASI YERİNDE: `/panel/profil/foto` oturumdaki kişinin kendi
 * fotoğrafını veren rotadır ve panel görseli oradan çekiyor. Bu dosya yalnızca
 * ekranı yönlendiriyor, rotaya dokunmuyor.
 */
export default function ProfilSayfasi(): never {
  permanentRedirect("/panel");
}
