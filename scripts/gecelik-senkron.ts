import "dotenv/config";
import { erisimAnomalileriniIzle } from "../src/lib/guvenlik/erisim-anomali";
import { hizSiniriTemizligi } from "../src/lib/guvenlik/hiz-siniri-bakim";
import { gecelikSenkronCalistir } from "../src/lib/kullanici/senkron";

/**
 * Gecelik bakım işi. VPS'te systemd timer ile çalıştırılır: danışman
 * senkronundan sonra tamamlanmış önceki günün erişim anomalilerini de tarar.
 *
 * Eski cron kurulumu için eşdeğer çağrı:
 *   0 3 * * *  cd /opt/genctek && npm run senkron:danisman >> /var/log/genctek-senkron.log 2>&1
 */
async function main() {
  const baslangic = Date.now();
  const sonuc = await gecelikSenkronCalistir();
  const anomali = await erisimAnomalileriniIzle();
  /*
   * Hız sınırı satırları burada süpürülüyor, ayrı bir timer açılmadı: iş zaten
   * her gece çalışıyor ve temizlik tek bir DELETE. Sayaç bu koşu hiç
   * çalışmasa da doğru işler (penceresi geçmiş satır ilk istekte sıfırlanır);
   * mesele yalnızca tablonun sınırsız büyümemesi.
   */
  const hizSiniri = await hizSiniriTemizligi();
  console.log(
    `[${new Date().toISOString()}] Gecelik senkron: ${sonuc.kontrolEdilen} danışman kontrol edildi, ` +
      `${sonuc.kurumuDegisen} tanesinin kurumu değişti; ` +
      `${anomali.gun} erişim taraması: ${anomali.incelenenAday} aday, ` +
      `${anomali.yeniAnomali} yeni bulgu, ${anomali.gonderilenUyari} bildirim; ` +
      `${hizSiniri.silinen} hız sınırı satırı silindi (${hizSiniri.sinir.toISOString()} öncesi) ` +
      `(${Date.now() - baslangic} ms)`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((hata) => {
    console.error("Gecelik senkron başarısız:", hata);
    process.exit(1);
  });
