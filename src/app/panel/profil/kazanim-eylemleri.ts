"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { cvKaydet, cvSil, cvSinirlariniGetir } from "@/lib/ogrenci/cv";
import {
  kazanimEkiSil,
  kazanimEkleriniKaydet,
  kazanimEkSinirlariniGetir,
} from "@/lib/kazanim/ek";
import {
  kazanimKabulEdilirMi,
  kazanimTipiTanimi,
} from "@/lib/kazanim/kurallar";
import { gunBasi } from "@/lib/tarih";
import { ogrenciMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import {
  BulunamadiHatasi,
  type OturumKullanicisi,
  YetkiHatasi,
} from "@/lib/yetki/tipler";

/**
 * Kişinin kendi kazanım kayıtları ve öğrencinin CV'si —
 * references/domain-rules.md Bölüm 14.
 *
 * Hepsi oturumdaki kişinin KENDİ verisi üzerinde çalışır: `kullaniciId` hiçbir
 * yerde form girdisinden okunmaz, her zaman `kullanici.id`'dir. Danışman ya da
 * koordinatör bir öğrencinin kazanımını giremez/silemez — bunlar beyandır ve
 * sahibi dışında kimse dokunmaz (çalışma grubu eklemeden farkı budur).
 *
 * Kazanım kaydı da CV de ÖĞRETMENE AÇIKTIR (7 Ağustos 2026). CV'nin hangi
 * profil tablosuna yazılacağı kişinin kendi rolünden okunur, form girdisinden
 * değil (bkz. cvSahibi).
 */

/**
 * Formların yaşadığı ekran — dönüş adresi.
 *
 * `/panel/profil` DEĞİL (C4 · 7 Ağustos 2026): kayıt ekleme ve CV formları
 * Panelim'e taşındı, profil salt okunur oldu.
 *
 * `bolum` parametresi çıpadan ayrı gönderilir: bölümler katlanabilir
 * `<details>` öğeleri ve kapalı bir öğenin çapasına inmek, kullanıcıyı az önce
 * doldurduğu formun kapanmış hâline götürürdü.
 */
const YOL = "/panel";

/**
 * Kayıt formlarının yeni evi (21 Ağustos 2026 · istek: "Kayıtlarım … kendi
 * sayfaları olsun, kayıtlarım ismi bilişim yolculuğum olsun").
 *
 * Kayıt eylemleri panele değil buraya dönüyor: kişi kaydı hangi ekranda
 * girdiyse iletiyi de orada okumalı. CV eylemleri panelde kaldı — o bölüm
 * taşınmadı.
 */
const KAYIT_YOLU = "/panel/bilisim-yolculugum";

function panele(capa: string, sorgu: string): never {
  redirect(`${YOL}?bolum=${capa}&${sorgu}#${capa}`);
}

function kayitlaraDon(sorgu: string): never {
  redirect(`${KAYIT_YOLU}?${sorgu}`);
}

function hataylaDon(mesaj: string): never {
  kayitlaraDon(`hata=${encodeURIComponent(mesaj)}`);
}

/** CV iki yerde görünüyor: panel ve kişinin envanterdeki detayı. */
function cvYollariniTazele(kullanici: OturumKullanicisi): void {
  revalidatePath(YOL);
  revalidatePath(
    ogrenciMi(kullanici)
      ? `/panel/ogrenciler/${kullanici.id}`
      : `/panel/ogretmenler/${kullanici.id}`,
  );
}

/** CV, kayıtlardan AYRI bir bölüm; uyarısı da orada görünmeli. */
function cvHatasi(mesaj: string): never {
  panele("cvm", `hata=${encodeURIComponent(mesaj)}`);
}

/**
 * CV artık ÖĞRETMENDE DE var (7 Ağustos 2026 · istek: öğretmen profilinde
 * "Özgeçmiş"). Kapı bu yüzden kalktı; yerine "hangi profil tablosuna" sorusu
 * geldi ve cevabı kişinin kendi rolünden okunuyor — form girdisinden değil.
 *
 * Dış kullanıcılar (mezun, paydaş, mentör) de `ogretmen_profil` satırını
 * kullanıyor; onların da CV'si buraya yazılır.
 */
function cvSahibi(kullanici: OturumKullanicisi): "OGRENCI" | "OGRETMEN" {
  return ogrenciMi(kullanici) ? "OGRENCI" : "OGRETMEN";
}

/**
 * Kayıt sonrası tazelenecek ekranlar.
 *
 * Kazanım aynı anda üç yerde görünüyor: panel, katkı ekranı ve kişinin
 * envanterdeki detay sayfası. Detay sayfasının yolu role göre değişir
 * (`ogrenciler` / `ogretmenler`); tazelenmezse yetkili, öğrencinin az önce
 * girdiği kaydı eski önbellekten göremezdi.
 */
function kazanimYollariniTazele(kullanici: OturumKullanicisi): void {
  revalidatePath(YOL);
  revalidatePath(KAYIT_YOLU);
  revalidatePath("/panel/gorevlerim");
  revalidatePath("/panel/kazanimlarim");
  revalidatePath(
    ogrenciMi(kullanici)
      ? `/panel/ogrenciler/${kullanici.id}`
      : `/panel/ogretmenler/${kullanici.id}`,
  );
}

export async function kazanimEkleEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  /*
   * Programın ADI form girdisinden okunmaz, id'siyle veritabanından çekilir:
   * ad da gönderilseydi listede olmayan bir metni "GençTek programı" diye
   * kaydettirmek mümkün olurdu. Pasife alınmış program yeni kayıtta seçilemez,
   * eski kayıtların bağlantısı korunur.
   */
  const programId = Number.parseInt(
    String(veri.get("temelEtkinlikProgramiId") ?? ""),
    10,
  );
  const program = Number.isFinite(programId)
    ? await prisma.temelEtkinlikProgrami.findFirst({
        where: { id: programId, aktif: true },
        select: { id: true, ad: true },
      })
    : null;
  if (Number.isFinite(programId) && !program) {
    hataylaDon("Seçilen GençTek etkinliği bulunamadı.");
  }

  const karar = kazanimKabulEdilirMi({
    tip: String(veri.get("tip") ?? ""),
    baslik: String(veri.get("baslik") ?? ""),
    aciklama: String(veri.get("aciklama") ?? ""),
    // Gün başına alınır: kazanımlarda saat bilgisi sorulmuyor.
    tarih: gunBasi(String(veri.get("tarih") ?? "") || null),
    baglantiUrl: String(veri.get("baglantiUrl") ?? ""),
    derece: String(veri.get("derece") ?? ""),
    duzenleyen: String(veri.get("duzenleyen") ?? ""),
    katilimBicimi: String(veri.get("katilimBicimi") ?? ""),
    hedefKitle: String(veri.get("hedefKitle") ?? ""),
    gelistirenEkip: String(veri.get("gelistirenEkip") ?? ""),
    markettePaylasilsin: veri.get("markettePaylasilsin") === "evet",
    /*
     * Bağlantı satırları paralel iki dizi olarak gelir (adres[i] ↔ etiket[i]).
     * Formda sabit sayıda satır basıldığı için boşlar da geliyor; kural
     * katmanı onları eliyor.
     */
    baglantilar: veri.getAll("baglantiAdres").map((adres, sira) => ({
      adres: String(adres),
      etiket: String(veri.getAll("baglantiEtiket")[sira] ?? ""),
    })),
    program,
  });
  if (!karar.olurMu) hataylaDon(karar.neden);

  const kazanim = await prisma.kullaniciKazanim.create({
    data: {
      kullaniciId: kullanici.id,
      ...karar.kayit,
      baglantilar: { create: karar.baglantilar },
    },
    select: { id: true },
  });

  /*
   * Destekleyici belgeler kayıttan SONRA yazılır: eke bağlanacak kazanım
   * kimliği önce doğmalı. Dosya reddedilirse kazanım kaydı geri alınmaz —
   * kullanıcı yazdığı metni kaybetmesin; uyarı ekranda gösterilir ve dosya
   * sonradan eklenebilir.
   */
  const belgeler = veri
    .getAll("belgeler")
    .filter((deger): deger is File => deger instanceof File && deger.size > 0);

  let ekUyarisi: string | undefined;
  if (belgeler.length > 0) {
    const sonuc = await kazanimEkleriniKaydet({
      kazanimId: kazanim.id,
      dosyalar: belgeler,
      sinirlar: await kazanimEkSinirlariniGetir(),
    });
    ekUyarisi = sonuc.uyari;
  }

  const sahip = ogrenciMi(kullanici) ? "OGRENCI" : "OGRETMEN";
  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: `Kazanım eklendi (${kazanimTipiTanimi(karar.kayit.tip, sahip).baslik}): ${karar.kayit.baslik}`,
  });

  kazanimYollariniTazele(kullanici);
  // Tür adreste taşınır: art arda üç ürün girecek kişi her seferinde sekmeyi
  // yeniden seçmek zorunda kalmasın.
  if (ekUyarisi) {
    kayitlaraDon(
      `tur=${karar.kayit.tip}&hata=${encodeURIComponent(
        `Kayıt eklendi ancak belge yüklenemedi — ${ekUyarisi}`,
      )}`,
    );
  }
  kayitlaraDon(`tur=${karar.kayit.tip}&durum=kazanim-eklendi`);
}

/** Var olan bir kazanım kaydına destekleyici belge ekler. */
export async function kazanimBelgeEkleEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const kazanimId = Number.parseInt(String(veri.get("kazanimId") ?? ""), 10);
  if (!Number.isFinite(kazanimId)) throw new BulunamadiHatasi();

  // Sahiplik kontrolü: kullaniciId koşulu olmadan başkasının kaydına dosya
  // eklenebilirdi.
  const kazanim = await prisma.kullaniciKazanim.findFirst({
    where: { id: kazanimId, kullaniciId: kullanici.id },
    select: { id: true, baslik: true },
  });
  if (!kazanim) throw new BulunamadiHatasi();

  const belgeler = veri
    .getAll("belgeler")
    .filter((deger): deger is File => deger instanceof File && deger.size > 0);
  if (belgeler.length === 0) hataylaDon("Belge seçilmedi.");

  const sonuc = await kazanimEkleriniKaydet({
    kazanimId: kazanim.id,
    dosyalar: belgeler,
    sinirlar: await kazanimEkSinirlariniGetir(),
  });
  if (sonuc.uyari) hataylaDon(sonuc.uyari);

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: `Kazanıma ${sonuc.eklenen} destekleyici belge eklendi: ${kazanim.baslik}`,
  });

  kazanimYollariniTazele(kullanici);
  kayitlaraDon("durum=belge-eklendi");
}

/** Destekleyici belgeyi kaldırır. */
export async function kazanimBelgeSilEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const ekId = Number.parseInt(String(veri.get("ekId") ?? ""), 10);
  if (!Number.isFinite(ekId)) throw new BulunamadiHatasi();

  const sonuc = await kazanimEkiSil({ ekId, kullaniciId: kullanici.id });
  if (!sonuc.silindiMi) throw new BulunamadiHatasi();

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "SILME",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: `Kazanım belgesi silindi: ${sonuc.dosyaAdi}`,
  });

  kazanimYollariniTazele(kullanici);
  kayitlaraDon("durum=belge-silindi");
}

export async function kazanimSilEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const kazanimId = Number.parseInt(String(veri.get("kazanimId") ?? ""), 10);
  if (!Number.isFinite(kazanimId)) throw new BulunamadiHatasi();

  /*
   * Silme `deleteMany` ile ve kullaniciId koşuluyla yapılır: `delete` ile id'ye
   * göre silinseydi forma başkasının kazanım id'sini yazan kullanıcı o kaydı
   * silebilirdi. Sahiplik kontrolü ve silme tek sorguda birleşiyor.
   */
  const kazanim = await prisma.kullaniciKazanim.findFirst({
    where: { id: kazanimId, kullaniciId: kullanici.id },
    select: { baslik: true },
  });
  if (!kazanim) throw new BulunamadiHatasi();

  await prisma.kullaniciKazanim.deleteMany({
    where: { id: kazanimId, kullaniciId: kullanici.id },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "SILME",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: `Kazanım silindi: ${kazanim.baslik}`,
  });

  kazanimYollariniTazele(kullanici);
  kayitlaraDon("durum=kazanim-silindi");
}

export async function cvYukleEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const dosya = veri.get("cv");
  if (!(dosya instanceof File) || dosya.size === 0) {
    cvHatasi("CV dosyası seçilmedi.");
  }

  const sonuc = await cvKaydet({
    ogrenciId: kullanici.id,
    dosya,
    sinirlar: await cvSinirlariniGetir(),
    sahip: cvSahibi(kullanici),
  });
  if (!sonuc.olurMu) cvHatasi(sonuc.neden ?? "CV yüklenemedi.");

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: `CV yüklendi: ${dosya.name}`,
  });

  cvYollariniTazele(kullanici);
  panele("cvm", "durum=cv-yuklendi");
}

export async function cvSilEylemi(): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const silindi = await cvSil(kullanici.id, cvSahibi(kullanici));
  if (!silindi) cvHatasi("Kaldırılacak bir CV bulunamadı.");

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "SILME",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: "CV kaldırıldı",
  });

  cvYollariniTazele(kullanici);
  panele("cvm", "durum=cv-silindi");
}
