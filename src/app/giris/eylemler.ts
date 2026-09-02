"use server";

import { redirect } from "next/navigation";
import { guvenliDonusYolu } from "@/lib/auth/donus-yolu";
import { oturumKapat, oturumKullanicisi } from "@/lib/auth/oturum";
import { disKimlikliMi } from "@/lib/dis-kimlik/giris";
import { girisYap } from "@/lib/kullanici/giris-akisi";
import { kimlikDogrulamaLogla } from "@/lib/yetki/log";

export async function girisEylemi(veri: FormData): Promise<void> {
  const kimlikBilgisi = String(veri.get("kimlikBilgisi") ?? "");
  /*
   * Dönüş yolu, giriş ekranına portaldan gelen kişinin tıkladığı sayfadır
   * (bkz. lib/auth/donus-yolu.ts). Değer adres çubuğundan geldiği için ASLA
   * doğrudan kullanılmaz; `guvenliDonusYolu` uygulama dışına çıkan her şeyi
   * eler ve elenirse akış olağan yoluna (panel) döner.
   */
  const nereye = guvenliDonusYolu(String(veri.get("nereye") ?? ""));
  // Hata dönüşünde de korunur: kişi kimlik seçemediğinde nereden geldiğini
  // unutan bir ekrana düşerse, portaldan gelen bağlantı ilk hatada kaybolurdu.
  const nereyeSorgusu = nereye
    ? `&nereye=${encodeURIComponent(nereye)}`
    : "";

  if (!kimlikBilgisi) {
    await kimlikDogrulamaLogla({
      islem: "GIRIS",
      basarili: false,
      saglayici: "EBA",
      neden: "kimlik seçilmedi",
    });
    redirect(`/giris?hata=Kimlik+se%C3%A7ilmedi${nereyeSorgusu}`);
  }

  const sonuc = await girisYap(kimlikBilgisi);

  if (sonuc.durum === "BASARISIZ") {
    redirect(
      `/giris?hata=${encodeURIComponent(sonuc.mesaj)}${nereyeSorgusu}`,
    );
  }

  redirect(girisSonrasiYol(sonuc, nereye));
}

/**
 * Giriş sonrası açılacak ekran.
 *
 * HERKES PROFİLLE KARŞILANIR (7 Ağustos 2026 · istek: "tüm kullanıcı grupları
 * için ilk açılınca profil sekmesi ile başlasın, panel ile değil").
 *
 * Önceden yalnızca öğrenci profile düşüyordu (C3 · 5 Ağustos); öğretmen,
 * koordinatör ve merkez panele giriyordu. Kural artık rolden bağımsız —
 * profil, kişinin kendini gördüğü ve tanıttığı yer ve menüde de ilk sekme.
 * Rol ayrımı, aynı soruya iki cevap vermek olurdu.
 *
 * DANIŞMAN SEÇİMİ HÂLÂ ÖNCELİKLİDİR: danışmansız öğrenci "boşta" kalamaz
 * (SKILL.md · Değişmezler 2), o yüzden seçim ekranı bir kapıdır ve profilin
 * önüne geçer. Seçimini yapan öğrenci sonraki girişinde profile düşer.
 *
 * `ogrenciMi` artık kullanılmıyor ama imzada DURUYOR: çağıran `girisYap`
 * sonucunu olduğu gibi geçiriyor ve alanı ayıklamak, ileride rol bazlı bir
 * kapı gerektiğinde geri eklenecek bir bilgiyi bugünden atmak olurdu.
 */
function girisSonrasiYol(
  sonuc: { danismanSecimiGerekli: boolean },
  nereye: string | null,
): string {
  /*
   * DANIŞMAN SEÇİMİ DÖNÜŞ YOLUNU DA YENER: danışmansız öğrenci "boşta"
   * kalamaz (SKILL.md · Değişmezler 2) ve seçim ekranı bir kapıdır. Portaldan
   * gelen öğrenci önce danışmanını seçer; etkinliği sonra açar.
   */
  if (sonuc.danismanSecimiGerekli) return "/panel/danisman-secim";
  if (nereye) return nereye;
  return "/panel";
}

/**
 * Çıkış, KİŞİYİ GİRDİĞİ KAPIYA bırakır (11 Ağustos 2026 · istek: "e-Devlet
 * girişiyle giren, çıkınca EBA girişindeki kullanıcılara düşüyor").
 *
 * Mezun, paydaş temsilcisi ve mentör /dis-giris'ten gelir; onları /giris'e
 * bırakmak, hiç giremeyecekleri bir listenin önünde bırakmak olurdu. Ölçüt
 * `dis_kimlik` satırıdır, rol değil (bkz. lib/dis-kimlik/giris.ts).
 *
 * Sorgu OTURUM KAPANMADAN ÖNCE yapılır: çerez silindikten sonra kimin çıktığı
 * bilinemez.
 */
export async function cikisEylemi(): Promise<void> {
  const kullanici = await oturumKullanicisi();
  const disKullanici = kullanici
    ? await disKimlikliMi(kullanici.authProviderId)
    : false;

  if (kullanici) {
    await kimlikDogrulamaLogla({
      islem: "CIKIS",
      basarili: true,
      kullaniciId: kullanici.id,
      saglayici: disKullanici ? "dış kimlik" : "EBA",
    });
  }
  await oturumKapat();
  redirect(disKullanici ? "/dis-giris" : "/giris");
}
