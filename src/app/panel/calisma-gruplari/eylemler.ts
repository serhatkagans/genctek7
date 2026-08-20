"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  CALISMA_GRUBU_UST_SINIRI,
  calismaGrubuSayisiAsildiMi,
} from "@/lib/ogrenci/calisma-grubu";
import { ogrenciMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import { YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * Kaydettikten sonra dönülecek adres.
 *
 * Form iki yerden gönderiliyor (Panelim'deki bölüm ve `/panel/calisma-gruplari`
 * sayfası). Değer FORMDAN geldiği için serbest bırakılamaz — açık yönlendirme
 * (open redirect) açığı doğar; yalnızca bilinen iki yol kabul edilir.
 */
const IZINLI_DONUS_YOLLARI = ["/panel", "/panel/calisma-gruplari"] as const;

function donusYolunuCoz(veri: FormData): string {
  const istenen = String(veri.get("donusYolu") ?? "");
  return (IZINLI_DONUS_YOLLARI as readonly string[]).includes(istenen)
    ? istenen
    : "/panel/calisma-gruplari";
}

export async function calismaGrubuKaydetEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  if (!ogrenciMi(kullanici)) {
    throw new YetkiHatasi("Çalışma grubu seçimi yalnızca öğrenciler içindir.");
  }

  const donusYolu = donusYolunuCoz(veri);
  const capa = donusYolu === "/panel" ? "#calisma-gruplarim" : "";

  const secilenler = veri
    .getAll("grupId")
    .map((deger) => Number.parseInt(String(deger), 10))
    .filter((sayi) => Number.isFinite(sayi));

  /*
   * ÜST SINIR (20 Ağustos 2026 · istek: "öğrenciler max 5 çalışma grubunda
   * görülebilsin"). Sayı ve gerekçesi tek yerde
   * (lib/ogrenci/calisma-grubu.ts) — ekran da aynı sabitten yazıyor, yoksa
   * "en fazla 5" diyen bir arayüzle altıyı kabul eden bir sunucu ayrışırdı.
   *
   * KONTROL PASİF GRUP SÜZGECİNDEN ÖNCE: öğrenci ekranda ne işaretlediyse o
   * sayılıyor. Süzgeçten sonra sayılsaydı, kapatılmış bir grubu da işaretleyen
   * öğrenci "beş seçtim, neden kaydolmadı" derdi.
   */
  if (calismaGrubuSayisiAsildiMi(secilenler.length)) {
    redirect(
      `${donusYolu}?hata=${encodeURIComponent(
        `En fazla ${CALISMA_GRUBU_UST_SINIRI} çalışma grubu seçebilirsiniz; ${secilenler.length} grup işaretlediniz.`,
      )}${capa}`,
    );
  }

  // Pasif gruplar yeni seçimlerde kabul edilmez; geçmiş seçimler korunur.
  const gecerliGruplar = await prisma.calismaGrubu.findMany({
    where: { id: { in: secilenler }, aktif: true },
    select: { id: true },
  });
  const gecerliIdler = gecerliGruplar.map((grup) => grup.id);

  /*
   * Kayıt SİL-YENİDEN-YAZ ile değil FARK hesaplanarak güncellenir. İki neden:
   *
   *   1. Ekran yalnızca AKTİF grupları listeler. Hepsini silip yeniden yazmak,
   *      öğrencinin kapanmış bir gruba ait geçmiş seçimini de silerdi — oysa
   *      pasif gruplarda geçmiş korunmalı (domain-rules.md Bölüm 5).
   *   2. Grubu danışman ya da koordinatör eklemiş olabilir. Yeniden yazmak
   *      `secimTarihi` ve `ekleyenKullaniciId` izini sıfırlardı; öğrenci kutuya
   *      dokunmadığı hâlde kayıt "kendi seçimi" görünürdü.
   */
  const mevcutSecimler = await prisma.ogrenciCalismaGrubu.findMany({
    where: { ogrenciId: kullanici.id, calismaGrubu: { aktif: true } },
    select: { calismaGrubuId: true },
  });
  const mevcutIdler = mevcutSecimler.map((secim) => secim.calismaGrubuId);

  const eklenecekler = gecerliIdler.filter((id) => !mevcutIdler.includes(id));
  const cikarilacaklar = mevcutIdler.filter((id) => !gecerliIdler.includes(id));

  await prisma.$transaction(async (islem) => {
    if (cikarilacaklar.length > 0) {
      await islem.ogrenciCalismaGrubu.deleteMany({
        where: {
          ogrenciId: kullanici.id,
          calismaGrubuId: { in: cikarilacaklar },
        },
      });
    }
    if (eklenecekler.length > 0) {
      await islem.ogrenciCalismaGrubu.createMany({
        data: eklenecekler.map((grupId) => ({
          ogrenciId: kullanici.id,
          calismaGrubuId: grupId,
          // Öğrencinin kendi seçimi: ekleyen alanı boş kalır.
          ekleyenKullaniciId: null,
        })),
      });
    }
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "OGRENCI",
    hedefId: kullanici.id,
    detay: `Çalışma grubu seçimi güncellendi: ${gecerliIdler.join(", ") || "yok"}`,
  });

  revalidatePath("/panel/calisma-gruplari");
  revalidatePath("/panel");
  // Danışman/koordinatörün gördüğü tekil profil de aynı listeyi gösteriyor.
  revalidatePath(`/panel/ogrenciler/${kullanici.id}`);
  redirect(`${donusYolu}?durum=kaydedildi${capa}`);
}
