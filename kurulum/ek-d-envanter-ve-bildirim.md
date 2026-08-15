# Ek D — Algoritmam Envanteri ve Bildirim Şablonları

> **Üretilmiş dosya.** Elle düzenlemeyin; `npm run sartname:uret` ile yeniden oluşturulur.
> Kaynak kod ile şartname arasında çelişki olursa **kaynak kod** geçerlidir.

proje.md §10 "25 maddelik özdeğerlendirme envanteri" der ama maddeleri içermez; §20 bildirimden söz eder ama şablon metinlerini içermez. İkisi de buradadır.

---

### `src/lib/envanter/kurallar.ts`

```ts
import {
  ENVANTERLER,
  type EnvanterBoyutu,
  type EnvanterTanimi,
} from "@/lib/envanter/tanimlar";

/**
 * Algoritmam — envanter kuralları ve puanlama (E).
 *
 * Saf: veritabanı, oturum ya da Next.js bilmez. Sunucu eylemleri
 * (`app/panel/algoritmam/eylemler.ts`) yalnızca buradaki kararı uygular,
 * ekranlar da yalnızca buradaki sonucu basar.
 *
 * HEDEF VE KAZANIM KURALLARINDAN AYRI. Üçü de "kullanıcının kendi girdiği"
 * veriyi doğruluyor ama buradaki girdi serbest metin değil KAPALI UÇLU seçim:
 * doğrulama uzunluk değil, "bu madde bu envanterde var mı ve bu değer bu
 * ölçekte geçerli mi" sorusudur. Ortak dosyaya zorlamak iki farklı doğrulama
 * türünü iç içe geçirirdi.
 */

export function envanterTanimi(kod: string): EnvanterTanimi | null {
  return ENVANTERLER.find((envanter) => envanter.kod === kod) ?? null;
}

/**
 * Envanter çözülebilir durumda mı?
 *
 * Ölçüt madde sayısıdır: yayımlanmış ölçeklerin maddeleri henüz gelmedi ve
 * tanımları boş dizilerle duruyor (bkz. tanimlar.ts). Ayrı bir "aktif mi"
 * bayrağı KONMADI — bayrak, maddeleri dolu ama kapalı ya da maddeleri boş ama
 * açık gibi tutarsız durumlara izin verirdi.
 */
export function envanterHazirMi(tanim: EnvanterTanimi): boolean {
  return tanim.maddeler.length > 0 && tanim.boyutlar.length > 0;
}

/** Ekranda çözülebilen envanterler. */
export function hazirEnvanterler(): EnvanterTanimi[] {
  return ENVANTERLER.filter(envanterHazirMi);
}

export function olcekDegeriGecerliMi(
  tanim: EnvanterTanimi,
  deger: number,
): boolean {
  return tanim.olcek.some((secenek) => secenek.deger === deger);
}

/**
 * Ölçeğin en büyük değeri ("3,4 / 5" yazısındaki 5).
 *
 * Seçenek SAYISI değil: 0–4 gibi sıfırdan başlayan bir ölçekte sayı 5 olurdu
 * ama üst sınır 4'tür. Dış kaynaklı ölçekler geldiğinde bu fark ekranda
 * sessizce yanlış bir bölen üretirdi.
 */
export function olcekUstSiniri(tanim: EnvanterTanimi): number {
  if (tanim.olcek.length === 0) return 0;
  return Math.max(...tanim.olcek.map((secenek) => secenek.deger));
}

// ---------------------------------------------------------------------------
// Cevapların kabulü
// ---------------------------------------------------------------------------

export type CevapGirdisi = Record<string, number>;

export type CevapKarari =
  | { olurMu: false; neden: string }
  | { olurMu: true; cevaplar: { maddeKodu: string; deger: number }[] };

/**
 * Gelen cevap kümesini tanıma göre süzer.
 *
 * EKSİK CEVAP KABUL EDİLİR, çünkü envanter tek oturumda bitmek zorunda değil:
 * yarım doldurup çıkan öğrencinin verdiği cevaplar kaydedilir ve döndüğünde
 * yerinde durur. "Tamamlandı" sayılması ayrı bir karardır (bkz.
 * `tamamlanabilirMi`).
 *
 * TANIMDA OLMAYAN MADDE SESSİZCE DÜŞÜRÜLMEZ, REDDEDİLİR: formdan tanınmayan
 * bir kod gelmesi ya elle kurcalamadır ya da sürüm kaymasıdır; ikisi de
 * sessizce yutulursa sonuç eksik maddeyle hesaplanır ve kimse fark etmez.
 */
export function cevaplariKabulEt(
  tanim: EnvanterTanimi,
  girdi: CevapGirdisi,
): CevapKarari {
  if (!envanterHazirMi(tanim)) {
    return { olurMu: false, neden: "Bu envanterin içeriği henüz hazır değil." };
  }

  const cevaplar: { maddeKodu: string; deger: number }[] = [];

  for (const [maddeKodu, deger] of Object.entries(girdi)) {
    const madde = tanim.maddeler.find((m) => m.kod === maddeKodu);
    if (!madde) {
      return { olurMu: false, neden: "Tanınmayan bir madde gönderildi." };
    }
    if (!Number.isInteger(deger) || !olcekDegeriGecerliMi(tanim, deger)) {
      return { olurMu: false, neden: "Geçersiz bir cevap gönderildi." };
    }
    cevaplar.push({ maddeKodu, deger });
  }

  return { olurMu: true, cevaplar };
}

/**
 * Envanter "tamamlandı" sayılabilir mi?
 *
 * TÜM maddeler cevaplanmış olmalı. Kısmi tamamlamaya izin verilseydi (örn.
 * "%80'i yeterli") boyut puanları farklı sayıda maddeden hesaplanır ve
 * boyutlar birbiriyle karşılaştırılamaz hâle gelirdi — oysa sonuç ekranının
 * yaptığı tam olarak bu karşılaştırma.
 */
export function tamamlanabilirMi(
  tanim: EnvanterTanimi,
  cevaplananKodlar: readonly string[],
): boolean {
  if (!envanterHazirMi(tanim)) return false;
  const kume = new Set(cevaplananKodlar);
  return tanim.maddeler.every((madde) => kume.has(madde.kod));
}

/** İlerleme çubuğu için: kaç maddenin kaçı cevaplandı. */
export function ilerleme(
  tanim: EnvanterTanimi,
  cevaplananKodlar: readonly string[],
): { cevaplanan: number; toplam: number; yuzde: number } {
  const kume = new Set(cevaplananKodlar);
  const cevaplanan = tanim.maddeler.filter((m) => kume.has(m.kod)).length;
  const toplam = tanim.maddeler.length;
  return {
    cevaplanan,
    toplam,
    yuzde: toplam === 0 ? 0 : Math.round((cevaplanan / toplam) * 100),
  };
}

// ---------------------------------------------------------------------------
// Puanlama
// ---------------------------------------------------------------------------

/**
 * Ters puanlanan maddenin çevrilmiş değeri.
 *
 * 1–5 ölçeğinde 5 → 1, 4 → 2, 3 → 3. Formül ölçeğin uçlarından türetilir,
 * "6 eksi değer" diye SABİTLENMEZ: dış kaynaklı ölçeklerden biri 1–7 ya da
 * 0–4 gelirse sabit çevirme sessizce yanlış puan üretirdi.
 */
export function tersCevir(tanim: EnvanterTanimi, deger: number): number {
  const degerler = tanim.olcek.map((s) => s.deger);
  const enKucuk = Math.min(...degerler);
  const enBuyuk = Math.max(...degerler);
  return enKucuk + enBuyuk - deger;
}

export interface BoyutPuani {
  boyut: EnvanterBoyutu;
  /** Maddelerin ortalaması, ölçeğin kendi birimiyle (örn. 3.4 / 5). */
  ortalama: number;
  /** 0–100'e taşınmış hâli; boyutlar arası karşılaştırma bunun üzerinden. */
  yuzde: number;
  /** Kaç maddeden hesaplandığı — ekranda değil, denetimde işe yarar. */
  maddeSayisi: number;
  /** yuzde'ye göre üç bant. */
  bant: "DUSUK" | "ORTA" | "YUKSEK";
  /** Banda göre seçilmiş yorum metni. */
  yorum: string;
}

/**
 * Bant sınırları.
 *
 * Beşli ölçekte 1 → %0, 3 → %50, 5 → %100. Alt sınır 40, üst sınır 70 seçildi:
 * ölçeğin tam ortası (%50) "orta" bandın içinde kalıyor ve kararsız cevap veren
 * öğrenci hiçbir boyutta "düşük" görmüyor. Sınırlar ölçekten türetilmiyor,
 * BİLİNÇLİ bir yumuşatma — bu bir norm çalışması değil, kendini tanıma aracı.
 */
const BANT_ALT = 40;
const BANT_UST = 70;

function bantSec(yuzde: number): BoyutPuani["bant"] {
  if (yuzde >= BANT_UST) return "YUKSEK";
  if (yuzde < BANT_ALT) return "DUSUK";
  return "ORTA";
}

export type SonucDurumu =
  | { durum: "EKSIK"; eksikMadde: number }
  | { durum: "ESKI_SURUM" }
  | { durum: "HAZIR"; puanlar: BoyutPuani[] };

/**
 * Cevaplardan boyut puanlarını üretir.
 *
 * PUANLAR SAKLANMAZ, her okumada yeniden hesaplanır (nişanlarda verilen kararın
 * aynısı — bkz. lib/kazanim/rozetler.ts). Saklansaydı puanlama anahtarındaki
 * bir düzeltme geçmiş kayıtlara yansımaz ve iki doğruluk kaynağı olurdu.
 *
 * SÜRÜM KONTROLÜ BURADA: uygulama eski bir madde listesiyle çözüldüyse
 * puanlanmaz. Yeni anahtarla eski cevabı puanlamak, kişinin göremeyeceği bir
 * hata üretirdi — "eski sürüm" demek dürüst olanı.
 */
export function envanterSonucu(
  tanim: EnvanterTanimi,
  uygulamaSurumu: number,
  cevaplar: readonly { maddeKodu: string; deger: number }[],
): SonucDurumu {
  if (uygulamaSurumu !== tanim.surum) return { durum: "ESKI_SURUM" };

  const degerler = new Map(cevaplar.map((c) => [c.maddeKodu, c.deger]));
  const eksik = tanim.maddeler.filter((m) => !degerler.has(m.kod)).length;
  if (eksik > 0) return { durum: "EKSIK", eksikMadde: eksik };

  const olcekDegerleri = tanim.olcek.map((s) => s.deger);
  const enKucuk = Math.min(...olcekDegerleri);
  const enBuyuk = Math.max(...olcekDegerleri);
  const aralik = enBuyuk - enKucuk;

  const puanlar = tanim.boyutlar.map((boyut): BoyutPuani => {
    const maddeler = tanim.maddeler.filter((m) => m.boyut === boyut.kod);
    const toplam = maddeler.reduce((acc, madde) => {
      const ham = degerler.get(madde.kod) as number;
      return acc + (madde.tersMi ? tersCevir(tanim, ham) : ham);
    }, 0);

    const ortalama = toplam / maddeler.length;
    // aralik 0 olamaz (tek seçenekli ölçek yok) ama bölmeden önce korunuyor:
    // dış kaynaklı bir tanım hatalı gelirse NaN yerine 0 görünsün.
    const yuzde =
      aralik === 0 ? 0 : Math.round(((ortalama - enKucuk) / aralik) * 100);
    const bant = bantSec(yuzde);

    return {
      boyut,
      ortalama: Math.round(ortalama * 10) / 10,
      yuzde,
      maddeSayisi: maddeler.length,
      bant,
      yorum: bant === "DUSUK" ? boyut.dusukYorum : boyut.yuksekYorum,
    };
  });

  return { durum: "HAZIR", puanlar };
}

/**
 * Sonuç ekranındaki sıralama: yüksek puan önce.
 *
 * Alfabetik ya da tanım sırası DEĞİL, çünkü ekranın söylediği şey "senin öne
 * çıkan tarafın bu". Eşitlikte tanım sırası korunur (kararlı sıralama);
 * rastgele olsaydı aynı sonuç her açılışta farklı sırada görünürdü.
 */
export function puanlariSirala(puanlar: readonly BoyutPuani[]): BoyutPuani[] {
  return [...puanlar]
    .map((puan, sira) => ({ puan, sira }))
    .sort((a, b) => {
      const fark = b.puan.yuzde - a.puan.yuzde;
      return fark !== 0 ? fark : a.sira - b.sira;
    })
    .map((satir) => satir.puan);
}

/**
 * Sonucun bir cümlelik özeti: en yüksek boyut(lar).
 *
 * BERABERLİK GİZLENMEZ. İki boyut aynı puandaysa ikisi de yazılır; tek birini
 * seçmek, olmayan bir farkı varmış gibi göstermek olurdu.
 */
export function ozetCumlesi(puanlar: readonly BoyutPuani[]): string {
  if (puanlar.length === 0) return "";
  const sirali = puanlariSirala(puanlar);
  const enYuksek = sirali[0].yuzde;
  const basaGuresenler = sirali.filter((p) => p.yuzde === enYuksek);

  // Hepsi eşitse "öne çıkan" diye bir şey yoktur ve öyle denmez.
  if (basaGuresenler.length === puanlar.length) {
    return "Bu envanterde başlıkların hepsi birbirine yakın çıktı.";
  }

  const adlar = basaGuresenler.map((p) => p.boyut.ad);
  const liste =
    adlar.length === 1
      ? adlar[0]
      : `${adlar.slice(0, -1).join(", ")} ve ${adlar[adlar.length - 1]}`;
  return `Öne çıkan başlığın: ${liste}.`;
}
```

### `src/lib/envanter/tanimlar.ts`

```ts
/**
 * Algoritmam — öz değerlendirme envanterlerinin TANIMLARI (E).
 *
 * Bu dosya içeriğin tek kaynağıdır: madde metinleri, ölçek ve puanlama
 * anahtarı burada durur, veritabanında değil (gerekçe:
 * `prisma/migrations/20260806200000_algoritmam_envanterleri`).
 *
 * ---------------------------------------------------------------------------
 * İKİ TÜR ENVANTER VAR — ayrımı görmezden gelmeyin
 * ---------------------------------------------------------------------------
 * İstek yedi envanter sayıyor. Bunların bir kısmı YAYIMLANMIŞ, geçerlik ve
 * güvenirlik çalışması yapılmış ölçeklerdir; madde metinleri ve puanlama
 * anahtarları o çalışmaların ürünüdür ve TELİFE tabidir. Bir ölçeğin adını
 * taşıyıp maddelerini uydurmak, öğrenciye o ölçeğin sonucu diye uydurma bir
 * sonuç göstermek olurdu — bu yüzden yapılmadı.
 *
 *   · kaynak: "GENCTEK"    → maddeleri bu proje için YAZILDI, kullanıma hazır.
 *   · kaynak: "DIS_KAYNAK" → yayımlanmış ölçek. Maddeler BOŞ; metin ve
 *                            puanlama anahtarı hak sahibinden gelmeli.
 *                            Ekranda "içerik bekleniyor" diye görünür,
 *                            çözülemez. (→ SORULAR.md · S16)
 *
 * Dış kaynaklı bir ölçeğin maddeleri geldiğinde yapılacak tek şey aşağıdaki
 * ilgili tanımın `boyutlar` ve `maddeler` dizilerini doldurmaktır; motor,
 * ekranlar ve puanlama zaten hazır.
 *
 * ---------------------------------------------------------------------------
 * BU BİR TANI ARACI DEĞİLDİR
 * ---------------------------------------------------------------------------
 * Sonuçlar kişinin KENDİ beyanından üretilir. Ne bir yeteneği ölçer, ne bir
 * mesleğe yönlendirir, ne de bir eksiklik saptar. İstekteki amaç da bu:
 * "kendilerini geliştirebilecekleri alanları keşfeder". Ekranlardaki dil buna
 * uygun tutuldu (bkz. SONUC_CERCEVESI).
 */

/** Likert seçeneği. `deger` puanlamaya girer, `etiket` ekranda görünür. */
export interface OlcekSecenegi {
  deger: number;
  etiket: string;
}

export interface EnvanterBoyutu {
  kod: string;
  ad: string;
  /** Boyutun ne sorduğu — sonuç ekranında başlığın altına yazılır. */
  aciklama: string;
  /** Puan yüksek çıktığında gösterilen yorum. */
  yuksekYorum: string;
  /** Puan düşük çıktığında gösterilen yorum. Eksiklik dili KULLANILMAZ. */
  dusukYorum: string;
}

export interface EnvanterMaddesi {
  kod: string;
  metin: string;
  /** Hangi boyutu beslediği. Tanımdaki bir boyut kodu olmak zorunda. */
  boyut: string;
  /**
   * TERS PUANLANIR. Madde olumsuz yazıldığında ("... bırakırım") yüksek cevap
   * düşük beceri anlamına gelir; puanlama bunu çevirir.
   */
  tersMi?: boolean;
}

export type EnvanterKaynagi = "GENCTEK" | "DIS_KAYNAK";

export interface EnvanterTanimi {
  kod: string;
  ad: string;
  /** Listede kartın altındaki tek cümle. */
  ozet: string;
  /** Envanterin başında okutulan yönerge. */
  yonerge: string;
  kaynak: EnvanterKaynagi;
  /** Kimin yazdığı / neyin beklendiği. Ekranda GÖRÜNÜR — gizlenmez. */
  kaynakNotu: string;
  /**
   * Madde listesinin sürümü. Maddelerden biri değişir, eklenir ya da silinirse
   * BU ARTMALI: eski cevaplar yeni anahtarla puanlanmaz, "eski sürüm" diye
   * gösterilir.
   */
  surum: number;
  olcek: readonly OlcekSecenegi[];
  boyutlar: readonly EnvanterBoyutu[];
  maddeler: readonly EnvanterMaddesi[];
}

// ---------------------------------------------------------------------------
// Ortak ölçekler
// ---------------------------------------------------------------------------
// Beşli tutuldu: ortası olan bir ölçek, kararsız kalan öğrenciyi bir tarafa
// zorlamaz. Dörtlü ("ortası yok") daha ayırt edici sayılır ama burada amaç
// ayırt etmek değil, kişinin kendini tanıması.

const OLCEK_ILGI: readonly OlcekSecenegi[] = [
  { deger: 1, etiket: "Hiç ilgimi çekmiyor" },
  { deger: 2, etiket: "Az ilgimi çekiyor" },
  { deger: 3, etiket: "Kararsızım" },
  { deger: 4, etiket: "İlgimi çekiyor" },
  { deger: 5, etiket: "Çok ilgimi çekiyor" },
];

const OLCEK_YETERLIK: readonly OlcekSecenegi[] = [
  { deger: 1, etiket: "Hiç yapamam" },
  { deger: 2, etiket: "Zorlanırım" },
  { deger: 3, etiket: "Kısmen yaparım" },
  { deger: 4, etiket: "İyi yaparım" },
  { deger: 5, etiket: "Çok iyi yaparım" },
];

const OLCEK_UYGUNLUK: readonly OlcekSecenegi[] = [
  { deger: 1, etiket: "Hiç bana uygun değil" },
  { deger: 2, etiket: "Pek uygun değil" },
  { deger: 3, etiket: "Kararsızım" },
  { deger: 4, etiket: "Bana uygun" },
  { deger: 5, etiket: "Tamamen bana uygun" },
];

/**
 * Sonuç ekranının başında ve envanterin girişinde basılan çerçeve metni.
 *
 * Tek yerde duruyor çünkü iki ekranda da AYNI şeyi söylemesi gerekiyor: burada
 * çıkan sonuç bir teşhis değil, bir başlangıç noktasıdır.
 */
export const SONUC_CERCEVESI =
  "Buradaki sonuç senin kendi cevaplarından çıkar; bir yetenek ölçümü ya da " +
  "meslek tavsiyesi değildir. Düşük çıkan bir başlık 'yapamazsın' demek " +
  "değil, 'henüz denemedin' olabilir. Bir yıl sonra yeniden çözersen ne " +
  "değiştiğini görürsün.";

// ---------------------------------------------------------------------------
// 1. İlgi Envanteri — GençTek
// ---------------------------------------------------------------------------

const ILGI: EnvanterTanimi = {
  kod: "ILGI",
  ad: "İlgi Envanteri",
  ozet: "Teknolojinin hangi alanları ilgini çekiyor?",
  yonerge:
    "Aşağıdaki cümlelerin her biri için, o işin şu anda ilgini ne kadar " +
    "çektiğini işaretle. Yapabilip yapamadığını değil, İSTEYİP istemediğini " +
    "sor kendine — beceri ayrı bir envanterin konusu.",
  kaynak: "GENCTEK",
  kaynakNotu:
    "Maddeleri GençTek platformu için yazıldı; yayımlanmış bir ölçeğin " +
    "uyarlaması değildir.",
  surum: 1,
  olcek: OLCEK_ILGI,
  boyutlar: [
    {
      kod: "YAZILIM",
      ad: "Yazılım ve programlama",
      aciklama: "Kod yazmak, hata ayıklamak, bir şeyi çalışır hâle getirmek.",
      yuksekYorum:
        "Kodun kendisi seni çekiyor. Çalışma grubu etkinliklerinde geliştirme " +
        "tarafına, hackathon ve kod maratonlarına bakabilirsin.",
      dusukYorum:
        "Kod yazmak şimdilik ilgini çekmiyor. Teknolojide kod yazmadan da " +
        "üretilen çok alan var — aşağıdaki diğer başlıklara bak.",
    },
    {
      kod: "VERI_YZ",
      ad: "Veri ve yapay zekâ",
      aciklama: "Veriden anlam çıkarmak, modellerin nasıl öğrendiğini anlamak.",
      yuksekYorum:
        "Veriyle düşünmek hoşuna gidiyor. Veri okuryazarlığı ve yapay zekâ " +
        "çalışma grubu etkinlikleri sana göre.",
      dusukYorum:
        "Sayılarla ve modellerle uğraşmak şimdilik çekmiyor.",
    },
    {
      kod: "SIBER",
      ad: "Siber güvenlik",
      aciklama: "Sistemlerin nasıl kırıldığı ve nasıl korunduğu.",
      yuksekYorum:
        "Güvenlik tarafı ilgini çekiyor. CTF (Capture The Flag) etkinlikleri " +
        "ve güvenli internet çalışma grubu iyi bir başlangıç.",
      dusukYorum: "Güvenlik konuları şimdilik ilgi alanının dışında.",
    },
    {
      kod: "DONANIM",
      ad: "Donanım, robotik ve elektronik",
      aciklama: "Elle tutulur olanı kurmak, devre ve makine ile uğraşmak.",
      yuksekYorum:
        "Somut olanı kurmak seni çekiyor. Robotik ve maker atölyeleri, " +
        "sensörlü projeler tam sırası.",
      dusukYorum: "Donanım tarafı şimdilik ilgini çekmiyor.",
    },
    {
      kod: "TASARIM",
      ad: "Tasarım ve kullanıcı deneyimi",
      aciklama: "Bir şeyin nasıl göründüğü ve ne kadar kolay kullanıldığı.",
      yuksekYorum:
        "Görünüş ve kullanım kolaylığı senin için önemli. Ekip projelerinde " +
        "arayüz ve tanıtım tarafını üstlenmeyi dene.",
      dusukYorum: "Tasarım tarafı şimdilik öncelikli ilgin değil.",
    },
    {
      kod: "DIJITAL_TOPLUM",
      ad: "Teknoloji ve toplum",
      aciklama:
        "Teknolojinin insanları nasıl etkilediği; dijital haklar, güvenli " +
        "internet, doğru bilgi.",
      yuksekYorum:
        "Teknolojinin insana bakan yüzü ilgini çekiyor. Bilişim hukuku ve " +
        "güvenli internet çalışma grupları, akran eğitimi bu alanda.",
      dusukYorum: "Bu başlık şimdilik senin odağın değil.",
    },
  ],
  maddeler: [
    { kod: "ILGI_YAZILIM_1", boyut: "YAZILIM", metin: "Bir programın nasıl çalıştığını merak eder, içine bakmak isterim." },
    { kod: "ILGI_YAZILIM_2", boyut: "YAZILIM", metin: "Küçük de olsa kendi uygulamamı yazmak isterim." },
    { kod: "ILGI_YAZILIM_3", boyut: "YAZILIM", metin: "Bir hatayı bulana kadar uğraşmak bana ilginç gelir." },
    { kod: "ILGI_YAZILIM_4", boyut: "YAZILIM", metin: "Yeni bir programlama dili denemek ilgimi çeker." },

    { kod: "ILGI_VERI_1", boyut: "VERI_YZ", metin: "Sayılardan ve grafiklerden anlam çıkarmak ilgimi çeker." },
    { kod: "ILGI_VERI_2", boyut: "VERI_YZ", metin: "Yapay zekânın nasıl öğrendiğini merak ederim." },
    { kod: "ILGI_VERI_3", boyut: "VERI_YZ", metin: "Bir konuda veri toplayıp karşılaştırma yapmak isterim." },
    { kod: "ILGI_VERI_4", boyut: "VERI_YZ", metin: "Bir tahminin neden yanlış çıktığını araştırmak ilgimi çeker." },

    { kod: "ILGI_SIBER_1", boyut: "SIBER", metin: "Bir sistemin zayıf noktasının nerede olabileceğini merak ederim." },
    { kod: "ILGI_SIBER_2", boyut: "SIBER", metin: "Şifreleme ve gizlilik konuları ilgimi çeker." },
    { kod: "ILGI_SIBER_3", boyut: "SIBER", metin: "Hesaplarımın güvenlik ayarlarıyla uğraşmak hoşuma gider." },
    { kod: "ILGI_SIBER_4", boyut: "SIBER", metin: "Bir saldırının nasıl engellendiğini okumak ilgimi çeker." },

    { kod: "ILGI_DONANIM_1", boyut: "DONANIM", metin: "Cihazların içini açıp parçalarını incelemek isterim." },
    { kod: "ILGI_DONANIM_2", boyut: "DONANIM", metin: "Robot ya da devre kurmak ilgimi çeker." },
    { kod: "ILGI_DONANIM_3", boyut: "DONANIM", metin: "Bir makinenin hareketini kodla yönetmek isterim." },
    { kod: "ILGI_DONANIM_4", boyut: "DONANIM", metin: "3B yazıcı, sensör gibi araçlarla uğraşmak ilgimi çeker." },

    { kod: "ILGI_TASARIM_1", boyut: "TASARIM", metin: "Bir uygulamanın ekranının nasıl göründüğü benim için önemlidir." },
    { kod: "ILGI_TASARIM_2", boyut: "TASARIM", metin: "Renk, yazı ve düzen üzerinde oynamak hoşuma gider." },
    { kod: "ILGI_TASARIM_3", boyut: "TASARIM", metin: "Kullanımı zor bir şeyi nasıl kolaylaştırabileceğimi düşünürüm." },
    { kod: "ILGI_TASARIM_4", boyut: "TASARIM", metin: "Afiş, video ya da sunum tasarlamak ilgimi çeker." },

    { kod: "ILGI_TOPLUM_1", boyut: "DIJITAL_TOPLUM", metin: "Teknolojinin insanları nasıl etkilediğini tartışmak ilgimi çeker." },
    { kod: "ILGI_TOPLUM_2", boyut: "DIJITAL_TOPLUM", metin: "İnternette doğru bilgiyi ayırt etmeyi başkalarına anlatmak isterim." },
    { kod: "ILGI_TOPLUM_3", boyut: "DIJITAL_TOPLUM", metin: "Dijital haklar ve güvenli internet konuları ilgimi çeker." },
    { kod: "ILGI_TOPLUM_4", boyut: "DIJITAL_TOPLUM", metin: "Teknolojiyi toplumsal bir soruna çözüm olarak kullanmak isterim." },
  ],
};

// ---------------------------------------------------------------------------
// 2. Beceri Envanteri — GençTek
// ---------------------------------------------------------------------------

const BECERI: EnvanterTanimi = {
  kod: "BECERI",
  ad: "Beceri Envanteri",
  ozet: "Bir işi yaparken hangi tarafın güçlü?",
  yonerge:
    "Her cümle için kendini bugün nerede görüyorsan onu işaretle. İstediğini " +
    "değil, YAPABİLDİĞİNİ düşün. Doğru cevap yok; kimse görmüyor.",
  kaynak: "GENCTEK",
  kaynakNotu:
    "Maddeleri GençTek platformu için yazıldı; yayımlanmış bir ölçeğin " +
    "uyarlaması değildir.",
  surum: 1,
  olcek: OLCEK_YETERLIK,
  boyutlar: [
    {
      kod: "PROBLEM",
      ad: "Problem çözme",
      aciklama: "Bir sorunu parçalara ayırmak, yolu planlamak, hatayı daraltmak.",
      yuksekYorum:
        "Karmaşık bir işi parçalayabiliyorsun. Ekip projelerinde kurgu ve " +
        "planlama tarafını üstlenmeyi dene.",
      dusukYorum:
        "Bir işe nereden başlanacağını kestirmek henüz zor gelebiliyor. " +
        "Küçük ve bitmesi kısa süren projeler bu tarafı hızla geliştirir.",
    },
    {
      kod: "OGRENME",
      ad: "Kendi başına öğrenme",
      aciklama: "Bilmediğini bulmak, kaynaktan öğrenmek, takıldığında yol açmak.",
      yuksekYorum:
        "Yeni bir konuya tek başına girebiliyorsun. Bu, hangi alanı seçersen " +
        "seç en çok işine yarayacak beceri.",
      dusukYorum:
        "Yeni bir konuya tek başına girmek henüz zorlayıcı. Danışman " +
        "öğretmeninden bir başlangıç kaynağı istemek en kısa yol.",
    },
    {
      kod: "TAKIM",
      ad: "Takım çalışması",
      aciklama: "Görev paylaşmak, anlaşmazlığı çözmek, yardım istemek.",
      yuksekYorum:
        "Grup içinde iş yürütebiliyorsun. Pano'da takım arkadaşı arayan " +
        "ilanlara bakmanın tam sırası.",
      dusukYorum:
        "Grup işleri henüz zorlayıcı gelebiliyor. İki kişilik küçük bir " +
        "projeyle başlamak, kalabalık bir ekipten kolaydır.",
    },
    {
      kod: "URETIM",
      ad: "Üretme ve bitirme",
      aciklama: "Başlanan işi çalışır bir çıktıya döndürmek.",
      yuksekYorum:
        "Başladığın işi bitirebiliyorsun. Ürünlerini profilindeki " +
        "'Ürünlerim' bölümüne eklemeyi unutma.",
      dusukYorum:
        "İşleri bitirmek henüz zor. Kapsamı küçültmek — 'her şeyi' değil " +
        "'çalışan en küçük hâlini' hedeflemek — en çok işe yarayan yöntem.",
    },
    {
      kod: "SUNUM",
      ad: "Anlatma ve paylaşma",
      aciklama: "Yaptığını başkasına aktarmak, sadeleştirmek, soru almak.",
      yuksekYorum:
        "Yaptığını anlatabiliyorsun. Akran eğitimi vermeyi düşünebilirsin — " +
        "'Paylaşan' seferi de böyle kazanılıyor.",
      dusukYorum:
        "Anlatmak henüz zorlayıcı. Önce yazıya dökmek, sonra bir kişiye " +
        "anlatmak, sonra gruba çıkmak işe yarayan bir sıradır.",
    },
  ],
  maddeler: [
    { kod: "BEC_PROBLEM_1", boyut: "PROBLEM", metin: "Büyük bir işi küçük adımlara bölebilirim." },
    { kod: "BEC_PROBLEM_2", boyut: "PROBLEM", metin: "Bir işe başlamadan önce sırasını planlarım." },
    { kod: "BEC_PROBLEM_3", boyut: "PROBLEM", metin: "İlk çözümüm işe yaramazsa başka bir yol denerim." },
    { kod: "BEC_PROBLEM_4", boyut: "PROBLEM", metin: "Bir hatanın nedenini adım adım daraltarak bulurum." },
    {
      kod: "BEC_PROBLEM_5",
      boyut: "PROBLEM",
      metin: "Çözümü bir süre bulamazsam uğraşmayı bırakırım.",
      tersMi: true,
    },

    { kod: "BEC_OGRENME_1", boyut: "OGRENME", metin: "Bilmediğim bir konuyu kendi başıma araştırıp öğrenebilirim." },
    { kod: "BEC_OGRENME_2", boyut: "OGRENME", metin: "Yabancı dildeki kaynakları anlamaya çalışırım." },
    { kod: "BEC_OGRENME_3", boyut: "OGRENME", metin: "Takıldığımda nereye bakacağımı bilirim." },
    { kod: "BEC_OGRENME_4", boyut: "OGRENME", metin: "Öğrendiğimi not alır, sonra tekrar bakarım." },
    { kod: "BEC_OGRENME_5", boyut: "OGRENME", metin: "Bir aracı, belgelerini okuyarak kullanmaya başlayabilirim." },

    { kod: "BEC_TAKIM_1", boyut: "TAKIM", metin: "Grup çalışmasında üstüme düşeni zamanında yaparım." },
    { kod: "BEC_TAKIM_2", boyut: "TAKIM", metin: "Farklı fikirdeki bir arkadaşımla ortak yol bulabilirim." },
    { kod: "BEC_TAKIM_3", boyut: "TAKIM", metin: "Yardım istemekten çekinmem." },
    { kod: "BEC_TAKIM_4", boyut: "TAKIM", metin: "Arkadaşımın işine kırmadan geri bildirim verebilirim." },
    { kod: "BEC_TAKIM_5", boyut: "TAKIM", metin: "Görev dağılımını konuşup netleştiririm." },

    { kod: "BEC_URETIM_1", boyut: "URETIM", metin: "Başladığım işi bitiririm." },
    { kod: "BEC_URETIM_2", boyut: "URETIM", metin: "Küçük de olsa ortaya çalışan bir şey çıkarabilirim." },
    { kod: "BEC_URETIM_3", boyut: "URETIM", metin: "Yaptığımı başkasının da kullanabileceği hâle getiririm." },
    { kod: "BEC_URETIM_4", boyut: "URETIM", metin: "Süre kısaldığında neyi çıkaracağıma karar verebilirim." },
    { kod: "BEC_URETIM_5", boyut: "URETIM", metin: "Bitirdiğim işe geri dönüp geliştiririm." },

    { kod: "BEC_SUNUM_1", boyut: "SUNUM", metin: "Yaptığım işi başkasına anlatabilirim." },
    { kod: "BEC_SUNUM_2", boyut: "SUNUM", metin: "Teknik bir konuyu bilmeyen birine sadeleştirerek anlatabilirim." },
    {
      kod: "BEC_SUNUM_3",
      boyut: "SUNUM",
      metin: "Topluluk önünde konuşmak beni çok zorlar.",
      tersMi: true,
    },
    { kod: "BEC_SUNUM_4", boyut: "SUNUM", metin: "Sunum ya da tanıtım hazırlayabilirim." },
    { kod: "BEC_SUNUM_5", boyut: "SUNUM", metin: "Soru gelince bilmediğimi rahatça söyleyebilirim." },
  ],
};

// ---------------------------------------------------------------------------
// 3. Mesleki Yaklaşım Envanteri — GençTek
// ---------------------------------------------------------------------------
// BOYUT ADLARI SEFERLERİM İLE AYNI (keşfeden · üreten · paylaşan · lider ·
// elçi) — istek listesinde de bu beşli geçiyordu. Ortak sözlük bilinçli ama
// İKİSİ FARKLI ŞEY ölçer ve birbirini beslemez:
//
//   · Seferlerim  → NE YAPTIĞINI sayar. Katılım, ürün, eğitim, temsilcilik
//                   kayıtlarından türer; beyanla kazanılmaz.
//   · Bu envanter → NASIL YAKLAŞTIĞINI sorar. Tamamen kişinin beyanıdır.
//
// Bu yüzden envanter sonucu HİÇBİR SEVİYE KAZANDIRMAZ. Kazandırsaydı, bir
// formu doldurarak nişan alınabilirdi ve nişanların kurulduğu ilke
// ("beyanla nişan kazanılamaz") çökerdi.

const MESLEKI_YAKLASIM: EnvanterTanimi = {
  kod: "MESLEKI_YAKLASIM",
  ad: "Mesleki Yaklaşım Envanteri",
  ozet: "Bir işin içine girdiğinde hangi rolü doğal buluyorsun?",
  yonerge:
    "Aşağıdaki cümlelerin sana ne kadar uyduğunu işaretle. İyi ya da kötü rol " +
    "yok; hepsi bir ekipte gereken farklı yaklaşımlar.",
  kaynak: "GENCTEK",
  kaynakNotu:
    "Maddeleri GençTek platformu için yazıldı; yayımlanmış bir ölçeğin " +
    "uyarlaması değildir. Boyut adları 'Seferlerim' seviyeleriyle aynı " +
    "sözcükleri kullanır ama sonucu seviye kazandırmaz.",
  surum: 1,
  olcek: OLCEK_UYGUNLUK,
  boyutlar: [
    {
      kod: "KESFEDEN",
      ad: "Keşfeden",
      aciklama: "Önce araştırır, dener, bilmediği alana girmekten çekinmez.",
      yuksekYorum:
        "Yeni olana yönelmek sana doğal geliyor. Ekipte 'bunu bir araştırayım' " +
        "diyen kişi sensin.",
      dusukYorum:
        "Belirsiz alana girmek sana pek uymuyor; tanıdık zeminde daha rahatsın.",
    },
    {
      kod: "URETEN",
      ad: "Üreten",
      aciklama: "Konuşmaktansa yapar; elinde somut bir çıktı olmasını ister.",
      yuksekYorum:
        "Somut çıktı seni tatmin ediyor. Ekibin işi bitiren tarafı olabilirsin.",
      dusukYorum:
        "Tek başına üretmek senin öne çıkan tarafın değil; başka rollerde " +
        "daha rahat olabilirsin.",
    },
    {
      kod: "PAYLASAN",
      ad: "Paylaşan",
      aciklama: "Öğrendiğini anlatır, yardım eder, aktarırken daha iyi anlar.",
      yuksekYorum:
        "Aktarmak sana iyi geliyor. Akran eğitimi ve mentorluk sana uygun.",
      dusukYorum: "Anlatıcı rol senin doğal tarafın değil.",
    },
    {
      kod: "LIDER",
      ad: "Lider",
      aciklama: "Sorumluluğu üstlenir, görev dağıtır, işi takip eder.",
      yuksekYorum:
        "Sorumluluk almak sana uyuyor. Okul/il temsilciliği ve etkinlik " +
        "önerme yolları açık.",
      dusukYorum:
        "Grubu yönetmek senin öncelikli tarafın değil; bu bir eksiklik değil, " +
        "bir tercih.",
    },
    {
      kod: "ELCI",
      ad: "Elçi",
      aciklama: "Dışarıda temsil eder, yeni bağlantı kurar, köprü olur.",
      yuksekYorum:
        "Temsil etmek ve bağ kurmak sana uyuyor. İl geneli ve ulusal " +
        "etkinlikler, paydaş görüşmeleri sana göre.",
      dusukYorum: "Dışarıya dönük temsil rolü senin öne çıkan tarafın değil.",
    },
  ],
  maddeler: [
    { kod: "MY_KESFEDEN_1", boyut: "KESFEDEN", metin: "Yeni bir alan duyduğumda önce araştırmaya başlarım." },
    { kod: "MY_KESFEDEN_2", boyut: "KESFEDEN", metin: "Bir şeyi denemeden hakkında karar vermem." },
    { kod: "MY_KESFEDEN_3", boyut: "KESFEDEN", metin: "Alışılmışın dışındaki yolları merak ederim." },
    { kod: "MY_KESFEDEN_4", boyut: "KESFEDEN", metin: "Bilmediğim bir ortama girmek beni heyecanlandırır." },

    { kod: "MY_URETEN_1", boyut: "URETEN", metin: "Bir fikri konuşmaktansa yapıp göstermeyi tercih ederim." },
    { kod: "MY_URETEN_2", boyut: "URETEN", metin: "Elimde somut bir çıktı olmasından hoşlanırım." },
    { kod: "MY_URETEN_3", boyut: "URETEN", metin: "Ayrıntıları tamamlamak beni rahatlatır." },
    { kod: "MY_URETEN_4", boyut: "URETEN", metin: "Yarım kalan iş beni rahatsız eder." },

    { kod: "MY_PAYLASAN_1", boyut: "PAYLASAN", metin: "Öğrendiğimi hemen birine anlatmak isterim." },
    { kod: "MY_PAYLASAN_2", boyut: "PAYLASAN", metin: "Arkadaşım takıldığında yardım etmek hoşuma gider." },
    { kod: "MY_PAYLASAN_3", boyut: "PAYLASAN", metin: "Bildiğimi yazıya dökmekten keyif alırım." },
    { kod: "MY_PAYLASAN_4", boyut: "PAYLASAN", metin: "Bir konuyu anlatırken onu daha iyi anladığımı fark ederim." },

    { kod: "MY_LIDER_1", boyut: "LIDER", metin: "Bir işin başında kimse yoksa sorumluluğu üstlenirim." },
    { kod: "MY_LIDER_2", boyut: "LIDER", metin: "Görev dağıtmak bana zor gelmez." },
    { kod: "MY_LIDER_3", boyut: "LIDER", metin: "Grubun dağılan kararını toparlamaya çalışırım." },
    { kod: "MY_LIDER_4", boyut: "LIDER", metin: "Bir işin takvimini takip etmek bana uyar." },

    { kod: "MY_ELCI_1", boyut: "ELCI", metin: "Grubumu dışarıda temsil etmek beni rahatsız etmez." },
    { kod: "MY_ELCI_2", boyut: "ELCI", metin: "Yeni insanlarla tanışıp bağlantı kurmak hoşuma gider." },
    { kod: "MY_ELCI_3", boyut: "ELCI", metin: "Okulum ya da kurumum adına konuşmak bana uygun." },
    { kod: "MY_ELCI_4", boyut: "ELCI", metin: "Farklı yerlerden gelen kişilerle ortak iş yapabilirim." },
  ],
};

// ---------------------------------------------------------------------------
// 4–7. Yayımlanmış ölçekler — İÇERİK BEKLENİYOR
// ---------------------------------------------------------------------------
// Aşağıdakilerin dördü de geçerlik–güvenirlik çalışması yapılmış, yayımlanmış
// ölçeklerdir. Madde metni ve puanlama anahtarı hak sahibinden gelmeli; izin
// alınmadan ve metin uydurularak yayına alınmaları hem telif hem de ölçme
// açısından yanlış olurdu (→ SORULAR.md · S16).
//
// Boş `maddeler` dizisi tesadüf değil, KAPIDIR: `envanterHazirMi` bunlara
// bakar ve ekran "içerik bekleniyor" durumunda kalır, çözülemez.

const TEKNOLOJI_LIDERLIGI: EnvanterTanimi = {
  kod: "TEKNOLOJI_LIDERLIGI",
  ad: "Teknoloji Liderliği Özyeterlilik Ölçeği",
  ozet: "Teknolojiyi yönlendirme konusunda kendine güvenin.",
  yonerge: "",
  kaynak: "DIS_KAYNAK",
  kaynakNotu:
    "Yayımlanmış bir ölçek. Madde metinleri, alt boyutları ve puanlama " +
    "anahtarı ile kullanım izni ölçeğin hak sahibinden gelmelidir.",
  surum: 1,
  olcek: [],
  boyutlar: [],
  maddeler: [],
};

const KISILIK: EnvanterTanimi = {
  kod: "KISILIK",
  ad: "Dick Kişilik Envanteri",
  ozet: "Çalışma ve iletişim biçimin.",
  yonerge: "",
  kaynak: "DIS_KAYNAK",
  kaynakNotu:
    "Yayımlanmış bir envanter. Madde metinleri ve puanlama anahtarı hak " +
    "sahibinden gelmelidir. AYRICA ADI DOĞRULANMALI: literatürde bu adla " +
    "yaygın bir envanter bulunamadı; DISC kişilik envanteri kastediliyorsa " +
    "hangi sürümün kullanılacağı da belirtilmeli.",
  surum: 1,
  olcek: [],
  boyutlar: [],
  maddeler: [],
};

const EPAI: EnvanterTanimi = {
  kod: "EPAI",
  ad: "EPAI — Girişimcilik Potansiyeli Belirleme Envanteri",
  ozet: "Girişimcilik potansiyelin.",
  yonerge: "",
  kaynak: "DIS_KAYNAK",
  kaynakNotu:
    "Yayımlanmış bir envanter. Madde metinleri, alt boyutları ve puanlama " +
    "anahtarı ile kullanım izni hak sahibinden gelmelidir.",
  surum: 1,
  olcek: [],
  boyutlar: [],
  maddeler: [],
};

const ENTCOM: EnvanterTanimi = {
  kod: "ENTCOM",
  ad: "ENTCOM — Girişimci Özellikleri Envanteri",
  ozet: "Girişimci özelliklerin.",
  yonerge: "",
  kaynak: "DIS_KAYNAK",
  kaynakNotu:
    "Yayımlanmış bir envanter. Madde metinleri, alt boyutları ve puanlama " +
    "anahtarı ile kullanım izni hak sahibinden gelmelidir.",
  surum: 1,
  olcek: [],
  boyutlar: [],
  maddeler: [],
};

/**
 * Envanterlerin EKRANDAKİ SIRASI.
 *
 * Hazır olanlar önde: liste "çözülemez" kartlarla açılırsa bölüm boş görünür
 * ve öğrenci girip çıkar. İstek listesindeki sıra korunmadı, çünkü o sıra bir
 * öncelik değil bir sayımdı.
 *
 * Hazırlar kendi içinde ilgi → beceri → yaklaşım sırasında: ilgi en kolay
 * cevaplanandır ("ne isterim"), beceri kendini değerlendirmeyi gerektirir,
 * yaklaşım en soyutudur.
 */
export const ENVANTERLER: readonly EnvanterTanimi[] = [
  ILGI,
  BECERI,
  MESLEKI_YAKLASIM,
  TEKNOLOJI_LIDERLIGI,
  KISILIK,
  EPAI,
  ENTCOM,
];
```

### `src/lib/bildirim/eposta-kopyasi.ts`

```ts
import type { GonderimDurumu } from "@/generated/prisma/enums";
import { prisma } from "../db";
import { eposta, epostaEtkinMi } from "../eposta";

/**
 * Panel bildiriminin e-posta kopyası.
 *
 * İki kural bu dosyanın tamamını açıklar:
 *
 * 1. E-posta ASLA iş akışını kesmez. Posta sunucusu erişilemezse başvuru
 *    değerlendirmesi ya da danışman devri yarıda kalmamalı; bildirim zaten
 *    panele yazıldı, bilgi kaybolmadı.
 * 2. Başarısızlık sessizce yutulmaz. Sonuç bildirim kaydına işlenir; "e-posta
 *    gelmedi" şikâyetinde hiç denenmediği mi yoksa sunucudan mı döndüğü
 *    ayırt edilebilir.
 */

/** Kişinin bildirim adresini iki profil tablosundan hangisindeyse getirir. */
export async function bildirimAdresiGetir(
  kullaniciId: number,
): Promise<string | null> {
  const kayit = await prisma.kullanici.findUnique({
    where: { id: kullaniciId },
    select: {
      ogrenciProfil: { select: { eposta: true } },
      ogretmenProfil: { select: { eposta: true } },
    },
  });

  const adres =
    kayit?.ogrenciProfil?.eposta ?? kayit?.ogretmenProfil?.eposta ?? null;

  return adres?.trim() ? adres.trim() : null;
}

interface KopyaIstegi {
  bildirimId: number;
  kullaniciId: number;
  baslik: string;
  icerik: string;
}

export async function epostaKopyasiGonder(istek: KopyaIstegi): Promise<void> {
  if (!epostaEtkinMi()) return;

  const adres = await bildirimAdresiGetir(istek.kullaniciId);
  // Adres yok: hata değil. İletişim bilgisi zorunlu değildir ve olmaması
  // kişinin tercihidir.
  if (!adres) return;

  let durum: GonderimDurumu = "GONDERILDI";
  let hataMetni: string | null = null;

  try {
    await eposta().gonder({
      alici: adres,
      konu: istek.baslik,
      govde: `${istek.icerik}\n\nBu ileti GençTek Bilgi Sistemi tarafından gönderildi. Ayrıntı için panelinize giriş yapın.`,
    });
  } catch (hata) {
    durum = "BASARISIZ";
    hataMetni = hata instanceof Error ? hata.message : String(hata);
    console.error(`E-posta gönderilemedi (bildirim ${istek.bildirimId}):`, hata);
  }

  await prisma.bildirim.update({
    where: { id: istek.bildirimId },
    data: { epostaDurumu: durum, epostaHatasi: hataMetni },
  });
}
```

### `src/lib/bildirim/gonder.ts`

```ts
import type {
  BildirimHedefTipi,
  GonderimKanali,
} from "@/generated/prisma/enums";
import { prisma } from "../db";

/**
 * Bildirimler — references/domain-rules.md Bölüm 9.
 *
 * Şablonlar koda gömülmez, bildirim_sablonu tablosunda tutulur ve Yönetim
 * ekranından düzenlenir. Bildirim her zaman panele yazılır; kişinin e-posta
 * adresi ya da telefonu varsa ve o kanal açıksa birer kopya da gönderilir
 * (bkz. eposta-kopyasi.ts, sms-kopyasi.ts). Panel her zaman kaynaktır;
 * kopyaların gitmemesi bildirimi geçersiz kılmaz.
 */

import { epostaKopyasiGonder } from "./eposta-kopyasi";
import { BILDIRIM_KODLARI, type BildirimKodu, sablonuDoldur } from "./sablon";
import { smsKopyasiGonder } from "./sms-kopyasi";

export { BILDIRIM_KODLARI, sablonuDoldur };
export type { BildirimKodu };

/**
 * Bildirimin gidilecek kaydı — panelde "Etkinliğe git" düğmesine dönüşür.
 *
 * İSTEĞE BAĞLI: hedefi olmayan bildirim (danışman değişikliği, toplu duyuru)
 * olağandır. Verildiğinde bildirimle birlikte YAZILIR; okuma tarafında metinden
 * çıkarılmaya çalışılmaz (bkz. migration 20260810130000_bildirim_hedefi).
 */
export interface BildirimHedefi {
  tip: BildirimHedefTipi;
  id: number;
}

export interface BildirimIstegi {
  kullaniciId: number;
  kod: BildirimKodu;
  degiskenler?: Record<string, string>;
  kanal?: GonderimKanali;
  hedef?: BildirimHedefi;
}

export async function bildirimGonder(istek: BildirimIstegi): Promise<void> {
  const sablon = await prisma.bildirimSablonu.findUnique({
    where: { kod: istek.kod },
  });

  if (!sablon || !sablon.aktif) {
    // Şablonu olmayan bildirim sessizce yutulmaz; iş akışını da kesmemesi için
    // uyarı olarak kaydedilir.
    console.warn(`Bildirim şablonu bulunamadı veya pasif: ${istek.kod}`);
    return;
  }

  const degiskenler = istek.degiskenler ?? {};
  const baslik = sablonuDoldur(sablon.konu, degiskenler);
  const icerik = sablonuDoldur(sablon.govdeSablonu, degiskenler);

  /*
   * Aynı uyarı okunmadan tekrar düşmez.
   *
   * Bazı bildirimler duruma bakan akışlardan doğar: danışmanı atanamayan bir
   * öğrenci her giriş yaptığında ilk atama yeniden denenir ve proje
   * yöneticisine yine "atanamadı" uyarısı çıkar. Kayıt bazında engellemezsek
   * panel aynı satırın onlarca kopyasıyla dolar ve gerçekten yeni olan uyarı
   * görünmez olur. Karşılaştırma içerik üzerinden yapılır: uyarı başka bir
   * öğrenci için ise metni farklı olacağı için ayrı kayıt açılır.
   */
  const okunmamisAyni = await prisma.bildirim.findFirst({
    where: {
      kullaniciId: istek.kullaniciId,
      tip: istek.kod,
      okunduMu: false,
      baslik,
      icerik,
    },
    select: { id: true },
  });

  if (okunmamisAyni) return;

  const bildirim = await prisma.bildirim.create({
    data: {
      kullaniciId: istek.kullaniciId,
      tip: istek.kod,
      baslik,
      icerik,
      hedefTip: istek.hedef?.tip ?? null,
      hedefId: istek.hedef?.id ?? null,
      gonderimKanali: istek.kanal ?? "SISTEM",
    },
    select: { id: true },
  });

  /*
   * E-posta kopyası bildirimden SONRA ve onu bekletmeden gönderilir. Kopyanın
   * gitmemesi bildirimi geçersiz kılmaz; panel her zaman kaynaktır.
   */
  await epostaKopyasiGonder({
    bildirimId: bildirim.id,
    kullaniciId: istek.kullaniciId,
    baslik,
    icerik,
  });

  /*
   * SMS kopyası e-postadan BAĞIMSIZ gönderilir; ikisinden birinin düşmesi
   * öbürünü engellemez. İkisi de kapalıysa (varsayılan durum SMS için budur)
   * fonksiyonlar hiçbir şey yapmadan döner.
   */
  await smsKopyasiGonder({
    bildirimId: bildirim.id,
    kullaniciId: istek.kullaniciId,
    baslik,
    icerik,
  });
}

/** Proje yöneticilerinin tamamına bildirim düşürür (onay, uyarı akışları). */
export async function projeYoneticilerineBildir(
  kod: BildirimKodu,
  degiskenler: Record<string, string> = {},
  hedef?: BildirimHedefi,
): Promise<void> {
  const yoneticiler = await prisma.kullaniciRol.findMany({
    where: { rolKodu: "PROJE_YONETICISI", bitisTarihi: null },
    select: { kullaniciId: true },
  });

  for (const yonetici of yoneticiler) {
    await bildirimGonder({
      kullaniciId: yonetici.kullaniciId,
      kod,
      degiskenler,
      hedef,
    });
  }
}

/**
 * Bir ilin koordinatörüne bildirim düşürür.
 *
 * Aktif koordinatörü olmayan il sessizce atlanır ve bu bir hata DEĞİLDİR:
 * koordinatörü boş iller olağan bir durumdur (bkz. rol envanteri ekranı) ve
 * bildirimin sahibi bulunamadı diye iş akışı kesilmemeli. Aynı bildirimin
 * merkeze giden kopyası zaten `projeYoneticilerineBildir` ile ayrıca
 * gönderiliyor, yani uyarı hiçbir koşulda kaybolmuyor.
 *
 * Dönüş değeri, çağıranın "koordinatöre de ulaştı mı" bilgisini ekranda
 * gösterebilmesi içindir.
 */
export async function ilKoordinatorlerineBildir(
  ilKodu: string | null,
  kod: BildirimKodu,
  degiskenler: Record<string, string> = {},
  hedef?: BildirimHedefi,
): Promise<number> {
  if (!ilKodu) return 0;

  const koordinatorler = await prisma.kullaniciRol.findMany({
    where: { rolKodu: "IL_KOORDINATOR", ilKodu, bitisTarihi: null },
    select: { kullaniciId: true },
  });

  for (const koordinator of koordinatorler) {
    await bildirimGonder({
      kullaniciId: koordinator.kullaniciId,
      kod,
      degiskenler,
      hedef,
    });
  }

  return koordinatorler.length;
}

/**
 * Toplu duyuru — merkezin tüm öğrencilere ve/veya öğretmenlere gönderdiği
 * serbest metinli bildirim.
 *
 * `bildirimGonder` DÖNGÜYLE ÇAĞRILMAZ: o fonksiyon kişi başına şablon okuma,
 * yinelenme kontrolü ve kayıt açma yapıyor; binlerce alıcıda bu binlerce sorgu
 * demek. Burada şablon bir kez okunur, kayıtlar tek `createMany` ile yazılır.
 *
 * E-POSTA KOPYASI AYRI DÖNGÜDEDİR ve yavaştır (kişi başına en az iki sorgu +
 * SMTP turu). Alıcı sayısı büyüdüğünde bu adım isteği zorlar; o noktada
 * kuyruğa taşınmalıdır. Şu anki kullanıcı sayısında (onlarca) sorun değil.
 */
export async function topluDuyuruGonder(istek: {
  aliciIdleri: number[];
  baslik: string;
  icerik: string;
}): Promise<{ bildirimSayisi: number }> {
  if (istek.aliciIdleri.length === 0) return { bildirimSayisi: 0 };

  const sablon = await prisma.bildirimSablonu.findUnique({
    where: { kod: BILDIRIM_KODLARI.TOPLU_DUYURU },
  });
  if (!sablon || !sablon.aktif) {
    console.warn("Toplu duyuru şablonu bulunamadı veya pasif.");
    return { bildirimSayisi: 0 };
  }

  const degiskenler = { baslik: istek.baslik, icerik: istek.icerik };
  const baslik = sablonuDoldur(sablon.konu, degiskenler);
  const icerik = sablonuDoldur(sablon.govdeSablonu, degiskenler);

  const sonuc = await prisma.bildirim.createMany({
    data: istek.aliciIdleri.map((kullaniciId) => ({
      kullaniciId,
      tip: BILDIRIM_KODLARI.TOPLU_DUYURU,
      baslik,
      icerik,
      gonderimKanali: "SISTEM" as const,
    })),
  });

  /*
   * E-posta kopyası için bildirim kimlikleri gerekiyor; createMany onları
   * döndürmediği için yeni yazılanlar geri okunuyor. Okunmamış ve bu başlıkla
   * eşleşenler alınıyor — aynı duyuru iki kez gönderilirse ikinci turda
   * yalnızca kendi kayıtları eşleşsin diye tarih sınırı da konuyor.
   */
  const yeniler = await prisma.bildirim.findMany({
    where: {
      tip: BILDIRIM_KODLARI.TOPLU_DUYURU,
      baslik,
      kullaniciId: { in: istek.aliciIdleri },
      okunduMu: false,
    },
    orderBy: { olusturmaTarihi: "desc" },
    take: istek.aliciIdleri.length,
    select: { id: true, kullaniciId: true },
  });

  for (const bildirim of yeniler) {
    await epostaKopyasiGonder({
      bildirimId: bildirim.id,
      kullaniciId: bildirim.kullaniciId,
      baslik,
      icerik,
    });
  }

  return { bildirimSayisi: sonuc.count };
}
```

### `src/lib/bildirim/hedef.ts`

```ts
import type { BildirimHedefTipi } from "@/generated/prisma/enums";

/**
 * Bildirimin işaret ettiği kaydın ekran karşılığı (10 Ağustos 2026 · istek:
 * "okundu işaretlemenin yanına bir de etkinliğe git butonu olsun").
 *
 * Bu dosya veritabanına BAKMAZ: hedef zaten bildirim satırında yazılı, burada
 * yalnızca yola ve düğme metnine çevriliyor. Saf tutulmasının sebebi, eşlemeyi
 * birim testle kapatabilmek — yanlış yol üreten bir bildirim, kullanıcıyı
 * başka birinin kaydına götürebilecek tek yerdir.
 *
 * YETKİ BURADA SORULMAZ ve sorulmamalı. Düğme yalnızca bir bağlantıdır;
 * kapsam kontrolü hedef sayfanın kendi işidir ve kapsam dışında 404 döner
 * (SKILL.md · Değişmezler 10). Burada "gösterme/gösterme" kararı verilseydi
 * yetki mantığı ikinci bir yerde daha yaşamaya başlardı.
 */

export interface BildirimHedefi {
  hedefTip: BildirimHedefTipi | null;
  hedefId: number | null;
}

export interface BildirimBaglantisi {
  yol: string;
  etiket: string;
}

const ETIKETLER: Record<BildirimHedefTipi, string> = {
  FAALIYET: "Etkinliğe git",
  EKIP: "Ekibe git",
};

/**
 * Bildirimin gidilecek ekranı; hedefi olmayan bildirimde `null`.
 *
 * Hedefsizlik OLAĞAN bir durumdur: danışman değişikliği gibi bildirimlerin
 * gidilecek bir kaydı yok, ayrıca alanlar eklenmeden önce yazılmış
 * bildirimlerde de boş. Çağıran, null geldiğinde düğmeyi hiç basmaz.
 */
export function bildirimBaglantisi(
  bildirim: BildirimHedefi,
): BildirimBaglantisi | null {
  const { hedefTip, hedefId } = bildirim;
  /*
   * İkisi birlikte anlamlı: türü olup kimliği olmayan (ya da tersi) bir satır
   * veri bozulmasıdır ve bağlantıya çevrilmez.
   *
   * Karşılaştırma `== null` — undefined'ı da kapsıyor. Tipler "null" diyor ama
   * alanların HİÇ GELMEDİĞİ bir durum var: sunucu, sütunlar eklenmeden önce
   * üretilmiş bir Prisma istemcisiyle ayaktaysa sorgu o sütunları seçmez ve
   * alanlar undefined olur. Sıkı eşitlik bu hâlde ilk kapıdan geçip aşağıda
   * sessizce null döndürüyordu; ayrımı burada kapatmak, teşhisi zor bir
   * "düğme neden çıkmıyor" sorusunu ortadan kaldırıyor.
   */
  if (hedefTip == null || hedefId == null) return null;

  if (hedefTip === "FAALIYET") {
    return { yol: `/panel/etkinlikler/${hedefId}`, etiket: ETIKETLER.FAALIYET };
  }

  if (hedefTip === "EKIP") {
    return { yol: `/panel/ekipler/${hedefId}`, etiket: ETIKETLER.EKIP };
  }

  return null;
}
```

### `src/lib/bildirim/sablon.ts`

```ts
/**
 * Bildirim şablonu doldurma ve şablon TANIMLARI.
 *
 * Şablon metinleri veritabanında tutulur (bildirim_sablonu) ve Yönetim
 * ekranından düzenlenir; kodda yalnızca hangi kodun hangi olayda gittiği ve
 * hangi değişkenleri taşıdığı yazılıdır. Kod listesi burada durmak zorunda:
 * şablonu tetikleyen olay kodda yaşıyor, veritabanına elle yeni bir satır
 * eklemek kendiliğinden yeni bir bildirim üretmez.
 *
 * Bu dosya veritabanına BAKMAZ; kurallar birim testlerle doğrulanır.
 */

export const BILDIRIM_KODLARI = {
  BASVURU_SONUCU: "BASVURU_SONUCU",
  DANISMAN_DEGISTI: "DANISMAN_DEGISTI",
  DANISMAN_YENIDEN_SECIM: "DANISMAN_YENIDEN_SECIM",
  /**
   * Danışman öğretmen TEK bir öğrencinin danışmanlığını bıraktı; ilin
   * koordinatörüne gider. Gerekçe metne dahildir — bırakma kararı görünür
   * olmadan hesap verilebilir olmaz.
   */
  DANISMANLIK_TEKIL_BIRAKILDI: "DANISMANLIK_TEKIL_BIRAKILDI",
  /**
   * Öğrenci bir öğretmeni danışman seçti; SEÇİLEN ÖĞRETMENE gider
   * (11 Ağustos 2026).
   *
   * Öğrenci danışmanını onay aranmadan seçtiği için bu bildirim, bağın
   * kurulduğunu öğretmene duyuran tek şeydir; olmadığında öğretmen kendi
   * danışmanlığını ancak listesine bakarak fark ediyordu.
   *
   * OTOMATİK ATAMADA GÖNDERİLMEZ: okulun tek danışmanına öğrencilerin ilk
   * girişte kendiliğinden bağlanması ayrı bir olaydır ve o akış kişinin
   * kararıyla doğmaz.
   */
  OGRENCI_DANISMAN_SECTI: "OGRENCI_DANISMAN_SECTI",
  /**
   * Öğrenci danışmanlığı sonlandırdı — başkasını seçerek ya da hiç kimseyi
   * seçmeden; ESKİ ÖĞRETMENE gider (11 Ağustos 2026).
   *
   * Tek şablon, iki olay: metindeki {{neOldu}} ikisini ayırıyor. Ayrı
   * şablonlar, aynı cümlenin iki kopyasını yönetim ekranında ayrı ayrı
   * güncellemek demekti.
   */
  OGRENCI_DANISMANLIKTAN_AYRILDI: "OGRENCI_DANISMANLIKTAN_AYRILDI",
  KOORDINATOR_DEVREDILEBILIR_OGRENCI: "KOORDINATOR_DEVREDILEBILIR_OGRENCI",
  ONAY_BEKLEYEN_ULUSAL_FAALIYET: "ONAY_BEKLEYEN_ULUSAL_FAALIYET",
  /** Öğrenci faaliyet açtı; il koordinatörüne ve YEĞİTEK'e birlikte gider. */
  ONAY_BEKLEYEN_OGRENCI_FAALIYETI: "ONAY_BEKLEYEN_OGRENCI_FAALIYETI",
  /** Danışman öğretmen faaliyet açtı; ilin koordinatörü onaylayacak. */
  ONAY_BEKLEYEN_OGRETMEN_FAALIYETI: "ONAY_BEKLEYEN_OGRETMEN_FAALIYETI",
  /**
   * Mezun / paydaş temsilcisi / mentör etkinlik bildirdi; öğrencininki gibi hem
   * ilin koordinatörüne hem YEĞİTEK'e gider (7 Ağustos 2026).
   *
   * ÖĞRENCİ ŞABLONU KULLANILMADI: o metin "okulundan" diye başlıyor ve dış
   * kullanıcının okulu yok. Onaylayan kişinin ekranında "hangi okuldan geldi"
   * yerine "kim, hangi sıfatla" yazması gerekiyor — karar buna bakılarak
   * veriliyor.
   */
  ONAY_BEKLEYEN_DIS_KULLANICI_ETKINLIGI: "ONAY_BEKLEYEN_DIS_KULLANICI_ETKINLIGI",
  /** Öğrencinin kendi ili, il dışı başvurusuna karar verdi. */
  IL_DISI_BASVURU_KARARI: "IL_DISI_BASVURU_KARARI",
  /** Merkezin tüm öğrenci/öğretmenlere gönderdiği serbest metinli duyuru. */
  TOPLU_DUYURU: "TOPLU_DUYURU",
  /** Öğrencinin bağlantı isteği onay bekliyor; danışman/koordinatöre gider. */
  ONAY_BEKLEYEN_BAGLANTI: "ONAY_BEKLEYEN_BAGLANTI",
  /** Bağlantı isteğine karar verildi; isteği yapana gider. */
  BAGLANTI_ISTEGI_KARARI: "BAGLANTI_ISTEGI_KARARI",
  /** Bağlantı onaylandı ve yazışma açıldı; karşı tarafa gider. */
  YENI_YAZISMA: "YENI_YAZISMA",
  /**
   * Panodaki ilana cevap yazıldı; İLANI AÇANA gider (13 Ağustos 2026).
   *
   * Cevap panoda açıkta duruyor ama ilan sahibinin panoya kendiliğinden geri
   * dönmesini beklemek, cevabın çoğu zaman hiç okunmaması demekti.
   */
  TALEBE_CEVAP_GELDI: "TALEBE_CEVAP_GELDI",
  /**
   * İl koordinatörünün kurduğu bir ekibe eklendiniz; EKLENEN KİŞİYE gider
   * (13 Ağustos 2026).
   *
   * Ekip, kişinin kendiliğinden uğramayacağı bir ekran; haberi olmadan üyesi
   * olduğu sohbete yazılanlar okunmadan kalırdı. Metin, sohbetin gözetime açık
   * olduğunu da söylüyor.
   */
  EKIBE_EKLENDINIZ: "EKIBE_EKLENDINIZ",
  /**
   * Ekip sohbetine yeni mesaj yazıldı; DİĞER ÜYELERE ve ekibi kuran
   * koordinatöre gider (13 Ağustos 2026).
   *
   * Metin mesajın kendisini TAŞIMAZ: tekrar engeli içerik karşılaştırdığı için
   * sabit metin, arka arkaya gelen mesajları tek bildirime indiriyor; ayrıca
   * bildirimin e-posta kopyası sohbet içeriğini dışarı taşımıyor.
   */
  EKIPTE_YENI_MESAJ: "EKIPTE_YENI_MESAJ",
  /** Faaliyet onaylandı ya da reddedildi; faaliyeti açana gider. */
  FAALIYET_ONAY_SONUCU: "FAALIYET_ONAY_SONUCU",
  DANISMANA_KOPYA_ULUSAL_BASVURU: "DANISMANA_KOPYA_ULUSAL_BASVURU",
  OGRENCI_ATANAMADI: "OGRENCI_ATANAMADI",
  FAALIYET_IPTAL_EDILDI: "FAALIYET_IPTAL_EDILDI",
  /** Danışman öğretmen ya da il koordinatörü öğrenci adına başvuru yaptı. */
  ADINA_BASVURU_YAPILDI: "ADINA_BASVURU_YAPILDI",
  /** Adına yapılan başvuru, başvuran öğretmen tarafından geri çekildi. */
  ADINA_BASVURU_GERI_CEKILDI: "ADINA_BASVURU_GERI_CEKILDI",
  /**
   * Seçilmiş bir katılımcı başvurusunu geri çekti; kontenjanda yer açıldı.
   * Etkinliği DÜZENLEYENE gider.
   *
   * Yalnızca SEÇİLEN çekildiğinde gönderilir. Bekleyen ya da yedek başvurunun
   * çekilmesi de yer açar ama düzenleyenin yapacağı bir şey yoktur; her geri
   * çekmede haber gitseydi, gerçekten karar gerektiren tek durum kalabalığın
   * içinde kaybolurdu.
   */
  KONTENJANDA_YER_ACILDI: "KONTENJANDA_YER_ACILDI",
  /** Öğrenci adına başvuran öğretmene giden sonuç kopyası. */
  ADINA_BASVURU_SONUCU: "ADINA_BASVURU_SONUCU",
  /**
   * EBA dışı giriş başvurusu (mezun/paydaş) onay bekliyor; proje
   * yöneticilerine gider.
   *
   * Başvuranın KENDİSİNE giden karar bildirimi burada YOKTUR ve olamaz:
   * reddedilen kişinin sistemde kullanıcı kaydı hiç açılmaz, oysa panel
   * bildirimi bir kullanıcıya yazılır. Karar, doğrudan e-postayla iletilir
   * (bkz. lib/dis-kimlik/eposta.ts).
   */
  ONAY_BEKLEYEN_DIS_BASVURU: "ONAY_BEKLEYEN_DIS_BASVURU",
  /**
   * Mentörlük başvurusu onay bekliyor; PROJE YÖNETİCİLERİNE gider
   * (13 Ağustos 2026 · inceleme bulgusu).
   *
   * Sistemdeki tek sessiz onay kuyruğu buydu: başvuru kaydediliyor, kimseye
   * haber gitmiyordu. Kuyruk ekranı da menüde değil (Yönetim Paneli'nde kart),
   * yani başvuru merkez o kartı kendiliğinden açana kadar bekliyordu — oysa
   * dış giriş başvurusu, etkinlik onayı ve bağlantı isteği için uyarı vardı.
   *
   * KOORDİNATÖRE GİTMEZ: kararı yalnızca merkez veriyor
   * (bkz. mentorlukOnaylayabilirMi · 11 Ağustos 2026). Bilgi amaçlı kopya da
   * gönderilmiyor; yapacağı bir şey olmayan uyarı, yapılacak olanı gölgeler.
   */
  ONAY_BEKLEYEN_MENTORLUK: "ONAY_BEKLEYEN_MENTORLUK",
  /**
   * Mentörlük başvurusu karara bağlandı; BAŞVURANA gider (13 Ağustos 2026).
   *
   * Emsali `BAGLANTI_ISTEGI_KARARI`: onay/ret her iki uçta da duyurulur.
   * Panel'deki "Mentörlüklerim" kartı durumu zaten yazıyor ama kişinin karardan
   * haberdar olması için panele uğramasını beklemek, onayla açılan
   * "Mentörlüğüm" sekmesinin haftalarca fark edilmemesi demekti.
   */
  MENTORLUK_KARARI: "MENTORLUK_KARARI",
  /**
   * Öğrencinin açtığı pano ilanı onay bekliyor; PROJE YÖNETİCİLERİNE gider
   * (14 Ağustos 2026).
   *
   * Uyarısız bir onay kuyruğu, günlerce bakılmayan kuyruktur ve buradaki
   * bedeli öğrenci ödüyor: ilanı o süre boyunca panoda hiç görünmüyor. Emsali
   * ONAY_BEKLEYEN_MENTORLUK — o da tam bu gerekçeyle eklenmişti.
   *
   * KOORDİNATÖRE GİTMEZ: kararı yalnızca merkez veriyor (bkz.
   * panoIlaniOnaylayabilirMi) ve pano kapsam filtresiz olduğu için ilin
   * koordinatörünün yapacağı bir şey yok.
   */
  ONAY_BEKLEYEN_PANO_ILANI: "ONAY_BEKLEYEN_PANO_ILANI",
  /**
   * Pano ilanı karara bağlandı; İLANI AÇANA gider (14 Ağustos 2026).
   *
   * Onay da ret de duyurulur (emsali BAGLANTI_ISTEGI_KARARI): onayda öğrenci
   * ilanının yayımlandığını, rette gerekçesini öğrenir. Ret gerekçesi metne
   * girer — gerekçesiz ret, öğrenciye ilanını düzeltip yeniden açması için
   * hiçbir bilgi bırakmaz.
   */
  PANO_ILANI_KARARI: "PANO_ILANI_KARARI",
} as const;

export type BildirimKodu =
  (typeof BILDIRIM_KODLARI)[keyof typeof BILDIRIM_KODLARI];

export interface BildirimSablonTanimi {
  kod: BildirimKodu;
  baslik: string;
  /** Şablonun hangi olayda ve kime gittiği. */
  aciklama: string;
  /** Konuda ve gövdede kullanılabilecek yer tutucular. */
  degiskenler: readonly string[];
}

/**
 * Yönetim ekranının gösterdiği şablon listesi.
 *
 * Değişken adları burada yazılı olduğu için ekran, metne elle yazılmış hatalı
 * bir yer tutucuyu ({{ogrenci}} gibi) KAYDETMEDEN ÖNCE yakalayabiliyor. Aksi
 * halde hata ancak bildirim gittiğinde, kullanıcının gözüne ham süslü parantez
 * olarak görünürdü.
 */
export const BILDIRIM_SABLON_TANIMLARI: readonly BildirimSablonTanimi[] = [
  {
    kod: BILDIRIM_KODLARI.BASVURU_SONUCU,
    baslik: "Başvuru sonucu",
    aciklama:
      "Başvurusu değerlendirilen katılımcıya gider (seçildi / yedek / reddedildi).",
    degiskenler: ["ogrenciAdSoyad", "faaliyetAdi", "sonuc"],
  },
  {
    kod: BILDIRIM_KODLARI.DANISMAN_DEGISTI,
    baslik: "Danışman değişikliği",
    aciklama:
      "Danışmanı değişen öğrenciye gider. Yeni danışmanın adı metne YAZILMAZ; öğrenci panelinden görür.",
    degiskenler: [],
  },
  {
    kod: BILDIRIM_KODLARI.DANISMAN_YENIDEN_SECIM,
    baslik: "Yeniden danışman seçimi",
    aciklama:
      "Danışmanı görevden ayrıldığı için yeniden seçim yapması gereken öğrenciye gider.",
    degiskenler: [],
  },
  {
    kod: BILDIRIM_KODLARI.DANISMANLIK_TEKIL_BIRAKILDI,
    baslik: "Öğrencinin danışmanlığı bırakıldı",
    aciklama:
      "Danışman öğretmen tek bir öğrencinin danışmanlığını bıraktığında ilin koordinatörüne gider. Gerekçe metinde yer alır; öğrencinin yeni durumu da yazılır.",
    degiskenler: [
      "ogrenciAdSoyad",
      "danismanAdSoyad",
      "okulAdi",
      "gerekce",
      "yeniDurum",
    ],
  },
  {
    kod: BILDIRIM_KODLARI.OGRENCI_DANISMAN_SECTI,
    baslik: "Öğrenci sizi danışman seçti",
    aciklama:
      "Bir öğrenci danışman öğretmen olarak sizi seçtiğinde size gider. Onay istenmez; bildirim bağın kurulduğunu haber verir.",
    degiskenler: ["ogrenciAdSoyad", "sinif"],
  },
  {
    kod: BILDIRIM_KODLARI.OGRENCI_DANISMANLIKTAN_AYRILDI,
    baslik: "Öğrenci danışmanlığınızdan ayrıldı",
    aciklama:
      "Öğrenci başka bir danışman seçtiğinde ya da danışmanlığı hiç kimseyi seçmeden sonlandırdığında eski danışmanına gider. Hangisi olduğu {{neOldu}} ile yazılır.",
    degiskenler: ["ogrenciAdSoyad", "neOldu"],
  },
  {
    kod: BILDIRIM_KODLARI.KOORDINATOR_DEVREDILEBILIR_OGRENCI,
    baslik: "Devredilebilir öğrenci uyarısı",
    aciklama:
      "Bir okulda danışman öğretmen göreve başladığında, o okulun öğrencilerini taşıyan il koordinatörüne gider.",
    degiskenler: ["okulAdi", "ogrenciSayisi"],
  },
  {
    kod: BILDIRIM_KODLARI.ONAY_BEKLEYEN_ULUSAL_FAALIYET,
    baslik: "Onay bekleyen ulusal etkinlik",
    aciklama:
      "İl koordinatörü ulusal etkinlik açtığında proje yöneticilerine gider.",
    degiskenler: ["faaliyetAdi", "duzenleyenAdSoyad"],
  },
  {
    kod: BILDIRIM_KODLARI.ONAY_BEKLEYEN_OGRENCI_FAALIYETI,
    baslik: "Onay bekleyen öğrenci etkinliği",
    aciklama:
      "Öğrenci etkinlik açtığında hem öğrencinin ilinin koordinatörüne hem proje yöneticilerine gider. İkisi de onaylayabilir.",
    degiskenler: ["faaliyetAdi", "duzenleyenAdSoyad", "kapsam", "okulAdi"],
  },
  {
    kod: BILDIRIM_KODLARI.ONAY_BEKLEYEN_OGRETMEN_FAALIYETI,
    baslik: "Onay bekleyen öğretmen etkinliği",
    aciklama:
      "Danışman öğretmen etkinlik açtığında okulun ilindeki koordinatöre gider. İlde koordinatör yoksa proje yöneticilerine düşer, etkinlik askıda kalmaz.",
    degiskenler: ["faaliyetAdi", "duzenleyenAdSoyad", "kapsam", "okulAdi"],
  },
  {
    kod: BILDIRIM_KODLARI.ONAY_BEKLEYEN_DIS_KULLANICI_ETKINLIGI,
    baslik: "Onay bekleyen mezun/paydaş etkinliği",
    aciklama:
      "Mezun, paydaş temsilcisi ya da mentör etkinlik bildirdiğinde hem kişinin ilinin koordinatörüne hem proje yöneticilerine gider. İkisi de onaylayabilir.",
    degiskenler: ["faaliyetAdi", "duzenleyenAdSoyad", "kapsam", "sifat"],
  },
  {
    kod: BILDIRIM_KODLARI.IL_DISI_BASVURU_KARARI,
    baslik: "İl dışı başvuru kararı",
    aciklama:
      "Öğrenci başka bir ilin etkinliğine başvurduğunda, kendi ilinin koordinatörü karar verince öğrenciye gider. Onay başvurunun bittiği anlamına GELMEZ; sıra etkinliğin ilindeki değerlendirmeye geçer.",
    degiskenler: ["ogrenciAdSoyad", "faaliyetAdi", "sonuc", "gerekce"],
  },
  {
    kod: BILDIRIM_KODLARI.TOPLU_DUYURU,
    baslik: "Toplu duyuru",
    aciklama:
      "Proje yöneticisinin Duyurular ekranından gönderdiği serbest metinli duyuru. Metni gönderen yazar; buradaki şablon yalnızca sarmalayıcıdır.",
    degiskenler: ["baslik", "icerik"],
  },
  {
    kod: BILDIRIM_KODLARI.ONAY_BEKLEYEN_BAGLANTI,
    baslik: "Onay bekleyen bağlantı isteği",
    aciklama:
      "Öğrenci başka bir kullanıcıyla iletişim kurmak istediğinde danışmanına ve ilinin koordinatörüne gider.",
    degiskenler: ["isteyenAdSoyad", "hedefAdSoyad", "talepBasligi"],
  },
  {
    kod: BILDIRIM_KODLARI.BAGLANTI_ISTEGI_KARARI,
    baslik: "Bağlantı isteği sonucu",
    aciklama:
      "İsteği yapan öğrenciye gider. Onaylandıysa yazışma açılmıştır; reddedildiyse gerekçe yazılıdır.",
    degiskenler: ["hedefAdSoyad", "sonuc", "gerekce"],
  },
  {
    kod: BILDIRIM_KODLARI.TALEBE_CEVAP_GELDI,
    baslik: "Panodaki ilana cevap geldi",
    aciklama:
      "Mentör ya da bir başka kullanıcı panodaki ilana cevap yazdığında İLANI AÇANA gider.",
    degiskenler: ["talepBasligi", "cevaplayanAdSoyad"],
  },
  {
    kod: BILDIRIM_KODLARI.EKIBE_EKLENDINIZ,
    baslik: "Ekibe eklendiniz",
    aciklama:
      "İl koordinatörü (ya da proje yöneticisi) kişiyi bir ekibe eklediğinde o kişiye gider.",
    degiskenler: ["ekipAdi", "ekleyenAdSoyad"],
  },
  {
    kod: BILDIRIM_KODLARI.EKIPTE_YENI_MESAJ,
    baslik: "Ekipte yeni mesaj",
    aciklama:
      "Ekip sohbetine mesaj yazıldığında diğer üyelere ve ekibi kuran koordinatöre gider. Metin mesajı taşımaz; yalnızca hangi ekipte olduğunu söyler.",
    degiskenler: ["ekipAdi"],
  },
  {
    kod: BILDIRIM_KODLARI.YENI_YAZISMA,
    baslik: "Yeni yazışma açıldı",
    aciklama:
      "Bağlantı onaylandığında KARŞI TARAFA gider: biri kendisiyle iletişim kurmak istedi ve izin verildi.",
    degiskenler: ["isteyenAdSoyad"],
  },
  {
    kod: BILDIRIM_KODLARI.FAALIYET_ONAY_SONUCU,
    baslik: "Etkinlik onay sonucu",
    aciklama:
      "Onaya sunulan etkinlik sonuçlandığında etkinliği açan kullanıcıya gider.",
    degiskenler: ["faaliyetAdi", "sonuc", "kararVerenAdSoyad"],
  },
  {
    kod: BILDIRIM_KODLARI.DANISMANA_KOPYA_ULUSAL_BASVURU,
    baslik: "Danışmana ulusal başvuru kopyası",
    aciklama:
      "Öğrenci kendi ili dışındaki ulusal etkinliğe başvurduğunda danışmanına gider. Onay değildir, salt haberdir.",
    degiskenler: ["ogrenciAdSoyad", "faaliyetAdi"],
  },
  {
    kod: BILDIRIM_KODLARI.OGRENCI_ATANAMADI,
    baslik: "Öğrenciye danışman atanamadı",
    aciklama:
      "Okulunda danışman öğretmen ve ilinde koordinatör bulunmadığında proje yöneticilerine gider.",
    degiskenler: ["ogrenciAdSoyad", "ilKodu"],
  },
  {
    kod: BILDIRIM_KODLARI.FAALIYET_IPTAL_EDILDI,
    baslik: "Etkinlik iptal edildi",
    aciklama: "Etkinlik iptal edildiğinde aktif başvuru sahiplerine gider.",
    degiskenler: ["faaliyetAdi", "gerekce"],
  },
  {
    kod: BILDIRIM_KODLARI.ADINA_BASVURU_YAPILDI,
    baslik: "Adınıza başvuru yapıldı",
    aciklama:
      "Danışman öğretmen ya da il koordinatörü öğrenci adına başvurduğunda öğrenciye gider.",
    degiskenler: ["ogrenciAdSoyad", "faaliyetAdi", "basvuranAdSoyad"],
  },
  {
    kod: BILDIRIM_KODLARI.ADINA_BASVURU_GERI_CEKILDI,
    baslik: "Adınıza yapılan başvuru geri çekildi",
    aciklama:
      "Öğrenci adına yapılan başvuru, başvuran öğretmen tarafından geri çekildiğinde öğrenciye gider.",
    degiskenler: ["ogrenciAdSoyad", "basvuranAdSoyad"],
  },
  {
    kod: BILDIRIM_KODLARI.KONTENJANDA_YER_ACILDI,
    baslik: "Kontenjanda yer açıldı",
    aciklama:
      "Seçilmiş bir katılımcı başvurusunu geri çektiğinde etkinliği düzenleyene gider. Yedek sayısı metne yazılır; düzenleyen yedekten çağırma kararını buna göre verir.",
    degiskenler: [
      "faaliyetAdi",
      "katilimciAdSoyad",
      "yedekSayisi",
      "kalanYer",
    ],
  },
  {
    kod: BILDIRIM_KODLARI.ADINA_BASVURU_SONUCU,
    baslik: "Adına başvurulan öğrencinin sonucu",
    aciklama:
      "Öğrenci adına başvuran öğretmene, başvuru değerlendirildiğinde gider.",
    degiskenler: ["ogrenciAdSoyad", "faaliyetAdi", "sonuc"],
  },
  {
    kod: BILDIRIM_KODLARI.ONAY_BEKLEYEN_DIS_BASVURU,
    baslik: "Onay bekleyen dış giriş başvurusu",
    aciklama:
      "EBA hesabı olmayan biri (mezun / paydaş temsilcisi) giriş başvurusu yaptığında proje yöneticilerine gider.",
    degiskenler: ["basvuranAdSoyad", "tur", "ilAdi"],
  },
  {
    kod: BILDIRIM_KODLARI.ONAY_BEKLEYEN_MENTORLUK,
    baslik: "Onay bekleyen mentörlük başvurusu",
    aciklama:
      "Bir kullanıcı mentörlük başvurusu yaptığında proje yöneticilerine gider. Kararı yalnızca merkez verir; il koordinatörüne kopya çıkmaz.",
    degiskenler: ["basvuranAdSoyad", "kapsam"],
  },
  {
    kod: BILDIRIM_KODLARI.MENTORLUK_KARARI,
    baslik: "Mentörlük başvurusu sonucu",
    aciklama:
      "Başvuruyu yapan kişiye gider. Onaylandıysa Mentörlüğüm sekmesi açılmıştır; reddedildiyse gerekçe yazılıdır.",
    degiskenler: ["sonuc", "gerekce"],
  },
  {
    kod: BILDIRIM_KODLARI.ONAY_BEKLEYEN_PANO_ILANI,
    baslik: "Onay bekleyen pano ilanı",
    aciklama:
      "Öğrenci panoya ilan açtığında proje yöneticilerine gider. İlan, onaylanana kadar panoda görünmez. Kararı yalnızca merkez verir; il koordinatörüne kopya çıkmaz.",
    degiskenler: ["acanAdSoyad", "talepBasligi", "tur"],
  },
  {
    kod: BILDIRIM_KODLARI.PANO_ILANI_KARARI,
    baslik: "Pano ilanı sonucu",
    aciklama:
      "İlanı açan öğrenciye gider. Onaylandıysa ilan panoda yayımlanmıştır; reddedildiyse gerekçe yazılıdır.",
    degiskenler: ["talepBasligi", "sonuc", "gerekce"],
  },
];

export function sablonTanimiGetir(
  kod: string,
): BildirimSablonTanimi | undefined {
  return BILDIRIM_SABLON_TANIMLARI.find((tanim) => tanim.kod === kod);
}

const YER_TUTUCU = /\{\{(\w+)\}\}/g;

/** Metindeki tüm {{yerTutucu}} adlarını tekrarsız verir. */
export function yerTutuculariCikar(metin: string): string[] {
  const bulunanlar = new Set<string>();
  for (const eslesme of metin.matchAll(YER_TUTUCU)) {
    bulunanlar.add(eslesme[1]);
  }
  return [...bulunanlar];
}

/**
 * Şablon metnini doğrular.
 *
 * TANIMSIZ yer tutucu hatadır: metne yazılan {{ogrenci}} hiçbir zaman
 * dolmayacağı için bildirim kullanıcıya ham süslü parantezle ulaşır. Tanımlı
 * bir değişkenin KULLANILMAMASI ise hata değildir — metni kısaltmak metni
 * yazanın hakkı.
 */
export function sablonMetniGecerliMi(
  metin: string,
  izinliDegiskenler: readonly string[],
): { olurMu: boolean; neden?: string } {
  const kirpilmis = metin.trim();
  if (!kirpilmis) {
    return { olurMu: false, neden: "Metin boş bırakılamaz." };
  }

  const tanimsizlar = yerTutuculariCikar(kirpilmis).filter(
    (ad) => !izinliDegiskenler.includes(ad),
  );
  if (tanimsizlar.length > 0) {
    return {
      olurMu: false,
      neden: `Tanımsız değişken: ${tanimsizlar
        .map((ad) => `{{${ad}}}`)
        .join(", ")}. Kullanılabilir: ${izinliDegiskenler
        .map((ad) => `{{${ad}}}`)
        .join(", ")}`,
    };
  }

  return { olurMu: true };
}

/** Şablondaki {{degisken}} yer tutucularını doldurur. */
export function sablonuDoldur(
  sablon: string,
  degiskenler: Record<string, string>,
): string {
  return sablon.replace(YER_TUTUCU, (tamEslesme, anahtar: string) => {
    return degiskenler[anahtar] ?? tamEslesme;
  });
}
```

### `src/lib/bildirim/sms-kopyasi.ts`

```ts
import type { GonderimDurumu } from "@/generated/prisma/enums";
import { prisma } from "../db";
import { sms, smsEtkinMi } from "../sms";
import { smsGovdesiHazirla } from "../sms/govde";

export { smsGovdesiHazirla };

/**
 * Panel bildiriminin SMS kopyası — e-posta kopyasının ikizidir ve aynı iki
 * kurala uyar:
 *
 * 1. SMS ASLA iş akışını kesmez. Operatör erişilemezse başvuru değerlendirmesi
 *    yarıda kalmamalı; bildirim zaten panele yazıldı.
 * 2. Başarısızlık sessizce yutulmaz. Sonuç bildirim kaydına işlenir, "SMS
 *    gelmedi" şikâyetinde hiç denenmediği mi yoksa operatörden mi döndüğü
 *    ayırt edilebilir.
 *
 * E-postadan tek farkı: SMS uzunluk sınırlıdır ve ücretlidir, o yüzden gövde
 * kırpılır ve panele yönlendirilir.
 */

/** Kişinin bildirim numarasını iki profil tablosundan hangisindeyse getirir. */
export async function bildirimTelefonuGetir(
  kullaniciId: number,
): Promise<string | null> {
  const kayit = await prisma.kullanici.findUnique({
    where: { id: kullaniciId },
    select: {
      ogrenciProfil: { select: { telefon: true } },
      ogretmenProfil: { select: { telefon: true } },
    },
  });

  const numara =
    kayit?.ogrenciProfil?.telefon ?? kayit?.ogretmenProfil?.telefon ?? null;

  return numara?.trim() ? numara.trim() : null;
}

interface KopyaIstegi {
  bildirimId: number;
  kullaniciId: number;
  baslik: string;
  icerik: string;
}

export async function smsKopyasiGonder(istek: KopyaIstegi): Promise<void> {
  if (!smsEtkinMi()) return;

  const numara = await bildirimTelefonuGetir(istek.kullaniciId);
  // Numara yok: hata değil. İletişim bilgisi zorunlu değildir ve olmaması
  // kişinin tercihidir.
  if (!numara) return;

  let durum: GonderimDurumu = "GONDERILDI";
  let hataMetni: string | null = null;

  try {
    await sms().gonder({
      alici: numara,
      govde: smsGovdesiHazirla(istek.baslik, istek.icerik),
    });
  } catch (hata) {
    durum = "BASARISIZ";
    hataMetni = hata instanceof Error ? hata.message : String(hata);
    console.error(`SMS gönderilemedi (bildirim ${istek.bildirimId}):`, hata);
  }

  await prisma.bildirim.update({
    where: { id: istek.bildirimId },
    data: { smsDurumu: durum, smsHatasi: hataMetni },
  });
}
```

### `src/lib/bildirim/toplu.ts`

```ts
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

export const DUYURU_HEDEFLERI = ["OGRENCI", "OGRETMEN", "HERKES"] as const;
export type DuyuruHedefi = (typeof DUYURU_HEDEFLERI)[number];

export const DUYURU_HEDEF_ETIKETLERI: Record<DuyuruHedefi, string> = {
  OGRENCI: "Tüm öğrenciler",
  OGRETMEN: "Tüm öğretmenler",
  HERKES: "Öğrenciler ve öğretmenler",
};

export function duyuruHedefiMi(deger: string): deger is DuyuruHedefi {
  return (DUYURU_HEDEFLERI as readonly string[]).includes(deger);
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
  | { olurMu: true; hedef: DuyuruHedefi; baslik: string; icerik: string }
  | { olurMu: false; neden: string };

export function duyuruyuCoz(girdi: DuyuruGirdisi): DuyuruKarari {
  if (!duyuruHedefiMi(girdi.hedef)) {
    return { olurMu: false, neden: "Alıcı grubu seçilmelidir." };
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

/**
 * Duyurunun kaç kişiye gideceğinin ekranda yazılması için.
 *
 * "Emin misiniz?" diye sormak yerine SAYIYI göstermek daha dürüst: kullanıcı
 * 12 kişiye mi 4000 kişiye mi gönderdiğini bilerek karar verir.
 */
export function aliciOzeti(hedef: DuyuruHedefi, sayilar: {
  ogrenci: number;
  ogretmen: number;
}): string {
  const toplam =
    hedef === "OGRENCI"
      ? sayilar.ogrenci
      : hedef === "OGRETMEN"
        ? sayilar.ogretmen
        : sayilar.ogrenci + sayilar.ogretmen;
  return `${toplam} kişi`;
}
```
