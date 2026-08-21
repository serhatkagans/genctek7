import { permanentRedirect } from "next/navigation";

/**
 * ESKİ "KATKI NİŞANLARIM" EKRANI — 21 Ağustos 2026'da GençTek Yolculuğum'a
 * dönüştü (istek: "katkı nişanlarımı gençtek yolculuğum yapalım").
 *
 * Nişanlar kaybolmadı: yeni sayfanın altında, seviye şeridinin ve puan
 * dökümünün ardında duruyorlar. Adres yönlendiriyor çünkü kart bağlantısı ve
 * yer imleri buraya işaret ediyordu.
 */
export default function NisanlarimYonlendirmesi(): never {
  permanentRedirect("/panel/genctek-yolculugum");
}
