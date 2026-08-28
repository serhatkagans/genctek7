# GençTek — Veri Modeli

Postgres sözdizimiyle yazıldı (veritabanı henüz sabitlenmedi — bkz. SKILL.md). Bir ORM/query builder (Prisma, Knex, Drizzle) üzerinden tanımlanması önerilir; burada verilenler şemanın mantığıdır, birebir DDL olarak kopyalanması şart değildir.

İçindekiler:
1. Referans tabloları
2. Kullanıcı ve rol
3. Danışman atama
4. Çalışma grupları
5. Öğrenci envanteri
6. Faaliyet, dosya/görsel ve yorum
7. Başvuru
8. Log ve bildirim
9. Kritik kısıtlar
10. Seed verisi

---

## 1. Referans tabloları

**il** — `il_kodu` (PK, char(2)), `ad`

**ilce** — `ilce_kodu` (PK), `il_kodu` (FK), `ad`

**kurum** — `kurum_kodu` (PK, int), `ad`, `il_kodu`, `ilce_kodu`, `okul_turu`, `aktif`

Bu üç tablo MEB kaynaklarından beslenir, uygulama içinden düzenlenmez.

---

## 2. Kullanıcı ve rol

**kullanici**
| Alan | Tip | Not |
|---|---|---|
| id | serial, PK | |
| auth_provider_id | varchar(64), unique | Mock aşamada test kullanıcı kimliği, sonra EBA kimliği. Dış kullanıcılarda `dis-<başvuruId>` — bu kimlik AuthProvider'a hiç sorulmaz |
| ad, soyad | varchar(100) | Salt okunur |
| cinsiyet | char(1) | Salt okunur |
| kurum_kodu | int, FK | Salt okunur |
| il_kodu, ilce_kodu | char(2)/char(4) | Salt okunur |
| sinif | varchar(10), null | Öğrenci için |
| brans | varchar(100), null | Öğretmen için |
| egitim_ogretim_yili | varchar(9) | "2025-2026" |
| son_senkron_tarihi | timestamptz | Kurum kodu değişimi takibi için |
| aktif | boolean | |

**kullanici_rol**
| Alan | Tip | Not |
|---|---|---|
| id | serial, PK | |
| kullanici_id | int, FK | |
| rol_kodu | varchar(20) | OGRENCI / DANISMAN / IL_KOORDINATOR / PROJE_YONETICISI / MEZUN / PAYDAS_TEMSILCISI |
| il_kodu | char(2), null | IL_KOORDINATOR için kapsam |
| kurum_kodu | int, null | DANISMAN için kapsam |
| baslangic_tarihi | timestamptz | |
| bitis_tarihi | timestamptz, null | null = aktif |
| atayan_kullanici_id | int, null, FK | |

Roller geçmişli tutulur; silme yapma, `bitis_tarihi` yaz.

`MEZUN` ve `PAYDAS_TEMSILCISI` rolleri elle atanmaz; yalnızca onaylanan bir dış
başvurudan doğar (aşağıdaki 2a). İkisinde de `kurum_kodu` ve `ilce_kodu`
boştur, `cinsiyet` "B" (belirtilmedi) olarak açılır — dış başvuruda sorulmuyor,
çünkü toplanmayan veri en güvenli veridir.

## 2a. EBA dışı giriş (mezun, paydaş temsilcisi)

**dis_kullanici_basvurusu** — başvurunun kendisi. Onaylanana kadar `kullanici`
satırı **açılmaz**; açılsaydı onaysız kişi kapsam filtrelerine ve envanter
sayılarına sızardı.

| Alan | Tip | Not |
|---|---|---|
| id | serial, PK | |
| tur | enum | MEZUN / PAYDAS — rol değil, rol yalnızca onayla doğar |
| ad, soyad | varchar(100) | |
| eposta | varchar(150) | Küçük harfe indirgenmiş; giriş adı olacak |
| telefon | varchar(20), null | |
| il_kodu | char(2), FK | |
| sifre_ozeti | varchar(200), null | Onayda `dis_kimlik`e **taşınır**, rette de NULL'lanır |
| mezun_kurum_kodu | int, null, FK | MEZUN: isteğe bağlı |
| mezuniyet_yili | int, null | MEZUN: zorunlu |
| paydas_id | int, null, FK | PAYDAS: zorunlu, envanterden seçilir |
| gorev_unvani | varchar(150), null | PAYDAS: zorunlu |
| beyan | text | Kararın verildiği alan |
| aydinlatma_onay_tarihi | timestamptz | Başvuru anındaki KVKK onayı |
| durum | enum | BEKLIYOR / ONAYLANDI / REDDEDILDI |
| karar_veren_kullanici_id | int, null, FK | |
| karar_tarihi | timestamptz, null | |
| ret_gerekcesi | text, null | Rette **zorunlu** (CHECK) |
| olusan_kullanici_id | int, null, unique, FK | Onayla açılan kullanıcı |
| olusturma_tarihi | timestamptz | |

Aydınlatma onayı `kullanici_onayi`nda **tutulamaz**: başvuru anında kullanıcı
kaydı yoktur, oysa veri işleme o anda başlar. Silme yoktur — "bu kişi neden
alınmadı" sorusunun cevabı, aynı kişi tekrar başvurduğunda gerekiyor.

**dis_kimlik** — onaylanmış dış kullanıcının giriş kimliği. Sistemin **şifre
tutan tek tablosudur** ve `kullanici`dan bilinçli olarak ayrıdır: sütun olarak
eklenseydi EBA kimlikli her satırda boş bir şifre sütunu dururdu ve "şifresi
olmayan giriş yapamaz" garantisi şemadan değil uygulamadan gelirdi.

| Alan | Tip | Not |
|---|---|---|
| kullanici_id | int, PK, FK | |
| eposta | varchar(150), unique | Giriş adı |
| sifre_ozeti | varchar(200) | `scrypt$N$r$p$tuz$ozet` — parametreler özetin içinde |
| basarisiz_deneme | int | Başarılı girişte sıfırlanır |
| kilit_bitis_tarihi | timestamptz, null | 5 hatalı denemede 15 dk |
| sifirlama_jetonu_ozeti | varchar(200), null | Jetonun kendisi DEĞİL, özeti |
| sifirlama_son_gecerlilik | timestamptz, null | 60 dk |
| son_giris_tarihi | timestamptz, null | |

**ogretmen_profil**
`kullanici_id` (PK, FK), `danisman_olmak_istiyor` (boolean), `isaretleme_tarihi`, `eposta`, `telefon`, CV alanları, bağlantı adresleri, `aciklama`, `kurum_adi`, `gorev_unvani`

Bu bayrak `true` olmadan öğretmen danışman seçim listesinde görünmez. Tablonun
adı tarihseldir; içeriği "öğrenci OLMAYAN kullanıcının profili"dir — dış
kullanıcıya özgü alanlar için bkz. "Mezun / paydaş / mentör profili".

**kullanici_onayi** — onay belgeleri
`kullanici_id` + `belge` (PK), `onay_tarihi`

| Alan | Not |
|---|---|
| belge | AYDINLATMA / ACIK_RIZA / TAAHHUTNAME / GIZLILIK_SOZLESMESI |
| onay_tarihi | Yeniden onay bu tarihi günceller; yeni satır açılmaz |

Belge başına **en fazla bir satır**. Onay bir DURUMDUR, geçmiş tablosu değil:
"şu an geçerli metni kabul etmiş mi" sorusuna cevap verir. Onayın kendisi ayrıca
`erisim_logu`'na yazıldığı için "kim ne zaman onayladı" izi denetlenebilir bir
yerde zaten duruyor.

**Metnin sürümü saklanmaz.** Tazelik, `onay_tarihi` ile `sistem_ayari`'ndaki
metnin `guncelleme_tarihi`'si karşılaştırılarak bulunur; metin güncellenince
onay kendiliğinden eskir.

**Hangi belgenin kimden isteneceği kodda durur** (`src/lib/kvkk/kurallar.ts` ·
`BELGE_TANIMLARI`), veritabanında değil — rol eşlemesi bir iş kuralıdır ve rol
tanımı değiştikçe migration yazmak gerekmemeli. Yürürlükteki eşleme:
aydınlatma → öğrenci, açık rıza → **herkes**, taahhütname ve gizlilik sözleşmesi
→ il koordinatörü.

Bu tablo profil tablolarında DEĞİL ayrı durur: YEĞİTEK personeline sağlama
akışında ne `ogrenci_profil` ne `ogretmen_profil` satırı açılıyor, oysa açık rıza
ondan da isteniyor.

---

## 3. Danışman atama

**danisman_atama** — geçmiş tablosu, güncelleme yapma
| Alan | Tip | Not |
|---|---|---|
| id | serial, PK | |
| ogrenci_id | int, FK | |
| danisman_kullanici_id | int, FK | Danışman öğretmen veya il koordinatörü |
| atama_tipi | varchar(20) | OGRENCI_SECTI / OTOMATIK / IL_KOORDINATOR_FALLBACK / DEVIR |
| baslangic_tarihi | timestamptz | |
| bitis_tarihi | timestamptz, null | null = aktif atama |
| kapanma_nedeni | varchar(50), null | OGRETMEN_AYRILDI / OGRENCI_OKUL_DEGISTIRDI / YENIDEN_SECIM / DEVIR / DANISMANLIK_BIRAKILDI / IL_KOORDINATORU_OLDU / OGRENCI_ISTEGI |

Devir yaparken: eski kaydın `bitis_tarihi`'ni yaz, yeni kayıt aç. Aynı öğrenci için aynı anda birden fazla `bitis_tarihi IS NULL` kaydı olamaz.

---

## 4. Çalışma grupları

**calisma_grubu** — `id`, `ad`, `sira_no`, `aktif` (boolean)

Silme yok. Kapanan grup `aktif=false`.

**ogrenci_calisma_grubu** — `ogrenci_id` (FK), `calisma_grubu_id` (FK), `secim_tarihi`, `ekleyen_kullanici_id` (FK, null). Bileşik PK.

Öğrenci başına **üst sınır yoktur**; istediği kadar grup seçebilir. Buna karşılık gelen bir sistem ayarı da tutulmaz.

`ekleyen_kullanici_id` **NULL ise seçim öğrencinin kendisine aittir**; dolu ise kaydı danışmanı, il koordinatörü ya da proje yöneticisi öğrencinin profilinden açmıştır. Alan **yetki kararında kullanılmaz** — yalnızca öğrenci "bu grubu kim ekledi" sorusunun cevabını görebilsin diye tutulur.

Öğrencinin seçim ekranı kaydı **sil-yeniden-yaz ile güncellemez, fark hesaplar**: aksi halde (a) yalnızca aktif gruplar listelendiği için pasif bir gruba ait geçmiş seçim silinir, (b) danışmanın açtığı kaydın `secim_tarihi` ve `ekleyen_kullanici_id` izi sıfırlanırdı.

---

## 4a. Etkinlik programları (Temel Etkinlik / Çalışma Grubu Etkinliği)

**temel_etkinlik_programi** — `id`, `ad` (unique), `grup` (TEMEL_ETKINLIK / CALISMA_GRUBU_ETKINLIGI), `sira_no`, `aktif`

`calisma_grubu` ile aynı mantık: liste koda gömülmez, proje yöneticisi yönetir, **silme yoktur** — kapanan program `aktif=false` yapılır, geçmiş faaliyetlerin bağlantısı korunur.

İl Etkinliği'nin burada karşılığı **yoktur**: il koordinatörü faaliyet adını serbestçe girer, sabit isim listesi tutulmaz.

---

## 5. Öğrenci envanteri

**ogrenci_profil** — `kullanici_id` (PK, FK), `eposta`, `telefon`, `github_url`, `kisisel_site_url`, `linkedin_url`, `cv_dosya_adi`, `cv_depolama_yolu`, `cv_mime_tipi`, `cv_boyut_bayt`, `cv_yuklenme_tarihi`

Aydınlatma onayı burada DEĞİL, `kullanici_onayi`'nda (bkz. Bölüm 2).

Mesleki bağlantılar (`github_url`, `kisisel_site_url`, `linkedin_url`) varchar(200), null. **Öğrenci beyanıdır**: sistem sayfanın gerçekten ona ait olduğunu doğrulamaz, yalnızca biçimi kontrol eder — yalnızca `http`/`https`, protokolsüz girilen adres reddedilmez **tamamlanır** (`github.com/ali` → `https://github.com/ali`). Doğru bilgi vermiş birini biçim yüzünden geri çevirmenin karşılığı yok. Üçü ayrı sütundur, tek bir "bağlantılar" JSON'u değil: her biri ekranda kendi ikonuyla çıkar ve LinkedIn kutusuna GitHub adresi yazıldığında uyarılabilir.

CV alanları `faaliyet_ek` ile **aynı depolama soyutlamasını** kullanır: `cv_depolama_yolu` bir anahtardır, dosya yolu değil; orijinal ad yalnızca indirirken gösterilmek üzere saklanır. Öğrenci başına **tek kayıt** tutulur — yeni yükleme eskisinin yerine geçer, sürüm arşivi tutulmaz. Alanlar birlikte dolar ya da birlikte boşalır (`ck_ogrenci_profil_cv`).

**ogrenci_gorev_rolu**
`id`, `ogrenci_id` (FK), `rol_kodu` (IL_TEMSILCISI / ILCE_TEMSILCISI / OKUL_TEMSILCISI), `egitim_ogretim_yili`, `il_kodu` / `ilce_kodu` / `kurum_kodu`, `atayan_kullanici_id`, `atama_tarihi`

Kapsam sütunu **role göre** dolar ve `ck_ogrenci_gorev_kapsam` ile zorlanır. Kapsam öğrencinin güncel kaydından okunmaz, atama anında göreve **yazılır**: öğrenci dönem içinde okul (dolayısıyla ilçe) değiştirdiğinde görev verildiği yerde kalmalıdır. `ilce_kodu` → `ilce(kod)` FK'sidir; ilçesi olmayan öğrenciye İlçe Temsilciliği verilemez, kısıt zaten reddeder.

**kullanici_kazanim** — kullanıcının kendi girdiği başarı/üretim kayıtları
`id`, `kullanici_id`, `tip` (GENCTEK_ETKINLIGI / DIS_ETKINLIK / URUN / AKRAN_EGITIMI / YARISMA_DERECESI / SERTIFIKA / TOPLULUK / DIGER), `baslik`, `aciklama`, `tarih`, `baglanti_url`, `derece`, `duzenleyen`, `temel_etkinlik_programi_id`, `katilim_bicimi`, `hedef_kitle`, `gelistiren_ekip`, `markette_paylasilsin`, `olusturma_tarihi`

Tablo öğrenci için açıldı, **öğretmen de aynı tabloya yazar** (bu yüzden `ogrenci_id` → `kullanici_id` olarak yeniden adlandırıldı; öğrenci envanterinde duruyor olması tarihsel). Öğretmenin geliştirdiği ürün ile öğrencinin geliştirdiği ürün aynı kayıttır; ikinci bir tablo aynı doğrulama kurallarını, aynı formu ve aynı silme yolunu ikinci kez yazdırırdı. Ayrışan tek şey **etiketlerdir**: öğretmende "verdiğim akran eğitimleri" yerine "verdiğim eğitimler" yazar (`src/lib/kazanim/kurallar.ts`), alan kuralları rolden bağımsızdır — aksi hâlde aynı kayıt, girenin rolüne göre farklı doğrulanır, öğretmenlikten ayrılan birinin kaydı geçersizleşirdi.

| Alan | Not |
|---|---|
| tip | DIS_ETKINLIK: GençTek dışı ulusal/uluslararası etkinlikler · URUN: web sitesi, uygulama, oyun, film · AKRAN_EGITIMI: kullanıcının **verdiği** eğitimler · YARISMA_DERECESI: bilişim alanında derece aldığı yarışmalar (GençTek içi ve dışı) · **SERTIFIKA**: aldığı belge/sertifika (6 Ağustos 2026) · **TOPLULUK**: içinde yer aldığı kulüp, proje ekibi, takım (6 Ağustos 2026) |
| gelistiren_ekip | varchar(250), null. Ürünü geliştiren ekip. Yalnızca tip=URUN'de anlamlı, diğer tiplerde sessizce düşürülür |
| markette_paylasilsin | boolean, default **false**. "Bu ürünü markette paylaş" onay kutusu. Varsayılan kapalı: paylaşım bir TERCİHTİR, açık gelmesi kullanıcının istemeden vitrine çıkması demek olurdu. GençTek Market (I maddesi) bu bayrağı okuyacak |
| derece | varchar(120), null. Serbest metin ("Türkiye 1.si", "Mansiyon") — adlandırma yarışmadan yarışmaya değiştiği için sabit liste yok. Yalnızca YARISMA_DERECESI'nde anlamlı |
| duzenleyen | varchar(200), null. Düzenleyen kurum. URUN'de anlamsızdır, o türde yazılmaz |
| temel_etkinlik_programi_id | FK, null. Kayıt bir GençTek programına aitse (EğitiJAM, Capture The Flag…) buraya bağlanır. Formdaki **"Diğer"** seçeneği bu alanı boş bırakıp `duzenleyen`e serbest metin yazar: liste tek başına bırakılsaydı listede olmayan etkinlik hiç girilemez, serbest metin tek başına bırakılsaydı aynı program onlarca yazımla girilip sayılamaz olurdu |
| katilim_bicimi | KatilimBicimi enum, null: YUZ_YUZE / ONLINE / KARMA. URUN'de sorulmaz. **YENİ kayıtlarda zorunlu** (5 Ağustos 2026), sütun yine de NULL kabul eder: eski kayıtlar geriye dönük DOLDURULMADI — boş bırakılmış bir beyanı sonradan "yüz yüze" saymak veriyi uydurmak olurdu. Zorunluluk uygulama katmanında (`kazanimKabulEdilirMi`), veritabanı kısıtında değil |
| hedef_kitle | varchar(200), null. Akran eğitiminde kime anlatıldığı, yarışmada hangi kategoride yarışıldığı. Serbest metin — kitleyi listeye sığdırmaya çalışmak beyanı çarpıtırdı |
| olusturma_tarihi | Sıralama için zorunlu: kullanıcının girdiği `tarih` boş olabildiği için tek başına ölçüt olamıyor |

**Sertifika ve topluluk için de ayrı tablo yoktur** (6 Ağustos 2026). Sertifika, belgesi `kazanim_ek`'e yüklenen bir kazanım kaydıdır — ayrı tablo, aynı dosya yükleme yolunu ikinci kez yazdırırdı. Topluluk ise bir **beyandır**: aynı kulübü yazan iki öğrenci sistemde eşleştirilmez. Eşleştirme, topluluk için ayrı bir referans tablosu ve üyelik yönetimi demekti; istenen ise kişinin "içinde yer aldığı toplulukları gösterebileceği" bir bölümdü.

**"Yaptığım ürünler" için ayrı tablo yoktur**: bu tablodaki `tip=URUN` kayıtlarıdır, yalnızca ayrı bir kartta gösterilir. İkinci bir tablo aynı kaydın iki yerde yaşamasına ve birinden silinip diğerinde kalmasına yol açardı.

**Katıldığı GençTek etkinlikleri bu tabloda TUTULMAZ.** O liste `basvuru` (durum=SECILDI, `katildi_mi` yoklaması) + `faaliyet_belgesi` + `faaliyet` (tarihi geçmiş, durum=AKTIF) üzerinden türetilir. Türetilebilen veriyi kullanıcının eliyle ikinci kez girmesi hem yanlış hem doğrulanamaz olurdu; aynı gerekçeyle İl/İlçe/Okul Temsilcisi görevleri (kaynağı `ogrenci_gorev_rolu`), öğretmenin danışmanlıkları (`danisman_atama`) ve düzenlediği faaliyetler (`faaliyet.duzenleyen_kullanici_id`) de buraya yazılmaz.

**kazanim_baglanti** — kazanım kaydının bağlantıları (6 Ağustos 2026)
`id`, `kazanim_id` (FK → `kullanici_kazanim`, ON DELETE CASCADE), `adres`, `etiket`, `sira_no`

Ürün formundaki **"Linkler"** (çoğul) için: bir ürünün deposu, canlı adresi ve tanıtım videosu ayrı ayrı olabilir. Tek alana virgülle sığdırmak, adresleri doğrulanamaz ve tıklanamaz bir metne çevirirdi. `etiket` bağlantının ne olduğunu söyler ("kaynak kod", "canlı sürüm").

Tablodaki **`baglanti_url` kaldırılmadı**: dolu kayıtlar var ve diğer tipler onu kullanmaya devam ediyor. Taşıma da yapılmadı — geçmiş kayıtları yeni tabloya kopyalamak aynı adresin iki yerde yaşamasına ve birinden silinip öbüründe kalmasına yol açardı.

**kazanim_ek** — kazanım kaydının destekleyici belgeleri (5 Ağustos 2026)
`id`, `kazanim_id` (FK → `kullanici_kazanim`, ON DELETE CASCADE), `dosya_adi`, `depolama_yolu`, `mime_tipi`, `boyut_bayt`, `kapak_mi`, `yuklenme_tarihi`

"Etkinliğe dair fotoğraf, belge" için. Depolama deseni `faaliyet_ek` ile **aynı**: `depolama_yolu` bir anahtardır, dosya yolu değil. Ayrı tablo çünkü bir kayda birden çok dosya eklenir; sütun olsaydı ya tek dosyayla sınırlı kalırdık ya da `dosya_1, dosya_2` gibi sürdürülemez bir şema çıkardı.

**Soft-delete YOKTUR** — `faaliyet_ek`'ten ayrıldığı tek nokta. Faaliyet eki başkalarının göreceği ortak bir içeriktir ve moderasyon gereği "kim sildi" kaydı kalır; kazanım eki ise kişinin **kendi** beyanının parçasıdır ve kazanım kaydının kendisi de kalıcı siliniyor. Yarısı hard, yarısı soft silinen bir kayıt çifti tutarsız olurdu. Silme `erisim_logu`na yazılır.

**`kapak_mi` — ürünün vitrin kapağı** (28 Ağustos 2026 · istek: "vitrine ürün eklerken bir tane ürün görseli ekleyebilelim"). Kapak için `kullanici_kazanim` üzerine ayrı bir dosya alanı **açılmadı**: açılsaydı aynı dosya iki yerde yaşar, ek listesinden silinen görsel kapakta kalabilirdi. Bayrak ekin üzerinde durduğu için ek silinince kapak da kendiliğinden düşer. Kazanım başına en fazla bir işaretli ek bulunur; teklik uygulama katmanında korunur (yeni kapak yazılınca eskisinin işareti düşer) — kısmi tekil indeks, iki satırı güncelleyen bu işlemi yazma sırasına bağımlı kılardı. Yalnızca **görsel** tipli ek işaretlenebilir: kapak yerine pdf basmak kırık kart demekti.

**İşaretli ek yoksa ekran en eski görsel eki kapak sayar** (`src/lib/kazanim/kapak.ts`). Sütun açılmadan önce girilmiş ürünlerin görselleri vardı; migration onlara geriye dönük kapak **atamıyor** — birini seçip vitrine koymak, sahibinin vermediği bir kararı onun adına vermek olurdu. Gösterim kuralı bu boşluğu veriyi değiştirmeden dolduruyor, sahibi kendi kapağını seçtiği anda tercihine dönüyor.

Tip ve boyut sınırları faaliyet ekleriyle **ortaktır** (`IZINLI_GORSEL_TIPLERI`, `IZINLI_BELGE_TIPLERI`, `GORSEL_MAKS_BAYT`, `BELGE_MAKS_BAYT`): ikisi de aynı türde içerik taşıyor. CV'nin ayrı sınırları olmasının sebebi tür farkıydı (orada doc/docx kabul ediliyor); burada öyle bir fark yok. Ayrışırlarsa değişecek tek yer `src/lib/kazanim/ek.ts`.

**kullanici_hedefi** — "Rotam": kişinin hedefleri (6 Ağustos 2026)
`id`, `kullanici_id` (FK → `kullanici`, ON DELETE CASCADE), `baslik`, `aciklama`, `durum` (HedefDurumu: PLANLANDI / SURUYOR / TAMAMLANDI), `hedef_tarihi` (DATE), `tamamlanma_tarihi`, `olusturma_tarihi`, `guncelleme_tarihi`

**Kazanımdan ayrı tablodur** ve bu bilinçlidir: ikisi de kullanıcının girdiği metin olsa da kazanım "yaptım" beyanıdır, geçmişe bakar ve danışman/koordinatör **görür**; hedef "yapmak istiyorum" beyanıdır, geleceğe bakar ve **kişiye özeldir**. Tek tabloda birleştirmek, birinin görünürlük kuralını öbürüne bulaştırırdı.

**Serbest metin yerine liste** seçildi. Seçim tek yönlüdür: listeden serbest metne geçiş kayıpsızdır (satırlar alt alta yazılır), tersi değildir (paragraf hedeflere bölünemez, "durum" bilgisi sonradan üretilemez).

| Alan | Not |
|---|---|
| hedef_tarihi | **DATE**, saat yok: "bu yıl içinde" ölçeğinde bir niyet, randevu değil. Timestamptz olsaydı saat dilimi kayması hedefi bir gün oynatırdı. Geçmiş tarih **kabul edilir** — hedef tarihi geçmiş ama hâlâ süren bir hedefi reddetmek, kişiyi kendi kaydını düzenleyemez hâle getirirdi |
| tamamlanma_tarihi | `durum`dan **türetilemez**: durum TAMAMLANDI'ya çevrildiğinde bunun ne zaman olduğunu başka hiçbir alan tutmuyor. `ck_kullanici_hedefi_tamamlanma`, tamamlanmamış hedefte dolu kalmasını engeller |
| durum | VAZGECILDI değeri **yoktur** — vazgeçilen hedef silinir. Ayrı bir durum, profilde vazgeçilenlerin kalıcı listesini tutmak olurdu |

Kişi başına **30 hedef** sınırı uygulama katmanındadır (kota değil, taşma koruması: profil sayfası hepsini tek seferde basıyor).

**kullanici_referansi** — "Referanslarım": öğrencinin gösterdiği referanslar (28 Ağustos 2026)
`id`, `kullanici_id` (FK → `kullanici`, ON DELETE CASCADE), `ad_soyad`, `kurum`, `telefon`, `eposta`, `olusturma_tarihi`

İstek: *"Öğrenciler için profile referanslar bölümü ekleyelim. Referans için ad soyad telefon kurum eposta"*.

**`ogrenci_profil`e sütun olarak eklenmedi:** referans birden çok olabiliyor ve dört alan taşıyor; profil satırına `referans1_ad`, `referans2_ad` diye açılsaydı sayı koda gömülür, bir tanesinin silinmesi de sütun kaydırmaya dönerdi.

**`kullanici`ya bağlı, "öğrenci"ye değil** — `kullanici_hedefi` ile aynı karar. Bölüm yalnızca öğrenci panelinde basılıyor; rol kısıtı verinin şeklinden değil ekranın kararından geliyor ve öğretmene açılmak istenirse şema değişmiyor.

| Alan | Not |
|---|---|
| ad_soyad | Zorunlu. Adı olmayan bir referans kimseyi göstermiyor |
| kurum | İsteğe bağlı — emekli bir öğretmenin kurumu olmayabilir; zorunlu olsaydı kişi olmayan bir kurum adı uydururdu. Unvan da buraya yazılabilir, beşinci sütun açılmadı |
| telefon / eposta | **En az biri dolu olmalı** (`ck_referans_iletisim`): ulaşılamayan bir referans, referans değildir. Kısıt uygulama katmanında da var; tabloya ileride başka bir ekrandan da yazılabilir (emsali `ck_mentorluk_ret_gerekcesi`) |
| olusturma_tarihi | Listenin sırası. Ayrı `sira_no` yok — liste elle sıralanacak kadar uzun değil (en fazla beş satır) |

**Satırın içi ÜÇÜNCÜ BİR KİŞİNİN kişisel verisidir:** telefon ve e-posta öğrencinin değil, referans gösterilen kişinin bilgisi ve o kişinin sistemde kaydı olmayabilir. Kayıt bu yüzden kişiye özel — yalnızca sahibi görüyor ve yalnızca kendi ürettiği özgeçmişe giriyor; danışman/koordinatör/merkez ekranlarında görünmüyor. Görünseydi sistem, izni alınmamış üçüncü kişilerin iletişim bilgilerinden oluşan ve il çapında süzülebilen bir rehbere dönüşürdü. Erişim kaydına referansın **adı yazılmaz**.

Kişi başına **5 referans** sınırı uygulama katmanındadır (kota değil, listeyi bir iletişim defterine dönüşmekten alıkoyma).

> **Faz 2 (rozet sistemi) notu.** Rozet/katkı kategorileri netleşti: İl Temsilcisi, Okul Temsilcisi, verdiği akran eğitimleri, çalışma grubu yöneticiliği / organizasyon ekibi üyeliği (bu madde hâlâ belirsiz), moderatörlük yaptığı etkinlikler, derece aldığı yarışmalar (GençTek içi ve dışı). Liste mevcut `tip` değerleriyle büyük ölçüde örtüştüğü için Faz 2 açıldığında **yeni tablo açma**: bu tablonun `tip` alanını genişlet. Bazı kategorilerin (İl/Okul Temsilcisi) kaynağı zaten `ogrenci_gorev_rolu`, bazılarının (moderatörlük) kaynağı faaliyet ilişkisidir — türetilebilenler için ayrıca kayıt tutma.

---

## 6. Faaliyet, dosya/görsel ve yorum

**faaliyet**
| Alan | Tip | Not |
|---|---|---|
| id | serial, PK | |
| ad, aciklama | text | |
| tarih | timestamptz | |
| kapsam | varchar(10) | OKUL / IL / ULUSAL — **kimin başvurabileceğini** belirler |
| etkinlik_kategorisi | varchar(30) | TEMEL_ETKINLIK / CALISMA_GRUBU_ETKINLIGI / IL_ETKINLIGI — **etkinliğin ne olduğunu** belirler. Zorunlu |
| temel_etkinlik_programi_id | int, null, FK | Yalnızca ilk iki kategoride dolu; İl Etkinliği'nde boş |
| kurum_kodu | int, null | Kapsam=OKUL ise dolu |
| il_kodu | char(2), null | Kapsam=IL ise dolu |
| kontenjan | int | Aktif başvuru sayısını sınırlar (bkz. Bölüm 7) |
| duzenleyen_kullanici_id | int, FK | |
| duzenleyen_birim | varchar(200) | |
| onay_durumu | varchar(20) | ONAY_GEREKMEZ / BEKLIYOR / ONAYLANDI / REDDEDILDI |
| basvuru_baslangic, basvuru_bitis | timestamptz | |
| durum | varchar(20) | AKTIF / IPTAL_EDILDI |
| iptal_gerekcesi | text, null | İsteğe bağlı |
| iptal_eden_kullanici_id | int, null, FK | durum=IPTAL_EDILDI ise zorunlu |
| iptal_tarihi | timestamptz, null | durum=IPTAL_EDILDI ise zorunlu |

İki durumda `onay_durumu=BEKLIYOR` ile oluşur: (a) kapsam=ULUSAL ve düzenleyen il koordinatörü ise, (b) **düzenleyen öğrenci ise — kapsamı ne olursa olsun**. Diğer durumlarda `ONAY_GEREKMEZ`.

Öğrencinin açtığı faaliyette `kurum_kodu` / `il_kodu`, öğrencinin **kayıtlı okulundan ve ilinden** yazılır (öğrencinin koordinatör rolü olmadığı için başka kaynak yok) ve `duzenleyen_birim` **"Öğrenci girişimi"** olur: okulun adıyla anılması, öğrencinin kişisel önerisini okul yönetimine mal ederdi.

**Kapsam ve etkinlik kategorisi bağımsız iki alandır.** Her kapsam her kategoriyle birleşebilir; birini diğerinden türetme. Temel Etkinlik ve Çalışma Grubu Etkinliği'nde faaliyetin **adı serbest metin değildir**, `temel_etkinlik_programi`'ndan gelir; İl Etkinliği'nde tam tersine ad serbesttir ve program bağlantısı boş kalır (ad zaten temayı taşır).

**İptal silme değildir:** faaliyet listelerde "İptal edildi" etiketiyle kalır, mevcut yorum ve dosyalar geçmiş kaydı olarak görünür. Kapanan şey yeni başvuru ve yeni içeriktir.

**faaliyet_calisma_grubu** — `faaliyet_id`, `calisma_grubu_id`. Etiket amaçlı, başvuruyu kısıtlamaz. (Karar bekliyor.)

**faaliyet_ek** — faaliyete eklenen dosya/görsel
| Alan | Tip | Not |
|---|---|---|
| id | serial, PK | |
| faaliyet_id | int, FK | |
| yukleyen_kullanici_id | int, FK | Yalnızca faaliyeti açan kullanıcı olabilir — uygulama katmanında kontrol et |
| dosya_adi | varchar(255) | Orijinal ad |
| depolama_yolu | text | Depolama soyutlamasının döndürdüğü anahtar/yol |
| mime_tipi | varchar(100) | |
| boyut_bayt | bigint | |
| yuklenme_tarihi | timestamptz | |
| silindi_mi | boolean, default false | Soft delete |

**yorum** — faaliyet altındaki yorumlar
| Alan | Tip | Not |
|---|---|---|
| id | serial, PK | |
| faaliyet_id | int, FK | |
| yazan_kullanici_id | int, FK | |
| icerik | text | |
| olusturma_tarihi | timestamptz | |
| silindi_mi | boolean, default false | Soft delete — içerik gösterilmez ama kayıt kalır |
| silen_kullanici_id | int, null, FK | Log amaçlı |
| silinme_tarihi | timestamptz, null | |

Yorum listesi sorgusu her zaman `WHERE faaliyet_id = ? ORDER BY olusturma_tarihi` ile gelir; kapsam filtresi zaten faaliyet üzerinden uygulanmış olmalı (bkz. `references/permissions.md`).

---

## 7. Başvuru

**basvuru**
| Alan | Tip | Not |
|---|---|---|
| id | serial, PK | |
| faaliyet_id | int, FK | |
| katilimci_id | int, FK | Faaliyete KATILACAK kişi; öğrenci ya da öğretmen |
| adina_basvuran_kullanici_id | int, null, FK | Dolu ise başvuruyu katılımcı adına başka biri yaptı |
| gerekce | text | Zorunlu |
| durum | varchar(20) | BEKLIYOR / SECILDI / REDDEDILDI / YEDEK / GERI_CEKILDI / IPTAL_EDILDI |
| basvuru_tarihi | timestamptz | |
| geri_cekme_tarihi | timestamptz, null | |
| degerlendiren_kullanici_id | int, null, FK | |
| degerlendirme_tarihi | timestamptz, null | |
| katildi_mi | boolean, null | **Yoklama** (12 Ağustos 2026): true geldi · false gelmedi · NULL alınmadı |
| yoklama_alan_kullanici_id | int, null, FK | Yoklamayı işaretleyen yetkili |
| yoklama_tarihi | timestamptz, null | |

**`durum` "katılabilir" der, `katildi_mi` "katıldı" der.** İkisi ayrı sütun çünkü ayrı sorular: seçilmiş olmak etkinliğe gelmeyi garanti etmiyor ve gelmeyen öğrencinin profiline etkinlik düşüyordu. Alan **NOT NULL DEFAULT false olamaz**: o, geçmişteki bütün başvuruları "gelmedi" işaretlemek ve öğrencilerin kazanılmış katılımlarını bir gecede silmek olurdu. Kuralın tamamı için bkz. `domain-rules.md` · *Yoklama: katılımın doğrudan kanıtı*.

**Katılımcı öğrenci olmak zorunda değildir.** Öğretmenler de faaliyetlere başvurur (alan adı bu yüzden `ogrenci_id` değil `katilimci_id`). Katılımcının öğrenci mi öğretmen mi olduğu **sütunda tutulmaz**, aktif rolünden okunur: kopyalanan bir tip alanı öğrenci mezun olduğunda ya da öğretmen görev değiştirdiğinde eskir.

`adina_basvuran_kullanici_id` NULL ise başvuruyu katılımcının kendisi yapmıştır; doluysa danışman öğretmen / il koordinatörü **öğrenci adına** yapmıştır. Ayrı bir "başvuru tipi" enum'u tutma: alanın dolu olması zaten vekaleten başvuru demek ve kimin yaptığını da söylüyor. `ck_basvuru_vekalet_baskasi` kısıtı kimsenin kendi adına "vekaleten" başvurmasına izin vermez.

`IPTAL_EDILDI`, faaliyet iptal edildiğinde **sistem tarafından** yazılır; öğrencinin kendi geri çekmesinden (`GERI_CEKILDI`) ayrı tutulur.

### Üretilen belgenin kaydı (7 Ağustos 2026)

**faaliyet_belgesi**
| Alan | Tip | Not |
|---|---|---|
| id | serial, PK | |
| faaliyet_id | int, FK | ON DELETE CASCADE |
| katilimci_id | int, FK | Belgenin sahibi; üretim anında faaliyetin SEÇİLMİŞ katılımcısı olduğu doğrulanır |
| tur | enum | KATILIM / TESEKKUR — `lib/belge/kurallar.ts` içindeki `BELGE_TURLERI` ile aynı değerler |
| uretim_tarihi | timestamptz | |
| ureten_kullanici_id | int, FK | Belgeyi basan yetkili |

`UNIQUE (faaliyet_id, katilimci_id, tur)` · `INDEX (katilimci_id)`

**Belgenin METNİ burada tutulmaz.** İçerik eskisi gibi her istekte faaliyet kayıtlarından üretilir; metin saklansaydı faaliyetin adı düzeltildiğinde basılmış belgeler eski adı göstermeye devam ederdi. Bu tablonun tuttuğu tek şey **üretildiği olgusudur**.

**Neden yine de bir tablo:** "ismine belge oluşturulan öğrencinin profiline katıldığı etkinlik düşsün" kuralı belge üretimini kişi hakkında **kalıcı** bir olguya çevirdi. Bu bilgi daha önce yalnızca erişim kaydının serbest metnindeydi (`detay = "Katılım Belgesi üretildi: Ayşe Yılmaz"`) ve iki nedenle kullanılamazdı: erişim kayıtları **KVKK saklama süresiyle siliniyor** (öğrencinin katılım geçmişi aylık bakım işi çalıştığında sessizce boşalırdı) ve serbest metin ad, aynı adlı iki öğrenciyi ayıramazdı.

Benzersizlik kısıtı **veritabanında**, uygulamada değil: belge sayfası bir GET isteğiyle açılıyor ve sayfa yenilendiğinde ya da iki sekmeden aynı anda açıldığında aynı istek tekrar geliyor. "Önce bak sonra yaz" yarış durumunda ikinci satırı engelleyemez ve öğrencinin profiline aynı etkinlik iki kez düşerdi.

**Sistemde kaydı olmayan kişi için satır açılmaz.** Belgeler ekranındaki "listede olmayan biri için" formu serbest metin ad alır (konuşmacı, destek veren kurum); profili olmadığı için düşecekleri bir yer de yok.

### Kontenjan modeli

Kontenjan **aktif başvuru sayısını** sınırlar, yalnızca seçilenleri değil. Aktif başvuru = `durum NOT IN ('GERI_CEKILDI','REDDEDILDI','IPTAL_EDILDI')`, yani BEKLIYOR + SECILDI + YEDEK.

- Kontenjan dolduğunda (aktif başvuru = kontenjan) yeni başvuru **kabul edilmez**; öğrenciye "kontenjan doldu" mesajı gösterilir.
- Bir başvuru reddedilir veya geri çekilirse yer **anında** açılır.
- **Sayaç tutma.** Her başvuru denemesinde canlı say:

```sql
SELECT count(*) FROM basvuru
WHERE faaliyet_id = ?
  AND durum NOT IN ('GERI_CEKILDI','REDDEDILDI','IPTAL_EDILDI');
```

Statik sayaç tutulursa red/geri çekme sonrası açılan yerler sistemde "dolu" görünmeye devam eder. Sayım, kaydın açıldığı transaction'ın **içinde** yapılmalı; aksi halde eşzamanlı iki başvuru kontenjanı aşar.

---

### Öğretmen özgeçmişi (7 Ağustos 2026)

`ogretmen_profil` beş sütun kazandı: `cv_dosya_adi`, `cv_depolama_yolu`, `cv_mime_tipi`, `cv_boyut_bayt`, `cv_yuklenme_tarihi` — `ogrenci_profil`dekilerle birebir aynı.

**Alanlar kopyalandı, ortak bir CV tablosu açılmadı.** Ortak tablo iki profil satırının yaşam döngüsünü birbirine bağlardı: öğrenci mezun olduğunda öğrenci profili kapanır, öğretmeninki kapanmaz. Beş sütunluk tekrar, o bağı kurmaktan ucuz.

`ck_ogretmen_cv_butunlugu`: dosya varsa adı ve tipi de dolu olmalı — eksik satır, indirme rotasında sessizce 404'e düşen ve sebebi anlaşılmayan bir kayıt bırakırdı.

Sınırlar **ortak** (`IZINLI_CV_TIPLERI`, `CV_MAKS_BAYT`): aynı türde dosya, aynı depolama. İndirme `/panel/ogretmenler/:id/cv` rotasından, kapsam kontrolüyle. Kişinin **kendi kaydı ayrıca ele alınır**: `ogretmenKapsamFiltresi` öğrencininkinin aksine "yalnızca kendisi" filtresi üretmiyor (görev almamış öğretmen ve dış kullanıcılar hiçbir öğretmen kaydı görmüyor). Kapsam filtresine "kendisi" dalı eklenmedi çünkü o filtre aynı zamanda öğretmen **envanterini** süzüyor; oraya dokunmak görev almamış her öğretmeni kendi envanter listesinde tek satır olarak görür hâle getirirdi.

---

### Mentörlük (7 Ağustos 2026)

**mentorluk** — `kullanici_id` (PK, FK), `durum` (BEKLIYOR/ONAYLANDI/REDDEDILDI/BIRAKILDI), `konular` (text), `basvuru_tarihi`, `karar_veren_kullanici_id`, `karar_tarihi`, `ret_gerekcesi`

**mentorluk_calisma_grubu** — `mentorluk_kullanici_id` + `calisma_grubu_id`, bileşik PK

**mentorluk_kaldirma_talebi** (28 Ağustos 2026) — `kullanici_id` (PK, FK → `mentorluk`), `durum` (`OnayDurumu`), `isteyen_kullanici_id`, `isteyen_duzeyi` (`MentorlukKaldirmaDuzeyi`: DANISMAN/IL_KOORDINATOR), `gerekce`, `istek_tarihi`, `karar_veren_kullanici_id`, `karar_tarihi`, `ret_gerekcesi`

**`mentorluk`a SÜTUN OLARAK EKLENMEDİ.** Talep süresince mentörlük *durumu değişmiyor*: öğrenci karar çıkana kadar mentör kalıyor. Alanlar aynı satıra konsaydı kaldırılmış bir mentörlükte "kim istedi" ile "kim kaldırdı" birbirine karışır, reddedilen bir talebin gerekçesi de mentörlüğün ret gerekçesi sanılırdı.

**Öğrenci başına tek satır** (`mentorluk`un kendi gerekçesiyle aynı desen): talep bir *durumdur*, geçmiş tablosu değil. Yeni talep aynı satırı `BEKLIYOR`a döndürür ve önceki kararın izlerini temizler; bekleyen talep varken ikincisi açılamaz.

**`isteyen_duzeyi` saklanıyor, karar anında rolden yeniden hesaplanmıyor:** talebi kimin onaylayabileceği açanın düzeyinden çıkıyor ve o düzey sonradan hesaplansaydı, aradan geçen sürede danışmanlığı düşen ya da koordinatör olan bir öğretmenin talebi kendiliğinden başka bir onay kapısına taşınırdı. Enum'da `MERKEZ` **yok**: proje yöneticisinin kaldırması onaya tabi değil, bu tabloya hiç satır açmıyor.

**KİŞİ BAŞINA TEK SATIR.** Mentörlük bir *durumdur*, geçmiş tablosu değil: bırakılan mentörlük `BIRAKILDI` olur, yeniden başvuruda aynı satır `BEKLIYOR`a döner. Her başvuru yeni satır açsaydı "şu an mentör mü" sorusu her seferinde tarih sıralaması gerektirirdi ve pano süzgeci yanlış cevap verebilirdi.

İki CHECK kısıtı veritabanında durur çünkü karar **iki ayrı ekrandan** verilebiliyor (mentör onay kuyruğu ve dış başvuru kuyruğu) ve uygulama katmanındaki kontrol birinde unutulabilir:
- `ck_mentorluk_ret_gerekcesi` — reddedilen kayıtta gerekçe zorunlu
- `ck_mentorluk_karar_butunlugu` — karara bağlanmış kayıtta karar veren ve tarih birlikte dolu

`dis_kullanici_basvurusu` üç sütun kazandı: `mentorluk_istiyor`, `mentorluk_konulari`, `mentorluk_grup_idleri` (INTEGER[]). Dizi bilinçli — değerler yalnızca karar anına kadar yaşıyor ve onayla `mentorluk_calisma_grubu`na taşınıyor; junction tablo, onay sonrası boşalan ve kimsenin sorgulamadığı satırlar bırakırdı. Kimlikler onay anında yeniden doğrulanıyor (pasife alınmış grup elenir), bu yüzden yabancı anahtar da gerekmiyor.

`DisKullaniciTuru` enum'una `MENTOR` eklendi. **Ayrı bir RolKodu eklenmedi:** mentörün kapsamı paydaş temsilcisininkiyle aynı, ayrı rol her kapsam filtresine hiçbir şey değiştirmeyen bir dal eklerdi.

---

### İki CHECK kısıtı enum'ların gerisinde kalmıştı (7 Ağustos 2026 · düzeltme)

Dış giriş akışı **veritabanı seviyesinde hiç çalışmıyordu**; ikisi de aynı sınıftan hata: enum genişledi, kısıt genişlemedi. Birim testler saf fonksiyonları sınadığı için hiçbiri yakalanamazdı — ikisi de yalnızca gerçek veritabanına yazarken ortaya çıktı.

- **`ck_kullanici_rol_kapsam`** beyaz listesi `('OGRENCI', 'PROJE_YONETICISI')` idi. `MEZUN` ve `PAYDAS_TEMSILCISI` 5 Ağustos'ta eklendi ama listeye girmedi → `basvuruyuOnayla` içindeki rol INSERT'i her seferinde 23514 veriyordu, yani **onaylanmış tek bir dış kullanıcı açılamıyordu**. Onay tek transaction olduğu için yarım kayıt kalmadı, işlem tamamen geri alındı. Düzeltmede iki rol için kapsam alanlarının **boş olması** açıkça şart koşuldu: dış kullanıcının kurumu yoktur, ili rol kaydında değil kullanıcı satırında durur.
- **`dis_basvuru_tur_alanlari`** yalnızca `PAYDAS` ve `MEZUN` kollarını tanıyordu. Üçüncü tür `MENTOR` aynı gün eklendi; mentör başvurusunda ne paydaş kurumu ne mezuniyet okulu sorulur, dolayısıyla satır iki kolun da dışına düşüyordu → **hiçbir mentör başvurusu kaydedilemiyordu**. Düzeltmede `MENTOR` için iki alanın da boş olması şart koşuldu (serbest bırakılsaydı kurum seçmiş bir mentör başvurusu geçerli olurdu; oysa mentörlük kişiseldir, kurumu temsil edecekse tür zaten `PAYDAS`'tır).

**Ders:** yeni bir enum değeri eklerken o enum'u okuyan CHECK kısıtları taranmalı. Beyaz listeli kısıtlar sessizce değil gürültülü biçimde bozulur ama bozulma yalnızca o kod yolu ilk kez gerçek veritabanına yazdığında görülür.

---

### Mezun / paydaş / mentör profili (7 Ağustos 2026)

`ogretmen_profil` yedi sütun kazandı: `github_url`, `kisisel_site_url`, `linkedin_url` (üçü de varchar(200)), `aciklama` (text), `kurum_adi` ve `gorev_unvani` (varchar(150)).

**Tablonun adı yanıltıcı ama yeri doğru:** içeriği "öğrenci OLMAYAN kullanıcının profili"dir — mezun, paydaş temsilcisi, mentör, il koordinatörü ve YEĞİTEK personeli aynı satırı kullanıyor. Dış kullanıcıya ayrı bir profil tablosu, e-posta/telefon/CV alanlarının ikinci bir kopyasını doğururdu.

Bağlantı sütunları `ogrenci_profil`dekilerle birebir aynı ve aynı doğrulamadan geçiyor (`lib/ogrenci/iletisim-kurallar.ts`). Öğrencide olup burada olmaması bir eksiklikti: dış kullanıcının okulu, sınıfı, branşı yok — ekosisteme ne getirdiğini anlatan tek yer bu adresler ve açıklama alanı.

`kurum_adi`/`gorev_unvani` **paydaş envanterine bağlanmadı** (yabancı anahtar yok, serbest metin): envanter, etkinliklerde iş birliği yapılan kurumların kaydıdır ve il koordinatörlerince yönetilir (S18); mezunun çalıştığı şirketin oraya girmesi gerekmiyor. Başvurudaki kurum/unvan **silinmedi** — bu alanlar boşken profil onları gösteriyor, kişi kendi değerini yazınca yenisi geçerli oluyor. Onay anında kopyalanmadı çünkü kopyalama, onaylanmış bütün satırları dolduran bir veri taşıma adımı gerektirirdi.

**kullanici_destek_grubu** — `kullanici_id` + `calisma_grubu_id`, bileşik PK, `eklenme_tarihi`

`mentorluk_calisma_grubu`dan **ayrı tablo**: orası onaya tabi bir *görevin* kapsamıdır ve öğrenciyle birebir yazışma hakkı doğurur; burası yalnızca bir beyandır ("bu alanlarda katkı verebilirim" — sponsorluk, mekân, eğitmen, ödül desteği de olabilir). Tek tabloda tutulsalardı mentörlüğü bırakan kişi destek alanlarını da kaybederdi ve panodaki mentör süzgeci mentör olmayan paydaşları da yakalardı.

`ogrenci_calisma_grubu`dan da ayrı: o tablo öğrencinin hangi grupta çalıştığını söyler ve danışman/koordinatör ekranlarının kaynağıdır; dış kullanıcıyı oraya yazmak öğrenci listelerine yetişkin karıştırırdı. Kullanıcı silinirse beyan da gider (`ON DELETE CASCADE`); çalışma grubu tarafında `RESTRICT` durur çünkü grup silinmez, pasife alınır.

---

### Görev rolleri: dördüncü rol (7 Ağustos 2026)

`ogrenci_gorev_rolu` tablosuna `calisma_grubu_id` sütunu eklendi ve `GorevRolKodu` enum'una `CALISMA_GRUBU_YONETICISI` girdi.

Diğer üç rol kapsamını bir **yerden** alır (`il_kodu` / `ilce_kodu` / `kurum_kodu`); bu rol bir **çalışma grubundan**. Yer sütunlarına sığdırmak mümkündü ama `gorevRolAdi()` etiketi yanlış yazardı: kurum adına düşüp "Atatürk Lisesi Çalışma Grubu Yöneticisi" derdi ve hangi grubun yöneticisi olduğu kaybolurdu.

Tekillik **grup başınadır**, kişi başına değil: bir öğrenci birden çok grubun yöneticisi olabilir. Diğer üç rolün kısmi unique index'lerinin buradaki karşılığı uygulama katmanındaki "bu gruba zaten yönetici atanmış" kontrolüdür.

`TalepTuru` enum'una `MENTORE_SOR` eklendi. `SPONSOR` **kaldırılmadı**: açılmış ilanları türsüz bırakmamak için duruyor. `TEKNIK_DESTEK` ve `DUYURU` yalnızca **ekran etiketi** olarak yeniden adlandırıldı ("Destek talebi", "Genel") — enum değerleri korundu, veri taşınmadı.

### Pano ilanının onayı ve "Genel" kategorisi (14 Ağustos 2026)

`talep` tablosuna `onay_durumu` (`OnayDurumu`, varsayılan **`ONAY_GEREKMEZ`**), `onaylayan_kullanici_id`, `onay_tarihi` ve `ret_gerekcesi` eklendi. Varsayılan bilinçli: `BEKLIYOR` olsaydı migration, panoda duran her ilanı görünmez yapar ve sahiplerinin beklediği bağlantıyı sessizce keserdi. `BEKLIYOR` yalnızca **öğrencinin** açtığı yeni ilana yazılır (`panoIlaniOnayGerekiyorMu`); panoda görünen durumlar `ONAY_GEREKMEZ` ve `ONAYLANDI`'dır (`PANODA_GORUNEN_ONAY_DURUMLARI`). Ayrı bir "onay kaydı" tablosu açılmadı: onay ilanın bir **durumudur** ve ayrı tablo, panonun asıl sorusunu ("şu an görünen ilanlar") her seferinde bir birleştirmeye bağlardı. Emsali `faaliyet.onay_durumu`.

`TalepTuru` enum'una **`GENEL`** eklendi (istek: kategoriler "teknik destek talebi, duyuru / tanıtım desteği, ekip arkadaşı arama ve genel"). `DUYURU`'nun etiketini "Genel"e geri çevirmek yetmezdi — istek ikisini aynı listede sayıyor, yani ayrı iki kategori; etiketi geri almak açılmış duyuru ilanlarını sessizce genel kutusuna taşırdı. Hiçbir kayıt taşınmadı.

Proje yöneticisinin ilan **silmesi gerçek `DELETE`'tir**: `talep_cevabi` CASCADE ile gider, `baglanti_istegi.talep_id` ise ON DELETE SET NULL olduğu için istek ve üzerinden açılmış yazışma kayıt olarak kalır.

---

## 8. Log ve bildirim

**erisim_logu** — `id`, `kullanici_id`, `islem` (GORUNTULEME / DEGISIKLIK / SILME), `hedef_tip`, `hedef_id`, `tarih`, `ip_adresi`, `detay`

`hedef_tip` değerleri arasında `OGRENCI`, `OGRETMEN`, `FAALIYET`, `YORUM`, `FAALIYET_EK`, `PAYDAS`, `BILDIRIM_SABLONU` bulunur — yorum ve dosya silme işlemleri de bu tabloya yazılır (ayrı bir log tablosuna gerek yok).

**bildirim** — `id`, `kullanici_id`, `tip`, `baslik`, `icerik`, `okundu_mu`, `gonderim_kanali` (EPOSTA / SMS / SISTEM), `olusturma_tarihi`, `eposta_durumu`, `eposta_hatasi`, `sms_durumu`, `sms_hatasi`

Kopya kanallarının durumu **ayrı ayrı** izlenir (ikisi de `GonderimDurumu`: GEREKMIYOR / GONDERILDI / BASARISIZ). Biri gitmiş öbürü gitmemiş olabilir; "bildirim ulaşmadı" şikâyetinde hangi kanalın düştüğü bilinmeden bakılacak yer yoktur.

**bildirim_sablonu** — `id`, `kod`, `konu`, `govde_sablonu`, `aciklama`, `aktif`. Şablonları koda gömme; metin Yönetim ekranından düzenlenir. Kod listesi ise **kodda** yaşar (`src/lib/bildirim/sablon.ts`): şablonu tetikleyen olay uygulamadadır, tabloya elle eklenen satır kendiliğinden bildirim üretmez.

---

## 7b. Paydaş envanteri

**paydas**
| Alan | Tip | Not |
|---|---|---|
| id | serial, PK | |
| il_kodu | char(2), FK | Kayıt ile bağlıdır; ilin koordinatörü yönetir |
| ad | varchar(250) | Boş olamaz |
| tur | PaydasTuru | UNIVERSITE / OZEL_SEKTOR / STK / KAMU_KURUMU / MESLEK_KURULUSU / BELEDIYE / DIGER |
| yetkili_kisi | varchar(150), null | |
| eposta | varchar(150), null | |
| telefon | varchar(20), null | |
| adres | text, null | |
| is_birligi_alani | text | Boş olamaz |
| notlar | text, null | |
| aktif | boolean | Silme yok; iş birliği bitince pasife alınır |
| ekleyen_kullanici_id | int, FK | |
| olusturma_tarihi / guncelleme_tarihi | timestamptz | |

Yetkili kişi, e-posta ve telefondan **en az biri** dolu olmalı (uygulama katmanında doğrulanır): ulaşılamayan paydaş, paydaş değildir. `ux_paydas_il_ad_aktif` kısmi unique index'i aynı ilde aynı adla ikinci **aktif** kaydı engeller; pasif kayıt aynı adın yeniden açılmasını engellemez, çünkü kurum gerçekten yeniden iş birliğine dönebilir.

**faaliyet_paydas** — `faaliyet_id`, `paydas_id` (bileşik PK), `katkisi`, `ekleme_tarihi`

Analiz dokümanı 4.3'teki "paydaş bilgisi (varsa)" sonuç alanının karşılığı. Paydaşın ili faaliyetin iliyle aynı olmak **zorunda değildir**: ulusal bir faaliyete başka ilden bir üniversite destek verebilir. Faaliyet silinirse bağlantı da gider (CASCADE); paydaş silinmediği için o yönde RESTRICT.

---

## 9. Kritik kısıtlar

Postgres'te partial (kısmi) unique index olarak:

```sql
-- Bir öğretmen aynı anda hem danışman hem il koordinatörü olamaz
CREATE UNIQUE INDEX ux_kullanici_rol_cakisan
ON kullanici_rol(kullanici_id)
WHERE bitis_tarihi IS NULL AND rol_kodu IN ('DANISMAN','IL_KOORDINATOR');

-- Bir öğrencinin tek aktif danışmanı olur
CREATE UNIQUE INDEX ux_danisman_atama_tek_aktif
ON danisman_atama(ogrenci_id)
WHERE bitis_tarihi IS NULL;

-- Aynı faaliyete aktif ikinci başvuru yapılamaz (geri çekilenler hariç)
CREATE UNIQUE INDEX ux_basvuru_tek_aktif
ON basvuru(faaliyet_id, ogrenci_id)
WHERE durum <> 'GERI_CEKILDI';

-- Aynı e-postayla aynı anda tek BEKLEYEN dış başvuru olur.
-- Tam unique kısıt olamaz: reddedilen kişi tekrar başvurabilmeli, onaylananın
-- eski başvurusu da tarihte kalmalı.
CREATE UNIQUE INDEX ux_dis_basvuru_bekleyen_eposta
ON dis_kullanici_basvurusu(eposta)
WHERE durum = 'BEKLIYOR';

-- Dönem başına il/okul tekilliği
CREATE UNIQUE INDEX ux_il_temsilcisi
ON ogrenci_gorev_rolu(il_kodu, egitim_ogretim_yili)
WHERE rol_kodu = 'IL_TEMSILCISI';

CREATE UNIQUE INDEX ux_ilce_temsilcisi
ON ogrenci_gorev_rolu(ilce_kodu, egitim_ogretim_yili)
WHERE rol_kodu = 'ILCE_TEMSILCISI';

CREATE UNIQUE INDEX ux_okul_temsilcisi
ON ogrenci_gorev_rolu(kurum_kodu, egitim_ogretim_yili)
WHERE rol_kodu = 'OKUL_TEMSILCISI';
```

CHECK kısıtı olarak:

```sql
-- Etkinlik kategorisi ile program bağlantısı tutarlı olmalı
ALTER TABLE faaliyet ADD CONSTRAINT ck_faaliyet_etkinlik_kategorisi
CHECK (
  (etkinlik_kategorisi = 'IL_ETKINLIGI' AND temel_etkinlik_programi_id IS NULL)
  OR (etkinlik_kategorisi <> 'IL_ETKINLIGI' AND temel_etkinlik_programi_id IS NOT NULL)
);

-- İptal izi: "kim ne zaman iptal etti" kaybolmamalı
ALTER TABLE faaliyet ADD CONSTRAINT ck_faaliyet_iptal_izi
CHECK (
  (durum = 'AKTIF' AND iptal_eden_kullanici_id IS NULL AND iptal_tarihi IS NULL)
  OR (durum = 'IPTAL_EDILDI' AND iptal_eden_kullanici_id IS NOT NULL AND iptal_tarihi IS NOT NULL)
);

-- CV alanları birlikte dolar ya da birlikte boşalır. Kısmi dolu satır
-- "dosyası olmayan CV" demek olurdu; indirme endpoint'i sessizce 404 döndürüp
-- hatayı gizlerdi.
ALTER TABLE ogrenci_profil ADD CONSTRAINT ck_ogrenci_profil_cv
CHECK (
  (cv_depolama_yolu IS NULL AND cv_dosya_adi IS NULL AND cv_mime_tipi IS NULL
   AND cv_boyut_bayt IS NULL AND cv_yuklenme_tarihi IS NULL)
  OR (cv_depolama_yolu IS NOT NULL AND cv_dosya_adi IS NOT NULL AND cv_mime_tipi IS NOT NULL
      AND cv_boyut_bayt IS NOT NULL AND cv_yuklenme_tarihi IS NOT NULL)
);
```

Programın **doğru gruptan** olduğu (ör. Temel Etkinlik kategorisine Çalışma Grubu Etkinliği programı bağlanmaması) CHECK ile tutulamaz — iki tabloya birden bakması gerekir. O kontrol uygulama katmanındadır (`etkinlikKategorisiDogrula`).

Farklı bir veritabanına geçilirse: MySQL'de partial unique index native desteklenmez — generated column + unique index ile taklit edilir; Oracle'da function-based unique index kullanılır. ORM kullanıyorsan bu kısıtları migration dosyalarında saklı tut, uygulama koduna güvenme.

---

## 10. Seed verisi

`calisma_grubu` tablosu şu 12 kayıtla başlar (`sira_no` bu sırayla):

Oyun Tasarımı · Siber Güvenlik · Bilgisayar Olimpiyatları · Mobil Programlama · Web Programlama · Havacılık Sistemleri · Robotik · Yapay Zekâ · E-Ticaret ve E-İhracat · Dijital Sanatlar ve İçerik Geliştirme · Açık Kaynak · Espor

`temel_etkinlik_programi` tablosunun başlangıç listesi (tam liste geldiğinde genişletilecek):

- **Temel Etkinlik:** Genç Gölge · Sahne Senin · G2S Genç Sektör Buluşmaları · Sınır Ötesi (Beyond The Borders) · Öğrenci Forumu · Hack The Idea · Akran Öğretimi · Dijital Yürüyüş STEM · Oyunun e Hâli · Tek Maraton · Misafir Öğretmenlik/Öğrencilik · GençTek Zirvesi
- **Çalışma Grubu Etkinliği:** EğitiJAM · Capture The Flag (Bayrağı Yakala) · Mobil Uygulama Geliştirme Yarışması · Teknik Gezi · Master Tek · E-Ticaret Ideathonu

`il`, `ilce`, `kurum` tabloları MEB kaynaklarından yüklenir; migration içine gömme.

Mock kimlik doğrulama aşaması için önerilen test kullanıcı seti: en az 2 farklı okuldan öğrenci (biri danışmanlı, biri danışmansız okul), aynı okulda 2 danışman adayı öğretmen (seçim ekranını test etmek için), 1 il koordinatörü, 1 proje yöneticisi.
