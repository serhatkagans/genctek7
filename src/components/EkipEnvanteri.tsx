import { UserX, UsersRound } from "lucide-react";
import Link from "next/link";
import { DisaAktarmaBagi } from "@/components/DisaAktarmaBagi";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
} from "@/components/ui";
import { prisma } from "@/lib/db";
import {
  EKIP_TURLERI,
  EKIP_TURU_ETIKETLERI,
  ekipDanismansizMi,
} from "@/lib/ekip/kurallar";
import { projeYoneticisiMi } from "@/lib/yetki/izinler";
import type { OturumKullanicisi } from "@/lib/yetki/tipler";
import type { SorguParametreleri } from "@/app/panel/ogrenciler/filtreler";
import {
  ekipKosulu,
  ekipSorgusu,
  ekipSuzgeciniCoz,
} from "@/app/panel/ekip-yonetimi/filtreler";

const SAYFA_BOYUTU = 50;

/**
 * EKİP ENVANTERİ — süzgeçli, sayfalı, dışa aktarılabilir ekip listesi.
 *
 * ---------------------------------------------------------------------------
 * NİYE KENDİ DOSYASINDA
 * ---------------------------------------------------------------------------
 * Liste 15 Ağustos 2026'da `panel/ekip-yonetimi` ekranının gövdesi olarak
 * yazıldı; 26 Ağustos 2026'da EKİPLERİM EKRANINA DA girdi (istek: "ekip
 * yönetimindeki liste ekiplerime gelecek").
 *
 * İki ekranda birden görünen bir liste kopyalanmadı: kopya, sütun eklendiğinde
 * ya da tür rozetinin rengi değiştiğinde birinin geride kalması demekti — aynı
 * gün panodaki kartlarda verilen kararın aynısı.
 *
 * ---------------------------------------------------------------------------
 * `yol` NİYE PARAMETRE
 * ---------------------------------------------------------------------------
 * Süzgeç formu, sayfalama ve CSV bağlantısı KENDİ SAYFASINA dönmeli. Sabit
 * yazılsaydı Ekiplerim'de arama yapan kişi her tıklamada Ekip Yönetimi
 * ekranına atılırdı. CSV rotası `/panel/ekip-yonetimi/disa-aktar` altında
 * duruyor ve taşınmadı — o bir ekran değil, bir dosya ucu.
 *
 * ---------------------------------------------------------------------------
 * KAPIYI ÇAĞIRAN SORAR
 * ---------------------------------------------------------------------------
 * Bileşen yetki sormuyor: iki çağıranın da kendi kapısı var
 * (`ekipYonetebilirMi`). Burada üçüncü bir kez sorulsaydı, yetkisiz kullanıcı
 * için "boş liste" ile "yetkiniz yok" ayrımı bileşenin içinde kalır ve
 * çağıranlar farklı mesajlar veremezdi.
 */
export async function EkipEnvanteri({
  kullanici,
  parametreler,
  yol,
}: {
  kullanici: OturumKullanicisi;
  parametreler: SorguParametreleri;
  /** Süzgeç, sayfalama ve CSV bağlantılarının döneceği adres. */
  yol: string;
}) {
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
        /* Ekibi kuran kişi (27 Ağustos 2026 · istek: "bir de ekibi kim kurmuş
           ona ait bir sütun"). Alan zaten vardı (`kuranKullaniciId`, şemada
           ZORUNLU) ve yalnızca ekranda görünmüyordu. */
        kuran: { select: { ad: true, soyad: true } },
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
            href={`${yol}?${ekipSorgusu({ ...suzgec, danismansizMi: true })}`}
            className="font-medium underline underline-offset-2"
          >
            Yalnızca onları göster
          </Link>
        </BilgiKutusu>
      )}

      <Kart>
        <form method="get" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/*
            KUTULARI KALKAN İKİ SÜZGEÇ GİZLİ ALANLA TAŞINIYOR. `method="get"`
            formu gönderildiğinde adres çubuğu YALNIZCA formdaki alanlardan
            yeniden kuruluyor; bunlar olmasaydı "Yalnızca danışmansızları
            göster" bağlantısıyla daraltılmış bir listede arama yapmak, aramayla
            birlikte daraltmayı da sessizce iptal ederdi.
          */}
          {suzgec.danismansizMi && (
            <input type="hidden" name="danismansiz" value="1" />
          )}
          {suzgec.kapalilarMi && <input type="hidden" name="kapali" value="1" />}
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

          {/*
            "DANIŞMANSIZ" VE "KAPALILAR DA" ONAY KUTULARI KALDIRILDI (26 Ağustos
            2026 · istek: "ekip yönetiminden aramada bunları kaldır:
            Danışmansız, Kapalılar da").

            SÜZGEÇLERİN KENDİSİ DURUYOR, yalnızca kutuları kalktı — ikisi de
            adres üzerinden çalışmaya devam ediyor (`?danismansiz=1`,
            `?kapali=1`) ve `ekipSuzgeciniCoz` onları okumayı sürdürüyor.
            Kaldırılmadılar çünkü danışmansız süzgecinin GÖRÜNEN kapısı hâlâ
            var: yukarıdaki uyarı kutusundaki "Yalnızca onları göster"
            bağlantısı. Yani süzgece giden yol, sayının yanında duruyor;
            formdaki kutu ise sayıyı görmeden işaretlenen, çoğunlukla boş liste
            döndüren bir seçenekti.

            Dışa aktarma bağlantısı da aynı süzgeci taşıdığı için (ekipSorgusu)
            adresle daraltılmış bir liste yine CSV olarak alınabiliyor.
          */}
          <div className="flex flex-wrap items-end gap-4">
            <button type="submit" className={SINIF_BIRINCIL_BUTON}>
              Filtrele
            </button>
          </div>
        </form>
      </Kart>

      <Kart>
        <KartBasligi
          /*
            BAŞLIK "EKİPLER" DEĞİL "İLİMDEKİ TÜM EKİPLER" (26 Ağustos 2026 ·
            istek: "ekiplerim sayfasında hem ekipler hem de ekiplerim bölümü
            var").

            Envanter Ekiplerim ekranına inince iki kart alt alta geldi ve
            başlıkları birbirinden ayırt edilmiyordu: "Ekipler" ile "Ekiplerim".
            İkisi FARKLI iki liste — üstteki ilin tamamı (kişinin üyesi olmadığı
            ekipler dâhil), alttaki kişinin kendi ekipleri — ve başlıkların bunu
            söylemesi gerekiyor.

            `yol` DEĞİL KAPSAM SORULUYOR: merkez de aynı bileşeni basıyor ve
            onun listesi ülke geneli.
          */
          baslik={merkezMi ? "Tüm ekipler" : "İlimdeki tüm ekipler"}
          aciklama={`Toplam ${toplam} kayıt${
            toplam > SAYFA_BOYUTU ? ` · ${sayfaNo}. sayfa` : ""
          }`}
          Ikon={suzgec.danismansizMi ? UserX : UsersRound}
        />

        {toplam > 0 && (
          <p className="mb-4">
            <DisaAktarmaBagi
              yol={`${yol}/disa-aktar?${ekipSorgusu(suzgec)}`}
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
                  <th className="py-2 pr-4 font-medium">Kuran</th>
                  <th className="py-2 pr-4 font-medium">Üye</th>
                  <th className="py-2 font-medium">Mesaj</th>
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
                      {/*
                        SÜTUN BAŞLIĞI NE VAAT EDİYORSA ONU YAZIYOR (27 Ağustos
                        2026 · istek: "listede il / okul sütunu var ama sadece
                        il ismi var, okul ismi yazmıyor").

                        Önce okul varsa YALNIZCA okulu, yoksa yalnızca ili
                        basıyordu; yani "İl / Okul" başlığı hiçbir satırda
                        ikisini birden göstermiyordu. Okulu olmayan ekiplerde
                        (çalışma grubu, il GençTek ekibi) kurum kaydı NULL'dur
                        ve bu bir eksiklik değil — o ekipler bir okula bağlı
                        değil (şemadaki ck_ekip_okul_takimi_kurum). Artık il
                        her zaman yazılıyor, okul varsa yanına ekleniyor.
                      */}
                      <td className="py-2 pr-4 text-metin-yumusak">
                        {[ekip.il?.ad, ekip.kurum?.ad]
                          .filter(Boolean)
                          .join(" / ") || "—"}
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
                      <td className="py-2 pr-4 text-metin-yumusak">
                        {ekip.kuran.ad} {ekip.kuran.soyad}
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
                        İŞLEMLER SÜTUNU KALKTI (26 Ağustos 2026 · istek:
                        "İşlemler altında görüntüleme ve excel simgeleri var
                        küçük, excel indir bunun üstünde var zaten, simge olanı
                        kaldır").

                        GÖZ İKONU zaten ikinci bir kapıydı: ekip adı satırın
                        başında ve aynı sayfaya bağlanıyor.

                        EXCEL İKONU BAŞKA BİR ŞEY İNDİRİYORDU — üstteki bağlantı
                        EKİP LİSTESİNİ, ikon o ekibin ÜYE LİSTESİNİ. İkisi yan
                        yana durunca aynı şeyin ikizi gibi görünüyordu. Üye
                        listesi kaybolmadı: bağlantı ekibin kendi sayfasına,
                        üye listesinin başına taşındı (bkz. ekipler/[id]).
                      */}
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
                  href={`${yol}?${ekipSorgusu(suzgec, { sayfa: sayfaNo - 1 })}`}
                  className="rounded-kart border border-cizgi px-3 py-1"
                >
                  Önceki
                </Link>
              )}
              {sayfaNo < sonSayfa && (
                <Link
                  href={`${yol}?${ekipSorgusu(suzgec, { sayfa: sayfaNo + 1 })}`}
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
