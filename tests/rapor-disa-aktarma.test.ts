import { inflateRawSync } from "node:zlib";
import {
  altBaslikYaz,
  basliklardanSutunlar,
  bicimCoz,
  disaAktarmaYaniti,
} from "@/lib/rapor/disa-aktarma";

/**
 * Dışa aktarmanın ortak yüzeyi (15 Ağustos 2026 · Aşama 2).
 *
 * Buradaki asıl güvence CSV'nin ÇALIŞMAYA DEVAM ETMESİ: `disa-aktarma-dogrula`
 * betiği kapsam güvenliğini CSV satırlarını sayarak doğruluyor ve varsayılan
 * XLSX'e çevrildiği için o yol sessizce kırılabilirdi.
 */

async function metin(yanit: Response): Promise<string> {
  return await yanit.text();
}

/** XLSX yanıtındaki sayfa XML'ini çözer. */
async function sayfaXmli(yanit: Response): Promise<string> {
  const arsiv = Buffer.from(await yanit.arrayBuffer());
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

    if (ad === "xl/worksheets/sheet1.xml") {
      return (yontem === 8 ? inflateRawSync(ham) : ham).toString("utf8");
    }
    konum = veriBaslangici + sikBoyut;
  }

  throw new Error("Sayfa bulunamadı");
}

const SUTUNLAR = [
  { baslik: "Ad", genislik: 20 },
  { baslik: "Tarih", genislik: 12 },
];

function istem(bicim: "xlsx" | "csv", satirlar: unknown[][]) {
  return {
    bicim,
    dosyaAdi: "genctek-deneme",
    baslik: "GençTek Ekosistemi",
    altBaslik: "Deneme",
    sutunlar: SUTUNLAR,
    satirlar,
  };
}

describe("bicimCoz", () => {
  it("varsayılan olarak XLSX seçer", () => {
    expect(bicimCoz(new URL("https://x/panel/ogrenciler/disa-aktar"))).toBe(
      "xlsx",
    );
  });

  it("bicim=csv ile CSV seçer", () => {
    // Doğrulama betiğinin ve olası entegrasyonların kullandığı yol.
    expect(bicimCoz(new URL("https://x/a?bicim=csv"))).toBe("csv");
  });

  it("tanınmayan değeri XLSX sayar", () => {
    // Hata vermek, elle adres yazan kişiye boş dosyadan iyi bir şey söylemiyor.
    expect(bicimCoz(new URL("https://x/a?bicim=pdf"))).toBe("xlsx");
  });

  it("başka parametreleri karıştırmaz", () => {
    expect(bicimCoz(new URL("https://x/a?il=34&bicim=csv&sinif=9"))).toBe("csv");
  });
});

describe("disaAktarmaYaniti · CSV yolu", () => {
  it("CSV başlıklarını ilk satıra yazar, başlık bloğu eklemez", async () => {
    /*
     * XLSX'te üstte başlık ve alt başlık var; CSV'ye eklenselerdi dosyayı
     * ayrıştıran her okuyucu (doğrulama betiği dahil) ilk satırı sütun adı
     * sanardı.
     */
    const govde = await metin(
      disaAktarmaYaniti(istem("csv", [["Ayşe", "01.01.2026"]])),
    );
    const satirlar = govde.replace(/^﻿/, "").trim().split("\r\n");

    expect(satirlar[0]).toBe("Ad;Tarih");
    expect(satirlar).toHaveLength(2);
    expect(govde).not.toContain("GençTek Ekosistemi");
  });

  it("tarihi okunabilir metne çevirir", async () => {
    // CSV'de hücre tipi yok; ham `Date` "Sat Aug 15 2026 03:00:00 GMT+0300" olurdu.
    const govde = await metin(
      disaAktarmaYaniti(istem("csv", [["Ayşe", new Date("2026-06-16T08:00:00Z")]])),
    );

    expect(govde).toContain("16 Haziran 2026");
    expect(govde).not.toContain("GMT");
  });

  it("geçersiz tarihi boş bırakır", async () => {
    const govde = await metin(
      disaAktarmaYaniti(istem("csv", [["Ayşe", new Date("gecersiz")]])),
    );

    expect(govde).not.toContain("Invalid");
  });

  it("CSV içerik tipini ve .csv uzantısını verir", async () => {
    const yanit = disaAktarmaYaniti(istem("csv", []));

    expect(yanit.headers.get("Content-Type")).toContain("text/csv");
    expect(yanit.headers.get("Content-Disposition")).toContain(".csv");
  });
});

describe("disaAktarmaYaniti · XLSX yolu", () => {
  it("başlık bloğunu ve sütunları yazar", async () => {
    const xml = await sayfaXmli(
      disaAktarmaYaniti(istem("xlsx", [["Ayşe", new Date("2026-06-16T00:00:00Z")]])),
    );

    expect(xml).toContain("GençTek Ekosistemi");
    expect(xml).toContain("Tarih");
  });

  it("tarihi gerçek tarih hücresi yapar", async () => {
    // CSV'de metin, XLSX'te seri numarası: aynı satır dizisinden iki farklı
    // doğru çıktı.
    const xml = await sayfaXmli(
      disaAktarmaYaniti(istem("xlsx", [["Ayşe", new Date("2026-06-16T00:00:00Z")]])),
    );

    expect(xml).toContain('s="5"><v>46189</v>');
    expect(xml).not.toContain("Haziran");
  });

  it("XLSX içerik tipini ve .xlsx uzantısını verir", async () => {
    const yanit = disaAktarmaYaniti(istem("xlsx", []));

    expect(yanit.headers.get("Content-Type")).toContain("spreadsheetml.sheet");
    expect(yanit.headers.get("Content-Disposition")).toContain(".xlsx");
  });
});

describe("disaAktarmaYaniti · iki biçim aynı veriyi taşır", () => {
  it("aynı satırlardan aynı hücre içeriğini üretir", async () => {
    /*
     * İki biçim ayrı hazırlansaydı biri sütun eklenip diğeri unutulduğunda
     * fark, iki dosyayı yan yana açan biri çıkana kadar görünmezdi.
     */
    const satirlar = [
      ["Ayşe Yılmaz", "9-A"],
      ["Mehmet Öz", "10-B"],
    ];

    const csv = await metin(disaAktarmaYaniti(istem("csv", satirlar)));
    const xml = await sayfaXmli(disaAktarmaYaniti(istem("xlsx", satirlar)));

    for (const deger of ["Ayşe Yılmaz", "9-A", "Mehmet Öz", "10-B"]) {
      expect(csv).toContain(deger);
      expect(xml).toContain(deger);
    }
  });
});

describe("basliklardanSutunlar", () => {
  it("düz başlıkları sütuna çevirir", () => {
    // Kırılım istatistiğinde sütun kümesi çalışma anında belirleniyor.
    expect(basliklardanSutunlar(["İl", "Okul"])).toEqual([
      { baslik: "İl", genislik: undefined },
      { baslik: "Okul", genislik: undefined },
    ]);
  });
});

describe("altBaslikYaz", () => {
  it("açıklamayı, tarihi ve kayıt sayısını birleştirir", () => {
    // Dosya e-posta ekiyle dolaşıyor; "neyin listesi ve tam mı" içeride yazılı.
    const alt = altBaslikYaz("Öğrenci envanteri", 42);

    expect(alt).toContain("Öğrenci envanteri");
    expect(alt).toContain("42 kayıt");
  });
});
