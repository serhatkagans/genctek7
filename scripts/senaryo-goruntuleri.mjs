/**
 * Dört yetki senaryosunu gerçek giriş akışıyla gezer, her ekranın görüntüsünü
 * alır ve her senaryonun NE GÖRDÜĞÜNÜ konsola yazar.
 *
 * Ekran görüntüsü yan ürün; asıl değeri kapsam izolasyonunu canlı sistemde
 * kanıtlaması: her senaryonun öğrenci listesinde kimlerin göründüğü rapor
 * edilir, öğrencinin listeye hiç erişemediği doğrulanır.
 *
 * Kullanım:  node scripts/senaryo-goruntuleri.mjs [--tema=d|b]
 * Ön koşul:  npm run dev çalışıyor olmalı.
 */

import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const kok = process.env.GENCTEK_URL ?? "http://localhost:3000";
const tema =
  process.argv.find((arg) => arg.startsWith("--tema="))?.split("=")[1] ?? "d";
const dizin = "ekran-goruntuleri";

mkdirSync(dizin, { recursive: true });

const tarayici = await chromium.launch();

async function girisYap(kisiAdi) {
  const baglam = await tarayici.newContext({
    viewport: { width: 1280, height: 900 },
  });
  await baglam.addCookies([
    { name: "genctek_tema", value: tema, domain: "localhost", path: "/" },
  ]);
  const sayfa = await baglam.newPage();
  /*
   * Kimlik doğrudan aranarak bulunur: örnek envanter yüklendiğinde giriş
   * ekranı uzun listeleri kırpar ve aranan kişi ilk sayfada olmayabilir.
   */
  await sayfa.goto(`${kok}/giris?ara=${encodeURIComponent(kisiAdi)}`, {
    waitUntil: "networkidle",
  });
  /*
   * Senaryo kimlikleri sabit mock listesinden gelir; örnek envanterde aynı ada
   * sahip üretilmiş kişiler olabilir, onlar elenir (authProviderId öneki).
   */
  await sayfa
    .locator('form:has(input[name="kimlikBilgisi"]:not([value^="uretilen-"]))')
    .filter({ hasText: kisiAdi })
    .first()
    .getByRole("button")
    .click();
  await sayfa.waitForURL(/\/(panel|onay)/, { timeout: 20000 });
  await sayfa.waitForLoadState("networkidle");
  const ilkGirisKapisi = await ilkGirisKapisiniGec(sayfa);
  return { baglam, sayfa, ilkGirisKapisi };
}

/**
 * İlk giriş onay kapısı — hiç onay vermemiş kullanıcı panele giremez
 * (bkz. src/app/onay/page.tsx). Senaryo gezisi kapının ARKASINI ölçtüğü için
 * burada onay verilir; kapının kendi görüntüsü ayrıca alınır.
 *
 * Kapının çıkıp çıkmadığı DÖNDÜRÜLÜR: örnek envanterde onaylar boş olduğu için
 * ilk gezide herkes buradan geçer, ikinci gezide kimse geçmez. İkisi de
 * doğrudur; rapor hangisinin olduğunu yazsın diye bilgi taşınıyor.
 */
async function ilkGirisKapisiniGec(sayfa) {
  /*
   * Kapı, giriş sonrası HEDEF SAYFADA açılıyor: `girisYap` kişiyi /panel'e
   * yolluyor, panel düzeni de onaysız kullanıcıyı /onay'a
   * çeviriyor. `waitForURL(/(panel|onay)/)` bu zincirin ORTASINDA, henüz
   * /panel'deyken eşleşebiliyor; o an url'ye bakıp "kapı yok" demek yanlış
   * sonuç veriyordu ve sonraki her gezinme sessizce /onay'a düşüyordu.
   *
   * Bu yüzden karar url'nin anlık hâline değil, /panel'e YAPILAN BİR GEZİNMENİN
   * nerede bittiğine bakılarak veriliyor.
   */
  if (!sayfa.url().includes("/onay")) {
    await sayfa.goto(`${kok}/panel`, { waitUntil: "networkidle" });
    if (!sayfa.url().includes("/onay")) return false;
  }

  await sayfa.screenshot({
    path: `${dizin}/0-ilk-giris-onayi-tema-${tema}.png`,
    fullPage: true,
  });

  const kutular = sayfa.locator('input[name="belge"]');
  const adet = await kutular.count();
  for (let i = 0; i < adet; i += 1) {
    await kutular.nth(i).check();
  }
  await sayfa.getByRole("button", { name: /Onaylıyorum/ }).click();
  await sayfa.waitForURL(/\/panel/, { timeout: 20000 });
  await sayfa.waitForLoadState("networkidle");
  return true;
}

async function cek(sayfa, dosya, yol) {
  if (yol) {
    await sayfa.goto(`${kok}${yol}`, { waitUntil: "networkidle" });
  }
  await sayfa.screenshot({
    path: `${dizin}/${dosya}-tema-${tema}.png`,
    fullPage: true,
  });
}

/** Üst menüde görünen bağlantılar — rolün erişebildiği ekranlar. */
async function menu(sayfa) {
  return sayfa.locator("header nav a").allInnerTexts();
}

/** Panelde görünen okunmamış bildirim başlıkları. */
async function bildirimler(sayfa) {
  await sayfa.goto(`${kok}/panel`, { waitUntil: "networkidle" });
  return sayfa.locator("main ul li > p:first-child").allInnerTexts();
}

/** Öğrenci listesinde görünen adlar; erişim engelliyse null. */
async function ogrenciListesi(sayfa) {
  await sayfa.goto(`${kok}/panel/ogrenciler`, { waitUntil: "networkidle" });
  const engelMetni = await sayfa
    .getByText("Bu ekrana erişim yetkiniz yok")
    .count();
  if (engelMetni > 0) return null;
  return sayfa.locator("table tbody tr td:first-child").allInnerTexts();
}

/** Faaliyet listesinde görünen başlıklar. */
async function faaliyetListesi(sayfa, sorgu = "") {
  await sayfa.goto(`${kok}/panel/etkinlikler${sorgu}`, {
    waitUntil: "networkidle",
  });
  return sayfa.locator("main ul li h3").allInnerTexts();
}

/** `<input type="date">` biçiminde bugüne göreli tarih. */
function bugunArti(gunSayisi) {
  const tarih = new Date();
  tarih.setDate(tarih.getDate() + gunSayisi);
  const iki = (sayi) => String(sayi).padStart(2, "0");
  return `${tarih.getFullYear()}-${iki(tarih.getMonth() + 1)}-${iki(tarih.getDate())}`;
}

/**
 * Faaliyet kartına tıklayıp detay sayfasının AÇILMASINI bekler.
 *
 * `waitForLoadState("networkidle")` burada yeterli değildir: App Router'ın
 * istemci tarafı geçişinde sayfa zaten "networkidle" durumundadır, dolayısıyla
 * beklemeden döner ve script hâlâ liste sayfasını okur. Adres değişimini
 * beklemek tek güvenilir yol.
 */
async function faaliyeteGir(sayfa, ad) {
  await sayfa.getByRole("link", { name: ad }).first().click();
  await sayfa.waitForURL(/\/panel\/etkinlikler\/\d+/, { timeout: 20000 });
  await sayfa.waitForLoadState("networkidle");
  return new URL(sayfa.url()).pathname;
}

/**
 * Ana yorum kutusuna yazıp gönderir.
 *
 * Yanıt formları da `textarea[name="icerik"]` taşır ama `<details>` içinde
 * kapalı durur; ana kutuyu ayırt etmek için "üst yorum" alanı OLMAYAN formu
 * seçiyoruz. Buton adı da tam eşleşmeli: "Gönder" alt dize olarak "Yanıtı
 * gönder"e de uyar.
 */
async function yorumYaz(sayfa, metin) {
  const anaForm = sayfa.locator(
    'form:not(:has(input[name="ustYorumId"])):has(textarea[name="icerik"])',
  );
  await anaForm.locator('textarea[name="icerik"]').fill(metin);
  await anaForm.getByRole("button", { name: "Gönder", exact: true }).click();
  await sayfa.waitForURL(/durum=yorum-yazildi/, { timeout: 20000 });
}

/**
 * Faaliyet açar. Script tekrar tekrar çalıştırılabilsin diye aynı adlı faaliyet
 * zaten varsa yenisi açılmaz, mevcudunun adresi döner.
 */
async function faaliyetAc(sayfa, { ad, aciklama, kapsam, kontenjan, kapak }) {
  const mevcut = await faaliyetListesi(sayfa);
  if (mevcut.includes(ad)) {
    return { yol: await faaliyeteGir(sayfa, ad), yeniMi: false };
  }

  await sayfa.goto(`${kok}/panel/etkinlikler/yeni`, {
    waitUntil: "networkidle",
  });
  await sayfa.fill('input[name="ad"]', ad);
  await sayfa.fill('textarea[name="aciklama"]', aciklama);
  await sayfa.selectOption('select[name="kapsam"]', kapsam);
  await sayfa.fill('input[name="tarih"]', `${bugunArti(30)}T14:00`);
  await sayfa.fill('input[name="basvuruBaslangic"]', bugunArti(-1));
  await sayfa.fill('input[name="basvuruBitis"]', bugunArti(14));
  await sayfa.fill('input[name="kontenjan"]', String(kontenjan));
  if (kapak) {
    await sayfa.locator('input[name="kapakGorseli"]').setInputFiles(kapak);
  }
  await sayfa.getByRole("button", { name: "Etkinliği oluştur" }).click();
  await sayfa.waitForURL(/\/panel\/etkinlikler\/\d+/, { timeout: 20000 });
  return { yol: new URL(sayfa.url()).pathname, yeniMi: true };
}

const rapor = [];

// --- 0. Açılış ekranı --------------------------------------------------------
// Oturumsuz ziyaretçinin gördüğü ilk ekran. Tek işi EBA girişine yönlendirmek:
// dış kayıt, şifre ya da parola sıfırlama akışı yoktur.
{
  const baglam = await tarayici.newContext({
    viewport: { width: 1280, height: 900 },
  });
  await baglam.addCookies([
    { name: "genctek_tema", value: tema, domain: "localhost", path: "/" },
  ]);
  const sayfa = await baglam.newPage();
  await sayfa.goto(`${kok}/`, { waitUntil: "networkidle" });
  await cek(sayfa, "0-acilis");

  const girisDugmesi = await sayfa
    .getByRole("link", { name: /EBA ile Giriş Yap/ })
    .count();
  await sayfa.getByRole("link", { name: /EBA ile Giriş Yap/ }).click();
  await sayfa.waitForURL(/\/giris/, { timeout: 20000 });
  rapor.push(
    `Açılış   · EBA giriş düğmesi: ${girisDugmesi === 1 ? "var" : "*** YOK ***"} · düğme → ${new URL(sayfa.url()).pathname}`,
  );
  await baglam.close();
}

// --- Hazırlık: öğrenciler ilk girişlerini yapar -------------------------------
// Kullanıcılar önceden veritabanına yazılmaz; kayıt ilk girişte oluşur. Tüm
// senaryoların dolu görünmesi için her öğrenci bir kez giriş yapar. Bu aynı
// zamanda ilk atama akışını çalıştırır: okulunda danışman olan öğrenci
// danışmanına, olmayan il koordinatörüne bağlanır, ilinde koordinatör de yoksa
// proje yöneticisine uyarı düşer.
for (const ogrenci of [
  "Elif Yılmaz",
  "Yusuf Demir",
  "Zeynep Kaya",
  "Mert Aydın",
  "Ayşe Şahin",
]) {
  const { baglam } = await girisYap(ogrenci);
  await baglam.close();
}
rapor.push("Hazırlık: 5 öğrenci ilk girişini yaptı");

// --- Hazırlık: ikinci bir öğretmen danışmanlık görevini alır ------------------
// Böylece Kadıköy'de iki aday olur ve öğrencinin danışman SEÇİMİ ekranı dolu
// görünür (tek aday olsaydı sistem otomatik atardı).
{
  const { baglam, sayfa } = await girisYap("Fatma Çelik");
  await sayfa.goto(`${kok}/panel#profilim`, { waitUntil: "networkidle" });
  await cek(sayfa, "0-gorev-almamis-ogretmen-profil");

  const gorevAlDugmesi = sayfa.getByRole("button", {
    name: /görev almak istiyorum/i,
  });
  if ((await gorevAlDugmesi.count()) > 0) {
    await gorevAlDugmesi.click();
    await sayfa.waitForLoadState("networkidle");
    rapor.push("Hazırlık: Fatma Çelik danışmanlık görevini aldı");
  } else {
    rapor.push("Hazırlık: Fatma Çelik zaten danışman");
  }
  await baglam.close();
}

// --- 1. YEĞİTEK — proje yöneticisi -------------------------------------------
{
  const { baglam, sayfa } = await girisYap("Burcu Yılmaz");
  await cek(sayfa, "1-yegitek-panel");
  const menuler = await menu(sayfa);
  const uyarilar = await bildirimler(sayfa);
  const liste = await ogrenciListesi(sayfa);
  await cek(sayfa, "1-yegitek-ogrenciler");
  rapor.push(
    `YEĞİTEK  · menü: ${menuler.join(", ")} · öğrenci listesi (${liste?.length}): ${liste?.join(" | ")}`,
  );
  rapor.push(`         · okunmamış bildirim (${uyarilar.length}): ${uyarilar.join(" / ")}`);
  await baglam.close();
}

// --- 2. İl koordinatörü (İstanbul) ------------------------------------------
{
  const { baglam, sayfa } = await girisYap("Selim Koç");
  await cek(sayfa, "2-il-koordinatoru-panel");
  const menuler = await menu(sayfa);
  const liste = await ogrenciListesi(sayfa);
  await cek(sayfa, "2-il-koordinatoru-ogrenciler");
  rapor.push(
    `İl koord. · menü: ${menuler.join(", ")} · öğrenci listesi (${liste?.length}): ${liste?.join(" | ")}`,
  );
  await baglam.close();
}

// --- 3. Okul koordinatörü (danışman öğretmen) -------------------------------
{
  const { baglam, sayfa } = await girisYap("Ahmet Öztürk");
  await cek(sayfa, "3-okul-koordinatoru-panel");
  const menuler = await menu(sayfa);
  const liste = await ogrenciListesi(sayfa);
  await cek(sayfa, "3-okul-koordinatoru-ogrenciler");
  await cek(sayfa, "3-okul-koordinatoru-profil", "/panel#profilim");
  rapor.push(
    `Okul koord. · menü: ${menuler.join(", ")} · öğrenci listesi (${liste?.length}): ${liste?.join(" | ")}`,
  );
  await baglam.close();
}

// --- 4. Öğrenci -------------------------------------------------------------
{
  const { baglam, sayfa } = await girisYap("Elif Yılmaz");
  const girisSonrasiYol = new URL(sayfa.url()).pathname;
  await cek(sayfa, "4-ogrenci-giris-sonrasi");
  await cek(sayfa, "4-ogrenci-panel", "/panel");
  await cek(sayfa, "4-ogrenci-danisman-secim", "/panel/danisman-secim");
  await cek(sayfa, "4-ogrenci-calisma-gruplari", "/panel/calisma-gruplari");
  const menuler = await menu(sayfa);
  const liste = await ogrenciListesi(sayfa);
  await cek(sayfa, "4-ogrenci-ogrenci-listesi-engeli");
  rapor.push(
    `Öğrenci  · giriş sonrası yönlendirme: ${girisSonrasiYol} · menü: ${menuler.join(", ")} · öğrenci listesi: ${
      liste === null ? "ERİŞİM ENGELLENDİ (beklenen)" : `SIZDI → ${liste.join(" | ")}`
    }`,
  );
  await baglam.close();
}

// --- 5. Faaliyet akışı ------------------------------------------------------
// Faaliyetlerin kapsam izolasyonu öğrenci listesininki kadar kritiktir: okul
// içi faaliyet başka okuldan, onay bekleyen ulusal faaliyet öğrenciden
// görünmemeli. Aşağısı bunu canlı sistemde gezer.

const OKUL_FAALIYETI = "Robotik Atölyesi";
const ULUSAL_FAALIYET = "Ulusal Siber Güvenlik Kampı";

/** Testte kullanılan küçük bir PNG (2x2, düz renk). */
const ORNEK_GORSEL = {
  name: "tanitim.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR4nGP8z4AATAxQxhAXAAAA//8DTgGBaGBLpAAAAABJRU5ErkJggg==",
    "base64",
  ),
};
let ulusalFaaliyetYolu;
/** Onay öncesi sızıntı kontrolü yalnızca faaliyet BU çalıştırmada açıldıysa
 *  anlamlıdır; önceki çalıştırmadan onaylı kalan faaliyette yanlış alarm verir. */
let ulusalFaaliyetYeniMi = false;

/**
 * Danışman öğretmenin açtığı okul içi etkinlik de ONAY BEKLER
 * (bkz. lib/yetki/izinler.ts · faaliyetOnayGerekiyorMu): ilin koordinatörü
 * görmeden yayına girmez ve öğrenciye görünmez. Senaryo bu adımı atlarsa
 * öğrenci etkinliği hiç göremez — betik uzun süre burada takıldı.
 */
let okulFaaliyetYolu;
let okulFaaliyetYeniMi = false;

{
  // Okul koordinatörü okul içi faaliyet açar.
  const { baglam, sayfa } = await girisYap("Ahmet Öztürk");
  const kapsamlar = await sayfa
    .goto(`${kok}/panel/etkinlikler/yeni`, { waitUntil: "networkidle" })
    .then(() => sayfa.locator("select[name='kapsam'] option").allInnerTexts());
  await cek(sayfa, "5-okul-koordinatoru-yeni-faaliyet");

  const sonuc = await faaliyetAc(sayfa, {
    ad: OKUL_FAALIYETI,
    aciklama:
      "Okulumuzda hafta sonu düzenlenecek başlangıç seviyesi robotik atölyesi.",
    kapsam: "OKUL",
    kontenjan: 2,
    kapak: ORNEK_GORSEL,
  });
  okulFaaliyetYolu = sonuc.yol;
  okulFaaliyetYeniMi = sonuc.yeniMi;

  // Tanıtıcı görsel faaliyet açılırken yüklendi mi?
  const kapakRozeti = await sayfa.getByText("Tanıtıcı görsel").count();
  rapor.push(
    `Okul koord. · açabildiği kapsamlar: ${kapsamlar.join(" | ")} · faaliyet ${sonuc.yeniMi ? "açıldı" : "zaten vardı"}`,
  );
  rapor.push(
    `            · açılış formundan yüklenen tanıtıcı görsel: ${
      kapakRozeti > 0 ? "detayda görünüyor" : "YOK"
    }`,
  );
  await baglam.close();
}

{
  // İl koordinatörünün ulusal faaliyeti onay bekler.
  const { baglam, sayfa } = await girisYap("Selim Koç");
  await sayfa.goto(`${kok}/panel/etkinlikler/yeni`, {
    waitUntil: "networkidle",
  });
  const kapsamlar = await sayfa
    .locator("select[name='kapsam'] option")
    .allInnerTexts();

  const sonuc = await faaliyetAc(sayfa, {
    ad: ULUSAL_FAALIYET,
    aciklama:
      "Ülke genelindeki öğrencilere açık beş günlük siber güvenlik kampı.",
    kapsam: "ULUSAL",
    kontenjan: 5,
  });
  ulusalFaaliyetYolu = sonuc.yol;
  ulusalFaaliyetYeniMi = sonuc.yeniMi;
  await cek(sayfa, "5-il-koordinatoru-ulusal-faaliyet");
  rapor.push(
    `İl koord. · açabildiği kapsamlar: ${kapsamlar.join(" | ")} · ulusal faaliyet ${sonuc.yeniMi ? "açıldı (onay bekliyor)" : "zaten vardı"}`,
  );
  await baglam.close();
}

if (ulusalFaaliyetYeniMi) {
  // Onay ÖNCESİ: öğrenci ulusal faaliyeti ne listede ne adresinden görebilmeli.
  const { baglam, sayfa } = await girisYap("Yusuf Demir");
  const oncesi = await faaliyetListesi(sayfa);
  const dogrudan = await sayfa.goto(`${kok}${ulusalFaaliyetYolu}`, {
    waitUntil: "networkidle",
  });
  rapor.push(
    `Öğrenci  · onay ÖNCESİ gördüğü faaliyetler: ${oncesi.join(" | ") || "(yok)"}`,
  );
  rapor.push(
    `         · onay bekleyen faaliyetin listede görünmesi: ${
      oncesi.includes(ULUSAL_FAALIYET) ? "*** SIZDI ***" : "yok (beklenen)"
    }`,
  );
  rapor.push(
    `         · onay bekleyen faaliyetin adresi: HTTP ${dogrudan.status()} ${
      dogrudan.status() === 404 ? "(beklenen)" : "*** SIZDI ***"
    }`,
  );
  /*
   * Aynı kontrol OKUL İÇİ etkinlik için de yapılıyor: öğretmenin açtığı
   * etkinlik de koordinatör onayına kadar öğrenciye kapalıdır. İki kapsam ayrı
   * ayrı sınanmalı — biri sızdırırken öbürü sızdırmayabilir.
   */
  if (okulFaaliyetYeniMi) {
    rapor.push(
      `         · onay bekleyen OKUL İÇİ etkinliğin listede görünmesi: ${
        oncesi.includes(OKUL_FAALIYETI) ? "*** SIZDI ***" : "yok (beklenen)"
      }`,
    );
  }
  await baglam.close();
} else {
  rapor.push(
    "Öğrenci  · onay ÖNCESİ sızıntı kontrolü ATLANDI: ulusal faaliyet önceki çalıştırmadan kalma ve zaten onaylı. Kontrolü görmek için veritabanını sıfırlayın (npm run db:seed).",
  );
}

{
  /*
   * İl koordinatörü, danışman öğretmenin açtığı OKUL İÇİ etkinliği onaylar.
   * Merkez değil il onaylıyor: bir okulun kendi içindeki etkinlik YEĞİTEK
   * sırası gelene kadar beklerse pratikte ölür (bkz. faaliyetOnaylayabilirMi).
   */
  const { baglam, sayfa } = await girisYap("Selim Koç");
  await sayfa.goto(`${kok}${okulFaaliyetYolu}`, { waitUntil: "networkidle" });
  const onayDugmesi = sayfa.getByRole("button", { name: /Onayla ve yayına al/ });
  if (await onayDugmesi.count()) {
    await cek(sayfa, "5-il-koordinatoru-okul-faaliyet-onayi");
    await onayDugmesi.click();
    await sayfa.waitForURL(/durum=onaylandi/, { timeout: 20000 });
    rapor.push("İl koord. · öğretmenin okul içi etkinliğini onayladı");
  } else {
    rapor.push("İl koord. · okul içi etkinlik zaten sonuçlandırılmıştı");
  }
  await baglam.close();
}

{
  // Proje yöneticisi onaylar.
  const { baglam, sayfa } = await girisYap("Burcu Yılmaz");
  await sayfa.goto(`${kok}${ulusalFaaliyetYolu}`, { waitUntil: "networkidle" });
  const onayDugmesi = sayfa.getByRole("button", { name: /Onayla ve yayına al/ });
  if (await onayDugmesi.count()) {
    await cek(sayfa, "5-yegitek-faaliyet-onayi");
    await onayDugmesi.click();
    await sayfa.waitForURL(/durum=onaylandi/, { timeout: 20000 });
    rapor.push("YEĞİTEK  · ulusal faaliyeti onayladı, faaliyet yayına girdi");
  } else {
    rapor.push("YEĞİTEK  · ulusal faaliyet zaten sonuçlandırılmıştı");
  }
  await baglam.close();
}

{
  // Onay SONRASI: öğrenci görür ve okul içi faaliyete başvurur.
  const { baglam, sayfa } = await girisYap("Yusuf Demir");
  const sonrasi = await faaliyetListesi(sayfa);
  rapor.push(`Öğrenci  · onay SONRASI gördüğü faaliyetler: ${sonrasi.join(" | ")}`);

  // Liste artık "sadece yazı" değil: kapak görseli kartta çıkmalı ve gerçekten
  // yüklenmiş olmalı (naturalWidth 0 ise kırık resimdir).
  const kapakGorseli = sayfa.locator("main ul li img").first();
  const kapakSayisi = await sayfa.locator("main ul li img").count();
  const yuklendiMi =
    kapakSayisi > 0 &&
    (await kapakGorseli.evaluate((el) => el.complete && el.naturalWidth > 0));
  rapor.push(
    `         · listede tanıtıcı görsel: ${kapakSayisi} kart · resim yüklendi mi: ${
      yuklendiMi ? "evet" : "*** KIRIK ***"
    }`,
  );
  await cek(sayfa, "5-ogrenci-faaliyetler");

  await faaliyeteGir(sayfa, OKUL_FAALIYETI);

  const gerekceAlani = sayfa.locator('textarea[name="gerekce"]');
  if (await gerekceAlani.count()) {
    await gerekceAlani.fill(
      "Robotik kulübündeyim, Arduino ile çalışıyorum ve ileri seviyeye geçmek istiyorum.",
    );
    await sayfa.getByRole("button", { name: "Başvur", exact: true }).click();
    await sayfa.waitForURL(/durum=basvuruldu/, { timeout: 20000 });
    rapor.push("         · okul içi faaliyete başvurdu");
  } else {
    rapor.push("         · bu faaliyete zaten başvurmuştu");
  }

  // Değerlendirme paneli öğrenciye açılmamalı.
  const degerlendirmeGorunur = await sayfa
    .getByRole("button", { name: "Yedeğe al" })
    .count();
  rapor.push(
    `         · değerlendirme paneli: ${degerlendirmeGorunur === 0 ? "gizli (beklenen)" : "*** SIZDI ***"}`,
  );
  await cek(sayfa, "5-ogrenci-faaliyet-basvurusu");
  await baglam.close();
}

{
  // Başka okulun öğrencisi okul içi faaliyeti görmemeli.
  const { baglam, sayfa } = await girisYap("Zeynep Kaya");
  const liste = await faaliyetListesi(sayfa);
  const sizdiMi = liste.includes(OKUL_FAALIYETI);
  rapor.push(
    `Öğrenci(başka okul) · gördükleri: ${liste.join(" | ") || "(yok)"} → okul içi faaliyet ${
      sizdiMi ? "*** SIZDI ***" : "görünmüyor (beklenen)"
    }`,
  );
  await baglam.close();
}

{
  // Düzenleyen başvuruyu değerlendirir.
  const { baglam, sayfa } = await girisYap("Ahmet Öztürk");
  await faaliyetListesi(sayfa, "?benim=1");
  await faaliyeteGir(sayfa, OKUL_FAALIYETI);
  // Yorum yazarları da p.font-medium taşıdığı için sorgu Başvurular kartına
  // sınırlanır.
  const basvuranlar = await sayfa
    .locator("section")
    .filter({ has: sayfa.getByRole("heading", { name: "Başvurular" }) })
    .locator("li p.font-medium")
    .allInnerTexts();
  rapor.push(`Düzenleyen · başvuran listesi: ${basvuranlar.join(" | ") || "(yok)"}`);

  const secDugmesi = sayfa.getByRole("button", { name: "Seç", exact: true });
  if ((await secDugmesi.count()) > 0 && (await secDugmesi.first().isEnabled())) {
    await secDugmesi.first().click();
    await sayfa.waitForURL(/durum=degerlendirildi/, { timeout: 20000 });
    rapor.push("         · başvuruyu seçti, öğrenciye bildirim düştü");
  }
  await cek(sayfa, "5-duzenleyen-basvuru-degerlendirme");
  await baglam.close();
}

// --- 5b. Ekler ve yorumlar --------------------------------------------------
// Değişmez 8: ek ve yorumun görünürlüğü bağlı olduğu faaliyetin kapsamıyla
// BİREBİR aynıdır. Aşağısı bunu ve moderasyon yetkisini canlı sistemde gezer.

let ekAdresi;
{
  // Düzenleyen görsel yükler ve yorum yazar.
  const { baglam, sayfa } = await girisYap("Ahmet Öztürk");
  await faaliyetListesi(sayfa, "?benim=1");
  await faaliyeteGir(sayfa, OKUL_FAALIYETI);

  const ekSayisi = await sayfa.locator('a[href*="/ekler/"]').count();
  if (ekSayisi === 0) {
    // 1x1 saydam PNG — gerçek bir görsel yüklendiğini kanıtlar.
    await sayfa.locator('input[type="file"]').setInputFiles({
      name: "afis.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
      ),
    });
    await sayfa.getByRole("button", { name: "Yükle" }).click();
    await sayfa.waitForURL(/durum=ek-yuklendi/, { timeout: 20000 });
    rapor.push("Düzenleyen · faaliyete görsel yükledi");
  } else {
    rapor.push("Düzenleyen · faaliyette ek zaten vardı");
  }
  ekAdresi = await sayfa
    .locator('a[href*="/ekler/"]')
    .first()
    .getAttribute("href");

  // İzin verilmeyen tip reddedilmeli.
  await sayfa.locator('input[type="file"]').setInputFiles({
    name: "kur.exe",
    mimeType: "application/x-msdownload",
    buffer: Buffer.from("MZ"),
  });
  await sayfa.getByRole("button", { name: "Yükle" }).click();
  await sayfa.waitForURL(/hata=/, { timeout: 20000 });
  const hataMetni = await sayfa.locator("main").innerText();
  rapor.push(
    `         · izin verilmeyen dosya tipi: ${
      hataMetni.includes("yüklenemez") ? "reddedildi (beklenen)" : "*** KABUL EDİLDİ ***"
    }`,
  );

  await yorumYaz(sayfa, "Atölye için malzeme listesi ektedir.");
  rapor.push("         · faaliyete yorum yazdı");
  await cek(sayfa, "7-duzenleyen-ek-ve-yorum");
  await baglam.close();
}

{
  // Kapsamdaki öğrenci eki indirebilir ve yorum yazabilir.
  const { baglam, sayfa } = await girisYap("Yusuf Demir");
  const indirme = await sayfa.goto(`${kok}${ekAdresi}`, {
    waitUntil: "networkidle",
  });
  rapor.push(
    `Öğrenci(kapsamda) · ek indirme: HTTP ${indirme.status()} ${
      indirme.status() === 200 ? "(beklenen)" : "*** ENGELLENDİ ***"
    }`,
  );

  await faaliyetListesi(sayfa);
  await faaliyeteGir(sayfa, OKUL_FAALIYETI);
  await yorumYaz(sayfa, "Katılmak için sabırsızlanıyorum.");

  /*
   * Öğrenci başkasının yorumunu silememeli, ek de yönetememeli. Kendi yorum
   * sayısı çalıştırmadan çalıştırmaya arttığı için sabit sayı beklenmez;
   * anlamlı olan, silinebilir yorumların TÜMÜ olmaması — düzenleyenin yorumu
   * silinebilir çıkarsa moderasyon yetkisi sızmış demektir.
   */
  const yorumKarti = sayfa
    .locator("section")
    .filter({ has: sayfa.getByRole("heading", { name: "Yorumlar" }) });
  const toplamYorum = await yorumKarti.locator("p.whitespace-pre-line").count();
  const silinebilirYorum = await yorumKarti
    .getByRole("button", { name: "Sil", exact: true })
    .count();
  const dosyaKutusu = await sayfa.locator('input[type="file"]').count();

  rapor.push(
    `                  · yorum yazdı · ${toplamYorum} yorumdan ${silinebilirYorum} tanesini silebiliyor ${
      silinebilirYorum < toplamYorum
        ? "(beklenen: yalnızca kendi yorumları)"
        : "*** BAŞKASININ YORUMUNU SİLEBİLİYOR ***"
    } · dosya yükleme kutusu: ${
      dosyaKutusu === 0 ? "yok (beklenen)" : "*** GÖRÜNÜYOR ***"
    }`,
  );
  await cek(sayfa, "7-ogrenci-yorum");
  await baglam.close();
}

{
  // Başka okulun öğrencisi ne faaliyeti ne de EKİNİ görebilmeli.
  const { baglam, sayfa } = await girisYap("Zeynep Kaya");
  const indirme = await sayfa.goto(`${kok}${ekAdresi}`, {
    waitUntil: "networkidle",
  });
  rapor.push(
    `Öğrenci(başka okul) · okul içi faaliyetin ekini indirme: HTTP ${indirme.status()} ${
      indirme.status() === 404 ? "(beklenen)" : "*** SIZDI ***"
    }`,
  );
  await baglam.close();
}

// --- 6. Görev rolleri -------------------------------------------------------
{
  /*
   * OKUL TEMSİLCİSİ ATAMASI ÖĞRENCİLERİM EKRANINDA (J2 · 5 Ağustos 2026);
   * Görev Rolleri sekmesi danışman öğretmenin menüsünden kalktı ve o ekran
   * yalnızca il/ilçe temsilciliği için kaldı. Kontrol bu yüzden yer değiştirdi:
   * eski hâli "atanabilecek öğrenci yok" diyordu ve bu, taşımanın işlediğini
   * değil kontrolün yanlış ekrana baktığını gösteriyordu.
   */
  const { baglam, sayfa } = await girisYap("Ahmet Öztürk");
  await sayfa.goto(`${kok}/panel/ogrenciler`, { waitUntil: "networkidle" });
  const atamaDugmesi = sayfa.getByRole("button", {
    name: /Okul Temsilcisi yap/,
  });
  const atanabilir = await atamaDugmesi.count();
  if (atanabilir) {
    await atamaDugmesi.first().click();
    await sayfa.waitForURL(/durum=(atandi|hata)/, { timeout: 20000 });
  }
  const gorevKaldir = await sayfa
    .getByRole("button", { name: /Görevi kaldır/ })
    .count();
  await cek(sayfa, "6-okul-koordinatoru-gorev-rolleri", "/panel/ogrenciler");
  rapor.push(
    `Görev rolü · Öğrencilerim'de "Okul Temsilcisi yap" düğmesi: ${
      atanabilir > 0 ? `${atanabilir} öğrencide` : "(yok)"
    } · atama sonrası "Görevi kaldır": ${gorevKaldir > 0 ? "var" : "yok"}`,
  );
  await baglam.close();
}

{
  const { baglam, sayfa } = await girisYap("Yusuf Demir");
  await sayfa.goto(`${kok}/panel/gorev-rolleri`, { waitUntil: "networkidle" });
  // Metin J2 ile değişti; kontrol sabit kalan kısma bakıyor.
  const engellendi = await sayfa.getByText("yetkiniz yok").count();
  rapor.push(
    `           · öğrenci bu ekranda: ${engellendi > 0 ? "engellendi (beklenen)" : "*** ERİŞTİ ***"}`,
  );
  await baglam.close();
}

// --- 7. Rol/atama envanteri (yalnızca proje yöneticisi) ---------------------
{
  const { baglam, sayfa } = await girisYap("Burcu Yılmaz");
  await sayfa.goto(`${kok}/panel/rol-envanteri`, { waitUntil: "networkidle" });
  const ozet = await sayfa.locator("main h1 + p").first().innerText();
  await cek(sayfa, "7-yegitek-rol-envanteri", "/panel/rol-envanteri");
  rapor.push(`Rol/atama envanteri · YEĞİTEK: ${ozet}`);
  await baglam.close();
}

{
  // Envanter, tekil profil erişiminden AYRI bir yetkidir: kendi ilindeki
  // öğrencileri gören il koordinatörü bile bu ekrana giremez.
  const { baglam, sayfa } = await girisYap("Selim Koç");
  await sayfa.goto(`${kok}/panel/rol-envanteri`, { waitUntil: "networkidle" });
  const engellendi = await sayfa
    .getByText("yalnızca proje yöneticisine açıktır")
    .count();
  rapor.push(
    `                     · il koordinatörü: ${engellendi > 0 ? "engellendi (beklenen)" : "*** ERİŞTİ ***"}`,
  );
  await baglam.close();
}

// --- 8. Onay belgeleri, erişim kayıtları ve yönetim -------------------------
{
  /*
   * Öğrenci ilk girişte aydınlatma metnini ve açık rıza metnini onaylar; bunu
   * yapmadan panele giremez (kapıyı girisYap geçiyor). Burada kapının gerçekten
   * çıktığı ve arkasında onayların işlendiği doğrulanıyor — belgeleri ekranda
   * göstermek yetmez, onayın kaydedildiği görülmeli.
   */
  const { baglam, sayfa, ilkGirisKapisi } = await girisYap("Yusuf Demir");

  /*
   * Belge bölümü Panel'in en altında; menüden kaldırıldı (5 Ağustos 2026) ve
   * profil ekranı 20 Ağustos'ta panelle birleşti.
   */
  await sayfa.goto(`${kok}/panel#kvkk`, { waitUntil: "networkidle" });
  await cek(sayfa, "8-ogrenci-onay-belgeleri", "/panel#kvkk");

  const onayliBelge = await sayfa.getByText("tarihinde onayladınız").count();
  const bekleyenBelge = await sayfa.getByText("henüz onaylamadınız").count();

  // Öğrenciden istenen belgeler: aydınlatma + açık rıza. Koordinatör
  // belgelerinin öğrenciye SIZMADIĞI da ölçülüyor.
  const koordinatorBelgesi = await sayfa.getByText("Taahhütnamesi").count();

  rapor.push(
    `Onay belgeleri · öğrenci: ilk giriş kapısı ${ilkGirisKapisi ? "çıktı" : "çıkmadı (onay zaten verilmiş)"}` +
      ` · onaylı belge: ${onayliBelge} · bekleyen: ${bekleyenBelge}` +
      ` · koordinatör belgesi sızdı mı: ${koordinatorBelgesi > 0 ? "*** EVET ***" : "hayır"}`,
  );
  await baglam.close();
}

{
  const { baglam, sayfa } = await girisYap("Burcu Yılmaz");

  await sayfa.goto(`${kok}/panel/erisim-loglari`, { waitUntil: "networkidle" });
  const satirSayisi = await sayfa.locator("tbody tr").count();
  await cek(sayfa, "8-yegitek-erisim-loglari", "/panel/erisim-loglari");
  rapor.push(`Erişim kayıtları · YEĞİTEK ilk sayfada ${satirSayisi} satır görüyor`);

  await sayfa.goto(`${kok}/panel/ayarlar`, { waitUntil: "networkidle" });
  await cek(sayfa, "8-yegitek-yonetim", "/panel/ayarlar");
  const ayarSayisi = await sayfa.locator("form input, form textarea").count();
  rapor.push(`Yönetim · düzenlenebilir ayar alanı: ${ayarSayisi}`);

  await baglam.close();
}

{
  // İki ekran da proje yöneticisine özel: kendi ilini gören koordinatör bile
  // denetim kaydına ve sistem ayarlarına giremez.
  const { baglam, sayfa } = await girisYap("Selim Koç");
  const engeller = [];
  for (const yol of ["/panel/erisim-loglari", "/panel/ayarlar"]) {
    await sayfa.goto(`${kok}${yol}`, { waitUntil: "networkidle" });
    const engellendi = await sayfa
      .getByText("yalnızca proje yöneticisine açıktır")
      .count();
    engeller.push(
      `${yol}: ${engellendi > 0 ? "engellendi (beklenen)" : "*** ERİŞTİ ***"}`,
    );
  }
  rapor.push(`                 · il koordinatörü ${engeller.join(" | ")}`);
  await baglam.close();
}

// --- 9. Profil iletişim bilgileri ------------------------------------------
{
  /*
   * İletişim bilgisi role bağlı değildir: öğrenci gibi il koordinatörü, proje
   * yöneticisi ve danışman öğretmen de kendi telefonunu ve e-postasını girer.
   * Kimlik alanlarının hâlâ salt okunur kaldığı da burada görülür.
   */
  const beklenen = [
    ["Selim Koç", "İl koordinatörü"],
    ["Burcu Yılmaz", "Proje yöneticisi"],
    ["Ahmet Öztürk", "Danışman öğretmen"],
  ];

  for (const [kisi, etiket] of beklenen) {
    const { baglam, sayfa } = await girisYap(kisi);
    /*
     * BÖLÜM AÇIK GELSİN diye `?bolum=` veriliyor: iletişim formu Panel'de
     * katlanır bir `<details>` içinde ve kapalı bir öğenin içindeki alan
     * doldurulamaz (bkz. app/panel/page.tsx).
     */
    await sayfa.goto(
      `${kok}/panel?bolum=iletisim-bilgilerim#iletisim-bilgilerim`,
      { waitUntil: "networkidle" },
    );

    const epostaAlani = sayfa.locator('input[name="eposta"]');
    const telefonAlani = sayfa.locator('input[name="telefon"]');
    const alanVar = (await epostaAlani.count()) && (await telefonAlani.count());

    let kaydedildi = "alan yok";
    if (alanVar) {
      const adres = `${kisi.split(" ")[0].toLocaleLowerCase("tr")}@ornek.meb.gov.tr`;
      await epostaAlani.fill(adres);
      await telefonAlani.fill("05001112233");
      await sayfa.getByRole("button", { name: "Kaydet" }).first().click();
      /*
       * Sunucu eyleminin YÖNLENDİRMESİ beklenir, "networkidle" değil: eylem
       * tamamlanmadan da ağ boşta görünebiliyor ve kontrol kaydı okumadan
       * "kaydedilmedi" diyordu. Kararsız sonuç veren bir kontrol, hatalı
       * kontrolden daha kötüdür — güvenilmez hâle gelir.
       */
      await sayfa.waitForURL(/durum=iletisim-kaydedildi/, { timeout: 20000 });
      await sayfa.reload({ waitUntil: "networkidle" });
      kaydedildi =
        (await epostaAlani.inputValue()) === adres
          ? "kaydedildi ve kalıcı"
          : "*** KAYDEDİLMEDİ ***";
    }

    // Kimlik alanları düzenlenebilir hâle gelmemeli.
    const adAlani = await sayfa.locator('input[name="ad"]').count();

    rapor.push(
      `Profil · ${etiket}: iletişim alanı ${alanVar ? "var" : "*** YOK ***"} · ${kaydedildi} · ad alanı düzenlenebilir: ${
        adAlani > 0 ? "*** EVET ***" : "hayır (beklenen)"
      }`,
    );

    if (kisi === "Selim Koç") {
      await cek(sayfa, "9-il-koordinatoru-profil", "/panel#profilim");
    }
    await baglam.close();
  }
}

// --- 10. Kazanımlar ve dışa aktarma ----------------------------------------
{
  /*
   * Kazanımlar ekranı demo katılımı olan öğrenciyle gösterilir; rozetler
   * geçmişten hesaplandığı için katılımı olmayan öğrencide ekran boş çıkar
   * ve görüntü hiçbir şey anlatmaz. Demo veri: npm run veri:kazanim
   */
  const { baglam, sayfa } = await girisYap("Ayşe Şahin");
  await sayfa.goto(`${kok}/panel/kazanimlarim`, { waitUntil: "networkidle" });
  await cek(sayfa, "9-ogrenci-kazanimlarim", "/panel/kazanimlarim");

  const kazanilan = await sayfa
    .locator("main ul li")
    .filter({ has: sayfa.locator("svg") })
    .count();
  const katilimSayisi = await sayfa
    .locator("main h1 + p")
    .first()
    .innerText();
  rapor.push(`Kazanımlar · ${katilimSayisi.trim()} · listelenen rozet: ${kazanilan}`);
  await baglam.close();
}

{
  /*
   * Katkılarım ekranı YALNIZCA KİŞİNİN KENDİ verisini gösterir; başka birine
   * bakmanın yolu yoktur. Ekran öğretmene ve koordinatöre de açıktır ve onlara
   * KENDİ katkı kartlarını basar (bkz. kazanimlarim/page.tsx) — eski kontrol
   * "koordinatör buraya hiç giremez" varsayıyordu ve bu doğru değildi;
   * kalıcı bir *** üretip raporu güvenilmez kılıyordu.
   *
   * Doğru soru şu: koordinatör burada BAŞKASININ verisini görüyor mu?
   */
  const { baglam, sayfa } = await girisYap("Selim Koç");
  await sayfa.goto(`${kok}/panel/kazanimlarim`, { waitUntil: "networkidle" });
  const govde = (await sayfa.locator("main").innerText()).toLocaleLowerCase("tr");
  const baskasininAdi = ["yusuf demir", "elif yılmaz", "zeynep kaya"].filter(
    (ad) => govde.includes(ad),
  );
  rapor.push(
    `           · il koordinatörü bu ekranda kendi kartını görür · başkasının verisi: ${
      baskasininAdi.length === 0 ? "yok (beklenen)" : `*** SIZDI: ${baskasininAdi.join(", ")} ***`
    }`,
  );
  await baglam.close();
}

{
  // Dışa aktarma bağlantısı ekranda görünmeli; kapsam doğrulaması ayrı
  // betikte (npm run disaaktarma:dogrula).
  const { baglam, sayfa } = await girisYap("Burcu Yılmaz");
  await sayfa.goto(`${kok}/panel/ogrenciler`, { waitUntil: "networkidle" });
  const baglanti = sayfa.getByRole("link", { name: /CSV indir/ });
  const varMi = await baglanti.count();
  await cek(sayfa, "9-yegitek-ogrenci-disa-aktarma", "/panel/ogrenciler");
  rapor.push(
    `Dışa aktarma · öğrenci listesinde CSV bağlantısı: ${
      varMi > 0 ? await baglanti.first().innerText() : "*** YOK ***"
    }`,
  );
  await baglam.close();
}

await tarayici.close();

console.log(`\nTema: ${tema}\n${"-".repeat(70)}`);
for (const satir of rapor) console.log(satir);
console.log(`${"-".repeat(70)}\nGörüntüler: ${dizin}/`);
