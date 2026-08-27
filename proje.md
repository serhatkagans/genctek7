---
name: genctek-sifirdan-kur
description: GençTek Bilgi Sistemi'ni sıfırdan kurmak, yeniden üretmek, genişletmek veya denetlemek için güncel ürün kapsamını, mimariyi, veri modelini, rol ve kapsam yetkilerini, iş akışlarını, güvenlik/KVKK kurallarını, arayüz sistemini, testleri ve dağıtımı uygulatır. GençTek, MEB YEĞİTEK, öğrenci-danışman eşleştirmesi, etkinlik yönetimi, öğrenci envanteri, EBA/dış kullanıcı girişi, mentörlük, ekipler, pano, bağlantılar, akış, Market, kazanımlar, belgeler ya da bu projenin herhangi bir sayfası, tablosu veya endpoint'i üzerinde çalışırken kullan.
---

# GençTek Bilgi Sistemi — Sıfırdan Kurulum ve Mimari Master Kılavuzu

GençTek; **MEB Yenilik ve Eğitim Teknolojileri Genel Müdürlüğü (YEĞİTEK)** bünyesinde öğrenci, danışman öğretmen, il koordinatörü, merkez personeli (proje yöneticisi), mezun, paydaş temsilcisi ve mentörleri tek bir ekosistemde buluşturan kurumsal bilgi sistemidir. 

Öğrenci ve öğretmen envanteri, danışman atama ve devir mekanizması, çalışma grupları, etkinlik öneri/onay/başvuru/değerlendirme zinciri, katılım/teşekkür belgesi üretimi, kişisel gelişim (kazanımlar, rotam hedefleri, Algoritmam özdeğerlendirme), Market ürün vitrini, talep panosu, 18 yaş altı gözetimli bağlantı ve yazışmalar, akran/uzman mentörlüğü, il ekipleri, ekosistem genel akışı, yönetimsel istatistikler ve KVKK denetim işlevlerini tek çatı altında birleştirir.

Bu belge, sistemin **başka hiçbir dış kaynağa veya tahmine gerek kalmadan sıfırdan %100 eksiksiz ve hatasız kurulabilmesi** için master kabul ölçütüdür.

---

## 0. Bu Şartnamenin Kullanımı (ÖNCE OKU)

Bu belge tek başına **yeterli değildir.** Mimariyi, değişmezleri ve kabul kapısını anlatır; ancak alan düzeyindeki ayrıntı (şema alanları, enum değerleri, izin fonksiyonu imzaları, başlangıç verisi, envanter maddeleri, bildirim şablonları) `kurulum/` dizinindeki **6 ekte** durur. Ekler koddan birebir üretilir (`npm run sartname:uret`), bu yüzden eskimezler.

| Ek | İçerik | Boyut |
|---|---|---|
| [`kurulum/ek-a-veri-modeli.md`](kurulum/ek-a-veri-modeli.md) | 47 modelin ve 25 enum'un tam alan tanımı + 48 migrasyon sırası | ~2.100 satır |
| [`kurulum/ek-b-yetki-ve-kapsam.md`](kurulum/ek-b-yetki-ve-kapsam.md) | `src/lib/yetki/` tamamı: 53 izin fonksiyonu, kapsam filtreleri, tipler, log, etiketler | ~2.030 satır |
| [`kurulum/ek-c-baslangic-verisi.md`](kurulum/ek-c-baslangic-verisi.md) | Çalışma grupları, temel etkinlik programları, sistem ayarları, 34 bildirim şablonu | ~590 satır |
| [`kurulum/ek-d-envanter-ve-bildirim.md`](kurulum/ek-d-envanter-ve-bildirim.md) | Algoritmam envanterinin maddeleri + bildirim gönderim katmanı | ~1.940 satır |
| [`kurulum/ek-e-is-kurallari.md`](kurulum/ek-e-is-kurallari.md) | **36 modül** — testlerin içe aktardığı tüm saf kural yüzeyi | ~7.200 satır |
| [`kurulum/ek-f-rota-envanteri.md`](kurulum/ek-f-rota-envanteri.md) | 61 sayfa, 29 route handler, 34 eylem dosyası, 24 bileşen, 57 test paketi | ~210 satır |

Ayrıca [`kurulum/sso-veri-talebi.md`](kurulum/sso-veri-talebi.md): EBA/e-Okul, MEBBİS ve e-Devlet entegrasyonunda **hangi kaynaktan hangi alanın isteneceği** (10 kimlik alanı), SSO'dan gelmemesi gereken sütunlar ve karara bağlanacak 5 nokta. Bu dosya elle yazılır (üretilmez) — kurumlara verilecek talep belgesidir.

Toplam: **~14.070 satır** birebir sözleşme. Ek B ve Ek E'nin kapsamı elle seçilmez — Ek B tüm `src/lib/yetki/` dizinini, Ek E ise `tests/` içindeki `@/lib/...` içe aktarımlarını tarayarak kendini belirler. Yeni bir kural dosyası test edildiği anda şartnameye kendiliğinden girer.

### 0.1 Zorunlu Kurulum Sırası

Bu sıra keyfî değildir; her adım bir öncekinin ürettiği sözleşmeye dayanır. Atlanırsa sonraki adımda uydurma başlar.

1. **Ek A → şema.** `prisma/schema.prisma` birebir kurulur, `npx prisma validate` geçer, migrasyonlar Ek A'daki sırayla üretilir. §6.3'teki 7 kısmi tekil indeks SQL olarak eklenir.
2. **Ek C → seed.** `prisma/seed.ts` ve referans verisi. `npm run db:seed` hatasız çalışır.
3. **Ek B → yetki çekirdeği.** `izinler.ts` ve `kapsam.ts`. **Bu adım tamamlanmadan hiçbir sayfa yazılmaz** — kapsam filtresi sonradan eklenirse sızıntı kaçınılmazdır (bkz. §2/6 fail-closed).
4. **Ek E + Ek D → alan kuralları.** Saf `kurallar.ts` dosyaları, envanter tanımları ve bildirim şablon motoru.
5. **Testler.** Ek F'deki 48 test paketi yazılır ve geçer (936 durum). Arayüzden önce gelir.
6. **Ek F → arayüz.** Sayfalar, route handler'lar, server action'lar ve bileşenler; §14.1'deki yollara birebir uyarak.
7. **§17 kabul kapısı.** Sayım tablosu ve davranış listesi doğrulanır.

### 0.2 Ekler Neyi Kapsamaz

Dürüst sınır: eklerde **ekran içerikleri yoktur.** 61 sayfanın hangi alanı, sütunu, süzgeci, boş durum metnini göstereceği yalnızca §14.1'deki yol/amaç tanımı kadar belirlidir. Adım 6'da arayüz, bu şartnameye uyan ama görsel ayrıntıda farklı çıkabilir. Veri modeli, yetki, iş kuralları ve testler ise birebir yeniden üretilebilir.

---

## 1. Kaynak Önceliği ve Çelişki Çözümü

Mevcut depo üzerinde çalışırken veya sistemi sıfırdan kurarken kurallar arasındaki çelişkiler şu kesin öncelik sırasına göre çözülür:

1. **Kullanıcının son açık kararı** (14 Ağustos 2026 kararları: öğrenci mentörlüğü, yalnızca proje yöneticisi mentörlük onayı, program/çalışma grubu CSV istatistiği, pano öğrenci ilan onayı).
2. **Güncel veritabanı şeması ve SQL migrasyonları** (`prisma/schema.prisma`, `prisma/migrations/` — sıfırdan kurulumda [Ek A](kurulum/ek-a-veri-modeli.md)).
3. **Güncel saf kural fonksiyonları ve yetki katmanı** (`src/lib/**/kurallar.ts`, `src/lib/yetki/izinler.ts`, `src/lib/yetki/kapsam.ts` — sıfırdan kurulumda [Ek B](kurulum/ek-b-yetki-ve-kapsam.md) ve [Ek E](kurulum/ek-e-is-kurallari.md)).
4. **Fiilî arayüz ve menü davranışları** (`src/app/`).
5. **Referans belgeleri** (`permissions.md`, `domain-rules.md`, `data-model.md`, `DAGITIM.md`, `README.md`).
6. **Eski analiz ve taslak belgeleri**.

> [!NOTE]
> Kullanıcı ekranlarında daima **“etkinlik”** yazılır ve `/panel/etkinlikler` yolu kullanılır. Veritabanında, Prisma modellerinde ve arka uç modüllerinde (`src/lib/faaliyet/`) **“faaliyet”** terimi korunur. Eski `/panel/faaliyetler/**` yolları `/panel/etkinlikler/**` altına kalıcı olarak yönlendirilir.

---

## 2. Temel Değişmezler ve Mimari Aksiyomlar (Airtight Invariants)

1. **Danışman ve Koordinatör Ayrılığı:** Bir kullanıcı aynı anda aktif `DANISMAN` ve `IL_KOORDINATOR` rolü taşıyamaz. Danışman öğretmen il koordinatörü atandığında danışmanlık görevi derhal kapatılır ve öğrencileri devir kuralıyla dağıtılır.
2. **Tek Aktif Danışman:** Bir öğrencinin aynı anda en fazla bir aktif danışman ataması olabilir. Bu kısıt PostgreSQL kısmi tekil indeksiyle (`idx_danisman_atama_tek_aktif`) garanti edilir.
3. **Fallback ve Bilinçli Danışmansızlık:** Otomatik atama ve devir akışlarında okulda uygun danışman yoksa öğrenci il koordinatörüne bağlanır. Ancak öğrencinin veya öğretmenin gerekçeli tekil bırakma akışında öğrenci bilinçli olarak danışmansız kalabilir (`OGRENCI_BIRAKTI`).
4. **Öğrenci Verisi İzolasyonu:** Hiçbir öğrenci, unvanı veya görev rolü ne olursa olsun başka bir öğrencinin kişisel verisini, profilini veya listesini göremez.
5. **İl Kapsamı İzolasyonu:** İl koordinatörü yalnızca kendi il kapsamındaki kullanıcı ve verileri görür. Açtığı ulusal etkinliğe başka ilden başvuran kullanıcıyı yalnızca o etkinlik bağlamında görür; il genel envanterine dahil etmez.
6. **Fail-Closed Güvenlik & 404 Koruması:** Kapsam dışındaki veya yetkisiz erişilen tekil kayıtlarda `403 Forbidden` yerine daima `404 Not Found` döndürülür; kaydın varlığı sızdırılmaz.
7. **Aktif Başvuru Tekilliği:** Aynı kullanıcı aynı etkinliğe ikinci kez aktif başvuru yapamaz (`idx_basvuru_tek_aktif`). `GERI_CEKILDI` ve sistem kaynaklı `IPTAL_EDILDI` kayıtları aktiflikten düşer.
8. **Yarış Koşuluna Dayanıklı Canlı Kontenjan:** Kontenjan kontrolü yalnızca seçilenlerden değil, tüm aktif başvurulardan (`BEKLIYOR`, `SECILDI`, `YEDEK`) veritabanı transaction'ı ve satır kilidi ile canlı sayılır.
9. **EBA Salt-Okunur Alanları:** EBA/e-Okul kaynağından gelen ad, soyad, cinsiyet, okul, kurum kodu, okul türü, il, ilçe, sınıf, branş ve eğitim-öğretim yılı alanları mock aşamasında bile kullanıcı tarafından düzenlenemez.
10. **Dinamik Oturum Yetkisi:** Rol ve kapsam bilgileri oturum çerezine gömülmez; her istekte veritabanından güncel aktif roller okunur. Rolü alınan kullanıcının yetkisi anında düşer.
11. **Çift Yönlü Denetim Günlüğü:** Görüntüleme, değişiklik, silme/moderasyon ve yönetim kararları erişim günlüğüne (`erisim_logu`) yazılır. Denetim günlüğünü görüntüleyen de loglanır.
12. **Dosya İzolasyonu:** Yüklenen hiçbir dosya `public/` altından doğrudan sunulmaz. Oturum ve kapsam kontrolünden geçen Route Handler üzerinden akıtılır.
13. **Varlık Kapsam Mirası:** Etkinlik eki, görseli, yorumu, kapağı ve raporu ana etkinliğin görünürlük kapsamını doğrudan miras alır.
14. **Soft-Delete / Gizleme İlkesi:** Kullanıcı içerikleri (gönderi, yorum, mesaj, ilan, ürün) veritabanından fiziksel olarak silinmez; soft-delete/gizleme uygulanır. İçerik, yazar, gizleyen ve zaman damgası denetim için saklanır.
15. **Kazanım ve CV Sahipliği:** Kazanım ve CV beyanını yalnızca sahibi ekler veya kaldırır. Danışman, koordinatör ve merkez profilde yalnızca görüntüler; düzenleyemez.
16. **Rotam ve Algoritmam Gizliliği:** `Rotam` hedefleri ve `Algoritmam` özdeğerlendirme envanteri sonuçlarını yalnızca sahibi görür.
17. **Çalışma Grubu Yönetim Ayrılığı:** Öğrenciyi çalışma grubuna öğrencinin kendisi, danışmanı, koordinatörü veya merkez ekleyebilir; çalışma grubu tanımını yalnızca proje yöneticisi yönetir.
18. **Görev Rolleri Unvandır:** `IL_TEMSILCISI`, `ILCE_TEMSILCISI`, `OKUL_TEMSILCISI`, `CALISMA_GRUBU_YONETICISI` görev rolleri unvandır; ek veri görme yetkisi kazandırmaz.
19. **Mentörlük ve Okul Sorumlusu Ayrımı:** Mentörlük rol değil, durumlu ayrı bir onay kaydıdır. YEĞİTEK Okul Sorumlusu bilgisi de yetki vermeyen danışman öğretmen profil işaretidir.
20. **Bildirim Güvenilirliği:** Sistem içi bildirim daima ana veritabanı kaydıdır; e-posta ve SMS gönderimindeki harici hatalar ana transaction'ı asla geri almaz.

---

## 3. Teknoloji Yığını ve Katman Mimarisi

- **Çalışma Zamanı & Çerçeve:** Node.js (>=20.x), Next.js 16 (App Router), React 19, TypeScript 5.
- **Veritabanı & ORM:** PostgreSQL (>=15), Prisma 7 (`@prisma/adapter-pg` ve `pg` bağlantı havuzu), Client çıktısı: `src/generated/prisma`.
- **Stil & Tasarım Sistemi:** Tailwind CSS 4, CSS Semantik Değişkenleri, `lucide-react` ikon seti.
- **Doğrulama & Güvenlik:** Zod (şema doğrulama), Node yerel `crypto` (`scrypt`, `timingSafeEqual`, `createHmac`).
- **İletişim:** `nodemailer` (SMTP e-posta), HTTP tabanlı SMS istemcisi.
- **Test & Kalite:** Jest 30 (`ts-jest`), Playwright (E2E senaryolar ve görsel doğrulama).
- **Derleme Modu:** `output: "standalone"`, `TEMEL_YOL` desteği (`basePath`).

### Katman Ayrımı:
```text
src/
├── app/                 Sayfalar, layoutlar, server action'lar ve route handler'lar
├── components/          Yeniden kullanılabilir UI, tema ve alan bileşenleri
├── lib/
│   ├── auth/            EBA/Mock sağlayıcılar, imzalı oturum yönetimi
│   ├── yetki/           Rol kontrolleri (izinler.ts) ve kapsam filtreleri (kapsam.ts)
│   ├── <modul>/         Saf iş kuralları (kurallar.ts), veri erişimi ve iş akışları
│   ├── depolama/        Yerel disk ve S3 uyumlu sağlayıcı soyutlaması
│   ├── bildirim/        Şablon motoru, tekilleştirme, sistem/e-posta/SMS gönderimi
│   ├── db.ts, db-havuz.ts  Prisma istemcisi ve pg bağlantı havuz yönetimi
│   ├── ortam.ts         Zod tabanlı ortam değişkenleri doğrulaması
│   ├── ayar.ts          Sistem ayarları yönetimi
│   └── hata-kaydi.ts    Hata kimliklendirme ve merkezi loglama
├── generated/prisma/    Prisma Client üretilen dosyaları
├── components/          Paylaşılan istemci/sunucu bileşenleri (bkz. §15.2)
└── instrumentation.ts   onRequestError kancası
prisma/
├── schema.prisma        Master veri modeli sözleşmesi
├── migrations/          Kısmi indeksler ve CHECK kısıtları içeren SQL geçmişi (48 migrasyon)
└── seed.ts              İl, ilçe, kurum, çalışma grubu, program ve sistem ayarları seed'i
tests/                   Saf iş kurallarını test eden 48 Jest paketi + yardimcilar.ts
scripts/                 Duman testi, gecelik senkron, KVKK saklama ve veri üretim betikleri
```

### 3.1 `src/lib/` Modül Envanteri (Tam Liste)

Her modül kendi içinde saf kural dosyası (`kurallar.ts`), veri erişimi ve iş akışı dosyalarını barındırır. Sıfırdan kurulumda **bu 21 alan modülü + 12 altyapı dosyası** eksiksiz üretilmelidir:

| Modül | Sorumluluk | `kurallar.ts` var mı |
|---|---|---|
| `auth/` | EBA/Mock sağlayıcı, imzalı oturum (`oturum.ts`) | – |
| `yetki/` | `izinler.ts` (rol kararları), `kapsam.ts` (kapsam filtreleri) | – |
| `akis/` | Ekosistem genel akışı (gönderi/yorum) | ✓ |
| `basvuru/` | Etkinlik başvurusu, canlı kontenjan, il dışı çift onay | – |
| `belge/` | Katılım/teşekkür belgesi üretimi, tekil ve toplu | ✓ |
| `bildirim/` | Şablon motoru, tekilleştirme, panel/e-posta/SMS gönderimi | – |
| `danisman/` | Atama, devir, fallback ve bırakma akışları | – |
| `depolama/` | `YerelDepolama` ve `S3Depolama` soyutlaması | – |
| `dis-kimlik/` | EBA dışı kimlik, `sifre.ts` (scrypt), kilitleme, sıfırlama | ✓ |
| `ekip/` | İl ekipleri ve gözetimli ekip sohbeti | ✓ |
| `envanter/` | Algoritmam özdeğerlendirme envanteri | ✓ |
| `eposta/` | SMTP / günlük / kapalı e-posta sağlayıcıları | – |
| `faaliyet/` | Etkinlik yaşam döngüsü, onay zinciri, yoklama | ✓ |
| `hedef/` | Rotam hedefleri | ✓ |
| `iletisim/` | Bağlantı istekleri, gözetimli yazışma ve mesajlar | ✓ |
| `kazanim/` | Kazanım beyanları, ekler, rozet türetimi | ✓ |
| `kullanici/` | Kullanıcı arama, profil ve envanter erişimi | – |
| `kvkk/` | Onay metinleri, sürümleme, saklama süresi | ✓ |
| `market/` | Market vitrini ve tıklama sayaçları | ✓ |
| `mentor/` | Mentörlük başvuru/onay durumları | ✓ |
| `metin/` | Güvenli metin/bağlantı işleme (`MetinBaglantili` için) | – |
| `ogrenci/` | Öğrenci profili, CV, iletişim kuralları | – |
| `ogretmen/` | Öğretmen profili, özgeçmiş, görev yılları | – |
| `paydas/` | Paydaş envanteri ve etkinlik paydaşları | ✓ |
| `rapor/` | Faaliyet raporları, CSV üretimi, `kirilim-istatistigi.ts` | – |
| `rol/` | Rol kararları ve rol envanteri | – |
| `sms/` | HTTP / günlük / kapalı SMS sağlayıcıları | – |

Altyapı tekil dosyaları: `ayar.ts`, `db.ts`, `db-havuz.ts`, `hata-kaydi.ts` (yazma), `hata-kurallar.ts` (saf çözümleme/gruplama), `hata-okuma.ts` (günlük okuma), `ortam.ts`, `tarih.ts`, `tema.ts`, `zip.ts`.

### 3.2 Yapılandırma Dosyaları (Zorunlu)

`next.config.ts`, `tsconfig.json`, `tsconfig.test.json` (ts-jest için ayrı), `jest.config.js`, `eslint.config.mjs`, `postcss.config.mjs`, `prisma.config.ts`, `package.json`.

**`jest.config.js` sözleşmesi:** `testEnvironment: "node"`, `roots: ["<rootDir>/src", "<rootDir>/tests"]`, `testMatch: ["**/*.test.ts"]`, `moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" }`, `transform` → `ts-jest` + `tsconfig.test.json`, `clearMocks: true`.

**`next.config.ts` sözleşmesi (güvenlik dahil, atlanamaz):**
- `output: "standalone"`, `poweredByHeader: false`, `serverExternalPackages: ["@prisma/adapter-pg", "pg"]`.
- `basePath`, yalnızca `TEMEL_YOL` doluysa eklenir. **Derleme zamanında sabitlenir** — değeri değiştirdikten sonra yeniden derlemek şarttır; `src/lib/ortam.ts` aynı değeri çalışma zamanında okuyup çerez yolunu daraltır, ikisi ayrışırsa oturum açılır ama hiçbir sayfada görünmez.
- `experimental.serverActions.bodySizeLimit: "12mb"` (en büyük izinli belgenin biraz üstü).
- **Güvenlik başlıkları uygulamada tutulur, ters vekilde değil** (vekil yapılandırması sunucu taşınınca geride kalır). `/:yol*` için: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`.
- **Kalıcı yönlendirme:** `/panel/faaliyetler` ve `/panel/faaliyetler/:yol*` → `/panel/etkinlikler(/:yol*)`, `permanent: true`. Gönderilmiş bildirim e-postalarında ve yer imlerinde eski adresler bulunduğu için bu yönlendirme **asla silinmez**.

### 3.3 `package.json` Betikleri (Tam Liste)

```text
dev / build / start / lint          Next.js ve ESLint
test                                jest
test:duman                          tsx scripts/duman-testi.ts
test:eposta                         tsx scripts/eposta-dogrula.ts
db:migrate / db:deploy              prisma migrate dev / deploy
db:seed                             tsx prisma/seed.ts
db:studio                           prisma studio
veri:ornek / veri:kazanim / veri:dis-kullanici   Örnek veri üreticileri
senkron:danisman                    tsx scripts/gecelik-senkron.ts   (cron)
bakim:saklama                       tsx scripts/veri-saklama.ts      (cron)
hata:ara                            tsx scripts/hata-ara.ts (hata kimliğinden log bulma)
sartname:uret                       node scripts/sartname-uret.mjs (kurulum/ eklerini koddan üretir)
skill:paketle / senaryo:goruntu / hata:goruntu / disaaktarma:dogrula  Yardımcı betikler
```

Ayrıca `prisma.seed` alanı `tsx prisma/seed.ts` olarak tanımlıdır.

### 3.4 `scripts/` Envanteri (14 Betik)

`duman-testi.ts` (uçtan uca duman testi), `gecelik-senkron.ts` (EBA kurum kodu değişimi → devir), `veri-saklama.ts` (KVKK 24 ay saklama temizliği), `hata-ara.ts` (hata kimliğinden kayıt bulma), `eposta-dogrula.ts`, `ornek-veri.ts`, `ornek-kazanim.ts`, `ornek-dis-kullanici.ts`, `disa-aktarma-dogrula.mjs`, `senaryo-goruntuleri.mjs`, `hata-sayfasi-goruntu.mjs`, `skill-paketle.mjs`, `sartname-uret.mjs` (kurulum ekleri).

> Betik sayısı 14'ten **15**'e çıktı (`sartname-uret.mjs` eklendi); §17.2 sayım tablosu buna göre okunmalıdır.

---

## 4. Kimlik Doğrulama, Oturum ve EBA Dışı Giriş

Sistemde iki bağımsız giriş yolu bulunur ve oturum katmanında birleşir:

```mermaid
sequenceDiagram
    autonumber
    actor U as Kullanıcı
    participant Auth as Giriş / SSO
    participant DB as Veritabanı
    participant Session as Oturum Çerezi

    alt EBA Yolu (Öğrenci, Öğretmen)
        U->>Auth: EBA SSO / Mock Giriş
        Auth->>DB: Kullanıcıyı Bul veya Oluştur (Rol ve Profil Ata)
        DB-->>Auth: authProviderId
    else EBA Dışı Yol (Mezun, Paydaş, Dış Mentör)
        U->>Auth: E-posta + Şifre ile Giriş
        Auth->>DB: DisKimlik + scrypt Doğrulaması (Kilit Kontrolü)
        DB-->>Auth: dis-<id> authProviderId
    end

    Auth->>Session: HMAC-SHA256 İmzalı Çerez Oluştur (genctek_oturum)
    Session-->>U: HttpOnly, SameSite=Lax Çerez
```

### 4.1 EBA Giriş Yolu
- `AuthProvider` arayüzü: `girisYap(kimlik)`, `kimlikGetir(id)`, `secilebilirKimlikler()`.
- Mock sağlayıcı sabit test kullanıcıları sunar; gerçek EBA sağlayıcısı sisteme yalnızca bir adaptör olarak bağlanır.
- İlk girişte kullanıcı yoksa oluşturulur; öğrenci ise `OGRENCI`, öğretmen ise rolsüz kullanıcı açılır.
- EBA'dan gelen kurum kodu değişmişse gecelik senkron veya giriş anında devir akışı tetiklenir.

### 4.2 EBA Dışı Giriş Yolu (Mezun, Paydaş Temsilcisi, Dış Mentör)
- **Başvuru Formu (`/basvuru`):** E-posta, ad, soyad, telefon, il, başvuru türü (`MEZUN`, `PAYDAS`, `MENTOR`), mezuniyet bilgisi veya paydaş kurumu, şifre ve KVKK onayı.
- **Onay Kapısı:** Başvuru onaylanana kadar `kullanici` veya `dis_kimlik` açılmaz. Onayı **yalnızca Proje Yöneticisi** verir. Rette gerekçe zorunludur.
- **Şifreleme Mimarisi (`src/lib/dis-kimlik/sifre.ts`):**
  - Node.js yerel `scrypt` algoritması: `N=16384` ($2^{14}$), `r=8`, `p=1`, `maxmem=64MB`.
  - Format: `scrypt$16384$8$1$<tuz_base64>$<ozet_base64>`. 16 bayt rastgele tuz, 32 bayt özet.
  - Doğrulama: `crypto.timingSafeEqual` ile zamanlama saldırılarına karşı tam koruma.
- **Hesap Kilitleme:** 5 hatalı denemede hesap 15 dakika kilitlenir (`DisKimlik.kilitBitisTarihi`).
- **Şifre Sıfırlama:** 60 dakika geçerli, veritabanında SHA-256 hash'i saklanan tek kullanımlık jetonlar. Tek sayfa kullanılır: `/sifre-sifirlama` hem talep formunu hem — `?e=<eposta>&jeton=<jeton>` arama parametreleri geldiğinde — yeni şifre belirleme formunu gösterir. **Dinamik `[token]` segmenti yoktur.**
- **Kullanıcı Sayımı Sızıntısı Yok:** Şifre sıfırlama, e-postanın kayıtlı olup olmadığını asla cevaplamaz; jeton istenen her durumda aynı sonuç ekranı gösterilir.

### 4.3 İmzalı Oturum Çerezi (`src/lib/auth/oturum.ts`)
- Çerez adı: `genctek_oturum`, Süre: 8 saat ($28800$ sn).
- İçerik: `<base64url_authProviderId>.<hmac_sha256_imza>`.
- Güvenlik bayrakları: `httpOnly: true`, `sameSite: "lax"`, `secure: process.env.NODE_ENV === "production"`, `path: TEMEL_YOL || "/"`.
- Çıkışta (`oturumKapat`) aynı yol ile silinir.

---

## 5. Rol, Yetki ve Kapsam Modeli

### 5.1 Tam Yetki Matrisi
| Eylem / Yetki | Öğrenci | Danışman Öğretmen | İl Koordinatörü | Proje Yöneticisi | Mezun | Paydaş Temsilcisi |
|---|---|---|---|---|---|---|
| Kendi Profilini Düzenleme | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Öğrenci Envanteri Görüntüleme | Yalnızca kendisi | Danışmanlığındakiler | Kendi ili | Tüm ülke | ✗ | ✗ |
| Öğretmen Envanteri Görüntüleme | ✗ | Kendi okulu | Kendi ili | Tüm ülke | ✗ | ✗ |
| Paydaş Envanteri Görüntüleme | ✗ | Kendi ili (salt-okunur) | Kendi ili (yönetebilir) | Tüm ülke | ✗ | ✗ |
| Okul Etkinliği Açma | ✓ (onaya tabi) | ✓ (doğrudan) | ✓ (doğrudan) | ✓ (doğrudan) | ✗ | ✗ |
| İl Etkinliği Açma | ✓ (onaya tabi) | ✗ | ✓ (doğrudan) | ✓ (doğrudan) | ✓ (onaya tabi) | ✓ (onaya tabi) |
| Ulusal Etkinlik Açma | ✓ (onaya tabi) | ✗ | ✓ (onaya tabi) | ✓ (doğrudan) | ✓ (onaya tabi) | ✓ (onaya tabi) |
| Etkinlik Onaylama | ✗ | ✗ | Kendi ili (öğrenci/dış) | Tümü + Ulusal | ✗ | ✗ |
| Etkinliğe Katılımcı Başvurusu | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Öğrenci Adına Başvuru | ✗ | Danışmanlığındakiler | Kendi ili | Tüm ülke | ✗ | ✗ |
| Kazanım & CV Ekleme/Silme | ✓ (kendi profili) | ✗ | ✗ | ✗ | ✗ | ✗ |
| Rotam Hedefleri | ✓ (yalnızca kendisi) | ✗ | ✗ | ✗ | ✗ | ✗ |
| Talep Panosunu Görme | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Pano İlanı Açma | ✓ (onaya tabi) | ✓ (doğrudan) | ✓ (doğrudan) | ✓ (doğrudan) | ✓ (doğrudan) | ✓ (doğrudan) |
| Pano İlanı Onaylama / Silme | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| Bağlantı İsteği Gönderme | ✓ (onaya tabi) | ✓ (onaya tabi) | ✓ | ✗ | ✓ | ✓ |
| Mentörlük Başvurusu Yapma | ✓ (onaya tabi) | ✓ (onaya tabi) | ✓ (onaya tabi) | ✓ | ✓ (onaya tabi) | ✓ (onaya tabi) |
| Mentörlük Başvurusu Onaylama | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| Panodaki İlana Mentör Yanıtı | ✗ | Onaylı mentörse | Onaylı mentörse | Onaylı mentörse | Onaylı mentörse | Onaylı mentörse |
| İl Ekibi Kurma / Yönetme | ✗ | ✗ | Kendi ili | Tüm ülke | ✗ | ✗ |
| Ekip Sohbetine Katılım | Üyesiyse | Üyesiyse | Kendi ilindeki tüm ekipler | Tüm ekipler | Üyesiyse | Üyesiyse |
| EBA Dışı Başvuru Onaylama | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| Program/Grup CSV İstatistiği | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |

---

## 6. Eksiksiz Veri Modeli ve PostgreSQL Kısıtları (47 Model, 26 Enum)

Sistem şeması `prisma/schema.prisma` dosyasında tanımlıdır.

### 6.1 Model Kategorileri (47 Tablo)
1. **Coğrafi & Referans (6):** `Il`, `Ilce`, `Kurum`, `CalismaGrubu`, `TemelEtkinlikProgrami`, `SistemAyari`.
2. **Kimlik, Profil & Denetim (9):** `Kullanici`, `KullaniciRol`, `DisKullaniciBasvurusu`, `DisKimlik`, `OgretmenProfil`, `OgrenciProfil`, `KullaniciOnayi`, `Erisimlogu`, `KullaniciDestekGrubu`.
3. **Danışmanlık & Bireysel Gelişim (9):** `DanismanAtama`, `OgrenciCalismaGrubu`, `OgrenciGorevRolu`, `KullaniciKazanim`, `KazanimBaglanti`, `KazanimEk`, `KullaniciHedefi`, `EnvanterUygulamasi`, `EnvanterCevabi`.
4. **Etkinlik, Katılım & Paydaş (9):** `Faaliyet`, `FaaliyetCalismaGrubu`, `FaaliyetRaporu`, `FaaliyetEk`, `Yorum`, `Basvuru`, `FaaliyetBelgesi`, `Paydas`, `FaaliyetPaydas`.
5. **İletişim, Pano, Akış & Bildirim (9):** `Bildirim`, `BildirimSablonu`, `Talep`, `TalepCevabi`, `BaglantiIstegi`, `Yazisma`, `Mesaj`, `Gonderi`, `GonderiYorumu`.
6. **Mentörlük & Yerel Ekipler (5):** `Mentorluk`, `MentorlukCalismaGrubu`, `Ekip`, `EkipUyesi`, `EkipMesaji`.

> [!IMPORTANT]
> Kabul ölçütü sayıdır: `grep -c "^model " prisma/schema.prisma` → **47**, `grep -c "^enum " prisma/schema.prisma` → **25**. Kategori toplamları da 6+9+9+9+9+5 = 47 vermelidir.

### 6.2 Numaralandırmalar (26 Enum)
`RolKodu`, `DisKullaniciTuru`, `MentorlukDurumu`, `AtamaTipi`, `KapanmaNedeni`, `GorevRolKodu`, `KazanimTipi`, `KatilimBicimi`, `HedefDurumu`, `EnvanterDurumu`, `Kapsam`, `EtkinlikKategorisi`, `TemelEtkinlikGrubu`, `FaaliyetDurumu`, `OnayDurumu`, `BasvuruDurumu`, `FaaliyetBelgeTuru`, `LogIslemi`, `LogHedefTip`, `GonderimKanali`, `GonderimDurumu`, `OnayBelgesi`, `PaydasTuru`, `BildirimHedefTipi`, `TalepTuru`, `EkipTuru`.

### 6.3 Prisma Tarafından İfade Edilemeyen PostgreSQL Kısmi Tekil İndeksleri
Bu indeksler `prisma/migrations/` altındaki SQL dosyalarında tanımlanır ve zorunludur:
```sql
-- 1. İl başına tek aktif il koordinatörü
CREATE UNIQUE INDEX idx_kullanici_rol_tek_aktif_koordinator 
ON kullanici_rol (il_kodu) 
WHERE rol_kodu = 'IL_KOORDINATOR' AND bitis_tarihi IS NULL;

-- 2. Öğrenci başına tek aktif danışman ataması
CREATE UNIQUE INDEX idx_danisman_atama_tek_aktif 
ON danisman_atama (ogrenci_kullanici_id) 
WHERE bitis_tarihi IS NULL;

-- 3. Etkinlik başına tek aktif başvuru
CREATE UNIQUE INDEX idx_basvuru_tek_aktif 
ON basvuru (faaliyet_id, kullanici_id) 
WHERE durum NOT IN ('GERI_CEKILDI', 'IPTAL_EDILDI');

-- 4. Görev rollerinde kapsam bazlı tek aktiflik
CREATE UNIQUE INDEX idx_ogrenci_gorev_rolu_tek_aktif 
ON ogrenci_gorev_rolu (kullanici_id, rol_kodu) 
WHERE bitis_tarihi IS NULL;

-- 5. Aynı ilde aynı adla tek aktif ekip
CREATE UNIQUE INDEX idx_ekip_il_ad_aktif 
ON ekip (il_kodu, ad) 
WHERE aktif = true;

-- 6. Kullanıcı başına tek dış kimlik
CREATE UNIQUE INDEX idx_dis_kimlik_kullanici_unique 
ON dis_kimlik (kullanici_id);

-- 7. Kullanıcı başına tek mentörlük kaydı
CREATE UNIQUE INDEX idx_mentorluk_kullanici_unique 
ON mentorluk (kullanici_id);
```

---

## 7. Danışman Atama, Devir ve Senkronizasyon

Eşleştirme anahtarı **kurum kodu**dur. Atamalar geçmiş tablosunda (`DanismanAtama`) tutulur; güncelleme yapılmaz, eski satır kapatılıp yeni satır açılır.

```mermaid
stateDiagram-v2
    [*] --> IlkGiris: Öğrenci Giriş Yapar
    IlkGiris --> Secim: Okulda Danışman Sayısı > 1
    IlkGiris --> Otomatik: Okulda Danışman Sayısı = 1
    IlkGiris --> FallbackKoordinator: Okulda Danışman Yok
    
    Secim --> AktifDanisman: Öğrenci Seçer (OGRENCI_SECTI)
    Otomatik --> AktifDanisman: Otomatik Bağlanır (OTOMATIK)
    FallbackKoordinator --> AktifDanisman: Koordinatöre Bağlanır (IL_KOORDINATOR_FALLBACK)
    
    AktifDanisman --> Danismansiz: Öğrenci Bırakır (OGRENCI_BIRAKTI)
    AktifDanisman --> Danismansiz: Öğretmen Tekil Bırakır (Gerekçeli)
    AktifDanisman --> AktifDanisman: Öğrenci Değiştirir (OGRENCI_ISTEGI -> OGRENCI_SECTI)
    AktifDanisman --> DevirZinciri: Öğretmen Kurum Değiştirir / Ayrılır
    
    DevirZinciri --> AktifDanisman: Okulda Kalan Danışmana Devir (DEVIR)
```

- **Öğretmenin Tek Öğrenciyi Bırakması:** En az 10 karakter gerekçe zorunludur. İl koordinatörüne bildirim gider, erişim loguna yazılır. Öğrenci danışmansız kalır.
- **Danışmanın Koordinatör Olması:** Danışmanlık rolü kapatılır, koordinatörlük açılır; öğrencileri okulda tek danışman varsa ona, birden çok varsa seçim için geçici koordinatöre, yoksa koordinatöre devredilir.
- **Gecelik Senkron (`scripts/gecelik-senkron.ts`):** EBA kurum kodu değişimlerini tarar ve devir akışını otomatik işletir.

---

## 8. Etkinlik Yaşam Döngüsü, Başvuru, Yoklama ve Rapor

### 8.1 Etkinlik Kapsam ve Kategori Ayrımı
- **Kapsam (`Kapsam`):** `OKUL`, `IL`, `ULUSAL` (Etkinliğin kime açık olduğunu belirler).
- **Kategori (`EtkinlikKategorisi`):** `TEMEL_ETKINLIK`, `CALISMA_GRUBU_ETKINLIGI`, `IL_ETKINLIGI` (Etkinliğin niteliğini belirler).
- Temel ve Çalışma Grubu etkinliklerinde merkezce tanımlanan `TemelEtkinlikProgrami` seçilir; İl etkinliklerinde serbest ad kullanılır.

### 8.2 Onay Zinciri
- Öğrencinin açtığı tüm etkinlikler onaya tabidir (İl koordinatörü veya Proje Yöneticisi onaylar, ilk karar geçerlidir).
- Mezun, paydaş temsilcisi ve mentör etkinlikleri il veya ulusal düzeydedir ve onaya tabidir.
- Ulusal koordinatör etkinliğini yalnızca Proje Yöneticisi onaylar.
- İptal durumunda fiziksel silme yapılmaz (`FaaliyetDurumu.IPTAL_EDILDI`), aktif başvurular `IPTAL_EDILDI` olur ve katılımcılara bildirim gider.

### 8.3 Başvuru, İl Dışı Onay ve Canlı Kontenjan
- Kontenjan kontrolü transaction ve satır kilidi ile yarış koşuluna dayanıklı canlı sayılır.
- İl dışı öğrenci başvurusunda çift taraflı onay kartı gösterilir: Öğrencinin il koordinatörü onayı + Etkinlik düzenleyicisinin onayı.
- Yoklama ve Katılım Kanıtı: `SECILDI`, tarihi geçmiş, iptal edilmemiş ve `katildiMi = true` olan kayıtlar kesin katılım sayılır; rozetler ve profil katılım geçmişi buradan türetilir.

---

## 9. Katılım ve Teşekkür Belgesi Üretimi (Tekil & Toplu)

- Belge Türleri: `FaaliyetBelgeTuru.KATILIM`, `FaaliyetBelgeTuru.TESEKKUR`.
- İmza sahibi adı manuel ve zorunlu alınır; unvan kapsamdan önerilir (`OKUL` → Okul Müdürü, `IL` → İl Millî Eğitim Müdürü).
- **Toplu Yazdırma (`/panel/etkinlikler/[id]/belge/toplu`):**
  - Tek seferde en fazla 200 belge üretimi.
  - Türkçe alfabetik sıralama (`localeCompare("tr")`).
  - `@media print` CSS kuralları ve `page-break-after: always` ile standart A4 yatay/dikey yazdırma.

---

## 10. Profil, Kazanımlar, Rotam, Algoritmam ve Market

- **Kazanım Türleri (`KazanimTipi`):** `GENCTEK_ETKINLIGI`, `DIS_ETKINLIK`, `URUN`, `AKRAN_EGITIMI`, `YARISMA_DERECESI`, `SERTIFIKA`, `TOPLULUK`, `DIGER`.
- **Kazanım ve CV Güvenliği:** Yalnızca sahibi ekler ve siler; yetkililer profilde salt-okunur görür. CV yalnızca PDF formatında kabul edilir.
- **Rotam:** En fazla 30 hedef, 250 karakter başlık, 2000 karakter açıklama. Durumlar: `PLANLANDI`, `SURUYOR`, `TAMAMLANDI`. Yalnızca sahibi görür.
- **Algoritmam (`EnvanterUygulamasi`):** 25 maddelik özdeğerlendirme envanteri. Sonuçlar yalnızca öğrenciye aittir.
- **Market:** `markettePaylasilsin` seçilen ürünler vitrinde listelenir. Tıklama sayaçları yapay yenilemelere karşı korunur.

---

## 11. Pano, Bağlantılarım, Mentörlük, Ekipler ve Akış

### 11.1 Talep Panosu
- İlan Türleri: `EKIP_ARKADASI`, `TEKNIK_DESTEK`, `SPONSOR`, `DUYURU`, `MENTORE_SOR`.
- **Öğrencinin açtığı ilan Proje Yöneticisi onayına düşer.** Onaylanana kadar panoda görünmez. İlan düzenlenirse tekrar onaya düşer. İlanı yalnızca Proje Yöneticisi silebilir; sahibi kapatır.

### 11.2 Bağlantılarım ve Gözetimli Yazışmalar
- 18 yaş altı kullanıcıyla temas gözetim onayından geçer (`BaglantiIstegi`).
- Onaylanan isteğe tek `Yazisma` açılır. Mesajlar soft-hide edilir. Gözetim yetkilisi (danışman, koordinatör, merkez) konuşmayı okuyabilir; ekranda kalıcı gözetim uyarısı bulunur.

### 11.3 Mentörlük Sistemi (14 Ağustos 2026 Güncel Kuralı)
- **Öğrenci dahil aktif rolü olan herkes mentörlüğe başvurabilir** (`mentorlukBasvurabilirMi`).
- Başvuruyu **yalnızca Proje Yöneticisi** onaylar (`mentorlukOnaylayabilirMi`).
- Durumlar: `BEKLIYOR`, `ONAYLANDI`, `REDDEDILDI`, `BIRAKILDI`.
- Onaylı mentör `Mentörlüğüm` menüsünden `MENTORE_SOR` ilanlarına açık yanıt yazar. Birebir temas yine bağlantı onayı akışından geçer.

### 11.4 İl Ekipleri ve Ekip İçi Sohbet
- İl koordinatörü kendi ilinde, Proje Yöneticisi her ilde ekip kurabilir. Üyeler ekibin ilinden seçilir.
- Sohbet gözetimlidir (koordinatör ve merkez okuyabilir). Bildirimlerde mesaj içeriği taşınmaz.

### 11.5 Ekosistem Genel Akışı
- Genel sosyal akış (`Gonderi`, `GonderiYorumu`). Gönderi 3000, yorum 1000 karakter. Soft-delete uygulanır.

---

## 12. Program ve Çalışma Grubu Kırılımlı CSV İstatistiği (Yeni Modül)

- **Rota:** `/panel/raporlar/istatistik` (Yalnızca `PROJE_YONETICISI`).
- **İki Kırılım Boyutu (`Kirilim`):** `program` (Temel Etkinlik Programı) vs `grup` (Çalışma Grubu). Ayrı dosyalardır (bir etkinliğin en fazla 1 programı, birden çok çalışma grubu olabilir).
- **Üç İdari Düzey (`Duzey`):** `ulke` (Ülke geneli), `il` (İl kırılımı), `okul` (Okul kırılımı).
- **Süzgeçler:** `yil` (`YYYY-YYYY`), `grup` (Çalışma Grubu ID), `program` (Program ID).
- **Sütunlar:** Coğrafi/Birim alanları + Etkinlik Sayısı, Kontenjan, Başvuru Sayısı (geri çekilen ve iptal hariç), Seçilen, Yedek, Katılan (`katildiMi=true`), Raporlu.
- **İlke:** İptal edilen etkinlikler sayılmaz; programı/grubu olmayanlar `(program seçilmemiş)` / `(çalışma grubu seçilmemiş)` satırında toplanır (hiçbir etkinlik sessizce düşmez).

---

## 13. Dosya Depolama, KVKK, Denetim ve Hata Yönetimi

- **Depolama Soyutlaması (`DepolamaSaglayici`):** `YerelDepolama` ve `S3Depolama`.
  - Dosya anahtarı: `yyyy/aa/<uuid>.<uzanti>` (Kullanıcı dosya adı diskte kullanılmaz).
  - Dosya türü ve boyut sınırları `SistemAyari` üzerinden bağımsız yönetilir.
- **KVKK Onay Metinleri:** `KVKK_AYDINLATMA`, `KVKK_ACIK_RIZA`, `KOORDINATOR_TAAHHUTNAME`, `GIZLILIK_SOZLESMESI`. Sürümlü olarak saklanır.
- **Erişim Günlüğü (`Erisimlogu`):** 24 ay saklanır. Denetim loglarına bakan kişi de loglanır.
- **Hata Yakalama (`src/instrumentation.ts`):** `onRequestError` kancası ile tüm sunucu hataları yakalanır, `src/lib/hata-kaydi.ts` üzerinden kimliklendirilir ve kullanıcıya yalnızca güvenli `Hata Kimliği` gösterilir.

---

## 14. Tam Dosya, Dizin, Rota ve Server Action Haritası

### 14.1 Sayfa ve Rota Envanteri (`src/app/`)

**61 sayfa (`page.tsx`) + 29 route handler (`route.ts`).** Yol adları birebir budur; rota grubu (`(auth)`) **kullanılmaz**, kimlik sayfaları kökte durur.

```text
src/app/
├── layout.tsx, globals.css, error.tsx, not-found.tsx     Kök layout, tema ve hata ekranları
├── giris/                       EBA / Mock giriş ekranı            (+ eylemler.ts)
├── dis-giris/                   EBA dışı e-posta/şifre girişi      (+ eylemler.ts)
├── basvuru/                     EBA dışı başvuru formu (Mezun, Paydaş, Mentör) (+ eylemler.ts)
├── sifre-sifirlama/             Talep VE yeni şifre ekranı (?e=&jeton= ile)    (+ eylemler.ts)
├── onay/                        İlk giriş KVKK onay kapısı         (+ eylemler.ts)
├── panel/
│   ├── layout.tsx, page.tsx     Panel layout (menü) ve kişiselleştirilmiş pano (+ eylemler.ts)
│   ├── profil/                  Profil, CV, kazanım, hedef yönetimi
│   │   └── foto/route.ts        Profil fotoğrafı akıtma
│   ├── etkinlikler/             Etkinlik takvimi, liste ve filtreleme
│   │   ├── yeni/                Yeni etkinlik oluşturma formu
│   │   ├── disa-aktar/route.ts  Etkinlik listesi CSV
│   │   └── [id]/                Etkinlik detay, başvuru ve yönetim
│   │       ├── basvurular/disa-aktar/route.ts  Başvuru listesi CSV
│   │       ├── ekler/[ekId]/route.ts           Etkinlik eki indirme
│   │       ├── gorseller/route.ts              Etkinlik görseli akıtma
│   │       ├── rapor/            Etkinlik raporu ekranı
│   │       │   └── indir/route.ts              Rapor indirme
│   │       ├── belge/            Tekil katılım/teşekkür belgesi
│   │       │   └── toplu/        Toplu belge yazdırma (en fazla 200)
│   │       └── belgeler/         Etkinlik belge havuzu
│   ├── belgeler/                Kullanıcının kendi belge arşivi
│   ├── baglantilar/             /panel/yazismalar sayfasına yönlendirme
│   ├── yazismalar/              Bağlantılar ve mesajlaşma
│   │   └── [id]/                Birebir onaylı, gözetimli yazışma kanalı
│   ├── akis/                    Ekosistem genel sosyal akışı
│   ├── talepler/                Talep panosu (ilanlar)
│   │   ├── yeni/                Yeni ilan formu
│   │   ├── onaylar/             Öğrenci ilanı onay kuyruğu (yalnızca Proje Yöneticisi)
│   │   ├── mentor-basvuru/      Mentörlük başvuru ekranı
│   │   └── mentor-talebi/       MENTORE_SOR ilanı açma ekranı
│   ├── mentorluk/               Mentörlük başvurusu ve durumu
│   ├── mentorlugum/             Mentörlük panosu (MENTORE_SOR yanıtları)
│   ├── mentorler/[id]/foto/route.ts  Mentör profil fotoğrafı akıtma
│   ├── ekipler/                 İl ekipleri listesi (kişinin kendi ekipleri)
│   │   └── [id]/                Ekip detay ve gözetimli sohbet
│   │       └── uyeler/disa-aktar/route.ts  Ekip üye listesi XLSX
│   ├── ekip-yonetimi/           Tüm ekiplerin merkezi envanteri (+ disa-aktar/route.ts)
│   ├── urunler/                 Ürünler ve Market vitrini
│   │   ├── [id]/                Ürün detayı
│   │   └── [id]/git/[baglantiId]/route.ts  Dış bağlantı yönlendirme ve tıklama sayacı
│   ├── kazanimlarim/            Kazanım beyanları ve ekleri
│   ├── kazanim-ekleri/[ekId]/route.ts  Kazanım eki akıtma (kazanimlarim ALTINDA DEĞİL)
│   ├── algoritmam/              Özdeğerlendirme envanteri listesi
│   │   └── [kod]/               Tekil envanter uygulaması ve sonucu
│   ├── danisman-secim/          Öğrenci danışman seçim ekranı
│   ├── calisma-gruplari/        Çalışma grubu seçim ekranı
│   ├── bildirimler/             Sistem bildirimleri
│   ├── duyurular/               Hedefli duyuru gönderimi (Panel, E-Posta, SMS)
│   ├── kvkk/                    KVKK metinleri ve onay geçmişi
│   ├── taahhut/                 Koordinatör taahhütnamesi ekranı
│   ├── yonetim/                 Yönetim paneli ve sayılı kartlar
│   │   ├── disa-aktar/route.ts  Yönetim özeti CSV
│   │   ├── il/[ilKodu]/         İl kırılımı detayı
│   │   └── ilce/[ilceKodu]/     İlçe kırılımı detayı
│   ├── ogrenciler/              Öğrenci envanteri
│   │   ├── disa-aktar/route.ts  Öğrenci listesi CSV
│   │   └── [id]/                Tekil öğrenci profili (+ cv/route.ts, eylemler.ts)
│   ├── ogretmenler/             Öğretmen envanteri
│   │   ├── disa-aktar/route.ts  Öğretmen listesi CSV
│   │   └── [id]/                Tekil öğretmen profili (+ cv/route.ts)
│   ├── paydaslar/               Paydaş envanteri
│   │   ├── disa-aktar/route.ts  Paydaş listesi CSV
│   │   └── [id]/                Tekil paydaş detayı
│   ├── gorev-rolleri/           Temsilcilik görev rolleri yönetimi
│   ├── rol-envanteri/           Rol envanteri ve rol atama yönetimi
│   ├── okul-sorumlulari/        YEĞİTEK Okul Sorumluları listesi
│   ├── dis-basvurular/          EBA dışı başvuru onay kuyruğu
│   ├── dis-kullanicilar/[id]/   Onaylı dış kullanıcı detayı (üst düzeyde liste sayfası YOK)
│   ├── raporlar/                Faaliyet raporları ve eksik raporlar
│   │   └── istatistik/route.ts  Program/Grup kırılımlı CSV istatistiği (page.tsx DEĞİL)
│   ├── okullar/                 Okul arama (ad, ilçe, kurum kodu) (+ disa-aktar/route.ts)
│   ├── okul-eksikleri/          Danışman/öğrenci/temsilci eksiği olan okullar (+ disa-aktar/route.ts)
│   ├── erisim-loglari/          KVKK erişim denetim günlüğü
│   ├── hata-kayitlari/          Sunucu hata günlüğü: kimlik araması ve hata özeti
│   └── ayarlar/                 Sistem ayarları yönetimi
└── instrumentation.ts           (src/ kökünde) onRequestError kancası
```

> [!WARNING]
> Sıfırdan kurulumda sık yapılan üç hata: (1) `kazanim-ekleri` route handler'ını `kazanimlarim/` altına yerleştirmek, (2) `/panel/raporlar/istatistik` için `route.ts` yerine `page.tsx` üretmek — bu rota **doğrudan CSV döndürür**, ekran değildir, (3) şifre sıfırlamayı `[token]` dinamik segmentiyle kurmak.

### 14.2 Server Actions Envanteri (34 Dosya)
`basvuru/eylemler.ts`, `dis-giris/eylemler.ts`, `giris/eylemler.ts`, `onay/eylemler.ts`, `sifre-sifirlama/eylemler.ts`, `tema-eylemi.ts`, `panel/eylemler.ts`, `panel/akis/eylemler.ts`, `panel/algoritmam/eylemler.ts`, `panel/ayarlar/eylemler.ts`, `panel/calisma-gruplari/eylemler.ts`, `panel/danisman-secim/eylemler.ts`, `panel/dis-basvurular/eylemler.ts`, `panel/duyurular/eylemler.ts`, `panel/ekipler/eylemler.ts`, `panel/etkinlikler/eylemler.ts`, `panel/etkinlikler/il-disi-eylemler.ts`, `panel/etkinlikler/[id]/icerik-eylemleri.ts`, `panel/etkinlikler/[id]/rapor/eylemler.ts`, `panel/gorev-rolleri/eylemler.ts`, `panel/mentorluk/eylemler.ts`, `panel/mentorlugum/eylemler.ts`, `panel/ogrenciler/eylemler.ts`, `panel/ogrenciler/[id]/eylemler.ts`, `panel/paydaslar/eylemler.ts`, `panel/profil/eylemler.ts`, `panel/profil/belge-eylemleri.ts`, `panel/profil/hedef-eylemleri.ts`, `panel/profil/kazanim-eylemleri.ts`, `panel/rol-envanteri/eylemler.ts`, `panel/talepler/eylemler.ts`, `panel/urunler/eylemler.ts`, `panel/yazismalar/eylemler.ts`, `panel/yazismalar/baglanti-eylemleri.ts`.

---

## 15. Arayüz ve Tasarım Sistemi (CSS & UI Tokens)

- **Semantik Tokenlar:** `--zemin`, `--kart`, `--cizgi`, `--metin`, `--metin-yumusak`, `--baslik`, `--birincil`, `--vurgu`, `--olumlu`, `--uyari`, `--hata`.
- **Tema D (Varsayılan):** Kırmızı (`#c4161c`), Kömür Gri (`#414042`), Kırmızı üst bar ve beyaz seçili sekme.
- **Tema B (Alternatif):** Açık üst bar, `#245a96` lacivert vurgu.
- **Erişilebilirlik (A11y):** WCAG 2.1 AA uyumu (gövde metni kontrast $\ge 4.5:1$, büyük metin $\ge 3:1$), `prefers-reduced-motion` desteği, form alan etiketleri, `aria-hidden` ikonlar, aktif sekmede `aria-current="page"`.

### 15.2 Paylaşılan Bileşen Envanteri (`src/components/`)

| Bileşen | Görev |
|---|---|
| `ui.tsx` | Ortak temel arayüz ilkelleri (kart, buton, rozet, alan) — tüm ekranlar buradan beslenir |
| `PanelGezinme.tsx` | Panel menüsü; role/kapsama göre görünen sekmeler, `aria-current="page"` |
| `KamuSayfaDuzeni.tsx` | Giriş/başvuru/şifre gibi oturumsuz sayfaların düzeni |
| `TemaSecici.tsx` | Tema D / Tema B geçişi (`tema-eylemi.ts` ile çerezde saklanır) |
| `RolEtiketi.tsx` | Rol ve görev rolü etiketleri |
| `ProfilDuzenleme.tsx` | Profil düzenleme formu (EBA alanları salt-okunur) |
| `OgrenciProfilBolumleri.tsx` | Öğrenci profilinin bölümlenmiş görünümü |
| `DanismanSecimi.tsx` | Öğrencinin danışman seçim arayüzü |
| `CalismaGrubuSecimi.tsx` | Çalışma grubu seçimi |
| `KayitTuruSecici.tsx` | EBA dışı başvuruda kayıt türü (Mezun/Paydaş/Mentör) |
| `DuyuruFormu.tsx` | Hedefli duyuru gönderim formu (Panel/E-Posta/SMS) |
| `EnvanterFormu.tsx`, `EnvanterSonucu.tsx` | Algoritmam envanteri ve sonuç ekranı |
| `RotamKarti.tsx` | Rotam hedef kartı |
| `KatkiKarti.tsx`, `OgretmenKatkiKarti.tsx` | Katkı/katılım özet kartları |
| `FaaliyetRozetleri.tsx` | Etkinlik katılımından türeyen rozetler |
| `OnayBelgeleriBolumu.tsx` | KVKK ve taahhüt onay belgeleri bölümü |
| `MesajSeridi.tsx` | Yazışma ve ekip sohbeti mesaj şeridi |
| `MetinBaglantili.tsx` | Kullanıcı metnindeki bağlantıların güvenli işlenmesi (`lib/metin`) |
| `YazdirButonu.tsx` | `@media print` akışını tetikleyen yazdırma butonu |
| `YonetimKartlari.tsx` | Yönetim panelindeki sayılı kartlar |
| `belge/` | Katılım ve teşekkür belgesi şablon bileşenleri |

### 15.3 Kök Referans Belgeleri

`README.md`, `DAGITIM.md`, `permissions.md`, `domain-rules.md`, `data-model.md`, `SKILL.md`, `proje.md` (bu belge) ve `kurulum/` altındaki ekler (`ek-a`…`ek-f`, `sso-veri-talebi.md`).

Biten iş planları 27 Ağustos 2026'da kaldırıldı (`liste.md`, `baglantilarim-plani.md`, `manisa-farklari-plani.md`, `hata-kimligi.md`): hepsi tamamlanmıştı ve kararların gerekçesi ilgili dosyaların yorumlarında duruyor. Geçmişleri git'te.

---

## 16. Ortam Değişkenleri ve Üretim Dağıtımı

### 16.1 Ortam Değişkenleri (`.env`)
```text
DATABASE_URL="postgresql://kullanici:sifre@localhost:5432/genctek?schema=public"
AUTH_PROVIDER="mock" # Üretimde "eba"
OTURUM_GIZLI_ANAHTARI="en-az-16-karakter-cok-guclu-gizli-anahtar"
TEMEL_YOL="" # Alt dizin için "/genctek"
DEPOLAMA_SAGLAYICI="yerel" # veya "s3"
DEPOLAMA_YEREL_DIZIN="./depolama"
S3_UC_NOKTASI=""
S3_BOLGE=""
S3_KOVA=""
S3_ERISIM_ANAHTARI=""
S3_GIZLI_ANAHTAR=""
EBA_SSO_URL=""
EBA_ISTEMCI_ID=""
EBA_ISTEMCI_SIFRE=""
EPOSTA_SAGLAYICI="gunluk" # veya "smtp", "kapali"
EPOSTA_GONDEREN=""
SMTP_SUNUCU=""
SMTP_PORT=""
SMTP_KULLANICI=""
SMTP_SIFRE=""
SMS_SAGLAYICI="kapali" # veya "http", "gunluk"
SMS_API_URL=""
SMS_API_ANAHTARI=""
SMS_BASLIK=""
```

### 16.2 Üretim Dağıtımı Adımları
1. **Veritabanı Hazırlığı:** `npx prisma migrate deploy` ve `npm run db:seed`.
2. **Derleme:** `npm run build` (Standalone çıktı üretir).
3. **Varlık Kopyalama:** `.next/static` -> `.next/standalone/.next/static` ve `public` -> `.next/standalone/public`.
4. **Servis Yapılandırması:** `systemd` servisi (`genctek.service`) ile Node.js uygulamasını düşük yetkili sistem kullanıcısıyla çalıştırma.
5. **Ters Vekil:** Nginx / Apache ters vekili ve HTTPS (SSL/TLS) yapılandırması.
6. **Zamanlanmış Görevler (Cron):**
   - Gecelik Senkron: `0 3 * * * cd /opt/genctek && npm run senkron:danisman`
   - Aylık Veri Saklama/Temizlik: `0 4 1 * * cd /opt/genctek && npm run bakim:saklama`

---

## 17. Test Stratejisi, Kabul Kapısı ve Son Kontrol Listesi

Tüm iş akışları ve saf kurallar veri tabanından izole birim testlerle korunur. `tests/` altında **57 test paketi + 1 paylaşılan yardımcı dosya (`yardimcilar.ts`)**, toplam **1.097 test durumu** bulunur.

### 17.0 Test Paketi Envanteri (57 Dosya)

| Alan | Paketler |
|---|---|
| Yetki & Rol | `yetki-izinler`, `yetki-kapsam`, `yetki-dis-kullanici`, `rol-karar`, `gorev-rol-etiketleri`, `oturum-govde` |
| Danışmanlık | `danisman-karar` |
| Etkinlik | `faaliyet-kurallar`, `faaliyet-ek-kurallar`, `faaliyet-liste-filtresi`, `faaliyet-takvim`, `faaliyet-rapor-kurallar`, `basvuru-il-disi`, `katilim-kurallar` |
| Belge | `belge-kurallar`, `belge-kapi`, `belge-toplu` |
| Profil & Gelişim | `kazanim-kurallar`, `kazanim-rozetler`, `hedef-kurallar`, `envanter-kurallar`, `profil-foto-kurallar`, `profil-salt-okunur`, `ogrenci-cv-kurallar`, `ogrenci-iletisim-kurallar`, `ogretmen-gorev-yillari`, `katki-ozeti` |
| İletişim & Sosyal | `iletisim-kurallar`, `akis-kurallar`, `ekip-kurallar`, `mentor-kurallar`, `metin-baglanti` |
| Dış Kimlik | `dis-kimlik-kurallar`, `dis-kimlik-sifre`, `dis-profil-kurallar`, `sifirlama-adresi` |
| Bildirim | `bildirim-hedef`, `bildirim-sablon`, `bildirim-sms`, `bildirim-toplu` |
| Rapor & İstatistik | `rapor-csv`, `rapor-faaliyet`, `rapor-xlsx`, `rapor-disa-aktarma`, `kirilim-istatistigi`, `etkinlik-dokumu`, `grafik-verisi`, `yonetim-panosu`, `okul-eksikleri`, `okul-listesi` |
| Diğer | `paydas-kurallar`, `market-kurallar`, `kvkk-kurallar`, `db-havuz`, `zip`, `hata-kurallar`, `ham-yol-taramasi` |

> `ham-yol-taramasi.test.ts` bir güvenlik bekçisidir: kodda `TEMEL_YOL` öneki atlanarak yazılmış ham yol kullanımını yakalar. Yeni sayfa eklerken bu testin geçtiğinden emin olun.

### 17.1 Çalıştırılacak Kabul Komutları:
```powershell
npm run lint
npx tsc --noEmit
npx prisma validate
npm test -- --runInBand --ci
npm run build
```

### 17.2 Son Kontrol Listesi (Sayısal Kabul Kapısı):

**Sayım doğrulaması** — her biri komutla ölçülür:

| Ölçüt | Beklenen | Komut |
|---|---|---|
| Prisma modeli | 47 | `grep -c "^model " prisma/schema.prisma` |
| Prisma enum | 26 | `grep -c "^enum " prisma/schema.prisma` |
| Migrasyon dizini | 52 | `ls prisma/migrations \| wc -l` |
| Sayfa (`page.tsx`) | 61 | `find src/app -name page.tsx \| wc -l` |
| Route handler | 29 | `find src/app -name route.ts \| wc -l` |
| Server action dosyası | 34 | `find src/app -name "*eylem*.ts" \| wc -l` |
| Test paketi | 57 (+`yardimcilar.ts`) | `ls tests \| wc -l` → 58 |
| Test durumu | 1.097 | `npm test` özeti |
| `scripts/` betiği | 17 | `ls scripts \| wc -l` |
| Paylaşılan bileşen | 24 `.tsx` + `belge/` + `grafik/` = 26 girdi | `ls src/components \| wc -l` |

**Davranış doğrulaması:**
- [ ] `prisma/schema.prisma`, migrasyonlar, seed ve kod aynı 47 modeli ve 26 enum'ı paylaşıyor mu?
- [ ] 7 kritik PostgreSQL kısmi tekil indeksi tanımlı mı?
- [ ] Tüm tekil ve liste sorguları `kapsam.ts` filtrelerinden geçiyor mu?
- [ ] Kapsam dışı veya yetkisiz nesnelerde daima `404` dönüyor mu?
- [ ] Hiçbir dosya `public/` altından doğrudan sunulmuyor mu?
- [ ] Öğrenci dahil mentörlük başvurusu ve yalnızca Proje Yöneticisi onayı kuralı uygulanıyor mu?
- [ ] Program ve Çalışma Grubu CSV İstatistiği **route handler'ı** (`/panel/raporlar/istatistik/route.ts`) CSV döndürüyor mu?
- [ ] `next.config.ts` içinde 4 güvenlik başlığı ve `/panel/faaliyetler` kalıcı yönlendirmesi duruyor mu?
- [ ] `ham-yol-taramasi.test.ts` geçiyor mu (tüm yollar `TEMEL_YOL` önekli mi)?
- [ ] 936 Jest testi sıfır hata ile geçiyor mu?
