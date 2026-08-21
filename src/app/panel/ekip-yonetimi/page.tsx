import { UserX, UsersRound } from "lucide-react";
import Link from "next/link";
import { DisaAktarmaBagi } from "@/components/DisaAktarmaBagi";
import { SatirIslemleri } from "@/components/SatirIslemleri";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  EKIP_TURLERI,
  EKIP_TURU_ETIKETLERI,
  ekipDanismansizMi,
  ekipYonetebilirMi,
} from "@/lib/ekip/kurallar";
import { projeYoneticisiMi } from "@/lib/yetki/izinler";
import type { SorguParametreleri } from "../ogrenciler/filtreler";
import { ekipKosulu, ekipSorgusu, ekipSuzgeciniCoz } from "./filtreler";

export const dynamic = "force-dynamic";

const SAYFA_BOYUTU = 50;
const YOL = "/panel/ekip-yonetimi";

/**
 * MERKEZİ EKİP LİSTESİ (15 Ağustos 2026).
 *
 * `manisa-farklari-plani.md` · Aşama 5c. Manisa panelindeki "Ekip Yönetimi"
 * ekranının karşılığı: 144 ekip tek listede, tür rozeti, danışman, üye sayısı.
 *
 * ============================================================================
 * `panel/ekipler` EKRANIYLA AYRI TUTULDU
 * ============================================================================
 * O ekran "benim ekiplerim": koordinatörün kurduğu ve üyesi olduğu ekipleri
 * tek yerde gösteriyor ve dosya başındaki notu bunu açıkça söylüyor. Yönetici
 * listesini oraya karıştırmak, koordinatörün kendi ekibini yüzlerce kaydın
 * içinde aramasına yol açardı.
 *
 * Bu ekran ise envanter: aramalı, süzgeçli, sayfalı ve dışa aktarılabilir.
 *
 * KAPI `ekipYonetebilirMi` (il koordinatörü + merkez) — ekip kurma yetkisiyle
 * aynı kapı. Ekip listesini görmek, ekip yönetmenin parçası.
 */
export default async function EkipYonetimiSayfasi({
  searchParams,
}: {
  searchParams: Promise<SorguParametreleri>;
}) {
  const parametreler = await searchParams;
  const kullanici = await oturumKullanicisiZorunlu();

  if (!ekipYonetebilirMi(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="Ekip Yönetimi"
          aciklama="Bu ekran il koordinatörlerine ve merkeze açıktır."
        />
      </Kart>
    );
  }

  const merkezMi = projeYoneticisiMi(kullanici);
  const suzgec = ekipSuzgeciniCoz(kullanici, parametreler);
  const nerede = ekipKosulu(suzgec);
  const sayfaNo = Math.max(
    1,
    Number.parseInt((parametreler.sayfa as string) ?? "1", 10) || 1,
  );

  const [toplam, ekipler, iller, danismansizSayisi] = await Promise.all([
    prisma.ekip.count({ where: nerede }),
    prisma.ekip.findMany({
      where: nerede,
      orderBy: [{ ad: "asc" }],
      skip: (sayfaNo - 1) * SAYFA_BOYUTU,
      take: SAYFA_BOYUTU,
      select: {
        id: true,
        ad: true,
        tur: true,
        aktif: true,
        il: { select: { ad: true } },
        kurum: { select: { ad: true } },
        danisman: { select: { ad: true, soyad: true, aktif: true } },
        _count: { select: { uyeler: true, mesajlar: true } },
      },
    }),
    merkezMi
      ? prisma.il.findMany({
          orderBy: { ad: "asc" },
          select: { ilKodu: true, ad: true },
        })
      : Promise.resolve([]),
    /*
     * Danışmansız sayısı SÜZGEÇTEN BAĞIMSIZ hesaplanıyor (danışmansız süzgeci
     * hariç, diğer süzgeçler geçerli): rozet "bu kapsamda kaç ekip danışmansız"
     * diye söylüyor ve süzgeç açıkken toplamla aynı sayıyı göstermesi ona
     * hiçbir şey söyletmezdi.
     */
    prisma.ekip.count({
      where: ekipKosulu({ ...suzgec, danismansizMi: true }),
    }),
  ]);

  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA_BOYUTU));

  return (
    <div className="space-y-6">
      <SayfaBasligi
        /* Bu ekrana Yönetim Paneli'ndeki karttan geliniyor (21 Ağustos 2026 ·
           istek): geri bağlantısı da oraya döner, "Panel"e değil — Panel
           zaten sol menüde duruyor. */
        geri={{ yol: "/panel/yonetim", etiket: "Yönetim Paneli" }}
        baslik="Ekip Yönetimi"
        aciklama={
          merkezMi
            ? "Ülke genelindeki tüm ekipler"
            : "İlinizdeki tüm ekipler"
        }
      />

      {/*
        DANIŞMANSIZ EKİPLER AYRI EKRAN DEĞİL, SÜZGEÇ. Liste, sütunları ve dışa
        aktarımı birebir aynı olurdu; ikinci bir ekran aynı kodun kopyası
        olurdu. Öğrenci envanterindeki `danismansiz=1` süzgeciyle aynı desen.
      */}
      {danismansizSayisi > 0 && !suzgec.danismansizMi && (
        <BilgiKutusu cesit="uyari">
          Bu kapsamda <strong>{danismansizSayisi}</strong> ekibin danışman
          öğretmeni yok ya da danışmanı pasif.{" "}
          <Link
            href={`${YOL}?${ekipSorgusu({ ...suzgec, danismansizMi: true })}`}
            className="font-medium underline underline-offset-2"
          >
            Yalnızca onları göster
          </Link>
        </BilgiKutusu>
      )}

      <Kart>
        <form method="get" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="text-sm font-medium text-metin">Ekip adı ara</span>
            <input
              type="search"
              name="ara"
              defaultValue={suzgec.ara ?? ""}
              className={SINIF_GIRDI}
            />
          </label>

          {merkezMi && (
            <label className="block">
              <span className="text-sm font-medium text-metin">İl</span>
              <select
                name="il"
                defaultValue={suzgec.ilKodu ?? ""}
                className={SINIF_GIRDI}
              >
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
            <span className="text-sm font-medium text-metin">Ekip türü</span>
            <select
              name="tur"
              defaultValue={suzgec.tur ?? ""}
              className={SINIF_GIRDI}
            >
              <option value="">Tüm ekip türleri</option>
              {EKIP_TURLERI.map((tur) => (
                <option key={tur} value={tur}>
                  {EKIP_TURU_ETIKETLERI[tur]}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap items-end gap-4">
            <label className="flex items-center gap-2 text-sm text-metin">
              <input
                type="checkbox"
                name="danismansiz"
                value="1"
                defaultChecked={suzgec.danismansizMi}
                className="h-4 w-4 rounded border-cizgi accent-[var(--renk-birincil)]"
              />
              Danışmansız
            </label>
            <label className="flex items-center gap-2 text-sm text-metin">
              <input
                type="checkbox"
                name="kapali"
                value="1"
                defaultChecked={suzgec.kapalilarMi}
                className="h-4 w-4 rounded border-cizgi accent-[var(--renk-birincil)]"
              />
              Kapalılar da
            </label>
            <button type="submit" className={SINIF_BIRINCIL_BUTON}>
              Filtrele
            </button>
          </div>
        </form>
      </Kart>

      <Kart>
        <KartBasligi
          baslik="Ekipler"
          aciklama={`Toplam ${toplam} kayıt${
            toplam > SAYFA_BOYUTU ? ` · ${sayfaNo}. sayfa` : ""
          }`}
          Ikon={suzgec.danismansizMi ? UserX : UsersRound}
        />

        {toplam > 0 && (
          <p className="mb-4">
            <DisaAktarmaBagi
              yol={`${YOL}/disa-aktar?${ekipSorgusu(suzgec)}`}
              kayitSayisi={toplam}
            />
          </p>
        )}

        {ekipler.length === 0 ? (
          <BilgiKutusu>Bu süzgeçlerle ekip bulunamadı.</BilgiKutusu>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-cizgi text-metin-yumusak">
                <tr>
                  <th className="py-2 pr-4 font-medium">Ekip adı</th>
                  <th className="py-2 pr-4 font-medium">Tür</th>
                  <th className="py-2 pr-4 font-medium">İl / Okul</th>
                  <th className="py-2 pr-4 font-medium">Danışman</th>
                  <th className="py-2 pr-4 font-medium">Üye</th>
                  <th className="py-2 pr-4 font-medium">Mesaj</th>
                  <th className="py-2 font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {ekipler.map((ekip) => {
                  const danismansiz = ekipDanismansizMi(ekip);
                  return (
                    <tr key={ekip.id} className="border-b border-cizgi">
                      <td className="py-2 pr-4">
                        <Link
                          href={`/panel/ekipler/${ekip.id}`}
                          className="font-medium text-vurgu-metin underline underline-offset-2"
                        >
                          {ekip.ad}
                        </Link>
                        {!ekip.aktif && (
                          <span className="ml-2 text-xs text-metin-yumusak">
                            (kapalı)
                          </span>
                        )}
                      </td>
                      {/*
                        TÜR ROZETİ RENKLE AYRIŞIYOR ama renk TEK BAŞINA bilgi
                        taşımıyor: etiket zaten yazılı. Yüzlerce kayıtlık bir
                        listede tür, okunacak bir sütun değil taranacak bir
                        işaret.
                      */}
                      <td className="py-2 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            ekip.tur === "OKUL_TAKIMI"
                              ? "bg-vurgu-zemin text-vurgu-metin"
                              : ekip.tur === "IL_GENCTEK_EKIBI"
                                ? "bg-uyari-zemin text-uyari-metin"
                                : "bg-zemin text-metin-yumusak"
                          }`}
                        >
                          {EKIP_TURU_ETIKETLERI[ekip.tur]}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-metin-yumusak">
                        {ekip.kurum?.ad ?? ekip.il?.ad ?? ""}
                      </td>
                      <td className="py-2 pr-4">
                        {ekip.danisman ? (
                          <>
                            {ekip.danisman.ad} {ekip.danisman.soyad}
                            {!ekip.danisman.aktif && (
                              <span className="text-metin-yumusak"> (pasif)</span>
                            )}
                          </>
                        ) : (
                          <span className="text-metin-yumusak">Atanmadı</span>
                        )}
                      </td>
                      {/*
                        ÜYESİ 0 OLAN EKİP GİZLENMİYOR: kurulmuş ama
                        doldurulmamış ekipler asıl aksiyon gerektiren kayıtlar.
                      */}
                      <td
                        className={`py-2 pr-4 ${
                          ekip._count.uyeler === 0 || danismansiz
                            ? "font-medium text-metin"
                            : ""
                        }`}
                      >
                        {ekip._count.uyeler}
                      </td>
                      <td className="py-2 pr-4 text-metin-yumusak">
                        {ekip._count.mesajlar}
                      </td>
                      {/*
                        İŞLEMLER SÜTUNU (15 Ağustos 2026 · Manisa düzeni).
                        Ekip adı zaten detaya bağlanıyor ama göz ikonu sabit
                        yerde duruyor: satırın sonuna bakan kişi her satırda
                        aynı iki işlemi bulur. Excel ikonu o ekibin ÜYE
                        LİSTESİNİ indirir — merkezi listenin cevaplamadığı
                        "şu ekipte kimler var" sorusu.
                      */}
                      <td className="py-2">
                        <SatirIslemleri
                          ad={ekip.ad}
                          goruntuleYolu={`/panel/ekipler/${ekip.id}`}
                          excelYolu={`/panel/ekipler/${ekip.id}/uyeler/disa-aktar`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {sonSayfa > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-metin-yumusak">
            <span>
              {(sayfaNo - 1) * SAYFA_BOYUTU + 1}–
              {Math.min(sayfaNo * SAYFA_BOYUTU, toplam)} / {toplam} ekip
            </span>
            <span className="flex gap-2">
              {sayfaNo > 1 && (
                <Link
                  href={`${YOL}?${ekipSorgusu(suzgec, { sayfa: sayfaNo - 1 })}`}
                  className="rounded-kart border border-cizgi px-3 py-1"
                >
                  Önceki
                </Link>
              )}
              {sayfaNo < sonSayfa && (
                <Link
                  href={`${YOL}?${ekipSorgusu(suzgec, { sayfa: sayfaNo + 1 })}`}
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
