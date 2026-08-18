import { FileQuestion } from "lucide-react";
import Link from "next/link";

/**
 * Bulunamadı ekranı.
 *
 * Kapsamı dışındaki bir kayda erişmeye çalışan kullanıcı da buraya düşer:
 * "yetkiniz yok" demek kaydın var olduğunu söylerdi
 * (references/permissions.md Bölüm 4). Bu yüzden metin, kaydın var olup
 * olmadığı konusunda bilgi vermez.
 */
export default function BulunamadiEkrani() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      <p className="mb-4 text-sm font-semibold tracking-wide text-metin-yumusak">
        GençTek Bilgi Sistemi
      </p>
      <div className="rounded-kart border border-cizgi bg-kart px-6 py-5 shadow-kart">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-baslik">
          <FileQuestion size={20} className="text-vurgu-metin" aria-hidden />
          Sayfa bulunamadı
        </h1>
        <p className="mt-2 text-sm text-metin-yumusak">
          Aradığınız kayıt kaldırılmış olabilir ya da görüntüleme kapsamınızın
          dışında olabilir.
        </p>
        <Link
          href="/panel"
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-birincil px-4 py-2 text-sm font-semibold text-birincil-metin transition hover:bg-birincil-koyu"
        >
          Panele dön
        </Link>
      </div>
    </main>
  );
}
