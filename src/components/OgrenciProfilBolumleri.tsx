import {
  Award,
  CalendarCheck,
  ExternalLink,
  Lock,
  Store,
  Package,
  Paperclip,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import type { KatilimBicimi, KazanimTipi } from "@/generated/prisma/enums";
import { KapsamRozeti, KategoriRozeti } from "@/components/FaaliyetRozetleri";
import { Kart, KartBasligi } from "@/components/ui";
import type { KazanimSonucu } from "@/lib/kazanim/getir";
import type { RozetDurumu, SeferDurumu } from "@/lib/kazanim/rozetler";
import { uygulamaYolu } from "@/lib/ortam";
import {
  bilisimYolculuguGruplari,
  KATILIM_BICIMI_ETIKETLERI,
  type KazanimSahibi,
  kazanimTipiTanimi,
  kazanimTipleri,
} from "@/lib/kazanim/kurallar";
import { tarihYaz } from "@/lib/tarih";

/**
 * Profil bölümlerinin her ekranda aynı görünen hâli.
 *
 * Kişinin kendi profili (`/panel/profil`), yetkilinin gördüğü detay
 * (`/panel/ogrenciler/[id]`, `/panel/ogretmenler/[id]`) ve katkı ekranı aynı
 * bileşenleri kullanır: ekranlar ayrı ayrı yazılsaydı birine eklenen bir alan
 * diğerinde sessizce eksik kalırdı. Fark yalnızca DÜZENLEME haklarındadır —
 * silme formu ilgili eylem verilmediğinde hiç basılmaz.
 *
 * Kazanım bölümleri öğretmende de kullanılır; metinler `sahip` ile ayrılır
 * (bkz. lib/kazanim/kurallar.ts).
 */

export function SaltOkunurAlan({
  etiket,
  deger,
}: {
  etiket: string;
  deger: string | null;
}) {
  return (
    <div>
      <dt className="text-sm font-medium text-metin-yumusak">{etiket}</dt>
      <dd className="mt-0.5 text-metin">{deger?.trim() ? deger : "—"}</dd>
    </div>
  );
}

export interface KazanimEkSatiri {
  id: number;
  dosyaAdi: string;
}

export interface KazanimBaglantiSatiri {
  id: number;
  adres: string;
  etiket: string | null;
}

export interface KazanimSatiri {
  id: number;
  tip: KazanimTipi;
  baslik: string;
  aciklama: string | null;
  tarih: Date | null;
  baglantiUrl: string | null;
  derece: string | null;
  duzenleyen: string | null;
  katilimBicimi: KatilimBicimi | null;
  hedefKitle: string | null;
  /**
   * Destekleyici belgeler. Kaydı yalnızca GÖRÜNTÜLEYEN ekranlar bu alanı
   * doldurmayabilir; o zaman bölüm hiç basılmaz.
   */
  ekler?: KazanimEkSatiri[];
  /** Ürüne özgü alanlar (D5); diğer tiplerde boş kalır. */
  gelistirenEkip?: string | null;
  markettePaylasilsin?: boolean;
  baglantilar?: KazanimBaglantiSatiri[];
}

/** Kazanım satırının düzenleme yetenekleri — hepsi isteğe bağlı. */
export interface KazanimEylemleri {
  silmeEylemi?: (veri: FormData) => Promise<void>;
  belgeEkleEylemi?: (veri: FormData) => Promise<void>;
  belgeSilEylemi?: (veri: FormData) => Promise<void>;
  /** Yükleme alanının `accept` değeri; sınırlar sistem ayarından gelir. */
  izinliBelgeTipleri?: string[];
}

function KazanimSatiriGosterimi({
  kazanim,
  silmeEylemi,
  belgeEkleEylemi,
  belgeSilEylemi,
  izinliBelgeTipleri,
}: {
  kazanim: KazanimSatiri;
} & KazanimEylemleri) {
  const altBilgiler = [
    kazanim.gelistirenEkip ? `Ekip: ${kazanim.gelistirenEkip}` : null,
    kazanim.duzenleyen,
    kazanim.katilimBicimi
      ? KATILIM_BICIMI_ETIKETLERI[kazanim.katilimBicimi]
      : null,
    kazanim.hedefKitle ? `Hedef kitle: ${kazanim.hedefKitle}` : null,
    kazanim.tarih ? tarihYaz(kazanim.tarih) : null,
  ].filter((deger): deger is string => Boolean(deger));

  return (
    <li className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-medium text-metin">
          {kazanim.baslik}
          {kazanim.derece && (
            <span className="rounded-full bg-olumlu-zemin px-2 py-0.5 text-xs font-semibold text-olumlu-metin">
              {kazanim.derece}
            </span>
          )}
          {/*
            Markette paylaşım işareti ROZET olarak gösteriliyor: kullanıcı
            hangi ürününü vitrine koyduğunu listeye bakarak görebilmeli,
            düzenleme ekranını açmadan.
          */}
          {kazanim.markettePaylasilsin && (
            <span className="inline-flex items-center gap-1 rounded-full bg-vurgu-zemin px-2 py-0.5 text-xs font-medium text-vurgu-metin">
              <Store size={12} aria-hidden />
              Markette
            </span>
          )}
        </p>
        {altBilgiler.length > 0 && (
          <p className="mt-1 text-sm text-metin-yumusak">
            {altBilgiler.join(" · ")}
          </p>
        )}
        {kazanim.aciklama && (
          <p className="mt-1.5 text-sm whitespace-pre-line text-metin">
            {kazanim.aciklama}
          </p>
        )}
        {kazanim.baglantiUrl && (
          <a
            /*
             * Adres öğrenci beyanıdır ve dış siteye çıkar: `noopener noreferrer`
             * olmadan açılan sayfa `window.opener` üzerinden bu sekmeyi
             * yönlendirebilir. Protokol kontrolü kayıt sırasında yapılır
             * (bkz. lib/ogrenci/kazanim-kurallar.ts).
             */
            href={kazanim.baglantiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-vurgu-metin underline underline-offset-2"
          >
            <ExternalLink size={14} aria-hidden />
            Bağlantıyı aç
          </a>
        )}

        {kazanim.baglantilar && kazanim.baglantilar.length > 0 && (
          <ul className="mt-1.5 flex flex-wrap gap-3">
            {kazanim.baglantilar.map((baglanti) => (
              <li key={baglanti.id}>
                <a
                  /* Protokol kontrolü kayıt sırasında yapıldı; yine de dış
                     siteye çıkıldığı için noopener/noreferrer zorunlu. */
                  href={baglanti.adres}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-vurgu-metin underline underline-offset-2"
                >
                  <ExternalLink size={14} aria-hidden />
                  {baglanti.etiket ?? "Bağlantıyı aç"}
                </a>
              </li>
            ))}
          </ul>
        )}

        {/*
          Destekleyici belgeler. Dosyalar public dizinden servis EDİLMEZ;
          bağlantı, kapsam kontrolünden geçen bir rotaya gider
          (panel/kazanim-ekleri/[ekId]).
        */}
        {kazanim.ekler && kazanim.ekler.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {kazanim.ekler.map((ek) => (
              <li
                key={ek.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-cizgi px-3 py-1 text-sm"
              >
                <Paperclip size={13} className="text-metin-yumusak" aria-hidden />
                <a
                  /*
                   * `<a>` HAM özniteliktir: <Link>'in aksine basePath'i kendisi
                   * eklemez, alt dizin kurulumunda uygulamanın dışına çıkardı.
                   * `target="_blank"` gerektiği için Link kullanılmıyor —
                   * belge yeni sekmede açılmalı ki kullanıcı profilden düşmesin.
                   */
                  href={uygulamaYolu(`/panel/kazanim-ekleri/${ek.id}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-vurgu-metin underline underline-offset-2"
                >
                  {ek.dosyaAdi}
                </a>
                {belgeSilEylemi && (
                  <form action={belgeSilEylemi}>
                    <input type="hidden" name="ekId" value={ek.id} />
                    <button
                      type="submit"
                      className="text-metin-yumusak transition hover:text-hata-metin"
                      aria-label={`${ek.dosyaAdi} belgesini kaldır`}
                    >
                      <Trash2 size={13} aria-hidden />
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        {belgeEkleEylemi && (
          <form action={belgeEkleEylemi} className="mt-2 flex flex-wrap items-center gap-2">
            <input type="hidden" name="kazanimId" value={kazanim.id} />
            <input
              type="file"
              name="belgeler"
              multiple
              required
              accept={izinliBelgeTipleri?.join(",")}
              className="max-w-full text-sm text-metin file:mr-2 file:rounded-md file:border file:border-cizgi file:bg-kart file:px-2.5 file:py-1 file:text-sm file:font-medium file:text-metin"
              aria-label={`${kazanim.baslik} kaydına destekleyici belge ekle`}
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md border border-cizgi px-2.5 py-1.5 text-sm font-medium text-metin transition hover:bg-zemin"
            >
              <Paperclip size={14} aria-hidden />
              Belge ekle
            </button>
          </form>
        )}
      </div>
      {silmeEylemi && (
        <form action={silmeEylemi}>
          <input type="hidden" name="kazanimId" value={kazanim.id} />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md border border-cizgi px-2.5 py-1.5 text-sm font-medium text-metin-yumusak transition hover:bg-zemin hover:text-hata-metin"
            aria-label={`${kazanim.baslik} kaydını sil`}
          >
            <Trash2 size={14} aria-hidden />
            Sil
          </button>
        </form>
      )}
    </li>
  );
}

/**
 * Kayıt listesi — başlıksız.
 *
 * Başlığını çağıranın verdiği yerlerde kullanılır (ör. "GençTek Yolculuğum"
 * kartının akran eğitimi bölümü): `KazanimBolumleri` orada tür başlığını ikinci
 * kez basardı.
 */
export function KazanimListesi({
  kazanimlar,
  ...eylemler
}: {
  kazanimlar: KazanimSatiri[];
} & KazanimEylemleri) {
  return (
    <ul className="divide-y divide-cizgi">
      {kazanimlar.map((kazanim) => (
        <KazanimSatiriGosterimi
          key={kazanim.id}
          kazanim={kazanim}
          {...eylemler}
        />
      ))}
    </ul>
  );
}

/**
 * Kazanım kayıtları, türlerine göre bölümlenmiş hâlde.
 *
 * Boş türler de başlıklarıyla görünür: bakan kişi "bu kişi ürün girmemiş" ile
 * "ürün bölümü diye bir şey yok" arasındaki farkı görebilmeli.
 *
 * `tipler` verilirse yalnızca o türler basılır. Profil iki yolculuk bölümüne
 * ayrıldığı için gerekli (bkz. lib/kazanim/kurallar.ts · *_YOLCULUGU_TIPLERI);
 * verilmezse tüm türler listelenir ve eski davranış korunur.
 */
export function KazanimBolumleri({
  kazanimlar,
  bosMesaji,
  sahip = "OGRENCI",
  tipler,
  ...eylemler
}: {
  kazanimlar: KazanimSatiri[];
  bosMesaji: string;
  sahip?: KazanimSahibi;
  tipler?: readonly KazanimTipi[];
} & KazanimEylemleri) {
  const gosterilecekler = tipler
    ? kazanimTipleri(sahip).filter((tanim) => tipler.includes(tanim.tip))
    : kazanimTipleri(sahip);

  return (
    <div className="space-y-6">
      {gosterilecekler.map((tanim) => {
        const kayitlar = kazanimlar.filter((kazanim) => kazanim.tip === tanim.tip);
        return (
          <div key={tanim.tip}>
            <h3 className="text-sm font-semibold text-baslik">
              {tanim.baslik}
              <span className="ml-2 font-normal text-metin-yumusak">
                {kayitlar.length}
              </span>
            </h3>
            {kayitlar.length === 0 ? (
              <p className="mt-1.5 text-sm text-metin-yumusak">{bosMesaji}</p>
            ) : (
              <ul className="mt-2 divide-y divide-cizgi">
                {kayitlar.map((kazanim) => (
                  <KazanimSatiriGosterimi
                    key={kazanim.id}
                    kazanim={kazanim}
                    {...eylemler}
                  />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * "Bilişim Yolculuğum" — üç alt başlık altında gruplanmış kayıtlar
 * (7 Ağustos 2026).
 *
 * `KazanimBolumleri`'nden farkı bir GRUPLAMA katmanı olması: orada her tip
 * kendi başlığını alır, burada tipler "Ürünlerim / Deneyimlerim /
 * Topluluklarım-Ekiplerim" başlıkları altında toplanır (istek). Tip başlıkları
 * grup içinde ikinci düzey olarak korunuyor — bir sertifika ile bir yarışma
 * derecesi aynı başlık altında ayırt edilemez hâle gelmemeli.
 *
 * Tek bir tipten oluşan grupta (Ürünlerim, Topluluklarım) tip başlığı BASILMAZ:
 * "Ürünlerim → Yaptığım ürünler" iki kez aynı şeyi söylerdi.
 */
export function KazanimGruplari({
  kazanimlar,
  sahip = "OGRENCI",
  ...eylemler
}: {
  kazanimlar: KazanimSatiri[];
  sahip?: KazanimSahibi;
} & KazanimEylemleri) {
  return (
    <div className="space-y-8">
      {bilisimYolculuguGruplari(sahip).map(({ grup, tanimlar }) => {
        const grupKayitlari = kazanimlar.filter((kazanim) =>
          grup.tipler.includes(kazanim.tip),
        );
        const tekTip = tanimlar.length === 1;

        return (
          <div key={grup.kod}>
            <h3 className="flex items-center gap-2 text-base font-semibold text-baslik">
              {grup.baslik}
              <span className="font-normal text-metin-yumusak">
                {grupKayitlari.length}
              </span>
            </h3>
            <p className="mt-1 text-sm text-metin-yumusak">{grup.aciklama}</p>

            {grupKayitlari.length === 0 ? (
              <p className="mt-2 text-sm text-metin-yumusak">
                Henüz kayıt yok.
              </p>
            ) : tekTip ? (
              <div className="mt-3">
                <KazanimListesi kazanimlar={grupKayitlari} {...eylemler} />
              </div>
            ) : (
              <div className="mt-3 space-y-4">
                {tanimlar.map((tanim) => {
                  const kayitlar = grupKayitlari.filter(
                    (kazanim) => kazanim.tip === tanim.tip,
                  );
                  // Grup içinde BOŞ tip başlığı basılmaz: grubun kendi sayacı
                  // zaten "burada bir şey yok" bilgisini veriyor.
                  if (kayitlar.length === 0) return null;
                  return (
                    <div key={tanim.tip}>
                      <h4 className="text-sm font-semibold text-metin">
                        {tanim.baslik}
                        <span className="ml-2 font-normal text-metin-yumusak">
                          {kayitlar.length}
                        </span>
                      </h4>
                      <div className="mt-1.5">
                        <KazanimListesi kazanimlar={kayitlar} {...eylemler} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * "Yaptığım ürünler" — kazanım kayıtlarının URUN tipi, kendi kartında.
 *
 * Aynı veri profildeki dört bölümlü listede de duruyor ama orada bir satır
 * olarak kalıyor. Ürün kişinin ortaya koyduğu SOMUT iştir ve dört başlıktan
 * biri değil, kendi başına bir vitrindir: bu yüzden ızgara düzeninde, bağlantısı
 * öne çıkarılmış olarak ayrıca gösteriliyor.
 */
export function UrunlerKarti({
  urunler,
  kendiMi,
  sahip = "OGRENCI",
}: {
  urunler: KazanimSatiri[];
  kendiMi: boolean;
  sahip?: KazanimSahibi;
}) {
  const tanim = kazanimTipiTanimi("URUN", sahip);

  return (
    <Kart>
      <KartBasligi
        baslik={kendiMi ? "Yaptığım ürünler" : "Yaptığı ürünler"}
        aciklama={tanim.aciklama}
        Ikon={Package}
      />

      {urunler.length === 0 ? (
        <p className="text-metin-yumusak">
          {kendiMi ? (
            /*
              Öğrenciye "sen", öğretmene "siz" diye sesleniliyor: panelin geri
              kalanı da böyle ve tek bir metni ikisine birden uydurmaya
              çalışmak, ikisine de yabancı bir dil üretirdi.
            */
            sahip === "OGRENCI" ? (
              <>
                Henüz ürün eklemedin. Geliştirdiğin bir site, uygulama, oyun ya
                da film varsa{" "}
                <Link
                  href="/panel?bolum=urunlerim&tur=URUN#urunlerim"
                  className="font-medium text-vurgu-metin underline underline-offset-2"
                >
                  Panel&apos;den ekleyebilirsin
                </Link>
                .
              </>
            ) : (
              <>
                Henüz ürün eklemediniz. Geliştirdiğiniz bir site, uygulama, ders
                materyali ya da film varsa{" "}
                <Link
                  href="/panel?bolum=urunlerim&tur=URUN#urunlerim"
                  className="font-medium text-vurgu-metin underline underline-offset-2"
                >
                  Panel&apos;den ekleyebilirsiniz
                </Link>
                .
              </>
            )
          ) : (
            "Henüz ürün kaydı girilmemiş."
          )}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {urunler.map((urun) => (
            <li
              key={urun.id}
              className="rounded-kart border border-cizgi bg-zemin p-4"
            >
              <p className="font-semibold text-metin">{urun.baslik}</p>
              {urun.tarih && (
                <p className="mt-0.5 text-sm text-metin-yumusak">
                  {tarihYaz(urun.tarih)}
                </p>
              )}
              {urun.aciklama && (
                <p className="mt-2 text-sm whitespace-pre-line text-metin">
                  {urun.aciklama}
                </p>
              )}
              {/*
                Silme burada YOK: kart bir vitrindir, kayıtların düzenlendiği
                yer profildir. Buraya da silme koymak, işlem sonrası kullanıcıyı
                hiç istemediği bir ekrana (profil) atardı.
              */}
              {urun.baglantiUrl && (
                <a
                  href={urun.baglantiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-vurgu-metin underline underline-offset-2"
                >
                  <ExternalLink size={14} aria-hidden />
                  Ürünü aç
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {kendiMi && urunler.length > 0 && (
        <Link
          href="/panel?bolum=urunlerim&tur=URUN#urunlerim"
          className="mt-4 inline-block text-sm font-medium text-vurgu-metin underline underline-offset-2"
        >
          Yeni ürün ekle
        </Link>
      )}
    </Kart>
  );
}

/**
 * Katıldığı GençTek etkinlikleri.
 *
 * Bu liste kazanım kayıtlarından FARKLIDIR: beyan değil, TÜRETİLİR — kişinin
 * adına belge üretilmiş, iptal edilmemiş ve tarihi geçmiş etkinlikler
 * (bkz. lib/kazanim/katilim-kurallar.ts). Bu yüzden elle eklenip silinemez.
 */
export function KatildigiEtkinlikler({
  kazanim,
  baglantiVerilsinMi = true,
}: {
  kazanim: KazanimSonucu;
  /** Faaliyet detayına bağlantı; kapsam dışı kişiye link vermenin anlamı yok. */
  baglantiVerilsinMi?: boolean;
}) {
  if (kazanim.katilimlar.length === 0) {
    return (
      <p className="text-metin-yumusak">
        Tamamlanmış bir GençTek etkinliği katılımı yok.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-cizgi">
      {kazanim.katilimlar.map((katilim) => (
        <li key={katilim.faaliyetId} className="py-3 first:pt-0 last:pb-0">
          {baglantiVerilsinMi ? (
            <Link
              href={`/panel/etkinlikler/${katilim.faaliyetId}`}
              className="font-medium text-metin transition hover:text-vurgu-metin"
            >
              {katilim.ad}
            </Link>
          ) : (
            <span className="font-medium text-metin">{katilim.ad}</span>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="text-sm text-metin-yumusak">
              {tarihYaz(katilim.tarih)}
            </span>
            <KategoriRozeti kategori={katilim.etkinlikKategorisi} />
            <KapsamRozeti kapsam={katilim.kapsam} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Rozet özeti — profilde tek satır; ayrıntı `/panel/kazanimlarim` ekranında. */
export function RozetOzeti({ kazanim }: { kazanim: KazanimSonucu }) {
  const kazanilan = kazanim.rozetler.filter((rozet) => rozet.kazanildiMi);
  if (kazanilan.length === 0) return null;

  return (
    <Kart>
      <KartBasligi
        baslik="Rozetler"
        aciklama="Katılım geçmişinden otomatik hesaplanır; elle verilmez."
        Ikon={Award}
      />
      <ul className="flex flex-wrap gap-2">
        {kazanilan.map((rozet) => (
          <li
            key={rozet.kod}
            className="inline-flex items-center gap-1.5 rounded-full bg-olumlu-zemin px-3 py-1 text-sm font-medium text-olumlu-metin"
            title={rozet.aciklama}
          >
            <Award size={14} aria-hidden />
            {rozet.ad}
          </li>
        ))}
      </ul>
    </Kart>
  );
}

/** Katılım geçmişi kartı — başlığı iki ekranda da aynı. */
export function KatilimKarti({
  kazanim,
  baglantiVerilsinMi = true,
}: {
  kazanim: KazanimSonucu;
  baglantiVerilsinMi?: boolean;
}) {
  return (
    <Kart>
      <KartBasligi
        baslik="Katıldığı GençTek etkinlikleri"
        aciklama={`${kazanim.ozet.toplamKatilim} etkinlik · adına üretilen belgelerden türetilir, elle girilmez.`}
        Ikon={CalendarCheck}
      />
      <KatildigiEtkinlikler
        kazanim={kazanim}
        baglantiVerilsinMi={baglantiVerilsinMi}
      />
    </Kart>
  );
}

/**
 * "Katkı Nişanlarım" (D7 · 6 Ağustos 2026 · başlık 7 Ağustos'ta geri alındı).
 *
 * D7'de "Seferlerim" adını almıştı; istek başlığı **Katkı Nişanlarım**'a
 * döndürdü. Seviyelerin iç adı ("sefer") KODDA KALDI: `SeferDurumu`,
 * `seferDurumlari` ve envanter tanımlarındaki gönderme aynı kavramı
 * gösteriyor ve yeniden adlandırmak, görünen bir şeyi değiştirmeyen geniş bir
 * fark üretirdi.
 *
 * PROFİLDE ve Katkılarım ekranında duruyor: ikisi de aynı bileşenden
 * basılıyor, ayrı yazılsalardı biri ötekinden ayrışırdı.
 *
 * Nişanlar HESAPLANIR, tabloda tutulmaz: başvuru ve etkinlik kayıtlarından
 * türetilir. Bu bilinçli bir karardı — beyanla nişan kazanılamaz.
 *
 * SEVİYE SİSTEMİ HENÜZ YOK. İstek "usta/kalfa/çırak" ve "keşfeden/üreten/
 * paylaşan/lider/elçi" diye İKİ ayrı liste veriyor ve hangisinin geçerli
 * olduğu ile seviye atlama ölçütleri belirsiz (→ S15). Seviye, ekranın
 * gösterdiği bir etiket değil bir HESAPLAMA KURALIDIR; ölçüt gelmeden
 * eklenirse öğrenciye yanlış bir derece gösterilir ve geri alınması gerekir.
 */
export function KatkiNisanlariKarti({
  rozetler,
  seferler = [],
  bosMesaji,
}: {
  rozetler: RozetDurumu[];
  /** Seviyeler; öğretmende boş gelir ve bölüm hiç basılmaz. */
  seferler?: SeferDurumu[];
  bosMesaji: string;
}) {
  const kazanilan = rozetler.filter((rozet) => rozet.kazanildiMi);
  const bekleyen = rozetler.filter((rozet) => !rozet.kazanildiMi);

  return (
    <Kart>
      <KartBasligi
        baslik="Katkı Nişanlarım"
        aciklama="Katılım ve düzenleme geçmişinden otomatik hesaplanır; başvuru gerektirmez."
        Ikon={Award}
      />

      {/*
        SEVİYELER (D7). Merdiven DEĞİL, kazanılan niteliklerdir: "üreten" ile
        "paylaşan" biri öbürünün üstü değil. Kazanılmayanlar da soluk olarak
        gösteriliyor — hangi yolların açık olduğunu görmek, yalnızca
        kazanılanları görmekten daha çok şey anlatıyor.
      */}
      {seferler.length > 0 && (
        <div className="mb-6">
          <ul className="flex flex-wrap gap-2">
            {seferler.map((sefer) => (
              <li
                key={sefer.kod}
                title={sefer.aciklama}
                className={
                  sefer.kazanildiMi
                    ? "inline-flex items-center gap-1.5 rounded-full bg-olumlu-zemin px-3 py-1.5 text-sm font-semibold text-olumlu-metin"
                    : "inline-flex items-center gap-1.5 rounded-full border border-dashed border-cizgi px-3 py-1.5 text-sm text-metin-yumusak"
                }
              >
                {sefer.kazanildiMi ? (
                  <Award size={14} aria-hidden />
                ) : (
                  <Lock size={13} aria-hidden />
                )}
                {sefer.ad}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-metin-yumusak">
            Seviyeler bir sıra değildir; her biri ayrı bir yolla kazanılır ve
            kazanıldıktan sonra düşmez. Üzerine gelerek ölçütünü görebilirsin.
          </p>
        </div>
      )}

      {kazanilan.length === 0 ? (
        <p className="text-metin-yumusak">{bosMesaji}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {kazanilan.map((rozet) => (
            <li
              key={rozet.kod}
              className="rounded-kart border border-olumlu-cizgi bg-olumlu-zemin p-4"
            >
              <p className="flex items-center gap-2 font-semibold text-olumlu-metin">
                <Award size={16} aria-hidden />
                {rozet.ad}
              </p>
              <p className="mt-1 text-sm text-olumlu-metin">{rozet.aciklama}</p>
            </li>
          ))}
        </ul>
      )}

      {bekleyen.length > 0 && (
        <>
          <h3 className="mt-6 mb-3 text-sm font-semibold text-baslik">
            Yolda olanlar
          </h3>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bekleyen.map((rozet) => (
              <li
                key={rozet.kod}
                className="rounded-kart border border-cizgi bg-zemin p-4"
              >
                <p className="flex items-center gap-2 font-medium text-metin">
                  <Lock size={15} aria-hidden />
                  {rozet.ad}
                </p>
                <p className="mt-1 text-sm text-metin-yumusak">
                  {rozet.aciklama}
                </p>
                <div
                  className="mt-3 h-1.5 overflow-hidden rounded-full bg-cizgi"
                  role="progressbar"
                  aria-valuenow={rozet.ilerleme}
                  aria-valuemin={0}
                  aria-valuemax={rozet.hedef}
                  aria-label={`${rozet.ad} ilerlemesi`}
                >
                  <div
                    className="h-full rounded-full bg-[var(--renk-birincil)]"
                    style={{
                      width: `${(rozet.ilerleme / rozet.hedef) * 100}%`,
                    }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-metin-yumusak">
                  {rozet.ilerleme} / {rozet.hedef}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </Kart>
  );
}
