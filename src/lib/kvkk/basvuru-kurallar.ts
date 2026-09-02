import type {
  KvkkBasvuruDurumu,
  KvkkTalepKonusu,
} from "@/generated/prisma/enums";

/**
 * İLGİLİ KİŞİ BAŞVURUSU KURALLARI — 6698 sayılı Kanun m.11/m.13 ve Veri
 * Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ (2 Eylül 2026 ·
 * Genelge 4/ç).
 *
 * Genelge, aydınlatma metninin yanı sıra BAŞVURU FORMUNUN da platformda
 * bulunmasını istiyor. Aydınlatma ve açık rıza metinleri vardı (bkz.
 * ./kurallar.ts); başvuru formu yoktu ve aydınlatma metninin 7. maddesi işi
 * sistemin dışına atıyordu: "okul idareniz aracılığıyla Bakanlığa
 * başvurabilirsiniz". Okul idaresi burada veri sorumlusu değil — YEĞİTEK'tir
 * (m.13) — ve o kanalda ne başvurunun kaydı tutulur ne de otuz günlük süresi
 * işler.
 *
 * DOSYA SAF TUTULUR: veritabanına gitmez, "şimdi"yi parametre olarak alır.
 * Süre hesabı ve doğrulama kararları birim testle sınanabilsin diye
 * (bkz. tests/kvkk-basvuru-kurallar.test.ts) — ./kurallar.ts ile aynı desen.
 */

/**
 * Kanunî yanıt süresi: otuz gün (m.13/2).
 *
 * "En kısa sürede ve en geç otuz gün içinde" der kanun; sistemin
 * gösterebileceği tek nesnel ölçü otuz gündür. Sistem ayarına BAĞLANMADI:
 * süre bir tercih değil, kanunun sayısı — yönetim ekranından kısaltılıp
 * uzatılabilir olması, uyumun kendisini ayarlanabilir bir şey gibi
 * gösterirdi.
 */
export const YANIT_SURESI_GUN = 30;

/** Bu kadar gün kalınca ekranda uyarı rengine geçilir. */
export const YANIT_UYARI_ESIGI_GUN = 7;

export const ACIKLAMA_ASGARI = 20;
export const ACIKLAMA_AZAMI = 4000;
export const YANIT_ASGARI = 20;
export const YANIT_AZAMI = 4000;
export const YANIT_ADRESI_AZAMI = 150;

/** Yanıt adresi biçimi — dış giriş başvurusundakiyle aynı ölçüt. */
const EPOSTA_BICIMI = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface TalepKonusuTanimi {
  konu: KvkkTalepKonusu;
  /** Kanundaki bent — formda hakkın dayanağı görünür. */
  madde: string;
  /** Onay kutusunun yanında yazan hak. */
  etiket: string;
  /**
   * Hakkın bu sistemde ne anlama geldiği. Kanun metni tek başına yeterli
   * değil: "silinmesini isteme" hakkını okuyan öğrenci, e-Okul'dan gelen
   * kimlik bilgisinin burada silinemeyeceğini bilmiyor ve bunu ancak otuz gün
   * sonra gelen cevapta öğrenmesi, kimseye faydası olmayan bir bekleyiş olur.
   */
  aciklama: string;
}

/**
 * Formdaki talep konuları — sıra ve içerik KANUNDAN gelir, üründen değil.
 *
 * Listeyi kısaltmak (örneğin "bu sistemde otomatik analiz yok, o bendi
 * çıkaralım") FORMU EKSİLTMEK olurdu: hangi hakkın kullanılabileceğine veri
 * sorumlusu değil kanun karar verir; kullanılamayacak bir talebin cevabı
 * "böyle bir işleme yapılmıyor" diye VERİLİR, hak baştan gizlenmez.
 */
export const TALEP_KONULARI: readonly TalepKonusuTanimi[] = [
  {
    konu: "ISLENIYOR_MU",
    madde: "m.11/a",
    etiket: "Kişisel verimin işlenip işlenmediğini öğrenmek istiyorum.",
    aciklama:
      "Sistemde adınıza kayıt bulunup bulunmadığı yazılı olarak bildirilir.",
  },
  {
    konu: "BILGI_TALEBI",
    madde: "m.11/b",
    etiket: "İşlenmişse buna ilişkin bilgi talep ediyorum.",
    aciklama:
      "Hangi verilerinizin tutulduğu (kimlik, iletişim, başvuru ve faaliyet kayıtları) dökümüyle bildirilir.",
  },
  {
    konu: "AMACA_UYGUNLUK",
    madde: "m.11/c",
    etiket:
      "İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenmek istiyorum.",
    aciklama:
      "Verinizin hangi amaçla işlendiği ve o amaç dışında kullanılıp kullanılmadığı açıklanır.",
  },
  {
    konu: "UCUNCU_KISILER",
    madde: "m.11/ç",
    etiket:
      "Yurt içinde veya yurt dışında verimin aktarıldığı üçüncü kişileri bilmek istiyorum.",
    aciklama:
      "Verinizin paylaşıldığı kurum ve kuruluşlar bildirilir; paylaşım yoksa bu da yazılı olarak bildirilir.",
  },
  {
    konu: "DUZELTME",
    madde: "m.11/d",
    etiket: "Eksik veya yanlış işlenen verimin düzeltilmesini istiyorum.",
    aciklama:
      "e-Okul/EBA kaynaklı kimlik ve öğrenim bilgileri bu sistemde düzeltilemez; talebiniz kaynağına yönlendirilir. Kendi girdiğiniz bilgiler düzeltilir.",
  },
  {
    konu: "SILME",
    madde: "m.11/e",
    etiket: "Verimin silinmesini veya yok edilmesini istiyorum.",
    aciklama:
      "Kanunî saklama yükümlülüğü bulunmayan veriler silinir; faaliyet ve başvuru kayıtları gibi yükümlülük kapsamındaki veriler için gerekçe bildirilir.",
  },
  {
    konu: "UCUNCU_KISIYE_BILDIRIM",
    madde: "m.11/f",
    etiket:
      "Düzeltme veya silme işleminin, verimin aktarıldığı üçüncü kişilere bildirilmesini istiyorum.",
    aciklama:
      "Düzeltme ya da silme yapılmışsa, veriniz paylaşılan taraflara ayrıca bildirilir.",
  },
  {
    konu: "OTOMATIK_ANALIZE_ITIRAZ",
    madde: "m.11/g",
    etiket:
      "Münhasıran otomatik sistemlerle yapılan analiz sonucu aleyhime çıkan sonuca itiraz ediyorum.",
    aciklama:
      "Otomatik olarak üretilen bir sonuç (öneri, eşleştirme, sıralama) aleyhinize olduysa insan eliyle yeniden değerlendirilir.",
  },
  {
    konu: "ZARARIN_GIDERILMESI",
    madde: "m.11/ğ",
    etiket:
      "Verimin kanuna aykırı işlenmesi sebebiyle uğradığım zararın giderilmesini talep ediyorum.",
    aciklama:
      "Talebiniz incelenir ve sonucu bildirilir; bu hak, yargı yoluna başvurma hakkınızı ortadan kaldırmaz.",
  },
  {
    /*
     * 11. maddede DEĞİL, 7. maddede duruyor. Listeye yine de konuyor çünkü
     * ilgili kişi açısından aynı formun aynı satırı; ayrı bir kanal açmak,
     * hakkını kullanmak isteyen kişiyi "hangi form?" sorusuyla baş başa
     * bırakırdı.
     */
    konu: "ACIK_RIZA_GERI_ALMA",
    madde: "m.7",
    etiket: "Daha önce verdiğim açık rızayı geri almak istiyorum.",
    aciklama:
      "Rızaya dayanan işlemler (iletişim bilgisi, profil fotoğrafı, belgelerde ad kullanımı) durdurulur. Kanunî dayanağı rıza olmayan işlemler bundan etkilenmez.",
  },
];

export function talepKonusuTanimi(konu: KvkkTalepKonusu): TalepKonusuTanimi {
  const tanim = TALEP_KONULARI.find((aday) => aday.konu === konu);
  if (!tanim) {
    // Enum'a değer eklenip tanım yazılmazsa hak formda sessizce görünmezdi;
    // gürültülü başarısızlık tercih ediliyor (bkz. kurallar.ts · belgeTanimi).
    throw new Error(`Tanımsız KVKK talep konusu: ${konu}`);
  }
  return tanim;
}

/** Bildirim metninde ve listede kullanılan kısa ad. */
export const KONU_KISA_ADLARI: Record<KvkkTalepKonusu, string> = {
  ISLENIYOR_MU: "İşlenip işlenmediğini öğrenme",
  BILGI_TALEBI: "Bilgi talebi",
  AMACA_UYGUNLUK: "Amaca uygunluk",
  UCUNCU_KISILER: "Aktarılan üçüncü kişiler",
  DUZELTME: "Düzeltme",
  SILME: "Silme / yok etme",
  UCUNCU_KISIYE_BILDIRIM: "Üçüncü kişilere bildirim",
  OTOMATIK_ANALIZE_ITIRAZ: "Otomatik analize itiraz",
  ZARARIN_GIDERILMESI: "Zararın giderilmesi",
  ACIK_RIZA_GERI_ALMA: "Açık rızanın geri alınması",
};

export const DURUM_ETIKETLERI: Record<KvkkBasvuruDurumu, string> = {
  ALINDI: "Alındı",
  INCELENIYOR: "İnceleniyor",
  KABUL: "Kabul edildi",
  KISMEN_KABUL: "Kısmen kabul edildi",
  RET: "Reddedildi",
};

/**
 * Henüz sonuçlanmamış hâller. Süre yalnızca bunlarda işler.
 *
 * TEK LİSTE, iki yerde tekrar edilmiyor: ekranın "bekleyenler" bölümü ile
 * sorgunun `where` koşulu aynı kümeyi kullanıyor. Ayrı yazılsaydı yeni bir
 * ara durum eklendiğinde biri güncellenir, öbürü sessizce eksik listelerdi.
 */
export const ACIK_DURUMLAR: readonly KvkkBasvuruDurumu[] = [
  "ALINDI",
  "INCELENIYOR",
];

export function acikMi(durum: KvkkBasvuruDurumu): boolean {
  return ACIK_DURUMLAR.includes(durum);
}

/** Yanıtın en geç verilmesi gereken an. */
export function yanitSonTarihi(olusturmaTarihi: Date): Date {
  const son = new Date(olusturmaTarihi);
  son.setDate(son.getDate() + YANIT_SURESI_GUN);
  return son;
}

/**
 * Süreye kalan tam gün. Negatifse süre AŞILMIŞTIR.
 *
 * Gün farkı takvim günü üzerinden değil, milisaniyeden yukarı yuvarlanarak
 * hesaplanıyor: başvuru saat 23:50'de açıldıysa "bugün" bir gün sayılmaz —
 * kanunun süresi başvurunun ULAŞTIĞI anda başlar, o günün başında değil.
 */
export function kalanGun(simdi: Date, olusturmaTarihi: Date): number {
  const fark = yanitSonTarihi(olusturmaTarihi).getTime() - simdi.getTime();
  return Math.ceil(fark / (24 * 60 * 60 * 1000));
}

/**
 * Süresi dolmuş, hâlâ açık başvuru.
 *
 * SONUÇLANMIŞ BAŞVURU GECİKMİŞ SAYILMAZ, geç yanıtlanmış olsa bile: bu
 * fonksiyon "şu an yapılacak iş var mı" sorusuna cevap veriyor, geçmişin
 * karnesini çıkarmıyor. Geç kalınmış yanıtın izi `yanitTarihi` ile
 * `olusturmaTarihi` arasında zaten duruyor.
 */
export function gecikmisMi(
  simdi: Date,
  basvuru: { durum: KvkkBasvuruDurumu; olusturmaTarihi: Date },
): boolean {
  if (!acikMi(basvuru.durum)) return false;
  return kalanGun(simdi, basvuru.olusturmaTarihi) < 0;
}

// ---------------------------------------------------------------------------
// Form doğrulama
// ---------------------------------------------------------------------------

const GECERLI_KONULAR = new Set<string>(
  TALEP_KONULARI.map((tanim) => tanim.konu),
);

/**
 * Formdan gelen konu değerlerini çözer.
 *
 * BİLİNMEYEN DEĞER SESSİZCE ATILMAZ, başvuru reddedilir: onay kutularının
 * adları koddan geliyor ve tanınmayan bir değer ya bir hatadır ya da elle
 * kurcalanmış bir istektir. "Anlamadığımı atarım" davranışı, kişinin
 * seçtiğini sandığı bir hakkın kaydedilmemesiyle sonuçlanabilirdi.
 */
export function konulariCoz(
  degerler: readonly string[],
):
  | { olurMu: true; konular: KvkkTalepKonusu[] }
  | { olurMu: false; neden: string } {
  if (degerler.length === 0) {
    return { olurMu: false, neden: "En az bir talep konusu seçin." };
  }
  for (const deger of degerler) {
    if (!GECERLI_KONULAR.has(deger)) {
      return { olurMu: false, neden: "Tanınmayan bir talep konusu gönderildi." };
    }
  }
  // Yinelenenler eleniyor: bileşik birincil anahtar aynı konuyu iki kez kabul
  // etmez ve veritabanı hatasıyla düşen bir form, kullanıcıya hiçbir şey
  // anlatmaz.
  const benzersiz = [...new Set(degerler)] as KvkkTalepKonusu[];
  // Sıra KANUNDAKİ sıraya çekiliyor: formdaki kutuların işaretlenme sırası
  // rastgeledir, oysa başvuru belgesi bentleri sırayla okur.
  return {
    olurMu: true,
    konular: TALEP_KONULARI.map((tanim) => tanim.konu).filter((konu) =>
      benzersiz.includes(konu),
    ),
  };
}

/**
 * Başvurunun açıklaması.
 *
 * ALT SINIR VAR ve bilinçli: konu seçimi neyi istediğini söyler, açıklama
 * HANGİ VERİ için istediğini. "Sil" yazan tek kelimelik bir başvuru,
 * cevaplanabilir bir talep değildir ve otuz gün sonra karşılıklı bir "neyi?"
 * sorusuyla biterdi.
 */
export function aciklamayiCoz(
  metin: string,
): { olurMu: true; aciklama: string } | { olurMu: false; neden: string } {
  const aciklama = metin.trim();
  if (aciklama.length < ACIKLAMA_ASGARI) {
    return {
      olurMu: false,
      neden: `Talebinizi en az ${ACIKLAMA_ASGARI} karakterle açıklayın; hangi bilginiz için başvurduğunuz yazılmadan talep sonuçlandırılamaz.`,
    };
  }
  if (aciklama.length > ACIKLAMA_AZAMI) {
    return {
      olurMu: false,
      neden: `Açıklama en fazla ${ACIKLAMA_AZAMI} karakter olabilir.`,
    };
  }
  return { olurMu: true, aciklama };
}

/**
 * Yanıtın gönderilmesi istenen adres (Tebliğ m.6 · "yazılı ya da elektronik
 * ortamda").
 *
 * BOŞ BIRAKILABİLİR: yanıt her hâlükârda panele yazılıyor ve bildirim olarak
 * düşüyor, yani boş bir alan yüzünden cevapsız kalan başvuru olmuyor. Ama
 * yazıldıysa GEÇERLİ olmalı — hatalı yazılmış bir adres, kişinin cevabı
 * beklediği yere hiçbir şey gitmemesi demek.
 */
export function yanitAdresiniCoz(
  metin: string,
): { olurMu: true; adres: string | null } | { olurMu: false; neden: string } {
  const adres = metin.trim();
  if (!adres) return { olurMu: true, adres: null };
  if (adres.length > YANIT_ADRESI_AZAMI || !EPOSTA_BICIMI.test(adres)) {
    return {
      olurMu: false,
      neden: "Yanıt adresi geçerli bir e-posta adresi olmalı; boş bırakırsanız yanıt panelinize düşer.",
    };
  }
  return { olurMu: true, adres: adres.toLowerCase() };
}

/** Merkezin yazdığı yanıt metni. */
export function yanitiCoz(
  metin: string,
): { olurMu: true; yanit: string } | { olurMu: false; neden: string } {
  const yanit = metin.trim();
  if (yanit.length < YANIT_ASGARI) {
    return {
      olurMu: false,
      neden: `Yanıt en az ${YANIT_ASGARI} karakter olmalı; gerekçesiz ret ve açıklamasız kabul Kanun'un 13. maddesine aykırıdır.`,
    };
  }
  if (yanit.length > YANIT_AZAMI) {
    return {
      olurMu: false,
      neden: `Yanıt en fazla ${YANIT_AZAMI} karakter olabilir.`,
    };
  }
  return { olurMu: true, yanit };
}

/** Yanıt formundan gelen sonuç değeri gerçekten bir SONUÇ mu? */
export function sonucuCoz(
  deger: string,
):
  | { olurMu: true; durum: KvkkBasvuruDurumu }
  | { olurMu: false; neden: string } {
  if (deger === "KABUL" || deger === "KISMEN_KABUL" || deger === "RET") {
    return { olurMu: true, durum: deger };
  }
  return { olurMu: false, neden: "Geçersiz bir sonuç gönderildi." };
}
