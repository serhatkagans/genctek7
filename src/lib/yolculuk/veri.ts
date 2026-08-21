import { prisma } from "../db";
import { katilimGecmisiGetir } from "../kazanim/getir";
import type { OturumKullanicisi } from "../yetki/tipler";
import { ogrenciMi } from "../yetki/izinler";
import { type YolculukDurumu, yolculukDurumu } from "./kurallar";

/**
 * GençTek Yolculuğu'nun veri tarafı (21 Ağustos 2026).
 *
 * Kurallar `./kurallar.ts`de ve saf; burada yalnızca sayıların NEREDEN
 * okunduğu var. Ayrım bilinçli: puan tanımları birim testle sınanıyor,
 * sorgular ise tek yerde toplanıyor.
 *
 * ÖĞRENCİ VE ÖĞRETMEN AYNI FONKSİYONDAN geçiyor ama farklı sütunlar sayılıyor:
 * öğrencinin çalışma grubu seçimi ve akran eğitimi var, öğretmenin danışmanlığı.
 * Kaynağı olmayan ölçüt sıfır dönüyor ve dökümde hiç görünmüyor — "0
 * danışmanlık" satırı öğrencinin ekranında anlamsız olurdu.
 *
 * ---------------------------------------------------------------------------
 * EŞZAMANLI SORGU SAYISI BİLİNÇLİ OLARAK DÜŞÜK
 * ---------------------------------------------------------------------------
 * İlk sürüm on sorguyu tek `Promise.all`da açıyordu ve yerel geliştirme
 * veritabanı (`prisma dev`) bunu kaldıramadı: sunucu dokuzuncu eşzamanlı
 * bağlantıda bütün bağlantıları `read ECONNRESET` ile düşürüyor ve bir daha
 * kendine gelmiyor ("Server has closed the connection"). Panel sayfası zaten
 * kendi sorgularını paralel açıyor; yolculuk hesabı onun üstüne binince tavan
 * aşılıyordu.
 *
 * İki önlem birlikte:
 *   1. KAZANIM SAYIMLARI TEK SORGUDA (`groupBy`): dört ayrı `count` yerine
 *      tipe göre gruplanmış tek sorgu. Sayılar zaten aynı tablodan geliyordu.
 *   2. KALANLAR KÜÇÜK GRUPLAR HÂLİNDE: en fazla üçlü `Promise.all`lar, sırayla.
 *      Toplam süre bir iki milisaniye uzuyor; buna karşılık ekran açılıyor.
 */
export async function yolculugumuGetir(
  kullanici: OturumKullanicisi,
  simdi: Date = new Date(),
): Promise<YolculukDurumu> {
  const ogrenci = ogrenciMi(kullanici);
  const kullaniciId = kullanici.id;

  /*
   * Kazanım kayıtları TEK SORGUDA, tipe göre gruplanmış. "Deneyim" tek bir tip
   * değil: dış etkinlik, yarışma derecesi ve sertifika birlikte sayılıyor —
   * üçü de kişinin GençTek dışında biriktirdiği aynı türden kayıt.
   */
  const kazanimSayimlari = await prisma.kullaniciKazanim.groupBy({
    by: ["tip"],
    where: { kullaniciId },
    _count: { _all: true },
  });
  const kazanimAdedi = (...tipler: string[]): number =>
    kazanimSayimlari
      .filter((satir) => tipler.includes(satir.tip))
      .reduce((toplam, satir) => toplam + satir._count._all, 0);

  const gecmis = await katilimGecmisiGetir(kullaniciId, simdi);

  const [calismaGrubuSayisi, gorevRolSayisi, gencTekGorevSayisi] =
    await Promise.all([
      ogrenci
        ? prisma.ogrenciCalismaGrubu.count({ where: { ogrenciId: kullaniciId } })
        : Promise.resolve(0),
      prisma.ogrenciGorevRolu.count({ where: { ogrenciId: kullaniciId } }),
      /*
       * GENÇTEK GÖREVLERİ DE SAYILIYOR (aynı gün eklendi): panodan başvurulup
       * ONAYLANAN görev, temsilcilikle aynı ağırlıkta bir görevdir.
       */
      prisma.gencTekGorevBasvurusu.count({
        where: { kullaniciId, onayDurumu: "ONAYLANDI" },
      }),
    ]);

  const [duzenlenenEtkinlikSayisi, mentorluk, aktifDanismanlikSayisi] =
    await Promise.all([
      // Onay bekleyen ya da iptal edilmiş öneri sayılmaz.
      prisma.faaliyet.count({
        where: {
          duzenleyenKullaniciId: kullaniciId,
          durum: "AKTIF",
          onayDurumu: { in: ["ONAYLANDI", "ONAY_GEREKMEZ"] },
        },
      }),
      prisma.mentorluk.findUnique({
        where: { kullaniciId },
        select: { durum: true },
      }),
      ogrenci
        ? Promise.resolve(0)
        : prisma.danismanAtama.count({
            where: { danismanKullaniciId: kullaniciId, bitisTarihi: null },
          }),
    ]);

  return yolculukDurumu({
    katilimSayisi: gecmis.katilimlar.length,
    urunSayisi: kazanimAdedi("URUN"),
    deneyimSayisi: kazanimAdedi(
      "DIS_ETKINLIK",
      "YARISMA_DERECESI",
      "SERTIFIKA",
    ),
    calismaGrubuSayisi,
    akranEgitimiSayisi: kazanimAdedi("AKRAN_EGITIMI"),
    duzenlenenEtkinlikSayisi,
    gorevSayisi: gorevRolSayisi + gencTekGorevSayisi,
    mentorMu: mentorluk?.durum === "ONAYLANDI",
    aktifDanismanlikSayisi,
  });
}
