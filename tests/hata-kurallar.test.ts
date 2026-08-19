import {
  ayEtiketi,
  dosyaAdindanAy,
  type HataKaydi,
  hataEslesiyorMu,
  hataGrupKodu,
  hataGrupToplayici,
  hataOzetKimligi,
  hataSatiriCoz,
  ilkAnlamliSatir,
  kisaMesaj,
  KIMLIKSIZ,
  okunacakAylar,
  sonKayitTamponu,
  sorgusuzYol,
  TUM_AYLAR,
} from "@/lib/hata-kurallar";

/**
 * Hata günlüğü çözümleme kuralları (18 Ağustos 2026 · hata kayıtları ekranı).
 *
 * Kurallar `hata-okuma.ts`'ten AYRI bir dosyada duruyor ki bu test dosya
 * sistemine ve DATABASE_URL'e ihtiyaç duymadan çalışabilsin; sınanan şey zaten
 * çözümleme ve gruplama, okuma değil.
 *
 * Aynı kurallar İKİ ÇAĞIRAN tarafından kullanılıyor: `/panel/hata-kayitlari`
 * ekranı ve `npm run hata:ara` betiği. Buradaki bir kayma ikisini birden
 * bozar.
 */

function kayit(ozel: Partial<HataKaydi> = {}): HataKaydi {
  return {
    kimlik: "598556021",
    zaman: "2026-08-12T08:50:31.231Z",
    yol: "/panel/profil",
    yontem: "GET",
    ad: "PrismaClientValidationError",
    mesaj: "Invalid `prisma.basvuru.findMany()` invocation",
    yiginIzi: "at Object.<anonymous>",
    ...ozel,
  };
}

describe("satır çözümleme", () => {
  it("tam bir satırı okur", () => {
    const cozulen = hataSatiriCoz(JSON.stringify(kayit()));
    expect(cozulen?.kimlik).toBe("598556021");
    expect(cozulen?.yol).toBe("/panel/profil");
  });

  /*
   * YARIM SATIR OLAĞANDIR: dosyaya ekleme yapılırken sunucu kapanırsa son
   * satır kesilir. Böyle bir satırın ekranı çökertmesi, günlüğü tam da en
   * gerekli olduğu anda kullanılamaz kılardı.
   */
  it("bozuk JSON'da null döner, hata fırlatmaz", () => {
    expect(hataSatiriCoz('{"kimlik":"12345","zam')).toBeNull();
    expect(hataSatiriCoz("")).toBeNull();
    expect(hataSatiriCoz("   ")).toBeNull();
  });

  it("JSON olsa da zorunlu alanı eksik satır kabul edilmez", () => {
    // Yarım kayıt, ekranda "undefined" olarak görünmektense hiç görünmemeli.
    expect(hataSatiriCoz('{"kimlik":"1"}')).toBeNull();
    expect(hataSatiriCoz('"sadece metin"')).toBeNull();
    expect(hataSatiriCoz("null")).toBeNull();
  });

  it("okunamayan zaman taşıyan satır kabul edilmez", () => {
    /*
     * Bu satırlar ÇÖKME koruması: ekran `tarihSaatYaz(new Date(kayit.zaman))`
     * çağırıyor ve `Intl.DateTimeFormat.format` geçersiz tarihte RangeError
     * fırlatıyor. Çözümlemeden geçen bir "abc", tek başına sayfanın tamamını
     * çökertirdi.
     */
    const bozuk = (zaman: unknown) =>
      hataSatiriCoz(JSON.stringify({ zaman, ad: "TypeError" }));

    expect(bozuk("abc")).toBeNull();
    expect(bozuk("")).toBeNull();
    expect(bozuk("2026-13-45T99:99:99.000Z")).toBeNull();
    expect(bozuk(1_755_000_000_000)).toBeNull();
    expect(bozuk(null)).toBeNull();
  });

  it("okunabilir zaman olduğu gibi korunur", () => {
    // Değer DEĞİŞTİRİLMİYOR: sıralama metin karşılaştırmasıyla yapılıyor
    // (bkz. hataGrupToplayici) ve yeniden biçimlendirmek o sırayı bozardı.
    const cozulen = hataSatiriCoz(
      JSON.stringify({ zaman: "2026-08-12T08:50:31.231Z", ad: "TypeError" }),
    );
    expect(cozulen?.zaman).toBe("2026-08-12T08:50:31.231Z");
  });

  it("eksik isteğe bağlı alanlar null'a düşer, kimlik yoksa KIMLIKSIZ olur", () => {
    const cozulen = hataSatiriCoz(
      JSON.stringify({ zaman: "2026-08-01T00:00:00.000Z", ad: "TypeError" }),
    );
    expect(cozulen).toEqual({
      kimlik: KIMLIKSIZ,
      zaman: "2026-08-01T00:00:00.000Z",
      yol: null,
      yontem: null,
      ad: "TypeError",
      mesaj: "",
      yiginIzi: null,
    });
  });
});

describe("süzgeç", () => {
  it("kimlik tam eşleşir", () => {
    expect(hataEslesiyorMu(kayit(), { kimlik: "598556021" })).toBe(true);
    // "İçeren" eşleşme olsaydı 598556021 arayan kişiye 1598556021 de gelirdi.
    expect(
      hataEslesiyorMu(kayit({ kimlik: "1598556021" }), { kimlik: "598556021" }),
    ).toBe(false);
  });

  it("metin araması mesajda, hata adında ve adreste geçer", () => {
    expect(hataEslesiyorMu(kayit(), { ara: "findMany" })).toBe(true);
    expect(hataEslesiyorMu(kayit(), { ara: "prismaclient" })).toBe(true);
    expect(hataEslesiyorMu(kayit(), { ara: "/panel/profil" })).toBe(true);
    expect(hataEslesiyorMu(kayit(), { ara: "yazismalar" })).toBe(false);
  });

  /*
   * Yığın izi aramaya girmez: her iz onlarca dosya adı taşıyor ve "profil"
   * araması, mesajıyla hiç ilgisi olmayan her kaydı getirirdi.
   */
  it("yığın izi arama havuzuna girmez", () => {
    const izli = kayit({ yiginIzi: "at ozelBirIsaret (dosya.ts:1:1)" });
    expect(hataEslesiyorMu(izli, { ara: "ozelBirIsaret" })).toBe(false);
  });

  it("grup süzgeci kaydın grup koduyla eşleşir", () => {
    const hedef = kayit({ ad: "TypeError", mesaj: "Cannot read x" });
    const baska = kayit({ ad: "RangeError", mesaj: "Cannot read x" });
    const kod = hataGrupKodu(hedef);

    expect(hataEslesiyorMu(hedef, { grup: kod })).toBe(true);
    expect(hataEslesiyorMu(baska, { grup: kod })).toBe(false);
  });

  it("iki süzgeç birlikte daraltır", () => {
    expect(
      hataEslesiyorMu(kayit(), { kimlik: "598556021", ara: "yazismalar" }),
    ).toBe(false);
  });

  it("boş süzgeç her kaydı geçirir", () => {
    expect(hataEslesiyorMu(kayit(), {})).toBe(true);
    expect(hataEslesiyorMu(kayit(), { kimlik: "  ", ara: "", grup: "" })).toBe(
      true,
    );
  });
});

describe("özet kimliği", () => {
  /*
   * GERÇEK GÜNLÜKTEN ÇIKAN KURAL: Next.js digest'i her olayda yeniden
   * üretiyor. İlk ayın 1.481 kaydında 345 farklı kimlik vardı ama bunların
   * 794'ü tek ve aynı hataydı. Kimliğe göre gruplayan bir özet, aynı satırı
   * yüzlerce kez tekrarlar ve hiçbir şey özetlemezdi.
   */
  it("aynı hata farklı kimliklerde de aynı gruba düşer", () => {
    const a = kayit({ kimlik: "111", zaman: "2026-08-01T00:00:00.000Z" });
    const b = kayit({ kimlik: "222", zaman: "2026-08-02T00:00:00.000Z" });
    expect(hataGrupKodu(a)).toBe(hataGrupKodu(b));
  });

  it("farklı hata adı ayrı gruptur", () => {
    expect(hataGrupKodu(kayit({ ad: "TypeError" }))).not.toBe(
      hataGrupKodu(kayit({ ad: "RangeError" })),
    );
  });

  /*
   * Mesajın TAMAMI anahtara girseydi, gövdedeki derleme yolu ve satır numarası
   * (`...__02gb0h2._.js:6239:140`) her dağıtımdan sonra değişeceği için aynı
   * hata yeni bir hata gibi görünürdü.
   */
  it("gövdesi değişen ama ilk satırı aynı olan kayıtlar aynı gruptadır", () => {
    const eski = kayit({
      mesaj: "Invalid `prisma.talep.findMany()` invocation in\n  chunk-a.js:100",
    });
    const yeni = kayit({
      mesaj: "Invalid `prisma.talep.findMany()` invocation in\n  chunk-b.js:250",
    });
    expect(hataGrupKodu(eski)).toBe(hataGrupKodu(yeni));
  });

  it("grup kodu adres çubuğuna sığan sabit uzunlukta bir dizgidir", () => {
    expect(hataGrupKodu(kayit())).toMatch(/^[0-9a-f]{8}$/);
  });

  it("özet kimliği hata adını ve ilk satırı taşır", () => {
    expect(hataOzetKimligi(kayit({ ad: "TypeError", mesaj: "bir\niki" }))).toBe(
      "TypeError | bir",
    );
  });
});

describe("ilk anlamlı satır", () => {
  /*
   * Prisma hataları mesaja BOŞ satırla başlıyor. Körü körüne ilk satır
   * alınsaydı bütün Prisma hataları boş başlıklı tek gruba düşerdi; gerçek
   * günlükte 302 + 204 kayıt tam olarak böyle birleşiyordu.
   */
  it("baştaki boş satırları atlar", () => {
    expect(ilkAnlamliSatir("\n\nInvalid `prisma.talep.findMany()`\n  where")).toBe(
      "Invalid `prisma.talep.findMany()`",
    );
  });

  it("hiç anlamlı satır yoksa boş döner", () => {
    expect(ilkAnlamliSatir("")).toBe("");
    expect(ilkAnlamliSatir("\n   \n\t\n")).toBe("");
  });

  it("uzun satırı kısaltır", () => {
    expect(ilkAnlamliSatir("abcdefghij", 5)).toBe("abcd…");
  });
});

describe("gruplama", () => {
  it("aynı hatanın kayıtları tek satırda toplanır", () => {
    const toplayici = hataGrupToplayici(10);
    toplayici.ekle(kayit({ kimlik: "1", zaman: "2026-08-01T00:00:00.000Z" }));
    toplayici.ekle(
      kayit({ kimlik: "2", zaman: "2026-08-03T00:00:00.000Z", yol: "/panel" }),
    );

    const { gruplar, toplamKayit } = toplayici.sonuc();
    expect(toplamKayit).toBe(2);
    expect(gruplar).toHaveLength(1);
    expect(gruplar[0].adet).toBe(2);
    expect(gruplar[0].ilkZaman).toBe("2026-08-01T00:00:00.000Z");
    expect(gruplar[0].sonZaman).toBe("2026-08-03T00:00:00.000Z");
    expect(gruplar[0].yollar.sort()).toEqual(["/panel", "/panel/profil"]);
    expect(gruplar[0].ad).toBe("PrismaClientValidationError");
    expect(gruplar[0].baslik).toContain("findMany");
  });

  it("farklı hatalar ayrı satırlarda kalır", () => {
    const toplayici = hataGrupToplayici(10);
    toplayici.ekle(kayit({ ad: "TypeError", mesaj: "a" }));
    toplayici.ekle(kayit({ ad: "RangeError", mesaj: "b" }));
    toplayici.ekle(kayit({ ad: "TypeError", mesaj: "a" }));

    const { gruplar } = toplayici.sonuc();
    expect(gruplar).toHaveLength(2);
    expect(gruplar.find((grup) => grup.ad === "TypeError")?.adet).toBe(2);
  });

  it("dosya sırası bozuk olsa da ilk/son zaman doğru kalır", () => {
    const toplayici = hataGrupToplayici(10);
    toplayici.ekle(kayit({ zaman: "2026-08-05T00:00:00.000Z" }));
    toplayici.ekle(kayit({ zaman: "2026-08-01T00:00:00.000Z" }));

    const [grup] = toplayici.sonuc().gruplar;
    expect(grup.ilkZaman).toBe("2026-08-01T00:00:00.000Z");
    expect(grup.sonZaman).toBe("2026-08-05T00:00:00.000Z");
  });

  /*
   * Üst sınır grup sayısınadır: sınıra ulaşıldığında yeni grup açılmaz ama
   * mevcut grupların sayımı sürer - sınır, en çok görülen hataların sayısını
   * bozmamalı.
   */
  it("üst sınır aşılınca yeni grup açılmaz, mevcutların sayımı sürer", () => {
    const toplayici = hataGrupToplayici(2);
    toplayici.ekle(kayit({ ad: "A" }));
    toplayici.ekle(kayit({ ad: "B" }));
    toplayici.ekle(kayit({ ad: "C" }));
    toplayici.ekle(kayit({ ad: "A" }));

    const sonuc = toplayici.sonuc();
    expect(sonuc.gruplar).toHaveLength(2);
    expect(sonuc.kirpildiMi).toBe(true);
    expect(sonuc.toplamKayit).toBe(4);
    expect(sonuc.gruplar.find((grup) => grup.ad === "A")?.adet).toBe(2);
  });

  it("yol listesi kırpılır ama sayısı korunur", () => {
    const toplayici = hataGrupToplayici(10);
    for (const yol of ["/a", "/b", "/c", "/d", "/e"]) {
      toplayici.ekle(kayit({ yol }));
    }
    const [grup] = toplayici.sonuc().gruplar;
    expect(grup.yollar).toHaveLength(3);
    expect(grup.yolSayisi).toBe(5);
  });

  it("sıralama: son görülme ve tekrar sayısı", () => {
    const toplayici = hataGrupToplayici(10);
    toplayici.ekle(kayit({ ad: "Cok", zaman: "2026-08-01T00:00:00.000Z" }));
    toplayici.ekle(kayit({ ad: "Cok", zaman: "2026-08-02T00:00:00.000Z" }));
    toplayici.ekle(kayit({ ad: "Yeni", zaman: "2026-08-09T00:00:00.000Z" }));

    expect(toplayici.sonuc("son").gruplar[0].ad).toBe("Yeni");
    expect(toplayici.sonuc("adet").gruplar[0].ad).toBe("Cok");
  });
});

describe("son kayıt tamponu", () => {
  it("en yeni kayıtları tutar ve en yeniyi başa alır", () => {
    const tampon = sonKayitTamponu(2);
    tampon.ekle(kayit({ mesaj: "1" }));
    tampon.ekle(kayit({ mesaj: "2" }));
    tampon.ekle(kayit({ mesaj: "3" }));

    const sonuc = tampon.sonuc();
    expect(sonuc.toplam).toBe(3);
    expect(sonuc.kirpildiMi).toBe(true);
    expect(sonuc.kayitlar.map((k) => k.mesaj)).toEqual(["3", "2"]);
  });

  it("sınır aşılmadıysa kırpılmış saymaz", () => {
    const tampon = sonKayitTamponu(5);
    tampon.ekle(kayit());
    expect(tampon.sonuc().kirpildiMi).toBe(false);
  });
});

describe("ay seçimi", () => {
  const aylar = ["2026-08", "2026-07", "2026-06"];

  it("varsayılan en yeni aydır", () => {
    // Her ayın dosyası megabaytlarla ölçülüyor; varsayılan olarak hepsini
    // okumak ekranı günlük büyüdükçe yavaşlatırdı.
    expect(
      okunacakAylar({ ay: null, kimlikAramasiMi: false, tumAylar: aylar }),
    ).toEqual({ aylar: ["2026-08"], secilen: "2026-08" });
  });

  it("kimlik aranıyorsa varsayılan tüm aylardır", () => {
    // Kullanıcı elindeki numaranın hangi ayda oluştuğunu bilemez.
    expect(
      okunacakAylar({ ay: null, kimlikAramasiMi: true, tumAylar: aylar }),
    ).toEqual({ aylar, secilen: null });
  });

  it("seçilen ay okunur", () => {
    expect(
      okunacakAylar({ ay: "2026-07", kimlikAramasiMi: false, tumAylar: aylar }),
    ).toEqual({ aylar: ["2026-07"], secilen: "2026-07" });
  });

  it("TUM_AYLAR seçimi kimlik aranmadan da geçerlidir", () => {
    expect(
      okunacakAylar({ ay: TUM_AYLAR, kimlikAramasiMi: false, tumAylar: aylar })
        .secilen,
    ).toBeNull();
  });

  /*
   * Adres çubuğuna elle yazılan `ay=2026-13` yüzünden boş dönen bir ekran,
   * kullanıcıya arıza gibi görünürdü.
   */
  it("tanınmayan ay süzgeç yokmuş gibi ele alınır", () => {
    expect(
      okunacakAylar({ ay: "2026-13", kimlikAramasiMi: false, tumAylar: aylar }),
    ).toEqual({ aylar: ["2026-08"], secilen: "2026-08" });
  });

  it("hiç ay yoksa boş sonuç döner", () => {
    expect(
      okunacakAylar({ ay: null, kimlikAramasiMi: false, tumAylar: [] }),
    ).toEqual({ aylar: [], secilen: null });
  });
});

describe("istek yolu", () => {
  /*
   * Bu blok bir KVKK güvencesini bekliyor, biçim tercihini değil: günlüğe
   * sorgu parametresi yazılmaz (bkz. lib/hata-kaydi.ts · "NE YAZILIR, NE
   * YAZILMAZ"). Söz 19 Ağustos 2026'ya kadar tutmuyordu; Next.js'in verdiği
   * `path` ham istek adresi olduğu için sorgu dizesi de kayda geçiyordu.
   */
  it("sorgu dizesi yola dahil edilmez", () => {
    expect(sorgusuzYol("/panel/ogrenciler?ara=Ahmet%20Y%C4%B1lmaz")).toBe(
      "/panel/ogrenciler",
    );
    // Next'in kendi eklediği RSC parametresi de düşer.
    expect(sorgusuzYol("/panel/profil?_rsc=pWGlNgl7j7kQcf6R")).toBe(
      "/panel/profil",
    );
    expect(
      sorgusuzYol("/panel/etkinlikler/19/rapor?durum=guncellendi&_rsc=uWg"),
    ).toBe("/panel/etkinlikler/19/rapor");
  });

  it("çapa da kırpılır", () => {
    expect(sorgusuzYol("/panel/raporlar#ozet")).toBe("/panel/raporlar");
    expect(sorgusuzYol("/panel/raporlar?yil=2026#ozet")).toBe("/panel/raporlar");
  });

  it("sorgusuz yol olduğu gibi kalır", () => {
    expect(sorgusuzYol("/panel/profil")).toBe("/panel/profil");
    expect(sorgusuzYol("/")).toBe("/");
  });

  it("yol yoksa null döner", () => {
    // Kancanın `path` alanı boş gelebilir (`req.url || ""`); kayıt yine yazılır.
    expect(sorgusuzYol(undefined)).toBeNull();
    expect(sorgusuzYol(null)).toBeNull();
    expect(sorgusuzYol("")).toBeNull();
    // Yalnızca sorgudan ibaret bir adres, boş bir yol satırı bırakmamalı.
    expect(sorgusuzYol("?ara=Ahmet")).toBeNull();
  });
});

describe("biçimleme", () => {
  it("dosya adından ay çıkarılır", () => {
    expect(dosyaAdindanAy("hata-2026-08.jsonl")).toBe("2026-08");
    expect(dosyaAdindanAy("hata-2026-08.jsonl.eski")).toBeNull();
    expect(dosyaAdindanAy("baska.jsonl")).toBeNull();
  });

  it("ay etiketi Türkçe yazılır", () => {
    expect(ayEtiketi("2026-08")).toBe("Ağustos 2026");
    expect(ayEtiketi("2026-01")).toBe("Ocak 2026");
    // Tanınmayan değer olduğu gibi döner; ekranda boş bir etiket kalmaz.
    expect(ayEtiketi("bozuk")).toBe("bozuk");
  });

  it("çok satırlı mesaj tek satıra iner ve kısalır", () => {
    const uzun = "Invalid  prisma\n  where: {\n    id: 5\n  }";
    expect(kisaMesaj(uzun, 100)).toBe("Invalid prisma where: { id: 5 }");
    expect(kisaMesaj(uzun, 12)).toBe("Invalid pri…");
  });
});
