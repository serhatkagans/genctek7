import {
  adayKosulu,
  adaySorgusu,
  adaySuzgeciDoluMu,
  adaySuzgeciniCoz,
  BOS_ADAY_SUZGECI,
} from "@/lib/ekip/aday-suzgeci";

/**
 * Ekibe üye eklerken kullanılan gelişmiş süzgeç (26 Ağustos 2026).
 *
 * İstek: "Ad ya da soyad / En az iki harf yazın / Ara … bunun yerine gelişmiş
 * filtre ekleyelim: öğretmen öğrenci, okul türü, çalışma grubu, rolleri."
 */

const ZORUNLU = { ilKodu: "34", haricIdler: [7, 9] };

describe("adaySuzgeciniCoz", () => {
  it("boş parametreden boş süzgeç üretir", () => {
    expect(adaySuzgeciniCoz({})).toEqual(BOS_ADAY_SUZGECI);
  });

  it("tanınmayan kişi türünü ve rolü sessizce düşürür", () => {
    // Adres çubuğuna elle yazılan değer için doğru davranış, o daraltmayı hiç
    // uygulamamak — hata vermek değil.
    const suzgec = adaySuzgeciniCoz({ kisiTuru: "MUDUR", rol: "FILANCA" });
    expect(suzgec.kisiTuru).toBeNull();
    expect(suzgec.rol).toBeNull();
  });

  it("sayı olmayan grup kimliğini düşürür", () => {
    expect(adaySuzgeciniCoz({ grup: "abc" }).calismaGrubuId).toBeNull();
    expect(adaySuzgeciniCoz({ grup: "12" }).calismaGrubuId).toBe(12);
  });

  it("boşluktan ibaret aramayı null sayar", () => {
    expect(adaySuzgeciniCoz({ ara: "   " }).ara).toBeNull();
  });
});

describe("adaySuzgeciDoluMu", () => {
  it("tek harflik aramayı yeterli saymaz", () => {
    expect(adaySuzgeciDoluMu(adaySuzgeciniCoz({ ara: "a" }))).toBe(false);
    expect(adaySuzgeciDoluMu(adaySuzgeciniCoz({ ara: "al" }))).toBe(true);
  });

  it("ad yazılmadan da dolu sayılır", () => {
    // Asıl kazanım bu: "meslek liselerindeki okul temsilcileri" sorusunda
    // yazılacak bir ad yok.
    expect(adaySuzgeciDoluMu(adaySuzgeciniCoz({ rol: "MENTOR" }))).toBe(true);
    expect(adaySuzgeciDoluMu(adaySuzgeciniCoz({ grup: "3" }))).toBe(true);
    expect(
      adaySuzgeciDoluMu(adaySuzgeciniCoz({ okulTuru: "Fen Lisesi" })),
    ).toBe(true);
  });

  it("hiçbir süzgeç yoksa boştur", () => {
    expect(adaySuzgeciDoluMu(BOS_ADAY_SUZGECI)).toBe(false);
  });
});

describe("adayKosulu", () => {
  it("kapsamı her zaman uygular", () => {
    const kosul = adayKosulu(BOS_ADAY_SUZGECI, ZORUNLU);
    expect(kosul.AND).toEqual([
      { aktif: true },
      { ilKodu: "34" },
      { id: { notIn: [7, 9] } },
    ]);
  });

  it("üye listesi boşken de geçerli bir notIn üretir", () => {
    // Boş dizi Prisma'da hiçbir kaydı elemez; -1 ile "hiç kimse" deniyor.
    const kosul = adayKosulu(BOS_ADAY_SUZGECI, {
      ilKodu: "34",
      haricIdler: [],
    });
    expect(kosul.AND).toContainEqual({ id: { notIn: [-1] } });
  });

  it("öğrenci süzgeci aktif OGRENCI rolü arar", () => {
    const kosul = adayKosulu(
      adaySuzgeciniCoz({ kisiTuru: "OGRENCI" }),
      ZORUNLU,
    );
    expect(kosul.AND).toContainEqual({
      roller: { some: { rolKodu: "OGRENCI", bitisTarihi: null } },
    });
  });

  it("öğretmen süzgeci öğrenciyi ve dış kullanıcıyı eler", () => {
    // "Öğretmen" = öğrenci olmayan OKUL PERSONELİ; mezun ve paydaş temsilcisi
    // dışarıda, rolsüz öğretmen içeride.
    const kosul = adayKosulu(
      adaySuzgeciniCoz({ kisiTuru: "OGRETMEN" }),
      ZORUNLU,
    );
    expect(kosul.AND).toContainEqual({
      roller: {
        none: {
          rolKodu: { in: ["OGRENCI", "MEZUN", "PAYDAS_TEMSILCISI"] },
          bitisTarihi: null,
        },
      },
    });
  });

  it("mentör rolünü görev kaydında değil mentörlükte arar", () => {
    // Mentörlük bir görev rolü değil, onaya bağlı bir kayıt.
    const kosul = adayKosulu(adaySuzgeciniCoz({ rol: "MENTOR" }), ZORUNLU);
    expect(kosul.AND).toContainEqual({
      mentorluk: { is: { durum: "ONAYLANDI" } },
    });
  });

  it("diğer rolleri görev kayıtlarında arar", () => {
    const kosul = adayKosulu(
      adaySuzgeciniCoz({ rol: "OKUL_TEMSILCISI" }),
      ZORUNLU,
    );
    expect(kosul.AND).toContainEqual({
      gorevRolleri: { some: { rolKodu: "OKUL_TEMSILCISI" } },
    });
  });

  it("okul türünü kişide değil kurumunda arar", () => {
    const kosul = adayKosulu(
      adaySuzgeciniCoz({ okulTuru: "Fen Lisesi" }),
      ZORUNLU,
    );
    expect(kosul.AND).toContainEqual({
      kurum: { okulTuru: "Fen Lisesi" },
    });
  });

  it("süzgeçleri birlikte daraltır", () => {
    // Hepsi AND: "meslek lisesindeki mentör öğrenciler" tek sorguda.
    const kosul = adayKosulu(
      adaySuzgeciniCoz({
        ara: "ali",
        kisiTuru: "OGRENCI",
        okulTuru: "Fen Lisesi",
        grup: "4",
        rol: "MENTOR",
      }),
      ZORUNLU,
    );
    // 3 zorunlu + 5 süzgeç
    expect(kosul.AND).toHaveLength(8);
  });
});

describe("adaySorgusu", () => {
  it("yalnızca dolu süzgeçleri yazar", () => {
    expect(adaySorgusu(BOS_ADAY_SUZGECI)).toBe("");
    expect(
      adaySorgusu(adaySuzgeciniCoz({ rol: "MENTOR", grup: "4" })),
    ).toBe("grup=4&rol=MENTOR");
  });
});
