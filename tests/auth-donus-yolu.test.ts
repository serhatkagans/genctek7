import { guvenliDonusYolu } from "@/lib/auth/donus-yolu";

/**
 * Giriş sonrası dönüş yolunun güvenlik testleri.
 *
 * Buradaki her "kabul etmez" satırı bir AÇIK YÖNLENDİRME denemesidir: değer
 * adres çubuğundan geliyor ve gerçek giriş ekranından geçirilip sahte bir
 * siteye bırakılan kullanıcı, kimlik avının en ikna edici hâlidir.
 */

describe("giriş sonrası dönüş yolu", () => {
  it("panel içindeki yolları kabul eder", () => {
    expect(guvenliDonusYolu("/panel/etkinlikler/12")).toBe(
      "/panel/etkinlikler/12",
    );
    expect(guvenliDonusYolu("/panel")).toBe("/panel");
    expect(guvenliDonusYolu("/panel/etkinlikler?acik=1")).toBe(
      "/panel/etkinlikler?acik=1",
    );
  });

  it("boş ve tanımsız değerde null döner", () => {
    expect(guvenliDonusYolu(null)).toBeNull();
    expect(guvenliDonusYolu(undefined)).toBeNull();
    expect(guvenliDonusYolu("")).toBeNull();
  });

  it("dış adresleri kabul etmez", () => {
    expect(guvenliDonusYolu("https://ornek.com")).toBeNull();
    expect(guvenliDonusYolu("http://ornek.com/panel")).toBeNull();
    // Protokolsüz adres: tarayıcı bunu başka bir siteye çözer.
    expect(guvenliDonusYolu("//ornek.com")).toBeNull();
    expect(guvenliDonusYolu("/\\ornek.com")).toBeNull();
    expect(guvenliDonusYolu("/panel/../../ornek.com")).toBeNull();
  });

  it("kaçışla saklanmış dış adresi de kabul etmez", () => {
    expect(guvenliDonusYolu("%2f%2fornek.com")).toBeNull();
    expect(guvenliDonusYolu("/%5Cornek.com")).toBeNull();
    expect(guvenliDonusYolu("/panel%2f..%2f..%2fornek.com")).toBeNull();
  });

  it("bozuk kaçış dizisini reddeder", () => {
    expect(guvenliDonusYolu("/panel/%E0%A4%A")).toBeNull();
  });

  it("panel dışındaki uygulama yollarını kabul etmez", () => {
    // Oturum açan kişi panele girer; başka bir ekrana bırakmak için bir sebep
    // yok ve izinli ağacı dar tutmak, ileride eklenecek ekranları otomatik
    // olarak hedef hâline getirmiyor.
    expect(guvenliDonusYolu("/giris")).toBeNull();
    expect(guvenliDonusYolu("/")).toBeNull();
    // Önek benzerliği yetmez: "/panelimsi" panel değildir.
    expect(guvenliDonusYolu("/panelimsi/gizli")).toBeNull();
  });
});
