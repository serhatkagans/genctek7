import { prisma } from "../db";

/**
 * Penceresi geçmiş hız sınırı satırlarının temizliği.
 *
 * NİYE GEREKLİ: `hiz_siniri_penceresi` satırları anahtar başına açılır ve
 * anahtar dışarıdan gelir (istemci IP'si). Dağıtık bir kaynaktan gelen trafik,
 * her biri bir kez kullanılıp bırakılan on binlerce satır bırakabilir. Sayaç
 * bunlarsız da DOĞRU çalışır — penceresi geçmiş satır ilk istekte sıfırlanır —
 * ama tablo sınırsız büyürdü.
 *
 * SİLME EŞİĞİ EN UZUN PENCEREDEN GENİŞ TUTULUR. Bugünkü en uzun pencere 10
 * dakika (başvuru ve dış giriş); eşik 1 gün. Aradaki fark bilinçli: iş gecede
 * bir çalışıyor ve eşiği pencereye yapıştırmak, bakım koşusu ile isteğin aynı
 * saniyeye denk geldiği durumda hâlâ sayılan bir satırı silebilirdi. Bir günlük
 * satırın kimseye maliyeti yok.
 */

/** Bu süreden eski pencereler silinir. */
export const HIZ_SINIRI_SAKLAMA_SAAT = 24;

export interface HizSiniriTemizligiSonucu {
  silinen: number;
  sinir: Date;
}

export async function hizSiniriTemizligi(
  simdi: Date = new Date(),
): Promise<HizSiniriTemizligiSonucu> {
  const sinir = new Date(simdi.getTime() - HIZ_SINIRI_SAKLAMA_SAAT * 3_600_000);

  const sonuc = await prisma.hizSiniriPenceresi.deleteMany({
    where: { pencereBaslangici: { lt: sinir } },
  });

  return { silinen: sonuc.count, sinir };
}
