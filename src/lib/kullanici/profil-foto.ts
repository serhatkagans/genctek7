import { AYAR_ANAHTARLARI, ayarListe, ayarSayi } from "../ayar";
import { prisma } from "../db";
import { depolama } from "../depolama";
import { dosyaImzasiUyuyorMu } from "../guvenlik/dosya-imzasi";
import {
  type ProfilFotoSinirlari,
  profilFotoKabulEdilirMi,
} from "./profil-foto-kurallar";

/**
 * Profil fotoğrafının kaydedilmesi ve kaldırılması.
 *
 * Yetki kontrolü BURADA YAPILMAZ; çağıranın işidir (bkz. ogrenci/cv.ts ile aynı
 * ayrım). Bu dosya yalnızca "kural uygunsa depola ve kullanıcıya yaz" adımını
 * tek yerde tutar.
 */

export async function profilFotoSinirlariniGetir(): Promise<ProfilFotoSinirlari> {
  const [izinliTipler, maksBayt] = await Promise.all([
    ayarListe(AYAR_ANAHTARLARI.IZINLI_PROFIL_FOTO_TIPLERI, [
      "image/jpeg",
      "image/png",
      "image/webp",
    ]),
    ayarSayi(AYAR_ANAHTARLARI.PROFIL_FOTO_MAKS_BAYT, 2 * 1024 * 1024),
  ]);
  return { izinliTipler, maksBayt };
}

export interface FotoKayitSonucu {
  olurMu: boolean;
  neden?: string;
}

/**
 * Fotoğrafı depolar ve kullanıcı kaydına yazar.
 *
 * Önceki fotoğrafın dosyası, yenisi yazıldıktan SONRA silinir: sıra ters
 * olsaydı yazma hata verdiğinde kişi hem eski hem yeni fotoğrafından olurdu.
 * Tek kayıt tutulur, sürüm arşivi değil.
 */
export async function profilFotoKaydet(girdi: {
  kullaniciId: number;
  dosya: File;
  sinirlar: ProfilFotoSinirlari;
}): Promise<FotoKayitSonucu> {
  const { dosya } = girdi;

  const karar = profilFotoKabulEdilirMi(
    { mimeTipi: dosya.type, boyutBayt: dosya.size, dosyaAdi: dosya.name },
    girdi.sinirlar,
  );
  if (!karar.olurMu) return karar;

  /*
   * İçerik gerçekten görsel mi? Gerekçe: guvenlik/dosya-imzasi.ts. Fotoğraf
   * indirme rotası `Content-Type`'ı buraya yazılan tipten veriyor ve dosyayı
   * `inline` gönderiyor, yani sahte tipin sonucu doğrudan tarayıcıda görünür.
   * Kontrol önceki fotoğrafa dokunmadan önce yapılır.
   */
  const icerik = Buffer.from(await dosya.arrayBuffer());
  const imza = dosyaImzasiUyuyorMu(icerik, dosya.type);
  if (!imza.olurMu) return { olurMu: false, neden: imza.neden };

  const oncekiAnahtar = await mevcutFotoAnahtari(girdi.kullaniciId);

  const anahtar = await depolama().yaz({
    icerik,
    dosyaAdi: dosya.name,
    mimeTipi: dosya.type,
  });

  await prisma.kullanici.update({
    where: { id: girdi.kullaniciId },
    data: {
      fotoDepolamaYolu: anahtar,
      fotoMimeTipi: dosya.type,
      fotoYuklenmeTarihi: new Date(),
    },
  });

  if (oncekiAnahtar) await depolama().sil(oncekiAnahtar);

  return { olurMu: true };
}

/** Fotoğraf kaydını ve dosyasını kaldırır. Fotoğraf yoksa false döner. */
export async function profilFotoSil(kullaniciId: number): Promise<boolean> {
  const anahtar = await mevcutFotoAnahtari(kullaniciId);
  if (!anahtar) return false;

  // Kayıt önce temizlenir: dosya silinip kayıt kalsaydı ekran servis edilemeyen
  // bir fotoğrafa işaret ederdi. Ters sırada en kötü durumda yetim dosya kalır.
  await prisma.kullanici.update({
    where: { id: kullaniciId },
    data: {
      fotoDepolamaYolu: null,
      fotoMimeTipi: null,
      fotoYuklenmeTarihi: null,
    },
  });
  await depolama().sil(anahtar);
  return true;
}

async function mevcutFotoAnahtari(kullaniciId: number): Promise<string | null> {
  const kayit = await prisma.kullanici.findUnique({
    where: { id: kullaniciId },
    select: { fotoDepolamaYolu: true },
  });
  return kayit?.fotoDepolamaYolu ?? null;
}
