import type { Prisma } from "@/generated/prisma/client";
import type { EtkinlikKategorisi, Kapsam } from "@/generated/prisma/enums";
import {
  ETKINLIK_KATEGORILERI,
  KAPSAMLAR,
} from "@/lib/faaliyet/kurallar";
import { faaliyetKapsamFiltresi } from "@/lib/yetki/kapsam";
import type { OturumKullanicisi } from "@/lib/yetki/tipler";
import {
  type SorguParametreleri,
  tekil,
} from "../ogrenciler/filtreler";

/**
 * Faaliyet listesi filtrelerinin adres çubuğundan okunması ve sorguya
 * çevrilmesi.
 *
 * Ekran ve CSV dışa aktarma aynı fonksiyonu kullanır; indirilen dosyanın
 * ekranda görünenden farklı bir küme olması ancak bu iki yol ayrı yazılırsa
 * mümkün olur.
 */

export interface FaaliyetFiltreleri {
  kapsam: Kapsam | null;
  kategori: EtkinlikKategorisi | null;
  calismaGrubuId: number | null;
  yalnizcaAcik: boolean;
  yalnizcaBenim: boolean;
  /**
   * Biten ama raporu yazılmamış etkinlikler.
   *
   * Raporlar sekmesi menüden kalktı (J3 · 6 Ağustos 2026) ve o ekranın asıl
   * değeri "hangi raporlar eksik" TOPLU görünümüydü. Görünüm kaybolmasın diye
   * buraya filtre olarak taşındı; etkinlik detayından tek tek bakmak
   * koordinatörün ilindeki eksikleri görmesini imkânsız kılardı.
   */
  yalnizcaRaporsuz: boolean;
  /**
   * Onay bekleyen etkinlikler (11 Ağustos 2026).
   *
   * PROJE YÖNETİCİSİNİN ONAY KUYRUĞU BURADAN AÇILIYOR. Merkez, öğrencinin
   * açtığı HER etkinliği onaylayabilir (`faaliyetOnaylayabilirMi` proje
   * yöneticisine koşulsuz evet der) ve bu tek güvence: öğrencinin ilinde
   * koordinatör olmayabilir. Ama panelin "Onay bekleyen" kartı
   * `?kapsam=ULUSAL` listesine götürüyordu — sayı ülke genelindeki bekleyen
   * etkinliklerin tamamını sayarken bağlantı yalnızca ulusal kapsamlıları
   * gösteriyordu. Koordinatörsüz bir ilde açılan okul içi öğrenci etkinliği
   * kartta SAYILIYOR ama listede HİÇ ÇIKMIYORDU; merkez yetkili olduğu kaydı
   * ancak doğrudan bağlantısını bilirse açabiliyordu.
   *
   * Filtre kapsamdan bağımsız: onay bekleyen kayıt, görebilen herkes için
   * "karar bekleyen iş"tir. Kapsam filtresi zaten kimin neyi göreceğini
   * söylüyor (bkz. faaliyetKapsamFiltresi) — koordinatör yalnızca kendi
   * ilinin bekleyenlerini, merkez hepsini görür.
   */
  yalnizcaOnayBekleyen: boolean;
  /**
   * Zaman durumu sekmesi (15 Ağustos 2026 · Aşama 6b).
   *
   * Manisa panelinde "Devam Eden / Tamamlanan" ayrı sekmeler; bizde durum
   * rozeti vardı ama tek tıkla daraltma yoktu.
   *
   * GÖRÜNÜM TERCİHİNDEN (ızgara/liste) AYRI TUTULDU. Manisa'da ikisi iç içe:
   * "Etkinlikler" sekmesi kart, diğer ikisi tablo. Bu, "tamamlanan etkinlikleri
   * kart olarak görmek" isteyeni çıkmaza sokuyor. İki eksen bizde zaten ayrı ve
   * öyle kalıyor.
   */
  zaman: "hepsi" | "devam" | "tamamlanan";
}

export function zamanGecerliMi(
  deger: string,
): deger is FaaliyetFiltreleri["zaman"] {
  return deger === "hepsi" || deger === "devam" || deger === "tamamlanan";
}

/**
 * Zaman sekmesinin sorgu koşulu.
 *
 * "TAMAMLANAN" = bitiş tarihi geçmiş VE iptal edilmemiş. Çok günlü etkinlikte
 * ölçüt bitiş, tek günlükte tarih — `raporlar` ekranındaki bitmişlik ölçütünün
 * aynısı, iki ekran farklı tanım kullanmasın diye.
 *
 * İPTAL EDİLEN HİÇBİR SEKMEYE GİRMEZ değil — tam tersine "hepsi" sekmesinde
 * durur. İptal bir sonuçtur ve listeden düşmesi, kullanıcının "etkinliğim
 * kayboldu" demesine yol açardı (aynı ilke model Faaliyet notunda yazılı).
 */
export function zamanKosulu(
  zaman: FaaliyetFiltreleri["zaman"],
  simdi: Date,
): Prisma.FaaliyetWhereInput {
  if (zaman === "hepsi") return {};

  const bitmis = {
    OR: [
      { bitisTarihi: { not: null, lte: simdi } },
      { bitisTarihi: null, tarih: { lte: simdi } },
    ],
  };

  return zaman === "tamamlanan"
    ? { durum: "AKTIF", ...bitmis }
    : { durum: "AKTIF", NOT: bitmis };
}

export function faaliyetFiltreleriniCoz(
  parametreler: SorguParametreleri,
): FaaliyetFiltreleri {
  const kapsam = tekil(parametreler.kapsam);
  const kategori = tekil(parametreler.kategori);
  const grup = Number.parseInt(tekil(parametreler.grup) ?? "", 10);

  return {
    // Tanınmayan değer sessizce düşer; filtre yalnızca daralttığı için
    // geçersiz bir değeri reddetmek yerine yok saymak yeterli.
    kapsam: KAPSAMLAR.includes(kapsam as Kapsam) ? (kapsam as Kapsam) : null,
    kategori: ETKINLIK_KATEGORILERI.includes(kategori as EtkinlikKategorisi)
      ? (kategori as EtkinlikKategorisi)
      : null,
    calismaGrubuId: Number.isFinite(grup) ? grup : null,
    yalnizcaAcik: tekil(parametreler.acik) === "1",
    yalnizcaBenim: tekil(parametreler.benim) === "1",
    yalnizcaRaporsuz: tekil(parametreler.raporsuz) === "1",
    yalnizcaOnayBekleyen: tekil(parametreler.onay) === "bekleyen",
    zaman: (() => {
      const deger = tekil(parametreler.zaman) ?? "hepsi";
      return zamanGecerliMi(deger) ? deger : "hepsi";
    })(),
  };
}

export function faaliyetFiltresiVarMi(filtreler: FaaliyetFiltreleri): boolean {
  /*
   * `zaman` SEKMEDİR, filtre değil: "Filtreleri temizle" bağlantısını
   * tetiklememeli ve varsayılan "hepsi" zaten daraltma yapmıyor. Görünüm
   * tercihiyle (ızgara/liste) aynı gerekçe.
   */
  const { zaman, ...suzgecler } = filtreler;
  void zaman;

  return Object.values(suzgecler).some(
    (deger) => deger !== null && deger !== false,
  );
}

export function faaliyetListeFiltresi(
  kullanici: OturumKullanicisi,
  filtreler: FaaliyetFiltreleri,
  simdi: Date,
): Prisma.FaaliyetWhereInput {
  const kosullar: Prisma.FaaliyetWhereInput[] = [
    faaliyetKapsamFiltresi(kullanici),
  ];

  // Zaman sekmesi de sorguya buradan giriyor (Aşama 6b): dışa aktarma da aynı
  // fonksiyondan geçtiği için dosya, açık sekmenin kümesini taşıyor.
  const zaman = zamanKosulu(filtreler.zaman, simdi);
  if (Object.keys(zaman).length > 0) kosullar.push(zaman);

  if (filtreler.kapsam) kosullar.push({ kapsam: filtreler.kapsam });
  // Kapsam ve kategori bağımsız filtrelerdir; birlikte de kullanılabilirler.
  if (filtreler.kategori) {
    kosullar.push({ etkinlikKategorisi: filtreler.kategori });
  }
  if (filtreler.calismaGrubuId !== null) {
    kosullar.push({
      calismaGruplari: { some: { calismaGrubuId: filtreler.calismaGrubuId } },
    });
  }
  if (filtreler.yalnizcaAcik) {
    kosullar.push({
      basvuruBaslangic: { lte: simdi },
      basvuruBitis: { gte: simdi },
      onayDurumu: { in: ["ONAY_GEREKMEZ", "ONAYLANDI"] },
    });
  }
  if (filtreler.yalnizcaBenim) {
    kosullar.push({ duzenleyenKullaniciId: kullanici.id });
  }
  /*
   * Onay kuyruğu. Ek bir yetki kontrolü YOK ve bu bilinçli: filtre yalnızca
   * DARALTIR, kapsam filtresinin göstermediği hiçbir kaydı geri getirmez.
   * Adres çubuğuna `?onay=bekleyen` yazan bir öğrenci kendi bekleyen
   * önerisini görür — zaten görebildiği tek bekleyen kayıt odur.
   */
  if (filtreler.yalnizcaOnayBekleyen) {
    kosullar.push({ onayDurumu: "BEKLIYOR" });
  }
  if (filtreler.yalnizcaRaporsuz) {
    /*
     * "Bitmiş" ölçütü BİTİŞ tarihidir, varsa; yoksa etkinliğin kendi tarihi.
     * Çok günlü bir etkinlik başlangıç tarihi geçtiği anda "bitti" sayılsaydı,
     * daha sürerken rapor beklenir görünürdü.
     *
     * İptal edilen etkinliğin raporu yazılmaz (bkz. rapor-kurallar.ts), o
     * yüzden listede de yer almaz — yoksa kapanmayan bir görev gibi dururdu.
     */
    kosullar.push({
      durum: "AKTIF",
      rapor: { is: null },
      OR: [
        { bitisTarihi: { lt: simdi } },
        { bitisTarihi: null, tarih: { lt: simdi } },
      ],
    });
  }

  return { AND: kosullar };
}
