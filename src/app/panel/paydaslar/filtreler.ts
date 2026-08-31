import type { PaydasTuru } from "@/generated/prisma/enums";
import { paydasTuruMu } from "@/lib/paydas/kurallar";
import type { PaydasListeFiltreleri } from "@/lib/yetki/kapsam";
import { type SorguParametreleri, tekil } from "../ogrenciler/filtreler";

/**
 * Paydaş listesi filtrelerinin adres çubuğundan okunması.
 *
 * Ekran ve CSV dışa aktarma aynı çözümlemeyi kullanır; ikisi ayrı yazılırsa
 * indirilen dosya ekranda görünenden farklı bir küme olur ve bunu kimse fark
 * etmez (aynı gerekçe öğrenci ve faaliyet filtrelerinde de yazılı).
 */

export function paydasFiltreleriniCoz(
  parametreler: SorguParametreleri,
): PaydasListeFiltreleri {
  const tur = tekil(parametreler.tur);

  return {
    ilKodu: tekil(parametreler.il),
    // Tanınmayan tür sessizce düşer: filtre yalnızca daralttığı için geçersiz
    // değeri reddetmek yerine yok saymak yeterli.
    tur: tur && paydasTuruMu(tur) ? (tur as PaydasTuru) : null,
    ara: tekil(parametreler.ara),
    // Sütun süzgeci; `ara`dan ayrı tutulur (bkz. kapsam.ts · kurum).
    kurum: tekil(parametreler.kurum),
    pasifleriDeGoster: tekil(parametreler.pasif) === "1",
  };
}

export function paydasFiltresiVarMi(filtreler: PaydasListeFiltreleri): boolean {
  return Object.values(filtreler).some(
    (deger) => deger !== null && deger !== false && deger !== undefined,
  );
}
