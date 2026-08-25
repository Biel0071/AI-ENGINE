# ============================================================================
# FENIX AI OS - Instalação 0-Click (Windows PowerShell)
# Script de instalação automática completa do sistema
# ============================================================================

$ErrorActionPreference = "Stop"

# Cores para output
function Write-Info {
    Write-Host "[INFO] $args" -ForegroundColor Blue
}

function Write-Success {
    Write-Host "[SUCESSO] $args" -ForegroundColor Green
}

function Write-Warn {
    Write-Host "[ATENÇÃO] $args" -ForegroundColor Yellow
}

function Write-Error-Custom {
    Write-Host "[ERRO] $args" -ForegroundColor Red
}

# Verificar pré-requisitos
function Check-Prerequisites {
    Write-Info "Verificando pré-requisitos..."
    
    # Verificar Node.js
    try {
        $nodeVersion = node -v
        $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        if ($versionNumber -lt 18) {
            throw "Versão do Node.js muito antiga ($nodeVersion). Necessário Node.js 18+"
        }
        Write-Success "Node.js $nodeVersion instalado"
    } catch {
        Write-Error-Custom "Node.js não encontrado ou versão insuficiente"
        Write-Info "Baixe e instale Node.js 20+ em: https://nodejs.org/"
        exit 1
    }
    
    # Verificar npm
    try {
        $npmVersion = npm -v
        Write-Success "npm v$npmVersion instalado"
    } catch {
        Write-Error-Custom "npm não encontrado"
        exit 1
    }
    
    # Verificar Docker
    try {
        $dockerVersion = docker --version
        Write-Success "$dockerVersion disponível"
        $script:DOCKER_AVAILABLE = $true
    } catch {
        Write-Warn "Docker não encontrado. Alguns recursos podem não funcionar."
        Write-Info "Instale Docker Desktop: https://www.docker.com/products/docker-desktop/"
        $script:DOCKER_AVAILABLE = $false
    }
    
    # Verificar Git
    try {
        $gitVersion = git --version
        Write-Success "$gitVersion disponível"
    } catch {
        Write-Warn "Git não encontrado."
    }
}

# Criar diretórios necessários
function Create-Directories {
    Write-Info "Criando diretórios do sistema..."
    
    New-Item -ItemType Directory -Force -Path ".\logs" | Out-Null
    New-Item -ItemType Directory -Force -Path ".\crm\backend\baileys\sessions" | Out-Null
    New-Item -ItemType Directory -Force -Path ".\memory\projects" | Out-Null
    New-Item -ItemType Directory -Force -Path ".\generated" | Out-Null
    
    Write-Success "Diretórios criados"
}

# Configurar arquivo .env
function Setup-Env {
    Write-Info "Configurando variáveis de ambiente..."
    
    if (-not (Test-Path ".env")) {
        $envContent = @"
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
"@
        
        Set-Content -Path ".env" -Value $envContent -Encoding UTF8
        Write-Success "Arquivo .env criado com configurações padrão"
        Write-Warn "IMPORTANTE: Edite o arquivo .env e configure suas chaves de API!"
    } else {
        Write-Info "Arquivo .env já existe"
    }
}

# Instalar dependências da raiz
function Install-Root-Deps {
    Write-Info "Instalando dependências da raiz do projeto..."
    
    npm install --legacy-peer-deps
    
    Write-Success "Dependências da raiz instaladas"
}

# Instalar dependências do frontend
function Install-Frontend-Deps {
    Write-Info "Instalando dependências do frontend CRM..."
    
    Set-Location ".\crm\frontend"
    
    # Limpar instalações anteriores se existir problema
    if (Test-Path "node_modules") {
        Write-Info "Limpando instalações anteriores..."
        Remove-Item -Recurse -Force "node_modules", "package-lock.json" -ErrorAction SilentlyContinue
    }
    
    npm install --legacy-peer-deps
    
    Write-Success "Dependências do frontend instaladas"
    Set-Location "..\.."
}

# Configurar backend
function Setup-Backend {
    Write-Info "Configurando backend CRM..."
    
    Set-Location ".\crm\backend"
    
    # Criar estrutura de diretórios
    $dirs = @(
        "src\config",
        "src\controllers",
        "src\models",
        "src\routes",
        "src\services",
        "src\middleware"
    )
    
    foreach ($dir in $dirs) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
    
    # Criar package.json se não existir
    if (-not (Test-Path "package.json")) {
        $packageJson = @'
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
'@
        Set-Content -Path "package.json" -Value $packageJson -Encoding UTF8
        Write-Info "package.json do backend criado"
    }
    
    # Instalar dependências se necessário
    if (-not (Test-Path "node_modules")) {
        npm install --legacy-peer-deps
        Write-Success "Dependências do backend instaladas"
    } else {
        Write-Info "Dependências do backend já existem"
    }
    
    Set-Location "..\.."
}

# Setup Docker
function Setup-Docker {
    if ($script:DOCKER_AVAILABLE) {
        Write-Info "Configurando serviços Docker..."
        
        if (Test-Path "docker-compose.yml") {
            Write-Info "Iniciando serviços Docker (Qdrant, Docling)..."
            docker-compose up -d
            Write-Success "Serviços Docker iniciados"
            
            Write-Info "Aguardando serviços ficarem prontos..."
            Start-Sleep -Seconds 10
            
            # Verificar Qdrant
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:6333" -TimeoutSec 5 -UseBasicParsing
                Write-Success "Qdrant está rodando em http://localhost:6333"
            } catch {
                Write-Warn "Qdrant pode não estar pronto ainda"
            }
            
            # Verificar Docling
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:8000" -TimeoutSec 5 -UseBasicParsing
                Write-Success "Docling está rodando em http://localhost:8000"
            } catch {
                Write-Warn "Docling pode não estar pronto ainda"
            }
        }
    } else {
        Write-Warn "Docker não disponível - pulando configuração de serviços containerizados"
    }
}

# Build do frontend
function Build-Frontend {
    Write-Info "Build do frontend..."
    
    Set-Location ".\crm\frontend"
    npm run build
    Write-Success "Frontend compilado com sucesso"
    
    Set-Location "..\.."
}

# Mostrar instruções finais
function Show-Final-Instructions {
    Write-Host ""
    Write-Host "============================================================================" -ForegroundColor Green
    Write-Host "INSTALAÇÃO COMPLETA COM SUCESSO!" -ForegroundColor Green
    Write-Host "============================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximos passos:" -ForegroundColor Blue
    Write-Host ""
    Write-Host "1. Configure suas chaves de API:"
    Write-Host "   notepad .env"
    Write-Host ""
    Write-Host "2. Inicie o backend (novo terminal):"
    Write-Host "   cd crm\backend"
    Write-Host "   npm run dev"
    Write-Host ""
    Write-Host "3. Inicie o frontend (outro terminal):"
    Write-Host "   cd crm\frontend"
    Write-Host "   npm run dev"
    Write-Host ""
    Write-Host "4. Acesse o sistema:"
    Write-Host "   Frontend: http://localhost:8080"
    Write-Host "   Backend:  http://localhost:3000"
    Write-Host ""
    Write-Host "Serviços externos (se Docker disponível):" -ForegroundColor Yellow
    Write-Host "   Qdrant:   http://localhost:6333"
    Write-Host "   Docling:  http://localhost:8000"
    Write-Host ""
    Write-Host "============================================================================" -ForegroundColor Green
    Write-Host "Bem-vindo ao FENIX AI OS!" -ForegroundColor Green
    Write-Host "============================================================================" -ForegroundColor Green
}

# Script principal
function Main {
    Write-Host ""
    Write-Host "============================================================================" -ForegroundColor Blue
    Write-Host "FENIX AI OS - Instalação Automática 0-Click (Windows)" -ForegroundColor Blue
    Write-Host "============================================================================" -ForegroundColor Blue
    Write-Host ""
    
    Check-Prerequisites
    Create-Directories
    Setup-Env
    Install-Root-Deps
    Install-Frontend-Deps
    Setup-Backend
    Setup-Docker
    Build-Frontend
    Show-Final-Instructions
}

# Executar script principal
Main
