import type { Kapsam, RolKodu } from "@/generated/prisma/enums";

/** Kullanıcının aktif (bitiş tarihi yazılmamış) rolü ve o rolün kapsamı. */
export interface AktifRol {
  rolKodu: RolKodu;
  /** IL_KOORDINATOR rolünün ili. */
  ilKodu: string | null;
  /** DANISMAN rolünün okulu. */
  kurumKodu: number | null;
}

/**
 * Oturumdaki kullanıcının yetki kararları için gereken asgari bilgisi.
 * Yetki, rolün kendisinden değil rolün bağlı olduğu kurum/ilden gelir.
 */
/**
 * Oturumdaki kişi.
 *
 * `authProviderId` BURADA YOKTUR (3 Eylül 2026). Bu nesne panel boyunca her
 * sunucu bileşenine geçiyor ve oradan istemci bileşenlerine pervane olarak
 * sızması an meselesi; SSO bağlandığında o alan T.C. kimlik numarası taşıyacağı
 * için taşınmaması gereken tek alan odur. İhtiyaç duyan yer `id` ile
 * veritabanına gider (bkz. lib/dis-kimlik/giris.ts · disKimlikliMi).
 */
export interface OturumKullanicisi {
  id: number;
  ad: string;
  soyad: string;
  kurumKodu: number | null;
  ilKodu: string | null;
  ilceKodu: string | null;
  sinif: string | null;
  brans: string | null;
  egitimOgretimYili: string;
  roller: AktifRol[];
}

/** Yetki kararlarında kullanılan faaliyet bilgisi. */
export interface FaaliyetKapsami {
  id: number;
  kapsam: Kapsam;
  kurumKodu: number | null;
  ilKodu: string | null;
  duzenleyenKullaniciId: number;
  onayliMi: boolean;
  /**
   * Faaliyetin bağlı olduğu il. Kapsam alanlarından türetilemez: okul içi
   * faaliyette okulun ili, ulusal faaliyette düzenleyenin ilidir. Yalnızca
   * yetki devri kararında kullanılır (bkz. yetkiDevrolduMu).
   */
  kapsamIlKodu?: string | null;
  /**
   * Düzenleyen hâlâ görevde mi? `false` ise değerlendirme ve moderasyon
   * yetkisi ilin koordinatörüne devrolur. Belirtilmezse "görevde" varsayılır.
   */
  duzenleyenGorevdeMi?: boolean;
  /**
   * Faaliyeti bir öğrenci mi açtı? Öğrencinin açtığı faaliyet her kapsamda
   * onaya tabidir ve onayı, YEĞİTEK'in yanında öğrencinin ilinin koordinatörü
   * de verebilir. Belirtilmezse `false` varsayılır — eksik veriyle onay
   * yetkisini genişletmek yerine dar tarafta kalıyoruz.
   */
  duzenleyenOgrenciMi?: boolean;
  /**
   * Faaliyeti danışman öğretmen mi açtı? Öğrenci faaliyetiyle AYNI kapıdan
   * geçer: ikisi de ilin koordinatörünün onayına tabidir. İki alan ayrı
   * tutuluyor çünkü onay dışındaki akışlarda (bildirim metni, ekranda
   * gösterilen gerekçe) ikisi farklı şeyler söylüyor.
   *
   * Belirtilmezse `false` varsayılır — eksik veriyle onay yetkisini
   * genişletmek yerine dar tarafta kalıyoruz.
   */
  duzenleyenDanismanMi?: boolean;
  /**
   * Faaliyeti mezun / paydaş temsilcisi / mentör mü açtı? (7 Ağustos 2026)
   *
   * Öğrenci ve danışman faaliyetiyle AYNI kapıdan geçer: üçü de ilin
   * koordinatörünün onayına tabidir. Ayrı alan tutuluyor çünkü onay dışındaki
   * akışlarda (bildirim metni, kartta yazan düzenleyen birim) üçü farklı
   * şeyler söylüyor — "Öğrenci girişimi" ile "Paydaş girişimi" aynı şey değil.
   *
   * Belirtilmezse `false` varsayılır.
   */
  duzenleyenDisKullaniciMi?: boolean;
}

export class YetkiHatasi extends Error {
  constructor(mesaj = "Bu işlem için yetkiniz yok") {
    super(mesaj);
    this.name = "YetkiHatasi";
  }
}

/**
 * Kaynağın varlığını bile sızdırmamak gereken durumlarda kullanılır:
 * kapsamı dışındaki bir faaliyet 403 değil 404 döner
 * (bkz. references/permissions.md Bölüm 4).
 */
export class BulunamadiHatasi extends Error {
  constructor(mesaj = "Kayıt bulunamadı") {
    super(mesaj);
    this.name = "BulunamadiHatasi";
  }
}
