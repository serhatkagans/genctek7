# Ek E — Saf İş Kuralları

> **Üretilmiş dosya.** Elle düzenlemeyin; `npm run sartname:uret` ile yeniden oluşturulur.
> Kaynak kod ile şartname arasında çelişki olursa **kaynak kod** geçerlidir.

Veritabanından bağımsız, saf fonksiyon olarak yazılmış alan kuralları — **36 modül**. 936 Jest testi bu dosyalara yazılmıştır: imzalar korunursa test paketi de birebir yeniden üretilebilir.

Bu liste elle tutulmaz; `tests/` içindeki `@/lib/...` içe aktarımları taranarak üretilir.

---

### `src/lib/akis/kurallar.ts`

```ts
/**
 * Akış kuralları — gönderi, yorum ve "Hakkımda".
 *
 * TEK CÜMLELİK TASARIM İLKESİ (iletisim/kurallar.ts ile aynı): gizli kanal
 * yoktur. Gönderi ve yorum, yazışmadan da açıktır — ekosistemdeki HERKES
 * okur. Ekranda kalıcı olarak yazılı; bir yayın alanının okunmadığı izlenimi
 * verilmiyor.
 *
 * GÖNDERİ, YAZIŞMA DEĞİLDİR: yazışma iki kişi arasındadır ve danışman onayı
 * ister; gönderi yayındır ve onay istemez. Emsali panodaki ilandır (model
 * Talep) — öğrenci oraya da onaysız yazıyor ve ilan bütün ekosisteme görünür.
 *
 * Saf tutulur: veritabanına ve oturuma bakmaz, birim testle kapsanır.
 */

export const GONDERI_MAKS = 3000;
export const YORUM_MAKS = 1000;
export const HAKKINDA_MAKS = 1500;

export type MetinKarari =
  | { olurMu: true; icerik: string }
  | { olurMu: false; neden: string };

function metniCoz(
  metin: string,
  maks: number,
  bosNeden: string,
  adi: string,
): MetinKarari {
  const icerik = metin.trim();
  if (!icerik) return { olurMu: false, neden: bosNeden };
  if (icerik.length > maks) {
    return { olurMu: false, neden: `${adi} en fazla ${maks} karakter olabilir.` };
  }
  return { olurMu: true, icerik };
}

export function gonderiMetniniCoz(metin: string): MetinKarari {
  return metniCoz(metin, GONDERI_MAKS, "Gönderi boş olamaz.", "Gönderi");
}

export function yorumMetniniCoz(metin: string): MetinKarari {
  return metniCoz(metin, YORUM_MAKS, "Yorum boş olamaz.", "Yorum");
}

/**
 * "Hakkımda" metni — diğer ikisinden farklı olarak BOŞ BIRAKILABİLİR.
 *
 * Boşaltmak bir silme işlemidir ve geçerlidir: kişi kendini tanıtmak
 * zorunda değil. Bu yüzden `null` dönebiliyor.
 */
export type HakkindaKarari =
  | { olurMu: true; icerik: string | null }
  | { olurMu: false; neden: string };

export function hakkindaMetniniCoz(metin: string): HakkindaKarari {
  const icerik = metin.trim();
  if (!icerik) return { olurMu: true, icerik: null };
  if (icerik.length > HAKKINDA_MAKS) {
    return {
      olurMu: false,
      neden: `Hakkımda metni en fazla ${HAKKINDA_MAKS} karakter olabilir.`,
    };
  }
  return { olurMu: true, icerik };
}

/**
 * Gizlenmiş içeriğin METNİ kime açılır?
 *
 * model Mesaj'daki kuralın aynısı: gizlenen içerik SİLİNMEZ, gözetim yetkisi
 * olana içeriğiyle görünmeye devam eder. Şikâyet incelemesinde en çok ihtiyaç
 * duyulan kayıt, gizlenmiş olandır.
 *
 * YAZARIN KENDİSİ DE GÖREMEZ: gizleme bir moderasyon kararıdır, yazara
 * "neyin gizlendiğini" göstermek onu yeniden yayınlamaya davet ederdi. Kendi
 * gizlediği gönderi de buna dâhil — geri alma yoktur.
 */
export function gizliIcerikGorunurMu(girdi: {
  gizlendiMi: boolean;
  gozetimYetkisiVarMi: boolean;
}): boolean {
  return !girdi.gizlendiMi || girdi.gozetimYetkisiVarMi;
}

/**
 * Bir gönderiyi/yorumu kim gizleyebilir?
 *
 * İki taraf: gözetim yetkisi olanlar (danışman, il koordinatörü, proje
 * yöneticisi) ve İÇERİĞİN YAZARI. Yazarın kendi paylaşımını kaldırabilmesi
 * gerekir — aksi halde yanlışlıkla yazdığı bir şey için öğretmenine başvurmak
 * zorunda kalırdı ve bu, paylaşmayı caydırırdı.
 *
 * Yazarın gizlemesi de İZ BIRAKIR (gizleyen_kullanici_id + tarih): "kendi
 * sildi" ile "yetkili kaldırdı" ayrımı denetimde görünür kalmalı.
 */
export function gizleyebilirMi(girdi: {
  kullaniciId: number;
  yazanKullaniciId: number;
  gozetimYetkisiVarMi: boolean;
  zatenGizliMi: boolean;
}): { olurMu: boolean; neden?: string } {
  if (girdi.zatenGizliMi) {
    return { olurMu: false, neden: "Bu içerik zaten gizlenmiş." };
  }
  if (girdi.gozetimYetkisiVarMi) return { olurMu: true };
  if (girdi.kullaniciId === girdi.yazanKullaniciId) return { olurMu: true };
  return {
    olurMu: false,
    neden: "Yalnızca içeriğin yazarı ya da gözetim yetkisi olanlar gizleyebilir.",
  };
}

/**
 * Akış ekranında kalıcı olarak gösterilecek uyarı.
 *
 * GIZLILIK_UYARISI'ndan (iletisim/kurallar.ts) AYRI bir cümle, çünkü ayrı bir
 * gerçeği söylüyor: yazışma "yetkililer okur" der, gönderi "herkes okur" der.
 * İkisini tek cümlede toplamak, akışın yazışmadan daha açık olduğunu gizlerdi.
 */
export const AKIS_UYARISI =
  "Buraya yazdıklarınızı GençTek'teki herkes görür. Kişisel bilgilerinizi (telefon, adres, okul dışı hesaplar) paylaşmayın; uygunsuz içerik danışman öğretmeniniz ve koordinatörünüz tarafından kaldırılır.";
```

### `src/lib/basvuru/il-disi.ts`

```ts
import type { BasvuruDurumu, OnayDurumu } from "@/generated/prisma/enums";

/**
 * İl dışı başvurunun çift onay kuralları — analiz isteği Bölüm 4.
 *
 * AKIŞ İKİ ADIMDIR ama sisteme YALNIZCA BİRİ eklendi:
 *
 *   1. (YENİ) Öğrencinin KENDİ ilinin koordinatörü, öğrencisini başka bir ile
 *      göndermeye onay verir.
 *   2. (MEVCUT) Faaliyeti düzenleyen değerlendirir (seçildi / yedek / reddedildi).
 *      Bu zaten etkinliğin yapıldığı ilin kararıdır; ayrı bir sütun açmak aynı
 *      kararı iki yerde tutup senkron tutma zorunluluğu doğururdu.
 *
 * Saf tutulur: veritabanına ve oturuma bakmaz, birim testle kapsanır.
 */

/**
 * Başvuru il dışına mı gidiyor?
 *
 * Karşılaştırma faaliyetin BAĞLI OLDUĞU il ile yapılır; bu, okul içi faaliyette
 * okulun ili, ulusal faaliyette düzenleyenin ilidir (bkz. faaliyetKapsamiCikar).
 * Kapsam alanlarına doğrudan bakmak yanlış sonuç verirdi: ulusal faaliyetin
 * `ilKodu` alanı boştur ama faaliyetin bir ili vardır.
 *
 * İkisinden biri bilinmiyorsa onay İSTENMEZ. Bilinmeyen bir ili "farklı" sayıp
 * başvuruyu askıya almak, kimsenin çözemeyeceği bir bekleme üretirdi.
 */
export function ilDisiBasvuruMu(
  katilimciIlKodu: string | null,
  faaliyetIlKodu: string | null,
): boolean {
  if (katilimciIlKodu === null || faaliyetIlKodu === null) return false;
  return katilimciIlKodu !== faaliyetIlKodu;
}

/** Yeni başvurunun kaynak il onay durumu. */
export function baslangicOnayDurumu(
  katilimciIlKodu: string | null,
  faaliyetIlKodu: string | null,
): OnayDurumu {
  return ilDisiBasvuruMu(katilimciIlKodu, faaliyetIlKodu)
    ? "BEKLIYOR"
    : "ONAY_GEREKMEZ";
}

/**
 * Faaliyeti düzenleyen bu başvuruyu DEĞERLENDİREBİLİR Mİ?
 *
 * Kaynak ilin kararı beklenirken değerlendirilemez: sıra bozulursa öğrenci
 * kendi ili izin vermeden başka bir ilin etkinliğine seçilmiş olur. Kaynak il
 * REDDETTİYSE de değerlendirilemez — başvuru orada bitmiştir.
 */
export function degerlendirmeyeHazirMi(kaynakIlOnayDurumu: OnayDurumu): boolean {
  return kaynakIlOnayDurumu === "ONAY_GEREKMEZ" || kaynakIlOnayDurumu === "ONAYLANDI";
}

/**
 * Kaynak ilin koordinatörü bu başvuruya karar VEREBİLİR Mİ?
 *
 * Yalnızca kararı bekleyen ve hâlâ canlı olan başvuruya. Geri çekilmiş ya da
 * faaliyeti iptal edilmiş bir başvuruyu onaylamak anlamsızdır ve ekranı
 * ölü kayıtlarla doldurur.
 */
export function kaynakIlKarariVerilebilirMi(girdi: {
  kaynakIlOnayDurumu: OnayDurumu;
  basvuruDurumu: BasvuruDurumu;
}): boolean {
  if (girdi.kaynakIlOnayDurumu !== "BEKLIYOR") return false;
  return girdi.basvuruDurumu === "BEKLIYOR";
}

export interface KaynakIlKarari {
  onaylandiMi: boolean;
  gerekce: string;
}

export type KaynakIlSonucu =
  | { olurMu: true; durum: OnayDurumu; gerekce: string | null }
  | { olurMu: false; neden: string };

/**
 * Kararı doğrular.
 *
 * RET GEREKÇESİ ZORUNLUDUR, onayınki değil: öğrenci başka bir ilin etkinliğine
 * gitmekten alıkonuyorsa sebebini öğrenmeli. Onayda söylenecek bir şey yoktur.
 */
export function kaynakIlKarariniCoz(karar: KaynakIlKarari): KaynakIlSonucu {
  const gerekce = karar.gerekce.trim();

  if (karar.onaylandiMi) {
    return { olurMu: true, durum: "ONAYLANDI", gerekce: gerekce || null };
  }

  if (!gerekce) {
    return {
      olurMu: false,
      neden:
        "Ret gerekçesi zorunludur: öğrenci başvurusunun neden ilinizden çıkamadığını görmeli.",
    };
  }
  return { olurMu: true, durum: "REDDEDILDI", gerekce };
}
```

### `src/lib/belge/kapi.ts`

```ts
/**
 * Belge üretiminin ÖN KOŞULLARI (12 Ağustos 2026).
 *
 * İki istek bu dosyada birleşiyor:
 *   · "etkinlik raporu yazılmadan belge oluştur seçeneği olmamalı"
 *   · "gelmeyen öğrenci katılmış görünmesin" — belge katılımın kanıtı olduğu
 *     için, gelmediği işaretlenmiş kişiye belge de basılamamalı.
 *
 * SAF TUTULUR: veritabanına ve React'e bakmaz. Kapı hem ekranlarda (düğmeyi
 * göstermemek için) hem belge üreten yollarda (adresi elle yazana karşı)
 * soruluyor; kural tek yerde durmazsa ikisi er geç ayrışır ve ekranda kapalı
 * görünen bir yol sunucuda açık kalır.
 */

/** Kapının cevabı: geçilir mi, geçilmiyorsa kullanıcıya ne denir. */
export interface KapiKarari {
  olurMu: boolean;
  /** Kullanıcıya gösterilecek gerekçe; `olurMu` true ise null. */
  neden: string | null;
}

const OLUR: KapiKarari = { olurMu: true, neden: null };

/**
 * Bu etkinlikten HERHANGİ bir belge üretilebilir mi?
 *
 * TEK KOŞUL RAPOR: etkinliğin bitmiş olması ayrıca sorulmuyor, çünkü rapor
 * zaten bitmeden yazılamıyor (bkz. faaliyetRaporuYazilabilirMi) — iki koşul
 * yazmak, aynı şeyi iki kez sormak olurdu.
 *
 * Raporun belgeden ÖNCE gelmesi bir sıralama tercihi değil, denetim
 * gerekçesidir: belge dağıtılmış ama etkinliğin ne olduğu hiçbir yerde yazılı
 * olmayan bir kayıt, sonradan kimsenin doğrulayamayacağı bir belge demektir.
 */
export function belgeKapisi(girdi: { raporVarMi: boolean }): KapiKarari {
  if (!girdi.raporVarMi) {
    return {
      olurMu: false,
      neden:
        "Belge üretilebilmesi için önce etkinlik raporunun yazılması gerekiyor.",
    };
  }
  return OLUR;
}

/**
 * Listedeki BU kişiye belge üretilebilir mi?
 *
 * Yoklama alınmamış (null) kişi de dışarıda kalır: "tamamen engellensin"
 * kararı (12 Ağustos 2026) yoklamayı belgenin ön koşulu yapıyor. Aksi hâlde
 * yoklama almayan bir etkinlikte toplu belge, eski davranışın aynısını üretir
 * ve gelmeyen öğrencinin profiline yine katılım düşerdi.
 *
 * "Listede olmayan biri için" formu (konuşmacı, destek veren kurum) bu kapıya
 * TABİ DEĞİLDİR: o kişinin başvurusu da yoklaması da yoktur ve belgesi kimsenin
 * profiline katılım düşürmez.
 */
export function katilimciBelgeKapisi(girdi: {
  katildiMi: boolean | null;
}): KapiKarari {
  if (girdi.katildiMi === true) return OLUR;

  return {
    olurMu: false,
    neden:
      girdi.katildiMi === false
        ? "Yoklamada gelmedi işaretlendiği için belge üretilemez."
        : "Yoklaması alınmadan belge üretilemez.",
  };
}

/** Etkinlik yoklaması alınabilir hâlde mi? */
export function yoklamaAlinabilirMi(girdi: {
  bittiMi: boolean;
  iptalMi: boolean;
}): KapiKarari {
  if (girdi.iptalMi) {
    return { olurMu: false, neden: "İptal edilen etkinlikte yoklama alınmaz." };
  }
  if (!girdi.bittiMi) {
    return {
      olurMu: false,
      neden: "Yoklama, etkinlik bittikten sonra alınır.",
    };
  }
  return OLUR;
}

/** Yoklama formundan gelen değerin karşılığı. */
export function yoklamaDegeriCoz(deger: string | null): boolean | null {
  if (deger === "evet") return true;
  if (deger === "hayir") return false;
  // Tanınmayan değer "işaretlenmedi" sayılır: yoklama formu üç seçenekli ve
  // boş seçenek geçerli bir cevap ("henüz bilmiyorum").
  return null;
}

/** Yoklama özetinin sayıları — ekranda ve rapor kartında aynı cümle kurulur. */
export interface YoklamaOzeti {
  toplam: number;
  gelen: number;
  gelmeyen: number;
  isaretlenmeyen: number;
  /** Listedeki herkes işaretlendi mi? */
  tamamlandiMi: boolean;
}

export function yoklamaOzeti(
  katilimcilar: readonly { katildiMi: boolean | null }[],
): YoklamaOzeti {
  const gelen = katilimcilar.filter((k) => k.katildiMi === true).length;
  const gelmeyen = katilimcilar.filter((k) => k.katildiMi === false).length;
  const isaretlenmeyen = katilimcilar.length - gelen - gelmeyen;

  return {
    toplam: katilimcilar.length,
    gelen,
    gelmeyen,
    isaretlenmeyen,
    // Boş listede yoklama "tamamlandı" sayılır: işaretlenecek kimse yok ve
    // aksi hâlde katılımcısız etkinlikte belge kapısı hiç açılmazdı
    // (konuşmacıya teşekkür belgesi tam da böyle bir etkinlikte üretiliyor).
    tamamlandiMi: isaretlenmeyen === 0,
  };
}
```

### `src/lib/belge/kurallar.ts`

```ts
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
  tarihMetni: string;
}

/**
 * Belge metnini üretir.
 *
 * İki tür AYRI cümle kurar ve bu bilinçli: katılım belgesi bir OLGUYU
 * belgeler ("katılmıştır"), teşekkür belgesi bir DEĞERLENDİRME taşır
 * ("katkılarından dolayı teşekkür ederiz"). Aynı metni paylaşsalardı teşekkür
 * belgesi katılım belgesinin süslü hâline dönerdi.
 *
 * Özel metin verildiğinde gövde tamamen onunla değişir: teşekkür belgesi
 * çoğu zaman katılımcıya değil, konuşmacıya ya da destek veren kuruma
 * yazılır ve kalıp cümle oraya uymaz.
 */
export function belgeMetniUret(girdi: BelgeGirdisi): BelgeMetni {
  const ozel = girdi.ozelMetin?.trim();

  const govde = ozel
    ? ozel
    : girdi.tur === "KATILIM"
      ? `${girdi.faaliyetAdi} adlı etkinliğe katılmıştır.`
      : `${girdi.faaliyetAdi} adlı etkinliğe verdiği katkılardan dolayı teşekkür ederiz.`;

  return {
    baslik: BELGE_TURU_ETIKETLERI[girdi.tur],
    adSoyad: girdi.adSoyad.trim(),
    govde,
    tarihMetni: girdi.tarihMetni,
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
```

### `src/lib/belge/toplu.ts`

```ts
/**
 * Toplu belge üretiminin alıcı seçimi.
 *
 * Bu kararlar sayfa bileşeninin İÇİNDE yaşayamaz: aralarında bir güvenlik
 * sınırı var. Adres çubuğuna elle katılımcı kimliği yazan biri, o kimlik bu
 * faaliyetin seçilmiş katılımcısına ait değilse belge bastıramamalı. Sayfanın
 * içinde kaldığı sürece bu kural ancak tarayıcıyla elle sınanabilirdi; saf
 * fonksiyon olarak birim testle kapsanıyor.
 *
 * Saf tutulur: veritabanına ve React'e bakmaz.
 */

/**
 * Tek yazdırma işleminde üretilebilecek azami belge sayısı.
 *
 * Sınırın nedeni tarayıcı: her belge tam sayfa bir arka plan görseli demek ve
 * yazdırma önizlemesi birkaç yüz sayfada donuyor. Sunucu tarafında bir maliyeti
 * yok, bu yüzden sınır veritabanı sorgusunda değil burada duruyor.
 */
export const AZAMI_BELGE_SAYISI = 200;

export interface TopluBelgeAdayi {
  katilimciId: number;
  adSoyad: string;
}

export type TopluSecimSonucu =
  | { durum: "hazir"; alicilar: TopluBelgeAdayi[] }
  | { durum: "katilimciYok" }
  | { durum: "eslesmeYok" }
  | { durum: "sinirAsildi"; istenen: number; azami: number };

/**
 * Adres parametresindeki katılımcı kimliklerini çözer.
 *
 * Next.js tekrarlı parametreyi tek seçimde `string`, çok seçimde `string[]`
 * olarak veriyor; ikisi de karşılanmak zorunda. Sayıya çevrilemeyen değerler
 * sessizce atılır — bozuk bir bağlantı yüzünden kullanıcıya hata göstermek
 * yerine o kimliği yok saymak doğru davranış, çünkü kesişim zaten aşağıda
 * yapılıyor ve geriye hiçbir şey kalmazsa bu ayrıca raporlanıyor.
 *
 * Parametre hiç verilmediğinde `null` döner: "hiçbiri seçilmedi" ile "tümü
 * kastedildi" ayrımı çağıranda kalır.
 */
export function katilimciIdleriniCoz(
  ham: string | string[] | undefined,
): number[] | null {
  if (ham === undefined) return null;

  const parcalar = Array.isArray(ham) ? ham : [ham];
  return parcalar
    .map((parca) => Number.parseInt(parca, 10))
    .filter((sayi) => Number.isInteger(sayi));
}

/**
 * Belge basılacak kişileri belirler.
 *
 * `adaylar` faaliyetin seçilmiş katılımcılarıdır; istenen kimlikler DAİMA
 * bu listeyle kesiştirilir. Hiç kimlik istenmediğinde listenin tamamı basılır —
 * ayrı bir "tümü" bayrağı yok, tek kural yeter.
 */
export function topluAlicilariSec(
  adaylar: TopluBelgeAdayi[],
  istenenIdler: number[] | null,
): TopluSecimSonucu {
  if (adaylar.length === 0) return { durum: "katilimciYok" };

  const secilenler =
    istenenIdler === null
      ? adaylar
      : adaylar.filter((aday) => istenenIdler.includes(aday.katilimciId));

  if (secilenler.length === 0) return { durum: "eslesmeYok" };

  if (secilenler.length > AZAMI_BELGE_SAYISI) {
    return {
      durum: "sinirAsildi",
      istenen: secilenler.length,
      azami: AZAMI_BELGE_SAYISI,
    };
  }

  return { durum: "hazir", alicilar: adSoyadaGoreSirala(secilenler) };
}

/**
 * Türkçe alfabeye göre sıralar.
 *
 * Sıra öngörülebilir olmak zorunda: basılan deste elle dağıtılırken yoklama
 * listesiyle eşleşmeli. Varsayılan sıralama "Işık"ı "İnci"den sonraya atardı;
 * Türkçede ı harfi i'den öncedir.
 */
function adSoyadaGoreSirala(alicilar: TopluBelgeAdayi[]): TopluBelgeAdayi[] {
  return [...alicilar].sort((a, b) => a.adSoyad.localeCompare(b.adSoyad, "tr"));
}
```

### `src/lib/danisman/karar.ts`

```ts
/**
 * Danışman atama ve devir kararları — references/domain-rules.md Bölüm 3.
 *
 * Bu dosya veritabanına gitmez. Kararlar saf fonksiyonlarda üretilir ki
 * birim testlerle eksiksiz kapsanabilsinler; veritabanı işlemlerini atama.ts
 * yürütür.
 *
 * Eşleştirme anahtarı KURUM KODUDUR. Boşta öğrenci kalamaz: danışman yoksa
 * öğrenci il koordinatörüne bağlanır.
 */

export interface DanismanAdayi {
  kullaniciId: number;
  ad: string;
  soyad: string;
  brans: string | null;
}

export type IlkAtamaKarari =
  /** Okulda birden fazla aday var: öğrenci kendi danışmanını seçer. */
  | { tur: "SECIM_GEREKLI"; adaylar: DanismanAdayi[] }
  /** Tek aday var: otomatik atanır. */
  | { tur: "OTOMATIK"; danismanKullaniciId: number }
  /** Okulda aday yok: il koordinatörüne bağlanır. */
  | { tur: "IL_KOORDINATORUNE"; danismanKullaniciId: number }
  /**
   * Ne aday ne il koordinatörü var. Öğrenci atanamaz; proje yöneticisine uyarı
   * düşer (kenar durum: "İl koordinatörü olmayan ilde okul danışmansız").
   */
  | { tur: "ATANAMADI"; neden: "IL_KOORDINATORU_YOK" };

/**
 * @param elleBirakildiMi Öğrencinin son danışmanlığı ELLE mi sonlandırıldı —
 *   öğretmen gerekçeli bıraktı ya da öğrenci kendisi bıraktı (11 Ağustos
 *   2026).
 *
 *   BÖYLE BİR ÖĞRENCİ OTOMATİK BAĞLANMAZ, seçim ekranına düşer. Aksi hâlde
 *   bırakma işlemi öğrencinin bir sonraki girişinde sessizce geri alınıyordu:
 *   okulda tek aday varsa "OTOMATIK" dalı çalışıp öğrenciyi az önce ayrıldığı
 *   öğretmene geri bağlıyor, hiç aday yoksa il koordinatörüne yazıyordu.
 *   Öğretmen tarafındaki bırakma 10 Ağustos'ta eklenmişti ve bu boşluk o
 *   günden beri açıktı.
 *
 *   Varsayılan `false`: bu bilgiyi taşımayan çağıran için davranış eskisi
 *   gibi kalır — bir öğrencinin ilk atamasında bırakma geçmişi zaten yoktur.
 */
export function ilkAtamaKarariVer(
  adaylar: DanismanAdayi[],
  ilKoordinatoruKullaniciId: number | null,
  elleBirakildiMi = false,
): IlkAtamaKarari {
  /*
   * ADAY SAYISINDAN ÖNCE SORULUR ve aday listesi boş olsa bile SECIM_GEREKLI
   * döner. "Seçilecek kimse yoksa hiç değilse koordinatöre bağlayalım" demek,
   * öğrencinin ayrılma kararını yok saymak olurdu; danışmansızlık artık
   * desteklenen bir durumdur (bkz. tekOgrenciyiBirak'taki uzun not) ve
   * ekranlarda "Atanmadı" olarak görünür.
   */
  if (elleBirakildiMi) {
    return { tur: "SECIM_GEREKLI", adaylar };
  }

  if (adaylar.length > 1) {
    return { tur: "SECIM_GEREKLI", adaylar };
  }

  if (adaylar.length === 1) {
    return { tur: "OTOMATIK", danismanKullaniciId: adaylar[0].kullaniciId };
  }

  if (ilKoordinatoruKullaniciId !== null) {
    return {
      tur: "IL_KOORDINATORUNE",
      danismanKullaniciId: ilKoordinatoruKullaniciId,
    };
  }

  return { tur: "ATANAMADI", neden: "IL_KOORDINATORU_YOK" };
}

export type DevirKarari =
  /** Okulda tek danışman kaldı: öğrenciler otomatik ona devredilir. */
  | { tur: "OTOMATIK_DEVIR"; yeniDanismanKullaniciId: number }
  /**
   * Birden fazla danışman var: öğrenciye "danışmanın değişti, yeniden seç"
   * bildirimi gider; seçim yapılana kadar GEÇİCİ olarak il koordinatörüne
   * bağlanır.
   */
  | {
      tur: "YENIDEN_SECIM";
      geciciDanismanKullaniciId: number | null;
      adaylar: DanismanAdayi[];
    }
  /** Hiç danışman kalmadı: il koordinatörüne devredilir. */
  | { tur: "IL_KOORDINATORUNE"; yeniDanismanKullaniciId: number }
  | { tur: "ATANAMADI"; neden: "IL_KOORDINATORU_YOK" };

export function devirKarariVer(
  kalanAdaylar: DanismanAdayi[],
  ilKoordinatoruKullaniciId: number | null,
): DevirKarari {
  if (kalanAdaylar.length === 1) {
    return {
      tur: "OTOMATIK_DEVIR",
      yeniDanismanKullaniciId: kalanAdaylar[0].kullaniciId,
    };
  }

  if (kalanAdaylar.length > 1) {
    return {
      tur: "YENIDEN_SECIM",
      geciciDanismanKullaniciId: ilKoordinatoruKullaniciId,
      adaylar: kalanAdaylar,
    };
  }

  if (ilKoordinatoruKullaniciId !== null) {
    return {
      tur: "IL_KOORDINATORUNE",
      yeniDanismanKullaniciId: ilKoordinatoruKullaniciId,
    };
  }

  return { tur: "ATANAMADI", neden: "IL_KOORDINATORU_YOK" };
}

/**
 * Okula sonradan danışman geldiğinde il koordinatörüne bağlı öğrenciler
 * OTOMATİK DEVREDİLMEZ. İl koordinatörüne "okulunuzda yeni danışman öğretmen
 * var, X öğrenci devredilebilir" bildirimi gider; devri o onaylar.
 */
export function yeniDanismanGeldigindeDevredilirMi(): false {
  return false;
}

/** Tekil bırakma gerekçesinin alt ve üst sınırı. */
const BIRAKMA_GEREKCESI_ENAZ = 10;
const BIRAKMA_GEREKCESI_ENFAZLA = 500;

export type BirakmaKarari =
  | { olurMu: true; gerekce: string }
  | { olurMu: false; neden: string };

/**
 * Öğretmenin TEK bir öğrencinin danışmanlığını bırakma gerekçesi.
 *
 * GEREKÇE ZORUNLUDUR ve bu bir biçim kaygısı değil: burada açık bir kötüye
 * kullanım kapısı var — "zor" bulunan öğrencinin sessizce bırakılması. Gerekçe
 * yazılmak zorunda olduğunda ve erişim kaydına geçtiğinde, karar sahibi
 * hesap verebilir hâle gelir. İl koordinatörüne de bildirim gider (istek:
 * "koordinatöre bilgi gitsin gerekçe şart").
 *
 * Alt sınır var çünkü tek harflik bir gerekçe, gerekçe zorunluluğunu biçimsel
 * olarak karşılayıp anlamını boşaltırdı.
 */
export function birakmaGerekcesiniCoz(ham: string): BirakmaKarari {
  const gerekce = ham.trim().replace(/\s+/g, " ");

  if (!gerekce) {
    return {
      olurMu: false,
      neden:
        "Danışmanlığı bırakma gerekçesi zorunludur; gerekçe il koordinatörüne iletilir ve erişim kaydına yazılır.",
    };
  }
  if (gerekce.length < BIRAKMA_GEREKCESI_ENAZ) {
    return {
      olurMu: false,
      neden: `Gerekçe en az ${BIRAKMA_GEREKCESI_ENAZ} karakter olmalıdır.`,
    };
  }
  if (gerekce.length > BIRAKMA_GEREKCESI_ENFAZLA) {
    return {
      olurMu: false,
      neden: `Gerekçe en fazla ${BIRAKMA_GEREKCESI_ENFAZLA} karakter olabilir.`,
    };
  }

  return { olurMu: true, gerekce };
}
```

### `src/lib/db-havuz.ts`

```ts
/**
 * Bağlantı havuzu boyutunun çözümlenmesi.
 *
 * Saf tutulur: veritabanına ve ortam değişkenlerine GİTMEZ, adresi parametre
 * olarak alır. `db.ts` Prisma istemcisini içeri aldığı için birim testte
 * yüklenemiyor; karar bu yüzden ayrı dosyada duruyor.
 *
 * NİYE BÖYLE BİR KARAR VAR: `DATABASE_URL` içindeki `connection_limit`
 * PRISMA'YA ÖZGÜ bir parametredir ve `@prisma/adapter-pg` onu OKUMAZ — altta
 * node-postgres çalışıyor, o da bilmediği sorgu parametrelerini sessizce yok
 * sayıyor. Yani adrese yazılan sınır bir süre HİÇ uygulanmadı; havuz `pg`'nin
 * kendi varsayılanıyla açıldı.
 *
 * Sonucu görünür bir arızaydı: yerel `prisma dev` sunucusu dört-beş eş zamanlı
 * bağlantıdan fazlasını kapatıyor ve sayfalar "Server has closed the connection"
 * ile 500 veriyordu. Tek sorgu çalıştıran betiklerde hiç görünmüyordu (tek
 * bağlantı yetiyor), yalnızca sayfa yükü altında çıkıyordu — bu yüzden hata
 * veritabanı arızası değil kod hatası gibi okunuyordu.
 */

/**
 * Sınır yazılmamışsa kullanılan değer.
 *
 * 4, yerel `prisma dev` sunucusunun sorunsuz taşıdığı en yüksek değer (10'da
 * 25 eş zamanlı sorgunun 9'u düşüyor, 4'te hiçbiri). Gerçek bir Postgres'e
 * geçildiğinde `DATABASE_URL`'e `connection_limit=20` gibi bir değer yazmak
 * yeterli; kod değişmiyor.
 */
export const VARSAYILAN_HAVUZ_SINIRI = 4;

/**
 * HAVUZLAYICI BİR UCA BAĞLANIRKEN kullanılan sınır (12 Ağustos 2026).
 *
 * BİR: uygulama veritabanına tek bağlantıdan, sırayla gider.
 *
 * ---------------------------------------------------------------------------
 * NEDEN
 * ---------------------------------------------------------------------------
 * Belirti: sayfalar rastgele 500 veriyordu ve günlükte tek bir hata vardı —
 * `Database error. Code: 08P01. Message: bind message supplies 2 parameters,
 * but prepared statement "" requires 8`. Bir günde 172 hata kaydının 125'i
 * buydu; her seferinde BAŞKA bir sorguda ve başka parametre sayılarıyla.
 *
 * `08P01` bir protokol hatasıdır: gönderilen Bind mesajı, o bağlantıda ayrıştırılmış
 * olan ifadeye uymuyor. Yani İKİ AYRI SORGU tek bir oturumda birbirine giriyor.
 * Sonuç yalnızca hata da değil: ölçümde sorguların bir kısmı BAŞKA sorgunun
 * sonucunu alıp çözümlemede patladı ("Cannot read properties of null").
 *
 * Ölçümle daraltıldı (40 tur · turda 1 işlem + 7 eş zamanlı sorgu):
 *
 *   yalnızca eş zamanlı okuma ................ 0 hata
 *   yalnızca işlem (transaction) ............. 0 hata
 *   işlem + eş zamanlı okuma ................. %24 hata
 *   işlem, sonra okuma (sıralı) .............. 0 hata
 *
 * Yani tetikleyici AÇIK BİR İŞLEM ile eş zamanlı sorguların çakışması.
 *
 * KABAHAT UYGULAMADA YA DA PRISMA'DA DEĞİL: aynı desen Prisma hiç devrede
 * olmadan, çıplak `pg` ile de aynı hatayı veriyor. Kabahat yereldeki uçta —
 * `prisma dev` sunucusu bağlantıları çoğullayan bir havuzlayıcıdır ve adresini
 * `pgbouncer=true` ile işaretler. İşlem bir oturumu tutarken öbür bağlantıların
 * sorguları aynı arka uca düşüyor, adsız prepared statement ("") eziliyor.
 *
 * `pgbouncer=true` PRISMA'YA ÖZGÜDÜR: Prisma'nın kendi motoru bunu görünce
 * prepared statement kullanmayı bırakır. `@prisma/adapter-pg` ise onu OKUMAZ —
 * `connection_limit`'te olduğu gibi (bkz. dosya başlığı). Talimat sessizce
 * düşüyor ve altta node-postgres adsız ifadelerle çalışmaya devam ediyor.
 *
 * DENENİP ELENEN ÇÖZÜMLER:
 *   · `idleTimeoutMillis` büyütmek — ilgisiz; 1sn ve 30sn aynı hata oranını
 *     veriyor.
 *   · Havuzu büyütmek — sınırı öteliyor, kaldırmıyor; max=20'de bile hata var.
 *   · Adlandırılmış prepared statement (`statementNameGenerator`) — hata oranı
 *     değişmedi (%24), yalnızca hatanın adı değişti.
 *   · max=1 — 320 sorguda SIFIR hata. Tek bağlantıda çakışacak ikinci bir
 *     sorgu kalmıyor.
 *
 * MALİYETİ eş zamanlılık: sayfa sorguları sıraya giriyor. Yerel geliştirmede
 * tek kullanıcı olduğu için bu ölçülebilir bir yavaşlama değil; rastgele 500
 * almanın yanında kabul edilir bir bedel.
 *
 * ÜRETİMİ ETKİLEMEZ ve bu kasıtlı: sunucudaki adres gerçek PostgreSQL'e
 * (127.0.0.1:5432) doğrudan gider, `pgbouncer` parametresi yoktur. Kural
 * kendiliğinden devre dışı kalır, üretim `VARSAYILAN_HAVUZ_SINIRI` ile çalışır.
 * Gerçek bir PgBouncer'ın arkasına geçilirse kural İSTENEREK devreye girer —
 * orada da aynı çakışma yaşanır.
 */
export const HAVUZLAYICI_SINIRI = 1;

/**
 * Havuzdaki bir bağlantının BOŞTA kalabileceği süre (11 Ağustos 2026).
 *
 * NİYE VAR: yerel `prisma dev` sunucusu boşta duran bağlantıyı yaklaşık on beş
 * saniye sonra KENDİ KAPATIYOR. `pg` bunu fark etmiyor, bağlantıyı havuzda
 * "hazır" sayıyor ve sıradaki isteğe ÖLÜ bağlantıyı veriyor; sonuç "Server has
 * closed the connection" hatası ve ekranda 500. Belirti sinsiydi: hata her
 * zaman aynı sayfada çıkmıyordu, "bir süredir açık duran sekmede ilk tıklama
 * patlıyor, yenileyince düzeliyor" biçiminde görünüyordu.
 *
 * SORUN EŞ ZAMANLILIK DEĞİL: on eş zamanlı sorgu arka arkaya sorunsuz
 * çalışıyor, on beş saniye bekledikten sonra yapılan TEK sorgu patlıyor.
 * Bağlantı sınırını düşürmek ya da sorguları dalgalara bölmek bu yüzden
 * çözmüyordu, yalnızca isabet olasılığını değiştiriyordu.
 *
 * BİR SANİYE, sunucunun kapatma eşiğinin çok altında: havuz bağlantıyı
 * sunucudan önce kendisi bırakıyor, bir sonraki istek taze bağlantı açıyor.
 * Ölçüm: 5000'de yirmi saniyelik aralıklarla yapılan yedi denemenin biri
 * düşüyordu, 1000'de hiçbiri düşmedi.
 *
 * MALİYETİ, seyrek kullanılan sayfalarda bir bağlantı kurma gecikmesi. Gerçek
 * bir Postgres'e geçildiğinde bu kadar kısa tutmaya gerek yok (sunucu boştaki
 * bağlantıyı kendiliğinden kapatmıyor); değer o zaman yükseltilebilir.
 *
 * NOT: yerel `prisma dev` sunucusu bunun DIŞINDA da arada bağlantı düşürüyor
 * (uygulama açılırken, hiç boşta beklemeden). O davranış bu ayarla ilgili
 * değil ve sunucu yeniden başlatılınca geçiyor.
 */
export const BOSTA_KALMA_SURESI_MS = 1000;

export function havuzSiniriniCoz(adres: string): number {
  let parametreler: URLSearchParams;
  try {
    parametreler = new URL(adres).searchParams;
  } catch {
    // Adres çözümlenemiyorsa bağlantı zaten kurulamayacak; havuz boyutu
    // yüzünden ayrıca patlamanın anlamı yok.
    return VARSAYILAN_HAVUZ_SINIRI;
  }

  /*
   * HAVUZLAYICI KONTROLÜ `connection_limit`TEN ÖNCE gelir ve onu EZER.
   * Yereldeki adres ikisini birden yazıyor (`connection_limit=4&pgbouncer=true`)
   * ve o adreste 4 bağlantı, hatanın ta kendisidir (bkz. HAVUZLAYICI_SINIRI).
   * Sıra ters olsaydı düzeltme kendi ortamında hiç çalışmazdı.
   */
  if (parametreler.get("pgbouncer") === "true") return HAVUZLAYICI_SINIRI;

  const deger = parametreler.get("connection_limit");
  if (deger === null) return VARSAYILAN_HAVUZ_SINIRI;

  /*
   * Sıfır ve negatif değer `pg`'de havuzu kilitler; sayıya çevrilemeyen değer
   * de öyle. Üçünde de varsayılana düşmek uygulamanın hiç açılmamasından iyi —
   * bu bir başarım ayarı, güvenlik kısıtı değil.
   */
  const sayi = Number.parseInt(deger, 10);
  return Number.isFinite(sayi) && sayi > 0 ? sayi : VARSAYILAN_HAVUZ_SINIRI;
}
```

### `src/lib/dis-kimlik/kurallar.ts`

```ts
import type { DisKullaniciTuru, RolKodu } from "@/generated/prisma/enums";

/**
 * EBA dışı giriş kuralları — mezun ve paydaş temsilcisi.
 *
 * Bu dosya veritabanına BAKMAZ ve "şimdi"yi parametre olarak alır; kararlar saf
 * tutulur ki birim testle eksiksiz kapsanabilsinler (aynı yaklaşım
 * lib/paydas/kurallar.ts ve lib/kvkk/kurallar.ts'de).
 *
 * BURADAKİ KURALLAR EBA'YA UYGULANMAZ. EBA/mock kimlikli kullanıcıların şifresi
 * yoktur; şifre, kilit ve sıfırlama yalnızca bu iki grubun sorunudur.
 */

export const TUR_ETIKETLERI: Record<DisKullaniciTuru, string> = {
  MEZUN: "Mezun",
  PAYDAS: "Paydaş temsilcisi",
  MENTOR: "Mentör",
};

/**
 * Şifre sormadan, listeden kimlik seçerek giriş yapılabilir mi?
 *
 * YALNIZCA MOCK SAĞLAYICIDA (10 Ağustos 2026). Gerçek e-Devlet/EBA
 * entegrasyonu gelene kadar geliştirme ve gösterim bu kapıdan yapılıyor;
 * `AUTH_PROVIDER="eba"` olan bir kurulumda kapı kapalıdır.
 *
 * KARAR BURADA, ortam.ts'i okumayan saf bir fonksiyonda: şifresiz oturum açan
 * bir kapının açık/kapalı ölçütü, birim testle sınanabilecek tek bir yerde
 * durmalı. Çağıranlar (ekran ve sunucu eylemi) bu fonksiyonu AYRI AYRI sorar —
 * ekranı gizlemek eylemi korumaz.
 */
export function kimlikSecerekGirisAcikMi(
  authSaglayici: "mock" | "eba",
): boolean {
  return authSaglayici === "mock";
}

/**
 * Başvuru formundaki "kim olarak başvuruyorsunuz" seçenekleri (7 Ağustos 2026).
 *
 * ÜÇÜ TEK FORMDA (istek: "Paydaş/Mentör başvurusu tek bir formdan yapılacak",
 * "mezunlar da paydaştan girsin"). Ayrı formlar, aynı doğrulama ve aynı KVKK
 * metnini üç kez yazdırırdı.
 */
export const DIS_TURLERI: DisKullaniciTuru[] = ["MEZUN", "PAYDAS", "MENTOR"];

export const TUR_ACIKLAMALARI: Record<DisKullaniciTuru, string> = {
  MEZUN:
    "GençTek'te öğrenci olarak yer aldınız ve mezun oldunuz. Okulunuzu ve mezuniyet yılınızı yazarsınız.",
  PAYDAS:
    "Bir kurumu temsilen katkı vermek istiyorsunuz. Kurumunuzu envanterden seçer, görev unvanınızı yazarsınız.",
  MENTOR:
    "Bildiğiniz konularda öğrencilere yol göstermek istiyorsunuz. Çalışma gruplarını ve konularınızı seçersiniz.",
};

/**
 * Başvuru türünün karşılığı olan rol.
 *
 * Eşleme TEK YERDE durur: onay akışı, yetki kontrolleri ve ekranlar bu
 * fonksiyondan geçer. İki ayrı yerde yazılsaydı biri güncellenmeyi kaçırır ve
 * onaylanan paydaş yanlış rolle sisteme girerdi.
 */
export function turunRolu(tur: DisKullaniciTuru): RolKodu {
  /*
   * MENTOR'ün AYRI BİR ROLÜ YOK ve bu bilinçli (7 Ağustos 2026).
   *
   * Rol, kapsam filtrelerinin okuduğu şeydir: "bu kişi hangi kayıtları
   * görebilir". Mentörün kapsamı paydaş temsilcisininkiyle birebir aynı —
   * ikisi de öğrenci/öğretmen kişisel verisine erişemez, etkinlik takvimini
   * ve panoyu görür. Ayrı bir rol açmak, her kapsam filtresine hiçbir şey
   * değiştirmeyen ikinci bir dal eklemek olurdu.
   *
   * Mentörlüğün KENDİSİ ayrı bir kayıtta tutuluyor (model Mentorluk) ve
   * "bu kişi mentör mü" sorusu oradan cevaplanıyor.
   */
  return tur === "MEZUN" ? "MEZUN" : "PAYDAS_TEMSILCISI";
}

export function disTuruMu(deger: string): deger is DisKullaniciTuru {
  return (DIS_TURLERI as string[]).includes(deger);
}

// ---------------------------------------------------------------------------
// E-posta ve şifre
// ---------------------------------------------------------------------------

/** RFC'ye tam uyum aranmaz; amaç yazım hatasını yakalamak (bkz. paydas/kurallar.ts). */
const EPOSTA_BICIMI = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EPOSTA_UST_SINIRI = 150;

/**
 * E-postayı giriş adı olarak kullanılabilir hâle getirir.
 *
 * Küçük harfe indirgeme TÜRKÇE KURALLA YAPILMAZ: `toLocaleLowerCase("tr")`
 * "I" harfini "ı"ya çevirir ve "ALI@x.com" ile "ali@x.com" iki ayrı hesap
 * olurdu. E-posta adresi bir dil metni değil, teknik bir tanımlayıcıdır.
 */
export function epostaNormalle(deger: string): string {
  return deger.trim().toLowerCase();
}

export function epostaGecerliMi(deger: string): boolean {
  return deger.length <= EPOSTA_UST_SINIRI && EPOSTA_BICIMI.test(deger);
}

/**
 * Şifre alt sınırı.
 *
 * 10 karakter, "8 karakter + büyük harf + rakam + simge" gibi bir maskeye
 * yeğlendi: karmaşıklık maskeleri kullanıcıyı `Sifre123!` gibi tahmin
 * edilebilir kalıplara iter, uzunluk ise doğrudan arama uzayını büyütür.
 * Yine de tek karakterden ibaret ("aaaaaaaaaa") ya da kişinin adından türeyen
 * şifreler ayrıca eleniyor.
 */
export const SIFRE_ALT_SINIRI = 10;
export const SIFRE_UST_SINIRI = 200;

/** Şifrede aranmaması gereken, kişiden türeyen parçalar. */
export interface SifreBaglami {
  ad: string;
  soyad: string;
  eposta: string;
}

export type SifreKarari = { olurMu: true } | { olurMu: false; neden: string };

export function sifreKarariniVer(
  sifre: string,
  baglam: SifreBaglami,
): SifreKarari {
  if (sifre.length < SIFRE_ALT_SINIRI) {
    return {
      olurMu: false,
      neden: `Şifre en az ${SIFRE_ALT_SINIRI} karakter olmalı.`,
    };
  }
  if (sifre.length > SIFRE_UST_SINIRI) {
    return {
      olurMu: false,
      neden: `Şifre en fazla ${SIFRE_UST_SINIRI} karakter olabilir.`,
    };
  }

  const benzersizKarakter = new Set(sifre).size;
  if (benzersizKarakter < 4) {
    return {
      olurMu: false,
      neden: "Şifre en az dört farklı karakter içermeli.",
    };
  }

  /*
   * Kişisel parçalar aranırken küçük harfe indirgeme yine Türkçe kuralsız:
   * karşılaştırılan şey ad değil, şifrenin içindeki dizgidir.
   */
  const kucuk = sifre.toLowerCase();
  const parcalar = [
    baglam.ad.trim().toLowerCase(),
    baglam.soyad.trim().toLowerCase(),
    epostaNormalle(baglam.eposta).split("@")[0] ?? "",
  ].filter((parca) => parca.length >= 4);

  if (parcalar.some((parca) => kucuk.includes(parca))) {
    return {
      olurMu: false,
      neden: "Şifre adınızı, soyadınızı ya da e-posta adınızı içeremez.",
    };
  }

  return { olurMu: true };
}

// ---------------------------------------------------------------------------
// Kaba kuvvet koruması
// ---------------------------------------------------------------------------

/**
 * Kaç başarısız denemeden sonra hesap geçici olarak kilitlenir.
 *
 * KİLİT KALICI DEĞİL: kalıcı kilit, saldırganın başkasının hesabını kasten
 * kilitlemesine (hizmet dışı bırakma) izin verirdi. Süreli kilit denemeyi
 * pahalılaştırır, kurbanı dışarıda bırakmaz.
 */
export const BASARISIZ_DENEME_SINIRI = 5;
export const KILIT_SURESI_DAKIKA = 15;

export interface KilitDurumu {
  basarisizDeneme: number;
  kilitBitisTarihi: Date | null;
}

export function kilitliMi(durum: KilitDurumu, simdi: Date): boolean {
  return durum.kilitBitisTarihi !== null && durum.kilitBitisTarihi > simdi;
}

/** Kilidin bitmesine kalan dakika (yukarı yuvarlanır); kilitli değilse 0. */
export function kilitKalanDakika(durum: KilitDurumu, simdi: Date): number {
  if (!kilitliMi(durum, simdi)) return 0;
  const kalanMs = (durum.kilitBitisTarihi as Date).getTime() - simdi.getTime();
  return Math.max(1, Math.ceil(kalanMs / 60000));
}

/**
 * Başarısız denemeden sonraki yeni durum.
 *
 * Sayaç kilitlenince SIFIRLANIR: kilidi biten kişi tek bir hatalı denemeyle
 * yeniden kilitlenmemeli, ona da tam bir hak seti verilir.
 */
export function basarisizDenemeSonucu(
  durum: KilitDurumu,
  simdi: Date,
): KilitDurumu {
  const yeniDeneme = durum.basarisizDeneme + 1;
  if (yeniDeneme < BASARISIZ_DENEME_SINIRI) {
    return { basarisizDeneme: yeniDeneme, kilitBitisTarihi: null };
  }
  return {
    basarisizDeneme: 0,
    kilitBitisTarihi: new Date(simdi.getTime() + KILIT_SURESI_DAKIKA * 60000),
  };
}

/** Parola sıfırlama bağlantısının ömrü. */
export const SIFIRLAMA_GECERLILIK_DAKIKA = 60;

export function sifirlamaGecerliMi(
  sonGecerlilik: Date | null,
  simdi: Date,
): boolean {
  return sonGecerlilik !== null && sonGecerlilik > simdi;
}

// ---------------------------------------------------------------------------
// Başvuru girdisi
// ---------------------------------------------------------------------------

/** Ekrandan gelen ham başvuru girdisi. */
export interface DisBasvuruGirdisi {
  tur: string;
  ad: string;
  soyad: string;
  eposta: string;
  telefon: string;
  ilKodu: string;
  sifre: string;
  sifreTekrar: string;
  /** MEZUN: okul kodu (isteğe bağlı) ve mezuniyet yılı. */
  mezunKurumKodu: string;
  mezuniyetYili: string;
  /** PAYDAS: envanterdeki kurum kaydı ve kişinin oradaki görevi. */
  paydasId: string;
  gorevUnvani: string;
  beyan: string;
  /** Aydınlatma metni onay kutusu işaretlendi mi? */
  aydinlatmaOnayi: boolean;
  /**
   * MENTÖRLÜK (7 Ağustos 2026 · "Paydaş/Mentör başvurusu tek bir formdan
   * yapılacak"). tur=MENTOR olduğunda zorunlu olarak true gelir; mezun ve
   * paydaş da işaretleyebilir.
   */
  mentorlukIstiyor: boolean;
  mentorlukKonulari: string;
  mentorlukGrupIdleri: readonly unknown[];
}

/** Veritabanına yazılabilir hâle gelmiş başvuru (şifre henüz özetlenmemiş). */
export interface DisBasvuruKaydi {
  tur: DisKullaniciTuru;
  ad: string;
  soyad: string;
  eposta: string;
  telefon: string | null;
  ilKodu: string;
  sifre: string;
  mezunKurumKodu: number | null;
  mezuniyetYili: number | null;
  paydasId: number | null;
  gorevUnvani: string | null;
  beyan: string;
  mentorlukIstiyor: boolean;
  mentorlukKonulari: string | null;
  mentorlukGrupIdleri: number[];
}

export type DisBasvuruKarari =
  | { olurMu: true; kayit: DisBasvuruKaydi }
  | { olurMu: false; neden: string };

const AD_UST_SINIRI = 100;
const UNVAN_UST_SINIRI = 150;
const BEYAN_ALT_SINIRI = 20;
const BEYAN_UST_SINIRI = 2000;
/** `mentorluk.konular` ile aynı sınır (lib/mentor/kurallar.ts). */
const MENTORLUK_KONULARI_UST_SINIRI = 500;

/** Telefon biçimi paydaş envanteriyle aynı gevşeklikte tutuldu. */
const TELEFON_BICIMI = /^[0-9+()\s./-]{7,20}$/;

/**
 * En eski kabul edilen mezuniyet yılı.
 *
 * GençTek ekosistemi yeni olduğu için "mezun" kavramı son yıllarla sınırlı;
 * yine de sınır geniş tutuldu, çünkü daraltmak gerçek başvuruyu reddetmenin
 * bedeliyle gelir. Alan yalnızca yazım hatasını (1099, 20255) yakalar.
 */
const EN_ESKI_MEZUNIYET_YILI = 1970;

function bosVeyaMetin(deger: string): string | null {
  const kirpilmis = deger.trim();
  return kirpilmis ? kirpilmis : null;
}

/**
 * Başvuru girdisini doğrular.
 *
 * TÜRE GÖRE AYRIŞAN ALANLAR: mezunda mezuniyet yılı, paydaşta kurum kaydı ve
 * görev unvanı zorunludur. Paydaş temsilcisi kurum adını SERBEST METİN
 * YAZAMAZ — envanterdeki kayıttan seçer; aksi hâlde aynı üniversite onlarca
 * yazımla sisteme girer ve il koordinatörlerinin yönettiği envanter
 * kullanılamaz hâle gelirdi (aynı gerekçe: paydasEkleyebilirMi).
 */
export function disBasvuruGirdisiniCoz(
  girdi: DisBasvuruGirdisi,
  simdi: Date,
): DisBasvuruKarari {
  if (!disTuruMu(girdi.tur)) {
    return { olurMu: false, neden: "Başvuru türü seçilmelidir." };
  }
  const tur = girdi.tur;

  const ad = girdi.ad.trim();
  const soyad = girdi.soyad.trim();
  if (!ad || !soyad) {
    return { olurMu: false, neden: "Ad ve soyad zorunludur." };
  }
  if (ad.length > AD_UST_SINIRI || soyad.length > AD_UST_SINIRI) {
    return {
      olurMu: false,
      neden: `Ad ve soyad en fazla ${AD_UST_SINIRI} karakter olabilir.`,
    };
  }

  const eposta = epostaNormalle(girdi.eposta);
  if (!epostaGecerliMi(eposta)) {
    return { olurMu: false, neden: "Geçerli bir e-posta adresi girin." };
  }

  const telefon = bosVeyaMetin(girdi.telefon);
  if (telefon && !TELEFON_BICIMI.test(telefon)) {
    return { olurMu: false, neden: "Telefon numarası geçerli değil." };
  }

  const ilKodu = girdi.ilKodu.trim();
  if (!/^\d{2}$/.test(ilKodu)) {
    return { olurMu: false, neden: "İl seçilmelidir." };
  }

  if (girdi.sifre !== girdi.sifreTekrar) {
    return { olurMu: false, neden: "Şifre ile tekrarı aynı değil." };
  }
  const sifreKarari = sifreKarariniVer(girdi.sifre, { ad, soyad, eposta });
  if (!sifreKarari.olurMu) {
    return { olurMu: false, neden: sifreKarari.neden };
  }

  const beyan = girdi.beyan.trim();
  if (beyan.length < BEYAN_ALT_SINIRI) {
    return {
      olurMu: false,
      neden:
        "Ekosisteme nasıl katkı vermek istediğinizi birkaç cümleyle yazın; başvurunuz buna göre değerlendirilecek.",
    };
  }
  if (beyan.length > BEYAN_UST_SINIRI) {
    return {
      olurMu: false,
      neden: `Açıklama en fazla ${BEYAN_UST_SINIRI} karakter olabilir.`,
    };
  }

  if (!girdi.aydinlatmaOnayi) {
    return {
      olurMu: false,
      neden: "Aydınlatma metnini okuyup onaylamadan başvuru alınamaz.",
    };
  }

  let mezunKurumKodu: number | null = null;
  let mezuniyetYili: number | null = null;
  let paydasId: number | null = null;
  let gorevUnvani: string | null = null;

  if (tur === "MEZUN") {
    const yilMetni = girdi.mezuniyetYili.trim();
    const yil = Number(yilMetni);
    if (
      !/^\d{4}$/.test(yilMetni) ||
      yil < EN_ESKI_MEZUNIYET_YILI ||
      yil > simdi.getFullYear()
    ) {
      return { olurMu: false, neden: "Geçerli bir mezuniyet yılı girin." };
    }
    mezuniyetYili = yil;

    // Okul İSTEĞE BAĞLI: kapanmış ya da referans tablosunda bulunmayan bir
    // okuldan mezun olan kişi başvuramaz hâle gelmemeli.
    const kurumMetni = girdi.mezunKurumKodu.trim();
    if (kurumMetni) {
      const kurumKodu = Number(kurumMetni);
      if (!Number.isInteger(kurumKodu) || kurumKodu <= 0) {
        return { olurMu: false, neden: "Mezun olunan okul geçerli değil." };
      }
      mezunKurumKodu = kurumKodu;
    }
  } else if (tur === "PAYDAS") {
    const paydasMetni = girdi.paydasId.trim();
    const secilen = Number(paydasMetni);
    if (!paydasMetni || !Number.isInteger(secilen) || secilen <= 0) {
      return {
        olurMu: false,
        neden: "Temsil ettiğiniz paydaş kurumu listeden seçin.",
      };
    }
    paydasId = secilen;

    gorevUnvani = bosVeyaMetin(girdi.gorevUnvani);
    if (!gorevUnvani) {
      return {
        olurMu: false,
        neden: "Kurumdaki görev/unvanınızı yazın.",
      };
    }
    if (gorevUnvani.length > UNVAN_UST_SINIRI) {
      return {
        olurMu: false,
        neden: `Görev/unvan en fazla ${UNVAN_UST_SINIRI} karakter olabilir.`,
      };
    }
  }

  /*
   * MENTÖRLÜK ALANLARI.
   *
   * tur=MENTOR ise işaret ZORUNLU: o türü seçen kişi mentörlük istiyor
   * demektir ve işaretsiz gelen bir MENTOR başvurusu, onaylayan için ne
   * yapacağı belirsiz bir kayıt olurdu.
   *
   * Mentörlük isteniyorsa EN AZ BİR ALAN dolu olmalı — grup ya da konu.
   * İkisi de boşsa öğrenci bu kişiye hangi konuda başvuracağını bilemez.
   *
   * Grup kimlikleri BURADA listeye karşı doğrulanmaz: seçilebilir grupların
   * listesi veritabanındadır ve bu fonksiyon saf. Doğrulama onay anında
   * yapılıyor (bkz. lib/mentor/veri.ts · disBasvurudanMentorlukAc) — o an
   * bir grup pasife alınmış da olabilir.
   */
  const mentorlukIstiyor = tur === "MENTOR" ? true : girdi.mentorlukIstiyor;

  const mentorlukGrupIdleri = mentorlukIstiyor
    ? [
        ...new Set(
          girdi.mentorlukGrupIdleri
            .map((ham) => Number.parseInt(String(ham), 10))
            .filter((id) => Number.isInteger(id) && id > 0),
        ),
      ]
    : [];

  const mentorlukKonulariMetni = girdi.mentorlukKonulari.trim();
  if (mentorlukKonulariMetni.length > MENTORLUK_KONULARI_UST_SINIRI) {
    return {
      olurMu: false,
      neden: `Mentörlük konuları en fazla ${MENTORLUK_KONULARI_UST_SINIRI} karakter olabilir.`,
    };
  }

  if (
    mentorlukIstiyor &&
    mentorlukGrupIdleri.length === 0 &&
    !mentorlukKonulariMetni
  ) {
    return {
      olurMu: false,
      neden:
        "Mentörlük için en az bir çalışma grubu seçin ya da mentörlük yapabileceğiniz konuları yazın.",
    };
  }

  const mentorlukKonulari = mentorlukIstiyor
    ? mentorlukKonulariMetni || null
    : null;

  return {
    olurMu: true,
    kayit: {
      tur,
      ad,
      soyad,
      eposta,
      telefon,
      ilKodu,
      sifre: girdi.sifre,
      mezunKurumKodu,
      mezuniyetYili,
      paydasId,
      gorevUnvani,
      beyan,
      mentorlukIstiyor,
      mentorlukKonulari,
      mentorlukGrupIdleri,
    },
  };
}

// ---------------------------------------------------------------------------
// Karar
// ---------------------------------------------------------------------------

const RET_GEREKCESI_ALT_SINIRI = 10;
const RET_GEREKCESI_UST_SINIRI = 1000;

/**
 * Ret gerekçesi ZORUNLUDUR.
 *
 * Tekrar başvuru serbest olduğu için gerekçesiz ret, kişiyi aynı başvuruyu
 * aynı eksikle tekrar göndermeye iter — ne başvuran ne onaylayan kazanır.
 */
export function retGerekcesiniCoz(
  gerekce: string,
): { olurMu: true; gerekce: string } | { olurMu: false; neden: string } {
  const kirpilmis = gerekce.trim();
  if (kirpilmis.length < RET_GEREKCESI_ALT_SINIRI) {
    return {
      olurMu: false,
      neden:
        "Ret gerekçesi yazın: kişi tekrar başvurabiliyor, neyi düzelteceğini bilmeli.",
    };
  }
  if (kirpilmis.length > RET_GEREKCESI_UST_SINIRI) {
    return {
      olurMu: false,
      neden: `Ret gerekçesi en fazla ${RET_GEREKCESI_UST_SINIRI} karakter olabilir.`,
    };
  }
  return { olurMu: true, gerekce: kirpilmis };
}
```

### `src/lib/dis-kimlik/profil-kurallar.ts`

```ts
/**
 * Mezun / paydaş temsilcisi / mentör profilinin KENDİ girdiği alanları
 * (7 Ağustos 2026).
 *
 * İstek: "1. sekme Profil · Foto · Bilgileri (il kurum görevi linkedin github
 * eposta açıklamalar/katkı sağlayabileceği şeyler)" ve "2. sekme Panel ·
 * Çalışma Grupları".
 *
 * Saf tutulur: veritabanına gitmez, "şimdi"yi üretmez — projedeki diğer kural
 * dosyalarıyla aynı desen (lib/dis-kimlik/kurallar.ts, lib/mentor/kurallar.ts).
 *
 * İL BURADA YOK: kişinin ili başvurudan gelir ve kimlik bilgisidir, kendisi
 * değiştiremez. Aynı sebeple ad, soyad ve e-posta da bu dosyanın dışındadır —
 * e-posta aynı zamanda giriş adıdır (bkz. dis_kimlik tablosu).
 */

/** Veritabanı sütunlarıyla birebir aynı (ogretmen_profil). */
export const KURUM_ADI_AZAMI = 150;
export const GOREV_UNVANI_AZAMI = 150;

/**
 * Katkı açıklamasının üst sınırı.
 *
 * Mentörlük konularından (500) uzun tutuldu: orası bir etiket listesidir
 * ("3B tasarım, Arduino"), burası kişinin ne yapabileceğini anlattığı serbest
 * metindir. Sınır yine de var — sınırsız metin, profil ekranını tek kişinin
 * özgeçmişine çevirirdi; asıl özgeçmiş zaten dosya olarak yükleniyor.
 */
export const KATKI_ACIKLAMASI_AZAMI = 2000;

export interface DisProfilGirdisi {
  kurumAdi: string;
  gorevUnvani: string;
  aciklama: string;
}

export interface DisProfilDegerleri {
  kurumAdi: string | null;
  gorevUnvani: string | null;
  aciklama: string | null;
}

export type DisProfilKarari =
  | { olurMu: true; degerler: DisProfilDegerleri }
  | { olurMu: false; neden: string };

/**
 * Alanların hiçbiri ZORUNLU DEĞİL.
 *
 * Onaylanmış bir kullanıcıdan yeni bilgi istemek, bilgiyi girene kadar profilini
 * kilitlemek demek olurdu; oysa kişinin sisteme girme hakkı başvurusu
 * onaylandığında doğdu. Boş bırakılan alan `null` yazılır, boş metin değil:
 * "hiç yazılmadı" ile "silindi" veritabanında aynı şeydir ve ekran ikisini de
 * "—" diye gösteriyor.
 */
export function disProfiliDogrula(girdi: DisProfilGirdisi): DisProfilKarari {
  const kurumAdi = girdi.kurumAdi.trim();
  if (kurumAdi.length > KURUM_ADI_AZAMI) {
    return {
      olurMu: false,
      neden: `Kurum adı en fazla ${KURUM_ADI_AZAMI} karakter olabilir.`,
    };
  }

  const gorevUnvani = girdi.gorevUnvani.trim();
  if (gorevUnvani.length > GOREV_UNVANI_AZAMI) {
    return {
      olurMu: false,
      neden: `Görev en fazla ${GOREV_UNVANI_AZAMI} karakter olabilir.`,
    };
  }

  const aciklama = girdi.aciklama.trim();
  if (aciklama.length > KATKI_ACIKLAMASI_AZAMI) {
    return {
      olurMu: false,
      neden: `Açıklama en fazla ${KATKI_ACIKLAMASI_AZAMI} karakter olabilir.`,
    };
  }

  return {
    olurMu: true,
    degerler: {
      kurumAdi: kurumAdi || null,
      gorevUnvani: gorevUnvani || null,
      aciklama: aciklama || null,
    },
  };
}

/**
 * Seçilen çalışma grubu kimliklerini ayıklar.
 *
 * LİSTEYE KARŞI DOĞRULANIR: form girdisine güvenilseydi kapatılmış ya da hiç
 * var olmayan bir gruba katkı beyan edilebilirdi. Tekrarlananlar da eleniyor —
 * aynı grup iki kez gönderildiğinde birincil anahtar çakışırdı
 * (mentorlukKabulEdilirMi ile aynı gerekçe).
 *
 * BOŞ SEÇİM GEÇERLİDİR ve hata değildir: kişi bütün gruplardan çıkmak
 * isteyebilir. Mentörlükten farkı bu — orada en az bir alan dolu olmalı, çünkü
 * konusuz bir mentörlük hiçbir ilanla eşleşmez.
 */
export function destekGruplariniAyikla(
  gelenIdler: readonly (string | number)[],
  gecerliGrupIdleri: readonly number[],
): number[] {
  const gecerliler = new Set(gecerliGrupIdleri);
  return [
    ...new Set(
      gelenIdler
        .map((ham) => Number.parseInt(String(ham), 10))
        .filter((id) => Number.isInteger(id) && gecerliler.has(id)),
    ),
  ];
}
```

### `src/lib/dis-kimlik/sifre.ts`

```ts
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Şifre özetleme — EBA dışı kullanıcılar için.
 *
 * NEDEN DIŞ BAĞIMLILIK YOK: bcrypt/argon2 paketleri yerel derleme ister ve
 * kurulum VPS'te Node sürümüne bağlı olarak kırılır. Node'un kendi scrypt'i
 * (RFC 7914) bellek-zor bir fonksiyondur ve bu iş için yeterlidir; parametreler
 * aşağıda, özetin İÇİNDE saklanır.
 *
 * ÖZET BİÇİMİ: scrypt$N$r$p$tuz$ozet — parametreler özete gömülür ki ileride
 * sertleştirildiklerinde ESKİ özetler doğrulanmaya devam etsin. Parametre
 * koda sabitlenseydi, N'i büyütmek tüm mevcut kullanıcıları kilitlerdi.
 */

const scryptAsync = promisify(scrypt) as (
  sifre: string | Buffer,
  tuz: string | Buffer,
  uzunluk: number,
  secenekler: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * scrypt maliyet parametreleri.
 *
 * N=16384 (2^14), r=8, p=1 — Node belgelerindeki varsayılan profilin bir
 * kademe üstü. Bir giriş denemesi ~100 ms sürer: kullanıcı fark etmez, kaba
 * kuvvet denemesi pahalı hâle gelir. Değerleri BÜYÜTMEK güvenlidir (eski
 * özetler kendi parametreleriyle doğrulanır), küçültmek anlamsızdır.
 */
const N = 16384;
const R = 8;
const P = 1;
const TUZ_BAYT = 16;
const OZET_BAYT = 32;

/** scrypt varsayılan maxmem (32 MB) N=16384 için yetmez. */
const MAKS_BELLEK = 64 * 1024 * 1024;

function b64(veri: Buffer): string {
  return veri.toString("base64");
}

export async function sifreOzetle(sifre: string): Promise<string> {
  const tuz = randomBytes(TUZ_BAYT);
  const ozet = await scryptAsync(sifre.normalize("NFKC"), tuz, OZET_BAYT, {
    N,
    r: R,
    p: P,
    maxmem: MAKS_BELLEK,
  });
  return `scrypt$${N}$${R}$${P}$${b64(tuz)}$${b64(ozet)}`;
}

/**
 * Şifreyi özetle karşılaştırır.
 *
 * Bozuk/tanınmayan özet biçiminde HATA FIRLATMAZ, `false` döner: özet alanı
 * bir şekilde bozulduysa doğru sonuç "bu kişi giremez"dir; istisna fırlatmak
 * giriş ekranını 500'e düşürür ve saldırgana biçim hakkında bilgi verir.
 */
export async function sifreDogrula(
  sifre: string,
  ozetKaydi: string,
): Promise<boolean> {
  const parcalar = ozetKaydi.split("$");
  if (parcalar.length !== 6 || parcalar[0] !== "scrypt") return false;

  const [, nMetin, rMetin, pMetin, tuzB64, ozetB64] = parcalar;
  const n = Number(nMetin);
  const r = Number(rMetin);
  const p = Number(pMetin);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }

  let tuz: Buffer;
  let beklenen: Buffer;
  try {
    tuz = Buffer.from(tuzB64, "base64");
    beklenen = Buffer.from(ozetB64, "base64");
  } catch {
    return false;
  }
  if (tuz.length === 0 || beklenen.length === 0) return false;

  let hesaplanan: Buffer;
  try {
    hesaplanan = await scryptAsync(
      sifre.normalize("NFKC"),
      tuz,
      beklenen.length,
      { N: n, r, p, maxmem: MAKS_BELLEK },
    );
  } catch {
    return false;
  }

  return timingSafeEqual(hesaplanan, beklenen);
}

/**
 * Parola sıfırlama jetonu üretir.
 *
 * Dönen çiftin İLKİ kullanıcıya (e-postayla) gider, İKİNCİSİ veritabanına
 * yazılır. Jetonun kendisi saklanmaz: veritabanını okuyabilen biri, elindeki
 * kayıtla hesap ele geçirememeli.
 */
export async function sifirlamaJetonuUret(): Promise<{
  jeton: string;
  ozet: string;
}> {
  const jeton = randomBytes(32).toString("base64url");
  return { jeton, ozet: await sifreOzetle(jeton) };
}

export async function sifirlamaJetonuDogrula(
  jeton: string,
  ozet: string,
): Promise<boolean> {
  return sifreDogrula(jeton, ozet);
}
```

### `src/lib/ekip/kurallar.ts`

```ts
import {
  ilKoordinatoruMu,
  koordinatorIlKodu,
  projeYoneticisiMi,
} from "@/lib/yetki/izinler";
import type { OturumKullanicisi } from "@/lib/yetki/tipler";

/**
 * Ekip kuralları (13 Ağustos 2026).
 *
 * İSTEK: "il koordinatörü ekipler kurabilsin, ekip ismini kendileri girsin,
 * ekiplere katılanlarla mesajlaşma sohbet yapabilsin".
 *
 * Saf tutulur: veritabanına gitmez, birim testle kapsanır. Ekran ve sunucu
 * eylemi aynı fonksiyonları çağırır — biri düğmeyi basıp öbürü izin
 * vermeseydi kullanıcı tıkladığı düğmeden hata alırdı.
 */

const EKIP_ADI_MAKS = 150;
const EKIP_ACIKLAMA_MAKS = 500;
const EKIP_MESAJ_MAKS = 2000;

/**
 * Ekip KURABİLİR/YÖNETEBİLİR mi?
 *
 * İl koordinatörü (istek) ve proje yöneticisi. Merkez, istekte sayılmadığı
 * hâlde dışarıda bırakılmadı: koordinatörü olmayan ya da görevi biten ilde
 * ekibin sahibi kalmazdı ve yanlış kurulmuş bir ekibi düzeltecek kimse
 * olmazdı. Aynı gerekçeyle merkez, mentörlük ve rol ekranlarında da son
 * mercidir.
 *
 * DANIŞMAN ÖĞRETMEN DIŞARIDA ve bu dar başlangıç bilinçli: ekip, üyelerine
 * birbirleriyle onaysız yazışma hakkı doğuruyor (bkz. ekipSohbetiOkuyabilirMi).
 * Bu hak bugüne kadar yalnızca danışman/koordinatör onayından geçerek
 * veriliyordu; kimin ekip kurabileceği, o kapının kimde olduğu sorusudur ve
 * ilde tek kişidedir. Öğretmene açılması ayrı bir karardır.
 */
export function ekipYonetebilirMi(kullanici: OturumKullanicisi): boolean {
  return ilKoordinatoruMu(kullanici) || projeYoneticisiMi(kullanici);
}

/**
 * Bu ekibi yönetebilir mi (üye ekleme/çıkarma, kapatma)?
 *
 * Kapsam burada uygulanıyor: koordinatör YALNIZCA kendi ilinin ekibini
 * yönetir, merkez hepsini. `ekipYonetebilirMi` "bu rol ekip yönetir mi"
 * sorusunu, bu ise "bu ekibi yönetir mi" sorusunu cevaplar; ikisi ayrı
 * tutuldu çünkü ilki ekran basılırken, ikincisi kayıt üzerinde çalışırken
 * soruluyor.
 */
export function buEkibiYonetebilirMi(
  kullanici: OturumKullanicisi,
  ekipIlKodu: string,
): boolean {
  if (projeYoneticisiMi(kullanici)) return true;
  if (!ilKoordinatoruMu(kullanici)) return false;
  return koordinatorIlKodu(kullanici) === ekipIlKodu;
}

/**
 * Ekip sohbetini OKUYABİLİR mi?
 *
 * Üyeler, ekibi yönetenler (ilin koordinatörü) ve proje yöneticisi. Gizli
 * kanal yoktur (bkz. lib/iletisim/kurallar.ts): sohbetin gözetime açık olması
 * ekip kurmanın koşuludur, çünkü üyelerin çoğu 18 yaş altı ve bu kanal
 * danışman onayından geçmeden açılıyor.
 */
export function ekipSohbetiOkuyabilirMi(
  kullanici: OturumKullanicisi,
  ekip: { ilKodu: string; uyeKullaniciIdleri: number[] },
): boolean {
  if (ekip.uyeKullaniciIdleri.includes(kullanici.id)) return true;
  return buEkibiYonetebilirMi(kullanici, ekip.ilKodu);
}

/**
 * Sohbete YAZABİLİR mi?
 *
 * Okuyabilenlerle aynı kitle: ekibi kuran koordinatör de ekibin bir parçasıdır
 * ve duyurusunu oraya yazar. Merkez de yazabilir — okuyup müdahale edebilen
 * ama uyaramayan bir gözetim, gözetim değildir.
 *
 * KAPALI EKİBE YAZILMAZ: pasife alınmış ekip bir arşivdir.
 */
export function ekipSohbetineYazabilirMi(
  kullanici: OturumKullanicisi,
  ekip: { ilKodu: string; aktif: boolean; uyeKullaniciIdleri: number[] },
): boolean {
  if (!ekip.aktif) return false;
  return ekipSohbetiOkuyabilirMi(kullanici, ekip);
}

export type EkipAdiKarari =
  | { olurMu: true; ad: string; aciklama: string | null }
  | { olurMu: false; neden: string };

/**
 * Ekip adı ve açıklaması.
 *
 * AD SERBEST METİN (istek: "ekip ismini kendileri girsin") — referans listesi
 * yok. Tekillik il+ad üzerinde ve veritabanında (bkz. ux_ekip_il_ad_aktif):
 * aynı ilde aynı adla iki aktif ekip, üyenin hangisine yazdığını bilemediği
 * bir durumdur.
 */
export function ekipAdiniCoz(girdi: {
  ad: string;
  aciklama: string;
}): EkipAdiKarari {
  const ad = girdi.ad.trim().replace(/\s+/g, " ");
  if (!ad) return { olurMu: false, neden: "Ekip adı boş olamaz." };
  if (ad.length > EKIP_ADI_MAKS) {
    return {
      olurMu: false,
      neden: `Ekip adı en fazla ${EKIP_ADI_MAKS} karakter olabilir.`,
    };
  }

  const aciklama = girdi.aciklama.trim();
  if (aciklama.length > EKIP_ACIKLAMA_MAKS) {
    return {
      olurMu: false,
      neden: `Açıklama en fazla ${EKIP_ACIKLAMA_MAKS} karakter olabilir.`,
    };
  }

  return { olurMu: true, ad, aciklama: aciklama || null };
}

/** Ekip sohbetindeki mesaj metni — sınır yazışma mesajlarıyla aynı. */
export function ekipMesajiniCoz(
  metin: string,
): { olurMu: true; icerik: string } | { olurMu: false; neden: string } {
  const icerik = metin.trim();
  if (!icerik) return { olurMu: false, neden: "Mesaj boş olamaz." };
  if (icerik.length > EKIP_MESAJ_MAKS) {
    return {
      olurMu: false,
      neden: `Mesaj en fazla ${EKIP_MESAJ_MAKS} karakter olabilir.`,
    };
  }
  return { olurMu: true, icerik };
}

/**
 * Ekip sohbetinin kalıcı uyarısı.
 *
 * Tek sabitten geliyor ki her ekranda aynı cümle çıksın (GIZLILIK_UYARISI ile
 * aynı gerekçe).
 */
export const EKIP_SOHBET_UYARISI =
  "Ekip sohbeti gizli değildir: ekibi kuran il koordinatörü ve proje yöneticisi mesajları okuyabilir. Telefon, adres gibi iletişim bilgilerinizi yazmayın.";
```

### `src/lib/faaliyet/ek-kurallar.ts`

```ts
/**
 * Faaliyet eki (dosya/görsel) kabul kuralları — references/domain-rules.md
 * Bölüm 7.
 *
 * Saf tutulur: dosya sistemine ve veritabanına gitmez, sınırlar parametre
 * olarak gelir. Sınırların kendisi `sistem_ayari` tablosundadır, koda gömülmez
 * (proje yöneticisi değiştirebilmeli).
 */

export type EkTuru = "GORSEL" | "BELGE";

export interface EkSinirlari {
  izinliGorselTipleri: string[];
  izinliBelgeTipleri: string[];
  gorselMaksBayt: number;
  belgeMaksBayt: number;
}

export function ekTuruBelirle(
  mimeTipi: string,
  sinirlar: EkSinirlari,
): EkTuru | null {
  if (sinirlar.izinliGorselTipleri.includes(mimeTipi)) return "GORSEL";
  if (sinirlar.izinliBelgeTipleri.includes(mimeTipi)) return "BELGE";
  return null;
}

function megabayt(bayt: number): string {
  return `${(bayt / (1024 * 1024)).toFixed(0)} MB`;
}

/**
 * Tip ve boyut kontrolü. İzin verilmeyen dosya sessizce yutulmaz, açık gerekçe
 * döner (kenar durum: "izin verilmeyen dosya tipi/boyutu → açık hata mesajı").
 */
export function ekKabulEdilirMi(
  dosya: { mimeTipi: string; boyutBayt: number; dosyaAdi: string },
  sinirlar: EkSinirlari,
): { olurMu: boolean; neden?: string; tur?: EkTuru } {
  if (!dosya.dosyaAdi.trim()) {
    return { olurMu: false, neden: "Dosya seçilmedi." };
  }
  if (dosya.boyutBayt <= 0) {
    return { olurMu: false, neden: "Boş dosya yüklenemez." };
  }

  const tur = ekTuruBelirle(dosya.mimeTipi, sinirlar);
  if (!tur) {
    const izinliler = [
      ...sinirlar.izinliGorselTipleri,
      ...sinirlar.izinliBelgeTipleri,
    ].join(", ");
    return {
      olurMu: false,
      neden: `"${dosya.mimeTipi}" tipinde dosya yüklenemez. İzin verilenler: ${izinliler}`,
    };
  }

  const sinir =
    tur === "GORSEL" ? sinirlar.gorselMaksBayt : sinirlar.belgeMaksBayt;
  if (dosya.boyutBayt > sinir) {
    return {
      olurMu: false,
      neden: `Dosya ${megabayt(dosya.boyutBayt)} boyutunda; ${
        tur === "GORSEL" ? "görsel" : "belge"
      } için üst sınır ${megabayt(sinir)}.`,
    };
  }

  return { olurMu: true, tur };
}

/** Yorum içeriği boş olamaz (veritabanı kısıtıyla da korunur). */
export function yorumKabulEdilirMi(icerik: string): {
  olurMu: boolean;
  neden?: string;
} {
  const kirpilmis = icerik.trim();
  if (!kirpilmis) return { olurMu: false, neden: "Yorum boş olamaz." };
  if (kirpilmis.length > 2000) {
    return { olurMu: false, neden: "Yorum en fazla 2000 karakter olabilir." };
  }
  return { olurMu: true };
}
```

### `src/lib/faaliyet/kurallar.ts`

```ts
import type {
  BasvuruDurumu,
  EtkinlikKategorisi,
  FaaliyetDurumu,
  Kapsam,
  OnayDurumu,
  RolKodu,
  TemelEtkinlikGrubu,
} from "@/generated/prisma/enums";
import {
  danismanKurumKodu,
  danismanMi,
  disKullaniciMi,
  faaliyetOnayGerekiyorMu,
  ilKoordinatoruMu,
  koordinatorIlKodu,
  mezunMu,
  ogrenciMi,
  projeYoneticisiMi,
} from "../yetki/izinler";
import type { OturumKullanicisi } from "../yetki/tipler";

/**
 * Faaliyet iş kuralları — references/domain-rules.md Bölüm 5 ve 6.
 *
 * Saf tutulur: veritabanına gitmez, tarih üretmez (şimdiki zaman parametre
 * olarak alınır). Böylece "başvuru penceresi açık mı", "kontenjan doldu mu"
 * gibi kararlar birim testle sınanabilir.
 */

/** Dar kapsamdan geniş kapsama; ekranlardaki sıralama da budur. */
export const KAPSAMLAR: Kapsam[] = ["OKUL", "IL", "ULUSAL"];

export const KAPSAM_ETIKETLERI: Record<Kapsam, string> = {
  OKUL: "Okul içi",
  IL: "İl geneli",
  ULUSAL: "Ulusal",
};

export const ONAY_DURUMU_ETIKETLERI: Record<OnayDurumu, string> = {
  ONAY_GEREKMEZ: "Yayında",
  BEKLIYOR: "Onay bekliyor",
  ONAYLANDI: "Onaylandı",
  REDDEDILDI: "Reddedildi",
};

export const BASVURU_DURUMU_ETIKETLERI: Record<BasvuruDurumu, string> = {
  BEKLIYOR: "Değerlendirmede",
  SECILDI: "Seçildi",
  YEDEK: "Yedek",
  REDDEDILDI: "Reddedildi",
  GERI_CEKILDI: "Geri çekildi",
  IPTAL_EDILDI: "Etkinlik iptal edildi",
};

export const FAALIYET_DURUMU_ETIKETLERI: Record<FaaliyetDurumu, string> = {
  AKTIF: "Aktif",
  IPTAL_EDILDI: "İptal edildi",
};

// ---------------------------------------------------------------------------
// Etkinlik kategorisi
// ---------------------------------------------------------------------------

/**
 * Etkinlik kategorisi KAPSAMDAN BAĞIMSIZDIR. Kapsam kimin başvurabileceğini
 * (okul / il / ulusal), kategori etkinliğin ne olduğunu söyler. Her kapsam her
 * kategoriyle birleşebilir; ikisini birbirine bağlamayın.
 */
export const ETKINLIK_KATEGORILERI: EtkinlikKategorisi[] = [
  "TEMEL_ETKINLIK",
  "CALISMA_GRUBU_ETKINLIGI",
  "IL_ETKINLIGI",
];

export const ETKINLIK_KATEGORISI_ETIKETLERI: Record<
  EtkinlikKategorisi,
  string
> = {
  TEMEL_ETKINLIK: "Temel Etkinlik",
  CALISMA_GRUBU_ETKINLIGI: "Çalışma Grubu Etkinliği",
  IL_ETKINLIGI: "İl Etkinliği",
};

export const ETKINLIK_KATEGORISI_ACIKLAMALARI: Record<
  EtkinlikKategorisi,
  string
> = {
  TEMEL_ETKINLIK:
    "GençTek'in ulusal düzeyde her yıl tekrarlanan programları. Adı sabit listeden seçilir.",
  CALISMA_GRUBU_ETKINLIGI:
    "Çalışma grubu öğrencilerinin yıl boyunca planlayıp yürüttüğü programlar. Adı sabit listeden seçilir.",
  IL_ETKINLIGI:
    "İl koordinatörlüğünün kendi iline özel tasarladığı temalı etkinlik. Adını siz belirlersiniz.",
};

/**
 * Adı sabit programların iki grubu.
 *
 * Değerleri EtkinlikKategorisi'nin ilk iki değeriyle aynıdır ve etiketleri de
 * oradan okunur (ETKINLIK_KATEGORISI_ETIKETLERI); ayrı bir etiket tablosu
 * açmak, iki listenin zamanla birbirinden ayrılması demekti.
 */
export const TEMEL_ETKINLIK_GRUPLARI: TemelEtkinlikGrubu[] = [
  "TEMEL_ETKINLIK",
  "CALISMA_GRUBU_ETKINLIGI",
];

/**
 * Kategorinin sabit program listesinden ad seçmesi gerekiyor mu?
 *
 * İl Etkinliği'nin referans listesi YOKTUR — faaliyetin ad alanı zaten temayı
 * taşır. Diğer iki kategoride ad serbest metin DEĞİLDİR, programdan gelir.
 */
export function programSecimiGerekiyorMu(
  kategori: EtkinlikKategorisi,
): boolean {
  return kategori !== "IL_ETKINLIGI";
}

/** Kategorinin karşılık geldiği referans tablosu grubu. */
export function kategoriProgramGrubu(
  kategori: EtkinlikKategorisi,
): TemelEtkinlikGrubu | null {
  return kategori === "IL_ETKINLIGI" ? null : kategori;
}

export interface EtkinlikKategorisiGirdisi {
  kategori: EtkinlikKategorisi;
  /** Seçilen programın grubu; program seçilmediyse null. */
  programGrubu: TemelEtkinlikGrubu | null;
  /** İl etkinliğinde zorunlu olan serbest faaliyet adı. */
  serbestAd: string | null;
}

/**
 * Kategori ile program eşleşmesini doğrular.
 *
 * Veritabanı kısıtı "program dolu mu / boş mu" sorusunu tutar ama programın
 * DOĞRU GRUPTAN olduğunu tutamaz (kısıt iki tabloya birden bakamaz), o kontrol
 * burada yapılır.
 */
export function etkinlikKategorisiDogrula(
  girdi: EtkinlikKategorisiGirdisi,
): { olurMu: boolean; neden?: string } {
  if (!programSecimiGerekiyorMu(girdi.kategori)) {
    if (!girdi.serbestAd) {
      return { olurMu: false, neden: "İl Etkinliği'nde ad alanı zorunludur." };
    }
    return { olurMu: true };
  }

  /*
   * "DİĞER" YOLU: program seçilmediyse ama faaliyetin adı yazıldıysa kayıt
   * geçerlidir. Eskiden Temel Etkinlik ve Çalışma Grubu Etkinliği'nde ad
   * ZORUNLU olarak listeden geliyordu; listede olmayan bir etkinlik açmak
   * isteyen kişi kategoriyi İl Etkinliği'ne çevirmek zorunda kalıyor ve
   * etkinliğin gerçek niteliğini kaybediyordu.
   *
   * Program seçildiğinde grup kontrolü aynen sürüyor: yanlış gruptan program
   * seçilemez.
   */
  if (girdi.programGrubu === null) {
    if (girdi.serbestAd) return { olurMu: true };
    return {
      olurMu: false,
      neden: `${ETKINLIK_KATEGORISI_ETIKETLERI[girdi.kategori]} için listeden bir program seçin ya da "Diğer" işaretleyip etkinlik adını yazın.`,
    };
  }

  if (girdi.programGrubu !== kategoriProgramGrubu(girdi.kategori)) {
    return {
      olurMu: false,
      neden: "Seçilen program bu etkinlik kategorisine ait değil.",
    };
  }

  return { olurMu: true };
}

/**
 * Kullanıcının açabileceği kapsamlar.
 *
 * Danışman öğretmen yalnızca kendi okulunda faaliyet açar. YEĞİTEK'e okul
 * kapsamı SUNULMAZ: tek bir okulun faaliyetini o okulun sorumlusu açar, merkez
 * il ve ulusal düzeyde çalışır. Yetki matrisi (faaliyetAcabilirMi) merkeze okul
 * kapsamını da açık bırakır; burada yalnızca ekranda teklif edilenleri
 * belirliyoruz.
 *
 * Öğrenciye üç kapsam da açıktır çünkü hiçbiri kendiliğinden yayına girmez;
 * öğrencinin açtığı faaliyet her durumda onay bekler (bkz. onayDurumuBelirle).
 * Sıralama bilinçli olarak dar kapsamdan geniş kapsama: formda ilk seçenek
 * varsayılan olur ve öğrencinin olağan işi kendi okulundadır.
 *
 * MEZUN / PAYDAŞ / MENTÖR: il ve ulusal (7 Ağustos 2026 · "Etkinlik Bildir").
 * Okul kapsamı yok — kurum kodları olmadığı için "kendi okulu" diye bir yer
 * yok ve bir okulun içine etkinlik açmak o okulun sorumlusunun işidir.
 * Onları da onay koruyor: açtıkları hiçbir etkinlik doğrudan yayına girmez.
 */
export function kapsamSecenekleri(kullanici: OturumKullanicisi): Kapsam[] {
  if (projeYoneticisiMi(kullanici)) return ["IL", "ULUSAL"];
  if (ilKoordinatoruMu(kullanici)) return ["IL", "ULUSAL"];
  if (ogrenciMi(kullanici)) return ["OKUL", "IL", "ULUSAL"];
  if (disKullaniciMi(kullanici)) return ["IL", "ULUSAL"];
  if (danismanMi(kullanici)) return ["OKUL"];
  return [];
}

export function faaliyetAcmaYetkisiVarMi(
  kullanici: OturumKullanicisi,
): boolean {
  return kapsamSecenekleri(kullanici).length > 0;
}

/**
 * İl koordinatörünün açtığı ulusal faaliyet ve öğrencinin açtığı HER faaliyet
 * onay bekler.
 */
export function onayDurumuBelirle(
  kullanici: OturumKullanicisi,
  kapsam: Kapsam,
): OnayDurumu {
  return faaliyetOnayGerekiyorMu(kullanici, kapsam)
    ? "BEKLIYOR"
    : "ONAY_GEREKMEZ";
}

export class FaaliyetKuralHatasi extends Error {
  constructor(mesaj: string) {
    super(mesaj);
    this.name = "FaaliyetKuralHatasi";
  }
}

export interface FaaliyetYeri {
  kurumKodu: number | null;
  ilKodu: string | null;
}

/**
 * Faaliyetin yer alanlarını kullanıcının kapsamından üretir.
 *
 * Yer bilgisi FORMDAN GELMEZ, roldan gelir: aksi halde bir danışman öğretmen
 * başka okulun adına, bir koordinatör başka ilin adına faaliyet açabilirdi.
 * Tek istisna, YEĞİTEK'in il faaliyeti açarken ili seçmesidir.
 *
 * Öğrenci de aynı kuralın içindedir: okul içi önerisi kendi okuluna, il geneli
 * önerisi kendi iline yazılır. Öğrencinin ili rolden değil kayıtlı ilinden gelir
 * çünkü öğrenci rolünün il kapsamı yoktur.
 */
export function faaliyetYeriBelirle(
  kullanici: OturumKullanicisi,
  kapsam: Kapsam,
  secilenIlKodu?: string | null,
): FaaliyetYeri {
  switch (kapsam) {
    case "OKUL": {
      const kurumKodu = danismanKurumKodu(kullanici) ?? kullanici.kurumKodu;
      if (kurumKodu === null) {
        throw new FaaliyetKuralHatasi(
          "Okul içi etkinlik için okul bilgisi olan bir görev gerekir.",
        );
      }
      return { kurumKodu, ilKodu: null };
    }
    case "IL": {
      const ilKodu = projeYoneticisiMi(kullanici)
        ? (secilenIlKodu ?? null)
        : (koordinatorIlKodu(kullanici) ?? kullanici.ilKodu);
      if (!ilKodu) {
        throw new FaaliyetKuralHatasi("İl geneli etkinlik için il seçilmeli.");
      }
      return { kurumKodu: null, ilKodu };
    }
    case "ULUSAL":
      return { kurumKodu: null, ilKodu: null };
  }
}

/**
 * Faaliyet kartında görünen "düzenleyen birim" metni.
 *
 * Birim KAPSAMDAN değil AÇANDAN türer. İl koordinatörünün açtığı ulusal
 * faaliyet de onun koordinatörlüğünün adıyla anılır: merkez onayladı diye
 * faaliyet merkeze mal edilmez, çünkü katılımcı "bunu kim düzenliyor" sorusunun
 * cevabını burada arar.
 */
export function duzenleyenBirimBelirle(
  kullanici: OturumKullanicisi,
  kapsam: Kapsam,
  adlar: { okulAdi?: string | null; ilAdi?: string | null },
): string {
  /*
   * Öğrenci girişimi kartta AÇIKÇA yazılır. Katılımcı "bunu kim düzenliyor"
   * sorusunun cevabını buradan okur ve öğrencilerin kurduğu bir etkinlik,
   * koordinatörlüğün açtığından farklı bir şeydir — okulun adıyla anılması
   * etkinliği okul yönetimine mal ederdi.
   */
  if (ogrenciMi(kullanici)) {
    const yer = kapsam === "OKUL" ? adlar.okulAdi : adlar.ilAdi;
    return yer ? `${yer} · Öğrenci girişimi` : "Öğrenci girişimi";
  }
  /*
   * DIŞ KULLANICININ ETKİNLİĞİ KOORDİNATÖRLÜĞE MAL EDİLMEZ (7 Ağustos 2026).
   *
   * Aşağıdaki kural "il kapsamı + koordinatör değilse İl Koordinatörlüğü"
   * diyor; bu satır olmasaydı bir paydaşın önerdiği etkinlik kartta "Ankara İl
   * Koordinatörlüğü" imzasıyla çıkardı. Katılımcı "bunu kim düzenliyor"
   * sorusunun cevabını burada arıyor — öğrenci girişimindeki gerekçenin aynısı.
   */
  if (disKullaniciMi(kullanici)) {
    const sifat = mezunMu(kullanici) ? "Mezun girişimi" : "Paydaş girişimi";
    return adlar.ilAdi ? `${adlar.ilAdi} · ${sifat}` : sifat;
  }
  if (kapsam === "OKUL") return adlar.okulAdi ?? "Okul";
  if (ilKoordinatoruMu(kullanici) || (kapsam === "IL" && !projeYoneticisiMi(kullanici))) {
    return adlar.ilAdi ? `${adlar.ilAdi} İl Koordinatörlüğü` : "İl Koordinatörlüğü";
  }
  // YEĞİTEK'in açtığı il faaliyeti de merkez adına düzenlenir.
  if (kapsam === "IL") {
    return adlar.ilAdi ? `MEB YEĞİTEK · ${adlar.ilAdi}` : "MEB YEĞİTEK";
  }
  return "MEB YEĞİTEK";
}

export type PencereDurumu = "ACILMADI" | "ACIK" | "KAPANDI";

export function basvuruPenceresi(
  faaliyet: { basvuruBaslangic: Date; basvuruBitis: Date },
  simdi: Date,
): PencereDurumu {
  if (simdi < faaliyet.basvuruBaslangic) return "ACILMADI";
  if (simdi > faaliyet.basvuruBitis) return "KAPANDI";
  return "ACIK";
}

/**
 * Kontenjanı dolduran başvuru durumları.
 *
 * Kontenjan yalnızca SEÇİLENLERİ değil TÜM AKTİF BAŞVURULARI sınırlar: red ve
 * geri çekme dışındaki her başvuru bir yer tutar. Reddedilen ya da geri çekilen
 * başvurunun yeri anında boşalır.
 */
export const AKTIF_BASVURU_DURUMLARI: BasvuruDurumu[] = [
  "BEKLIYOR",
  "SECILDI",
  "YEDEK",
];

export interface KontenjanDurumu {
  kontenjan: number;
  secilen: number;
  bekleyen: number;
  yedek: number;
  /** Yer tutan başvuru sayısı: BEKLIYOR + SECILDI + YEDEK. */
  aktifBasvuru: number;
  kalanYer: number;
  doluMu: boolean;
}

/**
 * Kontenjan durumu — CANLI hesaplanır, sayaç tutulmaz.
 *
 * Statik bir sayaç tutulsaydı red/geri çekme sonrası açılan yerler sistemde
 * "dolu" görünmeye devam ederdi. Her başvuru denemesinde aktif başvurular
 * yeniden sayılır.
 */
export function kontenjanDurumu(
  basvurular: { durum: BasvuruDurumu }[],
  kontenjan: number,
): KontenjanDurumu {
  const say = (durum: BasvuruDurumu) =>
    basvurular.filter((basvuru) => basvuru.durum === durum).length;

  const secilen = say("SECILDI");
  const bekleyen = say("BEKLIYOR");
  const yedek = say("YEDEK");
  const aktifBasvuru = secilen + bekleyen + yedek;

  return {
    kontenjan,
    secilen,
    bekleyen,
    yedek,
    aktifBasvuru,
    kalanYer: Math.max(kontenjan - aktifBasvuru, 0),
    doluMu: aktifBasvuru >= kontenjan,
  };
}

/**
 * Kontenjan bu değerin altına DÜŞÜRÜLEMEZ.
 *
 * Zaten seçilmiş öğrencilerin seçimini geri almak anlamına gelirdi; düzenleme
 * ekranı bunu engeller (ör. 40 kişi seçilmişse kontenjan 30 yapılamaz).
 */
export function kontenjanAltSiniri(durum: KontenjanDurumu): number {
  return Math.max(durum.secilen, 1);
}

export function kontenjanDegisikligiGecerliMi(
  yeniKontenjan: number,
  durum: KontenjanDurumu,
): { olurMu: boolean; neden?: string } {
  if (!Number.isInteger(yeniKontenjan) || yeniKontenjan < 1) {
    return { olurMu: false, neden: "Kontenjan en az 1 olmalıdır." };
  }
  if (yeniKontenjan < durum.secilen) {
    return {
      olurMu: false,
      neden: `Kontenjan seçilen öğrenci sayısının (${durum.secilen}) altına düşürülemez.`,
    };
  }
  return { olurMu: true };
}

/**
 * Öğrencinin başvurabilmesi için: faaliyet iptal edilmemiş ve yayında olmalı,
 * pencere açık olmalı, aktif bir başvurusu bulunmamalı ve kontenjan dolmamış
 * olmalı.
 *
 * KONTENJAN ARTIK İLK BAŞVURUYU DA ENGELLER. Kontenjan aktif başvuru sayısını
 * sınırlar (yedek dahil); dolduğunda sistem yeni başvuru kabul etmez. Bir
 * başvuru reddedilir veya geri çekilirse yer anında açılır — bu yüzden dolu
 * olup olmadığı her denemede yeniden sayılır, sayaç tutulmaz.
 */
export function basvuruYapilabilirMi(girdi: {
  pencere: PencereDurumu;
  onayDurumu: OnayDurumu;
  faaliyetDurumu?: FaaliyetDurumu;
  mevcutBasvuruDurumu?: BasvuruDurumu | null;
  kontenjanDoluMu?: boolean;
}): { olurMu: boolean; neden?: string } {
  if (girdi.faaliyetDurumu === "IPTAL_EDILDI") {
    return { olurMu: false, neden: "Bu etkinlik iptal edildi." };
  }
  if (girdi.onayDurumu === "BEKLIYOR") {
    return { olurMu: false, neden: "Etkinlik henüz onaylanmadı." };
  }
  if (girdi.onayDurumu === "REDDEDILDI") {
    return { olurMu: false, neden: "Etkinlik reddedildi." };
  }
  if (girdi.pencere === "ACILMADI") {
    return { olurMu: false, neden: "Başvurular henüz açılmadı." };
  }
  if (girdi.pencere === "KAPANDI") {
    return { olurMu: false, neden: "Başvuru süresi doldu." };
  }
  if (
    girdi.mevcutBasvuruDurumu &&
    girdi.mevcutBasvuruDurumu !== "GERI_CEKILDI" &&
    girdi.mevcutBasvuruDurumu !== "IPTAL_EDILDI"
  ) {
    return { olurMu: false, neden: "Bu etkinliğe zaten başvurdunuz." };
  }
  if (girdi.kontenjanDoluMu) {
    return {
      olurMu: false,
      neden: "Kontenjan doldu; bu etkinliğe yeni başvuru alınamıyor.",
    };
  }
  return { olurMu: true };
}

// ---------------------------------------------------------------------------
// Katılımcı tipi ve vekaleten başvuru
// ---------------------------------------------------------------------------

/**
 * Katılımcının öğrenci mi öğretmen mi olduğu VERİDE TUTULMAZ, aktif rolünden
 * okunur (bkz. prisma/schema.prisma · Basvuru). Kopyalanan bir tip alanı,
 * öğrenci mezun olduğunda ya da öğretmen görev değiştirdiğinde eskirdi.
 */
export type KatilimciTipi = "OGRENCI" | "OGRETMEN";

export const KATILIMCI_TIPI_ETIKETLERI: Record<KatilimciTipi, string> = {
  OGRENCI: "Öğrenci",
  OGRETMEN: "Öğretmen",
};

export function katilimciTipi(
  roller: readonly { rolKodu: RolKodu }[],
): KatilimciTipi {
  return roller.some((rol) => rol.rolKodu === "OGRENCI")
    ? "OGRENCI"
    : "OGRETMEN";
}

/**
 * Danışman öğretmen / il koordinatörü başkasının adına başvurabilir mi?
 *
 * Üç sınır var:
 *   1. Vekaleten başvuru YALNIZCA ÖĞRENCİ için yapılır. Analiz dokümanı 4.2
 *      bunu öğrenci adına başvuru olarak tanımlıyor; bir öğretmenin başka bir
 *      öğretmen adına başvurması, katılımın kişisel kararı olmasına aykırı.
 *   2. Kişi kendi adına "vekaleten" başvuramaz — o zaten normal başvurudur ve
 *      veritabanında da kısıtla (ck_basvuru_vekalet_baskasi) engellenir.
 *   3. Öğrencinin o faaliyete aktif başvurusu varsa ikincisi açılmaz; bu
 *      kontrol basvuruYapilabilirMi'de, mevcut başvuru durumu üzerinden yapılır.
 *
 * Kapsam kontrolü (öğrenci bu kişinin kapsamında mı) BURADA YOKTUR ve
 * çağıranın sorumluluğundadır: bu dosya veritabanına bakmaz.
 */
export function vekaletenBasvuruGecerliMi(girdi: {
  hedefTipi: KatilimciTipi;
  vekilKullaniciId: number;
  hedefKullaniciId: number;
}): { olurMu: boolean; neden?: string } {
  if (girdi.hedefTipi !== "OGRENCI") {
    return {
      olurMu: false,
      neden: "Adına başvuru yalnızca öğrenciler için yapılabilir.",
    };
  }
  if (girdi.vekilKullaniciId === girdi.hedefKullaniciId) {
    return {
      olurMu: false,
      neden: "Kendi adınıza başvuruyu doğrudan yapabilirsiniz.",
    };
  }
  return { olurMu: true };
}

/**
 * Ulusal faaliyete başvuran öğrencinin danışmanına kopya bildirim gider mi?
 *
 * Kural yalnızca BAŞKA İLDEN yapılan başvuruyu kapsar
 * (references/domain-rules.md Bölüm 8): danışmanın haberdar olması gereken şey,
 * öğrencisinin kendi ilinin dışındaki bir organizasyona katılacak olmasıdır.
 * Onay aranmaz, bildirim salt haber niteliğindedir.
 *
 * YEĞİTEK'in açtığı ulusal faaliyetin bir ili yoktur; öğrenci "dışarıya"
 * başvurmuş sayılmaz ve kopya gitmez. Aksi halde her merkezî etkinlikte
 * ülkedeki bütün danışmanlar bildirim yağmuruna tutulurdu.
 */
export function danismanaKopyaGerekiyorMu(girdi: {
  kapsam: Kapsam;
  ogrenciIlKodu: string | null;
  /** Faaliyeti düzenleyen birimin ili; merkez düzenlediyse null. */
  duzenleyenIlKodu: string | null;
}): boolean {
  if (girdi.kapsam !== "ULUSAL") return false;
  if (girdi.duzenleyenIlKodu === null) return false;
  return girdi.ogrenciIlKodu !== girdi.duzenleyenIlKodu;
}

/**
 * Başvuru "seçildi" yapılabilir mi?
 *
 * Kontenjan aktif başvuruyu zaten sınırladığı için seçilen sayısı normal akışta
 * kontenjanı aşamaz; bu kontrol kontenjanın sonradan düşürüldüğü ya da veri
 * elle değiştirildiği durumlar için savunma hattıdır. Yedek ve red sınırsızdır:
 * ikisi de yer TUTMAZ değil, tutulan yeri serbest bırakır ya da korur.
 */
export function degerlendirmeYapilabilirMi(
  yeniDurum: BasvuruDurumu,
  durum: KontenjanDurumu,
): { olurMu: boolean; neden?: string } {
  if (yeniDurum === "SECILDI" && durum.secilen >= durum.kontenjan) {
    return {
      olurMu: false,
      neden: `Kontenjan dolu (${durum.secilen}/${durum.kontenjan}). Öğrenciyi yedek listesine alabilirsiniz.`,
    };
  }
  if (yeniDurum === "GERI_CEKILDI") {
    return {
      olurMu: false,
      neden: "Başvuruyu yalnızca öğrencinin kendisi geri çekebilir.",
    };
  }
  if (yeniDurum === "IPTAL_EDILDI") {
    return {
      olurMu: false,
      neden:
        "Bu durum yalnızca etkinlik iptal edildiğinde sistem tarafından yazılır.",
    };
  }
  return { olurMu: true };
}

// ---------------------------------------------------------------------------
// Faaliyet düzenleme ve iptal
// ---------------------------------------------------------------------------

/**
 * Onaylanmış ulusal faaliyette KRİTİK alanların değişmesi onayı düşürür.
 *
 * Proje yöneticisi belli bir tarihe ve kapsama onay verdi; bunlar değişirse
 * onay artık başka bir faaliyete ait olur. Yalnızca kontenjan ARTIŞI istisnadır:
 * daha çok öğrenciye kapı açmak onayın konusunu değiştirmez.
 */
export function yenidenOnayGerekiyorMu(girdi: {
  onayDurumu: OnayDurumu;
  tarihDegistiMi: boolean;
  kontenjanAzaldiMi: boolean;
}): boolean {
  if (girdi.onayDurumu !== "ONAYLANDI") return false;
  return girdi.tarihDegistiMi || girdi.kontenjanAzaldiMi;
}

/** İptal edilmiş faaliyet yeni içerik (yorum, dosya) kabul etmez. */
export function faaliyetIcerikAlabilirMi(durum: FaaliyetDurumu): boolean {
  return durum === "AKTIF";
}

// ---------------------------------------------------------------------------
// Faaliyet süresi
// ---------------------------------------------------------------------------

/**
 * Çok günlü faaliyetlerin süresi.
 *
 * Süre ayrı bir SAYI OLARAK TUTULMAZ, iki tarihten hesaplanır. Sayı tutulsaydı
 * tarih değiştiğinde güncellenmesi unutulur ve ekranda tarihle çelişen bir süre
 * görünürdü — "3 gün sürecek" yazan ama iki tarihi arası iki ay olan faaliyet.
 *
 * Bitiş yoksa faaliyet tek günlüktür; bu bir eksik veri değil, olağan durumdur.
 */
export function faaliyetSuresiGecerliMi(
  tarih: Date,
  bitisTarihi: Date | null,
): { olurMu: boolean; neden?: string } {
  if (bitisTarihi === null) return { olurMu: true };
  if (bitisTarihi < tarih) {
    return {
      olurMu: false,
      neden: "Etkinlik bitişi başlangıcından önce olamaz.",
    };
  }
  return { olurMu: true };
}

/**
 * Faaliyetin kaç gün sürdüğü. Aynı gün başlayıp biten faaliyet 1 gündür.
 *
 * Hesap gün başlarına indirgenerek yapılır: 1 Mart 18:00 – 2 Mart 09:00 arası
 * 15 saattir ama iki ayrı gündür ve kullanıcı "2 gün" bekler. Saat farkıyla
 * bölmek bunu "1 gün" gösterirdi.
 */
export function faaliyetSuresiGun(
  tarih: Date,
  bitisTarihi: Date | null,
): number {
  if (bitisTarihi === null) return 1;
  const gun = (t: Date) => Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
  const fark = gun(bitisTarihi) - gun(tarih);
  if (fark <= 0) return 1;
  return Math.round(fark / 86_400_000) + 1;
}

/** Süreyi ekranda yazmak için: "1 gün", "3 gün", "2 ay 5 gün" değil — sade. */
export function faaliyetSuresiYaz(
  tarih: Date,
  bitisTarihi: Date | null,
): string {
  return `${faaliyetSuresiGun(tarih, bitisTarihi)} gün`;
}
```

### `src/lib/faaliyet/rapor-kurallar.ts`

```ts
import type { FaaliyetDurumu } from "@/generated/prisma/enums";

/**
 * Faaliyet raporunun yazılabilirlik kuralları — analiz isteği Bölüm 4.
 *
 * Saf tutulur: veritabanına ve oturuma bakmaz. "Kim yazabilir" sorusunun yetki
 * tarafı `izinler.ts`tedir; burada yalnızca "faaliyet rapora hazır mı"
 * sorusu cevaplanır.
 */

const DEGERLENDIRME_MAKS = 5000;
const KAZANIM_MAKS = 3000;

/**
 * Faaliyet rapor yazmaya hazır mı?
 *
 * İKİ KOŞUL: bitmiş olmalı ve iptal edilmemiş olmalı.
 *
 * Bitiş, çok günlü faaliyette BİTİŞ tarihine bakar — üç aylık bir programın
 * raporu ilk gününde yazılamaz. İptal edilmiş faaliyetin raporu ise yoktur;
 * yapılmamış bir etkinliğin değerlendirmesi anlamsızdır (iptal gerekçesi zaten
 * faaliyetin kendisinde duruyor).
 */
export function raporYazilabilirMi(girdi: {
  tarih: Date;
  bitisTarihi: Date | null;
  durum: FaaliyetDurumu;
  simdi: Date;
}): { olurMu: boolean; neden?: string } {
  if (girdi.durum !== "AKTIF") {
    return {
      olurMu: false,
      neden: "İptal edilmiş etkinliğin raporu yazılmaz.",
    };
  }

  const bitis = girdi.bitisTarihi ?? girdi.tarih;
  if (girdi.simdi < bitis) {
    return {
      olurMu: false,
      neden: "Etkinlik henüz bitmedi; rapor bitiş tarihinden sonra yazılır.",
    };
  }

  return { olurMu: true };
}

/**
 * RAPOR ALANLARININ EKRANDAKİ ADLARI (11 Ağustos 2026 · istek: "etkinlik
 * raporunda Değerlendirme yazan yer bilgi notu olsun, özet bilgi yazsın,
 * Kazanımlar (isteğe bağlı) yazan yere sosyal medya / haber metni yazsın").
 *
 * VERİTABANI SÜTUNLARI DEĞİŞMEDİ (`degerlendirme`, `kazanimlar`): yazılmış
 * raporları taşımak, geri alınması pahalı bir işi bedavaya yapmak olurdu —
 * aynı karar talep türü etiketlerinde de verildi (bkz. lib/iletisim/kurallar).
 *
 * Adlar TEK YERDE duruyor çünkü üç yerde birden basılıyor: rapor ekranı, Word
 * çıktısı ve CSV çıktısı. Üçü ayrı yazılsaydı biri güncellenip öbürleri
 * unutulur, indirilen belge ekranda görünenden başka bir şey derdi.
 */
export const RAPOR_ALAN_ADLARI = {
  degerlendirme: "Bilgi notu",
  kazanimlar: "Sosyal medya / haber metni",
} as const;

export interface RaporGirdisi {
  degerlendirme: string;
  kazanimlar: string;
}

export type RaporKarari =
  | { olurMu: true; degerlendirme: string; kazanimlar: string | null }
  | { olurMu: false; neden: string };

/**
 * Rapor metnini doğrular.
 *
 * BİLGİ NOTU ZORUNLU, sosyal medya metni değil: bilgi notu olmayan bir kayıt
 * "rapor yazıldı" göstergesini yalancı çıkarır. Haber metni ise her faaliyette
 * yazılacak bir şey olmayabilir.
 *
 * Hata mesajları alan adlarını TEK KAYNAKTAN okur (RAPOR_ALAN_ADLARI): ekranda
 * "Bilgi notu" yazan alan için "Değerlendirme boş bırakılamaz" demek,
 * kullanıcıyı olmayan bir alanı aramaya gönderirdi.
 */
export function raporMetniniCoz(girdi: RaporGirdisi): RaporKarari {
  const degerlendirme = girdi.degerlendirme.trim();
  const kazanimlar = girdi.kazanimlar.trim();

  if (!degerlendirme) {
    return {
      olurMu: false,
      neden: `${RAPOR_ALAN_ADLARI.degerlendirme} boş bırakılamaz: raporun taşıdığı asıl bilgi budur.`,
    };
  }
  if (degerlendirme.length > DEGERLENDIRME_MAKS) {
    return {
      olurMu: false,
      neden: `${RAPOR_ALAN_ADLARI.degerlendirme} en fazla ${DEGERLENDIRME_MAKS} karakter olabilir.`,
    };
  }
  if (kazanimlar.length > KAZANIM_MAKS) {
    return {
      olurMu: false,
      neden: `${RAPOR_ALAN_ADLARI.kazanimlar} en fazla ${KAZANIM_MAKS} karakter olabilir.`,
    };
  }

  return { olurMu: true, degerlendirme, kazanimlar: kazanimlar || null };
}
```

### `src/lib/faaliyet/takvim.ts`

```ts
import type { FaaliyetDurumu, Kapsam } from "@/generated/prisma/enums";
import { basvuruPenceresi } from "./kurallar";

/**
 * Etkinlik takvimi — analiz dokümanı Bölüm 6: "Sisteme ilk girişte etkinlik
 * takvimi görülecek (geçmiş/aktif/yaklaşan)".
 *
 * Saf tutulur: veritabanına gitmez, şimdiki zamanı parametre alır. Böylece
 * "bu faaliyet bugün mü, yarın mı" kararı birim testle sınanabilir — takvim
 * ekranındaki en sinsi hata, sunucunun saatine göre kayan sınırlardır.
 */

export type TakvimBolumu = "GECMIS" | "BUGUN" | "YAKLASAN";

export interface TakvimKaydi {
  id: number;
  ad: string;
  tarih: Date;
  kapsam: Kapsam;
  durum: FaaliyetDurumu;
  basvuruBaslangic: Date;
  basvuruBitis: Date;
}

export interface Takvim<T> {
  bugun: T[];
  yaklasan: T[];
  gecmis: T[];
}

function gunBasi(tarih: Date): Date {
  return new Date(
    tarih.getFullYear(),
    tarih.getMonth(),
    tarih.getDate(),
    0,
    0,
    0,
    0,
  );
}

/**
 * Faaliyetin takvimdeki yeri.
 *
 * Karşılaştırma GÜN bazındadır, an bazında değil: sabah 10'da yapılan bir
 * etkinlik öğleden sonra bakıldığında "geçmiş" görünseydi, o günün programını
 * takip eden kullanıcı etkinliği listede kaybederdi.
 */
export function takvimBolumu(
  faaliyet: { tarih: Date },
  simdi: Date,
): TakvimBolumu {
  const gun = gunBasi(faaliyet.tarih).getTime();
  const bugun = gunBasi(simdi).getTime();

  if (gun === bugun) return "BUGUN";
  return gun > bugun ? "YAKLASAN" : "GECMIS";
}

/**
 * Faaliyetleri takvim bölümlerine ayırır.
 *
 * Yaklaşanlar en yakın tarihten uzağa, geçmişler en yeniden eskiye sıralanır:
 * iki listede de kullanıcının önce görmek istediği kayıt "şimdiye en yakın"
 * olandır.
 */
export function takvimeAyir<T extends { tarih: Date }>(
  faaliyetler: readonly T[],
  simdi: Date,
): Takvim<T> {
  const takvim: Takvim<T> = { bugun: [], yaklasan: [], gecmis: [] };

  for (const faaliyet of faaliyetler) {
    switch (takvimBolumu(faaliyet, simdi)) {
      case "BUGUN":
        takvim.bugun.push(faaliyet);
        break;
      case "YAKLASAN":
        takvim.yaklasan.push(faaliyet);
        break;
      case "GECMIS":
        takvim.gecmis.push(faaliyet);
        break;
    }
  }

  takvim.bugun.sort((a, b) => a.tarih.getTime() - b.tarih.getTime());
  takvim.yaklasan.sort((a, b) => a.tarih.getTime() - b.tarih.getTime());
  takvim.gecmis.sort((a, b) => b.tarih.getTime() - a.tarih.getTime());

  return takvim;
}

/**
 * Duyuru şeridine girecek faaliyetler: başvuru penceresi AÇIK olanlar.
 *
 * İptal edilmiş faaliyet şeride girmez — penceresi teknik olarak açık kalmış
 * olabilir ama başvuru alınmıyor ve şerit "şimdi başvurabilirsin" demektir.
 * Sıra, başvurusu önce KAPANACAK olandan başlar: kaçırılma riski en yüksek
 * olan kayıt en önde durmalı.
 */
export function seritteGosterilecekler<
  T extends { basvuruBaslangic: Date; basvuruBitis: Date; durum: FaaliyetDurumu },
>(faaliyetler: readonly T[], simdi: Date): T[] {
  return faaliyetler
    .filter(
      (faaliyet) =>
        faaliyet.durum === "AKTIF" &&
        basvuruPenceresi(faaliyet, simdi) === "ACIK",
    )
    .sort((a, b) => a.basvuruBitis.getTime() - b.basvuruBitis.getTime());
}

/**
 * Başvurunun kapanmasına kalan gün. Bugün kapanıyorsa 0 döner.
 *
 * Gün farkı yine GÜN BAŞLARI üzerinden hesaplanır; saat farkı yüzünden
 * "1 gün kaldı" ile "bugün son gün" arasında gidip gelen bir sayaç güven
 * vermez.
 */
export function kalanGun(bitis: Date, simdi: Date): number {
  const GUN = 24 * 60 * 60 * 1000;
  return Math.round((gunBasi(bitis).getTime() - gunBasi(simdi).getTime()) / GUN);
}

export function kalanGunYaz(bitis: Date, simdi: Date): string {
  const kalan = kalanGun(bitis, simdi);
  if (kalan <= 0) return "son gün";
  if (kalan === 1) return "son 1 gün";
  return `${kalan} gün kaldı`;
}

/**
 * ETKİNLİĞİN kendisine kalan süre — "bugün", "yarın", "5 gün kaldı".
 *
 * `kalanGunYaz`DAN AYRI ve öyle kalmalı: o, BAŞVURUNUN kapanmasını sayıyor ve
 * dili ona göre ("son gün", "son 1 gün") — kaçırılırsa geri dönüşü olmayan bir
 * pencereyi anlatıyor. Burada sayılan şey kişinin gideceği gün; "son gün"
 * demek, etkinliğin bittiğini sandırırdı. Aynı işlevi tek fonksiyona toplamak,
 * iki farklı olayı tek cümleyle anlatmaya çalışmak olurdu.
 *
 * Gün farkı yine GÜN BAŞLARI üzerinden (bkz. kalanGun): sabah 09.00'daki
 * etkinlik, aynı günün öğleden sonrasında da "bugün" olarak yazılmalı.
 * Geçmiş tarih gelirse "bugün" döner — çağıran zaten geçmişi sormuyor, ama
 * negatif bir sayacın ekrana düşmesi bu kartın anlamını tümden bozardı.
 */
export function etkinligeKalanYaz(tarih: Date, simdi: Date): string {
  const kalan = kalanGun(tarih, simdi);
  if (kalan <= 0) return "bugün";
  if (kalan === 1) return "yarın";
  return `${kalan} gün kaldı`;
}
```

### `src/lib/hedef/kurallar.ts`

```ts
import type { HedefDurumu } from "@/generated/prisma/enums";

/**
 * "Rotam" — öğrencinin hedefleri (D6).
 *
 * Saf kurallar: veritabanı, oturum ya da Next.js bilmez; girdi metinlerini
 * temizler ve kabul edilip edilmediğine karar verir. Sunucu eylemleri
 * (`app/panel/profil/hedef-eylemleri.ts`) yalnızca bu kararı uygular.
 *
 * KAZANIM KURALLARINDAN AYRI TUTULDU. İkisi de "kullanıcının kendi girdiği
 * metin" olsa da doğrulamaları örtüşmüyor: kazanımda tip zorunlu, tipe göre
 * alan açılıp kapanıyor ve tarih GEÇMİŞE bakıyor; hedefte tek biçim var ve
 * tarih GELECEĞE bakıyor. Ortak bir dosyada birleştirmek, her iki tarafın
 * kurallarını "hangi durumda hangisi geçerli" koşullarıyla iç içe geçirirdi.
 */

export const HEDEF_BASLIK_AZAMI = 250;
export const HEDEF_ACIKLAMA_AZAMI = 2000;

/**
 * Bir kişinin tutabileceği azami hedef sayısı.
 *
 * Sınır ÜRÜN gereği değil, taşma koruması: kayıt kişinin kendi profilinde
 * sınırsız satır açabilmesi demek ve profil sayfası hepsini tek seferde
 * basıyor. 30, "bu yıl ne yapmak istiyorum" ölçeğinde bir listeyi rahatça
 * alır; bir betiğin binlerce satır açmasını almaz.
 */
export const HEDEF_AZAMI_SAYI = 30;

export const HEDEF_DURUMLARI = [
  "PLANLANDI",
  "SURUYOR",
  "TAMAMLANDI",
] as const satisfies readonly HedefDurumu[];

export const HEDEF_DURUM_ETIKETLERI: Record<HedefDurumu, string> = {
  PLANLANDI: "Planladım",
  SURUYOR: "Üzerinde çalışıyorum",
  TAMAMLANDI: "Tamamladım",
};

/**
 * Durum rozetinin rengi. Tamamlanan hedef YEŞİL, süren MAVİ, planlanan NÖTR:
 * renk yalnızca ilerlemeyi gösterir, "planlandı" bir eksiklik değildir ve
 * uyarı rengiyle boyanmaz.
 */
export const HEDEF_DURUM_SINIFLARI: Record<HedefDurumu, string> = {
  PLANLANDI: "bg-yuzey-ikincil text-metin-yumusak",
  SURUYOR: "bg-vurgu-yumusak text-vurgu-metin",
  TAMAMLANDI: "bg-emerald-100 text-emerald-800",
};

export function hedefDurumuGecerliMi(deger: string): deger is HedefDurumu {
  return (HEDEF_DURUMLARI as readonly string[]).includes(deger);
}

export type HedefGirdisi = {
  baslik: string;
  aciklama: string;
  durum: string;
  /** Gün başına indirgenmiş tarih ya da null. */
  hedefTarihi: Date | null;
};

export type TemizHedef = {
  baslik: string;
  aciklama: string | null;
  durum: HedefDurumu;
  hedefTarihi: Date | null;
  tamamlanmaTarihi: Date | null;
};

export type HedefKarari =
  | { olurMu: false; neden: string }
  | { olurMu: true; kayit: TemizHedef };

/**
 * Hedef tarihi için üst sınır: bugünden 10 yıl sonrası.
 *
 * Alt sınır YOKTUR — geçmiş bir tarih kabul edilir. Öğrenci "Haziran'da
 * bitireyim" diye yazar, Haziran geçer ve hedef hâlâ sürüyor olabilir;
 * geçmiş tarihi reddetmek, kullanıcıyı kendi kaydını düzenleyemez hâle
 * getirirdi. Üst sınır ise parmak hatası içindir (2026 yerine 20260).
 */
const AZAMI_YIL_ILERI = 10;

export function hedefKabulEdilirMi(
  girdi: HedefGirdisi,
  simdi: Date = new Date(),
): HedefKarari {
  const baslik = girdi.baslik.trim();
  if (baslik.length === 0) return { olurMu: false, neden: "Hedef başlığı boş olamaz." };
  if (baslik.length > HEDEF_BASLIK_AZAMI) {
    return {
      olurMu: false,
      neden: `Hedef başlığı en fazla ${HEDEF_BASLIK_AZAMI} karakter olabilir.`,
    };
  }

  const aciklama = girdi.aciklama.trim();
  if (aciklama.length > HEDEF_ACIKLAMA_AZAMI) {
    return {
      olurMu: false,
      neden: `Açıklama en fazla ${HEDEF_ACIKLAMA_AZAMI} karakter olabilir.`,
    };
  }

  if (!hedefDurumuGecerliMi(girdi.durum)) {
    return { olurMu: false, neden: "Hedef durumu geçersiz." };
  }

  if (girdi.hedefTarihi !== null) {
    if (Number.isNaN(girdi.hedefTarihi.getTime())) {
      return { olurMu: false, neden: "Hedef tarihi geçersiz." };
    }
    const ustSinir = new Date(simdi);
    ustSinir.setFullYear(ustSinir.getFullYear() + AZAMI_YIL_ILERI);
    if (girdi.hedefTarihi > ustSinir) {
      return {
        olurMu: false,
        neden: `Hedef tarihi en fazla ${AZAMI_YIL_ILERI} yıl sonrası olabilir.`,
      };
    }
  }

  return {
    olurMu: true,
    kayit: {
      baslik,
      aciklama: aciklama || null,
      durum: girdi.durum,
      hedefTarihi: girdi.hedefTarihi,
      // Kayıt TAMAMLANDI olarak açılabilir (geçmişte yaptığı bir şeyi rotasına
      // sonradan yazan öğrenci). O durumda tamamlanma anı "şimdi"dir.
      tamamlanmaTarihi: girdi.durum === "TAMAMLANDI" ? simdi : null,
    },
  };
}

/**
 * Durum değişiminde `tamamlanmaTarihi`nin ne olacağı.
 *
 * Üç ayrı yerde (ekleme, düzenleme, tek tıkla durum değiştirme) aynı kararın
 * elle tekrarlanması, birinde unutulunca "tamamlandı ama tarihi yok" ya da
 * "tamamlanmadı ama tarihi var" kayıtları üretirdi.
 *
 * TAMAMLANDI → TAMAMLANDI geçişinde eski tarih KORUNUR: hedefin başlığını
 * düzenlemek, onu bugün tamamlanmış göstermemeli.
 */
export function tamamlanmaTarihiniCoz(
  yeniDurum: HedefDurumu,
  oncekiDurum: HedefDurumu | null,
  oncekiTarih: Date | null,
  simdi: Date = new Date(),
): Date | null {
  if (yeniDurum !== "TAMAMLANDI") return null;
  if (oncekiDurum === "TAMAMLANDI" && oncekiTarih !== null) return oncekiTarih;
  return simdi;
}

export type HedefOzeti = { toplam: number; tamamlanan: number; suren: number };

/** Kart başlığındaki "3 hedeften 1'i tamamlandı" özeti. */
export function hedefOzeti(
  hedefler: readonly { durum: HedefDurumu }[],
): HedefOzeti {
  return {
    toplam: hedefler.length,
    tamamlanan: hedefler.filter((h) => h.durum === "TAMAMLANDI").length,
    suren: hedefler.filter((h) => h.durum === "SURUYOR").length,
  };
}

/**
 * Listeleme sırası: önce SÜREN, sonra PLANLANAN, en sonda TAMAMLANAN.
 *
 * Tamamlananlar dibe iner çünkü rota İLERİYE bakar; biten işler listeyi
 * tıkamamalı. Aynı durum içinde tarihi olan öne gelir (yakın tarih önce),
 * tarihi olmayanlar en sona düşer — tarihsiz hedef "bir gün" demektir.
 */
const DURUM_SIRASI: Record<HedefDurumu, number> = {
  SURUYOR: 0,
  PLANLANDI: 1,
  TAMAMLANDI: 2,
};

export function hedefleriSirala<
  T extends { durum: HedefDurumu; hedefTarihi: Date | null; id: number },
>(hedefler: readonly T[]): T[] {
  return [...hedefler].sort((a, b) => {
    const durumFarki = DURUM_SIRASI[a.durum] - DURUM_SIRASI[b.durum];
    if (durumFarki !== 0) return durumFarki;

    if (a.hedefTarihi === null && b.hedefTarihi !== null) return 1;
    if (a.hedefTarihi !== null && b.hedefTarihi === null) return -1;
    if (a.hedefTarihi !== null && b.hedefTarihi !== null) {
      const tarihFarki = a.hedefTarihi.getTime() - b.hedefTarihi.getTime();
      if (tarihFarki !== 0) return tarihFarki;
    }

    // Son kırıcı: aynı durum ve aynı tarihte sıra RASTGELE olmamalı, yoksa
    // sayfa her yenilendiğinde satırlar yer değiştirir.
    return a.id - b.id;
  });
}
```

### `src/lib/iletisim/kurallar.ts`

```ts
import type { OnayDurumu, TalepTuru } from "@/generated/prisma/enums";

/**
 * İletişim modülü kuralları — analiz isteği Bölüm 6.
 *
 * TEK CÜMLELİK TASARIM İLKESİ: gizli kanal yoktur.
 *
 * Yazışmalar, tarafların danışman öğretmenlerine, illerinin koordinatörlerine
 * ve proje yöneticilerine tam içerikle görünür. Kullanıcıların çoğu 18 yaş
 * altı; mahremiyet vaadi verilmiyor çünkü verilseydi tutulamazdı. Bu kural
 * ekranda kalıcı olarak yazılı ve aydınlatma metninde beyan edilmiş durumda —
 * gizli görünen ama okunan bir kanal, hiç olmamasından kötüdür.
 *
 * Saf tutulur: veritabanına ve oturuma bakmaz, birim testle kapsanır.
 */

const TALEP_BASLIK_MAKS = 200;
const TALEP_ICERIK_MAKS = 2000;
const ISTEK_MESAJ_MAKS = 1000;
const MESAJ_MAKS = 2000;

/**
 * PANODA GÖRÜNEN ONAY DURUMLARI (14 Ağustos 2026 · istek: "panodaki öğrenci
 * ilanları şimdilik proje yöneticilerine düşsün oradan onay versin").
 *
 * İKİ DEĞER, TEK ANLAM: `ONAY_GEREKMEZ` onaydan hiç geçmemiş ilandır (öğrenci
 * dışındakilerin açtıkları ve sütun eklenmeden önce açılmış olanlar),
 * `ONAYLANDI` ise geçmiş olandır. Panonun sorusu "onaylandı mı" değil "bugün
 * görünüyor mu" ve cevabı bu ikisidir.
 *
 * Liste sorgularında `where: { onayDurumu: { in: PANODA_GORUNEN_ONAY_DURUMLARI } }`
 * diye kullanılır; tek yerden okunuyor ki panoya bir ekran daha bakmaya
 * başladığında (mentör sayfası, bağlantı isteği) filtre unutulmasın.
 */
export const PANODA_GORUNEN_ONAY_DURUMLARI: OnayDurumu[] = [
  "ONAY_GEREKMEZ",
  "ONAYLANDI",
];

/**
 * İlanın panoda görünür olması için: kapatılmamış, süresi dolmamış ve onaydan
 * düşmemiş.
 *
 * ONAY 14 AĞUSTOS 2026'DA EKLENDİ. Kapanmış ilanla onay bekleyen ilan aynı
 * kapıdan geçiyor çünkü ikisinin de sonucu aynı: ilan panoda yok, üstünde
 * işlem yapılamaz. Cevap yazma ve bağlantı isteği bu yardımcıya bakıyor —
 * ayrı ayrı kontrol edilselerdi biri güncellenip diğeri unutulurdu.
 */
export function talepAktifMi(talep: {
  kapatildiMi: boolean;
  sonGecerlilik: Date;
  onayDurumu: OnayDurumu;
  simdi: Date;
}): boolean {
  if (talep.kapatildiMi) return false;
  if (!PANODA_GORUNEN_ONAY_DURUMLARI.includes(talep.onayDurumu)) return false;
  return talep.sonGecerlilik >= talep.simdi;
}

/**
 * Talep türleri.
 *
 * SABİT LİSTE, çalışma grupları gibi yönetim ekranından büyütülebilir değil:
 * her biri ekranda ayrı bir anlam taşıyor (sponsor ilanı ile ekip arkadaşı
 * ilanı aynı kitleye bakmıyor). Yeni bir tür enum'a eklenir — bu bir
 * migration'dır ve öyle olmalı: tür listesi büyüdüğünde kimin ne göreceği
 * yeniden düşünülmeli.
 *
 * 7 AĞUSTOS 2026 · istekteki dört başlık: "Destek Talebi / Mentöre sor /
 * Genel / Ekip Arkadaşı arama".
 *
 * - `MENTORE_SOR` **yeni tür**. `TEKNIK_DESTEK`'ten ayrı: o bir SORUNU
 *   çözdürmek için açılır ("kodum çalışmıyor"), bu bir YOL sorar ("hangi alana
 *   gitmeliyim"). Tek türde toplansalardı mentor arayan öğrenci teknik
 *   soruların arasında kaybolurdu.
 * - `TEKNIK_DESTEK` ve `DUYURU` **yalnızca etiket olarak** yeniden
 *   adlandırıldı ("Destek talebi", "Genel"). Enum değerleri korundu: etiket
 *   değişikliği için veri taşımak, geri alınması pahalı bir işi bedavaya
 *   yapmak olurdu.
 * - `SPONSOR` **kapatılmadı** — açılmış ilanları türsüz bırakmamak için
 *   listede duruyor. İstekteki dörtlüde yok ama var olan ilanların bir süzgeci
 *   olmalı.
 *
 * Sıra istekteki sırayla aynı; ekrandaki süzgeç ve seçim listesi bunu okur.
 */
/*
 * `GENEL` 14 AĞUSTOS 2026'DA EKLENDİ (istek: "kategoriler olsun, teknik destek
 * talebi, duyuru / tanıtım desteği, ekip arkadaşı arama ve genel şeklinde").
 *
 * `DUYURU`YU YENİDEN "Genel" YAPMAK YETMEZDİ: o değerin etiketi bir zamanlar
 * "Genel"di ve 11 Ağustos'ta "Duyuru / tanıtım desteği" oldu; istek ikisini
 * AYNI ANDA listeliyor, yani artık iki ayrı kategori. Etiket değiştirmek,
 * duyuru ilanlarını sessizce "genel" kutusuna taşımak olurdu.
 */
export const TALEP_TURLERI: TalepTuru[] = [
  "TEKNIK_DESTEK",
  "MENTORE_SOR",
  "DUYURU",
  "EKIP_ARKADASI",
  "GENEL",
  "SPONSOR",
];

/*
 * ETİKETLER 11 AĞUSTOS 2026'DA GÜNCELLENDİ (istek: "destek talebi - teknik
 * destek talebi olsun … duyuru tanıtım desteği açılsın").
 *
 * İkisi de yalnızca ETİKET değişikliği; enum değerleri korundu. "Destek
 * talebi" neyin desteği olduğunu söylemiyordu ve panoda mentör talebiyle
 * karışıyordu; "Genel" ise ilanın ne olduğunu hiç anlatmıyordu.
 */
export const TALEP_TURU_ETIKETLERI: Record<TalepTuru, string> = {
  TEKNIK_DESTEK: "Teknik destek talebi",
  MENTORE_SOR: "Mentöre sor",
  DUYURU: "Duyuru / tanıtım desteği",
  EKIP_ARKADASI: "Ekip arkadaşı arama",
  GENEL: "Genel",
  SPONSOR: "Sponsor",
};

/** Türü olmayan eski ilanlar için filtre ve rozet etiketi. */
export const TALEP_TURU_BELIRTILMEMIS = "Tür belirtilmemiş";

/**
 * PANODAN AÇILABİLEN TÜRLER (10 Ağustos 2026 · istek: panoda "alt alta iki
 * alan olacak … biri destek talebi aç diğeri mentör talebi aç").
 *
 * Ekranda tür seçimi kalmadı: iki ayrı form var ve türü form belirliyor. Gizli
 * form alanı kurcalanabilir bir alandır, o yüzden kapı sunucuda da duruyor —
 * ekrandan kaldırılan bir seçeneğin istekle geri gelebilmesi, kaldırılmamış
 * olması demektir.
 *
 * KALAN TÜRLER OKUNMAYA DEVAM EDER: ekip arkadaşı, genel ve sponsor ilanları
 * panoda listeleniyor, rozetleri basılıyor ve tür süzgecinde seçilebiliyor;
 * yalnızca YENİSİ açılamıyor. Bu ayrım bilinçli — açılmış ilanları görünmez
 * yapmak, sahiplerinin beklediği bağlantıyı sessizce keserdi.
 */
/*
 * 14 AĞUSTOS 2026 · istek: "talep oluştururken kategori olsun … teknik destek
 * talebi, duyuru / tanıtım desteği, ekip arkadaşı arama ve genel".
 *
 * TÜR SEÇİMİ GERİ GELDİ ama 10 Ağustos'taki hâline değil: o gün kalkan şey tek
 * formda "hangi türü seçmeliyim" kararıydı ve o karar hâlâ yok — mentör talebi
 * AYRI ekranda, türü sabit. Geri gelen, destek/duyuru formunun içindeki
 * KATEGORİ listesi (bkz. PANO_KATEGORILERI).
 */
export const PANODAN_ACILABILIR_TURLER: TalepTuru[] = [
  "TEKNIK_DESTEK",
  "MENTORE_SOR",
  "DUYURU",
  "EKIP_ARKADASI",
  "GENEL",
];

/**
 * Destek/duyuru formundaki KATEGORİ listesi (14 Ağustos 2026).
 *
 * `MENTORE_SOR` burada YOK: mentör talebinin kendi ekranı ve kendi mentör
 * havuzu var, kategori listesine konsaydı aynı ilan iki ayrı kapıdan
 * açılabilirdi. `SPONSOR` da yok — 11 Ağustos'ta kaldırılmıştı, açılmış
 * ilanları listede durmaya devam ediyor.
 *
 * SÜZGEÇ LİSTESİYLE AYNI DÖRTLÜ (bkz. SUZGEC_TURLERI): istek ikisini tek
 * cümlede söylüyor ("pano daki arama kutusundaki kategoriler olsun"), yani
 * kullanıcı ne açabiliyorsa ona göre süzebiliyor.
 */
export const PANO_KATEGORILERI: TalepTuru[] = [
  "TEKNIK_DESTEK",
  "DUYURU",
  "EKIP_ARKADASI",
  "GENEL",
];

/**
 * TÜR SÜZGECİNDE GÖSTERİLEN türler (11 Ağustos 2026 · istek: "Talep türü
 * sponsoru kaldıralım").
 *
 * `TALEP_TURLERI`DEN AYRI BİR LİSTE ve ayrılığın sebebi şu: o liste enum'un
 * TAMAMIDIR ve iki işi daha var — `talepTuruGecerliMi` doğrulaması ile rozet
 * etiketlerinin kaynağı. Sponsor oradan silinseydi, açılmış sponsor ilanları
 * "geçersiz tür" sayılır ve panodaki rozetleri bozulurdu; oysa istek yalnızca
 * SÜZGEÇTEN kaldırmak.
 *
 * SPONSOR İLANLARI PANODA DURMAYA DEVAM EDER — listede görünür, rozeti basılır.
 * Kaybolan tek şey, o türe göre süzme seçeneği. Açılmış ilanları görünmez
 * yapmak, sahiplerinin beklediği bağlantıyı sessizce keserdi (aynı gerekçe
 * PANODAN_ACILABILIR_TURLER notunda da var).
 */
/*
 * MENTÖRE SOR DA SÜZGEÇTEN KALKTI (11 Ağustos 2026 · istek: "panodan arama
 * kısmında … mentöre sor kalksın"). Sponsorla aynı ilke: tür ENUM'da duruyor,
 * ilanı açılmaya devam ediyor ve panoda rozetiyle listeleniyor — kaybolan tek
 * şey o türe göre süzme seçeneği.
 */
/*
 * 14 Ağustos 2026'DA LİSTE İSTENEN DÖRTLÜYE OTURDU: enum'a `GENEL` eklenince
 * bu iki çıkarmadan geriye tam olarak istekteki kategoriler kalıyor (teknik
 * destek talebi, duyuru / tanıtım desteği, ekip arkadaşı arama, genel). Süzgeç
 * yine ÇIKARARAK kuruluyor, elle sayarak değil: enum'a yeni bir tür
 * eklendiğinde süzgeçte kendiliğinden görünmesi doğru varsayılan.
 */
const SUZGECTEN_CIKARILANLAR: TalepTuru[] = ["SPONSOR", "MENTORE_SOR"];

export const SUZGEC_TURLERI: TalepTuru[] = TALEP_TURLERI.filter(
  (tur) => !SUZGECTEN_CIKARILANLAR.includes(tur),
);

export function talepTuruGecerliMi(deger: string): deger is TalepTuru {
  return (TALEP_TURLERI as string[]).includes(deger);
}

export interface TalepGirdisi {
  baslik: string;
  icerik: string;
  sonGecerlilik: Date | null;
  tur: string | null;
}

export type TalepKarari =
  | {
      olurMu: true;
      baslik: string;
      icerik: string;
      sonGecerlilik: Date;
      tur: TalepTuru;
    }
  | { olurMu: false; neden: string };

/** Panoya ilan açarken en fazla ileri gidilebilecek gün sayısı. */
export const TALEP_AZAMI_GUN = 180;

/**
 * İlan girdisini çözer; yeni ilanda da DÜZENLEMEDE de aynı kapı.
 *
 * `izinliTurler` VARSAYILANDAN AYRILABİLİYOR (14 Ağustos 2026 · düzenleme
 * yetkisi): açılmış eski bir ilan artık açılamayan bir türde olabilir (sponsor,
 * mentöre sor). Düzenleme o ilanın KENDİ türünü listeye ekleyerek çağırıyor —
 * aksi hâlde tek bir yazım hatasını düzeltmek, ilanın türünü değiştirmeye
 * zorlardı.
 */
export function talebiCoz(
  girdi: TalepGirdisi,
  simdi: Date,
  izinliTurler: TalepTuru[] = PANODAN_ACILABILIR_TURLER,
): TalepKarari {
  const baslik = girdi.baslik.trim();
  const icerik = girdi.icerik.trim();

  /*
   * TÜR YENİ İLANLARDA ZORUNLU (6 Ağustos 2026). Sütun NULL kabul etmeye devam
   * ediyor ve eski ilanlar geriye dönük DOLDURULMADI: türü bilinmeyen bir ilana
   * "duyuru" demek, filtrelenen listeyi sessizce yanlışlardı. Kural yalnızca bu
   * kapıdan geçen yeni ilana uygulanır.
   */
  const ham = (girdi.tur ?? "").trim();
  if (!ham) return { olurMu: false, neden: "Talep türü seçilmelidir." };
  if (!talepTuruGecerliMi(ham)) {
    return { olurMu: false, neden: "Talep türü anlaşılamadı." };
  }
  const tur: TalepTuru = ham;
  /*
   * Kategori ekrandaki seçim listesinden geliyor (destek/duyuru formu) ya da
   * gizli alandan (mentör talebi). İkisi de kurcalanabilir alanlardır; kapı bu
   * yüzden sunucuda duruyor — ekrandan kaldırılmış bir seçeneğin istekle geri
   * gelebilmesi, kaldırılmamış olması demektir.
   */
  if (!izinliTurler.includes(tur)) {
    return {
      olurMu: false,
      neden: "Bu kategoride ilan açılamaz.",
    };
  }

  if (!baslik) return { olurMu: false, neden: "İlan başlığı boş bırakılamaz." };
  if (baslik.length > TALEP_BASLIK_MAKS) {
    return {
      olurMu: false,
      neden: `Başlık en fazla ${TALEP_BASLIK_MAKS} karakter olabilir.`,
    };
  }
  if (!icerik) return { olurMu: false, neden: "İlan metni boş bırakılamaz." };
  if (icerik.length > TALEP_ICERIK_MAKS) {
    return {
      olurMu: false,
      neden: `İlan metni en fazla ${TALEP_ICERIK_MAKS} karakter olabilir.`,
    };
  }

  if (girdi.sonGecerlilik === null) {
    return { olurMu: false, neden: "Son geçerlilik tarihi seçilmelidir." };
  }
  if (girdi.sonGecerlilik <= simdi) {
    return {
      olurMu: false,
      neden: "Son geçerlilik tarihi bugünden sonra olmalıdır.",
    };
  }

  /*
   * Üst sınır var çünkü sınırsız ilan pano çürümesi demek: iki yıl önce
   * açılmış, sahibi mezun olmuş bir ilan listede durmaya devam ederdi.
   */
  const azami = new Date(simdi.getTime() + TALEP_AZAMI_GUN * 86_400_000);
  if (girdi.sonGecerlilik > azami) {
    return {
      olurMu: false,
      neden: `Son geçerlilik en fazla ${TALEP_AZAMI_GUN} gün sonrası olabilir.`,
    };
  }

  return {
    olurMu: true,
    baslik,
    icerik,
    sonGecerlilik: girdi.sonGecerlilik,
    tur,
  };
}

/**
 * Bağlantı isteği gönderilebilir mi?
 *
 * Kendine istek gönderilemez ve aynı kişiye ikinci bir BEKLEYEN istek
 * açılamaz — reddedilen bir isteği tekrar tekrar göndermek taciz aracına
 * dönüşürdü. Karara bağlanmış istek geçmişte kalır, yenisi açılabilir.
 */
export function baglantiIstegiGonderilebilirMi(girdi: {
  isteyenId: number;
  hedefId: number;
  bekleyenIstekVarMi: boolean;
  onayliBaglantiVarMi: boolean;
}): { olurMu: boolean; neden?: string } {
  if (girdi.isteyenId === girdi.hedefId) {
    return { olurMu: false, neden: "Kendinize bağlantı isteği gönderemezsiniz." };
  }
  if (girdi.onayliBaglantiVarMi) {
    return {
      olurMu: false,
      neden: "Bu kişiyle zaten bir yazışmanız var.",
    };
  }
  if (girdi.bekleyenIstekVarMi) {
    return {
      olurMu: false,
      neden: "Bu kişiye gönderdiğiniz bir istek zaten onay bekliyor.",
    };
  }
  return { olurMu: true };
}

export interface IstekKarari {
  onaylandiMi: boolean;
  gerekce: string;
}

export type IstekSonucu =
  | { olurMu: true; durum: OnayDurumu; gerekce: string | null }
  | { olurMu: false; neden: string };

/**
 * Bağlantı isteğine verilen karar.
 *
 * Ret gerekçesi zorunlu: öğrenci neden bağlanamadığını öğrenmeli. Onayda
 * söylenecek bir şey yok.
 */
export function istekKarariniCoz(karar: IstekKarari): IstekSonucu {
  const gerekce = karar.gerekce.trim();
  if (karar.onaylandiMi) {
    return { olurMu: true, durum: "ONAYLANDI", gerekce: gerekce || null };
  }
  if (!gerekce) {
    return {
      olurMu: false,
      neden: "Ret gerekçesi zorunludur: öğrenci nedenini görmeli.",
    };
  }
  return { olurMu: true, durum: "REDDEDILDI", gerekce };
}

/**
 * PANO İLANININ ONAY/RET KARARI (14 Ağustos 2026).
 *
 * `istekKarariniCoz` ile AYNI KURAL, yeni bir kopya değil: onayda gerekçe
 * isteğe bağlı, redde zorunlu. İki ayrı işlev yazılsaydı, "ret gerekçesi
 * zorunlu mudur" sorusunun sistemde iki cevabı olurdu ve biri zamanla
 * yumuşardı. Ad ayrı çünkü çağıran ekran bağlantı isteğine değil ilana bakıyor.
 */
export const ilanKarariniCoz = istekKarariniCoz;

/**
 * İlan sahibinin "Açık ilanlarım" listesinde okuduğu durum etiketi.
 *
 * `ONAY_GEREKMEZ` ETİKETSİZDİR (null): onaydan hiç geçmemiş ilan yayımdadır ve
 * ona "onay gerekmez" rozeti basmak, olmayan bir süreci varmış gibi gösterirdi.
 */
export const PANO_ILANI_DURUM_ETIKETLERI: Record<OnayDurumu, string | null> = {
  ONAY_GEREKMEZ: null,
  BEKLIYOR: "Onay bekliyor",
  ONAYLANDI: "Onaylandı",
  REDDEDILDI: "Reddedildi",
};

/** Yazışmaya mesaj yazılabilir mi? */
export function mesajYazilabilirMi(girdi: {
  onayDurumu: OnayDurumu;
  yazismaKapatildiMi: boolean;
}): { olurMu: boolean; neden?: string } {
  if (girdi.onayDurumu !== "ONAYLANDI") {
    return { olurMu: false, neden: "Bu bağlantı onaylanmadı." };
  }
  if (girdi.yazismaKapatildiMi) {
    return {
      olurMu: false,
      neden: "Bu yazışma kapatıldı; yeni mesaj yazılamaz.",
    };
  }
  return { olurMu: true };
}

export function mesajMetniniCoz(
  metin: string,
): { olurMu: true; icerik: string } | { olurMu: false; neden: string } {
  const icerik = metin.trim();
  if (!icerik) return { olurMu: false, neden: "Mesaj boş olamaz." };
  if (icerik.length > MESAJ_MAKS) {
    return {
      olurMu: false,
      neden: `Mesaj en fazla ${MESAJ_MAKS} karakter olabilir.`,
    };
  }
  return { olurMu: true, icerik };
}

/**
 * Panodaki ilana yazılan CEVAP metni (13 Ağustos 2026 · mentör sayfası).
 *
 * Sınır mesajlarla aynı (`MESAJ_MAKS`): cevap da bir metin kutusudur ve
 * mentörden kısa, okunabilir bir yanıt bekleniyor. Ayrı bir sabit tanımlamak,
 * iki sınırın zamanla ayrışmasına ve "hangi kutuda ne kadar yazabiliyorum"
 * sorusuna yol açardı.
 */
export function cevapMetniniCoz(
  metin: string,
): { olurMu: true; icerik: string } | { olurMu: false; neden: string } {
  const icerik = metin.trim();
  if (!icerik) return { olurMu: false, neden: "Cevap boş olamaz." };
  if (icerik.length > MESAJ_MAKS) {
    return {
      olurMu: false,
      neden: `Cevap en fazla ${MESAJ_MAKS} karakter olabilir.`,
    };
  }
  return { olurMu: true, icerik };
}

export function istekMesajiniCoz(
  metin: string,
): { olurMu: true; mesaj: string } | { olurMu: false; neden: string } {
  const mesaj = metin.trim();
  if (!mesaj) {
    return {
      olurMu: false,
      neden: "Kendinizi tanıtan bir mesaj yazın; istek buna göre değerlendirilir.",
    };
  }
  if (mesaj.length > ISTEK_MESAJ_MAKS) {
    return {
      olurMu: false,
      neden: `Mesaj en fazla ${ISTEK_MESAJ_MAKS} karakter olabilir.`,
    };
  }
  return { olurMu: true, mesaj };
}

/**
 * Ekranda kalıcı olarak gösterilecek uyarı.
 *
 * Sabit olarak burada duruyor ki her ekranda aynı cümle çıksın; farklı
 * yerlerde farklı ifadelerle yazılsaydı bazıları zamanla yumuşar ve
 * "aslında kimse okumuyor" izlenimi doğardı.
 */
export const GIZLILIK_UYARISI =
  "Bu sistemdeki yazışmalar gizli değildir. Mesajlarınızı danışman öğretmeniniz, il koordinatörünüz ve proje yöneticileri okuyabilir.";
```

### `src/lib/kazanim/katilim-kurallar.ts`

```ts
import type { EtkinlikKategorisi, Kapsam } from "@/generated/prisma/enums";

/**
 * "Katıldığı GençTek etkinlikleri" listesine neyin gireceği (7 Ağustos 2026).
 *
 * Saf tutulur: veritabanına ve React'e bakmaz, birim testle kapsanır. Sorgunun
 * kendisi `getir.ts` içinde; buradaki iş yalnızca KARAR.
 *
 * ---------------------------------------------------------------------------
 * KURALIN DEĞİŞMESİ
 * ---------------------------------------------------------------------------
 * Eski kural: "başvurusu SEÇİLDİ + tarihi geçti". Yani katılımcı listesine
 * alınan herkes, etkinliğe gelmese bile profilinde katılmış görünüyordu.
 *
 * Yeni kural (istek): "ismine belge oluşturulan öğrencilerin profiline
 * katıldığı etkinlik düşecek". Belge üretimi, etkinliği yürüten öğretmenin
 * "bu kişi gerçekten katıldı" beyanıdır — seçilmiş olmaktan daha güçlü bir
 * kanıt.
 *
 * ---------------------------------------------------------------------------
 * YOKLAMA (12 Ağustos 2026 · istek: "öğrenci etkinliğe gelmedi ama GençTek
 * Yolculuğum'da katıldı görünüyor, bunun kontrolünü nasıl sağlarız")
 * ---------------------------------------------------------------------------
 * Belge, katılımın DOLAYLI kanıtıydı ve iki yönden de eksik kalıyordu: belge
 * basılana kadar hiçbir şey söylemiyor, basıldığında da "listedeki herkese
 * toplu belge" alışkanlığı gelmeyeni de kapsıyordu. Artık doğrudan bir soru
 * var: etkinlik bitince yürütücü listedeki her kişi için "geldi / gelmedi"
 * işaretliyor.
 *
 * YOKLAMA HER ŞEYİN ÜSTÜNDEDİR, iki yönde de:
 *   · "geldi" → katılımdır (belge basılmamış olsa bile).
 *   · "gelmedi" → katılım DEĞİLDİR; belge basılmış olsa bile sayılmaz.
 * İkincisi bilinçli: yanlışlıkla toplu basılmış bir belge, gelmediği elle
 * işaretlenmiş bir öğrenciyi katılmış gösteremez. Belgenin kendisi de artık
 * yalnızca "geldi" işaretlilere üretilebiliyor (bkz. lib/belge/kapi.ts).
 */

/**
 * Belge temelli katılımın yürürlüğe girdiği an.
 *
 * NEDEN BİR GEÇİŞ TARİHİ VAR: bu tarihten önce üretilmiş belgelerin kaydı
 * YOK ve üretilemez (bkz. migration 20260807100000). Kural geriye dönük
 * uygulansaydı, bugün profilinde katılım görünen her öğrencinin listesi
 * bir anda boşalırdı — ve o listeden hesaplanan rozetler ile "Seferlerim"
 * seviyeleri de kazanılmış hâlden kazanılmamış hâle düşerdi. Nişanın geri
 * alınması, öğrenciye sistemin verdiği en kötü mesajdır.
 *
 * Bu yüzden sınır tarihten geçiyor:
 *   · bu andan ÖNCE yapılmış etkinlikler → eski kural (seçilmiş olmak yeter)
 *   · bu andan SONRA yapılacak etkinlikler → yalnızca belge
 *
 * Geçiş tamamlandığında (bu tarihten önceki etkinlikler artık kimsenin
 * profilinde anlamlı olmadığında) sabit ileri alınabilir ya da kural tek
 * kaynağa indirilebilir.
 */
export const BELGE_TEMELLI_KATILIM_BASLANGICI = new Date(
  "2026-08-07T00:00:00.000Z",
);

/** Katılım listesine giren tek bir etkinlik. */
export interface KatilimAdayi {
  faaliyetId: number;
  ad: string;
  tarih: Date;
  kapsam: Kapsam;
  etkinlikKategorisi: EtkinlikKategorisi;
  /** Adına bu etkinlikten belge üretilmiş mi? */
  belgeVarMi: boolean;
  /** Başvurusu SEÇİLDİ durumunda mı? */
  secildiMi: boolean;
  /**
   * Yoklama sonucu: `true` geldi, `false` gelmedi, `null` yoklama alınmadı.
   *
   * Üçüncü hâl ayrı tutulur; "alınmadı" ile "gelmedi" aynı şey olsaydı yoklama
   * almayan her etkinlik bütün katılımcılarını silerdi.
   */
  katildiMi: boolean | null;
}

/**
 * Tek bir etkinliğin katılım sayılıp sayılmayacağı.
 *
 * SIRA ÖNEMLİ:
 *   1. Yoklamada "gelmedi" işaretlenmişse hiçbir kanıt bunu geçemez.
 *   2. Yoklamada "geldi" işaretlenmişse yeter — belge beklenmez.
 *   3. Yoklama alınmamışsa eski kanıtlar yürür: belge her zaman yeter ve geçiş
 *      tarihine BAKMAZ (eski bir etkinlik için bugün belge üretilirse o da
 *      katılımdır); "belgesi yok ama seçilmiş" hâli yalnızca geçiş tarihinden
 *      önceki etkinliklerde sayılır.
 */
export function katilimSayilirMi(
  aday: Pick<KatilimAdayi, "tarih" | "belgeVarMi" | "secildiMi" | "katildiMi">,
  baslangic: Date = BELGE_TEMELLI_KATILIM_BASLANGICI,
): boolean {
  if (aday.katildiMi === false) return false;
  if (aday.katildiMi === true) return true;
  if (aday.belgeVarMi) return true;
  return aday.secildiMi && aday.tarih < baslangic;
}

/**
 * Adayları süzer ve tarihe göre yeniden sıralar.
 *
 * SIRALAMA BURADA yapılıyor, SQL'de değil: liste iki ayrı sorgunun birleşimi
 * (başvurular ve belgeler) ve veritabanı ikisini tek sıraya dizemez. Aynı
 * tarihli iki etkinlikte sıra `faaliyetId` ile kırılır — yoksa her sayfa
 * yenilemesinde sıra değişebilir ve liste "oynuyor" görünürdü.
 */
export function katilimlariSuz(
  adaylar: readonly KatilimAdayi[],
  baslangic: Date = BELGE_TEMELLI_KATILIM_BASLANGICI,
): KatilimAdayi[] {
  return adaylar
    .filter((aday) => katilimSayilirMi(aday, baslangic))
    .sort((a, b) => {
      const fark = b.tarih.getTime() - a.tarih.getTime();
      return fark !== 0 ? fark : b.faaliyetId - a.faaliyetId;
    });
}
```

### `src/lib/kazanim/kurallar.ts`

```ts
import type { KatilimBicimi, KazanimTipi } from "@/generated/prisma/enums";

/**
 * Kişinin kendi girdiği kazanım kayıtlarının kabul kuralları —
 * references/domain-rules.md Bölüm 14.
 *
 * Saf tutulur: veritabanına ve dosya sistemine gitmez, böylece birim testle
 * eksiksiz kapsanabilir. Kayıt bir BEYANdır — sistem doğrulamaz, onaya da tabi
 * değildir; buradaki kontroller yalnızca biçimseldir.
 *
 * Kayıt sahibi öğrenci de öğretmen de olabilir. Kurallar ikisinde de AYNIdır
 * (aynı tipler, aynı alanlar, aynı sınırlar); değişen yalnızca etiketlerdir.
 */

/**
 * Etkinliğin/eğitimin nasıl yürütüldüğü.
 *
 * Faaliyetlerde SORULMAZ: orada yer kapsamdan ve açıklamadan okunuyor. Kazanım
 * dışarıdan gelen bir beyandır ve "nerede yapıldı" bilgisi başka hiçbir alandan
 * çıkarılamaz — çevrim içi bir hackathona katılmakla üç gün başka bir şehirde
 * kalmak aynı kayıt değildir.
 */
export const KATILIM_BICIMI_ETIKETLERI: Record<KatilimBicimi, string> = {
  YUZ_YUZE: "Yüz yüze",
  ONLINE: "Çevrim içi",
  KARMA: "Karma",
};

export const KATILIM_BICIMLERI: KatilimBicimi[] = [
  "YUZ_YUZE",
  "ONLINE",
  "KARMA",
];

export function katilimBicimiGecerliMi(deger: string): deger is KatilimBicimi {
  return (KATILIM_BICIMLERI as string[]).includes(deger);
}

/**
 * Kaydın kime ait olduğu — yalnızca ETİKETLERİ belirler, kuralları değil.
 *
 * Veritabanında tutulmaz; kaydı açan kişinin aktif rolünden okunur. Sütuna
 * kopyalansaydı öğrenci mezun olduğunda ya da öğretmen görev değiştirdiğinde
 * eskirdi (aynı gerekçeyle `basvuru` da katılımcının tipini tutmuyor).
 */
export type KazanimSahibi = "OGRENCI" | "OGRETMEN";

/** Sahibe göre değişen metinler. */
interface KazanimMetinleri {
  /** Bölüm başlığı (çoğul): "Yaptığım ürünler". */
  baslik: string;
  /** Formdaki "başlık" alanının etiketi — tipe göre farklı şey sorulur. */
  baslikEtiketi: string;
  baslikOrnegi: string;
  aciklama: string;
}

/** Kazanım tipinin ekranda nasıl anlatılacağı ve hangi alanları taşıdığı. */
export interface KazanimTipiTanimi extends KazanimMetinleri {
  tip: KazanimTipi;
  /** Derece alanı yalnızca yarışmalarda sorulur. */
  dereceVarMi: boolean;
  /** Düzenleyen kurum alanı ürünlerde anlamsızdır. */
  duzenleyenVarMi: boolean;
  /**
   * Adı, GençTek programları listesinden seçilebilir mi?
   *
   * Listeden seçim ZORUNLU DEĞİLDİR; "Diğer" seçilip ad serbest yazılabilir.
   * GençTek DIŞI etkinlik ve öğrencinin kendi ürünü tanımı gereği listede
   * olamayacağı için o iki tipte seçim hiç sunulmaz.
   */
  programSecimiVarMi: boolean;
  /** Yüz yüze / çevrim içi ayrımı ürünlerde anlamsızdır. */
  katilimBicimiVarMi: boolean;
  /** Hedef kitle yalnızca birine bir şey ANLATILAN kayıtlarda sorulur. */
  hedefKitleVarMi: boolean;
  /**
   * Ürüne özgü alanlar: geliştiren ekip, çoklu bağlantı ve "markette paylaş".
   * Yalnızca URUN'da açılır — bir sertifikanın "geliştiren ekibi" olmaz.
   */
  urunAlanlariVarMi?: boolean;
}

/**
 * Tiplerin öğrenci metinleri; öğretmende değişenler `OGRETMEN_METINLERI`'nde.
 *
 * Alan kuralları (hangi tipte derece sorulur, hangisinde hedef kitle) burada
 * TEK yerde durur ve sahibe göre değişmez: bir yarışma derecesi kimin girdiğine
 * bağlı olarak başka bir şey olmuyor.
 */
export const KAZANIM_TIPLERI: KazanimTipiTanimi[] = [
  {
    /*
     * GençTek katılımı normalde OTOMATİK gelir (basvuru + faaliyet) ve profilde
     * "Katıldığım etkinlikler" olarak görünür. Bu tip, sisteme hiç girilmemiş
     * eski etkinlikler için elle giriş sağlar.
     *
     * Kayıt bir BEYANDIR: sistem doğrulamaz ve otomatik listeyle çakışabilir.
     * Rozetler bu kayıtlardan hesaplanmaz (bkz. lib/kazanim/rozetler.ts), yani
     * beyanla nişan kazanılamaz.
     */
    tip: "GENCTEK_ETKINLIGI",
    baslik: "GençTek etkinlikleri",
    baslikEtiketi: "Etkinliğin adı",
    baslikOrnegi: "Genç Gölge — Ankara",
    aciklama:
      "Katıldığınız GençTek etkinlikleri. Sistem üzerinden başvurduklarınız zaten otomatik listelenir; burayı yalnızca sisteme girilmemiş eski etkinlikler için kullanın.",
    dereceVarMi: false,
    duzenleyenVarMi: true,
    programSecimiVarMi: true,
    katilimBicimiVarMi: true,
    hedefKitleVarMi: false,
  },
  {
    tip: "DIS_ETKINLIK",
    baslik: "GençTek dışı etkinlikler",
    baslikEtiketi: "Etkinliğin adı",
    baslikOrnegi: "TEKNOFEST Bilgi Teknolojileri Zirvesi",
    aciklama:
      "GençTek programı dışında katıldığınız ulusal ya da uluslararası etkinlikler.",
    dereceVarMi: false,
    duzenleyenVarMi: true,
    programSecimiVarMi: false,
    katilimBicimiVarMi: true,
    hedefKitleVarMi: false,
  },
  {
    tip: "URUN",
    baslik: "Yaptığım ürünler",
    baslikEtiketi: "Ürünün adı",
    baslikOrnegi: "Okul kütüphanesi mobil uygulaması",
    aciklama:
      "Kendi geliştirdiğiniz web sitesi, uygulama, oyun, film ve benzeri ürünler. Şimdilik yalnızca TANITIM yapılır: program dosyası yüklenmez.",
    dereceVarMi: false,
    duzenleyenVarMi: false,
    programSecimiVarMi: false,
    katilimBicimiVarMi: false,
    hedefKitleVarMi: false,
    urunAlanlariVarMi: true,
  },
  {
    tip: "AKRAN_EGITIMI",
    baslik: "Verdiğim akran eğitimleri",
    baslikEtiketi: "Eğitimin konusu",
    baslikOrnegi: "9. sınıflara Python'a giriş atölyesi",
    aciklama: "GençTek kapsamında akranlarınıza verdiğiniz eğitimler.",
    dereceVarMi: false,
    duzenleyenVarMi: true,
    programSecimiVarMi: true,
    katilimBicimiVarMi: true,
    hedefKitleVarMi: true,
  },
  {
    tip: "YARISMA_DERECESI",
    baslik: "Derecelerim",
    baslikEtiketi: "Yarışmanın adı",
    baslikOrnegi: "Ulusal Bilgisayar Olimpiyatları",
    aciklama:
      "Bilişim alanında derece aldığınız yarışmalar. GençTek etkinlikleri de (EğitiJAM, Capture The Flag gibi) buraya girilebilir.",
    dereceVarMi: true,
    duzenleyenVarMi: true,
    programSecimiVarMi: true,
    katilimBicimiVarMi: true,
    hedefKitleVarMi: false,
  },
  {
    tip: "SERTIFIKA",
    baslik: "Sertifikalarım",
    baslikEtiketi: "Sertifikanın adı",
    baslikOrnegi: "Siber Güvenliğe Giriş — 40 saat",
    aciklama:
      "Aldığınız sertifikalar ve katılım belgeleri. Belgenin kendisini kaydın altındaki 'Destekleyici belgeler' alanından yükleyebilirsiniz.",
    dereceVarMi: false,
    duzenleyenVarMi: true,
    programSecimiVarMi: false,
    katilimBicimiVarMi: false,
    hedefKitleVarMi: false,
  },
  {
    /*
     * Topluluk BEYANDIR, ortak bir kayıt değil: aynı kulübe iki öğrenci
     * yazdığında iki ayrı satır oluşur ve sistem bunları eşleştirmez.
     * Eşleştirilmiş bir topluluk kaydı ayrı bir referans tablosu ve üyelik
     * yönetimi demekti — istekte istenen bu değil, "gösterebileceği" bir bölüm.
     */
    tip: "TOPLULUK",
    baslik: "Topluluklarım",
    baslikEtiketi: "Topluluğun adı",
    baslikOrnegi: "Robotik Kulübü — takım kaptanı",
    aciklama:
      "İçinde yer aldığınız kulüp, proje ekibi, takım ve benzeri topluluklar. Kendi beyanınızdır; sistem doğrulamaz.",
    dereceVarMi: false,
    duzenleyenVarMi: true,
    programSecimiVarMi: false,
    katilimBicimiVarMi: false,
    hedefKitleVarMi: false,
  },
  {
    /*
     * Sonda duruyor: bir kayıt hangi tipe girdiğini bilmiyorsa buraya düşer.
     * Başta olsaydı kullanıcı diğer tipleri okumadan bunu seçerdi.
     */
    tip: "DIGER",
    baslik: "Diğer etkinlikler",
    baslikEtiketi: "Kaydın adı",
    baslikOrnegi: "Mahalle kütüphanesi gönüllülüğü",
    aciklama:
      "Yukarıdaki başlıkların hiçbirine girmeyen katkı ve deneyimleriniz.",
    dereceVarMi: false,
    duzenleyenVarMi: true,
    programSecimiVarMi: false,
    katilimBicimiVarMi: true,
    hedefKitleVarMi: false,
  },
];

/**
 * Öğretmende BAŞKA TÜRLÜ söylenmesi gereken metinler.
 *
 * Yalnızca farklı olanlar yazılır; yazılmayan tip öğrenci metnini kullanır
 * (ürün ürün, dış etkinlik dış etkinliktir). Asıl fark akran eğitimindedir:
 * öğretmenin öğrencisine verdiği eğitim "akran" eğitimi DEĞİLDİR ve o başlığı
 * öğretmene göstermek, kaydın ne olduğunu yanlış anlatmak olurdu. Yarışmada da
 * öğretmen çoğunlukla yarışmacı değil danışman/eğitmen olarak yer alır.
 */
const OGRETMEN_METINLERI: Partial<Record<KazanimTipi, Partial<KazanimMetinleri>>> =
  {
    AKRAN_EGITIMI: {
      baslik: "Verdiğim eğitimler",
      baslikEtiketi: "Eğitimin konusu",
      baslikOrnegi: "Meslektaşlarıma yapay zekâ araçları semineri",
      aciklama:
        "Öğrencilere, meslektaşlarınıza ya da velilere verdiğiniz eğitim ve atölyeler.",
    },
    YARISMA_DERECESI: {
      baslik: "Derecelerimiz",
      aciklama:
        "Kendinizin ya da danışmanlığını yaptığınız takımın derece aldığı bilişim yarışmaları.",
    },
    URUN: {
      baslikOrnegi: "Bilişim dersleri için etkileşimli ders materyali",
      aciklama:
        "Geliştirdiğiniz web sitesi, uygulama, oyun, ders materyali ve benzeri ürünler.",
    },
  };

export function kazanimTipiTanimi(
  tip: KazanimTipi,
  sahip: KazanimSahibi = "OGRENCI",
): KazanimTipiTanimi {
  const tanim = KAZANIM_TIPLERI.find((aday) => aday.tip === tip);
  if (!tanim) {
    // Enum'a yeni bir değer eklenip buraya tanım yazılmadığında sessizce boş
    // ekran çıkmasın diye erken patlıyor.
    throw new Error(`Kazanım tipi tanımı eksik: ${tip}`);
  }
  if (sahip === "OGRENCI") return tanim;
  return { ...tanim, ...OGRETMEN_METINLERI[tip] };
}

/**
 * Artık GİRİLEMEYEN kazanım tipleri (7 Ağustos 2026).
 *
 * GENCTEK_ETKINLIGI kapatıldı. Bu tip "sisteme girilmemiş eski GençTek
 * etkinliklerini elle beyan et" işini görüyordu; katılım artık ÜRETİLEN
 * BELGEDEN doğduğu için (bkz. lib/kazanim/katilim-kurallar.ts) beyanın
 * işlevi kalmadı. İki kaynak yan yana dursaydı aynı etkinlik profilde biri
 * doğrulanmış biri beyan olmak üzere iki kez görünebilirdi.
 *
 * TİP ENUM'DAN SİLİNMEDİ ve kayıtlar TEMİZLENMEDİ: bugüne kadar girilmiş
 * beyanlar kullanıcının verisidir, silme kararı ona ait. Kayıtlar Panelim'deki
 * düzenleme bölümünde görünmeye ve silinebilmeye devam eder; profilde
 * görünmezler.
 */
export const ARSIVLENMIS_TIPLER: readonly KazanimTipi[] = ["GENCTEK_ETKINLIGI"];

export function kazanimTipiArsivlenmisMi(tip: KazanimTipi): boolean {
  return ARSIVLENMIS_TIPLER.includes(tip);
}

/**
 * Sekme ve bölüm listesi — sırası sahibe göre değişmez.
 *
 * Arşivlenmiş tipler VARSAYILAN OLARAK DIŞARIDA: bu liste hem giriş formunun
 * sekmelerini hem profil bölümlerini besliyor ve ikisinde de kapanmış bir tip
 * görünmemeli. `arsivDahil`, eski kayıtları yönetip silmeye yarayan ekran için
 * var — orada tip başlığı olmadan kayıtlar başlıksız kalırdı.
 */
export function kazanimTipleri(
  sahip: KazanimSahibi = "OGRENCI",
  { arsivDahil = false }: { arsivDahil?: boolean } = {},
): KazanimTipiTanimi[] {
  return KAZANIM_TIPLERI.filter(
    (tanim) => arsivDahil || !kazanimTipiArsivlenmisMi(tanim.tip),
  ).map((tanim) => kazanimTipiTanimi(tanim.tip, sahip));
}

/**
 * Profildeki iki yolculuk bölümü hangi kazanım tiplerini taşır.
 *
 * Ayrım kaydın NEREDE geçtiğine göredir, ne olduğuna göre değil: GençTek
 * içinde yapılan (katıldığı GençTek etkinlikleri, verdiği akran eğitimleri)
 * bir bölümde, GençTek dışında yapılan (dış etkinlikler, ürünler, dereceler)
 * öbüründe. "Diğer" bilişim tarafındadır — GençTek kapsamındaki bir kaydın
 * zaten kendi tipi var, tipini bulamayan kayıt tanımı gereği dışarıdandır.
 *
 * İki listenin birleşimi GİRİLEBİLEN tüm tipleri kapsamak zorundadır; aksi
 * halde kullanıcı bir kaydı girer ve profilinde hiçbir yerde göremez.
 * `kazanimBolumuBulunmayan` bunu birim testte sınar.
 *
 * GENCTEK_ETKINLIGI 7 Ağustos 2026'da bu listeden ÇIKARILDI: tip arşivlendi
 * (bkz. ARSIVLENMIS_TIPLER) ve istek "Beyan ettiği GençTek etkinlikleri
 * kaldırılacak" diyor. Geriye AKRAN_EGITIMI kalıyor — kartın diğer bölümleri
 * (temsilcilikler, gruplar, düzenlenen ve katıldığı etkinlikler) kazanım
 * kaydından değil, sistemin kendi verisinden geliyor.
 */
export const GENCTEK_YOLCULUGU_TIPLERI: readonly KazanimTipi[] = [
  "AKRAN_EGITIMI",
];

export const BILISIM_YOLCULUGU_TIPLERI: readonly KazanimTipi[] = [
  "DIS_ETKINLIK",
  "URUN",
  "YARISMA_DERECESI",
  // Sertifika ve topluluk da GençTek DIŞINDA kazanılır; ikisi de buraya düşer
  // (istek: "Ayrıca 'Sertifikalarım' ve ... 'Topluluklarım' bölümü eklenecek").
  "SERTIFIKA",
  "TOPLULUK",
  "DIGER",
];

/**
 * "Bilişim Yolculuğum"un ÜÇ ALT BÖLÜMÜ (7 Ağustos 2026).
 *
 * İstek bölümü şöyle ayırdı:
 *
 *   Bilişim Yolculuğum
 *     Ürünlerim
 *     Deneyimlerim (GençTek Dışı Etkinlikler/Derece/Ödül, Sertifika/Eğitim)
 *     Topluluklarım/Ekiplerim
 *
 * Yedi tip yan yana listelenmek yerine üç başlık altında toplanıyor. Tipler
 * BİRLEŞTİRİLMEDİ, yalnızca gruplandı: her tipin kendi alan kuralları var
 * (derece yalnızca yarışmada, ürün alanları yalnızca üründe) ve tek tipe
 * indirmek o kuralları kaybettirirdi. Grup, ekranın düzenidir; tip, kaydın
 * ne olduğudur.
 *
 * "Diğer" DENEYİMLERE düşüyor: tanımı gereği bir başlığa oturmayan kayıt,
 * bir ürün ya da topluluk değildir.
 */
export interface KazanimGrubu {
  kod: string;
  baslik: string;
  aciklama: string;
  tipler: readonly KazanimTipi[];
  /**
   * Grubun gösterildiği sahipler. Yazılmazsa ikisinde de görünür.
   *
   * 10 AĞUSTOS 2026 · istek: "profil sayfasındaki Ürünlerim ve katkılarım, bu
   * bölümde sadece ürünlerim olsun, öğretmen için Deneyimlerim ve
   * Topluluklarım / Ekiplerim kalksın".
   */
  sahipler?: readonly KazanimSahibi[];
}

export const BILISIM_YOLCULUGU_GRUPLARI: readonly KazanimGrubu[] = [
  {
    kod: "URUNLERIM",
    baslik: "Ürünlerim",
    aciklama:
      "Geliştirdiğin site, uygulama, oyun, film ve diğer üretimlerin. Markette paylaştıklarını buradan görebilirsin.",
    tipler: ["URUN"],
  },
  {
    kod: "DENEYIMLERIM",
    baslik: "Deneyimlerim",
    aciklama:
      "GençTek dışında katıldığın etkinlikler, aldığın dereceler ve ödüller, sertifika ve eğitimlerin.",
    tipler: ["DIS_ETKINLIK", "YARISMA_DERECESI", "SERTIFIKA", "DIGER"],
    /*
     * ÖĞRENCİYE ÖZEL (10 Ağustos 2026). Öğretmenin profilindeki bölümün adı
     * "Ürünlerim ve katkılarım" ve istek onu gerçekten ürünlere indirdi:
     * öğretmenin sertifikası, katıldığı dış etkinlik ve topluluğu bir
     * ÖZGEÇMİŞ bilgisi; o bilgi zaten CV alanında duruyor ve profilde ikinci
     * kez, üstelik öğrenci diliyle ("Deneyimlerim") sayılmasının bir karşılığı
     * yok.
     *
     * GİRİŞ FORMU DA KAPANIR, yalnızca gösterim değil: aynı listeden besleniyor
     * (bkz. bilisimYolculuguGruplari). Profilde görünmeyecek bir kaydı
     * girdirmek, kullanıcının yazdığını kaybetmesi demekti.
     *
     * DAHA ÖNCE GİRİLMİŞ KAYITLAR SİLİNMEZ ve görünmez olmaz: Panelim'deki
     * "Girdiğim kayıtlar" bölümü tipin kendisinden beslenir, gruptan değil —
     * öğretmen eski kayıtlarını görmeye ve silmeye devam eder.
     */
    sahipler: ["OGRENCI"],
  },
  {
    kod: "TOPLULUKLARIM",
    baslik: "Topluluklarım / Ekiplerim",
    aciklama:
      "İçinde yer aldığın kulüp, proje ekibi ve takımlar. Beyandır — aynı ekibi yazan iki kişi sistemde eşleştirilmez.",
    tipler: ["TOPLULUK"],
    sahipler: ["OGRENCI"],
  },
];

/**
 * Her grubun kayıt ekleme sekmeleri.
 *
 * Arşivlenmiş tipler ELENİR: giriş formunda kapanmış bir tür görünmemeli.
 */
export function bilisimYolculuguGruplari(
  sahip: KazanimSahibi = "OGRENCI",
): { grup: KazanimGrubu; tanimlar: KazanimTipiTanimi[] }[] {
  return BILISIM_YOLCULUGU_GRUPLARI.filter(
    (grup) => grup.sahipler === undefined || grup.sahipler.includes(sahip),
  ).map((grup) => ({
    grup,
    tanimlar: grup.tipler
      .filter((tip) => !kazanimTipiArsivlenmisMi(tip))
      .map((tip) => kazanimTipiTanimi(tip, sahip)),
  })).filter((bolum) => bolum.tanimlar.length > 0);
}

/**
 * Üç grubun birleşimi, `BILISIM_YOLCULUGU_TIPLERI` ile aynı kümeyi vermeli.
 *
 * Ayrışırlarsa bir tip ya profilde iki kez görünür ya hiç görünmez; ikisi de
 * sessiz hatadır. `kazanim-kurallar.test.ts` bunu sınar.
 */
export function grupsuzBilisimTipleri(): KazanimTipi[] {
  const gruplanan = new Set<KazanimTipi>(
    BILISIM_YOLCULUGU_GRUPLARI.flatMap((grup) => [...grup.tipler]),
  );
  return BILISIM_YOLCULUGU_TIPLERI.filter((tip) => !gruplanan.has(tip));
}

/**
 * Hiçbir yolculuk bölümüne düşmeyen tipler — boş olmalı.
 *
 * Arşivlenmiş tipler SORGUYA GİRMEZ: onların bir bölümü olmaması kural gereği,
 * eksiklik değil. Yeni kayıt kabul etmedikleri için "girdim ama göremiyorum"
 * durumu da doğuramazlar.
 */
export function kazanimBolumuBulunmayan(): KazanimTipi[] {
  const yerlesenler = new Set<KazanimTipi>([
    ...GENCTEK_YOLCULUGU_TIPLERI,
    ...BILISIM_YOLCULUGU_TIPLERI,
  ]);
  return KAZANIM_TIPLERI.map((tanim) => tanim.tip).filter(
    (tip) => !kazanimTipiArsivlenmisMi(tip) && !yerlesenler.has(tip),
  );
}

export function kazanimTipiGecerliMi(deger: string): deger is KazanimTipi {
  return KAZANIM_TIPLERI.some((tanim) => tanim.tip === deger);
}

/** Alan uzunlukları veritabanı sütunlarıyla birebir aynı tutulur. */
const BASLIK_SINIRI = 250;
const ACIKLAMA_SINIRI = 2000;
const DERECE_SINIRI = 120;
const DUZENLEYEN_SINIRI = 200;
const BAGLANTI_SINIRI = 500;
const HEDEF_KITLE_SINIRI = 200;
const GELISTIREN_EKIP_SINIRI = 250;
const BAGLANTI_ETIKET_SINIRI = 100;
/**
 * Bir kayda eklenebilecek azami bağlantı. Sınırsız bırakılsaydı tek kayıt
 * yüzlerce satır taşıyabilir ve ekran kullanılamaz hâle gelirdi.
 */
const BAGLANTI_ADEDI_SINIRI = 10;

/** Ürün formundaki tek bir bağlantı satırı. */
export interface BaglantiGirdisi {
  adres: string;
  etiket?: string | null;
}

export interface KazanimGirdisi {
  tip: string;
  baslik: string;
  aciklama?: string | null;
  tarih?: Date | null;
  baglantiUrl?: string | null;
  derece?: string | null;
  duzenleyen?: string | null;
  katilimBicimi?: string | null;
  hedefKitle?: string | null;
  /** Yalnızca üründe sorulur. */
  gelistirenEkip?: string | null;
  markettePaylasilsin?: boolean;
  /** Ürünün birden çok adresi olabilir: depo, canlı sürüm, tanıtım videosu. */
  baglantilar?: BaglantiGirdisi[];
  /**
   * Listeden seçilen GençTek programı. Seçilmediyse (ya da "Diğer" seçildiyse)
   * null gelir ve ad serbest metinden okunur.
   */
  program?: { id: number; ad: string } | null;
}

/** Doğrulamadan geçmiş, veritabanına yazılmaya hazır kayıt. */
export interface TemizBaglanti {
  adres: string;
  etiket: string | null;
  siraNo: number;
}

export interface TemizKazanim {
  tip: KazanimTipi;
  baslik: string;
  aciklama: string | null;
  tarih: Date | null;
  baglantiUrl: string | null;
  derece: string | null;
  duzenleyen: string | null;
  temelEtkinlikProgramiId: number | null;
  katilimBicimi: KatilimBicimi | null;
  hedefKitle: string | null;
  gelistirenEkip: string | null;
  markettePaylasilsin: boolean;
}

export type KazanimKarari =
  | { olurMu: true; kayit: TemizKazanim; baglantilar: TemizBaglanti[] }
  | { olurMu: false; neden: string };

function kirp(deger: string | null | undefined): string | null {
  const kirpilmis = (deger ?? "").trim();
  return kirpilmis ? kirpilmis : null;
}

/**
 * Bağlantı adresi kontrolü.
 *
 * Yalnızca http/https kabul edilir: `javascript:` ile başlayan bir adres
 * profilde tıklanabilir bağlantı olarak gösterildiğinde profile bakan
 * danışmanın tarayıcısında kod çalıştırırdı.
 */
export function baglantiGecerliMi(adres: string): boolean {
  try {
    const cozulen = new URL(adres);
    return cozulen.protocol === "http:" || cozulen.protocol === "https:";
  } catch {
    return false;
  }
}

export function kazanimKabulEdilirMi(girdi: KazanimGirdisi): KazanimKarari {
  if (!kazanimTipiGecerliMi(girdi.tip)) {
    return { olurMu: false, neden: "Geçersiz kazanım türü." };
  }
  /*
   * Arşivlenmiş tip YENİ KAYIT KABUL ETMEZ. Kontrol sunucuda: sekmeyi
   * ekrandan kaldırmak, adres çubuğuna `?tur=GENCTEK_ETKINLIGI` yazan birini
   * durdurmaz — ve o kayıt profilde hiçbir yerde görünmediği için kullanıcı
   * kaydettiğini sanıp kaybederdi.
   */
  if (kazanimTipiArsivlenmisMi(girdi.tip)) {
    return {
      olurMu: false,
      neden:
        "Bu kayıt türü kapatıldı. GençTek etkinliklerine katılımınız, etkinlik sonunda alınan yoklamadan profilinize kendiliğinden düşer.",
    };
  }
  const tanim = kazanimTipiTanimi(girdi.tip);

  /*
   * Program seçildiyse ADI KOPYALANIR, bağlantıya güvenilmez: program pasife
   * alındığında ya da adı değiştiğinde öğrencinin geçmiş kaydı okunamaz hâle
   * gelmemeli. Bağlantı yalnızca aynı programa ait kayıtları gruplayabilmek
   * için tutulur.
   */
  const program = tanim.programSecimiVarMi ? (girdi.program ?? null) : null;
  const baslik = program ? program.ad : kirp(girdi.baslik);
  if (!baslik) {
    return { olurMu: false, neden: `${tanim.baslikEtiketi} boş olamaz.` };
  }
  if (baslik.length > BASLIK_SINIRI) {
    return {
      olurMu: false,
      neden: `${tanim.baslikEtiketi} en fazla ${BASLIK_SINIRI} karakter olabilir.`,
    };
  }

  const aciklama = kirp(girdi.aciklama);
  if (aciklama && aciklama.length > ACIKLAMA_SINIRI) {
    return {
      olurMu: false,
      neden: `Açıklama en fazla ${ACIKLAMA_SINIRI} karakter olabilir.`,
    };
  }

  const baglantiUrl = kirp(girdi.baglantiUrl);
  if (baglantiUrl) {
    if (baglantiUrl.length > BAGLANTI_SINIRI) {
      return {
        olurMu: false,
        neden: `Bağlantı adresi en fazla ${BAGLANTI_SINIRI} karakter olabilir.`,
      };
    }
    if (!baglantiGecerliMi(baglantiUrl)) {
      return {
        olurMu: false,
        neden: "Bağlantı adresi http:// veya https:// ile başlamalıdır.",
      };
    }
  }

  /*
   * Tipe uymayan alanlar reddedilmez, SESSİZCE DÜŞÜRÜLÜR: ekran o alanı hiç
   * göstermediği için değer ancak istek elle kurcalandığında gelir, ve bunun
   * kullanıcıya anlatılacak bir tarafı yok. Düşürmek yerine yazmak, "ürünün
   * derecesi" gibi anlamsız veri üretirdi.
   */
  const derece = tanim.dereceVarMi ? kirp(girdi.derece) : null;
  if (derece && derece.length > DERECE_SINIRI) {
    return {
      olurMu: false,
      neden: `Derece en fazla ${DERECE_SINIRI} karakter olabilir.`,
    };
  }

  const duzenleyen = tanim.duzenleyenVarMi ? kirp(girdi.duzenleyen) : null;
  if (duzenleyen && duzenleyen.length > DUZENLEYEN_SINIRI) {
    return {
      olurMu: false,
      neden: `Düzenleyen kurum en fazla ${DUZENLEYEN_SINIRI} karakter olabilir.`,
    };
  }

  /*
   * KATILIM BİÇİMİ YENİ KAYITLARDA ZORUNLU (5 Ağustos 2026).
   *
   * Formdaki "Belirtmek istemiyorum" seçeneği kaldırıldı: bilgi zaten
   * kullanıcının kafasında var ve boş bırakılan her kayıt raporlamada
   * "bilinmiyor" olarak birikiyordu.
   *
   * ESKİ KAYITLAR GERİYE DÖNÜK DOLDURULMAZ ve sütun NULL kabul etmeye devam
   * eder: bugüne kadar boş bırakılmış beyanları "yüz yüze" diye varsaymak
   * veriyi uydurmak olurdu. Kural yalnızca bu kapıdan, yani YENİ kayıttan
   * geçenlere uygulanır.
   */
  const hamKatilim = tanim.katilimBicimiVarMi ? kirp(girdi.katilimBicimi) : null;
  let katilimBicimi: KatilimBicimi | null = null;
  if (tanim.katilimBicimiVarMi && hamKatilim === null) {
    return { olurMu: false, neden: "Katılım biçimi seçilmelidir." };
  }
  if (hamKatilim !== null) {
    if (!katilimBicimiGecerliMi(hamKatilim)) {
      return { olurMu: false, neden: "Katılım biçimi anlaşılamadı." };
    }
    katilimBicimi = hamKatilim;
  }

  const hedefKitle = tanim.hedefKitleVarMi ? kirp(girdi.hedefKitle) : null;
  if (hedefKitle && hedefKitle.length > HEDEF_KITLE_SINIRI) {
    return {
      olurMu: false,
      neden: `Hedef kitle en fazla ${HEDEF_KITLE_SINIRI} karakter olabilir.`,
    };
  }

  const tarih = girdi.tarih ?? null;
  if (tarih && Number.isNaN(tarih.getTime())) {
    return { olurMu: false, neden: "Tarih anlaşılamadı." };
  }

  /*
   * ÜRÜNE ÖZGÜ ALANLAR. Tipe uymayan alanlar burada da sessizce düşürülür:
   * bir sertifikanın "geliştiren ekibi" ya da "markette paylaş" bayrağı olmaz
   * ve istek elle kurcalanarak gönderilse bile yazılmamalı.
   */
  const urunAlanlari = tanim.urunAlanlariVarMi === true;

  const gelistirenEkip = urunAlanlari ? kirp(girdi.gelistirenEkip) : null;
  if (gelistirenEkip && gelistirenEkip.length > GELISTIREN_EKIP_SINIRI) {
    return {
      olurMu: false,
      neden: `Geliştiren ekip en fazla ${GELISTIREN_EKIP_SINIRI} karakter olabilir.`,
    };
  }

  const markettePaylasilsin = urunAlanlari
    ? girdi.markettePaylasilsin === true
    : false;

  const baglantilar: TemizBaglanti[] = [];
  if (urunAlanlari) {
    // Boş satırlar formdan gelir (kullanıcı hepsini doldurmak zorunda değil);
    // sayıya girmeden önce eleniyorlar.
    const dolular = (girdi.baglantilar ?? []).filter((satir) =>
      Boolean(satir.adres?.trim()),
    );
    if (dolular.length > BAGLANTI_ADEDI_SINIRI) {
      return {
        olurMu: false,
        neden: `En fazla ${BAGLANTI_ADEDI_SINIRI} bağlantı eklenebilir.`,
      };
    }
    for (const [sira, satir] of dolular.entries()) {
      const adres = satir.adres.trim();
      if (adres.length > BAGLANTI_SINIRI) {
        return {
          olurMu: false,
          neden: `Bağlantı adresi en fazla ${BAGLANTI_SINIRI} karakter olabilir.`,
        };
      }
      /*
       * Protokol kontrolü tek bağlantıdakiyle AYNI: `javascript:` ile başlayan
       * bir adres, profile bakan danışmanın tarayıcısında kod çalıştırırdı.
       */
      if (!baglantiGecerliMi(adres)) {
        return {
          olurMu: false,
          neden: "Bağlantı adresleri http:// veya https:// ile başlamalıdır.",
        };
      }
      const etiket = kirp(satir.etiket);
      if (etiket && etiket.length > BAGLANTI_ETIKET_SINIRI) {
        return {
          olurMu: false,
          neden: `Bağlantı etiketi en fazla ${BAGLANTI_ETIKET_SINIRI} karakter olabilir.`,
        };
      }
      baglantilar.push({ adres, etiket, siraNo: sira });
    }
  }

  return {
    olurMu: true,
    kayit: {
      tip: girdi.tip,
      baslik,
      aciklama,
      tarih,
      baglantiUrl,
      derece,
      duzenleyen,
      temelEtkinlikProgramiId: program?.id ?? null,
      katilimBicimi,
      hedefKitle,
      gelistirenEkip,
      markettePaylasilsin,
    },
    baglantilar,
  };
}
```

### `src/lib/kullanici/profil-foto-kurallar.ts`

```ts
/**
 * Profil fotoğrafının kabul kuralları.
 *
 * `ogrenci/cv-kurallar.ts` ile aynı desende ve aynı gerekçeyle AYRI: CV bir
 * belgedir (pdf/doc/docx), fotoğraf bir görseldir ve sınırları farklıdır.
 * Faaliyet eklerinden de ayrıdır — oradaki görsel sınırı sayfa genişliğinde bir
 * fotoğraf için konmuştur, buradaki küçük bir avatar için.
 *
 * Saf tutulur: sınırlar parametreyle gelir (kaynak `sistem_ayari`), dosya
 * sistemine ve veritabanına gitmez. Böylece kurallar birim testle doğrulanır.
 */

export interface ProfilFotoSinirlari {
  izinliTipler: string[];
  maksBayt: number;
}

/** Ekranda "jpg, png, webp" yazmak için: MIME tipinin okunur karşılığı. */
const TIP_ADLARI: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function profilFotoTipAdlari(izinliTipler: string[]): string {
  return izinliTipler.map((tip) => TIP_ADLARI[tip] ?? tip).join(", ");
}

function megabayt(bayt: number): string {
  const mb = bayt / (1024 * 1024);
  // 2 MB gibi tam değerler "2 MB", 512 KB gibi küçük değerler "0.5 MB" yazılır;
  // sınır 1 MB'ın altındaysa "0 MB" demek kullanıcıya hiçbir şey anlatmaz.
  return mb >= 1 ? `${mb.toFixed(0)} MB` : `${mb.toFixed(1)} MB`;
}

export function profilFotoKabulEdilirMi(
  dosya: { mimeTipi: string; boyutBayt: number; dosyaAdi: string },
  sinirlar: ProfilFotoSinirlari,
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
      neden: `Profil fotoğrafı yalnızca ${profilFotoTipAdlari(
        sinirlar.izinliTipler,
      )} biçiminde yüklenebilir.`,
    };
  }
  if (dosya.boyutBayt > sinirlar.maksBayt) {
    return {
      olurMu: false,
      neden: `Dosya ${megabayt(dosya.boyutBayt)} boyutunda; profil fotoğrafı için üst sınır ${megabayt(
        sinirlar.maksBayt,
      )}.`,
    };
  }
  return { olurMu: true };
}

/**
 * Fotoğrafı olmayan kullanıcı için gösterilecek baş harfler.
 *
 * Boş bir gri kare yerine baş harf gösteriliyor: liste ve profil ekranlarında
 * "yüklenmemiş" ile "yüklenemedi" ayırt edilebilir olsun. Soyadı olmayan kayıt
 * teoride yok ama savunmacı davranılıyor — tek harf de geçerli bir sonuçtur.
 */
export function basHarfler(ad: string, soyad: string): string {
  const harf = (metin: string) => metin.trim().charAt(0).toLocaleUpperCase("tr");
  return `${harf(ad)}${harf(soyad)}` || "?";
}
```

### `src/lib/kullanici/salt-okunur.ts`

```ts
/**
 * Salt okunur alan koruması.
 *
 * EBA/e-Okul kaynaklı alanlar hiçbir ekranda düzenlenemez. Profil güncelleme
 * isteğinde bu alanlar gelirse SESSİZCE yok sayılır — hata döndürülmez, ama
 * loglanır (references/permissions.md Bölüm 7).
 *
 * Bu dosya veritabanına gitmez; kural birim testlerle doğrulanır.
 */

export const SALT_OKUNUR_ALANLAR = [
  "ad",
  "soyad",
  "cinsiyet",
  "kurumKodu",
  "ilKodu",
  "ilceKodu",
  "sinif",
  "brans",
  "egitimOgretimYili",
  "okulAdi",
  "okulTuru",
] as const;

export const SALT_OKUNUR_ACIKLAMASI =
  "Bu bilgi e-Okul kayıtlarından gelmektedir; hatalı ise okul idaresine başvurunuz.";

export interface AyiklamaSonucu<T> {
  temizVeri: T;
  yoksayilanAlanlar: string[];
}

export function saltOkunurAlanlariAyikla<T extends Record<string, unknown>>(
  gelenVeri: Record<string, unknown>,
  izinliAlanlar: readonly (keyof T & string)[],
): AyiklamaSonucu<Partial<T>> {
  const temizVeri: Record<string, unknown> = {};
  const yoksayilanAlanlar: string[] = [];

  for (const [anahtar, deger] of Object.entries(gelenVeri)) {
    if (izinliAlanlar.includes(anahtar as keyof T & string)) {
      temizVeri[anahtar] = deger;
    } else {
      yoksayilanAlanlar.push(anahtar);
    }
  }

  return {
    temizVeri: temizVeri as Partial<T>,
    yoksayilanAlanlar,
  };
}
```

### `src/lib/kvkk/kurallar.ts`

```ts
import type { OnayBelgesi } from "@/generated/prisma/enums";
import { disKullaniciMi, ilKoordinatoruMu, ogrenciMi } from "../yetki/izinler";
import type { OturumKullanicisi } from "../yetki/tipler";

/**
 * KVKK kuralları — references/domain-rules.md Bölüm 10.
 *
 * Kullanıcıların büyük bölümü 18 yaş altı olduğu için aydınlatma yükümlülüğü
 * ve saklama süresi burada gevşetilemez. Bu dosya saf tutulur: veritabanına
 * gitmez, "şimdi"yi parametre olarak alır, böylece kararlar birim testle
 * sınanabilir.
 */

export const AYAR_KVKK_METNI = "KVKK_AYDINLATMA_METNI";
export const AYAR_ACIK_RIZA_METNI = "KVKK_ACIK_RIZA_METNI";
export const AYAR_TAAHHUTNAME_METNI = "KOORDINATOR_TAAHHUTNAME_METNI";
export const AYAR_GIZLILIK_SOZLESMESI_METNI = "GIZLILIK_SOZLESMESI_METNI";
export const AYAR_ERISIM_LOGU_SAKLAMA_AYI = "ERISIM_LOGU_SAKLAMA_AYI";
export const AYAR_BILDIRIM_SAKLAMA_AYI = "BILDIRIM_SAKLAMA_AYI";

/**
 * Varsayılan saklama süreleri (ay).
 *
 * Erişim logu, KVKK denetiminin dayanağı olduğu için bildirimden uzun tutulur:
 * "kim hangi öğrenci kaydını ne zaman gördü" sorusu geçmişe dönük sorulur.
 * Bildirim ise kullanıcıya ulaştıktan sonra kanıt değeri taşımaz.
 */
export const VARSAYILAN_ERISIM_LOGU_SAKLAMA_AYI = 24;
export const VARSAYILAN_BILDIRIM_SAKLAMA_AYI = 12;

/**
 * Bir belgenin (yeniden) onaylanması gerekiyor mu?
 *
 * Metin güncellendiğinde eski onay geçersizleşir: kişi artık başka bir metni
 * onaylamış olur. Karşılaştırma sistem ayarının güncelleme tarihine bakar,
 * ayrı bir sürüm alanı tutulmaz.
 *
 * Dört belgenin dördü de aynı kuralı kullanır. Daha önce aydınlatma ve taahhüt
 * için iki ayrı fonksiyon vardı; belge sayısı artınca aynı gövdenin dört kopyası
 * anlamına geleceği için tek fonksiyona indirildi. Bir belgenin tazelik kuralı
 * gerçekten ayrışırsa BELGE_TANIMLARI'na alan eklenir, fonksiyon çoğaltılmaz.
 */
export function onayiGerekiyorMu(girdi: {
  onayTarihi: Date | null;
  metinGuncellemeTarihi: Date | null;
}): boolean {
  if (girdi.onayTarihi === null) return true;
  if (girdi.metinGuncellemeTarihi === null) return false;
  return girdi.onayTarihi < girdi.metinGuncellemeTarihi;
}

/** Bu tarihten eski kayıtlar saklama süresini doldurmuştur. */
export function saklamaSonTarihi(simdi: Date, ay: number): Date {
  const sinir = new Date(simdi);
  sinir.setMonth(sinir.getMonth() - ay);
  return sinir;
}

// ---------------------------------------------------------------------------
// Belge metinleri
// ---------------------------------------------------------------------------

export const VARSAYILAN_AYDINLATMA_METNI = `GençTek Ekosistemi Kurumsal Bilgi Sistemi — Aydınlatma Metni

1. Veri sorumlusu
Bu sistem, Millî Eğitim Bakanlığı Yenilik ve Eğitim Teknolojileri Genel Müdürlüğü (YEĞİTEK) adına işletilmektedir. Kişisel verileriniz 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusu sıfatıyla YEĞİTEK tarafından işlenir.

2. İşlenen veriler
Kimlik ve öğrenim bilgileriniz (ad, soyad, cinsiyet, okul, kurum kodu, il, ilçe, sınıf, eğitim-öğretim yılı) e-Okul/EBA kayıtlarından alınır ve bu sistemde değiştirilemez. Bunlara ek olarak yalnızca sizin girdiğiniz iletişim bilgileri (e-posta, telefon, varsa GitHub/LinkedIn/kişisel site adresleriniz), seçtiğiniz çalışma grupları, danışman öğretmen tercihiniz, faaliyet başvurularınız ve başvuru gerekçeleriniz, yazdığınız yorumlar, profil fotoğrafınız, açtığınız ilanlar ve sistem içinde gönderdiğiniz mesajlar işlenir.

2.1. Sistem içi yazışmalar gizli DEĞİLDİR
Sistem üzerinden başka bir kullanıcıyla yaptığınız yazışmaların tamamı; danışman öğretmeniniz, ilinizin koordinatörü ve YEĞİTEK proje yöneticileri tarafından okunabilir. Bu, çoğunluğu 18 yaş altı olan kullanıcıların korunması amacıyla uygulanan bir güvenlik tedbiridir. Sistemde özel/şifreli bir mesajlaşma kanalı bulunmamaktadır; yazdığınız her mesajın okunabileceğini bilerek yazınız.

3. İşleme amacı ve hukuki sebep
Veriler; danışman öğretmen eşleştirmesi, çalışma grubu takibi, faaliyet başvurusu ve değerlendirmesi ile ekosistemin yönetimi amacıyla, Bakanlığın kanunla verilen görevlerini yerine getirmesi hukuki sebebine dayanılarak işlenir. Kanunun aradığı hâllerde ayrıca açık rızanız alınır; açık rızaya dayanan işlemler ayrı bir metinde sayılmıştır.

4. Verilere kimler erişir
Erişim, görev kapsamıyla sınırlıdır. Danışman öğretmeniniz yalnızca kendi okulundaki danışmanlığını üstlendiği öğrencileri, il koordinatörü yalnızca kendi ilindeki öğrencileri, proje yöneticisi ise yönetim görevi gereği tüm kayıtları görebilir. Hiçbir öğrenci başka bir öğrencinin listesini veya kişisel verisini göremez.

5. Kayıt ve denetim
Kişisel verilerin her görüntülenmesi ve değiştirilmesi; işlemi yapan kullanıcı, tarih ve IP adresiyle birlikte kayıt altına alınır. Bu kayıtlar yalnızca kötüye kullanım denetimi için tutulur.

6. Saklama süresi
Faaliyet ve başvuru kayıtları, ekosistemin geçmişe dönük raporlaması için öğrencilik döneminiz boyunca saklanır. Erişim kayıtları 24 ay, sistem bildirimleri 12 ay sonunda silinir.

7. Haklarınız
Kanun'un 11. maddesi uyarınca; verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini veya silinmesini isteme ve işlemeye itiraz etme haklarına sahipsiniz. e-Okul kaynaklı bilgilerdeki hatalar bu sistemden düzeltilemez; okul idarenize başvurmanız gerekir. Diğer talepleriniz için okul idareniz aracılığıyla Bakanlığa başvurabilirsiniz.

8. Yaş durumu
On sekiz yaşından küçükseniz bu metni velinizle birlikte okumanız beklenir.`;

/**
 * Açık rıza, aydınlatma metninden AYRI bir irade beyanıdır ve yalnızca kanunî
 * dayanağı bulunmayan işlemleri kapsar. Bu yüzden metin "her şeye rıza"
 * demez — rızaya bağlı işlemleri tek tek sayar; sayılmayan hiçbir işlem bu
 * onaya dayandırılamaz.
 */
export const VARSAYILAN_ACIK_RIZA_METNI = `GençTek Ekosistemi Kurumsal Bilgi Sistemi — Açık Rıza Onayı

Bu metin, aydınlatma metninden ayrıdır. Aydınlatma metni verilerinizin nasıl işlendiğini ANLATIR; bu metinle ise yalnızca aşağıda sayılan işlemler için RIZA verirsiniz. Rızaya bağlanmamış hiçbir işlem bu onaya dayandırılamaz.

1. İsteğe bağlı iletişim bilgileri
E-posta adresim, telefon numaram ve eklersem GitHub / LinkedIn / kişisel site adreslerimin sistemde tutulmasını ve görev kapsamındaki danışman öğretmenim, ilimin koordinatörü ve proje yöneticileri tarafından görülmesini kabul ediyorum. Bu bilgileri girmek zorunlu değildir; girmezsem sistemi kullanmaya devam edebilirim.

2. Profil fotoğrafı
Yüklediğim profil fotoğrafının profilimde ve görev kapsamındaki kullanıcıların gördüğü listelerde gösterilmesini kabul ediyorum. Fotoğraf yüklemek zorunlu değildir; dilediğim zaman kaldırabilirim.

3. Bildirim gönderimi
Sistemdeki bildirimlerin bir kopyasının verdiğim e-posta adresine ve telefon numarasına gönderilmesini kabul ediyorum. İletişim bilgisi vermezsem bildirim yalnızca sistem içinde görünür.

4. Faaliyet kayıtları ve belgeler
Katıldığım faaliyetlerde çekilen fotoğrafların faaliyet raporlarında yer almasını; ad ve soyadımın katılım / teşekkür belgelerinde, katılımcı listelerinde ve faaliyet raporlarında kullanılmasını kabul ediyorum.

5. Sistem içi görünürlük
Açtığım ilanların ve talep panosuna yazdıklarımın, faaliyete başvurabilen diğer kullanıcılarca görülmesini kabul ediyorum.

6. Rızanın kapsamı ve geri alınması
Bu rızanın, yalnızca GençTek ekosisteminin yürütülmesi amacıyla ve yukarıda sayılan işlemlerle sınırlı olduğunu biliyorum. Rızamı dilediğim zaman geri alabilirim; geri alma talebimi okul idarem aracılığıyla iletirim. Rızayı geri almam, geri alma anına kadar yapılmış işlemleri geçersiz kılmaz.

7. Yaş durumu
On sekiz yaşından küçükseniz bu metni velinizle birlikte okumanız ve rızayı birlikte vermeniz beklenir.`;

/**
 * Taahhütname GÖREVLE ilgilidir: koordinatörün görevini nasıl yürüteceğini
 * söyler. Gizlilik sözleşmesinden ayrı tutulmasının sebebi budur — biri
 * "görevini şöyle yapacaksın", öbürü "eriştiğin veriyle şöyle davranacaksın"
 * der. İkisi tek metin olsaydı, birinin ihlali diğerinin onayını da tartışmalı
 * hâle getirirdi.
 */
export const VARSAYILAN_TAAHHUTNAME_METNI = `GençTek İl Koordinatörü Taahhütnamesi

GençTek ekosisteminde il koordinatörü olarak görevlendirilmem nedeniyle aşağıdaki hususları taahhüt ederim:

1. Görevimi Millî Eğitim Bakanlığı mevzuatına, GençTek ekosisteminin amaç ve ilkelerine uygun şekilde yürütürüm.

2. Sistemi yalnızca görevimin gerektirdiği işler için kullanırım; kişisel, ticari ya da siyasi hiçbir amaçla kullanmam.

3. İlimdeki danışman öğretmen ve öğrenci kayıtlarının güncel ve doğru tutulmasını gözetir, sisteme gerçeğe aykırı veri girmem.

4. İlimde açılan faaliyetlerin başvuru, değerlendirme ve raporlama süreçlerini süresinde yürütürüm; biten faaliyetlerin raporlarının yazılmasını takip ederim.

5. Öğrenci ve öğretmenler arasında ayrım gözetmeden, fırsat eşitliğini koruyacak şekilde davranırım.

6. Görevim gereği yaptığım her işlemin sistemde kayıt altına alındığını ve denetlenebileceğini bilirim.

7. Görevimin sona ermesi hâlinde sistemdeki yetkilerimin kapatılacağını, devir işlemlerini eksiksiz yapacağımı kabul ederim.

8. Bu taahhütnameye aykırı davranışın idari ve hukuki sorumluluk doğurabileceğini bilirim.`;

/**
 * Gizlilik sözleşmesi VERİYLE ilgilidir. Metin, kaldırılan "koordinatör
 * gizlilik taahhütnamesi"nin içeriğini sürdürür; eski onaylar bu belgeye
 * taşındı (bkz. migrations/20260805120000_onay_belgeleri).
 *
 * Neden yalnızca koordinatörden isteniyor: danışman öğretmen kendi okulundaki
 * öğrencileri görür ve onlarla zaten yüz yüze çalışır; koordinatör ise
 * tanımadığı ONLARCA ÖĞRETMENİN iletişim bilgisine erişebiliyor. Yükümlülüğü
 * doğuran fark budur. Proje yöneticisi kapsam dışı: merkez personeli kurumsal
 * görev tanımıyla bağlıdır, sistem içi bir metin onun yükümlülüğünü doğurmaz.
 */
export const VARSAYILAN_GIZLILIK_SOZLESMESI_METNI = `GençTek İl Koordinatörü Gizlilik Sözleşmesi

İl koordinatörü olarak, GençTek Bilgi Sistemi üzerinden erişebildiğim kişisel verilere ilişkin aşağıdaki taahhütte bulunurum:

1. İlimdeki öğretmenlerin ve öğrencilerin kişisel verilerine (kimlik, iletişim ve görev bilgileri) yalnızca GençTek görevimin gerektirdiği ölçüde erişirim.

2. Eriştiğim verileri görevimin dışında hiçbir amaçla kullanmam; üçüncü kişilerle paylaşmam, kopyalamam ve sistem dışına çıkarmam.

3. Dışa aktardığım listeleri (CSV, rapor) yalnızca görevimin gerektirdiği süre boyunca saklarım ve işim bittiğinde silerim.

4. Sistemdeki her erişimimin kayıt altına alındığını ve denetlenebileceğini bilirim.

5. Görevim sona erdiğinde erişimimin kapatılacağını, elimdeki tüm kopyaları imha edeceğimi kabul ederim.

6. Bu yükümlülüklere aykırı davranışın 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında sorumluluk doğurabileceğini bilirim.`;

// ---------------------------------------------------------------------------
// Belge tanımları
// ---------------------------------------------------------------------------

export interface BelgeTanimi {
  belge: OnayBelgesi;
  /** Ekranda ve menüde görünen ad. */
  baslik: string;
  /** Belgenin ne olduğunu bir cümlede söyler. */
  aciklama: string;
  /** Onay kutusunun yanında yazan beyan. */
  onayEtiketi: string;
  /** Metnin sistem_ayari'ndaki anahtarı; kayıt yoksa varsayilanMetin geçerlidir. */
  ayarAnahtari: string;
  varsayilanMetin: string;
  /**
   * Belge bu kullanıcıdan isteniyor mu?
   *
   * Rol eşlemesi BURADA, tek yerde durur. Ekranlar "il koordinatörü mü" diye
   * ayrıca sormaz; sorsalardı kapsam iki yerden yönetilir ve biri unutulurdu.
   */
  gerekliMi: (kullanici: OturumKullanicisi) => boolean;
}

/**
 * Onay belgeleri ve kimden istendikleri.
 *
 * Sıra ekrandaki sıradır: önce herkesi ilgilendiren KVKK belgeleri, sonra
 * göreve bağlı olanlar.
 *
 * KAPSAMI GENİŞLETİRKEN DİKKAT: taahhütname ve gizlilik sözleşmesi bilinçli
 * olarak yalnızca il koordinatöründen isteniyor. Danışman öğretmene ya da
 * proje yöneticisine açmak bir ürün kararıdır, teknik bir düzeltme değil.
 *
 * PAYDAŞ TEMSİLCİSİNDEN GİZLİLİK SÖZLEŞMESİ İSTENMİYOR ve bu bilinçli:
 * yürürlükteki yetkisiyle hiçbir öğrenci/öğretmen kişisel verisine erişmiyor
 * (bkz. lib/yetki/kapsam.ts). Yükümlülüğü doğuran şey rolün adı değil eriştiği
 * veridir. Paydaşın kapsamı genişletilirse — örneğin katılımcı listesi
 * görmesi istenirse — bu belge ONA DA açılmalı; metnin başlığı da o zaman
 * "İl Koordinatörü" demekten çıkar.
 */
export const BELGE_TANIMLARI: BelgeTanimi[] = [
  {
    belge: "AYDINLATMA",
    baslik: "KVKK Aydınlatma Metni",
    aciklama:
      "Bu sistemde hangi verilerinizin, neden ve ne kadar süreyle işlendiğini anlatır.",
    onayEtiketi: "Aydınlatma metnini okudum ve anladım.",
    ayarAnahtari: AYAR_KVKK_METNI,
    varsayilanMetin: VARSAYILAN_AYDINLATMA_METNI,
    /*
     * Aydınlatma yükümlülüğü verisi işlenen kişiye karşıdır ve bu sistemde
     * kişisel verisi asıl işlenen grup öğrencilerdir. Öğretmen tarafındaki
     * karşılığı açık rızadır (o herkesten isteniyor).
     *
     * DIŞ KULLANICILAR (mezun, paydaş temsilcisi) da bu belgeyi onaylar:
     * kimlikleri kurumsal bir kayıttan gelmiyor, verilerini sisteme kendileri
     * giriyor. BAŞVURU ANINDA da bir aydınlatma onayı alınır
     * (dis_kullanici_basvurusu.aydinlatma_onay_tarihi) — o, henüz kullanıcı
     * kaydı yokken başlayan veri işlemenin karşılığıdır; buradaki ise sisteme
     * girdikten sonra işlenecek verinin. İkisi ayrı anlar, ayrı kayıtlar.
     */
    gerekliMi: (kullanici) => ogrenciMi(kullanici) || disKullaniciMi(kullanici),
  },
  {
    belge: "ACIK_RIZA",
    baslik: "KVKK Açık Rıza Onayı",
    aciklama:
      "İsteğe bağlı bilgilerinizin (iletişim, fotoğraf, belgelerde ad kullanımı) işlenmesine verdiğiniz rıza.",
    onayEtiketi: "Açık rıza metnini okudum, sayılan işlemlere rıza gösteriyorum.",
    ayarAnahtari: AYAR_ACIK_RIZA_METNI,
    varsayilanMetin: VARSAYILAN_ACIK_RIZA_METNI,
    // Rıza HERKESTEN istenir: öğrencinin de öğretmenin de personelin de
    // isteğe bağlı verisi (iletişim bilgisi, profil fotoğrafı) işleniyor.
    gerekliMi: () => true,
  },
  {
    belge: "TAAHHUTNAME",
    baslik: "İl Koordinatörü Taahhütnamesi",
    aciklama: "Koordinatörlük görevinin nasıl yürütüleceğine ilişkin taahhüt.",
    onayEtiketi: "Taahhütnameyi okudum, kabul ediyorum.",
    ayarAnahtari: AYAR_TAAHHUTNAME_METNI,
    varsayilanMetin: VARSAYILAN_TAAHHUTNAME_METNI,
    gerekliMi: ilKoordinatoruMu,
  },
  {
    belge: "GIZLILIK_SOZLESMESI",
    baslik: "Gizlilik Sözleşmesi",
    aciklama:
      "İlinizdeki öğretmen ve öğrencilerin kişisel verilerine ilişkin gizlilik yükümlülükleriniz.",
    onayEtiketi: "Gizlilik sözleşmesini okudum, kabul ediyorum.",
    ayarAnahtari: AYAR_GIZLILIK_SOZLESMESI_METNI,
    varsayilanMetin: VARSAYILAN_GIZLILIK_SOZLESMESI_METNI,
    gerekliMi: ilKoordinatoruMu,
  },
];

/** Bu kullanıcıdan onayı istenen belgeler. */
export function kullanicininBelgeleri(
  kullanici: OturumKullanicisi,
): BelgeTanimi[] {
  return BELGE_TANIMLARI.filter((tanim) => tanim.gerekliMi(kullanici));
}

export function belgeTanimi(belge: OnayBelgesi): BelgeTanimi {
  const tanim = BELGE_TANIMLARI.find((aday) => aday.belge === belge);
  if (!tanim) {
    // Enum'a değer eklenip tanım yazılmazsa belge sessizce hiç kimseden
    // istenmezdi; gürültülü başarısızlık tercih ediliyor.
    throw new Error(`Tanımsız onay belgesi: ${belge}`);
  }
  return tanim;
}
```

### `src/lib/market/kurallar.ts`

```ts
import type { RolKodu } from "@/generated/prisma/enums";

/**
 * GençTek Market — süzgeçler ve görünürlük kuralları (I).
 *
 * Saf: veritabanı, oturum ya da Next.js bilmez. Ekranlar ve sunucu eylemleri
 * yalnızca buradaki kararı uygular.
 *
 * ---------------------------------------------------------------------------
 * MARKET AYRI BİR TABLO DEĞİL
 * ---------------------------------------------------------------------------
 * Vitrindeki her ürün `kullanici_kazanim` · tip=URUN kaydıdır ve markete
 * `markette_paylasilsin` bayrağıyla çıkar (D5 · 6 Ağustos). Ayrı bir "market
 * ürünü" tablosu açılsaydı aynı ürün iki yerde yaşar, profilden silinen ürün
 * vitrinde kalabilirdi.
 *
 * "Ürün Ekle" ekranı da bu yüzden YOK: ekleme profilde yapılır, market yalnızca
 * gösterir. İstekteki not ("Profilden ekleyebilirsiniz") tam olarak bunu
 * söylüyor.
 */

/**
 * Süzgeç kimlikleri.
 *
 * İKİ SÜZGEÇ KALDI (10 Ağustos 2026 · istek: "dilim kalkacak, kendi ürünlerim
 * ürünlerim olacak, öğrenci ve öğretmen ürünleri ayrı olmayacak").
 *
 * NE KALKTI VE NİYE:
 *   · DİLİM — ne olduğu hiç tanımlanmadı (→ SORULAR.md · S22) ve "tanım
 *     bekleniyor" etiketiyle aylarca ekranda durdu. Boş bir başlığı beklemeye
 *     almak yerine kaldırıldı; tanım gelirse yeniden açılır, o gün ürüne bir
 *     kategori alanı da gerekecek.
 *   · ÖĞRENCİ ÜRÜNLERİ / ÖĞRETMEN ÜRÜNLERİ — vitrini sahibin rolüne göre ikiye
 *     bölüyordu. Market bir ÜRÜN vitrinidir; bir uygulamanın işe yarayıp
 *     yaramadığı, onu yazanın öğrenci mi öğretmen mi olduğuna bakmaz. Ayrım
 *     ayrıca dış kullanıcıların (mezun, paydaş) ürününü iki sekmenin de
 *     dışında bırakıyordu.
 *
 * Kaydın SAHİBİ hâlâ görünüyor (kart üstünde ad ve "Öğrenci/Öğretmen ürünü"
 * ibaresi): bilgi duruyor, vitrini bölen süzgeç kalkıyor.
 */
export type MarketSuzgeci = "TUMU" | "BENIM";

export interface SuzgecTanimi {
  kod: MarketSuzgeci;
  etiket: string;
  /** Sekmenin altındaki açıklama; boş süzgeçte "neden boş" da buradan gelir. */
  aciklama: string;
}

export const MARKET_SUZGECLERI: readonly SuzgecTanimi[] = [
  {
    kod: "TUMU",
    etiket: "Tüm ürünler",
    aciklama: "Markette paylaşılan bütün ürünler.",
  },
  {
    /*
     * "Ürünlerim" DİĞERİNDEN FARKLI ÇALIŞIR: kişinin markette PAYLAŞMADIĞI
     * ürünlerini de gösterir. Kişi buraya kendi ürünlerini görmeye geliyor ve
     * paylaşmadıklarının kaybolması, onları sildiğini düşündürürdü. Paylaşım
     * durumu satırda rozetle yazıyor.
     */
    kod: "BENIM",
    etiket: "Ürünlerim",
    aciklama:
      "Senin eklediğin ürünler. Markette paylaşmadıkların da burada görünür; onları senden başkası göremez.",
  },
];

export function suzgecTanimi(kod: string): SuzgecTanimi | null {
  return MARKET_SUZGECLERI.find((suzgec) => suzgec.kod === kod) ?? null;
}

/**
 * Adres çubuğundan gelen süzgeci çözer.
 *
 * Tanınmayan süzgeç sessizce TUMU'ye düşer — hata sayfası göstermek, yer imine
 * kaydedilmiş eski bir adres için sert bir karşılık olurdu. 10 Ağustos
 * 2026'da kaldırılan `?suzgec=OGRENCI/OGRETMEN/DILIM` adresleri de buradan
 * geçip vitrine düşüyor.
 */
export function suzgeciCoz(ham: string | undefined): MarketSuzgeci {
  const tanim = ham ? suzgecTanimi(ham) : null;
  return tanim?.kod ?? "TUMU";
}

/**
 * Ürün sahibinin market bakımından hangi kümeye girdiği.
 *
 * Rol listesi üzerinden karar veriliyor, tek bir "tip" alanı üzerinden değil:
 * bir kişi aynı anda birden çok rol taşıyabiliyor (danışman + il koordinatörü
 * gibi). Öğrenci rolü varsa öğrencidir; yoksa ve öğretmen/koordinatör rolü
 * varsa öğretmendir.
 *
 * DIŞ KULLANICILAR (mezun, paydaş temsilcisi) ikisine de girmez, "Ekosistem
 * ürünü" sayılır: mezunu öğrenci saymak yanlış olurdu (artık öğrenci değil),
 * öğretmen saymak da öyle.
 *
 * SÜZGEÇ DEĞİL, ETİKET (10 Ağustos 2026): bu küme vitrini bölmüyor, yalnızca
 * kartın üstündeki "kim yaptı" ibaresini yazıyor. Rol bazlı sekmeler kalktı
 * (bkz. MARKET_SUZGECLERI).
 */
export type UrunSahipKumesi = "OGRENCI" | "OGRETMEN" | "DIGER";

const OGRETMEN_ROLLERI: readonly RolKodu[] = [
  "DANISMAN",
  "IL_KOORDINATOR",
  "PROJE_YONETICISI",
];

export function sahipKumesi(roller: readonly RolKodu[]): UrunSahipKumesi {
  if (roller.includes("OGRENCI")) return "OGRENCI";
  if (roller.some((rol) => OGRETMEN_ROLLERI.includes(rol))) return "OGRETMEN";
  return "DIGER";
}

export interface MarketUrunu {
  id: number;
  sahipKullaniciId: number;
  sahipKumesi: UrunSahipKumesi;
  markettePaylasilsin: boolean;
}

/**
 * Süzgeci uygular.
 *
 * SQL'de değil burada, çünkü karar rol listesine bakıyor ve aynı kararın
 * ekranda da (rozet yazısı) kullanılması gerekiyor. Ürün sayısı vitrin
 * ölçeğinde; sayfalama gerektiğinde bu fonksiyon SQL'e taşınmalı ve testi
 * o zaman koruma görevi görür.
 */
export function urunleriSuz<T extends MarketUrunu>(
  urunler: readonly T[],
  suzgec: MarketSuzgeci,
  oturumKullaniciId: number,
): T[] {
  switch (suzgec) {
    case "BENIM":
      // Paylaşılmamışlar DA burada — sekmenin adı "Ürünlerim".
      return urunler.filter((u) => u.sahipKullaniciId === oturumKullaniciId);
    case "TUMU":
    default:
      // Vitrin: paylaşılanlar + kişinin kendi paylaşmadıkları. Kişinin kendi
      // ürünü "Tüm ürünler"de de görünmeli, yoksa paylaşımı kapattığında ürün
      // markette tamamen kaybolur ve silindiğini sanır.
      return urunler.filter(
        (u) => u.markettePaylasilsin || u.sahipKullaniciId === oturumKullaniciId,
      );
  }
}

/**
 * Bir ürünün detayını görebilir mi?
 *
 * Paylaşılmamış ürünü YALNIZCA SAHİBİ görür. Adresi tahmin ederek başkasının
 * paylaşmadığı ürününe bakmanın yolu yok: kural burada, ekran da bunu
 * uyguluyor.
 */
export function urunGorunurMu(
  urun: Pick<MarketUrunu, "sahipKullaniciId" | "markettePaylasilsin">,
  oturumKullaniciId: number,
): boolean {
  return urun.markettePaylasilsin || urun.sahipKullaniciId === oturumKullaniciId;
}

/**
 * Görüntülenme sayacı artmalı mı?
 *
 * Sahibinin kendi ürününe bakması SAYILMAZ — sayaç bir vitrin sayısıdır ve
 * kişinin kendi sayfasını yenileyerek şişirebilmesi, ürünler arası
 * karşılaştırmayı anlamsız kılardı.
 */
export function sayacArtmaliMi(
  sahipKullaniciId: number,
  bakanKullaniciId: number,
): boolean {
  return sahipKullaniciId !== bakanKullaniciId;
}

/** Sayı biçimi: "1.240 görüntülenme" gibi metinlerde binlik ayracı. */
export function sayiYaz(sayi: number): string {
  return sayi.toLocaleString("tr-TR");
}
```

### `src/lib/mentor/kurallar.ts`

```ts
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
 * EN AZ BİR ALAN DOLU OLMALI: ya bir çalışma grubu seçilmeli ya da serbest
 * konu yazılmalı. İkisi de boş bir mentörlük, öğrencinin hangi konuda
 * başvuracağını bilemeyeceği bir kayıttır — panoda görünür ama hiçbir ilana
 * eşleşmez.
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

  if (secilenler.length === 0 && !konular) {
    return {
      olurMu: false,
      neden:
        "En az bir çalışma grubu seçin ya da mentörlük yapabileceğiniz konuları yazın. İkisi de boş bırakılırsa öğrenciler size hangi konuda başvuracağını bilemez.",
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
```

### `src/lib/metin/baglanti.ts`

```ts
/**
 * Düz metin içindeki bağlantıları bulup parçalara ayırır.
 *
 * NEDEN BÖYLE: metni HTML'e çevirip `dangerouslySetInnerHTML` ile basmak en
 * kısa yol olurdu ve en tehlikelisi. Açıklama alanını kullanıcı yazıyor;
 * içindeki `<script>` ya da `<img onerror=...>` doğrudan çalışırdı. Bu yüzden
 * metin HTML'e HİÇ çevrilmiyor: parçalara ayrılıyor, React her parçayı kendi
 * kaçışıyla basıyor. Bağlantı olmayan her şey metin olarak kalıyor.
 *
 * Saf tutulur: React'e, DOM'a ve veritabanına bakmaz, birim testle kapsanır.
 */

export type MetinParcasi =
  | { tip: "metin"; deger: string }
  | { tip: "baglanti"; deger: string; adres: string };

/*
 * Yalnızca http/https ve "www." ile başlayanlar yakalanır.
 *
 * `javascript:` ve `data:` KASITLI OLARAK dışarıda: bunlar tıklanınca kod
 * çalıştırabilen şemalardır ve bir faaliyet açıklamasında meşru bir karşılığı
 * yoktur. Desen onları hiç eşleştirmediği için ayrıca engellemeye gerek kalmaz.
 */
const BAGLANTI_DESENI = /\b(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;

/*
 * Adresin sonuna yapışan noktalama işaretleri bağlantıya dahil edilmez:
 * "detaylar https://ornek.gov.tr/sayfa." cümlesinde nokta adrese ait değildir
 * ve dahil edilirse bağlantı kırılır.
 */
const SON_NOKTALAMA = /[.,;:!?'"]+$/;

/** Adres bir parantez içinde geçiyorsa kapanış parantezini dışarıda bırakır. */
function kapanisParantezleriniKirp(adres: string): string {
  let sonuc = adres;
  while (sonuc.endsWith(")")) {
    const acilan = (sonuc.match(/\(/g) ?? []).length;
    const kapanan = (sonuc.match(/\)/g) ?? []).length;
    if (kapanan <= acilan) break;
    sonuc = sonuc.slice(0, -1);
  }
  return sonuc;
}

function adresiTemizle(ham: string): string {
  return kapanisParantezleriniKirp(ham).replace(SON_NOKTALAMA, "");
}

/**
 * Tıklanabilir adresi üretir. "www." ile başlayanların başına https eklenir;
 * şemasız bir href tarayıcıda göreli yol sayılır ve site içinde 404'e gider.
 */
export function baglantiAdresi(gorunen: string): string {
  return /^https?:\/\//i.test(gorunen) ? gorunen : `https://${gorunen}`;
}

export function metniParcala(metin: string): MetinParcasi[] {
  const parcalar: MetinParcasi[] = [];
  let son = 0;

  // Desen `g` bayrağı taşıdığı için her çağrıda sıfırlanmalı; aksi halde
  // ardışık çağrılarda lastIndex kalıntısı yüzünden eşleşmeler atlanır.
  BAGLANTI_DESENI.lastIndex = 0;

  let eslesme: RegExpExecArray | null = BAGLANTI_DESENI.exec(metin);
  while (eslesme !== null) {
    const ham = eslesme[0];
    const gorunen = adresiTemizle(ham);

    // Kırpma sonrası geriye adres kalmadıysa (tek başına "www." gibi) metin say.
    if (gorunen.length === 0 || gorunen === "www.") {
      eslesme = BAGLANTI_DESENI.exec(metin);
      continue;
    }

    if (eslesme.index > son) {
      parcalar.push({ tip: "metin", deger: metin.slice(son, eslesme.index) });
    }

    parcalar.push({
      tip: "baglanti",
      deger: gorunen,
      adres: baglantiAdresi(gorunen),
    });

    // Kırpılan noktalama metne geri verilir, yutulmaz.
    son = eslesme.index + gorunen.length;
    eslesme = BAGLANTI_DESENI.exec(metin);
  }

  if (son < metin.length) {
    parcalar.push({ tip: "metin", deger: metin.slice(son) });
  }

  return parcalar;
}
```

### `src/lib/ogrenci/cv-kurallar.ts`

```ts
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
```

### `src/lib/ogrenci/iletisim-kurallar.ts`

```ts
/**
 * Öğrencinin profiline yazdığı mesleki bağlantı adresleri.
 *
 * Saf tutulur: veritabanına gitmez, böylece birim testle eksiksiz kapsanabilir.
 * Adresler öğrenci beyanıdır — sistem sayfanın gerçekten ona ait olduğunu
 * doğrulamaz, yalnızca biçimi kontrol eder.
 */

/** Veritabanı sütunuyla birebir aynı (ogrenci_profil VARCHAR(200)). */
const BAGLANTI_SINIRI = 200;

export type BaglantiAlani = "githubUrl" | "kisiselSiteUrl" | "linkedinUrl";

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
```

### `src/lib/ogretmen/gorev-yillari.ts`

```ts
/**
 * Eğitim-öğretim yılı hesapları.
 *
 * Öğretmen envanterinde istenen "görev aldığı eğitim-öğretim yılı(ları)" ayrı
 * bir sütunda TUTULMAZ: rol kayıtları zaten başlangıç ve bitiş tarihiyle
 * geçmişli duruyor (kullanici_rol). İkinci bir yer tutulsaydı rol devri ya da
 * görevden ayrılma sırasında ikisi ayrışır ve hangisinin doğru olduğu
 * bilinemezdi.
 *
 * Bu dosya veritabanına BAKMAZ; kurallar birim testlerle doğrulanır.
 */

/**
 * Eğitim-öğretim yılının başladığı ay (Eylül). Date'in ay numarası 0'dan
 * başladığı için 8'dir.
 *
 * Sınır Eylül'ün 1'idir: Ağustos'ta atanan bir öğretmen o yıla değil, birkaç
 * hafta sonra başlayacak yeni yıla sayılır demek yanlış olurdu — Ağustos hâlâ
 * bir önceki yılın idari dönemidir.
 */
const YIL_BASLANGIC_AYI = 8;

/** Verilen anın hangi eğitim-öğretim yılına düştüğü ("2025-2026"). */
export function egitimOgretimYili(tarih: Date): string {
  const yil = tarih.getFullYear();
  const baslangicYili = tarih.getMonth() >= YIL_BASLANGIC_AYI ? yil : yil - 1;
  return `${baslangicYili}-${baslangicYili + 1}`;
}

/** "2025-2026" biçimindeki ve iki yılı ardışık olan değerleri kabul eder. */
export function yilBicimiGecerliMi(yil: string): boolean {
  const eslesme = /^(\d{4})-(\d{4})$/.exec(yil.trim());
  if (!eslesme) return false;
  return Number(eslesme[2]) === Number(eslesme[1]) + 1;
}

export interface YilAraligi {
  /** Yılın ilk anı (1 Eylül 00:00). */
  baslangic: Date;
  /** Yılın son anı (31 Ağustos 23:59:59.999). */
  bitis: Date;
}

/**
 * Eğitim-öğretim yılını takvim aralığına çevirir. Geçersiz biçimde null döner:
 * filtre değerleri adres çubuğundan geliyor ve doğrulanmamış bir değerin
 * sorguya sızması, sorguyu sessizce yanlış bir aralıkla çalıştırırdı.
 */
export function egitimOgretimYiliAraligi(yil: string): YilAraligi | null {
  if (!yilBicimiGecerliMi(yil)) return null;
  const baslangicYili = Number(yil.trim().slice(0, 4));
  return {
    baslangic: new Date(baslangicYili, YIL_BASLANGIC_AYI, 1, 0, 0, 0, 0),
    bitis: new Date(baslangicYili + 1, YIL_BASLANGIC_AYI, 0, 23, 59, 59, 999),
  };
}

export interface GorevAraligi {
  baslangicTarihi: Date;
  /** null ise görev sürüyor. */
  bitisTarihi: Date | null;
}

/**
 * Rol kayıtlarının kapsadığı eğitim-öğretim yıllarını, eskiden yeniye sıralı
 * ve tekrarsız verir.
 *
 * Süren görevin bitişi `simdi` sayılır: "2020'de başladı, hâlâ görevde"
 * durumunda listenin sonsuza kadar uzamaması için. Aynı yılda başlayıp biten
 * iki ayrı rol tek yıl olarak görünür — soru "hangi yıllarda görev aldı",
 * "kaç rol aldı" değil.
 */
export function gorevYillari(
  araliklar: readonly GorevAraligi[],
  simdi: Date = new Date(),
): string[] {
  const yillar = new Set<string>();

  for (const aralik of araliklar) {
    const bitis = aralik.bitisTarihi ?? simdi;
    // Bozuk kayıt (bitiş başlangıçtan önce) sessizce atlanmaz: en azından
    // başladığı yıl sayılır, çünkü göreve gerçekten başlanmıştır.
    if (bitis < aralik.baslangicTarihi) {
      yillar.add(egitimOgretimYili(aralik.baslangicTarihi));
      continue;
    }

    const ilkYil = Number(egitimOgretimYili(aralik.baslangicTarihi).slice(0, 4));
    const sonYil = Number(egitimOgretimYili(bitis).slice(0, 4));
    for (let yil = ilkYil; yil <= sonYil; yil += 1) {
      yillar.add(`${yil}-${yil + 1}`);
    }
  }

  return [...yillar].sort();
}

/** Yıl listesini ekranda gösterilecek metne çevirir. */
export function gorevYillariYaz(yillar: readonly string[]): string {
  return yillar.length === 0 ? "—" : yillar.join(", ");
}
```

### `src/lib/ogretmen/katki-ozeti.ts`

```ts
/**
 * Panelim'deki "Katkı kartım" ölçüm kartının metni (12 Ağustos 2026).
 *
 * İSTEK: "katkı kartım kartında tıklayın diyor ama katkıların özeti yok kartta."
 *
 * Kart `deger` alanında "Görüntüle" yazıyordu: diğer bütün ölçüm kartları
 * orada bir SAYI gösterirken bu kart bir davetiye gösteriyordu ve kişi
 * tıklamadan katkısı hakkında hiçbir şey öğrenemiyordu. Oysa sayılar zaten
 * Katkılarım ekranının başlığında duruyor (bkz. app/panel/kazanimlarim).
 *
 * SAF TUTULUR: sayım veritabanı işidir (katki.ts), buradaki iş yalnızca o
 * sayıları cümleye çevirmek — ve birim testle sabitlemek, çünkü "0 aktif
 * danışmanlık" gibi boş övgüleri yazmama kararı burada veriliyor.
 */

export interface KatkiSayilari {
  /** Düzenlediği etkinlik (reddedilenler hariç). */
  faaliyet: number;
  /** Süren danışmanlık sayısı. */
  aktifDanismanlik: number;
  /** Aldığı görev rolleri — bitmişler dahil. */
  gorev: number;
}

export interface KatkiKartiMetni {
  deger: string;
  aciklama: string;
}

/**
 * Kartın büyük satırı ve altındaki özet.
 *
 * BÜYÜK SATIR YALNIZCA SAYIDIR (12 Ağustos 2026 · istek: "katkı kartımda
 * '0 etkinlik' yazıyor, o etkinlik yazısını silelim, diğerleri gibi sadece sayı
 * versin"). Panelin bütün ölçüm kartlarında o satırda çıplak bir sayı duruyor;
 * birinin birim taşıması ızgarayı hizasız gösteriyordu. Sayının NEYİN sayısı
 * olduğu hemen altındaki açıklamada yazıyor.
 *
 * Sayı, düzenlenen etkinliktir: kartın anlattığı katkının en somut ölçüsü bu.
 * Üç sayı toplanıp tek bir "katkı puanı" yazılabilirdi ama etkinlik,
 * danışmanlık ve görev aynı birim değil; toplamları hiçbir sorunun cevabı
 * olmazdı.
 *
 * SIFIR OLAN SATIR YAZILMAZ: il koordinatörü danışman olamaz, dolayısıyla ona
 * "0 aktif danışmanlık" demek boş bir satırdır. Hiçbir katkı yoksa açıklama
 * kartın ne olduğunu anlatmaya döner — yeni kullanıcı çıplak bir sıfırla baş
 * başa kalmasın.
 */
export function katkiKartiMetni(sayilar: KatkiSayilari): KatkiKartiMetni {
  const parcalar = ["Düzenlediğiniz etkinlik"];
  if (sayilar.aktifDanismanlik > 0) {
    parcalar.push(`${sayilar.aktifDanismanlik} aktif danışmanlık`);
  }
  if (sayilar.gorev > 0) {
    parcalar.push(`${sayilar.gorev} görev`);
  }

  const bosMu =
    sayilar.faaliyet === 0 &&
    sayilar.aktifDanismanlik === 0 &&
    sayilar.gorev === 0;

  return {
    deger: String(sayilar.faaliyet),
    aciklama: bosMu
      ? "Görevleriniz, danışmanlığınız ve düzenlediğiniz etkinlikler"
      : parcalar.join(" · "),
  };
}
```

### `src/lib/paydas/kurallar.ts`

```ts
import type { PaydasTuru } from "@/generated/prisma/enums";

/**
 * Paydaş envanteri kuralları — analiz dokümanı Bölüm 3.
 *
 * Bu dosya veritabanına BAKMAZ; kararlar saf tutulur ki birim testle eksiksiz
 * kapsanabilsinler (aynı yaklaşım src/lib/faaliyet/kurallar.ts'de).
 */

/*
 * Sıra ekrandaki açılır listenin sırasıdır ve rastgele değildir: GençTek
 * protokollü üniversite ile mezun paydaşlar en üstte, çünkü ilin en sık
 * eklediği ve aradığı kayıtlar bunlar.
 */
export const PAYDAS_TURLERI: PaydasTuru[] = [
  "GENCTEK_UNIVERSITE",
  "MEZUN",
  "UNIVERSITE",
  "OZEL_SEKTOR",
  "STK",
  "KAMU_KURUMU",
  "MESLEK_KURULUSU",
  "BELEDIYE",
  "DIGER",
];

export const PAYDAS_TURU_ETIKETLERI: Record<PaydasTuru, string> = {
  GENCTEK_UNIVERSITE: "GençTek üniversitesi",
  MEZUN: "Mezun",
  UNIVERSITE: "Üniversite",
  OZEL_SEKTOR: "Özel sektör",
  STK: "Sivil toplum kuruluşu",
  KAMU_KURUMU: "Kamu kurumu",
  MESLEK_KURULUSU: "Meslek kuruluşu",
  BELEDIYE: "Belediye",
  DIGER: "Diğer",
};

export function paydasTuruMu(deger: string): deger is PaydasTuru {
  return (PAYDAS_TURLERI as string[]).includes(deger);
}

/** Ekrandan gelen ham paydaş girdisi. */
export interface PaydasGirdisi {
  ad: string;
  tur: string;
  ilKodu: string;
  yetkiliKisi: string;
  eposta: string;
  telefon: string;
  adres: string;
  isBirligiAlani: string;
  notlar: string;
}

/** Veritabanına yazılabilir hâle gelmiş paydaş kaydı. */
export interface PaydasKaydi {
  ad: string;
  tur: PaydasTuru;
  ilKodu: string;
  yetkiliKisi: string | null;
  eposta: string | null;
  telefon: string | null;
  adres: string | null;
  isBirligiAlani: string;
  notlar: string | null;
}

export type PaydasKarari =
  | { olurMu: true; kayit: PaydasKaydi }
  | { olurMu: false; neden: string };

const AD_UST_SINIRI = 250;
const YETKILI_UST_SINIRI = 150;
const EPOSTA_UST_SINIRI = 150;
const TELEFON_UST_SINIRI = 20;

/**
 * Telefon numarası biçimi bilinçli olarak GEVŞEK tutuldu: kurum numaraları
 * dahili numara, ülke kodu ve ayraç bakımından birbirine benzemiyor. Aranan
 * tek şey rakam ağırlıklı ve makul uzunlukta olması — katı bir maske,
 * doğru numaraların girilmesini engellerdi.
 */
const TELEFON_BICIMI = /^[0-9+()\s./-]{7,20}$/;

/** RFC'ye tam uyum aranmaz; amaç yazım hatasını yakalamak. */
const EPOSTA_BICIMI = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function bosluksuz(deger: string): string {
  return deger.trim();
}

function bosVeyaMetin(deger: string): string | null {
  const kirpilmis = deger.trim();
  return kirpilmis ? kirpilmis : null;
}

/**
 * Paydaş girdisini doğrular.
 *
 * Zorunlu alanlar: ad, tür, il ve iş birliği alanı. Sonuncusu bilerek zorunlu:
 * adı ve türü olan ama ne için iş birliği yapılacağı yazılmayan bir kayıt,
 * listeyi kalabalıklaştırmaktan başka işe yaramaz — faaliyet planlarken kime
 * neden ulaşılacağı bilinmiyorsa kayıt boşuna tutulmuş olur.
 *
 * İletişim bilgisi (yetkili kişi / e-posta / telefon) alanlarından EN AZ BİRİ
 * dolu olmalı. "İletişim bilgileri" analiz dokümanında sayılan bir alandır ve
 * ulaşılamayan paydaş, paydaş değildir.
 */
export function paydasGirdisiniCoz(girdi: PaydasGirdisi): PaydasKarari {
  const ad = bosluksuz(girdi.ad);
  if (!ad) return { olurMu: false, neden: "Paydaş kurum adı zorunludur." };
  if (ad.length > AD_UST_SINIRI) {
    return {
      olurMu: false,
      neden: `Kurum adı en fazla ${AD_UST_SINIRI} karakter olabilir.`,
    };
  }

  if (!paydasTuruMu(girdi.tur)) {
    return { olurMu: false, neden: "Paydaş türü seçilmelidir." };
  }

  const ilKodu = bosluksuz(girdi.ilKodu);
  if (!/^\d{2}$/.test(ilKodu)) {
    return { olurMu: false, neden: "İl seçilmelidir." };
  }

  const isBirligiAlani = bosluksuz(girdi.isBirligiAlani);
  if (!isBirligiAlani) {
    return {
      olurMu: false,
      neden:
        "İş birliği alanı / potansiyeli zorunludur: kime neden ulaşılacağı yazılmayan kayıt işe yaramaz.",
    };
  }

  const yetkiliKisi = bosVeyaMetin(girdi.yetkiliKisi);
  if (yetkiliKisi && yetkiliKisi.length > YETKILI_UST_SINIRI) {
    return {
      olurMu: false,
      neden: `Yetkili kişi en fazla ${YETKILI_UST_SINIRI} karakter olabilir.`,
    };
  }

  const eposta = bosVeyaMetin(girdi.eposta);
  if (eposta && (!EPOSTA_BICIMI.test(eposta) || eposta.length > EPOSTA_UST_SINIRI)) {
    return { olurMu: false, neden: "E-posta adresi geçerli değil." };
  }

  const telefon = bosVeyaMetin(girdi.telefon);
  if (telefon && (!TELEFON_BICIMI.test(telefon) || telefon.length > TELEFON_UST_SINIRI)) {
    return { olurMu: false, neden: "Telefon numarası geçerli değil." };
  }

  if (!yetkiliKisi && !eposta && !telefon) {
    return {
      olurMu: false,
      neden:
        "En az bir iletişim bilgisi girin (yetkili kişi, e-posta veya telefon).",
    };
  }

  return {
    olurMu: true,
    kayit: {
      ad,
      tur: girdi.tur,
      ilKodu,
      yetkiliKisi,
      eposta,
      telefon,
      adres: bosVeyaMetin(girdi.adres),
      isBirligiAlani,
      notlar: bosVeyaMetin(girdi.notlar),
    },
  };
}

/**
 * Faaliyete bağlanan paydaşın katkı notu. İsteğe bağlıdır; yalnızca uzunluğu
 * sınırlanır, çünkü "mekân desteği", "eğitmen" gibi serbest bir ifadedir.
 */
export function faaliyetPaydasKatkisiniCoz(
  katkisi: string,
): { olurMu: true; katkisi: string | null } | { olurMu: false; neden: string } {
  const kirpilmis = katkisi.trim();
  if (kirpilmis.length > 250) {
    return {
      olurMu: false,
      neden: "Katkı açıklaması en fazla 250 karakter olabilir.",
    };
  }
  return { olurMu: true, katkisi: kirpilmis ? kirpilmis : null };
}
```

### `src/lib/rapor/faaliyet-raporu.ts`

```ts
/**
 * Faaliyet raporunun Word çıktısı — analiz isteği Bölüm 5.
 *
 * NEDEN HTML: gerçek `.docx` üretmek bir kütüphane bağımlılığı gerektirir
 * (docx, officegen…). Word, HTML gövdeli bir `.doc` dosyasını yerel olarak
 * açar ve biçimlendirmeyi korur; başlık, tablo ve kalın metin çalışır. Tek
 * bir rapor çıktısı için bağımlılık eklemeye değmedi.
 *
 * EXCEL ayrı bir yol izler: HTML tablo `.xls` uzantısıyla verilseydi modern
 * Excel "dosya biçimi uzantıyla uyuşmuyor" uyarısı gösterirdi. Excel çıktısı
 * bu yüzden projedeki mevcut CSV altyapısını kullanır (BOM + noktalı virgül),
 * Excel onu uyarısız açar.
 *
 * Saf tutulur: veritabanına bakmaz, veriyi çağıran hazırlar.
 */

import { RAPOR_ALAN_ADLARI } from "@/lib/faaliyet/rapor-kurallar";

export interface RaporKatilimcisi {
  adSoyad: string;
  sinifVeyaBrans: string | null;
  okul: string | null;
  il: string | null;
}

export interface RaporVerisi {
  faaliyetAdi: string;
  aciklama: string;
  kapsam: string;
  kategori: string;
  yer: string;
  tarih: string;
  sure: string;
  /** Yüz yüze / online / karma; girilmemişse null. */
  katilimBicimi: string | null;
  hedefKitle: string | null;
  duzenleyen: string;
  duzenleyenBirim: string;
  kontenjan: number;
  toplamBasvuru: number;
  /** Seçilmiş başvuru sayısı. */
  katilanSayisi: number;
  /** Kaç FARKLI kişi — tek faaliyette ikisi eşittir, dönem raporunda ayrışır. */
  tekilKatilimci: number;
  katilimcilar: RaporKatilimcisi[];
  gorselAdlari: string[];
  /*
   * Koordinatörün/düzenleyenin YAZDIĞI değerlendirme. Rapor sayfasında
   * giriliyor; çıktının asıl içeriği budur. Boşsa rapor henüz yazılmamıştır
   * ve çıktı bunu açıkça söyler — sessizce boş bölüm bırakmak, raporun
   * yazıldığı ama içeriğin kaybolduğu izlenimi verirdi.
   */
  degerlendirme: string | null;
  kazanimlar: string | null;
  /** Değerlendirmeyi yazan ve son güncelleme; boşsa rapor yazılmamıştır. */
  raporYazan: string | null;
  raporTarihi: string | null;
  olusturan: string;
  olusturmaTarihi: string;
}

/** HTML'e gömülecek metni kaçırır. Rapor kullanıcı metni taşıyor (açıklama). */
export function htmlKacir(deger: string): string {
  return deger
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function satir(etiket: string, deger: string): string {
  return `<tr><td class="e">${htmlKacir(etiket)}</td><td>${htmlKacir(deger)}</td></tr>`;
}

export function faaliyetRaporuHtml(veri: RaporVerisi): string {
  const katilimciSatirlari =
    veri.katilimcilar.length === 0
      ? `<tr><td colspan="4">Seçilmiş katılımcı yok.</td></tr>`
      : veri.katilimcilar
          .map(
            (k, sira) =>
              `<tr><td>${sira + 1}</td><td>${htmlKacir(k.adSoyad)}</td>` +
              `<td>${htmlKacir(k.sinifVeyaBrans ?? "—")}</td>` +
              `<td>${htmlKacir(k.okul ?? k.il ?? "—")}</td></tr>`,
          )
          .join("");

  const gorseller =
    veri.gorselAdlari.length === 0
      ? "<p>Etkinliğe görsel eklenmemiş.</p>"
      : `<ul>${veri.gorselAdlari.map((ad) => `<li>${htmlKacir(ad)}</li>`).join("")}</ul>
         <p class="not">Görseller panelde etkinlik sayfasından indirilebilir; rapora
         gömülmez çünkü dosya boyutu Word belgesini kullanılamaz hâle getirir.</p>`;

  /*
   * `charset` meta etiketi ŞART: Word onsuz dosyayı Latin-1 sanıp Türkçe
   * karakterleri bozuyor.
   */
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
<meta charset="utf-8">
<title>${htmlKacir(veri.faaliyetAdi)} — Etkinlik Raporu</title>
<style>
body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
h1 { font-size: 16pt; }
h2 { font-size: 13pt; margin-top: 18pt; }
table { border-collapse: collapse; width: 100%; }
td, th { border: 1px solid #999; padding: 4pt 6pt; vertical-align: top; }
th { background: #eee; text-align: left; }
td.e { width: 30%; font-weight: bold; background: #f5f5f5; }
p.not { font-size: 9pt; color: #555; }
</style>
</head>
<body>
<h1>${htmlKacir(veri.faaliyetAdi)}</h1>
<p><em>GençTek Bilgi Sistemi — Etkinlik Raporu</em></p>

<h2>Etkinlik bilgileri</h2>
<table>
${satir("Kapsam", veri.kapsam)}
${satir("Etkinlik kategorisi", veri.kategori)}
${satir("Yer", veri.yer)}
${satir("Tarih", veri.tarih)}
${satir("Süre", veri.sure)}
${veri.katilimBicimi ? satir("Katılım biçimi", veri.katilimBicimi) : ""}
${veri.hedefKitle ? satir("Hedef kitle", veri.hedefKitle) : ""}
${satir("Düzenleyen", veri.duzenleyen)}
${satir("Düzenleyen birim", veri.duzenleyenBirim)}
</table>

<h2>Açıklama</h2>
<p>${htmlKacir(veri.aciklama).replace(/\n/g, "<br>")}</p>

<h2>Katılım</h2>
<table>
${satir("Kontenjan", String(veri.kontenjan))}
${satir("Toplam başvuru", String(veri.toplamBasvuru))}
${satir("Katılan (seçilmiş)", String(veri.katilanSayisi))}
${satir("Farklı kişi sayısı", String(veri.tekilKatilimci))}
</table>

<h2>${RAPOR_ALAN_ADLARI.degerlendirme}</h2>
${
  veri.degerlendirme
    ? `<p>${htmlKacir(veri.degerlendirme).replace(/\n/g, "<br>")}</p>` +
      (veri.raporYazan
        ? `<p class="not">Yazan: ${htmlKacir(veri.raporYazan)}${
            veri.raporTarihi ? ` · ${htmlKacir(veri.raporTarihi)}` : ""
          }</p>`
        : "")
    : "<p><em>Bu etkinliğin raporu henüz yazılmadı.</em></p>"
}

${
  veri.kazanimlar
    ? `<h2>${RAPOR_ALAN_ADLARI.kazanimlar}</h2><p>${htmlKacir(veri.kazanimlar).replace(/\n/g, "<br>")}</p>`
    : ""
}

<h2>Katılımcılar</h2>
<table>
<tr><th>#</th><th>Ad Soyad</th><th>Sınıf / Branş</th><th>Okul / İl</th></tr>
${katilimciSatirlari}
</table>

<h2>Görseller</h2>
${gorseller}

<p class="not">Bu rapor ${htmlKacir(veri.olusturan)} tarafından
${htmlKacir(veri.olusturmaTarihi)} tarihinde üretildi.</p>
</body>
</html>`;
}

/**
 * Word yanıtı.
 *
 * `application/msword` + `.doc`: Word dosyayı açarken içeriğin HTML olduğunu
 * kendisi anlıyor. `.docx` verilseydi Word bozuk ZIP hatası verirdi — docx bir
 * arşiv biçimidir, HTML değil.
 */
export function wordYaniti(dosyaAdi: string, html: string): Response {
  const gun = new Date().toISOString().slice(0, 10);
  const tamAd = `${dosyaAdi}-${gun}.doc`;

  return new Response(html, {
    headers: {
      "Content-Type": "application/msword; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(tamAd)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
```

### `src/lib/rapor/kirilim-istatistigi.ts`

```ts
import type { BasvuruDurumu } from "@/generated/prisma/enums";

/**
 * PROGRAM ve ÇALIŞMA GRUBU KIRILIMLI ETKİNLİK İSTATİSTİĞİ (14 Ağustos 2026).
 *
 * İstek: "etkinlik girerken iki alan var, seçilen Program (Temel Etkinlik ve
 * Çalışma Grubu Etkinliği için zorunlu), diğeri de İlgili çalışma grupları …
 * proje yöneticisi için tüm illerde ve okullarda … bunların istatistiğini csv
 * formatında çıktı alabileceğimiz bir alan olabilir mi, ama program ve çalışma
 * gruplarını ayrı ayrı alsın".
 *
 * ============================================================================
 * NEDEN İKİ AYRI ÇIKTI, TEK DOSYADA İKİ SÜTUN DEĞİL
 * ============================================================================
 * Bir etkinliğin programı EN FAZLA BİRDİR, çalışma grubu ise BİRDEN ÇOK
 * olabilir. İkisi tek tabloya konsaydı, iki çalışma grubuna bağlı bir etkinlik
 * program satırında bir kez, grup satırında iki kez sayılır ve aynı dosyada
 * birbirini tutmayan iki toplam çıkardı. İstek de zaten "ayrı ayrı alsın"
 * diyor.
 *
 * GRUP KIRILIMINDA ETKİNLİK TEKRAR SAYILIR ve bu bir hata değil, sorunun
 * kendisidir: "Yapay Zekâ grubuna kaç etkinlik dokundu" sorusunun cevabı,
 * etkinlik üç gruba birden bağlıysa üçünde de sayılmasıdır. Bu yüzden grup
 * dosyasının etkinlik sütunu toplandığında gerçek etkinlik sayısını AŞAR;
 * ekranda ve dosya başlığında yazılı.
 *
 * ============================================================================
 * HİÇBİR ETKİNLİK SESSİZCE DÜŞMEZ
 * ============================================================================
 * Programı olmayan (il etkinliği) ve grubu seçilmemiş etkinlikler ayrı bir
 * satırda toplanır. Elenselerdi dosyadaki toplam, sistemdeki etkinlik sayısını
 * tutmaz ve fark sessizce kaybolurdu. Aynı ilke okul kırılımında da geçerli:
 * il/ulusal etkinliğin okulu yoktur, "(okul dışı)" satırında durur.
 *
 * Bu dosya veritabanına BAKMAZ — kurallar birim testlerle doğrulanır.
 */

/** Kırılımın hangi alana göre yapıldığı. */
export type Kirilim = "program" | "grup";

/** Satırların hangi coğrafi/kurumsal düzeyde toplandığı. */
export type Duzey = "ulke" | "il" | "okul";

export const KIRILIM_ETIKETLERI: Record<Kirilim, string> = {
  program: "Program",
  grup: "Çalışma grubu",
};

export const DUZEY_ETIKETLERI: Record<Duzey, string> = {
  ulke: "Ülke geneli",
  il: "İl kırılımı",
  okul: "Okul kırılımı",
};

export const PROGRAMSIZ = "(program seçilmemiş)";
export const GRUPSUZ = "(çalışma grubu seçilmemiş)";
export const ILSIZ = "(ulusal etkinlik)";
export const OKULSUZ = "(okul dışı: il/ulusal etkinlik)";

export function kirilimGecerliMi(deger: string): deger is Kirilim {
  return deger === "program" || deger === "grup";
}

export function duzeyGecerliMi(deger: string): deger is Duzey {
  return deger === "ulke" || deger === "il" || deger === "okul";
}

export interface IstatistikBasvurusu {
  durum: BasvuruDurumu;
  /** NULL = yoklama alınmadı. Katılan sayısı yalnızca `true` olanlardır. */
  katildiMi: boolean | null;
}

export interface IstatistikFaaliyeti {
  id: number;
  kontenjan: number;
  raporVarMi: boolean;
  /** Etkinliğin ili: kapsam=IL'de kendi ili, kapsam=OKUL'da okulun ili. */
  ilKodu: string | null;
  ilAdi: string | null;
  kurumKodu: number | null;
  kurumAdi: string | null;
  /** Temel etkinlik programı; il etkinliğinde boştur. */
  programAdi: string | null;
  /** İlgili çalışma grupları — sıfır, bir ya da birden çok olabilir. */
  gruplar: string[];
  basvurular: IstatistikBasvurusu[];
}

export interface KirilimSatiri {
  ilKodu: string;
  ilAdi: string;
  kurumKodu: string;
  kurumAdi: string;
  /** Program ya da çalışma grubu adı (kırılıma göre). */
  birim: string;
  etkinlik: number;
  kontenjan: number;
  /** Geri çekilmemiş ve iptal olmamış başvurular. */
  basvuru: number;
  secilen: number;
  yedek: number;
  /** Yoklamada "geldi" işaretlenenler. */
  katilan: number;
  /** Raporu yazılmış etkinlik sayısı. */
  raporlu: number;
}

/**
 * Sayıma giren başvurular.
 *
 * Geri çekilen ve etkinlik iptalinden kapanan başvurular DIŞARIDA: ikisi de
 * "bu etkinliğe talep vardı" demiyor. Reddedilen ise SAYILIR — talep edilmiş
 * ama karşılanmamış olmak, kontenjan tartışmasının asıl verisidir.
 */
function basvuruSayilirMi(durum: BasvuruDurumu): boolean {
  return durum !== "GERI_CEKILDI" && durum !== "IPTAL_EDILDI";
}

/**
 * Bir etkinliğin hangi birim adlarına yazılacağı.
 *
 * `birim` SÜZGECİ (14 Ağustos 2026 · istek: çıktı sayfasında çalışma grubu ve
 * program listelerinin seçilebilmesi): tek bir grup seçildiğinde, o gruba
 * bağlı etkinliğin DİĞER grupları satır açmamalı. Yalnızca etkinlikleri
 * süzüp satırları süzmeseydik, "Robotik" seçen kişi dosyada "Yapay Zekâ"
 * satırını da görür ve süzgecin çalışmadığını düşünürdü.
 */
function birimAdlari(
  faaliyet: IstatistikFaaliyeti,
  kirilim: Kirilim,
  birimSuzgeci: string | null,
): string[] {
  const tumu =
    kirilim === "program"
      ? [faaliyet.programAdi?.trim() || PROGRAMSIZ]
      : (() => {
          const gruplar = faaliyet.gruplar
            .map((ad) => ad.trim())
            .filter((ad) => ad.length > 0);
          return gruplar.length > 0 ? [...new Set(gruplar)] : [GRUPSUZ];
        })();

  if (!birimSuzgeci) return tumu;
  return tumu.filter((ad) => ad === birimSuzgeci);
}

/** Satırın coğrafi/kurumsal anahtarı. */
function yerAnahtari(
  faaliyet: IstatistikFaaliyeti,
  duzey: Duzey,
): { ilKodu: string; ilAdi: string; kurumKodu: string; kurumAdi: string } {
  if (duzey === "ulke") {
    return { ilKodu: "", ilAdi: "", kurumKodu: "", kurumAdi: "" };
  }

  const ilKodu = faaliyet.ilKodu ?? "";
  const ilAdi = faaliyet.ilAdi ?? ILSIZ;

  if (duzey === "il") {
    return { ilKodu, ilAdi, kurumKodu: "", kurumAdi: "" };
  }

  return {
    ilKodu,
    ilAdi,
    kurumKodu: faaliyet.kurumKodu === null ? "" : String(faaliyet.kurumKodu),
    kurumAdi: faaliyet.kurumAdi ?? OKULSUZ,
  };
}

/**
 * Etkinlikleri seçilen kırılım ve düzeyde satırlara toplar.
 *
 * SIRALAMA dosyanın okunma sırasıdır: önce il (kod), sonra okul, en sonda
 * birim adı. Sayıya göre sıralanmadı — CSV'yi açan kişi zaten kendi sütununa
 * göre sıralayacak, ama "aynı ilin satırları bir arada" olmasını elektronik
 * tablo geri getiremez.
 */
export function kirilimSatirlari(
  faaliyetler: readonly IstatistikFaaliyeti[],
  secim: {
    kirilim: Kirilim;
    duzey: Duzey;
    /** Tek bir program/çalışma grubu adına daralt; boş = tümü. */
    birim?: string | null;
  },
): KirilimSatiri[] {
  const satirlar = new Map<string, KirilimSatiri>();
  const birimSuzgeci = secim.birim?.trim() || null;

  for (const faaliyet of faaliyetler) {
    const yer = yerAnahtari(faaliyet, secim.duzey);

    const sayilanlar = faaliyet.basvurular.filter((basvuru) =>
      basvuruSayilirMi(basvuru.durum),
    );
    const secilen = sayilanlar.filter(
      (basvuru) => basvuru.durum === "SECILDI",
    ).length;
    const yedek = sayilanlar.filter(
      (basvuru) => basvuru.durum === "YEDEK",
    ).length;
    const katilan = sayilanlar.filter(
      (basvuru) => basvuru.katildiMi === true,
    ).length;

    for (const birim of birimAdlari(faaliyet, secim.kirilim, birimSuzgeci)) {
      const anahtar = `${yer.ilKodu}|${yer.kurumKodu}|${birim}`;
      const mevcut = satirlar.get(anahtar) ?? {
        ...yer,
        birim,
        etkinlik: 0,
        kontenjan: 0,
        basvuru: 0,
        secilen: 0,
        yedek: 0,
        katilan: 0,
        raporlu: 0,
      };

      mevcut.etkinlik += 1;
      mevcut.kontenjan += faaliyet.kontenjan;
      mevcut.basvuru += sayilanlar.length;
      mevcut.secilen += secilen;
      mevcut.yedek += yedek;
      mevcut.katilan += katilan;
      if (faaliyet.raporVarMi) mevcut.raporlu += 1;

      satirlar.set(anahtar, mevcut);
    }
  }

  const karsilastir = (a: string, b: string) => a.localeCompare(b, "tr");

  return [...satirlar.values()].sort(
    (a, b) =>
      karsilastir(a.ilAdi, b.ilAdi) ||
      karsilastir(a.kurumAdi, b.kurumAdi) ||
      karsilastir(a.birim, b.birim),
  );
}

/**
 * Dosyanın sütun başlıkları.
 *
 * Düzeye göre değişiyor: ülke genelinde il ve okul sütunları hep boş kalırdı
 * ve boş sütun, "veri eksik mi" sorusunu doğurur.
 */
export function kirilimBasliklari(secim: {
  kirilim: Kirilim;
  duzey: Duzey;
}): string[] {
  const yer =
    secim.duzey === "ulke"
      ? []
      : secim.duzey === "il"
        ? ["İl kodu", "İl"]
        : ["İl kodu", "İl", "Kurum kodu", "Okul"];

  return [
    ...yer,
    KIRILIM_ETIKETLERI[secim.kirilim],
    "Etkinlik",
    "Toplam kontenjan",
    "Başvuru",
    "Seçilen",
    "Yedek",
    "Katılan (yoklama)",
    "Raporu yazılmış etkinlik",
  ];
}

/** Satırı, başlıklarla aynı sırada hücrelere çevirir. */
export function kirilimHucreleri(
  satir: KirilimSatiri,
  secim: { kirilim: Kirilim; duzey: Duzey },
): unknown[] {
  const yer =
    secim.duzey === "ulke"
      ? []
      : secim.duzey === "il"
        ? [satir.ilKodu, satir.ilAdi]
        : [satir.ilKodu, satir.ilAdi, satir.kurumKodu, satir.kurumAdi];

  return [
    ...yer,
    satir.birim,
    satir.etkinlik,
    satir.kontenjan,
    satir.basvuru,
    satir.secilen,
    satir.yedek,
    satir.katilan,
    satir.raporlu,
  ];
}
```

### `src/lib/rapor/yonetim-kurallari.ts`

```ts
/**
 * Yönetim panosunun saf kuralları.
 *
 * Sayımlardan (yonetim-ozeti.ts) AYRI dosyada: o dosya veritabanına bağlanıyor,
 * bu dosya yalnızca hesap yapıyor ve testten doğrudan çağrılabiliyor
 * (bkz. tests/yonetim-panosu.test.ts). Aynı ayrım projede başka yerlerde de var
 * — kural dosyaları hiçbir zaman prisma'ya dokunmuyor.
 */

export interface OzetToplami {
  ilce: number;
  okul: number;
  ogretmen: number;
  danismanOgretmen: number;
  ogrenci: number;
  /** Danışman öğretmen atanmamış aktif okul. */
  danismansizOkul: number;
  /** İl koordinatörü atanmamış il — yalnızca il kartlarında dolar. */
  koordinatorsuzIl: number;
  /** Aktif danışman ataması olmayan öğrenci. */
  danismansizOgrenci: number;
  /** Bu eğitim-öğretim yılının etkinlikleri — yalnızca il kartlarında dolar. */
  faaliyet: number;
  /** Bitmiş ama raporu yazılmamış etkinlik. */
  raporsuzFaaliyet: number;
}

/**
 * Kart listesinin üstünde gösterilen toplam.
 *
 * Ayrı bir sorgu ile ÇEKİLMEZ, kartlardan toplanır: iki kaynak kullanılsaydı
 * kartların toplamı ile başlıktaki sayı birbirini tutmayabilir ve hangisinin
 * doğru olduğu anlaşılmazdı (ilçesi boş bir kayıt tam olarak bunu yapardı).
 *
 * ALAN EKSİKLİĞİ BASAMAĞI SÖYLER; her satır kendi basamağında bir birimdir:
 *
 *   - Okul kartında `okulSayisi` yoktur, kartın kendisi bir okuldur → satır bir
 *     okul sayılır. Sıfır sayılsaydı ilçenin okul toplamı, ekranda okullar
 *     dururken 0 görünürdü.
 *   - İlçe kartında `ilceSayisi` yoktur, kartın kendisi bir ilçedir → satır bir
 *     ilçe sayılır. Okul kartında ise ilçe diye bir şey yok, sıfır sayılır;
 *     ölçüt olarak `okulSayisi`ın varlığına bakılır, çünkü basamağı ayıran alan
 *     odur.
 *   - Okul kartında "danışmansız okul" alanı yoktur: koordinatör sayısı
 *     sıfırsa o kartın kendisi boş bir okuldur.
 *   - `koordinatorAdi` yalnızca il kartında bulunur; boş olan il, merkezin
 *     dolduracağı yerdir. Alan hiç yoksa (ilçe/okul kartı) sayılmaz —
 *     `undefined` ile `null` bilerek ayrı tutuluyor.
 */
export function ozetToplami(
  satirlar: readonly {
    ilceSayisi?: number;
    okulSayisi?: number;
    danismansizOkulSayisi?: number;
    ogretmenSayisi: number;
    danismanOgretmenSayisi: number;
    ogrenciSayisi: number;
    danismansizOgrenciSayisi: number;
    faaliyetSayisi?: number;
    raporsuzFaaliyetSayisi?: number;
    koordinatorAdi?: string | null;
  }[],
): OzetToplami {
  return satirlar.reduce<OzetToplami>(
    (toplam, satir) => ({
      ilce:
        toplam.ilce +
        (satir.ilceSayisi ?? (satir.okulSayisi === undefined ? 0 : 1)),
      okul: toplam.okul + (satir.okulSayisi ?? 1),
      ogretmen: toplam.ogretmen + satir.ogretmenSayisi,
      danismanOgretmen: toplam.danismanOgretmen + satir.danismanOgretmenSayisi,
      ogrenci: toplam.ogrenci + satir.ogrenciSayisi,
      danismansizOkul:
        toplam.danismansizOkul +
        (satir.danismansizOkulSayisi ??
          (satir.danismanOgretmenSayisi === 0 ? 1 : 0)),
      koordinatorsuzIl:
        toplam.koordinatorsuzIl + (satir.koordinatorAdi === null ? 1 : 0),
      danismansizOgrenci:
        toplam.danismansizOgrenci + satir.danismansizOgrenciSayisi,
      /*
       * Etkinlik yalnızca İL kartında sorulur (bkz. yonetim-ozeti.ts ·
       * ilOzetleriniGetir); ilçe ve okul satırında alan yoktur ve sıfır
       * sayılır. Okuldaki gibi "satır bir birimdir" kuralı burada YOK, çünkü
       * bir ilçe kartı bir etkinlik değildir.
       */
      faaliyet: toplam.faaliyet + (satir.faaliyetSayisi ?? 0),
      raporsuzFaaliyet:
        toplam.raporsuzFaaliyet + (satir.raporsuzFaaliyetSayisi ?? 0),
    }),
    {
      ilce: 0,
      okul: 0,
      ogretmen: 0,
      danismanOgretmen: 0,
      ogrenci: 0,
      danismansizOkul: 0,
      koordinatorsuzIl: 0,
      danismansizOgrenci: 0,
      faaliyet: 0,
      raporsuzFaaliyet: 0,
    },
  );
}

/** İl kartlarının sıralama ölçütü. */
export type IlSiralamasi = "ad" | "ogrenci" | "bosluk";

export function ilSiralamasiCoz(deger: string | undefined): IlSiralamasi {
  return deger === "ogrenci" || deger === "bosluk" ? deger : "ad";
}

/** Türkçe harflere göre karşılaştırma — "Iğdır" ile "İstanbul" doğru sırada. */
function adaGore(a: { ad: string }, b: { ad: string }): number {
  return a.ad.localeCompare(b.ad, "tr");
}

/**
 * Arama metnini karşılaştırılabilir hâle getirir.
 *
 * Küçültme TÜRKÇE yapılır: "Isparta" araması İngilizce küçültmeyle "ısparta"
 * değil "isparta" olur ve ile hiç ulaşılamazdı.
 */
function sadelestir(metin: string): string {
  return metin.trim().toLocaleLowerCase("tr");
}

export interface IlSuzgeci {
  ara?: string;
  sirala?: IlSiralamasi;
}

/**
 * 81 ilin kart listesini süzer ve sıralar.
 *
 * SIRALAMA VERİTABANINDA DEĞİL BURADA: "boşluğu çok olan üstte" ölçütü üç ayrı
 * sayımın bileşimi (koordinatörsüz il, danışmansız okul, danışmansız
 * öğrenci) ve bu sayımlar ayrı sorgulardan geliyor — tek bir `orderBy` ile
 * ifade edilemezdi. Liste 81 satır; sıralamanın maliyeti yok.
 *
 * "Boşluk" sıralaması TOPLAM BİR PUAN DEĞİL, sıralı bir karşılaştırmadır: önce
 * koordinatörü olmayan iller, sonra danışmansız okulu çok olanlar, sonra
 * danışmansız öğrencisi çok olanlar. Üç sayı toplansaydı 200 danışmansız
 * öğrencisi olan bir il, koordinatörü hiç olmayan ilin üstüne çıkardı; oysa
 * ikisi aynı ağırlıkta iş değil.
 */
export function illeriSuz<
  T extends {
    ad: string;
    danismansizOkulSayisi: number;
    danismansizOgrenciSayisi: number;
    ogrenciSayisi: number;
    koordinatorAdi: string | null;
  },
>(iller: readonly T[], suzgec: IlSuzgeci = {}): T[] {
  const aranan = sadelestir(suzgec.ara ?? "");
  const suzulmus = aranan
    ? iller.filter((il) => sadelestir(il.ad).includes(aranan))
    : [...iller];

  if (suzgec.sirala === "ogrenci") {
    return suzulmus.sort(
      (a, b) => b.ogrenciSayisi - a.ogrenciSayisi || adaGore(a, b),
    );
  }

  if (suzgec.sirala === "bosluk") {
    return suzulmus.sort(
      (a, b) =>
        Number(a.koordinatorAdi === null ? 0 : 1) -
          Number(b.koordinatorAdi === null ? 0 : 1) ||
        b.danismansizOkulSayisi - a.danismansizOkulSayisi ||
        b.danismansizOgrenciSayisi - a.danismansizOgrenciSayisi ||
        adaGore(a, b),
    );
  }

  return suzulmus.sort(adaGore);
}

/**
 * Bir birimin kartında gösterilecek uyarı satırları.
 *
 * SIFIR OLAN UYARI YAZILMAZ: "0 danışmansız öğrenci" bir haber değil, gürültü.
 * Kart yalnızca yapılacak iş varken kırmızıya döner, böylece ekranda kırmızı
 * görmek bir anlam taşır.
 */
export function birimUyarilari(satir: {
  danismansizOkulSayisi?: number;
  danismansizOgrenciSayisi: number;
  raporsuzFaaliyetSayisi?: number;
}): string[] {
  const uyarilar: string[] = [];

  if (satir.danismansizOkulSayisi) {
    uyarilar.push(`${satir.danismansizOkulSayisi} okulda danışman öğretmen yok`);
  }
  if (satir.danismansizOgrenciSayisi) {
    uyarilar.push(`${satir.danismansizOgrenciSayisi} öğrencinin danışmanı yok`);
  }
  if (satir.raporsuzFaaliyetSayisi) {
    uyarilar.push(`${satir.raporsuzFaaliyetSayisi} etkinliğin raporu eksik`);
  }

  return uyarilar;
}

/** Yol izindeki tek basamak; `yol` yoksa bulunulan sayfadır (bkz. YolIzi). */
export interface YonetimAdimi {
  etiket: string;
  yol?: string;
}

/** Yol izinin işaret ettiği yer — hangi basamağa kadar inildiği. */
export interface YonetimYeri {
  il?: { ilKodu: string; ad: string } | null;
  ilce?: { ilceKodu: string; ad: string } | null;
  /** Okulun panoda kendi ekranı yoktur; yalnızca ad olarak yazılır. */
  okul?: { ad: string } | null;
}

/**
 * Envanter ekranlarının (Öğrenciler / Öğretmenler) yol izi.
 *
 * 12 AĞUSTOS 2026 · istek: "panoda il, sonra ilçe seçince yol izi çıkıyor ama
 * oradan öğrencilere ya da öğretmenlere geçince kayboluyor; geri dönmek için
 * tarayıcının geri düğmesine basmak gerekiyor".
 *
 * Envanterler pano kartlarından ve ilçe ekranındaki okul kartlarından açılıyor;
 * il koordinatörü ile merkezin menüsünde bu ekranların sekmesi YOK, tek kapı
 * pano (bkz. app/panel/layout.tsx). Dolayısıyla ekranın üstündeki bu şerit
 * süsleme değil, geri dönüş yolunun kendisi.
 *
 * BASAMAKLAR SÜZGEÇTEN TÜRETİLİR, "nereden gelindi" bilgisinden değil: adres
 * çubuğundaki il/ilçe/okul zaten kırılımın hangi basamağında olunduğunu
 * söylüyor. Ayrı bir "kaynak" parametresi taşınsaydı süzgeç elle değiştirildiği
 * anda şerit ekrandaki listeyle çelişirdi.
 *
 * Kapsam kontrolü BURADA YAPILMAZ: hangi ilin basamaklarının yazılabileceğine
 * çağıran ekran karar verir (bkz. yonetimPanosuIlErisimi) — bu dosya prisma'ya
 * da yetkiye de dokunmaz.
 */
export function yonetimYolIzi(
  sonAdim: string,
  yer: YonetimYeri = {},
): YonetimAdimi[] {
  const adimlar: YonetimAdimi[] = [
    { etiket: "Yönetim Paneli", yol: "/panel/yonetim" },
  ];

  if (yer.il) {
    adimlar.push({
      etiket: yer.il.ad,
      yol: `/panel/yonetim/il/${yer.il.ilKodu}`,
    });
  }
  if (yer.ilce) {
    adimlar.push({
      etiket: yer.ilce.ad,
      yol: `/panel/yonetim/ilce/${yer.ilce.ilceKodu}`,
    });
  }
  if (yer.okul) {
    adimlar.push({ etiket: yer.okul.ad });
  }

  adimlar.push({ etiket: sonAdim });
  return adimlar;
}
```

### `src/lib/rol/karar.ts`

```ts
import type { RolKodu } from "@/generated/prisma/enums";

/**
 * İl koordinatörü atamasının saf kararları — references/domain-rules.md Bölüm 3.
 *
 * Veritabanına giden iş (rol kaydını kapatıp açmak, öğrencileri dağıtmak)
 * src/lib/rol/koordinator.ts içindedir; burada yalnızca "bu atama olur mu" ve
 * "kaç öğrenci etkilendi" soruları yanıtlanır. Ayrı durmalarının nedeni bu iki
 * sorunun birim testle sınanabilmesi: dağıtım bir kez çalıştıktan sonra geri
 * sayılamaz, yanlış kararın izi de kalmaz.
 */

export type KoordinatorAtamaEngeli =
  | "KULLANICI_YOK"
  | "OGRENCIYE_VERILMEZ"
  | "ZATEN_KOORDINATOR"
  | "GECERSIZ_IL"
  | "IL_DOLU";

export const KOORDINATOR_ATAMA_ENGEL_MESAJLARI: Record<
  KoordinatorAtamaEngeli,
  string
> = {
  KULLANICI_YOK: "Kullanıcı bulunamadı.",
  OGRENCIYE_VERILMEZ: "İl koordinatörlüğü yalnızca öğretmenlere verilir.",
  ZATEN_KOORDINATOR: "Bu öğretmen zaten il koordinatörü olarak görevli.",
  GECERSIZ_IL: "Geçersiz il.",
  IL_DOLU:
    "Bu ilde görevli bir il koordinatörü zaten var. Önce mevcut görevi kaldırın.",
};

/**
 * Atamayı engelleyen ilk durumu döndürür, engel yoksa null.
 *
 * DANIŞMAN ROLÜ ENGEL DEĞİLDİR: danışman öğretmen il koordinatörü yapılabilir
 * (karara bağlanmış madde). Danışmanlığı kapanır ve öğrencileri devir
 * kurallarına göre dağıtılır — bu yüzden burada elenmez.
 */
export function koordinatorAtamaEngeli(girdi: {
  hedefVarMi: boolean;
  hedefAktifMi: boolean;
  hedefRolKodlari: RolKodu[];
  ilTanimliMi: boolean;
  ildeGorevliKoordinatorVarMi: boolean;
}): KoordinatorAtamaEngeli | null {
  if (!girdi.hedefVarMi || !girdi.hedefAktifMi) return "KULLANICI_YOK";
  if (girdi.hedefRolKodlari.includes("OGRENCI")) return "OGRENCIYE_VERILMEZ";
  if (girdi.hedefRolKodlari.includes("IL_KOORDINATOR")) {
    return "ZATEN_KOORDINATOR";
  }
  if (!girdi.ilTanimliMi) return "GECERSIZ_IL";
  if (girdi.ildeGorevliKoordinatorVarMi) return "IL_DOLU";
  return null;
}

export interface KoordinatorAtamaSonucu {
  koordinatorKullaniciId: number;
  /** Atanan kişi bu işlemden önce danışman öğretmen miydi? */
  danismanliktanAlindiMi: boolean;
  /** Danışmanlığı kapandığı için başka bir danışmana devredilen öğrenciler. */
  devredilenOgrenciSayisi: number;
  /** "Yeniden seç" bildirimi gönderilen, geçici olarak koordinatöre bağlananlar. */
  yenidenSecimBekleyen: number;
  /** Koordinatör boşluğu yüzünden atamasız kalmışken bu atamayla bağlananlar. */
  sahipsizkenBaglananOgrenciSayisi: number;
}

/**
 * "X öğrenci yeniden dağıtıldı" uyarısındaki sayı.
 *
 * Yalnızca atananın DANIŞMANLIĞI kapandığı için yer değiştiren öğrencileri
 * sayar. Koordinatör boşluğu yüzünden atamasız kalmışken bu atamayla bağlanan
 * öğrenciler buraya girmez: onlar dağıtılmadı, tersine sahipsizlikten çıktı ve
 * ayrı bir cümleyle bildirilir. İkisi tek sayıda toplanırsa proje yöneticisi
 * "danışman değişikliğinden kaç öğrenci etkilendi" sorusunun cevabını yanlış
 * okur.
 */
export function yenidenDagitilanOgrenciSayisi(
  sonuc: KoordinatorAtamaSonucu,
): number {
  return sonuc.devredilenOgrenciSayisi + sonuc.yenidenSecimBekleyen;
}
```

### `src/lib/sms/govde.ts`

```ts
/**
 * SMS gövdesinin hazırlanması.
 *
 * Veritabanına ve ortam değişkenlerine BAKMAYAN ayrı bir dosyada duruyor:
 * kırpma kuralı birim testle sınanabilmeli, test için de veritabanı bağlantısı
 * gerekmemeli (aynı ayrım src/lib/faaliyet/kurallar.ts'de de var).
 */

/** SMS'in tek parçaya sığması için üst sınır. */
export const SMS_GOVDE_UST_SINIRI = 300;

/**
 * Başlık ve içerik tek metne indirilir; sınırı aşarsa kırpılır.
 *
 * Satır sonları tek boşluğa çevrilir: panel bildirimleri çok satırlı yazılıyor
 * ama SMS'te her satır sonu boşa karakter harcar. Yarım kalan cümle üç noktayla
 * bitirilir — kırpıldığı belli olmayan bir metin, eksik bilgiyi tam sanıp
 * yanlış karar verdirir.
 */
export function smsGovdesiHazirla(baslik: string, icerik: string): string {
  const tekSatir = `${baslik}: ${icerik}`.replace(/\s+/g, " ").trim();
  if (tekSatir.length <= SMS_GOVDE_UST_SINIRI) return tekSatir;
  return `${tekSatir.slice(0, SMS_GOVDE_UST_SINIRI - 3)}...`;
}
```

### `src/lib/zip.ts`

```ts
import { deflateRawSync } from "node:zlib";

/**
 * Küçük bir ZIP yazıcısı (12 Ağustos 2026).
 *
 * İSTEK: "etkinlik raporu sayfasında etkinliğe dair kaç görsel yüklendiyse
 * onları toplu indirecek bir düğme lazım; sıkıştırıp hepsini indirmek mümkün
 * olur mu."
 *
 * ---------------------------------------------------------------------------
 * NEDEN PAKET DEĞİL DE ELLE
 * ---------------------------------------------------------------------------
 * Projede zip kütüphanesi yok ve bu iş için bir tane eklemek, taşınacak
 * bağımlılık ile yapılan işin oransız olduğu bir durum: burada gereken ZIP'in
 * tamamı değil, "birkaç dosyayı tek arşivde topla"dan ibaret. Yazılan biçim
 * standart PKZIP: Windows Gezgini, macOS Arşiv Yardımcısı ve 7-Zip açar.
 *
 * KAPSAM DIŞI (bilerek): parola, zip64 (4 GB üstü arşiv), klasör ağacı, akış
 * (streaming). Etkinlik görselleri dosya başına birkaç MB ve sayıları onlarla
 * ifade ediliyor; hepsi belleğe sığar. Bu sınırlar aşılacaksa doğru cevap bu
 * dosyayı büyütmek değil, gerçek bir kütüphane eklemektir.
 *
 * SIKIŞTIRMA "deflate" AMA ZORUNLU DEĞİL: JPEG ve PNG zaten sıkıştırılmış
 * biçimler, yeniden sıkıştırmak çoğu zaman dosyayı BÜYÜTÜR. Bu yüzden her giriş
 * için ikisi de denenip küçük olan yazılıyor (bkz. `girisiHazirla`).
 */

/** Arşive girecek tek bir dosya. */
export interface ZipGirisi {
  /** Arşiv içindeki ad. Klasör ayracı içermemeli. */
  ad: string;
  icerik: Buffer;
  /** Dosyanın tarihi; verilmezse "şimdi". */
  tarih?: Date;
}

// CRC32 tablosu — ZIP her giriş için bu sağlamayı istiyor.
const CRC_TABLOSU = (() => {
  const tablo = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let deger = i;
    for (let bit = 0; bit < 8; bit += 1) {
      deger = deger & 1 ? 0xedb88320 ^ (deger >>> 1) : deger >>> 1;
    }
    tablo[i] = deger >>> 0;
  }
  return tablo;
})();

export function crc32(veri: Buffer): number {
  let crc = 0xffffffff;
  for (const bayt of veri) {
    crc = CRC_TABLOSU[(crc ^ bayt) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Tarihi DOS biçimine çevirir (ZIP 1980'den beri bu iki 16 bitlik alanı
 * kullanıyor). 1980 öncesi tarihler alt sınıra çekilir: negatif yıl alanı
 * arşivi bozar.
 */
function dosZamani(tarih: Date): { saat: number; gun: number } {
  const yil = Math.max(1980, tarih.getFullYear());
  return {
    saat:
      (tarih.getHours() << 11) |
      (tarih.getMinutes() << 5) |
      (Math.floor(tarih.getSeconds() / 2) & 0x1f),
    gun: ((yil - 1980) << 9) | ((tarih.getMonth() + 1) << 5) | tarih.getDate(),
  };
}

/**
 * Arşiv içindeki adı güvenli hâle getirir.
 *
 * Klasör ayracı ve `..` DÜŞÜRÜLÜR: zip açıcıların bir kısmı arşivdeki yolu
 * olduğu gibi kullanıyor ve "../" içeren bir ad, açan kişinin dizininin
 * dışına dosya yazabilir (zip slip). Ad kullanıcı yüklemesinden geliyor,
 * dolayısıyla güvenilmez.
 */
export function zipAdiTemizle(ad: string): string {
  const temiz = ad
    .replace(/[\\/]/g, "_")
    .replace(/^\.+/, "")
    // Denetim karakterleri ve Windows'ta dosya adında yasak olanlar.
    .replace(/[\u0000-\u001f\u007f:*?"<>|]/g, "")
    .trim();
  return temiz.slice(0, 200) || "dosya";
}

/**
 * Aynı adı taşıyan girişleri ayırır: "kare.png", "kare (2).png"…
 *
 * ZIP aynı adı iki kez taşıyabilir ama açan program birini diğerinin üzerine
 * yazar ve kullanıcı dosyayı sessizce kaybeder.
 */
export function adlariTekillestir(adlar: readonly string[]): string[] {
  const sayac = new Map<string, number>();
  return adlar.map((ham) => {
    const ad = zipAdiTemizle(ham);
    const mevcut = sayac.get(ad.toLocaleLowerCase("tr")) ?? 0;
    sayac.set(ad.toLocaleLowerCase("tr"), mevcut + 1);
    if (mevcut === 0) return ad;

    const nokta = ad.lastIndexOf(".");
    const govde = nokta > 0 ? ad.slice(0, nokta) : ad;
    const uzanti = nokta > 0 ? ad.slice(nokta) : "";
    return `${govde} (${mevcut + 1})${uzanti}`;
  });
}

interface HazirGiris {
  ad: Buffer;
  veri: Buffer;
  yontem: number;
  crc: number;
  hamBoyut: number;
  tarih: Date;
}

function girisiHazirla(giris: ZipGirisi, ad: string): HazirGiris {
  const sikistirilmis = deflateRawSync(giris.icerik);
  /*
   * JPEG/PNG yeniden sıkıştırılınca büyüyebiliyor. Büyüdüyse ham hâli
   * yazılıyor (yöntem 0 = store); arşiv her hâlükârda geçerli kalıyor.
   */
  const kazandiMi = sikistirilmis.length < giris.icerik.length;

  return {
    ad: Buffer.from(ad, "utf8"),
    veri: kazandiMi ? sikistirilmis : giris.icerik,
    yontem: kazandiMi ? 8 : 0,
    crc: crc32(giris.icerik),
    hamBoyut: giris.icerik.length,
    tarih: giris.tarih ?? new Date(),
  };
}

/**
 * Girişlerden tek bir ZIP arşivi üretir.
 *
 * Bayrak `0x0800` (UTF-8 ad) her girişte açık: dosya adları Türkçe ve bayrak
 * olmadan Windows arşivi kendi kod sayfasıyla okur, "Görsel.png" bozuk çıkar.
 */
export function zipOlustur(girisler: readonly ZipGirisi[]): Buffer {
  const adlar = adlariTekillestir(girisler.map((giris) => giris.ad));
  const hazirlar = girisler.map((giris, sira) =>
    girisiHazirla(giris, adlar[sira]),
  );

  const yerelBloklar: Buffer[] = [];
  const merkezBloklar: Buffer[] = [];
  let konum = 0;

  for (const giris of hazirlar) {
    const { saat, gun } = dosZamani(giris.tarih);

    const yerelBaslik = Buffer.alloc(30);
    yerelBaslik.writeUInt32LE(0x04034b50, 0); // imza
    yerelBaslik.writeUInt16LE(20, 4); // gereken sürüm (2.0)
    yerelBaslik.writeUInt16LE(0x0800, 6); // bayrak: ad UTF-8
    yerelBaslik.writeUInt16LE(giris.yontem, 8);
    yerelBaslik.writeUInt16LE(saat, 10);
    yerelBaslik.writeUInt16LE(gun, 12);
    yerelBaslik.writeUInt32LE(giris.crc, 14);
    yerelBaslik.writeUInt32LE(giris.veri.length, 18);
    yerelBaslik.writeUInt32LE(giris.hamBoyut, 22);
    yerelBaslik.writeUInt16LE(giris.ad.length, 26);
    yerelBaslik.writeUInt16LE(0, 28); // ek alan yok

    const merkezBaslik = Buffer.alloc(46);
    merkezBaslik.writeUInt32LE(0x02014b50, 0);
    merkezBaslik.writeUInt16LE(20, 4); // üreten sürüm
    merkezBaslik.writeUInt16LE(20, 6); // gereken sürüm
    merkezBaslik.writeUInt16LE(0x0800, 8);
    merkezBaslik.writeUInt16LE(giris.yontem, 10);
    merkezBaslik.writeUInt16LE(saat, 12);
    merkezBaslik.writeUInt16LE(gun, 14);
    merkezBaslik.writeUInt32LE(giris.crc, 16);
    merkezBaslik.writeUInt32LE(giris.veri.length, 20);
    merkezBaslik.writeUInt32LE(giris.hamBoyut, 24);
    merkezBaslik.writeUInt16LE(giris.ad.length, 28);
    merkezBaslik.writeUInt16LE(0, 30); // ek alan
    merkezBaslik.writeUInt16LE(0, 32); // açıklama
    merkezBaslik.writeUInt16LE(0, 34); // disk numarası
    merkezBaslik.writeUInt16LE(0, 36); // iç öznitelik
    merkezBaslik.writeUInt32LE(0, 38); // dış öznitelik
    merkezBaslik.writeUInt32LE(konum, 42); // yerel başlığın konumu

    yerelBloklar.push(yerelBaslik, giris.ad, giris.veri);
    merkezBloklar.push(merkezBaslik, giris.ad);
    konum += yerelBaslik.length + giris.ad.length + giris.veri.length;
  }

  const merkez = Buffer.concat(merkezBloklar);

  const son = Buffer.alloc(22);
  son.writeUInt32LE(0x06054b50, 0);
  son.writeUInt16LE(0, 4); // bu disk
  son.writeUInt16LE(0, 6); // merkezin başladığı disk
  son.writeUInt16LE(hazirlar.length, 8);
  son.writeUInt16LE(hazirlar.length, 10);
  son.writeUInt32LE(merkez.length, 12);
  son.writeUInt32LE(konum, 16);
  son.writeUInt16LE(0, 20); // arşiv açıklaması yok

  return Buffer.concat([...yerelBloklar, merkez, son]);
}
```
