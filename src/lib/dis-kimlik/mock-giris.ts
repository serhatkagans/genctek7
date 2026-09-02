import { oturumAc } from "../auth/oturum";
import { prisma } from "../db";
import { ortam } from "../ortam";
import { kimlikDogrulamaLogla } from "../yetki/log";
import { kimlikSecerekGirisAcikMi } from "./kurallar";

/**
 * EBA dışı girişin GELİŞTİRME KİPİ karşılığı — kimlik seçerek giriş.
 *
 * NEDEN VAR (10 Ağustos 2026 · istek: "e-Devlet girişi de EBA girişi gibi
 * mezun/paydaş/mentör listesi olsun, giriş yapmış gibi; SSO'yu en son
 * bağlarız"). Gerçek e-Devlet entegrasyonu yok (kurum başvurusu, test ortamı
 * ve istemci sertifikası gerekiyor); şifreli giriş ise geliştiricinin her test
 * kişisinin şifresini bilmesini gerektiriyordu. EBA tarafında bu sorun
 * `AuthProvider`'ın mock uygulamasıyla çözülmüştü — burada aynı çözüm, ama
 * kimlikler katalogdan DEĞİL veritabanından gelir: dış kullanıcı bir
 * AuthProvider kaydı değil, onaylanmış bir başvurunun ürünüdür.
 *
 * ÜRETİMDE KAPALIDIR. `AUTH_PROVIDER="eba"` olduğunda hem liste boş döner hem
 * de giriş fonksiyonu reddeder — kontrol iki yerde ayrı ayrı yapılır, çünkü
 * ekranı gizlemek eylemi korumaz: sunucu eylemi doğrudan da çağrılabilir.
 * Şifresiz oturum açan bir uç nokta üretimde açık kalırsa sistemin tamamı
 * açılır.
 */

/** Başvuru türüyle aynı üçlü; mentörlük ayrı bir ROL değildir (bkz. kurallar.ts). */
export type MockDisKimlikTuru = "MEZUN" | "PAYDAS" | "MENTOR";

export interface MockDisKimlik {
  authProviderId: string;
  adSoyad: string;
  eposta: string;
  /** Kartın ikinci satırı: kişiyi ayırt etmeye yarayan bağlam. */
  altBilgi: string;
  tur: MockDisKimlikTuru;
}

export function mockDisGirisAcikMi(): boolean {
  return kimlikSecerekGirisAcikMi(ortam.AUTH_PROVIDER);
}

export type MockDisGirisSonucu =
  | { durum: "BASARILI" }
  | { durum: "BASARISIZ"; mesaj: string };

/**
 * Seçilebilecek dış kimlikler.
 *
 * ÖLÇÜT "dis_kimlik satırı var" — rol DEĞİL. Rol MEZUN/PAYDAS_TEMSILCISI
 * olan ama şifreli kimliği bulunmayan bir kayıt bu kapıdan girmez; ölçütü role
 * bağlamak, ileride bu rollerin EBA'lı bir kullanıcıya verilmesi hâlinde ona
 * da şifresiz bir kapı açardı.
 */
export async function mockDisKimlikleriGetir(): Promise<MockDisKimlik[]> {
  if (!mockDisGirisAcikMi()) return [];

  const kullanicilar = await prisma.kullanici.findMany({
    where: { aktif: true, disKimlik: { isNot: null } },
    orderBy: [{ ad: "asc" }, { soyad: "asc" }],
    select: {
      authProviderId: true,
      ad: true,
      soyad: true,
      il: { select: { ad: true } },
      disKimlik: { select: { eposta: true } },
      roller: {
        where: { bitisTarihi: null },
        select: { rolKodu: true },
      },
      mentorluk: { select: { durum: true, konular: true } },
      /*
       * Kişinin bağlamı (mezun olduğu okul, temsil ettiği kurum) kullanıcı
       * satırına kopyalanmıyor; tek doğruluk kaynağı onu doğuran başvurudur
       * (bkz. schema.prisma · Kullanici.disBasvurusu).
       */
      disBasvurusu: {
        select: {
          tur: true,
          gorevUnvani: true,
          mezuniyetYili: true,
          mezunKurum: { select: { ad: true } },
          paydas: { select: { ad: true } },
        },
      },
    },
  });

  return kullanicilar.map((kullanici) => {
    const basvuru = kullanici.disBasvurusu;
    /*
     * Tür başvurudan okunur. Başvurusu olmayan bir dış kullanıcı (elle
     * açılmış kayıt) rolüne göre sınıflanır — mentörlük başvuru türüdür, rolde
     * karşılığı yoktur, o yüzden bu yedek yolda MENTOR çıkmaz.
     */
    const tur: MockDisKimlikTuru =
      basvuru?.tur ??
      (kullanici.roller.some((rol) => rol.rolKodu === "MEZUN")
        ? "MEZUN"
        : "PAYDAS");

    return {
      authProviderId: kullanici.authProviderId,
      adSoyad: `${kullanici.ad} ${kullanici.soyad}`,
      eposta: kullanici.disKimlik?.eposta ?? "—",
      altBilgi: altBilgiYaz(tur, {
        il: kullanici.il?.ad ?? null,
        mezunKurum: basvuru?.mezunKurum?.ad ?? null,
        mezuniyetYili: basvuru?.mezuniyetYili ?? null,
        paydas: basvuru?.paydas?.ad ?? null,
        gorevUnvani: basvuru?.gorevUnvani ?? null,
        mentorlukKonulari: kullanici.mentorluk?.konular ?? null,
        mentorMu: kullanici.mentorluk?.durum === "ONAYLANDI",
      }),
      tur,
    };
  });
}

function altBilgiYaz(
  tur: MockDisKimlikTuru,
  bilgi: {
    il: string | null;
    mezunKurum: string | null;
    mezuniyetYili: number | null;
    paydas: string | null;
    gorevUnvani: string | null;
    mentorlukKonulari: string | null;
    mentorMu: boolean;
  },
): string {
  const parcalar: (string | null)[] = [];

  if (tur === "MEZUN") {
    parcalar.push(bilgi.mezunKurum);
    parcalar.push(bilgi.mezuniyetYili ? `${bilgi.mezuniyetYili} mezunu` : null);
  } else if (tur === "PAYDAS") {
    parcalar.push(bilgi.paydas);
    parcalar.push(bilgi.gorevUnvani);
  } else {
    parcalar.push(bilgi.mentorlukKonulari);
  }

  parcalar.push(bilgi.il);
  /*
   * "Mentör" notu YALNIZCA mezun ve paydaşa basılır: mentör başlığı altındaki
   * kartta aynı şeyi ikinci kez söylerdi. Mezun ve paydaş da mentörlük
   * isteyebiliyor (bkz. schema.prisma · mentorlukIstiyor) ve bu, listede
   * görünmezse kaybolan bir bilgi.
   */
  if (bilgi.mentorMu && tur !== "MENTOR") parcalar.push("mentör");

  const metin = parcalar.filter(Boolean).join(" · ");
  return metin || "Dış kullanıcı";
}

/**
 * Seçilen dış kimlikle oturum açar.
 *
 * Şifre SORULMAZ — bu fonksiyonun tamamı geliştirme kipine aittir. Gerçek
 * giriş yolu ./giris.ts'tedir ve o dosya değişmedi: e-Devlet/SSO bağlandığında
 * silinecek olan burasıdır, orası değil.
 */
export async function mockDisGirisYap(
  authProviderId: string,
): Promise<MockDisGirisSonucu> {
  if (!mockDisGirisAcikMi()) {
    await kimlikDogrulamaLogla({
      islem: "GIRIS",
      basarili: false,
      kimlikBilgisi: authProviderId,
      saglayici: "dış kimlik · geliştirme kipi",
      neden: "kimlik seçimi kapalı",
    });
    return {
      durum: "BASARISIZ",
      mesaj: "Kimlik seçerek giriş kapalı. E-posta ve şifrenizle girin.",
    };
  }

  if (!authProviderId) {
    await kimlikDogrulamaLogla({
      islem: "GIRIS",
      basarili: false,
      saglayici: "dış kimlik · geliştirme kipi",
      neden: "kimlik seçilmedi",
    });
    return { durum: "BASARISIZ", mesaj: "Kimlik seçilmedi." };
  }

  const kullanici = await prisma.kullanici.findUnique({
    where: { authProviderId },
    select: {
      id: true,
      aktif: true,
      disKimlik: { select: { kullaniciId: true } },
    },
  });

  // Pasif hesap ve EBA'lı kullanıcı aynı cevabı alır: bu kapı yalnızca dış
  // kimliği olan aktif kullanıcıya açıktır.
  if (!kullanici || !kullanici.aktif || !kullanici.disKimlik) {
    await kimlikDogrulamaLogla({
      islem: "GIRIS",
      basarili: false,
      kullaniciId: kullanici?.id,
      kimlikBilgisi: authProviderId,
      saglayici: "dış kimlik · geliştirme kipi",
      neden: "kimlik doğrulanamadı",
    });
    return { durum: "BASARISIZ", mesaj: "Seçilen kimlikle giriş yapılamadı." };
  }

  await kimlikDogrulamaLogla({
    islem: "GIRIS",
    basarili: true,
    kullaniciId: kullanici.id,
    saglayici: "dış kimlik · geliştirme kipi",
  });
  await oturumAc(kullanici.id);

  return { durum: "BASARILI" };
}
