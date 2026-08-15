# Ek F — Rota, Sayfa ve Server Action Envanteri

> **Üretilmiş dosya.** Elle düzenlemeyin; `npm run sartname:uret` ile yeniden oluşturulur.
> Kaynak kod ile şartname arasında çelişki olursa **kaynak kod** geçerlidir.

Üretilecek dosyaların birebir listesi. Yol adları sözleşmedir: bir sayfa farklı bir yola konursa menü, yönlendirmeler ve `ham-yol-taramasi` testi kırılır.

---

## Sayfalar (57)

```text
src/app/basvuru/page.tsx
src/app/dis-giris/page.tsx
src/app/giris/page.tsx
src/app/onay/page.tsx
src/app/page.tsx
src/app/panel/akis/page.tsx
src/app/panel/algoritmam/[kod]/page.tsx
src/app/panel/algoritmam/page.tsx
src/app/panel/ayarlar/page.tsx
src/app/panel/baglantilar/page.tsx
src/app/panel/belgeler/page.tsx
src/app/panel/bildirimler/page.tsx
src/app/panel/calisma-gruplari/page.tsx
src/app/panel/danisman-secim/page.tsx
src/app/panel/dis-basvurular/page.tsx
src/app/panel/dis-kullanicilar/[id]/page.tsx
src/app/panel/duyurular/page.tsx
src/app/panel/ekipler/[id]/page.tsx
src/app/panel/ekipler/page.tsx
src/app/panel/erisim-loglari/page.tsx
src/app/panel/etkinlikler/[id]/belge/page.tsx
src/app/panel/etkinlikler/[id]/belge/toplu/page.tsx
src/app/panel/etkinlikler/[id]/belgeler/page.tsx
src/app/panel/etkinlikler/[id]/page.tsx
src/app/panel/etkinlikler/[id]/rapor/page.tsx
src/app/panel/etkinlikler/page.tsx
src/app/panel/etkinlikler/yeni/page.tsx
src/app/panel/gorev-rolleri/page.tsx
src/app/panel/kazanimlarim/page.tsx
src/app/panel/kvkk/page.tsx
src/app/panel/mentorlugum/page.tsx
src/app/panel/mentorluk/page.tsx
src/app/panel/ogrenciler/[id]/page.tsx
src/app/panel/ogrenciler/page.tsx
src/app/panel/ogretmenler/[id]/page.tsx
src/app/panel/ogretmenler/page.tsx
src/app/panel/okul-sorumlulari/page.tsx
src/app/panel/page.tsx
src/app/panel/paydaslar/[id]/page.tsx
src/app/panel/paydaslar/page.tsx
src/app/panel/profil/page.tsx
src/app/panel/raporlar/page.tsx
src/app/panel/rol-envanteri/page.tsx
src/app/panel/taahhut/page.tsx
src/app/panel/talepler/mentor-basvuru/page.tsx
src/app/panel/talepler/mentor-talebi/page.tsx
src/app/panel/talepler/onaylar/page.tsx
src/app/panel/talepler/page.tsx
src/app/panel/talepler/yeni/page.tsx
src/app/panel/urunler/[id]/page.tsx
src/app/panel/urunler/page.tsx
src/app/panel/yazismalar/[id]/page.tsx
src/app/panel/yazismalar/page.tsx
src/app/panel/yonetim/il/[ilKodu]/page.tsx
src/app/panel/yonetim/ilce/[ilceKodu]/page.tsx
src/app/panel/yonetim/page.tsx
src/app/sifre-sifirlama/page.tsx
```

## Route Handler'lar (16)

```text
src/app/panel/etkinlikler/[id]/basvurular/disa-aktar/route.ts
src/app/panel/etkinlikler/[id]/ekler/[ekId]/route.ts
src/app/panel/etkinlikler/[id]/gorseller/route.ts
src/app/panel/etkinlikler/[id]/rapor/indir/route.ts
src/app/panel/etkinlikler/disa-aktar/route.ts
src/app/panel/kazanim-ekleri/[ekId]/route.ts
src/app/panel/mentorler/[id]/foto/route.ts
src/app/panel/ogrenciler/[id]/cv/route.ts
src/app/panel/ogrenciler/disa-aktar/route.ts
src/app/panel/ogretmenler/[id]/cv/route.ts
src/app/panel/ogretmenler/disa-aktar/route.ts
src/app/panel/paydaslar/disa-aktar/route.ts
src/app/panel/profil/foto/route.ts
src/app/panel/raporlar/istatistik/route.ts
src/app/panel/urunler/[id]/git/[baglantiId]/route.ts
src/app/panel/yonetim/disa-aktar/route.ts
```

## Server Action Dosyaları (34)

```text
src/app/basvuru/eylemler.ts
src/app/dis-giris/eylemler.ts
src/app/giris/eylemler.ts
src/app/onay/eylemler.ts
src/app/panel/akis/eylemler.ts
src/app/panel/algoritmam/eylemler.ts
src/app/panel/ayarlar/eylemler.ts
src/app/panel/calisma-gruplari/eylemler.ts
src/app/panel/danisman-secim/eylemler.ts
src/app/panel/dis-basvurular/eylemler.ts
src/app/panel/duyurular/eylemler.ts
src/app/panel/ekipler/eylemler.ts
src/app/panel/etkinlikler/[id]/icerik-eylemleri.ts
src/app/panel/etkinlikler/[id]/rapor/eylemler.ts
src/app/panel/etkinlikler/eylemler.ts
src/app/panel/etkinlikler/il-disi-eylemler.ts
src/app/panel/eylemler.ts
src/app/panel/gorev-rolleri/eylemler.ts
src/app/panel/mentorlugum/eylemler.ts
src/app/panel/mentorluk/eylemler.ts
src/app/panel/ogrenciler/[id]/eylemler.ts
src/app/panel/ogrenciler/eylemler.ts
src/app/panel/paydaslar/eylemler.ts
src/app/panel/profil/belge-eylemleri.ts
src/app/panel/profil/eylemler.ts
src/app/panel/profil/hedef-eylemleri.ts
src/app/panel/profil/kazanim-eylemleri.ts
src/app/panel/rol-envanteri/eylemler.ts
src/app/panel/talepler/eylemler.ts
src/app/panel/urunler/eylemler.ts
src/app/panel/yazismalar/baglanti-eylemleri.ts
src/app/panel/yazismalar/eylemler.ts
src/app/sifre-sifirlama/eylemler.ts
src/app/tema-eylemi.ts
```

## Paylaşılan Bileşenler

```text
CalismaGrubuSecimi.tsx
DanismanSecimi.tsx
DuyuruFormu.tsx
EnvanterFormu.tsx
EnvanterSonucu.tsx
FaaliyetRozetleri.tsx
KamuSayfaDuzeni.tsx
KatkiKarti.tsx
KayitTuruSecici.tsx
MesajSeridi.tsx
MetinBaglantili.tsx
OgrenciProfilBolumleri.tsx
OgretmenKatkiKarti.tsx
OnayBelgeleriBolumu.tsx
PanelGezinme.tsx
ProfilDuzenleme.tsx
RolEtiketi.tsx
RotamKarti.tsx
TemaSecici.tsx
YazdirButonu.tsx
YonetimKartlari.tsx
belge
ui.tsx
```

## Test Paketleri (48)

```text
akis-kurallar.test.ts
basvuru-il-disi.test.ts
belge-kapi.test.ts
belge-kurallar.test.ts
belge-toplu.test.ts
bildirim-hedef.test.ts
bildirim-sablon.test.ts
bildirim-sms.test.ts
bildirim-toplu.test.ts
danisman-karar.test.ts
db-havuz.test.ts
dis-kimlik-kurallar.test.ts
dis-kimlik-sifre.test.ts
dis-profil-kurallar.test.ts
ekip-kurallar.test.ts
envanter-kurallar.test.ts
faaliyet-ek-kurallar.test.ts
faaliyet-kurallar.test.ts
faaliyet-liste-filtresi.test.ts
faaliyet-rapor-kurallar.test.ts
faaliyet-takvim.test.ts
gorev-rol-etiketleri.test.ts
ham-yol-taramasi.test.ts
hedef-kurallar.test.ts
iletisim-kurallar.test.ts
katilim-kurallar.test.ts
katki-ozeti.test.ts
kazanim-kurallar.test.ts
kazanim-rozetler.test.ts
kirilim-istatistigi.test.ts
kvkk-kurallar.test.ts
market-kurallar.test.ts
mentor-kurallar.test.ts
metin-baglanti.test.ts
ogrenci-cv-kurallar.test.ts
ogrenci-iletisim-kurallar.test.ts
ogretmen-gorev-yillari.test.ts
paydas-kurallar.test.ts
profil-foto-kurallar.test.ts
profil-salt-okunur.test.ts
rapor-csv.test.ts
rapor-faaliyet.test.ts
rol-karar.test.ts
yardimcilar.ts
yetki-dis-kullanici.test.ts
yetki-izinler.test.ts
yetki-kapsam.test.ts
yonetim-panosu.test.ts
zip.test.ts
```
