"use client";

import {
  CalendarDays,
  ClipboardList,
  Handshake,
  LayoutGrid,
  MessagesSquare,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Menüde kullanılabilecek ikonlar.
 *
 * BİLEŞEN DEĞİL AD TAŞINIR: menüyü kuran `app/panel/layout.tsx` bir sunucu
 * bileşeni, burası ise istemci bileşeni. React, sunucudan istemciye prop
 * olarak FONKSİYON geçirilmesine izin vermez ("Functions cannot be passed
 * directly to Client Components") — ikon bileşenini doğrudan geçirmek panelin
 * tamamını 500'e düşürüyordu. Sınır üzerinden dizgi geçip bileşene burada
 * çevirmek, ikon listesini de tek yerde toplu tutar.
 */
const IKONLAR = {
  CalendarDays,
  ClipboardList,
  Handshake,
  LayoutGrid,
  MessagesSquare,
  ShieldCheck,
  Store,
  UserRound,
} as const;

export type IkonAdi = keyof typeof IKONLAR;

export type GezinmeBaglantisi = {
  yol: string;
  etiket: string;
  /**
   * Kenar çubuğundaki başlık. Verilmezse bağlantı "Genel" grubuna düşer;
   * böylece grup bilgisi olmayan eski çağrılar da çalışmaya devam eder.
   */
  grup?: string;
  /** `IKONLAR` anahtarı. Verilmezse satır ikonsuz basılır. */
  ikon?: IkonAdi;
};

function aktifMi(yol: string, baglanti: GezinmeBaglantisi) {
  // "/panel" her yolun ön eki olduğu için tam eşleşme ister; diğerleri alt
  // sayfalarında da seçili kalmalı (etkinlik detayındayken Etkinlikler gibi).
  return baglanti.yol === "/panel"
    ? yol === "/panel"
    : yol.startsWith(baglanti.yol);
}

/**
 * Panelin gezinmesi.
 *
 * 18 AĞUSTOS 2026'DA YATAY SEKME ŞERİDİNDEN SOL KENAR ÇUBUĞUNA GEÇTİ (istek:
 * tasarımın yarışma portalı prototipine benzetilmesi).
 *
 * Sebep yalnızca görünüm değil: sekme sayısı role göre 6 ile 10 arasında
 * değişiyor ve koordinatör/merkez rollerinde yatay şerit ikinci satıra
 * taşıyordu — taşan satırda hangi sekmenin seçili olduğu kayboluyor, menü de
 * büyümeye yer bırakmıyordu. Dikey liste hem gruplanabiliyor hem sınırsız
 * uzayabiliyor.
 *
 * MOBİLDE KENAR ÇUBUĞU YOK: 1024 pikselin altında liste, yatay kaydırılan bir
 * rozet şeridine dönüyor. Dar ekranda sabit bir kenar çubuğu içerik alanının
 * yarısını yerdi; açılır çekmece ise JavaScript ve odak tuzağı gerektirirdi —
 * sayfanın geri kalanı sunucuda basılıyor, gezinme için istemci mantığı
 * eklemek bu ekranda karşılığı olmayan bir maliyet.
 */
export function PanelGezinme({
  baglantilar,
}: {
  baglantilar: GezinmeBaglantisi[];
}) {
  const yol = usePathname();

  // Gruplar ilk görüldükleri sırayı korur: menünün sırası layout.tsx'te
  // bilinçli olarak kurulmuş (Profil önce, Yönetim Paneli Panel'in ardında) ve
  // alfabetik sıralamak o kararı bozardı.
  const gruplar: { ad: string; ogeler: GezinmeBaglantisi[] }[] = [];
  for (const baglanti of baglantilar) {
    const ad = baglanti.grup ?? "Genel";
    const mevcut = gruplar.find((grup) => grup.ad === ad);
    if (mevcut) {
      mevcut.ogeler.push(baglanti);
    } else {
      gruplar.push({ ad, ogeler: [baglanti] });
    }
  }

  return (
    <nav aria-label="Panel gezinmesi">
      {/* --- Geniş ekran: gruplu dikey liste --- */}
      <ul className="hidden lg:block">
        {gruplar.map((grup) => (
          <li key={grup.ad} className="mb-5">
            <p className="mb-1.5 px-3 text-[11px] font-bold tracking-widest text-metin-yumusak uppercase">
              {grup.ad}
            </p>
            <ul className="space-y-0.5">
              {grup.ogeler.map((baglanti) => {
                const secili = aktifMi(yol, baglanti);
                const Ikon = baglanti.ikon ? IKONLAR[baglanti.ikon] : null;
                return (
                  <li key={baglanti.yol}>
                    <Link
                      href={baglanti.yol}
                      aria-current={secili ? "page" : undefined}
                      className={`flex items-center gap-2.5 rounded-kutu px-3 py-2 text-sm font-medium transition ${
                        secili
                          ? "bg-ust-bar-secili-zemin text-ust-bar-secili-metin"
                          : "text-metin-yumusak hover:bg-zemin hover:text-metin"
                      }`}
                    >
                      {Ikon && <Ikon size={16} className="shrink-0" />}
                      {baglanti.etiket}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>

      {/*
        --- Dar ekran: yatay kaydırılan şerit ---
        Grup başlıkları burada basılmıyor: dar ekranda başlıklar şeridin
        yarısını yer ve zaten hepsi tek sırada görünüyor.
      */}
      <ul className="flex gap-1.5 overflow-x-auto pb-1 lg:hidden">
        {baglantilar.map((baglanti) => {
          const secili = aktifMi(yol, baglanti);
          const Ikon = baglanti.ikon ? IKONLAR[baglanti.ikon] : null;
          return (
            <li key={baglanti.yol} className="shrink-0">
              <Link
                href={baglanti.yol}
                aria-current={secili ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition ${
                  secili
                    ? "bg-ust-bar-secili-zemin text-ust-bar-secili-metin"
                    : "bg-kart text-metin-yumusak"
                }`}
              >
                {Ikon && <Ikon size={15} />}
                {baglanti.etiket}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
