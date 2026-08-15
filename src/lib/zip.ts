import { deflateRawSync } from "node:zlib";

/**
 * Küçük bir ZIP yazıcısı (12 Ağustos 2026).
 *
 * İSTEK: "etkinlik raporu sayfasında etkinliğe dair kaç görsel yüklendiyse
 * onları toplu indirecek bir düğme lazım; sıkıştırıp hepsini indirmek mümkün
 * olur mu."
 *
 * ---------------------------------------------------------------------------
 * NEDEN PAKET DEĞİL DE ELLE
 * ---------------------------------------------------------------------------
 * Projede zip kütüphanesi yok ve bu iş için bir tane eklemek, taşınacak
 * bağımlılık ile yapılan işin oransız olduğu bir durum: burada gereken ZIP'in
 * tamamı değil, "birkaç dosyayı tek arşivde topla"dan ibaret. Yazılan biçim
 * standart PKZIP: Windows Gezgini, macOS Arşiv Yardımcısı ve 7-Zip açar.
 *
 * KAPSAM DIŞI (bilerek): parola, zip64 (4 GB üstü arşiv), akış (streaming).
 * Etkinlik görselleri dosya başına birkaç MB ve sayıları onlarla ifade
 * ediliyor; hepsi belleğe sığar. Bu sınırlar aşılacaksa doğru cevap bu dosyayı
 * büyütmek değil, gerçek bir kütüphane eklemektir.
 *
 * KLASÖR AĞACI 15 Ağustos 2026'da eklendi (`klasorlu` seçeneği): XLSX yazıcısı
 * (lib/rapor/xlsx.ts) `xl/worksheets/sheet1.xml` gibi yollar gerektiriyor.
 * Varsayılan davranış DEĞİŞMEDİ — görsel arşivi hâlâ düz.
 *
 * SIKIŞTIRMA "deflate" AMA ZORUNLU DEĞİL: JPEG ve PNG zaten sıkıştırılmış
 * biçimler, yeniden sıkıştırmak çoğu zaman dosyayı BÜYÜTÜR. Bu yüzden her giriş
 * için ikisi de denenip küçük olan yazılıyor (bkz. `girisiHazirla`).
 */

/** Arşive girecek tek bir dosya. */
export interface ZipGirisi {
  /** Arşiv içindeki ad. Klasör ayracı içermemeli. */
  ad: string;
  icerik: Buffer;
  /** Dosyanın tarihi; verilmezse "şimdi". */
  tarih?: Date;
}

// CRC32 tablosu — ZIP her giriş için bu sağlamayı istiyor.
const CRC_TABLOSU = (() => {
  const tablo = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let deger = i;
    for (let bit = 0; bit < 8; bit += 1) {
      deger = deger & 1 ? 0xedb88320 ^ (deger >>> 1) : deger >>> 1;
    }
    tablo[i] = deger >>> 0;
  }
  return tablo;
})();

export function crc32(veri: Buffer): number {
  let crc = 0xffffffff;
  for (const bayt of veri) {
    crc = CRC_TABLOSU[(crc ^ bayt) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Tarihi DOS biçimine çevirir (ZIP 1980'den beri bu iki 16 bitlik alanı
 * kullanıyor). 1980 öncesi tarihler alt sınıra çekilir: negatif yıl alanı
 * arşivi bozar.
 */
function dosZamani(tarih: Date): { saat: number; gun: number } {
  const yil = Math.max(1980, tarih.getFullYear());
  return {
    saat:
      (tarih.getHours() << 11) |
      (tarih.getMinutes() << 5) |
      (Math.floor(tarih.getSeconds() / 2) & 0x1f),
    gun: ((yil - 1980) << 9) | ((tarih.getMonth() + 1) << 5) | tarih.getDate(),
  };
}

/**
 * Arşiv içindeki adı güvenli hâle getirir.
 *
 * Klasör ayracı ve `..` DÜŞÜRÜLÜR: zip açıcıların bir kısmı arşivdeki yolu
 * olduğu gibi kullanıyor ve "../" içeren bir ad, açan kişinin dizininin
 * dışına dosya yazabilir (zip slip). Ad kullanıcı yüklemesinden geliyor,
 * dolayısıyla güvenilmez.
 */
export function zipAdiTemizle(ad: string): string {
  const temiz = ad
    .replace(/[\\/]/g, "_")
    .replace(/^\.+/, "")
    // Denetim karakterleri ve Windows'ta dosya adında yasak olanlar.
    .replace(/[\u0000-\u001f\u007f:*?"<>|]/g, "")
    .trim();
  return temiz.slice(0, 200) || "dosya";
}

/**
 * Aynı adı taşıyan girişleri ayırır: "kare.png", "kare (2).png"…
 *
 * ZIP aynı adı iki kez taşıyabilir ama açan program birini diğerinin üzerine
 * yazar ve kullanıcı dosyayı sessizce kaybeder.
 */
export function adlariTekillestir(adlar: readonly string[]): string[] {
  const sayac = new Map<string, number>();
  return adlar.map((ham) => {
    const ad = zipAdiTemizle(ham);
    const mevcut = sayac.get(ad.toLocaleLowerCase("tr")) ?? 0;
    sayac.set(ad.toLocaleLowerCase("tr"), mevcut + 1);
    if (mevcut === 0) return ad;

    const nokta = ad.lastIndexOf(".");
    const govde = nokta > 0 ? ad.slice(0, nokta) : ad;
    const uzanti = nokta > 0 ? ad.slice(nokta) : "";
    return `${govde} (${mevcut + 1})${uzanti}`;
  });
}

interface HazirGiris {
  ad: Buffer;
  veri: Buffer;
  yontem: number;
  crc: number;
  hamBoyut: number;
  tarih: Date;
}

function girisiHazirla(giris: ZipGirisi, ad: string): HazirGiris {
  const sikistirilmis = deflateRawSync(giris.icerik);
  /*
   * JPEG/PNG yeniden sıkıştırılınca büyüyebiliyor. Büyüdüyse ham hâli
   * yazılıyor (yöntem 0 = store); arşiv her hâlükârda geçerli kalıyor.
   */
  const kazandiMi = sikistirilmis.length < giris.icerik.length;

  return {
    ad: Buffer.from(ad, "utf8"),
    veri: kazandiMi ? sikistirilmis : giris.icerik,
    yontem: kazandiMi ? 8 : 0,
    crc: crc32(giris.icerik),
    hamBoyut: giris.icerik.length,
    tarih: giris.tarih ?? new Date(),
  };
}

/**
 * Klasörlü bir arşiv yolunu doğrular.
 *
 * `zipAdiTemizle` burada KULLANILAMAZ, çünkü o ayraçları düşürüyor. Onun
 * yerine yol, zip slip'e karşı tek tek denetleniyor: mutlak yol yok, `..`
 * parçası yok, boş parça yok. Yani koruma gevşetilmiyor, aynı garanti
 * ayraçlara izin veren bir biçimde yeniden kuruluyor.
 *
 * Bu yol yalnızca KODDAN GELEN sabitler için düşünülmüştür (bkz. `klasorlu`);
 * yine de doğrulanıyor, çünkü "çağıran dikkatli davranır" bir güvenlik
 * önlemi değildir.
 */
function klasorluYolDogrula(ad: string): string {
  const yol = ad.replaceAll("\\", "/");
  const parcalar = yol.split("/");

  const gecerli =
    yol.length > 0 &&
    !yol.startsWith("/") &&
    parcalar.every((parca) => parca.length > 0 && parca !== "." && parca !== "..");

  if (!gecerli) {
    throw new Error(`Arşiv içinde geçersiz yol: ${ad}`);
  }
  return yol;
}

/**
 * Girişlerden tek bir ZIP arşivi üretir.
 *
 * Bayrak `0x0800` (UTF-8 ad) her girişte açık: dosya adları Türkçe ve bayrak
 * olmadan Windows arşivi kendi kod sayfasıyla okur, "Görsel.png" bozuk çıkar.
 *
 * `klasorlu` seçeneği, adları klasör yolu olarak KORUR ve tekilleştirmez —
 * XLSX gibi belirli adlar bekleyen biçimler için. Varsayılan (kapalı) hâlde
 * davranış eskisiyle aynıdır: adlar düzleştirilir, temizlenir, tekilleştirilir.
 * Ayrım varsayılan olarak GÜVENLİ tarafta duruyor, çünkü asıl çağıran hâlâ
 * kullanıcı yüklemesi adlarını geçiren görsel arşivi.
 */
export function zipOlustur(
  girisler: readonly ZipGirisi[],
  secenekler: { klasorlu?: boolean } = {},
): Buffer {
  const adlar = secenekler.klasorlu
    ? girisler.map((giris) => klasorluYolDogrula(giris.ad))
    : adlariTekillestir(girisler.map((giris) => giris.ad));
  const hazirlar = girisler.map((giris, sira) =>
    girisiHazirla(giris, adlar[sira]),
  );

  const yerelBloklar: Buffer[] = [];
  const merkezBloklar: Buffer[] = [];
  let konum = 0;

  for (const giris of hazirlar) {
    const { saat, gun } = dosZamani(giris.tarih);

    const yerelBaslik = Buffer.alloc(30);
    yerelBaslik.writeUInt32LE(0x04034b50, 0); // imza
    yerelBaslik.writeUInt16LE(20, 4); // gereken sürüm (2.0)
    yerelBaslik.writeUInt16LE(0x0800, 6); // bayrak: ad UTF-8
    yerelBaslik.writeUInt16LE(giris.yontem, 8);
    yerelBaslik.writeUInt16LE(saat, 10);
    yerelBaslik.writeUInt16LE(gun, 12);
    yerelBaslik.writeUInt32LE(giris.crc, 14);
    yerelBaslik.writeUInt32LE(giris.veri.length, 18);
    yerelBaslik.writeUInt32LE(giris.hamBoyut, 22);
    yerelBaslik.writeUInt16LE(giris.ad.length, 26);
    yerelBaslik.writeUInt16LE(0, 28); // ek alan yok

    const merkezBaslik = Buffer.alloc(46);
    merkezBaslik.writeUInt32LE(0x02014b50, 0);
    merkezBaslik.writeUInt16LE(20, 4); // üreten sürüm
    merkezBaslik.writeUInt16LE(20, 6); // gereken sürüm
    merkezBaslik.writeUInt16LE(0x0800, 8);
    merkezBaslik.writeUInt16LE(giris.yontem, 10);
    merkezBaslik.writeUInt16LE(saat, 12);
    merkezBaslik.writeUInt16LE(gun, 14);
    merkezBaslik.writeUInt32LE(giris.crc, 16);
    merkezBaslik.writeUInt32LE(giris.veri.length, 20);
    merkezBaslik.writeUInt32LE(giris.hamBoyut, 24);
    merkezBaslik.writeUInt16LE(giris.ad.length, 28);
    merkezBaslik.writeUInt16LE(0, 30); // ek alan
    merkezBaslik.writeUInt16LE(0, 32); // açıklama
    merkezBaslik.writeUInt16LE(0, 34); // disk numarası
    merkezBaslik.writeUInt16LE(0, 36); // iç öznitelik
    merkezBaslik.writeUInt32LE(0, 38); // dış öznitelik
    merkezBaslik.writeUInt32LE(konum, 42); // yerel başlığın konumu

    yerelBloklar.push(yerelBaslik, giris.ad, giris.veri);
    merkezBloklar.push(merkezBaslik, giris.ad);
    konum += yerelBaslik.length + giris.ad.length + giris.veri.length;
  }

  const merkez = Buffer.concat(merkezBloklar);

  const son = Buffer.alloc(22);
  son.writeUInt32LE(0x06054b50, 0);
  son.writeUInt16LE(0, 4); // bu disk
  son.writeUInt16LE(0, 6); // merkezin başladığı disk
  son.writeUInt16LE(hazirlar.length, 8);
  son.writeUInt16LE(hazirlar.length, 10);
  son.writeUInt32LE(merkez.length, 12);
  son.writeUInt32LE(konum, 16);
  son.writeUInt16LE(0, 20); // arşiv açıklaması yok

  return Buffer.concat([...yerelBloklar, merkez, son]);
}
