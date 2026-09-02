/**
 * İmha kuralları — KVKK m.7, Genelge 3/e ve 3/g.
 *
 * Bu dosya SAF tutulur: veritabanına gitmez, "şimdi"yi parametre alır. İmhanın
 * kendisi ./imha.ts içinde; buradaki kararlar (kim aday, ne ile değiştirilir)
 * birim testle sınanabilsin diye ayrıldı — aynı ayrım kurallar.ts/saklama.ts
 * ikilisinde de var.
 *
 * İMHA ≠ SATIR SİLME. Kullanıcı satırı yirmiden fazla tablonun yabancı
 * anahtarı; silinmesi ya zincirleme silme ya da kısıt hatası demekti. Bunun
 * yerine kimliğe götüren alanlar boşaltılır. KVKK'nın imha yöntemleri
 * arasında ANONİM HÂLE GETİRME de sayılıdır ve burada uygulanan budur:
 * geriye kalan satır artık bir kişiye bağlanamaz.
 */

/**
 * İmha edilmiş kaydın ekranlarda görünen adı.
 *
 * Boş bırakılmıyor: adı boş bir satır, ekranda "veri kayboldu mu" sorusunu
 * doğurur ve destek çağrısı üretir. Kaydın niye böyle olduğunu okunur biçimde
 * söylemek, aynı yerde sessiz kalmaktan iyi.
 */
export const IMHA_EDILMIS_AD = "İmha edilmiş";
export const IMHA_EDILMIS_SOYAD = "kullanıcı";

/**
 * Cinsiyet NOT NULL ve Char(1); boş geçilemiyor. "E"/"K" dışında bir değer
 * seçildi, çünkü ikisinden birini yazmak imha edilmiş kayda OLMAYAN bir bilgi
 * eklerdi.
 */
export const IMHA_EDILMIS_CINSIYET = "-";

/** İmha edilen metin alanlarının yerine yazılan değer. */
export const IMHA_EDILMIS_ICERIK = "";

/**
 * AuthProvider kimliği UNIQUE; imhada null yapılamıyor (sütun NOT NULL) ve
 * sabit bir değer verilemez (ikinci imha unique kısıtına takılırdı). Kayıt
 * kimliği zaten benzersiz olduğu için ondan türetiliyor.
 *
 * EBA kimliğinin GİTMESİ şart: kalsaydı satır o kişiye geri bağlanabilirdi ve
 * "anonim hâle getirildi" denemezdi. Bedeli, aynı kişi yıllar sonra sisteme
 * dönerse yeni bir kayıt açılmasıdır — geçmişi bağlanmaz. Bu, imhanın
 * tanımı gereği böyledir.
 */
export function imhaAuthProviderId(kullaniciId: number): string {
  return `imha-${kullaniciId}`;
}

/**
 * Bu kayıt imha edilmeli mi?
 *
 * Çıpa `sonSenkronTarihi`: kişiyi en son ne zaman gördüğümüz (girişi ya da
 * e-Okul/EBA eşitlemesi). Mezuniyet/ilişik kesme olayı sistemde YOK, bu yüzden
 * süre ona bağlanamıyor (bkz. kurallar.ts · VARSAYILAN_HAREKETSIZ_KULLANICI_AYI).
 *
 * Bir kez imha edilen kayıt bir daha aday olmaz: aksi hâlde her ay aynı
 * satırlar yeniden yazılırdı.
 */
export function imhaAdayiMi(
  kayit: { sonSenkronTarihi: Date; anonimlestirmeTarihi: Date | null },
  sinir: Date,
): boolean {
  if (kayit.anonimlestirmeTarihi !== null) return false;
  return kayit.sonSenkronTarihi < sinir;
}

/**
 * Gizlenmiş içeriğin imha penceresi hangi andan işler?
 *
 * Gizlenme tarihi bilinmiyorsa (mesajda sütun 2 Eylül 2026'da eklendi, eski
 * satırlar boş) oluşturma tarihine düşülür. Tersi — bilinmeyeni "hiç imha
 * etme" saymak — o satırları süresiz saklamak olurdu ki düzeltilmek istenen
 * şey tam olarak budur.
 */
export function gizliIcerikImhaAni(kayit: {
  gizlenmeTarihi: Date | null;
  olusturmaTarihi: Date;
}): Date {
  return kayit.gizlenmeTarihi ?? kayit.olusturmaTarihi;
}

/** Kullanıcı satırında imha sonrası kalacak kimlik alanları. */
export function imhaEdilmisKimlik(kullaniciId: number) {
  return {
    authProviderId: imhaAuthProviderId(kullaniciId),
    ad: IMHA_EDILMIS_AD,
    soyad: IMHA_EDILMIS_SOYAD,
    cinsiyet: IMHA_EDILMIS_CINSIYET,
    /*
     * Sınıf ve branş da gider: tek başına kimlik değil ama okul/il ile
     * birleştiğinde küçük bir okulda kişiyi teke indirir. Kurum, il ve ilçe
     * KALIR — raporlamanın dayanağı onlar ve isim gittikten sonra bir ili
     * işaret eden satır kimseyi işaret etmez.
     */
    sinif: null,
    brans: null,
    hakkinda: null,
    fotoDepolamaYolu: null,
    fotoMimeTipi: null,
    fotoYuklenmeTarihi: null,
    aktif: false,
  };
}

/** Profil satırlarında (öğrenci/öğretmen) imha edilen alanlar. */
export function imhaEdilmisProfil() {
  return {
    eposta: null,
    telefon: null,
    cvDosyaAdi: null,
    cvDepolamaYolu: null,
    cvMimeTipi: null,
    cvBoyutBayt: null,
    cvYuklenmeTarihi: null,
    cvEkNotu: null,
    githubUrl: null,
    kisiselSiteUrl: null,
    linkedinUrl: null,
    instagramUrl: null,
  };
}
