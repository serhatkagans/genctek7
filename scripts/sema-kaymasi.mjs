/**
 * Şema ↔ migration kayma denetimi.
 *
 * NİYE ELLE YAZILDI: `prisma migrate diff --from-migrations` bir gölge
 * veritabanı ister. Bu denetimin ayakta bir Postgres'e ihtiyaç duymaması
 * gerekiyor — kayma çoğunlukla veritabanına hiç dokunmayan bir düzenlemeyle
 * (schema.prisma'ya index eklemek) doğuyor ve orada yakalanmalı.
 *
 * NİYE `prisma migrate dev` YOK: bu depoda migration'lar ELLE yazılıyor.
 * Migration dosyaları, `schema.prisma`'nın ifade EDEMEDİĞİ nesneler içeriyor —
 * kısmi unique index'ler (ux_il_koordinator_tek_aktif gibi) ve CHECK
 * constraint'ler. `migrate dev` şemayı tek doğru kabul ettiği için bunları
 * "fazlalık" sayıp DROP eden bir migration üretir; iş kuralları sessizce
 * kaybolur. Betik bu yüzden var: elle yazma disiplinini korurken, kaymanın
 * fark edilmeden birikmesini engelliyor.
 *
 * Kullanım: npm run sema:kayma   (kayma varsa çıkış kodu 1)
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRASYON_DIZINI = "prisma/migrations";
const SEMA = "prisma/schema.prisma";

/**
 * `schema.prisma`'da İFADE EDİLEMEYEN, bu yüzden yalnızca migration'da yaşayan
 * nesneler.
 *
 * Hepsi kısmi (partial) index: Prisma şema dilinde `WHERE` yan tümcesi yok.
 * Listeye ekleme yapmadan önce iki kez düşünün — buraya yazılan bir ad, bir
 * daha denetlenmez. Yalnızca "Prisma bunu YAZAMAZ" doğruysa eklenmelidir;
 * "şemaya eklemeyi unuttum" için değildir.
 */
const IFADE_EDILEMEYENLER = new Set([
  // Rol ve görev tekillikleri — hepsi "yalnızca AKTİF kayıtlar arasında tek"
  // kuralı, yani bitiş tarihi dolmuş satırlar kısıt dışında kalmalı.
  "ux_kullanici_rol_tek_aktif",
  "ux_kullanici_rol_cakisan",
  "ux_danisman_atama_tek_aktif",
  "ux_il_koordinator_tek_aktif",
  "ux_il_temsilcisi",
  "ux_ilce_temsilcisi",
  "ux_okul_temsilcisi",
  // Ad tekillikleri — yalnızca aktif kayıtlar arasında.
  "ux_paydas_il_ad_aktif",
  "ux_ekip_il_ad_aktif",
  // Durum bazlı tekillikler — reddedilen/tamamlanan kayıt engel olmamalı.
  "ux_dis_basvuru_bekleyen_eposta",
  "ux_baglanti_istegi_bekleyen",
  "envanter_uygulamasi_tek_suren",
  // Kısmi arama index'leri — yalnızca ilgili alt kümeyi kapsar.
  "kullanici_kazanim_market_idx",
  "ogretmen_profil_yegitek_okul_sorumlusu_idx",
]);

/**
 * Prisma'nın `schema.prisma`'dan TÜRETTİĞİ index/constraint adları.
 *
 * Adları elle hesaplamak yerine Prisma'ya sordurmak şart: varsayılan ad kuralı
 * (`tablo_kolon_idx`) bileşik index'lerde, `@map`'li kolonlarda ve `@@map`'li
 * modellerde incelikler barındırıyor. `--from-empty` seçildiği için komut
 * veritabanına HİÇ bağlanmaz, yalnızca datamodel'i SQL'e çevirir.
 */
function semadanBeklenenAdlar() {
  const sql = execFileSync(
    "npx",
    [
      "prisma",
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema",
      SEMA,
      "--script",
    ],
    { encoding: "utf8", shell: process.platform === "win32" },
  );

  const adlar = new Set();
  for (const eslesme of sql.matchAll(
    /CREATE\s+(?:UNIQUE\s+)?INDEX\s+"([^"]+)"/gi,
  )) {
    adlar.add(eslesme[1]);
  }
  return adlar;
}

/**
 * Migration geçmişi uygulandığında veritabanında KALAN adlar.
 *
 * Dosyalar ad sırasıyla okunur (Prisma da öyle uygular) ve DROP/RENAME
 * işlemleri sırayla işlenir: sonradan silinmiş bir index'i "var" saymak,
 * olmayan bir kaymayı raporlardı.
 */
function migrasyonlardakiAdlar() {
  const adlar = new Set();

  for (const klasor of readdirSync(MIGRASYON_DIZINI).sort()) {
    let sql;
    try {
      sql = readFileSync(join(MIGRASYON_DIZINI, klasor, "migration.sql"), "utf8");
    } catch {
      // migration_lock.toml gibi dosyalar; migration klasörü değil.
      continue;
    }

    for (const e of sql.matchAll(
      /CREATE\s+(?:UNIQUE\s+)?INDEX(?:\s+IF NOT EXISTS)?\s+"([^"]+)"/gi,
    )) {
      adlar.add(e[1]);
    }
    // UNIQUE constraint de arka planda bir index doğurur ve Prisma onu
    // `..._key` adıyla üretir; ikisi aynı ad uzayında yaşar.
    for (const e of sql.matchAll(/CONSTRAINT\s+"([^"]+)"\s+UNIQUE/gi)) {
      adlar.add(e[1]);
    }
    for (const e of sql.matchAll(
      /DROP\s+INDEX(?:\s+IF EXISTS)?\s+"([^"]+)"/gi,
    )) {
      adlar.delete(e[1]);
    }
    for (const e of sql.matchAll(
      /ALTER\s+INDEX(?:\s+IF EXISTS)?\s+"([^"]+)"\s+RENAME\s+TO\s+"([^"]+)"/gi,
    )) {
      adlar.delete(e[1]);
      adlar.add(e[2]);
    }
  }

  return adlar;
}

const beklenen = semadanBeklenenAdlar();
const mevcut = migrasyonlardakiAdlar();

/*
 * İKİ YÖN AYRI RAPORLANIR, çünkü sebepleri ayrı:
 *   · Şemada var, migration yok  → index koda eklendi, göç yazılmadı. Sorgu
 *     planı şemada varmış gibi okunur ama üretimde o index YOKTUR.
 *   · Migration var, şemada yok  → ya elle yazılmış bir nesne (beyaz listeye
 *     girmeli) ya da şemadan silinip göçü yazılmamış bir kalıntı.
 */
const eksikGoc = [...beklenen].filter((ad) => !mevcut.has(ad)).sort();
const fazlaNesne = [...mevcut]
  .filter((ad) => !beklenen.has(ad) && !IFADE_EDILEMEYENLER.has(ad))
  .sort();

/*
 * Beyaz listede olup artık migration'da olmayan adlar da bildirilir: silinmiş
 * bir kısıt listede kalırsa, liste zamanla neyin gerçekten korunduğunu
 * söylemeyen bir dosyaya dönüşür.
 */
const oluListe = [...IFADE_EDILEMEYENLER].filter((ad) => !mevcut.has(ad)).sort();

if (eksikGoc.length === 0 && fazlaNesne.length === 0 && oluListe.length === 0) {
  console.log(
    `Kayma yok. Şemadan türeyen ${beklenen.size} nesnenin tamamı migration'larda karşılanıyor;` +
      ` ${IFADE_EDILEMEYENLER.size} elle yazılmış nesne yerinde.`,
  );
  process.exit(0);
}

if (eksikGoc.length > 0) {
  console.error("\nŞEMADA VAR, MIGRATION YOK — göç yazılmamış:");
  for (const ad of eksikGoc) console.error(`  - ${ad}`);
}

if (fazlaNesne.length > 0) {
  console.error("\nMIGRATION VAR, ŞEMADA YOK — ya şemaya işleyin ya beyaz listeye alın:");
  for (const ad of fazlaNesne) console.error(`  - ${ad}`);
  console.error(
    "  (Prisma'nın türettiğinden farklı bir ad kullanıyorsanız şemada" +
      ' `map: "ad"` yazın; kısmi index ise scripts/sema-kaymasi.mjs' +
      " içindeki IFADE_EDILEMEYENLER listesine ekleyin.)",
  );
}

if (oluListe.length > 0) {
  console.error("\nBEYAZ LİSTEDE VAR, MIGRATION'DA YOK — listeden çıkarın:");
  for (const ad of oluListe) console.error(`  - ${ad}`);
}

process.exit(1);
