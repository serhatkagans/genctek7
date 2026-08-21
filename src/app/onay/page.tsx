import { permanentRedirect } from "next/navigation";

/**
 * ESKİ İLK GİRİŞ ONAY KAPISI — 21 Ağustos 2026'da kapandı.
 *
 * İstek: "KVKK'lar panelden kalkacak, açılışta çerez politikası ile ilgili
 * popup gelecek bir kerelik, sonra bir daha okuma yok, kvkk olmasın."
 *
 * Ekran, sisteme ilk giren kişiye belgeleri okutup onay alıyordu; panel düzeni
 * onayı olmayanı buraya yönlendiriyordu (bkz. panel/layout.tsx). O yönlendirme
 * kalktı, geriye yalnızca bu adres kaldı ve panele düşüyor — eski bağlantıyla
 * gelen kişi 404 görmesin diye.
 *
 * BİRLİKTE ÇALIŞAN PARÇALAR YERİNDE: onay eylemleri (`./eylemler.ts`), belge
 * metinleri ve kuralları (`lib/kvkk/*`) ile verilmiş onayların kaydı
 * (`kullanici_onayi`) duruyor. Belge onayı yeniden istenirse geri açılacak yer
 * burasıdır; ekran kararıyla hukuki kayıt silinmez.
 *
 * Yerine geçen yüzey: uygulamanın açılışında bir kez çıkan çerez bildirimi
 * (components/CerezBildirimi.tsx).
 */
export default function IlkGirisOnaySayfasi(): never {
  permanentRedirect("/panel");
}
