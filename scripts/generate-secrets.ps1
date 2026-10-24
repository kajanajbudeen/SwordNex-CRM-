# ==============================================================================
# SwordNex AI CRM — Cryptographic Production Secrets Generator (PowerShell)
# Generates independent, cryptographically secure secrets in .\secrets\
# ==============================================================================

$SecretsDir = Join-Path $PSScriptRoot "..\secrets"
if (-not (Test-Path $SecretsDir)) {
    New-Item -ItemType Directory -Path $SecretsDir | Out-Null
}

function Generate-CryptoRandomHex($bytesCount) {
    $bytes = New-Object byte[] $bytesCount
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    return -join ($bytes | ForEach-Object { "{0:x2}" -f $_ })
}

function Ensure-SecretFile($filename, $bytesCount) {
    $filePath = Join-Path $SecretsDir $filename
    if ((Test-Path $filePath) -and ((Get-Item $filePath).Length -gt 0)) {
        Write-Host "[KEEP] $filename already exists. Preserving existing secret." -ForegroundColor Cyan
    } else {
        $secret = Generate-CryptoRandomHex $bytesCount
        [System.IO.File]::WriteAllText($filePath, $secret)
        Write-Host "[CREATE] Generated $filename ($($bytesCount * 8) bits)" -ForegroundColor Green
    }
}

Write-Host "Generating SwordNex Production Secrets..." -ForegroundColor Yellow

Ensure-SecretFile "jwt_secret.txt" 64
Ensure-SecretFile "jwt_refresh_secret.txt" 64
Ensure-SecretFile "db_password.txt" 32

$dbPass = (Get-Content (Join-Path $SecretsDir "db_password.txt")).Trim()
$dbUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "swordnex_admin" }
$dbName = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "swordnex_crm" }
$dbUrl = "postgresql://${dbUser}:${dbPass}@database:5432/${dbName}?schema=public"

$dbUrlFile = Join-Path $SecretsDir "database_url.txt"
if (-not (Test-Path $dbUrlFile) -or ((Get-Item $dbUrlFile).Length -eq 0)) {
    [System.IO.File]::WriteAllText($dbUrlFile, $dbUrl)
    Write-Host "[CREATE] Generated database_url.txt from database credentials" -ForegroundColor Green
}

@("razorpay_key_secret.txt", "razorpay_webhook_secret.txt", "smtp_password.txt") | ForEach-Object {
    $target = Join-Path $SecretsDir $_
    if (-not (Test-Path $target)) {
        [System.IO.File]::WriteAllText($target, "")
        Write-Host "[TEMPLATE] Created placeholder $_ (populate with provider credentials)" -ForegroundColor Gray
    }
}

Write-Host "================================================================================" -ForegroundColor Yellow
Write-Host "Production secrets generated in .\secrets" -ForegroundColor Green
Write-Host "SECURITY NOTICE: Never commit the .\secrets directory to version control." -ForegroundColor Red
Write-Host "================================================================================" -ForegroundColor Yellow
