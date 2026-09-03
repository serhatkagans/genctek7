import { createHash } from "node:crypto";
import type { LogHedefTip, LogIslemi } from "@/generated/prisma/enums";
import { prisma } from "../db";
import { istemciIpAdresi } from "../guvenlik/istemci-ip";

/**
 * Erişim logu — SKILL.md "Değişmezler" 7: her veri görüntüleme ve değiştirme
 * işlemi loglanır. Yorum silme ve dosya kaldırma da buraya yazılır; ayrı bir
 * içerik log tablosu yoktur.
 */

export interface LogKaydi {
  kullaniciId: number;
  islem: LogIslemi;
  hedefTip: LogHedefTip;
  hedefId: string | number;
  ipAdresi?: string | null;
  detay?: string | null;
}

/**
 * İsteği yapan IP adresi. Yalnızca HTTP isteği bağlamında vardır.
 *
 * `next/headers` DİNAMİK yükleniyor: gecelik senkron gibi istek bağlamı
 * olmayan işler de aynı log fonksiyonunu kullanıyor ve orada modülün kendisi
 * ya da headers() çağrısı hata verir. IP yüzünden log kaydı düşmemeli, o
 * yüzden hata yutuluyor ve alan null kalıyor.
 *
 * Adres ÇÖZÜMLEMESİ guvenlik/istemci-ip.ts'tedir: `x-forwarded-for` bir
 * ekleme zinciridir ve gerçek istemci SONDAN sayılarak bulunur. Zincirin
 * ilkini almak, isteği yapanın bu alana istediğini yazdırabilmesi demekti —
 * denetim kaydı için kabul edilemez.
 *
 * `ortam` da DİNAMİK yükleniyor: modül açılışta ortam değişkenlerini doğrular
 * ve bu dosyayı içe aktaran birim testlerde onlar yok.
 */
async function istekIpAdresi(): Promise<string | null> {
  try {
    const { headers } = await import("next/headers");
    const { ortam } = await import("../ortam");
    return istemciIpAdresi(await headers(), ortam.GUVENILEN_VEKIL_SAYISI);
  } catch {
    return null;
  }
}

export async function erisimLogla(kayit: LogKaydi): Promise<void> {
  await prisma.erisimlogu.create({
    data: {
      kullaniciId: kayit.kullaniciId,
      islem: kayit.islem,
      hedefTip: kayit.hedefTip,
      hedefId: String(kayit.hedefId),
      ipAdresi: kayit.ipAdresi ?? (await istekIpAdresi()),
      detay: kayit.detay ?? null,
    },
  });
}

export interface KimlikDogrulamaLogKaydi {
  islem: "GIRIS" | "CIKIS";
  basarili: boolean;
  /** Kimlik doğrulandıysa kullanıcı; başarısız ve bilinmeyen denemelerde null. */
  kullaniciId?: number | null;
  /** Ham değer günlüğe yazılmaz; yalnızca denemeleri ilişkilendiren özeti yazılır. */
  kimlikBilgisi?: string | null;
  saglayici: string;
  neden?: string | null;
  ipAdresi?: string | null;
}

/**
 * Oturum açma/kapama denetim izi.
 *
 * Başarısız girişin bir Kullanici satırı olmayabilir. Bu nedenle erişim logundaki
 * ilişki nullable'dır ve hedef kimliği, girilen değerin geri döndürülemez kısa
 * özetiyle tutulur. E-posta, T.C. kimlik numarası veya sağlayıcı kimliği ham
 * hâliyle denetim ekranına taşınmaz.
 */
export async function kimlikDogrulamaLogla(
  kayit: KimlikDogrulamaLogKaydi,
): Promise<void> {
  const kimlikOzeti = kayit.kimlikBilgisi
    ? createHash("sha256")
        .update(kayit.kimlikBilgisi.trim().toLocaleLowerCase("tr-TR"))
        .digest("hex")
        .slice(0, 16)
    : null;
  const sonuc = kayit.basarili ? "başarılı" : "başarısız";
  const neden = kayit.neden ? ` · ${kayit.neden}` : "";

  await prisma.erisimlogu.create({
    data: {
      kullaniciId: kayit.kullaniciId ?? null,
      islem: kayit.islem,
      hedefTip: "OTURUM",
      hedefId:
        kayit.kullaniciId !== null && kayit.kullaniciId !== undefined
          ? String(kayit.kullaniciId)
          : kimlikOzeti
            ? `kimlik:${kimlikOzeti}`
            : "bilinmeyen",
      ipAdresi: kayit.ipAdresi ?? (await istekIpAdresi()),
      detay: `${kayit.islem === "GIRIS" ? "Oturum açma" : "Oturum kapama"} ${sonuc} (${kayit.saglayici})${neden}`,
    },
  });
}

/** Birden çok kaydın tek seferde görüntülenmesi (liste ekranları) için. */
export async function erisimLoglaCoklu(kayitlar: LogKaydi[]): Promise<void> {
  if (kayitlar.length === 0) return;
  const ip = await istekIpAdresi();
  await prisma.erisimlogu.createMany({
    data: kayitlar.map((kayit) => ({
      kullaniciId: kayit.kullaniciId,
      islem: kayit.islem,
      hedefTip: kayit.hedefTip,
      hedefId: String(kayit.hedefId),
      ipAdresi: kayit.ipAdresi ?? ip,
      detay: kayit.detay ?? null,
    })),
  });
}
