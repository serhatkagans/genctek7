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
 * Kayıt formlarının yaşadığı ekran; seçim buraya `?tur=` ile döner.
 *
 * PANELE GERİ DÖNDÜ (22 Ağustos 2026 · istek: "diğerlerini direk panele alt
 * alta alıyoruz açılır şekilde"). Kendi sayfası 21 Ağustos'ta açılmıştı; artık
 * bölümler panelin altında katlanır kutular.
 *
 * ÇAPA ŞART: bölüm kapalı bir `<details>` ve adres yalnızca `?tur=` taşısaydı
 * kişi, az önce seçtiği türü görmek için sayfanın tepesinden aşağı inip
 * bölümü yeniden açmak zorunda kalırdı. `bolum` çapadan AYRI gönderiliyor —
 * `#capa` inişi yapıyor, `?bolum=` kutuyu açık basıyor.
 */
const KAYIT_YOLU = "/panel";

export function KayitTuruSecici({
  etiket,
  capa,
  secenekler,
  seciliTip,
}: {
  /** Ekran okuyucu için: "Deneyimlerim" gibi grup adı. */
  etiket: string;
  /** Bölümün paneldeki çapası; seçim buraya geri döner. */
  capa: string;
  secenekler: { tip: KazanimTipi; baslik: string }[];
  /** Seçili tür bu gruba ait değilse null — liste yer tutucuda kalır. */
  seciliTip: KazanimTipi | null;
}) {
  const yonlendirici = useRouter();

  return (
    <form
      method="get"
      action={KAYIT_YOLU}
      className="inline-flex items-center gap-2"
    >
      {/*
        JavaScript kapalıyken de bölüm açık dönsün: GET formu yalnızca `tur`
        gönderseydi kutu kapanır, seçilen tür görünmezdi.
      */}
      <input type="hidden" name="bolum" value={capa} />
      <select
        name="tur"
        aria-label={`${etiket} — kayıt türü`}
        defaultValue={seciliTip ?? ""}
        onChange={(olay) =>
          yonlendirici.push(
            `${KAYIT_YOLU}?bolum=${capa}&tur=${olay.target.value}#${capa}`,
          )
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
