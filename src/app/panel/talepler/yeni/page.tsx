import { ArrowLeft, LifeBuoy } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BilgiKutusu, SayfaBasligi } from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import {
  GIZLILIK_UYARISI,
  PANO_KATEGORILERI,
  TALEP_AZAMI_GUN,
} from "@/lib/iletisim/kurallar";
import {
  panodaIlanAcabilirMi,
  panoIlaniOnayGerekiyorMu,
} from "@/lib/yetki/izinler";
import { FormKarti, TalepFormu } from "../formlar";

export const dynamic = "force-dynamic";

/**
 * DESTEK / DUYURU TALEBİ AÇMA EKRANI (14 Ağustos 2026).
 *
 * İstek: "panoda kart olsun … en üstte kart olsun o sayfaya gitsin, yani
 * panoda sadece kartlar altında da duyurular olsun". Form panodan buraya
 * taşındı; panoda yerine kart var.
 *
 * KATEGORİ SEÇİMİ BURADA (aynı gün · istek: "talep oluştururken kategori
 * olsun"): teknik destek talebi, duyuru / tanıtım desteği, ekip arkadaşı arama,
 * genel. Panodaki arama kutusu da aynı dörtlüyle süzüyor.
 *
 * Yetkisi olmayan 404 görür — ekranın varlığı sızmasın.
 */
export default async function YeniTalepSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!panodaIlanAcabilirMi(kullanici)) notFound();

  const { hata } = await searchParams;
  const onayaDuser = panoIlaniOnayGerekiyorMu(kullanici);

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Destek / duyuru talebi aç"
        aciklama="Takıldığınız bir konuda yardım isteyin, duyurunuzu paylaşın ya da ekip arkadaşı arayın."
        /*
          Kendi geri bağlantısı yukarıda: bu ekranın üstü Panel değil,
          geldiği liste. `SayfaBasligi`nin varsayılan "Panel" bağlantısı
          basılsaydı üst üste iki geri bağlantısı olurdu.
        */
        geri={null}
      />

      <Link
        href="/panel/talepler"
        className="inline-flex items-center gap-1 text-sm font-medium text-vurgu-metin"
      >
        <ArrowLeft size={14} aria-hidden />
        Panoya dön
      </Link>

      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}
      <BilgiKutusu cesit="uyari">{GIZLILIK_UYARISI}</BilgiKutusu>
      {/*
        ONAY KURALI İLAN YAZILMADAN ÖNCE YAZILI: "gönderdim ama panoda yok"
        sorusunun sorulmasını bekleyip cevabı sonuç iletisine saklamak, aynı
        bilgiyi en geç anda vermek olurdu.
      */}
      {onayaDuser && (
        <BilgiKutusu cesit="bilgi">
          Açtığınız ilan proje yöneticisinin onayından geçer; onaylanana kadar
          panoda görünmez. Karar verildiğinde size bildirim gelir.
        </BilgiKutusu>
      )}

      <FormKarti
        baslik="Yeni ilan"
        aciklama="Kategoriyi seçin, ne aradığınızı yazın."
        Ikon={LifeBuoy}
      >
        <TalepFormu
          tur="TEKNIK_DESTEK"
          kategoriler={PANO_KATEGORILERI}
          yerTutucu="Hangi konuda desteğe ihtiyacınız olduğunu ya da neyi duyurmak istediğinizi yazın."
          dugmeMetni="İlanı aç"
          simdi={new Date()}
          azamiGun={TALEP_AZAMI_GUN}
        />
      </FormKarti>
    </div>
  );
}
