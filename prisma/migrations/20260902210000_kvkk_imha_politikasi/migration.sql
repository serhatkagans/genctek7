-- GENELGE 3/e ve 3/g: İMHA POLİTİKASININ EKSİK YARISI
--
-- Saklama bakımı bugüne kadar yalnızca DENETİM verisine dokunuyordu (erişim
-- kaydı 24 ay, okunmuş bildirim 12 ay). Kişisel verinin kendisi için tanımlı
-- bir bitiş süresi yoktu; aydınlatma metni "öğrencilik döneminiz boyunca
-- saklanır" diyor, dönemin ne zaman bittiğini söylemiyordu.
--
-- Bitişi mezuniyete bağlamak UYGULANAMAZDI: sistemde mezuniyet/ilişik kesme
-- olayı yok, `kullanici.aktif` hiçbir kod yolunda false'a çevrilmiyor ve
-- e-Okul/EBA eşitlemesi "bu kişi ayrıldı" bilgisini getirmiyor. Bu yüzden
-- süre, kişiyi en son gördüğümüz ana (`son_senkron_tarihi`) bağlandı.
--
-- Bu migration yalnızca imhanın İZİNİ ekler; imhayı yapan iş
-- src/lib/kvkk/imha.ts içinde ve aylık bakım koşusundan çağrılıyor.

ALTER TABLE "kullanici"
  ADD COLUMN "anonimlestirme_tarihi" TIMESTAMPTZ(6);

COMMENT ON COLUMN "kullanici"."anonimlestirme_tarihi" IS
  'Kişisel verisi imha edilmiş kaydın imha anı. Satır SİLİNMEZ: yirmiden fazla tablonun yabancı anahtarıdır; kimliğe götüren alanlar boşaltılır, sayısal iz kalır.';

-- Aylık tarama "henüz imha edilmemiş VE uzun süredir temas etmemiş" satırları
-- arıyor; sütun sırası o sorgunun sırası.
CREATE INDEX "kullanici_anonimlestirme_son_senkron_idx"
  ON "kullanici" ("anonimlestirme_tarihi", "son_senkron_tarihi");

-- ---------------------------------------------------------------------------
-- MESAJDA GİZLENME ANI
-- ---------------------------------------------------------------------------
-- İmha penceresi gizlemenin anından işler. Gonderi, GonderiYorumu, EkipMesaji
-- ve TalepCevabi'nde bu sütun baştan vardı; mesajda yoktu ve pencere
-- olusturma_tarihi'ne bağlansaydı iki yıl önce yazılıp dün gizlenen bir mesaj
-- ertesi ay imha edilirdi — şikâyet incelemesi için tutulan kayıt, tam da
-- şikâyet açıldığı sırada yok olurdu.
--
-- Eski satırlar GERİYE DÖNÜK DOLDURULMUYOR: ne zaman gizlendikleri bilinmiyor
-- ve uydurulmuş bir tarih kaydı yanlışlardı. NULL kalanlarda imha
-- olusturma_tarihi'ne düşer (bkz. lib/kvkk/imha.ts).
ALTER TABLE "mesaj"
  ADD COLUMN "gizlenme_tarihi" TIMESTAMPTZ(6);
