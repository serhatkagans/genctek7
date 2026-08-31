import {
  KISI_GOREV_ETIKETLERI,
  KISI_GOREVLERI,
  KISI_TURLERI,
  KISI_TURU_ETIKETLERI,
  kisiKosulu,
  kisiSuzgeciDoluMu,
  kisiSuzgeciniCoz,
} from "@/lib/kisi/il-suzgeci";

/**
 * İl kişi listesinin süzgeci (31 Ağustos 2026).
 *
 * İki şeyi koruyor: süzgeç kapsamı GENİŞLETEMEZ (il koşulu her zaman koşul
 * zincirinde) ve iletişim alanları İKİ profil tablosunda birden aranır —
 * öğrencininki ayrı tabloda ve tek tabloya bakan bir süzgeç sessizce yarım
 * sonuç döndürürdü.
 */

const KAPSAM = { ilKodu: "45", egitimOgretimYili: "2026-2027" };

/** `where.AND` içinde verilen anahtarı taşıyan koşul var mı? */
function kosulVarMi(
  kosul: ReturnType<typeof kisiKosulu>,
  anahtar: string,
): boolean {
  const zincir = (kosul.AND ?? []) as Record<string, unknown>[];
  return zincir.some((satir) => Object.hasOwn(satir, anahtar));
}

describe("kisiSuzgeciniCoz", () => {
  it("boş adreste bütün alanlar boştur", () => {
    const suzgec = kisiSuzgeciniCoz({});
    expect(suzgec).toEqual({
      ad: null,
      tur: null,
      gorev: null,
      kurum: null,
      eposta: null,
      telefon: null,
    });
    expect(kisiSuzgeciDoluMu(suzgec)).toBe(false);
  });

  it("`k` önekli parametreleri okur ve boşlukları kırpar", () => {
    const suzgec = kisiSuzgeciniCoz({
      kad: "  ali  ",
      ktur: "OGRENCI",
      kgorev: "MENTOR",
      kkurum: "Anadolu",
      keposta: "@meb",
      ktel: "0532",
    });
    expect(suzgec).toEqual({
      ad: "ali",
      tur: "OGRENCI",
      gorev: "MENTOR",
      kurum: "Anadolu",
      eposta: "@meb",
      telefon: "0532",
    });
    expect(kisiSuzgeciDoluMu(suzgec)).toBe(true);
  });

  it("öneksiz parametreleri GÖRMEZDEN GELİR", () => {
    /*
     * Liste, ekip envanteriyle aynı adreste duruyor ve o da `ara`/`tur`
     * kullanıyor. Önek olmasaydı ekipleri türe göre süzen kişi, farkında
     * olmadan kişi listesini de süzerdi.
     */
    const suzgec = kisiSuzgeciniCoz({ ara: "ali", tur: "OKUL_TAKIMI" });
    expect(kisiSuzgeciDoluMu(suzgec)).toBe(false);
  });

  it("tanımsız tür ve görev değerlerini düşürür", () => {
    const suzgec = kisiSuzgeciniCoz({ ktur: "VELI", kgorev: "MUDUR" });
    expect(suzgec.tur).toBeNull();
    expect(suzgec.gorev).toBeNull();
  });
});

describe("etiketler", () => {
  it("her tür ve görev için ekran etiketi vardır", () => {
    for (const tur of KISI_TURLERI) {
      expect(KISI_TURU_ETIKETLERI[tur]).toBeTruthy();
    }
    for (const gorev of KISI_GOREVLERI) {
      expect(KISI_GOREV_ETIKETLERI[gorev]).toBeTruthy();
    }
  });
});

describe("kisiKosulu", () => {
  const bos = kisiSuzgeciniCoz({});

  it("kapsamın ilini her zaman koşula koyar", () => {
    const kosul = kisiKosulu(bos, KAPSAM);
    const zincir = (kosul.AND ?? []) as Record<string, unknown>[];
    expect(zincir).toContainEqual({ ilKodu: "45" });
    expect(zincir).toContainEqual({ aktif: true });
  });

  it("ülke genelinde il koşulu yazılmaz", () => {
    const kosul = kisiKosulu(bos, { ...KAPSAM, ilKodu: null });
    expect(kosulVarMi(kosul, "ilKodu")).toBe(false);
  });

  it("tür seçilmediğinde üç türü birden arar", () => {
    const zincir = (kisiKosulu(bos, KAPSAM).AND ?? []) as Record<
      string,
      unknown
    >[];
    const turKosulu = zincir.find((satir) => Array.isArray(satir.OR));
    expect((turKosulu?.OR as unknown[]).length).toBe(KISI_TURLERI.length);
  });

  it("tür seçildiğinde yalnızca o türü arar", () => {
    const kosul = kisiKosulu(kisiSuzgeciniCoz({ ktur: "OGRENCI" }), KAPSAM);
    const zincir = (kosul.AND ?? []) as Record<string, unknown>[];
    expect(zincir).toContainEqual({
      roller: { some: { rolKodu: "OGRENCI", bitisTarihi: null } },
    });
  });

  it("mentör süzgeci onaylanmış mentörlüğü arar", () => {
    const kosul = kisiKosulu(kisiSuzgeciniCoz({ kgorev: "MENTOR" }), KAPSAM);
    const zincir = (kosul.AND ?? []) as Record<string, unknown>[];
    expect(zincir).toContainEqual({ mentorluk: { durum: "ONAYLANDI" } });
  });

  it("temsilcilik süzgeci yürürlükteki döneme bakar", () => {
    /*
     * Geçen yılın temsilcisi bugün o görevde değil; dönem şartı düşerse liste
     * görevden ayrılmış kişileri de "temsilci" diye gösterirdi.
     */
    const kosul = kisiKosulu(
      kisiSuzgeciniCoz({ kgorev: "ILCE_TEMSILCISI" }),
      KAPSAM,
    );
    const zincir = (kosul.AND ?? []) as Record<string, unknown>[];
    expect(zincir).toContainEqual({
      gorevRolleri: {
        some: {
          rolKodu: "ILCE_TEMSILCISI",
          egitimOgretimYili: "2026-2027",
        },
      },
    });
  });

  it("e-posta ve telefon süzgeci iki profil tablosuna birden bakar", () => {
    const kosul = kisiKosulu(
      kisiSuzgeciniCoz({ keposta: "@meb", ktel: "0532" }),
      KAPSAM,
    );
    const zincir = (kosul.AND ?? []) as Record<string, unknown>[];
    const orlar = zincir
      .filter((satir) => Array.isArray(satir.OR))
      .map((satir) => JSON.stringify(satir.OR));
    const epostaKosulu = orlar.find((metin) => metin.includes("@meb"));
    const telefonKosulu = orlar.find((metin) => metin.includes("0532"));
    expect(epostaKosulu).toContain("ogrenciProfil");
    expect(epostaKosulu).toContain("ogretmenProfil");
    expect(telefonKosulu).toContain("ogrenciProfil");
    expect(telefonKosulu).toContain("ogretmenProfil");
  });

  it("kurum süzgeci okulu da paydaş kurumunu da arar", () => {
    /*
     * Paydaş temsilcisinin kurum kodu YOKTUR; temsil ettiği kurum onay gördüğü
     * başvuru satırından geliyor. Yalnızca `kurum`a bakılsaydı paydaş satırları
     * kuruma göre hiç süzülemezdi.
     */
    const kosul = kisiKosulu(kisiSuzgeciniCoz({ kkurum: "Sanayi" }), KAPSAM);
    const zincir = (kosul.AND ?? []) as Record<string, unknown>[];
    const kurumKosulu = zincir
      .filter((satir) => Array.isArray(satir.OR))
      .map((satir) => JSON.stringify(satir.OR))
      .find((metin) => metin.includes("Sanayi"));
    expect(kurumKosulu).toContain("kurum");
    expect(kurumKosulu).toContain("disBasvurusu");
  });
});
