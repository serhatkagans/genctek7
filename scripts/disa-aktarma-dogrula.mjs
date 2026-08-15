import { chromium } from "playwright";

/**
 * CSV dışa aktarmanın kapsam kurallarına uyduğunu canlı sistemde doğrular.
 *
 * Asıl sorulan şey dosyanın üretilip üretilmediği değil: indirilen satır
 * sayısının kişinin ekranda gördüğü kayıt sayısıyla aynı olup olmadığı ve
 * kapsam dışındaki kişinin dosyaya hiç ulaşamadığı.
 */

const kok = process.env.GENCTEK_URL ?? "http://localhost:3000";
const tarayici = await chromium.launch();
const rapor = [];

async function girisYap(kisiAdi) {
  const baglam = await tarayici.newContext();
  const sayfa = await baglam.newPage();
  await sayfa.goto(`${kok}/giris?ara=${encodeURIComponent(kisiAdi)}`, {
    waitUntil: "networkidle",
  });
  await sayfa
    .locator('form:has(input[name="kimlikBilgisi"]:not([value^="uretilen-"]))')
    .filter({ hasText: kisiAdi })
    .first()
    .getByRole("button")
    .click();
  await sayfa.waitForURL(/\/panel/);
  return { baglam, sayfa };
}

/** CSV'nin veri satırı sayısı (başlık ve son boş satır hariç). */
function veriSatiriSayisi(icerik) {
  return icerik.trim().split("\r\n").length - 1;
}

/**
 * CSV indirir.
 *
 * `bicim=csv` ZORUNLU (15 Ağustos 2026): rotaların varsayılanı artık XLSX ve
 * bu betik dosyayı METİN olarak ayrıştırıyor. Parametre eklenmeseydi satır
 * sayımı ikili veriyi ayrıştırmaya çalışır, sayı tutmaz ve betik kapsam
 * sızıntısı varmış gibi rapor verirdi — ya da daha kötüsü, olmayan bir
 * eşleşme üretirdi. CSV yolunun korunmasının sebebi de tam olarak bu betik
 * (bkz. src/lib/rapor/disa-aktarma.ts).
 */
async function csvIndir(sayfa, yol) {
  const ayrac = yol.includes("?") ? "&" : "?";
  const yanit = await sayfa.request.get(`${kok}${yol}${ayrac}bicim=csv`);
  return { durum: yanit.status(), govde: await yanit.text() };
}

/** XLSX indirir; içerik ayrıştırılmaz, yalnızca biçim ve boyut sınanır. */
async function xlsxIndir(sayfa, yol) {
  const yanit = await sayfa.request.get(`${kok}${yol}`);
  const govde = await yanit.body();
  return {
    durum: yanit.status(),
    tip: yanit.headers()["content-type"] ?? "",
    boyut: govde.length,
    // XLSX bir ZIP arşividir; her geçerli dosya "PK" ile başlar.
    zipMi: govde.subarray(0, 2).toString("latin1") === "PK",
  };
}

for (const [kisi, etiket] of [
  ["Burcu Yılmaz", "YEĞİTEK"],
  ["Selim Koç", "İl koordinatörü"],
  ["Ahmet Öztürk", "Danışman öğretmen"],
]) {
  const { baglam, sayfa } = await girisYap(kisi);

  await sayfa.goto(`${kok}/panel/ogrenciler`, { waitUntil: "networkidle" });
  const baslikMetni = await sayfa.locator("main h1 + p").first().innerText();
  const eslesme = baslikMetni.match(/(\d+) kayıt/);

  const csv = await csvIndir(sayfa, "/panel/ogrenciler/disa-aktar");
  const dosyadaki = csv.durum === 200 ? veriSatiriSayisi(csv.govde) : -1;

  /*
   * ÖLÇÜLEMEDİ ≠ FARKLI (15 Ağustos 2026). KVKK onayını henüz vermemiş kişi
   * listeye değil onay ekranına düşüyor; orada "N kayıt" yazmıyor. Eskiden
   * bu durumda ekran sayısı 0 varsayılıyor ve rapor "*** FARKLI ***" diyordu —
   * yani kapsam sızıntısı gibi görünen bir yanlış alarm. Güvenlik betiğinde
   * yanlış alarm, gerçek alarmı da görünmez kılar.
   */
  if (eslesme === null) {
    rapor.push(
      `${etiket} · öğrenci CSV: HTTP ${csv.durum} · dosyada ${dosyadaki} satır → ekran sayısı OKUNAMADI (onay/yönlendirme ekranı), karşılaştırılmadı`,
    );
  } else {
    const ekrandaki = Number(eslesme[1]);
    rapor.push(
      `${etiket} · öğrenci CSV: HTTP ${csv.durum} · ekranda ${ekrandaki} kayıt, dosyada ${dosyadaki} satır → ${
        ekrandaki === dosyadaki ? "eşleşiyor" : "*** FARKLI ***"
      }`,
    );
  }

  await baglam.close();
}

{
  // Öğrenci envanteri göremez; indirme yolu da aynı cevabı vermeli, yoksa
  // ekranı kapatmak veriyi korumaz.
  const { baglam, sayfa } = await girisYap("Yusuf Demir");
  const csv = await csvIndir(sayfa, "/panel/ogrenciler/disa-aktar");
  rapor.push(
    `Öğrenci · öğrenci CSV: HTTP ${csv.durum} → ${
      csv.durum === 404 ? "engellendi (beklenen)" : "*** ERİŞTİ ***"
    }`,
  );

  // Etkinlik CSV'si de öğrenciye kapandı (10 Ağustos 2026): ekrandaki bağlantı
  // kalktı, adres çubuğundan gelen istek de 404 almalı.
  const faaliyetCsv = await csvIndir(sayfa, "/panel/etkinlikler/disa-aktar");
  rapor.push(
    `Öğrenci · faaliyet CSV: HTTP ${faaliyetCsv.durum} → ${
      faaliyetCsv.durum === 404 ? "engellendi (beklenen)" : "*** ERİŞTİ ***"
    }`,
  );
  await baglam.close();
}

{
  // Oturumsuz istek: kaydın varlığını bile sızdırmadan 404.
  const baglam = await tarayici.newContext();
  const sayfa = await baglam.newPage();
  const csv = await csvIndir(sayfa, "/panel/ogrenciler/disa-aktar");
  rapor.push(
    `Oturumsuz · öğrenci CSV: HTTP ${csv.durum} → ${
      csv.durum === 404 ? "engellendi (beklenen)" : "*** ERİŞTİ ***"
    }`,
  );
  await baglam.close();
}

{
  // Filtre daraltması dosyaya da yansımalı.
  const { baglam, sayfa } = await girisYap("Burcu Yılmaz");
  const tumu = await csvIndir(sayfa, "/panel/ogrenciler/disa-aktar");
  const daraltilmis = await csvIndir(
    sayfa,
    "/panel/ogrenciler/disa-aktar?il=34",
  );
  rapor.push(
    `YEĞİTEK · filtresiz ${veriSatiriSayisi(tumu.govde)} satır, il=34 ile ${veriSatiriSayisi(
      daraltilmis.govde,
    )} satır → ${
      veriSatiriSayisi(daraltilmis.govde) < veriSatiriSayisi(tumu.govde)
        ? "daraldı (beklenen)"
        : "*** DARALMADI ***"
    }`,
  );

  const ilkSatir = daraltilmis.govde.split("\r\n")[1] ?? "";
  rapor.push(`         · örnek satır: ${ilkSatir}`);
  await baglam.close();
}

{
  /*
   * VARSAYILAN BİÇİM XLSX (15 Ağustos 2026 · Aşama 2b). Parametresiz istek
   * artık elektronik tablo döndürmeli; CSV yalnızca açıkça istendiğinde gelir.
   */
  const { baglam, sayfa } = await girisYap("Burcu Yılmaz");
  const xlsx = await xlsxIndir(sayfa, "/panel/ogrenciler/disa-aktar");
  rapor.push(
    `YEĞİTEK · öğrenci varsayılan biçim: HTTP ${xlsx.durum} · ${xlsx.boyut} bayt · ${
      xlsx.zipMi && xlsx.tip.includes("spreadsheetml")
        ? "geçerli XLSX (beklenen)"
        : `*** XLSX DEĞİL (${xlsx.tip}) ***`
    }`,
  );
  await baglam.close();
}

{
  /*
   * AŞAMA 2c'DE AÇILAN ROTALAR. Her biri için sorulan iki soru aynı: yetkili
   * dosyayı alabiliyor mu, yetkisiz 404 alıyor mu. Kapı ekranda kapalı olsa
   * bile rotanın kendi kapısı olmalı (references/permissions.md · Bölüm 4).
   */
  const yeniRotalar = [
    ["/panel/erisim-loglari/disa-aktar", "erişim kayıtları"],
    ["/panel/okul-sorumlulari/disa-aktar", "okul sorumluları"],
    ["/panel/dis-basvurular/disa-aktar", "dış başvurular"],
    ["/panel/gorev-rolleri/disa-aktar", "görev rolleri"],
    ["/panel/okul-eksikleri/disa-aktar", "okul eksik durumları"],
    ["/panel/okullar/disa-aktar?il=34", "okullar"],
    ["/panel/ekip-yonetimi/disa-aktar", "ekipler"],
    ["/panel/mentorluk/disa-aktar", "mentörlük"],
    ["/panel/rol-envanteri/disa-aktar", "rol envanteri (il)"],
    ["/panel/rol-envanteri/disa-aktar?kirilim=okul", "rol envanteri (okul)"],
    ["/panel/talepler/disa-aktar", "pano ilanları"],
    ["/panel/urunler/disa-aktar", "market ürünleri"],
    /*
     * ÖNCEDEN AÇILMIŞ AMA BETİĞE GİRMEMİŞ ROTALAR (15 Ağustos 2026).
     * Betik yalnızca öğrenci ve etkinlik listesini sınıyordu; kapı kontrolü
     * olmayan bir rota, açıldığı gün değil ancak birinin fark ettiği gün
     * görünür olurdu. On sekiz rotanın tamamı artık burada.
     */
    ["/panel/raporlar/dokum", "etkinlik rapor dökümü"],
    ["/panel/ogretmenler/disa-aktar", "öğretmenler"],
    ["/panel/paydaslar/disa-aktar", "paydaşlar"],
    ["/panel/yonetim/disa-aktar", "yönetim kırılımı"],
  ];

  const { baglam: merkezBaglam, sayfa: merkezSayfa } =
    await girisYap("Burcu Yılmaz");
  for (const [yol, ad] of yeniRotalar) {
    const csv = await csvIndir(merkezSayfa, yol);
    rapor.push(
      `YEĞİTEK · ${ad}: HTTP ${csv.durum} · ${
        csv.durum === 200
          ? `${veriSatiriSayisi(csv.govde)} satır`
          : csv.durum === 413
            ? "üst sınır aşıldı (süzgeç gerekiyor — beklenen)"
            : "*** ALINAMADI ***"
      }`,
    );
  }
  await merkezBaglam.close();

  const { baglam: ogrenciBaglam, sayfa: ogrenciSayfa } =
    await girisYap("Yusuf Demir");
  for (const [yol, ad] of yeniRotalar) {
    const csv = await csvIndir(ogrenciSayfa, yol);
    rapor.push(
      `Öğrenci · ${ad}: HTTP ${csv.durum} → ${
        csv.durum === 404 ? "engellendi (beklenen)" : "*** ERİŞTİ ***"
      }`,
    );
  }
  await ogrenciBaglam.close();
}

{
  /*
   * SATIR BAZLI ROTALAR (15 Ağustos 2026). İkisi de kayıt kimliği istiyor, o
   * yüzden sabit yolla sınanamıyor: kimlik önce listeden bulunuyor.
   *
   * `ekipler/[id]/uyeler` KAYIT SEVİYESİNDE kapılı (`buEkibiYonetebilirMi`) —
   * koordinatör yalnızca kendi ilinin ekibini indirebilmeli. Rol seviyesinde
   * kapılı olsaydı başka ilin ekibi de açılırdı; senaryo bunu sınıyor.
   */
  const { baglam, sayfa } = await girisYap("Burcu Yılmaz");

  await sayfa.goto(`${kok}/panel/ekip-yonetimi`, { waitUntil: "networkidle" });
  const ekipYolu = await sayfa
    .locator('main table tbody a[href*="/panel/ekipler/"]')
    .first()
    .getAttribute("href");

  if (ekipYolu) {
    const csv = await csvIndir(sayfa, `${ekipYolu}/uyeler/disa-aktar`);
    rapor.push(
      `YEĞİTEK · ekip üye listesi: HTTP ${csv.durum} · ${
        csv.durum === 200 ? `${veriSatiriSayisi(csv.govde)} satır` : "*** ALINAMADI ***"
      }`,
    );
  } else {
    rapor.push("YEĞİTEK · ekip üye listesi: ekip bulunamadı, sınanmadı");
  }

  await sayfa.goto(`${kok}/panel/etkinlikler`, { waitUntil: "networkidle" });
  /*
   * Sayfadaki İLK etkinlik bağlantısı "/panel/etkinlikler/yeni" ya da
   * ".../disa-aktar" olabiliyor; kayıt bağlantısı yalnızca sayı ile bitendir.
   */
  const faaliyetYollari = await sayfa
    .locator('main a[href^="/panel/etkinlikler/"]')
    .evaluateAll((baglar) => baglar.map((b) => b.getAttribute("href")));
  const faaliyetYolu = faaliyetYollari.find((yol) =>
    /^\/panel\/etkinlikler\/\d+$/.test(yol ?? ""),
  );

  if (faaliyetYolu) {
    const csv = await csvIndir(sayfa, `${faaliyetYolu}/basvurular/disa-aktar`);
    rapor.push(
      `YEĞİTEK · etkinlik başvuruları: HTTP ${csv.durum} · ${
        csv.durum === 200 ? `${veriSatiriSayisi(csv.govde)} satır` : "*** ALINAMADI ***"
      }`,
    );
  } else {
    rapor.push("YEĞİTEK · etkinlik başvuruları: etkinlik bulunamadı, sınanmadı");
  }

  await baglam.close();

  // Aynı iki rota öğrenciye kapalı olmalı.
  const ogrenci = await girisYap("Yusuf Demir");
  for (const [yol, ad] of [
    ["/panel/ekipler/1/uyeler/disa-aktar", "ekip üye listesi"],
    ["/panel/etkinlikler/1/basvurular/disa-aktar", "etkinlik başvuruları"],
    ["/panel/raporlar/dokum", "etkinlik rapor dökümü"],
  ]) {
    const csv = await csvIndir(ogrenci.sayfa, yol);
    rapor.push(
      `Öğrenci · ${ad}: HTTP ${csv.durum} → ${
        csv.durum === 404 ? "engellendi (beklenen)" : "*** ERİŞTİ ***"
      }`,
    );
  }
  await ogrenci.baglam.close();
}

await tarayici.close();

console.log(`\n${"-".repeat(70)}`);
for (const satir of rapor) console.log(satir);
console.log("-".repeat(70));
