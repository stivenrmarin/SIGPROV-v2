# ============================================================
#  SIGPROV - Aplica el icono y los metadatos al ejecutable
# ============================================================
#  electron-builder se configuro con signAndEditExecutable: false porque
#  winCodeSign incluye symlinks de macOS que Windows no puede crear sin
#  privilegios de administrador. Este script hace esa parte a mano.
#
#  Uso:  powershell -ExecutionPolicy Bypass -File scripts/aplicar_icono.ps1
# ============================================================

param(
    [string]$Frontend = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"

$icono = Join-Path $Frontend "build\icon.ico"
$unpacked = Join-Path $Frontend "release\win-unpacked"
$exe = Join-Path $unpacked "SIGPROV.exe"

if (-not (Test-Path $exe)) {
    Write-Host "[ERROR] No se encontro $exe. Ejecuta primero: npm run electron:build" -ForegroundColor Red
    exit 1
}

# Localizar rcedit en la cache de electron-builder
$rcedit = Get-ChildItem "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign" `
    -Recurse -Filter "rcedit-x64.exe" -ErrorAction SilentlyContinue |
    Select-Object -First 1

if (-not $rcedit) {
    Write-Host "[AVISO] No se encontro rcedit; el .exe queda con el icono por defecto." -ForegroundColor Yellow
    exit 0
}

Write-Host "Aplicando icono y metadatos a SIGPROV.exe..."

& $rcedit.FullName $exe `
    --set-icon $icono `
    --set-version-string "FileDescription" "SIGPROV - Inventario y Prediccion de Ventas" `
    --set-version-string "ProductName" "SIGPROV" `
    --set-version-string "CompanyName" "Universidad San Mateo" `
    --set-version-string "LegalCopyright" "Copyright (c) 2026 Universidad San Mateo" `
    --set-file-version "2.0.0.0" `
    --set-product-version "2.0.0.0" | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Icono y metadatos aplicados." -ForegroundColor Green
} else {
    Write-Host "[AVISO] rcedit devolvio codigo $LASTEXITCODE (el .exe sigue siendo funcional)." -ForegroundColor Yellow
}
