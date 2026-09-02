# GençTek'in yerel süreçlerini durdurur.
#
# Pencereyi elle kapatmak yerine bunu kullanın: Next.js dev sunucusu kendini
# ayrı bir süreç olarak da çalıştırdığı için pencereyi kapatmak arkada takılı
# bir süreç bırakabiliyor ("Another next dev server is already running").

$proje = Split-Path -Parent $PSScriptRoot
Set-Location $proje

$UYGULAMA_PORT = 3000
$SUNUCU_ADI = "default"

Write-Host ""

# --- 1. Uygulama -----------------------------------------------------------
$idler = Get-NetTCPConnection -LocalPort $UYGULAMA_PORT -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique

if ($idler) {
    foreach ($id in $idler) {
        $surec = Get-Process -Id $id -ErrorAction SilentlyContinue
        if ($surec) {
            Write-Host ("  Uygulama kapatiliyor: PID {0}" -f $id)
            Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
        }
    }
} else {
    Write-Host "  Uygulama zaten kapali."
}

# --- 2. Veritabanı ---------------------------------------------------------
#
# SÜREÇ ÖLDÜRÜLMEZ. "prisma dev" öldürülünce kilit dosyası geride kalır ve bir
# sonraki açılış "Lock file is already being held" ile düşer; kilidi elle
# silmek gerekir. Kendi stop komutu bunu temiz yapar.
Write-Host "  Veritabani durduruluyor..."
& npx prisma dev stop $SUNUCU_ADI | Out-Null

Start-Sleep -Seconds 2

<#
Yarı ölü veritabanı süreci (27 Ağustos 2026).

"prisma dev stop" yalnızca sağlıklı sunucuya işliyor. Sunucu yarı ölüyse süreç
saatlerce ayakta kalıyor ve teşhisi zorlaştıran bir belirti zinciri üretiyor:
`prisma dev ls` "error" diyor, netstat portlarda hiçbir şey dinlemiyor
gösteriyor, buna rağmen yeniden başlatma "Port 51213 is not available" ile
düşüyor — kilit işletim sistemi soketinde değil, sürecin kendi kayıt
defterinde. Tek çözüm süreci PID ile öldürmek; makineyi yeniden başlatmak
gerekmiyor.

Bu blok stop'tan SONRA çalışır: temiz kapanışta ortada süreç kalmadığı için
hiçbir şey yapmaz, kilit dosyası da stop tarafından düzgün silinmiş olur.
Yalnızca stop'un işlemediği durumda devreye girer.
#>
$kalanVeritabani = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -match "prisma" -and $_.CommandLine -match "\bdev\b" }

foreach ($surec in $kalanVeritabani) {
    Write-Host ("  Yari olu veritabani sureci kapatiliyor: PID {0}" -f $surec.ProcessId) -ForegroundColor Yellow
    Stop-Process -Id $surec.ProcessId -Force -ErrorAction SilentlyContinue
}

$kalan = Get-NetTCPConnection -LocalPort @(3000, 51213, 51214, 51215, 51216) -State Listen -ErrorAction SilentlyContinue
Write-Host ""
if ($kalan) {
    Write-Host "  UYARI: bazi portlar hala acik:" -ForegroundColor Red
    $kalan | ForEach-Object { Write-Host ("    port {0} (PID {1})" -f $_.LocalPort, $_.OwningProcess) }
} else {
    Write-Host "  Durduruldu." -ForegroundColor Green
}

Write-Host ""
Write-Host "  Yeniden baslatmak icin: baslat.bat"
Write-Host ""
