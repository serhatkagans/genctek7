import { BadgeCheck, Filter, ShieldQuestion, UserCog, X } from "lucide-react";
import Link from "next/link";
import { DisaAktarmaBagi } from "@/components/DisaAktarmaBagi";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import type { Prisma } from "@/generated/prisma/client";
import type { GorevRolKodu } from "@/generated/prisma/enums";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { GOREV_ROL_ETIKETLERI } from "@/lib/yetki/etiketler";
import {
  ilceTemsilcisiAtayabilirMi,
  calismaGrubuYoneticisiAtayabilirMi,
  ilTemsilcisiAtayabilirMi,
  koordinatorIlKodu,
  okulTemsilcisiAtayabilirMi,
  projeYoneticisiMi,
} from "@/lib/yetki/izinler";
import { ogrenciListeFiltresi } from "@/lib/yetki/kapsam";
import {
  ogrenciFiltreleriniCoz,
  SINIF_SECENEKLERI,
  type SorguParametreleri,
  sorguMetni,
  tekil,
} from "../ogrenciler/filtreler";
import { gorevRoluAtaEylemi, gorevRoluKaldirEylemi } from "./eylemler";

export const dynamic = "force-dynamic";

/**
 * Öğrenci görev rolleri ekranı.
 *
 * Kimlik alanları (ad, okul, sınıf) buradan DA düzenlenemez — onlar e-Okul
 * kaynaklıdır. Yetkilinin değiştirebildiği tek şey dönem bazlı görev rolüdür:
 * il koordinatörü kendi ilinde İl Temsilcisi, danışman öğretmen kendi okulunda
 * Okul Temsilcisi belirler.
 *
 * Aday listesi merkezi kapsam filtresinden gelir; bir koordinatör başka ilin,
 * bir danışman başka okulun öğrencisini bu ekranda hiç göremez.
 */

const SINIF_ATA_BUTON =
  "rounded-md border border-cizgi px-3 py-1.5 text-sm font-medium text-metin transition hover:bg-zemin";

const SINIF_ETIKET = "text-sm font-medium text-metin-yumusak";
const SINIF_SECIM =
  "mt-1 w-full rounded-md border border-cizgi bg-kart px-3 py-2 text-sm text-metin outline-none focus:border-vurgu";

/** Eylemler bu ekrandan çağrıldığında buraya geri döner. */
const YOL = "/panel/gorev-rolleri";

/**
 * Tek seferde basılan en fazla satır (12 Ağustos 2026 · istek: "arama
 * filtreleme özelliği gerekiyor").
 *
 * Süzgeçlerin gerekçesi de bu: merkez ülke genelini, il koordinatörü ilinin
 * tamamını görüyor ve liste sayfalanmıyordu — her satır dört ayrı form basıyor,
 * binlerce öğrencide ekran kullanılamaz hâle geliyordu. Sınır aşıldığında
 * kullanıcıya söyleniyor; sessizce kesilen bir liste "bu öğrenci kapsamımda
 * yok" diye okunurdu.
 */
const LISTE_SINIRI = 100;

export default async function GorevRolleriSayfasi({
  searchParams,
}: {
  searchParams: Promise<SorguParametreleri>;
}) {
  const parametreler = await searchParams;
  const hata = tekil(parametreler.hata);
  const durum = tekil(parametreler.durum);
  const kullanici = await oturumKullanicisiZorunlu();

  const ilKodu = koordinatorIlKodu(kullanici);
  const merkezMi = projeYoneticisiMi(kullanici);

  /*
   * OKUL TEMSİLCİSİ ATAMASI BU EKRANDAN ÇIKTI (J2 · 5 Ağustos 2026): danışman
   * öğretmen artık Öğrencilerim ekranından atıyor ve bu sekmeyi menüsünde
   * görmüyor. Ekran il ve ilçe temsilciliği için kaldı; onları il koordinatörü
   * (ve merkez) atıyor.
   *
   * Merkezde okul temsilciliği DE gösterilmeye devam ediyor: proje yöneticisi
   * ülke genelinde tek yetkili ve okulda danışman kalmadığında düzeltmeyi
   * yapabilecek tek kişi o.
   */
  const ilTemsilcisiAtayabilir =
    merkezMi || (ilKodu !== null && ilTemsilcisiAtayabilirMi(kullanici, ilKodu));

  if (!ilTemsilcisiAtayabilir) {
    return (
      <Kart>
        <KartBasligi
          baslik="Görev rolleri"
          aciklama="Bu ekran il ve ilçe temsilcisi atamasınadır; yetkiniz yok. Okul Temsilcisi görevini Öğrencilerim ekranından verebilirsiniz."
        />
      </Kart>
    );
  }

  /*
   * SÜZGEÇLER (12 Ağustos 2026 · istek: "arama filtreleme özelliği gerekiyor").
   *
   * Çözümleme öğrenci envanteriyle ORTAK (bkz. ogrenciler/filtreler.ts): iki
   * ekran aynı sorgu adlarını kullanınca bir ekrandan öbürüne yapıştırılan
   * adres de çalışıyor ve süzgeç mantığı tek yerde duruyor.
   *
   * Süzgeçler kapsamın YERİNE geçmez, üstüne eklenir (ogrenciListeFiltresi):
   * adres çubuğuna `?il=06` yazan bir koordinatör başka ilin öğrencisini
   * göremez, en kötü ihtimalle boş liste alır.
   */
  const filtreler = ogrenciFiltreleriniCoz(parametreler);

  /*
   * Bu ekrana özgü süzgeç: görev durumu. Envanterde karşılığı yok çünkü
   * "kimde görev var" sorusu yalnızca burada soruluyor ve cevabı BAKILAN
   * DÖNEME bağlı. İki yönü de gerekiyor: "ilimde kim temsilci" (var) ve
   * "kime atayabilirim" (yok).
   */
  const gorevSuzgeci = tekil(parametreler.gorev);
  const gorevKosulu: Prisma.KullaniciWhereInput =
    gorevSuzgeci === "var"
      ? {
          gorevRolleri: {
            some: { egitimOgretimYili: kullanici.egitimOgretimYili },
          },
        }
      : gorevSuzgeci === "yok"
        ? {
            gorevRolleri: {
              none: { egitimOgretimYili: kullanici.egitimOgretimYili },
            },
          }
        : {};

  const filtreVar =
    Boolean(gorevSuzgeci) ||
    Object.values(filtreler).some(
      (deger) => deger !== null && deger !== false && deger !== undefined,
    );

  const nerede: Prisma.KullaniciWhereInput = {
    AND: [ogrenciListeFiltresi(kullanici, filtreler), gorevKosulu],
  };

  /*
   * Süzgeç seçenekleri de kapsamla sınırlı: proje yöneticisi tüm illeri,
   * il koordinatörü yalnızca kendi ilini görür. İlçe ve okul listesi SEÇİLİ
   * İLE bağlı — koordinatörde seçim yapılmasa bile kendi ili varsayılır,
   * yoksa ilçe süzgeci hiç dolmazdı ve bu ekran tam olarak ilçe temsilciliği
   * içindir.
   */
  const seciliIl = filtreler.ilKodu ?? ilKodu;

  const [iller, ilceler, okullar, toplam] = await Promise.all([
    merkezMi
      ? prisma.il.findMany({ orderBy: { ad: "asc" } })
      : ilKodu
        ? prisma.il.findMany({ where: { ilKodu } })
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
    prisma.kullanici.count({ where: nerede }),
  ]);

  const ogrenciler = await prisma.kullanici.findMany({
    where: nerede,
    orderBy: [{ ad: "asc" }, { soyad: "asc" }],
    take: LISTE_SINIRI,
    select: {
      id: true,
      ad: true,
      soyad: true,
      sinif: true,
      ilKodu: true,
      ilceKodu: true,
      kurumKodu: true,
      kurum: { select: { ad: true } },
      il: { select: { ad: true } },
      ilce: { select: { ad: true } },
      gorevRolleri: {
        where: { egitimOgretimYili: kullanici.egitimOgretimYili },
        select: {
          id: true,
          rolKodu: true,
          // Çalışma grubu yöneticiliğinin kapsamı; rozet grup adını yazsın.
          calismaGrubu: { select: { ad: true } },
        },
      },
    },
  });

  /*
   * ÇALIŞMA GRUBU YÖNETİCİLİĞİ (7 Ağustos 2026) için grup listesi. Diğer üç
   * temsilcilikten farkı: kapsam öğrencinin kayıtlı yerinden türetilemiyor,
   * atayan kişi hangi grup olduğunu SEÇMEK zorunda.
   *
   * Pasif gruplar teklif edilmez; kapatılmış bir gruba yönetici atamak
   * yönetilecek bir şey olmayan bir unvan üretirdi.
   */
  const calismaGruplari = await prisma.calismaGrubu.findMany({
    where: { aktif: true },
    orderBy: { siraNo: "asc" },
    select: { id: true, ad: true },
  });

  const atanabilirRoller = (ogrenci: (typeof ogrenciler)[number]) => {
    const roller: GorevRolKodu[] = [];
    if (
      ogrenci.ilKodu &&
      ilTemsilcisiAtayabilirMi(kullanici, ogrenci.ilKodu) &&
      !ogrenci.gorevRolleri.some((rol) => rol.rolKodu === "IL_TEMSILCISI")
    ) {
      roller.push("IL_TEMSILCISI");
    }
    /*
     * İlçe temsilciliği ancak öğrencinin ilçesi BİLİNİYORSA teklif edilir.
     * e-Okul kaydında ilçesi boş olan öğrenciye bu görev verilemez; kapsam
     * sütunu boş kalacağı için veritabanı kısıtı da reddederdi.
     */
    if (
      ogrenci.ilKodu &&
      ogrenci.ilceKodu &&
      ilceTemsilcisiAtayabilirMi(kullanici, ogrenci.ilKodu) &&
      !ogrenci.gorevRolleri.some((rol) => rol.rolKodu === "ILCE_TEMSILCISI")
    ) {
      roller.push("ILCE_TEMSILCISI");
    }
    /*
     * Üçüncü argüman `false`: bu ekrana yalnızca il koordinatörü ve merkez
     * girebiliyor (yukarıdaki kapı), ikisinin de danışmanlığında öğrenci yok.
     * Merkez zaten koşuldan muaf; koordinatör bu görevi hiç atayamıyor.
     * Danışman öğretmen okul temsilcisini Öğrencilerim ekranından atıyor ve
     * "kendi öğrencisi mi" sorusu orada soruluyor.
     */
    if (
      ogrenci.kurumKodu &&
      okulTemsilcisiAtayabilirMi(kullanici, ogrenci.kurumKodu, false) &&
      !ogrenci.gorevRolleri.some((rol) => rol.rolKodu === "OKUL_TEMSILCISI")
    ) {
      roller.push("OKUL_TEMSILCISI");
    }
    /*
     * Çalışma grubu yöneticiliğinde "zaten var mı" kontrolü YAPILMAZ: bir
     * öğrenci birden çok grubun yöneticisi olabilir ve diğer üç rolün aksine
     * tekillik grup başınadır, kişi başına değil. Aynı gruba ikinci yönetici
     * atanması eylemde engelleniyor.
     *
     * YETKİ ARTIK İL TEMSİLCİLİĞİYLE AYNI DEĞİL (11 Ağustos 2026): çalışma
     * grubu yöneticiliğini yalnızca merkez atar. Çalışma grubu ülke geneli bir
     * yapıdır; her ilin koordinatörü kendi ilinden birini atayabilseydi aynı
     * grup için iller yarışırdı (bkz. calismaGrubuYoneticisiAtayabilirMi).
     * Öğrenciyi gruba ÜYE yapmak koordinatörde kalmaya devam ediyor, o ayrı
     * bir kapı.
     */
    if (
      calismaGrubuYoneticisiAtayabilirMi(kullanici) &&
      calismaGruplari.length > 0
    ) {
      roller.push("CALISMA_GRUBU_YONETICISI");
    }
    return roller;
  };

  /*
   * Atama sonrası bu ekrana SÜZGEÇLER KORUNARAK dönülür: bir ilçeyi süzüp
   * temsilci atayan koordinatör, işlem sonrası baştan süzmek zorunda
   * kalmamalı. Durum/hata parametreleri eylemde ekleniyor, bu yüzden
   * dışarıda bırakılıyor; adresin geçerliliği eylemde ayrıca doğrulanıyor
   * (bkz. donusYolunuCoz).
   */
  const mevcutSorgu = sorguMetni(parametreler, ["durum", "hata"]);
  const donusYolu = mevcutSorgu ? `${YOL}?${mevcutSorgu}` : YOL;

  const yerSuzgeciVar = iller.length > 0;

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Görev rolleri"
        aciklama={`İl ve İlçe Temsilcisi atamaları · ${kullanici.egitimOgretimYili} dönemi · ${toplam} öğrenci`}
      />

      {/*
        DOSYA BU LİSTENİN KOPYASI DEĞİL. Ekran görev VERİLEBİLECEK adayları
        listeliyor (çoğunun görevi yok); dosya ise VERİLMİŞ görevleri taşıyor.
        Gerekçenin tamamı rotanın başında.
      */}
      <p>
        <DisaAktarmaBagi
          yol={`/panel/gorev-rolleri/disa-aktar?yil=${encodeURIComponent(
            kullanici.egitimOgretimYili,
          )}`}
          etiket="Verilmiş görevleri Excel indir"
        />
      </p>

      {!merkezMi && (
        <BilgiKutusu>
          <strong>Okul Temsilcisi</strong> görevini danışman öğretmenler{" "}
          <Link
            href="/panel/ogrenciler"
            className="font-semibold underline underline-offset-2"
          >
            Öğrencilerim
          </Link>{" "}
          ekranından veriyor; bu ekran il ve ilçe temsilciliği içindir.
        </BilgiKutusu>
      )}

      {durum === "atandi" && (
        <BilgiKutusu cesit="olumlu">Görev rolü atandı.</BilgiKutusu>
      )}
      {durum === "kaldirildi" && (
        <BilgiKutusu cesit="olumlu">Görev rolü kaldırıldı.</BilgiKutusu>
      )}
      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}

      <BilgiKutusu>
        <span className="inline-flex items-start gap-2">
          <ShieldQuestion size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Görev rolleri <strong>hiçbir ek görüntüleme yetkisi vermez</strong>;
            dönem bazlı bir görev etiketidir. Kimlik ve okul bilgileri e-Okul
            kaynaklıdır ve bu ekrandan da değiştirilemez. Her dönem bir ilde tek
            İl Temsilcisi, bir ilçede tek İlçe Temsilcisi, bir okulda tek Okul
            Temsilcisi bulunur. İlçe temsilcisini de ilin koordinatörü belirler;
            ilçe düzeyinde ayrı bir görevli yoktur.
          </span>
        </span>
      </BilgiKutusu>

      {/*
        SÜZGEÇ FORMU. Öğrenci ve öğretmen envanterindeki formla aynı biçim ve
        aynı sorgu adları: bu üç ekran arasında geçen kullanıcı her seferinde
        yeni bir arayüz öğrenmiyor.
      */}
      <form method="get" className="rounded-kart border border-cizgi bg-kart p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-baslik">
            <Filter size={16} className="text-vurgu-metin" aria-hidden />
            Öğrenci ara
          </h2>
          {filtreVar && (
            <Link
              href={YOL}
              className="inline-flex items-center gap-1 text-sm font-medium text-vurgu-metin"
            >
              <X size={14} aria-hidden />
              Filtreleri temizle
            </Link>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

          {yerSuzgeciVar && (
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
            <span className={SINIF_ETIKET}>Sınıf</span>
            <select
              name="sinif"
              defaultValue={filtreler.sinif ?? ""}
              className={SINIF_SECIM}
            >
              <option value="">Tüm sınıflar</option>
              {SINIF_SECENEKLERI.map((secenek) => (
                <option key={secenek.deger} value={secenek.deger}>
                  {secenek.etiket}
                </option>
              ))}
              {/*
                Adresten gelen ama listede olmayan değer (eski yer imi, elle
                yazılmış sorgu) kendi seçeneği olarak eklenir; aksi halde
                süzgeç uygulanmışken kutu "Tüm sınıflar" görünürdü.
              */}
              {filtreler.sinif &&
                !SINIF_SECENEKLERI.some(
                  (secenek) => secenek.deger === filtreler.sinif,
                ) && (
                  <option value={filtreler.sinif}>{filtreler.sinif}</option>
                )}
            </select>
          </label>

          <label className="block">
            <span className={SINIF_ETIKET}>Görev durumu</span>
            <select
              name="gorev"
              defaultValue={gorevSuzgeci ?? ""}
              className={SINIF_SECIM}
            >
              <option value="">Hepsi</option>
              <option value="var">Yalnızca görevi olanlar</option>
              <option value="yok">Yalnızca görevi olmayanlar</option>
            </select>
          </label>
        </div>

        <div className="mt-4">
          <button type="submit" className={SINIF_BIRINCIL_BUTON}>
            Filtrele
          </button>
        </div>
      </form>

      {ogrenciler.length === 0 ? (
        <Kart className="text-metin-yumusak">
          {filtreVar
            ? "Bu filtrelerle eşleşen öğrenci yok."
            : "Kapsamınızda görev rolü atanabilecek öğrenci yok."}
        </Kart>
      ) : (
        <Kart>
          <KartBasligi
            baslik="Öğrenciler"
            aciklama={
              toplam > LISTE_SINIRI
                ? `${toplam} öğrenciden ilk ${LISTE_SINIRI} tanesi gösteriliyor; aradığınız kişiyi bulmak için yukarıdaki süzgeçleri kullanın.`
                : `${toplam} öğrenci`
            }
            Ikon={UserCog}
          />
          <ul className="space-y-3">
            {ogrenciler.map((ogrenci) => (
              <li
                key={ogrenci.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-kart border border-cizgi p-4"
              >
                <div>
                  <p className="font-medium text-metin">
                    <Link
                      href={`/panel/ogrenciler/${ogrenci.id}`}
                      className="transition hover:text-vurgu-metin hover:underline"
                    >
                      {ogrenci.ad} {ogrenci.soyad}
                    </Link>
                  </p>
                  <p className="text-sm text-metin-yumusak">
                    {[
                      ogrenci.sinif,
                      ogrenci.kurum?.ad,
                      ogrenci.ilce?.ad,
                      ogrenci.il?.ad,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {ogrenci.gorevRolleri.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {ogrenci.gorevRolleri.map((gorev) => (
                        <span
                          key={gorev.id}
                          className="inline-flex items-center gap-1 rounded-full bg-rol-ogrenci-zemin px-2.5 py-0.5 text-xs font-medium text-rol-ogrenci-metin"
                        >
                          <BadgeCheck size={13} aria-hidden />
                          {gorev.calismaGrubu
                            ? `${gorev.calismaGrubu.ad} ${GOREV_ROL_ETIKETLERI[gorev.rolKodu]}`
                            : GOREV_ROL_ETIKETLERI[gorev.rolKodu]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {atanabilirRoller(ogrenci).map((rolKodu) => (
                    <form key={rolKodu} action={gorevRoluAtaEylemi}>
                      <input
                        type="hidden"
                        name="ogrenciId"
                        value={ogrenci.id}
                      />
                      <input type="hidden" name="rolKodu" value={rolKodu} />
                      <input
                        type="hidden"
                        name="donusYolu"
                        value={donusYolu}
                      />
                      {/*
                        Çalışma grubu yöneticiliğinde HANGİ GRUP sorulur:
                        kapsam öğrencinin kayıtlı yerinden türetilemiyor.
                        Seçim aynı formun içinde duruyor — ayrı bir adım,
                        listedeki her satır için ikinci bir ekran demekti.
                      */}
                      {rolKodu === "CALISMA_GRUBU_YONETICISI" && (
                        <select
                          name="calismaGrubuId"
                          required
                          defaultValue=""
                          aria-label={`${ogrenci.ad} ${ogrenci.soyad} için çalışma grubu`}
                          className="mb-1.5 block w-full rounded-md border border-cizgi bg-kart px-2 py-1 text-sm text-metin"
                        >
                          <option value="" disabled>
                            Grup seçin
                          </option>
                          {calismaGruplari.map((grup) => (
                            <option key={grup.id} value={grup.id}>
                              {grup.ad}
                            </option>
                          ))}
                        </select>
                      )}
                      <button type="submit" className={SINIF_ATA_BUTON}>
                        {GOREV_ROL_ETIKETLERI[rolKodu]} yap
                      </button>
                    </form>
                  ))}
                  {/*
                    Okul Temsilcisi görevinin KALDIRILMASI burada da duruyor:
                    atama Öğrencilerim'e taşındı ama koordinatör/merkez, okulda
                    danışman kalmadığında yanlış bir görevi düzeltebilmeli.
                    Yetki eylemin içinde ayrıca sorgulanıyor.
                  */}
                  {ogrenci.gorevRolleri.map((gorev) => (
                    <form key={gorev.id} action={gorevRoluKaldirEylemi}>
                      <input type="hidden" name="gorevId" value={gorev.id} />
                      <input
                        type="hidden"
                        name="donusYolu"
                        value={donusYolu}
                      />
                      <button type="submit" className={SINIF_IKINCIL_BUTON}>
                        {GOREV_ROL_ETIKETLERI[gorev.rolKodu]} görevini kaldır
                      </button>
                    </form>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Kart>
      )}
    </div>
  );
}
