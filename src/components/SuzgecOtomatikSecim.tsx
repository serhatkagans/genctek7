"use client";

/**
 * KENDİLİĞİNDEN SÜZEN SÜZGEÇ DENETİMLERİ (31 Ağustos 2026 · istekler: "önce
 * ili seçiyorum ilçe seçilemiyor … süz ile çalışıyormuş dinamik olamaz mı" ·
 * "süz kalksın burada da" · "buradan da süz kalksın dinamik olsun").
 *
 * ===========================================================================
 * SORUN NEYDİ
 * ===========================================================================
 * İlçe, okul ve okul türü listeleri İLDEN TÜRÜYOR ve sunucuda hazırlanıyor:
 * il seçilmeden ilçe listesi boştur, boş açılır liste de "seçenek yok" değil
 * "bozuk" gibi okunduğu için kutu kapalı geliyor. Kullanıcı ili seçiyor, ilçe
 * kutusu hâlâ kapalı duruyor ve arada "Süz"e basılması gerektiği hiçbir yerde
 * yazmıyordu. Ekran çalışıyordu ama bozuk görünüyordu.
 *
 * ===========================================================================
 * ÇÖZÜM: YALNIZCA BAĞIMLI LİSTESİ OLAN KUTU KENDİLİĞİNDEN GÖNDERİR
 * ===========================================================================
 * Bu bileşen `onChange`de bağlı olduğu formu gönderiyor, yani il seçilince
 * sayfa tazeleniyor ve ilçe/okul kutuları dolu ve açık geliyor.
 *
 * ÖNCE YALNIZCA İL KUTUSU BÖYLEYDİ, SONRA HEPSİ OLDU: ilk turda "bir kutu
 * BAŞKA bir kutunun seçeneklerini belirliyorsa kendiliğinden gönderir" kuralı
 * kondu, çünkü her süzgecin gönderim yapması "üç kutuyu arka arkaya değiştiren
 * kişiyi üç kez bekletir" diye düşünülmüştü. Kullanıcı üç ekranda da aynı şeyi
 * istedi: düğme kalksın, süzgeç kendiliğinden çalışsın. Bekleme kaygısı
 * gerçek ama küçük — liste zaten 50 satır ve sunucuda süzülüyor; düğmeyi
 * aramak, bir sayfa tazelenmesinden daha pahalıydı.
 *
 * ===========================================================================
 * METİN KUTUSU HER TUŞTA GÖNDERMİYOR
 * ===========================================================================
 * Açılır liste için "değişince gönder" tek anlamlı an. Metin kutusunda öyle
 * değil: React'in `onChange`i her tuş vuruşunda çalışıyor ve "Ankara" yazan
 * kişi altı kez sayfa tazelerdi. Metin kutusu bu yüzden İKİ anda gönderiyor —
 * Enter'a basınca ve kutudan çıkınca (yalnızca değer gerçekten değiştiyse).
 *
 * ===========================================================================
 * JAVASCRIPT KAPALIYKEN
 * ===========================================================================
 * Formda görünmeyen bir gönder düğmesi duruyor (bkz. SutunSuzgeci.tsx ·
 * SutunSuzgecDugmesi): tarayıcının "Enter ile gönder" davranışı bir gönder
 * düğmesinin varlığına bağlı ve o düğme olmadan metin kutusundan Enter'la
 * süzmek de çalışmazdı. Yani JS kapalıyken metin süzgeçleri Enter ile
 * çalışmaya devam ediyor; açılır listeler çalışmıyor — düğmenin görünür hâli
 * istek üzerine kaldırıldı.
 */

const SINIF_HUCRE =
  "w-full min-w-28 rounded-kart border border-cizgi bg-kart px-2 py-1 text-sm font-normal text-metin";

export function OtomatikSecimKutusu({
  form,
  ad,
  deger,
  bosEtiket,
  secenekler,
  etiket,
  devreDisi = false,
  sinif = SINIF_HUCRE,
}: {
  /**
   * Bağlanılacak formun `id`si. Kutu FORMUN İÇİNDE duruyorsa verilmez —
   * `currentTarget.form` onu zaten buluyor. Sütun süzgeçleri formun dışında
   * durduğu için orada zorunlu (bkz. SutunSuzgeci.tsx).
   */
  form?: string;
  ad: string;
  deger: string | null | undefined;
  bosEtiket: string;
  secenekler: readonly { deger: string; etiket: string }[];
  etiket?: string;
  devreDisi?: boolean;
  /** Kart içindeki süzgeçler panelin `SINIF_SECIM` sınıfını kullanıyor. */
  sinif?: string;
}) {
  return (
    <select
      form={form}
      name={ad}
      defaultValue={deger ?? ""}
      disabled={devreDisi}
      aria-label={`${etiket ?? bosEtiket} süzgeci`}
      className={sinif}
      onChange={(olay) => {
        /*
          FORM `form` ÖZNİTELİĞİYLE BULUNUYOR: kutu tablonun içinde, formun
          DIŞINDA duruyor (gerekçesi SutunSuzgeci.tsx başlığında) ve
          `olay.currentTarget.form` tam da bu bağı çözüyor.

          `requestSubmit` KULLANILIYOR, `submit` DEĞİL: ikincisi formun kendi
          doğrulamasını ve gönderim olaylarını atlar. Burada doğrulanacak bir
          alan yok ama atlamayı alışkanlık hâline getirmek, aynı formda ileride
          zorunlu bir alan olduğunda sessizce bozardı.

          SAYFA NUMARASI TAŞINMIYOR: form yalnızca kendi alanlarını gönderiyor
          ve süzgeç değişince ilk sayfaya dönmek doğru davranış — üçüncü
          sayfadayken ili değiştiren kişi, yeni listenin üçüncü sayfasında
          bulmayı beklemez.
        */
        olay.currentTarget.form?.requestSubmit();
      }}
    >
      <option value="">{bosEtiket}</option>
      {secenekler.map((secenek) => (
        <option key={secenek.deger} value={secenek.deger}>
          {secenek.etiket}
        </option>
      ))}
    </select>
  );
}

/**
 * Enter'da ve odaktan çıkışta süzen metin kutusu.
 *
 * DEĞER DEĞİŞMEDİYSE GÖNDERMİYOR: kutuya tıklayıp hiçbir şey yazmadan çıkan
 * kişi (listeyi okurken çok olağan) sayfayı boş yere tazeletmemeli.
 */
export function OtomatikMetinKutusu({
  form,
  ad,
  deger,
  ipucu,
  sinif = SINIF_HUCRE,
}: {
  form?: string;
  ad: string;
  deger: string | null | undefined;
  ipucu?: string;
  sinif?: string;
}) {
  const ilkDeger = deger ?? "";

  return (
    <input
      type="text"
      form={form}
      name={ad}
      defaultValue={ilkDeger}
      placeholder={ipucu}
      aria-label={`${ipucu ?? ad} süzgeci`}
      className={sinif}
      onKeyDown={(olay) => {
        if (olay.key !== "Enter") return;
        /*
          ENTER'IN KENDİ GÖNDERİMİ ENGELLENİYOR ve yerine `requestSubmit`
          çağrılıyor: tarayıcının örtük gönderimi formdaki İLK gönder
          düğmesine bağlı ve o düğme (görünmez olsa da) formun sonunda; iki
          yolu birden açık bırakmak, bazı tarayıcılarda çift gönderim demekti.
        */
        olay.preventDefault();
        olay.currentTarget.form?.requestSubmit();
      }}
      onBlur={(olay) => {
        if (olay.currentTarget.value === ilkDeger) return;
        olay.currentTarget.form?.requestSubmit();
      }}
    />
  );
}
