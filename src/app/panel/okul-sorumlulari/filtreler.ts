import type { Prisma } from "@/generated/prisma/client";

/**
 * Okul sorumlusu listesinin arama koşulu.
 *
 * Ekran ve dışa aktarma AYNI koşulu kullanır (15 Ağustos 2026 · Aşama 2c);
 * kopyalansaydı biri "okul adında ara"yı eklerken diğeri eklemez ve indirilen
 * dosya ekranda görünenden farklı bir küme olurdu.
 *
 * Koşul PROFİL üzerinden yürüyor, kullanıcı üzerinden değil: `yegitekOkulSorumlusu`
 * o tabloda ve kısmi indeks de onu taşıyor. Kullanıcıdan başlansaydı her satır
 * için profil birleştirilir, işaretsizler de taranırdı.
 */
export function okulSorumlusuKosulu(
  aranan: string,
): Prisma.OgretmenProfilWhereInput {
  const metin = aranan.trim();

  return {
    yegitekOkulSorumlusu: true,
    kullanici: {
      aktif: true,
      ...(metin
        ? {
            OR: [
              { ad: { contains: metin, mode: "insensitive" as const } },
              { soyad: { contains: metin, mode: "insensitive" as const } },
              {
                kurum: {
                  ad: { contains: metin, mode: "insensitive" as const },
                },
              },
            ],
          }
        : {}),
    },
  };
}
