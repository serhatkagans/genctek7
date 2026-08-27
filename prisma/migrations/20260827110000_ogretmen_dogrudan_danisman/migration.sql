-- Öğretmen sisteme girince doğrudan danışman olur (27 Ağustos 2026 · istek:
-- "bu onay var buna gerek yok, sisteme giriş yapınca direk danışman olsun").
--
-- Kod tarafı yalnızca YENİ kullanıcıyı kapsıyor (lib/kullanici/sagla.ts); bu
-- göç, kutuyu hiç işaretlememiş MEVCUT öğretmenlere aynı rolü veriyor. Yoksa
-- onlar rolsüz kalır ve işareti koyabilecekleri ekran da kalktı.
--
-- GÖREVİ BIRAKANLARA DOKUNULMAZ. Bırakma, DANISMAN rol satırını silmiyor;
-- `bitis_tarihi` yazarak kapatıyor. Bu yüzden koşul "hiç DANISMAN satırı
-- olmayan" diyor, "açık DANISMAN satırı olmayan" değil — ikincisi, görevini
-- bilerek bırakmış öğretmeni sessizce geri alırdı.
--
-- Dışarıda kalanlar:
--   · kurum kodu olmayan öğretmen (danışmanlık bir OKULA bağlanır),
--   · il koordinatörü (aynı anda danışman olamaz — ux_ogretmen_tek_gorev),
--   · öğrenci ve dış kullanıcılar (ogretmen_profil satırları yok ya da
--     rolleri var).
INSERT INTO "kullanici_rol" ("kullanici_id", "rol_kodu", "kurum_kodu", "baslangic_tarihi")
SELECT k."id", 'DANISMAN', k."kurum_kodu", NOW()
FROM "kullanici" k
JOIN "ogretmen_profil" op ON op."kullanici_id" = k."id"
WHERE k."aktif" = true
  AND k."kurum_kodu" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "kullanici_rol" r
    WHERE r."kullanici_id" = k."id" AND r."rol_kodu" = 'DANISMAN'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "kullanici_rol" r
    WHERE r."kullanici_id" = k."id"
      AND r."bitis_tarihi" IS NULL
      AND r."rol_kodu" IN ('IL_KOORDINATOR', 'PROJE_YONETICISI', 'OGRENCI', 'MEZUN', 'PAYDAS_TEMSILCISI')
  );

-- Profildeki işaret de tutarlı kalsın: ekranlar "görev alıyor mu" sorusunu yer
-- yer bu alandan okuyor ve rol ile işaretin ayrışması, aynı kişiyi bir ekranda
-- danışman öbüründe görevsiz gösterirdi.
UPDATE "ogretmen_profil" op
SET "danisman_olmak_istiyor" = true,
    "isaretleme_tarihi" = NOW()
FROM "kullanici_rol" r
WHERE r."kullanici_id" = op."kullanici_id"
  AND r."rol_kodu" = 'DANISMAN'
  AND r."bitis_tarihi" IS NULL
  AND op."danisman_olmak_istiyor" = false;
