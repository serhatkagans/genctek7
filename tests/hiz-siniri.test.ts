import {
  basliklardanAnahtar,
  hizSiniriOlustur,
  istekAnahtari,
} from "@/lib/hiz-siniri";

/**
 * Hız sınırı, kimlik istemeyen üç kapının tek koruması (başvuru, istemci hata
 * bildirimi). Sınırın kendisi sessizce bozulursa hiçbir ekran uyarmaz — bu
 * yüzden davranışı burada çiviliyoruz.
 */

describe("hizSiniriOlustur", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("sınıra kadar geçirir, aşınca takar", () => {
    const sinir = hizSiniriOlustur({ pencereMs: 60_000, sinir: 3 });

    expect(sinir.takildiMi("a")).toBe(false);
    expect(sinir.takildiMi("a")).toBe(false);
    expect(sinir.takildiMi("a")).toBe(false);
    expect(sinir.takildiMi("a")).toBe(true);
  });

  it("anahtarları birbirinden ayırır", () => {
    const sinir = hizSiniriOlustur({ pencereMs: 60_000, sinir: 1 });

    expect(sinir.takildiMi("a")).toBe(false);
    expect(sinir.takildiMi("a")).toBe(true);
    // "a" kotasını doldurdu diye "b" cezalandırılmaz; ucun tüm varlık sebebi bu.
    expect(sinir.takildiMi("b")).toBe(false);
  });

  it("pencere dolunca sayaç sıfırlanır", () => {
    const sinir = hizSiniriOlustur({ pencereMs: 60_000, sinir: 1 });

    expect(sinir.takildiMi("a")).toBe(false);
    expect(sinir.takildiMi("a")).toBe(true);

    jest.advanceTimersByTime(60_001);
    expect(sinir.takildiMi("a")).toBe(false);
  });

  it("sınır 0 ise ilk istek bile takılır", () => {
    const sinir = hizSiniriOlustur({ pencereMs: 60_000, sinir: 0 });
    expect(sinir.takildiMi("a")).toBe(true);
  });

  /*
   * Anahtarlar dışarıdan geliyor: tavan olmasaydı Map'in kendisi bir saldırı
   * yüzeyi olurdu. Süpürme sonrası sınırın ÇALIŞMAYA DEVAM ETTİĞİ ölçülüyor.
   */
  it("anahtar tavanına varınca belleği boşaltır ama sınır işlemeye devam eder", () => {
    const sinir = hizSiniriOlustur({
      pencereMs: 60_000,
      sinir: 1,
      enFazlaAnahtar: 2,
    });

    expect(sinir.takildiMi("a")).toBe(false);
    expect(sinir.takildiMi("b")).toBe(false);
    expect(sinir.takildiMi("c")).toBe(false);

    expect(sinir.takildiMi("c")).toBe(true);
  });
});

describe("basliklardanAnahtar", () => {
  it("x-forwarded-for zincirinin İLKİNİ alır", () => {
    const basliklar = new Headers({
      "x-forwarded-for": "203.0.113.9, 10.0.0.1, 10.0.0.2",
    });
    expect(basliklardanAnahtar(basliklar)).toBe("203.0.113.9");
  });

  it("x-forwarded-for yoksa x-real-ip'e düşer", () => {
    expect(basliklardanAnahtar(new Headers({ "x-real-ip": "198.51.100.4" }))).toBe(
      "198.51.100.4",
    );
  });

  /*
   * Başlıksız isteklerin HEPSİ tek kovayı paylaşır. Sınırın açık kalmasındansa
   * fazla sıkı olması yeğ — anahtarın boş dönmemesi bunun için önemli.
   */
  it("hiçbir başlık yoksa ortak bir anahtara düşer", () => {
    expect(basliklardanAnahtar(new Headers())).toBe("bilinmeyen");
    expect(basliklardanAnahtar(new Headers({ "x-forwarded-for": "  " }))).toBe(
      "bilinmeyen",
    );
  });

  it("istekAnahtari aynı çözümlemeyi kullanır", () => {
    const istek = new Request("https://ornek.test/api/hata-bildir", {
      headers: { "x-forwarded-for": "203.0.113.9" },
    });
    expect(istekAnahtari(istek)).toBe("203.0.113.9");
  });
});
