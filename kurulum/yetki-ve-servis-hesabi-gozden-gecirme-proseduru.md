# GençTek Yetki ve Servis Hesabı Gözden Geçirme Prosedürü

**Dayanak:** Bilgi ve İletişim Güvenliği Rehberi 2/f  
**Sahip:** GençTek proje yöneticisi; teknik servis hesaplarında sistem yöneticisi  
**Periyot:** Üç ayda bir; ayrıca görev/tedarikçi değişimi ve güvenlik olayında  
**Yürürlük:** 3 Eylül 2026

Amaç, her insan ve servis hesabının hâlâ gerekli, doğru kapsamda, tek bir sorumluya
bağlı ve güncel kimlik bilgisiyle çalıştığını kanıtlamaktır. Rol envanteri ekranı
ve `bitisTarihi` ile görev kapatma bu süreci destekler; ekranı açmak tek başına
gözden geçirme sayılmaz.

## 1. Kapsam ve sorumluluk ayrılığı

- **İnsan hesapları:** proje yöneticisi tüm merkez ve il rollerini; il
  koordinatörü kendi ilindeki görevlendirmeleri inceler. Kişi kendi yetkisini
  onaylayamaz.
- **Servis hesapları ve sırlar:** sistem yöneticisi envanteri çıkarır; proje
  yöneticisi iş gereksinimini, bilgi güvenliği sorumlusu kapsam ve rotasyonu
  onaylar. Anahtarı kullanan kişi tek başına incelemeyi kapatamaz.
- İnceleme; uygulama rolleri yanında işletim sistemi, PostgreSQL, EBA SSO, S3,
  SMTP, SMS, yedekleme, yayın/SSH ve varsa izleme hesaplarını kapsar.

## 2. Periyodik inceleme adımları

1. İnceleme numarası ve dönem açılır; kapsam anı sabitlenir.
2. `/panel/rol-envanteri` çıktısı ile aktif `kullanici_rol` ve
   `danisman_atama` kayıtları alınır. Sistem/sağlayıcı hesapları kontrollü servis
   hesabı envanteriyle karşılaştırılır.
3. Her hesap için sorumlu, iş gerekçesi, rol/kapsam, son kullanım, başlangıç ve
   varsa bitiş tarihi, güçlü kimlik doğrulama durumu ve ayrıcalık seviyesi
   doğrulanır.
4. Karar `DEVAM`, `DARALT`, `ASKIYA_AL`, `KAPAT` veya `SORUMLU_ATA` olarak
   kaydedilir. Kararsız satır “incelendi” sayılmaz.
5. Gereksiz yetki aynı iş günü kaldırılır; kapanış `bitisTarihi`/sağlayıcı kaydı
   ve erişim loguyla doğrulanır. Acil olmayan düzeltmelerin sahibi ve hedef
   tarihi yazılır.
6. İnceleyen ve onaylayan farklı kişiler tarih/saatleriyle imzalar. Özet; toplam,
   kapatılan, daraltılan, geciken ve istisna sayısını içerir.

Kanıt için `kurulum/kayitlar/yetki-servis-hesabi-gozden-gecirme-sablonu.csv`
kopyalanır. Doldurulan kayıt kişisel veri ve altyapı bilgisi taşıyabileceğinden
açık Git deposuna eklenmez; erişimi sınırlı denetim alanında saklanır. Boş
şablon, tamamlanmış inceleme kanıtı değildir.

## 3. Servis hesabı ilkeleri

- Her hesap tek bir sistem/amaç ve sorumlu birimle eşleşir; ortak insan hesabı
  servis hesabı olarak kullanılmaz.
- Uygulama PostgreSQL süper kullanıcısı ile çalışmaz. `genctek` işletim sistemi
  hesabı etkileşimli giriş için kullanılmaz ve yalnızca gereken dizine yazabilir.
- Üretim, test ve geliştirme hesapları/anahtarları ortak olamaz. Ayrı test ortamı
  kurulana kadar üretim kimlik bilgileri geliştirme makinesine taşınamaz.
- Kullanılmayan hesap kapatılır; “ileride gerekebilir” iş gerekçesi değildir.
- Sırlar `.env` veya kurum sır kasasında tutulur; Git, görev kaydı, e-posta,
  sohbet, ekran görüntüsü ve yapay zekâ aracına konulmaz.

## 4. Anahtar ve parola rotasyonu

| Sır/hesap | Olağan azami süre | Rotasyon etkisi ve doğrulama |
|---|---:|---|
| `OTURUM_GIZLI_ANAHTARI` | 90 gün | Yeni anahtar dağıtılır, servisler sıralı yenilenir; mevcut oturumların düşmesi beklenir ve giriş testi yapılır. |
| `SMTP_SIFRE`, `SMS_API_ANAHTARI` | 180 gün | Sağlayıcıda yeni kimlik oluşturulur, gönderim testi yapılır, eski kimlik iptal edilir. |
| `EBA_ISTEMCI_SIFRE` | 180 gün | SSO sağlayıcı kuralı daha kısaysa o uygulanır; yeni sırla giriş doğrulanmadan eskisi iptal edilmez. |
| `S3_ERISIM_ANAHTARI` / `S3_GIZLI_ANAHTAR` | 180 gün | Yeni anahtarla yükleme-indirme testi, sonra eski anahtarın iptali ve erişim kaydı kontrolü yapılır. |
| PostgreSQL uygulama parolası (`DATABASE_URL`) | 180 gün | Yeni parola uygulamaya alınır, bağlantı ve bakım işleri doğrulanır, eski parola geçersizleştirilir. |
| Yayın/SSH ve yedekleme anahtarları | 180 gün | Yetkili anahtar listesi gözden geçirilir; yeni anahtarla bağlantı/yedek testi sonrası eski anahtar kaldırılır. |

Sağlayıcının veya kurum politikasının daha kısa süresi varsa kısa olan geçerlidir.
Şüpheli açıklanma, personel/tedarikçi ayrılığı, yetkisiz erişim, yanlışlıkla Git/
günlük/yapay zekâ aracına girme ya da sahipliği belirsizleşme durumunda takvim
beklenmeden rotasyon yapılır. Her rotasyon için sır adı (değeri değil), yapan,
onaylayan, eski/yeni kimlik sürümü, tarih, doğrulama ve eski kimliğin iptal saati
kaydedilir.

## 5. Gecikme ve istisna

Azami süreyi aşan sır veya kapanmayan yetki için risk sahibi, gerekçe, geçici
önlem ve en fazla 30 günlük hedef tarih yazılı onaylanır. Hedef tarihinde
kapanmayan istisna bilgi güvenliği sorumlusuna ve veri sorumlusuna yükseltilir.
Yetkisi ve sahibi doğrulanamayan hesap, hizmeti geri döndürülemez biçimde
bozmayacağı doğrulandıktan sonra askıya alınır.

