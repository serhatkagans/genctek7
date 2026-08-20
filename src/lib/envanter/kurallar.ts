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

/**
 * Envanter ŞU AN ÇÖZÜLEBİLİR mi?
 *
 * İki koşul birden: içeriği hazır olacak VE geçici olarak kapatılmamış
 * olacak (bkz. tanimlar.ts · `kapali`). Ekranlar ve eylemler bu soruyu
 * soruyor — `envanterHazirMi` yalnızca içeriğin varlığını söyler ve tek
 * başına kullanıldığında kapalı bir envanteri çözüme açardı.
 */
export function envanterAcikMi(tanim: EnvanterTanimi): boolean {
  return envanterHazirMi(tanim) && !tanim.kapali;
}

/** Ekranda çözülebilen envanterler. */
export function hazirEnvanterler(): EnvanterTanimi[] {
  return ENVANTERLER.filter(envanterAcikMi);
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
