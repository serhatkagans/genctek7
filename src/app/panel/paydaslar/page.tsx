import {
  Building2,
  Filter,
  Handshake,
  Mail,
  MapPin,
  Phone,
  Plus,
  User,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { DisaAktarmaBagi } from "@/components/DisaAktarmaBagi";
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
import { bekleyenBasvuruSayisi } from "@/lib/dis-kimlik/basvuru";
import {
  PAYDAS_TURLERI,
  PAYDAS_TURU_ETIKETLERI,
} from "@/lib/paydas/kurallar";
import {
  disBasvuruYonetebilirMi,
  koordinatorIlKodu,
  paydasEkleyebilirMi,
  paydasGorebilirMi,
  projeYoneticisiMi,
} from "@/lib/yetki/izinler";
import { paydasListeFiltresi } from "@/lib/yetki/kapsam";
import { erisimLoglaCoklu } from "@/lib/yetki/log";
import {
  type SorguParametreleri,
  sorguMetni,
} from "../ogrenciler/filtreler";
import { paydasEkleEylemi } from "./eylemler";
import { paydasFiltreleriniCoz, paydasFiltresiVarMi } from "./filtreler";

export const dynamic = "force-dynamic";

/**
 * İl bazlı paydaş envanteri — analiz dokümanı Bölüm 3.
 *
 * Liste merkezi kapsam filtresinden geçer (paydasKapsamFiltresi): il
 * koordinatörü ve danışman öğretmen yalnızca kendi ilini görür, adres çubuğuna
 * yazılan bir il kodu bunu genişletmez çünkü ekran filtreleri kapsamla
 * AND'lenir.
 *
 * Kayıt açma yetkisi görmekten DARDIR (bkz. paydasYonetebilirMi): danışman
 * öğretmen listeyi görür ama satır ekleyemez.
 */

const SINIF_ETIKET = "text-sm font-medium text-metin-yumusak";
const SINIF_SECIM =
  "mt-1 w-full rounded-md border border-cizgi bg-kart px-3 py-2 text-sm text-metin outline-none focus:border-vurgu";

const DURUM_MESAJLARI: Record<string, string> = {
  eklendi: "Paydaş kaydı eklendi.",
  guncellendi: "Paydaş kaydı güncellendi.",
  pasif: "Paydaş pasife alındı; geçmiş etkinlik bağlantıları korunuyor.",
  aktif: "Paydaş yeniden aktifleştirildi.",
};

export default async function PaydaslarSayfasi({
  searchParams,
}: {
  searchParams: Promise<SorguParametreleri>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();

  if (!paydasGorebilirMi(kullanici)) {
    return (
      <Kart>
        <KartBasligi
          baslik="Paydaşlar"
          aciklama="Bu ekrana erişim yetkiniz yok."
        />
      </Kart>
    );
  }

  const parametreler = await searchParams;
  const durum = String(parametreler.durum ?? "");
  const hata = String(parametreler.hata ?? "");

  const filtreler = paydasFiltreleriniCoz(parametreler);
  const filtreVar = paydasFiltresiVarMi(filtreler);
  const nerede = paydasListeFiltresi(kullanici, filtreler);

  const merkezMi = projeYoneticisiMi(kullanici);
  const koordinatorIli = koordinatorIlKodu(kullanici);
  /*
   * Kayıt açma yetkisi İLE BAĞLI DEĞİLDİR: koordinatör başka ildeki bir kurumla
   * da iş birliği kurabilir (bkz. paydasEkleyebilirMi). Düzenleme yetkisi
   * bundan dardır ve kaydın kendisine bakar.
   */
  const kayitAcabilir = paydasEkleyebilirMi(kullanici);
  const ekleyebilir = kayitAcabilir;

  const [paydaslar, iller, turDagilimi] = await Promise.all([
    prisma.paydas.findMany({
      where: nerede,
      orderBy: [{ aktif: "desc" }, { ad: "asc" }],
      select: {
        id: true,
        ad: true,
        tur: true,
        yetkiliKisi: true,
        eposta: true,
        telefon: true,
        isBirligiAlani: true,
        aktif: true,
        il: { select: { ad: true } },
        _count: { select: { faaliyetler: true } },
      },
    }),
    /*
     * Kayıt açabilenler (merkez ve il koordinatörü) TÜM illeri görür: iş
     * birliği kurulan kurum başka ilde olabiliyor. Danışman öğretmen kayıt
     * açamadığı için ona yalnızca kendi ili gerekiyor (filtre kutusunda).
     */
    kayitAcabilir
      ? prisma.il.findMany({ orderBy: { ad: "asc" } })
      : prisma.il.findMany({
          where: { ilKodu: koordinatorIli ?? kullanici.ilKodu ?? "00" },
        }),
    // İl bazlı iş birliği haritasının en yalın hâli: kapsamdaki kayıtların
    // türlere göre dağılımı (analiz dokümanı 3.2).
    prisma.paydas.groupBy({
      by: ["tur"],
      where: nerede,
      _count: { _all: true },
    }),
  ]);

  /*
   * Dış giriş başvurularının bekleyen sayısı — girişin altında yazıyor.
   * Yalnızca kuyruğun sahibine sorulur; başkasına sayı da göstermiyoruz.
   */
  const bekleyenDisBasvuru = disBasvuruYonetebilirMi(kullanici)
    ? await bekleyenBasvuruSayisi()
    : 0;

  await erisimLoglaCoklu(
    paydaslar.map((paydas) => ({
      kullaniciId: kullanici.id,
      islem: "GORUNTULEME" as const,
      hedefTip: "PAYDAS" as const,
      hedefId: paydas.id,
      detay: "Paydaş listesi görüntülendi",
    })),
  );

  const disaAktarmaSorgusu = sorguMetni(parametreler, ["durum", "hata"]);
  const disaAktarmaBaglantisi = disaAktarmaSorgusu
    ? `/panel/paydaslar/disa-aktar?${disaAktarmaSorgusu}`
    : "/panel/paydaslar/disa-aktar";

  const kapsamAciklamasi = merkezMi
    ? "Tüm iller"
    : `${iller[0]?.ad ?? "İliniz"} · il bazlı`;

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Paydaşlar"
        aciklama={`İş birliği yapılabilecek kurum ve kuruluşlar · ${kapsamAciklamasi} · ${paydaslar.length} kayıt`}
      />

      {durum && DURUM_MESAJLARI[durum] && (
        <BilgiKutusu cesit="olumlu">{DURUM_MESAJLARI[durum]}</BilgiKutusu>
      )}
      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}

      {/*
        DIŞ GİRİŞ BAŞVURULARI BU EKRANIN İÇİNDE (11 Ağustos 2026 · istek: "dış
        giriş başvuruları sayfası paydaşların içine gelecek"). Sekmesi kalktı,
        sayfası ve yetkisi durduğu yerde.

        Buraya yakışıyor çünkü aynı işin iki ucu: bu ekran paydaş KURUMU
        envantere alıyor, o ekran o kurumu temsil eden KİŞİYİ sisteme alıyor.

        Bekleyen sayısı rakamla yazılıyor: girişin tıklanmaya değip değmediğini
        söylemeyen bir bağlantı, kuyruğun sessizce birikmesi demek — koordinatör
        panosunda aynı ders alınmıştı.
      */}
      {disBasvuruYonetebilirMi(kullanici) && (
        <Link
          href="/panel/dis-basvurular"
          className="flex items-start gap-3 rounded-kart border border-cizgi bg-kart p-5 transition hover:border-vurgu"
        >
          <UserPlus
            size={20}
            className="mt-0.5 shrink-0 text-vurgu-metin"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-baslik">Dış giriş başvuruları</p>
            <p className="mt-0.5 text-sm text-metin-yumusak">
              Mezun, paydaş temsilcisi ve mentörlerin sisteme giriş başvuruları
              {bekleyenDisBasvuru > 0
                ? ` · ${bekleyenDisBasvuru} başvuru kararınızı bekliyor`
                : " · bekleyen başvuru yok"}
            </p>
          </div>
        </Link>
      )}

      {turDagilimi.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {turDagilimi.map((satir) => (
            <span
              key={satir.tur}
              className="rounded-full bg-vurgu-zemin px-3 py-1 text-xs font-medium text-vurgu-metin"
            >
              {PAYDAS_TURU_ETIKETLERI[satir.tur]}: {satir._count._all}
            </span>
          ))}
        </div>
      )}

      <form method="get" className="rounded-kart border border-cizgi bg-kart p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-baslik">
            <Filter size={16} className="text-vurgu-metin" aria-hidden />
            Filtreler
          </h2>
          {filtreVar && (
            <Link
              href="/panel/paydaslar"
              className="inline-flex items-center gap-1 text-sm font-medium text-vurgu-metin"
            >
              <X size={14} aria-hidden />
              Filtreleri temizle
            </Link>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {merkezMi && (
            <label className="block">
              <span className={SINIF_ETIKET}>İl</span>
              <select
                name="il"
                defaultValue={filtreler.ilKodu ?? ""}
                className={SINIF_SECIM}
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
            <span className={SINIF_ETIKET}>Paydaş türü</span>
            <select
              name="tur"
              defaultValue={filtreler.tur ?? ""}
              className={SINIF_SECIM}
            >
              <option value="">Tüm türler</option>
              {PAYDAS_TURLERI.map((tur) => (
                <option key={tur} value={tur}>
                  {PAYDAS_TURU_ETIKETLERI[tur]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={SINIF_ETIKET}>Ara</span>
            <input
              type="text"
              name="ara"
              placeholder="Kurum, yetkili veya iş birliği alanı"
              defaultValue={filtreler.ara ?? ""}
              className={SINIF_SECIM}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-metin">
            <input
              type="checkbox"
              name="pasif"
              value="1"
              defaultChecked={filtreler.pasifleriDeGoster}
              className="h-4 w-4 rounded border-cizgi accent-[var(--renk-birincil)]"
            />
            Pasif kayıtlar da görünsün
          </label>
          <button type="submit" className={SINIF_BIRINCIL_BUTON}>
            Filtrele
          </button>
          {paydaslar.length > 0 && (
            <DisaAktarmaBagi yol={disaAktarmaBaglantisi} kayitSayisi={paydaslar.length} />
          )}
        </div>
      </form>

      {paydaslar.length === 0 ? (
        <Kart className="text-metin-yumusak">
          {filtreVar
            ? "Bu filtrelerle eşleşen paydaş yok."
            : ekleyebilir
              ? "Kapsamınızda henüz paydaş kaydı yok. İlkini aşağıdaki formdan ekleyebilirsiniz."
              : "İlinizde henüz paydaş kaydı yok. Kayıt açmayı il koordinatörünüzden isteyebilirsiniz."}
        </Kart>
      ) : (
        <div className="overflow-x-auto rounded-kart border border-cizgi bg-kart">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-cizgi bg-zemin text-metin-yumusak">
              <tr>
                <th className="px-4 py-3 font-medium">Kurum</th>
                <th className="px-4 py-3 font-medium">Tür</th>
                <th className="px-4 py-3 font-medium">İl</th>
                <th className="px-4 py-3 font-medium">İletişim</th>
                <th className="px-4 py-3 font-medium">İş birliği alanı</th>
                <th className="px-4 py-3 font-medium">Etkinlik</th>
              </tr>
            </thead>
            <tbody>
              {paydaslar.map((paydas) => (
                <tr
                  key={paydas.id}
                  className="border-b border-cizgi last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-metin">
                    <Link
                      href={`/panel/paydaslar/${paydas.id}`}
                      className="transition hover:text-vurgu-metin hover:underline"
                    >
                      {paydas.ad}
                    </Link>
                    {!paydas.aktif && (
                      <span className="ml-2 rounded-full bg-zemin px-2 py-0.5 text-xs text-metin-yumusak">
                        pasif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-metin-yumusak">
                    {PAYDAS_TURU_ETIKETLERI[paydas.tur]}
                  </td>
                  <td className="px-4 py-3 text-metin-yumusak">
                    {paydas.il.ad}
                  </td>
                  <td className="px-4 py-3 text-metin-yumusak">
                    <div className="space-y-0.5">
                      {paydas.yetkiliKisi && (
                        <span className="flex items-center gap-1.5">
                          <User size={13} aria-hidden />
                          {paydas.yetkiliKisi}
                        </span>
                      )}
                      {paydas.telefon && (
                        <span className="flex items-center gap-1.5">
                          <Phone size={13} aria-hidden />
                          {paydas.telefon}
                        </span>
                      )}
                      {paydas.eposta && (
                        <span className="flex items-center gap-1.5">
                          <Mail size={13} aria-hidden />
                          {paydas.eposta}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-metin-yumusak">
                    <span className="line-clamp-2">{paydas.isBirligiAlani}</span>
                  </td>
                  <td className="px-4 py-3 text-metin-yumusak">
                    {paydas._count.faaliyetler}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ekleyebilir && (
        <Kart>
          <KartBasligi
            baslik="Yeni paydaş"
            aciklama={
              merkezMi
                ? "Kayıt seçilen ilin envanterine yazılır."
                : "Kayıt kendi ilinizin envanterine yazılır."
            }
            Ikon={Handshake}
          />

          <form action={paydasEkleEylemi} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className={SINIF_ETIKET}>Kurum adı</span>
                <input
                  type="text"
                  name="ad"
                  required
                  maxLength={250}
                  className={SINIF_GIRDI}
                />
              </label>

              <label className="block">
                <span className={SINIF_ETIKET}>Paydaş türü</span>
                <select name="tur" className={SINIF_GIRDI} required>
                  {PAYDAS_TURLERI.map((tur) => (
                    <option key={tur} value={tur}>
                      {PAYDAS_TURU_ETIKETLERI[tur]}
                    </option>
                  ))}
                </select>
              </label>

              {/*
                İl SEÇİLİR, roldan okunmaz. Koordinatörün iş birliği kurduğu
                kurum başka ilde olabilir; kendi iline yazmaya zorlamak
                envanteri yanlışlardı. Varsayılan kendi ili, çünkü olağan
                durum budur.
              */}
              <label className="block">
                <span className={SINIF_ETIKET}>İl</span>
                <select
                  name="ilKodu"
                  className={SINIF_GIRDI}
                  required
                  defaultValue={koordinatorIli ?? ""}
                >
                  {iller.map((il) => (
                    <option key={il.ilKodu} value={il.ilKodu}>
                      {il.ad}
                    </option>
                  ))}
                </select>
                {koordinatorIli && (
                  <span className="mt-1 block text-sm text-metin-yumusak">
                    Başka bir il seçerseniz kayıt o ilin envanterine yazılır;
                    listenizde görünmeye devam eder.
                  </span>
                )}
              </label>

              <label className="block">
                <span className={SINIF_ETIKET}>Yetkili kişi</span>
                <input
                  type="text"
                  name="yetkiliKisi"
                  maxLength={150}
                  placeholder="Ad Soyad · unvan"
                  className={SINIF_GIRDI}
                />
              </label>

              <label className="block">
                <span className={SINIF_ETIKET}>Telefon</span>
                <input
                  type="text"
                  name="telefon"
                  maxLength={20}
                  className={SINIF_GIRDI}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className={SINIF_ETIKET}>E-posta</span>
                <input
                  type="email"
                  name="eposta"
                  maxLength={150}
                  className={SINIF_GIRDI}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className={SINIF_ETIKET}>Adres</span>
                <input type="text" name="adres" className={SINIF_GIRDI} />
              </label>

              <label className="block sm:col-span-2">
                <span className={SINIF_ETIKET}>
                  İş birliği alanı / potansiyeli
                </span>
                <textarea
                  name="isBirligiAlani"
                  rows={3}
                  required
                  placeholder="Örn. robotik atölyesi için mekân ve eğitmen desteği; yaz stajı imkânı"
                  className={SINIF_GIRDI}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className={SINIF_ETIKET}>Notlar</span>
                <textarea name="notlar" rows={2} className={SINIF_GIRDI} />
              </label>
            </div>

            <p className="text-sm text-metin-yumusak">
              Yetkili kişi, e-posta ve telefondan en az birini girin.
            </p>

            <button type="submit" className={SINIF_BIRINCIL_BUTON}>
              <Plus size={16} aria-hidden />
              Paydaşı ekle
            </button>
          </form>
        </Kart>
      )}

      {!ekleyebilir && paydaslar.length > 0 && (
        <BilgiKutusu>
          <span className="inline-flex items-center gap-2">
            <Building2 size={15} aria-hidden />
            Paydaş kayıtlarını il koordinatörünüz yönetir. Etkinliğinizin paydaş
            bilgisini etkinlik detay ekranından bu listeden seçerek
            ekleyebilirsiniz.
          </span>
        </BilgiKutusu>
      )}
    </div>
  );
}
