import type { Prisma } from "@/generated/prisma/client";
import { oturumKullanicisi } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  altBaslikYaz,
  bicimCoz,
  disaAktarmaYaniti,
} from "@/lib/rapor/disa-aktarma";
import type { XlsxSutun } from "@/lib/rapor/xlsx";
import { GOREV_ROL_ETIKETLERI } from "@/lib/yetki/etiketler";
import {
  ilTemsilcisiAtayabilirMi,
  koordinatorIlKodu,
  projeYoneticisiMi,
} from "@/lib/yetki/izinler";
import { erisimLoglaCoklu } from "@/lib/yetki/log";

export const dynamic = "force-dynamic";

/**
 * Öğrenci görev rollerinin dosya çıktısı (15 Ağustos 2026 · Aşama 2c).
 *
 * ============================================================================
 * DOSYA EKRANIN LİSTESİ DEĞİL, EKRANIN SONUCUDUR
 * ============================================================================
 * Diğer dışa aktarmalarda kural "dosya = ekrandaki liste"dir. Burada bilerek
 * farklı: Görev Rolleri bir ATAMA ekranı ve listelediği şey görev verilebilecek
 * ADAY öğrenciler — çoğunun hiçbir görevi yok. O listeyi indirmek "ilimdeki
 * öğrenciler" dosyasının ikinci bir kopyası olurdu; öğrenci envanteri zaten var.
 *
 * Bu ekranın cevapladığı asıl soru "kime hangi görev verilmiş"tir ve dosya onu
 * taşıyor: verilmiş görevler, kapsamı, dönemi, kimin verdiği. Kayıt kaynağı da
 * bu yüzden `ogrenciGorevRolu`, `kullanici` değil.
 *
 * KAPSAM EKRANIN KAPISIYLA AYNI: merkez ülke geneli, il koordinatörü kendi ili.
 * Ekranı açamayan dosyayı da alamaz.
 *
 * DÖNEM SÜZGECİ: `?yil=2025-2026`. Verilmezse TÜM dönemler gelir — görev
 * rolleri dönem bazlı ve "geçen yıl kim temsilciydi" meşru bir soru. Ekran
 * yalnızca içinde bulunulan dönemi gösteriyor; dosyanın geçmişi de taşıması
 * ekranla çelişmiyor, çünkü dönem sütunu satırın yanında yazılı.
 */

const SUTUNLAR: readonly XlsxSutun[] = [
  { baslik: "Ad", genislik: 18 },
  { baslik: "Soyad", genislik: 18 },
  { baslik: "Sınıf", genislik: 10 },
  { baslik: "Görev", genislik: 26 },
  { baslik: "Görev kapsamı", genislik: 34 },
  { baslik: "Eğitim-öğretim yılı", genislik: 16 },
  { baslik: "Öğrencinin ili", genislik: 14 },
  { baslik: "Öğrencinin ilçesi", genislik: 16 },
  { baslik: "Öğrencinin okulu", genislik: 38 },
  { baslik: "Atayan", genislik: 22 },
  { baslik: "Atama tarihi", genislik: 14 },
];

export async function GET(istek: Request) {
  const kullanici = await oturumKullanicisi();
  if (!kullanici) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const merkezMi = projeYoneticisiMi(kullanici);
  const ilKodu = koordinatorIlKodu(kullanici);
  const yetkili =
    merkezMi || (ilKodu !== null && ilTemsilcisiAtayabilirMi(kullanici, ilKodu));

  if (!yetkili) {
    return new Response("Bulunamadı", { status: 404 });
  }

  const adres = new URL(istek.url);
  const yil = (adres.searchParams.get("yil") ?? "").trim();

  /*
   * KAPSAM GÖREVİN KENDİ SÜTUNUNDAN OKUNUR, öğrencinin kaydından değil.
   * Öğrenci okul/il değiştirdiğinde dönem içinde verilmiş görev verildiği
   * yerde kalır (şemadaki `ck_ogrenci_gorev_kapsam` notu). Koordinatörün
   * dosyası, o dönem KENDİ İLİNDE verilmiş görevleri göstermeli — öğrencinin
   * bugün nerede olduğunu değil.
   */
  const nerede: Prisma.OgrenciGorevRoluWhereInput = {
    ...(merkezMi ? {} : { ilKodu }),
    ...(yil ? { egitimOgretimYili: yil } : {}),
  };

  const gorevler = await prisma.ogrenciGorevRolu.findMany({
    where: nerede,
    orderBy: [{ egitimOgretimYili: "desc" }, { atamaTarihi: "desc" }],
    select: {
      rolKodu: true,
      egitimOgretimYili: true,
      atamaTarihi: true,
      il: { select: { ad: true } },
      ilce: { select: { ad: true } },
      kurum: { select: { ad: true } },
      calismaGrubu: { select: { ad: true } },
      atayan: { select: { ad: true, soyad: true } },
      ogrenci: {
        select: {
          id: true,
          ad: true,
          soyad: true,
          sinif: true,
          il: { select: { ad: true } },
          ilce: { select: { ad: true } },
          kurum: { select: { ad: true } },
        },
      },
    },
  });

  const bicim = bicimCoz(adres);

  await erisimLoglaCoklu(
    gorevler.map((gorev) => ({
      kullaniciId: kullanici.id,
      islem: "GORUNTULEME" as const,
      hedefTip: "OGRENCI" as const,
      hedefId: gorev.ogrenci.id,
      detay: `Görev rolleri listesi ${bicim.toUpperCase()} olarak dışa aktarıldı`,
    })),
  );

  const satirlar = gorevler.map((gorev) => [
    gorev.ogrenci.ad,
    gorev.ogrenci.soyad,
    gorev.ogrenci.sinif ?? "",
    GOREV_ROL_ETIKETLERI[gorev.rolKodu] ?? gorev.rolKodu,
    /*
     * GÖREVİN KAPSAMI TEK SÜTUNDA. Dört rolün kapsamı dört ayrı sütunda duruyor
     * (il / ilçe / kurum / çalışma grubu) ve her satırda yalnızca biri dolu.
     * Dördü ayrı sütun olsaydı dosyanın dörtte üçü boş kalır, "kapsam" sorusu
     * da dört sütunu birden okumayı gerektirirdi.
     */
    gorev.calismaGrubu?.ad ??
      gorev.kurum?.ad ??
      gorev.ilce?.ad ??
      gorev.il?.ad ??
      "",
    gorev.egitimOgretimYili,
    gorev.ogrenci.il?.ad ?? "",
    gorev.ogrenci.ilce?.ad ?? "",
    gorev.ogrenci.kurum?.ad ?? "",
    `${gorev.atayan.ad} ${gorev.atayan.soyad}`,
    gorev.atamaTarihi,
  ]);

  return disaAktarmaYaniti({
    bicim,
    dosyaAdi: "genctek-gorev-rolleri",
    baslik: "GençTek Ekosistemi",
    altBaslik: altBaslikYaz(
      yil ? `Görev rolleri · ${yil}` : "Görev rolleri · tüm dönemler",
      satirlar.length,
    ),
    sutunlar: SUTUNLAR,
    satirlar,
  });
}
