import { dosyaImzasiUyuyorMu } from "@/lib/guvenlik/dosya-imzasi";

/**
 * Yüklenen dosyanın içeriğinin iddia edilen MIME tipiyle uyuşması.
 *
 * Asıl korunan senaryo en altta: içeriği HTML olan bir dosyanın `image/png`
 * etiketiyle geçmesi. Kabul kuralları (ek-kurallar, cv-kurallar,
 * profil-foto-kurallar) yalnızca `File.type`'a baktığı için o testlerde bu
 * durum yakalanmaz.
 */

/** İmza baytlarının ardına dolgu koyar; gerçek dosyalar ilk 12 bayttan uzundur. */
const dosya = (...onek: number[]) =>
  new Uint8Array([...onek, ...new Array(32).fill(0x00)]);

const ascii = (metin: string) => [...metin].map((h) => h.charCodeAt(0));

const PDF = dosya(...ascii("%PDF-1.7"));
const JPEG = dosya(0xff, 0xd8, 0xff, 0xe0);
const PNG = dosya(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const WEBP = dosya(...ascii("RIFF"), 0x24, 0x00, 0x00, 0x00, ...ascii("WEBP"));
const GIF = dosya(...ascii("GIF89a"));
const DOC = dosya(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
const DOCX = dosya(0x50, 0x4b, 0x03, 0x04);

describe("doğru imza kabul edilir", () => {
  it.each([
    ["application/pdf", PDF],
    ["image/jpeg", JPEG],
    ["image/png", PNG],
    ["image/webp", WEBP],
    ["image/gif", GIF],
    ["application/msword", DOC],
    [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      DOCX,
    ],
  ])("%s", (tip, baytlar) => {
    expect(dosyaImzasiUyuyorMu(baytlar, tip).olurMu).toBe(true);
  });
});

describe("uyuşmayan içerik reddedilir", () => {
  it("png imzalı dosya pdf diye gönderilemez", () => {
    const karar = dosyaImzasiUyuyorMu(PNG, "application/pdf");
    expect(karar.olurMu).toBe(false);
    expect(karar.neden).toMatch(/uyuşmuyor/);
  });

  it("pdf imzalı dosya görsel diye gönderilemez", () => {
    expect(dosyaImzasiUyuyorMu(PDF, "image/png").olurMu).toBe(false);
  });

  it("jpeg ile png birbirinin yerine geçmez", () => {
    expect(dosyaImzasiUyuyorMu(JPEG, "image/png").olurMu).toBe(false);
    expect(dosyaImzasiUyuyorMu(PNG, "image/jpeg").olurMu).toBe(false);
  });

  /*
   * ASIL SENARYO: tarayıcı formundan geçmeyen elle kurulmuş bir istek, içeriği
   * HTML olan bir dosyayı `image/png` etiketiyle gönderir. Kabul kuralları
   * yalnızca tipe baktığı için oradan geçer; burada durur.
   */
  it("HTML içerik görsel etiketiyle geçemez", () => {
    const html = new Uint8Array(ascii("<html><script>alert(1)</script>"));
    expect(dosyaImzasiUyuyorMu(html, "image/png").olurMu).toBe(false);
    expect(dosyaImzasiUyuyorMu(html, "image/jpeg").olurMu).toBe(false);
    expect(dosyaImzasiUyuyorMu(html, "application/pdf").olurMu).toBe(false);
  });
});

describe("kenar durumlar", () => {
  it("boş dosya hiçbir tipe uymaz", () => {
    expect(dosyaImzasiUyuyorMu(new Uint8Array(), "image/png").olurMu).toBe(false);
  });

  it("imzadan kısa dosya taşma vermeden reddedilir", () => {
    expect(dosyaImzasiUyuyorMu(new Uint8Array([0x89, 0x50]), "image/png").olurMu).toBe(
      false,
    );
  });

  /*
   * PDF belirtimi `%PDF-` öncesinde dolgu bulunmasına göz yumar; burada
   * yumulmuyor. Aksi halde saldırgan istediği içeriğin önüne birkaç bayt
   * koyarak kontrolü geçerdi (bkz. IMZALAR başlığı).
   */
  it("imza dosyanın başında olmalı, içinde bir yerde değil", () => {
    const dolgulu = new Uint8Array([0x00, 0x00, ...ascii("%PDF-1.7")]);
    expect(dosyaImzasiUyuyorMu(dolgulu, "application/pdf").olurMu).toBe(false);
  });

  /*
   * "RIFF" wav ve avi'de de var; WebP kararı 8.–11. bayttaki kap türüne bakar.
   */
  it("RIFF kabı webp değilse reddedilir", () => {
    const wav = dosya(...ascii("RIFF"), 0x24, 0x00, 0x00, 0x00, ...ascii("WAVE"));
    expect(dosyaImzasiUyuyorMu(wav, "image/webp").olurMu).toBe(false);
  });

  /*
   * TANINMAYAN TİP REDDEDİLİR (fail-closed): izinli tip listesine yönetim
   * ekranından yeni bir tip eklemek, kontrolü o tip için sessizce kapatmamalı.
   */
  it("tabloda olmayan tip doğrulanamadığı için reddedilir", () => {
    const karar = dosyaImzasiUyuyorMu(PNG, "image/svg+xml");
    expect(karar.olurMu).toBe(false);
    expect(karar.neden).toMatch(/doğrulanamıyor/);
  });
});
