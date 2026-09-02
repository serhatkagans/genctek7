"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import {
  basvuruyuIncelemeyeAl,
  basvuruyuYanitla,
} from "@/lib/kvkk/basvuru";
import { sonucuCoz, yanitiCoz } from "@/lib/kvkk/basvuru-kurallar";
import { kvkkBasvurulariniYanitlayabilirMi } from "@/lib/yetki/izinler";
import { BulunamadiHatasi, YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * İlgili kişi başvurularının karara bağlanması (2 Eylül 2026 · Genelge 4/ç).
 *
 * Yetki HER İKİ eylemde de ayrı ayrı sorulur; ekranın düğmeyi göstermemesi bir
 * yetki kontrolü değildir (bkz. dis-basvurular/eylemler.ts · aynı desen).
 */

const YOL = "/panel/kvkk-basvurulari";

function hataylaDon(mesaj: string): never {
  redirect(`${YOL}?hata=${encodeURIComponent(mesaj)}`);
}

function basvuruIdCoz(veri: FormData): number {
  const id = Number.parseInt(String(veri.get("basvuruId") ?? ""), 10);
  if (!Number.isFinite(id)) throw new BulunamadiHatasi();
  return id;
}

export async function basvuruIncelemeyeAlEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!kvkkBasvurulariniYanitlayabilirMi(kullanici)) {
    throw new YetkiHatasi("KVKK başvurularını yönetme yetkiniz yok.");
  }

  const sonuc = await basvuruyuIncelemeyeAl(basvuruIdCoz(veri), kullanici.id);
  if (!sonuc.olduMu) hataylaDon(sonuc.neden);

  revalidatePath(YOL);
  redirect(`${YOL}?bilgi=${encodeURIComponent(sonuc.mesaj)}`);
}

export async function basvuruYanitlaEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!kvkkBasvurulariniYanitlayabilirMi(kullanici)) {
    throw new YetkiHatasi("KVKK başvurularını yanıtlama yetkiniz yok.");
  }

  const sonucKarari = sonucuCoz(String(veri.get("sonuc") ?? ""));
  if (!sonucKarari.olurMu) hataylaDon(sonucKarari.neden);

  /*
   * YANIT METNİ HER SONUÇTA ZORUNLU, yalnızca rette değil: gerekçesiz ret
   * Kanun'un 13. maddesine aykırı, açıklamasız kabul ise ilgili kişiye "ne
   * yapıldı" sorusunu cevapsız bırakıyor. Veritabanında da kısıtı var
   * (ck_kvkk_basvurusu_yanit).
   */
  const yanitKarari = yanitiCoz(String(veri.get("yanit") ?? ""));
  if (!yanitKarari.olurMu) hataylaDon(yanitKarari.neden);

  const sonuc = await basvuruyuYanitla({
    basvuruId: basvuruIdCoz(veri),
    yanitlayanKullaniciId: kullanici.id,
    durum: sonucKarari.durum,
    yanit: yanitKarari.yanit,
  });
  if (!sonuc.olduMu) hataylaDon(sonuc.neden);

  revalidatePath(YOL);
  redirect(`${YOL}?bilgi=${encodeURIComponent(sonuc.mesaj)}`);
}
