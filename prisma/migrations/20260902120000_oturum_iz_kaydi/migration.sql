-- Genelge 2/d: başarılı/başarısız oturum açma ve oturum kapama izleri.
--
-- Başarısız bir denemede girilen kimlik sistemde bulunmayabilir. Bu nedenle
-- erisim_logu.kullanici_id artık nullable; ham e-posta/T.C. kimlik numarası
-- yerine hedef_id alanına uygulamanın ürettiği kısa SHA-256 özeti yazılır.

ALTER TYPE "LogIslemi" ADD VALUE IF NOT EXISTS 'GIRIS';
ALTER TYPE "LogIslemi" ADD VALUE IF NOT EXISTS 'CIKIS';
ALTER TYPE "LogHedefTip" ADD VALUE IF NOT EXISTS 'OTURUM';

ALTER TABLE "erisim_logu"
  ALTER COLUMN "kullanici_id" DROP NOT NULL;
