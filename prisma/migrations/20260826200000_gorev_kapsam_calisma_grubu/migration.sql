-- Çalışma Grubu Yöneticisi görevi VERİTABANINA YAZILAMIYORDU.
--
-- BULGU (26 Ağustos 2026): öğrenciler listesine "Çalışma grubu temsilcisi yap"
-- kutusu eklenince ilk denemede 23514 döndü —
-- `new row for relation "ogrenci_gorev_rolu" violates check constraint
-- "ck_ogrenci_gorev_kapsam"`.
--
-- SEBEP: kısıt üç rol sayıyor (İl / İlçe / Okul Temsilcisi) ve her biri için
-- kendi kapsam sütununu zorunlu kılıyor. `CALISMA_GRUBU_YONETICISI` enum'a ve
-- uygulama katmanına 7 Ağustos'ta eklendi, `calisma_grubu_id` sütunu da açıldı
-- ama kısıt güncellenmedi. Kısıt sayılmayan her rolü reddettiği için bu görev
-- bugüne kadar HİÇ atanamadı; yerel veritabanında kayıt sayısı sıfır.
--
-- Bu, 31 Temmuz 2026'da ILCE_TEMSILCISI ile yaşananın birebir tekrarı
-- (bkz. 20260731170000_ogrenci_paneli_ilce_baglanti_kazanim · aynı kısıt).
-- Oradaki not "sayılmayan bir rol kodu eklenirse kısıt onu reddeder ve eksiklik
-- ilk denemede görülür" diyordu; öyle de oldu — yalnızca ilk deneme on dokuz
-- gün sonraya kaldı, çünkü ekranda o görevi veren bir düğme yoktu.
--
-- KAPSAM BİR YER DEĞİL, BİR GRUP: diğer üç rolün kapsamı öğrencinin ilinden,
-- ilçesinden ya da okulundan türüyor; bu rolünki formdan seçilen çalışma
-- grubudur (bkz. ogrenciler/page.tsx · CalismaGrubuTemsilciligi).
ALTER TABLE "ogrenci_gorev_rolu" DROP CONSTRAINT IF EXISTS "ck_ogrenci_gorev_kapsam";
ALTER TABLE "ogrenci_gorev_rolu" ADD CONSTRAINT "ck_ogrenci_gorev_kapsam"
  CHECK (
    ("rol_kodu" = 'IL_TEMSILCISI' AND "il_kodu" IS NOT NULL)
    OR ("rol_kodu" = 'ILCE_TEMSILCISI' AND "ilce_kodu" IS NOT NULL)
    OR ("rol_kodu" = 'OKUL_TEMSILCISI' AND "kurum_kodu" IS NOT NULL)
    OR ("rol_kodu" = 'CALISMA_GRUBU_YONETICISI' AND "calisma_grubu_id" IS NOT NULL)
  );

-- Dönem başına GRUP başına tek temsilci — il, ilçe ve okulda olduğu gibi.
-- Uygulama katmanı bu kuralı zaten kontrol ediyor ve dolu grupta "zaten X
-- üzerinde" diyor (bkz. gorev-rolleri/eylemler.ts); indeks o kontrolün
-- yarıştığı anda da tutmasını sağlıyor. İl koordinatörlerine 26 Ağustos'ta
-- atama yetkisi verildiği için iki ilin aynı grubu aynı anda doldurması artık
-- kuramsal bir ihtimal değil.
CREATE UNIQUE INDEX IF NOT EXISTS "ux_calisma_grubu_yoneticisi"
  ON "ogrenci_gorev_rolu" ("calisma_grubu_id", "egitim_ogretim_yili")
  WHERE "rol_kodu" = 'CALISMA_GRUBU_YONETICISI';
