import type { OnayBelgesi } from "@/generated/prisma/enums";
import { disKullaniciMi, ilKoordinatoruMu, ogrenciMi } from "../yetki/izinler";
import type { OturumKullanicisi } from "../yetki/tipler";

/**
 * KVKK kuralları — references/domain-rules.md Bölüm 10.
 *
 * Kullanıcıların büyük bölümü 18 yaş altı olduğu için aydınlatma yükümlülüğü
 * ve saklama süresi burada gevşetilemez. Bu dosya saf tutulur: veritabanına
 * gitmez, "şimdi"yi parametre olarak alır, böylece kararlar birim testle
 * sınanabilir.
 */

export const AYAR_KVKK_METNI = "KVKK_AYDINLATMA_METNI";
export const AYAR_ACIK_RIZA_METNI = "KVKK_ACIK_RIZA_METNI";
export const AYAR_TAAHHUTNAME_METNI = "KOORDINATOR_TAAHHUTNAME_METNI";
export const AYAR_GIZLILIK_SOZLESMESI_METNI = "GIZLILIK_SOZLESMESI_METNI";
export const AYAR_ERISIM_LOGU_SAKLAMA_AYI = "ERISIM_LOGU_SAKLAMA_AYI";
export const AYAR_BILDIRIM_SAKLAMA_AYI = "BILDIRIM_SAKLAMA_AYI";

/**
 * Varsayılan saklama süreleri (ay).
 *
 * Erişim logu, KVKK denetiminin dayanağı olduğu için bildirimden uzun tutulur:
 * "kim hangi öğrenci kaydını ne zaman gördü" sorusu geçmişe dönük sorulur.
 * Bildirim ise kullanıcıya ulaştıktan sonra kanıt değeri taşımaz.
 */
export const VARSAYILAN_ERISIM_LOGU_SAKLAMA_AYI = 24;
export const VARSAYILAN_BILDIRIM_SAKLAMA_AYI = 12;

/**
 * Bir belgenin (yeniden) onaylanması gerekiyor mu?
 *
 * Metin güncellendiğinde eski onay geçersizleşir: kişi artık başka bir metni
 * onaylamış olur. Karşılaştırma sistem ayarının güncelleme tarihine bakar,
 * ayrı bir sürüm alanı tutulmaz.
 *
 * Dört belgenin dördü de aynı kuralı kullanır. Daha önce aydınlatma ve taahhüt
 * için iki ayrı fonksiyon vardı; belge sayısı artınca aynı gövdenin dört kopyası
 * anlamına geleceği için tek fonksiyona indirildi. Bir belgenin tazelik kuralı
 * gerçekten ayrışırsa BELGE_TANIMLARI'na alan eklenir, fonksiyon çoğaltılmaz.
 */
export function onayiGerekiyorMu(girdi: {
  onayTarihi: Date | null;
  metinGuncellemeTarihi: Date | null;
}): boolean {
  if (girdi.onayTarihi === null) return true;
  if (girdi.metinGuncellemeTarihi === null) return false;
  return girdi.onayTarihi < girdi.metinGuncellemeTarihi;
}

/** Bu tarihten eski kayıtlar saklama süresini doldurmuştur. */
export function saklamaSonTarihi(simdi: Date, ay: number): Date {
  const sinir = new Date(simdi);
  sinir.setMonth(sinir.getMonth() - ay);
  return sinir;
}

// ---------------------------------------------------------------------------
// Belge metinleri
// ---------------------------------------------------------------------------

export const VARSAYILAN_AYDINLATMA_METNI = `GençTek Ekosistemi Kurumsal Bilgi Sistemi — Aydınlatma Metni

1. Veri sorumlusu
Bu sistem, Millî Eğitim Bakanlığı Yenilik ve Eğitim Teknolojileri Genel Müdürlüğü (YEĞİTEK) adına işletilmektedir. Kişisel verileriniz 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusu sıfatıyla YEĞİTEK tarafından işlenir.

2. İşlenen veriler
Kimlik ve öğrenim bilgileriniz (ad, soyad, cinsiyet, okul, kurum kodu, il, ilçe, sınıf, eğitim-öğretim yılı) e-Okul/EBA kayıtlarından alınır ve bu sistemde değiştirilemez. Bunlara ek olarak yalnızca sizin girdiğiniz iletişim bilgileri (e-posta, telefon, varsa GitHub/LinkedIn/kişisel site adresleriniz), seçtiğiniz çalışma grupları, danışman öğretmen tercihiniz, faaliyet başvurularınız ve başvuru gerekçeleriniz, yazdığınız yorumlar, profil fotoğrafınız, açtığınız ilanlar ve sistem içinde gönderdiğiniz mesajlar işlenir.

2.1. Sistem içi yazışmalar gizli DEĞİLDİR
Sistem üzerinden başka bir kullanıcıyla yaptığınız yazışmaların tamamı; danışman öğretmeniniz, ilinizin koordinatörü ve YEĞİTEK proje yöneticileri tarafından okunabilir. Bu, çoğunluğu 18 yaş altı olan kullanıcıların korunması amacıyla uygulanan bir güvenlik tedbiridir. Sistemde özel/şifreli bir mesajlaşma kanalı bulunmamaktadır; yazdığınız her mesajın okunabileceğini bilerek yazınız.

3. İşleme amacı ve hukuki sebep
Veriler; danışman öğretmen eşleştirmesi, çalışma grubu takibi, faaliyet başvurusu ve değerlendirmesi ile ekosistemin yönetimi amacıyla, Bakanlığın kanunla verilen görevlerini yerine getirmesi hukuki sebebine dayanılarak işlenir. Kanunun aradığı hâllerde ayrıca açık rızanız alınır; açık rızaya dayanan işlemler ayrı bir metinde sayılmıştır.

4. Verilere kimler erişir
Erişim, görev kapsamıyla sınırlıdır. Danışman öğretmeniniz yalnızca kendi okulundaki danışmanlığını üstlendiği öğrencileri, il koordinatörü yalnızca kendi ilindeki öğrencileri, proje yöneticisi ise yönetim görevi gereği tüm kayıtları görebilir. Hiçbir öğrenci başka bir öğrencinin listesini veya kişisel verisini göremez.

5. Kayıt ve denetim
Kişisel verilerin her görüntülenmesi ve değiştirilmesi; işlemi yapan kullanıcı, tarih ve IP adresiyle birlikte kayıt altına alınır. Bu kayıtlar yalnızca kötüye kullanım denetimi için tutulur.

6. Saklama süresi
Faaliyet ve başvuru kayıtları, ekosistemin geçmişe dönük raporlaması için öğrencilik döneminiz boyunca saklanır. Erişim kayıtları 24 ay, sistem bildirimleri 12 ay sonunda silinir.

7. Haklarınız
Kanun'un 11. maddesi uyarınca; verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini veya silinmesini isteme ve işlemeye itiraz etme haklarına sahipsiniz. e-Okul kaynaklı bilgilerdeki hatalar bu sistemden düzeltilemez; okul idarenize başvurmanız gerekir. Diğer talepleriniz için okul idareniz aracılığıyla Bakanlığa başvurabilirsiniz.

8. Yaş durumu
On sekiz yaşından küçükseniz bu metni velinizle birlikte okumanız beklenir.`;

/**
 * AÇIK RIZA METNİ KURUMUN KENDİ METNİYLE DEĞİŞTİ (31 Ağustos 2026 · istek:
 * "açık rıza metnini bu şekilde yapalım değişsin" — metnin tamamı istekle
 * birlikte geldi).
 *
 * Gelen metin YEĞİTEK'in kurumsal aydınlatma metnidir ve sonunda tek cümlelik
 * bir onay beyanı taşır. Sisteme özgü, elle yazılmış eski metnin yerini
 * aldı — bir kurumun onay ekranında kurumun kendi yayımladığı metin durur;
 * yerine yazılan bir özet, hukuken dayanağı olmayan ikinci bir metin olurdu.
 *
 * ESKİ METİNDE OLUP BURADA OLMAYANLAR — bilinçli değil, gelen metnin kapsamı
 * bu:
 *   · rızaya bağlanan işlemlerin tek tek sayılması (iletişim bilgisi, profil
 *     fotoğrafı, belgelerde ad kullanımı, ilan görünürlüğü),
 *   · "rızamı dilediğim zaman geri alabilirim" cümlesi. Geri alma hakkı
 *     kanunîdir ve metnin 6. maddesinde "silinmesini veya yok edilmesini
 *     isteme" hakkı olarak duruyor; eski metindeki gibi ayrı bir madde
 *     olarak yazılmıyor.
 * Bu iki başlık metne geri istenirse buraya eklenir; ekran, veritabanı ve onay
 * akışı değişmeden çalışır.
 *
 * METİN GÜNCELLENDİĞİNDE ESKİ ONAYLAR DÜŞER (bkz. onayiGerekiyorMu): buradaki
 * varsayılan değiştiğinde `sistem_ayari` kaydı yoksa tazelik ölçüsü de yoktur
 * — kayıt varsa yönetim ekranından güncellenmelidir, yoksa kullanıcılar eski
 * metne verdikleri onayla devam eder.
 *
 * İKİ YAZIM HATASI DÜZELTİLDİ ("Ayınlatma" → "Aydınlatma", "Milli Eğiti" →
 * "Millî Eğitim"); gerisi geldiği gibi.
 */
export const VARSAYILAN_ACIK_RIZA_METNI = `Kişisel Verilerin İşlenmesi Aydınlatma Metni

Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu'nun 10. maddesi ile Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ kapsamında veri sorumlusu sıfatıyla Millî Eğitim Bakanlığı Yenilik ve Eğitim Teknolojileri Genel Müdürlüğü tarafından hazırlanmıştır.

1. Veri Sorumlusu
KVKK uyarınca, kişisel verileriniz Millî Eğitim Bakanlığı Yenilik ve Eğitim Teknolojileri Genel Müdürlüğü tarafından veri sorumlusu sıfatıyla işlenmektedir.

2. Kişisel Verilerin İşlenme Amaçları
Kişisel verileriniz, aşağıdaki amaçlarla işlenmektedir:

Hizmet Sunumu: Web sitemiz, dijital platformlarımız ve online öğrenme ortamlarımız üzerinden sunulan hizmetlerin sağlanması.

Eğitim ve Öğretim: Dijital içerikler, eğitim materyalleri ve online derslerin sunulması ve yönetilmesi.

Kullanıcı Deneyimi: Kullanıcı deneyiminin iyileştirilmesi, kişiselleştirilmiş hizmet sunumu ve kullanıcı tercihlerinin hatırlanması.

Yasal Yükümlülükler: Yasal ve düzenleyici gerekliliklerin yerine getirilmesi.

İletişim: Kullanıcılarımızla iletişim kurulması ve bildirimlerin iletilmesi.

Güvenlik: Bilgi güvenliği süreçlerinin yürütülmesi ve kullanıcılarımızın verilerinin korunması.

Analiz ve Raporlama: Hizmetlerimizin performansını analiz etmek ve raporlamak.

3. Kişisel Verilerin Toplanma Yöntemleri ve Hukuki Sebepler
Kişisel verileriniz, web sitemiz, mobil uygulamalarımız, dijital platformlarımız ve diğer iletişim kanallarımız aracılığıyla elektronik ortamda toplanmaktadır. Kişisel verilerinizin toplanma ve işlenme hukuki sebepleri şunlardır:

Kanunlarda Açıkça Öngörülmesi: Kişisel verilerinizin işlenmesinin kanunlarda açıkça öngörülmesi.

Sözleşmenin İfası: Sözleşmenin kurulması veya ifasıyla doğrudan doğruya ilgili olması kaydıyla, sözleşmenin taraflarına ait kişisel verilerin işlenmesinin gerekli olması.

Hukuki Yükümlülüğün Yerine Getirilmesi: Veri sorumlusunun hukuki yükümlülüklerini yerine getirebilmesi için zorunlu olması.

Meşru Menfaat: Veri sorumlusunun meşru menfaatleri için veri işlenmesinin zorunlu olması, temel hak ve özgürlüklerinize zarar vermemek kaydıyla.

4. Kişisel Verilerin Aktarımı
İşlenen kişisel verileriniz, yukarıda belirtilen amaçlar doğrultusunda ve KVKK'nın 8. ve 9. maddelerine uygun olarak, yalnızca yetkili kamu kurum ve kuruluşları ile hukuken yetkili özel hukuk tüzel kişileri ile paylaşılabilecektir. Ayrıca, platformun teknik altyapısını sağlayan üçüncü taraf hizmet sağlayıcılarla da gerekli güvenlik önlemleri alınarak paylaşım yapılabilmektedir.

5. Kişisel Verilerin Saklanma Süresi
Kişisel verileriniz, yukarıda belirtilen amaçlarla gerekli olan süre boyunca saklanacak olup, yasal saklama sürelerinin bitiminde veya işlenme amacının ortadan kalkması hâlinde imha edilecektir.

6. KVKK Kapsamındaki Haklarınız
KVKK'nın 11. maddesi uyarınca, kişisel verilerinizle ilgili olarak aşağıdaki haklara sahipsiniz:

- Kişisel verilerinizin işlenip işlenmediğini öğrenme.

- Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme.

- Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme.

- Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme.

- Kişisel verilerinizin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme.

- Kişisel verilerinizin silinmesini veya yok edilmesini isteme.

- Kişisel verilerin düzeltilmesi, silinmesi veya yok edilmesine ilişkin işlemlerin kişisel verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme.

- İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme.

- Kişisel verilerinizin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme.

7. İletişim
Kişisel verilerinize ilişkin taleplerinizi Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ'e göre aşağıdaki iletişim bilgileri üzerinden iletebilirsiniz:

Yenilik ve Eğitim Teknolojileri Genel Müdürlüğü
Emniyet Mahallesi, Milas Sokak, No:8 06560 Yenimahalle / ANKARA
Telefon: 0312 296 94 00
E-posta: yegitek@meb.gov.tr
İletişim Formu: https://yegitek.meb.gov.tr/www/eposta_gonder.php

Yukarıdaki kişisel verilerin korunması hakkındaki aydınlatma metnini okudum, anladım ve kişisel verilerimin işlenmesini onaylıyorum.`;

/**
 * Taahhütname GÖREVLE ilgilidir: koordinatörün görevini nasıl yürüteceğini
 * söyler. Gizlilik sözleşmesinden ayrı tutulmasının sebebi budur — biri
 * "görevini şöyle yapacaksın", öbürü "eriştiğin veriyle şöyle davranacaksın"
 * der. İkisi tek metin olsaydı, birinin ihlali diğerinin onayını da tartışmalı
 * hâle getirirdi.
 */
export const VARSAYILAN_TAAHHUTNAME_METNI = `GençTek İl Koordinatörü Taahhütnamesi

GençTek ekosisteminde il koordinatörü olarak görevlendirilmem nedeniyle aşağıdaki hususları taahhüt ederim:

1. Görevimi Millî Eğitim Bakanlığı mevzuatına, GençTek ekosisteminin amaç ve ilkelerine uygun şekilde yürütürüm.

2. Sistemi yalnızca görevimin gerektirdiği işler için kullanırım; kişisel, ticari ya da siyasi hiçbir amaçla kullanmam.

3. İlimdeki danışman öğretmen ve öğrenci kayıtlarının güncel ve doğru tutulmasını gözetir, sisteme gerçeğe aykırı veri girmem.

4. İlimde açılan faaliyetlerin başvuru, değerlendirme ve raporlama süreçlerini süresinde yürütürüm; biten faaliyetlerin raporlarının yazılmasını takip ederim.

5. Öğrenci ve öğretmenler arasında ayrım gözetmeden, fırsat eşitliğini koruyacak şekilde davranırım.

6. Görevim gereği yaptığım her işlemin sistemde kayıt altına alındığını ve denetlenebileceğini bilirim.

7. Görevimin sona ermesi hâlinde sistemdeki yetkilerimin kapatılacağını, devir işlemlerini eksiksiz yapacağımı kabul ederim.

8. Bu taahhütnameye aykırı davranışın idari ve hukuki sorumluluk doğurabileceğini bilirim.`;

/**
 * Gizlilik sözleşmesi VERİYLE ilgilidir. Metin, kaldırılan "koordinatör
 * gizlilik taahhütnamesi"nin içeriğini sürdürür; eski onaylar bu belgeye
 * taşındı (bkz. migrations/20260805120000_onay_belgeleri).
 *
 * Neden yalnızca koordinatörden isteniyor: danışman öğretmen kendi okulundaki
 * öğrencileri görür ve onlarla zaten yüz yüze çalışır; koordinatör ise
 * tanımadığı ONLARCA ÖĞRETMENİN iletişim bilgisine erişebiliyor. Yükümlülüğü
 * doğuran fark budur. Proje yöneticisi kapsam dışı: merkez personeli kurumsal
 * görev tanımıyla bağlıdır, sistem içi bir metin onun yükümlülüğünü doğurmaz.
 */
export const VARSAYILAN_GIZLILIK_SOZLESMESI_METNI = `GençTek İl Koordinatörü Gizlilik Sözleşmesi

İl koordinatörü olarak, GençTek Bilgi Sistemi üzerinden erişebildiğim kişisel verilere ilişkin aşağıdaki taahhütte bulunurum:

1. İlimdeki öğretmenlerin ve öğrencilerin kişisel verilerine (kimlik, iletişim ve görev bilgileri) yalnızca GençTek görevimin gerektirdiği ölçüde erişirim.

2. Eriştiğim verileri görevimin dışında hiçbir amaçla kullanmam; üçüncü kişilerle paylaşmam, kopyalamam ve sistem dışına çıkarmam.

3. Dışa aktardığım listeleri (CSV, rapor) yalnızca görevimin gerektirdiği süre boyunca saklarım ve işim bittiğinde silerim.

4. Sistemdeki her erişimimin kayıt altına alındığını ve denetlenebileceğini bilirim.

5. Görevim sona erdiğinde erişimimin kapatılacağını, elimdeki tüm kopyaları imha edeceğimi kabul ederim.

6. Bu yükümlülüklere aykırı davranışın 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında sorumluluk doğurabileceğini bilirim.`;

// ---------------------------------------------------------------------------
// Belge tanımları
// ---------------------------------------------------------------------------

export interface BelgeTanimi {
  belge: OnayBelgesi;
  /** Ekranda ve menüde görünen ad. */
  baslik: string;
  /** Belgenin ne olduğunu bir cümlede söyler. */
  aciklama: string;
  /** Onay kutusunun yanında yazan beyan. */
  onayEtiketi: string;
  /** Metnin sistem_ayari'ndaki anahtarı; kayıt yoksa varsayilanMetin geçerlidir. */
  ayarAnahtari: string;
  varsayilanMetin: string;
  /**
   * Belge bu kullanıcıdan isteniyor mu?
   *
   * Rol eşlemesi BURADA, tek yerde durur. Ekranlar "il koordinatörü mü" diye
   * ayrıca sormaz; sorsalardı kapsam iki yerden yönetilir ve biri unutulurdu.
   */
  gerekliMi: (kullanici: OturumKullanicisi) => boolean;
}

/**
 * Onay belgeleri ve kimden istendikleri.
 *
 * Sıra ekrandaki sıradır: önce herkesi ilgilendiren KVKK belgeleri, sonra
 * göreve bağlı olanlar.
 *
 * KAPSAMI GENİŞLETİRKEN DİKKAT: taahhütname ve gizlilik sözleşmesi bilinçli
 * olarak yalnızca il koordinatöründen isteniyor. Danışman öğretmene ya da
 * proje yöneticisine açmak bir ürün kararıdır, teknik bir düzeltme değil.
 *
 * PAYDAŞ TEMSİLCİSİNDEN GİZLİLİK SÖZLEŞMESİ İSTENMİYOR ve bu bilinçli:
 * yürürlükteki yetkisiyle hiçbir öğrenci/öğretmen kişisel verisine erişmiyor
 * (bkz. lib/yetki/kapsam.ts). Yükümlülüğü doğuran şey rolün adı değil eriştiği
 * veridir. Paydaşın kapsamı genişletilirse — örneğin katılımcı listesi
 * görmesi istenirse — bu belge ONA DA açılmalı; metnin başlığı da o zaman
 * "İl Koordinatörü" demekten çıkar.
 */
export const BELGE_TANIMLARI: BelgeTanimi[] = [
  {
    belge: "AYDINLATMA",
    baslik: "KVKK Aydınlatma Metni",
    aciklama:
      "Bu sistemde hangi verilerinizin, neden ve ne kadar süreyle işlendiğini anlatır.",
    onayEtiketi: "Aydınlatma metnini okudum ve anladım.",
    ayarAnahtari: AYAR_KVKK_METNI,
    varsayilanMetin: VARSAYILAN_AYDINLATMA_METNI,
    /*
     * Aydınlatma yükümlülüğü verisi işlenen kişiye karşıdır ve bu sistemde
     * kişisel verisi asıl işlenen grup öğrencilerdir. Öğretmen tarafındaki
     * karşılığı açık rızadır (o herkesten isteniyor).
     *
     * DIŞ KULLANICILAR (mezun, paydaş temsilcisi) da bu belgeyi onaylar:
     * kimlikleri kurumsal bir kayıttan gelmiyor, verilerini sisteme kendileri
     * giriyor. BAŞVURU ANINDA da bir aydınlatma onayı alınır
     * (dis_kullanici_basvurusu.aydinlatma_onay_tarihi) — o, henüz kullanıcı
     * kaydı yokken başlayan veri işlemenin karşılığıdır; buradaki ise sisteme
     * girdikten sonra işlenecek verinin. İkisi ayrı anlar, ayrı kayıtlar.
     */
    gerekliMi: (kullanici) => ogrenciMi(kullanici) || disKullaniciMi(kullanici),
  },
  {
    belge: "ACIK_RIZA",
    baslik: "KVKK Açık Rıza Onayı",
    aciklama:
      "İsteğe bağlı bilgilerinizin (iletişim, fotoğraf, belgelerde ad kullanımı) işlenmesine verdiğiniz rıza.",
    onayEtiketi: "Açık rıza metnini okudum, sayılan işlemlere rıza gösteriyorum.",
    ayarAnahtari: AYAR_ACIK_RIZA_METNI,
    varsayilanMetin: VARSAYILAN_ACIK_RIZA_METNI,
    // Rıza HERKESTEN istenir: öğrencinin de öğretmenin de personelin de
    // isteğe bağlı verisi (iletişim bilgisi, profil fotoğrafı) işleniyor.
    gerekliMi: () => true,
  },
  {
    belge: "TAAHHUTNAME",
    baslik: "İl Koordinatörü Taahhütnamesi",
    aciklama: "Koordinatörlük görevinin nasıl yürütüleceğine ilişkin taahhüt.",
    onayEtiketi: "Taahhütnameyi okudum, kabul ediyorum.",
    ayarAnahtari: AYAR_TAAHHUTNAME_METNI,
    varsayilanMetin: VARSAYILAN_TAAHHUTNAME_METNI,
    gerekliMi: ilKoordinatoruMu,
  },
  {
    belge: "GIZLILIK_SOZLESMESI",
    baslik: "Gizlilik Sözleşmesi",
    aciklama:
      "İlinizdeki öğretmen ve öğrencilerin kişisel verilerine ilişkin gizlilik yükümlülükleriniz.",
    onayEtiketi: "Gizlilik sözleşmesini okudum, kabul ediyorum.",
    ayarAnahtari: AYAR_GIZLILIK_SOZLESMESI_METNI,
    varsayilanMetin: VARSAYILAN_GIZLILIK_SOZLESMESI_METNI,
    gerekliMi: ilKoordinatoruMu,
  },
];

/** Bu kullanıcıdan onayı istenen belgeler. */
export function kullanicininBelgeleri(
  kullanici: OturumKullanicisi,
): BelgeTanimi[] {
  return BELGE_TANIMLARI.filter((tanim) => tanim.gerekliMi(kullanici));
}

export function belgeTanimi(belge: OnayBelgesi): BelgeTanimi {
  const tanim = BELGE_TANIMLARI.find((aday) => aday.belge === belge);
  if (!tanim) {
    // Enum'a değer eklenip tanım yazılmazsa belge sessizce hiç kimseden
    // istenmezdi; gürültülü başarısızlık tercih ediliyor.
    throw new Error(`Tanımsız onay belgesi: ${belge}`);
  }
  return tanim;
}
