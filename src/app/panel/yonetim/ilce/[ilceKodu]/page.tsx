import { School } from "lucide-react";
import Link from "next/link";
import { Kart, KartBasligi, SayfaBasligi } from "@/components/ui";
import {
  BirimKarti,
  ToplamSeridi,
  YolIzi,
} from "@/components/YonetimKartlari";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { okulOzetleriniGetir } from "@/lib/rapor/yonetim-ozeti";
import { birimUyarilari, ozetToplami } from "@/lib/rapor/yonetim-kurallari";
import {
  ogrenciEnvanteriGorebilirMi,
  ogretmenEnvanteriGorebilirMi,
  yonetimPanosuGorebilirMi,
  yonetimPanosuIlErisimi,
} from "@/lib/yetki/izinler";

export const dynamic = "force-dynamic";

/**
 * Bir ilçenin okulları — panonun son basamağı ve "Okullar" ekranının kendisi.
 *
 * Okulun altında bir basamak yok, bu yüzden kart bir yere GİTMEZ; onun yerine
 * iki liste bağlantısı taşır (okuldaki öğrenciler / öğretmenler). Bağlantılar
 * envanter ekranlarının okul süzgecini kullanıyor, yani listedeki küme kartta
 * yazan sayıyla aynı ölçütten geliyor.
 *
 * Yetki, ilçenin BAĞLI OLDUĞU İL üzerinden sorulur: koordinatör yalnızca kendi
 * ilinin ilçelerini açabilir.
 */
export default async function IlceKirilimiSayfasi({
  params,
}: {
  params: Promise<{ ilceKodu: string }>;
}) {
  const { ilceKodu } = await params;
  const kullanici = await oturumKullanicisiZorunlu();

  const ilce = yonetimPanosuGorebilirMi(kullanici)
    ? await prisma.ilce.findUnique({
        where: { ilceKodu },
        select: { ad: true, ilKodu: true, il: { select: { ad: true } } },
      })
    : null;

  if (!ilce || !yonetimPanosuIlErisimi(kullanici, ilce.ilKodu)) {
    return (
      <Kart>
        <KartBasligi baslik="İlçe" aciklama="Kayıt bulunamadı." />
      </Kart>
    );
  }

  const okullar = await okulOzetleriniGetir({ ilceKodu });
  const toplam = ozetToplami(okullar);

  const ogrenciListesi = ogrenciEnvanteriGorebilirMi(kullanici);
  const ogretmenListesi = ogretmenEnvanteriGorebilirMi(kullanici);

  return (
    <div className="space-y-6">
      <YolIzi
        adimlar={[
          { etiket: "Yönetim Paneli", yol: "/panel/yonetim" },
          { etiket: ilce.il.ad, yol: `/panel/yonetim/il/${ilce.ilKodu}` },
          { etiket: ilce.ad },
        ]}
      />

      <SayfaBasligi
        baslik={`${ilce.ad} · Okullar`}
        aciklama="İlçedeki okullar ve her okuldaki öğretmen, danışman öğretmen ile öğrenci sayısı."
      />

      {/*
        DÜZ LİSTEYE GEÇİŞ (15 Ağustos 2026 · Aşama 4). Bu ekran kart kart
        gezdiriyor; aranabilir ve dışa aktarılabilir hâli Okullar ekranında ve
        AYNI sorgudan besleniyor. Bağlantı ilçeyi taşıyor, yani kullanıcı
        bulunduğu yerden çıkmıyor.
      */}
      <p className="text-sm">
        <Link
          href={`/panel/okullar?ilce=${ilceKodu}`}
          className="font-medium text-vurgu-metin underline underline-offset-2"
        >
          Bu ilçeyi aranabilir listede aç
        </Link>
      </p>

      <Kart>
        <KartBasligi
          baslik="Okullar"
          aciklama="Danışman öğretmen, GençTek danışmanlık görevini işaretlemiş öğretmendir; bir okulda birden fazla olabilir."
          Ikon={School}
        />

        <div className="mb-5 rounded-kart border border-cizgi bg-zemin px-5 py-4">
          {/*
            İlçe ölçümü BURADA BASILMAZ: ekran zaten tek bir ilçenin içi, "toplam
            ilçe 1" hiçbir şey söylemezdi. Danışmansız okul ise burada en
            somut hâline iniyor — danışman öğretmen satırı sıfır olan kartlar.
          */}
          <ToplamSeridi
            okul={toplam.okul}
            ogretmen={toplam.ogretmen}
            danismanOgretmen={toplam.danismanOgretmen}
            ogrenci={toplam.ogrenci}
            danismansizOkul={toplam.danismansizOkul}
            danismansizOgrenci={toplam.danismansizOgrenci}
          />
        </div>

        {okullar.length === 0 ? (
          <p className="text-sm text-metin-yumusak">
            Bu ilçede aktif okul kaydı bulunamadı.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {okullar.map((okul) => (
              <BirimKarti
                key={okul.kurumKodu}
                Ikon={School}
                ad={okul.ad}
                altBilgi={okul.okulTuru}
                ogretmenSayisi={okul.ogretmenSayisi}
                danismanOgretmenSayisi={okul.danismanOgretmenSayisi}
                ogrenciSayisi={okul.ogrenciSayisi}
                /*
                 * Okul kartında "danışmansız okul" uyarısı YOK: danışman öğretmen
                 * satırındaki sıfır zaten onu söylüyor, ikisi birden yazılsaydı
                 * aynı şey kartta iki kez okunurdu (bkz. birimUyarilari).
                 */
                uyarilar={birimUyarilari({
                  danismansizOgrenciSayisi: okul.danismansizOgrenciSayisi,
                })}
                baglantilar={[
                  ...(ogrenciListesi
                    ? [
                        {
                          etiket: "Öğrenciler",
                          yol: `/panel/ogrenciler?okul=${okul.kurumKodu}`,
                        },
                      ]
                    : []),
                  ...(ogretmenListesi
                    ? [
                        {
                          etiket: "Öğretmenler",
                          yol: `/panel/ogretmenler?okul=${okul.kurumKodu}`,
                        },
                      ]
                    : []),
                ]}
              />
            ))}
          </div>
        )}
      </Kart>

      <p className="text-sm text-metin-yumusak">
        İlçenin tamamı:{" "}
        <Link
          href={`/panel/ogrenciler?ilce=${ilceKodu}`}
          className="font-medium text-vurgu-metin underline underline-offset-2"
        >
          öğrenciler
        </Link>{" "}
        ·{" "}
        <Link
          href={`/panel/ogretmenler?ilce=${ilceKodu}`}
          className="font-medium text-vurgu-metin underline underline-offset-2"
        >
          öğretmenler
        </Link>
      </p>
    </div>
  );
}
