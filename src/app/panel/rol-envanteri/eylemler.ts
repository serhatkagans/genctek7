"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import {
  ACIKLAMA_AZAMI,
  ilKoordinatorAciklamasiniYaz,
  ilKoordinatorluguKaldir,
  ilKoordinatoruAta,
  KoordinatorAtamaHatasi,
  yenidenDagitilanOgrenciSayisi,
} from "@/lib/rol/koordinator";
import { rolEnvanteriGorebilirMi } from "@/lib/yetki/izinler";
import { BulunamadiHatasi, YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * İl koordinatörü atama/kaldırma — yalnızca proje yöneticisi.
 *
 * Atama danışman öğretmene de yapılabilir; engellenmez. İşlem sonunda kullanıcı
 * kaç öğrencinin yeniden dağıtıldığını görür (domain-rules.md Bölüm 3).
 */

const YOL = "/panel/rol-envanteri";

function metin(veri: FormData, alan: string): string {
  return String(veri.get(alan) ?? "").trim();
}

function sayi(veri: FormData, alan: string): number | null {
  const deger = Number.parseInt(metin(veri, alan), 10);
  return Number.isFinite(deger) ? deger : null;
}

export async function ilKoordinatoruAtaEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!rolEnvanteriGorebilirMi(kullanici)) {
    throw new YetkiHatasi("İl koordinatörü atamasını yalnızca proje yöneticisi yapar.");
  }

  const hedefId = sayi(veri, "kullaniciId");
  const ilKodu = metin(veri, "ilKodu");
  if (hedefId === null || !ilKodu) throw new BulunamadiHatasi();

  /*
   * AÇIKLAMA ATAMAYLA BİRLİKTE YAZILIYOR (27 Ağustos 2026 · istek: "koordinatör
   * atarken açıklama yazılabilecek bir alan"). Ayrı bir adım olsaydı atama
   * yapılıp not yazılmadan bırakılabilirdi; bu formda ikisi tek gönderim.
   *
   * ZORUNLU DEĞİL: notu olmayan atama geçerli bir atamadır. Uzunluk sınırı
   * `ACIKLAMA_AZAMI` — sütun `TEXT` ama form gövdesinin sınırsız olması
   * gerekmiyor ve ekran da bunu `maxLength` ile söylüyor.
   */
  const aciklama = metin(veri, "aciklama").slice(0, ACIKLAMA_AZAMI) || null;

  let sonuc;
  try {
    sonuc = await ilKoordinatoruAta(hedefId, ilKodu, kullanici.id, aciklama);
  } catch (hata) {
    if (hata instanceof KoordinatorAtamaHatasi) {
      redirect(`${YOL}?il=${ilKodu}&hata=${encodeURIComponent(hata.message)}`);
    }
    throw hata;
  }

  revalidatePath(YOL);
  revalidatePath("/panel/ogrenciler");

  /*
   * Uyarı metni sayfada değil BURADA belirleniyor: "kaç öğrenci etkilendi"
   * bilgisi işlemin kendisine ait, sonradan sorguyla üretilemez (dağıtım
   * tamamlandığı için tekrar sayılamaz).
   *
   * İki sayı AYRI taşınıyor: danışmanlığı kapandığı için yeri değişenler ile
   * koordinatörsüzken sahipsiz kalıp şimdi bağlananlar farklı olaylardır.
   */
  const dagitilan = yenidenDagitilanOgrenciSayisi(sonuc);
  const parcalar = [`durum=atandi`, `il=${ilKodu}`, `dagitilan=${dagitilan}`];
  if (sonuc.danismanliktanAlindiMi) parcalar.push("danismandi=1");
  if (sonuc.yenidenSecimBekleyen > 0) {
    parcalar.push(`yenidenSecim=${sonuc.yenidenSecimBekleyen}`);
  }
  if (sonuc.sahipsizkenBaglananOgrenciSayisi > 0) {
    parcalar.push(`baglanan=${sonuc.sahipsizkenBaglananOgrenciSayisi}`);
  }

  redirect(`${YOL}?${parcalar.join("&")}`);
}

export async function ilKoordinatoruKaldirEylemi(
  veri: FormData,
): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!rolEnvanteriGorebilirMi(kullanici)) {
    throw new YetkiHatasi("İl koordinatörü görevini yalnızca proje yöneticisi kaldırır.");
  }

  const hedefId = sayi(veri, "kullaniciId");
  if (hedefId === null) throw new BulunamadiHatasi();

  let sonuc;
  try {
    sonuc = await ilKoordinatorluguKaldir(hedefId, kullanici.id);
  } catch (hata) {
    if (hata instanceof KoordinatorAtamaHatasi) {
      redirect(`${YOL}?hata=${encodeURIComponent(hata.message)}`);
    }
    throw hata;
  }

  revalidatePath(YOL);
  revalidatePath("/panel/ogrenciler");
  redirect(
    `${YOL}?durum=kaldirildi&il=${sonuc.ilKodu}&atanmamis=${sonuc.atanmamisKalanOgrenciSayisi}`,
  );
}

/**
 * Aktif koordinatörlüğün açıklamasını günceller (27 Ağustos 2026 · istek:
 * "sonradan metni düzenleme de olsun").
 *
 * AYRI EYLEM, ATAMANIN İÇİNDE DEĞİL: not düzeltmek bir görev değişikliği
 * değildir — öğrenci dağıtmaz, bildirim göndermez, `/panel/ogrenciler`i
 * tazelemez. Atama eylemine bir "yalnızca notu güncelle" dalı eklenseydi, o
 * dalın dağıtım adımlarını atlaması gerekirdi ve iki iş tek gövdede karışırdı.
 */
export async function ilKoordinatorAciklamasiEylemi(
  veri: FormData,
): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!rolEnvanteriGorebilirMi(kullanici)) {
    throw new YetkiHatasi(
      "Atama açıklamasını yalnızca proje yöneticisi düzenler.",
    );
  }

  const hedefId = sayi(veri, "kullaniciId");
  if (hedefId === null) throw new BulunamadiHatasi();

  const yazildi = await ilKoordinatorAciklamasiniYaz(
    hedefId,
    metin(veri, "aciklama").slice(0, ACIKLAMA_AZAMI) || null,
  );
  if (!yazildi) {
    redirect(
      `${YOL}?hata=${encodeURIComponent("Bu kişinin süren bir il koordinatörlüğü bulunamadı; görev bu arada kaldırılmış olabilir.")}`,
    );
  }

  revalidatePath(YOL);
  redirect(`${YOL}?durum=aciklama-kaydedildi`);
}
