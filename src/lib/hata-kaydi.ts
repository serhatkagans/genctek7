import { appendFile, mkdir } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import {
  type HataKaydi,
  type HataKaynagi,
  KIMLIKSIZ,
  sorgusuzYol,
} from "./hata-kurallar";
import { ortam } from "./ortam";
import { uygulamaKoku } from "./uygulama-koku";

/**
 * Beklenmeyen hataların sunucu tarafındaki kaydı (12 Ağustos 2026).
 *
 * İSTEK: "bana bir de hata kimliğinin listesini çıkar ki neden hata olduğunu,
 * ne hata olduğunu bileyim."
 *
 * ---------------------------------------------------------------------------
 * HATA KİMLİĞİ NEDİR
 * ---------------------------------------------------------------------------
 * Kullanıcıya gösterilen "Hata kimliği: 598556021" değeri Next.js'in `digest`
 * alanıdır: hatanın MESAJINDAN türetilen bir özet. Kullanıcıya teknik ayrıntı
 * göstermemek için var (yığın izi ve sorgu metni kişisel veri sızdırabilir) ama
 * tek başına hiçbir yerde SAKLANMIYORDU — yalnızca sunucunun o anki terminal
 * çıktısına düşüyordu. Terminal kapandığında kimlik anlamsız bir sayıya
 * dönüşüyor, kullanıcı da elindeki numarayla kimseye bir şey anlatamıyordu.
 *
 * Bu dosya o kimliği kalıcı bir satıra bağlar: hangi adres, hangi hata, ne
 * zaman.
 *
 * ---------------------------------------------------------------------------
 * NE YAZILIR, NE YAZILMAZ
 * ---------------------------------------------------------------------------
 * YAZILIR: kimlik, zaman, istek yolu ve yöntemi, hata adı ve mesajı, yığın izi.
 * YAZILMAZ: form içerikleri, sorgu dizesi, oturum çerezi, kullanıcı adı.
 *
 * SORGU DİZESİ BİR YERDE KESİLİYOR ve o yer `hataKaydiHazirla`: Next.js'in
 * verdiği `path` ham istek adresidir, yani sorguyu da taşır ve bu söz 19
 * Ağustos 2026'ya kadar tutmuyordu (gerekçesi ve bulgunun ayrıntısı:
 * hata-kurallar.ts · sorgusuzYol). Yeni bir çağıran eklenirse yolu kendi
 * kırpmamalı, o işlevden geçirmeli.
 *
 * Hata günlüğü bir olay kaydıdır, ikinci bir kişisel veri deposu değil — KVKK
 * saklama işi (scripts/veri-saklama.ts) erişim kayıtlarını temizliyor, buraya
 * kişisel veri yazılsaydı o temizliğin dışında kalırdı.
 *
 * Dosya AYA GÖRE bölünür (`hata-2026-08.jsonl`): tek dosya yıl sonunda
 * açılamaz hâle gelir, günlük bölme ise arama yaparken onlarca dosya demek.
 *
 * JSONL seçildi çünkü ekleme (append) atomiktir ve dosya bozulmadan büyür;
 * JSON dizisi olsaydı her yazma dosyanın tamamını okuyup yeniden yazmayı
 * gerektirir ve eşzamanlı iki hata birbirinin kaydını silerdi.
 */

/*
 * KAYIT ŞEKLİ ARTIK `hata-kurallar.ts`'te (18 Ağustos 2026 · hata kayıtları
 * ekranı). Aynı şekli hem yazan hem okuyan taraf kullanıyor ve okuma katmanı
 * bu dosyaya bağlanamıyor: buradaki `ortam` içe aktarması ortam değişkenlerini
 * doğruluyor, oysa çözümleme kurallarının birim testi DATABASE_URL olmadan
 * çalışmalı. Ad burada YENİDEN DIŞA VERİLİYOR ki mevcut çağıranlar
 * (scripts/hata-ara.ts) olduğu gibi çalışmaya devam etsin.
 */
export type { HataKaydi } from "./hata-kurallar";

/**
 * Günlük dosyalarının durduğu dizin.
 *
 * Göreli ayar CWD'ye göre çözülmez; gerekçesi `lib/uygulama-koku.ts` içinde.
 */
export function hataGunlukDizini(): string {
  const ayar = ortam.DEPOLAMA_YEREL_DIZIN;
  return isAbsolute(ayar)
    ? resolve(ayar, "hata-gunlugu")
    : resolve(uygulamaKoku(), ayar, "hata-gunlugu");
}

/** Bir zaman için dosya adı — aya göre bölünür. */
export function hataGunlukDosyasi(zaman: Date = new Date()): string {
  const ay = `${zaman.getFullYear()}-${String(zaman.getMonth() + 1).padStart(2, "0")}`;
  return join(hataGunlukDizini(), `hata-${ay}.jsonl`);
}

/**
 * Hatayı günlüğe ekler.
 *
 * ASLA FIRLATMAZ: günlüğe yazamamak, kullanıcının gördüğü hatanın üstüne ikinci
 * bir hata koymamalı. Yazma başarısız olursa konsola düşer ve orada kalır.
 */
export async function hataKaydet(kayit: HataKaydi): Promise<void> {
  try {
    await mkdir(hataGunlukDizini(), { recursive: true });
    await appendFile(
      hataGunlukDosyasi(new Date(kayit.zaman)),
      `${JSON.stringify(kayit)}\n`,
      "utf8",
    );
    sonYazmaHatasi = null;
  } catch (hata) {
    console.error("Hata günlüğüne yazılamadı", hata);
    sonYazmaHatasi = {
      zaman: new Date().toISOString(),
      mesaj: hata instanceof Error ? hata.message : String(hata),
    };
  }
}

/**
 * Son BAŞARISIZ yazma — yalnızca hata kayıtları ekranında gösterilmek için.
 *
 * NİYE VAR: yazamamak sessiz bir arıza. `hataKaydet` fırlatmıyor (fırlatmamalı
 * da: asıl hatanın üstüne ikinci bir hata koyardı), kayıt konsola düşüyor ve
 * ekrana bakan yönetici boş liste görüp "hiç hata olmamış" sanıyordu — oysa
 * hatalar oluyor, yazılamıyordu. İzin/yol sorununun tek görünür işareti bu.
 *
 * SÜREÇ BELLEĞİNDE: kalıcı olması, kayıt tutamayan bir sistemde ikinci bir
 * dosyaya yazmayı gerektirirdi. Servis yeniden başlarsa değer sıfırlanır;
 * sorun sürüyorsa ilk hatada yeniden dolar.
 */
let sonYazmaHatasi: { zaman: string; mesaj: string } | null = null;

export function sonGunlukYazmaHatasi(): { zaman: string; mesaj: string } | null {
  return sonYazmaHatasi;
}

/**
 * Hata nesnesinden kayıt satırı üretir.
 *
 * Kimliği olmayan hata da yazılır (`digest` yalnızca sunucu bileşenlerinde
 * üretiliyor): kimliksiz satır, kullanıcının elindeki numarayla eşleşmez ama
 * "o saatte ne oldu" sorusunu yine cevaplar.
 */
export function hataKaydiHazirla(
  hata: unknown,
  istek?: { path?: string; method?: string; kaynak?: HataKaynagi },
): HataKaydi {
  const nesne: Error & { digest?: unknown; code?: unknown; errno?: unknown } =
    hata instanceof Error ? hata : new Error(String(hata));
  // `digest` standart Error alanı değil; Next.js sunucu hatalarına ekliyor.
  const kimlik = typeof nesne.digest === "string" ? nesne.digest : KIMLIKSIZ;

  return {
    kimlik,
    zaman: new Date().toISOString(),
    // Sorgu dizesi burada düşer; gerekçe dosya başında ve `sorgusuzYol`da.
    yol: sorgusuzYol(istek?.path),
    yontem: istek?.method ?? null,
    ad: nesne.name,
    mesaj: mesajVeNeden(nesne),
    yiginIzi: nesne.stack ?? null,
    // Çağıran söylemezse sunucu: bu işlevin ilk ve uzun süre tek çağıranı
    // `instrumentation.ts` idi (bkz. hata-kurallar.ts · HataKaydi.kaynak).
    kaynak: istek?.kaynak ?? "sunucu",
    kod: hataKodu(nesne),
  };
}

/**
 * Hatanın makine okunur nedeni: Prisma'nın `code` alanı ya da Node'un `errno`
 * adı. Gerekçesi: hata-kurallar.ts · HataKaydi.kod.
 *
 * Sayı da kabul ediliyor (`errno` bazı platformlarda sayıdır) ve metne
 * çevriliyor; günlük satırı tek bir biçim taşımalı.
 */
function hataKodu(nesne: { code?: unknown; errno?: unknown }): string | null {
  for (const deger of [nesne.code, nesne.errno]) {
    if (typeof deger === "string" && deger.trim()) return deger.trim();
    if (typeof deger === "number") return String(deger);
  }
  return null;
}

/**
 * Mesajın sonuna, varsa ALTTAKİ NEDENİ ekler (`Error.cause`).
 *
 * NİYE: sarmalanmış hatalarda üstteki mesaj çoğu zaman genel bir cümle
 * ("İşlem tamamlanamadı") ve asıl bilgi `cause` içinde kalıyor; günlüğe
 * yalnızca üst mesaj yazıldığında kayıt hiçbir şey anlatmıyordu.
 *
 * TEK KADEME İNİLİYOR: zincir uzunsa kalanını yığın izi taşıyor, mesajı
 * sınırsız büyütmenin anlamı yok. Gruplama mesajın İLK anlamlı satırına
 * baktığı için ek satır grupları bölmez (bkz. hata-kurallar.ts · ilkAnlamliSatir).
 */
function mesajVeNeden(nesne: Error): string {
  const neden = (nesne as { cause?: unknown }).cause;
  if (!(neden instanceof Error) || !neden.message) return nesne.message;
  return `${nesne.message}\n\nAlttaki neden: ${neden.name}: ${neden.message}`;
}
