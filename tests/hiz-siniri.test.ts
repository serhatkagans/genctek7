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
  /*
   * TEK VEKİL (üretimdeki kurulum): zincirin sonundaki değer, vekilin kendi
   * gördüğü adrestir. Öndekiler istemcinin yazdıklarıdır — sahtedir.
   */
  it("tek vekilde zincirin SONUNU alır, başını değil", () => {
    const basliklar = new Headers({
      "x-forwarded-for": "203.0.113.9, 10.0.0.1, 198.51.100.7",
    });
    expect(basliklardanAnahtar(basliklar, 1)).toBe("198.51.100.7");
  });

  it("tek adreslik zincirde o adresi alır", () => {
    expect(
      basliklardanAnahtar(new Headers({ "x-forwarded-for": "198.51.100.7" }), 1),
    ).toBe("198.51.100.7");
  });

  it("iki vekilde sondan ikinciyi alır", () => {
    const basliklar = new Headers({
      "x-forwarded-for": "sahte, 198.51.100.7, 10.0.0.1",
    });
    expect(basliklardanAnahtar(basliklar, 2)).toBe("198.51.100.7");
  });

  /*
   * ASIL KORUNAN DAVRANIŞ: istemci başlığa istediğini yazar, vekil kendi
   * gördüğünü SONA ekler. Uydurulan değer anahtarı değiştirememeli — aksi
   * halde her istekte başka bir adres yazıp her seferinde yeni bir kova açmak
   * hız sınırını tamamen kaldırırdı.
   */
  it("istemcinin uydurduğu adres anahtarı değiştiremez", () => {
    const vekilinGorduğu = "198.51.100.7";
    const anahtarlar = ["1.2.3.4", "5.6.7.8", "9.10.11.12"].map((sahte) =>
      basliklardanAnahtar(
        new Headers({ "x-forwarded-for": `${sahte}, ${vekilinGorduğu}` }),
        1,
      ),
    );
    expect(new Set(anahtarlar).size).toBe(1);
    expect(anahtarlar[0]).toBe(vekilinGorduğu);
  });

  /*
   * x-real-ip YEDEĞİ YOK: başlığı vekilin mi istemcinin mi yazdığı uygulamadan
   * görünmüyor (üretimdeki Apache kurulumunda kimse yazmıyor, yani istemciden
   * gelen değer olduğu gibi geçerdi). Gerekçenin tamamı
   * lib/guvenlik/istemci-ip.ts'te.
   */
  it("x-real-ip tek başına güvenilir sayılmaz", () => {
    expect(
      basliklardanAnahtar(new Headers({ "x-real-ip": "198.51.100.4" }), 1),
    ).toBe("bilinmeyen");
  });

  it("x-real-ip, uydurulmuş bir zincirin yerine de geçmez", () => {
    const basliklar = new Headers({
      "x-forwarded-for": "203.0.113.9",
      "x-real-ip": "198.51.100.4",
    });
    // Zincirdeki tek değer vekilin yazdığıdır; x-real-ip'e hiç bakılmaz.
    expect(basliklardanAnahtar(basliklar, 1)).toBe("203.0.113.9");
  });

  /*
   * Adressiz isteklerin HEPSİ tek kovayı paylaşır. Sınırın açık kalmasındansa
   * fazla sıkı olması yeğ — anahtarın boş dönmemesi bunun için önemli.
   */
  it("hiçbir başlık yoksa ortak bir anahtara düşer", () => {
    expect(basliklardanAnahtar(new Headers(), 1)).toBe("bilinmeyen");
    expect(basliklardanAnahtar(new Headers({ "x-forwarded-for": "  " }), 1)).toBe(
      "bilinmeyen",
    );
  });

  /*
   * Zincir beklenenden kısaysa (vekil sayısı yanlış yapılandırılmış ya da
   * istek vekili atlamış) elde güvenilir adres yoktur.
   */
  it("zincir vekil sayısından kısaysa ortak anahtara düşer", () => {
    expect(
      basliklardanAnahtar(new Headers({ "x-forwarded-for": "203.0.113.9" }), 2),
    ).toBe("bilinmeyen");
  });

  /* Vekilsiz kurulumda başlığı yazan tek taraf istemcidir; hiçbirine güvenilmez. */
  it("vekil yoksa iletilen başlıklara güvenilmez", () => {
    const basliklar = new Headers({
      "x-forwarded-for": "203.0.113.9",
      "x-real-ip": "198.51.100.4",
    });
    expect(basliklardanAnahtar(basliklar, 0)).toBe("bilinmeyen");
  });

  it("istekAnahtari aynı çözümlemeyi kullanır", () => {
    const istek = new Request("https://ornek.test/api/hata-bildir", {
      headers: { "x-forwarded-for": "sahte, 203.0.113.9" },
    });
    expect(istekAnahtari(istek, 1)).toBe("203.0.113.9");
  });
});
