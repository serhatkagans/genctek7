import { prisma } from "../db";

/**
 * OKUL TEMSİLCİM — öğrenciye gösterilecek kadarıyla okulunun temsilcisi
 * (31 Ağustos 2026 · istek: "Öğrenci panelinde danışman öğretmeni kartının
 * yanına okul temsilcim kartı eklensin").
 *
 * ---------------------------------------------------------------------------
 * NİYE `ilKoordinatoruOzeti`NİN YANINA DEĞİL AYRI DOSYAYA
 * ---------------------------------------------------------------------------
 * İki soru benziyor ama kaynakları başka tablolar: koordinatörlük bir
 * `kullanici_rol` kaydıdır ve süresizdir (bitiş tarihiyle kapanır), okul
 * temsilciliği ise `ogrenci_gorev_rolu` kaydıdır ve ÖĞRETİM YILINA bağlıdır.
 * `rol/koordinator.ts` atama ve kaldırma kurallarını da taşıyor; buraya
 * eklenseydi iki ayrı görevin yaşam döngüsü tek dosyada karışırdı.
 *
 * ---------------------------------------------------------------------------
 * DÖNEM KOŞULU ŞART
 * ---------------------------------------------------------------------------
 * Görev kaydında bitiş tarihi YOK; görevin süresi `egitimOgretimYili`
 * sütununda duruyor. Koşul konmazsa geçen yılın temsilcisi bugün de temsilci
 * görünür ve öğrenciye "ona ulaşabilirsin" demiş oluruz — oysa o kişi mezun
 * olmuş bile olabilir. Aynı ölçü Yazışmalar ekranındaki temsilci listesinde de
 * yazılı.
 *
 * ---------------------------------------------------------------------------
 * NİYE `findMany`, `findFirst` DEĞİL
 * ---------------------------------------------------------------------------
 * Bir okulun aynı dönemde tek temsilcisi olması BEKLENİR ama veritabanında bunu
 * zorlayan bir kısıt YOK (`ogrenci_gorev_rolu` üzerinde kısmi unique index
 * bulunmuyor; koordinatörlükteki `ux_il_koordinator_tek_aktif`in karşılığı
 * burada yazılmamış). `findFirst` bu durumda ikinciyi sessizce yutar ve
 * öğrenci, okulunda iki temsilci varken keyfî olarak birini görürdü. Liste
 * dönmek, ekrana da doğruyu söyleme imkânı veriyor.
 */
export interface OkulTemsilcisiOzeti {
  id: number;
  ad: string;
  soyad: string;
  sinif: string | null;
  /** Kişinin kendi girdiği adres; girmemişse null. */
  eposta: string | null;
  /** Fotoğrafın kendisi rotadan gelir; burada yalnızca VAR MI bilgisi. */
  fotoVarMi: boolean;
}

export async function okulTemsilcileriniGetir(
  kurumKodu: number,
  egitimOgretimYili: string,
): Promise<OkulTemsilcisiOzeti[]> {
  const gorevler = await prisma.ogrenciGorevRolu.findMany({
    where: { rolKodu: "OKUL_TEMSILCISI", kurumKodu, egitimOgretimYili },
    orderBy: { atamaTarihi: "asc" },
    select: {
      ogrenci: {
        select: {
          id: true,
          ad: true,
          soyad: true,
          sinif: true,
          aktif: true,
          fotoDepolamaYolu: true,
          ogrenciProfil: { select: { eposta: true } },
        },
      },
    },
  });

  return (
    gorevler
      /*
       * Pasife alınmış öğrenci temsilci olarak gösterilmez: görev kaydı
       * teknik olarak duruyor olabilir ama kendisine ulaşılamaz. Koordinatör
       * özetinde de aynı eleme var.
       */
      .filter((gorev) => gorev.ogrenci.aktif)
      .map((gorev) => ({
        id: gorev.ogrenci.id,
        ad: gorev.ogrenci.ad,
        soyad: gorev.ogrenci.soyad,
        sinif: gorev.ogrenci.sinif,
        eposta: gorev.ogrenci.ogrenciProfil?.eposta?.trim() || null,
        fotoVarMi: gorev.ogrenci.fotoDepolamaYolu !== null,
      }))
  );
}
