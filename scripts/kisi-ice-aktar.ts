import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "@/lib/db";

/**
 * SUNUCUDAN GELEN KİŞİLERİ YEREL VERİTABANINA YAZAR (28 Ağustos 2026 · istek:
 * "sunucuda veri tabanında daha çok öğrenci öğretmen var, onları çekelim").
 *
 * Girdi: `kisi-disa-aktar.ts`in sunucuda ürettiği JSON. Kullanım:
 *   npx tsx scripts/kisi-ice-aktar.ts genctek-kisiler.json
 *
 * ---------------------------------------------------------------------------
 * KİMLİKLER KORUNMUYOR, EŞLEŞTİRME `auth_provider_id` ÜZERİNDEN
 * ---------------------------------------------------------------------------
 * Sunucudaki `kullanici.id` ile yereldeki id'ler çakışır (yerelde 1..5 dolu).
 * Sunucu kimliklerini olduğu gibi yazmak ya çakışma hatası verir ya da mevcut
 * yerel kayıtların üstüne yazardı — ikincisi, geliştirirken kullandığın kendi
 * hesabını sessizce başka birine dönüştürmek olurdu.
 *
 * Bu yüzden kişi `authProviderId` (zaten `@unique`) ile eşleştiriliyor: aynı
 * kişi varsa GÜNCELLENİR, yoksa AÇILIR. Yerel id'ler kendi akışında kalır ve
 * betik ikinci kez çalıştırıldığında kayıtlar ikizlenmez.
 *
 * ROLLER ÖNCE SİLİNİP YENİDEN YAZILIYOR: `kullanici_rol` tablosunda doğal bir
 * tekil anahtar yok (aynı rol farklı tarihlerle iki kez verilebilir), bu yüzden
 * satırları tek tek eşleştirmek mümkün değil. Kişinin rol kümesini
 * sunucudakiyle değiştirmek, kısmi eşleştirmeden daha doğru sonuç veriyor.
 *
 * `atayanKullaniciId` DÜŞÜRÜLÜYOR: rolü atayan kişi çoğunlukla merkezdedir ve
 * bu betiğin kapsamına girmiyor; yereldeki karşılığı olmayan bir kimliği
 * yazmak yabancı anahtarı kırardı. O alan denetim izi taşıyor, iş kuralı değil.
 *
 * YEREL VERİ SİLİNMİYOR. Hiçbir tablo boşaltılmıyor; mevcut kullanıcılar,
 * ürünler ve kazanımlar yerinde kalıyor.
 */

const dosyaYolu = process.argv[2] ?? "genctek-kisiler.json";

interface Ilce {
  ilceKodu: string;
  ilKodu: string;
  ad: string;
}

interface Kurum {
  kurumKodu: number;
  ad: string;
  ilKodu: string;
  ilceKodu: string;
  okulTuru: string;
  aktif: boolean;
}

interface Paket {
  uretimTarihi: string;
  ilceler: Ilce[];
  kurumlar: Kurum[];
  kullanicilar: Record<string, unknown>[];
}

/** JSON'da tarihler metindir; Prisma `Date` bekler. */
function tarih(deger: unknown): Date | null {
  return typeof deger === "string" ? new Date(deger) : null;
}

function metin(deger: unknown): string | null {
  return typeof deger === "string" ? deger : null;
}

async function main() {
  const paket: Paket = JSON.parse(readFileSync(dosyaYolu, "utf8"));

  console.log(`${dosyaYolu} okundu (üretim: ${paket.uretimTarihi})`);

  /*
   * SIRA ZORUNLU: ilçe → kurum → kullanıcı. Kurum ilçeye, kullanıcı kuruma
   * bağlı; ters sırada yabancı anahtar kırılır.
   *
   * İL TABLOSUNA DOKUNULMUYOR: 81 il yerelde seed'den tam geliyor. Gelen
   * ilçenin ili yerelde yoksa o ilçe ATLANIR ve sayılır — eksik tek bir il,
   * bütün aktarımı düşürmemeli.
   */
  const iller = new Set(
    (await prisma.il.findMany({ select: { ilKodu: true } })).map(
      (il) => il.ilKodu,
    ),
  );

  let ilceSayisi = 0;
  let atlananIlce = 0;
  for (const ilce of paket.ilceler) {
    if (!iller.has(ilce.ilKodu)) {
      atlananIlce += 1;
      continue;
    }
    await prisma.ilce.upsert({
      where: { ilceKodu: ilce.ilceKodu },
      create: ilce,
      update: { ilKodu: ilce.ilKodu, ad: ilce.ad },
    });
    ilceSayisi += 1;
  }

  const ilceler = new Set(
    (await prisma.ilce.findMany({ select: { ilceKodu: true } })).map(
      (ilce) => ilce.ilceKodu,
    ),
  );

  let kurumSayisi = 0;
  let atlananKurum = 0;
  for (const kurum of paket.kurumlar) {
    if (!iller.has(kurum.ilKodu) || !ilceler.has(kurum.ilceKodu)) {
      atlananKurum += 1;
      continue;
    }
    await prisma.kurum.upsert({
      where: { kurumKodu: kurum.kurumKodu },
      create: kurum,
      update: {
        ad: kurum.ad,
        ilKodu: kurum.ilKodu,
        ilceKodu: kurum.ilceKodu,
        okulTuru: kurum.okulTuru,
        aktif: kurum.aktif,
      },
    });
    kurumSayisi += 1;
  }

  const kurumlar = new Set(
    (await prisma.kurum.findMany({ select: { kurumKodu: true } })).map(
      (kurum) => kurum.kurumKodu,
    ),
  );

  let acilan = 0;
  let guncellenen = 0;
  const uyarilar: string[] = [];

  for (const ham of paket.kullanicilar) {
    const kisi = ham as {
      authProviderId: string;
      ad: string;
      soyad: string;
      cinsiyet: string;
      kurumKodu: number | null;
      ilKodu: string | null;
      ilceKodu: string | null;
      sinif: string | null;
      brans: string | null;
      egitimOgretimYili: string;
      aktif: boolean;
      hakkinda: string | null;
      roller: Record<string, unknown>[];
      ogrenciProfil: Record<string, unknown> | null;
      ogretmenProfil: Record<string, unknown> | null;
    };

    /*
     * KARŞILIĞI OLMAYAN YABANCI ANAHTAR NULL'A DÜŞER, kayıt ATILMAZ: kurumu
     * yerelde bulunmayan bir öğretmeni hiç almamak, 420 kişilik aktarımı
     * sessizce yarıya indirebilirdi. Alan boş kalır ve uyarı yazılır.
     */
    const kurumKodu =
      kisi.kurumKodu !== null && kurumlar.has(kisi.kurumKodu)
        ? kisi.kurumKodu
        : null;
    if (kisi.kurumKodu !== null && kurumKodu === null) {
      uyarilar.push(`kurum ${kisi.kurumKodu} yerelde yok → ${kisi.authProviderId}`);
    }

    const ilKodu =
      kisi.ilKodu !== null && iller.has(kisi.ilKodu) ? kisi.ilKodu : null;
    const ilceKodu =
      kisi.ilceKodu !== null && ilceler.has(kisi.ilceKodu) ? kisi.ilceKodu : null;

    const alanlar = {
      ad: kisi.ad,
      soyad: kisi.soyad,
      cinsiyet: kisi.cinsiyet,
      kurumKodu,
      ilKodu,
      ilceKodu,
      sinif: kisi.sinif,
      brans: kisi.brans,
      egitimOgretimYili: kisi.egitimOgretimYili,
      aktif: kisi.aktif,
      hakkinda: kisi.hakkinda,
    };

    const mevcut = await prisma.kullanici.findUnique({
      where: { authProviderId: kisi.authProviderId },
      select: { id: true },
    });

    const kullanici = mevcut
      ? await prisma.kullanici.update({
          where: { id: mevcut.id },
          data: alanlar,
          select: { id: true },
        })
      : await prisma.kullanici.create({
          data: { authProviderId: kisi.authProviderId, ...alanlar },
          select: { id: true },
        });

    if (mevcut) guncellenen += 1;
    else acilan += 1;

    /* Rol kümesi sunucudakiyle değiştiriliyor (gerekçe başlıkta). */
    await prisma.kullaniciRol.deleteMany({
      where: { kullaniciId: kullanici.id },
    });

    for (const hamRol of kisi.roller) {
      const rol = hamRol as {
        rolKodu: string;
        ilKodu: string | null;
        kurumKodu: number | null;
        baslangicTarihi: string;
        bitisTarihi: string | null;
        aciklama: string | null;
      };

      await prisma.kullaniciRol.create({
        data: {
          kullaniciId: kullanici.id,
          rolKodu: rol.rolKodu as never,
          ilKodu:
            rol.ilKodu !== null && iller.has(rol.ilKodu) ? rol.ilKodu : null,
          kurumKodu:
            rol.kurumKodu !== null && kurumlar.has(rol.kurumKodu)
              ? rol.kurumKodu
              : null,
          baslangicTarihi: tarih(rol.baslangicTarihi) ?? new Date(),
          bitisTarihi: tarih(rol.bitisTarihi),
          aciklama: rol.aciklama,
        },
      });
    }

    /*
     * CV VE FOTOĞRAF DOSYALARI GELMİYOR, künyeleri de yazılmıyor. Dosyaların
     * kendisi sunucunun depolama alanında duruyor; künyeyi yazıp dosyayı
     * getirmemek, indirme bağlantısı 404 veren kayıtlar üretirdi.
     */
    if (kisi.ogrenciProfil) {
      const profil = kisi.ogrenciProfil;
      const profilAlanlari = {
        eposta: metin(profil.eposta),
        telefon: metin(profil.telefon),
        githubUrl: metin(profil.githubUrl),
        kisiselSiteUrl: metin(profil.kisiselSiteUrl),
        linkedinUrl: metin(profil.linkedinUrl),
        instagramUrl: metin(profil.instagramUrl),
      };
      await prisma.ogrenciProfil.upsert({
        where: { kullaniciId: kullanici.id },
        create: { kullaniciId: kullanici.id, ...profilAlanlari },
        update: profilAlanlari,
      });
    }

    if (kisi.ogretmenProfil) {
      const profil = kisi.ogretmenProfil;
      const profilAlanlari = {
        danismanOlmakIstiyor: profil.danismanOlmakIstiyor === true,
        isaretlemeTarihi: tarih(profil.isaretlemeTarihi),
        yegitekOkulSorumlusu: profil.yegitekOkulSorumlusu === true,
        yegitekIsaretlemeTarihi: tarih(profil.yegitekIsaretlemeTarihi),
        eposta: metin(profil.eposta),
        telefon: metin(profil.telefon),
        githubUrl: metin(profil.githubUrl),
        kisiselSiteUrl: metin(profil.kisiselSiteUrl),
        linkedinUrl: metin(profil.linkedinUrl),
        instagramUrl: metin(profil.instagramUrl),
        aciklama: metin(profil.aciklama),
        kurumAdi: metin(profil.kurumAdi),
        gorevUnvani: metin(profil.gorevUnvani),
      };
      await prisma.ogretmenProfil.upsert({
        where: { kullaniciId: kullanici.id },
        create: { kullaniciId: kullanici.id, ...profilAlanlari },
        update: profilAlanlari,
      });
    }
  }

  console.log("\nAktarım bitti:");
  console.log(`  ilçe      : ${ilceSayisi} yazıldı, ${atlananIlce} atlandı`);
  console.log(`  kurum     : ${kurumSayisi} yazıldı, ${atlananKurum} atlandı`);
  console.log(`  kullanıcı : ${acilan} açıldı, ${guncellenen} güncellendi`);

  if (uyarilar.length > 0) {
    console.log(`\n${uyarilar.length} uyarı (ilk 10):`);
    for (const uyari of uyarilar.slice(0, 10)) console.log(`  - ${uyari}`);
  }

  await prisma.$disconnect();
}

main().catch(async (hata) => {
  console.error(hata);
  await prisma.$disconnect();
  process.exit(1);
});
