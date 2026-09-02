# GençTek'i yerelde (Windows) başlatır.
#
# baslat.bat bunu çağırır. Mantık .bat içinde değil burada duruyor: cmd'nin
# tırnak/kaçış kuralları çok satırlı PowerShell komutlarını sessizce bozuyor.

# "Stop" KULLANILMIYOR: PowerShell 5.1'de yerel komutların (npx, node)
# stderr'e yazdığı normal bilgi satırları da hata sayılıp betiği düşürüyor.
# Hatalar açıkça kontrol ediliyor (port dinleniyor mu, sayfa 200 mü).
$ErrorActionPreference = "Continue"

$proje = Split-Path -Parent $PSScriptRoot
Set-Location $proje

# İstenen portlar. Bunlar YALNIZCA İSTEKTİR: "prisma dev" bir sunucu adını bir
# kez porta bağlar, sonraki çağrılarda --db-port bayrağını yok sayar. Kayıtlı
# sunucu farklı bir portta açılmışsa (bizde 51214 istenmişken 51218 açıldı)
# istek tutmaz.
$ANA_PORT = 51213
$VERITABANI_PORT = 51214
$GOLGE_PORT = 51215
$UYGULAMA_PORT = 3000
$SUNUCU_ADI = "default"

function Dinliyor-Mu([int]$port) {
    $null -ne (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

<#
Veritabanının GERÇEKTE dinlediği adresi "prisma dev ls" çıktısından okur.

Neden gerekli: .env sabit bir port yazıyor, prisma dev ise kayıtlı sunucuyu
kendi seçtiği portta açıyor. İkisi ayrışınca uygulama sorunsuz açılıyor ama her
sorgu "Server has closed the connection" ile düşüyor — hiçbir yerde "port
yanlış" demeyen, teşhisi zor bir arıza. Portu tahmin etmek yerine soruyoruz.

Çıktı ANSI renk ve OSC-8 köprü kaçış dizileri içeriyor; temizlenip tam
bağlantı adresi ayıklanıyor.

DESENİN SONU ÖNEMLİ. Kaçışlar temizlenince, OSC-8 köprüsünün görünen metni
(kısaltılmış kopya: postgres://...@localhost) tam adresin HEMEN ARDINA,
aralarında boşluk olmadan yapışıyor. "[^\s]*" ile bittiği sürece desen ikisini
birden yutuyordu ve ortaya çıkan adres hem uygulamayı hem "prisma migrate
deploy"u düşürüyordu (`P1013 · The provided database string is invalid`) —
üstelik hata adresi göstermediği için sebebi görünmüyordu. Bu yüzden sorgu
dizesi tembel eşleşiyor ve ikinci "postgres://" başlamadan kesiliyor.
#>
function VeritabaniAdresiniOku {
    $ham = (& npx prisma dev ls 2>&1 | Out-String)
    $temiz = $ham -replace "\x1b\[[0-9;]*[A-Za-z]", "" -replace "\x1b\]8;;", ""
    $eslesme = [regex]::Match(
        $temiz,
        "postgres://postgres:postgres@localhost:(?<port>\d+)/template1(?:\?[^\s]*?)?(?=postgres://|\s|$)"
    )
    if (-not $eslesme.Success) { return $null }
    return [pscustomobject]@{
        Adres = $eslesme.Value
        Port  = [int]$eslesme.Groups["port"].Value
    }
}

Write-Host ""
Write-Host "  GencTek baslatiliyor" -ForegroundColor Cyan
Write-Host "  Klasor: $proje"
Write-Host ""

# --- 1. Veritabanı ---------------------------------------------------------
#
# Komut biçimi ÖNEMLİ, denenerek bulundu:
#
#   npx prisma dev start <ad>   -> BOZUK. "Started" yazar, kayıt defterini
#                                  "running" yapar ama hiçbir portu açmaz;
#                                  sonraki denemeler de "zaten çalışıyor"
#                                  diyerek reddedilir.
#   npx prisma dev (portsuz)    -> çalışır ama her açılışta BOŞ bir port seçer
#                                  (51214, sonra 51218...); .env sabit port
#                                  yazdığı için uygulama her sorguda düşer.
#   npx prisma dev --db-port .. -> ÇALIŞAN BİÇİM. Portları sabitler, mevcut
#              --detach            veritabanını korur, arka planda açar.
#
# --detach sayesinde veritabanının penceresi yoktur; yalnızca uygulama
# penceresi açık kalmalıdır.
$veritabani = VeritabaniAdresiniOku
if ($veritabani -and (Dinliyor-Mu $veritabani.Port)) {
    Write-Host "  [1/2] Veritabani zaten calisiyor (port $($veritabani.Port))."
} else {
    Write-Host "  [1/2] Veritabani baslatiliyor..."
    # 2>&1 YAZILMAZ: PS 5.1 yerel komutun stderr satırlarını ErrorRecord'a
    # çevirir ve komut başarılı olsa bile betik hata verir.
    & npx prisma dev --port $ANA_PORT --db-port $VERITABANI_PORT --shadow-db-port $GOLGE_PORT --detach | Out-Null

    $bitis = (Get-Date).AddSeconds(60)
    do {
        Start-Sleep -Seconds 2
        $veritabani = VeritabaniAdresiniOku
    } while (-not ($veritabani -and (Dinliyor-Mu $veritabani.Port)) -and (Get-Date) -lt $bitis)

    if ($veritabani -and (Dinliyor-Mu $veritabani.Port)) {
        Write-Host "        hazir (port $($veritabani.Port))." -ForegroundColor Green
    } else {
        Write-Host "        ACILAMADI." -ForegroundColor Red
        Write-Host "        Su komutu elle calistirip hatayi okuyun:" -ForegroundColor Red
        Write-Host "          npx prisma dev --port $ANA_PORT --db-port $VERITABANI_PORT --shadow-db-port $GOLGE_PORT"
        Read-Host "  Devam etmek icin Enter"
    }
}

<#
Uygulamaya veritabanı adresi ORTAM DEĞİŞKENİ olarak geçilir; .env dosyasına
yazılmaz.

İki neden: (1) .env kullanıcının dosyası, betik onu ezmemeli; (2) dotenv var
olan ortam değişkenini ezmez, dolayısıyla burada verilen değer .env'deki eski
portu geçersiz kılar. Böylece port kayması uygulamayı bozmaz.
#>
if ($veritabani) {
    $env:DATABASE_URL = $veritabani.Adres
    Write-Host "        DATABASE_URL port $($veritabani.Port) olarak ayarlandi."
}


<#
Şema ve referans veriler.

BURADA OLMASI GEREKİYOR: "prisma dev" bomboş bir template1 ile kalkabiliyor
(kayıtlı örnek silinmişse ya da .env başka bir örneğe bakıyorsa). O durumda
uygulama `P2021 · public.kullanici does not exist` veriyor ve giriş ekranı —
kimlik listesini veritabanından çektiği için — beyaz sayfaya düşüyor.
Betik bu iki komutu çalıştırmadığı sürece kullanıcının elle yazması
gerekiyordu.

migrate deploy her açılışta koşar: bekleyen migration yoksa saniyeler sürer ve
"No pending migrations to apply." der. Tohumlama YALNIZCA migration
uygulandığında yapılır — veritabanı ya sıfırdan kurulmuştur ya da yeni bir
şema parçası gelmiştir; ikisinde de referans veri eksik olabilir. Tohumlama
idempotent, ama her açılışta koşturmak gereksiz yere yavaşlatırdı.
#>
if ($veritabani) {
    Write-Host "        Sema kontrol ediliyor..."
    # stderr'i de topluyoruz (hata metni orada), ama ErrorRecord'ları düz
    # metne çeviriyoruz: PS 5.1 onları olduğu gibi yazdırınca çıktıya
    # "At line:1 char:1 + & ..." çerçevesi giriyor ve asıl satır kayboluyor.
    $migrasyon = (& npx prisma migrate deploy 2>&1 |
        ForEach-Object {
            if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.Exception.Message } else { $_ }
        } | Out-String)
    foreach ($satir in ($migrasyon -split "`r?`n")) {
        if ($satir.Trim()) { Write-Host "          $($satir.Trim())" -ForegroundColor DarkGray }
    }

    if ($migrasyon -match "Applying migration") {
        Write-Host "        Migration uygulandi; referans veriler yukleniyor..."
        & npm run db:seed 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "        Referans veriler hazir." -ForegroundColor Green
        } else {
            Write-Host "        TOHUMLAMA BASARISIZ. Elle: npm run db:seed" -ForegroundColor Red
        }
    } elseif ($migrasyon -match "does not exist|P1001|Error:") {
        Write-Host "        SEMA UYGULANAMADI. Elle: npx prisma migrate deploy" -ForegroundColor Red
    }
}
# --- 2. Uygulama -----------------------------------------------------------
# Bu pencere AÇIK KALMALI; kapatılırsa uygulama durur.
if (Dinliyor-Mu $UYGULAMA_PORT) {
    Write-Host "  [2/2] Uygulama zaten calisiyor."
} else {
    Write-Host "  [2/2] Uygulama baslatiliyor..."
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "npm run dev" -WorkingDirectory $proje

    $bitis = (Get-Date).AddSeconds(90)
    while (-not (Dinliyor-Mu $UYGULAMA_PORT) -and (Get-Date) -lt $bitis) {
        Start-Sleep -Seconds 2
    }
    if (Dinliyor-Mu $UYGULAMA_PORT) {
        Write-Host "        hazir." -ForegroundColor Green
    } else {
        Write-Host "        ACILAMADI. Acilan siyah penceredeki hataya bakin." -ForegroundColor Red
    }
}

# --- Gerçekten çalışıyor mu -------------------------------------------------
# Port dinleniyor olması yetmez: veritabanı bağlantısı kopuksa sayfa 500 döner.
# Bu yüzden giriş ekranı (veritabanına giden bir sayfa) sınanıyor.
$saglikli = $false
try {
    $yanit = Invoke-WebRequest -Uri "http://localhost:$UYGULAMA_PORT/giris" -UseBasicParsing -TimeoutSec 40
    $govde = [string]$yanit.Content
    # Durum kodu TEK BASINA YETMEZ: hata sinir sayfasi (src/app/error.tsx) da
    # HTTP 200 doner. Veritabani kopukken ekran "Beklenmeyen bir hata olustu"
    # basar ama betik "hazir" derdi. Bu yuzden govde de sinaniyor.
    $saglikli = ($yanit.StatusCode -eq 200) -and ($govde -notmatch "Beklenmeyen bir hata")
} catch {
    $saglikli = $false
}

Write-Host ""
if ($saglikli) {
    Write-Host "  Hazir: http://localhost:$UYGULAMA_PORT" -ForegroundColor Green
    Start-Process "http://localhost:$UYGULAMA_PORT"
} else {
    Write-Host "  Uygulama ayakta ama giris ekrani yanit vermiyor." -ForegroundColor Yellow
    Write-Host "  Genellikle veritabani baglantisidir. Kontrol: npx prisma dev ls"
}

Write-Host ""
Write-Host "  Uygulama penceresi (npm run dev) KAPATILMAMALI." -ForegroundColor Yellow
Write-Host "  Veritabani arka planda calisir, penceresi yoktur."
Write-Host "  Durdurmak icin: durdur.bat"
Write-Host ""
