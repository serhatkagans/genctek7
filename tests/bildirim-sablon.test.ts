import {
  BILDIRIM_KODLARI,
  BILDIRIM_SABLON_TANIMLARI,
  sablonMetniGecerliMi,
  sablonTanimiGetir,
  sablonuDoldur,
  yerTutuculariCikar,
} from "@/lib/bildirim/sablon";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("bildirim şablonu", () => {
  it("yer tutucuları verilen değerlerle doldurur", () => {
    const sonuc = sablonuDoldur(
      "{{ogrenciAdSoyad}}, {{faaliyetAdi}} sonucu: {{sonuc}}",
      {
        ogrenciAdSoyad: "Elif Yılmaz",
        faaliyetAdi: "Siber Güvenlik Kampı",
        sonuc: "SECILDI",
      },
    );
    expect(sonuc).toBe("Elif Yılmaz, Siber Güvenlik Kampı sonucu: SECILDI");
  });

  it("değeri verilmeyen yer tutucuyu olduğu gibi bırakır", () => {
    expect(sablonuDoldur("Merhaba {{ad}}", {})).toBe("Merhaba {{ad}}");
  });

  it("domain-rules Bölüm 9'daki bildirim olaylarının tamamı tanımlıdır", () => {
    expect(Object.keys(BILDIRIM_KODLARI)).toEqual(
      expect.arrayContaining([
        "BASVURU_SONUCU",
        "DANISMAN_DEGISTI",
        "DANISMAN_YENIDEN_SECIM",
        "KOORDINATOR_DEVREDILEBILIR_OGRENCI",
        "ONAY_BEKLEYEN_ULUSAL_FAALIYET",
        "DANISMANA_KOPYA_ULUSAL_BASVURU",
      ]),
    );
  });
});

/**
 * Şablon yönetim ekranının dayandığı tanımlar ve doğrulama — analiz dokümanı
 * Bölüm 6.1 ("Bildirim şablonları yönetilebilir olmalı").
 */
describe("şablon tanımları", () => {
  it("her bildirim kodunun bir tanımı vardır", () => {
    for (const kod of Object.values(BILDIRIM_KODLARI)) {
      const tanim = sablonTanimiGetir(kod);
      expect(tanim).toBeDefined();
      expect(tanim?.baslik).toBeTruthy();
      expect(tanim?.aciklama).toBeTruthy();
    }
  });

  it("tanım listesinde koda karşılık gelmeyen satır yoktur", () => {
    const kodlar = Object.values(BILDIRIM_KODLARI) as string[];
    for (const tanim of BILDIRIM_SABLON_TANIMLARI) {
      expect(kodlar).toContain(tanim.kod);
    }
  });

  it("tanımsız kod aranırsa undefined döner", () => {
    expect(sablonTanimiGetir("YOK_BOYLE_BIR_KOD")).toBeUndefined();
  });
});

/**
 * Mentörlük bildirimleri (13 Ağustos 2026 · inceleme bulgusu: başvuru da karar
 * da sessizdi). Metinler hem seed'de hem migration SQL'inde yazılı; yer tutucu
 * hatası ancak bildirim gönderildiğinde, kullanıcının gözüne ham süslü parantez
 * olarak görünürdü. Bu yüzden ikisi de buraya kopyalanıp sabitlendi.
 */
describe("mentörlük bildirimleri", () => {
  it("başvuru bildirimi kimin ne için başvurduğunu taşır", () => {
    const tanim = sablonTanimiGetir(BILDIRIM_KODLARI.ONAY_BEKLEYEN_MENTORLUK);
    expect(tanim?.degiskenler).toEqual(
      expect.arrayContaining(["basvuranAdSoyad", "kapsam"]),
    );

    const degiskenler = [...(tanim?.degiskenler ?? [])];
    const govde =
      "Merhaba,\n\n{{basvuranAdSoyad}} mentörlük başvurusu yaptı ve onayınızı bekliyor.\n\nBaşvurduğu alanlar: {{kapsam}}\n\nBaşvuruyu Yönetim Paneli'ndeki Mentörlük kartından inceleyip onaylayabilir ya da gerekçesiyle reddedebilirsiniz.\n\nGençTek";
    expect(sablonMetniGecerliMi(govde, degiskenler).olurMu).toBe(true);
    expect(
      sablonMetniGecerliMi(
        "Onay bekleyen mentörlük başvurusu: {{basvuranAdSoyad}}",
        degiskenler,
      ).olurMu,
    ).toBe(true);
  });

  /*
   * Ret gerekçesi metne giriyor: gerekçesiz ret, kişiye yeniden başvurup
   * başvurmayacağına karar verecek hiçbir bilgi bırakmaz.
   */
  it("karar bildirimi sonucu ve gerekçeyi taşır", () => {
    const tanim = sablonTanimiGetir(BILDIRIM_KODLARI.MENTORLUK_KARARI);
    expect(tanim?.degiskenler).toEqual(
      expect.arrayContaining(["sonuc", "gerekce"]),
    );

    const degiskenler = [...(tanim?.degiskenler ?? [])];
    const govde =
      'Merhaba,\n\nMentörlük başvurunuz {{sonuc}}.\n\nGerekçe: {{gerekce}}\n\nOnaylandıysa menünüzde "Mentörlüğüm" sekmesi açıldı; panodaki ilanlara oradan cevap yazabilirsiniz.\n\nGençTek';
    expect(sablonMetniGecerliMi(govde, degiskenler).olurMu).toBe(true);
    expect(
      sablonMetniGecerliMi("Mentörlük başvurunuz {{sonuc}}", degiskenler).olurMu,
    ).toBe(true);
  });
});

describe("şablon metni doğrulama", () => {
  it("boş metin kabul edilmez", () => {
    expect(sablonMetniGecerliMi("   ", ["ad"]).olurMu).toBe(false);
  });

  /*
   * Tanımsız yer tutucu hatadır: metne yazılan {{ogrenci}} hiçbir zaman
   * dolmayacağı için bildirim kullanıcıya ham süslü parantezle ulaşırdı.
   */
  it("tanımsız değişken reddedilir ve kullanılabilirler söylenir", () => {
    const karar = sablonMetniGecerliMi("Merhaba {{ogrenci}}", [
      "ogrenciAdSoyad",
    ]);
    expect(karar.olurMu).toBe(false);
    expect(karar.neden).toContain("{{ogrenci}}");
    expect(karar.neden).toContain("{{ogrenciAdSoyad}}");
  });

  it("tanımlı değişkenin kullanılmaması hata değildir", () => {
    // Metni kısaltmak metni yazanın hakkı.
    expect(sablonMetniGecerliMi("Sabit metin", ["ad", "soyad"]).olurMu).toBe(
      true,
    );
  });

  it("değişkeni olmayan şablonda yer tutucu yazılamaz", () => {
    expect(sablonMetniGecerliMi("Merhaba {{ad}}", []).olurMu).toBe(false);
  });

  it("aynı yer tutucu birden çok kez kullanılabilir", () => {
    expect(
      sablonMetniGecerliMi("{{ad}} için {{ad}} tekrar", ["ad"]).olurMu,
    ).toBe(true);
  });

  it("yer tutucular tekrarsız çıkarılır", () => {
    expect(yerTutuculariCikar("{{a}} {{b}} {{a}}")).toEqual(["a", "b"]);
  });
});

/**
 * Yer açıldı bildirimi — düzenleyenin yedekten çağırma kararı bu metne dayanır,
 * o yüzden hem değişkenleri hem gönderim koşulu burada sabitlenir.
 */
describe("kontenjanda yer açıldı bildirimi", () => {
  const tanim = sablonTanimiGetir(BILDIRIM_KODLARI.KONTENJANDA_YER_ACILDI);

  it("düzenleyenin karar verebilmesi için gereken değişkenleri taşır", () => {
    expect(tanim?.degiskenler).toEqual(
      expect.arrayContaining([
        "faaliyetAdi",
        "katilimciAdSoyad",
        "yedekSayisi",
        "kalanYer",
      ]),
    );
  });

  /*
   * Seed'deki gövde metni bu doğrulamadan geçmezse bildirim kullanıcıya ham
   * süslü parantezle ulaşır; metin buraya kopyalanarak sabitlendi.
   */
  it("varsayılan metin yalnızca tanımlı yer tutucuları kullanır", () => {
    const govde =
      "Merhaba,\n\n{{katilimciAdSoyad}}, {{faaliyetAdi}} etkinliğine seçilmiş başvurusunu geri çekti. Kontenjanda {{kalanYer}} yer boş; yedek listesinde {{yedekSayisi}} başvuru bekliyor.\n\nYedekten katılımcı çağırmak için etkinliğin başvuru listesini açabilirsiniz.\n\nGençTek";
    const degiskenler = [...(tanim?.degiskenler ?? [])];
    expect(sablonMetniGecerliMi(govde, degiskenler).olurMu).toBe(true);
    expect(
      sablonMetniGecerliMi(
        "{{faaliyetAdi}} etkinliğinde yer açıldı",
        degiskenler,
      ).olurMu,
    ).toBe(true);
  });
});

/*
 * SEED İLE KATALOG AYRIŞMASI (26 Ağustos 2026 · istek: "bunlardan birine
 * öğrenci başvurduğunda yönetici sayfasına düşmüyor").
 *
 * ONAY_BEKLEYEN_GENCTEK_GOREVI ve GENCTEK_GOREV_KARARI kodda tanımlıydı ama
 * seed'e yazılmamıştı. Şablonu olmayan bildirim SESSİZCE yutuluyor
 * (lib/bildirim/gonder.ts uyarı yazıp çıkıyor), dolayısıyla ne proje
 * yöneticisi başvurudan ne de öğrenci karardan haberdar oluyordu.
 *
 * Seed dosyası METİN OLARAK okunuyor: seed.ts içe aktarıldığında main()
 * çalışıp veritabanına bağlanmaya kalkar. Test edilen şey bir davranış değil,
 * iki listenin aynı kümeyi taşıdığı.
 */
describe("seed, kataloğun tamamını taşır", () => {
  const seedMetni = readFileSync(
    join(process.cwd(), "prisma", "seed.ts"),
    "utf8",
  );
  const seeddekiKodlar = new Set(
    [...seedMetni.matchAll(/kod: "([A-Z_]+)"/g)].map((eslesme) => eslesme[1]),
  );

  it("her bildirim kodunun seed'de bir şablonu vardır", () => {
    const eksikler = Object.values(BILDIRIM_KODLARI).filter(
      (kod) => !seeddekiKodlar.has(kod),
    );
    expect(eksikler).toEqual([]);
  });

  it("seed'de katalogda olmayan şablon yoktur", () => {
    const kodlar = new Set<string>(Object.values(BILDIRIM_KODLARI));
    const fazlalar = [...seeddekiKodlar].filter((kod) => !kodlar.has(kod));
    expect(fazlalar).toEqual([]);
  });
});
