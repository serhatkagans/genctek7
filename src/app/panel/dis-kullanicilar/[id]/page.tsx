import {
  ArrowLeft,
  Building2,
  Compass,
  GraduationCap,
  Mail,
  Phone,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RolEtiketi, RolsuzEtiketi } from "@/components/RolEtiketi";
import { BilgiKutusu, Kart, KartBasligi, SayfaBasligi } from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { TUR_ETIKETLERI } from "@/lib/dis-kimlik/kurallar";
import {
  MENTORLUK_DURUM_ETIKETLERI,
  MENTORLUK_DURUM_SINIFLARI,
  mentorKapsamiYaz,
} from "@/lib/mentor/kurallar";
import { mentorluguGetir } from "@/lib/mentor/veri";
import { tarihSaatYaz } from "@/lib/tarih";
import { disBasvuruYonetebilirMi } from "@/lib/yetki/izinler";
import { erisimLogla } from "@/lib/yetki/log";

export const dynamic = "force-dynamic";

/**
 * Dış kullanıcı profili — mezun, paydaş temsilcisi ve mentör (11 Ağustos 2026 ·
 * istek: "dış girişten gelen mentör paydaş vs tıklanabilir olsun, onların
 * profiline gitsin").
 *
 * NİYE AYRI BİR EKRAN: öğretmen profili (`/panel/ogretmenler/[id]`) bu kişileri
 * AÇMAZ ve açmamalı — envanterin "öğretmen" tanımı mezunu ve paydaş
 * temsilcisini bilerek dışarıda bırakıyor (bkz. lib/yetki/kapsam.ts · OGRETMEN),
 * yoksa il koordinatörü öğretmen listesinde mezunları görürdü. Bağlantı oraya
 * verilseydi tıklanan her ad 404 dönerdi.
 *
 * BİLGİNİN KAYNAĞI BAŞVURUDUR: mezunun okulu, paydaşın kurumu ve görev unvanı
 * kullanıcı satırına kopyalanmaz (bkz. schema · Kullanici notu). Ekran bu
 * yüzden kullanıcıyı değil, kullanıcıyı DOĞURAN başvuruyu okuyor.
 *
 * KAPI DAR: yalnızca proje yöneticisi. Bu kişilerin e-postası, telefonu ve
 * başvuru gerekçesi burada tek ekranda duruyor; aynı veriyi zaten onaylayan
 * rol açsın yeter. Koordinatöre açmak ayrı bir karardır ve mentörlük ekranı
 * ona kendi ilindeki mentörleri hâlihazırda gösteriyor.
 */
export default async function DisKullaniciProfiliSayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  const { id } = await params;

  // Kapsam dışı erişimde 404: kaydın varlığı bile sızmasın
  // (bkz. references/permissions.md Bölüm 4).
  if (!disBasvuruYonetebilirMi(kullanici)) notFound();

  const kisiId = Number.parseInt(id, 10);
  if (!Number.isInteger(kisiId)) notFound();

  const kisi = await prisma.kullanici.findUnique({
    where: { id: kisiId },
    select: {
      id: true,
      ad: true,
      soyad: true,
      aktif: true,
      il: { select: { ad: true } },
      olusturmaTarihi: true,
      ogretmenProfil: { select: { eposta: true, telefon: true } },
      roller: {
        where: { bitisTarihi: null },
        select: { rolKodu: true, ilKodu: true },
      },
      disBasvurusu: {
        select: {
          tur: true,
          eposta: true,
          telefon: true,
          beyan: true,
          mezuniyetYili: true,
          gorevUnvani: true,
          olusturmaTarihi: true,
          kararTarihi: true,
          mezunKurum: { select: { ad: true } },
          paydas: { select: { id: true, ad: true } },
          kararVeren: { select: { ad: true, soyad: true } },
        },
      },
    },
  });

  /*
   * BAŞVURUSU OLMAYAN KULLANICI BURADA AÇILMAZ. Ekran dış kullanıcı içindir;
   * öğrenci ya da öğretmen kimliğini bu adresten göstermek, o ekranlardaki
   * kapsam filtrelerini (danışman kendi okulunu görür, koordinatör kendi ilini)
   * dolaşmanın bir yolu olurdu.
   */
  if (!kisi || !kisi.disBasvurusu) notFound();

  const basvuru = kisi.disBasvurusu;
  const mentorluk = await mentorluguGetir(kisi.id);

  // Kişisel veri görüntülemesi KVKK gereği kayda geçer.
  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "GORUNTULEME",
    hedefTip: "PROFIL",
    hedefId: kisi.id,
    detay: `Dış kullanıcı profili görüntülendi: ${kisi.ad} ${kisi.soyad}`,
  });

  const Ikon =
    basvuru.tur === "MEZUN"
      ? GraduationCap
      : basvuru.tur === "PAYDAS"
        ? Building2
        : Compass;

  return (
    <div className="space-y-6">
      <Link
        href="/panel/dis-basvurular"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-vurgu-metin"
      >
        <ArrowLeft size={15} aria-hidden />
        Dış giriş başvuruları
      </Link>

      <SayfaBasligi
        baslik={`${kisi.ad} ${kisi.soyad}`}
        aciklama={`${TUR_ETIKETLERI[basvuru.tur]} · ${kisi.il?.ad ?? "İl belirtilmemiş"}`}
        /*
          Kendi geri bağlantısı yukarıda: bu ekranın üstü Panel değil,
          geldiği liste. `SayfaBasligi`nin varsayılan "Panel" bağlantısı
          basılsaydı üst üste iki geri bağlantısı olurdu.
        */
        geri={null}
      />

      {!kisi.aktif && (
        <BilgiKutusu cesit="uyari">
          Bu kullanıcı pasife alınmış; sisteme giriş yapamaz.
        </BilgiKutusu>
      )}

      <Kart>
        <KartBasligi baslik="Kimlik ve iletişim" Ikon={Ikon} />
        <div className="mb-4 flex flex-wrap gap-1">
          {kisi.roller.length === 0 ? (
            <RolsuzEtiketi />
          ) : (
            kisi.roller.map((rol) => (
              <RolEtiketi
                key={rol.rolKodu}
                rolKodu={rol.rolKodu}
                ekBilgi={rol.ilKodu}
              />
            ))
          )}
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-metin-yumusak">E-posta</dt>
            <dd className="flex items-center gap-1.5 text-metin">
              <Mail size={14} aria-hidden />
              {kisi.ogretmenProfil?.eposta ?? basvuru.eposta}
            </dd>
          </div>
          <div>
            <dt className="text-metin-yumusak">Telefon</dt>
            <dd className="flex items-center gap-1.5 text-metin">
              <Phone size={14} aria-hidden />
              {kisi.ogretmenProfil?.telefon ?? basvuru.telefon ?? "—"}
            </dd>
          </div>
          {basvuru.tur === "MEZUN" ? (
            <>
              <div>
                <dt className="text-metin-yumusak">Mezun olduğu okul</dt>
                <dd className="text-metin">
                  {basvuru.mezunKurum?.ad ?? "Belirtilmedi"}
                </dd>
              </div>
              <div>
                <dt className="text-metin-yumusak">Mezuniyet yılı</dt>
                <dd className="text-metin">{basvuru.mezuniyetYili ?? "—"}</dd>
              </div>
            </>
          ) : basvuru.tur === "PAYDAS" ? (
            <>
              <div>
                <dt className="text-metin-yumusak">Temsil ettiği kurum</dt>
                <dd className="text-metin">
                  {/*
                    Paydaş kaydı varsa envanterdeki kartına gidilir: "hangi
                    kurumu temsil ediyor" sorusunun devamı hep "o kurumla başka
                    ne yapıldı" oluyor.
                  */}
                  {basvuru.paydas ? (
                    <Link
                      href={`/panel/paydaslar/${basvuru.paydas.id}`}
                      className="font-medium text-vurgu-metin underline underline-offset-2"
                    >
                      {basvuru.paydas.ad}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-metin-yumusak">Görev / unvan</dt>
                <dd className="text-metin">{basvuru.gorevUnvani ?? "—"}</dd>
              </div>
            </>
          ) : (
            /*
             * MENTÖRDE OKUL/KURUM SATIRI BASILMIYOR. Mentörün ekosisteme bağı
             * bir okul ya da kurum üzerinden değil, bildiği KONULAR üzerinden
             * kuruluyor (bkz. schema · DisKullaniciTuru.MENTOR); iki satır da
             * boş kalıp "—" yazıyordu, yani ekran doldurulmamış bir alan varmış
             * gibi görünüyordu. Kapsamı aşağıdaki Mentörlük kartı söylüyor.
             */
            null
          )}
        </dl>
      </Kart>

      {mentorluk && (
        <Kart>
          <KartBasligi
            baslik="Mentörlük"
            aciklama="Panodaki 'Mentöre sor' ilanlarında bu kapsamla görünür."
            Ikon={GraduationCap}
          />
          <p className="flex flex-wrap items-center gap-2 text-metin">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${MENTORLUK_DURUM_SINIFLARI[mentorluk.durum]}`}
            >
              {MENTORLUK_DURUM_ETIKETLERI[mentorluk.durum]}
            </span>
            {mentorKapsamiYaz(mentorluk.grupAdlari, mentorluk.konular) || "—"}
          </p>
          {mentorluk.durum === "REDDEDILDI" && mentorluk.retGerekcesi && (
            <p className="mt-2 text-sm text-hata-metin">
              Gerekçe: {mentorluk.retGerekcesi}
            </p>
          )}
        </Kart>
      )}

      <Kart>
        <KartBasligi
          baslik="Giriş başvurusu"
          aciklama="Kişinin sisteme alınma gerekçesi ve kararı"
        />
        <p className="text-sm whitespace-pre-wrap text-metin">
          {basvuru.beyan}
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-metin-yumusak">Başvuru tarihi</dt>
            <dd className="text-metin">
              {tarihSaatYaz(basvuru.olusturmaTarihi)}
            </dd>
          </div>
          <div>
            <dt className="text-metin-yumusak">Onaylayan</dt>
            <dd className="text-metin">
              {basvuru.kararVeren
                ? `${basvuru.kararVeren.ad} ${basvuru.kararVeren.soyad}`
                : "—"}
              {basvuru.kararTarihi && (
                <span className="block text-xs text-metin-yumusak">
                  {tarihSaatYaz(basvuru.kararTarihi)}
                </span>
              )}
            </dd>
          </div>
        </dl>
      </Kart>
    </div>
  );
}
