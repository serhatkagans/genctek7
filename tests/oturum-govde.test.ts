import {
  oturumGovdesiCoz,
  oturumGovdesiUret,
} from "@/lib/auth/oturum-govde";

/**
 * Oturum çerezi gövdesi.
 *
 * Buradaki asıl sınav SÜRE: son kullanma alanı, çerez değerini kopyalayan
 * birinin onu süresiz kullanmasını engellemek için eklendi (tarayıcının
 * uyguladığı `maxAge` sunucuyu bağlamaz). Süresi dolmuş bir gövdenin kabul
 * edildiği bir gerileme, sessizce kalıcı oturum demektir.
 */

const SEKIZ_SAAT = 8 * 60 * 60 * 1000;

describe("oturum gövdesi", () => {
  const simdi = Date.UTC(2026, 7, 16, 12, 0, 0);

  test("üretilen gövde aynı kimliği geri verir", () => {
    const govde = oturumGovdesiUret("mock-koordinator", simdi + SEKIZ_SAAT);
    expect(oturumGovdesiCoz(govde, simdi)).toBe("mock-koordinator");
  });

  test("kimlik gövdede açıkça okunmaz (base64url)", () => {
    const govde = oturumGovdesiUret("mock-koordinator", simdi + SEKIZ_SAAT);
    expect(govde).not.toContain("mock-koordinator");
    // Çerez değeri "gövde.imza" olarak birleştirildiği için gövde nokta
    // içermemeli; base64url alfabesi zaten içermez ama biçim buna dayanıyor.
    expect(govde).not.toContain(".");
  });

  test("süresi dolmuş gövde reddedilir", () => {
    const govde = oturumGovdesiUret("mock-koordinator", simdi + SEKIZ_SAAT);
    expect(oturumGovdesiCoz(govde, simdi + SEKIZ_SAAT + 1)).toBeNull();
  });

  test("son kullanma anının kendisi artık geçersizdir", () => {
    const govde = oturumGovdesiUret("mock-koordinator", simdi + SEKIZ_SAAT);
    expect(oturumGovdesiCoz(govde, simdi + SEKIZ_SAAT)).toBeNull();
  });

  test("son kullanmadan bir milisaniye önce hâlâ geçerlidir", () => {
    const govde = oturumGovdesiUret("mock-koordinator", simdi + SEKIZ_SAAT);
    expect(oturumGovdesiCoz(govde, simdi + SEKIZ_SAAT - 1)).toBe(
      "mock-koordinator",
    );
  });

  /**
   * Son kullanma alanı eklenmeden önce açılmış oturumlar. Kabul edilselerdi
   * süresiz yaşarlardı; düzeltmenin tam olarak kapattığı açık budur.
   */
  test("eski biçimdeki (süresiz) gövde reddedilir", () => {
    const eski = Buffer.from("mock-koordinator", "utf8").toString("base64url");
    expect(oturumGovdesiCoz(eski, simdi)).toBeNull();
  });

  test("sayı olmayan son kullanma reddedilir", () => {
    const bozuk = Buffer.from("mock-koordinator|sonsuza-kadar", "utf8").toString(
      "base64url",
    );
    expect(oturumGovdesiCoz(bozuk, simdi)).toBeNull();
  });

  test("boş son kullanma reddedilir", () => {
    const bozuk = Buffer.from("mock-koordinator|", "utf8").toString("base64url");
    expect(oturumGovdesiCoz(bozuk, simdi)).toBeNull();
  });

  test("kimliği boş gövde reddedilir", () => {
    const bozuk = Buffer.from(`|${simdi + SEKIZ_SAAT}`, "utf8").toString(
      "base64url",
    );
    expect(oturumGovdesiCoz(bozuk, simdi)).toBeNull();
  });

  /**
   * Ayraç kimliğin içinde geçerse: son ayraca göre bölündüğü için kimlik
   * bozulmadan geri gelmeli. Bugünkü kimliklerde bu karakter yok ama gövdenin
   * doğruluğu ileride üretilecek kimliklerin biçimine bağlı kalmamalı.
   */
  test("kimlik ayraç içerse de bozulmadan geri okunur", () => {
    const govde = oturumGovdesiUret("eba|12345", simdi + SEKIZ_SAAT);
    expect(oturumGovdesiCoz(govde, simdi)).toBe("eba|12345");
  });

  test("tamamen anlamsız gövde çökmez, null döner", () => {
    expect(oturumGovdesiCoz("", simdi)).toBeNull();
    expect(oturumGovdesiCoz("!!!bu-base64-degil!!!", simdi)).toBeNull();
  });
});
