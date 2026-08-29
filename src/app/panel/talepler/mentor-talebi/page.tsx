import { GraduationCap } from "lucide-react";
import { notFound } from "next/navigation";
import {
  BilgiKutusu,
  KirintiYolu,
  SayfaBasligi,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { TALEP_AZAMI_GUN } from "@/lib/iletisim/kurallar";
import { mentorHavuzunuGetir } from "@/lib/mentor/veri";
import {
  panodaIlanAcabilirMi,
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

  return (
    <div className="space-y-6">
      {/*
        KIRINTI YOLU (29 Ağustos 2026 · istek: "pano da da aynı sorun var").

        Panodan açılan ekranlarda üstte ya "← Profil" (SayfaBasligi'nın
        varsayılanı) ya da elle yazılmış "Panoya dön" bağlantısı duruyordu:
        ikisi de nereye dönüleceğini söylüyor, nerede olunduğunu söylemiyordu.
        Şerit ikisini birden basıyor ve panelin her yerinde aynı biçimde
        (bkz. components/ui.tsx · KirintiYolu). SayfaBasligi'nın geri
        bağlantısı bu yüzden `null`.
      */}
      <KirintiYolu
        basamaklar={[
          { etiket: "Pano", yol: "/panel/talepler" },
          { etiket: "Mentör talebi aç" },
        ]}
      />

      <SayfaBasligi
        baslik="Mentör talebi aç"
        /*
          AÇIKLAMA SATIRI KALKTI (22 Ağustos 2026 · istek). Başlık ne
          yapıldığını zaten söylüyordu; cümlenin taşıdığı tek ek bilgi
          talebi kimin göreceğiydi ve o da formun kendi metninde duruyor.
        */
        geri={null}
      />

      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}
      {/*
        GİZLİLİK UYARISI BU EKRANDAN KALKTI (22 Ağustos 2026 · istek). Uyarı,
        yazışmanın KENDİ ekranlarında duruyor (yazışma detayı ve mentörlüğüm) —
        mesajın yazıldığı yer orası. İlan açma formunda, henüz kimseyle
        yazışılmadan gösteriliyordu. KURAL DEĞİŞMEDİ: yazışmalar gizli değil ve
        yetkililer okuyabiliyor (bkz. lib/iletisim/kurallar.ts · GIZLILIK_UYARISI).
      */}
      {/*
        "ONAYA DÜŞER" BİLGİ KUTUSU KALKTI (22 Ağustos 2026 · istek). AKIŞ
        DEĞİŞMEDİ: ilan proje yöneticisinin onayından geçmeye, onaylanana kadar
        panoda görünmemeye ve karar bildirimi gitmeye devam ediyor
        (bkz. talepAcEylemi). Kalkan yalnızca önceden yapılan duyuru.
      */}

      {/*
        AÇIKLAMA SATIRI KALKTI (22 Ağustos 2026 · istek). Aynı cümle formun
        metin kutusunda YER TUTUCU olarak da duruyordu; başlığın altında ikinci
        kez yazması bir şey eklemiyordu. Yer tutucu KALDI — orada kişi yazmaya
        başlarken görüyor.
      */}
      <FormKarti baslik="Yeni mentör talebi" Ikon={GraduationCap}>
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
