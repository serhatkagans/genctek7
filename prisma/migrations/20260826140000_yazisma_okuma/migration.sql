-- Yazışmanın kişi başına son okunma zamanı.
--
-- İstek (26 Ağustos 2026): "yeni mesaj ya da okunmamış mesaj varsa kırmızı
-- çerçeve olsun". Listede okunmamışı işaretleyebilmek için "bu kişi bu
-- yazışmayı en son ne zaman açtı" bilgisi gerekiyor; sistemde hiç yoktu.
--
-- MESAJA `okundu_mu` KONMADI: yazışmayı taraflar dışında danışman, il
-- koordinatörü ve proje yöneticisi de okuyabiliyor. Tek bayrak, "kime göre
-- okundu" sorusunu cevaplayamaz; kayıt bu yüzden kişi başına tutuluyor.
CREATE TABLE IF NOT EXISTS "yazisma_okuma" (
  "yazisma_id"       INTEGER     NOT NULL,
  "kullanici_id"     INTEGER     NOT NULL,
  "son_okuma_tarihi" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "yazisma_okuma_pkey" PRIMARY KEY ("yazisma_id", "kullanici_id"),
  CONSTRAINT "yazisma_okuma_yazisma_id_fkey" FOREIGN KEY ("yazisma_id")
    REFERENCES "yazisma"("baglanti_istegi_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "yazisma_okuma_kullanici_id_fkey" FOREIGN KEY ("kullanici_id")
    REFERENCES "kullanici"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Liste ekranı "benim okumalarım" diye sorguluyor.
CREATE INDEX IF NOT EXISTS "yazisma_okuma_kullanici_id_idx"
  ON "yazisma_okuma"("kullanici_id");
