import { Megaphone } from "lucide-react";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  KirintiYolu,
  SayfaBasligi,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import {
  DUYURU_HEDEF_ETIKETLERI,
  DUYURU_HEDEFLERI,
} from "@/lib/bildirim/toplu";
import { prisma } from "@/lib/db";
import { ortam } from "@/lib/ortam";
import { tarihSaatYaz } from "@/lib/tarih";
import { sistemAyarlariniYonetebilirMi } from "@/lib/yetki/izinler";
import { DuyuruFormu } from "@/components/DuyuruFormu";
import { duyuruGonderEylemi } from "./eylemler";

export const dynamic = "force-dynamic";

/**
 * Toplu duyuru — analiz isteği Bölüm 5.
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

  if (!sistemAyarlariniYonetebilirMi(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="Duyurular"
          aciklama="Bu ekran yalnızca proje yöneticisine açıktır."
        />
      </Kart>
    );
  }

  const [ogrenciSayisi, ogretmenSayisi, sonDuyurular] = await Promise.all([
    prisma.kullanici.count({
      where: {
        aktif: true,
        roller: { some: { rolKodu: "OGRENCI", bitisTarihi: null } },
      },
    }),
    prisma.kullanici.count({
      where: {
        aktif: true,
        // Sayı, eylemdeki alıcı koşuluyla AYNI kümeyi saymalı; ayrışırsa ekran
        // gönderilenden farklı bir rakam gösterir (bkz. duyurular/eylemler.ts).
        roller: {
          none: {
            rolKodu: { in: ["OGRENCI", "MEZUN", "PAYDAS_TEMSILCISI"] },
            bitisTarihi: null,
          },
        },
      },
    }),
    // Aynı duyuru herkese aynı başlıkla gittiği için gruplanarak listeleniyor.
    prisma.bildirim.groupBy({
      by: ["baslik"],
      where: { tip: "TOPLU_DUYURU" },
      _count: { _all: true },
      _max: { olusturmaTarihi: true },
      orderBy: { _max: { olusturmaTarihi: "desc" } },
      take: 10,
    }),
  ]);

  const sayilar = { ogrenci: ogrenciSayisi, ogretmen: ogretmenSayisi };

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
          { etiket: "Duyurular" },
        ]}
      />

      <SayfaBasligi
        geri={null}
        baslik="Duyurular"
        aciklama="Tüm öğrenci ve öğretmenlere panel bildirimi gönderin."
      />

      {durum === "gonderildi" && (
        <BilgiKutusu cesit="olumlu">
          Duyuru {sayi ?? "—"} kişiye gönderildi.
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
        <strong>Duyuru geri alınamaz.</strong> Gönderdikten sonra bildirimleri
        silmenin bir yolu yoktur; e-posta kopyası gitmişse o da geri çağrılamaz.
        Göndermeden önce metni okuyun.
      </BilgiKutusu>

      <Kart>
        <KartBasligi
          baslik="Yeni duyuru"
          aciklama={
            ortam.EPOSTA_SAGLAYICI === "kapali"
              ? "E-posta kanalı kapalı; duyuru yalnızca panele düşer."
              : ortam.EPOSTA_SAGLAYICI === "gunluk"
                ? "E-posta sağlayıcısı GÜNLÜK kipinde: ileti gönderilmez, sunucu günlüğüne yazılır. Duyuru panele düşer."
                : "Duyuru panele düşer; e-posta adresi kayıtlı olanlara kopyası da gider."
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
          hedefSecenekleri={DUYURU_HEDEFLERI.map((hedef) => ({
            deger: hedef,
            etiket: `${DUYURU_HEDEF_ETIKETLERI[hedef]} (${
              hedef === "OGRENCI"
                ? sayilar.ogrenci
                : hedef === "OGRETMEN"
                  ? sayilar.ogretmen
                  : sayilar.ogrenci + sayilar.ogretmen
            } kişi)`,
          }))}
        />
      </Kart>

      {sonDuyurular.length > 0 && (
        <Kart>
          <KartBasligi
            baslik="Son duyurular"
            aciklama="Gönderilmiş duyurular; kayıt amaçlıdır, silinemez."
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
