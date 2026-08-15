import {
  BadgeCheck,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Filter,
  ShieldCheck,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
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
import { YolIzi } from "@/components/YonetimKartlari";
import { envanterYolIzi } from "../envanter-yolu";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import {
  BILISIM_YOLCULUGU_TIPLERI,
  KAZANIM_TIPLERI,
} from "@/lib/kazanim/kurallar";
import {
  gorevRoluAtaEylemi,
  gorevRoluKaldirEylemi,
} from "@/app/panel/gorev-rolleri/eylemler";
import { danismanligiBirakEylemi } from "./[id]/eylemler";
import { ogrenciyiDanismanligaAlEylemi } from "./eylemler";
import type { OturumKullanicisi } from "@/lib/yetki/tipler";
import { prisma } from "@/lib/db";
import {
  egitimOgretimYillariGetir,
  okulTurleriGetir,
} from "@/lib/rapor/secenekler";
import { gorevRolAdi } from "@/lib/yetki/etiketler";
import { ogrenciListeFiltresi as ogrenciListesiFiltresi } from "@/lib/yetki/kapsam";
import {
  danismanMi,
  ilKoordinatoruMu,
  koordinatorIlKodu,
  ogrenciEnvanteriGorebilirMi,
  okulTemsilcisiAtayabilirMi,
  projeYoneticisiMi,
} from "@/lib/yetki/izinler";
import { erisimLoglaCoklu } from "@/lib/yetki/log";
import {
  filtreVarMi,
  ogrenciFiltreleriniCoz,
  SINIF_SECENEKLERI,
  type SorguParametreleri,
  sayiVeyaNull,
  sorguMetni,
  tekil,
} from "./filtreler";

export const dynamic = "force-dynamic";

/**
 * Öğrenci envanteri.
 *
 * Liste, merkezi kapsam filtresinden geçer — filtre burada elle yazılmaz.
 * Öğrenci rolü bu ekrandan hiçbir şey görmez: bir öğrenci hiçbir koşulda başka
 * bir öğrencinin listesini veya kişisel verisini göremez.
 *
 * Ekrandaki filtreler yalnızca DARALTIR. Adres çubuğuna elle yazılan bir il
 * kodu kapsamı genişletmez, çünkü filtreler kapsam koşuluyla AND'lenir
 * (bkz. ogrenciListeFiltresi).
 */

const SINIF_ETIKET = "text-sm font-medium text-metin-yumusak";
const SINIF_SECIM =
  "mt-1 w-full rounded-md border border-cizgi bg-kart px-3 py-2 text-sm text-metin outline-none focus:border-vurgu";

const SAYFA_BOYUTU = 50;

const SINIF_SAYFA_BUTON =
  "inline-flex items-center gap-1 rounded-md border border-cizgi px-3 py-1.5 text-sm font-medium text-metin transition hover:bg-zemin";

/**
 * Satır başına Okul Temsilcisi düğmesi.
 *
 * Yalnızca ÖĞRENCİNİN KENDİ OKULUNDA yetkisi olan kişiye basılır: koordinatör
 * ilin tamamını görüyor ama her okulun temsilcisini o atamıyor. Yetki kontrolü
 * eylemin içinde bir kez daha yapılıyor — buradaki kontrol yalnızca
 * gösterilmeyecek bir düğmeyi göstermemek için.
 */
function OkulTemsilcisiHucresi({
  ogrenci,
  kullanici,
  kendiOgrencisi,
  donusYolu,
}: {
  ogrenci: {
    id: number;
    kurumKodu: number | null;
    gorevRolleri: { id: number; rolKodu: string }[];
  };
  kullanici: OturumKullanicisi;
  /*
   * Danışman öğretmen okulundaki DANIŞMANSIZ öğrencileri de listeliyor
   * (10 Ağustos 2026); görev verme yetkisi ise yalnızca kendi öğrencilerinde.
   * Danışmanı olmadığı öğrenciye görev veremez — hücre "—" kalır.
   */
  kendiOgrencisi: boolean;
  donusYolu: string;
}) {
  const yetkili =
    ogrenci.kurumKodu !== null &&
    okulTemsilcisiAtayabilirMi(kullanici, ogrenci.kurumKodu, kendiOgrencisi);
  if (!yetkili) {
    return <span className="text-metin-yumusak">—</span>;
  }

  const mevcut = ogrenci.gorevRolleri.find(
    (gorev) => gorev.rolKodu === "OKUL_TEMSILCISI",
  );

  if (mevcut) {
    return (
      <form action={gorevRoluKaldirEylemi}>
        <input type="hidden" name="gorevId" value={mevcut.id} />
        <input type="hidden" name="donusYolu" value={donusYolu} />
        <button
          type="submit"
          className="rounded-md border border-cizgi px-2.5 py-1.5 text-sm font-medium text-metin-yumusak transition hover:bg-zemin hover:text-hata-metin"
        >
          Görevi kaldır
        </button>
      </form>
    );
  }

  return (
    <form action={gorevRoluAtaEylemi}>
      <input type="hidden" name="ogrenciId" value={ogrenci.id} />
      <input type="hidden" name="rolKodu" value="OKUL_TEMSILCISI" />
      <input type="hidden" name="donusYolu" value={donusYolu} />
      <button
        type="submit"
        className="rounded-md border border-cizgi px-2.5 py-1.5 text-sm font-medium text-metin transition hover:bg-zemin"
      >
        Okul Temsilcisi yap
      </button>
    </form>
  );
}

/** Sayfa bağlantısı üretirken mevcut filtreler korunur. */
function sayfaBaglantisi(
  parametreler: SorguParametreleri,
  sayfa: number,
): string {
  const sorgu = new URLSearchParams(sorguMetni(parametreler, ["sayfa"]));
  if (sayfa > 1) sorgu.set("sayfa", String(sayfa));
  const metin = sorgu.toString();
  return metin ? `/panel/ogrenciler?${metin}` : "/panel/ogrenciler";
}

export default async function OgrencilerSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();

  /*
   * KAPI ÖĞRENCİDEN GENİŞ (11 Ağustos 2026). Önceden yalnızca öğrenci
   * eleniyordu; mezun, paydaş temsilcisi, mentör ve görev almamış öğretmen
   * ekranı açıp "0 kayıt" görüyordu. Veri sızmıyordu (kapsam filtresi
   * varsayılan olarak hiçbir şey döndürmüyor) ama boş liste "sistemde öğrenci
   * yok" diye okunur ve erişimi tek bir filtre dalı tutuyordu
   * (bkz. ogrenciEnvanteriGorebilirMi).
   */
  if (!ogrenciEnvanteriGorebilirMi(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="Öğrenciler"
          aciklama="Bu ekrana erişim yetkiniz yok."
        />
      </Kart>
    );
  }

  const parametreler = await searchParams;
  const filtreler = ogrenciFiltreleriniCoz(parametreler);
  const filtreVar = filtreVarMi(filtreler);

  /*
   * Okul Temsilcisi sütunu, atama yetkisi OLABİLECEK kişilere basılır: danışman
   * öğretmen (kendi okulu) ve proje yöneticisi. İl koordinatörü bu sütunu
   * görmez — o, il ve ilçe temsilcisini Görev Rolleri ekranından atıyor ve
   * ilindeki her okulun temsilcisini belirlemek onun işi değil.
   *
   * Satır bazında yetki ayrıca sorulur (bkz. OkulTemsilcisiHucresi).
   */
  const okulTemsilcisiYonetebilir =
    danismanMi(kullanici) || projeYoneticisiMi(kullanici);

  /*
   * Atama sonrası bu ekrana, FİLTRELER KORUNARAK dönülür: 400 kişilik bir
   * listede filtreleyip atama yapan öğretmen, işlem sonrası baştan filtrelemek
   * zorunda kalmamalı. Durum/hata parametreleri eylemde ekleniyor.
   */
  const mevcutSorgu = sorguMetni(parametreler, ["durum", "hata"]);
  const donusYolu = mevcutSorgu
    ? `/panel/ogrenciler?${mevcutSorgu}`
    : "/panel/ogrenciler";

  const gorevDurumu = tekil(parametreler.durum);
  const gorevHatasi = tekil(parametreler.hata);

  /*
   * DANIŞMAN ÖĞRETMENLİĞİ İŞARETİ (7 Ağustos 2026). Yalnızca okulunda görev
   * alabilecek öğretmene sorulur: il koordinatörünün ve YEĞİTEK personelinin
   * okulu yoktur ve koordinatör aynı anda danışman olamaz.
   */
  const danismanlikIsaretiGosterilir =
    !ilKoordinatoruMu(kullanici) &&
    !projeYoneticisiMi(kullanici) &&
    kullanici.kurumKodu !== null;

  /*
   * Okulundaki DANIŞMANSIZ öğrenciler. Yalnızca görev almış danışmana
   * sorulur — işaretlememiş öğretmen zaten kimseyi alamaz (eylem de
   * reddediyor) ve ona boş bir liste göstermenin karşılığı yok.
   */
  const danismansizlar =
    danismanMi(kullanici) && kullanici.kurumKodu !== null
      ? await prisma.kullanici.findMany({
          where: {
            kurumKodu: kullanici.kurumKodu,
            roller: { some: { rolKodu: "OGRENCI", bitisTarihi: null } },
            ogrenciAtamalari: { none: { bitisTarihi: null } },
          },
          orderBy: [{ sinif: "asc" }, { ad: "asc" }],
          take: 50,
          select: { id: true, ad: true, soyad: true, sinif: true },
        })
      : [];

  /*
   * DANIŞMANLIĞIMDAKİ ÖĞRENCİLER (10 Ağustos 2026 · istek: "öğretmenin
   * öğrenci seçip bırakabildiği alanı göremiyorum").
   *
   * Bırakma yalnızca öğrenci kaydının içindeydi; öğretmen tek tek profillere
   * girmeden hangi öğrencisini bırakabileceğini göremiyordu. Liste artık
   * ekranın başında: kimin danışmanı olduğunu görüyor ve seçtiğini oradan
   * bırakıyor.
   *
   * "Okulumdaki danışmansız öğrenciler" kartının SİMETRİĞİ: biri alma, öbürü
   * bırakma. İkisi yan yana durunca ekranın anlamı "danışmanlığımı yönetirim"
   * hâline geliyor.
   */
  const danismanligimdakiler = danismanMi(kullanici)
    ? await prisma.danismanAtama.findMany({
        where: { danismanKullaniciId: kullanici.id, bitisTarihi: null },
        orderBy: { baslangicTarihi: "desc" },
        select: {
          ogrenci: { select: { id: true, ad: true, soyad: true, sinif: true } },
        },
      })
    : [];

  // Filtre seçenekleri de kapsamla sınırlıdır: proje yöneticisi tüm illeri,
  // il koordinatörü yalnızca kendi ilinin okullarını, danışman öğretmen ise
  // hiç yer seçeneği görmez (tek okulu vardır).
  const koordinatorIli = koordinatorIlKodu(kullanici);
  const seciliIl = filtreler.ilKodu ?? koordinatorIli;

  const [iller, ilceler, okullar, gruplar, okulTurleri, yilSecenekleri] =
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
      prisma.calismaGrubu.findMany({
        where: { aktif: true },
        orderBy: { siraNo: "asc" },
        select: { id: true, ad: true },
      }),
      okulTurleriGetir(seciliIl ?? null),
      egitimOgretimYillariGetir(),
    ]);

  /*
   * Yıllara göre karşılaştırma (analiz dokümanı 1.2).
   *
   * Sayım, seçili yıl filtresi DIŞINDAKİ filtrelerle yapılır: "İstanbul'daki
   * oyun tasarımı öğrencileri yıllara göre nasıl değişti" sorusu ancak yıl
   * kısıtı kaldırıldığında cevaplanır. Aksi halde tablo tek satıra düşer ve
   * karşılaştırma diye bir şey kalmazdı.
   */
  const karsilastirmaFiltresi = ogrenciListesiFiltresi(kullanici, {
    ...filtreler,
    egitimOgretimYili: null,
  });
  const yilDagilimi = await prisma.kullanici.groupBy({
    by: ["egitimOgretimYili"],
    where: karsilastirmaFiltresi,
    _count: { _all: true },
    orderBy: { egitimOgretimYili: "desc" },
  });

  /*
   * Sayfalama. Liste tek sayfada dökülmez: envanter büyüdüğünde hem ekran
   * kullanılamaz hale gelir hem de HER görüntülenen öğrenci için erişim logu
   * yazıldığından log tablosu gereksiz şişer. Loglanan, gerçekten gösterilen
   * sayfadır.
   */
  const nerede = ogrenciListesiFiltresi(kullanici, filtreler);
  const toplam = await prisma.kullanici.count({ where: nerede });
  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA_BOYUTU));
  const istenenSayfa = sayiVeyaNull(tekil(parametreler.sayfa)) ?? 1;
  const sayfa = Math.min(Math.max(1, istenenSayfa), sonSayfa);

  const ogrenciler = await prisma.kullanici.findMany({
    where: nerede,
    skip: (sayfa - 1) * SAYFA_BOYUTU,
    take: SAYFA_BOYUTU,
    select: {
      id: true,
      ad: true,
      soyad: true,
      sinif: true,
      kurum: { select: { ad: true } },
      il: { select: { ad: true } },
      ilce: { select: { ad: true } },
      calismaGruplari: {
        select: { calismaGrubu: { select: { ad: true } } },
      },
      /*
       * Temsilcilikler listede de görünür: koordinatör "ilimde kim temsilci"
       * sorusunun cevabını tek tek profillere girmeden alabilmeli. Yalnızca
       * içinde bulunulan dönem — geçmiş görevler profilin katkı kartında.
       */
      // Okul Temsilcisi ataması bu ekrana taşındı (J2); kaldırma formu görev
      // kaydının kimliğini istiyor, bu yüzden `id` de seçiliyor.
      kurumKodu: true,
      /*
       * DÖNEM KARŞILAŞTIRMASI ÖĞRENCİNİN KENDİ YILIYLA (10 Ağustos 2026 ·
       * istek: "Temsilcilik kısmında öğrenci il ilçe temsilcisi ise o da
       * görünsün").
       *
       * Süzgeç BAKAN KİŞİNİN yılına bakıyordu: öğretmenin kaydındaki
       * eğitim-öğretim yılı öğrencininkinden farklı olduğunda — dönem
       * geçişinde senkron sırası ya da yeni açılmış öğretmen kaydı yeter —
       * sütun herkeste "—" görünüyordu ve bu bir veri eksikliği gibi değil,
       * "kimse temsilci değil" gibi okunuyordu. Kıyas artık öğrencinin kendi
       * dönemiyle yapılıyor; öğrenci profili de aynı kuralı kullanıyor
       * (ogrenciler/[id]/page.tsx).
       *
       * Süzgeç sorgudan JS'e taşındı çünkü Prisma iç içe `where` içinde ana
       * satırın alanına başvuramıyor; görev kayıtları öğrenci başına birkaç
       * satır olduğu için bunun bir bedeli yok.
       */
      egitimOgretimYili: true,
      gorevRolleri: {
        select: {
          id: true,
          rolKodu: true,
          egitimOgretimYili: true,
          il: { select: { ad: true } },
          ilce: { select: { ad: true } },
          kurum: { select: { ad: true } },
        },
      },
      ogrenciAtamalari: {
        where: { bitisTarihi: null },
        select: {
          // Kimlik de seçiliyor: "bu benim öğrencim mi" sorusu ad-soyaddan
          // değil kimlikten sorulur (bkz. OkulTemsilcisiHucresi).
          danismanKullaniciId: true,
          danisman: { select: { ad: true, soyad: true } },
        },
      },
    },
    orderBy: [{ ad: "asc" }, { soyad: "asc" }],
  });

  // Her veri görüntüleme işlemi loglanır.
  await erisimLoglaCoklu(
    ogrenciler.map((ogrenci) => ({
      kullaniciId: kullanici.id,
      islem: "GORUNTULEME" as const,
      hedefTip: "OGRENCI" as const,
      hedefId: ogrenci.id,
      detay: "Öğrenci listesi görüntülendi",
    })),
  );

  const kapsamAciklamasi = projeYoneticisiMi(kullanici)
    ? "Tüm iller"
    : ilKoordinatoruMu(kullanici)
      ? "Kendi iliniz"
      : danismanMi(kullanici)
        ? "Danışmanlığınızdaki öğrenciler"
        : "Kapsamınız dışında";

  const yerFiltresiVar = iller.length > 0 || okullar.length > 0;

  /*
   * YOL İZİ — bu ekranın panoya dönüş yolu (12 Ağustos 2026 · istek: "ilçeden
   * öğrencilere geçince navigasyon kayboluyor, tarayıcının geri düğmesine
   * basmak gerekiyor"). Ayrıntı için bkz. yonetim-kurallari.ts · yonetimYolIzi.
   */
  const yolIziAdimlari = await envanterYolIzi(
    kullanici,
    "Öğrenciler",
    filtreler,
  );

  const disaAktarmaSorgusu = sorguMetni(parametreler, ["sayfa"]);
  const disaAktarmaBaglantisi = disaAktarmaSorgusu
    ? `/panel/ogrenciler/disa-aktar?${disaAktarmaSorgusu}`
    : "/panel/ogrenciler/disa-aktar";

  return (
    <div className="space-y-6">
      {yolIziAdimlari && <YolIzi adimlar={yolIziAdimlari} />}

      <SayfaBasligi
        baslik="Öğrenciler"
        aciklama={
          toplam > SAYFA_BOYUTU
            ? `Görüntüleme kapsamı: ${kapsamAciklamasi} · ${toplam} kayıt · sayfa ${sayfa}/${sonSayfa}`
            : `Görüntüleme kapsamı: ${kapsamAciklamasi} · ${toplam} kayıt`
        }
      />

      {gorevDurumu === "atandi" && (
        <BilgiKutusu cesit="olumlu">Okul Temsilcisi görevi atandı.</BilgiKutusu>
      )}
      {gorevDurumu === "kaldirildi" && (
        <BilgiKutusu cesit="olumlu">
          Okul Temsilcisi görevi kaldırıldı.
        </BilgiKutusu>
      )}
      {gorevDurumu === "danismanlik-birakildi" && (
        <BilgiKutusu cesit="olumlu">
          Danışmanlık bırakıldı. Gerekçe il koordinatörünüze iletildi ve erişim
          kaydına yazıldı; öğrenci yeni danışmanına bağlandı.
        </BilgiKutusu>
      )}
      {gorevDurumu === "danismanlik-alindi" && (
        <BilgiKutusu cesit="olumlu">
          GençTek danışman öğretmeni olarak görev aldınız. Okulunuzdaki
          öğrenciler sizi danışman seçim listesinde görecek.
        </BilgiKutusu>
      )}
      {gorevDurumu &&
        !["atandi", "kaldirildi", "danismanlik-birakildi", "danismanlik-alindi"].includes(
          gorevDurumu,
        ) && <BilgiKutusu cesit="olumlu">{gorevDurumu}</BilgiKutusu>}
      {gorevHatasi && <BilgiKutusu cesit="hata">{gorevHatasi}</BilgiKutusu>}

      {/*
        GENÇTEK DANIŞMAN ÖĞRETMENLİĞİ (7 Ağustos 2026 · istek: "GençTek
        Danışman Öğretmenliği Öğrencilerim sekmesine geçsin").

        Panel'den BURAYA taşındı: görev ile bu ekran aynı işin parçası —
        işareti kaldıran kişi öğrenci listesini de kaybediyor, ikisini ayrı
        ekranlarda tutmak bu bağı görünmez kılıyordu.

        Yalnızca okulunda görev alabilecek öğretmene basılır; il koordinatörü
        ve YEĞİTEK personeli danışman olamaz.
      */}
      {danismanlikIsaretiGosterilir && (
        <Kart>
          <KartBasligi
            baslik="GençTek danışman öğretmenliği"
            aciklama="Bu görevi işaretlediğinizde okulunuzdaki öğrencilerin danışman seçim listesinde görünürsünüz. Onay süreci yoktur."
            Ikon={ShieldCheck}
          />
          {/*
            "GÖREVİ BIRAK" KALKTI (10 Ağustos 2026 · istek: "Görevi bırak
            kalkacak · öğretmen öğrenciyi bırakabilsin, gerekirse koordinatör
            de bırakabilsin").

            Tek düğmeyle görevin TAMAMINI bırakmak, öğretmenin bütün
            öğrencilerini aynı anda devir akışına sokuyordu — gerekçesiz ve
            öğrenci başına karar verilmeden. Yerine geçen yol öğrenci bazında:
            her öğrencinin kaydında "danışmanlığını bırak" var, gerekçe zorunlu
            ve il koordinatörüne bildirim gidiyor.

            Görev ALMA formu duruyor; bırakma yönü kalktığı için form yalnızca
            görevi olmayana basılıyor. Rol kaydını kapatan kural katmanı da
            duruyor (`danismanlikDurumunuDegistir`): öğretmen okuldan
            ayrıldığında ve rol envanterinden kaldırıldığında hâlâ o yol
            yürüyor. Kalkan şey, öğretmenin tek tıkla kendi görevini
            bırakmasıydı.
          */}
          {/*
            GÖREV ALMA FORMU BURADAN KALKTI, PANELİM'E DÖNDÜ (12 Ağustos 2026).
            11 Ağustos'ta bu ekranın kapısı daraldı (bkz.
            ogrenciEnvanteriGorebilirMi): görev almamış öğretmen artık burayı
            açamıyor, yani formun basılabileceği tek durum kalmamıştı —
            buraya gelen herkes zaten danışman. Kart, o kişiye görevinin
            durduğunu söylemek için duruyor; işaretin kendisi Panelim'deki
            sarı şeritte.
          */}
          <p className="inline-flex items-center gap-2 rounded-full bg-olumlu-zemin px-3 py-1 text-sm font-medium text-olumlu-metin">
            <BadgeCheck size={15} aria-hidden />
            Danışman öğretmen olarak görev alıyorsunuz.
          </p>
          <p className="mt-3 text-sm text-metin-yumusak">
            Öğrencilerinizi aşağıdaki &quot;Danışmanlığımdaki öğrenciler&quot;
            bölümünden tek tek bırakabilirsiniz.
          </p>
        </Kart>
      )}

      {/*
        DANIŞMANLIĞIMDAKİ ÖĞRENCİLER (10 Ağustos 2026 · istek: "öğretmenin
        öğrenci seçip bırakabildiği alanı göremiyorum").

        Her satırda katlı bir bırakma formu var. KATLI, çünkü bu ekranın asıl
        işi değil ve gerekçe kutusunu her satırda açık tutmak listeyi
        okunamaz hâle getirirdi; düğmenin doğrudan basılamaması da yanlışlıkla
        bırakmayı zorlaştırıyor.

        Aynı eylem öğrenci kaydının içinde de duruyor (ogrenciler/[id]);
        ikisi de tek sunucu eylemine gidiyor, yani kural tek yerde.
      */}
      {danismanligimdakiler.length > 0 && (
        <Kart>
          <KartBasligi
            baslik="Danışmanlığımdaki öğrenciler"
            aciklama={`${danismanligimdakiler.length} öğrencinin danışmanısınız. Bırakırsanız öğrenci danışmansız kalır ve okulundaki bir öğretmeni kendisi seçebilir; gerekçe il koordinatörünüze iletilir.`}
            Ikon={UserCheck}
          />
          <ul className="divide-y divide-cizgi">
            {danismanligimdakiler.map(({ ogrenci }) => (
              <li key={ogrenci.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/panel/ogrenciler/${ogrenci.id}`}
                      className="font-medium text-metin transition hover:text-vurgu-metin hover:underline"
                    >
                      {ogrenci.ad} {ogrenci.soyad}
                    </Link>
                    <p className="text-sm text-metin-yumusak">
                      {ogrenci.sinif ? `${ogrenci.sinif}. sınıf` : "—"}
                    </p>
                  </div>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-vurgu-metin">
                    Danışmanlığı bırak
                  </summary>
                  <form
                    action={danismanligiBirakEylemi}
                    className="mt-2 flex flex-wrap items-end gap-2"
                  >
                    <input type="hidden" name="ogrenciId" value={ogrenci.id} />
                    <label className="block grow">
                      <span className="text-sm font-medium text-metin">
                        Gerekçe
                      </span>
                      <input
                        type="text"
                        name="gerekce"
                        required
                        minLength={10}
                        maxLength={500}
                        placeholder="Öğrencinin ilgi alanı başka bir öğretmenin branşına daha yakın."
                        className={SINIF_SECIM}
                      />
                    </label>
                    <button type="submit" className={SINIF_IKINCIL_BUTON}>
                      Bırak
                    </button>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        </Kart>
      )}

      {/*
        DANIŞMANSIZ ÖĞRENCİLER (7 Ağustos 2026 · istek: "Öğrenci ekleme /
        Danışmanı olduğu öğrencileri seçme").

        Yalnızca KENDİ OKULUNDAKİ ve DANIŞMANSIZ öğrenciler listelenir; var
        olan bir atamanın üzerine yazılmıyor (gerekçe: eylemler.ts). Liste
        boşsa bölüm hiç basılmaz — "eklenecek kimse yok" bilgisi zaten
        öğrenci listesinde görünüyor.
      */}
      {danismansizlar.length > 0 && (
        <Kart>
          <KartBasligi
            baslik="Okulumdaki danışmansız öğrenciler"
            aciklama={`${danismansizlar.length} öğrencinin danışmanı yok. Danışmanlığınıza aldığınızda öğrenciye bildirim gider.`}
            Ikon={UserPlus}
          />
          <ul className="divide-y divide-cizgi">
            {danismansizlar.map((ogrenci) => (
              <li
                key={ogrenci.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <Link
                    href={`/panel/ogrenciler/${ogrenci.id}`}
                    className="font-medium text-metin transition hover:text-vurgu-metin hover:underline"
                  >
                    {ogrenci.ad} {ogrenci.soyad}
                  </Link>
                  <p className="text-sm text-metin-yumusak">
                    {ogrenci.sinif ? `${ogrenci.sinif}. sınıf` : "—"}
                  </p>
                </div>
                <form action={ogrenciyiDanismanligaAlEylemi}>
                  <input type="hidden" name="ogrenciId" value={ogrenci.id} />
                  <input type="hidden" name="donusYolu" value={donusYolu} />
                  <button type="submit" className={SINIF_IKINCIL_BUTON}>
                    <UserPlus size={15} aria-hidden />
                    Danışmanı ol
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Kart>
      )}

      <form
        method="get"
        className="rounded-kart border border-cizgi bg-kart p-5"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-baslik">
            <Filter size={16} className="text-vurgu-metin" aria-hidden />
            Filtreler
          </h2>
          {filtreVar && (
            <Link
              href="/panel/ogrenciler"
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

          {/*
            SINIF ARTIK LİSTE (10 Ağustos 2026 · istek: "Sınıf alanı
            açılabilir olsun, hazırlık, 9 10 11 12").

            Serbest metin kutusuydu ve "11-A" mı "11" mi yazılacağı
            kullanıcıya bırakılmıştı; yanlış yazan boş liste alıyordu. Süzgeç
            İÇEREN eşleşmesi yaptığı için (kapsam.ts) seviye seçmek "11-A"yı
            da "11/B"yi de kapsıyor.

            HAZIRLIK "Haz" olarak süzülüyor: e-Okul'dan gelen değer "Hazırlık"
            da olabilir "Haz-A" da; ortak ön ek ikisini de yakalar, tam metin
            yalnızca birini yakalardı.
          */}
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
                yazılmış sorgu) kendi seçeneği olarak eklenir: aksi halde
                süzgeç uygulanmış olduğu hâlde liste "Tüm sınıflar" görünür ve
                kullanıcı eksik listeye bakıp nedenini anlayamazdı.
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
            <span className={SINIF_ETIKET}>Eğitim-öğretim yılı</span>
            <select
              name="yil"
              defaultValue={filtreler.egitimOgretimYili ?? ""}
              className={SINIF_SECIM}
            >
              <option value="">Tüm yıllar</option>
              {yilSecenekleri.map((yil) => (
                <option key={yil} value={yil}>
                  {yil}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={SINIF_ETIKET}>Çalışma grubu</span>
            <select
              name="grup"
              defaultValue={
                filtreler.calismaGrubuId ? String(filtreler.calismaGrubuId) : ""
              }
              className={SINIF_SECIM}
            >
              <option value="">Tüm gruplar</option>
              {gruplar.map((grup) => (
                <option key={grup.id} value={grup.id}>
                  {grup.ad}
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

          {/*
            DENEYİM SÜZGECİ (15 Ağustos 2026 · Aşama 8).

            Manisa panelinde "Deneyimler" adında çok seçimli bir kutu var
            ("TEKNOFEST Yarışmaları", "Bilim fuarları"). Bizde bu veri
            `KullaniciKazanim` tablosunda zaten duruyor — yeni bir tablo
            açılmadı, var olan kayıt ARAMA EKSENİ hâline getirildi.

            İKİ ALAN AYRI: tip sabit listeden ("GençTek dışı etkinlikler"),
            metin ise serbest ("teknofest"). Manisa'da ikisi tek listede ve
            sonucu ekran görüntüsünde görünüyor — "Diğer: Bilişim hukuku ve
            güvenli internet" gibi elle yazılmış girdiler süzgeç listesini
            dolduruyor, aynı şeyin üç yazımı üç ayrı seçenek oluyor. Sabit
            liste + serbest arama ayrımı bunu engelliyor.
          */}
          <label className="block">
            <span className={SINIF_ETIKET}>Deneyim türü</span>
            <select
              name="kazanim"
              defaultValue={filtreler.kazanimTipi ?? ""}
              className={SINIF_SECIM}
            >
              <option value="">Tüm deneyimler</option>
              {KAZANIM_TIPLERI.filter((tanim) =>
                BILISIM_YOLCULUGU_TIPLERI.includes(tanim.tip),
              ).map((tanim) => (
                <option key={tanim.tip} value={tanim.tip}>
                  {tanim.baslik}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={SINIF_ETIKET}>Deneyim adında ara</span>
            <input
              type="text"
              name="kazanimAra"
              placeholder="Örn. TEKNOFEST"
              defaultValue={filtreler.kazanimAra ?? ""}
              className={SINIF_SECIM}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-metin">
            <input
              type="checkbox"
              name="danismansiz"
              value="1"
              defaultChecked={filtreler.danismansizMi}
              className="h-4 w-4 rounded border-cizgi accent-[var(--renk-birincil)]"
            />
            Yalnızca danışmanı olmayanlar
          </label>
          <button type="submit" className={SINIF_BIRINCIL_BUTON}>
            Filtrele
          </button>
          {toplam > 0 && (
            // Bağlantı, formun o anki hâlini değil ADRESTEKİ filtreleri taşır:
            // indirilen dosya ekranda görünen listeyle birebir aynı olmalı.
            <DisaAktarmaBagi yol={disaAktarmaBaglantisi} kayitSayisi={toplam} />
          )}
        </div>
      </form>

      {/*
        Yıllara göre karşılaştırma. Yıl filtresi dışındaki filtreler uygulanmış
        hâliyle sayılır; tek yıl varsa tablo gösterilmez, karşılaştıracak bir
        şey yoktur.
      */}
      {yilDagilimi.length > 1 && (
        <Kart>
          <KartBasligi
            baslik="Eğitim-öğretim yıllarına göre karşılaştırma"
            aciklama="Seçili yıl filtresi dışındaki filtrelerle sayılmıştır."
            Ikon={CalendarRange}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-cizgi text-metin-yumusak">
                <tr>
                  <th className="py-2 pr-4 font-medium">Eğitim-öğretim yılı</th>
                  <th className="py-2 pr-4 font-medium">Öğrenci sayısı</th>
                  <th className="py-2 font-medium">Bir önceki yıla göre</th>
                </tr>
              </thead>
              <tbody>
                {yilDagilimi.map((satir, sira) => {
                  // Liste yeniden eskiye sıralı; "önceki yıl" bir sonraki satır.
                  const oncekiYil = yilDagilimi[sira + 1];
                  const fark = oncekiYil
                    ? satir._count._all - oncekiYil._count._all
                    : null;

                  return (
                    <tr
                      key={satir.egitimOgretimYili}
                      className="border-b border-cizgi last:border-0"
                    >
                      <td className="py-2 pr-4 font-medium text-metin">
                        <Link
                          href={`/panel/ogrenciler?${(() => {
                            const sorgu = new URLSearchParams(
                              sorguMetni(parametreler, ["sayfa", "yil"]),
                            );
                            sorgu.set("yil", satir.egitimOgretimYili);
                            return sorgu.toString();
                          })()}`}
                          className="transition hover:text-vurgu-metin hover:underline"
                        >
                          {satir.egitimOgretimYili}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-metin-yumusak">
                        {satir._count._all}
                      </td>
                      <td className="py-2 text-metin-yumusak">
                        {fark === null
                          ? "—"
                          : fark === 0
                            ? "değişmedi"
                            : fark > 0
                              ? `+${fark}`
                              : String(fark)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Kart>
      )}

      {ogrenciler.length === 0 ? (
        <Kart className="text-metin-yumusak">
          {filtreVar
            ? "Bu filtrelerle eşleşen öğrenci yok."
            : "Kapsamınızda görüntülenecek öğrenci yok."}
        </Kart>
      ) : (
        <div className="overflow-x-auto rounded-kart border border-cizgi bg-kart">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-cizgi bg-zemin text-metin-yumusak">
              <tr>
                <th className="px-4 py-3 font-medium">Ad Soyad</th>
                <th className="px-4 py-3 font-medium">Sınıf</th>
                <th className="px-4 py-3 font-medium">Okul</th>
                <th className="px-4 py-3 font-medium">İl / İlçe</th>
                <th className="px-4 py-3 font-medium">Danışman</th>
                <th className="px-4 py-3 font-medium">Temsilcilik</th>
                <th className="px-4 py-3 font-medium">Çalışma grupları</th>
                {okulTemsilcisiYonetebilir && (
                  <th className="px-4 py-3 font-medium">Okul Temsilcisi</th>
                )}
              </tr>
            </thead>
            <tbody>
              {ogrenciler.map((ogrenci) => {
                const danisman = ogrenci.ogrenciAtamalari[0]?.danisman;
                // İçinde bulunulan dönemin görevleri; geçmiş dönem görevleri
                // profilin katkı kartında duruyor.
                const gorevler = ogrenci.gorevRolleri.filter(
                  (gorev) =>
                    gorev.egitimOgretimYili === ogrenci.egitimOgretimYili,
                );
                return (
                  <tr
                    key={ogrenci.id}
                    className="border-b border-cizgi last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-metin">
                      {/*
                       * Profil bağlantısı kapsam kontrolü YERİNE geçmez:
                       * hedef sayfa aynı merkezi filtreden yeniden geçer ve
                       * kapsam dışı id'de 404 döner. Buradaki bağlantı
                       * yalnızca gezinme kolaylığı.
                       */}
                      <Link
                        href={`/panel/ogrenciler/${ogrenci.id}`}
                        className="transition hover:text-vurgu-metin hover:underline"
                      >
                        {ogrenci.ad} {ogrenci.soyad}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-metin-yumusak">
                      {ogrenci.sinif ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-metin-yumusak">
                      {ogrenci.kurum?.ad ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-metin-yumusak">
                      {ogrenci.il?.ad ?? "—"}
                      {ogrenci.ilce?.ad ? ` / ${ogrenci.ilce.ad}` : ""}
                    </td>
                    <td className="px-4 py-3 text-metin-yumusak">
                      {danisman ? (
                        `${danisman.ad} ${danisman.soyad}`
                      ) : (
                        <span className="rounded-full bg-uyari-zemin px-2 py-0.5 text-xs text-uyari-metin">
                          Atanmadı
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-metin-yumusak">
                      {gorevler.length === 0 ? (
                        "—"
                      ) : (
                        <span className="flex flex-wrap gap-1.5">
                          {gorevler.map((gorev) => (
                            <span
                              key={gorev.rolKodu}
                              className="rounded-full bg-rol-ogrenci-zemin px-2 py-0.5 text-xs text-rol-ogrenci-metin"
                            >
                              {gorevRolAdi(gorev)}
                            </span>
                          ))}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-metin-yumusak">
                      {ogrenci.calismaGruplari.length === 0
                        ? "—"
                        : ogrenci.calismaGruplari
                            .map((secim) => secim.calismaGrubu.ad)
                            .join(", ")}
                    </td>
                    {/*
                      OKUL TEMSİLCİSİ ATAMASI (J2 · 5 Ağustos 2026). Görev
                      Rolleri sekmesi danışman öğretmenin menüsünden kalktı;
                      atama artık burada. İl ve ilçe temsilciliği BURADA YOK —
                      onları il koordinatörü kendi ekranından atıyor, çünkü
                      koordinatörün listesi ilin tamamı ve ilçe bazlı atamayı
                      burada yapmak filtre kurmayı zorunlu kılardı.

                      Yetki iki kez sorulur: burada (düğmeyi hiç basmamak için)
                      ve eylemin içinde (form kurcalanabilir).
                    */}
                    {okulTemsilcisiYonetebilir && (
                      <td className="px-4 py-3">
                        {/*
                          Hücreye DÖNEMİ SÜZÜLMÜŞ liste veriliyor: geçmiş
                          dönemde okul temsilcisi olmuş bir öğrenciye bu yıl
                          "Görevi kaldır" göstermek, olmayan bir görevi
                          kaldırmayı teklif etmek olurdu.
                        */}
                        <OkulTemsilcisiHucresi
                          ogrenci={{ ...ogrenci, gorevRolleri: gorevler }}
                          kullanici={kullanici}
                          kendiOgrencisi={
                            ogrenci.ogrenciAtamalari[0]?.danismanKullaniciId ===
                            kullanici.id
                          }
                          donusYolu={donusYolu}
                        />
                      </td>
                    )}
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
