"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { aktifAtamaGetir } from "@/lib/danisman/atama";
import {
  belgeKoduGecerliMi,
  belgeleriOnayla,
  onayDurumlari,
} from "@/lib/kvkk/onay";
import { erisimLogla } from "@/lib/yetki/log";
import { ogrenciMi } from "@/lib/yetki/izinler";

/**
 * İlk giriş onayı — belgelerin tamamı tek işlemde onaylanır.
 *
 * Kısmi onay KABUL EDİLMEZ: kapının anlamı "belgeleri okumadan sisteme
 * girilmez"; birini işaretleyip diğerini atlayan kişi kapıdan geçmiş sayılamaz.
 * Tarayıcı tarafında `required` var ama karar burada da veriliyor — istemci
 * doğrulaması bir kolaylıktır, kural değildir.
 */
export async function ilkGirisOnaylaEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const secilenler = veri.getAll("belge").filter(belgeKoduGecerliMi);
  const durumlar = await onayDurumlari(kullanici);

  const eksik = durumlar.filter(
    (durum) => !secilenler.includes(durum.tanim.belge),
  );
  if (eksik.length > 0) {
    const adlar = eksik.map((durum) => durum.tanim.baslik).join(", ");
    redirect(
      `/onay?hata=${encodeURIComponent(`Şu belgeler onaylanmadı: ${adlar}`)}`,
    );
  }

  const onaylananlar = await belgeleriOnayla(kullanici, secilenler);

  /*
   * Onay ERİŞİM KAYDINA yazılır. Belgelerin amacı "kim, neye, ne zaman erişme
   * yetkisi aldı" sorusunu cevaplayabilmek; onayın kendisi de o zincirin
   * parçasıdır. Belge adları tek satırda toplanıyor, her belge için ayrı kayıt
   * açılmıyor: bu tek bir kullanıcı eylemidir.
   */
  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: `İlk giriş onayı verildi: ${onaylananlar
      .map((tanim) => tanim.baslik)
      .join(", ")}`,
  });

  revalidatePath("/panel", "layout");

  /*
   * Giriş akışının yönlendirmesi burada GERİ KAZANDIRILIR: kapı araya girdiği
   * için app/giris/eylemler.ts'nin hedefi kayboluyor. Kural onunla AYNI
   * olmalı, yoksa ilk giriş ile sonraki girişler farklı ekrana düşerdi:
   * danışmansız öğrenci seçim ekranına, HERKES profiline (7 Ağustos 2026 ·
   * "tüm kullanıcı grupları için ilk açılınca profil sekmesi ile başlasın").
   */
  if (ogrenciMi(kullanici) && (await aktifAtamaGetir(kullanici.id)) === null) {
    redirect("/panel/danisman-secim");
  }

  redirect("/panel");
}
