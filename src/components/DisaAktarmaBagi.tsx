import { Download, FileText } from "lucide-react";
import { SINIF_IKINCIL_BUTON } from "@/components/ui";
import { uygulamaYolu } from "@/lib/ortam";

/*
 * Excel düğmesi ikincil düğmenin ÖLÇÜLERİNİ paylaşır (aynı yükseklik, aynı
 * yuvarlaklık) ama rengi ve gölgesiyle öne çıkar. Sınıf, SINIF_IKINCIL_BUTON'a
 * ek yazılarak değil ayrı yazılarak kuruldu: aynı özelliğin (metin rengi) iki
 * kez geçtiği bir sınıf dizisinde hangisinin kazandığı Tailwind'de sıraya değil
 * stil dosyasındaki sıraya bakar — sessizce yanlış rengi verebilirdi.
 */
const SINIF_EXCEL_BUTON =
  "inline-flex items-center gap-2 rounded-kutu border border-cizgi-guclu bg-kart px-4 py-2.5 text-sm font-semibold text-vurgu-metin shadow-kart transition hover:border-vurgu hover:bg-zemin focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vurgu";

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
 * İKİSİ DE ARTIK DÜĞME (30 Ağustos 2026 · istekler: "excel indiri güzel buton
 * haline getirsen" · "yandaki csv indiri de güzel buton yap"). İkisi de metin
 * bağlantısıydı; liste ekranlarında süzgeç düğmelerinin yanında duran, tıklanır
 * görünmeyen iki satırdı.
 *
 * SIRA KORUNUYOR — aynı boyda iki düğme "hangisi varsayılan" sorusunu yeniden
 * açardı: Excel kalın yazı, vurgu rengi ve gölge taşıyor; CSV panelin standart
 * ikincil düğmesi (SINIF_IKINCIL_BUTON). Aynı yükseklik ve aynı hizadalar, yani
 * CSV yine "kapalı" görünmüyor.
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
    <span className="inline-flex flex-wrap items-center gap-2">
      <a href={uygulamaYolu(yol)} className={SINIF_EXCEL_BUTON}>
        <Download size={16} aria-hidden />
        {etiket}
        {kayitSayisi === undefined ? "" : ` (${kayitSayisi} kayıt)`}
      </a>
      <a
        href={uygulamaYolu(csvYolu(yol))}
        title={`${etiket} — CSV biçiminde`}
        className={SINIF_IKINCIL_BUTON}
      >
        <FileText size={16} aria-hidden />
        CSV indir
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
