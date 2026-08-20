import { ArrowLeft, Compass, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EnvanterFormu } from "@/components/EnvanterFormu";
import { EnvanterSonucu } from "@/components/EnvanterSonucu";
import {
  BilgiKutusu,
  Kart,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  envanterAcikMi,
  envanterHazirMi,
  envanterSonucu,
  envanterTanimi,
} from "@/lib/envanter/kurallar";
import { SONUC_CERCEVESI } from "@/lib/envanter/tanimlar";
import { tarihYaz } from "@/lib/tarih";
import {
  cevaplariKaydetEylemi,
  envanterBaslatEylemi,
  uygulamaSilEylemi,
  yenidenCozEylemi,
} from "../eylemler";

export const dynamic = "force-dynamic";

/**
 * Tek envanterin ekranı: çözme ya da sonuç (E).
 *
 * ÜÇ EKRAN DEĞİL TEK EKRAN. Ayrı `/coz` ve `/sonuc` adresleri açılsaydı her
 * geçişte "hangi durumdayım" kontrolü tekrarlanır ve yanlış adrese giren
 * kullanıcı için yönlendirme zinciri kurulurdu. Durum tek yerde okunuyor:
 *
 *   · süren uygulama varsa       → form
 *   · yoksa ve tamamlanan varsa  → sonuç
 *   · ikisi de yoksa             → tanıtım + "Başla"
 */
export default async function EnvanterSayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ kod: string }>;
  searchParams: Promise<{ hata?: string }>;
}) {
  const { kod } = await params;
  const { hata } = await searchParams;
  const kullanici = await oturumKullanicisiZorunlu();

  const tanim = envanterTanimi(decodeURIComponent(kod));
  if (!tanim) notFound();

  const uygulamalar = await prisma.envanterUygulamasi.findMany({
    where: { kullaniciId: kullanici.id, envanterKodu: tanim.kod },
    select: {
      id: true,
      durum: true,
      surum: true,
      baslamaTarihi: true,
      tamamlanmaTarihi: true,
      cevaplar: { select: { maddeKodu: true, deger: true } },
    },
    orderBy: { baslamaTarihi: "desc" },
  });

  const suren = uygulamalar.find((u) => u.durum === "SURUYOR");
  const tamamlananlar = uygulamalar.filter((u) => u.durum === "TAMAMLANDI");
  const sonTamamlanan = tamamlananlar[0];

  return (
    <div className="space-y-6">
      <Link
        href="/panel/algoritmam"
        className="inline-flex items-center gap-1.5 text-sm text-vurgu-metin hover:underline"
      >
        <ArrowLeft size={15} aria-hidden />
        Öz değerlendirme
      </Link>

      <SayfaBasligi baslik={tanim.ad} aciklama={tanim.ozet} geri={null} />

      {hata && <BilgiKutusu cesit="uyari">{hata}</BilgiKutusu>}

      {/*
        KAYNAK NOTU HER DURUMDA BASILIR — çözerken de, sonuca bakarken de.
        Maddelerin kim tarafından yazıldığı, sonucun ne kadar ağırlık taşıdığını
        belirleyen bilgidir ve dipnota gömülmemeli.
      */}
      <BilgiKutusu>{tanim.kaynakNotu}</BilgiKutusu>

      {!envanterHazirMi(tanim) ? (
        <Kart>
          <p className="text-metin">
            Bu envanterin madde metinleri henüz eklenmedi, bu yüzden çözülemiyor.
          </p>
          <p className="mt-2 text-sm text-metin-yumusak">
            İçerik geldiğinde bu sayfa kendiliğinden açılır; ayrıca bir işlem
            yapman gerekmez.
          </p>
        </Kart>
      ) : tanim.kapali && !sonTamamlanan ? (
        /*
          GEÇİCİ KAPALI (20 Ağustos 2026). Kapı BURADA DA duruyor, yalnızca
          listede değil: adresi bilen ya da yer imine almış öğrenci doğrudan
          bu sayfaya gelebiliyor ve düğmeyi listede gizlemek onu engellemezdi.

          DAHA ÖNCE ÇÖZMÜŞ OLANIN SONUCU AÇIK KALIR (`!sonTamamlanan`):
          kapanan şey çözmek, kişinin kendi verisi değil. Çözülmüş bir sonucu
          kapatmak, öğrencinin kendi cevaplarını ondan saklamak olurdu.
        */
        <Kart>
          <p className="text-metin">{tanim.kapali}</p>
        </Kart>
      ) : suren ? (
        <EnvanterFormu
          tanim={tanim}
          mevcutCevaplar={suren.cevaplar}
          eylem={cevaplariKaydetEylemi}
          silmeEylemi={uygulamaSilEylemi}
          uygulamaId={suren.id}
          // Sürüm kaymış yarım çözüm: form basılır ama uyarı üstte durur.
          surumKaydiMi={suren.surum !== tanim.surum}
        />
      ) : sonTamamlanan ? (
        <>
          <EnvanterSonucu
            tanim={tanim}
            sonuc={envanterSonucu(tanim, sonTamamlanan.surum, sonTamamlanan.cevaplar)}
            tamamlanmaTarihi={sonTamamlanan.tamamlanmaTarihi}
          />

          <Kart>
            <div className="flex flex-wrap items-center gap-3">
              {/*
                Envanter geçici olarak kapalıysa "Yeniden çöz" BASILMAZ: eylem
                de reddediyor ve reddedilecek bir düğme göstermek, öğrenciye
                yapabileceği bir iş varmış gibi görünürdü. Sonucun kendisi ve
                silme hakkı yerinde duruyor.
              */}
              {envanterAcikMi(tanim) && (
                <form action={yenidenCozEylemi}>
                  <input type="hidden" name="envanterKodu" value={tanim.kod} />
                  <button type="submit" className={SINIF_IKINCIL_BUTON}>
                    <RotateCcw size={15} aria-hidden />
                    Yeniden çöz
                  </button>
                </form>
              )}
              <form action={uygulamaSilEylemi}>
                <input type="hidden" name="envanterKodu" value={tanim.kod} />
                <input type="hidden" name="uygulamaId" value={sonTamamlanan.id} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-md border border-hata-cizgi px-4 py-2 text-sm font-medium text-hata-metin transition hover:bg-hata-zemin"
                >
                  <Trash2 size={15} aria-hidden />
                  Bu sonucu sil
                </button>
              </form>
            </div>
            <p className="mt-3 text-sm text-metin-yumusak">
              Yeniden çözdüğünde bu sonuç silinmez; ikisi de aşağıdaki geçmişte
              durur ve zaman içinde neyin değiştiğini görebilirsin.
            </p>
          </Kart>

          {tamamlananlar.length > 1 && (
            <Kart>
              <h2 className="text-lg font-semibold text-baslik">Geçmiş çözümlerin</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {tamamlananlar.slice(1).map((uygulama) => (
                  <li
                    key={uygulama.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-cizgi px-4 py-2.5"
                  >
                    <span className="text-metin">
                      {uygulama.tamamlanmaTarihi
                        ? tarihYaz(uygulama.tamamlanmaTarihi)
                        : "—"}
                      {uygulama.surum !== tanim.surum && (
                        <span className="ml-2 text-metin-yumusak">
                          (eski sürümle çözüldü)
                        </span>
                      )}
                    </span>
                    <form action={uygulamaSilEylemi}>
                      <input type="hidden" name="envanterKodu" value={tanim.kod} />
                      <input type="hidden" name="uygulamaId" value={uygulama.id} />
                      <button
                        type="submit"
                        className="text-sm text-hata-metin hover:underline"
                      >
                        Sil
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </Kart>
          )}
        </>
      ) : (
        <Kart className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-baslik">
            <Compass size={18} className="text-vurgu-metin" />
            Başlamadan önce
          </h2>
          <p className="text-metin">{tanim.yonerge}</p>
          <p className="text-sm text-metin-yumusak">{SONUC_CERCEVESI}</p>
          <p className="text-sm text-metin-yumusak">
            {tanim.maddeler.length} madde var, {tanim.boyutlar.length} başlık
            altında toplanıyor. Tek oturumda bitirmek zorunda değilsin —
            işaretlediklerin kaydedilir, kaldığın yerden devam edersin.
          </p>
          <form action={envanterBaslatEylemi}>
            <input type="hidden" name="envanterKodu" value={tanim.kod} />
            <button type="submit" className={SINIF_BIRINCIL_BUTON}>
              Başla
            </button>
          </form>
        </Kart>
      )}
    </div>
  );
}
