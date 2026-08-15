import type { Prisma } from "@/generated/prisma/client";

/**
 * Sayım ekranlarının ortak kullanıcı koşulları (15 Ağustos 2026).
 *
 * Yönetim panosu (yonetim-ozeti.ts) ve Okul Eksik Durum ekranı
 * (okul-eksikleri.ts) aynı kelimelerle aynı kümeleri saymalı. İki dosyada ayrı
 * yazılsalardı biri "aktif öğrenci" derken diğerinden farklı bir küme sayar ve
 * fark, iki sayıyı yan yana koyan biri çıkana kadar görünmezdi.
 *
 * ---------------------------------------------------------------------------
 * KAPSAM FİLTRELERİYLE KARIŞTIRILMAMALI
 * ---------------------------------------------------------------------------
 * `lib/yetki/kapsam.ts` içinde de `AKTIF_OGRENCI` adında bir koşul var ve
 * BURADAKİNDEN FARKLI: oradaki `aktif: true` ARAMAZ. Fark kasıtlı ve iki
 * sorunun farklı olmasından geliyor —
 *
 *   · Kapsam filtresi "bu kişi bu listeyi görebilir mi / listede olmalı mı"
 *     sorusunu cevaplıyor; pasife alınmış bir öğrenci envanterde görünmeye
 *     devam ediyor, çünkü kaydı hâlâ yönetilen bir kayıt.
 *   · Sayım koşulu "burada kaç kişi var" sorusunu cevaplıyor; pasif kayıt
 *     buradaki sayıyı şişirirdi ve sayının karşılığı bir iştir.
 *
 * İkisi tek bir sabite indirgenirse bu ayrım kaybolur. Bu dosya veritabanına
 * BAKMAZ; yalnızca koşul üretir.
 */

/** Sayımlarda "aktif öğrenci" — rol açık VE kullanıcı aktif. */
export const SAYIMDA_OGRENCI: Prisma.KullaniciWhereInput = {
  aktif: true,
  roller: { some: { rolKodu: "OGRENCI", bitisTarihi: null } },
};

/** Sayımlarda "aktif danışman öğretmen" — GençTek danışmanlığı üstlenmiş kişi. */
export const SAYIMDA_DANISMAN: Prisma.KullaniciWhereInput = {
  aktif: true,
  roller: { some: { rolKodu: "DANISMAN", bitisTarihi: null } },
};
