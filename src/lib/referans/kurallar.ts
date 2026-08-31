import { epostaGecerliMi, epostaNormalle } from "@/lib/dis-kimlik/kurallar";

/**
 * REFERANSLARIM (28 Ağustos 2026 · istek: "Öğrenciler için profile referanslar
 * bölümü ekleyelim. Referans için ad soyad telefon kurum eposta").
 *
 * Saf tutulur: veritabanına ve React'e bakmaz, birim testle kapsanır.
 *
 * ---------------------------------------------------------------------------
 * KAYIT, ÜÇÜNCÜ BİR KİŞİNİN İLETİŞİM BİLGİSİDİR
 * ---------------------------------------------------------------------------
 * Buradaki telefon ve e-posta öğrencinin değil, referans gösterilen kişinin
 * bilgisi. Bunun iki sonucu var ve ikisi de bu dosyanın dışında duruyor ama
 * kuralları buradan okunuyor:
 *   · kayıt yalnızca sahibine görünüyor (bkz. şema · KullaniciReferansi),
 *   · sayı sınırlı tutuluyor — profil, dışarıdan toplanmış bir rehber
 *     olmamalı.
 */

/**
 * En fazla kaç referans.
 *
 * ÜÇ (31 Ağustos 2026 · istek: "yeni referans eklenebilsin max 3 referans
 * eklenebilsin"). Önce beşti; sınırın işi aynı — listeyi bir iletişim
 * defterine dönüşmekten alıkoymak. Üç, bir özgeçmişte referans için ayrılan
 * yerin gerçek karşılığı.
 *
 * SINIR YALNIZCA EKLEMEYE BAKAR: beşken üç satır girmiş kimse etkilenmiyor,
 * dörde çıkmış birinin kayıtları ise SİLİNMİYOR — yalnızca yeni ekleyemiyor
 * ve var olanları düzenlemeye devam ediyor (bkz. referansGuncelleEylemi).
 */
export const REFERANS_AZAMI_SAYI = 3;

export const REFERANS_AD_AZAMI = 150;
export const REFERANS_KURUM_AZAMI = 200;
export const REFERANS_TELEFON_AZAMI = 20;

/**
 * Telefonun kabul edilen biçimi.
 *
 * MASKE DAYATILMIYOR: rakam, boşluk, `+`, parantez ve tire serbest. "0 (532)
 * 111 22 33" ile "+90 532 111 22 33" aynı numaradır ve kişiyi tek bir yazıma
 * zorlamak, doğru bilgiyi biçim yüzünden geri çevirmek olurdu. Aranan tek şey
 * içinde yeterince RAKAM olması — harf dolu bir kutu numara değildir.
 */
const TELEFON_IZINLI = /^[0-9+()\s.-]+$/;
const TELEFON_ASGARI_RAKAM = 10;

export interface ReferansGirdisi {
  adSoyad: string;
  kurum: string;
  telefon: string;
  eposta: string;
}

export interface ReferansKaydi {
  adSoyad: string;
  kurum: string | null;
  telefon: string | null;
  eposta: string | null;
}

export type ReferansKarari =
  | { olurMu: true; kayit: ReferansKaydi }
  | { olurMu: false; neden: string };

function rakamSayisi(deger: string): number {
  return deger.replace(/\D/g, "").length;
}

/**
 * Referans satırının kabul edilip edilmeyeceği.
 *
 * AD SOYAD ZORUNLU, adı olmayan bir referans kimseyi göstermiyor.
 *
 * TELEFON İLE E-POSTADAN EN AZ BİRİ ZORUNLU: ulaşılamayan bir referans,
 * referans değildir — okuyan kişi "kime soracağım" sorusunu cevaplayamaz.
 * İkisini birden zorunlu tutmak ise gerçek hayatta doğru bilgiyi geri
 * çevirirdi; bir öğretmenin okul e-postası varken cep numarasını paylaşmak
 * istememesi olağan. Aynı kısıt veritabanında da duruyor
 * (`ck_referans_iletisim`) çünkü tabloya ileride başka bir ekrandan da
 * yazılabilir.
 *
 * KURUM İSTEĞE BAĞLI: emekli bir öğretmenin ya da aile dostu bir mühendisin
 * kurumu olmayabilir. Boş bırakılabilmesi, kişiyi olmayan bir kurum adı
 * uydurmaya itmemek için.
 */
export function referansKabulEdilirMi(
  girdi: ReferansGirdisi,
): ReferansKarari {
  const adSoyad = girdi.adSoyad.trim().replace(/\s+/g, " ");
  if (!adSoyad) {
    return { olurMu: false, neden: "Referansın adı ve soyadı zorunludur." };
  }
  if (adSoyad.length > REFERANS_AD_AZAMI) {
    return {
      olurMu: false,
      neden: `Ad soyad en fazla ${REFERANS_AD_AZAMI} karakter olabilir.`,
    };
  }

  const kurum = girdi.kurum.trim();
  if (kurum.length > REFERANS_KURUM_AZAMI) {
    return {
      olurMu: false,
      neden: `Kurum en fazla ${REFERANS_KURUM_AZAMI} karakter olabilir.`,
    };
  }

  const telefon = girdi.telefon.trim();
  if (telefon) {
    if (telefon.length > REFERANS_TELEFON_AZAMI) {
      return {
        olurMu: false,
        neden: `Telefon en fazla ${REFERANS_TELEFON_AZAMI} karakter olabilir.`,
      };
    }
    if (
      !TELEFON_IZINLI.test(telefon) ||
      rakamSayisi(telefon) < TELEFON_ASGARI_RAKAM
    ) {
      return {
        olurMu: false,
        neden:
          "Telefon numarası eksik görünüyor. Alan koduyla birlikte yazın: 0 532 111 22 33.",
      };
    }
  }

  /*
   * E-POSTA `epostaNormalle` İLE KÜÇÜK HARFE İNDİRİLİYOR ama Türkçe kuralla
   * DEĞİL — o fonksiyonun kendi gerekçesi: "ALI@x.com" ile "ali@x.com" aynı
   * adres, Türkçe kural "I" harfini "ı" yapıp ikisini ayırırdı.
   */
  const eposta = girdi.eposta.trim() ? epostaNormalle(girdi.eposta) : "";
  if (eposta && !epostaGecerliMi(eposta)) {
    return {
      olurMu: false,
      neden: "E-posta adresi geçerli görünmüyor (örnek: ogretmen@meb.k12.tr).",
    };
  }

  if (!telefon && !eposta) {
    return {
      olurMu: false,
      neden:
        "Referansa nasıl ulaşılacağını yazın: telefon ya da e-postadan en az biri gerekli.",
    };
  }

  return {
    olurMu: true,
    kayit: {
      adSoyad,
      kurum: kurum || null,
      telefon: telefon || null,
      eposta: eposta || null,
    },
  };
}

/**
 * Referansın tek satırlık yazılışı — özgeçmişte ve ekrandaki özette aynı
 * biçim kullanılıyor ki iki yer ayrışmasın.
 */
export function referansSatiri(kayit: ReferansKaydi): string {
  return [kayit.kurum, kayit.telefon, kayit.eposta]
    .filter((parca): parca is string => Boolean(parca))
    .join(" · ");
}
