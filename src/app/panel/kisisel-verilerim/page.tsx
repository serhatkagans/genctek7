import {
  CalendarClock,
  CheckCircle2,
  FileText,
  Info,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import {
  AnahtarDegerListesi,
  BilgiKutusu,
  Kart,
  KartBasligi,
  KatlanabilirKart,
  Rozet,
  RozetSeridi,
  SayfaBasligi,
  SINIF_BIRINCIL_BUTON,
  SINIF_GIRDI,
} from "@/components/ui";
import { oturumKullanicisiZorunlu } from "@/lib/auth/oturum";
import { ayarMetin } from "@/lib/ayar";
import { bildirimAdresiGetir } from "@/lib/bildirim/eposta-kopyasi";
import { kendiBasvurularim } from "@/lib/kvkk/basvuru";
import {
  ACIKLAMA_ASGARI,
  ACIKLAMA_AZAMI,
  DURUM_ETIKETLERI,
  KONU_KISA_ADLARI,
  TALEP_KONULARI,
  YANIT_ADRESI_AZAMI,
  YANIT_SURESI_GUN,
  acikMi,
  gecikmisMi,
  kalanGun,
  yanitSonTarihi,
} from "@/lib/kvkk/basvuru-kurallar";
import {
  AYAR_ACIK_RIZA_METNI,
  AYAR_KVKK_METNI,
  VARSAYILAN_ACIK_RIZA_METNI,
  VARSAYILAN_AYDINLATMA_METNI,
} from "@/lib/kvkk/kurallar";
import { tarihSaatYaz, tarihYaz } from "@/lib/tarih";
import type { KvkkBasvuruDurumu } from "@/generated/prisma/enums";
import { kvkkBasvurusuAcEylemi } from "./eylemler";

export const dynamic = "force-dynamic";

/**
 * KİŞİSEL VERİLERİM — ilgili kişi başvuru formu ve başvurularımın akıbeti
 * (2 Eylül 2026 · Genelge 4/ç: aydınlatma metninin YANI SIRA başvuru formu da
 * platformda bulunmalı).
 *
 * NEDEN AYRI BİR EKRAN OLDU. Aydınlatma ve açık rıza metinleri sistemde
 * vardı (lib/kvkk/kurallar.ts) ama başvuru formu yoktu; aydınlatma metninin
 * 7. maddesi hakkını kullanmak isteyen kişiyi sistemin DIŞINA yolluyordu:
 * "okul idareniz aracılığıyla Bakanlığa başvurabilirsiniz". Okul idaresi
 * burada veri sorumlusu değil (KVKK m.13 · veri sorumlusu YEĞİTEK'tir) ve o
 * kanalda ne başvurunun kaydı tutulur ne de otuz günlük süresi işler.
 *
 * BU EKRAN KVKK ONAY KAPISININ GERİ DÖNÜŞÜ DEĞİLDİR. 21 Ağustos 2026'daki
 * "KVKK'lar panelden kalkacak … bir daha okuma yok, kvkk olmasın" isteği
 * kişiden ONAY İSTEYEN ve okumadan geçilemeyen yüzeyleri kaldırdı; burada
 * kimseden onay istenmiyor, hiçbir şey okutulmuyor ve ekran kimsenin önüne
 * kendiliğinden çıkmıyor. Kişi ancak kendi isteğiyle geliyor — hakkını
 * kullanacağı zaman.
 *
 * YÜRÜRLÜKTEKİ METİNLER DE BURADA, KATLI HÂLDE. Onay kapısı kalktığından beri
 * metinlerin okunabileceği hiçbir yer kalmamıştı; başvuru formunun yanı,
 * doğal yeri: kişi neye başvurduğunu ancak metni okuyabiliyorsa bilir.
 * Katlı duruyorlar ki ekran hukuki metin duvarıyla başlamasın.
 */

function DurumRozeti({ durum }: { durum: KvkkBasvuruDurumu }) {
  const cesit =
    durum === "KABUL"
      ? "olumlu"
      : durum === "KISMEN_KABUL"
        ? "uyari"
        : durum === "RET"
          ? "hata"
          : "vurgu";
  return <Rozet cesit={cesit}>{DURUM_ETIKETLERI[durum]}</Rozet>;
}

export default async function KisiselVerilerimSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string; bilgi?: string }>;
}) {
  const kullanici = await oturumKullanicisiZorunlu();
  const { hata, bilgi } = await searchParams;

  const [basvurular, kayitliAdres, aydinlatmaMetni, acikRizaMetni] =
    await Promise.all([
      kendiBasvurularim(kullanici.id),
      bildirimAdresiGetir(kullanici.id),
      ayarMetin(AYAR_KVKK_METNI, VARSAYILAN_AYDINLATMA_METNI),
      ayarMetin(AYAR_ACIK_RIZA_METNI, VARSAYILAN_ACIK_RIZA_METNI),
    ]);

  const simdi = new Date();
  const acikBasvuru = basvurular.find((basvuru) => acikMi(basvuru.durum));

  return (
    <div className="space-y-6">
      <SayfaBasligi
        baslik="Kişisel Verilerim"
        aciklama="Verilerinizle ilgili haklarınızı bu ekrandan kullanırsınız: başvurunuzu yazın, sonucu buradan ve bildirimlerinizden takip edin."
      />

      {hata && <BilgiKutusu cesit="hata">{hata}</BilgiKutusu>}
      {bilgi && <BilgiKutusu cesit="olumlu">{bilgi}</BilgiKutusu>}

      {/*
        VERİ SORUMLUSU KÜNYESİ FORMDAN ÖNCE. Tebliğ, başvurunun veri
        sorumlusuna yapılmasını arıyor; kişinin kime başvurduğunu bilmesi
        formun ilk şartı. Adres ve telefon, açık rıza metnindeki kurumsal
        künyeyle aynı — iki yerde iki farklı adres yazılması, başvurunun
        muhatabını tartışmalı hâle getirirdi.
      */}
      <Kart>
        <KartBasligi
          baslik="Veri sorumlusu"
          aciklama="Başvurunuz aşağıdaki kuruma yapılır ve merkezdeki proje yöneticileri tarafından sonuçlandırılır."
          Ikon={ShieldCheck}
        />
        <AnahtarDegerListesi
          satirlar={[
            {
              etiket: "Kurum",
              deger:
                "T.C. Millî Eğitim Bakanlığı · Yenilik ve Eğitim Teknolojileri Genel Müdürlüğü (YEĞİTEK)",
            },
            {
              etiket: "Adres",
              deger:
                "Emniyet Mahallesi, Milas Sokak, No:8 06560 Yenimahalle / ANKARA",
            },
            { etiket: "Telefon", deger: "0312 296 94 00" },
            { etiket: "E-posta", deger: "yegitek@meb.gov.tr" },
            {
              etiket: "Yanıt süresi",
              deger: `Başvurunuz en kısa sürede ve en geç ${YANIT_SURESI_GUN} gün içinde sonuçlandırılır (6698 sayılı Kanun m.13).`,
            },
          ]}
        />
      </Kart>

      <Kart id="basvuru-formu">
        <KartBasligi
          baslik="İlgili kişi başvuru formu"
          aciklama="Kimlik bilgileriniz sistemde doğrulanmış hâlde olduğu için formda yeniden istenmez; talebinizi seçip açıklamanız yeterlidir."
          Ikon={FileText}
        />

        {/*
          KİMLİK ÖZETİ SALT OKUNUR. Tebliğ'in yazılı başvuruda aradığı kimlik
          bilgileri (ad, soyad, kurum) burada zaten doğrulanmış hâlde duruyor;
          kişiye yeniden yazdırmak, doğrulanmış veriyi doğrulanmamış bir
          kopyayla çelişme riskine sokardı. Ekranda basılıyor ki başvuran
          kimin adına başvurduğunu görsün.
        */}
        <div className="mb-5 rounded-kutu border border-cizgi bg-zemin p-4 text-sm">
          <p className="font-semibold text-baslik">
            {kullanici.ad} {kullanici.soyad}
          </p>
          <p className="mt-1 text-metin-yumusak">
            Başvuru, sisteme giriş yaptığınız bu hesap adına kaydedilir.
            {kayitliAdres
              ? ` Kayıtlı e-posta adresiniz: ${kayitliAdres}.`
              : " Kayıtlı bir e-posta adresiniz yok; yanıt panelinize düşecek."}
          </p>
        </div>

        {acikBasvuru ? (
          /*
            SONUÇLANMAMIŞ BAŞVURU VARKEN FORM KAPALI. İkinci bir başvuru, aynı
            talebin süresini baştan başlatan ikinci bir kayıt açardı ve
            merkezde aynı kişinin iki dosyası olurdu. Kapı bir YASAK değil bir
            yönlendirme: aşağıdaki kayıt duruyor ve süresi işliyor.
          */
          <BilgiKutusu cesit="uyari">
            Sonuçlanmamış bir başvurunuz var ({tarihYaz(
              acikBasvuru.olusturmaTarihi,
            )}
            ). Yeni başvuru açmadan önce bu başvurunun sonuçlanmasını bekleyin;
            eklemek istediğiniz bir husus varsa yanıt geldikten sonra yeniden
            başvurabilirsiniz.
          </BilgiKutusu>
        ) : (
          <form action={kvkkBasvurusuAcEylemi} className="space-y-5">
            <fieldset>
              <legend className="text-sm font-medium text-metin">
                Talep konusu
              </legend>
              <p className="mt-1 text-sm text-metin-yumusak">
                Birden fazla seçebilirsiniz. Haklar 6698 sayılı Kanun&apos;un
                11. maddesinde sayılmıştır.
              </p>
              <div className="mt-3 space-y-2">
                {TALEP_KONULARI.map((tanim) => (
                  <label
                    key={tanim.konu}
                    className="flex cursor-pointer gap-3 rounded-kutu border border-cizgi p-3 transition hover:border-vurgu has-checked:border-vurgu has-checked:bg-vurgu-zemin"
                  >
                    <input
                      type="checkbox"
                      name="konu"
                      value={tanim.konu}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--renk-birincil)]"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-metin">
                        {tanim.etiket}{" "}
                        <span className="font-normal text-metin-yumusak">
                          ({tanim.madde})
                        </span>
                      </span>
                      {/*
                        HAKKIN BU SİSTEMDE NE DEMEK OLDUĞU KUTUNUN ALTINDA.
                        Kanun metni tek başına yetmiyor: "silinmesini isteme"yi
                        okuyan öğrenci, e-Okul'dan gelen kimlik bilgisinin
                        burada silinemeyeceğini bilmiyor ve bunu otuz gün sonra
                        gelen cevapta öğrenmesi kimseye fayda sağlamazdı.
                      */}
                      <span className="mt-0.5 block text-xs text-metin-yumusak">
                        {tanim.aciklama}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block">
              <span className="text-sm font-medium text-metin">
                Talebinizin açıklaması
              </span>
              <textarea
                name="aciklama"
                required
                rows={5}
                minLength={ACIKLAMA_ASGARI}
                maxLength={ACIKLAMA_AZAMI}
                placeholder="Hangi bilginiz için başvurduğunuzu yazın: örneğin düzeltilmesini istediğiniz alan, silinmesini istediğiniz kayıt ya da öğrenmek istediğiniz husus."
                className={SINIF_GIRDI}
              />
            </label>

            <label className="block sm:max-w-96">
              <span className="text-sm font-medium text-metin">
                Yanıtın gönderilmesini istediğiniz e-posta (isteğe bağlı)
              </span>
              <input
                type="email"
                name="yanitAdresi"
                maxLength={YANIT_ADRESI_AZAMI}
                defaultValue={kayitliAdres ?? ""}
                placeholder="ornek@eposta.com"
                className={SINIF_GIRDI}
              />
              <span className="mt-1 block text-xs text-metin-yumusak">
                Boş bırakırsanız yanıt yalnızca panelinize ve bildirimlerinize
                düşer.
              </span>
            </label>

            <BilgiKutusu>
              Başvurunuz kaydedildiği anda otuz günlük yasal süre başlar. Başvuru
              metniniz ve size verilen yanıt, yükümlülüğün yerine getirildiğinin
              kanıtı olarak saklanır.
            </BilgiKutusu>

            <button type="submit" className={SINIF_BIRINCIL_BUTON}>
              Başvuruyu gönder
            </button>
          </form>
        )}
      </Kart>

      <Kart id="basvurularim">
        <KartBasligi
          baslik="Başvurularım"
          aciklama="Açtığınız başvurular, süresi ve verilen yanıtlar."
          Ikon={ScrollText}
        />

        {basvurular.length === 0 ? (
          <BilgiKutusu>Henüz bir başvuru yapmadınız.</BilgiKutusu>
        ) : (
          <ul className="space-y-4">
            {basvurular.map((basvuru) => {
              const acik = acikMi(basvuru.durum);
              const kalan = kalanGun(simdi, basvuru.olusturmaTarihi);
              return (
                <li
                  key={basvuru.id}
                  className="rounded-kart border border-cizgi p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-baslik">
                        {tarihSaatYaz(basvuru.olusturmaTarihi)} tarihli başvuru
                      </p>
                      <p className="mt-1 text-sm text-metin-yumusak">
                        {basvuru.konular
                          .map((konu) => KONU_KISA_ADLARI[konu])
                          .join(" · ")}
                      </p>
                    </div>
                    <RozetSeridi>
                      <DurumRozeti durum={basvuru.durum} />
                      {acik && (
                        /*
                          KALAN SÜRE BAŞVURANA DA GÖSTERİLİYOR, yalnızca
                          merkeze değil: kanunun süresi ilgili kişinin hakkı,
                          veri sorumlusunun iç işi değil. Süre aşıldığında
                          rozet bunu saklamıyor — Kurul'a şikâyet hakkı tam da
                          o noktada doğuyor.
                        */
                        <Rozet
                          cesit={
                            gecikmisMi(simdi, basvuru) ? "hata" : "notr"
                          }
                          Ikon={CalendarClock}
                        >
                          {gecikmisMi(simdi, basvuru)
                            ? `Süre ${Math.abs(kalan)} gün aşıldı`
                            : `Son yanıt: ${tarihYaz(
                                yanitSonTarihi(basvuru.olusturmaTarihi),
                              )}`}
                        </Rozet>
                      )}
                    </RozetSeridi>
                  </div>

                  <p className="mt-3 text-sm whitespace-pre-wrap text-metin">
                    {basvuru.aciklama}
                  </p>

                  {basvuru.yanitMetni && (
                    <div className="mt-4 rounded-kutu border border-l-4 border-cizgi border-l-cizgi-guclu bg-zemin p-3">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-baslik">
                        <CheckCircle2 size={14} aria-hidden />
                        Yanıt ·{" "}
                        {basvuru.yanitTarihi
                          ? tarihSaatYaz(basvuru.yanitTarihi)
                          : "—"}
                      </p>
                      <p className="mt-2 text-sm whitespace-pre-wrap text-metin">
                        {basvuru.yanitMetni}
                      </p>
                      <p className="mt-3 text-xs text-metin-yumusak">
                        Yanıtı yeterli bulmazsanız Kişisel Verileri Koruma
                        Kurulu&apos;na şikâyette bulunma hakkınız saklıdır.
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Kart>

      {/*
        METİNLER KATLI: ekran hukuki metin duvarıyla başlamasın. Açık gelmeleri
        21 Ağustos'ta kaldırılan "okuma zorunluluğu"nun kılık değiştirmiş hâli
        olurdu — burada okumak isteyen açıyor.
      */}
      <KatlanabilirKart
        baslik="KVKK Aydınlatma Metni"
        aciklama="Bu sistemde hangi verilerinizin, neden ve ne kadar süreyle işlendiğini anlatır."
        Ikon={Info}
      >
        <p className="text-sm whitespace-pre-wrap text-metin">
          {aydinlatmaMetni}
        </p>
      </KatlanabilirKart>

      <KatlanabilirKart
        baslik="KVKK Açık Rıza Metni"
        aciklama="İsteğe bağlı bilgilerinizin işlenmesine ilişkin metin."
        Ikon={Info}
      >
        <p className="text-sm whitespace-pre-wrap text-metin">
          {acikRizaMetni}
        </p>
      </KatlanabilirKart>
    </div>
  );
}
