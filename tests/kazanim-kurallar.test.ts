import {
  BILISIM_YOLCULUGU_TIPLERI,
  GENCTEK_YOLCULUGU_TIPLERI,
  KAZANIM_TIPLERI,
  BILISIM_YOLCULUGU_GRUPLARI,
  bilisimYolculuguGruplari,
  grupsuzBilisimTipleri,
  kazanimBolumuBulunmayan,
  kazanimKabulEdilirMi,
  kazanimTipiArsivlenmisMi,
  kazanimTipiGecerliMi,
  kazanimTipiTanimi,
  kazanimTipleri,
} from "@/lib/kazanim/kurallar";

/**
 * Kişinin kendi girdiği kazanım kayıtları — references/domain-rules.md
 * Bölüm 14.
 *
 * Kayıt bir BEYANDIR; testler doğruluğu değil biçimsel kabulü sınıyor.
 */

const girdi = (
  ozellikler: Partial<Parameters<typeof kazanimKabulEdilirMi>[0]> = {},
) => ({
  tip: "URUN",
  baslik: "Okul kütüphanesi mobil uygulaması",
  ...ozellikler,
});

/** Testte sık gereken: kabul edilen kaydı çıkarır, reddedilirse patlar. */
function kabulEdilenKayit(
  ozellikler: Partial<Parameters<typeof kazanimKabulEdilirMi>[0]> = {},
) {
  const karar = kazanimKabulEdilirMi(girdi(ozellikler));
  if (!karar.olurMu) {
    throw new Error(`Kayıt beklenmedik şekilde reddedildi: ${karar.neden}`);
  }
  return karar.kayit;
}

describe("kazanım türleri", () => {
  it("sekiz türü kapsar", () => {
    /*
     * GENCTEK_ETKINLIGI ve DIGER sonradan eklendi; SERTIFIKA ve TOPLULUK
     * 6 Ağustos 2026'da (D3, D4). İkisi de AYRI TABLO açılmadan tip olarak
     * eklendi: aynı form, aynı doğrulama, aynı silme yolu ikinci kez
     * yazılmasın diye. GençTek katılımı normalde
     * otomatik gelir (basvuru + faaliyet); elle giriş, sisteme girilmemiş eski
     * etkinlikler için BEYAN olarak açıldı. Rozetler bu kayıtlardan
     * hesaplanmadığı için beyanla nişan kazanılamaz.
     */
    expect(KAZANIM_TIPLERI.map((tanim) => tanim.tip).sort()).toEqual([
      "AKRAN_EGITIMI",
      "DIGER",
      "DIS_ETKINLIK",
      "GENCTEK_ETKINLIGI",
      "SERTIFIKA",
      "TOPLULUK",
      "URUN",
      "YARISMA_DERECESI",
    ]);
  });

  it("derece alanını yalnızca yarışmada sorar", () => {
    const dereceli = KAZANIM_TIPLERI.filter((tanim) => tanim.dereceVarMi);
    expect(dereceli.map((tanim) => tanim.tip)).toEqual(["YARISMA_DERECESI"]);
  });

  it("düzenleyen kurumu üründe sormaz", () => {
    expect(kazanimTipiTanimi("URUN").duzenleyenVarMi).toBe(false);
  });

  it("tanımsız tipi geçersiz sayar", () => {
    expect(kazanimTipiGecerliMi("ROZET")).toBe(false);
    expect(kazanimTipiGecerliMi("URUN")).toBe(true);
  });
});

/*
 * Profil iki bölüme ayrıldı: GençTek Yolculuğum (GençTek İÇİNDE yapılanlar) ve
 * Bilişim Yolculuğum (dışında yapılanlar). Bir tip ikisine de girmezse kullanıcı
 * o kaydı girer ve profilinde HİÇBİR YERDE göremez — hata da almaz. Bu yüzden
 * bölümleme burada sınanıyor, ekranda değil.
 */
describe("profil yolculuk bölümleri", () => {
  it("her kazanım tipini bir bölüme yerleştirir", () => {
    expect(kazanimBolumuBulunmayan()).toEqual([]);
  });

  it("aynı tipi iki bölüme birden koymaz", () => {
    const kesisim = GENCTEK_YOLCULUGU_TIPLERI.filter((tip) =>
      BILISIM_YOLCULUGU_TIPLERI.includes(tip),
    );
    expect(kesisim).toEqual([]);
  });

  it("GençTek tarafında yalnızca akran eğitimi durur", () => {
    /*
     * GENCTEK_ETKINLIGI 7 Ağustos 2026'da ÇIKARILDI. Katılım artık üretilen
     * belgeden doğuyor (lib/kazanim/katilim-kurallar.ts) ve istek beyan
     * bölümünün kaldırılmasını söylüyor: "Beyan Ettiği GençTek Etkinlikleri
     * kaldırılacak".
     */
    expect([...GENCTEK_YOLCULUGU_TIPLERI].sort()).toEqual(["AKRAN_EGITIMI"]);
  });
});

/*
 * BİLİŞİM YOLCULUĞUNUN ÜÇ GRUBU (7 Ağustos 2026).
 *
 * İstek: "Bilişim Yolculuğum → Ürünlerim / Deneyimlerim (GençTek Dışı
 * Etkinlikler/Derece/Ödül, Sertifika/Eğitim) / Topluluklarım/Ekiplerim".
 *
 * Gruplar bir EKRAN DÜZENİDİR, tipleri değiştirmez. Ama düzen ile tip listesi
 * ayrışırsa bir kayıt ya profilde iki kez görünür ya hiç görünmez — ikisi de
 * sessiz hatadır ve ancak kullanıcı "girdim, göremiyorum" dediğinde fark
 * edilir. Testin işi bu.
 */
describe("bilişim yolculuğu grupları", () => {
  it("üç başlığı istekteki sırayla verir", () => {
    expect(BILISIM_YOLCULUGU_GRUPLARI.map((grup) => grup.kod)).toEqual([
      "URUNLERIM",
      "DENEYIMLERIM",
      "TOPLULUKLARIM",
    ]);
  });

  it("gruplanmamış bilişim tipi bırakmaz", () => {
    expect(grupsuzBilisimTipleri()).toEqual([]);
  });

  it("aynı tipi iki gruba birden koymaz", () => {
    const hepsi = BILISIM_YOLCULUGU_GRUPLARI.flatMap((grup) => [...grup.tipler]);
    expect(hepsi.length).toBe(new Set(hepsi).size);
  });

  it("deneyimler dört türü toplar", () => {
    const deneyimler = BILISIM_YOLCULUGU_GRUPLARI.find(
      (grup) => grup.kod === "DENEYIMLERIM",
    );
    /*
     * 22 AĞUSTOS 2026 · istek: "Deneyimlerim açılır menüde GençTek
     * etkinliklerim, derecelerim, sertifikalarım ve GençTek dışı etkinlikler
     * olacak — 4 madde". Dört kaldı ama biri değişti: DIGER kapandı, yerine
     * GENCTEK_ETKINLIGI açıldı.
     */
    expect([...(deneyimler?.tipler ?? [])].sort()).toEqual([
      "DIS_ETKINLIK",
      "GENCTEK_ETKINLIGI",
      "SERTIFIKA",
      "YARISMA_DERECESI",
    ]);
  });

  it("grup listesi arşivlenmiş tip taşımaz", () => {
    const tipler = bilisimYolculuguGruplari().flatMap((bolum) =>
      bolum.tanimlar.map((tanim) => tanim.tip),
    );
    expect(tipler).not.toContain("DIGER");
  });

  /*
   * 10 AĞUSTOS 2026 · istek: "profil sayfasındaki Ürünlerim ve katkılarım, bu
   * bölümde sadece ürünlerim olsun, öğretmen için Deneyimlerim ve
   * Topluluklarım / Ekiplerim kalksın."
   *
   * Testin işi, kapanmanın yalnızca ÖĞRETMENDE olduğunu ve öğrencinin üç
   * grubuna dokunulmadığını sabitlemek.
   */
  it("öğretmende yalnızca Ürünlerim grubu kalır", () => {
    const ogretmen = bilisimYolculuguGruplari("OGRETMEN");
    expect(ogretmen.map((b) => b.grup.kod)).toEqual(["URUNLERIM"]);
    expect(ogretmen.flatMap((b) => b.tanimlar.map((t) => t.tip))).toEqual([
      "URUN",
    ]);
  });

  it("öğrencide üç grup da durur", () => {
    expect(bilisimYolculuguGruplari("OGRENCI").map((b) => b.grup.kod)).toEqual([
      "URUNLERIM",
      "DENEYIMLERIM",
      "TOPLULUKLARIM",
    ]);
  });
});

/*
 * ARŞİVLENMİŞ TİPLER (7 Ağustos 2026).
 *
 * Kapatılan tip enum'dan SİLİNMEZ — girilmiş kayıtlar kullanıcının verisidir.
 * Silinseydi eski satırlar okunamaz hâle gelirdi. Bunun yerine tip yeni kayıt
 * kabul etmiyor ve sekme listesinden düşüyor.
 */
describe("arşivlenmiş kazanım tipleri", () => {
  it("\"Diğer\" kaydını arşivlenmiş sayar", () => {
    expect(kazanimTipiArsivlenmisMi("DIGER")).toBe(true);
    expect(kazanimTipiArsivlenmisMi("SERTIFIKA")).toBe(false);
    // 22 Ağustos 2026'da yeniden açıldı; kapalı olmadığı da sabitleniyor.
    expect(kazanimTipiArsivlenmisMi("GENCTEK_ETKINLIGI")).toBe(false);
  });

  it("sekme listesinde arşivlenmiş tipi göstermez", () => {
    expect(kazanimTipleri().map((tanim) => tanim.tip)).not.toContain("DIGER");
  });

  it("eski kayıtları yönetebilmek için arşiv dahil listeyi verebilir", () => {
    expect(
      kazanimTipleri("OGRENCI", { arsivDahil: true }).map((tanim) => tanim.tip),
    ).toContain("GENCTEK_ETKINLIGI");
  });

  it("arşivlenmiş tipte YENİ kayıt kabul etmez", () => {
    /*
     * Sunucu kontrolü şart: sekmeyi ekrandan kaldırmak, adres çubuğuna
     * `?tur=GENCTEK_ETKINLIGI` yazan birini durdurmaz — ve o kayıt profilde
     * hiçbir yerde görünmediği için kullanıcı kaydettiğini sanıp kaybederdi.
     */
    const karar = kazanimKabulEdilirMi({
      tip: "GENCTEK_ETKINLIGI",
      baslik: "Genç Gölge — Ankara",
    });
    expect(karar.olurMu).toBe(false);
  });

  it("arşivlenmiş tipteki VAR OLAN kaydın düzenlenmesine izin verir", () => {
    /*
     * 24 Ağustos 2026 · kayıtlar kendi sayfasında düzenlenebilir oldu
     * (bkz. panel/kayitlarim/[id]). Tip kapandığında kayıtlar silinmiyor;
     * sahibinin yazım hatasını düzeltememesi için bir sebep yok. Kapı YENİ
     * kayda kapalı kalıyor — aynı girdi `mevcutKayit` olmadan reddediliyor.
     */
    const girdi = {
      tip: "DIGER",
      baslik: "Mahalle kütüphanesi gönüllülüğü",
      katilimBicimi: "YUZ_YUZE",
    };

    expect(kazanimKabulEdilirMi(girdi).olurMu).toBe(false);
    expect(kazanimKabulEdilirMi(girdi, { mevcutKayit: true }).olurMu).toBe(true);
  });

  it("arşivlenmiş tip yolculuk bölümü eksiği saymaz", () => {
    // Bölümü olmaması kural gereği; `kazanimBolumuBulunmayan` onu aramamalı.
    expect(kazanimBolumuBulunmayan()).toEqual([]);
  });
});

/*
 * Kazanım kaydını öğretmen de girer. Sahip yalnızca ETİKETLERİ değiştirir:
 * alan kuralları değişseydi aynı kayıt, girenin rolüne göre farklı doğrulanır
 * ve öğretmenlikten ayrılan birinin kaydı geçersiz hâle gelirdi.
 */
describe("kazanım türlerinin öğretmen karşılığı", () => {
  it("aynı dört türü aynı sırayla verir", () => {
    expect(kazanimTipleri("OGRETMEN").map((tanim) => tanim.tip)).toEqual(
      kazanimTipleri("OGRENCI").map((tanim) => tanim.tip),
    );
  });

  it("alan kurallarını sahibe göre değiştirmez", () => {
    for (const ogrenciTanim of kazanimTipleri("OGRENCI")) {
      const ogretmenTanim = kazanimTipiTanimi(ogrenciTanim.tip, "OGRETMEN");
      expect({
        derece: ogretmenTanim.dereceVarMi,
        duzenleyen: ogretmenTanim.duzenleyenVarMi,
        program: ogretmenTanim.programSecimiVarMi,
        katilim: ogretmenTanim.katilimBicimiVarMi,
        hedefKitle: ogretmenTanim.hedefKitleVarMi,
      }).toEqual({
        derece: ogrenciTanim.dereceVarMi,
        duzenleyen: ogrenciTanim.duzenleyenVarMi,
        program: ogrenciTanim.programSecimiVarMi,
        katilim: ogrenciTanim.katilimBicimiVarMi,
        hedefKitle: ogrenciTanim.hedefKitleVarMi,
      });
    }
  });

  // Öğretmenin öğrencisine verdiği eğitim "akran" eğitimi değildir; kaydın ne
  // olduğunu yanlış anlatan bir başlık göstermemek için metin ayrışıyor.
  it("akran eğitimi başlığını öğretmende kullanmaz", () => {
    expect(kazanimTipiTanimi("AKRAN_EGITIMI", "OGRETMEN").baslik).toBe(
      "Verdiğim eğitimler",
    );
    expect(kazanimTipiTanimi("AKRAN_EGITIMI").baslik).toBe(
      "Verdiğim akran eğitimleri",
    );
  });

  it("sahip verilmediğinde öğrenci metinlerine düşer", () => {
    expect(kazanimTipiTanimi("URUN")).toEqual(
      kazanimTipiTanimi("URUN", "OGRENCI"),
    );
  });

  it("öğretmen metni yazılmayan türde öğrenci metnini korur", () => {
    expect(kazanimTipiTanimi("DIS_ETKINLIK", "OGRETMEN").baslik).toBe(
      kazanimTipiTanimi("DIS_ETKINLIK").baslik,
    );
  });
});

describe("kazanım kaydı kabulü", () => {
  it("geçerli kaydı kabul eder ve alanları kırpar", () => {
    const kayit = kabulEdilenKayit({
      baslik: "  Kütüphane uygulaması  ",
      aciklama: "  React Native ile yazdım.  ",
    });
    expect(kayit.baslik).toBe("Kütüphane uygulaması");
    expect(kayit.aciklama).toBe("React Native ile yazdım.");
  });

  it("başlık boşsa reddeder", () => {
    const karar = kazanimKabulEdilirMi(girdi({ baslik: "   " }));
    expect(karar.olurMu).toBe(false);
  });

  it("başlık 250 karakteri aşarsa reddeder", () => {
    const karar = kazanimKabulEdilirMi(girdi({ baslik: "a".repeat(251) }));
    expect(karar.olurMu).toBe(false);
  });

  it("bilinmeyen türü reddeder", () => {
    const karar = kazanimKabulEdilirMi(girdi({ tip: "MODERATORLUK" }));
    expect(karar.olurMu).toBe(false);
  });

  it("boş metin alanlarını null'a çevirir", () => {
    const kayit = kabulEdilenKayit({ aciklama: "", baglantiUrl: "" });
    expect(kayit.aciklama).toBeNull();
    expect(kayit.baglantiUrl).toBeNull();
  });
});

describe("bağlantı adresi", () => {
  it("https adresini kabul eder", () => {
    const kayit = kabulEdilenKayit({ baglantiUrl: "https://ornek.gov.tr/proje" });
    expect(kayit.baglantiUrl).toBe("https://ornek.gov.tr/proje");
  });

  it("javascript: şemasını reddeder", () => {
    // Profil sayfası bu adresi tıklanabilir bağlantı olarak basıyor; kabul
    // edilseydi profile bakan danışmanın tarayıcısında kod çalışırdı.
    const karar = kazanimKabulEdilirMi(
      girdi({ baglantiUrl: "javascript:alert(1)" }),
    );
    expect(karar.olurMu).toBe(false);
  });

  it("şemasız adresi reddeder", () => {
    const karar = kazanimKabulEdilirMi(girdi({ baglantiUrl: "ornek.gov.tr" }));
    expect(karar.olurMu).toBe(false);
  });
});

describe("türe uymayan alanlar", () => {
  it("üründe gelen dereceyi sessizce düşürür", () => {
    const kayit = kabulEdilenKayit({ tip: "URUN", derece: "Türkiye 1.si" });
    expect(kayit.derece).toBeNull();
  });

  it("üründe gelen düzenleyeni sessizce düşürür", () => {
    const kayit = kabulEdilenKayit({ tip: "URUN", duzenleyen: "TÜBİTAK" });
    expect(kayit.duzenleyen).toBeNull();
  });

  it("yarışmada dereceyi ve düzenleyeni saklar", () => {
    const kayit = kabulEdilenKayit({
      tip: "YARISMA_DERECESI",
      baslik: "Ulusal Bilgisayar Olimpiyatları",
      derece: "Türkiye 3.sü",
      duzenleyen: "Bakanlık",
      katilimBicimi: "YUZ_YUZE",
    });
    expect(kayit.derece).toBe("Türkiye 3.sü");
    expect(kayit.duzenleyen).toBe("Bakanlık");
  });

  it("dış etkinlikte düzenleyeni saklar, dereceyi düşürür", () => {
    const kayit = kabulEdilenKayit({
      tip: "DIS_ETKINLIK",
      baslik: "TEKNOFEST",
      duzenleyen: "İl",
      derece: "Birincilik",
      katilimBicimi: "YUZ_YUZE",
    });
    expect(kayit.duzenleyen).toBe("İl");
    expect(kayit.derece).toBeNull();
  });
});

describe("GençTek programı seçimi", () => {
  it("program seçildiğinde adı kopyalar, serbest metni yok sayar", () => {
    /*
     * Ad KOPYALANIR, bağlantıya güvenilmez: program pasife alındığında ya da
     * adı değiştiğinde öğrencinin geçmiş kaydı okunamaz hâle gelmemeli.
     */
    const kayit = kabulEdilenKayit({
      tip: "YARISMA_DERECESI",
      baslik: "kullanıcının yazdığı ad",
      program: { id: 7, ad: "EğitiJAM" },
      katilimBicimi: "KARMA",
    });
    expect(kayit.baslik).toBe("EğitiJAM");
    expect(kayit.temelEtkinlikProgramiId).toBe(7);
  });

  it("program seçilmediğinde serbest metni kullanır", () => {
    const kayit = kabulEdilenKayit({
      tip: "AKRAN_EGITIMI",
      baslik: "Python atölyesi",
      katilimBicimi: "ONLINE",
    });
    expect(kayit.baslik).toBe("Python atölyesi");
    expect(kayit.temelEtkinlikProgramiId).toBeNull();
  });

  it("program seçimi olmayan türde gelen programı düşürür", () => {
    // Ürün ve GençTek DIŞI etkinlik tanımı gereği listede olamaz; değer ancak
    // istek elle kurcalandığında gelir.
    const kayit = kabulEdilenKayit({
      tip: "URUN",
      program: { id: 7, ad: "EğitiJAM" },
    });
    expect(kayit.temelEtkinlikProgramiId).toBeNull();
    expect(kayit.baslik).toBe("Okul kütüphanesi mobil uygulaması");
  });
});

describe("katılım biçimi ve hedef kitle", () => {
  it("akran eğitiminde ikisini de saklar", () => {
    const kayit = kabulEdilenKayit({
      tip: "AKRAN_EGITIMI",
      baslik: "Python atölyesi",
      katilimBicimi: "ONLINE",
      hedefKitle: "9. sınıflar",
    });
    expect(kayit.katilimBicimi).toBe("ONLINE");
    expect(kayit.hedefKitle).toBe("9. sınıflar");
  });

  it("üründe ikisini de düşürür", () => {
    const kayit = kabulEdilenKayit({
      tip: "URUN",
      katilimBicimi: "YUZ_YUZE",
      hedefKitle: "veliler",
    });
    expect(kayit.katilimBicimi).toBeNull();
    expect(kayit.hedefKitle).toBeNull();
  });

  it("yarışmada hedef kitleyi sormaz ama katılım biçimini saklar", () => {
    const kayit = kabulEdilenKayit({
      tip: "YARISMA_DERECESI",
      baslik: "Capture The Flag",
      katilimBicimi: "KARMA",
      hedefKitle: "öğretmenler",
    });
    expect(kayit.katilimBicimi).toBe("KARMA");
    expect(kayit.hedefKitle).toBeNull();
  });

  it("tanımsız katılım biçimini reddeder", () => {
    const karar = kazanimKabulEdilirMi(
      girdi({ tip: "DIS_ETKINLIK", katilimBicimi: "HIBRIT" }),
    );
    expect(karar.olurMu).toBe(false);
  });

  /*
   * 5 Ağustos 2026: alan YENİ kayıtlarda ZORUNLU oldu ("Belirtmek istemiyorum"
   * seçeneği kaldırıldı). Eski kayıtlar geriye dönük DOLDURULMADI ve sütun NULL
   * kabul etmeye devam ediyor — kural yalnızca bu kapıdan geçen yeni kayda
   * uygulanır.
   */
  it("katılım biçimi sorulan türde boş değeri reddeder", () => {
    const karar = kazanimKabulEdilirMi(
      girdi({ tip: "DIS_ETKINLIK", baslik: "TEKNOFEST", katilimBicimi: "" }),
    );
    expect(karar.olurMu).toBe(false);
    if (!karar.olurMu) {
      expect(karar.neden).toBe("Katılım biçimi seçilmelidir.");
    }
  });

  it("katılım biçimi sorulmayan türde boş değeri sorun etmez", () => {
    // Üründe alan hiç gösterilmiyor; zorunluluk oraya sızmamalı.
    expect(kabulEdilenKayit({ tip: "URUN" }).katilimBicimi).toBeNull();
  });

  it("hedef kitle 200 karakteri aşarsa reddeder", () => {
    const karar = kazanimKabulEdilirMi(
      girdi({ tip: "AKRAN_EGITIMI", hedefKitle: "a".repeat(201) }),
    );
    expect(karar.olurMu).toBe(false);
  });
});

describe("tarih", () => {
  it("tarihsiz kayda izin verir", () => {
    expect(kabulEdilenKayit().tarih).toBeNull();
  });

  it("çözümlenemeyen tarihi reddeder", () => {
    const karar = kazanimKabulEdilirMi(girdi({ tarih: new Date("olmayan") }));
    expect(karar.olurMu).toBe(false);
  });
});

describe("beyan edilen GençTek etkinliği", () => {
  it('"Diğer" listenin SONUNDA durur', () => {
    // Başta olsaydı kullanıcı diğer tipleri okumadan onu seçerdi.
    expect(KAZANIM_TIPLERI[KAZANIM_TIPLERI.length - 1].tip).toBe("DIGER");
  });

  it("GençTek türünün tanımı eski kayıtlar için duruyor", () => {
    /*
     * Tip arşivlendi ama tanımı SİLİNMEDİ: girilmiş kayıtların başlığı ve
     * etiketleri hâlâ buradan okunuyor (Panelim · "Girdiğim kayıtlar").
     * Tanım silinseydi eski satırlar başlıksız kalırdı.
     */
    const tanim = KAZANIM_TIPLERI.find((t) => t.tip === "GENCTEK_ETKINLIGI");
    expect(tanim?.baslik).toBeTruthy();
  });
});

/*
 * ÜRÜNE ÖZGÜ ALANLAR (D5 · 6 Ağustos 2026).
 *
 * İstekteki form: Ürün Adı · Geliştiren Ekip · Açıklamalar · Destekleyici
 * Görseller · Linkler, artı "Bu ürünü markette paylaş" kutusu. Görseller
 * kazanim_ek altyapısıyla, gerisi burada.
 *
 * Alanlar YALNIZCA üründe açılır: bir sertifikanın "geliştiren ekibi" ya da
 * market bayrağı olmaz ve istek elle kurcalansa bile yazılmamalı.
 */
describe("ürün alanları", () => {
  const urun = (ozellikler: Record<string, unknown> = {}) =>
    kazanimKabulEdilirMi({
      tip: "URUN",
      baslik: "Kütüphane uygulaması",
      ...ozellikler,
    });

  it("geliştiren ekibi saklar", () => {
    const karar = urun({ gelistirenEkip: "  Robotik Kulübü  " });
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) expect(karar.kayit.gelistirenEkip).toBe("Robotik Kulübü");
  });

  it("markette paylaş bayrağını saklar", () => {
    const karar = urun({ markettePaylasilsin: true });
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) expect(karar.kayit.markettePaylasilsin).toBe(true);
  });

  it("markette paylaş varsayılan olarak KAPALIDIR", () => {
    // Paylaşım bir tercihtir; açık gelmesi kullanıcının istemeden vitrine
    // çıkması demek olurdu.
    const karar = urun();
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) expect(karar.kayit.markettePaylasilsin).toBe(false);
  });

  it("üründe olmayan tipte ürün alanlarını sessizce düşürür", () => {
    const karar = kazanimKabulEdilirMi({
      tip: "SERTIFIKA",
      baslik: "Siber Güvenliğe Giriş",
      gelistirenEkip: "Bir ekip",
      markettePaylasilsin: true,
      baglantilar: [{ adres: "https://ornek.gov.tr" }],
    });
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) {
      expect(karar.kayit.gelistirenEkip).toBeNull();
      expect(karar.kayit.markettePaylasilsin).toBe(false);
      expect(karar.baglantilar).toEqual([]);
    }
  });

  it("boş bağlantı satırlarını eler ve sırayı korur", () => {
    const karar = urun({
      baglantilar: [
        { adres: "https://depo.example", etiket: "kaynak kod" },
        { adres: "   " },
        { adres: "https://canli.example", etiket: "" },
      ],
    });
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) {
      expect(karar.baglantilar).toEqual([
        { adres: "https://depo.example", etiket: "kaynak kod", siraNo: 0 },
        { adres: "https://canli.example", etiket: null, siraNo: 1 },
      ]);
    }
  });

  it("http/https dışındaki bağlantıyı reddeder", () => {
    // `javascript:` ile başlayan bir adres, profile bakan danışmanın
    // tarayıcısında kod çalıştırırdı.
    const karar = urun({
      baglantilar: [{ adres: "javascript:alert(1)" }],
    });
    expect(karar.olurMu).toBe(false);
  });

  it("çok fazla bağlantıyı reddeder", () => {
    const karar = urun({
      baglantilar: Array.from({ length: 11 }, (_, i) => ({
        adres: `https://ornek.example/${i}`,
      })),
    });
    expect(karar.olurMu).toBe(false);
  });
});

/*
 * SERTİFİKA ve TOPLULUK (D3, D4 · 6 Ağustos 2026) — ayrı tablo açılmadan tip
 * olarak eklendi: aynı form, aynı doğrulama, aynı silme yolu ikinci kez
 * yazılmasın diye. İkisi de "Bilişim Yolculuğum" bölümüne düşer.
 */
describe("sertifika ve topluluk", () => {
  it("ikisi de Bilişim Yolculuğu bölümündedir", () => {
    expect(BILISIM_YOLCULUGU_TIPLERI).toContain("SERTIFIKA");
    expect(BILISIM_YOLCULUGU_TIPLERI).toContain("TOPLULUK");
  });

  it("topluluk kaydı beyandır; ek alan istemez", () => {
    const tanim = kazanimTipiTanimi("TOPLULUK");
    expect(tanim.dereceVarMi).toBe(false);
    expect(tanim.katilimBicimiVarMi).toBe(false);
    expect(tanim.programSecimiVarMi).toBe(false);
  });

  /*
   * 22 AĞUSTOS 2026 · istek: "Düzenleyen kurum burayı listeden seçsin: okul,
   * ilçe, il, bakanlık". Alan serbest metindi; testin işi, listeye girmeyen bir
   * değerin artık kabul edilmediğini sabitlemek.
   */
  it("listede olmayan düzenleyeni reddeder", () => {
    const karar = kazanimKabulEdilirMi({
      tip: "SERTIFIKA",
      baslik: "Siber Güvenliğe Giriş",
      duzenleyen: "BTK Akademi",
    });
    expect(karar.olurMu).toBe(false);
  });

  it("sertifika kaydı kabul edilir", () => {
    const karar = kazanimKabulEdilirMi({
      tip: "SERTIFIKA",
      baslik: "Siber Güvenliğe Giriş",
      duzenleyen: "Bakanlık",
    });
    expect(karar.olurMu).toBe(true);
  });
});
