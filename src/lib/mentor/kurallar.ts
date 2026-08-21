import type { MentorlukDurumu } from "@/generated/prisma/enums";

/**
 * Mentörlük kuralları (7 Ağustos 2026).
 *
 * Saf tutulur: veritabanına ve React'e bakmaz, birim testle kapsanır.
 *
 * ---------------------------------------------------------------------------
 * MENTÖRLÜK NEDİR
 * ---------------------------------------------------------------------------
 * Bir kişinin belirli ÇALIŞMA GRUPLARINDA ve serbestçe yazdığı KONULARDA
 * öğrencilere yol gösterebileceği beyanı — ve bu beyanın onaylanmış hâli.
 *
 * Kim olursa olsun aynı şeydir: GençTek öğretmeni de, dışarıdan başvuran
 * mezun/paydaş/mentör de aynı kaydı doldurur. Değişen tek şey ONAYI KİMİN
 * VERDİĞİDİR (bkz. lib/yetki/izinler.ts · mentorlukOnaylayabilirMi).
 *
 * ÖĞRENCİ MENTÖR OLAMAZ. Kural burada değil yetki katmanında duruyor ama
 * gerekçesi burada anlamlı: mentörlük 18 yaş altı bir kullanıcıyla birebir
 * yazışma hakkı doğurur ve o hakkın karşı tarafı yetişkin olmalıdır. Akran
 * desteği için "akran eğitimi" ve panodaki ekip arkadaşı ilanı var.
 */

export const MENTOR_KONULARI_AZAMI = 500;

/**
 * Kart avatarındaki BAŞ HARFLER — fotoğrafı olmayan (ya da fotoğrafı
 * gösterilemeyen) mentörün yerine basılır.
 *
 * En fazla iki harf: üç adlı bir kişide daire dolar ve harfler okunmaz hâle
 * gelir. Panodaki havuz ızgarası ile onay kuyruğu aynı hesabı kullanıyor;
 * iki yerde ayrı yazıldığında birinin "Ayşe Nur Yılmaz"ı "AN", öbürünün "AY"
 * yapması gibi sessiz bir tutarsızlık doğuyordu.
 */
export function basHarfler(adSoyad: string): string {
  return adSoyad
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parca) => parca[0])
    .join("")
    .toLocaleUpperCase("tr-TR");
}

/**
 * Havuz kartında mentörün altına yazılan SIFAT (11 Ağustos 2026).
 *
 * `kullaniciRolEtiketi` kullanılmadı, iki sebeple: (1) o fonksiyon oturum
 * kullanıcısı ister, burada elimizde bir liste satırı var; (2) çıktısı kart
 * için fazla uzun — rolsüz öğretmene "Öğretmen (danışmanlık görevi alınmadı)"
 * diyor. Havuzda aranan cevap "bu kişi kim" değil "hangi sıfatla yol
 * gösteriyor".
 *
 * ROLSÜZ ÖĞRETMEN BOŞ DEĞİL "Öğretmen"dir. Mentörlük başvurusunu öğretmen de
 * yapabiliyor (bkz. mentorlukBasvurabilirMi) ve görev almamış bir öğretmenin
 * rol listesi boştur; sıfatsız bırakılsaydı kartta yalnızca adı görünür,
 * öğrenci karşısındakinin öğretmen olduğunu anlamazdı.
 *
 * BİRDEN ÇOK ROLDE İLKİ yazılır. Kart tek satırlık bir sıfat taşıyor; il
 * koordinatörü olan bir öğretmene "Danışman öğretmen · İl koordinatörü"
 * demek, öğrencinin sorduğu soruya fazladan bir şey katmıyor.
 *
 * Branş varsa parantez içinde eklenir: "Öğretmen (Bilişim Teknolojileri)".
 * Mentör seçerken en çok işe yarayan ayrım bu.
 */
export function mentorSifati(
  roller: readonly { rolKodu: string }[],
  brans: string | null,
): string {
  const ETIKETLER: Record<string, string> = {
    DANISMAN: "Danışman öğretmen",
    IL_KOORDINATOR: "İl koordinatörü",
    PROJE_YONETICISI: "Proje yöneticisi",
    MEZUN: "Mezun",
    PAYDAS_TEMSILCISI: "Paydaş temsilcisi",
    OGRENCI: "Öğrenci",
  };

  const temel = roller.length === 0
    ? "Öğretmen"
    : (ETIKETLER[roller[0].rolKodu] ?? "Öğretmen");

  const dal = brans?.trim();
  return dal ? `${temel} (${dal})` : temel;
}

/** Bir kişinin AKTİF mentör sayılması için gereken durum. */
export function mentorluguAktifMi(durum: MentorlukDurumu | null): boolean {
  return durum === "ONAYLANDI";
}

export const MENTORLUK_DURUM_ETIKETLERI: Record<MentorlukDurumu, string> = {
  BEKLIYOR: "Onay bekliyor",
  ONAYLANDI: "Onaylandı",
  REDDEDILDI: "Reddedildi",
  BIRAKILDI: "Bırakıldı",
};

export const MENTORLUK_DURUM_SINIFLARI: Record<MentorlukDurumu, string> = {
  BEKLIYOR: "bg-uyari-zemin text-uyari-metin",
  ONAYLANDI: "bg-olumlu-zemin text-olumlu-metin",
  REDDEDILDI: "bg-hata-zemin text-hata-metin",
  BIRAKILDI: "bg-zemin text-metin-yumusak",
};

export interface MentorlukGirdisi {
  /** Seçilen çalışma grubu kimlikleri; ham form değerleri olabilir. */
  grupIdleri: readonly unknown[];
  /** Serbest konu metni. */
  konular: string;
  /** Seçilebilir grupların kimlikleri — doğrulama bunlara karşı yapılır. */
  gecerliGrupIdleri: readonly number[];
}

export type MentorlukKarari =
  | { olurMu: true; grupIdleri: number[]; konular: string | null }
  | { olurMu: false; neden: string };

/**
 * Başvurunun kabul edilip edilmeyeceği.
 *
 * EN AZ BİR ÇALIŞMA GRUBU ZORUNLU (21 Ağustos 2026 · istek: "mentör başvurusu
 * yaparken listeden bir tik seçmeden başvurusu onaylanmasın").
 *
 * Önce serbest konu metni tek başına yeterliydi; o başvurular hiçbir çalışma
 * grubuna bağlanmıyordu ve panoda ilan eşleştirmesi gruplar üzerinden
 * yürüdüğü için mentör hiçbir ilana düşmüyordu. Serbest metin KALDIRILMADI:
 * grubun taşımadığı uzmanlığı anlatmaya devam ediyor, ama artık tek başına
 * bir başvuru kuramıyor.
 *
 * GRUP KİMLİKLERİ LİSTEYE KARŞI DOĞRULANIR: form girdisine güvenilseydi
 * kapatılmış ya da hiç var olmayan bir gruba mentörlük beyan edilebilirdi.
 * Tekrarlananlar da eleniyor — aynı grup iki kez gönderildiğinde junction
 * tabloya ikinci satır yazılmaya çalışılır ve birincil anahtar çakışırdı.
 */
export function mentorlukKabulEdilirMi(
  girdi: MentorlukGirdisi,
): MentorlukKarari {
  const gecerliler = new Set(girdi.gecerliGrupIdleri);

  const secilenler = [
    ...new Set(
      girdi.grupIdleri
        .map((ham) => Number.parseInt(String(ham), 10))
        .filter((id) => Number.isInteger(id) && gecerliler.has(id)),
    ),
  ];

  const konular = girdi.konular.trim();
  if (konular.length > MENTOR_KONULARI_AZAMI) {
    return {
      olurMu: false,
      neden: `Konular en fazla ${MENTOR_KONULARI_AZAMI} karakter olabilir.`,
    };
  }

  if (secilenler.length === 0) {
    return {
      olurMu: false,
      neden:
        "Listeden en az bir çalışma grubu işaretleyin. Grup seçilmeyen bir mentörlük panodaki ilanlarla eşleşmez; serbest metin tek başına yeterli değildir.",
    };
  }

  return { olurMu: true, grupIdleri: secilenler, konular: konular || null };
}

export type KararGirdisi = {
  mevcutDurum: MentorlukDurumu;
  yeniDurum: MentorlukDurumu;
  retGerekcesi: string;
  /**
   * Karar veren, başvurunun sahibi mi? (11 Ağustos 2026)
   *
   * Belirtilmezse `false` sayılır — eksik veriyle kapıyı kapatmak yerine
   * açmıyoruz; çağıranın bu bilgiyi vermesi zaten tek satır.
   */
  kendiBasvurusuMu?: boolean;
};

export type KararSonucu =
  | { olurMu: true; retGerekcesi: string | null }
  | { olurMu: false; neden: string };

/**
 * Onay/ret kararının geçerliliği.
 *
 * Yalnızca BEKLEYEN bir kayıt karara bağlanabilir: onaylanmış bir mentörlüğü
 * ikinci kez onaylamak sessizce karar tarihini kaydırır ve "ne zaman onaylandı"
 * sorusunun cevabını bozar. Zaten karara bağlanmış bir kayıt için doğru işlem
 * mentörlüğü kaldırmaktır.
 *
 * RET GEREKÇESİ ZORUNLU: gerekçesiz ret, kişiye tekrar başvururken neyi
 * düzelteceğini söylemez. Aynı kısıt veritabanında da var — karar iki ayrı
 * ekrandan verilebiliyor ve uygulama katmanındaki kontrol birinde unutulabilir.
 */
export function mentorlukKarariGecerliMi(girdi: KararGirdisi): KararSonucu {
  /*
   * KİMSE KENDİ BAŞVURUSUNU KARARA BAĞLAYAMAZ (11 Ağustos 2026 · istek: "il
   * koordinatörü mentörlüğe başvurunca kendi kendini onaylıyor").
   *
   * Onay yetkisi merkeze alındı ama kural orada bitmiyor: proje yöneticisi de
   * mentör olabiliyor ve tek başına kalırsa aynı durum onda tekrarlanırdı.
   * Yetki listesi "kim onaylayabilir" sorusunu cevaplıyor, bu koşul "kendi
   * işini onaylayamaz" ilkesini — ikisi ayrı sorular ve ikisi de gerekli
   * (aynı ayrım etkinlik onayında da var).
   *
   * Proje yöneticiliği ekip işidir (üç kişi), yani karar sahipsiz kalmıyor.
   */
  if (girdi.kendiBasvurusuMu) {
    return {
      olurMu: false,
      neden:
        "Kendi mentörlük başvurunuzu karara bağlayamazsınız; kararı bir proje yöneticisi meslektaşınız versin.",
    };
  }

  if (girdi.mevcutDurum !== "BEKLIYOR") {
    return {
      olurMu: false,
      neden: `Bu başvuru zaten karara bağlanmış (${MENTORLUK_DURUM_ETIKETLERI[girdi.mevcutDurum].toLowerCase()}).`,
    };
  }

  if (girdi.yeniDurum !== "ONAYLANDI" && girdi.yeniDurum !== "REDDEDILDI") {
    return { olurMu: false, neden: "Geçersiz karar." };
  }

  const gerekce = girdi.retGerekcesi.trim();
  if (girdi.yeniDurum === "REDDEDILDI" && !gerekce) {
    return { olurMu: false, neden: "Ret gerekçesi zorunludur." };
  }

  return {
    olurMu: true,
    retGerekcesi: girdi.yeniDurum === "REDDEDILDI" ? gerekce : null,
  };
}

/**
 * Mentörün kapsadığı konuların ekranda yazılışı.
 *
 * Grup adları ve serbest konular TEK LİSTEDE birleştirilir: öğrenci için ikisi
 * de "bu kişi neyi biliyor" sorusunun cevabıdır, hangisinin sabit listeden
 * hangisinin serbest metinden geldiği onu ilgilendirmiyor.
 */
export function mentorKapsamiYaz(
  grupAdlari: readonly string[],
  konular: string | null,
): string {
  const parcalar = [...grupAdlari];
  const serbest = konular?.trim();
  if (serbest) parcalar.push(serbest);
  return parcalar.join(" · ");
}
