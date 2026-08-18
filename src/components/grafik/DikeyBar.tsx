/**
 * DİKEY BAR — zaman içindeki kesikli dönemler (18 Ağustos 2026).
 *
 * `sablon/Ekran görüntüsü …191237.png`'deki "Günlük başvuru sayısı" grafiğinin
 * karşılığı (istek: "raporlama kısmında görsel olarak zayıf, görsellerdeki
 * gibi zenginleştir").
 *
 * ---------------------------------------------------------------------------
 * YatayBar VARKEN NEDEN İKİNCİ BİR BAR
 * ---------------------------------------------------------------------------
 * İkisi farklı soruların grafiği ve ayrım eksende değil, ETİKETTE:
 *
 *   YatayBar  Kategori karşılaştırması. Etiketler uzun ve düzensiz ("Dijital
 *             İçerik Üretimi ve Video Montaj"); yatay eksende sararlar.
 *   DikeyBar  Zaman dizisi. Etiketler kısa ve düzenli (Pzt, Sal… / 2024-2025);
 *             soldan sağa okunan bir sıra var ve okuma yönü zamanın yönüdür.
 *
 * Zaman dizisini yataya yatırmak, "sonra" kavramını aşağı doğru okutmak olur.
 * Bu yüzden birini öbürünün yerine kullanmayın: seçim veri türünün kararıdır,
 * yer darlığının değil.
 *
 * ÇİZGİ DEĞİL BAR — çizgi iki nokta arasını doldurur ve "aradaki bir anda
 * değer 2,5'ti" ima eder. Gün ve eğitim-öğretim yılı kesikli kovalardır; ara
 * değer diye bir şey yok (aynı gerekçe raporlar sayfasında da yazılı). Sürekli
 * bir eğilim okunacaksa Cizgi bileşeni kullanılır.
 *
 * ---------------------------------------------------------------------------
 * SVG DEĞİL HTML/CSS
 * ---------------------------------------------------------------------------
 * YatayBar'la aynı gerekçe: barın yüksekliği yüzdeyle veriliyor, kap kendi
 * genişliğine uyuyor ve metin ölçmek gerekmiyor. SVG olsaydı etiketlerin
 * genişliğini elle hesaplamak gerekirdi.
 *
 * KOYU MOD YOK: uygulama `color-scheme: light` ve iki teması da açık.
 */

export interface DikeyBarSutunu {
  etiket: string;
  deger: number;
}

/*
  BAR GENİŞLİĞİ ÜST SINIRLI (max-w-14 = 56px).

  Sütunlar `flex-1` ile eşit bölünüyor ve iki dönemlik veride her bar kabın
  yarısı kadar genişliyordu — ortaya iki kocaman blok çıkıyor, bar grafiği
  olmaktan çıkıp renkli dikdörtgenlere dönüşüyordu. Barın kalınlığı veriyle
  ilgili bir büyüklük değil; okunabilir bir kalınlıkta sabitlenip artan yer
  havaya bırakılıyor (aynı ilke YatayBar'da da var: en fazla 24px kalınlık).

  Sütun kabı yine `flex-1`: barlar ortalanıyor ama etiketler kendi sütunlarının
  tam genişliğini kullanabiliyor.
*/

/** Grafiğin çizim yüksekliği. Bardan çok hava kalmalı; 200px dengeyi tutuyor. */
const ALAN_YUKSEKLIGI = "12.5rem";

export function DikeyBar({
  baslik,
  aciklama,
  sutunlar,
  birim = "",
}: {
  /** Grafiğin adı. Tek seri olduğu için LEJANT YOK; seriyi başlık adlandırır. */
  baslik: string;
  aciklama?: string;
  sutunlar: readonly DikeyBarSutunu[];
  /** Değerin yanına yazılan birim ("başvuru" gibi). */
  birim?: string;
}) {
  /*
   * TEK SÜTUNDA GRAFİK YOK: bir barlık bar grafiği bir sayıdır ve o sayı
   * zaten ekranda yazıyor. Karşılaştırılacak ikinci bir uzunluk olmadan
   * grafiğin anlattığı hiçbir şey kalmıyor.
   */
  if (sutunlar.length < 2) return null;

  /*
   * ÖLÇEK EN BÜYÜK DEĞERE GÖRE, toplama göre değil: sorulan şey pay değil
   * karşılaştırma. Sıfıra bölme koruması, hepsi sıfırken bar çizilmemesi için.
   */
  const enBuyuk = Math.max(...sutunlar.map((sutun) => sutun.deger), 0);

  return (
    <figure className="m-0">
      <figcaption className="mb-4">
        <h3 className="text-base font-semibold text-baslik">{baslik}</h3>
        {aciklama && (
          <p className="mt-1 text-sm text-metin-yumusak">{aciklama}</p>
        )}
      </figcaption>

      {/*
        SAYILAR HEM GRAFİKTE HEM METİNDE: her sütunun değeri barın üstünde
        yazılı. Ekran okuyucu bunu `<dl>` üzerinden düz bir liste olarak okur —
        barların kendisi `aria-hidden`, çünkü aynı sayıyı ikinci kez söylerdi.

        DOĞRUDAN ETİKET VAR, IZGARA ÇİZGİSİ YOK: değer barın üstünde yazılıyken
        ızgara çizgisi aynı bilgiyi ikinci kez, daha zayıf biçimde verirdi.
      */}
      <dl
        className="flex items-end gap-2 sm:gap-3"
        style={{ height: ALAN_YUKSEKLIGI }}
      >
        {sutunlar.map((sutun) => {
          const oran = enBuyuk > 0 ? (sutun.deger / enBuyuk) * 100 : 0;

          return (
            <div
              key={sutun.etiket}
              className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1.5"
            >
              {/*
                DEĞER METİN BELİRTECİYLE, seri rengiyle DEĞİL (dataviz kuralı:
                "text never wears the data color"). `tabular-nums` sayıları
                sütunlar arasında aynı genişlikte tutar.
              */}
              <dd className="text-center text-xs font-semibold tabular-nums text-metin">
                {sutun.deger}
              </dd>

              {/*
                Barın veri ucu (üst) 4px yuvarlatılmış, taban ucu KÖŞELİ —
                dataviz mark kuralı: bar tek bir tabandan büyür.

                Değeri sıfır olmayan sütuna en az %2 yükseklik veriliyor:
                1'e karşı 800 gibi bir dağılımda küçük değer tamamen kaybolur
                ve "hiç yok" gibi okunurdu.
              */}
              <div
                aria-hidden
                className="mx-auto w-full max-w-14 rounded-t-[4px] bg-[var(--renk-vurgu)]"
                style={{
                  height: `${Math.max(oran, sutun.deger > 0 ? 2 : 0)}%`,
                }}
                title={`${sutun.etiket}: ${sutun.deger}${birim ? ` ${birim}` : ""}`}
              />

              {/*
                Etiket sütunun altında ve KIRPILMIYOR: `truncate` yerine
                `break-words` — kısa etiket bekleniyor ama uzun bir tanesi
                gelirse sarsın, üç noktayla yutulmasın (dataviz anti-pattern:
                "a label clipped by a too-small bar").
              */}
              <dt className="text-center text-[11px] leading-tight break-words text-metin-yumusak">
                {sutun.etiket}
              </dt>
            </div>
          );
        })}
      </dl>
    </figure>
  );
}
