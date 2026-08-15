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
