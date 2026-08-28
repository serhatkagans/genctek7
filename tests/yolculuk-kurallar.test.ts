import {
  PUAN_KAYNAKLARI,
  puanDokumu,
  seviyeBul,
  seviyeAdiTirnakli,
  seviyeYildizi,
  TOPLAM_YILDIZ,
  YOLCULUK_SEVIYELERI,
  yolculukDurumu,
} from "@/lib/yolculuk/kurallar";

/**
 * GençTek Yolculuğu — puan ve seviye kuralları (21 Ağustos 2026).
 *
 * İstek: "katkı nişanlarımı gençtek yolculuğum yapalım, aşamalar şunlar
 * olacak: 'Hello World' · Keşifte · Harekette · Üretimde · Katkıda · Ufuk Açan
 * · İz Bırakan".
 *
 * Sınanan şey ekran değil KARARDIR: hangi kayıt kaç puan getirir, hangi puan
 * hangi seviyeye denk düşer.
 */

function girdi(ozellikler: Record<string, unknown> = {}) {
  return {
    katilimSayisi: 0,
    urunSayisi: 0,
    deneyimSayisi: 0,
    calismaGrubuSayisi: 0,
    akranEgitimiSayisi: 0,
    duzenlenenEtkinlikSayisi: 0,
    temsilcilikSayisi: 0,
    gencTekGorevSayisi: 0,
    ekipSayisi: 0,
    mentorMu: false,
    aktifDanismanlikSayisi: 0,
    ...ozellikler,
  };
}

describe("yolculuk seviyeleri", () => {
  it("istenen yedi aşama, istenen sırada", () => {
    expect(YOLCULUK_SEVIYELERI.map((seviye) => seviye.ad)).toEqual([
      '"Hello World"',
      "Keşifte",
      "Harekette",
      "Üretimde",
      "Katkıda",
      "Ufuk Açan",
      "İz Bırakan",
    ]);
  });

  it("eşikler artan sırada ve ilki sıfır", () => {
    /*
     * İlk eşik SIFIR: sisteme giren herkes yolculuğun içinde. "Henüz seviyen
     * yok" demek, kayıt olmayı bir adım saymamak olurdu.
     */
    expect(YOLCULUK_SEVIYELERI[0].esik).toBe(0);
    const esikler = YOLCULUK_SEVIYELERI.map((seviye) => seviye.esik);
    expect([...esikler].sort((a, b) => a - b)).toEqual(esikler);
  });

  it("puan seviyeyi ULAŞILAN EN YÜKSEK eşikten bulur", () => {
    expect(seviyeBul(0).ad).toBe('"Hello World"');
    expect(seviyeBul(2).ad).toBe('"Hello World"');
    expect(seviyeBul(3).ad).toBe("Keşifte");
    expect(seviyeBul(14).ad).toBe("Harekette");
    expect(seviyeBul(15).ad).toBe("Üretimde");
    expect(seviyeBul(1000).ad).toBe("İz Bırakan");
  });
});

describe("puan dökümü", () => {
  it("kayıt puanı herkeste vardır", () => {
    // Kişi sistemin içinde olduğu için ilk puan oradan geliyor.
    const durum = yolculukDurumu(girdi());
    expect(durum.toplamPuan).toBe(1);
    expect(durum.seviye.ad).toBe('"Hello World"');
  });

  it("sıfır adetli kaynak dökümde görünmez", () => {
    // "0 danışmanlık" satırı öğrencinin ekranında anlamsız olurdu.
    const dokum = puanDokumu(girdi({ katilimSayisi: 2 }));
    expect(dokum.map((satir) => satir.kod)).toEqual(["KAYIT", "KATILIM"]);
  });

  it("adet ile birim puan çarpılır", () => {
    const dokum = puanDokumu(girdi({ duzenlenenEtkinlikSayisi: 3 }));
    const satir = dokum.find((s) => s.kod === "ETKINLIK_DUZENLEME");
    expect(satir).toBeDefined();
    expect(satir?.adet).toBe(3);
    expect(satir?.toplam).toBe(3 * (satir?.puan ?? 0));
  });

  it("mentörlük bir kez sayılır", () => {
    // Mentörlük bir DURUMDUR, tekrarlanan bir eylem değil.
    const dokum = puanDokumu(girdi({ mentorMu: true }));
    expect(dokum.find((s) => s.kod === "MENTORLUK")?.adet).toBe(1);
  });

  it("her kaynağın karşılığı puan listesinde tanımlıdır", () => {
    const kodlar = PUAN_KAYNAKLARI.map((kaynak) => kaynak.kod);
    expect(new Set(kodlar).size).toBe(kodlar.length);
    for (const kaynak of PUAN_KAYNAKLARI) {
      expect(kaynak.puan).toBeGreaterThan(0);
      expect(kaynak.etiket).toBeTruthy();
      expect(kaynak.yolEtiketi).toBeTruthy();
      expect(kaynak.topluEtiketi).toBeTruthy();
      expect(kaynak.topluYolEtiketi).toBeTruthy();
    }
  });
});

describe("yolculuk durumu", () => {
  it("sonraki seviyeye kalan puanı söyler", () => {
    // 1 (kayıt) + 4 katılım = 5 puan → Keşifte (3), sonraki Harekette (8).
    const durum = yolculukDurumu(girdi({ katilimSayisi: 4 }));
    expect(durum.toplamPuan).toBe(5);
    expect(durum.seviye.ad).toBe("Keşifte");
    expect(durum.sonraki?.ad).toBe("Harekette");
    expect(durum.kalanPuan).toBe(3);
  });

  it("yüzde iki eşik ARASINI ölçer", () => {
    /*
     * Toplam puana göre çizilseydi üst seviyelerde çubuk neredeyse hiç
     * kıpırdamaz, ilerleme görünmez olurdu.
     */
    const durum = yolculukDurumu(girdi({ katilimSayisi: 4 }));
    // Keşifte 3 → Harekette 8 arası 5 puan; 5 puandayız, yani 2/5 = %40.
    expect(durum.yuzde).toBe(40);
  });

  it("en üst seviyede sonraki yoktur ve çubuk doludur", () => {
    const durum = yolculukDurumu(girdi({ katilimSayisi: 100 }));
    expect(durum.seviye.ad).toBe("İz Bırakan");
    expect(durum.sonraki).toBeNull();
    expect(durum.kalanPuan).toBe(0);
    expect(durum.yuzde).toBe(100);
  });

  it("farklı kaynaklar toplanır", () => {
    const durum = yolculukDurumu(
      girdi({
        katilimSayisi: 5, // 5
        urunSayisi: 2, // 2
        akranEgitimiSayisi: 1, // 2
        temsilcilikSayisi: 1, // 2
        mentorMu: true, // 2
      }),
    );
    expect(durum.toplamPuan).toBe(1 + 5 + 2 + 2 + 2 + 2);
    expect(durum.seviye.ad).toBe("Harekette");
  });
});

/**
 * YILDIZ — ekranda puanın yerini alan ölçü (28 Ağustos 2026).
 *
 * Sınanan şey, yıldızın SEVİYEYLE AYNI ŞEYİ söylediğidir: ikisi ayrışırsa
 * kişi kartta "Üretimde" okurken şeritte dört yıldızın üçüncüsünde işaretli
 * görünür ve hangisinin doğru olduğunu bilemez.
 */
describe("seviye yıldızı", () => {
  it("ilk basamak bir, son basamak yedi yıldızdır", () => {
    expect(seviyeYildizi("HELLO_WORLD")).toBe(1);
    expect(seviyeYildizi("IZ_BIRAKAN")).toBe(TOPLAM_YILDIZ);
    expect(TOPLAM_YILDIZ).toBe(YOLCULUK_SEVIYELERI.length);
  });

  it("her seviyenin yıldızı sırasının bir fazlasıdır", () => {
    YOLCULUK_SEVIYELERI.forEach((seviye, sira) => {
      expect(seviyeYildizi(seviye.kod)).toBe(sira + 1);
    });
  });

  it("durumdaki yıldız, ulaşılan seviyenin yıldızıdır", () => {
    // 1 (kayıt) + 4 katılım = 5 → Keşifte, yani ikinci basamak.
    const durum = yolculukDurumu(girdi({ katilimSayisi: 4 }));
    expect(durum.seviye.kod).toBe("KESIFTE");
    expect(durum.yildiz).toBe(2);
  });

  it("tanınmayan kod tek yıldıza düşer, çökmez", () => {
    // Şerit ve kart seviye kodunu dışarıdan alıyor; bilinmeyen bir kod
    // geldiğinde ekranın boş yıldız dizisi basması, hata vermesinden iyidir.
    expect(seviyeYildizi("YOK_BOYLE_BIR_SEVIYE")).toBe(1);
  });
});

/**
 * YOLCULUĞU NELERİN İLERLETTİĞİ — ekrandaki liste (28 Ağustos 2026).
 *
 * Kalemler ve SIRALARI istekte tek tek sayıldı; dizinin sırası ekranın sırası
 * olduğu için burada aynen sınanıyor. Bir kalem eklenir ya da yeri
 * değiştirilirse bu test düşer — listenin sessizce kaymasındansa testin
 * düşmesi iyidir.
 */
describe("yolculuğu ilerleten kalemler", () => {
  const yol = (kimde: "ogrenci" | "ogretmen") =>
    PUAN_KAYNAKLARI.filter(
      (kaynak) => kaynak.kimde === "herkes" || kaynak.kimde === kimde,
    ).map((kaynak) => kaynak.yolEtiketi);

  it("öğrenciye istenen liste, istenen sırada gösterilir", () => {
    expect(yol("ogrenci")).toEqual([
      "Ekosisteme kayıt ol",
      "GençTek Vitrin'de ürünün sergilensin",
      "Çalışma grubu seç",
      "GençTek etkinliklerine katıl",
      "Mentör ol",
      "Deneyim yükle",
      "Temsilci ol",
      "GençTek Görevleri tamamla",
      "Akran Eğitimi ver",
      "Topluluk, ekip ya da kulübe katıl",
    ]);
  });

  it("öğretmene çalışma grubu ve akran eğitimi gösterilmez", () => {
    const liste = yol("ogretmen");
    expect(liste).not.toContain("Çalışma grubu seç");
    expect(liste).not.toContain("Akran Eğitimi ver");
    expect(liste).toContain("Etkinlik düzenle");
    expect(liste).toContain("Danışmanlık üstlen");
  });

  it("temsilcilik ile GençTek görevi ayrı sayılır ama toplam değişmez", () => {
    // Ayrım sunumda: ikisi tek kalemken de her biri 2 puandı.
    const ayri = yolculukDurumu(
      girdi({ temsilcilikSayisi: 1, gencTekGorevSayisi: 1 }),
    );
    expect(ayri.toplamPuan).toBe(1 + 2 + 2);
    expect(ayri.dokum.map((satir) => satir.kod)).toEqual([
      "KAYIT",
      "TEMSILCILIK",
      "GENCTEK_GOREVI",
    ]);
  });

  it("ekip üyeliği yolculuğu ilerletir", () => {
    const durum = yolculukDurumu(girdi({ ekipSayisi: 2 }));
    expect(durum.toplamPuan).toBe(1 + 2);
  });
});

/**
 * ÖĞRETMEN METİNLERİ (28 Ağustos 2026 · istek: "metinleri de öğretmene göre
 * 'Öğrencileriniz ekosisteme adım atıyor' … değiştiriyoruz").
 *
 * Sınanan şey, her basamağın ve her kalemin öğretmen karşılığının BULUNDUĞU:
 * biri unutulursa öğretmenin ekranında o satır ikinci tekil şahısta kalır ve
 * öğrencilerinin kaydı öğretmenin kendi kaydı gibi okunur.
 */
describe("öğretmen metinleri", () => {
  it("her basamağın öğretmene göre yazılmış açıklaması vardır", () => {
    for (const seviye of YOLCULUK_SEVIYELERI) {
      expect(seviye.ogretmenAciklamasi).toBeTruthy();
      // Öğrenci metniyle aynı olmamalı: şahsı değişmemiş demektir.
      expect(seviye.ogretmenAciklamasi).not.toBe(seviye.aciklama);
      expect(seviye.ogretmenAciklamasi).toContain("Öğrencileriniz");
    }
  });

  it("topluluk defteri satırları öğrencileri özne alır", () => {
    for (const kaynak of PUAN_KAYNAKLARI) {
      expect(kaynak.topluEtiketi).not.toBe(kaynak.etiket);
      expect(kaynak.topluYolEtiketi).not.toBe(kaynak.yolEtiketi);
    }
  });

  it("öğretmenin yol listesi istenen cümlelerle, istenen sırada", () => {
    const liste = PUAN_KAYNAKLARI.filter(
      (kaynak) => kaynak.kimde === "herkes" || kaynak.kimde === "ogrenci",
    ).map((kaynak) => kaynak.topluYolEtiketi);
    expect(liste).toEqual([
      "Ekosisteme kayıt olurlar",
      "GençTek Vitrin'de ürünleri sergilenir",
      "Çalışma grubu seçerler",
      "GençTek etkinliklerine katılırlar",
      "Mentör olurlar",
      "Deneyim yüklerler",
      "Temsilci olurlar",
      "GençTek Görevleri tamamlarlar",
      "Akran Eğitimi verirler",
      "Topluluk/ekip/kulüp kurar ya da katılırlar",
    ]);
  });
});

/**
 * SEVİYE ADININ TIRNAĞI (28 Ağustos 2026 · bulgu: ekranda
 * `Öğrencilerinin çoğu ""Hello World"" aşamasında.` yazıyordu).
 */
describe("seviye adı tırnağı", () => {
  it("zaten tırnaklı ad ikinci kez tırnağa alınmaz", () => {
    expect(seviyeAdiTirnakli('"Hello World"')).toBe('"Hello World"');
  });

  it("tırnaksız ad tırnağa alınır", () => {
    expect(seviyeAdiTirnakli("Keşifte")).toBe('"Keşifte"');
  });

  it("hiçbir seviye adı çift tırnakla basılmaz", () => {
    for (const seviye of YOLCULUK_SEVIYELERI) {
      expect(seviyeAdiTirnakli(seviye.ad)).not.toContain('""');
    }
  });
});
