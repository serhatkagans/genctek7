import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { DisaAktarmaBagi } from "@/components/DisaAktarmaBagi";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  KirintiYolu,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import {
  AYAR_ANAHTARLARI,
  ayarSayi,
  VARSAYILAN_DISA_AKTARMA_UST_SINIRI,
} from "@/lib/ayar";
import { okulTuruSecenekleri } from "@/lib/okul/turler";
import { prisma } from "@/lib/db";
import {
  KIRILIM_ACIKLAMALARI,
  KIRILIM_ETIKETLERI,
  KIRILIMLAR,
} from "@/lib/rapor/okul-eksikleri";
import {
  eksikOkullar,
  eksikSayimlari,
} from "@/lib/rapor/okul-eksikleri-ozeti";
import {
  projeYoneticisiMi,
  yonetimPanosuGorebilirMi,
} from "@/lib/yetki/izinler";
import type { SorguParametreleri } from "../ogrenciler/filtreler";
import { eksikSorgusu, eksikSuzgeciniCoz, kirilimCoz } from "./filtreler";

export const dynamic = "force-dynamic";

const SAYFA_BOYUTU = 50;
const YOL = "/panel/okul-eksikleri";

/**
 * OKUL EKSİK DURUM ANALİZİ (15 Ağustos 2026).
 *
 * Manisa farkları turu. Yönetim Paneli "burada kaç okul var"
 * diye sayıyor; bu ekran "hangi okulda ne eksik" diye soruyor. İkisi ayrı
 * ekran çünkü ikisi ayrı iş: biri durum raporu, bu bir GÖREV LİSTESİ.
 *
 * SEKME ADRESTEN OKUNUYOR (`?kirilim=`), bileşen durumundan değil: sunucu
 * bileşeni ek durum tutmaz ve "öğrencisi olup temsilcisi olmayan okullar"
 * listesinin bağlantısı paylaşılabilir olmalı — o liste birinin gündemine
 * gireceği için.
 *
 * KAPI YÖNETİM PANOSUNUNKİ (`yonetimPanosuGorebilirMi`): merkez ve il
 * koordinatörü. Danışman öğretmen AÇAMAZ — kendi okulunun eksiğini zaten
 * görüyor, başka okulların sayımı ona veri sızdırır.
 */
export default async function OkulEksikleriSayfasi({
  searchParams,
}: {
  searchParams: Promise<SorguParametreleri>;
}) {
  const parametreler = await searchParams;
  const kullanici = await oturumKullanicisiZorunlu();

  if (!yonetimPanosuGorebilirMi(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="Okul eksik durumları"
          aciklama="Bu ekran merkez ve il koordinatörlerine açıktır."
        />
      </Kart>
    );
  }

  const merkezMi = projeYoneticisiMi(kullanici);
  const suzgec = eksikSuzgeciniCoz(kullanici, parametreler);
  const kirilim = kirilimCoz(parametreler);
  const sayfaNo = Math.max(
    1,
    Number.parseInt((parametreler.sayfa as string) ?? "1", 10) || 1,
  );

  const [sayimlar, okullar, iller, ilceler, turler, ustSinir] = await Promise.all([
    eksikSayimlari(suzgec),
    eksikOkullar(kirilim, suzgec, sayfaNo, SAYFA_BOYUTU),
    /*
     * İl süzgeci YALNIZCA MERKEZDE teklif ediliyor: koordinatörün ili zaten
     * sabit (bkz. eksikSuzgeciniCoz) ve tek seçenekli bir açılır liste,
     * seçilebilirmiş izlenimi verirdi.
     */
    merkezMi
      ? prisma.il.findMany({ orderBy: { ad: "asc" }, select: { ilKodu: true, ad: true } })
      : Promise.resolve([]),
    suzgec.ilKodu
      ? prisma.ilce.findMany({
          where: { ilKodu: suzgec.ilKodu },
          orderBy: { ad: "asc" },
          select: { ilceKodu: true, ad: true },
        })
      : Promise.resolve([]),
    /*
     * Okul türleri VERİDEN geliyor, sabit listeden değil: tür alanı e-Okul'dan
     * serbest metin olarak gelir ve elle yazılmış bir liste, yeni bir tür
     * eklendiğinde onu süzgeçte görünmez kılardı.
     */
    prisma.kurum.findMany({
      where: { aktif: true, ...(suzgec.ilKodu ? { ilKodu: suzgec.ilKodu } : {}) },
      distinct: ["okulTuru"],
      orderBy: { okulTuru: "asc" },
      select: { okulTuru: true },
    }),
    ayarSayi(
      AYAR_ANAHTARLARI.DISA_AKTARMA_UST_SINIRI,
      VARSAYILAN_DISA_AKTARMA_UST_SINIRI,
    ),
  ]);

  const toplam = sayimlar[kirilim];
  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA_BOYUTU));
  const disaAktarmaBaglantisi = `${YOL}/disa-aktar?${eksikSorgusu(suzgec, {
    kirilim,
  })}`;

  return (
    <div className="space-y-6">
      {/*
        KIRINTI YOLU (29 Ağustos 2026 · istekler: "navigasyon bunu göstersin
        yönetim paneli / rol envanteri şeklinde" · "yönetim panelindeki tüm
        kartlara uygula").

        Yerinde tek başına "← Yönetim Paneli" bağlantısı vardı: dönülecek
        yeri söylüyor, bulunulan yeri söylemiyordu. Şerit ikisini birden
        basıyor ve panodan açılan HER ekranda aynı biçimde duruyor.

        SON BASAMAK BAĞLANTI DEĞİL (bkz. components/ui.tsx · KirintiYolu);
        SayfaBasligi'nın geri bağlantısı bu yüzden `null` — ikisi bir arada
        aynı yolu üst üste iki kez basardı.
      */}
      <KirintiYolu
        basamaklar={[
          { etiket: "Yönetim Paneli", yol: "/panel/yonetim" },
          { etiket: "Okul eksik durumları" },
        ]}
      />

      <SayfaBasligi
        geri={null}
        baslik="Okul eksik durumları"
        aciklama={`Danışman, öğrenci ve temsilci eksiği olan okullar · ${suzgec.egitimOgretimYili} dönemi`}
      />

      {/*
        ÖZET ŞERİDİ SEKMELERDEN AYRI: dört sayı bir arada okunduğunda "bu ilde
        asıl sorun ne" sorusunun cevabı görünüyor. Yalnızca açık sekmenin sayısı
        gösterilseydi kullanıcı dördünü de tıklayarak karşılaştırmak zorunda
        kalırdı.
      */}
      <Kart>
        <KartBasligi baslik="Özet" Ikon={TriangleAlert} />
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {KIRILIMLAR.map((deger) => (
            <div key={deger}>
              <dt className="text-sm text-metin-yumusak">
                {KIRILIM_ETIKETLERI[deger]}
              </dt>
              <dd className="text-2xl font-semibold text-baslik">
                {sayimlar[deger]}
              </dd>
            </div>
          ))}
        </dl>
      </Kart>

      <Kart>
        <form method="get" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Sekme formda gizli alan: süzgeç uygulanınca açık sekme korunmalı. */}
          <input type="hidden" name="kirilim" value={kirilim} />

          <label className="block">
            <span className="text-sm font-medium text-metin">Okul / ilçe ara</span>
            <input
              type="search"
              name="ara"
              defaultValue={suzgec.ara ?? ""}
              placeholder="Okul ya da ilçe adı"
              className={SINIF_GIRDI}
            />
          </label>

          {merkezMi && (
            <label className="block">
              <span className="text-sm font-medium text-metin">İl</span>
              <select name="il" defaultValue={suzgec.ilKodu ?? ""} className={SINIF_GIRDI}>
                <option value="">Tüm iller</option>
                {iller.map((il) => (
                  <option key={il.ilKodu} value={il.ilKodu}>
                    {il.ad}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="text-sm font-medium text-metin">İlçe</span>
            <select
              name="ilce"
              defaultValue={suzgec.ilceKodu ?? ""}
              className={SINIF_GIRDI}
              disabled={ilceler.length === 0}
            >
              <option value="">Tüm ilçeler</option>
              {ilceler.map((ilce) => (
                <option key={ilce.ilceKodu} value={ilce.ilceKodu}>
                  {ilce.ad}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-metin">Okul türü</span>
            <select
              name="okulTuru"
              defaultValue={suzgec.okulTuru ?? ""}
              className={SINIF_GIRDI}
            >
              <option value="">Tüm türler</option>
              {/*
                Seçenekler Okullar ekranıyla AYNI KAYNAKTAN (26 Ağustos 2026):
                iki ekran aynı süzgeci basıyor ve birinde görünen bir türün
                diğerinde görünmemesi, listenin veriye değil bakılan ekrana
                bağlı olduğunu düşündürürdü (bkz. lib/okul/turler.ts).
              */}
              {okulTuruSecenekleri(turler.map((tur) => tur.okulTuru)).map(
                (tur) => (
                  <option key={tur} value={tur}>
                    {tur}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-metin">Dönem</span>
            <input
              type="text"
              name="yil"
              defaultValue={suzgec.egitimOgretimYili}
              pattern="\d{4}-\d{4}"
              className={SINIF_GIRDI}
            />
          </label>

          <div className="sm:col-span-2 lg:col-span-5">
            <button type="submit" className={SINIF_BIRINCIL_BUTON}>
              Filtrele
            </button>
          </div>
        </form>
      </Kart>

      {/*
        SEKMELER BAĞLANTI, DÜĞME DEĞİL: her sekme kendi adresine sahip olmalı ki
        "öğrencisi olup temsilcisi olmayan okullar" listesi paylaşılabilsin.
        Sayfa numarası sekme değişince DÜŞÜYOR — üçüncü sayfadayken sekme
        değiştiren kişi, yeni listenin üçüncü sayfasında değil başında olmalı.
      */}
      <nav className="flex flex-wrap gap-2" aria-label="Eksik türü">
        {KIRILIMLAR.map((deger) => (
          <Link
            key={deger}
            href={`${YOL}?${eksikSorgusu(suzgec, { kirilim: deger })}`}
            aria-current={deger === kirilim ? "page" : undefined}
            className={
              deger === kirilim
                ? "rounded-kart bg-vurgu-zemin px-3 py-2 text-sm font-medium text-vurgu-metin"
                : "rounded-kart border border-cizgi px-3 py-2 text-sm text-metin-yumusak"
            }
          >
            {KIRILIM_ETIKETLERI[deger]} ({sayimlar[deger]})
          </Link>
        ))}
      </nav>

      <Kart>
        <KartBasligi
          baslik={KIRILIM_ETIKETLERI[kirilim]}
          aciklama={KIRILIM_ACIKLAMALARI[kirilim]}
        />

        {/*
          SINIR EKRANDA SÖYLENİYOR: ülke genelinde bir kırılım üst sınırı
          aşabiliyor. Bağlantı yine de gösterilseydi kullanıcı tıklayıp 413
          duvarına çarpar ve bunu arıza sanardı (aynı düzeltme erişim
          kayıtlarında da yapıldı).
        */}
        {toplam > ustSinir ? (
          <BilgiKutusu cesit="uyari">
            Bu süzgeçlerle {toplam} okul var; tek dosyada en fazla {ustSinir}{" "}
            kayıt indirilebilir. İl, ilçe ya da okul türü süzgeciyle daraltın.
          </BilgiKutusu>
        ) : (
          toplam > 0 && (
            <p className="mb-4">
              <DisaAktarmaBagi yol={disaAktarmaBaglantisi} kayitSayisi={toplam} />
            </p>
          )
        )}

        {okullar.length === 0 ? (
          <BilgiKutusu cesit="olumlu">
            Bu süzgeçlerle eksik bulunamadı.
          </BilgiKutusu>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-cizgi text-metin-yumusak">
                <tr>
                  <th className="py-2 pr-4 font-medium">İl</th>
                  <th className="py-2 pr-4 font-medium">İlçe</th>
                  <th className="py-2 pr-4 font-medium">Okul</th>
                  <th className="py-2 pr-4 font-medium">Tür</th>
                  <th className="py-2 pr-4 font-medium">Kurum kodu</th>
                  <th className="py-2 pr-4 font-medium">Öğrenci</th>
                  <th className="py-2 font-medium">Danışman</th>
                </tr>
              </thead>
              <tbody>
                {okullar.map((okul) => (
                  <tr key={okul.kurumKodu} className="border-b border-cizgi">
                    <td className="py-2 pr-4">{okul.ilAdi}</td>
                    <td className="py-2 pr-4">{okul.ilceAdi}</td>
                    <td className="py-2 pr-4 font-medium text-metin">
                      {okul.ad}
                    </td>
                    <td className="py-2 pr-4 text-metin-yumusak">
                      {okul.okulTuru}
                    </td>
                    <td className="py-2 pr-4 text-metin-yumusak">
                      {okul.kurumKodu}
                    </td>
                    <td className="py-2 pr-4">{okul.ogrenciSayisi}</td>
                    <td className="py-2">{okul.ogretmenSayisi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {sonSayfa > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-metin-yumusak">
            <span>
              {(sayfaNo - 1) * SAYFA_BOYUTU + 1}–
              {Math.min(sayfaNo * SAYFA_BOYUTU, toplam)} / {toplam} okul
            </span>
            <span className="flex gap-2">
              {sayfaNo > 1 && (
                <Link
                  href={`${YOL}?${eksikSorgusu(suzgec, {
                    kirilim,
                    sayfa: sayfaNo - 1,
                  })}`}
                  className="rounded-kart border border-cizgi px-3 py-1"
                >
                  Önceki
                </Link>
              )}
              {sayfaNo < sonSayfa && (
                <Link
                  href={`${YOL}?${eksikSorgusu(suzgec, {
                    kirilim,
                    sayfa: sayfaNo + 1,
                  })}`}
                  className="rounded-kart border border-cizgi px-3 py-1"
                >
                  Sonraki
                </Link>
              )}
            </span>
          </div>
        )}
      </Kart>
    </div>
  );
}
