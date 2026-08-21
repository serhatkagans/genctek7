import { prisma } from "./db";

/**
 * Sistem ayarları proje yöneticisi tarafından yapılandırılabilir; koda
 * gömülmez. Varsayılan değerler yalnızca kayıt henüz yoksa devreye girer.
 */

/*
 * Öğrenci başına çalışma grubu üst sınırı BURADA YOKTUR: sınır kaldırıldı,
 * öğrenci istediği kadar grup seçebilir. Anahtarı geri eklemeyin.
 */
export const AYAR_ANAHTARLARI = {
  GORSEL_MAKS_BAYT: "GORSEL_MAKS_BAYT",
  BELGE_MAKS_BAYT: "BELGE_MAKS_BAYT",
  IZINLI_GORSEL_TIPLERI: "IZINLI_GORSEL_TIPLERI",
  IZINLI_BELGE_TIPLERI: "IZINLI_BELGE_TIPLERI",
  /*
   * CV sınırları faaliyet eklerinden AYRI tutulur: CV'de doc/docx kabul
   * ediliyor, faaliyet ekinde edilmiyor. Ortak ayar kullanılsaydı CV için
   * açılan bir tip faaliyet eklerinde de açılırdı.
   */
  IZINLI_CV_TIPLERI: "IZINLI_CV_TIPLERI",
  CV_MAKS_BAYT: "CV_MAKS_BAYT",
  /*
   * Profil fotoğrafı sınırları da AYRI tutulur, aynı gerekçeyle: faaliyet
   * görselleri için açılan bir tip (ör. image/gif) kendiliğinden herkesin
   * avatarında da geçerli olmamalı. Ayrıca boyut beklentisi farklı — avatar
   * küçük bir kare, faaliyet görseli sayfa genişliğinde bir fotoğraf.
   */
  IZINLI_PROFIL_FOTO_TIPLERI: "IZINLI_PROFIL_FOTO_TIPLERI",
  PROFIL_FOTO_MAKS_BAYT: "PROFIL_FOTO_MAKS_BAYT",
  ERISIM_LOGU_SAKLAMA_AYI: "ERISIM_LOGU_SAKLAMA_AYI",
  BILDIRIM_SAKLAMA_AYI: "BILDIRIM_SAKLAMA_AYI",
  KVKK_AYDINLATMA_METNI: "KVKK_AYDINLATMA_METNI",
  /*
   * Dört onay belgesinin dördü de AYRI metindir ve ayrı ayarlarda tutulur:
   * aydınlatma "verini şöyle işliyoruz" der, açık rıza kişiye "şu isteğe bağlı
   * işlemlere rıza gösteriyorum" dedirtir, taahhütname koordinatöre görevini
   * nasıl yürüteceğini, gizlilik sözleşmesi ise başkasının verisiyle nasıl
   * davranacağını taahhüt ettirir. Tek metinde toplansalardı birinin
   * güncellenmesi diğerlerinin onayını da eskitirdi.
   */
  KVKK_ACIK_RIZA_METNI: "KVKK_ACIK_RIZA_METNI",
  KOORDINATOR_TAAHHUTNAME_METNI: "KOORDINATOR_TAAHHUTNAME_METNI",
  GIZLILIK_SOZLESMESI_METNI: "GIZLILIK_SOZLESMESI_METNI",
  DISA_AKTARMA_UST_SINIRI: "DISA_AKTARMA_UST_SINIRI",
} as const;

/** Tek dışa aktarmada indirilebilecek satır sayısı. */
export const VARSAYILAN_DISA_AKTARMA_UST_SINIRI = 5000;

/**
 * Yönetim ekranında düzenlenebilen ayarların biçimi.
 *
 * Biçim bilgisi ekranın hangi girdiyi göstereceğini ve doğrulamayı belirler;
 * serbest metin bir ayarı sayı alanında düzenletmek sessiz veri bozulması
 * demektir.
 */
export type AyarBicimi = "sayi" | "liste" | "metin" | "uzun-metin";

export interface AyarTanimi {
  anahtar: string;
  baslik: string;
  bicim: AyarBicimi;
  yardim: string;
}

export const YONETILEBILIR_AYARLAR: AyarTanimi[] = [
  {
    anahtar: AYAR_ANAHTARLARI.GORSEL_MAKS_BAYT,
    baslik: "Görsel boyut sınırı (bayt)",
    bicim: "sayi",
    yardim: "Etkinliğe eklenen görsel başına üst sınır. 5 MB = 5242880.",
  },
  {
    anahtar: AYAR_ANAHTARLARI.BELGE_MAKS_BAYT,
    baslik: "Belge boyut sınırı (bayt)",
    bicim: "sayi",
    yardim: "Etkinliğe eklenen belge başına üst sınır. 10 MB = 10485760.",
  },
  {
    anahtar: AYAR_ANAHTARLARI.IZINLI_GORSEL_TIPLERI,
    baslik: "İzinli görsel tipleri",
    bicim: "liste",
    yardim: "Virgülle ayrılmış MIME tipleri: image/jpeg,image/png,image/webp",
  },
  {
    anahtar: AYAR_ANAHTARLARI.IZINLI_BELGE_TIPLERI,
    baslik: "İzinli belge tipleri",
    bicim: "liste",
    yardim: "Virgülle ayrılmış MIME tipleri: application/pdf",
  },
  {
    anahtar: AYAR_ANAHTARLARI.IZINLI_CV_TIPLERI,
    baslik: "İzinli CV tipleri",
    bicim: "liste",
    yardim:
      "Özgeçmiş olarak yüklenebilecek MIME tipleri. Ürün kuralı yalnızca PDF'tir (application/pdf); doc/docx bilinçli olarak kapalıdır. Yeni bir tip eklerseniz karşılığını src/lib/depolama/yerel.ts içindeki uzantı listesine de ekleyin.",
  },
  {
    anahtar: AYAR_ANAHTARLARI.CV_MAKS_BAYT,
    baslik: "CV boyut sınırı (bayt)",
    bicim: "sayi",
    yardim: "Öğrenci CV'si için üst sınır. 5 MB = 5242880.",
  },
  {
    anahtar: AYAR_ANAHTARLARI.IZINLI_PROFIL_FOTO_TIPLERI,
    baslik: "İzinli profil fotoğrafı tipleri",
    bicim: "liste",
    yardim:
      "Kullanıcının profil fotoğrafı olarak yükleyebileceği MIME tipleri. Yeni bir tip eklerseniz karşılığını src/lib/depolama/yerel.ts içindeki uzantı listesine de ekleyin.",
  },
  {
    anahtar: AYAR_ANAHTARLARI.PROFIL_FOTO_MAKS_BAYT,
    baslik: "Profil fotoğrafı boyut sınırı (bayt)",
    bicim: "sayi",
    yardim:
      "Profil fotoğrafı başına üst sınır. Avatar küçük gösterildiği için düşük tutun; 2 MB = 2097152.",
  },
  {
    anahtar: AYAR_ANAHTARLARI.ERISIM_LOGU_SAKLAMA_AYI,
    baslik: "Erişim kaydı saklama süresi (ay)",
    bicim: "sayi",
    yardim:
      "Süresi dolan kayıtlar bakım işiyle silinir. KVKK denetimi için kısa tutmayın.",
  },
  {
    anahtar: AYAR_ANAHTARLARI.BILDIRIM_SAKLAMA_AYI,
    baslik: "Bildirim saklama süresi (ay)",
    bicim: "sayi",
    yardim: "Yalnızca okunmuş bildirimler silinir; okunmamışlara dokunulmaz.",
  },
  {
    anahtar: AYAR_ANAHTARLARI.DISA_AKTARMA_UST_SINIRI,
    baslik: "Dışa aktarma satır sınırı",
    bicim: "sayi",
    yardim:
      "Tek CSV indirmesinde en fazla kaç kayıt olabilir. Sınır aşıldığında indirme yapılmaz, filtre daraltılması istenir.",
  },
  /*
   * DÖRT BELGE METNİ YÖNETİLEBİLİR AYARLARDAN ÇIKTI (21 Ağustos 2026 · istek:
   * "kvkk olmayacak yani sadece çerez politikası").
   *
   * Metinler hiçbir ekranda gösterilmiyor ve hiçbir yerde onay istenmiyor;
   * düzenleme kutusunu bırakmak, yöneticiye kimsenin okumayacağı bir metni
   * güncelletmek olurdu.
   *
   * ANAHTARLAR VE VARSAYILAN METİNLER DURUYOR (AYAR_ANAHTARLARI,
   * lib/kvkk/kurallar.ts): daha önce kaydedilmiş metinler `sistem_ayari`
   * satırlarında ve verilmiş onaylar `kullanici_onayi` tablosunda — ekran
   * kararıyla hukuki kayıt silinmez.
   */
];

/**
 * Ayar değerinin biçime uygunluğu. Hatalıysa kullanıcıya gösterilecek gerekçe,
 * uygunsa null döner.
 */
export function ayarDegeriGecerliMi(
  bicim: AyarBicimi,
  deger: string,
): string | null {
  if (bicim === "sayi") {
    const sayi = Number.parseInt(deger, 10);
    if (!Number.isFinite(sayi) || sayi < 1) {
      return "Değer 1 veya daha büyük bir tam sayı olmalıdır.";
    }
    return null;
  }
  if (bicim === "liste") {
    const parcalar = deger
      .split(",")
      .map((parca) => parca.trim())
      .filter(Boolean);
    if (parcalar.length === 0) return "En az bir değer girilmelidir.";
    return null;
  }
  return null;
}

export async function ayarMetin(
  anahtar: string,
  varsayilan: string,
): Promise<string> {
  const kayit = await prisma.sistemAyari.findUnique({ where: { anahtar } });
  return kayit?.deger ?? varsayilan;
}

export async function ayarSayi(
  anahtar: string,
  varsayilan: number,
): Promise<number> {
  const deger = await ayarMetin(anahtar, String(varsayilan));
  const sayi = Number.parseInt(deger, 10);
  return Number.isFinite(sayi) ? sayi : varsayilan;
}

export async function ayarListe(
  anahtar: string,
  varsayilan: string[],
): Promise<string[]> {
  const deger = await ayarMetin(anahtar, varsayilan.join(","));
  return deger
    .split(",")
    .map((parca) => parca.trim())
    .filter(Boolean);
}
