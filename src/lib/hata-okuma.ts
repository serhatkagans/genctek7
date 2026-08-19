import { createReadStream } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { hataGunlukDizini } from "./hata-kaydi";
import {
  dosyaAdindanAy,
  type GrupSiralamasi,
  type GrupSonucu,
  type HataFiltresi,
  type HataKaydi,
  hataEslesiyorMu,
  hataGrupToplayici,
  hataSatiriCoz,
  sonKayitTamponu,
} from "./hata-kurallar";

/**
 * Hata günlüğünün OKUMA katmanı — ekranın ve `npm run hata:ara` betiğinin
 * ortak kaynağı.
 *
 * İKİ ÇAĞIRAN, TEK ÇÖZÜMLEME. Betik günlüğü kendi içinde ayrıştırıyordu;
 * ekran eklenirken o mantık kopyalansaydı ikisi er geç ayrışırdı — kopyalanan
 * süzgeç çözümlemesinin nasıl ayrıştığı bu depoda iki kez yaşandı
 * (bkz. app/panel/ogrenciler/filtreler.ts dosya başındaki not).
 *
 * ---------------------------------------------------------------------------
 * NEDEN AKIŞ (STREAM) OKUMASI
 * ---------------------------------------------------------------------------
 * Dosya tek ayda 5 MB'ı geçti ve her hatayla büyüyor; kayıt başına yığın izi
 * 10 KB'a kadar çıkıyor. `readFile` ile tamamını belleğe almak, ekranı açan
 * her istekte o boyutu ayırmak demekti. Betik bunu yapabiliyor (tek seferlik
 * ve yöneticinin sunucusunda çalışıyor), bir HTTP isteği yapmamalı.
 *
 * Satırlar tek tek çözülüp toplayıcıya veriliyor; bellekte kalan tek şey
 * özet (bkz. hata-kurallar.ts · hataGrupToplayici, sonKayitTamponu).
 *
 * ---------------------------------------------------------------------------
 * TEK SUNUCU VARSAYIMI
 * ---------------------------------------------------------------------------
 * Günlük, uygulamanın çalıştığı makinenin diskinde duruyor (bkz. hata-kaydi.ts
 * · hataGunlukDizini). Uygulama bugün tek sunucuda çalışıyor; birden çok
 * örneğe çıkılırsa her örnek kendi dosyasını yazar ve bu ekran yalnızca isteği
 * karşılayan örneğin kayıtlarını gösterir. O gün gelirse günlüğün ortak bir
 * yere (veritabanı ya da paylaşılan hacim) taşınması gerekir.
 */

/**
 * Özet görünümünde açılabilecek en fazla grup.
 *
 * Grup başına saklanan şey birkaç yüz bayt (kısaltılmış mesaj ve üç yol), yani
 * sınır bellek için değil, patolojik bir durum için: her isteği farklı bir
 * kimlikle patlatan bir hata, sınırsız sayıda grup üretebilirdi.
 */
export const GRUP_UST_SINIRI = 2000;

/** Ayrıntı görünümünde bellekte tutulan en yeni kayıt sayısı (yığın izleriyle). */
export const KAYIT_UST_SINIRI = 60;

/** Ekranda bir sayfada basılan kayıt/grup sayısı. */
export const SAYFA_BOYUTU = 20;

export interface AyListesi {
  /** Günlükte dosyası bulunan aylar; en yenisi başta. */
  aylar: string[];
  /** Günlük dizini var mı? Yoksa henüz hiç hata kaydedilmemiş demektir. */
  dizinVarMi: boolean;
}

export async function hataAylariniGetir(): Promise<AyListesi> {
  let dosyalar: string[];
  try {
    dosyalar = await readdir(hataGunlukDizini());
  } catch {
    // Dizin yokluğu bir arıza DEĞİL: hiç hata oluşmamış bir kurulumda dizin de
    // oluşmaz (bkz. hata-kaydi.ts · hataKaydet ilk yazmada açıyor).
    return { aylar: [], dizinVarMi: false };
  }

  const aylar = dosyalar
    .map(dosyaAdindanAy)
    .filter((ay): ay is string => ay !== null)
    .sort()
    .reverse();

  return { aylar, dizinVarMi: true };
}

/**
 * Verilen ayların satırlarını sırayla çözer ve her kaydı `isle`'ye verir.
 *
 * Aylar ESKİDEN YENİYE okunur: toplayıcılar "en son görülen" bilgisini bu
 * sıraya göre kuruyor ve halka tamponun elinde en yeniler kalmalı.
 */
async function kayitlariGez(
  aylar: readonly string[],
  isle: (kayit: HataKaydi) => void,
): Promise<void> {
  const dizin = hataGunlukDizini();

  for (const ay of [...aylar].sort()) {
    const akis = createReadStream(join(dizin, `hata-${ay}.jsonl`), {
      encoding: "utf8",
    });

    /*
     * Dosya okunamıyorsa (silinmiş, izin yok) o ay atlanır ve okuma sürer:
     * tek bir bozuk dosya yüzünden ekranın tamamının çökmesi, hata günlüğünü
     * en gerekli olduğu anda kullanılamaz hâle getirirdi.
     */
    try {
      await new Promise<void>((coz, reddet) => {
        akis.on("error", reddet);

        const satirlar = createInterface({ input: akis, crlfDelay: Infinity });
        satirlar.on("line", (satir) => {
          const kayit = hataSatiriCoz(satir);
          if (kayit) isle(kayit);
        });
        satirlar.on("close", () => coz());
        satirlar.on("error", reddet);
      });
    } catch {
      akis.destroy();
    }
  }
}

/** Özet görünümü: kimliğe göre gruplanmış hatalar. */
export async function hataOzetiGetir(girdi: {
  aylar: readonly string[];
  filtre: HataFiltresi;
  siralama?: GrupSiralamasi;
}): Promise<GrupSonucu> {
  const toplayici = hataGrupToplayici(GRUP_UST_SINIRI);

  await kayitlariGez(girdi.aylar, (kayit) => {
    if (hataEslesiyorMu(kayit, girdi.filtre)) toplayici.ekle(kayit);
  });

  return toplayici.sonuc(girdi.siralama ?? "son");
}

export interface KayitSonucu {
  /** En yeni üstte. */
  kayitlar: HataKaydi[];
  /** Süzgece uyan toplam kayıt; `kirpildiMi` ise listeden fazladır. */
  toplam: number;
  kirpildiMi: boolean;
}

/** Ayrıntı görünümü: süzgece uyan en yeni kayıtlar, yığın izleriyle. */
export async function hataKayitlariniGetir(girdi: {
  aylar: readonly string[];
  filtre: HataFiltresi;
}): Promise<KayitSonucu> {
  const tampon = sonKayitTamponu(KAYIT_UST_SINIRI);

  await kayitlariGez(girdi.aylar, (kayit) => {
    if (hataEslesiyorMu(kayit, girdi.filtre)) tampon.ekle(kayit);
  });

  return tampon.sonuc();
}
