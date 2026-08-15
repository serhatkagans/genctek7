import { oturumKullanicisi } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { adParcasi } from "@/lib/rapor/csv";
import {
  altBaslikYaz,
  bicimCoz,
  disaAktarmaYaniti,
} from "@/lib/rapor/disa-aktarma";
import type { XlsxSutun } from "@/lib/rapor/xlsx";
import {
  illeriSuz,
  ilSiralamasiCoz,
  ozetToplami,
} from "@/lib/rapor/yonetim-kurallari";
import {
  ilceOzetleriniGetir,
  ilOzetleriniGetir,
} from "@/lib/rapor/yonetim-ozeti";
import {
  koordinatorIlKodu,
  projeYoneticisiMi,
  yonetimPanosuGorebilirMi,
} from "@/lib/yetki/izinler";

export const dynamic = "force-dynamic";

/**
 * Yönetim panosu kırılımının dosya çıktısı (varsayılan XLSX, `?bicim=csv`)
 * — ekranda görünen kartların tablosu.
 *
 * Envanter çıktılarından (öğrenci, öğretmen, paydaş) BİR FARKI VAR: burada
 * kişisel veri yok, birim başına sayı var. Bu yüzden erişim logu yazılmıyor ve
 * üst sınır sorulmuyor — çıktı en fazla 81 satır, kimsenin kaydı dışarı çıkmıyor.
 *
 * KAPSAM EKRANIN AYNISI: merkez illeri, koordinatör kendi ilinin ilçelerini
 * indirir. İki ayrı başlık satırı çıkması bilinçli; aynı dosya biçimini iki
 * farklı kırılıma zorlamak, koordinatörün dosyasına hep boş bir "İl koordinatörü"
 * sütunu koyardı.
 */

/*
 * İL VE İLÇE KODLARI METİN OLARAK KALIR ("06", "0601"). Sayıya çevrilselerdi
 * baştaki sıfır düşer ve kod eşleşmez hâle gelirdi; xlsx yazıcısı yalnızca
 * gerçek `number` değerleri sayı hücresi yapıyor, bu yüzden ek bir işlem
 * gerekmiyor — sadece koda dokunulmaması gerekiyor.
 */
const IL_SUTUNLARI: readonly XlsxSutun[] = [
  { baslik: "İl kodu", genislik: 9 },
  { baslik: "İl", genislik: 18 },
  { baslik: "İl koordinatörü", genislik: 24 },
  { baslik: "İlçe", genislik: 9 },
  { baslik: "Okul", genislik: 9 },
  { baslik: "Danışmansız okul", genislik: 15 },
  { baslik: "Öğretmen", genislik: 11 },
  { baslik: "Danışman öğretmen", genislik: 16 },
  { baslik: "Öğrenci", genislik: 10 },
  { baslik: "Danışmansız öğrenci", genislik: 17 },
  { baslik: "Bu yılın etkinlikleri", genislik: 17 },
  { baslik: "Raporu eksik etkinlik", genislik: 18 },
];

const ILCE_SUTUNLARI: readonly XlsxSutun[] = [
  { baslik: "İlçe kodu", genislik: 10 },
  { baslik: "İlçe", genislik: 22 },
  { baslik: "Okul", genislik: 9 },
  { baslik: "Danışmansız okul", genislik: 15 },
  { baslik: "Öğretmen", genislik: 11 },
  { baslik: "Danışman öğretmen", genislik: 16 },
  { baslik: "Öğrenci", genislik: 10 },
  { baslik: "Danışmansız öğrenci", genislik: 17 },
];

export async function GET(istek: Request) {
  const kullanici = await oturumKullanicisi();
  if (!kullanici || !yonetimPanosuGorebilirMi(kullanici)) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const adres = new URL(istek.url);

  if (projeYoneticisiMi(kullanici)) {
    /*
     * Süzgeç ekrandan taşınıyor: indirilen dosya, indirildiği anda ekranda
     * duran listenin aynısı olmalı. Değerler adres çubuğundan geldiği için
     * sıralama `ilSiralamasiCoz` ile doğrulanıyor — tanınmayan değer "ad"a
     * düşer, sessizce yanlış bir sıraya değil.
     */
    const iller = illeriSuz(await ilOzetleriniGetir(), {
      ara: adres.searchParams.get("ara") ?? "",
      sirala: ilSiralamasiCoz(adres.searchParams.get("sirala") ?? undefined),
    });

    const satirlar = iller.map((il) => [
      il.ilKodu,
      il.ad,
      il.koordinatorAdi ?? "Atanmadı",
      il.ilceSayisi,
      il.okulSayisi,
      il.danismansizOkulSayisi,
      il.ogretmenSayisi,
      il.danismanOgretmenSayisi,
      il.ogrenciSayisi,
      il.danismansizOgrenciSayisi,
      il.faaliyetSayisi,
      il.raporsuzFaaliyetSayisi,
    ]);

    /*
     * TOPLAM SATIRI dosyanın sonunda: tabloyu açan kişi ülke toplamını ayrıca
     * hesaplamak zorunda kalmasın. Ekrandaki şeritle aynı hesap kullanılıyor,
     * yoksa dosyanın toplamı ekranın toplamını tutmayabilirdi.
     */
    const toplam = ozetToplami(iller);
    satirlar.push([
      "",
      "TOPLAM",
      `${iller.length - toplam.koordinatorsuzIl} ilde var`,
      toplam.ilce,
      toplam.okul,
      toplam.danismansizOkul,
      toplam.ogretmen,
      toplam.danismanOgretmen,
      toplam.ogrenci,
      toplam.danismansizOgrenci,
      toplam.faaliyet,
      toplam.raporsuzFaaliyet,
    ]);

    return disaAktarmaYaniti({
      bicim: bicimCoz(adres),
      dosyaAdi: "genctek-il-kirilimi",
      baslik: "GençTek Ekosistemi",
      // Son satır TOPLAM; kayıt sayısına o dahil edilmiyor.
      altBaslik: altBaslikYaz("İl kırılımı", satirlar.length - 1),
      sutunlar: IL_SUTUNLARI,
      satirlar,
    });
  }

  const ilKodu = koordinatorIlKodu(kullanici);
  if (ilKodu === null) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const [il, ilceler] = await Promise.all([
    prisma.il.findUnique({ where: { ilKodu }, select: { ad: true } }),
    ilceOzetleriniGetir(ilKodu),
  ]);

  const satirlar: unknown[][] = ilceler.map((ilce) => [
    ilce.ilceKodu,
    ilce.ad,
    ilce.okulSayisi,
    ilce.danismansizOkulSayisi,
    ilce.ogretmenSayisi,
    ilce.danismanOgretmenSayisi,
    ilce.ogrenciSayisi,
    ilce.danismansizOgrenciSayisi,
  ]);

  const toplam = ozetToplami(ilceler);
  satirlar.push([
    "",
    "TOPLAM",
    toplam.okul,
    toplam.danismansizOkul,
    toplam.ogretmen,
    toplam.danismanOgretmen,
    toplam.ogrenci,
    toplam.danismansizOgrenci,
  ]);

  /*
   * Dosya adına ilin ADI yazılıyor, kodu değil: dosya e-posta ekinde dolaşıyor
   * ve "34" ile "06" arasındaki farkı indirmeyi açan herkes bilmiyor.
   */
  return disaAktarmaYaniti({
    bicim: bicimCoz(adres),
    dosyaAdi: `genctek-${adParcasi(il?.ad ?? "", ilKodu)}-ilce-kirilimi`,
    baslik: "GençTek Ekosistemi",
    altBaslik: altBaslikYaz(`${il?.ad ?? ""} · İlçe kırılımı`, satirlar.length - 1),
    sutunlar: ILCE_SUTUNLARI,
    satirlar,
  });
}
