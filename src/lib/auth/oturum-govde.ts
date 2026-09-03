/**
 * Oturum çerezinin İMZALANAN GÖVDESİ — üretimi ve çözümü.
 *
 * NİYE AYRI DOSYA: oturum.ts `next/headers` ve `prisma` çeker; çerez biçimini
 * sınamak için bir HTTP isteği ve veritabanı ayağa kaldırmak gerekirdi. Biçim
 * hatasının bedeli yüksek (süresi dolmuş jetonun kabul edilmesi), o yüzden
 * kural saf tutuluyor ve doğrudan sınanıyor.
 *
 * İmzalama burada YAPILMAZ: gizli anahtar ve HMAC oturum.ts'te kalır. Bu modül
 * yalnızca "gövdenin içinde ne yazar" sorusunu cevaplar.
 *
 * GÖVDE AUTHPROVIDER KİMLİĞİNİ DEĞİL `kullanici.id`'yi TAŞIR (3 Eylül 2026).
 * Base64url bir KODLAMADIR, şifreleme değil: gövdeyi eline geçiren herkes
 * içindekini okur. HMAC yalnızca kurcalamayı engeller, okumayı değil. SSO
 * bağlandığında `auth_provider_id` T.C. kimlik numarası taşıyacak; o değer
 * gövdede olsaydı her kullanıcının kimlik numarası kendi tarayıcısında,
 * geliştirici araçlarında, ters vekil günlüklerinde ve makine yedeklerinde
 * açık hâlde dururdu. `httpOnly` bunu engellemez — çerezi kopyalayanı değil,
 * betikle okuyanı durdurur. Satır kimliği ise tek başına kimseyi işaret etmez.
 */

/** Kimlik ile son kullanma anını ayıran karakter. */
const AYRAC = "|";

export interface OturumGovdesi {
  kullaniciId: number;
  /** `kullanici.oturum_surumu`nun çerez yazıldığı andaki değeri. */
  surum: number;
}

export function oturumGovdesiUret(
  kullaniciId: number,
  sonKullanma: number,
  surum: number,
): string {
  return Buffer.from(
    `${kullaniciId}${AYRAC}${sonKullanma}${AYRAC}${surum}`,
    "utf8",
  ).toString("base64url");
}

/**
 * Gövdeyi çözer; biçim bozuksa ya da süre dolmuşsa `null` döner.
 *
 * İKİ DURUM AYRILMAZ: hem "bu çerez tanınmıyor" hem "bu çerezin süresi doldu"
 * için doğru cevap "yeniden giriş yapın"dır. Ayrım yapmak, çağıran tarafı
 * gereksiz bir dallanmaya zorlardı.
 *
 * BİÇİM TAM OLARAK DAYATILIR: `Number()` başındaki boşluğu, artı işaretini,
 * `0x` ve üstel gösterimi kabul eder — yani aynı satırı birden çok farklı gövde
 * işaret edebilirdi. Denetim kaydında "bu oturum hangi çerezle açıldı"
 * sorusunun tek cevabı olsun diye yalnızca ondalık basamaklar geçerlidir.
 *
 * ESKİ BİÇİMDEKİ GÖVDELER (AuthProvider kimliği taşıyanlar, son kullanması
 * olmayanlar ve sürüm alanından önce yazılmış İKİ PARÇALI olanlar) burada
 * elenir: her biçim değişikliğinde açık oturumlar bir kez giriş ekranına
 * düşer. Geriye dönük uyumluluk BİLEREK YOK — iki parçalı gövdeyi kabul etmek,
 * sürümü olmayan yani iptal edilemeyen çerezlerin yaşamaya devam etmesi
 * demekti, ki bu alanın eklenme sebebi tam olarak odur.
 */
export function oturumGovdesiCoz(
  govde: string,
  simdi: number = Date.now(),
): OturumGovdesi | null {
  const icerik = Buffer.from(govde, "base64url").toString("utf8");

  // Tam üç parça: üçü de ayraç içeremeyeceği için fazladan ya da eksik ayraç
  // taşıyan gövde bozuktur.
  const parcalar = icerik.split(AYRAC);
  if (parcalar.length !== 3) return null;

  const [kimlikMetni, sonKullanmaMetni, surumMetni] = parcalar;

  // Sıfır ve eksi değerler de elenir: `kullanici.id` daima pozitiftir.
  if (!/^[1-9][0-9]*$/.test(kimlikMetni)) return null;
  const kullaniciId = Number(kimlikMetni);
  if (!Number.isSafeInteger(kullaniciId)) return null;

  if (!/^[0-9]+$/.test(sonKullanmaMetni)) return null;
  const sonKullanma = Number(sonKullanmaMetni);
  if (!Number.isSafeInteger(sonKullanma) || simdi >= sonKullanma) return null;

  // Sürüm sıfırdan başlar (hiç sıfırlanmamış hesap), o yüzden kimlikten farklı
  // olarak "0" geçerlidir; eksi ve gevşek biçimler yine elenir.
  if (!/^(0|[1-9][0-9]*)$/.test(surumMetni)) return null;
  const surum = Number(surumMetni);
  if (!Number.isSafeInteger(surum)) return null;

  return { kullaniciId, surum };
}
