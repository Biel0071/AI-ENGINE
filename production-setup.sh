#!/bin/bash

# ZapAI CRM - Produção Setup Completo
# Este script configura back e front estáveis na VPS

set -e

echo "🚀 ZapAI CRM - Configuração de Produção"
echo "========================================"

# Configurações
INSTALL_DIR="/opt/zapai-crm"
BACKEND_PORT=4000
FRONTEND_BUILD_DIR="/opt/zapai-crm/crm/frontend/dist"
NGINX_PORT=80
HTTPS_PORT=443

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Verificar se é root
if [ "$EUID" -ne 0 ]; then
    log_error "Execute como root ou com sudo"
    exit 1
fi

# 1. Instalar dependências do sistema
install_system_deps() {
    log_info "Instalando dependências do sistema..."
    apt-get update
    apt-get install -y nginx curl wget
    
    # Node.js se não existir
    if ! command -v node &> /dev/null; then
        log_info "Instalando Node.js 20.x..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    fi
    
    log_info "Dependências instaladas"
}

# 2. Copiar arquivos para diretório de instalação
copy_files() {
    log_info "Copiando arquivos para $INSTALL_DIR..."
    mkdir -p "$INSTALL_DIR"
    cp -r /workspace/* "$INSTALL_DIR/"
    chown -R root:root "$INSTALL_DIR"
    log_info "Arquivos copiados"
}

# 3. Setup do Backend
setup_backend() {
    log_info "Configurando backend..."
    cd "$INSTALL_DIR/crm/backend"
    
    # Instalar dependências
    npm install --production
    
    # Criar diretório de logs
    mkdir -p logs
    chmod 755 logs
    
    # Criar arquivo .env de produção
    cat > .env.production << ENVEOF
PORT=$BACKEND_PORT
NODE_ENV=production
FRONTEND_URL=*
OPENAI_API_KEY=$OPENAI_API_KEY
ENVEOF
    
    # Criar serviço systemd
    cat > /etc/systemd/system/zapai-backend.service << SVCEOF
[Unit]
Description=ZapAI CRM Backend
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/crm/backend
Environment="NODE_ENV=production"
Environment="PORT=$BACKEND_PORT"
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=zapai-backend

[Install]
WantedBy=multi-user.target
SVCEOF
    
    log_info "Backend configurado"
}

# 4. Setup do Frontend
setup_frontend() {
    log_info "Configurando frontend..."
    cd "$INSTALL_DIR/crm/frontend"
    
    # Instalar dependências
    npm install --production
    
    # Build de produção
    npm run build
    
    log_info "Frontend configurado"
}

# 5. Iniciar serviços Docker (Qdrant, Docling)
start_docker_services() {
    log_info "Iniciando serviços Docker..."
    cd "$INSTALL_DIR"
    
    # Iniciar containers
    docker-compose up -d
    
    # Aguardar Qdrant estar pronto
    sleep 10
    
    log_info "Serviços Docker iniciados"
}

# 6. Configurar Nginx
setup_nginx() {
    log_info "Configurando Nginx..."
    
    # Criar configuração do Nginx
    cat > /etc/nginx/sites-available/zapai-crm << NGXEOF
server {
    listen $NGINX_PORT;
    server_name _;
    
    # Frontend estático
    location / {
        root $FRONTEND_BUILD_DIR;
        try_files \$uri \$uri/ /index.html;
        
        # Headers de segurança
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        
        # Cache para assets estáticos
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Proxy reverso para API Backend
    location /api/ {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # WebSocket para Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }
    
    # Logs
    access_log /var/log/nginx/zapai-crm-access.log;
    error_log /var/log/nginx/zapai-crm-error.log;
}
NGXEOF
    
    # Habilitar site
    ln -sf /etc/nginx/sites-available/zapai-crm /etc/nginx/sites-enabled/zapai-crm
    
    # Remover default
    rm -f /etc/nginx/sites-enabled/default
    
    # Testar configuração
    nginx -t
    
    # Recarregar Nginx
    systemctl restart nginx
    systemctl enable nginx
    
    log_info "Nginx configurado"
}

# 7. Configurar Firewall
setup_firewall() {
    log_info "Configurando firewall..."
    
    # Permitir SSH
    ufw allow 22/tcp 2>/dev/null || true
    
    # Permitir HTTP
    ufw allow 80/tcp 2>/dev/null || true
    
    # Permitir HTTPS (se for usar SSL depois)
    ufw allow 443/tcp 2>/dev/null || true
    
    # Habilitar UFW
    echo "y" | ufw enable 2>/dev/null || true
    
    log_info "Firewall configurado"
}

# 8. Iniciar serviços
start_services() {
    log_info "Iniciando serviços..."
    
    # Recarregar systemd
    systemctl daemon-reload
    
    # Habilitar e iniciar backend
    systemctl enable zapai-backend
    systemctl start zapai-backend
    
    # Aguardar backend estar pronto
    sleep 5
    
    # Verificar status
    if systemctl is-active --quiet zapai-backend; then
        log_info "✅ Backend iniciado com sucesso"
    else
        log_error "❌ Falha ao iniciar backend"
        systemctl status zapai-backend --no-pager
        exit 1
    fi
    
    # Verificar Nginx
    if systemctl is-active --quiet nginx; then
        log_info "✅ Nginx iniciado com sucesso"
    else
        log_error "❌ Falha ao iniciar Nginx"
        exit 1
    fi
    
    log_info "Todos os serviços iniciados"
}

# 9. Gerar relatório final
generate_report() {
    # Obter IP público
    PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    
    echo ""
    echo "================================================"
    echo "✅ Implantação Completa com Sucesso!"
    echo "================================================"
    echo ""
    echo "📍 Diretório: $INSTALL_DIR"
    echo "🌐 IP Público: $PUBLIC_IP"
    echo ""
    echo "🔗 URLs de Acesso:"
    echo "   - Aplicação: http://$PUBLIC_IP"
    echo "   - API Health: http://$PUBLIC_IP/api/health"
    echo "   - Backend direto: http://$PUBLIC_IP:$BACKEND_PORT/api/health"
    echo ""
    echo "📊 Status dos Serviços:"
    echo "   - Backend: $(systemctl is-active zapai-backend)"
    echo "   - Nginx: $(systemctl is-active nginx)"
    echo "   - Docker: $(systemctl is-active docker)"
    echo ""
    echo "📝 Comandos Úteis:"
    echo "   - Logs backend: journalctl -u zapai-backend -f"
    echo "   - Logs nginx: tail -f /var/log/nginx/zapai-crm-access.log"
    echo "   - Restart backend: systemctl restart zapai-backend"
    echo "   - Docker logs: docker-compose logs -f"
    echo ""
    echo "🔒 Segurança:"
    echo "   - Firewall habilitado"
    echo "   - Portas abertas: 22 (SSH), 80 (HTTP), 443 (HTTPS)"
    echo ""
    echo "================================================"
    echo "🎉 Sistema pronto para uso!"
    echo "================================================"
}

# Executar setup completo
main() {
    install_system_deps
    copy_files
    setup_backend
    setup_frontend
    start_docker_services
    setup_nginx
    setup_firewall
    start_services
    generate_report
}

main "$@"
