"use client";

import { Cookie } from "lucide-react";
import { useSyncExternalStore } from "react";
import { SINIF_BIRINCIL_BUTON } from "@/components/ui";

/**
 * ÇEREZ BİLDİRİMİ — bir kez görünür, kapatılınca bir daha çıkmaz.
 *
 * 21 Ağustos 2026 · istek: "KVKK'lar panelden kalkacak, açılışta çerez
 * politikası ile ilgili popup gelecek bir kerelik, sonra bir daha okuma yok,
 * kvkk olmasın."
 *
 * KVKK belge kapısının yerine geçiyor. Aradaki fark bilinçli: belge kapısı
 * ONAY İSTİYORDU (kişi kabul edene kadar sisteme giremiyordu), bu ise
 * BİLGİLENDİRME — sayfayı kilitlemez, "Tamam" denince kapanır.
 *
 * SAYAÇ TARAYICIDA (`localStorage`), sunucuda değil: "bu kişi bildirimi
 * gördü mü" bilgisi için kullanıcı başına bir tablo satırı tutmak, tek
 * cümlelik bir bildirimin bedeli olamaz. Aygıt değiştiren kişi bildirimi bir
 * kez daha görür — bilgilendirmede bunun bir zararı yok.
 *
 * İSTEMCİ BİLEŞENİ ve sunucuda HİÇ BASILMIYOR: sunucu `localStorage`ı
 * okuyamaz. Durum `useSyncExternalStore` ile okunuyor — sunucu anlık görüntüsü
 * "kapatıldı" der, istemci hidrasyondan sonra gerçek değeri okur. `useEffect`
 * içinde `setState` ile yapılsaydı aynı sonuç fazladan bir boyama turuyla
 * elde edilirdi (ve React bunu uyarıyor).
 *
 * `try/catch`: gizli sekmede ve site verisi kapalı tarayıcılarda
 * `localStorage`a erişmek hata fırlatır. Bildirim yüzünden sayfanın çökmesi,
 * bildirimin kendisinden çok daha ağır bir sorun olurdu — erişilemiyorsa
 * bildirim her açılışta gösterilir.
 */

const ANAHTAR = "genctek-cerez-bildirimi";

/*
 * Küçük bir dış depo: `localStorage` React'in bilmediği bir kaynak ve
 * `useSyncExternalStore` tam olarak bunun için var. Aboneler, bildirim
 * kapatıldığında haberdar edilir.
 */
const aboneler = new Set<() => void>();

function abone(dinleyici: () => void): () => void {
  aboneler.add(dinleyici);
  return () => {
    aboneler.delete(dinleyici);
  };
}

function kapatildiMi(): boolean {
  try {
    return window.localStorage.getItem(ANAHTAR) === "kapatildi";
  } catch {
    // Erişilemiyorsa bildirim gösterilir: kapatılmamış saymak, kullanıcının
    // bildirimi hiç görmemesinden iyidir.
    return false;
  }
}

/** Sunucuda bildirim basılmaz; gerçek değer hidrasyondan sonra okunur. */
function sunucudaKapatildiMi(): boolean {
  return true;
}

function kapat(): void {
  try {
    window.localStorage.setItem(ANAHTAR, "kapatildi");
  } catch {
    // Yazılamadıysa bildirim bir sonraki açılışta yine çıkar; bu oturumda
    // kapanması yine de sağlanıyor (abonelere haber veriliyor).
    kapatmaYedegi = true;
  }
  for (const dinleyici of aboneler) dinleyici();
}

/*
 * `localStorage`a yazılamadığı durumda bu oturum için tutulan işaret. Modül
 * düzeyinde çünkü depo da modül düzeyinde: bileşen yeniden bağlansa bile aynı
 * cevabı vermeli.
 */
let kapatmaYedegi = false;

export function CerezBildirimi() {
  const gizli = useSyncExternalStore(
    abone,
    () => kapatmaYedegi || kapatildiMi(),
    sunucudaKapatildiMi,
  );
  const gorunsun = !gizli;

  if (!gorunsun) return null;

  return (
    /*
      Ekranın ALTINDA duruyor, ortasında değil: kişinin yapmakta olduğu işi
      kesmiyor ve arkasındaki sayfa okunur kalıyor. Modal bir pencere,
      bilgilendirme için gereğinden fazla ağırlık olurdu.
    */
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cerez-bildirimi-baslik"
      className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6"
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-4 rounded-kart border border-cizgi bg-kart p-5 shadow-yuksek">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-kutu bg-vurgu-zemin text-vurgu-metin">
          <Cookie size={20} aria-hidden />
        </span>
        <div className="min-w-0 grow">
          <p
            id="cerez-bildirimi-baslik"
            className="font-semibold text-baslik"
          >
            Çerez politikası
          </p>
          <p className="mt-1 text-sm text-metin-yumusak">
            GençTek, oturumunuzun açık kalması ve tema tercihiniz gibi
            uygulamanın çalışması için zorunlu çerezleri kullanır. Reklam ya da
            izleme çerezi kullanılmaz; bu bildirim yalnızca bir kez gösterilir.
          </p>
        </div>
        <button
          type="button"
          onClick={kapat}
          className={SINIF_BIRINCIL_BUTON}
        >
          Tamam
        </button>
      </div>
    </div>
  );
}
