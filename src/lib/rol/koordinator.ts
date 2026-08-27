import {
  danismanliktanAyrildi,
  koordinatorunOgrencileriniBosaAl,
  sahipsizOgrencileriKoordinatoreBagla,
} from "../danisman/atama";
import { prisma } from "../db";
import { erisimLogla } from "../yetki/log";
import {
  KOORDINATOR_ATAMA_ENGEL_MESAJLARI,
  koordinatorAtamaEngeli,
  type KoordinatorAtamaSonucu,
  yenidenDagitilanOgrenciSayisi,
} from "./karar";

/**
 * İl koordinatörü atama ve kaldırma — references/domain-rules.md Bölüm 3.
 *
 * Kritik kural: DANIŞMAN ÖĞRETMEN DE İL KOORDİNATÖRÜ YAPILABİLİR. Atama
 * engellenmez; öğretmenin üzerindeki öğrenciler devir kurallarına göre yeniden
 * dağıtılır ve işlemi yapan proje yöneticisine kaç öğrencinin etkilendiği
 * gösterilir.
 *
 * Sıralama önemlidir ve veritabanı kısıtından doğar: bir öğretmen aynı anda
 * hem DANISMAN hem IL_KOORDINATOR olamaz (kısmi unique index). Bu yüzden önce
 * danışmanlık kapatılır, sonra koordinatörlük açılır, en son öğrenciler
 * dağıtılır — dağıtım anında ilin koordinatörü artık bu kişidir, yani okulda
 * başka danışman kalmadıysa öğrenciler onda kalmaya devam eder.
 */

export class KoordinatorAtamaHatasi extends Error {
  constructor(mesaj: string) {
    super(mesaj);
    this.name = "KoordinatorAtamaHatasi";
  }
}

/** Prisma'nın benzersizlik ihlali (P2002) hatası mı? */
function benzersizlikIhlaliMi(hata: unknown): boolean {
  return (
    typeof hata === "object" &&
    hata !== null &&
    "code" in hata &&
    (hata as { code?: unknown }).code === "P2002"
  );
}

export type { KoordinatorAtamaSonucu };
export { yenidenDagitilanOgrenciSayisi };

/**
 * Atama notunun azami uzunluğu; ekrandaki `maxLength` ile aynı sayı.
 *
 * KURAL KATMANINDA, EYLEM DOSYASINDA DEĞİL: `"use server"` işaretli bir dosya
 * yalnızca async fonksiyon dışa aktarabiliyor (derleme hatası: "Only async
 * functions are allowed to be exported in a use server file"), yani sabit
 * oradan okunamıyordu. Yeri zaten burası — sütun `TEXT`, sınır bir ürün
 * kararıdır.
 */
export const ACIKLAMA_AZAMI = 1000;

export async function ilKoordinatoruAta(
  hedefKullaniciId: number,
  ilKodu: string,
  atayanKullaniciId: number,
  /**
   * Atamanın serbest metin notu (27 Ağustos 2026). Boş bırakılabilir ve boş
   * geldiğinde `null` yazılır: "" ile null arasındaki fark ekranda "açıklama
   * yok" ile "açıklama silinmiş" olarak okunurdu, oysa ikisi de aynı şey.
   */
  aciklama: string | null = null,
): Promise<KoordinatorAtamaSonucu> {
  const hedef = await prisma.kullanici.findUnique({
    where: { id: hedefKullaniciId },
    select: {
      id: true,
      ad: true,
      soyad: true,
      aktif: true,
      kurumKodu: true,
      roller: {
        where: { bitisTarihi: null },
        select: { id: true, rolKodu: true },
      },
    },
  });

  const [ilVarMi, doluMu] = await Promise.all([
    prisma.il.findUnique({ where: { ilKodu }, select: { ilKodu: true } }),
    // Bir ilde aynı anda tek koordinatör olur; boşaltma ayrı bir işlemdir.
    prisma.kullaniciRol.findFirst({
      where: { rolKodu: "IL_KOORDINATOR", ilKodu, bitisTarihi: null },
      select: { kullaniciId: true },
    }),
  ]);

  const engel = koordinatorAtamaEngeli({
    hedefVarMi: hedef !== null,
    hedefAktifMi: hedef?.aktif ?? false,
    hedefRolKodlari: hedef?.roller.map((rol) => rol.rolKodu) ?? [],
    ilTanimliMi: ilVarMi !== null,
    ildeGorevliKoordinatorVarMi: doluMu !== null,
  });
  if (engel || !hedef) {
    throw new KoordinatorAtamaHatasi(
      KOORDINATOR_ATAMA_ENGEL_MESAJLARI[engel ?? "KULLANICI_YOK"],
    );
  }

  const danismanRolu = hedef.roller.find((rol) => rol.rolKodu === "DANISMAN");
  const danismanliktanAlindiMi = danismanRolu !== undefined;

  /*
   * Danışmanlık kaydı ile koordinatörlük kaydı tek transaction içinde yer
   * değiştirir: aradaki bir hata öğretmeni hem danışmansız hem koordinatörsüz
   * bırakırdı.
   */
  try {
    await prisma.$transaction(async (islem) => {
      if (danismanRolu) {
        await islem.kullaniciRol.update({
          where: { id: danismanRolu.id },
          data: { bitisTarihi: new Date() },
        });
        // Koordinatör, danışman aday listesinde görünmemeli. Filtre zaten
        // koordinatörleri eliyor; işaret de tutarlı kalsın diye kaldırılıyor.
        await islem.ogretmenProfil.updateMany({
          where: { kullaniciId: hedefKullaniciId },
          data: { danismanOlmakIstiyor: false, isaretlemeTarihi: null },
        });
      }

      await islem.kullaniciRol.create({
        data: {
          kullaniciId: hedefKullaniciId,
          rolKodu: "IL_KOORDINATOR",
          ilKodu,
          atayanKullaniciId,
          aciklama: aciklama?.trim() || null,
        },
      });
    });
  } catch (hata) {
    /*
     * Yukarıdaki "ilde koordinatör var mı" kontrolü transaction dışında
     * yapılır; iki proje yöneticisi aynı ile aynı anda atama yaparsa ikisi de
     * ili boş görür. Son sözü veritabanı kısıtı söyler
     * (ux_il_koordinator_tek_aktif) — kaybeden isteğe ham veritabanı hatası
     * değil, olan biteni anlatan bir mesaj döner.
     */
    if (benzersizlikIhlaliMi(hata)) {
      throw new KoordinatorAtamaHatasi(
        KOORDINATOR_ATAMA_ENGEL_MESAJLARI.IL_DOLU,
      );
    }
    throw hata;
  }

  /*
   * Öğrenci dağıtımı rol değişiminden SONRA yapılır ki "il koordinatörüne
   * devret" kararı yeni koordinatörü (yani bu kişiyi) bulsun. Okulda başka
   * danışman kalmadıysa öğrenciler fiilen yerinde kalır; atamaDegistir aynı
   * kişiyi yeniden yazmaz ve gereksiz bildirim gitmez.
   */
  const dagitim = danismanliktanAlindiMi
    ? await danismanliktanAyrildi(
        hedefKullaniciId,
        hedef.kurumKodu,
        "IL_KOORDINATORU_OLDU",
      )
    : { devredilenOgrenciSayisi: 0, yenidenSecimBekleyen: 0 };

  // Kenar durum: il koordinatörsüz kaldığında atamasız kalan öğrenciler yeni
  // koordinatör gelir gelmez, ayrı bir onay adımı olmadan ona bağlanır.
  const sahipsizkenBaglanan = await sahipsizOgrencileriKoordinatoreBagla(
    ilKodu,
    hedefKullaniciId,
  );

  await erisimLogla({
    kullaniciId: atayanKullaniciId,
    islem: "DEGISIKLIK",
    hedefTip: "ROL",
    hedefId: hedefKullaniciId,
    detay: `İl koordinatörü atandı (${ilKodu}): ${hedef.ad} ${hedef.soyad}${
      danismanliktanAlindiMi ? " · danışmanlık görevi kapatıldı" : ""
    }`,
  });

  return {
    koordinatorKullaniciId: hedefKullaniciId,
    danismanliktanAlindiMi,
    devredilenOgrenciSayisi: dagitim.devredilenOgrenciSayisi,
    yenidenSecimBekleyen: dagitim.yenidenSecimBekleyen,
    sahipsizkenBaglananOgrenciSayisi: sahipsizkenBaglanan,
  };
}

export interface KoordinatorKaldirmaSonucu {
  ilKodu: string;
  /** Koordinatör boşaldığı için "atanmamış" duruma düşen öğrenciler. */
  atanmamisKalanOgrenciSayisi: number;
}

export async function ilKoordinatorluguKaldir(
  hedefKullaniciId: number,
  kaldiranKullaniciId: number,
): Promise<KoordinatorKaldirmaSonucu> {
  const rol = await prisma.kullaniciRol.findFirst({
    where: {
      kullaniciId: hedefKullaniciId,
      rolKodu: "IL_KOORDINATOR",
      bitisTarihi: null,
    },
    select: {
      id: true,
      ilKodu: true,
      kullanici: { select: { ad: true, soyad: true } },
    },
  });

  if (!rol || !rol.ilKodu) {
    throw new KoordinatorAtamaHatasi(
      "Bu kullanıcının aktif il koordinatörlüğü yok.",
    );
  }

  // Rol geçmişli tutulur: silme yok, bitiş tarihi yazılır.
  await prisma.kullaniciRol.update({
    where: { id: rol.id },
    data: { bitisTarihi: new Date() },
  });

  const atanmamisKalan =
    await koordinatorunOgrencileriniBosaAl(hedefKullaniciId);

  await erisimLogla({
    kullaniciId: kaldiranKullaniciId,
    islem: "DEGISIKLIK",
    hedefTip: "ROL",
    hedefId: hedefKullaniciId,
    detay: `İl koordinatörlüğü kaldırıldı (${rol.ilKodu}): ${rol.kullanici.ad} ${rol.kullanici.soyad} · ${atanmamisKalan} öğrenci atanmamış duruma düştü`,
  });

  return {
    ilKodu: rol.ilKodu,
    atanmamisKalanOgrenciSayisi: atanmamisKalan,
  };
}

/**
 * Bir ilin görevdeki koordinatörünü, öğretmene gösterilecek kadarıyla getirir.
 *
 * Yalnızca ad, soyad ve e-posta döner. Telefon BİLEREK yok: öğretmenin
 * koordinatörüne ulaşması için e-posta yeterli, telefon ise kişinin kendi
 * girdiği ve daha dar paylaşılması gereken bir bilgi.
 *
 * E-posta `ogretmen_profil`de durur ve kişinin kendi girdiği alandır; hiç
 * girmemiş olabilir, bu yüzden null dönebilir.
 */
export async function ilKoordinatoruOzeti(ilKodu: string): Promise<{
  id: number;
  ad: string;
  soyad: string;
  eposta: string | null;
  /** Fotoğrafın kendisi rotadan gelir; burada yalnızca VAR MI bilgisi. */
  fotoVarMi: boolean;
} | null> {
  const rol = await prisma.kullaniciRol.findFirst({
    where: { rolKodu: "IL_KOORDINATOR", ilKodu, bitisTarihi: null },
    select: {
      kullanici: {
        select: {
          id: true,
          ad: true,
          soyad: true,
          aktif: true,
          fotoDepolamaYolu: true,
          ogretmenProfil: { select: { eposta: true } },
        },
      },
    },
  });

  // Pasife alınmış kullanıcı koordinatör olarak gösterilmez: görevi teknik
  // olarak açık kalmış olabilir ama kendisine ulaşılamaz.
  if (!rol || !rol.kullanici.aktif) return null;

  return {
    id: rol.kullanici.id,
    ad: rol.kullanici.ad,
    soyad: rol.kullanici.soyad,
    eposta: rol.kullanici.ogretmenProfil?.eposta?.trim() || null,
    fotoVarMi: rol.kullanici.fotoDepolamaYolu !== null,
  };
}

/**
 * Aktif il koordinatörlüğünün açıklamasını değiştirir (27 Ağustos 2026 · istek:
 * "sonradan metni düzenleme de olsun").
 *
 * YALNIZCA AKTİF KAYIT: `bitisTarihi: null` koşulu `where` içinde. Geçmiş
 * görevlerin notu olduğu gibi kalmalı — kapanmış bir atamanın gerekçesini
 * sonradan değiştirmek, kaydın kendisini yeniden yazmak olurdu.
 *
 * BULUNAMAZSA `false` DÖNER, hata atmaz: görev bu arada kaldırılmış olabilir
 * ve çağıran ekran bunu kullanıcıya kendi diliyle söylüyor.
 */
export async function ilKoordinatorAciklamasiniYaz(
  kullaniciId: number,
  aciklama: string | null,
): Promise<boolean> {
  const sonuc = await prisma.kullaniciRol.updateMany({
    where: { kullaniciId, rolKodu: "IL_KOORDINATOR", bitisTarihi: null },
    data: { aciklama: aciklama?.trim() || null },
  });
  return sonuc.count > 0;
}
