-- Doğrudan yazışmanın kayıt durumu: ONAY_GEREKMEZ.
--
-- 21 Ağustos 2026'da okul içi ve okul temsilcileriyle onay beklemeden yazışma
-- açıldı, ama kayıt `ONAYLANDI` olarak, karar veren boş bırakılarak yazılıyordu.
-- `ck_baglanti_istegi_karari` bunu reddediyor ("karar verilmişse kim ve ne zaman
-- verdiği yazılı olmalı") ve mesaj gönderme İLK GÜNDEN BERİ hata veriyordu:
--   23514 · new row for relation "baglanti_istegi" violates check constraint
--
-- Kısıt DOĞRUYDU, kayıt yanlıştı: doğrudan yazışmada bir karar yok. Enumda bu
-- durumun karşılığı zaten var (ONAY_GEREKMEZ) ve kısıt onu da bekleyen gibi
-- muaf tutar. GERÇEK KARARLAR (ONAYLANDI / REDDEDILDI) hâlâ kim ve ne zaman
-- bilgisini zorunlu tutuyor — asıl korunmak istenen buydu.
ALTER TABLE "baglanti_istegi" DROP CONSTRAINT IF EXISTS "ck_baglanti_istegi_karari";
ALTER TABLE "baglanti_istegi" ADD CONSTRAINT "ck_baglanti_istegi_karari"
  CHECK (
    "onay_durumu" IN ('BEKLIYOR', 'ONAY_GEREKMEZ')
    OR ("karar_veren_kullanici_id" IS NOT NULL AND "karar_tarihi" IS NOT NULL)
  );
