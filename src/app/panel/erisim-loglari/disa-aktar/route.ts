import { oturumKullanicisi } from "@/lib/auth/oturum";
import {
  AYAR_ANAHTARLARI,
  ayarSayi,
  VARSAYILAN_DISA_AKTARMA_UST_SINIRI,
} from "@/lib/ayar";
import { prisma } from "@/lib/db";
import {
  altBaslikYaz,
  bicimCoz,
  disaAktarmaYaniti,
} from "@/lib/rapor/disa-aktarma";
import { erisimLoguKosulu } from "@/lib/rapor/erisim-logu";
import type { XlsxSutun } from "@/lib/rapor/xlsx";
import {
  LOG_HEDEF_ETIKETLERI,
  LOG_ISLEM_ETIKETLERI,
} from "@/lib/yetki/etiketler";
import { erisimLoglariniGorebilirMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import type { SorguParametreleri } from "../../ogrenciler/filtreler";
import { erisimLogFiltreleriniCoz } from "../filtreler";

export const dynamic = "force-dynamic";

/**
 * Erişim kayıtlarının dosya çıktısı — KVKK denetim dökümü (15 Ağustos 2026).
 *
 * `manisa-farklari-plani.md` · Aşama 2c, yüksek öncelikli dört ekranın ilki.
 * Denetim ekranının ekranda kalması, "kim neye baktı" sorusunun kurum içi bir
 * incelemede paylaşılabilir bir belgeye dönüşememesi demekti; ekran 50'şer
 * kayıt sayfalıyor ve iki yıllık kaydı sayfa sayfa okumak mümkün değil.
 *
 * ---------------------------------------------------------------------------
 * BU İNDİRMENİN KENDİSİ DE LOGLANIR
 * ---------------------------------------------------------------------------
 * Denetim kaydını üreten ekranın toplu indirilmesinin izsiz kalması çelişki
 * olurdu: dosya kişisel veri taşıyor (kim, ne zaman, hangi kaydı, hangi IP) ve
 * bir kez indirildikten sonra sistemin denetimi dışına çıkıyor. Kayda indirilen
 * SATIR SAYISI da yazılıyor — "hangi kapsam dışarı çıktı" sorusunun tek cevabı o.
 *
 * Ekranın kendisi kayıt bazında değil TEK satır logluyor (`hedefId: "liste"`);
 * burada da aynı desen izleniyor, yoksa 5000 satırlık bir indirme denetim
 * tablosuna 5000 satır daha yazar ve tabloyu kendi gürültüsüyle doldururdu.
 */

const SUTUNLAR: readonly XlsxSutun[] = [
  { baslik: "Tarih", genislik: 14 },
  { baslik: "Saat", genislik: 10 },
  { baslik: "İşlemi yapan", genislik: 26 },
  { baslik: "İşlem", genislik: 18 },
  { baslik: "Kayıt türü", genislik: 22 },
  { baslik: "Kayıt kimliği", genislik: 16 },
  { baslik: "Ayrıntı", genislik: 60 },
  { baslik: "IP adresi", genislik: 18 },
];

export async function GET(istek: Request) {
  const kullanici = await oturumKullanicisi();
  if (!kullanici) {
    return new Response("Bulunamadı", { status: 404 });
  }
  // Ekranın kapısının aynısı: dosya, ekranda kapalı bir listeye arka kapı olamaz.
  if (!erisimLoglariniGorebilirMi(kullanici)) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const adres = new URL(istek.url);
  const parametreler: SorguParametreleri = Object.fromEntries(
    adres.searchParams.entries(),
  );
  const filtre = erisimLogFiltreleriniCoz(parametreler);
  const nerede = erisimLoguKosulu(filtre);

  const [toplam, ustSinir] = await Promise.all([
    prisma.erisimlogu.count({ where: nerede }),
    ayarSayi(
      AYAR_ANAHTARLARI.DISA_AKTARMA_UST_SINIRI,
      VARSAYILAN_DISA_AKTARMA_UST_SINIRI,
    ),
  ]);

  if (toplam > ustSinir) {
    return new Response(
      `Bu filtrelerle ${toplam} kayıt var; tek dosyada en fazla ${ustSinir} kayıt indirilebilir. ` +
        "Lütfen tarih aralığı, işlem veya kayıt türü filtresiyle daraltın.",
      { status: 413, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const kayitlar = await prisma.erisimlogu.findMany({
    where: nerede,
    orderBy: { tarih: "desc" },
    select: {
      tarih: true,
      islem: true,
      hedefTip: true,
      hedefId: true,
      ipAdresi: true,
      detay: true,
      kullanici: { select: { ad: true, soyad: true } },
    },
  });

  const bicim = bicimCoz(adres);

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "GORUNTULEME",
    hedefTip: "ERISIM_LOGU",
    hedefId: "liste",
    detay: `Erişim kayıtları ${bicim.toUpperCase()} olarak dışa aktarıldı (${toplam} kayıt)`,
  });

  const satirlar = kayitlar.map((kayit) => [
    /*
     * TARİH VE SAAT AYRI SÜTUNLARDA. Denetimde sorulan iki soru farklı: "hangi
     * gün" (güne göre süzülür ve gruplanır) ve "hangi saatte" (art arda gelen
     * işlemleri okumak için). Tek hücrede tutulsalardı tarih sütunu güne göre
     * süzülemezdi — aynı günün her saati ayrı bir değer olurdu.
     */
    kayit.tarih,
    kayit.tarih.toLocaleTimeString("tr-TR", { timeZone: "Europe/Istanbul" }),
    `${kayit.kullanici.ad} ${kayit.kullanici.soyad}`,
    LOG_ISLEM_ETIKETLERI[kayit.islem] ?? kayit.islem,
    LOG_HEDEF_ETIKETLERI[kayit.hedefTip] ?? kayit.hedefTip,
    kayit.hedefId,
    kayit.detay ?? "",
    kayit.ipAdresi ?? "",
  ]);

  return disaAktarmaYaniti({
    bicim,
    dosyaAdi: "genctek-erisim-kayitlari",
    baslik: "GençTek Ekosistemi",
    altBaslik: altBaslikYaz("Erişim kayıtları (KVKK denetim dökümü)", toplam),
    sutunlar: SUTUNLAR,
    satirlar,
  });
}
