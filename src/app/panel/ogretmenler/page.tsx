import {
  ChevronLeft,
  ChevronRight,
  Filter,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { DisaAktarmaBagi } from "@/components/DisaAktarmaBagi";
import {
  Kart,
  KartBasligi,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
} from "@/components/ui";
import { YolIzi } from "@/components/YonetimKartlari";
import { envanterYolIzi } from "../envanter-yolu";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { okulTuruSecenekleri } from "@/lib/okul/turler";
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

/**
 * LİSTE SIRALAMASI (27 Ağustos 2026 · istek: "buraya filtreler sıralalar
 * eklensin, excel gibi sırala vs").
 *
 * SIRA VERİTABANINDA VERİLİYOR, ekranda değil: liste sayfalı (SAYFA_BOYUTU)
 * ve yalnızca o sayfanın 50 satırı çekiliyor. JS'te sıralansaydı yalnızca
 * görünen sayfa kendi içinde sıralanır, "Z'den A'ya" seçildiğinde birinci
 * sayfada yine A'lar dururdu.
 *
 * İKİNCİL ÖLÇÜT HER ZAMAN AD-SOYAD: aynı branştan ya da aynı okuldan onlarca
 * satır var ve eşitlerin sırası sabit olmazsa sayfa 2'ye geçince kayıtlar yer
 * değiştirir (aynı kişi iki kez görünebilir).
 *
 * BOŞ DEĞER: Postgres `NULL`ları varsayılan olarak sona koyar (`nulls: "last"`
 * ile açıkça yazılıyor) — branşı girilmemiş öğretmen, yön ne olursa olsun
 * listenin sonunda.
 */
const SIRALAMALAR = {
  "ad-az": "Ad soyad · A → Z",
  "ad-za": "Ad soyad · Z → A",
  "brans-az": "Branş · A → Z",
  "brans-za": "Branş · Z → A",
  "okul-az": "Okul · A → Z",
  "okul-za": "Okul · Z → A",
} as const;

type OgretmenSiralamasi = keyof typeof SIRALAMALAR;

function ogretmenSiralamasiCoz(deger: string | null): OgretmenSiralamasi {
  return deger !== null && deger in SIRALAMALAR
    ? (deger as OgretmenSiralamasi)
    : "ad-az";
}

function ogretmenSirasi(
  siralama: OgretmenSiralamasi,
): Prisma.KullaniciOrderByWithRelationInput[] {
  const yon = siralama.endsWith("-za") ? ("desc" as const) : ("asc" as const);
  const adSoyad = [{ ad: yon }, { soyad: yon }];

  if (siralama.startsWith("brans")) {
    return [{ brans: { sort: yon, nulls: "last" } }, { ad: "asc" }, { soyad: "asc" }];
  }
  if (siralama.startsWith("okul")) {
    return [
      { kurum: { ad: yon } },
      { ad: "asc" },
      { soyad: "asc" },
    ];
  }
  return adSoyad;
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

  const siralama = ogretmenSiralamasiCoz(tekil(parametreler.sirala));
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
      /*
        İLETİŞİM SÜTUNLARI (27 Ağustos 2026 · istek: "öğretmenin eposta adresi
        ve telefon sütunlarını ekle").

        Kaynak `OgretmenProfil` — kişinin KENDİ girdiği bilgi; e-Okul'dan
        gelmiyor ve gecelik senkronda üzerine yazılmıyor (bkz. schema.prisma).
        Profili hiç açılmamış öğretmende ikisi de boş kalır ve hücre "—" basar.
      */
      ogretmenProfil: {
        select: {
          eposta: true,
          telefon: true,
          /*
            YEĞİTEK OKUL SORUMLUSU İŞARETİ (27 Ağustos 2026 · istek: "bu kartı
            buradan kaldırıp … öğretmenler panelinin içine sütun olarak
            ekleyelim").

            İşaret bir ROL DEĞİL (bkz. permissions.md): hiçbir veri erişimi
            vermiyor, öğretmen kendisi koyuyor ve onay aranmıyor. Tek karşılığı
            merkezin listesinde görünmekti; artık öğretmenin kendi satırında.
          */
          yegitekOkulSorumlusu: true,
        },
      },
      il: { select: { ad: true } },
      ilce: { select: { ad: true } },
      /*
        ROL KAYITLARI ARTIK ÇEKİLMİYOR (27 Ağustos 2026): tek tüketicileri
        kalkan "Görev" ve "Görev yılları" sütunlarıydı. Görev yılı SÜZGECİ
        duruyor ve o `where` içinde çalışıyor (bkz. ogretmenListeFiltresi),
        satırların kendi rol kayıtlarını okumuyor.
      */
      _count: {
        select: {
          danismanAtamalari: { where: { bitisTarihi: null } },
          /*
            "ETKİNLİK" SÜTUNU KALDIRILDI (27 Ağustos 2026 · istek: "listeden
            etkinlik sütununu kaldıralım"). Sayının kaynağı olan
            `kazanimlar: { where: { tip: "GENCTEK_ETKINLIGI" } }` sayımı da
            birlikte gitti — bu listede başka tüketicisi yoktu.

            Bilgi kaybolmadı: öğretmenin kendi sayfasındaki Deneyimlerim şeridi
            aynı kayıtları tek tek listeliyor (bkz. ogretmenler/[id]).
          */
        },
      },
    },
    orderBy: ogretmenSirasi(siralama),
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
   * YOL İZİ — kırılımdan gelindiğinde basılır (12 Ağustos 2026 · istek:
   * "ilçeden öğretmenlere geçince navigasyon kayboluyor, tarayıcının geri
   * düğmesine basmak gerekiyor"). Düz listede `null` döner ve şerit hiç
   * çıkmaz; ne zaman çıktığı için bkz. app/panel/envanter-yolu.ts.
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
              {/* Seçenekler Okullar ekranıyla aynı kaynaktan — bkz. lib/okul/turler.ts. */}
              {okulTuruSecenekleri(okulTurleri).map((tur) => (
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

          {/*
            SIRALAMA SÜZGEÇ FORMUNUN İÇİNDE: ayrı bir denetim olsaydı sıralamayı
            değiştiren kişinin süzgeçleri sıfırlanırdı — form `method="get"` ve
            gönderdiği şey sayfanın tüm sorgu dizesi. Aynı çözüm rol
            envanterinde de var.
          */}
          <label className="block">
            <span className={SINIF_ETIKET}>Sırala</span>
            <select
              name="sirala"
              defaultValue={siralama}
              className={SINIF_SECIM}
            >
              {Object.entries(SIRALAMALAR).map(([deger, etiket]) => (
                <option key={deger} value={deger}>
                  {etiket}
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

        {/*
          "YALNIZCA DANIŞMAN ÖĞRETMENLER" VE "YALNIZCA GÖREV ALMAMIŞLAR"
          KUTULARI KALKTI (27 Ağustos 2026 · istek: "bunu yapınca … öğretmen
          sayfasındaki bu alana gerek kalmayacak").

          İkisi de aynı ayrımı soruyordu ve o ayrım kalktı: öğretmen ilk
          girişinde doğrudan danışman oluyor (bkz. lib/kullanici/sagla.ts),
          yani "görev almamış öğretmen" artık yalnızca okul bilgisi eksik olan
          kayıt demek — bir süzgeç değil, bir veri düzeltmesi.

          KURAL KATMANI DURUYOR (`yalnizcaDanismanlar`, `yalnizcaGorevsizler`):
          görevini BIRAKAN öğretmen hâlâ rolsüz kalabiliyor, yani soru tümüyle
          anlamsız değil. Kalkan yalnızca ekrandaki iki kutu.
        */}
        <div className="mt-4 flex flex-wrap items-center gap-4">
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
                {/*
                  "GÖREV" SÜTUNU YERİNE "OKUL TÜRÜ" (27 Ağustos 2026 · istek:
                  "bu sütunu kaldır · Görev · yerine okul türü sütunu ekle").

                  Görev sütunu rol rozetlerini basıyordu; aynı bilgi kişinin
                  kendi sayfasında ve sağ üstteki rozetlerde zaten var. Okul
                  türü ise bu listede hiç yoktu — "ilimde kaç imam hatip
                  lisesinde danışman var" sorusunun cevabı okunamıyordu.

                  "GÖREV YILLARI" SÜTUNU SİLİNDİ (aynı istek): rol kayıtlarının
                  tarihlerinden türetiliyordu ve satır başına birkaç yıl
                  basıyordu. Bilgi kaybolmadı — öğretmenin profilindeki katkı
                  kartında görev dönemleri yazıyor.
                */}
                <th className="px-4 py-3 font-medium">Okul türü</th>
                <th className="px-4 py-3 font-medium">Öğrenci</th>
                <th className="px-4 py-3 font-medium">Okul sorumlusu</th>
                <th className="px-4 py-3 font-medium">Telefon</th>
                <th className="px-4 py-3 font-medium">E-posta</th>
              </tr>
            </thead>
            <tbody>
              {ogretmenler.map((ogretmen) => {
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
                    <td className="px-4 py-3 text-metin-yumusak">
                      {ogretmen.kurum?.okulTuru ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-metin-yumusak">
                      {ogretmen._count.danismanAtamalari}
                    </td>
                    {/*
                      İLETİŞİM SÜTUNLARI TIKLANABİLİR: `tel:` ve `mailto:` —
                      rol envanterindeki koordinatör tablosuyla aynı biçim.
                    */}
                    {/*
                      İŞARET SÜTUNU: yalnızca işareti OLAN satırda bir şey
                      yazıyor. "Hayır" basılsaydı sütun, olmayan bir durumu 80
                      satır boyunca tekrarlardı — sorulan şey "kim sorumlu",
                      "kim değil" değil.
                    */}
                    <td className="px-4 py-3">
                      {ogretmen.ogretmenProfil?.yegitekOkulSorumlusu ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-olumlu-zemin px-2 py-0.5 text-xs font-medium text-olumlu-metin">
                          <ShieldCheck size={13} aria-hidden />
                          YEĞİTEK
                        </span>
                      ) : (
                        <span className="text-metin-yumusak">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {ogretmen.ogretmenProfil?.telefon ? (
                        <a
                          href={`tel:${ogretmen.ogretmenProfil.telefon}`}
                          className="text-vurgu-metin"
                        >
                          {ogretmen.ogretmenProfil.telefon}
                        </a>
                      ) : (
                        <span className="text-metin-yumusak">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {ogretmen.ogretmenProfil?.eposta ? (
                        <a
                          href={`mailto:${ogretmen.ogretmenProfil.eposta}`}
                          className="break-all text-vurgu-metin"
                        >
                          {ogretmen.ogretmenProfil.eposta}
                        </a>
                      ) : (
                        <span className="text-metin-yumusak">—</span>
                      )}
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
