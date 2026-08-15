import {
  KIRILIMLAR,
  kirilimGecerliMi,
  kirilimKosulu,
  type EksikSuzgeci,
} from "@/lib/rapor/okul-eksikleri";

/**
 * Okul eksik durum analizi (15 Ağustos 2026 · Aşama 3).
 *
 * Sınanan şey KOŞULLARIN KENDİSİ. Bu ekranın çıktısı bir görev listesi:
 * yanlış kurulmuş bir koşul, ya var olmayan bir eksiği gösterir (boşuna iş) ya
 * da gerçek eksiği gizler (hiç yapılmayan iş). İkisi de dosyaya bakan kişiye
 * makul görünür.
 */

function suzgec(ozel: Partial<EksikSuzgeci> = {}): EksikSuzgeci {
  return {
    ilKodu: null,
    ilceKodu: null,
    okulTuru: null,
    ara: null,
    egitimOgretimYili: "2025-2026",
    ...ozel,
  };
}

describe("kirilimGecerliMi", () => {
  it("dört kırılımı tanır", () => {
    for (const kirilim of KIRILIMLAR) {
      expect(kirilimGecerliMi(kirilim)).toBe(true);
    }
  });

  it("adres çubuğundan gelen uydurma değeri reddeder", () => {
    // Doğrulanmasaydı `switch` hiçbir dala girmez ve koşul `undefined` olurdu.
    expect(kirilimGecerliMi("hepsi")).toBe(false);
    expect(kirilimGecerliMi("")).toBe(false);
  });
});

describe("kirilimKosulu · her kırılımda geçerli olan", () => {
  it("kapalı okulu hiçbir kırılıma almaz", () => {
    /*
     * Her satırın karşılığı bir iş ("danışman ata", "temsilci seç") ve kapalı
     * okula bunların hiçbiri yapılmaz.
     */
    for (const kirilim of KIRILIMLAR) {
      expect(kirilimKosulu(kirilim, suzgec()).aktif).toBe(true);
    }
  });

  it("il süzgecini uygular, verilmediğinde ülke geneli kalır", () => {
    expect(kirilimKosulu("danismanYok", suzgec({ ilKodu: "45" })).ilKodu).toBe(
      "45",
    );
    expect(kirilimKosulu("danismanYok", suzgec()).ilKodu).toBeUndefined();
  });

  it("aramayı okul ADINDA ve İLÇE adında birden yapar", () => {
    // Okul adları başında ilçe adı taşıyor ("Akhisar Şeyh İsa..."); yalnızca
    // okul adında aransaydı ilçeye göre daraltmak tesadüfen çalışırdı.
    const kosul = kirilimKosulu("temsilciYok", suzgec({ ara: "akhisar" }));

    expect(kosul.OR).toHaveLength(2);
    expect(JSON.stringify(kosul.OR)).toContain("ilce");
  });

  it("boşluktan ibaret aramayı süzgeç saymaz", () => {
    expect(kirilimKosulu("temsilciYok", suzgec({ ara: "   " })).OR).toBeUndefined();
  });
});

describe("kirilimKosulu · kırılımların ayrımı", () => {
  it("danışman yok: aktif danışmanı olmayan okul", () => {
    const kosul = kirilimKosulu("danismanYok", suzgec());

    expect(kosul.kullanicilar).toHaveProperty("none");
    expect(JSON.stringify(kosul.kullanicilar)).toContain("DANISMAN");
  });

  it("öğrenci yok: aktif öğrencisi olmayan okul", () => {
    const kosul = kirilimKosulu("ogrenciYok", suzgec());

    expect(kosul.kullanicilar).toHaveProperty("none");
    expect(JSON.stringify(kosul.kullanicilar)).toContain("OGRENCI");
  });

  it("temsilci yok: öğrenci koşulu ARAMAZ", () => {
    /*
     * Ayrımın kendisi: bu kırılım öğrencisi olmayan okulları da içerir.
     * Öğrenci koşulu eklenseydi dördüncü kırılımla aynı şey olurdu ve iki
     * sekme aynı listeyi gösterirdi.
     */
    const kosul = kirilimKosulu("temsilciYok", suzgec());

    expect(kosul.kullanicilar).toBeUndefined();
    expect(kosul.ogrenciGorevleri).toBeDefined();
  });

  it("öğrenci var temsilci yok: iki koşulu birden taşır", () => {
    const kosul = kirilimKosulu("ogrenciVarTemsilciYok", suzgec());

    expect(kosul.kullanicilar).toHaveProperty("some");
    expect(JSON.stringify(kosul.kullanicilar)).toContain("OGRENCI");
    expect(kosul.ogrenciGorevleri).toBeDefined();
  });
});

describe("kirilimKosulu · dönem", () => {
  it("temsilcilik koşuluna verilen dönemi yazar", () => {
    /*
     * Dönem düşseydi geçen yılın temsilcisi bu yılın eksiğini gizlerdi: okul
     * "temsilcisi var" görünür, oysa bu dönem kimse atanmamıştır.
     */
    const kosul = kirilimKosulu(
      "temsilciYok",
      suzgec({ egitimOgretimYili: "2024-2025" }),
    );

    expect(JSON.stringify(kosul.ogrenciGorevleri)).toContain("2024-2025");
    expect(JSON.stringify(kosul.ogrenciGorevleri)).toContain("OKUL_TEMSILCISI");
  });

  it("dönem yalnızca temsilcilik kırılımlarını etkiler", () => {
    // Danışmanlık ve öğrenci kaydı dönem bazlı değil; yıl oraya sızmamalı.
    const a = kirilimKosulu("danismanYok", suzgec({ egitimOgretimYili: "2024-2025" }));
    const b = kirilimKosulu("danismanYok", suzgec({ egitimOgretimYili: "2025-2026" }));

    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
