const logOlustur = jest.fn();

jest.mock("@/lib/db", () => ({
  prisma: {
    erisimlogu: {
      create: logOlustur,
    },
  },
}));

import { kimlikDogrulamaLogla } from "@/lib/yetki/log";

describe("oturum iz kaydı", () => {
  it("başarılı girişi doğrulanmış kullanıcıyla GIRIS olarak kaydeder", async () => {
    await kimlikDogrulamaLogla({
      islem: "GIRIS",
      basarili: true,
      kullaniciId: 42,
      saglayici: "EBA",
      ipAdresi: "192.0.2.10",
    });

    expect(logOlustur).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kullaniciId: 42,
        islem: "GIRIS",
        hedefTip: "OTURUM",
        hedefId: "42",
        ipAdresi: "192.0.2.10",
        detay: "Oturum açma başarılı (EBA)",
      }),
    });
  });

  it("başarısız girişte ham kimliği saklamaz ve kullanıcıyı zorunlu tutmaz", async () => {
    const kimlik = "Kisi@Ornek.TC";

    await kimlikDogrulamaLogla({
      islem: "GIRIS",
      basarili: false,
      kimlikBilgisi: kimlik,
      saglayici: "dış kimlik",
      neden: "kimlik doğrulanamadı",
      ipAdresi: "198.51.100.4",
    });

    const veri = logOlustur.mock.calls[0][0].data;
    expect(veri.kullaniciId).toBeNull();
    expect(veri.islem).toBe("GIRIS");
    expect(veri.hedefTip).toBe("OTURUM");
    expect(veri.hedefId).toMatch(/^kimlik:[0-9a-f]{16}$/);
    expect(JSON.stringify(veri)).not.toContain(kimlik);
    expect(veri.detay).toContain("başarısız");
  });

  it("çıkışı CIKIS işlemi olarak kaydeder", async () => {
    await kimlikDogrulamaLogla({
      islem: "CIKIS",
      basarili: true,
      kullaniciId: 7,
      saglayici: "dış kimlik",
      ipAdresi: "203.0.113.2",
    });

    expect(logOlustur).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kullaniciId: 7,
        islem: "CIKIS",
        hedefTip: "OTURUM",
        detay: "Oturum kapama başarılı (dış kimlik)",
      }),
    });
  });
});
