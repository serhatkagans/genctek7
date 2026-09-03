-- OTURUM İPTALİ: ÇALINAN ÇEREZİN 8 SAATLİK ÖMRÜ
--
-- Oturum, sunucuda tutulan bir kayıt değil imzalı bir çerezdir (bkz.
-- src/lib/auth/oturum.ts). Tek tek iptal edilemiyordu: çerez değerini bir kez
-- kopyalayan (paylaşılan makine, tarayıcı geliştirici araçları, günlüğe düşmüş
-- bir istek) kişi, şifre değiştirilse bile 8 saat boyunca oturumu sürdürürdü.
--
-- Elde yalnızca iki kol vardı ve ikisi de yetmiyordu: `kullanici.aktif` kişiyi
-- tümden dışarıda bırakır (şifresini değiştiren birini pasife alamayız), oturum
-- gizli anahtarını değiştirmek ise SİSTEMDEKİ HERKESİ aynı anda atardı.
--
-- Sürüm bu ikisinin arasını doldurur: çerezin gövdesi yazıldığı andaki sayıyı
-- taşır, sunucu her istekte buradaki değerle karşılaştırır. Sayıyı artırmak o
-- kullanıcının tüm açık oturumlarını düşürür, başkasına dokunmaz.
--
-- VARSAYILAN 0 ve mevcut satırlar 0 alır. Bu sürüm yayına alındığında açık
-- oturumların hepsi zaten bir kez giriş ekranına düşer: çerez gövdesi iki
-- parçadan üçe çıktığı için eski biçim tanınmıyor (oturum-govde.ts).

ALTER TABLE "kullanici"
  ADD COLUMN "oturum_surumu" INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN "kullanici"."oturum_surumu" IS
  'Açık oturumları toplu iptal etme kolu. Oturum çerezi bu sayıyı taşır; artırmak o kullanıcının tüm oturumlarını düşürür. Şifre sıfırlamada artar.';
