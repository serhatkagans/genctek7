import { Star } from "lucide-react";
import { Rozet } from "@/components/ui";
import { YOLCULUK_SEVIYELERI } from "@/lib/yolculuk/kurallar";
import type { SeviyeDagilimi } from "@/lib/yolculuk/ogrencilerim";

/**
 * GENÇTEK YOLCULUĞUNUN AŞAMA ŞERİDİ — yedi seviye ve kişinin durduğu basamak.
 *
 * AYRI BİLEŞEN (22 Ağustos 2026 · istek: "panelde GençTek Yolculuğum'un altına
 * … 'Buradasın' bunu da ekleyelim"). Şerit yalnızca yolculuk ekranındaydı;
 * panele de gerekince kopyalanacaktı ve aynı işaretleme iki dosyada ayrı ayrı
 * yaşayacaktı — seviye eklendiğinde ya da renkler değiştiğinde biri geride
 * kalırdı.
 *
 * EŞİK SAYISI YERİNE YILDIZ (28 Ağustos 2026 · istek: "puanları
 * göstermiyoruz … puan demeyelim"). Basamakların altında "8 puan ve üzeri"
 * yazıyordu; bu, yolculuğun tamamını bir sayı cetveline çeviren tek satırdı.
 * Yerine o basamağın yıldızı geldi — kişi hangi basamakta kaç yıldıza
 * ulaştığını görüyor, oraya kaç puanla girildiğini değil.
 *
 * ŞERİTTE YILDIZ DİZİSİ YOK, TEK SİMGE VE SAYI VAR: yedi kartın her birine o
 * basamağın yıldızlarını dizmek yirmi sekiz yıldız eder ve kartları birbirinden
 * ayırt etmesi gereken şey okunmaz hâle gelir. Dizi, kişinin KENDİ seviyesinin
 * gösterildiği iki yerde duruyor (yolculuk kartı ve panel özeti); burada
 * basamağın kaç yıldıza karşılık geldiğini söylemek yetiyor.
 *
 * İKİ KİP, TEK ŞERİT (28 Ağustos 2026 · istek: "kaç öğrencisi Hello World
 * aşamasında onu yazdırıyoruz"):
 *   · `seviyeKodu` → kişinin kendi yolculuğu; durduğu basamak "Buradasın" ile
 *     işaretli, sonrası soluk.
 *   · `dagilim`   → öğretmenin ekranı; her basamakta kaç öğrenci olduğu ve
 *     basamağın öğretmene göre yazılmış açıklaması. Burada "buradasın" yok,
 *     çünkü şeritte duran öğretmen değil öğrencileri; soluk olanlar da
 *     ulaşılmamış basamaklar değil ÖĞRENCİSİ OLMAYAN basamaklar.
 *
 * Şerit ikiye BÖLÜNMEDİ: basamakların sırası, adı ve görünümü tek yerde
 * kalsın diye. İki bileşen olsaydı seviye eklendiğinde biri geride kalırdı —
 * bu dosyanın var oluş sebebi zaten o.
 *
 * SEVİYE KODU DIŞARIDAN GELİYOR, hesap içeride yapılmıyor: kişinin seviyesi
 * `lib/yolculuk` hesabından doğuyor ve bileşenin işi onu çizmek. İki yerde iki
 * ayrı formül, kartın "Üretimde" derken şeridin "Harekette"yi işaretlemesi
 * demek olurdu.
 */
export function YolculukSeridi({
  seviyeKodu,
  dagilim,
}: {
  seviyeKodu?: string;
  dagilim?: SeviyeDagilimi[];
}) {
  const seviyeSirasi = YOLCULUK_SEVIYELERI.findIndex(
    (seviye) => seviye.kod === seviyeKodu,
  );
  const ogrenciSayisi = (kod: string): number =>
    dagilim?.find((satir) => satir.seviye.kod === kod)?.ogrenciSayisi ?? 0;

  return (
    /*
      Yatay kaydırma ŞERİDİN KENDİ KUTUSUNDA: yedi aşama dar ekranda sığmıyor
      ve sayfanın tamamının yana kaymasına izin verilmiyor.
    */
    <ol className="flex gap-3 overflow-x-auto pb-1">
      {YOLCULUK_SEVIYELERI.map((seviye, sira) => {
        const sayi = ogrenciSayisi(seviye.kod);
        // Öğretmen kipinde "ulaşıldı", öğrencisi olan basamak demektir.
        const ulasildi = dagilim ? sayi > 0 : sira <= seviyeSirasi;
        const suAn = dagilim ? false : sira === seviyeSirasi;
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
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-metin-yumusak">
              <Star size={13} aria-hidden className="fill-current text-vurgu-metin" />
              {sira + 1} yıldız
            </p>
            <p className="mt-2 text-sm text-metin-yumusak">
              {dagilim ? seviye.ogretmenAciklamasi : seviye.aciklama}
            </p>
            {suAn && (
              <span className="mt-3 inline-block">
                <Rozet cesit="vurgu">Buradasın</Rozet>
              </span>
            )}
            {/*
              SIFIR DA YAZILIR: "0 öğrenci" boş bir basamağı gösteriyor ve
              öğretmenin bakması gereken yer çoğu zaman orası. Satır
              gizlenseydi kart, sayısı olmayanla sayısı yazılmayan arasında
              fark bırakmazdı.
            */}
            {dagilim && (
              <p className="mt-3 font-baslik text-lg font-extrabold text-baslik">
                {sayi} öğrenci
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
