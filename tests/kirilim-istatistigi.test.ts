import {
  GRUPSUZ,
  ILSIZ,
  kirilimBasliklari,
  kirilimGecerliMi,
  kirilimHucreleri,
  kirilimSatirlari,
  duzeyGecerliMi,
  OKULSUZ,
  PROGRAMSIZ,
  type IstatistikFaaliyeti,
} from "@/lib/rapor/kirilim-istatistigi";

/**
 * Program ve çalışma grubu kırılımlı etkinlik istatistiği (14 Ağustos 2026).
 *
 * Kuralın özü: program en fazla BİR, çalışma grubu BİRDEN ÇOK olabilir. Bu
 * asimetri iki ayrı dosyanın ve buradaki testlerin sebebidir.
 */

function faaliyetYap(
  ozel: Partial<IstatistikFaaliyeti> = {},
): IstatistikFaaliyeti {
  return {
    id: 1,
    kontenjan: 30,
    raporVarMi: false,
    ilKodu: "34",
    ilAdi: "İstanbul",
    kurumKodu: 100,
    kurumAdi: "Atatürk Anadolu Lisesi",
    programAdi: "Robotik Atölyesi",
    gruplar: ["Robotik"],
    basvurular: [],
    ...ozel,
  };
}

describe("kirilimSatirlari · program", () => {
  it("aynı programı aynı ilde tek satırda toplar", () => {
    const satirlar = kirilimSatirlari(
      [faaliyetYap({ id: 1 }), faaliyetYap({ id: 2, kontenjan: 20 })],
      { kirilim: "program", duzey: "il" },
    );

    expect(satirlar).toHaveLength(1);
    expect(satirlar[0].etkinlik).toBe(2);
    expect(satirlar[0].kontenjan).toBe(50);
    expect(satirlar[0].birim).toBe("Robotik Atölyesi");
  });

  it("programı olmayan etkinlik DÜŞMEZ, ayrı satırda toplanır", () => {
    /*
     * Program yalnızca temel etkinlik ve çalışma grubu etkinliğinde zorunlu;
     * il etkinliğinin programı yok. Elenselerdi dosyadaki toplam sistemdeki
     * etkinlik sayısını tutmazdı ve fark sessizce kaybolurdu.
     */
    const satirlar = kirilimSatirlari([faaliyetYap({ programAdi: null })], {
      kirilim: "program",
      duzey: "ulke",
    });

    expect(satirlar).toHaveLength(1);
    expect(satirlar[0].birim).toBe(PROGRAMSIZ);
    expect(satirlar[0].etkinlik).toBe(1);
  });
});

describe("kirilimSatirlari · çalışma grubu", () => {
  it("etkinliği bağlı olduğu HER grupta sayar", () => {
    // Tekrar sayım bilinçli: "bu gruba kaç etkinlik dokundu" sorusunun cevabı.
    const satirlar = kirilimSatirlari(
      [faaliyetYap({ gruplar: ["Robotik", "Yapay Zekâ"] })],
      { kirilim: "grup", duzey: "ulke" },
    );

    expect(satirlar.map((satir) => satir.birim)).toEqual([
      "Robotik",
      "Yapay Zekâ",
    ]);
    expect(satirlar.every((satir) => satir.etkinlik === 1)).toBe(true);
  });

  it("aynı grup iki kez bağlıysa etkinliği iki kez saymaz", () => {
    const satirlar = kirilimSatirlari(
      [faaliyetYap({ gruplar: ["Robotik", "Robotik"] })],
      { kirilim: "grup", duzey: "ulke" },
    );

    expect(satirlar).toHaveLength(1);
    expect(satirlar[0].etkinlik).toBe(1);
  });

  it("grubu seçilmemiş etkinlik ayrı satırda durur", () => {
    const satirlar = kirilimSatirlari([faaliyetYap({ gruplar: [] })], {
      kirilim: "grup",
      duzey: "ulke",
    });

    expect(satirlar[0].birim).toBe(GRUPSUZ);
  });
});

describe("kirilimSatirlari · tek birime daraltma", () => {
  /*
   * 14 Ağustos 2026 · istek: çıktı sayfasında çalışma grubu ve program
   * listeleri seçilebilsin. Tek grup seçildiğinde, o gruba bağlı etkinliğin
   * DİĞER grupları satır açmamalı — açsaydı süzgeç çalışmıyor sanılırdı.
   */
  it("seçilen grubun dışındaki gruplar satır açmaz", () => {
    const satirlar = kirilimSatirlari(
      [faaliyetYap({ gruplar: ["Robotik", "Yapay Zekâ"] })],
      { kirilim: "grup", duzey: "ulke", birim: "Robotik" },
    );

    expect(satirlar).toHaveLength(1);
    expect(satirlar[0].birim).toBe("Robotik");
    expect(satirlar[0].etkinlik).toBe(1);
  });

  it("boş süzgeç tüm birimleri bırakır", () => {
    const satirlar = kirilimSatirlari(
      [faaliyetYap({ gruplar: ["Robotik", "Yapay Zekâ"] })],
      { kirilim: "grup", duzey: "ulke", birim: "" },
    );

    expect(satirlar).toHaveLength(2);
  });
});

describe("kirilimSatirlari · başvuru sayıları", () => {
  it("geri çekilen ve iptal olan başvuruları saymaz, reddedileni sayar", () => {
    const satirlar = kirilimSatirlari(
      [
        faaliyetYap({
          basvurular: [
            { durum: "SECILDI", katildiMi: true },
            { durum: "SECILDI", katildiMi: false },
            { durum: "YEDEK", katildiMi: null },
            { durum: "REDDEDILDI", katildiMi: null },
            { durum: "GERI_CEKILDI", katildiMi: null },
            { durum: "IPTAL_EDILDI", katildiMi: null },
          ],
        }),
      ],
      { kirilim: "program", duzey: "ulke" },
    );

    const satir = satirlar[0];
    expect(satir.basvuru).toBe(4);
    expect(satir.secilen).toBe(2);
    expect(satir.yedek).toBe(1);
    // Yoklama alınmamış (null) katılan sayılmaz; "gelmedi" de sayılmaz.
    expect(satir.katilan).toBe(1);
  });

  it("raporu yazılmış etkinlikleri ayrıca sayar", () => {
    const satirlar = kirilimSatirlari(
      [faaliyetYap({ id: 1, raporVarMi: true }), faaliyetYap({ id: 2 })],
      { kirilim: "program", duzey: "ulke" },
    );

    expect(satirlar[0].etkinlik).toBe(2);
    expect(satirlar[0].raporlu).toBe(1);
  });
});

describe("kirilimSatirlari · düzeyler", () => {
  it("il düzeyinde aynı program iki ilde iki satır olur", () => {
    const satirlar = kirilimSatirlari(
      [
        faaliyetYap({ id: 1 }),
        faaliyetYap({
          id: 2,
          ilKodu: "06",
          ilAdi: "Ankara",
          kurumKodu: 200,
          kurumAdi: "Cumhuriyet Lisesi",
        }),
      ],
      { kirilim: "program", duzey: "il" },
    );

    expect(satirlar.map((satir) => satir.ilAdi)).toEqual([
      "Ankara",
      "İstanbul",
    ]);
  });

  it("ülke düzeyinde iller birleşir", () => {
    const satirlar = kirilimSatirlari(
      [
        faaliyetYap({ id: 1 }),
        faaliyetYap({ id: 2, ilKodu: "06", ilAdi: "Ankara", kurumKodu: 200 }),
      ],
      { kirilim: "program", duzey: "ulke" },
    );

    expect(satirlar).toHaveLength(1);
    expect(satirlar[0].etkinlik).toBe(2);
  });

  it("okul düzeyinde okulu olmayan etkinlik '(okul dışı)' satırındadır", () => {
    // Ulusal ve il etkinliğinin kurumu yoktur; düşürülselerdi okul dosyasının
    // toplamı ülke toplamından habersiz kalırdı.
    const satirlar = kirilimSatirlari(
      [faaliyetYap({ kurumKodu: null, kurumAdi: null })],
      { kirilim: "program", duzey: "okul" },
    );

    expect(satirlar[0].kurumAdi).toBe(OKULSUZ);
    expect(satirlar[0].kurumKodu).toBe("");
  });

  it("ili olmayan etkinlik '(ulusal etkinlik)' satırındadır", () => {
    const satirlar = kirilimSatirlari(
      [faaliyetYap({ ilKodu: null, ilAdi: null, kurumKodu: null, kurumAdi: null })],
      { kirilim: "program", duzey: "il" },
    );

    expect(satirlar[0].ilAdi).toBe(ILSIZ);
  });
});

describe("başlıklar ve hücreler", () => {
  it("başlık sayısı hücre sayısıyla her düzeyde eşleşir", () => {
    /*
     * ASIL RİSK BU: başlıklar ve hücreler iki ayrı işlevde kuruluyor ve biri
     * güncellenip diğeri unutulursa CSV kayar — sütun adları verinin yanlış
     * sütununa düşer ve dosya sessizce yanlış okunur.
     */
    const faaliyet = faaliyetYap({
      basvurular: [{ durum: "SECILDI", katildiMi: true }],
    });

    for (const duzey of ["ulke", "il", "okul"] as const) {
      for (const kirilim of ["program", "grup"] as const) {
        const secim = { kirilim, duzey };
        const satir = kirilimSatirlari([faaliyet], secim)[0];
        expect(kirilimHucreleri(satir, secim)).toHaveLength(
          kirilimBasliklari(secim).length,
        );
      }
    }
  });

  it("kırılım başlığı seçime göre değişir", () => {
    expect(kirilimBasliklari({ kirilim: "program", duzey: "ulke" })[0]).toBe(
      "Program",
    );
    expect(kirilimBasliklari({ kirilim: "grup", duzey: "ulke" })[0]).toBe(
      "Çalışma grubu",
    );
  });
});

describe("parametre doğrulaması", () => {
  it("yalnızca tanımlı kırılım ve düzeyleri kabul eder", () => {
    // Adres çubuğundan gelen değer doğrudan sorguya girmemeli.
    expect(kirilimGecerliMi("program")).toBe(true);
    expect(kirilimGecerliMi("grup")).toBe(true);
    expect(kirilimGecerliMi("okul")).toBe(false);
    expect(duzeyGecerliMi("il")).toBe(true);
    expect(duzeyGecerliMi("program")).toBe(false);
  });
});
