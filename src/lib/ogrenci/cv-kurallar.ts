/**
 * Öğrenci CV'sinin kabul kuralları — references/domain-rules.md Bölüm 14.
 *
 * `faaliyet/ek-kurallar.ts` ile aynı desende, ama AYRI: faaliyet eki görsel ve
 * belge diye ikiye ayrılır, CV ise tek türdür. İkisini tek fonksiyonda
 * birleştirmek, birinin sınırını değiştirmenin diğerini de değiştirmesi demek
 * olurdu.
 *
 * KABUL EDİLEN TEK BİÇİM PDF (11 Ağustos 2026 · istek). doc ve docx kapatıldı:
 * CV'yi sahibinden başkası (danışman öğretmen, koordinatör) açıyor ve Word
 * dosyası alıcıda farklı diziliyor, makro taşıyabiliyor, tarayıcıda
 * görüntülenemediği için indirilmek zorunda kalıyordu.
 *
 * Saf tutulur: sınırlar parametreyle gelir (kaynak `sistem_ayari`), dosya
 * sistemine ve veritabanına gitmez.
 */

/**
 * "Eklemek istedikleriniz" metninin üst sınırı (31 Ağustos 2026 · istek: "CV
 * yükle bunu eklemek istedikleriniz yap … metin ekleme alanı olsun").
 *
 * İKİ BİN KARAKTER: alan bir özgeçmişe eklenecek şeyler için — sertifika, kurs,
 * hobi, ek açıklama. Sınırsız bırakılsaydı üretilen Word belgesinin tek
 * bölümü sayfalarca sürebilirdi; "Hakkımda"nınkinden geniş çünkü orası tek
 * paragraflık bir tanıtım, burası liste tutulabilen bir alan.
 */
export const CV_EK_NOTU_AZAMI = 2000;

/**
 * Metnin kabul edilip edilmeyeceği.
 *
 * BOŞ METİN GEÇERLİDİR ve `null` olarak kaydedilir: alanı temizlemek, kişinin
 * yazdığını geri almasının tek yolu — ayrı bir "sil" düğmesi, bir metin kutusu
 * için ikinci bir eylem olurdu. Boş dize ile `null` ayrımı burada bitiyor,
 * veritabanına tek bir "yok" hâli gidiyor.
 */
export function cvEkNotuKabulEdilirMi(metin: string): {
  olurMu: boolean;
  neden?: string;
  deger?: string | null;
} {
  const kirpik = metin.trim();
  if (kirpik.length > CV_EK_NOTU_AZAMI) {
    return {
      olurMu: false,
      neden: `Metin en fazla ${CV_EK_NOTU_AZAMI} karakter olabilir.`,
    };
  }
  return { olurMu: true, deger: kirpik || null };
}

export interface CvSinirlari {
  izinliTipler: string[];
  maksBayt: number;
}

/**
 * Ekranda "pdf" yazmak için: MIME tipinin okunur karşılığı.
 *
 * doc/docx satırları, ürün kuralı PDF-only olmasına rağmen DURUYOR: tip listesi
 * Yönetim ekranından düzenlenebilen bir ayardır (IZINLI_CV_TIPLERI) ve biri
 * yeniden açıldığında kullanıcı ham MIME dizgisi değil "doc" görmeli.
 */
const TIP_ADLARI: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
};

export function cvTipAdlari(izinliTipler: string[]): string {
  return izinliTipler.map((tip) => TIP_ADLARI[tip] ?? tip).join(", ");
}

function megabayt(bayt: number): string {
  return `${(bayt / (1024 * 1024)).toFixed(0)} MB`;
}

export function cvKabulEdilirMi(
  dosya: { mimeTipi: string; boyutBayt: number; dosyaAdi: string },
  sinirlar: CvSinirlari,
): { olurMu: boolean; neden?: string } {
  if (!dosya.dosyaAdi.trim()) {
    return { olurMu: false, neden: "Dosya seçilmedi." };
  }
  if (dosya.boyutBayt <= 0) {
    return { olurMu: false, neden: "Boş dosya yüklenemez." };
  }
  if (!sinirlar.izinliTipler.includes(dosya.mimeTipi)) {
    return {
      olurMu: false,
      neden: `CV yalnızca ${cvTipAdlari(sinirlar.izinliTipler)} biçiminde yüklenebilir.`,
    };
  }
  if (dosya.boyutBayt > sinirlar.maksBayt) {
    return {
      olurMu: false,
      neden: `Dosya ${megabayt(dosya.boyutBayt)} boyutunda; CV için üst sınır ${megabayt(sinirlar.maksBayt)}.`,
    };
  }
  return { olurMu: true };
}
