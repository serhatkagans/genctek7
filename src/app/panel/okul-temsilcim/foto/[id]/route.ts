import { oturumKullanicisi } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { depolama } from "@/lib/depolama";
import { ogrenciMi } from "@/lib/yetki/izinler";

export const dynamic = "force-dynamic";

/**
 * KİŞİNİN KENDİ OKULUNUN temsilcisinin profil fotoğrafını servis eder
 * (31 Ağustos 2026).
 *
 * ---------------------------------------------------------------------------
 * NİYE ADRESTE KİMLİK VAR — koordinatör rotasının aksine
 * ---------------------------------------------------------------------------
 * `/panel/il-koordinatorum/foto` kimlik almıyor çünkü bir ilin tek koordinatörü
 * var ve soru "BENİM koordinatörümün fotoğrafı" biçiminde sorulabiliyor. Okul
 * temsilciliğinde bunu zorlayan bir veritabanı kısıtı YOK (bkz.
 * lib/rol/okul-temsilcisi.ts): ikinci bir temsilci varsa kimliksiz bir rota
 * hangisini vereceğini bilemez ve ekranda iki farklı kişinin yanında aynı
 * fotoğraf çıkardı.
 *
 * KİMLİK KAPIYI GENİŞLETMİYOR: kapsam yine sorunun İÇİNDE duruyor — sorgu
 * "şu kullanıcının fotoğrafı" değil, "benim okulumun bu dönemki temsilcisi
 * olan şu kişinin fotoğrafı" diye soruluyor. Kimliği başkasınınkiyle
 * değiştiren istek, o kişi okulun temsilcisi değilse 404 alır.
 *
 * KAPI PANELDEKİ KARTLA AYNI: öğrenci ve okul kaydı olan. Öğretmene kapalı —
 * kart da sayfa da onda yok.
 *
 * Koşulları sağlamayan her istek 404 alır, 403 değil: 403 "böyle biri var ama
 * göremezsin" der ve kaydın varlığını sızdırır (permissions.md · Bölüm 4).
 */
export async function GET(
  _istek: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const kullanici = await oturumKullanicisi();
  if (!kullanici || !ogrenciMi(kullanici) || kullanici.kurumKodu === null) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const { id } = await params;
  const temsilciId = Number(id);
  if (!Number.isInteger(temsilciId)) {
    return new Response("Bulunamadı", { status: 404 });
  }

  /*
   * Fotoğraf GÖREV KAYDI üzerinden aranıyor, kullanıcı üzerinden değil: böylece
   * "bu kişi hâlâ benim okulumun bu dönemki temsilcisi mi" koşulu sorgunun
   * kendisinde duruyor ve ayrı bir `if` ile atlanması mümkün değil. Geçen yılın
   * temsilcisinin fotoğrafı da böylece verilmiyor.
   */
  const gorev = await prisma.ogrenciGorevRolu.findFirst({
    where: {
      rolKodu: "OKUL_TEMSILCISI",
      kurumKodu: kullanici.kurumKodu,
      egitimOgretimYili: kullanici.egitimOgretimYili,
      ogrenciId: temsilciId,
    },
    select: {
      ogrenci: {
        select: { aktif: true, fotoDepolamaYolu: true, fotoMimeTipi: true },
      },
    },
  });

  const foto = gorev?.ogrenci;
  if (!foto?.aktif || !foto.fotoDepolamaYolu || !foto.fotoMimeTipi) {
    return new Response("Bulunamadı", { status: 404 });
  }

  let icerik: Buffer;
  try {
    icerik = await depolama().oku(foto.fotoDepolamaYolu);
  } catch {
    // Kayıt var ama dosya yok: 500 yerine 404 daha dürüst bir cevap.
    return new Response("Bulunamadı", { status: 404 });
  }

  return new Response(new Uint8Array(icerik), {
    headers: {
      "Content-Type": foto.fotoMimeTipi,
      "Content-Disposition": "inline",
      "Content-Length": String(icerik.byteLength),
      // private: paylaşımlı ara belleklerde tutulmamalı; fotoğraf kişisel veri.
      "Cache-Control": "private, max-age=300",
    },
  });
}
