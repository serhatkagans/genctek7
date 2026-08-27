/**
 * Öğrencinin profiline yazdığı mesleki bağlantı adresleri.
 *
 * Saf tutulur: veritabanına gitmez, böylece birim testle eksiksiz kapsanabilir.
 * Adresler öğrenci beyanıdır — sistem sayfanın gerçekten ona ait olduğunu
 * doğrulamaz, yalnızca biçimi kontrol eder.
 */

/** Veritabanı sütunuyla birebir aynı (ogrenci_profil VARCHAR(200)). */
const BAGLANTI_SINIRI = 200;

export type BaglantiAlani =
  | "githubUrl"
  | "kisiselSiteUrl"
  | "linkedinUrl"
  | "instagramUrl";

export interface BaglantiTanimi {
  alan: BaglantiAlani;
  etiket: string;
  ornek: string;
  /**
   * Adresin geçmesi beklenen alan adı. Zorunlu DEĞİLDİR, yalnızca kullanıcıya
   * "bunu yanlış kutuya yazdın" diyebilmek için tutulur: GitHub Enterprise ya
   * da kendi alan adına taşınmış bir profil de geçerli bir adrestir.
   */
  beklenenAlanAdi: string | null;
}

export const BAGLANTI_TANIMLARI: BaglantiTanimi[] = [
  {
    alan: "githubUrl",
    etiket: "GitHub",
    ornek: "https://github.com/kullaniciadi",
    beklenenAlanAdi: "github.com",
  },
  {
    alan: "kisiselSiteUrl",
    etiket: "Kişisel site",
    ornek: "https://siteadresim.com",
    beklenenAlanAdi: null,
  },
  {
    alan: "linkedinUrl",
    etiket: "LinkedIn",
    ornek: "https://www.linkedin.com/in/kullaniciadi",
    beklenenAlanAdi: "linkedin.com",
  },
  /*
   * INSTAGRAM (26 Ağustos 2026 · istek: "öğrenci ve öğretmenlerin iletişim
   * bilgileri alanına da ekleyelim instagram linkedin").
   *
   * ADRES İSTENİYOR, KULLANICI ADI DEĞİL: "@kullaniciadi" yazan biri için
   * `protokolTamamla` "https://@kullaniciadi" üretir ve adres çözümlenemez —
   * hata metni örnekle birlikte döner. Kullanıcı adını adrese çevirmek
   * denenmedi çünkü diğer üç kutuyla farklı davranan tek kutu olurdu.
   *
   * Beklenen alan adı `instagram.com`: yanlış kutuya yazılan bir LinkedIn
   * adresi sessizce Instagram diye kaydedilmesin.
   */
  {
    alan: "instagramUrl",
    etiket: "Instagram",
    ornek: "https://www.instagram.com/kullaniciadi",
    beklenenAlanAdi: "instagram.com",
  },
];

export type Baglantilar = Record<BaglantiAlani, string | null>;

export type BaglantiKarari =
  | { olurMu: true; baglantilar: Baglantilar }
  | { olurMu: false; neden: string };

/**
 * Adres, protokolü yazılmadan girildiğinde reddedilmez, TAMAMLANIR.
 *
 * "github.com/ali" yazan öğrenciye hata göstermek, doğru bilgiyi vermiş birini
 * biçim yüzünden geri çevirmek olurdu. Tamamlama https'e yapılır; http'e
 * düşürmek adresi düz metne açardı.
 */
function protokolTamamla(adres: string): string {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(adres) ? adres : `https://${adres}`;
}

/**
 * Yalnızca http/https kabul edilir.
 *
 * `javascript:` ile başlayan bir adres, profile bakan danışmanın tarayıcısında
 * kod çalıştırırdı; kazanım bağlantılarındaki kuralın aynısı
 * (bkz. lib/kazanim/kurallar.ts).
 */
function cozumle(adres: string): URL | null {
  try {
    const cozulen = new URL(adres);
    if (cozulen.protocol !== "http:" && cozulen.protocol !== "https:") {
      return null;
    }
    return cozulen;
  } catch {
    return null;
  }
}

export function baglantilariDogrula(
  girdi: Partial<Record<BaglantiAlani, string | null | undefined>>,
): BaglantiKarari {
  const baglantilar: Baglantilar = {
    githubUrl: null,
    kisiselSiteUrl: null,
    linkedinUrl: null,
    instagramUrl: null,
  };

  for (const tanim of BAGLANTI_TANIMLARI) {
    const ham = (girdi[tanim.alan] ?? "").trim();
    if (!ham) continue;

    const adres = protokolTamamla(ham);
    if (adres.length > BAGLANTI_SINIRI) {
      return {
        olurMu: false,
        neden: `${tanim.etiket} adresi en fazla ${BAGLANTI_SINIRI} karakter olabilir.`,
      };
    }

    const cozulen = cozumle(adres);
    if (!cozulen) {
      return {
        olurMu: false,
        neden: `${tanim.etiket} adresi anlaşılamadı. Örnek: ${tanim.ornek}`,
      };
    }

    if (
      tanim.beklenenAlanAdi &&
      !cozulen.hostname.endsWith(tanim.beklenenAlanAdi)
    ) {
      return {
        olurMu: false,
        neden: `${tanim.etiket} kutusuna ${tanim.beklenenAlanAdi} adresi yazılmalı. Diğer adresleri "Kişisel site" kutusuna girebilirsiniz.`,
      };
    }

    baglantilar[tanim.alan] = cozulen.toString();
  }

  return { olurMu: true, baglantilar };
}
