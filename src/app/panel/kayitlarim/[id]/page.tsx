import { Paperclip, Sparkles, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import { KayitDuzenlemeFormu } from "@/components/ProfilDuzenleme";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SayfaBasligi,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { kazanimEkSinirlariniGetir } from "@/lib/kazanim/ek";
import {
  kazanimTipiTanimi,
  kazanimTipininCapasi,
} from "@/lib/kazanim/kurallar";
import { uygulamaYolu } from "@/lib/ortam";
import { tarihSaatYaz } from "@/lib/tarih";
import { ogrenciMi } from "@/lib/yetki/izinler";
import {
  kazanimBelgeEkleEylemi,
  kazanimBelgeSilEylemi,
  kazanimGuncelleEylemi,
  kazanimSilEylemi,
} from "../../profil/kazanim-eylemleri";

export const dynamic = "force-dynamic";

/**
 * BİR KAYDIN KENDİ SAYFASI (24 Ağustos 2026 · istek: "her bir bölümün altına
 * liste şeklinde en alta girdiği verileri görebilsin, tıklayınca sayfasına
 * gidip düzenleyebilsin").
 *
 * ---------------------------------------------------------------------------
 * NEDEN AYRI EKRAN
 * ---------------------------------------------------------------------------
 * Kayıtlar 22 Ağustos'ta panele katlanır grup kutuları olarak döndü ama
 * kutuların içinde yalnızca EKLEME FORMU vardı: kişi kaydını giriyor, "2 kayıt"
 * yazısını görüyor, ne girdiğini göremiyor ve düzenleyemiyordu. Düzenlemenin
 * hiç yolu yoktu — kayıt eklendikten sonra değiştirilemiyor, yalnızca
 * silinebiliyordu.
 *
 * DÜZENLEME PANELE GÖMÜLMEDİ: sekiz alanlı formu her satırın altına açmak, üç
 * kayıt giren kişide grup kutusunu okunamaz hâle getirirdi ve sayfada
 * JavaScript olmadığı için "aç/kapa" da yapılamıyordu (aynı kısıt kayıt
 * formunun tür seçiminde de belirleyici oldu).
 *
 * YALNIZCA KENDİ KAYDI: sorgu `kullaniciId`'ye sabitlenmiştir. Kazanım bir
 * BEYANDIR ve sahibi dışında kimse — danışman da koordinatör de —
 * düzenleyemez (bkz. kazanim-eylemleri.ts).
 */
export default async function KayitSayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hata?: string; durum?: string }>;
}) {
  const { id: hamId } = await params;
  const { hata, durum } = await searchParams;
  const kullanici = await oturumKullanicisiZorunlu();

  const id = Number.parseInt(hamId, 10);
  if (!Number.isInteger(id)) notFound();

  const [kazanim, belgeSinirlari] = await Promise.all([
    prisma.kullaniciKazanim.findFirst({
      where: { id, kullaniciId: kullanici.id },
      include: {
        ekler: {
          select: { id: true, dosyaAdi: true },
          orderBy: { yuklenmeTarihi: "asc" },
        },
        baglantilar: {
          select: { id: true, adres: true, etiket: true },
          orderBy: { siraNo: "asc" },
        },
      },
    }),
    kazanimEkSinirlariniGetir(),
  ]);
  /*
   * BAŞKASININ KAYDI DA `notFound` DÖNER: "yetkiniz yok" demek, o kimlikte bir
   * kaydın VAR OLDUĞUNU söylerdi. Kayıt sahibi için ikisi arasında bir fark
   * yok — kendi olmayan bir kayda zaten hiçbir yerden bağlantı verilmiyor.
   */
  if (!kazanim) notFound();

  const sahip = ogrenciMi(kullanici) ? "OGRENCI" : "OGRETMEN";
  const tanim = kazanimTipiTanimi(kazanim.tip, sahip);
  const izinliBelgeTipleri = [
    ...belgeSinirlari.izinliGorselTipleri,
    ...belgeSinirlari.izinliBelgeTipleri,
  ];

  /*
   * Geri bağlantısı kaydın KENDİ GRUBUNA döner ve kutuyu açık getirir
   * (`?bolum=`): panelin tepesine düşen bir "Panel" bağlantısı, kişiyi az önce
   * açtığı listeden uzaklaştırırdı. Grubu olmayan tip (arşivlenmiş) panelin
   * kendisine döner.
   */
  const capa = kazanimTipininCapasi(kazanim.tip);
  const geriYolu = capa ? `/panel?bolum=${capa}#${capa}` : "/panel";

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik={kazanim.baslik}
        aciklama={`${tanim.baslik} · kaydını buradan düzenleyebilirsin`}
        geri={{ yol: geriYolu, etiket: "Panel" }}
      />

      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}
      {durum === "kazanim-guncellendi" && (
        <BilgiKutusu cesit="olumlu">Kayıt güncellendi.</BilgiKutusu>
      )}
      {durum === "belge-eklendi" && (
        <BilgiKutusu cesit="olumlu">Destekleyici belge eklendi.</BilgiKutusu>
      )}
      {durum === "belge-silindi" && (
        <BilgiKutusu cesit="olumlu">Destekleyici belge kaldırıldı.</BilgiKutusu>
      )}

      <Kart>
        <KartBasligi baslik="Kayıt bilgileri" Ikon={Sparkles} />
        <div className="mt-4">
          <KayitDuzenlemeFormu
            kazanim={kazanim}
            tanim={tanim}
            izinliBelgeTipleri={izinliBelgeTipleri}
            belgeSinirlari={belgeSinirlari}
            guncelleEylemi={kazanimGuncelleEylemi}
          />
        </div>
      </Kart>

      {/*
        BELGELER AYRI KART: dosyalar formla birlikte kaydedilmiyor, tek tek
        ekleniyor ve kaldırılıyor. Aynı formun içinde dursalardı kaydın metnini
        düzeltmek, zorunlu tipte (sertifika) belgeyi her seferinde yeniden
        yüklemeyi gerektirirdi.
      */}
      <Kart>
        <KartBasligi baslik="Destekleyici belgeler" Ikon={Paperclip} />
        {kazanim.ekler.length === 0 ? (
          <p className="text-metin-yumusak">Bu kayda belge eklenmemiş.</p>
        ) : (
          <ul className="space-y-2">
            {kazanim.ekler.map((ek) => (
              <li
                key={ek.id}
                className="flex items-center justify-between gap-3 rounded-md border border-cizgi px-3 py-2"
              >
                <a
                  /*
                   * `<a>` HAM özniteliktir: Link'in aksine basePath'i kendisi
                   * eklemez, alt dizin kurulumunda uygulamanın dışına çıkardı.
                   * `target="_blank"` gerektiği için Link kullanılmıyor —
                   * belge yeni sekmede açılmalı ki kişi bu sayfadan düşmesin.
                   */
                  href={uygulamaYolu(`/panel/kazanim-ekleri/${ek.id}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 truncate text-sm font-medium text-vurgu-metin underline underline-offset-2"
                >
                  {ek.dosyaAdi}
                </a>
                <form action={kazanimBelgeSilEylemi}>
                  <input type="hidden" name="ekId" value={ek.id} />
                  {/*
                    Kaydın kimliği YALNIZCA DÖNÜŞ ADRESİ için; silme yetkisi
                    ekin kendi kimliğinden doğrulanıyor
                    (bkz. kazanimBelgeSilEylemi).
                  */}
                  <input type="hidden" name="kazanimId" value={kazanim.id} />
                  <input type="hidden" name="donus" value="kayit" />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-md border border-cizgi px-2.5 py-1.5 text-sm font-medium text-metin-yumusak transition hover:bg-zemin hover:text-hata-metin"
                    aria-label={`${ek.dosyaAdi} belgesini kaldır`}
                  >
                    <Trash2 size={14} aria-hidden />
                    Kaldır
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form
          action={kazanimBelgeEkleEylemi}
          className="mt-4 flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="kazanimId" value={kazanim.id} />
          <input type="hidden" name="donus" value="kayit" />
          <input
            type="file"
            name="belgeler"
            multiple
            required
            accept={izinliBelgeTipleri.join(",")}
            className="max-w-full text-sm text-metin file:mr-2 file:rounded-md file:border file:border-cizgi file:bg-kart file:px-2.5 file:py-1 file:text-sm file:font-medium file:text-metin"
            aria-label="Bu kayda destekleyici belge ekle"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md border border-cizgi px-2.5 py-1.5 text-sm font-medium text-metin transition hover:bg-zemin"
          >
            <Paperclip size={14} aria-hidden />
            Belge ekle
          </button>
        </form>
        <p className="mt-2 text-sm text-metin-yumusak">
          Görsel için en fazla{" "}
          {(belgeSinirlari.gorselMaksBayt / (1024 * 1024)).toFixed(0)} MB, belge
          için {(belgeSinirlari.belgeMaksBayt / (1024 * 1024)).toFixed(0)} MB.
        </p>
      </Kart>

      {/*
        SİLME EN ALTTA VE AYRI KART: düzenleme formunun yanında duran bir "Sil"
        düğmesi, kaydeden elin yanlışlıkla basacağı yerde olurdu. Silme geri
        alınamıyor — kazanımda soft-delete yok (bkz. schema.prisma).
      */}
      <Kart>
        <KartBasligi baslik="Kaydı sil" Ikon={Trash2} />
        <p className="text-metin-yumusak">
          Kayıt ve ona eklenmiş belgeler kalıcı olarak silinir; geri alınamaz.
        </p>
        <form action={kazanimSilEylemi} className="mt-4">
          <input type="hidden" name="kazanimId" value={kazanim.id} />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md border border-hata-cizgi px-3 py-2 text-sm font-medium text-hata-metin transition hover:bg-hata-zemin"
          >
            <Trash2 size={15} aria-hidden />
            Kaydı sil
          </button>
        </form>
        <p className="mt-3 text-sm text-metin-yumusak">
          {tarihSaatYaz(kazanim.olusturmaTarihi)} tarihinde eklendi.
        </p>
      </Kart>
    </div>
  );
}
