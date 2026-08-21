import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import {
  baglantiKoptuMu,
  BOSTA_KALMA_SURESI_MS,
  havuzSiniriniCoz,
} from "./db-havuz";
import { ortam } from "./ortam";

// Geliştirme sırasında Next.js modülleri sık yeniden yüklediği için bağlantı
// havuzunu global nesnede saklıyoruz; aksi halde her yenilemede yeni havuz açılır.
const globalNesne = globalThis as unknown as { prismaIstemci?: PrismaClient };

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
 * giriyor ve sorguyu kısa bir bekleyişten sonra tekrarlıyor; havuz bu arada
 * ölü bağlantıyı bırakıp yenisini açıyor.
 *
 * YALNIZCA GELİŞTİRMEDE. Üretimde aynı hata bir yük devretmesi (failover) ya
 * da sunucu yeniden başlatması demek olabilir ve o durumda YAZAN bir sorgunun
 * sunucuya ulaşıp ulaşmadığını bilemeyiz: tekrarlamak, aynı kaydı ikinci kez
 * yazma riski taşır. Geliştirmede bu risk kabul edilebilir, üretimde değil —
 * bu yüzden davranış ortama bağlı ve varsayılan olarak KAPALI.
 */
function bekle(ms: number): Promise<void> {
  return new Promise((coz) => setTimeout(coz, ms));
}

function yenidenDenemeliIstemci(istemci: PrismaClient): PrismaClient {
  return istemci.$extends({
    query: {
      async $allOperations({ args, query }) {
        try {
          return await query(args);
        } catch (hata) {
          if (!baglantiKoptuMu(hata)) throw hata;

          /*
           * ÖNCE HAVUZ BOŞALTILIR, sonra tekrar denenir. İlk sürüm yalnızca
           * bekleyip yeniden deniyordu ve DÜZELTMİYORDU: yereldeki havuz
           * sınırı BİR (bkz. db-havuz.ts · HAVUZLAYICI_SINIRI), yani havuzda
           * tek bağlantı var. Sunucu onu düşürdüğünde havuz aynı ölü soketi
           * sıradaki isteğe veriyor; ikinci deneme de birinciyle aynı yere
           * çarpıyordu. Sayfa yenilendikçe hata tekrar ediyor, "veritabanı
           * ayakta ama uygulama açılmıyor" tablosu buradan çıkıyor.
           *
           * `$disconnect` havuzu kapatır; Prisma bir sonraki sorguda yeni
           * bağlantı açar. Geliştirmede maliyeti bir bağlantı kurma gecikmesi.
           */
          try {
            await istemci.$disconnect();
          } catch {
            // Havuz zaten kapanmışsa sorun değil; amaç ölü soketten kurtulmak.
          }

          /*
           * TEK deneme: ikinci kez de düşüyorsa sorun anlık bir kopukluk değil,
           * sunucunun kendisi. Sessizce tekrar tekrar denemek, ayakta olmayan
           * bir veritabanını gizler ve sayfayı yalnızca yavaşlatır.
           */
          await bekle(120);
          return await query(args);
        }
      },
    },
  }) as unknown as PrismaClient;
}

function istemciOlustur(): PrismaClient {
  const istemci = new PrismaClient({
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
    ? istemci
    : yenidenDenemeliIstemci(istemci);
}

export const prisma = globalNesne.prismaIstemci ?? istemciOlustur();

if (process.env.NODE_ENV !== "production") {
  globalNesne.prismaIstemci = prisma;
}
