-- Okul adı araması için trigram indeksi (15 Ağustos 2026).
--
-- İSTEK / GEREKÇE: Okullar ekranı (manisa-farklari-plani.md · Aşama 4) okul
-- adında arama yapıyor. `kurum` tablosunda bugün üç indeks var (kurum_kodu
-- birincil anahtar, il_kodu, ilce_kodu) ama `ad` üzerinde YOK.
--
-- NEDEN B-TREE DEĞİL TRIGRAM:
--   B-tree yalnızca baştan eşleşmeyi (`ad LIKE 'Akhisar%'`) hızlandırır.
--   Kullanıcı ortadan arıyor ("şeyh isa") ve bunun somut bir sebebi var: okul
--   adlarının başında ilçe adı duruyor ("Akhisar Şeyh İsa Anadolu Lisesi").
--   Baştan eşleşmeyle sınırlı bir arama pratikte İLÇE araması olurdu ve okulu
--   adıyla arayan kişi sonuç bulamazdı.
--
-- NEDEN ŞİMDİ: ekran yazılmadan önce. Sonraya bırakılsaydı ekran yazılır,
-- ulusal ölçekte yavaş olduğu fark edilir ve sorgu ikinci kez elden geçerdi.
--
-- gin_trgm_ops, ILIKE '%...%' sorgularını da kapsar (arama büyük/küçük harf
-- duyarsız yapılıyor).
--
-- IF NOT EXISTS: migration yeniden çalıştırılabilir kalsın.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "ix_kurum_ad_trgm"
  ON "kurum" USING gin ("ad" gin_trgm_ops);

-- İlçe adında da arama yapılıyor (aynı arama kutusu iki alana bakıyor,
-- bkz. lib/rapor/okul-eksikleri.ts · ortakKosul). İlçe tablosu küçük (~970
-- satır) ama aynı sorguda birleştiği için indekssiz kalması okul aramasını da
-- yavaşlatır.
CREATE INDEX IF NOT EXISTS "ix_ilce_ad_trgm"
  ON "ilce" USING gin ("ad" gin_trgm_ops);
