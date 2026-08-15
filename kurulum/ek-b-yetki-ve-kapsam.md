# Ek B — Yetki ve Kapsam Sözleşmesi

> **Üretilmiş dosya.** Elle düzenlemeyin; `npm run sartname:uret` ile yeniden oluşturulur.
> Kaynak kod ile şartname arasında çelişki olursa **kaynak kod** geçerlidir.

Sistemin güvenlik çekirdeği. `izinler.ts` **kim ne yapabilir** sorusunu, `kapsam.ts` **kim neyi görebilir** sorusunu cevaplar. proje.md §5'teki yetki matrisi bu iki dosyanın özetidir; çelişki halinde bu dosyalar geçerlidir.

Özellikle dikkat: kapsam filtreleri il ve kurum ekseninde çalışır. `MEZUN` ve `PAYDAS_TEMSILCISI` rollerinin kurum kodu **yoktur**, bu yüzden her filtrede açıkça ele alınmalıdır — varsayılanları "hiçbir şey görmez"dir.

---

### `src/lib/yetki/etiketler.ts`

```ts
import type {
  GorevRolKodu,
  LogHedefTip,
  LogIslemi,
  RolKodu,
} from "@/generated/prisma/enums";
import type { OturumKullanicisi } from "./tipler";

export const ROL_ETIKETLERI: Record<RolKodu, string> = {
  OGRENCI: "Öğrenci",
  DANISMAN: "Danışman öğretmen",
  IL_KOORDINATOR: "İl koordinatörü",
  PROJE_YONETICISI: "Proje yöneticisi",
  // EBA dışı roller: kimlikleri AuthProvider'dan gelmez, başvuru onayıyla
  // doğar (bkz. lib/dis-kimlik/).
  MEZUN: "Mezun",
  PAYDAS_TEMSILCISI: "Paydaş temsilcisi",
};

/**
 * Öğrenci görev rolleri. Bunlar YETKİ VERMEZ (permissions.md Bölüm 5), yalnızca
 * dönem bazlı görev etiketidir.
 */
export const GOREV_ROL_ETIKETLERI: Record<GorevRolKodu, string> = {
  IL_TEMSILCISI: "İl Temsilcisi",
  ILCE_TEMSILCISI: "İlçe Temsilcisi",
  OKUL_TEMSILCISI: "Okul Temsilcisi",
  CALISMA_GRUBU_YONETICISI: "Çalışma Grubu Yöneticisi",
};

/** Görev kaydının kapsam adları; hangisinin dolu olduğu rol koduna bağlıdır. */
export interface GorevKapsamAdlari {
  rolKodu: GorevRolKodu;
  il?: { ad: string } | null;
  ilce?: { ad: string } | null;
  kurum?: { ad: string } | null;
  /** CALISMA_GRUBU_YONETICISI rolünün kapsamı; diğerlerinde boş. */
  calismaGrubu?: { ad: string } | null;
}

/**
 * Görevi yerinin adıyla birlikte yazar: "Çankaya İlçe Temsilcisi".
 *
 * Yer adı, görev kaydının KENDİ kapsam sütunundan gelir; öğrencinin güncel
 * il/ilçe/okul kaydından değil. Öğrenci dönem içinde taşındığında görev
 * verildiği yerde kalır ve etiketin de orayı göstermesi gerekir.
 *
 * Kapsam adı çekilmediyse (ör. yalnızca rol kodu seçilen bir sorgu) sade rol
 * adına düşülür — eksik veriyle "undefined Temsilcisi" yazmaktansa etiketi
 * kısaltmak yeğdir.
 */
export function gorevRolAdi(gorev: GorevKapsamAdlari): string {
  const yer =
    gorev.rolKodu === "IL_TEMSILCISI"
      ? gorev.il?.ad
      : gorev.rolKodu === "ILCE_TEMSILCISI"
        ? gorev.ilce?.ad
        : /*
           * Çalışma grubu yöneticiliğinin "yer"i bir kurum değil GRUPTUR
           * (7 Ağustos 2026). Kurum adına düşseydi etiket "Atatürk Lisesi
           * Çalışma Grubu Yöneticisi" derdi — hangi grubun yöneticisi olduğu
           * kaybolurdu.
           */
          gorev.rolKodu === "CALISMA_GRUBU_YONETICISI"
          ? gorev.calismaGrubu?.ad
          : gorev.kurum?.ad;

  const etiket = GOREV_ROL_ETIKETLERI[gorev.rolKodu];
  return yer ? `${yer} ${etiket}` : etiket;
}

export const LOG_ISLEM_ETIKETLERI: Record<LogIslemi, string> = {
  GORUNTULEME: "Görüntüleme",
  DEGISIKLIK: "Değişiklik",
  SILME: "Silme",
};

export const LOG_HEDEF_ETIKETLERI: Record<LogHedefTip, string> = {
  OGRENCI: "Öğrenci kaydı",
  OGRETMEN: "Öğretmen kaydı",
  FAALIYET: "Etkinlik",
  YORUM: "Yorum",
  FAALIYET_EK: "Dosya/görsel",
  BASVURU: "Başvuru",
  ROL: "Rol ataması",
  DANISMAN_ATAMA: "Danışman ataması",
  PROFIL: "Profil",
  ERISIM_LOGU: "Erişim kayıtları",
  SISTEM_AYARI: "Sistem ayarı",
  CALISMA_GRUBU: "Çalışma grubu",
  ETKINLIK_PROGRAMI: "Etkinlik programı",
  PAYDAS: "Paydaş kaydı",
  BILDIRIM_SABLONU: "Bildirim şablonu",
  DIS_BASVURU: "Dış giriş başvurusu",
};

/**
 * Kullanıcının rol etiketi. Rolsüz öğretmen de sistemde görünür; danışman
 * listesine girmek için kendisi işaretlemek zorundadır.
 */
export function kullaniciRolEtiketi(kullanici: OturumKullanicisi): string {
  if (kullanici.roller.length === 0) {
    return "Öğretmen (danışmanlık görevi alınmadı)";
  }
  return kullanici.roller
    .map((rol) => ROL_ETIKETLERI[rol.rolKodu])
    .join(" · ");
}
```

### `src/lib/yetki/izinler.ts`

```ts
import type { Kapsam, RolKodu } from "@/generated/prisma/enums";
import type { FaaliyetKapsami, OturumKullanicisi } from "./tipler";

/**
 * Açtığı etkinlik İL KOORDİNATÖRÜNÜN onayına tabi olan roller.
 *
 * TEK KAYNAK (11 Ağustos 2026). Bu liste iki yerde birden gerekiyor:
 *
 *   1. `ilKoordinatoruOnaylayabilirMi` — koordinatör bu kaydı onaylayabilir mi?
 *   2. `faaliyetKapsamFiltresi` — koordinatör bu kaydı GÖREBİLİR mi?
 *
 * İkisi iki ayrı dosyada elle yazılıyordu ve İKİ KEZ AYRIŞTI: önce danışman
 * öğretmen onaya tabi kılınıp filtre unutuldu, sonra aynısı mezun/paydaş/mentör
 * için tekrarlandı. Sonuç her seferinde aynı sessiz kilitlenme oldu —
 * koordinatöre "onayınızı bekliyor" bildirimi gidiyor, bildirimdeki bağlantı
 * 404 veriyor, etkinlik sonsuza kadar BEKLIYOR'da kalıyor. Hiçbir yerde hata
 * görünmüyor.
 *
 * Artık ikisi de bu diziden türüyor; yeni bir rol eklemek tek satır.
 */
export const KOORDINATOR_ONAYINA_TABI_ROLLER: readonly RolKodu[] = [
  "OGRENCI",
  "DANISMAN",
  "MEZUN",
  "PAYDAS_TEMSILCISI",
];

/**
 * references/permissions.md Bölüm 1'deki yetki matrisinin birebir karşılığı.
 *
 * Buradaki fonksiyonlar saf tutulur (veritabanına gitmez) ki birim testle
 * eksiksiz kapsanabilsinler. Sık yapılan hatayı önlemek için her fonksiyon
 * hem ROLÜ hem KAPSAMI sorar: "il koordinatörü mü" yeterli değildir,
 * "bu kayıt onun ilinde mi" de sorulmalıdır.
 */

export function projeYoneticisiMi(kullanici: OturumKullanicisi): boolean {
  return kullanici.roller.some((rol) => rol.rolKodu === "PROJE_YONETICISI");
}

export function ilKoordinatoruMu(kullanici: OturumKullanicisi): boolean {
  return kullanici.roller.some((rol) => rol.rolKodu === "IL_KOORDINATOR");
}

export function danismanMi(kullanici: OturumKullanicisi): boolean {
  return kullanici.roller.some((rol) => rol.rolKodu === "DANISMAN");
}

export function ogrenciMi(kullanici: OturumKullanicisi): boolean {
  return kullanici.roller.some((rol) => rol.rolKodu === "OGRENCI");
}

export function mezunMu(kullanici: OturumKullanicisi): boolean {
  return kullanici.roller.some((rol) => rol.rolKodu === "MEZUN");
}

export function paydasTemsilcisiMi(kullanici: OturumKullanicisi): boolean {
  return kullanici.roller.some((rol) => rol.rolKodu === "PAYDAS_TEMSILCISI");
}

/**
 * Kimliği EBA'dan (mock aşamada AuthProvider'dan) GELMEYEN kullanıcı: mezun ve
 * paydaş temsilcisi.
 *
 * NİYE TEK KAVRAM: ikisinin yetki tablosu bugün aynı — "yalnızca kendi
 * profilini, etkinlik takvimini ve talep panosunu görür". Her kapıda iki rolü
 * ayrı ayrı saymak, birinin unutulduğu bir kapı bırakırdı ve unutulan kapı
 * hata vermez, sessizce veri gösterirdi. İkisinin yetkisi gerçekten ayrışırsa
 * o kapıda ayrı ayrı sorulur, bu fonksiyon kaldırılmaz.
 *
 * DİKKAT: Bu, "kullanıcının kurum kodu yok" demek DEĞİLDİR. YEĞİTEK personeli
 * de kurumsuzdur ama kimliği AuthProvider'dan gelir ve yetkisi en geniştir.
 */
export function disKullaniciMi(kullanici: OturumKullanicisi): boolean {
  return mezunMu(kullanici) || paydasTemsilcisiMi(kullanici);
}

/**
 * EBA dışı giriş başvurularını görme ve karara bağlama yetkisi.
 *
 * Yalnızca proje yöneticisi: talebin kendisi böyle ("onayı proje yöneticisine
 * düşecek"). İl koordinatörüne açılması bir ürün kararıdır — başvuran kişinin
 * ili belli olsa da mezun/paydaş kabulü ekosistem düzeyinde bir karardır.
 */
export function disBasvuruYonetebilirMi(kullanici: OturumKullanicisi): boolean {
  return projeYoneticisiMi(kullanici);
}

/**
 * Mentörlük başvurusu YAPABİLİR mi? (7 Ağustos 2026)
 *
 * ROLÜ OLAN HERKES: öğrenci, öğretmen, il koordinatörü, proje yöneticisi,
 * mezun ve paydaş temsilcisi. Dışarıdan gelenler bunu başvuru formundan
 * istiyor; içerideki kullanıcılar panodaki "Mentör olarak başvur" ekranından.
 *
 * ÖĞRENCİ 14 AĞUSTOS 2026'DA GİRDİ (istekler: "öğrenci de mentör olarak
 * başvurabilsin", "ama onay olsun onun için").
 *
 * ÖNCEKİ KURAL ve neden değişti: öğrenci hariç tutuluyordu çünkü mentörlük
 * "18 yaş altı bir kullanıcıyla birebir yazışma hakkı doğurur ve o hakkın
 * karşı tarafı yetişkin olmalıdır" deniyordu. Bu cümlenin ilk yarısı YANLIŞTI:
 * mentörlük tek başına yazışma hakkı doğurmuyor —
 *
 *   · mentörün ilana yazdığı CEVAP açıktır, panoda herkes okur
 *     (bkz. mentorlugum/eylemler.ts · mentör sayfası),
 *   · birebir yazışma yine BAĞLANTI İSTEĞİNDEN ve danışman/koordinatör
 *     onayından geçer (bkz. baglantiIstegiGonderilebilirMi ve
 *     baglantiKarariFiltresi). Mentör olmak bu kapıyı açmıyor.
 *
 * Yani öğrenci mentör olduğunda kazandığı şey, panodaki ilanlara açıkta cevap
 * yazabilmek — akran desteğinin ta kendisi ve bu sistemin kurulma sebebi.
 *
 * KAPI ONAYDIR: başvuru `BEKLIYOR` açılır ve kararı YALNIZCA proje yöneticisi
 * verir (bkz. mentorlukOnaylayabilirMi). Kural "her öğrenci mentördür" değil,
 * "merkezin uygun gördüğü öğrenci mentör olabilir".
 *
 * ROLSÜZ KULLANICI DIŞARIDA KALMAYA DEVAM EDİYOR: rolü olmayan kayıt
 * (ör. görev almamış öğretmen) mentör havuzuna sıfattan yoksun düşerdi.
 */
export function mentorlukBasvurabilirMi(kullanici: OturumKullanicisi): boolean {
  return kullanici.roller.length > 0;
}

/**
 * Mentörlük başvurusunu ONAYLAYABİLİR mi?
 *
 * YALNIZCA PROJE YÖNETİCİSİ (11 Ağustos 2026 · istek: "il koordinatörü
 * mentörlüğe başvurunca kendi kendini onaylıyor, mentörlük onaylarını sadece
 * proje yöneticisi onay verebilsin").
 *
 * İL KOORDİNATÖRÜ ÇIKARILDI ve gerekçesi bir kenar durum değil, kuralın
 * kendisiydi: koordinatör de mentör olabiliyor (bkz. mentorlukBasvurabilirMi)
 * ve kuyruk kendi iliyle sınırlı olduğu için kendi başvurusu her zaman kendi
 * ekranına düşüyordu. Kimse kendi işini onaylamaz — aynı ilke etkinlik
 * onayında da var (bkz. ilKoordinatoruOnaylayabilirMi · "kendi açtığı elenir").
 *
 * "Başvuran kendisi değilse onaylasın" gibi bir kaçamak YETMEZDİ: bir ilde tek
 * koordinatör var, yani o kişinin başvurusuna bakacak ikinci bir koordinatör
 * yok. Kararın sahibi ilin üstündeki merkez olmalı.
 *
 * KOORDİNATÖR MENTÖRLERİ GÖRMEYE DEVAM EDER: onay kuyruğu kapandı ama panodaki
 * mentör havuzu ve ilindeki mentörlerin listesi yerinde — kaybolan yalnızca
 * KARAR yetkisi.
 */
export function mentorlukOnaylayabilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return projeYoneticisiMi(kullanici);
}

/** İl koordinatörünün sorumlu olduğu il. Rol yoksa null. */
export function koordinatorIlKodu(
  kullanici: OturumKullanicisi,
): string | null {
  return (
    kullanici.roller.find((rol) => rol.rolKodu === "IL_KOORDINATOR")?.ilKodu ??
    null
  );
}

/** Danışman öğretmenin sorumlu olduğu okul. Rol yoksa null. */
export function danismanKurumKodu(
  kullanici: OturumKullanicisi,
): number | null {
  return (
    kullanici.roller.find((rol) => rol.rolKodu === "DANISMAN")?.kurumKodu ??
    null
  );
}

// ---------------------------------------------------------------------------
// Faaliyet
// ---------------------------------------------------------------------------

/**
 * Danışman öğretmen yalnızca okul içi faaliyet açabilir.
 *
 * ÖĞRENCİ DE FAALİYET AÇABİLİR ve kapsam sınırı yoktur: okul, il ve ulusal
 * kapsamın üçünü de önerebilir. Sınır kapsamda değil ONAYDA kuruldu — öğrencinin
 * açtığı faaliyet hiçbir kapsamda kendiliğinden yayına girmez
 * (bkz. faaliyetOnayGerekiyorMu), o yüzden kapsamı ayrıca daraltmak öneriyi
 * baştan kesmekten başka bir şey yapmazdı.
 *
 * MEZUN, PAYDAŞ TEMSİLCİSİ VE MENTÖR DE AÇABİLİR (7 Ağustos 2026 · istek:
 * "3. sekme Etkinlikler · Etkinlik Bildir · Görüntüle"). Öğrencideki mantığın
 * aynısı: kapsam serbest, güvence onayda — açtıkları hiçbir etkinlik
 * kendiliğinden yayına girmiyor.
 *
 * OKUL KAPSAMI HARİÇ: dış kullanıcının kurum kodu yoktur, "kendi okulu" diye
 * bir yer yok. Bir okulun içine etkinlik açmak, o okulun sorumlusunun işidir
 * (bkz. faaliyetYeriBelirle — kurumsuz kullanıcıda zaten hata veriyor).
 *
 * DİKKAT: bu, dış kullanıcının etkinliğe KATILIMCI olarak başvurabildiği
 * anlamına gelmez; o kapı ayrıdır ve kapalı kalmaya devam ediyor
 * (bkz. basvuruYapabilirMi).
 */
export function faaliyetAcabilirMi(
  kullanici: OturumKullanicisi,
  kapsam: Kapsam,
): boolean {
  if (projeYoneticisiMi(kullanici)) return true;
  if (ilKoordinatoruMu(kullanici)) return true;
  if (ogrenciMi(kullanici)) return true;
  if (disKullaniciMi(kullanici)) return kapsam !== "OKUL";
  if (danismanMi(kullanici)) return kapsam === "OKUL";
  return false;
}

/**
 * Faaliyet onaya tabi mi?
 *
 * İki durum var:
 *   1. İl koordinatörünün açtığı ULUSAL faaliyet — ülke geneline açılan bir
 *      çağrıyı merkez görmeden yayına almıyoruz.
 *   2. Öğrencinin açtığı HER faaliyet — kapsamı ne olursa olsun. Öğrenci
 *      etkinliği düzenleyebilir ama 18 yaş altı bir kullanıcının açtığı
 *      çağrının okul dışına (hatta okul içine) sorumlusuz çıkması olmaz.
 */
export function faaliyetOnayGerekiyorMu(
  kullanici: OturumKullanicisi,
  kapsam: Kapsam,
): boolean {
  if (projeYoneticisiMi(kullanici)) return false;
  if (ogrenciMi(kullanici)) return true;
  /*
   * Mezun, paydaş temsilcisi ve mentörün açtığı HER etkinlik — kapsamı ne
   * olursa olsun. Gerekçe öğrencidekinden farklı: yaş değil, EKOSİSTEM DIŞI
   * kimlik. Bu kişilerin kimliği EBA'dan gelmiyor, bir okul ya da il görevine
   * bağlı değiller; adlarına ilan edilen bir MEB etkinliğinin sorumlusu
   * olmadan yayına çıkması olmaz.
   */
  if (disKullaniciMi(kullanici)) return true;
  /*
   * 3. Danışman öğretmenin açtığı faaliyet — ilin koordinatörü görmeden
   *    yayına girmez. Koordinatör ilinde ne yapıldığından sorumludur ve
   *    okullardaki etkinlikleri ancak onaydan geçirirse görebilir.
   *
   * MEVCUT KAYITLAR ETKİLENMEZ: bu karar yalnızca yeni açılan faaliyette
   * verilir, veritabanındaki ONAY_GEREKMEZ satırları olduğu gibi kalır.
   */
  if (danismanMi(kullanici)) return true;
  return kapsam === "ULUSAL" && ilKoordinatoruMu(kullanici);
}

/**
 * İl koordinatörü bu faaliyeti onaylayabilir mi?
 *
 * Kapı, faaliyeti KİMİN açtığına bakar: öğrenci, danışman öğretmen ve dış
 * kullanıcı (mezun/paydaş/mentör) ilin koordinatörünün sorumluluk alanındadır.
 * Koordinatörün ve merkezin kendi açtığı faaliyet buradan geçmez — kimse kendi
 * işini onaylamaz.
 *
 * DIŞ KULLANICI DA BURADAN GEÇER (7 Ağustos 2026): ilinin koordinatörü, mezunu
 * ya da paydaş kurumu tanıyan en yakın sorumludur. Kapı yalnızca merkeze
 * bırakılsaydı, bir paydaşın önerdiği il etkinliği YEĞİTEK sırası gelene kadar
 * beklerdi.
 *
 * Onay merkeze bırakılsaydı bir okulun kendi içindeki etkinlik YEĞİTEK sırası
 * gelene kadar bekler ve pratikte ölürdü; ilin koordinatörü hem kişiyi hem
 * okulu tanıyan en yakın sorumludur. Merkez de yetkilidir (bkz.
 * faaliyetOnaylayabilirMi), hangisi önce karar verirse faaliyet sonuçlanır —
 * ayrı bir sıra kurulmaz.
 */
export function ilKoordinatoruOnaylayabilirMi(
  kullanici: OturumKullanicisi,
  faaliyet: FaaliyetKapsami,
): boolean {
  /*
   * Üç bayrak, KOORDINATOR_ONAYINA_TABI_ROLLER'ın karşılığıdır: öğrenci,
   * danışman öğretmen ve dış kullanıcı (mezun + paydaş temsilcisi). Bayraklar
   * `faaliyetKapsamiCikar`da aynı rollerden üretiliyor; liste değişirse orası
   * ve buradaki üçlü birlikte güncellenmeli — testi
   * `yetki-izinler.test.ts` tutuyor.
   */
  const onayaTabi =
    faaliyet.duzenleyenOgrenciMi === true ||
    faaliyet.duzenleyenDanismanMi === true ||
    faaliyet.duzenleyenDisKullaniciMi === true;
  if (!onayaTabi) return false;
  if (!ilKoordinatoruMu(kullanici)) return false;

  const faaliyetIli = faaliyet.kapsamIlKodu ?? faaliyet.ilKodu;
  return faaliyetIli !== null && koordinatorIlKodu(kullanici) === faaliyetIli;
}

/**
 * Faaliyeti onaylama/reddetme yetkisi.
 *
 * Faaliyet verilmezse yalnızca "her koşulda onaylayabilen" proje yöneticisi
 * geçer; il koordinatörünün yetkisi hangi faaliyet olduğuna bağlıdır ve
 * faaliyetsiz sorulduğunda yanıt "hayır"dır.
 */
export function faaliyetOnaylayabilirMi(
  kullanici: OturumKullanicisi,
  faaliyet?: FaaliyetKapsami,
): boolean {
  if (projeYoneticisiMi(kullanici)) return true;
  if (!faaliyet) return false;
  return ilKoordinatoruOnaylayabilirMi(kullanici, faaliyet);
}

/**
 * Faaliyetin kullanıcıya görünüp görünmediğini söyler. Onay bekleyen faaliyet
 * yalnızca düzenleyene, onaylamaya yetkili olana ve proje yöneticisine görünür.
 */
export function faaliyetGorunurMu(
  kullanici: OturumKullanicisi,
  faaliyet: FaaliyetKapsami,
): boolean {
  if (projeYoneticisiMi(kullanici)) return true;
  if (faaliyet.duzenleyenKullaniciId === kullanici.id) return true;
  // Onaylayacak kişi, onaylayacağı şeyi görmek zorunda.
  if (ilKoordinatoruOnaylayabilirMi(kullanici, faaliyet)) return true;
  if (!faaliyet.onayliMi) return false;

  switch (faaliyet.kapsam) {
    case "OKUL":
      return (
        faaliyet.kurumKodu !== null &&
        faaliyet.kurumKodu === kullanici.kurumKodu
      );
    case "IL":
      return faaliyet.ilKodu !== null && faaliyet.ilKodu === kullanici.ilKodu;
    case "ULUSAL":
      return true;
  }
}

/**
 * Faaliyeti açan kullanıcı görevden ayrıldığında değerlendirme ve moderasyon
 * yetkisi boşta kalmaz; faaliyetin iline bakan il koordinatörüne düşer
 * (references/domain-rules.md Bölüm 11). Proje yöneticisi zaten her durumda
 * yetkilidir, o yüzden burada aranmaz.
 *
 * Devir YALNIZCA düzenleyen görevden ayrıldığında olur: görevdeki bir
 * öğretmenin faaliyetine kendi ilinin koordinatörü karışamaz.
 */
export function yetkiDevrolduMu(
  kullanici: OturumKullanicisi,
  faaliyet: FaaliyetKapsami,
): boolean {
  if (faaliyet.duzenleyenGorevdeMi !== false) return false;
  if (!ilKoordinatoruMu(kullanici)) return false;

  const faaliyetIli = faaliyet.kapsamIlKodu ?? faaliyet.ilKodu;
  return faaliyetIli !== null && koordinatorIlKodu(kullanici) === faaliyetIli;
}

/**
 * Ek yükleme yetkisi yalnızca faaliyeti açan kullanıcıdadır. Rol kontrolü tek
 * başına yeterli değildir: aynı rolden başka bir danışman, başkasının
 * faaliyetine dosya ekleyemez.
 */
/**
 * Faaliyet raporunu yazabilir mi?
 *
 * Ek yükleme yetkisinden GENİŞTİR ve bu bilinçlidir: il koordinatörü, ilindeki
 * HER biten faaliyetin raporunu yazabilir — o faaliyeti kendisi açmamış olsa
 * bile. Raporlama ilin sorumluluğudur; okulundaki bir öğretmen etkinliği
 * yapıp raporu yazmadan görevden ayrılırsa faaliyet raporsuz kalmamalı.
 *
 * Ek yükleme yetkisi bundan dar kalmaya devam ediyor: koordinatörün başkasının
 * faaliyetine dosya eklemesi ayrı bir müdahaledir ve gerekmiyor.
 *
 * Kapsayan roller: faaliyeti açan, ilin koordinatörü, yetki devrolmuşsa
 * koordinatör ve proje yöneticisi.
 */
export function faaliyetRaporuYazabilirMi(
  kullanici: OturumKullanicisi,
  faaliyet: FaaliyetKapsami,
): boolean {
  if (ekYukleyebilirMi(kullanici, faaliyet)) return true;

  if (!ilKoordinatoruMu(kullanici)) return false;
  const faaliyetIli = faaliyet.kapsamIlKodu ?? faaliyet.ilKodu;
  return faaliyetIli !== null && koordinatorIlKodu(kullanici) === faaliyetIli;
}

export function ekYukleyebilirMi(
  kullanici: OturumKullanicisi,
  faaliyet: FaaliyetKapsami,
): boolean {
  if (projeYoneticisiMi(kullanici)) return true;
  if (faaliyet.duzenleyenKullaniciId === kullanici.id) return true;
  return yetkiDevrolduMu(kullanici, faaliyet);
}

/**
 * İptal yetkisi düzenleme yetkisinden DARDIR: yalnızca faaliyeti açan kullanıcı
 * ve proje yöneticisi (references/domain-rules.md Bölüm 6).
 *
 * Düzenleyen görevden ayrıldığında değerlendirme ve moderasyon ilin
 * koordinatörüne devrolur ama iptal devrolmaz — başkasının kurduğu bir
 * organizasyonu kapatmak, başvurmuş tüm öğrencileri etkileyen ve geri
 * alınamayan bir karardır. Koordinatörün gerçekten iptal etmesi gerekiyorsa
 * proje yöneticisine başvurur.
 */
export function faaliyetIptalEdebilirMi(
  kullanici: OturumKullanicisi,
  faaliyet: FaaliyetKapsami,
): boolean {
  if (projeYoneticisiMi(kullanici)) return true;
  return faaliyet.duzenleyenKullaniciId === kullanici.id;
}

/**
 * BAŞKASININ yürüttüğü danışmanlığı sonlandırabilir mi? (10 Ağustos 2026 ·
 * istek: "öğretmen öğrenciyi bırakabilsin, gerekirse koordinatör de
 * bırakabilsin")
 *
 * İl koordinatörü ve proje yöneticisi. Danışmanın KENDİ öğrencisini bırakması
 * bu kapıdan geçmez — o zaten kendi kaydıdır ve ayrı sorulur.
 *
 * Danışman öğretmen buraya girmez ve bu bilinçli: bir öğretmenin başka bir
 * öğretmenin öğrencisini danışmanlıktan çıkarabilmesi, öğrenci çekme kapısı
 * açardı (aynı gerekçeyle "yalnızca danışmansız öğrenci alınabilir" kuralı
 * var — bkz. ogrenciyiDanismanligaAlEylemi).
 *
 * KAPSAM BURADA SORULMAZ: bu fonksiyon "ekranda düğme olsun mu" sorusuna
 * cevap verir; "bu öğrenci onun kapsamında mı" sorusu merkezi kapsam
 * filtresine aittir ve eylemde ayrıca sorulur.
 */
export function danismanligiSonlandirabilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return ilKoordinatoruMu(kullanici) || projeYoneticisiMi(kullanici);
}

/**
 * Etkinlik listesi CSV olarak indirilebilir mi? (10 Ağustos 2026 · istek:
 * "öğrenci etkinliklerinde CSV indir kalkacak")
 *
 * ÖĞRENCİ HARİÇ herkes. Gerekçe gizlilik DEĞİL: dosya zaten kişinin ekranda
 * gördüğü kayıtlardan fazlasını içermiyor, başvuran adı da hiç girmiyor
 * (bkz. etkinlikler/disa-aktar). Kapının sebebi İŞLEV: CSV bir raporlama
 * aracı ve raporlama öğrencinin işi değil — öğrenci için etkinlik listesi
 * başvurulacak bir çağrı panosu, dökümü alınacak bir kayıt tablosu değil.
 *
 * KAPI HEM EKRANDA HEM ROTADA sorulur: bağlantıyı gizlemek yetmez, adres
 * çubuğuna /panel/etkinlikler/disa-aktar yazan öğrenci de dosyayı almamalı.
 */
export function faaliyetDisaAktarabilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return !ogrenciMi(kullanici);
}

// ---------------------------------------------------------------------------
// Yorum
// ---------------------------------------------------------------------------

/**
 * Faaliyeti görebilen herkes yorum yazabilir — dış kullanıcılar HARİÇ.
 *
 * İstisnanın sebebi: mezun ve paydaş temsilcisi ulusal ve kendi ilindeki
 * etkinlikleri takvimde görüyor, dolayısıyla "görebiliyorsa yazabilir" kuralı
 * onlara faaliyet altında söz hakkı verirdi. Faaliyet yorumları ağırlıklı
 * olarak 18 yaş altı katılımcıların bulunduğu bir alan ve moderasyonu
 * faaliyeti açan kişide; oraya, etkinliğe katılamayan bir dış kullanıcıyı
 * sokmak dar başlangıç kararıyla bağdaşmıyor.
 *
 * Bu bir yasak değil SIRALAMA: mezunun etkinlik altında konuşması istenirse
 * açılacak yer burasıdır, ama önce o yorumun kime görüneceği ve kimin
 * moderasyonunda olduğu kararlaştırılmalı.
 */
export function yorumYazabilirMi(
  kullanici: OturumKullanicisi,
  faaliyet: FaaliyetKapsami,
): boolean {
  if (disKullaniciMi(kullanici)) return false;
  return faaliyetGorunurMu(kullanici, faaliyet);
}

/**
 * Silme yetkisi: yorum sahibi, faaliyeti açan kullanıcı veya proje yöneticisi.
 * Öğrenci yalnızca kendi yorumunu silebilir. Düzenleyen görevden ayrıldıysa
 * moderasyon yetkisi ilin koordinatörüne devrolur — 18 yaş altı kullanıcıların
 * olduğu bir faaliyet moderatörsüz kalamaz.
 */
export function yorumSilebilirMi(
  kullanici: OturumKullanicisi,
  yorum: { yazanKullaniciId: number },
  faaliyet: FaaliyetKapsami,
): boolean {
  if (projeYoneticisiMi(kullanici)) return true;
  if (yorum.yazanKullaniciId === kullanici.id) return true;
  if (faaliyet.duzenleyenKullaniciId === kullanici.id) return true;
  return yetkiDevrolduMu(kullanici, faaliyet);
}

// ---------------------------------------------------------------------------
// Başvuru
// ---------------------------------------------------------------------------

/**
 * Kişi faaliyete KATILIMCI olarak başvurabilir mi?
 *
 * Öğrenciler ve öğretmenler başvurur. Öğretmenin katılımcı olması bir istisna
 * değildir: analiz dokümanı 4.2 katılımcıyı "öğretmen/öğrenci" diye sayıyor ve
 * eğitici etkinliklerin bir kısmı zaten öğretmene yöneliktir. Görev almamış
 * öğretmen de başvurabilir — GençTek'e katılmanın yolu genelde buradan geçer.
 *
 * Proje yöneticisi (YEĞİTEK) dışarıdadır: ulusal faaliyetleri düzenleyen ve
 * onaylayan taraf kendi açtığı etkinliğe katılımcı olarak başvurmaz.
 *
 * MEZUN VE PAYDAŞ TEMSİLCİSİ DE DIŞARIDADIR. Bu, kalıcı bir karar değil DAR
 * BAŞLANGIÇTIR: iki rol yeni ve ne yapabilecekleri satır satır kararlaştırılmış
 * değil. Eksik yetki sonradan verilebilir; fazla verilmiş yetkiyle görülen veri
 * geri alınamaz. Mezunun etkinliğe eğitmen/katılımcı olarak girmesi istenirse
 * burada açılacak — ama başvuru, katılımcı listesi ve belge akışlarının o rolde
 * ne anlama geldiği önce kararlaştırılmalı.
 */
export function basvuruYapabilirMi(kullanici: OturumKullanicisi): boolean {
  return !projeYoneticisiMi(kullanici) && !disKullaniciMi(kullanici);
}

/**
 * Panoyu (eski adıyla Talep Panosu) GÖREBİLİR Mİ?
 *
 * `basvuruYapabilirMi`den AYRI tutuldu: pano bir ilan tahtasıdır, faaliyete
 * başvurmakla ilgisi yok. Mezun ve paydaş temsilcisi panoyu görür (sponsorluk,
 * teknik destek, mentorluk ilanları ekosistemin en doğal buluşma noktası) ama
 * faaliyete katılımcı olarak başvuramaz.
 *
 * PROJE YÖNETİCİSİNE DE AÇILDI (13 Ağustos 2026 · istek: "proje yöneticisinin
 * pano sayfası görünmüyor, diğer kullanıcılarda var"). Önce görme ve ilan açma
 * tek kapıdan geçiyordu; merkez personeli ilan açmadığı için pano da menüsünden
 * düşüyordu. Oysa panoyu görmemek, sistemdeki en canlı kullanıcı alanını
 * yönetenden gizlemek demekti: merkez, hangi konularda destek ve mentör
 * arandığını göremiyordu. Görme ile İLAN AÇMA bu yüzden ayrıldı — açma kapısı
 * `panodaEslesmeArayabilirMi`de ve merkez orada hâlâ dışarıda.
 *
 * Görme yetkisi artık herkeste; fonksiyon yine de duruyor çünkü panonun
 * ekosistem dışına kapalı olması (S21) bir karardır ve tek bir yerde yazılı
 * kalmalı — dışarıya açık ilan sayfası istenirse değişecek yer burasıdır.
 */
export function talepPanosuGorebilirMi(_kullanici: OturumKullanicisi): boolean {
  return true;
}

/**
 * Panoda İLAN AÇABİLİR ve BAĞLANTI İSTEĞİ GÖNDEREBİLİR mi?
 *
 * Panonun yazan tarafı. İkisi tek fonksiyonda: ilan açmak da bağlantı isteği
 * göndermek de aynı şeyin iki ucudur — panoda eşleşme aramak. Ayrı izin adları
 * uydurmak, aynı kuralın iki yerde ayrışmasına açık kapı bırakırdı.
 *
 * Merkez personeli dışarıda: YEĞİTEK'in takım arkadaşı ya da mentör araması
 * diye bir durum yok, onun duyuru kanalı ayrı (bkz. /panel/duyurular). Panoyu
 * okuması ise serbest (bkz. talepPanosuGorebilirMi).
 */
export function panodaEslesmeArayabilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return !projeYoneticisiMi(kullanici);
}

/**
 * Panoda İLAN AÇABİLİR mi? (14 Ağustos 2026 · istekler: "proje yöneticisi
 * panodan destek talebi açabilsin", "mentör talebi açabilsin proje yöneticisi")
 *
 * `panodaEslesmeArayabilirMi`DEN AYRILDI. O işlev 13 Ağustos'a kadar iki işi
 * birden yapıyordu: ilan açmak ve bağlantı isteği göndermek. Merkez ikisinden
 * de dışarıdaydı, gerekçe de "YEĞİTEK'in takım arkadaşı araması diye bir durum
 * yok"tu. İstek bu gerekçenin ilan tarafını geçersiz kıldı — merkez de panodan
 * destek ve mentör talebi açıyor.
 *
 * BAĞLANTI İSTEĞİ TARAFI DEĞİŞMEDİ: merkez hâlâ ilanlara bağlantı isteği
 * göndermiyor (bkz. panodaEslesmeArayabilirMi). İstek yalnızca ilan açmaktan
 * söz ediyor ve ikisi aynı şey değil: ilan herkesin okuduğu açık bir metin,
 * bağlantı isteği ise kişiye yönelen ve onaydan geçen bir temas.
 *
 * Rolü olan herkes açabilir; rolsüz kullanıcı panoyu yalnızca okur.
 */
export function panodaIlanAcabilirMi(kullanici: OturumKullanicisi): boolean {
  return kullanici.roller.length > 0;
}

/**
 * Pano ilanını DÜZENLEYEBİLİR mi? (14 Ağustos 2026 · istek: "açılan ilanlar
 * düzenlenebilsin, açan kişi ve proje yöneticisi düzenleyebilsin")
 *
 * İKİ TARAF: ilanı açan kendi metnini düzeltir, proje yöneticisi ise onay
 * yetkisinin doğal uzantısı olarak düzeltir — reddetmek yerine bir cümleyi
 * düzeltip onaylamak, öğrenciyi ilanı baştan yazmaya göndermekten iyidir.
 *
 * İl koordinatörü ve danışman DIŞARIDA: pano kapsam filtresizdir (ilanlar ülke
 * genelinde görünür), yani "hangi ilin koordinatörü hangi ilanı düzeltir"in
 * cevabı yok. Şikâyet gerektiren içerik için yol moderasyon değil merkezdir.
 */
export function panoIlaniDuzenleyebilirMi(
  kullanici: OturumKullanicisi,
  acanKullaniciId: number,
): boolean {
  return kullanici.id === acanKullaniciId || projeYoneticisiMi(kullanici);
}

/**
 * Pano ilanını SİLEBİLİR mi? (14 Ağustos 2026 · istek: "proje yöneticisi
 * ilanları silebilsin")
 *
 * YALNIZCA PROJE YÖNETİCİSİ. İlan sahibi silemez, KAPATIR (bkz.
 * talepKapatEylemi): kimin ne aradığı geçmiş kaydıdır ve kapanan ilan
 * üzerinden kurulmuş bağlantılar anlamsızlaşmamalı.
 *
 * Merkezin silmesi ise bilinçli bir istisnadır: panoya yazılmış, durması
 * gerekmeyen bir metni (kişisel veri, hakaret, yanlışlıkla açılmış ilan)
 * kaldıracak bir kapı yoksa tek çare veritabanına elle girmektir.
 */
export function panoIlaniSilebilirMi(kullanici: OturumKullanicisi): boolean {
  return projeYoneticisiMi(kullanici);
}

/**
 * Açtığı pano ilanı ONAYA mı düşer? (14 Ağustos 2026 · istek: "panodaki
 * öğrenci ilanları şimdilik proje yöneticilerine düşsün oradan onay versin")
 *
 * YALNIZCA ÖĞRENCİ. Öğretmenin, mezunun ve paydaş temsilcisinin ilanı doğrudan
 * yayımlanmaya devam ediyor; istek açıkça "öğrenci ilanları" diyor ve kapıyı
 * herkese kurmak, bugün sorunsuz işleyen bir akışa gereksiz bir bekleme
 * eklerdi.
 *
 * KURALIN GEREKÇESİ, ilan açma yetkisininkiyle aynı yerden geliyor:
 * kullanıcıların çoğu 18 yaş altı ve panoya yazılan metin ekosistemdeki
 * herkesin okuduğu açık bir metindir. Onay, o metnin yayımlanmadan önce bir
 * yetişkin tarafından okunmasıdır.
 *
 * "ŞİMDİLİK": istek geçici olduğunu söylüyor. Kapı bu yüzden tek bir işlevde
 * duruyor — vazgeçildiğinde `false` dönmesi yeter, ilanların onay sütunu ve
 * geçmişi yerinde kalır.
 */
export function panoIlaniOnayGerekiyorMu(
  kullanici: OturumKullanicisi,
): boolean {
  return ogrenciMi(kullanici);
}

/**
 * Pano ilanını onaylayıp reddedebilir mi?
 *
 * YALNIZCA PROJE YÖNETİCİSİ — istekte yazdığı gibi ("proje yöneticilerine
 * düşsün"). İl koordinatörü dışarıda: pano KAPSAM FİLTRESİZDİR, ilanlar ülke
 * genelinde görünür (bkz. talepler/page.tsx) ve koordinatöre yetki verilseydi
 * "hangi ilin koordinatörü hangi ilanı onaylar" sorusunun cevabı olmazdı;
 * il sınırı konsaydı da pano kendi amacını baltalardı.
 *
 * Emsali `mentorlukOnaylayabilirMi`: merkezde toplanan ikinci onay kuyruğu bu.
 */
export function panoIlaniOnaylayabilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return projeYoneticisiMi(kullanici);
}

/**
 * Başkası ADINA başvuru yetkisi (analiz dokümanı 4.2: "Danışman öğretmen
 * öğrenci adına başvurabilir").
 *
 * Yetki danışmanla sınırlı tutulmadı: il koordinatörü de kendi ilindeki
 * öğrencilerin faaliyet katılımını yürütüyor ve danışmanı olmayan öğrencinin
 * başvurusunu başka kimse yapamazdı.
 *
 * DİKKAT: Bu fonksiyon yalnızca ROLÜ sorar. "Bu öğrenci onun kapsamında mı"
 * sorusu ayrıca `ogrenciKapsamFiltresi` ile sorulmak zorundadır; tek başına
 * kullanılırsa bir danışman, ilinin öbür ucundaki öğrenci adına başvuru
 * yapabilirdi.
 */
export function baskasiAdinaBasvurabilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return (
    projeYoneticisiMi(kullanici) ||
    ilKoordinatoruMu(kullanici) ||
    danismanMi(kullanici)
  );
}

/**
 * Başvuruyu yalnızca faaliyeti açan kullanıcı değerlendirir; o görevden
 * ayrılmışsa yetki ilin koordinatörüne düşer, böylece başvurular
 * değerlendirilmeden kalmaz.
 */
export function basvuruDegerlendirebilirMi(
  kullanici: OturumKullanicisi,
  faaliyet: FaaliyetKapsami,
): boolean {
  if (projeYoneticisiMi(kullanici)) return true;
  if (faaliyet.duzenleyenKullaniciId === kullanici.id) return true;
  return yetkiDevrolduMu(kullanici, faaliyet);
}

// ---------------------------------------------------------------------------
// Rol ve görev atama
// ---------------------------------------------------------------------------

export function ilKoordinatorAtayabilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return projeYoneticisiMi(kullanici);
}

/**
 * Okul Temsilcisi görevini verebilir/kaldırabilir mi?
 *
 * DANIŞMAN YALNIZCA KENDİ ÖĞRENCİSİNE (10 Ağustos 2026 · istek: "danışmanı
 * olmadığı öğrenciyi okul temsilcisi yapabiliyor, bu bir tezat").
 *
 * Sınır önceden ÖRTÜKTÜ: öğretmenin listesinde zaten yalnızca kendi
 * öğrencileri vardı, dolayısıyla okul kodu eşitliği yetiyordu. Okulundaki
 * danışmansız öğrenciler de listeye girince (bkz. ogrenciKapsamFiltresi) örtük
 * sınır düştü ve öğretmen, danışmanı olmadığı bir öğrenciye görev verebilir
 * hâle geldi. Kural artık açıkça yazılı: göreceği her öğrenciye görev veremez,
 * yalnızca sorumluluğunu üstlendiklerine.
 *
 * MERKEZ HARİÇ: proje yöneticisinin danışmanlığı yoktur ve okulda danışman
 * kalmadığında düzeltmeyi yapabilecek tek kişidir; ona bu koşul sorulmaz.
 */
export function okulTemsilcisiAtayabilirMi(
  kullanici: OturumKullanicisi,
  kurumKodu: number,
  /** Öğrenci bu kullanıcının danışmanlığında mı? */
  kendiOgrencisiMi: boolean,
): boolean {
  if (projeYoneticisiMi(kullanici)) return true;
  if (!kendiOgrencisiMi) return false;
  return danismanMi(kullanici) && danismanKurumKodu(kullanici) === kurumKodu;
}

export function ilTemsilcisiAtayabilirMi(
  kullanici: OturumKullanicisi,
  ilKodu: string,
): boolean {
  if (projeYoneticisiMi(kullanici)) return true;
  return (
    ilKoordinatoruMu(kullanici) && koordinatorIlKodu(kullanici) === ilKodu
  );
}

/**
 * Çalışma Grubu Yöneticisi atama yetkisi — YALNIZCA MERKEZ (11 Ağustos 2026 ·
 * istek: "koordinatör öğrenciyi çalışma grubu yöneticisi yapamasın, çalışma
 * grubu üyesi yapabilsin sadece").
 *
 * NİYE AYRI BİR KAPI: bu rol `ilTemsilcisiAtayabilirMi` ile aynı kapıdan
 * geçiyordu, yani il koordinatörü kendi ilindeki bir öğrenciyi yönetici
 * yapabiliyordu. Kapıyı paylaşmaları bir varsayıma dayanıyordu — "atama kararı
 * ilindir" — ve o varsayım çalışma grubunda tutmuyor: ÇALIŞMA GRUBU İL DEĞİL
 * ÜLKE GENELİ bir yapıdır. Bir grubun yöneticisi tek kişidir ve o kişi tüm
 * ülkedeki gruba karşı sorumludur; her ilin koordinatörü kendi ilinden birini
 * atayabilseydi, aynı grup için 81 il birbiriyle yarışır ve "önce atayan
 * kazanır" gibi bir kural doğardı.
 *
 * ÜYELİK BUNUN DIŞINDA ve koordinatörde KALIYOR: öğrenciyi gruba yazmak ayrı
 * bir yetkidir (bkz. ogrenciCalismaGrubuYonetebilirMi) ve o kapı
 * değiştirilmedi. İstek de tam olarak bu ayrımı söylüyor — üye evet, yönetici
 * hayır.
 */
export function calismaGrubuYoneticisiAtayabilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return projeYoneticisiMi(kullanici);
}

/**
 * İlçe Temsilcisi atama yetkisi — ilçenin BAĞLI OLDUĞU İL üzerinden sorulur.
 *
 * Sistemde ilçe düzeyinde bir görevli yoktur (RolKodu'nda ILCE_KOORDINATOR
 * diye bir değer yok); ilçe, ilin içindeki bir basamaktır ve temsilcisini o ilin
 * koordinatörü belirler. Bu yüzden fonksiyon ilçe kodunu değil il kodunu alır:
 * ilçe kodundan ili çözmek veritabanına gitmek olurdu ve bu dosya saf kalmalı.
 * Çağıran, öğrencinin ilçesiyle ilinin tutarlılığını sorgudan alır.
 */
export function ilceTemsilcisiAtayabilirMi(
  kullanici: OturumKullanicisi,
  ilKodu: string,
): boolean {
  return ilTemsilcisiAtayabilirMi(kullanici, ilKodu);
}

export function calismaGrubuTanimlayabilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return projeYoneticisiMi(kullanici);
}

/**
 * Bir öğrenciyi çalışma grubuna ekleyip çıkarma yetkisi.
 *
 * Grubun kendisini TANIMLAMAK'tan (yalnızca proje yöneticisi) ayrı bir
 * yetkidir: burada listeye yeni bir grup eklenmiyor, mevcut bir gruba öğrenci
 * yazılıyor. Danışman öğretmen, il koordinatörü ve proje yöneticisi yapabilir;
 * öğrenci de kendi seçimini yapar ama o akış `/panel/calisma-gruplari`
 * ekranındadır ve burada aranmaz.
 *
 * DİKKAT: Bu fonksiyon yalnızca ROLÜ sorar. "Bu öğrenci onun kapsamında mı"
 * sorusu ayrıca `ogrenciKapsamFiltresi` ile sorulmak zorundadır — tek başına
 * kullanılırsa danışman, ilinin öbür ucundaki bir öğrenciyi gruba yazabilirdi.
 */
export function ogrenciCalismaGrubuYonetebilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return (
    projeYoneticisiMi(kullanici) ||
    ilKoordinatoruMu(kullanici) ||
    danismanMi(kullanici)
  );
}

/**
 * Rol/atama envanteri — hangi ilde koordinatör atanmış, hangi okul danışmansız
 * kalmış sorularının TOPLU cevabı.
 *
 * "Öğrenci/öğretmen verisi görüntüleme" satırından AYRI bir yetkidir: o tekil
 * profil erişimi, bu yönetimsel bir görünüm. İl koordinatörü kendi ilindeki
 * danışmansız okulları zaten görür; bu ekran aynı sorguyu il filtresi olmadan
 * çalıştırdığı için yalnızca proje yöneticisine açıktır.
 */
export function rolEnvanteriGorebilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return projeYoneticisiMi(kullanici);
}

/**
 * Erişim kayıtları — "kim hangi öğrenci kaydını ne zaman gördü" defteri.
 *
 * Defterin kendisi de kişisel veri içerdiğinden yalnızca merkeze açıktır; il
 * koordinatörü kendi ilinin kayıtlarını bile göremez, çünkü kayıtlar il
 * sınırından bağımsız olarak birbirine referans verir.
 */
export function erisimLoglariniGorebilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return projeYoneticisiMi(kullanici);
}

/** Sistem ayarları, çalışma grupları ve etkinlik programları merkezden yönetilir. */
export function sistemAyarlariniYonetebilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return projeYoneticisiMi(kullanici);
}

// ---------------------------------------------------------------------------
// Yönetim panosu
// ---------------------------------------------------------------------------

/**
 * Yönetim panosunu görebilir mi? (11 Ağustos 2026)
 *
 * Pano, yönetim ekranlarının ortak girişidir: il/ilçe/okul kırılımı ile
 * birlikte öğrenci, öğretmen, paydaş ve görev rolleri ekranlarının kartları da
 * buradadır. Kapı bu yüzden "en dar yönetim yetkisi" ile açılıyor: il
 * koordinatörü ve merkez. Danışman öğretmen DIŞARIDA — ona ait tek yönetim
 * ekranı kendi öğrenci listesidir ve menüsünde "Öğrencilerim" olarak duruyor;
 * pano ona ilinin tamamını gösterirdi.
 *
 * Panonun İÇİNDEKİ her ekran kendi yetkisini AYRICA sorar (paydaş, görev
 * rolleri, envanterler). Buradaki kapı yalnızca "pano açılır mı" sorusunu
 * cevaplar; kartların hangisinin basılacağına ekran karar verir.
 */
export function yonetimPanosuGorebilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return projeYoneticisiMi(kullanici) || ilKoordinatoruMu(kullanici);
}

/**
 * Panoda BU İLİN kırılımını açabilir mi?
 *
 * Kırılım adresten geliyor (`/panel/yonetim/il/34`), dolayısıyla kapsam
 * ekranda değil burada kararlaştırılıyor: koordinatör yalnızca kendi ilini,
 * merkez hepsini açar. Kontrol olmasaydı bir koordinatör adres çubuğuna başka
 * il kodu yazarak o ilin okul ve öğrenci sayımlarını görebilirdi — sayım da
 * veridir.
 *
 * İli olmayan (merkez dışı) kullanıcı hiçbir ili açamaz: fail closed.
 */
export function yonetimPanosuIlErisimi(
  kullanici: OturumKullanicisi,
  ilKodu: string,
): boolean {
  if (projeYoneticisiMi(kullanici)) return true;
  return koordinatorIlKodu(kullanici) === ilKodu;
}

// ---------------------------------------------------------------------------
// Öğrenci ve öğretmen envanteri
// ---------------------------------------------------------------------------

/**
 * Öğrenci envanterini (liste ekranı ve CSV çıktısı) görebilir mi?
 *
 * KAPI EKRAN SEVİYESİNDE DE KAPALI OLMALI (11 Ağustos 2026). Ekran önceden
 * yalnızca ÖĞRENCİYİ eliyordu; kalan herkes listeyi açabiliyor ve kapsam
 * filtresi sayesinde "0 kayıt" görüyordu. Mezun, paydaş temsilcisi, mentör ve
 * görev almamış öğretmen için bu ekran hiç açılmamalı:
 *
 *   · Boş liste, veri sızdırmasa da YANLIŞ BİLGİ verir — "sistemde öğrenci
 *     yok" diye okunur.
 *   · Asıl mesele kırılganlık: erişimi tek başına `ogrenciKapsamFiltresi`nin
 *     varsayılan dalı (HICBIRI) tutuyordu. O dalda bir gün yapılacak bir
 *     genişletme, bu ekranı kimse fark etmeden veri gösterir hâle getirirdi.
 *     Yetki iki katmanda birden sorulur (permissions.md · Bölüm 4).
 *
 * Liste `ogretmenEnvanteriGorebilirMi` ile AYNI: kapsam filtresinde kayıt
 * görebilen roller tam olarak bunlar (danışman kendi okulu, koordinatör kendi
 * ili, merkez ülke geneli).
 */
export function ogrenciEnvanteriGorebilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return (
    projeYoneticisiMi(kullanici) ||
    ilKoordinatoruMu(kullanici) ||
    danismanMi(kullanici)
  );
}

/**
 * Danışman öğretmen envanterini görebilir mi?
 *
 * Öğrenci envanterinden AYRI bir kapıdır ama kapsam mantığı aynıdır: danışman
 * kendi okulundaki, il koordinatörü kendi ilindeki, YEĞİTEK tüm ülkedeki
 * öğretmenleri görür (bkz. ogretmenKapsamFiltresi). Öğrenci hiçbir koşulda
 * göremez: öğretmenin branşı ve iletişim bilgisi öğrencinin işine yaramaz,
 * kendi danışmanını zaten "Danışmanım" ekranında görüyor.
 *
 * Görev almamış öğretmen de göremez — öğrenci envanterinde olduğu gibi fail
 * closed davranılır.
 */
export function ogretmenEnvanteriGorebilirMi(
  kullanici: OturumKullanicisi,
): boolean {
  return (
    projeYoneticisiMi(kullanici) ||
    ilKoordinatoruMu(kullanici) ||
    danismanMi(kullanici)
  );
}

// ---------------------------------------------------------------------------
// Paydaş envanteri
// ---------------------------------------------------------------------------

/**
 * Paydaş listesini görebilir mi? (analiz dokümanı Bölüm 3)
 *
 * Liste "faaliyet planlarken hızlıca ulaşılacak kurumlar" defteridir; faaliyet
 * düzenleyen herkes görür. Öğrenci göremez: kayıtlar kurum yetkililerinin adı
 * ve doğrudan iletişim bilgisidir, öğrencinin bu bilgiyle yapacağı bir iş yok.
 */
export function paydasGorebilirMi(kullanici: OturumKullanicisi): boolean {
  return (
    projeYoneticisiMi(kullanici) ||
    ilKoordinatoruMu(kullanici) ||
    danismanMi(kullanici)
  );
}

/**
 * Paydaş kaydı EKLEYEBİLİR Mİ?
 *
 * Görmekten dar bir yetkidir: kayıt ilin koordinatörüne ve merkeze bırakıldı.
 * Her danışman öğretmen de ekleyebilseydi aynı üniversite onlarca kez farklı
 * yazımla girilir ve "il bazlı iş birliği haritası" kullanılamaz hâle gelirdi.
 * Danışman öğretmen paydaşı görür ve faaliyetine bağlar; listeye yeni kurum
 * eklenmesini koordinatöründen ister.
 *
 * EKLEMEDE İL SORULMAZ. Koordinatörün iş birliği kurduğu üniversite ya da
 * şirket başka ilde olabilir (İzmir koordinatörünün Ankara'daki bir
 * üniversiteyle çalışması olağandır); kaydı kendi iline yazmaya zorlamak
 * envanteri yanlışlardı. Kaydın hangi ile ait olduğu formda seçilir.
 */
export function paydasEkleyebilirMi(kullanici: OturumKullanicisi): boolean {
  return projeYoneticisiMi(kullanici) || ilKoordinatoruMu(kullanici);
}

/**
 * MEVCUT bir paydaş kaydını düzenleyebilir mi?
 *
 * Eklemeden DAR bir yetkidir ve iki kapısı vardır:
 *   1. Kayıt kendi ilindeyse — envanter ile bağlıdır, koordinatör değişse de
 *      yeni koordinatör devralır.
 *   2. Kaydı kendisi eklediyse — başka ile yazdığı kaydı düzeltebilmeli,
 *      yoksa yanlış yazdığı bir kurumu düzeltemez hâle gelirdi.
 *
 * Başka bir ilin koordinatörünün eklediği kayda dokunulamaz: aynı kurumu iki
 * il farklı biçimde yönetiyorsa bu bir veri çatışmasıdır, yetki sorunu değil.
 */
export function paydasYonetebilirMi(
  kullanici: OturumKullanicisi,
  ilKodu: string,
  ekleyenKullaniciId?: number,
): boolean {
  if (projeYoneticisiMi(kullanici)) return true;
  if (!ilKoordinatoruMu(kullanici)) return false;
  if (koordinatorIlKodu(kullanici) === ilKodu) return true;
  return ekleyenKullaniciId !== undefined && ekleyenKullaniciId === kullanici.id;
}

/**
 * Faaliyete paydaş bağlayabilir mi?
 *
 * Bağlantı, paydaş kaydını YÖNETMEKTEN farklıdır: faaliyeti açan danışman
 * öğretmen kendi etkinliğinin hangi kurumla yapıldığını yazabilmelidir, ama
 * bu ona paydaş listesini düzenleme yetkisi vermez. Kapı, faaliyetin ek ve
 * içerik kapısıyla aynıdır — ikisi de "bu faaliyet senin mi" sorusudur.
 */
export function faaliyetPaydasiYonetebilirMi(
  kullanici: OturumKullanicisi,
  faaliyet: FaaliyetKapsami,
): boolean {
  return ekYukleyebilirMi(kullanici, faaliyet);
}
```

### `src/lib/yetki/kapsam.ts`

```ts
import type { Prisma } from "@/generated/prisma/client";
import type { PaydasTuru } from "@/generated/prisma/enums";
import {
  danismanKurumKodu,
  danismanMi,
  disKullaniciMi,
  KOORDINATOR_ONAYINA_TABI_ROLLER,
  koordinatorIlKodu,
  ogrenciMi,
  projeYoneticisiMi,
} from "./izinler";
import type { OturumKullanicisi } from "./tipler";

/**
 * Kapsam filtresi — references/permissions.md Bölüm 2.
 *
 * Öğrenci sorgulayan HER yol bu filtreden geçmek zorundadır; istisnası yoktur.
 * Elle yazılan filtreler er geç bir endpoint'te unutulur ve veri sızar, o
 * yüzden filtreyi tek bir yerde üretiyoruz.
 *
 * Yetki belirlenemezse filtre "hiçbir kaydı döndürmeyen" hâle döner (fail
 * closed). Yanlış tarafa düşmek, veri sızdırmaktan iyidir.
 *
 * DIŞ KULLANICILAR (mezun, paydaş temsilcisi) HER FİLTREDE AÇIKÇA ELENİR.
 * Rol kontrolüne dayanan filtreler onları zaten dışarıda bırakıyor ama İL
 * ALANINA bakan filtreler bırakmıyordu: mezunun da paydaş temsilcisinin de
 * ilKodu vardır ve "ili olan, öğrenci olmayan kullanıcı" koşulu onları içeri
 * alırdı (bkz. paydasKapsamFiltresi). Bu, filtresi yazılmamış bir ekranın
 * sessizce veri göstermesinin tam olarak nasıl olduğunu gösteren bir örnek.
 */

/** Hiçbir kaydı döndürmeyen filtre. */
const HICBIRI: Prisma.KullaniciWhereInput = { id: { in: [] } };

const AKTIF_OGRENCI: Prisma.KullaniciWhereInput = {
  roller: { some: { rolKodu: "OGRENCI", bitisTarihi: null } },
};

export function ogrenciKapsamFiltresi(
  kullanici: OturumKullanicisi,
): Prisma.KullaniciWhereInput {
  // Proje yöneticisi: filtre yok (tüm iller).
  if (projeYoneticisiMi(kullanici)) {
    return AKTIF_OGRENCI;
  }

  // İl koordinatörü: yalnızca kendi ilindeki öğrenciler. Kendi açtığı ulusal
  // faaliyete başvuran diğer il öğrencileri BURAYA dahil değildir; o erişim
  // yalnızca değerlendirme ekranındadır (bkz. ulusalBasvuranFiltresi).
  const ilKodu = koordinatorIlKodu(kullanici);
  if (ilKodu !== null) {
    return { AND: [AKTIF_OGRENCI, { ilKodu }] };
  }

  /*
   * Danışman öğretmen: KENDİ OKULUNDAKİ öğrencilerden
   *   · danışmanlığını üstlendikleri VE
   *   · hiç danışmanı olmayanlar (10 Ağustos 2026 · istek: "öğrencilerim
   *     sayfasında danışmanı olmasa da okulunda öğrenci varsa listede
   *     görünsün").
   *
   * NİYE DANIŞMANSIZLAR DA: öğretmen zaten onları danışmanlığına alabiliyor
   * ("Okulumdaki danışmansız öğrenciler" kartı) — alabildiği ama listeleyip
   * inceleyemediği bir öğrenci, kararı körlemesine vermek demekti. Tekil
   * bırakma da öğrenciyi danışmansız bıraktığı için (bkz. tekOgrenciyiBirak)
   * bırakılan öğrencinin okulunda görünmeye devam etmesi şart: aksi halde
   * bırakan öğretmenin ekranından tamamen kaybolur ve okulda kimse farkına
   * varmazdı.
   *
   * BAŞKA DANIŞMANIN ÖĞRENCİSİ HÂLÂ GÖRÜNMEZ: aynı okuldaki bir meslektaşın
   * öğrencisi bu listede yok ve olmamalı — danışmanlık kişiye özel bir bağdır,
   * "okulun tamamını gör" yetkisi il koordinatöründe.
   */
  const kurumKodu = danismanKurumKodu(kullanici);
  if (kurumKodu !== null) {
    return {
      AND: [
        AKTIF_OGRENCI,
        { kurumKodu },
        {
          OR: [
            {
              ogrenciAtamalari: {
                some: { danismanKullaniciId: kullanici.id, bitisTarihi: null },
              },
            },
            { ogrenciAtamalari: { none: { bitisTarihi: null } } },
          ],
        },
      ],
    };
  }

  // Öğrenci: yalnızca kendisi. İl Temsilcisi / Okul Temsilcisi görev rolleri
  // burada istisna değildir — hiçbir ek görüntüleme yetkisi vermezler.
  if (ogrenciMi(kullanici)) {
    return { AND: [AKTIF_OGRENCI, { id: kullanici.id }] };
  }

  // Rolsüz öğretmen (danışmanlık işaretlemeyen) hiçbir öğrenci görmez.
  return HICBIRI;
}

/** Öğrenci listesi ekranında kullanıcının seçebildiği filtreler. */
export interface OgrenciListeFiltreleri {
  ilKodu?: string | null;
  ilceKodu?: string | null;
  kurumKodu?: number | null;
  /**
   * Okul türü ("Anadolu Lisesi", "Mesleki ve Teknik Anadolu Lisesi" gibi).
   * Kurum tablosundan gelir; öğrencide böyle bir alan yoktur.
   */
  okulTuru?: string | null;
  /** Kısmi eşleşir: "11" girildiğinde 11-A ve 11-B de gelir. */
  sinif?: string | null;
  /**
   * Eğitim-öğretim yılı ("2025-2026"). Yıllar arası karşılaştırmanın
   * dayanağıdır: geçen yılın envanteri bu filtreyle görüntülenir.
   */
  egitimOgretimYili?: string | null;
  calismaGrubuId?: number | null;
  /** Ad veya soyadda geçen metin. */
  ara?: string | null;
  /** Danışmanı olmayan öğrenciler (il koordinatörünün takip etmesi gereken durum). */
  danismansizMi?: boolean;
}

/**
 * Kapsam filtresi + kullanıcının seçtiği filtreler.
 *
 * Seçilen filtreler kapsamın YERİNE geçmez, ÜSTÜNE eklenir: ikisi AND ile
 * bağlanır. Aksi halde adres çubuğuna `?il=06` yazan bir il koordinatörü başka
 * ilin öğrencilerini listeleyebilirdi. Bu yüzden filtreleri doğrulamak yerine
 * daraltıcı olmaya zorluyoruz — geçersiz bir değer en kötü durumda boş liste
 * verir, veri sızdırmaz.
 */
export function ogrenciListeFiltresi(
  kullanici: OturumKullanicisi,
  filtreler: OgrenciListeFiltreleri = {},
): Prisma.KullaniciWhereInput {
  const kosullar: Prisma.KullaniciWhereInput[] = [
    ogrenciKapsamFiltresi(kullanici),
  ];

  if (filtreler.ilKodu) kosullar.push({ ilKodu: filtreler.ilKodu });
  if (filtreler.ilceKodu) kosullar.push({ ilceKodu: filtreler.ilceKodu });
  if (filtreler.kurumKodu) kosullar.push({ kurumKodu: filtreler.kurumKodu });
  // Okul türü öğrencide değil bağlı olduğu kurumda durur.
  if (filtreler.okulTuru) {
    kosullar.push({ kurum: { okulTuru: filtreler.okulTuru } });
  }
  if (filtreler.egitimOgretimYili) {
    kosullar.push({ egitimOgretimYili: filtreler.egitimOgretimYili });
  }
  if (filtreler.sinif) {
    kosullar.push({
      sinif: { contains: filtreler.sinif, mode: "insensitive" },
    });
  }
  if (filtreler.ara) {
    kosullar.push({
      OR: [
        { ad: { contains: filtreler.ara, mode: "insensitive" } },
        { soyad: { contains: filtreler.ara, mode: "insensitive" } },
      ],
    });
  }
  if (filtreler.calismaGrubuId) {
    kosullar.push({
      calismaGruplari: { some: { calismaGrubuId: filtreler.calismaGrubuId } },
    });
  }
  if (filtreler.danismansizMi) {
    kosullar.push({ ogrenciAtamalari: { none: { bitisTarihi: null } } });
  }

  return { AND: kosullar };
}

// ---------------------------------------------------------------------------
// Öğretmen envanteri
// ---------------------------------------------------------------------------

/**
 * "Öğretmen" = aktif öğrenci, merkez ve dış kullanıcı rolü olmayan kullanıcı.
 *
 * Ayrı bir kullanıcı tipi sütunu yok ve olmamalı: kimlik sağlayıcıdan gelen
 * kişi rolüyle tanımlanır. Görev almamış öğretmen de bu kümededir — envanterin
 * en çok işe yarayan satırı, henüz danışmanlık işaretlememiş öğretmendir.
 *
 * DIŞARIDA BIRAKILANLAR ve gerekçeleri:
 *   - Proje yöneticisi (YEĞİTEK personeli): okulda görevli bir öğretmen
 *     değildir, listede okulsuz satır olarak görünmesi envanteri kirletir.
 *   - Mezun ve paydaş temsilcisi: aynı gerekçenin daha keskin hâli. Küme
 *     "öğrenci OLMAYAN" diye tanımlı kaldığı sürece bu iki rol kendiliğinden
 *     içeri girer ve il koordinatörü, ilinin öğretmen envanterinde mezunları
 *     görürdü — üstelik ekran onları öğretmen sanarak branş sütunu basardı.
 */
export const OGRETMEN: Prisma.KullaniciWhereInput = {
  roller: {
    none: {
      rolKodu: {
        in: ["OGRENCI", "PROJE_YONETICISI", "MEZUN", "PAYDAS_TEMSILCISI"],
      },
      bitisTarihi: null,
    },
  },
};

/**
 * Öğretmen envanterinin kapsam filtresi — öğrencininkiyle aynı mantık.
 *
 * Danışman öğretmende bir fark var: öğrencide "kendi danışmanlığındakiler"
 * koşulu da aranıyordu, burada aranmıyor. Meslektaş listesi kişisel veri
 * bakımından daha dardır (öğretmenin sınıfı, çalışma grubu, kazanımı yok) ve
 * okuldaki diğer danışmanı görmek işbirliğinin ön koşulu.
 */
export function ogretmenKapsamFiltresi(
  kullanici: OturumKullanicisi,
): Prisma.KullaniciWhereInput {
  if (projeYoneticisiMi(kullanici)) {
    return OGRETMEN;
  }

  const ilKodu = koordinatorIlKodu(kullanici);
  if (ilKodu !== null) {
    return { AND: [OGRETMEN, { ilKodu }] };
  }

  const kurumKodu = danismanKurumKodu(kullanici);
  if (kurumKodu !== null) {
    return { AND: [OGRETMEN, { kurumKodu }] };
  }

  // Öğrenci ve görev almamış öğretmen hiçbir öğretmen kaydı görmez.
  return HICBIRI;
}

export interface OgretmenListeFiltreleri {
  ilKodu?: string | null;
  ilceKodu?: string | null;
  kurumKodu?: number | null;
  okulTuru?: string | null;
  /** Kısmi eşleşir: "Bilişim" girildiğinde "Bilişim Teknolojileri" de gelir. */
  brans?: string | null;
  /** Ad veya soyadda geçen metin. */
  ara?: string | null;
  /** Danışman olarak görev almış öğretmenler. */
  yalnizcaDanismanlar?: boolean;
  /** Danışmanlık için işaretlememiş, yani öğrenci listesinde çıkmayanlar. */
  yalnizcaGorevsizler?: boolean;
  /**
   * Görev ALDIĞI eğitim-öğretim yılı. Kullanıcının güncel yılı değil, rol
   * kaydının kapsadığı dönem sorulur: geçen yıl danışmanlık yapıp bu yıl
   * bırakan öğretmen, 2024-2025 seçildiğinde listede olmalıdır.
   */
  gorevAraligi?: { baslangic: Date; bitis: Date } | null;
}

export function ogretmenListeFiltresi(
  kullanici: OturumKullanicisi,
  filtreler: OgretmenListeFiltreleri = {},
): Prisma.KullaniciWhereInput {
  const kosullar: Prisma.KullaniciWhereInput[] = [
    ogretmenKapsamFiltresi(kullanici),
  ];

  if (filtreler.ilKodu) kosullar.push({ ilKodu: filtreler.ilKodu });
  if (filtreler.ilceKodu) kosullar.push({ ilceKodu: filtreler.ilceKodu });
  if (filtreler.kurumKodu) kosullar.push({ kurumKodu: filtreler.kurumKodu });
  if (filtreler.okulTuru) {
    kosullar.push({ kurum: { okulTuru: filtreler.okulTuru } });
  }
  if (filtreler.brans) {
    kosullar.push({ brans: { contains: filtreler.brans, mode: "insensitive" } });
  }
  if (filtreler.ara) {
    kosullar.push({
      OR: [
        { ad: { contains: filtreler.ara, mode: "insensitive" } },
        { soyad: { contains: filtreler.ara, mode: "insensitive" } },
      ],
    });
  }
  if (filtreler.yalnizcaDanismanlar) {
    kosullar.push({
      roller: { some: { rolKodu: "DANISMAN", bitisTarihi: null } },
    });
  }
  if (filtreler.yalnizcaGorevsizler) {
    kosullar.push({ roller: { none: { bitisTarihi: null } } });
  }
  if (filtreler.gorevAraligi) {
    /*
     * Aralık ÇAKIŞMASI aranır, kapsanması değil: 1 Eylül'de başlayıp yıl
     * ortasında biten bir görev de o yıla aittir. Süren görevin bitişi NULL
     * olduğundan ayrıca ele alınır.
     */
    const { baslangic, bitis } = filtreler.gorevAraligi;
    kosullar.push({
      roller: {
        some: {
          baslangicTarihi: { lte: bitis },
          OR: [{ bitisTarihi: null }, { bitisTarihi: { gte: baslangic } }],
        },
      },
    });
  }

  return { AND: kosullar };
}

// ---------------------------------------------------------------------------
// Paydaş envanteri
// ---------------------------------------------------------------------------

/** Hiçbir paydaş döndürmeyen filtre. */
const PAYDAS_HICBIRI: Prisma.PaydasWhereInput = { id: { in: [] } };

/**
 * Paydaş envanteri il bazlıdır: koordinatör kendi ilini, danışman öğretmen
 * kendi ilini (okulunu değil — iş birliği il düzeyinde kurulur), YEĞİTEK
 * tüm illeri görür.
 *
 * Öğrenci ve ili belli olmayan kullanıcı hiçbir kayıt görmez.
 *
 * KOORDİNATÖRDE BİR EK KOŞUL VAR: kendi eklediği kayıtları, başka bir ile
 * yazmış olsa bile görür. Koordinatör başka ildeki bir üniversiteyle iş
 * birliği kurabildiği için (bkz. paydasEkleyebilirMi) bu koşul olmasaydı
 * eklediği kayıt kaydettiği anda listesinden kaybolurdu.
 *
 * İl bağı bundan etkilenmez: kaydı ekleyen koordinatör görevden ayrılsa da
 * kayıt ilinde durmaya devam eder ve yeni koordinatör onu devralır.
 */
export function paydasKapsamFiltresi(
  kullanici: OturumKullanicisi,
): Prisma.PaydasWhereInput {
  if (projeYoneticisiMi(kullanici)) return {};

  const koordinatorIli = koordinatorIlKodu(kullanici);
  if (koordinatorIli !== null) {
    return {
      OR: [{ ilKodu: koordinatorIli }, { ekleyenKullaniciId: kullanici.id }],
    };
  }

  /*
   * Dış kullanıcı burada AÇIKÇA eleniyor. Koşul "ili olan, öğrenci olmayan"
   * dediği için paydaş temsilcisi kendi ilinin TÜM paydaş envanterini —
   * yetkili kişi adları ve doğrudan iletişim bilgileriyle birlikte —
   * görecekti. Mezun için de aynısı geçerliydi.
   */
  if (
    kullanici.ilKodu !== null &&
    !ogrenciMi(kullanici) &&
    !disKullaniciMi(kullanici)
  ) {
    return { ilKodu: kullanici.ilKodu };
  }

  return PAYDAS_HICBIRI;
}

export interface PaydasListeFiltreleri {
  ilKodu?: string | null;
  tur?: PaydasTuru | null;
  /** Kurum adı, yetkili kişi ya da iş birliği alanında geçen metin. */
  ara?: string | null;
  /** Pasife alınmış kayıtlar da listelensin mi? */
  pasifleriDeGoster?: boolean;
}

export function paydasListeFiltresi(
  kullanici: OturumKullanicisi,
  filtreler: PaydasListeFiltreleri = {},
): Prisma.PaydasWhereInput {
  const kosullar: Prisma.PaydasWhereInput[] = [paydasKapsamFiltresi(kullanici)];

  if (filtreler.ilKodu) kosullar.push({ ilKodu: filtreler.ilKodu });
  if (filtreler.tur) kosullar.push({ tur: filtreler.tur });
  if (!filtreler.pasifleriDeGoster) kosullar.push({ aktif: true });
  if (filtreler.ara) {
    kosullar.push({
      OR: [
        { ad: { contains: filtreler.ara, mode: "insensitive" } },
        { yetkiliKisi: { contains: filtreler.ara, mode: "insensitive" } },
        { isBirligiAlani: { contains: filtreler.ara, mode: "insensitive" } },
      ],
    });
  }

  return { AND: kosullar };
}

/**
 * Ulusal faaliyet istisnası — references/permissions.md Bölüm 3.
 *
 * İl koordinatörü, KENDİ AÇTIĞI ulusal faaliyete başvurmuş öğrencileri başka
 * ilden olsalar da görebilir. Bu erişim yalnızca başvuru değerlendirme
 * ekranındadır; envanter, arama ve raporlamada geçerli değildir.
 */
export function ulusalBasvuranFiltresi(
  kullanici: OturumKullanicisi,
  faaliyetId: number,
  /**
   * Düzenleyen görevden ayrıldığı için yetkinin devrolduğu durum. Kararı bu
   * fonksiyon veremez (düzenleyenin rol durumunu bilmez), çağıran
   * `yetkiDevrolduMu` ile hesaplayıp geçer.
   */
  yetkiDevroldu = false,
): Prisma.BasvuruWhereInput {
  if (projeYoneticisiMi(kullanici) || yetkiDevroldu) {
    return { faaliyetId };
  }
  return {
    faaliyetId,
    faaliyet: { duzenleyenKullaniciId: kullanici.id },
  };
}

/**
 * Değerlendirme ekranında gösterilebilecek asgari KATILIMCI alanları.
 * Telefon ve e-posta BİLİNÇLİ olarak yoktur.
 *
 * Katılımcı öğretmen de olabildiği için branş ve aktif rol de seçilir:
 * değerlendiren kişi karşısındakinin öğrenci mi öğretmen mi olduğunu
 * görmeden karar veremez.
 */
export const DEGERLENDIRME_KATILIMCI_ALANLARI = {
  id: true,
  ad: true,
  soyad: true,
  sinif: true,
  brans: true,
  ilKodu: true,
  il: { select: { ad: true } },
  kurum: { select: { ad: true } },
  roller: {
    where: { bitisTarihi: null },
    select: { rolKodu: true },
  },
  calismaGruplari: { select: { calismaGrubu: { select: { ad: true } } } },
} as const;

/**
 * Faaliyet görünürlük filtresi. Onay bekleyen faaliyet yalnızca düzenleyene,
 * onaylamaya yetkili olana ve proje yöneticisine görünür; öğrenciye yalnızca
 * kendi kapsamındaki onaylı faaliyetler listelenir.
 */
export function faaliyetKapsamFiltresi(
  kullanici: OturumKullanicisi,
): Prisma.FaaliyetWhereInput {
  if (projeYoneticisiMi(kullanici)) {
    return {};
  }

  /*
   * İl koordinatörü, kendi ilinde açılmış ONAY BEKLEYEN faaliyeti görür —
   * onaylayacak kişi onaylayacağı şeyi göremezse öneri hiç ulaşmamış olurdu
   * (bkz. ilKoordinatoruOnaylayabilirMi).
   *
   * ROL LİSTESİ ARTIK ELLE YAZILMIYOR (11 Ağustos 2026). Buradaki liste ile
   * `ilKoordinatoruOnaylayabilirMi`nin kabul ettiği roller İKİ KEZ AYRIŞTI:
   * önce danışman öğretmen onaya tabi kılınıp filtre unutuldu, sonra aynısı
   * mezun/paydaş/mentör için tekrarlandı. Her seferinde sonuç sessiz bir
   * kilitlenmeydi: faaliyet BEKLIYOR'da kalıyor, koordinatör onu ne listede ne
   * adresinde görebiliyor (404), "onayınızı bekliyor" bildirimi de bulunamayan
   * bir sayfaya götürüyordu. Hiçbir yerde hata çıkmıyordu.
   *
   * İki taraf da KOORDINATOR_ONAYINA_TABI_ROLLER'dan türüyor; ayrışma artık
   * yapısal olarak mümkün değil.
   */
  const koordinatorIli = koordinatorIlKodu(kullanici);
  const onaylayabilecekleri: Prisma.FaaliyetWhereInput[] =
    koordinatorIli !== null
      ? [
          {
            onayDurumu: "BEKLIYOR",
            duzenleyen: {
              roller: {
                some: {
                  rolKodu: { in: [...KOORDINATOR_ONAYINA_TABI_ROLLER] },
                  bitisTarihi: null,
                },
              },
            },
            /*
             * Faaliyetin ili, `faaliyetKapsamiCikar`'daki sırayla çözülür:
             * kapsam alanı → okulun ili → düzenleyenin ili. Okul içi faaliyette
             * il kodu boştur (okulunki geçerlidir), ulusal öneride ikisi de
             * boştur ve karar düzenleyenin ilindeki koordinatöre düşer.
             */
            OR: [
              { ilKodu: koordinatorIli },
              { ilKodu: null, kurum: { ilKodu: koordinatorIli } },
              {
                ilKodu: null,
                kurumKodu: null,
                duzenleyen: { ilKodu: koordinatorIli },
              },
            ],
          },
        ]
      : [];

  const yayindaOlanlar: Prisma.FaaliyetWhereInput = {
    onayDurumu: { in: ["ONAY_GEREKMEZ", "ONAYLANDI"] },
    OR: [
      { kapsam: "ULUSAL" },
      ...(kullanici.kurumKodu !== null
        ? [{ kapsam: "OKUL" as const, kurumKodu: kullanici.kurumKodu }]
        : []),
      ...(kullanici.ilKodu !== null
        ? [{ kapsam: "IL" as const, ilKodu: kullanici.ilKodu }]
        : []),
      // İl koordinatörü kendi ilinin okul içi faaliyetlerini de görür.
      ...(koordinatorIli !== null
        ? [{ kapsam: "OKUL" as const, kurum: { ilKodu: koordinatorIli } }]
        : []),
    ],
  };

  // Kişinin kendi açtığı faaliyetler onay durumundan bağımsız görünür.
  return {
    OR: [
      { duzenleyenKullaniciId: kullanici.id },
      ...onaylayabilecekleri,
      yayindaOlanlar,
    ],
  };
}

/**
 * Danışman seçim listesi filtresi: aynı kurum kodundaki, danışmanlık için
 * işaretlenmiş öğretmenler.
 */
export function danismanAdayiFiltresi(
  kurumKodu: number,
): Prisma.KullaniciWhereInput {
  return {
    kurumKodu,
    aktif: true,
    ogretmenProfil: { danismanOlmakIstiyor: true },
    // İl koordinatörü olan öğretmen danışman listesinde çıkmaz.
    NOT: {
      roller: { some: { rolKodu: "IL_KOORDINATOR", bitisTarihi: null } },
    },
  };
}

// ---------------------------------------------------------------------------
// İl dışına giden başvurular
// ---------------------------------------------------------------------------

/** Hiçbir başvuru döndürmeyen filtre. */
const BASVURU_HICBIRI: Prisma.BasvuruWhereInput = { id: { in: [] } };

/**
 * İl koordinatörünün, KENDİ ilinden başka bir ilin etkinliğine giden
 * başvuruları — analiz isteği Bölüm 4.
 *
 * `ogrenciKapsamFiltresi`den farkı: orası "ilimdeki öğrenciler" sorusunu
 * cevaplar, burası "ilimden çıkan başvurular". İkisi ayrı çünkü koordinatörün
 * burada gördüğü şey öğrencinin kendisi değil, onun başka bir ile yaptığı tekil
 * bir başvurudur.
 *
 * Faaliyetin ili kaydın kendisinden okunamadığı için (okul içi faaliyette
 * okulun, ulusal faaliyette düzenleyenin ili geçerli) filtre "kaynak il onayı
 * BEKLİYOR ya da karara bağlanmış" kayıtlar üzerinden kurulur: o alan yalnızca
 * il dışı başvuruda doldurulur, dolayısıyla il karşılaştırmasını tekrar etmeye
 * gerek kalmaz.
 *
 * Proje yöneticisi hepsini görür; başka hiçbir rol bu listeyi görmez.
 */
export function ilDisiBasvuruFiltresi(
  kullanici: OturumKullanicisi,
): Prisma.BasvuruWhereInput {
  const ilDisiKayit: Prisma.BasvuruWhereInput = {
    kaynakIlOnayDurumu: { not: "ONAY_GEREKMEZ" },
  };

  if (projeYoneticisiMi(kullanici)) return ilDisiKayit;

  const ilKodu = koordinatorIlKodu(kullanici);
  if (ilKodu === null) return BASVURU_HICBIRI;

  // Katılımcının ili = kaynak il. Koordinatör yalnızca KENDİ ilinden çıkan
  // başvuruya karar verir; hedef ildeki karar düzenleyenin değerlendirmesidir.
  return { AND: [ilDisiKayit, { katilimci: { ilKodu } }] };
}

// ---------------------------------------------------------------------------
// İletişim modülü
// ---------------------------------------------------------------------------

/**
 * Kullanıcının GÖREBİLECEĞİ yazışmalar — analiz isteği Bölüm 6.
 *
 * GİZLİ KANAL YOKTUR. Bir yazışmayı şunlar görür:
 *   - tarafların kendisi
 *   - tarafların danışman öğretmenleri
 *   - tarafların illerinin koordinatörleri
 *   - proje yöneticileri (hepsi)
 *
 * Danışmanlık "aktif atama" üzerinden okunur, okul eşitliğinden DEĞİL: aynı
 * okuldaki başka bir danışmanın, kendi öğrencisi olmayan birinin yazışmasını
 * okuması gerekmiyor. Kapsam gereğinden geniş tutulursa modülün kendisi bir
 * veri sızıntısı kaynağına dönüşür.
 */
export function yazismaKapsamFiltresi(
  kullanici: OturumKullanicisi,
): Prisma.YazismaWhereInput {
  if (projeYoneticisiMi(kullanici)) return {};

  const taraflar: Prisma.BaglantiIstegiWhereInput[] = [
    { isteyenKullaniciId: kullanici.id },
    { hedefKullaniciId: kullanici.id },
  ];

  const koordinatorIli = koordinatorIlKodu(kullanici);
  if (koordinatorIli !== null) {
    taraflar.push(
      { isteyen: { ilKodu: koordinatorIli } },
      { hedef: { ilKodu: koordinatorIli } },
    );
  }

  if (danismanMi(kullanici)) {
    const danismanlik = {
      ogrenciAtamalari: {
        some: { danismanKullaniciId: kullanici.id, bitisTarihi: null },
      },
    };
    taraflar.push({ isteyen: danismanlik }, { hedef: danismanlik });
  }

  return { baglantiIstegi: { OR: taraflar } };
}

/**
 * Kullanıcının karar verebileceği bağlantı istekleri.
 *
 * Onaylayan, İSTEĞİ YAPANIN danışmanı ya da ilinin koordinatörü olabilir.
 * Yalnızca koordinatöre bırakılsaydı il başına tek kişi yüzlerce isteğin
 * darboğazı olurdu; danışman öğrencisini zaten tanıyor.
 *
 * Hedefin tarafı karar VERMEZ: bu bir "kabul ediyor musun" sorusu değil,
 * "öğrencimin bu teması kurmasına izin veriyor muyum" sorusudur.
 */
export function baglantiKarariFiltresi(
  kullanici: OturumKullanicisi,
): Prisma.BaglantiIstegiWhereInput {
  if (projeYoneticisiMi(kullanici)) return {};

  const kosullar: Prisma.BaglantiIstegiWhereInput[] = [];

  const koordinatorIli = koordinatorIlKodu(kullanici);
  if (koordinatorIli !== null) {
    kosullar.push({ isteyen: { ilKodu: koordinatorIli } });
  }

  if (danismanMi(kullanici)) {
    kosullar.push({
      isteyen: {
        ogrenciAtamalari: {
          some: { danismanKullaniciId: kullanici.id, bitisTarihi: null },
        },
      },
    });
  }

  if (kosullar.length === 0) return { id: { in: [] } };
  return { OR: kosullar };
}

/**
 * Raporlanabilecek faaliyetler — il koordinatörünün rapor modülü.
 *
 * Kapsam, GÖRÜNÜRLÜKTEN DAR: koordinatör başka illerin ulusal faaliyetlerini
 * listede görebiliyor ama onların raporunu yazmaz. Filtre bu yüzden faaliyetin
 * İLİNE bakar, görünürlük kurallarına değil.
 *
 * "İl" hesabı kapsam alanlarından okunamaz: okul içi faaliyette okulun ili,
 * ulusal faaliyette düzenleyenin ili geçerlidir (bkz. faaliyetKapsamiCikar).
 * Sorgu üçünü de kapsıyor.
 */
export function raporlanabilirFaaliyetFiltresi(
  kullanici: OturumKullanicisi,
): Prisma.FaaliyetWhereInput {
  if (projeYoneticisiMi(kullanici)) return {};

  const ilKodu = koordinatorIlKodu(kullanici);
  if (ilKodu !== null) {
    return {
      OR: [
        { ilKodu },
        { kurum: { ilKodu } },
        { duzenleyen: { ilKodu } },
        // Kendi açtığı faaliyet her koşulda kendisine ait.
        { duzenleyenKullaniciId: kullanici.id },
      ],
    };
  }

  // Danışman öğretmen yalnızca KENDİ açtığı faaliyetin raporunu yazar.
  return { duzenleyenKullaniciId: kullanici.id };
}
```

### `src/lib/yetki/log.ts`

```ts
import type { LogHedefTip, LogIslemi } from "@/generated/prisma/enums";
import { prisma } from "../db";

/**
 * Erişim logu — SKILL.md "Değişmezler" 7: her veri görüntüleme ve değiştirme
 * işlemi loglanır. Yorum silme ve dosya kaldırma da buraya yazılır; ayrı bir
 * içerik log tablosu yoktur.
 */

export interface LogKaydi {
  kullaniciId: number;
  islem: LogIslemi;
  hedefTip: LogHedefTip;
  hedefId: string | number;
  ipAdresi?: string | null;
  detay?: string | null;
}

/**
 * İsteği yapan IP adresi. Yalnızca HTTP isteği bağlamında vardır.
 *
 * `next/headers` DİNAMİK yükleniyor: gecelik senkron gibi istek bağlamı
 * olmayan işler de aynı log fonksiyonunu kullanıyor ve orada modülün kendisi
 * ya da headers() çağrısı hata verir. IP yüzünden log kaydı düşmemeli, o
 * yüzden hata yutuluyor ve alan null kalıyor.
 *
 * Uygulama ters vekil (nginx) arkasında çalıştığından gerçek IP
 * `x-forwarded-for` başlığındadır; zincirin ilki istemcidir.
 */
async function istekIpAdresi(): Promise<string | null> {
  try {
    const { headers } = await import("next/headers");
    const basliklar = await headers();
    const iletilen = basliklar.get("x-forwarded-for");
    if (iletilen) return iletilen.split(",")[0]?.trim() || null;
    return basliklar.get("x-real-ip");
  } catch {
    return null;
  }
}

export async function erisimLogla(kayit: LogKaydi): Promise<void> {
  await prisma.erisimlogu.create({
    data: {
      kullaniciId: kayit.kullaniciId,
      islem: kayit.islem,
      hedefTip: kayit.hedefTip,
      hedefId: String(kayit.hedefId),
      ipAdresi: kayit.ipAdresi ?? (await istekIpAdresi()),
      detay: kayit.detay ?? null,
    },
  });
}

/** Birden çok kaydın tek seferde görüntülenmesi (liste ekranları) için. */
export async function erisimLoglaCoklu(kayitlar: LogKaydi[]): Promise<void> {
  if (kayitlar.length === 0) return;
  const ip = await istekIpAdresi();
  await prisma.erisimlogu.createMany({
    data: kayitlar.map((kayit) => ({
      kullaniciId: kayit.kullaniciId,
      islem: kayit.islem,
      hedefTip: kayit.hedefTip,
      hedefId: String(kayit.hedefId),
      ipAdresi: kayit.ipAdresi ?? ip,
      detay: kayit.detay ?? null,
    })),
  });
}
```

### `src/lib/yetki/tipler.ts`

```ts
import type { Kapsam, RolKodu } from "@/generated/prisma/enums";

/** Kullanıcının aktif (bitiş tarihi yazılmamış) rolü ve o rolün kapsamı. */
export interface AktifRol {
  rolKodu: RolKodu;
  /** IL_KOORDINATOR rolünün ili. */
  ilKodu: string | null;
  /** DANISMAN rolünün okulu. */
  kurumKodu: number | null;
}

/**
 * Oturumdaki kullanıcının yetki kararları için gereken asgari bilgisi.
 * Yetki, rolün kendisinden değil rolün bağlı olduğu kurum/ilden gelir.
 */
export interface OturumKullanicisi {
  id: number;
  authProviderId: string;
  ad: string;
  soyad: string;
  kurumKodu: number | null;
  ilKodu: string | null;
  ilceKodu: string | null;
  sinif: string | null;
  brans: string | null;
  egitimOgretimYili: string;
  roller: AktifRol[];
}

/** Yetki kararlarında kullanılan faaliyet bilgisi. */
export interface FaaliyetKapsami {
  id: number;
  kapsam: Kapsam;
  kurumKodu: number | null;
  ilKodu: string | null;
  duzenleyenKullaniciId: number;
  onayliMi: boolean;
  /**
   * Faaliyetin bağlı olduğu il. Kapsam alanlarından türetilemez: okul içi
   * faaliyette okulun ili, ulusal faaliyette düzenleyenin ilidir. Yalnızca
   * yetki devri kararında kullanılır (bkz. yetkiDevrolduMu).
   */
  kapsamIlKodu?: string | null;
  /**
   * Düzenleyen hâlâ görevde mi? `false` ise değerlendirme ve moderasyon
   * yetkisi ilin koordinatörüne devrolur. Belirtilmezse "görevde" varsayılır.
   */
  duzenleyenGorevdeMi?: boolean;
  /**
   * Faaliyeti bir öğrenci mi açtı? Öğrencinin açtığı faaliyet her kapsamda
   * onaya tabidir ve onayı, YEĞİTEK'in yanında öğrencinin ilinin koordinatörü
   * de verebilir. Belirtilmezse `false` varsayılır — eksik veriyle onay
   * yetkisini genişletmek yerine dar tarafta kalıyoruz.
   */
  duzenleyenOgrenciMi?: boolean;
  /**
   * Faaliyeti danışman öğretmen mi açtı? Öğrenci faaliyetiyle AYNI kapıdan
   * geçer: ikisi de ilin koordinatörünün onayına tabidir. İki alan ayrı
   * tutuluyor çünkü onay dışındaki akışlarda (bildirim metni, ekranda
   * gösterilen gerekçe) ikisi farklı şeyler söylüyor.
   *
   * Belirtilmezse `false` varsayılır — eksik veriyle onay yetkisini
   * genişletmek yerine dar tarafta kalıyoruz.
   */
  duzenleyenDanismanMi?: boolean;
  /**
   * Faaliyeti mezun / paydaş temsilcisi / mentör mü açtı? (7 Ağustos 2026)
   *
   * Öğrenci ve danışman faaliyetiyle AYNI kapıdan geçer: üçü de ilin
   * koordinatörünün onayına tabidir. Ayrı alan tutuluyor çünkü onay dışındaki
   * akışlarda (bildirim metni, kartta yazan düzenleyen birim) üçü farklı
   * şeyler söylüyor — "Öğrenci girişimi" ile "Paydaş girişimi" aynı şey değil.
   *
   * Belirtilmezse `false` varsayılır.
   */
  duzenleyenDisKullaniciMi?: boolean;
}

export class YetkiHatasi extends Error {
  constructor(mesaj = "Bu işlem için yetkiniz yok") {
    super(mesaj);
    this.name = "YetkiHatasi";
  }
}

/**
 * Kaynağın varlığını bile sızdırmamak gereken durumlarda kullanılır:
 * kapsamı dışındaki bir faaliyet 403 değil 404 döner
 * (bkz. references/permissions.md Bölüm 4).
 */
export class BulunamadiHatasi extends Error {
  constructor(mesaj = "Kayıt bulunamadı") {
    super(mesaj);
    this.name = "BulunamadiHatasi";
  }
}
```
