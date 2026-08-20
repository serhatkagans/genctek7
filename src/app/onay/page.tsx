import { FileText, LogOut, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { cikisEylemi } from "@/app/giris/eylemler";
import { TemaSecici } from "@/components/TemaSecici";
import { BilgiKutusu, SINIF_BIRINCIL_BUTON } from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { ilkGirisKilidiVarMi, onayDurumlari } from "@/lib/kvkk/onay";
import { tarihSaatYaz } from "@/lib/tarih";
import { aktifTema } from "@/lib/tema";
import { ilkGirisOnaylaEylemi } from "./eylemler";

/**
 * İlk giriş onay ekranı.
 *
 * Sisteme KAYIT YOKTUR; kimlik EBA'dan gelir (bkz. src/app/page.tsx). Bu yüzden
 * "kayıt olurken imzalanan belgeler" diye bir an yoktur — belgeler kişinin
 * sisteme ilk girdiği anda okutulur.
 *
 * Ekran /panel ALTINDA DEĞİL, çünkü bir kapıdır: panel düzenini (menü, roller,
 * şeritler) göstermesi, kişiyi henüz giremediği bir yerin içindeymiş gibi
 * hissettirirdi. Buradan yalnızca iki çıkış var: onaylamak ya da çıkış yapmak.
 *
 * Kilit YALNIZCA ilk girişte vardır. Sonradan eklenen bir belge ya da
 * güncellenen bir metin kimseyi kapıda bırakmaz; panelde şerit çıkar ve
 * profilin en altındaki bölümden onaylanır (`/panel#kvkk`, bkz.
 * lib/kvkk/onay.ts · ilkGirisKilidiVarMi).
 */

export const dynamic = "force-dynamic";

export default async function IlkGirisOnaySayfasi({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const { hata } = await searchParams;
  const kullanici = await oturumKullanicisiZorunlu();

  // Onayını vermiş kişi kapıda bekletilmez; adresi elle yazsa da panele döner.
  if (!(await ilkGirisKilidiVarMi(kullanici))) {
    redirect("/panel");
  }

  const [tema, durumlar] = await Promise.all([
    aktifTema(),
    onayDurumlari(kullanici),
  ]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-ust-bar-cizgi bg-ust-bar">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold tracking-widest text-ust-bar-metin-yumusak uppercase">
              MEB · YEĞİTEK
            </p>
            <p className="text-lg font-bold text-ust-bar-metin">GençTek</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <TemaSecici aktif={tema} />
            <p className="font-medium text-ust-bar-metin">
              {kullanici.ad} {kullanici.soyad}
            </p>
            <form action={cikisEylemi}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md border border-ust-bar-cizgi px-3 py-1.5 text-sm font-medium text-ust-bar-metin-yumusak transition hover:text-ust-bar-metin"
              >
                <LogOut size={15} aria-hidden />
                Çıkış
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold text-baslik">
          Sisteme ilk girişiniz
        </h1>
        <p className="mt-2 text-metin-yumusak">
          Devam etmeden önce aşağıdaki
          {durumlar.length === 1 ? " belgeyi" : ` ${durumlar.length} belgeyi`}{" "}
          okuyup onaylamanız gerekiyor. Onayınız erişim kayıtlarına işlenir.
        </p>

        {hata && (
          <BilgiKutusu cesit="hata" className="mt-6">
            {hata}
          </BilgiKutusu>
        )}

        <form action={ilkGirisOnaylaEylemi} className="mt-8 space-y-6">
          {durumlar.map((durum) => (
            <section
              key={durum.tanim.belge}
              className="rounded-kart border border-cizgi bg-kart p-6 shadow-kart"
            >
              <h2 className="flex items-center gap-2 text-lg font-semibold text-baslik">
                <FileText size={18} className="text-vurgu-metin" aria-hidden />
                {durum.tanim.baslik}
              </h2>
              <p className="mt-1 text-sm text-metin-yumusak">
                {durum.tanim.aciklama}
              </p>

              {/*
                Metin kaydırılabilir bir kutuda: dört belge alt alta tam
                boyuyla basılsaydı sayfa metrelerce uzar ve onay düğmesi
                görünmez olurdu. Kutunun kendi kaydırması, kişinin metni
                gerçekten geçtiğini de görünür kılar.
              */}
              <div className="mt-4 max-h-72 overflow-y-auto rounded-md border border-cizgi bg-zemin p-4 whitespace-pre-line text-sm leading-relaxed text-metin">
                {durum.metin}
              </div>

              {durum.metinGuncellemeTarihi && (
                <p className="mt-2 text-xs text-metin-yumusak">
                  Metnin son güncellenme tarihi:{" "}
                  {tarihSaatYaz(durum.metinGuncellemeTarihi)}
                </p>
              )}

              <label className="mt-4 flex items-start gap-2 text-sm text-metin">
                {/*
                  `required` her kutuda ayrı: tek bir "hepsini kabul ediyorum"
                  kutusu, dört ayrı yükümlülüğü tek beyana indirir ve hangi
                  belgeye ne zaman onay verildiği ayrıştırılamazdı.
                */}
                <input
                  type="checkbox"
                  name="belge"
                  value={durum.tanim.belge}
                  required
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-cizgi accent-[var(--renk-birincil)]"
                />
                <span>{durum.tanim.onayEtiketi}</span>
              </label>
            </section>
          ))}

          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" className={SINIF_BIRINCIL_BUTON}>
              <ShieldCheck size={16} aria-hidden />
              Onaylıyorum, devam et
            </button>
            <p className="text-sm text-metin-yumusak">
              Onaylamadan sisteme giriş yapılamaz.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
