"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import {
  HEDEF_AZAMI_SAYI,
  hedefDurumuGecerliMi,
  hedefKabulEdilirMi,
  tamamlanmaTarihiniCoz,
} from "@/lib/hedef/kurallar";
import { gunBasi } from "@/lib/tarih";
import { erisimLogla } from "@/lib/yetki/log";
import { BulunamadiHatasi } from "@/lib/yetki/tipler";

/**
 * "Rotam" hedefleri (D6).
 *
 * Hepsi oturumdaki kişinin KENDİ verisi üzerinde çalışır: `kullaniciId` hiçbir
 * yerde form girdisinden okunmaz. Kazanımda olduğu gibi burada da danışman ya
 * da koordinatör başkasının kaydına dokunamaz — üstelik hedefler kazanımlardan
 * daha dardır, onları GÖREMEZ de (bkz. şemadaki KullaniciHedefi notu).
 *
 * ROL KISITI YOK. Kart yalnızca öğrenci profilinde basılıyor ama eylem rol
 * kontrolü yapmıyor: kişi kendi satırından başkasına erişemediği için burada
 * korunacak bir şey yok, rol kontrolü eklemek yalnızca öğretmenin ileride
 * hedef tutmasını gereksizce engellerdi.
 */

/**
 * Hedeflerin göründüğü tek ekran (20 Ağustos 2026 · panel-profil birleşmesi).
 *
 * Rotam'ın GİRİŞ bölümü 14 Ağustos'ta panelden kaldırıldı; eylemler duruyor
 * çünkü girilmiş hedefler hâlâ listeleniyor (bkz. app/panel/page.tsx).
 */
const YOL = "/panel";

function yollariTazele(): void {
  revalidatePath(YOL);
}

/**
 * BAŞARIDA YÖNLENDİRME YOK — bilerek.
 *
 * İlk hâlinde bu eylemler `/panel/profil#rotam` adresine yönlendiriyordu ve
 * eklenen hedef ekranda GÖRÜNMÜYORDU: kullanıcı zaten o sayfadayken hedefin
 * yalnızca ÇIPASI değişiyor, tarayıcı bunu "aynı sayfa" sayıp sunucudan yeni
 * içerik istemiyor. Kayıt veritabanına yazılıyor, ekran eski kalıyordu.
 *
 * Çıpaya sorgu dizesi eklemek de çözmezdi: art arda iki hedef eklendiğinde
 * adres yine birebir aynı olurdu. Yönlendirmeyi kaldırınca `revalidatePath`
 * sonrası Next sayfayı eylem yanıtında yeniden üretiyor; üstelik gezinme
 * olmadığı için kullanıcının kaydırma konumu da bozulmuyor.
 *
 * HATA yolunda yönlendirme KALDI — uyarıyı adres taşıyor.
 */
function hataylaDon(mesaj: string): never {
  /*
   * `revalidatePath` HATA YOLUNDA DA gerekli. İstemci yönlendirme
   * önbelleği girdiyi YOLA göre tutuyor, sorgu dizesine göre değil: yalnızca
   * `?hata=` ekleyip yönlendirmek, tarayıcının elindeki ESKİ kopyayı yeniden
   * basmasına yol açıyordu. Adres çubuğunda uyarı görünüyor, ekranda
   * görünmüyordu.
   */
  yollariTazele();
  /*
   * `bolum` çıpadan AYRI: Rotam artık katlanabilir bir bölüm ve kapalı bir
   * `<details>` öğesinin çapasına inmek, kullanıcıyı uyarının görünmediği
   * kapalı bir başlığa götürürdü.
   */
  redirect(`${YOL}?bolum=rotam&hata=${encodeURIComponent(mesaj)}#rotam`);
}

/**
 * Hedefi sahibiyle birlikte okur.
 *
 * `kullaniciId` koşulu olmadan sorgulanırsa başkasının hedefinin durumu
 * değiştirilebilir ya da silinebilirdi. Bulunamayan kayıt 404 verir (403
 * değil): 403, "böyle bir kayıt var ama senin değil" bilgisini sızdırırdı.
 */
async function kendiHedefiniGetir(kullaniciId: number, ham: FormDataEntryValue | null) {
  const id = Number.parseInt(String(ham ?? ""), 10);
  if (!Number.isFinite(id)) throw new BulunamadiHatasi();

  const hedef = await prisma.kullaniciHedefi.findFirst({
    where: { id, kullaniciId },
    select: {
      id: true,
      baslik: true,
      durum: true,
      tamamlanmaTarihi: true,
    },
  });
  if (!hedef) throw new BulunamadiHatasi();
  return hedef;
}

export async function hedefEkleEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();

  const karar = hedefKabulEdilirMi({
    baslik: String(veri.get("baslik") ?? ""),
    aciklama: String(veri.get("aciklama") ?? ""),
    durum: String(veri.get("durum") ?? "PLANLANDI"),
    // Gün başına alınır: hedefte saat sorulmuyor.
    hedefTarihi: gunBasi(String(veri.get("hedefTarihi") ?? "") || null),
  });
  if (!karar.olurMu) hataylaDon(karar.neden);

  /*
   * Sayım eklemeden HEMEN ÖNCE yapılıyor; kullanıcı kendi satırlarına yarıştığı
   * için iki sekmeden aynı anda ekleyip sınırı bir aşması mümkün. Bu, kilit
   * ya da benzersizlik kısıtı kurmaya değmeyecek bir kayma: sınır taşma
   * koruması, kota değil.
   */
  const mevcut = await prisma.kullaniciHedefi.count({
    where: { kullaniciId: kullanici.id },
  });
  if (mevcut >= HEDEF_AZAMI_SAYI) {
    hataylaDon(
      `Rotanda en fazla ${HEDEF_AZAMI_SAYI} hedef tutabilirsin. Tamamladıklarını silerek yer açabilirsin.`,
    );
  }

  await prisma.kullaniciHedefi.create({
    data: { kullaniciId: kullanici.id, ...karar.kayit },
    select: { id: true },
  });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: `Rotaya hedef eklendi: ${karar.kayit.baslik}`,
  });

  yollariTazele();
}

/**
 * Tek tıkla durum değiştirme ("Başladım" / "Tamamladım").
 *
 * Hedefin metnini düzenlemek için ayrı bir form YOK: rota kısa satırlardan
 * oluşuyor ve yanlış yazılan bir hedefi silip yeniden yazmak, her satırın
 * altına ikinci bir form basmaktan ucuz. Değişen tek şey durum.
 */
export async function hedefDurumuEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  const hedef = await kendiHedefiniGetir(kullanici.id, veri.get("hedefId"));

  const yeniDurum = String(veri.get("durum") ?? "");
  if (!hedefDurumuGecerliMi(yeniDurum)) hataylaDon("Hedef durumu geçersiz.");

  await prisma.kullaniciHedefi.update({
    where: { id: hedef.id },
    data: {
      durum: yeniDurum,
      tamamlanmaTarihi: tamamlanmaTarihiniCoz(
        yeniDurum,
        hedef.durum,
        hedef.tamamlanmaTarihi,
      ),
      guncellemeTarihi: new Date(),
    },
  });

  yollariTazele();
}

export async function hedefSilEylemi(veri: FormData): Promise<void> {
  const kullanici = await oturumKullanicisiZorunlu();
  const hedef = await kendiHedefiniGetir(kullanici.id, veri.get("hedefId"));

  await prisma.kullaniciHedefi.delete({ where: { id: hedef.id } });

  await erisimLogla({
    kullaniciId: kullanici.id,
    islem: "DEGISIKLIK",
    hedefTip: "PROFIL",
    hedefId: kullanici.id,
    detay: `Rotadan hedef silindi: ${hedef.baslik}`,
  });

  yollariTazele();
}
