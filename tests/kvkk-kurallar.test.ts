import {
  BELGE_TANIMLARI,
  belgeTanimi,
  kullanicininBelgeleri,
  onayiGerekiyorMu,
  saklamaSonTarihi,
  VARSAYILAN_ACIK_RIZA_METNI,
  VARSAYILAN_AYDINLATMA_METNI,
  VARSAYILAN_GIZLILIK_SOZLESMESI_METNI,
  VARSAYILAN_TAAHHUTNAME_METNI,
} from "@/lib/kvkk/kurallar";
import type { AktifRol, OturumKullanicisi } from "@/lib/yetki/tipler";

/**
 * KVKK kararları — domain-rules.md Bölüm 10.
 *
 * Kullanıcıların büyük bölümü 18 yaş altı; aydınlatma ve saklama kuralları
 * gevşetilemez, bu yüzden kararlar burada sınanır.
 *
 * Belge–rol eşlemesi de burada sınanıyor: hangi belgenin kimden isteneceği bir
 * ÜRÜN KARARIDIR (kullanıcı kararı, bkz. lib/kvkk/kurallar.ts). Kapsamın
 * yanlışlıkla genişlemesi ekranda hata vermez, yalnızca insanlara okumadıkları
 * bir yükümlülük imzalatır — o yüzden testle çitleniyor.
 */

function kullanici(...roller: AktifRol[]): OturumKullanicisi {
  return {
    id: 1,
    ad: "Ada",
    soyad: "Yılmaz",
    kurumKodu: 100,
    ilKodu: "06",
    ilceKodu: "0601",
    sinif: null,
    brans: null,
    egitimOgretimYili: "2026-2027",
    roller,
  };
}

const OGRENCI: AktifRol = {
  rolKodu: "OGRENCI",
  ilKodu: null,
  kurumKodu: null,
};
const DANISMAN: AktifRol = {
  rolKodu: "DANISMAN",
  ilKodu: null,
  kurumKodu: 100,
};
const KOORDINATOR: AktifRol = {
  rolKodu: "IL_KOORDINATOR",
  ilKodu: "06",
  kurumKodu: null,
};
const YONETICI: AktifRol = {
  rolKodu: "PROJE_YONETICISI",
  ilKodu: null,
  kurumKodu: null,
};

describe("belge onayının tazeliği", () => {
  const metinTarihi = new Date("2026-03-01T10:00:00Z");

  it("hiç onaylamamış kişiden onay istenir", () => {
    expect(
      onayiGerekiyorMu({
        onayTarihi: null,
        metinGuncellemeTarihi: metinTarihi,
      }),
    ).toBe(true);
  });

  it("metinden sonra verilen onay geçerlidir", () => {
    expect(
      onayiGerekiyorMu({
        onayTarihi: new Date("2026-03-02T10:00:00Z"),
        metinGuncellemeTarihi: metinTarihi,
      }),
    ).toBe(false);
  });

  it("metin güncellenince eski onay geçersizleşir", () => {
    // Kişi artık başka bir metni onaylamış olur; yeniden onay istenir.
    expect(
      onayiGerekiyorMu({
        onayTarihi: new Date("2026-02-01T10:00:00Z"),
        metinGuncellemeTarihi: metinTarihi,
      }),
    ).toBe(true);
  });

  it("metin hiç düzenlenmemişse varsayılan metne verilen onay yeter", () => {
    expect(
      onayiGerekiyorMu({
        onayTarihi: new Date("2026-02-01T10:00:00Z"),
        metinGuncellemeTarihi: null,
      }),
    ).toBe(false);
  });
});

describe("belge–rol eşlemesi", () => {
  it("açık rıza HERKESTEN istenir", () => {
    for (const kisi of [
      kullanici(OGRENCI),
      kullanici(DANISMAN),
      kullanici(KOORDINATOR),
      kullanici(YONETICI),
      kullanici(), // henüz görev almamış öğretmen
    ]) {
      expect(kullanicininBelgeleri(kisi).map((t) => t.belge)).toContain(
        "ACIK_RIZA",
      );
    }
  });

  it("öğrenciden aydınlatma ve açık rıza istenir, koordinatör belgeleri istenmez", () => {
    expect(kullanicininBelgeleri(kullanici(OGRENCI)).map((t) => t.belge)).toEqual(
      ["AYDINLATMA", "ACIK_RIZA"],
    );
  });

  it("danışman öğretmenden yalnızca açık rıza istenir", () => {
    // Danışman kendi okulundaki öğrencilerle yüz yüze çalışır; taahhütname ve
    // gizlilik sözleşmesi bilinçli olarak yalnızca koordinatörden isteniyor.
    expect(
      kullanicininBelgeleri(kullanici(DANISMAN)).map((t) => t.belge),
    ).toEqual(["ACIK_RIZA"]);
  });

  it("il koordinatöründen açık rıza, taahhütname ve gizlilik sözleşmesi istenir", () => {
    expect(
      kullanicininBelgeleri(kullanici(KOORDINATOR)).map((t) => t.belge),
    ).toEqual(["ACIK_RIZA", "TAAHHUTNAME", "GIZLILIK_SOZLESMESI"]);
  });

  it("proje yöneticisinden yalnızca açık rıza istenir", () => {
    // Merkez personeli kurumsal görev tanımıyla bağlıdır; sistem içi bir metin
    // onun yükümlülüğünü doğurmaz.
    expect(
      kullanicininBelgeleri(kullanici(YONETICI)).map((t) => t.belge),
    ).toEqual(["ACIK_RIZA"]);
  });

  it("koordinatörlüğü de olan öğrenci her iki kümenin belgelerini görür", () => {
    expect(
      kullanicininBelgeleri(kullanici(OGRENCI, KOORDINATOR)).map((t) => t.belge),
    ).toEqual([
      "AYDINLATMA",
      "ACIK_RIZA",
      "TAAHHUTNAME",
      "GIZLILIK_SOZLESMESI",
    ]);
  });
});

describe("belge tanımları", () => {
  it("her belgenin ayar anahtarı tekildir", () => {
    // İki belge aynı anahtarı paylaşsaydı birinin metni düzenlendiğinde
    // diğerinin onayı da sessizce eskirdi.
    const anahtarlar = BELGE_TANIMLARI.map((tanim) => tanim.ayarAnahtari);
    expect(new Set(anahtarlar).size).toBe(anahtarlar.length);
  });

  it("tanımsız belge kodu gürültülü başarısız olur", () => {
    // @ts-expect-error — enum dışı değerle çağrı bilinçli
    expect(() => belgeTanimi("YOK_BOYLE_BIR_BELGE")).toThrow();
  });
});

describe("saklama süresi", () => {
  it("verilen ay kadar geriye gider", () => {
    const sinir = saklamaSonTarihi(new Date("2026-07-15T00:00:00"), 24);
    expect(sinir.getFullYear()).toBe(2024);
    expect(sinir.getMonth()).toBe(6);
  });

  it("yıl sınırını doğru aşar", () => {
    const sinir = saklamaSonTarihi(new Date("2026-02-10T00:00:00"), 12);
    expect(sinir.getFullYear()).toBe(2025);
    expect(sinir.getMonth()).toBe(1);
  });
});

describe("varsayılan belge metinleri", () => {
  it("aydınlatma metni zorunlu başlıkları içerir", () => {
    // Metin sistem ayarından değiştirilebilir ama varsayılanı eksik olamaz:
    // veri sorumlusu, işlenen veri, saklama süresi ve haklar geçmek zorunda.
    for (const parca of [
      "Veri sorumlusu",
      "İşlenen veriler",
      "Saklama süresi",
      "Haklarınız",
    ]) {
      expect(VARSAYILAN_AYDINLATMA_METNI).toContain(parca);
    }
  });

  it("aydınlatma metni e-Okul kaynaklı alanların değiştirilemeyeceğini söyler", () => {
    expect(VARSAYILAN_AYDINLATMA_METNI).toContain("e-Okul");
    expect(VARSAYILAN_AYDINLATMA_METNI).toContain("değiştirilemez");
  });

  /*
   * AÇIK RIZA METNİ KURUMUN KENDİ METNİ (31 Ağustos 2026 · istek: "açık rıza
   * metnini bu şekilde yapalım değişsin").
   *
   * İki eski beklenti KALKTI çünkü gelen metinde karşılıkları yok: "rızamı
   * dilediğim zaman geri alabilirim" cümlesi ve "aydinlatma metninden ayrıdır"
   * ayırması. Yerlerine metnin taşıması gereken üç şey sınanıyor: veri
   * sorumlusunun kim olduğu, KVKK 11. madde hakları ve sonundaki onay beyanı —
   * beyan olmadan ekran bir onay ekranı olmaz.
   */
  it("açık rıza metni veri sorumlusunu ve hakları yazar", () => {
    expect(VARSAYILAN_ACIK_RIZA_METNI).toContain("Veri Sorumlusu");
    expect(VARSAYILAN_ACIK_RIZA_METNI).toContain(
      "Yenilik ve Eğitim Teknolojileri Genel Müdürlüğü",
    );
    expect(VARSAYILAN_ACIK_RIZA_METNI).toContain("11. maddesi");
  });

  it("açık rıza metni onay beyanıyla biter", () => {
    expect(VARSAYILAN_ACIK_RIZA_METNI.trimEnd()).toMatch(/onaylıyorum\.$/);
  });

  it("taahhütname görevle, gizlilik sözleşmesi veriyle ilgilidir", () => {
    // İkisinin karışması, birinin ihlalini diğerinin onayıyla tartışmalı
    // hâle getirirdi.
    expect(VARSAYILAN_TAAHHUTNAME_METNI).toContain("Taahhütnamesi");
    expect(VARSAYILAN_GIZLILIK_SOZLESMESI_METNI).toContain("6698");
  });
});
