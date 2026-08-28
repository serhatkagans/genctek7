import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import {
  baglantiKoptuMu,
  BOSTA_KALMA_SURESI_MS,
  havuzSiniriniCoz,
} from "./db-havuz";
import { ortam } from "./ortam";

/*
 * Geliştirme sırasında Next.js modülleri sık yeniden yüklediği için bağlantı
 * havuzunu global nesnede saklıyoruz; aksi halde her yenilemede yeni havuz
 * açılır.
 *
 * İKİ İSTEMCİ TUTULUYOR ve bu ayrım düzeltmenin çekirdeği:
 *   `prismaIstemci` — uygulamanın kullandığı, yeniden deneme uzantılı istemci.
 *   `prismaTemel`   — aynı havuzun uzantısız hâli. Yeniden deneme BUNUN
 *                     üzerinde yapılıyor; uzantılı istemci üzerinde yapılsaydı
 *                     tekrar aynı uzantıya girer, veritabanı gerçekten
 *                     kapalıyken deneme kendini sonsuza kadar çağırırdı.
 */
const globalNesne = globalThis as unknown as {
  prismaIstemci?: PrismaClient;
  prismaTemel?: PrismaClient;
  prismaSurumu?: string;
};

/**
 * BU DOSYANIN SÜRÜM DAMGASI (28 Ağustos 2026).
 *
 * Global'de saklanan istemci, süreç yaşadığı sürece yaşıyor: `next dev` modülü
 * yeniden yüklese bile ESKİ KODUN kurduğu istemci yerinde kalıyor. Havuz
 * arızasının düzeltmesi ilk kez yazıldığında bu görüldü — düzeltme depoya
 * girdi, testler geçti, ama çalışan sunucu hâlâ eski koda ait ölü istemciyi
 * kullandığı için ekranda hiçbir şey değişmedi; ancak sunucu elle yeniden
 * başlatılınca düzeldi.
 *
 * Damga bunu kapatıyor: bu dosyada istemcinin kurulumuyla ilgili bir şey
 * değiştiğinde damgayı da değiştirin, global'deki eski istemci ilk erişimde
 * atılıp yenisi kurulsun. Damga DEĞİŞMEDİĞİ sürece istemci paylaşılmaya devam
 * eder — yani sıradan bir yeniden yükleme yeni havuz açmaz.
 */
const ISTEMCI_SURUMU = "2026-08-28-havuz-yenileme";

/**
 * DÜŞEN BAĞLANTIYI BİR KEZ YENİDEN DENE (21 Ağustos 2026).
 *
 * BELİRTİ: geliştirme sırasında sayfalar rastgele "Server has closed the
 * connection" ile 500 dönüyor; yenileyince düzeliyor. Havuzun boşta kalma
 * süresi zaten kısaltıldı (bkz. db-havuz.ts · BOSTA_KALMA_SURESI_MS) ama
 * yereldeki `prisma dev` sunucusu bunun DIŞINDA da arada bağlantı düşürüyor —
 * uygulama açılırken, hiç boşta beklemeden. Kullanıcının gördüğü şey, kendi
 * yaptığı işle hiç ilgisi olmayan bir hata ekranı.
 *
 * Bu sarmalayıcı yalnızca BAĞLANTININ KOPTUĞUNU söyleyen hatalarda devreye
 * giriyor ve sorguyu kısa bir bekleyişten sonra tekrarlıyor.
 *
 * YALNIZCA GELİŞTİRMEDE. Üretimde aynı hata bir yük devretmesi (failover) ya
 * da sunucu yeniden başlatması demek olabilir ve o durumda YAZAN bir sorgunun
 * sunucuya ulaşıp ulaşmadığını bilemeyiz: tekrarlamak, aynı kaydı ikinci kez
 * yazma riski taşır. Geliştirmede bu risk kabul edilebilir, üretimde değil —
 * bu yüzden davranış ortama bağlı ve varsayılan olarak KAPALI.
 *
 * ---------------------------------------------------------------------------
 * `$disconnect` KALDIRILDI — DÜZELTME HATANIN KENDİSİ OLMUŞTU (28 Ağustos 2026)
 * ---------------------------------------------------------------------------
 * İlk sürüm, ölü soketten kurtulmak için yeniden denemeden ÖNCE
 * `istemci.$disconnect()` çağırıyordu. `@prisma/adapter-pg` bunu altta
 * `pool.end()` olarak uyguluyor ve `pg`'de kapatılmış bir havuz BİR DAHA
 * KULLANILAMAZ — adaptör tek bir havuzla kurulduğu için Prisma yerine yenisini
 * de açmıyor.
 *
 * Sonuç, düzeltmenin amaçladığının tam tersiydi: tek bir geçici kopukluk global
 * istemciyi KALICI olarak öldürüyordu. O andan itibaren her sayfa "Cannot use a
 * pool after calling end on the pool" ile 500 dönüyor ve tablo yalnızca
 * `next dev` yeniden başlatılınca düzeliyordu. Kullanıcı tarafında görünüşü:
 * girişten sonra panel hiç açılmıyor (hata kimliği 3222233624).
 *
 * ARTIK: havuz kapatılmıyor, İSTEMCİ YENİLENİYOR. Ölü istemci arka planda
 * bırakılıyor, yerine taze bir tanesi kuruluyor, sorgu onun ÜZERİNDE
 * tekrarlanıyor ve yeni istemci global'e yazıldığı için sonraki istekler de
 * doğrudan sağlam havuza gidiyor.
 */
function bekle(ms: number): Promise<void> {
  return new Promise((coz) => setTimeout(coz, ms));
}

interface IstemciCifti {
  /** Uzantısız istemci; yeniden deneme bunun üzerinde yapılır. */
  temel: PrismaClient;
  /** Uygulamaya verilen istemci (geliştirmede yeniden deneme uzantılı). */
  disaAcik: PrismaClient;
}

/**
 * Ölü istemciyi bırakır, yerine yenisini kurar ve global'e yazar.
 *
 * ESKİSİ BEKLENMEDEN KAPATILIYOR (`void`): `$disconnect` ölü bir sokette
 * takılabilir ve çağıran zaten kullanıcının isteğini bekletiyor. Amaç kaynağı
 * bırakmak; ne zaman bırakıldığı önemli değil.
 *
 * YARIŞ KORUMASI: eş zamanlı iki istek aynı anda kopukluk görebilir. İkincisi,
 * global'deki temel istemcinin artık kendi ölü istemcisi OLMADIĞINI görür ve
 * ikinci bir yenileme yapmaz — yoksa az önce kurulan taze istemci hemen çöpe
 * atılırdı. Karşılaştırma temel istemci üzerinden yapılıyor: uzantılı istemciyi
 * kıyaslamak, uzantının içindeki kapanışın elinde temel istemci olduğu için her
 * seferinde "farklı" sonucunu verirdi.
 */
function istemciYenile(olen: PrismaClient): PrismaClient {
  if (globalNesne.prismaTemel && globalNesne.prismaTemel !== olen) {
    return globalNesne.prismaTemel;
  }

  void olen.$disconnect().catch(() => {
    // Havuz zaten kapalıysa sorun değil; amaç kaynağı bırakmak.
  });

  const cift = ciftOlustur();
  globalNesne.prismaIstemci = cift.disaAcik;
  globalNesne.prismaTemel = cift.temel;
  globalNesne.prismaSurumu = ISTEMCI_SURUMU;
  return cift.temel;
}

function yenidenDenemeliIstemci(temel: PrismaClient): PrismaClient {
  return temel.$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        try {
          return await query(args);
        } catch (hata) {
          if (!baglantiKoptuMu(hata)) throw hata;

          /*
           * TEKRAR YENİ İSTEMCİ ÜZERİNDE YAPILIYOR, `query(args)` ile DEĞİL:
           * `query` bu uzantının kurulduğu istemciye bağlı ve o istemcinin
           * havuzu ölü. Aynı kapıyı ikinci kez çalmak ilk hatanın aynısını
           * verirdi — 21 Ağustos sürümünün düzeltemediği nokta tam buydu.
           */
          const yeni = istemciYenile(temel);

          /*
           * TEK deneme: ikinci kez de düşüyorsa sorun anlık bir kopukluk değil,
           * sunucunun kendisi. Sessizce tekrar tekrar denemek, ayakta olmayan
           * bir veritabanını gizler ve sayfayı yalnızca yavaşlatır. Tekliği
           * `yeni`nin UZANTISIZ olması sağlıyor: bu çağrı aynı yakalama
           * bloğuna geri düşmez.
           */
          await bekle(120);

          /*
           * `model` boş olan işlemler istemcinin kendi üzerindedir
           * (`$queryRaw`, `$executeRaw`); modeli olanlar delegenin üzerinde.
           */
          const kapi = yeni as unknown as Record<string, unknown>;
          const hedef = model
            ? (kapi[model] as Record<string, (girdi: unknown) => Promise<unknown>>)
            : (kapi as Record<string, (girdi: unknown) => Promise<unknown>>);

          return await hedef[operation](args);
        }
      },
    },
  }) as unknown as PrismaClient;
}

function ciftOlustur(): IstemciCifti {
  const temel = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: ortam.DATABASE_URL,
      /*
       * Havuz sınırı AÇIKÇA veriliyor: `DATABASE_URL` içindeki
       * `connection_limit` Prisma'ya özgüdür ve bu adaptör onu okumaz
       * (bkz. db-havuz.ts). Verilmezse adrese yazılan sınır sessizce düşer.
       */
      max: havuzSiniriniCoz(ortam.DATABASE_URL),
      /*
       * Boşta kalan bağlantı, sunucu onu kapatmadan ÖNCE bırakılır. Ayar
       * olmadan havuz ölü bağlantıyı sıradaki isteğe veriyor ve sayfa "Server
       * has closed the connection" ile 500 dönüyordu
       * (bkz. db-havuz.ts · BOSTA_KALMA_SURESI_MS).
       */
      idleTimeoutMillis: BOSTA_KALMA_SURESI_MS,
    }),
  });

  return process.env.NODE_ENV === "production"
    ? { temel, disaAcik: temel }
    : { temel, disaAcik: yenidenDenemeliIstemci(temel) };
}

function guncelIstemci(): PrismaClient {
  if (
    !globalNesne.prismaIstemci ||
    globalNesne.prismaSurumu !== ISTEMCI_SURUMU
  ) {
    /* Eski sürümden kalan istemci varsa kaynağı bırakılıyor (gerekçe: damga). */
    const eski = globalNesne.prismaTemel;
    if (eski) {
      void eski.$disconnect().catch(() => {
        // Havuzu zaten ölü olabilir; damga tam da bu yüzden var.
      });
    }

    const cift = ciftOlustur();
    globalNesne.prismaIstemci = cift.disaAcik;
    globalNesne.prismaTemel = cift.temel;
    globalNesne.prismaSurumu = ISTEMCI_SURUMU;
  }
  return globalNesne.prismaIstemci;
}

/**
 * ÜRETİMDE DOĞRUDAN İSTEMCİ, GELİŞTİRMEDE VEKİL (proxy).
 *
 * `istemciYenile` istemcinin kendisini değiştiriyor; `prisma` sabit bir nesneye
 * bağlansaydı, onu içeri almış olan modüller ÖLÜ istemciyi tutmaya devam eder
 * ve yenileme yalnızca o anki isteği kurtarırdı. Vekil her erişimde global'deki
 * güncel istemciye bakıyor, böylece yenileme bütün çağrı yerlerine yayılıyor.
 *
 * ÜRETİM YOLU DEĞİŞMİYOR: orada yeniden deneme kapalı, istemci hiç
 * yenilenmiyor ve her sorguya bir vekil katmanı bindirmenin karşılığı yok.
 */
export const prisma: PrismaClient =
  process.env.NODE_ENV === "production"
    ? ciftOlustur().disaAcik
    : new Proxy({} as PrismaClient, {
        get(_hedef, ad) {
          const istemci = guncelIstemci();
          const deger = Reflect.get(istemci, ad, istemci);
          /*
           * Fonksiyonlar istemciye BAĞLANARAK veriliyor: `prisma.$transaction`
           * vekilden çıplak alınsaydı `this` kaybolur ve Prisma içeride kendi
           * alanlarını bulamazdı. Model delegeleri (`prisma.kullanici`) nesne
           * olarak dönüyor, onların `this`i zaten kendileri.
           */
          return typeof deger === "function" ? deger.bind(istemci) : deger;
        },
      });
