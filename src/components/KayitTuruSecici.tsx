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
  /**
   * Seçili tür bu gruba ait değilse null — o zaman hiçbir düğme işaretli
   * gelmez. Açılır listedeki "Seçiniz" yer tutucusunun karşılığı: şeritte
   * seçilemeyen bir seçenek göstermek yerine hiçbiri işaretlenmiyor.
   */
  seciliTip: KazanimTipi | null;
}) {
  const yonlendirici = useRouter();

  return (
    /*
      DÜĞME ŞERİDİ, AÇILIR LİSTE DEĞİL (22 Ağustos 2026 · istek: "Deneyimlerim'de
      kayıt türü açılan listesini etkinliklerdeki katılım biçimi gibi kutucuk
      şeklinde yap"). Açılır liste, seçenekleri açılmadan göstermiyordu: kişi
      hangi türlerin girilebildiğini görmek için listeyi açmak zorundaydı.
      Şerit dördünü birden yazıyor ve seçili olan işaretli duruyor —
      etkinlikler ekranındaki "Katılım biçimi" süzgeciyle aynı desen.

      "HEPSİ" SEÇENEĞİ YOK: orada şerit bir SÜZGEÇ ve "hepsi" süzgeci
      kaldırmanın karşılığı. Burada seçim, basılacak FORMU belirliyor ve "hepsi"
      diye bir form yok — dört türün alanları birbirinden farklı.

      `radio`, `checkbox` DEĞİL: aynı anda tek tür girilebilir. Görünüm
      istekteki kutucuklarla aynı, davranışı ise seçimin gerçeğine uyuyor.
    */
    <form
      method="get"
      action={KAYIT_YOLU}
      className="flex flex-wrap items-center gap-2"
    >
      {/*
        JavaScript kapalıyken de bölüm açık dönsün: GET formu yalnızca `tur`
        gönderseydi kutu kapanır, seçilen tür görünmezdi.
      */}
      <input type="hidden" name="bolum" value={capa} />
      {secenekler.map((secenek) => (
        <label
          key={secenek.tip}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-cizgi px-3.5 py-1.5 text-sm font-medium text-metin transition hover:border-vurgu has-checked:border-vurgu has-checked:bg-vurgu-zemin has-checked:text-vurgu-metin"
        >
          <input
            type="radio"
            name="tur"
            value={secenek.tip}
            aria-label={`${etiket} — ${secenek.baslik}`}
            defaultChecked={seciliTip === secenek.tip}
            onChange={() =>
              yonlendirici.push(
                `${KAYIT_YOLU}?bolum=${capa}&tur=${secenek.tip}#${capa}`,
              )
            }
            className="h-3.5 w-3.5 accent-[var(--renk-birincil)]"
          />
          {secenek.baslik}
        </label>
      ))}
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
