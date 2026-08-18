import {
  ArrowRight,
  ArrowRightLeft,
  BarChart3,
  BellRing,
  Camera,
  CircleAlert,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  Compass,
  FileText,
  GraduationCap,
  Layers,
  Mail,
  MapPin,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import {
  BilgiKutusu,
  Kart,
  KatlanabilirKart,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
  SINIF_VITRIN_BUTON,
  SINIF_VITRIN_IKINCIL_BUTON,
  Vitrin,
} from "@/components/ui";
import { MesajSeridi } from "@/components/MesajSeridi";
import {
  CvDuzenleme,
  DanismanlikDuzenleme,
  DestekGruplariDuzenleme,
  FotografDuzenleme,
  IletisimDuzenleme,
  KayitEklemeFormu,
  KayitYonetimi,
  ProfildeGorBaglantisi,
} from "@/components/ProfilDuzenleme";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { bildirimBaglantisi } from "@/lib/bildirim/hedef";
import { danismanSecimVerisiGetir } from "@/lib/danisman/atama";
import { calismaGruplariniGetir } from "@/lib/ogrenci/calisma-grubu";
import {
  danismanlikEylemi,
  destekGruplariEylemi,
  profilFotoSilEylemi,
  profilFotoYukleEylemi,
  profilGuncelleEylemi,
} from "./profil/eylemler";
import {
  cvSilEylemi,
  cvYukleEylemi,
  kazanimBelgeEkleEylemi,
  kazanimBelgeSilEylemi,
  kazanimEkleEylemi,
  kazanimSilEylemi,
} from "./profil/kazanim-eylemleri";
import { profilFotoSinirlariniGetir } from "@/lib/kullanici/profil-foto";
import {
  MENTORLUK_DURUM_ETIKETLERI,
  mentorKapsamiYaz,
} from "@/lib/mentor/kurallar";
import { mentorluguGetir } from "@/lib/mentor/veri";
import { ogretmenKatkiSayilariGetir } from "@/lib/ogretmen/katki";
import { katkiKartiMetni } from "@/lib/ogretmen/katki-ozeti";
import { HAKKINDA_MAKS } from "@/lib/akis/kurallar";
import { ekipSayimiGetir } from "@/lib/ekip/veri";
import { hakkindaKaydetEylemi } from "./akis/eylemler";
import { cvSinirlariniGetir } from "@/lib/ogrenci/cv";
import { kazanimEkSinirlariniGetir } from "@/lib/kazanim/ek";
import {
  kazanimTipiGecerliMi,
  kazanimTipiTanimi,
  kazanimTipleri,
} from "@/lib/kazanim/kurallar";
import { uygulamaYolu } from "@/lib/ortam";
import {
  bekleyenIsleriGetir,
  faaliyetKatilimSayisi,
  merkezIstatistikleriniGetir,
} from "@/lib/rapor/istatistik";
import { ilKoordinatoruOzeti } from "@/lib/rol/koordinator";
import { prisma } from "@/lib/db";
import { KAPSAM_ETIKETLERI } from "@/lib/faaliyet/kurallar";
import {
  etkinligeKalanYaz,
  seritteGosterilecekler,
  takvimeAyir,
} from "@/lib/faaliyet/takvim";
import { yaklasanEtkinligimiGetir } from "@/lib/faaliyet/yaklasan";
import { katilimGecmisiGetir } from "@/lib/kazanim/getir";
import { tarihYaz } from "@/lib/tarih";
import {
  basvuruYapabilirMi,
  disKullaniciMi,
  mezunMu,
  danismanMi,
  ilKoordinatoruMu,
  koordinatorIlKodu,
  mentorlukBasvurabilirMi,
  ogrenciMi,
  projeYoneticisiMi,
} from "@/lib/yetki/izinler";
import {
  faaliyetKapsamFiltresi,
  ilDisiBasvuruFiltresi,
  ogrenciKapsamFiltresi,
} from "@/lib/yetki/kapsam";
import {
  bildirimOkunduEylemi,
  tumBildirimleriOkuEylemi,
  yegitekSorumlusuIsaretiEylemi,
} from "./eylemler";
import { danismanlikIsaretiEylemi } from "./ogrenciler/eylemler";

export const dynamic = "force-dynamic";

function OlcumKarti({
  baslik,
  deger,
  aciklama,
  Ikon,
  yol,
}: {
  baslik: string;
  deger: string;
  aciklama?: string;
  Ikon: React.ComponentType<{ size?: number; className?: string }>;
  /** Verilirse kart, ilgili ekrana giden bir bağlantı olur. */
  yol?: string;
}) {
  const icerik = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-metin-yumusak">{baslik}</p>
        {/*
          İkon açık kırmızı bir kutunun içinde: yalın ikon kartın köşesinde
          iliştirilmiş duruyordu ve ızgarada onlarca kart yan yana gelince
          hiçbiri diğerinden ayrışmıyordu.
        */}
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-kutu bg-vurgu-zemin text-vurgu-metin">
          <Ikon size={16} />
        </span>
      </div>
      {/*
        Sayı başlık yazısıyla ve büyük basılıyor: bir sayımın işlevi uzaktan
        okunabilmesidir, gövde puntosunda etiketinden ayrışmıyordu.
      */}
      <p className="mt-2 font-baslik text-3xl font-extrabold text-baslik">
        {deger}
      </p>
      {aciklama && (
        <p className="mt-1 text-sm text-metin-yumusak">{aciklama}</p>
      )}
    </>
  );

  const sinif = "rounded-kart border border-cizgi bg-kart p-5 shadow-kart";

  return yol ? (
    <Link
      href={yol}
      className={`${sinif} block transition hover:border-vurgu hover:shadow-yuksek`}
    >
      {icerik}
    </Link>
  ) : (
    <div className={sinif}>{icerik}</div>
  );
}

/**
 * Panelim'den yapılan işlemlerin geri bildirimi.
 *
 * Seçim eylemleri iki yerden çağrılıyor (buradaki bölümler ve eski sekme
 * sayfaları); dönüş adresine göre mesaj burada da basılmalı, yoksa öğrenci
 * kaydettikten sonra hiçbir onay görmez ve işlemin geçtiğinden emin olamaz.
 *
 * Profil düzenleme mesajları da buraya EKLENDİ (7 Ağustos 2026): formlar
 * profilden Panelim'e taşındı, dolayısıyla eylemlerin dönüş adresi de burası.
 */
const DURUM_MESAJLARI: Record<string, string> = {
  secildi: "Danışman öğretmeniniz kaydedildi.",
  birakildi:
    "Danışmanlık sonlandırıldı ve öğretmene bilgi verildi. Yeni danışmanınızı istediğiniz zaman seçebilirsiniz.",
  kaydedildi: "Çalışma grubu seçiminiz kaydedildi.",
  "iletisim-kaydedildi": "İletişim bilgileriniz kaydedildi.",
  "kazanim-eklendi": "Kayıt profiline eklendi.",
  "kazanim-silindi": "Kayıt silindi.",
  "cv-yuklendi": "CV'niz yüklendi.",
  "cv-silindi": "CV'niz kaldırıldı.",
  "foto-yuklendi": "Profil fotoğrafınız güncellendi.",
  "foto-silindi": "Profil fotoğrafınız kaldırıldı.",
  "belge-eklendi": "Destekleyici belge eklendi.",
  "belge-silindi": "Destekleyici belge kaldırıldı.",
  // "Hakkımda" iki ekrandan da kaydedilebiliyor; ileti ikisinde de basılmalı.
  "hakkinda-kaydedildi": "Hakkımda metniniz kaydedildi.",
  "yegitek-isaretlendi":
    "YEĞİTEK Okul Sorumlusu olarak işaretlendiniz. Proje yöneticisi listesinde görünüyorsunuz.",
  "yegitek-kaldirildi": "YEĞİTEK Okul Sorumlusu işaretiniz kaldırıldı.",
  /*
   * Mentörlük iletileri panoya taşındı (13 Ağustos 2026): başvuru bölümü orada
   * ve eylemler oraya dönüyor (bkz. talepler/page.tsx · DURUM_MESAJLARI).
   */
  "destek-gruplari-kaydedildi":
    "Katkı verebileceğiniz çalışma grupları kaydedildi.",
};

/** Kayıt ekleme formunun varsayılan türü — sekme listesinin ilki. */
const VARSAYILAN_TUR = kazanimTipleri()[0].tip;

export default async function PanelSayfasi({
  searchParams,
}: {
  searchParams: Promise<{
    hata?: string;
    durum?: string;
    tur?: string;
    bolum?: string;
  }>;
}) {
  const {
    hata: seciimHatasi,
    durum: secimDurumu,
    tur: istenenTur,
    bolum: acilacakBolum,
  } = await searchParams;
  const kullanici = await oturumKullanicisiZorunlu();

  const bildirimler = await prisma.bildirim.findMany({
    where: { kullaniciId: kullanici.id, okunduMu: false },
    orderBy: { olusturmaTarihi: "desc" },
    take: 5,
  });

  /*
   * Okunmamışın TAMAMI. Liste `take: 5` olduğu için tek başına sayı vermiyor;
   * sarı şerit "10 okunmamış" diyebilsin diye ayrıca sayılıyor. Sorgu
   * `bildirim(kullanici_id, okundu_mu)` dizinine oturuyor.
   */
  const okunmamisMesajSayisi =
    bildirimler.length < 5
      ? bildirimler.length
      : await prisma.bildirim.count({
          where: { kullaniciId: kullanici.id, okunduMu: false },
        });

  const kapsamdakiOgrenciSayisi = await prisma.kullanici.count({
    where: ogrenciKapsamFiltresi(kullanici),
  });

  /*
   * ÖĞRENCİNİN SEÇİM BÖLÜMLERİ (C1 · 5 Ağustos 2026).
   *
   * "Çalışma Gruplarım" ve "Danışmanım" sekmeleri menüden kalktı; ikisi de
   * artık bu sayfanın içinde bölüm. Sorgular ve formlar sekmelerdekiyle AYNI
   * kaynaktan geliyor (lib/danisman/atama.ts, lib/ogrenci/calisma-grubu.ts) —
   * ayrı yazılsalardı iki yüzey zamanla ayrışırdı.
   */
  const danismanVerisi = ogrenciMi(kullanici)
    ? await danismanSecimVerisiGetir(kullanici)
    : null;
  const atama = danismanVerisi?.atama ?? null;

  const calismaGruplari = ogrenciMi(kullanici)
    ? await calismaGruplariniGetir(kullanici.id)
    : null;
  const grupSayisi = calismaGruplari?.seciliIdler.size ?? 0;

  /*
   * ---------------------------------------------------------------------
   * PROFİL DÜZENLEME VERİSİ (C4 · 7 Ağustos 2026)
   * ---------------------------------------------------------------------
   * İstek profil ile paneli iki yüzeye böldü: `/panel/profil` GÖSTERİR,
   * burası DÜZENLER. Formların ihtiyaç duyduğu veri bu yüzden Panelim'e
   * taşındı.
   *
   * Sorgular TEK SEFERDE ve paralel: Panelim kullanıcının ilk gördüğü ekran
   * ve zaten yarım düzine sorgu çalıştırıyor; art arda beklemek açılışı
   * gözle görülür yavaşlatırdı. Hepsi oturumdaki kişinin kendi satırlarına
   * bakıyor ve birincil anahtar/dizin üzerinden gidiyor.
   *
   * Bölümler KATLI geliyor (aşağıda), yani içerikleri açılmadan görünmüyor —
   * ama veri yine de sunucuda hazırlanmak zorunda: sayfada JavaScript yok ve
   * `<details>` açıldığında sunucuya gidilmiyor.
   */
  const [
    profilKaydi,
    fotoSinirlari,
    belgeSinirlari,
    cvSinirlari,
    programlar,
  ] = await Promise.all([
    prisma.kullanici.findUniqueOrThrow({
      where: { id: kullanici.id },
      select: {
        ad: true,
        soyad: true,
        kurumKodu: true,
        fotoYuklenmeTarihi: true,
        /*
         * HAKKIMDA (13 Ağustos 2026 · istek: "panele hakkımda bölümü ekle,
         * profilde görünsün, elle uzmanlıklarını üzerinde çalıştığı projeleri
         * yazsın"). Alan zaten vardı ve yalnızca Akış'tan düzenlenebiliyordu;
         * Akış'a hiç uğramayan kullanıcı için görünmez bir alandı.
         */
        hakkinda: true,
        ogrenciProfil: true,
        ogretmenProfil: {
          select: {
            eposta: true,
            telefon: true,
            cvDosyaAdi: true,
            cvYuklenmeTarihi: true,
            /*
             * Dış kullanıcının kendi yazdıkları (7 Ağustos 2026). Öğretmende de
             * seçiliyor ama formu basılmıyor: alan listesini role göre ikiye
             * bölmek, aynı sorgunun iki sürümünü doğururdu ve seçilen sütunlar
             * öğretmende zaten null.
             */
            githubUrl: true,
            kisiselSiteUrl: true,
            linkedinUrl: true,
            kurumAdi: true,
            gorevUnvani: true,
            aciklama: true,
            // YEĞİTEK Okul Sorumluluğu bölümünün durumu (13 Ağustos 2026).
            yegitekOkulSorumlusu: true,
            yegitekIsaretlemeTarihi: true,
          },
        },
        kazanimlar: {
          // Kullanıcının girdiği tarih boş olabildiği için ikinci sıralama
          // ölçütü gerekiyor; yoksa tarihsiz kayıtların sırası belirsiz kalır.
          orderBy: [{ tarih: "desc" }, { olusturmaTarihi: "desc" }],
          include: {
            ekler: {
              select: { id: true, dosyaAdi: true },
              orderBy: { yuklenmeTarihi: "asc" },
            },
            baglantilar: {
              select: { id: true, adres: true, etiket: true },
              orderBy: { siraNo: "asc" },
            },
          },
        },
      },
    }),
    // Fotoğraf sınırları role bakılmadan alınır: bölüm herkeste var.
    profilFotoSinirlariniGetir(),
    /*
     * Destekleyici belge sınırları etkinlik ekleriyle ORTAKTIR: ikisi de aynı
     * türde içerik taşıyor. Ayrışmaları gerekirse değişecek tek yer
     * lib/kazanim/ek.ts.
     */
    kazanimEkSinirlariniGetir(),
    // CV artık öğretmende de var (7 Ağustos 2026); sınırlar ortak.
    cvSinirlariniGetir(),
    /*
     * Kazanım formunun "GençTek etkinliği" listesi, faaliyet formununkiyle
     * AYNI kaynaktan gelir. Pasife alınmışlar teklif edilmez; geçmiş
     * kayıtların bağlantısı korunur.
     */
    prisma.temelEtkinlikProgrami.findMany({
      where: { aktif: true },
      orderBy: [{ grup: "asc" }, { siraNo: "asc" }],
      select: { id: true, ad: true, grup: true },
    }),
    /*
     * "Rotam" hedefleri BURADA SORGULANMIYOR (14 Ağustos 2026 · istek: "rotam
     * kalksın"): bölüm Panelim'den kalktı, veri de onunla birlikte. Hedefler
     * profil ekranında okunmaya devam ediyor.
     */
  ]);

  /*
   * MENTÖRLÜK (7 Ağustos 2026). Öğrenciye sorulmaz — mentörlük 18 yaş altı bir
   * kullanıcıyla birebir yazışma hakkı doğurur ve karşı taraf yetişkin olmalı
   * (bkz. lib/yetki/izinler.ts · mentorlukBasvurabilirMi).
   *
   * Grup listesi çalışma grubu seçimindekiyle AYNI kaynaktan gelir; pasife
   * alınmış grup teklif edilmez.
   */
  /*
   * YALNIZCA KENDİ KAYDI ÇEKİLİYOR (13 Ağustos 2026). Başvuru formu panoya
   * taşındığı için grup listesine ve seçili gruplara burada gerek kalmadı;
   * panelde kalan tek şey durumu gösteren kart.
   */
  const mentorlugum = mentorlukBasvurabilirMi(kullanici)
    ? await mentorluguGetir(kullanici.id)
    : null;

  /*
   * Üyesi olunan AKTİF ekip sayısı — "Ekiplerim" kartı için (13 Ağustos 2026).
   * Herkese soruluyor: ekibe öğrenci de öğretmen de mezun da eklenebiliyor ve
   * tek `count` sorgusu, rol dallanması yazmaktan ucuz.
   */
  const ekipSayim = await ekipSayimiGetir(kullanici.id);

  /*
   * "ÇALIŞMA GRUPLARI" — dış kullanıcının katkı verebileceği alanlar
   * (7 Ağustos 2026 · istek: "2. sekme Panel · Foto ekle ·
   * Mentörlüklerim/desteklerim · Çalışma Grupları").
   *
   * Mentörlük verisinden AYRI sorgu ve ayrı tablo: mentörlük onaya tabi bir
   * görevdir, burası yalnızca bir beyandır. Grup listesi ikisinde de aynı
   * kaynaktan geliyor — pasife alınmış grup hiçbirinde teklif edilmez.
   */
  const destekVerisi = disKullaniciMi(kullanici)
    ? await Promise.all([
        prisma.calismaGrubu.findMany({
          where: { aktif: true },
          orderBy: { siraNo: "asc" },
          select: { id: true, ad: true },
        }),
        prisma.kullaniciDestekGrubu.findMany({
          where: { kullaniciId: kullanici.id },
          select: { calismaGrubuId: true },
        }),
      ])
    : null;

  const kazanimSahibi = ogrenciMi(kullanici) ? "OGRENCI" : "OGRETMEN";

  /*
   * Kayıt ekleme formunun türü ADRESTEN gelir: alanlar türe göre değişiyor
   * (derece yalnızca yarışmada var) ve sayfada JavaScript yok, dolayısıyla
   * form sunucuda o türe göre basılmak zorunda.
   */
  const seciliTur =
    istenenTur && kazanimTipiGecerliMi(istenenTur) ? istenenTur : VARSAYILAN_TUR;
  const seciliTanim = kazanimTipiTanimi(seciliTur, kazanimSahibi);

  const izinliBelgeTipleri = [
    ...belgeSinirlari.izinliGorselTipleri,
    ...belgeSinirlari.izinliBelgeTipleri,
  ];

  /*
   * Adresin sonundaki sürüm damgası, yeni fotoğraf yüklendiğinde tarayıcının
   * eskisini göstermesini engeller: rota kısa ömürlü bir ön bellek bıraktığı
   * için adres değişmezse görsel güncellenmiş görünmezdi.
   */
  const fotoAdresi = profilKaydi.fotoYuklenmeTarihi
    ? uygulamaYolu(
        `/panel/profil/foto?s=${profilKaydi.fotoYuklenmeTarihi.getTime()}`,
      )
    : null;

  /*
   * Danışmanlık işareti yalnızca okulunda görev alabilecek öğretmene sorulur.
   * YEĞİTEK personelinin ve il koordinatörünün okulu yoktur (kurum kodu boş),
   * ayrıca il koordinatörü aynı anda danışman olamaz — bu bölümü onlara
   * göstermek yapılamayacak bir işi teklif etmek olurdu.
   */
  const danismanlikSecimiGosterilir =
    !ogrenciMi(kullanici) &&
    !ilKoordinatoruMu(kullanici) &&
    !projeYoneticisiMi(kullanici) &&
    profilKaydi.kurumKodu !== null;

  /*
   * Öğretmenin bağlı olduğu il koordinatörü.
   *
   * Koordinatörün KENDİSİNE gösterilmez (kendi adını kart olarak görmesi
   * anlamsız), proje yöneticisine de gösterilmez (tek bir ile bağlı değil).
   * Öğrenciye de gösterilmez: onun muhatabı danışman öğretmenidir.
   */
  /*
   * Merkez istatistikleri ülke geneli sayımdır ve yalnızca proje yöneticisine
   * gösterilir; başka rollerde sorgu hiç çalıştırılmaz.
   */
  const merkezIstatistik = projeYoneticisiMi(kullanici)
    ? await merkezIstatistikleriniGetir(kullanici.egitimOgretimYili)
    : null;
  const katilim = projeYoneticisiMi(kullanici)
    ? await faaliyetKatilimSayisi()
    : null;
  /*
   * Boşluklar sayımdan AYRI çekiliyor ve ekranda ayrı gösteriliyor: "kaç
   * öğrenci var" ile "kaç öğrenci danışmansız" farklı sorular. Tek listede
   * olsalardı acil olanlar sayım kalabalığında kaybolurdu.
   */
  /*
   * BÖLÜM ARTIK KARAR VERENDE DE VAR (13 Ağustos 2026 · inceleme bulgusu):
   * danışman ve il koordinatörü kendi kapsamlarındaki bekleyen işleri görüyor.
   * Hangi satırın hangi rolde basılacağını kural katmanı belirliyor
   * (bkz. lib/rapor/istatistik.ts · bekleyenIsleriGetir); ekran yalnızca
   * `null` gelen satırı atlıyor. Merkezin gördüğü altı satır değişmedi.
   */
  const bosluklar = await bekleyenIsleriGetir(kullanici);

  /*
   * "İl koordinatörüm" kartı, ilinde kime bağlı olduğunu bilmesi gereken okul
   * personeline gösterilir. Dış kullanıcılar (mezun, paydaş temsilcisi)
   * DIŞARIDA: koşul yalnızca "ili var ve öğrenci/koordinatör değil" deseydi,
   * kart onlara da koordinatörün adını ve e-postasını basardı — dar başlangıç
   * kararına aykırı.
   */
  const koordinatorGosterilir =
    !ogrenciMi(kullanici) &&
    !ilKoordinatoruMu(kullanici) &&
    !projeYoneticisiMi(kullanici) &&
    !disKullaniciMi(kullanici) &&
    kullanici.ilKodu !== null;

  const ilKoordinatorum = koordinatorGosterilir
    ? await ilKoordinatoruOzeti(kullanici.ilKodu as string)
    : null;

  /*
   * Kişinin kendi başvuruları. Katılımcı öğretmen de olabildiği için koşul
   * "öğrenci mi" değil "başvurabilir mi" sorusudur (analiz dokümanı 4.2).
   */
  const basvuruSayisi = basvuruYapabilirMi(kullanici)
    ? await prisma.basvuru.count({
        where: { katilimciId: kullanici.id, durum: { not: "GERI_CEKILDI" } },
      })
    : 0;

  const simdi = new Date();

  /*
   * Kişinin SIRADAKİ kendi etkinliği. Takvimin cevaplamadığı soru bu: takvim
   * kapsamdaki her etkinliği gösteriyor, bu ise kişinin o gün orada olması
   * gerekenini. Ölçüt rol değil kişisel bağdır — ayrıntı ve gerekçeler
   * lib/faaliyet/yaklasan.ts başlığında.
   */
  const yaklasanEtkinligim = await yaklasanEtkinligimiGetir(
    kullanici.id,
    simdi,
  );

  /*
   * Etkinlik takvimi (analiz dokümanı Bölüm 6): kapsamdaki faaliyetler
   * geçmiş / bugün / yaklaşan olarak ayrılır. Ayırma işi saf bir fonksiyonda
   * (lib/faaliyet/takvim.ts), burada yalnızca veri çekiliyor.
   *
   * Geçmiş liste sınırsız büyümesin diye pencere daraltılıyor: yaklaşanların
   * hepsi, geçmişin son 90 günü. Takvim bir arşiv değil, "şu sıralar ne var"
   * ekranıdır; arşive Faaliyetler ekranından bakılır.
   */
  const doksanGunOnce = new Date(simdi.getTime() - 90 * 24 * 60 * 60 * 1000);
  const takvimFaaliyetleri = await prisma.faaliyet.findMany({
    where: {
      AND: [faaliyetKapsamFiltresi(kullanici), { tarih: { gte: doksanGunOnce } }],
    },
    orderBy: { tarih: "asc" },
    select: {
      id: true,
      ad: true,
      tarih: true,
      kapsam: true,
      durum: true,
      onayDurumu: true,
      duzenleyenBirim: true,
      basvuruBaslangic: true,
      basvuruBitis: true,
    },
  });

  const takvim = takvimeAyir(takvimFaaliyetleri, simdi);

  /*
   * Şeride yalnızca YAYINDAKİ faaliyetler girer: onay bekleyen bir faaliyet
   * düzenleyenine görünüyor olabilir ama "başvuru açık" demek yanıltıcı olurdu.
   */
  const seritKayitlari = basvuruYapabilirMi(kullanici)
    ? seritteGosterilecekler(
        takvimFaaliyetleri.filter(
          (faaliyet) =>
            faaliyet.onayDurumu === "ONAY_GEREKMEZ" ||
            faaliyet.onayDurumu === "ONAYLANDI",
        ),
        simdi,
      )
    : /*
       * Şerit "başvuru açık" der; başvuramayana göstermek yanıltıcı olurdu.
       * Merkez personeli ve dış kullanıcılar etkinlikleri takvimde görmeye
       * devam eder, sadece bu çağrı şeridini görmez.
       */
      [];
  const acikFaaliyetSayisi = seritKayitlari.length;

  const onayBekleyenSayisi = projeYoneticisiMi(kullanici)
    ? await prisma.faaliyet.count({ where: { onayDurumu: "BEKLIYOR" } })
    : 0;

  /*
   * İL KOORDİNATÖRÜNÜN İKİ ONAY KUYRUĞU (11 Ağustos 2026).
   *
   * Koordinatörün panelinde tek bir sayı bile yoktu; menüdeki "İl Dışı
   * Başvurular" satırı, içinde iş olup olmadığını söylemediği için hiç
   * tıklanmıyordu. Sonuç: Ağrı'daki öğrenci İstanbul'daki bir etkinliğe
   * başvuruyor, kararı bekleyen tek kişi koordinatör oluyor ve başvuru
   * kimsenin haberi olmadan BEKLIYOR'da kalıyordu.
   *
   * İkisi AYRI sayı olarak duruyor çünkü ayrı işler: biri "ilimde açılan
   * etkinliği yayına alayım mı", öbürü "öğrencimi başka ile göndereyim mi".
   * Tek sayıda toplasaydık tıklanan yer hangi işe gittiğini söylemezdi.
   */
  const koordinatorOnayKuyrugu = ilKoordinatoruMu(kullanici)
    ? {
        etkinlik: await prisma.faaliyet.count({
          where: {
            AND: [
              faaliyetKapsamFiltresi(kullanici),
              { onayDurumu: "BEKLIYOR" },
              /*
               * KENDİ AÇTIĞI ELENİR. Kapsam filtresi kişinin kendi
               * etkinliklerini onay durumundan bağımsız gösteriyor, dolayısıyla
               * koordinatörün merkez onayını bekleyen ULUSAL etkinliği de bu
               * sayıya giriyordu. Kimse kendi işini onaylamaz
               * (bkz. ilKoordinatoruOnaylayabilirMi); sayı "sizi bekleyen iş"
               * demek olduğuna göre orada görünmemeli.
               */
              { duzenleyenKullaniciId: { not: kullanici.id } },
            ],
          },
        }),
        ilDisi: await prisma.basvuru.count({
          where: {
            AND: [
              ilDisiBasvuruFiltresi(kullanici),
              { kaynakIlOnayDurumu: "BEKLIYOR" },
              { durum: "BEKLIYOR" },
            ],
          },
        }),
      }
    : null;

  /*
   * BAŞVURUYA AÇIK FAALİYET SORGUSU KALKTI (13 Ağustos 2026). Panelin altındaki
   * liste kaldırıldığı için (bkz. aşağıdaki not) tek tüketicisi kalmamıştı;
   * sorgu durmaya devam etseydi her panel açılışında beş faaliyet ve onların
   * tüm başvuruları boşuna okunurdu.
   *
   * SAYI KAYBOLMADI: karttaki `acikFaaliyetSayisi` mesaj şeridinin kayıtlarından
   * (`seritKayitlari`) geliyor ve o sorgu duruyor.
   */

  /*
   * Katılımcı olabilen herkesin tamamlanmış katılımları — ÖĞRENCİ DAHİL
   * (12 Ağustos 2026 · istek: "öğrencinin panel sayfasındaki kartlara katıldığı
   * etkinlik sayısını da yazalım").
   *
   * Öğrenci daha önce dışarıdaydı: listenin tamamı zaten profilindeki katkı
   * kartında duruyor. Ama sayı ile liste aynı şey değil — öğrencinin panelinde
   * danışmanı, çalışma grubu ve başvuru sayısı varken katıldığı etkinlik
   * sayısının olmaması, üç kartın anlattığı hikâyeyi yarım bırakıyordu:
   * "başvurdum" var, "katıldım" yoktu.
   *
   * Sorgu tek yerden geliyor (katilimGecmisiGetir), yani sayı profildeki
   * listeyle aynı kuraldan doğuyor; ayrı sayılsaydı ikisi ayrışabilirdi.
   */
  const katilimGecmisi = basvuruYapabilirMi(kullanici)
    ? await katilimGecmisiGetir(kullanici.id, simdi)
    : null;

  /*
   * Katkı kartının özeti — yalnızca kartı BASILAN rollerde sorulur (danışman
   * öğretmen ve il koordinatörü). Herkese sorulsaydı öğrencinin ve merkezin
   * panelinde hiç kullanılmayan üç sayım daha açılırdı.
   */
  const katkiOzeti =
    danismanMi(kullanici) || ilKoordinatoruMu(kullanici)
      ? katkiKartiMetni(await ogretmenKatkiSayilariGetir(kullanici.id))
      : null;

  const rolsuzMu = kullanici.roller.length === 0;

  return (
    <div className="space-y-8">
      {/*
        VİTRİN (18 Ağustos 2026 · tasarım yenilemesi). Panel sistemin açılış
        ekranı: kullanıcı giriş yaptıktan sonra buraya düşüyor ve rengi tam
        güçte gördüğü tek yer burası olmalı — gövdenin geri kalanı beyaz
        kartlardan oluşuyor, her sayfaya kırmızı blok koymak vurguyu değersiz
        kılardı.

        Düğmeler kenar çubuğundakilerin TEKRARI DEĞİL: kenar çubuğu nereye
        gidilebileceğini sayar, buradaki iki düğme bugün ne yapılacağını söyler
        — açık başvuru varsa etkinliklere, yoksa panoya.
      */}
      <Vitrin
        ustBaslik={`${kullanici.egitimOgretimYili} eğitim-öğretim yılı`}
        baslik={`Hoş geldiniz, ${kullanici.ad}`}
        aciklama="Bugün sizi bekleyen işler, yaklaşan etkinlikleriniz ve kayıtlarınız aşağıda."
        eylem={
          <>
            <Link href="/panel/etkinlikler" className={SINIF_VITRIN_BUTON}>
              <CalendarDays size={16} aria-hidden />
              Etkinlikler
              {acikFaaliyetSayisi > 0 && (
                <span className="rounded-full bg-vurgu-zemin px-2 py-0.5 text-xs font-bold">
                  {acikFaaliyetSayisi} açık
                </span>
              )}
            </Link>
            <Link
              href="/panel/talepler"
              className={SINIF_VITRIN_IKINCIL_BUTON}
            >
              Panoya git
            </Link>
          </>
        }
      />

      {/* Başvurusu açık faaliyetler, takvimden ÖNCE ve akan şerit hâlinde:
          kaçırılırsa geri dönüşü olmayan tek bilgi budur. */}
      {secimDurumu && DURUM_MESAJLARI[secimDurumu] && (
        <BilgiKutusu cesit="olumlu">
          {DURUM_MESAJLARI[secimDurumu]}
        </BilgiKutusu>
      )}
      {seciimHatasi && <BilgiKutusu cesit="hata">{seciimHatasi}</BilgiKutusu>}

      {/*
        Sarı şerit artık BAŞVURU değil MESAJ duyuruyor (6 Ağustos 2026).
        Başvuru bilgisi aşağıdaki "Başvurusu açık etkinlik" sayacında ve
        kartında duruyor; `seritKayitlari` o sayacı beslemeye devam ediyor.
      */}
      <MesajSeridi mesajlar={bildirimler} toplam={okunmamisMesajSayisi} />

      {/*
        Dış kullanıcının panelinde ölçüm kartlarının çoğu boş kalır (başvurusu,
        danışmanı, çalışma grubu yok). Boş bir ekran bırakmak yerine ne
        yapabileceği açıkça yazılıyor — ve ne YAPAMAYACAĞI da: yetki kapsamı
        dar başladı, kullanıcı bunu ekranda görmeli, denemelerinden çıkarmaya
        çalışmamalı.
      */}
      {disKullaniciMi(kullanici) && (
        <div className="rounded-kart border border-cizgi bg-kart p-6 shadow-kart">
          <h2 className="font-semibold text-baslik">
            {mezunMu(kullanici) ? "Mezun hesabınız" : "Paydaş temsilcisi hesabınız"}
          </h2>
          {/*
            METİN MENÜYLE AYNI ŞEYİ SÖYLEMELİ (13 Ağustos 2026 · inceleme
            bulgusu). Kutu "onaylanan bağlantılar üzerinden yazışabilirsiniz"
            diyordu ama Bağlantılarım sekmesi bu rollerde basılmıyordu; vaadin
            karşılığı ekranda yoktu. Sekme eklendi (bkz. panel/layout.tsx) ve
            cümle, bugün açık olan üç alanın tamamını sayıyor.
          */}
          <p className="mt-2 text-metin-yumusak">
            Etkinlik takvimini ve panoyu görebilir, panoda ilan açabilir,
            onaylanan bağlantılar üzerinden yazışabilir, akışta paylaşım
            yapabilir ve markete ürün ekleyebilirsiniz. Öğrenci ve öğretmen
            kayıtlarına erişiminiz yoktur; etkinliklere katılımcı olarak
            başvuru şu an açık değildir.
          </p>
          <Link href="/panel/talepler" className={`${SINIF_BIRINCIL_BUTON} mt-4`}>
            Panoya git
          </Link>
        </div>
      )}

      {/*
        GÖREV ALMAMIŞ ÖĞRETMENİN TEK KAPISI (12 Ağustos 2026 · istek: "görevi
        işaretle deyince bir şey değişmiyor, öğretmen hâlâ görev almadı
        görünüyor").

        Düğme, sayfanın kendisine inen bir çıpaya (`#danismanligim`) bakıyordu;
        o bölüm 7 Ağustos'ta Öğrencilerim ekranına taşındı, çıpa geride kaldı ve
        tıklamanın hiçbir karşılığı olmadı. Taşındığı ekran da 11 Ağustos'ta
        kapandı (bkz. ogrenciEnvanteriGorebilirMi): görev almamış öğretmen artık
        Öğrencilerim'i açamıyor ve menüsünde sekmesi de yok — yani işareti
        koyabileceği hiçbir yer kalmamıştı.

        Bu yüzden FORMUN KENDİSİ buraya alındı, bağlantı değil: görevi olmayan
        öğretmenin gördüğü tek ekran Panelim ve işaret onun için bir adım değil,
        sistemi kullanmaya başlama koşulu. Eylem Öğrencilerim ekranındakiyle
        aynı (`danismanlikIsaretiEylemi`), yani kural tek yerde; görev alındıktan
        sonra o ekran zaten açılıyor ve kullanıcı oraya yönleniyor.
      */}
      {rolsuzMu && (
        <div className="rounded-kart border border-uyari-cizgi bg-uyari-zemin p-6">
          <h2 className="font-semibold text-uyari-metin">
            GençTek danışman öğretmenliği
          </h2>
          <p className="mt-2 text-uyari-metin">
            Sisteme giriş yaptınız ancak henüz danışman öğretmen görevi
            almadınız. Okulunuzdaki öğrencilerin danışman seçim listesinde
            görünmek için bu görevi işaretlemeniz gerekiyor. Onay süreci yoktur.
          </p>
          {/*
            KURUM KODU OLMAYANA DÜĞME BASILMAZ: kural katmanı okulsuz kullanıcıyı
            reddediyor (bkz. danismanlikDurumunuDegistir) ve basılan düğmenin
            hata vermesi, hiç basılmamasından daha kötü. Bu kişinin işi kayıt
            düzeltmesidir, tıklama değil.
          */}
          {kullanici.kurumKodu === null ? (
            <p className="mt-4 text-sm text-uyari-metin">
              Kaydınızda okul bilgisi görünmüyor; görevi işaretleyebilmek için
              okul kaydınızın tamamlanması gerekiyor.
            </p>
          ) : (
            <form action={danismanlikIsaretiEylemi} className="mt-4">
              <input type="hidden" name="gorevAlmakIstiyor" value="evet" />
              <button type="submit" className={SINIF_BIRINCIL_BUTON}>
                Görevi işaretle
              </button>
            </form>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/*
          YAKLAŞAN ETKİNLİĞİM — IZGARANIN BAŞINDA (13 Ağustos 2026).

          Kartların geri kalanı ayar ve sayım: danışman seçimi, grup seçimi,
          başvuru adedi. Bunlarda acele yoktur. Buradaki tek tarihli taahhüt
          bu kart, o yüzden en önde: "sırada ne var" sorusunun cevabı, üç sayım
          kartının altında durmamalı.

          KAYDI YOKSA HİÇ BASILMIYOR. Boş hâlde "yaklaşan etkinliğiniz yok +
          başvuruya açık etkinliklere bak" yazmak akla geldi ama ikinci cümlenin
          karşılığı zaten "Başvurusu açık etkinlik" kartı ve o herkeste
          basılıyor; aynı kapıyı iki kez açmak olurdu. Boş kart göstermeme
          kuralı Ekiplerim kartındakiyle aynı.

          DEĞER = ETKİNLİK ADI, açıklama = tarih · kalan gün · SIFAT. Sıfat
          şart: aynı kart hem "oraya katılıyorsun" hem "orayı sen düzenliyorsun"
          diyebiliyor ve ikisi çok farklı işler. Başlığın söylediğiyle
          bağlantının götürdüğü yerin ayrışması bu panelde daha önce gerçek bir
          hataya yol açtı (bkz. aşağıdaki "Onay bekleyen etkinlik" notu).
        */}
        {yaklasanEtkinligim && (
          <OlcumKarti
            baslik="Yaklaşan etkinliğim"
            Ikon={CalendarClock}
            deger={yaklasanEtkinligim.ad}
            aciklama={`${tarihYaz(yaklasanEtkinligim.tarih)} · ${etkinligeKalanYaz(
              yaklasanEtkinligim.tarih,
              simdi,
            )} · ${
              yaklasanEtkinligim.sifat === "DUZENLEYEN"
                ? "düzenleyensiniz"
                : "katılımcısınız"
            }`}
            yol={`/panel/etkinlikler/${yaklasanEtkinligim.id}`}
          />
        )}

        {ogrenciMi(kullanici) && (
          <>
            {/*
              KARTLAR SEÇİM SAYFALARINA GİDİYOR (14 Ağustos 2026 · istek:
              "bunlar kart olarak var alttakiler kalksın").

              12 Ağustos 2026'da bu iki kart aynı sayfanın altındaki katlanır
              bölüme iniyordu (`?bolum=…#capa`); o bölümler kalkınca hedef
              seçimin kendi sayfası oldu. Sayfalar zaten duruyordu ve danışmanı
              olmayan öğrencinin giriş kapısı hâlâ orası.
            */}
            <OlcumKarti
              baslik="Danışman öğretmenim"
              Ikon={UserCheck}
              deger={
                atama
                  ? `${atama.danisman.ad} ${atama.danisman.soyad}`
                  : "Atanmadı"
              }
              aciklama={
                atama ? "Değiştirmek için tıklayın" : "Seçmek için tıklayın"
              }
              yol="/panel/danisman-secim"
            />
            <OlcumKarti
              baslik="Çalışma grubu seçimim"
              Ikon={Layers}
              deger={String(grupSayisi)}
              aciklama="Güncellemek için tıklayın"
              yol="/panel/calisma-gruplari"
            />
            {/*
              ÖZDEĞERLENDİRME ENVANTERLERİ ARTIK KART (14 Ağustos 2026 · istek:
              "öz değerlendirme envanteri kartlara gelecek, alttan kalkacak").

              Alttaki katlanır bölüm zaten yalnızca bir cümle ve bir düğme
              taşıyordu; envanterin kendisi `/panel/algoritmam` ekranında.
              Katlanır bir kabuğun ardında duran tek düğme, kartın kendisinden
              fazlasını yapmıyordu.
            */}
            <OlcumKarti
              baslik="Özdeğerlendirme Envanterleri"
              Ikon={Compass}
              deger="Algoritmam"
              aciklama="Sonuçlar yalnızca sana görünür"
              yol="/panel/algoritmam"
            />
            <OlcumKarti
              baslik="Etkinlik başvurularım"
              Ikon={Send}
              deger={String(basvuruSayisi)}
              aciklama="Geri çekilenler hariç"
              yol="/panel/etkinlikler"
            />
            {/*
              BAŞVURU İLE KATILIM AYRI İKİ SAYI ve yan yana duruyorlar: biri
              "istedim", öbürü "gerçekten oldum". Yoklama geldiğinden beri
              (12 Ağustos 2026) ikisinin farkı gerçek bir bilgi — başvurusu
              seçilmiş ama gelmemiş öğrencide sayılar ayrışır.

              Kart profile gider: katılan etkinliklerin LİSTESİ orada, katkı
              kartının içinde. Buraya ikinci bir liste konulmadı.
            */}
            {katilimGecmisi && (
              <OlcumKarti
                baslik="Katıldığım etkinlikler"
                Ikon={CalendarCheck}
                deger={String(katilimGecmisi.ozet.toplamKatilim)}
                aciklama="Yoklamada geldi işaretlenenler · listesi profilinde"
                yol="/panel/profil"
              />
            )}
          </>
        )}

        {danismanMi(kullanici) && (
          <>
            {/*
              SAYI GÖSTEREN KART TIKLANABİLİR OLMALI (12 Ağustos 2026 · istek:
              "İlimdeki öğrenciler kartına tıklanmıyor, diğer kartlar tıklanabilir
              vaziyette"). Kartın gösterdiği sayı bir listenin uzunluğu; o listeye
              gitmenin yolu kartın kendisidir. Üç rolde de hedef aynı ekran,
              kapsamı kullanıcıdan geliyor (bkz. ogrenciKapsamFiltresi).
            */}
            {/*
              KARTIN ADI "ÖĞRENCİLERİM" (13 Ağustos 2026 · istek: "danışman
              öğretmenin öğrencilerim menüsü kalkacak … danışmanlığımdaki
              öğrenciler öğrencilerim olacak").

              Kart artık öğretmenin o ekrana giden TEK kapısı: menüdeki sekme
              aynı istekle kalktı (bkz. app/panel/layout.tsx). Adının menüden
              kalkan sekmeyle aynı olması bilinçli — öğretmen aradığı yeri eski
              adıyla arıyor.

              Sayı okul kapsamıdır, danışmanlık listesi değil (bkz.
              ogrenciKapsamFiltresi); açıklama satırı bunu yazıyor.
            */}
            <OlcumKarti
              baslik="Öğrencilerim"
              Ikon={Users}
              deger={String(kapsamdakiOgrenciSayisi)}
              aciklama="Kendi okulunuzdaki öğrenciler"
              yol="/panel/ogrenciler"
            />
            {/*
              KART ARTIK SAYI GÖSTERİYOR (12 Ağustos 2026 · istek: "katkı kartım
              kartında tıklayın diyor ama katkıların özeti yok kartta"). Metin
              tek yerde kuruluyor (lib/ogretmen/katki-ozeti.ts) — iki rolde iki
              ayrı cümle yazılsaydı biri güncellenip öbürü geride kalırdı.
            */}
            {katkiOzeti && (
              <OlcumKarti
                baslik="Katkı kartım"
                Ikon={Sparkles}
                deger={katkiOzeti.deger}
                aciklama={katkiOzeti.aciklama}
                yol="/panel/kazanimlarim"
              />
            )}
          </>
        )}

        {!ogrenciMi(kullanici) &&
          !projeYoneticisiMi(kullanici) &&
          katilimGecmisi && (
            <OlcumKarti
              baslik="Katıldığım etkinlikler"
              Ikon={CalendarCheck}
              deger={String(katilimGecmisi.ozet.toplamKatilim)}
              aciklama="Tamamlanmış etkinlikler"
              yol="/panel/kazanimlarim"
            />
          )}

        {koordinatorGosterilir && (
          <OlcumKarti
            baslik="İl koordinatörüm"
            Ikon={MapPin}
            deger={
              ilKoordinatorum
                ? `${ilKoordinatorum.ad} ${ilKoordinatorum.soyad}`
                : "Atanmadı"
            }
            /*
             * E-posta kişinin kendi girdiği alandır, boş olabilir. Boşken
             * "—" yazmak yerine ne yapılacağı söyleniyor: öğretmen
             * koordinatöre ulaşmak istediğinde çıkmaz sokakta kalmasın.
             */
            aciklama={
              ilKoordinatorum
                ? (ilKoordinatorum.eposta ??
                  "E-posta girilmemiş — okulunuz üzerinden ulaşın")
                : "İlinize henüz koordinatör atanmadı"
            }
          />
        )}

        {ilKoordinatoruMu(kullanici) && (
          <>
            <OlcumKarti
              baslik="İlimdeki öğrenciler"
              Ikon={MapPin}
              deger={String(kapsamdakiOgrenciSayisi)}
              aciklama={`İl kodu: ${koordinatorIlKodu(kullanici) ?? "—"}`}
              yol="/panel/ogrenciler"
            />
            {koordinatorOnayKuyrugu && (
              <>
                <OlcumKarti
                  baslik="Onay bekleyen etkinlik"
                  Ikon={ClipboardCheck}
                  deger={String(koordinatorOnayKuyrugu.etkinlik)}
                  aciklama="İlinizde açıldı, yayına almanızı bekliyor"
                  yol="/panel/etkinlikler?onay=bekleyen"
                />
                <OlcumKarti
                  baslik="İl dışına giden başvuru"
                  Ikon={ArrowRightLeft}
                  deger={String(koordinatorOnayKuyrugu.ilDisi)}
                  aciklama="Öğrenciniz başka ilin etkinliğine başvurdu"
                  yol="/panel/etkinlikler#il-disi"
                />
              </>
            )}
            {katkiOzeti && (
              <OlcumKarti
                baslik="Katkı kartım"
                Ikon={Sparkles}
                deger={katkiOzeti.deger}
                aciklama={katkiOzeti.aciklama}
                yol="/panel/kazanimlarim"
              />
            )}
          </>
        )}

        {projeYoneticisiMi(kullanici) && (
          <>
            <OlcumKarti
              baslik="Kayıtlı öğrenciler"
              Ikon={Users}
              deger={String(kapsamdakiOgrenciSayisi)}
              aciklama="Tüm iller"
              yol="/panel/ogrenciler"
            />
            {/*
              ONAY KUYRUĞU (11 Ağustos 2026 · istek: "öğrenci etkinlik açtığında
              proje yöneticisi her durumda onay verebilsin, öğrencinin ilinde
              koordinatör olmayabilir").

              KART İKİ YERİNDEN BİRDEN YANLIŞTI: başlığı "ulusal" diyordu ama
              sayı ülke genelindeki BÜTÜN bekleyen etkinlikleri sayıyor, buna
              karşılık bağlantı `?kapsam=ULUSAL` listesine götürüyordu. Yani
              koordinatörsüz bir ilde açılmış okul içi öğrenci etkinliği kartta
              sayılıyor ama tıklanınca açılan listede HİÇ görünmüyordu; merkez
              onaylamaya yetkili olduğu kaydı ancak doğrudan bağlantısını
              bilirse açabiliyordu. Yetki hep vardı (`faaliyetOnaylayabilirMi`
              proje yöneticisine koşulsuz evet der), eksik olan ona giden yoldu.

              Başlık ve bağlantı artık sayının kendisiyle aynı şeyi söylüyor.
            */}
            <OlcumKarti
              baslik="Onay bekleyen etkinlik"
              Ikon={ClipboardCheck}
              deger={String(onayBekleyenSayisi)}
              aciklama="Tüm kapsamlar · ülke geneli"
              yol="/panel/etkinlikler?onay=bekleyen"
            />
            {katilim && (
              <OlcumKarti
                baslik="Etkinlik katılımı"
                Ikon={Send}
                deger={String(katilim.toplamKatilim)}
                /*
                 * Toplam ve tekil AYRI sorulardır: ilki programın yükünü,
                 * ikincisi kaç farklı kişiye ulaşıldığını söyler. Tek sayı
                 * gösterilseydi "400 katılım" ile "120 öğrenciye ulaştık"
                 * birbirine karışırdı.
                 */
                aciklama={`${katilim.tekilKatilimci} farklı kişi · seçilmiş başvurular`}
              />
            )}
          </>
        )}

        <OlcumKarti
          baslik="Başvurusu açık etkinlik"
          Ikon={CalendarDays}
          deger={String(acikFaaliyetSayisi)}
          aciklama="Kapsamınızda şu an başvuru alanlar"
          yol="/panel/etkinlikler?acik=1"
        />

        {/*
          EKİPLERİM — ÜYENİN KAPISI (13 Ağustos 2026 · istek: "ekiplere
          katılanlarla mesajlaşma sohbet yapabilsin").

          Ekibi il koordinatörü kuruyor ve onun girişi Yönetim Paneli'ndeki
          kart. Üye ise yönetim panosunu açamaz; ekibine gidecek bir yolu
          olmasaydı, eklendiğine dair bildirimi alıp hiçbir yere
          gidemeyecekti.

          KART YALNIZCA ÜYELİĞİ OLANDA basılıyor: hiçbir ekibe eklenmemiş
          kullanıcıya boş bir kart göstermek, ondan yapması beklenen bir şey
          varmış izlenimi verirdi — ekibe kendi kendine katılamıyor.
        */}
        {ekipSayim > 0 && (
          <OlcumKarti
            baslik="Ekiplerim"
            Ikon={UsersRound}
            deger={String(ekipSayim)}
            aciklama="Üyesi olduğunuz ekipler ve sohbetleri"
            yol="/panel/ekipler"
          />
        )}

        {/*
          MENTÖRLÜKLERİM (13 Ağustos 2026 · istek: "mentörlüklerim isminde
          panele kartların oraya bir kartı ekle").

          Başvuru formu panoya taşındı; bu kart onun panelde bıraktığı iz ve
          aynı zamanda TEK GİRİŞİ — çapasıyla birlikte doğrudan bölüme iniyor.

          DEĞER DURUMU YAZAR, sayı değil: mentörlük tek kayıttır, "1" demek
          hiçbir şey anlatmazdı. Kaydı olmayan kişi "Başvurulmadı" görür ve
          karta tıklayınca başvuru formuna gider — kartın işi zaten o soruyu
          sordurmak.
        */}
        {mentorlugum !== null || mentorlukBasvurabilirMi(kullanici) ? (
          <OlcumKarti
            baslik="Mentörlüklerim"
            Ikon={GraduationCap}
            deger={
              mentorlugum
                ? MENTORLUK_DURUM_ETIKETLERI[mentorlugum.durum]
                : "Başvurulmadı"
            }
            aciklama={
              mentorlugum
                ? mentorKapsamiYaz(mentorlugum.grupAdlari, mentorlugum.konular)
                : "Bildiğiniz konularda öğrencilere yol gösterin"
            }
            /*
              ONAYLI MENTÖR KENDİ SAYFASINA GİDER, başvuru formuna değil
              (13 Ağustos 2026): onaylanmış kişinin sorusu "başvurum ne oldu"
              değil, "bana ne soruldu".
            */
            yol={
              mentorlugum?.durum === "ONAYLANDI"
                ? "/panel/mentorlugum"
                : "/panel/talepler/mentor-basvuru#mentorlugum"
            }
          />
        ) : null}
      </div>

      {/*
        BÖLÜM ÖLÇÜM KARTLARININ HEMEN ARDINA ALINDI (13 Ağustos 2026).

        Eskiden katlanır profil bölümlerinin (Fotoğrafım, Hakkımda, Kayıtlarım,
        CV) ALTINDA duruyordu. Merkezde bu göze batmıyordu; danışman ve
        koordinatöre açılınca sorun oldu: "2 bağlantı isteği bekliyor" satırı,
        beş katlanır kartın altında kaldığı için ekranda fiilen görünmüyordu ve
        bölümü onlara açmanın tek gerekçesi zaten görünürlüktü.

        Sıra artık işin aciliyetine göre: tarihli taahhüt (ölçüm kartları) →
        bekleyen iş → takvim → bildirimler. Katlanır bölümler kişinin kendi
        kaydını düzenlediği yer ve hiçbirinde bekleyen bir iş yok.
      */}
      {bosluklar && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-baslik">
            <CircleAlert size={18} className="text-uyari-metin" aria-hidden />
            Dikkat gerektirenler
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                etiket: "Danışmansız öğrenci",
                deger: bosluklar.danismansizOgrenci,
                alt: "Aktif danışman ataması yok",
                yol: "/panel/ogrenciler",
              },
              {
                etiket: "Raporsuz biten etkinlik",
                deger: bosluklar.raporsuzFaaliyet,
                alt: "Bitti ama raporu yazılmadı",
                yol: "/panel/raporlar",
              },
              {
                etiket: "Onay bekleyen etkinlik",
                deger: bosluklar.bekleyenFaaliyetOnayi,
                alt: "Öğrenci ve öğretmen önerileri dâhil",
                yol: "/panel/etkinlikler",
              },
              {
                etiket: "Bekleyen il dışı başvuru",
                deger: bosluklar.bekleyenIlDisiBasvuru,
                alt: "Kaynak ilin kararını bekliyor",
                yol: "/panel/etkinlikler#il-disi",
              },
              {
                etiket: "Bekleyen bağlantı isteği",
                deger: bosluklar.bekleyenBaglantiIstegi,
                alt: "Öğrenciler iletişim için bekliyor",
                yol: "/panel/yazismalar#istekler",
              },
              {
                etiket: "Belgesi eksik koordinatör",
                deger: bosluklar.belgesiEksikKoordinator,
                alt: "Taahhütname ya da gizlilik sözleşmesi onaylanmamış",
                yol: "/panel/rol-envanteri",
              },
            ]
              /*
               * `null` = "bu rolde gösterilmez"; sıfırdan AYRI bir durumdur ve
               * burada eleniyor. Sıfır aşağıda sönük ama görünür basılıyor —
               * ikisi karıştırılırsa danışman, ilinin danışmansız öğrenci sayısı
               * için "0" görür ve hiç kimsenin boşta olmadığını sanır.
               */
              .filter(
                (satir): satir is typeof satir & { deger: number } =>
                  satir.deger !== null,
              )
              .map((satir) => (
              <Link
                key={satir.etiket}
                href={satir.yol}
                /*
                 * Sıfır olan kart SÖNÜK gösteriliyor, gizlenmiyor: kaybolan
                 * kart "böyle bir ölçüt yok" izlenimi verirdi, oysa sıfır
                 * iyi haberdir ve görünmesi gerekir.
                 */
                className={`rounded-kart border bg-kart p-4 transition hover:border-vurgu ${
                  satir.deger > 0 ? "border-uyari-cizgi" : "border-cizgi"
                }`}
              >
                <p className="text-sm font-medium text-metin-yumusak">
                  {satir.etiket}
                </p>
                <p
                  className={`mt-1 text-2xl font-bold ${
                    satir.deger > 0 ? "text-uyari-metin" : "text-metin-yumusak"
                  }`}
                >
                  {satir.deger}
                </p>
                <p className="mt-0.5 text-sm text-metin-yumusak">{satir.alt}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/*
        EKOSİSTEM SAYILARI, DİĞER İKİ KART GRUBUNUN HEMEN ALTINDA (14 Ağustos
        2026 · istek: "proje yöneticisini panel sayfasında 3 farklı başlıkta
        kart grubu oluşturulmuş, bunların Ekosistem sayıları olanı alta kaymış
        diğer iki kartın altına al bunu").

        Bölüm sayfanın en dibindeydi: proje yöneticisinin panelinde ölçüm
        kartları ve "Dikkat gerektirenler" üstte, ekosistem sayıları ise yedi
        katlanır düzenleme bölümünün ardındaydı. Üçü de aynı türden — okunmak
        için basılmış kart ızgaraları — ve şimdi arka arkaya duruyorlar.
      */}
      {merkezIstatistik && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-baslik">
            <BarChart3 size={18} className="text-vurgu-metin" aria-hidden />
            Ekosistem sayıları
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                etiket: "Toplam öğrenci",
                deger: merkezIstatistik.toplamOgrenci,
                alt: "Aktif öğrenci rolü olan kayıtlar",
              },
              {
                etiket: "Çalışma grubuna kayıtlı",
                deger: merkezIstatistik.calismaGrubunaKayitliOgrenci,
                // Seçim değil ÖĞRENCİ sayılır: bir öğrenci birden çok grup
                // seçebiliyor, satır sayılsaydı sayı şişerdi.
                alt: "En az bir grup seçmiş öğrenci",
              },
              {
                etiket: "Okul temsilcisi",
                deger: merkezIstatistik.okulTemsilcisi,
                alt: "Bu eğitim-öğretim yılı",
              },
              {
                etiket: "İl temsilcisi",
                deger: merkezIstatistik.ilTemsilcisi,
                alt: "Bu eğitim-öğretim yılı",
              },
              {
                etiket: "İlçe temsilcisi",
                deger: merkezIstatistik.ilceTemsilcisi,
                alt: "Bu eğitim-öğretim yılı",
              },
              {
                etiket: "Danışman öğretmen",
                deger: merkezIstatistik.danismanOgretmen,
                alt: "Görevi süren danışmanlar",
              },
              {
                etiket: "İl koordinatörü",
                deger: merkezIstatistik.ilKoordinatoru,
                alt:
                  merkezIstatistik.koordinatorsuzIl > 0
                    ? `${merkezIstatistik.koordinatorsuzIl} il boş`
                    : "Tüm iller dolu",
              },
            ].map((satir) => (
              <div
                key={satir.etiket}
                className="rounded-kart border border-cizgi bg-kart p-4"
              >
                <p className="text-sm font-medium text-metin-yumusak">
                  {satir.etiket}
                </p>
                <p className="mt-1 text-2xl font-bold text-baslik">
                  {satir.deger}
                </p>
                <p className="mt-0.5 text-sm text-metin-yumusak">{satir.alt}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/*
        DANIŞMAN VE ÇALIŞMA GRUBU BÖLÜMLERİ KALKTI (14 Ağustos 2026 · istek:
        "panelde Danışman öğretmenim / Çalışma gruplarım … bunlar kart olarak
        var alttakiler kalksın").

        İkisi de sayfanın üstünde ZATEN kart olarak duruyordu (12 Ağustos
        2026'da tıklanabilir yapılmışlardı) ve kartlar aynı sayfanın altındaki
        katlanır bölüme iniyordu: aynı iş, aynı ekranda iki kez. Kartlar artık
        seçim SAYFALARINA gidiyor (`/panel/danisman-secim`,
        `/panel/calisma-gruplari`) — o sayfalar hiç silinmemişti, danışmansız
        öğrencinin giriş kapısı hâlâ orası (SKILL.md · Değişmezler 2).

        Seçim formu tek bileşenden basılmaya devam ediyor (DanismanSecimi,
        CalismaGrubuSecimi); kaybolan tek şey Panelim'deki ikinci kopya.
      */}

      {/*
        "KATKI GİRİŞİ" KARTI KALDIRILDI (7 Ağustos 2026). Kart, profildeki
        forma giden bir kestirmeydi ("Yeni kayıt ekle", "Sertifika ekle",
        "Topluluk ekle"). Form artık aşağıdaki "Kayıtlarım" bölümünde, aynı
        sayfada; kestirme kalsaydı kullanıcıyı bulunduğu sayfadan çıkarıp geri
        getiren bir bağlantıya dönüşürdü. Sertifika ve topluluk girişleri o
        bölümün sekmelerinde duruyor.
      */}

      {/*
        ---------------------------------------------------------------------
        PROFİL DÜZENLEME BÖLÜMLERİ (C4 · 7 Ağustos 2026)
        ---------------------------------------------------------------------
        Hepsi profilden BURAYA taşındı; profilde yalnızca gösterimleri kaldı.
        Bölümler KATLI: Panelim kullanıcının ilk gördüğü ekran ve asıl işi
        (başvurusu açık etkinlikler, takvim) yedi formun altında kalmamalı.
        Hiçbiri `baslangictaAcik` değil — danışman ve çalışma grubu
        seçimlerinden farkı bu: onlar yapılması GEREKEN işler, bunlar
        istendiğinde yapılan düzenlemeler.
      */}

      <KatlanabilirKart
        baslik="Fotoğrafım"
        aciklama="Yalnızca siz yükleyebilir ve kaldırabilirsiniz. e-Okul kayıtlarından gelmez; tek kopya tutulur, yeni yükleme öncekinin yerine geçer."
        Ikon={Camera}
        capa="fotografim"
        baslangictaAcik={acilacakBolum === "fotografim"}
      >
        <FotografDuzenleme
          ad={profilKaydi.ad}
          soyad={profilKaydi.soyad}
          fotoAdresi={fotoAdresi}
          sinirlar={fotoSinirlari}
          yukleEylemi={profilFotoYukleEylemi}
          silEylemi={profilFotoSilEylemi}
        />
        <ProfildeGorBaglantisi />
      </KatlanabilirKart>

      {/*
        HAKKIMDA (13 Ağustos 2026 · istek: "panele hakkımda bölümü ekle,
        profilde görünsün, elle uzmanlıklarını üzerinde çalıştığı projeleri
        yazsın").

        ALAN YENİ DEĞİL, KAPISI YENİ: `kullanici.hakkinda` Akış'la birlikte
        gelmişti ve yalnızca oradan düzenlenebiliyordu. Akış bir yayın akışıdır;
        kişinin kendini tanıtan metnini oraya girmesi, Akış'a hiç uğramayanlar
        için alanın var olmadığı anlamına geliyordu. Düzenleme artık Panel'de —
        profilin düzenlenen her alanı gibi (Profil GÖSTERİR, Panel DÜZENLER).

        EYLEM AYNI EYLEM (`hakkindaKaydetEylemi`) ve `donusYolu` ile buraya
        dönüyor: Akış'taki kutu olduğu gibi duruyor, iki form tek kuralı
        paylaşıyor. Metin sınırı da tek yerde (lib/akis/kurallar.ts).
      */}
      <KatlanabilirKart
        baslik="Hakkımda"
        aciklama="Uzmanlıklarınızı ve üzerinde çalıştığınız projeleri kendiniz yazın. Profilinizde ve Akış'ta görünür."
        Ikon={UserRound}
        capa="hakkimda"
        baslangictaAcik={acilacakBolum === "hakkimda"}
      >
        <form action={hakkindaKaydetEylemi} className="space-y-3">
          <input type="hidden" name="donusYolu" value="/panel" />
          <label className="block">
            <span className="text-sm font-medium text-metin">
              Hakkımda metni
            </span>
            <textarea
              name="hakkinda"
              rows={5}
              maxLength={HAKKINDA_MAKS}
              defaultValue={profilKaydi.hakkinda ?? ""}
              placeholder="Örn. Gömülü sistemler ve görüntü işleme üzerine çalışıyorum. Şu an okulumun TEKNOFEST takımında bir tarım drone'u projesi yürütüyorum."
              className={SINIF_GIRDI}
            />
            <span className="mt-1 block text-sm text-metin-yumusak">
              En fazla {HAKKINDA_MAKS} karakter. Telefon ve adres gibi iletişim
              bilgilerinizi buraya YAZMAYIN.
            </span>
          </label>
          <button type="submit" className={SINIF_BIRINCIL_BUTON}>
            Kaydet
          </button>
        </form>
        <ProfildeGorBaglantisi />
      </KatlanabilirKart>

      {/*
        YEĞİTEK OKUL SORUMLULUĞU (13 Ağustos 2026 · istek: "okuldaki danışman
        öğretmenlerden bazıları YEĞİTEK Okul Sorumlusu olarak görev alıyor
        olabilir, bununla ilgili panelde bir işaretleme alanı yapalım").

        YALNIZCA DANIŞMAN ÖĞRETMENDE: okulun YEĞİTEK muhatabı, okulda GençTek
        işini yürüten kişidir. Görev almamış öğretmenin panelinde bu bölüm
        olsaydı, işaret koyup hiçbir listede görünmediği bir hâl doğardı.

        ONAY YOK, İŞARET YETKİ DE VERMEZ: kişi kendi beyan eder, karşılığı
        merkezin yönetim panosundaki listede görünmektir (bkz. eylemler.ts).
        Bu yüzden bölüm, danışmanlık işaretiyle aynı sadelikte: tek düğme.
      */}
      {danismanMi(kullanici) && (
        <KatlanabilirKart
          baslik="YEĞİTEK Okul Sorumluluğu"
          aciklama="Okulunuzda YEĞİTEK Okul Sorumlusu olarak görevliyseniz işaretleyin. Onay gerektirmez; listeyi proje yöneticisi görür."
          Ikon={ShieldCheck}
          capa="yegitek-sorumlulugum"
          baslangictaAcik={acilacakBolum === "yegitek-sorumlulugum"}
        >
          <p className="text-metin">
            Durumunuz:{" "}
            <strong>
              {profilKaydi.ogretmenProfil?.yegitekOkulSorumlusu
                ? "YEĞİTEK Okul Sorumlusu olarak işaretli"
                : "İşaretli değil"}
            </strong>
            {profilKaydi.ogretmenProfil?.yegitekIsaretlemeTarihi && (
              <span className="text-metin-yumusak">
                {" · "}
                {tarihYaz(profilKaydi.ogretmenProfil.yegitekIsaretlemeTarihi)}
                {" tarihinde işaretlendi"}
              </span>
            )}
          </p>
          <form action={yegitekSorumlusuIsaretiEylemi} className="mt-4">
            <input
              type="hidden"
              name="sorumluMu"
              value={
                profilKaydi.ogretmenProfil?.yegitekOkulSorumlusu ? "hayir" : "evet"
              }
            />
            <button type="submit" className={SINIF_BIRINCIL_BUTON}>
              <ShieldCheck size={16} aria-hidden />
              {profilKaydi.ogretmenProfil?.yegitekOkulSorumlusu
                ? "İşareti kaldır"
                : "YEĞİTEK Okul Sorumlusuyum"}
            </button>
          </form>
        </KatlanabilirKart>
      )}

      <KatlanabilirKart
        baslik={
          // Dış kullanıcıda bölüm yalnızca iletişim değil kurum, görev ve katkı
          // açıklamasını da taşıyor; başlık bunu söylemezse kişi profilindeki
          // alanları burada aramaz.
          disKullaniciMi(kullanici) ? "Bilgilerim" : "İletişim bilgilerim"
        }
        aciklama={
          ogrenciMi(kullanici)
            ? "Bu alanları siz düzenleyebilirsiniz; profilinizde görünür."
            : disKullaniciMi(kullanici)
              ? "İletişim bilgileriniz, kurumunuz, göreviniz ve katkı açıklamanız. Hepsi profilinizde görünür."
              : "Bu alanları siz düzenleyebilirsiniz; kapsamınızdaki kişiler size buradan ulaşır."
        }
        Ikon={Mail}
        capa="iletisim-bilgilerim"
        baslangictaAcik={acilacakBolum === "iletisim-bilgilerim"}
      >
        <IletisimDuzenleme
          iletisim={
            ogrenciMi(kullanici)
              ? profilKaydi.ogrenciProfil
              : profilKaydi.ogretmenProfil
          }
          baglantilar={
            ogrenciMi(kullanici)
              ? profilKaydi.ogrenciProfil
              : profilKaydi.ogretmenProfil
          }
          /*
            Kurum/görev/açıklama YALNIZCA dış kullanıcıda basılır; `null`
            geçildiğinde bileşen o alanları hiç göstermiyor. Öğretmenin kurumu
            okuludur ve kimlik bilgilerinden gelir, elle yazılmaz.
          */
          kurumBilgileri={
            disKullaniciMi(kullanici) ? profilKaydi.ogretmenProfil : null
          }
          ogrenci={ogrenciMi(kullanici)}
          kaydetEylemi={profilGuncelleEylemi}
        />
        <ProfildeGorBaglantisi />
      </KatlanabilirKart>

      {/*
        "DANIŞMAN ÖĞRETMENLİĞİM" BÖLÜMÜ BURADAN KALKTI (7 Ağustos 2026 · istek:
        "GençTek Danışman Öğretmenliği Öğrencilerim sekmesine geçsin").
        İşaret ve durum artık Öğrencilerim ekranının başında — görevle o ekran
        aynı işin parçası.
      */}

      {/*
        "MENTÖR OLARAK BAŞVUR" BÖLÜMÜ PANODA (13 Ağustos 2026 · istek: "panelde
        mentör olarak başvur kalksın … paneldeki Mentör olarak başvur kısmını
        panoya al").

        Gerekçe yerin kendisinde: mentörlüğün karşılığı panoda — "Mentör talebi
        aç" formu ve mentör havuzu ızgarası orada. Başvuru burada dururken kişi,
        kabul ettiği görevin ne işe yaradığını göremiyordu.

        Panelde yerine SAYI KARTI kondu ("Mentörlüklerim"); yetki, kayıt ve
        onay akışı değişmedi (bkz. mentorluk/eylemler.ts).
      */}

      {/*
        ÇALIŞMA GRUPLARI (7 Ağustos 2026 · istek: dış kullanıcı panelinde
        "Mentörlüklerim/desteklerim · Çalışma Grupları").

        MENTÖRLÜK KARTININ ALTINDA ve ondan AYRI: mentörlük onaya giden bir
        başvurudur, gönderim onaylı kaydı yeniden onaya düşürür. Burası
        yalnızca bir beyandır ve kaydetmek onay gerektirmez. Tek forma
        alınsalardı destek alanını güncellemek isteyen kişi mentörlüğünü de
        onaya düşürürdü.
      */}
      {destekVerisi && (
        <KatlanabilirKart
          baslik="Çalışma gruplarım"
          aciklama="Hangi çalışma gruplarına katkı verebileceğinizi işaretleyin. Seçiminiz profilinizde görünür; onay gerektirmez."
          Ikon={Layers}
          capa="katki-alanlarim"
          baslangictaAcik={acilacakBolum === "katki-alanlarim"}
        >
          <DestekGruplariDuzenleme
            gruplar={destekVerisi[0]}
            seciliGrupIdleri={destekVerisi[1].map(
              (satir) => satir.calismaGrubuId,
            )}
            kaydetEylemi={destekGruplariEylemi}
          />
          <ProfildeGorBaglantisi />
        </KatlanabilirKart>
      )}

      <KatlanabilirKart
        baslik="Kayıtlarım"
        aciklama="Katıldığın etkinlikler, sertifikaların, toplulukların, ürünlerin ve derecelerin. Kayıtlar profilinde GençTek Yolculuğum ve Bilişim Yolculuğum bölümlerinde görünür."
        Ikon={Sparkles}
        capa="kayitlarim"
        /*
          Tür adreste geldiyse bölüm AÇIK gelir: sekme bağlantısına tıklayan
          kullanıcı, kapalı bir bölüme inip ne olduğunu anlamamalı.
        */
        baslangictaAcik={Boolean(istenenTur) || acilacakBolum === "kayitlarim"}
      >
        <KayitEklemeFormu
          sahip={kazanimSahibi}
          seciliTanim={seciliTanim}
          programlar={programlar}
          izinliBelgeTipleri={izinliBelgeTipleri}
          belgeSinirlari={belgeSinirlari}
          ekleEylemi={kazanimEkleEylemi}
        />

        <div className="mt-8 border-t border-cizgi pt-6">
          <h3 className="mb-4 text-base font-semibold text-baslik">
            Girdiğim kayıtlar
          </h3>
          <KayitYonetimi
            kazanimlar={profilKaydi.kazanimlar}
            sahip={kazanimSahibi}
            silmeEylemi={kazanimSilEylemi}
            belgeEkleEylemi={kazanimBelgeEkleEylemi}
            belgeSilEylemi={kazanimBelgeSilEylemi}
            izinliBelgeTipleri={izinliBelgeTipleri}
          />
        </div>
        <ProfildeGorBaglantisi />
      </KatlanabilirKart>

      <KatlanabilirKart
        baslik="Özgeçmişim (CV)"
        aciklama={
          ogrenciMi(kullanici)
            ? "Danışmanın, il koordinatörün ve proje yöneticisi profilinden açabilir."
            : "İl koordinatörünüz ve proje yöneticisi kaydınızdan açabilir."
        }
        Ikon={FileText}
        capa="cvm"
        baslangictaAcik={acilacakBolum === "cvm"}
      >
        <CvDuzenleme
          cv={
            ogrenciMi(kullanici)
              ? profilKaydi.ogrenciProfil
              : profilKaydi.ogretmenProfil
          }
          kullaniciId={kullanici.id}
          ogrenci={ogrenciMi(kullanici)}
          izinliTipler={cvSinirlari.izinliTipler}
          yukleEylemi={cvYukleEylemi}
          silEylemi={cvSilEylemi}
        />
        <ProfildeGorBaglantisi />
      </KatlanabilirKart>

      {/*
        ÖZDEĞERLENDİRME ENVANTERLERİ — Algoritmam (7 Ağustos 2026).
        İstek: "Özdeğerlendirme Envanterler- Algoritmam (ileride yz)".

        Sekme menüden kalktı, giriş buraya geldi. Envanterin KENDİSİ
        `/panel/algoritmam` ekranında kalıyor: madde madde ilerleyen bir
        uygulama ve katlanabilir bir bölüme sığmaz. Buradaki iş, girişi
        vermek ve sonucun kime görünür olduğunu söylemek.

        "İleride yz" — yapay zekâ ile öz değerlendirme sonraki faza bırakıldı
        (YAPILACAKLAR.md · K).
      */}
      {/*
        BÖLÜM KALKTI, KART KALDI (14 Ağustos 2026 · istek: "öz değerlendirme
        envanteri kartlara gelecek, alttan kalkacak"). Giriş yukarıdaki ölçüm
        kartlarında; envanterin kendisi `/panel/algoritmam` ekranında ve
        "sonuçlar yalnızca sana görünür" cümlesi o ekranın başında yazıyor.
      */}

      {/*
        ROTAM YALNIZCA ÖĞRENCİDE (11 Ağustos 2026 · istek: "rotam sadece
        öğrencide olacak, öğretmen koordinatör yönetici paydaş mentör bunlarda
        rotam olmayacak").

        Bölüm önce dış kullanıcılardan (7 ve 11 Ağustos), şimdi de yetişkin
        rollerin tamamından kalktı. Gerekçe aynı yerde birleşiyor: Rotam bir
        GELİŞİM aracıdır — "öğrenmek istediğim konu, katılmak istediğim
        yarışma". Öğretmenin, koordinatörün ve merkez personelinin sistemle
        ilişkisi gelişme değil YÜRÜTME; onlara hedef listesi sunmak, sistemin
        onları da yetiştirilecek biri gibi gördüğünü söylerdi.

        SAYFA VE EYLEMLER SİLİNMEDİ: hedef eylemleri rol kısıtı taşımıyor
        (bkz. hedef-eylemleri.ts) ve daha önce hedef girmiş bir öğretmenin
        kayıtları duruyor. Kalkan şey bölümün BASILMASI; kayıtlar profilinde
        görünmeye devam ediyor.
      */}
      {/*
        ROTAM PANELDEN KALKTI (14 Ağustos 2026 · istek: "rotam kalksın").

        Bölüm 7 ve 11 Ağustos'ta önce dış kullanıcılardan, sonra bütün yetişkin
        rollerden çekilmişti; şimdi öğrencide de basılmıyor, yani Panelim'de
        hiç yok.

        KAYITLAR VE EYLEMLER SİLİNMEDİ: hedef eylemleri rol kısıtı taşımıyor
        (bkz. hedef-eylemleri.ts) ve girilmiş hedefler PROFİLDE görünmeye devam
        ediyor. Kalkan şey Panelim'deki giriş bölümü — veri silinseydi geri
        alınamazdı, oysa bu bir ekran kararı.
      */}


      {/*
        "BAŞVURUYA AÇIK ETKİNLİKLER" ve "KATILDIĞIM ETKİNLİKLER" LİSTELERİ
        KALKTI (13 Ağustos 2026 · istek: "başvuruya açık etkinlikler panelde hem
        kartlarda hem altta var, alttaki kalkacak, kartlarda zaten var o
        duracak" · "paneldeki alttaki Katıldığım etkinlikler kalkacak, kartlarda
        zaten var").

        İkisi de yukarıdaki ölçüm kartlarında SAYIYLA duruyor ve kartlar
        tıklanabilir: "Başvurusu açık etkinlik" → /panel/etkinlikler?acik=1,
        "Katıldığım etkinlikler" → katılım listesi. Aynı bilgi hem kartta hem
        altta liste hâlinde basılınca panel iki kez aynı şeyi söylüyordu ve
        asıl işleri (Mevcut durum, Kayıtlarım, takvim) aşağı itiyordu.

        VERİ AKIŞI DURUYOR: `seritKayitlari` ve `katilimGecmisi` kartların
        sayılarını beslemeye devam ediyor, listeler yalnızca basılmıyor.
      */}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-baslik">
          <CalendarDays size={18} className="text-vurgu-metin" aria-hidden />
          Etkinlik takvimi
        </h2>

        {takvimFaaliyetleri.length === 0 ? (
          <Kart className="text-metin-yumusak">
            Kapsamınızda son 90 günün ve önümüzdeki dönemin etkinlik kaydı yok.
          </Kart>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              {
                baslik: "Bugün",
                liste: takvim.bugun,
                bos: "Bugün planlanmış etkinlik yok.",
                vurgulu: true,
              },
              {
                baslik: "Yaklaşan",
                liste: takvim.yaklasan,
                bos: "Yaklaşan etkinlik yok.",
                vurgulu: false,
              },
              {
                baslik: "Geçmiş (son 90 gün)",
                liste: takvim.gecmis,
                bos: "Son 90 günde etkinlik yok.",
                vurgulu: false,
              },
            ].map((bolum) => (
              <div
                key={bolum.baslik}
                className={`rounded-kart border bg-kart p-5 ${
                  bolum.vurgulu && bolum.liste.length > 0
                    ? "border-vurgu"
                    : "border-cizgi"
                }`}
              >
                <h3 className="text-sm font-semibold text-baslik">
                  {bolum.baslik}
                  <span className="ml-2 font-normal text-metin-yumusak">
                    {bolum.liste.length}
                  </span>
                </h3>

                {bolum.liste.length === 0 ? (
                  <p className="mt-3 text-sm text-metin-yumusak">{bolum.bos}</p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {/* Her bölümde en fazla beş kayıt: takvim özet, arşiv
                        değil. Tamamı Etkinlikler ekranında. */}
                    {bolum.liste.slice(0, 5).map((faaliyet) => (
                      <li key={faaliyet.id}>
                        <Link
                          href={`/panel/etkinlikler/${faaliyet.id}`}
                          className="text-sm font-medium text-metin transition hover:text-vurgu-metin hover:underline"
                        >
                          {faaliyet.ad}
                        </Link>
                        <p className="text-xs text-metin-yumusak">
                          {tarihYaz(faaliyet.tarih)} ·{" "}
                          {KAPSAM_ETIKETLERI[faaliyet.kapsam]}
                          {faaliyet.durum === "IPTAL_EDILDI"
                            ? " · iptal edildi"
                            : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}

                {bolum.liste.length > 5 && (
                  <p className="mt-3 text-xs text-metin-yumusak">
                    +{bolum.liste.length - 5} kayıt daha
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-baslik">
            <BellRing size={18} className="text-vurgu-metin" aria-hidden />
            Bildirimler
          </h2>
          {/*
            ARŞİVE GİRİŞ (12 Ağustos 2026 · istek: "okundu tıklandıktan sonra
            artık yok, bir yerlerde olsun — eski duyurulara nereden
            ulaşılabilir").

            Bu bölüm yalnızca OKUNMAMIŞLARI listeliyor ve öyle kalıyor: burası
            bir yapılacak listesi, okunan satır buradan düşmeli. Eksik olan,
            düşen satırın gittiği yerdi. Bağlantı bildirim OLMASA DA basılıyor —
            eski duyuruyu arayan kişinin okunmamış bildirimi olmayabilir.
          */}
          <div className="flex flex-wrap items-center gap-4">
            {bildirimler.length > 0 && (
              <form action={tumBildirimleriOkuEylemi}>
                <button
                  type="submit"
                  className="text-sm font-medium text-vurgu-metin"
                >
                  Tümünü okundu işaretle
                </button>
              </form>
            )}
            <Link
              href="/panel/bildirimler"
              className="inline-flex items-center gap-1 text-sm font-medium text-vurgu-metin"
            >
              Tüm bildirimler
              <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </div>
        {bildirimler.length === 0 ? (
          <Kart className="text-metin-yumusak">
            <span className="inline-flex items-center gap-2">
              <CheckSquare size={16} aria-hidden />
              Okunmamış bildiriminiz yok. Okuduklarınız{" "}
              <Link
                href="/panel/bildirimler"
                className="font-medium text-vurgu-metin underline underline-offset-2"
              >
                tüm bildirimler
              </Link>{" "}
              sayfasında duruyor.
            </span>
          </Kart>
        ) : (
          <ul className="space-y-2">
            {bildirimler.map((bildirim) => {
              const baglanti = bildirimBaglantisi(bildirim);

              return (
              /*
                `id`: üstteki "Mesajın var" şeridi doğrudan bu satıra iner.
                `scroll-mt-6`, çıpaya inildiğinde satırın ekranın en tepesine
                yapışmasını önler.
              */
              <li
                key={bildirim.id}
                id={`bildirim-${bildirim.id}`}
                className="flex scroll-mt-6 flex-wrap items-start justify-between gap-3 rounded-kart border border-cizgi bg-kart px-4 py-3"
              >
                <div>
                  <p className="font-medium text-metin">{bildirim.baslik}</p>
                  <p className="mt-1 text-sm whitespace-pre-line text-metin-yumusak">
                    {bildirim.icerik}
                  </p>
                </div>
                {/*
                  KAYDA GİT + OKUNDU (10 Ağustos 2026 · istek: "okundu
                  işaretlemenin yanına bir de etkinliğe git butonu olsun").

                  Bağlantı, bildirimle birlikte KAYDEDİLMİŞ hedeften üretilir;
                  metindeki addan aranmaz (bkz. lib/bildirim/hedef.ts). Hedefi
                  olmayan bildirimde düğme hiç basılmaz — danışman değişikliği
                  gibi bildirimlerin gidilecek bir kaydı yok, bu alanlar
                  eklenmeden önce yazılmış bildirimlerde de boş.

                  BİLDİRİM OKUNDUYA ÇEKİLMİYOR: gitmek okumak değildir ve
                  kullanıcı kaydı görüp geri döndüğünde bildirimi hâlâ
                  listesinde bulmalı. İşaretleme kararı onun.
                */}
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {baglanti && (
                    <Link
                      href={baglanti.yol}
                      className="inline-flex items-center gap-1 rounded-md border border-cizgi px-2.5 py-1 text-xs font-medium text-vurgu-metin transition hover:border-vurgu"
                    >
                      <ArrowRight size={13} aria-hidden />
                      {baglanti.etiket}
                    </Link>
                  )}
                  <form action={bildirimOkunduEylemi}>
                    <input
                      type="hidden"
                      name="bildirimId"
                      value={bildirim.id}
                    />
                    <button
                      type="submit"
                      aria-label="Okundu işaretle"
                      className="rounded-md border border-cizgi px-2.5 py-1 text-xs font-medium text-metin-yumusak transition hover:bg-zemin"
                    >
                      Okundu
                    </button>
                  </form>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </section>

      <BilgiKutusu>
        Etkinliğe dosya/görsel ekleme, yorumlar ve raporlama ekranları
        geliştirme sırasının sonraki adımlarında açılacak.
      </BilgiKutusu>
    </div>
  );
}
