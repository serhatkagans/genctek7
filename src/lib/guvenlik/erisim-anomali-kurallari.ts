/** Bir günde erişilen benzersiz öğrenci sayısı bu değere ulaşınca uyarı doğar. */
export const GUNLUK_OGRENCI_ERISIM_ESIGI = 100;

/** İstanbul yerel saatine göre olağan çalışma aralığı: 08:00 (dahil)–18:00. */
export const MESAI_BASLANGIC_SAATI = 8;
export const MESAI_BITIS_SAATI = 18;

export interface GunPenceresi {
  /** Veritabanındaki DATE alanı ve bildirim metni için YYYY-AA-GG. */
  gun: string;
  /** İstanbul'da gün başlangıcının UTC karşılığı. */
  baslangic: Date;
  bitis: Date;
}

/**
 * Tamamlanmış önceki İstanbul gününü UTC sorgu aralığına çevirir.
 *
 * Zamanlanmış iş 03:00'te çalışır; içinde bulunulan gün henüz tamamlanmadığı
 * için önceki gün taranır. Türkiye UTC+3 kullanır. Gün anahtarı ayrı üretilir;
 * DATE sütununa saat kayması taşınmaz.
 */
export function oncekiIstanbulGunu(simdi: Date = new Date()): GunPenceresi {
  const parcalar = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(simdi);
  const sayi = (tur: "year" | "month" | "day") =>
    Number(parcalar.find((parca) => parca.type === tur)?.value);

  const oncekiGunUtcGece = Date.UTC(sayi("year"), sayi("month") - 1, sayi("day") - 1);
  const gun = new Date(oncekiGunUtcGece).toISOString().slice(0, 10);
  const baslangic = new Date(oncekiGunUtcGece - 3 * 60 * 60 * 1000);
  const bitis = new Date(baslangic.getTime() + 24 * 60 * 60 * 1000);

  return { gun, baslangic, bitis };
}

export function anomaliTuruEtiketi(
  tur: "YUKSEK_HACIMLI_OGRENCI_ERISIMI" | "MESAI_DISI_DISA_AKTARIM",
): string {
  return tur === "YUKSEK_HACIMLI_OGRENCI_ERISIMI"
    ? "Yüksek hacimli öğrenci erişimi"
    : "Mesai dışı toplu dışa aktarım";
}
