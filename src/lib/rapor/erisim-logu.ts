import type { LogHedefTip, LogIslemi } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "../db";

/**
 * Erişim kayıtları sorgusu — KVKK denetim ekranının veri katmanı.
 *
 * Kayıtlar hiçbir zaman güncellenmez veya elle silinmez; yalnızca saklama
 * süresi dolduğunda toplu olarak temizlenir (bkz. scripts/veri-saklama.ts).
 * Bu yüzden burada yalnızca okuma vardır.
 */

export const SAYFA_BOYUTU = 50;

export interface ErisimLoguFiltresi {
  kullaniciId?: number | null;
  islem?: LogIslemi | null;
  hedefTip?: LogHedefTip | null;
  /** Kullanıcı adı/soyadı içinde arama. */
  ara?: string | null;
  baslangic?: Date | null;
  bitis?: Date | null;
  sayfa?: number;
}

export function erisimLoguKosulu(
  filtre: ErisimLoguFiltresi,
): Prisma.ErisimloguWhereInput {
  const kosullar: Prisma.ErisimloguWhereInput[] = [];

  if (filtre.kullaniciId) kosullar.push({ kullaniciId: filtre.kullaniciId });
  if (filtre.islem) kosullar.push({ islem: filtre.islem });
  if (filtre.hedefTip) kosullar.push({ hedefTip: filtre.hedefTip });
  if (filtre.ara) {
    kosullar.push({
      kullanici: {
        OR: [
          { ad: { contains: filtre.ara, mode: "insensitive" } },
          { soyad: { contains: filtre.ara, mode: "insensitive" } },
        ],
      },
    });
  }
  if (filtre.baslangic) kosullar.push({ tarih: { gte: filtre.baslangic } });
  if (filtre.bitis) kosullar.push({ tarih: { lte: filtre.bitis } });

  return kosullar.length > 0 ? { AND: kosullar } : {};
}

export interface ErisimLoguSayfasi {
  kayitlar: {
    id: number;
    tarih: Date;
    islem: LogIslemi;
    hedefTip: LogHedefTip;
    hedefId: string;
    ipAdresi: string | null;
    detay: string | null;
    kullanici: { id: number; ad: string; soyad: string } | null;
  }[];
  toplam: number;
  sayfa: number;
  sonSayfa: number;
}

export async function erisimLoguSayfasiGetir(
  filtre: ErisimLoguFiltresi,
): Promise<ErisimLoguSayfasi> {
  const sayfa = Math.max(filtre.sayfa ?? 1, 1);
  const where = erisimLoguKosulu(filtre);

  const [toplam, kayitlar] = await Promise.all([
    prisma.erisimlogu.count({ where }),
    prisma.erisimlogu.findMany({
      where,
      orderBy: { tarih: "desc" },
      skip: (sayfa - 1) * SAYFA_BOYUTU,
      take: SAYFA_BOYUTU,
      select: {
        id: true,
        tarih: true,
        islem: true,
        hedefTip: true,
        hedefId: true,
        ipAdresi: true,
        detay: true,
        kullanici: { select: { id: true, ad: true, soyad: true } },
      },
    }),
  ]);

  return {
    kayitlar,
    toplam,
    sayfa,
    sonSayfa: Math.max(Math.ceil(toplam / SAYFA_BOYUTU), 1),
  };
}
