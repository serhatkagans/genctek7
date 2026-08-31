"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { BILDIRIM_KODLARI, bildirimGonder } from "@/lib/bildirim/gonder";
import { prisma } from "@/lib/db";
import {
  buEkibiYonetebilirMi,
  ekipAdiniCoz,
  ekipKapsaminiCoz,
  ekipMesajiniCoz,
  ekipSohbetineYazabilirMi,
  ekipYonetebilirMi,
} from "@/lib/ekip/kurallar";
import { ekibiGetir } from "@/lib/ekip/veri";
import { koordinatorIlKodu, projeYoneticisiMi } from "@/lib/yetki/izinler";
import { OGRETMEN } from "@/lib/yetki/kapsam";
import { erisimLogla } from "@/lib/yetki/log";
import { BulunamadiHatasi, YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * Ekip eylemleri (13 Ağustos 2026).
 *
 * Kararların tamamı `lib/ekip/kurallar.ts` içinde ve saf; burada veritabanı
 * işi, bildirim ve erişim kaydı var.
 *
 * KAPSAM HER EYLEMDE YENİDEN SORULUYOR (ekran basılırken sorulmuş olsa bile):
 * ekip kimliği gizli form alanından geliyor ve kurcalanabilir. Başka ilin
 * ekibine üye eklemek, o ilin öğrencisine onaysız yazışma hakkı vermek
 * olurdu.
 */

const YOL = "/panel/ekipler";

function hataylaDon(yol: string, mesaj: string): never {
  redirect(`${yol}?hata=${encodeURIComponent(mesaj)}`);
}

function ekipYolu(ekipId: number): string {
  return `${YOL}/${ekipId}`;
}

/** Yeni ekip kurar. Ad ve açıklama koordinatörün kendi girdiği metinlerdir. */
export async function ekipKurEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!ekipYonetebilirMi(kullanici)) {
    throw new YetkiHatasi("Ekip kurma yetkiniz yok.");
  }

  const karar = ekipAdiniCoz({
    ad: String(veri.get("ad") ?? ""),
    aciklama: String(veri.get("aciklama") ?? ""),
  });
  if (!karar.olurMu) hataylaDon(YOL, karar.neden);

  /*
   * EKİBİN İLİ: koordinatörün kendi ili. Merkez personelinin ili yoktur, bu
   * yüzden formdaki il seçiminden okunur — ekibin bir ile bağlı olması
   * kapsam kuralının dayanağı ve ilsiz ekip, kimsenin yönetemeyeceği ekip
   * demek olurdu.
   */
  const ilKodu = projeYoneticisiMi(kullanici)
    ? String(veri.get("ilKodu") ?? "").trim()
    : (koordinatorIlKodu(kullanici) ?? "");
  if (!ilKodu) hataylaDon(YOL, "Ekibin bağlı olacağı ili seçin.");

  const il = await prisma.il.findUnique({
    where: { ilKodu },
    select: { ilKodu: true },
  });
  if (!il) hataylaDon(YOL, "Seçilen il bulunamadı.");

  /*
   * AYNI İLDE AYNI AD İKİ KEZ OLMAZ. Veritabanında kısmi unique index var
   * (ux_ekip_il_ad_aktif); burada önce sorulup anlaşılır bir hata dönülüyor —
   * kısıt ihlali kullanıcıya ham veritabanı hatası olarak çıkardı.
   */
  /*
   * TÜR VE OKUL BAĞI (15 Ağustos 2026 · Aşama 5). Kural saf dosyada ve testli;
   * burada yalnızca sonucu uygulanıyor. Okul takımının okulu, ekibin iliyle
   * AYNI İLDE olmak zorunda — başka ilin okuluna takım kurmak, ekibin il
   * kapsamını (yönetim yetkisinin dayanağı) anlamsız kılardı.
   */
  const kapsam = ekipKapsaminiCoz({
    tur: String(veri.get("tur") ?? "CALISMA_GRUBU"),
    kurumKodu: String(veri.get("kurumKodu") ?? "") || null,
  });
  if (!kapsam.olurMu) hataylaDon(YOL, kapsam.neden);

  if (kapsam.kurumKodu !== null) {
    const okul = await prisma.kurum.findFirst({
      where: { kurumKodu: kapsam.kurumKodu, ilKodu, aktif: true },
      select: { kurumKodu: true },
    });
    if (!okul) {
      hataylaDon(YOL, "Seçilen okul bu ile bağlı değil ya da kapalı.");
    }
  }

  /*
   * DANIŞMAN İSTEĞE BAĞLI: danışmansız ekip kurulabiliyor ve bu bir eksiklik
   * değil, izlenen bir durum (bkz. ekip-yonetimi · ?danismansiz=1). Seçildiyse
   * ekibin ilinden bir öğretmen olmak zorunda.
   */
  const danismanId = Number.parseInt(String(veri.get("danismanId") ?? ""), 10);
  let danismanKullaniciId: number | null = null;
  if (Number.isInteger(danismanId)) {
    const danisman = await prisma.kullanici.findFirst({
      where: { id: danismanId, aktif: true, ilKodu, ...OGRETMEN },
      select: { id: true },
    });
    if (!danisman) {
      hataylaDon(YOL, "Seçilen danışman bu ilde görevli bir öğretmen değil.");
    }
    danismanKullaniciId = danismanId;
  }

  const ayniAd = await prisma.ekip.findFirst({
    where: { ilKodu, ad: karar.ad, aktif: true },
    select: { id: true },
  });
  if (ayniAd) {
    hataylaDon(YOL, "Bu ilde aynı adla açık bir ekip zaten var.");
  }

  const ekip = await prisma.ekip.create({
    data: {
      ad: karar.ad,
      aciklama: karar.aciklama,
      ilKodu,
      tur: kapsam.tur,
      kurumKodu: kapsam.kurumKodu,
      danismanKullaniciId,
      kuranKullaniciId: kullanici.id,
    },
    select: { id: true, ad: true },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "ROL",
    hedefId: ekip.id,
    detay: `Ekip kuruldu: ${ekip.ad} (il ${ilKodu}, tür ${kapsam.tur})`,
  });

  /*
   * ÜYELER EKİP KURULURKEN DE SEÇİLEBİLİYOR (31 Ağustos 2026 · istek: "ekibi
   * oluşturduktan sonra geliyor, ben ekibi oluştururken eklemek istiyorum").
   *
   * KUTUCUKLAR FORMUN DIŞINDA, ALTTAKİ KİŞİ LİSTESİNDE: HTML'in `form`
   * özniteliği onları bu forma bağlıyor (aynı numara sütun süzgeçlerinde de
   * kullanılıyor — bkz. components/SutunSuzgeci.tsx). Böylece "önce ekibi kur,
   * sonra ekibin sayfasında ara" iki adımı tek gönderime iniyor; ekibin kendi
   * sayfasındaki "Üye ekle" süzgeci de yerinde duruyor, çünkü kurulmuş bir
   * ekibe sonradan üye eklemek ayrı bir iş.
   *
   * KAPI EKLEME EYLEMİYLE AYNI: kişi AKTİF olmalı ve EKİBİN İLİNDE kayıtlı
   * olmalı (`ekibeUyeEkleEylemi` ile birebir aynı koşul). Kutucuk listesi
   * ekrandan geliyor ve kurcalanabilir; başka ilin öğrencisini işaretlemek,
   * ona onaysız yazışma hakkı vermek olurdu.
   *
   * KAPSAM DIŞI KİMLİKLER SESSİZCE ELENİYOR, ekip kurulmaya devam ediyor:
   * hata verilseydi doldurulmuş bütün form (ad, açıklama, tür) çöpe giderdi ve
   * kullanıcı hangi satırın sorunlu olduğunu göremezdi. Kaç kişinin eklendiği
   * ekibin sayfasında yazıyor.
   */
  const secilenIdler = [
    ...new Set(
      veri
        .getAll("uyeId")
        .map((deger) => Number.parseInt(String(deger), 10))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];

  if (secilenIdler.length > 0) {
    const uyeler = await prisma.kullanici.findMany({
      where: { id: { in: secilenIdler }, aktif: true, ilKodu },
      select: { id: true },
    });

    if (uyeler.length > 0) {
      await prisma.ekipUyesi.createMany({
        data: uyeler.map((uye) => ({ ekipId: ekip.id, kullaniciId: uye.id })),
      });

      /*
       * BİLDİRİM HERKESE AYRI AYRI: ekip, kişinin kurmadığı ve kendiliğinden
       * uğramayacağı bir ekran (aynı gerekçe ekibeUyeEkleEylemi'nde de yazılı).
       */
      for (const uye of uyeler) {
        await bildirimGonder({
          kullaniciId: uye.id,
          kod: BILDIRIM_KODLARI.EKIBE_EKLENDINIZ,
          degiskenler: {
            ekipAdi: ekip.ad,
            ekleyenAdSoyad: `${kullanici.ad} ${kullanici.soyad}`,
          },
        });
      }

      await erisimLogla({
        kullaniciId: kullanici.id,
        islem: "DEGISIKLIK",
        hedefTip: "ROL",
        hedefId: ekip.id,
        detay: `Ekip kurulurken ${uyeler.length} üye eklendi: ${ekip.ad}`,
      });
    }
  }

  revalidatePath(YOL);
  redirect(`${ekipYolu(ekip.id)}?durum=ekip-kuruldu`);
}

/**
 * Ekibe üye ekler.
 *
 * ADAY, EKİBİN İLİNDEN olmak zorunda: ekip ilin topluluğudur ve üyelik
 * onaysız yazışma hakkı doğurduğu için "kimi ekleyebilirim" sorusunun cevabı
 * dar tutuldu. Merkez de bu koşula tabidir — istisna, ekibi il dışına açacak
 * tek kapıyı açardı.
 */
export async function ekibeUyeEkleEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const ekipId = Number.parseInt(String(veri.get("ekipId") ?? ""), 10);
  const uyeId = Number.parseInt(String(veri.get("kullaniciId") ?? ""), 10);
  if (!Number.isFinite(ekipId) || !Number.isFinite(uyeId)) {
    throw new BulunamadiHatasi();
  }

  const ekip = await ekibiGetir(ekipId);
  if (!ekip) throw new BulunamadiHatasi();
  if (!buEkibiYonetebilirMi(kullanici, ekip.ilKodu)) {
    throw new YetkiHatasi("Bu ekibi yönetme yetkiniz yok.");
  }
  if (!ekip.aktif) hataylaDon(ekipYolu(ekipId), "Kapatılmış ekibe üye eklenmez.");

  const aday = await prisma.kullanici.findFirst({
    where: { id: uyeId, aktif: true, ilKodu: ekip.ilKodu },
    select: { id: true, ad: true, soyad: true },
  });
  if (!aday) {
    hataylaDon(
      ekipYolu(ekipId),
      "Kişi bulunamadı ya da ekibin ilinde kayıtlı değil.",
    );
  }

  if (ekip.uyeKullaniciIdleri.includes(aday.id)) {
    hataylaDon(ekipYolu(ekipId), "Bu kişi zaten ekibin üyesi.");
  }

  await prisma.ekipUyesi.create({
    data: { ekipId, kullaniciId: aday.id },
  });

  /*
   * EKLENEN KİŞİYE BİLDİRİM: ekip onun kurmadığı ve kendiliğinden uğramayacağı
   * bir ekran. Haberi olmadan üyesi olduğu bir sohbete yazılanlar okunmadan
   * kalırdı. Bildirim metni sohbetin gözetime açık olduğunu da söylüyor.
   */
  await bildirimGonder({
    kullaniciId: aday.id,
    kod: BILDIRIM_KODLARI.EKIBE_EKLENDINIZ,
    degiskenler: {
      ekipAdi: ekip.ad,
      ekleyenAdSoyad: `${kullanici.ad} ${kullanici.soyad}`,
    },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: aday.id,
    detay: `Ekibe üye eklendi: ${ekip.ad} · ${aday.ad} ${aday.soyad}`,
  });

  revalidatePath(ekipYolu(ekipId));
  redirect(`${ekipYolu(ekipId)}?durum=uye-eklendi`);
}

/** Üyeyi ekipten çıkarır. Yazdığı mesajlar kalır (bkz. migration notu). */
export async function ekiptenUyeCikarEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const ekipId = Number.parseInt(String(veri.get("ekipId") ?? ""), 10);
  const uyeId = Number.parseInt(String(veri.get("kullaniciId") ?? ""), 10);
  if (!Number.isFinite(ekipId) || !Number.isFinite(uyeId)) {
    throw new BulunamadiHatasi();
  }

  const ekip = await ekibiGetir(ekipId);
  if (!ekip) throw new BulunamadiHatasi();
  if (!buEkibiYonetebilirMi(kullanici, ekip.ilKodu)) {
    throw new YetkiHatasi("Bu ekibi yönetme yetkiniz yok.");
  }

  await prisma.ekipUyesi.deleteMany({
    where: { ekipId, kullaniciId: uyeId },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: uyeId,
    detay: `Ekipten üye çıkarıldı: ${ekip.ad}`,
  });

  revalidatePath(ekipYolu(ekipId));
  redirect(`${ekipYolu(ekipId)}?durum=uye-cikarildi`);
}

/**
 * Ekibi kapatır (pasife alır).
 *
 * SİLME YOK: dağılan ekibin mesajları ve üye listesi kayıt olarak kalır,
 * yalnızca listelerde görünmez ve sohbetine yazılamaz.
 */
export async function ekibiKapatEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const ekipId = Number.parseInt(String(veri.get("ekipId") ?? ""), 10);
  if (!Number.isFinite(ekipId)) throw new BulunamadiHatasi();

  const ekip = await ekibiGetir(ekipId);
  if (!ekip) throw new BulunamadiHatasi();
  if (!buEkibiYonetebilirMi(kullanici, ekip.ilKodu)) {
    throw new YetkiHatasi("Bu ekibi yönetme yetkiniz yok.");
  }

  await prisma.ekip.update({
    where: { id: ekipId },
    data: { aktif: false },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "ROL",
    hedefId: ekipId,
    detay: `Ekip kapatıldı: ${ekip.ad}`,
  });

  revalidatePath(YOL);
  redirect(`${YOL}?durum=ekip-kapatildi`);
}

/** Ekip sohbetine mesaj yazar. */
export async function ekipMesajiGonderEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const ekipId = Number.parseInt(String(veri.get("ekipId") ?? ""), 10);
  if (!Number.isFinite(ekipId)) throw new BulunamadiHatasi();

  const ekip = await ekibiGetir(ekipId);
  if (!ekip) throw new BulunamadiHatasi();
  if (!ekipSohbetineYazabilirMi(kullanici, ekip)) {
    throw new YetkiHatasi("Bu ekibin sohbetine yazamazsınız.");
  }

  const karar = ekipMesajiniCoz(String(veri.get("icerik") ?? ""));
  if (!karar.olurMu) hataylaDon(ekipYolu(ekipId), karar.neden);

  const mesaj = await prisma.ekipMesaji.create({
    data: {
      ekipId,
      yazanKullaniciId: kullanici.id,
      icerik: karar.icerik,
    },
    select: { id: true },
  });

  /*
   * YENİ MESAJ BİLDİRİMİ (13 Ağustos 2026).
   *
   * KİME: ekibin diğer üyeleri ve — üye değilse — ekibi kuran koordinatör.
   * Kuran kişi sohbetin sorumlusudur; ekibinde konuşulanı ancak ekrana
   * girdiğinde öğrenmesi, gözetimi tesadüfe bırakırdı.
   *
   * YAZANIN KENDİSİ HARİÇ: kendi mesajının bildirimini almak, panelin
   * okunmamış sayacını anlamsızlaştırırdı.
   *
   * METİNDE MESAJ İÇERİĞİ YOK ve bu kasıtlı (bkz. migration notu): tekrar
   * engeli içerik karşılaştırdığı için sabit metin, bir ekipteki arka arkaya
   * gelen mesajları TEK bildirime indiriyor; ayrıca bildirimin e-posta kopyası
   * sohbet içeriğini ekosistem dışına taşımıyor.
   *
   * HEDEF EKİP: bildirim panelde "Ekibe git" düğmesiyle çıkıyor.
   */
  const bildirilecekler = new Set<number>(ekip.uyeKullaniciIdleri);
  const kuran = await prisma.ekip.findUnique({
    where: { id: ekipId },
    select: { kuranKullaniciId: true },
  });
  if (kuran) bildirilecekler.add(kuran.kuranKullaniciId);
  bildirilecekler.delete(kullanici.id);

  for (const kullaniciId of bildirilecekler) {
    await bildirimGonder({
      kullaniciId,
      kod: BILDIRIM_KODLARI.EKIPTE_YENI_MESAJ,
      degiskenler: { ekipAdi: ekip.ad },
      hedef: { tip: "EKIP", id: ekipId },
    });
  }

  revalidatePath(ekipYolu(ekipId));
  redirect(`${ekipYolu(ekipId)}#mesaj-${mesaj.id}`);
}
