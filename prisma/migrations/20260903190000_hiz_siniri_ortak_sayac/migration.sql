-- HIZ SINIRI SAYAÇLARI KOPYALAR ARASINDA ORTAKLAŞTIRILDI
--
-- Sayaçlar src/lib/hiz-siniri.ts içinde süreç belleğindeydi. 2 Eylül 2026'da
-- uygulama üç kopyaya çıktı (genctek 3010, genctek@3020, genctek@3021) ve
-- Apache aralarında lbmethod=bybusyness ile, YAPIŞKAN OTURUM OLMADAN
-- dağıtıyor. Sonuç: aynı IP'nin istekleri üç ayrı sayaca serpiliyor ve etkin
-- sınır yazılanın üç katı oluyordu.
--
-- Ara çözüm sınırları üçe bölmekti; kırılgandı, çünkü kopya sayısı koda
-- gömülüydü ve değiştiği gün sessizce yanlışa düşerdi. Bu tablo sayacı
-- kopyaların dışına taşıyor: yazılan değer artık doğrudan etkin değer.
--
-- SAYIM TEK DEYİMDE VE ATOMİK yapılır (ON CONFLICT DO UPDATE ... RETURNING),
-- yani üç kopya aynı anda saydığında da kayıp artış olmaz.
--
-- Birincil anahtar (kova, anahtar): kovalar ayrı sayılmalı, yoksa bir uçtaki
-- trafik diğerinin kotasını yerdi. pencere_baslangici üzerindeki dizin
-- yalnızca gecelik temizlik içindir.

CREATE TABLE "hiz_siniri_penceresi" (
  "kova"               VARCHAR(40)  NOT NULL,
  "anahtar"            VARCHAR(120) NOT NULL,
  "pencere_baslangici" TIMESTAMPTZ(6) NOT NULL,
  "sayi"               INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "hiz_siniri_penceresi_pkey" PRIMARY KEY ("kova", "anahtar")
);

CREATE INDEX "hiz_siniri_penceresi_pencere_baslangici_idx"
  ON "hiz_siniri_penceresi" ("pencere_baslangici");

COMMENT ON TABLE "hiz_siniri_penceresi" IS
  'Kopyalar arasında ortak hız sınırı sayacı. Penceresi geçmiş satırları gecelik bakım siler; kalsalar bile sayaç doğru çalışır.';
