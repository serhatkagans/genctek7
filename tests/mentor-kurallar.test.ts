import {
  basHarfler,
  danismanMentorlukKarariGecerliMi,
  MENTOR_KONULARI_AZAMI,
  mentorKapsamiYaz,
  mentorlukKabulEdilirMi,
  mentorlukKarariGecerliMi,
  mentorluguAktifMi,
  mentorSifati,
} from "@/lib/mentor/kurallar";

/**
 * Mentörlük kuralları (7 Ağustos 2026).
 *
 * İstek iki yerden geldi ve tek kayıtta toplandı:
 *   · "Öğretmen hesabında 'mentör başvurusu yap' bölümü ekleyelim..."
 *   · "Paydaş/Mentör başvurusu tek bir formdan yapılacak."
 *
 * Sınanan şey ekran değil KARARDIR: hangi başvuru kabul edilir, hangi karar
 * geçerlidir, kim aktif mentör sayılır.
 */

const GRUPLAR = [1, 2, 3];

function girdi(ozellikler: Record<string, unknown> = {}) {
  return {
    grupIdleri: [] as unknown[],
    konular: "",
    gecerliGrupIdleri: GRUPLAR,
    ...ozellikler,
  };
}

describe("mentörlük başvurusunun kabulü", () => {
  it("çalışma grubu seçilmişse kabul eder", () => {
    const karar = mentorlukKabulEdilirMi(girdi({ grupIdleri: ["2"] }));
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) expect(karar.grupIdleri).toEqual([2]);
  });

  it("serbest konu yazılsa da grup seçilmemişse reddeder", () => {
    /*
     * 21 Ağustos 2026 · istek: "listeden bir tik seçmeden başvurusu
     * onaylanmasın". Grupsuz mentörlük panodaki ilanlarla eşleşmiyordu:
     * eşleştirme çalışma grubu üzerinden yürüyor.
     */
    const karar = mentorlukKabulEdilirMi(girdi({ konular: "  Arduino  " }));
    expect(karar.olurMu).toBe(false);
  });

  it("serbest konu grupla birlikte kırpılarak saklanır", () => {
    const karar = mentorlukKabulEdilirMi(
      girdi({ grupIdleri: ["1"], konular: "  Arduino  " }),
    );
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) {
      expect(karar.konular).toBe("Arduino");
      expect(karar.grupIdleri).toEqual([1]);
    }
  });

  it("hiçbir grup seçilmemişse reddeder", () => {
    /*
     * Boş bir mentörlük, öğrencinin hangi konuda başvuracağını bilemeyeceği
     * bir kayıttır: panoda görünür ama hiçbir ilana eşleşmez.
     */
    const karar = mentorlukKabulEdilirMi(girdi({ konular: "   " }));
    expect(karar.olurMu).toBe(false);
  });

  it("listede olmayan grup kimliğini eler", () => {
    // Form girdisine güvenilseydi kapatılmış bir gruba mentörlük beyan
    // edilebilirdi.
    const karar = mentorlukKabulEdilirMi(
      girdi({ grupIdleri: ["2", "99"], konular: "" }),
    );
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) expect(karar.grupIdleri).toEqual([2]);
  });

  it("tekrarlanan grubu teke indirir", () => {
    // Junction tablonun birincil anahtarı çakışırdı.
    const karar = mentorlukKabulEdilirMi(girdi({ grupIdleri: ["3", "3", "1"] }));
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) expect(karar.grupIdleri).toEqual([3, 1]);
  });

  it("sayıya çevrilemeyen kimliği eler", () => {
    // Elemeden sonra geriye grup kalmıyor: serbest konu dolu olsa bile
    // başvuru kabul edilmez.
    const karar = mentorlukKabulEdilirMi(
      girdi({ grupIdleri: ["abc"], konular: "Robotik" }),
    );
    expect(karar.olurMu).toBe(false);
  });

  it("konu üst sınırını aşarsa reddeder", () => {
    const karar = mentorlukKabulEdilirMi(
      girdi({
        grupIdleri: ["1"],
        konular: "x".repeat(MENTOR_KONULARI_AZAMI + 1),
      }),
    );
    expect(karar.olurMu).toBe(false);
  });
});

describe("mentörlük kararı", () => {
  it("bekleyen başvuruyu onaylar", () => {
    const karar = mentorlukKarariGecerliMi({
      mevcutDurum: "BEKLIYOR",
      yeniDurum: "ONAYLANDI",
      retGerekcesi: "",
    });
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) expect(karar.retGerekcesi).toBeNull();
  });

  it("gerekçesiz reddi kabul etmez", () => {
    // Gerekçesiz ret, kişiye tekrar başvururken neyi düzelteceğini söylemez.
    const karar = mentorlukKarariGecerliMi({
      mevcutDurum: "BEKLIYOR",
      yeniDurum: "REDDEDILDI",
      retGerekcesi: "   ",
    });
    expect(karar.olurMu).toBe(false);
  });

  it("zaten karara bağlanmış kaydı ikinci kez karara bağlamaz", () => {
    /*
     * İkinci onay, karar tarihini sessizce kaydırır ve "ne zaman onaylandı"
     * sorusunun cevabını bozar.
     */
    const karar = mentorlukKarariGecerliMi({
      mevcutDurum: "ONAYLANDI",
      yeniDurum: "ONAYLANDI",
      retGerekcesi: "",
    });
    expect(karar.olurMu).toBe(false);
  });

  /*
   * KENDİ BAŞVURUSUNU ONAYLAMA (11 Ağustos 2026 · istek: "il koordinatörü
   * mentörlüğe başvurunca kendi kendini onaylıyor").
   *
   * Onay yetkisi merkeze alındı ama kural yetkiden bağımsız olarak da
   * duruyor: proje yöneticisi de mentör olabiliyor.
   */
  it("kişi kendi başvurusunu karara bağlayamaz", () => {
    for (const yeniDurum of ["ONAYLANDI", "REDDEDILDI"] as const) {
      const karar = mentorlukKarariGecerliMi({
        mevcutDurum: "BEKLIYOR",
        yeniDurum,
        retGerekcesi: "Gerekçe yazıldı",
        kendiBasvurusuMu: true,
      });
      expect(karar.olurMu).toBe(false);
    }
  });

  it("başkasının başvurusu karara bağlanabilir", () => {
    const karar = mentorlukKarariGecerliMi({
      mevcutDurum: "BEKLIYOR",
      yeniDurum: "ONAYLANDI",
      retGerekcesi: "",
      kendiBasvurusuMu: false,
    });
    expect(karar.olurMu).toBe(true);
  });

  it("bırakılmış kaydı da doğrudan karara bağlamaz", () => {
    // Doğru yol kişinin yeniden başvurmasıdır; o zaman kayıt BEKLIYOR'a döner.
    const karar = mentorlukKarariGecerliMi({
      mevcutDurum: "BIRAKILDI",
      yeniDurum: "ONAYLANDI",
      retGerekcesi: "",
    });
    expect(karar.olurMu).toBe(false);
  });
});

describe("aktif mentörlük", () => {
  it("yalnızca ONAYLANDI aktiftir", () => {
    expect(mentorluguAktifMi("ONAYLANDI")).toBe(true);
    expect(mentorluguAktifMi("BEKLIYOR")).toBe(false);
    expect(mentorluguAktifMi("REDDEDILDI")).toBe(false);
    expect(mentorluguAktifMi("BIRAKILDI")).toBe(false);
    expect(mentorluguAktifMi(null)).toBe(false);
  });
});

describe("mentör kapsamının yazılışı", () => {
  it("grup adlarıyla serbest konuları tek listede birleştirir", () => {
    /*
     * Öğrenci için ikisi de "bu kişi neyi biliyor" sorusunun cevabıdır;
     * hangisinin sabit listeden geldiği onu ilgilendirmiyor.
     */
    expect(mentorKapsamiYaz(["Robotik", "Siber Güvenlik"], "Arduino")).toBe(
      "Robotik · Siber Güvenlik · Arduino",
    );
  });

  it("konu boşsa yalnızca grupları yazar", () => {
    expect(mentorKapsamiYaz(["Robotik"], "   ")).toBe("Robotik");
  });

  it("hiçbiri yoksa boş döner", () => {
    expect(mentorKapsamiYaz([], null)).toBe("");
  });
});

describe("kart avatarındaki baş harfler", () => {
  /*
   * Fotoğrafı olmayan mentörün yerine basılıyor. Pano havuzu ve mentörlük onay
   * kuyruğu aynı hesabı kullanıyor (12 Ağustos 2026); ayrı yazıldıklarında iki
   * ekran aynı kişiyi farklı harflerle gösterebiliyordu.
   */
  it("ad ve soyadın ilk harflerini büyütür", () => {
    expect(basHarfler("Selin Mentör")).toBe("SM");
  });

  it("üç adlı kişide ilk iki harfle yetinir", () => {
    // Daire dolar ve harfler okunmaz hâle gelirdi.
    expect(basHarfler("Ayşe Nur Yılmaz")).toBe("AN");
  });

  it("Türkçe küçük i'yi İ'ye çevirir", () => {
    // "ilker" varsayılan büyütmeyle "Ilker"in harfini verirdi.
    expect(basHarfler("ilker deniz")).toBe("İD");
  });

  it("fazladan boşluklardan harf üretmez", () => {
    expect(basHarfler("  Mert   Kaya ")).toBe("MK");
  });

  it("boş adda boş döner", () => {
    // Kart yine de basılır; daire boş kalır, hata vermez.
    expect(basHarfler("   ")).toBe("");
  });
});

describe("havuz kartındaki mentör sıfatı", () => {
  it("rolsüz öğretmene 'Öğretmen' der", () => {
    /*
     * ASIL VAKA. Mentörlüğe görev almamış öğretmen de başvurabiliyor
     * (mentorlukBasvurabilirMi) ve onun rol listesi BOŞTUR. Boş bırakılsaydı
     * kartta yalnızca ad görünür, öğrenci karşısındakinin öğretmen olduğunu
     * anlamazdı.
     */
    expect(mentorSifati([], null)).toBe("Öğretmen");
  });

  it("branşı parantez içinde ekler", () => {
    // Mentör seçerken en çok işe yarayan ayrım budur.
    expect(mentorSifati([], "Bilişim Teknolojileri")).toBe(
      "Öğretmen (Bilişim Teknolojileri)",
    );
    expect(mentorSifati([{ rolKodu: "DANISMAN" }], "Fizik")).toBe(
      "Danışman öğretmen (Fizik)",
    );
  });

  it("dış kullanıcının sıfatını yazar", () => {
    expect(mentorSifati([{ rolKodu: "MEZUN" }], null)).toBe("Mezun");
    expect(mentorSifati([{ rolKodu: "PAYDAS_TEMSILCISI" }], null)).toBe(
      "Paydaş temsilcisi",
    );
  });

  it("birden çok rolde ilkini yazar", () => {
    // Kart tek satırlık bir sıfat taşıyor; hepsini yazmak öğrencinin sorduğu
    // soruya bir şey katmıyor.
    expect(
      mentorSifati([{ rolKodu: "DANISMAN" }, { rolKodu: "IL_KOORDINATOR" }], null),
    ).toBe("Danışman öğretmen");
  });

  it("boş branşı parantezle basmaz", () => {
    expect(mentorSifati([{ rolKodu: "MEZUN" }], "   ")).toBe("Mezun");
  });

  it("tanınmayan rol kodunda öğretmene düşer", () => {
    // Rol listesi büyürse kart boş sıfat basmaktansa güvenli bir varsayılana
    // düşsün; ekran hiçbir hâlde adsız bir satır göstermemeli.
    expect(mentorSifati([{ rolKodu: "YENI_ROL" }], null)).toBe("Öğretmen");
  });
});

/**
 * DANIŞMANIN KENDİ ÖĞRENCİSİ İÇİN VERDİĞİ KARAR (26 Ağustos 2026).
 *
 * Merkezin kuyruğundan ayrı bir kural ve testleri de ayrı: ikisi aynı yerde
 * denenirse "onaylanmış kayıt ikinci kez onaylanamaz" kısıtının hangisine ait
 * olduğu kaybolur.
 */
describe("danismanMentorlukKarariGecerliMi", () => {
  it("bekleyen başvuruyu onaylar", () => {
    expect(
      danismanMentorlukKarariGecerliMi({
        mevcutDurum: "BEKLIYOR",
        yeniDurum: "ONAYLANDI",
        gerekce: "",
      }),
    ).toEqual({ olurMu: true, retGerekcesi: null });
  });

  it("reddedilmiş ve bırakılmış kaydı yeniden mentör yapabilir", () => {
    // Merkezin kuyruğundan ayrılan yer burası: bir kez reddedilen öğrenci için
    // ekran kalıcı bir çıkmaz olmamalı.
    for (const mevcutDurum of ["REDDEDILDI", "BIRAKILDI"] as const) {
      expect(
        danismanMentorlukKarariGecerliMi({
          mevcutDurum,
          yeniDurum: "ONAYLANDI",
          gerekce: "",
        }).olurMu,
      ).toBe(true);
    }
  });

  it("başvurusu olmayan öğrenciyi mentör yapmaz", () => {
    // Boş kayıt, havuzda uzmanlık satırı boş bir kart ve hiçbir ilana
    // düşmeyen bir mentör demek olurdu.
    const sonuc = danismanMentorlukKarariGecerliMi({
      mevcutDurum: null,
      yeniDurum: "ONAYLANDI",
      gerekce: "",
    });
    expect(sonuc.olurMu).toBe(false);
  });

  it("zaten onaylı mentörü ikinci kez onaylamaz", () => {
    expect(
      danismanMentorlukKarariGecerliMi({
        mevcutDurum: "ONAYLANDI",
        yeniDurum: "ONAYLANDI",
        gerekce: "",
      }).olurMu,
    ).toBe(false);
  });

  it("onaylı mentörlüğü gerekçeyle kaldırır", () => {
    expect(
      danismanMentorlukKarariGecerliMi({
        mevcutDurum: "ONAYLANDI",
        yeniDurum: "REDDEDILDI",
        gerekce: "  Sınav dönemine giriyor, ara veriyoruz.  ",
      }),
    ).toEqual({
      olurMu: true,
      retGerekcesi: "Sınav dönemine giriyor, ara veriyoruz.",
    });
  });

  it("kaldırmada kısa ya da boş gerekçeyi kabul etmez", () => {
    // Gerekçe öğrenciye bildirim metninde gidiyor; boşluk doldurmak da sayılmaz.
    for (const gerekce of ["", "   ", "kısa"]) {
      expect(
        danismanMentorlukKarariGecerliMi({
          mevcutDurum: "ONAYLANDI",
          yeniDurum: "REDDEDILDI",
          gerekce,
        }).olurMu,
      ).toBe(false);
    }
  });

  it("onaylı olmayan bir kaydı kaldırmaya kalkışmaz", () => {
    expect(
      danismanMentorlukKarariGecerliMi({
        mevcutDurum: "BEKLIYOR",
        yeniDurum: "REDDEDILDI",
        gerekce: "Yeterince uzun bir gerekçe metni.",
      }).olurMu,
    ).toBe(false);
  });
});
