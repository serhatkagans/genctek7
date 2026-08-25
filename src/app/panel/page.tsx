import {
  ArrowRight,
  ArrowRightLeft,
  Award,
  BadgeCheck,
  BarChart3,
  Camera,
  CircleAlert,
  CalendarClock,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  Compass,
  FileText,
  GraduationCap,
  Handshake,
  IdCard,
  Layers,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  KatlanabilirKart,
  Rozet,
  RozetSeridi,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
  SINIF_IKINCIL_BUTON,
  SINIF_VITRIN_BUTON,
  SINIF_VITRIN_IKINCIL_BUTON,
  Vitrin,
} from "@/components/ui";
import {
  KatilimKarti,
  SaltOkunurAlan,
} from "@/components/OgrenciProfilBolumleri";
import {
  CvDuzenleme,
  DanismanlikDuzenleme,
  DestekGruplariDuzenleme,
  FotografDuzenleme,
  GirilenKayitlar,
  IletisimDuzenleme,
  KayitEklemeFormu,
  ProfilFotografi,
} from "@/components/ProfilDuzenleme";
import { YolculukSeridi } from "@/components/YolculukSeridi";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
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
import { kazanimEkSinirlariniGetir } from "@/lib/kazanim/ek";
import {
  kayitEklemeGruplari,
  kazanimGrupCapasi,
  kazanimTipiGecerliMi,
} from "@/lib/kazanim/kurallar";
import { profilFotoSinirlariniGetir } from "@/lib/kullanici/profil-foto";
import { MENTORLUK_DURUM_ETIKETLERI } from "@/lib/mentor/kurallar";
import { mentorluguGetir } from "@/lib/mentor/veri";
import { ogretmenKatkiSayilariGetir } from "@/lib/ogretmen/katki";
import { yolculugumuGetir } from "@/lib/yolculuk/veri";
import { katkiKartiMetni } from "@/lib/ogretmen/katki-ozeti";
import { HAKKINDA_MAKS } from "@/lib/akis/kurallar";
import { ekipSayimiGetir } from "@/lib/ekip/veri";
import { hakkindaKaydetEylemi } from "./profil/hakkinda-eylemi";
import { cvSinirlariniGetir } from "@/lib/ogrenci/cv";
import { uygulamaYolu } from "@/lib/ortam";
import {
  bekleyenIsleriGetir,
  faaliyetKatilimSayisi,
  merkezIstatistikleriniGetir,
} from "@/lib/rapor/istatistik";
import { ilKoordinatoruOzeti } from "@/lib/rol/koordinator";
import { prisma } from "@/lib/db";
import {
  etkinligeKalanYaz,
  seritteGosterilecekler,
} from "@/lib/faaliyet/takvim";
import { yaklasanEtkinligimiGetir } from "@/lib/faaliyet/yaklasan";
import {
  kazanimlariGetir,
  ogretmenKazanimlariGetir,
} from "@/lib/kazanim/getir";
import { katkiVerisiGetir } from "@/lib/ogrenci/katki";
import { kullaniciRolEtiketi } from "@/lib/yetki/etiketler";
import { tarihSaatYaz } from "@/lib/tarih";
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
  ogretmenKapsamFiltresi,
} from "@/lib/yetki/kapsam";
import {
  yegitekSorumlusuIsaretiEylemi,
} from "./eylemler";
import { danismanlikIsaretiEylemi } from "./ogrenciler/eylemler";

export const dynamic = "force-dynamic";

/**
 * PANELİN ÖLÇÜM KARTI — ETKİNLİK KARTIYLA AYNI DİL (20 Ağustos 2026 · istek:
 * "kartları, etkinlikler gibi görsel ve güzel görünümlü hale getir").
 *
 * Kart eskiden düz beyaz bir kutuydu: sol üstte etiket, sağ üstte küçük bir
 * ikon kutusu, altında sayı. Etkinlikler ekranındaki kart ise gradyanlı bir
 * POSTER bandıyla açılıyor, ikon o bandın içinde filigran duruyor ve kart
 * imleç üstüne gelince bir tık yükseliyor (bkz. components/ui.tsx ·
 * PosterKart). Aynı sistemin iki ekranı iki ayrı kart dili konuşuyordu.
 *
 * Buradaki kart PosterKart'ı KULLANMIYOR, dilini ödünç alıyor. Sebebi
 * içeriğin farkı: PosterKart bir KAYDI tanıtır — başlık, rozetler, alt bilgi
 * ve düğmeler taşır. Burada tanıtılacak kayıt yok, tek bir SAYI var ve o
 * sayının kartın en iri öğesi olması gerekiyor. PosterKart'a "sayı kipi"
 * eklemek, iki ekranın kartını da bulanıklaştırırdı.
 *
 * TON BİLGİ TAŞIR, süs değil: `uyari` bekleyen bir iş olduğunu, `olumlu`
 * tamamlanmış bir şeyi, `vurgu` kişinin kendi tarihli taahhüdünü söyler.
 * Çağıran vermezse nötr kalır — rastgele renk dağıtmak, rengin anlamını
 * silerdi.
 */
function OlcumKarti({
  baslik,
  deger,
  aciklama,
  Ikon,
  yol,
  ton = "notr",
}: {
  baslik: string;
  deger: string;
  aciklama?: string;
  Ikon: React.ComponentType<{ size?: number; className?: string }>;
  /** Verilirse kart, ilgili ekrana giden bir bağlantı olur. */
  yol?: string;
  /** Poster bandının rengi; bilgi taşır (bkz. başlıktaki not). */
  ton?: "vurgu" | "olumlu" | "uyari" | "notr";
}) {
  const icerik = (
    <>
      {/*
        POSTER BANDI. Etkinlik kartındakinden ALÇAK (h-28 değil h-16): orada
        bandın işi afişi taşımak, burada yalnızca kartı renkle açmak — 112
        piksellik bir bant, üç satırlık bir sayımın üstünde başlı başına bir
        blok olurdu.
      */}
      <div className={`poster poster-${ton} relative grid h-16 place-items-center`}>
        <Ikon size={26} className="text-white/50" />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-sm font-medium text-metin-yumusak">{baslik}</p>
        {/*
          Sayı başlık yazısıyla ve büyük basılıyor: bir sayımın işlevi uzaktan
          okunabilmesidir, gövde puntosunda etiketinden ayrışmıyordu.
        */}
        <p className="mt-1 font-baslik text-3xl leading-tight font-extrabold text-baslik">
          {deger}
        </p>
        {aciklama && (
          <p className="mt-1.5 text-sm text-metin-yumusak">{aciklama}</p>
        )}
      </div>
    </>
  );

  /*
   * `overflow-hidden`: poster bandının köşeleri kartın yuvarlatmasını taşmasın.
   * `hover:-translate-y-1` yalnızca bağlantı olan kartta — gidilecek yeri
   * olmayan bir kartın imlece tepki vermesi, tıklanabilir olduğunu söylerdi.
   */
  const sinif =
    "flex h-full flex-col overflow-hidden rounded-kart border border-cizgi bg-kart shadow-kart";

  return yol ? (
    <Link
      href={yol}
      className={`${sinif} transition hover:-translate-y-1 hover:border-vurgu hover:shadow-yuksek focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vurgu`}
    >
      {icerik}
    </Link>
  ) : (
    <div className={sinif}>{icerik}</div>
  );
}

/**
 * SAYIM KARTI — "Dikkat gerektirenler" ve "Ekosistem sayıları" ızgaraları.
 *
 * ARTIK ÖLÇÜM KARTININ KENDİSİ (20 Ağustos 2026 · istek: "paneldeki Dikkat
 * gerektirenler bu ve Ekosistem sayıları bu kartların görünümünü güzel yap
 * etkinlik kartlarının görünümüne benzet").
 *
 * Önce sol kenarda ince renkli bir şeritle denenmişti; panelin üstündeki
 * ölçüm kartları poster bandıyla açılırken bu iki ızgara hâlâ ayrı bir dil
 * konuşuyordu ve sayfa iki kart görünümü taşıyordu. Sarmalayıcı duruyor
 * çünkü çağıranların sözlüğü farklı: burada `deger` bir SAYI, `alt` bir alt
 * satır — çağrı yerlerinde `String(...)` sarmalları açmak on üç kartın
 * hepsinde gürültü olurdu.
 *
 * TON BİLGİ TAŞIR: `uyari` yalnızca sıfırdan büyük bekleyen işte yanar.
 * Sıfır olan kart sönük ama görünür kalır — kaybolan kart "böyle bir ölçüt
 * yok" izlenimi verirdi, oysa sıfır iyi haberdir.
 */
function SayimKarti({
  etiket,
  deger,
  alt,
  Ikon,
  ton = "notr",
  yol,
}: {
  etiket: string;
  deger: number;
  alt: string;
  Ikon: React.ComponentType<{ size?: number; className?: string }>;
  ton?: "uyari" | "notr";
  /** Verilirse kart, ilgili ekrana giden bir bağlantı olur. */
  yol?: string;
}) {
  return (
    <OlcumKarti
      baslik={etiket}
      deger={String(deger)}
      aciklama={alt}
      Ikon={Ikon}
      ton={ton}
      yol={yol}
    />
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

export default async function PanelSayfasi({
  searchParams,
}: {
  searchParams: Promise<{
    hata?: string;
    durum?: string;
    bolum?: string;
    /*
     * Kayıt formunun türü (22 Ağustos 2026): çok tipli grupta (Deneyimlerim)
     * seçilen tür adreste taşınıyor — sayfada JavaScript yok ve form o türe
     * göre sunucuda basılmak zorunda.
     */
    tur?: string;
  }>;
}) {
  const {
    hata: seciimHatasi,
    durum: secimDurumu,
    bolum: acilacakBolum,
    tur: istenenTur,
  } = await searchParams;
  const kullanici = await oturumKullanicisiZorunlu();

  /*
   * Yalnızca SAYI çekiliyor: bildirim listesi bu ekrandan kalktığı için
   * (bkz. aşağıdaki "BİLDİRİMLER BÖLÜMÜ KALKTI" notu) satırların kendisine
   * ihtiyaç yok. Sorgu `bildirim(kullanici_id, okundu_mu)` dizinine oturuyor.
   */
  const okunmamisMesajSayisi = await prisma.bildirim.count({
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
   * Formlar 7 Ağustos 2026'da profilden buraya taşındı; 20 Ağustos'ta
   * gösterim de geldi ve iki yüzey tek ekranda birleşti. Formların ihtiyaç
   * duyduğu veri bu yüzden burada hazırlanıyor.
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
    cvSinirlari,
    belgeSinirlari,
  ] = await Promise.all([
    prisma.kullanici.findUniqueOrThrow({
      where: { id: kullanici.id },
      select: {
        ad: true,
        soyad: true,
        kurumKodu: true,
        fotoYuklenmeTarihi: true,
        /*
         * KİMLİK ALANLARI (20 Ağustos 2026 · istek: "panel ile profil
         * birleşecek"). Profil ekranı kapandı; salt okunur kimlik bloğu
         * buraya taşındığı için e-Okul'dan gelen alanlar da bu sorguya girdi.
         * Hepsi aynı satırdan okunuyor, ek sorgu yok.
         */
        cinsiyet: true,
        sinif: true,
        brans: true,
        kurum: { select: { ad: true, okulTuru: true } },
        il: { select: { ad: true } },
        ilce: { select: { ad: true } },
        /*
         * DIŞ KULLANICININ KURUM/GÖREV KAYNAĞI. Başvuru DONDURULMUŞ bir
         * belgedir; burası yalnızca kişinin kendi alanları BOŞKEN
         * gösterilecek ilk değeri veriyor.
         */
        disBasvurusu: {
          select: {
            tur: true,
            gorevUnvani: true,
            mezuniyetYili: true,
            paydas: { select: { ad: true } },
            mezunKurum: { select: { ad: true } },
          },
        },
        /*
         * Seçilen çalışma grupları — "Çalışma gruplarım" bölümünde seçiliyor,
         * aynı bölümün başında rozet olarak görünüyor.
         */
        destekGruplari: {
          orderBy: { calismaGrubu: { siraNo: "asc" } },
          select: { calismaGrubu: { select: { id: true, ad: true } } },
        },
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
            // Dosyanın VAR OLUP OLMADIĞI bu sütundan anlaşılıyor.
            cvDepolamaYolu: true,
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
    // CV artık öğretmende de var (7 Ağustos 2026); sınırlar ortak.
    cvSinirlariniGetir(),
    /*
     * "Rotam" hedefleri BURADA SORGULANMIYOR (14 Ağustos 2026 · istek: "rotam
     * kalksın"): bölüm Panelim'den kalktı, veri de onunla birlikte. Hedefler
     * profil ekranında okunmaya devam ediyor.
     */
    /*
     * KAYIT BÖLÜMLERİ İÇİN (22 Ağustos 2026 · istek: "diğerlerini direk panele
     * alt alta alıyoruz açılır şekilde"). Destekleyici belge sınırları etkinlik
     * ekleriyle ORTAKTIR (lib/kazanim/ek.ts).
     *
     * GENÇTEK PROGRAM LİSTESİ ARTIK ÇEKİLMİYOR: kayıt formundaki "GençTek
     * etkinliği" açılır listesi kalktı ve adı kişi kendisi yazıyor.
     */
    kazanimEkSinirlariniGetir(),
  ]);

  /*
   * KAYIT BÖLÜMLERİ (22 Ağustos 2026 · istek: "paneldeki Bilişim Yolculuğum
   * kartı kalkacak, içindekiler panelin altına sırayla ayrı gruplara açılır
   * gelecek: Ürünlerim, Deneyimlerim, Topluluklarım / Ekiplerim").
   *
   * Bölümler 21 Ağustos'ta panelden çıkıp kendi sayfasına taşınmıştı; kart da
   * o sayfaya götürüyordu. Şimdi kart kalktı ve formlar panelin altındaki
   * katlanır kutulara döndü — kayıt girmek panelden ayrılmayı gerektirmiyor.
   *
   * ADRESTEKİ TÜR YALNIZCA KENDİ BÖLÜMÜNÜ İLGİLENDİRİR: `?tur=` çok tipli tek
   * gruptan (Deneyimlerim) gelir. Öbür bölümler kendi ilk türünde kalır —
   * bir bölümdeki seçimin yandaki bölümün formunu değiştirmesi, ortak formdan
   * kalma bir davranıştı.
   */
  const kazanimSahibi = ogrenciMi(kullanici) ? "OGRENCI" : "OGRETMEN";
  const kayitGruplari = kayitEklemeGruplari(kazanimSahibi);
  const seciliKayitTuru =
    istenenTur && kazanimTipiGecerliMi(istenenTur) ? istenenTur : null;
  const izinliBelgeTipleri = [
    ...belgeSinirlari.izinliGorselTipleri,
    ...belgeSinirlari.izinliBelgeTipleri,
  ];

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

  /*
   * ---------------------------------------------------------------------
   * PROFİL GÖSTERİM VERİSİ (20 Ağustos 2026 · istek: "panel ile profil
   * birleşecek tek panel kalacak, düzenleme ve görüntüleme panelden olacak")
   * ---------------------------------------------------------------------
   * 7 Ağustos'ta yüzey ikiye bölünmüştü: `/panel/profil` GÖSTERİR, `/panel`
   * DÜZENLER. Bölünme, girdiği kaydın nerede göründüğünü merak eden
   * kullanıcıyı iki ekran arasında gezdiriyordu — her düzenleme bölümünün
   * altında "profilimde nasıl göründüğünü gör" bağlantısı, her profil
   * kartının altında "Panelim'den düzenle" bağlantısı vardı ve ikisi aynı
   * bilgiyi iki kez basıyordu.
   *
   * Yüzey artık TEK: gösterim de düzenleme de burada. Profil ekranı silindi
   * ve adresi buraya yönleniyor (bkz. app/panel/profil/page.tsx).
   *
   * Sorgular paralel; hepsi oturumdaki kişinin kendi satırlarına bakıyor.
   */
  const ogrenci = ogrenciMi(kullanici);

  const [kazanim, katki, ogretmenKazanim, ogrencileri] = await Promise.all([
    // Rozetler ve katkı kartı öğrenciye özgüdür; öğretmenin karşılığı ayrı
    // fonksiyondan gelir (kaynakları bambaşka tablolar).
    ogrenci ? kazanimlariGetir(kullanici.id) : Promise.resolve(null),
    ogrenci ? katkiVerisiGetir(kullanici.id) : Promise.resolve(null),
    ogrenci ? Promise.resolve(null) : ogretmenKazanimlariGetir(kullanici.id),
    /*
     * Danışmanlığındaki öğrenciler. Kapsam filtresi KULLANILMIYOR: soru "bu
     * kişinin kapsamında kimler var" değil, "kimin danışmanı" — ikisi farklı.
     */
    ogrenci
      ? Promise.resolve([])
      : prisma.danismanAtama.findMany({
          where: { danismanKullaniciId: kullanici.id, bitisTarihi: null },
          orderBy: { baslangicTarihi: "desc" },
          select: {
            ogrenci: { select: { id: true, ad: true, soyad: true, sinif: true } },
          },
        }),
      /*
       * "Rotam" hedefleri BURADA SORGULANMIYOR (20 Ağustos 2026 · istek:
       * "rotam komple kalkacak"): ekranda hiçbir yerde basılmıyor, dolayısıyla
       * her panel açılışında okunmasının da anlamı yok. Kayıtlar tabloda
       * duruyor.
       */
    ]);

  // Koordinatörün sorumlu olduğu il, kişinin kayıtlı ilinden farklı olabilir;
  // adı ayrıca getirilir çünkü ham "34" kodu ekranda hiçbir şey anlatmıyor.
  const sorumluIlKodu = koordinatorIlKodu(kullanici);
  const sorumluIl = sorumluIlKodu
    ? await prisma.il.findUnique({
        where: { ilKodu: sorumluIlKodu },
        select: { ad: true },
      })
    : null;

  /*
   * KOORDİNATÖRÜN KARŞILIĞI: öğretmende "Öğrencilerim" danışmanlığındakileri
   * listeliyor; koordinatör danışman değildir. Onun karşılığı sorumlu olduğu
   * ildeki SAYIMDIR. "Danışmansız" ayrı sayılıyor: ilinde eyleme geçmesi
   * gereken tek sayı odur (SKILL.md · Değişmezler 2).
   */
  const koordinatorOzeti =
    !ogrenci && sorumluIlKodu
      ? await (async () => {
          const [ogrenciSayisi, ogretmenSayisi, danismansiz] = await Promise.all([
            prisma.kullanici.count({
              where: {
                ilKodu: sorumluIlKodu,
                roller: { some: { rolKodu: "OGRENCI", bitisTarihi: null } },
              },
            }),
            prisma.kullanici.count({
              where: { AND: [ogretmenKapsamFiltresi(kullanici)] },
            }),
            prisma.kullanici.count({
              where: {
                ilKodu: sorumluIlKodu,
                roller: { some: { rolKodu: "OGRENCI", bitisTarihi: null } },
                ogrenciAtamalari: { none: { bitisTarihi: null } },
              },
            }),
          ]);
          return { ogrenciSayisi, ogretmenSayisi, danismansiz };
        })()
      : null;

  const disKullanici = disKullaniciMi(kullanici);
  const disProfil = profilKaydi.ogretmenProfil;
  const basvuru = profilKaydi.disBasvurusu;

  /*
   * Kurum ve görev: önce kişinin kendi yazdığı, yoksa başvurudaki değer.
   * Onay anında KOPYALANMADI; başvuru tek doğruluk kaynağı olarak duruyor ve
   * kişi kendi değerini yazdığı anda bu düşüş sona eriyor.
   */
  const kurumAdi =
    disProfil?.kurumAdi ?? basvuru?.paydas?.ad ?? basvuru?.mezunKurum?.ad ?? null;
  const gorevUnvani = disProfil?.gorevUnvani ?? basvuru?.gorevUnvani ?? null;

  const okulBilgisiVar = profilKaydi.kurumKodu !== null;

  /*
   * Kimlik kartı kapalı dururken başlığın altında görünen üç değer: kişinin
   * sistemdeki görevi, içinde bulunduğu yıl ve bağlı olduğu yer. Adı soyadı
   * ÖZETE GİRMİYOR — sayfanın en üstündeki karşılamada zaten yazıyor ve iki
   * satır arayla tekrar etmesi bilgi eklemiyordu.
   */
  const kimlikOzeti = [
    kullaniciRolEtiketi(kullanici),
    kullanici.egitimOgretimYili,
    profilKaydi.kurum?.ad ?? profilKaydi.il?.ad ?? null,
  ].filter(Boolean) as string[];

  /*
   * KAPALI BÖLÜMLERİN ÖZETLERİ (21 Ağustos 2026 · istek: "İletişim bilgilerim,
   * Kayıtlarım, Özgeçmişim (CV) bunların da özetleri görülsün doldurunca
   * mutlaka").
   *
   * YALNIZCA DOLU ALAN BASILIR (istek: "sadece doldurduğunda doldurduğu
   * veriler gelsin"). Doldurulmuş alanın DEĞERİ başlığın altında duruyor;
   * kişi kayıtlı telefonunu görmek için bölümü açmak zorunda kalmasın. Boş
   * bölüm ise hiçbir şey yazmıyor: "henüz yok" satırları, ekranı bilgi değil
   * eksik listesi gibi okutuyordu.
   */
  const kendiProfilim = ogrenci
    ? profilKaydi.ogrenciProfil
    : profilKaydi.ogretmenProfil;
  /*
   * ROLE GÖRE ELEME YOK (22 Ağustos 2026 · istek: "eklenenler gözükmüyor,
   * eğer veri varsa gösterilir olsun tüm kullanıcı düzeylerinde"): özet artık
   * "bu rol bu alanı düzenleyebilir mi" diye sormuyor, "bu alan dolu mu" diye
   * soruyor. Eski hâlinde kurum/görev yalnızca dış kullanıcıda basılıyordu ve
   * bağlantılar hiç basılmıyordu — girilen veri ekranda karşılığı olmayan bir
   * yere düşüyordu. Doldurulmamış alan yine hiçbir şey yazmaz.
   */
  /*
   * Adresler protokolsüz basılıyor: "https://" özet satırında bilgi taşımıyor,
   * yalnızca yan yana duran değerlerin arasını uzatıyor.
   */
  const adresiKisalt = (adres: string | null | undefined) =>
    adres ? adres.replace(/^https?:\/\//i, "").replace(/\/$/, "") : null;
  const iletisimOzeti = [
    kendiProfilim?.eposta,
    kendiProfilim?.telefon,
    kurumAdi,
    gorevUnvani,
    adresiKisalt(kendiProfilim?.githubUrl),
    adresiKisalt(kendiProfilim?.linkedinUrl),
    adresiKisalt(kendiProfilim?.kisiselSiteUrl),
  ].filter(Boolean) as string[];
  const cvOzeti = kendiProfilim?.cvDosyaAdi ?? null;
  const cvTarihi = kendiProfilim?.cvYuklenmeTarihi ?? null;

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
   * Başvuru şeridinin kaynağı: kapsamdaki faaliyetler. Takvim bölümü
   * kalktığı için (aşağıdaki nota bakınız) bu sorgu artık yalnızca
   * "başvurusu açık etkinlikler" şeridini besliyor.
   *
   * Pencere son 90 günle sınırlı: şerit bir arşiv değil, "şu sıralar ne var"
   * demektir; arşive Etkinlikler ekranından bakılır.
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
   * KATILIM SAYIMI KALKTI (20 Ağustos 2026 · üç etkinlik kartının
   * kaldırılmasıyla birlikte): tek okuyucusu "Katıldığım etkinlikler"
   * kartıydı. Katılım LİSTESİ profildeki katkı kartında durmaya devam
   * ediyor (bkz. lib/kazanim/getir.ts · katilimGecmisiGetir).
   */

  /*
   * Katkı kartının özeti — yalnızca kartı BASILAN rollerde sorulur (danışman
   * öğretmen ve il koordinatörü). Herkese sorulsaydı öğrencinin ve merkezin
   * panelinde hiç kullanılmayan üç sayım daha açılırdı.
   */
  /*
   * SAYIMLAR ÖĞRENCİ DIŞINDAKİ HERKESTE (21 Ağustos 2026): "Görevlerim" kartı
   * artık her rolde basılıyor ve sayısını buradan alıyor. Üç `count`
   * sorgusundan ibaret; ayrıca katkı kartının özeti de aynı kaynaktan
   * besleniyor — iki ayrı sorgu, aynı üç sayıyı iki kez saymak olurdu.
   */
  const ogretmenKatkiSayilari = ogrenci
    ? null
    : await ogretmenKatkiSayilariGetir(kullanici.id);

  /*
   * Katkı kartının özeti — yalnızca kartı BASILAN rollerde kuruluyor (danışman
   * öğretmen ve il koordinatörü); metni herkes için hazırlamak, kullanılmayan
   * bir cümle üretmek olurdu.
   */
  const katkiOzeti =
    ogretmenKatkiSayilari &&
    (danismanMi(kullanici) || ilKoordinatoruMu(kullanici))
      ? katkiKartiMetni(ogretmenKatkiSayilari)
      : null;

  /*
   * ÜST KARTLARIN SAYILARI (21 Ağustos 2026). Kartlar kendi sayfalarına
   * götürüyor; buradaki tek iş, sayfaya girmeden önce okunacak sayıyı vermek.
   *
   * Görev sayısı temsilcilik ve organizasyonu TOPLAR: ikisi de "bu kişiye ne
   * görev verilmiş" sorusunun yarısı ve kart tek sayı gösteriyor. Öğretmende
   * karşılığı görev geçmişi ile düzenlediği etkinliklerdir.
   */
  /*
   * GENÇTEK GÖREVLERİ DE SAYIYA GİRİYOR (22 Ağustos 2026): Görevlerim ekranı
   * artık merkezin açtığı ekiplerden alınan görevleri de listeliyor. Kart o
   * ekranın sayısını söylüyor — ikisi ayrışsaydı kartta "2" yazarken sayfada
   * üç görev durabilirdi. Yalnızca ONAYLANMIŞ olanlar: bekleyen başvuru henüz
   * görev değil.
   */
  const gencTekGorevSayisi = await prisma.gencTekGorevBasvurusu.count({
    where: { kullaniciId: kullanici.id, onayDurumu: "ONAYLANDI" },
  });
  const gorevSayisi =
    (katki
      ? katki.gorevler.length + katki.faaliyetler.length
      : (ogretmenKatkiSayilari?.gorev ?? 0) +
        (ogretmenKatkiSayilari?.faaliyet ?? 0)) + gencTekGorevSayisi;

  /*
   * Kartın gösterdiği seviye, sayfadakiyle AYNI hesaptan geliyor
   * (lib/yolculuk/veri.ts): iki yerde iki ayrı formül olsaydı kart "Üretimde"
   * derken sayfa "Harekette" diyebilirdi.
   */
  const yolculuk = await yolculugumuGetir(kullanici);

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
        /*
          ÜST BAŞLIK BİR SLOGAN, BİR VERİ DEĞİL (20 Ağustos 2026 · istekler:
          "2025 2026 eğitim öğretim yılı kalksın bannerdaki, sektörün yeni
          liderleri yazısı gelsin" · "hoş geldiniz yerine sadece adı soyadı
          yazsın").

          Eğitim-öğretim yılı KAYBOLMADI: aşağıdaki "Kimlik bilgileri"
          kartında kendi satırında duruyor — orası zaten kaydın ne dediğini
          okuyan yer. Vitrinde tuttuğu yer ise kişinin adının üstüydü.

          Başlık artık ad ve soyad: "Hoş geldiniz" her açılışta aynı şeyi
          söyleyen bir dolgu cümlesiydi ve kişinin soyadını dışarıda
          bırakıyordu.
        */
        ustBaslik="Sektörün yeni liderleri"
        baslik={`${profilKaydi.ad} ${profilKaydi.soyad}`}
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
            {/*
              "PANOYA GİT" DÜĞMESİ KALKTI (22 Ağustos 2026 · istek: "panelde
              banner üzerindeki panoya git butonu kalksın"). Pano kenar
              çubuğunda kendi sekmesiyle duruyor; vitrindeki ikinci kapı,
              yanındaki mesaj düğmesinin yerini daraltmaktan başka bir iş
              görmüyordu.
            */}
            {/*
              OKUNMAMIŞ MESAJ DÜĞMESİ (21 Ağustos 2026 · istek: "okunmamış
              mesajlar kayıyor onu üste al · Etkinlikler, Panoya git bunların
              yanına bir buton ve şu kadar okunmamış mesajın var diye buton
              olsun").

              Aynı bilgiyi taşıyan sarı akan şerit KALKTI: akan metnin
              üzerine tıklamak zordu ve sayı, akışın solunda parantez içinde
              kalıyordu. Düğme sabit duruyor ve sayıyı doğrudan söylüyor.

              HEDEF ARTIK BİLDİRİMLER EKRANI (22 Ağustos 2026 · istek: "panelde
              en alttaki bildirimleri kaldıralım, tamamını başka sayfaya
              taşıyıp, bannerdaki butona tıklayınca o sayfaya gitsin"). Önce
              sayfanın altındaki `#bildirimler` bölümüne iniyordu; o bölüm
              yalnızca son beş okunmamışı gösteriyordu ve artık yok.

              SIFIRDA DÜĞME KAYBOLMUYOR, METNİ DEĞİŞİYOR (22 Ağustos 2026 ·
              istek: "tüm mesajları okuduysa o buton kayboluyor; okuduysa tüm
              mesajlara ya da bildirimlere git butonuna dönüşsün"). Önce sayı
              sıfırken hiç basılmıyordu — gerekçesi "tıklanacak bir şey yok"tu,
              oysa okunmuş bildirimler duruyor ve onlara gitmenin başka kapısı
              yok. Düğmenin gidip gelmesi vitrindeki düğme sırasını da her
              açılışta değiştiriyordu.
            */}
            {/*
              YOL HAM YAZILIR, `uygulamaYolu()` İLE DEĞİL: `<Link>` basePath'i
              kendisi ekler. Önek burada bir kez daha eklendiğinde alt dizine
              kurulu sunucuda adres `/genctek/genctek/panel/bildirimler` olup
              404 veriyordu; yerelde TEMEL_YOL boş olduğu için hata görünmezdi
              (bkz. lib/ortam.ts · uygulamaYolu).
            */}
            <Link
              href="/panel/bildirimler"
              className={SINIF_VITRIN_IKINCIL_BUTON}
            >
              <Mail size={16} aria-hidden />
              {okunmamisMesajSayisi > 0
                ? `${okunmamisMesajSayisi} okunmamış mesajın var`
                : "Bildirimlere git"}
            </Link>
          </>
        }
        /*
          KİMLİK BAŞLIĞIN KENDİSİ (21 Ağustos 2026 · istek: "bu yazı kalksın
          resim sola gelsin, isminin altına okul vs gelsin").

          Önce vitrinin SAĞ kolonunda kendi kutusu vardı: fotoğraf, ad, rol ve
          okul bir arada. Ad iki kez basılıyordu — bir kez başlık olarak, bir
          kez de o kutunun içinde — ve okul adın yanındaki ayrı bir kutuda
          kalıyordu. Blok dağıtıldı: fotoğraf başlığın soluna, rol ve okul adın
          altına geçti; sağ kolon tümüyle kalktı.

          "Bugün sizi bekleyen işler…" cümlesi de gitti: her açılışta aynı şeyi
          söylüyordu ve hemen altındaki düğmeler zaten bugün nereye
          gidileceğini yazıyor.
        */
        gorsel={
          <>
            {/*
              FOTOĞRAF DÜĞMESİ VE FORMU BURADA, TEK PARÇA (20 Ağustos 2026 ·
              istekler: "resim ekleme ve görüntüleme banner üzerine gelsin ve
              üzerinde tıklayınca değişsin" · "paneldeki altta bulunan
              fotoğrafıma gerek kalmadı … bannerdaki görsel ekleme bağımsız
              olsun").

              Önce aşağıdaki katlanır "Fotoğrafım" bölümüne BAĞLANIYORDU; o
              bölüm kalktı ve bağlantının gideceği yer kalmadı. Yükleme formu
              bu yüzden vitrinin içine indi: fotoğrafa tıklamak formu AÇAR,
              başka bir ekrana ya da başka bir bölüme götürmez.

              JAVASCRIPT YOK: `<details>`in kendi davranışı. Fotoğraf
              `<summary>`nin içinde, yani her zaman görünür; form yalnızca
              açıkken basılıyor.

              `group`: örtü ve ok yalnızca imleç üstüne gelince, odaklanınca ya
              da form açıkken görünür — vitrin sistemin açılış cümlesi ve
              üstünde sürekli duran bir düğme kalabalığı istemiyoruz.
            */}
            <details className="group/foto">
              <summary
                aria-label={
                  fotoAdresi
                    ? "Profil fotoğrafımı değiştir"
                    : "Profil fotoğrafı ekle"
                }
                className="relative w-fit cursor-pointer list-none rounded-full outline-offset-4"
              >
                <ProfilFotografi
                  ad={profilKaydi.ad}
                  soyad={profilKaydi.soyad}
                  adres={fotoAdresi}
                />
                <span
                  aria-hidden
                  className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-black/55 text-[11px] font-semibold text-white opacity-0 transition group-hover/foto:opacity-100 group-focus-within/foto:opacity-100 group-open/foto:opacity-100"
                >
                  <Camera size={18} />
                  {fotoAdresi ? "Değiştir" : "Ekle"}
                </span>
              </summary>

              {/*
                FORM VİTRİNİN İÇİNDE, o yüzden kendi renkleriyle basılıyor:
                `SINIF_GIRDI` beyaz zemin varsayar ve kırmızı bandın üstünde
                okunmazdı.
              */}
              <div className="mt-4 w-full min-w-56 space-y-3 rounded-kutu border border-vitrin-cizgi bg-black/20 p-4">
                <form action={profilFotoYukleEylemi} className="space-y-2">
                  <label className="block text-sm font-medium text-vitrin-metin">
                    {fotoAdresi ? "Yeni fotoğraf seç" : "Fotoğraf seç"}
                    <input
                      type="file"
                      name="foto"
                      required
                      accept={fotoSinirlari.izinliTipler.join(",")}
                      className="mt-1.5 block w-full text-sm text-vitrin-metin-yumusak file:mr-3 file:rounded-kutu file:border-0 file:bg-white/90 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-metin"
                    />
                  </label>
                  <p className="text-xs text-vitrin-metin-yumusak">
                    En fazla{" "}
                    {(fotoSinirlari.maksBayt / (1024 * 1024)).toFixed(0)} MB ·
                    tek kopya tutulur, yeni yükleme öncekinin yerine geçer.
                  </p>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-kutu bg-white px-3.5 py-2 text-sm font-semibold text-metin transition hover:bg-white/90"
                  >
                    <Camera size={15} aria-hidden />
                    Yükle
                  </button>
                </form>

                {fotoAdresi && (
                  <form action={profilFotoSilEylemi}>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-kutu border border-vitrin-cizgi px-3.5 py-2 text-sm font-medium text-vitrin-metin transition hover:bg-white/10"
                    >
                      <Trash2 size={15} aria-hidden />
                      Fotoğrafı kaldır
                    </button>
                  </form>
                )}
              </div>
            </details>
          </>
        }
        altBaslik={
          <>
            <p className="text-sm font-semibold text-vitrin-metin-yumusak">
              {kullaniciRolEtiketi(kullanici)}
            </p>
            {/*
              Okul satırı yalnızca okul kaydı olanda: dış kullanıcının (mezun,
              paydaş) okulu yoktur ve boş satır eksik veri gibi görünürdü.
            */}
            {okulBilgisiVar && (
              <p className="mt-1 text-sm text-vitrin-metin-yumusak">
                {[
                  profilKaydi.kurum?.ad,
                  profilKaydi.ilce?.ad,
                  profilKaydi.il?.ad,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
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
            ton="vurgu"
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
              /*
                DANIŞMANI VARKEN NÖTR (22 Ağustos 2026 · istek: "danışman
                öğretmenim kartı yeşil olmasın, gri olsun"). Yeşil bir başarı
                rengi; danışmanı olmak öğrencinin başardığı bir şey değil,
                olağan durumu. Kart yeşil olduğunda ızgaradaki tek renkli kutu
                oydu ve gözü kendine çekiyordu.

                ATANMADIĞINDA SARI KALIYOR: orada gerçekten bekleyen bir iş var
                ve kartın tek işi onu göstermek.
              */
              ton={atama ? "notr" : "uyari"}
              Ikon={UserCheck}
              deger={
                atama
                  ? `${atama.danisman.ad} ${atama.danisman.soyad}`
                  : "Atanmadı"
              }
              /*
                AÇIKLAMA KARTIN NE YAPTIĞINI DEĞİL, NE ANLATTIĞINI YAZAR
                (20 Ağustos 2026 · istek: "panelde Değiştirmek için tıklayın
                güncelleme için tıklayın yazılar kalksın kartlardaki").

                Kartın tıklanabilir olduğunu zaten kendisi söylüyor: imleç
                değişiyor ve kenarlığı vurguya dönüyor. "Tıklayın" demek, o
                satırı bilgi taşımayan bir yönergeye çeviriyordu — danışmanı
                olmayan öğrenci ise ne yapması gerektiğini değerin kendisinden
                ("Atanmadı") okuyor.
              */
              yol="/panel/danisman-secim"
            />
            {/*
              KART ADLARI TEK KALIPTA (25 Ağustos 2026 · istek: "öğrenci
              kartlarının ismi standart olsun: Çalışma gruplarım, Öz
              değerlendirmelerim, GençTek görevlerim, Mentörlüklerim").

              "Çalışma grubu seçimim" işi (seçim), "Öz değerlendirme" aracı
              (envanter) adlandırıyordu; komşularının hepsi "benim" diyen bir
              çoğuldu. Adres ve içerik aynı, değişen yalnızca kart adı.
            */}
            <OlcumKarti
              baslik="Çalışma gruplarım"
              Ikon={Layers}
              deger={String(grupSayisi)}
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
            {/*
              EKRANIN ADI DEĞİŞTİ (20 Ağustos 2026 · istek: "Algoritmam öz
              değerlendirme olsun"). Adres aynı kaldı — bkz.
              app/panel/algoritmam/page.tsx.
            */}
            <OlcumKarti
              baslik="Öz değerlendirmelerim"
              Ikon={Compass}
              deger="Envanterler"
              yol="/panel/algoritmam"
            />
            {/*
              BAŞVURU İLE KATILIM AYRI İKİ SAYI ve yan yana duruyorlar: biri
              "istedim", öbürü "gerçekten oldum". Yoklama geldiğinden beri
              (12 Ağustos 2026) ikisinin farkı gerçek bir bilgi — başvurusu
              seçilmiş ama gelmemiş öğrencide sayılar ayrışır.

              Kart AYNI SAYFADAKİ katkı kartına iner (20 Ağustos 2026 ·
              panel-profil birleşmesi): katılan etkinliklerin LİSTESİ orada.
              Buraya ikinci bir liste konulmadı.
            */}
          </>
        )}

        {/*
          ÜÇ KART, ÜÇ SAYFA (21 Ağustos 2026 · istekler: "Kayıtlarım ve katkı
          nişanlarımı panelden kaldır alttan, üst alanda kart olarak gelsin
          kendi sayfaları olsun" · "yaptığı görevler Görevlerim kart olarak
          yukarı taşınacak").

          Üçü de HERKESTE basılıyor: kayıt girmek, nişan kazanmak ve görev
          almak öğretmende de var — kartların içeriği role göre değişiyor,
          varlığı değil. Sayı kartın üstünde çünkü kartın işi, sayfaya girmeden
          önce "burada bir şey var mı" sorusunu cevaplamak.
        */}
        <OlcumKarti
          baslik="GençTek görevlerim"
          Ikon={BadgeCheck}
          deger={String(gorevSayisi)}
          yol="/panel/gorevlerim"
        />
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
            /* E-posta bir VERİ: koordinatör yoksa ya da adres girilmemişse
               satır basılmıyor — kartın değeri zaten "Atanmadı" diyor. */
            aciklama={ilKoordinatorum?.eposta ?? undefined}
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
                  ton="uyari"
                  Ikon={ClipboardCheck}
                  deger={String(koordinatorOnayKuyrugu.etkinlik)}
                  yol="/panel/etkinlikler?onay=bekleyen"
                />
                <OlcumKarti
                  baslik="İl dışına giden başvuru"
                  ton="uyari"
                  Ikon={ArrowRightLeft}
                  deger={String(koordinatorOnayKuyrugu.ilDisi)}
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
              ton="uyari"
              Ikon={ClipboardCheck}
              deger={String(onayBekleyenSayisi)}
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

        {/*
          ÜÇ ETKİNLİK KARTI KALKTI (20 Ağustos 2026 · istek: "panelde etkinlik
          başvurularım, katıldığım etkinlikler, başvurusu açık etkinlikler
          kartları kalkacak").

          Kalkanlar: "Etkinlik başvurularım", "Katıldığım etkinlikler" (hem
          öğrenci hem diğer roller için) ve "Başvurusu açık etkinlik". Üçü de
          Etkinlikler ekranındaki kategorilerin (başvurduğum / tüm
          etkinlikler) sayıca tekrarıydı; katılım listesi ise aşağıdaki katkı
          bölümünde duruyor.

          Başvuru şeridi YERİNDE: o bir sayaç değil, "şimdi başvurabilirsin"
          çağrısı.
        */}

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
            ton={mentorlugum?.durum === "ONAYLANDI" ? "olumlu" : "notr"}
            Ikon={GraduationCap}
            deger={
              mentorlugum
                ? MENTORLUK_DURUM_ETIKETLERI[mentorlugum.durum]
                : "Başvurulmadı"
            }
            /*
              KAPSAM SATIRI KALKTI (25 Ağustos 2026 · istek: "mentörlüklerim
              kartının altında … o mentörlüğe ait açıklama görünmesin").
              Kart bir DURUM kartı: grup ve konu listesi eklenince kart
              komşularından taşıyordu. Kapsamın yeri kendi ekranı
              (/panel/mentorlugum) ve orada zaten yazıyor.
            */
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
        "KATKI NİŞANLARIM" KARTI "GENÇTEK YOLCULUĞUM" OLDU (21 Ağustos 2026 ·
        istek). Kart artık nişan sayısını değil SEVİYEYİ gösteriyor: yolculuk
        bir merdiven ve kişinin ilk sorduğu şey "hangi basamaktayım".

        IZGARADAN ÇIKIP ALTINA İNDİ (22 Ağustos 2026 · istek: "GençTek
        Yolculuğum'u panelde kartların altına alalım"). Izgaradaki sekizde bir
        kutuda seviye adından başkası sığmıyordu; sıradaki eşiğe ne kadar
        kaldığı ancak sayfayı açınca görülüyordu. Şerit, kazanılan genişliği
        İLERLEME ÇUBUĞUNA harcıyor — yolculuğun tek sorusu "ne kadar kaldı".

        Çubuk iki eşik ARASINI ölçüyor, toplam puanı değil; hesap sayfadakiyle
        aynı yerden geliyor (lib/yolculuk/kurallar.ts · `yuzde`).
      */}
      <Link
        href="/panel/genctek-yolculugum"
        className="flex overflow-hidden rounded-kart border border-cizgi bg-kart shadow-kart transition hover:-translate-y-1 hover:border-vurgu hover:shadow-yuksek focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vurgu"
      >
        {/*
          Poster bandı DİKEY: ölçüm kartlarında üstte yatay bir bant duruyor,
          burada kart yatık olduğu için aynı bant sol raya dönüyor. Kartların
          dili değişmiyor, yönü değişiyor.
        */}
        <div className="poster poster-notr grid w-16 shrink-0 place-items-center sm:w-24">
          <Award size={26} className="text-white/50" aria-hidden />
        </div>
        <div className="flex-1 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <div>
              <p className="text-sm font-medium text-metin-yumusak">
                GençTek Yolculuğum
              </p>
              <p className="mt-1 font-baslik text-3xl leading-tight font-extrabold text-baslik">
                {yolculuk.seviye.ad}
              </p>
            </div>
            <p className="text-sm text-metin-yumusak">
              {yolculuk.toplamPuan} puan
            </p>
          </div>
          <div
            className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-zemin"
            role="progressbar"
            aria-valuenow={yolculuk.yuzde}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${yolculuk.seviye.ad} seviyesindeki ilerlemeniz`}
          >
            <div
              className="h-full rounded-full bg-birincil transition-all"
              style={{ width: `${yolculuk.yuzde}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-metin-yumusak">
            {yolculuk.sonraki
              ? `Sonraki seviye "${yolculuk.sonraki.ad}" · ${yolculuk.kalanPuan} puan kaldı`
              : "En üst seviyedesiniz."}
          </p>
        </div>
      </Link>

      {/*
        AŞAMA ŞERİDİ ŞERİDİN ALTINDA (22 Ağustos 2026 · istek: "panelde GençTek
        Yolculuğum'un altına … 'Buradasın' bunu da ekleyelim").

        Üstteki şerit "neredesin ve ne kadar kaldı" diyor; bu liste "yol neye
        benziyor" diyor. İkincisi olmadan seviye adı ("Keşifte") kişiye kaçıncı
        basamakta olduğunu ve sıradakinin ne olduğunu söylemiyordu.

        BAĞLANTI DEĞİL: üstündeki kart zaten yolculuk ekranına götürüyor;
        şeridin kendisi okunacak bir liste. İşaretleme yolculuk ekranıyla TEK
        BİLEŞENDEN geliyor (components/YolculukSeridi.tsx) — kopyalansaydı
        seviye eklendiğinde biri geride kalırdı.
      */}
      <YolculukSeridi seviyeKodu={yolculuk.seviye.kod} />

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
                Ikon: UserCheck,
              },
              {
                etiket: "Raporsuz biten etkinlik",
                deger: bosluklar.raporsuzFaaliyet,
                alt: "Bitti ama raporu yazılmadı",
                yol: "/panel/raporlar",
                Ikon: FileText,
              },
              {
                etiket: "Onay bekleyen etkinlik",
                deger: bosluklar.bekleyenFaaliyetOnayi,
                alt: "Öğrenci ve öğretmen önerileri dâhil",
                yol: "/panel/etkinlikler",
                Ikon: ClipboardCheck,
              },
              {
                etiket: "Bekleyen il dışı başvuru",
                deger: bosluklar.bekleyenIlDisiBasvuru,
                alt: "Kaynak ilin kararını bekliyor",
                yol: "/panel/etkinlikler#il-disi",
                Ikon: ArrowRightLeft,
              },
              {
                /*
                  DANIŞMAN DEĞİŞİKLİĞİ TALEPLERİ (20 Ağustos 2026). Satır
                  öğretmende ve koordinatörde basılıyor; karşılığı
                  "Öğrencilerim" ekranının başındaki kuyruk ve bağlantı
                  doğrudan oraya iniyor.

                  Bekleyen talep, karşılığı BAŞKASININ tıklamasına bağlı olan
                  tek iş: öğrenci ekranında "onay bekliyor" satırını görüyor ve
                  bekliyor. Sayaç olmasaydı cevapsız kalan talebin farkına
                  ancak öğrenci sorunca varılırdı.
                */
                etiket: "Bekleyen danışman talebi",
                deger: bosluklar.bekleyenDanismanTalebi,
                alt: "Öğrenci danışmanını değiştirmek istiyor",
                yol: "/panel/ogrenciler#danisman-talepleri",
                Ikon: UserCheck,
              },
              /*
                "Bekleyen bağlantı isteği" satırı kalktı (21 Ağustos 2026 ·
                istek: "bağlantılarımdan normal mesaj göndermeyi tamamen
                kaldır"): karara bağlanacak bir istek akışı yok.
              */
              /*
                "Belgesi eksik koordinatör" satırı kalktı (21 Ağustos 2026 ·
                istek: "kvkk olmayacak yani sadece çerez politikası"): artık
                onaylanacak bir taahhütname ya da gizlilik sözleşmesi yok.
              */
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
                <SayimKarti
                  key={satir.etiket}
                  etiket={satir.etiket}
                  deger={satir.deger}
                  alt={satir.alt}
                  Ikon={satir.Ikon}
                  ton={satir.deger > 0 ? "uyari" : "notr"}
                  yol={satir.yol}
                />
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
                Ikon: Users,
              },
              {
                etiket: "Çalışma grubuna kayıtlı",
                deger: merkezIstatistik.calismaGrubunaKayitliOgrenci,
                // Seçim değil ÖĞRENCİ sayılır: bir öğrenci birden çok grup
                // seçebiliyor, satır sayılsaydı sayı şişerdi.
                alt: "En az bir grup seçmiş öğrenci",
                Ikon: Layers,
              },
              {
                etiket: "Okul temsilcisi",
                deger: merkezIstatistik.okulTemsilcisi,
                alt: "Bu eğitim-öğretim yılı",
                Ikon: UsersRound,
              },
              {
                etiket: "İl temsilcisi",
                deger: merkezIstatistik.ilTemsilcisi,
                alt: "Bu eğitim-öğretim yılı",
                Ikon: MapPin,
              },
              {
                etiket: "İlçe temsilcisi",
                deger: merkezIstatistik.ilceTemsilcisi,
                alt: "Bu eğitim-öğretim yılı",
                Ikon: MapPin,
              },
              {
                etiket: "Danışman öğretmen",
                deger: merkezIstatistik.danismanOgretmen,
                alt: "Görevi süren danışmanlar",
                Ikon: UserCheck,
              },
              {
                etiket: "İl koordinatörü",
                deger: merkezIstatistik.ilKoordinatoru,
                alt:
                  merkezIstatistik.koordinatorsuzIl > 0
                    ? `${merkezIstatistik.koordinatorsuzIl} il boş`
                    : "Tüm iller dolu",
                Ikon: Compass,
              },
            ].map((satir) => (
              <SayimKarti
                key={satir.etiket}
                etiket={satir.etiket}
                deger={satir.deger}
                alt={satir.alt}
                Ikon={satir.Ikon}
              />
            ))}
          </div>
        </section>
      )}

      {/*
        HAKKIMDA — BÜTÜN KART IZGARALARININ ALTINDA VE SATIR İÇİ DÜZENLENİR
        (20 Ağustos 2026 · istekler: "hakkımda bölümü kartların altına gelsin,
        düzenlemek istediğinde üzerine tıklayıp değişsin, alta doğru
        açılmasın sağdaki aç kapatlara gerek yok" ve "paneldeki hakkımda
        bölümünü kartların altına al").

        İlk yerleştirmede ölçüm kartlarının hemen altındaydı ve "Dikkat
        gerektirenler" ile "Ekosistem sayıları" ızgaralarını aşağı itiyordu:
        üçü de kart ızgarası, aralarına bir form kutusu girince panel iki kez
        başlıyor gibi oluyordu. Şimdi kartların TAMAMI bitince geliyor —
        okunacak şeyler önce, düzenlenecek şeyler sonra.

        Bölüm aşağıda, katlanır bölümlerin arasındaydı: başlığı, açıklaması ve
        sağında "Aç / Kapat" rozeti olan bir kutu. Üç sorun vardı — metin
        kapalı kutunun ardında hiç görünmüyordu, açmak sayfayı aşağı doğru
        büyütüyordu ve kişinin kendini anlattığı tek cümle, yedi formun arasına
        gömülmüştü.

        Şimdi metnin KENDİSİ duruyor ve tıklanınca YERİNDE forma dönüşüyor:
        metin gider, textarea gelir. Kart aşağı doğru açılmıyor, içeriği
        değişiyor.

        JAVASCRIPT YOK. `<details>` yine kullanılıyor ama katlanır kutu gibi
        değil: gösterim `<summary>`nin İÇİNDE ve `group-open:hidden` ile
        kayboluyor, form da açılınca onun yerine geçiyor. "Aç/Kapat" rozeti
        yok — tıklanacak şey metnin kendisi.

        `list-none` + `[&::-webkit-details-marker]:hidden`: tarayıcının
        varsayılan üçgen imi basılmasın; burada açılan bir liste yok, düzenlenen
        bir metin var.
      */}
      <Kart>
        <details className="group">
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="flex items-center gap-2.5 text-lg font-bold text-baslik">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-kutu bg-vurgu-zemin text-vurgu-metin">
                  <UserRound size={17} />
                </span>
                Hakkımda
              </h2>
              {/*
                Kalem yalnızca KAPALIYKEN görünür: form açıldığında düzenleme
                işaretinin durması, tıklanacak ikinci bir şey varmış gibi
                görünürdü.
              */}
              <span className="text-metin-yumusak transition group-hover:text-vurgu-metin group-open:hidden">
                <Pencil size={16} aria-hidden />
              </span>
            </div>
            {/*
              Metin YOKSA hiçbir şey basılmıyor (21 Ağustos 2026 · istekler:
              "hakkımdanın açıklamasını da sil" · "sadece doldurduğunda
              doldurduğu veriler gelsin"). Burada eskiden "yazmak için buraya
              tıklayın" davetiyesi duruyordu; kart zaten başlığı ve kalemiyle
              tıklanabilir olduğunu söylüyor.
            */}
            {/*
              ÖZET ÜÇ SATIR (22 Ağustos 2026 · istek: "Hakkımda özeti 3 satır
              görünsün; 1500 karakter girince hepsi görünüyor"). Metin
              kırpılmadan basılıyordu ve uzun bir "Hakkımda", altındaki bütün
              bölümleri ekranın dışına itiyordu — kapalı bir kutunun özeti,
              kutunun kendisinden uzun olmamalı.

              KIRPMA GÖRSEL, VERİ DEĞİL: metnin tamamı kutuya tıklanınca açılan
              formda duruyor ve profilde tam hâliyle görünüyor.
            */}
            {profilKaydi.hakkinda && (
              <p className="mt-3 line-clamp-3 whitespace-pre-line text-metin group-open:hidden">
                {profilKaydi.hakkinda}
              </p>
            )}
          </summary>

          <form action={hakkindaKaydetEylemi} className="mt-4 space-y-3">
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
                En fazla {HAKKINDA_MAKS} karakter. Telefon ve adres gibi
                iletişim bilgilerinizi buraya YAZMAYIN.
              </span>
            </label>
            <button type="submit" className={SINIF_BIRINCIL_BUTON}>
              Kaydet
            </button>
          </form>
        </details>
      </Kart>

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
        PROFİLİM (20 Ağustos 2026 · istek: "panel ile profil birleşecek tek
        panel kalacak, düzenleme ve görüntüleme panelden olacak")
        ---------------------------------------------------------------------
        Buradan aşağısı kişinin KENDİ KAYDI: önce e-Okul'dan gelen kimlik
        (değiştirilemez), sonra kendi doldurduğu katlanır bölümler, en sonda
        da bu kayıtların hesaplanmış görünümü (katkı kartı, nişanlar,
        yolculuk) ve KVKK onayları.

        Bölümler KATLI: Panel kullanıcının ilk gördüğü ekran ve asıl işi
        (başvurusu açık etkinlikler, takvim) formların altında kalmamalı.
        Hiçbiri `baslangictaAcik` değil — danışman ve çalışma grubu
        seçimlerinden farkı bu: onlar yapılması GEREKEN işler, bunlar
        istendiğinde yapılan düzenlemeler.

        "PROFİLİMDE NASIL GÖRÜNÜYOR" BAĞLANTILARI KALKTI: her bölümün altında
        profile giden bir bağlantı vardı ve gittiği ekran artık burası.
      */}

      {/*
        `h2` (SayfaBasligi DEĞİL): o bileşen `h1` basıyor ve sayfanın `h1`i
        vitrindeki karşılama. İki `h1`, ekran okuyucuda sayfanın iki başlığı
        varmış gibi görünürdü.
      */}
      {/*
        `id="profilim"`: profil bölgesinin başlangıcı adreslenebilir olmalı —
        eski `/panel/profil` yer imleri ekranın en üstüne düşüyor ve kişinin
        kendi kaydı sayfanın ortasında başlıyor.
      */}
      {/*
        "PROFİLİM" BAŞLIĞI KALKTI (22 Ağustos 2026 · istek: "panelden bu yazıyı
        kaldır: Profilim"). Altındaki kutuların hepsi zaten kendi adını
        taşıyor; başlık bir grup adı olmaktan çıkıp sayfanın ortasında duran
        tek satırlık bir etikete dönmüştü.

        `id` KALIYOR ama artık boş bir çapa: eski `/panel/profil` yer imleri ve
        profile giden bağlantılar buraya iniyor. Kaldırılsaydı o adresler
        sayfanın en tepesine düşerdi.
      */}
      <div id="profilim" className="scroll-mt-6" />

      {/*
        KİMLİK BİLGİLERİ — SALT OKUNUR. Alanlar e-Okul/MEBBİS kaydından gelir;
        sistemde değiştirilemez ve açıklaması tek yerde duruyor
        (lib/kullanici/salt-okunur.ts).
      */}
      <KatlanabilirKart
        baslik="Kimlik bilgileri"
        Ikon={IdCard}
        capa="kimlik-bilgileri"
        /*
          KAPALI AÇILIYOR (22 Ağustos 2026 · istek: "Kimlik bilgileri bu da
          özet olsun tıklanınca büyüsün"). On beş satırlık salt okunur dökümdü
          ve panelin en üstünde duruyordu: kişi kendi düzenleyebildiği
          bölümlere inmek için her seferinde onu geçiyordu. Özette kimliği
          tanıtan üç değer var, gerisi bir tık uzakta.

          `duzenlenebilir` (22 Ağustos 2026 · istek: "Kimlik bilgileri sağ
          tarafta aç kapa yazısını diğerleri gibi kalem yapalım"): kutunun
          içindeki alanlar salt okunur ama sağdaki işaretin işi ekranın
          tutarlılığı — paneldeki diğer katlanır kutuların hepsinde kalem var
          ve tek bir "Aç / Kapat" rozeti sırıtıyordu.
        */
        duzenlenebilir
        ozet={<p>{kimlikOzeti.join(" · ")}</p>}
      >
        <div className="mb-5">
          <RozetSeridi>
            <Rozet cesit="vurgu" Ikon={IdCard}>
              {kullaniciRolEtiketi(kullanici)}
            </Rozet>
            <Rozet>{kullanici.egitimOgretimYili}</Rozet>
          </RozetSeridi>
        </div>
        <dl className="grid gap-5 sm:grid-cols-2">
          <SaltOkunurAlan etiket="Ad" deger={profilKaydi.ad} />
          <SaltOkunurAlan etiket="Soyad" deger={profilKaydi.soyad} />
          {/*
            Üç değer var, iki değil: dış başvuruda (mezun, paydaş) cinsiyet
            SORULMUYOR ve kayıt "B" ile açılıyor. İkili bir gösterim,
            sorulmamış bir bilgiyi "Erkek" diye uydururdu.
          */}
          <SaltOkunurAlan
            etiket="Cinsiyet"
            deger={
              profilKaydi.cinsiyet === "K"
                ? "Kadın"
                : profilKaydi.cinsiyet === "E"
                  ? "Erkek"
                  : "Belirtilmedi"
            }
          />
          <SaltOkunurAlan
            etiket="Eğitim-öğretim yılı"
            deger={kullanici.egitimOgretimYili}
          />
          {okulBilgisiVar && (
            <>
              <SaltOkunurAlan
                etiket="Okul"
                deger={profilKaydi.kurum?.ad ?? null}
              />
              <SaltOkunurAlan
                etiket="Kurum kodu"
                deger={String(profilKaydi.kurumKodu)}
              />
              <SaltOkunurAlan
                etiket="Okul türü"
                deger={profilKaydi.kurum?.okulTuru ?? null}
              />
            </>
          )}
          {profilKaydi.il && (
            <SaltOkunurAlan etiket="İl" deger={profilKaydi.il.ad} />
          )}
          {profilKaydi.ilce && (
            <SaltOkunurAlan etiket="İlçe" deger={profilKaydi.ilce.ad} />
          )}
          {/*
            KURUM VE GÖREV yalnızca dış kullanıcıda. Öğretmenin kurumu okuldur
            ve yukarıda zaten yazıyor. Alanlar salt okunur DEĞİL; girişleri
            aşağıdaki "Bilgilerim" bölümünde.
          */}
          {disKullanici && (
            <>
              <SaltOkunurAlan etiket="Kurum" deger={kurumAdi} />
              <SaltOkunurAlan etiket="Görevi" deger={gorevUnvani} />
              {basvuru?.mezuniyetYili && (
                <SaltOkunurAlan
                  etiket="Mezuniyet yılı"
                  deger={String(basvuru.mezuniyetYili)}
                />
              )}
            </>
          )}
          {ogrenci ? (
            <SaltOkunurAlan etiket="Sınıf" deger={profilKaydi.sinif} />
          ) : (
            profilKaydi.brans && (
              <SaltOkunurAlan etiket="Branş" deger={profilKaydi.brans} />
            )
          )}
          <SaltOkunurAlan
            etiket="Sistem görevi"
            deger={kullaniciRolEtiketi(kullanici)}
          />
          {sorumluIlKodu && (
            <SaltOkunurAlan
              etiket="Sorumlu olduğu il"
              deger={
                sorumluIl ? `${sorumluIl.ad} (${sorumluIlKodu})` : sorumluIlKodu
              }
            />
          )}
        </dl>
      </KatlanabilirKart>

      {/*
        "FOTOĞRAFIM" BÖLÜMÜ KALKTI (20 Ağustos 2026 · istek: "paneldeki altta
        bulunan fotoğrafıma gerek kalmadı o zaten üstte olacak, alttakini
        kaldıralım ama banner üzerindeki alttaki ile ilişkili kalkınca
        bannerdaki görsel ekleme bağımsız olsun").

        Yükleme ve kaldırma formu VİTRİNE taşındı, silinmedi: fotoğrafa
        tıklayınca orada açılıyor (bkz. sayfanın başındaki `<details>`).
        Eylemler aynı eylemler; değişen tek şey formun durduğu yer.
      */}

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
          Ikon={ShieldCheck}
          capa="yegitek-sorumlulugum"
          duzenlenebilir
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
        /*
          ÖĞRENCİDE AÇIKLAMA YOK (21 Ağustos 2026 · istek: "Bu alanları siz
          düzenleyebilirsiniz; profilinizde görünür. paneldeki bu açıklama
          silinsin"). Başlık ve alanların kendisi zaten ne olduğunu söylüyordu.
          Dış kullanıcıda ve öğretmende satır KALIYOR: orada açıklama başka bir
          şey söylüyor — bölümün iletişim dışında ne taşıdığını ve bilgiyi
          kimin göreceğini.
        */
        Ikon={Mail}
        capa="iletisim-bilgilerim"
        duzenlenebilir
        ozet={
          iletisimOzeti.length > 0 ? <p>{iletisimOzeti.join(" · ")}</p> : undefined
        }
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
          Ikon={Layers}
          capa="katki-alanlarim"
          duzenlenebilir
          baslangictaAcik={acilacakBolum === "katki-alanlarim"}
        >
          {/*
            SEÇİLİ GRUPLAR ÖNCE, FORM SONRA (20 Ağustos 2026 · birleşme).
            Profilde bu seçim rozet olarak görünüyordu; o ekran kapandı.
            Rozetler işaret kutularının tekrarı değil ÖZETİ: on beş kutunun
            içinden hangi ikisinin işaretli olduğu, tek satırda okunur.
          */}
          {profilKaydi.destekGruplari.length > 0 && (
            <ul className="mb-5 flex flex-wrap gap-2">
              {profilKaydi.destekGruplari.map(({ calismaGrubu }) => (
                <li
                  key={calismaGrubu.id}
                  className="rounded-full bg-vurgu-zemin px-3 py-1 text-sm text-vurgu-metin"
                >
                  {calismaGrubu.ad}
                </li>
              ))}
            </ul>
          )}
          <DestekGruplariDuzenleme
            gruplar={destekVerisi[0]}
            seciliGrupIdleri={destekVerisi[1].map(
              (satir) => satir.calismaGrubuId,
            )}
            kaydetEylemi={destekGruplariEylemi}
          />
        </KatlanabilirKart>
      )}

      <KatlanabilirKart
        baslik="Özgeçmişim (CV)"
        /*
          ÖĞRENCİDE AÇIKLAMA YOK (21 Ağustos 2026 · istek). Öğretmende satır
          kalıyor: CV'yi kimin göreceği orada hâlâ sorulan bir soru.
        */
        Ikon={FileText}
        capa="cvm"
        duzenlenebilir
        ozet={
          cvOzeti ? (
            <p>
              {cvOzeti}
              {cvTarihi && (
                <span className="text-metin-yumusak">
                  {" "}
                  · {tarihYaz(cvTarihi)} tarihinde yüklendi
                </span>
              )}
            </p>
          ) : undefined
        }
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
      </KatlanabilirKart>

      {/*
        KAYIT BÖLÜMLERİ PANELE GERİ DÖNDÜ (22 Ağustos 2026 · istek: "paneldeki
        Bilişim Yolculuğum kartı kalkacak, içindekiler panelin altına sırayla
        ayrı gruplara açılır gelecek … diğerlerini direk panele alt alta
        alıyoruz açılır şekilde").

        21 Ağustos'ta kendi sayfasına çıkmışlardı ve panelde yerlerine bir kart
        vardı; kart kalktığı için sayfanın kapısı da kalmadı. /panel/bilisim-
        yolculugum SİLİNDİ, eski bağlantılar bu bölümlerin çapalarına
        yönlendiriliyor (bkz. kazanimGrupCapasi).

        HER GRUP KENDİ KUTUSU, KENDİ FORMU: ortak formda hangi başlığa kayıt
        girildiği yalnızca seçili sekmeden anlaşılıyordu. Sıra
        `kayitEklemeGruplari` sırasıdır — profildeki başlık sırasıyla aynı.
      */}
      {kayitGruplari.map(({ grup, tanimlar }) => {
        const capa = kazanimGrupCapasi(grup.kod);
        const seciliTanim =
          tanimlar.find((tanim) => tanim.tip === seciliKayitTuru) ??
          tanimlar[0];
        /*
          ÖZET ARTIK SAYI DEĞİL, KAYITLARIN KENDİSİ (22 Ağustos 2026 · istek:
          "Topluluklarım / Ekiplerim ekleyince özetleri görünsün").

          Önce "3 kayıt" yazıyordu; kişi ne girdiğini görmek için kutuyu açmak
          zorundaydı ve kutu açılınca yalnızca EKLEME FORMU çıkıyordu — girilen
          kayıtlar panelde başka hiçbir yerde görünmüyor ("Girdiğim kayıtlar"
          bölümü kalktı). Başlıklar özette durunca kutu kapalıyken de "ne
          eklemiştim" sorusunun cevabı ekranda.

          BOŞ GRUPTA HİÇ BASILMIYOR: "0 kayıt" satırı ekranı bilgi değil eksik
          listesi gibi okuturdu (aynı kural İletişim bilgilerimde).

          ÜÇ GRUPTA DA aynı: istek Topluluklarım için geldi ama Ürünlerim ve
          Deneyimlerim de aynı sebeple aynı durumdaydı.
        */
        const grubunKayitlari = profilKaydi.kazanimlar.filter((kazanim) =>
          grup.tipler.includes(kazanim.tip),
        );

        return (
          <KatlanabilirKart
            key={grup.kod}
            baslik={grup.baslik}
            aciklama={grup.aciklama}
            Ikon={Sparkles}
            capa={capa}
            duzenlenebilir
            baslangictaAcik={acilacakBolum === capa}
            ozet={
              grubunKayitlari.length > 0 ? (
                /*
                  `line-clamp-2`: yirmi kayıt giren kişide özet, kutunun
                  kendisinden uzun olurdu. Sayı başta duruyor — kırpılan
                  listede kaç kaydın olduğu yine okunuyor.
                */
                <p className="line-clamp-2">
                  <span className="font-medium">
                    {grubunKayitlari.length} kayıt
                  </span>
                  {" · "}
                  {grubunKayitlari.map((kazanim) => kazanim.baslik).join(" · ")}
                </p>
              ) : undefined
            }
          >
            {/*
              GİRİLEN KAYITLAR FORMUN ÜSTÜNDE (25 Ağustos 2026 · istek: "bu üç
              başlıkta … daha önce girilen etkinlik için ismi ve düzenleme
              kısmı var; onu formların üstüne alalım, yani üstte gözüksün bu
              düzenleme ve liste").

              24 Ağustos'ta liste formun ALTINDAYDI: kutuyu açan kişi önce sekiz
              alanlı boş bir formla karşılaşıyor, girdiği kaydı görmek için
              onu geçmek zorunda kalıyordu. Kutuyu açmanın asıl sebebi çoğu
              zaman "ne girmiştim / şunu düzelteyim" — ekleme ikinci iş.

              Her satır kaydın kendi sayfasına gidiyor (bkz.
              panel/kayitlarim/[id]); düzenlemenin başka kapısı yok.
            */}
            <GirilenKayitlar kazanimlar={grubunKayitlari} tanimlar={tanimlar} />
            <KayitEklemeFormu
              grup={grup}
              tanimlar={tanimlar}
              seciliTanim={seciliTanim}
              izinliBelgeTipleri={izinliBelgeTipleri}
              belgeSinirlari={belgeSinirlari}
              ekleEylemi={kazanimEkleEylemi}
            />
          </KatlanabilirKart>
        );
      })}

      {/*
        "GİRDİĞİM KAYITLAR" BÖLÜMÜ KALKTI (22 Ağustos 2026 · istek: "panelde
        Girdiğim kayıtlar bunu kaldır en altta").

        Bölüm girilen bütün kayıtları tipe göre listeliyor, her satırda silme ve
        "destekleyici belge ekle" formunu taşıyordu.

        BUNUNLA BİRLİKTE GİDEN İKİ İŞ: kayıt silme ve var olan bir kayda
        sonradan belge ekleme/çıkarma. Sunucu eylemleri (kazanimSilEylemi,
        kazanimBelgeEkleEylemi, kazanimBelgeSilEylemi) DURUYOR ve yetki
        kontrolleri yerinde — yalnızca onları çağıran ekran yok. Bu işler geri
        istendiğinde bölüm yeniden basılabilir ya da kayıtlar grup kutularının
        içine dağıtılabilir.
      */}


      {/*
        ---------------------------------------------------------------------
        KAYITLARIMIN GÖRÜNEN HÂLİ (20 Ağustos 2026 · birleşme)
        ---------------------------------------------------------------------
        Buradan aşağısı DÜZENLENMEZ, HESAPLANIR: katkı kartı, nişanlar,
        katılım geçmişi ve danışmanlık listesi girilen kayıtlardan türer.
        Katlanır değiller — düzenleme bölümlerinden farkları bu: bir formun
        kapalı durması "işin yoksa açma" demektir, bir sayımın kapalı durması
        onu görünmez yapardı.
      */}

      {/*
        ÖĞRENCİLERİM — danışman öğretmenin karşılığı. Liste profilden geldi;
        ekranın kendisi (`/panel/ogrenciler`) yerinde ve bağlantı oraya
        gidiyor.
      */}
      {!ogrenci && danismanlikSecimiGosterilir && (
        <Kart>
          <KartBasligi
            baslik="Öğrencilerim"
            Ikon={Users}
          />
          {ogrencileri.length === 0 ? (
            <p className="text-metin-yumusak">Danışmanlığınızda öğrenci yok.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {ogrencileri.map((satir) => (
                <li key={satir.ogrenci.id}>
                  <Link
                    href={`/panel/ogrenciler/${satir.ogrenci.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-rol-ogrenci-zemin px-3 py-1 text-sm text-rol-ogrenci-metin transition hover:opacity-80"
                  >
                    {satir.ogrenci.ad} {satir.ogrenci.soyad}
                    {satir.ogrenci.sinif && (
                      <span className="text-xs opacity-80">
                        {satir.ogrenci.sinif}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/panel/ogrenciler"
            className="mt-4 inline-block text-sm font-medium text-vurgu-metin underline underline-offset-2"
          >
            Öğrencilerim ekranına git →
          </Link>
        </Kart>
      )}

      {/*
        İLİMDEKİ KİŞİLER — koordinatörün "Öğrencilerim" karşılığı. Sayım,
        liste değil: üç yüz kişilik bir listeyi buraya basmanın faydası yok, o
        iş kendi ekranında.
      */}
      {koordinatorOzeti && (
        <Kart>
          <KartBasligi
            baslik="İlimdeki kişiler"
            Ikon={Users}
          />
          <dl className="grid gap-5 sm:grid-cols-3">
            <SaltOkunurAlan
              etiket="Öğrenci"
              deger={String(koordinatorOzeti.ogrenciSayisi)}
            />
            <SaltOkunurAlan
              etiket="Öğretmen"
              deger={String(koordinatorOzeti.ogretmenSayisi)}
            />
            <div>
              <dt className="text-sm font-medium text-metin-yumusak">
                Danışmansız öğrenci
              </dt>
              <dd
                className={`mt-0.5 font-medium ${
                  koordinatorOzeti.danismansiz > 0
                    ? "text-uyari-metin"
                    : "text-metin"
                }`}
              >
                {koordinatorOzeti.danismansiz}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link
              href="/panel/ogrenciler"
              className="text-sm font-medium text-vurgu-metin underline underline-offset-2"
            >
              Öğrenciler ekranına git →
            </Link>
            <Link
              href="/panel/ogretmenler"
              className="text-sm font-medium text-vurgu-metin underline underline-offset-2"
            >
              Öğretmenler ekranına git →
            </Link>
          </div>
        </Kart>
      )}

      {/*
        "GENÇTEK YOLCULUĞUM" VE "KATKI NİŞANLARIM" KENDİ SAYFALARINA TAŞINDI
        (21 Ağustos 2026 · istekler: "Şu bölüm kalkacak: GençTek Yolculuğum.
        Ancak yaptığı görevler Görevlerim kart olarak yukarı taşınacak" ·
        "Kayıtlarım ve katkı nişanlarımı panelden kaldır alttan").

        Yeni adresler: /panel/gorevlerim ve /panel/nisanlarim. İkisinin de
        panelde bir kartı var; kartlar sayıyı gösteriyor, sayfalar listeyi.
      */}

      {/*
        ÖĞRETMENİN GENÇTEK TARAFI. Katıldığı etkinlikler ÜRETİLEN BELGEDEN
        türetilir, öğrencideki kuralın aynısı (lib/kazanim/katilim-kurallar.ts).
      */}
      {ogretmenKazanim && <KatilimKarti kazanim={ogretmenKazanim} />}

      {/*
        ÖĞRETMENİN KATKI NİŞANLARI DA /panel/nisanlarim ekranında (21 Ağustos
        2026): iki rol aynı sayfayı kullanıyor, ölçütleri farklı kaynaklardan
        besleniyor.
      */}

      {/*
        ROTAM EKRANDAN TAMAMEN KALKTI (20 Ağustos 2026 · istek: "rotam komple
        kalkacak").

        Bölümün GİRİŞİ 14 Ağustos'ta kaldırılmıştı; 20 Ağustos'ta panel ile
        profil birleşince girilmiş hedefler kısa süre burada listelendi, o
        liste de kalktı. Panelde artık hiçbir izi yok.

        VERİ SİLİNMEDİ ve eylemler duruyor (`profil/hedef-eylemleri.ts`):
        kullanıcıların girdiği hedefler `kullanici_hedefi` tablosunda. Ekran
        kararıyla veri silmek geri alınamaz bir iş olurdu; bölüm geri
        istenirse kayıtlar yerinde.
      */}

      {/*
        KVKK / ONAY BELGELERİ BÖLÜMÜ KALKTI (21 Ağustos 2026 · istek: "KVKK'lar
        panelden kalkacak … kvkk olmasın"). Yerine uygulamanın açılışında bir
        kez çıkan çerez bildirimi var (components/CerezBildirimi.tsx).

        Metinler ve verilmiş onaylar DURUYOR (lib/kvkk/*, `kullanici_onayi`):
        kalkan, kullanıcıdan onay isteyen yüzey.
      */}

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

      {/*
        "ETKİNLİK TAKVİMİ" BÖLÜMÜ KALKTI (20 Ağustos 2026 · istek: "Etkinlik
        takvimi bunu kaldıralım").

        Bugün / Yaklaşan / Geçmiş üçlüsü panelin en uzun bölümüydü ve aynı
        bilgiyi başka yerler daha kısa veriyor: sıradaki kendi etkinliği
        yukarıdaki kartta, başvurusu açık olanlar şeritte, tamamı ise
        Etkinlikler ekranında (/panel/etkinlikler) filtreleriyle duruyor.

        VERİ AKIŞI DURUYOR: `takvimFaaliyetleri` sorgusu, başvuru şeridini
        (`seritKayitlari`) beslediği için yerinde kaldı; yalnızca takvim
        bölümü basılmıyor.
      */}
      {/*
        "BİLDİRİMLER" BÖLÜMÜ KALKTI (22 Ağustos 2026 · istek: "panelde en
        alttaki bildirimleri kaldıralım, tamamını başka sayfaya taşıyıp,
        bannerdaki '3 okunmamış mesajı var' butonuna tıklayınca o sayfaya
        gitsin").

        Buradaki liste zaten yalnızca son beş OKUNMAMIŞ satırdı ve tamamı
        /panel/bildirimler ekranında duruyor — süzgeçleri, sayfalaması ve
        okunmuş kayıtlarıyla. İki yüzey aynı işi yaparken vitrindeki düğme
        kişiyi eksik olana indiriyordu; artık doğrudan tam listeye götürüyor.

        VERİ AKIŞI DURUYOR: okunmamış sayısı (`okunmamisMesajSayisi`) vitrindeki
        düğme için hâlâ hesaplanıyor, yalnızca liste basılmıyor.
      */}
    </div>
  );
}
