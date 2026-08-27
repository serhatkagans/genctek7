import { Download } from "lucide-react";
import { uygulamaYolu } from "@/lib/ortam";

/**
 * Liste ekranlarının indirme bağlantısı (15 Ağustos 2026).
 *
 * Manisa farkları turu. Manisa panelinde Excel tek bir ekranın
 * özelliği değil, panelin genelinde aynı biçimde duran bir davranış; bizde her
 * ekran kendi bağlantısını kendi etiketiyle basıyordu ve biri "CSV indir" derken
 * dosya artık XLSX iniyordu.
 *
 * ---------------------------------------------------------------------------
 * BİLEŞEN SORGUYU KURMAZ, YALNIZCA GÖSTERİR
 * ---------------------------------------------------------------------------
 * Plan bu bileşenin ekranın süzgeçlerini de taşımasını öngörüyordu. Uygulamada
 * daraltıldı: ekranların hepsi bağlantıyı zaten kendi `filtreler.ts`
 * çözümlemesiyle kuruyor (`sorguMetni`) ve o kod çalışıyor. Sorgu kurmayı da
 * buraya almak, altı çalışan ekranı tek bir genellemeye çevirmek olurdu —
 * kazanç ortak bir etiket, bedel altı ekranda gerileme riski.
 *
 * Bileşenin garanti ettiği şey daha dar ama gerçek: her ekran AYNI etiketi,
 * AYNI ikonu ve HER İKİ BİÇİMİ birden sunar. `bicim=csv` bağlantısını tek tek
 * ekranlara bırakmak, birinin unutulması demekti.
 *
 * CSV İKİNCİL AMA SÖNÜK DEĞİL (15 Ağustos 2026 · geri bildirim: "Excel indir
 * güzel duruyor, CSV sönük kalmış"). İlk hâlde CSV, altı çizili küçük gri bir
 * metindi ve devre dışı bırakılmış gibi görünüyordu — oysa çalışan bir seçenek.
 *
 * Şimdi kendi çerçevesi olan bir rozet: Excel bağlantısıyla aynı yükseklikte,
 * aynı hizada, ama vurgu rengi taşımıyor. Sıra hâlâ okunuyor (varsayılan
 * Excel, CSV yanında duran alternatif) ama ikincisi "kapalı" izlenimi
 * vermiyor.
 *
 * ---------------------------------------------------------------------------
 * `<a>` VE `uygulamaYolu` — `<Link>` DEĞİL
 * ---------------------------------------------------------------------------
 * İkisi de bilinçli ve bu bileşenin sessiz bir hatayı düzelttiği yer.
 * `next/link` istemci tarafı gezinme yapıyor; dosya indirmede yapacak bir şeyi
 * yok. Daha önemlisi: liste ekranları bugüne kadar `<Link href="/panel/...">`
 * ile HAM yol veriyordu ve `TEMEL_YOL` altında yayınlanan kurulumda bu
 * bağlantılar uygulamaya değil ters vekile düşerdi. `lib/ortam.ts` bu hatanın
 * daha önce iki kez üretildiğini yazıyor; bileşen onu üçüncü kez üretilemez
 * hâle getiriyor.
 */
export function DisaAktarmaBagi({
  yol,
  kayitSayisi,
  etiket = "Excel indir",
}: {
  /** Rotanın yolu; ekranın süzgeçleri sorgu dizesi olarak eklenmiş olmalı. */
  yol: string;
  /** Bağlantının yanında gösterilir; verilmezse sayı yazılmaz. */
  kayitSayisi?: number;
  etiket?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <a
        href={uygulamaYolu(yol)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-vurgu-metin"
      >
        <Download size={15} aria-hidden />
        {etiket}
        {kayitSayisi === undefined ? "" : ` (${kayitSayisi} kayıt)`}
      </a>
      <a
        href={uygulamaYolu(csvYolu(yol))}
        title={`${etiket} — CSV biçiminde`}
        className="rounded-full border border-cizgi px-2.5 py-0.5 text-xs font-medium text-metin transition hover:border-vurgu hover:text-vurgu-metin"
      >
        CSV
      </a>
    </span>
  );
}

/**
 * Aynı yolun CSV biçimi.
 *
 * Sorgu dizesi OLABİLİR de OLMAYABİLİR de (süzgeçsiz ekranda yok); ayraç buna
 * göre seçiliyor. Elle `?bicim=csv` eklenseydi süzgeçli bağlantılarda ikinci
 * bir soru işareti oluşur ve parametrelerin tamamı sessizce düşerdi — dosya
 * ekranda görünenden farklı çıkardı.
 */
function csvYolu(yol: string): string {
  return `${yol}${yol.includes("?") ? "&" : "?"}bicim=csv`;
}
