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

export function oturumGovdesiUret(
  kullaniciId: number,
  sonKullanma: number,
): string {
  return Buffer.from(
    `${kullaniciId}${AYRAC}${sonKullanma}`,
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
 * ESKİ BİÇİMDEKİ GÖVDELER (AuthProvider kimliği taşıyanlar ve son kullanması
 * olmayanlar) sayı olmadıkları için burada elenir: bu sürüm yayına alındığında
 * açık oturumlar bir kez giriş ekranına düşer.
 */
export function oturumGovdesiCoz(
  govde: string,
  simdi: number = Date.now(),
): number | null {
  const icerik = Buffer.from(govde, "base64url").toString("utf8");

  // Tam iki parça: kimlik de son kullanma da ayraç içeremeyeceği için
  // fazladan ayraç taşıyan gövde bozuktur.
  const parcalar = icerik.split(AYRAC);
  if (parcalar.length !== 2) return null;

  const [kimlikMetni, sonKullanmaMetni] = parcalar;

  // Sıfır ve eksi değerler de elenir: `kullanici.id` daima pozitiftir.
  if (!/^[1-9][0-9]*$/.test(kimlikMetni)) return null;
  const kullaniciId = Number(kimlikMetni);
  if (!Number.isSafeInteger(kullaniciId)) return null;

  if (!/^[0-9]+$/.test(sonKullanmaMetni)) return null;
  const sonKullanma = Number(sonKullanmaMetni);
  if (!Number.isSafeInteger(sonKullanma) || simdi >= sonKullanma) return null;

  return kullaniciId;
}
