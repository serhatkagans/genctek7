import { oturumKullanicisi } from "@/lib/auth/oturum";
import {
  ozgecmisDosyaAdi,
  ozgecmisWordHtml,
} from "@/lib/ozgecmis/kurallar";
import { ozgecmisVerisiGetir } from "@/lib/ozgecmis/veri";
import { wordYaniti } from "@/lib/rapor/faaliyet-raporu";
import { erisimLogla } from "@/lib/yetki/log";

export const dynamic = "force-dynamic";

/**
 * PROFİLİN CV BİÇİMİNDEKİ WORD ÇIKTISI (28 Ağustos 2026 · istek: "profildeki
 * her şeyi cv formatında Word olarak indirebilsin, güzel bir cv formatı
 * olsun").
 *
 * ---------------------------------------------------------------------------
 * YALNIZCA KENDİ ÖZGEÇMİŞİ, ADRESTE KİMLİK YOK
 * ---------------------------------------------------------------------------
 * Rota `/panel/ozgecmis/[id]` DEĞİL: kimlik adrese girseydi, "başkasının
 * özgeçmişini kim indirebilir" diye ikinci bir kapsam kararı doğardı ve o
 * karar, bugün hiç kimsenin istemediği bir yetki için yazılmış olurdu.
 * Öğrencinin ve öğretmenin YÜKLEDİĞİ CV'yi indirme yolu ayrıdır ve kendi
 * kapsam filtresinden geçer (bkz. ogrenciler/[id]/cv/route.ts).
 *
 * Oturumsuz istek 404 alır, 401 değil — ekranın varlığı da sızmasın
 * (permissions.md Bölüm 4 ile aynı ölçü).
 *
 * ERİŞİM KAYDINA YAZILIYOR: belge kişinin bütün profilini tek dosyada dışarı
 * taşıyor. Kendi verisi olsa da "ne zaman dışarı çıktı" sorusunun bir cevabı
 * olmalı — aynı gerekçe yüklenen CV'nin indirilmesinde de yazılı.
 */
export async function GET() {
  const kullanici = await oturumKullanicisi();
  if (!kullanici) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const veri = await ozgecmisVerisiGetir(kullanici);

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "GORUNTULEME",
    /* Belgenin taşıdığı şey kişinin PROFİLİ; hedef tipi de o. */
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: "Özgeçmiş Word olarak indirildi",
  });

  return wordYaniti(
    ozgecmisDosyaAdi(veri.adSoyad),
    ozgecmisWordHtml(veri),
  );
}
