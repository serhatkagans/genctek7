import { oturumKullanicisi } from "@/lib/auth/oturum";
import {
  AYAR_ANAHTARLARI,
  ayarSayi,
  VARSAYILAN_DISA_AKTARMA_UST_SINIRI,
} from "@/lib/ayar";
import { prisma } from "@/lib/db";
import { PAYDAS_TURU_ETIKETLERI } from "@/lib/paydas/kurallar";
import {
  altBaslikYaz,
  bicimCoz,
  disaAktarmaYaniti,
} from "@/lib/rapor/disa-aktarma";
import type { XlsxSutun } from "@/lib/rapor/xlsx";
import { paydasGorebilirMi } from "@/lib/yetki/izinler";
import { paydasListeFiltresi } from "@/lib/yetki/kapsam";
import { erisimLoglaCoklu } from "@/lib/yetki/log";
import type { SorguParametreleri } from "../../ogrenciler/filtreler";
import { paydasFiltreleriniCoz } from "../filtreler";

export const dynamic = "force-dynamic";

/**
 * Paydaş envanterinin dosya çıktısı (varsayılan XLSX, `?bicim=csv` ile CSV).
 *
 * Dosya, ekranda görünen listenin AYNISIDIR: aynı kapsam ve aynı ekran
 * filtrelerinden geçer. İletişim bilgisi ekranda da göründüğü için dosyada da
 * vardır — dışa aktarma kapsam genişletmenin arka kapısı değildir, ekranın
 * kopyasıdır.
 */

const SUTUNLAR: readonly XlsxSutun[] = [
  { baslik: "Kurum", genislik: 34 },
  { baslik: "Tür", genislik: 22 },
  { baslik: "İl", genislik: 14 },
  /* Etiket 27 Ağustos 2026'da "İrtibat kişisi" oldu; sütun zaten vardı
     (istek: "listeye paydaştaki yetkili kişisi eklensin, excele de ekle"
     — dosyada eksik olan sütun değil, LİSTEDEKİ sütundu). */
  { baslik: "İrtibat kişisi", genislik: 22 },
  { baslik: "Telefon", genislik: 16 },
  { baslik: "E-posta", genislik: 28 },
  { baslik: "Adres", genislik: 40 },
  { baslik: "İş birliği alanı", genislik: 34 },
  { baslik: "Notlar", genislik: 40 },
  { baslik: "Durum", genislik: 10 },
  { baslik: "Bağlı etkinlik sayısı", genislik: 16 },
];

export async function GET(istek: Request) {
  const kullanici = await oturumKullanicisi();
  if (!kullanici || !paydasGorebilirMi(kullanici)) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const adres = new URL(istek.url);
  const parametreler: SorguParametreleri = Object.fromEntries(
    adres.searchParams.entries(),
  );
  const nerede = paydasListeFiltresi(
    kullanici,
    paydasFiltreleriniCoz(parametreler),
  );

  const [toplam, ustSinir] = await Promise.all([
    prisma.paydas.count({ where: nerede }),
    ayarSayi(
      AYAR_ANAHTARLARI.DISA_AKTARMA_UST_SINIRI,
      VARSAYILAN_DISA_AKTARMA_UST_SINIRI,
    ),
  ]);

  // Sınır aşıldığında liste kırpılmaz, indirme reddedilir: sessizce kırpılmış
  // bir rapor, eksik olduğu belli olmadığı için yanlış karara yol açar.
  if (toplam > ustSinir) {
    return new Response(
      `Bu filtrelerle ${toplam} kayıt var; tek dosyada en fazla ${ustSinir} kayıt indirilebilir. ` +
        "Lütfen il veya tür filtresiyle daraltın.",
      { status: 413, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const paydaslar = await prisma.paydas.findMany({
    where: nerede,
    orderBy: [{ aktif: "desc" }, { ad: "asc" }],
    select: {
      id: true,
      ad: true,
      tur: true,
      yetkiliKisi: true,
      telefon: true,
      eposta: true,
      adres: true,
      isBirligiAlani: true,
      notlar: true,
      aktif: true,
      il: { select: { ad: true } },
      _count: { select: { faaliyetler: true } },
    },
  });

  const bicim = bicimCoz(adres);

  await erisimLoglaCoklu(
    paydaslar.map((paydas) => ({
      kullaniciId: kullanici.id,
      islem: "GORUNTULEME" as const,
      hedefTip: "PAYDAS" as const,
      hedefId: paydas.id,
      detay: `Paydaş listesi ${bicim.toUpperCase()} olarak dışa aktarıldı`,
    })),
  );

  const satirlar = paydaslar.map((paydas) => [
    paydas.ad,
    PAYDAS_TURU_ETIKETLERI[paydas.tur],
    paydas.il.ad,
    paydas.yetkiliKisi ?? "",
    paydas.telefon ?? "",
    paydas.eposta ?? "",
    paydas.adres ?? "",
    paydas.isBirligiAlani,
    paydas.notlar ?? "",
    paydas.aktif ? "Aktif" : "Pasif",
    paydas._count.faaliyetler,
  ]);

  return disaAktarmaYaniti({
    bicim,
    dosyaAdi: "genctek-paydaslar",
    baslik: "GençTek Ekosistemi",
    altBaslik: altBaslikYaz("Paydaş envanteri", satirlar.length),
    sutunlar: SUTUNLAR,
    satirlar,
  });
}
