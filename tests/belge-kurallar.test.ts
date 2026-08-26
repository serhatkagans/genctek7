import {
  imzaBilgisiniCoz,
  imzaUnvaniOner,
  aliciAdiniCoz,
  BELGE_TURU_ETIKETLERI,
  belgeMetniUret,
  belgeTuruMu,
} from "@/lib/belge/kurallar";

/**
 * Katılım ve teşekkür belgesi kuralları.
 */

const TEMEL = {
  adSoyad: "Elif Yılmaz",
  faaliyetAdi: "Robotik Atölyesi",
  tarihMetni: "12 Mart 2026",
};

describe("belgeMetniUret", () => {
  it("katılım belgesi KATILIMA teşekkür eder", () => {
    const metin = belgeMetniUret({ ...TEMEL, tur: "KATILIM" });
    expect(metin.baslik).toBe("Katılım Belgesi");
    expect(metin.govde).toBe(
      "Millî Eğitim Bakanlığı Yenilik ve Eğitim Teknolojileri Genel Müdürlüğü " +
        "koordinesinde yürütülen GençTek: Akran Öğrenme Modeli ve Genç Bilişim " +
        "Ekosistemi çalışmaları kapsamında, 12 Mart 2026 tarihinde " +
        "gerçekleştirilen Robotik Atölyesi etkinliğine katılımınızdan dolayı " +
        "teşekkür ederiz.",
    );
  });

  it("teşekkür belgesi katılımın yanında DESTEĞİ de anar", () => {
    /*
     * İki tür ayrı bitiş cümlesi kuruyor (26 Ağustos 2026 · istek: "bu katılım
     * belgesi için, teşekkür belgesi başka yazı gelecek"). Aynı cümleyi
     * paylaşsalardı teşekkür belgesi katılım belgesinin süslü hâli olurdu.
     */
    const metin = belgeMetniUret({ ...TEMEL, tur: "TESEKKUR" });
    expect(metin.baslik).toBe("Teşekkür Belgesi");
    expect(metin.govde).toBe(
      "Millî Eğitim Bakanlığı Yenilik ve Eğitim Teknolojileri Genel Müdürlüğü " +
        "koordinesinde yürütülen GençTek: Akran Öğrenme Modeli ve Genç Bilişim " +
        "Ekosistemi çalışmaları kapsamında, 12 Mart 2026 tarihinde " +
        "gerçekleştirilen Robotik Atölyesi etkinliğine katılımınız ve " +
        "desteğiniz için teşekkür ederiz.",
    );
    expect(metin.govde).not.toContain("katılımınızdan dolayı");
  });

  /*
   * TARİH GÖVDENİN İÇİNDE (26 Ağustos 2026 · istek: "sol altta da tarih var,
   * tarihi oradan kaldıralım"). Sayfanın köşesinde tek başına duran tarih
   * neyin tarihi olduğunu söylemiyordu.
   */
  it("tarihi gövde cümlesinin içine yazar", () => {
    const metin = belgeMetniUret({ ...TEMEL, tur: "KATILIM" });
    expect(metin.govde).toContain("12 Mart 2026 tarihinde gerçekleştirilen");
  });

  it("koordinasyon cümlesi her iki türde de vardır", () => {
    for (const tur of ["KATILIM", "TESEKKUR"] as const) {
      expect(belgeMetniUret({ ...TEMEL, tur }).govde).toContain(
        "Yenilik ve Eğitim Teknolojileri Genel Müdürlüğü koordinesinde",
      );
    }
  });

  it("özel metin verildiğinde gövdeyi tamamen değiştirir", () => {
    // Teşekkür belgesi çoğu zaman konuşmacıya ya da destek veren kuruma
    // yazılır; kalıp cümle oraya uymaz.
    const metin = belgeMetniUret({
      ...TEMEL,
      tur: "TESEKKUR",
      ozelMetin: "  Atölyenin yürütülmesindeki desteği için.  ",
    });
    expect(metin.govde).toBe("Atölyenin yürütülmesindeki desteği için.");
  });

  it("özel metin verildiğinde tarih ve kalıp cümle de girmez", () => {
    const metin = belgeMetniUret({
      ...TEMEL,
      tur: "TESEKKUR",
      ozelMetin: "Destekleri için.",
    });
    expect(metin.govde).not.toContain("12 Mart 2026");
    expect(metin.govde).not.toContain("koordinesinde");
  });

  it("boş özel metin kalıbı bozmaz", () => {
    const metin = belgeMetniUret({ ...TEMEL, tur: "KATILIM", ozelMetin: "   " });
    expect(metin.govde).toContain("katılımınızdan dolayı teşekkür ederiz");
  });

  it("adı kırpar", () => {
    const metin = belgeMetniUret({
      ...TEMEL,
      tur: "KATILIM",
      adSoyad: "  Elif Yılmaz  ",
    });
    expect(metin.adSoyad).toBe("Elif Yılmaz");
  });

  it("tarih ÜRETİM tarihi değil, verilen tarihtir", () => {
    // Belgede faaliyetin tarihi yazar; belgeyi ne zaman bastığınız değil.
    expect(belgeMetniUret({ ...TEMEL, tur: "KATILIM" }).govde).toContain(
      "12 Mart 2026",
    );
  });
});

describe("belgeTuruMu", () => {
  it("tanımlı türleri tanır", () => {
    expect(belgeTuruMu("KATILIM")).toBe(true);
    expect(belgeTuruMu("TESEKKUR")).toBe(true);
  });

  it("tanımsız türü reddeder", () => {
    expect(belgeTuruMu("ODUL")).toBe(false);
  });

  it("her türün ekran etiketi vardır", () => {
    for (const tur of ["KATILIM", "TESEKKUR"] as const) {
      expect(BELGE_TURU_ETIKETLERI[tur]).toBeTruthy();
    }
  });
});

describe("aliciAdiniCoz", () => {
  it("adı kırpar ve iç boşlukları teke indirir", () => {
    expect(aliciAdiniCoz("  Ayşe   Demir  ")).toEqual({
      olurMu: true,
      adSoyad: "Ayşe Demir",
    });
  });

  it("boş adı reddeder", () => {
    const sonuc = aliciAdiniCoz("   ");
    expect(sonuc.olurMu).toBe(false);
    if (!sonuc.olurMu) expect(sonuc.neden).toContain("kime verileceği");
  });

  it("çok uzun adı reddeder", () => {
    expect(aliciAdiniCoz("a".repeat(121)).olurMu).toBe(false);
  });

  it("sistemde kaydı olmayan kişi de alıcı olabilir", () => {
    // Teşekkür belgesi dışarıdan gelen konuşmacıya da yazılır; alıcının
    // sistemde kullanıcı kaydı olması ZORUNLU DEĞİL.
    expect(aliciAdiniCoz("Prof. Dr. Mehmet Kaya").olurMu).toBe(true);
  });
});

/*
 * İMZA MAKAMI (J5 · 6 Ağustos 2026).
 *
 * Eskiden imza OTURUM KİŞİSİNDEN geliyordu: belgeyi kim ürettiyse adı imzaya
 * yazılıyordu. Bu yanlıştı — belgeyi hazırlayan öğretmen ile imzalayan makam
 * aynı kişi değil. Unvan artık kapsamdan türetiliyor, ad ise elle giriliyor
 * (sistemde okul müdürünün adı TUTULMUYOR ve e-Okul'dan da gelmiyor).
 */
describe("imza makamı", () => {
  it("okul kapsamında okul müdürünü önerir", () => {
    expect(imzaUnvaniOner("OKUL")).toBe("Okul Müdürü");
  });

  it("il kapsamında il millî eğitim müdürünü önerir", () => {
    expect(imzaUnvaniOner("IL")).toBe("İl Millî Eğitim Müdürü");
  });

  it("ulusal kapsamda öneri ÜRETMEZ", () => {
    // İstekte belirtilmedi; uydurmak resmî belgeye olmayan bir makam yazmak
    // olurdu. Çağıran, düzenleyen birimi kullanır.
    expect(imzaUnvaniOner("ULUSAL")).toBeNull();
  });

  it("adı zorunlu tutar", () => {
    const karar = imzaBilgisiniCoz({
      adSoyad: "   ",
      unvan: "Okul Müdürü",
      varsayilanUnvan: "Okul Müdürü",
    });
    expect(karar.olurMu).toBe(false);
    if (!karar.olurMu) expect(karar.neden).toContain("imzalayacak kişinin adı");
  });

  it("adı kırpar ve iç boşlukları tekler", () => {
    const karar = imzaBilgisiniCoz({
      adSoyad: "  Mehmet   Kaya ",
      unvan: "",
      varsayilanUnvan: "Okul Müdürü",
    });
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) expect(karar.adSoyad).toBe("Mehmet Kaya");
  });

  it("unvan boşsa varsayılana düşer", () => {
    const karar = imzaBilgisiniCoz({
      adSoyad: "Mehmet Kaya",
      unvan: "  ",
      varsayilanUnvan: "İl Millî Eğitim Müdürü",
    });
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) expect(karar.unvan).toBe("İl Millî Eğitim Müdürü");
  });

  it("elle yazılan unvan varsayılanı ezer", () => {
    const karar = imzaBilgisiniCoz({
      adSoyad: "Mehmet Kaya",
      unvan: "Okul Müdür Yardımcısı",
      varsayilanUnvan: "Okul Müdürü",
    });
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) expect(karar.unvan).toBe("Okul Müdür Yardımcısı");
  });

  it("çok uzun adı reddeder", () => {
    const karar = imzaBilgisiniCoz({
      adSoyad: "a".repeat(121),
      unvan: "",
      varsayilanUnvan: "Okul Müdürü",
    });
    expect(karar.olurMu).toBe(false);
  });
});
