import { oturumKullanicisi } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { depolama } from "@/lib/depolama";
import { ogrenciKapsamFiltresi } from "@/lib/yetki/kapsam";
import { erisimLogla } from "@/lib/yetki/log";

export const dynamic = "force-dynamic";

/**
 * Öğrencinin CV'sini indirir.
 *
 * Dosya public bir dizinden servis EDİLMEZ: her istek önce oturumdan, sonra
 * merkezi öğrenci kapsam filtresinden geçer. Aksi halde adresi bilen herkes
 * herhangi bir öğrencinin özgeçmişini indirebilirdi.
 *
 * Kapsam dışı öğrencide 403 değil 404 döner — kaydın varlığı sızmasın
 * (references/permissions.md Bölüm 4). Öğrencinin kendi CV'si de bu yoldan
 * iner: kapsam filtresi öğrenci için "yalnızca kendisi" filtresi üretiyor,
 * ayrı bir dal gerekmiyor.
 */
export async function GET(
  _istek: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const kullanici = await oturumKullanicisi();
  if (!kullanici) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const ogrenciId = Number.parseInt(id, 10);
  if (!Number.isInteger(ogrenciId)) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const ogrenci = await prisma.kullanici.findFirst({
    where: { AND: [{ id: ogrenciId }, ogrenciKapsamFiltresi(kullanici)] },
    select: {
      id: true,
      ogrenciProfil: {
        select: {
          cvDosyaAdi: true,
          cvDepolamaYolu: true,
          cvMimeTipi: true,
        },
      },
    },
  });

  const cv = ogrenci?.ogrenciProfil;
  if (!cv?.cvDepolamaYolu || !cv.cvDosyaAdi || !cv.cvMimeTipi) {
    return new Response("Bulunamadı", { status: 404 });
  }

  let icerik: Buffer;
  try {
    icerik = await depolama().oku(cv.cvDepolamaYolu);
  } catch {
    // Kayıt var ama dosya yok: 500 yerine 404 daha dürüst bir cevap.
    return new Response("Bulunamadı", { status: 404 });
  }

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "GORUNTULEME",
    hedefTip: "OGRENCI",
    hedefId: ogrenciId,
    detay: `Öğrenci CV'si açıldı: ${cv.cvDosyaAdi}`,
  });

  return new Response(new Uint8Array(icerik), {
    headers: {
      "Content-Type": cv.cvMimeTipi,
      /*
       * TARAYICIDA AÇILABİLENLER `inline` GELİR (7 Ağustos 2026 · istek:
       * "özgeçmişe tıklanınca sayfada ya da yeni sekmede açılacak").
       *
       * Ayrım tipe göre yapılıyor, hepsine birden `inline` denmiyor: pdf
       * tarayıcının kendi görüntüleyicisinde açılır ama doc/docx açılamaz ve
       * "inline" başlığıyla gelen bir Word belgesi bazı tarayıcılarda ADSIZ
       * indirilir — kullanıcı elinde ne olduğu belirsiz bir dosyayla kalır.
       * O yüzden açılamayanlar `attachment` olarak, adıyla iner.
       *
       * Dosya adı ASCII dışı karakter içerebildiği için RFC 5987 biçimi
       * kullanılır.
       */
      "Content-Disposition": `${tarayicidaAcilirMi(cv.cvMimeTipi) ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(cv.cvDosyaAdi)}`,
      "Content-Length": String(icerik.byteLength),
      /*
       * `X-Content-Type-Options: nosniff` BURADA YAZILMIYOR, next.config.ts
       * onu `/:yol*` ile bu rota dahil her yanıta veriyor (ölçüldü). Satır
       * burada da duruyordu; kaldırıldı çünkü aynı başlığın iki kaynağı,
       * birini değiştirenin diğerini görmemesi demek — korumanın kalktığı
       * sanılan ya da kalktığı fark edilmeyen hâller oradan çıkar.
       *
       * Koruma neye karşı: dosya `inline` gelebiliyor ve tarayıcının içeriğe
       * bakıp tipi kendi tahmin etmesi (MIME sniffing), pdf diye yüklenmiş bir
       * dosyanın HTML olarak yorumlanmasına yol açardı. İkinci savunma
       * yüklemede: içerik artık imzasıyla doğrulanıyor
       * (lib/guvenlik/dosya-imzasi.ts), yani `cvMimeTipi` istemcinin yazdığı
       * doğrulanmamış bir dize olmaktan çıktı.
       */
      // Kapsam kontrolünden geçen içerik ara belleklerde tutulmamalı.
      "Cache-Control": "private, no-store",
    },
  });
}

/**
 * Tarayıcının kendi görüntüleyicisinde açabildiği CV biçimleri.
 *
 * Liste DAR ve beyaz listedir: `inline` gelen her tip, oturum arkasındaki bu
 * adreste tarayıcıya bir şey yorumlatma fırsatıdır. Yalnızca pdf var — doc ve
 * docx zaten açılamıyor.
 */
function tarayicidaAcilirMi(mimeTipi: string): boolean {
  return mimeTipi === "application/pdf";
}
