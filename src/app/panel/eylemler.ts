"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { danismanMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import { BulunamadiHatasi, YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * Bildirim okundu işaretleme.
 *
 * Bildirim tekrarını `bildirimGonder` okunmamış kayda bakarak engelliyor; okuma
 * imkânı olmazsa aynı uyarı bir daha hiç düşmez ve panel de kalıcı olarak dolu
 * kalır. Bu yüzden okuma, bildirim akışının isteğe bağlı değil zorunlu parçası.
 *
 * İKİ EKRAN TAZELENİR (12 Ağustos 2026): Panelim'in okunmamış bölümü ve
 * bildirim arşivi (`/panel/bildirimler`) aynı kaydı gösteriyor. Yalnızca biri
 * tazelenseydi, birinden okundu işaretlenen bildirim öbüründe okunmamış
 * görünmeye devam ederdi.
 */

export async function bildirimOkunduEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const bildirimId = Number.parseInt(String(veri.get("bildirimId") ?? ""), 10);
  if (!Number.isFinite(bildirimId)) throw new BulunamadiHatasi();

  // Sahiplik koşulu sorgunun içinde: başkasının bildirimi hiç eşleşmez.
  const sonuc = await prisma.bildirim.updateMany({
    where: { id: bildirimId, kullaniciId: kullanici.id, okunduMu: false },
    data: { okunduMu: true },
  });
  if (sonuc.count === 0) throw new BulunamadiHatasi();

  revalidatePath("/panel");
  revalidatePath("/panel/bildirimler");
}

export async function tumBildirimleriOkuEylemi(): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  await prisma.bildirim.updateMany({
    where: { kullaniciId: kullanici.id, okunduMu: false },
    data: { okunduMu: true },
  });

  revalidatePath("/panel");
  revalidatePath("/panel/bildirimler");
}

/**
 * YEĞİTEK OKUL SORUMLUSU İŞARETİ (13 Ağustos 2026 · istek: "okuldaki danışman
 * öğretmenlerden bazıları YEĞİTEK Okul Sorumlusu olarak görev alıyor olabilir
 * … eğer YEĞİTEK okul sorumlusu ise o alanı işaretlesin").
 *
 * DANIŞMANLIK İŞARETİYLE AYNI DESEN (bkz. lib/ogretmen/danismanlik.ts): onay
 * yoktur, kişi kendi işaretler. Görev okul idaresi ile YEĞİTEK arasında zaten
 * verilmiştir; sistem onu kaydeder, dağıtmaz.
 *
 * İŞARET YETKİ VERMEZ: hiçbir kapsam filtresi bu alanı okumuyor. Tek karşılığı,
 * merkezin yönetim panosundaki listede görünmek.
 *
 * KOŞUL DANIŞMANLIK: işaret yalnızca danışmanlık görevini almış öğretmende
 * anlamlı — okulun YEĞİTEK muhatabı, okulda GençTek işini yürüten kişidir.
 * Görevini bırakan öğretmende işaret de kalkar (aşağıdaki `danismanMi`
 * kontrolü, formu görmeyen birinin adres üzerinden işaret koymasını da
 * engeller).
 */
export async function yegitekSorumlusuIsaretiEylemi(
  veri: FormData,
): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!danismanMi(kullanici)) {
    throw new YetkiHatasi(
      "YEĞİTEK Okul Sorumlusu işaretini yalnızca danışman öğretmen koyabilir.",
    );
  }

  const sorumluMu = veri.get("sorumluMu") === "evet";
  const simdi = new Date();

  await prisma.ogretmenProfil.upsert({
    where: { kullaniciId: kullanici.id },
    update: {
      yegitekOkulSorumlusu: sorumluMu,
      yegitekIsaretlemeTarihi: sorumluMu ? simdi : null,
    },
    create: {
      kullaniciId: kullanici.id,
      yegitekOkulSorumlusu: sorumluMu,
      yegitekIsaretlemeTarihi: sorumluMu ? simdi : null,
    },
  });

  /*
   * ERİŞİM KAYDI TUTULUYOR: işaret, merkezin listesine giren bir beyandır ve
   * "bu kişi ne zaman kendini sorumlu ilan etti" sorusunun cevabı kayıtta
   * durmalı.
   */
  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: sorumluMu
      ? "YEĞİTEK Okul Sorumlusu işareti kondu"
      : "YEĞİTEK Okul Sorumlusu işareti kaldırıldı",
  });

  revalidatePath("/panel");
  revalidatePath("/panel/okul-sorumlulari");
  redirect(
    `/panel?durum=${sorumluMu ? "yegitek-isaretlendi" : "yegitek-kaldirildi"}#yegitek-sorumlulugum`,
  );
}
