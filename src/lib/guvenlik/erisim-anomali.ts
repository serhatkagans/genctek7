import type { ErisimAnomaliTuru } from "@/generated/prisma/enums";
import { BILDIRIM_KODLARI, projeYoneticilerineBildir } from "../bildirim/gonder";
import { prisma } from "../db";
import {
  anomaliTuruEtiketi,
  GUNLUK_OGRENCI_ERISIM_ESIGI,
  MESAI_BASLANGIC_SAATI,
  MESAI_BITIS_SAATI,
  oncekiIstanbulGunu,
} from "./erisim-anomali-kurallari";

interface HamAnomali {
  kullanici_id: number;
  log_sayisi: bigint;
  benzersiz_hedef_sayisi: bigint;
  ilk_erisim_tarihi: Date;
  son_erisim_tarihi: Date;
}

interface AnomaliAdayi {
  kullaniciId: number;
  tur: ErisimAnomaliTuru;
  logSayisi: number;
  benzersizHedefSayisi: number;
  ilkErisimTarihi: Date;
  sonErisimTarihi: Date;
}

export interface ErisimAnomaliIzlemeSonucu {
  gun: string;
  incelenenAday: number;
  yeniAnomali: number;
  gonderilenUyari: number;
}

function adaylaraCevir(
  tur: ErisimAnomaliTuru,
  satirlar: HamAnomali[],
): AnomaliAdayi[] {
  return satirlar.map((satir) => ({
    kullaniciId: satir.kullanici_id,
    tur,
    logSayisi: Number(satir.log_sayisi),
    benzersizHedefSayisi: Number(satir.benzersiz_hedef_sayisi),
    ilkErisimTarihi: satir.ilk_erisim_tarihi,
    sonErisimTarihi: satir.son_erisim_tarihi,
  }));
}

async function anomaliyiIlkKezKaydet(
  aday: AnomaliAdayi,
  gun: string,
): Promise<boolean> {
  try {
    await prisma.erisimAnomalisi.create({
      data: {
        ...aday,
        gun: new Date(`${gun}T00:00:00.000Z`),
      },
    });
    return true;
  } catch (hata) {
    // Zamanlayıcı elle veya Persistent=true telafisiyle yeniden çalışabilir.
    // Aynı kullanıcı/tür/gün benzersizlik ihlali olağan bir "zaten işlendi"dir.
    if (
      typeof hata === "object" &&
      hata !== null &&
      "code" in hata &&
      (hata as { code?: unknown }).code === "P2002"
    ) {
      return false;
    }
    throw hata;
  }
}

/**
 * Tamamlanmış önceki günün erişim günlüklerini tarar ve yeni bulguları
 * proje yöneticilerine bildirir.
 */
export async function erisimAnomalileriniIzle(
  simdi: Date = new Date(),
): Promise<ErisimAnomaliIzlemeSonucu> {
  const pencere = oncekiIstanbulGunu(simdi);

  const [yuksekHacim, mesaiDisi] = await Promise.all([
    prisma.$queryRaw<HamAnomali[]>`
      SELECT
        kullanici_id,
        COUNT(*) AS log_sayisi,
        COUNT(DISTINCT hedef_id) AS benzersiz_hedef_sayisi,
        MIN(tarih) AS ilk_erisim_tarihi,
        MAX(tarih) AS son_erisim_tarihi
      FROM erisim_logu
      WHERE kullanici_id IS NOT NULL
        AND tarih >= ${pencere.baslangic}
        AND tarih < ${pencere.bitis}
        AND islem = 'GORUNTULEME'
        AND hedef_tip = 'OGRENCI'
      GROUP BY kullanici_id
      HAVING COUNT(DISTINCT hedef_id) >= ${GUNLUK_OGRENCI_ERISIM_ESIGI}
    `,
    prisma.$queryRaw<HamAnomali[]>`
      SELECT
        kullanici_id,
        COUNT(*) AS log_sayisi,
        COUNT(DISTINCT hedef_tip::text || ':' || hedef_id) AS benzersiz_hedef_sayisi,
        MIN(tarih) AS ilk_erisim_tarihi,
        MAX(tarih) AS son_erisim_tarihi
      FROM erisim_logu
      WHERE kullanici_id IS NOT NULL
        AND tarih >= ${pencere.baslangic}
        AND tarih < ${pencere.bitis}
        AND detay ILIKE '%dışa aktarıldı%'
        AND (
          EXTRACT(HOUR FROM tarih AT TIME ZONE 'Europe/Istanbul') < ${MESAI_BASLANGIC_SAATI}
          OR EXTRACT(HOUR FROM tarih AT TIME ZONE 'Europe/Istanbul') >= ${MESAI_BITIS_SAATI}
        )
      GROUP BY kullanici_id
    `,
  ]);

  const adaylar = [
    ...adaylaraCevir("YUKSEK_HACIMLI_OGRENCI_ERISIMI", yuksekHacim),
    ...adaylaraCevir("MESAI_DISI_DISA_AKTARIM", mesaiDisi),
  ];
  const yeniler: AnomaliAdayi[] = [];

  for (const aday of adaylar) {
    if (await anomaliyiIlkKezKaydet(aday, pencere.gun)) yeniler.push(aday);
  }

  /*
   * Bildirim kaydı anomaliden ayrıdır: bildirim altyapısı geçici olarak düşerse
   * bulgu kaybolmaz. bildirimTarihi boş kalan kayıt, aynı gün yeniden çalışmada
   * tekrar denenir; bildirim tarafındaki okunmamış-aynı kontrolü kısmi gönderimde
   * alıcıların kopyasını çoğaltmaz.
   */
  const bildirilecekler = await prisma.erisimAnomalisi.findMany({
    where: {
      gun: new Date(`${pencere.gun}T00:00:00.000Z`),
      bildirimTarihi: null,
    },
    include: { kullanici: { select: { ad: true, soyad: true } } },
  });
  let gonderilenUyari = 0;

  for (const anomali of bildirilecekler) {
    const aliciSayisi = await projeYoneticilerineBildir(
      BILDIRIM_KODLARI.ERISIM_ANOMALISI,
      {
        kullaniciAdSoyad: `${anomali.kullanici.ad} ${anomali.kullanici.soyad}`,
        anomaliTuru: anomaliTuruEtiketi(anomali.tur),
        gun: pencere.gun,
        logSayisi: String(anomali.logSayisi),
        benzersizHedefSayisi: String(anomali.benzersizHedefSayisi),
      },
    );
    if (aliciSayisi > 0) {
      await prisma.erisimAnomalisi.update({
        where: { id: anomali.id },
        data: { bildirimTarihi: new Date() },
      });
      gonderilenUyari += 1;
    }
  }

  return {
    gun: pencere.gun,
    incelenenAday: adaylar.length,
    yeniAnomali: yeniler.length,
    gonderilenUyari,
  };
}

/** Denetim ekranında bir bulgunun gösterilecek hâli. */
export interface ErisimAnomaliOzeti {
  id: number;
  /** YYYY-AA-GG — bulgunun ait olduğu tamamlanmış gün. */
  gun: string;
  tur: ErisimAnomaliTuru;
  kullaniciAdSoyad: string;
  logSayisi: number;
  benzersizHedefSayisi: number;
  ilkErisimTarihi: Date;
  sonErisimTarihi: Date;
  /** Boşsa uyarı proje yöneticilerine henüz ulaşmamıştır. */
  bildirimTarihi: Date | null;
}

/**
 * Son bulgular, yeniden eskiye.
 *
 * NİYE VAR: gecelik tarama bulguyu tabloya yazıp bildirim gönderiyordu, ama
 * bildirim okunup geçilen bir şeydir; geriye dönüp "geçen hafta ne çıkmıştı"
 * diye bakılacak bir yer yoktu. Genelge 2/d kayıt tutmayı değil İZLEMEYİ
 * istiyor ve izleme, bulgunun bakılabilir durmasıdır.
 *
 * GÜN ALANI DATE'tir; Prisma onu UTC gece yarısı olarak döndürür. Metne
 * çevirirken yerel saate göre biçimlendirmek günü bir geri kaydırabilirdi,
 * o yüzden doğrudan ISO dizesinden kesiliyor.
 */
export async function sonErisimAnomalileriniGetir(
  enFazla = 20,
): Promise<ErisimAnomaliOzeti[]> {
  const kayitlar = await prisma.erisimAnomalisi.findMany({
    orderBy: [{ gun: "desc" }, { benzersizHedefSayisi: "desc" }],
    take: enFazla,
    include: { kullanici: { select: { ad: true, soyad: true } } },
  });

  return kayitlar.map((kayit) => ({
    id: kayit.id,
    gun: kayit.gun.toISOString().slice(0, 10),
    tur: kayit.tur,
    kullaniciAdSoyad: `${kayit.kullanici.ad} ${kayit.kullanici.soyad}`,
    logSayisi: kayit.logSayisi,
    benzersizHedefSayisi: kayit.benzersizHedefSayisi,
    ilkErisimTarihi: kayit.ilkErisimTarihi,
    sonErisimTarihi: kayit.sonErisimTarihi,
    bildirimTarihi: kayit.bildirimTarihi,
  }));
}
