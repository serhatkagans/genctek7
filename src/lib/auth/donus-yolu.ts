/**
 * GİRİŞ SONRASI DÖNÜŞ YOLU (20 Ağustos 2026 · istek: "herkes başvuramayacak,
 * az önceki uygulamadaki sayfaya gitmesi gerek ama girişten sonra").
 *
 * Tanıtım portalındaki (genctek-portal) etkinlik kartı doğrudan buradaki
 * etkinlik sayfasına bağlanıyor. Ziyaretçinin oturumu yoksa giriş ekranına
 * düşüyor ve girişten sonra PANELE bırakılırsa, tıkladığı etkinliği elle
 * aramak zorunda kalıyor — portaldan gelen bağlantı pratikte kayboluyor.
 *
 * Bu yüzden giriş adresi bir `nereye` parametresi taşıyabiliyor ve giriş
 * eylemi kişiyi oraya bırakıyor.
 *
 * AÇIK YÖNLENDİRME (open redirect) BURADA KESİLİR. Parametre adres çubuğundan
 * geliyor, yani saldırganın yazdığı bir değer olabilir: `?nereye=https://…`
 * ile hazırlanan bir bağlantı, kişiyi GERÇEK giriş ekranından geçirip sahte
 * bir siteye bırakırdı — kimlik avında en ikna edici düzendir, çünkü kurban
 * gerçekten resmî adreste giriş yapmıştır.
 *
 * Ölçüt bu yüzden "şüpheli olanı ele" değil "yalnızca tanıdığıma izin ver":
 * değer /panel ile başlayan uygulama içi bir yol OLMAK ZORUNDA. Şema, host,
 * protokole benzeyen her şey ve `//` ile başlayan protokolsüz adresler
 * (tarayıcı bunları başka bir siteye çözer) elenir.
 */

/** Dönüşe izin verilen tek ağaç: panelin kendisi. */
const IZINLI_ONEK = "/panel";

export function guvenliDonusYolu(
  deger: string | null | undefined,
): string | null {
  if (!deger) return null;

  /*
   * Ters eğik çizgi de elenir: bazı tarayıcılar "/\ornek.com" adresini
   * "//ornek.com" gibi çözer, yani tek eğik çizgiyle başlıyor görünen bir
   * değer dışarı çıkabilir.
   */
  if (!deger.startsWith("/") || deger.startsWith("//") || deger.startsWith("/\\")) {
    return null;
  }

  // Denetim öncesi normalleştirme: "%2f" gibi kaçışlarla saklanmış bir yol,
  // çözülmeden bakıldığında masum görünürdü.
  let cozulmus: string;
  try {
    cozulmus = decodeURIComponent(deger);
  } catch {
    // Bozuk kaçış dizisi — kaynağı ne olursa olsun güvenilecek bir değer değil.
    return null;
  }

  if (cozulmus.includes("\\") || cozulmus.includes("://")) return null;
  if (cozulmus.startsWith("//")) return null;

  /*
   * Yalnızca panel ağacı. Kıyas "/panel" ya da "/panel/..." biçiminde:
   * "/panelimsi" gibi bir yol öneki taşıyor görünüp başka bir ekran olurdu.
   */
  const [yol] = cozulmus.split(/[?#]/, 1);
  if (yol !== IZINLI_ONEK && !yol.startsWith(`${IZINLI_ONEK}/`)) return null;

  // ".." ile yukarı tırmanan yollar: normalleştirmeyi tarayıcıya bırakmıyoruz.
  if (yol.split("/").includes("..")) return null;

  return cozulmus;
}
