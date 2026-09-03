# GençTek Yapay Zekâ Araçları Kullanım Kuralı

**Dayanak:** Bilgi ve İletişim Güvenliği Rehberi 7/e  
**Sahip:** GençTek proje yöneticisi ve bilgi güvenliği sorumlusu  
**Gözden geçirme:** Altı ayda bir ve her yeni araç/model/sözleşme öncesinde  
**Yürürlük:** 3 Eylül 2026

Bu kural GençTek'e bir yapay zekâ özelliği eklenmemiş olsa da geliştirme,
destek, analiz, dokümantasyon ve işletim sırasında kullanılan üretken yapay zekâ
araçlarını kapsar. Çalışan, yüklenici, danışman ve destek personelinin tamamına
uygulanır.

## 1. Onaylı araç listesi

**Mevcut durum: Kurumsal veya kişisel veri işlemek üzere onaylanmış yapay zekâ
aracı yoktur.** Bir aracın yaygın, ücretli veya kurumsal hesaptan kullanılıyor
olması onay anlamına gelmez.

Yeni bir araç ancak veri sorumlusu ve bilgi güvenliği biriminin yazılı kararıyla
listeye eklenir. Kayıtta en az araç/model ve sağlayıcı, kullanım amacı, izinli
veri sınıfı, saklama ve model eğitimi ayarları, veri bölgesi/aktarım durumu,
erişim yöntemi, onaylayanlar, onay tarihi ve sona erme/gözden geçirme tarihi
bulunur. Süresi geçen onay otomatik olarak askıya alınmış sayılır.

## 2. Yapay zekâ aracına verilmesi yasak veriler

Aşağıdakiler; maskeleme, takma ad verme veya “yalnızca hata ayıklama” gerekçesiyle
de olsa onaylı veri işleme şartları ayrıca sağlanmadan hiçbir yapay zekâ aracına
girilmez, yüklenmez veya eklenti üzerinden erişime açılmaz:

- Üretim veritabanı kayıtları, yedekler, dışa aktarımlar ve ekran görüntüleri;
- öğrenci, öğretmen, veli, mentor, paydaş ve çalışanlara ait kişisel veriler;
- özellikle çocuk verileri, kimlik/iletişim bilgileri ve özel nitelikli veriler;
- `.env` içeriği; `OTURUM_GIZLI_ANAHTARI`, `SMTP_SIFRE`, SSO/API/SMS/S3
  anahtarları; parolalar, jetonlar, çerezler, özel anahtarlar ve bağlantı
  dizeleri;
- erişim, oturum, hata, ters vekil ve sistem günlüklerinin ham içerikleri;
- yayımlanmamış güvenlik açığı, olay/ihlal kaydı, ağ ve altyapı ayrıntıları;
- gizli, kuruma özel, telif veya sözleşme kısıtlı belge ve kaynaklar.

Bir metinden ad-soyad silmek tek başına anonimleştirme değildir. Okul, il, sınıf,
tarih, olay ayrıntısı veya serbest metin kişiyi yeniden belirleyebiliyorsa veri
yasak kapsamındadır.

## 3. Geliştirmede izin verilen kullanım

- Yalnızca kamuya açık içerik, kişisel veri içermeyen kaynak kodu ve açıkça
  üretilmiş sentetik örnekler kullanılabilir; yine de araç için yazılı kullanım
  onayı gerekir.
- **Üretim verisi geliştirme, test, hata ayıklama, istem (prompt), ince ayar,
  değerlendirme veya gösterim amacıyla kullanılamaz.**
- Ayrı test ortamı ve doğrulanmış sentetik veri kümesi kurulana kadar yapay zekâ
  ile veri analizi ve veri taşıyan uçtan uca test yapılmaz. Bu eksiklik, üretim
  verisini kullanma istisnası oluşturmaz.
- Gerekli en küçük kod parçası paylaşılır. Yapılandırma, günlük, dışa aktarma ve
  veri dosyaları bağlama otomatik eklenmez.
- Araç çıktısı doğru veya güvenli kabul edilmez; insan incelemesi, test,
  bağımlılık/lisans kontrolü ve güvenlik taraması yapılmadan birleştirilmez veya
  yayımlanmaz.
- Yapay zekâ aracı üretim sistemine, veritabanına, depolamaya, e-postaya ya da
  yönetim paneline doğrudan bağlanamaz; araca işlem yapma yetkisi verilmez.

## 4. İstisna ve ihlal

İstisna; amaç, zorunluluk, veri sınıfı, azaltıcı önlemler, süre ve veri silme
kanıtı yazılarak veri sorumlusu ile bilgi güvenliği sorumlusunun **önceden**
onayını gerektirir. Sözlü veya geriye dönük onay geçerli değildir.

Yasak verinin yanlışlıkla araca verildiği fark edilirse kullanıcı paylaşımı
durdurur; konuşmayı silmenin ihlali ortadan kaldırdığı varsayılmaz ve derhal
`veri-ihlali-mudahale-ve-bildirim-plani.md` işletilir. Araç adı, hesap, zaman,
veri kapsamı, bağlantı/konuşma kimliği ve sağlayıcıdan silme talebi olay kaydına
eklenir.

## 5. Kayıt ve eğitim

Onay listesi ile istisnalar kontrollü kurum kaydında saklanır. Kullanıcılar işe/
projeye başlarken ve yılda bir bu kural hakkında bilgilendirilir; tarih,
katılımcı ve sürüm kaydedilir. Altı aylık gözden geçirmede araç listesi,
sağlayıcı koşulları, veri saklama/eğitim ayarları ve verilmiş erişimler yeniden
onaylanır.
