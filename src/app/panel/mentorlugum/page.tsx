import { GraduationCap, LifeBuoy, MessageSquare } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RolEtiketi, RolsuzEtiketi } from "@/components/RolEtiketi";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  KirintiYolu,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  GIZLILIK_UYARISI,
  PANODA_GORUNEN_ONAY_DURUMLARI,
  TALEP_TURU_ETIKETLERI,
} from "@/lib/iletisim/kurallar";
import { mentorKapsamiYaz } from "@/lib/mentor/kurallar";
import { mentorluguGetir } from "@/lib/mentor/veri";
import { tarihSaatYaz, tarihYaz } from "@/lib/tarih";
import type { RolKodu } from "@/generated/prisma/enums";
import { talebeCevapYazEylemi } from "./eylemler";

export const dynamic = "force-dynamic";

/**
 * MENTÖR SAYFASI (13 Ağustos 2026).
 *
 * İSTEK: "mentörlerin kendi sayfası olsun, destek atacağı sayfayı görecek,
 * talepleri inceleyip cevap yazacak, mentör sayfası gibi".
 *
 * NİYE AYRI EKRAN: pano herkesindir ve oradaki asıl iş ilan AÇMAKTIR. Mentörün
 * işi tersidir — açılmış ilanları okumak ve cevaplamak. Panoda mentöre ait bir
 * bölüm daha açmak, ilan arayan öğrenciyle cevap arayan mentörü aynı listede
 * tutardı; ikisinin sıralama ihtiyacı bile farklı (öğrenci "yeni ne var" diye
 * bakar, mentör "cevapsız ne kaldı" diye).
 *
 * YALNIZCA ONAYLI MENTÖR AÇAR: yetkisi olmayan 404 görür — ekranın varlığı
 * sızmasın (references/permissions.md · Bölüm 4). Başvuru ekranı ayrı ve
 * panoda (bkz. talepler/page.tsx · "Mentör olarak başvur").
 *
 * KAPSAM FİLTRESİ YOK, panoyla aynı ilke: ilanlar ülke genelinde görünür
 * (bkz. talepler/page.tsx). İl sınırı, farklı illerden insanların birbirini
 * bulması olan amacı baltalardı.
 */

const DURUM_MESAJLARI: Record<string, string> = {
  "cevap-yazildi":
    "Cevabınız ilanın altına eklendi ve ilan sahibine bildirim gitti.",
};

/** Aynı rolden iki kayıt varsa rozet iki kez basılmasın diye tekilleştirilir. */
function acanRolleri(roller: { rolKodu: RolKodu }[]): RolKodu[] {
  return [...new Set(roller.map((rol) => rol.rolKodu))];
}

function CevapListesi({
  cevaplar,
}: {
  cevaplar: {
    id: number;
    icerik: string;
    olusturmaTarihi: Date;
    yazan: { ad: string; soyad: string };
  }[];
}) {
  if (cevaplar.length === 0) return null;

  return (
    <ul className="mt-3 space-y-2 border-t border-cizgi pt-3">
      {cevaplar.map((cevap) => (
        <li key={cevap.id} className="rounded-kart bg-zemin px-3 py-2">
          <p className="text-sm font-medium text-metin">
            {cevap.yazan.ad} {cevap.yazan.soyad}
            <span className="ml-2 font-normal text-metin-yumusak">
              {tarihSaatYaz(cevap.olusturmaTarihi)}
            </span>
          </p>
          <p className="mt-1 whitespace-pre-line text-metin">{cevap.icerik}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * Cevaplanacak ilanın kartı.
 *
 * CEVAP KUTUSU HER İLANIN ALTINDA, ayrı bir ekrana götürmüyor: mentörün işi
 * "oku ve yaz" ve araya bir tıklama daha koymak, kısa cevapları pahalı hâle
 * getirirdi.
 */
function TalepKarti({
  talep,
  cevaplarim,
}: {
  talep: {
    id: number;
    tur: string | null;
    baslik: string;
    icerik: string;
    sonGecerlilik: Date;
    acan: {
      ad: string;
      soyad: string;
      sinif: string | null;
      brans: string | null;
      kurum: { ad: string } | null;
      il: { ad: string } | null;
      roller: { rolKodu: RolKodu }[];
    };
    cevaplar: {
      id: number;
      icerik: string;
      olusturmaTarihi: Date;
      yazan: { ad: string; soyad: string };
    }[];
  };
  cevaplarim: Set<number>;
}) {
  const roller = acanRolleri(talep.acan.roller);

  return (
    <li
      id={`talep-${talep.id}`}
      className="scroll-mt-24 rounded-kart border border-cizgi p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-baslik">{talep.baslik}</h3>
        <span className="flex flex-wrap items-center gap-2">
          {/*
            "CEVAPLADIM" ROZETİ: mentörün ekranda en çok sorduğu soru "buna
            baktım mı" ve cevapların arasında kendi adını aramak zorunda
            kalması, uzun listede işe yaramaz bir iş yükü olurdu.
          */}
          {cevaplarim.has(talep.id) && (
            <span className="rounded-full bg-olumlu-zemin px-2.5 py-0.5 text-xs font-semibold text-olumlu-metin">
              Cevapladınız
            </span>
          )}
          {talep.tur && (
            <span className="rounded-full bg-rol-ogrenci-zemin px-2.5 py-0.5 text-xs font-medium text-rol-ogrenci-metin">
              {TALEP_TURU_ETIKETLERI[talep.tur as keyof typeof TALEP_TURU_ETIKETLERI]}
            </span>
          )}
        </span>
      </div>

      <p className="mt-2 whitespace-pre-line text-metin">{talep.icerik}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-metin-yumusak">
        {roller.length > 0 ? (
          roller.map((rolKodu) => <RolEtiketi key={rolKodu} rolKodu={rolKodu} />)
        ) : (
          <RolsuzEtiketi />
        )}
        <span>
          {talep.acan.ad} {talep.acan.soyad}
          {" · "}
          {talep.acan.sinif ?? talep.acan.brans ?? "—"}
          {" · "}
          {talep.acan.kurum?.ad ?? talep.acan.il?.ad ?? "—"}
          {" · "}
          {tarihYaz(talep.sonGecerlilik)} tarihine kadar
        </span>
      </div>

      <CevapListesi cevaplar={talep.cevaplar} />

      <form
        action={talebeCevapYazEylemi}
        className="mt-3 space-y-2 border-t border-cizgi pt-3"
      >
        <input type="hidden" name="talepId" value={talep.id} />
        <input type="hidden" name="donusYolu" value="/panel/mentorlugum" />
        <label className="block">
          <span className="text-sm font-medium text-metin">
            {cevaplarim.has(talep.id) ? "Bir cevap daha yazın" : "Cevabınız"}
          </span>
          <textarea
            name="icerik"
            required
            rows={3}
            placeholder="Yol gösterin: nereden başlanır, hangi kaynak, hangi adım."
            className={SINIF_GIRDI}
          />
        </label>
        <button type="submit" className={SINIF_BIRINCIL_BUTON}>
          <MessageSquare size={16} aria-hidden />
          Cevap yaz
        </button>
      </form>
    </li>
  );
}

export default async function MentorSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; hata?: string }>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  const { durum, hata } = await searchParams;

  const mentorlugum = await mentorluguGetir(kullanici.id);
  if (!mentorlugum || mentorlugum.durum !== "ONAYLANDI") notFound();

  const simdi = new Date();
  const acanSecimi = {
    ad: true,
    soyad: true,
    sinif: true,
    brans: true,
    kurum: { select: { ad: true } },
    il: { select: { ad: true } },
    roller: { where: { bitisTarihi: null }, select: { rolKodu: true } },
  } as const;
  const cevapSecimi = {
    where: { gizlendiMi: false },
    orderBy: { olusturmaTarihi: "asc" },
    select: {
      id: true,
      icerik: true,
      olusturmaTarihi: true,
      yazan: { select: { ad: true, soyad: true } },
    },
  } as const;

  /*
   * İKİ LİSTE, İKİ SORGU: "Mentöre sor" ilanları mentörün asıl işidir ve
   * üstte durur; destek talepleri ise yardım edebileceği ikinci kümedir
   * ("destek atacağı sayfayı görecek"). Tek listede toplansalardı mentör,
   * kendisine yöneltilmiş soruyla genel bir teknik sorunu ayırt edemezdi.
   *
   * Sıra EN ESKİDEN yeniye: panoda "yeni ne var" sorusu geçerli, burada
   * "en çok bekleyen hangisi". Cevapsız kalan ilan, mentör sayfasının
   * çözmesi gereken asıl sorundur.
   */
  const [mentorTalepleri, destekTalepleri, kendiCevaplarim] = await Promise.all([
    prisma.talep.findMany({
      where: {
        kapatildiMi: false,
        sonGecerlilik: { gte: simdi },
        // Onay bekleyen öğrenci ilanı buraya da düşmez (14 Ağustos 2026):
        // mentörün panoda görünmeyen bir ilana cevap yazması, onayı fiilen
        // atlatırdı — cevap ilanın altında yayımlanıyor.
        onayDurumu: { in: PANODA_GORUNEN_ONAY_DURUMLARI },
        tur: "MENTORE_SOR",
      },
      orderBy: { olusturmaTarihi: "asc" },
      take: 60,
      select: {
        id: true,
        tur: true,
        baslik: true,
        icerik: true,
        sonGecerlilik: true,
        acan: { select: acanSecimi },
        cevaplar: cevapSecimi,
      },
    }),
    prisma.talep.findMany({
      where: {
        kapatildiMi: false,
        sonGecerlilik: { gte: simdi },
        onayDurumu: { in: PANODA_GORUNEN_ONAY_DURUMLARI },
        tur: "TEKNIK_DESTEK",
      },
      orderBy: { olusturmaTarihi: "asc" },
      take: 60,
      select: {
        id: true,
        tur: true,
        baslik: true,
        icerik: true,
        sonGecerlilik: true,
        acan: { select: acanSecimi },
        cevaplar: cevapSecimi,
      },
    }),
    prisma.talepCevabi.findMany({
      where: { yazanKullaniciId: kullanici.id, gizlendiMi: false },
      orderBy: { olusturmaTarihi: "desc" },
      take: 30,
      select: {
        id: true,
        icerik: true,
        olusturmaTarihi: true,
        talep: { select: { id: true, baslik: true } },
      },
    }),
  ]);

  const cevapladiklarim = new Set(
    kendiCevaplarim.map((cevap) => cevap.talep.id),
  );

  return (
    <div className="space-y-6">
      {/*
        KIRINTI YOLU (29 Ağustos 2026 · istekler: "navigasyon bunu göstersin
        yönetim paneli / rol envanteri şeklinde" · "yönetim panelindeki tüm
        kartlara uygula").

        Yerinde tek başına "← Yönetim Paneli" bağlantısı vardı: dönülecek
        yeri söylüyor, bulunulan yeri söylemiyordu. Şerit ikisini birden
        basıyor ve panodan açılan HER ekranda aynı biçimde duruyor.

        SON BASAMAK BAĞLANTI DEĞİL (bkz. components/ui.tsx · KirintiYolu);
        SayfaBasligi'nın geri bağlantısı bu yüzden `null` — ikisi bir arada
        aynı yolu üst üste iki kez basardı.
      */}
      <KirintiYolu
        basamaklar={[
          { etiket: "Yönetim Paneli", yol: "/panel/yonetim" },
          { etiket: "Mentörlüğüm" },
        ]}
      />

      <SayfaBasligi
        geri={null}
        baslik="Mentörlüğüm"
        aciklama="Panodaki mentör ve destek taleplerini burada okur, cevabınızı yazarsınız."
      />

      {durum && DURUM_MESAJLARI[durum] && (
        <BilgiKutusu cesit="olumlu">{DURUM_MESAJLARI[durum]}</BilgiKutusu>
      )}
      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}

      <Kart>
        <KartBasligi
          baslik="Mentörlük alanlarım"
          aciklama={mentorKapsamiYaz(
            mentorlugum.grupAdlari,
            mentorlugum.konular,
          )}
          Ikon={GraduationCap}
        />
        <p className="text-metin-yumusak">
          Panodaki mentör havuzunda görünüyorsunuz. Alanlarınızı{" "}
          <Link
            href="/panel/talepler/mentor-basvuru#mentorlugum"
            className="font-medium text-vurgu-metin underline underline-offset-2"
          >
            Pano&apos;daki başvuru bölümünden
          </Link>{" "}
          güncelleyebilirsiniz.
        </p>
      </Kart>

      {/*
        GİZLİLİK UYARISI BURADA DA: mentörün ilk teması bu ekrandan başlıyor ve
        kuralı ilk temasta bilmeli. Metin tek bir sabitten geliyor.
      */}
      <BilgiKutusu cesit="uyari">{GIZLILIK_UYARISI}</BilgiKutusu>

      <Kart>
        <KartBasligi
          baslik="Mentör talepleri"
          aciklama={`${mentorTalepleri.length} açık ilan · en uzun bekleyen üstte`}
          Ikon={GraduationCap}
        />
        {mentorTalepleri.length === 0 ? (
          <p className="text-metin-yumusak">
            Şu an açık bir mentör talebi yok. Yeni talep açıldığında burada
            görünür.
          </p>
        ) : (
          <ul className="space-y-4">
            {mentorTalepleri.map((talep) => (
              <TalepKarti
                key={talep.id}
                talep={talep}
                cevaplarim={cevapladiklarim}
              />
            ))}
          </ul>
        )}
      </Kart>

      <Kart>
        <KartBasligi
          baslik="Destek talepleri"
          aciklama={`${destekTalepleri.length} açık ilan · yardım edebileceğiniz teknik sorular`}
          Ikon={LifeBuoy}
        />
        {destekTalepleri.length === 0 ? (
          <p className="text-metin-yumusak">Şu an açık bir destek talebi yok.</p>
        ) : (
          <ul className="space-y-4">
            {destekTalepleri.map((talep) => (
              <TalepKarti
                key={talep.id}
                talep={talep}
                cevaplarim={cevapladiklarim}
              />
            ))}
          </ul>
        )}
      </Kart>

      {kendiCevaplarim.length > 0 && (
        <Kart>
          <KartBasligi
            baslik="Cevapladıklarım"
            aciklama={`Son ${kendiCevaplarim.length} cevabınız`}
            Ikon={MessageSquare}
          />
          <ul className="divide-y divide-cizgi">
            {kendiCevaplarim.map((cevap) => (
              <li key={cevap.id} className="py-3">
                <p className="text-sm text-metin-yumusak">
                  {tarihSaatYaz(cevap.olusturmaTarihi)} ·{" "}
                  <Link
                    href={`/panel/talepler#talep-${cevap.talep.id}`}
                    className="font-medium text-vurgu-metin underline underline-offset-2"
                  >
                    {cevap.talep.baslik}
                  </Link>
                </p>
                <p className="mt-1 whitespace-pre-line text-metin">
                  {cevap.icerik}
                </p>
              </li>
            ))}
          </ul>
        </Kart>
      )}
    </div>
  );
}
