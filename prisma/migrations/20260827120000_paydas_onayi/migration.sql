-- Paydaş kaydına merkez onayı (27 Ağustos 2026 · istek: "proje yöneticisi bu
-- listeden en son sütunda onay veya red versin").
--
-- Kaydı il koordinatörü açıyor, kararı merkez veriyor — etkinlik onayıyla aynı
-- desen ve aynı `OnayDurumu` enum'u.
ALTER TABLE "paydas"
  ADD COLUMN "onay_durumu" "OnayDurumu" NOT NULL DEFAULT 'BEKLIYOR',
  ADD COLUMN "onay_veren_kullanici_id" INTEGER,
  ADD COLUMN "onay_tarihi" TIMESTAMPTZ(6),
  ADD COLUMN "ret_gerekcesi" TEXT;

ALTER TABLE "paydas"
  ADD CONSTRAINT "paydas_onay_veren_kullanici_id_fkey"
  FOREIGN KEY ("onay_veren_kullanici_id") REFERENCES "kullanici"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "paydas_onay_durumu_idx" ON "paydas"("onay_durumu");

-- VAR OLAN KAYITLAR ONAYLI SAYILIR. Onay kuralı bugün geldi; dünkü kayıtları
-- toplu olarak "bekliyor"a düşürmek, kimsenin açmadığı bir kuyruk üretir ve
-- şimdiye kadar geçerli sayılan iş birliklerini geriye dönük askıya alırdı.
-- Karar tarihi ve kararı veren BOŞ bırakılıyor: kimse karar vermedi, kayıt
-- yalnızca kuralın öncesinden geliyor.
UPDATE "paydas" SET "onay_durumu" = 'ONAYLANDI';
