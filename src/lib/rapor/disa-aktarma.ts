import { csvBelgesi, csvYaniti } from "@/lib/rapor/csv";
import { xlsxBelgesi, xlsxYaniti, type XlsxSutun } from "@/lib/rapor/xlsx";
import { tarihYaz } from "@/lib/tarih";

/**
 * Dışa aktarmanın ortak yüzeyi — biçim seçimi tek yerde (15 Ağustos 2026).
 *
 * Manisa farkları turu. Panelde bugün altı dışa aktarma rotası
 * var ve hepsi aynı üç satırı tekrarlıyordu:
 * `csvYaniti(ad, csvBelgesi(BASLIKLAR, satirlar))`. Her rota kendi biçim
 * dalını yazsaydı, bir rota `?bicim` parametresini okumayı unuttuğunda bunu
 * kimse fark etmezdi — kullanıcı yalnızca "bu ekranda Excel çıkmıyor" derdi.
 *
 * ---------------------------------------------------------------------------
 * CSV NEDEN KALDI
 * ---------------------------------------------------------------------------
 * Varsayılan artık XLSX ama `?bicim=csv` çalışmaya devam ediyor. Somut sebep:
 * `scripts/disa-aktarma-dogrula.mjs`, indirilen dosyanın SATIR SAYISINI
 * ekrandaki kayıt sayısıyla karşılaştırarak kapsam güvenliğini doğruluyor ve
 * bunu CSV metnini ayrıştırarak yapıyor. Rotalar tek yönlü XLSX'e çevrilseydi
 * o doğrulama kör kalırdı — kapsam sızıntısını yakalayan tek otomatik kontrol
 * bu. Dışarıya veri veren olası entegrasyonlar da kırılmıyor.
 */

export type DisaAktarmaBicimi = "xlsx" | "csv";

/**
 * İstenen biçim.
 *
 * VARSAYILAN XLSX: kullanıcıların istediği bu (bkz. plan · Aşama 2) ve
 * `?bicim` yazmayı bilen taraf betiklerdir, insan değil. Tanınmayan bir değer
 * de XLSX'e düşer — hata vermek, elle adres yazan kişiye boş dosya
 * indirmekten daha iyi bir şey söylemiyor.
 */
export function bicimCoz(adres: URL): DisaAktarmaBicimi {
  return adres.searchParams.get("bicim") === "csv" ? "csv" : "xlsx";
}

/**
 * CSV hücresi için değer sadeleştirme.
 *
 * Tarihler XLSX'te gerçek tarih hücresi olarak yazılıyor (bkz. lib/rapor/xlsx.ts)
 * ama CSV'de tip yok; `String(new Date())` "Sat Aug 15 2026 03:00:00 GMT+0300
 * (GMT+03:00)" verirdi. Çeviri BURADA yapılıyor ki her rota iki biçim için iki
 * ayrı satır dizisi hazırlamak zorunda kalmasın.
 */
function csvDegeri(deger: unknown): unknown {
  if (deger instanceof Date) {
    return Number.isNaN(deger.getTime()) ? "" : tarihYaz(deger);
  }
  return deger;
}

/**
 * Düz başlık listesini sütunlara çevirir.
 *
 * Sütun kümesi ÇALIŞMA ANINDA belirlenen çıktılar için (kırılım istatistiğinde
 * başlıklar seçilen düzeye göre değişiyor). Elle genişlik verilemeyen bu
 * durumda hepsi varsayılan genişlikte kalır — yanlış genişlik, sütunun hiç
 * olmamasından iyidir.
 */
export function basliklardanSutunlar(
  basliklar: readonly string[],
  genislik?: number,
): XlsxSutun[] {
  return basliklar.map((baslik) => ({ baslik, genislik }));
}

export interface DisaAktarmaIstemi {
  bicim: DisaAktarmaBicimi;
  /** Uzantısız ve tarihsiz dosya adı; tarihi biçim katmanı ekler. */
  dosyaAdi: string;
  /** XLSX çalışma kitabının başlığı. CSV'de kullanılmaz. */
  baslik: string;
  /** XLSX'in ikinci satırı: kapsam, süzgeç ve kayıt sayısı. CSV'de kullanılmaz. */
  altBaslik: string;
  sutunlar: readonly XlsxSutun[];
  satirlar: readonly (readonly unknown[])[];
}

/**
 * Tabloyu istenen biçimde indirme yanıtına çevirir.
 *
 * İKİ BİÇİM AYNI SATIRLARI ALIR. Ayrı hazırlansalardı biri sütun eklenip
 * diğeri unutulduğunda CSV ile XLSX farklı veri gösterirdi ve fark, iki dosyayı
 * yan yana açan biri çıkana kadar görünmezdi.
 *
 * BAŞLIK BLOĞU YALNIZCA XLSX'TE: CSV'nin ilk satırı sütun adlarına ayrılmıştır
 * ve üstüne başlık yazmak, dosyayı elektronik tablo dışındaki her okuyucu için
 * bozardı — doğrulama betiği de dahil.
 */
export function disaAktarmaYaniti(istem: DisaAktarmaIstemi): Response {
  const basliklar = istem.sutunlar.map((sutun) => sutun.baslik);

  if (istem.bicim === "csv") {
    return csvYaniti(
      istem.dosyaAdi,
      csvBelgesi(
        basliklar,
        istem.satirlar.map((satir) => satir.map(csvDegeri)),
      ),
    );
  }

  return xlsxYaniti(
    istem.dosyaAdi,
    xlsxBelgesi(istem.baslik, istem.altBaslik, istem.sutunlar, istem.satirlar),
  );
}

/**
 * Dosyanın alt başlığı: ne indirildiği ve kaç kayıt olduğu.
 *
 * KAYIT SAYISI DOSYANIN İÇİNDE YAZILI olsun diye ayrı bir yardımcı var. Dosya
 * e-posta ekiyle dolaşıyor ve açan kişi çoğu zaman onu indiren kişi değil;
 * "bu liste neyin listesi ve tam mı" sorusunun cevabı dosyada durmalı.
 */
export function altBaslikYaz(aciklama: string, kayitSayisi: number): string {
  return `${aciklama} · ${tarihYaz(new Date())} · ${kayitSayisi} kayıt`;
}
