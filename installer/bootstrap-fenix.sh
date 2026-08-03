#!/usr/bin/env bash
set -e

# ==============================================================================
# FÊNIX OS - MODO GO-LIVE (BOOTSTRAP RUNTIME V4)
# ==============================================================================

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
log() { echo -e "${CYAN}➜${NC} $1"; }
ok() { echo -e "${GREEN}✔${NC} $1"; }
warn() { echo -e "${YELLOW}⚠️${NC} $1"; }
abort() { echo -e "${RED}✖ $1${NC}"; exit 1; }

TARGET_DIR="/opt/fenix-os"
TEMP_DIR="/tmp/fenix_deploy_$$"
BACKUP_DIR="/opt/fenix-os_backup_$(date +%Y%m%d%H%M%S)"
ZIP_URL="https://github.com/Biel0071/AI-ENGINE/archive/refs/heads/feat/fenix-rc20-reality-first-flows.zip"

echo -e "${GREEN}
╔════════════════════════════════════════════════════════╗
║             FÊNIX OS - MODO GO-LIVE (V4)               ║
╚════════════════════════════════════════════════════════╝
${NC}"

# Baixar e preparar codigo primeiro (para ter o nodejs discovery disponível)
log "Baixando artefatos vitais e verificando integridade..."
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"
curl -fsSL "$ZIP_URL" -o fenix.zip || abort "Falha no download. Configure o PAT/Deploy Key."
if ! unzip -t fenix.zip > /dev/null 2>&1; then abort "Arquivo corrompido (404/Private Auth)."; fi
unzip -q fenix.zip
EXTRACTED_FOLDER=$(ls -d */ | head -n 1)

# Faz Backup e Substitui
if [ -d "$TARGET_DIR" ]; then mv "$TARGET_DIR" "$BACKUP_DIR"; fi
mv "$EXTRACTED_FOLDER" "$TARGET_DIR"
rm -rf "$TEMP_DIR"
cd "$TARGET_DIR/grg"

log "Garantindo Node.js e PM2 nativos..."
if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
    sudo dnf install -y nodejs 2>/dev/null || sudo apt-get install -y nodejs
fi
if ! command -v pm2 >/dev/null 2>&1; then sudo npm install -g pm2; fi

npm install --production --silent

# O próprio installer.js vai realizar as 18 fases agora usando Node.js
# Vamos acioná-lo de forma sincrona para a inicialização e depois joga pro PM2
log "Iniciando Environment Discovery & Registry Sync..."
node ../platform/bootstrap/installer.js --init-only || {
    warn "Falha na inicializacao. Acionando Rollback..."
    if [ -d "$BACKUP_DIR" ]; then rm -rf "$TARGET_DIR"; mv "$BACKUP_DIR" "$TARGET_DIR"; fi
    abort "Rollback concluido. Sistema retornou ao estagio seguro anterior."
}

# 13. Executar Burn Test
log "Acionando Burn Test..."
chmod +x ops/burn-test.sh
if ! bash ops/burn-test.sh; then
    warn "Burn Test reprovado. Acionando Rollback..."
    if [ -d "$BACKUP_DIR" ]; then rm -rf "$TARGET_DIR"; mv "$BACKUP_DIR" "$TARGET_DIR"; fi
    abort "Rollback concluido."
fi

# 14. Executar Health (Sincrono)
log "Executando Health Checks (Zero Mock)..."
node ../platform/bootstrap/installer.js --health-only

# 16. Registrar Runtime e 17. Subir PM2
log "Registrando FÊNIX Runtime no PM2..."
cd ../platform/bootstrap
npm install --production --silent
pm2 delete fenix-os-daemon >/dev/null 2>&1 || true
pm2 start installer.js --name "fenix-os-daemon" -- --daemon
pm2 save >/dev/null 2>&1 || true

sudo ln -sf "$TARGET_DIR/platform/cli/fenix.js" /usr/local/bin/fenix || true

# 18. Mostrar Dashboard
echo -e "${GREEN}
╔════════════════════════════════════════════════════════╗
║             FÊNIX OS - ONLINE E ANCORADO               ║
╚════════════════════════════════════════════════════════╝
${NC}"
pm2 status fenix-os-daemon
echo -e "\nO comando 'fenix up' concluiu. O FÊNIX Runtime (V4) assumiu a operação."
