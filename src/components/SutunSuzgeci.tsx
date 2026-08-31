import React from "react";
import {
  OtomatikMetinKutusu,
  OtomatikSecimKutusu,
} from "@/components/SuzgecOtomatikSecim";

/**
 * SÜTUN SÜZGEÇLERİ — tablo başlığının altındaki filtre satırı (31 Ağustos
 * 2026 · istekler: "alt taraftaki İl / İlçe / Okul / Tür / Kurum kodu alanları
 * filtreli olsun" · aynı istek Öğretmenler, Öğrenciler ve Paydaşlar için de).
 *
 * ===========================================================================
 * NİYE `form` ÖZNİTELİĞİ — süzgeçler formun DIŞINDA duruyor
 * ===========================================================================
 * Ekranlardaki "Filtreler" kartı bir `<form method="get">` ve sayfanın bütün
 * sorgu dizesini o gönderiyor. Sütun süzgeçleri ise tablonun içinde, yani o
 * formun dışında duruyor. HTML'in `form="<id>"` özniteliği bir denetimi
 * uzaktaki bir forma bağlıyor: girdi tabloda duruyor ama gönderildiğinde
 * kartın formuyla birlikte gidiyor.
 *
 * ALTERNATİFLER NİYE OLMADI:
 *   · Tabloyu forma sarmak — süzgeçlerin bir kısmının sütunu yok (öğrenci
 *     ekranındaki rol, mentörlük, danışmanlık…) ve onlar kartta kalmak
 *     zorunda. İki ayrı form olsaydı sütundan süzen kişinin karttaki
 *     süzgeçleri sıfırlanırdı.
 *   · İstemci tarafında JS ile süzmek — liste SAYFALI ve sunucuda süzülüyor;
 *     istemci yalnızca o sayfadaki 50 satırı süzebilir ve "0 sonuç" derken
 *     aslında sonraki sayfada eşleşen kayıt olurdu.
 *
 * ===========================================================================
 * BİR ALAN YA KARTTA YA SÜTUNDA — ASLA İKİSİNDE BİRDEN
 * ===========================================================================
 * Aynı `name` iki denetimde de bulunursa form ikisini de gönderir ve sunucu
 * `tekil()` ile ilkini alır: kişi sütundaki kutuya yazar, kartta kalan boş
 * kutu kazanır ve süzgeç "çalışmıyor" görünür. Sütuna taşınan her alan
 * karttan SİLİNİYOR; kartta yalnızca sütunu olmayanlar kalıyor.
 *
 * ===========================================================================
 * SÜZGEÇLER KENDİLİĞİNDEN ÇALIŞIYOR, DÜĞME YOK
 * ===========================================================================
 * (31 Ağustos 2026 · istekler: "süz kalksın burada da" · "buradan da süz
 * kalksın dinamik olsun".)
 *
 * İlk sürümde satırın sonunda görünür bir "Süz" düğmesi vardı ve gerekçesi
 * şuydu: "seçim değiştikçe sayfa yenilenen bir tablo, üç süzgeci arka arkaya
 * değiştiren kişiyi üç kez bekletir". Uygulamada tersi çıktı — kullanıcı önce
 * ilçe kutusunun neden açılmadığını sordu (il gönderilmeden dolamıyordu),
 * sonra üç ekranda da düğmenin kalkmasını istedi.
 *
 * Denetimler artık istemci bileşeni (bkz. components/SuzgecOtomatikSecim.tsx):
 * açılır liste değişince, metin kutusu Enter'da ve odaktan çıkarken (yalnızca
 * değer değiştiyse) formu gönderiyor. Düğme silinmedi, GÖRÜNMEZ oldu —
 * tarayıcının Enter ile gönderme davranışı bir gönder düğmesinin varlığına
 * bağlı ve JavaScript kapalıyken tek çalışan yol o.
 */

/** Süzgeç satırının kendisi; hücreleri `children` olarak alır. */
export function SutunSuzgecSatiri({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <tr className="border-b border-cizgi bg-kart align-top">{children}</tr>
  );
}

/*
 * Hücre içi denetimlerin ortak sınıfı. Panelin `SINIF_GIRDI`sinden AYRI ve
 * daha dar: o sınıf `mt-1` ile bir etiketin altında durmak için yazılmış ve
 * satır yüksekliği tablo başlığını iki katına çıkarıyordu. Buradaki denetimin
 * etiketi sütun başlığının kendisi.
 */
const SINIF_HUCRE =
  "w-full min-w-28 rounded-kart border border-cizgi bg-kart px-2 py-1 text-sm font-normal text-metin";

/** Süzgeci olmayan sütunun boş hücresi. */
export function SutunSuzgecBoslugu({
  className = "px-4 py-2",
}: {
  className?: string;
}): React.ReactElement {
  return <th className={className} />;
}

/**
 * Bir hücreye BİRDEN ÇOK denetim koymak için kapsayıcı.
 *
 * Gerekçesi tek bir sütun: Öğretmenler ve Öğrenciler ekranlarında "İl / İlçe"
 * TEK sütun ama İKİ süzgeç istiyor. Sütunu ikiye bölmek tablodaki hizayı
 * bozardı; iki kutuyu alt alta koymak, başlığın söylediği şeyi karşılıyor.
 */
export function SutunSuzgecHucresi({
  children,
  className = "px-4 py-2",
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <th className={className}>
      <div className="flex flex-col gap-1">{children}</div>
    </th>
  );
}

/**
 * `<th>` sarmalayıcısı olmayan metin kutusu — hücreyi çağıran kuruyor.
 *
 * KENDİLİĞİNDEN SÜZÜYOR (31 Ağustos 2026 · istek: "süz kalksın … dinamik
 * olsun"): Enter'da ve kutudan çıkarken, yalnızca değer değiştiyse gönderiyor.
 * Her tuşta göndermemesinin gerekçesi SuzgecOtomatikSecim.tsx içinde.
 */
export function SuzgecMetinKutusu({
  form,
  ad,
  deger,
  ipucu,
}: {
  form: string;
  ad: string;
  deger: string | null | undefined;
  ipucu?: string;
}): React.ReactElement {
  return (
    <OtomatikMetinKutusu form={form} ad={ad} deger={deger} ipucu={ipucu} />
  );
}

/** `<th>` sarmalayıcısı olmayan açılır liste. */
export function SuzgecSecimKutusu({
  form,
  ad,
  deger,
  bosEtiket,
  secenekler,
  etiket,
  devreDisi = false,
}: {
  form: string;
  ad: string;
  deger: string | null | undefined;
  bosEtiket: string;
  secenekler: readonly { deger: string; etiket: string }[];
  etiket?: string;
  devreDisi?: boolean;
}): React.ReactElement {
  /*
   * SEÇİLİR SEÇİLMEZ SÜZÜYOR (31 Ağustos 2026 · istekler: "süz kalksın burada
   * da" · "buradan da süz kalksın dinamik olsun").
   *
   * Aynı gün içinde önce yalnızca İL kutusundaydı (`kendindenSuz`
   * bayrağıyla), çünkü asıl kırık olan oydu: ilçe/okul listeleri ilden türüyor
   * ve il gönderilmeden o kutular kapalı kalıyordu. Bayrak KALDIRILDI, kural
   * hepsine yayıldı — iki tür süzgeç kutusunun biri kendiliğinden çalışıp
   * öbürü düğme beklediğinde, hangisinin ne zaman uygulandığı okunmuyordu.
   */
  return (
    <OtomatikSecimKutusu
      form={form}
      ad={ad}
      deger={deger}
      bosEtiket={bosEtiket}
      etiket={etiket}
      secenekler={secenekler}
      devreDisi={devreDisi}
    />
  );
}

export function SutunMetinSuzgeci({
  form,
  ad,
  deger,
  ipucu,
  className = "px-4 py-2",
}: {
  /** Bağlanılacak formun `id`si. */
  form: string;
  /** Sorgu parametresinin adı. */
  ad: string;
  deger: string | null | undefined;
  /** Kutunun içindeki soluk örnek metin. */
  ipucu?: string;
  className?: string;
}): React.ReactElement {
  /*
    `aria-label` ÇIPLAK KUTUDA VERİLİYOR: görsel olarak etiketi sütun başlığı
    ama ekran okuyucu için kutu, başlıkla ilişkilendirilmiş değil — `<th>`
    içindeki metin, aynı `<th>` içindeki girdinin etiketi sayılmıyor.
  */
  return (
    <th className={className}>
      <SuzgecMetinKutusu form={form} ad={ad} deger={deger} ipucu={ipucu} />
    </th>
  );
}

export function SutunSecimSuzgeci({
  form,
  ad,
  deger,
  bosEtiket,
  secenekler,
  etiket,
  devreDisi = false,
  className = "px-4 py-2",
}: {
  form: string;
  ad: string;
  deger: string | null | undefined;
  /** Boş değerin karşılığı ("Tüm iller"). */
  bosEtiket: string;
  secenekler: readonly { deger: string; etiket: string }[];
  /** Ekran okuyucu etiketi; verilmezse `bosEtiket` kullanılır. */
  etiket?: string;
  /**
   * Seçenek yokken kapalı gelir (ilçe listesi il seçilmeden boştur). Kapalı
   * bir kutu, boş bir listeden daha dürüst: "burada seçecek bir şey yok"
   * diyor.
   */
  devreDisi?: boolean;
  className?: string;
}): React.ReactElement {
  return (
    <th className={className}>
      <SuzgecSecimKutusu
        form={form}
        ad={ad}
        deger={deger}
        bosEtiket={bosEtiket}
        etiket={etiket}
        secenekler={secenekler}
        devreDisi={devreDisi}
      />
    </th>
  );
}

/**
 * SATIRIN GÖRÜNMEYEN GÖNDER DÜĞMESİ (31 Ağustos 2026 · istekler: "süz kalksın
 * burada da" · "buradan da süz kalksın dinamik olsun").
 *
 * GÖRÜNEN "Süz" DÜĞMESİ KALKTI: süzgeçlerin hepsi kendiliğinden gönderiyor
 * (açılır liste değişince, metin kutusu Enter'da ve odaktan çıkışta), yani
 * düğmenin yapacağı iş kalmamıştı — durduğu yerde "acaba buna basmam mı
 * gerekiyor" sorusunu doğuruyordu.
 *
 * DÜĞMENİN KENDİSİ SİLİNMEDİ, GÖRÜNMEZ OLDU ve bu bilinçli:
 *
 *   · Tarayıcının "metin kutusunda Enter'a basınca formu gönder" davranışı,
 *     formda BİR GÖNDER DÜĞMESİ bulunmasına bağlı. Düğme tamamen silinseydi
 *     JavaScript kapalı bir tarayıcıda süzgeçlerin tamamı çalışmaz hâle
 *     gelirdi; şimdi metin süzgeçleri Enter ile çalışmaya devam ediyor.
 *   · Klavyeyle gezen ve ekran okuyucu kullanan kişi için de bir "süz"
 *     komutu kalmış oluyor.
 *
 * `sr-only` sınıfı: görsel olarak gizli ama erişilebilirlik ağacında ve
 * form mantığında duruyor (`display:none` olsaydı ikisinden de düşerdi).
 */
export function SutunSuzgecDugmesi({
  form,
  colSpan = 1,
  className = "p-0",
}: {
  form: string;
  colSpan?: number;
  className?: string;
}): React.ReactElement {
  return (
    <th className={className} colSpan={colSpan}>
      <button type="submit" form={form} className="sr-only">
        Süz
      </button>
    </th>
  );
}
