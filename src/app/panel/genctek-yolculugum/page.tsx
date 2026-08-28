import { BookOpen, Compass, Flame, Rocket, Users } from "lucide-react";
import { Kart, KartBasligi, SayfaBasligi } from "@/components/ui";
import { SeviyeYildizlari } from "@/components/SeviyeYildizlari";
import { YolculukSeridi } from "@/components/YolculukSeridi";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { ogrenciMi } from "@/lib/yetki/izinler";
import {
  PUAN_KAYNAKLARI,
  seviyeAdiTirnakli,
} from "@/lib/yolculuk/kurallar";
import {
  type OgrencilerimYolculugu,
  ogrencilerimYolculuguGetir,
} from "@/lib/yolculuk/ogrencilerim";
import { yolculugumuGetir } from "@/lib/yolculuk/veri";

export const dynamic = "force-dynamic";

/**
 * GENÇTEK YOLCULUĞUM — seviye ve ilerleme tek ekranda (21 Ağustos 2026).
 *
 * İstek: "katkı nişanlarımı gençtek yolculuğum yapalım, aşamalar şunlar
 * olacak: 'Hello World' · Keşifte · Harekette · Üretimde · Katkıda · Ufuk Açan
 * · İz Bırakan … bunu ayrı bir sayfa yapalım." Düzen, paylaşılan iki taslak
 * görselden esinlendi: üstte mevcut seviye ve ilerleme, altında seviye şeridi,
 * yanında yolculuğu neyin ilerlettiği ve nasıl ilerlediği.
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
 *
 * PUAN EKRANDAN KALDIRILDI (28 Ağustos 2026 · istek: "puanları
 * göstermiyoruz, belki bir yıldız iki yıldız üç yıldız … puan demeyelim").
 * Sayfada artık ne "puan" sözcüğü ne de bir toplam var; yerini seviyenin
 * yıldızı aldı. Hesap yerinde duruyor (lib/yolculuk/kurallar.ts) — seviyeyi ve
 * ilerleme çubuğunu hâlâ o üretiyor, yalnızca kişiye gösterilmiyor.
 *
 * "KAÇ PUAN KALDI" DA GİTTİ: ilerlemeyi çubuk anlatıyor, sıradaki basamağı
 * adıyla söylüyoruz. Kalanı sayıyla vermek, kaldırılan sayıyı ikinci bir
 * cümleyle geri getirmek olurdu.
 *
 * ---------------------------------------------------------------------------
 * EKRAN İKİYE AYRILDI (28 Ağustos 2026)
 * ---------------------------------------------------------------------------
 * İstek: "öğretmen tarafında 'GençTek Yolculuğum' yerine 'Öğrencilerimin
 * GençTek Yolculuğu' yazıyoruz … kaç öğrencisi Hello World aşamasında onu
 * yazdırıyoruz".
 *
 * ÖĞRETMENE GÖSTERİLEN KİŞİ DEĞİŞTİ, yalnızca başlık değil: eskiden öğretmen
 * de kendi seviyesini, kendi yıldızını ve kendi defterini görüyordu. Başlığı
 * değiştirip içeriği bırakmak, öğretmenin kendi kaydını öğrencilerininmiş gibi
 * etiketlerdi — ekranın en yanıltıcı hâli bu olurdu.
 *
 * ÖĞRETMENİN KENDİ YILDIZI ARTIK YOK. Bu bir eksilme değil, tercih: bir
 * öğretmenin GençTek'teki karşılığı kendi rozet sayısı değil, öğrencilerinin
 * nereye geldiğidir.
 *
 * DİL DE DEĞİŞTİ: basamak açıklamaları öğretmen ekranında üçüncü şahsa
 * geçiyor ("Öğrencileriniz ekosisteme adım atıyor"), defter satırları ise
 * "…oldular" hâline. Metinler `lib/yolculuk/kurallar.ts` içinde ayrı
 * alanlarda duruyor; şahıs ekini kodda çevirmeye çalışmak Türkçede sağlam
 * yapılamaz.
 */
export default async function GencTekYolculugumSayfasi() {
  const kullanici = await oturumKullanicisiZorunlu();

  if (!ogrenciMi(kullanici)) {
    const ogrencilerim = await ogrencilerimYolculuguGetir(kullanici);
    return <OgretmenGorunumu ogrencilerim={ogrencilerim} />;
  }

  const yolculuk = await yolculugumuGetir(kullanici);
  return <OgrenciGorunumu yolculuk={yolculuk} />;
}

/**
 * ÖĞRETMENİN GÖRÜNÜMÜ — sayılar, kendi seviyesi değil.
 *
 * "Nasıl ilerliyor" listesi burada ÖĞRENCİ kalemlerini gösteriyor (danışmanlık
 * ve etkinlik düzenleme değil): ekranın öznesi öğrenciler olduğu için, onların
 * yolunu ilerleten şeyler yazılıyor.
 */
function OgretmenGorunumu({
  ogrencilerim,
}: {
  ogrencilerim: OgrencilerimYolculugu;
}) {
  const kaynaklar = PUAN_KAYNAKLARI.filter(
    (kaynak) => kaynak.kimde === "herkes" || kaynak.kimde === "ogrenci",
  );

  /*
   * En kalabalık basamak: öğretmenin ilk bakışta aradığı bilgi. Eşitlikte
   * dizide önce gelen kazanıyor, yani ALTTAKİ basamak — yolculuğun sorunu
   * yukarıda değil aşağıda birikmedir.
   */
  const enKalabalik = ogrencilerim.dagilim.reduce((enIyi, satir) =>
    satir.ogrenciSayisi > enIyi.ogrenciSayisi ? satir : enIyi,
  );

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Öğrencilerimin GençTek Yolculuğu"
        aciklama={`${ogrencilerim.ogrenciSayisi} öğrenci`}
      />

      <div className="overflow-hidden rounded-kart border border-cizgi bg-kart shadow-kart">
        <div className="poster poster-vurgu flex flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div className="flex items-center gap-4">
            <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
              <Users size={26} aria-hidden />
            </span>
            <div>
              <p className="text-[11px] font-bold tracking-widest text-white/80 uppercase">
                Yolculuktaki öğrencilerin
              </p>
              <p className="font-baslik text-2xl leading-tight font-extrabold text-white">
                {ogrencilerim.ogrenciSayisi} öğrenci
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-metin">
            {ogrencilerim.ogrenciSayisi === 0
              ? "Kapsamında henüz öğrenci yok; öğrenciler eklendikçe aşamalar burada dolacak."
              : `Öğrencilerinin çoğu ${seviyeAdiTirnakli(
                  enKalabalik.seviye.ad,
                )} aşamasında.`}
          </p>
        </div>
      </div>

      <Kart>
        <KartBasligi baslik="Öğrencilerimin GençTek Yolculuğu" Ikon={Compass} />
        <YolculukSeridi dagilim={ogrencilerim.dagilim} />
      </Kart>

      <div className="grid gap-6 lg:grid-cols-2">
        {/*
          ÖĞRENCİLERİMİN SEYİR DEFTERİ (istek: "o okuldaki öğrencilerin tüm
          sayılarını yazdırabiliyor muyuz? Ekosisteme kayıt oldular x5 …").
          Satırlar kapsamdaki BÜTÜN öğrencilerin toplamı ve sayılar puan değil
          kayıt adedi.
        */}
        <Kart>
          <KartBasligi baslik="Öğrencilerimin Seyir Defteri" Ikon={BookOpen} />
          {ogrencilerim.dokum.length === 0 ? (
            <p className="text-metin-yumusak">
              Öğrencilerinin seyir defterine işlenecek bir kayıt henüz yok.
            </p>
          ) : (
            <ul className="divide-y divide-cizgi">
              {ogrencilerim.dokum.map((satir) => (
                <li
                  key={satir.kod}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-2.5"
                >
                  <span className="text-metin">{satir.etiket}</span>
                  <span className="font-baslik font-bold text-baslik">
                    × {satir.adet}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Kart>

        <Kart>
          <KartBasligi
            baslik="Öğrencilerimin GençTek Yolculuğu nasıl ilerler?"
            Ikon={Flame}
          />
          {/*
            GENİŞ ZAMAN, ÜÇÜNCÜ ÇOĞUL ŞAHIS (`topluYolEtiketi`): aynı liste
            öğrencinin ekranında emir kipinde duruyor ("Mentör ol"). Öğretmene
            emir kipiyle yazılsaydı, öğrencilerinin yolu öğretmene verilmiş bir
            görev listesi gibi okunurdu.
          */}
          <ul className="grid gap-2 sm:grid-cols-2">
            {kaynaklar.map((kaynak) => (
              <li
                key={kaynak.kod}
                className="rounded-kutu border border-cizgi px-3 py-2 text-sm text-metin"
              >
                {kaynak.topluYolEtiketi}
              </li>
            ))}
          </ul>
        </Kart>
      </div>
    </div>
  );
}

/** Öğrencinin kendi yolculuğu — sayfanın ilk ve asıl hâli. */
function OgrenciGorunumu({
  yolculuk,
}: {
  yolculuk: Awaited<ReturnType<typeof yolculugumuGetir>>;
}) {
  /*
   * Liste ÖĞRENCİ kalemleriyle sınırlı: danışmanlık ve etkinlik düzenleme
   * öğretmen tarafının işi; öğrenciye yapamayacağı bir yolu göstermek listeyi
   * ulaşılmaz kılardı.
   */
  const kaynaklar = PUAN_KAYNAKLARI.filter(
    (kaynak) => kaynak.kimde === "herkes" || kaynak.kimde === "ogrenci",
  );

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="GençTek Yolculuğum"
        aciklama={yolculuk.seviye.ad}
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
          <span className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3.5 py-1.5">
            <SeviyeYildizlari yildiz={yolculuk.yildiz} ton="poster" />
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
              ? `Sonraki seviyen ${seviyeAdiTirnakli(yolculuk.sonraki.ad)}`
              : "En üst seviyedesin. Buradan sonrası, ardında bıraktığın iz."}
          </p>
        </div>
      </div>

      <Kart>
        <KartBasligi baslik="GençTek Yolculuğum" Ikon={Compass} />
        <YolculukSeridi seviyeKodu={yolculuk.seviye.kod} />
      </Kart>

      <div className="grid gap-6 lg:grid-cols-2">
        {/*
          SEYİR DEFTERİ (28 Ağustos 2026 · istek: "Puanım nereden geliyor
          yerine Seyir Defteri. Puanların toplamı siliyoruz, toplam yerine
          seviyeyi yazdırabilirsin"). Kartın işi değişmedi — yolculuğu neyin
          ilerlettiğini gösteriyor — ama satırların sağındaki sayı artık PUAN
          DEĞİL KAYIT ADEDİ: "3" burada "üç etkinliğe katıldın" demek, "üç
          puan kazandın" değil. Sayı yine de duruyor çünkü kişinin kendi
          geçmişini sayması gizlenecek bir şey değil; gizlenen, o geçmişi tek
          bir yarış puanına indiren toplamdı.
        */}
        <Kart>
          <KartBasligi baslik="Seyir Defteri" Ikon={BookOpen} />
          {yolculuk.dokum.length === 0 ? (
            <p className="text-metin-yumusak">
              Seyir defterine işlenecek bir kaydın henüz yok.
            </p>
          ) : (
            <ul className="divide-y divide-cizgi">
              {yolculuk.dokum.map((satir) => (
                <li
                  key={satir.kod}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-2.5"
                >
                  <span className="text-metin">{satir.etiket}</span>
                  <span className="font-baslik font-bold text-baslik">
                    × {satir.adet}
                  </span>
                </li>
              ))}
              {/*
                TOPLAM SATIRI SEVİYEYE DÖNDÜ: eskiden burada puanların toplamı
                vardı. Dökümün altında duran şeyin "hepsi bir araya gelince ne
                oldu" sorusunu cevaplaması gerekiyor; cevabı artık bir sayı
                değil, ulaşılan basamağın adı.
              */}
              <li className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                <span className="font-semibold text-baslik">Seviyen</span>
                <span className="font-baslik text-lg font-extrabold text-vurgu-metin">
                  {yolculuk.seviye.ad}
                </span>
              </li>
            </ul>
          )}
        </Kart>

        <Kart>
          <KartBasligi
            baslik="GençTek Yolculuğum nasıl ilerliyor?"
            Ikon={Flame}
          />
          {/*
            Maddelerin YANINDAKİ SAYI KALDIRILDI. Her satırda "+2" yazmak,
            sayfadan çıkarılan puanı liste hâlinde geri getirir ve okuyanı
            "hangisi daha çok getiriyor" hesabına sokardı — oysa buranın
            söylemesi gereken, yolculuğun nelerle ilerlediği.

            ALTTAKİ "kendiliğinden hesaplanır, elle verilmez" NOTU DA SİLİNDİ
            (istek). Not, puanın elle verilmediğini savunmak için vardı; ortada
            gösterilen bir puan kalmayınca savunacağı bir şey de kalmadı.

            Maddeler EMİR KİPİNDE (`yolEtiketi`): burası yapılabilecekleri
            sayıyor, Seyir Defteri ise yapılmış olanları.
          */}
          <ul className="grid gap-2 sm:grid-cols-2">
            {kaynaklar.map((kaynak) => (
              <li
                key={kaynak.kod}
                className="rounded-kutu border border-cizgi px-3 py-2 text-sm text-metin"
              >
                {kaynak.yolEtiketi}
              </li>
            ))}
          </ul>
        </Kart>
      </div>

    </div>
  );
}
