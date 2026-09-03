import {
  oturumGovdesiCoz,
  oturumGovdesiUret,
} from "@/lib/auth/oturum-govde";

/**
 * Oturum çerezi gövdesi.
 *
 * İki sınav var. SÜRE: son kullanma alanı, çerez değerini kopyalayan birinin
 * onu süresiz kullanmasını engellemek için eklendi (tarayıcının uyguladığı
 * `maxAge` sunucuyu bağlamaz). Süresi dolmuş bir gövdenin kabul edildiği bir
 * gerileme, sessizce kalıcı oturum demektir.
 *
 * BİÇİM: gövde `kullanici.id` taşır, AuthProvider kimliği değil (bkz.
 * oturum-govde.ts başlığı — SSO sonrası o alan T.C. kimlik numarası olacak).
 * Sayı olmayan bir gövdenin kabul edilmesi, eski biçimin geri sızması demektir.
 *
 * SÜRÜM: üçüncü alan, açık oturumları toplu iptal etmenin tek kolu. Sürümsüz
 * (iki parçalı) bir gövdenin kabul edildiği bir gerileme, iptal edilemeyen
 * oturumların geri gelmesi demektir.
 */

const SEKIZ_SAAT = 8 * 60 * 60 * 1000;

describe("oturum gövdesi", () => {
  const simdi = Date.UTC(2026, 7, 16, 12, 0, 0);

  test("üretilen gövde aynı kimliği ve sürümü geri verir", () => {
    const govde = oturumGovdesiUret(4127, simdi + SEKIZ_SAAT, 3);
    expect(oturumGovdesiCoz(govde, simdi)).toEqual({
      kullaniciId: 4127,
      surum: 3,
    });
  });

  /* Hiç şifre sıfırlamamış hesabın sürümü sıfırdır; kimlikten farklı olarak
   * "0" burada geçerli bir değerdir. */
  test("sıfır sürüm geçerlidir", () => {
    const govde = oturumGovdesiUret(4127, simdi + SEKIZ_SAAT, 0);
    expect(oturumGovdesiCoz(govde, simdi)).toEqual({
      kullaniciId: 4127,
      surum: 0,
    });
  });

  test("gövde çerez biçimini bozacak karakter içermez", () => {
    const govde = oturumGovdesiUret(4127, simdi + SEKIZ_SAAT, 0);
    // Çerez değeri "gövde.imza" olarak birleştirildiği için gövde nokta
    // içermemeli; base64url alfabesi zaten içermez ama biçim buna dayanıyor.
    expect(govde).not.toContain(".");
  });

  test("süresi dolmuş gövde reddedilir", () => {
    const govde = oturumGovdesiUret(4127, simdi + SEKIZ_SAAT, 0);
    expect(oturumGovdesiCoz(govde, simdi + SEKIZ_SAAT + 1)).toBeNull();
  });

  test("son kullanma anının kendisi artık geçersizdir", () => {
    const govde = oturumGovdesiUret(4127, simdi + SEKIZ_SAAT, 0);
    expect(oturumGovdesiCoz(govde, simdi + SEKIZ_SAAT)).toBeNull();
  });

  test("son kullanmadan bir milisaniye önce hâlâ geçerlidir", () => {
    const govde = oturumGovdesiUret(4127, simdi + SEKIZ_SAAT, 0);
    expect(oturumGovdesiCoz(govde, simdi + SEKIZ_SAAT - 1)).toEqual({
      kullaniciId: 4127,
      surum: 0,
    });
  });

  /**
   * Son kullanma alanı eklenmeden önce açılmış oturumlar. Kabul edilselerdi
   * süresiz yaşarlardı; o düzeltmenin kapattığı açık budur.
   */
  test("eski biçimdeki (süresiz) gövde reddedilir", () => {
    const eski = Buffer.from("4127", "utf8").toString("base64url");
    expect(oturumGovdesiCoz(eski, simdi)).toBeNull();
  });

  /**
   * AuthProvider kimliği taşıyan gövdeler. Yayına alındığında açık oturumlar
   * bir kez giriş ekranına düşer — istenen sonuç budur; kabul edilmeleri T.C.
   * kimlik numarası taşıyan çerezlerin yaşamaya devam etmesi demek olurdu.
   */
  test("AuthProvider kimliği taşıyan gövde reddedilir", () => {
    const eski = Buffer.from(
      `ogrenci-001|${simdi + SEKIZ_SAAT}|0`,
      "utf8",
    ).toString("base64url");
    expect(oturumGovdesiCoz(eski, simdi)).toBeNull();
  });

  /**
   * Sürüm alanı eklenmeden önce yazılmış iki parçalı gövdeler. Kabul
   * edilselerdi iptal edilemeyen oturumlar olarak yaşamaya devam ederlerdi —
   * alanın eklenme sebebi tam olarak budur.
   */
  test("sürümsüz (iki parçalı) gövde reddedilir", () => {
    const eski = Buffer.from(
      `4127|${simdi + SEKIZ_SAAT}`,
      "utf8",
    ).toString("base64url");
    expect(oturumGovdesiCoz(eski, simdi)).toBeNull();
  });

  test("sayı olmayan sürüm reddedilir", () => {
    const bozuk = Buffer.from(
      `4127|${simdi + SEKIZ_SAAT}|son`,
      "utf8",
    ).toString("base64url");
    expect(oturumGovdesiCoz(bozuk, simdi)).toBeNull();
  });

  test("eksi ve gevşek biçimli sürüm reddedilir", () => {
    for (const surum of ["-1", " 1", "1 ", "+1", "0x1", "1.0", "01"]) {
      const bozuk = Buffer.from(
        `4127|${simdi + SEKIZ_SAAT}|${surum}`,
        "utf8",
      ).toString("base64url");
      expect(oturumGovdesiCoz(bozuk, simdi)).toBeNull();
    }
  });

  test("sayı olmayan son kullanma reddedilir", () => {
    const bozuk = Buffer.from("4127|sonsuza-kadar|0", "utf8").toString(
      "base64url",
    );
    expect(oturumGovdesiCoz(bozuk, simdi)).toBeNull();
  });

  test("boş son kullanma reddedilir", () => {
    const bozuk = Buffer.from("4127||0", "utf8").toString("base64url");
    expect(oturumGovdesiCoz(bozuk, simdi)).toBeNull();
  });

  test("kimliği boş gövde reddedilir", () => {
    const bozuk = Buffer.from(`|${simdi + SEKIZ_SAAT}|0`, "utf8").toString(
      "base64url",
    );
    expect(oturumGovdesiCoz(bozuk, simdi)).toBeNull();
  });

  test("fazladan ayraç taşıyan gövde reddedilir", () => {
    const bozuk = Buffer.from(
      `4127|9|${simdi + SEKIZ_SAAT}|0`,
      "utf8",
    ).toString("base64url");
    expect(oturumGovdesiCoz(bozuk, simdi)).toBeNull();
  });

  /**
   * `Number()` bunların HEPSİNİ kabul eder. Geçseydiler aynı satırı işaret eden
   * birden çok geçerli çerez olurdu ve "bu oturum hangi gövdeyle açıldı"
   * sorusunun tek cevabı kalmazdı.
   */
  test("gevşek sayı biçimleri reddedilir", () => {
    for (const kimlik of [" 4127", "4127 ", "+4127", "0x10", "4.0", "4e3"]) {
      const bozuk = Buffer.from(
        `${kimlik}|${simdi + SEKIZ_SAAT}|0`,
        "utf8",
      ).toString("base64url");
      expect(oturumGovdesiCoz(bozuk, simdi)).toBeNull();
    }
  });

  test("sıfır ve eksi kimlik reddedilir", () => {
    for (const kimlik of ["0", "-1"]) {
      const bozuk = Buffer.from(
        `${kimlik}|${simdi + SEKIZ_SAAT}|0`,
        "utf8",
      ).toString("base64url");
      expect(oturumGovdesiCoz(bozuk, simdi)).toBeNull();
    }
  });

  test("tamamen anlamsız gövde çökmez, null döner", () => {
    expect(oturumGovdesiCoz("", simdi)).toBeNull();
    expect(oturumGovdesiCoz("!!!bu-base64-degil!!!", simdi)).toBeNull();
  });
});
