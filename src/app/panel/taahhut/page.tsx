import { permanentRedirect } from "next/navigation";

/**
 * Eski taahhütname ekranı.
 *
 * Belge sayısı ikiden dörde çıkınca her belgeye ayrı ekran açmak yerine hepsi
 * tek yerde toplandı; 5 Ağustos 2026'da o yer profilin en altı, 20 Ağustos'ta
 * profil panelle birleşince de Panel'in en altı oldu. Bu yol SİLİNMEDİ, çünkü
 * şeritlerde ve yer imlerinde duruyor; buraya gelen kişiye 404 göstermek,
 * onaylayacağı belgeyi kaybettiğini düşündürürdü.
 *
 * Hedef doğrudan Panel'deki bölümdür, /panel/kvkk DEĞİL: iki yönlendirmeyi
 * zincirlemek tarayıcıyı gereksiz bir tur attırırdı.
 */
export default function TaahhutSayfasi(): never {
  permanentRedirect("/panel#kvkk");
}
