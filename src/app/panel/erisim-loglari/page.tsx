import { ScrollText, Search, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { DisaAktarmaBagi } from "@/components/DisaAktarmaBagi";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  KirintiYolu,
  Rozet,
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
import { sonErisimAnomalileriniGetir } from "@/lib/guvenlik/erisim-anomali";
import {
  anomaliTuruEtiketi,
  GUNLUK_OGRENCI_ERISIM_ESIGI,
  MESAI_BASLANGIC_SAATI,
  MESAI_BITIS_SAATI,
} from "@/lib/guvenlik/erisim-anomali-kurallari";
import {
  erisimLoguSayfasiGetir,
  SAYFA_BOYUTU,
} from "@/lib/rapor/erisim-logu";
import { girdiTarihi, tarihSaatYaz } from "@/lib/tarih";
import {
  LOG_HEDEF_ETIKETLERI,
  LOG_ISLEM_ETIKETLERI,
} from "@/lib/yetki/etiketler";
import { erisimLoglariniGorebilirMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";
import { erisimLogFiltreleriniCoz } from "./filtreler";

export const dynamic = "force-dynamic";

/**
 * Erişim kayıtları — "kim, hangi kaydı, ne zaman gördü veya değiştirdi".
 *
 * KVKK denetiminin dayanağı budur (domain-rules.md Bölüm 10). Ekranın kendisi
 * de loglanır: denetim defterine bakan kişi de deftere geçer.
 */
export default async function ErisimLoglariSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametreler = await searchParams;
  const kullanici = await oturumKullanicisiZorunlu();

  if (!erisimLoglariniGorebilirMi(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="Erişim kayıtları"
          aciklama="Bu ekran yalnızca proje yöneticisine açıktır."
        />
      </Kart>
    );
  }

  /*
   * Çözümleme dışa aktarma rotasıyla PAYLAŞILIYOR (15 Ağustos 2026): ekran ve
   * dosya aynı süzgeçten geçmezse indirilen küme ekranda görünenden farklı
   * olur ve fark kimseye görünmez.
   */
  const { baslangicMetni, bitisMetni, ...filtre } =
    erisimLogFiltreleriniCoz(parametreler);
  const { ara, islem, hedefTip } = filtre;

  const [sonuc, ustSinir, anomaliler] = await Promise.all([
    erisimLoguSayfasiGetir(filtre),
    ayarSayi(
      AYAR_ANAHTARLARI.DISA_AKTARMA_UST_SINIRI,
      VARSAYILAN_DISA_AKTARMA_UST_SINIRI,
    ),
    /*
     * Bulgular SÜZGEÇTEN GEÇMEZ, bilerek. Aşağıdaki süzgeçler "hangi kaydı
     * arıyorum" sorusunun aracı; bulgu listesi ise "bakmam gereken bir şey var
     * mı" sorusunun cevabı. Süzgece bağlansaydı, dar bir süzgeçle gezinen
     * yönetici uyarıyı hiç görmeden ekrandan çıkabilirdi.
     */
    sonErisimAnomalileriniGetir(),
  ]);

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "GORUNTULEME",
    hedefTip: "ERISIM_LOGU",
    hedefId: "liste",
    detay: `Erişim kayıtları görüntülendi (sayfa ${sonuc.sayfa}, ${sonuc.toplam} kayıt)`,
  });

  /** Süzgeçleri koruyan sorgu dizesi; sayfa numarası isteğe bağlı. */
  const suzgecSorgusu = (yeniSayfa?: number) => {
    const parcalar = new URLSearchParams();
    if (ara) parcalar.set("ara", ara);
    if (islem) parcalar.set("islem", islem);
    if (hedefTip) parcalar.set("hedefTip", hedefTip);
    if (baslangicMetni) parcalar.set("baslangic", baslangicMetni);
    if (bitisMetni) parcalar.set("bitis", bitisMetni);
    if (yeniSayfa !== undefined) parcalar.set("sayfa", String(yeniSayfa));
    return parcalar.toString();
  };

  // Sayfa bağlantıları mevcut filtreleri korur.
  const sorgu = (yeniSayfa: number) =>
    `/panel/erisim-loglari?${suzgecSorgusu(yeniSayfa)}`;

  /*
   * İNDİRME BAĞLANTISI SAYFA NUMARASI TAŞIMAZ: ekran 50'şer kayıt gösteriyor
   * ama dosya süzgece uyan kaydın TAMAMI olmalı. Sayfa da taşınsaydı, denetim
   * için indirilen dosya sessizce ilk 50 satırdan ibaret kalırdı.
   */
  const disaAktarmaBaglantisi = `/panel/erisim-loglari/disa-aktar${
    suzgecSorgusu() ? `?${suzgecSorgusu()}` : ""
  }`;

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
          { etiket: "Erişim kayıtları" },
        ]}
      />

      <SayfaBasligi
        geri={null}
        baslik="Erişim kayıtları"
        aciklama={`${sonuc.toplam} kayıt · her veri görüntüleme ve değişiklik işlemi buraya yazılır`}
      />

      <BilgiKutusu cesit="bilgi">
        Kayıtlar elle silinemez veya düzenlenemez; saklama süresi dolduğunda
        (varsayılan 24 ay) bakım işi tarafından toplu olarak temizlenir.
      </BilgiKutusu>

      {/*
        OLAĞAN DIŞI ÖRÜNTÜLER — SÜZGEÇLERİN ÜSTÜNDE (2 Eylül 2026).

        Genelge 2/d'nin ikinci cümlesi kayıt tutmayı değil İZLEMEYİ istiyor.
        Aşağıdaki süzgeçler sorgulamadır: ne aradığını bilen kişi bulur. İzleme
        ise tersidir — kimsenin aramadığı şeyin kendiliğinden görünmesi gerekir.
        Gecelik tarama bulguyu yazıp bildirim gönderiyordu, ama bildirim okunup
        geçilen bir şey; geriye dönüp bakılacak yer yoktu. Kart bu yüzden
        süzgeçlerin ÜSTÜNDE ve süzgeçlerden bağımsız duruyor.
      */}
      <Kart>
        <KartBasligi
          baslik="Olağan dışı erişim örüntüleri"
          aciklama={`Her gece önceki günün kayıtları taranır: bir günde ${GUNLUK_OGRENCI_ERISIM_ESIGI} ve üzeri farklı öğrenci kaydı görüntüleyen ya da ${MESAI_BASLANGIC_SAATI}.00–${MESAI_BITIS_SAATI}.00 dışında dışa aktarım yapan kullanıcılar.`}
          Ikon={ShieldAlert}
        />

        {anomaliler.length === 0 ? (
          <BilgiKutusu cesit="olumlu">
            Taramada bulgu yok.
          </BilgiKutusu>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-cizgi text-metin-yumusak">
                <tr>
                  <th className="py-2 pr-4 font-medium">Gün</th>
                  <th className="py-2 pr-4 font-medium">Kullanıcı</th>
                  <th className="py-2 pr-4 font-medium">Bulgu</th>
                  <th className="py-2 pr-4 font-medium">Farklı kayıt</th>
                  <th className="py-2 pr-4 font-medium">İşlem sayısı</th>
                  <th className="py-2 pr-4 font-medium">Zaman aralığı</th>
                  <th className="py-2 font-medium">Uyarı</th>
                </tr>
              </thead>
              <tbody>
                {anomaliler.map((anomali) => (
                  <tr key={anomali.id} className="border-b border-cizgi/60">
                    <td className="whitespace-nowrap py-2 pr-4 text-metin-yumusak">
                      {anomali.gun}
                    </td>
                    <td className="py-2 pr-4 text-metin">
                      {anomali.kullaniciAdSoyad}
                    </td>
                    <td className="py-2 pr-4">
                      <Rozet cesit="uyari">
                        {anomaliTuruEtiketi(anomali.tur)}
                      </Rozet>
                    </td>
                    <td className="py-2 pr-4 text-metin">
                      {anomali.benzersizHedefSayisi}
                    </td>
                    <td className="py-2 pr-4 text-metin-yumusak">
                      {anomali.logSayisi}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-4 text-metin-yumusak">
                      {tarihSaatYaz(anomali.ilkErisimTarihi)} –{" "}
                      {tarihSaatYaz(anomali.sonErisimTarihi)}
                    </td>
                    <td className="py-2">
                      {/*
                        Bildirimin GÖNDERİLMEMİŞ olması da bir bilgidir: bulgu
                        duruyor ama kimseye ulaşmamış demektir (bildirim
                        altyapısı düşmüş olabilir). Sessizce boş bırakılsaydı
                        bu durum hiçbir yerde görünmezdi.
                      */}
                      {anomali.bildirimTarihi ? (
                        <Rozet cesit="olumlu">Gönderildi</Rozet>
                      ) : (
                        <Rozet cesit="hata">Gönderilmedi</Rozet>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Kart>

      {sonuc.toplam > 0 && (
        <Kart>
          <KartBasligi
            baslik="Denetim dökümü"
            aciklama="Süzgece uyan kayıtların tamamı — ekrandaki sayfa değil. Dosya kişisel veri taşır; indirilmesi de kayda geçer."
          />
          {/*
            SINIR EKRANDA SÖYLENİYOR (15 Ağustos 2026). Denetim tablosu iki
            yıllık kayıt tutuyor ve süzgeçsiz sorgu üst sınırı kolayca aşıyor;
            bağlantı yine de gösterilseydi kullanıcı tıklayıp 413 duvarına
            çarpar ve bunu bir arıza sanardı. Sınır burada okunup söyleniyor,
            böylece kullanıcı süzgeci ÖNCEDEN daraltıyor.
          */}
          {sonuc.toplam > ustSinir ? (
            <BilgiKutusu cesit="uyari">
              Süzgece uyan {sonuc.toplam} kayıt var; tek dosyada en fazla{" "}
              {ustSinir} kayıt indirilebilir. Tarih aralığı, işlem ya da kayıt
              türü süzgeciyle daraltın.
            </BilgiKutusu>
          ) : (
            <DisaAktarmaBagi
              yol={disaAktarmaBaglantisi}
              kayitSayisi={sonuc.toplam}
            />
          )}
        </Kart>
      )}

      <Kart>
        <KartBasligi baslik="Filtreler" Ikon={Search} />
        <form method="get" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className="text-sm font-medium text-metin">
              İşlemi yapan
            </span>
            <input
              type="search"
              name="ara"
              defaultValue={ara ?? ""}
              placeholder="Ad veya soyad"
              className={SINIF_GIRDI}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-metin">İşlem</span>
            <select name="islem" defaultValue={islem ?? ""} className={SINIF_GIRDI}>
              <option value="">Tümü</option>
              {Object.entries(LOG_ISLEM_ETIKETLERI).map(([kod, etiket]) => (
                <option key={kod} value={kod}>
                  {etiket}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-metin">Kayıt türü</span>
            <select
              name="hedefTip"
              defaultValue={hedefTip ?? ""}
              className={SINIF_GIRDI}
            >
              <option value="">Tümü</option>
              {Object.entries(LOG_HEDEF_ETIKETLERI).map(([kod, etiket]) => (
                <option key={kod} value={kod}>
                  {etiket}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-metin">Başlangıç</span>
            <input
              type="date"
              name="baslangic"
              defaultValue={baslangicMetni ?? ""}
              max={girdiTarihi(new Date())}
              className={SINIF_GIRDI}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-metin">Bitiş</span>
            <input
              type="date"
              name="bitis"
              defaultValue={bitisMetni ?? ""}
              max={girdiTarihi(new Date())}
              className={SINIF_GIRDI}
            />
          </label>
          <div className="flex items-end gap-3 lg:col-span-5">
            <button type="submit" className={SINIF_BIRINCIL_BUTON}>
              Filtrele
            </button>
            <Link
              href="/panel/erisim-loglari"
              className="text-sm text-metin-yumusak underline underline-offset-2"
            >
              Filtreleri temizle
            </Link>
          </div>
        </form>
      </Kart>

      <Kart>
        <KartBasligi
          baslik="Kayıtlar"
          aciklama={`Sayfa ${sonuc.sayfa} / ${sonuc.sonSayfa} · sayfa başına ${SAYFA_BOYUTU} kayıt`}
          Ikon={ScrollText}
        />

        {sonuc.kayitlar.length === 0 ? (
          <p className="text-sm text-metin-yumusak">
            Bu filtrelerle kayıt bulunamadı.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-cizgi text-metin-yumusak">
                <tr>
                  <th className="py-2 pr-4 font-medium">Tarih</th>
                  <th className="py-2 pr-4 font-medium">İşlemi yapan</th>
                  <th className="py-2 pr-4 font-medium">İşlem</th>
                  <th className="py-2 pr-4 font-medium">Kayıt</th>
                  <th className="py-2 pr-4 font-medium">Ayrıntı</th>
                  <th className="py-2 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {sonuc.kayitlar.map((kayit) => (
                  <tr key={kayit.id} className="border-b border-cizgi/60">
                    <td className="whitespace-nowrap py-2 pr-4 text-metin-yumusak">
                      {tarihSaatYaz(kayit.tarih)}
                    </td>
                    <td className="py-2 pr-4 text-metin">
                      {kayit.kullanici
                        ? `${kayit.kullanici.ad} ${kayit.kullanici.soyad}`
                        : "Doğrulanmamış kullanıcı"}
                    </td>
                    <td className="py-2 pr-4 text-metin">
                      {LOG_ISLEM_ETIKETLERI[kayit.islem]}
                    </td>
                    <td className="py-2 pr-4 text-metin">
                      {LOG_HEDEF_ETIKETLERI[kayit.hedefTip]}
                      <span className="text-metin-yumusak"> #{kayit.hedefId}</span>
                    </td>
                    <td className="py-2 pr-4 text-metin-yumusak">
                      {kayit.detay ?? "—"}
                    </td>
                    <td className="whitespace-nowrap py-2 text-metin-yumusak">
                      {kayit.ipAdresi ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {sonuc.sonSayfa > 1 && (
          <div className="mt-5 flex items-center gap-3 text-sm">
            {sonuc.sayfa > 1 && (
              <Link
                href={sorgu(sonuc.sayfa - 1)}
                className="rounded-md border border-cizgi px-3 py-1.5 text-metin transition hover:bg-zemin"
              >
                Önceki
              </Link>
            )}
            {sonuc.sayfa < sonuc.sonSayfa && (
              <Link
                href={sorgu(sonuc.sayfa + 1)}
                className="rounded-md border border-cizgi px-3 py-1.5 text-metin transition hover:bg-zemin"
              >
                Sonraki
              </Link>
            )}
          </div>
        )}
      </Kart>
    </div>
  );
}
