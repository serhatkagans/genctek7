/*
 * SSO veri talebi tablolarını CSV olarak üretir.
 *
 * Kurumlara (EBA/e-Okul, MEBBİS, e-Devlet) verilecek talep listesi Excel'de
 * açılacağı için projenin kendi CSV sözleşmesi kullanılır (bkz. lib/rapor/csv.ts):
 * noktalı virgül ayıraç, CRLF satır sonu, UTF-8 BOM. Türkçe yerel ayarda Excel
 * virgülü ondalık ayırıcı saydığı için virgüllü dosya tek sütuna yığılır.
 *
 * Alan listesinin kaynağı: src/lib/auth/tipler.ts (AuthKimlik) ve
 * prisma/schema.prisma. Şema değişirse burası da güncellenmelidir.
 *
 * Çıktı: kurulum/*.csv
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const kok = join(dirname(fileURLToPath(import.meta.url)), "..");
const cikti = join(kok, "kurulum");

const AYIRAC = ";";
const SATIR_SONU = "\r\n";
const BOM = "﻿";
const FORMUL_BASLANGICLARI = ["=", "+", "-", "@", "\t", "\r"];

function hucre(deger) {
  if (deger === null || deger === undefined) return "";
  let metin = String(deger);
  if (FORMUL_BASLANGICLARI.some((k) => metin.startsWith(k))) metin = `'${metin}`;
  if (
    metin.includes(AYIRAC) ||
    metin.includes('"') ||
    metin.includes("\n") ||
    metin.includes("\r")
  ) {
    return `"${metin.replaceAll('"', '""')}"`;
  }
  return metin;
}

const belge = (basliklar, satirlar) =>
  BOM +
  [basliklar, ...satirlar].map((s) => s.map(hucre).join(AYIRAC)).join(SATIR_SONU) +
  SATIR_SONU;

/* ------------------------------------------------------------------ */
/* 1. Kimlik alanları                                                  */
/* ------------------------------------------------------------------ */

const KIMLIK_BASLIK = [
  "Kaynak",
  "Kullanici Tipi",
  "Sira",
  "Alan Adi",
  "Teknik Ad",
  "Veritabani Sutunu",
  "Tip",
  "Uzunluk",
  "Zorunlu",
  "Ornek",
  "Aciklama",
];

const ortak = (kaynak, tip) => (satirlar) =>
  satirlar.map((s, i) => [kaynak, tip, i + 1, ...s]);

const KIMLIK_SATIRLARI = [
  ...ortak("EBA / e-Okul", "OGRENCI")([
    ["Kimlik numarasi", "authProviderId", "auth_provider_id", "Metin", "64", "Evet", "eba-8f3c1a...", "Tekil ve kalici olmali; asla yeniden kullanilmamali. TCKN KULLANILMAMALI."],
    ["Ad", "ad", "ad", "Metin", "100", "Evet", "Ayse", "Salt okunur; kullanici degistiremez."],
    ["Soyad", "soyad", "soyad", "Metin", "100", "Evet", "Yilmaz", "Salt okunur; kullanici degistiremez."],
    ["Cinsiyet", "cinsiyet", "cinsiyet", "Karakter", "1", "Evet", "K", "Yalnizca E veya K. Kaynak 1/2 veya M/F donerse eslenmeli."],
    ["Okul kodu", "kurumKodu", "kurum_kodu", "Tam sayi", "", "Evet", "750123", "kurum tablosuna yabanci anahtar. Kayit yoksa giris basarisiz olur."],
    ["Il kodu", "ilKodu", "il_kodu", "Karakter", "2", "Evet", "06", "il tablosuna yabanci anahtar."],
    ["Ilce kodu", "ilceKodu", "ilce_kodu", "Karakter", "4", "Evet", "0601", "ilce tablosuna yabanci anahtar."],
    ["Sinif", "sinif", "sinif", "Metin", "10", "Evet", "11-A", "YALNIZCA OGRENCIDE. Ogretmende bos gonderilir."],
    ["Egitim-ogretim yili", "egitimOgretimYili", "egitim_ogretim_yili", "Metin", "9", "Evet", "2025-2026", "YYYY-YYYY bicimi. Kaynak tek yil donerse donusum kurali netlesmeli."],
  ]),
  ...ortak("MEBBIS", "OGRETMEN")([
    ["Kimlik numarasi", "authProviderId", "auth_provider_id", "Metin", "64", "Evet", "mebbis-4d90e2...", "Tekil ve kalici olmali; asla yeniden kullanilmamali. TCKN KULLANILMAMALI."],
    ["Ad", "ad", "ad", "Metin", "100", "Evet", "Mehmet", "Salt okunur; kullanici degistiremez."],
    ["Soyad", "soyad", "soyad", "Metin", "100", "Evet", "Demir", "Salt okunur; kullanici degistiremez."],
    ["Cinsiyet", "cinsiyet", "cinsiyet", "Karakter", "1", "Evet", "E", "Yalnizca E veya K. Kaynak 1/2 veya M/F donerse eslenmeli."],
    ["Okul kodu (asil kadro)", "kurumKodu", "kurum_kodu", "Tam sayi", "", "Evet", "750123", "KRITIK: danisman-ogrenci eslestirmesinin tek anahtari. Degisimi devir zincirini tetikler. Coklu gorev yeri varsa ASIL KADRO belirtilmeli."],
    ["Il kodu", "ilKodu", "il_kodu", "Karakter", "2", "Evet", "06", "il tablosuna yabanci anahtar."],
    ["Ilce kodu", "ilceKodu", "ilce_kodu", "Karakter", "4", "Evet", "0601", "ilce tablosuna yabanci anahtar."],
    ["Brans", "brans", "brans", "Metin", "100", "Evet", "Bilisim Teknolojileri", "YALNIZCA OGRETMENDE. Ogrencide bos gonderilir."],
    ["Egitim-ogretim yili", "egitimOgretimYili", "egitim_ogretim_yili", "Metin", "9", "Evet", "2025-2026", "YYYY-YYYY bicimi."],
  ]),
  ...ortak("MEBBIS", "PERSONEL (YEGITEK)")([
    ["Kimlik numarasi", "authProviderId", "auth_provider_id", "Metin", "64", "Evet", "mebbis-11ab77...", "Tekil ve kalici olmali."],
    ["Ad", "ad", "ad", "Metin", "100", "Evet", "Zeynep", "Salt okunur."],
    ["Soyad", "soyad", "soyad", "Metin", "100", "Evet", "Kaya", "Salt okunur."],
    ["Cinsiyet", "cinsiyet", "cinsiyet", "Karakter", "1", "Evet", "K", "Yalnizca E veya K."],
    ["Egitim-ogretim yili", "egitimOgretimYili", "egitim_ogretim_yili", "Metin", "9", "Evet", "2025-2026", "YYYY-YYYY bicimi."],
  ]),
  ...ortak("e-Devlet", "MEZUN / PAYDAS / MENTOR")([
    ["Kimlik numarasi", "authProviderId", "auth_provider_id", "Metin", "64", "Evet", "edevlet-c72f04...", "Opak eslesme kimligi. TCKN KULLANILMAMALI."],
    ["Ad", "ad", "ad", "Metin", "100", "Evet", "Ali", "Salt okunur."],
    ["Soyad", "soyad", "soyad", "Metin", "100", "Evet", "Ozturk", "Salt okunur."],
    ["Cinsiyet", "cinsiyet", "cinsiyet", "Karakter", "1", "Evet", "E", "Yalnizca E veya K."],
    ["Il kodu (adres ili)", "ilKodu", "il_kodu", "Karakter", "2", "Evet", "34", "il tablosuna yabanci anahtar."],
    ["Egitim-ogretim yili", "egitimOgretimYili", "egitim_ogretim_yili", "Metin", "9", "Evet", "2025-2026", "YYYY-YYYY bicimi."],
  ]),
];

/* Personel ve dis kullanicida gonderilmeyecek alanlar acikca belirtilir. */
const GONDERILMEYEN = [
  ["MEBBIS", "PERSONEL (YEGITEK)", "Okul kodu / Il / Ilce / Sinif / Brans", "Proje yoneticisi bir okula bagli degildir; bos gonderilir."],
  ["e-Devlet", "MEZUN / PAYDAS / MENTOR", "Okul kodu / Ilce / Sinif / Brans", "Bu kullanicilarin kurumu yoktur; bos gonderilir."],
  ["EBA / e-Okul", "OGRENCI", "Brans", "Yalnizca ogretmende doludur."],
  ["MEBBIS", "OGRETMEN", "Sinif", "Yalnizca ogrencide doludur."],
  ["TUMU", "TUMU", "Dogum tarihi", "ISTENMEYECEK. Semada sutun yoktur: 18 yas alti gozetimi yasa degil ROLE baglidir. Veri minimizasyonu geregi."],
  ["TUMU", "TUMU", "Okul turu", "ISTENMEYECEK. Kullanici kaydinda degil kurum tablosunda durur; okul koduyla okunur (bkz. referans veri CSV)."],
];

/* ------------------------------------------------------------------ */
/* 2. Referans veri (SSO degil, ayri kanal)                            */
/* ------------------------------------------------------------------ */

const REFERANS = [
  ["il", "il_kodu", "Karakter", "2", "Evet", "06", "Birincil anahtar. 81 kayit."],
  ["il", "ad", "Metin", "100", "Evet", "Ankara", ""],
  ["ilce", "ilce_kodu", "Karakter", "4", "Evet", "0601", "Birincil anahtar."],
  ["ilce", "il_kodu", "Karakter", "2", "Evet", "06", "il tablosuna yabanci anahtar."],
  ["ilce", "ad", "Metin", "100", "Evet", "Cankaya", ""],
  ["kurum", "kurum_kodu", "Tam sayi", "", "Evet", "750123", "Birincil anahtar. SSO'dan gelen okul kodu burada BULUNMALIDIR."],
  ["kurum", "ad", "Metin", "250", "Evet", "Ankara Fen Lisesi", ""],
  ["kurum", "il_kodu", "Karakter", "2", "Evet", "06", "il tablosuna yabanci anahtar."],
  ["kurum", "ilce_kodu", "Karakter", "4", "Evet", "0601", "ilce tablosuna yabanci anahtar."],
  ["kurum", "okul_turu", "Metin", "120", "Evet", "Fen Lisesi", "OKUL TURU BURADAN GELIR. Ogrenci/ogretmen listesi suzgeci, CSV ciktilari, profil ekranlari ve yonetim panosu bu alani kullanir."],
  ["kurum", "aktif", "Evet/Hayir", "", "Evet", "Evet", "Kapanan okul pasife alinir, silinmez."],
];

/* ------------------------------------------------------------------ */
/* 3. Senkronun yazmayacagi alanlar                                    */
/* ------------------------------------------------------------------ */

const YAZILMAYACAK = [
  ["Iletisim", "eposta", "Kisinin kendi girdigi e-posta adresi."],
  ["Iletisim", "telefon", "Kisinin kendi girdigi telefon."],
  ["Profil", "foto_depolama_yolu", "Kisinin yukledigi profil fotografi."],
  ["Profil", "foto_mime_tipi", "Fotografin dosya turu."],
  ["Profil", "hakkinda", "Kisinin kendi yazdigi tanitim metni."],
  ["Mesleki baglanti", "github_url", "Kisinin kendi girdigi adres."],
  ["Mesleki baglanti", "linkedin_url", "Kisinin kendi girdigi adres."],
  ["Mesleki baglanti", "kisisel_site_url", "Kisinin kendi girdigi adres."],
  ["Ozgecmis", "cv_dosya_adi", "Kisinin yukledigi CV."],
  ["Ozgecmis", "cv_depolama_yolu", "Kisinin yukledigi CV."],
  ["Ozgecmis", "cv_mime_tipi", "Kisinin yukledigi CV."],
  ["Ozgecmis", "cv_boyut_bayt", "Kisinin yukledigi CV."],
  ["Ogretmen isareti", "danisman_olmak_istiyor", "Ogretmen kendisi isaretler."],
  ["Ogretmen isareti", "yegitek_okul_sorumlusu", "Ogretmen kendisi isaretler."],
  ["Kisisel gelisim", "kullanici_kazanim", "Kazanim beyanlari; yalnizca sahibi ekler/siler."],
  ["Kisisel gelisim", "kullanici_hedefi", "Rotam hedefleri; yalnizca sahibi gorur."],
  ["Kisisel gelisim", "envanter_uygulamasi", "Algoritmam envanteri; yalnizca sahibi gorur."],
];

/* ------------------------------------------------------------------ */

mkdirSync(cikti, { recursive: true });

const dosyalar = [
  [
    "sso-kimlik-alanlari.csv",
    belge(KIMLIK_BASLIK, KIMLIK_SATIRLARI),
    `${KIMLIK_SATIRLARI.length} alan`,
  ],
  [
    "sso-gonderilmeyecek-alanlar.csv",
    belge(
      ["Kaynak", "Kullanici Tipi", "Alan", "Gerekce"],
      GONDERILMEYEN,
    ),
    `${GONDERILMEYEN.length} kural`,
  ],
  [
    "sso-referans-veri.csv",
    belge(
      ["Tablo", "Sutun", "Tip", "Uzunluk", "Zorunlu", "Ornek", "Aciklama"],
      REFERANS,
    ),
    `${REFERANS.length} sutun`,
  ],
  [
    "sso-senkronun-yazmayacagi-alanlar.csv",
    belge(["Alan Grubu", "Sutun", "Gerekce"], YAZILMAYACAK),
    `${YAZILMAYACAK.length} sutun`,
  ],
];

for (const [ad, icerik, ozet] of dosyalar) {
  writeFileSync(join(cikti, ad), icerik, "utf8");
  console.log(`kurulum/${ad.padEnd(38)} ${ozet}`);
}

console.log(`\n${dosyalar.length} CSV üretildi → kurulum/`);
