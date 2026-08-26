/**
 * Katılım ve teşekkür belgesi kuralları.
 *
 * Belge VERİTABANINDA TUTULMAZ: her istekte faaliyet ve katılım kayıtlarından
 * üretilir. Ayrı bir tablo, aynı bilgiyi ikinci kez saklayıp güncel tutma
 * zorunluluğu doğururdu — faaliyetin adı düzeltildiğinde basılmış belgeler
 * eski adı göstermeye devam ederdi. Kim ne zaman belge ürettiği erişim
 * kaydına yazılır; izlenebilirlik oradan sağlanır.
 *
 * Saf tutulur: veritabanına ve React'e bakmaz, birim testle kapsanır.
 */

export const BELGE_TURLERI = ["KATILIM", "TESEKKUR"] as const;
export type BelgeTuru = (typeof BELGE_TURLERI)[number];

export const BELGE_TURU_ETIKETLERI: Record<BelgeTuru, string> = {
  KATILIM: "Katılım Belgesi",
  TESEKKUR: "Teşekkür Belgesi",
};

export function belgeTuruMu(deger: string): deger is BelgeTuru {
  return (BELGE_TURLERI as readonly string[]).includes(deger);
}

export interface BelgeGirdisi {
  tur: BelgeTuru;
  adSoyad: string;
  faaliyetAdi: string;
  /** Belgede yazılacak tarih; faaliyetin tarihi kullanılır, üretim tarihi değil. */
  tarihMetni: string;
  /** Serbest metin girildiyse gövde onunla değiştirilir. */
  ozelMetin?: string | null;
}

export interface BelgeMetni {
  baslik: string;
  adSoyad: string;
  govde: string;
}

/**
 * Belgenin değişmeyen giriş cümlesi.
 *
 * İstek (26 Ağustos 2026): belge yalnızca etkinliğin adını söylemesin, hangi
 * program kapsamında yapıldığını da söylesin. Kurumun ve programın adı
 * ETKİNLİKTEN GELMEZ — her belgede aynıdır — bu yüzden veri değil sabit.
 */
const KOORDINASYON_CUMLESI =
  "Millî Eğitim Bakanlığı Yenilik ve Eğitim Teknolojileri Genel Müdürlüğü " +
  "koordinesinde yürütülen GençTek: Akran Öğrenme Modeli ve Genç Bilişim " +
  "Ekosistemi çalışmaları kapsamında,";

/**
 * Belge metnini üretir.
 *
 * TARİH ARTIK GÖVDENİN İÇİNDE (26 Ağustos 2026 · istek: "sol altta da tarih
 * var, tarihi oradan kaldıralım"). Eskiden gövde yalnızca etkinliğin adını
 * söylüyor, tarih sayfanın sol alt köşesinde tek başına duruyordu; okuyan
 * kişinin o tarihin neyin tarihi olduğunu (etkinlik mi, belgenin basıldığı gün
 * mü) anlaması mümkün değildi. Cümlenin içinde "… tarihinde gerçekleştirilen"
 * olarak yeri belli.
 *
 * İki tür AYRI bitiş cümlesi kurar ve bu bilinçli: katılım belgesi yalnızca
 * KATILIMA teşekkür eder, teşekkür belgesi katılımın yanında DESTEĞİ de anar
 * (26 Ağustos 2026 · istek: "bu katılım belgesi için, teşekkür belgesi başka
 * yazı gelecek"). Aynı cümleyi paylaşsalardı teşekkür belgesi katılım
 * belgesinin süslü hâline dönerdi.
 *
 * Özel metin verildiğinde gövde tamamen onunla değişir: teşekkür belgesi
 * çoğu zaman katılımcıya değil, konuşmacıya ya da destek veren kuruma
 * yazılır ve kalıp cümle oraya uymaz.
 */
export function belgeMetniUret(girdi: BelgeGirdisi): BelgeMetni {
  const ozel = girdi.ozelMetin?.trim();

  const kapanis =
    girdi.tur === "KATILIM"
      ? "katılımınızdan dolayı teşekkür ederiz."
      : "katılımınız ve desteğiniz için teşekkür ederiz.";

  const govde = ozel
    ? ozel
    : `${KOORDINASYON_CUMLESI} ${girdi.tarihMetni} tarihinde gerçekleştirilen ` +
      `${girdi.faaliyetAdi} etkinliğine ${kapanis}`;

  return {
    baslik: BELGE_TURU_ETIKETLERI[girdi.tur],
    adSoyad: girdi.adSoyad.trim(),
    govde,
  };
}

/**
 * Belgeyi imzalayacak makamın UNVANI, etkinliğin kapsamından türetilir.
 *
 * İstek: "Okul içinde ise okul müdürü, il bazında ise il millî eğitim müdürü
 * imzalı". Unvan kurallıdır ve kapsamdan okunur; İSİM ise okunmaz — sistemde
 * okul müdürünün ya da il millî eğitim müdürünün adı TUTULMUYOR ve e-Okul'dan
 * da gelmiyor. Bu yüzden ad belge üretilirken elle yazılır (→ S25).
 *
 * ULUSAL kapsamda bir karşılık YOK: istekte belirtilmedi ve uydurmak, resmî bir
 * belgeye olmayan bir makam yazmak olurdu. O kapsamda etkinliği düzenleyen
 * birim kullanılır ve unvan alanı yine elle değiştirilebilir.
 */
export function imzaUnvaniOner(kapsam: string): string | null {
  if (kapsam === "OKUL") return "Okul Müdürü";
  if (kapsam === "IL") return "İl Millî Eğitim Müdürü";
  return null;
}

export type AliciKarari =
  | { olurMu: true; adSoyad: string }
  | { olurMu: false; neden: string };

const AD_MAKS = 120;
const IMZA_UNVAN_MAKS = 120;

export type ImzaKarari =
  | { olurMu: true; adSoyad: string; unvan: string }
  | { olurMu: false; neden: string };

/**
 * İmza bloğunu doğrular.
 *
 * ESKİDEN OTURUM KİŞİSİNDEN GELİYORDU: belgeyi kim ürettiyse imza ona
 * yazılıyordu. Bu yanlıştı — belgeyi hazırlayan öğretmen ile imzalayan makam
 * aynı kişi değil; katılım belgesini okul müdürü imzalar, il etkinliğinde il
 * millî eğitim müdürü. Ad artık her belge üretiminde elle giriliyor.
 *
 * Ad ZORUNLU: imzasız bir katılım belgesi resmî olarak işe yaramaz ve boş
 * bırakılmasına izin vermek, farkına varılmadan imzasız belge dağıtılmasına
 * yol açardı. Unvan boş bırakılabilir — kapsamdan gelen öneri kullanılır.
 */
export function imzaBilgisiniCoz(girdi: {
  adSoyad: string;
  unvan: string;
  varsayilanUnvan: string;
}): ImzaKarari {
  const adSoyad = girdi.adSoyad.trim().replace(/\s+/g, " ");
  if (!adSoyad) {
    return {
      olurMu: false,
      neden: "Belgeyi imzalayacak kişinin adı yazılmalıdır.",
    };
  }
  if (adSoyad.length > AD_MAKS) {
    return {
      olurMu: false,
      neden: `İmza sahibinin adı en fazla ${AD_MAKS} karakter olabilir.`,
    };
  }

  const unvan = girdi.unvan.trim().replace(/\s+/g, " ") || girdi.varsayilanUnvan;
  if (unvan.length > IMZA_UNVAN_MAKS) {
    return {
      olurMu: false,
      neden: `Unvan en fazla ${IMZA_UNVAN_MAKS} karakter olabilir.`,
    };
  }

  return { olurMu: true, adSoyad, unvan };
}

/**
 * Belge alıcısının adını doğrular.
 *
 * Alıcı sistemdeki bir katılımcı OLMAK ZORUNDA DEĞİL: teşekkür belgesi çoğu
 * zaman dışarıdan gelen bir konuşmacıya ya da destek veren kuruma yazılır ve
 * o kişinin sistemde kaydı olmaz. Bu yüzden ad serbest metin olarak da
 * girilebiliyor.
 */
export function aliciAdiniCoz(ham: string): AliciKarari {
  const adSoyad = ham.trim().replace(/\s+/g, " ");

  if (!adSoyad) {
    return { olurMu: false, neden: "Belgenin kime verileceği yazılmalıdır." };
  }
  if (adSoyad.length > AD_MAKS) {
    return {
      olurMu: false,
      neden: `Ad en fazla ${AD_MAKS} karakter olabilir.`,
    };
  }
  return { olurMu: true, adSoyad };
}
