import {
  DUYURU_HEDEF_ETIKETLERI,
  DUYURU_HEDEFLERI,
  duyuruHedefiMi,
  duyuruyuCoz,
  topluHedefAnahtari,
  topluHedefiCoz,
} from "@/lib/bildirim/toplu";

/**
 * Toplu duyuru kuralları.
 *
 * Kurallar bilerek "gönderilmesin" tarafına eğimli: eksik bir duyuruyu tekrar
 * göndermek, yanlış bir duyuruyu geri almaktan kolaydır.
 */

const GECERLI = {
  hedef: "HERKES",
  baslik: "Yaz kampı başvuruları açıldı",
  icerik: "Ayrıntılar panelde.",
  onaylandiMi: true,
};

describe("duyuruyuCoz", () => {
  it("geçerli girdiyi kabul eder ve boşlukları kırpar", () => {
    const sonuc = duyuruyuCoz({
      ...GECERLI,
      baslik: "  Duyuru  ",
      icerik: "  Metin  ",
    });
    expect(sonuc).toEqual({
      olurMu: true,
      hedef: "HERKES",
      baslik: "Duyuru",
      icerik: "Metin",
    });
  });

  it("onay kutusu işaretlenmeden göndermez", () => {
    const sonuc = duyuruyuCoz({ ...GECERLI, onaylandiMi: false });
    expect(sonuc.olurMu).toBe(false);
    if (!sonuc.olurMu) expect(sonuc.neden).toContain("geri alınamaz");
  });

  it("onay kutusu EN SON kontrol edilir", () => {
    /*
     * Kullanıcı metnini boş bırakıp kutuyu da unuttuysa önce metin hatasını
     * görmeli; aksi halde formu iki kez doldurmak zorunda kalır.
     */
    const sonuc = duyuruyuCoz({
      ...GECERLI,
      baslik: "",
      onaylandiMi: false,
    });
    expect(sonuc.olurMu).toBe(false);
    if (!sonuc.olurMu) expect(sonuc.neden).toContain("başlığı boş");
  });

  it("geçersiz alıcı grubunu reddeder", () => {
    const sonuc = duyuruyuCoz({ ...GECERLI, hedef: "VELILER" });
    expect(sonuc.olurMu).toBe(false);
    if (!sonuc.olurMu) expect(sonuc.neden).toContain("Alıcı grubu");
  });

  it("boş başlığı ve boş metni reddeder", () => {
    expect(duyuruyuCoz({ ...GECERLI, baslik: "   " }).olurMu).toBe(false);
    expect(duyuruyuCoz({ ...GECERLI, icerik: "   " }).olurMu).toBe(false);
  });

  it("çok uzun başlığı reddeder", () => {
    const sonuc = duyuruyuCoz({ ...GECERLI, baslik: "a".repeat(201) });
    expect(sonuc.olurMu).toBe(false);
    if (!sonuc.olurMu) expect(sonuc.neden).toContain("200");
  });

  it("çok uzun metni reddeder", () => {
    const sonuc = duyuruyuCoz({ ...GECERLI, icerik: "a".repeat(4001) });
    expect(sonuc.olurMu).toBe(false);
    if (!sonuc.olurMu) expect(sonuc.neden).toContain("4000");
  });

  it("sınırdaki uzunlukları kabul eder", () => {
    expect(duyuruyuCoz({ ...GECERLI, baslik: "a".repeat(200) }).olurMu).toBe(true);
    expect(duyuruyuCoz({ ...GECERLI, icerik: "a".repeat(4000) }).olurMu).toBe(true);
  });
});

describe("duyuruHedefiMi", () => {
  it("tanımlı hedefleri tanır", () => {
    expect(duyuruHedefiMi("OGRENCI")).toBe(true);
    expect(duyuruHedefiMi("OGRETMEN")).toBe(true);
    expect(duyuruHedefiMi("HERKES")).toBe(true);
  });

  it("tanımsız hedefi reddeder", () => {
    expect(duyuruHedefiMi("VELI")).toBe(false);
  });

  it("her hedefin ekran etiketi vardır", () => {
    for (const hedef of ["OGRENCI", "OGRETMEN", "HERKES"] as const) {
      expect(DUYURU_HEDEF_ETIKETLERI[hedef]).toBeTruthy();
    }
  });
});

describe("topluHedefiCoz / topluHedefAnahtari", () => {
  it("sabit kitleleri tanır", () => {
    expect(topluHedefiCoz("OGRENCI")).toEqual({ tip: "OGRENCI" });
    expect(topluHedefiCoz("IL_TEMSILCISI")).toEqual({ tip: "IL_TEMSILCISI" });
    expect(topluHedefiCoz("ILCE_TEMSILCISI")).toEqual({
      tip: "ILCE_TEMSILCISI",
    });
  });

  it("ekip ve topluluk anahtarını kimliğiyle çözer", () => {
    expect(topluHedefiCoz("EKIP:12")).toEqual({ tip: "EKIP", id: 12 });
    expect(topluHedefiCoz("GRUP:3")).toEqual({ tip: "GRUP", id: 3 });
  });

  it("anahtar üretimi çözümlemenin tersidir", () => {
    for (const anahtar of ["OGRENCI", "HERKES", "EKIP:12", "GRUP:3"]) {
      const hedef = topluHedefiCoz(anahtar);
      expect(hedef).not.toBeNull();
      if (hedef) expect(topluHedefAnahtari(hedef)).toBe(anahtar);
    }
  });

  it("kimliği olmayan ya da bozuk anahtarı reddeder", () => {
    /*
     * Anahtar kurcalanabilir bir form alanından geliyor: "sayıya benzeyen her
     * şeyi" kabul eden bir çözümleyici, kapsam kontrolü olmayan bir kayda
     * gönderim denenmesine yol açardı.
     */
    for (const bozuk of [
      "EKIP",
      "EKIP:",
      "EKIP:0",
      "EKIP:-1",
      "EKIP:abc",
      "EKIP:1.5",
      "VELI",
      "VELI:1",
      "",
    ]) {
      expect(topluHedefiCoz(bozuk)).toBeNull();
    }
  });
});

describe("duyuruyuCoz · izinli hedefler", () => {
  it("izin listesinde olmayan hedefi reddeder", () => {
    /*
     * Biçimi geçerli ama KAPSAM DIŞI hedef: başka ilin ekibi. Ekranda hiç
     * görünmeyen bir seçeneğin elle kurulmuş bir istekle geri gelebilmesi,
     * kaldırılmamış olması demektir.
     */
    const sonuc = duyuruyuCoz(
      { ...GECERLI, hedef: "EKIP:99" },
      ["OGRENCI", "EKIP:12"],
    );
    expect(sonuc.olurMu).toBe(false);
    if (!sonuc.olurMu) expect(sonuc.neden).toContain("gönderemezsiniz");
  });

  it("izin listesindeki ekip hedefini kabul eder", () => {
    const sonuc = duyuruyuCoz({ ...GECERLI, hedef: "EKIP:12" }, ["EKIP:12"]);
    expect(sonuc.olurMu).toBe(true);
    if (sonuc.olurMu) expect(sonuc.hedef).toBe("EKIP:12");
  });

  it("liste verilmezse yalnızca sabit kitleler geçerlidir", () => {
    expect(duyuruyuCoz({ ...GECERLI, hedef: "EKIP:12" }).olurMu).toBe(false);
    for (const hedef of DUYURU_HEDEFLERI) {
      expect(duyuruyuCoz({ ...GECERLI, hedef }).olurMu).toBe(true);
    }
  });
});
