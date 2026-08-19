import "dotenv/config";
import type { HataKaydi } from "../src/lib/hata-kurallar";
import {
  hataAylariniGetir,
  hataKayitlariniGetir,
  hataOzetiGetir,
} from "../src/lib/hata-okuma";

/**
 * Hata kimliğini günlükte arar.
 *
 *   npm run hata:ara 598556021     → o kimliğe ait kayıtlar
 *   npm run hata:ara               → en çok tekrarlayan hataların özeti
 *
 * Kullanıcı ekranda yalnızca kimliği görüyor; bu betik o kimliğin karşılığını
 * (hangi adres, hangi hata, ne zaman) çıkarır. Yığın izi TAM basılır — betik
 * yöneticinin sunucusunda çalışıyor, ekranda kısaltmanın bir faydası yok.
 *
 * OKUMA MANTIĞI ARTIK PAYLAŞILIYOR (18 Ağustos 2026). Günlüğü ayrıştırma ve
 * süzme işi burada elle yazılıydı; `/panel/hata-kayitlari` ekranı eklenirken
 * kopyalanmak yerine `src/lib/hata-okuma.ts`'e taşındı. İki çözümleme, biri
 * düzeltilip öbürü unutulduğunda sessizce ayrışır — bu depoda süzgeç
 * çözümlemesinin kopyalanması iki kez bu sonucu verdi.
 *
 * BETİK YİNE DE DURUYOR: ekran sunucuya erişimi olmayan proje yöneticisi için,
 * betik ise panel hiç açılmıyorken (asıl arıza panelin kendisindeyken) bakacak
 * yer lazım olduğu için.
 */

/** Özet listesinde basılan en fazla satır. */
const OZET_SATIRI = 20;

function yaz(kayit: HataKaydi): void {
  console.log("─".repeat(72));
  console.log(`Kimlik : ${kayit.kimlik}`);
  console.log(`Zaman  : ${kayit.zaman}`);
  console.log(`İstek  : ${kayit.yontem ?? "—"} ${kayit.yol ?? "—"}`);
  console.log(`Hata   : ${kayit.ad}: ${kayit.mesaj}`);
  if (kayit.yiginIzi) console.log(kayit.yiginIzi);
}

async function main() {
  const aranan = process.argv[2]?.trim();

  const { aylar, dizinVarMi } = await hataAylariniGetir();
  if (!dizinVarMi || aylar.length === 0) {
    console.log("Günlükte hiç kayıt yok.");
    console.log("Henüz hiç sunucu hatası kaydedilmemiş olabilir.");
    return;
  }

  if (!aranan) {
    /*
     * KİMLİKSİZ ÇAĞRIDA ARTIK "son 20 kayıt" DEĞİL, "en çok tekrarlayan 20
     * hata" basılıyor. Ham kronolojik liste, tek bir hatanın yüzlerce kez
     * tekrarladığı bir günde geri kalan her şeyi gömüyordu: ilk ayın 1.481
     * kaydı yalnızca 50 farklı hataydı ve bir tanesi 794 kez yazılmıştı.
     */
    const ozet = await hataOzetiGetir({
      aylar,
      filtre: {},
      siralama: "adet",
    });
    console.log(
      `${ozet.toplamKayit} kayıt · ${ozet.gruplar.length} farklı hata · en çok tekrarlayan ${OZET_SATIRI}:`,
    );
    for (const grup of ozet.gruplar.slice(0, OZET_SATIRI)) {
      console.log("─".repeat(72));
      console.log(`Tekrar : ${grup.adet}`);
      console.log(`Son    : ${grup.sonZaman}`);
      console.log(`Adres  : ${grup.yollar.join(", ") || "—"}`);
      console.log(`Hata   : ${grup.ad}: ${grup.baslik}`);
    }
    console.log("─".repeat(72));
    console.log("Bir kimliğin kayıtları için: npm run hata:ara <kimlik>");
    return;
  }

  const sonuc = await hataKayitlariniGetir({
    aylar,
    filtre: { kimlik: aranan },
  });

  if (sonuc.toplam === 0) {
    console.log(`"${aranan}" kimliğiyle kayıt bulunamadı.`);
    console.log(
      "Hata, günlük açılmadan önce oluşmuş olabilir; sunucunun terminal çıktısına bakın.",
    );
    return;
  }

  console.log(
    sonuc.kirpildiMi
      ? `"${aranan}" için ${sonuc.toplam} kayıt · en yeni ${sonuc.kayitlar.length} tanesi:`
      : `"${aranan}" için ${sonuc.toplam} kayıt:`,
  );
  // En yeni ÜSTTE geliyor; terminalde en eski üstte okumak daha doğal.
  [...sonuc.kayitlar].reverse().forEach(yaz);
}

main();
