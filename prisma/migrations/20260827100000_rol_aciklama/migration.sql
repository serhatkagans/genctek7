-- İl koordinatörü atamasının serbest metin açıklaması (27 Ağustos 2026).
--
-- Görev kaydının kendisinde durur, kişinin profilinde değil: aynı öğretmen iki
-- ayrı dönemde iki ayrı ile atanabiliyor ve not "bu atama neden yapıldı"
-- sorusunun cevabı.
--
-- NULL serbest: var olan atamaların açıklaması yok ve boş metinle doldurmak
-- "açıklama yazılmamış" ile "açıklama boş bırakılmış" ayrımını yok ederdi.
ALTER TABLE "kullanici_rol" ADD COLUMN "aciklama" TEXT;
