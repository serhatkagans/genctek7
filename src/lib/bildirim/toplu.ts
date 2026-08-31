/**
 * Toplu duyuru kuralları — analiz isteği Bölüm 5.
 *
 * GERİ ALINAMAZ BİR İŞLEMDİR. Gönderilen bildirim binlerce panele düşer, e-posta
 * kopyası da gitmişse geri çağrılamaz. Bu yüzden kurallar "gönderilmesin"
 * tarafına eğimlidir: eksik bir duyuruyu tekrar göndermek, yanlış bir duyuruyu
 * geri almaktan kolaydır.
 *
 * Saf tutulur: veritabanına ve oturuma bakmaz, birim testle kapsanır.
 */

/**
 * SABİT KİTLELER (31 Ağustos 2026 · istekler: "il koordinatörü yönetim
 * panelinde toplu mesaj kartı ekle, ilindeki tüm öğrenciler, tüm öğretmenler,
 * ilçe temsilcisi, il temsilcisi, eklediği ekiplere ayrı ayrı" · "proje
 * yöneticisi de sadece öğrenci ve öğretmenlere değil ekiplere topluluklara
 * ayrı ayrı toplu mesaj atabilsin").
 *
 * LİSTE BİR KİTLE LİSTESİDİR, BİR YETKİ LİSTESİ DEĞİL: kimin hangisini
 * görebileceğine kapsam katmanı karar veriyor (bkz. toplu-alicilar.ts ·
 * topluHedefSecenekleri). Burada yalnızca "böyle bir kitle vardır" yazıyor;
 * ilin koordinatörü bunların il ile sınırlı hâlini, merkez ülke genelini
 * gönderiyor ve iki taraf da AYNI anahtarları kullanıyor — anahtarın kapsamı
 * gönderene göre daralıyor, adı değişmiyor.
 */
export const DUYURU_HEDEFLERI = [
  "OGRENCI",
  "OGRETMEN",
  "HERKES",
  "IL_TEMSILCISI",
  "ILCE_TEMSILCISI",
] as const;
export type DuyuruHedefi = (typeof DUYURU_HEDEFLERI)[number];

export const DUYURU_HEDEF_ETIKETLERI: Record<DuyuruHedefi, string> = {
  OGRENCI: "Tüm öğrenciler",
  OGRETMEN: "Tüm öğretmenler",
  HERKES: "Öğrenciler ve öğretmenler",
  IL_TEMSILCISI: "İl temsilcileri",
  ILCE_TEMSILCISI: "İlçe temsilcileri",
};

export function duyuruHedefiMi(deger: string): deger is DuyuruHedefi {
  return (DUYURU_HEDEFLERI as readonly string[]).includes(deger);
}

/**
 * ===========================================================================
 * TEK TEK SEÇİLEN KİTLELER: EKİPLER VE TOPLULUKLAR
 * ===========================================================================
 * İstek "ayrı ayrı her ekip için ayrı toplu mesaj" diyor, yani hedef listesi
 * SABİT DEĞİL: ilde kaç ekip varsa o kadar seçenek var. Bunlar enuma
 * yazılamaz — ekip bir kayıttır, bir tür değil.
 *
 * ANAHTAR BİÇİMİ `EKIP:12` / `GRUP:3`: hedef, formda tek bir `select`
 * değeridir ve sabit kitlelerle aynı alandan geliyor. İkinci bir "ekip id"
 * alanı açılsaydı form iki alanı tutarlı tutmak zorunda kalırdı ("hedef=EKİP
 * ama id boş" durumu); tek dizede taşınınca böyle bir ara hâl yok.
 *
 * TOPLULUK = ÇALIŞMA GRUBU: öğrencinin kendi seçtiği ilgi grubu (bkz. model
 * OgrenciCalismaGrubu). Öğrencinin profiline yazdığı "topluluk" kayıtları
 * (KullaniciKazanim · TOPLULUK) bir kitle değildir — serbest metindir, aynı
 * kulübün adı üç farklı yazımla girilmiş olabilir ve kime gideceği belirsiz
 * kalırdı.
 */
export type TopluHedef =
  | { tip: DuyuruHedefi }
  | { tip: "EKIP"; id: number }
  | { tip: "GRUP"; id: number };

const KAYIT_HEDEFLERI = ["EKIP", "GRUP"] as const;
type KayitHedefTipi = (typeof KAYIT_HEDEFLERI)[number];

/** `{ tip: "EKIP", id: 12 }` → `"EKIP:12"`. Form değerini üretir. */
export function topluHedefAnahtari(hedef: TopluHedef): string {
  return "id" in hedef ? `${hedef.tip}:${hedef.id}` : hedef.tip;
}

/**
 * Form değerini hedefe çevirir; tanınmayan değerde `null`.
 *
 * KİMLİK POZİTİF TAM SAYI OLMAK ZORUNDA: `EKIP:0`, `EKIP:-1` ve `EKIP:abc`
 * reddediliyor. Bu bir doğrulama inceliği değil, kapının kendisi — değer
 * kurcalanabilir bir form alanından geliyor ve çözümleyici "sayıya benzeyen
 * her şeyi" kabul etseydi, kapsam kontrolü olmayan bir kayda gönderim
 * denenirdi.
 */
export function topluHedefiCoz(deger: string): TopluHedef | null {
  if (duyuruHedefiMi(deger)) return { tip: deger };

  const ayrac = deger.indexOf(":");
  if (ayrac < 0) return null;

  const tip = deger.slice(0, ayrac);
  if (!(KAYIT_HEDEFLERI as readonly string[]).includes(tip)) return null;

  const ham = deger.slice(ayrac + 1);
  if (!/^[1-9][0-9]*$/.test(ham)) return null;

  return { tip: tip as KayitHedefTipi, id: Number.parseInt(ham, 10) };
}

/** Başlık ve metin için üst sınırlar; şablon alanlarıyla aynı büyüklükte. */
const BASLIK_MAKS = 200;
const ICERIK_MAKS = 4000;

export interface DuyuruGirdisi {
  hedef: string;
  baslik: string;
  icerik: string;
  /** Kullanıcının "gönderiyorum" onayı — kutu işaretlenmeden gönderilmez. */
  onaylandiMi: boolean;
}

export type DuyuruKarari =
  /*
   * `hedef` ARTIK `string`: ekip ve topluluk hedefleri kayıt kimliği taşıyor
   * ve enuma sığmıyor. Çağıran, anahtarı `topluHedefiCoz` ile yeniden çözüp
   * kapsam kontrolünü kendi yapıyor.
   */
  | { olurMu: true; hedef: string; baslik: string; icerik: string }
  | { olurMu: false; neden: string };

/**
 * `izinliHedefler` ÇAĞIRANDAN GELİYOR (31 Ağustos 2026).
 *
 * Hedef artık sabit bir enum değil (ekipler, topluluklar); "geçerli mi"
 * sorusunun cevabı GÖNDERENE göre değişiyor — kendi ilinin ekibine yazan
 * koordinatör ile başka ilin ekibine yazmaya çalışan koordinatör aynı biçimde
 * geçerli bir anahtar gönderiyor. Bu yüzden liste dışarıdan alınıyor ve
 * çağıran onu KAPSAMDAN üretiyor (bkz. toplu-alicilar.ts).
 *
 * Varsayılan yalnızca sabit kitleler: parametresiz çağıran bir yer kalırsa
 * ekip/topluluk hedefleri sessizce açılmasın.
 *
 * `talebiCoz`daki `izinliTurler` ile aynı desen ve aynı gerekçe: ekranda
 * gösterilmeyen bir seçeneğin elle kurulmuş bir istekle geri gelebilmesi,
 * kaldırılmamış olması demektir.
 */
export function duyuruyuCoz(
  girdi: DuyuruGirdisi,
  izinliHedefler: readonly string[] = DUYURU_HEDEFLERI,
): DuyuruKarari {
  if (topluHedefiCoz(girdi.hedef) === null) {
    return { olurMu: false, neden: "Alıcı grubu seçilmelidir." };
  }
  if (!izinliHedefler.includes(girdi.hedef)) {
    return {
      olurMu: false,
      neden: "Bu alıcı grubuna toplu mesaj gönderemezsiniz.",
    };
  }

  const baslik = girdi.baslik.trim();
  const icerik = girdi.icerik.trim();

  if (!baslik) {
    return { olurMu: false, neden: "Duyuru başlığı boş bırakılamaz." };
  }
  if (baslik.length > BASLIK_MAKS) {
    return {
      olurMu: false,
      neden: `Başlık en fazla ${BASLIK_MAKS} karakter olabilir.`,
    };
  }
  if (!icerik) {
    return { olurMu: false, neden: "Duyuru metni boş bırakılamaz." };
  }
  if (icerik.length > ICERIK_MAKS) {
    return {
      olurMu: false,
      neden: `Duyuru metni en fazla ${ICERIK_MAKS} karakter olabilir.`,
    };
  }

  /*
   * Onay kutusu EN SONDA kontrol edilir: kullanıcı metnini yazıp kutuyu
   * unuttuysa önce metinle ilgili hataları görmeli, yoksa formu iki kez
   * doldurmak zorunda kalır.
   */
  if (!girdi.onaylandiMi) {
    return {
      olurMu: false,
      neden:
        "Göndermeden önce onay kutusunu işaretleyin. Duyuru geri alınamaz.",
    };
  }

  return { olurMu: true, hedef: girdi.hedef, baslik, icerik };
}

/*
 * `aliciOzeti` KALDIRILDI (31 Ağustos 2026): hedef listesi sabit üç kitleden
 * ibaretken alıcı sayısını iki sayıdan toplayan saf bir fonksiyon yetiyordu.
 * Artık her hedefin kendi sorgusu var (ilin ekibi, bir çalışma grubunu seçen
 * öğrenciler…) ve sayı, seçeneğin kendisiyle birlikte veritabanından geliyor
 * (bkz. toplu-alicilar.ts · topluHedefSecenekleri).
 *
 * SAYININ EKRANDA YAZILMASI KURALI DEĞİŞMEDİ ve değişmemeli: "Emin misiniz?"
 * sormak yerine SAYIYI göstermek daha dürüst — kullanıcı 12 kişiye mi 4000
 * kişiye mi gönderdiğini bilerek karar verir.
 */
