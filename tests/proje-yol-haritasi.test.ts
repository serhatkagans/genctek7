import {
  DURUM_AGIRLIGI,
  DURUM_ETIKETI,
  DURUM_ROZETI,
  DURUM_SIRASI,
  durumSayilari,
  gunYaz,
  ilerlemeYuzdesi,
  tarihAraligiYaz,
  YOL_HARITASI,
  type YolHaritasiMaddesi,
} from "@/lib/proje/yol-haritasi";

function madde(
  ozellikler: Partial<YolHaritasiMaddesi> = {},
): YolHaritasiMaddesi {
  return {
    sira: 1,
    baslik: "Deneme",
    durum: "YAYINDA",
    ozet: "Deneme maddesi",
    baslangic: "2026-08-01",
    maddeler: ["tek satır"],
    ...ozellikler,
  };
}

describe("ilerlemeYuzdesi", () => {
  it("boş listede sıfır döner", () => {
    expect(ilerlemeYuzdesi([])).toBe(0);
  });

  it("tamamı yayında olan liste yüzde yüzdür", () => {
    expect(ilerlemeYuzdesi([madde(), madde({ sira: 2 })])).toBe(100);
  });

  it("tamamı planlanan liste sıfırdır", () => {
    expect(ilerlemeYuzdesi([madde({ durum: "PLANLANDI" })])).toBe(0);
  });

  /*
   * ARA AŞAMALAR SAYILIR. Bu testin asıl işi, ilerlemenin "biten / toplam"
   * oranına geri dönmesini engellemek: öyle olsaydı aşağıdaki liste %25
   * verirdi (dört maddenin biri yayında), oysa doğru cevap %56.
   */
  it("ara aşamalar ağırlıklarınca sayılır", () => {
    const yuzde = ilerlemeYuzdesi([
      madde({ sira: 1, durum: "PLANLANDI" }),
      madde({ sira: 2, durum: "GELISTIRILIYOR" }),
      madde({ sira: 3, durum: "TESTTE" }),
      madde({ sira: 4, durum: "YAYINDA" }),
    ]);

    // (0 + 0.5 + 0.75 + 1) / 4 = 0.5625
    expect(yuzde).toBe(56);
  });

  it("her durumun ağırlığı bir öncekinden büyüktür", () => {
    const agirliklar = DURUM_SIRASI.map((durum) => DURUM_AGIRLIGI[durum]);

    for (let sira = 1; sira < agirliklar.length; sira += 1) {
      expect(agirliklar[sira]).toBeGreaterThan(agirliklar[sira - 1]);
    }
  });
});

describe("durumSayilari", () => {
  it("maddesi olmayan durumu da sıfırla döner", () => {
    const sayilar = durumSayilari([madde()]);

    expect(Object.keys(sayilar).sort()).toEqual([...DURUM_SIRASI].sort());
    expect(sayilar.YAYINDA).toBe(1);
    expect(sayilar.PLANLANDI).toBe(0);
  });

  it("sayıların toplamı madde sayısına eşittir", () => {
    const sayilar = durumSayilari(YOL_HARITASI);
    const toplam = DURUM_SIRASI.reduce(
      (birikim, durum) => birikim + sayilar[durum],
      0,
    );

    expect(toplam).toBe(YOL_HARITASI.length);
  });
});

describe("gunYaz", () => {
  it("ISO günü Türkçe yazar", () => {
    expect(gunYaz("2026-07-30")).toBe("30 Temmuz 2026");
    expect(gunYaz("2026-09-03")).toBe("3 Eylül 2026");
  });

  /*
   * SAAT DİLİMİ KAYMASI. `new Date("2026-01-01")` UTC gece yarısıdır; UTC+3
   * bir dilimde biçimlendirildiğinde gün doğru, UTC- dilimlerde bir gün
   * geriye düşer. Bu test biçimlendirmenin `Date`e hiç uğramadığını sabitler.
   */
  it("yılbaşı ve yıl sonu günleri kaymaz", () => {
    expect(gunYaz("2026-01-01")).toBe("1 Ocak 2026");
    expect(gunYaz("2026-12-31")).toBe("31 Aralık 2026");
  });

  it("tanımadığı biçimi olduğu gibi döner", () => {
    expect(gunYaz("yakında")).toBe("yakında");
    expect(gunYaz("2026-13-01")).toBe("2026-13-01");
  });
});

describe("tarihAraligiYaz", () => {
  it("bitişi olmayan madde tek tarih basar", () => {
    expect(tarihAraligiYaz(madde({ baslangic: "2026-08-15" }))).toBe(
      "15 Ağustos 2026",
    );
  });

  it("aynı gün başlayıp biten madde tek tarih basar", () => {
    expect(
      tarihAraligiYaz(madde({ baslangic: "2026-08-15", bitis: "2026-08-15" })),
    ).toBe("15 Ağustos 2026");
  });

  it("aynı ay içindeki aralıkta ay bir kez yazılır", () => {
    expect(
      tarihAraligiYaz(madde({ baslangic: "2026-08-26", bitis: "2026-08-28" })),
    ).toBe("26 – 28 Ağustos 2026");
  });

  it("ay değişen aralıkta iki tarih de tam yazılır", () => {
    expect(
      tarihAraligiYaz(madde({ baslangic: "2026-07-31", bitis: "2026-08-26" })),
    ).toBe("31 Temmuz 2026 – 26 Ağustos 2026");
  });
});

describe("YOL_HARITASI", () => {
  it("sıra numaraları tekildir", () => {
    const siralar = YOL_HARITASI.map((satir) => satir.sira);
    expect(new Set(siralar).size).toBe(siralar.length);
  });

  it("her maddenin tarihi ISO gün biçimindedir", () => {
    for (const satir of YOL_HARITASI) {
      expect(satir.baslangic).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (satir.bitis) expect(satir.bitis).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (satir.yayinTarihi)
        expect(satir.yayinTarihi).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("bitiş, başlangıçtan önce olamaz", () => {
    for (const satir of YOL_HARITASI) {
      if (satir.bitis) {
        expect(satir.bitis >= satir.baslangic).toBe(true);
      }
    }
  });

  /*
   * YAYIN TARİHİ YALNIZCA YAYINDAKİ MADDEDE. Ekranın taşıdığı asıl bilgi
   * "yapıldı" ile "yayında" ayrımı; testteki bir maddeye yayın tarihi
   * yazılması o ayrımı sessizce yok ederdi.
   */
  it("yayın tarihi yalnızca yayındaki maddelerde bulunur", () => {
    for (const satir of YOL_HARITASI) {
      if (satir.durum !== "YAYINDA") {
        expect(satir.yayinTarihi).toBeUndefined();
      }
    }
  });

  it("yayınlanmamış her maddede durumu açıklayan not vardır", () => {
    for (const satir of YOL_HARITASI) {
      if (satir.durum !== "YAYINDA") {
        expect(satir.not).toBeTruthy();
      }
    }
  });

  it("her durumun etiketi ve rozet rengi tanımlıdır", () => {
    for (const satir of YOL_HARITASI) {
      expect(DURUM_ETIKETI[satir.durum]).toBeTruthy();
      expect(DURUM_ROZETI[satir.durum]).toBeTruthy();
    }
  });

  it("her maddenin en az bir kapsam satırı vardır", () => {
    for (const satir of YOL_HARITASI) {
      expect(satir.maddeler.length).toBeGreaterThan(0);
    }
  });
});
