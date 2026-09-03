"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { disGirisYap } from "@/lib/dis-kimlik/giris";
import { mockDisGirisYap } from "@/lib/dis-kimlik/mock-giris";
import { basliklardanAnahtar, hizSiniriOlustur } from "@/lib/hiz-siniri";
import { ortam } from "@/lib/ortam";

/**
 * GİRİŞ HIZ SINIRI (3 Eylül 2026 · güvenlik incelemesi).
 *
 * HESAP KİLİDİ BU BOŞLUĞU KAPATMIYOR. `dis_kimlik` satırında sayaç var
 * (kurallar.ts · BASARISIZ_DENEME_SINIRI = 5, 15 dakika kilit) ve tek bir
 * hesaba yüklenmeyi durduruyor. Durduramadığı ŞİFRE PÜSKÜRTMESİ: tek bir
 * yaygın şifreyi N farklı hesapta denemek. Her hesap yalnızca bir başarısız
 * deneme görür, hiçbiri kilitlenmez, sayaçların hepsi sıfıra yakın kalır.
 * Hesap başına sayaç bunu tanımlayamaz; IP başına sayaç tanımlar.
 *
 * İKİNCİ SEBEP KAYNAK: her deneme scrypt çalıştırıyor (N=16384, 64 MB,
 * ~100 ms · dis-kimlik/sifre.ts). Kilitli hesapta bu maliyet ödenmiyor —
 * kilit kontrolü `sifreDogrula`'dan önce (giris.ts) — ama kilitlenmeyen
 * hesaplarda sınırsız tekrarlanabiliyordu. Sıfırlama ucu tam bu gerekçeyle
 * sertleştirilmişti (kurallar.ts · SIFIRLAMA_BEKLEME_DAKIKA); giriş ucu
 * o düzeltmenin dışında kalmıştı.
 *
 * BAŞARILI DENEMELER DE SAYILIR. Yalnızca başarısızları saymak daha keskin
 * olurdu ama sınırın kendisi denemeden ÖNCE uygulanmalı, yoksa scrypt zaten
 * çalışmış olur. Sayı bu yüzden bol tutuldu: bu kapıdan giren kitle dış
 * kullanıcılar (mezun, paydaş, mentör) ve çoğu kendi bağlantısından geliyor —
 * `basvuru`daki kurumsal NAT endişesi burada aynı ağırlıkta değil.
 *
 * SAYI KOPYA BAŞINADIR. Uygulama üç kopya çalışıyor ve Apache aralarında
 * yapışkan oturum olmadan dağıtıyor, yani sayaç üçe bölünmüş durumda ve etkin
 * sınır yazılanın üç katı (bkz. hiz-siniri.ts başlığı · DAGITIM.md Bölüm 13).
 * Hedef 10 dakikada ~20 deneme olduğu için buraya 7 yazıldı: 7 x 3 = 21.
 * Kopya sayısı değişirse bu değer de değişmeli.
 */
const PENCERE_DAKIKA = 10;
const KOPYA_BASINA_DENEME = 7;

const girisSiniri = hizSiniriOlustur({
  pencereMs: PENCERE_DAKIKA * 60_000,
  sinir: KOPYA_BASINA_DENEME,
});

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

  /*
   * Sınır `disGirisYap`'tan ÖNCE: pahalı olan iş orada (veritabanı sorgusu ve
   * scrypt). İçeriye konsaydı kontrol, korumaya çalıştığı maliyet zaten
   * ödendikten sonra çalışırdı.
   *
   * Mesaj kaç deneme kaldığını SÖYLEMEZ ve "hesap kilitli" mesajından ayrıdır:
   * ikisi farklı şeyler — biri bu adresten gelen trafiği, diğeri belirli bir
   * hesabı anlatıyor. Sınır mesajı, denenen adresin kayıtlı olup olmadığı
   * hakkında hiçbir şey söylemiyor.
   */
  if (
    girisSiniri.takildiMi(
      basliklardanAnahtar(await headers(), ortam.GUVENILEN_VEKIL_SAYISI),
    )
  ) {
    redirect(
      `/dis-giris?hata=${encodeURIComponent(
        `Kısa sürede çok fazla giriş denemesi yapıldı. ${PENCERE_DAKIKA} dakika sonra tekrar deneyin.`,
      )}&eposta=${encodeURIComponent(eposta)}`,
    );
  }

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
