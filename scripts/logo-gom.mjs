import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * `public/genc.png` dosyasını, belgelere gömülebilir bir `data:` adresi olarak
 * `src/lib/marka/logo.ts` içine yazar.
 *
 *     node scripts/logo-gom.mjs
 *
 * NİYE ÜRETİLİYOR, ÇALIŞMA ZAMANINDA OKUNMUYOR: gerekçenin tamamı üretilen
 * dosyanın başlığında yazılı. Kısaca — değişkenlerden kurulan bir dosya yolu,
 * Next'in standalone çıktısına tüm projeyi kopyalamasına yol açıyor ve
 * `public` klasörünün kurulumdaki yeri sabit değil.
 */

const koku = join(dirname(fileURLToPath(import.meta.url)), "..");
const kaynak = join(koku, "public", "genc.png");
const hedef = join(koku, "src", "lib", "marka", "logo.ts");

const veriUrl = `data:image/png;base64,${(await readFile(kaynak)).toString("base64")}`;

const govde = `/**
 * GENÇTEK LOGOSU — üretilen belgelere gömülen \`data:\` adresi
 * (31 Ağustos 2026 · istek: "GençTek logosu ekle resim olsun bu").
 *
 * BU DOSYA ELLE YAZILMAZ. \`public/genc.png\` değişirse yeniden üretin:
 *
 *     node scripts/logo-gom.mjs
 *
 * ---------------------------------------------------------------------------
 * NİYE \`public/genc.png\` ÇALIŞMA ZAMANINDA OKUNMUYOR
 * ---------------------------------------------------------------------------
 * İlk sürüm dosyayı \`readFile\` ile okuyor ve iki ayrı yol deniyordu, çünkü
 * \`public\` klasörünün standalone çıktısının altında mı yoksa uygulama kökünde
 * mi durduğu kuruluma göre değişiyor (bkz. lib/uygulama-koku.ts). O çözüm iki
 * sorun doğurdu:
 *
 *   1. Derleme uyarısı: "Dynamic filesystem access causes tracing of the whole
 *      project". Yol değişkenlerden kurulduğu için Next hangi dosyanın
 *      gerektiğini göremiyor ve standalone çıktısına TÜM projeyi kopyalıyor.
 *   2. Kuruluma bağımlılık: "iki yolu da dene" hilesi, üçüncü bir yerleşimde
 *      yine sessizce logosuz belge üretirdi.
 *
 * Sabit olarak gömülünce ikisi de kalkıyor: dosya sisteminde arama yok, her
 * kurulumda aynı belge çıkıyor ve logo asla "bazen görünmüyor" olmuyor.
 *
 * ---------------------------------------------------------------------------
 * \`public/genc.png\` KOPYASI DURUYOR VE DURACAK
 * ---------------------------------------------------------------------------
 * Giriş ekranı ile panel başlığı aynı görseli \`<img src>\` ile istiyor
 * (app/page.tsx, panel/layout.tsx). Tarayıcıya her sayfada 82 KB'lık bir
 * \`data:\` adresi göndermenin anlamı yok. Gömülü kopya yalnızca İNDİRİLEN
 * belgeler için: özgeçmiş elden ele dolaşan bir dosyadır ve dış adres,
 * GençTek'e ulaşamayan bir bilgisayarda kırık görsel olurdu.
 */
export const GENCTEK_LOGOSU_VERI_URL =
  "${veriUrl}";
`;

await writeFile(hedef, govde, "utf8");
console.log(`Logo gömüldü: ${hedef} (${veriUrl.length} karakter)`);
