import { ArrowLeft, GraduationCap } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MentorlukDuzenleme } from "@/components/ProfilDuzenleme";
import { BilgiKutusu, Kart, KartBasligi, SayfaBasligi } from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { mentorluguGetir } from "@/lib/mentor/veri";
import { mentorlukBasvurabilirMi } from "@/lib/yetki/izinler";
import {
  mentorlukBasvurEylemi,
  mentorluguBirakEylemi,
} from "../../mentorluk/eylemler";

export const dynamic = "force-dynamic";

/**
 * MENTÖR OLMAK İÇİN BAŞVURU EKRANI (14 Ağustos 2026).
 *
 * Bölüm 13 Ağustos'ta Panel'den panoya taşınmıştı; 14 Ağustos'ta pano kart
 * düzenine geçince kendi sayfasına ayrıldı (istek: "panoda kart olsun,
 * kartlarda … bide mentör olmak için başvur"). Yeri hâlâ panonun yanı, çünkü
 * mentörlüğün karşılığı orada: mentör talebi ve havuz aynı iki komşu ekranda.
 *
 * ÇAPA `mentorlugum` KALDI: eylemlerin dönüş adresi, panelden gelen kart ve
 * e-postalardaki bağlantılar bu çapayı taşıyor (bkz. mentorluk/eylemler.ts).
 *
 * ROLÜ OLAN HERKES BAŞVURABİLİR — 14 Ağustos 2026'dan beri ÖĞRENCİ DE
 * (istekler: "öğrenci de mentör olarak başvurabilsin", "ama onay olsun onun
 * için"). Kapı onaydır: başvuru bekleyen olarak açılır, kararı yalnızca proje
 * yöneticisi verir. Gerekçesi `mentorlukBasvurabilirMi` başlığında.
 */

const DURUM_MESAJLARI: Record<string, string> = {
  "mentorluk-basvuruldu": "Mentörlük başvurunuz alındı ve onaya gönderildi.",
  "mentorluk-birakildi": "Mentörlüğü bıraktınız.",
};

export default async function MentorBasvuruSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; hata?: string }>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!mentorlukBasvurabilirMi(kullanici)) notFound();

  const { durum, hata } = await searchParams;

  const [gruplar, mentorlugum, mentorlukGruplarim] = await Promise.all([
    prisma.calismaGrubu.findMany({
      where: { aktif: true },
      orderBy: { siraNo: "asc" },
      select: { id: true, ad: true },
    }),
    mentorluguGetir(kullanici.id),
    prisma.mentorlukCalismaGrubu.findMany({
      where: { mentorlukKullaniciId: kullanici.id },
      select: { calismaGrubuId: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Mentör olmak için başvur"
        aciklama="Bildiğiniz konularda öğrencilere yol gösterin."
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

      {durum && DURUM_MESAJLARI[durum] && (
        <BilgiKutusu cesit="olumlu">{DURUM_MESAJLARI[durum]}</BilgiKutusu>
      )}
      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}

      <Kart>
        <span id="mentorlugum" className="block scroll-mt-24" />
        <KartBasligi
          baslik="Mentörlük başvurusu"
          aciklama="Başvurunuz proje yöneticisinin onayından geçer; onaylanınca panodaki mentör havuzunda görünürsünüz."
          Ikon={GraduationCap}
        />
        <MentorlukDuzenleme
          mevcut={
            mentorlugum
              ? {
                  durum: mentorlugum.durum,
                  konular: mentorlugum.konular,
                  retGerekcesi: mentorlugum.retGerekcesi,
                  seciliGrupIdleri: mentorlukGruplarim.map(
                    (satir) => satir.calismaGrubuId,
                  ),
                }
              : null
          }
          gruplar={gruplar}
          basvurEylemi={mentorlukBasvurEylemi}
          birakEylemi={mentorluguBirakEylemi}
        />
      </Kart>
    </div>
  );
}
