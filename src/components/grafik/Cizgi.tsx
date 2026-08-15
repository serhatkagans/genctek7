/**
 * ÇİZGİ — zaman içindeki değişim (15 Ağustos 2026 · Aşama 7).
 *
 * Merkezin asıl sorusu genelde "geçen yıla göre ne oldu" ve veri bunu vermeye
 * hazırdı (`kirilim-istatistigi.ts` yıl süzgeci alıyor); eksik olan yalnızca
 * gösterimdi.
 *
 * ---------------------------------------------------------------------------
 * TEK NOKTA GRAFİK DEĞİLDİR
 * ---------------------------------------------------------------------------
 * Sistem yeni; ilk dönemlerde elde bir ya da iki yıl var. Tek noktalı bir
 * çizgi grafiği "eğilim" iddiası taşır ama eğilim yoktur — dataviz kuralı da
 * bunu söylüyor ("a single current value → stat tile, not a one-bar chart").
 * Bu yüzden iki noktadan azında bileşen `null` döner ve çağıran ekran sayıyı
 * kendi biçiminde gösterir.
 *
 * ---------------------------------------------------------------------------
 * ETKİLEŞİM: SVG `<title>`, JavaScript DEĞİL
 * ---------------------------------------------------------------------------
 * Panel sunucu bileşenleriyle çalışıyor. Fare üstüne gelince değer göstermek
 * için `<title>` kullanılıyor — tarayıcının kendi ipucu. Tam bir imleç+ipucu
 * katmanı istemci bileşeni gerektirirdi ve dört küçük grafik için ekranın
 * tamamını istemciye taşımak doğru takas değil. Değerler ayrıca aşağıdaki
 * tabloda yazılı, yani bilgi fareye bağlı değil.
 */

export interface CizgiNoktasi {
  etiket: string;
  deger: number;
}

/* Çizim kutusu — viewBox birimleri; SVG genişliği kapsayıcıya uyar. */
const GENISLIK = 720;
const YUKSEKLIK = 220;
const BOSLUK = { ust: 22, sag: 20, alt: 34, sol: 44 };

export function Cizgi({
  baslik,
  aciklama,
  noktalar,
  birim = "",
}: {
  baslik: string;
  aciklama?: string;
  noktalar: readonly CizgiNoktasi[];
  birim?: string;
}) {
  // Tek nokta eğilim değildir; iki noktadan azında grafik çizilmez.
  if (noktalar.length < 2) return null;

  const cizimGenisligi = GENISLIK - BOSLUK.sol - BOSLUK.sag;
  const cizimYuksekligi = YUKSEKLIK - BOSLUK.ust - BOSLUK.alt;

  /*
   * ÖLÇEK SIFIRDAN BAŞLAR. Çizgi grafiğinde tabanı veriye göre kırpmak
   * (örn. 40'tan başlatmak) küçük farkları uçurum gibi gösterir; sayım
   * verisinde sıfır anlamlı bir taban.
   */
  const enBuyuk = Math.max(...noktalar.map((n) => n.deger), 1);
  const x = (sira: number) =>
    BOSLUK.sol + (sira / (noktalar.length - 1)) * cizimGenisligi;
  const y = (deger: number) =>
    BOSLUK.ust + cizimYuksekligi - (deger / enBuyuk) * cizimYuksekligi;

  const yol = noktalar
    .map((nokta, sira) => `${sira === 0 ? "M" : "L"} ${x(sira)} ${y(nokta.deger)}`)
    .join(" ");

  /* Üç yatay ızgara çizgisi: 0, orta, tepe. Daha fazlası gürültü. */
  const izgaraDegerleri = [0, enBuyuk / 2, enBuyuk];

  return (
    <figure className="m-0">
      <figcaption className="mb-4">
        <h3 className="text-base font-semibold text-baslik">{baslik}</h3>
        {aciklama && (
          <p className="mt-1 text-sm text-metin-yumusak">{aciklama}</p>
        )}
      </figcaption>

      <svg
        viewBox={`0 0 ${GENISLIK} ${YUKSEKLIK}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${baslik}. Değerler aşağıdaki tabloda da yazılı.`}
      >
        {/*
          IZGARA: düz, saç teli (1px), yüzeyden bir adım gri — kesik çizgi
          DEĞİL. Kesik ızgara "eşik/tahmin" diye okunur (dataviz anti-pattern).
        */}
        {izgaraDegerleri.map((deger) => (
          <g key={deger}>
            <line
              x1={BOSLUK.sol}
              x2={GENISLIK - BOSLUK.sag}
              y1={y(deger)}
              y2={y(deger)}
              stroke="var(--renk-cizgi)"
              strokeWidth={1}
            />
            <text
              x={BOSLUK.sol - 8}
              y={y(deger) + 4}
              textAnchor="end"
              className="fill-[var(--renk-metin-yumusak)] text-[11px] tabular-nums"
            >
              {Math.round(deger)}
            </text>
          </g>
        ))}

        {/* Çizgi: 2px, yuvarlak birleşim ve uç. */}
        <path
          d={yol}
          fill="none"
          stroke="var(--renk-vurgu)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {noktalar.map((nokta, sira) => (
          <g key={nokta.etiket}>
            {/*
              İŞARETÇİ r=4 (8px çap) ve 2px YÜZEY HALKASI: halka, nokta
              çizgiyle kesiştiği yerde onu okunur tutuyor ve fare hedefini
              büyütüyor.
            */}
            <circle
              cx={x(sira)}
              cy={y(nokta.deger)}
              r={4}
              fill="var(--renk-vurgu)"
              stroke="var(--renk-kart)"
              strokeWidth={2}
            >
              <title>{`${nokta.etiket}: ${nokta.deger} ${birim}`.trim()}</title>
            </circle>

            {/*
              UÇ ETİKETLER İÇERİ YASLANIR. Hepsi ortalanınca ilk etiket sol
              kenardan, SON ETİKET SAĞ KENARDAN TAŞIYOR ve kırpılıyordu —
              ekran görüntüsüne bakınca görüldü (dataviz · "render it and look
              at it"; anti-pattern: kırpılan etiket). Uçlarda hizayı çevirmek,
              boşluğu etiket uzunluğuna göre büyütmekten sağlam: "2025-2026"
              ile "2026-2027" farklı genişlikte olsaydı bile taşmazlar.
            */}
            <text
              x={x(sira)}
              y={YUKSEKLIK - 10}
              textAnchor={
                sira === 0
                  ? "start"
                  : sira === noktalar.length - 1
                    ? "end"
                    : "middle"
              }
              className="fill-[var(--renk-metin-yumusak)] text-[11px]"
            >
              {nokta.etiket}
            </text>
          </g>
        ))}

        {/*
          SEÇİCİ DOĞRUDAN ETİKET: yalnızca SON noktanın değeri yazılıyor.
          Her noktaya sayı basmak dataviz anti-pattern'i ("a number on every
          data point"); son değer ise okuyucunun aradığı "şu an nerede"dir.
        */}
        <text
          x={x(noktalar.length - 1)}
          y={Math.max(y(noktalar[noktalar.length - 1].deger) - 12, 12)}
          textAnchor="end"
          className="fill-[var(--renk-metin)] text-[12px] font-medium tabular-nums"
        >
          {noktalar[noktalar.length - 1].deger}
        </text>
      </svg>

      {/*
        TABLO GÖRÜNÜMÜ: değerler yalnızca grafikte kalmıyor. Fare olmayan
        cihazda, ekran okuyucuda ve yazdırılınca da okunabilir olmalı.
      */}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-metin-yumusak">
          Sayıları tablo olarak göster
        </summary>
        <table className="mt-2 w-full text-left text-sm">
          <tbody>
            {noktalar.map((nokta) => (
              <tr key={nokta.etiket} className="border-b border-cizgi">
                <th scope="row" className="py-1.5 pr-4 font-normal text-metin">
                  {nokta.etiket}
                </th>
                <td className="py-1.5 tabular-nums text-metin">
                  {nokta.deger}
                  {birim && (
                    <span className="ml-1 text-metin-yumusak">{birim}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
