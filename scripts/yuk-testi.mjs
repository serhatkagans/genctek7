/**
 * GençTek yük testi — açık uçlara eşzamanlı istek atıp gecikme dağılımını basar.
 *
 *   TEST_URL=http://127.0.0.1:3457 node scripts/yuk-testi.mjs
 *
 * ADRES ZORUNLUDUR, VARSAYILANI YOKTUR. Varsayılan olarak
 * "http://127.0.0.1:3010" yazıyordu ve bu iki ayrı yerde yanlıştı:
 *
 *   - Yerelde 3010'u GençTek'le ilgisi olmayan başka bir node süreci tutuyor.
 *     Varsayılanla koşan test o uygulamayı ölçer, üstelik başarıyla: sayılar
 *     dolu gelir, tablo düzgün basılır ve ölçtüğünüz şeyin GençTek olmadığını
 *     hiçbir yerden anlamazsınız. Sessiz yanlış cevap, hatadan kötüdür.
 *   - Üretimde uygulama alt dizinde duruyor (https://aiotechs.cloud/genctek,
 *     yerelde 127.0.0.1:3010/genctek). Taban yolu olmayan bir adres 404 alır.
 *
 * Adres taban yolunu da içermelidir; buradaki yollar onun üstüne eklenir.
 *
 * ÜRETİME YÖNELTMEDEN ÖNCE DÜŞÜNÜN: bu betik gerçek trafik üretir, hız sınırı
 * sayaçlarını doldurur ve erişim kayıtlarına yazar.
 */
const BASE_URL = process.env.TEST_URL;

if (!BASE_URL) {
  console.error("HATA: TEST_URL verilmedi. Ölçülecek adresi taban yoluyla birlikte yazın:");
  console.error("  TEST_URL=http://127.0.0.1:3457 node scripts/yuk-testi.mjs");
  console.error("Varsayılan bilinçli olarak yok; yanlış porta sessizce bağlanmaktansa durmak iyidir.");
  process.exit(1);
}

const HEDEFLER = [
  { ad: "Ana Sayfa", path: "/" },
  { ad: "Açık İstatistik API", path: "/api/acik-istatistik" },
  { ad: "Açık Etkinlikler API", path: "/api/acik-etkinlikler" },
  { ad: "Giriş Ekranı", path: "/giris" },
];

function yuzdelik(dizi, p) {
  if (dizi.length === 0) return 0;
  const sirali = [...dizi].sort((a, b) => a - b);
  const indeks = Math.min(Math.floor((p / 100) * sirali.length), sirali.length - 1);
  return sirali[indeks];
}

async function tekilTest({ path, concurrency, durationSec }) {
  const url = `${BASE_URL}${path}`;
  const sonlanmaZamani = Date.now() + durationSec * 1000;
  const gecikmeler = [];
  const durumlar = {};
  let basarisizSayisi = 0;
  let toplamIstek = 0;

  async function calisan() {
    while (Date.now() < sonlanmaZamani) {
      const baslangic = performance.now();
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Genctek-LoadTest/1.0" },
        });
        const sure = performance.now() - baslangic;
        gecikmeler.push(sure);
        durumlar[res.status] = (durumlar[res.status] || 0) + 1;
        if (!res.ok) basarisizSayisi++;
        await res.text().catch(() => "");
      } catch (err) {
        const sure = performance.now() - baslangic;
        gecikmeler.push(sure);
        durumlar["ERR"] = (durumlar["ERR"] || 0) + 1;
        basarisizSayisi++;
      }
      toplamIstek++;
    }
  }

  const calisanlar = Array.from({ length: concurrency }, () => calisan());
  await Promise.all(calisanlar);

  const rps = (toplamIstek / durationSec).toFixed(1);
  const p50 = yuzdelik(gecikmeler, 50).toFixed(1);
  const p95 = yuzdelik(gecikmeler, 95).toFixed(1);
  const p99 = yuzdelik(gecikmeler, 99).toFixed(1);
  const min = gecikmeler.length ? Math.min(...gecikmeler).toFixed(1) : 0;
  const max = gecikmeler.length ? Math.max(...gecikmeler).toFixed(1) : 0;

  return {
    toplamIstek,
    rps,
    p50,
    p95,
    p99,
    min,
    max,
    durumlar,
    basarisizSayisi,
  };
}

async function main() {
  console.log(`\n======================================================`);
  console.log(`  GençTek Yük Testi Başlatılıyor`);
  console.log(`  Hedef Sunucu: ${BASE_URL}`);
  console.log(`======================================================\n`);

  try {
    const kontrol = await fetch(`${BASE_URL}/`, { signal: AbortSignal.timeout(3000) });
    console.log(`Sunucu bağlantısı doğrulandı (HTTP ${kontrol.status}).\n`);
  } catch (err) {
    console.error(`HATA: Sunucuya ulaşılamadı (${BASE_URL}):`, err.message);
    process.exit(1);
  }

  const SENARYOLAR = [
    { concurrency: 10, durationSec: 4 },
    { concurrency: 25, durationSec: 4 },
    { concurrency: 50, durationSec: 4 },
  ];

  for (const hedef of HEDEFLER) {
    console.log(`\n------------------------------------------------------`);
    console.log(`Hedef: ${hedef.ad} (${hedef.path})`);
    console.log(`------------------------------------------------------`);
    console.log(
      `Eşzamanlı | İstek Sayısı | İstek/Sn | p50 (ms) | p95 (ms) | p99 (ms) | Max (ms) | Durum Kodları`
    );
    console.log(
      `---------+--------------+----------+----------+----------+----------+----------+----------------`
    );

    for (const senaryo of SENARYOLAR) {
      const sonuc = await tekilTest({
        path: hedef.path,
        concurrency: senaryo.concurrency,
        durationSec: senaryo.durationSec,
      });

      const durumDizgisi = Object.entries(sonuc.durumlar)
        .map(([k, v]) => `${k}:${v}`)
        .join(" ");

      const colC = String(senaryo.concurrency).padEnd(9);
      const colReq = String(sonuc.toplamIstek).padEnd(14);
      const colRps = String(sonuc.rps).padEnd(10);
      const colP50 = String(sonuc.p50).padEnd(10);
      const colP95 = String(sonuc.p95).padEnd(10);
      const colP99 = String(sonuc.p99).padEnd(10);
      const colMax = String(sonuc.max).padEnd(10);

      console.log(
        `${colC}| ${colReq}| ${colRps}| ${colP50}| ${colP95}| ${colP99}| ${colMax}| ${durumDizgisi}`
      );
    }
  }

  console.log(`\n======================================================`);
  console.log(`  Yük Testi Tamamlandı.`);
  console.log(`======================================================\n`);
}

main().catch(console.error);
