import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { TemaSecici } from "@/components/TemaSecici";
import { aktifTema } from "@/lib/tema";

/**
 * Oturum GEREKTİRMEYEN sayfaların ortak çerçevesi: giriş, başvuru ve şifre
 * sıfırlama ekranları.
 *
 * Panel düzeninden ayrı tutuldu çünkü buradaki sayfalar bir kapının
 * DIŞINDADIR: menü, rol etiketi ve çıkış düğmesi göstermek, kişiyi henüz
 * giremediği bir yerin içindeymiş gibi hissettirir (aynı gerekçe: app/onay).
 */
export async function KamuSayfaDuzeni({
  baslik,
  aciklama,
  geriYol = "/",
  geriEtiket = "Açılış ekranı",
  genislik = "max-w-2xl",
  children,
}: {
  baslik: string;
  aciklama?: string;
  geriYol?: string;
  geriEtiket?: string;
  genislik?: string;
  children: React.ReactNode;
}) {
  const tema = await aktifTema();

  return (
    <div className="min-h-screen">
      <div className="bg-serit text-serit-metin">
        <div
          className={`mx-auto flex ${genislik} items-center justify-between px-6 py-4`}
        >
          <p className="text-[11px] font-semibold tracking-widest uppercase">
            MEB · YEĞİTEK
          </p>
          <TemaSecici aktif={tema} />
        </div>
      </div>

      <main className={`mx-auto w-full ${genislik} px-6 py-10`}>
        <Link
          href={geriYol}
          className="inline-flex items-center gap-1 text-sm font-medium text-vurgu-metin"
        >
          <ChevronLeft size={15} aria-hidden />
          {geriEtiket}
        </Link>

        <header className="mt-4 border-b border-cizgi pb-6">
          <h1 className="text-3xl font-bold text-baslik">{baslik}</h1>
          {aciklama && <p className="mt-2 text-metin-yumusak">{aciklama}</p>}
        </header>

        {children}
      </main>
    </div>
  );
}
