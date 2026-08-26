import { oturumKullanicisi } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { depolama } from "@/lib/depolama";

export const dynamic = "force-dynamic";

/**
 * KİŞİNİN KENDİ İLİNİN koordinatörünün profil fotoğrafını servis eder.
 *
 * NİYE AYRI BİR ROTA: `/panel/profil/foto` yalnızca oturumdaki kişinin KENDİ
 * fotoğrafını verir ve adreste kimlik taşımaz; `/panel/mentorler/[id]/foto` ise
 * yalnızca ONAYLI MENTÖRÜN fotoğrafını verir. İl koordinatörü ikisi de değil.
 *
 * ADRESTE KİMLİK YOK ve bu bilinçli: rota "şu kullanıcının fotoğrafı" değil
 * "BENİM koordinatörümün fotoğrafı" sorusunu cevaplıyor. Kimlik alsaydı,
 * kapsam kontrolü unutulduğunda her kullanıcının fotoğrafını veren genel bir
 * kapıya dönüşebilirdi. Burada kapsam sorunun kendisinde: oturumdaki kişinin
 * ili neyse, o ilin görevdeki koordinatörü.
 *
 * KAPI: kişinin bir ili olmalı. Mezun ve paydaş temsilcisinde il yok, merkez
 * personelinin de tek bir ile bağlılığı yok — ikisi de 404 alır.
 *
 * Kimlik doğrulanamayan ya da koşulları sağlamayan her istek 404 alır, 403
 * değil: 403 "böyle biri var ama göremezsin" der ve kaydın varlığını sızdırır
 * (references/permissions.md · Bölüm 4).
 */
export async function GET(): Promise<Response> {
  const kullanici = await oturumKullanicisi();
  if (!kullanici?.ilKodu) {
    return new Response("Bulunamadı", { status: 404 });
  }

  /*
   * Fotoğraf GÖREV KAYDI üzerinden aranıyor, kullanıcı üzerinden değil: böylece
   * "bu kişi hâlâ o ilin koordinatörü mü" koşulu sorgunun kendisinde duruyor ve
   * ayrı bir `if` ile atlanması mümkün değil. Görevi biten koordinatörün
   * fotoğrafı da böylece verilmiyor.
   */
  const rol = await prisma.kullaniciRol.findFirst({
    where: {
      rolKodu: "IL_KOORDINATOR",
      ilKodu: kullanici.ilKodu,
      bitisTarihi: null,
    },
    select: {
      kullanici: {
        select: { aktif: true, fotoDepolamaYolu: true, fotoMimeTipi: true },
      },
    },
  });

  const foto = rol?.kullanici;
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
