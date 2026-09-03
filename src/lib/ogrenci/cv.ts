import { AYAR_ANAHTARLARI, ayarListe, ayarSayi } from "../ayar";
import { prisma } from "../db";
import { depolama } from "../depolama";
import { dosyaImzasiUyuyorMu } from "../guvenlik/dosya-imzasi";
import {
  type CvSinirlari,
  cvEkNotuKabulEdilirMi,
  cvKabulEdilirMi,
} from "./cv-kurallar";

/**
 * CV'nin kaydedilmesi ve kaldırılması.
 *
 * ÖĞRENCİ VE ÖĞRETMEN AYNI KODU KULLANIR (7 Ağustos 2026): dosya, sınırlar ve
 * depolama aynı; değişen tek şey satırın hangi profil tablosuna yazıldığı.
 * `hedef` parametresi bunu seçer. İki ayrı fonksiyon yazılsaydı sınır
 * değişikliği birinde unutulurdu.
 *
 * ALANLAR İKİ TABLOYA KOPYALANDI, ortak bir CV tablosu açılmadı: ortak tablo
 * iki profil satırının yaşam döngüsünü birbirine bağlardı (öğrenci mezun
 * olduğunda öğrenci profili kapanır, öğretmeninki kapanmaz).
 *
 * Yetki kontrolü BURADA YAPILMAZ; çağıranın işidir (bkz.
 * lib/faaliyet/ek-kaydet.ts ile aynı ayrım).
 */

/** CV'nin hangi profil tablosunda tutulacağı. */
export type CvSahibi = "OGRENCI" | "OGRETMEN";

export async function cvSinirlariniGetir(): Promise<CvSinirlari> {
  const [izinliTipler, maksBayt] = await Promise.all([
    /*
     * YALNIZCA PDF (11 Ağustos 2026 · istek: "özgeçmişimde kabul edilen tek
     * format pdf olsun"). Önceki varsayılan doc ve docx'i de kabul ediyordu.
     *
     * Bu liste yalnızca ayar satırı YOKKEN devreye girer; kurulu
     * veritabanlarındaki satır migration ile güncellendi
     * (20260811150000_cv_yalnizca_pdf).
     */
    ayarListe(AYAR_ANAHTARLARI.IZINLI_CV_TIPLERI, ["application/pdf"]),
    ayarSayi(AYAR_ANAHTARLARI.CV_MAKS_BAYT, 5 * 1024 * 1024),
  ]);
  return { izinliTipler, maksBayt };
}

export interface CvKayitSonucu {
  olurMu: boolean;
  neden?: string;
}

/**
 * CV'yi depolar ve profile yazar. Öğrencinin önceki CV'si varsa dosyası
 * silinir: tek kayıt tutuluyor, sürüm arşivi değil. Silme yeni dosya
 * yazıldıktan SONRA yapılır — sıra ters olsaydı yazma hata verdiğinde öğrenci
 * hem eski hem yeni CV'sinden olurdu.
 */
export async function cvKaydet(girdi: {
  ogrenciId: number;
  dosya: File;
  sinirlar: CvSinirlari;
  sahip?: CvSahibi;
}): Promise<CvKayitSonucu> {
  const { dosya } = girdi;

  const karar = cvKabulEdilirMi(
    { mimeTipi: dosya.type, boyutBayt: dosya.size, dosyaAdi: dosya.name },
    girdi.sinirlar,
  );
  if (!karar.olurMu) return karar;

  /*
   * İçerik gerçekten pdf mi? `dosya.type` istemciden gelir; gerekçenin tamamı
   * guvenlik/dosya-imzasi.ts başlığındadır. Kontrol ÖNCEKİ CV'YE DOKUNMADAN
   * ÖNCE yapılır: reddedilen yükleme kişinin duran CV'sini etkilememeli.
   */
  const icerik = Buffer.from(await dosya.arrayBuffer());
  const imza = dosyaImzasiUyuyorMu(icerik, dosya.type);
  if (!imza.olurMu) return { olurMu: false, neden: imza.neden };

  const sahip = girdi.sahip ?? "OGRENCI";
  const oncekiAnahtar = await mevcutCvAnahtari(girdi.ogrenciId, sahip);

  const anahtar = await depolama().yaz({
    icerik,
    dosyaAdi: dosya.name,
    mimeTipi: dosya.type,
  });

  const cv = {
    cvDosyaAdi: dosya.name.slice(0, 255),
    cvDepolamaYolu: anahtar,
    cvMimeTipi: dosya.type,
    cvBoyutBayt: BigInt(dosya.size),
    cvYuklenmeTarihi: new Date(),
  };

  if (sahip === "OGRENCI") {
    await prisma.ogrenciProfil.upsert({
      where: { kullaniciId: girdi.ogrenciId },
      update: cv,
      create: { kullaniciId: girdi.ogrenciId, ...cv },
    });
  } else {
    await prisma.ogretmenProfil.upsert({
      where: { kullaniciId: girdi.ogrenciId },
      update: cv,
      create: { kullaniciId: girdi.ogrenciId, ...cv },
    });
  }

  if (oncekiAnahtar) await depolama().sil(oncekiAnahtar);

  return { olurMu: true };
}

/**
 * "Eklemek istedikleriniz" metnini profile yazar.
 *
 * DOSYADAN AYRI KAYDEDİLİR: ikisi tek formda olsaydı dosya alanı zorunlu
 * kaldığı için metnini güncellemek isteyen kişi her seferinde PDF'ini yeniden
 * seçmek zorunda kalırdı. Aynı sebeple metni kaydetmek dosyaya, dosyayı
 * kaldırmak metne dokunmuyor.
 *
 * `cvKaydet` ile aynı desende: sahip parametresi hangi profil tablosuna
 * yazılacağını seçiyor, yetki kontrolü çağıranın işi.
 */
export async function cvEkNotuKaydet(girdi: {
  kullaniciId: number;
  metin: string;
  sahip?: CvSahibi;
}): Promise<CvKayitSonucu> {
  const karar = cvEkNotuKabulEdilirMi(girdi.metin);
  if (!karar.olurMu) return { olurMu: false, neden: karar.neden };

  const veri = { cvEkNotu: karar.deger ?? null };
  if ((girdi.sahip ?? "OGRENCI") === "OGRENCI") {
    await prisma.ogrenciProfil.update({
      where: { kullaniciId: girdi.kullaniciId },
      data: veri,
    });
  } else {
    await prisma.ogretmenProfil.update({
      where: { kullaniciId: girdi.kullaniciId },
      data: veri,
    });
  }
  return { olurMu: true };
}

/**
 * CV kaydını ve DOSYASINI kaldırır. CV yoksa sessizce hiçbir şey yapmaz.
 *
 * `cv_ek_notu` BİLEREK BOŞALTILMIYOR: metin dosyanın açıklaması değil, kendi
 * başına bir kayıt — PDF'ini kaldıran kişi yazdıklarını da kaybetmemeli.
 */
export async function cvSil(
  ogrenciId: number,
  sahip: CvSahibi = "OGRENCI",
): Promise<boolean> {
  const anahtar = await mevcutCvAnahtari(ogrenciId, sahip);
  if (!anahtar) return false;

  // Kayıt önce temizlenir: dosya silinip kayıt kalırsa profil indirilemeyen
  // bir CV gösterirdi. Ters sırada en kötü durumda yetim dosya kalır.
  const bosalt = {
    cvDosyaAdi: null,
    cvDepolamaYolu: null,
    cvMimeTipi: null,
    cvBoyutBayt: null,
    cvYuklenmeTarihi: null,
  };
  if (sahip === "OGRENCI") {
    await prisma.ogrenciProfil.update({
      where: { kullaniciId: ogrenciId },
      data: bosalt,
    });
  } else {
    await prisma.ogretmenProfil.update({
      where: { kullaniciId: ogrenciId },
      data: bosalt,
    });
  }
  await depolama().sil(anahtar);
  return true;
}

async function mevcutCvAnahtari(
  ogrenciId: number,
  sahip: CvSahibi,
): Promise<string | null> {
  const profil =
    sahip === "OGRENCI"
      ? await prisma.ogrenciProfil.findUnique({
          where: { kullaniciId: ogrenciId },
          select: { cvDepolamaYolu: true },
        })
      : await prisma.ogretmenProfil.findUnique({
          where: { kullaniciId: ogrenciId },
          select: { cvDepolamaYolu: true },
        });
  return profil?.cvDepolamaYolu ?? null;
}
