"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  cevaplariKabulEt,
  envanterAcikMi,
  envanterHazirMi,
  envanterTanimi,
  tamamlanabilirMi,
} from "@/lib/envanter/kurallar";
import { erisimLogla } from "@/lib/yetki/log";
import { BulunamadiHatasi } from "@/lib/yetki/tipler";

/**
 * Algoritmam — envanter eylemleri (E).
 *
 * Hepsi oturumdaki kişinin KENDİ verisi üzerinde çalışır: `kullaniciId` hiçbir
 * yerde form girdisinden okunmaz ve her sorgu onunla sınırlıdır. Envanter
 * sonuçları hedeflerden de dardır — danışman ve koordinatör bunları hiçbir
 * ekranda GÖRMEZ.
 *
 * ROL KISITI YOK, hedeflerdeki gerekçenin aynısı: kişi kendi satırından
 * başkasına erişemiyor. Menü girişi öğrenciye basılıyor (bkz. panel/layout),
 * ama adresi bilen bir öğretmenin kendi envanterini çözmesi zararsız.
 *
 * SONUÇLAR LOGLANMAZ, yalnızca uygulamanın AÇILDIĞI ve TAMAMLANDIĞI olayı
 * loglanır. Erişim logu bir denetim kaydıdır ve okuyabilen yetkililer var;
 * cevapların ya da boyut puanlarının log detayına yazılması, kişiye özel
 * tutulan veriyi yan kapıdan yetkiliye açardı.
 */

const KOK = "/panel/algoritmam";

function yol(kod: string): string {
  return `${KOK}/${encodeURIComponent(kod)}`;
}

/**
 * Envanter sayfası ve liste birlikte tazelenir.
 *
 * İKİSİ BİRDEN: liste kartı da uygulamanın durumunu ("yarım kaldı", "çözdün")
 * gösteriyor. Yalnızca envanter sayfası tazelenseydi, geri dönen öğrenci
 * listede eski durumu görürdü.
 *
 * Dinamik rota (`[kod]`) için düz adres YETİYOR — `revalidatePath(kalıp,
 * "page")` biçimi denendi, ikisi de aynı sonucu veriyor (eylem sonrası form
 * ~350 ms içinde geliyor) ve dar olanı seçildi: kalıp biçimi çözülmemiş
 * envanterlerin sayfalarını da gereksizce tazeliyordu.
 */
function tazele(kod: string): void {
  revalidatePath(yol(kod));
  revalidatePath(KOK);
}

/**
 * BAŞARIDA YÖNLENDİRME YOK — hedef eylemlerindeki kararın aynısı.
 *
 * Buradaki eylemlerin HEPSİ, formun basıldığı sayfanın kendisine dönecekti
 * (`/panel/algoritmam/<kod>`). Aynı adrese yönlendirmenin sayfayı TAZELEMEDİĞİ
 * bu projede daha önce ölçülmüştü (bkz. hedef-eylemleri.ts): tarayıcı bunu
 * "aynı sayfa" sayıp sunucudan yeni içerik istemiyor, kayıt veritabanına
 * yazılmışken ekran eski kalıyor. Aynı tuzağa düşmemek için yönlendirme
 * baştan kurulmadı; envanterde bedeli "Tamamla"ya basan öğrencinin sonucunu
 * görememesi olurdu.
 *
 * `revalidatePath` sonrası Next sayfayı eylem yanıtında yeniden üretiyor —
 * playwright gezisinde ölçüldü, form eylemden ~350 ms sonra ekranda. Üstelik
 * gezinme olmadığı için kaydırma konumu da bozulmuyor.
 *
 * HATA yolunda yönlendirme KALIYOR — uyarıyı adres taşıyor.
 */

function hataylaDon(kod: string, mesaj: string): never {
  // Hata yolunda da tazeleme gerekli: istemci yönlendirme önbelleği girdiyi
  // YOLA göre tutuyor, sorgu dizesine göre değil (bkz. hedef-eylemleri.ts).
  // Cevaplar bu noktada KAYDEDİLMİŞ olabilir; eski ekran onları göstermezdi.
  tazele(kod);
  redirect(`${yol(kod)}?hata=${encodeURIComponent(mesaj)}`);
}

/** Form girdisindeki envanter kodunu tanıma çevirir. */
function tanimiCoz(ham: FormDataEntryValue | null) {
  const kod = String(ham ?? "");
  const tanim = envanterTanimi(kod);
  if (!tanim) throw new BulunamadiHatasi();
  return tanim;
}

/**
 * Süren uygulamayı getirir; yoksa açar.
 *
 * Aynı kişi–envanter çifti için ikinci bir SURUYOR kaydı veritabanı düzeyinde
 * de engelli (kısmi benzersiz dizin). Buradaki kontrol onun kullanıcıya dönük
 * yüzü: iki sekmeden aynı anda başlatılırsa ikincisi hata değil, birincinin
 * üstüne düşer.
 */
async function surenUygulamayiSagla(kullaniciId: number, envanterKodu: string, surum: number) {
  const mevcut = await prisma.envanterUygulamasi.findFirst({
    where: { kullaniciId, envanterKodu, durum: "SURUYOR" },
    select: { id: true, surum: true },
  });
  if (mevcut) return mevcut;

  return prisma.envanterUygulamasi.create({
    data: { kullaniciId, envanterKodu, surum },
    select: { id: true, surum: true },
  });
}

export async function envanterBaslatEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  const tanim = tanimiCoz(veri.get("envanterKodu"));

  if (!envanterAcikMi(tanim)) {
    hataylaDon(tanim.kod, "Bu envanterin içeriği henüz hazır değil.");
  }

  await surenUygulamayiSagla(kullanici.id, tanim.kod, tanim.surum);

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: `Algoritmam envanteri başlatıldı: ${tanim.ad}`,
  });

  tazele(tanim.kod);
}

/**
 * Cevapları kaydeder; istenirse uygulamayı tamamlar.
 *
 * TEK EYLEM, iki niyet ("kaydet" / "tamamla"). Ayrı eylemler yazılsaydı
 * cevapları okuyup yazan kod iki yerde dururdu ve biri güncellenmeyi
 * unutabilirdi. Niyet yalnızca SONU değiştirir, kaydetme yolu ortaktır.
 *
 * BOŞ BIRAKILAN MADDE SİLİNMEZ. Form yalnızca işaretlenmiş radyoları
 * gönderiyor; gönderilmeyen maddenin eski cevabı yerinde kalır. Aksi hâlde
 * sayfanın bir bölümünü görmeden kaydeden öğrenci, önceki cevaplarını
 * sessizce silerdi.
 */
export async function cevaplariKaydetEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  const tanim = tanimiCoz(veri.get("envanterKodu"));

  const uygulama = await prisma.envanterUygulamasi.findFirst({
    where: { kullaniciId: kullanici.id, envanterKodu: tanim.kod, durum: "SURUYOR" },
    select: { id: true, surum: true },
  });
  if (!uygulama) throw new BulunamadiHatasi();

  if (uygulama.surum !== tanim.surum) {
    hataylaDon(
      tanim.kod,
      "Bu envanterin maddeleri güncellendi. Yarım kalan çözümünü silip yeniden başlaman gerekiyor.",
    );
  }

  /*
   * Madde kodları formdan `madde:<kod>` adıyla geliyor. Ön ek olmasaydı
   * `envanterKodu` ve `niyet` gibi alanları madde sanıp reddederdik — ya da
   * daha kötüsü, ayıklamak için ad listesini iki yerde tutardık.
   */
  const girdi: Record<string, number> = {};
  for (const [ad, deger] of veri.entries()) {
    if (!ad.startsWith("madde:")) continue;
    girdi[ad.slice("madde:".length)] = Number.parseInt(String(deger), 10);
  }

  const karar = cevaplariKabulEt(tanim, girdi);
  if (!karar.olurMu) hataylaDon(tanim.kod, karar.neden);

  /*
   * Cevaplar tek tek upsert ediliyor, "hepsini sil sonra yaz" DEĞİL: silme
   * yolu, kaydetme yarıda kesilirse öğrencinin cevaplarını yok ederdi.
   * Sayı en fazla madde sayısı kadar (25 civarı) — döngü kabul edilebilir.
   */
  await prisma.$transaction(
    karar.cevaplar.map((cevap) =>
      prisma.envanterCevabi.upsert({
        where: {
          uygulamaId_maddeKodu: { uygulamaId: uygulama.id, maddeKodu: cevap.maddeKodu },
        },
        create: { uygulamaId: uygulama.id, maddeKodu: cevap.maddeKodu, deger: cevap.deger },
        update: { deger: cevap.deger },
      }),
    ),
  );

  if (String(veri.get("niyet") ?? "") !== "tamamla") {
    tazele(tanim.kod);
    return;
  }

  // Tamamlama kararı, kaydedilenlerden değil VERİTABANINDAKİ tüm cevaplardan
  // verilir: öğrenci bu turda yalnızca eksik kalanları göndermiş olabilir.
  const kayitli = await prisma.envanterCevabi.findMany({
    where: { uygulamaId: uygulama.id },
    select: { maddeKodu: true },
  });

  if (!tamamlanabilirMi(tanim, kayitli.map((c) => c.maddeKodu))) {
    hataylaDon(
      tanim.kod,
      "Sonucu görebilmek için maddelerin hepsini işaretlemen gerekiyor. Cevapların kaydedildi.",
    );
  }

  await prisma.envanterUygulamasi.update({
    where: { id: uygulama.id },
    data: { durum: "TAMAMLANDI", tamamlanmaTarihi: new Date() },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    // Sonuç YAZILMIYOR — yalnızca tamamlandığı bilgisi.
    detay: `Algoritmam envanteri tamamlandı: ${tanim.ad}`,
  });

  tazele(tanim.kod);
}

/**
 * Yeniden çözme.
 *
 * ESKİ UYGULAMA SİLİNMEZ, yenisi açılır: "bir yıl sonra yeniden çöz, ne
 * değiştiğini gör" ancak geçmiş dururken mümkün. Ekran en son tamamlananı
 * gösterir, öncekiler geçmiş listesinde kalır.
 */
export async function yenidenCozEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  const tanim = tanimiCoz(veri.get("envanterKodu"));

  if (!envanterAcikMi(tanim)) {
    hataylaDon(tanim.kod, "Bu envanterin içeriği henüz hazır değil.");
  }

  await surenUygulamayiSagla(kullanici.id, tanim.kod, tanim.surum);

  tazele(tanim.kod);
}

/**
 * Bir uygulamayı siler (yarım kalmışı ya da tamamlanmışı).
 *
 * GERÇEK SİLME. Kişinin kendi öz değerlendirmesi üzerinde tam söz hakkı olmalı;
 * "sildim ama duruyor" durumu, bu veri türünde kabul edilemez. Silinen
 * uygulamanın cevapları ilişkisel olarak birlikte gider (ON DELETE CASCADE).
 */
export async function uygulamaSilEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  const tanim = tanimiCoz(veri.get("envanterKodu"));

  const id = Number.parseInt(String(veri.get("uygulamaId") ?? ""), 10);
  if (!Number.isFinite(id)) throw new BulunamadiHatasi();

  /*
   * `kullaniciId` koşulu olmadan sorgulanırsa başkasının uygulaması
   * silinebilirdi. Bulunamayan kayıt 404 verir (403 değil): 403, "böyle bir
   * kayıt var ama senin değil" bilgisini sızdırırdı.
   */
  const uygulama = await prisma.envanterUygulamasi.findFirst({
    where: { id, kullaniciId: kullanici.id, envanterKodu: tanim.kod },
    select: { id: true },
  });
  if (!uygulama) throw new BulunamadiHatasi();

  await prisma.envanterUygulamasi.delete({ where: { id: uygulama.id } });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: `Algoritmam envanteri silindi: ${tanim.ad}`,
  });

  tazele(tanim.kod);
}
