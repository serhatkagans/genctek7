import {
  ArrowLeft,
  CalendarDays,
  Handshake,
  Power,
  Save,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
  SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  PAYDAS_TURLERI,
  PAYDAS_TURU_ETIKETLERI,
} from "@/lib/paydas/kurallar";
import { tarihSaatYaz, tarihYaz } from "@/lib/tarih";
import { paydasGorebilirMi, paydasYonetebilirMi } from "@/lib/yetki/izinler";
import { paydasKapsamFiltresi } from "@/lib/yetki/kapsam";
import { erisimLogla } from "@/lib/yetki/log";
import { paydasDurumEylemi, paydasGuncelleEylemi } from "../eylemler";

export const dynamic = "force-dynamic";

/**
 * Tekil paydaş kaydı.
 *
 * Erişim merkezi kapsam filtresinden geçer: kapsam dışı kayıtta "yetkiniz yok"
 * değil 404 döner, kaydın varlığı bile sızmaz (permissions.md Bölüm 4).
 * Düzenleme yetkisi görmekten dardır — danışman öğretmen kaydı okur, ilin
 * koordinatörü ve merkez düzenler.
 */

const SINIF_ETIKET = "text-sm font-medium text-metin-yumusak";

const DURUM_MESAJLARI: Record<string, string> = {
  eklendi: "Paydaş kaydı eklendi.",
  guncellendi: "Paydaş kaydı güncellendi.",
  pasif: "Paydaş pasife alındı; geçmiş etkinlik bağlantıları korunuyor.",
  aktif: "Paydaş yeniden aktifleştirildi.",
};

function tekil(deger: string | string[] | undefined): string | null {
  if (Array.isArray(deger)) return deger[0] ?? null;
  return deger ?? null;
}

export default async function PaydasDetaySayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  const { id } = await params;
  const parametreler = await searchParams;

  if (!paydasGorebilirMi(kullanici)) notFound();

  const paydasId = Number.parseInt(id, 10);
  if (!Number.isInteger(paydasId)) notFound();

  const paydas = await prisma.paydas.findFirst({
    where: { AND: [{ id: paydasId }, paydasKapsamFiltresi(kullanici)] },
    select: {
      id: true,
      ad: true,
      tur: true,
      ilKodu: true,
      yetkiliKisi: true,
      eposta: true,
      telefon: true,
      adres: true,
      isBirligiAlani: true,
      notlar: true,
      aktif: true,
      olusturmaTarihi: true,
      guncellemeTarihi: true,
      il: { select: { ad: true } },
      ekleyen: { select: { ad: true, soyad: true } },
      faaliyetler: {
        orderBy: { faaliyet: { tarih: "desc" } },
        select: {
          katkisi: true,
          faaliyet: {
            select: { id: true, ad: true, tarih: true, durum: true },
          },
        },
      },
    },
  });
  if (!paydas) notFound();

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "GORUNTULEME",
    hedefTip: "PAYDAS",
    hedefId: paydas.id,
    detay: "Paydaş kaydı görüntülendi",
  });

  const duzenleyebilir = paydasYonetebilirMi(kullanici, paydas.ilKodu);
  const durum = tekil(parametreler.durum);
  const hata = tekil(parametreler.hata);

  return (
    <div className="space-y-6">
      <Link
        href="/panel/paydaslar"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-vurgu-metin"
      >
        <ArrowLeft size={15} aria-hidden />
        Paydaş listesi
      </Link>

      <SayfaBasligi
        baslik={paydas.ad}
        aciklama={`${PAYDAS_TURU_ETIKETLERI[paydas.tur]} · ${paydas.il.ad}${
          paydas.aktif ? "" : " · pasif"
        }`}
        /*
          Kendi geri bağlantısı yukarıda: bu ekranın üstü Panel değil,
          geldiği liste. `SayfaBasligi`nin varsayılan "Panel" bağlantısı
          basılsaydı üst üste iki geri bağlantısı olurdu.
        */
        geri={null}
      />

      {durum && DURUM_MESAJLARI[durum] && (
        <BilgiKutusu cesit="olumlu">{DURUM_MESAJLARI[durum]}</BilgiKutusu>
      )}
      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}

      {!duzenleyebilir && (
        <Kart>
          <KartBasligi baslik="Kurum bilgileri" Ikon={Handshake} />
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              ["Yetkili kişi", paydas.yetkiliKisi],
              ["Telefon", paydas.telefon],
              ["E-posta", paydas.eposta],
              ["Adres", paydas.adres],
            ].map(([etiket, deger]) => (
              <div key={etiket as string}>
                <dt className={SINIF_ETIKET}>{etiket}</dt>
                <dd className="mt-0.5 text-metin">{deger || "—"}</dd>
              </div>
            ))}
            <div className="sm:col-span-2">
              <dt className={SINIF_ETIKET}>İş birliği alanı / potansiyeli</dt>
              <dd className="mt-0.5 whitespace-pre-line text-metin">
                {paydas.isBirligiAlani}
              </dd>
            </div>
            {paydas.notlar && (
              <div className="sm:col-span-2">
                <dt className={SINIF_ETIKET}>Notlar</dt>
                <dd className="mt-0.5 whitespace-pre-line text-metin">
                  {paydas.notlar}
                </dd>
              </div>
            )}
          </dl>
          <BilgiKutusu className="mt-5">
            Kaydı ilin koordinatörü yönetir. Etkinliğinizin paydaş bilgisini
            etkinlik detay ekranından ekleyebilirsiniz.
          </BilgiKutusu>
        </Kart>
      )}

      {duzenleyebilir && (
        <Kart>
          <KartBasligi
            baslik="Kurum bilgileri"
            aciklama="İl değiştirilemez: kaydı başka ile taşımak, o ilin envanterine haberi olmadan satır eklemek olurdu."
            Ikon={Handshake}
          />

          <form action={paydasGuncelleEylemi} className="space-y-4">
            <input type="hidden" name="paydasId" value={paydas.id} />

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className={SINIF_ETIKET}>Kurum adı</span>
                <input
                  type="text"
                  name="ad"
                  required
                  maxLength={250}
                  defaultValue={paydas.ad}
                  className={SINIF_GIRDI}
                />
              </label>

              <label className="block">
                <span className={SINIF_ETIKET}>Paydaş türü</span>
                <select
                  name="tur"
                  defaultValue={paydas.tur}
                  className={SINIF_GIRDI}
                >
                  {PAYDAS_TURLERI.map((tur) => (
                    <option key={tur} value={tur}>
                      {PAYDAS_TURU_ETIKETLERI[tur]}
                    </option>
                  ))}
                </select>
              </label>

              <div>
                <span className={SINIF_ETIKET}>İl</span>
                <p className="mt-1 rounded-md border border-cizgi bg-zemin px-3 py-2 text-sm text-metin-yumusak">
                  {paydas.il.ad}
                </p>
              </div>

              <label className="block">
                <span className={SINIF_ETIKET}>Yetkili kişi</span>
                <input
                  type="text"
                  name="yetkiliKisi"
                  maxLength={150}
                  defaultValue={paydas.yetkiliKisi ?? ""}
                  className={SINIF_GIRDI}
                />
              </label>

              <label className="block">
                <span className={SINIF_ETIKET}>Telefon</span>
                <input
                  type="text"
                  name="telefon"
                  maxLength={20}
                  defaultValue={paydas.telefon ?? ""}
                  className={SINIF_GIRDI}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className={SINIF_ETIKET}>E-posta</span>
                <input
                  type="email"
                  name="eposta"
                  maxLength={150}
                  defaultValue={paydas.eposta ?? ""}
                  className={SINIF_GIRDI}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className={SINIF_ETIKET}>Adres</span>
                <input
                  type="text"
                  name="adres"
                  defaultValue={paydas.adres ?? ""}
                  className={SINIF_GIRDI}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className={SINIF_ETIKET}>
                  İş birliği alanı / potansiyeli
                </span>
                <textarea
                  name="isBirligiAlani"
                  rows={3}
                  required
                  defaultValue={paydas.isBirligiAlani}
                  className={SINIF_GIRDI}
                />
              </label>

              <label className="block sm:col-span-2">
                <span className={SINIF_ETIKET}>Notlar</span>
                <textarea
                  name="notlar"
                  rows={2}
                  defaultValue={paydas.notlar ?? ""}
                  className={SINIF_GIRDI}
                />
              </label>
            </div>

            <button type="submit" className={SINIF_BIRINCIL_BUTON}>
              <Save size={16} aria-hidden />
              Kaydet
            </button>
          </form>

          <div className="mt-6 border-t border-cizgi pt-5">
            <p className="mb-3 text-sm text-metin-yumusak">
              Paydaş kayıtları silinmez. İş birliği sona erdiyse kaydı pasife
              alın: listede görünmez ama geçmiş etkinlik bağlantıları korunur.
            </p>
            <form action={paydasDurumEylemi}>
              <input type="hidden" name="paydasId" value={paydas.id} />
              <input
                type="hidden"
                name="aktif"
                value={paydas.aktif ? "hayir" : "evet"}
              />
              <button type="submit" className={SINIF_IKINCIL_BUTON}>
                <Power size={15} aria-hidden />
                {paydas.aktif ? "Pasife al" : "Yeniden aktifleştir"}
              </button>
            </form>
          </div>
        </Kart>
      )}

      <Kart>
        <KartBasligi
          baslik="İş birliği yapılan etkinlikler"
          aciklama="Bu paydaşın destek verdiği etkinlikler (etkinlik sonuç alanı)."
          Ikon={CalendarDays}
        />
        {paydas.faaliyetler.length === 0 ? (
          <p className="text-sm text-metin-yumusak">
            Bu paydaş henüz bir etkinliğe bağlanmamış.
          </p>
        ) : (
          <ul className="divide-y divide-cizgi">
            {paydas.faaliyetler.map((bag) => (
              <li key={bag.faaliyet.id} className="py-2.5">
                <Link
                  href={`/panel/etkinlikler/${bag.faaliyet.id}`}
                  className="font-medium text-metin transition hover:text-vurgu-metin hover:underline"
                >
                  {bag.faaliyet.ad}
                </Link>
                <p className="text-sm text-metin-yumusak">
                  {tarihYaz(bag.faaliyet.tarih)}
                  {bag.katkisi ? ` · ${bag.katkisi}` : ""}
                  {bag.faaliyet.durum === "IPTAL_EDILDI" ? " · iptal edildi" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Kart>

      <p className="text-sm text-metin-yumusak">
        Kaydı {paydas.ekleyen.ad} {paydas.ekleyen.soyad} ekledi ·{" "}
        {tarihSaatYaz(paydas.olusturmaTarihi)} · son güncelleme{" "}
        {tarihSaatYaz(paydas.guncellemeTarihi)}
      </p>
    </div>
  );
}
