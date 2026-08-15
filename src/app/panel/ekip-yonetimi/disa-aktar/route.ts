import { oturumKullanicisi } from "@/lib/auth/oturum";
import {
  AYAR_ANAHTARLARI,
  ayarSayi,
  VARSAYILAN_DISA_AKTARMA_UST_SINIRI,
} from "@/lib/ayar";
import { prisma } from "@/lib/db";
import {
  EKIP_TURU_ETIKETLERI,
  ekipDanismansizMi,
  ekipYonetebilirMi,
} from "@/lib/ekip/kurallar";
import {
  altBaslikYaz,
  bicimCoz,
  disaAktarmaYaniti,
} from "@/lib/rapor/disa-aktarma";
import type { XlsxSutun } from "@/lib/rapor/xlsx";
import type { SorguParametreleri } from "../../ogrenciler/filtreler";
import { ekipKosulu, ekipSuzgeciniCoz } from "../filtreler";

export const dynamic = "force-dynamic";

/**
 * Ekip listesinin dosya çıktısı (15 Ağustos 2026 · Aşama 5).
 *
 * Kapı ve süzgeç çözümlemesi ekranınkiyle ortak; koordinatörün il kısıtı
 * `ekipSuzgeciniCoz` içinde uygulanıyor.
 *
 * "DANIŞMAN DURUMU" AYRI SÜTUN: danışman adının boş olması ile danışmanın
 * pasif olması dosyada farklı görünmeli. Yalnızca ad sütunu olsaydı, pasif
 * danışmanlı ekip dolu bir hücreyle "danışmanı var" gibi okunur ve
 * danışmansızlar süzgecinden gelen dosyada açıklanamaz satırlar olurdu.
 */

const SUTUNLAR: readonly XlsxSutun[] = [
  { baslik: "Ekip adı", genislik: 40 },
  { baslik: "Tür", genislik: 20 },
  { baslik: "İl", genislik: 14 },
  { baslik: "Okul", genislik: 38 },
  { baslik: "Danışman", genislik: 24 },
  { baslik: "Danışman durumu", genislik: 18 },
  { baslik: "Üye sayısı", genislik: 11 },
  { baslik: "Mesaj sayısı", genislik: 12 },
  { baslik: "Durum", genislik: 10 },
  { baslik: "Kuruluş tarihi", genislik: 14 },
];

export async function GET(istek: Request) {
  const kullanici = await oturumKullanicisi();
  if (!kullanici || !ekipYonetebilirMi(kullanici)) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const adres = new URL(istek.url);
  const parametreler: SorguParametreleri = Object.fromEntries(
    adres.searchParams.entries(),
  );
  const suzgec = ekipSuzgeciniCoz(kullanici, parametreler);
  const nerede = ekipKosulu(suzgec);

  const [toplam, ustSinir] = await Promise.all([
    prisma.ekip.count({ where: nerede }),
    ayarSayi(
      AYAR_ANAHTARLARI.DISA_AKTARMA_UST_SINIRI,
      VARSAYILAN_DISA_AKTARMA_UST_SINIRI,
    ),
  ]);

  if (toplam > ustSinir) {
    return new Response(
      `Bu süzgeçlerle ${toplam} ekip var; tek dosyada en fazla ${ustSinir} kayıt indirilebilir. ` +
        "Lütfen il ya da tür süzgeciyle daraltın.",
      { status: 413, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const ekipler = await prisma.ekip.findMany({
    where: nerede,
    orderBy: [{ ad: "asc" }],
    select: {
      ad: true,
      tur: true,
      aktif: true,
      olusturmaTarihi: true,
      il: { select: { ad: true } },
      kurum: { select: { ad: true } },
      danisman: { select: { ad: true, soyad: true, aktif: true } },
      _count: { select: { uyeler: true, mesajlar: true } },
    },
  });

  const satirlar = ekipler.map((ekip) => [
    ekip.ad,
    EKIP_TURU_ETIKETLERI[ekip.tur],
    ekip.il?.ad ?? "",
    ekip.kurum?.ad ?? "",
    ekip.danisman ? `${ekip.danisman.ad} ${ekip.danisman.soyad}` : "",
    ekip.danisman === null
      ? "Atanmadı"
      : ekip.danisman.aktif
        ? "Aktif"
        : "Pasif (danışmansız sayılır)",
    ekip._count.uyeler,
    ekip._count.mesajlar,
    ekip.aktif ? "Açık" : "Kapalı",
    ekip.olusturmaTarihi,
  ]);

  const danismansiz = ekipler.filter(ekipDanismansizMi).length;

  return disaAktarmaYaniti({
    bicim: bicimCoz(adres),
    dosyaAdi: suzgec.danismansizMi
      ? "genctek-danismansiz-ekipler"
      : "genctek-ekipler",
    baslik: "GençTek Ekosistemi",
    altBaslik: altBaslikYaz(
      `Ekip listesi · ${danismansiz} ekip danışmansız`,
      satirlar.length,
    ),
    sutunlar: SUTUNLAR,
    satirlar,
  });
}
