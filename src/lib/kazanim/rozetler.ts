import type { EtkinlikKategorisi, Kapsam } from "@/generated/prisma/enums";

/**
 * Katkı nişanları (rozetler) — öğrenci ve öğretmen için ayrı listeler.
 *
 * Rozetler ELLE VERİLMEZ, geçmişten türetilir. Manuel verilseydi kişinin
 * gördüğü rozetle sistemdeki kayıt zamanla ayrışır, kimin neyi neden aldığı
 * tartışma konusu olurdu. Türetilmiş rozet her hesaplamada aynı veriden aynı
 * sonucu verir ve geri alınması gerekmez.
 *
 * "Katılım" = faaliyete SEÇİLDİ + faaliyet tarihi geçti + faaliyet iptal
 * edilmedi. Sadece seçilmiş olmak katılım sayılmaz; henüz gerçekleşmemiş bir
 * etkinlik için rozet vermek, kişiye yapmadığı bir şeyi başarmış gibi göstermek
 * olurdu.
 *
 * Bu dosya saf tutulur: veritabanına gitmez, tarih üretmez. Böylece kurallar
 * birim testle sınanabilir.
 */

export interface KatilimKaydi {
  kapsam: Kapsam;
  etkinlikKategorisi: EtkinlikKategorisi;
  tarih: Date;
}

export interface KazanimGirdisi {
  katilimlar: KatilimKaydi[];
  /** Öğrencinin seçtiği çalışma grubu sayısı. */
  calismaGrubuSayisi: number;
  /** Dönem içinde üstlendiği görev rolleri (İl Yöneticisi, Okul Temsilcisi). */
  gorevRolSayisi: number;
}

/**
 * Öğretmenin katkısını oluşturan sayılar.
 *
 * Öğrenciyle ORTAK olan tek şey katılım geçmişidir; gerisi ayrıdır. Öğretmenin
 * çalışma grubu seçimi ve temsilcilik görevi yoktur — onun katkısı düzenlediği
 * faaliyetlerde, üstlendiği danışmanlıklarda ve kurduğu iş birliklerindedir.
 */
export interface OgretmenKatkiGirdisi {
  katilimlar: KatilimKaydi[];
  /** Onaylı ve iptal edilmemiş, kendi açtığı faaliyetler. */
  duzenledigiFaaliyetSayisi: number;
  /** Süren danışmanlıklar; biten atamalar sayılmaz. */
  aktifDanismanlikSayisi: number;
  /** Faaliyetlerine bağladığı paydaş kurum bağlantısı sayısı. */
  paydasliFaaliyetSayisi: number;
}

export interface RozetTanimi<TGirdi = KazanimGirdisi> {
  kod: string;
  ad: string;
  aciklama: string;
  /** Kaç adımda kazanılır. 1 ise "yaptın / yapmadın" rozetidir. */
  hedef: number;
  ilerleme: (girdi: TGirdi) => number;
}

const benzersizSayi = <T>(degerler: T[]): number => new Set(degerler).size;

export const ROZETLER: RozetTanimi[] = [
  {
    kod: "ILK_ADIM",
    ad: "İlk Adım",
    aciklama: "İlk GençTek etkinliğine katıldın.",
    hedef: 1,
    ilerleme: (girdi) => girdi.katilimlar.length,
  },
  {
    kod: "DUZENLI_KATILIM",
    ad: "Düzenli Katılım",
    aciklama: "Üç etkinliğe katıldın.",
    hedef: 3,
    ilerleme: (girdi) => girdi.katilimlar.length,
  },
  {
    kod: "GENCTEK_GONULLUSU",
    ad: "GençTek Gönüllüsü",
    aciklama: "On etkinliğe katıldın.",
    hedef: 10,
    ilerleme: (girdi) => girdi.katilimlar.length,
  },
  {
    kod: "COK_YONLU",
    ad: "Çok Yönlü",
    aciklama: "Üç etkinlik kategorisinin üçünde de yer aldın.",
    hedef: 3,
    ilerleme: (girdi) =>
      benzersizSayi(girdi.katilimlar.map((k) => k.etkinlikKategorisi)),
  },
  {
    kod: "IL_SAHNESI",
    ad: "İl Sahnesi",
    aciklama: "İl geneli bir etkinliğe katıldın.",
    hedef: 1,
    ilerleme: (girdi) =>
      girdi.katilimlar.filter((k) => k.kapsam === "IL").length,
  },
  {
    kod: "TURKIYE_SAHNESI",
    ad: "Türkiye Sahnesi",
    aciklama: "Ulusal bir etkinliğe katıldın.",
    hedef: 1,
    ilerleme: (girdi) =>
      girdi.katilimlar.filter(
        (k) => k.kapsam === "ULUSAL" || k.kapsam === "ULUSLARARASI",
      ).length,
  },
  {
    kod: "ILGI_ALANI",
    ad: "İlgi Alanı",
    aciklama: "Kendine bir çalışma grubu seçtin.",
    hedef: 1,
    ilerleme: (girdi) => girdi.calismaGrubuSayisi,
  },
  {
    kod: "MERAKLI",
    ad: "Meraklı",
    aciklama: "Üç farklı çalışma grubuna kayıtlısın.",
    hedef: 3,
    ilerleme: (girdi) => girdi.calismaGrubuSayisi,
  },
  {
    kod: "SORUMLULUK",
    ad: "Sorumluluk",
    aciklama: "Bir temsil görevi üstlendin.",
    hedef: 1,
    ilerleme: (girdi) => girdi.gorevRolSayisi,
  },
];

/**
 * Öğretmen nişanları.
 *
 * Öğrenci listesi olduğu gibi kullanılamazdı: "Çalışma grubu seçtin" ve "temsil
 * görevi üstlendin" öğretmende hiçbir zaman dolmayacak, buna karşılık asıl
 * katkısı olan danışmanlık ve faaliyet düzenlemek hiç sayılmayacaktı. Ölçütler
 * KATILIMDAN çok EMEĞE bakar; öğretmen GençTek'e çoğunlukla katılımcı olarak
 * değil, öğrencinin önünü açarak dahil oluyor.
 */
export const OGRETMEN_ROZETLERI: RozetTanimi<OgretmenKatkiGirdisi>[] = [
  {
    kod: "ILK_FAALIYET",
    ad: "İlk Etkinlik",
    aciklama: "İlk GençTek etkinliğinizi düzenlediniz.",
    hedef: 1,
    ilerleme: (girdi) => girdi.duzenledigiFaaliyetSayisi,
  },
  {
    kod: "SUREKLI_DUZENLEYICI",
    ad: "Sürekli Düzenleyici",
    aciklama: "Beş etkinlik düzenlediniz.",
    hedef: 5,
    ilerleme: (girdi) => girdi.duzenledigiFaaliyetSayisi,
  },
  {
    kod: "REHBER",
    ad: "Rehber",
    aciklama: "Bir öğrencinin danışmanlığını üstlendiniz.",
    hedef: 1,
    ilerleme: (girdi) => girdi.aktifDanismanlikSayisi,
  },
  {
    kod: "YOL_ACAN",
    ad: "Yol Açan",
    aciklama: "On öğrencinin danışmanısınız.",
    hedef: 10,
    ilerleme: (girdi) => girdi.aktifDanismanlikSayisi,
  },
  {
    kod: "SAHADA",
    ad: "Sahada",
    aciklama: "Bir GençTek etkinliğine katılımcı olarak katıldınız.",
    hedef: 1,
    ilerleme: (girdi) => girdi.katilimlar.length,
  },
  {
    kod: "IS_BIRLIGI",
    ad: "İş Birliği",
    aciklama: "Etkinliğinize bir paydaş kurumu dahil ettiniz.",
    hedef: 1,
    ilerleme: (girdi) => girdi.paydasliFaaliyetSayisi,
  },
];

export interface RozetDurumu {
  kod: string;
  ad: string;
  aciklama: string;
  hedef: number;
  /** Hedefi aşan ilerleme hedefe kırpılır: "12/10" gösterimi kafa karıştırır. */
  ilerleme: number;
  kazanildiMi: boolean;
}

function durumlariHesapla<TGirdi>(
  tanimlar: RozetTanimi<TGirdi>[],
  girdi: TGirdi,
): RozetDurumu[] {
  return tanimlar.map((rozet) => {
    const hamIlerleme = rozet.ilerleme(girdi);
    const ilerleme = Math.min(hamIlerleme, rozet.hedef);
    return {
      kod: rozet.kod,
      ad: rozet.ad,
      aciklama: rozet.aciklama,
      hedef: rozet.hedef,
      ilerleme,
      kazanildiMi: hamIlerleme >= rozet.hedef,
    };
  });
}

export function rozetDurumlari(girdi: KazanimGirdisi): RozetDurumu[] {
  return durumlariHesapla(ROZETLER, girdi);
}

export function ogretmenRozetDurumlari(
  girdi: OgretmenKatkiGirdisi,
): RozetDurumu[] {
  return durumlariHesapla(OGRETMEN_ROZETLERI, girdi);
}

export interface KatilimOzeti {
  toplamKatilim: number;
  kapsamaGore: Record<Kapsam, number>;
  kategoriyeGore: Record<EtkinlikKategorisi, number>;
}

export function katilimOzeti(katilimlar: KatilimKaydi[]): KatilimOzeti {
  const kapsamaGore: Record<Kapsam, number> = {
    OKUL: 0,
    IL: 0,
    ULUSAL: 0,
    ULUSLARARASI: 0,
  };
  const kategoriyeGore: Record<EtkinlikKategorisi, number> = {
    TEMEL_ETKINLIK: 0,
    CALISMA_GRUBU_ETKINLIGI: 0,
    IL_ETKINLIGI: 0,
  };

  for (const katilim of katilimlar) {
    kapsamaGore[katilim.kapsam] += 1;
    kategoriyeGore[katilim.etkinlikKategorisi] += 1;
  }

  return {
    toplamKatilim: katilimlar.length,
    kapsamaGore,
    kategoriyeGore,
  };
}

// ---------------------------------------------------------------------------
// Seferler — seviye sistemi (D7 · 6 Ağustos 2026)
// ---------------------------------------------------------------------------

/**
 * SEVİYELER BİR MERDİVEN DEĞİL, KAZANILAN NİTELİKLERDİR.
 *
 * İstek iki liste veriyordu ("usta/kalfa/çırak" ve "keşfeden/üreten/paylaşan/
 * lider/elçi"); ikincisi seçildi (→ S15). Ama ikisi aynı türden değil: usta
 * kalfanın üstüdür, oysa "üreten" ile "paylaşan" biri öbürünün üstü DEĞİL —
 * farklı davranışlar. Bu yüzden sıralı bir merdiven değil, her biri kendi
 * ölçütüyle kazanılan beş nitelik olarak kuruldu. Sıralı kurulsaydı ürün
 * eklemeyen bir öğrenci, akran eğitimi verse bile "paylaşan" olamazdı.
 *
 * ÖLÇÜTLER GEÇMİŞTEN TÜRETİLİR (istek: "etkinlikler, verdiği eğitimler vs.")
 * ve nişanlarla aynı desendedir: elle verilmez, tabloda tutulmaz.
 *
 * SEVİYE DÜŞMEZ (istek: "düşmesin"). Ölçütlerin hepsi geçmişe bakan sayımlar
 * olduğu için kazanılan seviye kendiliğinden geri alınmaz. Tek istisna, bir
 * yetkilinin görev rolünü SİLMESİDİR (kaldırma gerçek silmedir); "Lider" o
 * durumda düşebilir. Düzenlenen etkinlik de aynı seviyeyi verdiği için pratikte
 * bu yol açık kalıyor.
 *
 * DÖNEM SIFIRLAMASI YOK: "seneye için bakarız" dendi. Bugün seviyeler tüm
 * geçmişe bakar; dönem bazlı istenirse ölçütlere yıl süzgeci eklenir ve bu,
 * seviyenin düşebileceği anlamına gelir — o zaman yeniden konuşulmalı.
 */
export interface SeferGirdisi {
  katilimlar: KatilimKaydi[];
  /** `kullanici_kazanim` · tip=URUN */
  urunSayisi: number;
  /** `kullanici_kazanim` · tip=AKRAN_EGITIMI */
  verdigiEgitimSayisi: number;
  /** Dönem fark etmeksizin üstlendiği temsilcilikler. */
  gorevRolSayisi: number;
  /** Öğrencinin önerip onaylanan etkinlikleri. */
  duzenledigiEtkinlikSayisi: number;
}

export interface SeferTanimi {
  kod: string;
  ad: string;
  aciklama: string;
  /** Seviyeyi kazandıran ölçüt; sayı olarak döner, 1 ve üzeri kazanmış demek. */
  ilerleme: (girdi: SeferGirdisi) => number;
}

export const SEFERLER: SeferTanimi[] = [
  {
    kod: "KESFEDEN",
    ad: "Keşfeden",
    aciklama: "Bir GençTek etkinliğine katıldın.",
    ilerleme: (girdi) => girdi.katilimlar.length,
  },
  {
    kod: "URETEN",
    ad: "Üreten",
    aciklama: "Kendi ürününü profiline ekledin.",
    ilerleme: (girdi) => girdi.urunSayisi,
  },
  {
    kod: "PAYLASAN",
    ad: "Paylaşan",
    aciklama: "Akranlarına eğitim verdin.",
    ilerleme: (girdi) => girdi.verdigiEgitimSayisi,
  },
  {
    /*
     * İki yoldan kazanılır: temsilcilik ya da etkinlik önermek. Tek yola
     * bağlansaydı, okulunda temsilcilik boşalmayan ama etkinlik düzenleyen
     * öğrenci hiçbir zaman lider sayılmazdı.
     */
    kod: "LIDER",
    ad: "Lider",
    aciklama: "Temsilcilik üstlendin ya da bir etkinlik önerdin.",
    ilerleme: (girdi) => girdi.gorevRolSayisi + girdi.duzenledigiEtkinlikSayisi,
  },
  {
    /*
     * "Elçi" okulun DIŞINI temsil etmektir: il geneli ya da ulusal bir
     * etkinliğe katılmak. Okul içi katılım burada sayılmaz, yoksa Keşfeden'den
     * farkı kalmazdı.
     */
    kod: "ELCI",
    ad: "Elçi",
    aciklama: "İl geneli ya da ulusal bir etkinlikte GençTek'i temsil ettin.",
    ilerleme: (girdi) =>
      girdi.katilimlar.filter((k) => k.kapsam !== "OKUL").length,
  },
];

export interface SeferDurumu {
  kod: string;
  ad: string;
  aciklama: string;
  kazanildiMi: boolean;
}

export function seferDurumlari(girdi: SeferGirdisi): SeferDurumu[] {
  return SEFERLER.map((sefer) => ({
    kod: sefer.kod,
    ad: sefer.ad,
    aciklama: sefer.aciklama,
    kazanildiMi: sefer.ilerleme(girdi) >= 1,
  }));
}
