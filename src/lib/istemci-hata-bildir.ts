/**
 * Tarayıcıda oluşan hatayı sunucudaki günlüğe bildirir.
 *
 * İKİ ÇAĞIRANI VAR: `app/error.tsx` (sayfa sınırındaki hata) ve
 * `app/global-error.tsx` (kök düzenin kendisi patladığında). İkisi de aynı
 * cümleyi kurmalı; mantık kopyalansaydı biri günceller, öteki geride kalırdı.
 *
 * ASLA FIRLATMAZ ve HİÇBİR ŞEY BEKLETMEZ: bildirim yapılamıyorsa (ağ kopuk,
 * uç 404) kullanıcının gördüğü hata ekranı değişmemeli — üstüne ikinci bir
 * hata koymak, elindeki tek bilgiyi de bulanıklaştırırdı.
 *
 * `keepalive`: kullanıcı hata ekranını görür görmez "Panele dön"e basabilir;
 * bayrak olmadan tarayıcı, sayfa değişirken uçuşta olan isteği iptal eder ve
 * kayıt hiç yazılmazdı.
 */

/*
 * Uygulama kökü DERLEME ZAMANINDA gömülüyor (next.config.ts · env). `basePath`
 * elle yazılan fetch adreslerine uygulanmaz; alt dizine kurulu sunucuda
 * (aiotechs.cloud/genctek) önek olmadan istek uygulamaya hiç ulaşmazdı.
 */
const UC_ADRESI = `${process.env.NEXT_PUBLIC_TEMEL_YOL ?? ""}/api/hata-bildir`;

/**
 * Hatanın kullanıcıya gösterilecek kimliği; yoksa YEREL bir tane üretilir.
 *
 * NİYE GEREKLİ: `digest` yalnızca sunucu hatalarında üretiliyor, yani tarayıcı
 * tarafında patlayan bir sayfada kullanıcı ekranda hiçbir numara görmüyordu —
 * "hata aldım" diyor, aramaya konacak tek bir şey yok. Üretilen kimlik hem
 * ekrana basılıyor hem de günlüğe yazılıyor; hata kayıtları ekranındaki
 * "Kimlik" alanı onu bulur.
 *
 * `i-` ÖNEKİ İSTEMCİ DEMEK: sunucu digest'i saf rakamdır, ikisi karışmasın.
 * Rastgeleliğin kalitesi önemsiz — kimlik güvenlik değil, eşleştirme aracı.
 *
 * BİLDİRİMDEN AYRI DURUYOR: kimlik render sırasında bir kez üretilip ekranda
 * sabit kalmalı (hata ekranı yeniden çizildiğinde kullanıcının okuduğu numara
 * değişmemeli), bildirim ise yan etki olduğu için efekte ait. İkisi tek işlev
 * olsaydı biri ötekini yanlış yere sürüklerdi.
 */
export function hataKimligiUret(hata: Error & { digest?: string }): string {
  if (hata.digest) return hata.digest;
  const parca = Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .padStart(8, "0");
  return `i-${parca}`;
}

/** Hatayı, ekranda gösterilen kimliğiyle birlikte sunucuya bildirir. */
export function istemciHatasiBildir(
  hata: Error & { digest?: string },
  kimlik: string,
): void {
  try {
    void fetch(UC_ADRESI, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        mesaj: hata.message,
        ad: hata.name,
        yiginIzi: hata.stack ?? null,
        // Kullanıcının ekranda okuduğu numara ile günlük satırının eşleştiği
        // tek alan (bkz. hataKimligiUret).
        kimlik,
        // Sorgu dizesi sunucuda ayrıca kırpılıyor; yine de buradan hiç
        // gönderilmiyor — arama kutusuna yazılan metin ağa çıkmasın.
        yol: window.location.pathname,
      }),
    }).catch(() => {});
  } catch {
    // JSON kurulamadı ya da fetch hiç yok: sessizce vazgeçilir. Ekrandaki
    // kimlik yerinde kalır; kullanıcı en azından bir numara iletebilir.
  }
}
