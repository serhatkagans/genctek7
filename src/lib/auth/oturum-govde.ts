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
 */

/**
 * Kimlik ile son kullanma anını ayıran karakter.
 *
 * Çözümlemede SON görülen ayraç esas alınır: bir AuthProvider kimliğinin
 * içinde bu karakter geçse bile kimlik bölünmeden geri okunur.
 */
const AYRAC = "|";

export function oturumGovdesiUret(
  authProviderId: string,
  sonKullanma: number,
): string {
  return Buffer.from(
    `${authProviderId}${AYRAC}${sonKullanma}`,
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
 * ESKİ BİÇİM (yalnızca kimlik taşıyan, son kullanmasız gövdeler) ayraç
 * içermediği için geçersiz sayılır — süresiz yaşayan bir jetonu geriye dönük
 * uyumluluk uğruna kabul etmektense mevcut oturumların bir kez düşmesi yeğdir.
 */
export function oturumGovdesiCoz(
  govde: string,
  simdi: number = Date.now(),
): string | null {
  const icerik = Buffer.from(govde, "base64url").toString("utf8");

  const ayracYeri = icerik.lastIndexOf(AYRAC);
  // 0 da geçersiz: ayraçla başlayan gövdenin kimlik kısmı boştur.
  if (ayracYeri <= 0) return null;

  const sonKullanmaMetni = icerik.slice(ayracYeri + AYRAC.length);
  // Number("") sıfırdır ve sıfır "çoktan doldu" demek olurdu; sonuç yine
  // reddetmek olsa da niyet açık kalsın diye boş değer önce eleniyor.
  if (sonKullanmaMetni === "") return null;

  const sonKullanma = Number(sonKullanmaMetni);
  if (!Number.isFinite(sonKullanma) || simdi >= sonKullanma) return null;

  return icerik.slice(0, ayracYeri);
}
