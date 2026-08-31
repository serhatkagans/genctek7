"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DuyuruFormDurumu } from "@/components/DuyuruFormu";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { topluDuyuruGonder } from "@/lib/bildirim/gonder";
import { duyuruyuCoz } from "@/lib/bildirim/toplu";
import {
  topluAliciListesi,
  topluHedefSecenekleri,
} from "@/lib/bildirim/toplu-alicilar";
import { topluMesajGonderebilirMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import { YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * Toplu mesaj gönderimi — proje yöneticisi ve il koordinatörü.
 *
 * KAPI DEĞİŞTİ (31 Ağustos 2026 · istek: "il koordinatörü yönetim panelinde
 * toplu mesaj kartı ekle"). Eskiden `sistemAyarlariniYonetebilirMi` idi ve
 * gerekçesi "duyuru da bildirim şablonu gibi TÜM kullanıcılara giden bir
 * metindir"di. O gerekçe koordinatör için geçerli değil: onun mesajı ilini
 * aşmıyor. Ayrı izin fonksiyonu açıldı (`topluMesajGonderebilirMi`), çünkü
 * aynısını kullanmak koordinatöre şablonları ve çalışma gruplarını da açardı.
 *
 * KİTLE KAPSAMDAN ÜRETİLİYOR: hangi hedefe yazabileceğine
 * lib/bildirim/toplu-alicilar.ts karar veriyor ve o liste ekran basılırken de
 * gönderim sırasında da AYNI fonksiyondan çıkıyor — ekranda görünmek yetki
 * değildir, listede olmayan anahtar burada reddediliyor.
 */

const YOL = "/panel/duyurular";

/**
 * HATA ARTIK YÖNLENDİRMİYOR, DURUM DÖNDÜRÜYOR (12 Ağustos 2026 · istek: "onay
 * kutusunu işaretlemeden gönder deyince mesaj gitmiyor — bu normal, ancak
 * yazdığı başlık ve metin siliniyor").
 *
 * Eskiden `?hata=...` adresine yönlendiriliyordu; sayfa yeniden çizilince form
 * boş geliyor ve 4000 karaktere kadar yazılabilen metin uçuyordu. Değerleri
 * adres çubuğunda geri taşımak da olmazdı — uzun metin URL sınırlarını zorlar.
 * Form artık `useActionState` ile çalışıyor ve yazılanlar tarayıcıda kalıyor
 * (bkz. components/DuyuruFormu.tsx).
 *
 * BAŞARIDA HÂLÂ YÖNLENDİRME VAR: gönderilen duyuru geri alınamaz, sayfanın
 * yenilenmesi gönderimi tekrarlamamalı (POST/Redirect/GET).
 */
function hatayla(
  mesaj: string,
  degerler: DuyuruFormDurumu["degerler"],
): DuyuruFormDurumu {
  return { hata: mesaj, degerler };
}

export async function duyuruGonderEylemi(
  _oncekiDurum: DuyuruFormDurumu,
  veri: FormData,
): Promise<DuyuruFormDurumu> {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!topluMesajGonderebilirMi(kullanici)) {
    throw new YetkiHatasi(
      "Toplu mesajı proje yöneticisi ve il koordinatörü gönderebilir.",
    );
  }

  // Kullanıcının yazdıkları: her ret yolunda forma geri konuyor.
  const degerler = {
    hedef: String(veri.get("hedef") ?? ""),
    baslik: String(veri.get("baslik") ?? ""),
    icerik: String(veri.get("icerik") ?? ""),
  };

  /*
   * İZİNLİ HEDEFLER GÖNDERENİN KAPSAMINDAN: `EKIP:12` anahtarı biçim olarak
   * her koordinatörde geçerli görünür, kapsam olarak yalnızca ilinin ekibinde.
   * Liste burada yeniden üretiliyor — formdaki seçeneklere güvenilseydi,
   * elle kurulmuş bir istek başka ilin ekibine mesaj atardı.
   */
  const secenekler = await topluHedefSecenekleri(kullanici);
  const karar = duyuruyuCoz(
    { ...degerler, onaylandiMi: veri.get("onay") === "evet" },
    secenekler.map((secenek) => secenek.deger),
  );
  if (!karar.olurMu) return hatayla(karar.neden, degerler);

  /*
   * ALICILAR TEK YERDEN: sayıyı ekranda gösteren fonksiyonla aynı koşulu
   * kullanıyor (bkz. toplu-alicilar.ts). Koşul burada elle yazılsaydı ekranda
   * "312 kişi" yazıp 400 kişiye giden bir duyuru mümkün olurdu.
   */
  const alicilar = await topluAliciListesi(kullanici, karar.hedef);
  if (!alicilar) {
    return hatayla("Bu alıcı grubuna toplu mesaj gönderemezsiniz.", degerler);
  }

  if (alicilar.idler.length === 0) {
    return hatayla(
      "Seçtiğiniz gruba uyan aktif kullanıcı yok; mesaj gönderilmedi.",
      degerler,
    );
  }

  const sonuc = await topluDuyuruGonder({
    aliciIdleri: alicilar.idler,
    baslik: karar.baslik,
    icerik: karar.icerik,
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "BILDIRIM_SABLONU",
    hedefId: "TOPLU_DUYURU",
    /*
      DENETİM KAYDINA HAM ANAHTAR DEĞİL ETİKET YAZILIYOR: "EKIP:12" satırı,
      kaydı altı ay sonra okuyan kişiye hiçbir şey söylemez; ekip o tarihe
      kadar kapanmış bile olabilir.
    */
    detay: `Toplu mesaj gönderildi (${alicilar.etiket}, ${sonuc.bildirimSayisi} kişi): ${karar.baslik}`,
  });

  revalidatePath(YOL);
  redirect(`${YOL}?durum=gonderildi&sayi=${sonuc.bildirimSayisi}`);
}
