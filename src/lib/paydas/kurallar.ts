import type { PaydasTuru } from "@/generated/prisma/enums";

/**
 * Paydaş envanteri kuralları — analiz dokümanı Bölüm 3.
 *
 * Bu dosya veritabanına BAKMAZ; kararlar saf tutulur ki birim testle eksiksiz
 * kapsanabilsinler (aynı yaklaşım src/lib/faaliyet/kurallar.ts'de).
 */

/*
 * Sıra ekrandaki açılır listenin sırasıdır ve rastgele değildir: mezun
 * paydaşlar en üstte, çünkü ilin en sık eklediği ve aradığı kayıtlar bunlar.
 *
 * "GENÇTEK ÜNİVERSİTESİ" VE "MESLEK KURULUŞU" LİSTEDEN ÇIKTI (27 Ağustos 2026 ·
 * istek: "paydaş türü gençtek üniversitesi kalkacak, meslek kuruluşu
 * kalkacak").
 *
 * GençTek üniversitesi, `UNIVERSITE`den yalnızca "protokolü var mı" sorusuyla
 * ayrılıyordu; protokol bir tür değil bir ilişki durumudur ve iş birliği alanı
 * alanında zaten yazılıyor. Meslek kuruluşu ise pratikte STK ile aynı kapıya
 * çıkıyordu.
 *
 * ENUM DEĞERLERİ SİLİNMEDİ ve etiketleri aşağıda DURUYOR: veritabanında bu
 * türde açılmış eski kayıtlar olabilir ve etiket kalkarsa o satırlar ekranda
 * boş tür gösterirdi. Kalkan yalnızca yeni kayıt açarken ve süzgeçte teklif
 * edilen seçenekler — `paydasTuruMu` da bu listeye baktığı için eski türle
 * yeni kayıt AÇILAMAZ.
 */
export const PAYDAS_TURLERI: PaydasTuru[] = [
  "MEZUN",
  "UNIVERSITE",
  "OZEL_SEKTOR",
  "STK",
  "KAMU_KURUMU",
  "BELEDIYE",
  "DIGER",
];

/*
 * ETİKET SÖZLÜĞÜ TÜM ENUM DEĞERLERİNİ KAPSAR — `PAYDAS_TURLERI`den daha
 * geniştir. Listeden çıkarılan iki tür (GENCTEK_UNIVERSITE, MESLEK_KURULUSU)
 * burada kalmalı: eski kayıtlar hâlâ o değeri taşıyor olabilir ve `Record`
 * eksik kalırsa ekran `undefined` basar.
 */
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

/** Ret gerekçesinin asgari uzunluğu; ekrandaki `minLength` ile aynı sayı. */
export const PAYDAS_RET_GEREKCESI_ASGARI = 10;

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
