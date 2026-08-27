"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { BILDIRIM_KODLARI, bildirimGonder } from "@/lib/bildirim/gonder";
import { prisma } from "@/lib/db";
import { ogrenciMentorlukKarariGecerliMi } from "@/lib/mentor/kurallar";
import { ogrenciMentorluguneKararVerebilirMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import { BulunamadiHatasi } from "@/lib/yetki/tipler";

/**
 * ÖĞRENCİNİN MENTÖRLÜĞÜNE ÖĞRENCİ LİSTESİNDEN VERİLEN KARAR (26 Ağustos 2026 ·
 * danışman; 27 Ağustos 2026 · il koordinatörü).
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
 * İL KOORDİNATÖRÜ DE KARAR VERİR (27 Ağustos 2026 · istek: "il koordinatörü de
 * öğrencinin mentörlük başvurusunu onaylayabilsin"). Danışmanı olmayan
 * öğrencinin başvurusu bu ekranda kimseye düğme basmıyordu ve merkezin ülke
 * genelindeki kuyruğunda yalnızca bir ada dönüşüyordu. Kapının kime açıldığı
 * tek yerde yazıyor: izinler.ts · ogrenciMentorluguneKararVerebilirMi.
 *
 * MERKEZİN KUYRUĞU KAPANMADI: öğretmen, mezun ve paydaş başvuruları orada
 * karara bağlanmaya devam ediyor (mentorluk/eylemler.ts · mentorlukKararEylemi).
 *
 * ---------------------------------------------------------------------------
 * YETKİ HER ÇAĞRIDA VERİTABANINDAN SORULUYOR
 * ---------------------------------------------------------------------------
 * Rol kontrolü ("danışmanım", "koordinatörüm") tek başına yetmez: hangi
 * ÖĞRENCİ için yetkili olduğu ayrı bir sorudur ve ekranda düğmenin basılmamış
 * olması bir koruma değildir (form gövdesine başka bir öğrenci kimliği
 * yazılabilir). Bu yüzden aktif atama ve öğrencinin il kodu her çağrıda
 * veritabanından okunuyor — emsali talep-eylemleri.ts · yetkiyiDogrula.
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

  const ogrenciId = Number.parseInt(String(veri.get("ogrenciId") ?? ""), 10);
  if (!Number.isInteger(ogrenciId)) throw new BulunamadiHatasi();

  /*
   * KAPSAM ARTIK `where` DEĞİL, OKUNAN KAYDIN ÜZERİNDE SORULUYOR (27 Ağustos
   * 2026). Eskiden aktif atama koşulu sorgunun içindeydi; iki karar sahibi
   * olunca (danışman VE il koordinatörü) o koşul "ya atamam var ya da il
   * kodum tutuyor" biçiminde `where`e yazılamaz oldu — yazılsaydı yetki
   * kuralının yarısı sorguda, yarısı izinler.ts'te durur ve biri
   * değiştirildiğinde öbürü sessizce geride kalırdı.
   *
   * Kayıt önce okunuyor, yetki sonra soruluyor; yetkisizde yine 404 dönüyor
   * ki "böyle bir öğrenci var" bilgisi sızmasın (emsali: mentorluk/eylemler.ts
   * · kapsam filtresi).
   */
  const ogrenci = await prisma.kullanici.findUnique({
    where: { id: ogrenciId },
    select: {
      id: true,
      ad: true,
      soyad: true,
      ilKodu: true,
      mentorluk: { select: { durum: true } },
      ogrenciAtamalari: {
        where: { bitisTarihi: null },
        select: { danismanKullaniciId: true },
      },
    },
  });
  if (!ogrenci) throw new BulunamadiHatasi();

  const kendiOgrencisiMi = ogrenci.ogrenciAtamalari.some(
    (atama) => atama.danismanKullaniciId === kullanici.id,
  );
  if (
    !ogrenciMentorluguneKararVerebilirMi(kullanici, ogrenci, kendiOgrencisiMi)
  ) {
    throw new BulunamadiHatasi();
  }

  const kaldiriliyor = String(veri.get("karar") ?? "") === "KALDIR";
  const karar = ogrenciMentorlukKarariGecerliMi({
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
