import React from "react";
import type { BelgeMetni } from "@/lib/belge/kurallar";

interface BelgeKagidiProps {
  belge: BelgeMetni;
  imzaAdSoyad: string;
  imzaBirim: string;
  siraNo?: number;
  toplamSayfa?: number;
}

/**
 * Tekil veya toplu üretilen belgelerin görsel yerleşimini üreten saf sunucu bileşeni.
 * "use client" kullanılmaz. Hem tekil belge sayfasında hem toplu belge sayfasında
 * aynı bileşen kullanılarak tasarımın ve basım kurallarının birebir aynı olması garanti edilir.
 */
export function BelgeKagidi({
  belge,
  imzaAdSoyad,
  imzaBirim,
  siraNo,
  toplamSayfa,
}: BelgeKagidiProps): React.ReactElement {
  return (
    <div className="belge">
      {siraNo !== undefined && toplamSayfa !== undefined && (
        <div className="belge-sira-etiketi">
          {siraNo} / {toplamSayfa}
        </div>
      )}
      <div className="belge-alan">
        <div className="belge-govde">
          <p className="belge-baslik">{belge.baslik}</p>
          <p className="belge-ad">{belge.adSoyad}</p>
          <p className="belge-metin">{belge.govde}</p>
        </div>
        {/*
          TARİH BURADA DEĞİL (26 Ağustos 2026 · istek: "sol altta da tarih var,
          tarihi oradan kaldıralım"). Tek başına duran tarih neyin tarihi
          olduğunu söylemiyordu; artık gövde cümlesinin içinde "… tarihinde
          gerçekleştirilen" olarak geçiyor. Alt satırda yalnız imza kaldı.
        */}
        <div className="belge-alt">
          <div className="belge-imza">
            <div className="belge-imza-cizgi">{imzaAdSoyad}</div>
            <div className="belge-birim">{imzaBirim}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
