/**
 * GENÇTEK YOLCULUĞU — puan ve seviye kuralları (21 Ağustos 2026).
 *
 * İstek: "katkı nişanlarım … gençtek yolculuğum olsun, aşamalar şunlar olacak:
 * 'Hello World' · Keşifte · Harekette · Üretimde · Katkıda · Ufuk Açan · İz
 * Bırakan" — tasarım için elimizde iki taslak görsel var (rozet/seviye
 * sistemi), sayılar oradan esinlenildi.
 *
 * ---------------------------------------------------------------------------
 * PUAN ELLE VERİLMEZ, GEÇMİŞTEN TÜRETİLİR
 * ---------------------------------------------------------------------------
 * Rozetlerdeki ilkeyle aynı (bkz. lib/kazanim/rozetler.ts): puan tabloda
 * TUTULMAZ, her hesapta aynı veriden aynı sonuç çıkar. Sütunda tutulsaydı bir
 * kayıt silindiğinde puan asılı kalır, "bu puan nereden geldi" sorusunun
 * cevabı kaybolurdu.
 *
 * Bu dosya SAF: veritabanına gitmez, tarih üretmez. Sayıları çeken taraf
 * `lib/yolculuk/veri.ts`.
 *
 * ---------------------------------------------------------------------------
 * SEVİYE BİR MERDİVEN, ROZET BİR NİŞAN
 * ---------------------------------------------------------------------------
 * İkisi birbirinin yerine geçmiyor: rozet "şunu yaptın" der ve tek seferliktir;
 * seviye toplam katkının nerede olduğunu söyler ve geri gitmez — puan bir
 * kaydın silinmesiyle düşebilir, ama seviyeyi kaybetmek kişinin yaptığı işi
 * yapmamış saymak olurdu. Bu yüzden seviye, ULAŞILAN EN YÜKSEK eşiktir ve
 * hesap her zaman güncel puandan yapılır (kayıt silinirse puan da düşer;
 * kimseye "seviyen düştü" denmez, yalnızca sonraki eşiğe kalan puan artar).
 */

/** Puan kaynağı — ekranda "Nasıl puan kazanırım?" listesi de bundan basılır. */
export interface PuanKaynagi {
  kod: string;
  etiket: string;
  /** Bir kez yapıldığında kazanılan puan. */
  puan: number;
  /** Kaynağın kime gösterileceği; öğretmende olmayan ölçütler gizlenir. */
  kimde: "herkes" | "ogrenci" | "ogretmen";
}

/**
 * PUANLAR KÜÇÜK VE YAKIN TUTULDU. Tek bir eylemin (ör. etkinlik düzenleme) çok
 * yüksek puan getirmesi, seviyeyi "kim daha çok etkinlik açtı" yarışına
 * çevirirdi; oysa yolculuk katılımı, üretimi ve paylaşmayı birlikte sayıyor.
 */
export const PUAN_KAYNAKLARI: PuanKaynagi[] = [
  {
    kod: "KAYIT",
    etiket: "Ekosisteme kayıt oldun",
    puan: 1,
    kimde: "herkes",
  },
  {
    kod: "KATILIM",
    etiket: "GençTek etkinliğine katıldın",
    puan: 1,
    kimde: "herkes",
  },
  {
    kod: "URUN",
    etiket: "Ürün / proje yükledin",
    puan: 1,
    kimde: "herkes",
  },
  {
    kod: "DENEYIM",
    etiket: "Deneyim, sertifika ya da derece eklendi",
    puan: 1,
    kimde: "herkes",
  },
  {
    kod: "CALISMA_GRUBU",
    etiket: "Çalışma grubu seçtin",
    puan: 1,
    kimde: "ogrenci",
  },
  {
    kod: "AKRAN_EGITIMI",
    etiket: "Akran eğitimi verdin",
    puan: 2,
    kimde: "ogrenci",
  },
  {
    kod: "ETKINLIK_DUZENLEME",
    etiket: "Etkinlik düzenledin",
    puan: 2,
    kimde: "herkes",
  },
  {
    kod: "GOREV",
    etiket: "Temsilcilik ya da GençTek görevi aldın",
    puan: 2,
    kimde: "herkes",
  },
  {
    kod: "MENTORLUK",
    etiket: "Mentör oldun",
    puan: 2,
    kimde: "herkes",
  },
  {
    kod: "DANISMANLIK",
    etiket: "Danışmanlık yürütüyorsun",
    puan: 2,
    kimde: "ogretmen",
  },
];

export function puanKaynagi(kod: string): PuanKaynagi | undefined {
  return PUAN_KAYNAKLARI.find((kaynak) => kaynak.kod === kod);
}

/** Kişinin sayıları — her biri o kaynağın KAÇ KEZ gerçekleştiği. */
export interface YolculukGirdisi {
  katilimSayisi: number;
  urunSayisi: number;
  deneyimSayisi: number;
  calismaGrubuSayisi: number;
  akranEgitimiSayisi: number;
  duzenlenenEtkinlikSayisi: number;
  gorevSayisi: number;
  mentorMu: boolean;
  aktifDanismanlikSayisi: number;
}

export interface PuanSatiri {
  kod: string;
  etiket: string;
  /** Kaç kez gerçekleşti. */
  adet: number;
  /** Birim puan. */
  puan: number;
  /** adet × puan. */
  toplam: number;
}

/**
 * Seviyeler ve eşikleri.
 *
 * "Hello World" SIFIR PUANLA BAŞLAR: sisteme giren herkes yolculuğun içindedir.
 * Boş bir seviye ("henüz seviyen yok") kişiye başlamadığını söylerdi; oysa
 * kayıt olmak da bir adımdır ve ilk puan oradan geliyor.
 *
 * Eşikler arası mesafe yukarı çıktıkça AÇILIYOR (3 · 5 · 7 · 10 · 15 · 20):
 * ilk seviyeler birkaç etkinlikle geçilebilmeli ki yolculuk görünür olsun;
 * üst seviyeler ise süreklilik istemeli.
 */
export interface SeviyeTanimi {
  kod: string;
  ad: string;
  /** Bu seviyeye girmek için gereken en düşük puan. */
  esik: number;
  aciklama: string;
}

export const YOLCULUK_SEVIYELERI: SeviyeTanimi[] = [
  {
    kod: "HELLO_WORLD",
    ad: '"Hello World"',
    esik: 0,
    aciklama: "Ekosisteme adım attın; yolculuk buradan başlıyor.",
  },
  {
    kod: "KESIFTE",
    ad: "Keşifte",
    esik: 3,
    aciklama: "Etkinliklere katılıyor, ekosistemi tanıyorsun.",
  },
  {
    kod: "HAREKETTE",
    ad: "Harekette",
    esik: 8,
    aciklama: "Düzenli katılıyor, çalışma alanını seçiyorsun.",
  },
  {
    kod: "URETIMDE",
    ad: "Üretimde",
    esik: 15,
    aciklama: "Kendi ürünlerini ve deneyimlerini ortaya koyuyorsun.",
  },
  {
    kod: "KATKIDA",
    ad: "Katkıda",
    esik: 25,
    aciklama: "Görev alıyor, bildiğini paylaşıyor ve üretimi büyütüyorsun.",
  },
  {
    kod: "UFUK_ACAN",
    ad: "Ufuk Açan",
    esik: 40,
    aciklama: "Başkalarına yol gösteriyor, etkinlik ve ekip kuruyorsun.",
  },
  {
    kod: "IZ_BIRAKAN",
    ad: "İz Bırakan",
    esik: 60,
    aciklama: "Ekosistemin öncülerindensin; ardında kalıcı iş bırakıyorsun.",
  },
];

export interface YolculukDurumu {
  toplamPuan: number;
  /** Puanın hangi kaynaklardan geldiği — yalnızca sıfırdan büyük satırlar. */
  dokum: PuanSatiri[];
  seviye: SeviyeTanimi;
  /** Bir sonraki seviye; en üstteyse null. */
  sonraki: SeviyeTanimi | null;
  /** Sonraki seviyeye kalan puan; en üstteyse 0. */
  kalanPuan: number;
  /**
   * Mevcut seviyenin İÇİNDEKİ ilerleme yüzdesi (0–100).
   *
   * İki eşik ARASINDAKİ mesafeye göre hesaplanıyor, toplam puana göre değil:
   * "60 puanın 42'sindesin" demek üst seviyelerde çubuğu neredeyse hiç
   * kıpırdatmazdı. En üst seviyede çubuk dolu.
   */
  yuzde: number;
}

/** Sayıları puan dökümüne çevirir; sıfır adetli satırlar elenir. */
export function puanDokumu(girdi: YolculukGirdisi): PuanSatiri[] {
  const adetler: Record<string, number> = {
    // Kayıt puanı herkeste bir kez: kişi zaten sistemin içinde.
    KAYIT: 1,
    KATILIM: girdi.katilimSayisi,
    URUN: girdi.urunSayisi,
    DENEYIM: girdi.deneyimSayisi,
    CALISMA_GRUBU: girdi.calismaGrubuSayisi,
    AKRAN_EGITIMI: girdi.akranEgitimiSayisi,
    ETKINLIK_DUZENLEME: girdi.duzenlenenEtkinlikSayisi,
    GOREV: girdi.gorevSayisi,
    MENTORLUK: girdi.mentorMu ? 1 : 0,
    DANISMANLIK: girdi.aktifDanismanlikSayisi,
  };

  return PUAN_KAYNAKLARI.map((kaynak) => {
    const adet = adetler[kaynak.kod] ?? 0;
    return {
      kod: kaynak.kod,
      etiket: kaynak.etiket,
      adet,
      puan: kaynak.puan,
      toplam: adet * kaynak.puan,
    };
  }).filter((satir) => satir.adet > 0);
}

/** Toplam puana karşılık gelen seviye — ulaşılan en yüksek eşik. */
export function seviyeBul(puan: number): SeviyeTanimi {
  let sonuc = YOLCULUK_SEVIYELERI[0];
  for (const seviye of YOLCULUK_SEVIYELERI) {
    if (puan >= seviye.esik) sonuc = seviye;
  }
  return sonuc;
}

export function yolculukDurumu(girdi: YolculukGirdisi): YolculukDurumu {
  const dokum = puanDokumu(girdi);
  const toplamPuan = dokum.reduce((toplam, satir) => toplam + satir.toplam, 0);

  const seviye = seviyeBul(toplamPuan);
  const sira = YOLCULUK_SEVIYELERI.findIndex((s) => s.kod === seviye.kod);
  const sonraki = YOLCULUK_SEVIYELERI[sira + 1] ?? null;

  const kalanPuan = sonraki ? Math.max(0, sonraki.esik - toplamPuan) : 0;
  const yuzde = sonraki
    ? Math.min(
        100,
        Math.round(
          ((toplamPuan - seviye.esik) / (sonraki.esik - seviye.esik)) * 100,
        ),
      )
    : 100;

  return { toplamPuan, dokum, seviye, sonraki, kalanPuan, yuzde };
}
