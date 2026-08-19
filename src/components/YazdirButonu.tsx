"use client";

/**
 * Yazdırma düğmesi — tarayıcının yazdırma penceresini açar.
 *
 * Ayrı bir istemci bileşeni olmak zorunda: `window.print()` tarayıcıda çalışır
 * ve sunucu bileşenine onClick verilemez. Çağıran sayfanın geri kalanı sunucu
 * bileşeni olarak kalıyor — yalnızca bu düğme istemciye iniyor.
 *
 * ETİKET DIŞARIDAN GELİYOR (18 Ağustos 2026). Metin eskiden gövdeye gömülüydü
 * ("Yazdır / PDF olarak kaydet") çünkü tek çağıran belge sayfasıydı. Raporlar
 * ekranındaki çıktı satırında ise düğme Excel'in yanında duruyor ve orada
 * beklenen ad "PDF'e Aktar" (bkz. sablon/4.png); iki ekran aynı işi farklı
 * adlarla anıyor ve bu doğru — biri bir belgeyi yazdırıyor, öbürü bir raporu
 * dışa aktarıyor.
 *
 * KENDİSİ `yazdirma-disi` TAŞIR: düğme, açtığı çıktının içine basılmamalı.
 * Sınıfı çağırana bıraksaydık ilk unutulan yerde kâğıtta tıklanamaz bir düğme
 * çıkardı (yazdırma kuralları: globals.css · @media print).
 */
export function YazdirButonu({
  className,
  children = "Yazdır / PDF olarak kaydet",
}: {
  className?: string;
  /** Düğmenin içeriği; ikon geçirmek için düğüm alır. */
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`yazdirma-disi ${className ?? ""}`}
    >
      {children}
    </button>
  );
}
