import { ayarSayi } from "../ayar";
import { prisma } from "../db";
import {
  gizliIcerikleriImhaEt,
  hareketsizKullanicilariImhaEt,
  type GizliIcerikImhaSonucu,
  type HareketsizImhaSonucu,
} from "./imha";
import {
  AYAR_BILDIRIM_SAKLAMA_AYI,
  AYAR_ERISIM_LOGU_SAKLAMA_AYI,
  AYAR_GIZLI_ICERIK_SAKLAMA_AYI,
  AYAR_HAREKETSIZ_KULLANICI_AYI,
  saklamaSonTarihi,
  VARSAYILAN_BILDIRIM_SAKLAMA_AYI,
  VARSAYILAN_ERISIM_LOGU_SAKLAMA_AYI,
  VARSAYILAN_GIZLI_ICERIK_SAKLAMA_AYI,
  VARSAYILAN_HAREKETSIZ_KULLANICI_AYI,
} from "./kurallar";

/**
 * Saklama süresi dolan kayıtların temizliği — KVKK'nın "süresiz saklama yok"
 * kuralının uygulanması (references/domain-rules.md Bölüm 10).
 *
 * DÖRT AYRI İŞ YAPAR ve dördünün süresi ayrı ayarlanır:
 *
 *   1. Erişim kaydı ve ondan türeyen anomali (varsayılan 24 ay) — silinir.
 *   2. OKUNMUŞ bildirim (12 ay) — silinir.
 *   3. Moderasyonla gizlenmiş içerik (6 ay) — gerçekten İMHA edilir.
 *   4. Uzun süredir temas etmemiş kişinin verisi (24 ay) — anonim hâle
 *      getirilir.
 *
 * 3 ve 4, İMHA POLİTİKASININ EKSİK YARISIYDI (2 Eylül 2026 · Genelge 3/e ve
 * 3/g). Önceden yalnızca DENETİM ve BİLDİRİM kayıtları siliniyordu; kişisel
 * verinin kendisi için tanımlı bir bitiş yoktu ("öğrencilik dönemi boyunca"
 * bir süre değildir) ve gizlenen içerik satırda aynen duruyordu — ilgili
 * kişinin silme talebi karşısında savunulamayacak bir durum.
 *
 * Faaliyet ve başvuru SATIRLARI hâlâ silinmez: ekosistemin geçmişe dönük
 * raporlaması onlara dayanıyor. İmha edilen, o satırlardaki kişisel veridir —
 * kimlik alanları ve kişinin kendi yazdığı serbest metinler (bkz. ./imha.ts).
 *
 * KVKK BAŞVURULARI DA KAPSAM DIŞIDIR (2 Eylül 2026 · bkz. model
 * KvkkBasvurusu): ilgili kişinin başvurusu ve ona verilen yanıt, kanunî
 * yükümlülüğün yerine getirildiğinin kanıtıdır. Erişim kaydı 24 ayda
 * silinirken o satırların da silinmesi, denetimde "başvuru geldi mi, ne cevap
 * verildi" sorusunu cevapsız bırakırdı — tabloyu buraya EKLEMEYİN.
 */

export interface TemizlikSonucu {
  silinenErisimLogu: number;
  silinenErisimAnomalisi: number;
  silinenBildirim: number;
  gizliIcerik: GizliIcerikImhaSonucu;
  hareketsizKullanici: HareketsizImhaSonucu;
  erisimLoguSiniri: Date;
  bildirimSiniri: Date;
  gizliIcerikSiniri: Date;
  hareketsizKullaniciSiniri: Date;
}

export async function saklamaSuresiTemizligi(
  simdi: Date = new Date(),
): Promise<TemizlikSonucu> {
  const [erisimAyi, bildirimAyi, gizliIcerikAyi, hareketsizAyi] =
    await Promise.all([
      ayarSayi(
        AYAR_ERISIM_LOGU_SAKLAMA_AYI,
        VARSAYILAN_ERISIM_LOGU_SAKLAMA_AYI,
      ),
      ayarSayi(AYAR_BILDIRIM_SAKLAMA_AYI, VARSAYILAN_BILDIRIM_SAKLAMA_AYI),
      ayarSayi(
        AYAR_GIZLI_ICERIK_SAKLAMA_AYI,
        VARSAYILAN_GIZLI_ICERIK_SAKLAMA_AYI,
      ),
      ayarSayi(
        AYAR_HAREKETSIZ_KULLANICI_AYI,
        VARSAYILAN_HAREKETSIZ_KULLANICI_AYI,
      ),
    ]);

  const erisimLoguSiniri = saklamaSonTarihi(simdi, erisimAyi);
  const bildirimSiniri = saklamaSonTarihi(simdi, bildirimAyi);
  const gizliIcerikSiniri = saklamaSonTarihi(simdi, gizliIcerikAyi);
  const hareketsizKullaniciSiniri = saklamaSonTarihi(simdi, hareketsizAyi);

  const [silinenErisimLogu, silinenErisimAnomalisi] = await Promise.all([
    prisma.erisimlogu.deleteMany({
      where: { tarih: { lt: erisimLoguSiniri } },
    }),
    // Anomali, erişim günlüğünden türetilmiş denetim verisidir; kaynak kayıttan
    // daha uzun süre tutulması aynı kişisel izi başka tabloda süresiz bırakırdı.
    prisma.erisimAnomalisi.deleteMany({
      where: { gun: { lt: erisimLoguSiniri } },
    }),
  ]);

  /*
   * Okunmamış bildirim silinmez: kullanıcı görmediği bir haberi süre doldu
   * diye kaybetmemeli. Süresi dolan okunmamış bildirim, işleyişte bir aksaklık
   * olduğunun işaretidir; sessizce silmek onu gizlerdi.
   */
  const silinenBildirim = await prisma.bildirim.deleteMany({
    where: { olusturmaTarihi: { lt: bildirimSiniri }, okunduMu: true },
  });

  /*
   * SIRA ÖNEMLİ: önce gizli içerik, sonra kullanıcı imhası.
   *
   * Kullanıcı imhası kişinin içeriğini zaten boşaltıp gizli işaretliyor. Ters
   * sırada çalışsaydı o satırlar aynı koşuda ikinci kez sayılır ve raporda
   * "bu ay şu kadar gizli içerik imha edildi" sayısı şişerdi.
   */
  const gizliIcerik = await gizliIcerikleriImhaEt(gizliIcerikSiniri);
  const hareketsizKullanici = await hareketsizKullanicilariImhaEt(
    hareketsizKullaniciSiniri,
    simdi,
  );

  return {
    silinenErisimLogu: silinenErisimLogu.count,
    silinenErisimAnomalisi: silinenErisimAnomalisi.count,
    silinenBildirim: silinenBildirim.count,
    gizliIcerik,
    hareketsizKullanici,
    erisimLoguSiniri,
    bildirimSiniri,
    gizliIcerikSiniri,
    hareketsizKullaniciSiniri,
  };
}
