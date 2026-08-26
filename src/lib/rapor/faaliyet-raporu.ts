/**
 * Faaliyet raporunun Word çıktısı — analiz isteği Bölüm 5.
 *
 * NEDEN HTML: gerçek `.docx` üretmek bir kütüphane bağımlılığı gerektirir
 * (docx, officegen…). Word, HTML gövdeli bir `.doc` dosyasını yerel olarak
 * açar ve biçimlendirmeyi korur; başlık, tablo ve kalın metin çalışır. Tek
 * bir rapor çıktısı için bağımlılık eklemeye değmedi.
 *
 * EXCEL ayrı bir yol izler: HTML tablo `.xls` uzantısıyla verilseydi modern
 * Excel "dosya biçimi uzantıyla uyuşmuyor" uyarısı gösterirdi. Excel çıktısı
 * bu yüzden projedeki mevcut CSV altyapısını kullanır (BOM + noktalı virgül),
 * Excel onu uyarısız açar.
 *
 * Saf tutulur: veritabanına bakmaz, veriyi çağıran hazırlar.
 */

import { RAPOR_ALAN_ADLARI } from "@/lib/faaliyet/rapor-kurallar";

export interface RaporKatilimcisi {
  adSoyad: string;
  sinifVeyaBrans: string | null;
  okul: string | null;
  il: string | null;
  /** Yoklama sonucu: geldi / gelmedi / henüz işaretlenmedi (null). */
  katildiMi: boolean | null;
}

export interface RaporVerisi {
  faaliyetAdi: string;
  aciklama: string;
  kapsam: string;
  kategori: string;
  yer: string;
  tarih: string;
  sure: string;
  /** Yüz yüze / online / karma; girilmemişse null. */
  katilimBicimi: string | null;
  hedefKitle: string | null;
  duzenleyen: string;
  duzenleyenBirim: string;
  kontenjan: number;
  toplamBasvuru: number;
  /** Seçilmiş başvuru sayısı — "katılabilir" demek, "katıldı" demek DEĞİL. */
  secilenSayisi: number;
  /*
   * KATILIM YOKLAMADAN GELİR (26 Ağustos 2026 · istek: "yoklamayı alıyorum
   * sonra rapor oluşturunca katılmayan öğrenciler de katıldı gibi görünüyor").
   *
   * Çıktı eskiden seçilmiş başvuruları "Katılan" diye yazıyor, listeye de
   * hepsini basıyordu; gelmedi işaretlenen kişi raporda katılmış görünüyordu.
   * Ekran (rapor sayfası) yoklamayı zaten sayıyordu — çelişen tek yer indirilen
   * belgeydi, yani resmî olarak dolaşan nüsha.
   */
  gelenSayisi: number;
  gelmeyenSayisi: number;
  isaretlenmeyenSayisi: number;
  /** Kaç FARKLI kişi — tek faaliyette ikisi eşittir, dönem raporunda ayrışır. */
  tekilKatilimci: number;
  /** Gelmedi işaretlenenler BURADA YOKTUR; çağıran ayıklar. */
  katilimcilar: RaporKatilimcisi[];
  gorselAdlari: string[];
  /*
   * Koordinatörün/düzenleyenin YAZDIĞI değerlendirme. Rapor sayfasında
   * giriliyor; çıktının asıl içeriği budur. Boşsa rapor henüz yazılmamıştır
   * ve çıktı bunu açıkça söyler — sessizce boş bölüm bırakmak, raporun
   * yazıldığı ama içeriğin kaybolduğu izlenimi verirdi.
   */
  degerlendirme: string | null;
  kazanimlar: string | null;
  /** Değerlendirmeyi yazan ve son güncelleme; boşsa rapor yazılmamıştır. */
  raporYazan: string | null;
  raporTarihi: string | null;
  olusturan: string;
  olusturmaTarihi: string;
}

/** HTML'e gömülecek metni kaçırır. Rapor kullanıcı metni taşıyor (açıklama). */
export function htmlKacir(deger: string): string {
  return deger
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function satir(etiket: string, deger: string): string {
  return `<tr><td class="e">${htmlKacir(etiket)}</td><td>${htmlKacir(deger)}</td></tr>`;
}

export function faaliyetRaporuHtml(veri: RaporVerisi): string {
  const katilimciSatirlari =
    veri.katilimcilar.length === 0
      ? `<tr><td colspan="5">Yoklamada gelen katılımcı yok.</td></tr>`
      : veri.katilimcilar
          .map(
            (k, sira) =>
              `<tr><td>${sira + 1}</td><td>${htmlKacir(k.adSoyad)}</td>` +
              `<td>${htmlKacir(k.sinifVeyaBrans ?? "—")}</td>` +
              `<td>${htmlKacir(k.okul ?? k.il ?? "—")}</td>` +
              `<td>${k.katildiMi === true ? "Geldi" : "Yoklama alınmadı"}</td></tr>`,
          )
          .join("");

  const gorseller =
    veri.gorselAdlari.length === 0
      ? "<p>Etkinliğe görsel eklenmemiş.</p>"
      : `<ul>${veri.gorselAdlari.map((ad) => `<li>${htmlKacir(ad)}</li>`).join("")}</ul>
         <p class="not">Görseller panelde etkinlik sayfasından indirilebilir; rapora
         gömülmez çünkü dosya boyutu Word belgesini kullanılamaz hâle getirir.</p>`;

  /*
   * `charset` meta etiketi ŞART: Word onsuz dosyayı Latin-1 sanıp Türkçe
   * karakterleri bozuyor.
   */
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
<meta charset="utf-8">
<title>${htmlKacir(veri.faaliyetAdi)} — Etkinlik Raporu</title>
<style>
body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
h1 { font-size: 16pt; }
h2 { font-size: 13pt; margin-top: 18pt; }
table { border-collapse: collapse; width: 100%; }
td, th { border: 1px solid #999; padding: 4pt 6pt; vertical-align: top; }
th { background: #eee; text-align: left; }
td.e { width: 30%; font-weight: bold; background: #f5f5f5; }
p.not { font-size: 9pt; color: #555; }
</style>
</head>
<body>
<h1>${htmlKacir(veri.faaliyetAdi)}</h1>
<p><em>GençTek Bilgi Sistemi — Etkinlik Raporu</em></p>

<h2>Etkinlik bilgileri</h2>
<table>
${satir("Kapsam", veri.kapsam)}
${satir("Etkinlik kategorisi", veri.kategori)}
${satir("Yer", veri.yer)}
${satir("Tarih", veri.tarih)}
${satir("Süre", veri.sure)}
${veri.katilimBicimi ? satir("Katılım biçimi", veri.katilimBicimi) : ""}
${veri.hedefKitle ? satir("Hedef kitle", veri.hedefKitle) : ""}
${satir("Düzenleyen", veri.duzenleyen)}
${satir("Düzenleyen birim", veri.duzenleyenBirim)}
</table>

<h2>Açıklama</h2>
<p>${htmlKacir(veri.aciklama).replace(/\n/g, "<br>")}</p>

<h2>Katılım</h2>
<table>
${satir("Kontenjan", String(veri.kontenjan))}
${satir("Toplam başvuru", String(veri.toplamBasvuru))}
${satir("Seçilen", String(veri.secilenSayisi))}
${satir("Yoklamada gelen", String(veri.gelenSayisi))}
${satir("Gelmeyen", String(veri.gelmeyenSayisi))}
${veri.isaretlenmeyenSayisi > 0 ? satir("Yoklaması alınmayan", String(veri.isaretlenmeyenSayisi)) : ""}
${satir("Farklı kişi sayısı", String(veri.tekilKatilimci))}
</table>

<h2>${RAPOR_ALAN_ADLARI.degerlendirme}</h2>
${
  veri.degerlendirme
    ? `<p>${htmlKacir(veri.degerlendirme).replace(/\n/g, "<br>")}</p>` +
      (veri.raporYazan
        ? `<p class="not">Yazan: ${htmlKacir(veri.raporYazan)}${
            veri.raporTarihi ? ` · ${htmlKacir(veri.raporTarihi)}` : ""
          }</p>`
        : "")
    : "<p><em>Bu etkinliğin raporu henüz yazılmadı.</em></p>"
}

${
  veri.kazanimlar
    ? `<h2>${RAPOR_ALAN_ADLARI.kazanimlar}</h2><p>${htmlKacir(veri.kazanimlar).replace(/\n/g, "<br>")}</p>`
    : ""
}

<h2>Katılımcılar</h2>
<p class="not">Liste yoklamaya göredir: gelmedi işaretlenen ${veri.gelmeyenSayisi} kişi
buraya yazılmaz.${
    veri.isaretlenmeyenSayisi > 0
      ? ` ${veri.isaretlenmeyenSayisi} kişinin yoklaması henüz alınmadı; listede
         &quot;yoklama alınmadı&quot; olarak görünüyorlar.`
      : ""
  }</p>
<table>
<tr><th>#</th><th>Ad Soyad</th><th>Sınıf / Branş</th><th>Okul / İl</th><th>Katılım</th></tr>
${katilimciSatirlari}
</table>

<h2>Görseller</h2>
${gorseller}

<p class="not">Bu rapor ${htmlKacir(veri.olusturan)} tarafından
${htmlKacir(veri.olusturmaTarihi)} tarihinde üretildi.</p>
</body>
</html>`;
}

/**
 * Word yanıtı.
 *
 * `application/msword` + `.doc`: Word dosyayı açarken içeriğin HTML olduğunu
 * kendisi anlıyor. `.docx` verilseydi Word bozuk ZIP hatası verirdi — docx bir
 * arşiv biçimidir, HTML değil.
 */
export function wordYaniti(dosyaAdi: string, html: string): Response {
  const gun = new Date().toISOString().slice(0, 10);
  const tamAd = `${dosyaAdi}-${gun}.doc`;

  return new Response(html, {
    headers: {
      "Content-Type": "application/msword; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(tamAd)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
