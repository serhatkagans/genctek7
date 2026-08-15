# SSO Entegrasyonu — Talep Edilecek Veri Alanları

GençTek Bilgi Sistemi'nin kimlik sağlayıcılarına (EBA/e-Okul, MEBBİS, e-Devlet) bağlanması için **her kaynaktan istenmesi gereken alanların tam listesi**.

Kaynak: `src/lib/auth/tipler.ts` (`AuthKimlik` arayüzü) ve `prisma/schema.prisma` (`kullanici` tablosu). Sistem üst katmanları başka hiçbir alan tanımaz.

---

## 1. ÖĞRENCİ — EBA / e-Okul'dan istenecek 9 alan

| # | Alan | Veritabanı sütunu | Tip / uzunluk | Örnek |
|---|---|---|---|---|
| 1 | Kimlik numarası | `auth_provider_id` | `VarChar(64)` **tekil, kalıcı** | `eba-8f3c1a...` |
| 2 | Ad | `ad` | `VarChar(100)` | `Ayşe` |
| 3 | Soyad | `soyad` | `VarChar(100)` | `Yılmaz` |
| 4 | Cinsiyet | `cinsiyet` | `Char(1)` — `E` veya `K` | `K` |
| 5 | Okul kodu | `kurum_kodu` | `Int` — **FK → `kurum`** | `750123` |
| 6 | İl kodu | `il_kodu` | `Char(2)` — **FK → `il`** | `06` |
| 7 | İlçe kodu | `ilce_kodu` | `Char(4)` — **FK → `ilce`** | `0601` |
| 8 | **Sınıf** | `sinif` | `VarChar(10)` | `11-A` |
| 9 | Eğitim-öğretim yılı | `egitim_ogretim_yili` | `VarChar(9)` | `2025-2026` |

**Branş gönderilmez** (boş kalır). Kayıt tipi: `OGRENCI`.

---

## 2. ÖĞRETMEN — MEBBİS'ten istenecek 9 alan

| # | Alan | Veritabanı sütunu | Tip / uzunluk | Örnek |
|---|---|---|---|---|
| 1 | Kimlik numarası | `auth_provider_id` | `VarChar(64)` **tekil, kalıcı** | `mebbis-4d90e2...` |
| 2 | Ad | `ad` | `VarChar(100)` | `Mehmet` |
| 3 | Soyad | `soyad` | `VarChar(100)` | `Demir` |
| 4 | Cinsiyet | `cinsiyet` | `Char(1)` — `E` veya `K` | `E` |
| 5 | Okul kodu *(asıl kadro)* | `kurum_kodu` | `Int` — **FK → `kurum`** | `750123` |
| 6 | İl kodu | `il_kodu` | `Char(2)` — **FK → `il`** | `06` |
| 7 | İlçe kodu | `ilce_kodu` | `Char(4)` — **FK → `ilce`** | `0601` |
| 8 | **Branş** | `brans` | `VarChar(100)` | `Bilişim Teknolojileri` |
| 9 | Eğitim-öğretim yılı | `egitim_ogretim_yili` | `VarChar(9)` | `2025-2026` |

**Sınıf gönderilmez** (boş kalır). Kayıt tipi: `OGRETMEN`.

> Öğrenci ile öğretmen arasındaki **tek fark 8. satırdır**: öğrencide sınıf, öğretmende branş. Diğer 8 alan birebir aynıdır.

> ⚠️ **Okul kodu öğretmende kritiktir.** Danışman–öğrenci eşleştirmesinin tek anahtarıdır ve değiştiğinde devir zinciri otomatik işler (proje.md §7). MEBBİS bir öğretmen için birden fazla görev yeri dönebiliyorsa, **asıl kadronun bulunduğu kurum kodu** ayrıca belirtilmelidir.

---

## 3. YEĞİTEK PERSONELİ — MEBBİS'ten istenecek 5 alan

| # | Alan | Veritabanı sütunu | Tip / uzunluk |
|---|---|---|---|
| 1 | Kimlik numarası | `auth_provider_id` | `VarChar(64)` **tekil, kalıcı** |
| 2 | Ad | `ad` | `VarChar(100)` |
| 3 | Soyad | `soyad` | `VarChar(100)` |
| 4 | Cinsiyet | `cinsiyet` | `Char(1)` — `E` veya `K` |
| 5 | Eğitim-öğretim yılı | `egitim_ogretim_yili` | `VarChar(9)` |

Okul kodu, il, ilçe, sınıf ve branş **gönderilmez** — proje yöneticisi bir okula bağlı değildir. Kayıt tipi: `PERSONEL`.

---

## 4. MEZUN / PAYDAŞ / MENTÖR — e-Devlet'ten istenecek 6 alan

| # | Alan | Veritabanı sütunu | Tip / uzunluk |
|---|---|---|---|
| 1 | Kimlik numarası | `auth_provider_id` | `VarChar(64)` **tekil, kalıcı** |
| 2 | Ad | `ad` | `VarChar(100)` |
| 3 | Soyad | `soyad` | `VarChar(100)` |
| 4 | Cinsiyet | `cinsiyet` | `Char(1)` — `E` veya `K` |
| 5 | İl kodu *(adres ili)* | `il_kodu` | `Char(2)` — **FK → `il`** |
| 6 | Eğitim-öğretim yılı | `egitim_ogretim_yili` | `VarChar(9)` |

Okul kodu, ilçe, sınıf ve branş **gönderilmez**. Bu kullanıcıların kurumu yoktur.

---

## 5. OKUL TÜRÜ — Kullanıcıdan değil, kurum kaydından gelir

Okul türü (`kurum.okul_turu`, `VarChar(120)`) sistemde **yoğun olarak kullanılır** ama SSO'dan **istenmez**. Kullanıcı kaydında böyle bir sütun yoktur; okul koduyla `kurum` tablosuna gidilerek okunur.

Kullanıldığı yerler:

| Nerede | Ne için |
|---|---|
| Öğrenci envanteri (`/panel/ogrenciler`) | Liste süzgeci |
| Öğretmen envanteri (`/panel/ogretmenler`) | Liste süzgeci |
| Öğrenci CSV dışa aktarımı | Sütun |
| Öğretmen CSV dışa aktarımı | Sütun |
| Öğrenci / öğretmen tekil profili | Görüntülenen alan |
| Kendi profil ekranı | Görüntülenen alan |
| Yönetim panosu — ilçe kırılımı | Okul alt bilgisi |
| Rapor süzgeç seçenekleri | Seçenek listesi (`distinct`) |

Ayrıca `src/lib/kullanici/salt-okunur.ts` içinde **salt-okunur alan** olarak işaretlidir: kullanıcı hiçbir ekranda düzenleyemez.

**Sonuç:** okul türünün doğru olması, kimlik servisine değil **kurum listesi beslemesine** bağlıdır (bkz. §8).

---

## 6. Dış Kullanıcıya Özel Alanlar (e-Devlet vermez — kişi girer)

Mezun, paydaş temsilcisi ve mentör başvurusunda toplanan, `dis_kullanici_basvurusu` tablosuna yazılan alanlar:

| Alan | Sütun | Tip | Kim için | Zorunlu |
|---|---|---|---|:---:|
| Beyan (ekosisteme katkı niyeti) | `beyan` | `Text` | Hepsi | ✅ |
| Telefon | `telefon` | `VarChar(20)` | Hepsi | ➖ |
| Mezun olduğu okul | `mezun_kurum_kodu` | `Int` FK | Mezun | ➖ |
| Mezuniyet yılı | `mezuniyet_yili` | `Int` | Mezun | ➖ |
| Temsil ettiği paydaş kurum | `paydas_id` | `Int` FK | Paydaş | ✅ |
| Kurumdaki görev unvanı | `gorev_unvani` | `VarChar(150)` | Paydaş | ➖ |
| Mentörlük istiyor mu | `mentorluk_istiyor` | `Boolean` | Hepsi | ✅ |
| Mentörlük konuları | `mentorluk_konulari` | `Text` | Mentör | ➖ |
| Mentörlük çalışma grupları | `mentorluk_grup_idleri` | `Int[]` | Mentör | ➖ |
| Aydınlatma onay tarihi | `aydinlatma_onay_tarihi` | `Timestamptz` | Hepsi | ✅ |

> **e-Devlet onay kapısını kaldırmaz.** Kimlik doğrulanmış olur; "ekosisteme kabul" kararı yine yalnızca **Proje Yöneticisi**ndedir (proje.md §4.2). e-Devlet'e geçilirse `scrypt` şifre katmanı (`dis_kimlik`) tamamen düşer.

---

## 7. SSO'dan **GELMEMESİ** Gereken Alanlar

Bu sütunlara gecelik senkron **asla yazmamalıdır** — kişinin kendi girdiği verilerdir, üzerine yazılırsa kaybolur:

| Alan grubu | Sütunlar |
|---|---|
| İletişim | `eposta`, `telefon` |
| Profil | `foto_depolama_yolu`, `foto_mime_tipi`, `hakkinda` |
| Mesleki bağlantılar | `github_url`, `linkedin_url`, `kisisel_site_url` |
| Özgeçmiş | `cv_dosya_adi`, `cv_depolama_yolu`, `cv_mime_tipi`, `cv_boyut_bayt` |
| Öğretmen işaretleri | `danisman_olmak_istiyor`, `yegitek_okul_sorumlusu` |
| Kişisel gelişim | Kazanımlar, Rotam hedefleri, Algoritmam envanteri |

### Doğum tarihi İSTENMEYECEK

Şemada doğum tarihi sütunu **yoktur ve olmamalıdır.** 18 yaş altı gözetimi yaşa değil **role** bağlanmıştır: öğrenciyle kurulan her temas zaten gözetim onayından geçer (proje.md §11.2). Veri minimizasyonu açısından bilinçli bir tercihtir.

---

## 8. Ayrı Kanal — Referans Veri (SSO değil)

`kurumKodu`, `ilKodu`, `ilceKodu` **yabancı anahtardır.** SSO'dan gelen kurum kodu `kurum` tablosunda yoksa giriş başarısız olur.

| Tablo | Alanlar | Kaynak | Sıklık |
|---|---|---|---|
| `il` | `il_kodu` `Char(2)`, `ad` | MEB referans | Bir kez (81 kayıt) |
| `ilce` | `ilce_kodu` `Char(4)`, `il_kodu`, `ad` | MEB referans | Bir kez |
| `kurum` | `kurum_kodu` `Int`, `ad`, `il_kodu`, `ilce_kodu`, `okul_turu`, `aktif` | MEB kurum listesi | Dönemsel |

> **Kurum senkronu ilk kullanıcı girişinden ÖNCE tamamlanmalıdır.**

---

## 9. Karara Bağlanması Gereken 5 Nokta

| # | Konu | Sorun | Talep |
|---|---|---|---|
| 1 | `authProviderId` içeriği | 64 karakter, kalıcı, asla yeniden kullanılmamalı | **TCKN kullanılmamalı** — veri minimizasyonuna aykırı. Kurumdan opak / eşleşmeye özel kimlik istenmeli |
| 2 | Öğretmenin çoklu görev yeri | MEBBİS birden fazla kurum dönebilir, şema tek `kurum_kodu` tutar | **"Asıl kadro" kurum kodu** ayrıca belirtilmeli; yoksa devir akışı yanlış okula bağlar |
| 3 | `kimlikGetir()` tazeliği | Gecelik senkronun tamamı buna dayanır | Yalnızca oturum açan değil, **güncel kurum/görev bilgisi dönen** servis gerekli |
| 4 | `cinsiyet` kodlaması | Şema `Char(1)` `E`/`K` bekler | Kaynak `1/2` veya `M/F` dönerse eşleme sağlayıcı katmanında yapılacak |
| 5 | `egitimOgretimYili` biçimi | Şema `VarChar(9)` — `2025-2026` | Kaynak tek yıl dönerse dönüşüm kuralı netleşmeli |

---

## 10. Uygulama Notu

SSO erişimi geldiğinde **doldurulacak tek dosya** `src/lib/auth/eba-provider.ts`'tir. Üst katmanlar (yetki, atama, profil) yalnızca `AuthProvider` arayüzünü tanır ve değişmez:

```ts
girisYap(kimlikBilgisi: string): Promise<AuthKimlik | null>
kimlikGetir(authProviderId: string): Promise<AuthKimlik | null>
secilebilirKimlikler(): Promise<AuthKimlik[]>   // EBA'da daima boş dizi
```

Her kaynak (EBA, MEBBİS, e-Devlet) için ayrı bir `AuthProvider` uygulaması yazılır; hepsi aynı `AuthKimlik` sözleşmesini döndürür.
