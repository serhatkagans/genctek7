import {
  PUAN_KAYNAKLARI,
  puanDokumu,
  seviyeBul,
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
    gorevSayisi: 0,
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
        gorevSayisi: 1, // 2
        mentorMu: true, // 2
      }),
    );
    expect(durum.toplamPuan).toBe(1 + 5 + 2 + 2 + 2 + 2);
    expect(durum.seviye.ad).toBe("Harekette");
  });
});
