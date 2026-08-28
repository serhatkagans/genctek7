import { gorselMi, kapakEkiSec } from "@/lib/kazanim/kapak";

/** Ürünün vitrin kapağı — hangi ek kart görseli olur (28 Ağustos 2026). */

function ek(id: number, mimeTipi = "image/png", kapakMi = false) {
  return { id, mimeTipi, kapakMi };
}

describe("gorselMi", () => {
  it("yalnızca image/* tipini görsel sayar", () => {
    expect(gorselMi("image/jpeg")).toBe(true);
    expect(gorselMi("application/pdf")).toBe(false);
  });
});

describe("kapakEkiSec", () => {
  it("eki olmayan üründe kapak yoktur", () => {
    expect(kapakEkiSec([])).toBeNull();
  });

  it("yalnızca belge yüklenmişse kapak yoktur", () => {
    expect(kapakEkiSec([ek(1, "application/pdf")])).toBeNull();
  });

  it("işaretli ek kapaktır — yükleme sırasından bağımsız", () => {
    const secilen = kapakEkiSec([ek(1), ek(2), ek(3, "image/png", true)]);
    expect(secilen?.id).toBe(3);
  });

  it("işaret yoksa en eski görsele düşer: eski ürünler kapaksız kalmasın", () => {
    const secilen = kapakEkiSec([ek(7), ek(4), ek(9)]);
    expect(secilen?.id).toBe(4);
  });

  it("en eski ek belge ise ilk GÖRSELE düşer", () => {
    const secilen = kapakEkiSec([ek(1, "application/pdf"), ek(5), ek(8)]);
    expect(secilen?.id).toBe(5);
  });

  it("görsel olmayan bir ek işaretlenmişse kapak sayılmaz", () => {
    const secilen = kapakEkiSec([ek(1, "application/pdf", true), ek(6)]);
    expect(secilen?.id).toBe(6);
  });
});
