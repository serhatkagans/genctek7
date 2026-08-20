import { ArrowLeft, GraduationCap } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BilgiKutusu, SayfaBasligi } from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { GIZLILIK_UYARISI, TALEP_AZAMI_GUN } from "@/lib/iletisim/kurallar";
import { mentorHavuzunuGetir } from "@/lib/mentor/veri";
import {
  panodaIlanAcabilirMi,
  panoIlaniOnayGerekiyorMu,
} from "@/lib/yetki/izinler";
import { FormKarti, MentorHavuzu, TalepFormu } from "../formlar";

export const dynamic = "force-dynamic";

/**
 * MENTÖR TALEBİ AÇMA EKRANI (14 Ağustos 2026).
 *
 * Destek/duyuru formundan AYRI ekran ve kategori seçimi YOK: türü ekranın
 * kendisi belirliyor (`MENTORE_SOR`). Mentör talebi bir SORUN çözdürmez, YOL
 * sorar; ikisi tek listede toplansaydı mentör arayan öğrenci teknik soruların
 * arasında kaybolurdu (bkz. lib/iletisim/kurallar.ts · TALEP_TURLERI).
 *
 * MENTÖR HAVUZU FORMUN ALTINDA (11 Ağustos 2026'dan beri): "talebini kime
 * yazıyorsun" sorusunu formun hemen yanında cevaplıyor ama asıl işi — formu —
 * ekranın dışına itmiyor.
 */
export default async function MentorTalebiSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!panodaIlanAcabilirMi(kullanici)) notFound();

  const { hata } = await searchParams;
  const mentorler = await mentorHavuzunuGetir();
  const onayaDuser = panoIlaniOnayGerekiyorMu(kullanici);

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Mentör talebi aç"
        aciklama="Yol gösterecek bir mentöre sorun; talebinizi havuzdaki mentörler görür."
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
      {onayaDuser && (
        <BilgiKutusu cesit="bilgi">
          Açtığınız ilan proje yöneticisinin onayından geçer; onaylanana kadar
          panoda görünmez. Karar verildiğinde size bildirim gelir.
        </BilgiKutusu>
      )}

      <FormKarti
        baslik="Yeni mentör talebi"
        aciklama="Hangi alanda yol göstermesini istediğinizi yazın."
        Ikon={GraduationCap}
      >
        <TalepFormu
          tur="MENTORE_SOR"
          yerTutucu="Hangi alanda yol göstermesini istediğinizi yazın."
          dugmeMetni="Mentör talebi aç"
          simdi={new Date()}
          azamiGun={TALEP_AZAMI_GUN}
        />
        <MentorHavuzu mentorler={mentorler} />
      </FormKarti>
    </div>
  );
}
