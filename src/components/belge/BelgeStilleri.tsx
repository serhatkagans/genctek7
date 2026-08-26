import React from "react";
import { uygulamaYolu } from "@/lib/ortam";

/**
 * Belge sayfalarının ortak stil tanımlarını içeren sunucu bileşeni.
 * Tailwind kullanılmamasının sebebi, yazdırma kurallarının (@page, @media print, break-after)
 * tek bir yerde okunabilir ve öngörülebilir şekilde durmasını sağlamaktır.
 * Çoklu belge üretiminde sayfa başına tek bir <style> basılması için ayrı bileşene çıkarılmıştır.
 */
export function BelgeStilleri(): React.ReactElement {
  const sablonYolu = uygulamaYolu("/belge-sablonu.png");

  return (
    <style>{`
      @page {
        size: A4 landscape;
        margin: 0;
      }

      html, body {
        margin: 0;
        padding: 0;
        background: #eef0f3;
        color: #1f2430;
      }

      .belge-sayfa-kapsayici {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        padding: 20px;
        min-height: 100vh;
        box-sizing: border-box;
      }

      .belge-listesi {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 24px;
        width: 100%;
      }

      /*
        Belge kartı ve sayfalama kuralları:
        container-type: inline-size verilerek iç elemanların belgenin genişliğine göre (cqw)
        ölçeklenmesi sağlanır. break-after: page toplu yazdırmada her belgeyi ayrı PDF sayfasına basar.
      */
      .belge {
        position: relative;
        width: min(1180px, 96vw);
        aspect-ratio: 3783 / 2756;
        background-image: url('${sablonYolu}');
        background-size: 100% 100%;
        background-repeat: no-repeat;
        color: #1f2430;
        font-family: Georgia, "Times New Roman", serif;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        border-radius: 2px;
        box-sizing: border-box;
        container-type: inline-size;
        break-after: page;
        break-inside: avoid;
        page-break-after: always;
        page-break-inside: avoid;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      /* Son belgenin arkasında boş PDF sayfası kalmaması için sayfa sonu sonuncu elemana uygulanmaz */
      .belge-listesi .belge:last-child {
        break-after: auto;
        page-break-after: auto;
      }

      .belge-sira-etiketi {
        position: absolute;
        top: -28px;
        right: 0;
        background: #334155;
        color: #fff;
        font-size: 12px;
        font-weight: 600;
        padding: 2px 10px;
        border-radius: 4px;
        font-family: system-ui, -apple-system, sans-serif;
      }

      /*
        Güvenli alan kutusu:
        Şablon geometrisine göre metin alanı logo bandının altından (%32 üst) başlayıp
        beyaz alanın alt sınırına (%18 alt) ve yan sınırlarına (%14 yanlar) kadar uzanır.
        Tüm metin parçaları bu tek kutu içinde flex düzeninde tutulur; ayrı yüzdeyle
        konumlandırma yapılmadığı için metinlerin üst üste binmesi veya kırmızı çerçeveye taşması engellenir.
      */
      .belge-alan {
        position: absolute;
        top: 32%;
        right: 14%;
        bottom: 18%;
        left: 14%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-sizing: border-box;
      }

      .belge-govde {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        min-height: 0;
        overflow: hidden;
      }

      /*
        Container query birimi (cqw) kullanımı:
        cqw belgenin anlık genişliğine göre oranlanır. Bu sayede ekranda farklı pencere boyutlarında da,
        A4 kağıt çıktısında da tipografi ve boşluklar birebir aynı oranla görüntülenir.
      */
      .belge-baslik {
        font-size: clamp(16px, 2.6cqw, 32px);
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #c1272d;
        margin: 0 0 1.5cqw;
        line-height: 1.2;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .belge-ad {
        font-size: clamp(20px, 3.2cqw, 40px);
        font-weight: 700;
        margin: 0 0 1cqw;
        line-height: 1.25;
        color: #111827;
        max-width: 100%;
        overflow-wrap: break-word;
        word-break: break-word;
      }

      .belge-metin {
        font-size: clamp(12px, 1.6cqw, 20px);
        line-height: 1.5;
        margin: 0;
        color: #374151;
        max-width: 95%;
        overflow-wrap: break-word;
        /*
          SATIR SONLARI KORUNUR (26 Ağustos 2026 · istek: "tarihi komple alt
          satırdan başlatalım, bölünmesin"). Gövde metni tarihin önüne bir satır
          sonu koyuyor; pre-line olmasaydı o satır sonu boşluğa dönüşür ve
          tarih yine cümlenin ortasında kalırdı. Elle girilen özel metnin
          satırları da böylece korunuyor.
        */
        white-space: pre-line;
        /*
          word-break: break-word KALDIRILDI: tarihi bölünmez yapmak için
          konan bağlantısız boşluklar (NBSP) bile bu kuralla kırılabiliyordu.
          Uzun tek kelimeler overflow-wrap ile zaten sarılıyor.
        */
        hyphens: auto;
      }

      .belge-alt {
        display: flex;
        /* Tarih kaldırıldı; tek eleman kalan imza sağda durmalı. */
        justify-content: flex-end;
        align-items: flex-end;
        gap: 2cqw;
        font-size: clamp(10px, 1.2cqw, 15px);
        font-family: system-ui, -apple-system, sans-serif;
        width: 100%;
        margin-top: 1cqw;
      }

      .belge-imza {
        text-align: center;
        max-width: 48%;
        overflow-wrap: break-word;
      }

      .belge-imza-cizgi {
        border-top: 1px solid #98a0ab;
        padding-top: 0.4cqw;
        font-weight: 600;
        color: #1f2430;
      }

      .belge-birim {
        color: #5b6472;
        font-size: 0.9em;
        margin-top: 0.2cqw;
        line-height: 1.3;
      }

      /* Belge üretilemeyen durumların ekranı (katılımcı yok, sınır aşıldı). */
      .belge-bilgi {
        max-width: 560px;
        text-align: center;
        padding: 48px 20px;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .belge-bilgi h2 {
        margin: 0 0 12px;
        font-size: 20px;
        color: #1f2430;
      }
      .belge-bilgi p {
        margin: 0 0 24px;
        color: #5b6472;
        line-height: 1.5;
      }

      .arac-cubugu {
        display: flex;
        gap: 12px;
        align-items: center;
        font-family: system-ui, -apple-system, sans-serif;
        position: sticky;
        top: 16px;
        z-index: 100;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(8px);
        padding: 8px 16px;
        border-radius: 12px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      }

      .arac {
        background: #fff;
        border: 1px solid #d0d5dd;
        border-radius: 8px;
        padding: 9px 16px;
        font-size: 14px;
        color: #1f2430;
        text-decoration: none;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s ease;
      }
      .arac:hover {
        background: #f8fafc;
        border-color: #94a3b8;
      }

      .arac-birincil {
        background: #c1272d;
        border-color: #c1272d;
        color: #fff;
        font-weight: 600;
      }
      .arac-birincil:hover {
        background: #a71d22;
        border-color: #a71d22;
      }

      @media print {
        /*
          Panel kabuğu (üst bar, menü, KVKK ve taahhüt şeritleri) bu sayfayı
          sarmalıyor ve çıktıya girmemeli. Gizlenecekler tek tek sayılmıyor,
          "belgeyi taşıyan zincir DIŞINDAKİ her şey" gizleniyor: kabuğa yarın
          yeni bir şerit eklendiğinde bu kural onu da kapsar. Şeritleri tek tek
          saymak, eklenen her yeni şeridin buraya da yazılmasını gerektirirdi ve
          yazılmadığı ilk seferde çıktının başına boş bir sayfa gelirdi.

          "visibility: hidden" DEĞİL "display: none": gizlenen kabuk yer
          kaplamayı sürdürseydi ilk belgeyi ikinci sayfaya iterdi.
        */
        body *:not(:has(.belge-sayfa-kapsayici)):not(.belge-sayfa-kapsayici):not(.belge-sayfa-kapsayici *) {
          display: none !important;
        }

        /* Zincirde kalan sarmalayıcıların iç boşluğu belgeyi sayfadan kaydırır. */
        html, body, body *:has(.belge-sayfa-kapsayici) {
          margin: 0 !important;
          padding: 0 !important;
          max-width: none !important;
          min-height: 0 !important;
          background: #fff !important;
          box-shadow: none !important;
          border: 0 !important;
        }

        .belge-sayfa-kapsayici, .belge-listesi {
          display: block !important;
          margin: 0 !important;
          padding: 0 !important;
          gap: 0 !important;
          width: 100% !important;
        }

        /*
          Araç çubuğu ve sıra rozeti belgenin İÇİNDE duruyor; yukarıdaki kural
          onları gizlemez, ayrıca gizlenmeleri gerekir.
        */
        .arac-cubugu, .belge-sira-etiketi {
          display: none !important;
        }

        /*
          Kağıt ölçüsü: yükseklik sayfanın tamamı, genişlik şablonun kendi
          oranından TÜRETİLİR. Genişliği ayrıca vermek iki ölçüyü birden
          kesinleştirir ve aspect-ratio devre dışı kalır — belge hem yatayda
          ezilir hem de sayfayı doldurmaz. A4 yatayda 210mm yüksekliğe karşılık
          genişlik 288mm çıkar; 297mm'lik sayfada yanlarda kalan ~4,5mm şablonun
          kendi kesim payıdır, oran korunduğu için kaçınılmazdır.
        */
        .belge {
          height: 100vh !important;
          width: calc(100vh * 3783 / 2756) !important;
          max-width: 100vw !important;
          margin: 0 auto !important;
          padding: 0 !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
      }
    `}</style>
  );
}
