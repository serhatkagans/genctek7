import { tarihSaatYaz, tarihYaz } from "@/lib/tarih";

/*
 * Sunucu UTC'de çalışıyor (2 Eylül 2026'da doğrulandı: `timedatectl` → UTC,
 * servis biriminde TZ tanımlı değil). Biçimleyiciler saat dilimini süreç
 * ortamından alsaydı panelde basılan her saat 3 saat geride görünürdü —
 * "erişim kayıtlarında son 2-3 saatin kaydı yok" şikâyeti buydu; kayıtlar
 * yerindeydi, damgaları yanlıştı. Bu yüzden saat dilimi kodda sabit ve bu
 * sınama onu koruyor.
 */
describe("tarih biçimleme saat dilimi", () => {
  it("saati UTC'de değil İstanbul saatiyle basar", () => {
    // 15:20 UTC = 18:20 İstanbul.
    expect(tarihSaatYaz(new Date("2026-09-02T15:20:38.142Z"))).toBe(
      "2 Eylül 2026 18:20",
    );
  });

  it("gün dönümünü İstanbul takvimine göre yazar", () => {
    // UTC'de hâlâ 2 Eylül, İstanbul'da 3 Eylül başlamış.
    expect(tarihYaz(new Date("2026-09-02T21:30:00.000Z"))).toBe(
      "3 Eylül 2026",
    );
  });
});
