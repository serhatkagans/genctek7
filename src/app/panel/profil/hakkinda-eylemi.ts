"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hakkindaMetniniCoz } from "@/lib/akis/kurallar";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";

/**
 * "Hakkımda" metni.
 *
 * SALT OKUNUR KİMLİK ALANLARINDAN AYRI: ad, sınıf, kurum e-Okul'dan gelir ve
 * hiçbir ekrandan düzenlenemez; bu metin kişinin kendisinindir. Bu yüzden salt
 * okunur alan koruması (lib/kullanici/salt-okunur.ts) buraya uygulanmaz.
 *
 * DOSYA AKIŞTAN BURAYA TAŞINDI (21 Ağustos 2026 · istek: "akışı da kaldır").
 * Eylem akış eylemleriyle aynı dosyadaydı çünkü metin ilk kez orada
 * düzenleniyordu; akış kalkınca metni düzenleten tek ekran Panel'deki
 * "Hakkımda" kartı kaldı ve eylem onun komşusuna geldi.
 *
 * Metin kuralı (`lib/akis/kurallar.ts · hakkindaMetniniCoz`) yerinde: uzunluk
 * sınırı ve kırpma tek yerde tanımlı ve akış dışında da geçerli.
 */
export async function hakkindaKaydetEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const donusYolu = String(veri.get("donusYolu") ?? "/panel") || "/panel";
  /*
   * Açık yönlendirme olmasın: yalnızca kendi panelimize dönebiliriz. "/panel"
   * AYRICA sayılıyor — koşul yalnızca "/panel/" ile başlayanları kabul etseydi
   * Panel'in kendi adresi (eğik çizgisiz) elenirdi.
   */
  const yol =
    donusYolu === "/panel" || donusYolu.startsWith("/panel/")
      ? donusYolu
      : "/panel";

  const karar = hakkindaMetniniCoz(String(veri.get("hakkinda") ?? ""));
  if (!karar.olurMu) {
    redirect(`${yol}?hata=${encodeURIComponent(karar.neden)}`);
  }

  await prisma.kullanici.update({
    where: { id: kullanici.id },
    data: { hakkinda: karar.icerik },
  });

  revalidatePath(yol);
  revalidatePath("/panel");
  redirect(`${yol}?durum=hakkinda-kaydedildi`);
}
