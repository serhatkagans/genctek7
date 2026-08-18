import { CalismaGrubuSecimi } from "@/components/CalismaGrubuSecimi";
import { BilgiKutusu, Kart, KartBasligi, SayfaBasligi } from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { calismaGruplariniGetir } from "@/lib/ogrenci/calisma-grubu";
import { ogrenciMi } from "@/lib/yetki/izinler";
import { calismaGrubuKaydetEylemi } from "./eylemler";

export const dynamic = "force-dynamic";

/**
 * Çalışma grubu seçimi.
 *
 * SEKME MENÜDEN KALKTI (5 Ağustos 2026): seçim artık Panelim sayfasının
 * içinden yapılıyor. Sayfa SİLİNMEDİ — adres bildirim e-postalarında ve yer
 * imlerinde duruyor, buraya gelen kişiye 404 göstermek yapabileceği bir işi
 * kaybettirmek olurdu. Form ve kurallar iki yerde de aynı bileşenden geliyor.
 */
export default async function CalismaGruplariSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string; durum?: string }>;
}) {
  const { hata, durum } = await searchParams;
  const kullanici = await oturumKullanicisiZorunlu();

  if (!ogrenciMi(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="Çalışma grupları"
          aciklama="Grup seçimi öğrencilere özeldir."
        />
      </Kart>
    );
  }

  const { gruplar, seciliIdler } = await calismaGruplariniGetir(kullanici.id);

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Çalışma gruplarım"
        /*
          "İstediğiniz kadar seçebilirsiniz; sayı sınırı yoktur" NOTU
          KALDIRILDI (7 Ağustos 2026 · istek). Panelim'deki aynı not da
          kaldırıldı — iki yüzey aynı metni taşıyordu.
        */
        aciklama="İlgi alanınıza göre grup seçebilirsiniz."
      />

      {durum === "kaydedildi" && (
        <BilgiKutusu cesit="olumlu">Seçiminiz kaydedildi.</BilgiKutusu>
      )}
      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}

      <div className="rounded-kart border border-cizgi bg-kart p-6 shadow-kart">
        <CalismaGrubuSecimi
          gruplar={gruplar}
          seciliIdler={seciliIdler}
          kaydetEylemi={calismaGrubuKaydetEylemi}
          donusYolu="/panel/calisma-gruplari"
        />
      </div>
    </div>
  );
}
