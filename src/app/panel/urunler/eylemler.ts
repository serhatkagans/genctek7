"use server";

import { revalidatePath } from "next/cache";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { erisimLogla } from "@/lib/yetki/log";
import { BulunamadiHatasi } from "@/lib/yetki/tipler";

/**
 * Market eylemleri (I).
 *
 * ŞİMDİLİK TEK EYLEM VAR: paylaşımı açıp kapatmak.
 *
 * NEDEN BU EYLEM GEREKLİ. Kazanım kayıtlarının düzenleme eylemi yok — yalnızca
 * ekleme ve silme var (bkz. profil/kazanim-eylemleri.ts). "Bu ürünü markette
 * paylaş" kutusu işaretlenmeden eklenmiş bir ürün, o hâliyle markete HİÇ
 * çıkamıyordu: kişinin ürünü silip açıklamasıyla, görselleriyle, bağlantılarıyla
 * baştan girmesi gerekirdi. "Kendi ürünlerim" sekmesi paylaşılmamış ürünleri
 * gösterdiği için sonuç, kullanıcının gördüğü ama hiçbir şey yapamadığı bir
 * kayıt oluyordu.
 *
 * Bunun için tam bir ürün düzenleme formu yazılmadı: eksik olan tek şey bu
 * bayraktı ve düzenleme formu, kazanım kayıtlarının tamamı için verilmiş
 * "ekle/sil" kararını tek tip için delen ayrı bir karardır.
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
    select: { id: true, baslik: true, markettePaylasilsin: true },
  });
  if (!urun) throw new BulunamadiHatasi();

  const yeniDurum = !urun.markettePaylasilsin;

  await prisma.kullaniciKazanim.update({
    where: { id: urun.id },
    data: { markettePaylasilsin: yeniDurum },
  });

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
