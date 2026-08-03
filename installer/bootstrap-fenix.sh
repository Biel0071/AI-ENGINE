#!/usr/bin/env bash
set -e

# ==============================================================================
# FÊNIX OS - ENTERPRISE BOOTSTRAP INSTALLER (v3.0)
# Idempotente, Defensivo e Resiliente.
# ==============================================================================

# Cores e Logging
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'
log() { echo -e "${GREEN}[FÊNIX]${NC} $1"; }
warn() { echo -e "${YELLOW}[AVISO]${NC} $1"; }
abort() { echo -e "${RED}[FALHA] $1${NC}"; exit 1; }

TARGET_DIR="/opt/fenix-os"
TEMP_DIR="/tmp/fenix_deploy_$$"
BACKUP_DIR="/opt/fenix-os_backup_$(date +%Y%m%d%H%M%S)"
ZIP_URL="https://github.com/Biel0071/AI-ENGINE/archive/refs/heads/feat/fenix-rc20-reality-first-flows.zip"

log "Iniciando Deploy Idempotente do FÊNIX OS..."

# 1. Detectar SO
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_ID=$ID
    OS_LIKE=$ID_LIKE
else
    abort "Sistema Operacional não suportado ou /etc/os-release ausente."
fi

log "Sistema detectado: $PRETTY_NAME"
PKG_MGR=""
if echo "$OS_LIKE" | grep -q "rhel\|fedora" || echo "$OS_ID" | grep -q "almalinux\|rocky\|centos"; then
    PKG_MGR="dnf"
    command -v dnf >/dev/null 2>&1 || PKG_MGR="yum"
elif echo "$OS_LIKE" | grep -q "debian" || echo "$OS_ID" | grep -q "ubuntu"; then
    PKG_MGR="apt-get"
else
    warn "Gerenciador de pacotes não identificado. Tentando prosseguir com binários locais."
fi

# 8. Instalar Dependências (se ausentes)
install_dep() {
    if ! command -v "$1" >/dev/null 2>&1; then
        warn "Dependência $1 ausente. Instalando via $PKG_MGR..."
        if [ "$PKG_MGR" = "apt-get" ]; then
            sudo apt-get update -y && sudo apt-get install -y "$1" || abort "Falha ao instalar $1"
        elif [ "$PKG_MGR" = "dnf" ] || [ "$PKG_MGR" = "yum" ]; then
            sudo $PKG_MGR install -y "$1" || abort "Falha ao instalar $1"
        else
            abort "Falta a dependência $1 e não sei como instalar neste SO."
        fi
    fi
}
install_dep curl
install_dep unzip

# 3. Baixar Versão Correta
log "Criando ambiente temporário de download ($TEMP_DIR)..."
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

log "Baixando artefato oficial..."
curl -fsSL "$ZIP_URL" -o fenix.zip || abort "Falha no download da release. Verifique permissões ou PAT."

# 4. Verificar Integridade do Download
if ! unzip -t fenix.zip > /dev/null 2>&1; then
    abort "O arquivo baixado está corrompido ou é um 404/Login Page (GitHub privado sem auth)."
fi

# 6. Extrair em Diretório Temporário
log "Extraindo artefato..."
unzip -q fenix.zip
EXTRACTED_FOLDER=$(ls -d */ | head -n 1)

# 7. Validar arquivos obrigatórios
if [ ! -f "${EXTRACTED_FOLDER}grg/ops/burn-test.sh" ] || [ ! -f "${EXTRACTED_FOLDER}platform/bootstrap/package.json" ]; then
    abort "O pacote baixado é inválido: arquivos estruturais ausentes."
fi

# 5. Backup da Instalação Anterior
if [ -d "$TARGET_DIR" ]; then
    log "Instalação anterior encontrada em $TARGET_DIR. Realizando backup para $BACKUP_DIR..."
    mv "$TARGET_DIR" "$BACKUP_DIR" || abort "Falha ao fazer backup da versão anterior."
fi

# Mover Temp para Target
log "Posicionando novos arquivos em $TARGET_DIR..."
mv "$EXTRACTED_FOLDER" "$TARGET_DIR"
rm -rf "$TEMP_DIR"

# Instalar Node se não existir (via NVM/Nodesource fallback)
if ! command -v node >/dev/null 2>&1; then
    warn "Node.js não detectado. Instalando..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
    sudo $PKG_MGR install -y nodejs || abort "Falha ao instalar Node.js."
fi

# Instalar PM2
if ! command -v pm2 >/dev/null 2>&1; then
    log "Instalando orquestrador PM2..."
    sudo npm install -g pm2 || abort "Falha ao instalar PM2."
fi

cd "$TARGET_DIR/grg"

# 9. Executar Build, 10. Testes, 11. Burn Test
log "Iniciando Hardening (Burn Test)..."
chmod +x ops/burn-test.sh
if ! bash ops/burn-test.sh; then
    warn "O Burn Test encontrou falhas. Tentando rollback..."
    if [ -d "$BACKUP_DIR" ]; then
        rm -rf "$TARGET_DIR"
        mv "$BACKUP_DIR" "$TARGET_DIR"
        abort "Deploy abortado e revertido com sucesso."
    else
        abort "Deploy falhou e não havia backup para reverter."
    fi
fi

# 12. Registrar no PM2
log "Registrando plataforma no PM2..."
cd "$TARGET_DIR/platform/bootstrap"
npm install --production --silent
pm2 delete fenix-os-daemon >/dev/null 2>&1 || true
pm2 start installer.js --name "fenix-os-daemon"
pm2 save >/dev/null 2>&1 || true

# Alias Global
sudo ln -sf "$TARGET_DIR/platform/cli/fenix.js" /usr/local/bin/fenix || true

# 14. Relatório Final
echo ""
echo "=========================================================="
echo -e "${GREEN}FÊNIX OS INSTALADO COM SUCESSO!${NC}"
echo "Localização: $TARGET_DIR"
echo "Backup: $BACKUP_DIR"
echo "Motor: $(pm2 status fenix-os-daemon | grep fenix-os-daemon | awk '{print $10}')"
echo "=========================================================="
echo "Digite 'fenix up' ou monitore via 'pm2 logs fenix-os-daemon'"
