# GençTek — İş Kuralları

İçindekiler:
1. Kimlik doğrulama ve kullanıcı sağlama (mock aşama)
2. Roller
3. Danışman atama ve devir
4. Öğrenci görev rolleri
5. Çalışma grupları
6. Faaliyet yönetimi
7. Dosya, görsel ve yorumlar
8. Başvuru ve değerlendirme
9. Bildirimler
10. KVKK ve loglama
11. Kenar durumlar
12. Rol/Atama Envanteri (proje yöneticisi)
13. Rozet / katkı kategorileri — Faz 2

---

## 1. Kimlik doğrulama ve kullanıcı sağlama (mock aşama)

EBA SSO erişimi henüz yok. Bu aşamada:

- Bir `AuthProvider` arayüzü tanımla: girdi kimlik bilgisi, çıktı `{ kullaniciId, ad, soyad, cinsiyet, kurumKodu, il, ilce, sinif|brans, egitimOgretimYili }`.
- Mock implementasyon: sabit test kullanıcıları (birkaç öğrenci, birkaç öğretmen, farklı okul/il kombinasyonlarıyla) döndürsün. Basit bir "test kullanıcısı seç" ekranı yeterli — şifre/kayıt akışı kurma, EBA zaten bunu yapmayacak.
- **Bu bölüm yalnızca okul tarafını anlatır.** Mezun ve paydaş temsilcisinin kimliği `AuthProvider`'dan hiç geçmez; onlar e-posta ve şifreyle girer (Bölüm 17). İki akış oturum katmanında birleşir: çerez yalnızca `authProviderId` taşır, rol ve kapsam her istekte veritabanından okunur. EBA SSO bağlandığında dış akış olduğu gibi kalır.
- Üst katmanlar (profil, yetki, atama) `AuthProvider` çıktısına göre çalışsın; EBA geldiğinde yalnızca bu katman değişecek.

**İlk giriş:** Kullanıcı yoksa oluştur. Rol tayini:
- `AuthProvider` öğrenci döndürüyorsa → `OGRENCI`
- Öğretmen ise → rolsüz kullanıcı, danışman listesine girmesi için kendi işaretlemesi gerekir
- `IL_KOORDINATOR` ve `PROJE_YONETICISI` asla otomatik verilmez, elle atanır

**Sonraki girişler:** `AuthProvider`'dan gelen alanları güncelle. Kurum kodu değiştiyse Bölüm 3'teki devir akışını tetikle.

**Gecelik senkron:** Öğretmen uzun süre giriş yapmazsa kurum kodu değişikliği fark edilmez. Bu yüzden gecelik bir iş, aktif danışmanların kurum bilgisini kontrol eder ve değişenler için devir akışını çalıştırır. Mock aşamada bu işi test verisiyle de çalıştırılabilir şekilde kur.

**Salt okunur alanlar (mock aşamada da geçerli):** Ad, Soyad, Cinsiyet, Okul adı, Kurum kodu, Okul türü, İl, İlçe, Sınıf (öğrenci), Branş (öğretmen), Eğitim-öğretim yılı.

Bu alanların yanında şu açıklama gösterilir: *"Bu bilgi e-Okul kayıtlarından gelmektedir; hatalı ise okul idaresine başvurunuz."*

---

## 2. Roller

**Okul tarafı (kimliği EBA'dan gelir):**
`OGRENCI` · `DANISMAN` · `IL_KOORDINATOR` · `PROJE_YONETICISI`

**EBA dışı (kimliği başvuruyla açılır, bkz. Bölüm 17):**
`MEZUN` · `PAYDAS_TEMSILCISI`

Kurallar:
- Bir öğretmen aynı anda hem `DANISMAN` hem `IL_KOORDINATOR` olamaz (DB kısıtı).
- `IL_KOORDINATOR` atamasını yalnızca `PROJE_YONETICISI` yapar.
- `PROJE_YONETICISI` = YEĞİTEK kullanıcısı. Ayrı bir süper-admin rolü yok.
- Tüm öğretmenler sisteme giriş yapabilir; danışman listesinde görünmek için `DanismanOlarakGorevAlmakIstiyorum` alanını işaretlemeleri gerekir. Onay süreci yoktur.
- `MEZUN` ve `PAYDAS_TEMSILCISI` **otomatik verilmez ve elle de atanmaz**: yalnızca onaylanan bir dış başvurudan doğar (Bölüm 17). İkisinin de **kurum kodu yoktur** — bu, kapsam filtrelerini yazarken sürekli akılda tutulması gereken tek fark.
- İki dış rol, kapsam filtrelerinin hiçbirinde varsayılan olarak "görür" tarafına düşmez. Yetkileri `permissions.md` Bölüm 1.1'de sayılıdır ve **dar başlangıç** ilkesine tabidir.

---

## 3. Danışman atama ve devir

Eşleştirme anahtarı **kurum kodu**dur.

### İlk atama

Öğrenci profilini tamamladığında:

- Okulda danışman işaretli öğretmen **birden fazla** → öğrenci listeden seçer
- **Tek** → otomatik atanır
- **Hiç yok** → il koordinatörüne atanır

Öğrenci profilinde her zaman tek bir danışman gösterilir.

### Danışman ayrıldığında (kurum kodu değişimi)

| Okulda kalan danışman | Yapılacak |
|---|---|
| Tek danışman kaldı | Öğrenciler otomatik ona devredilir |
| Birden fazla danışman var | Öğrenciye "danışmanın değişti, yeniden seç" bildirimi; seçim yapılana kadar geçici olarak il koordinatörüne bağlanır |
| Hiç danışman kalmadı | İl koordinatörüne devredilir |

Devir işleminde eski `DanismanAtama` kaydı kapatılır (`bitisTarihi` yazılır), yeni kayıt açılır. Güncelleme yapma — geçmiş kaybolur.

### Okula sonradan danışman gelirse

İl koordinatörüne bağlı öğrenciler **otomatik devredilmez**. İl koordinatörüne "okulunuzda yeni danışman öğretmen var, X öğrenci devredilebilir" bildirimi gider; devri o onaylar.

### Öğretmen tek bir öğrencinin danışmanlığını bırakırsa (6 Ağustos 2026)

Öğretmen görevin TAMAMINI bırakmadan, tek bir öğrenciyi bırakabilir. Üç şey
birlikte olur ve hiçbiri isteğe bağlı değildir:

1. **Gerekçe zorunlu** (en az 10 karakter).
2. **İl koordinatörüne bildirim** gider; gerekçe ve öğrencinin yeni durumu
   metinde yazılıdır.
3. **Erişim kaydına** yazılır.

Sebebi açık bir kötüye kullanım kapısıdır: "zor" bulunan öğrencinin sessizce
bırakılması. Üçü birden olmadan karar görünmez kalır.

**Öğrenci nereye gider: HİÇBİR YERE — danışmansız kalır** (10 Ağustos 2026'da
değişti). Öğrenciye "yeni danışmanını seç" bildirimi gider; okulundaki danışman
öğretmenlerden birini kendisi seçebilir, bir öğretmen de onu "Okulumdaki
danışmansız öğrenciler" listesinden danışmanlığına alabilir.

Eskiden yukarıdaki devir tablosu uygulanıyor, devredilecek kimse yoksa bırakma
hiç yapılmıyordu. İkisi de bırakıldı: zorla devir, öğrenciyi istemeyen bir
öğretmenin üzerine bırakıyordu (oysa danışmanlık rızaya dayanır ve kuralın
tamamı "danışmanı öğrenci seçer" üzerine kurulu); bırakmanın engellenmesi ise
öğretmeni yürümeyen bir bağda tutuyordu.

Bu, **Değişmezler 2'ye ("boşta öğrenci kalamaz") bilinçli bir istisnadır** ve
yalnızca ELLE, GEREKÇELİ bırakmayı kapsar. Otomatik akışlarda (ilk atama,
öğretmenin okuldan ayrılması, rolün kaldırılması) devir zinciri aynen
yürümektedir. Danışmansız öğrenci gizli değil GÖRÜNÜR bir durumdur: öğrenci
listelerinde "Atanmadı" rozeti, "Yalnızca danışmanı olmayanlar" süzgeci ve
koordinatörün profilindeki danışmansız sayacı bunun içindir.

**Kim bırakabilir:** öğrencinin KENDİ danışmanı ve — gerektiğinde — öğrencinin
kapsamındaki **il koordinatörü ile proje yöneticisi** (10 Ağustos 2026). Başka
bir danışman öğretmen bırakamaz; o, öğrenci çekme kapısı olurdu.

**Öğretmenin görevin TAMAMINI tek tıkla bırakması kalktı** (10 Ağustos 2026):
bütün öğrencileri gerekçesiz ve tek tek karar verilmeden devir akışına
sokuyordu. Rolü kapatan yol (okuldan ayrılma, rol envanterinden kaldırma)
duruyor.

### Öğrenci kendi isteğiyle danışman değiştirirse — ONAYA TABİ (20 Ağustos 2026)

**İstek:** *"danışman öğretmen seçiminde öğretmene veya il koordinatörüne onay düşsün sürekli değişmek isteyebilirler"*.

| Durum | Ne olur |
|---|---|
| Öğrencinin danışmanı **yok** (ilk seçim) | Atama **hemen** yapılır, onay yok |
| Öğrencinin danışmanı **var** (değişiklik) | **Talep** açılır; karar verilene kadar mevcut danışman devam eder |

**İlk seçim neden onaya girmez:** Değişmez 2 — öğrenci boşta kalamaz. Onay beklerken öğrenci danışmansız kalırdı; üstelik isteğin gerekçesi "sürekli **değişmek**", ilk seçimde değişen bir şey yok.

**Kararı kim verir:** öğrencinin istediği **öğretmen** ya da öğrencinin ilindeki **il koordinatörü**. Koordinatörün yetkisi aynı zamanda tıkanma valfidir — cevap vermeyen bir öğretmen, öğrenciyi süresiz bekletebilecek tek nokta olurdu. **Eski danışmana sorulmaz** (bırakılan tarafa veto vermek, öğrenciyi ayrılmak istediği kişinin iznine bağlardı) ama haber gider.

**Ret gerekçesi zorunlu** (en az 5 karakter): gerekçesiz ret, öğrenciyi aynı isteği tekrarlamaya iterdi. Gerekçe öğrencinin seçim ekranında kalıcı olarak görünür — bildirim okununca düşer, ekrandaki satır kalır.

**Aynı anda tek bekleyen talep** (`ux_danisman_talebi_tek_bekleyen`). Öğrenci talebini geri çekebilir; kayıt silinmez, `GERI_CEKILDI` olur.

Tek kısıt değişmedi: yalnızca **kendi kurum kodundaki ve danışman olarak işaretli** öğretmenler arasından seçim yapılabilir. Uygunluk **onay anında yeniden sorulur** — talep açıldıktan sonra öğretmen görevi bırakmış olabilir.

Veri modelinde: talep `danisman_talebi` tablosunda durur (atama tablosuna yazılmaz — gerekçesi migration başlığında). Onaylanınca eski kayıt `kapanma_nedeni = OGRENCI_ISTEGI` ile kapanır, yeni kayıt `atama_tipi = OGRENCI_SECTI` ile açılır.

Ekranlar: öğrenci `/panel/danisman-secim`, karar veren `/panel/ogrenciler#danisman-talepleri`; sayaç panelde "Dikkat gerektirenler" içinde.

### Danışmanı olan öğretmen il koordinatörü yapılırsa

**Karar verildi (varsayım değil).** Atama **engellenmez**. Sıra şudur:

1. Öğretmenin danışmanlık görevi kapatılır (bir öğretmen aynı anda hem danışman hem il koordinatörü olamaz — DB kısıtı).
2. İl koordinatörlüğü açılır.
3. Öğretmenin üzerindeki öğrenciler yukarıdaki **devir tablosuna göre** yeniden dağıtılır: okulda tek danışman kaldıysa ona; birden fazla danışman varsa öğrenciye "yeniden seç" bildirimi gider ve seçim yapılana kadar geçici olarak il koordinatörüne bağlanır; hiç danışman kalmadıysa il koordinatörüne devredilir.
4. İşlemi yapan proje yöneticisine **"X öğrenci yeniden dağıtıldı"** uyarısı gösterilir.

Dağıtım rol değişiminden **sonra** yapılır: böylece "il koordinatörüne devret" kararı yeni koordinatörü (yani bu öğretmeni) bulur. Okulda başka danışman kalmadıysa öğrenciler fiilen yerinde kalır — aynı kişi yeniden yazılmaz ve gereksiz "danışmanınız değişti" bildirimi gitmez.

---

## 4. Öğrenci görev rolleri

Üç görev rolü vardır ve bunlar **öğrencilere** verilir:

- **İl Temsilcisi** — her ilde bir öğrenci, il koordinatörü atar
- **İlçe Temsilcisi** — her ilçede bir öğrenci, **ilin** koordinatörü atar
- **Okul Temsilcisi** — her okulda bir öğrenci; **danışman öğretmen, yalnızca KENDİ danışmanlığındaki öğrencilere** verir (10 Ağustos 2026). Öğretmen okulundaki danışmansız öğrencileri de listeliyor ama görmek ile görev vermek ayrı yetkilerdir; danışmanı olmadığı öğrenciye görev veremez. Proje yöneticisi bu koşuldan muaftır — okulda danışman kalmadığında düzeltmeyi yapabilecek tek kişi odur.

Kurallar:
- Bu roller **hiçbir ek veri görüntüleme yetkisi vermez**. Görev etiketidir; ileride rozet olarak kullanılacaktır.
- Eğitim-öğretim yılı bazlıdır (görev dönemi). Kalıcı bayrak olarak tutma.
- Tekillik: il başına bir İl Temsilcisi, ilçe başına bir İlçe Temsilcisi, okul başına bir Okul Temsilcisi — dönem bazında, kısmi unique index'lerle korunur.
- Her rolün kapsamı **kendi sütununda** durur (`il_kodu` / `ilce_kodu` / `kurum_kodu`) ve rolüne göre zorunludur (`ck_ogrenci_gorev_kapsam`). Kapsam öğrencinin güncel kaydından okunmaz, göreve **yazılır**: öğrenci dönem içinde okul (dolayısıyla ilçe) değiştirdiğinde görev verildiği yerde kalmalıdır.
- **İlçe düzeyinde görevli yoktur.** `RolKodu`'nda `ILCE_KOORDINATOR` diye bir değer yok; ilçe, ilin içindeki bir basamaktır ve temsilcisini o ilin koordinatörü belirler.
- e-Okul kaydında ilçesi boş olan öğrenciye İlçe Temsilciliği verilemez — kapsam sütunu boş kalacağı için veritabanı kısıtı zaten reddeder.

### Katkı kartı

Temsilcilikler, çalışma grupları ve öğrencinin **düzenlediği faaliyetler** öğrencinin ekranlarında tek bir "Katkı kartı"nda toplanır (`/panel#katilimlarim` ve `/panel/kazanimlarim`). Kartta **geçmiş dönemlerin** görevleri de dönemiyle birlikte durur: geçen yılın il temsilciliği bir katkıdır ve eylülde sessizce silinmemelidir.

Öğretmenin katkı kartı aynı ekranlarda ama **kendi kalemleriyle** durur: rolleri, aktif danışmanlıkları ve düzenlediği faaliyetler. Öğrencinin kalemleri (çalışma grubu seçimi, temsilcilik) öğretmende hiçbir zaman dolmaz; ortak bir kart bunları boş satır olarak taşırdı.

---

## 5. Çalışma grupları

Tanımlı gruplar:

1. Oyun Tasarımı
2. Siber Güvenlik
3. Bilgisayar Olimpiyatları
4. Mobil Programlama
5. Web Programlama
6. Havacılık Sistemleri
7. Robotik
8. Yapay Zekâ
9. E-Ticaret ve E-İhracat
10. Dijital Sanatlar ve İçerik Geliştirme
11. Açık Kaynak
12. Espor

Kurallar:
- Liste **sabit kodlanmaz**; tanım tablosunda tutulur, proje yöneticisi yönetir.
- Kapanan grup silinmez, `Aktif=false` yapılır. Pasif gruplar yeni seçimlerde listelenmez, geçmiş kayıtlar korunur.
- Öğrenci birden fazla grup seçebilir. **Üst sınır yoktur** — istediği kadar grup seçer. "En fazla 3" gibi bir kısıt eklemeyin; bu daha önce vardı, kaldırıldı.

### Öğrenciyi gruba kim ekler

Seçimi öğrenci kendisi yapar (`/panel/calisma-gruplari`), ama **danışman öğretmeni, il koordinatörü ve proje yöneticisi de** öğrencinin profilinden ekleyip çıkarabilir. Kayıt hangi yoldan açıldıysa `ogrenci_calisma_grubu.ekleyen_kullanici_id` onu söyler (NULL = öğrencinin kendi seçimi) ve öğrenci bunu profilinde görür.

Bu, **grubu tanımlamak**tan (yalnızca proje yöneticisi) ayrı bir yetkidir: burada listeye yeni grup eklenmiyor, mevcut bir gruba öğrenci yazılıyor.

Ekleme iki kontrolden **birlikte** geçer: rol (`ogrenciCalismaGrubuYonetebilirMi`) **ve** kapsam (merkezi öğrenci kapsam filtresi). Yalnızca rol sorulsaydı bir danışman, forma başka bir okulun öğrenci id'sini yazarak o öğrenciyi gruba kaydedebilirdi. Yeni kayıt yalnızca **aktif** gruba açılır; çıkarma pasif gruptan da yapılabilir.

---

## 6. Faaliyet yönetimi

### Kapsam ve yetki

| Kapsam | Açan rol | Başvurabilecek öğrenciler | Değerlendiren |
|---|---|---|---|
| Okul içi | Danışman öğretmen, öğrenci | Sadece o okulun öğrencileri | Faaliyeti açan |
| İl içi | İl koordinatörü, öğrenci | Sadece o ilin öğrencileri | Faaliyeti açan |
| Ulusal | İl koordinatörü, proje yöneticisi, öğrenci | Ülke genelindeki tüm öğrenciler | Faaliyeti açan |

Danışman öğretmen **il içi veya ulusal faaliyet açamaz.**

**Öğrencinin kapsam sınırı yoktur** ama açtığı hiçbir faaliyet kendiliğinden yayına girmez (bkz. Onay akışı). Yeri roldan değil kayıtlı okul/ilinden gelir: okul içi önerisi kendi okuluna, il geneli önerisi kendi iline yazılır. Kartta düzenleyen birim **"Öğrenci girişimi"** olarak görünür; okulun adıyla anılması etkinliği okul yönetimine mal ederdi.

### Onay akışı

İki kaynak vardır:

1. **İl koordinatörünün açtığı ulusal faaliyet** — proje yöneticisi onayından sonra yayına girer.
2. **Öğrencinin açtığı her faaliyet** — kapsamı ne olursa olsun. Okul içi öneri bile onay bekler: 18 yaş altı bir kullanıcının açtığı çağrı sorumlusuz çıkmamalıdır.

Onaya kadar `onayDurumu=BEKLIYOR` ve faaliyet öğrencilere görünmez; yalnızca açan kişi ve onaylamaya yetkili olanlar görür.

Öğrenci faaliyetini **iki taraf onaylayabilir**: öğrencinin ilinin koordinatörü ve YEĞİTEK proje yöneticileri. İkisi de tam yetkilidir ve **ilk verilen karar geçerlidir** — çift onay adımı yoktur. Öneri açıldığında bildirim ikisine birden gider (`ONAY_BEKLEYEN_OGRENCI_FAALIYETI`); ilin koordinatörü yoksa uyarı merkeze gitmeye devam eder ve öneri kaybolmaz. Karar çıktığında sonuç faaliyeti açan öğrenciye bildirilir (`FAALIYET_ONAY_SONUCU`).

Onaylanmış bir öğrenci faaliyetinde tarih değişirse ya da kontenjan düşerse onay yeniden düşer ve uyarı yine **her iki tarafa** gider; yoksa koordinatör açılışta gördüğü öneriyi ikinci kez hiç görmezdi.

**Öğrenci artık faaliyet AÇMAZ** (20 Ağustos 2026 · istek: "öğrencilerin etkinlik oluşturmasına gerek yok sadece mevcutlara katılabilsin"). Yukarıdaki onay akışı veritabanındaki eski öğrenci faaliyetleri için geçerliliğini korur; yeni öneri açılmıyor. Öğrencinin etkinlikle ilişkisi başvurmaktır.

**Danışman öğretmen her kapsamda faaliyet açar** (20 Ağustos 2026 · istek: "öğretmen … kendi okulunda etkinlik oluşturabiliyor, türkiye geneli örnek espor gibi bir etkinlik oluşturmak istediğinde il koordinatörüne onaya gidecek"): kendi **okuluna** açtığı etkinlik onaysız yayına girer, **il ve ulusal** kapsamdakiler ilin koordinatörünün onayını bekler.

### Etkinlik kategorisi (artık SORULMUYOR, PROGRAMDAN türetiliyor)

Kapsam ile etkinlik kategorisi **iki ayrı, bağımsız alandır**:

- **Kapsam** (Okul / İl / Ulusal) → *kimin başvurabileceğini* belirler.
- **Etkinlik kategorisi** → *etkinliğin niteliğini* belirler.

**Kategori 20 Ağustos 2026'da formdan ve filtrelerden kalktı** (istek: "etkinlik oluştururken Etkinlik kategorisi alanı kalksın, filtre kısmından da etkinlik kategorisi kalksın"). Kolon ve rozet duruyor; değer artık **seçilen programdan** türetiliyor: program bir gruba aittir (Temel Etkinlik / Çalışma Grubu Etkinliği), program seçilmezse etkinlik **İl Etkinliği** sayılır. Kategori programdan geldiği için ikisi tanımı gereği uyumlu; eşleşme doğrulaması (`etkinlikKategorisiDogrula`) kuralın kaydı olarak yerinde duruyor.

| Kategori | Nedir | Faaliyetin adı |
|---|---|---|
| Temel Etkinlik | GençTek'in ulusal düzeyde her yıl tekrarlanan programları | Sabit listeden seçilir |
| Çalışma Grubu Etkinliği | Çalışma grubu öğrencilerinin yıl boyunca planlayıp yürüttüğü programlar | Sabit listeden seçilir |
| İl Etkinliği | İl koordinatörlüğünün kendi iline özel tasarladığı temalı etkinlik | **Serbest metin** — koordinatör kendisi girer |

İl Etkinliği'nin sabit bir isim listesi **yoktur**. "Robot Futbol Ligi", "Yapay Zekâ ile Hikâyeni Anlat" gibi adlar yalnızca örnektir; bunları referans listesi hâline getirmeyin.

Temel Etkinlik ve Çalışma Grubu Etkinliği programları `temel_etkinlik_programi` tablosunda tutulur (`calisma_grubu` ile aynı mantık: silme yok, pasife alma var). İlk seed listesi için bkz. `references/data-model.md` Bölüm 10.

Bu, faaliyetin **çalışma grubu etiketiyle** (konu alanı: Yapay Zekâ, Robotik…) karıştırılmamalıdır — o ayrı bir etiketlemedir ve filtre mi kısıt mı olacağı hâlâ karar beklemektedir.

### Kontenjan

Ulusal faaliyette **tek havuz** kullanılır; il bazlı kota **yoktur**.

Kontenjan **aktif başvuru sayısını** sınırlar, yalnızca seçilenleri değil. Aktif başvuru = geri çekilmemiş, reddedilmemiş ve iptal edilmemiş her başvuru (BEKLIYOR + SECILDI + YEDEK).

- Kontenjan dolduğunda yeni başvuru **kabul edilmez**; öğrenciye "kontenjan doldu" mesajı gösterilir. (Dolu kontenjan artık "yedek listesi" demek değildir.)
- Bir başvuru reddedilir veya geri çekilirse yer **anında** açılır.
- Sayaç tutulmaz: her başvuru denemesinde aktif başvurular canlı sayılır ve sayım, kaydın açıldığı transaction'ın içinde yapılır.

### Faaliyet alanları

Faaliyet adı, açıklama, tarih, kapsam, **etkinlik kategorisi**, il/ilçe, kontenjan, düzenleyen birim/okul/ekip, başvuru başlangıç/bitiş tarihi, ilgili çalışma grubu etiketi (karar bekliyor), ekli dosya/görseller.

### Faaliyet düzenleme

Faaliyeti açan kullanıcı (düzenleyen görevden ayrıldıysa ilin koordinatörü, her durumda proje yöneticisi) **tarih ve kontenjanı** düzenleyebilir.

- Kontenjan, mevcut **"Seçildi" sayısının altına düşürülemez** — 40 kişi seçilmişse kontenjan 30 yapılamaz.
- Kontenjan her zaman artırılabilir; artış yeni başvuruların önünü yeniden açar.
- Onaylanmış **ulusal** faaliyette tarih gibi kritik alanlar değişirse faaliyet otomatik olarak `onay_durumu=BEKLIYOR`'a düşer ve proje yöneticisi tekrar onaylamalıdır. **Yalnızca kontenjan artırımı bunu tetiklemez.**

### Faaliyet iptali

Faaliyeti açan kullanıcı veya proje yöneticisi faaliyeti iptal edebilir. `faaliyet.durum` alanı: `AKTIF` / `IPTAL_EDILDI`.

- İptal edilince tüm aktif başvurular (BEKLIYOR, SECILDI, YEDEK) `IPTAL_EDILDI` durumuna geçer. Bu, öğrencinin kendi geri çekmesinden (`GERI_CEKILDI`) **ayrı** bir değerdir: sistem tetikler.
- Başvurmuş tüm öğrencilere bildirim gider.
- İptal edilen faaliyet listelerde **"İptal edildi" etiketiyle görünmeye devam eder**; yeni başvuru, yorum ve dosya kabul etmez. Mevcut yorum ve dosyalar geçmiş kaydı olarak görünür kalır (moderasyon amaçlı silme yetkisi sürer).
- İptal gerekçesi **isteğe bağlı** bir metin alanıdır.

### Toplu ekleme

**Yoktur.** İl koordinatörünün ilindeki öğrencileri faaliyete topluca ekleme özelliği kapsamdan çıkarıldı. Yazma.

---

## 7. Dosya, görsel ve yorumlar

### Ekler

- Faaliyete dosya/görsel ekleme yetkisi **yalnızca faaliyeti açan kullanıcıdadır** (danışman/koordinatör/yönetici). Öğrenci ekleyemez, sadece görüntüler/indirir.
- İzin verilen tipler: görsellerde jpg/png/webp; belgelerde pdf. Boyut sınırı proje yöneticisi tarafından yapılandırılabilir olmalı (varsayım: görsel başına 5 MB, belge başına 10 MB — karar bekliyor).
- Dosyalar bir depolama soyutlamasının arkasında tutulur (yerel disk arayüzü ile başla, ileride S3 uyumlu servise geçiş kolay olsun).

### Yorumlar

- Faaliyeti görme yetkisi olan **herkes** (kapsamına giren öğrenci, faaliyeti açan, ilgili koordinatör/yönetici) yorum yazabilir.
- Yorumun görünürlüğü, bağlı olduğu faaliyetin kapsamıyla birebir aynıdır — okul içi faaliyetin yorumları başka okuldan görünmez.
- **Silme yetkisi:** faaliyeti açan kullanıcı kendi faaliyetindeki her yorumu silebilir; proje yöneticisi her yorumu her yerde silebilir. Öğrenci yalnızca kendi yorumunu silebilir.
- Silinen yorumun içeriği kullanıcıya gösterilmez ama log'da tutulur (kim, ne zaman, hangi yorumu sildi) — KVKK ve olası kötüye kullanım denetimi için.
- Yorumlarda dosya eki **yoktur** (kapsam dışı) — yalnızca metin.
- Kullanıcı-tetikli "şikayet et" mekanizması karar bekliyor; olmadan da moderasyon (yetkili silmesi) çalışır durumda olmalı.

---

## 8. Başvuru ve değerlendirme

- Başvuruyu **katılımcının kendisi** yapar. Katılımcı öğrenci de öğretmen de olabilir; proje yöneticisi (YEĞİTEK) katılımcı olamaz.
- **Danışman öğretmen ve il koordinatörü, kapsamındaki bir ÖĞRENCİ adına başvuru yapabilir.** Öğretmen adına vekaleten başvuru yapılamaz. Öğrenciye bildirim gider ve başvuruyu kendisi geri çekebilir; başvuruyu yapan öğretmen de geri çekebilir ve sonuç bildirimini alır.
- Başvuru formunda **"Bu faaliyete neden başvuruyorum / bu alandaki ilgim"** alanı yer alır ve **zorunludur**.
- Aynı faaliyete aktif ikinci başvuru **engellenir**.
- Öğrenci başvurusunu **geri çekebilir**; gerekçe istenmez. Geri çekme **aktif başvurunun her durumunda** yapılabilir (BEKLIYOR, SECILDI, YEDEK): kontenjanı üçü birden doldurduğu için, yeri asıl açan hareket seçilmiş katılımcının vazgeçmesidir. Reddedilmiş başvuru geri çekilemez — yer tutmuyor, geri çekme yalnızca red kaydını silikleştirirdi.
- **Seçilmiş** bir katılımcı çekildiğinde faaliyeti düzenleyene bildirim gider (açılan yer ve yedek sayısı yazılıdır); bekleyen ya da yedek çekilmesinde gitmez, düzenleyenin vereceği bir karar yoktur.
- Geri çekilen başvuru, kontenjan dolmadığı sürece **yeniden yapılabilir**.
- Kontenjan doluysa **hiç kimse** başvuramaz (ilk başvuru dahil) — bkz. Bölüm 6 "Kontenjan".
- Başvuruyu yalnızca **faaliyeti açan kullanıcı** değerlendirir.
- Değerlendirme sonuçları: `SECILDI` · `REDDEDILDI` · `YEDEK`
- Başka ilden ulusal faaliyete başvuran öğrencide **danışman onayı aranmaz**; bildirim danışmana kopya olarak iletilir.

---

## 9. Bildirimler

Panel bildirimi **her koşulda** yazılır; e-posta ve SMS yalnızca birer kopyadır ve gitmemeleri bildirimi geçersiz kılmaz. İki kanalın durumu bildirim kaydında ayrı ayrı tutulur — sessiz başarısızlık, hiç göndermemekten kötüdür.

Şablon **metinleri** veritabanındadır ve Yönetim ekranından düzenlenir; şablon **kodları** koddadır, çünkü şablonu tetikleyen olay uygulamada yaşar. Metin kaydedilirken yer tutucular doğrulanır: tanımsız bir `{{degisken}}` kabul edilmez.

Bildirim gereken olaylar:
- Başvuru sonucu (seçildi / reddedildi / yedek)
- Danışman değişikliği ("yeniden seç" durumu dahil)
- İl koordinatörüne: okulda yeni danışman var, öğrenci devredilebilir
- Proje yöneticisine: onay bekleyen ulusal faaliyet
- Proje yöneticisine **ve ilin koordinatörüne**: onay bekleyen öğrenci faaliyeti
- Faaliyeti öneren öğrenciye: onay sonucu (onaylandı / reddedildi)
- Danışmana kopya: öğrencisi başka ilin ulusal faaliyetine başvurdu
- Faaliyete başvurmuş öğrencilere: faaliyet iptal edildi
- Öğrenciye: adına başvuru yapıldı / adına yapılan başvuru geri çekildi
- Faaliyeti düzenleyene: seçilmiş katılımcı çekildi, kontenjanda yer açıldı
- Adına başvuran öğretmene: başvuru sonuçlandı

**Etkinlik takvimi ve mesaj şeridi.** Panelde ilk görülen şey **"Mesajın var" şeridi** ve geçmiş/bugün/yaklaşan takvimidir. Takvim ayrımı **gün** bazındadır: sabah yapılan etkinlik öğleden sonra "geçmiş" görünürse o günün programı kaybolur. Şerit, üzerine gelindiğinde ve klavyeyle odaklanıldığında durur; `prefers-reduced-motion` açıksa hiç akmaz.

Şerit **6 Ağustos 2026'da** başvuru duyurusundan mesaja çevrildi. Yalnızca **okunmamış bildirim varken** basılır ve her başlık, sayfanın altındaki bildirim bölümünde o mesajın kendi satırına iner (`#bildirim-<id>`) — orada e-posta olarak giden gövdenin aynısı durur. Ayrı bir mesaj ekranı **yoktur**: aynı metni ikinci bir yerden okutmak olurdu. Toplu duyurular ve kullanıcılar arası yazışmalar da `bildirim` tablosuna yazdığı için şerit üçünü birden kapsar.

**Başvurusu açık etkinlikler şeritten çıktı ama Panelim'den çıkmadı:** aynı sayfadaki "Başvurusu açık etkinlik" ölçüm kartı ve kontenjan durumunu gösteren "Başvuruya açık etkinlikler" listesi yerinde. Şerit üçüncü kopyaydı.

**Bildirim arşivi (12 Ağustos 2026).** İstek: *"Duyuru geliyor, uyarı görünüyor; okundu tıklandıktan sonra artık yok. Bir yerlerde olsun — eski duyurulara nereden ulaşılabilir?"*

Panelim'deki bölüm yalnızca **okunmamışları** listeliyordu ve öyle kalıyor: orası bir yapılacak listesi, okunan satır oradan düşmeli. Eksik olan, düşen satırın gittiği yerdi — "okundu" düğmesi fiilen "sil" gibi çalışıyordu. `/panel/bildirimler` aynı kayıtları okunmuşuyla birlikte gösterir; süzgeci üç hâllidir (Tümü / Okunmamış / Okunmuş) ve **varsayılanı "Tümü"**, çünkü ekranın var oluş sebebi okunmuşları görebilmek.

Yeni bir veri kaynağı ya da "duyuru" kavramı **açılmadı**: aynı `bildirim` tablosu, aynı okundu eylemi, aynı hedef bağlantısı. Menüde sekmesi yoktur; girişi Panelim'deki bölüm başlığı ve mesaj şeridinin ucundaki "Tümü" bağlantısıdır.

**Okunmuşu okunmadıya çevirme yolu yoktur.** Bildirim tekrarını `bildirimGonder` okunmamış kayda bakarak engelliyor; geri çevirmek, aynı uyarının bir daha hiç düşmemesine yol açan bir kayıt yaratırdı. Ekranda okunmuş bildirimlerin saklama süresi de yazar (varsayılan 12 ay, sistem ayarından gelir) — liste bir gün kısaldığında sebebi bilinsin.

---

## 10. KVKK ve loglama

- Kullanıcıların önemli bölümü 18 yaş altı; aydınlatma metni buna göre.
- Veri saklama süresi politikası tanımlı olmalı.

**Onay belgeleri.** Sistemde KAYIT AKIŞI YOKTUR; kimlik EBA'dan gelir. Bu yüzden
belgelerin okutulacağı tek an, kişinin sisteme **ilk girdiği** andır. Dört belge
tanımlıdır ve kimden isteneceği role bağlıdır:

| Belge | Kimden |
|---|---|
| KVKK Aydınlatma Metni | Öğrenci |
| KVKK Açık Rıza Onayı | **Herkes** |
| İl Koordinatörü Taahhütnamesi | İl koordinatörü |
| Gizlilik Sözleşmesi | İl koordinatörü |

Taahhütname ile gizlilik sözleşmesi AYRI belgelerdir: biri görevin nasıl
yürütüleceğini, öbürü eriştiği veriyle nasıl davranacağını taahhüt ettirir. Tek
metinde toplansalardı birinin ihlali diğerinin onayını da tartışmalı yapardı.
Aynı gerekçeyle açık rıza aydınlatmadan ayrıdır ve yalnızca kanunî dayanağı
olmayan işlemleri (isteğe bağlı iletişim bilgisi, profil fotoğrafı, belgelerde ad
kullanımı) kapsar — rızaya bağlanmayan işlem bu onaya dayandırılamaz.

**Kilit yalnızca ilk giriştedir.** Hiç onay vermemiş kullanıcı panele giremez;
`/onay` kapısından geçer. Sonradan eklenen bir belge ya da güncellenen bir metin
kimseyi kapıda bırakmaz — panelde şerit çıkar, **profilin en altındaki bölümden**
onaylanır (`/panel#kvkk`). Sebebi pratik: bir metin güncellemesi tüm ilin
koordinatörünü aynı anda dışarıda bırakabilir ve acil bir işin ortasında sistemin
kilitlenmesi korumaktan çok zarar verir; erişimler zaten kayda geçiyor.

**Belgelerin yeri: profil, menü değil** (5 Ağustos 2026). "KVKK ve Belgelerim"
sekmesi menüden kaldırıldı; metin üye olurken okutuluyor, sonrasında lazım
olduğunda profilin en altından açılıyor. Eski `/panel/kvkk` ve `/panel/taahhut`
adresleri **kalıcı yönlendirmeyle** yaşıyor.

**Kaldırılan sekme, kaldırılan erişim değildir.** Kişinin onayladığı belgeye
sonradan erişememesi KVKK açısından savunulamaz; bu yüzden bölüm silinmedi,
taşındı. İki yol da korunmak zorunda:

1. **Yeniden onay** — metin güncellendiğinde şerit çıkar ve profildeki bölüme
   götürür. Sekme kalktığı için kullanıcının belgeye kendiliğinden uğrayacağı
   başka bir yer yok; **şerit artık yeniden onayın tek yoludur** ve kaldırılamaz.
2. **Sonradan okuma** — onay tarihleri ve yürürlükteki metinler aynı bölümde,
   katlanmış hâlde durur. Metinler açık basılsaydı profil birkaç ekran boyu
   hukuki metinle biterdi; onay BEKLEYEN belge varsayılan olarak açık gelir,
   çünkü okunması gereken metni katlı bırakmak onayı körlemesine tıklatmak olur.

**Rol eşlemesi genişletilirken dikkat.** Taahhütname ve gizlilik sözleşmesinin
yalnızca il koordinatöründen istenmesi bir ürün kararıdır: danışman öğretmen
kendi okulundaki öğrencilerle zaten yüz yüze çalışır, koordinatör ise tanımadığı
onlarca öğretmenin iletişim bilgisine erişir. Kapsamı danışmana ya da proje
yöneticisine açmak teknik bir düzeltme değildir.
- **Erişim logu:** hangi kullanıcı, hangi öğrenci/öğretmen kaydını, ne zaman görüntüledi veya değiştirdi.
- **İçerik logu:** yorum silme ve dosya kaldırma işlemleri de erişim logundan ayrı ya da aynı yapıda tutulur — kim sildi, ne zaman.
- Rol bazlı erişim sınırları uygulama katmanında zorunlu — istemci tarafı filtreleme yeterli değildir.
- SMS/e-posta için rıza akışı değerlendirilmeli.

---

## 11. Kenar durumlar

Bunlar test edilmeli:

| Durum | Beklenen davranış |
|---|---|
| Öğrenci okul değiştirdi | Yeni okulun danışman akışına girer; eski atama kapatılır |
| Öğrenci sınıf atladı | Yeni eğitim-öğretim yılı kaydı; danışman ilişkisi devam eder |
| Danışman ve öğrenci aynı anda okul değiştirdi | Her ikisi de yeni kurum koduna göre değerlendirilir; otomatik eşleşme varsayma |
| Kontenjan dolu faaliyete geri çekilmiş başvuru sahibi dönmek istiyor | Reddedilir, kontenjan uyarısı gösterilir |
| İl koordinatörü olmayan ilde okul danışmansız | Öğrenci atanamaz — proje yöneticisine uyarı düşer ve Rol/Atama Envanteri ekranında kırmızı olarak görünür |
| İl koordinatörünün görevi kaldırıldı | Ona bağlı öğrenciler "atanmamış" duruma düşer (okulları zaten danışmansız); proje yöneticisine envanterde kırmızı uyarı çıkar |
| İle yeni koordinatör atandı | O ildeki atanmamış öğrenciler **otomatik** olarak ona bağlanır; ayrı bir onay adımı yoktur (okula sonradan danışman gelmesi durumundan farklı) |
| Danışman öğretmen il koordinatörü yapıldı | Atama engellenmez; danışmanlığı kapanır, öğrencileri devir tablosuna göre dağıtılır, proje yöneticisine "X öğrenci yeniden dağıtıldı" uyarısı gösterilir |
| Faaliyet iptal edildi | Aktif başvurular `IPTAL_EDILDI`'ye geçer, öğrencilere bildirim gider; faaliyet listede etiketiyle kalır, yeni başvuru/yorum/dosya alınmaz |
| Onaylı ulusal faaliyetin tarihi değiştirildi | Faaliyet `BEKLIYOR`'a düşer ve yeniden onaylanana kadar öğrencilere görünmez |
| Faaliyeti açan kullanıcı görevden ayrıldı | Değerlendirme yetkisi il koordinatörüne / proje yöneticisine düşer; o kullanıcının açtığı faaliyetteki yorum silme yetkisi de aynı şekilde devrolur |
| Öğretmen henüz mock kullanıcı olarak tanımlanmadı | Danışman listesinde çıkmaz, öğrenci il koordinatörüne düşer |
| Aynı okulda iki öğretmen de danışman işaretli, biri işareti kaldırdı | Üzerindeki öğrenciler devir akışına girer |
| Faaliyete izin verilmeyen dosya tipi/boyutu yüklenmeye çalışıldı | Reddedilir, açık hata mesajı gösterilir |
| Silinen bir yoruma başkası zaten yanıt vermiş | Üst yorum "silindi" olarak görünür, alt yorumlar kalır (zincir kopmaz) |

---

## 12. Rol/Atama Envanteri (proje yöneticisi)

Proje yöneticisi öğrencileri ve öğretmenleri tek tek zaten görebiliyor; eksik olan **toplu görünüm**dü. Rol/Atama Envanteri ekranı iki listeyi gösterir:

1. **İl koordinatörü durumu** — 81 il, her biri için: atanmış mı, atandıysa kim, atanma tarihi. Boş iller görsel olarak öne çıkarılır.
2. **Danışman öğretmen durumu** — kurum bazında: kaç danışman öğretmen var, öğrenci sayısı, danışmansız kalmış okullar ve bu okulların öğrencilerinin hangi il koordinatörüne düştüğü.

İl koordinatörü atama ve görevden alma da bu ekrandan yapılır: boşluğu görmek ve doldurmak tek akıştır.

**Yeni tablo gerekmez.** Ekran, mevcut `kullanici_rol` (aktif il koordinatörlükleri) ve `danisman_atama` (aktif atamalar) tabloları üzerine yazılmış bir sorgu/rapor katmanıdır — il koordinatörünün kendi ilinde gördüğü "danışmansız okullar" listesiyle aynı mantık, yalnızca il filtresi olmadan.

Erişim yalnızca proje yöneticisindedir ve bu, "öğrenci/öğretmen verisi görüntüleme" yetkisinden **ayrı** bir satırdır (bkz. `references/permissions.md` Bölüm 1).

---

## 13. Rozet / katkı kategorileri — FAZ 2

Rozet sisteminin uygulanması sonraki faza bırakıldı; **şimdi kod yazılmayacak**. Kategori listesi netleşti:

- İl Temsilcisi
- Okul Temsilcisi
- Verdiği akran eğitimleri
- Çalışma grubu yöneticisi / organizasyon ekibi üyesi *(bu madde hâlâ belirsiz, Faz 2'de netleşecek)*
- Moderatörlük yaptığı etkinlikler
- Derece aldığı yarışmalar (EğitiJAM gibi GençTek etkinlikleri ya da GençTek dışı yarışmalar)

Liste, mevcut `kullanici_kazanim.tip` değerleriyle (DIS_ETKINLIK / URUN / AKRAN_EGITIMI / YARISMA_DERECESI) büyük ölçüde örtüşüyor. Faz 2 açıldığında **yeni tablo açmak yerine bu tabloyu genişletmek** daha az iş çıkarır. İl/Okul Temsilcisi kategorilerinin kaynağı zaten `ogrenci_gorev_rolu`'dur; türetilebilen kategoriler için ayrıca kayıt tutmayın.

**Faz 2 olan yalnızca ROZETLERDİR.** Kayıtların kendisi (kazanım girişi ve profilde gösterimi) uygulandı — bkz. Bölüm 14.

---

## 14. Öğrenci profili: kazanımlar, yarışmalar ve CV

### Menü: altı sekme (7 Ağustos 2026)

Menü küçültüldü. Herkeste ortak altı sekme:

**Profil · Panel · Etkinlikler · Bağlantılarım · Pano · Market**

Kalkanlar ve nereye gittikleri:

| Kalkan sekme | Nereye gitti |
|---|---|
| Katkılarım | İçeriği profilde (Görevlerim, katılım geçmişi, Katkı Nişanlarım). Sayfa duruyor; öğretmen tarafında kendi kartlarını basıyor. |
| Algoritmam | Panel'in içinde "Özdeğerlendirme Envanterleri" bölümü. Envanterin kendisi `/panel/algoritmam` ekranında kaldı. |
| İletişim Onayları | Bağlantılarım sayfasının başında bölüm. |

Yeniden adlandırılanlar: "Panelim" → **Panel**, "Profilim" → **Profil**, "Ürünlerim" → **Market**.

**Yönetim sekmeleri KALDI.** İl koordinatörü ve YEĞİTEK bu altısına ek olarak Öğrenciler, Öğretmenler, Paydaşlar, Görev Rolleri, İl Dışı Başvurular, Rol/Atama Envanteri, Erişim Kayıtları, Duyurular ve Yönetim sekmelerini görmeye devam eder. Onları da kaldırmak, koordinatörün ilindeki öğrenciye ulaşacağı hiçbir giriş bırakmazdı.

**Sekmeyi kaldırmak sayfayı silmek değildir** (5 Ağustos'tan beri yürürlükteki ilke): kaldırılan hiçbir ekran silinmedi, yetkisi olan doğrudan adresle girebilir ve e-postalardaki bağlantılar çalışmaya devam eder.

### Profil bölümleri ve sırası

| Profil | Panel |
|---|---|
| Profil Fotoğrafı | Fotoğraf Ekle |
| Kimlik Bilgileri | *(salt okunur, e-Okul'dan)* |
| İletişim Bilgileri | İletişim Bilgileri Düzenle |
| Danışman Öğretmen | Danışman Öğretmenim Ekle/Düzenle |
| **GençTek Yolculuğum**<br>· Görevlerim (temsilcilikler + görev alınan organizasyonlar)<br>· Verdiğim Akran Eğitimleri<br>· Katıldığım GençTek Etkinlikleri<br>· Çalışma Gruplarım | Çalışma Grubu Ekle |
| **Bilişim Yolculuğum**<br>· Ürünlerim<br>· Deneyimlerim<br>· Topluluklarım/Ekiplerim | Yeni Kayıt Ekle (üç grup) |
| Katkı Nişanlarım | *(hesaplanır, girilmez)* |
| Rotam | Rotam: Hedef Ekle |
| Özgeçmiş | Özgeçmiş Ekle |
| — | Özdeğerlendirme Envanterleri (Algoritmam) |

**GençTek Yolculuğum'da öğrencinin seçebildiği tek şey çalışma gruplarıdır.** Görevler atamayla, katılım belgeyle düşer — istek: *"Diğer alanlar katıldığı etkinliğe, görev aldığı rollere göre öğretmen onayı/katılım belgesi aldığında otomatik olarak profiline gelmeli."*

**İstisna: akran eğitimi hâlâ beyandır.** Öğretmen onay akışı bugün yok; kayıt Panel'den girilir ve doğrudan profilde görünür. Onaya bağlanması ayrı bir madde olarak kayıt altına alındı (`YAPILACAKLAR.md` · 7 Ağustos eki).

**"Bilişim Yolculuğum" üç gruba ayrıldı:** Ürünlerim (`URUN`), Deneyimlerim (`DIS_ETKINLIK`, `YARISMA_DERECESI`, `SERTIFIKA`, `DIGER`), Topluluklarım/Ekiplerim (`TOPLULUK`). Gruplar bir **ekran düzenidir**, tipleri değiştirmez: her tipin kendi alan kuralları var (derece yalnızca yarışmada, ürün alanları yalnızca üründe) ve tek tipe indirmek o kuralları kaybettirirdi. Grup ile tip listesinin ayrışmadığı birim testle sınanır (`grupsuzBilisimTipleri`).

### Öğretmen tarafı: profil, panel ve Öğrencilerim (7 Ağustos 2026)

Öğretmen menüsü öğrencininkiyle aynıdır, **tek fark Öğrencilerim sekmesidir**:

**Profil · Panel · Öğrencilerim · Etkinlikler · Bağlantılarım · Pano · Market**

"Öğretmenler" sekmesi danışman öğretmenin menüsünden **kalktı** — sayfa silinmedi, yetki daralmadı; doğrudan adresle görülmeye devam ediyor. Öğretmenin günlük işi kendi öğrencileridir, meslektaş envanteri değil.

| Profil (salt okunur) | Panel (düzenleme) |
|---|---|
| Fotoğraf | Fotoğraf ekle |
| Kimlik bilgileri | *(e-Okul'dan, düzenlenmez)* |
| İletişim bilgileri | İletişim bilgileri düzenle |
| **Öğrencilerim** (danışmanlığındakiler) | *(Öğrencilerim ekranında)* |
| **Mentörlük Alanlarım** | Mentörlük başvurusu |
| **Katıldığım GençTek etkinlikleri** | *(belgeden türer, girilmez)* |
| **Ürünlerim · Deneyimlerim · Topluluklarım** | Yeni Kayıt Ekle |
| **Katkı Nişanlarım** | *(hesaplanır)* |
| **Rotam** | Rotam: hedef ekle |
| **Özgeçmiş** | Özgeçmiş ekle |

**Rotam ve Özgeçmiş artık öğretmende de var.** Rotam için kod tarafında engel yoktu — hedef eylemleri zaten rol kısıtı taşımıyordu, eksik olan bölümün basılmasıydı. Özgeçmiş `ogretmen_profil`e beş sütunla eklendi (bkz. `data-model.md`); sınırlar öğrenciyle ortak.

**"GençTek danışman öğretmenliği" işareti Panel'den Öğrencilerim ekranına taşındı.** Görev ile o ekran aynı işin parçası: işareti kaldıran kişi öğrenci listesini de kaybediyor ve ikisini ayrı ekranlarda tutmak bu bağı görünmez kılıyordu.

#### Öğretmen öğrenciyi kendi danışmanlığına alabilir

Talep sahibinin kararıyla, "danışmanı öğrenci seçer" kuralından **bilinçli bir sapma**. Üç sınırı var:

1. **Yalnızca kendi okulu** — danışmanlık kurum kodu eksenlidir.
2. **Yalnızca danışmansız öğrenci** — var olan atamanın üzerine yazılmaz; yazılsaydı iki öğretmen birbirinin öğrencisini çekip alabilirdi. Devir gereken durumların ayrı akışı var.
3. **Öğrenci haberdar edilir** — onayı sorulmuyor ama bildirim gidiyor. Kimse hiç haberi olmadan danışman sahibi olmamalı.

Yarış durumunda ikinci yazan, "bir öğrencinin tek aktif danışmanı olur" kısmi unique index'ine takılır; uygulamadaki kontrol kullanıcıya anlamlı mesaj vermek için.

Öğretmen tek bir öğrencinin danışmanlığını **gerekçeyle bırakabilir** (J1, 6 Ağustos) — o akış değişmedi.

### İl koordinatörü: aynı yapı + Öğretmenler

Koordinatörün menüsü öğretmeninkiyle **aynı sırayı** izler; farkı **Öğretmenler** sekmesi ve altındaki yönetim sekmeleridir:

**Profil · Panel · Öğrenciler · Öğretmenler · Etkinlikler · Bağlantılarım · Pano · Market**
→ Paydaşlar · Görev Rolleri · Mentörlük · İl Dışı Başvurular

**Yönetim sekmeleri KALDI** (karar, 7 Ağustos). Kaldırılsalardı koordinatörün paydaş kaydı açacağı, il/ilçe temsilcisi atayacağı, mentör onaylayacağı ve il dışı başvuruları göreceği hiçbir giriş kalmazdı — dördü de yalnızca onda.

Profilde öğretmenin **"Öğrencilerim"** kartının karşılığı **"İlimdeki kişiler"**dir: koordinatör danışman değildir, danışmanlığında öğrenci yoktur. Kart üç sayı gösterir — öğrenci, öğretmen ve **danışmansız öğrenci** — ve iki ekrana bağlantı verir. Üç yüz kişilik bir listeyi profile basmanın faydası yok; o iş kendi ekranında. "Danışmansız" ayrı sayılır çünkü koordinatörün ilinde eyleme geçmesi gereken tek sayı odur (Değişmezler 2 — öğrenci boşta kalamaz).

### Giriş sonrası herkes profile düşer

**7 Ağustos 2026'dan beri rol ayrımı yok:** öğrenci, öğretmen, koordinatör, merkez personeli ve dış kullanıcılar (mezun, paydaş, mentör) girişten sonra aynı ekrana gelir. Önceden yalnızca öğrenci profile düşüyordu (C3), diğerleri panele. **20 Ağustos 2026'da hedef `/panel` oldu** — profil ekranı panelle birleşti ve adresi oraya yönlendiriyor.

Kural **üç yerde birden** uygulanır ve üçü aynı olmak zorundadır, yoksa aynı kişi hangi kapıdan geldiğine göre farklı ekran görür:

- `app/giris/eylemler.ts` — EBA/mock girişi
- `app/dis-giris/eylemler.ts` — e-posta/şifre girişi
- `app/onay/eylemler.ts` — ilk giriş KVKK kapısı aşıldıktan sonra
- `app/page.tsx` — oturumu açık kullanıcı açılış ekranına geldiğinde

**Danışman seçimi hâlâ önceliklidir:** danışmansız öğrenci `/panel/danisman-secim` ekranına düşer, profil onun arkasındadır.

### Mentörlük (7 Ağustos 2026)

İstek iki parçadan geldi ve **tek kayıtta** toplandı:

> "Öğretmen hesabında 'mentör başvurusu yap' bölümü ekleyelim. hangi çalışma grubunda mentörlük yapabilir seçsin. hatta mümkünse diğer mentörlük konuları ekleyebilsin? yani öğretmen mentör olabilsin"
>
> "Paydaş/Mentör başvurusu tek bir formdan yapılacak."

Mentörlük = **çalışma grupları + serbest konular + onay durumu**. Kim olursa olsun aynı şeydir; iki ayrı yerde tutulsaydı panodaki mentör süzgeci iki kaynağı birleştirmek zorunda kalır ve "kimler mentör" sorusunun iki ayrı cevabı olurdu.

| Kim | Nereden başvurur | Kim onaylar |
|---|---|---|
| Öğretmen, il koordinatörü, proje yöneticisi, mezun, paydaş temsilcisi | Panel · "Mentör olarak başvur" | **Yalnızca proje yöneticisi** |
| Dışarıdan gelen (mezun/paydaş/mentör başvurusu) | Başvuru formu | Proje yöneticisi — dış başvuruyu onayladığı anda mentörlük de açılır |

**ONAY 11 AĞUSTOS 2026'DA MERKEZE ALINDI** (istek: "il koordinatörü mentörlüğe başvurunca kendi kendini onaylıyor, mentörlük onaylarını sadece proje yöneticisi onay verebilsin"). Önceki kural onayı il koordinatörüne de veriyordu ve kuyruk koordinatörün **kendi iliyle** sınırlıydı; koordinatör de mentör olabildiği için kendi başvurusu her zaman kendi ekranına düşüyor ve onaylayabiliyordu. Bir ilde tek koordinatör olduğundan "kendisi hariç" demek de yetmezdi — başvurusuna bakacak ikinci bir koordinatör yok, kararın sahibi ilin üstündeki merkez olmalı.

**Kimse kendi başvurusunu karara bağlayamaz** (`mentorlukKarariGecerliMi · kendiBasvurusuMu`). Yetki listesi "kim onaylayabilir" sorusunu cevaplar, bu koşul "kendi işini onaylayamaz" ilkesini: proje yöneticisi de mentör olabiliyor ve yetki kuralı tek başına onu engellemezdi. Proje yöneticiliği ekip işidir, yani karar sahipsiz kalmaz.

**Koordinatör mentörlükten çıkmadı:** mentör olmaya, panodaki havuzda görünmeye ve ilindeki mentörleri görmeye devam ediyor. Kaybettiği tek şey KARAR yetkisi.

**Dışarıdan gelende ayrı bir onay adımı yoktur:** proje yöneticisi başvurunun tamamını zaten onayladı ve mentörlük isteği o başvurunun içindeydi. İkinci bir kuyruğa düşürmek, aynı kararı iki kez sormak olurdu.

**Öğrenci mentör olamaz.** Mentörlük, 18 yaş altı bir kullanıcıyla birebir yazışma hakkı doğurur ve o hakkın karşı tarafı yetişkin olmalıdır. Akran desteği için akran eğitimi kaydı ve panodaki ekip arkadaşı ilanı var.

**Kişi başına tek kayıt.** Mentörlük bir *durumdur*, geçmiş tablosu değil: bırakılan mentörlük `BIRAKILDI` olur ve yeniden başvuruda aynı satır `BEKLIYOR`a döner. `BIRAKILDI`, `REDDEDILDI`den ayrıdır — ret bir karardır, bırakma bir vazgeçmedir; tek değerde toplansalardı kendi isteğiyle ayrılan mentör geçmişe dönük "reddedilmiş" görünürdü.

**En az bir alan dolu olmalı** — ya grup ya konu. İkisi de boş bir mentörlük, öğrencinin hangi konuda başvuracağını bilemeyeceği bir kayıttır: panoda görünür ama hiçbir ilana eşleşmez.

**Öğrenciye erişim panodan geçer:** öğrenci "Mentöre sor" ilanı açar, mentör kendi konularındaki ilanları süzer, mevcut **bağlantı onayı + yazışma** akışı aynen işler. Ayrı bir mentör listesi ekranı açılmadı — bu, öğretmen envanterini öğrenciye açmak olurdu. Gizli kanal yoktur kuralı korunur.

**`MENTOR` türünün ayrı bir ROLÜ yoktur.** Rol, kapsam filtrelerinin okuduğu şeydir; mentörün kapsamı paydaş temsilcisininkiyle birebir aynı (öğrenci/öğretmen kişisel verisine erişemez, takvimi ve panoyu görür). Ayrı rol, her kapsam filtresine hiçbir şey değiştirmeyen ikinci bir dal eklemek olurdu. "Bu kişi mentör mü" sorusu `mentorluk` kaydından cevaplanıyor.

### Giriş kapısı: EBA ve E-Devlet

Açılış ekranında iki düğme:

1. **EBA ile Giriş Yap** — öğrenci ve öğretmenlerin tek yolu.
2. **E-Devlet ile Giriş** — altında "Mezun öğrenci/Paydaş/Mentör girişleri için tıklayınız". (7 Ağustos 2026 · istek: "buraya mezun öğrenci de ekleyeceğiz" — üç tür de bu kapıdan geldiği hâlde açıklamada mezun görünmüyordu.)

**Başvuru formu tektir**, içinde "kim olarak başvuruyorsunuz" seçimi var: Mezun · Paydaş temsilcisi · Mentör. Mezun ve paydaş ayrıca "mentörlük yapmak istiyorum" işaretleyebilir; `MENTOR` türünde işaret zorunlu olarak açıktır (o türü seçen kişi zaten mentörlük istiyor).

**`MEZUN` türü korundu.** "Mezunlar da paydaştan girsin" ifadesi giriş KAPISI hakkındadır; tür kaldırılsaydı mevcut mezun kayıtlarının mezuniyet yılı ve okul bağı anlamsızlaşır, A1'in "mezun bağını sürdürsün" gerekçesi zayıflardı. Değişen şey üçünün de aynı düğmeden ve aynı formdan gelmesi.

### Mezun / paydaş / mentör ekranları (7 Ağustos 2026)

İstek sekme sekme geldi ve **menü bu üç sekmeye indi**: Profil · Panel · Etkinlikler. Bağlantılarım, Pano ve Market menüden kalktı — **sayfalar silinmedi, yetki daralmadı**: panoda ilan açma ve onaylı yazışma hakları duruyor, adresler çalışmaya devam ediyor.

**1. Profil** (gösterir): Foto · Bilgiler (il, kurum, görev, e-posta, LinkedIn, GitHub, kişisel site, açıklamalar/katkı sağlayabileceği şeyler) · Özgeçmiş · Katkı Nişanım.

**2. Panel** (düzenler): Fotoğrafım · Bilgilerim · Mentörlüğüm · Çalışma gruplarım · Özgeçmişim. Profil/panel ayrımı C4'teki kuralın aynısıdır.

**3. Etkinlikler**: "Etkinlik bildir" + görüntüleme. Yetki tablosu için bkz. permissions.md.

**KURUM VE GÖREV SERBEST METİNDİR**, paydaş envanterinden seçilmez: envanter, etkinliklerde iş birliği yapılan kurumların kaydıdır ve il koordinatörlerince yönetilir (S18); mezunun çalıştığı şirketin oraya girmesi gerekmiyor. Alanlar boşken profilde **başvurudaki** kurum ve unvan görünür — başvuru dondurulmuş bir belgedir, kişi kendi değerini yazınca o düşüş sona erer.

**ÇALIŞMA GRUBU SEÇİMİ MENTÖRLÜKTEN AYRI TABLODADIR** (`kullanici_destek_grubu`). Mentörlük onaya tabi bir görevdir ve öğrenciyle birebir yazışma hakkı doğurur; buradaki seçim yalnızca bir beyandır (sponsorluk, mekân, eğitmen desteği de olabilir) ve kimseye erişim açmaz. Tek tabloda tutulsalardı mentörlüğü bırakan kişi destek alanlarını da kaybederdi.

**GERÇEK E-DEVLET ENTEGRASYONU HENÜZ YOK.** Düğme bugün mevcut e-posta/şifre ekranına (`/dis-giris`) götürüyor. Entegrasyon için e-Devlet Kapısı kurum başvurusu, test ortamı erişimi ve istemci sertifikası gerekiyor — hiçbiri elde değil; EBA SSO da aynı sebeple bekliyor (SKILL.md · adım 13). Düğmenin adının şimdiden "E-Devlet" olması bilinçli: entegrasyon geldiğinde değişecek tek yer `AuthProvider` uygulamasıdır, bu ekran değil.

### Çalışma Grubu Yöneticisi (yeni görev rolü)

Dördüncü görev rolü: `CALISMA_GRUBU_YONETICISI`. Diğer üçünden farkı **kapsamının türü** — onlar bir YERE (il, ilçe, okul) bağlanır, bu bir **çalışma grubuna** (`ogrenci_gorev_rolu.calisma_grubu_id`). Yer sütunlarına sığdırılsaydı etiket "Atatürk Lisesi Çalışma Grubu Yöneticisi" derdi ve hangi grubun yöneticisi olduğu kaybolurdu.

- **Atama il koordinatöründedir** (il temsilciliğiyle aynı kapı): karar ilin, okulun değil. Danışman öğretmene açmak ayrı bir karardır — aynı grubun okuldan okula birden çok yöneticisi doğardı.
- **Tekillik grup başınadır, kişi başına değil**: bir öğrenci birden çok grubun yöneticisi olabilir; aynı gruba ikinci yönetici atanması engellenir.
- **Ek yetki getirmez**, bir unvandır. Yetki eklenecekse `permissions.md` ile birlikte düşünülmeli.

### Pano türleri

İstekteki dört başlık: Destek Talebi · Mentöre sor · Genel · Ekip Arkadaşı arama.

| Enum | Ekrandaki ad | Not |
|---|---|---|
| `TEKNIK_DESTEK` | Destek talebi | yalnızca etiket değişti |
| `MENTORE_SOR` | Mentöre sor | **yeni** |
| `DUYURU` | Genel | yalnızca etiket değişti |
| `EKIP_ARKADASI` | Ekip arkadaşı arama | yalnızca etiket değişti |
| `SPONSOR` | Sponsor | istekteki dörtlüde yok ama **kapatılmadı** |

`MENTORE_SOR`, `TEKNIK_DESTEK`'ten ayrı bir türdür: o bir **sorunu** çözdürmek için açılır ("kodum çalışmıyor"), bu bir **yol** sorar ("hangi alana gitmeliyim"). Tek türde toplansalardı mentor arayan öğrenci teknik soruların arasında kaybolurdu.

Etiket değişiklikleri için **veri taşınmadı**: enum değerleri korundu. Geri alınması pahalı bir işi bedavaya yapmak olurdu. `SPONSOR` de açılmış ilanları türsüz bırakmamak için listede duruyor.

### Panel hem GÖSTERİR hem DÜZENLER (20 Ağustos 2026)

Profil ekranı panelle **birleşti**. İstek: *"panel ile profil birleşecek tek panel kalacak, düzenleme ve görüntüleme panelden olacak"*. `/panel/profil` artık `/panel`e yönlendiren bir adres; menüdeki `Profil` sekmesi kalktı. Kişinin kendi kaydı paneldeki `#profilim` bölgesinde başlar: önce salt okunur **Kimlik bilgileri**, sonra katlanır düzenleme bölümleri, en altta hesaplanan görünümler (katkı kartı, nişanlar, Rotam) ve **KVKK onayları** (`#kvkk`).

Düzenleme bölümlerinin çapaları **değişmedi**; eylemlerin dönüş adresleri de aynı kaldı. Aşağıdaki tablo birleşmeden önceki iki yüzeyli düzenin kaydıdır — "Profilde" sütunundaki her satır bugün aynı sayfada, ilgili bölümün içinde ya da hemen altında duruyor.

**7 Ağustos 2026 · önceki düzen.** Profil salt okunurdu, düzenleme panele taşınmıştı: *"foto ekleme değiştirme panelden yapılsın, profil kısmında sadece foto görünsün, iletişim bilgileri düzenleme panel sekmesine taşınsın, profilden sadece görünsün ... bilgi girişleri ve düzenleme panelden yapılsın"*.

| Bölüm | Profilde | Panelim'de |
|---|---|---|
| Fotoğraf | Görünür | Yükle / değiştir / kaldır (`#fotografim`) |
| İletişim bilgileri ve bağlantılar | Değerler görünür | Form (`#iletisim-bilgilerim`) |
| Danışman öğretmen | **Yalnızca adı** | Seçim listesi (`#danismanim`) |
| Danışman öğretmenliği (öğretmen) | Durumu görünür | İşaretleme (`#danismanligim`) |
| GençTek Yolculuğum · Bilişim Yolculuğum | Kayıtlar görünür | Ekleme + silme + belge (`#kayitlarim`) |
| Rotam | Hedefler görünür | Ekleme / durum / silme (`#rotam`) |
| CV | Dosya bağlantısı görünür | Yükle / kaldır (`#cvm`) |
| KVKK onay belgeleri | **Onay burada verilir** | — |

**Tek istisna KVKK'dır** ve bilinçli: onay bir profil bilgisi değil hukuki bir beyandır ve metnin okunduğu yerde verilmelidir. Panele taşımak onayı onaylanan metinden koparırdı; şerit ve eski `/panel/kvkk` adresi de o çapaya iniyor.

İki yüzey de **aynı bileşenlerden** basılır: kazanım listesi, Rotam kartı ve fotoğraf tek bir yerde tanımlıdır ve düzenleme yetenekleri **isteğe bağlı eylem proplarıdır** — eylem verilmediğinde form hiç basılmaz. Ayrı ayrı yazılsalardı birine eklenen alan öbüründe sessizce eksik kalırdı.

Bölümler Panelim'de **katlı** gelir: orası kullanıcının ilk gördüğü ekran ve asıl işi (başvurusu açık etkinlikler, takvim) yedi formun altında kalmamalı. Eylemler işlem sonrası `?bolum=<çapa>` ile döner ve ilgili bölüm **açık** basılır; çıpa tek başına yetmezdi çünkü kapalı bir `<details>` öğesinin çapasına inmek kullanıcıyı az önce doldurduğu formun kapanmış hâline götürürdü.

### Bölümlerin kaynakları

| Bölüm | Kaynak | Kim düzenler |
|---|---|---|
| Kimlik ve okul bilgileri | e-Okul (AuthProvider senkronu) | Hiç kimse — salt okunur |
| İletişim bilgileri (telefon, e-posta, GitHub, kişisel site, LinkedIn) | Öğrencinin kendi girdisi | Öğrenci (Panelim'den) |
| Çalışma grupları, görev rolleri, danışman | `ogrenci_calisma_grubu`, `ogrenci_gorev_rolu`, `danisman_atama` | Bkz. Bölüm 3, 4, 5 |
| **Katıldığı GençTek etkinlikleri** | **Türetilir:** adına üretilmiş belge (`faaliyet_belgesi`) + faaliyet tarihi geçmiş + `faaliyet.durum=AKTIF` | Hiç kimse — elle girilmez |
| **Kazanım kayıtları** (7 açık tür) | Öğrenci beyanı, `kullanici_kazanim` | Yalnızca öğrencinin kendisi |
| **Rotam** (hedefler) | Öğrenci beyanı, `kullanici_hedefi` | Yalnızca öğrencinin kendisi — **başkası göremez** |
| **Özgeçmiş (CV)** | Öğrencinin yüklediği dosya | Yalnızca öğrencinin kendisi |

### Katılım artık BELGEDEN doğar (7 Ağustos 2026)

İstek: *"Düzenlenen GençTek Etkinliği sonunda ismine belge oluşturulan öğrencilerin profiline katıldığı etkinlik düşecek."*

Eski kural "başvurusu SEÇİLDİ + tarihi geçti" idi; yani katılımcı listesine alınan herkes, etkinliğe gelmese bile profilinde katılmış görünüyordu. Belge üretimi, etkinliği yürüten öğretmenin **"bu kişi gerçekten katıldı"** beyanıdır ve seçilmiş olmaktan güçlü bir kanıttır.

Liste iki kaynaktan beslenir ve arada bir **geçiş tarihi** vardır (`BELGE_TEMELLI_KATILIM_BASLANGICI`, 7 Ağustos 2026):

- **Belge üretilmişse sayılır** — geçiş tarihine bakılmaz. Eski bir etkinlik için bugün üretilen belge de katılımdır.
- **Belgesi yoksa** yalnızca geçiş tarihinden **önceki** etkinliklerde "seçilmiş olmak" yeter.
- Her iki kaynakta da faaliyetin tarihi geçmiş ve `durum=AKTIF` olmalı: belge etkinlikten önce basılmış olabilir, tarihi gelmemiş etkinliği "katıldım" diye göstermek yanlış olurdu.

**Geçiş tarihi neden var:** o tarihten önce üretilmiş belgelerin kaydı yok ve üretilemez. Kural geriye işletilseydi bugün profilinde katılım görünen herkesin listesi boşalır — ve o listeden hesaplanan rozetler ile "Seferlerim" seviyeleri kazanılmış hâlden kazanılmamış hâle düşerdi. **Nişanın geri alınması, öğrenciye sistemin verdiği en kötü mesajdır.**

Belge **türü ayırt edilmez**: katılım belgesi de teşekkür belgesi de "bu kişi bu etkinlikte vardı" demektir. Teşekkür belgesi çoğunlukla konuşmacıya ya da destek verene yazılır; o da bir katılımdır.

Tekil belge üretimi artık **katılımcı kimliğiyle** çalışır, serbest metin adla değil: ad adresten gelseydi kayıt "Ayşe Yılmaz" adına düşer, o adın hangi öğrenci olduğu belirsiz kalırdı. "Listede olmayan biri için" formu serbest metin almaya devam eder ve **kayıt tutmaz**.

### Yoklama: katılımın doğrudan kanıtı (12 Ağustos 2026)

İstek: *"Öğrenci bir etkinlik için başvuru yaptı, etkinliği oluşturan kişi onayladı, ancak etkinlik anında öğrenci etkinliğe gelmedi. GençTek Yolculuğum kısmında etkinliğe katıldı görünüyor otomatik olarak, ama gerçekte katılmadı; bunun kontrolünü nasıl sağlarız."* — ve: *"etkinlik raporu yazılmadan belge oluştur seçeneği olmamalı."*

Belge, katılımın **dolaylı** kanıtıydı ve iki yönden eksikti: belge basılana kadar hiçbir şey söylemiyor, basıldığında da "listedeki herkese toplu belge" alışkanlığı gelmeyeni kapsıyordu. Artık doğrudan bir soru var.

**Sıra: yoklama → rapor → belge → GençTek Yolculuğu.**

| Adım | Kim | Nerede | Ön koşulu |
|---|---|---|---|
| Yoklama | Etkinliği yürüten kişi (`faaliyetRaporuYazabilirMi`) | Etkinlik sayfası · Yoklama kartı | Etkinlik bitmiş ve iptal değil |
| Rapor | Aynı kişi | Etkinlik raporu ekranı | Etkinlik bitmiş |
| Belge | Aynı kişi | Belgeler ekranı | **Rapor yazılmış** + kişi yoklamada **"geldi"** |

**Yoklamanın üç hâli var:** `true` geldi · `false` gelmedi · `NULL` yoklama alınmadı. Üçüncüsü ayrı tutulur; "alınmadı" ile "gelmedi" aynı sayılsaydı yoklama almayan her etkinlik bütün katılımcılarının kazanılmış katılımını silerdi. Eski başvurular `NULL` kalır ve onlarda eski kural yürümeye devam eder.

**Yoklama, dolaylı kanıtların ikisini de geçer:**

- "geldi" → katılımdır, belge beklenmez.
- "gelmedi" → katılım değildir, **belgesi olsa bile**. Yanlışlıkla toplu basılmış bir belge, gelmediği elle işaretlenmiş öğrenciyi katılmış gösteremez.
- `NULL` → belge ve "geçiş öncesi seçilmiş olmak" kuralları yürür (yukarıdaki bölüm).

**Belgenin iki ön koşulu sunucuda da sorulur** (`lib/belge/kapi.ts`), yalnızca ekranda değil: belge üretimi bir GET isteği ve adresi elle yazılabiliyor. Ekrandaki kapalı düğme nezakettir, engel değil.

**Neden rapor belgeden önce:** belge dağıtılmış ama etkinliğin ne olduğu hiçbir yerde yazılı olmayan bir kayıt, sonradan kimsenin doğrulayamayacağı bir belgedir. Rapor bitmeden yazılamadığı için "belge yalnızca bitmiş etkinlikte üretilir" kuralı da kendiliğinden sağlanır.

**Yoklamaya yalnızca SEÇİLMİŞ başvurular girer.** Yedekteki ya da reddedilmiş kişi katılımcı değildir; onun için "gelmedi" işareti bir şey söylemez. "Listede olmayan biri için" belgesi (konuşmacı, destek veren kurum) yoklamaya tabi değildir — o kişinin başvurusu da yoklaması da yoktur ve belgesi kimsenin profiline katılım düşürmez.

### Kazanım kayıtları

**"GençTek etkinliği" beyanı KAPATILDI (7 Ağustos 2026).** `GENCTEK_ETKINLIGI` tipi, sisteme hiç girilmemiş eski etkinliklerin elle beyanı içindi. Katılım artık üretilen belgeden doğduğu için beyanın işlevi kalmadı; iki kaynak yan yana dursaydı aynı etkinlik profilde biri doğrulanmış biri beyan olmak üzere iki kez görünebilirdi. Profildeki "Beyan ettiği GençTek etkinlikleri" bölümü de istek gereği kaldırıldı.

Tip **enum'dan silinmedi** ve kayıtlar temizlenmedi: girilmiş beyanlar kullanıcının verisidir, silme kararı ona aittir. Eski kayıtlar Panelim'in "Girdiğim kayıtlar" bölümünde, neden profilde görünmediklerini açıklayan bir notla birlikte durur ve silinebilir. Yeni kayıt **sunucuda** reddedilir — sekmeyi ekrandan kaldırmak, adres çubuğuna `?tur=GENCTEK_ETKINLIGI` yazan birini durdurmaz ve o kayıt hiçbir yerde görünmediği için kullanıcı kaydettiğini sanıp kaybederdi.

Öğrencinin kendi girdiği türler:

1. **GençTek dışı etkinlikler** (`DIS_ETKINLIK`) — program dışında katıldığı ulusal/uluslararası etkinlikler
2. **Yaptığı ürünler** (`URUN`) — web sitesi, uygulama, oyun, film vb.
3. **Verdiği akran eğitimleri** (`AKRAN_EGITIMI`) — akranlarına **verdiği** eğitimler
4. **Derece aldığı yarışmalar** (`YARISMA_DERECESI`) — bilişim alanında derece aldığı yarışmalar; GençTek etkinlikleri (EğitiJAM, Capture The Flag) de buraya girilebilir
5. **Sertifikalarım** (`SERTIFIKA`) — aldığı belge ve sertifikalar (6 Ağustos 2026). Belgenin kendisi "destekleyici belgeler" alanından yüklenir; ayrı bir dosya alanı açılmadı
6. **Topluluklarım** (`TOPLULUK`) — içinde yer aldığı kulüp, proje ekibi, takım (6 Ağustos 2026). **Beyandır**: aynı kulübü yazan iki öğrenci sistemde eşleştirilmez

Kurallar:
- Kayıt **öğrenci beyanıdır**: sistem doğrulamaz, onay süreci yoktur, rozet üretmez.
- Kayıtları **yalnızca sahibi** girer ve siler; giriş ve silme yüzeyi Panelim'dedir, profil yalnızca gösterir. Danışman, koordinatör ve proje yöneticisi kapsamındaki öğrencinin kayıtlarını **görür ama düzenlemez** — çalışma grubu eklemeden farkı budur.
- `derece` alanı yalnızca yarışmalarda, `duzenleyen` alanı ürünler dışında sorulur. Türüne uymayan alan gelirse **sessizce düşürülür**: ekran o alanı hiç göstermediği için değer ancak istek elle kurcalandığında gelir ve bunun kullanıcıya anlatılacak bir tarafı yok.
- Bağlantı adresinde yalnızca `http`/`https` kabul edilir. `javascript:` ile başlayan bir adres, profile bakan danışmanın tarayıcısında kod çalıştırırdı.
- **Katıldığı GençTek etkinlikleri bu tabloya yazılmaz.** Türetilebilen veriyi öğrencinin eliyle ikinci kez girmesi hem yanlış hem doğrulanamaz olurdu.

Etkinliğe dayalı türlerde (dış etkinlik, akran eğitimi, yarışma derecesi) üç alan daha sorulur:

- **GençTek programı** — `temel_etkinlik_programi` listesinden seçilir, son seçenek **"Diğer"**dir ve serbest metne düşer. Serbest metin tek başına bırakılsaydı aynı program ("EğitiJAM", "Egitijam", "eğiti jam") onlarca yazımla girilir ve program bazlı sayım hiç yapılamazdı.
- **Katılım biçimi** — yüz yüze / çevrim içi / karma.
- **Hedef kitle** — akran eğitiminde kime anlatıldığı, yarışmada hangi kategoride yarışıldığı. Serbest metindir; kitleyi listeye sığdırmaya çalışmak beyanı çarpıtırdı.

**Ürün formu** (6 Ağustos 2026) şunları sorar: Ürün Adı, **Geliştiren Ekip**, Açıklamalar, Destekleyici Görseller (`kazanim_ek`), **Linkler** (çoklu, `kazanim_baglanti`) ve **"Bu ürünü markette paylaş"** onay kutusu. Kutu varsayılan **kapalıdır**: paylaşım bir tercihtir, açık gelmesi kullanıcının istemeden vitrine çıkması demek olurdu.

**Program dosyası yüklenmez.** İstek iki seçenek sunuyordu ("ürünün tanıtımını yapabilir" ya da "programı yükleyebilir") ve "şimdilik sadece tanıtım yapsınlar" denildi. Yürütülebilir dosya kabul etmek ayrıca virüs taraması ve dağıtım sorumluluğu getirirdi.

**Ürün taahhütnamesi henüz YOK.** İstekte "ürün ekleme taahhütname imzalaması gerekmekte" yazıyor; onay altyapısı hazır (`kullanici_onayi` + `BELGE_TANIMLARI`) ama **metin gelmedi**. Metin geldiğinde ürün eklemenin önüne kapı olarak konur.

**"Yaptığım ürünler" ayrı bir bölüm olarak da gösterilir** (`/panel/kazanimlarim` ve öğrenci detay ekranı). Ayrı bir tablo değildir — aynı `kullanici_kazanim` kayıtlarının `tip=URUN` olanlarıdır; ikinci bir tablo açmak, aynı kaydın iki yerde yaşamasına ve birinden silinip diğerinde kalmasına yol açardı. Kart ekleme kısayolu verir ama **silme yolu vermez**: silme tek yerde, Panelim'in "Kayıtlarım" bölümünde durur.

### Öğretmenin kazanım kayıtları

Aynı dört tür **öğretmen için de** açıktır ve aynı tabloya yazılır: öğretmenin geliştirdiği ders materyali ile öğrencinin geliştirdiği oyun aynı türden kayıttır, ayrı tablo aynı kuralları ikinci kez yazdırırdı. Ayrışan tek şey **etiketlerdir** — öğretmende "verdiğim akran eğitimleri" yerine "verdiğim eğitimler" yazar; öğretmenin öğrencisine verdiği eğitim akran eğitimi değildir. Alan kuralları (hangi türde hangi alan sorulur) rolden bağımsızdır: role bağlansaydı aynı kayıt girenin rolüne göre farklı doğrulanır, öğretmenlikten ayrılan birinin kaydı geçersizleşirdi.

Öğretmenin kayıtlarını il koordinatörü ve proje yöneticisi tekil öğretmen kaydında **görür ama düzenlemez**; öğrenci kayıtlarındaki kuralın aynısı.

### Rotam (hedefler)

Öğrencinin **yapmak istediklerini** yazdığı bölüm; profilde en altta, yolculuk kartlarından sonra görünür (yukarısı yapılanlar, burası yapılacaklar). Hedef ekleme, durum ilerletme ve silme Panelim'dedir.

Serbest metin değil **hedef listesidir**: her hedefin başlığı, isteğe bağlı açıklaması, isteğe bağlı hedef tarihi ve durumu vardır — *Planladım / Üzerinde çalışıyorum / Tamamladım*. Biçim seçimi tek yönlü olduğu için liste seçildi: listeden serbest metne geçiş kayıpsız, tersi değil.

- **Yalnızca kişinin kendisi görür.** Danışman, koordinatör ve proje yöneticisi bu bölümü **göremez** — kazanımlardan ayrıldığı yer burasıdır. İstekte kimsenin göreceği yazmıyor ve dar taraftan başlandı: açmak kolay, öğrenciler özel hedeflerini yazdıktan sonra geri almak değil.
- Durum **tek tıkla** ilerletilir ("Başladım", "Tamamladım"); geri alma düğmesi yoktur, yanlış işaretlenen hedef silinip yeniden yazılır.
- **Düzenleme formu yoktur** — aynı gerekçe: kısa satırlardan oluşan bir listede her satırın altına ikinci bir form basmak pahalıydı.
- Profilde satırlar **düğmesiz** basılır: eylem verilmediğinde kart salt okunur hâle geçer.
- **Sıralama:** önce süren, sonra planlanan, en sonda tamamlanan; aynı durumda yakın tarih önce, tarihsizler sona. Rota ileriye bakar, biten işler listeyi tıkamaz.
- Tamamlanma **anı** ayrı tutulur ve hedef zaten tamamlanmışken korunur: başlığı düzeltmek, hedefi bugün tamamlanmış göstermemeli.
- Kişi başına **30 hedef**; kota değil, taşma koruması.

### Özgeçmiş (CV)

- Öğrenci başına **tek CV** tutulur; yeni yükleme eskisinin yerine geçer ve eski dosya silinir. Sürüm arşivi yoktur.
- Kabul edilen biçimler **pdf, doc, docx**; sınırlar `sistem_ayari` içindedir (`IZINLI_CV_TIPLERI`, `CV_MAKS_BAYT`, varsayılan 5 MB). Faaliyet eklerinin belge ayarından **ayrıdır** — ortak ayar kullanılsaydı CV için açılan doc/docx faaliyet eklerinde de açılırdı.
- Dosya public bir dizinden servis **edilmez**: indirme her istekte oturumdan ve merkezi öğrenci kapsam filtresinden geçer, kapsam dışında **404** döner.
- CV'yi öğrencinin kendisi, danışmanı, il koordinatörü ve proje yöneticisi indirebilir. Her indirme erişim logu yazar.

### Tekil profil erişimi

`/panel/ogrenciler/:id` ekranı danışman öğretmen, il koordinatörü ve proje yöneticisine açıktır; **erişim merkezi kapsam filtresinden geçer** ve kapsam dışı öğrencide "yetkiniz yok" değil **404** döner (kaydın varlığı bile sızmaz). Öğrenci kendi id'siyle bu adrese girebilir çünkü kapsam filtresi ona "yalnızca kendisi" diyor; düzenleme yolları ise kendi profilindedir.

Bu ekran listeden **daha fazla** kişisel veri gösterdiği için (iletişim bilgisi, CV, kazanım beyanları) her görüntülemede erişim logu yazılır.

---

## 15. Danışman öğretmen envanteri

`/panel/ogretmenler` ekranı, analiz dokümanı Bölüm 2'nin karşılığıdır.

- **"Öğretmen" ayrı bir kullanıcı tipi değildir**: aktif öğrenci rolü olmayan kullanıcıdır. Görev almamış öğretmen de envanterdedir — listenin en çok işe yarayan satırı, henüz danışmanlık işaretlememiş öğretmendir. YEĞİTEK personeli listeden çıkarılır: okulda görevli bir öğretmen değildir.
- Kapsam: danışman öğretmen **kendi okulu**, il koordinatörü **kendi ili**, proje yöneticisi **tüm iller**. Öğrenci hiçbir koşulda göremez.
- Danışmanın kapsamı okuldur, "kendi danışmanlığındakiler" değil (öğrenci envanterinden farkı budur): meslektaş listesi kişisel veri bakımından daha dar ve okuldaki diğer danışmanı görmek iş birliğinin ön koşulu.
- **Görev aldığı eğitim-öğretim yılları ayrı bir alanda tutulmaz**, `kullanici_rol` kayıtlarının tarihlerinden türetilir. İkinci bir yer tutulsaydı rol devrinde ikisi ayrışır ve hangisinin doğru olduğu bilinemezdi. Yıl sınırı **1 Eylül**'dür.
- Tekil kayıtta gösterilen **öğrenci ve faaliyet listeleri, bakan kişinin kendi kapsamından yeniden geçer**. Aksi halde bir danışman, meslektaşının profilini açarak onun öğrencilerinin adlarını görebilirdi.
- Ulusal/uluslararası etkinlikler için ayrı tablo yoktur: GençTek'in ulusal programları zaten `kapsam = ULUSAL` olan faaliyetlerdir, liste oradan türetilir.

---

## 16. İl bazlı paydaş envanteri

`/panel/paydaslar` ekranı, analiz dokümanı Bölüm 3'ün karşılığıdır.

- Kayıt **ile** bağlıdır ve **ilin koordinatörü** ile proje yöneticisi tarafından yönetilir. Danışman öğretmen listeyi **görür** ve kendi faaliyetine bağlar ama kayıt ekleyemez: her öğretmen ekleseydi aynı kurum onlarca kez farklı yazımla girilir ve "il bazlı iş birliği haritası" kullanılamaz hâle gelirdi.
- Zorunlu alanlar: kurum adı, tür, il, **iş birliği alanı** ve **en az bir iletişim bilgisi**. Ne için iş birliği yapılacağı yazılmayan kayıt listeyi kalabalıklaştırmaktan başka işe yaramaz; ulaşılamayan paydaş da paydaş değildir.
- Aynı ilde aynı adla ikinci **aktif** kayıt açılamaz. Pasif kayıt engel değildir — kurum gerçekten yeniden iş birliğine dönebilir.
- **Silme yoktur**: iş birliği bitince kayıt pasife alınır, geçmiş faaliyet bağlantıları korunur.
- Kaydın **ili değiştirilemez**: başka ile taşımak, o ilin envanterine haberi olmadan satır eklemek olurdu.
- Faaliyete paydaş bağlamak, paydaş kaydını yönetmekten **ayrı** bir yetkidir ve faaliyetin sahipliğine bakar (ek yükleme kapısıyla aynı). Paydaşın ili faaliyetin iliyle aynı olmak zorunda değildir.

---

## 17. EBA dışı giriş: mezun ve paydaş temsilcisi

EBA hesabı olmayan iki grup sisteme girebilir. Bu, projenin ilk kararlarından
birini (**"dış kayıt yoktur ve olmayacaktır"**) bilerek tersine çevirir; o
karar hâlâ **okul tarafı için** geçerlidir — öğrenci ve öğretmenin şifresi yok
ve olmayacak.

### Akış

```
Kişi başvuru formunu doldurur (tür + il → kimlik, kurum/mezuniyet, gerekçe, şifre)
  └─ aydınlatma metni OKUTULUR ve onayı başvuru satırına yazılır
       └─ başvuru BEKLIYOR durumunda kuyruğa girer, proje yöneticilerine bildirim gider
            ├─ ONAY  → kullanici + kullanici_rol + iletişim profili + dis_kimlik açılır
            │           şifre başvurudan dis_kimlik'e TAŞINIR, başvuruda NULL'lanır
            └─ RET   → gerekçe ZORUNLU, şifre NULL'lanır, kayıt durur; tekrar başvuru serbest
```

**Onaylanana kadar `kullanici` satırı açılmaz.** Açılsaydı onaysız kişi kapsam
filtrelerine, envanter sayılarına ve öğretmen listesine ("öğrenci rolü olmayan
herkes") sızardı.

**Kararı yalnızca proje yöneticisi verir.** Talep böyle: mezun/paydaş kabulü
ekosistem düzeyinde bir karardır, ilin değil.

### Kimlik doğrulama

- **E-posta + şifre.** Şifre `dis_kimlik` tablosunda, scrypt özetiyle
  (`scrypt$N$r$p$tuz$ozet`). Parametreler özetin **içindedir**: ileride
  sertleştirilirse eski özetler doğrulanmaya devam etmeli.
- **Şifre tutan tek tablo `dis_kimlik`tir** ve `kullanici`dan ayrıdır. Sütun
  olarak eklenseydi "şifresi olmayan giriş yapamaz" garantisi şemadan değil
  uygulamadan gelirdi.
- E-posta **küçük harfe indirgenerek** saklanır ve karşılaştırılır — ama Türkçe
  kuralla değil: `toLocaleLowerCase("tr")` "I"yı "ı"ya çevirir ve kişi kendi
  adresiyle giremez.
- **Kaba kuvvet koruması:** 5 hatalı denemeden sonra 15 dakika kilit. Kilit
  **süreli**; kalıcı olsaydı saldırgan başkasının hesabını kasten kilitleyebilirdi.
  Kilit gelince sayaç sıfırlanır, kilidi biten kişi tam bir hak setiyle döner.
- **Parola sıfırlama:** jetonun kendisi değil **özeti** saklanır, 60 dakika
  geçerlidir ve tek kullanımlıktır. İstek ekranı, adres kayıtlı olsun olmasın
  **aynı sonucu** gösterir; aksi hâlde "hangi adres kayıtlı" sorusunu cevaplayan
  bir araç olurdu.
- **İkinci faktör yoktur** (karar: 5 Ağustos 2026).

### Alanlar ve doğrulama

- **Mezun:** mezuniyet yılı zorunlu, okul **isteğe bağlı** — kapanmış ya da
  referans tablosunda bulunmayan bir okuldan mezun olan kişi başvuramaz hâle
  gelmemeli.
- **Paydaş temsilcisi:** kurumu **envanterden seçer**, serbest metin yazamaz
  (aynı gerekçe: `paydasEkleyebilirMi`). Aynı kurumdan birden fazla temsilci
  başvurabilir. Görev/unvan zorunludur.
- **Gerekçe zorunlu:** adı ve e-postası olan ama ne yapmak istediği yazılmayan
  başvuru, onaylayan için karar verilemez bir kayıttır.
- **Şifre:** en az 10 karakter, en az dört farklı karakter, kişinin adını /
  soyadını / e-posta kullanıcı adını içeremez. Karmaşıklık maskesi bilinçli
  olarak yok — maskeler kullanıcıyı `Sifre123!` gibi tahmin edilebilir
  kalıplara iter.
- **Aynı e-posta için tek bekleyen başvuru** (kısmi unique index). Reddedilmiş
  ya da onaylanmış eski başvurular engel değildir.

### KVKK

**İki ayrı aydınlatma onayı vardır ve ikisi de gereklidir:**

1. **Başvuru anında** — `dis_kullanici_basvurusu.aydinlatma_onay_tarihi`. Veri
   işleme burada başlar, oysa `kullanici_onayi`na yazılamaz: henüz kullanıcı
   kaydı yoktur.
2. **İlk girişte** — `/onay` kapısı; aydınlatma + açık rıza. Bu, sisteme
   girdikten sonra işlenen verinin karşılığıdır.

Koordinatör taahhütnamesi ve gizlilik sözleşmesi bu rollerden **istenmez**:
yürürlükteki yetkileriyle hiçbir öğrenci/öğretmen kişisel verisine
erişmiyorlar. Yükümlülüğü doğuran şey rolün adı değil eriştiği veridir —
kapsam genişletilirse bu karar da yeniden verilmelidir.

### Kenar durumlar

- **Onay bekleyen kişi giriş denerse**, şifresi doğruysa "başvurunuz onay
  bekliyor" denir; yanlışsa genel hata. Bilgi yalnızca başvuruyu gerçekten
  yapmış olana verilir.
- **Pasife alınmış dış kullanıcı**, şifresi doğru olsa da genel hata alır.
  "Hesabınız kapatıldı" demek hesabın varlığını doğrulamaktan başka işe yaramaz.
- **Başarılı giriş, bekleyen sıfırlama jetonunu düşürür**: şifresini
  hatırladığını kanıtlayan kişi için jetonun açık kalmasının anlamı yok.
- **Gecelik senkron dış kullanıcılara dokunmaz** — yalnızca aktif danışmanları
  tarar; `AuthProvider` bu kimlikleri zaten tanımaz.
- **Dış kullanıcı danışman öğretmen olamaz**: işaretleme akışı kurum kodu
  olmayan kullanıcıyı reddeder (YEĞİTEK personelinde de aynı kural).
