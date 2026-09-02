#!/usr/bin/env bash
#
# GençTek sürüm güncelleme — sunucuda genctek kullanıcısıyla çalıştırılır:
#
#   sudo -u genctek /opt/genctek/dagitim/guncelle.sh
#
# İlk kurulum için değil (bkz. DAGITIM.md); bu betik zaten kurulu bir sistemi
# yeni sürüme geçirir.
#
# Sıra önemlidir: önce derle, sonra migration, en son servisi yeniden başlat.
# Ters sırada yapılırsa eski kod yeni şemaya, ya da yeni kod eski şemaya karşı
# çalışır ve ikisi de hata verir.

set -euo pipefail

UYGULAMA_DIZINI="${UYGULAMA_DIZINI:-/opt/genctek}"
DAL="${DAL:-main}"

# Uygulamanın gerçekten ayağa kalktığını sınadığımız adres. Rehberin
# varsayılanı 3000 ve kök dizindir; alt dizine kurulmuş bir sunucuda
# (ör. aiotechs.cloud/genctek) hem port hem yol değişir ve varsayılan adres 404
# döner — sağlık kontrolü boşa düşüp betik başarılı bir güncellemeyi
# "başarısız" sayar. Bkz. DAGITIM.md Bölüm 13.
SAGLIK_URL="${SAGLIK_URL:-http://127.0.0.1:3000/}"

# Node'un bulunduğu dizin. Sistem Node'u eskiyse (bu projede sunucuda 16 var)
# ayrı bir dizine kurulur ve PATH'e ÖNE eklenmesi gerekir: npm'in shebang'i
# `/usr/bin/env node` olduğu için PATH'siz çağrılınca eski Node ile çalışır ve
# derleme anlaşılmaz bir hatayla düşer.
NODE_BIN_DIZINI="${NODE_BIN_DIZINI:-}"
if [ -n "$NODE_BIN_DIZINI" ]; then
  export PATH="$NODE_BIN_DIZINI:$PATH"
fi

cd "$UYGULAMA_DIZINI"

echo "==> Node: $(node --version) ($(command -v node))"

echo "==> Çalışan sürüm: $(git rev-parse --short HEAD 2>/dev/null || echo 'bilinmiyor')"

# Geri dönüş gerekirse hangi sürümde olduğumuzu bilmek şart.
ONCEKI_SURUM="$(git rev-parse HEAD)"
echo "    Sorun çıkarsa geri dönüş: git reset --hard $ONCEKI_SURUM"

echo "==> Kod çekiliyor ($DAL)"
git fetch --prune origin
git checkout "$DAL"
git pull --ff-only origin "$DAL"

echo "==> Bağımlılıklar"
# ci (install değil): package-lock.json neyi diyorsa onu kurar, sunucuda
# beklenmedik sürüm yükseltmesi olmaz.
npm ci

echo "==> Prisma istemcisi üretiliyor"
npx prisma generate

echo "==> Derleme"
npm run build

# Standalone çıktı statik dosyaları KENDİ İÇİNE ALMAZ; elle kopyalanmalı.
# Bu adım atlanırsa uygulama açılır ama sayfalar stilsiz gelir.
echo "==> Statik dosyalar standalone çıktısına kopyalanıyor"
rm -rf .next/standalone/.next/static
cp -r .next/static .next/standalone/.next/static
if [ -d public ]; then
  rm -rf .next/standalone/public
  cp -r public .next/standalone/public
fi

echo "==> Veritabanı migration'ları"
# deploy (dev değil): mevcut migration'ları uygular, yenisini ÜRETMEZ ve
# veritabanını sıfırlamayı asla teklif etmez.
npx prisma migrate deploy

echo "==> Referans veriler (idempotent)"
npm run db:seed

echo "==> Servisler yeniden başlatılıyor"
# UYGULAMA ÜÇ KOPYA HALİNDE ÇALIŞIR (2 Eylül 2026). Tek Node süreci 4 vCPU'nun
# yalnızca birini kullanabiliyordu; kopyalar Apache'de dengeleniyor (vhost:
# balancer://genctek). Kopya listesi ÜÇ YERDE tutulur ve üçü birlikte
# güncellenmelidir: burası, vhost'taki BalancerMember satırları ve
# /etc/sudoers.d/genctek.
#
# HEPSİ YENİDEN BAŞLAMALI: biri atlanırsa o kopya ESKİ KODLA çalışmaya devam
# eder, yayın yine "başarılı" der ve hata ancak kullanıcı o kopyaya düştüğünde
# görünür. Bu depoda sessiz yayın hatasının geçmişi var (bkz. yayinla.ps1).
#
# SIRAYLA, hepsi birden değil: her an en az iki kopya ayakta kalır, dengeleyici
# yeniden başlayanı atlar ve yayın kesintisiz geçer.
#
# Betik genctek kullanıcısıyla çalıştığı için systemctl sudo ister; HER KOMUT
# için sudoers'a ayrı kural gerekir (bkz. DAGITIM.md Bölüm 8).
KOPYALAR="${KOPYALAR:-genctek:3010 genctek@3020:3020 genctek@3021:3021}"

for kopya in $KOPYALAR; do
    servis="${kopya%%:*}"
    port="${kopya##*:}"
    echo "    $servis (port $port)"
    sudo systemctl restart "$servis"

    # Kendi portundan sorulur, dengeleyiciden DEĞİL: dengeleyici üzerinden
    # sorulsaydı ayakta duran öteki kopya cevap verir ve yeniden başlatılan
    # kopya hiç açılmasa bile kontrol geçerdi.
    for deneme in $(seq 1 20); do
        if curl -fsS -o /dev/null "http://127.0.0.1:$port${TEMEL_YOL:-/genctek}"; then
            break
        fi
        if [ "$deneme" -eq 20 ]; then
            echo "!!! $servis 20 saniyede yanıt vermedi; yayın durduruldu."
            echo "!!! Geri dönmek için: git reset --hard $ONCEKI_SURUM && $0"
            exit 1
        fi
        sleep 1
    done
done

echo "==> Sağlık kontrolü ($SAGLIK_URL)"
for deneme in $(seq 1 15); do
  if curl -fsS -o /dev/null "$SAGLIK_URL"; then
    echo "    Uygulama yanıt veriyor."
    echo "==> Güncelleme tamamlandı: $(git rev-parse --short HEAD)"
    exit 0
  fi
  sleep 2
done

echo "!!! Uygulama 30 saniyede yanıt vermedi. Günlük:"
sudo journalctl -u genctek -n 40 --no-pager
echo "!!! Geri dönmek için: git reset --hard $ONCEKI_SURUM && $0"
exit 1
