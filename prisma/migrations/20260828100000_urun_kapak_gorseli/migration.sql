-- Ürünün vitrin kapağı (28 Ağustos 2026 · istek: "vitrine ürün eklerken bir
-- tane ürün görseli ekleyebilelim").
--
-- Kapak için yeni bir tablo ya da `kullanici_kazanim` üzerinde yeni bir dosya
-- alanı AÇILMADI: kapak, var olan `kazanim_ek` satırının işaretlenmesidir.
-- Ayrı alan aynı dosyayı iki yerde yaşatır, ek silindiğinde kapak öksüz
-- kalırdı; bayrak ekin üzerinde olduğu için ek silinince kapak da düşer.
--
-- Kazanım başına en fazla bir işaretli ek bulunur. Teklik uygulama katmanında
-- korunuyor (bkz. lib/kazanim/ek.ts · kazanimEkiKaydet): yeni kapak yazılınca
-- eskisinin işareti düşer. Kısmi tekil indeks yerine bunun seçilmesinin sebebi,
-- indeksin iki satırı güncelleyen bu işlemi yazma sırasına bağımlı kılmasıdır.
ALTER TABLE "kazanim_ek"
  ADD COLUMN "kapak_mi" BOOLEAN NOT NULL DEFAULT false;

-- VAR OLAN ÜRÜNLERE GERİYE DÖNÜK KAPAK ATANMAZ. Bu sütun açılmadan önce
-- yüklenmiş görseller "destekleyici görsel" niyetiyle yüklendi; birini seçip
-- vitrine kapak yapmak, sahibinin vermediği bir kararı onun adına vermek
-- olurdu. Ekran, işaretli ek yoksa en eski görsel eki kapak olarak GÖSTERİR
-- (bkz. lib/kazanim/kapak.ts) — veri değişmeden eski ürünler de kapaklı
-- görünür, sahibi kapağını seçtiği anda gösterim onun tercihine döner.
