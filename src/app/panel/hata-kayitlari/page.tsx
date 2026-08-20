import { Bug, ScrollText, Search } from "lucide-react";
import Link from "next/link";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  Rozet,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import {
  ayEtiketi,
  type GrupSiralamasi,
  type HataGrubu,
  type HataKaydi,
  hataGrupKodu,
  ilkAnlamliSatir,
  okunacakAylar,
  TUM_AYLAR,
} from "@/lib/hata-kurallar";
import { hataGunlukDizini, sonGunlukYazmaHatasi } from "@/lib/hata-kaydi";
import {
  hataAylariniGetir,
  hataKayitlariniGetir,
  hataOzetiGetir,
  KAYIT_UST_SINIRI,
  SAYFA_BOYUTU,
} from "@/lib/hata-okuma";
import { tarihSaatYaz } from "@/lib/tarih";
import { hataKayitlariniGorebilirMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import { tekil } from "../ogrenciler/filtreler";

export const dynamic = "force-dynamic";

/**
 * HATA KAYITLARI (18 Ağustos 2026).
 *
 * ---------------------------------------------------------------------------
 * NİYE VAR
 * ---------------------------------------------------------------------------
 * Beklenmeyen bir hatada kullanıcı ekranda yalnızca bir numara görüyor:
 * "Hata kimliği: 598556021" (bkz. app/error.tsx). O numaranın karşılığı
 * `depolama/hata-gunlugu/` altındaki aylık dosyalara yazılıyor
 * (bkz. lib/hata-kaydi.ts) ama bugüne kadar okunmasının TEK yolu sunucuda
 * `npm run hata:ara` çalıştırmaktı.
 *
 * Bu ekranı gerektiren şey şu: numarayı bildiren kişi ile sunucuya erişebilen
 * kişi aynı kişi değil. Proje yöneticisi kullanıcıdan numarayı alıyor, elinde
 * ise bakabileceği hiçbir yer yok - kayıt tutuluyor ama okunamıyor.
 *
 * ---------------------------------------------------------------------------
 * İKİ GÖRÜNÜM, TEK EKRAN
 * ---------------------------------------------------------------------------
 *   · SÜZGEÇ BOŞSA ÖZET: kayıtlar hataya göre gruplanır - hangi hata, kaç kez,
 *     en son ne zaman, hangi adreslerde. "Şu an ne bozuk" sorusunun cevabı.
 *   · KİMLİK YA DA GRUP SEÇİLİYSE AYRINTI: kayıtlar yığın izleriyle. Elinde
 *     numara olan kişinin ihtiyacı bu.
 *
 * Görünüm ayrı bir düğmeye bağlanmadı; kimlik alanının dolu olması zaten "tek
 * bir hataya bakıyorum" demek.
 *
 * ÖZET KİMLİĞE GÖRE GRUPLANMAZ, bu ayrım ekranın işleyişini belirliyor: aynı
 * hata her oluşunda YENİ bir kimlik alıyor (gerçek günlükte tek bir hata 345
 * farklı kimlik altında 794 kez yazılmıştı). Gruplama bu yüzden hata adı ve
 * mesajın ilk satırı üzerinden - gerekçesi lib/hata-kurallar.ts'te.
 *
 * ---------------------------------------------------------------------------
 * DIŞA AKTARMA YOK
 * ---------------------------------------------------------------------------
 * Panelin diğer listelerinde duran Excel/CSV düğmesi burada bilinçli olarak
 * yok: çıktı, sunucunun iç yapısını (dosya yolları, sorgu parçaları, sürüm
 * bilgisi) taşıyan bir dosya olurdu ve o dosya panelin dışına çıkardı. Tek bir
 * yığın izi gerektiğinde ekrandan kopyalanabiliyor.
 */
export default async function HataKayitlariSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametreler = await searchParams;
  const kullanici = await oturumKullanicisiZorunlu();

  /*
   * Yetkisize 404 değil, açıklama basılıyor: Erişim Kayıtları ekranıyla aynı
   * davranış (bkz. erisim-loglari/page.tsx). İkisi de Yönetim Paneli'nden
   * girilen merkez ekranları ve adresleri paylaşılıyor; "yok" demek, yetkisi
   * olmayan kişiye bozuk bir bağlantı vermiş gibi görünürdü.
   */
  if (!hataKayitlariniGorebilirMi(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="Hata kayıtları"
          aciklama="Bu ekran yalnızca proje yöneticisine açıktır."
        />
      </Kart>
    );
  }

  const kimlik = tekil(parametreler.kimlik);
  const grup = tekil(parametreler.grup);
  const ara = tekil(parametreler.ara);
  const ayParametresi = tekil(parametreler.ay);
  const siralama: GrupSiralamasi =
    tekil(parametreler.sirala) === "adet" ? "adet" : "son";
  const istenenSayfa = Number.parseInt(tekil(parametreler.sayfa) ?? "1", 10);
  const sayfa = Number.isFinite(istenenSayfa) ? Math.max(istenenSayfa, 1) : 1;

  const { aylar, dizinVarMi } = await hataAylariniGetir();
  /*
   * Dizin yolu EKRANDA yazıyor: sorunun büyük çoğunluğu "yazılan yer ile
   * okunan yer aynı mı" sorusunda düğümleniyor ve yöneticinin sunucuya girip
   * yolu tahmin etmesi gerekiyordu. Yol bir sunucu iç bilgisi ama bu ekran
   * zaten yığın izleri gösteriyor ve yalnızca proje yöneticisine açık.
   */
  const gunlukDizini = hataGunlukDizini();
  const yazmaHatasi = sonGunlukYazmaHatasi();
  const ayrintiMi = Boolean(kimlik || grup);
  /*
   * Ay genişlemesi YALNIZCA kimlik aramasına bağlı, gruba değil: grup kodu
   * zaten bir ay listesine bakılırken alınıyor ve o ayda kalmalı. Kimlikle
   * gelen kişi ise numaranın hangi ayda oluştuğunu bilemez.
   */
  const aySecimi = okunacakAylar({
    ay: ayParametresi,
    kimlikAramasiMi: Boolean(kimlik),
    tumAylar: aylar,
  });

  const filtre = { kimlik, grup, ara };
  const [ozet, ayrinti] = await Promise.all([
    ayrintiMi
      ? null
      : hataOzetiGetir({ aylar: aySecimi.aylar, filtre, siralama }),
    ayrintiMi ? hataKayitlariniGetir({ aylar: aySecimi.aylar, filtre }) : null,
  ]);

  /*
   * EKRANIN KENDİSİ DE KAYDA GEÇER - Erişim Kayıtları ekranındaki "denetçi
   * denetimsiz kalmaz" ilkesinin aynısı. Günlükte kişisel veri yok ama yığın
   * izleri sunucunun içini gösteriyor; kimin baktığı da bir denetim bilgisi.
   */
  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "GORUNTULEME",
    hedefTip: "HATA_KAYDI",
    hedefId: kimlik ?? grup ?? "liste",
    detay: ayrintiMi
      ? `Hata kaydı arandı (${kimlik ? `kimlik ${kimlik}` : `grup ${grup}`}): ${ayrinti?.toplam ?? 0} kayıt`
      : `Hata özeti görüntülendi (${ozet?.gruplar.length ?? 0} hata, ${ozet?.toplamKayit ?? 0} kayıt)`,
  });

  /** Süzgeçleri koruyan sorgu dizesi; sayfa numarası isteğe bağlı. */
  const suzgecSorgusu = (yeniSayfa?: number) => {
    const parcalar = new URLSearchParams();
    if (kimlik) parcalar.set("kimlik", kimlik);
    if (grup) parcalar.set("grup", grup);
    if (ara) parcalar.set("ara", ara);
    if (ayParametresi) parcalar.set("ay", ayParametresi);
    if (siralama !== "son") parcalar.set("sirala", siralama);
    if (yeniSayfa !== undefined && yeniSayfa > 1) {
      parcalar.set("sayfa", String(yeniSayfa));
    }
    return parcalar.toString();
  };

  const sayfaYolu = (yeniSayfa: number) => {
    const sorgu = suzgecSorgusu(yeniSayfa);
    return sorgu ? `/panel/hata-kayitlari?${sorgu}` : "/panel/hata-kayitlari";
  };

  const toplamOge = ayrintiMi
    ? (ayrinti?.kayitlar.length ?? 0)
    : (ozet?.gruplar.length ?? 0);
  const sonSayfa = Math.max(Math.ceil(toplamOge / SAYFA_BOYUTU), 1);
  const gecerliSayfa = Math.min(sayfa, sonSayfa);
  const basla = (gecerliSayfa - 1) * SAYFA_BOYUTU;

  const gruplar = ozet?.gruplar.slice(basla, basla + SAYFA_BOYUTU) ?? [];
  const kayitlar = ayrinti?.kayitlar.slice(basla, basla + SAYFA_BOYUTU) ?? [];
  const suzgecVar = Boolean(kimlik || grup || ara || ayParametresi);

  /*
   * KİMLİKTEN HATANIN TAMAMINA GEÇİŞ. Kullanıcının bildirdiği numara tek bir
   * OLAYA işaret ediyor; yöneticinin bir sonraki sorusu ise hemen her zaman
   * "bu kaç kişinin başına geldi" oluyor. Grup kodu bulunan kayıttan
   * hesaplanıyor, ayrıca bir arama gerekmiyor.
   */
  const ilkKayit = ayrinti?.kayitlar[0] ?? null;
  const grubaGitYolu =
    kimlik && ilkKayit
      ? `/panel/hata-kayitlari?${new URLSearchParams({
          grup: hataGrupKodu(ilkKayit),
          ...(ayParametresi ? { ay: ayParametresi } : {}),
        }).toString()}`
      : null;

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Hata kayıtları"
        aciklama="Kullanıcının ekranda gördüğü hata kimliğinin karşılığı: hangi adres, hangi hata, ne zaman. Kimliği yazın, kaydın tamamı yığın iziyle açılsın."
        rozet={
          <Rozet cesit="vurgu" Ikon={ScrollText}>
            {aySecimi.secilen ? ayEtiketi(aySecimi.secilen) : "Tüm aylar"}
          </Rozet>
        }
      />

      <BilgiKutusu cesit="bilgi">
        Günlüğe kişisel veri yazılmaz: form içerikleri, oturum bilgisi ve
        kullanıcı adı kaydedilmez. Kayıtlar aya göre dosyalanır, bu ekrandan
        silinemez ve değiştirilemez.
      </BilgiKutusu>

      {/*
        YAZILAMIYORSA EKRAN BUNU SÖYLER (21 Ağustos 2026 · istek: "arada hata
        veriyor ancak hata kayıtlarına nedeni işlenmiyor").

        `hataKaydet` yazma hatasını yutuyor ve yutmalı da — asıl hatanın üstüne
        ikinci bir hata koyamaz. Bedeli, arızanın SESSİZ olmasıydı: dizin izinli
        değilse (üretimde standalone çıkışının çalışma dizini yüzünden yaşandı,
        bkz. lib/hata-kaydi.ts · depolamaKoku) ekran boş liste gösteriyor,
        yönetici de "hiç hata olmamış" diye okuyordu. Uyarı, boş listenin iki
        anlamını birbirinden ayırıyor.
      */}
      {yazmaHatasi && (
        <BilgiKutusu cesit="hata">
          Hatalar günlüğe YAZILAMIYOR; bu listede eksik kayıtlar var. Son deneme{" "}
          {tarihSaatYaz(new Date(yazmaHatasi.zaman))} tarihinde şu hatayla
          düştü: <code className="font-mono">{yazmaHatasi.mesaj}</code>. Günlük
          dizini: <code className="font-mono">{gunlukDizini}</code> — sunucuda
          bu dizinin var ve uygulamanın kullanıcısına yazılabilir olduğunu
          doğrulayın (bkz. DAGITIM.md · DEPOLAMA_YEREL_DIZIN).
        </BilgiKutusu>
      )}

      {!dizinVarMi || aylar.length === 0 ? (
        <Kart>
          <KartBasligi
            baslik="Kayıt yok"
            aciklama="Henüz hiçbir hata kaydedilmemiş."
            Ikon={Bug}
          />
          <p className="text-sm text-metin-yumusak">
            Günlük ilk hatada kendiliğinden açılır. Bu ekranın boş olması iyiye
            işarettir; kurulumla ilgili bir eksiklik değildir. Beklediğiniz bir
            hata görünmüyorsa günlük dizinine bakın:{" "}
            <code className="font-mono">{gunlukDizini}</code>
          </p>
        </Kart>
      ) : (
        <>
          <Kart>
            <KartBasligi baslik="Filtreler" Ikon={Search} />
            <form
              method="get"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <label className="block">
                <span className="text-sm font-medium text-metin">
                  Hata kimliği
                </span>
                <input
                  type="search"
                  name="kimlik"
                  defaultValue={kimlik ?? ""}
                  placeholder="Örn. 598556021"
                  className={SINIF_GIRDI}
                />
                {/*
                  Kimlik yazıldığında ay süzgeci kendiliğinden tüm aylara
                  genişliyor; kullanıcı numaranın hangi ayda oluştuğunu bilemez
                  (bkz. lib/hata-kurallar.ts · okunacakAylar). Bunun ekranda
                  yazması gerekiyor, yoksa seçtiği ayın yok sayıldığını sanır.
                */}
                <span className="mt-1 block text-xs text-metin-yumusak">
                  Kimlik yazılınca tüm aylar taranır.
                </span>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-metin">Metin</span>
                <input
                  type="search"
                  name="ara"
                  defaultValue={ara ?? ""}
                  placeholder="Mesaj, hata adı veya adres"
                  className={SINIF_GIRDI}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-metin">Ay</span>
                <select
                  name="ay"
                  defaultValue={ayParametresi ?? aySecimi.secilen ?? TUM_AYLAR}
                  className={SINIF_GIRDI}
                >
                  {aylar.map((ay) => (
                    <option key={ay} value={ay}>
                      {ayEtiketi(ay)}
                    </option>
                  ))}
                  <option value={TUM_AYLAR}>Tüm aylar</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-metin">Sıralama</span>
                <select
                  name="sirala"
                  defaultValue={siralama}
                  className={SINIF_GIRDI}
                >
                  <option value="son">Son görülme</option>
                  <option value="adet">Tekrar sayısı</option>
                </select>
                <span className="mt-1 block text-xs text-metin-yumusak">
                  Yalnızca özet listesinde.
                </span>
              </label>
              <div className="flex items-end gap-3 lg:col-span-4">
                <button type="submit" className={SINIF_BIRINCIL_BUTON}>
                  Filtrele
                </button>
                {suzgecVar && (
                  <Link
                    href="/panel/hata-kayitlari"
                    className="text-sm text-metin-yumusak underline underline-offset-2"
                  >
                    Filtreleri temizle
                  </Link>
                )}
              </div>
            </form>
          </Kart>

          {ayrintiMi ? (
            <AyrintiListesi
              kimlik={kimlik}
              kayitlar={kayitlar}
              toplam={ayrinti?.toplam ?? 0}
              kirpildiMi={ayrinti?.kirpildiMi ?? false}
              sayfa={gecerliSayfa}
              sonSayfa={sonSayfa}
              grubaGitYolu={grubaGitYolu}
            />
          ) : (
            <OzetListesi
              gruplar={gruplar}
              grupSayisi={ozet?.gruplar.length ?? 0}
              toplamKayit={ozet?.toplamKayit ?? 0}
              kirpildiMi={ozet?.kirpildiMi ?? false}
              sayfa={gecerliSayfa}
              sonSayfa={sonSayfa}
              suzgecVar={suzgecVar}
              ay={ayParametresi}
            />
          )}

          {sonSayfa > 1 && (
            <div className="flex items-center gap-3 text-sm">
              {gecerliSayfa > 1 && (
                <Link
                  href={sayfaYolu(gecerliSayfa - 1)}
                  className="rounded-md border border-cizgi px-3 py-1.5 text-metin transition hover:bg-zemin"
                >
                  Önceki
                </Link>
              )}
              {gecerliSayfa < sonSayfa && (
                <Link
                  href={sayfaYolu(gecerliSayfa + 1)}
                  className="rounded-md border border-cizgi px-3 py-1.5 text-metin transition hover:bg-zemin"
                >
                  Sonraki
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Özet satırından o hatanın kayıtlarına giden bağlantı. */
function grupYolu(grup: HataGrubu, ay: string | null): string {
  const parcalar = new URLSearchParams({ grup: grup.kod });
  if (ay) parcalar.set("ay", ay);
  return `/panel/hata-kayitlari?${parcalar.toString()}`;
}

function OzetListesi({
  gruplar,
  grupSayisi,
  toplamKayit,
  kirpildiMi,
  sayfa,
  sonSayfa,
  suzgecVar,
  ay,
}: {
  gruplar: HataGrubu[];
  grupSayisi: number;
  toplamKayit: number;
  kirpildiMi: boolean;
  sayfa: number;
  sonSayfa: number;
  suzgecVar: boolean;
  ay: string | null;
}) {
  return (
    <Kart>
      <KartBasligi
        baslik="Hata özeti"
        aciklama={`${grupSayisi} farklı hata · ${toplamKayit} kayıt · sayfa ${sayfa} / ${sonSayfa}`}
        Ikon={Bug}
      />

      {/*
        Kimlik sütunu YOK ve bunun söylenmesi gerekiyor: yönetici, kullanıcının
        bildirdiği numarayı bu listede aramaya kalkarsa bulamaz. Numara olayın
        kimliği, satır ise hatanın kendisi.
      */}
      <BilgiKutusu cesit="bilgi" className="mb-4">
        Aynı hata her oluşunda ayrı bir kimlik alır; bu liste kimliğe göre değil
        hatanın kendisine göre gruplanır. Elinizde bir kimlik varsa yukarıdaki
        alana yazın.
      </BilgiKutusu>

      {kirpildiMi && (
        <BilgiKutusu cesit="uyari" className="mb-4">
          Farklı hata sayısı üst sınırı aştı; listede en erken görülenler var. Ay
          süzgeciyle daraltın.
        </BilgiKutusu>
      )}

      {gruplar.length === 0 ? (
        <BosSonuc suzgecVar={suzgecVar} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-cizgi text-metin-yumusak">
              <tr>
                <th className="py-2 pr-4 font-medium">Son görülme</th>
                <th className="py-2 pr-4 font-medium">Hata</th>
                <th className="py-2 pr-4 font-medium">Adres</th>
                <th className="py-2 pr-4 font-medium">Tekrar</th>
                <th className="py-2 font-medium">
                  <span className="sr-only">Kayıtlar</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {gruplar.map((grup) => (
                <tr key={grup.kod} className="border-b border-cizgi/60">
                  <td className="py-2 pr-4 whitespace-nowrap text-metin-yumusak">
                    {tarihSaatYaz(new Date(grup.sonZaman))}
                  </td>
                  <td className="max-w-[52ch] py-2 pr-4 text-metin">
                    <span className="font-medium">{grup.ad}</span>
                    {/*
                      KOD, ADIN HEMEN YANINDA (21 Ağustos 2026): Prisma
                      hatalarında nedeni söyleyen tek alan bu (`P1001`
                      veritabanına ulaşılamıyor, `P2024` havuz doldu). Mesaj
                      yalnızca hangi sorgunun patladığını yazıyor.
                    */}
                    {grup.hataKodu && (
                      <span className="ml-2 font-mono text-xs text-metin-yumusak">
                        {grup.hataKodu}
                      </span>
                    )}
                    {/*
                      İSTEMCİ ETİKETİ (21 Ağustos 2026): aynı cümleyle patlayan
                      tarayıcı ve sunucu hataları ayrı gruplar (bkz.
                      hata-kurallar.ts · hataOzetKimligi) ama satıra bakan kişi
                      hangisi olduğunu ancak yığın izini açınca anlardı. Sunucu
                      kaydı etiketsiz: günlüğün olağan hâli o.
                    */}
                    {grup.kaynak === "istemci" && (
                      <span className="ml-2 rounded-full bg-uyari-zemin px-2 py-0.5 text-xs font-semibold text-uyari-metin">
                        Tarayıcı
                      </span>
                    )}
                    {grup.baslik && (
                      <span className="block text-xs break-words text-metin-yumusak">
                        {grup.baslik}
                      </span>
                    )}
                  </td>
                  <td className="max-w-[22ch] py-2 pr-4 text-xs break-words text-metin-yumusak">
                    {grup.yollar.length === 0 ? "—" : grup.yollar.join(" · ")}
                    {grup.yolSayisi > grup.yollar.length && (
                      <span> +{grup.yolSayisi - grup.yollar.length}</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap text-metin">
                    {grup.adet}
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    <Link
                      href={grupYolu(grup, ay)}
                      className="text-sm font-medium text-vurgu-metin underline underline-offset-2"
                    >
                      Kayıtlar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Kart>
  );
}

function AyrintiListesi({
  kimlik,
  kayitlar,
  toplam,
  kirpildiMi,
  sayfa,
  sonSayfa,
  grubaGitYolu,
}: {
  kimlik: string | null;
  kayitlar: HataKaydi[];
  toplam: number;
  kirpildiMi: boolean;
  sayfa: number;
  sonSayfa: number;
  grubaGitYolu: string | null;
}) {
  const ilk = kayitlar[0];
  const baslik = kimlik
    ? `Kimlik: ${kimlik}`
    : ilk
      ? `${ilk.ad}: ${ilkAnlamliSatir(ilk.mesaj, 80)}`
      : "Hata kayıtları";

  return (
    <Kart>
      <KartBasligi
        baslik={baslik}
        aciklama={`${toplam} kayıt · sayfa ${sayfa} / ${sonSayfa} · en yeni üstte`}
        Ikon={Bug}
      />

      {grubaGitYolu && (
        <p className="mb-4 text-sm">
          <Link
            href={grubaGitYolu}
            className="font-medium text-vurgu-metin underline underline-offset-2"
          >
            Bu hatanın tüm kayıtları
          </Link>
          <span className="text-metin-yumusak">
            {" "}
            — aynı hata her oluşunda ayrı bir kimlik alır.
          </span>
        </p>
      )}

      {kirpildiMi && (
        <BilgiKutusu cesit="bilgi" className="mb-4">
          Süzgece uyan {toplam} kayıt var; en yeni {KAYIT_UST_SINIRI} tanesi
          gösteriliyor. Aynı hatanın tekrarları birbirinin aynısıdır.
        </BilgiKutusu>
      )}

      {kayitlar.length === 0 ? (
        <BosSonuc suzgecVar />
      ) : (
        <ul className="space-y-4">
          {kayitlar.map((kayit, sira) => (
            <li
              key={`${kayit.zaman}-${sira}`}
              className="rounded-kutu border border-cizgi p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-metin">
                  {kayit.ad}
                  {kayit.kaynak === "istemci" && (
                    <span className="ml-2 rounded-full bg-uyari-zemin px-2 py-0.5 text-xs font-semibold text-uyari-metin">
                      Tarayıcı
                    </span>
                  )}
                </p>
                <p className="text-xs text-metin-yumusak">
                  {tarihSaatYaz(new Date(kayit.zaman))}
                </p>
              </div>

              <p className="mt-1 font-mono text-xs text-metin-yumusak">
                {kayit.kimlik} · {kayit.yontem ?? (kayit.kaynak === "istemci" ? "TARAYICI" : "—")}{" "}
                {kayit.yol ?? "—"}
                {kayit.kod && <> · kod {kayit.kod}</>}
              </p>

              {/*
                Mesaj `pre-wrap`: Prisma doğrulama hataları sorgu dökümünü
                girintileriyle basıyor ve tek satıra sıkıştırıldığında hangi
                alanın sorunlu olduğu okunmuyor.
              */}
              <pre className="mt-3 overflow-x-auto rounded-kutu bg-zemin p-3 text-xs whitespace-pre-wrap text-metin">
                {kayit.mesaj || "(mesaj yok)"}
              </pre>

              {kayit.yiginIzi && (
                /*
                  Yığın izi KAPALI başlıyor: tek bir iz 100 satırı geçebiliyor
                  ve sayfadaki 20 kaydın hepsi açık basılsaydı liste
                  taranamazdı. Açılıp kopyalanabilmesi yeterli.
                */
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-semibold text-vurgu-metin">
                    Yığın izi
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded-kutu bg-zemin p-3 text-xs whitespace-pre-wrap text-metin-yumusak">
                    {kayit.yiginIzi}
                  </pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </Kart>
  );
}

/**
 * Sonuç bulunamadığında basılan açıklama.
 *
 * Betiğin ("npm run hata:ara") kullanıcıya söylediği ipucu burada da yazıyor:
 * aranan kimlik günlük açılmadan önce oluşmuş olabilir ve o durumda arayan
 * kişinin bakacağı yer sunucunun terminal çıktısıdır. İpucu olmadan boş sonuç,
 * "kayıt tutulmuyor" gibi okunurdu.
 */
function BosSonuc({ suzgecVar }: { suzgecVar: boolean }) {
  return (
    <div className="space-y-2 text-sm text-metin-yumusak">
      <p>
        {suzgecVar
          ? "Bu süzgeçlerle kayıt bulunamadı."
          : "Seçili ayda kayıt yok."}
      </p>
      {suzgecVar && (
        <p>
          Aranan hata, günlük tutulmaya başlanmadan önce oluşmuş olabilir; o
          kayıtlar yalnızca sunucunun terminal çıktısındadır. Ay süzgecini
          &quot;Tüm aylar&quot; yapmayı da deneyin.
        </p>
      )}
    </div>
  );
}
