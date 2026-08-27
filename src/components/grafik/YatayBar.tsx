/**
 * YATAY BAR — büyüklük karşılaştırması (15 Ağustos 2026).
 *
 * Manisa farkları turu. Panel bugüne kadar tamamen sayılarla
 * çalışıyordu; "hangi çalışma grubunda kaç etkinlik oldu" sorusu 15 satırlık
 * bir listede okunuyordu ve büyüklükler karşılaştırılamıyordu.
 *
 * ---------------------------------------------------------------------------
 * NEDEN SVG DEĞİL HTML/CSS
 * ---------------------------------------------------------------------------
 * Yatay barın tek zor yanı ETİKETTİR: "Dijital İçerik Üretimi ve Video Montaj"
 * gibi uzun adlar SVG'de metin ölçmeyi gerektirir ve ölçüm yanlışsa etiket
 * kırpılır (dataviz · anti-patterns: "a label clipped by a too-small bar").
 * HTML akışında etiket kendi kendine sarar, sütun genişliği kendiliğinden
 * uyar. Çizgi grafiği SVG çünkü orada koordinat gerekiyor.
 *
 * ---------------------------------------------------------------------------
 * TEK SERİ, TEK RENK
 * ---------------------------------------------------------------------------
 * Her bar bir kategori ama bunlar AYRI SERİ DEĞİL: kategori başına tek sayı
 * var. Her bara ayrı renk vermek (gökkuşağı barlar) rengi konuma ek olarak
 * ikinci kez harcamak olurdu — kategoriyi zaten etiket söylüyor. Renk, temanın
 * vurgu rengi; iki temada da (kırmızı #c4161c, mavi #2f6fb5) beyaz kart
 * yüzeyine karşı 3:1 üstü kontrastla doğrulandı.
 *
 * KOYU MOD YOK: uygulama `color-scheme: light` ve iki teması da açık
 * (bkz. globals.css). Koyu mod eklenirse buradaki tek iş, vurgu renginin o
 * yüzeye göre yeniden basamaklanması.
 */

export interface BarSatiri {
  etiket: string;
  deger: number;
  /** İsteğe bağlı ikinci satır: "12 okul · 3 ilçe" gibi bağlam. */
  altBilgi?: string;
}

/** Barın kalınlığı — dataviz kuralı: en fazla 24px, kalanı hava. */
const BAR_KALINLIGI = "0.875rem";

export function YatayBar({
  baslik,
  aciklama,
  satirlar,
  birim = "",
}: {
  /** Grafiğin adı. Tek seri olduğu için LEJANT YOK; seriyi başlık adlandırır. */
  baslik: string;
  aciklama?: string;
  satirlar: readonly BarSatiri[];
  /** Değerin yanına yazılan birim ("etkinlik" gibi). */
  birim?: string;
}) {
  if (satirlar.length === 0) return null;

  /*
   * ÖLÇEK EN BÜYÜK DEĞERE GÖRE, toplama göre değil: sorulan şey pay değil
   * karşılaştırma. Sıfıra bölme koruması, hepsi sıfırken bar çizilmemesi için.
   */
  const enBuyuk = Math.max(...satirlar.map((satir) => satir.deger), 0);

  return (
    <figure className="m-0">
      <figcaption className="mb-4">
        <h3 className="text-base font-semibold text-baslik">{baslik}</h3>
        {aciklama && (
          <p className="mt-1 text-sm text-metin-yumusak">{aciklama}</p>
        )}
      </figcaption>

      {/*
        SAYILAR HEM GRAFİKTE HEM METİNDE: her satırın değeri barın yanında
        yazılı olduğu için ayrı bir tablo görünümüne gerek yok — grafik zaten
        okunabilir bir listedir. Ekran okuyucu da bu metni okur.

        DOĞRUDAN ETİKET VAR, IZGARA ÇİZGİSİ YOK: dataviz sırası "önce doğrudan
        etiket, sonra ızgara". Değer barın yanında yazılıyken ızgara çizgisi
        aynı bilgiyi ikinci kez, daha zayıf biçimde verirdi.
      */}
      <dl className="space-y-3">
        {satirlar.map((satir) => {
          const oran = enBuyuk > 0 ? (satir.deger / enBuyuk) * 100 : 0;

          return (
            <div
              key={satir.etiket}
              className="grid grid-cols-[minmax(6rem,11rem)_1fr_auto] items-center gap-3"
            >
              <dt className="text-sm text-metin">
                {satir.etiket}
                {satir.altBilgi && (
                  <span className="block text-xs text-metin-yumusak">
                    {satir.altBilgi}
                  </span>
                )}
              </dt>

              {/*
                Ray (track) yüzeyden bir adım açık; bar onun üstünde. Barın
                veri ucu 4px yuvarlatılmış, taban ucu KÖŞELİ — dataviz mark
                kuralı: bar tek bir tabandan büyür.

                `aria-hidden`: sayı zaten dd içinde okunuyor, bar süs değil ama
                ekran okuyucuya ikinci kez söylenmesine gerek yok.
              */}
              <div
                aria-hidden
                className="rounded-full bg-zemin"
                style={{ height: BAR_KALINLIGI }}
              >
                <div
                  className="h-full rounded-r-[4px] bg-[var(--renk-vurgu)]"
                  style={{ width: `${Math.max(oran, satir.deger > 0 ? 2 : 0)}%` }}
                  title={`${satir.etiket}: ${satir.deger}`}
                />
              </div>

              {/*
                DEĞER METİN BELİRTECİYLE, seri rengiyle DEĞİL (dataviz kuralı:
                "text never wears the data color"). Yanındaki bar kimliği
                zaten taşıyor.

                `tabular-nums`: sayılar alt alta hizalanıyor.
              */}
              <dd className="text-sm font-medium tabular-nums text-metin">
                {satir.deger}
                {birim && (
                  <span className="ml-1 font-normal text-metin-yumusak">
                    {birim}
                  </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </figure>
  );
}
