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

export interface OzgecmisVerisi {
  adSoyad: string;
  /** Ad altındaki unvan satırı: "Öğrenci · 11-A". */
  unvan: string;
  /** Fotoğraf yoksa null — kutu yine basılır, içine baş harfler girer. */
  foto: OzgecmisFotografi | null;
  /** Fotoğrafsız kutuya basılan harfler. */
  basHarfler: string;
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
  /** Kazanılmış nişanlar; kazanılmamışlar CV'ye girmez. */
  nisanlar: { ad: string; aciklama: string }[];
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
 * Özgeçmişin Word gövdesi.
 *
 * BÖLÜM SIRASI PANELDEKİ SIRADIR: kimlik, hakkımda, iletişim, çalışma
 * grupları, mentörlük, kayıt grupları, katılımlar, nişanlar. Belge profilin
 * karşılığı olacaksa, okuyan kişi ekranda gördüğü sırayı belgede de bulmalı.
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

  const nisanlarHtml = veri.nisanlar
    .map(
      (nisan) =>
        `<p style="margin:0 0 2pt 0;"><b>${htmlKacir(nisan.ad)}</b><span style="color:${YUMUSAK};"> — ${htmlKacir(nisan.aciklama)}</span></p>`,
    )
    .join("");

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
${bolum("Nişanlar", nisanlarHtml)}
${veri.referanslar === null ? "" : bolum("Referanslarım", referanslarHtml)}

<p style="margin-top:24pt;font-size:9pt;color:${YUMUSAK};border-top:1pt solid ${CIZGI};padding-top:6pt;">
Bu özgeçmiş GençTek Bilgi Sistemi'ndeki profil kayıtlarından ${htmlKacir(veri.uretimTarihi)} tarihinde üretildi.
</p>
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
