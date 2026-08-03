#!/bin/bash
# ============================================================================
# FÊNIX OS - BOOTSTRAP INSTALLER (ONE DEPLOY)
# ============================================================================
set -e

echo -e "\e[34m"
cat << "EOF"
 ___ _   _ _____ _____ ____ ____      _  _____ ___  ____    _   _  ___  ____ _____ 
|_ _| \ | |_   _| ____/ ___|  _ \    / \|_   _/ _ \|  _ \  | | | |/ _ \/ ___|_   _|
 | ||  \| | | | |  _|| |  _| |_) |  / _ \ | || | | | |_) | | |_| | | | \___ \ | |  
 | || |\  | | | | |__| |_| |  _ <  / ___ \| || |_| |  _ <  |  _  | |_| |___) || |  
|___|_| \_| |_| |_____\____|_| \_\/_/   \_\_| \___/|_| \_\ |_| |_|\___/|____/ |_|  
EOF
echo -e "\e[0m"

echo "[1/3] Preparando terreno (Environment Validation)..."
if ! command -v node &> /dev/null; then
    echo " -> Node.js ausente. Instalando v20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo " -> Node.js detectado ($(node -v))."
fi

if ! command -v npm &> /dev/null; then apt-get install -y npm; fi
if ! command -v git &> /dev/null; then apt-get install -y git; fi

echo "[2/3] Baixando a plataforma FÊNIX..."
mkdir -p /opt/fenix
cd /opt/fenix

if [ -d "/opt/fenix/ai-engine" ]; then
    echo " -> Repositório existente detectado. Atualizando..."
    cd ai-engine
    git pull origin feat/fenix-rc20-reality-first-flows || true
else
    echo " -> Repositório não encontrado. Necessário clonagem inicial."
    git clone -b feat/fenix-rc20-reality-first-flows https://github.com/Biel0071/AI-ENGINE.git ai-engine || echo "Falha ao clonar repo privado. Certifique-se de que o código já foi copiado via SCP para /opt/fenix/ai-engine"
    cd ai-engine || exit 1
fi

echo "[3/3] Iniciando o FÊNIX Discovery Engine..."
cd platform/bootstrap
npm install

if ! command -v pm2 &> /dev/null; then npm install -g pm2; fi

# Executa o Motor Node de Discovery e Setup
node installer.js

# Cria um link simbólico para "fenix up" funcionar no terminal global
ln -sf /opt/fenix/ai-engine/platform/cli/fenix.js /usr/local/bin/fenix
chmod +x /usr/local/bin/fenix

echo "FÊNIX OS INSTALADO! Digite 'fenix up' ou 'fenix' para conversar."
