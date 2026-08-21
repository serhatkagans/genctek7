import { Eye, ExternalLink, Info, Package, ScrollText, Users } from "lucide-react";
import { projeYoneticisiMi } from "@/lib/yetki/izinler";
import { DisaAktarmaBagi } from "@/components/DisaAktarmaBagi";
import Link from "next/link";
import {
  BilgiKutusu,
  Kart,
  Rozet,
  RozetSeridi,
  SayfaBasligi,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  MARKET_SUZGECLERI,
  sahipKumesi,
  sayiYaz,
  suzgeciCoz,
  suzgecTanimi,
  urunleriSuz,
} from "@/lib/market/kurallar";
import { tarihYaz } from "@/lib/tarih";

export const dynamic = "force-dynamic";

/**
 * GençTek Market — "Ürünlerim" sekmesi (I).
 *
 * Vitrindeki her ürün `kullanici_kazanim` · tip=URUN kaydıdır; markete
 * `markette_paylasilsin` bayrağıyla çıkar. Ayrı bir market tablosu yok
 * (gerekçe: lib/market/kurallar.ts).
 *
 * ÜRÜN EKLEME EKRANI YOK — istekteki not bunu söylüyor: "Ürün Ekle:
 * '… ekleyebilirsiniz' notu girilecek". Ekleme tek yerde, market yalnızca
 * gösteriyor; iki yerden eklenebilseydi aynı formun iki kopyası olurdu.
 *
 * O TEK YER PANEL'DEKİ "KAYITLARIM" BÖLÜMÜ. İstekte "profilden" yazıyordu ve
 * form da orada başlamıştı; 7 Ağustos'ta Panel'e taşındı (Profil GÖSTERİR,
 * Panel DÜZENLER). Ekrandaki notlar bir süre "profilden eklenir" demeye devam
 * etti ve kullanıcıyı ekleme yapamayacağı ekrana yolladı — 13 Ağustos 2026'da
 * düzeltildi.
 */
export default async function MarketSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ suzgec?: string }>;
}) {
  const { suzgec: hamSuzgec } = await searchParams;
  const kullanici = await oturumKullanicisiZorunlu();
  const suzgec = suzgeciCoz(hamSuzgec);

  /*
   * SORGU GENİŞ, SÜZME KODDA. Paylaşılanlar + kişinin kendi ürünleri tek
   * seferde çekiliyor; hangi kümeye girdiği rol listesine bakılarak kodda
   * kararlaştırılıyor (bkz. sahipKumesi). Rol koşulunu SQL'e gömmek, aynı
   * kararı iki yerde (sorgu + rozet yazısı) tutmak olurdu.
   */
  const kayitlar = await prisma.kullaniciKazanim.findMany({
    where: {
      tip: "URUN",
      OR: [{ markettePaylasilsin: true }, { kullaniciId: kullanici.id }],
    },
    select: {
      id: true,
      baslik: true,
      aciklama: true,
      gelistirenEkip: true,
      tarih: true,
      olusturmaTarihi: true,
      markettePaylasilsin: true,
      goruntulenmeSayisi: true,
      baglantiTiklamasi: true,
      kullaniciId: true,
      kullanici: {
        select: {
          ad: true,
          soyad: true,
          roller: { where: { bitisTarihi: null }, select: { rolKodu: true } },
        },
      },
      _count: { select: { ekler: true, baglantilar: true } },
    },
    orderBy: { olusturmaTarihi: "desc" },
  });

  const urunler = kayitlar.map((kayit) => ({
    ...kayit,
    sahipKullaniciId: kayit.kullaniciId,
    sahipKumesi: sahipKumesi(kayit.kullanici.roller.map((r) => r.rolKodu)),
  }));

  const gosterilecek = urunleriSuz(urunler, suzgec, kullanici.id);
  const aktifTanim = suzgecTanimi(suzgec);

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Ürünlerim · GençTek Market"
        aciklama="GençTek ekosisteminde üretilen ürünler."
        rozet={<Rozet cesit="vurgu">{gosterilecek.length} ürün</Rozet>}
      />

      {/*
        Dosya YALNIZCA MERKEZE ve yalnızca markette PAYLAŞILAN ürünleri taşıyor
        (gerekçe rotanın başında): paylaşılmamış ürün sahibinin kendine
        sakladığı kayıttır.
      */}
      {projeYoneticisiMi(kullanici) && urunler.length > 0 && (
        <p>
          <DisaAktarmaBagi yol="/panel/urunler/disa-aktar" />
        </p>
      )}

      {/*
        "ÜRÜN EKLE" DÜĞMESİ DEĞİL, NOT. İstekte yazan bu: ekleme başka bir
        ekranda (Panel · Kayıtlarım) yapılıyor. Düğme konsaydı market ayrı bir
        ekleme yolu gibi görünür, tıklayan yine oraya giderdi.
      */}
      <BilgiKutusu>
        <span className="flex flex-wrap items-center gap-1.5">
          <Info size={15} aria-hidden />
          <strong>Ürün eklemek için:</strong> ürünlerinizi &quot;Bilişim
          Yolculuğum&quot; ekranından ekleyebilirsiniz.
          {/*
            `?tur=URUN` kayıt formunu Ürünlerim türünde açar: form türe göre
            basılıyor ve varsayılan tür ürün değil. Çapa 21 Ağustos 2026'da
            kalktı — bölüm kendi sayfasına taşındığı için (istek: "kayıtlarım
            … kendi sayfaları olsun") form zaten ekranın en üstünde.
          */}
          <Link
            href="/panel/bilisim-yolculugum?tur=URUN"
            className="font-medium text-vurgu-metin underline underline-offset-2"
          >
            Ürün ekleme formuna git
          </Link>
          <span className="text-metin-yumusak">
            — eklerken &quot;Bu ürünü markette paylaş&quot; kutusunu işaretlerseniz
            burada görünür.
          </span>
        </span>
      </BilgiKutusu>

      {/*
        İKİ SÜZGEÇ (10 Ağustos 2026 · istek: "dilim kalkacak, kendi ürünlerim
        ürünlerim olacak, öğrenci ve öğretmen ürünleri ayrı olmayacak").
        Gerekçeler lib/market/kurallar.ts · MARKET_SUZGECLERI içinde.
      */}
      <nav aria-label="Ürün süzgeçleri" className="flex flex-wrap gap-2">
        {MARKET_SUZGECLERI.map((tanim) => (
          <Link
            key={tanim.kod}
            href={`/panel/urunler?suzgec=${tanim.kod}`}
            aria-current={tanim.kod === suzgec ? "page" : undefined}
            className={
              tanim.kod === suzgec
                ? "rounded-full bg-birincil px-4 py-1.5 text-sm font-semibold text-birincil-metin"
                : "rounded-full border border-cizgi px-4 py-1.5 text-sm text-metin transition hover:bg-zemin"
            }
          >
            {tanim.etiket}
          </Link>
        ))}
      </nav>

      {aktifTanim && (
        <p className="text-sm text-metin-yumusak">{aktifTanim.aciklama}</p>
      )}

      {gosterilecek.length === 0 ? (
        <Kart>
          <p className="text-metin">
            {suzgec === "BENIM"
              ? "Henüz ürün eklemedin."
              : "Bu başlıkta henüz paylaşılan ürün yok."}
          </p>
          {/*
            METİN "PANEL" DİYOR (13 Ağustos 2026 · istek: "katkı kartlarımda
            yaptığım ürünler profilden ekleniyormuş, o panelden eklenecek").
            Form 7 Ağustos'ta Panel'e taşınmıştı; bu satır geride kalıp
            kullanıcıyı ekleme yapamayacağı ekrana yolluyordu.
          */}
          <p className="mt-2 text-sm text-metin-yumusak">
            Ürünler Panel ekranındaki &quot;Kayıtlarım&quot; bölümünden eklenir;
            eklerken &quot;Bu ürünü markette paylaş&quot; kutusu işaretlenirse
            markette görünür.
          </p>
        </Kart>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {gosterilecek.map((urun) => (
            <li key={urun.id}>
              {/*
                Market bir VİTRİNDİR: kartlar tıklanabilir birer kutu ve
                imlecin üstüne geldiği kart yükseliyor. Diğer ekranlardaki
                kartlar bilgi taşıyan yüzeyler, buradakiler ürünün kendisi.
              */}
              <Kart className="flex h-full flex-col gap-3 transition hover:border-vurgu hover:shadow-yuksek">
                <div>
                  <h2 className="text-lg font-bold text-baslik">
                    <Link
                      href={`/panel/urunler/${urun.id}`}
                      className="hover:underline"
                    >
                      {urun.baslik}
                    </Link>
                  </h2>
                  {/*
                    18 Ağustos 2026: ürünün kümesi düz metinden rozete geçti.
                    Izgarada yan yana duran kartlarda "Öğrenci ürünü / Öğretmen
                    ürünü" ayrımı, geliştirici adının ardına iliştirilmiş gri
                    bir cümle parçasıydı ve göz taramasıyla ayırt edilmiyordu —
                    oysa vitrinde ilk aranan ayrım bu.

                    Paylaşım rozeti YALNIZCA sahibine gösterilir ve yalnızca
                    paylaşılmamış üründe: başkasının gördüğü her ürün zaten
                    paylaşılmış olduğu için rozet bilgi taşımazdı.
                  */}
                  <div className="mt-2">
                    <RozetSeridi>
                      <Rozet cesit="vurgu">
                        {urun.sahipKumesi === "OGRENCI"
                          ? "Öğrenci ürünü"
                          : urun.sahipKumesi === "OGRETMEN"
                            ? "Öğretmen ürünü"
                            : "Ekosistem ürünü"}
                      </Rozet>
                      {!urun.markettePaylasilsin && (
                        <Rozet cesit="uyari">Markette paylaşılmadı</Rozet>
                      )}
                    </RozetSeridi>
                  </div>
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-metin-yumusak">
                    <span className="inline-flex items-center gap-1">
                      <Users size={13} aria-hidden />
                      {urun.gelistirenEkip ??
                        `${urun.kullanici.ad} ${urun.kullanici.soyad}`}
                    </span>
                  </p>
                </div>

                {urun.aciklama && (
                  <p className="line-clamp-3 text-sm text-metin">
                    {urun.aciklama}
                  </p>
                )}

                <p className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-metin-yumusak">
                  <span className="inline-flex items-center gap-1.5">
                    <Eye size={14} aria-hidden />
                    {sayiYaz(urun.goruntulenmeSayisi)} görüntülenme
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ExternalLink size={14} aria-hidden />
                    {sayiYaz(urun.baglantiTiklamasi)} bağlantı ziyareti
                  </span>
                  {urun.tarih && <span>{tarihYaz(urun.tarih)}</span>}
                </p>
              </Kart>
            </li>
          ))}
        </ul>
      )}

      {/*
        SAYAÇLARIN NE SAYDIĞI YAZIYOR. İstek "indirilme sayıları" diyor ama
        ürünlerde dosya yükleme kapsam dışı ("şimdilik sadece tanıtım
        yapsınlar"); indirilecek bir dosya yok. Sayılan şey, ürünün bağlantısına
        gidilmesi. Bunu gizleyip "indirilme" demek, olmayan bir ölçümü varmış
        gibi göstermek olurdu (→ SORULAR.md · S22).
      */}
      <Kart>
        <h2 className="flex items-center gap-2 text-base font-semibold text-baslik">
          <Package size={16} className="text-metin-yumusak" />
          Sayaçlar ne sayıyor?
        </h2>
        <ul className="mt-2 space-y-1.5 text-sm text-metin-yumusak">
          <li>
            <strong className="text-metin">Görüntülenme:</strong> ürün sayfasının
            kaç kez açıldığı. Sahibinin kendi bakışları sayılmaz.
          </li>
          <li>
            <strong className="text-metin">Bağlantı ziyareti:</strong>{" "}
            ürünün
            deposuna, canlı sürümüne ya da tanıtımına kaç kez gidildiği.
            Ürünlerde dosya yükleme şimdilik kapalı olduğu için &quot;indirilme&quot;
            diye sayılabilecek bir olay yok; edinme niyetini gösteren en yakın
            ölçüm bu.
          </li>
        </ul>
      </Kart>

      {/*
        TAAHHÜTNAME (7 Ağustos 2026 · istek: "Market → Ürün Listele ·
        Taahhütname").

        METİN HENÜZ GELMEDİ (→ SORULAR.md · S12). Bölüm yine de basılıyor ve
        neyin beklendiğini söylüyor — DİLİM süzgecindeki ilkeyle aynı: eksik
        olanı gizlemek, unutulduğu izlenimi verirdi.

        UYDURULMUŞ BİR METİN KONULMADI. Taahhütname hukuki bir beyandır ve
        kullanıcıların çoğu 18 yaş altı; onaylatılan metin sonradan
        değiştirilirse verilmiş onay da geçersizleşir. Metin geldiğinde
        yapılacak iş `lib/kvkk/kurallar.ts` içindeki BELGE_TANIMLARI'na bir
        satır eklemek ve ürün paylaşımının önüne kapı olarak koymak; onay
        altyapısı (`kullanici_onayi`) zaten hazır.
      */}
      <Kart>
        <h2 className="flex items-center gap-2 text-base font-semibold text-baslik">
          <ScrollText size={16} className="text-metin-yumusak" />
          Ürün paylaşım taahhütnamesi
        </h2>
        <p className="mt-2 text-sm text-metin-yumusak">
          Markette ürün paylaşan herkesin onaylayacağı taahhütname{" "}
          <strong className="text-uyari-metin">henüz yayımlanmadı</strong>.
          Metin geldiğinde ürün paylaşımı bu onayın arkasına alınacak ve
          buradan okunabilecek. Bugün paylaşılan ürünler için ek bir onay
          istenmiyor.
        </p>
        <p className="mt-2 text-sm text-metin-yumusak">
          Şu an geçerli olan koruma, vitrinin <strong>ekosistem içine
          kapalı</strong> olmasıdır: ürünleri yalnızca GençTek&apos;e girmiş
          kullanıcılar görür.
        </p>
      </Kart>
    </div>
  );
}
