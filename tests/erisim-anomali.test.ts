import {
  anomaliTuruEtiketi,
  GUNLUK_OGRENCI_ERISIM_ESIGI,
  MESAI_BASLANGIC_SAATI,
  MESAI_BITIS_SAATI,
  oncekiIstanbulGunu,
} from "@/lib/guvenlik/erisim-anomali-kurallari";

describe("erişim anomalisi kuralları", () => {
  it("gecelik çalışmada tamamlanmış önceki İstanbul gününü tarar", () => {
    const pencere = oncekiIstanbulGunu(new Date("2026-09-02T00:30:00.000Z"));

    expect(pencere.gun).toBe("2026-09-01");
    expect(pencere.baslangic.toISOString()).toBe("2026-08-31T21:00:00.000Z");
    expect(pencere.bitis.toISOString()).toBe("2026-09-01T21:00:00.000Z");
  });

  it("UTC tarihi değil İstanbul takvim gününü esas alır", () => {
    // UTC'de 1 Eylül olsa da İstanbul'da 2 Eylül başlamıştır.
    const pencere = oncekiIstanbulGunu(new Date("2026-09-01T21:30:00.000Z"));
    expect(pencere.gun).toBe("2026-09-01");
  });

  it("yüksek hacim ve mesai sınırlarını açıkça sabitler", () => {
    expect(GUNLUK_OGRENCI_ERISIM_ESIGI).toBe(100);
    expect(MESAI_BASLANGIC_SAATI).toBe(8);
    expect(MESAI_BITIS_SAATI).toBe(18);
  });

  it("uyarı türlerini yöneticiye okunabilir adla verir", () => {
    expect(anomaliTuruEtiketi("YUKSEK_HACIMLI_OGRENCI_ERISIMI")).toContain(
      "Yüksek hacimli",
    );
    expect(anomaliTuruEtiketi("MESAI_DISI_DISA_AKTARIM")).toContain(
      "Mesai dışı",
    );
  });
});
