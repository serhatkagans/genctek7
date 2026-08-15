import type { NextConfig } from "next";

/**
 * Güvenlik başlıkları uygulamada tutulur, ters vekilde (nginx) değil.
 *
 * Vekil yapılandırması sunucu taşındığında geride kalır; başlıklar burada
 * olursa korumalar derlemeyle birlikte taşınır.
 */
const guvenlikBasliklari = [
  // Panel hiçbir yerde çerçeve içine alınmamalı: oturum çerezi SameSite=Lax
  // olduğu için tıklama hırsızlığı (clickjacking) tek gerçek risk.
  { key: "X-Frame-Options", value: "DENY" },
  // Yüklenen ek indirilirken tarayıcı MIME tipini tahmin etmeye kalkmasın.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Öğrenci kimliği içeren adresler dış sitelere referrer olarak sızmasın.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  /*
   * İçerik Güvenliği Politikası — XSS için son savunma hattı.
   *
   * Uygulama hiçbir yerde `dangerouslySetInnerHTML` kullanmıyor (kullanıcı
   * metni React tarafından kaçırılarak basılır, bkz. lib/metin/baglanti.ts),
   * yani bugün bilinen bir enjeksiyon yolu YOK. CSP o yüzden var: yarın
   * eklenecek bir bileşenin açtığı deliği, kimse fark etmeden kapalı tutar.
   *
   * 'unsafe-inline' SCRIPT İÇİN NİYE AÇIK: Next.js sunucu tarafında ürettiği
   * sayfayı istemcide canlandırmak için satır içi script yazar (RSC yükü,
   * __NEXT_DATA__). Bunları kapatmak, her isteğe nonce üreten bir ara katman
   * (middleware) gerektirir; uygulamada hiç middleware yok ve yalnızca bunun
   * için eklemek, korumanın getirdiğinden fazla kırılganlık getirirdi.
   * Yine de kalan kısıtlar değerli: dış kaynaktan script çekilemez
   * (script-src 'self'), sayfa çerçevelenemez, form başka bir siteye
   * gönderilemez ve veri dışarı sızdıracak bir bağlantı açılamaz.
   *
   * img-src'de data: VAR: belge/rozet üretiminde gömülü görseller kullanılıyor.
   */
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

/*
 * Uygulamanın kök dizini. Kendi alan adına kurulduğunda boş, bir alt dizine
 * kurulduğunda "/genctek" gibi bir değer alır.
 *
 * DERLEME ZAMANINDA sabitlenir: bağlantılar, varlık adresleri ve yönlendirmeler
 * bu öneke göre üretilir. Değeri değiştirdikten sonra YENİDEN DERLEMEK şart —
 * yalnızca ortam değişkenini değiştirmek işe yaramaz, sayfalar eski kökten
 * varlık istemeye devam eder.
 *
 * src/lib/ortam.ts aynı değeri çalışma zamanında okur ve çerez yolunu ona göre
 * daraltır; ikisi ayrı düşerse oturum açılır ama hiçbir sayfada görünmez.
 */
const temelYol = process.env.TEMEL_YOL ?? "";

const nextConfig: NextConfig = {
  output: "standalone",
  ...(temelYol ? { basePath: temelYol } : {}),
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/adapter-pg", "pg"],
  experimental: {
    // Yüklenen dosyalar depolama soyutlamasına gider; istek gövdesi sınırı
    // en büyük izin verilen belge boyutunun biraz üstünde tutulur.
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  async headers() {
    return [{ source: "/:yol*", headers: guvenlikBasliklari }];
  },
  /*
   * "Faaliyet" ekran dilinden kalktı, adres de "etkinlikler" oldu. Eski yol
   * KALICI OLARAK YAŞAMAYA DEVAM EDER: gönderilmiş bildirim e-postalarında ve
   * kullanıcıların yer imlerinde /panel/faaliyetler/... adresleri var, bunlar
   * geri alınamaz. Yönlendirme silinirse o bağlantılar 404 verir.
   *
   * Veritabanı tarafında ad değişmedi (faaliyet tablosu, lib/faaliyet/...):
   * ekran dili ile şema dili bilinçli olarak ayrı yaşıyor.
   */
  async redirects() {
    return [
      {
        source: "/panel/faaliyetler",
        destination: "/panel/etkinlikler",
        permanent: true,
      },
      {
        source: "/panel/faaliyetler/:yol*",
        destination: "/panel/etkinlikler/:yol*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
