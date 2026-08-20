import { ArrowLeft, MessageSquare, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RolEtiketi } from "@/components/RolEtiketi";
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
  buEkibiYonetebilirMi,
  EKIP_SOHBET_UYARISI,
  ekipSohbetiOkuyabilirMi,
  ekipSohbetineYazabilirMi,
} from "@/lib/ekip/kurallar";
import { tarihSaatYaz } from "@/lib/tarih";
import {
  ekibeUyeEkleEylemi,
  ekibiKapatEylemi,
  ekipMesajiGonderEylemi,
  ekiptenUyeCikarEylemi,
} from "../eylemler";

export const dynamic = "force-dynamic";

/**
 * EKİP SAYFASI — üyeler ve sohbet (13 Ağustos 2026).
 *
 * TEK EKRAN: üye listesi ve sohbet aynı sayfada. Ayrılsalardı koordinatör
 * "kim var" sorusunu cevaplamak için sohbetten çıkmak zorunda kalırdı; ekip
 * küçük bir topluluk ve iki liste yan yana sığıyor.
 *
 * GÖRME KAPISI: üyeler + ekibin ilinin koordinatörü + proje yöneticisi
 * (bkz. lib/ekip/kurallar.ts). Yetkisi olmayan 404 görür, 403 değil — ekibin
 * varlığı sızmasın (references/permissions.md · Bölüm 4).
 */

const DURUM_MESAJLARI: Record<string, string> = {
  "ekip-kuruldu":
    "Ekip kuruldu. Şimdi üyelerini ekleyin; eklediğiniz herkese bildirim gider.",
  "uye-eklendi": "Üye eklendi ve kendisine bildirim gitti.",
  "uye-cikarildi":
    "Üye ekipten çıkarıldı. Yazdığı mesajlar sohbette kalmaya devam eder.",
};

export default async function EkipSayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ durum?: string; hata?: string; ara?: string }>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  const { id } = await params;
  const { durum, hata, ara } = await searchParams;

  const ekipId = Number.parseInt(id, 10);
  if (!Number.isFinite(ekipId)) notFound();

  const ekip = await prisma.ekip.findUnique({
    where: { id: ekipId },
    select: {
      id: true,
      ad: true,
      aciklama: true,
      ilKodu: true,
      aktif: true,
      olusturmaTarihi: true,
      il: { select: { ad: true } },
      kuran: { select: { ad: true, soyad: true } },
      uyeler: {
        orderBy: { eklenmeTarihi: "asc" },
        select: {
          kullaniciId: true,
          eklenmeTarihi: true,
          kullanici: {
            select: {
              id: true,
              ad: true,
              soyad: true,
              sinif: true,
              brans: true,
              kurum: { select: { ad: true } },
              roller: {
                where: { bitisTarihi: null },
                select: { rolKodu: true },
              },
            },
          },
        },
      },
      /*
        Mesajlar ESKİDEN YENİYE: sohbet yukarıdan aşağı okunur ve yazma kutusu
        en altta. Ters sıralansaydı yeni gelen mesaj kutunun uzağına düşerdi.

        Gizlenmiş mesaj basılmaz; kaydı duruyor (bkz. migration notu).
      */
      mesajlar: {
        where: { gizlendiMi: false },
        orderBy: { olusturmaTarihi: "asc" },
        take: 200,
        select: {
          id: true,
          icerik: true,
          olusturmaTarihi: true,
          yazan: { select: { id: true, ad: true, soyad: true } },
        },
      },
    },
  });
  if (!ekip) notFound();

  const uyeIdleri = ekip.uyeler.map((uye) => uye.kullaniciId);
  const kapsam = { ilKodu: ekip.ilKodu, uyeKullaniciIdleri: uyeIdleri };

  if (!ekipSohbetiOkuyabilirMi(kullanici, kapsam)) notFound();

  const yonetebilir = buEkibiYonetebilirMi(kullanici, ekip.ilKodu);
  const yazabilir = ekipSohbetineYazabilirMi(kullanici, {
    ...kapsam,
    aktif: ekip.aktif,
  });

  /*
   * ÜYE ADAYLARI: ekibin ilindeki aktif kullanıcılar, hâlihazırda üye olanlar
   * hariç. Liste ARAMAYLA daraltılıyor — bir ilde binlerce kişi olabilir ve
   * hepsini seçim listesine basmak ekranı da sorguyu da boğardı.
   *
   * Arama yapılmadan aday BASILMAZ: rastgele elli kişilik bir liste,
   * koordinatörün aradığı kişiyi bulmasına yardım etmez.
   */
  const aramaMetni = (ara ?? "").trim();
  const adaylar =
    yonetebilir && ekip.aktif && aramaMetni.length >= 2
      ? await prisma.kullanici.findMany({
          where: {
            aktif: true,
            ilKodu: ekip.ilKodu,
            id: { notIn: uyeIdleri.length > 0 ? uyeIdleri : [-1] },
            OR: [
              { ad: { contains: aramaMetni, mode: "insensitive" } },
              { soyad: { contains: aramaMetni, mode: "insensitive" } },
            ],
          },
          orderBy: [{ ad: "asc" }, { soyad: "asc" }],
          take: 20,
          select: {
            id: true,
            ad: true,
            soyad: true,
            sinif: true,
            brans: true,
            kurum: { select: { ad: true } },
            roller: { where: { bitisTarihi: null }, select: { rolKodu: true } },
          },
        })
      : [];

  return (
    <div className="space-y-6">
      <Link
        href="/panel/ekipler"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-vurgu-metin hover:underline"
      >
        <ArrowLeft size={15} aria-hidden />
        Ekiplerim
      </Link>

      <SayfaBasligi
        baslik={ekip.ad}
        aciklama={`${ekip.il.ad} · ${ekip.uyeler.length} üye · ${ekip.kuran.ad} ${ekip.kuran.soyad} kurdu`}
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
      {!ekip.aktif && (
        <BilgiKutusu cesit="uyari">
          Bu ekip kapatıldı. Sohbet okunabilir ama yeni mesaj yazılamaz.
        </BilgiKutusu>
      )}
      {ekip.aciklama && <p className="text-metin">{ekip.aciklama}</p>}

      <BilgiKutusu cesit="uyari">{EKIP_SOHBET_UYARISI}</BilgiKutusu>

      <Kart>
        <KartBasligi
          baslik="Ekip sohbeti"
          aciklama={`${ekip.mesajlar.length} mesaj`}
          Ikon={MessageSquare}
        />
        {ekip.mesajlar.length === 0 ? (
          <p className="text-metin-yumusak">
            Henüz mesaj yok. İlk mesajı siz yazabilirsiniz.
          </p>
        ) : (
          <ul className="space-y-3">
            {ekip.mesajlar.map((mesaj) => (
              <li
                key={mesaj.id}
                id={`mesaj-${mesaj.id}`}
                className={`scroll-mt-24 rounded-kart px-3 py-2 ${
                  mesaj.yazan.id === kullanici.id
                    ? "bg-vurgu-zemin"
                    : "bg-zemin"
                }`}
              >
                <p className="text-sm font-medium text-metin">
                  {mesaj.yazan.ad} {mesaj.yazan.soyad}
                  <span className="ml-2 font-normal text-metin-yumusak">
                    {tarihSaatYaz(mesaj.olusturmaTarihi)}
                  </span>
                </p>
                <p className="mt-1 whitespace-pre-line text-metin">
                  {mesaj.icerik}
                </p>
              </li>
            ))}
          </ul>
        )}

        {yazabilir && (
          <form
            action={ekipMesajiGonderEylemi}
            className="mt-4 space-y-2 border-t border-cizgi pt-4"
          >
            <input type="hidden" name="ekipId" value={ekip.id} />
            <label className="block">
              <span className="sr-only">Mesajınız</span>
              <textarea
                name="icerik"
                required
                rows={3}
                maxLength={2000}
                placeholder="Ekibe yazın…"
                className={SINIF_GIRDI}
              />
            </label>
            <button type="submit" className={SINIF_BIRINCIL_BUTON}>
              <MessageSquare size={16} aria-hidden />
              Gönder
            </button>
          </form>
        )}
      </Kart>

      <Kart>
        <KartBasligi
          baslik="Üyeler"
          aciklama={`${ekip.uyeler.length} kişi`}
          Ikon={Users}
        />
        {ekip.uyeler.length === 0 ? (
          <p className="text-metin-yumusak">
            Ekipte henüz üye yok.{" "}
            {yonetebilir && "Aşağıdan arayarak ekleyebilirsiniz."}
          </p>
        ) : (
          <ul className="divide-y divide-cizgi">
            {ekip.uyeler.map(({ kullanici: uye, eklenmeTarihi }) => (
              <li
                key={uye.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2.5"
              >
                <span className="flex flex-wrap items-center gap-2">
                  {[...new Set(uye.roller.map((rol) => rol.rolKodu))].map(
                    (rolKodu) => (
                      <RolEtiketi key={rolKodu} rolKodu={rolKodu} />
                    ),
                  )}
                  <span className="text-metin">
                    {uye.ad} {uye.soyad}
                  </span>
                  <span className="text-sm text-metin-yumusak">
                    {uye.sinif ?? uye.brans ?? "—"}
                    {" · "}
                    {uye.kurum?.ad ?? "—"}
                    {" · "}
                    {tarihSaatYaz(eklenmeTarihi)} tarihinde eklendi
                  </span>
                </span>
                {yonetebilir && ekip.aktif && (
                  <form action={ekiptenUyeCikarEylemi}>
                    <input type="hidden" name="ekipId" value={ekip.id} />
                    <input type="hidden" name="kullaniciId" value={uye.id} />
                    <button type="submit" className={SINIF_IKINCIL_BUTON}>
                      Çıkar
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </Kart>

      {yonetebilir && ekip.aktif && (
        <Kart>
          <KartBasligi
            baslik="Üye ekle"
            aciklama={`${ekip.il.ad} ilindeki kişiler arasında arayın. Eklenen kişiye bildirim gider.`}
            Ikon={UserPlus}
          />
          <form method="get" className="flex flex-wrap items-end gap-2">
            <label className="block grow">
              <span className="text-sm font-medium text-metin">
                Ad ya da soyad
              </span>
              <input
                type="search"
                name="ara"
                defaultValue={aramaMetni}
                minLength={2}
                placeholder="En az iki harf yazın"
                className={SINIF_GIRDI}
              />
            </label>
            <button type="submit" className={SINIF_IKINCIL_BUTON}>
              Ara
            </button>
          </form>

          {aramaMetni.length >= 2 && (
            <div className="mt-4">
              {adaylar.length === 0 ? (
                <p className="text-metin-yumusak">
                  Aramanıza uyan, ekipte olmayan kişi bulunamadı.
                </p>
              ) : (
                <ul className="divide-y divide-cizgi">
                  {adaylar.map((aday) => (
                    <li
                      key={aday.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        {[...new Set(aday.roller.map((rol) => rol.rolKodu))].map(
                          (rolKodu) => (
                            <RolEtiketi key={rolKodu} rolKodu={rolKodu} />
                          ),
                        )}
                        <span className="text-metin">
                          {aday.ad} {aday.soyad}
                        </span>
                        <span className="text-sm text-metin-yumusak">
                          {aday.sinif ?? aday.brans ?? "—"}
                          {" · "}
                          {aday.kurum?.ad ?? "—"}
                        </span>
                      </span>
                      <form action={ekibeUyeEkleEylemi}>
                        <input type="hidden" name="ekipId" value={ekip.id} />
                        <input
                          type="hidden"
                          name="kullaniciId"
                          value={aday.id}
                        />
                        <button type="submit" className={SINIF_IKINCIL_BUTON}>
                          <UserPlus size={15} aria-hidden />
                          Ekle
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Kart>
      )}

      {/*
        EKİBİ KAPATMA EN ALTTA ve ikincil düğmeyle: geri alınması olmayan bir
        işlem değil (kayıt duruyor) ama günlük iş de değil.
      */}
      {yonetebilir && ekip.aktif && (
        <Kart>
          <KartBasligi
            baslik="Ekibi kapat"
            aciklama="Sohbet ve üye listesi kayıtta kalır; yeni mesaj yazılamaz ve ekip listelerde arşive düşer."
          />
          <form action={ekibiKapatEylemi}>
            <input type="hidden" name="ekipId" value={ekip.id} />
            <button type="submit" className={SINIF_IKINCIL_BUTON}>
              Ekibi kapat
            </button>
          </form>
        </Kart>
      )}
    </div>
  );
}
