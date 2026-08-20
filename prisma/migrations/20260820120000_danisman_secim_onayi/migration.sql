-- Danışman DEĞİŞİKLİĞİ artık onaydan geçiyor (20 Ağustos 2026).
--
-- İSTEK:
--   "danışman öğretmen seçiminde öğretmene veya il koordinatörüne onay düşsün
--    sürekli değişmek isteyebilirler"
--
-- ===========================================================================
-- NEDEN AYRI TABLO, danisman_atama'ya SÜTUN DEĞİL
-- ===========================================================================
-- `danisman_atama` bir GEÇMİŞ tablosudur: her satırı gerçekten kurulmuş bir
-- bağı anlatır ve üstünde Değişmez 2'yi koruyan kısmi tekillik duruyor
-- (`ux_danisman_atama_tek_aktif` — bitiş tarihi boş tek satır).
--
-- Bekleyen bir istek henüz bir bağ değildir. Oraya "durum = BEKLIYOR" diye
-- yazılsaydı iki kötü seçenekten biri gerekirdi:
--   · kısıtı gevşetmek — o zaman iki aktif danışman satırı mümkün olurdu, ki
--     tabloyu okuyan her sorgu ("öğrencinin danışmanı kim") ikircikli hâle
--     gelirdi;
--   · ya da eski atamayı istek anında kapatmak — o zaman öğrenci onay
--     beklerken danışmansız kalırdı ve korumaya çalıştığımız şeyin kendisi
--     bozulurdu.
--
-- Ayrı tablo ikisini de yaşatıyor: öğrencinin danışmanı talep boyunca
-- DEĞİŞMEZ, onay gelince atama tek işlemde devrolur.
--
-- ===========================================================================
-- ÖĞRENCİ BAŞINA TEK BEKLEYEN TALEP
-- ===========================================================================
-- Kısmi tekillik `ux_danisman_talebi_tek_bekleyen` ile. Sınır olmasaydı
-- öğrenci okuldaki her öğretmene aynı anda istek gönderebilir ve ilk onaylayan
-- danışman olurdu — bu, isteğin çözmeye çalıştığı "sürekli değişme" sorununu
-- büyüterek geri getirirdi. Karara bağlanmış (onaylanmış, reddedilmiş, geri
-- çekilmiş) talepler kısıt dışıdır: öğrenci reddedildikten sonra başka birini
-- isteyebilmeli.
--
-- ===========================================================================
-- İLK SEÇİM ONAYA GİRMEZ
-- ===========================================================================
-- Bu kural veritabanında değil, uygulama katmanında (lib/danisman/talep.ts):
-- hiç danışmanı olmayan öğrencinin seçimi doğrudan atanır. Onay beklerken
-- danışmansız bekleyen öğrenci, Değişmez 2'nin ihlali olurdu ve isteğin
-- gerekçesi de ("sürekli değişmek isteyebilirler") ilk seçimi kapsamıyor.

CREATE TYPE "DanismanTalebiDurumu" AS ENUM (
  'BEKLIYOR',
  'ONAYLANDI',
  'REDDEDILDI',
  'GERI_CEKILDI'
);

CREATE TABLE "danisman_talebi" (
  "id"                  SERIAL PRIMARY KEY,
  "ogrenci_id"          INTEGER NOT NULL,
  "istenen_danisman_id" INTEGER NOT NULL,
  -- Talep anındaki danışman. Karar anında yeniden SORULMAZ: onay gecikirse
  -- aradaki bir devir (öğretmen ayrıldı, koordinatör devraldı) sessizce yanlış
  -- kişiyi "bırakılan" gösterirdi ve ona giden bildirim yanlış adrese düşerdi.
  "onceki_danisman_id"  INTEGER,
  "durum"               "DanismanTalebiDurumu" NOT NULL DEFAULT 'BEKLIYOR',
  -- Reddederken zorunlu (uygulama katmanı); gerekçesiz ret, öğrenciye ne
  -- yapacağını söylemeden kapıyı kapatmak olurdu. Emsali `talep.ret_gerekcesi`.
  "ret_gerekcesi"       VARCHAR(500),
  "olusturma_tarihi"    TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "karar_tarihi"        TIMESTAMPTZ(6),
  "karar_veren_id"      INTEGER,

  CONSTRAINT "danisman_talebi_ogrenci_id_fkey"
    FOREIGN KEY ("ogrenci_id") REFERENCES "kullanici" ("id"),
  CONSTRAINT "danisman_talebi_istenen_danisman_id_fkey"
    FOREIGN KEY ("istenen_danisman_id") REFERENCES "kullanici" ("id"),
  CONSTRAINT "danisman_talebi_karar_veren_id_fkey"
    FOREIGN KEY ("karar_veren_id") REFERENCES "kullanici" ("id"),
  CONSTRAINT "danisman_talebi_onceki_danisman_id_fkey"
    FOREIGN KEY ("onceki_danisman_id") REFERENCES "kullanici" ("id")
);

-- Öğretmenin onay kuyruğu: "bana gelen bekleyenler".
CREATE INDEX "danisman_talebi_istenen_danisman_id_durum_idx"
  ON "danisman_talebi" ("istenen_danisman_id", "durum");

-- Öğrencinin kendi ekranı: "bekleyen talebim var mı".
CREATE INDEX "danisman_talebi_ogrenci_id_durum_idx"
  ON "danisman_talebi" ("ogrenci_id", "durum");

-- Öğrenci başına tek BEKLEYEN talep (yukarıdaki gerekçe).
CREATE UNIQUE INDEX "ux_danisman_talebi_tek_bekleyen"
  ON "danisman_talebi" ("ogrenci_id")
  WHERE "durum" = 'BEKLIYOR';
