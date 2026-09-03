import { istemciIpAdresi } from "./guvenlik/istemci-ip";

/**
 * Anahtar başına sabit pencereli hız sınırı (27 Ağustos 2026 · güvenlik
 * incelemesi).
 *
 * ---------------------------------------------------------------------------
 * NİYE VAR
 * ---------------------------------------------------------------------------
 * Kimlik doğrulanmadan ulaşılan dört kapı var: dış kullanıcı başvurusu, dış
 * kullanıcı girişi, parola sıfırlama ve istemci hata bildirimi.
 *
 * Sıfırlamanın kendi beklemesi var (dis-kimlik/kurallar.ts ·
 * SIFIRLAMA_BEKLEME_DAKIKA). Başvuru ve hata bildirimi ya sınırsızdı ya da
 * SÜREÇ BAŞINA TEK sayaçla korunuyordu; süreç başına tek sayaç, bir isteği çok
 * yapanın herkesin payını yemesi demek — hata bildirim ucunda saldırgan
 * dakikada 60 boş kayıt gönderip GERÇEK hata kayıtlarının yazılmasını
 * engelleyebiliyordu.
 *
 * GİRİŞ SONRADAN EKLENDİ (3 Eylül 2026): oradaki hesap başına kilit şifre
 * püskürtmesini görmüyor, gerekçesi app/dis-giris/eylemler.ts'te.
 *
 * ---------------------------------------------------------------------------
 * İKİ UYGULAMA: ORTAK (veritabanı) ve SÜREÇ İÇİ (bellek)
 * ---------------------------------------------------------------------------
 * `paylasilanHizSiniri` sayacı VERİTABANINDA tutar ve üç kopyanın hepsi aynı
 * satırı sayar; yazılan değer doğrudan etkin değerdir. Kimlik doğrulanmadan
 * ulaşılan üç kapı bunu kullanır.
 *
 * `hizSiniriOlustur` sayacı SÜREÇ BELLEĞİNDE tutar. İki işi kaldı: ortak
 * sayacın veritabanına ulaşamadığı anlarda yedek olmak, ve bilerek süreç
 * başına olan tavanlar (hata bildiriminde dosya büyümesini kesen tavan gibi —
 * orada amaç zaten "bu kopya ne kadar yazsın" sorusudur).
 *
 * NİYE DEĞİŞTİ: sayaçlar yalnızca bellekteydi ve 2 Eylül 2026'da uygulama ÜÇ
 * kopyaya çıktı (genctek 3010, genctek@3020, genctek@3021). Apache aralarında
 * `lbmethod=bybusyness` ile ve `stickysession` OLMADAN dağıtıyor, yani aynı
 * IP'nin istekleri üç ayrı sayaca serpiliyor ve etkin sınır ÜÇ KATI oluyordu.
 * Bir süre sınırlar üçe bölünerek yaşandı; kırılgandı, çünkü kopya sayısı koda
 * gömülüydü ve değiştiği gün sessizce yanlışa düşerdi.
 *
 * "HER İSTEKTE VERİTABANINA YAZMA" İTİRAZI — burada eskiden bu yazıyordu ve o
 * gün için doğruydu. Artık geçerli değil: ortak sayaç yalnızca üç düşük
 * hacimli kapıda kullanılıyor ve üçü de zaten aynı istekte veritabanına
 * gidiyor. Sayfa görüntülemeleri bu yoldan GEÇMEZ.
 *
 * BELLEK SINIRLI: anahtarlar dışarıdan geliyor (IP, e-posta) ve sınırsız
 * büyüyen bir Map'in kendisi bir saldırı yüzeyidir. Tavana varılınca önce
 * süresi dolmuş kayıtlar süpürülür, yetmezse tablo tamamen boşaltılır. Boşaltma
 * o anki sayaçları affeder ama belleği tavanda tutar; sınırsız büyümeye göre
 * daha güvenli bir takas.
 */

export interface HizSiniriAyari {
  /** Pencere uzunluğu (milisaniye). */
  pencereMs: number;
  /** Bir pencerede aynı anahtardan kabul edilecek en fazla istek. */
  sinir: number;
  /** Bellekte tutulacak en fazla anahtar. */
  enFazlaAnahtar?: number;
}

const VARSAYILAN_EN_FAZLA_ANAHTAR = 10_000;

export interface HizSiniri {
  /** İstek sayılır; sınır AŞILDIYSA true döner. */
  takildiMi(anahtar: string): boolean;
  /** Sayacı sıfırlar — yalnızca testler için. */
  sifirla(): void;
}

/**
 * Süreç içi sayaç. Ortak sayacın yedeği ve bilerek süreç başına olan tavanlar
 * için; kopyalar arası sınır isteniyorsa `paylasilanHizSiniri` kullanılmalı.
 */
export function hizSiniriOlustur(ayar: HizSiniriAyari): HizSiniri {
  const enFazlaAnahtar = ayar.enFazlaAnahtar ?? VARSAYILAN_EN_FAZLA_ANAHTAR;
  const pencereler = new Map<string, { baslangic: number; sayi: number }>();

  const supur = (simdi: number) => {
    for (const [anahtar, pencere] of pencereler) {
      if (simdi - pencere.baslangic > ayar.pencereMs) pencereler.delete(anahtar);
    }
    if (pencereler.size > enFazlaAnahtar) pencereler.clear();
  };

  return {
    takildiMi(anahtar: string): boolean {
      const simdi = Date.now();
      const pencere = pencereler.get(anahtar);

      if (!pencere || simdi - pencere.baslangic > ayar.pencereMs) {
        if (pencereler.size >= enFazlaAnahtar) supur(simdi);
        pencereler.set(anahtar, { baslangic: simdi, sayi: 1 });
        return 1 > ayar.sinir;
      }

      pencere.sayi += 1;
      return pencere.sayi > ayar.sinir;
    },
    sifirla() {
      pencereler.clear();
    },
  };
}

export interface PaylasilanHizSiniriAyari extends HizSiniriAyari {
  /**
   * Sayacın adı — "basvuru", "dis-giris", "hata-bildir". Kovalar ayrı sayılır,
   * yoksa bir uçtaki trafik diğerinin kotasını yerdi.
   */
  kova: string;
}

export interface PaylasilanHizSiniri {
  /** İstek sayılır; sınır AŞILDIYSA true döner. */
  takildiMi(anahtar: string): Promise<boolean>;
}

/** Anahtar sütunu VARCHAR(120); daha uzunu sessizce kesilmesin diye burada kırpılır. */
const ANAHTAR_AZAMI = 120;

/**
 * Kopyalar arasında ORTAK sayaç (3 Eylül 2026).
 *
 * SAYIM TEK DEYİMDE VE ATOMİK: `ON CONFLICT DO UPDATE ... RETURNING`. Önce
 * okuyup sonra yazan bir uygulama, üç kopya aynı anda saydığında artışları
 * kaybederdi — sınır tam da yük altında, yani en çok gerektiği anda gevşerdi.
 * Pencere de aynı deyimde sıfırlanıyor: penceresi geçmiş satır ayrı bir
 * temizliği beklemeden ilk istekte yeniden başlar.
 *
 * VERİTABANINA ULAŞILAMAZSA SÜREÇ İÇİ YEDEĞE DÜŞÜLÜR, sınır KALDIRILMAZ.
 * Fail-open (herkesi geçir) korumayı tam da veritabanı sıkıntıdayken kapatırdı;
 * fail-closed (herkesi durdur) ise bir veritabanı arızasını, aksi hâlde
 * çalışabilecek girişlerin de kapanmasına çevirirdi. Yedek sayaç kopya başına
 * olduğu için o anda sınır gevşer (üç katı) — ama vardır.
 *
 * YEDEĞE DÜŞÜŞ GÜNLÜĞE YAZILIR. Sessiz bir `catch` burada tehlikeliydi: deyimde
 * bir hata olsa (tablo yok, sütun adı yanlış) sistem hatasız görünür, yalnızca
 * ortak sayaç hiç çalışmazdı — yani düzeltmenin yayına çıkmadığı FARK EDİLMEZDİ.
 * Günlük kaydı kova başına dakikada bir ile sınırlı: veritabanı arızası
 * sırasında her istek için satır yazmak, arızayı büyütmekten başka işe yaramaz.
 */
/** Yedeğe düşüş günlüğü için: kova başına en son ne zaman yazıldı. */
const SON_UYARI_ARALIGI_MS = 60_000;

export function paylasilanHizSiniri(
  ayar: PaylasilanHizSiniriAyari,
): PaylasilanHizSiniri {
  const yedek = hizSiniriOlustur(ayar);
  let sonUyari = 0;

  const yedegeDus = (sebep: unknown): void => {
    const simdi = Date.now();
    if (simdi - sonUyari < SON_UYARI_ARALIGI_MS) return;
    sonUyari = simdi;
    console.error(
      `[hiz-siniri] "${ayar.kova}" ortak sayacı kullanılamadı, süreç içi yedeğe düşüldü. ` +
        `Sınır bu süre boyunca kopya başına uygulanır. Sebep:`,
      sebep,
    );
  };

  return {
    async takildiMi(anahtar: string): Promise<boolean> {
      const kirpik = anahtar.slice(0, ANAHTAR_AZAMI);
      const simdi = new Date();
      const pencereSiniri = new Date(simdi.getTime() - ayar.pencereMs);

      try {
        const { prisma } = await import("./db");
        const satirlar = await prisma.$queryRaw<{ sayi: number }[]>`
          INSERT INTO hiz_siniri_penceresi (kova, anahtar, pencere_baslangici, sayi)
          VALUES (${ayar.kova}, ${kirpik}, ${simdi}, 1)
          ON CONFLICT (kova, anahtar) DO UPDATE SET
            sayi = CASE
              WHEN hiz_siniri_penceresi.pencere_baslangici <= ${pencereSiniri} THEN 1
              ELSE hiz_siniri_penceresi.sayi + 1
            END,
            pencere_baslangici = CASE
              WHEN hiz_siniri_penceresi.pencere_baslangici <= ${pencereSiniri} THEN ${simdi}
              ELSE hiz_siniri_penceresi.pencere_baslangici
            END
          RETURNING sayi`;

        const sayi = satirlar[0]?.sayi;
        if (sayi === undefined) {
          yedegeDus("sorgu satır döndürmedi");
          return yedek.takildiMi(kirpik);
        }
        return sayi > ayar.sinir;
      } catch (hata) {
        yedegeDus(hata);
        return yedek.takildiMi(kirpik);
      }
    },
  };
}

/**
 * İsteği yapan IP — hız sınırı anahtarı olarak.
 *
 * Çözümleme guvenlik/istemci-ip.ts'te; gerekçesi (zincirin neden SONUNDAN
 * okunduğu) orada yazılı. Burada yalnızca "adres bulunamadı" hâlinin hız
 * sınırına nasıl çevrildiği kararı var.
 *
 * ADRESSİZ İSTEKLERİN HEPSİ TEK KOVAYI PAYLAŞIR ("bilinmeyen"): sınır o
 * durumda daha SIKI uygulanır. Tersi — her adressiz isteğe ayrı kova açmak —
 * sınırı tamamen kaldırırdı, ki atlatmak isteyenin gideceği yer tam olarak
 * orasıdır.
 */
export function basliklardanAnahtar(
  basliklar: Headers,
  guvenilenVekilSayisi: number,
): string {
  return istemciIpAdresi(basliklar, guvenilenVekilSayisi) ?? "bilinmeyen";
}

/** Rota işleyicileri için; sunucu eylemleri `basliklardanAnahtar` kullanır. */
export function istekAnahtari(
  istek: Request,
  guvenilenVekilSayisi: number,
): string {
  return basliklardanAnahtar(istek.headers, guvenilenVekilSayisi);
}
