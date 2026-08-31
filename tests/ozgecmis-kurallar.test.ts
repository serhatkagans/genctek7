import {
  type OzgecmisVerisi,
  ozgecmisDosyaAdi,
  ozgecmisWordHtml,
} from "@/lib/ozgecmis/kurallar";

/**
 * PROFİLDEN ÜRETİLEN ÖZGEÇMİŞ (28 Ağustos 2026 · istek: "profildeki her şeyi
 * cv formatında Word olarak indirebilsin, güzel bir cv formatı olsun").
 *
 * Sınanan şey belgenin GÖRÜNÜŞÜ değil, içeriğe dair kararlar: profildeki her
 * başlık belgede de duruyor mu, boş alan nasıl basılıyor, kullanıcı metni
 * kaçırılıyor mu, Türkçe karakter için charset yazılıyor mu.
 */

const BOLUM_BASLIKLARI = [
  "Kimlik bilgileri",
  "Hakkımda",
  "İletişim bilgilerim",
  "Çalışma gruplarım",
  "Mentörlük",
  "GençTek etkinlik katılımları",
  "GençTek yolculuğum",
  "Eklemek istedikleriniz",
  "Referanslarım",
];

function veri(ozellikler: Partial<OzgecmisVerisi> = {}): OzgecmisVerisi {
  return {
    adSoyad: "Ayşe Yılmaz",
    unvan: "Öğrenci · 11-A",
    foto: null,
    basHarfler: "AY",
    logo: null,
    kimlik: [
      { etiket: "Okul / kurum", deger: "Beşiktaş Anadolu Lisesi" },
      { etiket: "İlçe", deger: "" },
    ],
    iletisim: [
      { etiket: "E-posta", deger: "" },
      { etiket: "GitHub", deger: "https://github.com/ayse" },
    ],
    hakkinda: null,
    calismaGruplari: [],
    mentorluk: null,
    bolumler: [],
    katilimlar: [],
    yolculuk: {
      seviyeAdi: '"Hello World"',
      basamaklar: [
        {
          ad: '"Hello World"',
          aciklama: "Ekosisteme adım attın; yolculuk buradan başlıyor.",
        },
      ],
    },
    referanslar: [],
    ekNotu: null,
    uretimTarihi: "28.08.2026",
    ...ozellikler,
  };
}

describe("özgeçmiş belgesi", () => {
  it("Word'ün Türkçe karakteri bozmaması için charset yazar", () => {
    /*
     * Word, charset olmadan dosyayı Latin-1 sanıp Türkçe karakterleri bozuyor
     * (aynı not faaliyet raporunda da yazılı).
     */
    expect(ozgecmisWordHtml(veri())).toContain('<meta charset="utf-8">');
  });

  /*
   * 28 Ağustos 2026 · istek: "profildeki tüm alanlar boş girilse de cv de
   * olsun". İlk sürüm boş bölümü hiç basmıyordu; belge profilin karşılığı
   * olacaksa profilde duran her başlık belgede de durmalı, yoksa okuyan
   * bölümün "boş mu, yok mu" olduğunu ayırt edemez.
   */
  it("profildeki bütün bölümleri, hepsi boş olsa da basar", () => {
    const html = ozgecmisWordHtml(veri());
    for (const baslik of BOLUM_BASLIKLARI) {
      expect(html).toContain(baslik);
    }
    expect(html).toContain("Bilgi girilmemiş.");
  });

  it("değeri olmayan künye satırını atlamaz, çizgi basar", () => {
    const html = ozgecmisWordHtml(veri());
    expect(html).toContain("İlçe");
    expect(html).toContain("E-posta");
    expect(html).toContain("—");
  });

  it("boş kayıt bölümünü de başlığıyla basar", () => {
    const html = ozgecmisWordHtml(
      veri({ bolumler: [{ baslik: "Ürünlerim", kayitlar: [] }] }),
    );
    expect(html).toContain("Ürünlerim");
  });

  it("kimlik ve unvanı basar", () => {
    const html = ozgecmisWordHtml(veri());
    expect(html).toContain("Ayşe Yılmaz");
    expect(html).toContain("Öğrenci · 11-A");
    expect(html).toContain("Beşiktaş Anadolu Lisesi");
  });

  /*
   * 28 Ağustos 2026 · istek: "sol üste de profil resmi alanı olsun, profil
   * resmi eklediyse onu da cv ye eklesin". Alan her zaman var, içi değişiyor:
   * fotoğrafsız CV'de aynı ölçüdeki kutuya baş harfler giriyor — kutu tümüyle
   * kalksaydı iki CV birbirinden başka bir belge gibi görünürdü.
   */
  it("fotoğrafı belgeye gömer", () => {
    const html = ozgecmisWordHtml(
      veri({ foto: { veriUrl: "data:image/png;base64,AAAA" } }),
    );
    expect(html).toContain('<img src="data:image/png;base64,AAAA"');
    expect(html).not.toContain(">AY<");
  });

  it("fotoğraf yoksa kutuya baş harfleri basar", () => {
    const html = ozgecmisWordHtml(veri());
    expect(html).not.toContain("<img");
    expect(html).toContain("AY");
  });

  it("kayıtları başlık, künye, açıklama ve bağlantılarıyla basar", () => {
    const html = ozgecmisWordHtml(
      veri({
        bolumler: [
          {
            baslik: "Ürünlerim",
            kayitlar: [
              {
                baslik: "deneme",
                tarih: "28.08.2026",
                /* Belge sayısı da künyede — paneldeki kayıt özetiyle aynı. */
                kunye: "TÜBİTAK · Türkiye 1.si · 1 belge",
                aciklama: "İlk satır\nİkinci satır",
                baglantilar: ["kaynak kod: https://github.com/ayse/materyal"],
              },
            ],
          },
        ],
      }),
    );
    expect(html).toContain("deneme");
    expect(html).toContain("28.08.2026");
    expect(html).toContain("TÜBİTAK · Türkiye 1.si · 1 belge");
    /* Çok satırlı açıklama satır sonlarını korur. */
    expect(html).toContain("İlk satır<br>İkinci satır");
    /*
     * Bağlantı TAM ADRESİYLE yazılır: kâğıda dökülen bir CV'de tıklanamayan
     * bir sözcük, adresi kaybetmek demekti.
     */
    expect(html).toContain("https://github.com/ayse/materyal");
  });

  it("kullanıcı metnini kaçırır", () => {
    /* Özgeçmiş baştan sona kullanıcı metni taşıyor: hakkında, başlık, açıklama. */
    const html = ozgecmisWordHtml(
      veri({ hakkinda: '<script>alert("x")</script>' }),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("mentörlük, çalışma grupları, katılımlar ve yolculuk girer", () => {
    const html = ozgecmisWordHtml(
      veri({
        mentorluk: "Onaylı GençTek mentörü — Yapay Zekâ",
        calismaGruplari: ["Yapay Zekâ", "Siber Güvenlik"],
        katilimlar: [
          { ad: "Genç Gölge", tarih: "01.03.2026", kapsam: "Ulusal" },
        ],
        yolculuk: {
          seviyeAdi: "Harekette",
          basamaklar: [
            {
              ad: '"Hello World"',
              aciklama: "Ekosisteme adım attın; yolculuk buradan başlıyor.",
            },
            {
              ad: "Keşifte",
              aciklama: "Etkinliklere katılıyor, ekosistemi tanıyorsun.",
            },
            {
              ad: "Harekette",
              aciklama: "Düzenli katılıyor, çalışma alanını seçiyorsun.",
            },
          ],
        },
      }),
    );
    expect(html).toContain("Onaylı GençTek mentörü");
    expect(html).toContain("Siber Güvenlik");
    expect(html).toContain("Genç Gölge");
    /*
     * Bölüm "GençTek yolculuğum" adını taşımalı (nişanların yerini aldı) ve
     * içinde kişinin durduğu basamak yazmalı. YILDIZ YAZMAMALI: 31 Ağustos'ta
     * hem şeritten hem belgeden kalktı — sayı, basamağın sırasını tekrar
     * ediyordu.
     */
    expect(html).toContain("GençTek yolculuğum");
    expect(html).toContain("Harekette");
    expect(html).not.toContain("yıldız");
  });

  it("eklemek istedikleriniz metni belgeye girer", () => {
    /*
     * Metin, profilde başka bir bölüme girmeyen bilgiler için (31 Ağustos 2026
     * · istek: "metin ekleme alanı olsun") ve üretilen belgede kendi başlığını
     * taşıyor — yazan kişi nereye yazdığını ekrandan okuyor.
     */
    const html = ozgecmisWordHtml(
      veri({ ekNotu: "Cisco CCNA eğitimini tamamladım." }),
    );
    expect(html).toContain("Eklemek istedikleriniz");
    expect(html).toContain("Cisco CCNA");
  });

  it("belgenin ne zaman üretildiğini yazar", () => {
    expect(ozgecmisWordHtml(veri())).toContain("28.08.2026");
  });
});

/**
 * ALT KÜNYE (31 Ağustos 2026 · istek: "wordün en altına bu özgeçmiş GençTek
 * Akran Öğrenme Modeli ve Genç Bilişim Ekosistemi kayıtlarından … tarihinde
 * oluşturulmuştur yazısı eklenecek, alttaki yazı değişecek, MEB YEĞİTEK
 * genctek.eba.gov.tr linki, GençTek logosu ekle resim olsun").
 */
describe("alt künye", () => {
  it("belgenin kaynağını programın adıyla yazar", () => {
    const html = ozgecmisWordHtml(veri());
    expect(html).toContain(
      "GençTek Akran Öğrenme Modeli ve Genç Bilişim Ekosistemi kayıtlarından",
    );
    expect(html).toContain("28.08.2026 tarihinde oluşturulmuştur");
  });

  it("eski 'Bilgi Sistemi' cümlesini artık basmaz", () => {
    // Cümle DEĞİŞTİ, ikinci bir künye olarak eklenmedi: iki farklı kaynak
    // beyanı taşıyan bir belge, hangisinin geçerli olduğunu söylemez.
    expect(ozgecmisWordHtml(veri())).not.toContain("Bilgi Sistemi");
  });

  it("MEB · YEĞİTEK künyesini ve adresi basar", () => {
    const html = ozgecmisWordHtml(veri());
    expect(html).toContain("Yenilik ve Eğitim Teknolojileri Genel Müdürlüğü");
    expect(html).toContain("genctek.eba.gov.tr");
  });

  it("logo verildiğinde gömülü görsel olarak basılır", () => {
    const html = ozgecmisWordHtml(
      veri({ logo: { veriUrl: "data:image/png;base64,LOGOVERISI" } }),
    );
    expect(html).toContain('src="data:image/png;base64,LOGOVERISI"');
  });

  it("logo okunamadığında künye yalnızca yazıyla basılır", () => {
    // Logo yüzünden özgeçmiş üretilememesi kabul edilemez bir takas olurdu:
    // dosya okunamadığında künyenin metni yerinde kalıyor.
    const html = ozgecmisWordHtml(veri({ logo: null }));
    expect(html).not.toContain("<img src=\"data:image/png");
    expect(html).toContain("genctek.eba.gov.tr");
  });
});

/**
 * REFERANSLAR (28 Ağustos 2026 · istek: "Öğrenciler için profile referanslar
 * bölümü ekleyelim. Referans için ad soyad telefon kurum eposta").
 *
 * Bölüm yalnızca öğrencide var; öğretmende `null` geliyor ve başlık hiç
 * basılmıyor — olmayan bir bölümü "boş" diye basmak, doldurulması gereken bir
 * alan sanılırdı.
 */
describe("referanslar bölümü", () => {
  it("referansı ad ve künyesiyle basar", () => {
    const html = ozgecmisWordHtml(
      veri({
        referanslar: [
          {
            adSoyad: "Ayşe Yılmaz",
            kunye: "Beşiktaş Anadolu Lisesi · 0 532 111 22 33",
          },
        ],
      }),
    );
    expect(html).toContain("Referanslarım");
    expect(html).toContain("Beşiktaş Anadolu Lisesi · 0 532 111 22 33");
  });

  it("öğrenci hiç referans yazmamışsa başlık durur", () => {
    expect(ozgecmisWordHtml(veri({ referanslar: [] }))).toContain(
      "Referanslarım",
    );
  });

  it("bölümü olmayan kullanıcıda başlık hiç basılmaz", () => {
    expect(ozgecmisWordHtml(veri({ referanslar: null }))).not.toContain(
      "Referanslarım",
    );
  });
});

describe("dosya adı", () => {
  it("Türkçe harfleri ve boşlukları ayıklar", () => {
    /*
     * Dosya adı e-postaya eklenip paylaşılıyor ve bazı istemciler Türkçe
     * karakterli adları bozuyor.
     */
    expect(ozgecmisDosyaAdi("Ayşe Nur Yılmaz")).toBe("ozgecmis-ayse-nur-yilmaz");
    expect(ozgecmisDosyaAdi("Çağrı Öz")).toBe("ozgecmis-cagri-oz");
  });

  it("hiçbir harf kalmazsa da geçerli bir ad üretir", () => {
    expect(ozgecmisDosyaAdi("...")).toBe("ozgecmis-genctek");
  });
});

describe("künyedeki logo", () => {
  /*
   * 31 Ağustos 2026 · istek: "logo sola sıkışık ve aşağı doğru çok uzun
   * çıkıyor, logoyu küçültelim oraya sığsın".
   *
   * Word, HTML belgelerinde eksik ölçüyü ORANLA TAMAMLAMIYOR: yalnızca `width`
   * verilince görselin kendi pikselini (2469) boy sayıyor ve künyenin solunda
   * sayfa boyu uzayan bir şerit çıkıyordu. Bu testin koruduğu şey ölçünün
   * değeri değil, İKİSİNİN BİRDEN yazılması.
   */
  const logoEtiketi = (html: string): string =>
    html.match(/<img[^>]+alt="GençTek"[^>]*>/)?.[0] ?? "";

  it("logoya hem en hem boy yazar", () => {
    const etiket = logoEtiketi(
      ozgecmisWordHtml(veri({ logo: { veriUrl: "data:image/png;base64,AAAA" } })),
    );
    expect(etiket).toContain('width="36"');
    expect(etiket).toContain('height="44"');
    expect(etiket).toContain("height:44px");
  });

  it("logoyu satır tabanından kurtarıp künyeyle aynı eksene alır", () => {
    /*
     * Resim satır içi bir öğe ve Word onu taban çizgisine oturtuyor; iniş payı
     * kadar aşağı kayıyordu. `line-height:0` paragrafı ve `middle` hizası o
     * payı kaldırıyor — hücrelerin ikisi de ortalanmış olmalı.
     */
    const html = ozgecmisWordHtml(
      veri({ logo: { veriUrl: "data:image/png;base64,AAAA" } }),
    );
    expect(logoEtiketi(html)).toContain("vertical-align:middle");
    expect(html).toContain('<p style="margin:0;line-height:0;">');
    expect(html).not.toContain("vertical-align:top;padding:0;font-size:9pt");
  });

  it("logo yoksa künye yine eksiksiz basılır", () => {
    const html = ozgecmisWordHtml(veri({ logo: null }));
    expect(html).not.toContain('alt="GençTek"');
    expect(html).toContain("genctek.eba.gov.tr");
  });
});
