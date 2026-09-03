import { AYAR_ANAHTARLARI, ayarListe, ayarSayi } from "../ayar";
import { prisma } from "../db";
import { depolama } from "../depolama";
import { dosyaImzasiUyuyorMu } from "../guvenlik/dosya-imzasi";
import {
  type EkSinirlari,
  type EkTuru,
  ekKabulEdilirMi,
} from "./ek-kurallar";

/**
 * Ek kaydetme — hem faaliyet açma formu hem detay ekranı buradan geçer.
 *
 * Yetki kontrolü BURADA YAPILMAZ; çağıranın işidir. Bu dosya yalnızca "kural
 * uygunsa depola ve kaydet" adımını tek yerde tutar, böylece iki ekran farklı
 * sınırlarla çalışmaya başlayamaz.
 */

export async function ekSinirlariniGetir(): Promise<EkSinirlari> {
  const [izinliGorselTipleri, izinliBelgeTipleri, gorselMaksBayt, belgeMaksBayt] =
    await Promise.all([
      ayarListe(AYAR_ANAHTARLARI.IZINLI_GORSEL_TIPLERI, [
        "image/jpeg",
        "image/png",
        "image/webp",
      ]),
      ayarListe(AYAR_ANAHTARLARI.IZINLI_BELGE_TIPLERI, ["application/pdf"]),
      ayarSayi(AYAR_ANAHTARLARI.GORSEL_MAKS_BAYT, 5 * 1024 * 1024),
      ayarSayi(AYAR_ANAHTARLARI.BELGE_MAKS_BAYT, 10 * 1024 * 1024),
    ]);

  return {
    izinliGorselTipleri,
    izinliBelgeTipleri,
    gorselMaksBayt,
    belgeMaksBayt,
  };
}

export interface EkKayitSonucu {
  olurMu: boolean;
  neden?: string;
  ekId?: number;
  tur?: EkTuru;
}

export async function ekKaydet(girdi: {
  faaliyetId: number;
  yukleyenKullaniciId: number;
  dosya: File;
  sinirlar: EkSinirlari;
  /** Görselse faaliyetin kapağı yapılsın mı? */
  kapakYap?: boolean;
}): Promise<EkKayitSonucu> {
  const { dosya } = girdi;

  const karar = ekKabulEdilirMi(
    { mimeTipi: dosya.type, boyutBayt: dosya.size, dosyaAdi: dosya.name },
    girdi.sinirlar,
  );
  if (!karar.olurMu) return { olurMu: false, neden: karar.neden };

  /*
   * İçerik, iddia edilen tiple uyuşuyor mu? `dosya.type` istemciden gelir ve
   * indirme rotası `Content-Type`'ı ondan verir (bkz. guvenlik/dosya-imzasi.ts).
   * Baytlar burada bir kez okunur; depolamaya da aynı tampon gider.
   */
  const icerik = Buffer.from(await dosya.arrayBuffer());
  const imza = dosyaImzasiUyuyorMu(icerik, dosya.type);
  if (!imza.olurMu) return { olurMu: false, neden: imza.neden };

  const anahtar = await depolama().yaz({
    icerik,
    dosyaAdi: dosya.name,
    mimeTipi: dosya.type,
  });

  const ek = await prisma.faaliyetEk.create({
    data: {
      faaliyetId: girdi.faaliyetId,
      yukleyenKullaniciId: girdi.yukleyenKullaniciId,
      dosyaAdi: dosya.name.slice(0, 255),
      depolamaYolu: anahtar,
      mimeTipi: dosya.type,
      boyutBayt: BigInt(dosya.size),
    },
    select: { id: true },
  });

  // Belge kapak olamaz: tanıtıcı görsel istendi, pdf o işi görmez.
  // kapakEkId bir ilişki alanı olduğu için skaler olarak değil connect ile
  // yazılır (Prisma yabancı anahtarı doğrudan güncellemeye izin vermiyor).
  if (girdi.kapakYap && karar.tur === "GORSEL") {
    await prisma.faaliyet.update({
      where: { id: girdi.faaliyetId },
      data: { kapakEk: { connect: { id: ek.id } } },
    });
  }

  return { olurMu: true, ekId: ek.id, tur: karar.tur };
}
