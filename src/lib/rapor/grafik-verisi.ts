import { egitimOgretimYili } from "../ogretmen/gorev-yillari";

/**
 * Grafiklerin veri hazırlığı (15 Ağustos 2026 · Aşama 7).
 *
 * Bu dosya veritabanına BAKMAZ; ham kayıtları alıp grafik bileşenlerinin
 * beklediği biçime çevirir ve birim testle doğrulanır. Aynı ayrım
 * `kirilim-istatistigi.ts` ve `etkinlik-dokumu.ts` içinde de var.
 */

export interface GrafikKaydi {
  etiket: string;
  deger: number;
}

/**
 * Bir listeyi büyükten küçüğe sıralayıp ilk N'e indirir; kalanları toplar.
 *
 * ============================================================================
 * NEDEN "DİĞER" SATIRI VAR
 * ============================================================================
 * dataviz kuralı: anlam taşıyan yedi sınıftan fazlası grafikte değil tabloda
 * okunur — komşu sınıflar birbirine karışır. Ama fazlalıkları SESSİZCE ATMAK,
 * grafiği toplamı tutmayan bir görüntüye çevirirdi: 40 çalışma grubunun ilk
 * 8'ini gösteren bir grafiğe bakan kişi, gördüğü barların toplamının sistemdeki
 * etkinlik sayısı olduğunu sanır. "Diğer" satırı hem sınırı hem eksiği görünür
 * tutuyor.
 *
 * SIFIR DEĞERLİ SATIRLAR DÜŞER: "hiç etkinlik yapılmamış grup" bir büyüklük
 * karşılaştırmasına katkı vermiyor ve uzun bir sıfır kuyruğu grafiği okunmaz
 * yapardı. O soru ("hangi grupta hiç etkinlik yok") ayrı bir sorudur ve
 * cevabı listenin kendisindedir.
 */
export function enBuyukler(
  kayitlar: readonly GrafikKaydi[],
  sinir: number,
  digerEtiketi = "Diğer",
): GrafikKaydi[] {
  const dolu = kayitlar.filter((kayit) => kayit.deger > 0);
  const sirali = [...dolu].sort(
    (a, b) => b.deger - a.deger || a.etiket.localeCompare(b.etiket, "tr"),
  );

  if (sirali.length <= sinir) return sirali;

  const ilkler = sirali.slice(0, sinir);
  const kalanToplam = sirali
    .slice(sinir)
    .reduce((toplam, kayit) => toplam + kayit.deger, 0);

  return [
    ...ilkler,
    { etiket: `${digerEtiketi} (${sirali.length - sinir})`, deger: kalanToplam },
  ];
}

/**
 * Tarihleri eğitim-öğretim yılına göre sayar ve yıl sırasına dizer.
 *
 * BOŞ YILLAR ATLANMAZ, DOLDURULUR: 2024-2025 ve 2026-2027 dolu ama arada
 * 2025-2026 boşsa, o yıl sıfır değeriyle çizilir. Atlansaydı çizgi iki dolu
 * yılı doğrudan birleştirir ve aradaki çöküş hiç yaşanmamış gibi görünürdü —
 * zaman ekseninde en kolay yapılan yanıltma bu.
 */
export function yillaraGoreSay(tarihler: readonly Date[]): GrafikKaydi[] {
  if (tarihler.length === 0) return [];

  const sayim = new Map<string, number>();
  for (const tarih of tarihler) {
    const yil = egitimOgretimYili(tarih);
    sayim.set(yil, (sayim.get(yil) ?? 0) + 1);
  }

  const yillar = [...sayim.keys()].sort();
  const ilk = Number.parseInt(yillar[0].slice(0, 4), 10);
  const son = Number.parseInt(yillar[yillar.length - 1].slice(0, 4), 10);

  const tam: GrafikKaydi[] = [];
  for (let baslangic = ilk; baslangic <= son; baslangic += 1) {
    const yil = `${baslangic}-${baslangic + 1}`;
    tam.push({ etiket: yil, deger: sayim.get(yil) ?? 0 });
  }

  return tam;
}
