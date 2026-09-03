import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function oku(yol: string): string {
  return readFileSync(resolve(process.cwd(), yol), "utf8");
}

describe("yazılı bilgi güvenliği prosedürleri", () => {
  it("ihlal planı 72 saati çözüm süresi değil bildirim üst sınırı olarak tanımlar", () => {
    const plan = oku("kurulum/veri-ihlali-mudahale-ve-bildirim-plani.md");

    expect(plan).toContain("72 saat çözüm süresi değildir");
    expect(plan).toContain("en geç 72 saat içinde");
    expect(plan).toContain("aşamalı olarak tamamlanır");
    expect(plan).toContain("makul olan en kısa sürede");
    expect(plan).toContain("veri-ihlali-kayit-sablonu.csv");
  });

  it("yapay zekâ kuralı onay listesini ve yasak veri sınıflarını açıklar", () => {
    const kural = oku("kurulum/yapay-zeka-kullanim-kurali.md");

    expect(kural).toMatch(/onaylanmış yapay zekâ\s+aracı yoktur/);
    expect(kural).toContain("Üretim verisi geliştirme, test, hata ayıklama");
    expect(kural).toContain("Ayrı test ortamı");
    expect(kural).toContain("OTURUM_GIZLI_ANAHTARI");
    expect(kural).toContain("veri-ihlali-mudahale-ve-bildirim-plani.md");
  });

  it("yetki incelemesi kişiyi, zamanı, kararı ve anahtar rotasyonunu kayda bağlar", () => {
    const prosedur = oku(
      "kurulum/yetki-ve-servis-hesabi-gozden-gecirme-proseduru.md",
    );
    const sablon = oku(
      "kurulum/kayitlar/yetki-servis-hesabi-gozden-gecirme-sablonu.csv",
    );

    expect(prosedur).toContain("Üç ayda bir");
    expect(prosedur).toContain("`OTURUM_GIZLI_ANAHTARI` | 90 gün");
    expect(prosedur).toContain("`SMTP_SIFRE`, `SMS_API_ANAHTARI` | 180 gün");
    expect(prosedur).toMatch(
      /Boş\s+şablon, tamamlanmış inceleme kanıtı değildir/,
    );
    expect(sablon).toContain("inceleyen,inceleme_zamani,onaylayan,onay_zamani");
  });
});
