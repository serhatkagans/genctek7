import { PenLine } from "lucide-react";
import {
  Kart,
  KartBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
  SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import type { TalepTuru } from "@/generated/prisma/enums";
import { TALEP_TURU_ETIKETLERI } from "@/lib/iletisim/kurallar";
import { basHarfler } from "@/lib/mentor/kurallar";
import type { HavuzMentoru } from "@/lib/mentor/veri";
import { uygulamaYolu } from "@/lib/ortam";
import { girdiTarihi } from "@/lib/tarih";
import { talepAcEylemi, talepDuzenleEylemi } from "./eylemler";

/**
 * Pano formları — ilan açma, kategori seçimi ve düzenleme.
 *
 * AYRI DOSYA (14 Ağustos 2026): pano artık formları BARINDIRMIYOR, kartlarla
 * onlara gönderiyor (istek: "panoda kart olsun … en üstte kart olsun o sayfaya
 * gitsin, yani panoda sadece kartlar altında da duyurular olsun"). Formların
 * kendi sayfaları var ve düzenleme formu iki ayrı ekranda (pano ve merkezin
 * onay ekranı) kullanılıyor; tek kopya bu yüzden ortak dosyada duruyor.
 */

/**
 * MENTÖR HAVUZU IZGARASI (11 Ağustos 2026 · istek: "mentör talebi aç kısmında
 * ızgara şeklinde mentörler listelensin").
 *
 * KART BİR BAĞLANTI DEĞİL. Tıklanabilir bir profil bağlantısı vermek, panonun
 * bugün tutmadığı bir sözü verirdi: mentörün profilini görüntüleyecek bir ekran
 * ve onun kapsam kuralı yok. Havuz "kimler var" sorusunu cevaplıyor; temas yine
 * talep açmaktan ve bağlantı isteğinden geçiyor.
 *
 * IZGARA, etkinlik kartlarındaki gibi `auto-fill` ile kuruluyor: mentör sayısı
 * 3 de olabilir 60 da, sabit sütun sayısı ikisinden birinde kötü görünürdü.
 */
export function MentorHavuzu({ mentorler }: { mentorler: HavuzMentoru[] }) {
  if (mentorler.length === 0) {
    return (
      <div className="mt-5 rounded-kart border border-cizgi bg-zemin p-4 text-sm text-metin-yumusak">
        Havuzda henüz onaylanmış mentör yok. Talebinizi yine de açabilirsiniz;
        mentörlük onaylandıkça panodaki ilanınız görülecek.
      </div>
    );
  }

  return (
    <div className="mt-5 border-t border-cizgi pt-4">
      <p className="mb-2 text-sm font-medium text-metin">
        Havuzdaki mentörler{" "}
        <span className="font-normal text-metin-yumusak">
          ({mentorler.length} kişi · talebinizi buradakiler görür)
        </span>
      </p>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-3">
        {mentorler.map((mentor) => (
          <li
            key={mentor.kullaniciId}
            className="flex flex-col items-center rounded-kart border border-cizgi p-3 text-center"
          >
            {mentor.fotografiVarMi ? (
              /*
               * next/image KULLANILMIYOR: kaynak, yetki kontrolü yapan dinamik
               * bir rota (mentorler/[id]/foto) ve optimizasyon katmanı o isteği
               * oturum çerezi olmadan yeniden yapardı — her fotoğraf 404
               * dönerdi.
               */
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={uygulamaYolu(`/panel/mentorler/${mentor.kullaniciId}/foto`)}
                alt=""
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="flex h-12 w-12 items-center justify-center rounded-full bg-vurgu-zemin text-base font-semibold text-vurgu-metin"
              >
                {basHarfler(mentor.adSoyad)}
              </span>
            )}
            <span className="mt-2 text-sm font-medium text-metin">
              {mentor.adSoyad}
            </span>
            <span className="text-xs text-metin-yumusak">{mentor.sifat}</span>
            {mentor.kapsam && (
              <span className="mt-1 text-xs text-vurgu-metin">
                {mentor.kapsam}
              </span>
            )}
            {mentor.ilAdi && (
              <span className="mt-1 text-xs text-metin-yumusak">
                {mentor.ilAdi}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * İlan formu.
 *
 * İKİ KULLANIMI VAR ve farkı KATEGORİ:
 * - Destek / duyuru talebi: kategori kullanıcıya SEÇTİRİLİYOR (14 Ağustos 2026
 *   · istek: "talep oluştururken kategori olsun … teknik destek talebi, duyuru
 *   / tanıtım desteği, ekip arkadaşı arama ve genel").
 * - Mentör talebi: kategori SABİT (`MENTORE_SOR`) ve gizli alanla gidiyor —
 *   ekranın kendisi zaten "mentöre soruyorum" demek.
 *
 * 10 Ağustos'ta kalkan şey tek formda tür seçmek değil, "hangi ekrandayım"
 * belirsizliğiydi; iki ayrı ekran o kararı hâlâ ortadan kaldırıyor.
 */
export function TalepFormu({
  tur,
  kategoriler,
  yerTutucu,
  dugmeMetni,
  simdi,
  azamiGun,
}: {
  /** Sabit tür; kategori seçtiriliyorsa varsayılan seçenektir. */
  tur: TalepTuru;
  /** Verilirse kategori seçim listesi basılır. */
  kategoriler?: TalepTuru[];
  yerTutucu: string;
  dugmeMetni: string;
  simdi: Date;
  azamiGun: number;
}) {
  return (
    <form action={talepAcEylemi} className="space-y-4">
      {kategoriler ? (
        /*
          DÜĞME ŞERİDİ, AÇILIR LİSTE DEĞİL (22 Ağustos 2026 · istek: "Kategori
          liste değil checkbox olsun"). Liste, seçenekleri açılmadan
          göstermiyordu; kişi hangi kategorilerin olduğunu görmek için listeyi
          açmak zorundaydı. Şerit hepsini birden yazıyor — etkinliklerdeki
          "Katılım biçimi" süzgeciyle ve kayıt türü şeridiyle aynı desen.

          `radio`, `checkbox` DEĞİL: bir ilan tek kategoriye açılır. Görünüm
          istekteki kutucuklarla aynı, davranış seçimin gerçeğine uyuyor.
        */
        <fieldset>
          <legend className="text-sm font-medium text-metin">Kategori</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {kategoriler.map((deger) => (
              <label
                key={deger}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-cizgi px-3.5 py-1.5 text-sm font-medium text-metin transition hover:border-vurgu has-checked:border-vurgu has-checked:bg-vurgu-zemin has-checked:text-vurgu-metin"
              >
                <input
                  type="radio"
                  name="tur"
                  value={deger}
                  defaultChecked={deger === tur}
                  className="h-3.5 w-3.5 accent-[var(--renk-birincil)]"
                />
                {TALEP_TURU_ETIKETLERI[deger]}
              </label>
            ))}
          </div>
          {/*
            YARDIM SATIRI KALKTI (25 Ağustos 2026 · istek: "Panodaki arama
            kutusu da bu kategorilere göre süzüyor — bu açıklamayı sil").
            Kategori seçimi burada yapılıyor; panonun aramasının nasıl
            çalıştığı formu dolduranın kararına hiçbir şey katmıyordu.
          */}
        </fieldset>
      ) : (
        <input type="hidden" name="tur" value={tur} />
      )}
      <label className="block">
        <span className="text-sm font-medium text-metin">Başlık</span>
        <input
          type="text"
          name="baslik"
          required
          maxLength={200}
          className={SINIF_GIRDI}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-metin">Talep metni</span>
        <textarea
          name="icerik"
          required
          rows={4}
          maxLength={2000}
          placeholder={yerTutucu}
          className={SINIF_GIRDI}
        />
        {/*
          İLETİŞİM BİLGİSİ UYARISI KALKTI (22 Ağustos 2026 · istek). Uyarıydı,
          kural değil: metne telefon yazılmasını engelleyen bir denetim zaten
          yoktu ve kaldırılması hiçbir davranışı değiştirmiyor. Bağlantı
          onaylandığında yazışma yine sistem üzerinden sürüyor.
        */}
      </label>
      <label className="block sm:w-64">
        {/*
          ETİKET EKRANDAN KALKTI (22 Ağustos 2026 · istek). Altındaki satır
          alanın ne olduğunu zaten söylüyor ("süresi dolunca ilan panodan
          düşer"). `aria-label` kalıyor: görünen etiketi kaldırmak, tarih
          alanını ekran okuyucuda adsız bırakmak değil.
        */}
        <input
          type="date"
          name="sonGecerlilik"
          required
          aria-label="Son geçerlilik"
          defaultValue={girdiTarihi(new Date(simdi.getTime() + 30 * 86_400_000))}
          className={SINIF_GIRDI}
        />
        {/*
          "EN FAZLA N GÜN…" SATIRI KALKTI (22 Ağustos 2026 · istek). SINIR
          DURUYOR: sunucu tarihi hâlâ `azamiGun` ile sınırlıyor ve süresi dolan
          ilan panodan düşüyor (bkz. talepAcEylemi). Kalkan yalnızca metin —
          sınırı aşan bir tarih artık önceden söylenmiş olmadan reddedilir.
        */}
      </label>
      <button type="submit" className={SINIF_BIRINCIL_BUTON}>
        {dugmeMetni}
      </button>
    </form>
  );
}

export interface DuzenlenecekIlan {
  id: number;
  tur: TalepTuru | null;
  baslik: string;
  icerik: string;
  sonGecerlilik: Date;
}

/**
 * İLAN DÜZENLEME FORMU (14 Ağustos 2026 · istek: "açılan ilanlar
 * düzenlenebilsin, açan kişi ve proje yöneticisi düzenleyebilsin").
 *
 * AÇILIR/KAPANIR (`<details>`): düzenleme günlük bir iş değil ve her satırın
 * altında açık duran bir form, listeyi okunmaz hâle getirirdi. Ayrı bir
 * düzenleme SAYFASI da yapılmadı — kişi ilanını listede görüp orada
 * düzeltebilmeli, tek satır için ekran değiştirmemeli.
 *
 * TETİKLEYİCİ DÜĞME GİBİ GÖRÜNÜYOR (14 Ağustos 2026 · geri bildirim: "pano
 * ilanlarını düzenleme koymamışsın, proje yöneticisine sil var"). Form baştan
 * beri buradaydı ama tetikleyicisi, yanındaki "İlanı sil" düğmesinin altında
 * kalan düz bir metin satırıydı: aynı satırda bir düğme ve bir metin varsa,
 * kullanıcı yalnızca düğmeyi eylem sayıyor. İkisi artık aynı biçimde.
 *
 * KATEGORİ LİSTESİ İLANIN KENDİ TÜRÜNÜ DE İÇERİR: artık açılamayan türdeki
 * (sponsor, mentöre sor) eski ilanlar da düzenlenebilsin diye. Sunucu tarafı
 * aynı kuralı uyguluyor (bkz. talepDuzenleEylemi).
 */
export function IlanDuzenlemeFormu({
  talep,
  kategoriler,
  donus,
  onayUyarisi,
}: {
  talep: DuzenlenecekIlan;
  kategoriler: TalepTuru[];
  /** Eylemin dönüş adresi: pano ya da merkezin onay ekranı. */
  donus: "pano" | "onaylar";
  /** Sahibine, düzenlemenin ilanı yeniden onaya düşüreceğini söyler. */
  onayUyarisi?: boolean;
}) {
  const secenekler = talep.tur
    ? [...new Set([...kategoriler, talep.tur])]
    : kategoriler;

  return (
    <details className="mt-2">
      <summary
        className={`${SINIF_IKINCIL_BUTON} cursor-pointer list-none select-none`}
      >
        <PenLine size={16} aria-hidden />
        İlanı düzenle
      </summary>
      <form action={talepDuzenleEylemi} className="mt-3 space-y-3">
        <input type="hidden" name="talepId" value={talep.id} />
        <input type="hidden" name="donus" value={donus} />
        <label className="block sm:w-80">
          <span className="text-sm font-medium text-metin">Kategori</span>
          <select
            name="tur"
            defaultValue={talep.tur ?? kategoriler[0]}
            className={SINIF_GIRDI}
          >
            {secenekler.map((deger) => (
              <option key={deger} value={deger}>
                {TALEP_TURU_ETIKETLERI[deger]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-metin">Başlık</span>
          <input
            type="text"
            name="baslik"
            required
            maxLength={200}
            defaultValue={talep.baslik}
            className={SINIF_GIRDI}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-metin">İlan metni</span>
          <textarea
            name="icerik"
            required
            rows={4}
            maxLength={2000}
            defaultValue={talep.icerik}
            className={SINIF_GIRDI}
          />
        </label>
        <label className="block sm:w-64">
          {/* Etiket ekrandan kalktı (yukarıdaki notla aynı gerekçe). */}
          <input
            type="date"
            name="sonGecerlilik"
            required
            aria-label="Son geçerlilik"
            defaultValue={girdiTarihi(talep.sonGecerlilik)}
            className={SINIF_GIRDI}
          />
        </label>
        {onayUyarisi && (
          <p className="text-sm text-metin-yumusak">
            Düzenlenen ilan yeniden proje yöneticisinin onayına düşer ve karar
            verilene kadar panoda görünmez.
          </p>
        )}
        <button type="submit" className={SINIF_IKINCIL_BUTON}>
          Değişikliği kaydet
        </button>
      </form>
    </details>
  );
}

/** Form sayfalarının ortak kabuğu: başlık kartı + form. */
export function FormKarti({
  baslik,
  aciklama,
  Ikon,
  children,
}: {
  baslik: string;
  /** Başlığın altındaki satır; yazılmazsa hiç basılmaz. */
  aciklama?: string;
  Ikon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Kart>
      <KartBasligi baslik={baslik} aciklama={aciklama} Ikon={Ikon} />
      {children}
    </Kart>
  );
}
