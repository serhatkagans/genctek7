# GençTek Kişisel Veri İhlali Müdahale ve Bildirim Planı

**Dayanak:** 6698 sayılı Kanun m.12/5, Kişisel Verileri Koruma Kurulunun
24.01.2019 tarihli ve 2019/10 sayılı Kararı, Bilgi ve İletişim Güvenliği
Rehberi 2/j  
**Sahip:** GençTek proje yöneticisi  
**Gözden geçirme:** Yılda bir ve her gerçek/tatbikat olayından sonra  
**Yürürlük:** 3 Eylül 2026

Bu plan; kişisel verinin hukuka aykırı biçimde görülmesi, alınması,
değiştirilmesi, kaybedilmesi, açıklanması veya erişilemez hâle gelmesi şüphesinde
uygulanır. Uygulamanın `/api/hata-bildir` ucu yalnızca teknik hata toplar; bu
planın yerine geçmez.

## 1. Değişmez kurallar

- Olayı gören kişi kanıt toplamayı beklemeden proje yöneticisine ve bilgi
  güvenliği irtibatına bildirir. Bildiren kişiden kesin ihlal kanıtı beklenmez.
- **72 saat çözüm süresi değildir.** Veri sorumlusunun ihlali öğrendiği andan
  itibaren Kurula bildirim gecikmeksizin ve en geç 72 saat içinde yapılır.
- Bilgilerin tümü hazır değilse ilk bildirim bekletilmez; eldeki bilgilerle
  bildirim yapılır, eksikler gecikmeden aşamalı olarak tamamlanır.
- Etkilenen kişiler belirlendiğinde kendilerine makul olan en kısa sürede
  doğrudan; doğrudan ulaşılamıyorsa web duyurusu gibi uygun bir yöntemle haber
  verilir.
- Her şüphe, bildirim yapılmamasına karar verilse bile olay kaydına yazılır.
  Kararı, gerekçeyi ve karar veren kişiyi içermeyen kayıt kapatılamaz.
- Kanıt bütünlüğü korunur. İnceleme kopya üzerinde yapılır; loglar silinmez,
  değiştirilmez veya saldırganın erişebileceği yere taşınmaz.

Resmî bildirim yöntemi ve güncel form için yalnızca
[KVKK Veri İhlali Bildirimi](https://www.kvkk.gov.tr/Icerik/5362/Veri-Ihlali-Bildirimi)
sayfası kullanılır.

## 2. Olay ekibi ve iletişim kartı

| Rol | Sorumluluk |
|---|---|
| Olay koordinatörü — proje yöneticisi | Saati başlatır, görev dağıtır, olay kaydını ve kararları onaylar. |
| Teknik sorumlu — sistem yöneticisi | Erişimi keser, kanıtı korur, kapsam ve kök nedeni araştırır, güvenli geri dönüşü yürütür. |
| Veri sorumlusu irtibatı — YEĞİTEK'in yetkilendirdiği kişi | Kurul ve ilgili kişi bildirimlerini hukuk/kurum iletişimiyle hazırlar ve gönderir. |
| Hukuk/KVKK irtibatı | Bildirim gerekliliğini ve metnini değerlendirir; bu değerlendirme 72 saatlik saati durdurmaz. |
| İletişim sorumlusu | Etkilenen kişilere aynı, anlaşılır ve doğrulanmış mesajın ulaşmasını sağlar. |

Ad, yedek kişi, telefon ve kurum e-postası üretim ortamının kontrollü işletim
kopyasında doldurulur. Bu iletişim kartı boşken üretime çıkış onaylanmaz; kişisel
iletişim bilgileri açık Git deposuna yazılmaz.

## 3. Müdahale akışı

### İlk 0–4 saat: bildir, kaydet, sınırla

1. İlk öğrenme zamanı, bildiren, kaynak, görülen belirti ve etkilendiği düşünülen
   sistem `kurulum/kayitlar/veri-ihlali-kayit-sablonu.csv` kullanılarak kaydedilir.
2. Olay koordinatörü tek olay numarası verir ve 72 saat son tarihini ilk öğrenme
   zamanından hesaplar.
3. Teknik sorumlu, kanıtı yok etmeden saldırgan oturumlarını sonlandırır; ilgili
   hesabı/anahtarı askıya alır, ağ veya servis erişimini daraltır.
4. Hata günlüğü, erişim/oturum izleri, ters vekil ve sistem günlükleri; saat
   dilimi, kaynak ve SHA-256 özetiyle salt okunur olay klasörüne alınır.
5. Yedekten dönüş gerekiyorsa önce etkilenen ortamın anlık görüntüsü korunur.

### 4–24 saat: kapsamı ve riski belirle

- Hangi veri kümelerinin, kaç kişinin ve hangi yaş gruplarının etkilendiği;
  verinin şifreli/açık oluşu ve dışarı çıkarılma ihtimali belirlenir.
- İlk erişim, tespit, öğrenme ve sınırlama zamanları ayrı ayrı kaydedilir.
- Yetkisiz kişinin kimliği/bilinen özellikleri, kullanılan açıklık ve devam eden
  risk kaydedilir; varsayım ile doğrulanmış bulgu ayrılır.
- Özellikle çocuk verisi, kimlik, iletişim, parola/jeton ve özel nitelikli veri
  etkisi önceliklendirilir.
- İhlal değilse veya Kurula bildirim yapılmayacaksa gerekçeli karar, hukuk/KVKK
  görüşü ve onaylayan kişi olay kaydına eklenir.

### 24–72 saat: bildir ve güvenli hizmeti geri getir

- Veri sorumlusu irtibatı güncel KVKK formunu kullanarak Kurula bildirimi
  gönderir; gönderim tarihi, yöntemi ve başvuru/teyit numarası olay kaydına
  işlenir.
- Etkilenen kişiye yapılacak bildirim; ihlalin zamanı ve niteliği, etkilenen veri
  kategorileri, muhtemel sonuçlar, alınan/alınacak önlemler, kişinin kendini
  korumak için yapabilecekleri ve irtibat kanalını açık dille içerir.
- Açıklık kapatılır; etkilenen anahtarlar döndürülür. Yalnızca düzeltme
  doğrulandıktan ve olay koordinatörü onayladıktan sonra servis açılır.
- Geç bildirim kaçınılmaz olmuşsa sebebi ayrıca kaydedilir; gecikme bildirimi
  daha fazla erteleme gerekçesi değildir.

### Olay sonrası

- En geç 10 iş günü içinde kök neden, zaman çizelgesi, etki, kararlar, bildirim
  kanıtları ve kalıcı düzeltmelerle kapanış değerlendirmesi yapılır.
- İyileştirmelerin sahibi ve hedef tarihi yazılır; test edilmemiş düzeltme
  “tamamlandı” sayılmaz.
- Bu plan ve ilgili güvenlik kontrolleri olaydan/tatbikattan öğrenilenlerle
  güncellenir. En az yılda bir masa başı tatbikat yapılır ve katılımcı/tarih/
  sonuç kaydı saklanır.

## 4. Asgari kayıt ve saklama

Olay kaydı; olay numarası, ilk öğrenme ve ihlal zamanı, kaynak, bildiren,
koordinatör, etkilenen sistem/veri/kişi, risk, yapılan işlemler, karar ve
gerekçesi, Kurul ve ilgili kişi bildirim zamanları, kanıt konumu/özeti, kapanış
onayı ile takip işlerini içerir. Kayıt yalnızca olay ekibi ve denetim yetkilisine
açıktır; kurumun kayıt saklama planındaki süre boyunca bütünlüğü korunarak
saklanır.

