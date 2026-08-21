/**
 * Bağlantı havuzu boyutunun çözümlenmesi.
 *
 * Saf tutulur: veritabanına ve ortam değişkenlerine GİTMEZ, adresi parametre
 * olarak alır. `db.ts` Prisma istemcisini içeri aldığı için birim testte
 * yüklenemiyor; karar bu yüzden ayrı dosyada duruyor.
 *
 * NİYE BÖYLE BİR KARAR VAR: `DATABASE_URL` içindeki `connection_limit`
 * PRISMA'YA ÖZGÜ bir parametredir ve `@prisma/adapter-pg` onu OKUMAZ — altta
 * node-postgres çalışıyor, o da bilmediği sorgu parametrelerini sessizce yok
 * sayıyor. Yani adrese yazılan sınır bir süre HİÇ uygulanmadı; havuz `pg`'nin
 * kendi varsayılanıyla açıldı.
 *
 * Sonucu görünür bir arızaydı: yerel `prisma dev` sunucusu dört-beş eş zamanlı
 * bağlantıdan fazlasını kapatıyor ve sayfalar "Server has closed the connection"
 * ile 500 veriyordu. Tek sorgu çalıştıran betiklerde hiç görünmüyordu (tek
 * bağlantı yetiyor), yalnızca sayfa yükü altında çıkıyordu — bu yüzden hata
 * veritabanı arızası değil kod hatası gibi okunuyordu.
 */

/**
 * Sınır yazılmamışsa kullanılan değer.
 *
 * 4, yerel `prisma dev` sunucusunun sorunsuz taşıdığı en yüksek değer (10'da
 * 25 eş zamanlı sorgunun 9'u düşüyor, 4'te hiçbiri). Gerçek bir Postgres'e
 * geçildiğinde `DATABASE_URL`'e `connection_limit=20` gibi bir değer yazmak
 * yeterli; kod değişmiyor.
 */
export const VARSAYILAN_HAVUZ_SINIRI = 4;

/**
 * HAVUZLAYICI BİR UCA BAĞLANIRKEN kullanılan sınır (12 Ağustos 2026).
 *
 * BİR: uygulama veritabanına tek bağlantıdan, sırayla gider.
 *
 * ---------------------------------------------------------------------------
 * NEDEN
 * ---------------------------------------------------------------------------
 * Belirti: sayfalar rastgele 500 veriyordu ve günlükte tek bir hata vardı —
 * `Database error. Code: 08P01. Message: bind message supplies 2 parameters,
 * but prepared statement "" requires 8`. Bir günde 172 hata kaydının 125'i
 * buydu; her seferinde BAŞKA bir sorguda ve başka parametre sayılarıyla.
 *
 * `08P01` bir protokol hatasıdır: gönderilen Bind mesajı, o bağlantıda ayrıştırılmış
 * olan ifadeye uymuyor. Yani İKİ AYRI SORGU tek bir oturumda birbirine giriyor.
 * Sonuç yalnızca hata da değil: ölçümde sorguların bir kısmı BAŞKA sorgunun
 * sonucunu alıp çözümlemede patladı ("Cannot read properties of null").
 *
 * Ölçümle daraltıldı (40 tur · turda 1 işlem + 7 eş zamanlı sorgu):
 *
 *   yalnızca eş zamanlı okuma ................ 0 hata
 *   yalnızca işlem (transaction) ............. 0 hata
 *   işlem + eş zamanlı okuma ................. %24 hata
 *   işlem, sonra okuma (sıralı) .............. 0 hata
 *
 * Yani tetikleyici AÇIK BİR İŞLEM ile eş zamanlı sorguların çakışması.
 *
 * KABAHAT UYGULAMADA YA DA PRISMA'DA DEĞİL: aynı desen Prisma hiç devrede
 * olmadan, çıplak `pg` ile de aynı hatayı veriyor. Kabahat yereldeki uçta —
 * `prisma dev` sunucusu bağlantıları çoğullayan bir havuzlayıcıdır ve adresini
 * `pgbouncer=true` ile işaretler. İşlem bir oturumu tutarken öbür bağlantıların
 * sorguları aynı arka uca düşüyor, adsız prepared statement ("") eziliyor.
 *
 * `pgbouncer=true` PRISMA'YA ÖZGÜDÜR: Prisma'nın kendi motoru bunu görünce
 * prepared statement kullanmayı bırakır. `@prisma/adapter-pg` ise onu OKUMAZ —
 * `connection_limit`'te olduğu gibi (bkz. dosya başlığı). Talimat sessizce
 * düşüyor ve altta node-postgres adsız ifadelerle çalışmaya devam ediyor.
 *
 * DENENİP ELENEN ÇÖZÜMLER:
 *   · `idleTimeoutMillis` büyütmek — ilgisiz; 1sn ve 30sn aynı hata oranını
 *     veriyor.
 *   · Havuzu büyütmek — sınırı öteliyor, kaldırmıyor; max=20'de bile hata var.
 *   · Adlandırılmış prepared statement (`statementNameGenerator`) — hata oranı
 *     değişmedi (%24), yalnızca hatanın adı değişti.
 *   · max=1 — 320 sorguda SIFIR hata. Tek bağlantıda çakışacak ikinci bir
 *     sorgu kalmıyor.
 *
 * MALİYETİ eş zamanlılık: sayfa sorguları sıraya giriyor. Yerel geliştirmede
 * tek kullanıcı olduğu için bu ölçülebilir bir yavaşlama değil; rastgele 500
 * almanın yanında kabul edilir bir bedel.
 *
 * ÜRETİMİ ETKİLEMEZ ve bu kasıtlı: sunucudaki adres gerçek PostgreSQL'e
 * (127.0.0.1:5432) doğrudan gider, `pgbouncer` parametresi yoktur. Kural
 * kendiliğinden devre dışı kalır, üretim `VARSAYILAN_HAVUZ_SINIRI` ile çalışır.
 * Gerçek bir PgBouncer'ın arkasına geçilirse kural İSTENEREK devreye girer —
 * orada da aynı çakışma yaşanır.
 */
export const HAVUZLAYICI_SINIRI = 1;

/**
 * Havuzdaki bir bağlantının BOŞTA kalabileceği süre (11 Ağustos 2026).
 *
 * NİYE VAR: yerel `prisma dev` sunucusu boşta duran bağlantıyı yaklaşık on beş
 * saniye sonra KENDİ KAPATIYOR. `pg` bunu fark etmiyor, bağlantıyı havuzda
 * "hazır" sayıyor ve sıradaki isteğe ÖLÜ bağlantıyı veriyor; sonuç "Server has
 * closed the connection" hatası ve ekranda 500. Belirti sinsiydi: hata her
 * zaman aynı sayfada çıkmıyordu, "bir süredir açık duran sekmede ilk tıklama
 * patlıyor, yenileyince düzeliyor" biçiminde görünüyordu.
 *
 * SORUN EŞ ZAMANLILIK DEĞİL: on eş zamanlı sorgu arka arkaya sorunsuz
 * çalışıyor, on beş saniye bekledikten sonra yapılan TEK sorgu patlıyor.
 * Bağlantı sınırını düşürmek ya da sorguları dalgalara bölmek bu yüzden
 * çözmüyordu, yalnızca isabet olasılığını değiştiriyordu.
 *
 * BİR SANİYE, sunucunun kapatma eşiğinin çok altında: havuz bağlantıyı
 * sunucudan önce kendisi bırakıyor, bir sonraki istek taze bağlantı açıyor.
 * Ölçüm: 5000'de yirmi saniyelik aralıklarla yapılan yedi denemenin biri
 * düşüyordu, 1000'de hiçbiri düşmedi.
 *
 * MALİYETİ, seyrek kullanılan sayfalarda bir bağlantı kurma gecikmesi. Gerçek
 * bir Postgres'e geçildiğinde bu kadar kısa tutmaya gerek yok (sunucu boştaki
 * bağlantıyı kendiliğinden kapatmıyor); değer o zaman yükseltilebilir.
 *
 * NOT: yerel `prisma dev` sunucusu bunun DIŞINDA da arada bağlantı düşürüyor
 * (uygulama açılırken, hiç boşta beklemeden). O davranış bu ayarla ilgili
 * değil ve sunucu yeniden başlatılınca geçiyor.
 */
export const BOSTA_KALMA_SURESI_MS = 1000;

export function havuzSiniriniCoz(adres: string): number {
  let parametreler: URLSearchParams;
  try {
    parametreler = new URL(adres).searchParams;
  } catch {
    // Adres çözümlenemiyorsa bağlantı zaten kurulamayacak; havuz boyutu
    // yüzünden ayrıca patlamanın anlamı yok.
    return VARSAYILAN_HAVUZ_SINIRI;
  }

  /*
   * HAVUZLAYICI KONTROLÜ `connection_limit`TEN ÖNCE gelir ve onu EZER.
   * Yereldeki adres ikisini birden yazıyor (`connection_limit=4&pgbouncer=true`)
   * ve o adreste 4 bağlantı, hatanın ta kendisidir (bkz. HAVUZLAYICI_SINIRI).
   * Sıra ters olsaydı düzeltme kendi ortamında hiç çalışmazdı.
   */
  if (parametreler.get("pgbouncer") === "true") return HAVUZLAYICI_SINIRI;

  const deger = parametreler.get("connection_limit");
  if (deger === null) return VARSAYILAN_HAVUZ_SINIRI;

  /*
   * Sıfır ve negatif değer `pg`'de havuzu kilitler; sayıya çevrilemeyen değer
   * de öyle. Üçünde de varsayılana düşmek uygulamanın hiç açılmamasından iyi —
   * bu bir başarım ayarı, güvenlik kısıtı değil.
   */
  const sayi = Number.parseInt(deger, 10);
  return Number.isFinite(sayi) && sayi > 0 ? sayi : VARSAYILAN_HAVUZ_SINIRI;
}

/**
 * "Bağlantı koptu" hatalarının izleri.
 *
 * Yereldeki `prisma dev` sunucusu ara ara bütün bağlantıları düşürüyor; havuz
 * ölü soketi sıradaki isteğe verdiğinde sayfa 500 dönüyor. Hangi hatanın
 * "kopukluk" sayılacağı BURADA duruyor çünkü karar saf: mesaj metnine bakıyor,
 * veritabanına gitmiyor ve birim testle sınanabiliyor (db.ts, Prisma
 * istemcisini içeri aldığı için testte yüklenemiyor).
 *
 * Liste DAR TUTULDU: sorgu hatası, kısıt ihlali ya da zaman aşımı buraya
 * girmemeli — onları yeniden denemek hatayı gizlemek olur.
 */
export const KOPUK_BAGLANTI_IZLERI = [
  "Server has closed the connection",
  "Connection terminated",
  "ECONNRESET",
];

export function baglantiKoptuMu(hata: unknown): boolean {
  const mesaj =
    hata instanceof Error ? hata.message : typeof hata === "string" ? hata : "";
  return KOPUK_BAGLANTI_IZLERI.some((iz) => mesaj.includes(iz));
}
