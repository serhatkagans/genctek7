import { Star } from "lucide-react";
import { TOPLAM_YILDIZ } from "@/lib/yolculuk/kurallar";

/**
 * YOLCULUĞUN YILDIZLARI — seviyenin sayı yerine yıldızla söylenmiş hâli
 * (28 Ağustos 2026 · istek: "puanları göstermiyoruz, belki bir yıldız iki
 * yıldız üç yıldız … puan demeyelim").
 *
 * KAZANILMAMIŞ YILDIZLAR DA BASILIR (soluk): yalnızca dolu olanları
 * göstermek, üç yıldızlı birine yolun bittiğini düşündürürdü. Şeritteki
 * "ulaşılmayan seviyeler de duruyor" kararının aynısı (bkz. YolculukSeridi).
 *
 * DİZİ YALNIZCA KİŞİNİN KENDİ SEVİYESİ İÇİN kullanılıyor: yolculuk
 * sayfasının üst kartı ve paneldeki özet kart. Aşama şeridi bunu KULLANMIYOR
 * — yedi basamağın her birine yedişer yıldız basmak kırk dokuz yıldız eder,
 * yalnızca dolu olanlar çizilse bile yirmi sekiz; ikisinde de göz dolu
 * yıldızları saymayı bırakır. Şerit tek simge ve sayıyla yazıyor
 * (bkz. YolculukSeridi).
 *
 * TEK YERDE: aynı dizi üç ekranda geçiyor (yolculuk sayfası, panel kartı,
 * aşama şeridi). Kopyalansaydı seviye eklendiğinde biri altı yıldızda kalırdı;
 * dizinin uzunluğu zaten `TOPLAM_YILDIZ` üzerinden seviye listesinden geliyor.
 *
 * TON: renkli poster bandının üstünde metin renkleri okunmuyor, o yüzden
 * "poster" tonu beyaza geçiyor. Renk dışında iki ton arasında fark yok.
 */
export function SeviyeYildizlari({
  yildiz,
  boyut = 15,
  ton = "normal",
}: {
  yildiz: number;
  boyut?: number;
  ton?: "normal" | "poster";
}) {
  const dolu = ton === "poster" ? "text-white" : "text-vurgu-metin";
  const bos = ton === "poster" ? "text-white/35" : "text-cizgi";

  return (
    /*
      Yıldızların kendisi `aria-hidden`: ekran okuyucuya yedi ayrı "yıldız"
      okutmak yerine tek bir özet veriliyor. Sayı yine söyleniyor — görsel
      okumada sayfadan silinen şey, sayının kendisi değil PUAN sözcüğüydü.
    */
    <span
      role="img"
      aria-label={`${TOPLAM_YILDIZ} yıldızın ${yildiz} tanesi`}
      className="inline-flex items-center gap-0.5 align-middle"
    >
      {Array.from({ length: TOPLAM_YILDIZ }, (_, sira) => (
        <Star
          key={sira}
          size={boyut}
          aria-hidden
          className={sira < yildiz ? `${dolu} fill-current` : bos}
        />
      ))}
    </span>
  );
}
