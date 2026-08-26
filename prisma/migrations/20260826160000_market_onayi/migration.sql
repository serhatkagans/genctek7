-- Market vitrinine çıkış onaya bağlandı.
--
-- İstek (26 Ağustos 2026): "markette paylaşılmadı yerine onay bekliyor yazsın
-- ve proje yöneticisine gitsin onaya, öğretmen için de."
--
-- `markette_paylasilsin` kişinin TERCİHİ, bu sütun MERKEZİN KARARI; ikisi ayrı
-- tutuluyor. Paylaşımı kapatan kişi kararı silmiş olmuyor.
--
-- VARSAYILAN 'ONAY_GEREKMEZ': sütun eklenmeden önce paylaşılmış ürünler
-- vitrindeydi. Geriye dönük onaya sokmak, kimseye haber vermeden marketi
-- boşaltmak olurdu. Yeni paylaşımlar uygulama katmanında 'BEKLIYOR' açılıyor.
ALTER TABLE "kullanici_kazanim"
  ADD COLUMN IF NOT EXISTS "market_onay_durumu" "OnayDurumu" NOT NULL DEFAULT 'ONAY_GEREKMEZ',
  ADD COLUMN IF NOT EXISTS "market_karar_veren_kullanici_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "market_karar_tarihi" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "market_ret_gerekcesi" TEXT;

ALTER TABLE "kullanici_kazanim"
  DROP CONSTRAINT IF EXISTS "kullanici_kazanim_market_karar_veren_fkey";
ALTER TABLE "kullanici_kazanim"
  ADD CONSTRAINT "kullanici_kazanim_market_karar_veren_fkey"
  FOREIGN KEY ("market_karar_veren_kullanici_id") REFERENCES "kullanici"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Onay kuyruğu "bekleyenler" diye sorguluyor.
CREATE INDEX IF NOT EXISTS "kullanici_kazanim_market_onay_durumu_idx"
  ON "kullanici_kazanim"("market_onay_durumu");
