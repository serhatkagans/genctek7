-- Erişim logu hedef tipi: hata kayıtları ekranı (18 Ağustos 2026).
--
-- Sunucu hata günlüğünü kimin görüntülediği de kayda geçiyor. Günlükte kişisel
-- veri yok (bkz. src/lib/hata-kaydi.ts · "NE YAZILIR, NE YAZILMAZ") ama yığın
-- izleri sunucunun içini gösteriyor; ERISIM_LOGU değeriyle aynı gerekçe.
--
-- MEVCUT BİR DEĞERE YÜKLENMEDİ (ör. SISTEM_AYARI): denetim kaydı sonradan
-- okunacak bir defterdir ve yanlış etiketlenmiş satır kalıcı olarak yanlış
-- kalır — hata günlüğüne bakılan an, ayar değiştirilen an gibi görünürdü.
ALTER TYPE "LogHedefTip" ADD VALUE IF NOT EXISTS 'HATA_KAYDI';
