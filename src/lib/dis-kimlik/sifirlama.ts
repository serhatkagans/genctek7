import { prisma } from "../db";
import { erisimLogla } from "../yetki/log";
import { sifreSifirlamaEpostasi } from "./eposta";
import {
  epostaNormalle,
  SIFIRLAMA_GECERLILIK_DAKIKA,
  sifirlamaGecerliMi,
  sifirlamaYenidenIstenebilirMi,
  sifreKarariniVer,
} from "./kurallar";
import {
  sifirlamaJetonuDogrula,
  sifirlamaJetonuUret,
  sifreOzetle,
} from "./sifre";

/**
 * Parola sıfırlama — yalnızca dış kullanıcılar için.
 *
 * EBA/mock kimlikli kullanıcıların şifresi yoktur; bu akış onlara hiçbir
 * koşulda açılmaz.
 *
 * İKİ ADIM: (1) kişi e-postasını yazar, jeton gönderilir; (2) jetonla yeni
 * şifresini belirler. Jetonun KENDİSİ veritabanında durmaz, özeti durur.
 */

/**
 * Sıfırlama isteği.
 *
 * HER DURUMDA AYNI SONUÇ DÖNER — e-posta kayıtlı olsa da olmasa da. Aksi
 * hâlde bu ekran, "hangi e-posta bu sistemde kayıtlı" sorusunu cevaplayan bir
 * araca dönerdi. Kayıtlı değilse hiçbir ileti gitmez.
 *
 * @param baglantiKur Jetonu içeren tam adresi kuran fonksiyon. Adres, isteğin
 *   geldiği host'tan üretilir (bkz. app/sifre-sifirlama/eylemler.ts): ayrı bir
 *   ortam değişkeni tanımlamak, alt dizin kurulumunda (TEMEL_YOL) ikinci bir
 *   yanlış yapılandırma kaynağı olurdu.
 */
export async function sifirlamaIste(
  epostaGirdisi: string,
  baglantiKur: (eposta: string, jeton: string) => string,
  simdi: Date = new Date(),
): Promise<void> {
  const eposta = epostaNormalle(epostaGirdisi);
  if (!eposta) return;

  const kimlik = await prisma.disKimlik.findUnique({
    where: { eposta },
    select: {
      kullaniciId: true,
      sifirlamaSonGecerlilik: true,
      kullanici: { select: { ad: true, soyad: true, aktif: true } },
    },
  });

  if (!kimlik || !kimlik.kullanici.aktif) return;

  /*
   * BEKLEME SÜRESİ. Elde hâlâ geçerli ve az önce verilmiş bir bağlantı varsa
   * yenisi ÜRETİLMEZ: ne posta gider ne scrypt çalışır. Kontrol jeton
   * üretiminden ÖNCE durmalı — pahalı olan iş tam olarak o (bkz. kurallar.ts ·
   * SIFIRLAMA_BEKLEME_DAKIKA).
   *
   * Dışarıya görünen davranış değişmez: çağıran yine sessizce döner ve ekran
   * yine "gönderildi" der. Burada "biraz bekleyin" demek, e-postanın kayıtlı
   * olduğunu doğrulayan bir sinyal olurdu — akışın tamamı bunu söylememek
   * üzerine kurulu.
   */
  if (!sifirlamaYenidenIstenebilirMi(kimlik.sifirlamaSonGecerlilik, simdi)) {
    return;
  }

  const { jeton, ozet } = await sifirlamaJetonuUret();

  await prisma.disKimlik.update({
    where: { kullaniciId: kimlik.kullaniciId },
    data: {
      sifirlamaJetonuOzeti: ozet,
      sifirlamaSonGecerlilik: new Date(
        simdi.getTime() + SIFIRLAMA_GECERLILIK_DAKIKA * 60000,
      ),
    },
  });

  await sifreSifirlamaEpostasi(
    eposta,
    `${kimlik.kullanici.ad} ${kimlik.kullanici.soyad}`,
    baglantiKur(eposta, jeton),
    SIFIRLAMA_GECERLILIK_DAKIKA,
  );

  await erisimLogla({
    kullaniciId: kimlik.kullaniciId,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kimlik.kullaniciId,
    detay: "Şifre sıfırlama bağlantısı istendi",
  });
}

export type SifirlamaSonucu =
  | { olduMu: true }
  | { olduMu: false; neden: string };

/**
 * Jetonla yeni şifreyi yazar.
 *
 * Jeton TEK KULLANIMLIKTIR: başarıda da başarısızlıkta da (süresi geçmişse)
 * temizlenir. Ayrıca kilit sayaçları sıfırlanır — şifresini sıfırlayan kişiyi
 * eski hatalı denemeleri yüzünden kapıda bırakmanın anlamı yok.
 */
export async function sifirlamayiTamamla(
  epostaGirdisi: string,
  jeton: string,
  yeniSifre: string,
  yeniSifreTekrar: string,
  simdi: Date = new Date(),
): Promise<SifirlamaSonucu> {
  const eposta = epostaNormalle(epostaGirdisi);
  const gecersiz = {
    olduMu: false as const,
    neden:
      "Sıfırlama bağlantısı geçersiz ya da süresi dolmuş. Yeniden sıfırlama isteyin.",
  };

  if (!eposta || !jeton) return gecersiz;

  const kimlik = await prisma.disKimlik.findUnique({
    where: { eposta },
    select: {
      kullaniciId: true,
      sifirlamaJetonuOzeti: true,
      sifirlamaSonGecerlilik: true,
      kullanici: { select: { ad: true, soyad: true, aktif: true } },
    },
  });

  if (!kimlik || !kimlik.kullanici.aktif || !kimlik.sifirlamaJetonuOzeti) {
    return gecersiz;
  }

  if (!sifirlamaGecerliMi(kimlik.sifirlamaSonGecerlilik, simdi)) {
    await prisma.disKimlik.update({
      where: { kullaniciId: kimlik.kullaniciId },
      data: { sifirlamaJetonuOzeti: null, sifirlamaSonGecerlilik: null },
    });
    return gecersiz;
  }

  if (!(await sifirlamaJetonuDogrula(jeton, kimlik.sifirlamaJetonuOzeti))) {
    return gecersiz;
  }

  if (yeniSifre !== yeniSifreTekrar) {
    return { olduMu: false, neden: "Şifre ile tekrarı aynı değil." };
  }

  const karar = sifreKarariniVer(yeniSifre, {
    ad: kimlik.kullanici.ad,
    soyad: kimlik.kullanici.soyad,
    eposta,
  });
  if (!karar.olurMu) {
    return { olduMu: false, neden: karar.neden };
  }

  /*
   * ŞİFRE VE OTURUM SÜRÜMÜ TEK İŞLEMDE: ikisi ayrı yazılsaydı ve arada bir hata
   * çıksaydı, şifre değişmiş ama eski oturumlar ayakta kalmış olurdu — yani
   * kullanıcının "şifremi değiştirdim, artık güvendeyim" varsayımı sessizce
   * yanlış olurdu.
   *
   * SÜRÜM NİYE ARTIYOR: şifresini sıfırlayan kişi çoğu zaman bunu hesabına
   * başkasının eriştiğinden şüphelendiği için yapar. Şifre yeni çerez almayı
   * engeller, ELDEKİ çerezi engellemez; sürüm artınca o çerezlerin hepsi bir
   * anda geçersizleşir (bkz. auth/oturum.ts).
   */
  await prisma.$transaction([
    prisma.disKimlik.update({
      where: { kullaniciId: kimlik.kullaniciId },
      data: {
        sifreOzeti: await sifreOzetle(yeniSifre),
        sifirlamaJetonuOzeti: null,
        sifirlamaSonGecerlilik: null,
        basarisizDeneme: 0,
        kilitBitisTarihi: null,
      },
    }),
    prisma.kullanici.update({
      where: { id: kimlik.kullaniciId },
      data: { oturumSurumu: { increment: 1 } },
    }),
  ]);

  await erisimLogla({
    kullaniciId: kimlik.kullaniciId,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kimlik.kullaniciId,
    detay: "Şifre sıfırlandı; açık oturumlar düşürüldü",
  });

  return { olduMu: true };
}
