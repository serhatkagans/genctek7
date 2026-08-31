-- EKLEMEK İSTEDİKLERİNİZ (31 Ağustos 2026 · istek: "CV yükle bunu eklemek
-- istedikleriniz yap, dosya ekleme kalsın metin ekleme alanı olsun").
--
-- Profildeki "Özgeçmişim (CV)" bölümü yalnızca PDF kabul ediyordu. PDF'i
-- olmayan ya da ekleyeceği şey bir dosyaya değmeyecek kadar kısa olan kişinin
-- (bir sertifika adı, bir kurs, bir açıklama) yazacak yeri yoktu. Bu sütun o
-- metni tutuyor; üretilen özgeçmişe kendi başlığıyla giriyor.
--
-- `hakkinda` İLE AYNI ALAN DEĞİL: "Hakkımda" kişinin kendini tanıttığı ve
-- panelde herkese görünen satırdır, bu ise ÖZGEÇMİŞE eklenecek şeylerin yeri.
-- Tek alan olsalardı birini değiştirmek ötekini de değiştirirdi.
--
-- İKİ TABLOYA DA EKLENİYOR: CV alanları da öyleydi (bkz. 7 Ağustos 2026,
-- öğretmen özgeçmişi). Ortak tabloya taşımak iki profil satırının yaşam
-- döngüsünü birbirine bağlardı — öğrenci mezun olduğunda öğrenci profili
-- kapanır, öğretmeninki kapanmaz.
--
-- SÜTUN `TEXT`, uzunluk sınırı YOK: sınır bir ürün kararıdır ve uygulama
-- katmanında duruyor (lib/ogrenci/cv-kurallar.ts · CV_EK_NOTU_AZAMI), böylece
-- değiştirilmesi migration istemiyor.

ALTER TABLE "ogrenci_profil" ADD COLUMN "cv_ek_notu" TEXT;
ALTER TABLE "ogretmen_profil" ADD COLUMN "cv_ek_notu" TEXT;
