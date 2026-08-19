import { appendFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { type HataKaydi, KIMLIKSIZ, sorgusuzYol } from "./hata-kurallar";
import { ortam } from "./ortam";

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

/** Günlük dosyalarının durduğu dizin. */
export function hataGunlukDizini(): string {
  return resolve(process.cwd(), ortam.DEPOLAMA_YEREL_DIZIN, "hata-gunlugu");
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
  } catch (hata) {
    console.error("Hata günlüğüne yazılamadı", hata);
  }
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
  istek?: { path?: string; method?: string },
): HataKaydi {
  const nesne: Error & { digest?: unknown } =
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
    mesaj: nesne.message,
    yiginIzi: nesne.stack ?? null,
  };
}
