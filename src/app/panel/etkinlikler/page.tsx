import {
  ArrowRightLeft,
  Award,
  CalendarDays,
  Check,
  FileText,
  Filter,
  Hourglass,
  Landmark,
  LayoutGrid,
  LayoutList,
  List,
  MapPin,
  Plus,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { DisaAktarmaBagi } from "@/components/DisaAktarmaBagi";
import type {
  BasvuruDurumu,
  EtkinlikKategorisi,
  FaaliyetDurumu,
  Kapsam,
  OnayDurumu,
} from "@/generated/prisma/enums";
import {
  BasvuruRozeti,
  FaaliyetDurumuRozeti,
  KapsamRozeti,
  KategoriRozeti,
  OnayRozeti,
  PencereRozeti,
} from "@/components/FaaliyetRozetleri";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  KartIzgarasi,
  PosterKart,
  Rozet,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import {
  ilDisiBasvurulariGetir,
  type IlDisiBasvuruSatiri,
} from "@/lib/basvuru/il-disi-veri";
import { prisma } from "@/lib/db";
import { uygulamaYolu } from "@/lib/ortam";
import {
  basvuruPenceresi,
  ETKINLIK_KATEGORILERI,
  ETKINLIK_KATEGORISI_ETIKETLERI,
  faaliyetAcmaYetkisiVarMi,
  KAPSAM_ETIKETLERI,
  KAPSAMLAR,
  type KontenjanDurumu,
  kontenjanDurumu,
  type PencereDurumu,
} from "@/lib/faaliyet/kurallar";
import { tarihYaz } from "@/lib/tarih";
import {
  basvuruYapabilirMi,
  danismanMi,
  faaliyetDisaAktarabilirMi,
  ilKoordinatoruMu,
  ogrenciMi,
  projeYoneticisiMi,
} from "@/lib/yetki/izinler";
import { erisimLoglaCoklu } from "@/lib/yetki/log";
import {
  type SorguParametreleri,
  sorguMetni,
  tekil,
} from "../ogrenciler/filtreler";
import {
  faaliyetFiltreleriniCoz,
  faaliyetFiltresiVarMi,
  faaliyetListeFiltresi,
  type FaaliyetFiltreleri,
} from "./filtreler";
import { kaynakIlKarariEylemi } from "./il-disi-eylemler";

export const dynamic = "force-dynamic";

/**
 * Faaliyet listesi.
 *
 * Kim hangi faaliyeti görür sorusunun cevabı merkezi kapsam filtresindedir
 * (faaliyetKapsamFiltresi); burada filtre elle yazılmaz. Ekrandaki filtreler
 * yalnızca DARALTIR — adres çubuğuna yazılan bir kapsam değeri onay bekleyen
 * ya da kapsam dışı bir faaliyeti görünür yapmaz.
 */

/**
 * Kırmızı düğme — bu sayfanın başlık düğmeleri için (10 Ağustos 2026).
 *
 * ui.tsx'e genel bir varyant olarak EKLENMEDİ: kırmızı bu projede "hata" ve
 * "geri alınamaz işlem" rengi; paylaşılan bir düğme sınıfı hâline gelseydi
 * silme düğmeleriyle aynı dili konuşan bir gezinme düğmesi ortaya çıkardı.
 * Burada istenen şey vurgu, uyarı değil — o yüzden yerel kalıyor.
 */
const SAYFA_BOYUTU = 50;

const SINIF_KIRMIZI_BUTON =
  "inline-flex items-center gap-2 rounded-md border border-hata-cizgi bg-hata-zemin px-4 py-2 text-sm font-semibold text-hata-metin transition hover:border-hata-metin";

const SINIF_ETIKET = "text-sm font-medium text-metin-yumusak";
const SINIF_SECIM =
  "mt-1 w-full rounded-md border border-cizgi bg-kart px-3 py-2 text-sm text-metin outline-none focus:border-vurgu";

/**
 * İki görünümün paylaştığı kart verisi.
 *
 * Kontenjan, pencere ve "raporu bekliyor" hesapları listeyle ızgarada AYNI
 * olmalı; sorgudan çıkan satır iki yerde ayrı ayrı yorumlansaydı, aynı
 * etkinlik iki görünümde farklı rozet gösterebilirdi. Bu yüzden hesap bir kez
 * yapılır ve iki görünüm de bu yapıyı alır.
 */
interface EtkinlikKarti {
  id: number;
  ad: string;
  aciklama: string;
  tarih: Date;
  duzenleyenBirim: string;
  /** Başvurunun son günü — kartın "37 gün kaldı" balonu bunu sayar. */
  basvuruBitis: Date;
  kapsam: Kapsam;
  etkinlikKategorisi: EtkinlikKategorisi;
  durum: FaaliyetDurumu;
  onayDurumu: OnayDurumu;
  calismaGruplari: { id: number; ad: string }[];
  /** Silinmemiş kapak; yoksa null (ızgarada başlık afişin yerine geçer). */
  kapak: { id: number; dosyaAdi: string } | null;
  kontenjan: KontenjanDurumu;
  pencere: PencereDurumu;
  benimBasvurum: BasvuruDurumu | null;
  raporBekliyor: boolean;
  benimActigim: boolean;
  /** Seçilmiş katılımcı sayısı (Aşama 6c). */
  katilimciSayisi: number;
  /** Etkinlik bitti mi — rapor etiketi yalnızca bitmişlerde anlamlı. */
  bittiMi: boolean;
  /** Bitmiş etkinliğin raporu yazılmış mı (Aşama 6d). */
  raporYazildi: boolean;
}

/**
 * İL DIŞINA GİDEN BAŞVURULAR (11 Ağustos 2026 · istek: "koordinatörün
 * etkinlikler sayfası ile il dışı başvuru sayfalarını birleştirelim, il dışı
 * başvurular kalksın, hepsi etkinliklerde olsun").
 *
 * `/panel/il-disi-basvurular` silindi ve içeriği buraya taşındı. Karar zaten
 * bir ETKİNLİK kararıydı — "öğrencim bu etkinliğe gitsin mi" — ve ayrı bir
 * sekmede durması koordinatörü iki ekran arasında gezdiriyordu: etkinliği
 * burada, ona yapılan başvuruyu orada görüyordu.
 *
 * KURAL DEĞİŞMEDİ, yalnızca yeri: öğrencinin kendi ilinin koordinatörü karar
 * vermeden etkinliğin ili başvuruyu değerlendiremez (bkz. degerlendirmeyeHazirMi)
 * ve ret gerekçesi zorunludur. İkisi de aynı sunucu eyleminde duruyor
 * (kaynakIlKarariEylemi), bu bölüm yalnızca formu basıyor.
 *
 * KAPSAM SORULMUYOR çünkü sorgunun kendisi soruyor: `ilDisiBasvurulariGetir`
 * merkezi filtreden geçiyor ve karar veremeyecek roller boş liste alıyor —
 * bölüm de o zaman hiç basılmıyor.
 */
function IlDisiBasvurular({
  basvurular,
}: {
  basvurular: IlDisiBasvuruSatiri[];
}) {
  const bekleyenler = basvurular.filter(
    (basvuru) => basvuru.kaynakIlOnayDurumu === "BEKLIYOR",
  );
  const kararlilar = basvurular.filter(
    (basvuru) => basvuru.kaynakIlOnayDurumu !== "BEKLIYOR",
  );

  return (
    <Kart id="il-disi" className="scroll-mt-6">
      <KartBasligi
        baslik="İl dışına giden başvurular"
        aciklama={`Öğrencinizin başka bir ilin etkinliğine başvurusu · ${bekleyenler.length} karar bekliyor`}
        Ikon={ArrowRightLeft}
      />

      {/*
        Onayın başvuruyu SONUÇLANDIRMADIĞI burada da yazılı. Karar veren kişi
        "onayladım, öğrenci gidiyor" sanırsa, etkinliğin ilindeki değerlendirme
        beklenirken öğrenciye yanlış bilgi verir.
      */}
      <BilgiKutusu cesit="uyari">
        Onayınız başvuruyu sonuçlandırmaz. Onaydan sonra etkinliği düzenleyen il
        kendi değerlendirmesini yapar; öğrenci ancak orada seçilirse katılır.
      </BilgiKutusu>

      {bekleyenler.length === 0 ? (
        <p className="mt-4 text-metin-yumusak">
          Kararınızı bekleyen başvuru yok.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {bekleyenler.map((basvuru) => (
            <li
              key={basvuru.id}
              className="rounded-kart border border-cizgi p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-baslik">
                  {basvuru.ogrenciAdSoyad}
                  {basvuru.ogrenciSinifi && (
                    <span className="ml-2 text-sm font-normal text-metin-yumusak">
                      {basvuru.ogrenciSinifi}
                    </span>
                  )}
                </p>
                <span className="text-sm text-metin-yumusak">
                  {tarihYaz(basvuru.basvuruTarihi)}
                </span>
              </div>

              <p className="mt-1 text-sm text-metin-yumusak">
                {basvuru.okulAdi ?? "—"}
              </p>

              <p className="mt-3 text-metin">
                <Link
                  href={`/panel/etkinlikler/${basvuru.faaliyetId}`}
                  className="font-medium text-vurgu-metin underline underline-offset-2"
                >
                  {basvuru.faaliyetAdi}
                </Link>
                <span className="text-metin-yumusak">
                  {" · "}
                  {basvuru.faaliyetYeri}
                  {" · "}
                  {tarihYaz(basvuru.faaliyetTarihi)}
                </span>
              </p>

              <p className="mt-2 rounded-md bg-zemin px-3 py-2 text-sm text-metin">
                <span className="font-medium">Öğrencinin gerekçesi: </span>
                {basvuru.gerekce}
              </p>

              <form
                action={kaynakIlKarariEylemi}
                className="mt-3 flex flex-wrap items-end gap-3"
              >
                <input type="hidden" name="basvuruId" value={basvuru.id} />
                <label className="block grow">
                  <span className="text-sm font-medium text-metin">
                    Gerekçe{" "}
                    <span className="text-metin-yumusak">(redde zorunlu)</span>
                  </span>
                  <input
                    type="text"
                    name="gerekce"
                    maxLength={500}
                    className={SINIF_GIRDI}
                  />
                </label>
                <button
                  type="submit"
                  name="karar"
                  value="onayla"
                  className="inline-flex items-center gap-1.5 rounded-md bg-olumlu-zemin px-3 py-2 text-sm font-medium text-olumlu-metin transition hover:opacity-90"
                >
                  <Check size={15} aria-hidden />
                  Onayla
                </button>
                <button
                  type="submit"
                  name="karar"
                  value="reddet"
                  className="inline-flex items-center gap-1.5 rounded-md bg-hata-zemin px-3 py-2 text-sm font-medium text-hata-metin transition hover:opacity-90"
                >
                  <X size={15} aria-hidden />
                  Reddet
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {/*
        GEÇMİŞ KARARLAR katlanabilir: "kimi onayladım" sorusunun cevabı gerekli
        ama bölümün işi bekleyenlerdir. Açık bırakılsaydı, etkinlik listesinin
        üstünde her açılışta uzun bir tablo dururdu.
      */}
      {kararlilar.length > 0 && (
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-medium text-vurgu-metin">
            Karara bağladıklarım ({kararlilar.length})
          </summary>
          <ul className="mt-2 divide-y divide-cizgi text-sm">
            {kararlilar.map((basvuru) => (
              <li key={basvuru.id} className="py-2">
                <span className="text-metin">{basvuru.ogrenciAdSoyad}</span>
                <span className="text-metin-yumusak">
                  {" · "}
                  {basvuru.faaliyetAdi}
                  {" · "}
                  {basvuru.kaynakIlOnayDurumu === "ONAYLANDI"
                    ? "Onayladınız"
                    : "Reddettiniz"}
                  {basvuru.kaynakIlOnayTarihi
                    ? ` · ${tarihYaz(basvuru.kaynakIlOnayTarihi)}`
                    : ""}
                </span>
                {basvuru.kaynakIlRetGerekcesi && (
                  <span className="block text-xs text-metin-yumusak">
                    {basvuru.kaynakIlRetGerekcesi}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </Kart>
  );
}

function RaporYazildiRozeti() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-olumlu-zemin px-2.5 py-0.5 text-xs font-medium text-olumlu-metin">
      <FileText size={12} aria-hidden />
      Rapor yazıldı
    </span>
  );
}

function RaporRozeti() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-uyari-zemin px-2.5 py-0.5 text-xs font-medium text-uyari-metin">
      <FileText size={12} aria-hidden />
      Raporu bekliyor
    </span>
  );
}

/** Rozet şeridi; iki görünümde de aynı sırayla basılır. */
function Rozetler({ kart }: { kart: EtkinlikKarti }) {
  return (
    <>
      <KategoriRozeti kategori={kart.etkinlikKategorisi} />
      <KapsamRozeti kapsam={kart.kapsam} />
      <FaaliyetDurumuRozeti durum={kart.durum} />
      <OnayRozeti onayDurumu={kart.onayDurumu} faaliyetDurumu={kart.durum} />
      <PencereRozeti pencere={kart.pencere} faaliyetDurumu={kart.durum} />
      {kart.benimBasvurum && <BasvuruRozeti durum={kart.benimBasvurum} />}
      {/*
        RAPOR ROZETİ (J3): "raporu bekleyenler" filtresi açıkken hangi kaydın
        neden listelendiği görünmeli; filtresiz listede de bitmiş ama raporsuz
        etkinlik gözden kaçmasın. Yalnızca rapor yazabilenlere basılır
        (koşul kartı hazırlarken uygulandı).
      */}
      {kart.raporBekliyor && <RaporRozeti />}
      {kart.raporYazildi && <RaporYazildiRozeti />}
    </>
  );
}

/**
 * KART GÖRÜNÜMÜ — varsayılan (18 Ağustos 2026 · istek: "etkinliklerin
 * görünümü kötü, sablon/1.png'deki gibi yapalım").
 *
 * ÖNCEKİ IZGARANIN SORUNU BİLGİNİN SAKLI OLMASIYDI. Kare afiş kutusunda
 * başlık dışında her şey — durum, düzenleyen birim, son başvuru, rozetler —
 * yalnızca fareyle üstüne gelince açılan bir katmanda vardı. Dokunmatik
 * cihazda o katman hiç açılmıyor; afişi olmayan etkinlikte kutu da boşa
 * düşüyordu. Yeni kartta aynı bilgiler HER ZAMAN basılı ve sıra sabit:
 *
 *     poster (durum rozeti + kalan gün) → düzenleyen birim → başlık →
 *     rozetler → son başvuru → İncele / Başvur
 *
 * IZGARA SİLİNMEDİ (istek: "ızgara düzeni de güzel o da kalsın"): afişleri
 * yan yana taramak için hâlâ en iyi görünüm o ve `?gorunum=izgara` ile
 * duruyor. Üç görünüm üç ayrı işi yapıyor — kart TANITIR, ızgara TARATIR,
 * liste DENETLETİR.
 */
function KartGorunumu({ kartlar }: { kartlar: EtkinlikKarti[] }) {
  /*
   * Kendi açtıkları ayrı bölümde (11 Ağustos 2026 kararı, ızgaradan devralındı):
   * sıralamayla ayırmak yetmiyor, kartlar birbirine benzediği için "nerede
   * bitti" görünmüyor. Tek bölüm varsa başlık basılmaz — olmayan bir ayrımı
   * anlatmak olurdu.
   */
  const benim = kartlar.filter((kart) => kart.benimActigim);
  const digerleri = kartlar.filter((kart) => !kart.benimActigim);

  if (benim.length === 0 || digerleri.length === 0) {
    return <KartListesi kartlar={kartlar} />;
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-sm font-semibold text-baslik">
          Açtığım etkinlikler
        </h3>
        <KartListesi kartlar={benim} />
      </section>
      <section>
        <h3 className="mb-3 text-sm font-semibold text-baslik">
          Diğer etkinlikler
        </h3>
        <KartListesi kartlar={digerleri} />
      </section>
    </div>
  );
}

/**
 * Posterin rengi DURUMU anlatır, süsleme değildir:
 *
 *   yeşil  başvuru açık        amber  henüz açılmadı
 *   gri    başvuru kapandı     kırmızı  iptal edildi
 *
 * KIRMIZI YALNIZCA İPTALE AYRILDI. İlk denemede "kapandı" kırmızıydı ve
 * listedeki etkinliklerin çoğu kapalı olduğu için ekran baştan aşağı kocaman
 * kırmızı bloklarla doluyordu; kurumsal renk uyarı anlamını yitiriyordu.
 * Kapanmak olağan bir son, iptal ise bir kesinti — alarm rengini hak eden o.
 *
 * Renk TEK BAŞINA bilgi taşımıyor: aynı durum sol üstteki rozette yazıyla da
 * yazılı (renk körlüğü ve ekran okuyucu).
 *
 * AFİŞİ OLAN KARTTA TON NÖTR: afişin kendisi çoğunlukla kurumsal kırmızı ve
 * renkli bir bandın üstünde `object-contain` ile durunca ikisi birbirine
 * karışıyor, afişin kenarı görünmez oluyor. Nötr gri bir paspas afişi bir
 * nesne olarak ayırıyor; durumu zaten rozet söylüyor.
 */
function posterTonu(kart: EtkinlikKarti): "vurgu" | "olumlu" | "uyari" | "notr" {
  if (kart.durum !== "AKTIF") return "vurgu";
  if (kart.kapak) return "notr";
  if (kart.pencere === "ACIK") return "olumlu";
  if (kart.pencere === "ACILMADI") return "uyari";
  return "notr";
}

/**
 * "37 gün kaldı" balonu YALNIZCA başvurusu açık etkinlikte basılır.
 *
 * Kapanmış bir etkinlikte geri sayım göstermek yanıltıcı olurdu; açılmamışta
 * ise sayılan şey başvurunun BAŞLAMASINA kalan süredir, bitişine değil — iki
 * farklı sayıyı aynı balonda göstermek kişiye hangisini okuduğunu sordurur.
 *
 * Gün farkı takvim günü olarak hesaplanıyor: saat farkına bakılsaydı, son gün
 * 23:00'te bakan kişi "0 gün kaldı" görürdü — oysa başvurusu hâlâ açık.
 */
function kalanGunSayisi(bitis: Date, simdi: Date): number {
  const gun = 24 * 60 * 60 * 1000;
  const bitisGunu = Date.UTC(
    bitis.getFullYear(),
    bitis.getMonth(),
    bitis.getDate(),
  );
  const bugun = Date.UTC(
    simdi.getFullYear(),
    simdi.getMonth(),
    simdi.getDate(),
  );
  return Math.round((bitisGunu - bugun) / gun);
}

/** Kartların kendisi; bölümlere ayrılmış hâlde iki kez basılır. */
function KartListesi({ kartlar }: { kartlar: EtkinlikKarti[] }) {
  const simdi = new Date();

  return (
    <KartIzgarasi>
      {kartlar.map((kart) => {
        const kalan =
          kart.durum === "AKTIF" && kart.pencere === "ACIK"
            ? kalanGunSayisi(kart.basvuruBitis, simdi)
            : null;

        return (
          <li key={kart.id}>
            <PosterKart
              baslik={kart.ad}
              yol={`/panel/etkinlikler/${kart.id}`}
              ton={posterTonu(kart)}
              Ikon={CalendarDays}
              kapakYolu={
                kart.kapak
                  ? uygulamaYolu(
                      `/panel/etkinlikler/${kart.id}/ekler/${kart.kapak.id}`,
                    )
                  : undefined
              }
              vurguluCerceve={kart.benimActigim}
              durum={
                <>
                  <FaaliyetDurumuRozeti durum={kart.durum} />
                  <PencereRozeti
                    pencere={kart.pencere}
                    faaliyetDurumu={kart.durum}
                  />
                </>
              }
              kalanGun={
                kalan !== null ? (
                  <>
                    <Hourglass size={11} aria-hidden />
                    {kalan <= 0 ? "Son gün" : `${kalan} gün kaldı`}
                  </>
                ) : undefined
              }
              ustSerit={
                <span className="flex items-center gap-1.5">
                  <Landmark size={13} aria-hidden className="shrink-0" />
                  <span className="truncate">{kart.duzenleyenBirim}</span>
                </span>
              }
              rozetler={
                <>
                  <KapsamRozeti kapsam={kart.kapsam} />
                  <KategoriRozeti kategori={kart.etkinlikKategorisi} />
                  <OnayRozeti
                    onayDurumu={kart.onayDurumu}
                    faaliyetDurumu={kart.durum}
                  />
                  {kart.benimBasvurum && (
                    <BasvuruRozeti durum={kart.benimBasvurum} />
                  )}
                  {kart.raporBekliyor && <RaporRozeti />}
                  {kart.raporYazildi && <RaporYazildiRozeti />}
                </>
              }
              altBilgi={
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays size={13} aria-hidden />
                    Son başvuru: {tarihYaz(kart.basvuruBitis)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users size={13} aria-hidden />
                    {kart.kontenjan.aktifBasvuru}/{kart.kontenjan.kontenjan}
                  </span>
                  {kart.bittiMi && (
                    <span className="inline-flex items-center gap-1">
                      <UserCheck size={13} aria-hidden />
                      {kart.katilimciSayisi} katılımcı
                    </span>
                  )}
                </span>
              }
              eylem={
                <>
                  <Link
                    href={`/panel/etkinlikler/${kart.id}`}
                    className="inline-flex items-center gap-1.5 rounded-kutu border border-cizgi-guclu bg-kart px-3.5 py-2 text-sm font-medium text-metin transition hover:border-vurgu hover:bg-zemin focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vurgu"
                  >
                    İncele
                  </Link>
                  {/*
                    BAŞVUR DÜĞMESİ BURADA FORM AÇMAZ, detaya götürür: başvuru
                    şartname ve ek belgelerin okunmasını gerektiriyor ve kart
                    üstünden tek tıkla başvurtmak, kişiyi görmediği bir metne
                    taahhüt ettirmek olurdu. Prototipteki akış da aynı
                    (A2 detay → A3 sihirbaz).

                    Yalnızca başvurusu AÇIK ve kişinin HENÜZ BAŞVURMADIĞI
                    etkinlikte basılır — başvurmuş kişiye "Başvur" demek,
                    ikinci bir başvuru yapabileceğini ima ederdi.
                  */}
                  {kart.durum === "AKTIF" &&
                    kart.pencere === "ACIK" &&
                    !kart.benimBasvurum && (
                      <Link
                        href={`/panel/etkinlikler/${kart.id}`}
                        className={SINIF_BIRINCIL_BUTON}
                      >
                        Başvur
                      </Link>
                    )}
                </>
              }
            />
          </li>
        );
      })}
    </KartIzgarasi>
  );
}

/**
 * IZGARA GÖRÜNÜMÜ — afiş taraması, `?gorunum=izgara` ile açılır
 * (10 Ağustos 2026 · istek: "etkinlikler Instagram profilindeki gibi yan yana
 * alt alta görünsün, üstüne gelince yazısı açıklaması çıksın").
 *
 * 18 Ağustos'ta VARSAYILAN OLMAKTAN ÇIKTI, silinmedi (istek: "ızgara düzeni de
 * güzel o da kalsın"): afişleri sıkışık biçimde taramak için hâlâ en iyi
 * görünüm bu, ama bir etkinliği TANITMAK için kart görünümü daha iyi — orada
 * bilgi üstüne gelmeyi beklemiyor.
 *
 * AFİŞ KIRPILMIYOR: kare kutunun içinde object-contain duruyor, object-cover
 * değil. Aynı gün alınmış "resim banner gibi görünmesin, afişin tamamı
 * gözüksün" kararı ızgarada da geçerli — Instagram kareyi kırpar, buradaki
 * görseller ise üstünde tarih ve başlık yazan afişler; kırpılan köşe bilgi
 * kaybıdır. Artan yer zemin rengiyle dolar.
 *
 * ÜSTÜNE GELİNCE açıklama katmanı açılır. Katman fare olmayan cihazda hiç
 * açılmaz; o yüzden kapaklı kartın altında başlık ŞERİDİ her zaman durur ve
 * dokunmatikte açıklamaya erişmenin iki yolu kalır: karta dokunup detaya
 * gitmek ya da liste görünümüne geçmek.
 */
function IzgaraGorunumu({ kartlar }: { kartlar: EtkinlikKarti[] }) {
  /*
   * KENDİ AÇTIKLARI EN ÜSTTE (11 Ağustos 2026 · istek: "ızgara diziliminde
   * kendi açtığı varsa onlar üstte olsun, altında da başkasının açtığı
   * etkinlikler görünsün, yani kendi açtıkları belirgin olsun").
   *
   * Ayrım SIRALAMAYLA DEĞİL BÖLÜMLE yapılıyor: kendi kayıtlarını listenin
   * başına almak yetmezdi, ızgarada kartlar birbirinin aynı göründüğü için
   * "nerede bitti" belli olmazdı. İki başlık, sınırı da söylüyor.
   *
   * Tek bölüm varsa başlık BASILMAZ: yalnızca kendi etkinliklerini gören bir
   * koordinatöre "Açtığım etkinlikler" demek, olmayan bir ayrımı anlatmak
   * olurdu.
   *
   * Bölümlerin İÇİNDEKİ sıra sorgudan gelir (tarihe göre) ve bozulmaz.
   */
  const benim = kartlar.filter((kart) => kart.benimActigim);
  const digerleri = kartlar.filter((kart) => !kart.benimActigim);

  if (benim.length === 0 || digerleri.length === 0) {
    return <IzgaraListesi kartlar={kartlar} />;
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-baslik">
          Açtığım etkinlikler
        </h3>
        <IzgaraListesi kartlar={benim} />
      </section>
      <section>
        <h3 className="mb-2 text-sm font-semibold text-baslik">
          Diğer etkinlikler
        </h3>
        <IzgaraListesi kartlar={digerleri} />
      </section>
    </div>
  );
}

/** Izgaranın kendisi; bölümlere ayrılmış hâlde iki kez basılır. */
function IzgaraListesi({ kartlar }: { kartlar: EtkinlikKarti[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {kartlar.map((kart) => (
        <li key={kart.id}>
          <Link
            href={`/panel/etkinlikler/${kart.id}`}
            className={`group relative block aspect-square overflow-hidden rounded-kart border bg-zemin transition hover:border-vurgu focus-visible:border-vurgu ${
              /*
               * Kendi açtığı kart çerçevesinden de belli olur: bölüm başlığı
               * kaydırılınca ekrandan çıkıyor, kart ise nerede olursa olsun
               * kimin olduğunu söylüyor.
               */
              kart.benimActigim ? "border-vurgu" : "border-cizgi"
            }`}
          >
            {/*
              Rozet HER ZAMAN görünür, üstüne gelince açılan katmanda değil:
              dokunmatik cihazda katman hiç açılmıyor (bkz. IzgaraGorunumu
              notu) ve "sizin açtığınız" bilgisi orada kalsaydı telefondan
              bakan kullanıcı hiç göremezdi.
            */}
            {kart.benimActigim && (
              <span className="absolute left-2 top-2 rounded-full bg-vurgu-zemin px-2 py-0.5 text-[10px] font-semibold text-vurgu-metin">
                Sizin
              </span>
            )}
            {kart.kapak ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uygulamaYolu(
                    `/panel/etkinlikler/${kart.id}/ekler/${kart.kapak.id}`,
                  )}
                  alt=""
                  className="h-full w-full object-contain p-2"
                />
                {/*
                  Başlık şeridi aria-hidden: aynı başlık açıklama katmanında da
                  var, ekran okuyucu bağlantıyı iki kez okumasın.
                */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-kart via-kart/85 to-transparent px-3 pb-3 pt-8 transition-opacity group-hover:opacity-0"
                >
                  <p className="line-clamp-2 text-sm font-semibold text-baslik">
                    {kart.ad}
                  </p>
                </div>
              </>
            ) : (
              /* Kapaksız etkinlikte kutu boş kalmaz: başlığın kendisi afiştir. */
              <div
                aria-hidden
                className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center"
              >
                <CalendarDays size={26} className="text-vurgu-metin" aria-hidden />
                <p className="line-clamp-3 text-sm font-semibold text-baslik">
                  {kart.ad}
                </p>
                <p className="text-xs text-metin-yumusak">
                  {tarihYaz(kart.tarih)}
                </p>
              </div>
            )}

            {/*
              Katman SAYDAM DEĞİL: afişlerin çoğu koyu kırmızı zeminli ve
              yarı saydam bir örtünün altında metin okunmuyordu. Rozetler de
              tema renkleriyle basılıyor — arkasında görsel kalırsa kontrast
              garantisi biter.
            */}
            <div className="absolute inset-0 flex flex-col gap-1.5 overflow-hidden bg-kart p-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
              <div className="flex flex-wrap gap-1">
                <Rozetler kart={kart} />
              </div>
              <h3 className="line-clamp-2 text-sm font-semibold text-baslik">
                {kart.ad}
              </h3>
              <p className="line-clamp-4 text-xs text-metin-yumusak">
                {kart.aciklama}
              </p>
              <div className="mt-auto flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-metin-yumusak">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays size={13} aria-hidden />
                  {tarihYaz(kart.tarih)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users size={13} aria-hidden />
                  {kart.kontenjan.aktifBasvuru}/{kart.kontenjan.kontenjan}
                </span>
                {kart.bittiMi && (
                  <span className="inline-flex items-center gap-1">
                    <UserCheck size={13} aria-hidden />
                    {kart.katilimciSayisi}
                  </span>
                )}
                {kart.benimActigim && <span>· sizin açtığınız</span>}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * LİSTE GÖRÜNÜMÜ — ızgaradan önceki hâl, `?gorunum=liste` ile açılır.
 *
 * Silinmedi çünkü ızgara TARAMA için iyi, DENETİM için değil: "hangi
 * etkinliğin raporu eksik", "hangisi onay bekliyor" sorusunun cevabı ızgarada
 * kart kart üstüne gelmeyi gerektirir. Koordinatör ve merkez o soruyu bir
 * ekranda görmek zorunda; dokunmatik cihazda açıklamayı okumanın yolu da bu.
 */
function ListeGorunumu({ kartlar }: { kartlar: EtkinlikKarti[] }) {
  return (
    <ul className="space-y-3">
      {kartlar.map((kart) => (
        <li key={kart.id}>
          <Link
            href={`/panel/etkinlikler/${kart.id}`}
            className="block overflow-hidden rounded-kart border border-cizgi bg-kart shadow-kart transition hover:border-vurgu hover:shadow-yuksek"
          >
            {/*
              AFİŞ, BANNER DEĞİL (10 Ağustos 2026 · istek: "resim banner
              gibi görünüyor, büyük afiş gözüksün"). Önceki hâl sabit
              yükseklik + object-cover idi: afişin ortasından yatay bir
              şerit kesiyor, afişin asıl bilgisini (başlık, tarih, logo)
              kırpıyordu. object-contain kırpmaz — görsel kendi
              oranında, dik afişlerde yükseklik sınırına, yatay
              görsellerde genişlik sınırına oturur; artan yer zemin
              rengiyle dolar.
            */}
            {kart.kapak && (
              <div className="flex justify-center bg-zemin p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uygulamaYolu(
                    `/panel/etkinlikler/${kart.id}/ekler/${kart.kapak.id}`,
                  )}
                  alt={kart.kapak.dosyaAdi}
                  className="block max-h-[30rem] w-auto max-w-full rounded-md object-contain"
                />
              </div>
            )}
            <div className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Rozetler kart={kart} />
                {kart.benimActigim && (
                  <span className="text-xs text-metin-yumusak">
                    · sizin açtığınız
                  </span>
                )}
              </div>

              <h3 className="mt-2 text-lg font-semibold text-baslik">
                {kart.ad}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm text-metin-yumusak">
                {kart.aciklama}
              </p>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-metin-yumusak">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={15} aria-hidden />
                  {tarihYaz(kart.tarih)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={15} aria-hidden />
                  {kart.duzenleyenBirim}
                </span>
                {/* Kontenjan aktif başvuruyu sınırlar, yalnızca
                    seçilenleri değil; sayaç da ona göre gösterilir. */}
                <span className="inline-flex items-center gap-1.5">
                  <Users size={15} aria-hidden />
                  {kart.kontenjan.aktifBasvuru}/{kart.kontenjan.kontenjan}{" "}
                  kontenjan
                </span>
                {/*
                  KATILIMCI SAYISI YALNIZCA BİTMİŞ ETKİNLİKTE (Aşama 6c).

                  Kontenjan sayacı "kaç kişi başvurdu" diyor; bu ise "kaç kişiye
                  yer verildi". Başlamamış etkinlikte ikincisi henüz kararlaşmadı
                  ve iki sayıyı yan yana göstermek, başvuru penceresi açıkken
                  "0 katılımcı" gibi yanıltıcı bir satır üretirdi.
                */}
                {kart.bittiMi && (
                  <span className="inline-flex items-center gap-1.5">
                    <UserCheck size={15} aria-hidden />
                    {kart.katilimciSayisi} katılımcı
                  </span>
                )}
              </div>

              {kart.calismaGruplari.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {kart.calismaGruplari.map((grup) => (
                    <span
                      key={grup.id}
                      className="rounded-full bg-vurgu-zemin px-2.5 py-0.5 text-xs text-vurgu-metin"
                    >
                      {grup.ad}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function FaaliyetlerSayfasi({
  searchParams,
}: {
  searchParams: Promise<SorguParametreleri>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  const parametreler = await searchParams;

  const filtreler = faaliyetFiltreleriniCoz(parametreler);
  const filtreVar = faaliyetFiltresiVarMi(filtreler);

  const simdi = new Date();
  const nerede = faaliyetListeFiltresi(kullanici, filtreler, simdi);

  /*
   * SAYFALAMA (15 Ağustos 2026 · Aşama 6a — DEFEKT DÜZELTMESİ).
   *
   * Bu ekran kapsamdaki BÜTÜN etkinlikleri tek sorguyla çekip tek sayfaya
   * basıyordu; dosyada ne `skip` ne `take` vardı. Öğrenci envanterinde iş
   * çoktan doğru yapılmış (`SAYFA_BOYUTU = 50`), etkinlikler ekranı o desenden
   * geride kalmıştı. Ulusal ölçekte hem sayfa ağırlığı hem sorgu süresi sorun
   * çıkarır; küçük veride görünmediği için de fark edilmemiş.
   */
  const sayfaNo = Math.max(
    1,
    Number.parseInt(tekil(parametreler.sayfa) ?? "1", 10) || 1,
  );

  const [toplam, faaliyetler, gruplar] = await Promise.all([
    prisma.faaliyet.count({ where: nerede }),
    prisma.faaliyet.findMany({
      where: nerede,
      orderBy: [{ tarih: "asc" }],
      skip: (sayfaNo - 1) * SAYFA_BOYUTU,
      take: SAYFA_BOYUTU,
      select: {
        id: true,
        ad: true,
        aciklama: true,
        tarih: true,
        kapsam: true,
        etkinlikKategorisi: true,
        temelEtkinlikProgrami: { select: { ad: true } },
        kontenjan: true,
        onayDurumu: true,
        durum: true,
        duzenleyenBirim: true,
        duzenleyenKullaniciId: true,
        bitisTarihi: true,
        basvuruBaslangic: true,
        basvuruBitis: true,
        // Silinen ek kapak olarak bırakılmaz; yine de savunmacı davranıp
        // silinmişse gösterme.
        kapakEk: { select: { id: true, dosyaAdi: true, silindiMi: true } },
        kurum: { select: { ad: true } },
        il: { select: { ad: true } },
        calismaGruplari: {
          select: { calismaGrubu: { select: { id: true, ad: true } } },
        },
        basvurular: { select: { durum: true } },
        // Katılımcı sütunu (Aşama 6c): "kaç kişiye yer verildi" sorusunun
        // cevabı seçilen başvurulardır, toplam başvuru değil.
        _count: { select: { basvurular: { where: { durum: "SECILDI" } } } },
        // Rapor durumu listede gösteriliyor (J3): "raporu bekleyenler"
        // filtresi açıkken hangi kaydın neden listelendiği görünmeli.
        rapor: { select: { faaliyetId: true } },
      },
    }),
    prisma.calismaGrubu.findMany({
      where: { aktif: true },
      orderBy: { siraNo: "asc" },
      select: { id: true, ad: true },
    }),
  ]);

  // Kişi kendi başvuru durumunu listede görür; başkasının başvurusu okunmaz.
  // Katılımcı öğretmen de olabildiği için koşul "öğrenci mi" değil
  // "başvurabilir mi" sorusudur.
  const kendiBasvurulari = basvuruYapabilirMi(kullanici)
    ? await prisma.basvuru.findMany({
        where: {
          katilimciId: kullanici.id,
          faaliyetId: { in: faaliyetler.map((faaliyet) => faaliyet.id) },
        },
        orderBy: { basvuruTarihi: "asc" },
        select: { faaliyetId: true, durum: true },
      })
    : [];
  const basvuruDurumum = new Map(
    kendiBasvurulari.map((basvuru) => [basvuru.faaliyetId, basvuru.durum]),
  );

  await erisimLoglaCoklu(
    faaliyetler.map((faaliyet) => ({
      kullaniciId: kullanici.id,
      islem: "GORUNTULEME" as const,
      hedefTip: "FAALIYET" as const,
      hedefId: faaliyet.id,
      detay: "Etkinlik listesi görüntülendi",
    })),
  );

  const acabilir = faaliyetAcmaYetkisiVarMi(kullanici);

  /*
   * Rapor yazabilen roller: danışman öğretmen (kendi açtığı), il koordinatörü
   * (ilindeki her etkinlik) ve merkez. Öğrenci ve dış kullanıcı rapor yazmaz,
   * onlara "raporu bekleyenler" filtresi hiç gösterilmez.
   */
  const raporYazabilir =
    danismanMi(kullanici) ||
    ilKoordinatoruMu(kullanici) ||
    projeYoneticisiMi(kullanici);

  /*
   * ONAY KUYRUĞU FİLTRESİ, onay verebilen rollere gösteriliyor: il koordinatörü
   * ve proje yöneticisi (bkz. faaliyetOnaylayabilirMi). Merkez için bu filtre
   * ekranın asıl işidir — öğrencinin ilinde koordinatör olmadığında bekleyen
   * etkinliğe ulaşabildiği tek toplu görünüm burasıdır.
   *
   * Kapı ROL seviyesinde soruluyor, kayıt seviyesinde değil: hangi bekleyen
   * kaydın kimin kararına düştüğünü kapsam filtresi zaten söylüyor. Danışman
   * öğretmen dışarıda; kendi bekleyen etkinliğini "benim açtıklarım"dan görür,
   * ona onay kuyruğu diye bir liste sunmak yetkisini olduğundan geniş
   * gösterirdi.
   */
  const onaylayabilir =
    ilKoordinatoruMu(kullanici) || projeYoneticisiMi(kullanici);

  /*
   * İl dışı başvurular (11 Ağustos 2026). Sorgu YALNIZCA karar verebilecek
   * roller için çalıştırılıyor; diğerlerinde `ilDisiBasvuruFiltresi` zaten boş
   * liste döndürürdü ama her etkinlik listesi açılışında gereksiz bir sorgu
   * atmanın anlamı yok.
   */
  const ilDisiBasvurular = onaylayabilir
    ? await ilDisiBasvurulariGetir(kullanici)
    : [];

  /*
   * CSV ÖĞRENCİDE YOK (10 Ağustos 2026 · istek: "öğrenci etkinliklerinde CSV
   * indir kalkacak"). Karar izinler.ts'te tek yerde veriliyor
   * (faaliyetDisaAktarabilirMi); rota da aynı kapıyı soruyor.
   */
  const disaAktarabilir = faaliyetDisaAktarabilirMi(kullanici);
  /*
   * Görünüm tercihi filtre DEĞİLDİR: dışa aktarmanın kapsamını değiştirmez ve
   * "Filtreleri temizle" bağlantısını tetiklememeli. Bu yüzden
   * faaliyetFiltreleriniCoz'a girmez, sorgudan da elenir.
   */
  const disaAktarmaSorgusu = sorguMetni(parametreler, ["gorunum", "sayfa"]);
  const disaAktarmaBaglantisi = disaAktarmaSorgusu
    ? `/panel/etkinlikler/disa-aktar?${disaAktarmaSorgusu}`
    : "/panel/etkinlikler/disa-aktar";

  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA_BOYUTU));

  /** Sayfa bağlantısı: süzgeçleri, sekmeyi ve görünümü korur. */
  const sayfaSorgusu = (yeniSayfa: number) => {
    const sorgu = new URLSearchParams(sorguMetni(parametreler, ["sayfa"]));
    sorgu.set("sayfa", String(yeniSayfa));
    return sorgu.toString();
  };

  /** Sekme bağlantısı: süzgeçleri ve görünümü korur, sayfayı düşürür. */
  const sekmeSorgusu = (zaman: FaaliyetFiltreleri["zaman"]) => {
    const sorgu = new URLSearchParams(sorguMetni(parametreler, ["zaman", "sayfa"]));
    if (zaman !== "hepsi") sorgu.set("zaman", zaman);
    return sorgu.toString();
  };

  /*
   * ÜÇ GÖRÜNÜM, ÜÇ AYRI İŞ (18 Ağustos 2026):
   *
   *   kart    Etkinliği TANITIR. Durum, düzenleyen birim, son başvuru ve
   *           düğmeler her zaman basılı. Varsayılan bu.
   *   izgara  Afişleri TARATIR. Sıkışık kare kutular; bilgi üstüne gelince.
   *   liste   DENETLETİR. "Hangisinin raporu eksik" tek ekranda okunur.
   *
   * Tercih adres çubuğunda taşınır, oturumda değil: sunucu bileşeni ek durum
   * tutmaz ve kullanıcı istediği görünümün bağlantısını (filtreleriyle
   * birlikte) paylaşabilir.
   *
   * VARSAYILAN ADRESTE YAZILMAZ: `gorunum=kart` parametresi eklenmiyor, çünkü
   * varsayılanı adrese yazmak paylaşılan her bağlantıyı gereksiz uzatır ve
   * yarın varsayılan değişirse eski bağlantılar yanlış görünümde donardı.
   */
  const gorunum = tekil(parametreler.gorunum);
  const listeGorunumu = gorunum === "liste";
  const izgaraGorunumu = gorunum === "izgara";
  const kartGorunumu = !listeGorunumu && !izgaraGorunumu;

  const gorunumBaglantisi = (deger: "kart" | "izgara" | "liste") => {
    const onek = disaAktarmaSorgusu ? `${disaAktarmaSorgusu}&` : "";
    if (deger === "kart") {
      return disaAktarmaSorgusu
        ? `/panel/etkinlikler?${disaAktarmaSorgusu}`
        : "/panel/etkinlikler";
    }
    return `/panel/etkinlikler?${onek}gorunum=${deger}`;
  };

  const kartlar: EtkinlikKarti[] = faaliyetler.map((faaliyet) => ({
    katilimciSayisi: faaliyet._count.basvurular,
    bittiMi: (faaliyet.bitisTarihi ?? faaliyet.tarih) <= simdi,
    id: faaliyet.id,
    ad: faaliyet.ad,
    aciklama: faaliyet.aciklama,
    tarih: faaliyet.tarih,
    duzenleyenBirim: faaliyet.duzenleyenBirim,
    basvuruBitis: faaliyet.basvuruBitis,
    kapsam: faaliyet.kapsam,
    etkinlikKategorisi: faaliyet.etkinlikKategorisi,
    durum: faaliyet.durum,
    onayDurumu: faaliyet.onayDurumu,
    calismaGruplari: faaliyet.calismaGruplari.map(
      (etiket) => etiket.calismaGrubu,
    ),
    kapak:
      faaliyet.kapakEk && !faaliyet.kapakEk.silindiMi
        ? { id: faaliyet.kapakEk.id, dosyaAdi: faaliyet.kapakEk.dosyaAdi }
        : null,
    kontenjan: kontenjanDurumu(faaliyet.basvurular, faaliyet.kontenjan),
    pencere: basvuruPenceresi(faaliyet, simdi),
    benimBasvurum: basvuruDurumum.get(faaliyet.id) ?? null,
    raporBekliyor:
      raporYazabilir &&
      faaliyet.rapor === null &&
      faaliyet.durum === "AKTIF" &&
      (faaliyet.bitisTarihi ?? faaliyet.tarih) < simdi,
    /*
     * OLUMLU GÖSTERGE (Aşama 6d). "Raporu bekliyor" rozeti zaten vardı;
     * eksik olan, raporu YAZILMIŞ etkinliğin de listede görünmesiydi. Manisa
     * panelinde bu iş renkli/soluk bir ikonla yapılıyor; burada ETİKET, çünkü
     * renk tek başına bilgi taşımamalı (ekran okuyucu ve renk körlüğü).
     *
     * Yalnızca bitmiş etkinlikte basılır: başlamamış bir etkinliğin raporunun
     * olmaması bir eksiklik değil, olağan durum.
     */
    raporYazildi:
      raporYazabilir &&
      faaliyet.rapor !== null &&
      faaliyet.durum === "AKTIF" &&
      (faaliyet.bitisTarihi ?? faaliyet.tarih) < simdi,
    benimActigim: faaliyet.duzenleyenKullaniciId === kullanici.id,
  }));

  return (
    <div className="space-y-6">
      {/*
        BAŞLIK BLOĞU ARTIK SayfaBasligi'NIN KENDİ DÜZENİ (18 Ağustos 2026 ·
        tasarım yenilemesi). Sarmalayan flex kabı kaldırıldı: bileşen artık
        `rozet` ve `eylem` alıyor ve hizalamayı kendisi kuruyor, yani aynı
        düzen her sayfada tek yerden geliyor.

        10 Ağustos 2026'daki karar KORUNDU — iki düğme hâlâ tek kapta ve sağ
        uca yaslı; `eylem` içeriğini kendi sarmalına alıyor, dolayısıyla
        düğmelerden biri yetkiye göre gizlenirse kalan tek başına sağda durur.
      */}
      <SayfaBasligi
        baslik="Etkinlikler"
        aciklama="Kapsamınızdaki etkinlikler."
        rozet={
          /*
            Sayım açıklamadan rozete taşındı: "· 143 kayıt · 2. sayfa" düz
            cümlenin sonuna eklenince okunmuyordu, oysa listede kaç kayıt
            olduğu bu ekranın en çok bakılan bilgisi.
          */
          <>
            <Rozet cesit="vurgu">{toplam} kayıt</Rozet>
            {toplam > SAYFA_BOYUTU && <Rozet>{sayfaNo}. sayfa</Rozet>}
          </>
        }
        eylem={
          <>
            {/*
            DÜĞMENİN ADI HERKESTE AYNI (12 Ağustos 2026 · istek: "mentör/paydaş
            girişinde de MEB kullanıcılarındaki gibi 'Yeni etkinlik' yazsın").
            7 Ağustos'ta dış kullanıcıya "Etkinlik bildir" yazılmıştı; bildirimin
            onaya düştüğünü zaten kapsam uyarıları anlatıyor, düğmenin role göre
            ad değiştirmesi aynı işi iki adla gösteriyordu.
          */}
            {acabilir && (
              <Link
                href="/panel/etkinlikler/yeni"
                className={SINIF_KIRMIZI_BUTON}
              >
                <Plus size={16} aria-hidden />
                Yeni etkinlik
              </Link>
            )}
          {/*
            BELGE OLUŞTUR menüden kalktı (J3); etkinlik seçim ekranına giden yol
            buradan açık kalıyor. Sayfa silinmedi, yalnızca menüden çıktı.

            10 AĞUSTOS 2026 · istek: "etkinliklerde belge oluştur görünür olsun,
            yeni etkinliğin yanına gelsin". Sayfa başlığının altındaki gri düğme
            menüden kalkmış bir ekranın TEK kapısıydı ve kimse bulamıyordu.
            Aynı gün gelen ikinci istekle iki düğme de kırmızı: renk temadan
            geliyor (hata paleti) — beş temanın hepsinde okunur bir kırmızı
            verir, sabit bir #c00 karanlık temada boğulurdu.

            KİMİN GÖRDÜĞÜ DEĞİŞMEDİ: belge yazabilenler, yani rapor yazabilen
            roller. "Görünür olsun" bir yer ve vurgu isteğidir; öğrenciye belge
            üretme kapısı açmaz.
          */}
            {raporYazabilir && (
              <Link href="/panel/belgeler" className={SINIF_KIRMIZI_BUTON}>
                <Award size={16} aria-hidden />
                Belge oluştur
              </Link>
            )}
          </>
        }
      />

      <form
        method="get"
        className="rounded-kart border border-cizgi bg-kart p-5 shadow-kart"
      >
        {/*
          Görünüm tercihi filtrelemeden sonra da yaşasın: GET formu yalnızca
          kendi alanlarını gönderir, gizli alan olmasaydı her "Filtrele"
          tıklaması kullanıcıyı ızgaraya geri atardı.
        */}
        {!kartGorunumu && (
          <input
            type="hidden"
            name="gorunum"
            value={listeGorunumu ? "liste" : "izgara"}
          />
        )}
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-baslik">
            <Filter size={16} className="text-vurgu-metin" aria-hidden />
            Filtreler
          </h2>
          {filtreVar && (
            <Link
              href="/panel/etkinlikler"
              className="inline-flex items-center gap-1 text-sm font-medium text-vurgu-metin"
            >
              <X size={14} aria-hidden />
              Filtreleri temizle
            </Link>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={SINIF_ETIKET}>Kapsam</span>
            <select
              name="kapsam"
              defaultValue={filtreler.kapsam ?? ""}
              className={SINIF_SECIM}
            >
              <option value="">Tüm kapsamlar</option>
              {KAPSAMLAR.map((kapsam) => (
                <option key={kapsam} value={kapsam}>
                  {KAPSAM_ETIKETLERI[kapsam]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={SINIF_ETIKET}>Etkinlik kategorisi</span>
            <select
              name="kategori"
              defaultValue={filtreler.kategori ?? ""}
              className={SINIF_SECIM}
            >
              <option value="">Tüm kategoriler</option>
              {ETKINLIK_KATEGORILERI.map((kategori) => (
                <option key={kategori} value={kategori}>
                  {ETKINLIK_KATEGORISI_ETIKETLERI[kategori]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={SINIF_ETIKET}>Çalışma grubu</span>
            <select
              name="grup"
              defaultValue={filtreler.calismaGrubuId ?? ""}
              className={SINIF_SECIM}
            >
              <option value="">Tüm gruplar</option>
              {gruplar.map((grup) => (
                <option key={grup.id} value={grup.id}>
                  {grup.ad}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-metin">
            <input
              type="checkbox"
              name="acik"
              value="1"
              defaultChecked={filtreler.yalnizcaAcik}
              className="h-4 w-4 rounded border-cizgi accent-[var(--renk-birincil)]"
            />
            Yalnızca başvurusu açık olanlar
          </label>
          {acabilir && (
            <label className="flex items-center gap-2 text-sm text-metin">
              <input
                type="checkbox"
                name="benim"
                value="1"
                defaultChecked={filtreler.yalnizcaBenim}
                className="h-4 w-4 rounded border-cizgi accent-[var(--renk-birincil)]"
              />
              Yalnızca benim açtıklarım
            </label>
          )}
          {onaylayabilir && (
            <label className="flex items-center gap-2 text-sm text-metin">
              <input
                type="checkbox"
                name="onay"
                value="bekleyen"
                defaultChecked={filtreler.yalnizcaOnayBekleyen}
                className="h-4 w-4 rounded border-cizgi accent-[var(--renk-birincil)]"
              />
              Onay bekleyenler
            </label>
          )}
          {/*
            RAPOR BEKLEYENLER (J3 · 6 Ağustos 2026). Raporlar sekmesi menüden
            kalktı; o ekranın asıl değeri "hangi raporlar eksik" TOPLU
            görünümüydü ve etkinlik detayından tek tek bakmak koordinatörün
            ilindeki eksikleri görmesini imkânsız kılardı. Filtre yalnızca rapor
            YAZABİLENLERE gösteriliyor — kimsenin yazamayacağı bir eksiği
            listelemek gürültüden başka bir şey değil.
          */}
          {raporYazabilir && (
            <label className="flex items-center gap-2 text-sm text-metin">
              <input
                type="checkbox"
                name="raporsuz"
                value="1"
                defaultChecked={filtreler.yalnizcaRaporsuz}
                className="h-4 w-4 rounded border-cizgi accent-[var(--renk-birincil)]"
              />
              Raporu bekleyenler
            </label>
          )}
          <button type="submit" className={SINIF_BIRINCIL_BUTON}>
            Filtrele
          </button>
          {disaAktarabilir && toplam > 0 && (
            /*
             * DOSYA SAYFAYI DEĞİL KÜMENİN TAMAMINI taşır: bağlantı sayfa
             * numarasını içermiyor (`sorguMetni` ondan eleniyor). Sayfa da
             * taşınsaydı indirilen dosya sessizce 50 satırdan ibaret kalırdı.
             */
            <DisaAktarmaBagi yol={disaAktarmaBaglantisi} kayitSayisi={toplam} />
          )}
        </div>
      </form>

      {/*
        İL DIŞI BAŞVURULAR, ETKİNLİK LİSTESİNİN ÜSTÜNDE. Bekleyen bir karar
        varsa o, listeye göz atmaktan önce gelir: koordinatör karar vermeden
        etkinliğin ili başvuruyu değerlendiremiyor, yani bekleyen her satır bir
        yerde duran bir işi tutuyor.

        Bölüm kararı olmayanlara da basılıyor ("Kararınızı bekleyen başvuru
        yok") — sekme kalktığı için kullanıcının "bu iş nereye gitti" sorusunun
        cevabı bir yerde durmalı. Karar veremeyen rollerde liste zaten boş
        geliyor ve bölüm hiç basılmıyor.
      */}
      {onaylayabilir && <IlDisiBasvurular basvurular={ilDisiBasvurular} />}

      {/*
        ZAMAN SEKMELERİ (Aşama 6b). Manisa'da "Devam Eden / Tamamlanan" ayrı
        sekmeler; bizde durum rozeti vardı ama tek tıkla daraltma yoktu.

        SEKME İLE GÖRÜNÜM AYRI EKSEN: Manisa'da ikisi iç içe (Etkinlikler
        sekmesi kart, diğerleri tablo) ve bu, "tamamlananları kart olarak
        görmek" isteyeni çıkmaza sokuyor. Sekme değişince görünüm tercihi ve
        süzgeçler korunuyor, yalnızca sayfa numarası düşüyor — üçüncü sayfadayken
        sekme değiştiren kişi yeni listenin başında olmalı.
      */}
      <nav className="flex flex-wrap gap-2" aria-label="Zaman durumu">
        {(
          [
            ["hepsi", "Tüm etkinlikler"],
            ["devam", "Devam eden"],
            ["tamamlanan", "Tamamlanan"],
          ] as const
        ).map(([deger, etiket]) => (
          <Link
            key={deger}
            href={`/panel/etkinlikler?${sekmeSorgusu(deger)}`}
            aria-current={filtreler.zaman === deger ? "page" : undefined}
            className={
              filtreler.zaman === deger
                ? "rounded-kart bg-vurgu-zemin px-3 py-2 text-sm font-medium text-vurgu-metin"
                : "rounded-kart border border-cizgi px-3 py-2 text-sm text-metin-yumusak"
            }
          >
            {etiket}
          </Link>
        ))}
      </nav>

      {faaliyetler.length === 0 ? (
        <Kart className="text-metin-yumusak">
          {filtreVar
            ? "Bu filtrelerle eşleşen etkinlik yok."
            : acabilir
              ? "Kapsamınızda henüz etkinlik yok. İlkini siz açabilirsiniz."
              : "Kapsamınızda henüz duyurulmuş bir etkinlik yok."}
        </Kart>
      ) : (
        <div className="space-y-3">
          {/*
            GÖRÜNÜM SEÇİCİ. Tercih adres çubuğunda taşınır, oturumda değil:
            sunucu bileşeni ek durum tutmaz ve kullanıcı istediği görünümün
            bağlantısını (filtreleriyle birlikte) paylaşabilir.
          */}
          <div className="flex items-center justify-end gap-1">
            {(
              [
                { deger: "kart", etiket: "Kart", Ikon: LayoutList, secili: kartGorunumu },
                { deger: "izgara", etiket: "Izgara", Ikon: LayoutGrid, secili: izgaraGorunumu },
                { deger: "liste", etiket: "Liste", Ikon: List, secili: listeGorunumu },
              ] as const
            ).map((secenek) => (
              <Link
                key={secenek.deger}
                href={gorunumBaglantisi(secenek.deger)}
                aria-current={secenek.secili ? "true" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  secenek.secili
                    ? "bg-secili-zemin text-secili-metin"
                    : "text-metin-yumusak hover:bg-zemin"
                }`}
              >
                <secenek.Ikon size={15} aria-hidden />
                {secenek.etiket}
              </Link>
            ))}
          </div>

          {listeGorunumu ? (
            <ListeGorunumu kartlar={kartlar} />
          ) : izgaraGorunumu ? (
            <IzgaraGorunumu kartlar={kartlar} />
          ) : (
            <KartGorunumu kartlar={kartlar} />
          )}

          {/*
            SAYFALAMA (Aşama 6a). Öğrenci envanterindeki düzenin aynısı:
            solda "kaçıncı kayıtlar", sağda gezinme. Sayfa numarası adres
            çubuğunda taşınıyor ki bağlantı paylaşılabilsin; dışa aktarma
            bağlantısından ise eleniyor (dosya kümenin tamamı).
          */}
          {sonSayfa > 1 && (
            <div className="flex items-center justify-between text-sm text-metin-yumusak">
              <span>
                {(sayfaNo - 1) * SAYFA_BOYUTU + 1}–
                {Math.min(sayfaNo * SAYFA_BOYUTU, toplam)} / {toplam} kayıt
              </span>
              <span className="flex gap-2">
                {sayfaNo > 1 && (
                  <Link
                    href={`/panel/etkinlikler?${sayfaSorgusu(sayfaNo - 1)}`}
                    className="rounded-kart border border-cizgi px-3 py-1"
                  >
                    Önceki
                  </Link>
                )}
                {sayfaNo < sonSayfa && (
                  <Link
                    href={`/panel/etkinlikler?${sayfaSorgusu(sayfaNo + 1)}`}
                    className="rounded-kart border border-cizgi px-3 py-1"
                  >
                    Sonraki
                  </Link>
                )}
              </span>
            </div>
          )}
        </div>
      )}

      {ogrenciMi(kullanici) && (
        <BilgiKutusu>
          Çalışma grubu etiketleri yalnızca bilgi amaçlıdır; başvurunuzu
          kısıtlamaz. Kapsamınıza giren her etkinliğe başvurabilirsiniz.
        </BilgiKutusu>
      )}
    </div>
  );
}
