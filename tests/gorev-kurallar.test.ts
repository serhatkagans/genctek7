import {
  GOREV_MESAJI_AZAMI,
  gorevBasvurusuKabulEdilirMi,
  gorevKarariGecerliMi,
  gorevTanimiGecerliMi,
} from "@/lib/gorev/kurallar";

/**
 * GençTek görevleri (21 Ağustos 2026).
 *
 * İstek: "Panoda yeni kart GençTek Görevlerim isminde kart olsun, içinde
 * başvur butonları olacak … yönetim panelinde yeni kart gençtek görevlerini
 * görebilsin" · "daha başka görevler de olacak şimdilik 3 tane".
 *
 * Sınanan şey ekran değil KARARDIR: hangi başvuru kabul edilir, hangi karar
 * geçerlidir, hangi ilan açılabilir.
 */

function basvuru(ozellikler: Record<string, unknown> = {}) {
  return {
    gorevAktifMi: true,
    kontenjan: null as number | null,
    onayliBasvuruSayisi: 0,
    mesaj: "Arduino ve Fusion 360 kullanıyorum, test ekibinde yer almak istiyorum.",
    bekleyenBasvurusuVarMi: false,
    zatenGorevliMi: false,
    ...ozellikler,
  };
}

describe("görev başvurusunun kabulü", () => {
  it("açık göreve, mesajıyla birlikte başvurulur", () => {
    const karar = gorevBasvurusuKabulEdilirMi(basvuru());
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) expect(karar.mesaj).toContain("Arduino");
  });

  it("mesaj kırpılır; boş mesaj reddedilir", () => {
    const karar = gorevBasvurusuKabulEdilirMi(basvuru({ mesaj: "  Robotik  " }));
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) expect(karar.mesaj).toBe("Robotik");

    // Kararı verecek kişi başvuranın metninden başka bir şeye bakmıyor.
    expect(gorevBasvurusuKabulEdilirMi(basvuru({ mesaj: "   " })).olurMu).toBe(
      false,
    );
  });

  it("üst sınırı aşan mesaj reddedilir", () => {
    const karar = gorevBasvurusuKabulEdilirMi(
      basvuru({ mesaj: "x".repeat(GOREV_MESAJI_AZAMI + 1) }),
    );
    expect(karar.olurMu).toBe(false);
  });

  it("kapalı göreve başvurulamaz", () => {
    // Kapatılan ilan panoda görünmüyor; kimliğini elle yazan için de kapalı.
    expect(
      gorevBasvurusuKabulEdilirMi(basvuru({ gorevAktifMi: false })).olurMu,
    ).toBe(false);
  });

  it("kontenjan dolmuşsa başvuru alınmaz", () => {
    expect(
      gorevBasvurusuKabulEdilirMi(
        basvuru({ kontenjan: 3, onayliBasvuruSayisi: 3 }),
      ).olurMu,
    ).toBe(false);
    // Sınır ONAYLANMIŞ başvurudur; bekleyenler kontenjanı işgal etmez.
    expect(
      gorevBasvurusuKabulEdilirMi(
        basvuru({ kontenjan: 3, onayliBasvuruSayisi: 2 }),
      ).olurMu,
    ).toBe(true);
  });

  it("kontenjan yoksa sayı ne olursa olsun başvurulur", () => {
    expect(
      gorevBasvurusuKabulEdilirMi(
        basvuru({ kontenjan: null, onayliBasvuruSayisi: 120 }),
      ).olurMu,
    ).toBe(true);
  });

  it("aynı göreve ikinci kez başvurulmaz; görevdeyken de", () => {
    expect(
      gorevBasvurusuKabulEdilirMi(basvuru({ bekleyenBasvurusuVarMi: true }))
        .olurMu,
    ).toBe(false);
    expect(
      gorevBasvurusuKabulEdilirMi(basvuru({ zatenGorevliMi: true })).olurMu,
    ).toBe(false);
  });
});

describe("görev başvurusunun kararı", () => {
  const girdi = (ozellikler: Record<string, unknown> = {}) => ({
    mevcutDurum: "BEKLIYOR" as const,
    onaylandiMi: true,
    gerekce: "",
    kendiBasvurusuMu: false,
    ...ozellikler,
  });

  it("bekleyen başvuru onaylanır", () => {
    const karar = gorevKarariGecerliMi(girdi());
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) expect(karar.durum).toBe("ONAYLANDI");
  });

  it("ret gerekçesiz olmaz", () => {
    expect(gorevKarariGecerliMi(girdi({ onaylandiMi: false })).olurMu).toBe(
      false,
    );

    const karar = gorevKarariGecerliMi(
      girdi({ onaylandiMi: false, gerekce: "  Ekip doldu  " }),
    );
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) {
      expect(karar.durum).toBe("REDDEDILDI");
      expect(karar.gerekce).toBe("Ekip doldu");
    }
  });

  it("karara bağlanmış başvuru ikinci kez karara bağlanmaz", () => {
    // Yoksa karar tarihi sessizce kayar ve "ne zaman karar verildi" bozulur.
    expect(
      gorevKarariGecerliMi(girdi({ mevcutDurum: "ONAYLANDI" })).olurMu,
    ).toBe(false);
  });

  it("kimse kendi başvurusunu karara bağlayamaz", () => {
    /*
     * Proje yöneticisi de göreve başvurabiliyor. Yetki listesi "kim karar
     * verebilir" sorusunu cevaplıyor, bu koşul "hangi kayda" sorusunu.
     */
    expect(gorevKarariGecerliMi(girdi({ kendiBasvurusuMu: true })).olurMu).toBe(
      false,
    );
  });
});

describe("görev ilanının tanımı", () => {
  it("ad ve açıklama zorunlu", () => {
    expect(
      gorevTanimiGecerliMi({ ad: "  ", aciklama: "x", kontenjan: "" }).olurMu,
    ).toBe(false);
    expect(
      gorevTanimiGecerliMi({ ad: "Oyun Ekibi", aciklama: " ", kontenjan: "" })
        .olurMu,
    ).toBe(false);
  });

  it("kontenjan boş bırakılabilir — sınırsız görev", () => {
    const karar = gorevTanimiGecerliMi({
      ad: "Oyun Senaryo Ekibi",
      aciklama: "Senaryo kurgular.",
      kontenjan: "  ",
    });
    expect(karar.olurMu).toBe(true);
    if (karar.olurMu) expect(karar.kontenjan).toBeNull();
  });

  it("sıfır ya da sayı olmayan kontenjan reddedilir", () => {
    // Sıfır "kimse alınmayacak" demek olurdu; sınırsız için alan boş bırakılır.
    expect(
      gorevTanimiGecerliMi({ ad: "A", aciklama: "B", kontenjan: "0" }).olurMu,
    ).toBe(false);
    expect(
      gorevTanimiGecerliMi({ ad: "A", aciklama: "B", kontenjan: "üç" }).olurMu,
    ).toBe(false);
  });
});
