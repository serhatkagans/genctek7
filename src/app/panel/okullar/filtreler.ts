import {
  danismanDurumuGecerliMi,
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
    // Sütun süzgeçleri; `ara`dan ayrı tutulur (bkz. yonetim-kurallari.ts).
    okulAdi: tekil(parametreler.okul),
    kurumKodu: tekil(parametreler.kurumKodu),
    /*
      EKİP SÜZGECİ BU EKRANDAN KALKTI (27 Ağustos 2026 · istek: "bunları sil ·
      Ekip tanımlanan / Ekip tanımlanmayan"). Kural katmanındaki `ekipDurumu`
      duruyor (yonetim-kurallari.ts) — ekip envanteri kendi ekranında aynı
      soruyu soruyor; kalkan yalnızca buradaki sekme şeridi.
    */
    danismanDurumu: (() => {
      const deger = tekil(parametreler.danisman) ?? "hepsi";
      return danismanDurumuGecerliMi(deger) ? deger : "hepsi";
    })(),
  };
}

/*
 * "ARAMAYA BAŞLAYIN" KAPISI KALKTI (27 Ağustos 2026 · istek: "buraya tüm
 * okulları listeleyeceğim alan gelsin").
 *
 * `listeBasilsinMi` ekranı süzgeçsiz açılışta boş bırakıyordu; gerekçesi
 * "ülke genelinde on binlerce okul var, ilk 50'si hiçbir soruya cevap vermez"
 * idi. İstek bunun tersini söylüyor ve teknik engel de yok: liste ZATEN
 * sayfalı (SAYFA_BOYUTU = 50, skip/take) — süzgeçsiz açılışın maliyeti bir
 * `count` ile 50 satır, listenin tamamı hiçbir zaman çekilmiyor.
 *
 * Fonksiyon tümüyle silindi; `?kirilim`li dallar gibi geride bir "her zaman
 * true dönen" koşul bırakmak, okuyan kişiye hâlâ bir kapı varmış izlenimi
 * verirdi. Dosya çıktısı da aynı kapıyı kullanıyordu (disa-aktar/route.ts) ve
 * o da açıldı: ekran neyi listeliyorsa CSV de onu indirmeli.
 */

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
  if (suzgec.okulAdi) sorgu.set("okul", suzgec.okulAdi);
  if (suzgec.kurumKodu) sorgu.set("kurumKodu", suzgec.kurumKodu);
  if (suzgec.danismanDurumu && suzgec.danismanDurumu !== "hepsi") {
    sorgu.set("danisman", suzgec.danismanDurumu);
  }

  for (const [anahtar, deger] of Object.entries(ekler)) {
    if (deger !== undefined && deger !== "") sorgu.set(anahtar, String(deger));
  }

  return sorgu.toString();
}
