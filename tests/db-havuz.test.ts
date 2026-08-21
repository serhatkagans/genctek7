import { baglantiKoptuMu, havuzSiniriniCoz } from "@/lib/db-havuz";

/**
 * `connection_limit` çözümlemesi.
 *
 * NEDEN BU TEST VAR: bu parametre PRISMA'YA ÖZGÜDÜR ve `@prisma/adapter-pg`
 * onu okumaz — altta node-postgres var, bilmediği sorgu parametrelerini sessizce
 * yok sayıyor. Yani adres çubuğuna yazılan sınır bir süre HİÇ uygulanmadı ve
 * havuz `pg`'nin kendi varsayılanıyla açıldı; yerel `prisma dev` sunucusu bu
 * kadar eş zamanlı bağlantıyı kaldıramadığı için sayfalar "Server has closed
 * the connection" ile 500 verdi.
 *
 * Arıza tek sorgu çalıştıran betiklerde HİÇ görünmüyordu (tek bağlantı yeter),
 * yalnızca sayfa yükü altında çıkıyordu — bu yüzden veritabanı arızası değil kod
 * hatası gibi okundu. Çözümlemenin kendisi burada sınanıyor ki sınır bir daha
 * sessizce düşmesin.
 */

const TEMEL = "postgres://k:p@localhost:5432/db";

describe("havuz sınırı çözümlemesi", () => {
  it("adresteki connection_limit değerini kullanır", () => {
    expect(havuzSiniriniCoz(`${TEMEL}?connection_limit=12`)).toBe(12);
  });

  it("diğer parametrelerin arasından okur", () => {
    expect(
      havuzSiniriniCoz(`${TEMEL}?sslmode=disable&connection_limit=6&application_name=x`),
    ).toBe(6);
  });

  it("parametre yoksa varsayılana düşer", () => {
    expect(havuzSiniriniCoz(TEMEL)).toBe(4);
  });

  /*
   * Sıfır ve negatif değerler `pg`'de havuzu kilitler ya da patlatır; sayıya
   * çevrilemeyen değer de öyle. Üçünde de varsayılana düşmek, uygulamanın hiç
   * açılmamasından iyidir — sınır bir başarım ayarıdır, güvenlik kısıtı değil.
   */
  it("geçersiz değerleri varsayılana çevirir", () => {
    expect(havuzSiniriniCoz(`${TEMEL}?connection_limit=0`)).toBe(4);
    expect(havuzSiniriniCoz(`${TEMEL}?connection_limit=-3`)).toBe(4);
    expect(havuzSiniriniCoz(`${TEMEL}?connection_limit=abc`)).toBe(4);
  });

  it("çözümlenemeyen adreste patlamaz", () => {
    expect(havuzSiniriniCoz("bu bir adres değil")).toBe(4);
  });
});

/**
 * HAVUZLAYICI UÇ (12 Ağustos 2026).
 *
 * `pgbouncer=true` yazan bir uç bağlantıları çoğullar: açık bir işlem varken
 * ikinci bir bağlantıdan gelen sorgu aynı arka uca düşüyor, adsız prepared
 * statement eziliyor ve sorgu `08P01` ile patlıyor — ya da daha kötüsü, BAŞKA
 * bir sorgunun sonucunu alıyor. Ölçümde bugünkü ayarla her dört sorgudan biri
 * düşüyordu; tek bağlantıyla hiçbiri düşmedi.
 *
 * Gerekçenin tamamı `db-havuz.ts` · HAVUZLAYICI_SINIRI başlığındadır.
 */
describe("havuzlayıcı uç", () => {
  it("pgbouncer=true görünce tek bağlantıya iner", () => {
    expect(havuzSiniriniCoz(`${TEMEL}?pgbouncer=true`)).toBe(1);
  });

  /*
   * ASIL VAKA: yereldeki adres ikisini birden yazıyor. `connection_limit`
   * kazansaydı düzeltme kendi ortamında hiç çalışmazdı — 4 bağlantı, hatanın
   * ta kendisi.
   */
  it("connection_limit yazılmış olsa da havuzlayıcı kuralı kazanır", () => {
    expect(
      havuzSiniriniCoz(
        `${TEMEL}?sslmode=disable&connection_limit=4&statement_cache_size=0&pgbouncer=true`,
      ),
    ).toBe(1);
  });

  /*
   * Üretimdeki adres gerçek PostgreSQL'e doğrudan gidiyor ve bu parametreyi
   * hiç taşımıyor; kural orada kendiliğinden devre dışı kalmalı, yoksa canlı
   * sunucu tek bağlantıya inerdi.
   */
  it("parametre yoksa üretim davranışı değişmez", () => {
    expect(havuzSiniriniCoz(TEMEL)).toBe(4);
    expect(havuzSiniriniCoz(`${TEMEL}?connection_limit=20`)).toBe(20);
  });

  it("pgbouncer=false kuralı açmaz", () => {
    expect(havuzSiniriniCoz(`${TEMEL}?connection_limit=6&pgbouncer=false`)).toBe(6);
  });
});

/**
 * KOPUK BAĞLANTI TANIMA (21 Ağustos 2026).
 *
 * Yereldeki `prisma dev` sunucusu ara ara bütün bağlantıları düşürüyor ve havuz
 * ölü soketi sıradaki isteğe verince sayfa "Server has closed the connection"
 * ile 500 dönüyor. `db.ts` bu durumda havuzu boşaltıp sorguyu BİR kez yeniden
 * deniyor; hangi hatanın buna gireceği burada sınanıyor.
 */
describe("baglantiKoptuMu", () => {
  it("bağlantının koptuğunu söyleyen hataları tanır", () => {
    expect(baglantiKoptuMu(new Error("Server has closed the connection."))).toBe(
      true,
    );
    expect(baglantiKoptuMu(new Error("Connection terminated unexpectedly"))).toBe(
      true,
    );
    expect(baglantiKoptuMu(new Error("read ECONNRESET"))).toBe(true);
    // Prisma hatayı uzun bir metnin içine gömüyor; alt dize araması şart.
    expect(
      baglantiKoptuMu(
        new Error(
          "Invalid `prisma.kullanici.findUniqueOrThrow()` invocation\n\nServer has closed the connection.",
        ),
      ),
    ).toBe(true);
  });

  it("başka hataları TANIMAZ", () => {
    /*
     * Kısıt ihlalini ya da sorgu hatasını yeniden denemek hatayı gizlemek
     * olurdu: ikinci deneme de aynı sonucu verir, kullanıcı yalnızca bekler.
     */
    expect(baglantiKoptuMu(new Error("Unique constraint failed"))).toBe(false);
    expect(baglantiKoptuMu(new Error("Timed out fetching a connection"))).toBe(
      false,
    );
    expect(baglantiKoptuMu(undefined)).toBe(false);
    expect(baglantiKoptuMu("Server has closed the connection")).toBe(true);
  });
});
