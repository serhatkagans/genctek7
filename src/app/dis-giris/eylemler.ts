"use server";

import { redirect } from "next/navigation";
import { disGirisYap } from "@/lib/dis-kimlik/giris";
import { mockDisGirisYap } from "@/lib/dis-kimlik/mock-giris";

/**
 * EBA dışı giriş eylemi.
 *
 * Şifre HİÇBİR KOŞULDA adres çubuğuna yazılmaz: hata durumunda yalnızca mesaj
 * ve e-posta geri taşınır. Adres çubuğuna düşen bir şifre tarayıcı geçmişinde,
 * ters vekil günlüğünde ve gönderilen bağlantıda kalıcı olur.
 */
export async function disGirisEylemi(veri: FormData): Promise<void> {
  const eposta = String(veri.get("eposta") ?? "");
  const sifre = String(veri.get("sifre") ?? "");

  const sonuc = await disGirisYap(eposta, sifre);

  if (sonuc.durum === "BASARISIZ") {
    redirect(
      `/dis-giris?hata=${encodeURIComponent(sonuc.mesaj)}&eposta=${encodeURIComponent(eposta)}`,
    );
  }

  /*
   * Dış kullanıcı panele girer; belge kapısı (app/onay) ilk girişte oraya
   * yönlendirir. "İlk girişte profil" kuralı ÖĞRENCİYE aittir ve buraya
   * uygulanmaz: mezunun/paydaşın profilinde doldurulacak alan yok.
   */
  /*
   * Profile düşer, panele değil (7 Ağustos 2026): mezun, paydaş ve mentör de
   * "tüm kullanıcı grupları" içinde. EBA girişiyle aynı yere varmalı — aynı
   * kişi hangi kapıdan girdiğine göre farklı ekran görmemeli.
   */
  redirect("/panel");
}

/**
 * Geliştirme kipi: listeden kimlik seçerek giriş.
 *
 * Yetki kontrolü BURADA DEĞİL `mockDisGirisYap` içinde: sunucu eylemi bir
 * uç noktadır ve ekranı gizlemek onu kapatmaz. Üretimde (AUTH_PROVIDER="eba")
 * çağrı reddedilir ve kullanıcı şifreli girişe geri döner.
 */
export async function mockDisGirisEylemi(veri: FormData): Promise<void> {
  const kimlik = String(veri.get("kimlikBilgisi") ?? "");
  const sonuc = await mockDisGirisYap(kimlik);

  if (sonuc.durum === "BASARISIZ") {
    redirect(`/dis-giris?hata=${encodeURIComponent(sonuc.mesaj)}`);
  }

  // Şifreli girişle aynı yere düşer: aynı kişi hangi kapıdan girdiğine göre
  // farklı ekran görmemeli (7 Ağustos 2026).
  redirect("/panel");
}
