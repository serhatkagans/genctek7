import { LogOut } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cikisEylemi } from "@/app/giris/eylemler";
import {
  PanelGezinme,
  type GezinmeBaglantisi,
} from "@/components/PanelGezinme";
import { RolEtiketi, RolsuzEtiketi } from "@/components/RolEtiketi";
import { TemaSecici } from "@/components/TemaSecici";
import { oturumKullanicisi } from "@/lib/auth/oturum";
import { onayliMentorMu } from "@/lib/mentor/veri";
import { uygulamaYolu } from "@/lib/ortam";
import { aktifTema } from "@/lib/tema";
import {
  disKullaniciMi,
  rolEnvanteriGorebilirMi,
  yonetimPanosuGorebilirMi,
} from "@/lib/yetki/izinler";

export const dynamic = "force-dynamic";

export default async function PanelDuzeni({
  children,
}: {
  children: React.ReactNode;
}) {
  const [kullanici, tema] = await Promise.all([
    oturumKullanicisi(),
    aktifTema(),
  ]);
  if (!kullanici) {
    redirect("/giris");
  }

  /*
   * İLK GİRİŞ KAPISI VE ONAY ŞERİDİ KALKTI (21 Ağustos 2026 · istek: "KVKK'lar
   * panelden kalkacak, açılışta çerez politikası ile ilgili popup gelecek bir
   * kerelik, sonra bir daha okuma yok, kvkk olmasın").
   *
   * Sisteme giren kişi artık hiçbir belge kapısından geçmiyor; yerine
   * uygulamanın açılışında BİR KEZ çıkan çerez bildirimi var
   * (bkz. components/CerezBildirimi.tsx).
   *
   * VERİ VE METİNLER SİLİNMEDİ (lib/kvkk/*, kullanici_onayi tablosu, yönetim
   * ekranındaki metin düzenleme): daha önce verilmiş onaylar hukuken kayıttır
   * ve ekran kararıyla silinmezler. Kalkan yalnızca kullanıcıdan onay ISTEYEN
   * yüzeyler.
   */

  /*
   * MENÜ KÜÇÜLDÜ (7 Ağustos 2026 · istek: "menü sayısı azalacak").
   *
   * Öğrencide altı sekme kaldı: Profil · Panel · Etkinlikler · Bağlantılarım ·
   * Pano · Market. Kalkanlar:
   *
   *   · "Katkılarım" — içeriğinin tamamı artık profilde (Görevlerim, katılım
   *     geçmişi, Katkı Nişanlarım). Sayfa SİLİNMEDİ; öğretmen tarafında hâlâ
   *     kendi kartlarını basıyor ve profilden bağlantı veriliyor.
   *   · "Algoritmam" — Panel'in içinde bölüm oldu ("Özdeğerlendirme
   *     Envanterleri"). Sayfa duruyor, envanter çözme oradan yürüyor.
   *
   * Yeniden adlandırılanlar: "Panelim" → "Panel", "Ürünlerim" → "Market"
   * (istek listesindeki başlıklar). "Profil" 20 Ağustos'ta Panel'in içine
   * girdi ve sekmesi kalktı.
   *
   * YÖNETİM SEKMELERİ KALDI: altı sekme herkeste ortak, koordinatör ve merkez
   * bunlara ek olarak kendi ekranlarını görmeye devam ediyor. Onları da
   * kaldırmak, koordinatörün ilindeki öğrenciye ulaşacağı hiçbir giriş
   * bırakmazdı.
   */
  /*
   * GRUP ADLARI (18 Ağustos 2026 · kenar çubuğuna geçiş). Menü dizisi değişmedi
   * — sıra ve kimin neyi gördüğü aynı; her satıra yalnızca hangi başlığın
   * altında duracağı ve ikonu eklendi. Dört başlık var: Genel (kişinin
   * kendisi), Çalışma (işin yapıldığı ekranlar), İletişim (başkasıyla temas),
   * Ekosistem (vitrin).
   */
  /*
   * "PROFİL" SEKMESİ KALKTI (20 Ağustos 2026 · istek: "panel ile profil
   * birleşecek tek panel kalacak, düzenleme ve görüntüleme panelden olacak").
   *
   * İki sekme aynı bilgiyi iki yüzeye bölüyordu: Profil gösteriyor, Panel
   * düzenliyordu. Menüde ikisinin yan yana durması, kullanıcıya her kayıt için
   * "bu hangisinde?" sorusunu sordurdu. Profil ekranının TAMAMI Panel'in
   * içinde ve `/panel/profil` adresi oraya yönleniyor
   * (bkz. app/panel/profil/page.tsx).
   */
  const baglantilar: GezinmeBaglantisi[] = [
    /*
     * SEKMENİN ADI "PROFİL" (25 Ağustos 2026 · istek: "menüdeki panel ismini
     * komple profil yapalım, panel sayfası değil profil sayfası olsun").
     *
     * 20 Ağustos'ta Profil sekmesi Panel'in içine girmişti; ekran o gün
     * fiilen profil oldu (kimlik, CV, çalışma grupları, kartlar) ama adı
     * "Panel" kaldı ve kişi profilini menüde arayamıyordu. Değişen yalnızca
     * ETİKET: adres `/panel` — kayıtlı bağlantılar, yer imleri ve
     * yönlendirmeler kırılmasın.
     */
    { yol: "/panel", etiket: "Profil", grup: "Genel", ikon: "LayoutGrid" },
  ];

  /*
   * MEZUN / PAYDAŞ / MENTÖR MENÜSÜ: Profil · Panel · Etkinlikler · Pano · Market
   * (7 Ağustos 2026 · istek: "mezun paydaş mentör sayfasında şu sekmeler
   * olacak" — Profil, Panel, Etkinlikler).
   *
   * PANO 11 AĞUSTOS'TA EKLENDİ (istek: "panelde panoya git var ama üst menüde
   * de pano olması gerekiyor"). Panel sayfası panoyu bu kullanıcının iki
   * hakkından biri olarak anlatıp oraya bir düğme koyuyordu; menüde
   * karşılığının olmaması, panodan çıkan kişiye geri dönecek bir yol
   * bırakmıyordu.
   *
   * MARKET 13 AĞUSTOS'TA EKLENDİ (istek: "mezun, paydaş ve mentör girişlerine
   * market gelecek, onlarda market görünmüyor"). Vitrin bu rollere BAŞTAN BERİ
   * açıktı (bkz. aşağıdaki Market notu: "mezunun ekosistemde göreceği ilk şey
   * buydu"); eksik olan yalnızca menüdeki satırdı, yani sayfa vardı ama kapısı
   * yoktu. Ürün ekleme de bu rollerde çalışıyor — kayıt formu Panel'de.
   *
   * BAĞLANTILARIM ve AKIŞ EKLENDİ (13 Ağustos 2026 · inceleme bulgusu).
   * İkisi de Market'le aynı durumdaydı: sayfa açıktı, kapısı yoktu.
   *
   *   · Bağlantılarım — bu roller yazışmalara erişebiliyor. Sekme
   *     basılmadığı için mezun, açılmış bir yazışmanın mesajını okuyacak
   *     hiçbir yol bulamıyordu: bildirimin "git" düğmesi de yok
   *     (BildirimHedefTipi yalnızca FAALIYET ve EKIP).
   *
   * YETKİ DEĞİŞMEDİ, yalnızca kapı açıldı: iki sayfa da baştan beri bu
   * rollere açıktı ve kapsam filtreleri yerinde duruyor.
   */
  /*
   * MENTÖRLÜĞÜM SEKMESİ — YALNIZCA ONAYLI MENTÖRDE (13 Ağustos 2026 · istek:
   * "mentörlerin kendi sayfası olsun … talepleri inceleyip cevap yazacak").
   *
   * Koşul veritabanına gidiyor, role değil: mentörlük bir rol değil onaya bağlı
   * bir kayıttır (bkz. lib/mentor/veri.ts · onayliMentorMu). Sorgu menüde
   * duruyor çünkü sekmenin varlığı da bir yetki bildirimi — sayfa 404 dönerken
   * menüde adının görünmesi, kullanıcıyı kapalı bir kapıya yollardı.
   *
   * Mentör olabilen herkeste basılıyor: dış kullanıcı da (mezun, paydaş,
   * mentör) onaylı mentör olabiliyor, bu yüzden kontrol erken dönüşten ÖNCE.
   */
  const mentorSekmesi: GezinmeBaglantisi[] = (await onayliMentorMu(kullanici.id))
    ? [
        {
          yol: "/panel/mentorlugum",
          etiket: "Mentörlüğüm",
          grup: "Çalışma",
          ikon: "Handshake",
        },
      ]
    : [];

  if (disKullaniciMi(kullanici)) {
    baglantilar.push({
      yol: "/panel/etkinlikler",
      etiket: "Etkinlikler",
      grup: "Çalışma",
      ikon: "CalendarDays",
    });
    // Sıra iç kullanıcı menüsüyle aynı: aynı sekmenin iki rolde farklı yerde
    // durması, ekranı birine anlatırken "sende kaçıncı sırada?" sorusunu
    // doğururdu.
    baglantilar.push({
      yol: "/panel/yazismalar",
      etiket: "Bağlantılarım",
      grup: "İletişim",
      ikon: "MessagesSquare",
    });
    baglantilar.push({
      yol: "/panel/talepler",
      etiket: "Pano",
      grup: "İletişim",
      ikon: "ClipboardList",
    });
    baglantilar.push(...mentorSekmesi);
    baglantilar.push({
      yol: "/panel/urunler",
      etiket: "Market",
      grup: "Ekosistem",
      ikon: "Store",
    });
    return (
      <PanelCercevesi
        kullanici={kullanici}
        tema={tema}
        baglantilar={baglantilar}
      >
        {children}
      </PanelCercevesi>
    );
  }

  /*
   * YÖNETİM PANELİ, PANEL'İN HEMEN ARDINDA (11 Ağustos 2026 · istek: "öğrenciler
   * ve öğretmenler sekmesi kalkacak yönetim paneli sekmesine gelecek, paydaşlar
   * ve okullar da yönetim paneline gelecek, görev rolleri de").
   *
   * Beş sekme tek sekmeye indi: Öğrenciler · Öğretmenler · Paydaşlar · Görev
   * Rolleri · Mentörlük artık panonun İÇİNDE kart olarak duruyor
   * (bkz. app/panel/yonetim/page.tsx). Ekranların hiçbiri silinmedi ve hiçbir
   * yetki daralmadı — değişen tek şey, oraya hangi kapıdan girildiği.
   *
   * Yeri eskiden Öğrenciler'in durduğu yer: koordinatörün ve merkezin günlük
   * işi bu sekmede başlıyor.
   */
  if (yonetimPanosuGorebilirMi(kullanici)) {
    baglantilar.push({
      yol: "/panel/yonetim",
      etiket: "Yönetim Paneli",
      grup: "Çalışma",
      ikon: "ShieldCheck",
    });
  }

  /*
   * DANIŞMAN ÖĞRETMENDE "ÖĞRENCİLERİM" SEKMESİ KALKTI (13 Ağustos 2026 · istek:
   * "danışman öğretmenin öğrencilerim menüsü kalkacak, panelde zaten
   * danışmanlığımdaki öğrenciler var, danışmanlığımdaki öğrenciler öğrencilerim
   * olacak").
   *
   * Sekme 7 Ağustos'ta, listeye gidecek başka yol olmadığı için konmuştu; o
   * gerekçe artık geçerli değil — Panel'de aynı ekrana giden sayılı kart duruyor
   * ve adı isteğe uyarak "Öğrencilerim" oldu (bkz. app/panel/page.tsx). Aynı
   * listeye koordinatör ve merkez de kendi kartlarından giriyor, yani üç rolde
   * de kapı tek biçimde panelde.
   *
   * SAYFA SİLİNMEDİ ve YETKİ DARALMADI: `/panel/ogrenciler` adresle çalışmaya,
   * danışman kendi öğrencilerini görmeye ve Okul Temsilcisi atamaya devam
   * ediyor (bkz. ogrenciEnvanteriGorebilirMi). Değişen tek şey menüdeki satır.
   */

  /*
   * "Çalışma Gruplarım" ve "Danışmanım" MENÜDE YOK (B3/C1 · 5 Ağustos 2026).
   * İkisi de Panelim sayfasının içinde bölüm olarak duruyor ve seçim oradan
   * yapılıyor. Sayfaları SİLİNMEDİ: `/panel/danisman-secim` aynı zamanda giriş
   * kapısıdır (danışmansız öğrenci oraya düşer), `/panel/calisma-gruplari` ise
   * bildirim e-postalarındaki ve yer imlerindeki adreslerde duruyor.
   */

  /*
   * "KATKILARIM" ve "ALGORITMAM" SEKMELERİ KALKTI (7 Ağustos 2026).
   *
   * Katkılarım'ın içeriği profile taşındı: Görevlerim, katılım geçmişi ve
   * Katkı Nişanlarım orada. Ekran silinmedi — öğretmen tarafında kendi
   * kartlarını basmaya devam ediyor ve profilden bağlantı veriliyor.
   *
   * Algoritmam, Panel'in içinde "Özdeğerlendirme Envanterleri" bölümü oldu.
   * Sayfa duruyor ve envanterler oradan çözülüyor; yalnızca menüdeki satır
   * kalktı. Envanter sonuçları hâlâ KİŞİYE ÖZELDİR: hiçbir yetkili ekranında
   * görünmez (bkz. app/panel/algoritmam/eylemler.ts).
   */

  // Faaliyetler herkese açıktır; kimin ne göreceğini kapsam filtresi belirler.
  // Görev almamış öğretmen de okulunun ve ulusal faaliyetleri görür; mezun ve
  // paydaş temsilcisi ulusal ve kendi ilindeki etkinlikleri takvim olarak görür
  // ama başvuramaz (bkz. basvuruYapabilirMi).
  baglantilar.push({
    yol: "/panel/etkinlikler",
    etiket: "Etkinlikler",
    grup: "Çalışma",
    ikon: "CalendarDays",
  });

  /*
   * "Bağlantılarım" (eski adı Yazışmalar) herkese açık; kimin ne göreceğini
   * kapsam filtresi belirler. Öğrenci kendi yazışmalarını, danışman
   * öğrencilerininkini, koordinatör ilindekileri görür.
   *
   * İSTEKTEKİ ALT BAŞLIKLAR: "Mesajlar · Sohbet · Bağlantılarım". Mesajlar ve
   * bağlantı onayları bu ekranın içinde; **Sohbet (grup) HENÜZ YOK** — G
   * maddesi S19/S20 cevaplarını bekliyor.
   */
  baglantilar.push({
    yol: "/panel/yazismalar",
    etiket: "Bağlantılarım",
    grup: "İletişim",
    ikon: "MessagesSquare",
  });

  /*
   * AKIŞ TAMAMEN KALKTI (21 Ağustos 2026 · istek: "akışı da kaldır"). 12
   * Ağustos'ta ayrı sekme, 14 Ağustos'ta Bağlantılarım'ın içinde bir bölümdü;
   * şimdi bölüm de eylemleri de yok. `/panel/akis` adresi 404 vermesin diye
   * duruyor ve Bağlantılarım'a yönlendiriyor.
   */

  /*
   * "İLETİŞİM ONAYLARI" ARTIK AYRI EKRAN DEĞİL (12 Ağustos 2026 · istek:
   * "yazışmalar ve bağlantılar isminde iki bölüm var, onları birleştirip
   * linkedin tarzı bir bölüm yapmak istiyorum · menüdeki bağlantılarım
   * alanında olsun").
   *
   * 7 Ağustos'ta sekmesi kalkmış, girişi bu sayfanın başına bir kart olarak
   * konmuştu; o kart da kalktı. Bekleyen istekler doğrudan Bağlantılarım'ın
   * içinde, bağlantı listesinin üstünde basılıyor. `/panel/baglantilar` adresi
   * duruyor ve buraya yönlendiriyor.
   */

  /*
   * Pano (eski adıyla Talep Panosu) SİSTEMDEKİ HERKESE açık — proje yöneticisi
   * dahil (13 Ağustos 2026 · istek: "proje yöneticisinin pano sayfası
   * görünmüyor, diğer kullanıcılarda var").
   *
   * Sekme daha önce merkez personelinde basılmıyordu çünkü görme ile ilan açma
   * tek izinden geçiyordu ve merkez ilan açmıyor. Sonuç, sistemin en canlı
   * kullanıcı alanının onu yönetenden gizlenmesiydi. İkisi ayrıldı: merkez
   * panoyu okumaya başladı.
   *
   * 14 AĞUSTOS 2026'DA İLAN AÇMA DA AÇILDI (istekler: "proje yöneticisi panodan
   * destek talebi açabilsin", "mentör talebi açabilsin proje yöneticisi") —
   * bkz. panodaIlanAcabilirMi. Merkeze kapalı kalan tek şey BAĞLANTI İSTEĞİ
   * (panodaEslesmeArayabilirMi): ilan açık bir metindir, bağlantı isteği kişiye
   * yönelen ve onaydan geçen bir temastır.
   *
   * PANO EKOSİSTEM DIŞINA AÇILMAZ (S21 · 6 Ağustos 2026): ilanları yalnızca
   * sisteme girmiş kullanıcılar görür. Sponsor ilanı da bu kuralın içindedir —
   * dışarıya açık bir ilan sayfası istenirse bu ayrı bir karardır ve KVKK
   * tarafı yeniden değerlendirilmelidir (ilanı açan çoğunlukla 18 yaş altı).
   */
  baglantilar.push({
    yol: "/panel/talepler",
    etiket: "Pano",
    grup: "İletişim",
    ikon: "ClipboardList",
  });

  /*
   * MENTÖRLÜĞÜM SEKMESİ YÖNETİM PANELİ GÖRENLERDE YOK (15 Ağustos 2026 ·
   * istek: "koordinatör sayfasındaki mentörlüğüm menüsünü yönetim paneline
   * kart olarak koy").
   *
   * Koordinatör ve merkez ekrana Yönetim Paneli'ndeki karttan giriyor —
   * "Ekiplerim" kartıyla aynı düzen: mentörlük onların günlük işi değil.
   *
   * SEKME HERKESTEN KALKMADI ve bu ayrım önemli: mentörlük bir rol değil,
   * onaya bağlı bir kayıt — öğrenci, danışman ve mezun da onaylı mentör
   * olabiliyor. Onlar Yönetim Paneli'ni göremiyor; sekme onlardan da
   * kaldırılsaydı kendi mentörlük kutularına ulaşacak hiçbir yolları kalmazdı.
   *
   * Sekme kalanlarda panonun hemen ardında: mentörün işi panodaki ilanları
   * cevaplamak.
   */
  if (!yonetimPanosuGorebilirMi(kullanici)) {
    baglantilar.push(...mentorSekmesi);
  }

  /*
   * ÜRÜNLERİM (GençTek Market) HERKESE AÇIK (I · 6 Ağustos 2026).
   *
   * İstekteki sekme adı "Ürünlerim" ama içerik bir vitrindir: öğrenci
   * ürünleri, öğretmen ürünleri ve kişinin kendi ürünleri aynı ekranda
   * süzgeçle ayrılıyor. Bu yüzden Algoritmam gibi tek role bağlanmadı —
   * öğretmenin de ürünü olabiliyor ve istekte "Öğretmen Ürünleri" ayrı bir
   * süzgeç olarak sayılmış.
   *
   * DIŞ KULLANICILAR da görüyor: mezunun ekosistemde göreceği ilk şey buydu
   * ve market, A1'in gerekçesindeki "mezun bağını sürdürsün" beklentisine
   * karşılık gelen tek ekran. Vitrin ekosistem içine kapalı; dışarıya açık
   * bir ürün sayfası ayrı bir karardır (pano ile aynı ilke · S21).
   */
  baglantilar.push({
    yol: "/panel/urunler",
    etiket: "Market",
    grup: "Ekosistem",
    ikon: "Store",
  });

  /*
   * PAYDAŞLAR, GÖREV ROLLERİ ve MENTÖRLÜK SEKMELERİ KALKTI (11 Ağustos 2026);
   * üçü de yönetim panosunda kart oldu. Yetkileri değişmedi: paydaş kaydını
   * yine koordinatör ve merkez açıyor, il/ilçe temsilciliğini yine onlar
   * veriyor, mentör başvurusunu yine onlar onaylıyor.
   *
   * Danışman öğretmen bu üç ekranı zaten menüsünde görmüyordu (B3/J2/J4 ·
   * 5 Ağustos 2026) ve durumu değişmedi: Okul Temsilcisi'ni Öğrencilerim
   * ekranından veriyor, paydaşı etkinlik detayından bağlıyor.
   *
   * RAPORLAR ve BELGE OLUŞTUR da menüde değil (J3 · 6 Ağustos 2026): ikisi de
   * etkinlikten doğan işler ve girişleri etkinlik detayında. "Hangi raporlar
   * eksik" toplu görünümü Etkinlikler ekranındaki "Raporu bekleyenler"
   * süzgecinde.
   *
   * HİÇBİR SAYFA SİLİNMEDİ: adresler ve e-postalardaki bağlantılar çalışmaya
   * devam ediyor.
   */

  /*
   * İL DIŞI BAŞVURULAR SEKMESİ KALKTI (11 Ağustos 2026 · istek: "koordinatörün
   * etkinlikler sayfası ile il dışı başvuru sayfalarını birleştirelim, il dışı
   * başvurular kalksın, hepsi etkinliklerde olsun").
   *
   * Sayfa da silindi, menüden çıkarılmakla kalmadı. Karar zaten etkinliğe ait
   * bir karardı — "öğrencim bu etkinliğe gitsin mi" — ve ayrı bir sekmede
   * durması koordinatörü iki ekran arasında gezdiriyordu: etkinliği burada,
   * başvurusunu orada görüyordu. Liste artık Etkinlikler ekranının bir bölümü
   * (`#il-disi`) ve karar ayrıca her etkinliğin başvuru satırından da
   * verilebiliyor.
   */

  /*
   * DIŞ GİRİŞ BAŞVURULARI SEKMESİ KALKTI (11 Ağustos 2026 · istek: "dış giriş
   * başvuruları sayfası paydaşların içine gelecek"). Ekranın girişi artık
   * Paydaşlar sayfasının başında; ikisi aynı işin iki ucu — biri kurumu, öbürü
   * o kurumu temsil eden kişiyi sisteme alıyor.
   *
   * ROL/ATAMA ENVANTERİ SEKMESİ DE KALKTI (aynı gün · istek: "rol atama
   * envanteri koordinatör kartına gelecek"): yönetim panosunda "Koordinatörler"
   * kartı olarak duruyor. Ekranın içeriği zaten koordinatör envanteridir.
   *
   * İkisinin de sayfası ve yetkisi yerinde; değişen yalnızca kapı.
   */
  /*
   * ERİŞİM KAYITLARI · MESAJ GÖNDER · SİSTEM AYARLARI SEKMELERİ KALKTI
   * (14 Ağustos 2026 · istek: "yönetim panelinde erişim kayıtları ve mesaj
   * gönder ve sistem ayarları kart olarak var menüden kaldır").
   *
   * Üçü 11 Ağustos'ta Yönetim Paneli'ne kart olarak inmişti ama sekmeleri de
   * bırakılmıştı ("ikisi de günlük iş"); sonuç, merkezin menüsünde aynı üç
   * ekranın iki ayrı kapısıydı. Kapı artık tek: Yönetim Paneli
   * (bkz. app/panel/yonetim/page.tsx).
   *
   * SAYFALAR VE YETKİLER DEĞİŞMEDİ — her biri kendi `rolEnvanteriGorebilirMi`
   * / `sistemAyarlariniYonetebilirMi` kontrolünü kendi içinde yapmaya devam
   * ediyor; kaldırılan yalnızca menü satırı.
   */

  /*
   * KVKK/belge sekmesi MENÜDE YOK (5 Ağustos 2026). Belgeler artık profilin en
   * altında (`/panel#kvkk`): metin üye olurken okutuluyor, sonrasında lazım
   * olduğunda panelden açılıyor. Menüden kaldırmak erişimi kapatmak
   * DEĞİLDİR — onayladığı belgeye erişemeyen kullanıcı KVKK açısından
   * savunulamaz; bu yüzden bölüm kaldırılmadı, taşındı.
   */

  return (
    <PanelCercevesi
      kullanici={kullanici}
      tema={tema}
      baglantilar={baglantilar}
    >
      {children}
    </PanelCercevesi>
  );
}

/**
 * Panelin dış çerçevesi: üst bar, rol etiketleri, onay şeridi ve gezinme.
 *
 * AYRI BİLEŞEN çünkü düzen iki yerden dönüyor: dış kullanıcı menüsü erken
 * dönüşle kapanıyor (üç sekme) ve kalan roller aşağıdan. İki kopya JSX,
 * birinde yapılan bir değişikliğin öbüründe unutulması demek olurdu.
 */
function PanelCercevesi({
  kullanici,
  tema,
  baglantilar,
  children,
}: {
  kullanici: NonNullable<Awaited<ReturnType<typeof oturumKullanicisi>>>;
  tema: Awaited<ReturnType<typeof aktifTema>>;
  baglantilar: GezinmeBaglantisi[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {/*
        İNCE KOYU ŞERİT. Kurum kimliği ve tema seçimi buraya indi: ikisi de
        günlük işin parçası değil, sayfanın her yerinde aynı duran künye
        bilgisi. Beyaz menü barında yer kapladıklarında kullanıcının adını ve
        çıkış düğmesini sıkıştırıyorlardı.
      */}
      {/*
        `yazdirma-disi` (18 Ağustos 2026): şerit, menü barı ve kenar çubuğu
        yazdırmada basılmaz — gezinme kâğıtta tıklanamaz ve sayfanın üçte
        birini yer. Kural globals.css'teki @media print bloğunda; buradaki üç
        işaret o kuralın tutunduğu yerler. Yeni bir panel ekranı eklerken
        ayrıca bir şey yapmak gerekmiyor, çatı zaten işaretli.
      */}
      <div className="yazdirma-disi bg-serit text-serit-metin">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-6 py-2">
          <p className="text-[11px] font-semibold tracking-widest uppercase">
            T.C. Millî Eğitim Bakanlığı · YEĞİTEK
          </p>
          <TemaSecici aktif={tema} />
        </div>
      </div>

      {/*
        BEYAZ MENÜ BARI. `sticky`: kenar çubuğuna geçince sayfalar uzadı ve
        aşağı inen kullanıcının kimliğini/çıkışını görecek yeri kalmıyordu.
      */}
      <header className="yazdirma-disi sticky top-0 z-30 border-b border-ust-bar-cizgi bg-ust-bar">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-6 py-3">
          <Link href="/panel" className="flex items-center gap-3">
            {/*
              Logo artık beyaz kutu İÇİNDE DEĞİL: bar beyaza döndüğü için
              kırmızı logo doğrudan zemine oturuyor (açılış ekranında durum
              tersi — orada zemin kırmızı ve kutu şart).

              next/image kullanılmıyor: dosya public dizininde, boyutu sabit.
              Yol uygulamaYolu()'ndan geçiyor çünkü uygulama alt dizine kurulu.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={uygulamaYolu("/genc.png")}
              alt=""
              aria-hidden
              className="size-10 object-contain"
            />
            <span>
              <span className="block text-[10px] font-bold tracking-widest text-vurgu-metin uppercase">
                MEB · YEĞİTEK
              </span>
              <span className="block font-baslik text-lg leading-tight font-extrabold text-ust-bar-metin">
                GençTek
              </span>
              <span className="block text-xs text-ust-bar-metin-yumusak">
                Genç Bilişim Ekosistemi
              </span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            {/*
              ROL ADIN ALTINDA (21 Ağustos 2026 · istek: "sol menü üstündeki
              YETKİM / Öğrenci kalksın, öğrenci adının altına öğrenci yazısı
              gelsin — sağ üstteki öğrenci adı").

              Kenar çubuğunun tepesindeki "Yetkim" kutusu kalktı: menünün
              başında duran bir kutu, menüyü aşağı itiyordu ve rol bilgisi
              zaten kimliğin bir parçası — adın altında duracağı yer burası.

              Birden fazla rol yan yana basılıyor: il koordinatörü aynı anda
              danışman olabiliyor ve rollerden yalnızca birini yazmak, kişinin
              menüde neden fazladan başlık gördüğünü açıklamazdı.
            */}
            <div className="text-right">
              <p className="text-sm font-semibold text-ust-bar-metin">
                {kullanici.ad} {kullanici.soyad}
              </p>
              <div className="mt-1 flex flex-wrap justify-end gap-1">
                {kullanici.roller.length === 0 ? (
                  <RolsuzEtiketi />
                ) : (
                  kullanici.roller.map((rol) => (
                    <RolEtiketi
                      key={rol.rolKodu}
                      rolKodu={rol.rolKodu}
                      ekBilgi={rol.ilKodu}
                    />
                  ))
                )}
              </div>
            </div>
            <form action={cikisEylemi}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-kutu border border-cizgi-guclu px-3 py-2 text-sm font-medium text-ust-bar-metin-yumusak transition hover:border-vurgu hover:text-vurgu-metin"
              >
                <LogOut size={15} aria-hidden />
                Çıkış
              </button>
            </form>
          </div>
        </div>
      </header>

      {/*
        GÖVDE: kenar çubuğu + içerik.

        Kenar çubuğu dar ekranda GİZLENMİYOR, üste geçiyor: PanelGezinme 1024
        pikselin altında kendini yatay kaydırılan bir rozet şeridine çeviriyor
        (bkz. components/PanelGezinme.tsx). Bu yüzden `aside` iki durumda da
        basılır — `hidden lg:block` verilseydi telefonda menü hiç görünmezdi.
      */}
      <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-6 py-8 lg:flex-row">
        <aside className="yazdirma-disi lg:w-56 lg:shrink-0">
          <div className="lg:sticky lg:top-24">
            {/*
              "YETKİM" KUTUSU KALKTI (21 Ağustos 2026 · istek). Roller üst
              barda, adın hemen altında basılıyor.
            */}

            <PanelGezinme baglantilar={baglantilar} />
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
