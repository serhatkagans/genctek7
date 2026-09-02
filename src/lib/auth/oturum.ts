import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "../db";
import { CEREZ_YOLU, ortam } from "../ortam";
import type { OturumKullanicisi } from "../yetki/tipler";
import { oturumGovdesiCoz, oturumGovdesiUret } from "./oturum-govde";

/**
 * Oturum, imzalı bir çerezde `kullanici.id`'yi ve SON KULLANMA ANINI taşır.
 * Rol ve kapsam bilgisi her istekte veritabanından okunur; çereze yazılmaz,
 * aksi halde rolü geri alınan bir kullanıcı oturumu bitene kadar yetkili
 * kalır.
 *
 * NİYE SATIR KİMLİĞİ, AUTHPROVIDER KİMLİĞİ DEĞİL: gövde okunabilir (base64url
 * şifreleme değildir) ve SSO bağlandığında `auth_provider_id` T.C. kimlik
 * numarası taşıyacak. Gerekçenin tamamı oturum-govde.ts başlığındadır.
 *
 * SON KULLANMA NİYE GÖVDENİN İÇİNDE: çerezin `maxAge` alanını TARAYICI uygular,
 * sunucu değil. Gövde yalnızca kimliği taşısaydı, çerez değerini bir kez
 * kopyalayan (tarayıcı geliştirici araçları, paylaşılan makinedeki yedek,
 * günlüğe düşmüş bir istek) kişi onu SÜRESİZ kullanabilirdi — 8 saatlik ömür
 * yalnızca dürüst istemci için geçerli olurdu. İmza gövdenin tamamını
 * kapsadığı için süre de kurcalanamaz.
 */

const CEREZ_ADI = "genctek_oturum";
const CEREZ_OMRU_SANIYE = 60 * 60 * 8;

function imzala(veri: string): string {
  return createHmac("sha256", ortam.OTURUM_GIZLI_ANAHTARI)
    .update(veri)
    .digest("base64url");
}

function imzaDogrula(veri: string, imza: string): boolean {
  const beklenen = Buffer.from(imzala(veri));
  const gelen = Buffer.from(imza);
  if (beklenen.length !== gelen.length) return false;
  return timingSafeEqual(beklenen, gelen);
}

export async function oturumAc(kullaniciId: number): Promise<void> {
  const govde = oturumGovdesiUret(
    kullaniciId,
    Date.now() + CEREZ_OMRU_SANIYE * 1000,
  );
  const cerezDeposu = await cookies();
  cerezDeposu.set(CEREZ_ADI, `${govde}.${imzala(govde)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    // Alt dizine kurulduğunda çerez oraya daraltılır; aynı alan adındaki
    // başka uygulamalara oturum jetonu gitmez (bkz. ortam.ts · CEREZ_YOLU).
    path: CEREZ_YOLU,
    maxAge: CEREZ_OMRU_SANIYE,
  });
}

export async function oturumKapat(): Promise<void> {
  const cerezDeposu = await cookies();
  // Silme de aynı yolla yapılmalı: yol eşleşmezse tarayıcı çerezi silmez ve
  // "çıkış yaptım ama hâlâ girişteyim" durumu doğar.
  cerezDeposu.set(CEREZ_ADI, "", { path: CEREZ_YOLU, maxAge: 0 });
}

/**
 * Çerezi doğrulayıp `kullanici.id`'yi döndürür.
 *
 * İmzası tutmayan, biçimi bozuk veya süresi dolmuş çerez için `null` döner ve
 * çağıran taraf kişiyi giriş ekranına gönderir. Bu üç durum arasında AYRIM
 * YAPILMAZ: hepsinin doğru cevabı "yeniden giriş yapın"dır.
 *
 * ESKİ BİÇİMDEKİ ÇEREZLER (AuthProvider kimliği taşıyanlar ve son kullanması
 * olmayanlar) sayıya çözülmedikleri için geçersiz sayılır. Bu sürüm yayına
 * alındığında açık oturumlar bir kez giriş ekranına düşer; eski bir jetonu
 * geriye dönük uyumluluk uğruna kabul etmektense yeğlenen sonuç budur.
 */
async function cerezdenKimlikOku(): Promise<number | null> {
  const cerezDeposu = await cookies();
  const deger = cerezDeposu.get(CEREZ_ADI)?.value;
  if (!deger) return null;

  const [govde, imza] = deger.split(".");
  if (!govde || !imza || !imzaDogrula(govde, imza)) return null;

  return oturumGovdesiCoz(govde);
}

/**
 * Oturumdaki kullanıcıyı aktif rolleriyle birlikte getirir.
 * Rolü olmayan kullanıcı da döner (danışmanlık işaretlemeyen öğretmen gibi);
 * yetki kararlarını izinler.ts verir.
 */
export async function oturumKullanicisi(): Promise<OturumKullanicisi | null> {
  const kullaniciId = await cerezdenKimlikOku();
  if (kullaniciId === null) return null;

  const kullanici = await prisma.kullanici.findUnique({
    where: { id: kullaniciId },
    include: {
      roller: {
        where: { bitisTarihi: null },
        select: { rolKodu: true, ilKodu: true, kurumKodu: true },
      },
    },
  });

  if (!kullanici || !kullanici.aktif) return null;

  return {
    id: kullanici.id,
    ad: kullanici.ad,
    soyad: kullanici.soyad,
    kurumKodu: kullanici.kurumKodu,
    ilKodu: kullanici.ilKodu,
    ilceKodu: kullanici.ilceKodu,
    sinif: kullanici.sinif,
    brans: kullanici.brans,
    egitimOgretimYili: kullanici.egitimOgretimYili,
    roller: kullanici.roller,
  };
}

/**
 * Oturum yoksa giriş ekranına gönderir.
 *
 * Hata fırlatmak yerine yönlendirme yapılıyor: oturumun süresi dolduğunda ya da
 * kullanıcı pasife alındığında kişi "beklenmeyen hata" ekranı değil giriş
 * ekranı görmeli — bu bir arıza değil, olağan bir durum.
 *
 * BURAYA "GİRİŞTEN SONRA ŞU SAYFAYA DÖN" EKLENMEZ. Denendi ve işe yaramıyor:
 * panel düzeni (app/panel/layout.tsx) oturumu SAYFADAN ÖNCE kontrol edip
 * /giris'e yönlendiriyor, yani sayfanın verdiği dönüş yolu hiç çalışmıyordu.
 * Portaldan gelen ziyaretçinin akışı bunun yerine giriş ekranının kendisinde
 * çözülüyor: bağlantı `/giris?nereye=...` biçiminde geliyor
 * (bkz. lib/auth/donus-yolu.ts ve app/giris/page.tsx).
 */
export async function oturumKullanicisiZorunlu(): Promise<OturumKullanicisi> {
  const kullanici = await oturumKullanicisi();
  if (!kullanici) {
    redirect("/giris");
  }
  return kullanici;
}
