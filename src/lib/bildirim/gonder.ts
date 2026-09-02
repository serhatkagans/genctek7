import type {
  BildirimHedefTipi,
  GonderimKanali,
} from "@/generated/prisma/enums";
import { prisma } from "../db";

/**
 * Bildirimler — references/domain-rules.md Bölüm 9.
 *
 * Şablonlar koda gömülmez, bildirim_sablonu tablosunda tutulur ve Yönetim
 * ekranından düzenlenir. Bildirim her zaman panele yazılır; kişinin e-posta
 * adresi ya da telefonu varsa ve o kanal açıksa birer kopya da gönderilir
 * (bkz. eposta-kopyasi.ts, sms-kopyasi.ts). Panel her zaman kaynaktır;
 * kopyaların gitmemesi bildirimi geçersiz kılmaz.
 */

import { epostaKopyasiGonder } from "./eposta-kopyasi";
import { BILDIRIM_KODLARI, type BildirimKodu, sablonuDoldur } from "./sablon";
import { smsKopyasiGonder } from "./sms-kopyasi";

export { BILDIRIM_KODLARI, sablonuDoldur };
export type { BildirimKodu };

/**
 * Bildirimin gidilecek kaydı — panelde "Etkinliğe git" düğmesine dönüşür.
 *
 * İSTEĞE BAĞLI: hedefi olmayan bildirim (danışman değişikliği, toplu duyuru)
 * olağandır. Verildiğinde bildirimle birlikte YAZILIR; okuma tarafında metinden
 * çıkarılmaya çalışılmaz (bkz. migration 20260810130000_bildirim_hedefi).
 */
export interface BildirimHedefi {
  tip: BildirimHedefTipi;
  id: number;
}

export interface BildirimIstegi {
  kullaniciId: number;
  kod: BildirimKodu;
  degiskenler?: Record<string, string>;
  kanal?: GonderimKanali;
  hedef?: BildirimHedefi;
}

export async function bildirimGonder(istek: BildirimIstegi): Promise<void> {
  const sablon = await prisma.bildirimSablonu.findUnique({
    where: { kod: istek.kod },
  });

  if (!sablon || !sablon.aktif) {
    // Şablonu olmayan bildirim sessizce yutulmaz; iş akışını da kesmemesi için
    // uyarı olarak kaydedilir.
    console.warn(`Bildirim şablonu bulunamadı veya pasif: ${istek.kod}`);
    return;
  }

  const degiskenler = istek.degiskenler ?? {};
  const baslik = sablonuDoldur(sablon.konu, degiskenler);
  const icerik = sablonuDoldur(sablon.govdeSablonu, degiskenler);

  /*
   * Aynı uyarı okunmadan tekrar düşmez.
   *
   * Bazı bildirimler duruma bakan akışlardan doğar: danışmanı atanamayan bir
   * öğrenci her giriş yaptığında ilk atama yeniden denenir ve proje
   * yöneticisine yine "atanamadı" uyarısı çıkar. Kayıt bazında engellemezsek
   * panel aynı satırın onlarca kopyasıyla dolar ve gerçekten yeni olan uyarı
   * görünmez olur. Karşılaştırma içerik üzerinden yapılır: uyarı başka bir
   * öğrenci için ise metni farklı olacağı için ayrı kayıt açılır.
   */
  const okunmamisAyni = await prisma.bildirim.findFirst({
    where: {
      kullaniciId: istek.kullaniciId,
      tip: istek.kod,
      okunduMu: false,
      baslik,
      icerik,
    },
    select: { id: true },
  });

  if (okunmamisAyni) return;

  const bildirim = await prisma.bildirim.create({
    data: {
      kullaniciId: istek.kullaniciId,
      tip: istek.kod,
      baslik,
      icerik,
      hedefTip: istek.hedef?.tip ?? null,
      hedefId: istek.hedef?.id ?? null,
      gonderimKanali: istek.kanal ?? "SISTEM",
    },
    select: { id: true },
  });

  /*
   * E-posta kopyası bildirimden SONRA ve onu bekletmeden gönderilir. Kopyanın
   * gitmemesi bildirimi geçersiz kılmaz; panel her zaman kaynaktır.
   */
  await epostaKopyasiGonder({
    bildirimId: bildirim.id,
    kullaniciId: istek.kullaniciId,
    baslik,
    icerik,
  });

  /*
   * SMS kopyası e-postadan BAĞIMSIZ gönderilir; ikisinden birinin düşmesi
   * öbürünü engellemez. İkisi de kapalıysa (varsayılan durum SMS için budur)
   * fonksiyonlar hiçbir şey yapmadan döner.
   */
  await smsKopyasiGonder({
    bildirimId: bildirim.id,
    kullaniciId: istek.kullaniciId,
    baslik,
    icerik,
  });
}

/** Proje yöneticilerinin tamamına bildirim düşürür (onay, uyarı akışları). */
export async function projeYoneticilerineBildir(
  kod: BildirimKodu,
  degiskenler: Record<string, string> = {},
  hedef?: BildirimHedefi,
): Promise<number> {
  const yoneticiler = await prisma.kullaniciRol.findMany({
    where: { rolKodu: "PROJE_YONETICISI", bitisTarihi: null },
    select: { kullaniciId: true },
  });

  for (const yonetici of yoneticiler) {
    await bildirimGonder({
      kullaniciId: yonetici.kullaniciId,
      kod,
      degiskenler,
      hedef,
    });
  }

  return yoneticiler.length;
}

/**
 * Bir ilin koordinatörüne bildirim düşürür.
 *
 * Aktif koordinatörü olmayan il sessizce atlanır ve bu bir hata DEĞİLDİR:
 * koordinatörü boş iller olağan bir durumdur (bkz. rol envanteri ekranı) ve
 * bildirimin sahibi bulunamadı diye iş akışı kesilmemeli. Aynı bildirimin
 * merkeze giden kopyası zaten `projeYoneticilerineBildir` ile ayrıca
 * gönderiliyor, yani uyarı hiçbir koşulda kaybolmuyor.
 *
 * Dönüş değeri, çağıranın "koordinatöre de ulaştı mı" bilgisini ekranda
 * gösterebilmesi içindir.
 */
export async function ilKoordinatorlerineBildir(
  ilKodu: string | null,
  kod: BildirimKodu,
  degiskenler: Record<string, string> = {},
  hedef?: BildirimHedefi,
): Promise<number> {
  if (!ilKodu) return 0;

  const koordinatorler = await prisma.kullaniciRol.findMany({
    where: { rolKodu: "IL_KOORDINATOR", ilKodu, bitisTarihi: null },
    select: { kullaniciId: true },
  });

  for (const koordinator of koordinatorler) {
    await bildirimGonder({
      kullaniciId: koordinator.kullaniciId,
      kod,
      degiskenler,
      hedef,
    });
  }

  return koordinatorler.length;
}

/**
 * Toplu duyuru — merkezin tüm öğrencilere ve/veya öğretmenlere gönderdiği
 * serbest metinli bildirim.
 *
 * `bildirimGonder` DÖNGÜYLE ÇAĞRILMAZ: o fonksiyon kişi başına şablon okuma,
 * yinelenme kontrolü ve kayıt açma yapıyor; binlerce alıcıda bu binlerce sorgu
 * demek. Burada şablon bir kez okunur, kayıtlar tek `createMany` ile yazılır.
 *
 * E-POSTA KOPYASI AYRI DÖNGÜDEDİR ve yavaştır (kişi başına en az iki sorgu +
 * SMTP turu). Alıcı sayısı büyüdüğünde bu adım isteği zorlar; o noktada
 * kuyruğa taşınmalıdır. Şu anki kullanıcı sayısında (onlarca) sorun değil.
 */
export async function topluDuyuruGonder(istek: {
  aliciIdleri: number[];
  baslik: string;
  icerik: string;
}): Promise<{ bildirimSayisi: number }> {
  if (istek.aliciIdleri.length === 0) return { bildirimSayisi: 0 };

  const sablon = await prisma.bildirimSablonu.findUnique({
    where: { kod: BILDIRIM_KODLARI.TOPLU_DUYURU },
  });
  if (!sablon || !sablon.aktif) {
    console.warn("Toplu duyuru şablonu bulunamadı veya pasif.");
    return { bildirimSayisi: 0 };
  }

  const degiskenler = { baslik: istek.baslik, icerik: istek.icerik };
  const baslik = sablonuDoldur(sablon.konu, degiskenler);
  const icerik = sablonuDoldur(sablon.govdeSablonu, degiskenler);

  const sonuc = await prisma.bildirim.createMany({
    data: istek.aliciIdleri.map((kullaniciId) => ({
      kullaniciId,
      tip: BILDIRIM_KODLARI.TOPLU_DUYURU,
      baslik,
      icerik,
      gonderimKanali: "SISTEM" as const,
    })),
  });

  /*
   * E-posta kopyası için bildirim kimlikleri gerekiyor; createMany onları
   * döndürmediği için yeni yazılanlar geri okunuyor. Okunmamış ve bu başlıkla
   * eşleşenler alınıyor — aynı duyuru iki kez gönderilirse ikinci turda
   * yalnızca kendi kayıtları eşleşsin diye tarih sınırı da konuyor.
   */
  const yeniler = await prisma.bildirim.findMany({
    where: {
      tip: BILDIRIM_KODLARI.TOPLU_DUYURU,
      baslik,
      kullaniciId: { in: istek.aliciIdleri },
      okunduMu: false,
    },
    orderBy: { olusturmaTarihi: "desc" },
    take: istek.aliciIdleri.length,
    select: { id: true, kullaniciId: true },
  });

  for (const bildirim of yeniler) {
    await epostaKopyasiGonder({
      bildirimId: bildirim.id,
      kullaniciId: bildirim.kullaniciId,
      baslik,
      icerik,
    });
  }

  return { bildirimSayisi: sonuc.count };
}
