import type { KazanimTipi } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { depolama } from "@/lib/depolama";
import { KAPSAM_ETIKETLERI } from "@/lib/faaliyet/kurallar";
import { kazanimlariGetir, ogretmenKazanimlariGetir } from "@/lib/kazanim/getir";
import {
  BILISIM_YOLCULUGU_GRUPLARI,
  KATILIM_BICIMI_ETIKETLERI,
} from "@/lib/kazanim/kurallar";
import { GENCTEK_LOGOSU_VERI_URL } from "@/lib/marka/logo";
import { basHarfler, mentorKapsamiYaz } from "@/lib/mentor/kurallar";
import { referansSatiri } from "@/lib/referans/kurallar";
import { tarihYaz } from "@/lib/tarih";
import { ROL_ETIKETLERI } from "@/lib/yetki/etiketler";
import { YOLCULUK_SEVIYELERI } from "@/lib/yolculuk/kurallar";
import { yolculugumuGetir } from "@/lib/yolculuk/veri";
import { ogrenciMi, referansTutabilirMi } from "@/lib/yetki/izinler";
import type { OturumKullanicisi } from "@/lib/yetki/tipler";
import type {
  OzgecmisBolumu,
  OzgecmisKaydi,
  OzgecmisVerisi,
} from "./kurallar";

/**
 * Özgeçmişin verisini toplar (28 Ağustos 2026 · istek: "profildeki her şeyi cv
 * formatında Word olarak indirebilsin").
 *
 * ---------------------------------------------------------------------------
 * "PROFİLDEKİ HER ŞEY" NE DEMEK
 * ---------------------------------------------------------------------------
 * Paneldeki (yani profildeki — 20 Ağustos 2026'da ikisi birleşti) bölümlerin
 * tamamı ve AYNI SIRAYLA: kimlik, hakkımda, iletişim ve bağlantılar, çalışma
 * grupları, mentörlük, kayıt grupları (Ürünlerim · Deneyimlerim ·
 * Topluluklarım / Ekiplerim), GençTek katılımları, GençTek yolculuğu.
 *
 * BOŞ ALAN DA GİRER (28 Ağustos 2026 · istek: "profildeki tüm alanlar boş
 * girilse de cv de olsun"): değeri olmayan künye satırı "—", kaydı olmayan
 * bölüm "Bilgi girilmemiş." ile basılıyor. Kararın gerekçesi kurallar.ts'te.
 *
 * DIŞARIDA KALAN İKİ ŞEY, ikisi de bilerek:
 *   · KVKK onayları — bir izin kaydıdır, dışarıya verilen bir belgede anlamı
 *     yok,
 *   · YÜKLENEN CV dosyası — özgeçmişin İÇİNE ikinci bir özgeçmiş konmaz; o
 *     dosya zaten ayrıca paylaşılıyor (bkz. lib/ogrenci/cv.ts).
 *
 * NİŞANLARIN YERİNİ GENÇTEK YOLCULUĞU ALDI (31 Ağustos 2026 · istek: "katkı
 * nişanlarım GençTek yolculuğum olacak şekilde değişsin ve bu maddelere göre
 * olsun"). Ölçü artık tek: basamak ve yıldız.
 *
 * ULAŞILMAMIŞ BASAMAK GİRMEZ — kazanılmamış nişanın girmeme kuralı aynen
 * sürüyor: ilerleme çubuğu panelde teşviktir, CV'de "bunu yapamadım" listesi
 * olurdu.
 *
 * ---------------------------------------------------------------------------
 * KİŞİ KENDİ ÖZGEÇMİŞİNİ İNDİRİR
 * ---------------------------------------------------------------------------
 * Bu fonksiyon KAPSAM SORMAZ; hangi kimliğin verisini toplayacağını çağıran
 * söylüyor ve bugün çağıran tek yer oturum sahibinin kendi rotası
 * (panel/ozgecmis/route.ts). Başkasının özgeçmişini üretmek istenirse yetki
 * kararı orada verilmeli — emsali lib/ogrenci/cv.ts ile aynı ayrım.
 */

/**
 * Kaydın başlığının altındaki tek satır.
 *
 * BELGE SAYISI DA BURADA (28 Ağustos 2026 · istek: "Girdiğim kayıtlar · deneme
 * · 28 Ağustos 2026 · 1 belge — ürünlerime kısa detay"): paneldeki kayıt
 * özetinin taşıdığı bilgi, CV'de de aynı satırda. Belge sayısı yazılıyor,
 * dosyaların KENDİSİ gömülmüyor — ekler onlarca megabayt olabiliyor ve Word
 * belgesini kullanılamaz hâle getirirdi (aynı karar faaliyet raporunun
 * görsellerinde de verildi).
 */
function kunyeYaz(kayit: {
  duzenleyen: string | null;
  derece: string | null;
  hedefKitle: string | null;
  gelistirenEkip: string | null;
  katilimBicimi: string | null;
  ekSayisi: number;
}): string | null {
  const parcalar = [
    kayit.duzenleyen,
    kayit.derece,
    kayit.gelistirenEkip,
    kayit.hedefKitle,
    kayit.katilimBicimi,
    kayit.ekSayisi > 0 ? `${kayit.ekSayisi} belge` : null,
  ].filter((parca): parca is string => Boolean(parca && parca.trim()));
  return parcalar.length > 0 ? parcalar.join(" · ") : null;
}

/**
 * Fotoğrafı belgenin içine gömülecek `data:` adresine çevirir.
 *
 * DOSYA OKUNAMAZSA SESSİZCE null: kayıt var ama dosya yoksa (ya da depolama
 * cevap vermiyorsa) özgeçmiş yine üretilmeli — fotoğraf yüzünden indirme
 * başarısız olsaydı, kişi hiç CV alamazdı. Kutuya baş harfleri giriyor.
 */
async function fotografiGom(
  yol: string | null,
  mimeTipi: string | null,
): Promise<{ veriUrl: string } | null> {
  if (!yol || !mimeTipi) return null;
  try {
    const icerik = await depolama().oku(yol);
    return {
      veriUrl: `data:${mimeTipi};base64,${icerik.toString("base64")}`,
    };
  } catch {
    return null;
  }
}

export async function ozgecmisVerisiGetir(
  kullanici: OturumKullanicisi,
  simdi: Date = new Date(),
): Promise<OzgecmisVerisi> {
  const ogrenciDir = ogrenciMi(kullanici);

  /*
   * YOLCULUK AYRI ÇAĞRILIYOR, `Promise.all`a EKLENMİYOR: hesap kendi içinde
   * birkaç sorgu açıyor ve yerel veritabanı eşzamanlı bağlantı tavanına
   * takılıyor — gerekçenin tamamı lib/yolculuk/veri.ts başlığında.
   */
  const yolculuk = await yolculugumuGetir(kullanici, simdi);

  const [kayit, katki] = await Promise.all([
    prisma.kullanici.findUniqueOrThrow({
      where: { id: kullanici.id },
      select: {
        ad: true,
        soyad: true,
        sinif: true,
        brans: true,
        cinsiyet: true,
        egitimOgretimYili: true,
        hakkinda: true,
        fotoDepolamaYolu: true,
        fotoMimeTipi: true,
        kurum: { select: { ad: true } },
        il: { select: { ad: true } },
        ilce: { select: { ad: true } },
        destekGruplari: {
          orderBy: { calismaGrubu: { siraNo: "asc" } },
          select: { calismaGrubu: { select: { ad: true } } },
        },
        ogrenciProfil: {
          select: {
            eposta: true,
            telefon: true,
            githubUrl: true,
            kisiselSiteUrl: true,
            linkedinUrl: true,
            instagramUrl: true,
            // "Eklemek istedikleriniz" metni (31 Ağustos 2026).
            cvEkNotu: true,
          },
        },
        ogretmenProfil: {
          select: {
            eposta: true,
            telefon: true,
            githubUrl: true,
            kisiselSiteUrl: true,
            linkedinUrl: true,
            instagramUrl: true,
            kurumAdi: true,
            gorevUnvani: true,
            cvEkNotu: true,
          },
        },
        mentorluk: {
          select: {
            durum: true,
            konular: true,
            gruplar: { select: { calismaGrubu: { select: { ad: true } } } },
          },
        },
        /*
         * REFERANSLAR (28 Ağustos 2026). Herkeste seçiliyor, kime basılacağına
         * aşağıda karar veriliyor: sorguyu role göre ikiye bölmek, aynı
         * sorgunun iki sürümünü doğururdu. Dış kullanıcıda satır zaten hiç yok
         * (bölüm onun panelinde basılmıyor).
         */
        referanslar: {
          orderBy: { olusturmaTarihi: "asc" },
          select: {
            adSoyad: true,
            kurum: true,
            telefon: true,
            eposta: true,
          },
        },
        kazanimlar: {
          // Tarihi girilmemiş kayıtların sırası belirsiz kalmasın diye ikinci
          // ölçüt (aynı sıralama panelde de kullanılıyor).
          orderBy: [{ tarih: "desc" }, { olusturmaTarihi: "desc" }],
          select: {
            tip: true,
            baslik: true,
            aciklama: true,
            tarih: true,
            derece: true,
            duzenleyen: true,
            hedefKitle: true,
            gelistirenEkip: true,
            katilimBicimi: true,
            baglantiUrl: true,
            baglantilar: {
              orderBy: { siraNo: "asc" },
              select: { adres: true, etiket: true },
            },
            _count: { select: { ekler: true } },
          },
        },
      },
    }),
    /*
     * NİŞANLAR VE KATILIMLAR: öğrenci ile öğretmenin ölçütleri farklı ve iki
     * ayrı fonksiyon var (bkz. lib/kazanim/getir.ts). Buradaki dallanma tek
     * satır; sorguların kendisi orada, tek yerde duruyor.
     */
    ogrenciDir
      ? kazanimlariGetir(kullanici.id, simdi)
      : ogretmenKazanimlariGetir(kullanici.id, simdi),
  ]);

  const profil = ogrenciDir ? kayit.ogrenciProfil : kayit.ogretmenProfil;
  const adSoyad = `${kayit.ad} ${kayit.soyad}`;

  const unvan = [
    kullanici.roller.length === 0
      ? ogrenciDir
        ? "Öğrenci"
        : "Öğretmen"
      : kullanici.roller.map((rol) => ROL_ETIKETLERI[rol.rolKodu]).join(" · "),
    ogrenciDir ? kayit.sinif : kayit.brans,
  ]
    .filter((parca): parca is string => Boolean(parca))
    .join(" · ");

  /*
   * KİMLİK SATIRLARI HER ZAMAN AYNI: değeri olmayan alan "—" ile basılıyor
   * (bkz. kurallar.ts · kunyeTablosu). Satır role göre gizlenmiyor ki iki
   * kişinin CV'si aynı iskeletle çıksın; yalnızca ETİKET role göre değişiyor
   * (öğrencide sınıf, öğretmende branş) — ikisi aynı satırda anlamsız olurdu.
   */
  const kimlik = [
    {
      etiket: "Okul / kurum",
      deger: kayit.kurum?.ad ?? kayit.ogretmenProfil?.kurumAdi ?? "",
    },
    {
      etiket: ogrenciDir ? "Sınıf" : "Branş",
      deger: (ogrenciDir ? kayit.sinif : kayit.brans) ?? "",
    },
    { etiket: "Görev / unvan", deger: kayit.ogretmenProfil?.gorevUnvani ?? "" },
    { etiket: "İl", deger: kayit.il?.ad ?? "" },
    { etiket: "İlçe", deger: kayit.ilce?.ad ?? "" },
    { etiket: "Eğitim-öğretim yılı", deger: kayit.egitimOgretimYili },
  ];

  /*
   * İLETİŞİM VE BAĞLANTILARIN TAMAMI (28 Ağustos 2026 · istek: "E-posta,
   * Telefon, Bağlantılarım … GitHub, Kişisel site, LinkedIn, Instagram bunlar
   * ait hep alanlar olsun"). Altı satırın altısı da her CV'de duruyor; boş
   * olanlar "—" ile. Doldurulmamış olanların atlanması, okuyanın hangi
   * kanalların hiç sorulmadığını bilmemesi demekti.
   */
  const iletisim = [
    { etiket: "E-posta", deger: profil?.eposta ?? "" },
    { etiket: "Telefon", deger: profil?.telefon ?? "" },
    { etiket: "GitHub", deger: profil?.githubUrl ?? "" },
    { etiket: "Kişisel site", deger: profil?.kisiselSiteUrl ?? "" },
    { etiket: "LinkedIn", deger: profil?.linkedinUrl ?? "" },
    { etiket: "Instagram", deger: profil?.instagramUrl ?? "" },
  ];

  const kayitYaz = (satir: (typeof kayit.kazanimlar)[number]): OzgecmisKaydi => ({
    baslik: satir.baslik,
    tarih: satir.tarih ? tarihYaz(satir.tarih) : null,
    kunye: kunyeYaz({
      duzenleyen: satir.duzenleyen,
      derece: satir.derece,
      hedefKitle: satir.hedefKitle,
      gelistirenEkip: satir.gelistirenEkip,
      katilimBicimi: satir.katilimBicimi
        ? KATILIM_BICIMI_ETIKETLERI[satir.katilimBicimi]
        : null,
      ekSayisi: satir._count.ekler,
    }),
    aciklama: satir.aciklama,
    /*
     * `baglantiUrl` ile `baglantilar` BİRLEŞTİRİLİYOR: eski kayıtlar tek
     * adresi o sütunda taşıyor, yenileri etiketli listede. CV'de ikisi de "bu
     * işi nereden görebilirim" sorusunun cevabı; ayrılsalardı eski kayıtların
     * adresi belgeye hiç girmezdi.
     */
    baglantilar: [
      ...(satir.baglantiUrl ? [satir.baglantiUrl] : []),
      ...satir.baglantilar.map((bag) =>
        bag.etiket ? `${bag.etiket}: ${bag.adres}` : bag.adres,
      ),
    ],
  });

  /*
   * BÖLÜMLER PANELDEKİ ÜÇ GRUPTUR (Ürünlerim · Deneyimlerim · Topluluklarım /
   * Ekiplerim), tip tip listelenmiyor: kişi kayıtlarını o üç başlık altında
   * giriyor ve belge, ekranda gördüğü düzeni tekrar etmeli. Grup listesi
   * `BILISIM_YOLCULUGU_GRUPLARI`'ndan geliyor — panelde bir grup eklenirse
   * CV'de de kendiliğinden çıkıyor.
   *
   * GRUP AÇIKLAMALARI BASILMIYOR ("Katıldığın etkinlikler, gösterdiğin
   * başarılar…"): o cümleler kişiye ne gireceğini anlatan ekran metinleri.
   * CV'yi okuyan kişiye söyledikleri bir şey yok ve belgeyi bir form gibi
   * okuturlardı.
   */
  const gruplananTipler = new Set<KazanimTipi>(
    BILISIM_YOLCULUGU_GRUPLARI.flatMap((grup) => [...grup.tipler]),
  );

  const bolumler: OzgecmisBolumu[] = BILISIM_YOLCULUGU_GRUPLARI.filter(
    (grup) =>
      grup.sahipler === undefined ||
      grup.sahipler.includes(ogrenciDir ? "OGRENCI" : "OGRETMEN"),
  ).map((grup) => ({
    baslik: grup.baslik,
    kayitlar: kayit.kazanimlar
      .filter((satir) => grup.tipler.includes(satir.tip))
      .map(kayitYaz),
  }));

  /*
   * HİÇBİR GRUBA DÜŞMEYEN KAYITLAR KAYBOLMUYOR (akran eğitimi, arşivlenmiş
   * "Diğer"): profilde başka bir bölümde ya da hiç görünmüyor olabilirler ama
   * kişinin girdiği veridir ve özgeçmişten düşmeleri, sessizce kaybolmaları
   * olurdu. Bu bölüm — öbürlerinin aksine — BOŞSA HİÇ BASILMAZ: paneldeki
   * karşılığı olan bir başlık değil, artakalanların toplandığı yer.
   */
  const artakalanlar = kayit.kazanimlar.filter(
    (satir) => !gruplananTipler.has(satir.tip),
  );
  if (artakalanlar.length > 0) {
    bolumler.push({
      baslik: "Diğer kayıtlarım",
      kayitlar: artakalanlar.map(kayitYaz),
    });
  }

  return {
    adSoyad,
    unvan,
    foto: await fotografiGom(kayit.fotoDepolamaYolu, kayit.fotoMimeTipi),
    basHarfler: basHarfler(adSoyad),
    /*
     * LOGO HER BELGEDE VAR ve sabittir: dosya sisteminden okunmuyor, derleme
     * zamanında gömülüyor (bkz. lib/marka/logo.ts). Kişinin fotoğrafındaki
     * "okunamazsa null" hâli burada YOK — o dosya kullanıcıdan geliyor ve
     * gerçekten eksik olabilir, bu ise programın kendi işareti.
     */
    logo: { veriUrl: GENCTEK_LOGOSU_VERI_URL },
    kimlik,
    iletisim,
    hakkinda: kayit.hakkinda,
    calismaGruplari: kayit.destekGruplari.map((satir) => satir.calismaGrubu.ad),
    /*
     * YALNIZCA ONAYLI MENTÖRLÜK yazılıyor: bekleyen bir başvuru henüz bir
     * sıfat değil, reddedilmiş olan hiç değil.
     */
    mentorluk:
      kayit.mentorluk?.durum === "ONAYLANDI"
        ? `Onaylı GençTek mentörü — ${mentorKapsamiYaz(
            kayit.mentorluk.gruplar.map((bag) => bag.calismaGrubu.ad),
            kayit.mentorluk.konular,
          )}`
        : null,
    bolumler,
    katilimlar: katki.katilimlar.map((katilim) => ({
      ad: katilim.ad,
      tarih: tarihYaz(katilim.tarih),
      kapsam: KAPSAM_ETIKETLERI[katilim.kapsam],
    })),
    /*
     * REFERANS BÖLÜMÜ ÖĞRETMENDE DE VAR (31 Ağustos 2026 · istek: "Öğretmene
     * de referans ekleme olsun öğrenci gibi"). Koşul artık paneldeki bölümün
     * koşuluyla AYNI fonksiyondan geliyor (referansTutabilirMi) — ikisi ayrı
     * yazılsaydı biri değiştiğinde öbürü geride kalır ve öğretmen panelde
     * doldurduğu kutuyu belgesinde bulamazdı.
     *
     * DIŞ KULLANICIDA (mezun, paydaş temsilcisi) HÂLÂ `null`: başlık hiç
     * basılmıyor — olmayan bir bölümü "Bilgi girilmemiş." ile basmak,
     * doldurulması gereken bir alan sanılırdı.
     *
     * ÜÇÜNCÜ KİŞİNİN İLETİŞİM BİLGİSİ BELGEYE GİRİYOR ve bu, kayıt yalnızca
     * sahibine görünürken bile doğru: özgeçmişi indiren kişi onu bilerek
     * paylaşıyor, referansını da bunun için yazmış (ekrandaki form
     * "referansınıza sorun" diyor).
     */
    referanslar: referansTutabilirMi(kullanici)
      ? kayit.referanslar.map((referans) => ({
          adSoyad: referans.adSoyad,
          kunye: referansSatiri(referans),
        }))
      : null,
    yolculuk: {
      seviyeAdi: yolculuk.seviye.ad,
      /*
       * Basamaklar kişinin bulunduğu yere kadar KESİLİYOR. Kesme ölçüsü
       * `yildiz`: o basamağın sırası (bkz. seviyeYildizi), yani liste tam
       * kişinin geldiği yerde bitiyor. Sayının kendisi BELGEYE YAZILMIYOR —
       * yıldızlar 31 Ağustos'ta belgeden kalktı.
       */
      basamaklar: YOLCULUK_SEVIYELERI.slice(0, yolculuk.yildiz).map(
        (seviye) => ({ ad: seviye.ad, aciklama: seviye.aciklama }),
      ),
    },
    /*
     * KİŞİNİN KENDİ YAZDIĞI SERBEST METİN, olduğu gibi giriyor: kaçırma
     * `paragraf()` içinde yapılıyor (bkz. kurallar.ts) — burada kırpmak,
     * belgeye giren metnin ekranda görülenden farklı olması demek olurdu.
     */
    ekNotu: profil?.cvEkNotu ?? null,
    uretimTarihi: tarihYaz(simdi),
  };
}
