import { notFound } from "next/navigation";
import { BelgeKagidi } from "@/components/belge/BelgeKagidi";
import { BelgeStilleri } from "@/components/belge/BelgeStilleri";
import { YazdirButonu } from "@/components/YazdirButonu";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import {
  aliciAdiniCoz,
  belgeMetniUret,
  belgeTuruMu,
  imzaBilgisiniCoz,
  imzaUnvaniOner,
} from "@/lib/belge/kurallar";
import { belgeKapisi, katilimciBelgeKapisi } from "@/lib/belge/kapi";
import {
  belgeUretiminiKaydet,
  faaliyetRaporuVarMi,
  secilmisKatilimcilariGetir,
} from "@/lib/belge/kayit";
import { faaliyetKapsamiCikar, gorunurFaaliyetGetir } from "@/lib/faaliyet/erisim";
import { uygulamaYolu } from "@/lib/ortam";
import { tarihYaz } from "@/lib/tarih";
import { faaliyetBelgesiUretebilirMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";

export const dynamic = "force-dynamic";

export default async function BelgeSayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tur?: string;
    ad?: string;
    katilimciId?: string;
    metin?: string;
    imzaAd?: string;
    imzaUnvan?: string;
  }>;
}) {
  const [{ id }, { tur, ad, katilimciId, metin, imzaAd, imzaUnvan }] =
    await Promise.all([params, searchParams]);
  const kullanici = await oturumKullanicisiZorunlu();

  const faaliyet = await gorunurFaaliyetGetir(kullanici, Number.parseInt(id, 10));
  if (!faaliyet) notFound();
  if (!faaliyetBelgesiUretebilirMi(kullanici, faaliyetKapsamiCikar(faaliyet))) notFound();
  if (!tur || !belgeTuruMu(tur)) notFound();

  /*
   * ALICI İKİ YOLDAN GELİR (7 Ağustos 2026):
   *
   *   · `katilimciId` — listedeki bir katılımcı. Ad VERİTABANINDAN çözülür,
   *     adresten değil: adres çubuğundaki adla basılsaydı kayıt "Ayşe Yılmaz"
   *     adına düşer, o adın hangi öğrenci olduğu belirsiz kalırdı. Kimliğin
   *     bu faaliyetin seçilmiş katılımcısına ait olduğu ayrıca doğrulanır.
   *
   *   · `ad` — serbest metin. "Listede olmayan biri için" formundan gelir
   *     (konuşmacı, destek veren kurum). Profili olmadığı için kaydı da
   *     tutulmaz; belge yine de basılır.
   */
  const istenenKimlik = katilimciId
    ? Number.parseInt(katilimciId, 10)
    : Number.NaN;

  const katilimci = Number.isInteger(istenenKimlik)
    ? (await secilmisKatilimcilariGetir(faaliyet.id)).find(
        (aday) => aday.katilimciId === istenenKimlik,
      )
    : undefined;

  // Kimlik verildi ama katılımcı değil: adres elle kurcalanmış demektir.
  if (Number.isInteger(istenenKimlik) && !katilimci) notFound();

  /*
   * İKİ KAPI (12 Ağustos 2026), ekranda değil BURADA: belge üretimi bir GET
   * isteği ve adresi elle yazılabiliyor. Ekrandaki kapalı düğme yalnızca
   * nezaket; engelin kendisi bu satırlar.
   *
   *   · Rapor yazılmadan belge yok (istek: "etkinlik raporu yazılmadan belge
   *     oluştur seçeneği olmamalı").
   *   · Yoklamada "geldi" işaretlenmemiş katılımcıya belge yok — belge,
   *     kişinin profiline katılım düşürüyor.
   *
   * Serbest metinle gelen alıcı (konuşmacı, destek veren) ikinci kapıya tabi
   * değil: onun başvurusu da yoklaması da yok.
   */
  if (!belgeKapisi({ raporVarMi: await faaliyetRaporuVarMi(faaliyet.id) }).olurMu) {
    notFound();
  }
  if (katilimci && !katilimciBelgeKapisi(katilimci).olurMu) notFound();

  const alici = aliciAdiniCoz(katilimci?.adSoyad ?? ad ?? "");
  if (!alici.olurMu) notFound();

  const belge = belgeMetniUret({
    tur,
    adSoyad: alici.adSoyad,
    faaliyetAdi: faaliyet.ad,
    tarihMetni: tarihYaz(faaliyet.tarih),
    ozelMetin: metin ?? null,
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "GORUNTULEME",
    hedefTip: "FAALIYET",
    hedefId: faaliyet.id,
    detay: `${belge.baslik} üretildi: ${belge.adSoyad}`,
  });

  /*
   * Üretim kaydı erişim logundan AYRI tutulur: log KVKK saklama süresiyle
   * siliniyor, oysa katılım geçmişi kalıcı olmalı (bkz. lib/belge/kayit.ts).
   */
  if (katilimci) {
    await belgeUretiminiKaydet({
      faaliyetId: faaliyet.id,
      katilimciIdleri: [katilimci.katilimciId],
      tur,
      uretenKullaniciId: kullanici.id,
    });
  }

  /*
   * İMZA ARTIK OTURUM KİŞİSİNDEN GELMİYOR (J5 · 6 Ağustos 2026). Belgeyi
   * hazırlayan öğretmen ile imzalayan makam aynı kişi değil: okul içi
   * etkinlikte okul müdürü, il etkinliğinde il millî eğitim müdürü imzalar.
   * Unvan kapsamdan türetiliyor, ad belge üretilirken elle giriliyor — okul
   * müdürünün adı sistemde tutulmuyor ve e-Okul'dan da gelmiyor.
   *
   * Ad boşsa belge ÜRETİLMEZ: imzasız bir katılım belgesi resmî olarak işe
   * yaramaz ve sessizce üretmek, farkına varılmadan imzasız belge dağıtılmasına
   * yol açardı.
   */
  const imza = imzaBilgisiniCoz({
    adSoyad: imzaAd ?? "",
    unvan: imzaUnvan ?? "",
    varsayilanUnvan:
      imzaUnvaniOner(faaliyet.kapsam) ?? faaliyet.duzenleyenBirim,
  });
  if (!imza.olurMu) notFound();

  return (
    <div className="belge-sayfa-kapsayici">
      <BelgeStilleri />

      <div className="arac-cubugu">
        <a href={uygulamaYolu(`/panel/etkinlikler/${faaliyet.id}/belgeler`)} className="arac">
          ← Belgeler
        </a>
        <YazdirButonu className="arac arac-birincil" />
      </div>

      <div className="belge-listesi">
        <BelgeKagidi
          belge={belge}
          imzaAdSoyad={imza.adSoyad}
          imzaBirim={imza.unvan}
        />
      </div>
    </div>
  );
}
