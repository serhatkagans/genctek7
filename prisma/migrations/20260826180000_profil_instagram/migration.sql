-- Profildeki mesleki bağlantılara INSTAGRAM eklendi.
--
-- İstekler (26 Ağustos 2026): "İletişim bilgilerim il koordinatörünün bu
-- alanına linkedin ve instagram alanı da ekleyelim" · "bunları hatta öğrenci ve
-- öğretmenlerin iletişim bilgileri alanına da ekleyelim instagram linkedin".
--
-- LINKEDIN ZATEN VARDI (7 Ağustos 2026'dan beri, iki tabloda da); eksik olan
-- Instagram sütunu ve alanların ÖĞRETMENE/KOORDİNATÖRE de sorulmasıydı.
-- İkincisi bir şema işi değil, form işidir (bkz. components/ProfilDuzenleme.tsx
-- · baglantiSorulsun) — buradaki tek değişiklik yeni sütun.
--
-- İKİ TABLOYA BİRDEN, ortak tabloya taşınmadan: `ogrenci_profil` ve
-- `ogretmen_profil` satırlarının yaşam döngüsü ayrı (öğrenci mezun olduğunda
-- biri kapanır, öğretmeninki kapanmaz) — CV ve diğer bağlantı sütunlarında
-- verilmiş kararın aynısı.
--
-- Sütun NULL kabul ediyor ve varsayılanı yok: adres kişinin beyanıdır, boş
-- kalması normal hâldir.
ALTER TABLE "ogrenci_profil"
  ADD COLUMN IF NOT EXISTS "instagram_url" VARCHAR(200);

ALTER TABLE "ogretmen_profil"
  ADD COLUMN IF NOT EXISTS "instagram_url" VARCHAR(200);
