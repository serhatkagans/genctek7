/**
 * CSV üretimi.
 *
 * Çıktı Excel'de açılacak: Türkçe karakterlerin bozulmaması için UTF-8 BOM,
 * sütunların ayrılması için de noktalı virgül gerekir — Türkçe yerel ayarda
 * Excel virgülü ondalık ayırıcı sayar ve virgülle ayrılmış dosyayı tek sütuna
 * yığar.
 *
 * Bu dosya veritabanına ve isteğe bakmaz; kurallar birim testlerle doğrulanır.
 */

const AYIRAC = ";";
const SATIR_SONU = "\r\n";
const BOM = "\uFEFF";

/**
 * Elektronik tablo programlarında formül olarak yorumlanan başlangıç
 * karakterleri. "=1+1" gibi bir ada sahip bir kayıt, dosyayı açan kişinin
 * makinesinde hesaplanır; bazı programlarda dış veri çağıran formüller de
 * çalışır. Bu yüzden hücrenin başına tırnak eklenir.
 */
const FORMUL_BASLANGICLARI = ["=", "+", "-", "@", "\t", "\r"];

export function csvHucresi(deger: unknown): string {
  if (deger === null || deger === undefined) return "";

  let metin = String(deger);

  if (FORMUL_BASLANGICLARI.some((karakter) => metin.startsWith(karakter))) {
    metin = `'${metin}`;
  }

  // Ayıraç, tırnak veya satır sonu içeren hücre tırnaklanır; içindeki tırnak
  // ikilenir (RFC 4180).
  if (
    metin.includes(AYIRAC) ||
    metin.includes('"') ||
    metin.includes("\n") ||
    metin.includes("\r")
  ) {
    return `"${metin.replaceAll('"', '""')}"`;
  }

  return metin;
}

export function csvSatiri(hucreler: readonly unknown[]): string {
  return hucreler.map(csvHucresi).join(AYIRAC);
}

export function csvBelgesi(
  basliklar: readonly string[],
  satirlar: readonly (readonly unknown[])[],
): string {
  return (
    BOM +
    [csvSatiri(basliklar), ...satirlar.map(csvSatiri)].join(SATIR_SONU) +
    SATIR_SONU
  );
}

const TURKCE_HARFLER: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u",
};

/**
 * Serbest bir metni dosya adına eklenebilir hâle getirir.
 *
 * Tek bir faaliyetin/kaydın raporu indirilirken adı dosyaya yazılır; yazılmasa
 * üç ayrı faaliyetin listesini indiren kişinin klasöründe birbirinden ayırt
 * edilemeyen üç dosya olurdu. Türkçe harfler sadeleştirilir ve boşluklar
 * tireye çevrilir: dosya adı e-posta eki olarak da dolaşıyor.
 *
 * Metinden geriye bir şey kalmazsa (yalnızca noktalama içeren bir ad) `yedek`
 * kullanılır — adsız bir dosya, adı bozuk bir dosyadan daha kötüdür.
 */
export function csvAdParcasi(metin: string, yedek: string): string {
  const sade = metin
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşü]/g, (harf) => TURKCE_HARFLER[harf] ?? harf)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 40)
    .replace(/-+$/, "");

  return sade || yedek;
}

/**
 * `csvAdParcasi` ile aynı işlev, biçimden bağımsız ad.
 *
 * XLSX yazıcısı da aynı temizliğe ihtiyaç duyuyor (bkz. lib/rapor/xlsx.ts) ama
 * oradan "csv" adıyla bir şey çağırmak yanıltıcı olurdu. İşlev tek yerde
 * duruyor; iki ad aynı gövdeyi gösteriyor.
 */
export const adParcasi = csvAdParcasi;

/**
 * İndirme yanıtı.
 *
 * Dosya adına tarih yazılır: aynı raporun iki farklı gündeki hâli aynı adı
 * taşırsa hangisinin güncel olduğu kaybolur.
 */
export function csvYaniti(dosyaAdi: string, icerik: string): Response {
  const gun = new Date().toISOString().slice(0, 10);
  const tamAd = `${dosyaAdi}-${gun}.csv`;

  return new Response(icerik, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(tamAd)}`,
      // Kapsam kontrolünden geçen içerik ara belleklerde tutulmamalı.
      "Cache-Control": "private, no-store",
    },
  });
}
