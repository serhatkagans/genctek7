import {
  ACIKLAMA_ASGARI,
  ACIK_DURUMLAR,
  DURUM_ETIKETLERI,
  KONU_KISA_ADLARI,
  TALEP_KONULARI,
  YANIT_SURESI_GUN,
  aciklamayiCoz,
  acikMi,
  gecikmisMi,
  kalanGun,
  konulariCoz,
  sonucuCoz,
  talepKonusuTanimi,
  yanitAdresiniCoz,
  yanitSonTarihi,
  yanitiCoz,
} from "@/lib/kvkk/basvuru-kurallar";
import { VARSAYILAN_AYDINLATMA_METNI } from "@/lib/kvkk/kurallar";
import { kvkkBasvurulariniYanitlayabilirMi } from "@/lib/yetki/izinler";
import type { AktifRol, OturumKullanicisi } from "@/lib/yetki/tipler";

/**
 * İLGİLİ KİŞİ BAŞVURUSU — Genelge 4/ç (2 Eylül 2026).
 *
 * Sınanan şey bir ekran değil, bir YÜKÜMLÜLÜK: formda kanunun saydığı
 * hakların tamamı bulunmalı, süre otuz gün olmalı ve gerekçesiz bir cevap
 * kaydedilememeli. Bunların hiçbiri ekranda hata vermez — yanlış olduklarında
 * yalnızca uyumsuz kalınır, o yüzden testle çitleniyor.
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

const OGRENCI: AktifRol = { rolKodu: "OGRENCI", ilKodu: null, kurumKodu: null };
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

describe("talep konuları", () => {
  it("Kanun'un 11. maddesindeki bentlerin tamamını taşır", () => {
    /*
     * Listeyi kısaltmak formu eksiltmektir: hangi hakkın kullanılabileceğine
     * veri sorumlusu değil kanun karar verir. Kullanılamayacak bir talebin
     * cevabı "böyle bir işleme yapılmıyor" diye VERİLİR, hak baştan
     * gizlenmez.
     */
    const maddeler = TALEP_KONULARI.map((tanim) => tanim.madde);
    for (const bent of [
      "m.11/a",
      "m.11/b",
      "m.11/c",
      "m.11/ç",
      "m.11/d",
      "m.11/e",
      "m.11/f",
      "m.11/g",
      "m.11/ğ",
    ]) {
      expect(maddeler).toContain(bent);
    }
  });

  it("açık rızanın geri alınmasını da içerir", () => {
    // 11. maddede değil 7. maddede; ilgili kişi açısından aynı formun aynı
    // satırı olduğu için listede duruyor.
    expect(
      TALEP_KONULARI.find((tanim) => tanim.konu === "ACIK_RIZA_GERI_ALMA")
        ?.madde,
    ).toBe("m.7");
  });

  it("her konunun etiketi, dayanağı ve sistemdeki karşılığı yazılıdır", () => {
    for (const tanim of TALEP_KONULARI) {
      expect(tanim.etiket.length).toBeGreaterThan(10);
      expect(tanim.aciklama.length).toBeGreaterThan(10);
      expect(KONU_KISA_ADLARI[tanim.konu]).toBeTruthy();
    }
  });

  it("tanımsız konu sessizce geçmez", () => {
    expect(() =>
      talepKonusuTanimi("YOK_BOYLE_BIR_KONU" as never),
    ).toThrow();
  });
});

describe("konu seçiminin çözümü", () => {
  it("boş seçim reddedilir", () => {
    expect(konulariCoz([])).toEqual({
      olurMu: false,
      neden: expect.stringContaining("En az bir talep konusu"),
    });
  });

  it("tanınmayan değer sessizce atılmaz, başvuru reddedilir", () => {
    // Değerler koddan geliyor; tanınmayan bir değer ya hatadır ya da elle
    // kurcalanmış bir istektir. "Anlamadığımı atarım" davranışı, kişinin
    // seçtiğini sandığı hakkın kaydedilmemesiyle sonuçlanırdı.
    const sonuc = konulariCoz(["SILME", "HER_SEYI_SIL"]);
    expect(sonuc.olurMu).toBe(false);
  });

  it("yinelenenleri eler ve kanundaki sıraya çeker", () => {
    const sonuc = konulariCoz(["SILME", "ISLENIYOR_MU", "SILME"]);
    expect(sonuc).toEqual({
      olurMu: true,
      konular: ["ISLENIYOR_MU", "SILME"],
    });
  });
});

describe("açıklama ve yanıt metni", () => {
  it("tek kelimelik başvuru kabul edilmez", () => {
    // "Sil" yazan bir başvuru cevaplanabilir bir talep değildir ve otuz gün
    // sonra karşılıklı bir "neyi?" sorusuyla biterdi.
    expect(aciklamayiCoz("Sil").olurMu).toBe(false);
  });

  it("asgari uzunluğu geçen açıklama kırpılarak kabul edilir", () => {
    const metin = `  ${"a".repeat(ACIKLAMA_ASGARI)}  `;
    expect(aciklamayiCoz(metin)).toEqual({
      olurMu: true,
      aciklama: "a".repeat(ACIKLAMA_ASGARI),
    });
  });

  it("gerekçesiz cevap kaydedilemez", () => {
    // Gerekçesiz ret Kanun'un 13. maddesine aykırı; açıklamasız kabul ise
    // "ne yapıldı" sorusunu cevapsız bırakıyor.
    expect(yanitiCoz("olmaz").olurMu).toBe(false);
    expect(yanitiCoz("Talebiniz kabul edildi ve kayıt silindi.").olurMu).toBe(
      true,
    );
  });

  it("sonuç değeri yalnızca gerçek bir sonuç olabilir", () => {
    expect(sonucuCoz("KABUL")).toEqual({ olurMu: true, durum: "KABUL" });
    // Ara durumlar bir CEVAP değil: "inceleniyor" diyerek başvuru kapatılamaz.
    expect(sonucuCoz("INCELENIYOR").olurMu).toBe(false);
    expect(sonucuCoz("ALINDI").olurMu).toBe(false);
  });
});

describe("yanıt adresi", () => {
  it("boş bırakılabilir", () => {
    // Yanıt her hâlükârda panele yazılıyor; boş alan yüzünden cevapsız kalan
    // başvuru olmuyor.
    expect(yanitAdresiniCoz("   ")).toEqual({ olurMu: true, adres: null });
  });

  it("yazıldıysa geçerli olmalı", () => {
    expect(yanitAdresiniCoz("ada@örnek").olurMu).toBe(false);
    expect(yanitAdresiniCoz(" Ada@Ornek.COM ")).toEqual({
      olurMu: true,
      adres: "ada@ornek.com",
    });
  });
});

describe("otuz günlük yanıt süresi", () => {
  const olusturma = new Date("2026-09-02T10:00:00");

  it("süre kanunun sayısıdır", () => {
    expect(YANIT_SURESI_GUN).toBe(30);
  });

  it("son tarih başvurudan otuz gün sonrasıdır", () => {
    expect(yanitSonTarihi(olusturma).toISOString()).toBe(
      new Date("2026-10-02T10:00:00").toISOString(),
    );
  });

  it("kalan gün, sürenin dolmasına kalan tam gündür", () => {
    expect(kalanGun(new Date("2026-09-02T10:00:00"), olusturma)).toBe(30);
    expect(kalanGun(new Date("2026-10-01T10:00:00"), olusturma)).toBe(1);
    expect(kalanGun(new Date("2026-10-05T10:00:00"), olusturma)).toBe(-3);
  });

  it("süresi geçmiş açık başvuru gecikmiştir", () => {
    expect(
      gecikmisMi(new Date("2026-10-05T10:00:00"), {
        durum: "ALINDI",
        olusturmaTarihi: olusturma,
      }),
    ).toBe(true);
  });

  it("sonuçlanmış başvuru, geç yanıtlanmış olsa bile gecikmiş sayılmaz", () => {
    /*
     * Fonksiyon "şu an yapılacak iş var mı" sorusuna cevap veriyor, geçmişin
     * karnesini çıkarmıyor; geç kalınmış yanıtın izi zaten yanıt tarihinde.
     */
    expect(
      gecikmisMi(new Date("2026-10-05T10:00:00"), {
        durum: "KABUL",
        olusturmaTarihi: olusturma,
      }),
    ).toBe(false);
  });

  it("açık durumlar yalnızca alındı ve inceleniyor", () => {
    expect([...ACIK_DURUMLAR]).toEqual(["ALINDI", "INCELENIYOR"]);
    expect(acikMi("INCELENIYOR")).toBe(true);
    expect(acikMi("RET")).toBe(false);
    // Beş durumun beşinin de ekranda bir karşılığı var: etiketsiz bir durum
    // kullanıcıya boş rozet olarak çıkardı.
    for (const durum of ["ALINDI", "INCELENIYOR", "KABUL", "KISMEN_KABUL", "RET"] as const) {
      expect(DURUM_ETIKETLERI[durum]).toBeTruthy();
    }
  });
});

describe("başvuruyu kim yanıtlar", () => {
  it("yalnızca proje yöneticisi", () => {
    // Başvuru VERİ SORUMLUSUNA yapılır (m.13) ve veri sorumlusu YEĞİTEK'tir.
    expect(kvkkBasvurulariniYanitlayabilirMi(kullanici(YONETICI))).toBe(true);
  });

  it("il koordinatörü kendi ilindekini bile yanıtlayamaz", () => {
    // Açılsaydı kanunun tek muhatap saydığı yerde ikinci bir merci doğar,
    // ilgili kişi ilden ile değişen cevaplar alırdı.
    expect(kvkkBasvurulariniYanitlayabilirMi(kullanici(KOORDINATOR))).toBe(
      false,
    );
    expect(kvkkBasvurulariniYanitlayabilirMi(kullanici(OGRENCI))).toBe(false);
  });
});

describe("aydınlatma metni başvuru yolunu gösterir", () => {
  it("kişiyi sistemin dışına atmaz", () => {
    /*
     * Metin 2 Eylül 2026'ya kadar "okul idareniz aracılığıyla Bakanlığa
     * başvurabilirsiniz" diyordu: okul idaresi veri sorumlusu değil ve o
     * kanalda ne kayıt tutuluyor ne de süre işliyordu (Genelge 4/ç bulgusu).
     */
    expect(VARSAYILAN_AYDINLATMA_METNI).toContain("Kişisel Verilerim");
    expect(VARSAYILAN_AYDINLATMA_METNI).toContain("başvuru formu");
    expect(VARSAYILAN_AYDINLATMA_METNI).toContain("otuz gün");
    expect(VARSAYILAN_AYDINLATMA_METNI).not.toContain(
      "okul idareniz aracılığıyla Bakanlığa başvurabilirsiniz",
    );
  });
});
