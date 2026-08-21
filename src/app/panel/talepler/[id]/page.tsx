import { CalendarClock, Megaphone } from "lucide-react";
import { notFound } from "next/navigation";
import { RolEtiketi, RolsuzEtiketi } from "@/components/RolEtiketi";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  Rozet,
  SayfaBasligi,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  PANODA_GORUNEN_ONAY_DURUMLARI,
  TALEP_TURU_BELIRTILMEMIS,
  TALEP_TURU_ETIKETLERI,
} from "@/lib/iletisim/kurallar";
import { tarihSaatYaz, tarihYaz } from "@/lib/tarih";
import { panoIlaniOnaylayabilirMi } from "@/lib/yetki/izinler";

export const dynamic = "force-dynamic";

/**
 * PANO İLANI — AYRINTI EKRANI (21 Ağustos 2026 · istek: "panodaki ilanlar kart
 * düzeni gibi özet olacak, aynı etkinlikler gibi").
 *
 * Pano artık ilanın TAMAMINI değil özetini basıyor: kartta başlık, tür ve kimin
 * açtığı var; ilan metni ve mentör cevapları buraya taşındı. Sebebi etkinliklerdekiyle aynı — panoya BAKMAYA gelen kişi altmış
 * ilanı okumak zorunda kalmasın, ilgilendiğini açsın.
 *
 * GÖRÜNÜRLÜK KURALI PANODAKİYLE AYNI (PANODA_GORUNEN_ONAY_DURUMLARI): onay
 * bekleyen ya da reddedilen ilan adresi elle yazılarak açılamaz. İki istisna
 * var ve ikisi de zaten o ilanı başka bir ekranda görüyor: ilanın SAHİBİ
 * (panodaki "Açık ilanlarım" bölümünde durumuyla duruyor) ve onay yetkisi olan
 * proje yöneticisi (onay kuyruğunda).
 */
export default async function TalepAyrintiSayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  const { id } = await params;
  const talepId = Number.parseInt(id, 10);
  if (!Number.isFinite(talepId)) notFound();

  const talep = await prisma.talep.findUnique({
    where: { id: talepId },
    select: {
      id: true,
      tur: true,
      baslik: true,
      icerik: true,
      sonGecerlilik: true,
      kapatildiMi: true,
      onayDurumu: true,
      acanKullaniciId: true,
      calismaGrubu: { select: { ad: true } },
      acan: {
        select: {
          id: true,
          ad: true,
          soyad: true,
          sinif: true,
          brans: true,
          kurum: { select: { ad: true } },
          il: { select: { ad: true } },
          roller: { where: { bitisTarihi: null }, select: { rolKodu: true } },
        },
      },
      cevaplar: {
        where: { gizlendiMi: false },
        orderBy: { olusturmaTarihi: "asc" },
        select: {
          id: true,
          icerik: true,
          olusturmaTarihi: true,
          yazan: { select: { ad: true, soyad: true } },
        },
      },
    },
  });
  if (!talep) notFound();

  const simdi = new Date();
  const panodaGorunur =
    !talep.kapatildiMi &&
    talep.sonGecerlilik >= simdi &&
    PANODA_GORUNEN_ONAY_DURUMLARI.includes(talep.onayDurumu);
  const kendiIlani = talep.acanKullaniciId === kullanici.id;
  if (!panodaGorunur && !kendiIlani && !panoIlaniOnaylayabilirMi(kullanici)) {
    notFound();
  }

  const roller = [...new Set(talep.acan.roller.map((rol) => rol.rolKodu))];

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik={talep.baslik}
        geri={{ yol: "/panel/talepler", etiket: "Pano" }}
        rozet={
          <>
            <Rozet cesit="vurgu">
              {talep.tur
                ? TALEP_TURU_ETIKETLERI[talep.tur]
                : TALEP_TURU_BELIRTILMEMIS}
            </Rozet>
            {talep.calismaGrubu && <Rozet>{talep.calismaGrubu.ad}</Rozet>}
          </>
        }
      />

      {/*
        İlan panoda görünmüyorsa bunu AÇIKÇA söylüyoruz: buraya yalnızca ilanın
        sahibi ya da onay yetkisi olan geliyor ve ikisi de "ilan yayımda mı"
        sorusunun cevabını görmeli — sessizce göstermek, kapanmış bir ilanın
        hâlâ okunduğunu düşündürürdü.
      */}
      {!panodaGorunur && (
        <BilgiKutusu cesit="uyari">
          Bu ilan şu anda panoda görünmüyor.
        </BilgiKutusu>
      )}

      <Kart>
        <KartBasligi baslik="İlan" Ikon={Megaphone} />
        <p className="whitespace-pre-line text-metin">{talep.icerik}</p>

        {/*
          Rol rozeti adın YANINDA: panoda okunan ilk şey "bunu kim yazmış" ve
          bir öğrencinin destek talebiyle öğretmenin talebi aynı ağırlıkta
          değil. Rolsüz kullanıcı da nötr bir etiketle görünür — etiketsiz
          bırakılsaydı öğrenci sanılırdı.
        */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-metin-yumusak">
          {roller.length > 0 ? (
            roller.map((rolKodu) => (
              <RolEtiketi key={rolKodu} rolKodu={rolKodu} />
            ))
          ) : (
            <RolsuzEtiketi />
          )}
          <span>
            {talep.acan.ad} {talep.acan.soyad}
            {" · "}
            {talep.acan.sinif ?? talep.acan.brans ?? "—"}
            {" · "}
            {talep.acan.kurum?.ad ?? talep.acan.il?.ad ?? "—"}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarClock size={14} aria-hidden />
            {tarihYaz(talep.sonGecerlilik)} tarihine kadar
          </span>
        </div>
      </Kart>

      {/*
        MENTÖR CEVAPLARI (13 Ağustos 2026). Cevaplar mentör sayfasından
        yazılıyor, okunacakları yer burası: ilan sahibi bildirimle geliyor ve
        cevabı ilanının altında buluyor.

        Gizleme düğmesi BURADA YOK: gözetim rolleri cevabı görüyor ama kaldırma
        işi tek ekranda toplandı (mentör sayfası ve eylem).
      */}
      {talep.cevaplar.length > 0 && (
        <Kart>
          <KartBasligi baslik={`Mentör cevapları (${talep.cevaplar.length})`} />
          <ul className="space-y-3">
            {talep.cevaplar.map((cevap) => (
              <li key={cevap.id} className="rounded-kart bg-zemin px-3 py-2">
                <p className="text-sm font-medium text-metin">
                  {cevap.yazan.ad} {cevap.yazan.soyad}
                  <span className="ml-2 font-normal text-metin-yumusak">
                    {tarihSaatYaz(cevap.olusturmaTarihi)}
                  </span>
                </p>
                <p className="mt-1 whitespace-pre-line text-metin">
                  {cevap.icerik}
                </p>
              </li>
            ))}
          </ul>
        </Kart>
      )}

      {/*
        BAĞLANTI İSTEĞİ KUTUSU KALKTI (21 Ağustos 2026 · istek: "bağlantılarımdan
        normal mesaj göndermeyi tamamen kaldır").

        İlan sahibiyle birebir temasın tek yolu bağlantı isteğiydi; o akış
        tümüyle kalktı. Bugün doğrudan yazışma yalnızca okul içinde ve okul
        temsilcileriyle açılıyor (bkz. lib/iletisim/kurallar.ts ·
        dogrudanYazisilabilirMi) — pano ise açık bir ilan panosu olarak
        kalıyor: cevap, mentör cevabı olarak ilanın altına yazılıyor.
      */}
    </div>
  );
}
