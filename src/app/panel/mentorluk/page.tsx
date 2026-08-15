import { GraduationCap } from "lucide-react";
import { DisaAktarmaBagi } from "@/components/DisaAktarmaBagi";
import { notFound } from "next/navigation";
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
  basHarfler,
  MENTORLUK_DURUM_ETIKETLERI,
  MENTORLUK_DURUM_SINIFLARI,
  mentorKapsamiYaz,
  mentorSifati,
} from "@/lib/mentor/kurallar";
import { mentorlukKapsamFiltresi } from "@/lib/mentor/veri";
import { tarihSaatYaz } from "@/lib/tarih";
import { mentorlukOnaylayabilirMi } from "@/lib/yetki/izinler";
import { mentorlukKararEylemi } from "./eylemler";

export const dynamic = "force-dynamic";

/**
 * Mentörlük onay kuyruğu — YALNIZCA proje yöneticisi (11 Ağustos 2026).
 *
 * İl koordinatörü çıkarıldı: koordinatör de mentör olabiliyor ve kuyruk kendi
 * iliyle sınırlı olduğu için kendi başvurusunu kendisi onaylayabiliyordu
 * (bkz. lib/yetki/izinler.ts · mentorlukOnaylayabilirMi).
 *
 * KAPSAM MERKEZİ FİLTREDEN geçmeye devam ediyor (mentorlukKapsamFiltresi).
 * Merkez için filtre boştur, yani bugün hiçbir satırı elemiyor; yerinde
 * duruyor çünkü yetki yeniden genişletilirse kapsamı tutan tek yer orasıdır.
 * Yetkisi olmayan 404 görür — ekranın varlığı sızmasın.
 *
 * KARARA BAĞLANMIŞLAR DA LİSTELENİR (ayrı bölümde): "kimi onayladım"
 * sorusunun cevabı, kararın kendisi kadar gerekli. Bekleyenler üstte durur
 * çünkü ekranın işi onlardır.
 */

const DURUM_MESAJLARI: Record<string, string> = {
  onaylandi: "Mentörlük onaylandı.",
  reddedildi: "Mentörlük reddedildi ve gerekçe kaydedildi.",
};

function tekil(deger: string | string[] | undefined): string | null {
  if (Array.isArray(deger)) return deger[0] ?? null;
  return deger ?? null;
}

/**
 * Izgara kartının kimlik bölümü (12 Ağustos 2026 · istek: "mentörler sayfası
 * ızgara görünüme benzer bir şey olmalı, panodaki mentör listesi gibi olsun").
 *
 * PANODAKİ HAVUZ KARTIYLA AYNI DÜZEN: yuvarlak avatar, ad, sıfat, kapsam. Aynı
 * kişi iki ekranda aynı görünüyor — onaylayan kişi, kararını verdikten sonra
 * öğrencinin ne göreceğini de görmüş oluyor.
 *
 * FOTOĞRAF BASILMIYOR, baş harfler basılıyor. `/panel/mentorler/[id]/foto`
 * yalnızca ONAYLANMIŞ mentör için cevap veriyor; bu ekranın kuyruğu ise onay
 * BEKLEYENLERDİR — konacak her <img> orada kırık görsel olurdu. (Rotanın ikinci
 * koşulu "panoyu görebilme" idi ve 13 Ağustos 2026'da proje yöneticisine de
 * açıldı; engel artık o değil, kaydın onaylanmamış olması.) Onaylananlar için
 * de baş harf yeterli: onay kararı fotoğrafa bakılarak verilmez.
 */
function MentorKimligi({
  adSoyad,
  sifat,
  kapsam,
  yer,
}: {
  adSoyad: string;
  sifat: string;
  kapsam: string;
  yer: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <span
        aria-hidden
        className="flex h-12 w-12 items-center justify-center rounded-full bg-vurgu-zemin text-base font-semibold text-vurgu-metin"
      >
        {basHarfler(adSoyad)}
      </span>
      <span className="mt-2 font-medium text-metin">{adSoyad}</span>
      <span className="text-xs text-metin-yumusak">{sifat}</span>
      {kapsam && (
        <span className="mt-1 text-xs text-vurgu-metin">{kapsam}</span>
      )}
      {yer && <span className="mt-1 text-xs text-metin-yumusak">{yer}</span>}
    </div>
  );
}

export default async function MentorlukKuyruguSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!mentorlukOnaylayabilirMi(kullanici)) notFound();

  const parametreler = await searchParams;
  const hata = tekil(parametreler.hata);
  const durum = tekil(parametreler.durum);

  const kayitlar = await prisma.mentorluk.findMany({
    where: mentorlukKapsamFiltresi(kullanici),
    orderBy: [{ durum: "asc" }, { basvuruTarihi: "asc" }],
    select: {
      kullaniciId: true,
      durum: true,
      konular: true,
      basvuruTarihi: true,
      kararTarihi: true,
      retGerekcesi: true,
      gruplar: { select: { calismaGrubu: { select: { ad: true } } } },
      kullanici: {
        select: {
          ad: true,
          soyad: true,
          brans: true,
          kurum: { select: { ad: true } },
          il: { select: { ad: true } },
          // Sıfat için yalnızca rol KODU gerekiyor; kapsam alanları
          // (il/kurum) kartta yazmıyor (bkz. mentorSifati).
          roller: { where: { bitisTarihi: null }, select: { rolKodu: true } },
        },
      },
    },
  });

  const bekleyenler = kayitlar.filter((k) => k.durum === "BEKLIYOR");
  const kararlilar = kayitlar.filter((k) => k.durum !== "BEKLIYOR");

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Mentörlük başvuruları"
        aciklama={
          bekleyenler.length > 0
            ? `${bekleyenler.length} başvuru kararınızı bekliyor`
            : "Bekleyen başvuru yok"
        }
      />

      {kayitlar.length > 0 && (
        <p>
          <DisaAktarmaBagi
            yol="/panel/mentorluk/disa-aktar"
            kayitSayisi={kayitlar.length}
          />
        </p>
      )}

      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}
      {durum && DURUM_MESAJLARI[durum] && (
        <BilgiKutusu cesit="olumlu">{DURUM_MESAJLARI[durum]}</BilgiKutusu>
      )}

      <BilgiKutusu>
        Onayladığınız kişi, panodaki <strong>&quot;Mentöre sor&quot;</strong>{" "}
        ilanlarında mentör olarak görünür ve öğrencilerle{" "}
        <strong>bağlantı onayından geçen</strong> yazışmalar kurabilir.
        Yazışmalar gizli değildir; danışman, koordinatör ve proje yöneticisi
        okuyabilir.
      </BilgiKutusu>

      {/*
        ÖĞRENCİ BAŞVURULARI (14 Ağustos 2026 · istekler: "öğrenci de mentör
        olarak başvurabilsin", "ama onay olsun onun için").

        Kuyruğa öğrenci de düşmeye başladı ve karar verecek kişi bunun ne
        demek olduğunu satırda görmeli: sıfat sütununda "Öğrenci" yazıyor
        (bkz. mentorSifati) ama ne kazandığı yazmıyordu. Kutu bir kez yazıyor,
        her satırda tekrarlanmıyor.
      */}
      <BilgiKutusu cesit="uyari">
        Kuyruğa <strong>öğrenci başvuruları</strong> da düşer: onaylanan öğrenci
        akran mentörü olur, yani panodaki ilanlara açıkta cevap yazar. Birebir
        yazışma bundan ayrıdır ve yine bağlantı isteği ile danışman/koordinatör
        onayından geçer — mentörlük o kapıyı açmaz.
      </BilgiKutusu>

      <Kart>
        <KartBasligi
          baslik="Kararınızı bekleyenler"
          Ikon={GraduationCap}
        />
        {bekleyenler.length === 0 ? (
          <p className="text-metin-yumusak">Bekleyen başvuru yok.</p>
        ) : (
          /*
            IZGARA, panodaki mentör havuzuyla aynı kurulumda: `auto-fill` ile
            sütun sayısı içeriğe göre değişiyor. Taban genişlik havuzunkinden
            (8rem) FAZLA, çünkü bu kartlar karar formunu da taşıyor — 8rem'de
            gerekçe kutusu ve iki düğme okunmaz hâle gelirdi.
          */
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-4">
            {bekleyenler.map((kayit) => (
              <li
                key={kayit.kullaniciId}
                className="flex flex-col rounded-kart border border-cizgi p-4"
              >
                <MentorKimligi
                  adSoyad={`${kayit.kullanici.ad} ${kayit.kullanici.soyad}`}
                  sifat={mentorSifati(
                    kayit.kullanici.roller,
                    kayit.kullanici.brans,
                  )}
                  kapsam={mentorKapsamiYaz(
                    kayit.gruplar.map((g) => g.calismaGrubu.ad),
                    kayit.konular,
                  )}
                  yer={[kayit.kullanici.kurum?.ad, kayit.kullanici.il?.ad]
                    .filter(Boolean)
                    .join(" · ")}
                />

                <p className="mt-2 text-center text-xs text-metin-yumusak">
                  {tarihSaatYaz(kayit.basvuruTarihi)} tarihinde başvurdu
                </p>

                {/*
                  ONAY ve RET AYNI FORMDA, iki düğme. Ret gerekçesi zorunlu
                  olduğu için alan hep basılıyor — ayrı bir "reddet" ekranına
                  götürmek, karar verecek kişiyi listeden koparırdı.

                  `mt-auto`: kartlar ızgarada aynı yüksekliğe uzuyor ve kapsam
                  metni kısa olan kartta düğmeler havada kalırdı; form her
                  kartın dibine yapışıyor.
                */}
                <form
                  action={mentorlukKararEylemi}
                  className="mt-auto border-t border-cizgi pt-3"
                >
                  <input
                    type="hidden"
                    name="kullaniciId"
                    value={kayit.kullaniciId}
                  />
                  <label className="block">
                    <span className="text-xs text-metin-yumusak">
                      Ret gerekçesi (yalnızca reddederken zorunlu)
                    </span>
                    <input
                      type="text"
                      name="retGerekcesi"
                      maxLength={500}
                      className={SINIF_GIRDI}
                    />
                  </label>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="submit"
                      name="karar"
                      value="ONAYLA"
                      className={`${SINIF_BIRINCIL_BUTON} flex-1 justify-center`}
                    >
                      Onayla
                    </button>
                    <button
                      type="submit"
                      name="karar"
                      value="REDDET"
                      className={`${SINIF_IKINCIL_BUTON} flex-1 justify-center`}
                    >
                      Reddet
                    </button>
                  </div>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Kart>

      {kararlilar.length > 0 && (
        <Kart>
          <KartBasligi
            baslik="Karara bağlananlar"
            aciklama="Onaylananlar, reddedilenler ve mentörlüğü bırakanlar."
          />
          {/*
            Aynı ızgara, DAHA DAR taban: bu kartlarda form yok, yalnızca kimlik
            ve durum rozeti var. Onaylananların satırı havuzdaki kartın birebir
            karşılığı — proje yöneticisi "panoda kim görünüyor" sorusunun
            cevabını buradan da okuyor.
          */}
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4">
            {kararlilar.map((kayit) => (
              <li
                key={kayit.kullaniciId}
                className="flex flex-col rounded-kart border border-cizgi p-4"
              >
                <MentorKimligi
                  adSoyad={`${kayit.kullanici.ad} ${kayit.kullanici.soyad}`}
                  sifat={mentorSifati(
                    kayit.kullanici.roller,
                    kayit.kullanici.brans,
                  )}
                  kapsam={mentorKapsamiYaz(
                    kayit.gruplar.map((g) => g.calismaGrubu.ad),
                    kayit.konular,
                  )}
                  yer={[kayit.kullanici.kurum?.ad, kayit.kullanici.il?.ad]
                    .filter(Boolean)
                    .join(" · ")}
                />

                {kayit.retGerekcesi && (
                  <p className="mt-2 text-center text-xs text-hata-metin">
                    Gerekçe: {kayit.retGerekcesi}
                  </p>
                )}

                <p className="mt-auto pt-3 text-center">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${MENTORLUK_DURUM_SINIFLARI[kayit.durum]}`}
                  >
                    {MENTORLUK_DURUM_ETIKETLERI[kayit.durum]}
                    {kayit.kararTarihi
                      ? ` · ${tarihSaatYaz(kayit.kararTarihi)}`
                      : ""}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </Kart>
      )}
    </div>
  );
}
