import {
  DOKUM_SUTUNLARI,
  dokumHucreleri,
  dokumSatiri,
  dokumSatirlari,
  katilimciTuru,
  RAPOR_YOK,
  type DokumFaaliyeti,
  type DokumKatilimcisi,
} from "@/lib/rapor/etkinlik-dokumu";

/**
 * Tamamlanan etkinliklerin toplu rapor dökümü (15 Ağustos 2026 · Aşama 1).
 *
 * Sayımlar dosyanın kendisidir: yanlış bir "öğrenci sayısı", raporu okuyan
 * kişinin göremeyeceği bir hatadır — dosyada makul görünen bir sayı durur.
 */

function katilimci(
  ozel: Partial<DokumKatilimcisi> = {},
): DokumKatilimcisi {
  return {
    durum: "SECILDI",
    katilimciId: 1,
    kurumKodu: 100,
    tur: "OGRENCI",
    ...ozel,
  };
}

function faaliyet(ozel: Partial<DokumFaaliyeti> = {}): DokumFaaliyeti {
  return {
    id: 1,
    ad: "İnternetin Güvenli ve Bilinçli Kullanımı",
    tarih: new Date("2026-06-16T08:00:00Z"),
    duzenleyenAdSoyad: "Bilge USLU",
    programAdi: null,
    gruplar: [],
    ilAdi: "MANİSA",
    ilceAdi: "AKHİSAR",
    okulAdi: "Adnan Menderes Kız Anadolu İmam Hatip Lisesi",
    katilimcilar: [],
    fotografSayisi: 0,
    belgeSayisi: 0,
    raporTarihi: null,
    raporOzeti: null,
    ...ozel,
  };
}

describe("katilimciTuru", () => {
  it("öğrenciyi öğrenci, danışmanı öğretmen sayar", () => {
    expect(katilimciTuru(["OGRENCI"])).toBe("OGRENCI");
    expect(katilimciTuru(["DANISMAN"])).toBe("OGRETMEN");
  });

  it("mezun ve paydaş temsilcisini ikisine de saymaz", () => {
    // İkisinin de sınıfı ve branşı boş; alan doluluğuna bakılsaydı biri
    // diğerinin sütununa düşerdi.
    expect(katilimciTuru(["MEZUN"])).toBe("DIGER");
    expect(katilimciTuru(["PAYDAS_TEMSILCISI"])).toBe("DIGER");
  });

  it("hem öğrenci hem danışman rolü varsa öğrenci sayar", () => {
    // Öncelik sabit olmalı, yoksa aynı kişi iki sütunda birden görünürdü.
    expect(katilimciTuru(["DANISMAN", "OGRENCI"])).toBe("OGRENCI");
  });
});

describe("dokumSatiri · katılımcı sayıları", () => {
  it("yalnızca seçilenleri sayar", () => {
    const satir = dokumSatiri(
      faaliyet({
        katilimcilar: [
          katilimci({ katilimciId: 1, durum: "SECILDI" }),
          katilimci({ katilimciId: 2, durum: "BEKLIYOR" }),
          katilimci({ katilimciId: 3, durum: "YEDEK" }),
          katilimci({ katilimciId: 4, durum: "REDDEDILDI" }),
          katilimci({ katilimciId: 5, durum: "GERI_CEKILDI" }),
        ],
      }),
      1,
    );

    expect(satir.ogrenciSayisi).toBe(1);
  });

  it("öğrenci ve öğretmeni ayrı sütunlara toplar", () => {
    const satir = dokumSatiri(
      faaliyet({
        katilimcilar: [
          katilimci({ katilimciId: 1, tur: "OGRENCI" }),
          katilimci({ katilimciId: 2, tur: "OGRENCI" }),
          katilimci({ katilimciId: 3, tur: "OGRETMEN" }),
          katilimci({ katilimciId: 4, tur: "DIGER" }),
        ],
      }),
      1,
    );

    expect(satir.ogrenciSayisi).toBe(2);
    expect(satir.ogretmenSayisi).toBe(1);
  });

  it("aynı kişiyi iki kez saymaz", () => {
    // Geri çekip yeniden başvuran kişinin iki satırı olabiliyor.
    const satir = dokumSatiri(
      faaliyet({
        katilimcilar: [
          katilimci({ katilimciId: 7 }),
          katilimci({ katilimciId: 7 }),
        ],
      }),
      1,
    );

    expect(satir.ogrenciSayisi).toBe(1);
  });
});

describe("dokumSatiri · okul sayısı", () => {
  it("katılımcıların geldiği farklı okulları sayar", () => {
    const satir = dokumSatiri(
      faaliyet({
        katilimcilar: [
          katilimci({ katilimciId: 1, kurumKodu: 100 }),
          katilimci({ katilimciId: 2, kurumKodu: 100 }),
          katilimci({ katilimciId: 3, kurumKodu: 200 }),
        ],
      }),
      1,
    );

    expect(satir.okulSayisi).toBe(2);
  });

  it("okulu olmayan katılımcıyı okul saymaz", () => {
    /*
     * Mezun ve paydaş temsilcisinin kurum kodu yok. NULL'lar elenmeseydi
     * hepsi tek bir "okul" gibi toplanır ve sayı bir fazla çıkardı.
     */
    const satir = dokumSatiri(
      faaliyet({
        katilimcilar: [
          katilimci({ katilimciId: 1, kurumKodu: 100 }),
          katilimci({ katilimciId: 2, kurumKodu: null, tur: "DIGER" }),
          katilimci({ katilimciId: 3, kurumKodu: null, tur: "DIGER" }),
        ],
      }),
      1,
    );

    expect(satir.okulSayisi).toBe(1);
  });

  it("katılımcısı olmayan etkinlikte sıfırdır", () => {
    const satir = dokumSatiri(faaliyet({ katilimcilar: [] }), 1);

    expect(satir.okulSayisi).toBe(0);
    expect(satir.ogrenciSayisi).toBe(0);
    expect(satir.ogretmenSayisi).toBe(0);
  });
});

describe("dokumSatiri · rapor", () => {
  it("raporu olmayan etkinlikte açık bir metin yazar", () => {
    // Boş hücre "rapor var ama okunamadı" diye de okunabilirdi.
    const satir = dokumSatiri(faaliyet({ raporOzeti: null }), 1);

    expect(satir.raporOzeti).toBe(RAPOR_YOK);
    expect(satir.raporTarihi).toBeNull();
  });

  it("yalnızca boşluktan ibaret raporu da yazılmamış sayar", () => {
    const satir = dokumSatiri(faaliyet({ raporOzeti: "   \n  " }), 1);

    expect(satir.raporOzeti).toBe(RAPOR_YOK);
  });

  it("rapor özetini kısaltmaz", () => {
    // Excel hücreyi sarıyor; kısaltmak metnin tamamını kaybettirirdi.
    const uzun = "Ö".repeat(3000);
    const satir = dokumSatiri(faaliyet({ raporOzeti: uzun }), 1);

    expect(satir.raporOzeti).toHaveLength(3000);
  });

  it("rapor tarihini yazar", () => {
    const satir = dokumSatiri(
      faaliyet({
        raporOzeti: "Etkili bir deneyim oldu.",
        raporTarihi: new Date("2026-06-18T10:00:00Z"),
      }),
      1,
    );

    /*
     * Biçimlenmiş metin değil tarihin kendisi: dosya ancak böyle tarihe göre
     * sıralanabiliyor (bkz. lib/rapor/xlsx.ts · `hucre`).
     */
    expect(satir.raporTarihi).toEqual(new Date("2026-06-18T10:00:00Z"));
    expect(satir.raporOzeti).toBe("Etkili bir deneyim oldu.");
  });
});

describe("dokumSatiri · yer ve alan", () => {
  it("çalışma gruplarını tek hücrede birleştirir", () => {
    const satir = dokumSatiri(
      faaliyet({ gruplar: ["Dijital Sanatlar", "Yapay Zekâ ve Veri"] }),
      1,
    );

    expect(satir.faaliyetAlani).toBe("Dijital Sanatlar, Yapay Zekâ ve Veri");
  });

  it("okulu olmayan (il/ulusal) etkinlikte okul hücresi boş kalır", () => {
    const satir = dokumSatiri(faaliyet({ okulAdi: null, ilceAdi: null }), 1);

    expect(satir.okul).toBe("");
    expect(satir.ilce).toBe("");
    expect(satir.il).toBe("MANİSA");
  });
});

describe("dokumSatirlari", () => {
  it("sıra numarasını birden başlatır", () => {
    const satirlar = dokumSatirlari([faaliyet(), faaliyet(), faaliyet()]);

    expect(satirlar.map((satir) => satir.siraNo)).toEqual([1, 2, 3]);
  });

  it("kayıt yokken boş dizi döner", () => {
    expect(dokumSatirlari([])).toEqual([]);
  });
});

describe("dokumHucreleri", () => {
  it("sütun başlıklarıyla aynı sayıda hücre üretir", () => {
    /*
     * Bu iki liste elle sıralı ve ayrı yerlerde duruyor: biri değişip diğeri
     * değişmezse dosyadaki başlıklar sütunlarla kayar ve hata dosyayı açan
     * kişiye "yanlış sütunda doğru görünen veri" olarak ulaşır.
     */
    const hucreler = dokumHucreleri(dokumSatiri(faaliyet(), 1));

    expect(hucreler).toHaveLength(DOKUM_SUTUNLARI.length);
  });

  it("sayı sütunlarını sayı olarak verir", () => {
    // xlsx yazıcısı yalnızca gerçek `number` değerleri sayı hücresi yapıyor.
    const hucreler = dokumHucreleri(
      dokumSatiri(faaliyet({ fotografSayisi: 4, belgeSayisi: 2 }), 1),
    );

    expect(typeof hucreler[0]).toBe("number"); // sıra no
    expect(hucreler[12]).toBe(4); // fotoğraf sayısı
    expect(hucreler[13]).toBe(2); // belge sayısı
  });
});
