import { enBuyukler, yillaraGoreSay } from "@/lib/rapor/grafik-verisi";

/**
 * Grafik veri hazırlığı (15 Ağustos 2026 · Aşama 7).
 *
 * Grafik, yanlış hesaplandığında en zor fark edilen çıktıdır: makul görünen
 * bir bar her zaman makul görünür. Sayımlar bu yüzden burada sınanıyor.
 */

describe("enBuyukler", () => {
  it("büyükten küçüğe sıralar", () => {
    const sonuc = enBuyukler(
      [
        { etiket: "a", deger: 3 },
        { etiket: "b", deger: 9 },
        { etiket: "c", deger: 5 },
      ],
      10,
    );

    expect(sonuc.map((k) => k.etiket)).toEqual(["b", "c", "a"]);
  });

  it("eşit değerleri ada göre Türkçe sıralar", () => {
    // Sıralama kararlı olmalı; aksi hâlde aynı veri iki açılışta iki sırada
    // görünür ve kullanıcı veri değişti sanır.
    const sonuc = enBuyukler(
      [
        { etiket: "Çevre", deger: 4 },
        { etiket: "Bilişim", deger: 4 },
      ],
      10,
    );

    expect(sonuc.map((k) => k.etiket)).toEqual(["Bilişim", "Çevre"]);
  });

  it("sıfır değerli kayıtları düşürür", () => {
    // Uzun bir sıfır kuyruğu büyüklük karşılaştırmasını okunmaz yapar.
    const sonuc = enBuyukler(
      [
        { etiket: "a", deger: 2 },
        { etiket: "b", deger: 0 },
      ],
      10,
    );

    expect(sonuc).toEqual([{ etiket: "a", deger: 2 }]);
  });

  it("sınırı aşan kayıtları 'Diğer' satırında TOPLAR, atmaz", () => {
    /*
     * Sessizce atılsalardı grafiğe bakan kişi barların toplamını sistemdeki
     * toplam sanırdı. "Diğer" hem sınırı hem eksiği görünür tutuyor.
     */
    const sonuc = enBuyukler(
      [
        { etiket: "a", deger: 10 },
        { etiket: "b", deger: 8 },
        { etiket: "c", deger: 3 },
        { etiket: "d", deger: 2 },
        { etiket: "e", deger: 1 },
      ],
      2,
    );

    expect(sonuc).toEqual([
      { etiket: "a", deger: 10 },
      { etiket: "b", deger: 8 },
      { etiket: "Diğer (3)", deger: 6 },
    ]);
  });

  it("sınıra tam eşitken 'Diğer' satırı açmaz", () => {
    const sonuc = enBuyukler(
      [
        { etiket: "a", deger: 2 },
        { etiket: "b", deger: 1 },
      ],
      2,
    );

    expect(sonuc).toHaveLength(2);
  });

  it("boş girdide boş döner", () => {
    expect(enBuyukler([], 5)).toEqual([]);
  });
});

describe("yillaraGoreSay", () => {
  it("tarihleri eğitim-öğretim yılına göre sayar", () => {
    // Eğitim-öğretim yılı eylülde başlıyor: Haziran 2026, 2025-2026'ya düşer.
    const sonuc = yillaraGoreSay([
      new Date("2026-06-16T00:00:00Z"),
      new Date("2026-03-02T00:00:00Z"),
    ]);

    expect(sonuc).toEqual([{ etiket: "2025-2026", deger: 2 }]);
  });

  it("yılları kronolojik sıraya dizer", () => {
    const sonuc = yillaraGoreSay([
      new Date("2026-10-01T00:00:00Z"),
      new Date("2024-11-01T00:00:00Z"),
    ]);

    expect(sonuc.map((k) => k.etiket)).toEqual([
      "2024-2025",
      "2025-2026",
      "2026-2027",
    ]);
  });

  it("aradaki BOŞ yılı atlamaz, sıfırla doldurur", () => {
    /*
     * Atlansaydı çizgi iki dolu yılı doğrudan birleştirir ve aradaki çöküş
     * hiç yaşanmamış gibi görünürdü — zaman ekseninde en kolay yapılan
     * yanıltma bu.
     */
    const sonuc = yillaraGoreSay([
      new Date("2024-11-01T00:00:00Z"),
      new Date("2026-11-01T00:00:00Z"),
    ]);

    expect(sonuc).toEqual([
      { etiket: "2024-2025", deger: 1 },
      { etiket: "2025-2026", deger: 0 },
      { etiket: "2026-2027", deger: 1 },
    ]);
  });

  it("boş girdide boş döner", () => {
    // Çağıran ekran bu durumda grafiği hiç basmıyor.
    expect(yillaraGoreSay([])).toEqual([]);
  });
});
