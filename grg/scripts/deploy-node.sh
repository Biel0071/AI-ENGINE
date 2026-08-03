#!/bin/bash

# ============================================================================
# FÊNIX OS - DISTRIBUTED NODE DEPLOYMENT SCRIPT
# Run this on your VPS to bootstrap a Fenix Node (e.g., AIGateway, CRM, etc.)
# ============================================================================

set -e

echo "========================================="
echo "   FÊNIX OS v2.0 - BOOTSTRAP REMOTE NODE "
echo "========================================="

# 1. Update and install dependencies
echo "[1/4] Atualizando sistema e instalando dependências base..."
apt-get update -y
apt-get install -y curl git build-essential

# 2. Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "[2/4] Instalando Node.js v20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "[2/4] Node.js já instalado. Versão: $(node -v)"
fi

# 3. Clone Repository FENIX OS
echo "[3/5] Baixando a versão GO-LIVE do FÊNIX OS..."
mkdir -p /opt/fenix-os
cd /opt/fenix-os
rm -rf ai-engine
git clone https://github.com/Biel0071/AI-ENGINE.git ai-engine
cd ai-engine/grg
echo "[3/5] Instalando dependências..."
npm install

# 4. Configurar Ambiente de Produção Seguro
echo "[4/5] Gerando chaves de segurança..."
mkdir -p /root/.fenixos
if [ ! -f "/root/.fenixos/node.env" ]; then
    MASTER_TOKEN=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    echo "SERVICE_TOKEN_MASTER=$MASTER_TOKEN" > /root/.fenixos/node.env
    echo "NODE_ENV=production" >> /root/.fenixos/node.env
    chmod 600 /root/.fenixos/node.env
    echo "Token mestre gerado: $MASTER_TOKEN"
fi

# 5. Configurar Serviço 24/7 (PM2)
echo "[5/5] Iniciando o FÊNIX OS (Daemon) em background via PM2..."
npm install -g pm2
pm2 kill || true
pm2 start bin/fenix.js --name "fenix-daemon" -- up
pm2 save
pm2 startup | tail -n 1 | bash

echo "========================================="
echo " DEPLOY CONCLUÍDO COM SUCESSO!"
echo " O FÊNIX OS está ONLINE e rodando 24/7."
echo " Base URL da API local do nó: https://209.50.241.22:4400"
echo " (Ou 3000 dependendo da porta do gateway)"
echo " Para ver os logs da IA em tempo real: pm2 logs fenix-daemon"
echo "========================================="
