-- REFERANSLARIM (28 Ağustos 2026 · istek: "Öğrenciler için profile referanslar
-- bölümü ekleyelim. Referans için ad soyad telefon kurum eposta").
--
-- Öğrencinin, kendisi hakkında görüşüne başvurulabilecek kişileri yazdığı
-- liste — bir CV'nin "referanslar" bölümünün karşılığı.
--
-- ===========================================================================
-- SATIRIN İÇİ ÜÇÜNCÜ BİR KİŞİNİN KİŞİSEL VERİSİ
-- ===========================================================================
-- Telefon ve e-posta öğrencinin değil, referans gösterilen KİŞİNİN bilgisi ve
-- o kişinin sistemde kaydı olmayabilir. Kayıt bu yüzden `kullanici_hedefi`
-- gibi KİŞİYE ÖZEL: yalnızca sahibi görüyor, yalnızca kendi ürettiği
-- özgeçmişe giriyor. Danışman/koordinatör/merkez ekranlarında görünmüyor —
-- görünseydi sistem, izni alınmamış üçüncü kişilerin iletişim bilgilerinden
-- oluşan ve il çapında süzülebilen bir rehbere dönüşürdü.
--
-- `ogrenci_profil`e SÜTUN OLARAK EKLENMEDİ: referans birden çok olabiliyor ve
-- dört alan taşıyor; profil satırına `referans1_ad`, `referans2_ad` diye
-- açılsaydı sayı koda gömülür, bir tanesinin silinmesi de sütun kaydırmaya
-- dönerdi.

CREATE TABLE "kullanici_referansi" (
  "id" SERIAL NOT NULL,
  "kullanici_id" INTEGER NOT NULL,
  "ad_soyad" VARCHAR(150) NOT NULL,
  "kurum" VARCHAR(200),
  "telefon" VARCHAR(20),
  "eposta" VARCHAR(150),
  "olusturma_tarihi" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "kullanici_referansi_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "kullanici_referansi_kullanici_id_idx"
  ON "kullanici_referansi"("kullanici_id");

-- Kullanıcı silinince referansları da gider: sahibi olmayan bir referans
-- satırı, kimsenin göremeyeceği bir üçüncü kişi iletişim bilgisi olurdu.
ALTER TABLE "kullanici_referansi"
  ADD CONSTRAINT "kullanici_referansi_kullanici_id_fkey"
  FOREIGN KEY ("kullanici_id") REFERENCES "kullanici"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ULAŞILAMAYAN REFERANS KAYDEDİLEMEZ: telefon ile e-postadan en az biri dolu
-- olmalı. Kısıt uygulama katmanında da var (lib/referans/kurallar.ts); burada
-- ikinci kez duruyor çünkü aynı tabloya ileride başka bir ekrandan da yazılabilir
-- ve o ekranda kural unutulabilir (emsali: ck_mentorluk_ret_gerekcesi).
ALTER TABLE "kullanici_referansi"
  ADD CONSTRAINT "ck_referans_iletisim"
  CHECK (
    ("telefon" IS NOT NULL AND btrim("telefon") <> '')
    OR ("eposta" IS NOT NULL AND btrim("eposta") <> '')
  );
