import {
  Camera,
  FileText,
  GraduationCap,
  Layers,
  Link2,
  Mail,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import type { KazanimTipi } from "@/generated/prisma/enums";
import { KayitTuruSecici } from "@/components/KayitTuruSecici";
import {
  KazanimListesi,
  type KazanimSatiri,
} from "@/components/OgrenciProfilBolumleri";
import {
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
  SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import {
  ETKINLIK_KATEGORISI_ETIKETLERI,
  TEMEL_ETKINLIK_GRUPLARI,
} from "@/lib/faaliyet/kurallar";
import {
  KATILIM_BICIMI_ETIKETLERI,
  KATILIM_BICIMLERI,
  type KazanimGrubu,
  type KazanimSahibi,
  type KazanimTipiTanimi,
  kazanimTipleri,
} from "@/lib/kazanim/kurallar";
import { KATKI_ACIKLAMASI_AZAMI } from "@/lib/dis-kimlik/profil-kurallar";
import {
  type BaglantiAlani,
  BAGLANTI_TANIMLARI,
} from "@/lib/ogrenci/iletisim-kurallar";
import { basHarfler, profilFotoTipAdlari } from "@/lib/kullanici/profil-foto-kurallar";
import {
  MENTOR_KONULARI_AZAMI,
  MENTORLUK_DURUM_ETIKETLERI,
  MENTORLUK_DURUM_SINIFLARI,
} from "@/lib/mentor/kurallar";
import { cvTipAdlari } from "@/lib/ogrenci/cv-kurallar";
import { uygulamaYolu } from "@/lib/ortam";
import { tarihSaatYaz } from "@/lib/tarih";

/**
 * Profil bilgilerinin DÜZENLENDİĞİ bölümler (C4 · 7 Ağustos 2026).
 *
 * ---------------------------------------------------------------------------
 * NEDEN AYRI DOSYA
 * ---------------------------------------------------------------------------
 * Formlar 7 Ağustos 2026'da profilden panele taşındı; 20 Ağustos'ta iki ekran
 * tamamen birleşti ve `/panel` hem gösteren hem düzenleyen tek yüzey oldu
 * (istek: "panel ile profil birleşecek tek panel kalacak, düzenleme ve
 * görüntüleme panelden olacak").
 *
 * Formlar Panel sayfasının içine gömülseydi o dosya iki bine yaklaşırdı;
 * buraya alınınca Panel bölümleri sıralamakla kalıyor.
 *
 * Bölümler KART BASMAZ: hepsi Panelim'de `KatlanabilirKart` içinde duruyor ve
 * kart içinde kart iç içe çerçeve üretirdi (DanismanSecimi ile aynı desen).
 *
 * Eylemler PROP olarak geliyor, doğrudan içe aktarılmıyor: bileşen
 * `src/components` altında, eylemler `src/app/panel/profil` altında. Aynı
 * desen DanismanSecimi ve RotamKarti'nda da kullanılıyor.
 */

type Eylem = (veri: FormData) => Promise<void>;

// ---------------------------------------------------------------------------
// Fotoğraf
// ---------------------------------------------------------------------------

export interface FotoSinirlari {
  izinliTipler: string[];
  maksBayt: number;
}

export function FotografDuzenleme({
  ad,
  soyad,
  fotoAdresi,
  sinirlar,
  yukleEylemi,
  silEylemi,
}: {
  ad: string;
  soyad: string;
  /** Sürüm damgalı adres; yoksa baş harfler basılır. */
  fotoAdresi: string | null;
  sinirlar: FotoSinirlari;
  yukleEylemi: Eylem;
  silEylemi: () => Promise<void>;
}) {
  return (
    <div className="flex flex-wrap items-start gap-6">
      <ProfilFotografi ad={ad} soyad={soyad} adres={fotoAdresi} />

      <div className="min-w-60 grow space-y-3">
        <form action={yukleEylemi} className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-metin">
              {fotoAdresi ? "Fotoğrafı değiştir" : "Fotoğraf yükle"}
            </span>
            <input
              type="file"
              name="foto"
              required
              accept={sinirlar.izinliTipler.join(",")}
              className={SINIF_GIRDI}
            />
            <span className="mt-1 block text-sm text-metin-yumusak">
              {profilFotoTipAdlari(sinirlar.izinliTipler)} · en fazla{" "}
              {(sinirlar.maksBayt / (1024 * 1024)).toFixed(0)} MB
            </span>
          </label>
          <button type="submit" className={SINIF_BIRINCIL_BUTON}>
            Yükle
          </button>
        </form>

        {fotoAdresi && (
          <form action={silEylemi}>
            <button type="submit" className={SINIF_IKINCIL_BUTON}>
              <Trash2 size={16} aria-hidden />
              Fotoğrafı kaldır
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/**
 * Fotoğrafın kendisi — profilde ve düzenleme bölümünde AYNI bileşenden basılır.
 *
 * `next/image` KULLANILMIYOR: optimizasyon görseli kendi sunucusundan çekmeye
 * çalışır, oysa bu dosya public dizinde değil oturum arkasında bir rotadan
 * geliyor. Boyut zaten 112px ve üst sınır 2 MB.
 *
 * Fotoğraf yoksa boş kare değil BAŞ HARFLER gösteriliyor: "henüz yüklenmedi"
 * ile "yüklendi ama gösterilemiyor" ayırt edilebilsin.
 */
export function ProfilFotografi({
  ad,
  soyad,
  adres,
}: {
  ad: string;
  soyad: string;
  adres: string | null;
}) {
  if (!adres) {
    return (
      <div
        aria-hidden
        className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full border border-cizgi bg-zemin text-2xl font-semibold text-metin-yumusak"
      >
        {basHarfler(ad, soyad)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={adres}
      alt="Profil fotoğrafınız"
      width={112}
      height={112}
      className="h-28 w-28 shrink-0 rounded-full border border-cizgi object-cover"
    />
  );
}

// ---------------------------------------------------------------------------
// İletişim bilgileri
// ---------------------------------------------------------------------------

export interface IletisimDegerleri {
  eposta: string | null;
  telefon: string | null;
}

/** Dış kullanıcının profil alanları — `ogretmen_profil` sütunlarıyla aynı ad. */
export interface KurumBilgileri {
  kurumAdi: string | null;
  gorevUnvani: string | null;
  aciklama: string | null;
}

export function IletisimDuzenleme({
  iletisim,
  baglantilar,
  kurumBilgileri,
  ogrenci,
  kaydetEylemi,
}: {
  iletisim: IletisimDegerleri | null;
  /**
   * Mesleki bağlantı adresleri.
   *
   * ÖĞRENCİ VE DIŞ KULLANICIDA sorulur; sütunlar iki ayrı tabloda ama alan
   * adları aynı (`ogrenci_profil` / `ogretmen_profil`). Öğretmen ve
   * koordinatörde sorulmaz: onların GençTek'teki yeri okulları ve görevleriyle
   * belli, GitHub adresi sistemin işine yaramıyor. Dış kullanıcıda tam tersi.
   *
   * Tip yalnızca BAĞLANTI alanlarını istiyor, tüm profil satırını değil:
   * çağıran satırın tamamını geçebilir (fazla alanlar yok sayılır) ama
   * bileşen başka bir sütuna erişemez.
   */
  baglantilar: Partial<Record<BaglantiAlani, string | null>> | null;
  /**
   * Dış kullanıcının kurumu, görevi ve katkı açıklaması (7 Ağustos 2026).
   * Verilmezse bu alanlar hiç basılmaz — öğrencinin ve öğretmenin kurumu
   * kimlik bilgilerinden gelir, elle yazılmaz.
   */
  kurumBilgileri?: KurumBilgileri | null;
  ogrenci: boolean;
  kaydetEylemi: Eylem;
}) {
  const baglantiSorulsun = ogrenci || Boolean(kurumBilgileri);

  return (
    <form action={kaydetEylemi} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-metin">E-posta</span>
          <input
            type="email"
            name="eposta"
            defaultValue={iletisim?.eposta ?? ""}
            className={SINIF_GIRDI}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-metin">Telefon</span>
          <input
            type="tel"
            name="telefon"
            defaultValue={iletisim?.telefon ?? ""}
            className={SINIF_GIRDI}
          />
        </label>
      </div>

      {/*
        KURUM VE GÖREV yalnızca dış kullanıcıda ve SERBEST METİN.
        Paydaş envanterinden seçtirilmedi: envanter, etkinliklerde iş birliği
        yapılan kurumların kaydıdır ve il koordinatörlerince yönetilir (S18);
        mezunun çalıştığı şirketin oraya girmesi gerekmiyor.
      */}
      {kurumBilgileri && (
        <div className="grid gap-4 border-t border-cizgi pt-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-metin">Kurum</span>
            <input
              type="text"
              name="kurumAdi"
              maxLength={150}
              placeholder="Çalıştığınız kurum ya da şirket"
              defaultValue={kurumBilgileri.kurumAdi ?? ""}
              className={SINIF_GIRDI}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-metin">Görevi</span>
            <input
              type="text"
              name="gorevUnvani"
              maxLength={150}
              placeholder="Yazılım mühendisi, Ar-Ge sorumlusu…"
              defaultValue={kurumBilgileri.gorevUnvani ?? ""}
              className={SINIF_GIRDI}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-metin">
              Açıklamalar · katkı sağlayabileceğim şeyler
            </span>
            <textarea
              name="aciklama"
              rows={4}
              maxLength={KATKI_ACIKLAMASI_AZAMI}
              placeholder="Hangi konularda destek verebilirsiniz? Mekân, eğitmen, staj, sponsorluk, teknik danışmanlık…"
              defaultValue={kurumBilgileri.aciklama ?? ""}
              className={SINIF_GIRDI}
            />
            <span className="mt-1 block text-sm text-metin-yumusak">
              Profilinizde görünür; sizinle iletişime geçmek isteyenler burayı
              okur. En fazla {KATKI_ACIKLAMASI_AZAMI} karakter.
            </span>
          </label>
        </div>
      )}

      {baglantiSorulsun && (
        <fieldset className="space-y-4 border-t border-cizgi pt-4">
          <legend className="flex items-center gap-2 text-sm font-medium text-metin">
            <Link2 size={15} aria-hidden />
            Bağlantılarım
          </legend>
          <p className="text-sm text-metin-yumusak">
            {ogrenci
              ? "İsteğe bağlıdır. Girdiğiniz adresleri danışmanınız, il koordinatörünüz ve proje yöneticisi profilinizde görür."
              : "İsteğe bağlıdır. Girdiğiniz adresler profilinizde görünür."}{" "}
            &quot;https://&quot; yazmasanız da olur.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {BAGLANTI_TANIMLARI.map((tanim) => (
              <label key={tanim.alan} className="block">
                <span className="text-sm font-medium text-metin">
                  {tanim.etiket}
                </span>
                <input
                  type="text"
                  name={tanim.alan}
                  maxLength={200}
                  placeholder={tanim.ornek}
                  defaultValue={baglantilar?.[tanim.alan] ?? ""}
                  className={SINIF_GIRDI}
                />
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <button type="submit" className={SINIF_BIRINCIL_BUTON}>
        Kaydet
      </button>
    </form>
  );
}

/**
 * Katkı verebileceği çalışma gruplarının seçimi (7 Ağustos 2026).
 *
 * MENTÖRLÜK FORMUNDAN AYRI: orası onaya giden bir başvurudur ve gönderim
 * mevcut kaydı BEKLIYOR'a düşürür. Burası yalnızca bir beyandır — kaydet,
 * bitti. İkisi tek forma alınsaydı destek alanını güncellemek isteyen kişi
 * onaylı mentörlüğünü de yeniden onaya düşürürdü.
 */
export function DestekGruplariDuzenleme({
  gruplar,
  seciliGrupIdleri,
  kaydetEylemi,
}: {
  gruplar: { id: number; ad: string }[];
  seciliGrupIdleri: number[];
  kaydetEylemi: Eylem;
}) {
  const secili = new Set(seciliGrupIdleri);

  return (
    <form action={kaydetEylemi} className="space-y-4">
      <fieldset>
        <legend className="text-sm font-medium text-metin">
          Hangi çalışma gruplarına katkı verebilirsiniz?
        </legend>
        <p className="mt-1 mb-2 text-sm text-metin-yumusak">
          Birden fazla seçebilirsiniz. Seçiminiz profilinizde görünür; kimseye
          erişim açmaz ve onay gerektirmez.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {gruplar.map((grup) => (
            <label
              key={grup.id}
              className="flex items-center gap-2 rounded-md border border-cizgi px-3 py-2 text-sm text-metin"
            >
              <input
                type="checkbox"
                name="calismaGrubuId"
                value={grup.id}
                defaultChecked={secili.has(grup.id)}
                className="h-4 w-4 rounded border-cizgi accent-[var(--renk-birincil)]"
              />
              {grup.ad}
            </label>
          ))}
        </div>
      </fieldset>

      <button type="submit" className={SINIF_BIRINCIL_BUTON}>
        <Layers size={15} aria-hidden />
        Kaydet
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Danışman öğretmenliği (öğretmenin kendi işareti)
// ---------------------------------------------------------------------------

export function DanismanlikDuzenleme({
  gorevAliyorMu,
  eylem,
}: {
  gorevAliyorMu: boolean;
  eylem: Eylem;
}) {
  return (
    <>
      <form action={eylem}>
        <input
          type="hidden"
          name="gorevAlmakIstiyor"
          value={gorevAliyorMu ? "hayir" : "evet"}
        />
        {gorevAliyorMu ? (
          <div className="flex flex-wrap items-center gap-4">
            <p className="inline-flex items-center gap-2 rounded-full bg-olumlu-zemin px-3 py-1 text-sm font-medium text-olumlu-metin">
              <ShieldCheck size={15} aria-hidden />
              Danışman öğretmen olarak görev alıyorsunuz.
            </p>
            <button type="submit" className={SINIF_IKINCIL_BUTON}>
              Görevi bırak
            </button>
          </div>
        ) : (
          <button type="submit" className={SINIF_BIRINCIL_BUTON}>
            GençTek danışman öğretmeni olarak görev almak istiyorum
          </button>
        )}
      </form>
      {gorevAliyorMu && (
        <p className="mt-3 text-sm text-metin-yumusak">
          Görevi bıraktığınızda danışmanlığınızdaki öğrenciler okuldaki diğer
          danışmanlara ya da il koordinatörüne devredilir.
        </p>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Mentörlük
// ---------------------------------------------------------------------------

export interface MentorlukDurumuGorunumu {
  durum: "BEKLIYOR" | "ONAYLANDI" | "REDDEDILDI" | "BIRAKILDI";
  konular: string | null;
  retGerekcesi: string | null;
  seciliGrupIdleri: number[];
}

/**
 * "Mentör başvurusu yap" (7 Ağustos 2026).
 *
 * İstek: "Öğretmen hesabında 'mentör başvurusu yap' bölümü ekleyelim. hangi
 * çalışma grubunda mentörlük yapabilir seçsin. hatta mümkünse diğer mentörlük
 * konuları ekleyebilsin?"
 *
 * Form HER DURUMDA basılır — reddedilmiş ya da bırakılmış bir mentörlük
 * yeniden başvurulabilir olmalı; kaydın durumunu gösterip formu gizlemek,
 * kişiyi çıkışsız bir ekranda bırakırdı. Gönderim mevcut kaydı BEKLIYOR'a
 * döndürür.
 *
 * Seçim ÇOKLU: bir öğretmen hem robotikte hem siber güvenlikte mentörlük
 * yapabilir. Serbest konu alanı, sabit grup listesinin taşımadığı her şey
 * için (istekteki "diğer mentörlük konuları").
 */
export function MentorlukDuzenleme({
  mevcut,
  gruplar,
  basvurEylemi,
  birakEylemi,
}: {
  mevcut: MentorlukDurumuGorunumu | null;
  gruplar: { id: number; ad: string }[];
  basvurEylemi: Eylem;
  birakEylemi: () => Promise<void>;
}) {
  const secili = new Set(mevcut?.seciliGrupIdleri ?? []);

  return (
    <>
      {mevcut && (
        <div className="mb-5 rounded-kart border border-cizgi bg-zemin p-4">
          <p className="text-sm font-medium text-metin">
            Başvuru durumunuz:{" "}
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${MENTORLUK_DURUM_SINIFLARI[mevcut.durum]}`}
            >
              {MENTORLUK_DURUM_ETIKETLERI[mevcut.durum]}
            </span>
          </p>
          {mevcut.durum === "REDDEDILDI" && mevcut.retGerekcesi && (
            <p className="mt-2 text-sm text-hata-metin">
              Gerekçe: {mevcut.retGerekcesi}
            </p>
          )}
          {mevcut.durum === "ONAYLANDI" && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-sm text-metin-yumusak">
                Panodaki &quot;Mentöre sor&quot; ilanlarında mentör olarak
                görünüyorsunuz.
              </p>
              <form action={birakEylemi}>
                <button type="submit" className={SINIF_IKINCIL_BUTON}>
                  Mentörlüğü bırak
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      <form action={basvurEylemi} className="space-y-4">
        <fieldset>
          <legend className="text-sm font-medium text-metin">
            Hangi çalışma gruplarında mentörlük yapabilirsiniz?
          </legend>
          {/*
            ZORUNLU OLDUĞU BURADA YAZIYOR (21 Ağustos 2026 · istek: "listeden
            bir tik seçmeden başvurusu onaylanmasın"). Kuralı yalnızca sunucu
            uygulasaydı kişi formu gönderdikten SONRA hatayla karşılaşırdı;
            kural yine sunucuda (bkz. mentorlukKabulEdilirMi), bu satır onu
            önceden söylüyor.
          */}
          <p className="mt-1 mb-2 text-sm text-metin-yumusak">
            En az bir grup işaretleyin; birden fazla seçebilirsiniz.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {gruplar.map((grup) => (
              <label
                key={grup.id}
                className="flex items-center gap-2 rounded-md border border-cizgi px-3 py-2 text-sm text-metin"
              >
                <input
                  type="checkbox"
                  name="calismaGrubuId"
                  value={grup.id}
                  defaultChecked={secili.has(grup.id)}
                  className="h-4 w-4 rounded border-cizgi accent-[var(--renk-birincil)]"
                />
                {grup.ad}
              </label>
            ))}
          </div>
        </fieldset>

        {/*
          ETİKET "UZMANLIĞINIZ VE YETKİNLİĞİNİZ" (13 Ağustos 2026 · istek:
          "mentörlükte yazan Diğer mentörlük konularınız yerine uzmanlığınız ve
          yetkinliğiniz hakkında bilgilendiriniz yazsın").

          "(listede olmayanlar)" KALKTI (21 Ağustos 2026 · istek: "buradaki
          listede olmayanları kaldıralım · Bizleri bilgilendiriniz.,
          kullandığınız programlar deneyimleriniz, katıldığınız organizasyonlar
          vb yazsın").

          Alan artık yukarıdaki listenin ARTIĞI değil: grup seçimi neyi
          yapabildiğini söylüyor, bu alan bunu neye dayanarak söylediğini —
          kullanılan programlar, deneyim, katılınan organizasyonlar. Panoda
          mentörü seçen öğrencinin okuduğu satır da bu.
        */}
        <label className="block">
          <span className="text-sm font-medium text-metin">
            Uzmanlığınız ve yetkinliğiniz hakkında bilgilendiriniz
          </span>
          <span className="mt-1 mb-2 block text-sm text-metin-yumusak">
            Bizleri bilgilendiriniz: kullandığınız programlar, deneyimleriniz,
            katıldığınız organizasyonlar vb.
          </span>
          <textarea
            name="konular"
            rows={3}
            maxLength={MENTOR_KONULARI_AZAMI}
            placeholder="Fusion 360 ve Arduino ile çalışıyorum; TEKNOFEST 2025 robotik yarışmasına katıldım…"
            defaultValue={mevcut?.konular ?? ""}
            className={SINIF_GIRDI}
          />
        </label>

        <button type="submit" className={SINIF_BIRINCIL_BUTON}>
          <GraduationCap size={15} aria-hidden />
          {mevcut ? "Başvurumu güncelle" : "Mentör başvurusu yap"}
        </button>
        <p className="text-sm text-metin-yumusak">
          Başvurunuz proje yöneticisinin onayına
          gider. Güncelleme, onaylanmış bir başvuruyu yeniden onaya düşürür.
        </p>
      </form>
    </>
  );
}

// ---------------------------------------------------------------------------
// CV
// ---------------------------------------------------------------------------

export interface CvDurumu {
  cvDosyaAdi: string | null;
  cvYuklenmeTarihi: Date | null;
}

export function CvDuzenleme({
  cv,
  kullaniciId,
  ogrenci = true,
  izinliTipler,
  yukleEylemi,
  silEylemi,
}: {
  cv: CvDurumu | null;
  kullaniciId: number;
  /** İndirme rotası role göre değişir (7 Ağustos 2026 · öğretmen CV'si). */
  ogrenci?: boolean;
  izinliTipler: string[];
  yukleEylemi: Eylem;
  silEylemi: () => Promise<void>;
}) {
  const cvVar = Boolean(cv?.cvDosyaAdi);
  const cvYolu = ogrenci
    ? `/panel/ogrenciler/${kullaniciId}/cv`
    : `/panel/ogretmenler/${kullaniciId}/cv`;

  return (
    <>
      <p className="mb-4 text-sm text-metin-yumusak">
        Kabul edilen biçimler: {cvTipAdlari(izinliTipler)}.
      </p>

      {cvVar && cv && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-kart border border-cizgi bg-zemin p-4">
          {/*
            Yeni sekmede açılır (7 Ağustos 2026 · istek). `<Link>` değil `<a>`:
            hedef bir rota, sayfa değil — ham `<a href>` basePath almadığı için
            `uygulamaYolu()` şart.
          */}
          <a
            href={uygulamaYolu(cvYolu)}
            target="_blank"
            rel="noopener noreferrer"
            className={SINIF_IKINCIL_BUTON}
          >
            <FileText size={15} aria-hidden />
            {cv.cvDosyaAdi}
          </a>
          <span className="text-sm text-metin-yumusak">
            {cv.cvYuklenmeTarihi
              ? `${tarihSaatYaz(cv.cvYuklenmeTarihi)} tarihinde yüklendi`
              : ""}
          </span>
          <form action={silEylemi} className="ml-auto">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md border border-cizgi px-2.5 py-1.5 text-sm font-medium text-metin-yumusak transition hover:bg-kart hover:text-hata-metin"
            >
              <Trash2 size={14} aria-hidden />
              Kaldır
            </button>
          </form>
        </div>
      )}

      <form action={yukleEylemi} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-metin">
            {cvVar ? "Yeni CV yükle" : "CV dosyası"}
          </span>
          <input
            type="file"
            name="cv"
            required
            accept={izinliTipler.join(",")}
            className="mt-1 block w-full text-sm text-metin file:mr-3 file:rounded-md file:border file:border-cizgi file:bg-kart file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-metin"
          />
        </label>
        {cvVar && (
          <p className="text-sm text-metin-yumusak">
            Yeni dosya mevcut CV&apos;nizin yerine geçer; eski sürüm saklanmaz.
          </p>
        )}
        <button type="submit" className={SINIF_BIRINCIL_BUTON}>
          {cvVar ? "CV'yi değiştir" : "CV yükle"}
        </button>
      </form>
    </>
  );
}

// ---------------------------------------------------------------------------
// Kazanım kayıtları: ekleme formu + mevcut kayıtların yönetimi
// ---------------------------------------------------------------------------

export interface KayitProgrami {
  id: number;
  ad: string;
  grup: (typeof TEMEL_ETKINLIK_GRUPLARI)[number];
}

export interface BelgeSinirlari {
  gorselMaksBayt: number;
  belgeMaksBayt: number;
}

/**
 * BİR GRUBUN kendi "yeni kayıt ekle" formu.
 *
 * Profilden Panelim'e TAŞINDI (7 Ağustos 2026), kopyalanmadı: aynı kaydın iki
 * ayrı formdan girilmesi, birine eklenen alanın öbüründe eksik kalması
 * demek olurdu.
 *
 * HER BAŞLIK KENDİ FORMUNU BASIYOR (21 Ağustos 2026 · istek: "ürünlerim
 * altında kendi formu, deneyimlerim altında kendi formu, gençtek yolculuğum
 * altında kendi formu olacak; bu üç başlık için ortak form olmasın").
 *
 * ÖNCESİ: tek bir form vardı, üstünde bütün grupların sekmeleri sıralanıyordu
 * ve hangi başlığa kayıt girildiği yalnızca seçili sekmeden anlaşılıyordu.
 * Başlıklar formun sahibi değil, formun ayarı gibi duruyordu. Şimdi bölüm
 * neyse form odur; sayfa grupları dolaşıp her birine bunu basıyor
 * (bkz. kayitEklemeGruplari · app/panel/bilisim-yolculugum).
 *
 * BİLEŞEN YİNE TEK: alanları tanımlayan yer burası. Üç forma üç ayrı JSX
 * yazılsaydı, birine eklenen alan öbürlerinde eksik kalırdı — dosyanın en
 * baştaki kararı bu.
 *
 * Sayfada JAVASCRIPT YOK: türe göre alan gösterip gizlemenin yolu olmadığı
 * için form, seçili tür neyse sunucuda ona göre basılır ve tür adreste taşınır
 * (`?tur=...`). Bu yüzden tek tipli gruplarda (Ürünlerim, Topluluklarım,
 * GençTek) hiç tür seçimi basılmaz: seçecek bir şey yok.
 */
export function KayitEklemeFormu({
  grup,
  tanimlar,
  seciliTanim,
  programlar,
  izinliBelgeTipleri,
  belgeSinirlari,
  ekleEylemi,
}: {
  grup: KazanimGrubu;
  /** Grubun elle girilebilen tipleri; biri seçili olan. */
  tanimlar: KazanimTipiTanimi[];
  seciliTanim: KazanimTipiTanimi;
  programlar: KayitProgrami[];
  izinliBelgeTipleri: string[];
  belgeSinirlari: BelgeSinirlari;
  ekleEylemi: Eylem;
}) {
  return (
    <>
      {/*
        ÇOK TİPLİ GRUPTA LİSTE (10 Ağustos 2026 · istek: "Deneyimlerim … bunu 4
        ayrı seçenek olmasın, formda aşağı açılan listeden seçsin"). Tipler
        BİRLEŞMEDİ — alan kuralları tipe göre değişiyor — yalnızca seçim biçimi
        değişti. Liste artık kendi bölümünün içinde: seçilen tür yalnızca bu
        formu değiştiriyor, öbür başlıkların formuna dokunmuyor.
      */}
      {tanimlar.length > 1 && (
        <div className="mb-4">
          <span className="block text-sm font-medium text-metin">
            Kayıt türü
          </span>
          <div className="mt-1.5">
            <KayitTuruSecici
              etiket={grup.baslik}
              secenekler={tanimlar.map((tanim) => ({
                tip: tanim.tip,
                baslik: tanim.baslik,
              }))}
              seciliTip={seciliTanim.tip}
            />
          </div>
        </div>
      )}

      <p className="mb-4 text-sm text-metin-yumusak">{seciliTanim.aciklama}</p>

      <form action={ekleEylemi} className="space-y-4">
        <input type="hidden" name="tip" value={seciliTanim.tip} />

        <div className="grid gap-4 sm:grid-cols-2">
          {/*
            GençTek etkinliği listeden seçilir; "Diğer" bırakılırsa ad serbest
            yazılır. İki alan da AYNI ANDA basılır — sunucu hangisinin
            dolduğuna bakıp adı ona göre belirler.
          */}
          {seciliTanim.programSecimiVarMi && (
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-metin">
                GençTek etkinliği
              </span>
              <select
                name="temelEtkinlikProgramiId"
                defaultValue=""
                className={SINIF_GIRDI}
              >
                <option value="">Diğer — adını aşağıya kendim yazacağım</option>
                {TEMEL_ETKINLIK_GRUPLARI.map((grup) => (
                  <optgroup key={grup} label={ETKINLIK_KATEGORISI_ETIKETLERI[grup]}>
                    {programlar
                      .filter((program) => program.grup === grup)
                      .map((program) => (
                        <option key={program.id} value={program.id}>
                          {program.ad}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>
          )}

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-metin">
              {seciliTanim.baslikEtiketi}
              {seciliTanim.programSecimiVarMi && (
                <span className="ml-1 font-normal text-metin-yumusak">
                  (yalnızca &quot;Diğer&quot; seçtiyseniz)
                </span>
              )}
            </span>
            <input
              type="text"
              name="baslik"
              required={!seciliTanim.programSecimiVarMi}
              maxLength={250}
              placeholder={seciliTanim.baslikOrnegi}
              className={SINIF_GIRDI}
            />
          </label>

          {/*
            "Belirtmek istemiyorum" KALDIRILDI ve alan zorunlu oldu. Boş seçenek
            yerine seçilemez bir yer tutucu duruyor: `required` tek başına, ilk
            seçenek geçerli bir değer olduğunda hiçbir şey yapmazdı.
          */}
          {seciliTanim.katilimBicimiVarMi && (
            <label className="block">
              <span className="text-sm font-medium text-metin">
                Katılım biçimi
              </span>
              <select
                name="katilimBicimi"
                required
                defaultValue=""
                className={SINIF_GIRDI}
              >
                <option value="" disabled>
                  Seçiniz
                </option>
                {KATILIM_BICIMLERI.map((bicim) => (
                  <option key={bicim} value={bicim}>
                    {KATILIM_BICIMI_ETIKETLERI[bicim]}
                  </option>
                ))}
              </select>
            </label>
          )}

          {seciliTanim.hedefKitleVarMi && (
            <label className="block">
              <span className="text-sm font-medium text-metin">Hedef kitle</span>
              <input
                type="text"
                name="hedefKitle"
                maxLength={200}
                placeholder="9. sınıflar, veliler, öğretmenler"
                className={SINIF_GIRDI}
              />
            </label>
          )}

          {seciliTanim.duzenleyenVarMi && (
            <label className="block">
              <span className="text-sm font-medium text-metin">
                Düzenleyen kurum
              </span>
              <input
                type="text"
                name="duzenleyen"
                maxLength={200}
                className={SINIF_GIRDI}
              />
            </label>
          )}

          {/*
            ÜRÜNE ÖZGÜ ALANLAR (D5). PROGRAM DOSYASI YÜKLENMİYOR — istek
            "şimdilik sadece tanıtım yapsınlar" diyor.
          */}
          {seciliTanim.urunAlanlariVarMi && (
            <>
              <label className="block">
                <span className="text-sm font-medium text-metin">
                  Geliştiren ekip{" "}
                  <span className="font-normal text-metin-yumusak">
                    (isteğe bağlı)
                  </span>
                </span>
                <input
                  type="text"
                  name="gelistirenEkip"
                  maxLength={250}
                  placeholder="Kendim · ya da ekip arkadaşlarının adları"
                  className={SINIF_GIRDI}
                />
              </label>

              <label className="flex items-start gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  name="markettePaylasilsin"
                  value="evet"
                  className="mt-1 h-4 w-4 rounded border-cizgi accent-[var(--renk-birincil)]"
                />
                <span className="text-sm text-metin">
                  <span className="font-medium">Bu ürünü markette paylaş</span>
                  <span className="mt-0.5 block text-metin-yumusak">
                    İşaretlerseniz ürününüz{" "}
                    <Link
                      href="/panel/urunler"
                      className="text-vurgu-metin underline underline-offset-2"
                    >
                      GençTek Market
                    </Link>
                    &apos;te listelenir ve GençTek&apos;e girmiş herkes
                    görebilir. İşaretlemezseniz ürün yalnızca sizde kalır;
                    paylaşımı sonradan ürün sayfasından açıp kapatabilirsiniz.
                  </span>
                </span>
              </label>

              <fieldset className="sm:col-span-2">
                <legend className="text-sm font-medium text-metin">
                  Bağlantılar{" "}
                  <span className="font-normal text-metin-yumusak">
                    (isteğe bağlı)
                  </span>
                </legend>
                <p className="mt-1 mb-2 text-sm text-metin-yumusak">
                  Ürünün deposu, canlı sürümü ve tanıtım videosu ayrı ayrı
                  yazılabilir. Boş satırlar yok sayılır.
                </p>
                {/*
                  Sabit üç satır: JavaScript olmadan "satır ekle" düğmesi
                  yapılamıyor ve sunucuya gidip gelmek formu sıfırlardı.
                */}
                <div className="space-y-2">
                  {[0, 1, 2].map((sira) => (
                    <div key={sira} className="grid gap-2 sm:grid-cols-3">
                      <input
                        type="url"
                        name="baglantiAdres"
                        maxLength={500}
                        placeholder="https://"
                        className={`${SINIF_GIRDI} sm:col-span-2`}
                        aria-label={`${sira + 1}. bağlantı adresi`}
                      />
                      <input
                        type="text"
                        name="baglantiEtiket"
                        maxLength={100}
                        placeholder="kaynak kod"
                        className={SINIF_GIRDI}
                        aria-label={`${sira + 1}. bağlantı etiketi`}
                      />
                    </div>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          {seciliTanim.dereceVarMi && (
            <label className="block">
              <span className="text-sm font-medium text-metin">
                Aldığınız derece
              </span>
              <input
                type="text"
                name="derece"
                maxLength={120}
                placeholder="Türkiye 1.si"
                className={SINIF_GIRDI}
              />
            </label>
          )}

          <label className="block">
            <span className="text-sm font-medium text-metin">Tarih</span>
            <input type="date" name="tarih" className={SINIF_GIRDI} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-metin">
              Bağlantı (isteğe bağlı)
            </span>
            <input
              type="url"
              name="baglantiUrl"
              maxLength={500}
              placeholder="https://"
              className={SINIF_GIRDI}
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-metin">
              Açıklama (isteğe bağlı)
            </span>
            <textarea
              name="aciklama"
              rows={3}
              maxLength={2000}
              className={SINIF_GIRDI}
            />
          </label>

          {/*
            Destekleyici belgeler. Kayıt oluşturulduktan SONRA yazılır; dosya
            reddedilirse kayıt geri alınmaz, uyarı gösterilir ve dosya sonradan
            eklenebilir (bkz. kazanimEkleEylemi).
          */}
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-metin">
              Destekleyici belgeler (isteğe bağlı)
            </span>
            <input
              type="file"
              name="belgeler"
              multiple
              accept={izinliBelgeTipleri.join(",")}
              className="mt-1 block w-full text-sm text-metin file:mr-3 file:rounded-md file:border file:border-cizgi file:bg-kart file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-metin"
            />
            <span className="mt-1 block text-sm text-metin-yumusak">
              Etkinliğe dair fotoğraf ve belge ekleyebilirsiniz. Görsel için en
              fazla {(belgeSinirlari.gorselMaksBayt / (1024 * 1024)).toFixed(0)}{" "}
              MB, belge için{" "}
              {(belgeSinirlari.belgeMaksBayt / (1024 * 1024)).toFixed(0)} MB.
              Yüklediğiniz belgeleri danışmanınız ve koordinatörünüz de görür.
            </span>
          </label>
        </div>

        <button type="submit" className={SINIF_BIRINCIL_BUTON}>
          <Plus size={15} aria-hidden />
          Ekle
        </button>
      </form>
    </>
  );
}

/**
 * Girilmiş kayıtların YÖNETİMİ: silme ve destekleyici belge ekleme/çıkarma.
 *
 * Profilde aynı kayıtlar eylemsiz basılıyor (salt görüntüleme); düzenleme
 * yalnızca burada. Liste `kazanimTipleri(..., { arsivDahil: true })` ile
 * bölümleniyor: kapatılmış tipin (GençTek etkinliği beyanı) eski kayıtları
 * profilde artık görünmüyor ve kullanıcı onları ancak buradan silebilir —
 * başlıksız bir yığın hâlinde gösterilselerdi ne oldukları anlaşılmazdı.
 */
export function KayitYonetimi({
  kazanimlar,
  sahip,
  silmeEylemi,
  belgeEkleEylemi,
  belgeSilEylemi,
  izinliBelgeTipleri,
}: {
  kazanimlar: KazanimSatiri[];
  sahip: KazanimSahibi;
  silmeEylemi: Eylem;
  belgeEkleEylemi: Eylem;
  belgeSilEylemi: Eylem;
  izinliBelgeTipleri: string[];
}) {
  const eylemler = {
    silmeEylemi,
    belgeEkleEylemi,
    belgeSilEylemi,
    izinliBelgeTipleri,
  };

  const bolumler = kazanimTipleri(sahip, { arsivDahil: true })
    .map((tanim) => ({
      tanim,
      kayitlar: kazanimlar.filter((kazanim) => kazanim.tip === tanim.tip),
    }))
    /*
     * BOŞ BÖLÜM BASILMAZ — profildeki gösterimden farklı olarak. Orada boş
     * başlık "bu bölüm var ama doldurulmamış" bilgisini veriyor; burada
     * yönetilecek bir şey yok demek ve sekiz boş başlık, dolu olanı arayan
     * kullanıcıyı yorardı.
     */
    .filter((bolum) => bolum.kayitlar.length > 0);

  if (bolumler.length === 0) {
    return (
      <p className="text-metin-yumusak">
        Henüz kayıt girmediniz. Yukarıdaki formdan ekleyebilirsiniz.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {bolumler.map(({ tanim, kayitlar }) => (
        <div key={tanim.tip}>
          <h3 className="text-sm font-semibold text-baslik">
            {tanim.baslik}
            <span className="ml-2 font-normal text-metin-yumusak">
              {kayitlar.length}
            </span>
          </h3>
          <div className="mt-2">
            <KazanimListesi kazanimlar={kayitlar} {...eylemler} />
          </div>
        </div>
      ))}
    </div>
  );
}

/*
 * ARŞİV NOTU KALKTI (21 Ağustos 2026 · istek: "Bu kayıt türü kapatıldı ve
 * profilinizde görünmüyor … bu yazı kalkacak"). Kapatılmış tipin kayıtları
 * listede duruyor; başlığın altında duran uzun uyarı, listeyi okumadan önce
 * okunması gereken bir metin hâline gelmişti. Kaydın neden profile düşmediği
 * bilgisi kayıt formunda zaten yazıyor (bkz. lib/kazanim/kurallar.ts).
 */

/*
 * "PROFİLİMDE NASIL GÖRÜNÜYOR" VE "PANELDEN DÜZENLE" BAĞLANTILARI SİLİNDİ
 * (20 Ağustos 2026 · panel-profil birleşmesi).
 *
 * İkisi de bölünmenin bedeliydi: her düzenleme bölümünün altında profile,
 * her profil kartının altında panele giden bir satır duruyordu. Tek yüzeyde
 * gidilecek bir "öbür ekran" yok — değer ile onu değiştiren form artık aynı
 * kartın içinde.
 */

/** Profildeki başlık ikonları — iki ekranın aynı ikonu kullanması için. */
export const DUZENLEME_IKONLARI = {
  foto: Camera,
  iletisim: Mail,
  danismanlik: ShieldCheck,
  cv: FileText,
  kayit: Sparkles,
} as const;
