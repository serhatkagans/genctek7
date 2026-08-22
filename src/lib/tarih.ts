/**
 * Tarih biçimleme ve form girdisi çözümleme.
 *
 * Tarihler sunucunun yerel saat diliminde (VPS'te Europe/Istanbul) yorumlanır:
 * kullanıcı "1 Ağustos" yazdığında bunu kendi saatiyle kastediyor. Başvuru
 * penceresinin bitişi gün SONUNA alınır, aksi halde son gün öğlen kapanırdı.
 */

const TARIH_BICIMI = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const TARIH_SAAT_BICIMI = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function tarihYaz(tarih: Date): string {
  return TARIH_BICIMI.format(tarih);
}

export function tarihSaatYaz(tarih: Date): string {
  return TARIH_SAAT_BICIMI.format(tarih);
}

function parcala(deger: string): [number, number, number] | null {
  const parcalar = deger.split("-").map((parca) => Number.parseInt(parca, 10));
  if (parcalar.length !== 3 || parcalar.some((sayi) => !Number.isFinite(sayi))) {
    return null;
  }
  return parcalar as [number, number, number];
}

/** `<input type="date">` değerini o günün başlangıcına çevirir. */
export function gunBasi(deger: string | null): Date | null {
  if (!deger) return null;
  const parcalar = parcala(deger);
  if (!parcalar) return null;
  const [yil, ay, gun] = parcalar;
  return new Date(yil, ay - 1, gun, 0, 0, 0, 0);
}

/**
 * Bugünün başlangıcı (yerel saatle 00:00).
 *
 * Tarih SORULMAYAN kayıtlar için (22 Ağustos 2026 · ürün formu). `gunBasi` ile
 * aynı biçimi üretiyor — saat taşıyan bir tarih, gün başına alınmış öbür
 * kayıtların yanında sıralamada farklı davranırdı.
 */
export function bugununBasi(): Date {
  const simdi = new Date();
  return new Date(
    simdi.getFullYear(),
    simdi.getMonth(),
    simdi.getDate(),
    0,
    0,
    0,
    0,
  );
}

/** `<input type="date">` değerini o günün sonuna çevirir. */
export function gunSonu(deger: string | null): Date | null {
  if (!deger) return null;
  const parcalar = parcala(deger);
  if (!parcalar) return null;
  const [yil, ay, gun] = parcalar;
  return new Date(yil, ay - 1, gun, 23, 59, 59, 999);
}

/** `<input type="datetime-local">` değerini yerel saatli tarihe çevirir. */
export function yerelTarihSaat(deger: string | null): Date | null {
  if (!deger) return null;
  const tarih = new Date(deger);
  return Number.isNaN(tarih.getTime()) ? null : tarih;
}

/** Date'i `<input type="date">` varsayılanı olarak yazar. */
export function girdiTarihi(tarih: Date): string {
  const iki = (sayi: number) => String(sayi).padStart(2, "0");
  return `${tarih.getFullYear()}-${iki(tarih.getMonth() + 1)}-${iki(tarih.getDate())}`;
}

/**
 * Date'i `<input type="datetime-local">` varsayılanı olarak yazar.
 *
 * toISOString KULLANILMAZ: o UTC'ye çevirir ve düzenleme formu kullanıcıya
 * saatini kaydırılmış gösterirdi.
 */
export function girdiTarihSaati(tarih: Date): string {
  const iki = (sayi: number) => String(sayi).padStart(2, "0");
  return `${girdiTarihi(tarih)}T${iki(tarih.getHours())}:${iki(tarih.getMinutes())}`;
}
