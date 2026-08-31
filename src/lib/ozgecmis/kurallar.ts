import { htmlKacir } from "@/lib/rapor/faaliyet-raporu";

/**
 * PROFİLİN CV BİÇİMİNDEKİ WORD ÇIKTISI (28 Ağustos 2026 · istek: "profildeki
 * her şeyi cv formatında Word olarak indirebilsin, güzel bir cv formatı
 * olsun").
 *
 * ---------------------------------------------------------------------------
 * "ÖZGEÇMİŞİM (CV)" BÖLÜMÜYLE KARIŞTIRILMAMALI
 * ---------------------------------------------------------------------------
 * Paneldeki o bölüm kişinin KENDİ YÜKLEDİĞİ pdf dosyasını saklıyor (bkz.
 * lib/ogrenci/cv.ts). Burası bambaşka bir şey: sistemdeki verinin kendisinden
 * ÜRETİLEN bir belge — yüklenen dosyanın yerine geçmiyor, yanına bir seçenek
 * koyuyor.
 *
 * ---------------------------------------------------------------------------
 * BOŞ BÖLÜM DE BASILIR (28 Ağustos 2026 · istek: "profildeki tüm alanlar boş
 * girilse de cv de olsun … zaten doldurmuşsa da karşılığı olsun")
 * ---------------------------------------------------------------------------
 * İlk sürüm boş bölümü hiç basmıyordu; gerekçe "kayıt yok satırı, CV'yi
 * eksikler listesi gibi okutur" idi. İstek bunun tersini söylüyor ve haklı:
 * belge PROFİLİN KARŞILIĞI olacaksa, profilde duran her başlık belgede de
 * durmalı — yoksa iki kişinin CV'si aynı sistemden farklı iskeletlerle çıkar
 * ve okuyan, bölümün "boş mu, yok mu" olduğunu ayırt edemez.
 *
 * Boş bölüm SESSİZ KALMAZ, "Bilgi girilmemiş." yazar: boş bir başlık, belgenin
 * yarım üretildiği izlenimi verirdi. Aynı ölçü künye satırlarında da geçerli —
 * değeri olmayan alan "—" ile basılıyor, satır atlanmıyor.
 *
 * ---------------------------------------------------------------------------
 * NİYE HTML GÖVDELİ `.doc`
 * ---------------------------------------------------------------------------
 * Gerçek `.docx` üretmek bir kütüphane bağımlılığı gerektirir (docx,
 * officegen…). Word, HTML gövdeli bir `.doc` dosyasını yerel olarak açıyor ve
 * biçimlendirmeyi koruyor. Projede bu yol zaten kurulu (lib/rapor/
 * faaliyet-raporu.ts · `wordYaniti`), ikinci bir belge için bağımlılık
 * eklemeye değmedi.
 *
 * KAÇIRMA DA ORADAN GELİYOR (`htmlKacir`): özgeçmiş baştan sona KULLANICI
 * METNİ taşıyor. İkinci bir kaçırma fonksiyonu yazılsaydı biri güncellenip
 * öbürü geride kalırdı.
 *
 * Saf tutulur: veritabanına bakmaz, tarihleri kendisi biçimlendirmez — veriyi
 * çağıran hazırlar (lib/ozgecmis/veri.ts).
 */

/** Künye satırı: solda etiket, sağda değer. Değeri boşsa "—" basılır. */
export interface OzgecmisKunyeSatiri {
  etiket: string;
  deger: string;
}

/** Bir kayıt — ürün, sertifika, yarışma derecesi, topluluk… */
export interface OzgecmisKaydi {
  baslik: string;
  /** Sağ üstte gri yazılan tarih; girilmemişse null. */
  tarih: string | null;
  /**
   * Başlığın altındaki tek satırlık künye ("TÜBİTAK · Türkiye 1.si"). Kayıt
   * tipine göre hangi alanların girdiğini çağıran seçiyor; tek satırda
   * birleşiyor çünkü her alan için ayrı satır, sayfayı kayıt başına dört
   * satıra çıkarıyordu.
   */
  kunye: string | null;
  aciklama: string | null;
  baglantilar: string[];
}

export interface OzgecmisBolumu {
  baslik: string;
  kayitlar: OzgecmisKaydi[];
}

/**
 * SOL ÜSTTEKİ FOTOĞRAF (28 Ağustos 2026 · istek: "sol üste de profil resmi
 * alanı olsun, profil resmi eklediyse onu da cv ye eklesin").
 *
 * ALAN HER ZAMAN VAR, İÇİ DEĞİŞİYOR: fotoğraf yoksa aynı ölçüdeki kutuya
 * kişinin baş harfleri basılıyor. Kutu tümüyle kaldırılsaydı ad ve unvan
 * sola kayar, fotoğraflı ve fotoğrafsız iki CV birbirinden başka bir belge
 * gibi görünürdü.
 *
 * `veriUrl` bir `data:` adresidir; dosya belgenin İÇİNE gömülüyor. Dış adres
 * verilseydi belge, GençTek'e ulaşamayan bir bilgisayarda (ya da oturumu
 * olmayan bir okuyucuda) fotoğrafsız açılırdı — özgeçmiş elden ele dolaşan
 * bir dosyadır.
 */
export interface OzgecmisFotografi {
  veriUrl: string;
}

/**
 * BELGENİN KÜNYESİ (31 Ağustos 2026 · istek: "wordün en altına bu özgeçmiş
 * GençTek Akran Öğrenme Modeli ve Genç Bilişim Ekosistemi kayıtlarından …
 * tarihinde oluşturulmuştur yazısı eklenecek … MEB YEĞİTEK genctek.eba.gov.tr
 * linki … GençTek logosu ekle resim olsun").
 *
 * ESKİ CÜMLE "GençTek Bilgi Sistemi'ndeki profil kayıtlarından … üretildi"
 * idi: belgenin kaynağını bir YAZILIMA bağlıyordu. Özgeçmişi okuyan kişi için
 * kaynak yazılım değil PROGRAMDIR — kaydın nereden geldiği kadar hangi
 * çalışmanın parçası olduğu da künyenin işi.
 *
 * ADRES YAZIYLA BASILIYOR, `<a>` DEĞİL — kayıt bağlantılarıyla aynı gerekçe:
 * kâğıda dökülen bir CV'de tıklanamayan bir sözcük, adresi kaybetmek olurdu.
 */
const KUNYE_KURUM =
  "T.C. Millî Eğitim Bakanlığı · Yenilik ve Eğitim Teknolojileri Genel Müdürlüğü (YEĞİTEK)";
const KUNYE_ADRES = "genctek.eba.gov.tr";

/**
 * Künyedeki logonun ölçüsü (piksel).
 *
 * KAYNAK GÖRSEL DİKEY: `public/genc.png` 2029×2469, yani boyu eninden uzun.
 * Buradaki iki sayı o oranı koruyor (44 × 2029/2469 ≈ 36); biri elle
 * değiştirilirse logo ezilir. Ölçünün NİYE yazılmak zorunda olduğu
 * `altKunyeHtml` içinde anlatılıyor.
 *
 * BOY, KÜNYE METNİNİN KENDİSİNDEN: sağdaki üç satır 9 puntoluk metin
 * yaklaşık 44 piksel tutuyor. Logo daha uzun olduğunda (ilk denemede 52'ydi)
 * metnin altından taşıyor ve "hizasız" görünüyordu — iki blok aynı yükseklikte
 * olunca ortalama da göze çarpmıyor.
 */
const LOGO_BOY = 44;
const LOGO_EN = 36;

export interface OzgecmisVerisi {
  adSoyad: string;
  /** Ad altındaki unvan satırı: "Öğrenci · 11-A". */
  unvan: string;
  /** Fotoğraf yoksa null — kutu yine basılır, içine baş harfler girer. */
  foto: OzgecmisFotografi | null;
  /** Fotoğrafsız kutuya basılan harfler. */
  basHarfler: string;
  /**
   * Belgenin altındaki GençTek logosu.
   *
   * KİŞİNİN FOTOĞRAFIYLA KARIŞTIRILMAMALI: bu, belgeyi üreten programın
   * işareti ve herkeste aynı. Logo da fotoğraf gibi belgenin İÇİNE gömülü bir
   * `data:` adresidir — dış adres, GençTek'e ulaşamayan bir bilgisayarda kırık
   * görsel olurdu ve özgeçmiş elden ele dolaşan bir dosyadır.
   *
   * NİYE YİNE DE `null` OLABİLİR: `veri.ts` bugün her zaman doluyu veriyor
   * (sabit derlemeye gömülü, bkz. lib/marka/logo.ts) ama bu dosya SAF ve
   * belgenin logo olmadan da eksiksiz çıkması gerekiyor — künyenin kimlik
   * bilgisi zaten yazıyla basılıyor. Alan zorunlu yapılsaydı, logosuz bir
   * çağrı belgeyi hiç ürettirmezdi.
   */
  logo: OzgecmisFotografi | null;
  /** "Kimlik bilgileri" bölümü: okul, il/ilçe, sınıf/branş, dönem… */
  kimlik: OzgecmisKunyeSatiri[];
  /** "İletişim bilgilerim" bölümü: e-posta, telefon, mesleki bağlantılar. */
  iletisim: OzgecmisKunyeSatiri[];
  hakkinda: string | null;
  calismaGruplari: string[];
  /** Onaylı mentörlüğün kapsamı; mentör değilse null. */
  mentorluk: string | null;
  /** Kayıtlar, paneldeki üç grubun aynısıyla bölümlenmiş. */
  bolumler: OzgecmisBolumu[];
  /** Sistemden doğrulanmış GençTek katılımları. */
  katilimlar: { ad: string; tarih: string; kapsam: string }[];
  /**
   * GENÇTEK YOLCULUĞUM — nişanların yerini aldı (31 Ağustos 2026 · istek:
   * "Özgeçmiş oluşturda oluşturulan word dosyasında katkı nişanlarım GençTek
   * yolculuğum olacak şekilde değişsin ve bu maddelere göre olsun").
   *
   * Nişanlar ayrı bir ölçüttü ("Kâşif", "Üretken"…) ve yolculuk basamaklarıyla
   * yan yana durunca belgede aynı emeği iki ayrı dille anlatan iki liste
   * oluyordu. Ekranda ölçü tek: basamak ve yıldız (bkz. YOLCULUK_SEVIYELERI).
   *
   * YALNIZCA ULAŞILAN BASAMAKLAR: kazanılmamış nişanın belgeye girmeme kuralı
   * (bkz. veri.ts) aynen sürüyor — ulaşılmamış basamağı yazmak, özgeçmişe
   * "buraya gelemedim" listesi koymak olurdu.
   */
  yolculuk: {
    /** Kişinin durduğu basamağın adı. */
    seviyeAdi: string;
    /** Ulaşılmış basamaklar, ilkinden bugünküne. */
    basamaklar: { ad: string; aciklama: string }[];
  };
  /**
   * REFERANSLAR (28 Ağustos 2026 · istek: "Öğrenciler için profile referanslar
   * bölümü ekleyelim").
   *
   * BÖLÜM YALNIZCA ÖĞRENCİDE BASILIYOR — `null` geldiğinde başlık da yok.
   * Boş dizi ile null AYRI şeyler: dizi boşsa öğrenci henüz referans
   * yazmamıştır ve başlık "Bilgi girilmemiş." ile durur; `null` ise bölüm o
   * kişide hiç yoktur (öğretmen paneli referans sormuyor) ve olmayan bir
   * bölümü "boş" diye basmak, doldurulması gereken bir alan sanılırdı.
   */
  referanslar: { adSoyad: string; kunye: string }[] | null;
  /**
   * "Eklemek istedikleriniz" metni (31 Ağustos 2026 · istek: "CV yükle bunu
   * eklemek istedikleriniz yap … metin ekleme alanı olsun").
   *
   * Kişinin profildeki CV bölümüne yazdığı serbest metin — panelde başka bir
   * bölüme girmeyen sertifika, kurs, ilgi alanı ve ek açıklamalar. Boşsa bölüm
   * yine basılır ve "Bilgi girilmemiş." der: doldurulabilir her alanın
   * belgede bir yeri olması kararı (bkz. yukarıdaki "boş alan da girer").
   */
  ekNotu: string | null;
  /** Belgenin üretildiği an — belgenin ne kadar taze olduğu okunabilsin. */
  uretimTarihi: string;
}

/**
 * Belgenin RENGİ tek yerde.
 *
 * Panelin tema değişkenlerinden bağımsız sabit değerler: CSS değişkenleri
 * Word'de çalışmıyor ve tema renkleri koyu temada okunamayan bir belge
 * üretirdi — indirilen dosya, indirildiği andaki tema tercihini taşımamalı.
 */
const VURGU = "#1d4ed8";
const CIZGI = "#d4d4d8";
const YUMUSAK = "#52525b";
const ZEMIN = "#f4f4f5";

const BOS = "Bilgi girilmemiş.";

function bolumBasligi(baslik: string): string {
  /*
   * Word, `border-bottom`u başlık etiketlerinde tutarlı basıyor; sol renkli
   * şerit denendiğinde (`border-left`) satır yüksekliği başlıklar arasında
   * kayıyordu.
   */
  return `<h2 style="font-size:12pt;color:${VURGU};border-bottom:1pt solid ${CIZGI};padding-bottom:3pt;margin:18pt 0 8pt 0;">${htmlKacir(baslik)}</h2>`;
}

/** Satır sonlarını korur: açıklamalar çok satırlı girilebiliyor. */
function paragraf(metin: string): string {
  return htmlKacir(metin).replace(/\r?\n/g, "<br>");
}

function bosSatir(): string {
  return `<p style="margin:0;color:${YUMUSAK};">${BOS}</p>`;
}

/** Başlık + içerik; içerik boşsa "Bilgi girilmemiş." satırı basılır. */
function bolum(baslik: string, icerik: string): string {
  return bolumBasligi(baslik) + (icerik || bosSatir());
}

function kunyeTablosu(satirlar: readonly OzgecmisKunyeSatiri[]): string {
  if (satirlar.length === 0) return "";
  const govde = satirlar
    .map(
      (satir) =>
        `<tr><td style="padding:2pt 12pt 2pt 0;color:${YUMUSAK};white-space:nowrap;vertical-align:top;">${htmlKacir(satir.etiket)}</td><td style="padding:2pt 0;">${htmlKacir(satir.deger.trim() || "—")}</td></tr>`,
    )
    .join("");
  return `<table style="font-size:10.5pt;border-collapse:collapse;">${govde}</table>`;
}

function kayitHtml(kayit: OzgecmisKaydi): string {
  const parcalar = [
    `<p style="margin:0 0 2pt 0;"><b>${htmlKacir(kayit.baslik)}</b>${
      kayit.tarih
        ? `<span style="color:${YUMUSAK};"> · ${htmlKacir(kayit.tarih)}</span>`
        : ""
    }</p>`,
  ];

  if (kayit.kunye) {
    parcalar.push(
      `<p style="margin:0 0 2pt 0;color:${YUMUSAK};font-size:10pt;">${htmlKacir(kayit.kunye)}</p>`,
    );
  }
  if (kayit.aciklama) {
    parcalar.push(
      `<p style="margin:0 0 2pt 0;">${paragraf(kayit.aciklama)}</p>`,
    );
  }
  /*
   * BAĞLANTILAR YAZIYLA, `<a>` OLARAK DEĞİL BASILIYOR — hem de tam adresiyle.
   * Word belgesi basılabilir bir nesnedir; kâğıda dökülen bir CV'de "kaynak
   * kod" diye tıklanamayan bir sözcük, adresi kaybetmek demekti.
   */
  for (const adres of kayit.baglantilar) {
    parcalar.push(
      `<p style="margin:0 0 2pt 0;font-size:10pt;">${htmlKacir(adres)}</p>`,
    );
  }

  return `<div style="margin-bottom:10pt;">${parcalar.join("")}</div>`;
}

/**
 * Sayfanın tepesi: solda fotoğraf kutusu, sağda ad ve unvan.
 *
 * TABLO KULLANILIYOR ve bu, belgedeki tek düzen tablosu. Word'ün eski
 * sürümlerinde uzun içeriği tabloya sokmak sayfa sonlarında bölünmeye yol
 * açıyor; burada içerik SABİT ve kısa (bir görsel, iki satır metin), yani o
 * risk yok. Gövdenin tamamı tek sütun kalıyor — kayıt sayısı önceden
 * bilinmiyor ve belge her uzunlukta düzgün çıkmalı.
 */
function baslikHtml(veri: OzgecmisVerisi): string {
  const kutu = veri.foto
    ? `<img src="${veri.foto.veriUrl}" width="96" height="96" alt="" style="width:96px;height:96px;border:1pt solid ${CIZGI};" />`
    : `<div style="width:96px;height:96px;border:1pt solid ${CIZGI};background:${ZEMIN};color:${VURGU};font-size:28pt;font-weight:bold;text-align:center;line-height:96px;">${htmlKacir(veri.basHarfler)}</div>`;

  return `<table style="width:100%;border-collapse:collapse;margin-bottom:6pt;">
<tr>
<td style="width:110px;padding:0 14pt 0 0;vertical-align:top;">${kutu}</td>
<td style="vertical-align:top;padding:0;">
<h1 style="font-size:20pt;margin:0;">${htmlKacir(veri.adSoyad)}</h1>
<p style="margin:2pt 0 0 0;color:${VURGU};font-size:11pt;">${htmlKacir(veri.unvan)}</p>
</td>
</tr>
</table>`;
}

/**
 * BELGENİN ALT KÜNYESİ — logo solda, üç satır metin sağda.
 *
 * TABLO, belgedeki İKİNCİ ve son düzen tablosu (birincisi başlık). Gerekçe
 * aynı: içerik sabit ve kısa, yani Word'ün uzun tabloları sayfa sonunda
 * bölmesi riski yok. Logo yoksa sütun hiç basılmıyor — başlıktaki fotoğraf
 * kutusunun aksine burada boş bir çerçeve tutmanın anlamı yok, künye kimliği
 * zaten yazıyla söylüyor.
 *
 * ÜST ÇİZGİ VE GRİ RENK KORUNDU: künye gövdenin devamı değil, belgenin
 * altına düşen bir dipnottur.
 */
function altKunyeHtml(veri: OzgecmisVerisi): string {
  const metin = `<p style="margin:0;">Bu özgeçmiş GençTek Akran Öğrenme Modeli ve Genç Bilişim Ekosistemi kayıtlarından ${htmlKacir(veri.uretimTarihi)} tarihinde oluşturulmuştur.</p>
<p style="margin:3pt 0 0 0;">${htmlKacir(KUNYE_KURUM)}</p>
<p style="margin:1pt 0 0 0;">${htmlKacir(KUNYE_ADRES)}</p>`;

  /*
   * LOGONUN İKİ ÖLÇÜSÜ DE YAZILIYOR (31 Ağustos 2026 · istek: "logo sola
   * sıkışık ve aşağı doğru çok uzun çıkıyor, logoyu küçültelim oraya sığsın").
   *
   * HATANIN SEBEBİ TEK BİR EKSİK ÖZNİTELİKTİ: yalnızca `width` verilmişti ve
   * Word, HTML belgelerinde eksik ölçüyü oranla TAMAMLAMIYOR — görselin kendi
   * pikselini kullanıyor. Kaynak dosya 2029×2469 (dikey), yani belgede 64
   * piksel eninde ama 2469 piksel boyunda bir resim çıkıyordu: künyenin
   * solunda sayfa boyu uzayan bir şerit. Tarayıcıda aynı HTML doğru
   * görünüyordu, bu yüzden hata yalnızca indirilen dosyada belliydi.
   *
   * ÖLÇÜ KÜNYE METNİNE GÖRE (bkz. LOGO_BOY): logo, yanındaki üç satırla aynı
   * yükseklikte.
   *
   * BAŞLIKTAKİ FOTOĞRAFTA İKİ ÖLÇÜ DE ZATEN VARDI (bkz. yukarısı) ve bu
   * yüzden orada böyle bir sorun hiç görülmedi — kural artık iki resimde de
   * aynı.
   *
   * =========================================================================
   * HİZA: İKİ HÜCRE DE ORTALANIYOR, RESİM SATIR TABANINDAN KURTARILIYOR
   * =========================================================================
   * (31 Ağustos 2026 · istek: "logo sağdaki yazı ile aynı hizada olmaz mı,
   * altta kalıyor biraz".)
   *
   * İki ayrı sebep logoyu aşağı itiyordu:
   *
   *   1. RESİM SATIR İÇİ BİR ÖĞE ve Word onu metin TABAN ÇİZGİSİNE oturtuyor;
   *      tabanın altında kalan iniş payı kadar aşağı kayıyordu. Resim
   *      `line-height:0` olan bir paragrafa alınıp `vertical-align:middle`
   *      verilerek o pay kaldırıldı.
   *   2. LOGO METİNDEN UZUNDU (52'ye 44) ve üstten hizalı iki blokta fazlalık
   *      hep alta biniyordu. Ölçü metnin yüksekliğine indirildi.
   *
   * Hücreler artık `middle`: kalan birkaç piksellik fark, üstten hizada göze
   * çarparken ortalamada iki blok da aynı eksende duruyor.
   */
  const logoSutunu = veri.logo
    ? `<td style="width:${LOGO_EN + 12}px;padding:0 12pt 0 0;vertical-align:middle;"><p style="margin:0;line-height:0;"><img src="${veri.logo.veriUrl}" width="${LOGO_EN}" height="${LOGO_BOY}" alt="GençTek" style="width:${LOGO_EN}px;height:${LOGO_BOY}px;vertical-align:middle;" /></p></td>`
    : "";

  return `<table style="width:100%;border-collapse:collapse;margin-top:24pt;border-top:1pt solid ${CIZGI};">
<tr>
<td colspan="2" style="height:6pt;padding:0;font-size:1pt;">&nbsp;</td>
</tr>
<tr>
${logoSutunu}
<td style="vertical-align:middle;padding:0;font-size:9pt;color:${YUMUSAK};">${metin}</td>
</tr>
</table>`;
}

/**
 * Özgeçmişin Word gövdesi.
 *
 * BÖLÜM SIRASI PANELDEKİ SIRADIR: kimlik, hakkımda, iletişim, çalışma
 * grupları, mentörlük, kayıt grupları, katılımlar, GençTek yolculuğu. Belge
 * profilin karşılığı olacaksa, okuyan kişi ekranda gördüğü sırayı belgede de
 * bulmalı.
 */
export function ozgecmisWordHtml(veri: OzgecmisVerisi): string {
  const listeHtml = (ogeler: readonly string[]): string =>
    ogeler.length === 0
      ? ""
      : `<p style="margin:0;">${ogeler.map((oge) => htmlKacir(oge)).join(" · ")}</p>`;

  const kayitlarHtml = veri.bolumler
    .map((satir) => bolum(satir.baslik, satir.kayitlar.map(kayitHtml).join("")))
    .join("");

  const katilimlarHtml = veri.katilimlar
    .map(
      (katilim) =>
        `<p style="margin:0 0 2pt 0;"><b>${htmlKacir(katilim.ad)}</b><span style="color:${YUMUSAK};"> · ${htmlKacir(katilim.tarih)} · ${htmlKacir(katilim.kapsam)}</span></p>`,
    )
    .join("");

  /*
   * REFERANS SATIRI: ad kalın, künye (kurum · telefon · e-posta) gri. Ayrı
   * satırlara bölünmedi — CV'nin sonundaki bu bölüm, kişi başına iki satırdan
   * uzarsa sayfayı tek başına doldurur.
   */
  const referanslarHtml = (veri.referanslar ?? [])
    .map(
      (referans) =>
        `<p style="margin:0 0 2pt 0;"><b>${htmlKacir(referans.adSoyad)}</b>${
          referans.kunye
            ? `<span style="color:${YUMUSAK};"> — ${htmlKacir(referans.kunye)}</span>`
            : ""
        }</p>`,
    )
    .join("");

  /*
   * YOLCULUK: önce kişinin durduğu basamak, altında oraya kadar geçilenler.
   * Sıra bilerek böyle: belgeyi okuyan kişinin sorusu "bu öğrenci nerede",
   * basamak listesi ise onun gerekçesi.
   *
   * BELGEDE YILDIZ YOK (31 Ağustos 2026 · istek: "worddeki yıldızları da
   * kaldır"). Ekrandaki şeritten kalkan satırın belgedeki karşılığıydı: yıldız
   * sayısı basamağın kaçıncı olduğunu tekrar ediyor ve listenin uzunluğu zaten
   * onu söylüyor. Yıldız artık yalnızca kişinin kendi ekranında, seviye adının
   * yanında duruyor.
   */
  const yolculukHtml = [
    `<p style="margin:0 0 6pt 0;"><b>${htmlKacir(veri.yolculuk.seviyeAdi)}</b></p>`,
    ...veri.yolculuk.basamaklar.map(
      (basamak) =>
        `<p style="margin:0 0 2pt 0;"><b>${htmlKacir(basamak.ad)}</b><span style="color:${YUMUSAK};"> — ${htmlKacir(basamak.aciklama)}</span></p>`,
    ),
  ].join("");

  /*
   * `charset` meta etiketi ŞART: Word onsuz dosyayı Latin-1 sanıp Türkçe
   * karakterleri bozuyor (aynı not faaliyet raporunda da yazılı).
   */
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
<meta charset="utf-8">
<title>${htmlKacir(veri.adSoyad)} — Özgeçmiş</title>
<style>
body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #18181b; }
table { border-collapse: collapse; }
p { line-height: 1.35; }
</style>
</head>
<body>
${baslikHtml(veri)}
${bolum("Kimlik bilgileri", kunyeTablosu(veri.kimlik))}
${bolum("Hakkımda", veri.hakkinda ? `<p style="margin:0;">${paragraf(veri.hakkinda)}</p>` : "")}
${bolum("İletişim bilgilerim", kunyeTablosu(veri.iletisim))}
${bolum("Çalışma gruplarım", listeHtml(veri.calismaGruplari))}
${bolum("Mentörlük", veri.mentorluk ? `<p style="margin:0;">${htmlKacir(veri.mentorluk)}</p>` : "")}
${kayitlarHtml}
${bolum("GençTek etkinlik katılımları", katilimlarHtml)}
${bolum("GençTek yolculuğum", yolculukHtml)}
${bolum("Eklemek istedikleriniz", veri.ekNotu ? `<p style="margin:0;">${paragraf(veri.ekNotu)}</p>` : "")}
${veri.referanslar === null ? "" : bolum("Referanslarım", referanslarHtml)}

${altKunyeHtml(veri)}
</body>
</html>`;
}

/**
 * İndirilen dosyanın adı — "ozgecmis-ayse-yilmaz".
 *
 * Türkçe harfler ve boşluklar AYIKLANIR: dosya adı e-postaya eklenip
 * paylaşılıyor ve bazı istemciler Türkçe karakterli adları bozuyor. Tarih
 * eklemesi `wordYaniti`nin işi, burada tekrarlanmıyor.
 */
export function ozgecmisDosyaAdi(adSoyad: string): string {
  const HARFLER: Record<string, string> = {
    ç: "c",
    ğ: "g",
    ı: "i",
    ö: "o",
    ş: "s",
    ü: "u",
  };
  const sade = adSoyad
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]/g, (harf) => HARFLER[harf] ?? harf)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `ozgecmis-${sade || "genctek"}`;
}
