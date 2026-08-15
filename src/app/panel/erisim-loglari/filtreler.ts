import type { LogHedefTip, LogIslemi } from "@/generated/prisma/enums";
import {
  LOG_HEDEF_ETIKETLERI,
  LOG_ISLEM_ETIKETLERI,
} from "@/lib/yetki/etiketler";
import type { ErisimLoguFiltresi } from "@/lib/rapor/erisim-logu";
import { gunBasi, gunSonu } from "@/lib/tarih";
import { tekil, type SorguParametreleri } from "../ogrenciler/filtreler";

/**
 * Erişim kayıtları süzgeçlerinin adres çubuğundan okunması.
 *
 * Ekran ve dışa aktarma AYNI çözümlemeyi kullanır (15 Ağustos 2026 · Aşama 2c).
 * Çözümleme önce yalnızca ekranın içinde duruyordu; dışa aktarma eklenirken
 * kopyalansaydı, indirilen dosya ekranda görünenden farklı bir küme olabilir ve
 * bunu kimse fark etmezdi — `ogrenciler/filtreler.ts` dosya başındaki notun
 * aynı gerekçesi.
 *
 * ENUM DEĞERLERİ DOĞRULANIR: adres çubuğundan gelen `islem=SIL` gibi tanınmayan
 * bir değer sorguya olduğu gibi verilseydi Prisma hata fırlatır ve denetim
 * ekranı çökerdi. Tanınmayan değer, süzgeç yokmuş gibi ele alınır.
 */
export function erisimLogFiltreleriniCoz(
  parametreler: SorguParametreleri,
): ErisimLoguFiltresi & { baslangicMetni: string | null; bitisMetni: string | null } {
  const islem = tekil(parametreler.islem) as LogIslemi | null;
  const hedefTip = tekil(parametreler.hedefTip) as LogHedefTip | null;
  const baslangicMetni = tekil(parametreler.baslangic);
  const bitisMetni = tekil(parametreler.bitis);
  const sayfa = Number.parseInt(tekil(parametreler.sayfa) ?? "1", 10);

  return {
    ara: tekil(parametreler.ara),
    islem: islem && islem in LOG_ISLEM_ETIKETLERI ? islem : null,
    hedefTip: hedefTip && hedefTip in LOG_HEDEF_ETIKETLERI ? hedefTip : null,
    baslangic: gunBasi(baslangicMetni),
    bitis: gunSonu(bitisMetni),
    sayfa: Number.isFinite(sayfa) ? sayfa : 1,
    baslangicMetni,
    bitisMetni,
  };
}
