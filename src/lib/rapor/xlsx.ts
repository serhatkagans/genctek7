import { adParcasi } from "@/lib/rapor/csv";
import { zipOlustur } from "@/lib/zip";

/**
 * Küçük bir XLSX (Excel çalışma kitabı) yazıcısı (15 Ağustos 2026).
 *
 * İSTEK: Manisa GençTek ekibinin panelinde raporlar `.xlsx` olarak iniyor;
 * bizimkiler CSV. Karşılaştırma notu: `manisa-farklari-plani.md` · Aşama 1.
 *
 * ---------------------------------------------------------------------------
 * NEDEN PAKET DEĞİL DE ELLE
 * ---------------------------------------------------------------------------
 * Planın ilk hâli `exceljs` eklemeyi öngörüyordu. Yazarken görüldü ki gereken
 * şey zaten elimizde: XLSX bir ZIP arşividir ve içindeki parçalar düz XML'dir;
 * `lib/zip.ts` de tam bir PKZIP yazıcısı. Gerekçe o dosyanınkiyle aynı —
 * taşınacak bağımlılık ile yapılan iş oransız kalıyordu. `exceljs` bağımlılık
 * ağacıyla birlikte megabaytlarca yer tutar; burada üretilen şey ise başlıklı
 * tek sayfalık bir tablo.
 *
 * KAPSAM DIŞI (bilerek): birden çok sayfa, formül, grafik, koşullu biçim,
 * hücre birleştirme, resim, paylaşılan dizge tablosu (sharedStrings). Bu
 * sınırlar aşılacaksa doğru cevap bu dosyayı büyütmek değil, gerçek bir
 * kütüphane eklemektir.
 *
 * ---------------------------------------------------------------------------
 * FORMÜL KAÇIŞI BURADA YAPILMAZ — CSV'DEKİNİN AKSİNE
 * ---------------------------------------------------------------------------
 * `csv.ts` hücrenin başındaki `=`, `+`, `-`, `@` karakterlerini tırnaklıyor,
 * çünkü CSV'de hücrenin tipi yoktur: Excel dosyayı açarken `=1+1` gördüğü yere
 * formül der ve dosyayı açan kişinin makinesinde hesaplar.
 *
 * XLSX'te hücrenin tipi DOSYADA YAZILIDIR. Buradaki metin hücreleri
 * `t="inlineStr"` ile yazılır; Excel onları hiçbir koşulda formül olarak
 * yorumlamaz. Aynı korumayı buraya kopyalamak, adı "-" ile başlayan bir okulun
 * adının başına tırnak eklemekten başka bir işe yaramazdı.
 *
 * BOM ve ayıraç derdi de yok: ikisi de CSV'nin sorunuydu (Türkçe yerel ayarda
 * Excel virgülü ondalık ayırıcı sayıyor). XLSX'te kodlama UTF-8 olarak
 * dosyanın içinde bildiriliyor.
 */

/** Tablonun bir sütunu. */
export interface XlsxSutun {
  baslik: string;
  /** Excel sütun genişliği (karakter). Verilmezse `VARSAYILAN_GENISLIK`. */
  genislik?: number;
}

const VARSAYILAN_GENISLIK = 18;

/**
 * Başlık bloğunun kapladığı satır sayısı: ad, alt başlık, boş ayırıcı.
 * Sütun başlıkları bunun hemen altındadır ve dondurulan bölme oraya kadardır.
 */
const BASLIK_SATIRLARI = 3;
const SUTUN_BASLIGI_SATIRI = BASLIK_SATIRLARI + 1;

/*
 * Biçim kimlikleri — `stilTablosu` içindeki `cellXfs` sırasıyla birebir.
 * Sayılar orada elle sıralandığı için burada adlandırıldı; iki yer birlikte
 * değişmeli.
 */
const BICIM = {
  normal: 0,
  baslik: 1,
  altBaslik: 2,
  sutunBasligi: 3,
  sarmali: 4,
  tarih: 5,
} as const;

/**
 * Excel tarih seri numarasının başlangıcı.
 *
 * Excel günleri 1899-12-31'den sayar ama 1900'ü hatalı biçimde artık yıl kabul
 * eder; bu hata biçimin parçası hâline geldiği için düzeltilmiyor ve pratikte
 * başlangıç 1899-12-30 gibi davranıyor. 1900'den sonraki bütün tarihler bu
 * sabitle doğru çıkıyor — bizim veride 1900 öncesi tarih yok.
 */
const EXCEL_BASLANGICI = Date.UTC(1899, 11, 30);
const GUN_MS = 86_400_000;

/**
 * Tarihi Excel seri numarasına çevirir.
 *
 * UTC üzerinden hesaplanır: yerel saatle yapılsaydı sunucunun saat dilimine
 * göre tarih bir gün kayabilirdi ve kayma yalnızca belirli saatlerde
 * yazılan kayıtlarda görüneceği için fark edilmezdi.
 */
function tarihSerisi(tarih: Date): number {
  const gun = Date.UTC(
    tarih.getUTCFullYear(),
    tarih.getUTCMonth(),
    tarih.getUTCDate(),
  );
  return Math.round((gun - EXCEL_BASLANGICI) / GUN_MS);
}

/**
 * XML metin kaçışı.
 *
 * DENETİM KARAKTERLERİ DÜŞÜRÜLÜR, kaçırılmaz: XML 1.0 sekme, satır başı ve
 * satır sonu dışındaki C0 karakterlerini kabul etmez — kaçış dizisi olarak
 * yazılsalar bile belge geçersiz olur. Bu teorik bir ihtimal değil: rapor
 * özeti serbest metin ve kopyala-yapıştırla gelen metinlerde bu karakterler
 * bulunuyor. Düşürülmeseydi Excel dosyayı "onarılması gerekiyor" diye açardı.
 */
function xmlKacir(metin: string): string {
  return metin
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/**
 * Sütun sırasını Excel harfine çevirir: 0 → A, 25 → Z, 26 → AA.
 *
 * 26'lık taban ama sıfırsız ("A" hem 0 hem basamak değeri 1) — bu yüzden her
 * adımda bir eksiltiliyor.
 */
export function sutunHarfi(sira: number): string {
  let kalan = sira;
  let harf = "";
  do {
    harf = String.fromCharCode(65 + (kalan % 26)) + harf;
    kalan = Math.floor(kalan / 26) - 1;
  } while (kalan >= 0);
  return harf;
}

/**
 * Bir hücrenin XML'i.
 *
 * SAYI MI METİN Mİ: yalnızca gerçek `number` değerler sayı hücresi olur.
 * Metin olarak gelen "42" METİN KALIR — kurum kodu, telefon ve sınıf gibi
 * alanlar sayıya benziyor ama sayı değil; Excel onları sayıya çevirseydi
 * baştaki sıfırlar düşer ve uzun kodlar üstel gösterime kaçardı.
 *
 * `NaN` ve `Infinity` metne düşürülür: XLSX sayı hücresi ikisini de taşımaz ve
 * yazılırsa dosya bozulur.
 *
 * TARİH GERÇEK TARİH HÜCRESİ OLUR, biçimlenmiş metin değil. Bu, CSV'den asıl
 * ayrıldığımız yer: metin olarak yazılan "18 Haziran 2026" elektronik tabloda
 * ALFABETİK sıralanır — Ağustos, Haziran'dan önce gelir ve dosyayı tarihe göre
 * sıralayan kişi yanlış sıralanmış bir listeye bakar, üstelik bunu fark etmez.
 * Seri numarası yazıldığında sıralama, süzme ve "şu iki tarih arası" filtresi
 * çalışır. Görünen biçim `DD.MM.YYYY` (bkz. `stilTablosu` · numFmt 164).
 *
 * Tarih hücresi kendi biçimini SEÇER, satırın biçimini kullanmaz: gövde
 * satırları sarmalı biçimde yazılıyor ve tarih sütunu ondan farklı olmalı.
 */
function hucre(deger: unknown, adres: string, bicim: number): string {
  const stil = bicim === BICIM.normal ? "" : ` s="${bicim}"`;

  if (deger === null || deger === undefined || deger === "") {
    return `<c r="${adres}"${stil}/>`;
  }

  if (deger instanceof Date && !Number.isNaN(deger.getTime())) {
    return `<c r="${adres}" s="${BICIM.tarih}"><v>${tarihSerisi(deger)}</v></c>`;
  }

  if (typeof deger === "number" && Number.isFinite(deger)) {
    return `<c r="${adres}"${stil}><v>${deger}</v></c>`;
  }

  const metin = xmlKacir(String(deger));
  return (
    `<c r="${adres}" t="inlineStr"${stil}>` +
    `<is><t xml:space="preserve">${metin}</t></is></c>`
  );
}

function satir(
  hucreler: readonly unknown[],
  satirNo: number,
  bicim: number,
): string {
  const icerik = hucreler
    .map((deger, sira) => hucre(deger, `${sutunHarfi(sira)}${satirNo}`, bicim))
    .join("");
  return `<row r="${satirNo}">${icerik}</row>`;
}

const XML_BASI = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const AD_ALANI = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const ILISKI_AD_ALANI =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

function icerikTipleri(): string {
  return `${XML_BASI}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
}

function kokIliskileri(): string {
  return `${XML_BASI}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="${ILISKI_AD_ALANI}/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

/**
 * Çalışma kitabı. Sayfa adı SABİT ("Rapor"): Excel sayfa adlarında `\ / ? * [ ]`
 * kabul etmez ve 31 karakterle sınırlar. Kullanıcıdan gelen başlığı buraya
 * yazmak, adı uzun ya da iki nokta içeren her raporda dosyayı bozardı; başlık
 * zaten sayfanın ilk satırında tam hâliyle duruyor.
 */
function calismaKitabi(): string {
  return `${XML_BASI}
<workbook xmlns="${AD_ALANI}" xmlns:r="${ILISKI_AD_ALANI}">
<sheets><sheet name="Rapor" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
}

function kitapIliskileri(): string {
  return `${XML_BASI}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="${ILISKI_AD_ALANI}/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="${ILISKI_AD_ALANI}/styles" Target="styles.xml"/>
</Relationships>`;
}

/**
 * Biçim tablosu.
 *
 * `fills` içindeki ilk iki giriş (none ve gray125) ZORUNLUDUR: Excel bu ikisini
 * her zaman bu sırada bekler, atlanırsa dosyayı onarmak ister. Kendi rengimiz
 * bu yüzden üçüncü sırada.
 *
 * Renkler sabit yazılı; panelin tema değişkenleri burada kullanılamaz çünkü
 * dosya panelden bağımsız olarak Excel'de açılıyor.
 *
 * BAŞLIK ŞERİDİ GÖK MAVİSİ (#0284C7 · 15 Ağustos 2026, istek üzerine değişti;
 * önceki ton #1D4ED8 lacivert-maviydi). Üzerindeki yazı beyaz ve kalın;
 * ölçülen kontrast 4.10:1 — kalın başlık şeridi için yeterli, yazdırılınca da
 * okunuyor. Daha koyu bir gök mavisi gerekirse #0369A1 (5.93:1) ile
 * değiştirilebilir; tek dokunulacak yer bu satır.
 */
function stilTablosu(): string {
  return `${XML_BASI}
<styleSheet xmlns="${AD_ALANI}">
<numFmts count="1"><numFmt numFmtId="164" formatCode="DD.MM.YYYY"/></numFmts>
<fonts count="4">
<font><sz val="11"/><color rgb="FF111827"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="15"/><color rgb="FF111827"/><name val="Calibri"/><family val="2"/></font>
<font><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF0284C7"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

/**
 * Sayfanın kendisi.
 *
 * ÖĞE SIRASI ŞEMAYLA SABİTTİR (dimension → sheetViews → sheetFormatPr → cols →
 * sheetData → autoFilter). Sıra bozulursa Excel dosyayı açmaz; bu yüzden
 * parçalar tek bir şablonda, elle sıralı duruyor.
 *
 * DONDURULAN BÖLME sütun başlıklarının altındadır: 800 satırlık bir raporda
 * aşağı inen kişi hangi sütuna baktığını görmeye devam eder.
 *
 * SÜZGEÇ (autoFilter) başlık satırına konur — dosyayı açan kişinin ilk yaptığı
 * şey genelde bir ilçeye ya da bir okula daraltmak.
 */
function sayfa(
  sutunlar: readonly XlsxSutun[],
  satirlar: readonly (readonly unknown[])[],
  baslik: string,
  altBaslik: string,
): string {
  const sonSutun = sutunHarfi(Math.max(0, sutunlar.length - 1));
  const sonSatir = SUTUN_BASLIGI_SATIRI + satirlar.length;

  const genislikler = sutunlar
    .map(
      (sutun, sira) =>
        `<col min="${sira + 1}" max="${sira + 1}" width="${
          sutun.genislik ?? VARSAYILAN_GENISLIK
        }" customWidth="1"/>`,
    )
    .join("");

  const govde = satirlar
    .map((hucreler, sira) =>
      satir(hucreler, SUTUN_BASLIGI_SATIRI + 1 + sira, BICIM.sarmali),
    )
    .join("");

  return `${XML_BASI}
<worksheet xmlns="${AD_ALANI}">
<dimension ref="A1:${sonSutun}${Math.max(sonSatir, SUTUN_BASLIGI_SATIRI)}"/>
<sheetViews><sheetView tabSelected="1" workbookViewId="0">
<pane ySplit="${SUTUN_BASLIGI_SATIRI}" topLeftCell="A${SUTUN_BASLIGI_SATIRI + 1}" activePane="bottomLeft" state="frozen"/>
</sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${genislikler}</cols>
<sheetData>${satir([baslik], 1, BICIM.baslik)}${satir([altBaslik], 2, BICIM.altBaslik)}<row r="3"/>${satir(
    sutunlar.map((sutun) => sutun.baslik),
    SUTUN_BASLIGI_SATIRI,
    BICIM.sutunBasligi,
  )}${govde}</sheetData>
<autoFilter ref="A${SUTUN_BASLIGI_SATIRI}:${sonSutun}${Math.max(sonSatir, SUTUN_BASLIGI_SATIRI)}"/>
</worksheet>`;
}

/**
 * Tablodan tek sayfalık bir XLSX üretir.
 *
 * `csvBelgesi` ile bilerek simetrik: aynı başlık dizisi ve aynı satır dizisi
 * verildiğinde iki biçim aynı içeriği taşır. Fark, buranın ek olarak bir
 * başlık ve alt başlık alması — CSV'de bunlara yer yoktu, çünkü CSV'nin ilk
 * satırı sütun adlarına ayrılmıştır ve üstüne bir şey yazmak dosyayı
 * elektronik tablo dışındaki her okuyucu için bozardı.
 */
export function xlsxBelgesi(
  baslik: string,
  altBaslik: string,
  sutunlar: readonly XlsxSutun[],
  satirlar: readonly (readonly unknown[])[],
): Buffer {
  return zipOlustur(
    [
      {
        ad: "[Content_Types].xml",
        icerik: Buffer.from(icerikTipleri(), "utf8"),
      },
      { ad: "_rels/.rels", icerik: Buffer.from(kokIliskileri(), "utf8") },
      { ad: "xl/workbook.xml", icerik: Buffer.from(calismaKitabi(), "utf8") },
      {
        ad: "xl/_rels/workbook.xml.rels",
        icerik: Buffer.from(kitapIliskileri(), "utf8"),
      },
      { ad: "xl/styles.xml", icerik: Buffer.from(stilTablosu(), "utf8") },
      {
        ad: "xl/worksheets/sheet1.xml",
        icerik: Buffer.from(
          sayfa(sutunlar, satirlar, baslik, altBaslik),
          "utf8",
        ),
      },
    ],
    { klasorlu: true },
  );
}

/**
 * İndirme yanıtı — `csvYaniti` ile aynı kurallar.
 *
 * Dosya adına tarih yazılır (aynı raporun iki günkü hâli karışmasın) ve
 * `no-store` verilir (kapsam kontrolünden geçen içerik ara bellekte durmamalı).
 */
export function xlsxYaniti(dosyaAdi: string, icerik: Buffer): Response {
  const gun = new Date().toISOString().slice(0, 10);
  const tamAd = `${dosyaAdi}-${gun}.xlsx`;

  return new Response(new Uint8Array(icerik), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(tamAd)}`,
      "Cache-Control": "private, no-store",
    },
  });
}

export { adParcasi };
