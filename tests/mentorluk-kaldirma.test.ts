import {
  KALDIRMA_TALEBI_GEREKCESI_ASGARI,
  kaldirmaTalebiOnayMercii,
  mentorlukKaldirmaKarariGecerliMi,
  mentorlukKaldirmaTalebiGecerliMi,
  ogrenciMentorlukKarariGecerliMi,
} from "@/lib/mentor/kurallar";
import {
  mentorlukKaldirmaTalebiniOnaylayabilirMi,
  ogrenciMentorluguKaldirmaDuzeyi,
} from "@/lib/yetki/izinler";
import { danismanYap, koordinatorYap, projeYoneticisiYap } from "./yardimcilar";

/**
 * ÖĞRENCİ MENTÖRLÜĞÜNÜN KALDIRILMASINDAKİ HİYERARŞİ (28 Ağustos 2026).
 *
 * İSTEK: "Mentör olarak atanan öğrencinin danışman öğretmeni, il koordinatörü
 * ve proje yöneticisi iptal edebilsin, hiyerarşi olsun: öğretmeninkini
 * koordinatör ve proje yöneticisi, koordinatörünkini de proje yöneticisi
 * onaylasın, proje yöneticisine onay yok".
 *
 * Sınanan şey ekran değil KARARDIR: kim hangi düzeyden kaldırır, talebi kim
 * karara bağlar, hangi talep açılabilir.
 */

const OGRENCI = { id: 100, ilKodu: "34" };

describe("kaldırmanın düzeyi", () => {
  it("proje yöneticisininki onaya gitmez", () => {
    expect(
      ogrenciMentorluguKaldirmaDuzeyi(projeYoneticisiYap(), OGRENCI, false),
    ).toBe("MERKEZ");
  });

  it("kendi ilindeki öğrenci için koordinatör düzeyinden istenir", () => {
    expect(
      ogrenciMentorluguKaldirmaDuzeyi(
        koordinatorYap({ ilKodu: "34" }),
        OGRENCI,
        false,
      ),
    ).toBe("IL_KOORDINATOR");
  });

  it("kendi öğrencisi için danışman düzeyinden istenir", () => {
    expect(ogrenciMentorluguKaldirmaDuzeyi(danismanYap(), OGRENCI, true)).toBe(
      "DANISMAN",
    );
  });

  /*
   * EN YÜKSEK DÜZEY KAZANIR. Koordinatörlerin çoğu aynı zamanda okulunda
   * danışman: sıra tersten okunsaydı, kendi öğrencisi için DANISMAN
   * düzeyinden talep açar ve o talebi onaylayacak mercii kendisi olurdu —
   * kendi talebini onaylayamadığı için de mentörlük merkeze gitmeden
   * kaldırılamazdı.
   */
  it("hem danışman hem koordinatör olan kişi koordinatör düzeyindedir", () => {
    const ikisiBirden = koordinatorYap({
      ilKodu: "34",
      roller: [
        { rolKodu: "DANISMAN", ilKodu: null, kurumKodu: 750001 },
        { rolKodu: "IL_KOORDINATOR", ilKodu: "34", kurumKodu: null },
      ],
    });
    expect(ogrenciMentorluguKaldirmaDuzeyi(ikisiBirden, OGRENCI, true)).toBe(
      "IL_KOORDINATOR",
    );
  });

  it("danışmanlığında olmayan öğrenciye dokunamaz", () => {
    expect(
      ogrenciMentorluguKaldirmaDuzeyi(danismanYap(), OGRENCI, false),
    ).toBeNull();
  });

  it("başka ilin koordinatörü dokunamaz", () => {
    expect(
      ogrenciMentorluguKaldirmaDuzeyi(
        koordinatorYap({ ilKodu: "06" }),
        OGRENCI,
        false,
      ),
    ).toBeNull();
  });

  it("kişi kendi mentörlüğünü bu kapıdan kaldıramaz", () => {
    const koordinator = koordinatorYap({ ilKodu: "34" });
    expect(
      ogrenciMentorluguKaldirmaDuzeyi(
        koordinator,
        { id: koordinator.id, ilKodu: "34" },
        false,
      ),
    ).toBeNull();
  });
});

describe("talebi kim karara bağlar", () => {
  const danismaninTalebi = {
    isteyenKullaniciId: 200,
    isteyenDuzeyi: "DANISMAN" as const,
  };
  const koordinatorunTalebi = {
    isteyenKullaniciId: 300,
    isteyenDuzeyi: "IL_KOORDINATOR" as const,
  };

  it("öğretmeninkini ilin koordinatörü onaylar", () => {
    expect(
      mentorlukKaldirmaTalebiniOnaylayabilirMi(
        koordinatorYap({ ilKodu: "34" }),
        danismaninTalebi,
        OGRENCI,
      ),
    ).toBe(true);
  });

  it("öğretmeninkini proje yöneticisi de onaylar", () => {
    expect(
      mentorlukKaldirmaTalebiniOnaylayabilirMi(
        projeYoneticisiYap(),
        danismaninTalebi,
        OGRENCI,
      ),
    ).toBe(true);
  });

  it("başka ilin koordinatörü öğretmenin talebine karar veremez", () => {
    expect(
      mentorlukKaldirmaTalebiniOnaylayabilirMi(
        koordinatorYap({ ilKodu: "06" }),
        danismaninTalebi,
        OGRENCI,
      ),
    ).toBe(false);
  });

  it("koordinatörünkini yalnızca proje yöneticisi onaylar", () => {
    expect(
      mentorlukKaldirmaTalebiniOnaylayabilirMi(
        projeYoneticisiYap(),
        koordinatorunTalebi,
        OGRENCI,
      ),
    ).toBe(true);
    expect(
      mentorlukKaldirmaTalebiniOnaylayabilirMi(
        koordinatorYap({ ilKodu: "34", id: 301 }),
        koordinatorunTalebi,
        OGRENCI,
      ),
    ).toBe(false);
  });

  it("danışman hiçbir talebi karara bağlayamaz", () => {
    expect(
      mentorlukKaldirmaTalebiniOnaylayabilirMi(
        danismanYap({ id: 201 }),
        danismaninTalebi,
        OGRENCI,
      ),
    ).toBe(false);
  });

  /*
   * HİYERARŞİYİ TAŞIYAN KOŞUL: onaysız kaldırma yetkisi yalnızca merkezde.
   * Bu koşul olmasaydı, danışman düzeyinden talep açan bir koordinatör kendi
   * talebini bir sonraki tıklamada onaylardı.
   */
  it("kimse kendi talebini onaylayamaz", () => {
    const koordinator = koordinatorYap({ ilKodu: "34" });
    expect(
      mentorlukKaldirmaTalebiniOnaylayabilirMi(
        koordinator,
        { isteyenKullaniciId: koordinator.id, isteyenDuzeyi: "DANISMAN" },
        OGRENCI,
      ),
    ).toBe(false);
  });
});

describe("talep açılabilir mi", () => {
  const gecerli = {
    mevcutDurum: "ONAYLANDI" as const,
    talepDurumu: null,
    gerekce: "Öğrenci sınav döneminde, mentörlüğe ara veriyor.",
  };

  it("onaylı mentörlük ve gerekçe varsa açılır", () => {
    const karar = mentorlukKaldirmaTalebiGecerliMi(gecerli);
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) expect(karar.gerekce).toBe(gecerli.gerekce);
  });

  it("gerekçe kısa ise açılmaz", () => {
    const karar = mentorlukKaldirmaTalebiGecerliMi({
      ...gecerli,
      gerekce: "x".repeat(KALDIRMA_TALEBI_GEREKCESI_ASGARI - 1),
    });
    expect(karar.olurMu).toBe(false);
  });

  it("mentör olmayan öğrenci için açılmaz", () => {
    expect(
      mentorlukKaldirmaTalebiGecerliMi({ ...gecerli, mevcutDurum: "BEKLIYOR" })
        .olurMu,
    ).toBe(false);
    expect(
      mentorlukKaldirmaTalebiGecerliMi({ ...gecerli, mevcutDurum: null }).olurMu,
    ).toBe(false);
  });

  it("bekleyen talep varken ikincisi açılmaz", () => {
    expect(
      mentorlukKaldirmaTalebiGecerliMi({
        ...gecerli,
        talepDurumu: "BEKLIYOR",
      }).olurMu,
    ).toBe(false);
  });

  /*
   * Reddedilen talep "bu gerekçe yeterli değil" demektir, "bir daha istenemez"
   * değil; koşullar değişebilir.
   */
  it("reddedilmiş eski talep yeni talebi engellemez", () => {
    expect(
      mentorlukKaldirmaTalebiGecerliMi({
        ...gecerli,
        talepDurumu: "REDDEDILDI",
      }).olurMu,
    ).toBe(true);
  });
});

describe("talebin kararı", () => {
  const bekleyen = {
    talepDurumu: "BEKLIYOR" as const,
    mentorlukDurumu: "ONAYLANDI" as const,
    retGerekcesi: "",
  };

  it("onayda gerekçe istenmez", () => {
    const karar = mentorlukKaldirmaKarariGecerliMi({
      ...bekleyen,
      yeniDurum: "ONAYLANDI",
    });
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) expect(karar.retGerekcesi).toBeNull();
  });

  it("rette gerekçe zorunludur", () => {
    expect(
      mentorlukKaldirmaKarariGecerliMi({
        ...bekleyen,
        yeniDurum: "REDDEDILDI",
      }).olurMu,
    ).toBe(false);

    const karar = mentorlukKaldirmaKarariGecerliMi({
      ...bekleyen,
      yeniDurum: "REDDEDILDI",
      retGerekcesi: "  Öğrenciyle görüştüm.  ",
    });
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) expect(karar.retGerekcesi).toBe("Öğrenciyle görüştüm.");
  });

  it("karara bağlanmış talep ikinci kez karara bağlanamaz", () => {
    expect(
      mentorlukKaldirmaKarariGecerliMi({
        ...bekleyen,
        talepDurumu: "ONAYLANDI",
        yeniDurum: "ONAYLANDI",
      }).olurMu,
    ).toBe(false);
    expect(
      mentorlukKaldirmaKarariGecerliMi({
        ...bekleyen,
        talepDurumu: null,
        yeniDurum: "ONAYLANDI",
      }).olurMu,
    ).toBe(false);
  });

  /*
   * Mentörlük arada düşmüş olabilir (kişi bıraktı ya da merkez doğrudan
   * kaldırdı). Onaylanacak bir şey kalmadı; talep REDDEDİLEREK kapatılabilir,
   * yoksa kuyrukta sonsuza kadar duran bir satır kalırdı.
   */
  it("mentörlük arada düşmüşse onaylanamaz ama reddedilebilir", () => {
    expect(
      mentorlukKaldirmaKarariGecerliMi({
        ...bekleyen,
        mentorlukDurumu: "BIRAKILDI",
        yeniDurum: "ONAYLANDI",
      }).olurMu,
    ).toBe(false);
    expect(
      mentorlukKaldirmaKarariGecerliMi({
        ...bekleyen,
        mentorlukDurumu: "BIRAKILDI",
        yeniDurum: "REDDEDILDI",
        retGerekcesi: "Mentörlük zaten sona ermiş.",
      }).olurMu,
    ).toBe(true);
  });
});

/**
 * Bekleyen talep, öğrenci listesindeki HER İKİ düğmeyi de kapatır: "Mentör
 * yap" açık kalsaydı, kaldırılması istenen bir mentörlük ikinci bir tıklamayla
 * yeniden onaylanır ve talep artık geçerli olmayan bir gerekçeyle kuyrukta
 * beklemeye devam ederdi.
 */
describe("bekleyen talep, listedeki kararları durdurur", () => {
  it("mentör yapma da kaldırma da engellenir", () => {
    expect(
      ogrenciMentorlukKarariGecerliMi({
        mevcutDurum: "REDDEDILDI",
        yeniDurum: "ONAYLANDI",
        gerekce: "",
        bekleyenKaldirmaTalebiVarMi: true,
      }).olurMu,
    ).toBe(false);
    expect(
      ogrenciMentorlukKarariGecerliMi({
        mevcutDurum: "ONAYLANDI",
        yeniDurum: "REDDEDILDI",
        gerekce: "Sınav dönemi nedeniyle ara veriyoruz.",
        bekleyenKaldirmaTalebiVarMi: true,
      }).olurMu,
    ).toBe(false);
  });

  it("talep yokken eski davranış sürüyor", () => {
    expect(
      ogrenciMentorlukKarariGecerliMi({
        mevcutDurum: "REDDEDILDI",
        yeniDurum: "ONAYLANDI",
        gerekce: "",
      }).olurMu,
    ).toBe(true);
  });
});

describe("onay merciinin ekrandaki adı", () => {
  it("düzeye göre değişir", () => {
    expect(kaldirmaTalebiOnayMercii("DANISMAN")).toBe(
      "il koordinatörü ya da proje yöneticisi",
    );
    expect(kaldirmaTalebiOnayMercii("IL_KOORDINATOR")).toBe("proje yöneticisi");
  });
});
