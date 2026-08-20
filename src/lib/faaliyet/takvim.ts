import type { FaaliyetDurumu } from "@/generated/prisma/enums";
import { basvuruPenceresi } from "./kurallar";

/**
 * Faaliyet tarihleri üzerine saf yardımcılar: başvuru şeridi ve geri sayım.
 *
 * Saf tutulur: veritabanına gitmez, şimdiki zamanı parametre alır. Böylece
 * "başvuru bugün mü kapanıyor" kararı birim testle sınanabilir — bu
 * hesapların en sinsi hatası, sunucunun saatine göre kayan gün sınırlarıdır.
 *
 * GEÇMİŞ/BUGÜN/YAKLAŞAN AYIRICILARI KALKTI (20 Ağustos 2026): tek
 * kullanıcıları paneldeki etkinlik takvimi bölümüydü, o da istek üzerine
 * kaldırıldı.
 */

function gunBasi(tarih: Date): Date {
  return new Date(
    tarih.getFullYear(),
    tarih.getMonth(),
    tarih.getDate(),
    0,
    0,
    0,
    0,
  );
}

/**
 * Duyuru şeridine girecek faaliyetler: başvuru penceresi AÇIK olanlar.
 *
 * İptal edilmiş faaliyet şeride girmez — penceresi teknik olarak açık kalmış
 * olabilir ama başvuru alınmıyor ve şerit "şimdi başvurabilirsin" demektir.
 * Sıra, başvurusu önce KAPANACAK olandan başlar: kaçırılma riski en yüksek
 * olan kayıt en önde durmalı.
 */
export function seritteGosterilecekler<
  T extends { basvuruBaslangic: Date; basvuruBitis: Date; durum: FaaliyetDurumu },
>(faaliyetler: readonly T[], simdi: Date): T[] {
  return faaliyetler
    .filter(
      (faaliyet) =>
        faaliyet.durum === "AKTIF" &&
        basvuruPenceresi(faaliyet, simdi) === "ACIK",
    )
    .sort((a, b) => a.basvuruBitis.getTime() - b.basvuruBitis.getTime());
}

/**
 * Başvurunun kapanmasına kalan gün. Bugün kapanıyorsa 0 döner.
 *
 * Gün farkı yine GÜN BAŞLARI üzerinden hesaplanır; saat farkı yüzünden
 * "1 gün kaldı" ile "bugün son gün" arasında gidip gelen bir sayaç güven
 * vermez.
 */
export function kalanGun(bitis: Date, simdi: Date): number {
  const GUN = 24 * 60 * 60 * 1000;
  return Math.round((gunBasi(bitis).getTime() - gunBasi(simdi).getTime()) / GUN);
}

export function kalanGunYaz(bitis: Date, simdi: Date): string {
  const kalan = kalanGun(bitis, simdi);
  if (kalan <= 0) return "son gün";
  if (kalan === 1) return "son 1 gün";
  return `${kalan} gün kaldı`;
}

/**
 * ETKİNLİĞİN kendisine kalan süre — "bugün", "yarın", "5 gün kaldı".
 *
 * `kalanGunYaz`DAN AYRI ve öyle kalmalı: o, BAŞVURUNUN kapanmasını sayıyor ve
 * dili ona göre ("son gün", "son 1 gün") — kaçırılırsa geri dönüşü olmayan bir
 * pencereyi anlatıyor. Burada sayılan şey kişinin gideceği gün; "son gün"
 * demek, etkinliğin bittiğini sandırırdı. Aynı işlevi tek fonksiyona toplamak,
 * iki farklı olayı tek cümleyle anlatmaya çalışmak olurdu.
 *
 * Gün farkı yine GÜN BAŞLARI üzerinden (bkz. kalanGun): sabah 09.00'daki
 * etkinlik, aynı günün öğleden sonrasında da "bugün" olarak yazılmalı.
 * Geçmiş tarih gelirse "bugün" döner — çağıran zaten geçmişi sormuyor, ama
 * negatif bir sayacın ekrana düşmesi bu kartın anlamını tümden bozardı.
 */
export function etkinligeKalanYaz(tarih: Date, simdi: Date): string {
  const kalan = kalanGun(tarih, simdi);
  if (kalan <= 0) return "bugün";
  if (kalan === 1) return "yarın";
  return `${kalan} gün kaldı`;
}
