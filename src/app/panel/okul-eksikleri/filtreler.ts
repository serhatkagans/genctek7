import { egitimOgretimYili, yilBicimiGecerliMi } from "@/lib/ogretmen/gorev-yillari";
import {
  kirilimGecerliMi,
  type EksikKirilimi,
  type EksikSuzgeci,
} from "@/lib/rapor/okul-eksikleri";
import { koordinatorIlKodu, projeYoneticisiMi } from "@/lib/yetki/izinler";
import type { OturumKullanicisi } from "@/lib/yetki/tipler";
import { tekil, type SorguParametreleri } from "../ogrenciler/filtreler";

/**
 * Okul Eksik Durum ekranının süzgeç çözümlemesi.
 *
 * Ekran ve dışa aktarma AYNI fonksiyonu kullanır: ikisi ayrı yazılsaydı
 * indirilen dosya ekranda görünenden farklı bir küme olabilirdi
 * (`ogrenciler/filtreler.ts` dosya başındaki notun aynı gerekçesi).
 */

/** Adresteki sekme; tanınmayan değer ilk kırılıma düşer. */
export function kirilimCoz(parametreler: SorguParametreleri): EksikKirilimi {
  const deger = tekil(parametreler.kirilim) ?? "";
  return kirilimGecerliMi(deger) ? deger : "danismanYok";
}

/**
 * Süzgeçler + KAPSAM.
 *
 * İL SÜZGECİ YETKİDEN GELİR, adresten değil (bu dosyadaki tek yetki kararı ve
 * bilinçli): koordinatör için `ilKodu` kendi iline SABİTLENİR ve adres
 * çubuğundaki `il` parametresi yok sayılır. Adresten okunsaydı koordinatör
 * başka bir il kodu yazarak o ilin okul eksiklerini görebilirdi — sayım da
 * veridir (bkz. yonetimPanosuIlErisimi'nin gerekçesi).
 *
 * Merkez için `ilKodu` adresten okunur ve boş bırakılabilir (ülke geneli).
 *
 * DÖNEM HER ZAMAN DOLU: temsilcilik dönem bazlı ve yıl verilmezse geçen yılın
 * temsilcisi bu yılın eksiğini gizler. Geçersiz biçimde bir yıl gelirse
 * içinde bulunulan döneme düşülür — hata vermek, adres çubuğuna elle bir şey
 * yazan kişiye boş ekrandan iyi bir şey söylemiyor.
 */
export function eksikSuzgeciniCoz(
  kullanici: OturumKullanicisi,
  parametreler: SorguParametreleri,
): EksikSuzgeci {
  const merkezMi = projeYoneticisiMi(kullanici);
  const koordinatorIli = koordinatorIlKodu(kullanici);
  const yil = tekil(parametreler.yil);

  return {
    ilKodu: merkezMi ? tekil(parametreler.il) : koordinatorIli,
    ilceKodu: tekil(parametreler.ilce),
    okulTuru: tekil(parametreler.okulTuru),
    ara: tekil(parametreler.ara),
    egitimOgretimYili:
      yil && yilBicimiGecerliMi(yil) ? yil : egitimOgretimYili(new Date()),
  };
}

/** Süzgeçleri koruyan sorgu dizesi (sekme ve sayfa hariç tutulabilir). */
export function eksikSorgusu(
  suzgec: EksikSuzgeci,
  ekler: Record<string, string | number | undefined> = {},
): string {
  const sorgu = new URLSearchParams();
  if (suzgec.ilKodu) sorgu.set("il", suzgec.ilKodu);
  if (suzgec.ilceKodu) sorgu.set("ilce", suzgec.ilceKodu);
  if (suzgec.okulTuru) sorgu.set("okulTuru", suzgec.okulTuru);
  if (suzgec.ara) sorgu.set("ara", suzgec.ara);
  sorgu.set("yil", suzgec.egitimOgretimYili);

  for (const [anahtar, deger] of Object.entries(ekler)) {
    if (deger !== undefined && deger !== "") sorgu.set(anahtar, String(deger));
  }

  return sorgu.toString();
}
