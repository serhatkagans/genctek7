"use client";

import { useRouter } from "next/navigation";
import type { KazanimTipi } from "@/generated/prisma/enums";

/**
 * Çok tipli kayıt grubunun (bugün yalnızca "Deneyimlerim") tür seçimi.
 *
 * 10 AĞUSTOS 2026 · istek: "Deneyimlerim: GençTek dışı etkinlikler /
 * Derecelerim / Sertifikalarım / Diğer etkinlikler — bunu 4 ayrı seçenek
 * olmasın, formda aşağı açılan listeden seçsin."
 *
 * NİYE ADRES DEĞİŞİYOR: form alanları tipe göre farklı (derece yalnızca
 * yarışmada var, katılım biçimi sertifikada yok) ve sayfanın geri kalanında
 * JavaScript yok — seçilen tür sunucuda basılmak zorunda. Yani liste yalnızca
 * bir görünüm değişikliği değil, dört sekmenin yaptığı işi yapıyor: türü
 * adrese yazıp formu yeniden bastırıyor.
 *
 * JAVASCRIPT KAPALIYSA çalışmaya devam eder: seçim kendiliğinden gitmez ama
 * <noscript> içindeki düğme görünür ve form GET ile aynı adrese gider. Tek
 * fazladan tıklamayla aynı sonuç — bileşen istemci tarafına bağımlı değil.
 */

/**
 * Kayıt ekranının adresi; seçim buraya `?tur=` ile döner.
 *
 * 21 Ağustos 2026'da Panel'in içindeki katlanır bölümden kendi sayfasına
 * taşındı (istek: "kayıtlarım ismi bilişim yolculuğum olsun … kendi sayfaları
 * olsun"). Çapaya artık gerek yok: sayfa tek işi yapıyor ve form en üstte.
 */
const KAYIT_YOLU = "/panel/bilisim-yolculugum";

export function KayitTuruSecici({
  etiket,
  secenekler,
  seciliTip,
}: {
  /** Ekran okuyucu için: "Deneyimlerim" gibi grup adı. */
  etiket: string;
  secenekler: { tip: KazanimTipi; baslik: string }[];
  /** Seçili tür bu gruba ait değilse null — liste yer tutucuda kalır. */
  seciliTip: KazanimTipi | null;
}) {
  const yonlendirici = useRouter();

  return (
    <form method="get" className="inline-flex items-center gap-2">
      <select
        name="tur"
        aria-label={`${etiket} — kayıt türü`}
        defaultValue={seciliTip ?? ""}
        onChange={(olay) =>
          yonlendirici.push(`${KAYIT_YOLU}?tur=${olay.target.value}`)
        }
        className="rounded-full border border-cizgi bg-kart px-3 py-1.5 text-sm font-medium text-metin outline-none focus:border-vurgu"
      >
        {/*
          Yer tutucu YALNIZCA başka bir grubun türü seçiliyken görünür ve
          seçilemez: liste, açık olmayan bir türü açıkmış gibi göstermemeli.
        */}
        {seciliTip === null && (
          <option value="" disabled>
            Seçiniz
          </option>
        )}
        {secenekler.map((secenek) => (
          <option key={secenek.tip} value={secenek.tip}>
            {secenek.baslik}
          </option>
        ))}
      </select>
      <noscript>
        <button
          type="submit"
          className="rounded-full border border-cizgi px-3 py-1.5 text-sm font-medium text-metin"
        >
          Göster
        </button>
      </noscript>
    </form>
  );
}
