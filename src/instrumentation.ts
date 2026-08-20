import type { Instrumentation } from "next";

/**
 * Sunucu tarafındaki beklenmeyen hataların yakalandığı tek nokta.
 *
 * Next.js, işlenmeyen her sunucu hatası için bu kancayı çağırır (sayfa
 * render'ı, sunucu eylemi, route handler). Kullanıcı ekranda yalnızca hata
 * kimliğini görüyor (bkz. app/error.tsx); kimliğin karşılığı buradan günlüğe
 * yazılıyor, yoksa numara hiçbir şeye işaret etmiyordu.
 *
 * KANCA HAFİF TUTULUR ve hata fırlatmaz: burada patlayan bir kayıt, asıl
 * hatanın üstüne ikinci bir hata koyardı (bkz. lib/hata-kaydi.ts · hataKaydet).
 *
 * `import()` GECİKMELİ: bu dosya Edge çalışma zamanında da yüklenebiliyor ve
 * `node:fs` orada yok. Modül üstte import edilseydi Edge tarafı hiç
 * başlamazdı; kanca ise yalnızca Node çalışma zamanında iş yapıyor.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  hata,
  istek,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  /*
   * İSTEMCİ KOPMASI KAYDA GEÇMEZ (21 Ağustos 2026): sayfa akarken tarayıcı
   * bağlantıyı kapatırsa React "The destination stream closed early" fırlatıyor.
   * Kimsenin görmediği bu olay günlüğe yazıldığında en çok gezilen sayfalar
   * listenin başını dolduruyor ve gerçek arızayı aşağı itiyordu — gerekçesi
   * lib/hata-kurallar.ts · istemciKopmasiMi.
   */
  const { istemciKopmasiMi } = await import("./lib/hata-kurallar");
  if (hata instanceof Error && istemciKopmasiMi(hata)) return;

  const { hataKaydet, hataKaydiHazirla } = await import("./lib/hata-kaydi");
  await hataKaydet(
    hataKaydiHazirla(hata, { path: istek.path, method: istek.method }),
  );
};
