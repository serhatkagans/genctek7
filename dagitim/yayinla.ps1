<#
    GençTek — tek komutla GitHub'a gönder ve canlıya al.

        .\dagitim\yayinla.ps1              # main dalı
        .\dagitim\yayinla.ps1 -Dal deneme  # başka dal
        .\dagitim\yayinla.ps1 -SadeceGonder    # yalnızca push, canlıya alma

    İki adım yapar:
      1. git push  → github.com/serhatkagans/genctek7  (HTTPS, Credential Manager)
      2. ssh genctek genctek-yayinla → sunucuda yedek + derleme + migration + restart

    `origin` SUNUCUNUN ÇEKTİĞİ DEPOYU göstermek zorundadır. 7 Ağustos 2026'da
    depo genctek4'ten genctek5'e taşındı ve bir tur boyunca yerel `origin`
    eskisinde kaldı: push genctek4'e gitti, sunucu genctek5'ten çekti ve yayın
    hiçbir şeyi değiştirmeden "başarılı" bitti. İkisi ayrışırsa aynı sessiz
    hata tekrarlanır.

    15 Ağustos 2026'da depo genctek5'ten genctek6'ya, 18 Ağustos 2026'da
    genctek6'dan genctek7'ye taşındı. Her taşımada ÜÇ yer birden değişmeli:
    yerel `origin`, sunucudaki `/opt/genctek` deposunun `origin`'i ve GitHub'da
    dağıtım anahtarının kayıtlı olduğu depo. Biri unutulursa hata sessizdir,
    yayın "başarılı" der. Bkz. DAGITIM.md Bölüm 14.

    Sunucu kodu GitHub'dan çeker (dağıtım anahtarıyla, salt okunur). Bu yüzden
    ÖNCE push, SONRA yayın: push atlanırsa sunucu eski kodu çeker ve "başarılı"
    bir yayın hiçbir şeyi değiştirmez.

    Şifre sorulmaz: GitHub'da Credential Manager, sunucuda ~/.ssh/genctek
    anahtarı kullanılır. Bkz. DAGITIM.md Bölüm 14.
#>

param(
    [string]$Dal = "main",
    [switch]$SadeceGonder
)

$ErrorActionPreference = "Stop"

# Betik nereden çağrılırsa çağrılsın depo kökünde çalış.
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "==> Dal: $Dal" -ForegroundColor Cyan

# Gönderilmemiş yerel değişiklik varsa uyar. Commit edilmemiş bir dosya push'a
# girmez; sunucu onsuz derler ve eksikliği ancak canlıda fark edersiniz.
$kirli = git status --porcelain
if ($kirli) {
    Write-Host "!!! Commit edilmemiş değişiklikler var:" -ForegroundColor Yellow
    git status --short
    Write-Host "    Bunlar canlıya GİTMEZ. Yine de devam edilsin mi? (e/H)" -ForegroundColor Yellow
    $yanit = Read-Host
    if ($yanit -ne "e") { Write-Host "İptal edildi."; exit 1 }
}

Write-Host "==> [1/2] GitHub'a gönderiliyor" -ForegroundColor Cyan
git push origin $Dal
if ($LASTEXITCODE -ne 0) { Write-Host "!!! push başarısız — canlıya alma yapılmadı." -ForegroundColor Red; exit 1 }

if ($SadeceGonder) {
    Write-Host "==> Yalnızca gönderim istendi; canlıya alınmadı." -ForegroundColor Green
    exit 0
}

Write-Host "==> [2/2] Sunucuda yayınlanıyor (birkaç dakika sürer)" -ForegroundColor Cyan
ssh genctek genctek-yayinla $Dal
if ($LASTEXITCODE -ne 0) {
    Write-Host "!!! Yayın başarısız. Sunucu günlüğü:" -ForegroundColor Red
    Write-Host "    ssh genctek 'journalctl -u genctek -n 50 --no-pager'" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==> Tamamlandı: https://aiotechs.cloud/genctek" -ForegroundColor Green
