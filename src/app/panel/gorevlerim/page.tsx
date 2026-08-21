import { KatkiKarti } from "@/components/KatkiKarti";
import { OgretmenKatkiKarti } from "@/components/OgretmenKatkiKarti";
import { SayfaBasligi } from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { katkiVerisiGetir } from "@/lib/ogrenci/katki";
import { ogretmenKatkiVerisiGetir } from "@/lib/ogretmen/katki";
import { ogrenciMi } from "@/lib/yetki/izinler";

export const dynamic = "force-dynamic";

/**
 * GÖREVLERİM — kişinin GençTek içinde aldığı görevler (21 Ağustos 2026).
 *
 * İstek: "Şu bölüm kalkacak: GençTek Yolculuğum. Ancak yaptığı görevler
 * Görevlerim kart olarak yukarı taşınacak."
 *
 * Panelin altındaki "GençTek Yolculuğum" kartı kalktı; içindeki asıl bilgi —
 * temsilcilikler, görev alınan organizasyonlar, çalışma grupları ve verilen
 * akran eğitimleri — bu sayfada duruyor. Panelde yerine bir kart var ve görev
 * sayısını da o kart söylüyor.
 *
 * EYLEMSİZ BASILIYOR: kazanım eylemleri verilmediğinde silme ve belge formları
 * hiç çıkmıyor (bkz. KazanimEylemleri). Kayıt düzenleme tek yerde — Bilişim
 * Yolculuğum ekranında.
 *
 * ÖĞRENCİ VE ÖĞRETMEN AYNI ADRESİ kullanır ama farklı kart görür: ikisinin
 * görevi farklı tablolardan doğuyor (öğrencide temsilcilik ve çalışma grubu,
 * öğretmende görev geçmişi ve danışmanlık).
 */
export default async function GorevlerimSayfasi() {
  const kullanici = await oturumKullanicisiZorunlu();

  if (ogrenciMi(kullanici)) {
    const [katki, kazanimlar] = await Promise.all([
      katkiVerisiGetir(kullanici.id),
      /*
       * Akran eğitimleri kazanım kayıtlarından geliyor: kart yalnızca GençTek
       * tarafındaki tipi (AKRAN_EGITIMI) süzüp basıyor, gerisi Bilişim
       * Yolculuğum ekranına ait.
       */
      prisma.kullaniciKazanim.findMany({
        where: { kullaniciId: kullanici.id, tip: "AKRAN_EGITIMI" },
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
      }),
    ]);

    return (
      <div className="space-y-6">
        <SayfaBasligi
          baslik="Görevlerim"
          aciklama={`${katki.gorevler.length} temsilcilik · ${katki.faaliyetler.length} organizasyon`}
        />
        <KatkiKarti
          kendiMi
          gorevler={katki.gorevler}
          gruplar={katki.gruplar}
          faaliyetler={katki.faaliyetler}
          egitimOgretimYili={kullanici.egitimOgretimYili}
          kazanimlar={kazanimlar}
        />
      </div>
    );
  }

  const katki = await ogretmenKatkiVerisiGetir(kullanici.id);

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Görevlerim"
        aciklama={`${katki.gorevler.length} görev · ${katki.faaliyetler.length} etkinlik · ${katki.aktifDanismanlik} aktif danışmanlık`}
      />
      <OgretmenKatkiKarti
        kendiMi
        gorevler={katki.gorevler}
        aktifDanismanlik={katki.aktifDanismanlik}
        faaliyetler={katki.faaliyetler}
      />
    </div>
  );
}
