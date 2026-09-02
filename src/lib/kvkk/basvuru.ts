import type {
  KvkkBasvuruDurumu,
  KvkkTalepKonusu,
} from "@/generated/prisma/enums";
import {
  bildirimGonder,
  projeYoneticilerineBildir,
} from "../bildirim/gonder";
import { BILDIRIM_KODLARI } from "../bildirim/sablon";
import { prisma } from "../db";
import { tarihYaz } from "../tarih";
import { erisimLogla } from "../yetki/log";
import {
  ACIK_DURUMLAR,
  DURUM_ETIKETLERI,
  KONU_KISA_ADLARI,
  yanitSonTarihi,
} from "./basvuru-kurallar";

/**
 * İlgili kişi başvurusunun veri katmanı — açma, listeleme ve yanıtlama
 * (2 Eylül 2026 · Genelge 4/ç).
 *
 * KARARLAR BURADA DEĞİL, ./basvuru-kurallar.ts'te: bu dosya veritabanına
 * gidiyor ve testte ayakta bir Postgres ister. Süre hesabı, doğrulama ve
 * durum kümeleri saf tarafta duruyor — aynı ayrım lib/kvkk/kurallar.ts ile
 * lib/kvkk/saklama.ts arasında da var.
 *
 * HER İŞLEM DENETİM DEFTERİNE YAZILIR (LogHedefTip.KVKK_BASVURUSU): başvurunun
 * içinde kişinin talebi ve gerekçesi var, yani başvurunun kendisi de kişisel
 * veridir. "Kim hangi başvuruyu okudu/yanıtladı" sorusu, KVKK denetiminde
 * sorulacak ilk sorulardan biri.
 */

export interface BasvuruSatiri {
  id: number;
  basvuran: {
    id: number;
    ad: string;
    soyad: string;
    ilKodu: string | null;
  };
  konular: KvkkTalepKonusu[];
  aciklama: string;
  yanitAdresi: string | null;
  durum: KvkkBasvuruDurumu;
  olusturmaTarihi: Date;
  yanitlayan: { ad: string; soyad: string } | null;
  yanitTarihi: Date | null;
  yanitMetni: string | null;
}

const SATIR_SECIMI = {
  id: true,
  aciklama: true,
  yanitAdresi: true,
  durum: true,
  olusturmaTarihi: true,
  yanitTarihi: true,
  yanitMetni: true,
  basvuran: { select: { id: true, ad: true, soyad: true, ilKodu: true } },
  yanitlayan: { select: { ad: true, soyad: true } },
  konular: { select: { konu: true } },
} as const;

type HamSatir = {
  id: number;
  aciklama: string;
  yanitAdresi: string | null;
  durum: KvkkBasvuruDurumu;
  olusturmaTarihi: Date;
  yanitTarihi: Date | null;
  yanitMetni: string | null;
  basvuran: { id: number; ad: string; soyad: string; ilKodu: string | null };
  yanitlayan: { ad: string; soyad: string } | null;
  konular: { konu: KvkkTalepKonusu }[];
};

function satiraCevir(ham: HamSatir): BasvuruSatiri {
  return {
    id: ham.id,
    basvuran: ham.basvuran,
    konular: ham.konular.map((satir) => satir.konu),
    aciklama: ham.aciklama,
    yanitAdresi: ham.yanitAdresi,
    durum: ham.durum,
    olusturmaTarihi: ham.olusturmaTarihi,
    yanitlayan: ham.yanitlayan,
    yanitTarihi: ham.yanitTarihi,
    yanitMetni: ham.yanitMetni,
  };
}

function konulariYaz(konular: readonly KvkkTalepKonusu[]): string {
  return konular.map((konu) => KONU_KISA_ADLARI[konu]).join(", ");
}

// ---------------------------------------------------------------------------
// Başvuru açma
// ---------------------------------------------------------------------------

export interface YeniBasvuru {
  kullaniciId: number;
  konular: KvkkTalepKonusu[];
  aciklama: string;
  yanitAdresi: string | null;
}

/**
 * Başvuruyu kaydeder, merkezi uyarır ve kaydı deftere yazar.
 *
 * KONULAR AYNI İŞLEMDE YAZILIR (nested create): başvuru satırı açılıp konular
 * ayrı bir çağrıda yazılsaydı, arada düşen bir istek "hiçbir talep konusu
 * seçilmemiş" bir başvuru bırakırdı — cevaplanamaz ama süresi işleyen bir
 * kayıt.
 *
 * BİLDİRİM İŞLEMİN DIŞINDA: posta sunucusu ya da şablon kaydı yüzünden
 * başvurunun kendisi geri alınmamalı. Kayıt duruyorsa hak kullanılmıştır;
 * merkez ekranda zaten görüyor.
 */
export async function kvkkBasvurusuAc(
  girdi: YeniBasvuru,
): Promise<{ id: number }> {
  const basvuru = await prisma.kvkkBasvurusu.create({
    data: {
      basvuranKullaniciId: girdi.kullaniciId,
      aciklama: girdi.aciklama,
      yanitAdresi: girdi.yanitAdresi,
      konular: { create: girdi.konular.map((konu) => ({ konu })) },
    },
    select: {
      id: true,
      olusturmaTarihi: true,
      basvuran: { select: { ad: true, soyad: true } },
    },
  });

  await erisimLogla({
    kullaniciId: girdi.kullaniciId,
    islem: "DEGISIKLIK",
    hedefTip: "KVKK_BASVURUSU",
    hedefId: basvuru.id,
    detay: `İlgili kişi başvurusu açıldı · ${konulariYaz(girdi.konular)}`,
  });

  await projeYoneticilerineBildir(BILDIRIM_KODLARI.KVKK_BASVURUSU_ALINDI, {
    basvuranAdSoyad: `${basvuru.basvuran.ad} ${basvuru.basvuran.soyad}`,
    konular: konulariYaz(girdi.konular),
    sonTarih: tarihYaz(yanitSonTarihi(basvuru.olusturmaTarihi)),
  });

  return { id: basvuru.id };
}

// ---------------------------------------------------------------------------
// Okuma
// ---------------------------------------------------------------------------

/**
 * Kişinin KENDİ başvuruları.
 *
 * ERİŞİM KAYDI YAZILMAZ: kişinin kendi verisine bakması denetlenecek bir olay
 * değil ve her panel ziyaretinde bir satır yazmak, defteri asıl aranan
 * satırların görünmez olacağı kadar şişirirdi (aynı ilke: profil ekranı da
 * kişinin kendi kaydını loglamıyor).
 */
export async function kendiBasvurularim(
  kullaniciId: number,
): Promise<BasvuruSatiri[]> {
  const satirlar = await prisma.kvkkBasvurusu.findMany({
    where: { basvuranKullaniciId: kullaniciId },
    orderBy: { olusturmaTarihi: "desc" },
    select: SATIR_SECIMI,
  });
  return satirlar.map(satiraCevir);
}

/**
 * Merkezin kuyruğu.
 *
 * AÇIKLAR EN ESKİ ÜSTTE, sonuçlananlar en yeni üstte: açık listede sıra bir
 * ACİLİYET sıralamasıdır (süresi en çok işlemiş başvuru üstte durmalı),
 * geçmişte ise en son ne yapıldığı aranır.
 */
export async function kvkkBasvurulariniListele(
  kullaniciId: number,
): Promise<{ acik: BasvuruSatiri[]; sonuclanan: BasvuruSatiri[] }> {
  const [acik, sonuclanan] = await Promise.all([
    prisma.kvkkBasvurusu.findMany({
      where: { durum: { in: [...ACIK_DURUMLAR] } },
      orderBy: { olusturmaTarihi: "asc" },
      select: SATIR_SECIMI,
    }),
    prisma.kvkkBasvurusu.findMany({
      where: { durum: { notIn: [...ACIK_DURUMLAR] } },
      orderBy: { olusturmaTarihi: "desc" },
      select: SATIR_SECIMI,
    }),
  ]);

  /*
   * LİSTEYE BAKMAK DA DEFTERE GEÇER, tek satırla: başvuruların içinde
   * kişilerin talepleri var. Başvuru başına bir satır yazılsaydı ekranı bir
   * kez açmak defteri onlarca satırla doldururdu — erişim kayıtları ekranı da
   * aynı biçimde tek satır yazıyor.
   */
  if (acik.length + sonuclanan.length > 0) {
    await erisimLogla({
      kullaniciId,
      islem: "GORUNTULEME",
      hedefTip: "KVKK_BASVURUSU",
      hedefId: "liste",
      detay: `${acik.length} açık, ${sonuclanan.length} sonuçlanmış başvuru listelendi`,
    });
  }

  return {
    acik: acik.map(satiraCevir),
    sonuclanan: sonuclanan.map(satiraCevir),
  };
}

/** Yönetim panosundaki kartın rozeti için. */
export async function acikKvkkBasvuruSayisi(): Promise<number> {
  return prisma.kvkkBasvurusu.count({
    where: { durum: { in: [...ACIK_DURUMLAR] } },
  });
}

// ---------------------------------------------------------------------------
// Karar
// ---------------------------------------------------------------------------

export type IslemSonucu =
  | { olduMu: true; mesaj: string }
  | { olduMu: false; neden: string };

/**
 * Başvuruyu "inceleniyor" hâline alır.
 *
 * SÜREYİ DURDURMAZ ve durdurmamalı: kanunun otuz günü başvurunun ulaştığı
 * anda başlar, üstlenildiği anda değil. Bu adımın tek işi ilgili kişiye
 * "kimse bakmıyor" izlenimi vermemek — bu yüzden kişiye bildirim de gitmiyor,
 * ekranındaki durum rozeti değişiyor.
 */
export async function basvuruyuIncelemeyeAl(
  basvuruId: number,
  kullaniciId: number,
): Promise<IslemSonucu> {
  const basvuru = await prisma.kvkkBasvurusu.findUnique({
    where: { id: basvuruId },
    select: { durum: true },
  });
  if (!basvuru) return { olduMu: false, neden: "Başvuru bulunamadı." };
  if (basvuru.durum !== "ALINDI") {
    return {
      olduMu: false,
      neden: "Bu başvuru zaten incelemeye alınmış ya da sonuçlanmış.",
    };
  }

  await prisma.kvkkBasvurusu.update({
    where: { id: basvuruId },
    data: { durum: "INCELENIYOR" },
  });

  await erisimLogla({
    kullaniciId,
    islem: "DEGISIKLIK",
    hedefTip: "KVKK_BASVURUSU",
    hedefId: basvuruId,
    detay: "Başvuru incelemeye alındı",
  });

  return { olduMu: true, mesaj: "Başvuru incelemeye alındı." };
}

export interface YanitGirdisi {
  basvuruId: number;
  yanitlayanKullaniciId: number;
  durum: KvkkBasvuruDurumu;
  yanit: string;
}

/**
 * Başvuruyu sonuçlandırır.
 *
 * SONUÇLANMIŞ BAŞVURU YENİDEN YANITLANMAZ. Verilmiş bir cevabın üzerine
 * yazmak, ilgili kişiye giden bildirimle sistemdeki kaydı çelişkiye
 * düşürürdü: kişinin elinde bir metin, denetimde başka bir metin olurdu.
 * Yeni bir şey söylenecekse kişi yeni başvuru açar ve süresi yeniden işler.
 */
export async function basvuruyuYanitla(
  girdi: YanitGirdisi,
): Promise<IslemSonucu> {
  const basvuru = await prisma.kvkkBasvurusu.findUnique({
    where: { id: girdi.basvuruId },
    select: {
      durum: true,
      basvuranKullaniciId: true,
      olusturmaTarihi: true,
    },
  });
  if (!basvuru) return { olduMu: false, neden: "Başvuru bulunamadı." };
  if (!ACIK_DURUMLAR.includes(basvuru.durum)) {
    return {
      olduMu: false,
      neden: "Bu başvuru zaten sonuçlandırılmış; yeni bir cevap için kişi yeniden başvurmalıdır.",
    };
  }

  const yanitTarihi = new Date();
  await prisma.kvkkBasvurusu.update({
    where: { id: girdi.basvuruId },
    data: {
      durum: girdi.durum,
      yanitMetni: girdi.yanit,
      yanitTarihi,
      yanitlayanKullaniciId: girdi.yanitlayanKullaniciId,
    },
  });

  await erisimLogla({
    kullaniciId: girdi.yanitlayanKullaniciId,
    islem: "DEGISIKLIK",
    hedefTip: "KVKK_BASVURUSU",
    hedefId: girdi.basvuruId,
    detay: `Başvuru sonuçlandırıldı · ${DURUM_ETIKETLERI[girdi.durum]}`,
  });

  await bildirimGonder({
    kullaniciId: basvuru.basvuranKullaniciId,
    kod: BILDIRIM_KODLARI.KVKK_BASVURUSU_YANITLANDI,
    degiskenler: {
      tarih: tarihYaz(basvuru.olusturmaTarihi),
      sonuc: DURUM_ETIKETLERI[girdi.durum],
      yanit: girdi.yanit,
    },
  });

  return {
    olduMu: true,
    mesaj: `Başvuru "${DURUM_ETIKETLERI[girdi.durum]}" olarak yanıtlandı ve başvurana bildirildi.`,
  };
}
