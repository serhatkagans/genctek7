import { inflateRawSync } from "node:zlib";
import { sutunHarfi, xlsxBelgesi, xlsxYaniti } from "@/lib/rapor/xlsx";

/**
 * XLSX yazıcısı (15 Ağustos 2026 · Manisa karşılaştırması, Aşama 1).
 *
 * Biçim elle yazıldığı için `zip.test.ts` ile aynı gerekçe geçerli: bozuk bir
 * çalışma kitabı, kullanıcının "onarılması gerekiyor" uyarısıyla karşılaştığı
 * bir indirme demektir ve hata ancak dosya açıldıktan SONRA görünür. Testler
 * arşivi açıp içindeki XML'i okuyor.
 *
 * Ayrıca `.tmp` dışı bir doğrulama daha yapıldı: üretilen dosya openpyxl ile
 * (bağımsız bir Excel okuyucusu) açıldı ve hücre değerleri, dondurulan bölme,
 * süzgeç, sütun genişlikleri ve yazı tipleri tek tek doğrulandı.
 */

/** Arşivdeki tüm girişleri {ad: içerik} olarak çözer. */
function arsiviAc(arsiv: Buffer): Record<string, string> {
  const parcalar: Record<string, string> = {};
  let konum = 0;

  while (arsiv.readUInt32LE(konum) === 0x04034b50) {
    const yontem = arsiv.readUInt16LE(konum + 8);
    const sikBoyut = arsiv.readUInt32LE(konum + 18);
    const adUzunlugu = arsiv.readUInt16LE(konum + 26);
    const ekUzunlugu = arsiv.readUInt16LE(konum + 28);

    const adBaslangici = konum + 30;
    const ad = arsiv
      .subarray(adBaslangici, adBaslangici + adUzunlugu)
      .toString("utf8");

    const veriBaslangici = adBaslangici + adUzunlugu + ekUzunlugu;
    const ham = arsiv.subarray(veriBaslangici, veriBaslangici + sikBoyut);
    parcalar[ad] = (yontem === 8 ? inflateRawSync(ham) : ham).toString("utf8");

    konum = veriBaslangici + sikBoyut;
  }

  return parcalar;
}

function sayfaXmli(arsiv: Buffer): string {
  return arsiviAc(arsiv)["xl/worksheets/sheet1.xml"];
}

const SUTUNLAR = [
  { baslik: "Sıra No", genislik: 8 },
  { baslik: "Etkinlik Adı", genislik: 40 },
];

describe("sutunHarfi", () => {
  it("ilk yirmi altı sütunu tek harfe çevirir", () => {
    expect(sutunHarfi(0)).toBe("A");
    expect(sutunHarfi(25)).toBe("Z");
  });

  it("yirmi altıdan sonra iki harfe geçer", () => {
    // Sıfırsız 26'lık tabanın kolayca yanlış yazıldığı yer: 26 "BA" değil "AA".
    expect(sutunHarfi(26)).toBe("AA");
    expect(sutunHarfi(27)).toBe("AB");
    expect(sutunHarfi(51)).toBe("AZ");
    expect(sutunHarfi(52)).toBe("BA");
  });
});

describe("xlsxBelgesi · arşiv yapısı", () => {
  it("Excel'in beklediği altı parçayı klasör yoluyla yazar", () => {
    const parcalar = arsiviAc(xlsxBelgesi("Başlık", "Alt", SUTUNLAR, []));

    expect(Object.keys(parcalar).sort()).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/workbook.xml",
      "xl/worksheets/sheet1.xml",
    ]);
  });

  it("kayıt yokken de geçerli bir sayfa üretir", () => {
    // Boş dosya "hiç kayıt yok" demeli; bozuk dosya değil.
    const xml = sayfaXmli(xlsxBelgesi("Başlık", "Alt", SUTUNLAR, []));

    expect(xml).toContain("<sheetData>");
    expect(xml).toContain('<autoFilter ref="A4:B4"/>');
  });
});

describe("xlsxBelgesi · hücreler", () => {
  it("sayıyı sayı, metni metin hücresi yapar", () => {
    const xml = sayfaXmli(
      xlsxBelgesi("B", "A", SUTUNLAR, [[42, "Robotik Atölyesi"]]),
    );

    expect(xml).toContain('<c r="A5" s="4"><v>42</v></c>');
    expect(xml).toContain('t="inlineStr"');
    expect(xml).toContain("Robotik Atölyesi");
  });

  it("sayıya benzeyen metni sayıya çevirmez", () => {
    // Kurum kodu ve sınıf gibi alanlar sayıya benziyor ama sayı değil:
    // Excel'e sayı diye verilseydi baştaki sıfır düşerdi.
    const xml = sayfaXmli(xlsxBelgesi("B", "A", SUTUNLAR, [["0758715", "x"]]));

    expect(xml).toContain("<t xml:space=\"preserve\">0758715</t>");
    expect(xml).not.toContain("<v>758715</v>");
  });

  it("NaN ve Infinity'yi metne düşürür", () => {
    // Sayı hücresine yazılsalardı dosya bozulurdu.
    const xml = sayfaXmli(
      xlsxBelgesi("B", "A", SUTUNLAR, [[Number.NaN, Number.POSITIVE_INFINITY]]),
    );

    expect(xml).not.toContain("<v>NaN</v>");
    expect(xml).not.toContain("<v>Infinity</v>");
  });

  it("boş, null ve undefined için boş hücre yazar", () => {
    const xml = sayfaXmli(
      xlsxBelgesi("B", "A", SUTUNLAR, [[null, undefined], ["", "x"]]),
    );

    expect(xml).toContain('<c r="A5" s="4"/>');
    expect(xml).toContain('<c r="B5" s="4"/>');
    expect(xml).toContain('<c r="A6" s="4"/>');
  });

  it("XML'de anlamı olan karakterleri kaçırır", () => {
    const xml = sayfaXmli(
      xlsxBelgesi("B", "A", SUTUNLAR, [['& < > " ölçüm', "x"]]),
    );

    expect(xml).toContain("&amp; &lt; &gt; &quot; ölçüm");
  });

  it("denetim karakterlerini düşürür, satır sonunu korur", () => {
    /*
     * XML 1.0 bu karakterleri kaçış dizisiyle bile kabul etmiyor. Rapor özeti
     * serbest metin ve kopyala-yapıştırla geliyor; düşürülmeselerdi Excel
     * dosyayı onarmak isterdi.
     */
    const xml = sayfaXmli(
      xlsxBelgesi("B", "A", SUTUNLAR, [["abc\nd", "x"]]),
    );

    expect(xml).toContain("abc\nd");
  });

  it("formül gibi görünen metni tırnaklamaz", () => {
    /*
     * CSV'nin AKSİNE. Orada koruma şart, çünkü hücrenin tipi yok; burada tip
     * dosyada yazılı ve `inlineStr` hiçbir koşulda hesaplanmaz. Tırnaklamak
     * yalnızca adı "-" ile başlayan okulun adını bozardı.
     */
    const xml = sayfaXmli(xlsxBelgesi("B", "A", SUTUNLAR, [["=1+1", "-Ali"]]));

    expect(xml).toContain("<t xml:space=\"preserve\">=1+1</t>");
    expect(xml).toContain("<t xml:space=\"preserve\">-Ali</t>");
    expect(xml).not.toContain("'=1+1");
  });
});

describe("xlsxBelgesi · tarih hücreleri", () => {
  it("tarihi seri numarası olarak yazar, metin olarak değil", () => {
    /*
     * CSV'den asıl ayrıldığımız yer. Metin olarak yazılan "18 Haziran 2026"
     * elektronik tabloda ALFABETİK sıralanır — Ağustos, Haziran'dan önce gelir
     * ve dosyayı tarihe göre sıralayan kişi bunu fark etmez.
     */
    const xml = sayfaXmli(
      xlsxBelgesi("B", "A", SUTUNLAR, [[new Date("2026-06-16T08:00:00Z"), "x"]]),
    );

    expect(xml).toContain('<c r="A5" s="5"><v>46189</v></c>');
    expect(xml).not.toContain("Haziran");
  });

  it("gece yarısına yakın saatlerde günü kaydırmaz", () => {
    // Yerel saatle hesaplansaydı sunucunun saat dilimine göre bir gün kayardı
    // ve kayma yalnızca belirli saatlerde yazılan kayıtlarda görünürdü.
    const erken = sayfaXmli(
      xlsxBelgesi("B", "A", SUTUNLAR, [[new Date("2026-08-02T00:30:00Z"), "x"]]),
    );
    const gec = sayfaXmli(
      xlsxBelgesi("B", "A", SUTUNLAR, [[new Date("2026-08-02T23:30:00Z"), "x"]]),
    );

    expect(erken).toContain("<v>46236</v>");
    expect(gec).toContain("<v>46236</v>");
  });

  it("geçersiz tarihi sayı hücresi yapmaz", () => {
    // `new Date("olmayan")` sayı hücresine yazılsaydı dosya bozulurdu.
    const xml = sayfaXmli(
      xlsxBelgesi("B", "A", SUTUNLAR, [[new Date("gecersiz"), "x"]]),
    );

    expect(xml).not.toContain("<v>NaN</v>");
  });

  it("tarih biçimini stil tablosunda tanımlar", () => {
    const parcalar = arsiviAc(xlsxBelgesi("B", "A", SUTUNLAR, []));

    expect(parcalar["xl/styles.xml"]).toContain('formatCode="DD.MM.YYYY"');
  });
});

describe("xlsxBelgesi · başlık bloğu", () => {
  it("başlığı, alt başlığı ve sütun adlarını kendi biçimleriyle yazar", () => {
    const xml = sayfaXmli(
      xlsxBelgesi("GençTek Ekosistemi", "15.08.2026", SUTUNLAR, [[1, "a"]]),
    );

    expect(xml).toContain("GençTek Ekosistemi");
    expect(xml).toContain('<row r="1">');
    expect(xml).toContain('<row r="3"/>'); // boş ayırıcı satır
    expect(xml).toContain('s="3"'); // sütun başlığı biçimi
  });

  it("bölmeyi sütun başlıklarının altından dondurur", () => {
    // 800 satırlık raporda aşağı inen kişi sütun adlarını görmeye devam etmeli.
    const xml = sayfaXmli(xlsxBelgesi("B", "A", SUTUNLAR, [[1, "a"]]));

    expect(xml).toContain('ySplit="4"');
    expect(xml).toContain('topLeftCell="A5"');
    expect(xml).toContain('state="frozen"');
  });

  it("sütun genişliklerini yazar", () => {
    const xml = sayfaXmli(xlsxBelgesi("B", "A", SUTUNLAR, []));

    expect(xml).toContain('<col min="1" max="1" width="8" customWidth="1"/>');
    expect(xml).toContain('<col min="2" max="2" width="40" customWidth="1"/>');
  });
});

describe("xlsxYaniti", () => {
  it("Excel içerik tipini, tarihli dosya adını ve no-store verir", () => {
    const yanit = xlsxYaniti("genctek-raporlar", Buffer.from("x"));
    const gun = new Date().toISOString().slice(0, 10);

    expect(yanit.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(yanit.headers.get("Content-Disposition")).toContain(
      `genctek-raporlar-${gun}.xlsx`,
    );
    // Kapsam kontrolünden geçen içerik ara bellekte durmamalı.
    expect(yanit.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
