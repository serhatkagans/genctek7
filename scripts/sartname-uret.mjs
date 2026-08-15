/*
 * Sıfırdan kurulum şartnamesini koddan üretir.
 *
 * NEDEN: proje.md mimariyi ve değişmezleri elle anlatır, ama sistemin
 * yeniden üretilebilmesi için gereken ayrıntı (şema alanları, enum
 * değerleri, izin fonksiyonlarının imzaları, seed verisi, envanter
 * maddeleri, bildirim şablonları) koddadır. Bu ayrıntı ELLE yazılırsa
 * ilk şema değişikliğinde sessizce yanlışa döner.
 *
 * Bu yüzden ekler kaynak dosyalardan BİREBİR kopyalanır. Şartname
 * eskimez; `npm run sartname:uret` ile tazelenir.
 *
 * Çıktı: kurulum/ dizini (git'e işlenir, depo olmadan da okunabilir).
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const kok = join(dirname(fileURLToPath(import.meta.url)), "..");
const cikti = join(kok, "kurulum");

const oku = (yol) => readFileSync(join(kok, yol), "utf8");
const trimSonu = (metin) => metin.replace(/\s+$/, "");

/** Kaynak dosyayı başlık + dil etiketli kod bloğu olarak gömer. */
function goml(yol, dil = "ts") {
  return `### \`${yol}\`\n\n\`\`\`${dil}\n${trimSonu(oku(yol))}\n\`\`\`\n`;
}

/** Bir dizindeki dosyaları sırayla gömer. */
function dizinGoml(dizin, uzanti = ".ts") {
  return readdirSync(join(kok, dizin))
    .filter((ad) => ad.endsWith(uzanti))
    .sort()
    .map((ad) => goml(`${dizin}/${ad}`))
    .join("\n");
}

const baslik = (no, ad, amac) =>
  `# Ek ${no} — ${ad}\n\n> **Üretilmiş dosya.** Elle düzenlemeyin; \`npm run sartname:uret\` ile yeniden oluşturulur.\n> Kaynak kod ile şartname arasında çelişki olursa **kaynak kod** geçerlidir.\n\n${amac}\n\n---\n\n`;

mkdirSync(cikti, { recursive: true });

const ekler = [];

/* ---------- Ek A: Veri modeli ---------- */
ekler.push([
  "ek-a-veri-modeli.md",
  baslik(
    "A",
    "Veri Modeli Sözleşmesi",
    "47 modelin ve 25 enum'un **tam alan tanımı**. Bu dosya sistemin master sözleşmesidir: migrasyonlar, sorgular, seed ve testler buradan türer. Alan adları, tipleri, varsayılanları, ilişkileri ve `@@index`/`@@unique` kısıtları birebir korunmalıdır.",
  ) +
    goml("prisma/schema.prisma", "prisma") +
    `\n---\n\n## Prisma ile İfade Edilemeyen SQL Kısıtları\n\nAşağıdaki migrasyon dosyaları kısmi tekil indeksleri ve CHECK kısıtlarını içerir. Sıra korunmalıdır:\n\n\`\`\`text\n${readdirSync(join(kok, "prisma/migrations")).sort().join("\n")}\n\`\`\`\n`,
]);

/* ---------- Ek B: Yetki ve kapsam ---------- */
ekler.push([
  "ek-b-yetki-ve-kapsam.md",
  baslik(
    "B",
    "Yetki ve Kapsam Sözleşmesi",
    "Sistemin güvenlik çekirdeği. `izinler.ts` **kim ne yapabilir** sorusunu, `kapsam.ts` **kim neyi görebilir** sorusunu cevaplar. proje.md §5'teki yetki matrisi bu iki dosyanın özetidir; çelişki halinde bu dosyalar geçerlidir.\n\nÖzellikle dikkat: kapsam filtreleri il ve kurum ekseninde çalışır. `MEZUN` ve `PAYDAS_TEMSILCISI` rollerinin kurum kodu **yoktur**, bu yüzden her filtrede açıkça ele alınmalıdır — varsayılanları \"hiçbir şey görmez\"dir.",
  ) + dizinGoml("src/lib/yetki"),
]);

/* ---------- Ek C: Başlangıç verisi ---------- */
ekler.push([
  "ek-c-baslangic-verisi.md",
  baslik(
    "C",
    "Başlangıç (Seed) Verisi",
    "Boş bir veritabanını çalışır hale getiren referans veri: çalışma grupları, temel etkinlik programları, sistem ayarları ve bildirim şablonları. Bu içerik **veridir, kod değildir** — birebir aktarılmazsa sistem ayağa kalkar ama davranışı değişir (örn. eksik bildirim şablonu sessiz bildirim kaybına yol açar).",
  ) + goml("prisma/seed.ts"),
]);

/* ---------- Ek D: Envanter ve bildirim şablonları ---------- */
ekler.push([
  "ek-d-envanter-ve-bildirim.md",
  baslik(
    "D",
    "Algoritmam Envanteri ve Bildirim Şablonları",
    "proje.md §10 \"25 maddelik özdeğerlendirme envanteri\" der ama maddeleri içermez; §20 bildirimden söz eder ama şablon metinlerini içermez. İkisi de buradadır.",
  ) +
    dizinGoml("src/lib/envanter") +
    "\n" +
    dizinGoml("src/lib/bildirim"),
]);

/* ---------- Ek E: Saf iş kuralları ---------- */
/*
 * Kapsam ELLE seçilmez: testlerin içe aktardığı modüller taranır. Test
 * edilen yüzey, yeniden üretilmesi zorunlu olan yüzeydir — yeni bir kural
 * dosyası test edildiği anda şartnameye kendiliğinden girer.
 *
 * Ek B (yetki) ve Ek D (envanter, bildirim) ayrı eklerde olduğu için düşülür.
 */
const baskaEkteOlan = /^src\/lib\/(yetki|envanter|bildirim)\//;

const testYuzeyi = [
  ...new Set(
    readdirSync(join(kok, "tests"))
      .filter((ad) => ad.endsWith(".ts"))
      .flatMap((ad) => [
        ...oku(`tests/${ad}`).matchAll(/from "@\/(lib\/[a-z0-9/-]+)"/g),
      ])
      .map((eslesme) => `src/${eslesme[1]}.ts`),
  ),
]
  .filter((yol) => !baskaEkteOlan.test(yol))
  .sort();

ekler.push([
  "ek-e-is-kurallari.md",
  baslik(
    "E",
    "Saf İş Kuralları",
    `Veritabanından bağımsız, saf fonksiyon olarak yazılmış alan kuralları — **${testYuzeyi.length} modül**. 936 Jest testi bu dosyalara yazılmıştır: imzalar korunursa test paketi de birebir yeniden üretilebilir.\n\nBu liste elle tutulmaz; \`tests/\` içindeki \`@/lib/...\` içe aktarımları taranarak üretilir.`,
  ) + testYuzeyi.map((yol) => goml(yol)).join("\n"),
]);

/* ---------- Ek F: Rota ve eylem envanteri ---------- */
function dosyalariBul(dizin, ad) {
  const sonuc = [];
  const gez = (d) => {
    for (const girdi of readdirSync(join(kok, d), { withFileTypes: true })) {
      const yol = `${d}/${girdi.name}`;
      if (girdi.isDirectory()) gez(yol);
      else if (ad.test(girdi.name)) sonuc.push(yol);
    }
  };
  gez(dizin);
  return sonuc.sort();
}

const sayfalar = dosyalariBul("src/app", /^page\.tsx$/);
const rotalar = dosyalariBul("src/app", /^route\.ts$/);
const eylemler = dosyalariBul("src/app", /eylem.*\.ts$/);

ekler.push([
  "ek-f-rota-envanteri.md",
  baslik(
    "F",
    "Rota, Sayfa ve Server Action Envanteri",
    "Üretilecek dosyaların birebir listesi. Yol adları sözleşmedir: bir sayfa farklı bir yola konursa menü, yönlendirmeler ve `ham-yol-taramasi` testi kırılır.",
  ) +
    `## Sayfalar (${sayfalar.length})\n\n\`\`\`text\n${sayfalar.join("\n")}\n\`\`\`\n\n` +
    `## Route Handler'lar (${rotalar.length})\n\n\`\`\`text\n${rotalar.join("\n")}\n\`\`\`\n\n` +
    `## Server Action Dosyaları (${eylemler.length})\n\n\`\`\`text\n${eylemler.join("\n")}\n\`\`\`\n\n` +
    `## Paylaşılan Bileşenler\n\n\`\`\`text\n${readdirSync(join(kok, "src/components")).sort().join("\n")}\n\`\`\`\n\n` +
    `## Test Paketleri (${readdirSync(join(kok, "tests")).filter((a) => a.endsWith(".test.ts")).length})\n\n\`\`\`text\n${readdirSync(join(kok, "tests")).sort().join("\n")}\n\`\`\`\n`,
]);

for (const [ad, icerik] of ekler) {
  writeFileSync(join(cikti, ad), icerik, "utf8");
  const satir = icerik.split("\n").length;
  console.log(`kurulum/${ad.padEnd(32)} ${String(satir).padStart(6)} satır`);
}

console.log(`\n${ekler.length} ek üretildi → kurulum/`);
