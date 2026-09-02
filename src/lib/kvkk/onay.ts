import type { OnayBelgesi } from "@/generated/prisma/enums";
import { prisma } from "../db";
import type { OturumKullanicisi } from "../yetki/tipler";
import {
  BELGE_TANIMLARI,
  type BelgeTanimi,
  kullanicininBelgeleri,
  onayiGerekiyorMu,
} from "./kurallar";

/**
 * Onay belgelerinin veritabanı tarafı.
 *
 * Metin `sistem_ayari` içinde tutulur (koda gömülmez, proje yöneticisi
 * güncelleyebilir); kayıt yoksa koddaki varsayılan kullanılır. Metnin
 * güncelleme tarihi aynı zamanda onayın tazeliğini belirler.
 *
 * Onaylar `kullanici_onayi` tablosunda, belge başına tek satır. Daha önce
 * profil tablolarında iki ayrı sütundu; belge sayısı artınca ve onay YEĞİTEK
 * personelinden de istenir olunca (onun profil satırı hiç açılmıyor) sütun
 * modeli yetmedi.
 */

export interface BelgeDurumu {
  tanim: BelgeTanimi;
  /** Yürürlükteki metin — yönetici düzenlemişse onunki, yoksa varsayılan. */
  metin: string;
  metinGuncellemeTarihi: Date | null;
  onayTarihi: Date | null;
  /** Onay hiç verilmemiş ya da metin onaydan sonra güncellenmiş. */
  gerekiyorMu: boolean;
}

/** Belgelerin yürürlükteki metinleri, ayar anahtarına göre. */
async function metinleriGetir(
  tanimlar: BelgeTanimi[],
): Promise<Map<string, { metin: string; guncellemeTarihi: Date | null }>> {
  const kayitlar = await prisma.sistemAyari.findMany({
    where: { anahtar: { in: tanimlar.map((tanim) => tanim.ayarAnahtari) } },
    select: { anahtar: true, deger: true, guncellemeTarihi: true },
  });

  return new Map(
    tanimlar.map((tanim) => {
      const kayit = kayitlar.find(
        (satir) => satir.anahtar === tanim.ayarAnahtari,
      );
      return [
        tanim.ayarAnahtari,
        {
          // Boş bırakılan ayar "metin yok" demek değil, "varsayılana dön"
          // demek; yönetici metni silerek belgeyi boşaltamaz.
          metin: kayit?.deger?.trim() || tanim.varsayilanMetin,
          guncellemeTarihi: kayit?.guncellemeTarihi ?? null,
        },
      ];
    }),
  );
}

/** Tek bir belgenin yürürlükteki metni. */
export async function belgeMetniGetir(
  tanim: BelgeTanimi,
): Promise<{ metin: string; guncellemeTarihi: Date | null }> {
  const metinler = await metinleriGetir([tanim]);
  return metinler.get(tanim.ayarAnahtari) as {
    metin: string;
    guncellemeTarihi: Date | null;
  };
}

/**
 * Kullanıcıdan istenen belgelerin durumu — ekranların tek veri kaynağı.
 *
 * Kullanıcıdan İSTENMEYEN belge listeye hiç girmez; ekranlar "bu belge bana
 * gerekli mi" sorusunu ayrıca sormaz.
 */
export async function onayDurumlari(
  kullanici: OturumKullanicisi,
): Promise<BelgeDurumu[]> {
  const tanimlar = kullanicininBelgeleri(kullanici);
  if (tanimlar.length === 0) return [];

  const [metinler, onaylar] = await Promise.all([
    metinleriGetir(tanimlar),
    prisma.kullaniciOnayi.findMany({
      where: { kullaniciId: kullanici.id },
      select: { belge: true, onayTarihi: true },
    }),
  ]);

  return tanimlar.map((tanim) => {
    const metin = metinler.get(tanim.ayarAnahtari) as {
      metin: string;
      guncellemeTarihi: Date | null;
    };
    const onayTarihi =
      onaylar.find((onay) => onay.belge === tanim.belge)?.onayTarihi ?? null;

    return {
      tanim,
      metin: metin.metin,
      metinGuncellemeTarihi: metin.guncellemeTarihi,
      onayTarihi,
      gerekiyorMu: onayiGerekiyorMu({
        onayTarihi,
        metinGuncellemeTarihi: metin.guncellemeTarihi,
      }),
    };
  });
}

/**
 * İlk giriş kilidi devrede mi?
 *
 * KİLİT YALNIZCA GERÇEK İLK GİRİŞTE ÇALIŞIR: kullanıcının hiçbir belgeye
 * onayı yoksa panel açılmaz, önce belgeler okutulur. Daha önce sisteme girmiş
 * biri, yeni bir belge eklendiğinde ya da metin güncellendiğinde kilitlenmez —
 * ona şerit gösterilir.
 *
 * Bunun sebebi pratik: metin güncellemesi tüm ilin koordinatörünü aynı anda
 * kapıda bırakabilir ve acil bir işin ortasında sistemin kilitlenmesi
 * korumaktan çok zarar verir. Erişimler zaten kayda geçiyor.
 */
export async function ilkGirisKilidiVarMi(
  kullanici: OturumKullanicisi,
): Promise<boolean> {
  if (kullanicininBelgeleri(kullanici).length === 0) return false;

  const onaySayisi = await prisma.kullaniciOnayi.count({
    where: { kullaniciId: kullanici.id },
  });
  return onaySayisi === 0;
}

/**
 * Belgeleri onaylar. Onay bir DURUMDUR: yeniden onay yeni satır açmaz, tarihi
 * günceller.
 *
 * Kullanıcıdan istenmeyen bir belge kodu gelirse sessizce atılır — form
 * kurcalanarak koordinatör belgesine öğrenci onayı yazılamasın.
 */
export async function belgeleriOnayla(
  kullanici: OturumKullanicisi,
  belgeler: OnayBelgesi[],
): Promise<BelgeTanimi[]> {
  const istenenler = kullanicininBelgeleri(kullanici);
  const yazilacaklar = istenenler.filter((tanim) =>
    belgeler.includes(tanim.belge),
  );
  if (yazilacaklar.length === 0) return [];

  const simdi = new Date();
  await prisma.$transaction(
    yazilacaklar.map((tanim) =>
      prisma.kullaniciOnayi.upsert({
        where: {
          kullaniciId_belge: { kullaniciId: kullanici.id, belge: tanim.belge },
        },
        update: { onayTarihi: simdi },
        create: {
          kullaniciId: kullanici.id,
          belge: tanim.belge,
          onayTarihi: simdi,
        },
      }),
    ),
  );

  return yazilacaklar;
}

/**
 * Belgelerin metin güncelleme tarihleri.
 *
 * Onayın tazeliği bu tarihe göre belirlendiği için, kullanıcı bazında değil
 * TOPLU sorulan yerlerde de (merkez panosu gibi) aynı kaynağa bakılmalı;
 * ayrı bir sorgu yazılsaydı iki yer farklı tarih okuyabilirdi.
 */
export async function belgeGuncellemeTarihleri(): Promise<
  Map<OnayBelgesi, Date | null>
> {
  const metinler = await metinleriGetir(BELGE_TANIMLARI);
  return new Map(
    BELGE_TANIMLARI.map((tanim) => [
      tanim.belge,
      metinler.get(tanim.ayarAnahtari)?.guncellemeTarihi ?? null,
    ]),
  );
}

/** Form gövdesinden gelen belge kodlarını doğrular. */
export function belgeKoduGecerliMi(deger: unknown): deger is OnayBelgesi {
  return BELGE_TANIMLARI.some((tanim) => tanim.belge === deger);
}
