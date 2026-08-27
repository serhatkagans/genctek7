import {
  faaliyetPaydasKatkisiniCoz,
  PAYDAS_TURLERI,
  PAYDAS_TURU_ETIKETLERI,
  paydasGirdisiniCoz,
  paydasTuruMu,
} from "@/lib/paydas/kurallar";

/**
 * İl bazlı paydaş envanteri kuralları — analiz dokümanı Bölüm 3.
 */

const GECERLI = {
  ad: "Marmara Üniversitesi Teknoloji Fakültesi",
  tur: "UNIVERSITE",
  ilKodu: "34",
  yetkiliKisi: "Dr. A. Yılmaz · Dekan Yardımcısı",
  eposta: "teknoloji@ornek.edu.tr",
  telefon: "0216 000 00 00",
  adres: "Göztepe Kampüsü",
  isBirligiAlani: "Robotik atölyesi için mekân ve eğitmen desteği",
  notlar: "",
};

describe("paydaş türü", () => {
  it("her türün ekran etiketi tanımlıdır", () => {
    for (const tur of PAYDAS_TURLERI) {
      expect(PAYDAS_TURU_ETIKETLERI[tur]).toBeTruthy();
    }
  });

  it("tanımsız tür kabul edilmez", () => {
    expect(paydasTuruMu("UNIVERSITE")).toBe(true);
    expect(paydasTuruMu("VAKIF")).toBe(false);
    expect(paydasTuruMu("")).toBe(false);
  });
});

describe("paydaş girdisi", () => {
  it("geçerli girdiyi kayda çevirir ve boşlukları kırpar", () => {
    const karar = paydasGirdisiniCoz({ ...GECERLI, ad: "  Ornek Kurum  " });
    expect(karar.olurMu).toBe(true);
    if (!karar.olurMu) return;
    expect(karar.kayit.ad).toBe("Ornek Kurum");
    expect(karar.kayit.tur).toBe("UNIVERSITE");
    // Boş metin alanları null'a döner; "" ile null aynı şey değildir.
    expect(karar.kayit.notlar).toBeNull();
  });

  it("kurum adı zorunludur", () => {
    const karar = paydasGirdisiniCoz({ ...GECERLI, ad: "   " });
    expect(karar.olurMu).toBe(false);
  });

  it("tanınmayan tür reddedilir", () => {
    const karar = paydasGirdisiniCoz({ ...GECERLI, tur: "VAKIF" });
    expect(karar.olurMu).toBe(false);
  });

  it("il kodu iki haneli olmalıdır", () => {
    expect(paydasGirdisiniCoz({ ...GECERLI, ilKodu: "3" }).olurMu).toBe(false);
    expect(paydasGirdisiniCoz({ ...GECERLI, ilKodu: "" }).olurMu).toBe(false);
  });

  /*
   * Adı ve türü olan ama ne için iş birliği yapılacağı yazılmayan kayıt, listeyi
   * kalabalıklaştırmaktan başka işe yaramaz.
   */
  it("iş birliği alanı zorunludur", () => {
    const karar = paydasGirdisiniCoz({ ...GECERLI, isBirligiAlani: "  " });
    expect(karar.olurMu).toBe(false);
    if (karar.olurMu) return;
    expect(karar.neden).toContain("İş birliği alanı");
  });

  it("hiç iletişim bilgisi yoksa kayıt açılmaz", () => {
    const karar = paydasGirdisiniCoz({
      ...GECERLI,
      yetkiliKisi: "",
      eposta: "",
      telefon: "",
    });
    expect(karar.olurMu).toBe(false);
  });

  it("tek bir iletişim bilgisi yeterlidir", () => {
    const yalnizcaTelefon = paydasGirdisiniCoz({
      ...GECERLI,
      yetkiliKisi: "",
      eposta: "",
      telefon: "0216 000 00 00",
    });
    expect(yalnizcaTelefon.olurMu).toBe(true);

    const yalnizcaYetkili = paydasGirdisiniCoz({
      ...GECERLI,
      eposta: "",
      telefon: "",
    });
    expect(yalnizcaYetkili.olurMu).toBe(true);
  });

  it("bozuk e-posta reddedilir", () => {
    expect(
      paydasGirdisiniCoz({ ...GECERLI, eposta: "ornek.edu.tr" }).olurMu,
    ).toBe(false);
  });

  /*
   * Telefon biçimi bilinçli olarak gevşek: kurum numaraları dahili numara,
   * ülke kodu ve ayraç bakımından birbirine benzemiyor.
   */
  it("farklı yazımlardaki kurum telefonları kabul edilir", () => {
    for (const numara of [
      "0216 000 00 00",
      "+90 216 000 00 00",
      "(0216) 000-0000",
      "02160000000",
    ]) {
      expect(paydasGirdisiniCoz({ ...GECERLI, telefon: numara }).olurMu).toBe(
        true,
      );
    }
  });

  it("telefon yerine yazılmış metin reddedilir", () => {
    expect(
      paydasGirdisiniCoz({ ...GECERLI, telefon: "santral" }).olurMu,
    ).toBe(false);
  });
});

describe("faaliyet paydaş katkısı", () => {
  it("isteğe bağlıdır; boş bırakılırsa null olur", () => {
    const karar = faaliyetPaydasKatkisiniCoz("   ");
    expect(karar.olurMu).toBe(true);
    if (!karar.olurMu) return;
    expect(karar.katkisi).toBeNull();
  });

  it("çok uzun katkı açıklaması reddedilir", () => {
    expect(faaliyetPaydasKatkisiniCoz("a".repeat(251)).olurMu).toBe(false);
  });
});

/**
 * TÜR LİSTESİ İLE ETİKET SÖZLÜĞÜ AYRI GENİŞLİKTEDİR (27 Ağustos 2026 · istek:
 * "paydaş türü gençtek üniversitesi kalkacak, meslek kuruluşu kalkacak").
 *
 * Liste yeni kayıtta teklif edilenleri, sözlük ise ekranda yazılabilecek her
 * değeri kapsar. Sözlük listeye daraltılsaydı eski kayıtlar türü boş görünürdü.
 */
describe("paydaş türü listesi · kalkan türler", () => {
  it("iki türü artık teklif etmez", () => {
    expect(PAYDAS_TURLERI).not.toContain("GENCTEK_UNIVERSITE");
    expect(PAYDAS_TURLERI).not.toContain("MESLEK_KURULUSU");
  });

  it("kalkan türlerle yeni kayıt açılamaz", () => {
    expect(paydasTuruMu("GENCTEK_UNIVERSITE")).toBe(false);
    expect(paydasTuruMu("MESLEK_KURULUSU")).toBe(false);
    expect(paydasTuruMu("UNIVERSITE")).toBe(true);
  });

  /* Eski kayıt ekranda türsüz görünmemeli. */
  it("kalkan türlerin etiketi duruyor", () => {
    expect(PAYDAS_TURU_ETIKETLERI.GENCTEK_UNIVERSITE).toBe("GençTek üniversitesi");
    expect(PAYDAS_TURU_ETIKETLERI.MESLEK_KURULUSU).toBe("Meslek kuruluşu");
  });
});
