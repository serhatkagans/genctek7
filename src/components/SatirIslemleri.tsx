import { Eye, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { uygulamaYolu } from "@/lib/ortam";

/**
 * Liste satırlarının "İşlemler" sütunu (15 Ağustos 2026).
 *
 * Manisa GençTek panelinde her liste satırının sonunda sabit bir işlem şeridi
 * var: Excel · görüntüle · düzenle · sil. Düzen iyi çalışıyor — göz aynı yerde
 * aynı ikonları buluyor — ve buradaki bileşen o düzeni kuruyor.
 *
 * ============================================================================
 * DÖRT İKONUN İKİSİ BİZDE YOK, VE BU BİR EKSİK DEĞİL
 * ============================================================================
 * · **Düzenle** — liste ekranlarındaki kayıtların çoğu SALT OKUNUR: kimlik
 *   alanları AuthProvider'dan, okullar MEB kurum kodundan geliyor (bkz. şema
 *   notları ve Okullar ekranındaki bilgi kutusu). Kalem ikonu koymak, basınca
 *   ya hiçbir şey yapmayan ya da kaynağı değiştiremeyeceği için sessizce
 *   geri alınacak bir düğme demekti.
 * · **Sil** — depoda kalıcı silme yok: ekip "kapatılır", paydaş "pasife
 *   alınır", ilan "kapatılır", faaliyet "iptal edilir". Çöp kutusu ikonu bu
 *   ayrımı silerdi; kapatma eylemleri kendi ekranlarında kendi adlarıyla
 *   duruyor.
 *
 * Kalan ikisi — **görüntüle** ve **satır bazlı Excel** — gerçekten yapılabilen
 * işler ve bileşen onları taşıyor.
 *
 * İKON TEK BAŞINA BIRAKILMAZ: her bağlantının `aria-label`'ı ve `title`'ı var.
 * Yalnızca ikon, ekran okuyucuda "bağlantı" diye okunur ve fare olmayan
 * cihazda ne yaptığı tahmin edilir.
 */
export function SatirIslemleri({
  goruntuleYolu,
  excelYolu,
  ad,
}: {
  /** Kaydın detay sayfası. Verilmezse göz ikonu basılmaz. */
  goruntuleYolu?: string;
  /** Satırın kendi dosya çıktısı. Verilmezse Excel ikonu basılmaz. */
  excelYolu?: string;
  /** Erişilebilir etikette geçen kayıt adı ("Akhisar Ekibi" gibi). */
  ad: string;
}) {
  if (!goruntuleYolu && !excelYolu) return null;

  return (
    <span className="inline-flex items-center gap-3">
      {goruntuleYolu && (
        <Link
          href={goruntuleYolu}
          title={`${ad} — görüntüle`}
          aria-label={`${ad} kaydını görüntüle`}
          className="text-vurgu-metin"
        >
          <Eye size={16} aria-hidden />
        </Link>
      )}
      {excelYolu && (
        /*
         * Dosya indirmesi `<a>` ve `uygulamaYolu` ile — `next/link` istemci
         * gezinmesi yapıyor ve indirmede yapacak işi yok (aynı gerekçe
         * DisaAktarmaBagi'nda yazılı).
         */
        <a
          href={uygulamaYolu(excelYolu)}
          title={`${ad} — Excel indir`}
          aria-label={`${ad} kaydını Excel olarak indir`}
          className="text-metin-yumusak"
        >
          <FileSpreadsheet size={16} aria-hidden />
        </a>
      )}
    </span>
  );
}
