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
 * BELLEKTE, SÜREÇ BAŞINA
 * ---------------------------------------------------------------------------
 * Veritabanına yazılmıyor: sınırın amacı kötüye kullanımı pahalı kılmak, muhasebe
 * tutmak değil. Her istekte bir yazma, korumaya çalıştığı yükü kendisi üretirdi.
 * Süreç yeniden başlarsa sayaçlar sıfırlanır; bu kabul edilebilir, çünkü sınır
 * saldırıyı YAVAŞLATMAK için var, kanıt üretmek için değil.
 *
 * TEK SÜREÇ VARSAYIMI: üretimde uygulama tek systemd servisi olarak çalışıyor
 * (bkz. DAGITIM.md). Yatay ölçeklenirse her kopya kendi sayacını tutar ve etkin
 * sınır kopya sayısıyla çarpılır — o gün geldiğinde ortak bir sayaç (Redis ya da
 * veritabanı) gerekir. Bu not o kararın işaretidir.
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
