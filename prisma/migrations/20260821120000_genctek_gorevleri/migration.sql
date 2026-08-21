-- GENÇTEK GÖREVLERİ (21 Ağustos 2026)
--
-- İSTEK: "Panoda yeni kart GençTek Görevlerim isminde kart olsun, içinde
-- başvur butonları olacak, mesela eba asistan test ekibi, senaryoyu yapacak
-- oyun ekibi, tekno girişim değerlendirme ekibi; yönetim panelinde yeni kart
-- gençtek görevlerini görebilsin" · "daha başka görevler de olacak şimdilik
-- 3 tane".
--
-- ===========================================================================
-- NEDEN YENİ TABLO
-- ===========================================================================
-- Görev ilanı bir FAALİYET değil: faaliyetin tarihi, başvuru penceresi,
-- kapsamı, yoklaması ve belgesi var; görev ilanı açık kaldığı sürece
-- başvurulabilen bir çağrıdır. Faaliyet tablosuna sığdırılsaydı yarım düzine
-- zorunlu alan anlamsız değerlerle doldurulurdu.
--
-- Görevler KODA GÖMÜLMEDİ: "daha başka görevler de olacak" cümlesi, yeni görev
-- açmanın sürüm çıkmayı gerektirmemesi demek. İlk üç görev aşağıda
-- oluşturuluyor; sonrakiler Yönetim Paneli'ndeki karttan.
--
-- ===========================================================================
-- KİŞİ BAŞINA GÖREV BAŞINA TEK BAŞVURU
-- ===========================================================================
-- `genctek_gorev_basvurusu_gorev_id_kullanici_id_key` reddedilen kişinin yeniden başvurmasını
-- engellemez: uygulama katmanı aynı satırı BEKLIYOR'a döndürüyor (aynı desen
-- mentörlükte de var). Engellediği şey, aynı kişinin aynı göreve on ayrı
-- başvuruyla kuyruğu doldurması ve "bu kişinin durumu ne" sorusunun tek
-- cevabının kalmaması.

CREATE TABLE "genctek_gorevi" (
  "id" SERIAL PRIMARY KEY,
  "ad" VARCHAR(200) NOT NULL,
  "aciklama" TEXT NOT NULL,
  -- NULL = sınır yok. Sıfır değil: sıfır "kimse alınmayacak" demek olurdu.
  "kontenjan" INTEGER,
  "sira_no" INTEGER NOT NULL DEFAULT 0,
  -- Kapatılan görev SİLİNMEZ; başvuruları ve kararları kayıttır.
  "aktif" BOOLEAN NOT NULL DEFAULT TRUE,
  "olusturma_tarihi" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "genctek_gorevi_aktif_sira_no_idx"
  ON "genctek_gorevi" ("aktif", "sira_no");

CREATE TABLE "genctek_gorev_basvurusu" (
  "id" SERIAL PRIMARY KEY,
  "gorev_id" INTEGER NOT NULL,
  "kullanici_id" INTEGER NOT NULL,
  "mesaj" TEXT NOT NULL,
  "onay_durumu" "OnayDurumu" NOT NULL DEFAULT 'BEKLIYOR',
  "karar_veren_kullanici_id" INTEGER,
  "karar_tarihi" TIMESTAMPTZ(6),
  "ret_gerekcesi" TEXT,
  "olusturma_tarihi" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "genctek_gorev_basvurusu_gorev_id_fkey"
    FOREIGN KEY ("gorev_id") REFERENCES "genctek_gorevi" ("id") ON DELETE CASCADE,
  CONSTRAINT "genctek_gorev_basvurusu_kullanici_id_fkey"
    FOREIGN KEY ("kullanici_id") REFERENCES "kullanici" ("id") ON DELETE CASCADE,
  CONSTRAINT "genctek_gorev_basvurusu_karar_veren_fkey"
    FOREIGN KEY ("karar_veren_kullanici_id") REFERENCES "kullanici" ("id")
);

CREATE UNIQUE INDEX "genctek_gorev_basvurusu_gorev_id_kullanici_id_key"
  ON "genctek_gorev_basvurusu" ("gorev_id", "kullanici_id");
CREATE INDEX "genctek_gorev_basvurusu_onay_durumu_idx"
  ON "genctek_gorev_basvurusu" ("onay_durumu");
CREATE INDEX "genctek_gorev_basvurusu_kullanici_id_idx"
  ON "genctek_gorev_basvurusu" ("kullanici_id");

-- ---------------------------------------------------------------------------
-- İLK ÜÇ GÖREV (istekte adları geçenler)
-- ---------------------------------------------------------------------------
-- Açıklamalar kısa tutuldu: metin merkezin işidir ve Yönetim Paneli'nden
-- düzenlenebiliyor. Boş bırakılsalardı panoda başlıktan başka bir şey
-- yazmayan üç kart olurdu.
INSERT INTO "genctek_gorevi" ("ad", "aciklama", "sira_no") VALUES
  (
    'EBA Asistan Test Ekibi',
    'EBA Asistan''ın yeni sürümlerini öğrenci gözüyle deneyip hataları ve iyileştirme önerilerini raporlayan ekip.',
    10
  ),
  (
    'Oyun Senaryo Ekibi',
    'GençTek için geliştirilecek eğitsel oyunların senaryosunu, karakterlerini ve görev akışını kurgulayan ekip.',
    20
  ),
  (
    'Tekno Girişim Değerlendirme Ekibi',
    'Öğrencilerden gelen girişim fikirlerini inceleyip geri bildirim veren ve ön değerlendirme yapan ekip.',
    30
  );

-- ---------------------------------------------------------------------------
-- BİLDİRİM ŞABLONLARI
-- ---------------------------------------------------------------------------
-- İki uçta da bildirim var: kuyruğa düşen başvuru merkeze, karar başvurana.
-- Mentörlükte bu ikisi 13 Ağustos'a kadar eksikti ve kuyruk sessizdi; aynı
-- hatayı yeni bir kuyrukla tekrarlamıyoruz.
INSERT INTO "bildirim_sablonu" ("kod", "konu", "govde_sablonu")
VALUES (
  'ONAY_BEKLEYEN_GENCTEK_GOREVI',
  'Onay bekleyen görev başvurusu: {{gorevAdi}}',
  'Merhaba,' || chr(10) || chr(10) ||
  '{{basvuranAdSoyad}}, "{{gorevAdi}}" görevine başvurdu ve kararınızı bekliyor.' || chr(10) || chr(10) ||
  'Başvuruyu Yönetim Paneli''ndeki GençTek Görevleri kartından inceleyip onaylayabilir ya da gerekçesiyle reddedebilirsiniz.' || chr(10) || chr(10) ||
  'GençTek'
)
ON CONFLICT ("kod") DO NOTHING;

INSERT INTO "bildirim_sablonu" ("kod", "konu", "govde_sablonu")
VALUES (
  'GENCTEK_GOREV_KARARI',
  'Görev başvurunuz {{sonuc}}: {{gorevAdi}}',
  'Merhaba,' || chr(10) || chr(10) ||
  '"{{gorevAdi}}" görevine yaptığınız başvuru {{sonuc}}.' || chr(10) || chr(10) ||
  'Gerekçe: {{gerekce}}' || chr(10) || chr(10) ||
  'Başvurunuzun durumunu panodaki GençTek Görevleri ekranından görebilirsiniz.' || chr(10) || chr(10) ||
  'GençTek'
)
ON CONFLICT ("kod") DO NOTHING;
