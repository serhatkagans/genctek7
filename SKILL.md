---
name: genctek-platform
description: GençTek Ekosistemi Kurumsal Bilgi Sistemi'nin (MEB YEĞİTEK öğrenci/danışman envanteri ve faaliyet başvuru platformu) iş kurallarını, veri modelini, yetki matrisini ve geliştirme sırasını içerir. GençTek, danışman öğretmen ataması, il koordinatörü, çalışma grupları, faaliyet başvurusu, faaliyet altı yorumlar, dosya/görsel yükleme, EBA SSO ile giriş, öğrenci envanteri, öğrenci profili, öğrenci kazanımları (GençTek dışı etkinlikler, yaptığı ürünler, verdiği akran eğitimleri, derece aldığı yarışmalar, sertifikaları, toplulukları), öğrencinin hedefleri (Rotam), öğrenci CV'si, rozetler gibi konular geçtiğinde mutlaka bu skill'i kullan. Kullanıcı "GençTek" demeden de olsa; öğrenci-danışman eşleştirme, kurum kodu bazlı hiyerarşi, il/ulusal etkinlik başvurusu ya da bu projenin herhangi bir ekranı/tablosu/endpoint'i üzerinde çalışılıyorsa bu skill'i aç. Kod yazmadan önce buradaki değişmezleri (invariants) oku, çünkü bunlar kod içinden tahmin edilemez.
---

# GençTek Platformu

MEB YEĞİTEK'in GençTek ekosistemindeki öğrenci ve danışman öğretmen envanterini tutan, çalışma grubu bazlı izleme yapan ve faaliyet başvuru/değerlendirme süreçlerini yürüten bilgi sistemi.

Bu skill projenin **iş kurallarını** taşır. Kurallar analiz toplantılarında kararlaştırıldı; koddan veya genel sezgiden türetilemez. Bir şey yazmadan önce ilgili bölümü oku, tahmin etme.

## Başlamadan önce doğrula

Aşağıdakiler projede sabit kabul edilir. Kullanıcı farklı bir şey söylediyse onun dediği geçerlidir — bu listeyi ona doğrulat:

- **Barındırma:** Şimdilik kullanıcının kendi VPS sunucusunda çalışacak. Bakanlık sunucusuna geçiş **ileride** konuşulacak — bu aşamada geçiş kaygısıyla mimariyi karmaşıklaştırma, önce çalışan ve doğru bir sistem kur.
- **Çalışma zamanı:** Node.js.
- **Veritabanı:** Henüz sabitlenmedi, VPS aşamasında herhangi bir veritabanı kabul edilebilir. Yine de bir ORM/query builder (Prisma, Knex, Drizzle gibi) kullan — hem geliştirmeyi hızlandırır hem ileride veritabanı değişirse (bakanlık geçişinde gündeme gelebilir) geçiş maliyetini düşürür. `references/data-model.md`'deki örnekler Postgres sözdizimindedir; farklı bir veritabanı seçilirse kısıtları o veritabanının karşılığına çevir.
- **Kimlik doğrulama — iki aşamalı:** EBA SSO erişimi (API/token) **henüz sağlanmadı, sonradan gelecek**. Bu yüzden geliştirmeye gerçek EBA entegrasyonuyla başlanamaz. Bkz. "EBA entegrasyonu gelene kadar" bölümü — sahte (mock) bir kimlik doğrulama katmanıyla ilerle, gerçek entegrasyonu kolayca takabileceğin şekilde soyutla.
- **İkinci giriş yolu — EBA dışı (5 Ağustos 2026):** EBA hesabı olmayan **mezun** ve **paydaş temsilcileri** e-posta ve şifreyle girer; hesapları başvuruyla açılır ve **proje yöneticisinin onayından** geçer. Bu, `AuthProvider`'ın yerine geçmez, YANINA gelir — oturum katmanı ikisini ayırt etmez. Öğrenci ve öğretmen tarafında şifre kavramı **yoktur ve olmayacaktır**. Ayrıntı: `references/domain-rules.md` Bölüm 17.
- **Test:** Rol/yetki kontrolü, danışman atama-devir mantığı, başvuru tekilliği gibi kritik iş kuralları için birim test yaz (Jest önerilir). Ekran/UI testine bu aşamada gerek yok.
- **Dosya ve görsel yükleme:** Var. Faaliyetlere görsel/dosya eklenebilir, altına yorum yazılabilir. Bkz. Bölüm "İçerik: dosya, görsel, yorum".
- **Dil:** Arayüz ve veri tabanı nesne adları Türkçe, kod içi tanımlayıcılar İngilizce olabilir.
- **Ekran dili ile şema dili AYRIDIR (5 Ağustos 2026):** Kullanıcının gördüğü her yerde **"etkinlik"** yazar; adres de `/panel/etkinlikler`'dir. Veri tabanında ve kodda ad **"faaliyet"** olarak kalır (`faaliyet`, `faaliyet_ek`, `faaliyet_raporu`, `faaliyet_paydas`, `faaliyet_calisma_grubu`, `src/lib/faaliyet/`, `LogHedefTip.FAALIYET`, `{{faaliyetAdi}}` yer tutucusu). Bu bir tutarsızlık değil bilinçli bir sınırdır: beş tablo ve 21 migration'ı yeniden adlandırmak kullanıcıya hiçbir şey kazandırmaz. **Yeni ekran metni yazarken "etkinlik", yeni sütun/fonksiyon adı verirken çevresindeki adla tutarlı olun.** Eski `/panel/faaliyetler` adresleri `next.config.ts`'te kalıcı yönlendirmeyle yaşıyor — gönderilmiş bildirim e-postalarında o bağlantılar var, yönlendirme silinemez.
- **Hedef kitle:** Büyük bölümü 18 yaş altı → KVKK kuralları gevşetilemez, yorum/dosya moderasyonu bu yüzden önemli.

## EBA entegrasyonu gelene kadar

EBA SSO erişimi henüz yok. Bunu bir blocker olarak görme — kimlik doğrulama katmanını EBA'nın yerini alacak bir arayüzün (interface/adapter) arkasına gizleyerek geliştirmeye devam et:

- Bir `AuthProvider` soyutlaması kur: `girisYap(kimlikBilgisi) -> { kullaniciId, ad, soyad, kurumKodu, il, ilce, sinif/brans, ... }`
- Şimdilik bunun **mock** bir implementasyonunu yaz (ör. sabit test kullanıcıları döndüren, ya da basit bir "test kullanıcısı seç" ekranı).
- EBA token'ı geldiğinde tek yapılacak şey bu arayüzün gerçek implementasyonunu yazmak olmalı — üst katmanlar (yetki, atama, profil) hiç değişmemeli.
- Mock kullanıcılarla dahi Bölüm "Değişmezler"deki tüm kısıtları (salt okunur alanlar, kurum kodu eşleşmesi) uygula — gerçek entegrasyon geldiğinde davranış aynı kalsın, sadece veri kaynağı değişsin.

## Değişmezler

Bunlar uygulama katmanında değil, mümkün olan her yerde **veritabanı kısıtı** olarak durmalı. Bir tanesi bile ihlal edilirse sistem yanlış kişilere veri gösterir.

1. **Bir öğretmen aynı anda hem danışman öğretmen hem il koordinatörü olamaz.**
2. **Bir öğrencinin aynı anda EN FAZLA BİR aktif danışmanı vardır.** Otomatik akışlarda (ilk atama, öğretmenin okuldan ayrılması, rolün kaldırılması) danışman yoksa il koordinatörüne bağlanır — o akışlarda "boşta" öğrenci kalmaz. TEK İSTİSNA, elle ve gerekçeli tekil bırakmadır (10 Ağustos 2026): bırakılan öğrenci kimseye devredilmez, danışmansız kalır ve yeni danışmanını kendisi seçer (bkz. domain-rules.md · "Öğretmen tek bir öğrencinin danışmanlığını bırakırsa").
3. **Öğrenci hiçbir koşulda başka bir öğrencinin listesini veya kişisel verisini göremez.** İl Temsilcisi ve Okul Temsilcisi rolleri buna istisna değildir; onlar sadece görev etiketidir.
4. **İl koordinatörü kendi ili dışındaki öğrenciyi yalnızca kendi açtığı ulusal faaliyete başvurmuşsa görür.** Öğrenci envanterinde asla göremez.
5. **Aynı faaliyete aktif ikinci başvuru yapılamaz.** Geri çekilmiş başvuru bu kısıtın dışındadır (kontenjan dolmadıysa yeniden başvurulabilir).
6. **EBA'dan gelen alanlar hiçbir ekranda düzenlenebilir olmaz.** Ad, soyad, cinsiyet, okul, kurum kodu, okul türü, il, ilçe, sınıf, branş, eğitim-öğretim yılı. (Mock kimlik doğrulama aşamasında da bu alanlar salt okunur davranmalı.)
7. **Her veri görüntüleme ve değiştirme işlemi loglanır.**
8. **Yorum ve dosya/görsel içerikleri, o içeriğin bağlı olduğu faaliyetin görünürlük kapsamıyla aynı kapsamda görünür** (okul içi faaliyetin yorumu sadece o okulun kullanıcılarına, il/ulusal faaliyetin yorumu kapsamındaki herkese).
9. **Öğrencinin beyan ettiği kayıtlara (kazanımlar ve CV) yalnızca sahibi dokunur.** Danışman, il koordinatörü ve proje yöneticisi kapsamındaki öğrencinin bu kayıtlarını görür ama ekleyemez ve silemez. Çalışma grubu üyeliği bunun istisnasıdır: onu görevliler de değiştirebilir (bkz. "Karara bağlanmış maddeler").
10. **Kapsam dışı bir kayıt istendiğinde 403 değil 404 dönülür.** Tekil öğrenci profili, CV indirme, faaliyet detayı ve faaliyet ekleri dahil: "yetkiniz yok" cevabı kaydın var olduğunu sızdırır.

## Rol ve yetki

Okul tarafında dört rol: `OGRENCI`, `DANISMAN`, `IL_KOORDINATOR`, `PROJE_YONETICISI`.
EBA dışında iki rol daha var: `MEZUN`, `PAYDAS_TEMSILCISI` (bkz. aşağıdaki not).

Veri görme kapsamı rolün kendisinden değil, **bağlı olduğu kurum/il**den gelir:

| Rol | Görebildiği öğrenciler | Faaliyet açabildiği kapsam |
|---|---|---|
| Öğrenci | Sadece kendisi | — |
| Danışman öğretmen | Kendi okulundaki danışmanlığı olanlar | Okul içi |
| İl koordinatörü | Kendi ilindeki tümü | İl içi, ulusal (onaya tabi) |
| Proje yöneticisi | Tümü | Tümü, ayrıca onay verir |
| Mezun / Paydaş temsilcisi | Hiçbiri | — |

İl koordinatörünü yalnızca proje yöneticisi atar. Proje yöneticisi = YEĞİTEK kullanıcısı; ayrı bir süper-admin rolü yoktur.

**Mezun ve paydaş temsilcisi — dar başlangıç.** İkisinin de **kurum kodu yoktur** ve kimlikleri `AuthProvider`'dan gelmez. Bugün yalnızca kendi profillerini, etkinlik **takvimini** ve talep panosunu görürler; öğrenci/öğretmen kişisel verisine hiç erişemezler, etkinliğe başvuramaz ve faaliyet altına yorum yazamazlar. Bu bilinçli bir başlangıç noktasıdır: eksik yetki sonradan verilebilir, fazla verilmiş yetkiyle görülen veri geri alınamaz. **Kapsam filtresi yazarken bu iki rolü her zaman AÇIKÇA ele al** — "ili var ve öğrenci değil" biçimindeki koşullar onları sessizce içeri alır. Tam liste: `references/permissions.md` Bölüm 1.1.

Tam matris ve endpoint bazlı yetki kontrolü için `references/permissions.md` dosyasını oku.

## Danışman atama mantığı

Öğrenci ile öğretmen **kurum kodu** üzerinden eşleşir. Akış:

```
Öğrenci giriş yapar → kurum kodu alınır (EBA gelene kadar mock kaynaktan)
  └─ Okulda danışman olarak işaretlenmiş öğretmen var mı?
       ├─ Birden fazla → öğrenci listeden kendi danışmanını seçer
       ├─ Tek           → otomatik atanır
       └─ Hiç yok       → il koordinatörüne atanır
```

Bir öğretmenin bu listede çıkması için ilk girişte *"GençTek danışman öğretmeni olarak görev almak istiyorum"* kutusunu işaretlemesi yeterlidir. Onay süreci yoktur — tüm öğretmenler sisteme girebilir ama sadece işaretleyenler danışman listesinde görünür.

Öğretmen okuldan ayrıldığında (kurum kodu değişimi) devir kuralları ve kenar durumlar `references/domain-rules.md` içinde.

## İçerik: dosya, görsel, yorum

- **Faaliyetlere dosya/görsel eklenebilir.** Faaliyeti açan kullanıcı (danışman/koordinatör/proje yöneticisi) ekler; öğrenciler sadece görüntüler, ekleyemez.
- **Faaliyetin altına yorum yazılabilir.** Faaliyeti görebilen herkes (kapsamına giren öğrenci, faaliyeti açan, ilgili koordinatör/yönetici) yorum yazabilir.
- **Moderasyon zorunlu.** Kullanıcıların büyük kısmı 18 yaş altı olduğundan: faaliyeti açan kullanıcı ve proje yöneticisi her yorumu silebilir; silinen yorum içerik olarak kaybolur ama log'da kalır (kim ne zaman sildi).
- **Dosya kısıtları:** izin verilen tip/uzantı listesi ve boyut sınırı olmalı (ör. görsellerde jpg/png/webp, belgelerde pdf, birkaç MB üst sınır). Sınırlar koda gömülmez, `sistem_ayari` tablosundan gelir. Yüklenen her dosya diskte değil bir depolama soyutlamasının (yerel disk / S3 uyumlu) arkasında tutulmalı ki VPS'ten olası bir geçişte kod değişmesin.
- **Öğrenci CV'si ayrı bir dosya akışıdır.** Aynı depolama soyutlamasını kullanır ama sınırları faaliyet eklerinden **bağımsızdır** (`IZINLI_CV_TIPLERI`, `CV_MAKS_BAYT`): CV'de doc/docx kabul edilir, faaliyet ekinde edilmez. Ortak ayar kullanmayın — biri için açılan tip diğerinde de açılır. Bkz. `references/domain-rules.md` Bölüm 14.
- **Hiçbir yüklenen dosya public dizinden servis edilmez.** Her indirme isteği oturumdan ve ilgili kapsam filtresinden geçer, kapsam dışında 404 döner.

Tablo tasarımı için `references/data-model.md` → Bölüm 5 (CV) ve Bölüm 6 (faaliyet ekleri).

## Veri modeli

Tablolar, kısıtlar ve index'ler `references/data-model.md` dosyasında. Şu noktalara dikkat:

- `DanismanAtama` bir **geçmiş tablosudur** — güncelleme yerine kapat-yeni kayıt aç. Öğrencinin geçmiş danışmanı raporlamada gerekecek.
- `Basvuru` üzerindeki tekillik kısıtı **kısmi (partial) unique index**'tir; geri çekilmiş kayıtları kapsamaz.
- `CalismaGrubu` sabit kodlanmaz. Silme yoktur, `Aktif=false` yapılır — geçmiş kayıtlar bozulmasın.
- `Yorum` ve `Ek` (dosya/görsel) tabloları `Faaliyet`e bağlıdır ve silme soft-delete'tir (log gereği).

## Geliştirme sırası

Bağımlılık zinciri bu; sıra atlanırsa geri dönüp yeniden yazmak gerekir.

1. **Referans veriler ve şema** — İl, ilçe, kurum, çalışma grupları; tüm tablolar ve kısıtlar
2. **Mock kimlik doğrulama ve kullanıcı sağlama (provisioning)** — `AuthProvider` soyutlaması, test kullanıcılarıyla ilk giriş/kullanıcı oluşturma akışı
3. **Rol ve yetki altyapısı** — Kapsam bazlı yetki filtresi (her sorgu bundan geçmeli), erişim logu
4. **Profil ekranları** — Öğrenci ve öğretmen profili, salt okunur alan davranışı; öğrencinin kazanım kayıtları (dış etkinlik / ürün / akran eğitimi / yarışma derecesi / **sertifika** / **topluluk**), **Rotam** (hedefler) ve CV'si; görevlilerin gördüğü tekil öğrenci profili (`/ogrenciler/:id`)
5. **Danışman atama** — Seçim ekranı, otomatik atama, devir işi (gecelik senkron)
6. **Çalışma grupları** — Seçim, yönetim ekranı
7. **Faaliyet yönetimi** — Oluşturma, kapsam kuralları, ulusal faaliyet onay akışı
8. **Dosya/görsel yükleme ve yorumlar** — Depolama soyutlaması, moderasyon, kapsam bazlı görünürlük
9. **Başvuru ve değerlendirme** — Başvuru, geri çekme, değerlendirme, bildirim
10. **Raporlama ve filtreleme** — İl/ilçe/okul/çalışma grubu bazlı listeler
11. **KVKK** — Onay belgeleri (aydınlatma, açık rıza, taahhütname, gizlilik sözleşmesi) ve ilk giriş kapısı, saklama süresi işleri. **Belgelerin menüde sekmesi YOKTUR** (5 Ağustos 2026): metin `/onay` kapısında okutulur, sonrasında Panel'in en altından (`/panel#kvkk`) okunur ve metin güncellendiğinde oradan yeniden onaylanır. Panel şeridi bu bölüme götürür ve **yeniden onayın tek yoludur** — kaldırılamaz. Onayladığı belgeye erişemeyen kullanıcı KVKK açısından savunulamaz; bölüm bu yüzden kaldırılmadı, taşındı.
12. **Birim testler** — 3, 5, 9. adımlardaki iş kuralları için (bekletmeden, ilgili modülle birlikte yazılması daha sağlıklı)
13. **EBA dışı giriş** — Mezun/paydaş başvurusu, proje yöneticisi onayı, şifreli giriş ve parola sıfırlama (`src/lib/dis-kimlik/`)
14. **Gerçek EBA SSO entegrasyonu** — Token erişimi geldiğinde `AuthProvider`'ın gerçek implementasyonu. **EBA dışı akış bundan etkilenmez.**

## Kapsam dışı

Bunlar sonraki faza bırakıldı. İstenmediği sürece kod yazma, tabloya yer ayırma:

- Mezun–öğrenci **mentor eşleştirmesi**. (Mezunun sisteme GİRİŞİ artık kapsam dışı değil — 5 Ağustos 2026'da yapıldı, bkz. `references/domain-rules.md` Bölüm 17. Kapsam dışı kalan, mezunla öğrenciyi eşleştiren mentorluk modülüdür.)
- Çalışma grubu bazlı sohbet odaları
- Rozet sistemi — **Faz 2**. Kategori listesi netleşti (İl Temsilcisi, Okul Temsilcisi, verdiği akran eğitimleri, çalışma grubu yöneticiliği / organizasyon ekibi üyeliği *(belirsiz)*, moderatörlük yaptığı etkinlikler, derece aldığı yarışmalar) ama **kod yazılmayacak**; yalnızca `references/domain-rules.md` Bölüm 13'te kayıtlı. Faz 2 açıldığında yeni tablo yerine `kullanici_kazanim.tip` genişletilecek.
  **Not:** Faz 2 olan yalnızca rozetlerdir. Kazanım **kayıtlarının** girişi ve profilde gösterimi (dış etkinlik, ürün, akran eğitimi, yarışma derecesi, sertifika, topluluk) uygulandı — bkz. `references/domain-rules.md` Bölüm 14. **Yeni kayıt türü gerektiğinde tablo açma, `kullanici_kazanim.tip` enum'unu genişlet**: sertifika ve topluluk böyle eklendi, ürünün çoklu dosyası `kazanim_ek` ve çoklu bağlantısı `kazanim_baglanti` ile çözüldü.
- Paydaş temsilcisinin öğrenci/etkinlik verisine erişimi — giriş açıldı, yetki dar bırakıldı
- Toplu öğrenci ekleme (faaliyete topluca öğrenci ekleme özelliği **kaldırıldı**, geri getirme)

## Karara bağlanmış maddeler

Bunlar artık varsayım değil, karardır — yeniden tartışma:

- **Öğrenci başına çalışma grubu üst sınırı 5'tir** (20 Ağustos 2026 · istek: "öğrenciler max 5 çalışma grubunda görülebilsin"). Sınır bir zamanlar kaldırılmıştı, geri geldi; sayı `lib/ogrenci/calisma-grubu.ts` içindeki `CALISMA_GRUBU_UST_SINIRI` sabitinde — **sistem ayarı değil**, ekranda yazan cümle ile sunucunun reddi aynı kaynaktan beslenmeli. Geçmiş seçimler geriye dönük kırılmaz; sınır yalnızca kaydederken uygulanır.
- **EBA dışı giriş e-posta + şifreyledir** (e-Devlet değil). Parola sıfırlama var, ikinci faktör yok; ret gerekçesi zorunlu, tekrar başvuru serbest. Paydaş temsilcisi mevcut paydaş **kurum kaydına** bağlanır, serbest metin kurum adı yazamaz.
- **Onaylanana kadar `kullanici` satırı açılmaz.** Başvuru bir kullanıcı değildir.
- **Herkes girişte `/panel` ekranıyla karşılanır** (danışmansız öğrencide önce danışman seçimi). Profil ekranı 20 Ağustos 2026'da panelle **birleşti**; `/panel/profil` oraya yönlendiriyor ve menüde `Profil` sekmesi yok.
- **Panelim'in sarı şeridi MESAJ duyurur, başvuru değil (6 Ağustos 2026).** Şerit yalnızca okunmamış bildirim varken basılır; başlığa tıklanınca sayfanın altındaki bildirim satırına iner ve e-posta olarak giden gövdenin aynısı orada görünür. **Ayrı bir mesaj ekranı açma** — `bildirim` tablosu tek gelen kutusudur ve toplu duyuru ile kullanıcılar arası yazışmayı da o taşır. Başvurusu açık etkinlikler aynı sayfadaki ölçüm kartı ve kart listesinde duruyor.
- **Menü küçüldü, ekranlar durdu (5 Ağustos 2026).** Öğrencide "Çalışma Gruplarım" ve "Danışmanım" sekmeleri yok — ikisi de **Panelim'in içinde katlanabilir bölüm**. Danışman öğretmende "Görev Rolleri" ve "Paydaşlar" yok — Okul Temsilcisi ataması **Öğrenciler** ekranında, paydaş bağlama **etkinlik detayında**; ikisinin de kayıt/envanter tarafı il koordinatöründe kaldı. "KVKK ve Belgelerim" yok — belgeler profilin en altında. **Sekmeyi kaldırmak sayfayı silmek DEĞİLDİR:** sayfalar duruyor, `/panel/danisman-secim` ayrıca giriş kapısı olduğu için silinemez. Yeni bir sekme eklemeden önce içeriğin var olan bir ekranın bölümü olup olamayacağını sorun.
- **Danışman öğretmen il koordinatörü yapılabilir.** Atama engellenmez; danışmanlığı kapanır, öğrencileri devir kurallarına göre dağıtılır, proje yöneticisine "X öğrenci yeniden dağıtıldı" uyarısı gösterilir.
- **Etkinlik kategorisi, kapsamdan ayrı ve bağımsız bir alandır** (Temel Etkinlik / Çalışma Grubu Etkinliği / İl Etkinliği).
- **Kontenjan, aktif başvuru sayısını sınırlar** (yalnızca seçilenleri değil) ve her denemede canlı sayılır.
- **Faaliyet düzenlenebilir ve iptal edilebilir**; iptal silme değildir.
- **Danışman DEĞİŞİKLİĞİ onaya tabidir** (20 Ağustos 2026): öğrencinin danışmanı varsa seçim doğrudan atanmaz, **talep** açılır; kararı istenen öğretmen ya da il koordinatörü verir, ret gerekçesi zorunludur ve karar gelene kadar mevcut danışman devam eder. **İlk seçim onaya girmez** — onay beklerken danışmansız kalan öğrenci Değişmez 2'yi çiğnerdi. Ayrıntı: `references/domain-rules.md` · "Öğrenci kendi isteğiyle danışman değiştirirse".
- **Öğretmen tek bir öğrencinin danışmanlığını bırakabilir** (6 Ağustos 2026): gerekçe zorunlu, il koordinatörüne bildirim gider, erişim kaydına yazılır. Öğrenci mevcut devir kurallarıyla yeniden bağlanır; devredilecek kimse yoksa bırakma yapılmaz.
- **Katılım/teşekkür belgesinde imza sahibinin adı ELLE girilir** ve zorunludur; unvan kapsamdan gelir (OKUL → Okul Müdürü, IL → İl Millî Eğitim Müdürü). Ad sistemde tutulmuyor, e-Okul'dan da gelmiyor — oturum kişisinden türetmeyin.
- **Rol adı "İl Temsilcisi"dir** ("İl Yöneticisi" yanlış yazımdı).
- **Öğrenci profili kazanım kayıtlarını, Rotam'ı ve CV'yi taşır.** Kayıtları yalnızca öğrencinin kendisi girer/siler; danışman, koordinatör ve proje yöneticisi kapsamındaki öğrencinin profilini görür ama bu kayıtlara dokunmaz.
- **"Rotam" (hedefler) kimseye görünmez — sahibi dışında (6 Ağustos 2026).** Kazanımlarla aynı ekranda durur ama görünürlüğü aynı DEĞİLDİR: kazanım "yaptım" beyanıdır ve yetkiliye açıktır, hedef "yapmak istiyorum" beyanıdır ve **yalnızca kişinin kendisine** görünür. Bu yüzden ayrı tablodadır (`kullanici_hedefi`) — tek tabloda birleştirmek, birinin görünürlük kuralını öbürüne bulaştırırdı. Danışmana açmak istenirse **açıkça istenmeli**; açılmış bir görünürlük, öğrenciler özel hedeflerini yazdıktan sonra geri alınamaz.
- **Öğrenciyi çalışma grubuna danışmanı, il koordinatörü ve proje yöneticisi de ekleyebilir** (öğrencinin profilinden). Bu, grup listesini *tanımlamak*tan ayrı bir yetkidir.
- **Katıldığı GençTek etkinlikleri türetilir**, elle girilmez: `basvuru.durum=SECILDI` + tarihi geçmiş + iptal edilmemiş faaliyet.

## Karar bekleyen maddeler

Bunlara denk gelirsen kendi kafana göre karar verme — kullanıcıya sor:

- Faaliyetlerin çalışma grubu ile etiketlenmesi (öneri: etiket filtre olsun, kısıt olmasın) — **etkinlik kategorisiyle karıştırma**, o ayrı ve karara bağlanmış bir alandır
- Dosya/görsel için nihai depolama hedefi: yerel disk mi, S3 uyumlu bir servis mi. Soyutlama ve yerel disk sağlayıcısı hazır, S3 sağlayıcısı boş bir iskelet — karar verilince doldurulacak tek yer orası. **Boyut ve tip sınırları artık karar bekleyen madde değildir**, `sistem_ayari` tablosundan yönetilir.
- Yorumlarda "şikayet et" gibi bir kullanıcı-tetikli moderasyon mekanizması olsun mu, yoksa sadece yetkili silsin mi
- Rozet sisteminin kendisi (Faz 2) — kategori listesi netleşti ama rozetlerin nasıl gösterileceği/hesaplanacağı açılmadı. Kazanım *kayıtları* bundan ayrı ve uygulandı.

## Referans dosyaları

- `references/domain-rules.md` — Tüm iş kuralları, atama/devir senaryoları, faaliyet ve başvuru akışı, dosya/yorum kuralları, kenar durumlar
- `references/data-model.md` — Tablolar, alanlar, kısıtlar, index'ler, seed verisi
- `references/permissions.md` — Yetki matrisi, kapsam filtresi deseni, endpoint bazlı kontroller, yorum/dosya moderasyon yetkisi
