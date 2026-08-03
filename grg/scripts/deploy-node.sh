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

# 3. Clone Repository (Substitua pela URL do seu repositório privado se necessário)
# mkdir -p /opt/fenix-os
# cd /opt/fenix-os
# git clone <YOUR_REPO_URL> .
# npm install

# 4. Configurar Ambiente de Produção Seguro
echo "[3/4] Gerando chaves de segurança (mTLS / Bearer)..."
mkdir -p /root/.fenixos
if [ ! -f "/root/.fenixos/node.env" ]; then
    MASTER_TOKEN=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    echo "SERVICE_TOKEN_MASTER=$MASTER_TOKEN" > /root/.fenixos/node.env
    echo "NODE_ENV=production" >> /root/.fenixos/node.env
    chmod 600 /root/.fenixos/node.env
    echo "Token mestre gerado: $MASTER_TOKEN"
    echo "GUARDE ESTE TOKEN! O Kernel local precisará dele para orquestrar este nó."
fi

# 5. Configurar Serviço Systemd
echo "[4/4] Instalando serviço de persistência 24/7 (systemd)..."

cat <<EOF > /etc/systemd/system/fenix-node.service
[Unit]
Description=Fenix OS Remote Node
After=network.target

[Service]
EnvironmentFile=/root/.fenixos/node.env
# Altere o caminho abaixo para apontar para o binário real do node isolado
# ExecStart=/usr/bin/node /opt/fenix-os/src/nodes/ai-gateway-node.js
ExecStart=/usr/bin/node -v
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable fenix-node.service
# systemctl start fenix-node.service

echo "========================================="
echo " DEPLOY CONCLUÍDO COM SUCESSO!"
echo " A API do Node estará disponível na porta definida pelo serviço (ex: 4500)."
echo " Lembre-se de apontar o IP desta VPS no seu NodeRegistry local."
echo "========================================="
