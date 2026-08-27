import { ArrowLeft, ClipboardCheck, Megaphone, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GorevBasvuruKuyrugu } from "@/components/GorevBasvuruKuyrugu";
import { RolEtiketi, RolsuzEtiketi } from "@/components/RolEtiketi";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
  SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  PANO_ILANI_DURUM_ETIKETLERI,
  PANO_KATEGORILERI,
  TALEP_TURU_BELIRTILMEMIS,
  TALEP_TURU_ETIKETLERI,
} from "@/lib/iletisim/kurallar";
import type { RolKodu, TalepTuru } from "@/generated/prisma/enums";
import { tarihSaatYaz, tarihYaz } from "@/lib/tarih";
import {
  gencTekGoreviYonetebilirMi,
  panoIlaniOnaylayabilirMi,
} from "@/lib/yetki/izinler";
import { IlanDuzenlemeFormu } from "../formlar";
import { talepKararEylemi, talepSilEylemi } from "../eylemler";

export const dynamic = "force-dynamic";

/**
 * PANO İLANLARI — onay kuyruğu, düzenleme ve silme (14 Ağustos 2026).
 *
 * İstekler:
 *   "panodaki öğrenci ilanları şimdilik proje yöneticilerine düşsün oradan onay
 *    versin"
 *   "proje yöneticisi panodaki ilanları silip düzenleyebilsin"
 *   "açılan ilanlar düzenlenebilsin, açan kişi ve proje yöneticisi
 *    düzenleyebilsin"
 *
 * TEK EKRAN, İKİ BÖLÜM: üstte kararı bekleyenler, altta yayımdaki ilanlar.
 * Ayrı ekranlara bölünselerdi merkez, reddetmek yerine düzeltip onaylamak için
 * iki ekran arasında gidip gelirdi — oysa düzeltme çoğu ret sebebinin daha iyi
 * cevabıdır.
 *
 * KUYRUK KAPSAM FİLTRESİZ, tıpkı panonun kendisi gibi: ilanlar ülke genelinde
 * görünüyor ve kararı yalnızca merkez veriyor (bkz. panoIlaniOnaylayabilirMi).
 * Yetkisi olmayan 404 görür — ekranın varlığı sızmasın.
 */

const DURUM_MESAJLARI: Record<string, string> = {
  onaylandi: "İlan onaylandı ve panoda yayımlandı.",
  reddedildi: "İlan reddedildi ve gerekçe ilan sahibine iletildi.",
  duzenlendi: "İlan güncellendi.",
  silindi: "İlan silindi.",
  /*
   * GençTek görev kararı da bu ekrandan verilebiliyor (26 Ağustos 2026);
   * sonucu okunacak yer de burası olmalı.
   */
  "karar-verildi":
    "Görev başvurusu karara bağlandı; başvurana bildirim gönderildi.",
};

function acanRolleri(roller: { rolKodu: RolKodu }[]): RolKodu[] {
  return [...new Set(roller.map((rol) => rol.rolKodu))];
}

const ACAN_SECIMI = {
  id: true,
  ad: true,
  soyad: true,
  sinif: true,
  brans: true,
  kurum: { select: { ad: true } },
  il: { select: { ad: true } },
  roller: { where: { bitisTarihi: null }, select: { rolKodu: true } },
} as const;

const ILAN_SECIMI = {
  id: true,
  tur: true,
  baslik: true,
  icerik: true,
  sonGecerlilik: true,
  olusturmaTarihi: true,
  onayDurumu: true,
  retGerekcesi: true,
  acan: { select: ACAN_SECIMI },
} as const;

/** İlanın kimlik satırı: kim açtı, nereden, ne zamana kadar. */
function IlanKimligi({
  acan,
  sonGecerlilik,
  olusturmaTarihi,
}: {
  acan: {
    ad: string;
    soyad: string;
    sinif: string | null;
    brans: string | null;
    kurum: { ad: string } | null;
    il: { ad: string } | null;
    roller: { rolKodu: RolKodu }[];
  };
  sonGecerlilik: Date;
  olusturmaTarihi: Date;
}) {
  const roller = acanRolleri(acan.roller);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-metin-yumusak">
      {roller.length > 0 ? (
        roller.map((rolKodu) => <RolEtiketi key={rolKodu} rolKodu={rolKodu} />)
      ) : (
        <RolsuzEtiketi />
      )}
      <span>
        {acan.ad} {acan.soyad}
        {" · "}
        {acan.sinif ?? acan.brans ?? "—"}
        {" · "}
        {acan.kurum?.ad ?? acan.il?.ad ?? "—"}
        {" · "}
        {tarihSaatYaz(olusturmaTarihi)} tarihinde açıldı
        {" · "}
        {tarihYaz(sonGecerlilik)} tarihine kadar
      </span>
    </div>
  );
}

function KategoriRozeti({ tur }: { tur: keyof typeof TALEP_TURU_ETIKETLERI | null }) {
  return (
    <span className="rounded-full bg-rol-ogrenci-zemin px-2.5 py-0.5 text-xs font-medium text-rol-ogrenci-metin">
      {tur ? TALEP_TURU_ETIKETLERI[tur] : TALEP_TURU_BELIRTILMEMIS}
    </span>
  );
}

/**
 * DÜZENLE ve SİL, AYNI ŞERİTTE (14 Ağustos 2026 · geri bildirim: "pano
 * ilanlarını düzenleme koymamışsın, proje yöneticisine sil var").
 *
 * İki eylem baştan beri vardı ama düzenleme, silme düğmesinin üstünde duran
 * düz bir metin satırıydı; yan yana konmadıkları için ekran "yalnızca
 * silebilirsin" diyordu. Şerit ikisini aynı ağırlıkta gösteriyor — merkezin
 * asıl yapması istenen şey de bu sırayla: önce düzelt, gerekiyorsa sil.
 *
 * SİLME AYRI FORM olarak kalıyor: onay/ret formuna üçüncü bir düğme olarak
 * konsaydı, yanlış düğmeye basmanın bedeli geri alınamaz olurdu.
 */
function IlanIslemleri({
  talep,
}: {
  talep: { id: number; tur: TalepTuru | null; baslik: string; icerik: string; sonGecerlilik: Date };
}) {
  return (
    <div className="mt-3 border-t border-cizgi pt-3">
      <div className="flex flex-wrap items-start gap-3">
        <IlanDuzenlemeFormu
          talep={talep}
          kategoriler={PANO_KATEGORILERI}
          donus="onaylar"
        />
        <form action={talepSilEylemi} className="mt-2">
          <input type="hidden" name="talepId" value={talep.id} />
          <button type="submit" className={SINIF_IKINCIL_BUTON}>
            <Trash2 size={16} aria-hidden />
            İlanı sil
          </button>
        </form>
      </div>
      <p className="mt-2 text-sm text-metin-yumusak">
        Silme geri alınamaz: ilan ve altındaki mentör cevapları kaldırılır.
        Bağlantı istekleri kayıt olarak kalır, ilanla bağları kopar.
      </p>
    </div>
  );
}

export default async function PanoIlanOnaylariSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; hata?: string }>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!panoIlaniOnaylayabilirMi(kullanici)) notFound();

  const { durum, hata } = await searchParams;
  const simdi = new Date();

  /*
   * ÜRÜN ONAY KUYRUĞU BU EKRANDAN KALKTI (27 Ağustos 2026 · istek: "öğrenci
   * market bölümünden bir ürün girdiğinde onun onayı proje yöneticisinin market
   * sayfasına gitsin").
   *
   * 26 Ağustos'ta buraya konmuştu ve gerekçesi "kuyruk merkezin öbür onay
   * işlerinin yanında dursun" idi. Karşı gerekçe daha güçlü çıktı: karar
   * VİTRİNİN kendisine bakılarak veriliyor — "bu ürün ülke geneline açık bir
   * vitrinde durmalı mı" sorusunun cevabı, vitrinin nasıl göründüğünü gören
   * kişide. Kuyruk artık /panel/urunler ekranının başında.
   */
  const [bekleyenler, yayindakiler, bekleyenGorevBasvurulari] =
    await Promise.all([
      prisma.talep.findMany({
        where: { onayDurumu: "BEKLIYOR", kapatildiMi: false },
        // En eski üstte: kuyruğun işi en çok bekleyeni çözmek.
        orderBy: { olusturmaTarihi: "asc" },
        select: ILAN_SECIMI,
      }),
      /*
       * YAYIMDAKİ İLANLAR: süresi dolmamış, kapatılmamış ve panoda görünen her
       * ilan. Reddedilenler bu listede YOK — panoda da yoklar ve sahibi
       * gerekçesini kendi ekranında görüyor; merkezin yeniden karar vereceği bir
       * şey kalmıyor.
       */
      prisma.talep.findMany({
        where: {
          kapatildiMi: false,
          sonGecerlilik: { gte: simdi },
          onayDurumu: { in: ["ONAY_GEREKMEZ", "ONAYLANDI"] },
        },
        orderBy: { olusturmaTarihi: "desc" },
        take: 100,
        select: ILAN_SECIMI,
      }),
      /*
       * GENÇTEK GÖREV BAŞVURULARI (26 Ağustos 2026 · istek: "genctek
       * görevleri hâlâ proje yöneticisi onayına gitmiyor" →
       * "/panel/talepler/onaylar buraya da gitmesi gerekiyordu").
       *
       * Kuyruk Yönetim Paneli'ndeki GençTek Görevleri ekranında da duruyor;
       * buradaki kopya, merkezin onay işlerinin tek ekranda toplanması
       * içindir. Liste ve karar formu ORTAK BİLEŞEN, ikinci bir kopya değil.
       *
       * Yalnızca BEKLEYENLER: karara bağlananların geçmişi görev ekranında,
       * kendi ilanlarının yanında okunur. Onay kuyruğunun işi yapılacak işi
       * göstermek.
       */
      gencTekGoreviYonetebilirMi(kullanici)
        ? prisma.gencTekGorevBasvurusu.findMany({
            where: { onayDurumu: "BEKLIYOR" },
            orderBy: { olusturmaTarihi: "asc" },
            select: {
              id: true,
              mesaj: true,
              olusturmaTarihi: true,
              gorev: { select: { ad: true } },
              kullanici: {
                select: {
                  ad: true,
                  soyad: true,
                  sinif: true,
                  brans: true,
                  kurum: { select: { ad: true } },
                  il: { select: { ad: true } },
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

  const bekleyenToplam =
    bekleyenler.length + bekleyenGorevBasvurulari.length;

  return (
    <div className="space-y-6">
      {/*
        BAŞLIK İKİ KUYRUĞU BİRDEN SAYAR (26 Ağustos 2026): ekran artık
        yalnızca pano ilanlarının değil, merkezin karar verdiği işlerin
        kuyruğu. Yalnızca ilan sayısı yazsaydı, bekleyen görev başvurusu
        varken başlık "Bekleyen ilan yok" derdi.
      */}
      <SayfaBasligi
        baslik="Onay kuyruğu"
        aciklama={
          bekleyenToplam > 0
            ? [
                bekleyenler.length > 0
                  ? `${bekleyenler.length} pano ilanı`
                  : null,
                bekleyenGorevBasvurulari.length > 0
                  ? `${bekleyenGorevBasvurulari.length} görev başvurusu`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ") + " kararınızı bekliyor"
            : "Kararınızı bekleyen iş yok"
        }
        /*
          Kendi geri bağlantısı yukarıda: bu ekranın üstü Panel değil,
          geldiği liste. `SayfaBasligi`nin varsayılan "Panel" bağlantısı
          basılsaydı üst üste iki geri bağlantısı olurdu.
        */
        geri={null}
      />

      <Link
        href="/panel/talepler"
        className="inline-flex items-center gap-1 text-sm font-medium text-vurgu-metin"
      >
        <ArrowLeft size={14} aria-hidden />
        Panoya dön
      </Link>

      {durum && DURUM_MESAJLARI[durum] && (
        <BilgiKutusu cesit="olumlu">{DURUM_MESAJLARI[durum]}</BilgiKutusu>
      )}
      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}

      <BilgiKutusu>
        Öğrencilerin açtığı ilanlar onayınıza düşer ve onaylanana kadar panoda
        görünmez. Reddetmek yerine ilanı <strong>düzenleyip</strong>{" "}
        onaylayabilirsiniz; ret gerekçesi ilan sahibine bildirimle iletilir.
      </BilgiKutusu>

      {/*
        GÖREV BAŞVURULARI ÖNCE: pano ilanı düzenlenip onaylanabiliyor, yani
        üzerinde çalışılan bir metin; görev başvurusu ise tek hamlede biten
        bir karar. Kısa iş üstte duruyor.
      */}
      {gencTekGoreviYonetebilirMi(kullanici) && (
        <GorevBasvuruKuyrugu
          basvurular={bekleyenGorevBasvurulari}
          donus="onaylar"
          aciklama="Panodaki GençTek görevlerine yapılan başvurular. Karar, Yönetim Paneli'ndeki GençTek Görevleri ekranından da verilebilir."
        />
      )}

      <Kart>
        <KartBasligi baslik="Kararınızı bekleyen ilanlar" Ikon={ClipboardCheck} />
        {bekleyenler.length === 0 ? (
          <p className="text-metin-yumusak">Bekleyen ilan yok.</p>
        ) : (
          <ul className="space-y-4">
            {bekleyenler.map((talep) => (
              <li
                key={talep.id}
                className="rounded-kart border border-cizgi p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-baslik">{talep.baslik}</h3>
                  <KategoriRozeti tur={talep.tur} />
                </div>
                <p className="mt-2 whitespace-pre-line text-metin">
                  {talep.icerik}
                </p>
                <IlanKimligi
                  acan={talep.acan}
                  sonGecerlilik={talep.sonGecerlilik}
                  olusturmaTarihi={talep.olusturmaTarihi}
                />

                {/*
                  ONAY ve RET AYNI FORMDA, iki düğme; gerekçe alanı hep basılı
                  duruyor çünkü redde zorunlu (bkz. ilanKarariniCoz). Ayrı bir
                  "reddet" ekranına götürmek, karar verecek kişiyi listeden
                  koparırdı — emsali mentörlük kuyruğu.
                */}
                <form
                  action={talepKararEylemi}
                  className="mt-3 border-t border-cizgi pt-3"
                >
                  <input type="hidden" name="talepId" value={talep.id} />
                  <label className="block sm:max-w-xl">
                    <span className="text-sm text-metin-yumusak">
                      Ret gerekçesi (yalnızca reddederken zorunlu)
                    </span>
                    <input
                      type="text"
                      name="retGerekcesi"
                      maxLength={500}
                      className={SINIF_GIRDI}
                    />
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="submit"
                      name="karar"
                      value="ONAYLA"
                      className={SINIF_BIRINCIL_BUTON}
                    >
                      Onayla
                    </button>
                    <button
                      type="submit"
                      name="karar"
                      value="REDDET"
                      className={SINIF_IKINCIL_BUTON}
                    >
                      Reddet
                    </button>
                  </div>
                </form>

                <IlanIslemleri talep={talep} />
              </li>
            ))}
          </ul>
        )}
      </Kart>

      <Kart>
        <KartBasligi
          baslik="Yayımdaki ilanlar"
          aciklama={`${yayindakiler.length} ilan · düzenleyebilir ya da silebilirsiniz`}
          Ikon={Megaphone}
        />
        {yayindakiler.length === 0 ? (
          <p className="text-metin-yumusak">Panoda yayımda ilan yok.</p>
        ) : (
          <ul className="space-y-4">
            {yayindakiler.map((talep) => (
              <li
                key={talep.id}
                className="rounded-kart border border-cizgi p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-baslik">{talep.baslik}</h3>
                  <span className="flex flex-wrap items-center gap-2">
                    <KategoriRozeti tur={talep.tur} />
                    {PANO_ILANI_DURUM_ETIKETLERI[talep.onayDurumu] && (
                      <span className="rounded-full bg-vurgu-zemin px-2.5 py-0.5 text-xs font-medium text-vurgu-metin">
                        {PANO_ILANI_DURUM_ETIKETLERI[talep.onayDurumu]}
                      </span>
                    )}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-line text-metin">
                  {talep.icerik}
                </p>
                <IlanKimligi
                  acan={talep.acan}
                  sonGecerlilik={talep.sonGecerlilik}
                  olusturmaTarihi={talep.olusturmaTarihi}
                />
                <IlanIslemleri talep={talep} />
              </li>
            ))}
          </ul>
        )}
      </Kart>
    </div>
  );
}
