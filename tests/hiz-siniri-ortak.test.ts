const queryRaw = jest.fn();

jest.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => queryRaw(...args),
  },
}));

import { paylasilanHizSiniri } from "@/lib/hiz-siniri";

/**
 * Kopyalar arasında ortak hız sınırı sayacı.
 *
 * NİYE BU TEST VAR: sayaç üç kopyanın ortak durumu ve sessizce bozulabilir.
 * Yanlış tarafa düşmesinin iki maliyeti de gerçek — gevşerse şifre püskürtmesi
 * ve başvuru spam'i geçer, sertleşirse gerçek kullanıcı kapıda kalır.
 *
 * Veritabanı burada MOCK'LANIR: sınanan şey SQL'in kendisi değil (onu Postgres
 * çalıştırıyor), kararın dönen sayıdan nasıl üretildiği ve veritabanı
 * çekildiğinde ne olduğu.
 */

const ayar = { kova: "test", pencereMs: 60_000, sinir: 3 };

describe("dönen sayıdan karar", () => {
  it("sınıra kadar geçirir, aşınca takar", async () => {
    const sinir = paylasilanHizSiniri(ayar);

    for (const sayi of [1, 2, 3]) {
      queryRaw.mockResolvedValueOnce([{ sayi }]);
      expect(await sinir.takildiMi("1.2.3.4")).toBe(false);
    }

    queryRaw.mockResolvedValueOnce([{ sayi: 4 }]);
    expect(await sinir.takildiMi("1.2.3.4")).toBe(true);
  });

  it("sınır 0 ise ilk istek bile takılır", async () => {
    const sinir = paylasilanHizSiniri({ ...ayar, sinir: 0 });
    queryRaw.mockResolvedValueOnce([{ sayi: 1 }]);
    expect(await sinir.takildiMi("1.2.3.4")).toBe(true);
  });
});

describe("veritabanına gönderilen deyim", () => {
  it("kova ve anahtarı parametre olarak taşır", async () => {
    const sinir = paylasilanHizSiniri(ayar);
    queryRaw.mockResolvedValueOnce([{ sayi: 1 }]);
    await sinir.takildiMi("203.0.113.9");

    // Prisma etiketli şablonu (metin parçaları, ...değerler) olarak iletir.
    const cagri = queryRaw.mock.calls[0];
    const deyim = (cagri[0] as string[]).join("?");
    const degerler = cagri.slice(1);

    expect(deyim).toContain("hiz_siniri_penceresi");
    // Sayım tek deyimde ve atomik olmalı: önce okuyup sonra yazan bir uygulama
    // üç kopya aynı anda saydığında artışları kaybederdi.
    expect(deyim).toContain("ON CONFLICT");
    expect(deyim).toContain("RETURNING");
    expect(degerler).toContain("test");
    expect(degerler).toContain("203.0.113.9");
  });

  /* Anahtar sütunu VARCHAR(120); veritabanı hata vermeden önce burada kırpılır. */
  it("çok uzun anahtarı kırpar", async () => {
    const sinir = paylasilanHizSiniri(ayar);
    queryRaw.mockResolvedValueOnce([{ sayi: 1 }]);
    await sinir.takildiMi("x".repeat(500));

    const degerler = queryRaw.mock.calls[0].slice(1) as string[];
    const anahtar = degerler.find((d) => typeof d === "string" && d.startsWith("x"));
    expect(anahtar).toHaveLength(120);
  });
});

describe("veritabanı çekildiğinde", () => {
  /*
   * Fail-open (herkesi geçir) korumayı tam da veritabanı sıkıntıdayken
   * kapatırdı. Yedek sayaç süreç içidir, yani o anda sınır gevşer — ama VARDIR.
   */
  it("sorgu hata verirse süreç içi yedeğe düşer ve saymaya devam eder", async () => {
    const sinir = paylasilanHizSiniri(ayar);
    queryRaw.mockRejectedValue(new Error("bağlantı koptu"));

    expect(await sinir.takildiMi("1.2.3.4")).toBe(false);
    expect(await sinir.takildiMi("1.2.3.4")).toBe(false);
    expect(await sinir.takildiMi("1.2.3.4")).toBe(false);
    expect(await sinir.takildiMi("1.2.3.4")).toBe(true);
  });

  it("boş sonuç da yedeğe düşer, sessizce geçirmez", async () => {
    const sinir = paylasilanHizSiniri({ ...ayar, sinir: 1 });
    queryRaw.mockResolvedValue([]);

    expect(await sinir.takildiMi("1.2.3.4")).toBe(false);
    expect(await sinir.takildiMi("1.2.3.4")).toBe(true);
  });

  /* Yedek de anahtarları ayırmalı; biri diğerinin kotasını yememeli. */
  it("yedek sayaç anahtarları birbirinden ayırır", async () => {
    const sinir = paylasilanHizSiniri({ ...ayar, sinir: 1 });
    queryRaw.mockRejectedValue(new Error("bağlantı koptu"));

    expect(await sinir.takildiMi("a")).toBe(false);
    expect(await sinir.takildiMi("a")).toBe(true);
    expect(await sinir.takildiMi("b")).toBe(false);
  });
});
