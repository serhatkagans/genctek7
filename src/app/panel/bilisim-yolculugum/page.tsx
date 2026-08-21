import { Sparkles } from "lucide-react";
import {
  KayitEklemeFormu,
  KayitYonetimi,
} from "@/components/ProfilDuzenleme";
import { BilgiKutusu, Kart, KartBasligi, SayfaBasligi } from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { kazanimEkSinirlariniGetir } from "@/lib/kazanim/ek";
import {
  kayitEklemeGruplari,
  kazanimTipiGecerliMi,
} from "@/lib/kazanim/kurallar";
import { ogrenciMi } from "@/lib/yetki/izinler";
import {
  kazanimBelgeEkleEylemi,
  kazanimBelgeSilEylemi,
  kazanimEkleEylemi,
  kazanimSilEylemi,
} from "../profil/kazanim-eylemleri";

export const dynamic = "force-dynamic";

/**
 * Eylemlerin `?durum=` ile döndürdüğü iletiler; panelin sözlüğüyle aynı
 * cümleler — aynı iş iki ekranda iki türlü anlatılmasın.
 */
const DURUM_MESAJLARI: Record<string, string> = {
  "kazanim-eklendi": "Kayıt profiline eklendi.",
  "kazanim-silindi": "Kayıt silindi.",
  "belge-eklendi": "Destekleyici belge eklendi.",
  "belge-silindi": "Destekleyici belge kaldırıldı.",
};

/**
 * BİLİŞİM YOLCULUĞUM — kişinin kendi girdiği kayıtlar (21 Ağustos 2026).
 *
 * İstek: "Kayıtlarım ve katkı nişanlarımı panelden kaldır alttan, üst alanda
 * kart olarak gelsin kendi sayfaları olsun, kayıtlarım ismi bilişim yolculuğum
 * olsun."
 *
 * Bölüm panelin en altında katlanır bir kutuydu; panel yedi formun üst üste
 * dizildiği bir sayfaya dönmüştü. Kayıt girmek tek başına bir iştir ve kendi
 * ekranını hak ediyor — panelde yerine bir kart var, kart da buraya getiriyor.
 *
 * ADI DEĞİŞTİ, İÇERİĞİ DEĞİL: "Kayıtlarım" kişinin profilinde bu kayıtların
 * göründüğü başlığın adıyla ("Bilişim Yolculuğum") eşleşmiyordu; kullanıcı
 * kaydı nereye gireceğini, profilinde nerede göreceğine bakarak arıyor.
 *
 * TÜR ADRESTEN GELİR (`?tur=…`): kayıt formunun alanları türe göre değişiyor
 * (derece yalnızca yarışmada var) ve sayfada JavaScript yok — form sunucuda o
 * türe göre basılmak zorunda.
 */
export default async function BilisimYolculugumSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ tur?: string; durum?: string; hata?: string }>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  const { tur: istenenTur, durum, hata } = await searchParams;

  const [profilKaydi, belgeSinirlari, programlar] = await Promise.all([
    prisma.kullanici.findUniqueOrThrow({
      where: { id: kullanici.id },
      select: {
        kazanimlar: {
          // Kullanıcının girdiği tarih boş olabildiği için ikinci sıralama
          // ölçütü gerekiyor; yoksa tarihsiz kayıtların sırası belirsiz kalır.
          orderBy: [{ tarih: "desc" }, { olusturmaTarihi: "desc" }],
          include: {
            ekler: {
              select: { id: true, dosyaAdi: true },
              orderBy: { yuklenmeTarihi: "asc" },
            },
            baglantilar: {
              select: { id: true, adres: true, etiket: true },
              orderBy: { siraNo: "asc" },
            },
          },
        },
      },
    }),
    /*
     * Destekleyici belge sınırları etkinlik ekleriyle ORTAKTIR: ikisi de aynı
     * türde içerik taşıyor. Ayrışmaları gerekirse değişecek tek yer
     * lib/kazanim/ek.ts.
     */
    kazanimEkSinirlariniGetir(),
    /*
     * Kayıt formunun "GençTek etkinliği" listesi, faaliyet formununkiyle AYNI
     * kaynaktan gelir. Pasife alınmışlar teklif edilmez; geçmiş kayıtların
     * bağlantısı korunur.
     */
    prisma.temelEtkinlikProgrami.findMany({
      where: { aktif: true },
      orderBy: [{ grup: "asc" }, { siraNo: "asc" }],
      select: { id: true, ad: true, grup: true },
    }),
  ]);

  const kazanimSahibi = ogrenciMi(kullanici) ? "OGRENCI" : "OGRETMEN";

  /*
   * ADRESTEKİ TÜR YALNIZCA KENDİ BÖLÜMÜNÜ İLGİLENDİRİR (21 Ağustos 2026):
   * `?tur=` çok tipli tek gruptan (Deneyimlerim) gelir ve o grubun formunu
   * belirler. Öbür bölümler kendi ilk türünde kalır — bir bölümdeki seçimin
   * yandaki bölümün formunu değiştirmesi, ortak formdan kalma davranıştı.
   */
  const seciliTur =
    istenenTur && kazanimTipiGecerliMi(istenenTur) ? istenenTur : null;
  const gruplar = kayitEklemeGruplari(kazanimSahibi);

  const izinliBelgeTipleri = [
    ...belgeSinirlari.izinliGorselTipleri,
    ...belgeSinirlari.izinliBelgeTipleri,
  ];

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik={ogrenciMi(kullanici) ? "Bilişim Yolculuğum" : "Kayıtlarım"}
        aciklama={`${profilKaydi.kazanimlar.length} kayıt`}
      />

      {durum && DURUM_MESAJLARI[durum] && (
        <BilgiKutusu cesit="olumlu">{DURUM_MESAJLARI[durum]}</BilgiKutusu>
      )}
      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}

      {/*
        HER BAŞLIK KENDİ KARTI, KENDİ FORMU (21 Ağustos 2026 · istek: "ürünlerim
        altında kendi formu, deneyimlerim altında kendi formu, gençtek
        yolculuğum altında kendi formu olacak; bu üç başlık için ortak form
        olmasın").

        Önce tek bir "Yeni kayıt ekle" kartı vardı ve bütün grupların sekmeleri
        onun üstünde sıralanıyordu; başlıklar alt alta durdukları için hangi
        formun hangisine ait olduğu okunmuyordu. Kartın kendisi ayraçtır.

        Bölümler `kayitEklemeGruplari` sırasıyla basılır — profildeki başlık
        sırasıyla aynı: kişi kaydı nereye gireceğini, profilinde nerede
        göreceğine bakarak buluyor.
      */}
      {gruplar.map(({ grup, tanimlar }) => {
        const seciliTanim =
          tanimlar.find((tanim) => tanim.tip === seciliTur) ?? tanimlar[0];

        return (
          <Kart key={grup.kod}>
            <KartBasligi
              baslik={grup.baslik}
              aciklama={grup.aciklama}
              Ikon={Sparkles}
            />
            <KayitEklemeFormu
              grup={grup}
              tanimlar={tanimlar}
              seciliTanim={seciliTanim}
              programlar={programlar}
              izinliBelgeTipleri={izinliBelgeTipleri}
              belgeSinirlari={belgeSinirlari}
              ekleEylemi={kazanimEkleEylemi}
            />
          </Kart>
        );
      })}

      <Kart>
        <KartBasligi baslik="Girdiğim kayıtlar" />
        <KayitYonetimi
          kazanimlar={profilKaydi.kazanimlar}
          sahip={kazanimSahibi}
          silmeEylemi={kazanimSilEylemi}
          belgeEkleEylemi={kazanimBelgeEkleEylemi}
          belgeSilEylemi={kazanimBelgeSilEylemi}
          izinliBelgeTipleri={izinliBelgeTipleri}
        />
      </Kart>
    </div>
  );
}
