/*
 * SUNUCUDAKİ KİŞİLERİ TEK DOSYAYA ÇIKARIR (28 Ağustos 2026 · istek: "sunucuda
 * veri tabanında daha çok öğrenci öğretmen var, onları çekelim").
 *
 * SUNUCUDA çalışır, çıktısı yerelde `kisi-ice-aktar.ts` ile okunur:
 *   node scripts/kisi-disa-aktar.cjs
 *
 * ---------------------------------------------------------------------------
 * NEDEN PRISMA DEĞİL, DÜZ `pg` VE HAM SQL
 * ---------------------------------------------------------------------------
 * İlk sürüm Prisma ile yazılmıştı ve sunucuda hiç çalışmadı: oradaki Node
 * **v16.20.2** ve Prisma 7'nin WASM sorgu derleyicisi o sürümde açılmıyor
 * (`CompileError: invalid value type 'externref'`). Gereken bayrak
 * (`--experimental-wasm-reftypes`) `NODE_OPTIONS` üzerinden de geçmiyor.
 * Uygulamanın kendisi derlenmiş hâlde ve kendi Node sürümüyle çalıştığı için
 * bunu hiç görmüyor; sorun yalnızca betiği elle çalıştırmakta.
 *
 * `pg` zaten projenin bağımlılığı ve saf JavaScript. Bu dosya bu yüzden:
 *   · `.cjs` — derleme, `tsx`, ESM ayarı gerekmiyor,
 *   · ham SQL — Prisma istemcisi hiç yüklenmiyor.
 * Node 16'da da 22'de de aynı şekilde çalışıyor.
 *
 * ---------------------------------------------------------------------------
 * KAPSAM — kişiyi taşımak tek tablo değil
 * ---------------------------------------------------------------------------
 *   ilce, kurum   → `kullanici.ilce_kodu` / `kurum_kodu` yabancı anahtarları
 *                   yerelde karşılığı olmadan yazılamaz.
 *   kullanici     → kişinin kendisi.
 *   kullanici_rol → rolsüz kullanıcı hiçbir ekranda görünmez.
 *   *_profil      → e-posta, telefon, danışmanlık tercihi.
 *
 * İL TABLOSU ÇIKARILMIYOR: 81 il yerelde seed'den tam geliyor ve sabit.
 *
 * ---------------------------------------------------------------------------
 * "ÖĞRETMEN" TANIMI BURADA İKİNCİ KEZ YAZILI — DİKKAT
 * ---------------------------------------------------------------------------
 * `OGRETMEN` diye bir rol kodu YOK: öğretmen, öğrenci/merkez/mezun/paydaş
 * rollerinin hiçbirine sahip OLMAYAN kişidir. Kuralın aslı
 * `src/lib/yetki/kapsam.ts` içindeki `OGRETMEN` sabitinde duruyor ve normalde
 * oradan okunmalıydı; Prisma yüklenemediği için burada SQL'e çevrildi.
 * O sabit değişirse BU SORGU DA değişmeli.
 *
 * ---------------------------------------------------------------------------
 * KİŞİSEL VERİ
 * ---------------------------------------------------------------------------
 * Dosya gerçek ad, soyad, e-posta ve telefon taşır. İstek üzerine maskesiz
 * alınıyor (28 Ağustos 2026 kararı). Aktarım bittiğinde hem sunucudan hem
 * yerelden silin; depoya girmemesi için `.gitignore`da.
 *
 * Betik yalnızca OKUR: tek bir INSERT/UPDATE/DELETE içermez.
 */

const { writeFileSync } = require("node:fs");
const { Client } = require("pg");

try {
  require("dotenv").config();
} catch {
  // dotenv yoksa DATABASE_URL ortamdan gelmiş olmalı; aşağıda kontrol ediliyor.
}

/** Dosya adı değişmiyor: yerel içe aktarma betiği bunu arıyor. */
const CIKTI = "genctek-kisiler.json";

/** Öğrenci ya da merkez/mezun/paydaş sayılan roller (bkz. başlıktaki not). */
const OGRETMEN_OLMAYAN_ROLLER = [
  "OGRENCI",
  "PROJE_YONETICISI",
  "MEZUN",
  "PAYDAS_TEMSILCISI",
];

async function main() {
  const adres = process.env.DATABASE_URL;
  if (!adres) {
    console.error("DATABASE_URL bulunamadı (.env okunamadı mı?).");
    process.exit(1);
  }

  const istemci = new Client({ connectionString: adres });
  await istemci.connect();

  const ilceler = (
    await istemci.query(
      `SELECT ilce_kodu AS "ilceKodu", il_kodu AS "ilKodu", ad FROM ilce`,
    )
  ).rows;

  const kurumlar = (
    await istemci.query(
      `SELECT kurum_kodu AS "kurumKodu", ad, il_kodu AS "ilKodu",
              ilce_kodu AS "ilceKodu", okul_turu AS "okulTuru", aktif
         FROM kurum`,
    )
  ).rows;

  /*
   * KİMLERİ ALIYORUZ: öğrenci envanterine YA DA öğretmen envanterine giren
   * herkes. Merkez, mezun ve paydaş temsilcisi dışarıda — istek "öğrenci
   * öğretmen" diyor ve merkez hesaplarını yerele taşımanın faydası yok.
   */
  const kullanicilar = (
    await istemci.query(
      `SELECT k.id,
              k.auth_provider_id      AS "authProviderId",
              k.ad, k.soyad, k.cinsiyet,
              k.kurum_kodu            AS "kurumKodu",
              k.il_kodu               AS "ilKodu",
              k.ilce_kodu             AS "ilceKodu",
              k.sinif, k.brans,
              k.egitim_ogretim_yili   AS "egitimOgretimYili",
              k.aktif, k.hakkinda
         FROM kullanici k
        WHERE EXISTS (
                SELECT 1 FROM kullanici_rol r
                 WHERE r.kullanici_id = k.id
                   AND r.rol_kodu = 'OGRENCI'
                   AND r.bitis_tarihi IS NULL)
           OR NOT EXISTS (
                SELECT 1 FROM kullanici_rol r
                 WHERE r.kullanici_id = k.id
                   AND r.bitis_tarihi IS NULL
                   -- rol_kodu bir enum ("RolKodu"); metin dizisiyle
                   -- karşılaştırmak için açıkça metne çevriliyor.
                   AND r.rol_kodu::text = ANY($1::text[]))
        ORDER BY k.id`,
      [OGRETMEN_OLMAYAN_ROLLER],
    )
  ).rows;

  const idler = kullanicilar.map((kisi) => kisi.id);

  /*
   * ROL VE PROFİLLER TEK SORGUDA, kişi başına ayrı sorguyla değil: 420 kişi
   * için 1260 gidiş-dönüş, uzak bir veritabanında dakikalara mal olurdu.
   */
  const roller = (
    await istemci.query(
      `SELECT kullanici_id      AS "kullaniciId",
              rol_kodu          AS "rolKodu",
              il_kodu           AS "ilKodu",
              kurum_kodu        AS "kurumKodu",
              baslangic_tarihi  AS "baslangicTarihi",
              bitis_tarihi      AS "bitisTarihi",
              aciklama
         FROM kullanici_rol
        WHERE kullanici_id = ANY($1::int[])
        ORDER BY id`,
      [idler],
    )
  ).rows;

  const ogrenciProfilleri = (
    await istemci.query(
      `SELECT kullanici_id AS "kullaniciId", eposta, telefon,
              github_url AS "githubUrl", kisisel_site_url AS "kisiselSiteUrl",
              linkedin_url AS "linkedinUrl", instagram_url AS "instagramUrl"
         FROM ogrenci_profil
        WHERE kullanici_id = ANY($1::int[])`,
      [idler],
    )
  ).rows;

  const ogretmenProfilleri = (
    await istemci.query(
      `SELECT kullanici_id AS "kullaniciId",
              danisman_olmak_istiyor AS "danismanOlmakIstiyor",
              isaretleme_tarihi AS "isaretlemeTarihi",
              yegitek_okul_sorumlusu AS "yegitekOkulSorumlusu",
              yegitek_isaretleme_tarihi AS "yegitekIsaretlemeTarihi",
              eposta, telefon,
              github_url AS "githubUrl", kisisel_site_url AS "kisiselSiteUrl",
              linkedin_url AS "linkedinUrl", instagram_url AS "instagramUrl",
              aciklama, kurum_adi AS "kurumAdi", gorev_unvani AS "gorevUnvani"
         FROM ogretmen_profil
        WHERE kullanici_id = ANY($1::int[])`,
      [idler],
    )
  ).rows;

  await istemci.end();

  const rolHaritasi = new Map();
  for (const rol of roller) {
    const { kullaniciId, ...alanlar } = rol;
    if (!rolHaritasi.has(kullaniciId)) rolHaritasi.set(kullaniciId, []);
    rolHaritasi.get(kullaniciId).push(alanlar);
  }

  const ogrenciHaritasi = new Map(
    ogrenciProfilleri.map(({ kullaniciId, ...alanlar }) => [
      kullaniciId,
      alanlar,
    ]),
  );
  const ogretmenHaritasi = new Map(
    ogretmenProfilleri.map(({ kullaniciId, ...alanlar }) => [
      kullaniciId,
      alanlar,
    ]),
  );

  /*
   * `id` ÇIKARILIYOR: yerelde kimlikler korunmuyor, eşleştirme
   * `auth_provider_id` üzerinden yapılıyor (bkz. kisi-ice-aktar.ts). Kimliği
   * dosyada taşımak, yereldeki başka bir kaydın üstüne yazma ihtimalini
   * açık bırakırdı.
   */
  const cikti = kullanicilar.map(({ id, ...alanlar }) => ({
    ...alanlar,
    roller: rolHaritasi.get(id) ?? [],
    ogrenciProfil: ogrenciHaritasi.get(id) ?? null,
    ogretmenProfil: ogretmenHaritasi.get(id) ?? null,
  }));

  const paket = {
    uretimTarihi: new Date().toISOString(),
    sayilar: {
      ilce: ilceler.length,
      kurum: kurumlar.length,
      kullanici: cikti.length,
    },
    ilceler,
    kurumlar,
    kullanicilar: cikti,
  };

  writeFileSync(CIKTI, JSON.stringify(paket, null, 2), "utf8");

  console.log(`${CIKTI} yazıldı:`);
  console.log(`  ilçe      : ${ilceler.length}`);
  console.log(`  kurum     : ${kurumlar.length}`);
  console.log(`  kullanıcı : ${cikti.length}`);
}

main().catch((hata) => {
  console.error(hata);
  process.exit(1);
});
