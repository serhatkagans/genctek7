-- Genelge 2/d: erişim kayıtlarının yalnızca tutulması değil, olağan dışı
-- örüntüler için düzenli olarak izlenmesi.

CREATE TYPE "ErisimAnomaliTuru" AS ENUM (
  'YUKSEK_HACIMLI_OGRENCI_ERISIMI',
  'MESAI_DISI_DISA_AKTARIM'
);

CREATE TABLE "erisim_anomalisi" (
  "id"                       SERIAL PRIMARY KEY,
  "kullanici_id"             INTEGER NOT NULL,
  "tur"                      "ErisimAnomaliTuru" NOT NULL,
  "gun"                      DATE NOT NULL,
  "log_sayisi"               INTEGER NOT NULL,
  "benzersiz_hedef_sayisi"   INTEGER NOT NULL,
  "ilk_erisim_tarihi"        TIMESTAMPTZ(6) NOT NULL,
  "son_erisim_tarihi"        TIMESTAMPTZ(6) NOT NULL,
  "olusturma_tarihi"         TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "bildirim_tarihi"          TIMESTAMPTZ(6),

  CONSTRAINT "erisim_anomalisi_kullanici_fkey"
    FOREIGN KEY ("kullanici_id") REFERENCES "kullanici"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "erisim_anomalisi_sayilar"
    CHECK ("log_sayisi" > 0 AND "benzersiz_hedef_sayisi" > 0),
  CONSTRAINT "erisim_anomalisi_zaman"
    CHECK ("son_erisim_tarihi" >= "ilk_erisim_tarihi"),
  CONSTRAINT "erisim_anomalisi_kullanici_tur_gun_key"
    UNIQUE ("kullanici_id", "tur", "gun")
);

CREATE INDEX "erisim_anomalisi_gun_tur_idx"
  ON "erisim_anomalisi" ("gun", "tur");
