import { oturumKullanicisi } from "@/lib/auth/oturum";
import {
  AYAR_ANAHTARLARI,
  ayarSayi,
  VARSAYILAN_DISA_AKTARMA_UST_SINIRI,
} from "@/lib/ayar";
import { prisma } from "@/lib/db";
import { gorevYillari } from "@/lib/ogretmen/gorev-yillari";
import {
  altBaslikYaz,
  bicimCoz,
  disaAktarmaYaniti,
} from "@/lib/rapor/disa-aktarma";
import type { XlsxSutun } from "@/lib/rapor/xlsx";
import { ogretmenEnvanteriGorebilirMi } from "@/lib/yetki/izinler";
import { ogretmenListeFiltresi } from "@/lib/yetki/kapsam";
import { erisimLoglaCoklu } from "@/lib/yetki/log";
import type { SorguParametreleri } from "../../ogrenciler/filtreler";
import { ogretmenFiltreleriniCoz } from "../filtreler";

export const dynamic = "force-dynamic";

/**
 * Öğretmen envanterinin CSV çıktısı — ekranda görünen listenin aynısı.
 *
 * İletişim bilgisi (e-posta, telefon) BURADA YOKTUR: liste ekranında da yok.
 * Dışa aktarmaya ekranda olmayan bir alan eklemek, indirme yolunu kapsam
 * genişletmenin arka kapısı hâline getirirdi.
 */

const SUTUNLAR: readonly XlsxSutun[] = [
  { baslik: "Ad", genislik: 18 },
  { baslik: "Soyad", genislik: 18 },
  { baslik: "Branş", genislik: 24 },
  { baslik: "Okul", genislik: 38 },
  { baslik: "Okul türü", genislik: 26 },
  { baslik: "İl", genislik: 14 },
  { baslik: "İlçe", genislik: 16 },
  { baslik: "Güncel görev", genislik: 24 },
  { baslik: "Görev aldığı yıllar", genislik: 22 },
  { baslik: "Aktif danışmanlık", genislik: 14 },
  { baslik: "Düzenlediği etkinlik", genislik: 16 },
];

const ROL_ETIKETLERI: Record<string, string> = {
  DANISMAN: "Danışman öğretmen",
  IL_KOORDINATOR: "İl koordinatörü",
  PROJE_YONETICISI: "Proje yöneticisi",
  OGRENCI: "Öğrenci",
};

export async function GET(istek: Request) {
  const kullanici = await oturumKullanicisi();
  if (!kullanici || !ogretmenEnvanteriGorebilirMi(kullanici)) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const adres = new URL(istek.url);
  const parametreler: SorguParametreleri = Object.fromEntries(
    adres.searchParams.entries(),
  );
  const nerede = ogretmenListeFiltresi(
    kullanici,
    ogretmenFiltreleriniCoz(parametreler),
  );

  const [toplam, ustSinir] = await Promise.all([
    prisma.kullanici.count({ where: nerede }),
    ayarSayi(
      AYAR_ANAHTARLARI.DISA_AKTARMA_UST_SINIRI,
      VARSAYILAN_DISA_AKTARMA_UST_SINIRI,
    ),
  ]);

  if (toplam > ustSinir) {
    return new Response(
      `Bu filtrelerle ${toplam} kayıt var; tek dosyada en fazla ${ustSinir} kayıt indirilebilir. ` +
        "Lütfen il, okul veya branş filtresiyle daraltın.",
      { status: 413, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const ogretmenler = await prisma.kullanici.findMany({
    where: nerede,
    select: {
      id: true,
      ad: true,
      soyad: true,
      brans: true,
      kurum: { select: { ad: true, okulTuru: true } },
      il: { select: { ad: true } },
      ilce: { select: { ad: true } },
      roller: {
        select: {
          rolKodu: true,
          baslangicTarihi: true,
          bitisTarihi: true,
        },
      },
      _count: {
        select: {
          danismanAtamalari: { where: { bitisTarihi: null } },
          duzenledigiFaaliyetler: true,
        },
      },
    },
    orderBy: [{ ad: "asc" }, { soyad: "asc" }],
  });

  const bicim = bicimCoz(adres);

  await erisimLoglaCoklu(
    ogretmenler.map((ogretmen) => ({
      kullaniciId: kullanici.id,
      islem: "GORUNTULEME" as const,
      hedefTip: "OGRETMEN" as const,
      hedefId: ogretmen.id,
      detay: `Öğretmen listesi ${bicim.toUpperCase()} olarak dışa aktarıldı`,
    })),
  );

  const satirlar = ogretmenler.map((ogretmen) => {
    const aktifRoller = ogretmen.roller
      .filter((rol) => rol.bitisTarihi === null)
      .map((rol) => ROL_ETIKETLERI[rol.rolKodu] ?? rol.rolKodu);

    return [
      ogretmen.ad,
      ogretmen.soyad,
      ogretmen.brans ?? "",
      ogretmen.kurum?.ad ?? "",
      ogretmen.kurum?.okulTuru ?? "",
      ogretmen.il?.ad ?? "",
      ogretmen.ilce?.ad ?? "",
      aktifRoller.length > 0 ? aktifRoller.join(", ") : "Görev almamış",
      gorevYillari(ogretmen.roller).join(", "),
      ogretmen._count.danismanAtamalari,
      ogretmen._count.duzenledigiFaaliyetler,
    ];
  });

  return disaAktarmaYaniti({
    bicim,
    dosyaAdi: "genctek-ogretmenler",
    baslik: "GençTek Ekosistemi",
    altBaslik: altBaslikYaz("Öğretmen envanteri", satirlar.length),
    sutunlar: SUTUNLAR,
    satirlar,
  });
}
