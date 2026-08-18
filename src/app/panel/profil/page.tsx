import {
  BadgeCheck,
  FileText,
  GraduationCap,
  Handshake,
  IdCard,
  Layers,
  Link2,
  Mail,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { KatkiKarti } from "@/components/KatkiKarti";
import {
  KatilimKarti,
  KazanimBolumleri,
  KazanimGruplari,
  SaltOkunurAlan,
  KatkiNisanlariKarti,
} from "@/components/OgrenciProfilBolumleri";
import { OnayBelgeleriBolumu } from "@/components/OnayBelgeleriBolumu";
import {
  PaneldenDuzenleBaglantisi,
  ProfilFotografi,
} from "@/components/ProfilDuzenleme";
import { RotamKarti } from "@/components/RotamKarti";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  Rozet,
  RozetSeridi,
  SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { aktifAtamaGetir } from "@/lib/danisman/atama";
import { prisma } from "@/lib/db";
import { uygulamaYolu } from "@/lib/ortam";
import {
  kazanimlariGetir,
  ogretmenKazanimlariGetir,
} from "@/lib/kazanim/getir";
import { SALT_OKUNUR_ACIKLAMASI } from "@/lib/kullanici/salt-okunur";
import { onayDurumlari } from "@/lib/kvkk/onay";
import {
  MENTORLUK_DURUM_ETIKETLERI,
  MENTORLUK_DURUM_SINIFLARI,
  mentorKapsamiYaz,
} from "@/lib/mentor/kurallar";
import { mentorluguGetir } from "@/lib/mentor/veri";
import { BAGLANTI_TANIMLARI } from "@/lib/ogrenci/iletisim-kurallar";
import { katkiVerisiGetir } from "@/lib/ogrenci/katki";
import { ogretmenKapsamFiltresi } from "@/lib/yetki/kapsam";
import { tarihSaatYaz } from "@/lib/tarih";
import { kullaniciRolEtiketi } from "@/lib/yetki/etiketler";
import {
  danismanMi,
  disKullaniciMi,
  ilKoordinatoruMu,
  koordinatorIlKodu,
  ogrenciMi,
  projeYoneticisiMi,
} from "@/lib/yetki/izinler";
import { belgeOnaylaEylemi } from "./belge-eylemleri";

export const dynamic = "force-dynamic";

/**
 * PROFİL ARTIK SALT OKUNUR (C4 · 7 Ağustos 2026).
 *
 * İstek: "foto ekleme değiştirme panelden yapılsın, profil kısmında sadece
 * foto görünsün, iletişim bilgileri düzenleme panel sekmesine taşınsın,
 * profilden sadece görünsün, profildeki danışman ekleme düzenleme panel
 * kısmına taşınsın, profilde sadece danışmanın adı gözüksün, GençTek
 * Yolculuğum Bilişim Yolculuğum ve Rotam bölümlerinin sadece bilgileri
 * profilde görünsün, bilgi girişleri ve düzenleme panelden yapılsın"
 *
 * Bu ekranda HİÇBİR form yoktur — tek istisna en alttaki KVKK onayı. Onay bir
 * "profil bilgisi" değil, hukuki bir beyandır ve metnin okunduğu yerde
 * verilmesi gerekir; panele taşımak, onaylanan metinden koparırdı. Şerit ve
 * eski `/panel/kvkk` adresi de buraya çapa ile geliyor.
 *
 * Bölümlerin düzenleme yüzeyi Panelim'dedir (`/panel`); her bölümün altındaki
 * bağlantı oraya, ilgili çapaya iner.
 */

const DURUM_MESAJLARI: Record<string, string> = {
  "belge-onaylandi":
    "Onayınız kaydedildi ve erişim kayıtlarına işlendi.",
};

function tekil(deger: string | string[] | undefined): string | null {
  if (Array.isArray(deger)) return deger[0] ?? null;
  return deger ?? null;
}

export default async function ProfilSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  const parametreler = await searchParams;

  const kayit = await prisma.kullanici.findUniqueOrThrow({
    where: { id: kullanici.id },
    include: {
      kurum: { select: { ad: true, okulTuru: true } },
      il: { select: { ad: true } },
      ilce: { select: { ad: true } },
      ogrenciProfil: true,
      ogretmenProfil: true,
      /*
       * DIŞ KULLANICININ KURUM/GÖREV KAYNAĞI (7 Ağustos 2026 · istek: profilde
       * "il kurum görevi").
       *
       * Başvuru DONDURULMUŞ bir belgedir ve değişmez; kişi kendi kurumunu
       * profil alanlarından günceller. Burası yalnızca o alanlar BOŞKEN
       * gösterilecek ilk değeri veriyor — onaylanmış mezun ve paydaşların
       * profili, hiçbir şey yazmadan da dolu açılsın diye.
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
       * "Çalışma Grupları" — Panel'de seçiliyor, profilde görünüyor. Mentörlük
       * kaydındaki gruplardan AYRI (bkz. prisma/schema.prisma).
       */
      destekGruplari: {
        orderBy: { calismaGrubu: { siraNo: "asc" } },
        select: { calismaGrubu: { select: { id: true, ad: true } } },
      },
      kazanimlar: {
        // Kullanıcının girdiği tarih boş olabildiği için ikinci sıralama ölçütü
        // gerekiyor; yoksa tarihsiz kayıtların sırası belirsiz kalır.
        orderBy: [{ tarih: "desc" }, { olusturmaTarihi: "desc" }],
        include: {
          // Destekleyici belgeler. Yalnızca ad ve kimlik gerekiyor; depolama
          // anahtarı ekrana HİÇ çıkmaz, indirme kapsam kontrollü rotadan geçer.
          ekler: {
            select: { id: true, dosyaAdi: true },
            orderBy: { yuklenmeTarihi: "asc" },
          },
          // Ürünün çoklu bağlantıları (D5).
          baglantilar: {
            select: { id: true, adres: true, etiket: true },
            orderBy: { siraNo: "asc" },
          },
        },
      },
    },
  });

  const ogrenci = ogrenciMi(kullanici);
  // Kazanım kayıtları öğretmende de var; metinler bununla ayrılıyor.
  const kazanimSahibi = ogrenci ? "OGRENCI" : "OGRETMEN";

  /*
   * MEZUN / PAYDAŞ TEMSİLCİSİ / MENTÖR PROFİLİ (7 Ağustos 2026 · istek:
   * "1. sekme Profil · Foto · Bilgileri (il kurum görevi linkedin github
   * eposta açıklamalar/katkı sağlayabileceği şeyler) · Özgeçmiş · Katkı
   * Nişanım").
   *
   * Öğretmen profilinden farkı SORULARDA: okul, branş, sınıf, danışmanlık gibi
   * alanların hiçbiri yok — kişinin ekosistemdeki yerini kurumu, görevi,
   * bağlantıları ve ne katkı verebileceği anlatıyor.
   */
  const disKullanici = disKullaniciMi(kullanici);
  const disProfil = kayit.ogretmenProfil;
  const basvuru = kayit.disBasvurusu;

  /*
   * Kurum ve görev: önce kişinin kendi yazdığı, yoksa başvurudaki değer.
   *
   * Onay anında KOPYALANMADI ve bu bilinçli: kopyalama, bugüne kadar onaylanmış
   * bütün mezun/paydaş satırlarını dolduran bir veri taşıma adımı gerektirirdi
   * ve başvuru zaten tek doğruluk kaynağı olarak duruyor. Kişi kendi değerini
   * yazdığı anda bu düşüş sona eriyor.
   */
  const kurumAdi =
    disProfil?.kurumAdi ??
    basvuru?.paydas?.ad ??
    basvuru?.mezunKurum?.ad ??
    null;
  const gorevUnvani = disProfil?.gorevUnvani ?? basvuru?.gorevUnvani ?? null;

  const atama = ogrenci ? await aktifAtamaGetir(kullanici.id) : null;

  // Rozetler ve katkı kartı öğrenciye özgüdür; öğretmenin karşılığı
  // /panel/kazanimlarim ekranındadır (kaynakları bambaşka tablolar).
  const kazanim = ogrenci ? await kazanimlariGetir(kullanici.id) : null;
  const katki = ogrenci ? await katkiVerisiGetir(kullanici.id) : null;

  /*
   * ÖĞRETMENİN KENDİ VERİSİ (7 Ağustos 2026 · istek: öğretmen profilinde
   * "Öğrencileri · Katıldığım GençTek Etkinlikleri · Ürünlerim · Seferlerim
   * (Katkı Nişanım)").
   *
   * Katılım ve nişanlar öğrencininkinden BAŞKA bir fonksiyondan geliyor
   * (`ogretmenKazanimlariGetir`): öğretmenin çalışma grubu seçimi ve öğrenci
   * görev rolü yok, onun yerine düzenlediği faaliyetler ve danışmanlığı
   * sayılıyor.
   */
  const ogretmenKazanim = ogrenci
    ? null
    : await ogretmenKazanimlariGetir(kullanici.id);

  /*
   * Danışmanlığındaki öğrenciler. Kapsam filtresi KULLANILMIYOR: soru "bu
   * kişinin kapsamında kimler var" değil, "kimin danışmanı" — ikisi farklı.
   * Danışman öğretmenin kapsamı tüm okuludur, danışmanlığı yalnızca kendi
   * öğrencileri.
   */
  const ogrencileri = ogrenci
    ? []
    : await prisma.danismanAtama.findMany({
        where: { danismanKullaniciId: kullanici.id, bitisTarihi: null },
        orderBy: { baslangicTarihi: "desc" },
        select: {
          ogrenci: {
            select: { id: true, ad: true, soyad: true, sinif: true },
          },
        },
      });


  /*
   * "Rotam" hedefleri (D6). Sıralama KODDA yapılıyor (lib/hedef/kurallar.ts),
   * SQL'de değil: kural "önce süren, sonra planlanan, en sonda tamamlanan".
   */
  const hedefler = await prisma.kullaniciHedefi.findMany({
        where: { kullaniciId: kullanici.id },
        orderBy: { id: "asc" },
        select: {
          id: true,
          baslik: true,
          aciklama: true,
          durum: true,
          hedefTarihi: true,
        },
      });

  /*
   * KVKK ve onay belgeleri. Kullanıcıdan hiçbir belge istenmiyorsa liste boş
   * döner ve bölüm hiç basılmaz.
   */
  const belgeDurumlari = await onayDurumlari(kullanici);

  /*
   * MENTÖRLÜK (7 Ağustos 2026 · istek: "Profilde istenen mentör girişi de
   * olsun"). Profil salt okunur olduğu için burada yalnızca DURUM görünüyor;
   * başvuru ve güncelleme Panel'deki "Mentör olarak başvur" bölümünde.
   */
  const mentorluk = await mentorluguGetir(kullanici.id);

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
   * KOORDİNATÖRÜN KARŞILIĞI (7 Ağustos 2026 · istek: "il koordinatörleri için
   * de öğretmen ile benzer yapıyı kur").
   *
   * Öğretmende "Öğrencilerim" danışmanlığındakileri listeliyor; koordinatör
   * danışman DEĞİLDİR ve danışmanlığında öğrenci yoktur. Onun karşılığı
   * sorumlu olduğu ildeki SAYIMDIR — üç yüz kişilik bir listeyi profile
   * basmanın kimseye faydası yok, o iş kendi ekranında.
   *
   * "Danışmansız" ayrı sayılıyor: koordinatörün ilinde eyleme geçmesi gereken
   * tek sayı odur (SKILL.md · Değişmezler 2 — öğrenci boşta kalamaz).
   */
  const koordinatorOzeti =
    !ogrenci && sorumluIlKodu
      ? await (async () => {
          const [ogrenciSayisi, ogretmenSayisi, danismansiz] =
            await Promise.all([
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

  /*
   * Danışmanlık işareti yalnızca okulunda görev alabilecek öğretmene sorulur.
   * YEĞİTEK personelinin ve il koordinatörünün okulu yoktur, ayrıca il
   * koordinatörü aynı anda danışman olamaz.
   */
  const danismanlikGosterilir =
    !ogrenci &&
    !ilKoordinatoruMu(kullanici) &&
    !projeYoneticisiMi(kullanici) &&
    kayit.kurumKodu !== null;

  const okulBilgisiVar = kayit.kurumKodu !== null;

  // İletişim bilgisi iki profil tablosundan birinde durur; ekran için hangisi
  // olduğu önemli değil.
  const iletisim = ogrenci ? kayit.ogrenciProfil : kayit.ogretmenProfil;

  const hata = tekil(parametreler.hata);
  const durum = tekil(parametreler.durum);

  // CV artık öğretmende de var; hangi profil tablosundan okunacağı role bağlı.
  const cv = ogrenci ? kayit.ogrenciProfil : kayit.ogretmenProfil;
  const cvVar = Boolean(cv?.cvDepolamaYolu);
  const cvYolu = ogrenci
    ? `/panel/ogrenciler/${kullanici.id}/cv`
    : `/panel/ogretmenler/${kullanici.id}/cv`;

  /*
   * Adresin sonundaki sürüm damgası, yeni fotoğraf yüklendiğinde tarayıcının
   * eskisini göstermesini engeller: rota kısa ömürlü bir ön bellek bıraktığı
   * için adres değişmezse görsel güncellenmiş görünmezdi.
   */
  const fotoAdresi = kayit.fotoYuklenmeTarihi
    ? uygulamaYolu(`/panel/profil/foto?s=${kayit.fotoYuklenmeTarihi.getTime()}`)
    : null;

  return (
    <div className="space-y-8">
      {/*
        KİMLİK BAŞLIĞI (18 Ağustos 2026 · tasarım yenilemesi).

        Eskiden sayfa düz bir "Profilim" başlığıyla açılıyor, fotoğraf ise
        hemen altında KENDİ KARTINDA tek başına duruyordu — başlığı "Profil
        fotoğrafı" olan, içinde tek bir yuvarlak resim bulunan bir kutu. Kişinin
        adı, rolü ve okulu ise üç kart aşağıdaki "Kimlik bilgileri" tablosunun
        satırlarına dağılmıştı.

        İkisi birleştirildi: profil ekranının ilk söylemesi gereken şey "bu
        kimsin"dir. Fotoğraf, ad, rol ve okul artık tek bir bloktadır ve tablo
        aşağıda ayrıntı olarak kalır.

        VİTRİN (kırmızı gradyan blok) BİLİNÇLİ OLARAK KULLANILMADI: o blok
        Panel'e ait — sistemin açılış ekranı orası ve rengin tam güçte
        göründüğü tek yer olması, vurgunun değerini koruyor (bkz.
        app/panel/page.tsx). Her sayfaya kırmızı bant koymak ikisini de
        sıradanlaştırırdı.
      */}
      <Kart>
        <div className="flex flex-wrap items-center gap-6">
          <ProfilFotografi
            ad={kayit.ad}
            soyad={kayit.soyad}
            adres={fotoAdresi}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-[26px] leading-tight font-extrabold text-baslik">
              {kayit.ad} {kayit.soyad}
            </h1>
            <div className="mt-2.5">
              <RozetSeridi>
                <Rozet cesit="vurgu" Ikon={IdCard}>
                  {kullaniciRolEtiketi(kullanici)}
                </Rozet>
                <Rozet>{kayit.egitimOgretimYili}</Rozet>
              </RozetSeridi>
            </div>
            {/*
              Okul satırı yalnızca okul kaydı olanda basılır: dış kullanıcının
              (mezun, paydaş) okulu yoktur ve boş bir satır, eksik veri gibi
              görünürdü.
            */}
            {okulBilgisiVar && (
              <p className="mt-2.5 text-sm text-metin-yumusak">
                {[kayit.kurum?.ad, kayit.ilce?.ad, kayit.il?.ad]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            <PaneldenDuzenleBaglantisi
              capa="fotografim"
              etiket="Fotoğrafımı Panelim'den değiştir →"
            />
          </div>
        </div>
      </Kart>

      <BilgiKutusu>
        Bu ekran profilinizin görünen hâlidir. Bilgi girişi ve düzenleme
        Panelim ekranından yapılır.
      </BilgiKutusu>

      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}
      {durum && DURUM_MESAJLARI[durum] && (
        <BilgiKutusu cesit="olumlu">{DURUM_MESAJLARI[durum]}</BilgiKutusu>
      )}

      <Kart>
        <KartBasligi
          baslik="Kimlik bilgileri"
          aciklama={SALT_OKUNUR_ACIKLAMASI}
          Ikon={IdCard}
        />
        <dl className="grid gap-5 sm:grid-cols-2">
          <SaltOkunurAlan etiket="Ad" deger={kayit.ad} />
          <SaltOkunurAlan etiket="Soyad" deger={kayit.soyad} />
          {/*
            Üç değer var, iki değil: dış başvuruda (mezun, paydaş) cinsiyet
            SORULMUYOR ve kayıt "B" ile açılıyor. İkili bir gösterim, sorulmamış
            bir bilgiyi "Erkek" diye uydururdu.
          */}
          <SaltOkunurAlan
            etiket="Cinsiyet"
            deger={
              kayit.cinsiyet === "K"
                ? "Kadın"
                : kayit.cinsiyet === "E"
                  ? "Erkek"
                  : "Belirtilmedi"
            }
          />
          <SaltOkunurAlan
            etiket="Eğitim-öğretim yılı"
            deger={kayit.egitimOgretimYili}
          />
          {okulBilgisiVar && (
            <>
              <SaltOkunurAlan etiket="Okul" deger={kayit.kurum?.ad ?? null} />
              <SaltOkunurAlan
                etiket="Kurum kodu"
                deger={String(kayit.kurumKodu)}
              />
              <SaltOkunurAlan
                etiket="Okul türü"
                deger={kayit.kurum?.okulTuru ?? null}
              />
            </>
          )}
          {kayit.il && <SaltOkunurAlan etiket="İl" deger={kayit.il.ad} />}
          {kayit.ilce && <SaltOkunurAlan etiket="İlçe" deger={kayit.ilce.ad} />}
          {/*
            KURUM VE GÖREV yalnızca dış kullanıcıda. Öğretmenin kurumu okuldur
            ve yukarıda kimlik bilgisi olarak zaten yazıyor; oraya ikinci bir
            "kurum" satırı koymak aynı bilgiyi iki kez sorardı.

            Alanlar SALT OKUNUR DEĞİL ama bu ekranda öyle görünür: girişleri
            Panel'de (bkz. C4 · profil gösterir, panel düzenler).
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
            <SaltOkunurAlan etiket="Sınıf" deger={kayit.sinif} />
          ) : (
            kayit.brans && <SaltOkunurAlan etiket="Branş" deger={kayit.brans} />
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
      </Kart>

      {/*
        HAKKIMDA (13 Ağustos 2026 · istek: "panele hakkımda bölümü ekle,
        profilde görünsün, elle uzmanlıklarını üzerinde çalıştığı projeleri
        yazsın").

        KİMLİK BİLGİLERİNİN HEMEN ARDINDA: kimlik alanları e-Okul'dan gelir ve
        kişiyi "kayıtta ne yazıyor" diye anlatır; bu metin ise kişinin kendini
        anlattığı tek yerdir ve profili okuyanın ilk merak ettiği şeydir.

        Metni olmayanda da kart BASILIYOR ve ne yazılacağını söylüyor: boş
        bırakmak, alanın var olduğunu hiç duymamış kullanıcıyı öylece bırakırdı.
        Düzenleme Panel'de (Profil GÖSTERİR, Panel DÜZENLER).
      */}
      <Kart>
        <KartBasligi
          baslik="Hakkımda"
          aciklama="Uzmanlıklarınız ve üzerinde çalıştığınız projeler; bu metni siz yazarsınız."
          Ikon={UserRound}
        />
        <p className="whitespace-pre-line text-metin">
          {kayit.hakkinda || "Henüz bir tanıtım metni yazmadınız."}
        </p>
        <PaneldenDuzenleBaglantisi
          capa="hakkimda"
          etiket="Hakkımda metnimi Panel'den düzenle →"
        />
      </Kart>

      {/*
        İLETİŞİM ARTIK SALT OKUNUR. Form Panelim'e taşındı; burada yalnızca
        girilen değerler görünüyor. Kimlik bilgileriyle aynı bileşenden
        (`SaltOkunurAlan`) basılıyor — kullanıcı açısından ikisi de "profilimde
        yazan bilgi", farkları yalnızca kimin girdiği.
      */}
      <Kart>
        <KartBasligi
          baslik="İletişim bilgileri"
          aciklama={
            ogrenci
              ? "Bu bilgileri siz girersiniz."
              : "Bu bilgileri siz girersiniz; kapsamınızdaki kişiler size buradan ulaşır."
          }
          Ikon={Mail}
        />
        <dl className="grid gap-5 sm:grid-cols-2">
          <SaltOkunurAlan etiket="E-posta" deger={iletisim?.eposta ?? null} />
          <SaltOkunurAlan etiket="Telefon" deger={iletisim?.telefon ?? null} />
        </dl>

        {/*
          BAĞLANTILAR ÖĞRENCİDE VE DIŞ KULLANICIDA (7 Ağustos 2026 · istek:
          mezun/paydaş/mentör profilinde "linkedin github").

          Öğretmen ve koordinatörde YOK: onların GençTek'teki yeri okulları ve
          görevleriyle belli, LinkedIn adresi sistemin işine yaramıyor. Dış
          kullanıcıda tam tersi — okul, sınıf, branş yok; bu adresler kişinin
          ne yaptığını anlatan tek yer.

          Sütunlar iki ayrı tabloda ama alan adları aynı olduğu için tek döngü
          yetiyor.
        */}
        {(ogrenci || disKullanici) && (
          <div className="mt-6 border-t border-cizgi pt-5">
            <h3 className="flex items-center gap-2 text-sm font-medium text-metin">
              <Link2 size={15} aria-hidden />
              Bağlantılarım
            </h3>
            <dl className="mt-3 grid gap-5 sm:grid-cols-2">
              {BAGLANTI_TANIMLARI.map((tanim) => {
                const adres =
                  (ogrenci
                    ? kayit.ogrenciProfil?.[tanim.alan]
                    : disProfil?.[tanim.alan]) ?? null;
                return (
                  <div key={tanim.alan}>
                    <dt className="text-sm font-medium text-metin-yumusak">
                      {tanim.etiket}
                    </dt>
                    <dd className="mt-0.5 text-metin">
                      {adres ? (
                        <a
                          /*
                           * Adres öğrenci beyanıdır ve dış siteye çıkar:
                           * `noopener noreferrer` olmadan açılan sayfa
                           * `window.opener` üzerinden bu sekmeyi
                           * yönlendirebilir. Protokol kontrolü kayıt sırasında
                           * yapılıyor (lib/ogrenci/iletisim-kurallar.ts).
                           */
                          href={adres}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-vurgu-metin underline underline-offset-2"
                        >
                          {adres}
                        </a>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        )}

        <PaneldenDuzenleBaglantisi
          capa="iletisim-bilgilerim"
          etiket="İletişim bilgilerimi Panelim'den düzenle →"
        />
      </Kart>

      {/*
        KATKI SAĞLAYABİLECEKLERİM (7 Ağustos 2026 · istek: profil bilgilerinde
        "açıklamalar/katkı sağlayabileceği şeyler", panelde "Çalışma Grupları").

        İKİSİ TEK KARTTA: serbest metin ile seçilen gruplar aynı sorunun iki
        cevabı — "bu kişi ekosisteme ne getirebilir". Ayrı kartlara bölmek,
        birini dolduran kullanıcının öbürünü görmemesine yol açardı.

        MENTÖRLÜKTEN AYRI ve kartlar da ayrı duruyor: mentörlük onaya tabi bir
        görevdir ve aşağıda kendi kartında, durumuyla birlikte görünüyor.
        Buradaki seçim yalnızca bir beyandır, kimseye erişim açmaz.
      */}
      {disKullanici && (
        <Kart>
          <KartBasligi
            baslik="Katkı sağlayabileceklerim"
            aciklama="Bu bilgileri siz girersiniz; sizinle iletişime geçmek isteyenler burayı okur."
            Ikon={Handshake}
          />
          <p className="whitespace-pre-line text-metin">
            {disProfil?.aciklama || "Henüz bir açıklama yazmadınız."}
          </p>

          <div className="mt-6 border-t border-cizgi pt-5">
            <h3 className="flex items-center gap-2 text-sm font-medium text-metin">
              <Layers size={15} aria-hidden />
              Çalışma gruplarım
            </h3>
            {kayit.destekGruplari.length === 0 ? (
              <p className="mt-2 text-metin-yumusak">
                Henüz çalışma grubu seçmediniz.
              </p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {kayit.destekGruplari.map(({ calismaGrubu }) => (
                  <li
                    key={calismaGrubu.id}
                    className="rounded-full bg-vurgu-zemin px-3 py-1 text-sm text-vurgu-metin"
                  >
                    {calismaGrubu.ad}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <PaneldenDuzenleBaglantisi
            capa="katki-alanlarim"
            etiket="Katkı alanlarımı Panel'den düzenle →"
          />
        </Kart>
      )}

      {/*
        Danışmanlık işareti öğretmenin EYLEMİydi ve Panelim'e taşındı; burada
        yalnızca durumu görünüyor.
      */}
      {/*
        "GENÇTEK DANIŞMAN ÖĞRETMENLİĞİ" BU EKRANDAN KALKTI (7 Ağustos 2026 ·
        istek: "GençTek Danışman Öğretmenliği Öğrencilerim sekmesine geçsin").
        Hem durumu hem işareti artık Öğrencilerim ekranında; ikisi de aynı işin
        parçası ve o ekranın başında duruyor.

        Yerine ÖĞRENCİLERİ bölümü geldi.
      */}
      {!ogrenci && danismanlikGosterilir && (
        <Kart>
          <KartBasligi
            baslik="Öğrencilerim"
            aciklama={
              danismanMi(kullanici)
                ? `Danışmanlığını yürüttüğünüz ${ogrencileri.length} öğrenci.`
                : "Danışman öğretmen görevi almadınız; öğrenciler sizi seçim listesinde görmüyor."
            }
            Ikon={Users}
          />
          {ogrencileri.length === 0 ? (
            <p className="text-metin-yumusak">
              Danışmanlığınızda öğrenci yok.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {ogrencileri.map((atama) => (
                <li key={atama.ogrenci.id}>
                  <Link
                    href={`/panel/ogrenciler/${atama.ogrenci.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-rol-ogrenci-zemin px-3 py-1 text-sm text-rol-ogrenci-metin transition hover:opacity-80"
                  >
                    {atama.ogrenci.ad} {atama.ogrenci.soyad}
                    {atama.ogrenci.sinif && (
                      <span className="text-xs opacity-80">
                        {atama.ogrenci.sinif}
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
        İLİMDEKİ KİŞİLER — koordinatörün "Öğrencilerim" karşılığı.
        Sayım, liste değil: üç yüz kişilik bir listeyi profile basmanın faydası
        yok, o iş kendi ekranında.
      */}
      {koordinatorOzeti && (
        <Kart>
          <KartBasligi
            baslik="İlimdeki kişiler"
            aciklama={`Sorumlu olduğunuz ilin GençTek kayıtları.`}
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

      {ogrenci && (
        <>
          {/*
            SADECE AD (7 Ağustos 2026 · istek: "profilde sadece danışmanın adı
            gözüksün"). Branş ve iletişim bilgisi kaldırıldı; ikisi de
            Panelim'deki "Danışman öğretmenim" bölümünde duruyor ve seçim de
            oradan yapılıyor.
          */}
          <Kart>
            <KartBasligi baslik="Danışman öğretmenim" Ikon={UserCheck} />
            <p className="text-metin">
              {atama
                ? `${atama.danisman.ad} ${atama.danisman.soyad}`
                : "Henüz danışman atanmadı."}
            </p>
            <PaneldenDuzenleBaglantisi
              capa="danismanim"
              etiket="Danışmanımı Panelim'den seç →"
            />
          </Kart>

          {/*
            KatkiKarti EYLEMSİZ basılıyor: kazanım eylemleri verilmediğinde
            silme ve belge formları hiç basılmaz (bkz. KazanimEylemleri).
            Düzenleme Panelim'deki "Kayıtlarım" bölümünde.
          */}
          {katki && (
            <KatkiKarti
              kendiMi
              gorevler={katki.gorevler}
              gruplar={katki.gruplar}
              faaliyetler={katki.faaliyetler}
              egitimOgretimYili={kullanici.egitimOgretimYili}
              katilim={kazanim}
              kazanimlar={kayit.kazanimlar}
            />
          )}

          {/*
            SEFERLERİM (D7). Nişanlar HESAPLANIR, tabloda tutulmaz; düzenleme
            yüzeyi yok, bu yüzden salt okunur ayrımı burada anlamsız.
          */}
          {kazanim && (
            <KatkiNisanlariKarti
              rozetler={kazanim.rozetler}
              seferler={kazanim.seferler}
              bosMesaji="Henüz seferin yok. İlk etkinliğine katıldığında burası dolmaya başlayacak."
            />
          )}

          <Kart>
            <KartBasligi
              baslik="Özgeçmiş (CV)"
              aciklama="Danışmanınız, il koordinatörünüz ve proje yöneticisi profilinizden açabilir."
              Ikon={FileText}
            />
            {cvVar && cv ? (
              <div className="flex flex-wrap items-center gap-3">
                {/*
                  YENİ SEKMEDE AÇILIR (7 Ağustos 2026 · istek). Rota pdf'i
                  `inline` gönderiyor, yani dosya inmek yerine tarayıcının
                  görüntüleyicisinde açılıyor; yeni sekme olmasaydı kullanıcı
                  profilinden düşerdi.

                  `<Link>` DEĞİL `<a>`: hedef bir rota (route.ts), sayfa değil.
                  Ham `<a href>` basePath'i kendisi eklemediği için
                  `uygulamaYolu()` şart — alt dizin kurulumunda adres
                  uygulamanın dışına çıkardı.
                */}
                <a
                  href={uygulamaYolu(cvYolu)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={SINIF_IKINCIL_BUTON}
                >
                  <FileText size={15} aria-hidden />
                  {cv.cvDosyaAdi}
                </a>
                <span className="text-sm text-metin-yumusak">
                  {cv.cvYuklenmeTarihi
                    ? `${tarihSaatYaz(cv.cvYuklenmeTarihi)} tarihinde yüklendi`
                    : ""}
                </span>
              </div>
            ) : (
              <p className="text-metin-yumusak">Henüz CV yüklenmedi.</p>
            )}
            <PaneldenDuzenleBaglantisi
              capa="cvm"
              etiket="CV'mi Panelim'den yükle →"
            />
          </Kart>
        </>
      )}

      {/*
        ÖĞRETMENİN GENÇTEK TARAFI (7 Ağustos 2026 · istek listesi).
        Katıldığı etkinlikler ÜRETİLEN BELGEDEN türetilir, öğrencideki kuralın
        aynısı (lib/kazanim/katilim-kurallar.ts).
      */}
      {ogretmenKazanim && (
        <KatilimKarti kazanim={ogretmenKazanim} />
      )}

      {/*
        Kazanım kayıtları ÖĞRETMENDE DE VAR: dışarıda katıldığı etkinlik,
        geliştirdiği materyal, verdiği eğitim ve derece aldığı yarışma da
        ekosisteme katkıdır.
      */}
      <Kart>
        <KartBasligi
          baslik={ogrenci ? "Bilişim Yolculuğum" : "Ürünlerim ve katkılarım"}
          aciklama={
            ogrenci
              ? "GençTek dışında yaptıkların: ürünlerin, deneyimlerin ve toplulukların."
              : "Geliştirdiğiniz uygulama, materyal ve diğer üretimleriniz."
          }
          Ikon={Sparkles}
        />
        {/*
          ÜÇ GRUP ÖĞRENCİDE, TEK GRUP ÖĞRETMENDE (10 Ağustos 2026 · istek:
          "bu bölümde sadece ürünlerim olsun, öğretmen için Deneyimlerim ve
          Topluluklarım / Ekiplerim kalksın").

          Hangi grubun kime gösterildiği TEK YERDE duruyor
          (lib/kazanim/kurallar.ts · BILISIM_YOLCULUGU_GRUPLARI · `sahipler`),
          burada ayrıca dallanma yok: aynı liste Panelim'deki giriş formunu da
          besliyor ve iki yerde ayrı ayrı süzülseydi biri diğerinden ayrışıp
          "girebildiğim ama profilimde göremediğim kayıt" durumunu doğururdu.
        */}
        <KazanimGruplari kazanimlar={kayit.kazanimlar} sahip={kazanimSahibi} />
        <PaneldenDuzenleBaglantisi
          capa="kayitlarim"
          etiket="Kayıtlarımı Panelim'den düzenle →"
        />
      </Kart>

      {/*
        MENTÖRLÜĞÜM — 10 Ağustos 2026 · istek: "panelde mentörlük ekleme var,
        yaptığı mentörlükler profilde gözüksün, Ürünlerim ve katkılarım
        kısmının altına gelsin".

        Kart profilin SONUNDAYDI (Rotam'dan da sonra) ve pratikte kimse oraya
        kadar inmiyordu. Yeri artık burası: mentörlük de kişinin ekosisteme
        verdiği bir katkı, ürünlerin hemen ardından okunması doğru.

        Yalnızca kaydı olanda basılır. Hiç başvurmamış birine boş bir kart
        göstermek, doldurulacak bir şey varmış izlenimi verirdi; başvurunun
        yeri zaten Panel.
      */}
      {mentorluk && (
        <Kart>
          <KartBasligi
            baslik={ogrenci ? "Mentörlüğüm" : "Mentörlük Alanlarım"}
            aciklama="Bildiğiniz konularda öğrencilere yol gösterirsiniz. Panodaki 'Mentöre sor' ilanlarında görünürsünüz."
            Ikon={GraduationCap}
          />
          <p className="flex flex-wrap items-center gap-2 text-metin">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${MENTORLUK_DURUM_SINIFLARI[mentorluk.durum]}`}
            >
              {MENTORLUK_DURUM_ETIKETLERI[mentorluk.durum]}
            </span>
            {mentorKapsamiYaz(mentorluk.grupAdlari, mentorluk.konular) || "—"}
          </p>
          {mentorluk.durum === "REDDEDILDI" && mentorluk.retGerekcesi && (
            <p className="mt-2 text-sm text-hata-metin">
              Gerekçe: {mentorluk.retGerekcesi}
            </p>
          )}
          <PaneldenDuzenleBaglantisi
            capa="mentorlugum"
            etiket="Mentörlüğümü Panel'den düzenle →"
          />
        </Kart>
      )}

      {/*
        KATKI NİŞANLARIM — öğretmende de basılır (7 Ağustos 2026).
        Nişanlar HESAPLANIR, tabloda tutulmaz; öğretmenin ölçütleri
        düzenlediği faaliyetler, danışmanlığı ve paydaşlı etkinlikleridir.
        "Seferler" (seviyeler) öğretmende hesaplanmaz ve bölüm hiç basılmaz.
      */}
      {ogretmenKazanim && (
        <KatkiNisanlariKarti
          rozetler={ogretmenKazanim.rozetler}
          seferler={ogretmenKazanim.seferler}
          bosMesaji={
            // Dış kullanıcının danışmanlığı yok; ona olmayan bir yoldan
            // bahsetmek, nişanı ulaşılmaz gösterirdi.
            disKullanici
              ? "Henüz nişan kazanmadınız. Bildirdiğiniz etkinlikler onaylandıkça ve katkılarınız arttıkça burası dolacak."
              : "Henüz nişan kazanmadınız. Etkinlik düzenledikçe ve danışmanlık yürüttükçe burası dolacak."
          }
        />
      )}

      {/*
        ÖZGEÇMİŞ — öğretmende de var (7 Ağustos 2026). Yükleme Panel'de,
        burada yalnızca dosya görünüyor.
      */}
      {!ogrenci && (
        <Kart>
          <KartBasligi
            baslik="Özgeçmiş (CV)"
            aciklama="İl koordinatörünüz ve proje yöneticisi kaydınızdan açabilir."
            Ikon={FileText}
          />
          {cvVar && cv ? (
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={uygulamaYolu(cvYolu)}
                target="_blank"
                rel="noopener noreferrer"
                className={SINIF_IKINCIL_BUTON}
              >
                <FileText size={15} aria-hidden />
                {cv.cvDosyaAdi}
              </a>
              <span className="text-sm text-metin-yumusak">
                {cv.cvYuklenmeTarihi
                  ? `${tarihSaatYaz(cv.cvYuklenmeTarihi)} tarihinde yüklendi`
                  : ""}
              </span>
            </div>
          ) : (
            <p className="text-metin-yumusak">Henüz CV yüklenmedi.</p>
          )}
          <PaneldenDuzenleBaglantisi
            capa="cvm"
            etiket="Özgeçmişimi Panel'den yükle →"
          />
        </Kart>
      )}

      {/*
        "Rotam" — istekteki profil sırasının SONUNCUSU. Yolculuk kartlarından
        sonra gelmesi anlamlı: yukarısı yapılanlar, burası yapılacaklar.

        YALNIZCA ÖĞRENCİDE (11 Ağustos 2026 · istek: "rotam sadece öğrencide
        olacak"). Kapı Panel'dekiyle AYNI koşulu soruyor: bölüm yalnızca
        birinden kaldırılsaydı öğretmen, Panel'de göremediği bir bölümü
        profilinde görür ve düzenleme bağlantısı onu var olmayan bir karta
        (`/panel#rotam`) götürürdü.
      */}
      {ogrenci && <RotamKarti hedefler={hedefler} duzenlemeYolu="/panel#rotam" />}

      {/*
        EN ALTTA duruyor ve `id="kvkk"` taşıyor: şerit ile eski /panel/kvkk
        adresi buraya çapa ile geliyor. Yukarı taşınırsa o iki bağlantı da
        yanlış yere düşer.

        BU EKRANDAKİ TEK FORM. Onay bir profil bilgisi değil hukuki bir
        beyandır ve metnin okunduğu yerde verilmelidir; panele taşımak onayı
        onaylanan metinden koparırdı.
      */}
      <div id="kvkk" className="scroll-mt-6">
        <OnayBelgeleriBolumu
          durumlar={belgeDurumlari}
          onaylaEylemi={belgeOnaylaEylemi}
        />
      </div>
    </div>
  );
}
