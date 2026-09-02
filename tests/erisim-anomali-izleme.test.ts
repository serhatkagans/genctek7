const hamSorgu = jest.fn();
const anomaliOlustur = jest.fn();
const anomaliGetir = jest.fn();
const anomaliGuncelle = jest.fn();
const yoneticilereBildir = jest.fn();

jest.mock("@/lib/db", () => ({
  prisma: {
    $queryRaw: hamSorgu,
    erisimAnomalisi: {
      create: anomaliOlustur,
      findMany: anomaliGetir,
      update: anomaliGuncelle,
    },
  },
}));

jest.mock("@/lib/bildirim/gonder", () => ({
  BILDIRIM_KODLARI: { ERISIM_ANOMALISI: "ERISIM_ANOMALISI" },
  projeYoneticilerineBildir: yoneticilereBildir,
}));

import { erisimAnomalileriniIzle } from "@/lib/guvenlik/erisim-anomali";

const HAM_BULGU = {
  kullanici_id: 42,
  log_sayisi: 135n,
  benzersiz_hedef_sayisi: 112n,
  ilk_erisim_tarihi: new Date("2026-09-01T06:00:00.000Z"),
  son_erisim_tarihi: new Date("2026-09-01T14:00:00.000Z"),
};

describe("gecelik erişim anomalisi izlemesi", () => {
  it("yüksek hacimli erişimi kalıcı bulguya ve yönetici bildirimine çevirir", async () => {
    hamSorgu.mockResolvedValueOnce([HAM_BULGU]).mockResolvedValueOnce([]);
    anomaliOlustur.mockResolvedValue({ id: 9 });
    anomaliGetir.mockResolvedValue([
      {
        id: 9,
        tur: "YUKSEK_HACIMLI_OGRENCI_ERISIMI",
        logSayisi: 135,
        benzersizHedefSayisi: 112,
        kullanici: { ad: "Ada", soyad: "Yılmaz" },
      },
    ]);
    yoneticilereBildir.mockResolvedValue(2);
    anomaliGuncelle.mockResolvedValue({ id: 9 });

    const sonuc = await erisimAnomalileriniIzle(
      new Date("2026-09-02T00:30:00.000Z"),
    );

    expect(anomaliOlustur).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kullaniciId: 42,
        tur: "YUKSEK_HACIMLI_OGRENCI_ERISIMI",
        gun: new Date("2026-09-01T00:00:00.000Z"),
        logSayisi: 135,
        benzersizHedefSayisi: 112,
      }),
    });
    expect(yoneticilereBildir).toHaveBeenCalledWith(
      "ERISIM_ANOMALISI",
      expect.objectContaining({
        kullaniciAdSoyad: "Ada Yılmaz",
        gun: "2026-09-01",
        logSayisi: "135",
        benzersizHedefSayisi: "112",
      }),
    );
    expect(anomaliGuncelle).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { bildirimTarihi: expect.any(Date) },
    });
    expect(sonuc).toEqual({
      gun: "2026-09-01",
      incelenenAday: 1,
      yeniAnomali: 1,
      gonderilenUyari: 1,
    });
  });

  it("aynı kullanıcı, tür ve gün yeniden bulunursa ikinci bulgu açmaz", async () => {
    hamSorgu.mockResolvedValueOnce([HAM_BULGU]).mockResolvedValueOnce([]);
    anomaliOlustur.mockRejectedValue({ code: "P2002" });
    anomaliGetir.mockResolvedValue([]);

    const sonuc = await erisimAnomalileriniIzle(
      new Date("2026-09-02T00:30:00.000Z"),
    );

    expect(sonuc.yeniAnomali).toBe(0);
    expect(yoneticilereBildir).not.toHaveBeenCalled();
  });

  it("proje yöneticisi yoksa bulguyu bildirildi diye işaretlemez", async () => {
    hamSorgu.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    anomaliGetir.mockResolvedValue([
      {
        id: 11,
        tur: "MESAI_DISI_DISA_AKTARIM",
        logSayisi: 20,
        benzersizHedefSayisi: 20,
        kullanici: { ad: "Ali", soyad: "Demir" },
      },
    ]);
    yoneticilereBildir.mockResolvedValue(0);

    const sonuc = await erisimAnomalileriniIzle(
      new Date("2026-09-02T00:30:00.000Z"),
    );

    expect(sonuc.gonderilenUyari).toBe(0);
    expect(anomaliGuncelle).not.toHaveBeenCalled();
  });
});
