-- GENELGE 4/ç: aydınlatma metninin YANI SIRA İLGİLİ KİŞİ BAŞVURU FORMU da
-- platformda bulunmalı.
--
-- Aydınlatma ve açık rıza metinleri vardı (lib/kvkk/kurallar.ts); başvuru
-- formu yoktu ve aydınlatma metninin 7. maddesi işi sistemin dışına atıyordu:
-- "Diğer talepleriniz için okul idareniz aracılığıyla Bakanlığa
-- başvurabilirsiniz."
--
-- Bu cümlenin iki ayrı sorunu var. Birincisi kanunîdir: KVKK m.13, başvurunun
-- VERİ SORUMLUSUNA yapılmasını düzenler ve okul idaresi burada veri sorumlusu
-- değildir — YEĞİTEK'tir. İkincisi işleyişe aittir: kâğıt üstünde okul
-- idaresine yapılan bir başvurunun ne kaydı tutulur ne de otuz günlük süresi
-- işler. Kanunun aradığı şey başvurunun yapılabilmesi değil, süresinde
-- SONUÇLANDIRILMASIDIR; bu da ancak başvuru kayda geçerse denetlenebilir.
--
-- ===========================================================================
-- NİYE YENİ TABLO, `kullanici_onayi`na SÜTUN DEĞİL
-- ===========================================================================
-- İki kayıt zıt yönlere bakıyor. Onay, kişinin BİZE verdiği iradedir ve belge
-- başına tek satırdır (yeniden onay tarihi günceller). Başvuru, kişinin
-- BİZDEN istediği şeydir ve her biri ayrı bir taleptir: aynı kişi bir yıl
-- arayla iki kez silme isteyebilir, ikisinin de ayrı cevabı gerekir.

CREATE TYPE "KvkkTalepKonusu" AS ENUM (
  'ISLENIYOR_MU',
  'BILGI_TALEBI',
  'AMACA_UYGUNLUK',
  'UCUNCU_KISILER',
  'DUZELTME',
  'SILME',
  'UCUNCU_KISIYE_BILDIRIM',
  'OTOMATIK_ANALIZE_ITIRAZ',
  'ZARARIN_GIDERILMESI',
  'ACIK_RIZA_GERI_ALMA'
);

CREATE TYPE "KvkkBasvuruDurumu" AS ENUM (
  'ALINDI',
  'INCELENIYOR',
  'KABUL',
  'KISMEN_KABUL',
  'RET'
);

CREATE TABLE "kvkk_basvurusu" (
  "id"                      SERIAL PRIMARY KEY,
  "basvuran_kullanici_id"   INTEGER NOT NULL,
  "aciklama"                TEXT NOT NULL,
  "yanit_adresi"            VARCHAR(150),
  "durum"                   "KvkkBasvuruDurumu" NOT NULL DEFAULT 'ALINDI',
  "olusturma_tarihi"        TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "yanitlayan_kullanici_id" INTEGER,
  "yanit_tarihi"            TIMESTAMPTZ(6),
  "yanit_metni"             TEXT,

  -- BAŞVURAN SİLİNEMEZ (RESTRICT): başvurunun kimden geldiği, cevabın kendisi
  -- kadar gerekli. Kullanıcı zaten silinmiyor, pasife alınıyor
  -- (bkz. lib/auth/mock-kullanicilar.ts) — kısıt o kuralın veritabanındaki
  -- karşılığı.
  CONSTRAINT "kvkk_basvurusu_basvuran_fkey"
    FOREIGN KEY ("basvuran_kullanici_id") REFERENCES "kullanici"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "kvkk_basvurusu_yanitlayan_fkey"
    FOREIGN KEY ("yanitlayan_kullanici_id") REFERENCES "kullanici"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,

  -- SONUÇLANMIŞ BAŞVURU CEVAPSIZ OLAMAZ. Gerekçesiz ret Kanun'un 13.
  -- maddesine aykırıdır ve kabul de bir cevaptır: "ne yapıldı" yazılmadan
  -- kapanan başvuru, denetimde kapanmamış sayılır. Kısıt uygulamada da
  -- kontrol ediliyor (lib/kvkk/basvuru-kurallar.ts); buradaki, o kontrolün
  -- unutulduğu bir çağrıya karşı son settir.
  CONSTRAINT "ck_kvkk_basvurusu_yanit" CHECK (
    ("durum" IN ('ALINDI', 'INCELENIYOR')
      AND "yanit_metni" IS NULL
      AND "yanit_tarihi" IS NULL
      AND "yanitlayan_kullanici_id" IS NULL)
    OR
    ("durum" IN ('KABUL', 'KISMEN_KABUL', 'RET')
      AND "yanit_metni" IS NOT NULL
      AND btrim("yanit_metni") <> ''
      AND "yanit_tarihi" IS NOT NULL
      AND "yanitlayan_kullanici_id" IS NOT NULL)
  )
);

-- Merkezin ekranı "önce bekleyenler, en eski üstte" diye okuyor: süre en çok
-- işlemiş başvuru en acil olandır.
CREATE INDEX "kvkk_basvurusu_durum_olusturma_idx"
  ON "kvkk_basvurusu" ("durum", "olusturma_tarihi");

CREATE INDEX "kvkk_basvurusu_basvuran_idx"
  ON "kvkk_basvurusu" ("basvuran_kullanici_id", "olusturma_tarihi");

-- Talep konuları AYRI TABLO, dizi sütunu değil: "bu dönem kaç silme talebi
-- geldi" KVKK envanterinin olağan sorusudur ve dizi sütunuyla sorulamaz.
CREATE TABLE "kvkk_basvuru_konusu" (
  "basvuru_id" INTEGER NOT NULL,
  "konu"       "KvkkTalepKonusu" NOT NULL,

  CONSTRAINT "kvkk_basvuru_konusu_pkey" PRIMARY KEY ("basvuru_id", "konu"),
  -- Başvuru silinirse konuları da düşer: sahibi olmayan konu satırının
  -- anlattığı bir talep kalmaz.
  CONSTRAINT "kvkk_basvuru_konusu_basvuru_fkey"
    FOREIGN KEY ("basvuru_id") REFERENCES "kvkk_basvurusu"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "kvkk_basvuru_konusu_konu_idx" ON "kvkk_basvuru_konusu" ("konu");

-- ===========================================================================
-- BİLDİRİM ŞABLONLARI
-- ===========================================================================
-- Başvurunun otuz günlük süresi var; merkezin ekrana kendiliğinden uğramasını
-- beklemek, süreyi tesadüfe bağlamak olurdu. Cevap tarafı da aynı: ilgili kişi
-- panele ne zaman gireceğini bilmiyor, oysa cevabın ona ULAŞMASI gerekiyor
-- (bildirim, kişinin kayıtlı adresine e-posta kopyası olarak da gidiyor).

INSERT INTO "bildirim_sablonu" ("kod", "konu", "govde_sablonu")
VALUES (
  'KVKK_BASVURUSU_ALINDI',
  'Yeni KVKK başvurusu: {{basvuranAdSoyad}}',
  'Merhaba,' || chr(10) || chr(10) ||
  '{{basvuranAdSoyad}}, kişisel verileriyle ilgili bir başvuru yaptı.' || chr(10) || chr(10) ||
  'Talep konusu: {{konular}}' || chr(10) || chr(10) ||
  'Başvuru, Yönetim Paneli''ndeki KVKK Başvuruları ekranından yanıtlanır. Kanunî yanıt süresi en geç {{sonTarih}} tarihinde dolar.' || chr(10) || chr(10) ||
  'GençTek'
)
ON CONFLICT ("kod") DO NOTHING;

INSERT INTO "bildirim_sablonu" ("kod", "konu", "govde_sablonu")
VALUES (
  'KVKK_BASVURUSU_YANITLANDI',
  'KVKK başvurunuz yanıtlandı',
  'Merhaba,' || chr(10) || chr(10) ||
  '{{tarih}} tarihli kişisel veri başvurunuz sonuçlandı.' || chr(10) || chr(10) ||
  'Sonuç: {{sonuc}}' || chr(10) || chr(10) ||
  '{{yanit}}' || chr(10) || chr(10) ||
  'Başvurunuzun tamamını ve bu yanıtı Kişisel Verilerim ekranından görebilirsiniz. Sonucu yeterli bulmazsanız Kişisel Verileri Koruma Kurulu''na şikâyette bulunma hakkınız saklıdır.' || chr(10) || chr(10) ||
  'GençTek'
)
ON CONFLICT ("kod") DO NOTHING;
