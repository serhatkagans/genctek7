"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { BILDIRIM_KODLARI, bildirimGonder } from "@/lib/bildirim/gonder";
import { prisma } from "@/lib/db";
import { danismanMentorlukKarariGecerliMi } from "@/lib/mentor/kurallar";
import { danismanMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import { BulunamadiHatasi, YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * ÖĞRENCİNİN MENTÖRLÜĞÜNE DANIŞMANININ VERDİĞİ KARAR (26 Ağustos 2026).
 *
 * İSTEK: "danışman öğretmen kendi öğrencilerinden mentör ise o da görünsün,
 * Çalışma grupları bu sütunun yanına mentörlük durumu olsun; eğer öğrenci
 * başvurduysa buradan onaylasın, mentör yap / mentörlüğü kaldır butonu olsun".
 *
 * ---------------------------------------------------------------------------
 * KARAR MERKEZİN ONAYININ YERİNE GEÇER
 * ---------------------------------------------------------------------------
 * Mentörlük onayı 11 Ağustos'ta yalnızca proje yöneticisine bırakılmıştı
 * (bkz. izinler.ts · mentorlukOnaylayabilirMi) ve gerekçesi "kimse kendi işini
 * onaylamaz" idi — koordinatör kendi başvurusunu kendi kuyruğunda görüyordu.
 * O gerekçe BURADA GEÇERSİZ: danışman öğretmen kendi mentörlüğüne değil,
 * ÖĞRENCİSİNİNKİNE karar veriyor.
 *
 * Onay burada verildiğinde öğrenci anında onaylı mentör olur; merkezin kuyruğu
 * ikinci bir kapı değildir. Kararın sahibi olarak danışman seçildi çünkü
 * öğrenciyi tanıyan kişi odur: merkez, ülke genelindeki bir kuyrukta gördüğü
 * ada bakarak "bu öğrenci akranlarına yol gösterebilir mi" sorusunu
 * cevaplayamıyordu.
 *
 * MERKEZİN KUYRUĞU KAPANMADI: öğretmen, mezun ve paydaş başvuruları orada
 * karara bağlanmaya devam ediyor (mentorluk/eylemler.ts · mentorlukKararEylemi).
 * Danışmanı olmayan bir öğrencinin başvurusu da yine oraya düşer — bu ekran
 * yalnızca "kendi öğrencisi" olan satırda düğme basıyor.
 *
 * ---------------------------------------------------------------------------
 * YETKİ HER ÇAĞRIDA VERİTABANINDAN SORULUYOR
 * ---------------------------------------------------------------------------
 * `danismanMi` rol kontrolüdür ve "bu öğrencinin danışmanıyım" demek değildir;
 * ekranda düğmenin basılmamış olması da bir koruma değil (form gövdesine başka
 * bir öğrenci kimliği yazılabilir). Bu yüzden AKTİF ATAMA ayrıca sorgulanıyor —
 * emsali talep-eylemleri.ts · yetkiyiDogrula.
 */

const YOL = "/panel/ogrenciler";

function donusYolunuCoz(veri: FormData): string {
  /*
   * Serbest bırakılamaz: açık yönlendirme açığı doğar. Yalnızca bu ekranın
   * kendisi ve sorgu dizeli hâli kabul edilir (bkz. eylemler.ts · aynı çözüm).
   */
  const istenen = String(veri.get("donusYolu") ?? "");
  if (istenen === YOL || istenen.startsWith(`${YOL}?`)) return istenen;
  return YOL;
}

export async function ogrenciMentorluguKararEylemi(
  veri: FormData,
): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  const donusYolu = donusYolunuCoz(veri);

  if (!danismanMi(kullanici)) {
    throw new YetkiHatasi("Öğrenci mentörlüğüne karar veremezsiniz.");
  }

  const ogrenciId = Number.parseInt(String(veri.get("ogrenciId") ?? ""), 10);
  if (!Number.isInteger(ogrenciId)) throw new BulunamadiHatasi();

  /*
   * Öğrenci ve mentörlük kaydı TEK SORGUDA, aktif atama koşuluyla birlikte
   * okunuyor. Atama koşulu `where` içinde: yetkisiz kayıt hiç dönmüyor ve
   * 404 veriyor. 403 verilseydi "böyle bir öğrenci var" bilgisi sızardı
   * (emsali: mentorluk/eylemler.ts · kapsam filtresi).
   */
  const ogrenci = await prisma.kullanici.findFirst({
    where: {
      id: ogrenciId,
      ogrenciAtamalari: {
        some: { danismanKullaniciId: kullanici.id, bitisTarihi: null },
      },
    },
    select: {
      id: true,
      ad: true,
      soyad: true,
      mentorluk: { select: { durum: true } },
    },
  });
  if (!ogrenci) throw new BulunamadiHatasi();

  const kaldiriliyor = String(veri.get("karar") ?? "") === "KALDIR";
  const karar = danismanMentorlukKarariGecerliMi({
    mevcutDurum: ogrenci.mentorluk?.durum ?? null,
    yeniDurum: kaldiriliyor ? "REDDEDILDI" : "ONAYLANDI",
    gerekce: String(veri.get("gerekce") ?? ""),
  });
  if (!karar.olurMu) {
    revalidatePath(donusYolu);
    redirect(
      `${donusYolu}${donusYolu.includes("?") ? "&" : "?"}hata=${encodeURIComponent(karar.neden)}`,
    );
  }

  /*
   * KALDIRMA `REDDEDILDI`, `BIRAKILDI` DEĞİL. İkisi ayrı şeyler: bırakmak
   * kişinin kendi vazgeçmesidir (bkz. mentorluguBirakEylemi), bu ise
   * BAŞKASININ verdiği bir karardır ve gerekçesi vardır. `BIRAKILDI`
   * yazılsaydı kayıt, öğrencinin kendi vazgeçtiğini söylerdi.
   */
  const durum = kaldiriliyor ? "REDDEDILDI" : "ONAYLANDI";
  await prisma.mentorluk.update({
    where: { kullaniciId: ogrenci.id },
    data: {
      durum,
      kararVerenKullaniciId: kullanici.id,
      kararTarihi: new Date(),
      retGerekcesi: karar.retGerekcesi,
    },
  });

  /*
   * KARAR ÖĞRENCİYE DUYURULUR — merkezin kararıyla aynı şablondan, çünkü
   * öğrenci için sonuç aynı: mentör oldu ya da olmadı. Kararı kimin verdiği
   * ayrı bir cümle olsaydı, aynı bildirim iki farklı metinle okunurdu.
   */
  await bildirimGonder({
    kullaniciId: ogrenci.id,
    kod: BILDIRIM_KODLARI.MENTORLUK_KARARI,
    degiskenler: {
      sonuc: kaldiriliyor ? "reddedildi" : "onaylandı",
      gerekce: karar.retGerekcesi ?? "—",
    },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "ROL",
    hedefId: ogrenci.id,
    detay: `Öğrenci mentörlüğü ${kaldiriliyor ? "kaldırıldı" : "onaylandı"}: ${ogrenci.ad} ${ogrenci.soyad}`,
  });

  revalidatePath(donusYolu);
  /* Mentör havuzu ve panodaki mentörlük kartı da bu karardan etkileniyor. */
  revalidatePath("/panel/talepler/mentor-basvuru");
  revalidatePath("/panel");
  redirect(
    `${donusYolu}${donusYolu.includes("?") ? "&" : "?"}durum=${kaldiriliyor ? "mentorluk-kaldirildi" : "mentor-yapildi"}`,
  );
}
