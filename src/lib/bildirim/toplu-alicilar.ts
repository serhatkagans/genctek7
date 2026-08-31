import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  DUYURU_HEDEF_ETIKETLERI,
  DUYURU_HEDEFLERI,
  type DuyuruHedefi,
  type TopluHedef,
  topluHedefAnahtari,
  topluHedefiCoz,
} from "@/lib/bildirim/toplu";
import {
  koordinatorIlKodu,
  projeYoneticisiMi,
  topluMesajGonderebilirMi,
} from "@/lib/yetki/izinler";
import type { OturumKullanicisi } from "@/lib/yetki/tipler";

/**
 * TOPLU MESAJIN ALICILARI — kapsam ve sayım (31 Ağustos 2026).
 *
 * İSTEKLER: "il koordinatörü yönetim panelinde toplu mesaj kartı ekle,
 * ilindeki tüm öğrenciler, tüm öğretmenler, ilçe temsilcisi, il temsilcisi,
 * eklediği ekiplere ayrı ayrı her ekip için ayrı toplu mesaj" · "proje
 * yöneticisi de sadece öğrenci ve öğretmenlere değil ekiplere topluluklara
 * ayrı ayrı toplu mesaj atabilsin".
 *
 * ===========================================================================
 * TEK KAYNAK: SEÇENEK LİSTESİ DE ALICI SORGUSU DA BURADAN ÇIKAR
 * ===========================================================================
 * `topluHedefSecenekleri` ekrandaki açılır listeyi, `topluHedefKosulu` ise
 * gönderim eylemindeki alıcı sorgusunu üretiyor ve İKİSİ DE aynı `kosul`
 * fonksiyonunu çağırıyor. Ayrı yazılsalardı ekranda "312 kişi" yazıp 400
 * kişiye giden bir duyuru mümkün olurdu — geri alınamaz bir işlemde en
 * pahalı hata bu.
 *
 * ===========================================================================
 * KAPSAM: KOORDİNATÖRÜN MESAJI İLİNİ AŞMAZ
 * ===========================================================================
 * Merkezin ili yoktur ve ülke geneline yazar; il koordinatörünün her hedefi
 * kendi iline daralır. Daraltma SORGUNUN İÇİNDE, ekranda değil: hedef anahtarı
 * kurcalanabilir bir form alanından geliyor ve gönderim eylemi listeyi burada
 * yeniden üretip anahtarı içinde arıyor (bkz. duyurular/eylemler.ts). Ekranda
 * görünmek yetki değildir; listede olmayan anahtar reddedilir.
 *
 * EKİP VE TOPLULUK HEDEFLERİ DE AYNI KAPIDAN GEÇER: koordinatöre yalnızca
 * kendi ilinin ekipleri listeleniyor ve `EKIP:<id>` anahtarı, o ekip listede
 * yoksa geçersiz sayılıyor — başka ilin ekibine mesaj atmak, o ilin
 * öğrencilerine ulaşmanın kestirme yolu olurdu.
 */

/** Ekrandaki açılır listenin bir satırı. */
export interface HedefSecenegi {
  /** Form değeri: `OGRENCI`, `EKIP:12`… (bkz. topluHedefAnahtari). */
  deger: string;
  /** Kitlenin adı — sayı ekranda ayrıca yazılıyor. */
  etiket: string;
  /** Kaç aktif kullanıcıya gideceği. */
  sayi: number;
}

const AKTIF_OGRENCI: Prisma.KullaniciWhereInput = {
  roller: { some: { rolKodu: "OGRENCI", bitisTarihi: null } },
};

/*
 * ÖĞRETMEN BİR ROL DEĞİL, "ÖĞRENCİ OLMAMAK"TIR: sistemde `OGRETMEN` diye bir
 * rol kodu yok — danışman, il koordinatörü ve merkez personeli aynı kümede.
 * DIŞ KULLANICILAR (mezun, paydaş temsilcisi) AÇIKÇA ÇIKARILIYOR; koşul
 * yalnızca "öğrenci değil" deseydi okul kadrosuna giden bir duyuru mezunlara
 * da giderdi. Koşulun kendisi duyurular/eylemler.ts'ten buraya taşındı ve
 * ORADA KOPYASI KALMADI — iki kopya, biri güncellenip öbürü unutulduğunda
 * ekrandaki sayı ile gerçek alıcı kümesini ayırırdı.
 */
const AKTIF_OGRETMEN: Prisma.KullaniciWhereInput = {
  roller: {
    none: {
      rolKodu: { in: ["OGRENCI", "MEZUN", "PAYDAS_TEMSILCISI"] },
      bitisTarihi: null,
    },
  },
};

/** Gönderenin kapsamı: merkezde `null` (ülke geneli), koordinatörde ilin kodu. */
function kapsamIli(kullanici: OturumKullanicisi): string | null {
  return projeYoneticisiMi(kullanici) ? null : koordinatorIlKodu(kullanici);
}

/**
 * Yürürlükteki dönemde bir görev rolünü taşıyan kullanıcılar.
 *
 * DÖNEM ŞARTI: temsilcilik bir yıllık görevdir ve geçen yılın temsilcisi bugün
 * o görevde değil. Yıl, gönderenin kendi eğitim-öğretim yılından okunuyor —
 * sistemdeki "yürürlükteki dönem" tanımı budur (bkz. baglanti-eylemleri.ts,
 * aynı desen).
 */
function gorevRoluKosulu(
  rolKodu: "IL_TEMSILCISI" | "ILCE_TEMSILCISI",
  kullanici: OturumKullanicisi,
  ilKodu: string | null,
): Prisma.KullaniciWhereInput {
  return {
    gorevRolleri: {
      some: {
        rolKodu,
        egitimOgretimYili: kullanici.egitimOgretimYili,
        /*
          KAPSAM GÖREVİN KENDİSİNDEN DEĞİL KİŞİDEN SORULMUYOR: görev satırının
          `ilKodu`su, temsilciliğin hangi il için verildiğini söylüyor.
          Kişinin `ilKodu`suna bakılsaydı, başka ilde okuyup bu ile temsilci
          atanmış (ya da tersi) bir öğrenci yanlış tarafa düşerdi.
        */
        ...(ilKodu ? { ilKodu } : {}),
      },
    },
  };
}

/**
 * Bir hedefin alıcı koşulu; hedef bu gönderenin kapsamı dışındaysa `null`.
 *
 * `null` DÖNMEK BİR HATA DEĞİL, KAPININ KENDİSİ: çağıran onu "bu hedefe
 * gönderemezsiniz" diye çeviriyor. İstisna fırlatılsaydı, seçenek listesini
 * üretirken kapsam dışı kalan her satır için try/catch gerekirdi.
 */
export async function topluHedefKosulu(
  kullanici: OturumKullanicisi,
  hedef: TopluHedef,
): Promise<Prisma.KullaniciWhereInput | null> {
  if (!topluMesajGonderebilirMi(kullanici)) return null;

  const ilKodu = kapsamIli(kullanici);
  /*
   * KOORDİNATÖRÜN İLİ YOKSA HİÇBİR HEDEF AÇILMAZ: rolü var ama ili yazılmamış
   * bir kayıt veri bozulmasıdır ve "ilsiz koordinatör" ülke geneline yazan
   * kişi hâline gelirdi. Merkezde `ilKodu` zaten null ve o kasıtlı.
   */
  if (!projeYoneticisiMi(kullanici) && ilKodu === null) return null;

  const ilSarti: Prisma.KullaniciWhereInput = ilKodu ? { ilKodu } : {};
  const aktif: Prisma.KullaniciWhereInput = { aktif: true };

  if (hedef.tip === "OGRENCI") {
    return { ...aktif, ...ilSarti, ...AKTIF_OGRENCI };
  }
  if (hedef.tip === "OGRETMEN") {
    return { ...aktif, ...ilSarti, ...AKTIF_OGRETMEN };
  }
  if (hedef.tip === "HERKES") {
    /*
      "HERKES" ÖĞRENCİ + ÖĞRETMEN DEMEK, "bütün kullanıcılar" değil: etiketi de
      bunu söylüyor. Dış kullanıcılar (mezun, paydaş temsilcisi) dışarıda —
      ikisinin de kendi ekranları ve kendi bildirim akışları var, okul
      kadrosuna yazılan bir metnin muhatabı değiller.
    */
    return { ...aktif, ...ilSarti, OR: [AKTIF_OGRENCI, AKTIF_OGRETMEN] };
  }
  if (hedef.tip === "IL_TEMSILCISI" || hedef.tip === "ILCE_TEMSILCISI") {
    return {
      ...aktif,
      ...gorevRoluKosulu(hedef.tip, kullanici, ilKodu),
    };
  }

  if (hedef.tip === "EKIP") {
    /*
      EKİBİN VARLIĞI VE İLİ VERİTABANINDAN SORULUYOR: anahtar formdan geliyor
      ve koordinatörün kendi ilinin dışındaki bir ekibin kimliğini yazması
      teknik olarak serbest. Kapalı ekip de dışarıda — arşive mesaj atılmaz.
    */
    const ekip = await prisma.ekip.findFirst({
      where: { id: hedef.id, aktif: true, ...(ilKodu ? { ilKodu } : {}) },
      select: { id: true },
    });
    if (!ekip) return null;
    return { ...aktif, ekipUyelikleri: { some: { ekipId: hedef.id } } };
  }

  /*
   * TOPLULUK (ÇALIŞMA GRUBU) YALNIZCA MERKEZDE: grup listesi ülke geneli bir
   * referans listesidir (bkz. model CalismaGrubu) ve ile bağlı değil.
   * Koordinatöre açılsaydı "ilimdeki robotik grubu" beklenirken ülkedeki
   * bütün robotikçilere giden bir mesaj olurdu. İstek de topluluğu yalnızca
   * proje yöneticisi için söylüyor.
   */
  if (hedef.tip !== "GRUP") return null;
  if (!projeYoneticisiMi(kullanici)) return null;
  const grup = await prisma.calismaGrubu.findFirst({
    where: { id: hedef.id, aktif: true },
    select: { id: true },
  });
  if (!grup) return null;
  return {
    ...aktif,
    calismaGruplari: { some: { calismaGrubuId: hedef.id } },
  };
}

/**
 * Ekrandaki alıcı listesi: sabit kitleler, ardından ekipler ve topluluklar.
 *
 * SAYISI SIFIR OLAN SATIR DA LİSTEDE KALIYOR: "İl temsilcileri (0 kişi)"
 * satırı, o ilde temsilci atanmadığını söylüyor — listeden düşseydi kullanıcı
 * seçeneğin var olduğunu hiç öğrenemezdi. Gönderim eylemi zaten boş alıcıda
 * hata veriyor.
 */
export async function topluHedefSecenekleri(
  kullanici: OturumKullanicisi,
): Promise<HedefSecenegi[]> {
  if (!topluMesajGonderebilirMi(kullanici)) return [];

  const ilKodu = kapsamIli(kullanici);
  const merkezMi = projeYoneticisiMi(kullanici);
  if (!merkezMi && ilKodu === null) return [];

  const [ekipler, gruplar] = await Promise.all([
    prisma.ekip.findMany({
      where: { aktif: true, ...(ilKodu ? { ilKodu } : {}) },
      orderBy: [{ ad: "asc" }],
      select: { id: true, ad: true, il: { select: { ad: true } } },
    }),
    merkezMi
      ? prisma.calismaGrubu.findMany({
          where: { aktif: true },
          orderBy: { siraNo: "asc" },
          select: { id: true, ad: true },
        })
      : Promise.resolve([]),
  ]);

  const adaylar: { hedef: TopluHedef; etiket: string }[] = [
    ...DUYURU_HEDEFLERI.map((tip: DuyuruHedefi) => ({
      hedef: { tip } as TopluHedef,
      etiket: DUYURU_HEDEF_ETIKETLERI[tip],
    })),
    ...ekipler.map((ekip) => ({
      hedef: { tip: "EKIP" as const, id: ekip.id },
      /*
        MERKEZDE İL ADI DA YAZIYOR: ülke genelinde aynı adla ("TEKNOFEST
        Hazırlık Ekibi") onlarca ekip var ve il adı olmadan hangisine
        yazıldığı seçilemezdi. Koordinatörde tek il var, tekrar yazmak
        satırı uzatmaktan başka bir şey yapmazdı.
      */
      etiket: merkezMi
        ? `Ekip: ${ekip.ad} (${ekip.il.ad})`
        : `Ekip: ${ekip.ad}`,
    })),
    ...gruplar.map((grup) => ({
      hedef: { tip: "GRUP" as const, id: grup.id },
      etiket: `Topluluk: ${grup.ad}`,
    })),
  ];

  /*
   * SAYIM SIRAYLA DEĞİL TOPLUCA: her seçenek için bir `count` var ve liste
   * uzun olabiliyor (ilde otuz ekip). `Promise.all` hepsini tek turda
   * çalıştırıyor; ardışık beklenselerdi ekran gözle görülür şekilde gecikirdi.
   */
  const sayilar = await Promise.all(
    adaylar.map(async ({ hedef }) => {
      const kosul = await topluHedefKosulu(kullanici, hedef);
      if (kosul === null) return null;
      return prisma.kullanici.count({ where: kosul });
    }),
  );

  return adaylar
    .map((aday, sira) => ({ aday, sayi: sayilar[sira] }))
    .filter((satir): satir is { aday: (typeof adaylar)[number]; sayi: number } =>
      satir.sayi !== null,
    )
    .map(({ aday, sayi }) => ({
      deger: topluHedefAnahtari(aday.hedef),
      etiket: aday.etiket,
      sayi,
    }));
}

/**
 * Gönderim eyleminin kullandığı çözümleme: anahtar → alıcı kimlikleri.
 *
 * ETİKET DE DÖNÜYOR çünkü erişim kaydına "kime gönderildi" yazılması gerekiyor
 * ve ham anahtar (`EKIP:12`) denetim kaydını okuyan kişiye hiçbir şey
 * söylemez.
 */
export async function topluAliciListesi(
  kullanici: OturumKullanicisi,
  anahtar: string,
): Promise<{ etiket: string; idler: number[] } | null> {
  const hedef = topluHedefiCoz(anahtar);
  if (hedef === null) return null;

  const kosul = await topluHedefKosulu(kullanici, hedef);
  if (kosul === null) return null;

  /*
   * ETİKET SEÇENEK LİSTESİNDEN OKUNUYOR, yeniden kurulmuyor: ekip adı orada
   * zaten var ve ikinci bir sorgu ile getirilseydi ekrandaki satırla denetim
   * kaydındaki ad zamanla ayrışabilirdi.
   */
  const secenekler = await topluHedefSecenekleri(kullanici);
  const secenek = secenekler.find((satir) => satir.deger === anahtar);
  if (!secenek) return null;

  const alicilar = await prisma.kullanici.findMany({
    where: kosul,
    select: { id: true },
  });

  return { etiket: secenek.etiket, idler: alicilar.map((alici) => alici.id) };
}
