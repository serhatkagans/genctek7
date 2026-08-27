import { prisma } from "@/lib/db";
import type { OturumKullanicisi } from "./tipler";

/**
 * Kullanıcının rollerindeki il KODLARININ karşılığı olan il ADLARI.
 *
 * ROL ETİKETİNDE İL KODU DEĞİL İL ADI (26 Ağustos 2026 · istek: "il
 * koordinatörü yazısının yanında il kodu yazıyor 34 diye, onu ilin ismi neyse
 * onunla değiştir"). Plaka kodu bir VERİTABANI ANAHTARIDIR; ekranda karşılığı
 * ilin adıdır.
 *
 * ORTAK YARDIMCI (27 Ağustos 2026): aynı sorgu üst bardaki rol rozetinde ve
 * paneldeki vitrinde ayrı ayrı yazılacaktı. İkisi de "hangi ilin koordinatörü"
 * sorusunu soruyor; ayrı yazılsalardı biri düzeltildiğinde öbürü kod basmaya
 * devam ederdi — bu hatanın bir kez yapılmış olması yeterli.
 *
 * SORGU YALNIZCA İLİ OLAN ROL VARSA çalışır: rolsüz kullanıcıda ve okul
 * personelinde (rolün ili yok) veritabanına hiç gidilmiyor. Ad bulunamazsa
 * anahtar da yok — çağıran taraf unvanı ek bilgisiz basar; eksik veriyle kod
 * göstermektense hiçbir şey göstermek yeğdir.
 */
export async function rolIlAdlariniGetir(
  kullanici: OturumKullanicisi,
): Promise<Map<string, string>> {
  const ilKodlari = [
    ...new Set(
      kullanici.roller
        .map((rol) => rol.ilKodu)
        .filter((kod): kod is string => kod !== null),
    ),
  ];
  if (ilKodlari.length === 0) return new Map();

  const iller = await prisma.il.findMany({
    where: { ilKodu: { in: ilKodlari } },
    select: { ilKodu: true, ad: true },
  });
  return new Map(iller.map((il) => [il.ilKodu, il.ad] as const));
}
