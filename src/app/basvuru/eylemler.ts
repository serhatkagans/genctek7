"use server";

import { redirect } from "next/navigation";
import { disBasvuruOlustur } from "@/lib/dis-kimlik/basvuru";
import { disBasvuruGirdisiniCoz } from "@/lib/dis-kimlik/kurallar";

/**
 * EBA dışı giriş başvurusu.
 *
 * ŞİFRE ADRES ÇUBUĞUNA TAŞINMAZ. Hata durumunda formun geri kalanı yeniden
 * doldurulsun diye alanlar sorgu dizesine yazılıyor ama şifre alanları bunun
 * dışında: tarayıcı geçmişinde, ters vekil günlüğünde ve paylaşılan bir
 * bağlantıda kalıcı olurdu. Kişi hata sonrası şifresini yeniden yazar.
 */
export async function basvuruEylemi(veri: FormData): Promise<void> {
  const metin = (alan: string) => String(veri.get(alan) ?? "");

  const girdi = {
    tur: metin("tur"),
    ad: metin("ad"),
    soyad: metin("soyad"),
    eposta: metin("eposta"),
    telefon: metin("telefon"),
    ilKodu: metin("ilKodu"),
    sifre: metin("sifre"),
    sifreTekrar: metin("sifreTekrar"),
    mezunKurumKodu: metin("mezunKurumKodu"),
    mezuniyetYili: metin("mezuniyetYili"),
    paydasId: metin("paydasId"),
    gorevUnvani: metin("gorevUnvani"),
    beyan: metin("beyan"),
    /*
     * MENTÖRLÜK (7 Ağustos 2026 · tek form). tur=MENTOR ise işaret gizli
     * alandan "evet" gelir; mezun ve paydaşta onay kutusundan.
     */
    mentorlukIstiyor: veri.get("mentorlukIstiyor") === "evet",
    mentorlukKonulari: metin("mentorlukKonulari"),
    mentorlukGrupIdleri: veri.getAll("mentorlukGrupId"),
  };

  // Hataya düşüldüğünde geri dönülecek adres: tür ve il korunur ki kişi
  // formun başına değil bıraktığı yere dönsün.
  const temelYol = `/basvuru?tur=${encodeURIComponent(girdi.tur)}&il=${encodeURIComponent(girdi.ilKodu)}`;

  const karar = disBasvuruGirdisiniCoz(girdi, new Date());
  if (!karar.olurMu) {
    redirect(`${temelYol}&hata=${encodeURIComponent(karar.neden)}`);
  }

  const sonuc = await disBasvuruOlustur(karar.kayit);
  if (sonuc.durum === "REDDEDILDI") {
    redirect(`${temelYol}&hata=${encodeURIComponent(sonuc.mesaj)}`);
  }

  redirect("/basvuru?durum=alindi");
}
