import type { BasvuruDurumu, RolKodu } from "@/generated/prisma/enums";
import type { XlsxSutun } from "@/lib/rapor/xlsx";

/**
 * TAMAMLANAN ETKİNLİKLERİN TOPLU RAPOR DÖKÜMÜ (15 Ağustos 2026).
 *
 * Karşılaştırma: Manisa farkları turu. Manisa GençTek ekibinin
 * panelinde "Raporları Excel İndir" düğmesi biten etkinliklerin sonucunu tek
 * dosyada veriyor; bizde etkinliklerin PLANLAMA tarafı (kontenjan, başvuru,
 * seçilen) zaten dışa aktarılıyordu ama SONUÇ tarafı hiç yoktu.
 *
 * ============================================================================
 * BU DOSYA "NE OLDU" SORUSUNU CEVAPLIYOR, "NE PLANLANDI"YI DEĞİL
 * ============================================================================
 * Etkinlik listesi çıktısıyla (panel/etkinlikler/disa-aktar) bilerek
 * örtüşmüyor: orada kontenjan ve başvuru durumu var, burada katılım, üretilen
 * belge, yüklenen görsel ve raporun kendisi. İkisi tek dosyaya konsaydı,
 * başvurusu açık bir etkinliğin "0 fotoğraf" satırı bir eksiklik gibi
 * okunurdu — oysa etkinlik daha yapılmamıştır.
 *
 * ============================================================================
 * "KONUM" SÜTUNU YOK — ÇÜNKÜ ALAN YOK
 * ============================================================================
 * Manisa dosyasında serbest metin bir Konum sütunu var ("Konferans Salonu",
 * "okul yemekhanesi"). Bizim `Faaliyet` modelinde böyle bir alan bulunmuyor;
 * yerin karşılığı okul ve il kayıtlarıdır ve onlar kendi sütunlarında duruyor.
 * Boş bir Konum sütunu açmak, veri eksikmiş izlenimi verirdi. Serbest metin
 * konum isteniyorsa bu bir şema kararıdır, dışa aktarma kararı değil.
 *
 * Buna karşılık Manisa'da OLMAYAN bir sütun eklendi: İl. Onların paneli tek
 * ile bakıyor, bizimki ülke geneline.
 *
 * Bu dosya veritabanına BAKMAZ — sorgu rotada yapılır, kurallar birim
 * testlerle doğrulanır (bkz. kirilim-istatistigi.ts, aynı desen).
 */

/** Rapor girilmemiş etkinlikte özet sütununa yazılan metin. */
export const RAPOR_YOK = "Rapor girilmedi";

/**
 * Katılımcının dökümdeki sayımı hangi sütuna gireceği.
 *
 * ROLDEN OKUNUR, sınıf/branş alanının doluluğundan değil: mezun bir
 * katılımcının da sınıfı boştur ve "öğretmen" sayılırdı.
 */
export type KatilimciTuru = "OGRENCI" | "OGRETMEN" | "DIGER";

export function katilimciTuru(roller: readonly RolKodu[]): KatilimciTuru {
  if (roller.includes("OGRENCI")) return "OGRENCI";
  if (roller.includes("DANISMAN")) return "OGRETMEN";
  return "DIGER";
}

export interface DokumKatilimcisi {
  durum: BasvuruDurumu;
  katilimciId: number;
  /** Katılımcının okulu; mezun ve paydaş temsilcisinde boştur. */
  kurumKodu: number | null;
  tur: KatilimciTuru;
}

export interface DokumFaaliyeti {
  id: number;
  ad: string;
  tarih: Date;
  /** Etkinliği açan kişi — Manisa dosyasındaki "Danışman" sütununun karşılığı. */
  duzenleyenAdSoyad: string;
  programAdi: string | null;
  gruplar: string[];
  ilAdi: string | null;
  ilceAdi: string | null;
  okulAdi: string | null;
  katilimcilar: DokumKatilimcisi[];
  /** Silinmemiş eklerden görsel olanların sayısı. */
  fotografSayisi: number;
  /** Silinmemiş eklerden görsel OLMAYANLARI + üretilmiş katılım/teşekkür belgeleri. */
  belgeSayisi: number;
  raporTarihi: Date | null;
  raporOzeti: string | null;
}

export interface DokumSatiri {
  siraNo: number;
  ad: string;
  /**
   * Biçimlenmiş metin DEĞİL, tarihin kendisi: xlsx yazıcısı bunu gerçek tarih
   * hücresi yapıyor ve dosya ancak öyle tarihe göre sıralanabiliyor
   * (bkz. lib/rapor/xlsx.ts · `hucre`).
   */
  tarih: Date;
  faaliyetAlani: string;
  program: string;
  duzenleyen: string;
  il: string;
  ilce: string;
  okul: string;
  ogrenciSayisi: number;
  ogretmenSayisi: number;
  okulSayisi: number;
  fotografSayisi: number;
  belgeSayisi: number;
  raporTarihi: Date | null;
  raporOzeti: string;
}

/**
 * Sütun genişlikleri Manisa dosyasındaki okuma sırasına göre ayarlandı: ad ve
 * özet geniş, sayılar dar. Genişlik verilmeseydi Excel her sütunu aynı
 * yapardı ve rapor özeti tek satırda kesik görünürdü.
 */
export const DOKUM_SUTUNLARI: readonly XlsxSutun[] = [
  { baslik: "Sıra No", genislik: 8 },
  { baslik: "Etkinlik Adı", genislik: 42 },
  { baslik: "Tarih", genislik: 12 },
  { baslik: "Faaliyet Alanı", genislik: 34 },
  { baslik: "Program", genislik: 28 },
  { baslik: "Danışman", genislik: 22 },
  { baslik: "İl", genislik: 14 },
  { baslik: "İlçe", genislik: 16 },
  { baslik: "Okul", genislik: 34 },
  { baslik: "Öğrenci Sayısı", genislik: 13 },
  { baslik: "Öğretmen Sayısı", genislik: 14 },
  { baslik: "Okul Sayısı", genislik: 11 },
  { baslik: "Fotoğraf Sayısı", genislik: 14 },
  { baslik: "Belge Sayısı", genislik: 12 },
  { baslik: "Rapor Tarihi", genislik: 13 },
  { baslik: "Rapor Özeti", genislik: 70 },
];

/**
 * KATILAN = başvurusu SECILDI olan.
 *
 * Yoklama (`katildiMi`) BURADA KULLANILMIYOR, `kirilim-istatistigi.ts`'ten
 * farklı olarak. Gerekçe: yoklama çoğu etkinlikte hiç alınmıyor ve alınmadığı
 * yerde NULL kalıyor. "Katılan" sütunu yoklamadan beslenseydi, yoklama almayan
 * her etkinlik dosyada 0 katılımcıyla görünür ve bu, etkinliğe kimsenin
 * gelmediği diye okunurdu. Seçilen sayısı en azından "kaç kişiye yer verildi"
 * sorusunu doğru cevaplıyor ve sütun adı da bunu söylüyor.
 */
function secilenler(
  katilimcilar: readonly DokumKatilimcisi[],
): DokumKatilimcisi[] {
  return katilimcilar.filter((katilimci) => katilimci.durum === "SECILDI");
}

/**
 * Tekil kişi sayısı.
 *
 * Aynı kişinin iki başvuru satırı olabilir (geri çekip yeniden başvurma);
 * kimliğe göre tekilleştirilmeseydi bir kişi iki kez sayılırdı.
 */
function tekilKisi(katilimcilar: readonly DokumKatilimcisi[]): number {
  return new Set(katilimcilar.map((katilimci) => katilimci.katilimciId)).size;
}

export function dokumSatiri(
  faaliyet: DokumFaaliyeti,
  siraNo: number,
): DokumSatiri {
  const secilen = secilenler(faaliyet.katilimcilar);

  return {
    siraNo,
    ad: faaliyet.ad,
    tarih: faaliyet.tarih,
    faaliyetAlani: faaliyet.gruplar.join(", "),
    program: faaliyet.programAdi ?? "",
    duzenleyen: faaliyet.duzenleyenAdSoyad,
    il: faaliyet.ilAdi ?? "",
    ilce: faaliyet.ilceAdi ?? "",
    okul: faaliyet.okulAdi ?? "",
    ogrenciSayisi: tekilKisi(
      secilen.filter((katilimci) => katilimci.tur === "OGRENCI"),
    ),
    ogretmenSayisi: tekilKisi(
      secilen.filter((katilimci) => katilimci.tur === "OGRETMEN"),
    ),
    /*
     * OKUL SAYISI = katılımcıların geldiği farklı okul sayısı. Okulu olmayan
     * katılımcı (mezun, paydaş temsilcisi) sayıya girmez — "kaç okuldan
     * öğrenci geldi" sorusuna onların katkısı yok, NULL'lar tek bir okulmuş
     * gibi toplanırsa sayı şişerdi.
     */
    okulSayisi: new Set(
      secilen
        .map((katilimci) => katilimci.kurumKodu)
        .filter((kod): kod is number => kod !== null),
    ).size,
    fotografSayisi: faaliyet.fotografSayisi,
    belgeSayisi: faaliyet.belgeSayisi,
    raporTarihi: faaliyet.raporTarihi,
    /*
     * RAPOR ÖZETİ KISALTILMAZ. Excel uzun hücreyi sarar (biçim `wrapText`);
     * kısaltmak, dosyayı arşiv olarak kullanan kişinin metnin tamamını
     * kaybetmesi olurdu.
     *
     * Rapor yoksa boş hücre değil açık bir metin yazılır: boş hücre "rapor var
     * ama okunamadı" diye de okunabilirdi. Dosyayı açan kişi eksikliği aksiyon
     * listesine alsın diye söyleniyor (Manisa dosyasında da böyle).
     */
    raporOzeti: faaliyet.raporOzeti?.trim() || RAPOR_YOK,
  };
}

/** Satırı, `DOKUM_SUTUNLARI` ile aynı sırada hücrelere çevirir. */
export function dokumHucreleri(satir: DokumSatiri): unknown[] {
  return [
    satir.siraNo,
    satir.ad,
    satir.tarih,
    satir.faaliyetAlani,
    satir.program,
    satir.duzenleyen,
    satir.il,
    satir.ilce,
    satir.okul,
    satir.ogrenciSayisi,
    satir.ogretmenSayisi,
    satir.okulSayisi,
    satir.fotografSayisi,
    satir.belgeSayisi,
    satir.raporTarihi,
    satir.raporOzeti,
  ];
}

/**
 * Etkinlikleri döküm satırlarına çevirir.
 *
 * SIRA NO ÇIKTIDAKİ SIRADIR, etkinliğin kimliği değil: dosyayı açan kişi
 * "kaçıncı satır" diye konuşuyor. Etkinlik kimliği sütunu YOK — dosya
 * kurum dışına da gidiyor ve iç kimlik oraya ait değil.
 */
export function dokumSatirlari(
  faaliyetler: readonly DokumFaaliyeti[],
): DokumSatiri[] {
  return faaliyetler.map((faaliyet, sira) => dokumSatiri(faaliyet, sira + 1));
}
