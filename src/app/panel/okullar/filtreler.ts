import {
  ekipDurumuGecerliMi,
  type OkulSuzgeci,
} from "@/lib/rapor/yonetim-kurallari";
import { koordinatorIlKodu, projeYoneticisiMi } from "@/lib/yetki/izinler";
import type { OturumKullanicisi } from "@/lib/yetki/tipler";
import { tekil, type SorguParametreleri } from "../ogrenciler/filtreler";

/**
 * Okullar ekranının süzgeç çözümlemesi — ekran ve dosya ortak kullanır.
 *
 * İL SÜZGECİ YETKİDEN GELİR, adresten değil: koordinatör için `ilKodu` kendi
 * iline SABİTLENİR ve adres çubuğundaki `il` yok sayılır. Okul Eksik Durum
 * ekranındaki kararın aynısı ve gerekçesi de aynı — sayım da veridir
 * (bkz. yonetimPanosuIlErisimi).
 */
export function okulSuzgeciniCoz(
  kullanici: OturumKullanicisi,
  parametreler: SorguParametreleri,
): OkulSuzgeci {
  const merkezMi = projeYoneticisiMi(kullanici);

  return {
    ilKodu: merkezMi ? tekil(parametreler.il) : koordinatorIlKodu(kullanici),
    ilceKodu: tekil(parametreler.ilce),
    okulTuru: tekil(parametreler.okulTuru),
    ara: tekil(parametreler.ara),
    ekipDurumu: (() => {
      const deger = tekil(parametreler.ekip) ?? "hepsi";
      return ekipDurumuGecerliMi(deger) ? deger : "hepsi";
    })(),
  };
}

/**
 * Ekranın süzgeçsiz açılıp açılmayacağı.
 *
 * MERKEZ İÇİN SÜZGEÇSİZ AÇILIŞTA LİSTE BASILMAZ (`manisa-farklari-plani.md` ·
 * Aşama 4a). Manisa'nın ekranı tek il için tasarlanmış: 156 okul, açılışta düz
 * liste, kaydırarak da bulunabilir. Ulusal ölçekte aynı düzen on binlerce okul
 * demek — her açılışta ödenen bir tam tablo taraması ve zaten kaydırılarak
 * kullanılamayacak bir liste.
 *
 * Boş durum bir eksiklik değil ekranın çalışma biçimi: 50 bin kayıtlık listenin
 * ilk 50'si hiçbir soruya cevap vermiyor.
 *
 * KOORDİNATÖRDE HER ZAMAN LİSTE VAR: ili zaten sabit, yani ekran doğrudan
 * Manisa ölçeğinde açılıyor. Ölçek sorunu yalnızca merkezin sorunu.
 */
export function listeBasilsinMi(suzgec: OkulSuzgeci): boolean {
  return Boolean(
    suzgec.ilKodu ||
      suzgec.ilceKodu ||
      suzgec.okulTuru ||
      suzgec.ara?.trim(),
  );
  /*
   * SEKME TEK BAŞINA LİSTE AÇMAZ: "ekip tanımlanmayan okullar" ülke genelinde
   * on binlerce satır demek ve ekranın var oluş sebebi tam olarak bunu
   * basmamak. Sekme bir daraltma, arama yerine geçmiyor.
   */
}

/** Süzgeçleri koruyan sorgu dizesi. */
export function okulSorgusu(
  suzgec: OkulSuzgeci,
  ekler: Record<string, string | number | undefined> = {},
): string {
  const sorgu = new URLSearchParams();
  if (suzgec.ilKodu) sorgu.set("il", suzgec.ilKodu);
  if (suzgec.ilceKodu) sorgu.set("ilce", suzgec.ilceKodu);
  if (suzgec.okulTuru) sorgu.set("okulTuru", suzgec.okulTuru);
  if (suzgec.ara) sorgu.set("ara", suzgec.ara);
  if (suzgec.ekipDurumu && suzgec.ekipDurumu !== "hepsi") {
    sorgu.set("ekip", suzgec.ekipDurumu);
  }

  for (const [anahtar, deger] of Object.entries(ekler)) {
    if (deger !== undefined && deger !== "") sorgu.set(anahtar, String(deger));
  }

  return sorgu.toString();
}
