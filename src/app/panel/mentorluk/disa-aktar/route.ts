import { oturumKullanicisi } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  altBaslikYaz,
  bicimCoz,
  disaAktarmaYaniti,
} from "@/lib/rapor/disa-aktarma";
import type { XlsxSutun } from "@/lib/rapor/xlsx";
import { mentorlukOnaylayabilirMi } from "@/lib/yetki/izinler";
import { mentorlukKapsamFiltresi } from "@/lib/mentor/veri";
import { erisimLoglaCoklu } from "@/lib/yetki/log";

export const dynamic = "force-dynamic";

/**
 * Mentörlük başvuru ve eşleşmelerinin dosya çıktısı
 * (15 Ağustos 2026 · Aşama 2c'nin kalanı).
 *
 * Ekran bekleyenleri ve karara bağlananları ayrı bölümlerde gösteriyor; dosya
 * ikisini tek tabloda taşıyor. "Kimler başvurdu, kaçı onaylandı, hangi
 * konularda mentör var" soruları tek listede cevaplanır.
 *
 * Kapı ve kapsam ekranınkiyle aynı (`mentorlukOnaylayabilirMi` +
 * `mentorlukKapsamFiltresi`): koordinatör kendi ilini, merkez hepsini görür.
 */

const SUTUNLAR: readonly XlsxSutun[] = [
  { baslik: "Ad", genislik: 18 },
  { baslik: "Soyad", genislik: 18 },
  { baslik: "Branş", genislik: 24 },
  { baslik: "İl", genislik: 14 },
  { baslik: "Okul", genislik: 34 },
  { baslik: "Durum", genislik: 14 },
  { baslik: "Konular", genislik: 44 },
  { baslik: "Çalışma grupları", genislik: 34 },
  { baslik: "Başvuru tarihi", genislik: 14 },
  { baslik: "Karar tarihi", genislik: 14 },
  { baslik: "Ret gerekçesi", genislik: 40 },
];

const DURUM_ETIKETLERI: Record<string, string> = {
  BEKLIYOR: "Bekliyor",
  ONAYLANDI: "Onaylandı",
  REDDEDILDI: "Reddedildi",
};

export async function GET(istek: Request) {
  const kullanici = await oturumKullanicisi();
  if (!kullanici || !mentorlukOnaylayabilirMi(kullanici)) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const kayitlar = await prisma.mentorluk.findMany({
    where: mentorlukKapsamFiltresi(kullanici),
    orderBy: [{ durum: "asc" }, { basvuruTarihi: "asc" }],
    select: {
      kullaniciId: true,
      durum: true,
      konular: true,
      basvuruTarihi: true,
      kararTarihi: true,
      retGerekcesi: true,
      gruplar: { select: { calismaGrubu: { select: { ad: true } } } },
      kullanici: {
        select: {
          ad: true,
          soyad: true,
          brans: true,
          kurum: { select: { ad: true } },
          il: { select: { ad: true } },
        },
      },
    },
  });

  const bicim = bicimCoz(new URL(istek.url));

  /*
   * Hedef tipi OGRETMEN: mentörlerin çoğu öğretmen ve `LogHedefTip` içinde
   * genel bir "kullanıcı" değeri yok. Mezun mentörler de bu tiple yazılıyor —
   * denetimde aranan şey kaydın KİMİN görüldüğü, hangi rol sınıfına düştüğü
   * değil; kimlik `hedefId` ile zaten tekil.
   */
  await erisimLoglaCoklu(
    kayitlar.map((kayit) => ({
      kullaniciId: kullanici.id,
      islem: "GORUNTULEME" as const,
      hedefTip: "OGRETMEN" as const,
      hedefId: kayit.kullaniciId,
      detay: `Mentörlük listesi ${bicim.toUpperCase()} olarak dışa aktarıldı`,
    })),
  );

  const satirlar = kayitlar.map((kayit) => [
    kayit.kullanici.ad,
    kayit.kullanici.soyad,
    kayit.kullanici.brans ?? "",
    kayit.kullanici.il?.ad ?? "",
    kayit.kullanici.kurum?.ad ?? "",
    DURUM_ETIKETLERI[kayit.durum] ?? kayit.durum,
    kayit.konular,
    kayit.gruplar.map((g) => g.calismaGrubu.ad).join(", "),
    kayit.basvuruTarihi,
    kayit.kararTarihi,
    kayit.retGerekcesi ?? "",
  ]);

  return disaAktarmaYaniti({
    bicim,
    dosyaAdi: "genctek-mentorluk",
    baslik: "GençTek Ekosistemi",
    altBaslik: altBaslikYaz("Mentörlük başvuruları ve eşleşmeleri", satirlar.length),
    sutunlar: SUTUNLAR,
    satirlar,
  });
}
