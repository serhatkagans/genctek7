import type { Prisma } from "@/generated/prisma/client";
import { OGRETMEN } from "@/lib/yetki/kapsam";

/**
 * İL KİŞİ LİSTESİ SÜZGECİ (31 Ağustos 2026 · istek: "Burada liste çıksın
 * ilindeki öğretmen listesi, öğrenci listesi … bu alandaki listenin filtreleri
 * … görsel gibi olsun").
 *
 * Görseldeki tablo altı sütun ve her sütunun kendi süzgeci: ad · tür · görev ·
 * kurum · e-posta · telefon. Bu dosya o altı sütunun ARKASINDAKİ koşulu
 * üretiyor; ekranı `components/IlKisiListesi.tsx` basıyor.
 *
 * ===========================================================================
 * NİYE TEK LİSTE, ÜÇ AYRI LİSTE DEĞİL
 * ===========================================================================
 * Öğrenci, öğretmen ve paydaş temsilcisi ayrı ekranlarda zaten var (Öğrenciler,
 * Öğretmenler, Paydaşlar). Buradaki listenin sorusu farklı: "ilimde kime
 * ulaşabilirim". O soruyu soran kişi, aradığı adın öğrenci mi öğretmen mi
 * olduğunu çoğu zaman bilmiyor — üç ayrı tabloya bakmak zorunda bırakılsaydı
 * aynı adı üç kez aratırdı. TÜR bir SÜTUN, bir ekran değil.
 *
 * ===========================================================================
 * SAF TUTULUR
 * ===========================================================================
 * Veritabanına gitmez, oturuma bakmaz; yalnızca `where` üretir. Kapsam (hangi
 * il) çağırandan geliyor ve süzgeç onu YALNIZCA DARALTIR — adres çubuğuna
 * yazılan bir değer kapsamı genişletemez (SKILL.md · Değişmezler).
 */

// ---------------------------------------------------------------------------
// Tür
// ---------------------------------------------------------------------------

/*
 * ÜÇ TÜR, GÖRSELDEKİ ÜÇ DEĞER: "öğrenci · paydaş · öğretmen". Mezun listede
 * YOK ve bu bilinçli: mezunun ili var ama okulu yok, ekip ve etkinlik işinde
 * ilin muhatabı değil. Gerekirse dördüncü değer olarak eklenir — koşulu bu
 * dosyada tek satırdır.
 */
export const KISI_TURLERI = ["OGRENCI", "OGRETMEN", "PAYDAS"] as const;
export type KisiTuru = (typeof KISI_TURLERI)[number];

export const KISI_TURU_ETIKETLERI: Record<KisiTuru, string> = {
  OGRENCI: "Öğrenci",
  OGRETMEN: "Öğretmen",
  PAYDAS: "Paydaş",
};

export function kisiTuruMu(deger: string): deger is KisiTuru {
  return (KISI_TURLERI as readonly string[]).includes(deger);
}

const AKTIF_OGRENCI: Prisma.KullaniciWhereInput = {
  roller: { some: { rolKodu: "OGRENCI", bitisTarihi: null } },
};

const AKTIF_PAYDAS: Prisma.KullaniciWhereInput = {
  roller: { some: { rolKodu: "PAYDAS_TEMSILCISI", bitisTarihi: null } },
};

/*
 * "ÖĞRETMEN" KOŞULU MERKEZİ SABİTTEN GELİYOR (`lib/yetki/kapsam.ts · OGRETMEN`)
 * ve burada yeniden yazılmadı: sistemde `OGRETMEN` diye bir rol kodu yok,
 * öğretmen olmak "öğrenci/mezun/paydaş/merkez personeli olmamak"tır. Kopyası
 * çıkarılsaydı, tanım bir gün değiştiğinde bu liste geride kalırdı.
 */
const TUR_KOSULLARI: Record<KisiTuru, Prisma.KullaniciWhereInput> = {
  OGRENCI: AKTIF_OGRENCI,
  OGRETMEN: OGRETMEN,
  PAYDAS: AKTIF_PAYDAS,
};

// ---------------------------------------------------------------------------
// Görev
// ---------------------------------------------------------------------------

/**
 * "GÖREV" SÜTUNUNUN SÜZGECİ — görseldeki örnek değer "mentör".
 *
 * İKİ AYRI KAYNAK TEK SÜTUNDA:
 *   · ROL (`kullanici_rol`) — danışman öğretmen, il koordinatörü,
 *   · GÖREV ROLÜ (`ogrenci_gorev_rolu`) — il/ilçe/okul temsilcisi, çalışma
 *     grubu yöneticisi,
 *   · MENTÖRLÜK (`mentorluk`) — onaylanmış mentör.
 *
 * Üçü ayrı tablo ama listeye bakan kişi için hepsi aynı soruya cevap:
 * "bu kişi ne yapıyor". Üç ayrı sütun basılsaydı satırların çoğu boş üç hücre
 * gösterirdi.
 */
export const KISI_GOREVLERI = [
  "MENTOR",
  "DANISMAN",
  "IL_KOORDINATOR",
  "IL_TEMSILCISI",
  "ILCE_TEMSILCISI",
  "OKUL_TEMSILCISI",
  "CALISMA_GRUBU_YONETICISI",
] as const;
export type KisiGorevi = (typeof KISI_GOREVLERI)[number];

export const KISI_GOREV_ETIKETLERI: Record<KisiGorevi, string> = {
  MENTOR: "Mentör",
  DANISMAN: "Danışman öğretmen",
  IL_KOORDINATOR: "İl koordinatörü",
  IL_TEMSILCISI: "İl temsilcisi",
  ILCE_TEMSILCISI: "İlçe temsilcisi",
  OKUL_TEMSILCISI: "Okul temsilcisi",
  CALISMA_GRUBU_YONETICISI: "Çalışma grubu yöneticisi",
};

export function kisiGoreviMi(deger: string): deger is KisiGorevi {
  return (KISI_GOREVLERI as readonly string[]).includes(deger);
}

/** Görev rolü tablosundan okunan görevler; kalanlar rol ya da mentörlüktür. */
const GOREV_ROLLERI = [
  "IL_TEMSILCISI",
  "ILCE_TEMSILCISI",
  "OKUL_TEMSILCISI",
  "CALISMA_GRUBU_YONETICISI",
] as const;

function gorevKosulu(
  gorev: KisiGorevi,
  egitimOgretimYili: string,
): Prisma.KullaniciWhereInput {
  if (gorev === "MENTOR") {
    /*
      MENTÖRLÜK BİR ROL DEĞİL, BİR KAYIT DURUMUDUR (bkz. model Mentorluk):
      kişi başına tek satır ve "şu an mentör mü" sorusunun cevabı `durum`.
      Bırakılmış ya da onay bekleyen mentörlük listede mentör saymıyor —
      ulaşılmak istenen kişi, görevi YÜRÜRLÜKTE olandır.
    */
    return { mentorluk: { durum: "ONAYLANDI" } };
  }
  if (gorev === "DANISMAN" || gorev === "IL_KOORDINATOR") {
    return { roller: { some: { rolKodu: gorev, bitisTarihi: null } } };
  }
  /*
   * DÖNEM ŞARTI: temsilcilik bir yıllık görevdir; geçen yılın temsilcisi bugün
   * o görevde değil ve "ilimin temsilcisi kim" sorusunun cevabı olamaz.
   */
  return {
    gorevRolleri: {
      some: {
        rolKodu: gorev as (typeof GOREV_ROLLERI)[number],
        egitimOgretimYili,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Süzgeç
// ---------------------------------------------------------------------------

export interface KisiSuzgeci {
  /** Ad ya da soyadda geçen metin. */
  ad: string | null;
  tur: KisiTuru | null;
  gorev: KisiGorevi | null;
  /** Okul ya da paydaş kurumunun adında geçen metin. */
  kurum: string | null;
  eposta: string | null;
  telefon: string | null;
}


function metin(deger: string | string[] | undefined): string | null {
  const ilk = Array.isArray(deger) ? deger[0] : deger;
  const kirpik = (ilk ?? "").trim();
  return kirpik === "" ? null : kirpik;
}

/**
 * Adres çubuğundaki değerleri süzgece çevirir.
 *
 * PARAMETRE ADLARI `k` ÖNEKLİ (`kad`, `ktur`…) ve bu bir üslup tercihi değil:
 * liste, Ekiplerim ekranında EKİP ENVANTERİYLE AYNI ADRESTE duruyor ve o da
 * `ara`, `tur`, `sayfa` parametrelerini kullanıyor. Önek olmasaydı ekipleri
 * türe göre süzen kişi, aynı anda kişi listesini de süzmüş olurdu.
 */
/**
 * Bu listenin adres çubuğunda taşıdığı parametreler.
 *
 * TEK YERDE: aynı adreste duran EKİP ENVANTERİNİN formu, gönderilirken bu
 * alanları gizli alan olarak yeniden yazmak zorunda (`method="get"` formu adres
 * çubuğunu yalnızca kendi alanlarından kuruyor). "k ile başlayanlar" gibi bir
 * kural yeterli olmazdı — envanterin kendi `kapali` parametresi de k ile
 * başlıyor ve iki kez yazılırdı.
 */
export const KISI_SUZGEC_PARAMETRELERI = [
  "kad",
  "ktur",
  "kgorev",
  "kkurum",
  "keposta",
  "ktel",
  "ksayfa",
] as const;

export function kisiSuzgeciniCoz(
  parametreler: Record<string, string | string[] | undefined>,
): KisiSuzgeci {
  const tur = metin(parametreler.ktur);
  const gorev = metin(parametreler.kgorev);
  return {
    ad: metin(parametreler.kad),
    tur: tur && kisiTuruMu(tur) ? tur : null,
    gorev: gorev && kisiGoreviMi(gorev) ? gorev : null,
    kurum: metin(parametreler.kkurum),
    eposta: metin(parametreler.keposta),
    telefon: metin(parametreler.ktel),
  };
}

export function kisiSuzgeciDoluMu(suzgec: KisiSuzgeci): boolean {
  return Object.values(suzgec).some((deger) => deger !== null);
}

export interface KisiKapsami {
  /** Listenin ili; `null` ise ülke geneli (yalnızca merkez). */
  ilKodu: string | null;
  /** Yürürlükteki dönem — görev rolü süzgeçleri buna bakıyor. */
  egitimOgretimYili: string;
}

/**
 * Süzgeç + kapsam → Prisma koşulu.
 *
 * İLETİŞİM ALANLARI İKİ TABLODA: öğrencininki `ogrenci_profil`de,
 * diğerlerininki `ogretmen_profil`de (tablonun adı tarihseldir, içeriği
 * "öğrenci OLMAYAN kullanıcının iletişim bilgisi"dir — bkz. schema.prisma).
 * Süzgeç bu yüzden İKİSİNE BİRDEN bakıyor: tek tabloya bakılsaydı e-postasına
 * göre öğrenci arayan kişi hiçbir sonuç alamazdı.
 *
 * KURUM DA İKİ KAYNAKTAN: okul kaydı (`kurum`) ya da paydaş temsilcisinin
 * temsil ettiği kurum — ikincisi kullanıcıya doğrudan bağlı değil, onay
 * gördüğü başvuru satırı üzerinden bağlı (`disBasvurusu.paydas`). Paydaşın
 * kurum kodu yoktur; yalnızca `kurum`a bakılsaydı paydaş satırlarının kurum
 * sütunu hem boş görünür hem süzülemezdi.
 */
export function kisiKosulu(
  suzgec: KisiSuzgeci,
  kapsam: KisiKapsami,
): Prisma.KullaniciWhereInput {
  const kosullar: Prisma.KullaniciWhereInput[] = [{ aktif: true }];

  if (kapsam.ilKodu) kosullar.push({ ilKodu: kapsam.ilKodu });

  /*
   * TÜR SEÇİLMEDİYSE ÜÇÜ BİRDEN: liste "ilimdeki kişiler"dir, "ilimdeki her
   * kullanıcı kaydı" değil. Koşulsuz bırakılsaydı merkez personeli ve mezunlar
   * da satır açardı ve tür sütununda yazacak bir şey bulunamazdı.
   */
  kosullar.push(
    suzgec.tur
      ? TUR_KOSULLARI[suzgec.tur]
      : { OR: KISI_TURLERI.map((tur) => TUR_KOSULLARI[tur]) },
  );

  if (suzgec.gorev) {
    kosullar.push(gorevKosulu(suzgec.gorev, kapsam.egitimOgretimYili));
  }

  if (suzgec.ad) {
    kosullar.push({
      OR: [
        { ad: { contains: suzgec.ad, mode: "insensitive" } },
        { soyad: { contains: suzgec.ad, mode: "insensitive" } },
      ],
    });
  }

  if (suzgec.kurum) {
    kosullar.push({
      OR: [
        { kurum: { ad: { contains: suzgec.kurum, mode: "insensitive" } } },
        {
          disBasvurusu: {
            paydas: { ad: { contains: suzgec.kurum, mode: "insensitive" } },
          },
        },
      ],
    });
  }

  if (suzgec.eposta) {
    kosullar.push({
      OR: [
        {
          ogrenciProfil: {
            eposta: { contains: suzgec.eposta, mode: "insensitive" },
          },
        },
        {
          ogretmenProfil: {
            eposta: { contains: suzgec.eposta, mode: "insensitive" },
          },
        },
      ],
    });
  }

  if (suzgec.telefon) {
    kosullar.push({
      OR: [
        { ogrenciProfil: { telefon: { contains: suzgec.telefon } } },
        { ogretmenProfil: { telefon: { contains: suzgec.telefon } } },
      ],
    });
  }

  return { AND: kosullar };
}
