import type { FaaliyetKapsami, OturumKullanicisi } from "@/lib/yetki/tipler";

/** Testlerde kullanılan kullanıcı ve faaliyet üreticileri. */

const TEMEL: OturumKullanicisi = {
  id: 1,
  ad: "Test",
  soyad: "Kullanıcı",
  kurumKodu: null,
  ilKodu: null,
  ilceKodu: null,
  sinif: null,
  brans: null,
  egitimOgretimYili: "2025-2026",
  roller: [],
};

export function ogrenciYap(
  ozellikler: Partial<OturumKullanicisi> = {},
): OturumKullanicisi {
  return {
    ...TEMEL,
    id: 100,
    kurumKodu: 750001,
    ilKodu: "34",
    ilceKodu: "3401",
    sinif: "11-A",
    roller: [{ rolKodu: "OGRENCI", ilKodu: null, kurumKodu: null }],
    ...ozellikler,
  };
}

export function danismanYap(
  ozellikler: Partial<OturumKullanicisi> = {},
): OturumKullanicisi {
  const kurumKodu = ozellikler.kurumKodu ?? 750001;
  return {
    ...TEMEL,
    id: 200,
    kurumKodu,
    ilKodu: "34",
    ilceKodu: "3401",
    brans: "Bilişim Teknolojileri",
    roller: [{ rolKodu: "DANISMAN", ilKodu: null, kurumKodu }],
    ...ozellikler,
  };
}

export function rolsuzOgretmenYap(
  ozellikler: Partial<OturumKullanicisi> = {},
): OturumKullanicisi {
  return {
    ...TEMEL,
    id: 250,
    kurumKodu: 750001,
    ilKodu: "34",
    brans: "Fizik",
    roller: [],
    ...ozellikler,
  };
}

export function koordinatorYap(
  ozellikler: Partial<OturumKullanicisi> = {},
): OturumKullanicisi {
  const ilKodu = ozellikler.ilKodu ?? "34";
  return {
    ...TEMEL,
    id: 300,
    kurumKodu: null,
    ilKodu,
    roller: [{ rolKodu: "IL_KOORDINATOR", ilKodu, kurumKodu: null }],
    ...ozellikler,
  };
}

export function projeYoneticisiYap(
  ozellikler: Partial<OturumKullanicisi> = {},
): OturumKullanicisi {
  return {
    ...TEMEL,
    id: 400,
    roller: [{ rolKodu: "PROJE_YONETICISI", ilKodu: null, kurumKodu: null }],
    ...ozellikler,
  };
}

/**
 * EBA dışı kullanıcılar. İkisinin de kurum kodu YOKTUR ama ili vardır —
 * kapsam filtrelerinde tam olarak bu ikili onları yanlışlıkla içeri alabilir
 * (bkz. paydasKapsamFiltresi), o yüzden üreticiler bilerek böyle.
 */
export function mezunYap(
  ozellikler: Partial<OturumKullanicisi> = {},
): OturumKullanicisi {
  return {
    ...TEMEL,
    id: 500,
    kurumKodu: null,
    ilKodu: "34",
    roller: [{ rolKodu: "MEZUN", ilKodu: null, kurumKodu: null }],
    ...ozellikler,
  };
}

export function paydasTemsilcisiYap(
  ozellikler: Partial<OturumKullanicisi> = {},
): OturumKullanicisi {
  return {
    ...TEMEL,
    id: 600,
    kurumKodu: null,
    ilKodu: "34",
    roller: [{ rolKodu: "PAYDAS_TEMSILCISI", ilKodu: null, kurumKodu: null }],
    ...ozellikler,
  };
}

export function faaliyetYap(
  ozellikler: Partial<FaaliyetKapsami> = {},
): FaaliyetKapsami {
  return {
    id: 900,
    kapsam: "OKUL",
    kurumKodu: 750001,
    ilKodu: null,
    duzenleyenKullaniciId: 200,
    onayliMi: true,
    ...ozellikler,
  };
}
