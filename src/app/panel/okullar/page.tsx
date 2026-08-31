import { School, Search } from "lucide-react";
import Link from "next/link";
import { DisaAktarmaBagi } from "@/components/DisaAktarmaBagi";
import {
  SutunMetinSuzgeci,
  SutunSecimSuzgeci,
  SutunSuzgecBoslugu,
  SutunSuzgecDugmesi,
  SutunSuzgecSatiri,
} from "@/components/SutunSuzgeci";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  KirintiYolu,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { okulOzetleriniGetir } from "@/lib/rapor/yonetim-ozeti";
import { okulKosulu } from "@/lib/rapor/yonetim-kurallari";
import {
  projeYoneticisiMi,
  yonetimPanosuGorebilirMi,
} from "@/lib/yetki/izinler";
import type { SorguParametreleri } from "../ogrenciler/filtreler";
import { okulTuruSecenekleri } from "@/lib/okul/turler";
import { okulSorgusu, okulSuzgeciniCoz } from "./filtreler";

export const dynamic = "force-dynamic";

const SAYFA_BOYUTU = 50;

/** Sütun süzgeçlerinin bağlandığı form; bkz. components/SutunSuzgeci.tsx. */
const SUZGEC_FORMU = "okul-suzgeci";
const YOL = "/panel/okullar";

/**
 * OKULLAR EKRANI (15 Ağustos 2026).
 *
 * Manisa farkları turu. Bugüne kadar okul listesi yalnızca
 * Yönetim Paneli'nin il → ilçe kırılımının son basamağındaydı; kurum kodu
 * görünmüyor, arama ve tür süzgeci yoktu.
 *
 * ============================================================================
 * KIRILIMIN RAKİBİ DEĞİL, DÜZ VE ARANABİLİR İKİZİ
 * ============================================================================
 * `yonetim/ilce/[ilceKodu]` ekranıyla AYNI sorguyu kullanıyor
 * (`okulOzetleriniGetir`). İki ayrı okul sorgusu yazılsaydı sayımlar er ya da
 * geç ayrışır ve iki ekran aynı okul için farklı öğrenci sayısı gösterirdi.
 * Kırılımdan gelen bağlantı da buraya `?ilce=` ile düşüyor.
 *
 * ============================================================================
 * ARAMA ÖNCE, LİSTE SONRA
 * ============================================================================
 * Merkez için süzgeçsiz açılışta liste BASILMAZ (gerekçe: filtreler.ts ·
 * listeBasilsinMi). Koordinatörde ili sabit olduğu için ekran doğrudan listeyle
 * açılır — yani koordinatör tam olarak Manisa'nın gördüğü ekranı görür.
 */
export default async function OkullarSayfasi({
  searchParams,
}: {
  searchParams: Promise<SorguParametreleri>;
}) {
  const parametreler = await searchParams;
  const kullanici = await oturumKullanicisiZorunlu();

  if (!yonetimPanosuGorebilirMi(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="Okullar"
          aciklama="Bu ekran merkez ve il koordinatörlerine açıktır."
        />
      </Kart>
    );
  }

  const merkezMi = projeYoneticisiMi(kullanici);
  const suzgec = okulSuzgeciniCoz(kullanici, parametreler);
  const sayfaNo = Math.max(
    1,
    Number.parseInt((parametreler.sayfa as string) ?? "1", 10) || 1,
  );

  const [toplam, okullar, iller, ilceler, turler] = await Promise.all([
    /* Liste her zaman basılıyor (bkz. filtreler.ts · kalkan "Aramaya başlayın"
       kapısı); süzgeçsiz açılışın maliyeti bir sayım ile 50 satır. */
    prisma.kurum.count({ where: okulKosulu(suzgec) }),
    okulOzetleriniGetir({
      ...suzgec,
      atla: (sayfaNo - 1) * SAYFA_BOYUTU,
      al: SAYFA_BOYUTU,
    }),
    merkezMi
      ? prisma.il.findMany({
          orderBy: { ad: "asc" },
          select: { ilKodu: true, ad: true },
        })
      : Promise.resolve([]),
    suzgec.ilKodu
      ? prisma.ilce.findMany({
          where: { ilKodu: suzgec.ilKodu },
          orderBy: { ad: "asc" },
          select: { ilceKodu: true, ad: true },
        })
      : Promise.resolve([]),
    /*
     * Tür listesi VERİDEN geliyor: tür alanı e-Okul'dan serbest metin olarak
     * gelir ve elle yazılmış bir liste, yeni bir tür eklendiğinde onu süzgeçte
     * görünmez kılardı. İl seçiliyse yalnızca o ilin türleri teklif edilir —
     * ülke genelindeki 40 türün çoğu tek bir ilde hiç yok.
     */
    prisma.kurum.findMany({
      where: {
        aktif: true,
        ...(suzgec.ilKodu ? { ilKodu: suzgec.ilKodu } : {}),
      },
      distinct: ["okulTuru"],
      orderBy: { okulTuru: "asc" },
      select: { okulTuru: true },
    }),
  ]);

  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA_BOYUTU));

  return (
    <div className="space-y-6">
      {/*
        KIRINTI YOLU (29 Ağustos 2026 · istekler: "navigasyon bunu göstersin
        yönetim paneli / rol envanteri şeklinde" · "yönetim panelindeki tüm
        kartlara uygula").

        Yerinde tek başına "← Yönetim Paneli" bağlantısı vardı: dönülecek
        yeri söylüyor, bulunulan yeri söylemiyordu. Şerit ikisini birden
        basıyor ve panodan açılan HER ekranda aynı biçimde duruyor.

        SON BASAMAK BAĞLANTI DEĞİL (bkz. components/ui.tsx · KirintiYolu);
        SayfaBasligi'nın geri bağlantısı bu yüzden `null` — ikisi bir arada
        aynı yolu üst üste iki kez basardı.
      */}
      <KirintiYolu
        basamaklar={[
          { etiket: "Yönetim Paneli", yol: "/panel/yonetim" },
          { etiket: "Okullar" },
        ]}
      />

      <SayfaBasligi
        geri={null}
        baslik="Okullar"
        /*
          MERKEZİN AÇIKLAMA CÜMLESİ KALKTI (27 Ağustos 2026 · istek: "bunları
          sil"). Cümle zaten kalkan kapıyı tarif ediyordu ("arayarak ya da il
          seçerek listeleyin"); liste artık süzgeçsiz de basılıyor, yani
          yönergenin kendisi yanlış hâle gelmişti.
        */
        aciklama={merkezMi ? undefined : "İlinizdeki okullar"}
      />

      {/*
        "OKUL EKLENMEZ" BİLGİ KUTUSU KALKTI (27 Ağustos 2026 · istek: "bunları
        sil").

        KARARIN KENDİSİ DEĞİŞMEDİ: `Kurum` kayıtları MEB kurum kodundan gelir,
        elle açılan bir okul gecelik senkronda ya yinelenir ya eşleşmeyen bir
        kayıt olarak kalır — bu ekranda hâlâ ekleme/düzenleme düğmesi yok.
        Kalkan yalnızca her açılışta okunan uyarı metni.
      */}
      <Kart>
        {/* "Süzgeçler" → "Filtreler" (26 Ağustos 2026 · istek). */}
        <KartBasligi baslik="Filtreler" Ikon={Search} />
        {/*
          İL, İLÇE VE OKUL TÜRÜ SÜZGEÇLERİ SÜTUN BAŞLIKLARINA TAŞINDI
          (31 Ağustos 2026 · istek: "alt taraftaki İl / İlçe / Okul / Tür /
          Kurum kodu alanları filtreli olsun"), yanlarına iki yeni sütun
          süzgeci eklendi (okul adı, kurum kodu).

          KARTTAN SİLİNDİLER, KOPYALANMADILAR: aynı `name` iki denetimde
          bulunsaydı form ikisini de gönderir ve sütundaki kutuya yazan kişi
          karttaki boş kutunun kazandığını görürdü (gerekçenin tamamı
          components/SutunSuzgeci.tsx içinde).

          KARTTA YALNIZCA SÜTUNU OLMAYAN SÜZGEÇ KALIYOR: "Danışman öğretmen"
          bir sütunu süzmüyor, satırın TÜMÜNÜ süzüyor (danışmanlı/danışmansız
          okullar) — Danışman sütununun altına konsaydı sayı süzgeci sanılırdı.

          GENEL "ara" KUTUSU DA KALKTI: üç şeye birden bakıyordu (okul adı,
          ilçe adı, kurum kodu) ve üçünün de artık kendi sütunu var. Bir arama
          kutusu ile üç sütun süzgecini yan yana tutmak, aynı soruyu iki farklı
          yerden sormak olurdu. Parametre kural katmanında DURUYOR (`ara`):
          dışa aktarma yolu ve eski yer imleri onu göndermeye devam edebilir.
        */}
        <form
          id={SUZGEC_FORMU}
          method="get"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >

          {/*
            DANIŞMAN SÜZGECİ (27 Ağustos 2026 · istek: "filtreye danışmanlı
            okullar danışmansız okullar sütunu ekle").

            "Danışman" tanımı tablodaki Danışman sütununun saydığı kümenin
            aynısı (bkz. yonetim-kurallari.ts · okulKosulu); süzgeç ile sütun
            ayrı yazılsaydı "danışmansız" listesinde sayısı 1 olan bir satır
            çıkabilirdi.

            Sekme değil AÇILIR LİSTE: aynı ekranda iki farklı süzgeç yüzeyi
            (üstte form, altta sekme şeridi) taşımaktansa hepsi tek formda —
            kalkan ekip sekmelerinin yerine de bu geldi.
          */}
          <label className="block">
            <span className="text-sm font-medium text-metin">
              Danışman öğretmen
            </span>
            <select
              name="danisman"
              defaultValue={suzgec.danismanDurumu ?? "hepsi"}
              className={SINIF_GIRDI}
            >
              <option value="hepsi">Tüm okullar</option>
              <option value="danismanli">Danışmanlı okullar</option>
              <option value="danismansiz">Danışmansız okullar</option>
            </select>
          </label>

          <div className="sm:col-span-2 lg:col-span-4">
            <button type="submit" className={SINIF_BIRINCIL_BUTON}>
              Ara
            </button>
          </div>
        </form>
      </Kart>

      <Kart>
        {/*
          EKİP SEKMELERİ KALKTI (27 Ağustos 2026 · istek: "bunları sil · Ekip
          tanımlanan / Ekip tanımlanmayan"). Yerine gelen danışman süzgeci
          yukarıdaki Filtreler formunun içinde — ekranın tek bir süzgeç yüzeyi
          olması, aynı soruyu iki farklı denetimle sormaktan iyi.

          "ARAMAYA BAŞLAYIN" BOŞ DURUM KARTI DA KALKTI: liste artık süzgeçsiz
          de basılıyor (bkz. filtreler.ts).
        */}
          <KartBasligi
            baslik="Okullar"
            aciklama={`${toplam} okul${toplam > SAYFA_BOYUTU ? ` · ${sayfaNo}. sayfa` : ""}`}
            Ikon={School}
          />

          {toplam > 0 && (
            <p className="mb-4">
              <DisaAktarmaBagi
                yol={`${YOL}/disa-aktar?${okulSorgusu(suzgec)}`}
                kayitSayisi={toplam}
              />
            </p>
          )}

          {okullar.length === 0 ? (
            <BilgiKutusu>Bu süzgeçlerle okul bulunamadı.</BilgiKutusu>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-cizgi text-metin-yumusak">
                  <tr>
                    <th className="py-2 pr-4 font-medium">İl</th>
                    <th className="py-2 pr-4 font-medium">İlçe</th>
                    <th className="py-2 pr-4 font-medium">Okul</th>
                    <th className="py-2 pr-4 font-medium">Tür</th>
                    <th className="py-2 pr-4 font-medium">Kurum kodu</th>
                    <th className="py-2 pr-4 font-medium">Öğretmen</th>
                    <th className="py-2 pr-4 font-medium">Danışman</th>
                    <th className="py-2 font-medium">Öğrenci</th>
                  </tr>

                  {/*
                    SÜZGEÇ SATIRI — başlıkların hemen altında, istekte sayılan
                    beş sütunda dolu: İl, İlçe, Okul, Tür, Kurum kodu. Sayım
                    sütunlarında (Öğretmen, Danışman, Öğrenci) süzgeç yok;
                    onları süzmek "kaçtan büyük" gibi bir karşılaştırma
                    gerektirirdi ve kimse istemedi. Son hücrede görünmeyen gönder
                    düğmesi duruyor (bkz. components/SutunSuzgeci.tsx): süzgeçler
                    kendiliğinden çalışıyor, düğme yalnızca JavaScript kapalıyken
                    Enter'ın çalışması için var.

                    İL HÜCRESİ YALNIZCA MERKEZDE DOLU: koordinatörün listesi
                    zaten kendi iliyle sınırlı (bkz. filtreler.ts ·
                    okulSuzgeciniCoz) ve süzgeç ona tek seçenekli bir kutu
                    gösterirdi.

                    İLÇE, İL SEÇİLMEDEN KAPALI: ilçe listesi ilden türüyor ve
                    boş bir açılır liste, seçenek yokmuş gibi değil bozukmuş
                    gibi okunurdu.
                  */}
                  <SutunSuzgecSatiri>
                    {merkezMi ? (
                      <SutunSecimSuzgeci
                        form={SUZGEC_FORMU}
                        ad="il"
                        deger={suzgec.ilKodu}
                        bosEtiket="Tüm iller"
                        etiket="İl"
                        secenekler={iller.map((il) => ({
                          deger: il.ilKodu,
                          etiket: il.ad,
                        }))}
                        className="py-2 pr-4"
                      />
                    ) : (
                      <SutunSuzgecBoslugu className="py-2 pr-4" />
                    )}
                    <SutunSecimSuzgeci
                      form={SUZGEC_FORMU}
                      ad="ilce"
                      deger={suzgec.ilceKodu}
                      bosEtiket="Tüm ilçeler"
                      etiket="İlçe"
                      devreDisi={ilceler.length === 0}
                      secenekler={ilceler.map((ilce) => ({
                        deger: ilce.ilceKodu,
                        etiket: ilce.ad,
                      }))}
                      className="py-2 pr-4"
                    />
                    <SutunMetinSuzgeci
                      form={SUZGEC_FORMU}
                      ad="okul"
                      deger={suzgec.okulAdi}
                      ipucu="Okul adı"
                      className="py-2 pr-4"
                    />
                    <SutunSecimSuzgeci
                      form={SUZGEC_FORMU}
                      ad="okulTuru"
                      deger={suzgec.okulTuru}
                      bosEtiket="Tüm türler"
                      etiket="Okul türü"
                      secenekler={okulTuruSecenekleri(
                        turler.map((tur) => tur.okulTuru),
                      )
                        .filter((tur) => tur !== "")
                        .map((tur) => ({ deger: tur, etiket: tur }))}
                      className="py-2 pr-4"
                    />
                    <SutunMetinSuzgeci
                      form={SUZGEC_FORMU}
                      ad="kurumKodu"
                      deger={suzgec.kurumKodu}
                      ipucu="Kurum kodu"
                      className="py-2 pr-4"
                    />
                    <SutunSuzgecDugmesi
                      form={SUZGEC_FORMU}
                      colSpan={3}
                      className="py-2 pr-4"
                    />
                  </SutunSuzgecSatiri>
                </thead>
                <tbody>
                  {okullar.map((okul) => (
                    <tr key={okul.kurumKodu} className="border-b border-cizgi">
                      <td className="py-2 pr-4">{okul.ilAdi}</td>
                      <td className="py-2 pr-4">{okul.ilceAdi}</td>
                      <td className="py-2 pr-4 font-medium text-metin">
                        {okul.ad}
                      </td>
                      <td className="py-2 pr-4 text-metin-yumusak">
                        {okul.okulTuru}
                      </td>
                      <td className="py-2 pr-4 text-metin-yumusak">
                        {okul.kurumKodu}
                      </td>
                      <td className="py-2 pr-4">{okul.ogretmenSayisi}</td>
                      {/*
                        Danışmanı olmayan okul, listenin aksiyon gerektiren
                        satırı: sıfır sessizce geçmesin diye vurgulanıyor.
                        Renk TEK BAŞINA bilgi taşımıyor, sayı zaten okunuyor.
                      */}
                      <td
                        className={`py-2 pr-4 ${
                          okul.danismanOgretmenSayisi === 0
                            ? "font-medium text-vurgu-metin"
                            : ""
                        }`}
                      >
                        {okul.danismanOgretmenSayisi}
                      </td>
                      <td className="py-2 pr-4">
                        {okul.ogrenciSayisi}
                        {okul.danismansizOgrenciSayisi > 0 && (
                          <span className="text-metin-yumusak">
                            {" "}
                            ({okul.danismansizOgrenciSayisi} danışmansız)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {sonSayfa > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-metin-yumusak">
              <span>
                {(sayfaNo - 1) * SAYFA_BOYUTU + 1}–
                {Math.min(sayfaNo * SAYFA_BOYUTU, toplam)} / {toplam} okul
              </span>
              <span className="flex gap-2">
                {sayfaNo > 1 && (
                  <Link
                    href={`${YOL}?${okulSorgusu(suzgec, { sayfa: sayfaNo - 1 })}`}
                    className="rounded-kart border border-cizgi px-3 py-1"
                  >
                    Önceki
                  </Link>
                )}
                {sayfaNo < sonSayfa && (
                  <Link
                    href={`${YOL}?${okulSorgusu(suzgec, { sayfa: sayfaNo + 1 })}`}
                    className="rounded-kart border border-cizgi px-3 py-1"
                  >
                    Sonraki
                  </Link>
                )}
              </span>
            </div>
          )}
      </Kart>
    </div>
  );
}
