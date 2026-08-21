import {
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";
import Link from "next/link";
import { DisaAktarmaBagi } from "@/components/DisaAktarmaBagi";
import { RolEtiketi, RolsuzEtiketi } from "@/components/RolEtiketi";
import {
  Kart,
  KartBasligi,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
} from "@/components/ui";
import { YolIzi } from "@/components/YonetimKartlari";
import { envanterYolIzi } from "../envanter-yolu";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { gorevYillari, gorevYillariYaz } from "@/lib/ogretmen/gorev-yillari";
import {
  gorevYillariSecenekleri,
  okulTurleriGetir,
} from "@/lib/rapor/secenekler";
import {
  danismanMi,
  ilKoordinatoruMu,
  koordinatorIlKodu,
  ogretmenEnvanteriGorebilirMi,
  projeYoneticisiMi,
} from "@/lib/yetki/izinler";
import { ogretmenListeFiltresi } from "@/lib/yetki/kapsam";
import { erisimLoglaCoklu } from "@/lib/yetki/log";
import {
  sayiVeyaNull,
  type SorguParametreleri,
  sorguMetni,
  tekil,
} from "../ogrenciler/filtreler";
import {
  ogretmenFiltreleriniCoz,
  ogretmenFiltresiVarMi,
} from "./filtreler";

export const dynamic = "force-dynamic";

/**
 * Danışman öğretmen envanteri — analiz dokümanı Bölüm 2.
 *
 * Liste merkezi kapsam filtresinden geçer (ogretmenKapsamFiltresi): danışman
 * öğretmen kendi okulunu, il koordinatörü kendi ilini, YEĞİTEK tüm ülkeyi
 * görür. Ekrandaki filtreler yalnızca DARALTIR; adres çubuğuna yazılan bir il
 * kodu kapsamı genişletmez.
 *
 * "Görev aldığı eğitim-öğretim yılı(ları)" ayrı bir sütunda tutulmaz, rol
 * kayıtlarının tarihlerinden türetilir (bkz. src/lib/ogretmen/gorev-yillari.ts).
 */

const SINIF_ETIKET = "text-sm font-medium text-metin-yumusak";
const SINIF_SECIM =
  "mt-1 w-full rounded-md border border-cizgi bg-kart px-3 py-2 text-sm text-metin outline-none focus:border-vurgu";
const SINIF_SAYFA_BUTON =
  "inline-flex items-center gap-1 rounded-md border border-cizgi px-3 py-1.5 text-sm font-medium text-metin transition hover:bg-zemin";

const SAYFA_BOYUTU = 50;

function sayfaBaglantisi(
  parametreler: SorguParametreleri,
  sayfa: number,
): string {
  const sorgu = new URLSearchParams(sorguMetni(parametreler, ["sayfa"]));
  if (sayfa > 1) sorgu.set("sayfa", String(sayfa));
  const metin = sorgu.toString();
  return metin ? `/panel/ogretmenler?${metin}` : "/panel/ogretmenler";
}

export default async function OgretmenlerSayfasi({
  searchParams,
}: {
  searchParams: Promise<SorguParametreleri>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();

  if (!ogretmenEnvanteriGorebilirMi(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="Öğretmenler"
          aciklama="Bu ekrana erişim yetkiniz yok."
        />
      </Kart>
    );
  }

  const parametreler = await searchParams;
  const filtreler = ogretmenFiltreleriniCoz(parametreler);
  const filtreVar = ogretmenFiltresiVarMi(filtreler);

  const koordinatorIli = koordinatorIlKodu(kullanici);
  const seciliIl = filtreler.ilKodu ?? koordinatorIli;

  const [iller, ilceler, okullar, okulTurleri, gorevYiliSecenekleri] =
    await Promise.all([
      projeYoneticisiMi(kullanici)
        ? prisma.il.findMany({ orderBy: { ad: "asc" } })
        : koordinatorIli
          ? prisma.il.findMany({ where: { ilKodu: koordinatorIli } })
          : [],
      seciliIl
        ? prisma.ilce.findMany({
            where: { ilKodu: seciliIl },
            orderBy: { ad: "asc" },
          })
        : [],
      seciliIl
        ? prisma.kurum.findMany({
            where: { ilKodu: seciliIl, aktif: true },
            orderBy: { ad: "asc" },
            select: { kurumKodu: true, ad: true },
          })
        : [],
      okulTurleriGetir(seciliIl ?? null),
      gorevYillariSecenekleri(),
    ]);

  const nerede = ogretmenListeFiltresi(kullanici, filtreler);
  const toplam = await prisma.kullanici.count({ where: nerede });
  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA_BOYUTU));
  const istenenSayfa = sayiVeyaNull(tekil(parametreler.sayfa)) ?? 1;
  const sayfa = Math.min(Math.max(1, istenenSayfa), sonSayfa);

  const ogretmenler = await prisma.kullanici.findMany({
    where: nerede,
    skip: (sayfa - 1) * SAYFA_BOYUTU,
    take: SAYFA_BOYUTU,
    select: {
      id: true,
      ad: true,
      soyad: true,
      brans: true,
      kurum: { select: { ad: true, okulTuru: true } },
      il: { select: { ad: true } },
      ilce: { select: { ad: true } },
      // Görev yılları rol kayıtlarının tarihlerinden türetilir; bitmiş roller
      // de gerekli, o yüzden aktif filtresi YOK.
      roller: {
        select: {
          rolKodu: true,
          ilKodu: true,
          baslangicTarihi: true,
          bitisTarihi: true,
        },
      },
      _count: {
        select: {
          danismanAtamalari: { where: { bitisTarihi: null } },
          duzenledigiFaaliyetler: true,
        },
      },
    },
    orderBy: [{ ad: "asc" }, { soyad: "asc" }],
  });

  await erisimLoglaCoklu(
    ogretmenler.map((ogretmen) => ({
      kullaniciId: kullanici.id,
      islem: "GORUNTULEME" as const,
      hedefTip: "OGRETMEN" as const,
      hedefId: ogretmen.id,
      detay: "Öğretmen listesi görüntülendi",
    })),
  );

  const kapsamAciklamasi = projeYoneticisiMi(kullanici)
    ? "Tüm iller"
    : ilKoordinatoruMu(kullanici)
      ? "Kendi iliniz"
      : danismanMi(kullanici)
        ? "Kendi okulunuz"
        : "Kapsamınız dışında";

  const yerFiltresiVar = iller.length > 0 || okullar.length > 0;

  /*
   * YOL İZİ — bu ekranın panoya dönüş yolu (12 Ağustos 2026 · istek: "ilçeden
   * öğretmenlere geçince navigasyon kayboluyor, tarayıcının geri düğmesine
   * basmak gerekiyor"). Ayrıntı için bkz. yonetim-kurallari.ts · yonetimYolIzi.
   */
  const yolIziAdimlari = await envanterYolIzi(
    kullanici,
    "Öğretmenler",
    filtreler,
  );

  const disaAktarmaSorgusu = sorguMetni(parametreler, ["sayfa"]);
  const disaAktarmaBaglantisi = disaAktarmaSorgusu
    ? `/panel/ogretmenler/disa-aktar?${disaAktarmaSorgusu}`
    : "/panel/ogretmenler/disa-aktar";

  return (
    <div className="space-y-6">
      {yolIziAdimlari && <YolIzi adimlar={yolIziAdimlari} />}

      <SayfaBasligi
        /* Bu ekrana Yönetim Paneli'ndeki karttan geliniyor (21 Ağustos 2026 ·
           istek): geri bağlantısı da oraya döner, "Panel"e değil — Panel
           zaten sol menüde duruyor. */
        geri={{ yol: "/panel/yonetim", etiket: "Yönetim Paneli" }}
        baslik="Öğretmenler"
        aciklama={
          toplam > SAYFA_BOYUTU
            ? `Görüntüleme kapsamı: ${kapsamAciklamasi} · ${toplam} kayıt · sayfa ${sayfa}/${sonSayfa}`
            : `Görüntüleme kapsamı: ${kapsamAciklamasi} · ${toplam} kayıt`
        }
      />

      <form method="get" className="rounded-kart border border-cizgi bg-kart p-5 shadow-kart">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-baslik">
            <Filter size={16} className="text-vurgu-metin" aria-hidden />
            Filtreler
          </h2>
          {filtreVar && (
            <Link
              href="/panel/ogretmenler"
              className="inline-flex items-center gap-1 text-sm font-medium text-vurgu-metin"
            >
              <X size={14} aria-hidden />
              Filtreleri temizle
            </Link>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {yerFiltresiVar && (
            <>
              <label className="block">
                <span className={SINIF_ETIKET}>İl</span>
                <select
                  name="il"
                  defaultValue={filtreler.ilKodu ?? ""}
                  className={SINIF_SECIM}
                  disabled={iller.length <= 1}
                >
                  <option value="">
                    {iller.length <= 1 ? (iller[0]?.ad ?? "—") : "Tüm iller"}
                  </option>
                  {iller.map((il) => (
                    <option key={il.ilKodu} value={il.ilKodu}>
                      {il.ad}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={SINIF_ETIKET}>İlçe</span>
                <select
                  name="ilce"
                  defaultValue={filtreler.ilceKodu ?? ""}
                  className={SINIF_SECIM}
                  disabled={ilceler.length === 0}
                >
                  <option value="">
                    {ilceler.length === 0 ? "Önce il seçin" : "Tüm ilçeler"}
                  </option>
                  {ilceler.map((ilce) => (
                    <option key={ilce.ilceKodu} value={ilce.ilceKodu}>
                      {ilce.ad}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={SINIF_ETIKET}>Okul</span>
                <select
                  name="okul"
                  defaultValue={
                    filtreler.kurumKodu ? String(filtreler.kurumKodu) : ""
                  }
                  className={SINIF_SECIM}
                  disabled={okullar.length === 0}
                >
                  <option value="">
                    {okullar.length === 0 ? "Önce il seçin" : "Tüm okullar"}
                  </option>
                  {okullar.map((okul) => (
                    <option key={okul.kurumKodu} value={okul.kurumKodu}>
                      {okul.ad}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          <label className="block">
            <span className={SINIF_ETIKET}>Okul türü</span>
            <select
              name="okulTuru"
              defaultValue={filtreler.okulTuru ?? ""}
              className={SINIF_SECIM}
            >
              <option value="">Tüm okul türleri</option>
              {okulTurleri.map((tur) => (
                <option key={tur} value={tur}>
                  {tur}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={SINIF_ETIKET}>Branş</span>
            <input
              type="text"
              name="brans"
              placeholder="Bilişim Teknolojileri"
              defaultValue={filtreler.brans ?? ""}
              className={SINIF_SECIM}
            />
          </label>

          <label className="block">
            <span className={SINIF_ETIKET}>Görev aldığı yıl</span>
            <select
              name="yil"
              defaultValue={filtreler.gorevYili ?? ""}
              className={SINIF_SECIM}
            >
              <option value="">Tüm yıllar</option>
              {gorevYiliSecenekleri.map((yil) => (
                <option key={yil} value={yil}>
                  {yil}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={SINIF_ETIKET}>Ad veya soyad</span>
            <input
              type="text"
              name="ara"
              placeholder="Ara"
              defaultValue={filtreler.ara ?? ""}
              className={SINIF_SECIM}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-metin">
            <input
              type="checkbox"
              name="danisman"
              value="1"
              defaultChecked={filtreler.yalnizcaDanismanlar}
              className="h-4 w-4 rounded border-cizgi accent-[var(--renk-birincil)]"
            />
            Yalnızca danışman öğretmenler
          </label>
          <label className="flex items-center gap-2 text-sm text-metin">
            <input
              type="checkbox"
              name="gorevsiz"
              value="1"
              defaultChecked={filtreler.yalnizcaGorevsizler}
              className="h-4 w-4 rounded border-cizgi accent-[var(--renk-birincil)]"
            />
            Yalnızca görev almamışlar
          </label>
          <button type="submit" className={SINIF_BIRINCIL_BUTON}>
            Filtrele
          </button>
          {toplam > 0 && (
            <DisaAktarmaBagi yol={disaAktarmaBaglantisi} kayitSayisi={toplam} />
          )}
        </div>
      </form>

      {ogretmenler.length === 0 ? (
        <Kart className="text-metin-yumusak">
          {filtreVar
            ? "Bu filtrelerle eşleşen öğretmen yok."
            : "Kapsamınızda görüntülenecek öğretmen yok."}
        </Kart>
      ) : (
        <div className="overflow-x-auto rounded-kart border border-cizgi bg-kart shadow-kart">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-cizgi bg-zemin text-metin-yumusak">
              <tr>
                <th className="px-4 py-3 font-medium">Ad Soyad</th>
                <th className="px-4 py-3 font-medium">Branş</th>
                <th className="px-4 py-3 font-medium">Okul</th>
                <th className="px-4 py-3 font-medium">İl / İlçe</th>
                <th className="px-4 py-3 font-medium">Görev</th>
                <th className="px-4 py-3 font-medium">Görev yılları</th>
                <th className="px-4 py-3 font-medium">Öğrenci</th>
                <th className="px-4 py-3 font-medium">Etkinlik</th>
              </tr>
            </thead>
            <tbody>
              {ogretmenler.map((ogretmen) => {
                const aktifRoller = ogretmen.roller.filter(
                  (rol) => rol.bitisTarihi === null,
                );
                return (
                  <tr
                    key={ogretmen.id}
                    className="border-b border-cizgi last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-metin">
                      {/*
                       * Bağlantı kapsam kontrolü YERİNE geçmez: hedef sayfa
                       * aynı merkezi filtreden yeniden geçer ve kapsam dışı
                       * id'de 404 döner.
                       */}
                      <Link
                        href={`/panel/ogretmenler/${ogretmen.id}`}
                        className="transition hover:text-vurgu-metin hover:underline"
                      >
                        {ogretmen.ad} {ogretmen.soyad}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-metin-yumusak">
                      {ogretmen.brans ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-metin-yumusak">
                      {ogretmen.kurum?.ad ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-metin-yumusak">
                      {ogretmen.il?.ad ?? "—"}
                      {ogretmen.ilce?.ad ? ` / ${ogretmen.ilce.ad}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {aktifRoller.length === 0 ? (
                          <RolsuzEtiketi />
                        ) : (
                          aktifRoller.map((rol) => (
                            <RolEtiketi
                              key={`${rol.rolKodu}-${rol.baslangicTarihi.getTime()}`}
                              rolKodu={rol.rolKodu}
                              ekBilgi={rol.ilKodu}
                            />
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-metin-yumusak">
                      {gorevYillariYaz(gorevYillari(ogretmen.roller))}
                    </td>
                    <td className="px-4 py-3 text-metin-yumusak">
                      {ogretmen._count.danismanAtamalari}
                    </td>
                    <td className="px-4 py-3 text-metin-yumusak">
                      {ogretmen._count.duzenledigiFaaliyetler}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {sonSayfa > 1 && (
        <nav
          aria-label="Sayfalama"
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-sm text-metin-yumusak">
            {(sayfa - 1) * SAYFA_BOYUTU + 1}–
            {Math.min(sayfa * SAYFA_BOYUTU, toplam)} / {toplam} kayıt
          </p>
          <div className="flex items-center gap-2">
            {sayfa > 1 ? (
              <Link
                href={sayfaBaglantisi(parametreler, sayfa - 1)}
                className={SINIF_SAYFA_BUTON}
              >
                <ChevronLeft size={15} aria-hidden />
                Önceki
              </Link>
            ) : (
              <span className={`${SINIF_SAYFA_BUTON} opacity-40`}>
                <ChevronLeft size={15} aria-hidden />
                Önceki
              </span>
            )}
            <span className="text-sm text-metin-yumusak">
              Sayfa {sayfa} / {sonSayfa}
            </span>
            {sayfa < sonSayfa ? (
              <Link
                href={sayfaBaglantisi(parametreler, sayfa + 1)}
                className={SINIF_SAYFA_BUTON}
              >
                Sonraki
                <ChevronRight size={15} aria-hidden />
              </Link>
            ) : (
              <span className={`${SINIF_SAYFA_BUTON} opacity-40`}>
                Sonraki
                <ChevronRight size={15} aria-hidden />
              </span>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
