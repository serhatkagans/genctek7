import { CalendarCheck, CalendarDays, CircleCheck, Lock } from "lucide-react";
import {
  BilgiKutusu,
  IlerlemeCubugu,
  Kart,
  KartBasligi,
  KirintiYolu,
  Rozet,
  SayfaBasligi,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import {
  DURUM_ETIKETI,
  DURUM_ROZETI,
  DURUM_SIRASI,
  durumSayilari,
  gunYaz,
  ilerlemeYuzdesi,
  tarihAraligiYaz,
  YOL_HARITASI,
  type YolHaritasiMaddesi,
} from "@/lib/proje/yol-haritasi";
import { projeYoneticisiMi } from "@/lib/yetki/izinler";

export const dynamic = "force-dynamic";

/**
 * PROJE İLERLEME DURUMU (3 Eylül 2026 · istekler: "proje yöneticisi yönetim
 * paneline proje-ilerleme kartı ekleyip … neler yapılmış tarih tarih" ·
 * "resimler klasöründe 1.png var, o ekran daha iyi gibi yapı olarak ona
 * benzer").
 *
 * ---------------------------------------------------------------------------
 * NİYE VAR
 * ---------------------------------------------------------------------------
 * Projede ne yapıldığının tarih tarih kaydı yalnızca git geçmişindeydi ve
 * proje yöneticisinin oraya erişimi yok. Ayrı bir CHANGELOG dosyası da
 * yazılabilirdi ama iki eksiği olurdu: depoda durur (yine erişim gerekir) ve
 * yalnızca commit'i anlatır — bir işin SUNUCUDA çalışıp çalışmadığını
 * söylemez. Bu ekranın taşıdığı asıl bilgi o ayrım: "yapıldı" ile "yayında"
 * aynı şey değil.
 *
 * ---------------------------------------------------------------------------
 * DÜZEN 1.png'DEN
 * ---------------------------------------------------------------------------
 * Üç kural örnekten alındı ve üçü de okumayı kolaylaştırdığı için alındı:
 *
 *   · YÜZDE ŞERİDİN BAŞLIĞIYLA AYNI SATIRDA, çubuk tam genişlikte altında.
 *     Yüzde ile çubuk yan yana konsaydı çubuk yarım kalır ve şeridin dolduğu
 *     yer göz kararıyla okunamazdı.
 *   · BEŞ SAYAÇ ÇERÇEVESİZ TEK SIRA: büyük sayı üstte, rozet altında.
 *     Kutulanmış hâlleri kartın içinde ikinci bir kart gibi duruyordu.
 *   · SIRA NUMARASI DAİRE İÇİNDE, madde metninin dışında kendi sütununda.
 *     Başlıkla aynı hizada düz sayı olarak basıldığında numara başlığın bir
 *     parçası gibi okunuyor ("32 Sunucudaki kişisel veri…").
 *
 * ---------------------------------------------------------------------------
 * YALNIZCA MERKEZ
 * ---------------------------------------------------------------------------
 * `projeYoneticisiMi` — il koordinatörü de yönetim panosunu görüyor ama bu
 * liste yayına alınmamış çalışmaları, sunucu ayarlarını ve açık güvenlik
 * maddelerini içeriyor. `yonetimPanosuGorebilirMi` ile açılsaydı ekran seksen
 * bir ilin koordinatörüne de açılırdı.
 *
 * KİŞİSEL VERİ YOK, bu yüzden `erisimLogla` çağrılmıyor: listede kayıt değil
 * projenin kendi durumu var (bkz. lib/yetki/log.ts — kayıt görüntüleme
 * loglanır, ekran açılışı değil).
 */
export default async function ProjeIlerlemeSayfasi() {
  const kullanici = await oturumKullanicisiZorunlu();

  if (!projeYoneticisiMi(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="Proje İlerleme Durumu"
          aciklama="Bu ekrana erişim yetkiniz yok."
        />
      </Kart>
    );
  }

  const yuzde = ilerlemeYuzdesi(YOL_HARITASI);
  const sayilar = durumSayilari(YOL_HARITASI);

  return (
    <div className="space-y-5">
      <KirintiYolu
        basamaklar={[
          { etiket: "Yönetim Paneli", yol: "/panel/yonetim" },
          { etiket: "Proje ilerleme durumu" },
        ]}
      />

      {/*
        ALT SATIR TEK CÜMLE. Buraya ekranın ne işe yaradığını anlatan bir
        paragraf konabilirdi ama listenin kendisi zaten onu anlatıyor; başlığın
        altındaki satırın işi listenin BOYUNU söylemek.
      */}
      <SayfaBasligi
        geri={null}
        baslik="Proje İlerleme Durumu"
        aciklama={`GençTek yol haritası — ${YOL_HARITASI.length} madde`}
      />

      {/*
        PAYLAŞIM UYARISI. Liste yayına alınmamış çalışmaları, sunucu ayarlarını
        ve henüz kapatılmamış maddeleri içeriyor; ekran görüntüsü olarak dışarı
        çıktığında kurum dışına açık bir yol haritası olur.

        `bilgi` ÇEŞİDİ, `uyari` DEĞİL: sarı kutu bir arıza ya da süresi işleyen
        bir iş anlatıyor (bkz. yönetim panosundaki KVKK kuyruğu). Buradaki not
        kalıcı bir kullanım kuralı — her açılışta sarı yanan bir uyarı, birkaç
        gün içinde okunmaz hale gelirdi.
      */}
      <BilgiKutusu cesit="bilgi">
        <span className="flex items-start gap-2.5">
          <Lock size={14} aria-hidden className="mt-0.5 shrink-0" />
          <span>
            Bu ekran <strong>yalnızca Yönetim Paneli&apos;ne açıktır</strong> —
            proje yöneticisi dışındaki kullanıcılar erişemez. Sayfa, yayına
            alınmamış çalışmaları da içerdiği için dışarıya paylaşılmamalıdır.
          </span>
        </span>
      </BilgiKutusu>

      {/*
        GENEL İLERLEME KARTI 1.png'DEN AYRILIYOR (3 Eylül 2026 · istek:
        "bizdeki genel ilerleme güzel ama").

        Örnekte yüzde başlık satırının sağ ucunda küçük punto duruyor ve beş
        sayaç çerçevesiz. Buradaki düzen ikisini de büyütüyor: yüzde ekranın
        ilk okunan şeyi, sayaçlar da panelin ölçüm kutularıyla aynı çerçeveyi
        taşıyor. Madde kartlarının yapısı örnekten alındı, bu kart alınmadı.
      */}
      <Kart>
        <KartBasligi baslik="Genel ilerleme" />

        {/*
          YÜZDE ÖNCE, ÇUBUK SONRA. Çubuk tek başına yaklaşık bir izlenim
          veriyor; sayı olmadan "%84 mü %90 mı" ayırt edilmiyor.
        */}
        <div className="flex flex-wrap items-end gap-6">
          <p className="font-baslik text-5xl leading-none font-extrabold text-baslik">
            %{yuzde}
          </p>
          <div className="min-w-[220px] flex-1">
            <IlerlemeCubugu
              deger={yuzde}
              toplam={100}
              etiket="Ağırlıklı ilerleme"
            />
            <p className="mt-2 text-xs text-metin-yumusak">
              Her madde bulunduğu aşamaya göre puanlanır: planlandı %0,
              tasarımda %25, geliştiriliyor %50, testte %75, yayında %100.
            </p>
          </div>
        </div>

        {/*
          DURUM ŞERİDİ BEŞ SAYACI HER ZAMAN BASAR (bkz. lib/proje/
          yol-haritasi.ts · durumSayilari): boş aşamalar atlansaydı sayaçların
          yeri maddeler ilerledikçe kayar, "en sağdaki yayında" alışkanlığı
          bozulurdu.
        */}
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {DURUM_SIRASI.map((durum) => (
            <div
              key={durum}
              className="rounded-kutu border border-cizgi bg-zemin px-3 py-3"
            >
              <dd className="font-baslik text-2xl font-extrabold text-baslik">
                {sayilar[durum]}
              </dd>
              <dt className="mt-1">
                <Rozet cesit={DURUM_ROZETI[durum]}>{DURUM_ETIKETI[durum]}</Rozet>
              </dt>
            </div>
          ))}
        </dl>
      </Kart>

      {/*
        MADDELER TEK TEK KART. Tablo denenebilirdi ama her maddenin altında üç
        ilâ beş satırlık kapsam listesi var; tabloda o liste tek bir hücreye
        sıkışır ve satır yüksekliği maddeden maddeye üç katına çıkar.
      */}
      <ol className="space-y-4">
        {YOL_HARITASI.map((madde) => (
          <li key={madde.sira}>
            <MaddeKarti madde={madde} />
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Tek bir yol haritası maddesi.
 *
 * Numara sütunu SABİT GENİŞLİKTE ve içerik ona hizalı: özet, tarihler ve
 * kapsam listesi başlığın altından başlar, dairenin altından değil. Girinti
 * olmasaydı iki basamaklı numaraya geçildiğinde (10. maddeden sonra) metin
 * sütunu bir karakter sağa kayar ve kartlar birbirinden farklı hizalanırdı.
 */
function MaddeKarti({ madde }: { madde: YolHaritasiMaddesi }) {
  const yayinda = madde.durum === "YAYINDA";

  return (
    <Kart>
      <div className="flex gap-3">
        <span
          aria-hidden
          className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-cizgi-guclu bg-zemin text-xs font-bold text-metin-yumusak"
        >
          {madde.sira}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <h2 className="text-base font-bold text-baslik">{madde.baslik}</h2>
            <Rozet cesit={DURUM_ROZETI[madde.durum]}>
              {DURUM_ETIKETI[madde.durum]}
            </Rozet>
          </div>

          <p className="mt-1.5 max-w-[75ch] text-sm text-metin-yumusak">
            {madde.ozet}
          </p>

          {/*
            İKİ TARİH AYRI BASILIYOR: çalışılan gün ile sunucuya çıkılan gün
            aynı değil ve bu ekranın var olma sebebi tam olarak o fark. Tek
            tarih basılsaydı "2 Eylül'de yapıldı" satırı, işin hâlâ sunucuda
            olmadığını gizlerdi.
          */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs font-semibold text-metin-yumusak">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={13} aria-hidden />
              Çalışma: {tarihAraligiYaz(madde)}
            </span>
            {madde.yayinTarihi && (
              <span className="inline-flex items-center gap-1.5 text-olumlu-metin">
                <CalendarCheck size={13} aria-hidden />
                Yayın: {gunYaz(madde.yayinTarihi)}
              </span>
            )}
          </div>

          {/*
            MADDE İŞARETİ DURUMA GÖRE (1.png'deki ayrım): yayındaki maddede
            yeşil tik, öbürlerinde nötr nokta. Rozet zaten durumu söylüyor ama
            kartın gövdesi göz taramasında rozetten önce okunuyor — tik, "bu
            satırlar artık çalışıyor" bilgisini listenin kendisine taşıyor.
          */}
          <ul className="mt-3.5 space-y-1.5">
            {madde.maddeler.map((satir) => (
              <li key={satir} className="flex gap-2.5 text-sm text-metin">
                {yayinda ? (
                  <CircleCheck
                    size={15}
                    aria-hidden
                    className="mt-0.5 shrink-0 text-olumlu-metin"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="mt-[7px] size-1.5 shrink-0 rounded-full bg-cizgi-guclu"
                  />
                )}
                {satir}
              </li>
            ))}
          </ul>

          {madde.not && (
            <BilgiKutusu cesit={yayinda ? "bilgi" : "uyari"} className="mt-4">
              {madde.not}
            </BilgiKutusu>
          )}
        </div>
      </div>
    </Kart>
  );
}
