import { Mail, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { Kart, SayfaBasligi } from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { basHarfler } from "@/lib/kullanici/profil-foto-kurallar";
import { uygulamaYolu } from "@/lib/ortam";
import { ilKoordinatoruOzeti } from "@/lib/rol/koordinator";
import { disKullaniciMi, ilKoordinatoruMu, ogrenciMi, projeYoneticisiMi } from "@/lib/yetki/izinler";

export const dynamic = "force-dynamic";

/**
 * İL KOORDİNATÖRÜM — ulaşma kartı (26 Ağustos 2026).
 *
 * İstek: "profildeki İl koordinatörüm kartı tıklanabilir olsun, tıklanınca
 * koordinatörün e-posta adresi ve resminin olduğu bir sayfa açılsın,
 * ulaşabilmek için."
 *
 * NİYE AYRI BİR SAYFA, öğretmen kaydı değil: `/panel/ogretmenler/[id]` bir
 * ENVANTER kaydıdır — görev geçmişi, danışmanlığındaki öğrenciler, CV. Buraya
 * gelen kişinin sorusu tek: "ona nasıl ulaşırım". Envanter ekranı hem fazlasını
 * gösterir hem de öğrenciye kapalıdır (bkz. ogretmenEnvanteriGorebilirMi),
 * oysa koordinatörüne ulaşmak öğrencinin de hakkı.
 *
 * KAPI PANELDEKİ KARTLA AYNI: kartı gören sayfayı da açabilmeli. Öğrenci,
 * koordinatörün kendisi, merkez ve dış kullanıcı dışarıda — kartın koşulu da
 * bu (bkz. panel/page.tsx · koordinatorGosterilir). Öğrencinin muhatabı
 * danışman öğretmenidir; merkezin tek bir ile bağlılığı yok.
 *
 * GÖSTERİLEN VERİ DAR: ad, unvan, il ve e-posta. Telefon burada YOK — iletişim
 * bilgisi kişinin kendi girdiği alandır ve e-posta zaten panelde de görünüyor;
 * telefonu bir ekran daha yaymak, kararı verilmemiş bir genişleme olurdu.
 */
export default async function IlKoordinatorumSayfasi() {
  const kullanici = await oturumKullanicisiZorunlu();

  const gorebilir =
    !ogrenciMi(kullanici) &&
    !ilKoordinatoruMu(kullanici) &&
    !projeYoneticisiMi(kullanici) &&
    !disKullaniciMi(kullanici) &&
    kullanici.ilKodu !== null;

  if (!gorebilir) notFound();

  const [koordinator, il] = await Promise.all([
    ilKoordinatoruOzeti(kullanici.ilKodu as string),
    prisma.il.findUnique({
      where: { ilKodu: kullanici.ilKodu as string },
      select: { ad: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="İl koordinatörüm"
        aciklama={il?.ad ?? undefined}
      />

      <Kart>
        {koordinator === null ? (
          /*
            Koordinatör atanmamış olabilir ve bu bir hata değil: iller
            koordinatörsüz kalabiliyor (bkz. Koordinatörler ekranındaki "boş
            iller"). Kişiye ne yapacağını söylemek gerekiyor.
          */
          <p className="text-metin-yumusak">
            İlinize henüz koordinatör atanmadı. Bu süreçte muhatabınız okul
            idareniz ve GençTek merkezidir.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-5">
            {/*
              FOTOĞRAF VARSA BASILIR, yoksa baş harf çemberi: boş bir avatar
              kutusu, fotoğrafın yüklenemediği izlenimi verirdi. Çember, panelin
              geri kalanındaki kimlik çemberiyle aynı dili konuşuyor.
            */}
            {koordinator.fotoVarMi ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={uygulamaYolu("/panel/il-koordinatorum/foto")}
                alt={`${koordinator.ad} ${koordinator.soyad}`}
                className="size-28 shrink-0 rounded-full border border-cizgi object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="flex size-28 shrink-0 items-center justify-center rounded-full bg-vurgu-zemin text-3xl font-semibold text-vurgu-metin"
              >
                {basHarfler(koordinator.ad, koordinator.soyad)}
              </span>
            )}

            <div className="min-w-0">
              <p className="text-xl font-bold text-baslik">
                {koordinator.ad} {koordinator.soyad}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-metin-yumusak">
                <MapPin size={15} aria-hidden />
                {il?.ad ? `${il.ad} İl Koordinatörü` : "İl Koordinatörü"}
              </p>

              {/*
                E-POSTA TIKLANABİLİR: sayfanın tek işi ulaşmak ve `mailto:`
                bunu tek tıkla yapıyor. Adres girilmemişse satır basılmıyor —
                boş bir "—", ulaşma yolu varmış gibi görünürdü.
              */}
              {koordinator.eposta ? (
                <a
                  href={`mailto:${koordinator.eposta}`}
                  className="mt-3 inline-flex items-center gap-2 font-medium text-vurgu-metin underline underline-offset-2"
                >
                  <Mail size={16} aria-hidden />
                  {koordinator.eposta}
                </a>
              ) : (
                <p className="mt-3 text-sm text-metin-yumusak">
                  Koordinatörünüz iletişim bilgisi girmemiş. Okul idareniz
                  aracılığıyla ulaşabilirsiniz.
                </p>
              )}
            </div>
          </div>
        )}
      </Kart>
    </div>
  );
}
