import {
  BadgeCheck,
  Bug,
  Compass,
  FileText,
  GraduationCap,
  Handshake,
  LifeBuoy,
  Map as Harita,
  MapPin,
  Megaphone,
  Search,
  Settings,
  School,
  ShieldCheck,
  TriangleAlert,
  UserCog,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { DisaAktarmaBagi } from "@/components/DisaAktarmaBagi";
import {
  Kart,
  KartBasligi,
  Rozet,
  SayfaBasligi,
  SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import {
  BirimKarti,
  KisayolKarti,
  ToplamSeridi,
} from "@/components/YonetimKartlari";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { ekipYonetebilirMi } from "@/lib/ekip/kurallar";
import { onayliMentorMu } from "@/lib/mentor/veri";
import {
  birimUyarilari,
  illeriSuz,
  ilSiralamasiCoz,
  ozetToplami,
} from "@/lib/rapor/yonetim-kurallari";
import {
  ilceOzetleriniGetir,
  ilOzetleriniGetir,
} from "@/lib/rapor/yonetim-ozeti";
import {
  gencTekGoreviYonetebilirMi,
  hataKayitlariniGorebilirMi,
  ilKoordinatoruMu,
  koordinatorIlKodu,
  mentorlukBasvurabilirMi,
  mentorlukOnaylayabilirMi,
  ogrenciEnvanteriGorebilirMi,
  ogretmenEnvanteriGorebilirMi,
  panodaIlanAcabilirMi,
  panoIlaniOnaylayabilirMi,
  paydasGorebilirMi,
  projeYoneticisiMi,
  rolEnvanteriGorebilirMi,
  yonetimPanosuGorebilirMi,
} from "@/lib/yetki/izinler";

export const dynamic = "force-dynamic";

const SINIF_ETIKET = "text-sm font-medium text-metin-yumusak";
const SINIF_SECIM =
  "mt-1 w-full rounded-md border border-cizgi bg-kart px-3 py-2 text-sm text-metin outline-none focus:border-vurgu";

/**
 * YÖNETİM PANELİ (11 Ağustos 2026 · istek: "il koordinatörü ve proje yöneticisi
 * için yönetim paneli olacak, burada olan her şey kart düzeninde olacak").
 *
 * İki işi birden yapar:
 *
 *   1. KIRILIM. Merkez tüm illeri, il koordinatörü kendi ilinin ilçelerini
 *      görür; her kartta o birimdeki okul, öğretmen, danışman öğretmen, öğrenci
 *      ve (ilde) etkinlik sayısı yazar, altında da o birimin EKSİKLERİ durur.
 *      Karta tıklandıkça bir basamak inilir: il → ilçe → okul.
 *   2. ALT MENÜ. Üst menüden kalkan yönetim sekmeleri (Öğrenciler, Öğretmenler,
 *      Paydaşlar, Görev Rolleri, Mentörlük) burada kart olarak duruyor.
 *
 * MERKEZ İLE KOORDİNATÖR AYNI EKRANI PAYLAŞIR, yalnızca başladıkları basamak
 * farklı. Ayrı iki sayfa yazılsaydı ikisinde de aynı kart düzeni ve aynı
 * sayımlar iki kez durur, birinde yapılan düzeltme öbüründe unutulurdu.
 */
export default async function YonetimSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ ara?: string; sirala?: string }>;
}) {
  const { ara, sirala } = await searchParams;
  const kullanici = await oturumKullanicisiZorunlu();

  if (!yonetimPanosuGorebilirMi(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="Yönetim Paneli"
          aciklama="Bu ekrana erişim yetkiniz yok."
        />
      </Kart>
    );
  }

  const merkezMi = projeYoneticisiMi(kullanici);
  /*
   * Mentörlük bir ROL DEĞİL, onaya bağlı bir kayıt; bu yüzden koşul
   * veritabanından soruluyor (bkz. lib/mentor/veri.ts · onayliMentorMu).
   */
  const onayliMentor = await onayliMentorMu(kullanici.id);
  const ilKodu = koordinatorIlKodu(kullanici);

  /*
   * Merkezde il, koordinatörde ilçe kırılımı. Koordinatör için il basamağı
   * atlanıyor: tek ili var ve o basamak ona tek kartlık bir ara sayfa olurdu.
   */
  const tumIller = merkezMi ? await ilOzetleriniGetir() : [];
  const ilceler = !merkezMi && ilKodu ? await ilceOzetleriniGetir(ilKodu) : [];
  const il =
    !merkezMi && ilKodu
      ? await prisma.il.findUnique({
          where: { ilKodu },
          select: { ad: true },
        })
      : null;

  const siralama = ilSiralamasiCoz(sirala);
  const aranan = ara?.trim() ?? "";
  const iller = illeriSuz(tumIller, { ara: aranan, sirala: siralama });

  /*
   * TOPLAM SÜZÜLMÜŞ LİSTEDEN HESAPLANIR, tamamından değil: şerit her zaman
   * "aşağıda duran kartların toplamı"dır. Ülke toplamı sabit kalsaydı, tek il
   * arayan kişi kartında 12 okul görüp şeritte 1.204 okul okurdu.
   */
  const toplam = ozetToplami(merkezMi ? iller : ilceler);
  const suzgecVar = aranan !== "" || siralama !== "ad";

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Yönetim Paneli"
        aciklama={
          merkezMi
            ? "Ülke genelindeki kırılım ve yönetim ekranları. Bir ile tıklayarak ilçelerine, ilçeye tıklayarak okullarına inebilirsiniz."
            : `${il?.ad ?? "İliniz"} ilindeki ilçeler ve yönetim ekranları. Bir ilçeye tıklayarak okullarını görebilirsiniz.`
        }
        rozet={
          /*
            KAPSAM ROZETİ (18 Ağustos 2026 · tasarım yenilemesi). Aynı ekran iki
            bambaşka kapsamda açılıyor — merkez 81 ili, koordinatör tek ilini
            görüyor — ve bu bilgi yalnızca açıklama cümlesinin içinde geçiyordu.
            Ekran görüntüsü paylaşıldığında ya da iki rol yan yana konuşurken
            "sen neye bakıyorsun" sorusunun cevabı bir cümle okumayı
            gerektiriyordu; rozet onu başlığın hemen üstüne çıkarıyor.
          */
          <Rozet cesit="vurgu" Ikon={MapPin}>
            {merkezMi ? "Ülke geneli" : `${il?.ad ?? "İliniz"} ili`}
          </Rozet>
        }
      />

      {/*
        ALT MENÜ KARTLARI. Sırası üst menüdeki eski sırayı korur: kullanıcı
        sekmeleri soldan sağa nasıl okuyorduysa kartları da öyle okuyor.

        Her kart KENDİ YETKİSİNİ sorar; pano kapısını geçmiş olmak kartların
        hepsini hak etmek anlamına gelmiyor (bkz. yonetimPanosuGorebilirMi).
      */}
      <Kart>
        <KartBasligi
          baslik="Yönetim ekranları"
          aciklama="Üst menüden kaldırılan yönetim sekmeleri burada."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {ogrenciEnvanteriGorebilirMi(kullanici) && (
            <KisayolKarti
              baslik="Öğrenciler"
              aciklama={
                merkezMi
                  ? "Ülke genelindeki öğrenci envanteri, süzgeçler ve CSV çıktısı"
                  : "İlinizdeki öğrenci envanteri, süzgeçler ve CSV çıktısı"
              }
              Ikon={GraduationCap}
              yol="/panel/ogrenciler"
            />
          )}
          {ogretmenEnvanteriGorebilirMi(kullanici) && (
            <KisayolKarti
              baslik="Öğretmenler"
              aciklama="Danışman öğretmenler ve görev almamış öğretmenler"
              Ikon={Users}
              yol="/panel/ogretmenler"
            />
          )}
          {paydasGorebilirMi(kullanici) && (
            <KisayolKarti
              baslik="Paydaşlar"
              aciklama="İş birliği yapılan kurumlar ve iletişim kişileri"
              Ikon={Handshake}
              yol="/panel/paydaslar"
            />
          )}
          {/*
            OKUL EKSİK DURUMLARI (15 Ağustos 2026 · Aşama 3).

            Kart bu panonun sayılarının DEVAMI: burada "kaç danışmansız okul
            var" yazıyor, orada "hangileri" ve "ne yapılmalı". Sayının yanına
            konması bilinçli — sayıyı gören kişinin bir sonraki sorusu bu.

            Menüye ayrı sekme AÇILMADI: bu panonun dosya başındaki notu diğer
            yönetim ekranlarının burada kart olarak durduğunu söylüyor.
          */}
          {/*
            EKİP YÖNETİMİ (15 Ağustos 2026 · Aşama 5). `panel/ekipler` "benim
            ekiplerim"; bu kart tüm ekiplerin envanterine gidiyor. İkisi ayrı
            tutuldu çünkü koordinatör kendi ekibini yüzlerce kaydın içinde
            aramamalı (gerekçe ekranın başında).
          */}
          {ekipYonetebilirMi(kullanici) && (
            <KisayolKarti
              baslik="Ekip Yönetimi"
              aciklama="Tüm ekipler: tür, danışman ve üye sayısı — danışmansız ekipler dahil"
              Ikon={UsersRound}
              yol="/panel/ekip-yonetimi"
            />
          )}
          {/*
            OKULLAR (15 Ağustos 2026 · Aşama 4). Kırılımın son basamağının düz
            ve aranabilir ikizi: aynı sayıları aynı sorgudan alıyor ama okul
            adı, ilçe ya da KURUM KODU ile aranabiliyor. Kırılım "burada ne
            var" diye gezdiriyor, bu ekran "şu okulu bul" diyene cevap veriyor.
          */}
          <KisayolKarti
            baslik="Okullar"
            aciklama={
              merkezMi
                ? "Ülke genelinde okul arama — ad, ilçe ya da kurum kodu"
                : "İlinizdeki okullar ve kişi sayıları"
            }
            Ikon={School}
            yol="/panel/okullar"
          />
          <KisayolKarti
            baslik="Okul Eksik Durumları"
            aciklama={
              merkezMi
                ? "Ülke genelinde danışman, öğrenci ya da temsilci eksiği olan okullar"
                : "İlinizde danışman, öğrenci ya da temsilci eksiği olan okullar"
            }
            Ikon={TriangleAlert}
            yol="/panel/okul-eksikleri"
            ton="uyari"
          />
          {(merkezMi || ilKoordinatoruMu(kullanici)) && (
            <KisayolKarti
              baslik="Görev Rolleri"
              aciklama="İl ve ilçe temsilcisi görevlerinin verilmesi"
              Ikon={BadgeCheck}
              yol="/panel/gorev-rolleri"
            />
          )}
          {/*
            KOORDİNATÖRLER = eski "Rol/Atama Envanteri" (11 Ağustos 2026 ·
            istek: "yönetim paneline bir de koordinatörler sayfası gelecek, rol
            atama envanteri koordinatör kartına gelecek").

            Ekran zaten hangi ilde kimin koordinatör olduğunu, hangi ilin boş
            kaldığını gösteriyordu; adı yaptığı işi söylemiyordu. Sekmesi kalktı,
            adresi ve yetkisi aynı kaldı — yalnızca merkeze açık.
          */}
          {rolEnvanteriGorebilirMi(kullanici) && (
            <KisayolKarti
              baslik="Koordinatörler"
              aciklama="İl koordinatörü atamaları, boş iller ve rol geçmişi"
              Ikon={UserCog}
              yol="/panel/rol-envanteri"
            />
          )}
          {/*
            GENÇTEK GÖREVLERİ (21 Ağustos 2026 · istek: "yönetim panelinde yeni
            kart gençtek görevlerini görebilsin"). Mentörlük kartının yanında:
            ikisi de merkezin karara bağladığı başvuru kuyruğu.
          */}
          {gencTekGoreviYonetebilirMi(kullanici) && (
            <KisayolKarti
              baslik="GençTek Görevleri"
              aciklama="Görev ilanları, gelen başvurular ve kararları"
              Ikon={BadgeCheck}
              yol="/panel/genctek-gorevleri"
              ton="uyari"
            />
          )}
          {mentorlukOnaylayabilirMi(kullanici) && (
            <KisayolKarti
              baslik="Mentörler"
              aciklama="Mentör başvuruları ve karara bağlanan mentörler"
              Ikon={Compass}
              yol="/panel/mentorluk"
            />
          )}
          {/*
            PANO İLANLARI (14 Ağustos 2026 · istek: "panodaki öğrenci ilanları
            şimdilik proje yöneticilerine düşsün oradan onay versin").

            Kartın ikizi panonun kendi ekranında da var: merkez ilanları zaten
            orada okuyor ve karar oradan bir tık uzakta olmalı. Buradaki kopya,
            mentörlük kuyruğuyla aynı yerde durması içindir — merkezin onay
            işleri tek panoda toplanıyor.
          */}
          {panoIlaniOnaylayabilirMi(kullanici) && (
            <KisayolKarti
              baslik="Pano ilanları"
              aciklama="Onay bekleyen öğrenci ilanları, ilan düzenleme ve silme"
              Ikon={Megaphone}
              yol="/panel/talepler/onaylar"
              ton="uyari"
            />
          )}
          {/*
            PANODA İLAN AÇMA VE MENTÖRLÜK BAŞVURUSU (14 Ağustos 2026 · istek:
            "yönetici içinde destek talebi ve mentör talebi aç olsun, kart
            olarak gelsin, mentör olarak başvurda görünsün").

            Kartların ikizi panoda duruyor; buradaki kopyalar, merkezin günlük
            işini tek ekrandan yürütmesi içindir — onay kuyruğunun yanında
            "kendim de ilan açayım" kapısı olmayınca panoya gidip geri dönmek
            gerekiyordu.

            YETKİ KARTIN KENDİSİNDE SORULUYOR, yönetim panosunu görebilmekte
            değil: ilan açma 14 Ağustos'ta merkeze açıldı
            (`panodaIlanAcabilirMi`) ve mentörlük başvurusu öğrenci dışında
            herkese açık (`mentorlukBasvurabilirMi`). İkisi de panoya
            ileride girecek başka bir rol için sessizce açılmasın.
          */}
          {panodaIlanAcabilirMi(kullanici) && (
            <>
              <KisayolKarti
                baslik="Destek / duyuru talebi aç"
                aciklama="Teknik destek, duyuru, ekip arkadaşı arama ya da genel ilan"
                Ikon={LifeBuoy}
                yol="/panel/talepler/yeni"
                ton="olumlu"
              />
              <KisayolKarti
                baslik="Mentör talebi aç"
                aciklama="Yol gösterecek bir mentöre sorun; havuzdaki mentörler görür"
                Ikon={GraduationCap}
                yol="/panel/talepler/mentor-talebi"
                ton="olumlu"
              />
            </>
          )}
          {mentorlukBasvurabilirMi(kullanici) && (
            <KisayolKarti
              baslik="Mentör olarak başvur"
              aciklama="Bildiğiniz konularda öğrencilere yol gösterin; başvurunuz onaydan geçer"
              Ikon={Handshake}
              yol="/panel/talepler/mentor-basvuru"
              ton="olumlu"
            />
          )}
          {/*
            MENTÖRLÜĞÜM (15 Ağustos 2026 · istek: "koordinatör sayfasında
            mentörlüğüm isminde bir menü var, onu yönetim paneline kart olarak
            koy").

            Sekme koordinatör ve merkezde MENÜDEN KALKTI, kart olarak buraya
            geldi — "Ekiplerim" kartıyla aynı gerekçe: mentörlük koordinatörün
            günlük işi değil, ihtiyaç oldukça açtığı bir kapı.

            SEKME HERKESTEN KALKMADI. Onaylı mentör olmak bir rol değil, onaya
            bağlı bir kayıt: öğrenci, danışman ve mezun da mentör olabiliyor
            (bkz. layout.tsx · mentorSekmesi). Onlar Yönetim Paneli'ni
            göremediği için sekmeleri yerinde duruyor — kaldırılsaydı kendi
            mentörlük kutularına ulaşacak hiçbir yolları kalmazdı.

            KOŞUL YİNE VERİTABANINDAN (`onayliMentorMu`), rolden değil: kart
            yalnızca onaylı mentörde basılıyor, yoksa 404 dönen bir kapıya
            davet edilmiş olurdu.
          */}
          {onayliMentor && (
            <KisayolKarti
              baslik="Mentörlüğüm"
              aciklama="Size gelen mentörlük talepleri ve verdiğiniz cevaplar"
              Ikon={Compass}
              yol="/panel/mentorlugum"
              ton="olumlu"
            />
          )}
          {/*
            EKİPLERİM (13 Ağustos 2026 · istek: "il koordinatörü ekipler
            kurabilsin … bunu da yönetim paneline kart olarak ekleyelim, ismi
            ekiplerim olsun").

            Kart, ekibin kurulduğu ve yönetildiği tek kapıdır: menüde sekmesi
            yok, çünkü ekip günlük bir iş değil — koordinatörün ihtiyaç
            duyduğunda kurduğu bir topluluk. Üyeler ekiplerine kendi
            panellerindeki karttan giriyor (bkz. app/panel/page.tsx).

            Yetki `ekipYonetebilirMi`: il koordinatörü ve merkez. Yönetim
            panosunu zaten bu ikisi açıyor ama kart yine de koşullu — panoya
            ileride başka bir rol girerse ekip kurma kapısı sessizce açılmasın.
          */}
          {/*
            YEĞİTEK OKUL SORUMLULARI (13 Ağustos 2026 · istek: "proje
            yöneticisinin yönetim panelinde de YEĞİTEK Okul Sorumlusu isminde
            bir kart olsun ve oradan onların listesini görebilsin").

            Yalnızca merkezde: liste ülke geneli bir görünüm ve rol/atama
            envanteriyle aynı kategoride. Koordinatör kartı görmüyor çünkü
            ekranın kendisi de ona kapalı (bkz. okul-sorumlulari/page.tsx).
          */}
          {rolEnvanteriGorebilirMi(kullanici) && (
            <KisayolKarti
              baslik="YEĞİTEK Okul Sorumlusu"
              aciklama="Kendini okul sorumlusu olarak işaretlemiş danışman öğretmenlerin listesi"
              Ikon={ShieldCheck}
              yol="/panel/okul-sorumlulari"
            />
          )}
          {ekipYonetebilirMi(kullanici) && (
            <KisayolKarti
              baslik="Ekiplerim"
              aciklama="İlinizde kurduğunuz ekipler, üyeleri ve ekip sohbetleri"
              Ikon={UsersRound}
              yol="/panel/ekipler"
              ton="olumlu"
            />
          )}
          {/*
            ETKİNLİK RAPORLARI ekranının HİÇ KAPISI YOKTU: menüde sekmesi yok,
            panoda kartı yoktu; tek girişi Panelim'deki "Raporsuz biten etkinlik"
            ölçüm kartıydı. Yani sayı sıfırken — raporların hepsi yazılmışken —
            ekrana gidecek bir yol kalmıyordu ve yazılmış raporlara bakmak
            isteyen kişi adresi ezbere bilmek zorundaydı.

            Kart pano kapısını geçen herkese açık: ekranın kendi yetkisi zaten
            koordinatör, merkez ve danışman öğretmen; ilk ikisi burada.
          */}
          <KisayolKarti
            baslik="Etkinlik Raporları"
            /*
              CSV çıktısı açıklamaya YAZILDI (14 Ağustos 2026): program ve
              çalışma grubu istatistiği o ekranın içinde bir form ve merkezin
              onu araması için kartta bir iz olmalı — "raporlar" adı tek başına
              istatistik çıktısını akla getirmiyor.
            */
            aciklama="Biten etkinliklerin raporları, raporu eksik olanlar ve program / çalışma grubu istatistiği (CSV)"
            Ikon={FileText}
            yol="/panel/raporlar"
            ton="notr"
          />
          {/*
            MERKEZİN ÜÇ EKRANI (11 Ağustos 2026). Panonun kuruluş gerekçesi
            "yönetim ekranlarının girişi burada olsun"du ama merkeze özel bu üç
            sekme bir süre üst menüde de kaldı.

            SEKMELERİ 14 AĞUSTOS 2026'DA KALKTI (istek: "yönetim panelinde
            erişim kayıtları ve mesaj gönder ve sistem ayarları kart olarak var
            menüden kaldır"). Aynı üç ekranın iki kapısı vardı; kapı artık
            burası. Sayfalar ve yetkileri değişmedi.
          */}
          {rolEnvanteriGorebilirMi(kullanici) && (
            <>
              <KisayolKarti
                baslik="Erişim Kayıtları"
                aciklama="Kimin hangi kaydı görüntülediği — KVKK denetimi"
                Ikon={ShieldCheck}
                yol="/panel/erisim-loglari"
                ton="notr"
              />
              <KisayolKarti
                baslik="Mesaj Gönder"
                aciklama="Seçilen kitleye toplu bildirim ve duyuru"
                Ikon={Megaphone}
                yol="/panel/duyurular"
                ton="notr"
              />
              <KisayolKarti
                baslik="Sistem Ayarları"
                aciklama="Çalışma grupları, etkinlik programları ve sistem ayarları"
                Ikon={Settings}
                yol="/panel/ayarlar"
                ton="notr"
              />
            </>
          )}
          {/*
            HATA KAYITLARI (18 Ağustos 2026 · inceleme bulgusu).

            Kullanıcı beklenmeyen bir hatada ekranda yalnızca bir numara
            görüyor ("Hata kimliği: 598556021") ve o numaranın karşılığı
            günlüğe yazılıyordu — ama okunmasının tek yolu sunucuda
            `npm run hata:ara` çalıştırmaktı. Numarayı bildiren kişi ile
            sunucuya girebilen kişi aynı kişi değil; ekranın olmaması,
            tutulan kaydı proje yöneticisi için okunamaz kılıyordu.

            YETKİ AYRI SORULUYOR (`hataKayitlariniGorebilirMi`), yukarıdaki üç
            kartın koşuluna eklenmedi: iki ekranın merkeze kapalı olma
            gerekçesi farklı — biri kişisel veri, öbürü sunucunun iç yapısı
            (bkz. lib/yetki/izinler.ts).
          */}
          {hataKayitlariniGorebilirMi(kullanici) && (
            <KisayolKarti
              baslik="Hata Kayıtları"
              aciklama="Kullanıcının bildirdiği hata kimliğinin karşılığı: hangi adres, hangi hata, ne zaman"
              Ikon={Bug}
              yol="/panel/hata-kayitlari"
              ton="uyari"
            />
          )}
        </div>
      </Kart>

      <Kart>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <KartBasligi
            baslik={merkezMi ? "İller" : "İlçeler"}
            aciklama={
              merkezMi
                ? "Her kartta ildeki okul, öğretmen, danışman öğretmen, öğrenci ve etkinlik sayısı"
                : "Her kartta ilçedeki okul, öğretmen, danışman öğretmen ve öğrenci sayısı"
            }
            Ikon={MapPin}
          />
          {/*
            DOSYA, EKRANDA GÖRÜNEN LİSTENİN AYNISI: arama ve sıralama adresten
            geldiği için indirme bağlantısına da aynı parametreler ekleniyor.
            Ölçütler taşınmasaydı "koordinatörsüz iller" listesini süzen kişi,
            indirdiği dosyada 81 ilin tamamını bulurdu.
          */}
          <DisaAktarmaBagi
            yol={`/panel/yonetim/disa-aktar${
              suzgecVar
                ? `?${new URLSearchParams({
                    ...(aranan ? { ara: aranan } : {}),
                    ...(siralama !== "ad" ? { sirala: siralama } : {}),
                  }).toString()}`
                : ""
            }`}
          />
        </div>

        {/*
          SÜZGEÇ YALNIZCA MERKEZDE: koordinatörün ilçe sayısı onlarla ölçülür ve
          zaten tek ekranda görünür; 81 il ise aranmadan bulunmuyordu. Form GET
          ile çalışıyor, yani sonuç adres çubuğunda duruyor ve paylaşılabiliyor.
        */}
        {merkezMi && (
          <form method="get" className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={SINIF_ETIKET}>İl ara</span>
                <input
                  type="search"
                  name="ara"
                  defaultValue={aranan}
                  placeholder="İl adı"
                  className={SINIF_SECIM}
                />
              </label>
              <label className="block">
                <span className={SINIF_ETIKET}>Sıralama</span>
                <select
                  name="sirala"
                  defaultValue={siralama}
                  className={SINIF_SECIM}
                >
                  <option value="ad">İl adına göre</option>
                  <option value="ogrenci">Öğrencisi çok olan üstte</option>
                  <option value="bosluk">Eksiği çok olan üstte</option>
                </select>
              </label>
            </div>
            <div className="flex items-end gap-3">
              <button type="submit" className={SINIF_IKINCIL_BUTON}>
                <Search size={16} aria-hidden />
                Uygula
              </button>
              {suzgecVar && (
                <Link
                  href="/panel/yonetim"
                  className="inline-flex items-center gap-1 pb-2 text-sm font-medium text-vurgu-metin"
                >
                  <X size={14} aria-hidden />
                  Temizle
                </Link>
              )}
            </div>
          </form>
        )}

        <div className="mb-5 rounded-kart border border-cizgi bg-zemin px-5 py-5">
          <ToplamSeridi
            /*
             * İl sayısı ozetToplami'den gelmez, KART SAYISININ KENDİSİDİR:
             * il kartında "kaç il" diye bir alan yok, listenin uzunluğu o sayı.
             * Koordinatör görünümünde ölçüm hiç basılmıyor — tek ili var.
             */
            il={merkezMi ? iller.length : undefined}
            ilce={toplam.ilce}
            okul={toplam.okul}
            ogretmen={toplam.ogretmen}
            danismanOgretmen={toplam.danismanOgretmen}
            ogrenci={toplam.ogrenci}
            faaliyet={merkezMi ? toplam.faaliyet : undefined}
            koordinatorsuzIl={toplam.koordinatorsuzIl}
            danismansizOkul={toplam.danismansizOkul}
            danismansizOgrenci={toplam.danismansizOgrenci}
            raporsuzFaaliyet={toplam.raporsuzFaaliyet}
          />
        </div>

        {merkezMi ? (
          iller.length === 0 ? (
            <p className="text-sm text-metin-yumusak">
              &ldquo;{aranan}&rdquo; aramasıyla eşleşen il yok.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {iller.map((il) => (
                <BirimKarti
                  key={il.ilKodu}
                  Ikon={MapPin}
                  ad={il.ad}
                  /*
                   * İlçe sayısı kartın alt satırında: tıklanınca ne kadar liste
                   * açılacağını önceden söylüyor. Koordinatör adı ise merkezin
                   * bu ekranda aradığı ilk bilgi — koordinatörsüz il,
                   * doldurulacak bir boşluktur (bkz. istatistik.ts).
                   */
                  altBilgi={`${il.ilceSayisi} ilçe · ${
                    il.koordinatorAdi ?? "Koordinatör atanmadı"
                  }`}
                  okulSayisi={il.okulSayisi}
                  ogretmenSayisi={il.ogretmenSayisi}
                  danismanOgretmenSayisi={il.danismanOgretmenSayisi}
                  ogrenciSayisi={il.ogrenciSayisi}
                  faaliyetSayisi={il.faaliyetSayisi}
                  uyarilar={birimUyarilari(il)}
                  yol={`/panel/yonetim/il/${il.ilKodu}`}
                />
              ))}
            </div>
          )
        ) : ilceler.length === 0 ? (
          <p className="text-sm text-metin-yumusak">
            İlinize bağlı ilçe kaydı bulunamadı.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ilceler.map((ilce) => (
              <BirimKarti
                key={ilce.ilceKodu}
                Ikon={Harita}
                ad={ilce.ad}
                okulSayisi={ilce.okulSayisi}
                ogretmenSayisi={ilce.ogretmenSayisi}
                danismanOgretmenSayisi={ilce.danismanOgretmenSayisi}
                ogrenciSayisi={ilce.ogrenciSayisi}
                /*
                 * Şeritteki eksiklerin hangi ilçeden geldiği ancak kartta
                 * görünür; toplam "nerede iş var" der, kart "kimde" der.
                 */
                uyarilar={birimUyarilari(ilce)}
                yol={`/panel/yonetim/ilce/${ilce.ilceKodu}`}
              />
            ))}
          </div>
        )}
      </Kart>

      {/*
        Kırılımın dışındaki tek çıkış: ilin tamamının listesi. Kartlar ilçe
        ilçe gidiyor, "ilimdeki bütün öğrenciler" ise tek tıkla açılmalı.
      */}
      {!merkezMi && ilKodu && (
        <p className="text-sm text-metin-yumusak">
          İlin tamamı:{" "}
          <Link
            href="/panel/ogrenciler"
            className="font-medium text-vurgu-metin underline underline-offset-2"
          >
            öğrenciler
          </Link>{" "}
          ·{" "}
          <Link
            href="/panel/ogretmenler"
            className="font-medium text-vurgu-metin underline underline-offset-2"
          >
            öğretmenler
          </Link>
        </p>
      )}
    </div>
  );
}
