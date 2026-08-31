import { Award, CalendarCheck } from "lucide-react";
import Link from "next/link";
import { BilgiKutusu, Kart, KartBasligi, SayfaBasligi } from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { belgeKapisi } from "@/lib/belge/kapi";
import { tarihYaz } from "@/lib/tarih";
import { belgeUretenRoldeMi } from "@/lib/yetki/izinler";
import { raporlanabilirFaaliyetFiltresi } from "@/lib/yetki/kapsam";

export const dynamic = "force-dynamic";

/**
 * Belge oluşturma girişi — faaliyet seçme ekranı.
 *
 * Belgeler faaliyet detayından da üretilebiliyor; bu ekran menüden doğrudan
 * gelen yolu açıyor. İkisi aynı sayfaya çıkıyor, ayrı bir üretim yolu
 * AÇILMIYOR — iki ayrı akış olsaydı yetki ve metin kuralları iki yerde
 * tutulurdu.
 *
 * Kapsam raporlamayla aynı (raporlanabilirFaaliyetFiltresi): kendi açtığın
 * faaliyetler, koordinatörsen ilindekiler, merkezsen hepsi. Ayrı bir filtre
 * yazmak, aynı sorunun iki cevabını doğururdu.
 *
 * RAPOR ARTIK ÖN KOŞUL (12 Ağustos 2026 · istek: "etkinlik raporu yazılmadan
 * belge oluştur seçeneği olmamalı"). Ekran raporsuz etkinliği GİZLEMİYOR, ayrı
 * bir başlıkta ve rapor bağlantısıyla gösteriyor: gizleseydi öğretmen aradığı
 * etkinliği listede bulamaz ve sebebini de öğrenemezdi.
 *
 * Eski not — "bitmiş olma koşulu yok, belge aynı gün de verilebilir" — artık
 * kendiliğinden sağlanıyor: rapor bitmeden yazılamadığı için belge de
 * bitmeden üretilemiyor.
 */
export default async function BelgelerGirisSayfasi() {
  const kullanici = await oturumKullanicisiZorunlu();

  /*
   * ÜRETEMEYEN KİŞİ EKRANI GÖRÜR AMA LİSTEYİ GÖRMEZ (31 Ağustos 2026 ·
   * istekler: "Öğretmen de belge oluşturamasın … öğretmenin belge üretme
   * butonları pasif olsun" · "Bu yazı katılım ve teşekkür belgesi oluşturmak
   * için il koordinatörleri ile iletişim kurunuz olsun").
   *
   * NİYE 404 DEĞİL: ekran sol menüde duruyor ve öğretmen oraya tıklamaya devam
   * ediyor. Sayfayı kapatmak, tıkladığı yerin kaybolması demekti; kişinin
   * sorusu ("belgeyi nasıl aldıracağım") ise cevapsız kalırdı. Aynı ölçü
   * etkinlik sayfasındaki pasif düğmede de var — kapı kapalı olduğunu ve
   * anahtarın kimde olduğunu söylüyor.
   *
   * ÖĞRETMEN 31 AĞUSTOS'A KADAR LİSTEYİ GÖRÜYORDU: koşul "danışman VEYA
   * koordinatör VEYA merkez" idi. Artık tek soru rol
   * (bkz. lib/yetki/izinler.ts · belgeUretenRoldeMi) ve kapı, etkinlik başına
   * sorulan kapıyla aynı kararı veriyor — biri açıp öbürü kapatmıyor.
   */
  if (!belgeUretenRoldeMi(kullanici)) {
    return (
      <div className="space-y-6">
        <SayfaBasligi
          baslik="Belge oluştur"
          aciklama="Katılım ve teşekkür belgesi oluşturmak için il koordinatörleri ile iletişim kurunuz."
          /*
            GERİ BAĞLANTISI ETKİNLİKLER (31 Ağustos 2026 · istek: "Öğretmen
            belge oluştura basınca navigasyon profile gidiyor, o etkinliklere
            gidecek navigasyon").

            Varsayılan "← Profil"di ve kişiyi GELDİĞİ yere değil bir üst
            basamağa atıyordu — üstelik Profil sol menüde zaten duruyor, yani
            bağlantı hiçbir yeni yol açmıyordu. Bu ekranın konusu etkinlikler:
            listelediği her satır bir etkinlik ve satırların gittiği yer de
            etkinlik ekranları. Geri bağlantısının işi, ekrandan konusunun
            durduğu yere dönmektir (aynı ölçü Yönetim panelinden açılan
            ekranlarda da uygulanıyor, bkz. components/ui.tsx · SayfaBasligi).
          */
          geri={{ yol: "/panel/etkinlikler", etiket: "Etkinlikler" }}
        />

        <Kart className="text-metin-yumusak">
          Belgeler il koordinatörleri tarafından oluşturulur. Etkinliğin
          yoklamasını alıp bilgi raporunu sisteme eklediğinizde belge adımı
          koordinatörünüze düşer.
        </Kart>
      </div>
    );
  }

  const simdi = new Date();

  const faaliyetler = await prisma.faaliyet.findMany({
    where: {
      AND: [raporlanabilirFaaliyetFiltresi(kullanici), { durum: "AKTIF" }],
    },
    orderBy: { tarih: "desc" },
    take: 100,
    select: {
      id: true,
      ad: true,
      tarih: true,
      bitisTarihi: true,
      kurum: { select: { ad: true } },
      il: { select: { ad: true } },
      // Rapor kaydının VARLIĞI soruluyor, metni değil: kapının tek sorusu bu
      // (bkz. lib/belge/kapi.ts · belgeKapisi).
      rapor: { select: { faaliyetId: true } },
      _count: { select: { basvurular: true } },
    },
  });

  const bitmisMi = (f: (typeof faaliyetler)[number]) =>
    (f.bitisTarihi ?? f.tarih) <= simdi;
  const raporluMu = (f: (typeof faaliyetler)[number]) =>
    belgeKapisi({ raporVarMi: f.rapor !== null }).olurMu;

  const hazirlar = faaliyetler.filter(raporluMu);
  // Raporsuzlar arasında yalnızca BİTENLER gösteriliyor: bitmemiş etkinliğin
  // raporu zaten yazılamaz, listede durması "eksik iş" gibi okunurdu.
  const raporBekleyenler = faaliyetler.filter(
    (f) => !raporluMu(f) && bitmisMi(f),
  );

  const satir = (f: (typeof faaliyetler)[number]) => (
    <li
      key={f.id}
      className="flex flex-wrap items-center justify-between gap-3 py-3"
    >
      <div className="min-w-0">
        <Link
          href={
            raporluMu(f)
              ? `/panel/etkinlikler/${f.id}/belgeler`
              : `/panel/etkinlikler/${f.id}/rapor`
          }
          className="font-medium text-vurgu-metin underline underline-offset-2"
        >
          {f.ad}
        </Link>
        <p className="mt-0.5 text-sm text-metin-yumusak">
          {f.kurum?.ad ?? f.il?.ad ?? "Ülke geneli"}
          {" · "}
          {f._count.basvurular} başvuru
          {raporluMu(f) ? "" : " · raporu yazılmadı"}
        </p>
      </div>
      <span className="text-sm text-metin-yumusak">
        {tarihYaz(f.bitisTarihi ?? f.tarih)}
      </span>
    </li>
  );

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Belge oluştur"
        aciklama="Katılım ve teşekkür belgesi vermek istediğiniz etkinliği seçin."
        /*
          GERİ BAĞLANTISI ETKİNLİKLER (31 Ağustos 2026 · istek: "Öğretmen
          belge oluştura basınca navigasyon profile gidiyor, o etkinliklere
          gidecek navigasyon").

          Varsayılan "← Profil"di ve kişiyi GELDİĞİ yere değil bir üst
          basamağa atıyordu — üstelik Profil sol menüde zaten duruyor, yani
          bağlantı hiçbir yeni yol açmıyordu. Bu ekranın konusu etkinlikler:
          listelediği her satır bir etkinlik ve satırların gittiği yer de
          etkinlik ekranları. Geri bağlantısının işi, ekrandan konusunun
          durduğu yere dönmektir (aynı ölçü Yönetim panelinden açılan
          ekranlarda da uygulanıyor, bkz. components/ui.tsx · SayfaBasligi).
        */
        geri={{ yol: "/panel/etkinlikler", etiket: "Etkinlikler" }}
      />

      {/*
        KUTU TEK CÜMLEYE İNDİ (31 Ağustos 2026 · istek: "Bu yazı yerine belge
        oluşturabilmesi için etkinlik bilgi raporunun sisteme eklenmiş olması
        gerekmektedir yazsın").

        Eski metin dört şeyi birden anlatıyordu: iki ön koşul, yazdırma akışı
        ve erişim kaydı. Üçü de EKRANIN KENDİSİNDE zaten görünüyor — raporsuz
        etkinlikler ayrı başlıkta ve "raporu yazılmadı" notuyla listeleniyor,
        yoklama koşulu belge ekranında satır satır söyleniyor, yazdırma akışını
        da belge ekranı yazıyor. Kapağın üstündeki uyarı kutusu bunları
        okunmadan geçilen bir paragrafa çeviriyordu.

        Geriye kutuyu haklı çıkaran tek bilgi kalıyor: listede aradığı
        etkinliği bulamayan kişinin sebebi.
      */}
      <BilgiKutusu cesit="uyari">
        Belge oluşturabilmesi için etkinlik bilgi raporunun sisteme eklenmiş
        olması gerekmektedir.
      </BilgiKutusu>

      {faaliyetler.length === 0 ? (
        <Kart className="text-metin-yumusak">
          Belge üretebileceğiniz etkinlik yok. Kendi açtığınız etkinlikler ve —
          koordinatörseniz — ilinizdeki etkinlikler burada listelenir.
        </Kart>
      ) : (
        <>
          <Kart>
            <KartBasligi
              baslik="Belge üretilebilir etkinlikler"
              aciklama="Raporu yazılmış etkinlikler."
              Ikon={Award}
            />
            {hazirlar.length === 0 ? (
              <p className="text-metin-yumusak">
                Raporu yazılmış etkinlik yok. Belge üretebilmek için önce
                etkinliğin raporunu yazın.
              </p>
            ) : (
              <ul className="divide-y divide-cizgi">{hazirlar.map(satir)}</ul>
            )}
          </Kart>

          {raporBekleyenler.length > 0 && (
            <Kart>
              <KartBasligi
                baslik="Raporu bekleyen etkinlikler"
                aciklama="Bitmiş ama raporu yazılmamış; belge üretilemez. Ad, doğrudan rapor ekranına gider."
                Ikon={CalendarCheck}
              />
              <ul className="divide-y divide-cizgi">
                {raporBekleyenler.map(satir)}
              </ul>
            </Kart>
          )}
        </>
      )}
    </div>
  );
}
