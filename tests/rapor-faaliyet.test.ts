import { RAPOR_ALAN_ADLARI } from "@/lib/faaliyet/rapor-kurallar";
import {
  faaliyetRaporuHtml,
  htmlKacir,
  type RaporVerisi,
} from "@/lib/rapor/faaliyet-raporu";

/**
 * Faaliyet raporunun Word (HTML) çıktısı.
 *
 * En kritik davranış KAÇIŞ: rapor kullanıcı metni taşıyor (faaliyet
 * açıklaması, katılımcı adları). Kaçırılmazsa açıklamaya yazılan HTML,
 * üretilen belgenin yapısını bozar.
 */

const VERI: RaporVerisi = {
  faaliyetAdi: "Robotik Atölyesi",
  aciklama: "İki günlük atölye.\nİkinci satır.",
  kapsam: "İl",
  kategori: "İl Etkinliği",
  yer: "Ankara",
  tarih: "1 Mart 2026 10:00",
  sure: "2 gün",
  katilimBicimi: "Yüz yüze",
  hedefKitle: "11. sınıflar",
  duzenleyen: "Ayşe Yılmaz",
  duzenleyenBirim: "Ankara İl Koordinatörlüğü",
  kontenjan: 20,
  toplamBasvuru: 25,
  secilenSayisi: 20,
  gelenSayisi: 18,
  gelmeyenSayisi: 2,
  isaretlenmeyenSayisi: 0,
  tekilKatilimci: 18,
  katilimcilar: [
    {
      adSoyad: "Elif Demir",
      sinifVeyaBrans: "11-A",
      okul: "Kadıköy AL",
      il: "İstanbul",
      katildiMi: true,
    },
  ],
  gorselAdlari: ["acilis.jpg"],
  degerlendirme: "Atölye planlandığı gibi yürüdü.\nKatılım yüksekti.",
  kazanimlar: "Takım çalışması gelişti.",
  raporYazan: "Ayşe Yılmaz",
  raporTarihi: "20 Temmuz 2026 09:00",
  olusturan: "Burcu Yılmaz",
  olusturmaTarihi: "31 Temmuz 2026 14:00",
};

describe("htmlKacir", () => {
  it("HTML özel karakterlerini kaçırır", () => {
    expect(htmlKacir('<script>"x"&y')).toBe(
      "&lt;script&gt;&quot;x&quot;&amp;y",
    );
  });

  it("düz metne dokunmaz", () => {
    expect(htmlKacir("Robotik Atölyesi")).toBe("Robotik Atölyesi");
  });
});

describe("faaliyetRaporuHtml", () => {
  it("faaliyet bilgilerini yazar", () => {
    const html = faaliyetRaporuHtml(VERI);
    expect(html).toContain("Robotik Atölyesi");
    expect(html).toContain("Ankara İl Koordinatörlüğü");
    expect(html).toContain("2 gün");
  });

  it("katılım sayılarını AYRI yazar", () => {
    // Seçilen, gelen ve tekil farklı sorulardır; raporda hepsi görünmeli.
    const html = faaliyetRaporuHtml(VERI);
    expect(html).toContain("Seçilen");
    expect(html).toContain("Yoklamada gelen");
    expect(html).toContain("Farklı kişi sayısı");
  });

  /*
   * YOKLAMA (26 Ağustos 2026 · istek: "yoklamayı alıyorum sonra rapor
   * oluşturunca katılmayan öğrenciler de katıldı gibi görünüyor"). Çıktı
   * seçilmiş başvuruları "Katılan" sayıyordu; seçilmek "katılabilir" demek.
   */
  it("seçileni katılan diye YAZMAZ", () => {
    const html = faaliyetRaporuHtml(VERI);
    expect(html).not.toContain("Katılan (seçilmiş)");
  });

  it("gelmeyen sayısını ayrıca yazar", () => {
    const html = faaliyetRaporuHtml(VERI);
    expect(html).toContain("Gelmeyen");
  });

  it("yoklaması alınmayan yoksa o satırı hiç basmaz", () => {
    expect(faaliyetRaporuHtml(VERI)).not.toContain("Yoklaması alınmayan");
  });

  it("yoklaması alınmayan varsa satırı basar", () => {
    const html = faaliyetRaporuHtml({ ...VERI, isaretlenmeyenSayisi: 3 });
    expect(html).toContain("Yoklaması alınmayan");
  });

  it("listedeki kişinin katılım durumunu yazar", () => {
    const html = faaliyetRaporuHtml(VERI);
    expect(html).toContain("<td>Geldi</td>");
  });

  it("yoklaması alınmamış kişiyi katılmış gibi göstermez", () => {
    const html = faaliyetRaporuHtml({
      ...VERI,
      katilimcilar: [{ ...VERI.katilimcilar[0], katildiMi: null }],
    });
    expect(html).toContain("<td>Yoklama alınmadı</td>");
    expect(html).not.toContain("<td>Geldi</td>");
  });

  it("katılımcıları numaralı listeler", () => {
    const html = faaliyetRaporuHtml(VERI);
    expect(html).toContain("Elif Demir");
    expect(html).toContain("11-A");
  });

  it("katılımcı yoksa boş tablo yerine açıklama yazar", () => {
    const html = faaliyetRaporuHtml({ ...VERI, katilimcilar: [] });
    expect(html).toContain("Yoklamada gelen katılımcı yok.");
  });

  it("görsel yoksa bunu söyler", () => {
    const html = faaliyetRaporuHtml({ ...VERI, gorselAdlari: [] });
    expect(html).toContain("Etkinliğe görsel eklenmemiş.");
  });

  it("açıklamadaki satır sonlarını korur", () => {
    expect(faaliyetRaporuHtml(VERI)).toContain("İki günlük atölye.<br>İkinci satır.");
  });

  it("Türkçe karakterler için charset bildirir", () => {
    // Word, charset olmadan dosyayı Latin-1 sanıp Türkçe karakterleri bozuyor.
    expect(faaliyetRaporuHtml(VERI)).toContain('<meta charset="utf-8">');
  });

  // --- Güvenlik ---------------------------------------------------------

  it("açıklamadaki HTML'i KAÇIRIR", () => {
    const html = faaliyetRaporuHtml({
      ...VERI,
      aciklama: "<script>alert(1)</script>",
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("katılımcı adındaki HTML'i kaçırır", () => {
    const html = faaliyetRaporuHtml({
      ...VERI,
      katilimcilar: [
        {
          adSoyad: "<b>Kalın</b>",
          sinifVeyaBrans: null,
          okul: null,
          il: null,
          katildiMi: true,
        },
      ],
    });
    expect(html).not.toContain("<b>Kalın</b>");
    expect(html).toContain("&lt;b&gt;");
  });

  it("faaliyet adındaki tırnak başlık etiketini bozmaz", () => {
    const html = faaliyetRaporuHtml({ ...VERI, faaliyetAdi: 'A "B" C' });
    expect(html).toContain("A &quot;B&quot; C");
  });
});

describe("raporun yazılı kısmı çıktıya girer", () => {
  /*
   * Bu bölüm ilk sürümde ÇIKTIYA HİÇ GİRMİYORDU: dışa aktarma, rapor modeli
   * eklenmeden önce yazılmıştı ve model geldiğinde geri dönülmemişti. İndirilen
   * belgede değerlendirme boş çıkıyordu.
   */
  it("değerlendirmeyi yazar", () => {
    const html = faaliyetRaporuHtml(VERI);
    expect(html).toContain("Atölye planlandığı gibi yürüdü.");
  });

  it("değerlendirmedeki satır sonlarını korur", () => {
    expect(faaliyetRaporuHtml(VERI)).toContain(
      "Atölye planlandığı gibi yürüdü.<br>Katılım yüksekti.",
    );
  });

  it("kazanımları yazar", () => {
    expect(faaliyetRaporuHtml(VERI)).toContain("Takım çalışması gelişti.");
  });

  it("raporu yazanı ve tarihini yazar", () => {
    const html = faaliyetRaporuHtml(VERI);
    expect(html).toContain("Ayşe Yılmaz");
    expect(html).toContain("20 Temmuz 2026 09:00");
  });

  it("rapor yazılmamışsa bunu AÇIKÇA söyler", () => {
    // Sessizce boş bölüm bırakmak, raporun yazıldığı ama içeriğin kaybolduğu
    // izlenimi verirdi.
    const html = faaliyetRaporuHtml({
      ...VERI,
      degerlendirme: null,
      kazanimlar: null,
      raporYazan: null,
      raporTarihi: null,
    });
    expect(html).toContain("raporu henüz yazılmadı");
  });

  /*
   * Başlıklar EKRANDAKİ adlarla aynı kaynaktan gelir (RAPOR_ALAN_ADLARI):
   * indirilen belgenin, doldurulan formdan başka bir şey demesi raporu
   * okuyanı yanıltırdı.
   */
  it("bölüm başlıkları ekrandaki alan adlarıyla aynıdır", () => {
    const html = faaliyetRaporuHtml(VERI);
    expect(html).toContain(`<h2>${RAPOR_ALAN_ADLARI.degerlendirme}</h2>`);
    expect(html).toContain(`<h2>${RAPOR_ALAN_ADLARI.kazanimlar}</h2>`);
  });

  it("sosyal medya metni boşsa başlığı hiç basmaz", () => {
    const html = faaliyetRaporuHtml({ ...VERI, kazanimlar: null });
    expect(html).not.toContain(`<h2>${RAPOR_ALAN_ADLARI.kazanimlar}</h2>`);
  });

  it("değerlendirmedeki HTML'i kaçırır", () => {
    const html = faaliyetRaporuHtml({
      ...VERI,
      degerlendirme: "<script>alert(1)</script>",
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("katılım biçimi ve hedef kitle çıktıda", () => {
  it("girilmişse yazılır", () => {
    const html = faaliyetRaporuHtml(VERI);
    expect(html).toContain("Katılım biçimi");
    expect(html).toContain("Yüz yüze");
    expect(html).toContain("11. sınıflar");
  });

  it("girilmemişse satır hiç basılmaz", () => {
    // Boş satır basmak, bilginin girildiği ama kaybolduğu izlenimi verirdi.
    const html = faaliyetRaporuHtml({
      ...VERI,
      katilimBicimi: null,
      hedefKitle: null,
    });
    expect(html).not.toContain("Katılım biçimi");
    expect(html).not.toContain("Hedef kitle");
  });
});
