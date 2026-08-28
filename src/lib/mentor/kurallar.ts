import type { MentorlukDurumu, OnayDurumu } from "@/generated/prisma/enums";

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

export const DANISMAN_KALDIRMA_GEREKCESI_ASGARI = 10;

export type DanismanKararGirdisi = {
  /** Öğrencinin bugünkü mentörlük kaydı; kayıt yoksa `null`. */
  mevcutDurum: MentorlukDurumu | null;
  yeniDurum: "ONAYLANDI" | "REDDEDILDI";
  /** Yalnızca kaldırmada okunur. */
  gerekce: string;
  /**
   * Karara bağlanmamış bir KALDIRMA TALEBİ duruyor mu? (28 Ağustos 2026)
   *
   * Belirtilmezse `false` sayılır: eksik veriyle kapıyı kapatmak yerine
   * açmıyoruz (emsali `kendiBasvurusuMu`).
   *
   * Bekleyen talep HER İKİ kararı da durdurur, yalnızca kaldırmayı değil:
   * "Mentör yap" düğmesi açık kalsaydı, kaldırılması istenen bir mentörlük
   * ikinci bir tıklamayla yeniden onaylanır ve talep, artık geçerli olmayan
   * bir gerekçeyle kuyrukta beklemeye devam ederdi.
   */
  bekleyenKaldirmaTalebiVarMi?: boolean;
};

export type DanismanKararSonucu =
  | { olurMu: true; retGerekcesi: string | null }
  | { olurMu: false; neden: string };

/**
 * ÖĞRENCİ LİSTESİNDEN VERİLEN MENTÖRLÜK KARARI (26 Ağustos 2026 · istek:
 * "danışman öğretmen kendi öğrencilerinden mentör ise o da görünsün … eğer
 * öğrenci başvurduysa buradan onaylasın, mentör yap / mentörlüğü kaldır butonu
 * olsun").
 *
 * ADI 27 Ağustos 2026'da `ogrenciMentorlukKarariGecerliMi`'den değişti: karar
 * artık danışmanın tekelinde değil, il koordinatörü de veriyor (bkz.
 * izinler.ts · ogrenciMentorluguneKararVerebilirMi). Kural KİMİN karar
 * verdiğine hiç bakmıyor — "hangi kayda, hangi gerekçeyle" sorusunu
 * cevaplıyor — ama adında bir rol taşıdığı sürece o rolün kuralı sanılırdı.
 *
 * ---------------------------------------------------------------------------
 * NİYE `mentorlukKarariGecerliMi` YETMEDİ
 * ---------------------------------------------------------------------------
 * O kural MERKEZİN KUYRUĞUNUN kuralı ve iki yerinden bu ekrana uymuyor:
 *
 *   · yalnızca `BEKLIYOR` kaydı karara bağlıyor — buradaki "Mentör yap"
 *     düğmesi ise daha önce reddedilmiş ya da bırakılmış bir öğrenciyi de
 *     yeniden mentör yapabilmeli; yoksa bir kez reddedilen öğrenci için ekran
 *     kalıcı bir çıkmaz olurdu,
 *   · "mentörlüğü kaldır" diye bir işlem tanımıyor: merkezin kuyruğunda karar
 *     BEKLEYEN bir başvuruya veriliyor, burada ise ZATEN ONAYLI bir
 *     mentörlüğün geri alınması söz konusu.
 *
 * İkisi ayrı kural olarak duruyor ki merkezin kuyruğunu gevşetmek pahasına tek
 * bir kural yazılmasın: orada "onaylanmış kayıt ikinci kez onaylanamaz" kısıtı
 * karar tarihinin doğruluğunu koruyor ve yerinde kalmalı.
 *
 * ---------------------------------------------------------------------------
 * BAŞVURUSU OLMAYAN ÖĞRENCİ MENTÖR YAPILAMAZ
 * ---------------------------------------------------------------------------
 * `mevcutDurum === null` reddediliyor. Mentörlük kaydı yalnızca sayı değil,
 * ÇALIŞMA GRUBU ve konu taşır (bkz. mentorlukKabulEdilirMi: en az bir grup
 * zorunlu) ve panodaki ilan eşleştirmesi o gruplar üzerinden yürüyor. Boş bir
 * kayıtla açılan mentörlük, havuzda uzmanlık satırı boş bir kart ve hiçbir
 * ilana düşmeyen bir mentör demekti.
 *
 * KALDIRMADA GEREKÇE ZORUNLU ve en az on karakter — aynı ekrandaki
 * "Danışmanlığı bırak" formuyla bilerek aynı ölçü. Gerekçe öğrenciye bildirim
 * metninde gidiyor; gerekçesiz kaldırma, öğrenciye neyi düzeltip yeniden
 * başvuracağını söylemez (emsali: mentorlukKarariGecerliMi · ret gerekçesi).
 */
export function ogrenciMentorlukKarariGecerliMi(
  girdi: DanismanKararGirdisi,
): DanismanKararSonucu {
  if (girdi.bekleyenKaldirmaTalebiVarMi) {
    return {
      olurMu: false,
      neden:
        "Bu öğrencinin mentörlüğü için karara bağlanmamış bir kaldırma talebi var. Yeni bir karar vermeden önce bekleyen talep sonuçlanmalı.",
    };
  }

  if (girdi.mevcutDurum === null) {
    return {
      olurMu: false,
      neden:
        "Öğrenci mentörlük başvurusu yapmamış. Mentörlük, çalışma grubu ve konu seçimiyle başvurulan bir kayıttır; öğrenci Talepler ekranından başvurduğunda buradan onaylayabilirsiniz.",
    };
  }

  if (girdi.yeniDurum === "ONAYLANDI") {
    if (girdi.mevcutDurum === "ONAYLANDI") {
      return { olurMu: false, neden: "Öğrenci zaten onaylı mentör." };
    }
    return { olurMu: true, retGerekcesi: null };
  }

  if (girdi.mevcutDurum !== "ONAYLANDI") {
    return {
      olurMu: false,
      neden: `Kaldırılacak bir mentörlük yok (${MENTORLUK_DURUM_ETIKETLERI[girdi.mevcutDurum].toLowerCase()}).`,
    };
  }

  const gerekce = girdi.gerekce.trim();
  if (gerekce.length < DANISMAN_KALDIRMA_GEREKCESI_ASGARI) {
    return {
      olurMu: false,
      neden: `Mentörlüğü kaldırma gerekçesi en az ${DANISMAN_KALDIRMA_GEREKCESI_ASGARI} karakter olmalıdır.`,
    };
  }

  return { olurMu: true, retGerekcesi: gerekce };
}

// ---------------------------------------------------------------------------
// MENTÖRLÜĞÜN KALDIRILMASI — TALEP VE ONAY (28 Ağustos 2026)
// ---------------------------------------------------------------------------
/**
 * İSTEK: "Mentör olarak atanan öğrencinin danışman öğretmeni, il koordinatörü
 * ve proje yöneticisi iptal edebilsin, hiyerarşi olsun: öğretmeninkini
 * koordinatör ve proje yöneticisi, koordinatörünkini de proje yöneticisi
 * onaylasın, proje yöneticisine onay yok".
 *
 * KURAL KATMANI KİMİN İSTEDİĞİNE BAKMAZ: hangi düzeyin hangi düzeyi
 * onayladığı bir YETKİ sorusudur ve tek yerde durur (izinler.ts ·
 * ogrenciMentorluguKaldirmaDuzeyi · mentorlukKaldirmaTalebiniOnaylayabilirMi).
 * Buradaki iş "hangi kayda, hangi gerekçeyle" — aynı ayrım
 * `ogrenciMentorlukKarariGecerliMi` ile yetki fonksiyonları arasında da var.
 *
 * ÖĞRENCİ TALEP SÜRESİNCE MENTÖR KALIR. Bunun bedeli açık: kaldırılması
 * istenen bir mentörlük, karar çıkana kadar havuzda görünmeye devam ediyor.
 * Alternatifi — talebi açar açmaz askıya almak — onay mercii talebi
 * reddettiğinde öğrenciyi hiç yaşanmamış bir cezadan geçirmiş olurdu; üstelik
 * "askıda" diye üçüncü bir mentörlük hâli, `MentorlukDurumu`nun dört değerinin
 * her okunduğu yeri ilgilendirirdi.
 */

/** Talebin geçerliliği için gerekçenin en az uzunluğu — kaldırmayla aynı ölçü. */
export const KALDIRMA_TALEBI_GEREKCESI_ASGARI =
  DANISMAN_KALDIRMA_GEREKCESI_ASGARI;

/**
 * Talebin bugünkü hâli; hiç talep açılmamışsa `null`.
 *
 * `OnayDurumu` OLDUĞU GİBİ alınıyor, üç değere daraltılmıyor: çağıran her
 * seferinde veritabanı enum'unu daraltmak zorunda kalsaydı, o dönüşüm her
 * çağrı yerinde tekrarlanır ve biri `ONAY_GEREKMEZ`i "bekliyor" sayarak
 * daraltabilirdi. `ONAY_GEREKMEZ` bu tabloya HİÇ yazılmıyor (merkezin
 * kaldırması satır açmıyor); yazılsaydı da aşağıdaki kurallar onu "bekleyen
 * talep değil" sayar — doğru davranış.
 */
export type KaldirmaTalebiDurumu = OnayDurumu | null;

export type KaldirmaTalebiGirdisi = {
  /** Öğrencinin bugünkü mentörlük kaydı; kayıt yoksa `null`. */
  mevcutDurum: MentorlukDurumu | null;
  /** Daha önce açılmış talebin hâli. */
  talepDurumu: KaldirmaTalebiDurumu;
  gerekce: string;
};

export type KaldirmaTalebiSonucu =
  | { olurMu: true; gerekce: string }
  | { olurMu: false; neden: string };

/**
 * Kaldırma TALEBİ açılabilir mi?
 *
 * Yalnızca ONAYLI bir mentörlük için: kaldırılacak bir şey yoksa talebin de
 * karara bağlanacak bir şeyi olmaz.
 *
 * REDDEDİLMİŞ YA DA ONAYLANMIŞ ESKİ TALEP ENGEL DEĞİLDİR. Reddedilen talep
 * "bu gerekçe yeterli değil" demektir, "bir daha istenemez" değil; koşullar
 * değişebilir. Onaylanmış talep ise zaten mentörlüğü kaldırmıştır — öğrenci
 * yeniden mentör yapıldıysa yeni bir talep açılabilmelidir. Engel olan tek hâl
 * BEKLEYEN talep: ikincisi açılsaydı aynı satır üzerine yazılır ve ilk
 * talebin gerekçesi, onay mercii onu okumadan kaybolurdu.
 */
export function mentorlukKaldirmaTalebiGecerliMi(
  girdi: KaldirmaTalebiGirdisi,
): KaldirmaTalebiSonucu {
  if (girdi.talepDurumu === "BEKLIYOR") {
    return {
      olurMu: false,
      neden:
        "Bu öğrencinin mentörlüğü için zaten karara bağlanmamış bir kaldırma talebi var.",
    };
  }

  if (girdi.mevcutDurum !== "ONAYLANDI") {
    return {
      olurMu: false,
      neden:
        girdi.mevcutDurum === null
          ? "Öğrencinin mentörlük kaydı yok; kaldırılacak bir mentörlük bulunmuyor."
          : `Kaldırılacak bir mentörlük yok (${MENTORLUK_DURUM_ETIKETLERI[girdi.mevcutDurum].toLowerCase()}).`,
    };
  }

  const gerekce = girdi.gerekce.trim();
  if (gerekce.length < KALDIRMA_TALEBI_GEREKCESI_ASGARI) {
    return {
      olurMu: false,
      neden: `Mentörlüğü kaldırma gerekçesi en az ${KALDIRMA_TALEBI_GEREKCESI_ASGARI} karakter olmalıdır.`,
    };
  }

  return { olurMu: true, gerekce };
}

export type KaldirmaKarariGirdisi = {
  talepDurumu: KaldirmaTalebiDurumu;
  yeniDurum: "ONAYLANDI" | "REDDEDILDI";
  /** Yalnızca rette okunur. */
  retGerekcesi: string;
  /** Öğrencinin mentörlüğü hâlâ onaylı mı? */
  mentorlukDurumu: MentorlukDurumu | null;
};

export type KaldirmaKarariSonucu =
  | { olurMu: true; retGerekcesi: string | null }
  | { olurMu: false; neden: string };

/**
 * Bekleyen talebin onay/ret kararı geçerli mi?
 *
 * YALNIZCA BEKLEYEN TALEP karara bağlanır — emsali `mentorlukKarariGecerliMi`:
 * ikinci kez karar vermek, karar tarihini sessizce kaydırır ve "ne zaman
 * kaldırıldı" sorusunun cevabını bozar.
 *
 * MENTÖRLÜK ARADA DÜŞMÜŞ OLABİLİR: kişi kendi bırakmış (BIRAKILDI) ya da
 * merkez doğrudan kaldırmış olabilir. O hâlde onaylanacak bir şey kalmadı ve
 * talebi "onaylandı" diye kapatmak, kaldırma kararını kararı vermeyen kişinin
 * üstüne yazardı. Talep bu durumda REDDEDİLEREK kapatılabilir — böylece
 * kuyrukta sonsuza kadar duran bir satır kalmıyor.
 *
 * RET GEREKÇESİ ZORUNLU: gerekçesiz ret, talebi açan öğretmene neyi
 * eksik bıraktığını söylemez (aynı ölçü mentörlük başvurusunun rettinde de
 * var). Onayda gerekçe İSTENMEZ — kaldırmanın gerekçesini talebin kendisi
 * taşıyor ve öğrenciye giden bildirim o metni yazıyor.
 */
export function mentorlukKaldirmaKarariGecerliMi(
  girdi: KaldirmaKarariGirdisi,
): KaldirmaKarariSonucu {
  if (girdi.talepDurumu !== "BEKLIYOR") {
    return {
      olurMu: false,
      neden:
        girdi.talepDurumu === null
          ? "Karara bağlanacak bir kaldırma talebi yok."
          : "Bu talep zaten karara bağlanmış.",
    };
  }

  if (girdi.yeniDurum === "ONAYLANDI" && girdi.mentorlukDurumu !== "ONAYLANDI") {
    return {
      olurMu: false,
      neden:
        "Öğrencinin mentörlüğü bu talep beklerken zaten sona ermiş; talebi reddederek kapatabilirsiniz.",
    };
  }

  if (girdi.yeniDurum === "REDDEDILDI") {
    const gerekce = girdi.retGerekcesi.trim();
    if (!gerekce) {
      return { olurMu: false, neden: "Ret gerekçesi zorunludur." };
    }
    return { olurMu: true, retGerekcesi: gerekce };
  }

  return { olurMu: true, retGerekcesi: null };
}

/** Talebi açanın düzeyinin ekranda ve bildirimde yazılışı. */
export const KALDIRMA_DUZEYI_ETIKETLERI: Record<
  "DANISMAN" | "IL_KOORDINATOR",
  string
> = {
  DANISMAN: "Danışman öğretmen",
  IL_KOORDINATOR: "İl koordinatörü",
};

/**
 * Talebi kimin onaylayacağının ekranda yazılışı — talebi açan kişi, kararın
 * kimde beklediğini görebilmeli.
 */
export function kaldirmaTalebiOnayMercii(
  duzey: "DANISMAN" | "IL_KOORDINATOR",
): string {
  return duzey === "DANISMAN"
    ? "il koordinatörü ya da proje yöneticisi"
    : "proje yöneticisi";
}
