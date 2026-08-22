import { Rozet } from "@/components/ui";
import { YOLCULUK_SEVIYELERI } from "@/lib/yolculuk/kurallar";

/**
 * GENÇTEK YOLCULUĞUNUN AŞAMA ŞERİDİ — yedi seviye ve kişinin durduğu basamak.
 *
 * AYRI BİLEŞEN (22 Ağustos 2026 · istek: "panelde GençTek Yolculuğum'un altına
 * … 'Buradasın' bunu da ekleyelim"). Şerit yalnızca yolculuk ekranındaydı;
 * panele de gerekince kopyalanacaktı ve aynı işaretleme iki dosyada ayrı ayrı
 * yaşayacaktı — seviye eklendiğinde ya da renkler değiştiğinde biri geride
 * kalırdı.
 *
 * SEVİYE KODU DIŞARIDAN GELİYOR, hesap içeride yapılmıyor: kişinin seviyesi
 * `lib/yolculuk` hesabından doğuyor ve bileşenin işi onu çizmek. İki yerde iki
 * ayrı formül, kartın "Üretimde" derken şeridin "Harekette"yi işaretlemesi
 * demek olurdu.
 */
export function YolculukSeridi({ seviyeKodu }: { seviyeKodu: string }) {
  const seviyeSirasi = YOLCULUK_SEVIYELERI.findIndex(
    (seviye) => seviye.kod === seviyeKodu,
  );

  return (
    /*
      Yatay kaydırma ŞERİDİN KENDİ KUTUSUNDA: yedi aşama dar ekranda sığmıyor
      ve sayfanın tamamının yana kaymasına izin verilmiyor.
    */
    <ol className="flex gap-3 overflow-x-auto pb-1">
      {YOLCULUK_SEVIYELERI.map((seviye, sira) => {
        const ulasildi = sira <= seviyeSirasi;
        const suAn = sira === seviyeSirasi;
        return (
          <li
            key={seviye.kod}
            aria-current={suAn ? "step" : undefined}
            className={`min-w-52 flex-1 rounded-kart border p-4 transition ${
              suAn
                ? "border-vurgu bg-vurgu-zemin"
                : ulasildi
                  ? "border-cizgi bg-kart"
                  : "border-cizgi bg-zemin opacity-60"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  ulasildi
                    ? "bg-birincil text-birincil-metin"
                    : "bg-kart text-metin-yumusak"
                }`}
              >
                {sira + 1}
              </span>
              <p className="font-semibold text-baslik">{seviye.ad}</p>
            </div>
            <p className="mt-1 text-xs font-medium text-metin-yumusak">
              {seviye.esik} puan ve üzeri
            </p>
            <p className="mt-2 text-sm text-metin-yumusak">
              {seviye.aciklama}
            </p>
            {suAn && (
              <span className="mt-3 inline-block">
                <Rozet cesit="vurgu">Buradasın</Rozet>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
