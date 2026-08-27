import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve, sep } from "node:path";
import { ortam } from "../ortam";
import { uygulamaKoku } from "../uygulama-koku";
import {
  DepolamaHatasi,
  type DepolamaSaglayici,
  type YazmaIstegi,
} from "./tipler";

/**
 * Yerel disk sağlayıcısı.
 *
 * Anahtar biçimi: `yyyy/aa/<uuid>.<uzanti>`. Dosya adı kullanıcıdan GELMEZ,
 * üretilir — kullanıcı adı doğrudan diske yazılsaydı `../` içeren bir ad
 * depolama dizininin dışına çıkabilirdi. Orijinal ad veritabanında
 * (`faaliyet_ek.dosya_adi`) durur ve yalnızca indirirken gösterilir.
 */

/*
 * Bu liste "hangi dosya yüklenebilir" kararını VERMEZ; o karar sistem
 * ayarlarındadır (IZINLI_GORSEL_TIPLERI, IZINLI_BELGE_TIPLERI,
 * IZINLI_CV_TIPLERI). Burada yalnızca kabul edilen bir tipin diskte hangi
 * uzantıyla duracağı yazar — ayara yeni bir MIME tipi eklenirse karşılığı
 * buraya da eklenmelidir, yoksa yazma "desteklenmeyen dosya tipi" ile düşer.
 */
const UZANTILAR: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  // CV için: Word belgeleri (bkz. src/lib/ogrenci/cv-kurallar.ts).
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
};

/** Yalnızca bu sağlayıcının ürettiği biçime uyan anahtarlar kabul edilir. */
const ANAHTAR_DESENI = /^\d{4}\/\d{2}\/[0-9a-f-]{36}\.[a-z0-9]{2,5}$/;

/**
 * Yüklenen dosyaların kökü.
 *
 * GÖRELİ AYAR CWD'YE GÖRE ÇÖZÜLMEZ (27 Ağustos 2026): üretimde standalone
 * çıktı çalışıyor ve çalışma dizini `.next/standalone`; düz `resolve()` yüklenen
 * dosyaları oradaki salt okunur dizine yazmaya çalışıyordu. Gerekçenin tamamı
 * `lib/uygulama-koku.ts` içinde — hata günlüğü de aynı hesabı kullanıyor.
 */
function kokDizin(): string {
  const ayar = ortam.DEPOLAMA_YEREL_DIZIN;
  return isAbsolute(ayar) ? resolve(ayar) : resolve(uygulamaKoku(), ayar);
}

/**
 * Anahtarı mutlak yola çevirir. Desen kontrolü tek başına yeterli sayılmaz;
 * çözülen yolun kök dizinin altında kaldığı ayrıca doğrulanır.
 */
function tamYol(anahtar: string): string {
  if (!ANAHTAR_DESENI.test(anahtar)) {
    throw new DepolamaHatasi("Geçersiz depolama anahtarı.");
  }
  const kok = kokDizin();
  const yol = resolve(kok, anahtar);
  if (yol !== kok && !yol.startsWith(kok + sep)) {
    throw new DepolamaHatasi("Depolama dizininin dışına çıkılamaz.");
  }
  return yol;
}

export class YerelDepolama implements DepolamaSaglayici {
  readonly saglayiciAdi = "yerel";

  async yaz(istek: YazmaIstegi): Promise<string> {
    const uzanti = UZANTILAR[istek.mimeTipi];
    if (!uzanti) {
      throw new DepolamaHatasi(`Desteklenmeyen dosya tipi: ${istek.mimeTipi}`);
    }

    const simdi = new Date();
    const klasor = `${simdi.getFullYear()}/${String(simdi.getMonth() + 1).padStart(2, "0")}`;
    const anahtar = `${klasor}/${randomUUID()}.${uzanti}`;

    await mkdir(join(kokDizin(), klasor), { recursive: true });
    await writeFile(tamYol(anahtar), istek.icerik);
    return anahtar;
  }

  async oku(anahtar: string): Promise<Buffer> {
    return readFile(tamYol(anahtar));
  }

  async sil(anahtar: string): Promise<void> {
    // Kayıt soft-delete edildiği için dosyanın önceden silinmiş olması hata
    // sayılmaz; akışı kesmemesi gerekir.
    await unlink(tamYol(anahtar)).catch(() => undefined);
  }
}
