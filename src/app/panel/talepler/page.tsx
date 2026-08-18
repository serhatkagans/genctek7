import {
  ClipboardCheck,
  Filter,
  GraduationCap,
  Handshake,
  LifeBuoy,
  Megaphone,
  X,
} from "lucide-react";
import Link from "next/link";
import { DisaAktarmaBagi } from "@/components/DisaAktarmaBagi";
import { RolEtiketi, RolsuzEtiketi } from "@/components/RolEtiketi";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  Rozet,
  SayfaBasligi,
  SINIF_GIRDI,
  SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import { KisayolKarti } from "@/components/YonetimKartlari";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  GIZLILIK_UYARISI,
  PANO_ILANI_DURUM_ETIKETLERI,
  PANO_KATEGORILERI,
  PANODA_GORUNEN_ONAY_DURUMLARI,
  TALEP_TURU_BELIRTILMEMIS,
  TALEP_TURU_ETIKETLERI,
  SUZGEC_TURLERI,
  talepTuruGecerliMi,
} from "@/lib/iletisim/kurallar";
import type { RolKodu, TalepTuru } from "@/generated/prisma/enums";
import { tarihSaatYaz, tarihYaz } from "@/lib/tarih";
import {
  mentorlukBasvurabilirMi,
  panodaEslesmeArayabilirMi,
  panodaIlanAcabilirMi,
  panoIlaniOnaylayabilirMi,
  panoIlaniOnayGerekiyorMu,
} from "@/lib/yetki/izinler";
import { baglantiIstegiGonderEylemi } from "../yazismalar/baglanti-eylemleri";
import { IlanDuzenlemeFormu } from "./formlar";
import { talepKapatEylemi } from "./eylemler";

export const dynamic = "force-dynamic";

/**
 * Pano (eski adıyla Talep Panosu) — analiz isteği Bölüm 6, Aşama 1.
 *
 * İLAN PANOSUDUR, mesajlaşma değil: kullanıcı "şu konuda desteğe ihtiyacım
 * var" diye talep açar, panoyu gören herkes okur. Kişiden kişiye temas
 * içermediği için modülün en düşük riskli parçası ve tek başına işe yarıyor.
 *
 * ============================================================================
 * KARTLAR ÜSTTE, İLANLAR ALTTA (14 Ağustos 2026)
 * ============================================================================
 * İstek: "panoda kart olsun, kartlarda destek/duyuru talebi, mentör talebi bide
 * mentör olmak için başvur, en üstte kart olsun o sayfaya gitsin, yani panoda
 * sadece kartlar altında da duyurular olsun".
 *
 * Ekran üç formu birden taşıyordu (destek, mentör talebi, mentörlük başvurusu)
 * ve panoya BAKMAYA gelen kullanıcı — çoğunluk bu — hepsini geçmek zorundaydı.
 * Formlar kendi sayfalarına taşındı; panoda yerlerine birer kart var. Pano
 * yeniden tek işi yapıyor: ilanları göstermek.
 *
 * Pano KAPSAM FİLTRESİZ: ilanlar ülke genelinde görünür. Amaç zaten farklı
 * illerden öğrencilerin birbirini bulması; il sınırı konsaydı pano kendi
 * amacını baltalardı. Görünen tek kişisel veri ad, okul ve il — iletişim
 * bilgisi bağlantı onaylanmadan paylaşılmaz.
 *
 * ÖĞRENCİ İLANLARI ONAYDAN GEÇER (aynı gün · istek: "panodaki öğrenci ilanları
 * şimdilik proje yöneticilerine düşsün oradan onay versin"): onay bekleyen ilan
 * listede YOK, yalnızca sahibinin "Açık ilanlarım" bölümünde durumuyla görünür.
 */

/**
 * Talebi açanın rol kodları — aynı rolden birden fazla kayıt varsa (ör. iki
 * okulda danışmanlık) rozet iki kez basılmasın diye tekilleştirilir.
 */
function acanRolleri(roller: { rolKodu: RolKodu }[]): RolKodu[] {
  return [...new Set(roller.map((rol) => rol.rolKodu))];
}

const DURUM_MESAJLARI: Record<string, string> = {
  acildi: "Talebiniz panoya eklendi.",
  /*
   * ÖĞRENCİYE AYRI İLETİ (14 Ağustos 2026): "panoya eklendi" demek yanlış
   * olurdu — ilan onaylanana kadar panoda görünmüyor. Kişi ilanını listede
   * arayıp bulamayınca sistemin yuttuğunu düşünürdü.
   */
  "onaya-gonderildi":
    "İlanınız proje yöneticisinin onayına gönderildi. Onaylandığında panoda yayımlanır ve size bildirim gelir.",
  duzenlendi: "İlan güncellendi.",
  "duzenlendi-onaya":
    "İlanınız güncellendi ve yeniden proje yöneticisinin onayına düştü; karar verilene kadar panoda görünmez.",
  "istek-gonderildi":
    "Bağlantı isteğiniz gönderildi. Danışman öğretmeniniz ya da il koordinatörünüz onayladığında yazışma açılır.",
  kapatildi: "İlanınız kapatıldı; listede görünmüyor.",
};

export default async function TaleplerSayfasi({
  searchParams,
}: {
  searchParams: Promise<{
    durum?: string;
    hata?: string;
    grup?: string;
    ara?: string;
    tur?: string;
  }>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  const { durum, hata, grup, ara, tur } = await searchParams;

  /*
   * ÜÇ AYRI YETKİ, ÜÇ AYRI SORU:
   * - `acabilir`: ilan açma kartları basılsın mı (proje yöneticisi dâhil
   *   herkes · 14 Ağustos 2026).
   * - `baglantiKurabilir`: ilanın altındaki bağlantı isteği kutusu. Merkez
   *   burada hâlâ dışarıda — ilan açmak açık bir metin yazmaktır, bağlantı
   *   isteği ise kişiye yönelen ve onaydan geçen bir temastır.
   * - `onaylayabilir`: onay kuyruğu kartı.
   */
  const acabilir = panodaIlanAcabilirMi(kullanici);
  const baglantiKurabilir = panodaEslesmeArayabilirMi(kullanici);
  const mentorBasvurabilir = mentorlukBasvurabilirMi(kullanici);
  const onayaDuser = panoIlaniOnayGerekiyorMu(kullanici);
  const onaylayabilir = panoIlaniOnaylayabilirMi(kullanici);
  const simdi = new Date();

  const grupId = Number.parseInt(grup ?? "", 10);
  const aramaMetni = (ara ?? "").trim();

  /*
   * Kategori süzgeci. "belirtilmemis" ayrı bir seçenek: türü olmayan ESKİ
   * ilanlar (alan 6 Ağustos 2026'da eklendi) hiçbir tür filtresine düşmezdi ve
   * pano filtrelenince sessizce kaybolurlardı.
   */
  const seciliTur = talepTuruGecerliMi(tur ?? "") ? (tur as TalepTuru) : null;
  const tursuzIstendi = tur === "belirtilmemis";

  const [gruplar, talepler, kendiTalepleri, bekleyenSayisi] = await Promise.all([
    prisma.calismaGrubu.findMany({
      where: { aktif: true },
      orderBy: { siraNo: "asc" },
      select: { id: true, ad: true },
    }),
    prisma.talep.findMany({
      where: {
        AND: [
          {
            kapatildiMi: false,
            sonGecerlilik: { gte: simdi },
            /*
              ONAY BEKLEYEN İLAN PANODA YOK (14 Ağustos 2026). Reddedilen de
              yok. Görünen iki durum tek listeden geliyor (bkz.
              PANODA_GORUNEN_ONAY_DURUMLARI) — filtre üç ekranda tekrarlanıyor
              ve elle yazılsaydı biri güncellenip diğeri unutulurdu.
            */
            onayDurumu: { in: PANODA_GORUNEN_ONAY_DURUMLARI },
          },
          Number.isFinite(grupId) ? { calismaGrubuId: grupId } : {},
          seciliTur ? { tur: seciliTur } : tursuzIstendi ? { tur: null } : {},
          aramaMetni
            ? {
                OR: [
                  { baslik: { contains: aramaMetni, mode: "insensitive" } },
                  { icerik: { contains: aramaMetni, mode: "insensitive" } },
                ],
              }
            : {},
        ],
      },
      orderBy: { olusturmaTarihi: "desc" },
      take: 60,
      select: {
        id: true,
        tur: true,
        baslik: true,
        icerik: true,
        sonGecerlilik: true,
        olusturmaTarihi: true,
        calismaGrubu: { select: { ad: true } },
        acan: {
          select: {
            id: true,
            ad: true,
            soyad: true,
            sinif: true,
            brans: true,
            kurum: { select: { ad: true } },
            il: { select: { ad: true } },
            /*
              TALEBİ KİM AÇTI (10 Ağustos 2026 · istek: "talebi öğretmen mi
              öğrenci mi açmış görünsün"). Sınıf/branş alanı dolaylı bir
              ipucuydu ve ikisi de boşsa hiçbir şey söylemiyordu; rol açıkça
              yazılıyor. Yalnızca SÜREN roller — görevi bitmiş bir öğretmeni
              hâlâ danışman diye göstermek yanlış olurdu.
            */
            roller: {
              where: { bitisTarihi: null },
              select: { rolKodu: true },
            },
          },
        },
        /*
         * MENTÖR CEVAPLARI İLANIN ALTINDA (13 Ağustos 2026 · mentör sayfası).
         * Cevap mentör ekranından yazılıyor ama okunacağı yer burası: ilan
         * sahibi bildirimle panoya geliyor ve cevabı ilanının altında buluyor.
         * Gizlenmiş cevap basılmaz.
         */
        cevaplar: {
          where: { gizlendiMi: false },
          orderBy: { olusturmaTarihi: "asc" },
          select: {
            id: true,
            icerik: true,
            olusturmaTarihi: true,
            yazanKullaniciId: true,
            yazan: { select: { ad: true, soyad: true } },
          },
        },
      },
    }),
    /*
     * KENDİ İLANLARI, ONAY DURUMUYLA (14 Ağustos 2026). Onay bekleyen ve
     * REDDEDİLEN ilanlar da bu listede: panodan düşen ilanın sahibine hiçbir iz
     * bırakmamak, "ilanım silinmiş" izlenimi verirdi. Ret gerekçesi de satırda
     * yazıyor — bildirim okunmamış olabilir ve gerekçe, öğrencinin yeni ilanı
     * nasıl yazacağını belirleyen tek bilgi.
     */
    prisma.talep.findMany({
      where: { acanKullaniciId: kullanici.id, kapatildiMi: false },
      orderBy: { olusturmaTarihi: "desc" },
      select: {
        id: true,
        tur: true,
        baslik: true,
        icerik: true,
        sonGecerlilik: true,
        onayDurumu: true,
        retGerekcesi: true,
      },
    }),
    /* Kuyruk sayısı yalnızca karar verecek kişi için sorgulanıyor. */
    onaylayabilir
      ? prisma.talep.count({
          where: { onayDurumu: "BEKLIYOR", kapatildiMi: false },
        })
      : 0,
  ]);

  const filtreVar =
    Boolean(aramaMetni) || Number.isFinite(grupId) || Boolean(tur);

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Pano"
        aciklama="Teknik destek, duyuru, ekip arkadaşı ve mentör ilanları. Pano ekosistem dışına açık değildir; ilanları yalnızca sisteme girmiş kullanıcılar görür."
        rozet={
          <>
            <Rozet cesit="vurgu">{talepler.length} ilan</Rozet>
            {filtreVar && <Rozet>filtreli</Rozet>}
          </>
        }
      />

      {/*
        Dosya panoyu MODERE EDENE (merkez) veriliyor, panoyu gören herkese
        değil: ekranda süzülerek akan ilanlar dosyada ilan sahiplerinin
        ad-okul-il bilgisini toplu hâle getiriyor. Gerekçenin tamamı rotanın
        başında.
      */}
      {panoIlaniOnaylayabilirMi(kullanici) && (
        <p>
          <DisaAktarmaBagi
            yol="/panel/talepler/disa-aktar"
            etiket="Tüm ilanları Excel indir"
          />
        </p>
      )}

      {durum && DURUM_MESAJLARI[durum] && (
        <BilgiKutusu cesit="olumlu">{DURUM_MESAJLARI[durum]}</BilgiKutusu>
      )}
      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}

      {/*
        Uyarı panoda da gösteriliyor: kullanıcı iletişimi buradan başlatıyor ve
        kuralı ilk temasta bilmeli. Metin tek bir sabitten geliyor.
      */}
      <BilgiKutusu cesit="uyari">{GIZLILIK_UYARISI}</BilgiKutusu>

      {/*
        BAĞLANTI KUTUSU BASILMIYORSA SEBEBİ YAZILI (13 Ağustos 2026'daki
        gerekçenin devamı): kutunun sessizce yok olması "sayfa yarım açıldı"
        izlenimi verirdi. 14 Ağustos 2026'da ilan açma merkeze açılınca metin de
        daraldı — kapalı kalan tek şey bağlantı isteği.
      */}
      {!baglantiKurabilir && (
        <BilgiKutusu cesit="bilgi">
          İlan açabilirsiniz; ilanlara bağlantı isteği gönderemezsiniz. Merkezin
          duyuru kanalı ayrıdır (Mesaj Gönder).
        </BilgiKutusu>
      )}

      {/*
        KARTLAR EN ÜSTTE (14 Ağustos 2026 · istek: "en üstte kart olsun o
        sayfaya gitsin"). Her kart bir sayfaya gidiyor; formların hiçbiri artık
        panonun içinde değil.
      */}
      <div className="grid gap-3 sm:grid-cols-2">
        {acabilir && (
          <>
            <KisayolKarti
              baslik="Destek / duyuru talebi aç"
              aciklama="Teknik destek, duyuru, ekip arkadaşı arama ya da genel ilan"
              Ikon={LifeBuoy}
              yol="/panel/talepler/yeni"
            />
            <KisayolKarti
              baslik="Mentör talebi aç"
              aciklama="Yol gösterecek bir mentöre sorun; havuzdaki mentörler görür"
              Ikon={GraduationCap}
              yol="/panel/talepler/mentor-talebi"
            />
          </>
        )}
        {mentorBasvurabilir && (
          <KisayolKarti
            baslik="Mentör olmak için başvur"
            aciklama="Bildiğiniz konularda öğrencilere yol gösterin; başvurunuz onaydan geçer"
            Ikon={Handshake}
            yol="/panel/talepler/mentor-basvuru"
          />
        )}
        {/*
          ONAY KUYRUĞU KARTI (14 Ağustos 2026). Merkez panoya zaten bakıyor;
          kuyruğa giden yolun burada da olması, kararı ilanların yanında
          tutuyor. Kartın ikizi Yönetim Paneli'nde duruyor.
        */}
        {onaylayabilir && (
          <KisayolKarti
            baslik="Pano ilanları (onay)"
            aciklama={
              bekleyenSayisi > 0
                ? `${bekleyenSayisi} ilan kararınızı bekliyor · düzenleme ve silme`
                : "Bekleyen ilan yok · düzenleme ve silme"
            }
            Ikon={ClipboardCheck}
            yol="/panel/talepler/onaylar"
          />
        )}
      </div>

      <form method="get" className="rounded-kart border border-cizgi bg-kart p-5 shadow-kart">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-baslik">
            <Filter size={16} className="text-vurgu-metin" aria-hidden />
            Ara
          </h2>
          {filtreVar && (
            <Link
              href="/panel/talepler"
              className="inline-flex items-center gap-1 text-sm font-medium text-vurgu-metin"
            >
              <X size={14} aria-hidden />
              Temizle
            </Link>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-metin-yumusak">
              Kategori
            </span>
            <select
              name="tur"
              defaultValue={seciliTur ?? (tursuzIstendi ? "belirtilmemis" : "")}
              className={SINIF_GIRDI}
            >
              <option value="">Tümü</option>
              {/*
                SÜZGEÇ LİSTESİ AYRI (11 Ağustos 2026 · "sponsoru kaldıralım").
                TALEP_TURLERI enum'un tamamıdır ve doğrulama ile rozet
                etiketlerini de besler; sponsor oradan silinseydi açılmış
                sponsor ilanları geçersiz tür sayılırdı.

                14 Ağustos 2026'da liste istekteki dörtlüye oturdu: teknik
                destek talebi, duyuru / tanıtım desteği, ekip arkadaşı arama,
                genel. Talep formundaki kategori listesiyle aynı.
              */}
              {SUZGEC_TURLERI.map((deger) => (
                <option key={deger} value={deger}>
                  {TALEP_TURU_ETIKETLERI[deger]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-metin-yumusak">
              İlan metninde ara
            </span>
            <input
              type="search"
              name="ara"
              defaultValue={aramaMetni}
              placeholder="görüntü işleme, mobil uygulama…"
              className={SINIF_GIRDI}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-metin-yumusak">
              Çalışma alanı
            </span>
            <select
              name="grup"
              defaultValue={Number.isFinite(grupId) ? String(grupId) : ""}
              className={SINIF_GIRDI}
            >
              <option value="">Tümü</option>
              {gruplar.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.ad}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="submit" className={`${SINIF_IKINCIL_BUTON} mt-3`}>
          Ara
        </button>
      </form>

      <Kart>
        <KartBasligi
          baslik="Panodaki ilanlar"
          aciklama={`${talepler.length} ilan${filtreVar ? " (filtreli)" : ""}`}
          Ikon={Megaphone}
        />
        {talepler.length === 0 ? (
          <p className="text-metin-yumusak">
            {filtreVar
              ? "Aramanıza uyan ilan yok."
              : "Panoda henüz ilan yok. İlkini siz açabilirsiniz."}
          </p>
        ) : (
          <ul className="space-y-4">
            {talepler.map((talep) => {
              const roller = acanRolleri(talep.acan.roller);
              return (
                <li
                  key={talep.id}
                  id={`talep-${talep.id}`}
                  className="scroll-mt-24 rounded-kart border border-cizgi p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold text-baslik">{talep.baslik}</h3>
                    <span className="flex flex-wrap items-center gap-2">
                      {/*
                        Kategori rozeti önce basılıyor: ilanın NE ARADIĞI, hangi
                        çalışma alanına ait olduğundan önce okunmalı. Türü
                        olmayan eski ilanlar da açıkça etiketleniyor — rozetsiz
                        bırakmak onları "duyuru" sanılabilir hâle getirirdi.
                      */}
                      <span className="rounded-full bg-rol-ogrenci-zemin px-2.5 py-0.5 text-xs font-medium text-rol-ogrenci-metin">
                        {talep.tur
                          ? TALEP_TURU_ETIKETLERI[talep.tur]
                          : TALEP_TURU_BELIRTILMEMIS}
                      </span>
                      {talep.calismaGrubu && (
                        <span className="rounded-full bg-vurgu-zemin px-2.5 py-0.5 text-xs font-medium text-vurgu-metin">
                          {talep.calismaGrubu.ad}
                        </span>
                      )}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-metin">
                    {talep.icerik}
                  </p>
                  {/*
                    Rol rozeti adın YANINDA duruyor, satırın sonunda değil:
                    panoda okunan ilk şey "bunu kim yazmış" ve bir öğrencinin
                    destek talebiyle öğretmenin talebi aynı ağırlıkta değil.
                    Rolsüz öğretmen de nötr bir etiketle görünür — etiketsiz
                    bırakılsaydı öğrenci sanılırdı.
                  */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-metin-yumusak">
                    {roller.length > 0 ? (
                      roller.map((rolKodu) => (
                        <RolEtiketi key={rolKodu} rolKodu={rolKodu} />
                      ))
                    ) : (
                      <RolsuzEtiketi />
                    )}
                    <span>
                      {talep.acan.ad} {talep.acan.soyad}
                      {" · "}
                      {talep.acan.sinif ?? talep.acan.brans ?? "—"}
                      {" · "}
                      {talep.acan.kurum?.ad ?? talep.acan.il?.ad ?? "—"}
                      {" · "}
                      {tarihYaz(talep.sonGecerlilik)} tarihine kadar
                    </span>
                  </div>

                  {/*
                    MENTÖR CEVAPLARI (13 Ağustos 2026). Cevaplar mentör
                    sayfasından yazılıyor, okunacakları yer burası: ilan sahibi
                    bildirimle geliyor ve cevabı ilanının altında buluyor.

                    BAĞLANTI KUTUSUNDAN ÖNCE basılıyor — önce "cevap geldi mi",
                    sonra "birebir konuşmak ister miyim". Sıra ters olsaydı
                    cevap, bir formun altında gözden kaçardı.

                    Gizleme düğmesi BURADA YOK: gözetim rolleri cevabı görüyor
                    ama kaldırma işi tek ekranda toplandı (mentör sayfası ve
                    eylem); panodaki her satıra düğme koymak, öğrencinin gördüğü
                    listeyi moderasyon aracına çevirirdi.
                  */}
                  {talep.cevaplar.length > 0 && (
                    <div className="mt-3 border-t border-cizgi pt-3">
                      <p className="text-sm font-medium text-metin">
                        Mentör cevapları ({talep.cevaplar.length})
                      </p>
                      <ul className="mt-2 space-y-2">
                        {talep.cevaplar.map((cevap) => (
                          <li
                            key={cevap.id}
                            className="rounded-kart bg-zemin px-3 py-2"
                          >
                            <p className="text-sm font-medium text-metin">
                              {cevap.yazan.ad} {cevap.yazan.soyad}
                              <span className="ml-2 font-normal text-metin-yumusak">
                                {tarihSaatYaz(cevap.olusturmaTarihi)}
                              </span>
                            </p>
                            <p className="mt-1 whitespace-pre-line text-metin">
                              {cevap.icerik}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/*
                    Kendi ilanına istek gönderilmez. İletişim bilgisi burada
                    GÖSTERİLMEZ: taraflar ancak onaydan sonra ve sistem
                    üzerinden konuşur.
                  */}
                  {baglantiKurabilir && talep.acan.id !== kullanici.id && (
                    <form
                      action={baglantiIstegiGonderEylemi}
                      className="mt-3 flex flex-wrap items-end gap-2 border-t border-cizgi pt-3"
                    >
                      <input type="hidden" name="talepId" value={talep.id} />
                      <label className="block grow">
                        <span className="text-sm font-medium text-metin">
                          Kendinizi tanıtın
                        </span>
                        <input
                          type="text"
                          name="mesaj"
                          required
                          maxLength={1000}
                          placeholder="Neden bağlanmak istediğinizi kısaca yazın."
                          className={SINIF_GIRDI}
                        />
                      </label>
                      <button type="submit" className={SINIF_IKINCIL_BUTON}>
                        <Handshake size={16} aria-hidden />
                        Bağlantı isteği gönder
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Kart>

      {kendiTalepleri.length > 0 && (
        <Kart>
          <KartBasligi
            baslik="Açık ilanlarım"
            aciklama="Kendi ilanlarınızı buradan düzenleyip kapatabilirsiniz."
          />
          <ul className="divide-y divide-cizgi">
            {kendiTalepleri.map((talep) => {
              /*
                ONAY ROZETİ (14 Ağustos 2026). `ONAY_GEREKMEZ` etiketsizdir:
                onaydan hiç geçmeyen ilan yayımdadır ve ona rozet basmak,
                olmayan bir süreci varmış gibi gösterirdi.
              */
              const durumEtiketi =
                PANO_ILANI_DURUM_ETIKETLERI[talep.onayDurumu];
              return (
                <li key={talep.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-metin">
                      {talep.baslik}
                      {durumEtiketi && (
                        <span className="ml-2 inline-block align-middle">
                          {/*
                            18 Ağustos 2026: elle yazılmış hap, ortak `Rozet`e
                            çevrildi. Bekleyen ilan artık UYARI rengine düşüyor,
                            eskiden reddedilen dışındaki her durumla aynı
                            kırmızı vurguyu paylaşıyordu — "onay bekliyor" ile
                            "onaya gerek yok" tek renkte görünüyordu.
                          */}
                          <Rozet
                            cesit={
                              talep.onayDurumu === "REDDEDILDI"
                                ? "hata"
                                : talep.onayDurumu === "BEKLIYOR"
                                  ? "uyari"
                                  : "vurgu"
                            }
                          >
                            {durumEtiketi}
                          </Rozet>
                        </span>
                      )}
                      <span className="ml-2 text-sm text-metin-yumusak">
                        {tarihYaz(talep.sonGecerlilik)} tarihine kadar
                      </span>
                      {talep.onayDurumu === "BEKLIYOR" && (
                        <span className="mt-0.5 block text-sm text-metin-yumusak">
                          Proje yöneticisi onaylayana kadar panoda görünmez.
                        </span>
                      )}
                      {talep.onayDurumu === "REDDEDILDI" && (
                        <span className="mt-0.5 block text-sm text-metin-yumusak">
                          Gerekçe: {talep.retGerekcesi ?? "—"}
                        </span>
                      )}
                    </span>
                    <form action={talepKapatEylemi}>
                      <input type="hidden" name="talepId" value={talep.id} />
                      <button type="submit" className={SINIF_IKINCIL_BUTON}>
                        Kapat
                      </button>
                    </form>
                  </div>
                  <IlanDuzenlemeFormu
                    talep={talep}
                    kategoriler={PANO_KATEGORILERI}
                    donus="pano"
                    onayUyarisi={onayaDuser}
                  />
                </li>
              );
            })}
          </ul>
        </Kart>
      )}
    </div>
  );
}
