import {
  Building2,
  Filter,
  Handshake,
  Mail,
  MapPin,
  Phone,
  Plus,
  User,
  X,
} from "lucide-react";
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
import type { OnayDurumu } from "@/generated/prisma/enums";
import { OnayDurumuRozeti } from "@/components/FaaliyetRozetleri";
import {
  PAYDAS_RET_GEREKCESI_ASGARI,
  PAYDAS_TURLERI,
  PAYDAS_TURU_ETIKETLERI,
} from "@/lib/paydas/kurallar";
import {
  koordinatorIlKodu,
  paydasEkleyebilirMi,
  paydasGorebilirMi,
  paydasOnaylayabilirMi,
  projeYoneticisiMi,
} from "@/lib/yetki/izinler";
import { paydasListeFiltresi } from "@/lib/yetki/kapsam";
import { erisimLoglaCoklu } from "@/lib/yetki/log";
import {
  type SorguParametreleri,
  sorguMetni,
} from "../ogrenciler/filtreler";
import { paydasEkleEylemi, paydasOnayEylemi } from "./eylemler";
import { paydasFiltreleriniCoz, paydasFiltresiVarMi } from "./filtreler";

export const dynamic = "force-dynamic";

/** Sütun süzgeçlerinin bağlandığı form; bkz. components/SutunSuzgeci.tsx. */
const SUZGEC_FORMU = "paydas-suzgeci";

/**
 * İl bazlı paydaş envanteri — analiz dokümanı Bölüm 3.
 *
 * Liste merkezi kapsam filtresinden geçer (paydasKapsamFiltresi): il
 * koordinatörü ve danışman öğretmen yalnızca kendi ilini görür, adres çubuğuna
 * yazılan bir il kodu bunu genişletmez çünkü ekran filtreleri kapsamla
 * AND'lenir.
 *
 * Kayıt açma yetkisi görmekten DARDIR (bkz. paydasYonetebilirMi): danışman
 * öğretmen listeyi görür ama satır ekleyemez.
 */

const SINIF_ETIKET = "text-sm font-medium text-metin-yumusak";
const SINIF_SECIM =
  "mt-1 w-full rounded-md border border-cizgi bg-kart px-3 py-2 text-sm text-metin outline-none focus:border-vurgu";

const DURUM_MESAJLARI: Record<string, string> = {
  eklendi: "Paydaş kaydı eklendi.",
  guncellendi: "Paydaş kaydı güncellendi.",
  pasif: "Paydaş pasife alındı; geçmiş etkinlik bağlantıları korunuyor.",
  aktif: "Paydaş yeniden aktifleştirildi.",
  "paydas-onaylandi": "Paydaş kaydı onaylandı.",
  "paydas-reddedildi": "Paydaş kaydı reddedildi; gerekçe kayda yazıldı.",
};

/**
 * PAYDAŞ ONAY HÜCRESİ (27 Ağustos 2026 · istek: "proje yöneticisi bu listeden
 * en son sütunda onay veya red versin").
 *
 * DURUM HERKESE, DÜĞME MERKEZE. Rozet bir bilgi: kaydı açan koordinatör
 * kararın ne olduğunu görmeli ve reddedildiyse gerekçesini okumalı, yoksa neyi
 * düzeltip yeniden sunacağını bilemez.
 *
 * RET GEREKÇESİ `details` İÇİNDE AÇILIYOR — aynı desende rol envanterindeki
 * atama açıklaması ve öğrenci listesindeki "Mentörlüğü kaldır" formu var: her
 * satırda açık duran bir metin kutusu tabloyu okunamaz hâle getirirdi.
 *
 * ONAYLI KAYITTA DA DÜĞME KALIR ("Reddet"): karar geri alınabilir olmalı —
 * yanlışlıkla onaylanmış bir kurumu kayıttan düşürmenin başka yolu, kaydı
 * pasife almaktır ve o başka bir şey söyler ("iş birliği bitti").
 */
function PaydasOnayHucresi({
  paydas,
  kararVerebilir,
}: {
  paydas: {
    id: number;
    onayDurumu: OnayDurumu;
    retGerekcesi: string | null;
  };
  kararVerebilir: boolean;
}) {
  const rozet = <OnayDurumuRozeti durum={paydas.onayDurumu} />;

  const gerekce =
    paydas.onayDurumu === "REDDEDILDI" && paydas.retGerekcesi ? (
      <p className="mt-1 text-xs text-hata-metin">{paydas.retGerekcesi}</p>
    ) : null;

  if (!kararVerebilir) {
    return (
      <div className="min-w-[8rem]">
        {rozet}
        {gerekce}
      </div>
    );
  }

  return (
    <div className="min-w-[10rem] space-y-2">
      {rozet}
      {gerekce}
      {paydas.onayDurumu !== "ONAYLANDI" && (
        <form action={paydasOnayEylemi}>
          <input type="hidden" name="id" value={paydas.id} />
          <input type="hidden" name="karar" value="ONAYLA" />
          <button
            type="submit"
            className="rounded-md border border-cizgi px-2.5 py-1 text-xs font-medium text-metin transition hover:bg-zemin"
          >
            Onayla
          </button>
        </form>
      )}
      {paydas.onayDurumu !== "REDDEDILDI" && (
        <details>
          <summary className="cursor-pointer text-xs font-medium text-vurgu-metin">
            Reddet
          </summary>
          <form action={paydasOnayEylemi} className="mt-2 space-y-2">
            <input type="hidden" name="id" value={paydas.id} />
            <input type="hidden" name="karar" value="REDDET" />
            <textarea
              name="gerekce"
              rows={2}
              required
              minLength={PAYDAS_RET_GEREKCESI_ASGARI}
              maxLength={500}
              placeholder="Ret gerekçesi"
              className="w-full rounded-md border border-cizgi bg-kart px-2 py-1 text-xs text-metin outline-none focus:border-vurgu"
            />
            <button
              type="submit"
              className="rounded-md border border-cizgi px-2.5 py-1 text-xs font-medium text-metin-yumusak transition hover:bg-zemin hover:text-hata-metin"
            >
              Reddet
            </button>
          </form>
        </details>
      )}
    </div>
  );
}

export default async function PaydaslarSayfasi({
  searchParams,
}: {
  searchParams: Promise<SorguParametreleri>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();

  if (!paydasGorebilirMi(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="Paydaşlar"
          aciklama="Bu ekrana erişim yetkiniz yok."
        />
      </Kart>
    );
  }

  const parametreler = await searchParams;
  const durum = String(parametreler.durum ?? "");
  const hata = String(parametreler.hata ?? "");

  const filtreler = paydasFiltreleriniCoz(parametreler);
  const filtreVar = paydasFiltresiVarMi(filtreler);
  const nerede = paydasListeFiltresi(kullanici, filtreler);

  const merkezMi = projeYoneticisiMi(kullanici);
  const koordinatorIli = koordinatorIlKodu(kullanici);
  /*
   * Kayıt açma yetkisi İLE BAĞLI DEĞİLDİR: koordinatör başka ildeki bir kurumla
   * da iş birliği kurabilir (bkz. paydasEkleyebilirMi). Düzenleme yetkisi
   * bundan dardır ve kaydın kendisine bakar.
   */
  const kayitAcabilir = paydasEkleyebilirMi(kullanici);
  const ekleyebilir = kayitAcabilir;
  /* Onay kapısı eklemeden AYRI: kaydı koordinatör açar, kararı merkez verir. */
  const onaylayabilir = paydasOnaylayabilirMi(kullanici);

  const [paydaslar, iller, turDagilimi] = await Promise.all([
    prisma.paydas.findMany({
      where: nerede,
      orderBy: [{ aktif: "desc" }, { ad: "asc" }],
      select: {
        id: true,
        ad: true,
        tur: true,
        yetkiliKisi: true,
        eposta: true,
        telefon: true,
        isBirligiAlani: true,
        aktif: true,
        /*
          KAYDEDEN VE ONUN İLİ (27 Ağustos 2026): "İl" sütunu artık paydaşın
          kendi ilini değil, kaydı giren kişinin ilini yazıyor (bkz. tablo
          başlığındaki not). Paydaşın kendi ili sorguda hâlâ kullanılıyor —
          kapsam süzgeci ve ad tekilliği ona bakıyor — yalnızca ekrana
          basılmıyor.
        */
        ekleyen: {
          select: { ad: true, soyad: true, il: { select: { ad: true } } },
        },
        /* Merkezin kararı ve gerekçesi (27 Ağustos 2026); gerekçe kaydı açan
           koordinatöre de gösteriliyor — neyi düzelteceğini bilmeli. */
        onayDurumu: true,
        retGerekcesi: true,
      },
    }),
    /*
     * Kayıt açabilenler (merkez ve il koordinatörü) TÜM illeri görür: iş
     * birliği kurulan kurum başka ilde olabiliyor. Danışman öğretmen kayıt
     * açamadığı için ona yalnızca kendi ili gerekiyor (filtre kutusunda).
     */
    kayitAcabilir
      ? prisma.il.findMany({ orderBy: { ad: "asc" } })
      : prisma.il.findMany({
          where: { ilKodu: koordinatorIli ?? kullanici.ilKodu ?? "00" },
        }),
    // İl bazlı iş birliği haritasının en yalın hâli: kapsamdaki kayıtların
    // türlere göre dağılımı (analiz dokümanı 3.2).
    prisma.paydas.groupBy({
      by: ["tur"],
      where: nerede,
      _count: { _all: true },
    }),
  ]);

  /*
   * Dış giriş başvurusu SAYIMI KALKTI (27 Ağustos 2026): tek tüketicisi
   * buradaki karttı ve kart silindi (aşağıdaki nota bakın).
   */

  await erisimLoglaCoklu(
    paydaslar.map((paydas) => ({
      kullaniciId: kullanici.id,
      islem: "GORUNTULEME" as const,
      hedefTip: "PAYDAS" as const,
      hedefId: paydas.id,
      detay: "Paydaş listesi görüntülendi",
    })),
  );

  const disaAktarmaSorgusu = sorguMetni(parametreler, ["durum", "hata"]);
  const disaAktarmaBaglantisi = disaAktarmaSorgusu
    ? `/panel/paydaslar/disa-aktar?${disaAktarmaSorgusu}`
    : "/panel/paydaslar/disa-aktar";

  const kapsamAciklamasi = merkezMi
    ? "Tüm iller"
    : `${iller[0]?.ad ?? "İliniz"} · il bazlı`;

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
          { etiket: "Paydaşlar" },
        ]}
      />

      <SayfaBasligi
        geri={null}
        baslik="Paydaşlar"
        /* "yapılabilecek" → "yapılacak" (27 Ağustos 2026 · istek). Kayıt zaten
           açılmış bir iş birliğini anlatıyor; kip, listeyi bir olasılıklar
           listesi gibi okutuyordu. */
        aciklama={`İş birliği yapılacak kurum ve kuruluşlar · ${kapsamAciklamasi} · ${paydaslar.length} kayıt`}
      />

      {durum && DURUM_MESAJLARI[durum] && (
        <BilgiKutusu cesit="olumlu">{DURUM_MESAJLARI[durum]}</BilgiKutusu>
      )}
      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}

      {/*
        DIŞ GİRİŞ BAŞVURULARI GİRİŞİ KALKTI (27 Ağustos 2026 · istek:
        "silelim · Dış giriş başvuruları").

        EKRAN DURUYOR (/panel/dis-basvurular) ve yetkisi değişmedi
        (`disBasvuruYonetebilirMi`); kalkan yalnızca buradaki kapı. Sekmesi 11
        Ağustos'ta kalkmış ve bu kart onun yerine konmuştu — yani ekranın şu an
        menüde bir girişi yok, adresi bilinerek açılıyor. Kuyruğa yeniden bir
        kapı gerekirse yeri Yönetim Paneli'nin kart listesidir.
      */}

      {turDagilimi.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {turDagilimi.map((satir) => (
            <span
              key={satir.tur}
              className="rounded-full bg-vurgu-zemin px-3 py-1 text-xs font-medium text-vurgu-metin"
            >
              {PAYDAS_TURU_ETIKETLERI[satir.tur]}: {satir._count._all}
            </span>
          ))}
        </div>
      )}

      {/*
        FORMA `id` VERİLDİ (31 Ağustos 2026): sütun süzgeçleri tablonun içinde,
        yani bu formun DIŞINDA duruyor ve ona `form="paydas-suzgeci"` ile
        bağlanıyor (bkz. components/SutunSuzgeci.tsx). Tek form olması şart —
        iki ayrı form olsaydı sütundan süzen kişinin buradaki aramasi
        sıfırlanırdı.
      */}
      <form
        id={SUZGEC_FORMU}
        method="get"
        className="rounded-kart border border-cizgi bg-kart p-5 shadow-kart"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-baslik">
            <Filter size={16} className="text-vurgu-metin" aria-hidden />
            Filtreler
          </h2>
          {filtreVar && (
            <Link
              href="/panel/paydaslar"
              className="inline-flex items-center gap-1 text-sm font-medium text-vurgu-metin"
            >
              <X size={14} aria-hidden />
              Filtreleri temizle
            </Link>
          )}
        </div>

        {/*
          İL VE PAYDAŞ TÜRÜ SÜZGEÇLERİ SÜTUN BAŞLIKLARINA TAŞINDI (31 Ağustos
          2026 · istek: "Kurum / Tür / İl — bunlar filtreli").

          KARTTAN SİLİNDİLER, KOPYALANMADILAR: aynı `name` iki denetimde
          bulunsaydı form ikisini de gönderir, sunucu ilkini alır ve sütundaki
          kutuya yazan kişi karttaki boş kutunun kazandığını görürdü (gerekçenin
          tamamı components/SutunSuzgeci.tsx içinde).

          Kartta yalnızca SÜTUNU OLMAYAN süzgeç kalıyor: "Ara" üç alana birden
          bakıyor (kurum, yetkili kişi, iş birliği alanı) ve tek bir sütunun
          altına sığmıyor.
        */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className={SINIF_ETIKET}>Ara</span>
            <input
              type="text"
              name="ara"
              placeholder="Kurum, yetkili veya iş birliği alanı"
              defaultValue={filtreler.ara ?? ""}
              className={SINIF_SECIM}
            />
          </label>
        </div>

        {/*
          "PASİF KAYITLAR DA GÖRÜNSÜN" KUTUSU KALKTI (27 Ağustos 2026 · istek:
          "kaldır · Pasif kayıtlar da görünsün").

          KURAL KATMANI DURUYOR (`pasifleriDeGoster`): pasife alma işlemi
          yerinde ve satır, pasifken listede "pasif" rozetiyle görünmeye devam
          ediyor — kutu işaretlenmese de kayıt kaybolmuyor. Kalkan yalnızca
          ekrandaki kutu.
        */}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button type="submit" className={SINIF_BIRINCIL_BUTON}>
            Filtrele
          </button>
          {paydaslar.length > 0 && (
            <DisaAktarmaBagi yol={disaAktarmaBaglantisi} kayitSayisi={paydaslar.length} />
          )}
        </div>
      </form>

      {paydaslar.length === 0 ? (
        <Kart className="text-metin-yumusak">
          {filtreVar
            ? "Bu filtrelerle eşleşen paydaş yok."
            : ekleyebilir
              ? "Kapsamınızda henüz paydaş kaydı yok. İlkini aşağıdaki formdan ekleyebilirsiniz."
              : "İlinizde henüz paydaş kaydı yok. Kayıt açmayı il koordinatörünüzden isteyebilirsiniz."}
        </Kart>
      ) : (
        <div className="overflow-x-auto rounded-kart border border-cizgi bg-kart shadow-kart">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-cizgi bg-zemin text-metin-yumusak">
              <tr>
                <th className="px-4 py-3 font-medium">Kurum</th>
                <th className="px-4 py-3 font-medium">Tür</th>
                {/*
                  İL SÜTUNU ARTIK KAYDEDENİN İLİNİ YAZIYOR (27 Ağustos 2026 ·
                  istek: "il sütunu paydaşı kim kaydettiyse sisteme onun ili
                  görünsün").

                  DİKKAT — KAPSAM SÜZGECİ HÂLÂ PAYDAŞIN KENDİ İLİNE BAKIYOR
                  (`paydas.ilKodu`, koordinatörün listesi ve ad tekilliği o
                  sütun üzerinden kuruluyor). İkisi ayrışabilir: Manisa
                  koordinatörünün kaydettiği İstanbul merkezli bir üniversite
                  listede "Manisa" yazar. İstenen okuma bu — kaydın sahibi,
                  kurumun adresi değil.
                */}
                <th className="px-4 py-3 font-medium">İl</th>
                {/*
                  KAYDEDEN (27 Ağustos 2026 · istek: "paydaş kaydını kimin
                  girdiği görülsün"). Alan zaten vardı (`ekleyenKullaniciId`) ve
                  yetki kararında kullanılıyordu (bkz. paydasYonetebilirMi);
                  ekranda görünmüyordu.
                */}
                <th className="px-4 py-3 font-medium">Kaydeden</th>
                {/*
                  İRTİBAT KİŞİSİ KENDİ SÜTUNUNDA (27 Ağustos 2026 · istek:
                  "listeye paydaştaki yetkili kişisi eklensin"). İletişim
                  sütununun içinde, telefon ve e-postanın üstünde küçük bir
                  satırdı; kurumun santralı yerine gerçek muhatabı arayan kişi
                  onu üç satırlık bir bloğun içinden okumak zorundaydı.
                */}
                <th className="px-4 py-3 font-medium">İrtibat kişisi</th>
                <th className="px-4 py-3 font-medium">İletişim</th>
                {/*
                  "ETKİNLİK" SÜTUNU SİLİNDİ (aynı istek): paydaşın kaç
                  etkinliğe bağlandığını sayıyordu. Sayı paydaşın kendi
                  sayfasında duruyor ve listenin sorusu "kiminle iş birliği
                  var", "kaç kez kullanıldı" değil.
                */}
                <th className="px-4 py-3 font-medium">İş birliği alanı</th>
                {/*
                  ONAY EN SON SÜTUNDA (27 Ağustos 2026 · istek: "proje
                  yöneticisi bu listeden en son sütunda onay veya red versin").

                  DURUM HERKESE, DÜĞME MERKEZE: kaydı açan koordinatör kararın
                  ne olduğunu görmeli — reddedildiyse gerekçesiyle birlikte,
                  yoksa neyi düzelteceğini bilemez. Karar yetkisi ise yalnızca
                  merkezde (bkz. izinler.ts · paydasOnaylayabilirMi).
                */}
                <th className="px-4 py-3 font-medium">Onay</th>
              </tr>

              {/*
                SÜZGEÇ SATIRI — başlıkların hemen altında. Süzgeci olan üç
                sütun istekte sayılanlar: Kurum, Tür, İl. Kalanlar boş hücre
                bırakılıyor ki sütunlar kaymasın; sonuncusunda görünmeyen gönder
                düğmesi duruyor. Süzgeçler kendiliğinden çalışıyor (bkz.
                components/SutunSuzgeci.tsx); düğme yalnızca JavaScript
                kapalıyken metin kutusundan Enter'ın çalışması için var.

                İL HÜCRESİ YALNIZCA MERKEZDE DOLU: koordinatörün listesi zaten
                kendi iliyle sınırlı ve süzgeç ona tek seçenekli bir kutu
                gösterirdi.
              */}
              <SutunSuzgecSatiri>
                <SutunMetinSuzgeci
                  form={SUZGEC_FORMU}
                  ad="kurum"
                  deger={filtreler.kurum}
                  ipucu="Kurum adı"
                />
                <SutunSecimSuzgeci
                  form={SUZGEC_FORMU}
                  ad="tur"
                  deger={filtreler.tur}
                  bosEtiket="Tüm türler"
                  etiket="Paydaş türü"
                  secenekler={PAYDAS_TURLERI.map((tur) => ({
                    deger: tur,
                    etiket: PAYDAS_TURU_ETIKETLERI[tur],
                  }))}
                />
                {merkezMi ? (
                  <SutunSecimSuzgeci
                    form={SUZGEC_FORMU}
                    ad="il"
                    deger={filtreler.ilKodu}
                    bosEtiket="Tüm iller"
                    etiket="İl"
                    secenekler={iller.map((il) => ({
                      deger: il.ilKodu,
                      etiket: il.ad,
                    }))}
                  />
                ) : (
                  <SutunSuzgecBoslugu />
                )}
                <SutunSuzgecBoslugu />
                <SutunSuzgecBoslugu />
                <SutunSuzgecBoslugu />
                <SutunSuzgecBoslugu />
                <SutunSuzgecDugmesi form={SUZGEC_FORMU} />
              </SutunSuzgecSatiri>
            </thead>
            <tbody>
              {paydaslar.map((paydas) => (
                <tr
                  key={paydas.id}
                  className="border-b border-cizgi last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-metin">
                    <Link
                      href={`/panel/paydaslar/${paydas.id}`}
                      className="transition hover:text-vurgu-metin hover:underline"
                    >
                      {paydas.ad}
                    </Link>
                    {!paydas.aktif && (
                      <span className="ml-2 rounded-full bg-zemin px-2 py-0.5 text-xs text-metin-yumusak">
                        pasif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-metin-yumusak">
                    {PAYDAS_TURU_ETIKETLERI[paydas.tur]}
                  </td>
                  <td className="px-4 py-3 text-metin-yumusak">
                    {paydas.ekleyen.il?.ad ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-metin-yumusak">
                    {paydas.ekleyen.ad} {paydas.ekleyen.soyad}
                  </td>
                  <td className="px-4 py-3 text-metin-yumusak">
                    {paydas.yetkiliKisi ? (
                      <span className="flex items-center gap-1.5">
                        <User size={13} aria-hidden />
                        {paydas.yetkiliKisi}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-metin-yumusak">
                    <div className="space-y-0.5">
                      {paydas.telefon && (
                        <span className="flex items-center gap-1.5">
                          <Phone size={13} aria-hidden />
                          {paydas.telefon}
                        </span>
                      )}
                      {paydas.eposta && (
                        <span className="flex items-center gap-1.5">
                          <Mail size={13} aria-hidden />
                          {paydas.eposta}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-metin-yumusak">
                    <span className="line-clamp-2">{paydas.isBirligiAlani}</span>
                  </td>
                  <td className="px-4 py-3">
                    <PaydasOnayHucresi
                      paydas={paydas}
                      kararVerebilir={onaylayabilir}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ekleyebilir && (
        <Kart>
          <KartBasligi
            baslik="Yeni paydaş"
            aciklama={
              merkezMi
                ? "Kayıt seçilen ilin envanterine yazılır."
                : "Kayıt kendi ilinizin envanterine yazılır."
            }
            Ikon={Handshake}
          />

          <form action={paydasEkleEylemi} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className={SINIF_ETIKET}>Kurum adı</span>
                <input
                  type="text"
                  name="ad"
                  required
                  maxLength={250}
                  className={SINIF_GIRDI}
                />
              </label>

              <label className="block">
                <span className={SINIF_ETIKET}>Paydaş türü</span>
                <select name="tur" className={SINIF_GIRDI} required>
                  {PAYDAS_TURLERI.map((tur) => (
                    <option key={tur} value={tur}>
                      {PAYDAS_TURU_ETIKETLERI[tur]}
                    </option>
                  ))}
                </select>
              </label>

              {/*
                İl SEÇİLİR, roldan okunmaz. Koordinatörün iş birliği kurduğu
                kurum başka ilde olabilir; kendi iline yazmaya zorlamak
                envanteri yanlışlardı. Varsayılan kendi ili, çünkü olağan
                durum budur.
              */}
              <label className="block">
                <span className={SINIF_ETIKET}>İl</span>
                <select
                  name="ilKodu"
                  className={SINIF_GIRDI}
                  required
                  defaultValue={koordinatorIli ?? ""}
                >
                  {iller.map((il) => (
                    <option key={il.ilKodu} value={il.ilKodu}>
                      {il.ad}
                    </option>
                  ))}
                </select>
                {koordinatorIli && (
                  <span className="mt-1 block text-sm text-metin-yumusak">
                    Başka bir il seçerseniz kayıt o ilin envanterine yazılır;
                    listenizde görünmeye devam eder.
                  </span>
                )}
              </label>

              <label className="block">
                {/* "Yetkili kişi" → "İrtibat kişisi" (27 Ağustos 2026 · istek:
    "yeni paydaş oluştururken yetkili kişi bu alan irtibat kişisi
    olsun"). Alan adı şemada `yetkiliKisi` kaldı; değişen etiket.
    "Yetkili", kurumu temsil etme yetkisi gibi okunuyordu — oysa
    istenen şey santral yerine aranacak gerçek muhatap. */}
                <span className={SINIF_ETIKET}>İrtibat kişisi</span>
                <input
                  type="text"
                  name="yetkiliKisi"
                  maxLength={150}
                  placeholder="Ad Soyad · unvan"
                  className={SINIF_GIRDI}
                />
              </label>

              <label className="block">
                <span className={SINIF_ETIKET}>Telefon</span>
                <input
                  type="text"
                  name="telefon"
                  maxLength={20}
                  className={SINIF_GIRDI}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className={SINIF_ETIKET}>E-posta</span>
                <input
                  type="email"
                  name="eposta"
                  maxLength={150}
                  className={SINIF_GIRDI}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className={SINIF_ETIKET}>Adres</span>
                <input type="text" name="adres" className={SINIF_GIRDI} />
              </label>

              <label className="block sm:col-span-2">
                <span className={SINIF_ETIKET}>
                  İş birliği alanı / potansiyeli
                </span>
                <textarea
                  name="isBirligiAlani"
                  rows={3}
                  required
                  placeholder="Örn. robotik atölyesi için mekân ve eğitmen desteği; yaz stajı imkânı"
                  className={SINIF_GIRDI}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className={SINIF_ETIKET}>Notlar</span>
                <textarea name="notlar" rows={2} className={SINIF_GIRDI} />
              </label>
            </div>

            <p className="text-sm text-metin-yumusak">
              İrtibat kişisi, e-posta ve telefondan en az birini girin.
            </p>

            <button type="submit" className={SINIF_BIRINCIL_BUTON}>
              <Plus size={16} aria-hidden />
              Paydaşı ekle
            </button>
          </form>
        </Kart>
      )}

      {!ekleyebilir && paydaslar.length > 0 && (
        <BilgiKutusu>
          <span className="inline-flex items-center gap-2">
            <Building2 size={15} aria-hidden />
            Paydaş kayıtlarını il koordinatörünüz yönetir. Etkinliğinizin paydaş
            bilgisini etkinlik detay ekranından bu listeden seçerek
            ekleyebilirsiniz.
          </span>
        </BilgiKutusu>
      )}
    </div>
  );
}
