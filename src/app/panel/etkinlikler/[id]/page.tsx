import {
  ArrowRightLeft,
  Award,
  Ban,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Handshake,
  Info,
  MapPin,
  MessageSquare,
  Paperclip,
  PencilLine,
  Plus,
  Send,
  Star,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { DisaAktarmaBagi } from "@/components/DisaAktarmaBagi";
import { notFound } from "next/navigation";
import {
  BasvuruRozeti,
  FaaliyetDurumuRozeti,
  KapsamRozeti,
  KategoriRozeti,
  OnayRozeti,
  PencereRozeti,
} from "@/components/FaaliyetRozetleri";
import { MetinBaglantili } from "@/components/MetinBaglantili";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  KirintiYolu,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
  SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import {
  belgeKapisi,
  yoklamaAlinabilirMi,
  yoklamaOzeti,
} from "@/lib/belge/kapi";
import { faaliyetRaporuVarMi } from "@/lib/belge/kayit";
import { prisma } from "@/lib/db";
import { uygulamaYolu } from "@/lib/ortam";
import { faaliyetKapsamiCikar, gorunurFaaliyetGetir } from "@/lib/faaliyet/erisim";
import {
  AKTIF_BASVURU_DURUMLARI,
  basvuruPenceresi,
  basvuruYapilabilirMi,
  ETKINLIK_KATEGORISI_ETIKETLERI,
  faaliyetIcerikAlabilirMi,
  faaliyetSuresiYaz,
  KATILIMCI_TIPI_ETIKETLERI,
  katilimciTipi,
  kontenjanAltSiniri,
  kontenjanDurumu,
} from "@/lib/faaliyet/kurallar";
import { KATILIM_BICIMI_ETIKETLERI } from "@/lib/kazanim/kurallar";
import { PAYDAS_TURU_ETIKETLERI } from "@/lib/paydas/kurallar";
import { girdiTarihi, girdiTarihSaati, tarihSaatYaz, tarihYaz } from "@/lib/tarih";
import {
  baskasiAdinaBasvurabilirMi,
  basvuruDegerlendirebilirMi,
  basvuruYapabilirMi,
  ekYukleyebilirMi,
  faaliyetIptalEdebilirMi,
  faaliyetOnaylayabilirMi,
  faaliyetRaporuYazabilirMi,
  ilKoordinatoruMu,
  projeYoneticisiMi,
  faaliyetPaydasiYonetebilirMi,
  paydasEkleyebilirMi,
  yetkiDevrolduMu,
  yorumSilebilirMi,
  yorumYazabilirMi,
} from "@/lib/yetki/izinler";
import {
  DEGERLENDIRME_KATILIMCI_ALANLARI,
  ilDisiBasvuruFiltresi,
  ogrenciKapsamFiltresi,
  paydasKapsamFiltresi,
  ulusalBasvuranFiltresi,
} from "@/lib/yetki/kapsam";
import { erisimLogla, erisimLoglaCoklu } from "@/lib/yetki/log";
import {
  basvuruDegerlendirEylemi,
  basvuruGeriCekEylemi,
  basvuruYapEylemi,
  faaliyetDuzenleEylemi,
  faaliyetIptalEylemi,
  faaliyetOnayEylemi,
  yoklamaKaydetEylemi,
} from "../eylemler";
import { kaynakIlKarariEylemi } from "../il-disi-eylemler";
import {
  ekSilEylemi,
  ekYukleEylemi,
  faaliyetPaydasCikarEylemi,
  faaliyetPaydasEkleEylemi,
  kapakSecEylemi,
  yorumSilEylemi,
  yorumYazEylemi,
} from "./icerik-eylemleri";

export const dynamic = "force-dynamic";

/**
 * Faaliyet detayı: bilgi kartı, öğrencinin başvurusu, düzenleyenin
 * değerlendirme listesi ve proje yöneticisinin onay kararı.
 *
 * Kapsam dışındaki faaliyet 403 değil 404 döner (gorunurFaaliyetGetir), böylece
 * kaydın varlığı bile sızmaz.
 */

const DURUM_MESAJLARI: Record<string, string> = {
  olusturuldu: "Etkinlik oluşturuldu.",
  basvuruldu: "Başvurunuz alındı.",
  "geri-cekildi": "Başvurunuz geri çekildi.",
  degerlendirildi: "Başvuru değerlendirildi ve öğrenciye bildirim gönderildi.",
  onaylandi: "Etkinlik onaylandı ve yayına girdi.",
  reddedildi: "Etkinlik reddedildi.",
  // Kaynak il kararı bu ekrandan da verilebiliyor (11 Ağustos 2026); mesaj
  // etkinlik onayınınkinden ayrı, yoksa ikisi birbirine karışır.
  "kaynak-il-onaylandi":
    "Kaynak il onayı verildi. Başvuru artık değerlendirilebilir.",
  "kaynak-il-reddedildi":
    "Başvuru kaynak ilde reddedildi ve öğrenciye gerekçesiyle bildirildi.",
  "ek-yuklendi": "Dosya etkinliğe eklendi.",
  "ek-silindi": "Ek kaldırıldı.",
  "kapak-secildi": "Tanıtıcı görsel güncellendi.",
  "yorum-yazildi": "Yorumunuz yayınlandı.",
  "yorum-silindi": "Yorum silindi.",
  duzenlendi: "Etkinlik güncellendi.",
  "duzenlendi-onay":
    "Etkinlik güncellendi. Kritik alanlar değiştiği için etkinlik yeniden proje yöneticisi onayına düştü ve onaylanana kadar öğrencilere görünmez.",
  "iptal-edildi":
    "Etkinlik iptal edildi. Aktif başvurular kapatıldı ve öğrencilere bildirim gönderildi.",
  "paydas-eklendi": "Paydaş etkinliğe bağlandı.",
  "paydas-cikarildi":
    "Paydaş bağlantısı kaldırıldı. Paydaş kaydının kendisi silinmedi.",
  "yoklama-kaydedildi":
    "Yoklama kaydedildi. Yalnızca geldi işaretlenen kişilerin GençTek Yolculuğu'na bu etkinlik düşer ve belge yalnızca onlara üretilebilir.",
};

function Satir({
  etiket,
  children,
}: {
  etiket: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-sm font-medium text-metin-yumusak">{etiket}</dt>
      <dd className="mt-0.5 text-metin">{children}</dd>
    </div>
  );
}

function boyutYaz(bayt: bigint): string {
  const sayi = Number(bayt);
  if (sayi < 1024) return `${sayi} B`;
  if (sayi < 1024 * 1024) return `${(sayi / 1024).toFixed(0)} KB`;
  return `${(sayi / (1024 * 1024)).toFixed(1)} MB`;
}

interface YorumBilgisi {
  id: number;
  icerik: string;
  olusturmaTarihi: Date;
  silindiMi: boolean;
  yazan: { ad: string; soyad: string };
}

/**
 * Tek yorum. Silinen yorumun İÇERİĞİ gösterilmez ama satır kalır — altına
 * yazılmış yanıtlar varsa zincir kopmasın diye (domain-rules Bölüm 11).
 */
function YorumSatiri({
  yorum,
  faaliyetId,
  silebilirMi,
  yanitYazabilirMi = false,
}: {
  yorum: YorumBilgisi;
  faaliyetId: number;
  silebilirMi: boolean;
  yanitYazabilirMi?: boolean;
}) {
  if (yorum.silindiMi) {
    return (
      <p className="rounded-kart border border-dashed border-cizgi px-4 py-3 text-sm text-metin-yumusak italic">
        Bu yorum silindi.
      </p>
    );
  }

  return (
    <div className="rounded-kart border border-cizgi px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-metin">
          {yorum.yazan.ad} {yorum.yazan.soyad}
          <span className="ml-2 font-normal text-metin-yumusak">
            {tarihSaatYaz(yorum.olusturmaTarihi)}
          </span>
        </p>
        {silebilirMi && (
          <form action={yorumSilEylemi}>
            <input type="hidden" name="faaliyetId" value={faaliyetId} />
            <input type="hidden" name="yorumId" value={yorum.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-1 text-xs font-medium text-metin-yumusak transition hover:text-hata-metin"
            >
              <Trash2 size={13} aria-hidden />
              Sil
            </button>
          </form>
        )}
      </div>
      <p className="mt-2 whitespace-pre-line text-metin">{yorum.icerik}</p>

      {yanitYazabilirMi && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-medium text-vurgu-metin">
            Yanıtla
          </summary>
          <form action={yorumYazEylemi} className="mt-2 space-y-2">
            <input type="hidden" name="faaliyetId" value={faaliyetId} />
            <input type="hidden" name="ustYorumId" value={yorum.id} />
            <textarea
              name="icerik"
              required
              rows={2}
              maxLength={2000}
              className={SINIF_GIRDI}
            />
            <button type="submit" className={SINIF_IKINCIL_BUTON}>
              Yanıtı gönder
            </button>
          </form>
        </details>
      )}
    </div>
  );
}

export default async function FaaliyetDetaySayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hata?: string; durum?: string }>;
}) {
  const [{ id }, { hata, durum }] = await Promise.all([params, searchParams]);
  const kullanici = await oturumKullanicisiZorunlu();

  const faaliyet = await gorunurFaaliyetGetir(
    kullanici,
    Number.parseInt(id, 10),
  );
  if (!faaliyet) notFound();

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "GORUNTULEME",
    hedefTip: "FAALIYET",
    hedefId: faaliyet.id,
    detay: "Etkinlik detayı görüntülendi",
  });

  const simdi = new Date();
  const pencere = basvuruPenceresi(faaliyet, simdi);
  const kontenjan = kontenjanDurumu(faaliyet.basvurular, faaliyet.kontenjan);
  const kapsamBilgisi = faaliyetKapsamiCikar(faaliyet);

  // Katılımcı öğretmen de olabilir; kapı "öğrenci mi" değil "başvurabilir mi".
  const kendiAdinaBasvurabilir = basvuruYapabilirMi(kullanici);
  const vekaletenBasvurabilir = baskasiAdinaBasvurabilirMi(kullanici);
  const degerlendirebilir = basvuruDegerlendirebilirMi(kullanici, kapsamBilgisi);
  const devroldu = yetkiDevrolduMu(kullanici, kapsamBilgisi);
  const ekYonetebilir = ekYukleyebilirMi(kullanici, kapsamBilgisi);
  const iptalEdebilir = faaliyetIptalEdebilirMi(kullanici, kapsamBilgisi);
  /*
   * İptal edilen faaliyet YENİ içerik almaz ama mevcut içerik yerinde kalır ve
   * silinebilir: iptal, moderasyon yetkisini kaldırmaz.
   */
  const icerikEklenebilir = faaliyetIcerikAlabilirMi(faaliyet.durum);
  const yorumYazabilir =
    yorumYazabilirMi(kullanici, kapsamBilgisi) && icerikEklenebilir;
  const onayBekliyor =
    faaliyet.onayDurumu === "BEKLIYOR" &&
    faaliyetOnaylayabilirMi(kullanici, kapsamBilgisi);

  /*
   * KAYNAK İL KARARININ ETKİNLİKTEKİ İZİ (11 Ağustos 2026 · istek: "il
   * koordinatörünün onay verebileceği yer yok etkinliklerde").
   *
   * İl dışı başvurunun ilk onayı öğrencinin KENDİ ilinin koordinatörüne aittir
   * (bkz. lib/basvuru/il-disi.ts) ve karar artık bu ekranda veriliyor.
   * Ama koordinatör bu kararı ETKİNLİĞİN sayfasında arıyor — Ağrı'daki öğrenci
   * İstanbul'daki bir etkinliğe başvurduğunda koordinatörün gördüğü tek somut
   * şey o etkinliktir. Sayfada hiçbir iz yoktu: başvuru listesi yalnızca
   * DÜZENLEYENE açılıyor (bkz. basvuranlar), koordinatör düzenleyen değil,
   * dolayısıyla ekran ona "burada yapacak bir şeyin yok" diyordu. Karar da
   * kimse vermediği için başvuru BEKLIYOR'da kalıyordu.
   *
   * KARAR BURAYA TAŞINMADI, yalnızca yolu gösteriliyor. Aynı kararı iki ekrana
   * koymak, ret gerekçesi zorunluluğu gibi kuralları iki yerde tutmak olurdu;
   * kopyalanan kural er geç ayrışır. Burada gösterilen şey bir sayaç ve bir
   * bağlantı.
   *
   * Sayım merkezi filtreden geçiyor: koordinatör yalnızca KENDİ ilinden çıkan
   * başvuruyu sayar, proje yöneticisi hepsini. Başka hiçbir rolde sorgu
   * çalışmaz.
   */
  const kaynakIlKarariGorebilir =
    ilKoordinatoruMu(kullanici) || projeYoneticisiMi(kullanici);
  const kaynakIlKarariVerebildikleri = kaynakIlKarariGorebilir
    ? new Set(
        (
          await prisma.basvuru.findMany({
            where: {
              AND: [
                ilDisiBasvuruFiltresi(kullanici),
                { faaliyetId: faaliyet.id },
                // `kaynakIlKarariVerilebilirMi`nin iki koşulu: karar bekliyor
                // ve başvuru hâlâ canlı. Geri çekilmiş başvuru için kimseyi
                // karar vermeye çağırmıyoruz.
                { kaynakIlOnayDurumu: "BEKLIYOR" },
                { durum: "BEKLIYOR" },
              ],
            },
            select: { id: true },
          })
        ).map((basvuru) => basvuru.id),
      )
    : new Set<number>();
  const bekleyenKaynakIlSayisi = kaynakIlKarariVerebildikleri.size;

  // Silinen ek dosyası listelenmez; kaydı log için veritabanında durur.
  const ekler = await prisma.faaliyetEk.findMany({
    where: { faaliyetId: faaliyet.id, silindiMi: false },
    orderBy: { yuklenmeTarihi: "asc" },
    select: {
      id: true,
      dosyaAdi: true,
      mimeTipi: true,
      boyutBayt: true,
      yuklenmeTarihi: true,
    },
  });

  // Görseller resim olarak, belgeler bağlantı olarak gösterilir; tanıtıcı
  // görsel her zaman başa alınır.
  const gorseller = ekler
    .filter((ek) => ek.mimeTipi.startsWith("image/"))
    .sort((a, b) =>
      a.id === faaliyet.kapakEkId ? -1 : b.id === faaliyet.kapakEkId ? 1 : 0,
    );
  const belgeler = ekler.filter((ek) => !ek.mimeTipi.startsWith("image/"));

  /*
   * Yorumlar düz getirilir, zincir ekranda kurulur. Silinen yorum sorgudan
   * ÇIKARILMAZ: altına yazılmış yanıtlar varsa zincir kopmasın diye "silindi"
   * olarak gösterilir, içeriği taşınmaz.
   */
  const yorumlar = await prisma.yorum.findMany({
    where: { faaliyetId: faaliyet.id },
    orderBy: { olusturmaTarihi: "asc" },
    select: {
      id: true,
      icerik: true,
      olusturmaTarihi: true,
      silindiMi: true,
      ustYorumId: true,
      yazanKullaniciId: true,
      yazan: { select: { ad: true, soyad: true } },
    },
  });

  const yanitlar = new Map<number, typeof yorumlar>();
  for (const yorum of yorumlar) {
    if (yorum.ustYorumId === null) continue;
    const mevcut = yanitlar.get(yorum.ustYorumId) ?? [];
    mevcut.push(yorum);
    yanitlar.set(yorum.ustYorumId, mevcut);
  }
  const kokYorumlar = yorumlar.filter((yorum) => yorum.ustYorumId === null);

  // Kişinin kendi başvurusu — başkasının başvurusu bu sorgudan gelmez.
  const kendiBasvurum = kendiAdinaBasvurabilir
    ? await prisma.basvuru.findFirst({
        where: { faaliyetId: faaliyet.id, katilimciId: kullanici.id },
        orderBy: { basvuruTarihi: "desc" },
        select: {
          id: true,
          durum: true,
          gerekce: true,
          basvuruTarihi: true,
          adinaBasvuran: { select: { ad: true, soyad: true } },
        },
      })
    : null;

  const basvuruKarari = kendiAdinaBasvurabilir
    ? basvuruYapilabilirMi({
        pencere,
        onayDurumu: faaliyet.onayDurumu,
        faaliyetDurumu: faaliyet.durum,
        mevcutBasvuruDurumu: kendiBasvurum?.durum ?? null,
        kontenjanDoluMu: kontenjan.doluMu,
      })
    : { olurMu: false };

  /*
   * Başvuran listesi YALNIZCA değerlendirene açılır ve asgari alanları taşır:
   * telefon ve e-posta bilinçli olarak yok (references/permissions.md Bölüm 3).
   * Ulusal faaliyette başka ilden başvuran öğrenci de burada görünür — envanter
   * kapsamı genişlemez, bu erişim bu ekrana özeldir.
   */
  const basvuranlar = degerlendirebilir
    ? await prisma.basvuru.findMany({
        where: {
          AND: [
            // Filtre elle yazılmaz: bu erişimin kuralı kapsam katmanındadır.
            ulusalBasvuranFiltresi(kullanici, faaliyet.id, devroldu),
            { durum: { not: "GERI_CEKILDI" } },
          ],
        },
        orderBy: { basvuruTarihi: "asc" },
        select: {
          id: true,
          durum: true,
          gerekce: true,
          basvuruTarihi: true,
          /*
           * İL DIŞI BAŞVURUNUN KAYNAK İL DURUMU (11 Ağustos 2026 · istek:
           * "diğer illere onay ve red veremiyor").
           *
           * Alan listede YOKTU ve sonucu şuydu: seç/yedek/reddet düğmeleri her
           * satırda aynı görünüyor, başka ilden başvuran birine basıldığında
           * sunucu "öğrencinin kendi ilinin koordinatörünün onayını bekliyor"
           * diyerek kaydı geri çeviriyordu (bkz. degerlendirmeyeHazirMi).
           * Değerlendiren, hangi satırın neden çalışmadığını ancak deneyerek
           * öğreniyordu ve ekranda düzeltme yolu da görünmüyordu.
           *
           * Kural değişmedi — sıra hâlâ korunuyor. Değişen, sıranın ekranda
           * GÖRÜNÜR olması.
           */
          kaynakIlOnayDurumu: true,
          kaynakIlRetGerekcesi: true,
          katilimci: { select: DEGERLENDIRME_KATILIMCI_ALANLARI },
          // Vekaleten başvuruda değerlendiren, başvuruyu kimin yaptığını da
          // görmeli: gerekçeyi yazan kişi öğrencinin kendisi olmayabilir.
          adinaBasvuran: { select: { ad: true, soyad: true } },
        },
      })
    : [];

  if (basvuranlar.length > 0) {
    await erisimLoglaCoklu(
      basvuranlar.map((basvuru) => ({
        kullaniciId: kullanici.id,
        islem: "GORUNTULEME" as const,
        // Katılımcı öğretmen de olabildiği için hedef tipi rolden belirlenir.
        hedefTip:
          katilimciTipi(basvuru.katilimci.roller) === "OGRENCI"
            ? ("OGRENCI" as const)
            : ("OGRETMEN" as const),
        hedefId: basvuru.katilimci.id,
        detay: `Başvuru değerlendirme ekranı: ${faaliyet.ad}`,
      })),
    );
  }

  /*
   * YÜRÜTÜCÜ KAPISI: rapor, yoklama ve belge aynı soruyla açılıyor — "bu
   * etkinliğin hakkında beyanda bulunabilecek kişi mi". Üçü ayrı sorulsaydı
   * biri değiştiğinde öbürleri geride kalırdı (11 Ağustos'ta rapor kartının
   * başvuru kartının içinde kalması tam olarak bu yüzden sorun olmuştu).
   */
  const yurutucuMu = faaliyetRaporuYazabilirMi(kullanici, kapsamBilgisi);

  const yoklamaKapisi = yoklamaAlinabilirMi({
    bittiMi: (faaliyet.bitisTarihi ?? faaliyet.tarih) <= simdi,
    iptalMi: faaliyet.durum === "IPTAL_EDILDI",
  });

  const yoklamaListesi = yurutucuMu
    ? await prisma.basvuru.findMany({
        where: { faaliyetId: faaliyet.id, durum: "SECILDI" },
        orderBy: { basvuruTarihi: "asc" },
        select: {
          id: true,
          katildiMi: true,
          katilimci: {
            select: {
              ad: true,
              soyad: true,
              sinif: true,
              brans: true,
              kurum: { select: { ad: true } },
            },
          },
        },
      })
    : [];

  const yoklamaSayilari = yoklamaOzeti(yoklamaListesi);

  /*
   * Belge kapısı EKRANDA da sorulur ki kullanıcı kapalı bir yola tıklamasın;
   * asıl engel belge üreten yollarda (bkz. lib/belge/kapi.ts · belgeKapisi).
   */
  const belgeKapisiKarari = yurutucuMu
    ? belgeKapisi({ raporVarMi: await faaliyetRaporuVarMi(faaliyet.id) })
    : { olurMu: false, neden: null };

  /*
   * Vekaleten başvuru için aday öğrenciler: kapsam filtresinden geçen ve bu
   * faaliyete aktif başvurusu OLMAYAN öğrenciler. Aktif başvurusu olanı listede
   * bırakmak, kullanıcıyı zaten reddedilecek bir seçime davet etmek olurdu.
   */
  const vekaletAdaylari =
    vekaletenBasvurabilir && basvuruPenceresi(faaliyet, simdi) === "ACIK"
      ? await prisma.kullanici.findMany({
          where: {
            AND: [
              ogrenciKapsamFiltresi(kullanici),
              {
                basvurular: {
                  none: {
                    faaliyetId: faaliyet.id,
                    durum: { notIn: ["GERI_CEKILDI", "IPTAL_EDILDI"] },
                  },
                },
              },
            ],
          },
          select: { id: true, ad: true, soyad: true, sinif: true },
          orderBy: [{ ad: "asc" }, { soyad: "asc" }],
          // Uzun listeyi seçim kutusuna sığdırmak anlamsız; okul ölçeğinde
          // yeterli, il ölçeğinde kullanıcı öğrenci ekranından yönlendirilir.
          take: 200,
        })
      : [];

  const paydaslar = await prisma.faaliyetPaydas.findMany({
    where: { faaliyetId: faaliyet.id },
    orderBy: { eklemeTarihi: "asc" },
    select: {
      katkisi: true,
      paydas: {
        select: { id: true, ad: true, tur: true, il: { select: { ad: true } } },
      },
    },
  });

  // Paydaş seçenekleri de kapsam filtresinden geçer: kullanıcının göremediği
  // bir kurum listede çıkmaz.
  const paydasSecenekleri =
    faaliyetPaydasiYonetebilirMi(kullanici, kapsamBilgisi) && icerikEklenebilir
      ? await prisma.paydas.findMany({
          where: {
            AND: [
              paydasKapsamFiltresi(kullanici),
              { aktif: true },
              { faaliyetler: { none: { faaliyetId: faaliyet.id } } },
            ],
          },
          orderBy: { ad: "asc" },
          select: { id: true, ad: true, tur: true },
        })
      : [];

  return (
    <div className="space-y-6">
      {/*
        KIRINTI YOLU (18 Ağustos 2026 · tasarım yenilemesi). Yerinde eskiden
        tek başına "← Etkinlikler" bağlantısı vardı: geri dönüşü veriyordu ama
        bu ekranın listenin ALTINDA olduğunu söylemiyordu. Panelden gelen
        bildirim bağlantısıyla doğrudan buraya düşen kullanıcı, hangi listenin
        içinde durduğunu göremiyordu.
      */}
      <KirintiYolu
        basamaklar={[
          { etiket: "Etkinlikler", yol: "/panel/etkinlikler" },
          { etiket: faaliyet.ad },
        ]}
      />

      {/*
        ROZET ŞERİDİ BAŞLIĞIN İÇİNE GİRDİ. Eskiden başlığın üstünde ayrı bir
        flex kabındaydı ve başlıkla arasındaki boşluk, sayfanın geri kalanının
        boşluk ritmine (space-y-6) uyuyordu — yani rozetler başlığa değil,
        kendinden önceki bağlantıya ait gibi duruyordu. `SayfaBasligi` artık
        `rozet` alıyor ve aynı hizalamayı her sayfada tek yerden kuruyor.

        Rozetlerin SIRASI ve hangisinin basılacağı DEĞİŞMEDİ; iptal/onay/pencere
        çelişkisini önleyen kararlar rozetlerin kendi içinde duruyor
        (bkz. components/FaaliyetRozetleri.tsx).
      */}
      <SayfaBasligi
        baslik={faaliyet.ad}
        aciklama={faaliyet.duzenleyenBirim}
        rozet={
          <>
            <KategoriRozeti kategori={faaliyet.etkinlikKategorisi} />
            <KapsamRozeti kapsam={faaliyet.kapsam} />
            <FaaliyetDurumuRozeti durum={faaliyet.durum} />
            <OnayRozeti
              onayDurumu={faaliyet.onayDurumu}
              faaliyetDurumu={faaliyet.durum}
            />
            <PencereRozeti pencere={pencere} faaliyetDurumu={faaliyet.durum} />
            {kendiBasvurum && <BasvuruRozeti durum={kendiBasvurum.durum} />}
          </>
        }
      />

      {durum && DURUM_MESAJLARI[durum] && (
        <BilgiKutusu cesit="olumlu">{DURUM_MESAJLARI[durum]}</BilgiKutusu>
      )}
      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}

      {/* İptal edilen faaliyet listeden kaldırılmaz; ne olduğu burada yazar. */}
      {faaliyet.durum === "IPTAL_EDILDI" && (
        <div className="rounded-kart border border-hata-cizgi bg-hata-zemin px-4 py-3 text-sm text-hata-metin">
          <p className="font-semibold">Bu etkinlik iptal edildi.</p>
          <p className="mt-1">
            {faaliyet.iptalGerekcesi
              ? `Gerekçe: ${faaliyet.iptalGerekcesi}`
              : "Gerekçe belirtilmedi."}
            {faaliyet.iptalTarihi && ` · ${tarihYaz(faaliyet.iptalTarihi)}`}
          </p>
          <p className="mt-1">
            Yeni başvuru, yorum ve dosya alınmıyor. Mevcut yorum ve dosyalar
            geçmiş kaydı olarak görünmeye devam eder.
          </p>
        </div>
      )}

      <Kart>
        <KartBasligi baslik="Etkinlik bilgileri" Ikon={Info} />
        <MetinBaglantili
          metin={faaliyet.aciklama}
          className="mb-5 whitespace-pre-line text-metin"
        />
        <dl className="grid gap-5 sm:grid-cols-2">
          <Satir etiket="Etkinlik tarihi">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={15} aria-hidden />
              {/*
                Çok günlü faaliyette bitiş de yazılır; tek günlükte tek tarih
                kalır — "3 Mart — 3 Mart" gereksiz gürültüdür.
              */}
              {faaliyet.bitisTarihi
                ? `${tarihSaatYaz(faaliyet.tarih)} — ${tarihSaatYaz(faaliyet.bitisTarihi)}`
                : tarihSaatYaz(faaliyet.tarih)}
            </span>
          </Satir>
          {faaliyet.katilimBicimi && (
            <Satir etiket="Katılım biçimi">
              {KATILIM_BICIMI_ETIKETLERI[faaliyet.katilimBicimi]}
            </Satir>
          )}
          {faaliyet.hedefKitle && (
            <Satir etiket="Hedef kitle">{faaliyet.hedefKitle}</Satir>
          )}
          <Satir etiket="Süre">
            {faaliyetSuresiYaz(faaliyet.tarih, faaliyet.bitisTarihi)}
          </Satir>
          <Satir etiket="Yer">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={15} aria-hidden />
              {faaliyet.kurum?.ad ??
                (faaliyet.il
                  ? `${faaliyet.il.ad}${faaliyet.ilce ? ` / ${faaliyet.ilce.ad}` : ""}`
                  : "Ülke geneli")}
            </span>
          </Satir>
          <Satir etiket="Başvuru aralığı">
            {tarihYaz(faaliyet.basvuruBaslangic)} —{" "}
            {tarihYaz(faaliyet.basvuruBitis)}
          </Satir>
          <Satir etiket="Etkinlik kategorisi">
            {ETKINLIK_KATEGORISI_ETIKETLERI[faaliyet.etkinlikKategorisi]}
            {faaliyet.temelEtkinlikProgrami && (
              <span className="text-metin-yumusak">
                {" "}
                · {faaliyet.temelEtkinlikProgrami.ad}
              </span>
            )}
          </Satir>
          {/*
            Kontenjan aktif başvuruyu (bekleyen + seçilen + yedek) sınırlar,
            yalnızca seçilenleri değil; sayaç bu yüzden ikisini de gösterir.
          */}
          <Satir etiket="Kontenjan">
            <span className="inline-flex items-center gap-1.5">
              <Users size={15} aria-hidden />
              {kontenjan.aktifBasvuru}/{kontenjan.kontenjan} aktif başvuru
              {kontenjan.secilen > 0 && ` · ${kontenjan.secilen} seçildi`}
              {kontenjan.yedek > 0 && ` · ${kontenjan.yedek} yedek`}
            </span>
          </Satir>
          <Satir etiket="Düzenleyen">
            {faaliyet.duzenleyen.ad} {faaliyet.duzenleyen.soyad}
          </Satir>
          {faaliyet.onaylayan && (
            <Satir etiket="Onaylayan">
              {faaliyet.onaylayan.ad} {faaliyet.onaylayan.soyad}
              {faaliyet.onayTarihi && ` · ${tarihYaz(faaliyet.onayTarihi)}`}
            </Satir>
          )}
        </dl>

        {faaliyet.calismaGruplari.length > 0 && (
          <div className="mt-5">
            <p className="text-sm font-medium text-metin-yumusak">
              İlgili çalışma grupları
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {faaliyet.calismaGruplari.map((etiket) => (
                <span
                  key={etiket.calismaGrubu.id}
                  className="rounded-full bg-vurgu-zemin px-2.5 py-0.5 text-sm text-vurgu-metin"
                >
                  {etiket.calismaGrubu.ad}
                </span>
              ))}
            </div>
          </div>
        )}
      </Kart>

      {onayBekliyor && (
        <Kart>
          {/*
            Metin AÇANA GÖRE yazılıyor. Sabit "Ulusal etkinlik onayı · il
            koordinatörü tarafından açıldı" cümlesi yalnızca bir hâlde doğruydu:
            bu kutu öğrencinin ve danışman öğretmenin açtığı etkinliklerde de
            çıkıyor (bkz. faaliyetOnayGerekiyorMu) ve o zaman onaylayan kişiye
            olmayan bir gerçeği anlatıyordu.
          */}
          <KartBasligi
            baslik="Etkinlik onayı"
            aciklama={`${faaliyet.duzenleyen.ad} ${faaliyet.duzenleyen.soyad} tarafından açıldı; yayına girmek ve başvuru alabilmek için onayınızı bekliyor. Onaylanana kadar öğrencilere görünmez.`}
            Ikon={ClipboardCheck}
          />
          <div className="flex flex-wrap gap-3">
            <form action={faaliyetOnayEylemi}>
              <input type="hidden" name="faaliyetId" value={faaliyet.id} />
              <input type="hidden" name="karar" value="onayla" />
              <button type="submit" className={SINIF_BIRINCIL_BUTON}>
                <CheckCircle2 size={16} aria-hidden />
                Onayla ve yayına al
              </button>
            </form>
            <form action={faaliyetOnayEylemi}>
              <input type="hidden" name="faaliyetId" value={faaliyet.id} />
              <input type="hidden" name="karar" value="reddet" />
              <button type="submit" className={SINIF_IKINCIL_BUTON}>
                Reddet
              </button>
            </form>
          </div>
        </Kart>
      )}

      {bekleyenKaynakIlSayisi > 0 && (
        <Kart>
          {/*
            METİN ROLE GÖRE. Koordinatör için bu "kendi ilimden çıkan
            başvurular", proje yöneticisi için "hangi il olursa olsun" demektir;
            merkeze "ilinizden" demek, karar kendisine düştüğü hâlde başkasını
            beklemesi gerektiğini düşündürürdü.
          */}
          <KartBasligi
            baslik="Kaynak il kararı bekleyen başvurular"
            aciklama={
              projeYoneticisiMi(kullanici)
                ? `Bu etkinliğe başka illerden ${bekleyenKaynakIlSayisi} başvuru yapıldı ve öğrencinin kendi ilinin onayı bekleniyor. Bu karar verilmeden başvurular değerlendirilemez; ilde koordinatör yoksa kararı siz verirsiniz. Aşağıdaki başvuru satırlarından tek tek karara bağlayabilirsiniz.`
                : `Bu etkinliğe ilinizden ${bekleyenKaynakIlSayisi} başvuru yapıldı. Öğrenciyi başka bir ile göndermeye önce siz onay verirsiniz; siz karar verene kadar etkinliğin ili bu başvuruları değerlendiremez.`
            }
            Ikon={ArrowRightLeft}
          />
          {/*
            Bağlantı artık Etkinlikler ekranının il dışı bölümüne gidiyor
            (11 Ağustos 2026): `/panel/il-disi-basvurular` kalktı, liste oraya
            taşındı. Çapa `#il-disi` — kullanıcı listenin başına değil doğrudan
            bölüme düşsün.
          */}
          <Link
            href="/panel/etkinlikler#il-disi"
            className={SINIF_BIRINCIL_BUTON}
          >
            <ArrowRightLeft size={16} aria-hidden />
            Tüm il dışı başvuruları gör
          </Link>
        </Kart>
      )}

      {/*
        Düzenleme ve iptal yetkisi ek yükleme yetkisiyle aynı kapıdan geçer:
        etkinliği açan kullanıcı, düzenleyen görevden ayrıldıysa ilin
        koordinatörü, ve her durumda proje yöneticisi.
      */}
      {ekYonetebilir && faaliyet.durum === "AKTIF" && (
        <Kart>
          <KartBasligi
            baslik="Etkinliği düzenle"
            aciklama="Tarih ve kontenjan değiştirilebilir. Kontenjan, seçilmiş öğrenci sayısının altına düşürülemez."
            Ikon={PencilLine}
          />

          <form action={faaliyetDuzenleEylemi} className="space-y-4">
            <input type="hidden" name="faaliyetId" value={faaliyet.id} />
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="text-sm font-medium text-metin">
                  Etkinlik tarihi
                </span>
                <input
                  type="datetime-local"
                  name="tarih"
                  required
                  defaultValue={girdiTarihSaati(faaliyet.tarih)}
                  className={SINIF_GIRDI}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-metin">
                  Etkinlik bitişi
                </span>
                <input
                  type="datetime-local"
                  name="bitisTarihi"
                  defaultValue={
                    faaliyet.bitisTarihi
                      ? girdiTarihSaati(faaliyet.bitisTarihi)
                      : ""
                  }
                  className={SINIF_GIRDI}
                />
                <span className="mt-1 block text-sm text-metin-yumusak">
                  Tek günlükse boş bırakın.
                </span>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-metin">
                  Başvuru başlangıcı
                </span>
                <input
                  type="date"
                  name="basvuruBaslangic"
                  required
                  defaultValue={girdiTarihi(faaliyet.basvuruBaslangic)}
                  className={SINIF_GIRDI}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-metin">
                  Başvuru bitişi
                </span>
                <input
                  type="date"
                  name="basvuruBitis"
                  required
                  defaultValue={girdiTarihi(faaliyet.basvuruBitis)}
                  className={SINIF_GIRDI}
                />
              </label>
            </div>

            <label className="block sm:max-w-xs">
              <span className="text-sm font-medium text-metin">Kontenjan</span>
              <input
                type="number"
                name="kontenjan"
                required
                min={kontenjanAltSiniri(kontenjan)}
                defaultValue={faaliyet.kontenjan}
                className={SINIF_GIRDI}
              />
              <span className="mt-1 block text-sm text-metin-yumusak">
                En az {kontenjanAltSiniri(kontenjan)} olabilir
                {kontenjan.secilen > 0 &&
                  ` (${kontenjan.secilen} öğrenci seçildi)`}
                . Kontenjanı artırmak yeni başvuruların önünü açar.
              </span>
            </label>

            {faaliyet.onayDurumu === "ONAYLANDI" && (
              <BilgiKutusu cesit="uyari">
                Bu onaylanmış bir ulusal etkinlik. Tarihleri değiştirirseniz
                etkinlik yeniden proje yöneticisi onayına düşer ve onaylanana
                kadar öğrencilere görünmez. Kontenjan artışı onayı düşürmez.
              </BilgiKutusu>
            )}

            <button type="submit" className={SINIF_BIRINCIL_BUTON}>
              Değişiklikleri kaydet
            </button>
          </form>

          {/*
            İptal, düzenlemeden dar bir yetkidir: görevden ayrılan düzenleyenin
            yerine bakan koordinatör etkinliği sürdürebilir ama kapatamaz.
          */}
          {iptalEdebilir && (
          <div className="mt-6 border-t border-cizgi pt-5">
            <h3 className="text-sm font-semibold text-baslik">
              Etkinliği iptal et
            </h3>
            <p className="mt-1 text-sm text-metin-yumusak">
              Etkinlik silinmez; listelerde &quot;İptal edildi&quot; etiketiyle
              kalır. Bekleyen, seçilen ve yedek başvuruların tamamı kapatılır ve
              öğrencilere bildirim gider. Bu işlem geri alınamaz.
            </p>
            <form action={faaliyetIptalEylemi} className="mt-3 space-y-3">
              <input type="hidden" name="faaliyetId" value={faaliyet.id} />
              <label className="block">
                <span className="text-sm font-medium text-metin">
                  İptal gerekçesi{" "}
                  <span className="text-metin-yumusak">(isteğe bağlı)</span>
                </span>
                <textarea
                  name="iptalGerekcesi"
                  rows={2}
                  maxLength={1000}
                  className={SINIF_GIRDI}
                />
              </label>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-md border border-hata-cizgi bg-hata-zemin px-4 py-2 text-sm font-semibold text-hata-metin transition hover:opacity-90"
              >
                <Ban size={16} aria-hidden />
                Etkinliği iptal et
              </button>
            </form>
          </div>
          )}
        </Kart>
      )}

      {kendiAdinaBasvurabilir && (
        <Kart>
          <KartBasligi baslik="Başvurum" Ikon={Send} />

          {kendiBasvurum && kendiBasvurum.durum !== "GERI_CEKILDI" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <BasvuruRozeti durum={kendiBasvurum.durum} />
                <span className="text-sm text-metin-yumusak">
                  {tarihYaz(kendiBasvurum.basvuruTarihi)} tarihinde
                  {kendiBasvurum.adinaBasvuran
                    ? ` ${kendiBasvurum.adinaBasvuran.ad} ${kendiBasvurum.adinaBasvuran.soyad} sizin adınıza başvurdu`
                    : " başvurdunuz"}
                </span>
              </div>
              {kendiBasvurum.adinaBasvuran && (
                <BilgiKutusu>
                  Bu başvuruyu öğretmeniniz sizin adınıza yaptı. Katılmak
                  istemiyorsanız aşağıdan geri çekebilirsiniz.
                </BilgiKutusu>
              )}
              <div>
                <p className="text-sm font-medium text-metin-yumusak">
                  Gerekçeniz
                </p>
                <p className="mt-1 whitespace-pre-line text-metin">
                  {kendiBasvurum.gerekce}
                </p>
              </div>
              {/*
                Geri çekme YALNIZCA "beklemede"ye bağlı DEĞİL: kontenjanı
                bekleyen, seçilen ve yedek başvuruların üçü birden doldurur
                (kurallar.ts · AKTIF_BASVURU_DURUMLARI), dolayısıyla yeri asıl
                açan hareket seçilmiş bir öğrencinin vazgeçmesidir. Düğme
                yalnızca beklemede görünseydi, katılamayacağını bilen öğrenci
                kontenjanı sonuna kadar tutmaya devam eder ve yedekteki kimse
                çağrılamazdı.
              */}
              {AKTIF_BASVURU_DURUMLARI.includes(kendiBasvurum.durum) && (
                <form action={basvuruGeriCekEylemi}>
                  <input
                    type="hidden"
                    name="basvuruId"
                    value={kendiBasvurum.id}
                  />
                  <button type="submit" className={SINIF_IKINCIL_BUTON}>
                    Başvurumu geri çek
                  </button>
                  <p className="mt-2 text-sm text-metin-yumusak">
                    {kendiBasvurum.durum === "SECILDI"
                      ? "Geri çekerseniz kontenjandaki yeriniz boşalır ve yedekteki bir katılımcı çağrılabilir. Yeniden başvurmak için başvuru süresinin açık olması gerekir."
                      : "Geri çektiğinizde tuttuğunuz kontenjan yeri anında boşalır. Yeniden başvurmak için başvuru süresinin açık olması gerekir."}
                  </p>
                </form>
              )}
            </div>
          ) : basvuruKarari.olurMu ? (
            <form action={basvuruYapEylemi} className="space-y-4">
              <input type="hidden" name="faaliyetId" value={faaliyet.id} />
              <label className="block">
                <span className="text-sm font-medium text-metin">
                  Bu etkinliğe neden başvuruyorum / bu alandaki ilgim
                </span>
                <textarea
                  name="gerekce"
                  required
                  rows={4}
                  className={SINIF_GIRDI}
                  defaultValue={
                    kendiBasvurum?.durum === "GERI_CEKILDI"
                      ? kendiBasvurum.gerekce
                      : ""
                  }
                />
              </label>
              {kontenjan.doluMu && (
                <BilgiKutusu cesit="uyari">
                  Kontenjan dolu. Başvurunuz yedek listesi için
                  değerlendirilecektir.
                </BilgiKutusu>
              )}
              <button type="submit" className={SINIF_BIRINCIL_BUTON}>
                <Send size={16} aria-hidden />
                Başvur
              </button>
            </form>
          ) : (
            <p className="text-metin-yumusak">
              {basvuruKarari.neden ?? "Bu etkinliğe başvuramazsınız."}
            </p>
          )}
        </Kart>
      )}

      {vekaletenBasvurabilir && (
        <Kart>
          <KartBasligi
            baslik="Öğrenci adına başvuru"
            aciklama="Danışmanlığınızdaki / ilinizdeki bir öğrenci adına başvuru yapabilirsiniz. Öğrenciye bildirim gider ve dilerse başvurusunu kendisi geri çeker."
            Ikon={UserPlus}
          />

          {faaliyet.durum === "IPTAL_EDILDI" ? (
            <p className="text-sm text-metin-yumusak">
              İptal edilmiş etkinliğe başvuru alınmıyor.
            </p>
          ) : basvuruPenceresi(faaliyet, simdi) !== "ACIK" ? (
            <p className="text-sm text-metin-yumusak">
              Başvuru penceresi kapalı.
            </p>
          ) : vekaletAdaylari.length === 0 ? (
            <p className="text-sm text-metin-yumusak">
              Kapsamınızda bu etkinliğe başvurmamış öğrenci kalmadı.
            </p>
          ) : (
            <form action={basvuruYapEylemi} className="space-y-4">
              <input type="hidden" name="faaliyetId" value={faaliyet.id} />

              <label className="block">
                <span className="text-sm font-medium text-metin">Öğrenci</span>
                <select name="katilimciId" required className={SINIF_GIRDI}>
                  {vekaletAdaylari.map((ogrenci) => (
                    <option key={ogrenci.id} value={ogrenci.id}>
                      {ogrenci.ad} {ogrenci.soyad}
                      {ogrenci.sinif ? ` · ${ogrenci.sinif}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-metin">
                  Öğrencinin bu alandaki ilgisi / başvuru gerekçesi
                </span>
                <textarea
                  name="gerekce"
                  required
                  rows={3}
                  className={SINIF_GIRDI}
                />
              </label>

              {kontenjan.doluMu && (
                <BilgiKutusu cesit="uyari">
                  Kontenjan dolu; yeni başvuru alınamıyor.
                </BilgiKutusu>
              )}

              <button type="submit" className={SINIF_IKINCIL_BUTON}>
                <UserPlus size={16} aria-hidden />
                Öğrenci adına başvur
              </button>
            </form>
          )}
        </Kart>
      )}

      <Kart>
        <KartBasligi
          baslik="Paydaş bilgisi"
          aciklama={
            paydasSecenekleri.length > 0 || paydaslar.length > 0
              ? "Etkinlikte iş birliği yapılan kurum ve kuruluşlar."
              : "Etkinlikte iş birliği yapılan kurum ve kuruluşlar. Kayıtlar il paydaş envanterinden gelir."
          }
          Ikon={Handshake}
        />

        {paydaslar.length === 0 ? (
          <p className="text-sm text-metin-yumusak">
            Bu etkinliğe bağlı paydaş yok.
          </p>
        ) : (
          <ul className="divide-y divide-cizgi">
            {paydaslar.map((bag) => (
              <li
                key={bag.paydas.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2.5"
              >
                <div>
                  <Link
                    href={`/panel/paydaslar/${bag.paydas.id}`}
                    className="font-medium text-metin transition hover:text-vurgu-metin hover:underline"
                  >
                    {bag.paydas.ad}
                  </Link>
                  <p className="text-sm text-metin-yumusak">
                    {PAYDAS_TURU_ETIKETLERI[bag.paydas.tur]} ·{" "}
                    {bag.paydas.il.ad}
                    {bag.katkisi ? ` · ${bag.katkisi}` : ""}
                  </p>
                </div>
                {faaliyetPaydasiYonetebilirMi(kullanici, kapsamBilgisi) && (
                  <form action={faaliyetPaydasCikarEylemi}>
                    <input type="hidden" name="faaliyetId" value={faaliyet.id} />
                    <input type="hidden" name="paydasId" value={bag.paydas.id} />
                    <button
                      type="submit"
                      className="text-sm text-metin-yumusak underline underline-offset-2 transition hover:text-metin"
                    >
                      Bağlantıyı kaldır
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        {paydasSecenekleri.length > 0 && (
          <form
            action={faaliyetPaydasEkleEylemi}
            className="mt-5 flex flex-wrap items-end gap-3 border-t border-cizgi pt-5"
          >
            <input type="hidden" name="faaliyetId" value={faaliyet.id} />
            <label className="block grow">
              <span className="text-sm font-medium text-metin">Paydaş</span>
              <select name="paydasId" required className={SINIF_GIRDI}>
                {paydasSecenekleri.map((paydas) => (
                  <option key={paydas.id} value={paydas.id}>
                    {paydas.ad} · {PAYDAS_TURU_ETIKETLERI[paydas.tur]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block grow">
              <span className="text-sm font-medium text-metin">
                Katkısı (isteğe bağlı)
              </span>
              <input
                type="text"
                name="katkisi"
                maxLength={250}
                placeholder="mekân · eğitmen · ödül desteği"
                className={SINIF_GIRDI}
              />
            </label>
            <button type="submit" className={SINIF_IKINCIL_BUTON}>
              <Plus size={16} aria-hidden />
              Ekle
            </button>
          </form>
        )}

        {/*
          PAYDAŞ SEKMESİ DANIŞMAN ÖĞRETMENDEN KALKTI (J4 · 5 Ağustos 2026);
          etkinliğe paydaş bağlamak artık yalnızca burada yapılıyor. Envanter
          KALDIRILMADI, il koordinatöründe kaldı: kurum kaydını etkinlik
          formundan açtırmak aynı kurumun onlarca kez farklı yazımla girilmesine
          ("Ankara Üniv.", "Ankara Üniversitesi", "A.Ü.") ve il bazlı paydaş
          raporunun anlamsızlaşmasına yol açardı.

          Bu yüzden listede olmayan kurum için ne yapılacağı EKRANDA yazıyor:
          aksi hâlde öğretmen çıkmaz sokakta kalır ve kaydı uydurmaya çalışır.
        */}
        {faaliyetPaydasiYonetebilirMi(kullanici, kapsamBilgisi) &&
          !paydasEkleyebilirMi(kullanici) && (
            <p className="mt-4 border-t border-cizgi pt-4 text-sm text-metin-yumusak">
              Aradığınız kurum listede yoksa il koordinatörünüzden paydaş
              envanterine eklemesini isteyin. Kurum kayıtları tek elden
              yürütülüyor; aynı kurumun farklı yazımlarla birden çok kez
              girilmesi il raporlarını bozuyor.
            </p>
          )}
      </Kart>

      <Kart>
        {/*
          ÇAPA: rapor ekranı buraya iniyor (bkz. rapor/page.tsx · "etkinliğin ek
          listesine"). Rapor yazarken fotoğraf eklemek formun içinde yapılıyor;
          görsel silmek, kapak seçmek ve PDF eklemek için buraya geliniyor.
          Çapa olmadan bağlantı sayfanın en tepesine düşüyor ve kullanıcı ek
          kartını uzun bir detay ekranında elle arıyordu. Kalıp `yorumlar`
          çapasıyla aynı: boş bir div, KartBasligi'nden önce.
        */}
        <div id="ekler" className="scroll-mt-6" />
        <KartBasligi
          baslik="Görseller ve belgeler"
          aciklama={
            ekYonetebilir
              ? "Görsel (jpg, png, webp) ve belge (pdf) ekleyebilirsiniz. Görsellerden birini tanıtıcı görsel yapabilirsiniz."
              : "Etkinliğe eklenen görsel ve belgeler."
          }
          Ikon={Paperclip}
        />

        {gorseller.length === 0 && belgeler.length === 0 && (
          <p className="text-metin-yumusak">Henüz görsel veya belge yok.</p>
        )}

        {gorseller.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {gorseller.map((ek) => {
              const kapakMi = ek.id === faaliyet.kapakEkId;
              return (
                <li
                  key={ek.id}
                  className={`overflow-hidden rounded-kart border ${
                    kapakMi ? "border-vurgu" : "border-cizgi"
                  }`}
                >
                  <a
                    href={uygulamaYolu(
                      `/panel/etkinlikler/${faaliyet.id}/ekler/${ek.id}`,
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={uygulamaYolu(
                        `/panel/etkinlikler/${faaliyet.id}/ekler/${ek.id}`,
                      )}
                      alt={ek.dosyaAdi}
                      className="block max-h-64 w-full bg-zemin object-contain"
                    />
                  </a>
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <span className="text-sm text-metin-yumusak">
                      {kapakMi && (
                        <span className="mr-2 rounded-full bg-vurgu-zemin px-2 py-0.5 text-xs font-medium text-vurgu-metin">
                          Tanıtıcı görsel
                        </span>
                      )}
                      {ek.dosyaAdi} · {boyutYaz(ek.boyutBayt)}
                    </span>
                    {ekYonetebilir && (
                      <span className="flex gap-2">
                        {!kapakMi && (
                          <form action={kapakSecEylemi}>
                            <input
                              type="hidden"
                              name="faaliyetId"
                              value={faaliyet.id}
                            />
                            <input type="hidden" name="ekId" value={ek.id} />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1 rounded-md border border-cizgi px-2.5 py-1 text-xs font-medium text-metin-yumusak transition hover:bg-zemin"
                            >
                              <Star size={13} aria-hidden />
                              Tanıtıcı yap
                            </button>
                          </form>
                        )}
                        <form action={ekSilEylemi}>
                          <input
                            type="hidden"
                            name="faaliyetId"
                            value={faaliyet.id}
                          />
                          <input type="hidden" name="ekId" value={ek.id} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 rounded-md border border-cizgi px-2.5 py-1 text-xs font-medium text-metin-yumusak transition hover:bg-zemin"
                          >
                            <Trash2 size={13} aria-hidden />
                            Sil
                          </button>
                        </form>
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {belgeler.length > 0 && (
          <ul className={`space-y-2 ${gorseller.length > 0 ? "mt-4" : ""}`}>
            {belgeler.map((ek) => (
              <li
                key={ek.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-kart border border-cizgi px-4 py-3"
              >
                <a
                  href={uygulamaYolu(
                    `/panel/etkinlikler/${faaliyet.id}/ekler/${ek.id}`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 font-medium text-vurgu-metin"
                >
                  <FileText size={16} aria-hidden />
                  {ek.dosyaAdi}
                  <span className="text-sm font-normal text-metin-yumusak">
                    {boyutYaz(ek.boyutBayt)}
                  </span>
                </a>
                {ekYonetebilir && (
                  <form action={ekSilEylemi}>
                    <input type="hidden" name="faaliyetId" value={faaliyet.id} />
                    <input type="hidden" name="ekId" value={ek.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 rounded-md border border-cizgi px-2.5 py-1 text-xs font-medium text-metin-yumusak transition hover:bg-zemin"
                    >
                      <Trash2 size={13} aria-hidden />
                      Sil
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        {ekYonetebilir && icerikEklenebilir && (
          <form
            action={ekYukleEylemi}
            className="mt-4 flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="faaliyetId" value={faaliyet.id} />
            <label className="block flex-1">
              <span className="text-sm font-medium text-metin">Dosya seç</span>
              <input
                type="file"
                name="dosya"
                required
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className={`${SINIF_GIRDI} file:mr-3 file:rounded-md file:border-0 file:bg-zemin file:px-3 file:py-1 file:text-sm file:text-metin`}
              />
            </label>
            <button type="submit" className={SINIF_BIRINCIL_BUTON}>
              <Upload size={16} aria-hidden />
              Yükle
            </button>
          </form>
        )}
      </Kart>

      <Kart>
        <div id="yorumlar" />
        <KartBasligi
          baslik="Yorumlar"
          aciklama={`${yorumlar.filter((yorum) => !yorum.silindiMi).length} yorum · ${
            icerikEklenebilir
              ? "etkinliği görebilen herkes yazabilir"
              : "etkinlik iptal edildiği için yeni yorum alınmıyor"
          }`}
          Ikon={MessageSquare}
        />

        {kokYorumlar.length === 0 ? (
          <p className="text-metin-yumusak">Henüz yorum yok.</p>
        ) : (
          <ul className="space-y-4">
            {kokYorumlar.map((yorum) => (
              <li key={yorum.id}>
                <YorumSatiri
                  yorum={yorum}
                  faaliyetId={faaliyet.id}
                  silebilirMi={yorumSilebilirMi(kullanici, yorum, kapsamBilgisi)}
                  yanitYazabilirMi={yorumYazabilir}
                />
                {(yanitlar.get(yorum.id) ?? []).length > 0 && (
                  <ul className="mt-3 space-y-3 border-l-2 border-cizgi pl-4">
                    {(yanitlar.get(yorum.id) ?? []).map((yanit) => (
                      <li key={yanit.id}>
                        <YorumSatiri
                          yorum={yanit}
                          faaliyetId={faaliyet.id}
                          silebilirMi={yorumSilebilirMi(
                            kullanici,
                            yanit,
                            kapsamBilgisi,
                          )}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}

        {yorumYazabilir && (
          <form action={yorumYazEylemi} className="mt-5 space-y-3">
            <input type="hidden" name="faaliyetId" value={faaliyet.id} />
            <label className="block">
              <span className="text-sm font-medium text-metin">
                Yorum yazın
              </span>
              <textarea
                name="icerik"
                required
                rows={3}
                maxLength={2000}
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

      {/*
        RAPOR VE BELGE KARTI KENDİ BAŞINA DURUYOR (11 Ağustos 2026 · istek:
        "etkinlik raporunu il koordinatörü de doldurabilsin, şu an sadece o ilin
        öğretmeni dolduruyor").

        YETKİ ZATEN VARDI, GİRİŞ YOKTU: `faaliyetRaporuYazabilirMi` ilin
        koordinatörüne baştan beri evet diyor ve rapor ekranı ile kaydetme
        eylemi onu kabul ediyordu. Ama bu iki düğme "Başvurular" kartının
        İÇİNDEYDİ ve o kart `basvuruDegerlendirebilirMi` ile açılıyor — yani
        yalnızca etkinliği AÇANA. Etkinliği açmamış koordinatör raporu ancak
        adresini elle yazarak doldurabiliyordu.

        Kart artık başvuru kartından bağımsız ve kendi yetkisini soruyor.
      */}
      {yurutucuMu && (
        <Kart>
          <KartBasligi
            baslik="Rapor ve belgeler"
            aciklama="Sıra: yoklama → etkinlik raporu → belgeler. Belge, kişinin GençTek Yolculuğu'na katılım düşürdüğü için son adımdır."
            Ikon={FileText}
          />
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/panel/etkinlikler/${faaliyet.id}/rapor`}
              className={SINIF_IKINCIL_BUTON}
            >
              <FileText size={16} aria-hidden />
              Etkinlik raporu
            </Link>
            {/*
              BELGE DÜĞMESİ RAPORA BAĞLI (12 Ağustos 2026 · istek: "etkinlik
              raporu yazılmadan belge oluştur seçeneği olmamalı"). Kapı yalnızca
              burada değil belge üreten yolların hepsinde soruluyor
              (bkz. lib/belge/kapi.ts) — kapalı düğme bir güvenlik önlemi değil,
              yalnızca kullanıcıyı boşuna tıklatmama nezaketi.
            */}
            {belgeKapisiKarari.olurMu ? (
              <Link
                href={`/panel/etkinlikler/${faaliyet.id}/belgeler`}
                className={SINIF_IKINCIL_BUTON}
              >
                <Award size={16} aria-hidden />
                Katılım / teşekkür belgesi
              </Link>
            ) : (
              <span
                className={`${SINIF_IKINCIL_BUTON} cursor-not-allowed opacity-50`}
                aria-disabled
                title={belgeKapisiKarari.neden ?? undefined}
              >
                <Award size={16} aria-hidden />
                Katılım / teşekkür belgesi
              </span>
            )}
          </div>
          {!belgeKapisiKarari.olurMu && (
            <p className="mt-3 text-sm text-metin-yumusak">
              {belgeKapisiKarari.neden}
            </p>
          )}
        </Kart>
      )}

      {/*
        YOKLAMA (12 Ağustos 2026 · istek: "öğrenci etkinliğe gelmedi ama GençTek
        Yolculuğum'da katıldı görünüyor, bunun kontrolünü nasıl sağlarız").

        Seçilmiş olmak "katılabilir" demekti, ekranlar ise onu "katıldı" diye
        okuyordu. Yoklama bu ikisinin arasına etkinliği yürüten kişinin beyanını
        koyuyor: katılım geçmişi ve belge üretimi artık buradan besleniyor.

        KART YALNIZCA BİTMİŞ ETKİNLİKTE: yapılmamış bir etkinliğin yoklaması
        alınamaz ve düğmeyi erken göstermek, öğretmeni etkinlikten önce karar
        vermeye davet ederdi.
      */}
      {yurutucuMu && yoklamaKapisi.olurMu && (
        <Kart>
          <KartBasligi
            baslik="Yoklama"
            aciklama={
              yoklamaListesi.length === 0
                ? "Bu etkinliğe seçilmiş katılımcı yok."
                : `${yoklamaSayilari.gelen} geldi · ${yoklamaSayilari.gelmeyen} gelmedi · ${yoklamaSayilari.isaretlenmeyen} işaretlenmedi`
            }
            Ikon={UserCheck}
          />

          {yoklamaListesi.length === 0 ? (
            <p className="text-metin-yumusak">
              Yoklama, seçilmiş katılımcılar üzerinden alınır. Listede olmayan
              konuşmacı ve destek verenler için belge, yoklamadan bağımsız
              üretilir.
            </p>
          ) : (
            <form action={yoklamaKaydetEylemi} className="space-y-4">
              <input type="hidden" name="faaliyetId" value={faaliyet.id} />

              <ul className="divide-y divide-cizgi">
                {yoklamaListesi.map((satir) => (
                  <li
                    key={satir.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-metin">
                        {satir.katilimci.ad} {satir.katilimci.soyad}
                      </p>
                      <p className="text-sm text-metin-yumusak">
                        {[
                          satir.katilimci.sinif ?? satir.katilimci.brans,
                          satir.katilimci.kurum?.ad,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                    {/*
                      ÜÇ SEÇENEK, İKİ DEĞİL: "işaretlenmedi" geçerli bir cevap
                      ve varsayılan o. İki seçenek olsaydı formu açan herkes
                      farkında olmadan bir beyanda bulunmuş olurdu.
                    */}
                    <div className="flex shrink-0 flex-wrap gap-3 text-sm">
                      {(
                        [
                          ["evet", "Geldi"],
                          ["hayir", "Gelmedi"],
                          ["", "İşaretlenmedi"],
                        ] as const
                      ).map(([deger, etiket]) => (
                        <label
                          key={etiket}
                          className="flex items-center gap-1.5 text-metin"
                        >
                          <input
                            type="radio"
                            name={`yoklama-${satir.id}`}
                            value={deger}
                            defaultChecked={
                              satir.katildiMi === true
                                ? deger === "evet"
                                : satir.katildiMi === false
                                  ? deger === "hayir"
                                  : deger === ""
                            }
                            className="h-4 w-4 border-cizgi accent-[var(--renk-birincil)]"
                          />
                          {etiket}
                        </label>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" className={SINIF_BIRINCIL_BUTON}>
                  <UserCheck size={16} aria-hidden />
                  Yoklamayı kaydet
                </button>
                <p className="text-sm text-metin-yumusak">
                  Yalnızca &quot;geldi&quot; işaretlenenlerin GençTek
                  Yolculuğu&apos;na bu etkinlik düşer ve belge yalnızca onlara
                  üretilebilir.
                </p>
              </div>
            </form>
          )}
        </Kart>
      )}

      {degerlendirebilir && (
        <Kart>
          <KartBasligi
            baslik="Başvurular"
            aciklama={`${basvuranlar.length} başvuru · kontenjan ${kontenjan.secilen}/${kontenjan.kontenjan}${
              kontenjan.doluMu ? " (dolu)" : ""
            }`}
            Ikon={ClipboardList}
          />

          {/*
            İndirme bağlantısı yalnızca başvuru VARKEN gösteriliyor: boş bir
            listeyi indirmeye davet etmenin anlamı yok. Dosya bu kartın
            aynısıdır; telefon ve e-posta orada da yoktur.
          */}
          {basvuranlar.length > 0 && (
            <div className="mb-4">
              <DisaAktarmaBagi
                yol={`/panel/etkinlikler/${faaliyet.id}/basvurular/disa-aktar`}
                kayitSayisi={basvuranlar.length}
                etiket="Başvuru listesini Excel indir"
              />
            </div>
          )}

          {devroldu && (
            <div className="mb-4">
              <BilgiKutusu cesit="uyari">
                Bu etkinliği açan kullanıcı görevden ayrıldığı için değerlendirme
                ve moderasyon yetkisi il koordinatörlüğüne geçti.
              </BilgiKutusu>
            </div>
          )}

          {basvuranlar.length === 0 ? (
            <p className="text-metin-yumusak">Henüz başvuru yok.</p>
          ) : (
            <ul className="space-y-3">
              {basvuranlar.map((basvuru) => (
                <li
                  key={basvuru.id}
                  className="rounded-kart border border-cizgi p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-metin">
                        {basvuru.katilimci.ad} {basvuru.katilimci.soyad}
                      </p>
                      <p className="text-sm text-metin-yumusak">
                        {[
                          // Katılımcı öğretmen olabildiği için sınıf yerine
                          // branş gösterilir; ikisi aynı anda dolu olmaz.
                          KATILIMCI_TIPI_ETIKETLERI[
                            katilimciTipi(basvuru.katilimci.roller)
                          ],
                          basvuru.katilimci.sinif ?? basvuru.katilimci.brans,
                          basvuru.katilimci.kurum?.ad,
                          basvuru.katilimci.il?.ad,
                          // Liste başvuru sırasına göre dizili; tarih yazmadan
                          // "önce başvurana öncelik" kararı verilemiyordu.
                          `${tarihYaz(basvuru.basvuruTarihi)} tarihinde başvurdu`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {basvuru.adinaBasvuran && (
                        <p className="text-sm text-metin-yumusak">
                          Başvuruyu {basvuru.adinaBasvuran.ad}{" "}
                          {basvuru.adinaBasvuran.soyad} öğrenci adına yaptı.
                        </p>
                      )}
                    </div>
                    <BasvuruRozeti durum={basvuru.durum} />
                  </div>

                  {basvuru.katilimci.calismaGruplari.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {basvuru.katilimci.calismaGruplari.map((secim) => (
                        <span
                          key={secim.calismaGrubu.ad}
                          className="rounded-full bg-vurgu-zemin px-2 py-0.5 text-xs text-vurgu-metin"
                        >
                          {secim.calismaGrubu.ad}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="mt-3 whitespace-pre-line text-sm text-metin">
                    {basvuru.gerekce}
                  </p>

                  {/*
                    KAYNAK İL SIRASI. Öğrencinin kendi ili karar vermeden bu
                    başvuru değerlendirilemez (bkz. degerlendirmeyeHazirMi);
                    düğmeleri açık bırakmak kullanıcıyı sunucudan dönen bir
                    hataya sürüyordu. Satır artık üç hâli de kendisi anlatıyor.
                  */}
                  {basvuru.kaynakIlOnayDurumu === "REDDEDILDI" && (
                    <p className="mt-3 rounded-md bg-hata-zemin px-3 py-2 text-sm text-hata-metin">
                      Öğrencinin kendi ilinin koordinatörü bu başvuruyu
                      reddetti; değerlendirilemez.
                      {basvuru.kaynakIlRetGerekcesi && (
                        <span className="block">
                          Gerekçe: {basvuru.kaynakIlRetGerekcesi}
                        </span>
                      )}
                    </p>
                  )}

                  {basvuru.kaynakIlOnayDurumu === "BEKLIYOR" &&
                    (kaynakIlKarariVerebildikleri.has(basvuru.id) ? (
                      /*
                       * KARARI VERECEK KİŞİ BURADA. Aynı sunucu eylemi
                       * kullanılıyor (kaynakIlKarariEylemi): ret gerekçesinin
                       * zorunluluğu gibi kurallar tek yerde duruyor, ekran
                       * yalnızca formu gösteriyor. Kuralı buraya kopyalasaydık
                       * iki ekran er geç ayrışırdı.
                       *
                       * Merkez için asıl kazanç, ilinde koordinatör olmayan
                       * öğrencinin başvurusunun burada çözülebilmesi: eskiden o
                       * başvuru sonsuza kadar sırada kalıyordu.
                       */
                      <form
                        action={kaynakIlKarariEylemi}
                        className="mt-3 rounded-md border border-cizgi bg-zemin p-3"
                      >
                        <input
                          type="hidden"
                          name="basvuruId"
                          value={basvuru.id}
                        />
                        <input
                          type="hidden"
                          name="donusYolu"
                          value={`/panel/etkinlikler/${faaliyet.id}`}
                        />
                        <p className="text-sm text-metin">
                          Bu başvuru il dışından geliyor ve önce{" "}
                          <strong>kaynak il kararını</strong> bekliyor. Karar
                          verilmeden seçim yapılamaz.
                        </p>
                        <div className="mt-2 flex flex-wrap items-end gap-3">
                          <label className="block grow">
                            <span className="text-sm font-medium text-metin">
                              Gerekçe{" "}
                              <span className="text-metin-yumusak">
                                (redde zorunlu)
                              </span>
                            </span>
                            <input
                              type="text"
                              name="gerekce"
                              maxLength={500}
                              className={SINIF_GIRDI}
                            />
                          </label>
                          <button
                            type="submit"
                            name="karar"
                            value="onayla"
                            className="inline-flex items-center gap-1.5 rounded-md bg-olumlu-zemin px-3 py-2 text-sm font-medium text-olumlu-metin transition hover:opacity-90"
                          >
                            Kaynak il onayı ver
                          </button>
                          <button
                            type="submit"
                            name="karar"
                            value="reddet"
                            className="inline-flex items-center gap-1.5 rounded-md bg-hata-zemin px-3 py-2 text-sm font-medium text-hata-metin transition hover:opacity-90"
                          >
                            Reddet
                          </button>
                        </div>
                      </form>
                    ) : (
                      <p className="mt-3 rounded-md bg-uyari-zemin px-3 py-2 text-sm text-uyari-metin">
                        Bu başvuru, öğrencinin kendi ilinin koordinatörünün
                        onayını bekliyor. Onay verilene kadar
                        değerlendirilemez.
                      </p>
                    ))}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["SECILDI", "YEDEK", "REDDEDILDI"] as const).map(
                      (secenek) => (
                        <form key={secenek} action={basvuruDegerlendirEylemi}>
                          <input
                            type="hidden"
                            name="basvuruId"
                            value={basvuru.id}
                          />
                          <input
                            type="hidden"
                            name="yeniDurum"
                            value={secenek}
                          />
                          <button
                            type="submit"
                            disabled={
                              basvuru.durum === secenek ||
                              // Sıra beklerken düğme kapalı: sunucu zaten
                              // reddediyordu, kapalı düğme sebebini söylüyor.
                              basvuru.kaynakIlOnayDurumu === "BEKLIYOR" ||
                              basvuru.kaynakIlOnayDurumu === "REDDEDILDI"
                            }
                            className={`rounded-md border border-cizgi px-3 py-1.5 text-sm font-medium text-metin transition hover:bg-zemin disabled:opacity-40`}
                          >
                            {secenek === "SECILDI"
                              ? "Seç"
                              : secenek === "YEDEK"
                                ? "Yedeğe al"
                                : "Reddet"}
                          </button>
                        </form>
                      ),
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Kart>
      )}
    </div>
  );
}
