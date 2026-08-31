import { Megaphone } from "lucide-react";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  KirintiYolu,
  SayfaBasligi,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { topluHedefSecenekleri } from "@/lib/bildirim/toplu-alicilar";
import { prisma } from "@/lib/db";
import { ortam } from "@/lib/ortam";
import { tarihSaatYaz } from "@/lib/tarih";
import {
  projeYoneticisiMi,
  topluMesajGonderebilirMi,
} from "@/lib/yetki/izinler";
import { DuyuruFormu } from "@/components/DuyuruFormu";
import { duyuruGonderEylemi } from "./eylemler";

export const dynamic = "force-dynamic";

/**
 * TOPLU MESAJ — analiz isteği Bölüm 5, 31 Ağustos 2026'da genişletildi.
 *
 * EKRAN ARTIK İKİ KİTLEYE AÇIK (istekler: "il koordinatörü yönetim panelinde
 * toplu mesaj kartı ekle, ilindeki tüm öğrenciler, tüm öğretmenler, ilçe
 * temsilcisi, il temsilcisi, eklediği ekiplere ayrı ayrı her ekip için ayrı
 * toplu mesaj" · "proje yöneticisi de sadece öğrenci ve öğretmenlere değil
 * ekiplere topluluklara ayrı ayrı toplu mesaj atabilsin"):
 *   · proje yöneticisi — ülke geneli kitleler, her ekip ve her topluluk,
 *   · il koordinatörü — kendi ilinin kitleleri ve kendi ilinin ekipleri.
 *
 * AYRI BİR EKRAN AÇILMADI: form, doğrulama, onay kutusu ve "geri alınamaz"
 * uyarısı ikisinde de aynı. İkiye bölünseydi biri diğerinin doğrulamasını
 * zamanla kaybederdi. Ayrışan tek şey ALICI LİSTESİ ve o da kapsamdan
 * üretiliyor (bkz. lib/bildirim/toplu-alicilar.ts).
 *
 * Ekranın tasarımı "yanlışlıkla gönderme"yi zorlaştırmak üzerine kurulu:
 * alıcı sayısı seçenekle birlikte yazılı, onay kutusu zorunlu ve geri
 * alınamazlık açıkça söyleniyor. "Emin misiniz?" sormak yerine SAYIYI
 * göstermek daha dürüst — kullanıcı 12 kişiye mi 4000 kişiye mi gönderdiğini
 * bilerek karar verir.
 */

export default async function DuyurularSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; hata?: string; sayi?: string }>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  const { durum, hata, sayi } = await searchParams;

  if (!topluMesajGonderebilirMi(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="Toplu Mesaj"
          aciklama="Bu ekran proje yöneticisi ve il koordinatörüne açıktır."
        />
      </Kart>
    );
  }

  const merkezMi = projeYoneticisiMi(kullanici);

  const [hedefSecenekleri, sonDuyurular] = await Promise.all([
    /*
     * ALICI SAYILARI ARTIK SEÇENEKLE BİRLİKTE GELİYOR: eskiden burada iki
     * `count` vardı (öğrenci, öğretmen) ve etiketler onlardan kuruluyordu.
     * Hedef listesi kayıtlardan türeyince (her ekip ayrı bir seçenek) sayım
     * da listeyle aynı yerden çıkmak zorunda kaldı — ekrandaki sayı ile
     * gerçek alıcı kümesinin ayrışmaması için (bkz. toplu-alicilar.ts).
     */
    topluHedefSecenekleri(kullanici),
    /*
     * "SON DUYURULAR" YALNIZCA MERKEZDE (31 Ağustos 2026): liste
     * `bildirim` tablosunu başlığa göre gruplayarak kuruluyor ve bildirim
     * satırında GÖNDEREN YAZMIYOR — kimin gönderdiği sorulamıyor. Koordinatöre
     * basılsaydı merkezin ve öbür illerin duyuru başlıkları ona görünürdü.
     * Kendi gönderdiklerinin kaydı erişim kayıtlarında duruyor.
     */
    merkezMi
      ? // Aynı duyuru herkese aynı başlıkla gittiği için gruplanarak listeleniyor.
        prisma.bildirim.groupBy({
          by: ["baslik"],
          where: { tip: "TOPLU_DUYURU" },
          _count: { _all: true },
          _max: { olusturmaTarihi: true },
          orderBy: { _max: { olusturmaTarihi: "desc" } },
          take: 10,
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      {/*
        KIRINTI YOLU (29 Ağustos 2026 · istekler: "navigasyon bunu göstersin
        yönetim paneli / rol envanteri şeklinde" · "yönetim panelindeki tüm
        kartlara uygula").

        Yerinde tek başına "← Yönetim Paneli" bağlantısı vardı: dönülecek
        yeri söylüyor, bulunulan yeri söylemiyordu. Şerit ikisini birden
        basıyor ve panodan açılan HER ekranda aynı biçimde duruyor.

        SON BASAMAK BAĞLANTI DEĞİL (bkz. components/ui.tsx · KirintiYolu);
        SayfaBasligi'nın geri bağlantısı bu yüzden `null` — ikisi bir arada
        aynı yolu üst üste iki kez basardı.
      */}
      <KirintiYolu
        basamaklar={[
          { etiket: "Yönetim Paneli", yol: "/panel/yonetim" },
          { etiket: "Toplu Mesaj" },
        ]}
      />

      <SayfaBasligi
        geri={null}
        baslik="Toplu Mesaj"
        aciklama={
          merkezMi
            ? "Seçtiğiniz kitleye, ekibe ya da topluluğa panel bildirimi gönderin."
            : "İlinizdeki kitlelere ve kurduğunuz ekiplere panel bildirimi gönderin."
        }
      />

      {durum === "gonderildi" && (
        <BilgiKutusu cesit="olumlu">
          Mesaj {sayi ?? "—"} kişiye gönderildi.
        </BilgiKutusu>
      )}
      {/*
        Hata mesajı artık formun İÇİNDE basılıyor (bkz. DuyuruFormu): adres
        çubuğuna yazılmadığı için sayfa düzeyinde gösterilecek bir şey yok.
        Adresteki `hata` parametresi eski bağlantılar için okunmaya devam
        ediyor — birileri o adresi yer imine almış olabilir.
      */}
      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}

      <BilgiKutusu cesit="uyari">
        <strong>Toplu mesaj geri alınamaz.</strong> Gönderdikten sonra bildirimleri
        silmenin bir yolu yoktur; e-posta kopyası gitmişse o da geri çağrılamaz.
        Göndermeden önce metni okuyun.
      </BilgiKutusu>

      <Kart>
        <KartBasligi
          baslik="Yeni toplu mesaj"
          aciklama={
            ortam.EPOSTA_SAGLAYICI === "kapali"
              ? "E-posta kanalı kapalı; mesaj yalnızca panele düşer."
              : ortam.EPOSTA_SAGLAYICI === "gunluk"
                ? "E-posta sağlayıcısı GÜNLÜK kipinde: ileti gönderilmez, sunucu günlüğüne yazılır. Mesaj panele düşer."
                : "Mesaj panele düşer; e-posta adresi kayıtlı olanlara kopyası da gider."
          }
          Ikon={Megaphone}
        />

        {/*
          FORM İSTEMCİ BİLEŞENİ (12 Ağustos 2026): reddedilen gönderimde
          yazılan başlık ve metin kaybolmasın diye. Alıcı sayıları burada
          hesaplanıp etiket olarak geçiyor — sayım sunucu işi, formun kendisi
          yalnızca gösteriyor.
        */}
        <DuyuruFormu
          eylem={duyuruGonderEylemi}
          /*
            SEÇENEKLER SUNUCUDAN, SAYILARIYLA: form istemci bileşeni ve
            veritabanına bakmıyor — hangi kitlenin kaç kişi olduğunu burada
            hesaplanmış hâliyle alıyor. "Emin misiniz?" sormak yerine SAYIYI
            göstermek daha dürüst.
          */
          hedefSecenekleri={hedefSecenekleri.map((secenek) => ({
            deger: secenek.deger,
            etiket: `${secenek.etiket} (${secenek.sayi} kişi)`,
          }))}
        />
      </Kart>

      {sonDuyurular.length > 0 && (
        <Kart>
          <KartBasligi
            baslik="Son duyurular"
            aciklama="Gönderilmiş toplu mesajlar; kayıt amaçlıdır, silinemez."
          />
          <ul className="divide-y divide-cizgi">
            {sonDuyurular.map((duyuru) => (
              <li
                key={duyuru.baslik}
                className="flex flex-wrap items-baseline justify-between gap-2 py-2.5"
              >
                <span className="font-medium text-metin">{duyuru.baslik}</span>
                <span className="text-sm text-metin-yumusak">
                  {duyuru._count._all} kişi ·{" "}
                  {duyuru._max.olusturmaTarihi
                    ? tarihSaatYaz(duyuru._max.olusturmaTarihi)
                    : "—"}
                </span>
              </li>
            ))}
          </ul>
        </Kart>
      )}
    </div>
  );
}
