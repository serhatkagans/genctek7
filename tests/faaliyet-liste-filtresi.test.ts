import {
  faaliyetFiltreleriniCoz,
  faaliyetFiltresiVarMi,
  faaliyetListeFiltresi,
  zamanGecerliMi,
  zamanKosulu,
} from "@/app/panel/etkinlikler/filtreler";
import { koordinatorYap, ogrenciYap, projeYoneticisiYap } from "./yardimcilar";

/**
 * Etkinlik listesi filtrelerinin testleri.
 *
 * Asıl konu ONAY KUYRUĞU (11 Ağustos 2026). Proje yöneticisi öğrencinin açtığı
 * her etkinliği onaylayabiliyordu ama panelden ona giden yol `?kapsam=ULUSAL`
 * listesine çıkıyordu: koordinatörsüz bir ilde açılan okul içi öğrenci
 * etkinliği kartta sayılıyor, listede hiç görünmüyordu. Testler o yolun
 * kapsamdan bağımsız olduğunu ve kapsam filtresini gevşetmediğini tutuyor.
 */

const BOS_PARAMETRE = {};

describe("etkinlik liste filtreleri · onay kuyruğu", () => {
  it("adresteki onay=bekleyen okunur, tanınmayan değer düşer", () => {
    expect(
      faaliyetFiltreleriniCoz({ onay: "bekleyen" }).yalnizcaOnayBekleyen,
    ).toBe(true);
    // Filtre yalnızca daralttığı için geçersiz değeri reddetmek yerine yok
    // saymak yeterli; ekranın geri kalanı çalışmaya devam eder.
    expect(faaliyetFiltreleriniCoz({ onay: "hepsi" }).yalnizcaOnayBekleyen).toBe(
      false,
    );
    expect(
      faaliyetFiltreleriniCoz(BOS_PARAMETRE).yalnizcaOnayBekleyen,
    ).toBe(false);
  });

  it("onay kuyruğu 'filtre var' sayılır", () => {
    // "Filtreleri temizle" bağlantısı ve boş liste metni buna bakıyor; sayılmasa
    // kuyruk boşken kullanıcı filtrenin açık olduğunu anlamazdı.
    expect(
      faaliyetFiltresiVarMi(faaliyetFiltreleriniCoz({ onay: "bekleyen" })),
    ).toBe(true);
  });

  it("sorguya yalnızca BEKLIYOR koşulu ekler", () => {
    const filtre = faaliyetListeFiltresi(
      projeYoneticisiYap(),
      faaliyetFiltreleriniCoz({ onay: "bekleyen" }),
      new Date(),
    );
    expect(filtre.AND).toContainEqual({ onayDurumu: "BEKLIYOR" });
  });

  it("kapsam filtresi HER ZAMAN korunur", () => {
    /*
     * Kuyruk filtresinde ayrı bir yetki kontrolü yok ve olmamalı: filtre
     * yalnızca DARALTIR. Bunun güvencesi, kapsam filtresinin koşul listesinde
     * kalmaya devam etmesidir — adres çubuğuna `?onay=bekleyen` yazan öğrenci
     * başkasının bekleyen önerisini göremez.
     */
    const koordinator = koordinatorYap({ ilKodu: "34" });
    const kuyruk = faaliyetListeFiltresi(
      koordinator,
      faaliyetFiltreleriniCoz({ onay: "bekleyen" }),
      new Date(),
    );
    const kuyruksuz = faaliyetListeFiltresi(
      koordinator,
      faaliyetFiltreleriniCoz(BOS_PARAMETRE),
      new Date(),
    );

    const kapsamKosulu = (kuyruksuz.AND as unknown[])[0];
    expect((kuyruk.AND as unknown[])[0]).toEqual(kapsamKosulu);

    // Öğrencide de aynısı: kuyruk filtresi kapsamı olduğu gibi bırakır.
    const ogrenci = ogrenciYap();
    expect(
      (
        faaliyetListeFiltresi(
          ogrenci,
          faaliyetFiltreleriniCoz({ onay: "bekleyen" }),
          new Date(),
        ).AND as unknown[]
      )[0],
    ).toEqual(
      (
        faaliyetListeFiltresi(
          ogrenci,
          faaliyetFiltreleriniCoz(BOS_PARAMETRE),
          new Date(),
        ).AND as unknown[]
      )[0],
    );
  });

  it("kuyruk filtresi kapsam seçiminden bağımsızdır", () => {
    /*
     * ASIL REGRESYON. Panel kartı `?kapsam=ULUSAL`e götürüyordu; okul içi bir
     * öğrenci etkinliği o listeden eleniyordu. Kuyruk filtresi tek başına
     * kullanıldığında sorguya hiçbir kapsam koşulu girmemeli.
     */
    const filtre = faaliyetListeFiltresi(
      projeYoneticisiYap(),
      faaliyetFiltreleriniCoz({ onay: "bekleyen" }),
      new Date(),
    );
    for (const kosul of filtre.AND as Record<string, unknown>[]) {
      expect(kosul).not.toHaveProperty("kapsam");
    }
  });
});

describe("zamanKosulu (Aşama 6b)", () => {
  const simdi = new Date("2026-08-15T12:00:00Z");

  it("hepsi seçiliyken koşul koymaz", () => {
    // Varsayılan sekme daraltma yapmamalı; "Filtreleri temizle"yi de
    // tetiklememeli (bkz. faaliyetFiltresiVarMi).
    expect(zamanKosulu("hepsi", simdi)).toEqual({});
  });

  it("tamamlananlarda bitiş tarihini ölçüt alır", () => {
    /*
     * Çok günlü etkinlikte bitiş, tek günlükte tarih — raporlar ekranındaki
     * bitmişlik ölçütünün aynısı. İki ekran farklı tanım kullansaydı bir
     * etkinlik birinde "bitmiş" öbüründe "devam eden" görünürdü.
     */
    const kosul = zamanKosulu("tamamlanan", simdi);

    expect(kosul.durum).toBe("AKTIF");
    expect(JSON.stringify(kosul.OR)).toContain("bitisTarihi");
    expect(JSON.stringify(kosul.OR)).toContain("tarih");
  });

  it("devam edenler tamamlananların tam tersidir", () => {
    // İkisi birlikte "AKTIF" kümesinin tamamını vermeli; arada kayıp olmamalı.
    const devam = zamanKosulu("devam", simdi);
    const tamamlanan = zamanKosulu("tamamlanan", simdi);

    expect(devam.durum).toBe("AKTIF");
    // `devam` bitmişliği OLUMSUZLAR: NOT'un içeriği tamamlananın koşuludur.
    expect(JSON.stringify(devam.NOT)).toBe(
      JSON.stringify({ OR: tamamlanan.OR }),
    );
  });

  it("iptal edilenleri her iki sekmede de dışarıda bırakır", () => {
    // İptal "yapılmadı" demek; ne devam ediyor ne tamamlandı. "Hepsi"
    // sekmesinde ise durur — listeden düşmesi "etkinliğim kayboldu" olurdu.
    expect(zamanKosulu("devam", simdi).durum).toBe("AKTIF");
    expect(zamanKosulu("tamamlanan", simdi).durum).toBe("AKTIF");
    expect(zamanKosulu("hepsi", simdi).durum).toBeUndefined();
  });
});

describe("zamanGecerliMi", () => {
  it("üç sekmeyi tanır, uydurmayı reddeder", () => {
    expect(zamanGecerliMi("hepsi")).toBe(true);
    expect(zamanGecerliMi("devam")).toBe(true);
    expect(zamanGecerliMi("tamamlanan")).toBe(true);
    expect(zamanGecerliMi("bitmis")).toBe(false);
  });
});
