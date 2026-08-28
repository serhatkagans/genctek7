/**
 * GENÇTEK YOLCULUĞU — puan ve seviye kuralları (21 Ağustos 2026).
 *
 * İstek: "katkı nişanlarım … gençtek yolculuğum olsun, aşamalar şunlar olacak:
 * 'Hello World' · Keşifte · Harekette · Üretimde · Katkıda · Ufuk Açan · İz
 * Bırakan" — tasarım için elimizde iki taslak görsel var (rozet/seviye
 * sistemi), sayılar oradan esinlenildi.
 *
 * ---------------------------------------------------------------------------
 * PUAN ELLE VERİLMEZ, GEÇMİŞTEN TÜRETİLİR
 * ---------------------------------------------------------------------------
 * Rozetlerdeki ilkeyle aynı (bkz. lib/kazanim/rozetler.ts): puan tabloda
 * TUTULMAZ, her hesapta aynı veriden aynı sonuç çıkar. Sütunda tutulsaydı bir
 * kayıt silindiğinde puan asılı kalır, "bu puan nereden geldi" sorusunun
 * cevabı kaybolurdu.
 *
 * Bu dosya SAF: veritabanına gitmez, tarih üretmez. Sayıları çeken taraf
 * `lib/yolculuk/veri.ts`.
 *
 * ---------------------------------------------------------------------------
 * SEVİYE BİR MERDİVEN, ROZET BİR NİŞAN
 * ---------------------------------------------------------------------------
 * İkisi birbirinin yerine geçmiyor: rozet "şunu yaptın" der ve tek seferliktir;
 * seviye toplam katkının nerede olduğunu söyler ve geri gitmez — puan bir
 * kaydın silinmesiyle düşebilir, ama seviyeyi kaybetmek kişinin yaptığı işi
 * yapmamış saymak olurdu. Bu yüzden seviye, ULAŞILAN EN YÜKSEK eşiktir ve
 * hesap her zaman güncel puandan yapılır (kayıt silinirse puan da düşer;
 * kimseye "seviyen düştü" denmez, yalnızca sonraki eşiğe kalan puan artar).
 */

/**
 * Puan kaynağı — hem Seyir Defteri hem "GençTek Yolculuğum nasıl ilerliyor?"
 * listesi bundan basılır.
 *
 * DÖRT ETİKET — İKİYE İKİLİK BİR TABLO (28 Ağustos 2026). Kalem aynı, cümle
 * dört yerde dört ayrı kişi ve zamanla kuruluyor:
 *
 *   |                | OLAN (defter)   | OLABİLECEK (yol listesi) |
 *   |----------------|-----------------|--------------------------|
 *   | kendi ekranı   | "Mentör oldun"  | "Mentör ol"              |
 *   | öğretmen ekranı| "Mentör oldular"| "Mentör olurlar"         |
 *
 * Tek etiketle dördü de yanlış okunuyordu: yol listesi geçmiş zamanla
 * yazılınca yapılmamış işler yapılmış gibi duruyor, öğretmenin ekranı ikinci
 * tekil şahısla yazılınca öğrencilerinin kaydı öğretmenin kendi kaydı
 * sanılıyordu.
 *
 * METİNLER ELLE YAZILIYOR, ÜRETİLMİYOR: Türkçede şahıs ve kip ekini koddan
 * türetmek (ol → oldun → oldular → olurlar) ünlü uyumu ve düzensiz gövdeler
 * yüzünden sağlam yapılamaz; "sergilensin → sergilenir" gibi çatı değişimleri
 * ise hiç türetilemez.
 */
export interface PuanKaynagi {
  kod: string;
  etiket: string;
  /** Yolculuğun nasıl ilerlediğini anlatan liste için, emir kipinde. */
  yolEtiketi: string;
  /**
   * Öğretmenin ekranındaki topluluk defteri için: özne öğretmen değil
   * ÖĞRENCİLERİ ("Ekosisteme kayıt oldular").
   */
  topluEtiketi: string;
  /**
   * Öğretmenin ekranındaki yol listesi için, geniş zamanda: yapılmış bir iş
   * değil, öğrencilerin yolunu ilerleten şey ("Ekosisteme kayıt olurlar").
   */
  topluYolEtiketi: string;
  /** Bir kez yapıldığında kazanılan puan. */
  puan: number;
  /** Kaynağın kime gösterileceği; öğretmende olmayan ölçütler gizlenir. */
  kimde: "herkes" | "ogrenci" | "ogretmen";
}

/**
 * PUANLAR KÜÇÜK VE YAKIN TUTULDU. Tek bir eylemin (ör. etkinlik düzenleme) çok
 * yüksek puan getirmesi, seviyeyi "kim daha çok etkinlik açtı" yarışına
 * çevirirdi; oysa yolculuk katılımı, üretimi ve paylaşmayı birlikte sayıyor.
 */
export const PUAN_KAYNAKLARI: PuanKaynagi[] = [
  {
    kod: "KAYIT",
    etiket: "Ekosisteme kayıt oldun",
    yolEtiketi: "Ekosisteme kayıt ol",
    topluEtiketi: "Ekosisteme kayıt oldular",
    topluYolEtiketi: "Ekosisteme kayıt olurlar",
    puan: 1,
    kimde: "herkes",
  },
  {
    kod: "URUN",
    etiket: "Ürün / proje yükledin",
    yolEtiketi: "GençTek Vitrin'de ürünün sergilensin",
    topluEtiketi: "GençTek Vitrin'de ürün sergilediler",
    topluYolEtiketi: "GençTek Vitrin'de ürünleri sergilenir",
    puan: 1,
    kimde: "herkes",
  },
  {
    kod: "CALISMA_GRUBU",
    etiket: "Çalışma grubu seçtin",
    yolEtiketi: "Çalışma grubu seç",
    topluEtiketi: "Çalışma grubu seçtiler",
    topluYolEtiketi: "Çalışma grubu seçerler",
    puan: 1,
    kimde: "ogrenci",
  },
  {
    kod: "KATILIM",
    etiket: "GençTek etkinliğine katıldın",
    yolEtiketi: "GençTek etkinliklerine katıl",
    topluEtiketi: "GençTek etkinliklerine katıldılar",
    topluYolEtiketi: "GençTek etkinliklerine katılırlar",
    puan: 1,
    kimde: "herkes",
  },
  {
    kod: "MENTORLUK",
    etiket: "Mentör oldun",
    yolEtiketi: "Mentör ol",
    topluEtiketi: "Mentör oldular",
    topluYolEtiketi: "Mentör olurlar",
    puan: 2,
    kimde: "herkes",
  },
  {
    kod: "DENEYIM",
    etiket: "Deneyim, sertifika ya da derece eklendi",
    yolEtiketi: "Deneyim yükle",
    topluEtiketi: "Deneyim, sertifika ya da derece eklediler",
    topluYolEtiketi: "Deneyim yüklerler",
    puan: 1,
    kimde: "herkes",
  },
  /*
   * TEMSİLCİLİK VE GENÇTEK GÖREVİ AYRILDI (28 Ağustos 2026 · istek listesinde
   * ikisi ayrı satır). Önce tek kalemdi ("Temsilcilik ya da GençTek görevi
   * aldın") ve sayıları toplanıyordu; iki ayrı işi tek satırda toplamak,
   * defterde "× 3" gördüğünde hangisinin kaç kez olduğunu gizliyordu.
   *
   * Puanlar bölünmedi, ikisi de eskisi gibi 2: ayrım sunum tarafında olduğu
   * için kimsenin toplamı ve seviyesi bu değişiklikle kıpırdamıyor.
   */
  {
    kod: "TEMSILCILIK",
    etiket: "Temsilcilik görevi aldın",
    yolEtiketi: "Temsilci ol",
    topluEtiketi: "Temsilcilik görevi aldılar",
    topluYolEtiketi: "Temsilci olurlar",
    puan: 2,
    kimde: "herkes",
  },
  {
    kod: "GENCTEK_GOREVI",
    etiket: "GençTek görevi tamamladın",
    yolEtiketi: "GençTek Görevleri tamamla",
    topluEtiketi: "GençTek görevi tamamladılar",
    topluYolEtiketi: "GençTek Görevleri tamamlarlar",
    puan: 2,
    kimde: "herkes",
  },
  {
    kod: "AKRAN_EGITIMI",
    etiket: "Akran eğitimi verdin",
    yolEtiketi: "Akran Eğitimi ver",
    topluEtiketi: "Akran eğitimi verdiler",
    topluYolEtiketi: "Akran Eğitimi verirler",
    puan: 2,
    kimde: "ogrenci",
  },
  /*
   * EKİP ÜYELİĞİ (28 Ağustos 2026 · istek: "Topluluk/ekip/kulüp kur/katıl").
   * Sayılan şey ÜYELİKTİR, kurmak değil: ekibi öğrenciler kurmuyor, il
   * koordinatörü ve merkez kuruyor (bkz. permissions.md) — "kur" karşılığı bir
   * sayaç açmak, öğrenciye yetkisi olmayan bir yol göstermek olurdu.
   *
   * Ağırlığı 1: katılmak, çalışma grubu seçmekle aynı ölçekte bir adım.
   */
  {
    kod: "EKIP",
    etiket: "Topluluk / ekip / kulübe katıldın",
    yolEtiketi: "Topluluk, ekip ya da kulübe katıl",
    topluEtiketi: "Topluluk / ekip / kulübe katıldılar",
    topluYolEtiketi: "Topluluk/ekip/kulüp kurar ya da katılırlar",
    puan: 1,
    kimde: "herkes",
  },
  /*
   * ETKİNLİK DÜZENLEME ARTIK ÖĞRETMEN LİSTESİNDE (28 Ağustos 2026): öğrenciye
   * gösterilen yol listesinde istenmedi ve etkinliği fiilen okul/il tarafı
   * açıyor. `kimde` YALNIZCA LİSTEYİ süzer — daha önce etkinlik düzenlemiş bir
   * öğrencinin defterindeki satır ve puanı yerinde kalır.
   */
  {
    kod: "ETKINLIK_DUZENLEME",
    etiket: "Etkinlik düzenledin",
    yolEtiketi: "Etkinlik düzenle",
    topluEtiketi: "Etkinlik düzenlediler",
    topluYolEtiketi: "Etkinlik düzenlerler",
    puan: 2,
    kimde: "ogretmen",
  },
  {
    kod: "DANISMANLIK",
    etiket: "Danışmanlık yürütüyorsun",
    yolEtiketi: "Danışmanlık üstlen",
    topluEtiketi: "Danışmanlık yürütüyorlar",
    topluYolEtiketi: "Danışmanlık yürütürler",
    puan: 2,
    kimde: "ogretmen",
  },
];

export function puanKaynagi(kod: string): PuanKaynagi | undefined {
  return PUAN_KAYNAKLARI.find((kaynak) => kaynak.kod === kod);
}

/** Kişinin sayıları — her biri o kaynağın KAÇ KEZ gerçekleştiği. */
export interface YolculukGirdisi {
  katilimSayisi: number;
  urunSayisi: number;
  deneyimSayisi: number;
  calismaGrubuSayisi: number;
  akranEgitimiSayisi: number;
  duzenlenenEtkinlikSayisi: number;
  temsilcilikSayisi: number;
  gencTekGorevSayisi: number;
  ekipSayisi: number;
  mentorMu: boolean;
  aktifDanismanlikSayisi: number;
}

export interface PuanSatiri {
  kod: string;
  etiket: string;
  /** Kaç kez gerçekleşti. */
  adet: number;
  /** Birim puan. */
  puan: number;
  /** adet × puan. */
  toplam: number;
}

/**
 * Seviyeler ve eşikleri.
 *
 * "Hello World" SIFIR PUANLA BAŞLAR: sisteme giren herkes yolculuğun içindedir.
 * Boş bir seviye ("henüz seviyen yok") kişiye başlamadığını söylerdi; oysa
 * kayıt olmak da bir adımdır ve ilk puan oradan geliyor.
 *
 * Eşikler arası mesafe yukarı çıktıkça AÇILIYOR (3 · 5 · 7 · 10 · 15 · 20):
 * ilk seviyeler birkaç etkinlikle geçilebilmeli ki yolculuk görünür olsun;
 * üst seviyeler ise süreklilik istemeli.
 */
export interface SeviyeTanimi {
  kod: string;
  ad: string;
  /** Bu seviyeye girmek için gereken en düşük puan. */
  esik: number;
  aciklama: string;
  /**
   * Aynı basamağın öğretmen ekranındaki hâli (28 Ağustos 2026 · istek:
   * "metinleri de öğretmene göre 'Öğrencileriniz ekosisteme adım atıyor'
   * şeklinde değiştiriyoruz").
   *
   * AYRI ALAN, ÇEVİRİ DEĞİL: öğrenci metni ikinci tekil şahısta ("adım attın")
   * ve öğretmen ekranında o cümlenin öznesi yanlış kişi olurdu. Metni kodda
   * çevirmeye çalışmak (şahıs eki değiştirmek) Türkçede sağlam yapılamaz.
   */
  ogretmenAciklamasi: string;
}

export const YOLCULUK_SEVIYELERI: SeviyeTanimi[] = [
  {
    kod: "HELLO_WORLD",
    ad: '"Hello World"',
    esik: 0,
    aciklama: "Ekosisteme adım attın; yolculuk buradan başlıyor.",
    ogretmenAciklamasi:
      "Öğrencileriniz ekosisteme adım atıyor; yolculuk buradan başlıyor.",
  },
  {
    kod: "KESIFTE",
    ad: "Keşifte",
    esik: 3,
    aciklama: "Etkinliklere katılıyor, ekosistemi tanıyorsun.",
    ogretmenAciklamasi:
      "Öğrencileriniz etkinliklere katılıyor, ekosistemi tanıyor.",
  },
  {
    kod: "HAREKETTE",
    ad: "Harekette",
    esik: 8,
    aciklama: "Düzenli katılıyor, çalışma alanını seçiyorsun.",
    ogretmenAciklamasi:
      "Öğrencileriniz düzenli katılıyor, çalışma grubunu seçiyor.",
  },
  {
    kod: "URETIMDE",
    ad: "Üretimde",
    esik: 15,
    aciklama: "Kendi ürünlerini ve deneyimlerini ortaya koyuyorsun.",
    ogretmenAciklamasi:
      "Öğrencileriniz kendi ürünlerini ve deneyimlerini ortaya koyuyor.",
  },
  {
    kod: "KATKIDA",
    ad: "Katkıda",
    esik: 25,
    aciklama: "Görev alıyor, bildiğini paylaşıyor ve üretimi büyütüyorsun.",
    ogretmenAciklamasi:
      "Öğrencileriniz görev alıyor, bildiğini paylaşıyor ve üretimi büyütüyor.",
  },
  {
    kod: "UFUK_ACAN",
    ad: "Ufuk Açan",
    esik: 40,
    aciklama: "Başkalarına yol gösteriyor, etkinlik ve ekip kuruyorsun.",
    ogretmenAciklamasi:
      "Öğrencileriniz başkalarına yol gösteriyor, etkinlik ve ekip kuruyor.",
  },
  {
    kod: "IZ_BIRAKAN",
    ad: "İz Bırakan",
    esik: 60,
    aciklama: "Ekosistemin öncülerindensin; ardında kalıcı iş bırakıyorsun.",
    ogretmenAciklamasi:
      "Öğrencileriniz ekosistemin öncülerinden; ardında kalıcı iş bırakıyor.",
  },
];

export interface YolculukDurumu {
  /**
   * İç hesap birimi — EKRANDA GÖSTERİLMEZ, yalnızca seviyeyi ve ilerleme
   * yüzdesini üretir (bkz. yukarıdaki "puan içeride kalır" notu).
   */
  toplamPuan: number;
  /** Ekranda gösterilen ölçü: seviyenin sırası kadar yıldız. */
  yildiz: number;
  /** Puanın hangi kaynaklardan geldiği — yalnızca sıfırdan büyük satırlar. */
  dokum: PuanSatiri[];
  seviye: SeviyeTanimi;
  /** Bir sonraki seviye; en üstteyse null. */
  sonraki: SeviyeTanimi | null;
  /** Sonraki seviyeye kalan puan; en üstteyse 0. */
  kalanPuan: number;
  /**
   * Mevcut seviyenin İÇİNDEKİ ilerleme yüzdesi (0–100).
   *
   * İki eşik ARASINDAKİ mesafeye göre hesaplanıyor, toplam puana göre değil:
   * "60 puanın 42'sindesin" demek üst seviyelerde çubuğu neredeyse hiç
   * kıpırdatmazdı. En üst seviyede çubuk dolu.
   */
  yuzde: number;
}

/** Sayıları puan dökümüne çevirir; sıfır adetli satırlar elenir. */
export function puanDokumu(girdi: YolculukGirdisi): PuanSatiri[] {
  const adetler: Record<string, number> = {
    // Kayıt puanı herkeste bir kez: kişi zaten sistemin içinde.
    KAYIT: 1,
    KATILIM: girdi.katilimSayisi,
    URUN: girdi.urunSayisi,
    DENEYIM: girdi.deneyimSayisi,
    CALISMA_GRUBU: girdi.calismaGrubuSayisi,
    AKRAN_EGITIMI: girdi.akranEgitimiSayisi,
    ETKINLIK_DUZENLEME: girdi.duzenlenenEtkinlikSayisi,
    TEMSILCILIK: girdi.temsilcilikSayisi,
    GENCTEK_GOREVI: girdi.gencTekGorevSayisi,
    EKIP: girdi.ekipSayisi,
    MENTORLUK: girdi.mentorMu ? 1 : 0,
    DANISMANLIK: girdi.aktifDanismanlikSayisi,
  };

  return PUAN_KAYNAKLARI.map((kaynak) => {
    const adet = adetler[kaynak.kod] ?? 0;
    return {
      kod: kaynak.kod,
      etiket: kaynak.etiket,
      adet,
      puan: kaynak.puan,
      toplam: adet * kaynak.puan,
    };
  }).filter((satir) => satir.adet > 0);
}

/**
 * ---------------------------------------------------------------------------
 * PUAN İÇERİDE KALIR, EKRANDA YILDIZ GÖRÜNÜR (28 Ağustos 2026)
 * ---------------------------------------------------------------------------
 * İstek: "puanları göstermiyoruz, belki bir yıldız iki yıldız üç yıldız …
 * puan demeyelim". Bu dosyadaki puan hesabı DEĞİŞMEDİ — seviyeyi hâlâ o
 * belirliyor; değişen, kişiye ne gösterildiği.
 *
 * Sayı ekrandan kalktı çünkü sayı yarıştırır: "42 puan" iki kişinin
 * karşılaştırılabileceği bir ölçüdür ve yolculuğu kendi hızında ilerleyen bir
 * merdiven olmaktan çıkarıp sıralamaya çevirir. Yıldız ise nerede olduğunu
 * söyler, ne kadar önde olduğunu değil.
 *
 * YILDIZ SAYISI = SEVİYENİN SIRASI. İkinci bir ölçek TANIMLANMADI (ör. beş
 * yıldıza sıkıştırmak): ayrı eşikleri olan bir yıldız ölçeği, "kaç yıldızım
 * var" ile "hangi seviyedeyim" sorularının farklı cevaplar verebildiği iki
 * merdiven demek olurdu ve biri seviye eklendiğinde geride kalırdı. Böylece
 * yıldız, seviye adının sayıyla söylenmiş hâlidir — fazladan bilgi taşımaz,
 * yeni bir kural da getirmez.
 */
export const TOPLAM_YILDIZ = YOLCULUK_SEVIYELERI.length;

/**
 * Seviye adını cümle içinde tırnağa alır.
 *
 * NİYE FONKSİYON: ilk basamağın adı zaten tırnaklı — `"Hello World"`. Cümlede
 * elle tırnağa alınınca ekrana çift tırnak çıkıyordu:
 * `Öğrencilerinin çoğu ""Hello World"" aşamasında.` Adı tırnaksıza çevirmek
 * çözüm değil; o tırnaklar adın kendisine ait (bir kod dizgesi olduğu için
 * öyle yazıldı, bkz. YOLCULUK_SEVIYELERI).
 *
 * Bu yüzden karar tek yerde: adı zaten tırnakla başlıyorsa olduğu gibi
 * bırakılır, değilse tırnağa alınır. Cümlede seviye adı geçen her yer bundan
 * geçmeli — dört ekranda dört ayrı düzeltme, birinin geride kalması demekti.
 */
export function seviyeAdiTirnakli(ad: string): string {
  return ad.startsWith('"') ? ad : `"${ad}"`;
}

/** Seviyenin yıldız sayısı: ilk basamak bir yıldız, son basamak yedi. */
export function seviyeYildizi(kod: string): number {
  const sira = YOLCULUK_SEVIYELERI.findIndex((seviye) => seviye.kod === kod);
  return sira < 0 ? 1 : sira + 1;
}

/** Toplam puana karşılık gelen seviye — ulaşılan en yüksek eşik. */
export function seviyeBul(puan: number): SeviyeTanimi {
  let sonuc = YOLCULUK_SEVIYELERI[0];
  for (const seviye of YOLCULUK_SEVIYELERI) {
    if (puan >= seviye.esik) sonuc = seviye;
  }
  return sonuc;
}

export function yolculukDurumu(girdi: YolculukGirdisi): YolculukDurumu {
  const dokum = puanDokumu(girdi);
  const toplamPuan = dokum.reduce((toplam, satir) => toplam + satir.toplam, 0);

  const seviye = seviyeBul(toplamPuan);
  const sira = YOLCULUK_SEVIYELERI.findIndex((s) => s.kod === seviye.kod);
  const sonraki = YOLCULUK_SEVIYELERI[sira + 1] ?? null;

  const kalanPuan = sonraki ? Math.max(0, sonraki.esik - toplamPuan) : 0;
  const yuzde = sonraki
    ? Math.min(
        100,
        Math.round(
          ((toplamPuan - seviye.esik) / (sonraki.esik - seviye.esik)) * 100,
        ),
      )
    : 100;

  return {
    toplamPuan,
    yildiz: seviyeYildizi(seviye.kod),
    dokum,
    seviye,
    sonraki,
    kalanPuan,
    yuzde,
  };
}
