<#
.SYNOPSIS
FÊNIX OS - BOOTSTRAP INSTALLER (WINDOWS)
#>

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "       FÊNIX BOOTSTRAP (WINDOWS)         " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

Write-Host "[1/3] Environment Discovery..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host " -> Node.js ausente. Baixe e instale do site oficial (v20+)." -ForegroundColor Red
    exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host " -> Git ausente. Baixe e instale do site oficial." -ForegroundColor Red
    exit 1
}

Write-Host "[2/3] Baixando a plataforma FÊNIX..." -ForegroundColor Yellow
$InstallDir = "C:\FenixOS"
if (!(Test-Path -Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir | Out-Null
}
Set-Location -Path $InstallDir

if (Test-Path "ai-engine") {
    Write-Host " -> Repositório detectado. Atualizando..." -ForegroundColor Green
    Set-Location "ai-engine"
    git pull origin feat/fenix-rc20-reality-first-flows
} else {
    Write-Host " -> Clonando código..." -ForegroundColor Green
    git clone -b feat/fenix-rc20-reality-first-flows https://github.com/Biel0071/AI-ENGINE.git ai-engine
    Set-Location "ai-engine"
}

Write-Host "[3/3] Iniciando o FÊNIX Discovery Engine..." -ForegroundColor Yellow
Set-Location "platform\bootstrap"
npm install
npm install -g pm2
node installer.js

Write-Host "FÊNIX OS INSTALADO NO WINDOWS!" -ForegroundColor Cyan
