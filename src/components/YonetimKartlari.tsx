import {
  CalendarDays,
  ChevronRight,
  CircleAlert,
  GraduationCap,
  Map as Harita,
  MapPin,
  School,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";

/**
 * Yönetim panosunun kart parçaları.
 *
 * Pano tek bir düzen kullanır: il, ilçe ve okul kırılımlarının üçü de aynı
 * kartla basılır, alt menüler de kart olarak durur. Üç ayrı ekranda üç ayrı
 * kart yazılsaydı sayıların yeri ve adı basamaktan basamağa kayardı; oysa
 * kullanıcı hep aynı üç sayıyı arıyor.
 */

/**
 * Kart içindeki tek bir satır: solda ne olduğu, sağda sayısı.
 *
 * Üç sayı YAN YANA DURMUYOR. Öyleydi ve okunmuyordu: kart üç sütuna
 * bölündüğünde "Danışman öğretmen" etiketi iki satıra kırılıyor, altındaki
 * sayı komşularından aşağı kayıyor ve kart bir tablo değil dağınık bir sayı
 * yığını gibi görünüyordu. Alt alta üç satırda etiket kırılsa da hizalar
 * bozulmuyor.
 */
function OlcumSatiri({
  deger,
  etiket,
  Ikon,
}: {
  deger: number;
  etiket: string;
  Ikon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="flex items-center gap-2">
      <Ikon size={14} className="shrink-0 text-vurgu-metin" aria-hidden />
      <dt className="flex-1 text-sm text-metin-yumusak">{etiket}</dt>
      <dd className="font-baslik text-lg font-extrabold text-baslik">{deger}</dd>
    </div>
  );
}

/**
 * Toplam şeridindeki sayı — geniş alanda alt alta okunur.
 *
 * ALT SATIR SAYIYI NİTELER, ikinci bir ölçüm değildir: "1.204 okul" başlı
 * başına bir iş çıkarmaz, "312'sinde danışman öğretmen yok" çıkarır. Ayrı bir ölçüm
 * kutusu olsaydı şerit ikiye katlanır ve hangi sayının hangisinin içinde olduğu
 * kaybolurdu.
 */
function Olcum({
  deger,
  etiket,
  Ikon,
  alt,
  altYol,
  uyari = false,
}: {
  deger: number;
  etiket: string;
  Ikon: React.ComponentType<{ size?: number; className?: string }>;
  alt?: string;
  /** Verilirse alt satır, boşluğun doldurulacağı ekrana bağlanır. */
  altYol?: string;
  /** Alt satır bir eksiği söylüyorsa uyarı rengine geçer. */
  uyari?: boolean;
}) {
  const altSinif = uyari ? "text-uyari-metin" : "text-metin-yumusak";

  return (
    <div>
      <dt className="flex items-center gap-1 text-xs text-metin-yumusak">
        <Ikon size={13} className="shrink-0 text-vurgu-metin" aria-hidden />
        {etiket}
      </dt>
      <dd className="mt-1 font-baslik text-2xl font-extrabold text-baslik">
        {deger}
      </dd>
      {alt &&
        (altYol ? (
          <dd className={`mt-0.5 text-xs ${altSinif}`}>
            <Link href={altYol} className="underline underline-offset-2">
              {alt}
            </Link>
          </dd>
        ) : (
          <dd className={`mt-0.5 text-xs ${altSinif}`}>{alt}</dd>
        ))}
    </div>
  );
}

/**
 * Bir birimin (il / ilçe / okul) kartı.
 *
 * `okulSayisi` verilmezse okul sütunu basılmaz: okul kartında "kaç okul"
 * sorusunun karşılığı yoktur, kartın kendisi zaten bir okuldur.
 */
export function BirimKarti({
  ad,
  altBilgi,
  okulSayisi,
  ogretmenSayisi,
  danismanOgretmenSayisi,
  ogrenciSayisi,
  faaliyetSayisi,
  uyarilar,
  yol,
  baglantilar,
}: {
  ad: string;
  /** İkinci satır: okul türü, görevdeki danışman, ilçe sayısı gibi. */
  altBilgi?: string;
  okulSayisi?: number;
  ogretmenSayisi: number;
  danismanOgretmenSayisi: number;
  ogrenciSayisi: number;
  /** Yalnızca il kartında: bu eğitim-öğretim yılının etkinlikleri. */
  faaliyetSayisi?: number;
  /** Kartın altındaki eksik listesi (bkz. yonetim-kurallari · birimUyarilari). */
  uyarilar?: readonly string[];
  /** Verilirse kart kırılımın bir alt basamağına iner. */
  yol?: string;
  /**
   * Kartın altındaki ayrı bağlantılar — kırılımın SON basamağı için.
   *
   * `yol` ile birlikte KULLANILMAZ: kartın tamamı bağlantıyken içine ikinci bir
   * bağlantı koymak geçersiz HTML olurdu. Okul kartında kartın kendisi bir yere
   * gitmez, çünkü okulun altında bir basamak yok; oradan çıkan iki yol var
   * (öğrenci listesi, öğretmen listesi) ve ikisi de aynı ağırlıkta.
   */
  baglantilar?: readonly { etiket: string; yol: string }[];
}) {
  const icerik = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-baslik">{ad}</p>
          {altBilgi && (
            <p className="mt-0.5 truncate text-sm text-metin-yumusak">
              {altBilgi}
            </p>
          )}
        </div>
        {yol && (
          <ChevronRight
            size={18}
            className="mt-0.5 shrink-0 text-metin-yumusak"
            aria-hidden
          />
        )}
      </div>
      <dl className="mt-4 space-y-1.5">
        {okulSayisi !== undefined && (
          <OlcumSatiri deger={okulSayisi} etiket="Okul" Ikon={School} />
        )}
        {/*
          ÖĞRETMEN, DANIŞMANIN ÜSTÜNDE: ikincisi birincisinin alt kümesidir
          (görev almış öğretmen). Alt küme üstte olsaydı iki sayının ilişkisi
          okunmaz, "300 öğretmenin 80'i danışman" yerine iki bağımsız sayı
          gibi görünürdü.
        */}
        <OlcumSatiri
          deger={ogretmenSayisi}
          etiket="Öğretmen"
          Ikon={Users}
        />
        <OlcumSatiri
          deger={danismanOgretmenSayisi}
          etiket="Danışman öğretmen"
          Ikon={UserCog}
        />
        <OlcumSatiri
          deger={ogrenciSayisi}
          etiket="Öğrenci"
          Ikon={GraduationCap}
        />
        {faaliyetSayisi !== undefined && (
          <OlcumSatiri
            deger={faaliyetSayisi}
            etiket="Etkinlik"
            Ikon={CalendarDays}
          />
        )}
      </dl>
      {/*
        UYARILAR ÖLÇÜMLERİN ALTINDA VE AYRI: yukarısı "burada ne var", burası
        "burada ne eksik". İkisi aynı listede olsaydı eksikler sayıların
        arasında kaybolur, kart da hangisinin haber hangisinin iş olduğunu
        söylemezdi.
      */}
      {uyarilar && uyarilar.length > 0 && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-uyari-metin">
          <CircleAlert size={13} className="mt-0.5 shrink-0" aria-hidden />
          <span>{uyarilar.join(" · ")}</span>
        </p>
      )}
      {baglantilar && baglantilar.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-t border-cizgi pt-3 text-sm">
          {baglantilar.map((baglanti) => (
            <Link
              key={baglanti.yol}
              href={baglanti.yol}
              className="font-medium text-vurgu-metin underline underline-offset-2"
            >
              {baglanti.etiket}
            </Link>
          ))}
        </div>
      )}
    </>
  );

  const sinif = "rounded-kart border border-cizgi bg-kart p-5 shadow-kart";

  return yol ? (
    <Link href={yol} className={`${sinif} block transition hover:border-vurgu`}>
      {icerik}
    </Link>
  ) : (
    <div className={sinif}>{icerik}</div>
  );
}

/**
 * Panoya taşınan menülerin kartı (Öğrenciler, Öğretmenler, Paydaşlar, Görev
 * Rolleri).
 *
 * Üst menüden kalkan sekmeler burada alt menü olarak duruyor: sekme sayısı
 * azalırken ekranların girişi kaybolmasın diye. Birim kartıyla aynı çerçeveyi
 * paylaşır ama sayı basmaz — ölçüm kartı gibi görünseydi başlığındaki sayının
 * ne olduğu sorulurdu.
 */
export function KisayolKarti({
  baslik,
  aciklama,
  Ikon,
  yol,
}: {
  baslik: string;
  aciklama: string;
  Ikon: React.ComponentType<{ size?: number; className?: string }>;
  yol: string;
}) {
  return (
    <Link
      href={yol}
      className="flex items-start gap-3 rounded-kart border border-cizgi bg-kart p-5 shadow-kart transition hover:border-vurgu hover:shadow-yuksek"
    >
      <Ikon size={20} className="mt-0.5 shrink-0 text-vurgu-metin" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-baslik">{baslik}</p>
        <p className="mt-0.5 text-sm text-metin-yumusak">{aciklama}</p>
      </div>
      <ChevronRight
        size={18}
        className="mt-0.5 shrink-0 text-metin-yumusak"
        aria-hidden
      />
    </Link>
  );
}

/**
 * Kart listesinin üstündeki toplam şeridi.
 *
 * Sayılar kartlardan toplanır (bkz. lib/rapor/yonetim-kurallari.ts ·
 * ozetToplami); ayrı sorgulansaydı şeritteki toplam kartların toplamını
 * tutmayabilirdi.
 *
 * İL VE İLÇE ÖLÇÜMLERİ BASAMAĞA GÖRE VERİLİR, hepsi her ekranda basılmaz:
 * ilçenin okul listesinde "toplam ilçe" diye bir sayı yoktur, il koordinatörünün
 * panosunda da "toplam il" sorusunun karşılığı yok — ili zaten kendisi.
 */
export function ToplamSeridi({
  il,
  ilce,
  okul,
  ogretmen,
  danismanOgretmen,
  ogrenci,
  faaliyet,
  koordinatorsuzIl = 0,
  danismansizOkul = 0,
  danismansizOgrenci = 0,
  raporsuzFaaliyet = 0,
  okulEtiketi = "okul",
}: {
  /** Yalnızca merkezin il kırılımında. */
  il?: number;
  /** Okul listesinde verilmez. */
  ilce?: number;
  okul: number;
  ogretmen: number;
  danismanOgretmen: number;
  ogrenci: number;
  /** Yalnızca il kırılımında — faaliyetin ilçesi boş olabilir. */
  faaliyet?: number;
  koordinatorsuzIl?: number;
  danismansizOkul?: number;
  danismansizOgrenci?: number;
  raporsuzFaaliyet?: number;
  okulEtiketi?: string;
}) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {il !== undefined && (
        <Olcum
          deger={il}
          etiket="Toplam il"
          Ikon={MapPin}
          /*
           * Merkezin bu ekranda aradığı ilk boşluk: koordinatörü olmayan il.
           * Sayı, atamanın yapıldığı ekrana bağlanıyor — uyarıyı görüp nereye
           * gideceğini aramak zorunda kalmasın.
           */
          alt={
            koordinatorsuzIl > 0
              ? `${koordinatorsuzIl} ilde koordinatör yok`
              : "Her ilde koordinatör var"
          }
          altYol={koordinatorsuzIl > 0 ? "/panel/rol-envanteri" : undefined}
          uyari={koordinatorsuzIl > 0}
        />
      )}
      {ilce !== undefined && (
        <Olcum deger={ilce} etiket="Toplam ilçe" Ikon={Harita} />
      )}
      <Olcum
        deger={okul}
        etiket={`Toplam ${okulEtiketi}`}
        Ikon={School}
        // Okulu olmayan birimde "her okulda danışman öğretmen var" demek boş bir
        // övgü olurdu; alt satır yalnızca sayılacak okul varken çıkar.
        alt={
          okul === 0
            ? undefined
            : danismansizOkul > 0
              ? `${danismansizOkul} okulda danışman öğretmen yok`
              : "Her okulda danışman öğretmen var"
        }
        uyari={danismansizOkul > 0}
      />
      <Olcum deger={ogretmen} etiket="Toplam öğretmen" Ikon={Users} />
      <Olcum
        deger={danismanOgretmen}
        etiket="Toplam danışman öğretmen"
        Ikon={UserCog}
      />
      <Olcum
        deger={ogrenci}
        etiket="Toplam öğrenci"
        Ikon={GraduationCap}
        /*
         * Danışmansız öğrenci ÖĞRENCİ SAYISININ ALTINDA duruyor, ayrı bir kutu
         * değil: ikisi aynı kümenin bütünü ve eksiği. Ayrı ölçüm olsaydı
         * "kaç öğrenci var" ile "kaçı takipsiz" iki bağımsız sayı gibi okunurdu.
         */
        alt={
          danismansizOgrenci > 0
            ? `${danismansizOgrenci} öğrencinin danışmanı yok`
            : undefined
        }
        altYol={danismansizOgrenci > 0 ? "/panel/ogrenciler" : undefined}
        uyari={danismansizOgrenci > 0}
      />
      {faaliyet !== undefined && (
        <Olcum
          deger={faaliyet}
          etiket="Bu yılın etkinlikleri"
          Ikon={CalendarDays}
          alt={
            raporsuzFaaliyet > 0
              ? `${raporsuzFaaliyet} etkinliğin raporu eksik`
              : undefined
          }
          altYol={raporsuzFaaliyet > 0 ? "/panel/raporlar" : undefined}
          uyari={raporsuzFaaliyet > 0}
        />
      )}
    </dl>
  );
}

/** Kırılımın neresinde olunduğunu gösteren yol izi. */
export function YolIzi({
  adimlar,
}: {
  adimlar: readonly { etiket: string; yol?: string }[];
}) {
  return (
    <nav aria-label="Yol izi" className="text-sm text-metin-yumusak">
      <ol className="flex flex-wrap items-center gap-1">
        {adimlar.map((adim, sira) => (
          <li key={adim.etiket} className="flex items-center gap-1">
            {sira > 0 && (
              <ChevronRight size={14} className="shrink-0" aria-hidden />
            )}
            {adim.yol ? (
              <Link
                href={adim.yol}
                className="underline underline-offset-2 hover:text-metin"
              >
                {adim.etiket}
              </Link>
            ) : (
              <span className="text-metin">{adim.etiket}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
