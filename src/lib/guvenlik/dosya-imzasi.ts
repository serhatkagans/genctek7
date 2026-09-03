/**
 * Yüklenen dosyanın İÇERİĞİNİN, iddia ettiği MIME tipiyle uyuşup uyuşmadığı.
 *
 * NİYE GEREKLİ: kabul kuralları (faaliyet/ek-kurallar.ts, ogrenci/cv-kurallar.ts,
 * kullanici/profil-foto-kurallar.ts) yalnızca `File.type`'a bakar. O değer
 * multipart gövdesinde İSTEMCİNİN yazdığı bir dizedir, doğrulanmış bir şey
 * değildir — tarayıcı formundan geçmeyen elle kurulmuş bir istek, içeriği HTML
 * olan bir dosyayı `image/png` etiketiyle gönderebilir.
 *
 * Bunun sonuçsuz kalmamasının sebebi, dosyanın GERİ SERVİS EDİLMESİDİR: indirme
 * rotaları `Content-Type`'ı veritabanındaki bu doğrulanmamış değerden veriyor
 * (ör. app/panel/profil/foto/route.ts) ve fotoğraflar `inline` gönderiliyor.
 * Bugün `next.config.ts`'teki `nosniff` ve CSP bu zinciri kapatıyor; buradaki
 * kontrol o iki başlığa TEK BAŞINA güvenmemek için var — üçü de aynı anda
 * yanlış yapılandırılmadıkça depoya sahte tipli dosya girmez.
 *
 * SAF TUTULUR: yalnızca baytlara ve tip dizesine bakar, dosya sistemine ve
 * veritabanına gitmez. Böylece birim testle doğrulanabilir (bkz.
 * tests/dosya-imzasi.test.ts).
 */

/** İmza tablosunun bakması gereken en uzun önek (webp'te 12 bayt). */
const AZAMI_ONEK = 12;

function baytlarEsitMi(
  baytlar: Uint8Array,
  konum: number,
  beklenen: readonly number[],
): boolean {
  if (baytlar.length < konum + beklenen.length) return false;
  return beklenen.every((deger, i) => baytlar[konum + i] === deger);
}

/** ASCII dizeyi bayt dizisine çevirir — imzaları okunur yazabilmek için. */
function ascii(metin: string): readonly number[] {
  return [...metin].map((harf) => harf.charCodeAt(0));
}

/**
 * MIME tipi → içeriğin taşıması gereken imza.
 *
 * İMZA DOSYANIN BAŞINDA ARANIR, içinde değil. PDF belirtimi `%PDF-`
 * öncesinde birkaç bayt çöp bulunmasına göz yumar, ama gerçek üreticiler
 * (Word, tarayıcı yazdırması, LibreOffice) dosyayı hep 0. bayttan başlatır;
 * "başta bir yerde" demek, saldırganın istediği içeriği önüne dolgu koyarak
 * geçirmesine izin vermek olurdu.
 */
const IMZALAR: Record<string, (baytlar: Uint8Array) => boolean> = {
  "application/pdf": (b) => baytlarEsitMi(b, 0, ascii("%PDF-")),

  "image/jpeg": (b) => baytlarEsitMi(b, 0, [0xff, 0xd8, 0xff]),

  "image/png": (b) =>
    baytlarEsitMi(b, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),

  /*
   * WebP bir RIFF kabıdır: ilk dört bayt "RIFF", sonraki dört bayt uzunluk,
   * 8.–11. baytlar da kabın türü olan "WEBP". Yalnızca "RIFF"e bakmak yetmez,
   * wav ve avi de RIFF'tir.
   */
  "image/webp": (b) =>
    baytlarEsitMi(b, 0, ascii("RIFF")) && baytlarEsitMi(b, 8, ascii("WEBP")),

  "image/gif": (b) =>
    baytlarEsitMi(b, 0, ascii("GIF87a")) || baytlarEsitMi(b, 0, ascii("GIF89a")),

  /*
   * doc ve docx bugün hiçbir akışta AÇIK DEĞİL (CV 11 Ağustos 2026'da yalnızca
   * pdf'e indirildi), ama izinli tip listeleri `sistem_ayari`'ndan düzenlenebilir
   * ve biri yeniden açıldığında bu tablo onu tanımalı — aksi halde kontrol
   * kapanmaz, kabul edilebilir dosyayı reddetmeye başlar.
   *
   * DOCX'TE İMZA ZAYIFTIR: docx bir zip'tir ve "PK\x03\x04" her zip'te aynıdır.
   * Yani bu satır "zip değil bir şeyi docx diye yollama"yı engeller, "içindeki
   * zip gerçekten bir Word belgesi mi"yi değil. Ayrımı yapmak arşivi açıp
   * içindekilere bakmayı gerektirir; bu kontrolün amacı o değil.
   */
  "application/msword": (b) =>
    baytlarEsitMi(b, 0, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": (
    b,
  ) => baytlarEsitMi(b, 0, [0x50, 0x4b, 0x03, 0x04]),
};

export interface ImzaKarari {
  olurMu: boolean;
  neden?: string;
}

/**
 * Dosyanın ilk baytları, iddia edilen MIME tipiyle uyuşuyor mu?
 *
 * TANINMAYAN TİP REDDEDİLİR (fail-closed). Alternatifi, tablodaki tipleri
 * doğrulayıp gerisini geçirmekti; o durumda yönetim ekranından listeye yeni bir
 * tip eklemek kontrolü o tip için SESSİZCE kapatırdı — güvenlik kontrolünün
 * kapandığını kimsenin fark etmediği hâl, en kötü hâldir. Bu yönde hata
 * verildiğinde ise sonuç görünürdür: dosya reddedilir ve mesaj tipi söyler.
 * Tablo, izinli tip listelerinin bugünkü ve makul yarınki değerlerini zaten
 * kapsıyor.
 *
 * `baytlar` dosyanın TAMAMI olabilir; yalnızca ilk 12 baytına bakılır.
 */
export function dosyaImzasiUyuyorMu(
  baytlar: Uint8Array,
  mimeTipi: string,
): ImzaKarari {
  const dogrula = IMZALAR[mimeTipi];
  if (!dogrula) {
    return {
      olurMu: false,
      neden: `"${mimeTipi}" tipindeki dosyanın içeriği sunucuda doğrulanamıyor. Dosyayı pdf ya da jpg/png/webp biçiminde yükleyin.`,
    };
  }

  const onek = baytlar.subarray(0, AZAMI_ONEK);
  if (!dogrula(onek)) {
    return {
      olurMu: false,
      neden:
        "Dosyanın içeriği uzantısıyla uyuşmuyor. Dosyanın bozulmadığından ve doğru biçimde kaydedildiğinden emin olup yeniden deneyin.",
    };
  }

  return { olurMu: true };
}
