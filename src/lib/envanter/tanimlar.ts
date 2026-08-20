/**
 * Algoritmam — öz değerlendirme envanterlerinin TANIMLARI (E).
 *
 * Bu dosya içeriğin tek kaynağıdır: madde metinleri, ölçek ve puanlama
 * anahtarı burada durur, veritabanında değil (gerekçe:
 * `prisma/migrations/20260806200000_algoritmam_envanterleri`).
 *
 * ---------------------------------------------------------------------------
 * İKİ TÜR ENVANTER VAR — ayrımı görmezden gelmeyin
 * ---------------------------------------------------------------------------
 * İstek yedi envanter sayıyor. Bunların bir kısmı YAYIMLANMIŞ, geçerlik ve
 * güvenirlik çalışması yapılmış ölçeklerdir; madde metinleri ve puanlama
 * anahtarları o çalışmaların ürünüdür ve TELİFE tabidir. Bir ölçeğin adını
 * taşıyıp maddelerini uydurmak, öğrenciye o ölçeğin sonucu diye uydurma bir
 * sonuç göstermek olurdu — bu yüzden yapılmadı.
 *
 *   · kaynak: "GENCTEK"    → maddeleri bu proje için YAZILDI, kullanıma hazır.
 *   · kaynak: "DIS_KAYNAK" → yayımlanmış ölçek. Maddeler BOŞ; metin ve
 *                            puanlama anahtarı hak sahibinden gelmeli.
 *                            Ekranda "içerik bekleniyor" diye görünür,
 *                            çözülemez. (→ SORULAR.md · S16)
 *
 * Dış kaynaklı bir ölçeğin maddeleri geldiğinde yapılacak tek şey aşağıdaki
 * ilgili tanımın `boyutlar` ve `maddeler` dizilerini doldurmaktır; motor,
 * ekranlar ve puanlama zaten hazır.
 *
 * ---------------------------------------------------------------------------
 * BU BİR TANI ARACI DEĞİLDİR
 * ---------------------------------------------------------------------------
 * Sonuçlar kişinin KENDİ beyanından üretilir. Ne bir yeteneği ölçer, ne bir
 * mesleğe yönlendirir, ne de bir eksiklik saptar. İstekteki amaç da bu:
 * "kendilerini geliştirebilecekleri alanları keşfeder". Ekranlardaki dil buna
 * uygun tutuldu (bkz. SONUC_CERCEVESI).
 */

/** Likert seçeneği. `deger` puanlamaya girer, `etiket` ekranda görünür. */
export interface OlcekSecenegi {
  deger: number;
  etiket: string;
}

export interface EnvanterBoyutu {
  kod: string;
  ad: string;
  /** Boyutun ne sorduğu — sonuç ekranında başlığın altına yazılır. */
  aciklama: string;
  /** Puan yüksek çıktığında gösterilen yorum. */
  yuksekYorum: string;
  /** Puan düşük çıktığında gösterilen yorum. Eksiklik dili KULLANILMAZ. */
  dusukYorum: string;
}

export interface EnvanterMaddesi {
  kod: string;
  metin: string;
  /** Hangi boyutu beslediği. Tanımdaki bir boyut kodu olmak zorunda. */
  boyut: string;
  /**
   * TERS PUANLANIR. Madde olumsuz yazıldığında ("... bırakırım") yüksek cevap
   * düşük beceri anlamına gelir; puanlama bunu çevirir.
   */
  tersMi?: boolean;
}

export type EnvanterKaynagi = "GENCTEK" | "DIS_KAYNAK";

export interface EnvanterTanimi {
  kod: string;
  ad: string;
  /** Listede kartın altındaki tek cümle. */
  ozet: string;
  /** Envanterin başında okutulan yönerge. */
  yonerge: string;
  kaynak: EnvanterKaynagi;
  /** Kimin yazdığı / neyin beklendiği. Ekranda GÖRÜNÜR — gizlenmez. */
  kaynakNotu: string;
  /**
   * Madde listesinin sürümü. Maddelerden biri değişir, eklenir ya da silinirse
   * BU ARTMALI: eski cevaplar yeni anahtarla puanlanmaz, "eski sürüm" diye
   * gösterilir.
   */
  surum: number;
  olcek: readonly OlcekSecenegi[];
  boyutlar: readonly EnvanterBoyutu[];
  maddeler: readonly EnvanterMaddesi[];
  /*
   * GEÇİCİ OLARAK KAPALI (20 Ağustos 2026 · istek: "ilgi beceri ve mesleki
   * envanterlerin başla butonları şu an devrede değil pasife getirelim").
   *
   * "İçeriği hazır değil"den AYRI bir durumdur ve ayrı olmak zorundadır:
   * hazırlık ölçütü madde sayısıdır (bkz. kurallar.ts · envanterHazirMi) ve
   * o ölçüt bu üç envanterde sağlanıyor — maddeleri yazılmış durumda. Kapalı
   * olan yalnızca ÇÖZÜLMESİ. Maddeleri silip "hazır değil" saymak, yazılmış
   * içeriği kaybetmek olurdu; tek bir "aktif" bayrağı ise "maddesi yok ama
   * açık" gibi tutarsız bir hâle izin verirdi.
   *
   * Değer bir GEREKÇEDİR, `true` değil: kart kapalı olduğunu söylerken
   * nedenini de yazıyor. Öğrenci "neden tıklayamıyorum" sorusunu ekranda
   * cevaplanmış bulmalı.
   *
   * Alan boşken envanter açıktır.
   */
  kapali?: string;
}

// ---------------------------------------------------------------------------
// Ortak ölçekler
// ---------------------------------------------------------------------------
// Beşli tutuldu: ortası olan bir ölçek, kararsız kalan öğrenciyi bir tarafa
// zorlamaz. Dörtlü ("ortası yok") daha ayırt edici sayılır ama burada amaç
// ayırt etmek değil, kişinin kendini tanıması.

const OLCEK_ILGI: readonly OlcekSecenegi[] = [
  { deger: 1, etiket: "Hiç ilgimi çekmiyor" },
  { deger: 2, etiket: "Az ilgimi çekiyor" },
  { deger: 3, etiket: "Kararsızım" },
  { deger: 4, etiket: "İlgimi çekiyor" },
  { deger: 5, etiket: "Çok ilgimi çekiyor" },
];

const OLCEK_YETERLIK: readonly OlcekSecenegi[] = [
  { deger: 1, etiket: "Hiç yapamam" },
  { deger: 2, etiket: "Zorlanırım" },
  { deger: 3, etiket: "Kısmen yaparım" },
  { deger: 4, etiket: "İyi yaparım" },
  { deger: 5, etiket: "Çok iyi yaparım" },
];

const OLCEK_UYGUNLUK: readonly OlcekSecenegi[] = [
  { deger: 1, etiket: "Hiç bana uygun değil" },
  { deger: 2, etiket: "Pek uygun değil" },
  { deger: 3, etiket: "Kararsızım" },
  { deger: 4, etiket: "Bana uygun" },
  { deger: 5, etiket: "Tamamen bana uygun" },
];

/**
 * Sonuç ekranının başında ve envanterin girişinde basılan çerçeve metni.
 *
 * Tek yerde duruyor çünkü iki ekranda da AYNI şeyi söylemesi gerekiyor: burada
 * çıkan sonuç bir teşhis değil, bir başlangıç noktasıdır.
 */
export const SONUC_CERCEVESI =
  "Buradaki sonuç senin kendi cevaplarından çıkar; bir yetenek ölçümü ya da " +
  "meslek tavsiyesi değildir. Düşük çıkan bir başlık 'yapamazsın' demek " +
  "değil, 'henüz denemedin' olabilir. Bir yıl sonra yeniden çözersen ne " +
  "değiştiğini görürsün.";

// ---------------------------------------------------------------------------
// 1. İlgi Envanteri — GençTek
// ---------------------------------------------------------------------------

const ILGI: EnvanterTanimi = {
  kod: "ILGI",
  ad: "İlgi Envanteri",
  ozet: "Teknolojinin hangi alanları ilgini çekiyor?",
  yonerge:
    "Aşağıdaki cümlelerin her biri için, o işin şu anda ilgini ne kadar " +
    "çektiğini işaretle. Yapabilip yapamadığını değil, İSTEYİP istemediğini " +
    "sor kendine — beceri ayrı bir envanterin konusu.",
  kaynak: "GENCTEK",
  kaynakNotu:
    "Maddeleri GençTek platformu için yazıldı; yayımlanmış bir ölçeğin " +
    "uyarlaması değildir.",
  surum: 1,
  olcek: OLCEK_ILGI,
  boyutlar: [
    {
      kod: "YAZILIM",
      ad: "Yazılım ve programlama",
      aciklama: "Kod yazmak, hata ayıklamak, bir şeyi çalışır hâle getirmek.",
      yuksekYorum:
        "Kodun kendisi seni çekiyor. Çalışma grubu etkinliklerinde geliştirme " +
        "tarafına, hackathon ve kod maratonlarına bakabilirsin.",
      dusukYorum:
        "Kod yazmak şimdilik ilgini çekmiyor. Teknolojide kod yazmadan da " +
        "üretilen çok alan var — aşağıdaki diğer başlıklara bak.",
    },
    {
      kod: "VERI_YZ",
      ad: "Veri ve yapay zekâ",
      aciklama: "Veriden anlam çıkarmak, modellerin nasıl öğrendiğini anlamak.",
      yuksekYorum:
        "Veriyle düşünmek hoşuna gidiyor. Veri okuryazarlığı ve yapay zekâ " +
        "çalışma grubu etkinlikleri sana göre.",
      dusukYorum:
        "Sayılarla ve modellerle uğraşmak şimdilik çekmiyor.",
    },
    {
      kod: "SIBER",
      ad: "Siber güvenlik",
      aciklama: "Sistemlerin nasıl kırıldığı ve nasıl korunduğu.",
      yuksekYorum:
        "Güvenlik tarafı ilgini çekiyor. CTF (Capture The Flag) etkinlikleri " +
        "ve güvenli internet çalışma grubu iyi bir başlangıç.",
      dusukYorum: "Güvenlik konuları şimdilik ilgi alanının dışında.",
    },
    {
      kod: "DONANIM",
      ad: "Donanım, robotik ve elektronik",
      aciklama: "Elle tutulur olanı kurmak, devre ve makine ile uğraşmak.",
      yuksekYorum:
        "Somut olanı kurmak seni çekiyor. Robotik ve maker atölyeleri, " +
        "sensörlü projeler tam sırası.",
      dusukYorum: "Donanım tarafı şimdilik ilgini çekmiyor.",
    },
    {
      kod: "TASARIM",
      ad: "Tasarım ve kullanıcı deneyimi",
      aciklama: "Bir şeyin nasıl göründüğü ve ne kadar kolay kullanıldığı.",
      yuksekYorum:
        "Görünüş ve kullanım kolaylığı senin için önemli. Ekip projelerinde " +
        "arayüz ve tanıtım tarafını üstlenmeyi dene.",
      dusukYorum: "Tasarım tarafı şimdilik öncelikli ilgin değil.",
    },
    {
      kod: "DIJITAL_TOPLUM",
      ad: "Teknoloji ve toplum",
      aciklama:
        "Teknolojinin insanları nasıl etkilediği; dijital haklar, güvenli " +
        "internet, doğru bilgi.",
      yuksekYorum:
        "Teknolojinin insana bakan yüzü ilgini çekiyor. Bilişim hukuku ve " +
        "güvenli internet çalışma grupları, akran eğitimi bu alanda.",
      dusukYorum: "Bu başlık şimdilik senin odağın değil.",
    },
  ],
  maddeler: [
    { kod: "ILGI_YAZILIM_1", boyut: "YAZILIM", metin: "Bir programın nasıl çalıştığını merak eder, içine bakmak isterim." },
    { kod: "ILGI_YAZILIM_2", boyut: "YAZILIM", metin: "Küçük de olsa kendi uygulamamı yazmak isterim." },
    { kod: "ILGI_YAZILIM_3", boyut: "YAZILIM", metin: "Bir hatayı bulana kadar uğraşmak bana ilginç gelir." },
    { kod: "ILGI_YAZILIM_4", boyut: "YAZILIM", metin: "Yeni bir programlama dili denemek ilgimi çeker." },

    { kod: "ILGI_VERI_1", boyut: "VERI_YZ", metin: "Sayılardan ve grafiklerden anlam çıkarmak ilgimi çeker." },
    { kod: "ILGI_VERI_2", boyut: "VERI_YZ", metin: "Yapay zekânın nasıl öğrendiğini merak ederim." },
    { kod: "ILGI_VERI_3", boyut: "VERI_YZ", metin: "Bir konuda veri toplayıp karşılaştırma yapmak isterim." },
    { kod: "ILGI_VERI_4", boyut: "VERI_YZ", metin: "Bir tahminin neden yanlış çıktığını araştırmak ilgimi çeker." },

    { kod: "ILGI_SIBER_1", boyut: "SIBER", metin: "Bir sistemin zayıf noktasının nerede olabileceğini merak ederim." },
    { kod: "ILGI_SIBER_2", boyut: "SIBER", metin: "Şifreleme ve gizlilik konuları ilgimi çeker." },
    { kod: "ILGI_SIBER_3", boyut: "SIBER", metin: "Hesaplarımın güvenlik ayarlarıyla uğraşmak hoşuma gider." },
    { kod: "ILGI_SIBER_4", boyut: "SIBER", metin: "Bir saldırının nasıl engellendiğini okumak ilgimi çeker." },

    { kod: "ILGI_DONANIM_1", boyut: "DONANIM", metin: "Cihazların içini açıp parçalarını incelemek isterim." },
    { kod: "ILGI_DONANIM_2", boyut: "DONANIM", metin: "Robot ya da devre kurmak ilgimi çeker." },
    { kod: "ILGI_DONANIM_3", boyut: "DONANIM", metin: "Bir makinenin hareketini kodla yönetmek isterim." },
    { kod: "ILGI_DONANIM_4", boyut: "DONANIM", metin: "3B yazıcı, sensör gibi araçlarla uğraşmak ilgimi çeker." },

    { kod: "ILGI_TASARIM_1", boyut: "TASARIM", metin: "Bir uygulamanın ekranının nasıl göründüğü benim için önemlidir." },
    { kod: "ILGI_TASARIM_2", boyut: "TASARIM", metin: "Renk, yazı ve düzen üzerinde oynamak hoşuma gider." },
    { kod: "ILGI_TASARIM_3", boyut: "TASARIM", metin: "Kullanımı zor bir şeyi nasıl kolaylaştırabileceğimi düşünürüm." },
    { kod: "ILGI_TASARIM_4", boyut: "TASARIM", metin: "Afiş, video ya da sunum tasarlamak ilgimi çeker." },

    { kod: "ILGI_TOPLUM_1", boyut: "DIJITAL_TOPLUM", metin: "Teknolojinin insanları nasıl etkilediğini tartışmak ilgimi çeker." },
    { kod: "ILGI_TOPLUM_2", boyut: "DIJITAL_TOPLUM", metin: "İnternette doğru bilgiyi ayırt etmeyi başkalarına anlatmak isterim." },
    { kod: "ILGI_TOPLUM_3", boyut: "DIJITAL_TOPLUM", metin: "Dijital haklar ve güvenli internet konuları ilgimi çeker." },
    { kod: "ILGI_TOPLUM_4", boyut: "DIJITAL_TOPLUM", metin: "Teknolojiyi toplumsal bir soruna çözüm olarak kullanmak isterim." },
  ],
  kapali:
    "Bu envanter şu anda çözüme kapalı. Madde metinleri ve puanlama anahtarı üzerinde çalışma sürüyor; açıldığında panelinizde görünecek.",
};

// ---------------------------------------------------------------------------
// 2. Beceri Envanteri — GençTek
// ---------------------------------------------------------------------------

const BECERI: EnvanterTanimi = {
  kod: "BECERI",
  ad: "Beceri Envanteri",
  ozet: "Bir işi yaparken hangi tarafın güçlü?",
  yonerge:
    "Her cümle için kendini bugün nerede görüyorsan onu işaretle. İstediğini " +
    "değil, YAPABİLDİĞİNİ düşün. Doğru cevap yok; kimse görmüyor.",
  kaynak: "GENCTEK",
  kaynakNotu:
    "Maddeleri GençTek platformu için yazıldı; yayımlanmış bir ölçeğin " +
    "uyarlaması değildir.",
  surum: 1,
  olcek: OLCEK_YETERLIK,
  boyutlar: [
    {
      kod: "PROBLEM",
      ad: "Problem çözme",
      aciklama: "Bir sorunu parçalara ayırmak, yolu planlamak, hatayı daraltmak.",
      yuksekYorum:
        "Karmaşık bir işi parçalayabiliyorsun. Ekip projelerinde kurgu ve " +
        "planlama tarafını üstlenmeyi dene.",
      dusukYorum:
        "Bir işe nereden başlanacağını kestirmek henüz zor gelebiliyor. " +
        "Küçük ve bitmesi kısa süren projeler bu tarafı hızla geliştirir.",
    },
    {
      kod: "OGRENME",
      ad: "Kendi başına öğrenme",
      aciklama: "Bilmediğini bulmak, kaynaktan öğrenmek, takıldığında yol açmak.",
      yuksekYorum:
        "Yeni bir konuya tek başına girebiliyorsun. Bu, hangi alanı seçersen " +
        "seç en çok işine yarayacak beceri.",
      dusukYorum:
        "Yeni bir konuya tek başına girmek henüz zorlayıcı. Danışman " +
        "öğretmeninden bir başlangıç kaynağı istemek en kısa yol.",
    },
    {
      kod: "TAKIM",
      ad: "Takım çalışması",
      aciklama: "Görev paylaşmak, anlaşmazlığı çözmek, yardım istemek.",
      yuksekYorum:
        "Grup içinde iş yürütebiliyorsun. Pano'da takım arkadaşı arayan " +
        "ilanlara bakmanın tam sırası.",
      dusukYorum:
        "Grup işleri henüz zorlayıcı gelebiliyor. İki kişilik küçük bir " +
        "projeyle başlamak, kalabalık bir ekipten kolaydır.",
    },
    {
      kod: "URETIM",
      ad: "Üretme ve bitirme",
      aciklama: "Başlanan işi çalışır bir çıktıya döndürmek.",
      yuksekYorum:
        "Başladığın işi bitirebiliyorsun. Ürünlerini profilindeki " +
        "'Ürünlerim' bölümüne eklemeyi unutma.",
      dusukYorum:
        "İşleri bitirmek henüz zor. Kapsamı küçültmek — 'her şeyi' değil " +
        "'çalışan en küçük hâlini' hedeflemek — en çok işe yarayan yöntem.",
    },
    {
      kod: "SUNUM",
      ad: "Anlatma ve paylaşma",
      aciklama: "Yaptığını başkasına aktarmak, sadeleştirmek, soru almak.",
      yuksekYorum:
        "Yaptığını anlatabiliyorsun. Akran eğitimi vermeyi düşünebilirsin — " +
        "'Paylaşan' seferi de böyle kazanılıyor.",
      dusukYorum:
        "Anlatmak henüz zorlayıcı. Önce yazıya dökmek, sonra bir kişiye " +
        "anlatmak, sonra gruba çıkmak işe yarayan bir sıradır.",
    },
  ],
  maddeler: [
    { kod: "BEC_PROBLEM_1", boyut: "PROBLEM", metin: "Büyük bir işi küçük adımlara bölebilirim." },
    { kod: "BEC_PROBLEM_2", boyut: "PROBLEM", metin: "Bir işe başlamadan önce sırasını planlarım." },
    { kod: "BEC_PROBLEM_3", boyut: "PROBLEM", metin: "İlk çözümüm işe yaramazsa başka bir yol denerim." },
    { kod: "BEC_PROBLEM_4", boyut: "PROBLEM", metin: "Bir hatanın nedenini adım adım daraltarak bulurum." },
    {
      kod: "BEC_PROBLEM_5",
      boyut: "PROBLEM",
      metin: "Çözümü bir süre bulamazsam uğraşmayı bırakırım.",
      tersMi: true,
    },

    { kod: "BEC_OGRENME_1", boyut: "OGRENME", metin: "Bilmediğim bir konuyu kendi başıma araştırıp öğrenebilirim." },
    { kod: "BEC_OGRENME_2", boyut: "OGRENME", metin: "Yabancı dildeki kaynakları anlamaya çalışırım." },
    { kod: "BEC_OGRENME_3", boyut: "OGRENME", metin: "Takıldığımda nereye bakacağımı bilirim." },
    { kod: "BEC_OGRENME_4", boyut: "OGRENME", metin: "Öğrendiğimi not alır, sonra tekrar bakarım." },
    { kod: "BEC_OGRENME_5", boyut: "OGRENME", metin: "Bir aracı, belgelerini okuyarak kullanmaya başlayabilirim." },

    { kod: "BEC_TAKIM_1", boyut: "TAKIM", metin: "Grup çalışmasında üstüme düşeni zamanında yaparım." },
    { kod: "BEC_TAKIM_2", boyut: "TAKIM", metin: "Farklı fikirdeki bir arkadaşımla ortak yol bulabilirim." },
    { kod: "BEC_TAKIM_3", boyut: "TAKIM", metin: "Yardım istemekten çekinmem." },
    { kod: "BEC_TAKIM_4", boyut: "TAKIM", metin: "Arkadaşımın işine kırmadan geri bildirim verebilirim." },
    { kod: "BEC_TAKIM_5", boyut: "TAKIM", metin: "Görev dağılımını konuşup netleştiririm." },

    { kod: "BEC_URETIM_1", boyut: "URETIM", metin: "Başladığım işi bitiririm." },
    { kod: "BEC_URETIM_2", boyut: "URETIM", metin: "Küçük de olsa ortaya çalışan bir şey çıkarabilirim." },
    { kod: "BEC_URETIM_3", boyut: "URETIM", metin: "Yaptığımı başkasının da kullanabileceği hâle getiririm." },
    { kod: "BEC_URETIM_4", boyut: "URETIM", metin: "Süre kısaldığında neyi çıkaracağıma karar verebilirim." },
    { kod: "BEC_URETIM_5", boyut: "URETIM", metin: "Bitirdiğim işe geri dönüp geliştiririm." },

    { kod: "BEC_SUNUM_1", boyut: "SUNUM", metin: "Yaptığım işi başkasına anlatabilirim." },
    { kod: "BEC_SUNUM_2", boyut: "SUNUM", metin: "Teknik bir konuyu bilmeyen birine sadeleştirerek anlatabilirim." },
    {
      kod: "BEC_SUNUM_3",
      boyut: "SUNUM",
      metin: "Topluluk önünde konuşmak beni çok zorlar.",
      tersMi: true,
    },
    { kod: "BEC_SUNUM_4", boyut: "SUNUM", metin: "Sunum ya da tanıtım hazırlayabilirim." },
    { kod: "BEC_SUNUM_5", boyut: "SUNUM", metin: "Soru gelince bilmediğimi rahatça söyleyebilirim." },
  ],
  kapali:
    "Bu envanter şu anda çözüme kapalı. Madde metinleri ve puanlama anahtarı üzerinde çalışma sürüyor; açıldığında panelinizde görünecek.",
};

// ---------------------------------------------------------------------------
// 3. Mesleki Yaklaşım Envanteri — GençTek
// ---------------------------------------------------------------------------
// BOYUT ADLARI SEFERLERİM İLE AYNI (keşfeden · üreten · paylaşan · lider ·
// elçi) — istek listesinde de bu beşli geçiyordu. Ortak sözlük bilinçli ama
// İKİSİ FARKLI ŞEY ölçer ve birbirini beslemez:
//
//   · Seferlerim  → NE YAPTIĞINI sayar. Katılım, ürün, eğitim, temsilcilik
//                   kayıtlarından türer; beyanla kazanılmaz.
//   · Bu envanter → NASIL YAKLAŞTIĞINI sorar. Tamamen kişinin beyanıdır.
//
// Bu yüzden envanter sonucu HİÇBİR SEVİYE KAZANDIRMAZ. Kazandırsaydı, bir
// formu doldurarak nişan alınabilirdi ve nişanların kurulduğu ilke
// ("beyanla nişan kazanılamaz") çökerdi.

const MESLEKI_YAKLASIM: EnvanterTanimi = {
  kod: "MESLEKI_YAKLASIM",
  ad: "Mesleki Yaklaşım Envanteri",
  ozet: "Bir işin içine girdiğinde hangi rolü doğal buluyorsun?",
  yonerge:
    "Aşağıdaki cümlelerin sana ne kadar uyduğunu işaretle. İyi ya da kötü rol " +
    "yok; hepsi bir ekipte gereken farklı yaklaşımlar.",
  kaynak: "GENCTEK",
  kaynakNotu:
    "Maddeleri GençTek platformu için yazıldı; yayımlanmış bir ölçeğin " +
    "uyarlaması değildir. Boyut adları 'Seferlerim' seviyeleriyle aynı " +
    "sözcükleri kullanır ama sonucu seviye kazandırmaz.",
  surum: 1,
  olcek: OLCEK_UYGUNLUK,
  boyutlar: [
    {
      kod: "KESFEDEN",
      ad: "Keşfeden",
      aciklama: "Önce araştırır, dener, bilmediği alana girmekten çekinmez.",
      yuksekYorum:
        "Yeni olana yönelmek sana doğal geliyor. Ekipte 'bunu bir araştırayım' " +
        "diyen kişi sensin.",
      dusukYorum:
        "Belirsiz alana girmek sana pek uymuyor; tanıdık zeminde daha rahatsın.",
    },
    {
      kod: "URETEN",
      ad: "Üreten",
      aciklama: "Konuşmaktansa yapar; elinde somut bir çıktı olmasını ister.",
      yuksekYorum:
        "Somut çıktı seni tatmin ediyor. Ekibin işi bitiren tarafı olabilirsin.",
      dusukYorum:
        "Tek başına üretmek senin öne çıkan tarafın değil; başka rollerde " +
        "daha rahat olabilirsin.",
    },
    {
      kod: "PAYLASAN",
      ad: "Paylaşan",
      aciklama: "Öğrendiğini anlatır, yardım eder, aktarırken daha iyi anlar.",
      yuksekYorum:
        "Aktarmak sana iyi geliyor. Akran eğitimi ve mentorluk sana uygun.",
      dusukYorum: "Anlatıcı rol senin doğal tarafın değil.",
    },
    {
      kod: "LIDER",
      ad: "Lider",
      aciklama: "Sorumluluğu üstlenir, görev dağıtır, işi takip eder.",
      yuksekYorum:
        "Sorumluluk almak sana uyuyor. Okul/il temsilciliği ve etkinlik " +
        "önerme yolları açık.",
      dusukYorum:
        "Grubu yönetmek senin öncelikli tarafın değil; bu bir eksiklik değil, " +
        "bir tercih.",
    },
    {
      kod: "ELCI",
      ad: "Elçi",
      aciklama: "Dışarıda temsil eder, yeni bağlantı kurar, köprü olur.",
      yuksekYorum:
        "Temsil etmek ve bağ kurmak sana uyuyor. İl geneli ve ulusal " +
        "etkinlikler, paydaş görüşmeleri sana göre.",
      dusukYorum: "Dışarıya dönük temsil rolü senin öne çıkan tarafın değil.",
    },
  ],
  maddeler: [
    { kod: "MY_KESFEDEN_1", boyut: "KESFEDEN", metin: "Yeni bir alan duyduğumda önce araştırmaya başlarım." },
    { kod: "MY_KESFEDEN_2", boyut: "KESFEDEN", metin: "Bir şeyi denemeden hakkında karar vermem." },
    { kod: "MY_KESFEDEN_3", boyut: "KESFEDEN", metin: "Alışılmışın dışındaki yolları merak ederim." },
    { kod: "MY_KESFEDEN_4", boyut: "KESFEDEN", metin: "Bilmediğim bir ortama girmek beni heyecanlandırır." },

    { kod: "MY_URETEN_1", boyut: "URETEN", metin: "Bir fikri konuşmaktansa yapıp göstermeyi tercih ederim." },
    { kod: "MY_URETEN_2", boyut: "URETEN", metin: "Elimde somut bir çıktı olmasından hoşlanırım." },
    { kod: "MY_URETEN_3", boyut: "URETEN", metin: "Ayrıntıları tamamlamak beni rahatlatır." },
    { kod: "MY_URETEN_4", boyut: "URETEN", metin: "Yarım kalan iş beni rahatsız eder." },

    { kod: "MY_PAYLASAN_1", boyut: "PAYLASAN", metin: "Öğrendiğimi hemen birine anlatmak isterim." },
    { kod: "MY_PAYLASAN_2", boyut: "PAYLASAN", metin: "Arkadaşım takıldığında yardım etmek hoşuma gider." },
    { kod: "MY_PAYLASAN_3", boyut: "PAYLASAN", metin: "Bildiğimi yazıya dökmekten keyif alırım." },
    { kod: "MY_PAYLASAN_4", boyut: "PAYLASAN", metin: "Bir konuyu anlatırken onu daha iyi anladığımı fark ederim." },

    { kod: "MY_LIDER_1", boyut: "LIDER", metin: "Bir işin başında kimse yoksa sorumluluğu üstlenirim." },
    { kod: "MY_LIDER_2", boyut: "LIDER", metin: "Görev dağıtmak bana zor gelmez." },
    { kod: "MY_LIDER_3", boyut: "LIDER", metin: "Grubun dağılan kararını toparlamaya çalışırım." },
    { kod: "MY_LIDER_4", boyut: "LIDER", metin: "Bir işin takvimini takip etmek bana uyar." },

    { kod: "MY_ELCI_1", boyut: "ELCI", metin: "Grubumu dışarıda temsil etmek beni rahatsız etmez." },
    { kod: "MY_ELCI_2", boyut: "ELCI", metin: "Yeni insanlarla tanışıp bağlantı kurmak hoşuma gider." },
    { kod: "MY_ELCI_3", boyut: "ELCI", metin: "Okulum ya da kurumum adına konuşmak bana uygun." },
    { kod: "MY_ELCI_4", boyut: "ELCI", metin: "Farklı yerlerden gelen kişilerle ortak iş yapabilirim." },
  ],
  kapali:
    "Bu envanter şu anda çözüme kapalı. Madde metinleri ve puanlama anahtarı üzerinde çalışma sürüyor; açıldığında panelinizde görünecek.",
};

// ---------------------------------------------------------------------------
// 4–7. Yayımlanmış ölçekler — İÇERİK BEKLENİYOR
// ---------------------------------------------------------------------------
// Aşağıdakilerin dördü de geçerlik–güvenirlik çalışması yapılmış, yayımlanmış
// ölçeklerdir. Madde metni ve puanlama anahtarı hak sahibinden gelmeli; izin
// alınmadan ve metin uydurularak yayına alınmaları hem telif hem de ölçme
// açısından yanlış olurdu (→ SORULAR.md · S16).
//
// Boş `maddeler` dizisi tesadüf değil, KAPIDIR: `envanterHazirMi` bunlara
// bakar ve ekran "içerik bekleniyor" durumunda kalır, çözülemez.

const TEKNOLOJI_LIDERLIGI: EnvanterTanimi = {
  kod: "TEKNOLOJI_LIDERLIGI",
  ad: "Teknoloji Liderliği Özyeterlilik Ölçeği",
  ozet: "Teknolojiyi yönlendirme konusunda kendine güvenin.",
  yonerge: "",
  kaynak: "DIS_KAYNAK",
  kaynakNotu:
    "Yayımlanmış bir ölçek. Madde metinleri, alt boyutları ve puanlama " +
    "anahtarı ile kullanım izni ölçeğin hak sahibinden gelmelidir.",
  surum: 1,
  olcek: [],
  boyutlar: [],
  maddeler: [],
};

const KISILIK: EnvanterTanimi = {
  kod: "KISILIK",
  ad: "Kişilik Envanteri",
  ozet: "Çalışma ve iletişim biçimin.",
  yonerge: "",
  kaynak: "DIS_KAYNAK",
  kaynakNotu:
    "Yayımlanmış bir envanter. Madde metinleri ve puanlama anahtarı hak " +
    "sahibinden gelmelidir. HANGİ ENVANTER OLDUĞU HÂLÂ BELİRLENMEDİ: ad " +
    "20 Ağustos 2026'da isteğe uyarak sadeleştirildi (\"Dick kişilik " +
    "envanteri sadece kişilik envanteri olacak\") ama içerik gelirken " +
    "ölçeğin adı ve sürümü de belirtilmeli — kart o adı gösterecek.",
  surum: 1,
  olcek: [],
  boyutlar: [],
  maddeler: [],
};

const EPAI: EnvanterTanimi = {
  kod: "EPAI",
  ad: "EPAI — Girişimcilik Potansiyeli Belirleme Envanteri",
  ozet: "Girişimcilik potansiyelin.",
  yonerge: "",
  kaynak: "DIS_KAYNAK",
  kaynakNotu:
    "Yayımlanmış bir envanter. Madde metinleri, alt boyutları ve puanlama " +
    "anahtarı ile kullanım izni hak sahibinden gelmelidir.",
  surum: 1,
  olcek: [],
  boyutlar: [],
  maddeler: [],
};

const ENTCOM: EnvanterTanimi = {
  kod: "ENTCOM",
  ad: "ENTCOM — Girişimci Özellikleri Envanteri",
  ozet: "Girişimci özelliklerin.",
  yonerge: "",
  kaynak: "DIS_KAYNAK",
  kaynakNotu:
    "Yayımlanmış bir envanter. Madde metinleri, alt boyutları ve puanlama " +
    "anahtarı ile kullanım izni hak sahibinden gelmelidir.",
  surum: 1,
  olcek: [],
  boyutlar: [],
  maddeler: [],
};

/**
 * Envanterlerin EKRANDAKİ SIRASI.
 *
 * Hazır olanlar önde: liste "çözülemez" kartlarla açılırsa bölüm boş görünür
 * ve öğrenci girip çıkar. İstek listesindeki sıra korunmadı, çünkü o sıra bir
 * öncelik değil bir sayımdı.
 *
 * Hazırlar kendi içinde ilgi → beceri → yaklaşım sırasında: ilgi en kolay
 * cevaplanandır ("ne isterim"), beceri kendini değerlendirmeyi gerektirir,
 * yaklaşım en soyutudur.
 */
export const ENVANTERLER: readonly EnvanterTanimi[] = [
  ILGI,
  BECERI,
  MESLEKI_YAKLASIM,
  TEKNOLOJI_LIDERLIGI,
  KISILIK,
  EPAI,
  ENTCOM,
];
