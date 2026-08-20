import {
  cevaplariKabulEt,
  envanterAcikMi,
  envanterHazirMi,
  envanterSonucu,
  envanterTanimi,
  hazirEnvanterler,
  ilerleme,
  olcekDegeriGecerliMi,
  olcekUstSiniri,
  ozetCumlesi,
  puanlariSirala,
  tamamlanabilirMi,
  tersCevir,
} from "@/lib/envanter/kurallar";
import {
  ENVANTERLER,
  type EnvanterTanimi,
} from "@/lib/envanter/tanimlar";

/** Algoritmam — öz değerlendirme envanterleri (E). */

/**
 * Testlerin çoğu SAHTE bir tanım üzerinde çalışır.
 *
 * Gerçek envanterlerin maddeleri değiştiğinde (ki değişecek — dış kaynaklı
 * dördü hâlâ boş) puanlama testlerinin kırılmaması için: bu testler motoru
 * ölçüyor, içeriği değil. İçeriğin kendi tutarlılığı ayrı bir describe
 * bloğunda, gerçek tanımlar üzerinde sınanıyor.
 */
const SAHTE: EnvanterTanimi = {
  kod: "SAHTE",
  ad: "Sahte Envanter",
  ozet: "Test için",
  yonerge: "Test",
  kaynak: "GENCTEK",
  kaynakNotu: "Test",
  surum: 3,
  olcek: [
    { deger: 1, etiket: "Hiç" },
    { deger: 2, etiket: "Az" },
    { deger: 3, etiket: "Orta" },
    { deger: 4, etiket: "Çok" },
    { deger: 5, etiket: "Tamamen" },
  ],
  boyutlar: [
    {
      kod: "A",
      ad: "A boyutu",
      aciklama: "",
      yuksekYorum: "A yüksek",
      dusukYorum: "A düşük",
    },
    {
      kod: "B",
      ad: "B boyutu",
      aciklama: "",
      yuksekYorum: "B yüksek",
      dusukYorum: "B düşük",
    },
  ],
  maddeler: [
    { kod: "A1", boyut: "A", metin: "A1" },
    { kod: "A2", boyut: "A", metin: "A2" },
    { kod: "B1", boyut: "B", metin: "B1" },
    { kod: "B2", boyut: "B", metin: "B2", tersMi: true },
  ],
};

const TUM_MADDELER = SAHTE.maddeler.map((m) => m.kod);

describe("envanterTanimi / hazır olma", () => {
  it("tanımlı kodu bulur, tanımsıza null döner", () => {
    expect(envanterTanimi("ILGI")?.ad).toBe("İlgi Envanteri");
    expect(envanterTanimi("YOK_BOYLE_BIR_SEY")).toBeNull();
  });

  it("maddesi olan envanteri hazır sayar", () => {
    expect(envanterHazirMi(SAHTE)).toBe(true);
  });

  it("maddesi olmayan dış kaynaklı envanteri hazır SAYMAZ", () => {
    const tanim = envanterTanimi("EPAI");
    expect(tanim).not.toBeNull();
    expect(envanterHazirMi(tanim!)).toBe(false);
  });

  /*
   * 20 Ağustos 2026 · istek: "ilgi beceri ve mesleki envanterlerin başla
   * butonları şu an devrede değil pasife getirelim".
   *
   * Üç envanterin de MADDELERİ YERİNDE — `envanterHazirMi` hâlâ true diyor;
   * kapalı olan yalnızca çözülmesi (`kapali` alanı). Test bu ayrımı ölçüyor:
   * "hazır" ile "açık" ayrışmazsa kapalı bir envanter listede çözülebilir
   * görünür.
   */
  it("kapatılmış envanter hazır SAYILIR ama açık sayılmaz", () => {
    const tanim = envanterTanimi("ILGI");
    expect(tanim).not.toBeNull();
    expect(envanterHazirMi(tanim!)).toBe(true);
    expect(envanterAcikMi(tanim!)).toBe(false);
  });

  it("açık envanter listesi şu an boş: üçü de geçici olarak kapalı", () => {
    expect(hazirEnvanterler().map((t) => t.kod)).toEqual([]);
  });
});

describe("olcekDegeriGecerliMi / olcekUstSiniri", () => {
  it("ölçekte olan değeri kabul, olmayanı reddeder", () => {
    expect(olcekDegeriGecerliMi(SAHTE, 3)).toBe(true);
    expect(olcekDegeriGecerliMi(SAHTE, 0)).toBe(false);
    expect(olcekDegeriGecerliMi(SAHTE, 6)).toBe(false);
  });

  it("üst sınırı seçenek SAYISINDAN değil en büyük DEĞERDEN alır", () => {
    const sifirdanBaslayan: EnvanterTanimi = {
      ...SAHTE,
      olcek: [
        { deger: 0, etiket: "Hiç" },
        { deger: 1, etiket: "Biraz" },
        { deger: 2, etiket: "Çok" },
      ],
    };
    // Seçenek sayısı 3 ama üst sınır 2.
    expect(olcekUstSiniri(sifirdanBaslayan)).toBe(2);
    expect(olcekUstSiniri(SAHTE)).toBe(5);
  });
});

describe("cevaplariKabulEt", () => {
  it("geçerli cevapları kabul eder", () => {
    const karar = cevaplariKabulEt(SAHTE, { A1: 4, B2: 1 });
    expect(karar.olurMu).toBe(true);
    if (!karar.olurMu) return;
    expect(karar.cevaplar).toHaveLength(2);
  });

  it("EKSİK cevabı kabul eder — envanter tek oturumda bitmek zorunda değil", () => {
    const karar = cevaplariKabulEt(SAHTE, { A1: 3 });
    expect(karar.olurMu).toBe(true);
  });

  it("tanımda olmayan maddeyi sessizce DÜŞÜRMEZ, reddeder", () => {
    const karar = cevaplariKabulEt(SAHTE, { A1: 3, UYDURMA: 5 });
    expect(karar.olurMu).toBe(false);
  });

  it("ölçek dışı değeri reddeder", () => {
    expect(cevaplariKabulEt(SAHTE, { A1: 9 }).olurMu).toBe(false);
    expect(cevaplariKabulEt(SAHTE, { A1: 0 }).olurMu).toBe(false);
  });

  it("tam sayı olmayan değeri reddeder", () => {
    expect(cevaplariKabulEt(SAHTE, { A1: 3.5 }).olurMu).toBe(false);
    expect(cevaplariKabulEt(SAHTE, { A1: Number.NaN }).olurMu).toBe(false);
  });

  it("içeriği gelmemiş envantere cevap kabul etmez", () => {
    const bos: EnvanterTanimi = { ...SAHTE, maddeler: [], boyutlar: [] };
    expect(cevaplariKabulEt(bos, {}).olurMu).toBe(false);
  });
});

describe("tamamlanabilirMi / ilerleme", () => {
  it("tüm maddeler cevaplandıysa tamamlanabilir", () => {
    expect(tamamlanabilirMi(SAHTE, TUM_MADDELER)).toBe(true);
  });

  it("tek madde eksikse tamamlanamaz", () => {
    expect(tamamlanabilirMi(SAHTE, ["A1", "A2", "B1"])).toBe(false);
  });

  it("ilerlemeyi yüzde olarak verir", () => {
    expect(ilerleme(SAHTE, ["A1", "B1"])).toEqual({
      cevaplanan: 2,
      toplam: 4,
      yuzde: 50,
    });
  });

  it("tanımda olmayan kod ilerlemeyi ŞİŞİRMEZ", () => {
    expect(ilerleme(SAHTE, ["A1", "UYDURMA"]).cevaplanan).toBe(1);
  });
});

describe("tersCevir", () => {
  it("ölçeğin uçlarından türetir, sabit sayı kullanmaz", () => {
    expect(tersCevir(SAHTE, 5)).toBe(1);
    expect(tersCevir(SAHTE, 1)).toBe(5);
    expect(tersCevir(SAHTE, 3)).toBe(3);
  });

  it("1–7 ölçekte de doğru çevirir", () => {
    const yediliOlcek: EnvanterTanimi = {
      ...SAHTE,
      olcek: [1, 2, 3, 4, 5, 6, 7].map((deger) => ({ deger, etiket: `${deger}` })),
    };
    expect(tersCevir(yediliOlcek, 7)).toBe(1);
    expect(tersCevir(yediliOlcek, 6)).toBe(2);
  });
});

describe("envanterSonucu", () => {
  function cevapla(degerler: Record<string, number>) {
    return Object.entries(degerler).map(([maddeKodu, deger]) => ({
      maddeKodu,
      deger,
    }));
  }

  it("boyut ortalamasını ve yüzdesini hesaplar", () => {
    // A: (5 + 3) / 2 = 4 → (4-1)/(5-1) = %75
    // B: B1=1, B2 TERS (deger 5 → 1) → (1+1)/2 = 1 → %0
    const sonuc = envanterSonucu(
      SAHTE,
      SAHTE.surum,
      cevapla({ A1: 5, A2: 3, B1: 1, B2: 5 }),
    );
    expect(sonuc.durum).toBe("HAZIR");
    if (sonuc.durum !== "HAZIR") return;

    const a = sonuc.puanlar.find((p) => p.boyut.kod === "A")!;
    const b = sonuc.puanlar.find((p) => p.boyut.kod === "B")!;
    expect(a.ortalama).toBe(4);
    expect(a.yuzde).toBe(75);
    expect(b.ortalama).toBe(1);
    expect(b.yuzde).toBe(0);
  });

  it("ters puanlanan maddeyi çevirir — çevrilmezse B yüksek çıkardı", () => {
    // B1=1, B2=5. Ters çevrilmeseydi ortalama 3 (%50) olurdu.
    const sonuc = envanterSonucu(
      SAHTE,
      SAHTE.surum,
      cevapla({ A1: 3, A2: 3, B1: 1, B2: 5 }),
    );
    if (sonuc.durum !== "HAZIR") throw new Error("hazır bekleniyordu");
    expect(sonuc.puanlar.find((p) => p.boyut.kod === "B")!.yuzde).toBe(0);
  });

  it("bantları sınırlara göre seçer", () => {
    // Hepsi 5 → %100 → YUKSEK
    const yuksek = envanterSonucu(
      SAHTE,
      SAHTE.surum,
      cevapla({ A1: 5, A2: 5, B1: 5, B2: 1 }),
    );
    if (yuksek.durum !== "HAZIR") throw new Error("hazır bekleniyordu");
    expect(yuksek.puanlar.every((p) => p.bant === "YUKSEK")).toBe(true);

    // Hepsi ölçeğin ortası (3) → %50 → ORTA (kararsız cevap DÜŞÜK saymaz)
    const orta = envanterSonucu(
      SAHTE,
      SAHTE.surum,
      cevapla({ A1: 3, A2: 3, B1: 3, B2: 3 }),
    );
    if (orta.durum !== "HAZIR") throw new Error("hazır bekleniyordu");
    expect(orta.puanlar.every((p) => p.bant === "ORTA")).toBe(true);
  });

  it("banda göre yorum metnini seçer", () => {
    const sonuc = envanterSonucu(
      SAHTE,
      SAHTE.surum,
      cevapla({ A1: 5, A2: 5, B1: 1, B2: 5 }),
    );
    if (sonuc.durum !== "HAZIR") throw new Error("hazır bekleniyordu");
    expect(sonuc.puanlar.find((p) => p.boyut.kod === "A")!.yorum).toBe("A yüksek");
    expect(sonuc.puanlar.find((p) => p.boyut.kod === "B")!.yorum).toBe("B düşük");
  });

  it("eksik cevapta puanlamaz", () => {
    const sonuc = envanterSonucu(SAHTE, SAHTE.surum, cevapla({ A1: 5, A2: 5 }));
    expect(sonuc).toEqual({ durum: "EKSIK", eksikMadde: 2 });
  });

  it("SÜRÜM UYUŞMAZSA puanlamaz — eski cevabı yeni anahtarla değerlendirmez", () => {
    const sonuc = envanterSonucu(
      SAHTE,
      SAHTE.surum - 1,
      cevapla({ A1: 5, A2: 5, B1: 5, B2: 5 }),
    );
    expect(sonuc).toEqual({ durum: "ESKI_SURUM" });
  });
});

describe("puanlariSirala / ozetCumlesi", () => {
  function puanla(degerler: Record<string, number>) {
    const sonuc = envanterSonucu(
      SAHTE,
      SAHTE.surum,
      Object.entries(degerler).map(([maddeKodu, deger]) => ({ maddeKodu, deger })),
    );
    if (sonuc.durum !== "HAZIR") throw new Error("hazır bekleniyordu");
    return sonuc.puanlar;
  }

  it("yüksek puanı öne alır", () => {
    const sirali = puanlariSirala(puanla({ A1: 1, A2: 1, B1: 5, B2: 1 }));
    expect(sirali[0].boyut.kod).toBe("B");
  });

  it("eşitlikte tanım sırasını korur — her açılışta aynı sıra", () => {
    const puanlar = puanla({ A1: 3, A2: 3, B1: 3, B2: 3 });
    expect(puanlariSirala(puanlar).map((p) => p.boyut.kod)).toEqual(["A", "B"]);
    expect(puanlariSirala([...puanlar].reverse()).map((p) => p.boyut.kod)).toEqual([
      "B",
      "A",
    ]);
  });

  it("öne çıkan boyutu yazar", () => {
    expect(ozetCumlesi(puanla({ A1: 5, A2: 5, B1: 1, B2: 5 }))).toBe(
      "Öne çıkan başlığın: A boyutu.",
    );
  });

  it("BERABERLİĞİ GİZLEMEZ — hepsi eşitse 'öne çıkan' demez", () => {
    expect(ozetCumlesi(puanla({ A1: 3, A2: 3, B1: 3, B2: 3 }))).toBe(
      "Bu envanterde başlıkların hepsi birbirine yakın çıktı.",
    );
  });

  it("puan yoksa boş döner", () => {
    expect(ozetCumlesi([])).toBe("");
  });
});

// ---------------------------------------------------------------------------
// İçeriğin kendi tutarlılığı
// ---------------------------------------------------------------------------
// Bunlar motoru değil TANIM DOSYASINI sınar. Dış kaynaklı bir ölçeğin maddeleri
// eklendiğinde ilk uyarı buradan gelir: yanlış boyut koduyla yazılmış tek bir
// madde, ekranda sessizce kaybolur ve o boyutun puanını eksik hesaplatırdı.

describe("envanter tanımları tutarlı", () => {
  it("kodlar benzersiz", () => {
    const kodlar = ENVANTERLER.map((t) => t.kod);
    expect(new Set(kodlar).size).toBe(kodlar.length);
  });

  it.each(ENVANTERLER.filter(envanterHazirMi).map((t) => [t.ad, t] as const))(
    "%s: madde kodları benzersiz ve boyutları tanımlı",
    (_ad, tanim) => {
      const maddeKodlari = tanim.maddeler.map((m) => m.kod);
      expect(new Set(maddeKodlari).size).toBe(maddeKodlari.length);

      const boyutKodlari = new Set(tanim.boyutlar.map((b) => b.kod));
      for (const madde of tanim.maddeler) {
        expect(boyutKodlari.has(madde.boyut)).toBe(true);
      }
    },
  );

  it.each(ENVANTERLER.filter(envanterHazirMi).map((t) => [t.ad, t] as const))(
    "%s: her boyutun en az iki maddesi var",
    (_ad, tanim) => {
      // Tek maddelik boyut, o maddeyi yanlış anlayan öğrencide boyutu tamamen
      // yanlış gösterir; ortalama alacak bir şey kalmaz.
      for (const boyut of tanim.boyutlar) {
        const sayi = tanim.maddeler.filter((m) => m.boyut === boyut.kod).length;
        expect(sayi).toBeGreaterThanOrEqual(2);
      }
    },
  );

  it.each(ENVANTERLER.filter(envanterHazirMi).map((t) => [t.ad, t] as const))(
    "%s: ölçek değerleri benzersiz ve etiketli",
    (_ad, tanim) => {
      const degerler = tanim.olcek.map((s) => s.deger);
      expect(degerler.length).toBeGreaterThan(1);
      expect(new Set(degerler).size).toBe(degerler.length);
      expect(tanim.olcek.every((s) => s.etiket.trim().length > 0)).toBe(true);
    },
  );

  it("dış kaynaklı envanterler İÇERİKSİZ duruyor — uydurulmuş madde yok", () => {
    const disKaynaklilar = ENVANTERLER.filter((t) => t.kaynak === "DIS_KAYNAK");
    expect(disKaynaklilar).toHaveLength(4);
    for (const tanim of disKaynaklilar) {
      expect(tanim.maddeler).toHaveLength(0);
      expect(envanterHazirMi(tanim)).toBe(false);
      // Neyin beklendiği yazılı olmalı; ekran bu notu basıyor.
      expect(tanim.kaynakNotu.trim().length).toBeGreaterThan(0);
    }
  });
});
