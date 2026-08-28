"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  REFERANS_AZAMI_SAYI,
  referansKabulEdilirMi,
} from "@/lib/referans/kurallar";
import { erisimLogla } from "@/lib/yetki/log";
import { BulunamadiHatasi } from "@/lib/yetki/tipler";

/**
 * REFERANSLARIM (28 Ağustos 2026 · istek: "Öğrenciler için profile referanslar
 * bölümü ekleyelim. Referans için ad soyad telefon kurum eposta").
 *
 * Hepsi oturumdaki kişinin KENDİ verisi üzerinde çalışır: `kullaniciId` hiçbir
 * yerde form girdisinden okunmaz — "Rotam" hedefleriyle aynı desen ve aynı
 * gerekçe (bkz. hedef-eylemleri.ts).
 *
 * ROL KISITI YOK. Bölüm yalnızca öğrenci panelinde basılıyor ama eylem rol
 * sormuyor: kişi kendi satırından başkasına erişemediği için burada korunacak
 * bir şey yok ve rol kontrolü, öğretmenin ileride referans tutmasını
 * gereksizce engellerdi.
 *
 * ---------------------------------------------------------------------------
 * DÜZENLEME YOK: SİL VE YENİDEN YAZ
 * ---------------------------------------------------------------------------
 * Referans dört kısa alandan oluşuyor; yanlış yazılan bir satırı silip
 * yeniden girmek, her satırın altına ikinci bir form basmaktan ucuz. Aynı
 * karar Rotam hedeflerinde de verildi.
 */

const YOL = "/panel";
const BOLUM = "referanslarim";

function yollariTazele(): void {
  revalidatePath(YOL);
}

/**
 * BAŞARIDA YÖNLENDİRME YOK — bilerek.
 *
 * Kullanıcı zaten o sayfadayken yalnızca çıpası değişen bir adrese
 * yönlendirmek, tarayıcıya "aynı sayfa" dedirtiyor ve eklenen kayıt ekranda
 * görünmüyordu (gerekçenin tamamı hedef-eylemleri.ts'te). `revalidatePath`
 * sonrası sayfa eylem yanıtında yeniden üretiliyor.
 */
function hataylaDon(mesaj: string): never {
  /*
   * `revalidatePath` HATA YOLUNDA DA gerekli: istemci yönlendirme önbelleği
   * girdiyi YOLA göre tutuyor, sorgu dizesine göre değil.
   */
  yollariTazele();
  /*
   * `bolum` çıpadan AYRI: bölüm katlanabilir bir kutu ve kapalı bir kutunun
   * çapasına inmek, kullanıcıyı uyarının görünmediği bir başlığa götürürdü.
   */
  redirect(
    `${YOL}?bolum=${BOLUM}&hata=${encodeURIComponent(mesaj)}#${BOLUM}`,
  );
}

export async function referansEkleEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const karar = referansKabulEdilirMi({
    adSoyad: String(veri.get("adSoyad") ?? ""),
    kurum: String(veri.get("kurum") ?? ""),
    telefon: String(veri.get("telefon") ?? ""),
    eposta: String(veri.get("eposta") ?? ""),
  });
  if (!karar.olurMu) hataylaDon(karar.neden);

  /*
   * Sayım eklemeden HEMEN ÖNCE yapılıyor; kişi kendi satırlarına yarıştığı
   * için iki sekmeden aynı anda ekleyip sınırı bir aşması mümkün. Bu, kilit
   * kurmaya değmeyecek bir kayma: sınır taşma koruması, kota değil (aynı not
   * hedef-eylemleri.ts'te).
   */
  const mevcut = await prisma.kullaniciReferansi.count({
    where: { kullaniciId: kullanici.id },
  });
  if (mevcut >= REFERANS_AZAMI_SAYI) {
    hataylaDon(
      `En fazla ${REFERANS_AZAMI_SAYI} referans ekleyebilirsiniz. Silerek yer açabilirsiniz.`,
    );
  }

  await prisma.kullaniciReferansi.create({
    data: { kullaniciId: kullanici.id, ...karar.kayit },
    select: { id: true },
  });

  /*
   * ERİŞİM KAYDINA REFERANSIN ADI YAZILMIYOR, yalnızca "bir referans eklendi".
   * Satır üçüncü bir kişinin kişisel verisi; denetim kaydı onu ikinci bir
   * yere kopyalamamalı (erisim_logu, öğrenci profilinden çok daha geniş bir
   * kitleye açık — bkz. permissions.md Bölüm 4).
   */
  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: "Profile referans eklendi",
  });

  yollariTazele();
}

export async function referansSilEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const id = Number.parseInt(String(veri.get("referansId") ?? ""), 10);
  if (!Number.isInteger(id)) throw new BulunamadiHatasi();

  /*
   * `kullaniciId` koşulu olmadan silinseydi başkasının referansı silinebilirdi.
   * Bulunamayan kayıt 404 verir (403 değil): 403, "böyle bir kayıt var ama
   * senin değil" bilgisini sızdırırdı.
   */
  const silinen = await prisma.kullaniciReferansi.deleteMany({
    where: { id, kullaniciId: kullanici.id },
  });
  if (silinen.count === 0) throw new BulunamadiHatasi();

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: "Profilden referans silindi",
  });

  yollariTazele();
}
