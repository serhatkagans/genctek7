import "dotenv/config";
import { saklamaSuresiTemizligi } from "../src/lib/kvkk/saklama";

/**
 * Saklama süresi bakımı. VPS'te ayda bir cron ile çalıştırılır:
 *   0 4 1 * *  cd /opt/genctek && npm run bakim:saklama >> /var/log/genctek-saklama.log 2>&1
 *
 * Süresi dolan erişim kayıtlarını ve okunmuş bildirimleri siler; moderasyonla
 * gizlenmiş içeriği ve uzun süredir temas etmemiş kişilerin kişisel verisini
 * imha eder. Faaliyet ve başvuru SATIRLARI kalır, içlerindeki kişisel veri
 * gider (bkz. src/lib/kvkk/imha.ts).
 *
 * ÇIKTI DENETİM KAYDIDIR: KVKK envanteri "hangi ay ne imha edildi" diye
 * sorulduğunda cevabı bu günlük verir. Bu yüzden sayılar tek tek yazılıyor,
 * "tamamlandı" denip geçilmiyor.
 */
async function main() {
  const sonuc = await saklamaSuresiTemizligi();
  const damga = `[${new Date().toISOString()}]`;
  const gizli = sonuc.gizliIcerik;
  const gizliToplam =
    gizli.mesaj +
    gizli.gonderi +
    gizli.gonderiYorumu +
    gizli.ekipMesaji +
    gizli.talepCevabi +
    gizli.yorum +
    gizli.faaliyetEki;

  console.log(
    `${damga} Saklama bakımı: ` +
      `${sonuc.silinenErisimLogu} erişim kaydı (${sonuc.erisimLoguSiniri.toISOString()} öncesi), ` +
      `${sonuc.silinenErisimAnomalisi} erişim anomalisi, ` +
      `${sonuc.silinenBildirim} okunmuş bildirim (${sonuc.bildirimSiniri.toISOString()} öncesi) silindi`,
  );
  console.log(
    `${damga} İmha · gizlenmiş içerik (${sonuc.gizliIcerikSiniri.toISOString()} öncesi): ` +
      `${gizliToplam} kayıt — ${gizli.mesaj} mesaj, ${gizli.gonderi} gönderi, ` +
      `${gizli.gonderiYorumu} gönderi yorumu, ${gizli.ekipMesaji} ekip mesajı, ` +
      `${gizli.talepCevabi} ilan cevabı, ${gizli.yorum} yorum, ` +
      `${gizli.faaliyetEki} faaliyet eki`,
  );
  console.log(
    `${damga} İmha · hareketsiz kullanıcı (${sonuc.hareketsizKullaniciSiniri.toISOString()} öncesi): ` +
      `${sonuc.hareketsizKullanici.imhaEdilenKullanici} kişi anonim hâle getirildi, ` +
      `${sonuc.hareketsizKullanici.imhaEdilenIcerik} içerik imha edildi`,
  );

  const silinemeyen =
    gizli.silinemeyenDosya + sonuc.hareketsizKullanici.silinemeyenDosya;
  if (silinemeyen > 0) {
    // Kayıt tarafı tamamlandı ama diskte okunabilir kopya kaldı: imha eksik
    // sayılır ve elle temizlenmesi gerekir. Sessiz geçilemez.
    console.error(
      `${damga} UYARI: ${silinemeyen} dosya depolamadan silinemedi; ` +
        `yukarıdaki hata satırlarına bakın ve dosyaları elle kaldırın.`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((hata) => {
    console.error("Saklama bakımı başarısız:", hata);
    process.exit(1);
  });
