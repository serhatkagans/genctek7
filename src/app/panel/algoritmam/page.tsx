import { CircleDashed, CircleCheck, Compass, Lock } from "lucide-react";
import Link from "next/link";
import { BilgiKutusu, Kart, SayfaBasligi } from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { envanterAcikMi, envanterHazirMi } from "@/lib/envanter/kurallar";
import { ENVANTERLER } from "@/lib/envanter/tanimlar";
import { tarihYaz } from "@/lib/tarih";

export const dynamic = "force-dynamic";

/**
 * Öz değerlendirme — envanter listesi (E).
 *
 * EKRANIN ADI "ALGORİTMAM" DEĞİL (20 Ağustos 2026 · istek: "Algoritmam öz
 * değerlendirme olsun"). Adres `/panel/algoritmam` olarak KALDI: yer imleri,
 * bildirim bağlantıları ve paneldeki kart oraya bakıyor; bir ekranın adını
 * değiştirmek adresini değiştirmeyi gerektirmiyor.
 *
 * Ekran YALNIZCA KENDİ verisini gösterir; sorgular oturumdaki kişiye
 * sabitlenmiştir. Başkasının envanter sonucuna bakmanın bir yolu yoktur —
 * danışmanın, koordinatörün ve proje yöneticisinin de yoktur.
 *
 * İÇERİĞİ HAZIR OLMAYAN ENVANTERLER GİZLENMİYOR, "bekleniyor" diye
 * gösteriliyor. Gizlenselerdi öğrenci istekte sayılan yedi envanterin üçünü
 * görür ve kalanların unutulduğunu sanırdı; burada neyin neden beklediği
 * yazıyor.
 */
export default async function AlgoritmamSayfasi() {
  const kullanici = await oturumKullanicisiZorunlu();

  const uygulamalar = await prisma.envanterUygulamasi.findMany({
    where: { kullaniciId: kullanici.id },
    select: {
      id: true,
      envanterKodu: true,
      durum: true,
      surum: true,
      tamamlanmaTarihi: true,
      _count: { select: { cevaplar: true } },
    },
    orderBy: { baslamaTarihi: "desc" },
  });

  /*
   * ÜÇ LİSTE (20 Ağustos 2026): açık olanlar, GEÇİCİ KAPALI olanlar ve
   * içeriği hiç gelmemiş olanlar. Kapalılar "içeriği beklenenler"e
   * karıştırılmadı — o kutu "maddeleri yok" diyor, oysa bunların maddeleri
   * yazılmış durumda ve kapanma gerekçeleri başka.
   */
  const acikOlanlar = ENVANTERLER.filter(envanterAcikMi);
  const kapalilar = ENVANTERLER.filter(
    (tanim) => envanterHazirMi(tanim) && tanim.kapali,
  );
  const bekleyenler = ENVANTERLER.filter((tanim) => !envanterHazirMi(tanim));

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Öz değerlendirme"
        aciklama="Güçlü yönlerini, çalışma biçimini ve teknolojideki eğilimlerini keşfet."
      />

      {/*
        AÇIKLAMA KUTUSU KALKTI (20 Ağustos 2026 · istek: "Algoritmamdaki bu
        yazı kalkacak").

        Metnin kendisi SİLİNMEDİ, yeri değişti: `SONUC_CERCEVESI` envanterin
        giriş ekranında ("Başlamadan önce") ve sonuç ekranının başında
        basılmaya devam ediyor — okunması gereken an, listeye bakılan an değil
        çözmeye başlanan andır. Gizlilik cümlesi de o iki ekranda duruyor.
      */}

      <div className="grid gap-4 md:grid-cols-2">
        {acikOlanlar.map((tanim) => {
          const suren = uygulamalar.find(
            (u) => u.envanterKodu === tanim.kod && u.durum === "SURUYOR",
          );
          const sonTamamlanan = uygulamalar.find(
            (u) => u.envanterKodu === tanim.kod && u.durum === "TAMAMLANDI",
          );

          return (
            <Kart key={tanim.kod} className="flex flex-col gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-baslik">
                  <Compass size={18} className="text-vurgu-metin" />
                  {tanim.ad}
                </h2>
                <p className="mt-1 text-sm text-metin-yumusak">{tanim.ozet}</p>
              </div>

              <p className="text-sm text-metin-yumusak">
                {tanim.maddeler.length} madde · {tanim.boyutlar.length} başlık
              </p>

              {suren ? (
                <p className="flex items-center gap-1.5 text-sm text-vurgu-metin">
                  <CircleDashed size={15} aria-hidden />
                  {/*
                    Sayım cevap SATIRLARINDAN geliyor, `ilerleme()`den değil:
                    o fonksiyon hangi maddelerin cevaplandığını ister ve liste
                    ekranı bunun için her uygulamanın cevaplarını çekerdi.
                    Tanımda olmayan bir madde kodu cevaplarda duramaz (eylem
                    reddediyor), bu yüzden iki sayı ayrışamaz.
                  */}
                  Yarım kaldı — {tanim.maddeler.length} maddenin{" "}
                  {suren._count.cevaplar}&apos;i işaretlendi
                </p>
              ) : sonTamamlanan ? (
                <p className="flex items-center gap-1.5 text-sm text-olumlu-metin">
                  <CircleCheck size={15} aria-hidden />
                  {sonTamamlanan.tamamlanmaTarihi
                    ? `${tarihYaz(sonTamamlanan.tamamlanmaTarihi)} tarihinde çözdün`
                    : "Çözüldü"}
                </p>
              ) : (
                <p className="text-sm text-metin-yumusak">Henüz çözmedin.</p>
              )}

              <Link
                href={`/panel/algoritmam/${tanim.kod}`}
                className="mt-auto inline-flex w-fit items-center gap-2 rounded-md bg-birincil px-4 py-2 text-sm font-semibold text-birincil-metin transition hover:bg-birincil-koyu"
              >
                {suren ? "Devam et" : sonTamamlanan ? "Sonucumu gör" : "Başla"}
              </Link>
            </Kart>
          );
        })}
      </div>

      {/*
        GEÇİCİ KAPALI ENVANTERLER (20 Ağustos 2026 · istek: "ilgi beceri ve
        mesleki envanterlerin başla butonları şu an devrede değil pasife
        getirelim").

        KART BASILIYOR, GİZLENMİYOR: envanterler daha önce listede açıktı ve
        öğrenci bunları görmüştü. Sessizce kaldırmak "vardı, kayboldu" hissi
        verirdi; kart duruyor, düğmesi pasif ve gerekçesi üstünde yazıyor.

        DÜĞME `<button disabled>` — bağlantı DEĞİL. Pasif görünen ama tıklanan
        bir bağlantı, öğrenciyi envanterin kendi ekranına götürüp orada ikinci
        kez reddederdi (o ekran da kapalıyı kabul etmiyor).
      */}
      {kapalilar.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {kapalilar.map((tanim) => (
            <Kart key={tanim.kod} className="flex flex-col gap-3 opacity-75">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-baslik">
                  <Lock size={18} className="text-metin-yumusak" />
                  {tanim.ad}
                </h2>
                <p className="mt-1 text-sm text-metin-yumusak">{tanim.ozet}</p>
              </div>
              <p className="text-sm text-metin-yumusak">{tanim.kapali}</p>
              <button
                type="button"
                disabled
                className="mt-auto inline-flex w-fit cursor-not-allowed items-center gap-2 rounded-md border border-cizgi px-4 py-2 text-sm font-semibold text-metin-yumusak"
              >
                Şu an kapalı
              </button>
            </Kart>
          ))}
        </div>
      )}

      {bekleyenler.length > 0 && (
        <Kart>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-baslik">
            <Lock size={18} className="text-metin-yumusak" />
            İçeriği beklenen envanterler
          </h2>
          <p className="mt-1 text-sm text-metin-yumusak">
            Bunlar yayımlanmış, geçerlik ve güvenirlik çalışması yapılmış
            ölçekler. Madde metinleri ve puanlama anahtarları hak sahibinden
            gelmeden yayına alınmıyor — bir ölçeğin adını taşıyıp maddelerini
            uydurmak, sana o ölçeğin sonucu diye başka bir şey göstermek olurdu.
          </p>
          <ul className="mt-4 space-y-3">
            {bekleyenler.map((tanim) => (
              <li
                key={tanim.kod}
                className="rounded-lg border border-cizgi px-4 py-3"
              >
                <p className="font-medium text-metin">{tanim.ad}</p>
                <p className="mt-0.5 text-sm text-metin-yumusak">{tanim.ozet}</p>
              </li>
            ))}
          </ul>
        </Kart>
      )}
    </div>
  );
}
