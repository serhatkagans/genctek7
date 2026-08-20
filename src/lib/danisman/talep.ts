import type { DanismanTalebiDurumu } from "@/generated/prisma/enums";
import { BILDIRIM_KODLARI, bildirimGonder } from "../bildirim/gonder";
import { prisma } from "../db";
import { danismanAdayiFiltresi } from "../yetki/kapsam";
import { atamaDegistir, ilKoordinatoruGetir } from "./atama";

/**
 * DANIŞMAN DEĞİŞİKLİĞİ ONAYI (20 Ağustos 2026).
 *
 * İstek: *"danışman öğretmen seçiminde öğretmene veya il koordinatörüne onay
 * düşsün sürekli değişmek isteyebilirler"*.
 *
 * ---------------------------------------------------------------------------
 * ONAY YALNIZCA DEĞİŞİKLİKTE
 * ---------------------------------------------------------------------------
 * Danışmanı OLMAYAN öğrencinin seçimi doğrudan atanır; onaya girmez. İki
 * gerekçe var ve ikisi de aynı yere çıkıyor:
 *
 *   1. Değişmez 2 (SKILL.md): öğrenci boşta kalamaz. İlk seçim onay
 *      beklerken öğrenci danışmansız kalırdı ve onayı verecek kişi de
 *      çoğu zaman o öğrencinin hiç tanımadığı biri olurdu.
 *   2. İsteğin gerekçesi "sürekli DEĞİŞMEK isteyebilirler". İlk seçimde
 *      değişen bir şey yok; frenlenmek istenen şey bağın kurulması değil,
 *      kurulmuş bağın habire bozulması.
 *
 * ---------------------------------------------------------------------------
 * KARARI KİM VERİR
 * ---------------------------------------------------------------------------
 * İki kişi: öğrencinin İSTEDİĞİ öğretmen ve öğrencinin ilindeki İL
 * KOORDİNATÖRÜ. İstek ikisini de sayıyor ("öğretmene veya il koordinatörüne")
 * ve koordinatörün yetkisi ayrıca bir tıkanma valfi: cevap vermeyen bir
 * öğretmen, öğrenciyi süresiz bekleten tek nokta olurdu.
 *
 * ESKİ DANIŞMANA SORULMAZ. Bırakılan tarafa veto hakkı vermek, öğrenciyi
 * ayrılmak istediği kişinin iznine bağlardı; haber ise gidiyor (bkz. aşağıda).
 */

/** Öğrencinin seçim denemesinin sonucu — ekran buna göre mesaj basar. */
export type DanismanSecimSonucu =
  | { tur: "ATANDI" }
  | { tur: "ONAYA_GONDERILDI"; istenenAdSoyad: string }
  | { tur: "AYNI_DANISMAN" }
  | { tur: "BEKLEYEN_TALEP_VAR"; istenenAdSoyad: string };

export interface BekleyenTalep {
  id: number;
  olusturmaTarihi: Date;
  ogrenci: { id: number; ad: string; soyad: string; sinif: string | null };
  istenenDanisman: { id: number; ad: string; soyad: string };
  oncekiDanisman: { id: number; ad: string; soyad: string } | null;
}

const TALEP_ALANLARI = {
  id: true,
  olusturmaTarihi: true,
  ogrenciId: true,
  istenenDanismanId: true,
  oncekiDanismanId: true,
  durum: true,
} as const;

/**
 * Öğrencinin bekleyen talebi (varsa) — kendi ekranında gösterilir.
 *
 * Tek satır dönüyor çünkü veritabanı da tek satıra izin veriyor
 * (`ux_danisman_talebi_tek_bekleyen`).
 */
export async function bekleyenTalebimiGetir(ogrenciId: number): Promise<{
  id: number;
  olusturmaTarihi: Date;
  istenenDanisman: { id: number; ad: string; soyad: string; brans: string | null };
} | null> {
  const talep = await prisma.danismanTalebi.findFirst({
    where: { ogrenciId, durum: "BEKLIYOR" },
    select: {
      id: true,
      olusturmaTarihi: true,
      istenenDanisman: {
        select: { id: true, ad: true, soyad: true, brans: true },
      },
    },
  });
  return talep;
}

/**
 * Öğrencinin en son karara bağlanmış talebi — REDDEDİLDİYSE gerekçesi ekranda
 * gösterilsin diye.
 *
 * Onaylanan talep de dönebiliyor ama ekran onu basmıyor: onayın karşılığı
 * zaten danışmanın değişmiş olması ve bunu "mevcut durum" satırı söylüyor.
 */
export async function sonKararliTalebimiGetir(ogrenciId: number): Promise<{
  durum: DanismanTalebiDurumu;
  retGerekcesi: string | null;
  kararTarihi: Date | null;
  istenenDanisman: { ad: string; soyad: string };
} | null> {
  return prisma.danismanTalebi.findFirst({
    where: { ogrenciId, durum: { not: "BEKLIYOR" } },
    orderBy: { kararTarihi: "desc" },
    select: {
      durum: true,
      retGerekcesi: true,
      kararTarihi: true,
      istenenDanisman: { select: { ad: true, soyad: true } },
    },
  });
}

/**
 * Öğrencinin danışman seçimi — hem ilk seçim hem değişiklik buradan geçer.
 *
 * `ogrenciDanismanSecti` (atama.ts) bunu çağırır; ayrım burada yapılıyor
 * çünkü "atansın mı, onaya mı gitsin" sorusunun cevabı öğrencinin O ANKİ
 * durumuna bağlı ve iki ekranın (panel bölümü, seçim kapısı) aynı kararı
 * vermesi gerekiyor.
 */
export async function danismanSecimTalebiniYurut(
  ogrenciId: number,
  secilenDanismanId: number,
  /** Öğrencinin şu anki aktif ataması; yoksa null. */
  mevcutDanismanId: number | null,
): Promise<DanismanSecimSonucu> {
  if (mevcutDanismanId === secilenDanismanId) {
    return { tur: "AYNI_DANISMAN" };
  }

  const secilen = await prisma.kullanici.findUniqueOrThrow({
    where: { id: secilenDanismanId },
    select: { ad: true, soyad: true },
  });
  const istenenAdSoyad = `${secilen.ad} ${secilen.soyad}`;

  // İLK SEÇİM: onay yok, doğrudan atanır (bkz. dosya başlığı).
  if (mevcutDanismanId === null) {
    return { tur: "ATANDI" };
  }

  /*
   * Bekleyen talebi olan öğrenci ikincisini açamaz. Veritabanı da reddediyor
   * (kısmi tekillik) ama hata sayfası yerine ekranda açıklanmış bir cevap
   * dönmek gerekiyor: kısıt ihlali kullanıcıya "bir şeyler ters gitti" der,
   * oysa durum gayet anlaşılır — zaten bekleyen bir isteğin var.
   */
  const bekleyen = await bekleyenTalebimiGetir(ogrenciId);
  if (bekleyen) {
    return {
      tur: "BEKLEYEN_TALEP_VAR",
      istenenAdSoyad: `${bekleyen.istenenDanisman.ad} ${bekleyen.istenenDanisman.soyad}`,
    };
  }

  const ogrenci = await prisma.kullanici.findUniqueOrThrow({
    where: { id: ogrenciId },
    select: { ad: true, soyad: true, sinif: true },
  });

  await prisma.danismanTalebi.create({
    data: {
      ogrenciId,
      istenenDanismanId: secilenDanismanId,
      oncekiDanismanId: mevcutDanismanId,
    },
  });

  /*
   * İSTENEN ÖĞRETMENE HABER. Kuyruğun görüldüğü tek yer "Öğrencilerim"
   * ekranının başı; bildirim olmasaydı öğretmen oraya uğramadıkça talepten
   * haberi olmazdı ve öğrenci cevapsız beklerdi.
   */
  await bildirimGonder({
    kullaniciId: secilenDanismanId,
    kod: BILDIRIM_KODLARI.DANISMAN_TALEBI_GELDI,
    degiskenler: {
      ogrenciAdSoyad: `${ogrenci.ad} ${ogrenci.soyad}`,
      sinif: ogrenci.sinif ?? "—",
    },
  });

  return { tur: "ONAYA_GONDERILDI", istenenAdSoyad };
}

/**
 * Karar verme yetkisi.
 *
 * İki kişi: istenen öğretmenin kendisi ve öğrencinin ilindeki koordinatör.
 * Koordinatör kontrolü ROL üzerinden değil, o ilin GÜNCEL koordinatörü
 * sorularak yapılıyor — "il koordinatörü rolü var" demek "bu öğrencinin ilinin
 * koordinatörü" demek değildir ve başka ilin koordinatörüne karar hakkı
 * vermek, kapsam kuralının sessizce delinmesi olurdu.
 */
export async function talebeKararVerebilirMi(
  talepId: number,
  kararVerenId: number,
): Promise<boolean> {
  const talep = await prisma.danismanTalebi.findUnique({
    where: { id: talepId },
    select: {
      durum: true,
      istenenDanismanId: true,
      ogrenci: { select: { ilKodu: true } },
    },
  });
  if (!talep || talep.durum !== "BEKLIYOR") return false;
  if (talep.istenenDanismanId === kararVerenId) return true;

  const koordinatorId = await ilKoordinatoruGetir(talep.ogrenci.ilKodu);
  return koordinatorId !== null && koordinatorId === kararVerenId;
}

export type KararSonucu =
  | { olurMu: true; ogrenciAdSoyad: string }
  | { olurMu: false; neden: string };

/**
 * Talebin onaylanması — atama BURADA devrolur.
 *
 * Sıra önemli: önce talep karara bağlanır, sonra atama değişir. Tersi olsaydı
 * atama değişip talep BEKLIYOR kalabilir ve öğrenci hem yeni danışmanını hem
 * "onay bekliyor" satırını aynı anda görürdü.
 *
 * SEÇİLEN ÖĞRETMEN HÂLÂ ADAY MI diye yeniden sorulur: talep açıldıktan sonra
 * öğretmen danışmanlık görevini bırakmış ya da okuldan ayrılmış olabilir.
 * Sormasaydık onay, artık var olmayan bir görevi geri kurardı.
 */
export async function talebiOnayla(
  talepId: number,
  kararVerenId: number,
): Promise<KararSonucu> {
  const talep = await prisma.danismanTalebi.findUnique({
    where: { id: talepId },
    select: {
      ...TALEP_ALANLARI,
      ogrenci: { select: { ad: true, soyad: true, kurumKodu: true } },
    },
  });
  if (!talep || talep.durum !== "BEKLIYOR") {
    return { olurMu: false, neden: "Bu talep zaten karara bağlanmış." };
  }

  if (talep.ogrenci.kurumKodu === null) {
    return { olurMu: false, neden: "Öğrencinin okul kaydı görünmüyor." };
  }

  const uygunMu = await prisma.kullanici.findFirst({
    where: {
      AND: [
        danismanAdayiFiltresi(talep.ogrenci.kurumKodu),
        { id: talep.istenenDanismanId },
      ],
    },
    select: { id: true },
  });
  if (!uygunMu) {
    return {
      olurMu: false,
      neden:
        "İstenen öğretmen artık bu okulun danışman adayları arasında değil; talep onaylanamaz.",
    };
  }

  const ogrenciAdSoyad = `${talep.ogrenci.ad} ${talep.ogrenci.soyad}`;

  await prisma.danismanTalebi.update({
    where: { id: talepId },
    data: {
      durum: "ONAYLANDI",
      kararTarihi: new Date(),
      kararVerenId,
    },
  });

  const sonuc = await atamaDegistir({
    ogrenciId: talep.ogrenciId,
    danismanKullaniciId: talep.istenenDanismanId,
    atamaTipi: "OGRENCI_SECTI",
    kapanmaNedeni: "OGRENCI_ISTEGI",
  });

  await bildirimGonder({
    kullaniciId: talep.ogrenciId,
    kod: BILDIRIM_KODLARI.DANISMAN_TALEBI_ONAYLANDI,
    degiskenler: { danismanAdSoyad: await adSoyad(talep.istenenDanismanId) },
  });

  /*
   * KARARI KOORDİNATÖR VERDİYSE ÖĞRETMENE DE HABER. Kendi onayladığında
   * gönderilmez — kişinin az önce bastığı düğmeyi ona bildirim olarak geri
   * yollamak, bildirim listesini gürültüye boğar.
   */
  if (kararVerenId !== talep.istenenDanismanId) {
    await bildirimGonder({
      kullaniciId: talep.istenenDanismanId,
      kod: BILDIRIM_KODLARI.OGRENCI_DANISMAN_SECTI,
      degiskenler: { ogrenciAdSoyad, sinif: "—" },
    });
  }

  /*
   * ESKİ ÖĞRETMENE HABER. Bırakılan tarafın onay hakkı yok ama haber hakkı
   * var: listesinden düşen öğrenciyi kendi hatası sanmamalı.
   *
   * Kaynak `atamaDegistir`in döndürdüğü ÖNCEKİ danışman, talepteki kayıt
   * değil: onay gecikirken araya bir devir girmişse gerçekten bırakılan kişi
   * odur.
   */
  if (
    sonuc.oncekiDanismanKullaniciId !== null &&
    sonuc.oncekiDanismanKullaniciId !== talep.istenenDanismanId
  ) {
    await bildirimGonder({
      kullaniciId: sonuc.oncekiDanismanKullaniciId,
      kod: BILDIRIM_KODLARI.OGRENCI_DANISMANLIKTAN_AYRILDI,
      degiskenler: {
        ogrenciAdSoyad,
        neOldu: "başka bir danışman öğretmen seçti ve bu değişiklik onaylandı",
      },
    });
  }

  return { olurMu: true, ogrenciAdSoyad };
}

/**
 * Talebin reddi.
 *
 * GEREKÇE ZORUNLU. Reddedilen öğrenci "neden" sorusunun cevabını ekranda
 * bulmalı; gerekçesiz ret, öğrenciyi aynı isteği tekrar tekrar göndermeye
 * iterdi — isteğin çözmek istediği döngünün ta kendisi.
 *
 * ATAMA DEĞİŞMEZ: öğrenci mevcut danışmanıyla kalır. Bu, akışın en önemli
 * özelliği — ret hiçbir koşulda öğrenciyi danışmansız bırakmaz.
 */
export async function talebiReddet(
  talepId: number,
  kararVerenId: number,
  gerekce: string,
): Promise<KararSonucu> {
  const temiz = gerekce.trim();
  if (temiz.length < 5) {
    return {
      olurMu: false,
      neden: "Ret gerekçesi en az 5 karakter olmalı; öğrenci nedenini görecek.",
    };
  }

  const talep = await prisma.danismanTalebi.findUnique({
    where: { id: talepId },
    select: {
      ...TALEP_ALANLARI,
      ogrenci: { select: { ad: true, soyad: true } },
    },
  });
  if (!talep || talep.durum !== "BEKLIYOR") {
    return { olurMu: false, neden: "Bu talep zaten karara bağlanmış." };
  }

  await prisma.danismanTalebi.update({
    where: { id: talepId },
    data: {
      durum: "REDDEDILDI",
      retGerekcesi: temiz.slice(0, 500),
      kararTarihi: new Date(),
      kararVerenId,
    },
  });

  await bildirimGonder({
    kullaniciId: talep.ogrenciId,
    kod: BILDIRIM_KODLARI.DANISMAN_TALEBI_REDDEDILDI,
    degiskenler: {
      danismanAdSoyad: await adSoyad(talep.istenenDanismanId),
      gerekce: temiz,
    },
  });

  return {
    olurMu: true,
    ogrenciAdSoyad: `${talep.ogrenci.ad} ${talep.ogrenci.soyad}`,
  };
}

/**
 * Öğrencinin kendi talebinden vazgeçmesi.
 *
 * Kimseye bildirim GİTMEZ: açılıp geri alınan bir istek, öğretmenin bilmesi
 * gereken bir olay değil — kuyruğundan düşmesi yeterli. Kayıt silinmiyor,
 * GERI_CEKILDI olarak duruyor: "kaç öğrenci istekten vazgeçiyor" sorusu ancak
 * böyle cevaplanabilir.
 */
export async function talebimiGeriCek(
  talepId: number,
  ogrenciId: number,
): Promise<boolean> {
  const sonuc = await prisma.danismanTalebi.updateMany({
    where: { id: talepId, ogrenciId, durum: "BEKLIYOR" },
    data: { durum: "GERI_CEKILDI", kararTarihi: new Date() },
  });
  return sonuc.count > 0;
}

/**
 * Bir öğretmenin ya da koordinatörün karar bekleyen talepleri.
 *
 * ÖĞRETMEN: yalnızca kendisinden istenenler.
 * KOORDİNATÖR: kendi ilindeki BÜTÜN bekleyen talepler — cevapsız kalan
 * istekleri o çözüyor (bkz. dosya başlığı).
 *
 * Koordinatör aynı zamanda bir öğretmenden istenmiş olabilir; iki küme `OR`
 * ile birleşiyor, ayrı sorgular yazılsaydı aynı satır iki kez görünebilirdi.
 */
export async function bekleyenTalepleriGetir(
  kullaniciId: number,
  /** Kişi bu ilin koordinatörüyse ilin kodu; değilse null. */
  sorumluIlKodu: string | null,
): Promise<BekleyenTalep[]> {
  const talepler = await prisma.danismanTalebi.findMany({
    where: {
      durum: "BEKLIYOR",
      OR: [
        { istenenDanismanId: kullaniciId },
        ...(sorumluIlKodu ? [{ ogrenci: { ilKodu: sorumluIlKodu } }] : []),
      ],
    },
    orderBy: { olusturmaTarihi: "asc" },
    select: {
      id: true,
      olusturmaTarihi: true,
      ogrenci: { select: { id: true, ad: true, soyad: true, sinif: true } },
      istenenDanisman: { select: { id: true, ad: true, soyad: true } },
      oncekiDanisman: { select: { id: true, ad: true, soyad: true } },
    },
  });

  return talepler;
}

/** Bekleyen talep SAYISI — panel kartı ve "Dikkat gerektirenler" satırı için. */
export async function bekleyenTalepSayisi(
  kullaniciId: number,
  sorumluIlKodu: string | null,
): Promise<number> {
  return prisma.danismanTalebi.count({
    where: {
      durum: "BEKLIYOR",
      OR: [
        { istenenDanismanId: kullaniciId },
        ...(sorumluIlKodu ? [{ ogrenci: { ilKodu: sorumluIlKodu } }] : []),
      ],
    },
  });
}

async function adSoyad(kullaniciId: number): Promise<string> {
  const kayit = await prisma.kullanici.findUnique({
    where: { id: kullaniciId },
    select: { ad: true, soyad: true },
  });
  return kayit ? `${kayit.ad} ${kayit.soyad}` : "—";
}
