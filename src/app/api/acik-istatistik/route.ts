import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * HERKESE AÇIK EKOSİSTEM SAYILARI — tanıtım portalının hero panelinde yazan
 * beş rakam (28 Ağustos 2026 · istek: "buraya platformdan gelecek öğrenci
 * sayısı öğretmen sayısı mentör sayısı, etkinlik sayısı, ürün sayısı").
 *
 * Sayının sahibi burasıdır, portal değil: portal ayrı bir uygulama ve ayrı bir
 * veritabanıdır, elle girilmiş rakam tutsaydı bir hafta sonra yalan söylerdi.
 * Bu uç `acik-etkinlikler` ile aynı sözleşmeyi izler — oturum aranmaz, çünkü
 * dönen şey TOPLAMDIR: kim olduğu, nerede olduğu, ne yaptığı sorulmaz.
 *
 * KİŞİSEL VERİ YOK ve buraya kırılım da EKLENMEMELİ (il bazlı, okul bazlı
 * sayılar dahil): küçük bir kırılımda toplam, tek bir kişiyi işaret etmeye
 * başlar. Toplam ülke sayısı kimseyi tanımlamaz, "X ilinde 1 mentör" tanımlar.
 */

export async function GET() {
  /*
   * Beş sorgu PARALEL: hepsi bağımsız sayımlar ve uç bir sayfa açılışını
   * bekletiyor. Sırayla çalıştırılsaydı gecikmeler toplanırdı.
   */
  const [ogrenci, ogretmen, mentor, etkinlik, urun] = await Promise.all([
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
  ]);

  return Response.json(
    { ogrenci, ogretmen, mentor, etkinlik, urun },
    {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    },
  );
}
