"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  gizleyebilirMi,
  gonderiMetniniCoz,
  hakkindaMetniniCoz,
  yorumMetniniCoz,
} from "@/lib/akis/kurallar";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  danismanMi,
  ilKoordinatoruMu,
  projeYoneticisiMi,
} from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import { BulunamadiHatasi } from "@/lib/yetki/tipler";
import type { OturumKullanicisi } from "@/lib/yetki/tipler";

/**
 * Akış eylemleri: gönderi paylaşma, yorum yazma, gizleme ve "Hakkımda".
 *
 * KAPSAM FİLTRESİ YOK ve bu bir eksiklik değil: gönderi YAYINDIR, ekosistemdeki
 * herkes okur ve herkes yazabilir. Yazışmadaki `yazismaKapsamFiltresi` "bu
 * konuşmayı görmeye hakkın var mı" sorusunu çözüyordu; burada öyle bir soru
 * yok. Kapı, panodaki ilanın kapısıyla aynı: giriş yapmış olmak.
 *
 * GİZLEME İSE YETKİ İSTER (bkz. lib/akis/kurallar.ts · gizleyebilirMi):
 * içeriğin yazarı ya da gözetim yetkisi olan. Silme yoktur.
 */

/*
 * DÖNÜŞ ADRESİ "BAĞLANTILARIM" (14 Ağustos 2026 · istek: "akış bağlantılarım
 * içine gelecek"). Akış artık o sayfanın içinde bir bölüm; `/panel/akis` yalnızca
 * yönlendirme. Eylemler eski adrese dönseydi kullanıcı her paylaşımdan sonra
 * fazladan bir yönlendirme atlardı ve `?durum=` iletisi yolda kaybolurdu.
 *
 * ÇAPA KORUNDU (`#gonderi-…`): yorum yazan kişi listenin başına değil, yorum
 * yazdığı gönderiye dönüyor.
 */
const YOL = "/panel/yazismalar";

function hataylaDon(yol: string, mesaj: string): never {
  redirect(`${yol}?hata=${encodeURIComponent(mesaj)}`);
}

function gozetimYetkisiVarMi(kullanici: OturumKullanicisi): boolean {
  return (
    danismanMi(kullanici) ||
    ilKoordinatoruMu(kullanici) ||
    projeYoneticisiMi(kullanici)
  );
}

export async function gonderiPaylasEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const karar = gonderiMetniniCoz(String(veri.get("icerik") ?? ""));
  if (!karar.olurMu) hataylaDon(YOL, karar.neden);

  await prisma.gonderi.create({
    data: { yazanKullaniciId: kullanici.id, icerik: karar.icerik },
  });

  revalidatePath(YOL);
  redirect(`${YOL}?durum=paylasildi`);
}

export async function yorumYazEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const gonderiId = Number.parseInt(String(veri.get("gonderiId") ?? ""), 10);
  if (!Number.isFinite(gonderiId)) throw new BulunamadiHatasi();

  const karar = yorumMetniniCoz(String(veri.get("icerik") ?? ""));
  if (!karar.olurMu) hataylaDon(`${YOL}#gonderi-${gonderiId}`, karar.neden);

  /*
   * GİZLENMİŞ GÖNDERİYE YORUM YAZILAMAZ. Ekranda zaten form basılmıyor ama
   * kapı sunucuda da duruyor: ekrandan kaldırılan bir alanın istekle geri
   * gelebilmesi, kaldırılmamış olması demektir.
   */
  const gonderi = await prisma.gonderi.findUnique({
    where: { id: gonderiId },
    select: { id: true, gizlendiMi: true },
  });
  if (!gonderi) throw new BulunamadiHatasi();
  if (gonderi.gizlendiMi) {
    hataylaDon(YOL, "Bu gönderi kaldırıldı; altına yorum yazılamaz.");
  }

  await prisma.gonderiYorumu.create({
    data: {
      gonderiId: gonderi.id,
      yazanKullaniciId: kullanici.id,
      icerik: karar.icerik,
    },
  });

  revalidatePath(YOL);
  redirect(`${YOL}#gonderi-${gonderi.id}`);
}

export async function gonderiGizleEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const gonderiId = Number.parseInt(String(veri.get("gonderiId") ?? ""), 10);
  if (!Number.isFinite(gonderiId)) throw new BulunamadiHatasi();

  const gonderi = await prisma.gonderi.findUnique({
    where: { id: gonderiId },
    select: { id: true, yazanKullaniciId: true, gizlendiMi: true },
  });
  if (!gonderi) throw new BulunamadiHatasi();

  const karar = gizleyebilirMi({
    kullaniciId: kullanici.id,
    yazanKullaniciId: gonderi.yazanKullaniciId,
    gozetimYetkisiVarMi: gozetimYetkisiVarMi(kullanici),
    zatenGizliMi: gonderi.gizlendiMi,
  });
  if (!karar.olurMu) hataylaDon(YOL, karar.neden ?? "Bu içerik gizlenemez.");

  await prisma.gonderi.update({
    where: { id: gonderi.id },
    data: {
      gizlendiMi: true,
      gizleyenKullaniciId: kullanici.id,
      gizlenmeTarihi: new Date(),
    },
  });

  /*
   * Moderasyon İZ BIRAKIR — yazarın kendi gönderisini kaldırması dâhil.
   * "Kendi sildi" ile "yetkili kaldırdı" ayrımı denetimde görünür kalmalı.
   */
  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: gonderi.yazanKullaniciId,
    detay:
      gonderi.yazanKullaniciId === kullanici.id
        ? `Kendi gönderisini kaldırdı (#${gonderi.id})`
        : `Başkasının gönderisi gizlendi (#${gonderi.id})`,
  });

  revalidatePath(YOL);
  redirect(`${YOL}?durum=gizlendi`);
}

export async function yorumGizleEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const yorumId = Number.parseInt(String(veri.get("yorumId") ?? ""), 10);
  if (!Number.isFinite(yorumId)) throw new BulunamadiHatasi();

  const yorum = await prisma.gonderiYorumu.findUnique({
    where: { id: yorumId },
    select: {
      id: true,
      gonderiId: true,
      yazanKullaniciId: true,
      gizlendiMi: true,
    },
  });
  if (!yorum) throw new BulunamadiHatasi();

  const karar = gizleyebilirMi({
    kullaniciId: kullanici.id,
    yazanKullaniciId: yorum.yazanKullaniciId,
    gozetimYetkisiVarMi: gozetimYetkisiVarMi(kullanici),
    zatenGizliMi: yorum.gizlendiMi,
  });
  if (!karar.olurMu) hataylaDon(YOL, karar.neden ?? "Bu içerik gizlenemez.");

  await prisma.gonderiYorumu.update({
    where: { id: yorum.id },
    data: {
      gizlendiMi: true,
      gizleyenKullaniciId: kullanici.id,
      gizlenmeTarihi: new Date(),
    },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: yorum.yazanKullaniciId,
    detay:
      yorum.yazanKullaniciId === kullanici.id
        ? `Kendi yorumunu kaldırdı (#${yorum.id})`
        : `Başkasının yorumu gizlendi (#${yorum.id})`,
  });

  revalidatePath(YOL);
  redirect(`${YOL}#gonderi-${yorum.gonderiId}`);
}

/**
 * "Hakkımda" metni.
 *
 * SALT OKUNUR KİMLİK ALANLARINDAN AYRI: ad, sınıf, kurum e-Okul'dan gelir ve
 * hiçbir ekrandan düzenlenemez; bu metin kişinin kendisinindir. Bu yüzden
 * salt okunur alan koruması (lib/kullanici/salt-okunur.ts) buraya uygulanmaz.
 */
export async function hakkindaKaydetEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const donusYolu = String(veri.get("donusYolu") ?? YOL) || YOL;
  /*
   * Açık yönlendirme olmasın: yalnızca kendi panelimize dönebiliriz.
   *
   * "/panel" AYRICA SAYILIYOR (13 Ağustos 2026): koşul yalnızca "/panel/" ile
   * başlayanları kabul ediyordu ve Panel'in kendi adresi eğik çizgiyle
   * bitmiyor. Panel'e eklenen "Hakkımda" bölümü bu yüzden kaydetmesine rağmen
   * kullanıcıyı Akış'a bırakıyordu.
   */
  const yol =
    donusYolu === "/panel" || donusYolu.startsWith("/panel/") ? donusYolu : YOL;

  const karar = hakkindaMetniniCoz(String(veri.get("hakkinda") ?? ""));
  if (!karar.olurMu) hataylaDon(yol, karar.neden);

  await prisma.kullanici.update({
    where: { id: kullanici.id },
    data: { hakkinda: karar.icerik },
  });

  revalidatePath(yol);
  revalidatePath("/panel");
  redirect(`${yol}?durum=hakkinda-kaydedildi`);
}
