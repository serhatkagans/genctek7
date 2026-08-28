import {
  REFERANS_AD_AZAMI,
  referansKabulEdilirMi,
  referansSatiri,
} from "@/lib/referans/kurallar";

/**
 * REFERANSLARIM (28 Ağustos 2026 · istek: "Öğrenciler için profile referanslar
 * bölümü ekleyelim. Referans için ad soyad telefon kurum eposta").
 *
 * Sınanan şey ekran değil KARARDIR: hangi satır kabul edilir, hangisi geri
 * çevrilir.
 */

function girdi(ozellikler: Partial<Record<string, string>> = {}) {
  return {
    adSoyad: "Ayşe Yılmaz",
    kurum: "Beşiktaş Anadolu Lisesi",
    telefon: "0 532 111 22 33",
    eposta: "",
    ...ozellikler,
  };
}

describe("referans satırının kabulü", () => {
  it("ad soyad ve telefonla kabul eder", () => {
    const karar = referansKabulEdilirMi(girdi());
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) {
      expect(karar.kayit.adSoyad).toBe("Ayşe Yılmaz");
      expect(karar.kayit.eposta).toBeNull();
    }
  });

  it("ad soyadı kırpar ve fazla boşlukları teke indirir", () => {
    const karar = referansKabulEdilirMi(
      girdi({ adSoyad: "  Ayşe   Nur  Yılmaz " }),
    );
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) expect(karar.kayit.adSoyad).toBe("Ayşe Nur Yılmaz");
  });

  it("adı olmayan referansı reddeder", () => {
    expect(referansKabulEdilirMi(girdi({ adSoyad: "   " })).olurMu).toBe(false);
  });

  it("ad soyad sınırını aşarsa reddeder", () => {
    expect(
      referansKabulEdilirMi(girdi({ adSoyad: "a".repeat(REFERANS_AD_AZAMI + 1) }))
        .olurMu,
    ).toBe(false);
  });

  /*
   * Ulaşılamayan bir referans, referans değildir: okuyan kişi "kime soracağım"
   * sorusunu cevaplayamaz. İkisini birden zorunlu tutmak ise doğru bilgiyi
   * geri çevirirdi.
   */
  it("telefon ve e-postanın ikisi de boşsa reddeder", () => {
    expect(
      referansKabulEdilirMi(girdi({ telefon: "", eposta: "" })).olurMu,
    ).toBe(false);
  });

  it("yalnızca e-posta yeter", () => {
    const karar = referansKabulEdilirMi(
      girdi({ telefon: "", eposta: "Ogretmen@Meb.K12.TR" }),
    );
    expect(karar.olurMu).toBe(true);
    /* Adres bir dil metni değil teknik tanımlayıcı: küçük harfe indiriliyor. */
    if (karar.olurMu) expect(karar.kayit.eposta).toBe("ogretmen@meb.k12.tr");
  });

  it("bozuk e-postayı reddeder", () => {
    expect(
      referansKabulEdilirMi(girdi({ telefon: "", eposta: "ogretmen(at)meb" }))
        .olurMu,
    ).toBe(false);
  });

  /*
   * MASKE DAYATILMIYOR: "0 (532) 111 22 33" ile "+90 532 111 22 33" aynı
   * numaradır; aranan tek şey içinde yeterince rakam olması.
   */
  it("farklı yazımlardaki telefonları kabul eder", () => {
    for (const telefon of [
      "0 (532) 111 22 33",
      "+90 532 111 22 33",
      "0532-111-22-33",
    ]) {
      expect(referansKabulEdilirMi(girdi({ telefon })).olurMu).toBe(true);
    }
  });

  it("harf içeren ya da eksik rakamlı telefonu reddeder", () => {
    expect(referansKabulEdilirMi(girdi({ telefon: "cepten ara" })).olurMu).toBe(
      false,
    );
    expect(referansKabulEdilirMi(girdi({ telefon: "532 111" })).olurMu).toBe(
      false,
    );
  });

  /* Emekli bir öğretmenin ya da aile dostunun kurumu olmayabilir. */
  it("kurum boş bırakılabilir", () => {
    const karar = referansKabulEdilirMi(girdi({ kurum: "" }));
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) expect(karar.kayit.kurum).toBeNull();
  });
});

describe("referansın tek satırlık yazılışı", () => {
  it("dolu alanları noktayla birleştirir", () => {
    expect(
      referansSatiri({
        adSoyad: "Ayşe Yılmaz",
        kurum: "Beşiktaş Anadolu Lisesi",
        telefon: "0 532 111 22 33",
        eposta: null,
      }),
    ).toBe("Beşiktaş Anadolu Lisesi · 0 532 111 22 33");
  });

  it("hepsi boşsa boş metin döner", () => {
    expect(
      referansSatiri({
        adSoyad: "Ayşe Yılmaz",
        kurum: null,
        telefon: null,
        eposta: null,
      }),
    ).toBe("");
  });
});
