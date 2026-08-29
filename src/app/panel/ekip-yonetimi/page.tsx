import { EkipEnvanteri } from "@/components/EkipEnvanteri";
import {
  Kart,
  KartBasligi,
  KirintiYolu,
  SayfaBasligi,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { ekipYonetebilirMi } from "@/lib/ekip/kurallar";
import { projeYoneticisiMi } from "@/lib/yetki/izinler";
import type { SorguParametreleri } from "../ogrenciler/filtreler";

export const dynamic = "force-dynamic";

const YOL = "/panel/ekip-yonetimi";

/**
 * MERKEZİ EKİP LİSTESİ (15 Ağustos 2026).
 *
 * Manisa farkları turu. Manisa panelindeki "Ekip Yönetimi"
 * ekranının karşılığı: 144 ekip tek listede, tür rozeti, danışman, üye sayısı.
 *
 * ============================================================================
 * `panel/ekipler` EKRANIYLA AYRI TUTULDU
 * ============================================================================
 * O ekran "benim ekiplerim": koordinatörün kurduğu ve üyesi olduğu ekipleri
 * tek yerde gösteriyor ve dosya başındaki notu bunu açıkça söylüyor. Yönetici
 * listesini oraya karıştırmak, koordinatörün kendi ekibini yüzlerce kaydın
 * içinde aramasına yol açardı.
 *
 * Bu ekran ise envanter: aramalı, süzgeçli, sayfalı ve dışa aktarılabilir.
 *
 * KAPI `ekipYonetebilirMi` (il koordinatörü + merkez) — ekip kurma yetkisiyle
 * aynı kapı. Ekip listesini görmek, ekip yönetmenin parçası.
 */
export default async function EkipYonetimiSayfasi({
  searchParams,
}: {
  searchParams: Promise<SorguParametreleri>;
}) {
  const parametreler = await searchParams;
  const kullanici = await oturumKullanicisiZorunlu();

  if (!ekipYonetebilirMi(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="Ekip Yönetimi"
          aciklama="Bu ekran il koordinatörlerine ve merkeze açıktır."
        />
      </Kart>
    );
  }

  /*
   * Başlığın açıklaması kapsamı söylüyor; liste bileşeni kendi `merkezMi`
   * hesabını kendisi yapıyor (ikisi de aynı yetki fonksiyonundan).
   */
  const merkezMi = projeYoneticisiMi(kullanici);

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
          { etiket: "Ekip Yönetimi" },
        ]}
      />

      <SayfaBasligi
        geri={null}
        baslik="Ekip Yönetimi"
        aciklama={
          merkezMi
            ? "Ülke genelindeki tüm ekipler"
            : "İlinizdeki tüm ekipler"
        }
      />

      {/*
        LİSTE KENDİ BİLEŞENİNDE (26 Ağustos 2026 · istek: "ekip yönetimindeki
        liste ekiplerime gelecek"). Aynı envanter Ekiplerim ekranında da
        basılıyor; gerekçesi ve `yol` parametresinin işi
        components/EkipEnvanteri.tsx başlığında.

        BU EKRAN SİLİNMEDİ: adresi CSV rotasının kökü
        (/panel/ekip-yonetimi/disa-aktar) ve süzgeçli derin bağlantılar buraya
        işaret ediyor. Panodaki kartı kalktı, kendisi durdu.
      */}
      <EkipEnvanteri
        kullanici={kullanici}
        parametreler={parametreler}
        yol={YOL}
      />
    </div>
  );
}
