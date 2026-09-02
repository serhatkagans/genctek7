/**
 * PROJE İLERLEME DURUMU — yol haritası verisi ve saf kuralları (3 Eylül 2026).
 *
 * ---------------------------------------------------------------------------
 * NİYE VAR
 * ---------------------------------------------------------------------------
 * Sistemde ne yapıldığının tarih tarih kaydı bugüne kadar YALNIZCA git
 * geçmişindeydi. Orası doğru kaynak ama proje yöneticisinin eline geçmiyor:
 * commit listesini okumak için depoya erişmek, başlıkları teknik bağlamıyla
 * eşleştirmek ve "bu sunucuda çalışıyor mu" sorusunu ayrıca sormak gerekiyor.
 * Bu ekran o üç işi tek listeye indiriyor.
 *
 * ---------------------------------------------------------------------------
 * DURUM ELLE TUTULUR, ÜRETİLMEZ
 * ---------------------------------------------------------------------------
 * Maddelerin durumu git'ten TÜRETİLEMEZ ve türetilmeye çalışılmamalı:
 * commit'lenmiş olmak yayında olmak değildir. Sunucuya yayın ayrı bir komutla
 * (`dagitim/guncelle.sh`) elle yapılıyor; bir işin sunucuda koşup koşmadığını
 * depo bilmiyor. `TESTTE` tam olarak bu aralığı anlatıyor: kod hazır ve
 * denendi, sunucuda henüz yok.
 *
 * Bu yüzden dosya elle güncellenir. Bir madde yayına çıktığında durumu
 * `YAYINDA` yapılır ve `yayinTarihi` yazılır — `bitis` işin bittiği,
 * `yayinTarihi` sunucuya çıktığı gündür; ikisi aynı gün olmak zorunda değil.
 *
 * ---------------------------------------------------------------------------
 * TARİHLER Date DEĞİL, DÜZ METİN
 * ---------------------------------------------------------------------------
 * Tarihler `Date` olarak tutulsaydı takvim günü saat dilimine göre kayardı:
 * `new Date("2026-07-30")` UTC gece yarısıdır ve sunucunun dilimi UTC iken bir
 * gün geriye düşen biçimlendirmeler bu projede zaten yaşandı (bkz.
 * lib/tarih.ts). Burada saat bilgisi hiç yok — yalnızca takvim günü var — bu
 * yüzden metin olarak tutulup metin olarak biçimlendiriliyor.
 */

export type IlerlemeDurumu =
  | "PLANLANDI"
  | "TASARIMDA"
  | "GELISTIRILIYOR"
  | "TESTTE"
  | "YAYINDA";

/** Özet şeridinin ve rozetlerin sırası: en erken aşamadan yayına. */
export const DURUM_SIRASI: readonly IlerlemeDurumu[] = [
  "PLANLANDI",
  "TASARIMDA",
  "GELISTIRILIYOR",
  "TESTTE",
  "YAYINDA",
];

export const DURUM_ETIKETI: Record<IlerlemeDurumu, string> = {
  PLANLANDI: "Planlandı",
  TASARIMDA: "Tasarımda",
  GELISTIRILIYOR: "Geliştiriliyor",
  TESTTE: "Testte",
  YAYINDA: "Yayında",
};

/**
 * Genel ilerlemede bir maddenin ağırlığı.
 *
 * İLERLEME "BİTEN MADDE / TOPLAM MADDE" DEĞİL. Öyle olsaydı testteki üç
 * madde, hiç başlanmamış bir maddeyle aynı sayılırdı; oysa aralarındaki fark
 * işin neredeyse tamamı. Ara aşamalar eşit basamaklarla puanlanıyor: bir madde
 * her aşama atladığında yüzde aynı miktarda artıyor.
 */
export const DURUM_AGIRLIGI: Record<IlerlemeDurumu, number> = {
  PLANLANDI: 0,
  TASARIMDA: 0.25,
  GELISTIRILIYOR: 0.5,
  TESTTE: 0.75,
  YAYINDA: 1,
};

/**
 * Rozet rengi. Renk sözlüğü panelin geri kalanıyla aynı: `olumlu` biten iş,
 * `uyari` üstünde çalışılan iş, `notr` henüz başlanmamış iş.
 *
 * `hata` KULLANILMIYOR: hiçbir madde arızalı değil, en fazla beklemede.
 * Kırmızı rozet, ertelenmiş bir işi bozuk bir işten ayırt edilemez kılardı.
 */
export const DURUM_ROZETI: Record<
  IlerlemeDurumu,
  "notr" | "olumlu" | "uyari" | "vurgu"
> = {
  PLANLANDI: "notr",
  TASARIMDA: "notr",
  GELISTIRILIYOR: "uyari",
  TESTTE: "vurgu",
  YAYINDA: "olumlu",
};

export type YolHaritasiMaddesi = {
  /** Ekranda basılan sıra numarası; listedeki yerinden bağımsız sabit kalır. */
  sira: number;
  baslik: string;
  durum: IlerlemeDurumu;
  /** Tek cümlelik ne olduğu — madde listesinin üstünde durur. */
  ozet: string;
  /** İşin başladığı takvim günü, `YYYY-AA-GG`. */
  baslangic: string;
  /** İş birden çok güne yayıldıysa son gün. Tek günlük işlerde verilmez. */
  bitis?: string;
  /**
   * Sunucuya çıktığı gün. YAYINDA olmayan maddede bulunmaz; YAYINDA olup da
   * yazılmamışsa yayın günü kayıt altına alınmamış demektir.
   */
  yayinTarihi?: string;
  /** Maddenin kapsamı — ekranda madde madde basılır. */
  maddeler: string[];
  /** İz sürmek için ilgili commit'ler; ekranda basılmaz, kaynak notudur. */
  commitler?: string[];
  /** Durum neden bu — özellikle YAYINDA olmayan maddelerde şart. */
  not?: string;
};

/**
 * GENÇTEK YOL HARİTASI.
 *
 * Sıra KRONOLOJİK, öncelik sırası değil: liste "ne zaman ne yapıldı"yı
 * anlatıyor, "önce hangisi yapılmalı"yı değil. Bitmemiş işler bu yüzden
 * listenin sonunda toplanıyor — başa da alınabilirlerdi ama o zaman ekran bir
 * yapılacaklar listesine dönüşür ve yapılanların tarih tarih dökümü olma işini
 * kaybederdi.
 */
export const YOL_HARITASI: readonly YolHaritasiMaddesi[] = [
  {
    sira: 1,
    baslik: "Çekirdek sistem ve veri modeli",
    durum: "YAYINDA",
    ozet:
      "GençTek Bilgi Sistemi'nin ilk sürümü: roller, kapsam yetkileri ve temel envanterler ayağa kalktı.",
    baslangic: "2026-07-30",
    yayinTarihi: "2026-07-30",
    maddeler: [
      "Öğrenci, danışman öğretmen, il koordinatörü ve merkez rolleri",
      "Kapsam filtresi fail-closed kuruldu: yetkisi olmayan kayıt hiç sorgulanmıyor",
      "Prisma şeması, migrasyonlar ve başlangıç verisi",
      "Panel, giriş ve profil ekranlarının ilk hâli",
    ],
    commitler: ["578d074"],
  },
  {
    sira: 2,
    baslik: "Paydaş envanteri ve SMS bildirim kanalı",
    durum: "YAYINDA",
    ozet:
      "Paydaş temsilcileri sisteme girdi; bildirimler e-postanın yanında SMS ile de gidebiliyor.",
    baslangic: "2026-07-31",
    yayinTarihi: "2026-07-31",
    maddeler: [
      "Paydaş kurumu ve temsilci envanteri",
      "Katılımcı temelli etkinlik başvurusu",
      "SMS bildirim kanalı ve şablonları",
    ],
    commitler: ["5370f2c"],
  },
  {
    sira: 3,
    baslik: "İl koordinatörü rapor modülü",
    durum: "YAYINDA",
    ozet:
      "İl koordinatörü kendi ilinin faaliyet raporunu üretiyor; öğretmen faaliyetlerini onaylıyor.",
    baslangic: "2026-07-31",
    yayinTarihi: "2026-07-31",
    maddeler: [
      "Faaliyet raporu sayfası ve gizlilik taahhütnamesi",
      "Öğretmen faaliyet onayı",
      "İl dışı başvuruda çift onay: kaynak il ve hedef il",
      "Rapor çıktısına değerlendirme ve kazanımlar eklendi",
    ],
    commitler: ["2c8f457", "3174100", "5764c71", "d24bc46"],
  },
  {
    sira: 4,
    baslik: "Merkez istatistikleri ve toplu duyuru",
    durum: "YAYINDA",
    ozet:
      "Merkez ekosistemin sayılarını tek ekrandan görüyor ve seçtiği kitleye toplu bildirim gönderiyor.",
    baslangic: "2026-07-31",
    bitis: "2026-08-31",
    yayinTarihi: "2026-08-31",
    maddeler: [
      "Ekosistem istatistikleri ve faaliyet raporu",
      "Toplu duyuru: öğrenci, öğretmen, ekip ve topluluklara ayrı ayrı",
      "İl koordinatörünün toplu mesajı kendi iliyle sınırlı",
    ],
    commitler: ["62627fe", "b84db81"],
  },
  {
    sira: 5,
    baslik: "İletişim modülü: bağlantı, yazışma, moderasyon",
    durum: "YAYINDA",
    ozet:
      "Kullanıcılar bağlantı kurup yazışıyor; 18 yaş altı için gözetim kuralları devrede.",
    baslangic: "2026-07-31",
    bitis: "2026-08-26",
    yayinTarihi: "2026-08-26",
    maddeler: [
      "Veri modeli, görünürlük filtreleri ve moderasyon",
      "Bağlantı onayı ve yazışma tek ekranda: Bağlantılarım",
      "18 yaş altı yazışması danışman gözetiminde",
      "Doğrudan yazışma açıldı; okunmamış satır kırmızı çerçeveli",
    ],
    commitler: ["02cef76", "55c05cd", "a01e87f", "74dec65", "a20b3a7"],
  },
  {
    sira: 6,
    baslik: "Öğrenci paneli ve kişisel gelişim",
    durum: "YAYINDA",
    ozet:
      "Öğrencinin kendi ekranı: katkısı, kazanımları, rotası ve öz değerlendirmesi.",
    baslangic: "2026-07-31",
    bitis: "2026-08-26",
    yayinTarihi: "2026-08-26",
    maddeler: [
      "Katkı kartı, bağlantılar, ilçe temsilciliği ve faaliyet önerisi",
      "Kazanım sekmelerine GençTek etkinlikleri ve Diğer eklendi",
      "Algoritmam öz değerlendirme envanteri",
      "Profil bölümleri sadeleşti; öğretmen profili öğrenciyle aynı oldu",
    ],
    commitler: ["a7388b4", "faa7a56", "001c746"],
  },
  {
    sira: 7,
    baslik: "Profil fotoğrafı ve kişisel dosyalar",
    durum: "YAYINDA",
    ozet: "Her kullanıcı kendi fotoğrafını ve özgeçmişini yükleyebiliyor.",
    baslangic: "2026-07-31",
    bitis: "2026-08-11",
    yayinTarihi: "2026-08-11",
    maddeler: [
      "Profil fotoğrafı yükleme ve silme",
      "PDF özgeçmiş",
      "Yüklenen dosyalar depolama dizininde tutuluyor, depoda değil",
    ],
    commitler: ["69bfc0e", "fbea1d8"],
  },
  {
    sira: 8,
    baslik: "Yedekleme ve geri yükleme",
    durum: "YAYINDA",
    ozet:
      "Veritabanı gecelik yedekleniyor; geri yükleme provası yapıldı ve kırık komut düzeltildi.",
    baslangic: "2026-07-31",
    yayinTarihi: "2026-07-31",
    maddeler: [
      "Yedekleme cron'u (dagitim/yedek.sh)",
      "Geri yükleme provası — yedek gerçekten açılıyor mu, denendi",
      "DAGITIM.md'deki hatalı cron kullanıcısı düzeltildi",
    ],
    commitler: ["94937ac", "1bf42eb"],
  },
  {
    sira: 9,
    baslik: "Katılım ve teşekkür belgesi",
    durum: "YAYINDA",
    ozet:
      "Resmî şablon üzerine yazdırılabilir belge; tek yazdırmayla N sayfalık tek PDF.",
    baslangic: "2026-07-31",
    bitis: "2026-08-26",
    yayinTarihi: "2026-08-26",
    maddeler: [
      "Katılım ve teşekkür belgesi, resmî şablon üzerine",
      "Toplu belge üretimi: tek yazdırma, tek PDF",
      "Menüye Belge Oluştur girişi",
      "Belge metni GençTek kalıbına döndü; iki türde ortak",
      "Belge yalnız yoklamada katılmış görünene üretiliyor",
    ],
    commitler: ["fa3360c", "a760237", "0606f9b", "768dc67", "8fb7629"],
  },
  {
    sira: 10,
    baslik: "Çalışma grupları ve etkinlik akışı",
    durum: "YAYINDA",
    ozet:
      "Etkinlik öneri–onay–başvuru–değerlendirme zinciri ve çalışma grubu listesi tamamlandı.",
    baslangic: "2026-07-31",
    bitis: "2026-08-26",
    yayinTarihi: "2026-08-26",
    maddeler: [
      "Bilişim Hukuku, Güvenli İnternet, GençX ve Diğer grupları",
      "Yeni faaliyet formuna katılım biçimi, hedef kitle ve Diğer",
      "Öğretmen il ve ulusal etkinlik açabiliyor",
      "Etkinlik sayfası açılır bölümlere ayrıldı; bilgi notu ve belgeleme ayrı",
      "İptal edilen etkinlikte onay ve pencere rozetleri gizleniyor",
    ],
    commitler: ["3b468d0", "3d3debe", "d2fa2ce", "bc6fb46", "faa3fd8"],
  },
  {
    sira: 11,
    baslik: "Ağustos istek turları",
    durum: "YAYINDA",
    ozet:
      "5–14 Ağustos arasında toplanan kullanıcı istekleri turlar hâlinde kapatıldı.",
    baslangic: "2026-08-05",
    bitis: "2026-08-14",
    yayinTarihi: "2026-08-14",
    maddeler: [
      "5–6 Ağustos listesi: 25 madde tamamlandı, biten maddeler arşive taşındı",
      "7 Ağustos: profil/panel ayrımı, mentörlük, menü küçültme",
      "10 Ağustos: danışman bırakma, market sadeleştirme, bildirim hedefi",
      "11 Ağustos: onay kuyrukları, danışman bırakma, PDF özgeçmiş",
      "12 Ağustos: yoklama, belge kapısı, bildirim arşivi, görev rolleri süzgeci",
    ],
    commitler: ["1a23e71", "65fa95f", "d60895a", "ae66ee2", "fbea1d8", "3b9cbd8"],
  },
  {
    sira: 12,
    baslik: "Bağlantılarım ve ekosistem akışı",
    durum: "YAYINDA",
    ozet:
      "Ekosistemin sosyal katmanı: hakkımda, gönderi, yorum ve gönderiden doğrudan bağlantı.",
    baslangic: "2026-08-12",
    bitis: "2026-08-21",
    yayinTarihi: "2026-08-21",
    maddeler: [
      "Akış: hakkımda, gönderi ve yorum",
      "Akıştaki gönderiden bağlantı kurma",
      "Bağlantılarım'a Gönderdiğim istekler",
      "Gözetim satırında aynı okulun iki kez yazılması düzeltildi",
    ],
    commitler: ["25ddaa8", "030b5d7", "890c87b", "f1956f0"],
  },
  {
    sira: 13,
    baslik: "Mentörlük",
    durum: "YAYINDA",
    ozet:
      "Akran ve uzman mentörlüğü; başvuru, onay ve mentörlükten ayrılma hiyerarşiye bağlandı.",
    baslangic: "2026-08-13",
    bitis: "2026-08-28",
    yayinTarihi: "2026-08-28",
    maddeler: [
      "Mentör sayfası ve panoda mentör havuzu ızgarası",
      "Öğrenci de mentörlüğe başvurabiliyor (onaya tabi)",
      "Mentör onayı merkezde",
      "Mentörlük kaldırma hiyerarşisi, referanslar ve özgeçmiş",
      "Mentörlük bir rol değil, onaya bağlı kayıt",
    ],
    commitler: ["13dd018", "cba613f", "4c6881b", "8933f57", "cda82e4"],
  },
  {
    sira: 14,
    baslik: "Yönetim paneli",
    durum: "YAYINDA",
    ozet:
      "İl koordinatörü ve merkez için kart düzeninde tek giriş; kırılım il → ilçe → okul.",
    baslangic: "2026-08-11",
    bitis: "2026-08-31",
    yayinTarihi: "2026-08-31",
    maddeler: [
      "Her birim kartında okul, öğretmen, danışman, öğrenci ve etkinlik sayısı",
      "Kartın altında o birimin eksikleri",
      "Erişim kayıtları, toplu mesaj ve sistem ayarları üst menüden karta taşındı",
      "Onay kartlarında bekleyen iş sayısı",
      "İl kişi listesi, sütun süzgeçleri ve okul temsilcim kartı",
    ],
    commitler: ["4c6881b", "93b7261", "b84db81"],
  },
  {
    sira: 15,
    baslik: "Excel raporlama, envanter ve grafikler",
    durum: "YAYINDA",
    ozet:
      "Manisa karşılaştırmasından çıkan eksikler kapatıldı: okul/ekip envanteri ve grafikli raporlar.",
    baslangic: "2026-08-15",
    yayinTarihi: "2026-08-15",
    maddeler: [
      "Excel (xlsx) raporlama",
      "Okul ve ekip envanteri",
      "Yönetim grafikleri",
      "Ekranların çoğuna dışa aktarma bağlantısı",
    ],
    commitler: ["59c4d6f"],
  },
  {
    sira: 16,
    baslik: "Güvenlik turu I",
    durum: "YAYINDA",
    ozet:
      "Üretimde sahte giriş kapatıldı; oturum ömrü ve host doğrulaması geldi.",
    baslangic: "2026-08-16",
    yayinTarihi: "2026-08-16",
    maddeler: [
      "Üretimde mock giriş engeli",
      "Oturum ömrü sınırı",
      "Host başlığı doğrulaması",
      "Şema kayması giderildi: beş indeks schema.prisma'ya işlendi",
    ],
    commitler: ["f191572", "ef6a54d"],
  },
  {
    sira: 17,
    baslik: "Tasarım yenilemesi",
    durum: "YAYINDA",
    ozet:
      "Prototipin görsel dili sisteme taşındı: poster bantlı kartlar, rozetler, zaman çizelgesi.",
    baslangic: "2026-08-18",
    bitis: "2026-08-21",
    yayinTarihi: "2026-08-21",
    maddeler: [
      "Posterli etkinlik kartı ve zengin raporlama",
      "Ortak bileşen kümesi: Kart, Rozet, Ölçü kartı, İlerleme çubuğu",
      "Yönetim panosu kartları da panel kartlarıyla aynı görünüme geçti",
      "Açılış ekranına ve sekme simgesine GençTek logosu",
    ],
    commitler: ["f6f201a", "679cacf", "5007f9a"],
  },
  {
    sira: 18,
    baslik: "Dağıtım hattı",
    durum: "YAYINDA",
    ozet:
      "Yayın hedefi genctek7'ye taşındı; sunucu depodan anonim HTTPS ile çekiyor.",
    baslangic: "2026-08-07",
    bitis: "2026-08-18",
    yayinTarihi: "2026-08-18",
    maddeler: [
      "Yayın betiği ve dağıtım belgesi gerçek duruma çekildi",
      "Sunucu dağıtım anahtarı yerine anonim HTTPS ile çekiyor",
      "Alt dizin kurulumunda kırılan ham yollar düzeltildi",
      "Yerel başlatma ve durdurma betikleri",
    ],
    commitler: ["2107038", "f4cda27", "b789104", "88d9152"],
  },
  {
    sira: 19,
    baslik: "Hata kayıtları ve izleme",
    durum: "YAYINDA",
    ozet:
      "Kullanıcının ekranda gördüğü hata kimliğinin karşılığı panelden okunabiliyor.",
    baslangic: "2026-08-19",
    bitis: "2026-08-21",
    yayinTarihi: "2026-08-21",
    maddeler: [
      "Hata kayıtları ekranı, aya göre dosyalama ve arama",
      "Tarayıcı hataları da sunucuya kayda geçiyor",
      "Günlüğe yazılamıyorsa ekran bunu söylüyor — boş liste yanıltmıyor",
      "Günlüğe kişisel veri yazılmıyor",
    ],
    commitler: ["a99016d", "c71ba92"],
  },
  {
    sira: 20,
    baslik: "Market ve talep panosu",
    durum: "YAYINDA",
    ozet:
      "Ürün vitrini onaya bağlandı; talep panosu ilanlarıyla birlikte çalışıyor.",
    baslangic: "2026-08-14",
    bitis: "2026-08-28",
    yayinTarihi: "2026-08-28",
    maddeler: [
      "Market vitrini onaya bağlandı, Onay bekliyor rozeti",
      "Ürün onayı her kapıda soruluyor",
      "Pano ilan onayı ve kategoriler",
      "Panoda ilanlar en üste alındı",
      "Vitrin kapağı",
    ],
    commitler: ["6bb0784", "17ae63e", "12c143e", "e13d0d4", "cda82e4"],
  },
  {
    sira: 21,
    baslik: "Güvenlik turu II",
    durum: "YAYINDA",
    ozet:
      "Giriş yüzeyi sertleştirildi: hız sınırları, atomik sayaç ve hesap varlığı sızıntısının kapatılması.",
    baslangic: "2026-08-27",
    yayinTarihi: "2026-08-27",
    maddeler: [
      "Atomik giriş denemesi sayacı",
      "Giriş ve parola sıfırlama uçlarına hız sınırı",
      "Parola sıfırlama isteğine bekleme süresi",
      "Başvuru ekranı hesabın var olup olmadığını artık açık etmiyor",
      "next 16.3.3'e yükseltildi",
    ],
    commitler: ["05fc78a", "edbd20b", "1e67621"],
  },
  {
    sira: 22,
    baslik: "Portal için açık uçlar",
    durum: "YAYINDA",
    ozet:
      "Herkese açık portalın beslendiği iki uç: etkinlikler ve ekosistem sayıları.",
    baslangic: "2026-08-20",
    bitis: "2026-08-28",
    yayinTarihi: "2026-08-28",
    maddeler: [
      "/api/acik-etkinlikler — portalın etkinlik listesi",
      "/api/acik-istatistik — ekosistem sayıları",
      "Açık uca il sayısı eklendi: ekosistem kaç ilde var",
      "Açık uçlar kişisel veri döndürmüyor",
    ],
    commitler: ["3761681", "ef64a63", "afb04c1"],
  },
  {
    sira: 23,
    baslik: "Gezinme düzeni",
    durum: "YAYINDA",
    ozet:
      "Panelde tek kırıntı yolu: her ekranda nereden gelindiği ve nerede olunduğu yazıyor.",
    baslangic: "2026-08-20",
    bitis: "2026-08-30",
    yayinTarihi: "2026-08-30",
    maddeler: [
      "Her sayfa başlığında geri bağlantısı",
      "Yönetim panelinden açılan tüm ekranlarda kırıntı yolu",
      "Giriş ekranında görev almamış öğretmen kalmadı",
      "İndirmeler bağlantı değil düğme oldu",
    ],
    commitler: ["980438e", "4a9de4a"],
  },
  {
    sira: 24,
    baslik: "GençTek Yolculuğum ve görevler",
    durum: "YAYINDA",
    ozet:
      "Bilişim Yolculuğum bölümlere ayrıldı; GençTek görevleri yönetilebilir ve başvurulabilir hâle geldi.",
    baslangic: "2026-08-21",
    bitis: "2026-08-28",
    yayinTarihi: "2026-08-28",
    maddeler: [
      "GençTek Yolculuğum ve görev listesi ayrıldı",
      "Görev başvuruları Onay kuyruğu ekranında karara bağlanıyor",
      "Görev başvurusu bildirimleri",
      "Yolculukta puan yerine yıldız; öğretmene toplu yolculuk ekranı",
    ],
    commitler: ["90eb9ee", "c8a5965", "e40c5ac", "4ba3a2b", "4a90bc1"],
  },
  {
    sira: 25,
    baslik: "Panel saatleri İstanbul saatiyle",
    durum: "TESTTE",
    ozet:
      "Kayıtlar üç saat geride görünüyordu; tüm ekranlarda saat İstanbul diliminde basılıyor.",
    baslangic: "2026-09-02",
    maddeler: [
      "Sunucu UTC koşuyor, ekran İstanbul saatiyle basıyor",
      "Erişim kayıtlarındaki üç saatlik kayma kapandı",
      "Tarih süzgeçleri de aynı dilimde değerlendiriliyor",
    ],
    commitler: ["5313d30"],
    not: "Depoya girdi ve denendi; sunucuya yayınlanması bekleniyor.",
  },
  {
    sira: 26,
    baslik: "KVKK Genelge uyumu",
    durum: "TESTTE",
    ozet:
      "Genelge 2/d, 3/e-3/g ve 4/ç maddeleri karşılandı: oturum izleri, imha politikası ve ilgili kişi başvurusu.",
    baslangic: "2026-09-02",
    maddeler: [
      "2/d — oturum izleri ve olağan dışı erişim örüntülerinin izlenmesi",
      "4/ç — ilgili kişi başvuru kuyruğu; yasal yanıt süresi 30 gün",
      "3/e ve 3/g — saklama süresi dolan verinin imha politikası",
      "İmha işinin zamanlayıcısı eklendi: gecelik iş aylardır sessizce ölüyormuş",
      "İlk girişte onay kapısı; onay tek düğmeyle veriliyor",
    ],
    commitler: ["41dfc1f", "a8d06eb", "9aa36ad", "0f48912"],
    not: "Depoya girdi ve denendi; sunucuya yayınlanması bekleniyor.",
  },
  {
    sira: 27,
    baslik: "Üç kopya çalışma ve yayın betiği",
    durum: "TESTTE",
    ozet:
      "Uygulama üç kopya koşuyor; yayın hepsini sırayla yeniliyor ve izlenmeyen dosyaya artık takılmıyor.",
    baslangic: "2026-09-02",
    maddeler: [
      "Üç kopya (cluster) çalışma; yayın kopyaları sırayla yeniliyor",
      "guncelle.sh, pull'dan önce izlenmeyen dosyaları yoldan çekiyor",
      "Yerel başlatma şemayı kendisi kuruyor",
    ],
    commitler: ["dfafbf1", "e8e39c7"],
    not:
      "Sahte depoda uçtan uca denendi ama SUNUCUYA YAYINLANMADI: bir sonraki yayın hâlâ eski betikle koşacak. Sunucuda /opt/genctek/scripts/kisi-disa-aktar.ts izlenmeyen dosya olarak duruyor.",
  },
  {
    sira: 28,
    baslik: "Oturum gövdesi ve dış kimlik düzeni",
    durum: "GELISTIRILIYOR",
    ozet:
      "Oturum çerezinin gövdesi ve dış kullanıcı giriş akışı yeniden düzenleniyor.",
    baslangic: "2026-09-03",
    maddeler: [
      "lib/auth/oturum-govde.ts ve oturum.ts yeniden düzenlendi",
      "Dış kimlik giriş akışı ve yetki tipleri buna göre güncelleniyor",
      "Testler yazıldı, çalışma ağacında duruyor",
    ],
    not: "Depoya henüz commit edilmedi; çalışma ağacında sürüyor.",
  },
  {
    sira: 29,
    baslik: "EBA / MEBBİS / e-Devlet tekil girişi",
    durum: "TASARIMDA",
    ozet:
      "Kurumsal kimlik entegrasyonunun sözleşmesi yazıldı; servis erişimi bekleniyor.",
    baslangic: "2026-08-16",
    maddeler: [
      "Hangi kaynaktan hangi alanın isteneceği belirlendi (10 kimlik alanı)",
      "SSO'dan gelmemesi gereken sütunlar listelendi",
      "Karara bağlanacak 5 noktanın biri kapandı: authProviderId TCKN olacak",
      "Kalan 4 nokta kurumdan yanıt bekliyor",
      "Yazılacak dosya belli: src/lib/auth/eba-provider.ts",
    ],
    not:
      "Belge hazır (kurulum/sso-veri-talebi.md) ama kod yazılmadı — kurum servislerine erişim gelmeden yazılamaz.",
  },
  {
    sira: 30,
    baslik: "Sunucu MTU kara deliği düzeltmesi",
    durum: "PLANLANDI",
    ozet:
      "Panelde ara ara çıkan 'Beklenmeyen bir hata' ekranının nedeni bulundu; düzeltme sunucuda uygulanmadı.",
    baslangic: "2026-08-21",
    maddeler: [
      "Neden bulundu: sunucu 1500 MTU ile gönderiyor, hat taşımıyor, ICMP uyarısı dönmüyor",
      "Büyük yanıtlar (yönetim panosu 63 KB) ilk tampondan sonra sessizce ölüyor",
      "Uygulanacak: net.ipv4.tcp_mtu_probing=1, kalıcısı /etc/sysctl.d/99-mtu.conf",
      "Yetmezse: iptables TCPMSS clamp-mss-to-pmtu",
      "Sonrasında 15 kez curl ile doğrulama",
    ],
    not:
      "Uygulamayla ilgisi yok, sunucu ayarı. sysctl yazan komutlar araçtan geçmiyor; sunucuda elle çalıştırılmalı.",
  },
  {
    sira: 31,
    baslik: "Üretim veritabanı havuzu",
    durum: "PLANLANDI",
    ozet:
      "Havuz kopya başına 4 bağlantı — yerel geliştirme için seçilmiş bir değer, 50 eşzamanlı kullanıcı için dar.",
    baslangic: "2026-08-21",
    maddeler: [
      "DATABASE_URL'de connection_limit yok; varsayılan 4",
      "Üç kopyayla toplam 12 bağlantı",
      "Yapılacak: .env'e &connection_limit=20 — derleme gerektirmiyor",
      "idleTimeoutMillis 1000 ms de yerel değer, gözden geçirilecek",
    ],
    not: "Tek satırlık .env değişikliği; sunucuda uygulanacak.",
  },
  {
    sira: 32,
    baslik: "Sunucudaki kişisel veri dosyasının imhası",
    durum: "PLANLANDI",
    ozet:
      "Kişi aktarımı için sunucuya bırakılan dosya gerçek kişisel veri taşıyor ve hâlâ duruyor.",
    baslangic: "2026-08-28",
    maddeler: [
      "/opt/genctek altındaki genctek-kisiler.json silinmeli",
      "Artık betikler /tmp'ye bırakılıyor, /opt/genctek içine değil",
      "DAGITIM.md ters vekil bölümü güncel değil: Apache/DirectAdmin kullanılıyor",
    ],
    not: "KVKK saklama politikasının kapsamı dışında kalan, elle bırakılmış dosya.",
  },
];

/**
 * Genel ilerleme yüzdesi — aşama ağırlıklarının ortalaması.
 *
 * Boş listede 0 döner; sıfıra bölmeyi önlemek için değil, "hiç madde yoksa
 * ilerleme yoktur" doğru cevap olduğu için.
 */
export function ilerlemeYuzdesi(
  maddeler: readonly YolHaritasiMaddesi[],
): number {
  if (maddeler.length === 0) return 0;

  const toplam = maddeler.reduce(
    (birikim, madde) => birikim + DURUM_AGIRLIGI[madde.durum],
    0,
  );

  return Math.round((toplam / maddeler.length) * 100);
}

/**
 * Her durumda kaç madde olduğu.
 *
 * HİÇ MADDESİ OLMAYAN DURUM DA 0 İLE DÖNER: özet şeridi beş kutuyu her zaman
 * aynı sırada basıyor. Eksik anahtar dönseydi şerit maddeler ilerledikçe
 * daralıp genişler, kutuların yeri kayardı.
 */
export function durumSayilari(
  maddeler: readonly YolHaritasiMaddesi[],
): Record<IlerlemeDurumu, number> {
  const sayilar = Object.fromEntries(
    DURUM_SIRASI.map((durum) => [durum, 0]),
  ) as Record<IlerlemeDurumu, number>;

  for (const madde of maddeler) {
    sayilar[madde.durum] += 1;
  }

  return sayilar;
}

const AY_ADLARI = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

/** `2026-07-31` → `31 Temmuz 2026`. Geçersiz girdi olduğu gibi döner. */
export function gunYaz(tarih: string): string {
  const parcalar = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tarih);
  if (!parcalar) return tarih;

  const [, yil, ay, gun] = parcalar;
  const ayAdi = AY_ADLARI[Number(ay) - 1];
  if (!ayAdi) return tarih;

  return `${Number(gun)} ${ayAdi} ${yil}`;
}

/**
 * Maddenin tarih satırı.
 *
 * AYNI AY İÇİNDEKİ ARALIKTA AY BİR KEZ YAZILIR ("26 – 28 Ağustos 2026"):
 * "26 Ağustos 2026 – 28 Ağustos 2026" iki kat uzun ve aradaki farkı okumayı
 * zorlaştırıyor. Aynı gün başlayıp biten iş tek tarih basar.
 */
export function tarihAraligiYaz(madde: YolHaritasiMaddesi): string {
  if (!madde.bitis || madde.bitis === madde.baslangic) {
    return gunYaz(madde.baslangic);
  }

  const ayniAy = madde.baslangic.slice(0, 7) === madde.bitis.slice(0, 7);
  if (ayniAy) {
    const gun = Number(madde.baslangic.slice(8, 10));
    return `${gun} – ${gunYaz(madde.bitis)}`;
  }

  return `${gunYaz(madde.baslangic)} – ${gunYaz(madde.bitis)}`;
}
