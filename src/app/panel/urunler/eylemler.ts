"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  BILDIRIM_KODLARI,
  bildirimGonder,
  projeYoneticilerineBildir,
} from "@/lib/bildirim/gonder";
import { urunMarketKarariGecerliMi } from "@/lib/market/kurallar";
import { urunMarketOnayiVerebilirMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import { BulunamadiHatasi, YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * Market eylemleri (I).
 *
 * ŞİMDİLİK TEK EYLEM VAR: paylaşımı açıp kapatmak.
 *
 * NEDEN BU EYLEM GEREKLİ. "Bu ürünü markette paylaş" kutusu işaretlenmeden
 * eklenmiş bir ürünü markete çıkarmanın yolu, ürünü profilden düzenlemekten
 * geçiyor; oysa "Kendi ürünlerim" sekmesi o ürünü zaten gösteriyor ve
 * kullanıcı onu MARKETTE görüyor. Anahtar, gördüğü yerde bir işi
 * yapabilmesi için burada duruyor.
 */

const KOK = "/panel/urunler";

export async function paylasimiDegistirEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const id = Number.parseInt(String(veri.get("urunId") ?? ""), 10);
  if (!Number.isFinite(id)) throw new BulunamadiHatasi();

  /*
   * `kullaniciId` koşulu şart: olmadan sorgulanırsa başkasının ürününün
   * paylaşımı kapatılabilir ya da AÇILABİLİRDİ — ikincisi daha ağır, kişinin
   * paylaşmamayı seçtiği kaydı vitrine çıkarmak olurdu.
   *
   * Bulunamayan kayıt 404 verir (403 değil): 403, "böyle bir ürün var ama
   * senin değil" bilgisini sızdırırdı.
   */
  const urun = await prisma.kullaniciKazanim.findFirst({
    where: { id, kullaniciId: kullanici.id, tip: "URUN" },
    select: {
      id: true,
      baslik: true,
      markettePaylasilsin: true,
      marketOnayDurumu: true,
    },
  });
  if (!urun) throw new BulunamadiHatasi();

  const yeniDurum = !urun.markettePaylasilsin;

  /*
   * PAYLAŞIM AÇILINCA ONAY İSTENİR (26 Ağustos 2026 · istek: "markette
   * paylaşılmadı yerine onay bekliyor yazsın ve proje yöneticisine gitsin
   * onaya, öğretmen için de").
   *
   * DAHA ÖNCE ONAYLANMIŞSA yeniden sorulmaz: kişi ürününü vitrinden çekip
   * geri koyduğunda aynı ürün için ikinci kez sıraya girmesi, kararı veren
   * merkezi de bekleyeni de boşuna meşgul ederdi. Onaylanan şey hâlâ aynı
   * şey — ürünün İÇERİĞİ değiştiğinde onay zaten orada tazeleniyor (bkz.
   * profil/kazanim-eylemleri.ts · kazanimGuncelleEylemi · `onayTazelensin`).
   *
   * PAYLAŞIM KAPATILIRKEN KARARA DOKUNULMAZ: tercih ile karar ayrı alanlar.
   */
  const yeniOnayDurumu =
    yeniDurum && urun.marketOnayDurumu !== "ONAYLANDI"
      ? "BEKLIYOR"
      : urun.marketOnayDurumu;

  await prisma.kullaniciKazanim.update({
    where: { id: urun.id },
    data: {
      markettePaylasilsin: yeniDurum,
      marketOnayDurumu: yeniOnayDurumu,
      ...(yeniOnayDurumu === "BEKLIYOR"
        ? {
            marketRetGerekcesi: null,
            marketKararVerenKullaniciId: null,
            marketKararTarihi: null,
          }
        : {}),
    },
  });

  /*
   * Kuyruk sessiz değil: kararı verecek merkez uyarılıyor. Bildirim KAYITTAN
   * SONRA — gönderimde çıkacak bir sorun paylaşımın kendisini düşürmemeli.
   */
  if (yeniOnayDurumu === "BEKLIYOR") {
    await projeYoneticilerineBildir(BILDIRIM_KODLARI.ONAY_BEKLEYEN_URUN, {
      sahipAdSoyad: `${kullanici.ad} ${kullanici.soyad}`,
      urunAdi: urun.baslik,
    });
  }

  /*
   * SAYAÇLAR SIFIRLANMIYOR. Paylaşım kapatılıp yeniden açıldığında eski
   * görüntülenme ve ziyaret sayıları duruyor: sayaç ürünün geçmişidir, vitrinde
   * kaldığı sürenin değil. Sıfırlansaydı, paylaşımı bir an kapatmak ürünün
   * bütün geçmişini silerdi.
   */

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: `Markette paylaşım ${yeniDurum ? "açıldı" : "kapatıldı"}: ${urun.baslik}`,
  });

  /*
   * Üç yol da tazeleniyor: ürün detayı, market listesi ve profil. Ürün
   * profildeki "Bilişim Yolculuğum" listesinde de paylaşım rozetiyle
   * görünüyor; yalnızca market tazelenseydi profildeki rozet eski kalırdı.
   *
   * Yönlendirme YOK — aynı adrese yönlendirmek sayfayı tazelemiyor
   * (bkz. panel/algoritmam/eylemler.ts).
   */
  revalidatePath(`${KOK}/${urun.id}`);
  revalidatePath(KOK);
  revalidatePath("/panel");
}

/**
 * Ürünün markette yayımlanma kararı (26 Ağustos 2026).
 *
 * KARARI YALNIZCA MERKEZ VERİR (bkz. urunMarketOnayiVerebilirMi): market
 * ülke geneline açık tek bir vitrin ve bir ilin koordinatörünün ülke çapında
 * görünecek bir ürünü yayımlaması, kapsamının dışında bir karar olurdu.
 *
 * RETTE GEREKÇE ZORUNLU: gerekçesiz ret, sahibine neyi düzelteceğini
 * söylemez (bkz. urunMarketKarariGecerliMi).
 */
export async function urunMarketKarariEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!urunMarketOnayiVerebilirMi(kullanici)) {
    throw new YetkiHatasi("Ürün market kararını veremezsiniz.");
  }

  const urunId = Number.parseInt(String(veri.get("urunId") ?? ""), 10);
  if (!Number.isFinite(urunId)) throw new BulunamadiHatasi();

  const urun = await prisma.kullaniciKazanim.findFirst({
    where: { id: urunId, tip: "URUN" },
    select: {
      id: true,
      baslik: true,
      kullaniciId: true,
      marketOnayDurumu: true,
    },
  });
  if (!urun) throw new BulunamadiHatasi();

  const karar = urunMarketKarariGecerliMi({
    mevcutDurum: urun.marketOnayDurumu,
    onaylandiMi: veri.get("karar") === "onayla",
    gerekce: String(veri.get("gerekce") ?? ""),
  });
  if (!karar.olurMu) {
    redirect(`/panel/talepler/onaylar?hata=${encodeURIComponent(karar.neden)}`);
  }

  await prisma.kullaniciKazanim.update({
    where: { id: urun.id },
    data: {
      marketOnayDurumu: karar.durum,
      marketKararVerenKullaniciId: kullanici.id,
      marketKararTarihi: new Date(),
      marketRetGerekcesi: karar.durum === "REDDEDILDI" ? karar.gerekce : null,
    },
  });

  await bildirimGonder({
    kullaniciId: urun.kullaniciId,
    kod: BILDIRIM_KODLARI.URUN_MARKET_KARARI,
    degiskenler: {
      urunAdi: urun.baslik,
      sonuc: karar.durum === "ONAYLANDI" ? "onaylandı" : "reddedildi",
      gerekce: karar.gerekce ?? "—",
    },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: urun.kullaniciId,
    detay: `Ürün market kararı (${
      karar.durum === "ONAYLANDI" ? "onaylandı" : "reddedildi"
    }): ${urun.baslik}`,
  });

  revalidatePath(KOK);
  revalidatePath(`${KOK}/${urun.id}`);
  revalidatePath("/panel/talepler/onaylar");
  redirect("/panel/talepler/onaylar?durum=urun-karari");
}
