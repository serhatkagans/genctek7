import type { Prisma } from "@/generated/prisma/client";
import { okulTuruKosulu } from "../okul/turler";

/**
 * EKİBE ÜYE EKLERKEN ADAY SÜZGECİ (26 Ağustos 2026).
 *
 * İSTEK: "Ad ya da soyad / En az iki harf yazın / Ara … bunun yerine gelişmiş
 * filtre ekleyelim: öğretmen öğrenci, okul türü, çalışma grubu, rolleri (mentör,
 * okul temsilcisi, il ilçe temsilcisi, çalışma grubu temsilcisi)."
 *
 * ---------------------------------------------------------------------------
 * NİYE AD ARAMASI YETMİYORDU
 * ---------------------------------------------------------------------------
 * Ekran yalnızca ad/soyad ile arıyordu ve bu, ADINI BİLDİĞİNİZ kişiyi bulmaya
 * yarar. Ekip kuran koordinatörün sorusu ise çoğu zaman bunun tersi: "ilimde
 * siber güvenlik çalışma grubunda kim var", "meslek liselerindeki okul
 * temsilcileri kimler". Bu sorularda ad, aramanın çıktısıdır, girdisi değil.
 *
 * AD ARAMASI KALDIRILMADI: adını bilen kişi için hâlâ en kısa yol. Artık tek
 * kapı değil, süzgeçlerden biri — ve diğerleriyle birlikte daraltıyor (AND).
 *
 * ---------------------------------------------------------------------------
 * SAF TUTULUYOR
 * ---------------------------------------------------------------------------
 * Veritabanına gitmez, oturuma bakmaz; yalnızca ham sorgu değerlerini bir
 * `where` nesnesine çevirir ve birim testle kapsanır. KAPSAM BURADA DEĞİL:
 * ekibin ili ve zaten üye olanlar çağıranın verdiği zorunlu kısıtlardır
 * (bkz. `adayKosulu` · `zorunlu`) — süzgeç onları gevşetemez.
 */

/** Kişi türü süzgeci. */
export type AdayKisiTuru = "OGRENCI" | "OGRETMEN";

/**
 * Rol süzgecinin değerleri.
 *
 * MENTÖR DİĞERLERİNDEN FARKLI: bir görev rolü değil, onaya bağlı bir KAYIT
 * (bkz. şemadaki Mentorluk notu · "MENTOR türünün ayrı bir rolü yoktur").
 * Bu yüzden aynı listede duruyor ama koşulu ayrı dalda kuruluyor — kullanıcı
 * için ikisi de "bu kişi ne yapıyor" sorusunun cevabı.
 */
export type AdayRolu =
  | "MENTOR"
  | "IL_TEMSILCISI"
  | "ILCE_TEMSILCISI"
  | "OKUL_TEMSILCISI"
  | "CALISMA_GRUBU_YONETICISI";

export const ADAY_ROL_ETIKETLERI: Record<AdayRolu, string> = {
  MENTOR: "Mentör",
  IL_TEMSILCISI: "İl Temsilcisi",
  ILCE_TEMSILCISI: "İlçe Temsilcisi",
  OKUL_TEMSILCISI: "Okul Temsilcisi",
  CALISMA_GRUBU_YONETICISI: "Çalışma Grubu Temsilcisi",
};

export const ADAY_ROLLERI: readonly AdayRolu[] = [
  "MENTOR",
  "OKUL_TEMSILCISI",
  "ILCE_TEMSILCISI",
  "IL_TEMSILCISI",
  "CALISMA_GRUBU_YONETICISI",
];

export const ADAY_KISI_TURU_ETIKETLERI: Record<AdayKisiTuru, string> = {
  OGRENCI: "Öğrenci",
  OGRETMEN: "Öğretmen",
};

export interface AdaySuzgeci {
  ara: string | null;
  kisiTuru: AdayKisiTuru | null;
  okulTuru: string | null;
  calismaGrubuId: number | null;
  rol: AdayRolu | null;
}

export const BOS_ADAY_SUZGECI: AdaySuzgeci = {
  ara: null,
  kisiTuru: null,
  okulTuru: null,
  calismaGrubuId: null,
  rol: null,
};

function tekil(deger: string | string[] | undefined): string | null {
  const ham = Array.isArray(deger) ? deger[0] : deger;
  const temiz = ham?.trim();
  return temiz ? temiz : null;
}

/**
 * Ham sorgu parametrelerini süzgece çevirir.
 *
 * TANINMAYAN DEĞER SESSİZCE DÜŞER, hata vermez: adres çubuğuna elle yazılmış
 * `?rol=FILANCA` için ekranın doğru davranışı "böyle bir rol yok" diye
 * bağırmak değil, o daraltmayı hiç uygulamamak. Yetki sınırı burada değil —
 * kapsamı çağıran zorluyor.
 */
export function adaySuzgeciniCoz(parametreler: {
  ara?: string | string[];
  kisiTuru?: string | string[];
  okulTuru?: string | string[];
  grup?: string | string[];
  rol?: string | string[];
}): AdaySuzgeci {
  const kisiTuru = tekil(parametreler.kisiTuru);
  const rol = tekil(parametreler.rol);
  const grup = tekil(parametreler.grup);
  const grupId = grup === null ? Number.NaN : Number.parseInt(grup, 10);

  return {
    ara: tekil(parametreler.ara),
    kisiTuru:
      kisiTuru === "OGRENCI" || kisiTuru === "OGRETMEN" ? kisiTuru : null,
    okulTuru: tekil(parametreler.okulTuru),
    calismaGrubuId: Number.isInteger(grupId) ? grupId : null,
    rol: (ADAY_ROLLERI as readonly string[]).includes(rol ?? "")
      ? (rol as AdayRolu)
      : null,
  };
}

/** Süzgeçlerden en az biri doluysa liste basılır. */
export function adaySuzgeciDoluMu(suzgec: AdaySuzgeci): boolean {
  return Boolean(
    (suzgec.ara && suzgec.ara.length >= 2) ||
      suzgec.kisiTuru ||
      suzgec.okulTuru ||
      suzgec.calismaGrubuId !== null ||
      suzgec.rol,
  );
}

/**
 * Süzgeci Prisma koşuluna çevirir.
 *
 * `zorunlu` ÇAĞIRANIN KAPSAMI: ekibin ili ve hariç tutulacak kimlikler. Ayrı
 * parametre olması bilinçli — süzgeç nesnesi adres çubuğundan geliyor ve
 * kapsamla aynı yerde dursaydı, kurcalanan bir parametre ekibin ilini
 * genişletebilirdi.
 *
 * ÖĞRETMEN = "ÖĞRENCİ OLMAYAN OKUL PERSONELİ": mezun ve paydaş temsilcisi de
 * eleniyor. Onlar sisteme dışarıdan giren kullanıcılar; "öğretmen" süzgecini
 * seçen koordinatörün aradığı kişi değiller. Rolsüz öğretmen İÇERİDE kalıyor —
 * görev almamış bir öğretmen de ekibe girebilir.
 *
 * GÖREV ROLLERİNDE DÖNEM SORULMUYOR: bir kişinin geçen yılki temsilciliği de
 * onun kim olduğunu anlatıyor ve ekibe alınma gerekçesi olabilir. Süzgecin işi
 * aday bulmak, görev listesi dökmek değil (o soru Görev Rolleri ekranında ve
 * orada dönem süzgeci var).
 */
export function adayKosulu(
  suzgec: AdaySuzgeci,
  zorunlu: { ilKodu: string; haricIdler: readonly number[] },
): Prisma.KullaniciWhereInput {
  const kosullar: Prisma.KullaniciWhereInput[] = [
    { aktif: true },
    { ilKodu: zorunlu.ilKodu },
    { id: { notIn: zorunlu.haricIdler.length > 0 ? [...zorunlu.haricIdler] : [-1] } },
  ];

  if (suzgec.ara && suzgec.ara.length >= 2) {
    kosullar.push({
      OR: [
        { ad: { contains: suzgec.ara, mode: "insensitive" } },
        { soyad: { contains: suzgec.ara, mode: "insensitive" } },
      ],
    });
  }

  if (suzgec.kisiTuru === "OGRENCI") {
    kosullar.push({
      roller: { some: { rolKodu: "OGRENCI", bitisTarihi: null } },
    });
  } else if (suzgec.kisiTuru === "OGRETMEN") {
    kosullar.push({
      roller: {
        none: {
          rolKodu: { in: ["OGRENCI", "MEZUN", "PAYDAS_TEMSILCISI"] },
          bitisTarihi: null,
        },
      },
    });
  }

  if (suzgec.okulTuru) {
    // Okul türü kişide değil bağlı olduğu kurumda durur; "Diğer" seçeneği bir
    // tür adı değil koşuldur (bkz. lib/okul/turler.ts).
    kosullar.push({ kurum: okulTuruKosulu(suzgec.okulTuru) });
  }

  if (suzgec.calismaGrubuId !== null) {
    kosullar.push({
      calismaGruplari: { some: { calismaGrubuId: suzgec.calismaGrubuId } },
    });
  }

  if (suzgec.rol === "MENTOR") {
    kosullar.push({ mentorluk: { is: { durum: "ONAYLANDI" } } });
  } else if (suzgec.rol) {
    kosullar.push({ gorevRolleri: { some: { rolKodu: suzgec.rol } } });
  }

  return { AND: kosullar };
}

/** Süzgeçleri koruyan sorgu dizesi — sayfa yenilendiğinde kaybolmasınlar. */
export function adaySorgusu(suzgec: AdaySuzgeci): string {
  const sorgu = new URLSearchParams();
  if (suzgec.ara) sorgu.set("ara", suzgec.ara);
  if (suzgec.kisiTuru) sorgu.set("kisiTuru", suzgec.kisiTuru);
  if (suzgec.okulTuru) sorgu.set("okulTuru", suzgec.okulTuru);
  if (suzgec.calismaGrubuId !== null) {
    sorgu.set("grup", String(suzgec.calismaGrubuId));
  }
  if (suzgec.rol) sorgu.set("rol", suzgec.rol);
  return sorgu.toString();
}
