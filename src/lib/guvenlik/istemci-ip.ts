/**
 * İsteği yapan gerçek istemcinin IP adresi.
 *
 * NİYE ZİNCİRİN SONUNDAN OKUNUR: `x-forwarded-for` bir EKLEME zinciridir. Her
 * vekil, gördüğü adresi listenin SONUNA yazar; başındaki değerler istemciden
 * gelmiştir. nginx'in `$proxy_add_x_forwarded_for` yönergesi de Apache'nin
 * mod_proxy'si de böyle davranır — ikisi de gelen başlığı silmez, üstüne ekler.
 *
 * Zincirin İLKİNİ almak bu yüzden yanlıştı: `X-Forwarded-For: 1.2.3.4` yazan
 * bir istek gönderen herkes hem hız sınırını atlatabiliyor (her istekte başka
 * bir adres yazıp her seferinde yeni bir kova açmak) hem de KVKK erişim
 * kaydına istediği adresi yazdırabiliyordu (bkz. yetki/log.ts). İkincisi daha
 * ağır: denetim kaydının değeri, içindeki adresin doğruluğuna bağlı.
 *
 * Doğru değer sondan sayılarak bulunur. Zincir şöyle büyür:
 *
 *   istemci "sahte" yazar          → "sahte"
 *   1. vekil istemciyi ekler       → "sahte, GERÇEK"
 *   2. vekil 1. vekili ekler       → "sahte, GERÇEK, vekil1"
 *
 * Yani güvenilen vekil sayısı V ise, aranan değer sondan V. sıradadır —
 * `uzunluk - V` konumu. Öndeki her şey istemcinin uydurmasıdır ve atılır.
 *
 * SAF TUTULUR: vekil sayısı parametreyle gelir (kaynak `ortam.ts`), modül
 * ortam değişkenlerine gitmez. Böylece birim testle doğrulanır — ortam.ts'i
 * içe aktarmak testte açılışta hata verirdi (bkz. tests/ham-yol-taramasi.test.ts).
 */

/**
 * `x-forwarded-for` zincirinden istemci adresini çözer. Güvenilir bir adres
 * bulunamazsa `null` döner (yalnızca bu başlığa bakılır — gerekçe aşağıda).
 *
 * @param guvenilenVekilSayisi Uygulamanın önünde duran ve başlığa kendi
 *   gördüğü adresi ekleyen vekil sayısı. 0 ise uygulama doğrudan internete
 *   açıktır ve İLETİLEN BAŞLIKLARIN HİÇBİRİNE GÜVENİLMEZ: o kurulumda başlığı
 *   yazan tek taraf istemcinin kendisidir.
 */
export function istemciIpAdresi(
  basliklar: Headers,
  guvenilenVekilSayisi: number,
): string | null {
  if (guvenilenVekilSayisi <= 0) return null;

  const iletilen = basliklar.get("x-forwarded-for");
  if (iletilen) {
    const zincir = iletilen
      .split(",")
      .map((adres) => adres.trim())
      .filter((adres) => adres !== "");

    /*
     * Zincir beklenenden KISAYSA adres uydurulmuş sayılır ve `null` dönülür.
     * Bu, vekil sayısının yanlış yapılandırıldığı ya da isteğin vekili atlayıp
     * doğrudan uygulamaya geldiği durumdur; ikisinde de elde güvenilir bir
     * adres yoktur. Sağdan bir şey döndürmek, o hâli sessizce "çalışıyor" gibi
     * gösterirdi.
     */
    const konum = zincir.length - guvenilenVekilSayisi;
    if (konum < 0) return null;

    return zincir[konum] ?? null;
  }

  /*
   * `x-real-ip` YEDEĞİ BİLEREK YOK.
   *
   * Bir zamanlar zincir yoksa o başlığa bakılıyordu. Sorun, başlığın kimin
   * yazdığının uygulamadan görünmemesi: nginx yapılandırmamız onu
   * `$remote_addr` ile ezer (dagitim/nginx-genctek.conf) ve orada güvenilirdir,
   * ama üretimdeki Apache kurulumunda (DAGITIM.md Bölüm 13) başlığı kimse
   * yazmaz — istemcinin gönderdiği değer olduğu gibi buraya kadar gelir.
   * Uygulama ikisini ayırt edemez.
   *
   * Yedeği tutmanın bedeli, tam da kapatmaya çalıştığımız açığı ikinci bir
   * kapıdan geri açmaktı. Kaldırmanın bedeli ise yok denecek kadar az: iki
   * kurulumda da `x-forwarded-for` HER isteğe yazılır (nginx yapılandırmayla,
   * Apache mod_proxy ile), yani bu satıra zaten düşülmüyordu.
   *
   * Yalnızca X-Real-IP yazan bir vekilin arkasına kurulursa adres "bilinmeyen"
   * olur: hız sınırı sıkılaşır, erişim kaydında IP boş kalır. Güvenli yön bu.
   */
  return null;
}
