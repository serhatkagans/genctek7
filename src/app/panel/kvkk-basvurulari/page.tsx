import { CalendarClock, Eye, ScrollText, Send } from "lucide-react";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  KirintiYolu,
  Rozet,
  RozetSeridi,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
  SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import {
  type BasvuruSatiri,
  kvkkBasvurulariniListele,
} from "@/lib/kvkk/basvuru";
import {
  DURUM_ETIKETLERI,
  YANIT_ASGARI,
  YANIT_AZAMI,
  YANIT_SURESI_GUN,
  YANIT_UYARI_ESIGI_GUN,
  gecikmisMi,
  kalanGun,
  talepKonusuTanimi,
  yanitSonTarihi,
} from "@/lib/kvkk/basvuru-kurallar";
import { tarihSaatYaz, tarihYaz } from "@/lib/tarih";
import { kvkkBasvurulariniYanitlayabilirMi } from "@/lib/yetki/izinler";
import {
  basvuruIncelemeyeAlEylemi,
  basvuruYanitlaEylemi,
} from "./eylemler";

export const dynamic = "force-dynamic";

/**
 * KVKK BAŞVURULARI — merkezin yanıt kuyruğu (2 Eylül 2026 · Genelge 4/ç).
 *
 * EKRANIN TEK İŞİ SÜREYİ GÖRÜNÜR KILMAK. Başvurunun kaydı tutuluyor olması
 * uyum için yetmiyor; Kanun m.13 yanıtın en geç otuz günde verilmesini
 * istiyor. Bu yüzden liste "en eski üstte" sıralanıyor ve her satır kalan
 * günü yazıyor — kuyruk sıralaması bir tercih değil, sürenin kendisi.
 *
 * YALNIZCA MERKEZE AÇIK (bkz. kvkkBasvurulariniYanitlayabilirMi): başvuru veri
 * sorumlusuna yapılır ve veri sorumlusu YEĞİTEK'tir. İl koordinatörüne
 * açılsaydı kanunun tek muhatap saydığı yerde ikinci bir merci doğardı.
 */

function SureRozeti({
  basvuru,
  simdi,
}: {
  basvuru: BasvuruSatiri;
  simdi: Date;
}) {
  const kalan = kalanGun(simdi, basvuru.olusturmaTarihi);
  const gecikti = gecikmisMi(simdi, basvuru);
  return (
    <Rozet
      cesit={gecikti ? "hata" : kalan <= YANIT_UYARI_ESIGI_GUN ? "uyari" : "notr"}
      Ikon={CalendarClock}
    >
      {gecikti
        ? `Süre ${Math.abs(kalan)} gün aşıldı`
        : `${kalan} gün kaldı · son ${tarihYaz(
            yanitSonTarihi(basvuru.olusturmaTarihi),
          )}`}
    </Rozet>
  );
}

function BasvuruGovdesi({ basvuru }: { basvuru: BasvuruSatiri }) {
  return (
    <>
      <p className="font-semibold text-baslik">
        {basvuru.basvuran.ad} {basvuru.basvuran.soyad}
      </p>
      <p className="mt-1 text-sm text-metin-yumusak">
        {tarihSaatYaz(basvuru.olusturmaTarihi)} tarihinde başvurdu
        {basvuru.yanitAdresi
          ? ` · yanıt adresi: ${basvuru.yanitAdresi}`
          : " · yanıt adresi verilmedi, cevap paneline düşecek"}
      </p>

      {/*
        TALEP KONULARI TAM METİNLE, kısa adla değil: yanıtı yazan kişinin
        önünde hakkın kanundaki karşılığı durmalı. Kısa ad ("Silme") listede
        yeterli, cevap yazılırken değil.
      */}
      <ul className="mt-3 space-y-1.5">
        {basvuru.konular.map((konu) => {
          const tanim = talepKonusuTanimi(konu);
          return (
            <li key={konu} className="text-sm text-metin">
              <span className="font-medium">{tanim.madde}</span> —{" "}
              {tanim.etiket}
            </li>
          );
        })}
      </ul>

      <div className="mt-4">
        <p className="text-sm text-metin-yumusak">Başvuranın açıklaması</p>
        <p className="mt-1 text-sm whitespace-pre-wrap text-metin">
          {basvuru.aciklama}
        </p>
      </div>
    </>
  );
}

export default async function KvkkBasvurulariSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string; bilgi?: string }>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();

  /*
   * Yetkisizlik KART OLARAK basılıyor, hata fırlatılmıyor: ortada beklenmeyen
   * bir şey yok, ekran ona kapalı (aynı gerekçe: dis-basvurular/page.tsx).
   * Buraya kadar hiçbir başvuru verisi okunmuyor.
   */
  if (!kvkkBasvurulariniYanitlayabilirMi(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="KVKK başvuruları"
          aciklama="Bu ekran yalnızca proje yöneticisine açıktır. Kendi başvurularınızı Kişisel Verilerim ekranından takip edebilirsiniz."
        />
      </Kart>
    );
  }

  const { hata, bilgi } = await searchParams;
  const { acik, sonuclanan } = await kvkkBasvurulariniListele(kullanici.id);
  const simdi = new Date();

  return (
    <div className="space-y-8">
      <KirintiYolu
        basamaklar={[
          { etiket: "Yönetim Paneli", yol: "/panel/yonetim" },
          { etiket: "KVKK Başvuruları" },
        ]}
      />

      <SayfaBasligi
        baslik="KVKK Başvuruları"
        aciklama={`İlgili kişilerin 6698 sayılı Kanun kapsamındaki başvuruları. Her başvuru en geç ${YANIT_SURESI_GUN} gün içinde sonuçlandırılmalıdır.`}
        geri={null}
      />

      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}
      {bilgi && <BilgiKutusu cesit="olumlu">{bilgi}</BilgiKutusu>}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-baslik">
          Yanıt bekleyenler{" "}
          <span className="rounded-full bg-vurgu-zemin px-2 py-0.5 text-xs font-medium text-vurgu-metin">
            {acik.length}
          </span>
        </h2>

        {acik.length === 0 ? (
          <BilgiKutusu>Yanıt bekleyen başvuru yok.</BilgiKutusu>
        ) : (
          acik.map((basvuru) => (
            <Kart key={basvuru.id}>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 grow">
                  <BasvuruGovdesi basvuru={basvuru} />
                </div>
                <RozetSeridi>
                  <Rozet cesit="vurgu">{DURUM_ETIKETLERI[basvuru.durum]}</Rozet>
                  <SureRozeti basvuru={basvuru} simdi={simdi} />
                </RozetSeridi>
              </div>

              <div className="mt-5 space-y-4 border-t border-cizgi pt-5">
                {basvuru.durum === "ALINDI" && (
                  /*
                    "İNCELEMEYE AL" SÜREYİ DURDURMAZ ve bu bilinçli: kanunun
                    otuz günü başvurunun ulaştığı anda başlar. Düğmenin tek
                    işi, başvurana ekranında "kimse bakmıyor" izlenimi
                    vermemek.
                  */
                  <form action={basvuruIncelemeyeAlEylemi}>
                    <input type="hidden" name="basvuruId" value={basvuru.id} />
                    <button type="submit" className={SINIF_IKINCIL_BUTON}>
                      <Eye size={16} aria-hidden />
                      İncelemeye al
                    </button>
                  </form>
                )}

                <form action={basvuruYanitlaEylemi} className="space-y-4">
                  <input type="hidden" name="basvuruId" value={basvuru.id} />

                  <fieldset>
                    <legend className="text-sm font-medium text-metin">
                      Sonuç
                    </legend>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {(["KABUL", "KISMEN_KABUL", "RET"] as const).map(
                        (deger) => (
                          <label
                            key={deger}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-cizgi px-3.5 py-1.5 text-sm font-medium text-metin transition hover:border-vurgu has-checked:border-vurgu has-checked:bg-vurgu-zemin has-checked:text-vurgu-metin"
                          >
                            <input
                              type="radio"
                              name="sonuc"
                              value={deger}
                              required
                              className="h-3.5 w-3.5 accent-[var(--renk-birincil)]"
                            />
                            {DURUM_ETIKETLERI[deger]}
                          </label>
                        ),
                      )}
                    </div>
                  </fieldset>

                  <label className="block">
                    <span className="text-sm font-medium text-metin">
                      Yanıt metni
                    </span>
                    <textarea
                      name="yanit"
                      required
                      rows={5}
                      minLength={YANIT_ASGARI}
                      maxLength={YANIT_AZAMI}
                      placeholder="Talebin nasıl karşılandığını yazın. Ret ya da kısmen kabul hâlinde gerekçesi zorunludur; metin başvurana olduğu gibi iletilir."
                      className={SINIF_GIRDI}
                    />
                  </label>

                  <button type="submit" className={SINIF_BIRINCIL_BUTON}>
                    <Send size={16} aria-hidden />
                    Yanıtla ve kapat
                  </button>
                </form>
              </div>
            </Kart>
          ))
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-baslik">Sonuçlananlar</h2>

        {sonuclanan.length === 0 ? (
          <BilgiKutusu>Henüz sonuçlanmış başvuru yok.</BilgiKutusu>
        ) : (
          sonuclanan.map((basvuru) => (
            <Kart key={basvuru.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 grow">
                  <BasvuruGovdesi basvuru={basvuru} />
                </div>
                <Rozet
                  cesit={
                    basvuru.durum === "KABUL"
                      ? "olumlu"
                      : basvuru.durum === "KISMEN_KABUL"
                        ? "uyari"
                        : "hata"
                  }
                >
                  {DURUM_ETIKETLERI[basvuru.durum]}
                </Rozet>
              </div>

              <div className="mt-4 rounded-kutu border border-l-4 border-cizgi border-l-cizgi-guclu bg-zemin p-3">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-baslik">
                  <ScrollText size={14} aria-hidden />
                  Verilen yanıt ·{" "}
                  {basvuru.yanitTarihi
                    ? tarihSaatYaz(basvuru.yanitTarihi)
                    : "—"}
                  {basvuru.yanitlayan
                    ? ` · ${basvuru.yanitlayan.ad} ${basvuru.yanitlayan.soyad}`
                    : ""}
                </p>
                <p className="mt-2 text-sm whitespace-pre-wrap text-metin">
                  {basvuru.yanitMetni}
                </p>
              </div>
            </Kart>
          ))
        )}
      </section>

      <BilgiKutusu>
        Başvurular ve verilen yanıtlar SİLİNMEZ: saklama süresi temizliği
        (erişim kayıtları ve bildirimler) bu kayıtlara dokunmaz. Yükümlülüğün
        yerine getirildiğinin kanıtı bu satırlardır.
      </BilgiKutusu>
    </div>
  );
}
