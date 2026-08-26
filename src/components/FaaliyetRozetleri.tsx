import type {
  BasvuruDurumu,
  EtkinlikKategorisi,
  FaaliyetDurumu,
  Kapsam,
  OnayDurumu,
} from "@/generated/prisma/enums";
import {
  BASVURU_DURUMU_ETIKETLERI,
  ETKINLIK_KATEGORISI_ETIKETLERI,
  FAALIYET_DURUMU_ETIKETLERI,
  KAPSAM_ETIKETLERI,
  ONAY_DURUMU_ETIKETLERI,
  type PencereDurumu,
} from "@/lib/faaliyet/kurallar";

/**
 * Faaliyet ekranlarının rozetleri. Etiket metinleri kurallar.ts'ten gelir;
 * burada yalnızca renk eşlemesi var ve renkler anlam adıyla yazılır, böylece
 * iki tema da tek kaynaktan beslenir (bkz. globals.css).
 */

/*
 * Faaliyet rozetlerinin ortak biçimi.
 *
 * 18 Ağustos 2026'da ortak `Rozet` bileşeniyle AYNI ölçülere getirildi
 * (px-2.5 py-1, font-semibold): iki rozet ailesi aynı satırda yan yana
 * basılıyor (bkz. etkinlikler/[id] · başlık rozet şeridi) ve yarım piksellik
 * yükseklik farkı satırı tırtıklı gösteriyordu.
 *
 * BİLEŞENLER BİRLEŞTİRİLMEDİ: buradaki rozetler renklerini alan değerinden
 * kendileri seçiyor (kapsam, onay durumu, başvuru penceresi) ve o karar
 * rozetin içinde kalmalı — çağıranın renk seçmesi, aynı durumun iki ekranda
 * iki renge düşmesi demekti.
 */
const SINIF_ROZET =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold";

const KAPSAM_SINIFLARI: Record<Kapsam, string> = {
  OKUL: "bg-rol-danisman-zemin text-rol-danisman-metin",
  IL: "bg-rol-koordinator-zemin text-rol-koordinator-metin",
  ULUSAL: "bg-rol-yonetici-zemin text-rol-yonetici-metin",
  /*
   * ULUSLARARASI, ULUSAL İLE AYNI RENKTE (26 Ağustos 2026): renk bu
   * rozette "ne kadar geniş kapsam" diyor ve ikisi de en geniş basamak.
   * Ayrımı rozetin YAZISI taşıyor; beşinci bir renk, dört rolün rengiyle
   * kurulmuş sözlüğe karşılığı olmayan bir ton eklerdi.
   */
  ULUSLARARASI: "bg-rol-yonetici-zemin text-rol-yonetici-metin",
};

const ONAY_SINIFLARI: Record<OnayDurumu, string> = {
  ONAY_GEREKMEZ: "bg-olumlu-zemin text-olumlu-metin",
  ONAYLANDI: "bg-olumlu-zemin text-olumlu-metin",
  BEKLIYOR: "bg-uyari-zemin text-uyari-metin",
  REDDEDILDI: "bg-hata-zemin text-hata-metin",
};

const BASVURU_SINIFLARI: Record<BasvuruDurumu, string> = {
  BEKLIYOR: "bg-uyari-zemin text-uyari-metin",
  SECILDI: "bg-olumlu-zemin text-olumlu-metin",
  YEDEK: "bg-vurgu-zemin text-vurgu-metin",
  REDDEDILDI: "bg-hata-zemin text-hata-metin",
  GERI_CEKILDI: "bg-zemin text-metin-yumusak",
  IPTAL_EDILDI: "bg-hata-zemin text-hata-metin",
};

/*
 * Kategori rozeti kapsam rozetinin YERİNE GEÇMEZ, yanında durur: ikisi farklı
 * soruların cevabıdır (kim başvurabilir / etkinlik nedir). Bu yüzden kapsamla
 * aynı renk ailesi kullanılmaz.
 */
const KATEGORI_SINIFLARI: Record<EtkinlikKategorisi, string> = {
  TEMEL_ETKINLIK: "border border-cizgi bg-kart text-metin",
  CALISMA_GRUBU_ETKINLIGI: "border border-cizgi bg-kart text-metin",
  IL_ETKINLIGI: "border border-cizgi bg-kart text-metin",
};

const PENCERE_ETIKETLERI: Record<PencereDurumu, string> = {
  ACILMADI: "Başvuru açılmadı",
  ACIK: "Başvuru açık",
  KAPANDI: "Başvuru kapandı",
};

const PENCERE_SINIFLARI: Record<PencereDurumu, string> = {
  ACILMADI: "bg-zemin text-metin-yumusak",
  ACIK: "bg-olumlu-zemin text-olumlu-metin",
  KAPANDI: "bg-zemin text-metin-yumusak",
};

export function KapsamRozeti({ kapsam }: { kapsam: Kapsam }) {
  return (
    <span className={`${SINIF_ROZET} ${KAPSAM_SINIFLARI[kapsam]}`}>
      {KAPSAM_ETIKETLERI[kapsam]}
    </span>
  );
}

/**
 * İPTAL HER ŞEYİN ÜSTÜNDEDİR (11 Ağustos 2026).
 *
 * `durum` (AKTIF / IPTAL_EDILDI), `onayDurumu` ve başvuru penceresi birbirinden
 * BAĞIMSIZ alanlar ve rozetler de bağımsız basılıyordu. Onaylanıp sonra iptal
 * edilen bir etkinlikte ikisi yan yana çıkıyordu:
 *
 *     [İptal edildi] [Onaylandı] [Başvuru kapandı]
 *
 * Veri tutarlıydı — etkinlik gerçekten önce onaylandı, sonra iptal edildi — ama
 * okuyan için çelişki: "hem onaylı hem iptal" diye bir şey yok. Pencere
 * rozetinde aynı kusur daha kötü sonuç veriyordu: `basvuruPenceresi` yalnızca
 * TARİHLERE baktığı için, penceresi açıkken iptal edilen bir etkinlikte
 * [İptal edildi] [Başvuru açık] yazıyor ve öğrenciyi başvurmaya davet ediyordu
 * (sunucu zaten reddediyor, bkz. basvuruYapilabilirMi — ama ekran yalan
 * söylüyordu).
 *
 * Karar rozetin İÇİNDE veriliyor, çağıranda değil: iki ekran (liste kartı ve
 * detay) aynı üçlüyü basıyor ve kural dışarıda kalsaydı birinde unutulurdu.
 * `faaliyetDurumu` bilinçli olarak ZORUNLU — isteğe bağlı olsaydı yeni bir
 * çağrı yeri onu geçmeyi unutur ve hata sessizce geri gelirdi.
 */
function iptalEdildiMi(faaliyetDurumu: FaaliyetDurumu): boolean {
  return faaliyetDurumu !== "AKTIF";
}

/** Yayındaki faaliyette onay rozeti gürültüdür; yalnızca istisnalar gösterilir. */
export function OnayRozeti({
  onayDurumu,
  faaliyetDurumu,
}: {
  onayDurumu: OnayDurumu;
  faaliyetDurumu: FaaliyetDurumu;
}) {
  if (iptalEdildiMi(faaliyetDurumu)) return null;
  if (onayDurumu === "ONAY_GEREKMEZ") return null;
  return (
    <span className={`${SINIF_ROZET} ${ONAY_SINIFLARI[onayDurumu]}`}>
      {ONAY_DURUMU_ETIKETLERI[onayDurumu]}
    </span>
  );
}

export function BasvuruRozeti({ durum }: { durum: BasvuruDurumu }) {
  return (
    <span className={`${SINIF_ROZET} ${BASVURU_SINIFLARI[durum]}`}>
      {BASVURU_DURUMU_ETIKETLERI[durum]}
    </span>
  );
}

export function KategoriRozeti({
  kategori,
}: {
  kategori: EtkinlikKategorisi;
}) {
  return (
    <span className={`${SINIF_ROZET} ${KATEGORI_SINIFLARI[kategori]}`}>
      {ETKINLIK_KATEGORISI_ETIKETLERI[kategori]}
    </span>
  );
}

/** İptal edilen faaliyet listelerde kalır; rozet onu görünür kılar. */
export function FaaliyetDurumuRozeti({ durum }: { durum: FaaliyetDurumu }) {
  if (durum === "AKTIF") return null;
  return (
    <span className={`${SINIF_ROZET} bg-hata-zemin text-hata-metin`}>
      {FAALIYET_DURUMU_ETIKETLERI[durum]}
    </span>
  );
}

export function PencereRozeti({
  pencere,
  faaliyetDurumu,
}: {
  pencere: PencereDurumu;
  faaliyetDurumu: FaaliyetDurumu;
}) {
  // İptal edilen etkinlikte pencere bilgisi anlamını yitirir: başvuru
  // tarihlerine göre "açık" görünse bile kimse başvuramaz.
  if (iptalEdildiMi(faaliyetDurumu)) return null;
  return (
    <span className={`${SINIF_ROZET} ${PENCERE_SINIFLARI[pencere]}`}>
      {PENCERE_ETIKETLERI[pencere]}
    </span>
  );
}
