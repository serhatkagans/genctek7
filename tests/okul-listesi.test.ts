import { okulKosulu, type OkulSuzgeci } from "@/lib/rapor/yonetim-kurallari";

/**
 * Okullar ekranının arama koşulu (15 Ağustos 2026 · Aşama 4).
 *
 * `okulKosulu` hem kırılımın son basamağını hem düz listeyi besliyor; yanlış
 * kurulmuş bir dal iki ekranı birden bozar ve ikisi aynı okul için farklı
 * sayılar gösterir.
 *
 * `okulKosulu` SAF kural dosyasında (`yonetim-kurallari.ts`), sorgularla aynı
 * yerde değil: sayım dosyası Prisma istemcisini yüklüyor ve jest onu açamıyor.
 * Deponun kendi ayrımı — kural dosyaları hiçbir zaman prisma'ya dokunmuyor.
 */

function suzgec(ozel: Partial<OkulSuzgeci> = {}): OkulSuzgeci {
  return { ilKodu: null, ilceKodu: null, okulTuru: null, ara: null, ...ozel };
}

describe("okulKosulu · temel", () => {
  it("kapalı okulu hiçbir süzgeçte döndürmez", () => {
    // Listedeki her satırın karşılığı bir iş; kapalı okula o iş yapılmaz.
    expect(okulKosulu(suzgec()).aktif).toBe(true);
  });

  it("il, ilçe ve tür süzgeçlerini uygular", () => {
    const kosul = okulKosulu(
      suzgec({ ilKodu: "45", ilceKodu: "4501", okulTuru: "Anadolu Lisesi" }),
    );

    expect(kosul.ilKodu).toBe("45");
    expect(kosul.ilceKodu).toBe("4501");
    expect(kosul.okulTuru).toBe("Anadolu Lisesi");
  });

  it("verilmeyen süzgeci sorguya hiç koymaz", () => {
    // `undefined` yerine boş string konsaydı hiçbir kayıt eşleşmezdi.
    const kosul = okulKosulu(suzgec());

    expect(kosul.ilKodu).toBeUndefined();
    expect(kosul.ilceKodu).toBeUndefined();
    expect(kosul.okulTuru).toBeUndefined();
    expect(kosul.OR).toBeUndefined();
  });
});

describe("okulKosulu · arama", () => {
  it("okul adında ve ilçe adında birden arar", () => {
    /*
     * Okul adları başında ilçe adı taşıyor ("Akhisar Şeyh İsa Anadolu Lisesi").
     * Yalnızca okul adında aransaydı ilçeye göre daraltma tesadüfen çalışırdı;
     * yalnızca ilçede aransaydı okul adı hiç bulunmazdı.
     */
    const kosul = okulKosulu(suzgec({ ara: "şeyh isa" }));
    const metin = JSON.stringify(kosul.OR);

    expect(metin).toContain("ilce");
    expect(metin).toContain("insensitive");
  });

  it("sayısal aramada kurum kodunu TAM eşleşmeyle ekler", () => {
    /*
     * Kod bir kimliktir: "758715" yazan kişi içinde o dizi geçen okulları
     * değil, o kodlu okulu arıyor.
     */
    const kosul = okulKosulu(suzgec({ ara: "758715" }));

    expect(kosul.OR).toContainEqual({ kurumKodu: 758715 });
  });

  it("metin aramada kurum kodu dalını hiç açmaz", () => {
    // `Number("şeyh")` NaN; dal açılsaydı Prisma geçersiz değerle hata verirdi.
    const kosul = okulKosulu(suzgec({ ara: "şeyh" }));

    expect(JSON.stringify(kosul.OR)).not.toContain("kurumKodu");
  });

  it("boşluktan ibaret aramayı süzgeç saymaz", () => {
    expect(okulKosulu(suzgec({ ara: "   " })).OR).toBeUndefined();
  });

  it("aramayı diğer süzgeçlerle BİRLİKTE uygular", () => {
    // OR yalnızca aramanın içinde; il süzgeci onunla yarışmamalı.
    const kosul = okulKosulu(suzgec({ ilKodu: "45", ara: "lise" }));

    expect(kosul.ilKodu).toBe("45");
    expect(kosul.OR).toHaveLength(2);
  });
});

describe("okulKosulu · ekip sekmeleri (Aşama 5)", () => {
  it("ekip tanımlanan okulları açık ekiple süzer", () => {
    // Kapalı ekip sayılmamalı: "bu okulun ekibi var mı" sorusu açık ekibi sorar.
    const kosul = okulKosulu(suzgec({ ekipDurumu: "ekipli" }));

    expect(kosul.ekipler).toEqual({ some: { aktif: true } });
  });

  it("ekip tanımlanmayan okulları none ile süzer", () => {
    const kosul = okulKosulu(suzgec({ ekipDurumu: "ekipsiz" }));

    expect(kosul.ekipler).toEqual({ none: { aktif: true } });
  });

  it("hepsi seçiliyken ekip koşulu koymaz", () => {
    expect(okulKosulu(suzgec({ ekipDurumu: "hepsi" })).ekipler).toBeUndefined();
    expect(okulKosulu(suzgec()).ekipler).toBeUndefined();
  });

  it("ekip süzgecini diğer süzgeçlerle birlikte uygular", () => {
    const kosul = okulKosulu(suzgec({ ilKodu: "45", ekipDurumu: "ekipsiz" }));

    expect(kosul.ilKodu).toBe("45");
    expect(kosul.ekipler).toEqual({ none: { aktif: true } });
  });
});

/**
 * Danışman süzgeci (27 Ağustos 2026 · istek: "filtreye danışmanlı okullar
 * danışmansız okullar sütunu ekle").
 *
 * Koşulun `some`/`none` ile kurulması sınanıyor: sayıya bakıp sonradan süzmek,
 * sayfalamadan önce bütün okulları çekmek demekti.
 */
describe("okulKosulu · danışman durumu", () => {
  it("varsayılanda okulları danışmana göre daraltmaz", () => {
    expect(okulKosulu(suzgec()).kullanicilar).toBeUndefined();
    expect(
      okulKosulu(suzgec({ danismanDurumu: "hepsi" })).kullanicilar,
    ).toBeUndefined();
  });

  it("danışmanlı okulda `some` kurar", () => {
    const kosul = okulKosulu(suzgec({ danismanDurumu: "danismanli" }));
    expect(kosul.kullanicilar).toEqual({ some: expect.any(Object) });
  });

  it("danışmansız okulda `none` kurar", () => {
    const kosul = okulKosulu(suzgec({ danismanDurumu: "danismansiz" }));
    expect(kosul.kullanicilar).toEqual({ none: expect.any(Object) });
  });

  /* Süzgeç ile tablodaki "Danışman" sütunu aynı kümeyi saymalı. */
  it("danışman tanımını sayım koşulundan alır", () => {
    const kosul = okulKosulu(suzgec({ danismanDurumu: "danismanli" }));
    expect(kosul.kullanicilar).toEqual({
      some: {
        aktif: true,
        roller: { some: { rolKodu: "DANISMAN", bitisTarihi: null } },
      },
    });
  });
});
