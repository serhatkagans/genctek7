import { School, Search } from "lucide-react";
import Link from "next/link";
import { DisaAktarmaBagi } from "@/components/DisaAktarmaBagi";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
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
import { listeBasilsinMi, okulSorgusu, okulSuzgeciniCoz } from "./filtreler";

export const dynamic = "force-dynamic";

const SAYFA_BOYUTU = 50;
const YOL = "/panel/okullar";

/**
 * OKULLAR EKRANI (15 Ağustos 2026).
 *
 * `manisa-farklari-plani.md` · Aşama 4. Bugüne kadar okul listesi yalnızca
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
  const listeVar = listeBasilsinMi(suzgec);
  const sayfaNo = Math.max(
    1,
    Number.parseInt((parametreler.sayfa as string) ?? "1", 10) || 1,
  );

  const [toplam, okullar, iller, ilceler, turler] = await Promise.all([
    listeVar ? prisma.kurum.count({ where: okulKosulu(suzgec) }) : 0,
    listeVar
      ? okulOzetleriniGetir({
          ...suzgec,
          atla: (sayfaNo - 1) * SAYFA_BOYUTU,
          al: SAYFA_BOYUTU,
        })
      : [],
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
      <SayfaBasligi
        /* Bu ekrana Yönetim Paneli'ndeki karttan geliniyor (21 Ağustos 2026 ·
           istek): geri bağlantısı da oraya döner, "Panel"e değil — Panel
           zaten sol menüde duruyor. */
        geri={{ yol: "/panel/yonetim", etiket: "Yönetim Paneli" }}
        baslik="Okullar"
        aciklama={
          merkezMi
            ? "Ülke genelindeki okullar — arayarak ya da il seçerek listeleyin"
            : "İlinizdeki okullar"
        }
      />

      {/*
        OKUL EKLEME YOK VE BU EKRANDA SÖYLENİYOR (Aşama 4d).

        Manisa panelinde "Yeni Okul Ekle" sekmesi var; bizde açılmayacak.
        `Kurum` kayıtları MEB kurum kodundan geliyor — elle açılan bir okul,
        gecelik senkron çalıştığında ya yinelenir ya da eşleşmeyen bir kayıt
        olarak kalır; şemadaki "salt okunur" ilkesiyle de çelişir.

        Kararın ekranda YAZILI olması, eksik bir okul gören kişinin "ekleme
        düğmesi nerede" diye aramasını engelliyor: cevap "yok" değil, "başka
        yerden düzeltilir".
      */}
      <BilgiKutusu cesit="bilgi">
        Okul kayıtları MEB kurum kodundan gelir ve buradan eklenip düzenlenmez.
        Eksik ya da hatalı bir okul, kaynak sistemden düzeltilir.
      </BilgiKutusu>

      <Kart>
        <KartBasligi baslik="Süzgeçler" Ikon={Search} />
        <form method="get" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="text-sm font-medium text-metin">
              Okul / ilçe / kurum kodu
            </span>
            <input
              type="search"
              name="ara"
              defaultValue={suzgec.ara ?? ""}
              placeholder="Örn. Şeyh İsa ya da 758715"
              className={SINIF_GIRDI}
            />
          </label>

          {merkezMi && (
            <label className="block">
              <span className="text-sm font-medium text-metin">İl</span>
              <select
                name="il"
                defaultValue={suzgec.ilKodu ?? ""}
                className={SINIF_GIRDI}
              >
                <option value="">İl seçin</option>
                {iller.map((il) => (
                  <option key={il.ilKodu} value={il.ilKodu}>
                    {il.ad}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="text-sm font-medium text-metin">İlçe</span>
            <select
              name="ilce"
              defaultValue={suzgec.ilceKodu ?? ""}
              className={SINIF_GIRDI}
              disabled={ilceler.length === 0}
            >
              <option value="">Tüm ilçeler</option>
              {ilceler.map((ilce) => (
                <option key={ilce.ilceKodu} value={ilce.ilceKodu}>
                  {ilce.ad}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-metin">Okul türü</span>
            <select
              name="okulTuru"
              defaultValue={suzgec.okulTuru ?? ""}
              className={SINIF_GIRDI}
            >
              <option value="">Tüm türler</option>
              {turler.map((tur) => (
                <option key={tur.okulTuru} value={tur.okulTuru}>
                  {tur.okulTuru}
                </option>
              ))}
            </select>
          </label>

          <div className="sm:col-span-2 lg:col-span-4">
            <button type="submit" className={SINIF_BIRINCIL_BUTON}>
              Ara
            </button>
          </div>
        </form>
      </Kart>

      {!listeVar ? (
        <Kart className="text-metin-yumusak">
          <KartBasligi baslik="Aramaya başlayın" Ikon={School} />
          <p>
            Ülke genelinde on binlerce okul kayıtlı; listenin tamamı tek sayfada
            gösterilmiyor. Bir il seçin ya da okul adı, ilçe adı veya kurum kodu
            yazarak arayın.
          </p>
        </Kart>
      ) : (
        <Kart>
          {/*
            EKİP SEKMELERİ (Aşama 5 ile açıldı). Manisa'daki "Ekip Tanımlanan /
            Tanımlanmayan" sekmelerinin karşılığı. Yalnızca AÇIK OKUL TAKIMLARI
            sayılıyor; çalışma grubu ve il ekibi bir okula bağlı değil.

            Sekmeler mevcut süzgeçleri koruyor: il seçip "ekip tanımlanmayan"a
            geçen kişi, o ilin listesinde kalmalı.
          */}
          <nav className="mb-5 flex flex-wrap gap-2" aria-label="Ekip durumu">
            {(
              [
                ["hepsi", "Tüm okullar"],
                ["ekipli", "Ekip tanımlanan"],
                ["ekipsiz", "Ekip tanımlanmayan"],
              ] as const
            ).map(([deger, etiket]) => (
              <Link
                key={deger}
                href={`${YOL}?${okulSorgusu({ ...suzgec, ekipDurumu: deger })}`}
                aria-current={
                  (suzgec.ekipDurumu ?? "hepsi") === deger ? "page" : undefined
                }
                className={
                  (suzgec.ekipDurumu ?? "hepsi") === deger
                    ? "rounded-kart bg-vurgu-zemin px-3 py-2 text-sm font-medium text-vurgu-metin"
                    : "rounded-kart border border-cizgi px-3 py-2 text-sm text-metin-yumusak"
                }
              >
                {etiket}
              </Link>
            ))}
          </nav>

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
                    <th className="py-2 pr-4 font-medium">Öğrenci</th>
                    <th className="py-2 font-medium">Ekip</th>
                  </tr>
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
                      <td className="py-2">
                        {okul.ekipSayisi > 0 ? (
                          `${okul.ekipSayisi} ekip`
                        ) : (
                          <span className="text-metin-yumusak">—</span>
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
      )}
    </div>
  );
}
