-- Ekiplere tür, okul bağı ve danışman öğretmen (15 Ağustos 2026).
--
-- İSTEK / GEREKÇE: manisa-farklari-plani.md · Aşama 5. Ekip listesi 100 kaydı
-- aşınca "hangi okulun takımı" ile "ilin çalışma grubu" ayırt edilemez hâle
-- geliyordu; ayrıca danışmansız kalan ekipleri gösterecek bir alan yoktu.

CREATE TYPE "EkipTuru" AS ENUM ('OKUL_TAKIMI', 'CALISMA_GRUBU', 'IL_GENCTEK_EKIBI');

-- VARSAYILAN 'CALISMA_GRUBU' VE VERİ DÜZELTMESİ YOK: mevcut ekiplerin tamamı
-- il seviyesinde kurulmuştu (kurum bağı olmadan), yani varsayılan onlar için
-- ZATEN DOĞRU. Toplu bir UPDATE yazılsaydı, doğru olan kayıtları "düzeltmiş"
-- olurduk.
ALTER TABLE "ekip"
  ADD COLUMN "tur" "EkipTuru" NOT NULL DEFAULT 'CALISMA_GRUBU',
  ADD COLUMN "kurum_kodu" INTEGER,
  ADD COLUMN "danisman_kullanici_id" INTEGER;

ALTER TABLE "ekip"
  ADD CONSTRAINT "ekip_kurum_kodu_fkey"
    FOREIGN KEY ("kurum_kodu") REFERENCES "kurum"("kurum_kodu")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ekip_danisman_kullanici_id_fkey"
    FOREIGN KEY ("danisman_kullanici_id") REFERENCES "kullanici"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- KAPSAM SÜTUNU TÜRÜNE GÖRE ZORUNLU — `ck_ogrenci_gorev_kapsam` ile aynı desen.
--
-- Okul takımı okulsuz olamaz: "hangi okulun takımı" sorusu cevapsız kalırsa
-- ekip listede tür rozeti taşır ama hangi okula ait olduğu bilinmez. Diğer iki
-- tür ise il seviyesinde; onlarda kurum kodu DOLU OLMAMALI, yoksa okul takımı
-- olmayan bir kayıt okul süzgecine düşerdi.
ALTER TABLE "ekip"
  ADD CONSTRAINT "ck_ekip_okul_takimi_kurum" CHECK (
    ("tur" = 'OKUL_TAKIMI' AND "kurum_kodu" IS NOT NULL)
    OR ("tur" <> 'OKUL_TAKIMI' AND "kurum_kodu" IS NULL)
  );

-- Danışman sütununa kısıt YOK: danışmansız ekip aranan şeyin ta kendisi
-- (bkz. ekip-yonetimi ekranı · ?danismansiz=1). Zorunlu yapılsaydı o liste
-- hiçbir zaman dolmazdı.

CREATE INDEX "ekip_kurum_kodu_idx" ON "ekip"("kurum_kodu");
CREATE INDEX "ekip_danisman_kullanici_id_idx" ON "ekip"("danisman_kullanici_id");
