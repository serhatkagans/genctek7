import { Compass, Flame, Rocket, Star } from "lucide-react";
import { Kart, KartBasligi, Rozet, SayfaBasligi } from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { ogrenciMi } from "@/lib/yetki/izinler";
import { PUAN_KAYNAKLARI, YOLCULUK_SEVIYELERI } from "@/lib/yolculuk/kurallar";
import { yolculugumuGetir } from "@/lib/yolculuk/veri";

export const dynamic = "force-dynamic";

/**
 * GENÇTEK YOLCULUĞUM — seviye ve puan tek ekranda (21 Ağustos 2026).
 *
 * İstek: "katkı nişanlarımı gençtek yolculuğum yapalım, aşamalar şunlar
 * olacak: 'Hello World' · Keşifte · Harekette · Üretimde · Katkıda · Ufuk Açan
 * · İz Bırakan … bunu ayrı bir sayfa yapalım." Düzen, paylaşılan iki taslak
 * görselden esinlendi: üstte mevcut seviye ve ilerleme, altında seviye şeridi,
 * yanında puanın nereden geldiği ve nasıl kazanıldığı.
 *
 * SEVİYE ŞERİDİ HEP TAM BASILIR: kazanılmamış seviyeler de soluk olarak
 * duruyor. Yalnızca ulaşılanları göstermek, yolun nereye çıktığını gizlerdi —
 * bir merdivenin görünmeyen basamağı kimseyi çıkmaya çağırmaz.
 *
 * NİŞAN BÖLÜMÜ KALDIRILDI (21 Ağustos 2026 · istek: "katkı nişanları kalmış").
 * Sayfa ilk kurulduğunda "Katkı Nişanlarım" kartı da buraya konmuştu; istek
 * nişanları yolculuğun YERİNE koymaktı, yanına değil. İki rozet dizisi alt
 * alta durunca kişi hangisinin ilerlemesini gösterdiğini ayırt edemiyordu.
 *
 * Kartın kendisi (components/OgrenciProfilBolumleri · KatkiNisanlariKarti) ve
 * nişan hesabı SİLİNMEDİ: öğretmen tarafındaki Katkılarım ekranı
 * (app/panel/kazanimlarim) hâlâ aynı bileşenden basılıyor.
 */
export default async function GencTekYolculugumSayfasi() {
  const kullanici = await oturumKullanicisiZorunlu();
  const ogrenci = ogrenciMi(kullanici);

  const yolculuk = await yolculugumuGetir(kullanici);

  const seviyeSirasi = YOLCULUK_SEVIYELERI.findIndex(
    (seviye) => seviye.kod === yolculuk.seviye.kod,
  );

  /*
   * "Nasıl puan kazanırım?" listesi role göre süzülüyor: öğrenciye
   * danışmanlık, öğretmene çalışma grubu seçimi gösterilmiyor — yapamayacağı
   * bir işle puan vaat etmek, listeyi ulaşılmaz gösterir.
   */
  const kaynaklar = PUAN_KAYNAKLARI.filter(
    (kaynak) =>
      kaynak.kimde === "herkes" ||
      (ogrenci ? kaynak.kimde === "ogrenci" : kaynak.kimde === "ogretmen"),
  );

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="GençTek Yolculuğum"
        aciklama={`${yolculuk.toplamPuan} puan · ${yolculuk.seviye.ad}`}
      />

      {/*
        MEVCUT SEVİYE KARTI — sayfanın tek "vitrin"i. Poster bandı ölçüm
        kartlarıyla aynı dili konuşuyor; üstünde çıplak metin değil kendi
        zeminini taşıyan rozetler duruyor (bkz. globals.css · .poster).
      */}
      <div className="overflow-hidden rounded-kart border border-cizgi bg-kart shadow-kart">
        <div className="poster poster-vurgu flex flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div className="flex items-center gap-4">
            <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
              <Rocket size={26} aria-hidden />
            </span>
            <div>
              <p className="text-[11px] font-bold tracking-widest text-white/80 uppercase">
                Şu anki seviyen
              </p>
              <p className="font-baslik text-2xl leading-tight font-extrabold text-white">
                {yolculuk.seviye.ad}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/30 px-3.5 py-1.5 text-sm font-bold text-white">
            <Star size={15} aria-hidden />
            {yolculuk.toplamPuan} puan
          </span>
        </div>

        <div className="p-6">
          <p className="text-metin">{yolculuk.seviye.aciklama}</p>

          {/*
            İLERLEME ÇUBUĞU İKİ EŞİK ARASINI ölçüyor, toplam puanı değil: üst
            seviyelerde toplam üzerinden çizilen çubuk neredeyse hiç
            kıpırdamaz ve ilerlemeyi görünmez kılardı.
          */}
          <div
            className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-zemin"
            role="progressbar"
            aria-valuenow={yolculuk.yuzde}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${yolculuk.seviye.ad} seviyesindeki ilerlemeniz`}
          >
            <div
              className="h-full rounded-full bg-birincil transition-all"
              style={{ width: `${yolculuk.yuzde}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-metin-yumusak">
            {yolculuk.sonraki
              ? `${yolculuk.kalanPuan} puan daha toplayarak "${yolculuk.sonraki.ad}" seviyesine ulaşabilirsin.`
              : "En üst seviyedesin. Buradan sonrası, ardında bıraktığın iz."}
          </p>
        </div>
      </div>

      <Kart>
        <KartBasligi baslik="Yolculuk aşamaları" Ikon={Compass} />
        {/*
          Yatay kaydırma ŞERİDİN KENDİ KUTUSUNDA: yedi aşama dar ekranda
          sığmıyor ve sayfanın tamamının yana kaymasına izin verilmiyor.
        */}
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
      </Kart>

      <div className="grid gap-6 lg:grid-cols-2">
        <Kart>
          <KartBasligi baslik="Puanım nereden geliyor?" Ikon={Star} />
          {yolculuk.dokum.length === 0 ? (
            <p className="text-metin-yumusak">
              Henüz puan getiren bir kaydın yok.
            </p>
          ) : (
            <ul className="divide-y divide-cizgi">
              {yolculuk.dokum.map((satir) => (
                <li
                  key={satir.kod}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-2.5"
                >
                  <span className="text-metin">
                    {satir.etiket}
                    {satir.adet > 1 && (
                      <span className="ml-2 text-sm text-metin-yumusak">
                        × {satir.adet}
                      </span>
                    )}
                  </span>
                  <span className="font-baslik font-bold text-baslik">
                    +{satir.toplam}
                  </span>
                </li>
              ))}
              <li className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                <span className="font-semibold text-baslik">Toplam</span>
                <span className="font-baslik text-lg font-extrabold text-vurgu-metin">
                  {yolculuk.toplamPuan} puan
                </span>
              </li>
            </ul>
          )}
        </Kart>

        <Kart>
          <KartBasligi baslik="Nasıl puan kazanırım?" Ikon={Flame} />
          <ul className="grid gap-2 sm:grid-cols-2">
            {kaynaklar.map((kaynak) => (
              <li
                key={kaynak.kod}
                className="flex items-start justify-between gap-3 rounded-kutu border border-cizgi px-3 py-2"
              >
                <span className="text-sm text-metin">{kaynak.etiket}</span>
                <span className="shrink-0 text-sm font-bold text-vurgu-metin">
                  +{kaynak.puan}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-metin-yumusak">
            Puanlar kayıtlarından kendiliğinden hesaplanır; elle verilmez.
          </p>
        </Kart>
      </div>

    </div>
  );
}
