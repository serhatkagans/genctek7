"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { kvkkBasvurusuAc } from "@/lib/kvkk/basvuru";
import {
  aciklamayiCoz,
  konulariCoz,
  yanitAdresiniCoz,
} from "@/lib/kvkk/basvuru-kurallar";

/**
 * İlgili kişi başvurusunun açılması (2 Eylül 2026 · Genelge 4/ç).
 *
 * YETKİ KAPISI YOK ve olmamalı: başvuru bir HAKTIR, oturum açmış herkes
 * kullanır. Eylemin tek kimlik kontrolü `oturumKullanicisiZorunlu` — başvuran,
 * oturumdaki kişidir ve forma "başkası adına" yazılabilecek bir kimlik alanı
 * yoktur (bkz. model KvkkBasvurusu · kimlik alanları kopyalanmıyor).
 */

const YOL = "/panel/kisisel-verilerim";

function hataylaDon(mesaj: string): never {
  redirect(`${YOL}?hata=${encodeURIComponent(mesaj)}#basvuru-formu`);
}

export async function kvkkBasvurusuAcEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  /*
   * Onay kutularının hepsi AYNI ADI taşıyor (`konu`), bu yüzden `getAll`.
   * Değerler koddan geliyor ve tanınmayan bir değer sessizce atılmıyor
   * (bkz. konulariCoz) — kişinin seçtiğini sandığı bir hakkın kaydedilmemesi,
   * formun verebileceği en sessiz zarardı.
   */
  const konuKarari = konulariCoz(
    veri.getAll("konu").map((deger) => String(deger)),
  );
  if (!konuKarari.olurMu) hataylaDon(konuKarari.neden);

  const aciklamaKarari = aciklamayiCoz(String(veri.get("aciklama") ?? ""));
  if (!aciklamaKarari.olurMu) hataylaDon(aciklamaKarari.neden);

  const adresKarari = yanitAdresiniCoz(String(veri.get("yanitAdresi") ?? ""));
  if (!adresKarari.olurMu) hataylaDon(adresKarari.neden);

  await kvkkBasvurusuAc({
    kullaniciId: kullanici.id,
    konular: konuKarari.konular,
    aciklama: aciklamaKarari.aciklama,
    yanitAdresi: adresKarari.adres,
  });

  revalidatePath(YOL);
  redirect(
    `${YOL}?bilgi=${encodeURIComponent(
      "Başvurunuz kaydedildi. Yasal yanıt süresi en geç otuz gündür; sonuç panelinize bildirim olarak düşecek.",
    )}#basvurularim`,
  );
}
