import { prisma } from "@/lib/db";
import { KAPSAM_ETIKETLERI } from "@/lib/faaliyet/kurallar";

export const dynamic = "force-dynamic";

/**
 * HERKESE AÇIK ETKİNLİK UCU — tanıtım portalının beslendiği yer
 * (20 Ağustos 2026 · istek: "orada ana sayfada Üretim temaları yerine az önce
 * oluşturulan etkinlikler gelecek, oradan takip edilebilecek etkinlikler").
 *
 * Portal (genctek-portal) AYRI BİR UYGULAMA VE AYRI BİR VERİTABANIDIR. Etkinlik
 * kaydının sahibi burasıdır; portal onu kopyalamaz, her istekte buradan okur.
 * İki tarafta iki kopya tutulsaydı, burada iptal edilen bir etkinlik portalda
 * "başvurabilirsiniz" demeye devam ederdi.
 *
 * OTURUM ARANMAZ, çünkü döndürülen her satır zaten HERKESE AÇIK bir duyurudur:
 *
 *   - onayı tamamlanmış (ONAY_GEREKMEZ / ONAYLANDI) — onay bekleyen bir çağrı
 *     panelde bile yalnızca düzenleyene ve onaylayacak kişiye görünür,
 *   - iptal edilmemiş,
 *   - tarihi geçmemiş,
 *   - kapsamı İL veya ULUSAL.
 *
 * OKUL KAPSAMI DIŞARIDA: okul içi etkinlik o okulun kendi işidir; ülke
 * genelinde yayımlanan bir portalda listelenmesi, hem ilgisiz hem de o okulun
 * iç programını dışarı açmak olurdu.
 *
 * KİŞİSEL VERİ YOK: düzenleyen kişinin adı değil BİRİMİ yazılır, başvuran
 * listesi hiç sorulmaz. Uç herkese açık olduğu için buraya eklenen her yeni
 * alan, ekleyen kişi tarafından "bunu tanımadığım biri de okuyabilir" ölçütüyle
 * tartılmalıdır.
 */

/** Portalın kart üstünde yazdığı başvuru durumu. */
type BasvuruDurumu = "ACILMADI" | "ACIK" | "KAPANDI";

function basvuruDurumu(
  etkinlik: { basvuruBaslangic: Date; basvuruBitis: Date },
  simdi: Date,
): BasvuruDurumu {
  if (simdi < etkinlik.basvuruBaslangic) return "ACILMADI";
  if (simdi > etkinlik.basvuruBitis) return "KAPANDI";
  return "ACIK";
}

/*
 * Kaç kayıt döneceği çağırana bırakılıyor ama ÜST SINIR burada: portal ana
 * sayfası altı kart basıyor, etkinlik listesi sayfası ise "tümü" istiyor
 * (20 Ağustos 2026 · istek: "etkinlik sayfasında platformdaki tüm etkinlikler
 * görülebilecekti"). Sınır olmasaydı tek bir istek bütün tabloyu çekebilirdi.
 */
const VARSAYILAN_ADET = 6;
const EN_FAZLA_ADET = 100;

export async function GET(istek: Request) {
  const parametreler = new URL(istek.url).searchParams;
  const istenen = Number.parseInt(parametreler.get("adet") ?? "", 10);
  const adet = Number.isFinite(istenen)
    ? Math.min(Math.max(istenen, 1), EN_FAZLA_ADET)
    : VARSAYILAN_ADET;

  /*
   * GEÇMİŞ ETKİNLİKLER AYRI BİR İSTEKLE alınır (`?gecmis=1`). Tek listede
   * karıştırılmıyor çünkü ikisinin sırası TERS: yaklaşanlarda en yakın tarih
   * önce gelmeli, geçmişte ise en yeni. Tek sorguda birleştirilseydi, listenin
   * ortasında sıralama yön değiştirirdi.
   */
  const gecmis = parametreler.get("gecmis") === "1";
  const simdi = new Date();

  /*
   * "Tarihi geçmemiş" ölçütü BİTİŞE bakar: iki günlük bir etkinliğin ilk günü
   * geride kalmışsa etkinlik hâlâ sürüyordur ve portaldan takip edilebilmeli.
   * Tek günlüklerde `bitisTarihi` boş olduğu için ölçüt `tarih`e düşer.
   */
  const surenVeYaklasan = {
    OR: [
      { bitisTarihi: { gte: simdi } },
      { bitisTarihi: null, tarih: { gte: simdi } },
    ],
  };
  const bitmis = {
    OR: [
      { bitisTarihi: { lt: simdi } },
      { bitisTarihi: null, tarih: { lt: simdi } },
    ],
  };

  const etkinlikler = await prisma.faaliyet.findMany({
    where: {
      durum: "AKTIF",
      onayDurumu: { in: ["ONAY_GEREKMEZ", "ONAYLANDI"] },
      kapsam: { in: ["IL", "ULUSAL", "ULUSLARARASI"] },
      ...(gecmis ? bitmis : surenVeYaklasan),
    },
    orderBy: { tarih: gecmis ? "desc" : "asc" },
    take: adet,
    select: {
      id: true,
      ad: true,
      aciklama: true,
      tarih: true,
      bitisTarihi: true,
      kapsam: true,
      kontenjan: true,
      duzenleyenBirim: true,
      basvuruBaslangic: true,
      basvuruBitis: true,
      katilimBicimi: true,
      il: { select: { ad: true } },
    },
  });

  return Response.json(
    {
      etkinlikler: etkinlikler.map((etkinlik) => ({
        id: etkinlik.id,
        ad: etkinlik.ad,
        /*
         * Açıklama TAM gönderilir, kırpılmaz: kartın kaç satır göstereceği
         * portalın tasarım kararıdır. Burada kırpılsaydı, portal tasarımı
         * değiştiğinde bu uca da dokunmak gerekirdi.
         */
        aciklama: etkinlik.aciklama,
        tarih: etkinlik.tarih.toISOString(),
        bitisTarihi: etkinlik.bitisTarihi?.toISOString() ?? null,
        kapsam: etkinlik.kapsam,
        kapsamEtiketi: KAPSAM_ETIKETLERI[etkinlik.kapsam],
        il: etkinlik.il?.ad ?? null,
        katilimBicimi: etkinlik.katilimBicimi,
        kontenjan: etkinlik.kontenjan,
        duzenleyenBirim: etkinlik.duzenleyenBirim,
        basvuruBaslangic: etkinlik.basvuruBaslangic.toISOString(),
        basvuruBitis: etkinlik.basvuruBitis.toISOString(),
        basvuruDurumu: basvuruDurumu(etkinlik, simdi),
        /*
         * YOL UYGULAMA İÇİ VE ÖNEKSİZ. İki şey birden bunu gerektiriyor,
         * ikisi de alt dizin kurulumunda (aiotechs.cloud/genctek) ortaya
         * çıkıyor:
         *
         *   1. Portal bu yolu kendi GENCTEK_APP_URL'inin ardına ekliyor ve o
         *      adres zaten "/genctek" ile bitiyor — burada da önek konsaydı
         *      ".../genctek/genctek/panel/..." çıkardı.
         *   2. Giriş ekranındaki dönüş yolu denetimi (lib/auth/donus-yolu.ts)
         *      yalnızca "/panel" ile başlayan yolları kabul eder ve
         *      `redirect()` öneki KENDİSİ ekler. Önekli bir yol hem denetimden
         *      düşer hem de iki kez öneklenirdi.
         *
         * Yani önek, yolun iki ucunda da (portalın adresinde ve Next'in
         * yönlendirmesinde) zaten var; üçüncü kez burada eklenmemeli.
         */
        katilimYolu: `/panel/etkinlikler/${etkinlik.id}`,
      })),
    },
    {
      headers: {
        /*
         * Kısa ömürlü önbellek: portal her ziyaretçi için buraya gelmesin ama
         * yeni açılan bir etkinlik de dakikalarca görünmez kalmasın. `public`
         * güvenli, çünkü yanıt kişiye göre değişmiyor — herkes aynı listeyi
         * alıyor.
         */
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    },
  );
}
