import { notFound } from "next/navigation";
import { BelgeKagidi } from "@/components/belge/BelgeKagidi";
import { BelgeStilleri } from "@/components/belge/BelgeStilleri";
import { YazdirButonu } from "@/components/YazdirButonu";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import {
  BELGE_TURU_ETIKETLERI,
  belgeMetniUret,
  belgeTuruMu,
} from "@/lib/belge/kurallar";
import { belgeKapisi, katilimciBelgeKapisi } from "@/lib/belge/kapi";
import {
  belgeUretiminiKaydet,
  faaliyetRaporuVarMi,
} from "@/lib/belge/kayit";
import { katilimciIdleriniCoz, topluAlicilariSec } from "@/lib/belge/toplu";
import { prisma } from "@/lib/db";
import {
  imzaBilgisiniCoz,
  imzaUnvaniOner,
} from "@/lib/belge/kurallar";
import { faaliyetKapsamiCikar, gorunurFaaliyetGetir } from "@/lib/faaliyet/erisim";
import { uygulamaYolu } from "@/lib/ortam";
import { tarihYaz } from "@/lib/tarih";
import { faaliyetBelgesiUretebilirMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";

export const dynamic = "force-dynamic";

/**
 * Toplu katılım / teşekkür belgesi.
 *
 * Tek yazdırma işlemiyle N sayfalık tek PDF üretir: her belge kendi sayfasında
 * basılır, sayfa sonları CSS'te kurulur (bkz. BelgeStilleri). Sunucuda PDF
 * birleştirilmez — tek sayfalık bir belge için taşınacak bağımlılık ve ikinci
 * çalışma zamanı, tarayıcının zaten yaptığı işi tekrarlardı.
 *
 * Kimin basılacağına dair kararlar `lib/belge/toplu` içinde ve saf: aralarında
 * bir güvenlik sınırı var (istenen kimlikler faaliyetin katılımcılarıyla
 * kesiştirilir) ve o sınır birim testle kapsanmalı.
 */
export default async function TopluBelgeSayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tur?: string;
    katilimci?: string | string[];
    metin?: string;
    imzaAd?: string;
    imzaUnvan?: string;
  }>;
}) {
  const [{ id }, { tur, katilimci, metin, imzaAd, imzaUnvan }] =
    await Promise.all([params, searchParams]);
  const kullanici = await oturumKullanicisiZorunlu();

  const faaliyet = await gorunurFaaliyetGetir(kullanici, Number.parseInt(id, 10));
  if (!faaliyet) notFound();

  if (!faaliyetBelgesiUretebilirMi(kullanici, faaliyetKapsamiCikar(faaliyet))) {
    notFound();
  }

  if (!tur || !belgeTuruMu(tur)) notFound();

  /*
   * RAPOR KAPISI (12 Ağustos 2026 · istek: "etkinlik raporu yazılmadan belge
   * oluştur seçeneği olmamalı"). Toplu yol da tekil yol gibi bir GET isteği;
   * kapı yalnızca ekranda sorulsaydı adresi elle yazan kişi raporsuz belge
   * basmaya devam ederdi.
   */
  if (!belgeKapisi({ raporVarMi: await faaliyetRaporuVarMi(faaliyet.id) }).olurMu) {
    notFound();
  }

  /*
   * YOKLAMADA "GELDİ" İŞARETLİ OLMAYAN KİŞİ LİSTEYE HİÇ GİRMEZ. Toplu üretimin
   * varsayılanı "kutu işaretlenmezse listedeki herkes" olduğu için, süzme
   * seçimden ÖNCE yapılır: sonrasında yapılsaydı "hiçbiri işaretlenmedi" hâli
   * gelmeyenleri de kapsar ve tam da şikâyet edilen sonuç (gelmeyen öğrencinin
   * profiline katılım düşmesi) toplu düğmeden geri gelirdi.
   */
  const basvurular = await prisma.basvuru.findMany({
    where: { faaliyetId: faaliyet.id, durum: "SECILDI" },
    select: {
      katilimciId: true,
      katildiMi: true,
      katilimci: { select: { ad: true, soyad: true } },
    },
  });

  const secim = topluAlicilariSec(
    basvurular
      .filter((basvuru) => katilimciBelgeKapisi(basvuru).olurMu)
      .map((basvuru) => ({
        katilimciId: basvuru.katilimciId,
        adSoyad: `${basvuru.katilimci.ad} ${basvuru.katilimci.soyad}`,
      })),
    katilimciIdleriniCoz(katilimci),
  );

  const belgelerYolu = uygulamaYolu(
    `/panel/etkinlikler/${faaliyet.id}/belgeler`,
  );

  /*
   * Belge üretilemeyen durumlar notFound() DEĞİL: yol doğru, eksik olan veri.
   * 404 kullanıcıya bağlantının bozuk olduğunu düşündürür ve ne yapması
   * gerektiğini söylemez.
   */
  if (secim.durum !== "hazir") {
    const mesajlar = {
      katilimciYok: {
        baslik: "Belge üretilebilecek katılımcı yok",
        aciklama:
          "Toplu belge, yoklamada “geldi” işaretlenmiş katılımcılara üretilir. Etkinlik sayfasındaki Yoklama bölümünden işaretleme yapın.",
      },
      eslesmeYok: {
        baslik: "Seçilen kişiler bu etkinliğin katılımcısı değil",
        aciklama:
          "Adresteki katılımcı kimlikleri bu etkinliğin seçilmiş katılımcılarıyla eşleşmedi.",
      },
      sinirAsildi: {
        baslik: "Tek seferde basılabilecek belge sayısı aşıldı",
        aciklama:
          secim.durum === "sinirAsildi"
            ? `${secim.istenen} kişi seçildi; tek yazdırmada en fazla ${secim.azami} belge basılabilir. Listeden seçim yaparak parçalara bölün.`
            : "",
      },
    }[secim.durum];

    return (
      <div className="belge-sayfa-kapsayici">
        <BelgeStilleri />
        <div className="belge-bilgi">
          <h2>{mesajlar.baslik}</h2>
          <p>{mesajlar.aciklama}</p>
          <a href={belgelerYolu} className="arac arac-birincil">
            ← Belgeler sayfasına dön
          </a>
        </div>
      </div>
    );
  }

  /*
   * İmza tekil belgeyle AYNI kuraldan geçer (J5 · 6 Ağustos 2026): ad elle
   * girilir, unvan kapsamdan gelir. İki ekran ayrı hesaplasaydı aynı etkinliğin
   * toplu ve tekil çıktıları farklı imza taşıyabilirdi.
   *
   * Kontrol erişim kaydından ÖNCE: üretilmeyen bir belgeyi "üretildi" diye
   * loglamak denetim kaydını yanlışlar.
   */
  const imza = imzaBilgisiniCoz({
    adSoyad: imzaAd ?? "",
    unvan: imzaUnvan ?? "",
    varsayilanUnvan:
      imzaUnvaniOner(faaliyet.kapsam) ?? faaliyet.duzenleyenBirim,
  });
  if (!imza.olurMu) {
    return (
      <div className="belge-sayfa-kapsayici">
        <BelgeStilleri />
        <div className="belge-bilgi">
          <h2>Belgeyi imzalayacak kişi yazılmadı</h2>
          <p>{imza.neden}</p>
          <a href={belgelerYolu} className="arac arac-birincil">
            ← Belgeler sayfasına dön
          </a>
        </div>
      </div>
    );
  }

  /*
   * Erişim kaydı DÖNGÜ DIŞINDA tek satır: 60 kişilik bir faaliyetin belgesini
   * basmak 60 kayıt değil bir işlemdir. Kişi başına kayıt atmak, günlüğü tek
   * bir tıklamayla okunmaz hale getirirdi.
   */
  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "GORUNTULEME",
    hedefTip: "FAALIYET",
    hedefId: faaliyet.id,
    detay: `Toplu ${BELGE_TURU_ETIKETLERI[tur]} üretildi: ${secim.alicilar.length} kişi`,
  });

  /*
   * Üretim kaydı — belgesi basılan her kişinin profiline katılım düşer
   * (7 Ağustos 2026). Erişim kaydından AYRI tutulur: log KVKK saklama
   * süresiyle siliniyor, oysa katılım geçmişi kalıcı olmalı.
   *
   * Alıcılar `topluAlicilariSec` süzgecinden geçti; hepsi bu faaliyetin
   * seçilmiş katılımcısı ve kimlikleri veritabanından geldi.
   */
  await belgeUretiminiKaydet({
    faaliyetId: faaliyet.id,
    katilimciIdleri: secim.alicilar.map((alici) => alici.katilimciId),
    tur,
    uretenKullaniciId: kullanici.id,
  });

  const tarihMetni = tarihYaz(faaliyet.tarih);

  return (
    <div className="belge-sayfa-kapsayici">
      <BelgeStilleri />

      <div className="arac-cubugu">
        <a href={belgelerYolu} className="arac">
          ← Belgeler
        </a>
        <YazdirButonu className="arac arac-birincil" />
      </div>

      <div className="belge-listesi">
        {secim.alicilar.map((alici, endeks) => (
          <BelgeKagidi
            key={alici.katilimciId}
            belge={belgeMetniUret({
              tur,
              adSoyad: alici.adSoyad,
              faaliyetAdi: faaliyet.ad,
              tarihMetni,
              ozelMetin: metin ?? null,
            })}
            imzaAdSoyad={imza.adSoyad}
            imzaBirim={imza.unvan}
            siraNo={endeks + 1}
            toplamSayfa={secim.alicilar.length}
          />
        ))}
      </div>
    </div>
  );
}
