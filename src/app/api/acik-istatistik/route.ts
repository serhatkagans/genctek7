import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";

/*
 * Rota DİNAMİK KALIYOR, statik önbelleğe alınmıyor: `revalidate` ile
 * önbelleklenseydi Next bu ucu DERLEME ANINDA çalıştırıp sonucu gömerdi ve
 * `next build` veritabanına erişebilen bir makine şart koşardı. Derleme
 * sunucusunda veritabanı olmayabilir (bkz. lib/ortam.ts · derlemeAsamasiMi
 * aynı sebeple var). Önbellek bu yüzden rotanın değil SORGULARIN etrafında.
 */
export const dynamic = "force-dynamic";

/**
 * HERKESE AÇIK EKOSİSTEM SAYILARI — tanıtım portalının hero panelinde yazan
 * altı rakam (28 Ağustos 2026 · istekler: "buraya platformdan gelecek öğrenci
 * sayısı öğretmen sayısı mentör sayısı, etkinlik sayısı, ürün sayısı", "bi de
 * il sayısı ekleyelim kaç ilde var").
 *
 * Sayının sahibi burasıdır, portal değil: portal ayrı bir uygulama ve ayrı bir
 * veritabanıdır, elle girilmiş rakam tutsaydı bir hafta sonra yalan söylerdi.
 * Bu uç `acik-etkinlikler` ile aynı sözleşmeyi izler — oturum aranmaz, çünkü
 * dönen şey TOPLAMDIR: kim olduğu, nerede olduğu, ne yaptığı sorulmaz.
 *
 * KİŞİSEL VERİ YOK ve buraya KIRILIM EKLENMEMELİ (il bazlı, okul bazlı
 * sayılar): küçük bir kırılımda toplam, tek bir kişiyi işaret etmeye başlar.
 * Toplam ülke sayısı kimseyi tanımlamaz, "X ilinde 1 mentör" tanımlar.
 *
 * `il` bu kuralın istisnası DEĞİLDİR: dönen şey ilere göre dağılım değil,
 * kaç FARKLI il olduğudur — tek bir sayı, hangi iller olduğunu söylemez.
 */

/**
 * Sayıların üretimi — SONUÇ 5 DAKİKA ÖNBELLEKLENİR.
 *
 * NİYE GEREKLİ: uç herkese açık ve tanıtım portalının hero panelinde duruyor,
 * yani ekosistemdeki en çok istenen adreslerden biri. Yanıtta zaten
 * `Cache-Control: public, max-age=300` vardı ama o başlığı TARAYICI uygular:
 * her yeni ziyaretçi altı sorguyu yeniden çalıştırıyordu ve önünde paylaşımlı
 * bir önbellek yok (ters vekil yalnızca /_next/static'i önbelleğe alıyor).
 *
 * SÜRE, BAŞLIKTAKİ `max-age` İLE AYNI (300 sn) tutuldu: iki taraf ayrı
 * düşseydi kimse "bu rakam en fazla ne kadar eski olabilir" sorusunu tek
 * yerden cevaplayamazdı. Beş dakika bayat bir üye sayısı, tanıtım sayfası için
 * sorun değil — sayılar günde birkaç kez değişiyor.
 *
 * ÖNBELLEK SÜRECE ÖZELDİR: birden çok sunucu süreci varsa her biri kendi
 * kopyasını tutar. Tutarlılık gerekmiyor; sayılar zaten yaklaşık.
 */
const sayilariGetir = unstable_cache(
  async () => {
    /*
     * Beş sorgu PARALEL: hepsi bağımsız sayımlar ve uç bir sayfa açılışını
     * bekletiyor. Sırayla çalıştırılsaydı gecikmeler toplanırdı.
     */
    const [ogrenci, ogretmen, mentor, etkinlik, urun, iller] = await Promise.all([
      /*
       * ROLDEN sayılır, profil tablosundan değil: kişi ekosistemde rolüyle
       * vardır ve rol bittiğinde (bitisTarihi dolduğunda) sayıdan düşmelidir.
       * Pasife alınmış kullanıcı da sayılmaz.
       */
      prisma.kullaniciRol.count({
        where: { rolKodu: "OGRENCI", bitisTarihi: null, kullanici: { aktif: true } },
      }),
      /*
       * "Öğretmen" = DANIŞMAN öğretmen. İl koordinatörleri de öğretmendir ama
       * ayrı bir görevdir; danışmanlığı da varsa üstteki ölçüte zaten girer,
       * yoksa burada sayılmaz — aynı kişiyi iki başlıkta göstermemek için.
       */
      prisma.kullaniciRol.count({
        where: { rolKodu: "DANISMAN", bitisTarihi: null, kullanici: { aktif: true } },
      }),
      /* Mentörlük yalnızca ONAYLA doğar; bekleyen başvuru bir mentör değildir. */
      prisma.mentorluk.count({ where: { durum: "ONAYLANDI" } }),
      /*
       * Etkinlikte `acik-etkinlikler` ucundan farklı olarak TARİH SÜZGECİ YOK:
       * orası "başvurabileceğin etkinlikler" listesidir, burası ekosistemin
       * bugüne kadar yaptığı iş. Geçmiş etkinlikler elenirse sayı sezon başında
       * sıfıra düşerdi.
       */
      prisma.faaliyet.count({
        where: {
          durum: "AKTIF",
          onayDurumu: { in: ["ONAY_GEREKMEZ", "ONAYLANDI"] },
        },
      }),
      /* Ürün = öğrencinin kazanım kaydına girdiği üretim. */
      prisma.kullaniciKazanim.count({ where: { tip: "URUN" } }),
      /*
       * "KAÇ İLDE VAR" (28 Ağustos 2026 · istek: "bi de il sayısı ekleyelim kaç
       * ilde var"). Ölçüt KİŞİNİN BULUNDUĞU İL: ekosistem, koordinatör atanan
       * yerde değil öğrencisi/danışmanı olan yerde vardır. Koordinatörlü il
       * sayılsaydı rakam merkezin atama hızını gösterirdi, sahadaki yayılımı
       * değil.
       *
       * `count` değil `groupBy`: sayılan şey kişi değil, kişilerin dağıldığı
       * FARKLI il sayısı. İli boş olanlar (YEĞİTEK personeli okula bağlı
       * olmadığı için ilsiz olabiliyor) elenmezse `null` da bir "il" gibi
       * gruplanır ve sayı bir fazla çıkardı.
       */
      prisma.kullanici.groupBy({
        by: ["ilKodu"],
        where: {
          aktif: true,
          ilKodu: { not: null },
          roller: {
            some: { rolKodu: { in: ["OGRENCI", "DANISMAN"] }, bitisTarihi: null },
          },
        },
      }),
    ]);

    return { ogrenci, ogretmen, mentor, etkinlik, urun, il: iller.length };
  },
  ["acik-istatistik"],
  { revalidate: 300 },
);

export async function GET() {
  return Response.json(await sayilariGetir(), {
    headers: {
      // Tarayıcı önbelleği; sürenin sunucu tarafındaki eşi `sayilariGetir`de.
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
    },
  });
}
