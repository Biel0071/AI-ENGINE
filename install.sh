#!/bin/bash
# ============================================================================
# FENIX AI OS - Instalação 0-Click
# Script de instalação automática completa do sistema
# ============================================================================

set -e  # Para em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções de log
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCESSO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[ATENÇÃO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERRO]${NC} $1"
}

# Detectar sistema operacional
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        OS="windows"
    else
        log_error "Sistema operacional não suportado: $OSTYPE"
        exit 1
    fi
    log_info "Sistema operacional detectado: $OS"
}

# Verificar dependências básicas
check_prerequisites() {
    log_info "Verificando pré-requisitos..."
    
    # Verificar Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js não encontrado. Por favor instale Node.js 18+ primeiro."
        if [[ "$OS" == "linux" ]]; then
            log_info "No Linux, execute: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
        elif [[ "$OS" == "macos" ]]; then
            log_info "No macOS, execute: brew install node@20"
        fi
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Versão do Node.js muito antiga ($NODE_VERSION). Necessário Node.js 18+"
        exit 1
    fi
    log_success "Node.js $(node -v) instalado"
    
    # Verificar npm
    if ! command -v npm &> /dev/null; then
        log_error "npm não encontrado"
        exit 1
    fi
    log_success "npm $(npm -v) instalado"
    
    # Verificar Docker (opcional mas recomendado)
    if command -v docker &> /dev/null; then
        log_success "Docker $(docker --version | cut -d' ' -f3) disponível"
        DOCKER_AVAILABLE=true
    else
        log_warn "Docker não encontrado. Alguns recursos podem não funcionar."
        DOCKER_AVAILABLE=false
    fi
    
    # Verificar Git
    if ! command -v git &> /dev/null; then
        log_warn "Git não encontrado. Algumas funcionalidades podem ser limitadas."
    else
        log_success "Git $(git --version | cut -d' ' -f3) disponível"
    fi
}

# Instalar dependências do projeto principal
install_root_deps() {
    log_info "Instalando dependências da raiz do projeto..."
    cd /workspace
    npm install --legacy-peer-deps
    log_success "Dependências da raiz instaladas"
}

# Instalar dependências do frontend CRM
install_frontend_deps() {
    log_info "Instalando dependências do frontend CRM..."
    cd /workspace/crm/frontend
    
    # Limpar cache e node_modules se existir problema
    if [ -d "node_modules" ]; then
        log_info "Limpando instalações anteriores..."
        rm -rf node_modules package-lock.json
    fi
    
    npm install --legacy-peer-deps
    log_success "Dependências do frontend instaladas"
}

# Configurar backend CRM (estrutura básica)
setup_backend() {
    log_info "Configurando backend CRM..."
    cd /workspace/crm/backend
    
    # Criar estrutura básica se não existir
    mkdir -p api baileys crm src/config src/controllers src/models src/routes src/services src/middleware
    
    # Criar package.json do backend se não existir
    if [ ! -f "package.json" ]; then
        cat > package.json << 'EOF'
{
  "name": "zapai-backend",
  "version": "1.0.0",
  "description": "Backend do CRM ZAP AI",
  "main": "src/server.js",
  "type": "commonjs",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {
    "express": "^4.21.2",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "axios": "^1.13.0",
    "socket.io": "^4.8.3",
    "@whiskeysockets/baileys": "^6.7.18",
    "qrcode-terminal": "^0.12.0",
    "mongoose": "^8.9.7",
    "winston": "^3.17.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.10"
  }
}
EOF
        log_info "package.json do backend criado"
    fi
    
    # Instalar dependências do backend
    if [ ! -d "node_modules" ]; then
        npm install --legacy-peer-deps
        log_success "Dependências do backend instaladas"
    else
        log_info "Dependências do backend já existem"
    fi
}

# Configurar arquivo .env
setup_env() {
    log_info "Configurando variáveis de ambiente..."
    cd /workspace
    
    if [ ! -f ".env" ]; then
        cat > .env << 'EOF'
# ============================================
# FENIX AI OS - Configurações de Ambiente
# ============================================

# Servidor
PORT=3000
HOST=localhost
NODE_ENV=development

# API Keys (substitua pelas suas chaves reais)
OPENAI_API_KEY=sua_chave_openai_aqui
ANTHROPIC_API_KEY=sua_chave_anthropic_aqui

# Banco de Dados
MONGODB_URI=mongodb://localhost:27017/fenix-ai
REDIS_URL=redis://localhost:6379

# Qdrant Vector Database
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# Docling Service
DOCLING_URL=http://localhost:8000

# Frontend
FRONTEND_URL=http://localhost:8080
BACKEND_URL=http://localhost:3000

# WhatsApp/Baileys
WHATSAPP_SESSION_PATH=./crm/backend/baileys/sessions
WHATSAPP_QR_CODE=true

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Segurança
JWT_SECRET=seu_segredo_jwt_muito_forte_aqui
API_TOKEN=seu_token_de_api_seguro

# Recursos IA
MAX_TOKENS=4096
TEMPERATURE=0.7
MODEL_NAME=gpt-4o-mini

# Agentes
MAX_AGENTS=10
AGENT_TIMEOUT=30000
ENABLE_AUTONOMOUS_AGENTS=true

# Memory
MEMORY_COLLECTION=fenix-memory
MEMORY_LIMIT=1000

# Feature Flags
ENABLE_GRAPH_ANALYSIS=true
ENABLE_CODE_INTELLIGENCE=true
ENABLE_AUTO_IMPROVEMENT=true
EOF
        log_success "Arquivo .env criado com configurações padrão"
        log_warn "IMPORTANTE: Edite o arquivo .env e configure suas chaves de API!"
    else
        log_info "Arquivo .env já existe"
    fi
}

# Setup Docker (se disponível)
setup_docker() {
    if [ "$DOCKER_AVAILABLE" = true ]; then
        log_info "Configurando serviços Docker..."
        cd /workspace
        
        # Iniciar serviços Docker
        if [ -f "docker-compose.yml" ]; then
            log_info "Iniciando serviços Docker (Qdrant, Docling)..."
            docker-compose up -d
            log_success "Serviços Docker iniciados"
            
            # Aguardar serviços ficarem prontos
            log_info "Aguardando serviços ficarem prontos..."
            sleep 10
            
            # Verificar se Qdrant está rodando
            if curl -s http://localhost:6333 > /dev/null 2>&1; then
                log_success "Qdrant está rodando em http://localhost:6333"
            else
                log_warn "Qdrant pode não estar pronto ainda"
            fi
            
            # Verificar se Docling está rodando
            if curl -s http://localhost:8000 > /dev/null 2>&1; then
                log_success "Docling está rodando em http://localhost:8000"
            else
                log_warn "Docling pode não estar pronto ainda"
            fi
        fi
    else
        log_warn "Docker não disponível - pulando configuração de serviços containerizados"
    fi
}

# Build do frontend
build_frontend() {
    log_info "Build do frontend..."
    cd /workspace/crm/frontend
    npm run build
    log_success "Frontend compilado com sucesso"
}

# Criar diretórios necessários
create_directories() {
    log_info "Criando diretórios do sistema..."
    mkdir -p /workspace/logs
    mkdir -p /workspace/crm/backend/baileys/sessions
    mkdir -p /workspace/memory/projects
    mkdir -p /workspace/generated
    log_success "Diretórios criados"
}

# Mostrar instruções finais
show_final_instructions() {
    echo ""
    echo "============================================================================"
    echo -e "${GREEN}INSTALAÇÃO COMPLETA COM SUCESSO!${NC}"
    echo "============================================================================"
    echo ""
    echo -e "${BLUE}Próximos passos:${NC}"
    echo ""
    echo "1. Configure suas chaves de API:"
    echo "   nano /workspace/.env"
    echo "   (ou use seu editor preferido)"
    echo ""
    echo "2. Inicie o backend:"
    echo "   cd /workspace/crm/backend"
    echo "   npm run dev"
    echo ""
    echo "3. Em outro terminal, inicie o frontend:"
    echo "   cd /workspace/crm/frontend"
    echo "   npm run dev"
    echo ""
    echo "4. Acesse o sistema:"
    echo "   Frontend: http://localhost:8080"
    echo "   Backend:  http://localhost:3000"
    echo ""
    echo -e "${YELLOW}Serviços externos (se Docker disponível):${NC}"
    echo "   Qdrant:   http://localhost:6333"
    echo "   Docling:  http://localhost:8000"
    echo ""
    echo "============================================================================"
    echo -e "${GREEN}Bem-vindo ao FENIX AI OS!${NC}"
    echo "============================================================================"
}

# Script principal
main() {
    echo ""
    echo "============================================================================"
    echo -e "${BLUE}FENIX AI OS - Instalação Automática 0-Click${NC}"
    echo "============================================================================"
    echo ""
    
    detect_os
    check_prerequisites
    create_directories
    setup_env
    install_root_deps
    install_frontend_deps
    setup_backend
    setup_docker
    build_frontend
    show_final_instructions
}

# Executar script principal
main "$@"
