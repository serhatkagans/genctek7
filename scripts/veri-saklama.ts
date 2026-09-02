import "dotenv/config";
import { saklamaSuresiTemizligi } from "../src/lib/kvkk/saklama";

/**
 * Saklama süresi bakımı. VPS'te ayda bir cron ile çalıştırılır:
 *   0 4 1 * *  cd /opt/genctek && npm run bakim:saklama >> /var/log/genctek-saklama.log 2>&1
 *
 * Süresi dolan erişim kayıtlarını ve okunmuş bildirimleri siler; öğrenci,
 * başvuru ve faaliyet verisine dokunmaz.
 */
async function main() {
  const sonuc = await saklamaSuresiTemizligi();
  console.log(
    `[${new Date().toISOString()}] Saklama bakımı: ` +
      `${sonuc.silinenErisimLogu} erişim kaydı (${sonuc.erisimLoguSiniri.toISOString()} öncesi), ` +
      `${sonuc.silinenErisimAnomalisi} erişim anomalisi, ` +
      `${sonuc.silinenBildirim} okunmuş bildirim (${sonuc.bildirimSiniri.toISOString()} öncesi) silindi`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((hata) => {
    console.error("Saklama bakımı başarısız:", hata);
    process.exit(1);
  });
