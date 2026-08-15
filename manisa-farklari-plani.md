# Manisa panelindeki eksiklerin kapatılması — uygulama planı

15 Ağustos 2026'da `manisa/` klasöründeki 11 ekran görüntüsü ve
`etkinlik_raporlari_2026-08-15_165402.xlsx` incelendi. Manisa GençTek ekibinin
panelinde olup bizde olmayan yetenekler tespit edildi. Bu belge onların
uygulama sırasını, dosya dokunuşlarını ve bitti sayılma ölçütünü tutar.

**Sıra tesadüfi değil:** her aşama bir öncekinin ürettiği veriyi ya da yardımcı
katmanı kullanır. 1 → 8 sırasıyla ilerlenir; aşama ortasında bırakılırsa sistem
tutarlı kalır (yarım kalan aşamanın ekranı menüye hiç eklenmemiş olur).

**Oturum sığmazsa:** her aşamanın sonunda repo derlenir ve testler geçer.
"Devam eden" işaretlenen aşamadan devam edilir; aşamaların hiçbiri diğerinin
yarım hâline bağımlı değildir.

## Durum

| # | Aşama | Durum |
|---|---|---|
| 1 | Excel (`.xlsx`) altyapısı + toplu etkinlik raporu dökümü | ☑ **bitti** (15.08.2026) |
| 2 | Excel kapsamının panelin tamamına yayılması | ☑ **bitti** (15.08.2026) |
| 3 | Okul Eksik Durum Analizi | ☑ **bitti** (15.08.2026) |
| 4 | Okullar (Okul Yönetimi) ekranı | ☑ **bitti** (15.08.2026) |
| 5 | Ekip türü + danışman, merkezi ekip listesi, danışmansız ekipler | ☑ **bitti** (15.08.2026) |
| 6 | Etkinlikler ekranının güçlendirilmesi (sayfalama, sekmeler, göstergeler) | ☑ **bitti** (15.08.2026) |
| 7 | İstatistik görselleştirmesi | ☑ **bitti** (15.08.2026) |
| 8 | Öğrenci deneyim kaydı → **deneyim SÜZGECİ** | ☑ **bitti** (15.08.2026) |

**Aşama 6 sıradan bağımsızdır** ve içindeki sayfalama maddesi (6a) bir defekt
düzeltmesidir — istenirse Aşama 1'den önce de alınabilir.

**Aşama 7 ve 8, Manisa'da olan bir şeyi kapatmak için değil**, ulusal ölçekli
bir sistemde olması gerektiği için var (15 Ağustos 2026 kararı). Aşama 7 en
sonda kalabilir; Aşama 8'in şema değişikliği erken yapılırsa sonraki
aşamaların dışa aktarımları sütunu baştan taşır.

---

## Aşama 1 — Excel altyapısı ve toplu etkinlik raporu dökümü

En görünür açık ve en düşük riskli iş: şema değişikliği gerekmiyor, ihtiyaç
duyulan verinin tamamı zaten `Faaliyet`, `FaaliyetRaporu`, `FaaliyetEk`,
`FaaliyetBelgesi` ve `Basvuru` tablolarında duruyor.

### 1a. `src/lib/rapor/xlsx.ts` — yeni ☑

> **UYGULAMADA DEĞİŞTİ: `exceljs` EKLENMEDİ.** Yazarken görüldü ki gereken şey
> zaten elde: XLSX bir ZIP arşivi ve içindeki parçalar düz XML; `lib/zip.ts` de
> tam bir PKZIP yazıcısı. Gerekçe o dosyanın kendi notuyla aynı — taşınacak
> bağımlılık ile yapılan iş oransız kalıyordu. `lib/zip.ts`'e klasör yolu
> desteği eklendi (`klasorlu` seçeneği); zip slip koruması gevşetilmedi,
> ayraçlara izin veren bir biçimde yeniden kuruldu.
>
> **EK OLARAK: gerçek tarih hücresi.** Plan tarihleri metin olarak öngörüyordu.
> Metin tarih elektronik tabloda ALFABETİK sıralanır (Ağustos, Haziran'dan önce
> gelir) ve dosyayı tarihe göre sıralayan kişi bunu fark etmez. Tarihler Excel
> seri numarası olarak, `DD.MM.YYYY` biçimiyle yazılıyor; sıralama, süzme ve
> tarih aralığı filtresi çalışıyor.

CSV katmanı **kaldırılmadı**; xlsx onun yanına geldi. Mevcut altı rotanın
çevrilmesi Aşama 2'nin işi.

Dışa verilecek yüzey, `csv.ts` ile bilerek simetrik tutulur:

```ts
export interface XlsxSutun { baslik: string; genislik?: number }
export function xlsxBelgesi(
  baslik: string,            // "GençTek Ekosistemi" — çalışma kitabı başlığı
  altBaslik: string,         // "Tamamlanan Etkinlik Raporları · 15.08.2026"
  sutunlar: readonly XlsxSutun[],
  satirlar: readonly (readonly unknown[])[],
): Promise<Buffer>
export function xlsxYaniti(dosyaAdi: string, icerik: Buffer): Response
```

Karar notları (dosyanın başına yorum olarak yazılacak):

- **Formül kaçışı xlsx'te YAPILMAZ.** `csv.ts`'teki `FORMUL_BASLANGICLARI`
  koruması CSV'ye özgüdür: Excel bir CSV hücresindeki `=1+1`'i formül sayar ama
  xlsx'te hücrenin tipi dosyada yazılıdır, `exceljs` metni metin olarak yazar.
  Aynı korumayı buraya kopyalamak, kullanıcının adının başına tırnak eklerdi.
- **BOM ve ayıraç sorunu ortadan kalkar** — xlsx'in Türkçe yerel ayarla derdi
  yok. CSV'deki `;` ayıracı ve `﻿` yalnızca CSV'nin sorunuydu.
- Dosya adı ve `Cache-Control: private, no-store` başlığı `csvYaniti` ile
  birebir aynı kalır; `csvAdParcasi` yeniden kullanılır (adı `adParcasi` olarak
  `csv.ts`'ten dışa verilip her ikisinden çağrılabilir).
- Başlık satırı kalın, ilk satır dondurulmuş (`views: [{ state: "frozen",
  ySplit: 3 }]`), sütun genişlikleri sabit — Manisa dosyasındaki görünüm.

**Test:** `tests/rapor-xlsx.test.ts` — üretilen tamponu `exceljs` ile geri
okuyup başlık satırı, satır sayısı, `null`/`undefined` hücrenin boş string
olması ve tarih hücrelerinin metin olarak yazılması doğrulanır.
`tests/rapor-csv.test.ts` aynen korunur.

### 1b. `src/lib/rapor/etkinlik-dokumu.ts` — yeni ☑

Toplu rapor dökümünün satır üretimi. Veritabanına **bakmaz** (repodaki
`kirilim-istatistigi.ts` ile aynı desen): sorgu rotada yapılır, bu dosya saf
dönüşümdür ve birim testle doğrulanır.

Sütunlar (Manisa dosyasıyla birebir, eksiklerimiz kalın):

| Sütun | Kaynak |
|---|---|
| Sıra No | satır indeksi |
| Etkinlik Adı | `faaliyet.ad` |
| Tarih | `tarihYaz(faaliyet.tarih)` |
| Konum | `faaliyet.yer` |
| Faaliyet Alanı | `faaliyet.calismaGruplari[].calismaGrubu.ad` birleşik |
| **Danışman** | faaliyeti açan / danışman öğretmen adı |
| **İlçe** | `faaliyet.kurum.ilce.ad ?? faaliyet.ilce.ad` |
| Okul | `faaliyet.kurum.ad ?? faaliyet.il.ad` |
| **Öğrenci Sayısı** | `SECILDI` başvurulardan öğrenci rolü olanların tekil sayısı |
| **Öğretmen Sayısı** | aynı kümede öğretmen rolü olanların tekil sayısı |
| **Okul Sayısı** | katılımcıların tekil `kurumKodu` sayısı |
| **Fotoğraf Sayısı** | `FaaliyetEk` · `silindiMi=false` · görsel mime tipi |
| **Belge Sayısı** | `FaaliyetEk` · `silindiMi=false` · görsel olmayan + `FaaliyetBelgesi` |
| **Rapor Tarihi** | `FaaliyetRaporu.olusturmaTarihi` |
| **Rapor Özeti** | `FaaliyetRaporu.degerlendirme`, yoksa `"Rapor girilmedi"` |

Karar notları:

- **"Rapor girilmedi" boş hücreden iyidir.** Manisa dosyasında da böyle. Boş
  hücre "rapor var ama okunamadı" diye de okunabilirdi; sayfayı okuyan kişi
  eksikliği aksiyon listesine alsın diye açıkça yazılır.
- **İptal edilen etkinlik dökümde yer almaz** — `kirilim-istatistigi.ts`'teki
  gerekçenin aynısı: iptal, "bu etkinlik yapılmadı" demektir.
- **Rapor özeti kısaltılmaz.** Hücre uzunsa Excel sarar; kısaltmak, dosyayı
  arşiv olarak kullanan kişinin metnin tamamını kaybetmesi demek olurdu.
- **Öğrenci/öğretmen ayrımı rolden okunur, sınıf/branş alanının doluluğundan
  değil.** Mezun katılımcı ikisine de sayılmaz, ayrı bir sütun da açılmaz —
  Manisa dosyasında yok ve şimdilik istenmiyor.

**Test:** `tests/etkinlik-dokumu.test.ts` — raporsuz etkinlik, katılımcısız
etkinlik, çok okullu etkinlik (okul sayısı > 1), silinmiş ek (sayılmamalı),
iptal edilmiş etkinlik (satır üretilmemeli).

### 1c. `src/app/panel/raporlar/dokum/route.ts` — yeni ☑

`GET`; `faaliyetDisaAktarabilirMi(kullanici)` kapısıyla korunur (mevcut
`etkinlikler/disa-aktar` ile aynı kapı — öğrenci dosyayı adres çubuğundan da
alamaz).

> **UYGULAMADA DEĞİŞTİ: kapsam `raporlanabilirFaaliyetFiltresi`.** Plan
> `etkinlikler/filtreler.ts` süzgeçlerini öngörüyordu; iki kapsam FARKLI çıktı.
> Etkinlik listesinde danışman öğretmen okulunun bütün etkinliklerini görür,
> raporlar ekranında yalnızca kendi açtıklarını. Düğme raporlar ekranında ve
> yanında "N etkinlik" yazıyor — etkinlik listesinin kapsamı kullanılsaydı
> danışmanın indirdiği dosyada düğmede yazandan fazla satır çıkar ve fark
> kimseye görünmezdi. Adres süzgeci de bu yüzden yok: düğmenin bulunduğu yerde
> süzgeç kutusu bulunmuyor.

`etkinlikler/disa-aktar/route.ts`'teki satır sayısı üst sınırı (413 yanıtı)
buraya da uygulanır.

### 1d. `src/app/panel/raporlar/page.tsx` — düzenleme ☑

"Raporları Excel indir" düğmesi eklenir. Mevcut "Program ve çalışma grubu
istatistiği (CSV)" kartı olduğu gibi kalır; yeni kart onun üstüne, çünkü asıl
sorulan rapor bu.

### Bitti sayılma ölçütü

- ☑ `npm test` 974 test geçiyor (yeni: 19 + 15), `lint` ve `build` temiz.
- ☑ Üretilen dosya bağımsız bir Excel okuyucusuyla (openpyxl) açıldı; hücre
  değerleri, tarih tipleri, dondurulan bölme, süzgeç, sütun genişlikleri ve
  yazı tipleri tek tek doğrulandı. Türkçe karakterler bozulmuyor.
- ☑ Raporu olmayan etkinlik dosyada "Rapor girilmedi" ile görünüyor.
- ☑ Kapı `faaliyetDisaAktarabilirMi`; öğrenci 404 alır.
- ☑ Gerçek veriyle uçtan uca üretildi (3 satır) ve bir DEFEKT yakalandı:
  okul etkinliklerinde il/ilçe faaliyette değil kurumda duruyor, yalnızca
  faaliyetin alanlarına bakılınca çoğunluğun il sütunu boş kalıyordu.
  Düzeltildi (`faaliyet.il?.ad ?? faaliyet.kurum?.il?.ad`).

☑ **Kapandı (15.08.2026):** rota önce betiğe eklendi, sonra bir hata ortaya
çıktı ve düzeltildi — bkz. aşağıdaki "Son tarama".

---

## Aşama 2 — Excel kapsamının panelin tamamına yayılması

Manisa panelinde Excel tek bir ekranın özelliği değil, panelin **geneline
yayılmış bir davranış**: kullanıcı hangi listeye bakıyorsa onu indirebiliyor.
Bizde bugün 6 dışa aktarma rotası var ve 10'dan fazla liste ekranında hiç yok.
Bu aşama, Aşama 1'in kurduğu katmanı panelin tamamına uygular.

### Bugünkü tablo

Dışa aktarımı **olan** altı yer: Etkinlikler · Etkinlik başvuruları · Öğrenciler
· Öğretmenler · Paydaşlar · Yönetim panosu (+ kırılım istatistiği).

Dışa aktarımı **olmayan** liste ekranları:

| Ekran | Dosyada ne olur | Öncelik |
|---|---|---|
| Erişim Kayıtları | KVKK denetim dökümü | yüksek |
| Görev Rolleri | il/ilçe/okul temsilcileri, dönem bazlı | yüksek |
| Okul Sorumluları | YEĞİTEK okul sorumlusu ataması | yüksek |
| Dış Başvurular | mezun / paydaş temsilcisi başvuruları, durumu | yüksek |
| Mentörlük | eşleşmeler, durum, çalışma grubu | orta |
| Çalışma Grupları | grup başına öğrenci dağılımı | orta |
| Rol Envanteri | rol → kişi dökümü | orta |
| Pano (Talepler) | ilanlar, tür, onay durumu | düşük |
| Market (Ürünler) | ürün kayıtları | düşük |
| Ekipler | tek ekibin üye listesi (satır bazlı) | Aşama 5 ile |

### 2a. Ortak düğme — `src/components/DisaAktarmaBagi.tsx` (yeni) ☑

> **UYGULAMADA DARALDI: bileşen sorgu kurmuyor.** Plan bileşenin ekranın
> süzgeçlerini de taşımasını öngörüyordu. Ekranların hepsi bağlantıyı zaten
> kendi `filtreler.ts` çözümlemesiyle kuruyor ve o kod çalışıyor; sorgu kurmayı
> da bileşene almak, kazancı ortak bir etiket olan bir işte altı çalışan ekranı
> tek genellemeye çevirmek olurdu. Bileşen dar ama gerçek bir şeyi garanti
> ediyor: her ekran aynı etiketi, aynı ikonu ve HER İKİ BİÇİMİ birden sunar.
>
> **BEKLENMEYEN KAZANÇ: sessiz bir hata düzeldi.** Liste ekranları indirme
> bağlantısını `<Link href="/panel/...">` ile HAM yol vererek basıyordu;
> `TEMEL_YOL` altında yayınlanan kurulumda bu bağlantılar uygulamaya değil ters
> vekile düşerdi. `lib/ortam.ts` bu hatanın daha önce iki kez üretildiğini
> yazıyor. Bileşen `<a href={uygulamaYolu(...)}>` kullanıyor.

Gerekçe repoda zaten yazılı: `ogrenciler/filtreler.ts`'in dosya başındaki not,
ekran ve dışa aktarmanın aynı çözümlemeyi kullanmasını "ikisi ayrı yazılırsa
indirilen dosya ekranda görünenden farklı bir küme olabilir ve bunu kimse fark
etmez" diye gerekçelendiriyor. On ekrana elle kopyalanan bir bağlantı, o hatayı
on kez yapma fırsatı demektir.

Bileşen ayrıca **açılır menü** biçimini destekler (Manisa'nın Kullanıcılar
ekranındaki `Excel İndir ⌄`): aynı listenin birden çok dökümü olduğunda
(ör. "Öğrenci listesi" / "Öğrenci + çalışma grubu detayı") tek düğme altında
toplanır.

### 2b. Mevcut altı rotanın xlsx'e çevrilmesi ☑

Rotalar varsayılan olarak `.xlsx` döner, `?bicim=csv` ile CSV **korunur**.

CSV'nin bırakılmamasının somut nedeni: `scripts/disa-aktarma-dogrula.mjs`
indirilen dosyanın satır sayısını ekrandaki kayıt sayısıyla karşılaştırıyor ve
bunu CSV metnini ayrıştırarak yapıyor. Rotalar tek yönlü xlsx'e çevrilseydi bu
doğrulama betiği kapsam güvenliğini kontrol edemez hâle gelirdi. Betik
`?bicim=csv` ile çalışmaya devam eder; ayrıca dışarıya veri veren olası
entegrasyonlar da kırılmaz.

### 2c. Eksik ekranlara rota eklenmesi ☑ (yüksek öncelikli dördü)

Her biri aynı kalıpta: `src/app/panel/<ekran>/disa-aktar/route.ts`, ekranın
`filtreler.ts` çözümlemesi, `xlsxBelgesi`, satır sayısı üst sınırı (413).

Kurallar:

- **Her rotanın kendi kapı fonksiyonu olur.** "Ekranı görebiliyorsa dosyayı da
  alabilir" varsayımı yapılmaz — `faaliyetDisaAktarabilirMi` tam olarak bu
  yüzden ayrı bir fonksiyon (`permissions.md` · Bölüm 4: yetki iki katmanda
  birden sorulur). Kapısı olmayan rota yazılmaz.
- **Erişim Kayıtları dışa aktarımının kendisi loglanır.** Kişisel veri toplu
  indiriliyor; denetim kaydını üreten ekranın dökümünün izsiz kalması çelişki
  olurdu.
- **Öğrenci hiçbir ekranın dökümünü alamaz** — mevcut kural korunur.
- Kapsam süzgeci (`kapsam.ts`) her rotada uygulanır: koordinatör kendi ili,
  danışman kendi okulu.

### 2d. Doğrulama ☑

`scripts/disa-aktarma-dogrula.mjs`'e senaryolar eklendi ve betiğin kendisi
düzeltildi:

- **Betik `?bicim=csv` eklemeden çağırıyordu** ve varsayılan XLSX olunca ikili
  veriyi metin diye ayrıştıracaktı. CSV yolunun korunmasının sebebi zaten bu
  betikti; parametre eklendi.
- **Yanlış alarm giderildi.** KVKK onayını vermemiş kişi öğrenci listesine
  değil onay ekranına düşüyor; betik oradan "N kayıt" bulamayıp 0 varsayıyor ve
  "*** FARKLI ***" diyordu — kapsam sızıntısı gibi görünen bir yanlış alarm.
  Güvenlik betiğinde yanlış alarm, gerçek alarmı da görünmez kılar. Artık
  "ölçülemedi" diyor.
- Dört yeni rota için yetkili/yetkisiz senaryoları eklendi.

### Bitti sayılma ölçütü

- ☑ Yüksek öncelikli dört ekranın dökümü çalışıyor; dördünde de öğrenci 404
  alıyor (canlı sistemde doğrulandı).
- ☑ Mevcut altı rota xlsx dönüyor, `?bicim=csv` çalışıyor, doğrulama betiği
  geçiyor (YEĞİTEK 305 kayıt = 305 satır, koordinatör 3 = 3).
- ☑ Süzgeç dosyaya yansıyor (filtresiz 305 → `il=34` ile 3 satır).
- ☑ İndirilen dosyalar openpyxl ile açıldı: kurum kodu ve il kodu METİN kalıyor
  (`"01"` baştaki sıfırı koruyor), sayımlar sayı, tarihler `DD.MM.YYYY` biçimli
  gerçek tarih hücresi.
- ☑ 988 test, lint ve build temiz.

**Ekranda düzeltilen bir UX sorunu:** erişim kayıtları süzgeçsizken üst sınırı
aşıyor (413). Ekran bunu bilmeden bağlantı gösteriyordu; kullanıcı tıklayıp
duvara çarpar ve bunu arıza sanardı. Sınır artık ekranda okunup söyleniyor.

**Kalanlar da tamamlandı (15.08.2026):** Mentörlük, Rol Envanteri (il + okul
kırılımı ayrı dosya), Pano ilanları, Market ürünleri, tek ekibin üye listesi.
Toplam **18 dışa aktarma rotası**; hepsi canlı sistemde doğrulandı — yetkilide
çalışıyor, öğrencide 404.

**Çalışma Grupları'na rota AÇILMADI:** o ekran bir yönetim listesi değil,
öğrencinin kendi grup seçim formu — dışa aktarılacak liste yok. Grup başına
dağılım zaten kırılım istatistiği dosyasında ve (Aşama 7 ile) Raporlar
ekranındaki bar grafiğinde.

---

## Aşama 3 — Okul Eksik Durum Analizi

Şema değişikliği **gerekmez**: dört kırılımın tamamı `Kurum`, `Kullanici`,
`KullaniciRol` ve `OgrenciGorevRolu` üzerinden hesaplanabilir.

### 3a. `src/lib/rapor/okul-eksikleri.ts` — yeni ☑

> **UYGULAMADA BÖLÜNDÜ: saf kurallar ve sorgular ayrı dosyada.** Tek dosyada
> yazıldığında testler yüklenemedi — jest Prisma istemcisini açamıyor. Depo bu
> ayrımı zaten yapıyor (`yonetim-kurallari` / `yonetim-ozeti`); koşullar
> `okul-eksikleri.ts` (veritabanına bakmaz, birim testli), sorgular
> `okul-eksikleri-ozeti.ts`.
>
> **"Aktif öğrenci" tanımı için üçüncü bir dosya açıldı** (`sayim-kosullari.ts`).
> Sebep: `lib/yetki/kapsam.ts` içinde aynı adla bir koşul var ama `aktif: true`
> ARAMIYOR — kapsam filtresi "listede olmalı mı", sayım koşulu "kaç kişi var"
> diye soruyor ve pasif kayıt ikisinde farklı davranmalı. İkisini tek sabite
> indirgemek bu ayrımı kaybettirirdi.

Dört kırılım, tek sorgudan türetilir:

| Kırılım | Tanım |
|---|---|
| Danışman yok | okulda `DANISMAN` rollü aktif öğretmen yok |
| Öğrenci yok | okulda aktif öğrenci kaydı yok |
| Temsilci yok | okulda dönem içinde `OKUL_TEMSILCISI` görev rolü verilmemiş |
| Öğrenci var, temsilci yok | yukarıdaki ikisinin kesişimi — aksiyon üreten liste |

Karar notları:

- **Dördüncü kırılım ilk üçün türevidir ama ayrı sekme hak eder.** "Öğrenci
  yok" listesindeki bir okulda temsilci olmaması normaldir; asıl eksik,
  öğrencisi olup temsilcisi olmayan okuldur. Manisa panelinde de öyle (13 kayıt).
- **Eğitim-öğretim yılı süzgeci zorunlu.** Görev rolleri dönem bazlı
  (`OgrenciGorevRolu`); yıl verilmezse geçen yılın temsilcisi bu yılın eksiğini
  gizlerdi. Varsayılan: içinde bulunulan yıl.
- **Kapsam yetkiden gelir:** koordinatör kendi ilini, merkez ülkeyi görür —
  `yonetimPanosuIlErisimi` ile aynı kural. Danışman bu ekranı hiç açamaz
  (kendi okulunun eksiğini zaten görüyor, başka okulun sayımı ona veri sızdırır).

**Test:** `tests/okul-eksikleri.test.ts` — kesişim kırılımının doğruluğu,
pasif öğretmenin danışman sayılmaması, geçen yılın temsilcisinin bu yılı
kapatmaması.

### 3b. `src/app/panel/okul-eksikleri/page.tsx` — yeni ☑

Dört sekme, özet satırı (`Danışman yok: 67 · Öğrenci yok: 100 · …`), okul/ilçe
araması, ilçe ve okul türü süzgeci. Sekme adresten okunur (`?sekme=danismansiz`)
ki bağlantı paylaşılabilsin.

### 3c. `src/app/panel/okul-eksikleri/disa-aktar/route.ts` — yeni ☑

Aşama 1'in `xlsxBelgesi` yardımcısını kullanır. Ekrandaki sekme ve süzgeçler
dosyaya birebir yansır.

### 3d. Yönetim Paneli kartı ☑

`src/app/panel/yonetim/page.tsx` — "Yönetim ekranları" bloğuna kısayol kartı.

> **UYGULAMADA DEĞİŞTİ: menüye sekme AÇILMADI.** Plan `layout.tsx`'e de bağlantı
> eklemeyi öngörüyordu. Yönetim Paneli'nin dosya başındaki notu diğer yönetim
> ekranlarının (Öğrenciler, Öğretmenler, Paydaşlar, Görev Rolleri, Mentörlük)
> orada KART olarak durduğunu söylüyor; menüye ayrı sekme eklemek o kararı
> bozardı. Kart, `danismansizOkul` sayacının hemen yanında — sayıyı gören
> kişinin bir sonraki sorusu zaten "hangileri".

### Bitti sayılma ölçütü

- ☑ **Sayılar aritmetik olarak tutarlı** (canlı veri): danışman yok 94 ·
  öğrenci yok 64 · temsilci yok 114 · öğrenci var temsilci yok 50.
  **64 + 50 = 114** — "öğrenci yok" ile "öğrenci var, temsilci yok" tam olarak
  "temsilci yok"u bölüyor. Kesişimin doğru kurulduğunun en güçlü işareti;
  temsilci öğrenciler arasından seçildiği için öğrencisi olmayan her okul
  zorunlu olarak temsilcisizdir.
- ☑ Koordinatör adres çubuğuna `?il=45` yazdığında yok sayılıyor, kendi ili
  (İstanbul) geliyor; il seçici de ona gösterilmiyor.
- ☑ Danışman ve öğrenci hesabında dışa aktarma 404.
- ☑ Dört kırılımın dosyası da üretildi; içerik openpyxl ile doğrulandı —
  50 kayıt (ekrandaki toplamla aynı), kurum kodu metin, sayılar sayı, alt
  başlıkta kırılım ve dönem yazılı.
- ☑ 1000 test, lint ve build temiz.

**Ekranda ayrıca:** kırılım üst sınırı aşarsa bağlantı yerine uyarı gösteriliyor
(erişim kayıtlarında yapılan düzeltmenin aynısı) — kullanıcı 413 duvarına
çarpmıyor.

---

## Aşama 4 — Okullar (Okul Yönetimi) ekranı

Bugün okul listesi yalnızca Yönetim Paneli'nin il → ilçe kırılımının son
basamağında (`panel/yonetim/ilce/[ilceKodu]`). Orada kurum kodu görünmüyor,
arama ve tür süzgeci yok, ekip bağı yok.

### 4a. Ölçek sorunu ☑ — `6.png` bizde olduğu gibi kurulamaz

**Manisa'nın ekranı tek il için tasarlanmış.** 156 okul, 35'erlik sayfalama,
açılışta düz liste. Tek ilde bu doğru tasarım: kullanıcı listeyi kaydırarak da
aradığını bulabilir.

Bizde aynı ekran **ulusal ölçekte on binlerce okul** demek. Aynı düzen birebir
kurulursa merkez kullanıcısının her açılışta ödediği bir tam tablo taraması
olur ve liste zaten kaydırılarak kullanılamaz. Ekranı "genele yaymanın" yolu
üç kararda:

**1. Arama önce, liste sonra.** Merkez kullanıcısı için süzgeçsiz açılışta düz
liste **basılmaz**; ekran "il seçin ya da okul adı / kurum kodu arayın" boş
durumuyla açılır. Boş durum bir eksiklik değil ekranın çalışma biçimidir —
50 bin kayıtlık bir listenin ilk 50'si hiçbir soruya cevap vermez.

**2. Kapsam ekranı kendiliğinden Manisa ölçeğine indirir.** İl koordinatörü
girdiğinde il süzgeci kendi iliyle **kilitli** gelir ve ekran doğrudan listeyle
açılır — yani koordinatör tam olarak Manisa'nın gördüğü ekranı görür. Ölçek
sorunu sadece merkezin sorunu; çözümü de sadece merkezin açılışında.

**3. Mevcut kırılım ekranın omurgası olur, rakibi değil.** `yonetim/il/[ilKodu]`
→ `yonetim/ilce/[ilceKodu]` zaten var ve son basamağı okul listesi. Yeni ekran
onun **düz ve aranabilir ikizidir**: kırılımın son basamağındaki okul kartından
gelen bağlantı `okullar?ilce=...` süzgeciyle aynı ekrana düşer.

`okulOzetleriniGetir` genelleştirildi: imzası `(ilceKodu: string)` idi, artık
süzgeç nesnesi alıyor (`{ ilKodu?, ilceKodu?, okulTuru?, ara?, atla?, al? }`).
Saf olan kısım (`okulKosulu` + `OkulSuzgeci`) `yonetim-kurallari.ts`'e taşındı —
sayım dosyası Prisma yüklüyor ve testler onu açamıyor; depo bu ayrımı zaten
yapıyor.

Kırılım ekranına da geçiş bağlantısı eklendi ("Bu ilçeyi aranabilir listede aç").

**Sayaçlar yalnızca görünen sayfa için hesaplanır.** `okulOzetleriniGetir` okul
başına dört `groupBy` çalıştırıyor; ilçe ölçeğinde (30–50 okul) sorun değil ama
ulusal ölçekte sayfa boyutuyla sınırlanması şart. Sayfalama bu yüzden isteğe
bağlı bir iyileştirme değil, sorgunun ön koşulu.

### 4b. Arama için index ☑ — **ekranın ön koşulu**

`Kurum` bugün üç index taşıyor (`kurumKodu` birincil anahtar, `ilKodu`,
`ilceKodu`) ama **`ad` üzerinde index yok**. 4c'nin okul adı araması ulusal
ölçekte `ILIKE '%...%'` demektir ve bu, index'siz on binlerce satırda sıralı
tarama olur.

Migration'da `pg_trgm` eklentisi açılır ve `kurum.ad` üzerinde GIN index
kurulur:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX ix_kurum_ad_trgm ON kurum USING gin (ad gin_trgm_ops);
```

B-tree yerine trigram olmasının nedeni: `ad LIKE 'Akhisar%'` için B-tree
yeterdi ama kullanıcı "şeyh isa" diye ortadan arayacak. Baştan eşleşmeyle
sınırlı bir arama, okul adlarının başında ilçe adı taşıması yüzünden (
"Akhisar Şeyh İsa Anadolu Lisesi") pratikte ilçe araması olurdu.

**Ekrandan önce yapılır.** Sonraya bırakılırsa ekran yazılır, yavaş olduğu
fark edilir ve sorgu ikinci kez elden geçer.

### 4c. `src/app/panel/okullar/page.tsx` — yeni ☑

- Arama: okul adı / ilçe / **kurum kodu** (kurum kodu tam eşleşme, ad kısmi).
- Süzgeçler: il (merkez için; koordinatörde kilitli), ilçe, okul türü.
- Sütunlar: İlçe · Okul · Tür · Kurum Kodu · Öğretmen · Danışman · Öğrenci ·
  Ekip sayısı.
- Sekmeler: Tüm Okullar / Ekip Tanımlanan / Ekip Tanımlanmayan.
- Sayfalama: `SAYFA_BOYUTU = 50` (öğrenci envanteriyle aynı desen).

Kişi sayısı sütunları kırılım kartlarındaki değerlerin aynısıdır — 6.png'de
yok ama bizde kırılım ekranı onları zaten gösteriyor ve düz listede kaybolmaları
geriye gidiş olurdu.

**"Ekip sayısı" sütunu Aşama 5'e bağımlıdır.** Aşama 4, Aşama 5'ten önce
bitirilirse sütun eklenmez ve sekmeler ilk sürümde yer almaz; Aşama 5 bittiğinde
tek düzenlemeyle açılır. Bu bağımlılık bilinçli: okul ekranının aramalı listesi
tek başına da işe yarıyor, ekip bağı için beklemesine gerek yok.

### 4d. "Yeni Okul Ekle" ☑ — kapsam dışı, gerekçesiyle

Manisa panelinde var, **bizde açılmayacak.** `Kurum` kayıtları MEB kurum
kodundan geliyor; elle açılan bir okul, gecelik senkron çalıştığında ya
yinelenir ya da eşleşmeyen bir kayıt olarak kalır. Şemadaki "salt okunur"
ilkesiyle de çelişir. Eksik okul, senkron kaynağından düzeltilir.

Bu karar ekranda görünür olmalı: sekme yerine kısa bir açıklama satırı —
"Okul kayıtları MEB kurum kodundan gelir, elle eklenmez."

### 4e. `src/app/panel/okullar/disa-aktar/route.ts` — yeni ☑

Aşama 1'in xlsx katmanıyla.

### Bitti sayılma ölçütü

- Merkez hesabı ekranı süzgeçsiz açtığında liste değil arama yönergesi görür.
- Koordinatör hesabı ekranı açtığında kendi ilinin listesi doğrudan gelir.
- Kurum koduyla arama tek okulu getirir; ad araması ortadan da eşleşir
  ("şeyh isa" → Akhisar Şeyh İsa Anadolu Lisesi).
- Kırılımdan (`yonetim/ilce/...`) gelen bağlantı aynı ekrana süzgeçle düşer ve
  iki ekrandaki öğrenci/öğretmen sayıları birbirini tutar.
- Danışman hesabı ekranı açamaz (kapsam kuralı `ogretmenEnvanteriGorebilirMi`
  değil, `yonetimPanosuGorebilirMi` ile hizalanır — okul envanteri il/ülke
  seviyesi bir bakıştır).

---

## Aşama 5 — Ekip türü, danışman, merkezi liste ve danışmansız ekipler

**Tek şema değişikliği gerektiren aşama; bu yüzden sona bırakıldı.**

### 5a. Şema ☑ — `prisma/schema.prisma`

```prisma
enum EkipTuru {
  OKUL_TAKIMI
  CALISMA_GRUBU
  IL_GENCTEK_EKIBI
}

model Ekip {
  // ... mevcut alanlar
  tur                 EkipTuru @default(CALISMA_GRUBU)
  kurumKodu           Int?     @map("kurum_kodu")   // OKUL_TAKIMI için zorunlu
  danismanKullaniciId Int?     @map("danisman_kullanici_id")
}
```

Karar notları:

- **`kurumKodu` nullable ama tür `OKUL_TAKIMI` ise zorunlu** — veritabanı
  kısıtıyla (`ck_ekip_okul_takimi_kurum`, migration'da). Repodaki
  `ck_ogrenci_gorev_kapsam` ile aynı desen: kapsam sütunu role göre zorunlu.
- **`danismanKullaniciId` nullable kalır** — danışmansız ekip zaten aradığımız
  şey. Zorunlu yapılsaydı Aşama 5c'nin ekranı boş kalırdı.
- **Mevcut kayıtların göçü:** var olan tüm ekipler il seviyesinde kuruldu,
  `CALISMA_GRUBU` varsayılanı doğru. Veri düzeltmesi gerekmez.
- **`aktif=false` danışman "danışmansız" sayılır.** Manisa ekranının başlığı da
  böyle diyor: "danışman öğretmeni olmayan **veya pasif danışmana sahip**".

Migration: `npx prisma migrate dev --name ekip-tur-danisman`.

### 5b. Ekip kurma/düzenleme formu ☑ — `src/app/panel/ekipler/page.tsx`

Tür seçimi ve danışman seçimi eklenir. `OKUL_TAKIMI` seçildiğinde okul seçimi
zorunlu hâle gelir. Kural mantığı `src/lib/ekip/kurallar.ts`'e (mevcut dosya,
`tests/ekip-kurallar.test.ts` var) taşınır ve testle doğrulanır.

### 5c. `src/app/panel/ekip-yonetimi/page.tsx` ☑ — yeni (merkezi liste)

Mevcut `panel/ekipler` "benim ekiplerim" ekranıdır ve öyle kalır. Yönetici
listesi ayrı bir kapıdır.

Ekran, `manisa/3.png` düzeninde kurulur:

| Öğe | İçerik |
|---|---|
| Arama | ekip adı |
| Süzgeç | tür (`Tüm ekip türleri` / Okul Takımı / Çalışma Grubu / İl GençTek Ekibi) |
| Süzgeç | `?danismansiz=1` (bkz. 5d) |
| Sayaç | `Toplam N kayıt · 1–50 arası gösteriliyor` |
| Sütun | Ekip Adı · **Tür rozeti** · Danışman · Üye sayısı · İşlemler |
| İşlemler | görüntüle · **satır bazlı xlsx** (o ekibin üye listesi) · düzenle · kapat |

Karar notları:

- **Tür rozeti renkle ayrışır** (3.png'deki gibi: Okul Takımı mavi, Çalışma
  Grubu gri, İl GençTek Ekibi sarı). 144 kayıtlık bir listede tür, okunacak bir
  sütun değil taranacak bir işarettir.
- **Satır bazlı xlsx ikonu, ekip detayına girmeden üye listesini verir.**
  Aşama 2'nin ortak düğmesi burada satır ölçeğinde kullanılır; ayrı bir indirme
  mantığı yazılmaz.
- **Sayfalama zorunlu** — Manisa'da 144 ekip var, bizde ulusal ölçekte çok daha
  fazlası olacak. Öğrenci envanterindeki `SAYFA_BOYUTU` deseni birebir alınır.
- **Üye sayısı 0 olan ekip gizlenmez.** 3.png'de böyle kayıtlar var (kurulmuş
  ama doldurulmamış ekipler) ve asıl aksiyon gerektiren kayıt onlar.

İki ekranın ayrı tutulmasının nedeni `panel/ekipler`'in dosya başındaki notta
yazılı: o ekran koordinatörün kendi kurduğu ve üyesi olduğu ekipleri tek yerde
gösteriyor. Yönetici listesini oraya karıştırmak, koordinatörün kendi ekibini
144 kaydın içinde aramasına yol açardı.

### 5d. Danışmansız ekipler ☑

Ayrı ekran açılmadı; merkezi listeye `?danismansiz=1` süzgeci eklendi.
Kısayol kartı yerine **ekranın kendi üstünde uyarı şeridi** var: "Bu kapsamda N
ekibin danışman öğretmeni yok ya da danışmanı pasif · Yalnızca onları göster".
Yönetim Paneli'ne ayrıca kart koymak, aynı listeye üçüncü bir kapı açardı;
uyarı ise sayıyı zaten ekrana bakan kişiye gösteriyor. Gerekçe: liste, sütunları
ve dışa aktarımı birebir aynı — ikinci bir ekran aynı kodun kopyası olurdu.
Öğrenci envanterindeki `danismansiz=1` süzgeciyle de aynı desen.

### Bitti sayılma ölçütü

- ☑ Migration temiz uygulandı; mevcut ekip `CALISMA_GRUBU` varsayılanına düştü
  ve **veri düzeltmesi gerekmedi** (hepsi zaten il seviyesindeydi).
- ☑ **Kısıt dört yönde de doğrulandı** (doğrudan veritabanı yazımıyla):
  okul takımı + kurum → kabul · okul takımı, kurumsuz → red · çalışma grubu,
  kurumsuz → kabul · çalışma grubu + kurum → red.
- ☑ Formdan okulsuz okul takımı kurulamıyor; ekranda tam mesaj görünüyor
  ("Okul takımı için okul seçilmesi zorunludur") ve liste değişmiyor.
- ☑ Ekip Yönetimi sayıları tutarlı: süzgeçsiz 2 · `?danismansiz=1` 2 ·
  `?tur=OKUL_TAKIMI` 1 · `?tur=CALISMA_GRUBU` 1 (**1 + 1 = 2**).
- ☑ Öğrenci hesabında dışa aktarma 404.
- ☑ Aşama 4'teki "Ekip" sütunu ve üç sekme (Tüm / Ekip tanımlanan / Ekip
  tanımlanmayan) açıldı; canlı veride ekipli 1, ekipsiz 1 okul.
- ☑ 1022 test, lint ve build temiz.

**Doğrulamada bir yanlış alarm yaşandı ve not edilmeye değer:** ilk betik form
POST'u uçarken sayfayı yüklüyordu ve "süzgeçsiz 1 satır, danışmansız 2 satır"
gibi imkânsız bir sonuç veriyordu. Alt küme üst kümeden büyük olamayacağı için
ölçüm sorgulandı; doğru beklemelerle tekrar edildiğinde sayılar tuttu. Ürün
hatası yoktu.

---

## Aşama 6 — Etkinlikler ekranının güçlendirilmesi (`manisa/9.png`)

Bu aşama yeni bir ekran açmaz; **var olan `panel/etkinlikler` ekranını**
9.png'deki düzeye çıkarır. Bizde zaten ızgara ve liste olmak üzere iki görünüm
var (`IzgaraGorunumu` / `ListeGorunumu`), rozet şeridi var, CSV indirme var.
Eksik olan dört şey aşağıda.

### 6a. Sayfalama ☑ — **defekt, sadece eksik özellik değil**

`panel/etkinlikler/page.tsx` bugün kapsamdaki **bütün** etkinlikleri tek
sorguyla çekip tek sayfaya basıyor: dosyada `take` / `skip` yok, başlıkta
`${faaliyetler.length} kayıt` yazıyor ve CSV düğmesi de aynı sayıyı gösteriyor.

Öğrenci envanterinde bu iş çoktan doğru yapılmış (`SAYFA_BOYUTU = 50`,
`skip`/`take`, `1–50 / N kayıt` altbilgisi). Etkinlikler ekranı o desenden
geride kalmış. Manisa 26 kayıtla çalışıyor ve orada sorun görünmüyor; ulusal
ölçekte bu ekran hem sayfa ağırlığı hem sorgu süresi olarak sorun çıkarır.

Öğrenci envanterindeki sayfalama birebir uygulanır: aynı sabit, aynı altbilgi,
aynı düğme sınıfı. **Sayfa süzgeçlerle birlikte adres çubuğunda taşınır** ki
dışa aktarma bağlantısı (Aşama 2a) sayfayı değil süzgeci alsın — indirilen
dosya her zaman kümenin tamamı olmalı, ekrandaki 50 satır değil.

### 6b. Durum sekmeleri ☑ — Devam Eden / Tamamlanan

9.png'de üç sekme var: Etkinlikler (kart) · Devam Eden (tablo) · Tamamlanan
(tablo). Bizde durum bilgisi rozet olarak var ama **sekme yok**, yani
"tamamlananları göster" tek tıkla yapılamıyor.

Sekmeler adresten okunur (`?durum=devam` / `?durum=tamamlanan`), görünüm tercihi
(ızgara/liste) ondan **ayrı** bir parametre kalır. Manisa'da sekme ve görünüm
iç içe geçmiş (Etkinlikler sekmesi = kart, diğer ikisi = tablo); bu, "tamamlanan
etkinlikleri kart olarak görmek" isteyeni çıkmaza sokar. İki ekseni ayrı
tutmak bizde zaten böyle kurulu, korunur.

### 6c. Katılımcı sayısı sütunu ☑

Liste görünümüne katılımcı sayısı eklenir. Sayı, raporlar ekranındaki gibi
`_count.basvurular` değil **`SECILDI` başvuru sayısı** olur: "kaç kişi başvurdu"
ile "kaç kişi katıldı" farklı sorular ve tamamlanmış bir etkinlikte sorulan
ikincisidir. Aşama 1b'nin öğrenci/öğretmen sayımıyla aynı tanım kullanılır ki
ekrandaki sayı ile Excel'deki sayı birbirini tutsun.

### 6d. Satır bazlı rapor göstergesi ☑

9.png'nin en iyi ayrıntısı: İşlemler sütunundaki rapor ikonu, raporu **yazılmış**
etkinliklerde dolu yeşil, yazılmamışlarda soluk. `.xlsx` çıktısıyla karşılaştırdım
— tam olarak "Rapor girilmedi" satırlarıyla örtüşüyor. Liste, raporu eksik
etkinliği tek bakışta veriyor.

**Bizim "Raporu bekleyenler" görev listemiz kaldırılmaz.** `raporlar/page.tsx`
içindeki not (J3 · 6 Ağustos 2026) o bölümün neden bir *görev listesi* olarak
kurulduğunu açıklıyor: yukarıdan aşağı okunup bitirilen bir iş listesi, arşivden
farklı görünmeli. Satır göstergesi onun yerine değil, **yanına** gelir:
koordinatör etkinlik listesinde gezerken de eksiği görür, ayrı ekrana gitmek
zorunda kalmaz.

Gösterge salt okunur bir işarettir, ikon değil **etiket** olur (`Rapor yazıldı` /
`Rapor bekliyor`): renk tek başına bilgi taşımamalı, ekran okuyucuda ve renk
körlüğünde de okunabilmeli.

### Bitti sayılma ölçütü

- ☑ Sayfalama eklendi (`SAYFA_BOYUTU = 50`, öğrenci envanteriyle aynı desen);
  başlık ve altbilgi toplam kayda göre yazıyor.
- ☑ Dışa aktarma bağlantısı sayfa numarasını taşımıyor; dosya kümenin tamamı.
- ☑ Sekmeler canlı doğrulandı ve **aritmetik tutuyor**: devam 2 + tamamlanan 3
  = toplam 5.
- ☑ Sekme (`?zaman=`) ile görünüm tercihi (`?gorunum=`) ayrı eksen; birbirini
  ezmiyor. Manisa'da ikisi iç içe ve bu "tamamlananları kart olarak görmek"
  isteyeni çıkmaza sokuyor.
- ☑ "Raporu bekliyor" rozeti zaten vardı; eksik olan OLUMLU gösterge eklendi
  ("Rapor yazıldı"). Manisa bunu renkli/soluk ikonla yapıyor; bizde ETİKET,
  çünkü renk tek başına bilgi taşımamalı.
- ☑ 1037 test, lint ve build temiz.

---

## Aşama 7 — İstatistik görselleştirmesi

Manisa'da da yok; ulusal ölçekli bir sistemde olması gerektiği için eklendi
(15 Ağustos 2026 kararı).

Bugün yönetim paneli tamamen sayılarla çalışıyor: "danışman yok: 67 · öğrenci
yok: 100". Merkezin asıl sorduğu soru genelde **"geçen yıla göre ne oldu"** ve
veri bunu vermeye hazır — `kirilim-istatistigi.ts` zaten `yil` süzgeci alıyor,
`egitimOgretimYiliAraligi` var. Eksik olan yalnızca gösterim.

### 7a. Kütüphane kararı ☑: **sunucuda üretilen satır içi SVG**

Grafik kütüphanesi (Recharts, Chart.js, D3) **eklenmez.** İki nedeni var:

1. **Depo minimal bağımlılıkla kurulmuş.** Bugün tek arayüz bağımlılığı
   `lucide-react` (ikonlar). Bir grafik kütüphanesi, bu ekranların tek başına
   taşıdığından çok daha büyük bir yüzey getirirdi.
2. **Panel sunucu bileşenleriyle çalışıyor.** Recharts ve benzerleri istemci
   bileşeni gerektirir; grafik için `"use client"` sınırı açmak, bugün sunucuda
   kalan sayfaları istemciye taşırdı.

Bunun yerine `src/components/grafik/` altında sunucuda render edilen küçük SVG
bileşenleri yazılır. Kapsam dar: **sütun, çizgi ve yatay bar** — üçü de birkaç
yüz satır. Etkileşim (yakınlaştırma, sürükleme) hedeflenmiyor; sorulan sorular
tek bakışta cevaplanan sorular.

### 7b. Nereye konur ☑

| Ekran | Grafik |
|---|---|
| Raporlar | eğitim-öğretim yılına göre etkinlik sayısı — çizgi ☑ |
| Raporlar | çalışma grubuna göre etkinlik — yatay bar ☑ |
| ~~Yönetim Paneli~~ | **vazgeçildi** — 81 il bir grafiğe sığmaz; dataviz kuralı "anlam taşıyan yediden fazla sınıf → tablo" diyor ve kırılım kartları zaten o tablo |
| ~~Okul Eksik Durum~~ | **vazgeçildi** — dört sayı zaten KPI şeridi olarak duruyor; dataviz "bir avuç başlık sayısı → stat tile, grafik değil" diyor. Aynı dört sayıyı ikinci kez bar olarak çizmek fazlalık olurdu |

### 7c. Tasarım kuralları ☑

Uygulamaya geçildiğinde **`dataviz` yönergesi yüklenip ona göre çalışılır** —
renk paleti, eksen, etiket ve erişilebilirlik kararları oradan gelir. Bu
belgede tekrar edilmez.

Depoya özgü iki bağlayıcı kural:

- **Renk tek başına bilgi taşımaz.** Aşama 6d'deki etiket kararının aynısı;
  her seri ayrıca etiketlenir ve sayısal değer okunabilir olur.
- **Tema değişkenleri kullanılır**, sabit renk kodu yazılmaz. Depoda
  `src/lib/tema.ts` ve `TemaSecici` var; grafik açık/koyu temada da okunmalı.

### Bitti sayılma ölçütü

- ☑ Grafikler sunucuda üretiliyor; hiçbir sayfa istemci bileşenine dönmedi.
  Yeni bağımlılık yok.
- ☑ Renk `dataviz` doğrulayıcısından geçirildi: her iki tema vurgu rengi de
  (#c4161c ve #2f6fb5) beyaz kart yüzeyine karşı bütün kontrolleri geçiyor.
- ☑ **Koyu tema yok** — uygulama `color-scheme: light` ve iki teması da açık
  (globals.css). Koyu mod eklenirse tek iş, vurgu renginin o yüzeye göre
  yeniden basamaklanması; bileşenler zaten tema değişkeni kullanıyor.
- ☑ Grafik verisi ekranın kapsamıyla aynı fonksiyondan besleniyor.
- ☑ 10 birim test (`grafik-verisi.test.ts`).

**Ekran görüntüsüne bakınca bir hata yakalandı** (dataviz · "render it and look
at it"): çizgi grafiğinin son x-ekseni etiketi sağ kenardan taşıp kırpılıyordu
("2026-20…"). Uç etiketler içeri yaslandı; boşluğu büyütmek yerine hizayı
çevirmek seçildi çünkü etiket uzunluğu değişse de taşma olmaz.

---

## Aşama 8 — Öğrenci deneyim süzgeci ☑

Manisa'nın `2.png` ekranındaki "Deneyimler" süzgeci. Plana sonradan alındı,
sonra **kapsamı köklü biçimde daraldı.**

> **UYGULAMADA DEĞİŞTİ: YENİ TABLO AÇILMADI.** Plan `OgrenciDeneyimi` adında
> yeni bir model öngörüyordu. Şemaya bakınca görüldü ki bu veri ZATEN VAR:
> `KullaniciKazanim` tablosu `DIS_ETKINLIK` (TÜBİTAK 4006, TEKNOFEST),
> `YARISMA_DERECESI`, `SERTIFIKA`, `TOPLULUK` tiplerini tutuyor ve modelin
> kendi notu "rozet sistemi açıldığında yeni tablo AÇILMAZ, bu tablonun `tip`
> alanı genişletilir" diyor.
>
> Yeni tablo mevcut modeli ikizlerdi: aynı öğrencinin TEKNOFEST katılımı iki
> yerde durur, biri güncellenip diğeri unutulurdu.
>
> **Eksik olan tablo değil, ARAMA EKSENİYDİ.** Yapılan iş: öğrenci envanterine
> deneyim süzgeci (tip + serbest metin), listeye ve dosyaya "Deneyimler"
> sütunu. Şema değişikliği YOK, migration YOK.

Alınma gerekçesi: bu bir profil süsü değil, bir **arama ekseni**. Manisa
"TEKNOFEST deneyimi olan öğrenciler" diye süzüp etkinliğe kimi çağıracağını
buluyor. Bizde `CalismaGrubu` öğrencinin neye *ilgi duyduğunu* söylüyor, neyi
*yaptığını* söylemiyor — eşleştirme için ikisi farklı sorular.

### 8a. ~~Şema~~ — gerek kalmadı

```prisma
model OgrenciDeneyimi {
  id          Int      @id @default(autoincrement())
  ogrenciId   Int      @map("ogrenci_id")
  deneyimTuru Int?     @map("deneyim_turu_id")   // referans listesi
  serbestAd   String?  @map("serbest_ad") @db.VarChar(200)  // "Diğer: …"
  yil         String?  @db.VarChar(9)
  aciklama    String?  @db.Text
  // ...
}
```

Karar notları:

- **Referans listesi + serbest giriş birlikte.** 2.png'de ikisi de var ve
  sonucu görünüyor: "Diğer: Bilge hukuku ve güvenli internet", "Diğer: Bilişim
  hukuku güvenli internet", "Diğer: Bilişim hukuku ve güvenli internet" —
  aynı şeyin üç yazımı, üç ayrı süzgeç satırı. Serbest giriş süzgeç listesini
  çöpe çeviriyor.
  Bizde serbest metin **süzgeçte görünmez**, yalnızca öğrencinin profilinde
  durur. Süzgeç yalnızca referans listesinden beslenir. Liste `CalismaGrubu`
  gibi yönetilir: silme yok, pasife alma var.
- **Serbest girişler merkeze rapor edilir** ki listeye eklenmesi gerekenler
  görülsün — süzgeçten düşürmek onları görünmez kılmamalı.
- Öğrenci kendi kaydını girer; danışman ve koordinatör görür. Doğrulama
  (belge isteme) **bu aşamada yok** — `KullaniciKazanim` zaten doğrulanmış
  başarıyı tutuyor, deneyim beyandır ve öyle etiketlenir.

### 8b. Ekranlar

- Öğrenci profiline "Deneyimlerim" bölümü (`ProfilDuzenleme` içinde).
- Öğrenci envanterine çok seçimli deneyim süzgeci + sütun.
- Aşama 2'nin dışa aktarımına sütun olarak girer.

### Bitti sayılma ölçütü

- ☑ Süzgeç canlı doğrulandı: süzgeçsiz 305 öğrenci → `?kazanim=URUN` 1 öğrenci
  (alt küme). Metin araması ve tip+metin birleşimi de eşleşiyor.
- ☑ Tip ve metin AYNI kazanım kaydında aranıyor (birim testli): ayrı iki `some`
  yazılsaydı, tipi eşleşen bir kaydı ve metni eşleşen BAŞKA bir kaydı olan
  öğrenci de listeye girerdi.
- ☑ Dosyaya "Deneyimler" sütunu eklendi; GençTek etkinlik katılımı buraya
  GİRMİYOR — o zaten sistemin kendi kaydından geliyor.
- ☑ Süzgeç iki alan: tip sabit listeden, metin serbest. Manisa'da ikisi tek
  listede ve sonucu `2.png`'de görünüyor — elle yazılmış girdiler süzgeç
  listesini dolduruyor, aynı şeyin üç yazımı üç ayrı seçenek oluyor.
- ☑ 1042 test, lint ve build temiz.

---

---

## Son tarama (15 Ağustos 2026)

Sekiz aşama bittikten sonra "eksik kaldı mı" diye yapılan taramada **üç şey
bulundu ve üçü de düzeltildi.** Hiçbiri ekranda görünen bir arıza değildi;
üçü de sessiz kalacak türdendi.

1. **Doğrulama betiği 18 rotanın 13'ünü kapsıyordu.** Öğretmenler, paydaşlar,
   yönetim kırılımı, etkinlik rapor dökümü ve iki satır bazlı rota
   sınanmıyordu. Kapı kontrolü olmayan bir rota, açıldığı gün değil ancak
   birinin fark ettiği gün görünür olurdu. Hepsi eklendi.

2. **`raporlar/dokum` ortak yüzeye hiç geçirilmemişti.** Aşama 1'de
   `disa-aktarma.ts` daha yokken yazılmış, Aşama 2'de altı rota çevrilirken
   atlanmıştı. Sonuç: `?bicim=csv` çalışmıyordu ve betik XLSX ikili verisini
   metin diye ayrıştırıp **"0 satır"** raporluyordu — yani rotayı sınadığını
   sanıyor, hiçbir şey doğrulamıyordu. Çevrildikten sonra 3 satır okundu.

3. **Betiğin etkinlik bağlantısı seçicisi yanlıştı.** Sayfadaki ilk
   `/panel/etkinlikler/...` bağlantısı "yeni" ya da "disa-aktar" olabiliyor;
   seçici kayıt bağlantısını (sayıyla biten) arayacak biçimde düzeltildi.

Tarama ayrıca temiz çıkanları da gösterdi: bıraktığım `TODO`/`FIXME` yok,
geçici dosyalarım temizlendi (kalan `.tmp-*` dosyaları 12 Ağustos tarihli,
bu oturumdan önce vardı).

---

## Satır işlemleri sütunu (`SatirIslemleri`)

İstek (15 Ağustos 2026): "her görselde işlemler var — Excel, düzenle,
görüntüle, sil — güzel duruyor."

Düzen kuruldu (`src/components/SatirIslemleri.tsx`) ama **dört ikonun ikisi
bizde yok ve bu bir eksik değil:**

- **Düzenle** — liste kayıtlarının çoğu salt okunur: kimlik alanları
  AuthProvider'dan, okullar MEB kurum kodundan geliyor. Kalem ikonu, basınca ya
  hiçbir şey yapmayan ya da kaynağı değiştiremeyeceği için sessizce geri
  alınacak bir düğme olurdu.
- **Sil** — depoda kalıcı silme yok: ekip *kapatılır*, paydaş *pasife alınır*,
  ilan *kapatılır*, faaliyet *iptal edilir*. Çöp kutusu bu ayrımı silerdi;
  kapatma eylemleri kendi ekranlarında kendi adlarıyla duruyor.

Kalan ikisi gerçekten yapılabilen işler ve bileşen onları taşıyor: **görüntüle**
ve **satır bazlı Excel**. İlk kullanım yeri Ekip Yönetimi listesi — Excel ikonu
o ekibin ÜYE LİSTESİNİ indiriyor, yani merkezi listenin cevaplamadığı "şu ekipte
kimler var" sorusunu.

Bileşen başka listelere de eklenebilir; ikon tek başına bırakılmıyor, her
bağlantının `aria-label` ve `title` değeri var.

---

## Aşama dışı bırakılanlar

Kayıt için: incelemede tespit edilen ama bu plana **alınmayan** başlıklar.

- **Kullanıcı CRUD (Yeni Kullanıcı / düzenle / sil).** Kimlik alanları
  AuthProvider'dan geliyor ve şemada salt okunur olarak tanımlı. Bilinçli bir
  tasarım farkı; değiştirilmesi ayrı bir karar gerektirir. Yalnızca "aktif/pasif
  duruma göre süzme" ucuz bir kazanç olarak ileride ele alınabilir.
- **Doğum tarihi alanı ve veli/vasi onayı.** 15 Ağustos 2026'da değerlendirildi
  ve **kapsam dışı bırakıldı.** Tespit şuydu: kod dört yerde "kullanıcıların
  çoğu 18 yaş altı" diyor ama şemada doğum tarihi yok, dolayısıyla sistem kimin
  reşit olmadığını bilmiyor ve KVKK açık rızası yalnızca kullanıcının
  kendisinden alınıyor. Karar bilinçlidir; ileride KVKK tarafında veli onayı
  gerektiren bir görüş çıkarsa bu maddenin yeniden açılması gerekir, çünkü yaş
  bilgisi olmadan uygulanamaz.
