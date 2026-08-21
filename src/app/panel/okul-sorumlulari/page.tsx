import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { DisaAktarmaBagi } from "@/components/DisaAktarmaBagi";
import { notFound } from "next/navigation";
import {
  BilgiKutusu,
  Kart,
  KartBasligi,
  SayfaBasligi,
  SINIF_GIRDI,
  SINIF_IKINCIL_BUTON,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { prisma } from "@/lib/db";
import { tarihYaz } from "@/lib/tarih";
import { rolEnvanteriGorebilirMi } from "@/lib/yetki/izinler";
import { okulSorumlusuKosulu } from "./filtreler";

export const dynamic = "force-dynamic";

/**
 * YEĞİTEK OKUL SORUMLULARI (13 Ağustos 2026).
 *
 * İSTEK: "proje yöneticisinin yönetim panelinde de YEĞİTEK Okul Sorumlusu
 * isminde bir kart olsun ve oradan onların listesini görebilsin".
 *
 * YALNIZCA MERKEZ (rolEnvanteriGorebilirMi): liste ülke geneli bir görünümdür
 * ve rol/atama envanteriyle aynı kategoride — kim nerede hangi görevde. İl
 * koordinatörüne açılması ayrı bir karardır; açılırsa kapsam filtresi
 * (ilKodu) buraya eklenmeli. Yetkisi olmayan 404 görür, ekranın varlığı
 * sızmasın.
 *
 * İŞARET BEYANDIR, ATAMA DEĞİL: öğretmen kendisi işaretliyor (bkz.
 * app/panel/eylemler.ts). Ekran bunu açıkça yazıyor — liste bir yetki tablosu
 * gibi okunmamalı.
 */
export default async function OkulSorumlulariSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ ara?: string }>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  if (!rolEnvanteriGorebilirMi(kullanici)) notFound();

  const { ara } = await searchParams;
  const aramaMetni = (ara ?? "").trim();

  /*
   * Koşul `filtreler.ts` içinde ve dışa aktarma rotasıyla PAYLAŞILIYOR:
   * ekranla dosya aynı kümeyi göstermeli. Gerekçesi orada yazılı.
   */
  const sorumlular = await prisma.ogretmenProfil.findMany({
    where: okulSorumlusuKosulu(aramaMetni),
    orderBy: [
      { kullanici: { il: { ad: "asc" } } },
      { kullanici: { ad: "asc" } },
    ],
    take: 500,
    select: {
      kullaniciId: true,
      yegitekIsaretlemeTarihi: true,
      eposta: true,
      telefon: true,
      kullanici: {
        select: {
          ad: true,
          soyad: true,
          brans: true,
          kurum: { select: { ad: true } },
          il: { select: { ad: true } },
          ilce: { select: { ad: true } },
          /*
            DANIŞMANLIK DURUMU DA BASILIYOR: işaret danışman öğretmende
            konuyor ama görevini sonradan bırakan kişide işaret kalmaya devam
            eder (bırakma, profil bayrağına dokunmuyor). Merkez bu satırları
            görebilmeli — "sorumlu görünüyor ama artık danışman değil"
            listedeki en işe yarar bilgi.
          */
          roller: {
            where: { rolKodu: "DANISMAN", bitisTarihi: null },
            select: { rolKodu: true },
          },
        },
      },
    },
  });

  /*
   * İki sayaç TÜM LİSTE üzerinden: ekranın `take: 500` kırpması sayıya
   * yansımıyor ama arama yansıyor — uyarı, o an bakılan kümeye ait olmalı.
   */
  const gorevBitenler = sorumlular.filter(
    (satir) => satir.kullanici.roller.length === 0,
  ).length;
  const iletisimsizler = sorumlular.filter(
    (satir) => !satir.eposta && !satir.telefon,
  ).length;

  return (
    <div className="space-y-6">
      <SayfaBasligi
        /* Bu ekrana Yönetim Paneli'ndeki karttan geliniyor (21 Ağustos 2026 ·
           istek): geri bağlantısı da oraya döner, "Panel"e değil — Panel
           zaten sol menüde duruyor. */
        geri={{ yol: "/panel/yonetim", etiket: "Yönetim Paneli" }}
        baslik="YEĞİTEK Okul Sorumluları"
        aciklama="Panelinde kendini YEĞİTEK Okul Sorumlusu olarak işaretlemiş danışman öğretmenler."
      />

      <BilgiKutusu>
        Bu liste bir <strong>beyandır</strong>, atama değil: öğretmen işareti
        kendi panelinden koyar ve onay aranmaz. İşaret hiçbir ek veri erişimi
        vermez — yalnızca okulda YEĞİTEK&apos;in muhatabının kim olduğunu
        gösterir.
      </BilgiKutusu>

      <Kart>
        <form method="get" className="flex flex-wrap items-end gap-2">
          <label className="block grow">
            <span className="text-sm font-medium text-metin">
              Ad, soyad ya da okul
            </span>
            <input
              type="search"
              name="ara"
              defaultValue={aramaMetni}
              placeholder="Örn. Kadıköy Anadolu"
              className={SINIF_GIRDI}
            />
          </label>
          <button type="submit" className={SINIF_IKINCIL_BUTON}>
            Ara
          </button>
          {aramaMetni && (
            <Link
              href="/panel/okul-sorumlulari"
              className="text-sm font-medium text-vurgu-metin underline underline-offset-2"
            >
              Temizle
            </Link>
          )}
        </form>
      </Kart>

      {/*
        ÖZET ŞERİDİ (15 Ağustos 2026). Ekran bir rehber ama içinde AKSİYON
        GEREKTİREN bir alt küme var: işaret danışman öğretmene konuyor, görevi
        bırakan kişide ise kalmaya devam ediyor. O kayıtlar tabloda satır satır
        aranmak yerine sayıyla söyleniyor — ekip yönetimindeki "danışmansız
        ekip" uyarısıyla aynı desen.

        İLETİŞİM EKSİĞİ DE SAYILIYOR: bu ekranın var oluş sebebi "okulda
        YEĞİTEK'in muhatabı kim" sorusu; muhatabın telefonu ve e-postası yoksa
        kayıt adı dışında bir işe yaramıyor.
      */}
      {sorumlular.length > 0 && (gorevBitenler > 0 || iletisimsizler > 0) && (
        <BilgiKutusu cesit="uyari">
          {gorevBitenler > 0 && (
            <>
              <strong>{gorevBitenler}</strong> kişinin danışmanlık görevi
              bitmiş ama işareti duruyor.{" "}
            </>
          )}
          {iletisimsizler > 0 && (
            <>
              <strong>{iletisimsizler}</strong> kişide e-posta ve telefon
              girilmemiş.
            </>
          )}
        </BilgiKutusu>
      )}

      <Kart>
        <KartBasligi
          baslik="Sorumlular"
          aciklama={`${sorumlular.length} kişi${aramaMetni ? " (filtreli)" : ""}`}
          Ikon={ShieldCheck}
        />
        {sorumlular.length > 0 && (
          /*
           * Bağlantı ekrandaki aramayı taşır ama ekranın `take: 500` kırpmasını
           * TAŞIMAZ: dosya merkezin elindeki tam envanter olmalı (gerekçe
           * rotanın başında).
           */
          <p className="mb-4">
            <DisaAktarmaBagi
              yol={`/panel/okul-sorumlulari/disa-aktar${
                aramaMetni
                  ? `?${new URLSearchParams({ ara: aramaMetni }).toString()}`
                  : ""
              }`}
              kayitSayisi={sorumlular.length}
            />
          </p>
        )}
        {sorumlular.length === 0 ? (
          <p className="text-metin-yumusak">
            {aramaMetni
              ? "Aramanıza uyan sorumlu bulunamadı."
              : "Henüz kimse kendini YEĞİTEK Okul Sorumlusu olarak işaretlemedi."}
          </p>
        ) : (
          /*
           * LİSTE YERİNE TABLO (15 Ağustos 2026).
           *
           * Önceki hâlde her kayıt üç satır düz metindi ve alanlar noktayla
           * ayrılıyordu ("Okul · İlçe / İl · Branş"). Göz her satırda hangi
           * bilginin ne olduğunu yeniden çözmek zorunda kalıyordu; okulu uzun
           * bir kayıtta branş satırın sonuna kayıyordu. Panelin diğer yönetim
           * ekranları (Okullar, Ekip Yönetimi, Okul Eksik Durum) zaten tablo —
           * bu ekran onlarla da tutarsızdı.
           *
           * DANIŞMANLIK DURUMU ARTIK KENDİ SÜTUNUNDA. Bilgi ekranda vardı ama
           * yalnızca ROZET olarak ve yalnızca sorunlu kayıtta basılıyordu;
           * sütun olmadığı için "kimlerin görevi sürüyor" diye bakan kişi
           * satırların yokluğundan çıkarım yapmak zorundaydı. Dışa aktarma
           * dosyasında bu sütun zaten vardı — ekranın dosyadan eksik kalması
           * ters bir durumdu.
           */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-cizgi text-metin-yumusak">
                <tr>
                  <th className="py-2 pr-4 font-medium">Ad soyad</th>
                  <th className="py-2 pr-4 font-medium">Branş</th>
                  <th className="py-2 pr-4 font-medium">Okul</th>
                  <th className="py-2 pr-4 font-medium">İl / İlçe</th>
                  <th className="py-2 pr-4 font-medium">İletişim</th>
                  <th className="py-2 pr-4 font-medium">Danışmanlık</th>
                  <th className="py-2 font-medium">İşaretleme</th>
                </tr>
              </thead>
              <tbody>
                {sorumlular.map((satir) => {
                  const gorevSuruyor = satir.kullanici.roller.length > 0;
                  return (
                    <tr
                      key={satir.kullaniciId}
                      className={`border-b border-cizgi last:border-0 ${
                        gorevSuruyor ? "" : "bg-uyari-zemin"
                      }`}
                    >
                      <td className="py-2 pr-4 font-medium text-metin">
                        {satir.kullanici.ad} {satir.kullanici.soyad}
                      </td>
                      <td className="py-2 pr-4 text-metin-yumusak">
                        {satir.kullanici.brans ?? "—"}
                      </td>
                      <td className="py-2 pr-4">
                        {satir.kullanici.kurum?.ad ?? (
                          <span className="text-metin-yumusak">Okul kaydı yok</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-metin-yumusak">
                        {[satir.kullanici.il?.ad, satir.kullanici.ilce?.ad]
                          .filter(Boolean)
                          .join(" / ") || "—"}
                      </td>
                      {/*
                        İLETİŞİM TEK SÜTUNDA, iki satır: e-posta ve telefon ayrı
                        sütun olsaydı ikisi de çoğu kayıtta boş kalır ve tablo
                        iki boş sütunla uzardı.
                      */}
                      <td className="py-2 pr-4 text-metin-yumusak">
                        {satir.eposta || satir.telefon ? (
                          <>
                            {satir.eposta && (
                              <span className="block">{satir.eposta}</span>
                            )}
                            {satir.telefon && (
                              <span className="block">{satir.telefon}</span>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      {/*
                        "Bitmiş" satırlar listenin en işe yarar bilgisi: işaret
                        danışman öğretmene konuyor ama görevi bırakan kişide
                        kalmaya devam ediyor. Renk TEK BAŞINA taşımıyor —
                        metin de yazılı.
                      */}
                      <td className="py-2 pr-4">
                        {gorevSuruyor ? (
                          <span className="text-metin-yumusak">Aktif</span>
                        ) : (
                          <span className="font-medium text-uyari-metin">
                            Görevi bitmiş
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-metin-yumusak">
                        {satir.yegitekIsaretlemeTarihi
                          ? tarihYaz(satir.yegitekIsaretlemeTarihi)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Kart>
    </div>
  );
}
