import { LifeBuoy } from "lucide-react";
import { notFound } from "next/navigation";
import {
  BilgiKutusu,
  KirintiYolu,
  SayfaBasligi,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import {
  PANO_KATEGORILERI,
  TALEP_AZAMI_GUN,
} from "@/lib/iletisim/kurallar";
import {
  panodaIlanAcabilirMi,
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
          { etiket: "Destek / duyuru talebi aç" },
        ]}
      />

      <SayfaBasligi
        baslik="Destek / duyuru talebi aç"
        aciklama="Takıldığınız bir konuda yardım isteyin, duyurunuzu paylaşın ya da ekip arkadaşı arayın."
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
        ONAY KURALI İLAN YAZILMADAN ÖNCE YAZILI: "gönderdim ama panoda yok"
        sorusunun sorulmasını bekleyip cevabı sonuç iletisine saklamak, aynı
        bilgiyi en geç anda vermek olurdu.
      */}
      {/*
        "ONAYA DÜŞER" BİLGİ KUTUSU KALKTI (22 Ağustos 2026 · istek). AKIŞ
        DEĞİŞMEDİ: ilan proje yöneticisinin onayından geçmeye, onaylanana kadar
        panoda görünmemeye ve karar bildirimi gitmeye devam ediyor
        (bkz. talepAcEylemi). Kalkan yalnızca önceden yapılan duyuru.
      */}

      {/*
        AÇIKLAMA SATIRI KALKTI (22 Ağustos 2026 · istek). "Kategoriyi seçin, ne
        aradığınızı yazın" formun kendisinin söylediğini tekrar ediyordu:
        altındaki iki alan zaten kategori ve metin.
      */}
      <FormKarti baslik="Yeni ilan" Ikon={LifeBuoy}>
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
