-- ÖĞRENCİ MENTÖRLÜĞÜNÜN KALDIRILMASI ARTIK ONAYA TABİ (28 Ağustos 2026).
--
-- İSTEK: "Mentör olarak atanan öğrencinin danışman öğretmeni, il koordinatörü
-- ve proje yöneticisi iptal edebilsin, hiyerarşi olsun: öğretmeninkini
-- koordinatör ve proje yöneticisi, koordinatörünkini de proje yöneticisi
-- onaylasın, proje yöneticisine onay yok".
--
-- ===========================================================================
-- NİYE YENİ TABLO, `mentorluk`a SÜTUN DEĞİL
-- ===========================================================================
-- Talep süresince mentörlük DURUMU değişmiyor: öğrenci karar çıkana kadar
-- mentör kalıyor. Alanlar `mentorluk` satırına konsaydı kaldırılmış bir
-- mentörlükte "kim istedi" ile "kim kaldırdı" aynı satırda birbirine karışır,
-- reddedilen bir talebin gerekçesi de mentörlüğün ret gerekçesi sanılırdı.
--
-- ÖĞRENCİ BAŞINA TEK SATIR (birincil anahtar `mentorluk`a bakıyor): talep bir
-- DURUMDUR, geçmiş tablosu değil — `mentorluk` tablosunun kendi gerekçesiyle
-- aynı desen. Yeni talep aynı satırı BEKLIYOR'a döndürür.
--
-- `OnayDurumu` PAYLAŞILDI (paydas_onayi ve faaliyet onayıyla aynı enum):
-- talebin hâlleri birebir aynı ve `ONAY_GEREKMEZ` değeri burada hiç
-- yazılmıyor — proje yöneticisinin kaldırması bu tabloya satır AÇMIYOR.

CREATE TYPE "MentorlukKaldirmaDuzeyi" AS ENUM ('DANISMAN', 'IL_KOORDINATOR');

CREATE TABLE "mentorluk_kaldirma_talebi" (
  "kullanici_id" INTEGER NOT NULL,
  "durum" "OnayDurumu" NOT NULL DEFAULT 'BEKLIYOR',
  "isteyen_kullanici_id" INTEGER NOT NULL,
  "isteyen_duzeyi" "MentorlukKaldirmaDuzeyi" NOT NULL,
  "gerekce" TEXT NOT NULL,
  "istek_tarihi" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "karar_veren_kullanici_id" INTEGER,
  "karar_tarihi" TIMESTAMPTZ(6),
  "ret_gerekcesi" TEXT,

  CONSTRAINT "mentorluk_kaldirma_talebi_pkey" PRIMARY KEY ("kullanici_id")
);

CREATE INDEX "mentorluk_kaldirma_talebi_durum_idx"
  ON "mentorluk_kaldirma_talebi"("durum");

-- Mentörlük kaydı silinince talep de düşer: sahibi olmayan bir kaldırma
-- talebinin karara bağlanacak bir şeyi kalmaz.
ALTER TABLE "mentorluk_kaldirma_talebi"
  ADD CONSTRAINT "mentorluk_kaldirma_talebi_kullanici_id_fkey"
  FOREIGN KEY ("kullanici_id") REFERENCES "mentorluk"("kullanici_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- İSTEYEN SİLİNEMEZ (RESTRICT): talebin kimden geldiği, kararın kendisi kadar
-- gerekli bir bilgi. Karar veren ise SET NULL olabilirdi ama aynı sebeple
-- RESTRICT tutuluyor — ikisi de denetim izidir.
ALTER TABLE "mentorluk_kaldirma_talebi"
  ADD CONSTRAINT "mentorluk_kaldirma_talebi_isteyen_kullanici_id_fkey"
  FOREIGN KEY ("isteyen_kullanici_id") REFERENCES "kullanici"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "mentorluk_kaldirma_talebi"
  ADD CONSTRAINT "mentorluk_kaldirma_talebi_karar_veren_kullanici_id_fkey"
  FOREIGN KEY ("karar_veren_kullanici_id") REFERENCES "kullanici"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===========================================================================
-- BİLDİRİM ŞABLONLARI
-- ===========================================================================
-- Talep sessiz kalamaz: onayı bekleyen kişi ekrana kendiliğinden uğramazsa
-- öğrencinin mentörlüğü belirsiz bir süre askıda kalır (aynı bulgu:
-- 20260813190000_mentorluk_bildirimleri).
--
-- ÖĞRENCİYE TALEP AŞAMASINDA BİLDİRİM GİTMEZ. Henüz kaldırılmış bir şey yok;
-- reddedilebilecek bir talep için "mentörlüğünüz kaldırılıyor" demek, sonucu
-- olmayan bir kaygı üretirdi. Karar ONAYLANDIĞINDA öğrenciye zaten var olan
-- MENTORLUK_KARARI bildirimi gidiyor.

INSERT INTO "bildirim_sablonu" ("kod", "konu", "govde_sablonu")
VALUES (
  'MENTORLUK_KALDIRMA_TALEBI',
  'Onayınızı bekleyen mentörlük kaldırma talebi: {{ogrenciAdSoyad}}',
  'Merhaba,' || chr(10) || chr(10) ||
  '{{isteyenAdSoyad}} ({{isteyenGorevi}}), {{ogrenciAdSoyad}} adlı öğrencinin mentörlüğünün kaldırılmasını istedi.' || chr(10) || chr(10) ||
  'Gerekçe: {{gerekce}}' || chr(10) || chr(10) ||
  'Öğrenci, siz karar verene kadar mentör olarak kalır. Talebi Öğrenciler ekranındaki Mentörlük sütunundan onaylayabilir ya da gerekçesiyle reddedebilirsiniz.' || chr(10) || chr(10) ||
  'GençTek'
)
ON CONFLICT ("kod") DO NOTHING;

INSERT INTO "bildirim_sablonu" ("kod", "konu", "govde_sablonu")
VALUES (
  'MENTORLUK_KALDIRMA_KARARI',
  'Mentörlük kaldırma talebiniz {{sonuc}}: {{ogrenciAdSoyad}}',
  'Merhaba,' || chr(10) || chr(10) ||
  '{{ogrenciAdSoyad}} adlı öğrencinin mentörlüğünün kaldırılması yönündeki talebiniz {{kararVerenAdSoyad}} tarafından {{sonuc}}.' || chr(10) || chr(10) ||
  'Gerekçe: {{gerekce}}' || chr(10) || chr(10) ||
  'GençTek'
)
ON CONFLICT ("kod") DO NOTHING;
