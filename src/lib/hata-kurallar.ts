/**
 * Hata günlüğünün SAF kuralları: satır çözümleme, süzme ve gruplama.
 *
 * `hata-kaydi.ts`'ten (yazma) ve `hata-okuma.ts`'ten (dosya okuma) AYRI bir
 * dosyada duruyor, iki ayrı gerekçeyle:
 *
 *   1. `hata-kaydi.ts` her işlenmeyen sunucu hatasında dinamik olarak
 *      yükleniyor (bkz. instrumentation.ts). O dosya, hatanın en kötü anında
 *      yüklenen kod; arama ve gruplama mantığının orada büyümesi gereksiz.
 *   2. `hata-okuma.ts` `node:fs` ve `ortam.ts` üzerinden ortam değişkeni
 *      doğrulamasına bağlı. Buradaki kurallar hiçbirine bakmadığı için birim
 *      testle DATABASE_URL olmadan kapsanabiliyor (aynı gerekçe:
 *      tests/ham-yol-taramasi.test.ts dosya başındaki not).
 */

/** Günlüğe yazılan tek satır. Şeklin sahibi burasıdır; yazan taraf yeniden dışa verir. */
export interface HataKaydi {
  /** Kullanıcıya gösterilen kimlik (Next.js digest). Yoksa `-`. */
  kimlik: string;
  zaman: string;
  yol: string | null;
  yontem: string | null;
  ad: string;
  mesaj: string;
  yiginIzi: string | null;
}

/** Kimliği olmayan kayıtlarda `kimlik` alanının değeri. */
export const KIMLIKSIZ = "-";

export interface HataFiltresi {
  /** Hata kimliği; tam eşleşme aranır. */
  kimlik?: string | null;
  /** Özet listesindeki bir satırın kodu; o hatanın tüm kayıtlarını getirir. */
  grup?: string | null;
  /** Mesaj, hata adı ve istek yolunda geçen metin. */
  ara?: string | null;
}

/**
 * `zaman` alanının OKUNABİLİR BİR TARİH olduğunu doğrular; değilse `null`.
 *
 * TÜR KONTROLÜ YETMİYOR (19 Ağustos 2026 · inceleme bulgusu). Alan önce
 * yalnızca "string mi" diye bakılıyordu ve `"zaman":"abc"` taşıyan bir satır
 * çözümlemeyi geçiyordu. Değer ekranda `tarihSaatYaz(new Date(kayit.zaman))`
 * ile basılıyor; `Intl.DateTimeFormat.format` geçersiz tarihte `RangeError`
 * FIRLATIR, yani tek bozuk satır sayfanın tamamını çökertirdi — bu dosyanın
 * baştan kaçınmak istediği şeyin ta kendisi ("bozuk satır olağandır").
 *
 * DOĞRULAMA ÇÖZÜMLEMEDE, EKRANDA DEĞİL: kayıtları iki taraf okuyor (ekran ve
 * `npm run hata:ara`) ve kontrol basan tarafa bırakılsaydı ikisinden birinde
 * eksik kalırdı. Burada düşen satır her iki çağıran için de düşmüş olur.
 *
 * Sıralama ISO 8601'in sözlük sırasına güveniyor (bkz. hataGrupToplayici);
 * elle yazılmış ama okunabilen bir tarih ("12 Aug 2026") o sırayı bozabilir,
 * ancak sonucu yalnızca ilk/son zamanın kayması olur — hiçbir şey çökmez ve
 * kaydın kendisi görünür kalır, ki elle düzenlenmiş bir günlükte istenen de
 * budur.
 */
function gecerliZaman(deger: unknown): string | null {
  if (typeof deger !== "string") return null;
  return Number.isNaN(Date.parse(deger)) ? null : deger;
}

/**
 * Bir günlük satırını çözer; bozuk satırda `null` döner.
 *
 * BOZUK SATIR OLAĞANDIR: dosyaya ekleme yapılırken sunucu kapanırsa son satır
 * yarım kalır. Böyle bir satır yüzünden ekranın tamamının çökmesi, hata
 * günlüğünü tam da en gerekli olduğu anda kullanılamaz hâle getirirdi.
 *
 * ALANLAR DOĞRULANIR, güvenilir kabul edilmez: dosya elle düzenlenmiş ya da
 * eski bir sürümle yazılmış olabilir. Zorunlu alanı eksik satır da bozuk
 * sayılır - yarım bir kayıt, ekranda "undefined" olarak görünmektense hiç
 * görünmemeli. Aynı gerekçeyle `zaman` yalnızca metin olmakla kalmaz,
 * okunabilir bir tarih de olmak zorundadır (bkz. gecerliZaman).
 */
export function hataSatiriCoz(satir: string): HataKaydi | null {
  const kirpilmis = satir.trim();
  if (!kirpilmis) return null;

  let ham: unknown;
  try {
    ham = JSON.parse(kirpilmis);
  } catch {
    return null;
  }

  if (typeof ham !== "object" || ham === null) return null;
  const nesne = ham as Record<string, unknown>;

  const zaman = gecerliZaman(nesne.zaman);
  const ad = typeof nesne.ad === "string" ? nesne.ad : null;
  if (!zaman || !ad) return null;

  return {
    kimlik: typeof nesne.kimlik === "string" ? nesne.kimlik : KIMLIKSIZ,
    zaman,
    yol: typeof nesne.yol === "string" ? nesne.yol : null,
    yontem: typeof nesne.yontem === "string" ? nesne.yontem : null,
    ad,
    mesaj: typeof nesne.mesaj === "string" ? nesne.mesaj : "",
    yiginIzi: typeof nesne.yiginIzi === "string" ? nesne.yiginIzi : null,
  };
}

/**
 * İstek adresinden SORGU DİZESİNİ atar — günlüğe yalnızca yol yazılır.
 *
 * NİYE VAR (19 Ağustos 2026 · inceleme bulgusu). `hata-kaydi.ts` dosya başında
 * "sorgu parametrelerinin değerleri YAZILMAZ" diye söz veriyordu ama kayda
 * geçen alan Next.js'in `onRequestError` kancasından gelen `path` ve o alan
 * ham istek adresi: `base-server.js` içinde `path: req.url || ''` olarak
 * dolduruluyor, yani sorgu dizesi dahil. Günlükte bunun izi vardı
 * (`/panel/etkinlikler/19/rapor?durum=guncellendi&_rsc=...`).
 *
 * SÖZ BOŞ DEĞİLDİ, KUSUR SESSİZDİ: paneldeki on üç ekran arama metnini GET ile
 * taşıyor (`?ara=`). `/panel/ogrenciler?ara=<öğrenci adı>` sayfasında oluşacak
 * ilk hata, o adı günlüğe yazardı — üstelik hata günlüğü, erişim kayıtlarını
 * temizleyen KVKK bakımının (scripts/veri-saklama.ts) kapsamı dışında, yani
 * oraya düşen bir isim kalıcı olurdu.
 *
 * DEĞER MASKELENMİYOR, SORGUNUN TAMAMI ATILIYOR: hangi anahtarın zararsız
 * olduğunu bilen bir izin listesi, her yeni süzgeç alanında güncellenmesi
 * gereken ikinci bir yer demekti ve unutulduğu ilk yerde sessizce sızdırırdı.
 * Ayıklama sırasında sorgunun bir değeri de yok; aranan şey hangi EKRANIN
 * bozulduğu, o da yolda duruyor.
 *
 * Çapa (`#`) tarayıcıda kalır ve sunucuya hiç gelmez; yine de kırpılıyor,
 * çünkü bu işlev günlüğün tek kapısı ve buraya elle bir adres de geçebilir.
 */
export function sorgusuzYol(yol: string | null | undefined): string | null {
  if (!yol) return null;
  const sade = yol.split(/[?#]/, 1)[0];
  return sade || null;
}

/** Türkçe duyarlı küçültme; aramanın iki tarafı da aynı kuraldan geçsin diye tek yerde. */
function kucult(deger: string): string {
  return deger.toLocaleLowerCase("tr");
}

/**
 * Çok satırlı mesajı tek satıra indirir ve kısaltır.
 *
 * Prisma doğrulama hataları 40 satırlık sorgu dökümüyle geliyor; özet
 * tablosunda o mesaj satırı ekranı taşırırdı. Tam metin ayrıntı görünümünde
 * duruyor, burada yalnızca tanınacak kadarı gerekli.
 */
export function kisaMesaj(mesaj: string, uzunluk = 160): string {
  const tekSatir = mesaj.replace(/\s+/g, " ").trim();
  if (tekSatir.length <= uzunluk) return tekSatir;
  return `${tekSatir.slice(0, uzunluk - 1)}…`;
}

/**
 * Mesajın ilk ANLAMLI satırı - hatanın kimliği budur.
 *
 * Prisma hataları mesaja BOŞ bir satırla başlıyor; ilk satır körü körüne
 * alınsaydı bütün Prisma hataları tek bir boş başlık altında toplanırdı.
 * Gerçek günlükte bu tam olarak yaşandı: 302 + 204 kayıt, sorgusu bambaşka
 * olduğu hâlde iki satıra iniyordu.
 */
export function ilkAnlamliSatir(mesaj: string, uzunluk = 200): string {
  const satir = mesaj
    .split("\n")
    .map((parca) => parca.trim())
    .find((parca) => parca.length > 0);
  return satir ? kisaMesaj(satir, uzunluk) : "";
}

/**
 * Bir kaydın hangi HATAYA ait olduğunun okunabilir kimliği.
 *
 * KİMLİĞE (digest) GÖRE GRUPLANMIYOR - ilk tasarım buydu ve gerçek günlük onu
 * yanlışladı: 1.481 kayıtta 345 farklı digest vardı ama bunların 794'ü tek ve
 * aynı hataydı ("Functions cannot be passed directly to Client Components").
 * Next.js digest'i her olayda yeniden üretiyor, yani digest bir hata TÜRÜNÜN
 * değil bir OLAYIN kimliği. Digest'e göre gruplanan bir özet, aynı mesajı 345
 * satır boyunca tekrar eden ve hiçbir şey özetlemeyen bir liste veriyordu.
 *
 * Anahtar bu yüzden HATA ADI + MESAJIN İLK ANLAMLI SATIRI: aynı veride 50
 * gerçek grup çıkıyor ve her satır ayrı bir arızaya karşılık geliyor.
 *
 * MESAJIN TAMAMI KULLANILMIYOR: gövdede derleme çıktısının dosya yolu ve satır
 * numarası geçiyor (`...__02gb0h2._.js:6239:140`), yani her derlemede değişen
 * bir metin. Tam mesaja bakan bir anahtar, aynı hatayı her dağıtımdan sonra
 * yeni bir hata gibi gösterirdi.
 */
export function hataOzetKimligi(kayit: HataKaydi): string {
  return `${kayit.ad} | ${ilkAnlamliSatir(kayit.mesaj)}`;
}

/**
 * 32 bitlik FNV-1a - grup kodunun adres çubuğuna sığması için.
 *
 * Kriptografik değil ve olması da gerekmiyor: kod hiçbir yerde saklanmıyor,
 * yalnızca "özet listesindeki şu satırın kayıtlarını göster" bağlantısını
 * taşıyor. Bir ayda birkaç düzine grup için çakışma ihtimali yok denecek kadar
 * küçük; gerçekleşse bile sonucu, ayrıntı listesinde iki hatanın yan yana
 * görünmesi olurdu - hiçbir veri bozulmaz.
 */
function fnv1a(metin: string): string {
  let ozet = 0x811c9dc5;
  for (let sira = 0; sira < metin.length; sira += 1) {
    ozet ^= metin.charCodeAt(sira);
    ozet = Math.imul(ozet, 0x01000193) >>> 0;
  }
  return ozet.toString(16).padStart(8, "0");
}

/** Özet kimliğinin adres çubuğuna sığan kısa kodu. */
export function hataGrupKodu(kayit: HataKaydi): string {
  return fnv1a(hataOzetKimligi(kayit));
}

/**
 * Kayıt süzgece uyuyor mu?
 *
 * Kimlik TAM eşleşir, arama metni İÇERİR: kimlik kullanıcının ekrandan
 * okuyup ilettiği bir numaradır ve "içeren" eşleşme, 245917416 arayan kişiye
 * 1245917416'yı da getirirdi. Arama metni ise mesajın ortasından bir parça
 * olacaktır ("Invalid prisma" gibi).
 *
 * YIĞIN İZİ ARAMAYA GİRMEZ: her izde onlarca dosya adı ve satır numarası var;
 * "profil" araması, mesajıyla hiç ilgisi olmayan her kaydı getirirdi. Aranan
 * şey çoğunlukla mesaj ya da adres.
 */
export function hataEslesiyorMu(
  kayit: HataKaydi,
  filtre: HataFiltresi,
): boolean {
  const kimlik = filtre.kimlik?.trim();
  if (kimlik && kayit.kimlik !== kimlik) return false;

  const grup = filtre.grup?.trim();
  if (grup && hataGrupKodu(kayit) !== grup) return false;

  const ara = filtre.ara?.trim();
  if (ara) {
    const aranan = kucult(ara);
    const havuz = kucult(`${kayit.ad} ${kayit.mesaj} ${kayit.yol ?? ""}`);
    if (!havuz.includes(aranan)) return false;
  }

  return true;
}

export interface HataGrubu {
  /** Adres çubuğunda taşınan kısa kod (`?grup=`). */
  kod: string;
  /** Hata sınıfı: `TypeError`, `PrismaClientValidationError` ... */
  ad: string;
  /** Mesajın ilk anlamlı satırı; hatayı tanıtan cümle. */
  baslik: string;
  /*
   * KİMLİK ALANI YOK ve olmamalı: aynı hata her oluşunda yeni bir digest
   * alıyor (bkz. hataOzetKimligi). Satırda tek bir kimlik gösterilseydi,
   * kullanıcının bildirdiği numarayla eşleşmediğinde ekran yanlış bilgi vermiş
   * olurdu. Kimlikten gruba geçiş, ayrıntı ekranındaki bağlantıyla yapılıyor.
   */
  /** Grupta görülen farklı istek yolları (en fazla `YOL_UST_SINIRI` tanesi). */
  yollar: string[];
  /** Farklı yol sayısı; `yollar` kırpılmışsa bundan anlaşılır. */
  yolSayisi: number;
  adet: number;
  ilkZaman: string;
  sonZaman: string;
}

/** Bir grupta saklanan farklı yol sayısı. */
export const YOL_UST_SINIRI = 3;

export interface GrupSonucu {
  gruplar: HataGrubu[];
  /** Süzgece uyan toplam KAYIT sayısı (grup değil). */
  toplamKayit: number;
  /** Grup üst sınırına takılıp listeye alınamayan yeni grup oldu mu? */
  kirpildiMi: boolean;
}

export type GrupSiralamasi = "son" | "adet";

/**
 * Akış hâlinde gruplayıcı.
 *
 * NEDEN AKIŞ: günlük dosyası tek ayda 5 MB'ı geçiyor ve büyümeye devam ediyor.
 * Kayıtların tamamı diziye alınıp sonra gruplansaydı, ekranın açılması her
 * seferinde dosyanın tamamını belleğe koyardı. Toplayıcı yalnızca grup
 * özetlerini tutuyor; yığın izleri hiç saklanmıyor.
 *
 * ÜST SINIR grup sayısınadır, kayıt sayısına değil: sınıra ulaşıldığında YENİ
 * grup açılmaz ama mevcut grupların sayımı sürer - yani sınır, en çok görülen
 * hataların sayısını bozmaz.
 */
export function hataGrupToplayici(ustSinir: number) {
  const gruplar = new Map<string, HataGrubu & { yolKumesi: Set<string> }>();
  let toplamKayit = 0;
  let kirpildiMi = false;

  return {
    ekle(kayit: HataKaydi): void {
      toplamKayit += 1;
      const kod = hataGrupKodu(kayit);
      const mevcut = gruplar.get(kod);

      if (!mevcut) {
        if (gruplar.size >= ustSinir) {
          kirpildiMi = true;
          return;
        }
        const yolKumesi = new Set<string>();
        if (kayit.yol) yolKumesi.add(kayit.yol);
        gruplar.set(kod, {
          kod,
          ad: kayit.ad,
          baslik: ilkAnlamliSatir(kayit.mesaj),
          yollar: [],
          yolSayisi: 0,
          adet: 1,
          ilkZaman: kayit.zaman,
          sonZaman: kayit.zaman,
          yolKumesi,
        });
        return;
      }

      mevcut.adet += 1;
      if (kayit.yol) mevcut.yolKumesi.add(kayit.yol);
      /*
       * Zaman karşılaştırması metin üzerinden: kayıtlar ISO 8601 UTC olarak
       * yazılıyor ve bu biçimde sözlük sırası kronolojik sırayla aynı. Date
       * nesnesine çevirmek her satırda bir ayrıştırma demekti.
       *
       * DOSYA SIRASINA GÜVENİLMİYOR: satırlar normalde kronolojik ekleniyor
       * ama iki isteğin aynı anda yazması ya da dosyanın elle düzenlenmiş
       * olması sırayı bozabilir; ilk/son zaman yine de doğru kalmalı.
       */
      if (kayit.zaman < mevcut.ilkZaman) mevcut.ilkZaman = kayit.zaman;
      if (kayit.zaman > mevcut.sonZaman) mevcut.sonZaman = kayit.zaman;
    },

    sonuc(siralama: GrupSiralamasi = "son"): GrupSonucu {
      const liste = [...gruplar.values()].map(({ yolKumesi, ...grup }) => ({
        ...grup,
        yollar: [...yolKumesi].slice(0, YOL_UST_SINIRI),
        yolSayisi: yolKumesi.size,
      }));

      liste.sort((a, b) =>
        siralama === "adet"
          ? b.adet - a.adet || b.sonZaman.localeCompare(a.sonZaman)
          : b.sonZaman.localeCompare(a.sonZaman) || b.adet - a.adet,
      );

      return { gruplar: liste, toplamKayit, kirpildiMi };
    },
  };
}

/**
 * En yeni N kaydı tutan halka tampon.
 *
 * Ayrıntı görünümü yığın izlerini de taşıyor (kayıt başına 10 KB'a kadar);
 * süzgece uyan her kaydı biriktirmek, tek bir hatanın binlerce kez tekrarladığı
 * bir günde ekranı açılamaz hâle getirirdi. Tampon en yeniyi tutar çünkü
 * aranan şey hemen her zaman en son ne olduğudur.
 */
export function sonKayitTamponu(ustSinir: number) {
  const kayitlar: HataKaydi[] = [];
  let toplam = 0;

  return {
    ekle(kayit: HataKaydi): void {
      toplam += 1;
      kayitlar.push(kayit);
      if (kayitlar.length > ustSinir) kayitlar.shift();
    },
    sonuc(): { kayitlar: HataKaydi[]; toplam: number; kirpildiMi: boolean } {
      return {
        // En yeni üstte: dosyada en yeni SONDA duruyor.
        kayitlar: [...kayitlar].reverse(),
        toplam,
        kirpildiMi: toplam > ustSinir,
      };
    },
  };
}

/** Ay süzgecinde "hepsi" anlamına gelen değer. */
export const TUM_AYLAR = "tum";

export interface AySecimi {
  /** Okunacak ay dosyaları. */
  aylar: string[];
  /** Ekranda seçili görünen ay; `null` ise tüm aylar okunuyor. */
  secilen: string | null;
}

/**
 * Hangi ayın dosyasının okunacağı.
 *
 * VARSAYILAN TEK AY, hepsi değil: her ayın dosyası megabaytlarla ölçülüyor ve
 * ekranı açan her istek hepsini baştan sona okusaydı, günlük büyüdükçe ekran
 * yavaşlardı. En yeni ay, "şu an ne bozuk" sorusunun da doğru kapsamı.
 *
 * KİMLİK ARANIYORSA VARSAYILAN TERSİNE DÖNER ve tüm aylar okunur: kullanıcı
 * elindeki numaranın hangi ayda oluştuğunu bilemez. Kimlikle gelen kişi zaten
 * tek bir kayıt arıyor, yani tarama da sonuçsuz kalmıyor.
 *
 * Tanınmayan ay değeri (adres çubuğuna elle yazılmış `2026-13`) süzgeç
 * yokmuş gibi ele alınır: boş dönen bir ekran, kullanıcıya arıza gibi görünür.
 */
export function okunacakAylar(girdi: {
  ay: string | null;
  kimlikAramasiMi: boolean;
  tumAylar: readonly string[];
}): AySecimi {
  const hepsi: AySecimi = { aylar: [...girdi.tumAylar], secilen: null };

  if (girdi.ay === TUM_AYLAR) return hepsi;
  if (girdi.ay && girdi.tumAylar.includes(girdi.ay)) {
    return { aylar: [girdi.ay], secilen: girdi.ay };
  }
  if (girdi.kimlikAramasiMi) return hepsi;

  const enYeni = girdi.tumAylar[0];
  return enYeni
    ? { aylar: [enYeni], secilen: enYeni }
    : { aylar: [], secilen: null };
}

/** `hata-2026-08.jsonl` -> `2026-08`; başka bir ad için `null`. */
export function dosyaAdindanAy(dosyaAdi: string): string | null {
  const eslesme = /^hata-(\d{4}-\d{2})\.jsonl$/.exec(dosyaAdi);
  return eslesme ? eslesme[1] : null;
}

const AY_ADLARI = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

/** `2026-08` -> `Ağustos 2026`. Tanınmayan değer olduğu gibi döner. */
export function ayEtiketi(ay: string): string {
  const eslesme = /^(\d{4})-(\d{2})$/.exec(ay);
  if (!eslesme) return ay;
  const ad = AY_ADLARI[Number.parseInt(eslesme[2], 10) - 1];
  return ad ? `${ad} ${eslesme[1]}` : ay;
}
