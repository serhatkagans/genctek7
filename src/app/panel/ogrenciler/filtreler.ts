import type { OgrenciListeFiltreleri } from "@/lib/yetki/kapsam";

/**
 * Öğrenci listesi filtrelerinin adres çubuğundan okunması.
 *
 * Ekran ve CSV dışa aktarma aynı çözümlemeyi kullanır: ikisi ayrı yazılırsa
 * indirilen dosya ekranda görünenden farklı bir küme olabilir ve bunu kimse
 * fark etmez. Değerler doğrulanmaz, çünkü filtreler yalnızca daraltır
 * (bkz. ogrenciListeFiltresi) — geçersiz değer en kötü ihtimalle boş liste verir.
 */

export type SorguParametreleri = Record<string, string | string[] | undefined>;

/**
 * Sınıf süzgecinin seçenekleri (10 Ağustos 2026).
 *
 * Değer, e-Okul'dan gelen `sinif` alanının ÖN EKİDİR ve süzgeç "içeren"
 * eşleşmesi yapar: "9" seçimi 9-A ve 9/B'yi de kapsar. Şube listesi
 * TEKLİF EDİLMİYOR — şubeler okuldan okula değişir, sabit bir listeye
 * sığmaz ve seviye zaten aranan ayrımı veriyor.
 *
 * Öğrenci envanteri ve Görev Rolleri ekranı aynı listeyi kullanır; iki yerde
 * ayrı yazılsaydı biri "Hazırlık"ı unuttuğunda fark edilmezdi.
 */
export const SINIF_SECENEKLERI: { deger: string; etiket: string }[] = [
  { deger: "Haz", etiket: "Hazırlık" },
  { deger: "9", etiket: "9. sınıf" },
  { deger: "10", etiket: "10. sınıf" },
  { deger: "11", etiket: "11. sınıf" },
  { deger: "12", etiket: "12. sınıf" },
];

export function tekil(deger: string | string[] | undefined): string | null {
  const ilk = Array.isArray(deger) ? deger[0] : deger;
  const kirpilmis = ilk?.trim();
  return kirpilmis ? kirpilmis : null;
}

export function sayiVeyaNull(deger: string | null): number | null {
  const sayi = Number(deger);
  return deger !== null && Number.isFinite(sayi) ? sayi : null;
}

export function ogrenciFiltreleriniCoz(
  parametreler: SorguParametreleri,
): OgrenciListeFiltreleri {
  return {
    ilKodu: tekil(parametreler.il),
    ilceKodu: tekil(parametreler.ilce),
    kurumKodu: sayiVeyaNull(tekil(parametreler.okul)),
    okulTuru: tekil(parametreler.okulTuru),
    sinif: tekil(parametreler.sinif),
    egitimOgretimYili: tekil(parametreler.yil),
    calismaGrubuId: sayiVeyaNull(tekil(parametreler.grup)),
    ara: tekil(parametreler.ara),
    danismansizMi: tekil(parametreler.danismansiz) === "1",
    kazanimTipi: tekil(parametreler.kazanim),
    kazanimAra: tekil(parametreler.kazanimAra),
  };
}

export function filtreVarMi(filtreler: OgrenciListeFiltreleri): boolean {
  return Object.values(filtreler).some(
    (deger) => deger !== null && deger !== false && deger !== undefined,
  );
}

/** Arama parametrelerini bağlantıya çevirir; boş değerler düşer. */
export function sorguMetni(
  parametreler: SorguParametreleri,
  haric: readonly string[] = [],
): string {
  const sorgu = new URLSearchParams();
  for (const [anahtar, deger] of Object.entries(parametreler)) {
    if (haric.includes(anahtar)) continue;
    const ilk = Array.isArray(deger) ? deger[0] : deger;
    if (ilk) sorgu.set(anahtar, ilk);
  }
  return sorgu.toString();
}
