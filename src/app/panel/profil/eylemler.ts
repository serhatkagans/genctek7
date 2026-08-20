"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  profilFotoKaydet,
  profilFotoSil,
  profilFotoSinirlariniGetir,
} from "@/lib/kullanici/profil-foto";
import {
  destekGruplariniAyikla,
  disProfiliDogrula,
} from "@/lib/dis-kimlik/profil-kurallar";
import { saltOkunurAlanlariAyikla } from "@/lib/kullanici/salt-okunur";
import { baglantilariDogrula } from "@/lib/ogrenci/iletisim-kurallar";
import { danismanlikDurumunuDegistir } from "@/lib/ogretmen/danismanlik";
import { erisimLogla } from "@/lib/yetki/log";
import { disKullaniciMi, ogrenciMi } from "@/lib/yetki/izinler";
import { YetkiHatasi } from "@/lib/yetki/tipler";

/**
 * Kişinin kendi düzenleyebileceği alanlar. Diğer her şey salt okunurdur.
 *
 * Liste role göre değişmez: iletişim bilgisi kimlik bilgisi değildir, e-Okul'dan
 * gelmez ve kim olursa olsun sahibi tarafından girilir. Rol farkı yalnızca
 * bilginin hangi profil tablosuna yazıldığındadır — kurum/görev/açıklama
 * alanları yalnızca dış kullanıcıya sorulduğu için öğretmende sessizce düşer.
 */
const IZINLI_ALANLAR = [
  "eposta",
  "telefon",
  "githubUrl",
  "kisiselSiteUrl",
  "linkedinUrl",
  // Dış kullanıcının kendi yazdığı kurum, görev ve katkı açıklaması
  // (7 Ağustos 2026). İl, ad ve soyad BU LİSTEDE DEĞİL: onlar başvurudan gelen
  // kimlik bilgileridir ve kişi değiştiremez.
  "kurumAdi",
  "gorevUnvani",
  "aciklama",
] as const;

/**
 * Formların yaşadığı ekran — dönüş adresi.
 *
 * TEK EKRAN (20 Ağustos 2026 · panel-profil birleşmesi): yazılan bilgi de
 * onu yazan form da burada. Ayrı bir "gösterim yüzeyi" tazelemesi kalktı;
 * `/panel/profil` artık yalnızca buraya yönlendiren bir adres.
 */
const YOL = "/panel";

function yollariTazele(): void {
  revalidatePath(YOL);
}

/**
 * Panelim'e, ilgili bölüm AÇIK olarak döner.
 *
 * `bolum` parametresi ÇIPADAN AYRI ve ikisi de gerekli: bölümler katlanabilir
 * `<details>` öğeleri ve kapalı bir öğenin çapasına inmek kullanıcıyı boş bir
 * başlığa götürürdü — az önce doldurduğu form gözden kaybolurdu. Sayfa
 * `bolum` değerine bakıp o bölümü açık basıyor, çapa da oraya kaydırıyor.
 */
function panele(capa: string, sorgu: string): never {
  yollariTazele();
  redirect(`${YOL}?bolum=${capa}&${sorgu}#${capa}`);
}

export async function profilGuncelleEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const gelenVeri = Object.fromEntries(veri.entries());
  delete gelenVeri.$ACTION_ID;

  const { temizVeri, yoksayilanAlanlar } = saltOkunurAlanlariAyikla<{
    eposta: string;
    telefon: string;
    githubUrl: string;
    kisiselSiteUrl: string;
    linkedinUrl: string;
    kurumAdi: string;
    gorevUnvani: string;
    aciklama: string;
  }>(gelenVeri, IZINLI_ALANLAR);

  // Salt okunur alanlar istekte gelirse sessizce yok sayılır, hata
  // döndürülmez — ama loglanır (references/permissions.md Bölüm 7).
  if (yoksayilanAlanlar.length > 0) {
    await erisimLogla({
      kullaniciId: kullanici.id,
      islem: "DEGISIKLIK",
      hedefTip: "PROFIL",
      hedefId: kullanici.id,
      detay: `Salt okunur alanlar yok sayıldı: ${yoksayilanAlanlar.join(", ")}`,
    });
  }

  const iletisim = {
    eposta: temizVeri.eposta?.trim() || null,
    telefon: temizVeri.telefon?.trim() || null,
  };

  /*
   * İki ayrı profil tablosu var çünkü öğrenci ve personel profilleri farklı
   * alanlar taşıyor (biri aydınlatma onayı, diğeri danışmanlık işareti).
   * Yazılan bilgi aynı olduğu için ayrım yalnızca burada yapılır.
   */
  if (ogrenciMi(kullanici)) {
    const karar = baglantilariDogrula({
      githubUrl: temizVeri.githubUrl,
      kisiselSiteUrl: temizVeri.kisiselSiteUrl,
      linkedinUrl: temizVeri.linkedinUrl,
    });
    if (!karar.olurMu) {
      panele(
        "iletisim-bilgilerim",
        `hata=${encodeURIComponent(karar.neden)}`,
      );
    }

    const ogrenciVerisi = { ...iletisim, ...karar.baglantilar };
    await prisma.ogrenciProfil.upsert({
      where: { kullaniciId: kullanici.id },
      update: ogrenciVerisi,
      create: { kullaniciId: kullanici.id, ...ogrenciVerisi },
    });
  } else if (disKullaniciMi(kullanici)) {
    /*
     * DIŞ KULLANICI: iletişimin yanında bağlantılar, kurum, görev ve katkı
     * açıklaması da yazılır (7 Ağustos 2026).
     *
     * Öğretmenden ayrı dal, alan listesi farklı olduğu için: öğretmene bu
     * alanlar sorulmuyor ve formu gelmeyen alanları boş string olarak
     * göndermediği için tek dalda birleştirmek, öğretmenin (hiç görmediği)
     * kurum alanını her kayıtta null'lardı.
     */
    const karar = baglantilariDogrula({
      githubUrl: temizVeri.githubUrl,
      kisiselSiteUrl: temizVeri.kisiselSiteUrl,
      linkedinUrl: temizVeri.linkedinUrl,
    });
    if (!karar.olurMu) {
      panele("iletisim-bilgilerim", `hata=${encodeURIComponent(karar.neden)}`);
    }

    const profilKarari = disProfiliDogrula({
      kurumAdi: temizVeri.kurumAdi ?? "",
      gorevUnvani: temizVeri.gorevUnvani ?? "",
      aciklama: temizVeri.aciklama ?? "",
    });
    if (!profilKarari.olurMu) {
      panele(
        "iletisim-bilgilerim",
        `hata=${encodeURIComponent(profilKarari.neden)}`,
      );
    }

    const disVeri = {
      ...iletisim,
      ...karar.baglantilar,
      ...profilKarari.degerler,
    };
    await prisma.ogretmenProfil.upsert({
      where: { kullaniciId: kullanici.id },
      update: disVeri,
      create: { kullaniciId: kullanici.id, ...disVeri },
    });
  } else {
    await prisma.ogretmenProfil.upsert({
      where: { kullaniciId: kullanici.id },
      update: iletisim,
      create: { kullaniciId: kullanici.id, ...iletisim },
    });
  }

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: ogrenciMi(kullanici) ? "PROFIL" : "OGRETMEN",
    hedefId: kullanici.id,
    detay: "İletişim bilgileri güncellendi",
  });

  panele("iletisim-bilgilerim", "durum=iletisim-kaydedildi");
}

/**
 * "Çalışma Grupları" — katkı verebileceği alanların seçimi (7 Ağustos 2026).
 *
 * Yalnızca dış kullanıcıya açık: öğrencinin çalışma grubu seçimi ayrı bir
 * tabloda ve ayrı bir anlamda (hangi grupta çalışıyor), öğretmenin karşılığı
 * ise mentörlük kaydıdır. Kapı burada kapalı tutuluyor ki form elle
 * gönderildiğinde başka bir rol bu tabloya satır açamasın.
 *
 * SEÇİM TOPLUCA YAZILIR: gelmeyen her grup silinir. Fark hesaplamak yerine
 * "önce sil, sonra yaz" seçildi çünkü kayıt kişi başına en fazla grup sayısı
 * kadar satır ve işlem tek transaction içinde.
 */
export async function destekGruplariEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!disKullaniciMi(kullanici)) {
    throw new YetkiHatasi("Çalışma grubu katkı seçimi bu hesap için açık değil.");
  }

  const gecerliGruplar = await prisma.calismaGrubu.findMany({
    where: { aktif: true },
    select: { id: true },
  });

  const secilenler = destekGruplariniAyikla(
    veri.getAll("calismaGrubuId").map((deger) => String(deger)),
    gecerliGruplar.map((grup) => grup.id),
  );

  await prisma.$transaction([
    prisma.kullaniciDestekGrubu.deleteMany({
      where: { kullaniciId: kullanici.id },
    }),
    prisma.kullaniciDestekGrubu.createMany({
      data: secilenler.map((calismaGrubuId) => ({
        kullaniciId: kullanici.id,
        calismaGrubuId,
      })),
    }),
  ]);

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: `Katkı verilebilecek çalışma grupları güncellendi (${secilenler.length} grup)`,
  });

  panele("katki-alanlarim", "durum=destek-gruplari-kaydedildi");
}

export async function danismanlikEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  const gorevAlmakIstiyor = veri.get("gorevAlmakIstiyor") === "evet";

  await danismanlikDurumunuDegistir(kullanici.id, gorevAlmakIstiyor);

  /*
   * YÖNLENDİRME YOK — bilerek. Kullanıcı zaten Panelim'de ve `revalidatePath`
   * sonrası Next sayfayı eylem yanıtında yeniden üretiyor; gezinme olmadığı
   * için kaydırma konumu da bozulmuyor. Rol değiştiği için düzen de
   * tazeleniyor: menü ve şerit rol bilgisine bakıyor.
   */
  revalidatePath("/panel", "layout");
  yollariTazele();
}

// ---------------------------------------------------------------------------
// Profil fotoğrafı
// ---------------------------------------------------------------------------

/*
 * Rol kontrolü YOKTUR ve olmamalıdır: fotoğraf herkesin — öğrenci, öğretmen,
 * il koordinatörü, YEĞİTEK personeli. Kazanım ve CV eylemlerindeki
 * `ogrenciZorunlu()` kapısının buradaki karşılığı, işlemin her zaman
 * `kullanici.id` üzerinde çalışmasıdır: hedef kimlik hiçbir yerde form
 * girdisinden okunmaz, dolayısıyla kimse başkasının fotoğrafını değiştiremez.
 */

export async function profilFotoYukleEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const dosya = veri.get("foto");
  if (!(dosya instanceof File) || dosya.size === 0) {
    panele("fotografim", `hata=${encodeURIComponent("Fotoğraf seçilmedi.")}`);
  }

  const sonuc = await profilFotoKaydet({
    kullaniciId: kullanici.id,
    dosya,
    sinirlar: await profilFotoSinirlariniGetir(),
  });
  if (!sonuc.olurMu) {
    redirect(
      `${YOL}?hata=${encodeURIComponent(sonuc.neden ?? "Fotoğraf yüklenemedi.")}`,
    );
  }

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: "Profil fotoğrafı yüklendi",
  });

  panele("fotografim", "durum=foto-yuklendi");
}

export async function profilFotoSilEylemi(): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const silindi = await profilFotoSil(kullanici.id);
  if (!silindi) {
    redirect(
      `${YOL}?hata=${encodeURIComponent("Kaldırılacak bir fotoğraf bulunamadı.")}`,
    );
  }

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "SILME",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: "Profil fotoğrafı kaldırıldı",
  });

  panele("fotografim", "durum=foto-silindi");
}
