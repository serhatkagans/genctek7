import { Download, FileText, ImagePlus, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  KirintiYolu,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
  SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { ekSinirlariniGetir } from "@/lib/faaliyet/ek-kaydet";
import { faaliyetKapsamiCikar, gorunurFaaliyetGetir } from "@/lib/faaliyet/erisim";
import { yoklamaOzeti } from "@/lib/belge/kapi";
import { faaliyetSuresiYaz } from "@/lib/faaliyet/kurallar";
import {
  RAPOR_ALAN_ADLARI,
  raporYazilabilirMi,
} from "@/lib/faaliyet/rapor-kurallar";
import { uygulamaYolu } from "@/lib/ortam";
import { tarihSaatYaz } from "@/lib/tarih";
import { faaliyetRaporuYazabilirMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import { raporKaydetEylemi } from "./eylemler";

export const dynamic = "force-dynamic";

/**
 * Biten faaliyetin raporu — analiz isteği Bölüm 4.
 *
 * Sayfa iki şeyi bir araya getirir: SİSTEMİN saydığı katılım verisi ve
 * İNSANIN yazdığı değerlendirme. Sayılar rapora kopyalanmaz, her açılışta
 * başvurulardan hesaplanır — kopyalansaydı bir başvuru sonradan
 * güncellendiğinde rapor sessizce yanlış olurdu.
 *
 * GÖRSEL EKLEME ARTIK BURADA (12 Ağustos 2026 · istek: "rapor ekranında görsel
 * ekle deyince etkinliği oluştur kısmındaki görsel ekle alanına gidiyor ve
 * burada yazdığım alanlar siliniyor").
 *
 * Eski karar "görsel ekleme burada tekrarlanmaz, etkinliğin ek kartına
 * yönlendirilir" idi. Gerekçesi hâlâ doğru — iki ayrı dosya listesi olmamalı —
 * ama bedeli yanlış yere düşüyordu: rapor yazarken görsel eklemek isteyen kişi
 * sayfadan çıkmak ve yazdığını kaybetmek zorunda kalıyordu.
 *
 * Çözüm ikinci bir liste açmak DEĞİL: dosya alanı rapor formunun içinde ve aynı
 * `ekKaydet` yolundan geçiyor, yani görseller yine etkinliğin ek listesinde
 * duruyor. Tek gönderimde önce metin kaydediliyor, sonra dosyalar yükleniyor;
 * hiçbir şey kaydedilmeden sayfadan çıkılmıyor.
 *
 * AYRI BİR YÜKLEME FORMU DA OLMAZDI: form gönderimi sayfayı yeniler ve
 * doldurulmuş metin alanları sıfırlanır — şikâyetin aynısı, bir adım sonra.
 */

const DURUM_MESAJLARI: Record<string, string> = {
  yazildi: "Etkinlik raporu kaydedildi.",
  guncellendi: "Etkinlik raporu güncellendi.",
};

export default async function FaaliyetRaporuSayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ durum?: string; hata?: string }>;
}) {
  const [{ id }, { durum, hata }] = await Promise.all([params, searchParams]);
  const kullanici = await oturumKullanicisiZorunlu();

  const faaliyet = await gorunurFaaliyetGetir(kullanici, Number.parseInt(id, 10));
  if (!faaliyet) notFound();

  const yazabilir = faaliyetRaporuYazabilirMi(
    kullanici,
    faaliyetKapsamiCikar(faaliyet),
  );

  const [rapor, basvurular, gorseller] = await Promise.all([
    prisma.faaliyetRaporu.findUnique({
      where: { faaliyetId: faaliyet.id },
      select: {
        degerlendirme: true,
        kazanimlar: true,
        guncellemeTarihi: true,
        yazan: { select: { ad: true, soyad: true } },
      },
    }),
    prisma.basvuru.findMany({
      where: { faaliyetId: faaliyet.id, durum: "SECILDI" },
      orderBy: { basvuruTarihi: "asc" },
      select: {
        katilimciId: true,
        katildiMi: true,
        katilimci: {
          select: {
            id: true,
            ad: true,
            soyad: true,
            sinif: true,
            brans: true,
            kurum: { select: { ad: true } },
            il: { select: { ad: true } },
          },
        },
      },
    }),
    prisma.faaliyetEk.findMany({
      where: {
        faaliyetId: faaliyet.id,
        silindiMi: false,
        mimeTipi: { startsWith: "image/" },
      },
      select: { id: true, dosyaAdi: true },
    }),
  ]);

  // Katılımcı adları kişisel veridir; görüntüleme kaydı KVKK gereği tutulur.
  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "GORUNTULEME",
    hedefTip: "FAALIYET",
    hedefId: faaliyet.id,
    detay: "Etkinlik raporu ekranı görüntülendi",
  });

  /*
   * Sınırlar EKRANA SABİT YAZILMAZ, ayardan okunur: izinli tipler ve boyut
   * proje yöneticisi tarafından değiştirilebiliyor (bkz. ekSinirlariniGetir).
   * Sabit yazılsaydı ayar değiştiğinde ekran yanlış bir sınır söyler ve
   * kullanıcı reddedilen dosyanın sebebini anlayamazdı.
   */
  const sinirlar = await ekSinirlariniGetir();
  const gorselKabulListesi = sinirlar.izinliGorselTipleri.join(",");
  const gorselTurMetni = sinirlar.izinliGorselTipleri
    .map((tip) => tip.replace("image/", ""))
    .join(", ");
  const gorselSinirMetni = `${(sinirlar.gorselMaksBayt / (1024 * 1024)).toFixed(0)} MB`;

  const yoklama = yoklamaOzeti(basvurular);
  const hazir = raporYazilabilirMi({
    tarih: faaliyet.tarih,
    bitisTarihi: faaliyet.bitisTarihi,
    durum: faaliyet.durum,
    simdi: new Date(),
  });

  return (
    <div className="space-y-6">
      {/*
        KIRINTI YOLU (29 Ağustos 2026 · istek: "etkinlikler sayfasındaki
        kartlara girince profile dönüyor, o da etkinliklere dönsün").

        Başlığın geri bağlantısı verilmediği için SayfaBasligi VARSAYILANI
        basıyordu: "← Profil". Bu ekrana Profil'den değil etkinlik listesinden
        (ya da etkinliğin kendisinden) geliniyor; şerit o yolu basamaklarıyla
        gösteriyor, `geri={null}` de varsayılanın üste binmesini engelliyor.
      */}
      <KirintiYolu
        basamaklar={[
          { etiket: "Etkinlikler", yol: "/panel/etkinlikler" },
          { etiket: faaliyet.ad, yol: `/panel/etkinlikler/${faaliyet.id}` },
          { etiket: "Etkinlik raporu" },
        ]}
      />

      <SayfaBasligi
        baslik="Etkinlik raporu"
        aciklama={`${faaliyet.ad} · ${faaliyetSuresiYaz(faaliyet.tarih, faaliyet.bitisTarihi)}`}
        geri={null}
      />

      {durum && DURUM_MESAJLARI[durum] && (
        <BilgiKutusu cesit="olumlu">{DURUM_MESAJLARI[durum]}</BilgiKutusu>
      )}
      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}

      <Kart>
        <KartBasligi
          baslik="Katılım"
          aciklama="Sayılar başvurulardan anlık hesaplanır; rapora kopyalanmaz."
          Ikon={Users}
        />
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-metin-yumusak">Kontenjan</dt>
            <dd className="mt-0.5 text-2xl font-bold text-baslik">
              {faaliyet.kontenjan}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-metin-yumusak">Seçilen</dt>
            <dd className="mt-0.5 text-2xl font-bold text-baslik">
              {basvurular.length}
            </dd>
          </div>
          {/*
            "KATILAN" ARTIK YOKLAMADAN GELİYOR (12 Ağustos 2026). Sayı seçilmiş
            başvuruları sayıyordu; oysa seçilmek "katılabilir" demek. Raporun
            en çok okunan sayısının gerçekte gelmeyenleri de sayması, raporu
            yazan öğretmenin bildiği gerçekle çelişiyordu.
          */}
          <div>
            <dt className="text-sm text-metin-yumusak">Yoklamada gelen</dt>
            <dd className="mt-0.5 text-2xl font-bold text-baslik">
              {yoklama.gelen}
            </dd>
            <dd className="mt-0.5 text-sm text-metin-yumusak">
              {yoklama.isaretlenmeyen > 0
                ? `${yoklama.isaretlenmeyen} kişi işaretlenmedi`
                : yoklama.gelmeyen > 0
                  ? `${yoklama.gelmeyen} kişi gelmedi`
                  : "Yoklama tamam"}
            </dd>
          </div>
        </dl>

        <h3 className="mt-6 mb-2 text-sm font-semibold text-baslik">
          Seçilen katılımcılar
        </h3>
        {yoklama.isaretlenmeyen > 0 && yazabilir && (
          <p className="mb-2 text-sm text-uyari-metin">
            {yoklama.isaretlenmeyen} kişinin yoklaması alınmadı. Yoklama{" "}
            <Link
              href={`/panel/etkinlikler/${faaliyet.id}`}
              className="font-medium underline underline-offset-2"
            >
              etkinlik sayfasından
            </Link>{" "}
            işaretlenir; belge yalnızca &quot;geldi&quot; işaretlenenlere
            üretilebilir.
          </p>
        )}
        {basvurular.length === 0 ? (
          <p className="text-metin-yumusak">
            Bu etkinliğe seçilmiş katılımcı yok.
          </p>
        ) : (
          <ol className="divide-y divide-cizgi">
            {basvurular.map((basvuru, sira) => (
              <li key={basvuru.katilimciId} className="flex flex-wrap gap-2 py-2">
                <span className="w-6 text-sm text-metin-yumusak">
                  {sira + 1}.
                </span>
                <span className="font-medium text-metin">
                  {basvuru.katilimci.ad} {basvuru.katilimci.soyad}
                </span>
                <span className="text-sm text-metin-yumusak">
                  {basvuru.katilimci.sinif ?? basvuru.katilimci.brans ?? "—"}
                  {" · "}
                  {basvuru.katilimci.kurum?.ad ??
                    basvuru.katilimci.il?.ad ??
                    "—"}
                </span>
                <span
                  className={`text-sm font-medium ${
                    basvuru.katildiMi === true
                      ? "text-olumlu-metin"
                      : basvuru.katildiMi === false
                        ? "text-hata-metin"
                        : "text-metin-yumusak"
                  }`}
                >
                  {basvuru.katildiMi === true
                    ? "Geldi"
                    : basvuru.katildiMi === false
                      ? "Gelmedi"
                      : "Yoklama alınmadı"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Kart>

      <Kart>
        <KartBasligi
          baslik="Etkinlik görselleri"
          aciklama="Görseller etkinliğin ek listesinde tutulur; rapor onlara işaret eder."
          Ikon={ImagePlus}
        />
        {/*
          TOPLU İNDİRME (12 Ağustos 2026 · istek: "kaç görsel yüklendiyse
          onları toplu indirecek bir düğme lazım, sıkıştırıp hepsini indirmek
          mümkün olur mu"). Tek tek indirme yolu duruyor — görsele tıklamak
          onu açıyor; bu düğme hepsini tek zip yapıyor.
        */}
        {gorseller.length > 0 && (
          <a
            href={uygulamaYolu(`/panel/etkinlikler/${faaliyet.id}/gorseller`)}
            className={`${SINIF_IKINCIL_BUTON} mb-4`}
          >
            <Download size={16} aria-hidden />
            {gorseller.length} görseli zip olarak indir
          </a>
        )}

        {gorseller.length === 0 ? (
          <p className="text-metin-yumusak">
            Henüz görsel eklenmemiş. Aşağıdaki rapor formundan, raporla birlikte
            ekleyebilirsiniz.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-3">
            {gorseller.map((gorsel) => (
              <li key={gorsel.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uygulamaYolu(
                    `/panel/etkinlikler/${faaliyet.id}/ekler/${gorsel.id}`,
                  )}
                  alt={gorsel.dosyaAdi}
                  className="block max-h-40 w-full rounded-kart border border-cizgi bg-zemin object-contain"
                />
              </li>
            ))}
          </ul>
        )}
        {/*
          BAĞLANTI KALDI AMA İKİNCİL: görsel silmek, kapak seçmek ve PDF gibi
          görsel olmayan ek yüklemek hâlâ etkinlik ekranındaki ek kartının işi.
          Rapor yazarken en sık yapılan iş (fotoğraf eklemek) artık formun
          içinde; buradan çıkmak zorunda kalınan tek durum kalanlar.
        */}
        {yazabilir && (
          <p className="mt-4 text-sm text-metin-yumusak">
            Görsel silmek, kapak seçmek ya da PDF eklemek için{" "}
            <Link
              href={`/panel/etkinlikler/${faaliyet.id}#ekler`}
              className="font-medium text-vurgu-metin underline underline-offset-2"
            >
              etkinliğin ek listesine
            </Link>{" "}
            gidin. Oraya geçmeden önce yazdığınız raporu kaydedin.
          </p>
        )}
      </Kart>

      <Kart>
        <KartBasligi
          baslik="Rapor metni"
          aciklama={
            rapor
              ? `Son güncelleme: ${rapor.yazan.ad} ${rapor.yazan.soyad} · ${tarihSaatYaz(rapor.guncellemeTarihi)}`
              : "Etkinliğin nasıl geçtiğini kendi cümlelerinizle yazın."
          }
          Ikon={FileText}
        />

        {!yazabilir ? (
          rapor ? (
            <>
              <h3 className="mb-1 text-sm font-semibold text-baslik">
                {RAPOR_ALAN_ADLARI.degerlendirme}
              </h3>
              <p className="whitespace-pre-line text-metin">
                {rapor.degerlendirme}
              </p>
              {rapor.kazanimlar && (
                <>
                  <h3 className="mt-4 mb-1 text-sm font-semibold text-baslik">
                    {RAPOR_ALAN_ADLARI.kazanimlar}
                  </h3>
                  <p className="whitespace-pre-line text-metin">
                    {rapor.kazanimlar}
                  </p>
                </>
              )}
            </>
          ) : (
            <p className="text-metin-yumusak">Bu etkinliğin raporu henüz yazılmadı.</p>
          )
        ) : !hazir.olurMu ? (
          <BilgiKutusu cesit="uyari">{hazir.neden}</BilgiKutusu>
        ) : (
          /*
            encType VERİLMEZ (26 Ağustos 2026): dosya alanı formun içinde ve
            gönderimin çok parçalı olması gerekiyor ama bunu React kendisi
            ayarlıyor — sunucu eylemi kullanan formda encType'ı elle vermek
            "Cannot specify a encType or method for a form that specifies a
            function as the action" hatasını üretiyor ve sayfa açılmıyor.
            Aynı ders etkinlik oluşturma formunda da yazılı.
          */
          <form action={raporKaydetEylemi} className="space-y-4">
            <input type="hidden" name="faaliyetId" value={faaliyet.id} />
            <label className="block">
              <span className="text-sm font-medium text-metin">
                {RAPOR_ALAN_ADLARI.degerlendirme}
              </span>
              <textarea
                name="degerlendirme"
                required
                rows={8}
                maxLength={5000}
                defaultValue={rapor?.degerlendirme ?? ""}
                className={SINIF_GIRDI}
              />
              {/*
                Alan adı ne yazılacağını tek başına söylemiyor; ipucu satırı
                onu söylüyor. Alanın kendisi değişmedi, adı ve beklenen içeriği
                değişti (bkz. RAPOR_ALAN_ADLARI).
              */}
              <span className="mt-1 block text-sm text-metin-yumusak">
                Etkinliğin özet bilgisi: ne yapıldı, kimler katıldı, nasıl
                geçti.
              </span>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-metin">
                {RAPOR_ALAN_ADLARI.kazanimlar}{" "}
                <span className="text-metin-yumusak">(isteğe bağlı)</span>
              </span>
              <textarea
                name="kazanimlar"
                rows={5}
                maxLength={3000}
                defaultValue={rapor?.kazanimlar ?? ""}
                className={SINIF_GIRDI}
              />
              <span className="mt-1 block text-sm text-metin-yumusak">
                Sosyal medyada ya da haberde kullanılabilecek metin.
              </span>
            </label>

            {/*
              GÖRSEL ALANI RAPORLA AYNI FORMDA (12 Ağustos 2026). Dosyalar
              raporla birlikte gönderiliyor; ayrı bir yükleme düğmesi olsaydı
              sayfa yenilenir ve yazılan metin uçardı.
            */}
            <label className="block">
              <span className="text-sm font-medium text-metin">
                Etkinlik görselleri{" "}
                <span className="text-metin-yumusak">
                  (isteğe bağlı · birden fazla seçilebilir)
                </span>
              </span>
              <input
                type="file"
                name="gorseller"
                multiple
                accept={gorselKabulListesi}
                className={`${SINIF_GIRDI} file:mr-3 file:rounded-md file:border-0 file:bg-zemin file:px-3 file:py-1 file:text-sm file:text-metin`}
              />
              {/*
                ÇOKLU SEÇİM AÇIKÇA YAZILIYOR: `multiple` niteliği dosya seçme
                penceresinde çoklu seçime izin veriyor ama düğmenin üstünde
                "1 dosya seçildi" yazdığı için tek dosyalık sanılıyor. Ctrl/Shift
                ile seçim tarayıcının işi, bizim işimiz bunu söylemek.
              */}
              <span className="mt-1 block text-sm text-metin-yumusak">
                Dosya penceresinde Ctrl (Mac&apos;te Cmd) ya da Shift ile birden
                fazla görsel seçebilirsiniz. Raporla birlikte yüklenir ve
                etkinliğin ek listesine düşer. En fazla {gorselSinirMetni}{" "}
                boyutunda {gorselTurMetni} dosyalar kabul edilir. Etkinliğin
                tanıtıcı görseli yoksa ilk yüklenen görsel kapak olur.
              </span>
            </label>

            <button type="submit" className={SINIF_BIRINCIL_BUTON}>
              {rapor ? "Raporu güncelle" : "Raporu kaydet"}
            </button>
          </form>
        )}
      </Kart>

      <Kart>
        <KartBasligi
          baslik="Raporu indir"
          aciklama="Word biçimlendirilmiş belge, Excel ise CSV olarak açılır."
          Ikon={Download}
        />
        <div className="flex flex-wrap gap-2">
          <a
            href={uygulamaYolu(
              `/panel/etkinlikler/${faaliyet.id}/rapor/indir?bicim=word`,
            )}
            className={SINIF_IKINCIL_BUTON}
          >
            <FileText size={16} aria-hidden />
            Word (.doc)
          </a>
          <a
            href={uygulamaYolu(`/panel/etkinlikler/${faaliyet.id}/rapor/indir`)}
            className={SINIF_IKINCIL_BUTON}
          >
            <Download size={16} aria-hidden />
            Excel (.csv)
          </a>
        </div>
      </Kart>
    </div>
  );
}
