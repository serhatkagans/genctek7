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

/**
 * SÜTUN SÜZGEÇLERİ (31 Ağustos 2026 · istek: "alt taraftaki İl / İlçe / Okul /
 * Tür / Kurum kodu alanları filtreli olsun").
 *
 * İkisi de genel `ara` kutusundan AYRI: `ara` üç şeye birden bakıyor (okul adı,
 * ilçe adı, kurum kodu) ve sütun süzgeci olarak kullanılsaydı "Okul" başlığının
 * altına yazılan metin ilçe adında eşleşip ilgisiz bir satır döndürürdü.
 */
describe("okulKosulu · sütun süzgeçleri", () => {
  it("okul adını YALNIZCA okul adında arar", () => {
    const kosul = okulKosulu(suzgec({ okulAdi: "şeyh isa" }));

    expect(kosul.ad).toEqual({ contains: "şeyh isa", mode: "insensitive" });
    // İlçe dalı `ara`nın işi; sütun süzgeci ona bulaşmıyor.
    expect(kosul.OR).toBeUndefined();
  });

  it("boş ve yalnızca boşluktan oluşan değeri sorguya koymaz", () => {
    expect(okulKosulu(suzgec({ okulAdi: "   " })).ad).toBeUndefined();
    expect(okulKosulu(suzgec({ kurumKodu: "  " })).kurumKodu).toBeUndefined();
  });

  it("tam kurum kodunda tek kayda iner", () => {
    expect(okulKosulu(suzgec({ kurumKodu: "758715" })).kurumKodu).toBe(758715);
  });

  it("yarım kurum kodunu ÖN EK aralığına çevirir", () => {
    /*
     * Kod bir tamsayı sütunu; "758 ile başlayanlar" metin işlemiyle
     * sorulamıyor. 6 haneli kodda "758" → [758000, 759000).
     */
    expect(okulKosulu(suzgec({ kurumKodu: "758" })).kurumKodu).toEqual({
      gte: 758000,
      lt: 759000,
    });
  });

  it("basamak arttıkça aralık daralır", () => {
    expect(okulKosulu(suzgec({ kurumKodu: "7587" })).kurumKodu).toEqual({
      gte: 758700,
      lt: 758800,
    });
  });

  it("rakam dışında karakter içeren kodu yok sayar", () => {
    // Süzgeç yalnızca daralttığı için geçersiz girdiyi reddetmek yerine yok
    // saymak yeterli — aynı ölçü paydaş tür süzgecinde de var.
    expect(okulKosulu(suzgec({ kurumKodu: "75a" })).kurumKodu).toBeUndefined();
  });

  it("okul adı ve kurum kodu birlikte daraltır", () => {
    const kosul = okulKosulu(
      suzgec({ okulAdi: "anadolu", kurumKodu: "758715" }),
    );

    expect(kosul.ad).toEqual({ contains: "anadolu", mode: "insensitive" });
    expect(kosul.kurumKodu).toBe(758715);
  });
});
