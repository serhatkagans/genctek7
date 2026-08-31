import { Mail, School } from "lucide-react";
import { notFound } from "next/navigation";
import { Kart, SayfaBasligi } from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { basHarfler } from "@/lib/kullanici/profil-foto-kurallar";
import { uygulamaYolu } from "@/lib/ortam";
import {
  type OkulTemsilcisiOzeti,
  okulTemsilcileriniGetir,
} from "@/lib/rol/okul-temsilcisi";
import { ogrenciMi } from "@/lib/yetki/izinler";

export const dynamic = "force-dynamic";

/**
 * OKUL TEMSİLCİM — ulaşma kartı (31 Ağustos 2026 · istek: "Öğrenci panelinde
 * danışman öğretmeni kartının yanına okul temsilcim kartı eklensin").
 *
 * İL KOORDİNATÖRÜM SAYFASININ OKUL ÖLÇEĞİNDEKİ KARŞILIĞI ve bilerek ona
 * benziyor: aynı soru ("ona nasıl ulaşırım"), aynı dar veri (ad, sınıf,
 * e-posta), aynı yerleşim (fotoğraf solda, kimlik sağda). İki ekran iki ayrı
 * dil konuşsaydı öğrenci, ikinci kartın ne yaptığını yeniden öğrenmek zorunda
 * kalırdı.
 *
 * NİYE ÖĞRENCİ ENVANTERİ (`/panel/ogrenciler/[id]`) DEĞİL: o ekran bir
 * ENVANTER kaydıdır — görev geçmişi, kazanımlar, danışman bilgisi — ve
 * öğrenciye kapalıdır. Buraya gelen kişinin sorusu ise tek.
 *
 * KAPI PANELDEKİ KARTLA AYNI (bkz. panel/page.tsx · okulTemsilcisiGosterilir):
 * öğrenci, okul kaydı olan ve temsilcinin kendisi olmayan. Kartı gören sayfayı
 * da açabilmeli; biri açılıp öbürü kapalı kalmamalı.
 *
 * TELEFON YOK: koordinatör sayfasındaki gerekçenin aynısı — iletişim bilgisi
 * kişinin kendi girdiği alandır ve e-posta ulaşmaya yetiyor. Üstelik burada
 * muhatap bir öğrenci, yani reşit olmayabilir; telefonu bir ekran daha yaymak
 * kararı verilmemiş bir genişleme olurdu.
 */
export default async function OkulTemsilcimSayfasi() {
  const kullanici = await oturumKullanicisiZorunlu();

  if (!ogrenciMi(kullanici) || kullanici.kurumKodu === null) notFound();

  const [temsilciler, kurum] = await Promise.all([
    okulTemsilcileriniGetir(kullanici.kurumKodu, kullanici.egitimOgretimYili),
    prisma.kurum.findUnique({
      where: { kurumKodu: kullanici.kurumKodu },
      select: { ad: true },
    }),
  ]);

  // Kişinin kendisi temsilciyse sayfa da kapalı: karttaki eleme burada
  // tekrarlanıyor ki adres elle yazıldığında açık kalmasın.
  if (temsilciler.some((temsilci) => temsilci.id === kullanici.id)) notFound();

  return (
    <div className="space-y-6">
      <SayfaBasligi baslik="Okul temsilcim" aciklama={kurum?.ad ?? undefined} />

      <Kart>
        {temsilciler.length === 0 ? (
          /*
            Temsilcisiz okul bir hata değil, olağan bir durum: görevi danışman
            öğretmen ya da il koordinatörü veriyor ve henüz verilmemiş olabilir
            (bkz. Okul eksikleri ekranı, temsilcisiz okulları tam da bunun için
            listeliyor). Kişiye ne olduğunu ve kime soracağını söylemek gerek.
          */
          <p className="text-metin-yumusak">
            Okulunuza bu dönem henüz okul temsilcisi atanmadı. Görevi danışman
            öğretmeniniz ya da il koordinatörünüz veriyor.
          </p>
        ) : (
          /*
            LİSTE, TEK KAYIT DEĞİL: bir okulun aynı dönemde tek temsilcisi
            olması beklenir ama veritabanında bunu zorlayan bir kısıt yok
            (bkz. lib/rol/okul-temsilcisi.ts). İkincisi varsa ekran onu da
            gösteriyor — sessizce yutmak, öğrencinin gerçekten muhatabı olan
            kişiyi gizleyebilirdi.
          */
          <div className="space-y-8">
            {temsilciler.map((temsilci) => (
              <TemsilciSatiri key={temsilci.id} temsilci={temsilci} />
            ))}
          </div>
        )}
      </Kart>
    </div>
  );
}

function TemsilciSatiri({ temsilci }: { temsilci: OkulTemsilcisiOzeti }) {
  return (
    <div className="flex flex-wrap items-center gap-5">
      {/*
        FOTOĞRAF VARSA BASILIR, yoksa baş harf çemberi: boş bir avatar kutusu,
        fotoğrafın yüklenemediği izlenimi verirdi. Çember, panelin geri
        kalanındaki kimlik çemberiyle aynı dili konuşuyor.
      */}
      {temsilci.fotoVarMi ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={uygulamaYolu(`/panel/okul-temsilcim/foto/${temsilci.id}`)}
          alt={`${temsilci.ad} ${temsilci.soyad}`}
          className="size-28 shrink-0 rounded-full border border-cizgi object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="flex size-28 shrink-0 items-center justify-center rounded-full bg-vurgu-zemin text-3xl font-semibold text-vurgu-metin"
        >
          {basHarfler(temsilci.ad, temsilci.soyad)}
        </span>
      )}

      <div className="min-w-0">
        <p className="text-xl font-bold text-baslik">
          {temsilci.ad} {temsilci.soyad}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-metin-yumusak">
          <School size={15} aria-hidden />
          {temsilci.sinif ? `Okul Temsilcisi · ${temsilci.sinif}` : "Okul Temsilcisi"}
        </p>

        {/*
          E-POSTA TIKLANABİLİR: sayfanın tek işi ulaşmak ve `mailto:` bunu tek
          tıkla yapıyor. Adres girilmemişse satır basılmıyor — boş bir "—",
          ulaşma yolu varmış gibi görünürdü.
        */}
        {temsilci.eposta ? (
          <a
            href={`mailto:${temsilci.eposta}`}
            className="mt-3 inline-flex items-center gap-2 font-medium text-vurgu-metin underline underline-offset-2"
          >
            <Mail size={16} aria-hidden />
            {temsilci.eposta}
          </a>
        ) : (
          <p className="mt-3 text-sm text-metin-yumusak">
            Temsilciniz iletişim bilgisi girmemiş.
          </p>
        )}
      </div>
    </div>
  );
}
