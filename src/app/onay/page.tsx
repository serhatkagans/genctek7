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
 * Sisteme KAYIT YOKTUR; kimlik EBA'dan gelir. Bu yüzden "kayıt olurken
 * imzalanan belgeler" diye bir an yoktur — belgeler kişinin sisteme ilk
 * girdiği anda okutulur.
 *
 * Ekran /panel ALTINDA DEĞİL, çünkü bir kapıdır: panel düzenini (menü, roller,
 * şeritler) göstermesi, kişiyi henüz giremediği bir yerin içindeymiş gibi
 * hissettirirdi. Buradan yalnızca iki çıkış var: onaylamak ya da çıkış yapmak.
 *
 * KAPI 21 AĞUSTOS 2026'DA KAPATILDI, 2 EYLÜL'DE GERİ AÇILDI.
 *
 * Kapatma isteği "KVKK'lar panelden kalkacak, açılışta çerez politikası ile
 * ilgili popup gelecek bir kerelik" idi ve yerine `CerezBildirimi` kondu. O
 * bildirim iki cümlelik bir BİLGİLENDİRME: belge göstermiyor, onay almıyor ve
 * "gördüm" işaretini tarayıcıda tutuyor. Aradan geçen sürede metinlerin
 * okutulup onaylanması yeniden istendi; kapı, o gün silinen parçalarıyla
 * (lib/kvkk/onay.ts, ./eylemler.ts) birlikte git geçmişinden geri alındı.
 * Çerez bildirimi DURUYOR: çerez kullanımı, aydınlatma metninin anlattığı
 * şeyden farklı bir konudur ve biri diğerinin yerine geçmez.
 *
 * Kilit YALNIZCA ilk girişte vardır. Sonradan eklenen bir belge ya da
 * güncellenen bir metin kimseyi kapıda bırakmaz — metin güncellemesi tüm ilin
 * koordinatörünü aynı anda dışarıda bırakabilirdi (bkz. lib/kvkk/onay.ts ·
 * ilkGirisKilidiVarMi). Onaylanmış belgeler sonradan Kişisel Verilerim
 * ekranından okunur.
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
          Kişisel Verilerin Korunması
        </h1>
        <p className="mt-2 text-metin-yumusak">
          Devam etmek için lütfen aşağıdaki
          {durumlar.length === 1 ? " metni" : ` ${durumlar.length} metni`} okuyun
          ve onaylayın.
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
                Metin kaydırılabilir bir kutuda: belgeler alt alta tam boyuyla
                basılsaydı sayfa metrelerce uzar ve onay düğmesi görünmez
                olurdu. Kutunun kendi kaydırması, kişinin metni gerçekten
                geçtiğini de görünür kılar.
              */}
              <div className="mt-4 max-h-72 overflow-y-auto rounded-md border border-cizgi bg-zemin p-4 text-sm leading-relaxed whitespace-pre-line text-metin">
                {durum.metin}
              </div>

              {durum.metinGuncellemeTarihi && (
                <p className="mt-2 text-xs text-metin-yumusak">
                  Metnin son güncellenme tarihi:{" "}
                  {tarihSaatYaz(durum.metinGuncellemeTarihi)}
                </p>
              )}

              {/*
                ONAY KUTUSU YOK, BEYAN VAR (2 Eylül 2026 · istek: "butonla
                onaylasın").

                Beyan metni duruyor — onayın neyi kapsadığını söyleyen cümle
                kaybolsaydı düğmeye basan kişi neyi onayladığını okumamış
                olurdu. Kaldırılan yalnızca ayrı ayrı işaretleme adımı; irade
                tek bir düğmeyle veriliyor.

                Belge kodları gizli alanla gidiyor: sunucu tarafı hangi
                belgelerin onaylandığını yine form gövdesinden okuyor ve eksik
                belge gelirse reddediyor (bkz. ./eylemler.ts). Kural sunucuda
                kaldığı için, kutuların kalkması onayın kapsamını değiştirmez.
              */}
              <input type="hidden" name="belge" value={durum.tanim.belge} />
              <p className="mt-4 text-sm text-metin">{durum.tanim.onayEtiketi}</p>
            </section>
          ))}

          <div className="flex flex-wrap items-center gap-4">
            <button type="submit" className={SINIF_BIRINCIL_BUTON}>
              <ShieldCheck size={16} aria-hidden />
              Onaylıyorum ve Devam Et
            </button>
            <p className="text-sm text-metin-yumusak">
              Bu onay güvenli bir şekilde saklanır ve bir sonraki ziyaretinizde
              tekrar sorulmaz.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
