import { sep } from "node:path";

/**
 * Göreli yolların çözüleceği uygulama kökü.
 *
 * NİYE `process.cwd()` DEĞİL (21 Ağustos 2026 · istek: "arada hata veriyor
 * ancak hata kayıtlarına nedeni işlenmiyor"). Üretimde standalone çıktı
 * çalışıyor (next.config.ts · output: "standalone") ve Next'in ürettiği
 * `server.js` ilk satırlarında `process.chdir(__dirname)` yapıyor: çalışma
 * dizini `/opt/genctek` değil, `/opt/genctek/.next/standalone` oluyor.
 *
 * `DEPOLAMA_YEREL_DIZIN` göreli bırakılmış bir kurulumda (depodaki .env
 * varsayılanı `./depolama`) yazma bu yüzden
 * `/opt/genctek/.next/standalone/depolama` altına gidiyordu. Orası servis
 * tanımında SALT OKUNUR: genctek.service `ProtectSystem=strict` ve
 * `ReadWritePaths=/opt/genctek/depolama` diyor. Yazma EACCES ile düşüyor.
 *
 * Çözüm, kökü standalone dizininden GERİ ALMAK: `.next/standalone` içindeysek
 * iki üst dizin uygulamanın gerçek kökü. Mutlak yol verilmiş kurulumlarda
 * (DAGITIM.md'nin önerdiği `/opt/genctek/depolama`) bu hesap devreye girmez.
 *
 * ORTAK MODÜL (27 Ağustos 2026): hesap önce yalnızca `hata-kaydi.ts` içindeydi
 * ve yüklenen dosyaların kökünü çözen `depolama/yerel.ts` düz `resolve()`
 * kullanmaya devam ediyordu — yani hata günlüğü doğru yere yazarken dosya
 * yüklemeleri hâlâ salt okunur dizini deniyordu. Buraya taşındı ki bir sonraki
 * çağıran da aynı tuzağa düşmesin. `ortam` İÇE AKTARILMIYOR: bu dosya ortam
 * değişkeni doğrulaması olmadan da kullanılabilmeli.
 */
export function uygulamaKoku(): string {
  const calisma = process.cwd();
  const standaloneSonu = `${sep}.next${sep}standalone`;
  return calisma.endsWith(standaloneSonu)
    ? calisma.slice(0, -standaloneSonu.length)
    : calisma;
}
