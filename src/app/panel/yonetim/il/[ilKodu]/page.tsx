import { Map as Harita, MapPin } from "lucide-react";
import Link from "next/link";
import { Kart, KartBasligi, SayfaBasligi } from "@/components/ui";
import {
  BirimKarti,
  ToplamSeridi,
  YolIzi,
} from "@/components/YonetimKartlari";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { ilceOzetleriniGetir } from "@/lib/rapor/yonetim-ozeti";
import { birimUyarilari, ozetToplami } from "@/lib/rapor/yonetim-kurallari";
import {
  yonetimPanosuGorebilirMi,
  yonetimPanosuIlErisimi,
} from "@/lib/yetki/izinler";

export const dynamic = "force-dynamic";

/**
 * Bir ilin ilçe kırılımı — panonun ikinci basamağı.
 *
 * KAPI İKİ KEZ SORULUR: önce "pano açılır mı", sonra "BU il açılır mı". İkincisi
 * olmasaydı bir il koordinatörü adres çubuğuna başka il kodu yazarak o ilin
 * sayımlarını görebilirdi. Kapsamı dışındaki il, 403 değil BULUNAMADI olarak
 * karşılanıyor: ilin panoda kaydı olup olmadığı da sızmasın
 * (bkz. references/permissions.md Bölüm 4).
 */
export default async function IlKirilimiSayfasi({
  params,
}: {
  params: Promise<{ ilKodu: string }>;
}) {
  const { ilKodu } = await params;
  const kullanici = await oturumKullanicisiZorunlu();

  if (
    !yonetimPanosuGorebilirMi(kullanici) ||
    !yonetimPanosuIlErisimi(kullanici, ilKodu)
  ) {
    return (
      <Kart>
        <KartBasligi baslik="İl" aciklama="Kayıt bulunamadı." />
      </Kart>
    );
  }

  const il = await prisma.il.findUnique({
    where: { ilKodu },
    select: { ad: true },
  });

  if (!il) {
    return (
      <Kart>
        <KartBasligi baslik="İl" aciklama="Kayıt bulunamadı." />
      </Kart>
    );
  }

  const ilceler = await ilceOzetleriniGetir(ilKodu);
  const toplam = ozetToplami(ilceler);

  return (
    <div className="space-y-6">
      <YolIzi
        adimlar={[
          { etiket: "Yönetim Paneli", yol: "/panel/yonetim" },
          { etiket: il.ad },
        ]}
      />

      <SayfaBasligi
        baslik={il.ad}
        aciklama="İldeki ilçeler. Bir ilçeye tıklayarak okullarını görebilirsiniz."
      />

      <Kart>
        <KartBasligi
          baslik="İlçeler"
          aciklama="Her kartta ilçedeki okul, öğretmen, danışman öğretmen ve öğrenci sayısı"
          Ikon={MapPin}
        />

        <div className="mb-5 rounded-kart border border-cizgi bg-zemin px-5 py-4">
          <ToplamSeridi
            ilce={toplam.ilce}
            okul={toplam.okul}
            ogretmen={toplam.ogretmen}
            danismanOgretmen={toplam.danismanOgretmen}
            ogrenci={toplam.ogrenci}
            danismansizOkul={toplam.danismansizOkul}
            danismansizOgrenci={toplam.danismansizOgrenci}
          />
        </div>

        {ilceler.length === 0 ? (
          <p className="text-sm text-metin-yumusak">
            Bu ile bağlı ilçe kaydı bulunamadı.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ilceler.map((ilce) => (
              <BirimKarti
                key={ilce.ilceKodu}
                Ikon={Harita}
                ad={ilce.ad}
                uyarilar={birimUyarilari(ilce)}
                okulSayisi={ilce.okulSayisi}
                ogretmenSayisi={ilce.ogretmenSayisi}
                danismanOgretmenSayisi={ilce.danismanOgretmenSayisi}
                ogrenciSayisi={ilce.ogrenciSayisi}
                yol={`/panel/yonetim/ilce/${ilce.ilceKodu}`}
              />
            ))}
          </div>
        )}
      </Kart>

      <p className="text-sm text-metin-yumusak">
        İlin tamamı:{" "}
        <Link
          href={`/panel/ogrenciler?il=${ilKodu}`}
          className="font-medium text-vurgu-metin underline underline-offset-2"
        >
          öğrenciler
        </Link>{" "}
        ·{" "}
        <Link
          href={`/panel/ogretmenler?il=${ilKodu}`}
          className="font-medium text-vurgu-metin underline underline-offset-2"
        >
          öğretmenler
        </Link>
      </p>
    </div>
  );
}
