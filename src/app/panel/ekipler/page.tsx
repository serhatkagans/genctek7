import { MessageSquare, Users, UsersRound } from "lucide-react";
import Link from "next/link";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  EKIP_SOHBET_UYARISI,
  EKIP_TURLERI,
  EKIP_TURU_ETIKETLERI,
  ekipYonetebilirMi,
} from "@/lib/ekip/kurallar";
import { ekipleriGetir } from "@/lib/ekip/veri";
import { koordinatorIlKodu, projeYoneticisiMi } from "@/lib/yetki/izinler";
import { OGRETMEN } from "@/lib/yetki/kapsam";
import { ekipKurEylemi } from "./eylemler";

export const dynamic = "force-dynamic";

/**
 * EKİPLERİM (13 Ağustos 2026).
 *
 * İSTEK: "il koordinatörü ekipler kurabilsin, ekip ismini kendileri girsin,
 * ekiplere katılanlarla mesajlaşma sohbet yapabilsin, bunu da yönetim paneline
 * kart olarak ekleyelim, ismi ekiplerim olsun" · "bir koordinatör pek çok ekip
 * kurabilsin kurmak isterse, hepsi birbirinden ayrı".
 *
 * EKRAN İKİ KİTLEYE BİRDEN AÇIK ve tek liste basıyor:
 *   · koordinatör/merkez — kurduğu ve yönettiği ekipler, kurma formuyla,
 *   · üye (öğrenci, öğretmen, mezun…) — üyesi olduğu ekipler, formsuz.
 *
 * Ayrı iki ekran yapılsaydı koordinatörün kendi üyesi olduğu ekip iki yerde
 * birden görünürdü; ekip listesi ikisinde de aynı liste.
 *
 * HER EKİP BİRBİRİNDEN AYRI: kendi adı, kendi üye listesi, kendi sohbeti.
 * Sayı sınırı yok — koordinatör kaç ekip isterse kurar.
 */

const DURUM_MESAJLARI: Record<string, string> = {
  "ekip-kapatildi":
    "Ekip kapatıldı. Sohbet ve üye listesi kayıtta duruyor, yeni mesaj yazılamaz.",
};

export default async function EkiplerSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; hata?: string }>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  const { durum, hata } = await searchParams;

  const yonetebilir = ekipYonetebilirMi(kullanici);
  const merkezMi = projeYoneticisiMi(kullanici);

  /*
   * OKUL VE ÖĞRETMEN LİSTELERİ YALNIZCA KOORDİNATÖRE (15 Ağustos 2026):
   * ikisi de "ekibin ili" belli olduğunda anlamlı. Merkezin ili yok, ili
   * formda seçiyor — ülke genelindeki tüm okulları ve öğretmenleri açılır
   * listeye koymak on binlerce satır demek olurdu. Merkez okul takımını ve
   * danışmanı, ekibi kurduktan sonra düzenleyerek bağlıyor.
   */
  const koordinatorIli = merkezMi ? null : koordinatorIlKodu(kullanici);

  const [ekipler, iller, okullar, ogretmenler] = await Promise.all([
    ekipleriGetir(kullanici),
    /*
     * İl listesi YALNIZCA MERKEZE gerekiyor: koordinatörün ekibi kendi iline
     * bağlanır ve ona seçim sorulmaz (bkz. eylemler.ts). Merkezin ili
     * olmadığı için ekibin ilini seçmek zorunda.
     */
    merkezMi
      ? prisma.il.findMany({
          orderBy: { ad: "asc" },
          select: { ilKodu: true, ad: true },
        })
      : [],
    yonetebilir && koordinatorIli
      ? prisma.kurum.findMany({
          where: { ilKodu: koordinatorIli, aktif: true },
          orderBy: { ad: "asc" },
          select: { kurumKodu: true, ad: true },
        })
      : [],
    yonetebilir && koordinatorIli
      ? prisma.kullanici.findMany({
          where: { ilKodu: koordinatorIli, aktif: true, ...OGRETMEN },
          orderBy: [{ ad: "asc" }, { soyad: "asc" }],
          select: { id: true, ad: true, soyad: true, brans: true },
        })
      : [],
  ]);

  const acikEkipler = ekipler.filter((ekip) => ekip.aktif);
  const kapaliEkipler = ekipler.filter((ekip) => !ekip.aktif);

  return (
    <div className="space-y-6">
      <SayfaBasligi
        /* Bu ekrana Yönetim Paneli'ndeki karttan geliniyor (21 Ağustos 2026 ·
           istek): geri bağlantısı da oraya döner, "Panel"e değil — Panel
           zaten sol menüde duruyor. */
        geri={{ yol: "/panel/yonetim", etiket: "Yönetim Paneli" }}
        baslik="Ekiplerim"
        aciklama={
          yonetebilir
            ? "İlinizde ekipler kurun, üyelerini seçin ve ekip sohbetinden yazışın."
            : "Eklendiğiniz ekipler ve ekip sohbetleri."
        }
      />

      {durum && DURUM_MESAJLARI[durum] && (
        <BilgiKutusu cesit="olumlu">{DURUM_MESAJLARI[durum]}</BilgiKutusu>
      )}
      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}

      <BilgiKutusu cesit="uyari">{EKIP_SOHBET_UYARISI}</BilgiKutusu>

      <Kart>
        <KartBasligi
          baslik="Açık ekipler"
          aciklama={`${acikEkipler.length} ekip`}
          Ikon={UsersRound}
        />
        {acikEkipler.length === 0 ? (
          <p className="text-metin-yumusak">
            {yonetebilir
              ? "Henüz ekip kurmadınız. Aşağıdaki formdan ilkini kurabilirsiniz."
              : "Henüz bir ekibe eklenmediniz. İl koordinatörünüz sizi eklediğinde burada görünür."}
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {acikEkipler.map((ekip) => (
              <li key={ekip.id}>
                {/*
                  KART TIKLANABİLİR: ekibin kendisi bir sohbet ekranıdır ve
                  listedeki satırın işi oraya götürmek. Ayrı bir "aç" düğmesi,
                  aynı işi iki tıklamaya bölerdi.
                */}
                <Link
                  href={`/panel/ekipler/${ekip.id}`}
                  className="flex h-full flex-col rounded-kart border border-cizgi bg-kart p-4 shadow-kart transition hover:border-vurgu hover:shadow-yuksek"
                >
                  <span className="font-semibold text-baslik">{ekip.ad}</span>
                  {ekip.aciklama && (
                    <span className="mt-1 line-clamp-2 text-sm text-metin-yumusak">
                      {ekip.aciklama}
                    </span>
                  )}
                  <span className="mt-3 flex flex-wrap items-center gap-3 text-sm text-metin-yumusak">
                    <span className="inline-flex items-center gap-1">
                      <Users size={14} aria-hidden />
                      {ekip.uyeSayisi} üye
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare size={14} aria-hidden />
                      {ekip.mesajSayisi} mesaj
                    </span>
                    <span>{ekip.ilAdi}</span>
                    {ekip.uyesiyimMi && (
                      <span className="rounded-full bg-olumlu-zemin px-2 py-0.5 text-xs font-semibold text-olumlu-metin">
                        Üyesiniz
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Kart>

      {yonetebilir && (
        <Kart>
          <KartBasligi
            baslik="Yeni ekip kur"
            aciklama="Ekibin adını siz koyarsınız. Kurduğunuz her ekip birbirinden ayrıdır: kendi üyeleri ve kendi sohbeti olur."
            Ikon={UsersRound}
          />
          <form action={ekipKurEylemi} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-metin">Ekip adı</span>
              <input
                type="text"
                name="ad"
                required
                maxLength={150}
                placeholder="Örn. TEKNOFEST Hazırlık Ekibi"
                className={SINIF_GIRDI}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-metin">
                Açıklama{" "}
                <span className="font-normal text-metin-yumusak">
                  (isteğe bağlı)
                </span>
              </span>
              <textarea
                name="aciklama"
                rows={2}
                maxLength={500}
                placeholder="Ekibin ne için kurulduğunu bir iki cümleyle yazın."
                className={SINIF_GIRDI}
              />
            </label>

            {merkezMi ? (
              <label className="block sm:w-72">
                <span className="text-sm font-medium text-metin">
                  Ekibin ili
                </span>
                <select name="ilKodu" required className={SINIF_GIRDI}>
                  <option value="">Seçin</option>
                  {iller.map((il) => (
                    <option key={il.ilKodu} value={il.ilKodu}>
                      {il.ad}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="text-sm text-metin-yumusak">
                Ekip, il kodunuz{" "}
                <strong>{koordinatorIlKodu(kullanici) ?? "—"}</strong> olan
                ilinize bağlanır; üyeleri de bu ilden seçilir.
              </p>
            )}

            {/*
              TÜR VE OKUL (15 Ağustos 2026 · Aşama 5).

              OKUL SEÇİMİ HER ZAMAN GÖRÜNÜR ama yalnızca Okul Takımı türünde
              kullanılıyor; diğer türlerde sunucu tarafında sessizce düşürülüyor
              (bkz. ekipKapsaminiCoz). Alanı JavaScript ile gizlemek yerine
              böyle yapıldı: form sunucu bileşeni içinde ve ekranın tamamını
              istemciye taşımak, tek bir alanın gizlenmesi için ödenecek bedel
              değil. Etiket ne zaman gerektiğini açıkça söylüyor.

              MERKEZDE OKUL LİSTESİ TEKLİF EDİLMİYOR: il seçilmeden hangi ilin
              okulları listeleneceği bilinmiyor ve ülke genelindeki tüm okulları
              tek açılır listeye koymak (on binlerce satır) kullanılamaz olurdu.
              Merkez okul takımını, ili seçtikten sonra ekibi düzenleyerek
              bağlar; koordinatörde ise il zaten sabit.
            */}
            <label className="block sm:w-72">
              <span className="text-sm font-medium text-metin">Ekip türü</span>
              <select name="tur" defaultValue="CALISMA_GRUBU" className={SINIF_GIRDI}>
                {EKIP_TURLERI.map((tur) => (
                  <option key={tur} value={tur}>
                    {EKIP_TURU_ETIKETLERI[tur]}
                  </option>
                ))}
              </select>
            </label>

            {okullar.length > 0 && (
              <label className="block sm:w-96">
                <span className="text-sm font-medium text-metin">
                  Okul{" "}
                  <span className="font-normal text-metin-yumusak">
                    (yalnızca Okul Takımı türünde kullanılır, o türde zorunlu)
                  </span>
                </span>
                <select name="kurumKodu" defaultValue="" className={SINIF_GIRDI}>
                  <option value="">Seçin</option>
                  {okullar.map((okul) => (
                    <option key={okul.kurumKodu} value={okul.kurumKodu}>
                      {okul.ad}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/*
              DANIŞMAN İSTEĞE BAĞLI ve boş bırakılabilir olması bilinçli:
              danışmansız ekip izlenen bir durum (Ekip Yönetimi · danışmansız
              süzgeci). Zorunlu yapılsaydı o liste hiç dolmaz, ekipler de
              "bir isim yazayım da geçeyim" ile kurulurdu.
            */}
            {ogretmenler.length > 0 && (
              <label className="block sm:w-96">
                <span className="text-sm font-medium text-metin">
                  Danışman öğretmen{" "}
                  <span className="font-normal text-metin-yumusak">
                    (isteğe bağlı, sonradan atanabilir)
                  </span>
                </span>
                <select name="danismanId" defaultValue="" className={SINIF_GIRDI}>
                  <option value="">Sonra belirlenecek</option>
                  {ogretmenler.map((ogretmen) => (
                    <option key={ogretmen.id} value={ogretmen.id}>
                      {ogretmen.ad} {ogretmen.soyad}
                      {ogretmen.brans ? ` · ${ogretmen.brans}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button type="submit" className={SINIF_BIRINCIL_BUTON}>
              <UsersRound size={16} aria-hidden />
              Ekibi kur
            </button>
          </form>
        </Kart>
      )}

      {/*
        KAPALI EKİPLER AYRI BÖLÜMDE, gizlenmiyor: kapatılan ekibin sohbeti bir
        kayıttır ve "ekibim kayboldu" durumu, kapatmayı geri alınamaz bir
        silmeye çevirirdi.
      */}
      {kapaliEkipler.length > 0 && (
        <Kart>
          <KartBasligi
            baslik="Kapatılmış ekipler"
            aciklama={`${kapaliEkipler.length} ekip · sohbet okunur, yeni mesaj yazılamaz`}
          />
          <ul className="divide-y divide-cizgi">
            {kapaliEkipler.map((ekip) => (
              <li key={ekip.id} className="py-2.5">
                <Link
                  href={`/panel/ekipler/${ekip.id}`}
                  className="font-medium text-metin transition hover:text-vurgu-metin hover:underline"
                >
                  {ekip.ad}
                </Link>
                <span className="ml-2 text-sm text-metin-yumusak">
                  {ekip.ilAdi} · {ekip.uyeSayisi} üye · {ekip.mesajSayisi} mesaj
                </span>
              </li>
            ))}
          </ul>
        </Kart>
      )}
    </div>
  );
}
