import "dotenv/config";
import { erisimAnomalileriniIzle } from "../src/lib/guvenlik/erisim-anomali";

async function main() {
  const sonuc = await erisimAnomalileriniIzle();
  console.log(
    `[${new Date().toISOString()}] Erişim anomalisi izlemesi: ${sonuc.gun} günü, ` +
      `${sonuc.incelenenAday} aday, ${sonuc.yeniAnomali} yeni bulgu, ` +
      `${sonuc.gonderilenUyari} bildirim`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((hata) => {
    console.error("Erişim anomalisi izlemesi başarısız:", hata);
    process.exit(1);
  });
