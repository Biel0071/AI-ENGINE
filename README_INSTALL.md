# 🚀 FENIX AI OS - Instalação 0-Click

## Instalação Rápida

### Linux/macOS

```bash
# Clone o repositório (se ainda não tiver)
git clone <url-do-repositorio> fenix-ai-os
cd fenix-ai-os

# Execute o script de instalação automática
chmod +x install.sh
./install.sh
```

### Windows (PowerShell)

```powershell
# Clone o repositório
git clone <url-do-repositorio> fenix-ai-os
cd fenix-ai-os

# Execute o script de instalação
.\install.ps1
```

## Pré-requisitos

O script de instalação verifica automaticamente e instala:

- **Node.js** 18+ (obrigatório)
- **npm** (incluído com Node.js)
- **Docker** (opcional, para serviços externos)
- **Git** (opcional, para versionamento)

## O que o Script Faz

O `install.sh` executa automaticamente:

1. ✅ Verifica pré-requisitos do sistema
2. ✅ Cria estrutura de diretórios necessária
3. ✅ Configura arquivo `.env` com valores padrão
4. ✅ Instala dependências da raiz do projeto
5. ✅ Instala dependências do frontend CRM
6. ✅ Configura backend CRM
7. ✅ Inicia serviços Docker (Qdrant, Docling) se disponível
8. ✅ Realiza build do frontend
9. ✅ Mostra instruções finais

## Pós-Instalação

### 1. Configurar Chaves de API

Edite o arquivo `.env` e configure suas chaves:

```bash
nano .env
```

**Variáveis importantes:**
- `OPENAI_API_KEY` - Sua chave da OpenAI
- `ANTHROPIC_API_KEY` - Sua chave da Anthropic (opcional)
- `MONGODB_URI` - URL do MongoDB
- `JWT_SECRET` - Segredo para JWT (gerar um único forte)

### 2. Iniciar o Sistema

**Terminal 1 - Backend:**
```bash
cd crm/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd crm/frontend
npm run dev
```

### 3. Acessar o Sistema

- **Frontend:** http://localhost:8080
- **Backend API:** http://localhost:3000
- **Qdrant (Vector DB):** http://localhost:6333
- **Docling (Document Processing):** http://localhost:8000

## Serviços Incluídos

### Docker Services (docker-compose.yml)

- **Qdrant**: Banco de dados vetorial para memória IA
- **Docling**: Processamento de documentos IBM

### Backend Services

- **Express.js**: Servidor API REST
- **Socket.IO**: Comunicação em tempo real
- **Baileys**: Integração WhatsApp
- **MongoDB**: Banco de dados principal

### Frontend

- **React 18**: Framework UI
- **Vite**: Build tool ultrarrápido
- **TypeScript**: Tipagem estática
- **TailwindCSS**: Estilização
- **Zustand**: Gerenciamento de estado
- **React Router**: Navegação
- **Socket.IO Client**: Tempo real

## Troubleshooting

### Problemas Comuns

**Node.js versão antiga:**
```bash
# Linux
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS
brew install node@20
```

**Permissões no Linux:**
```bash
chmod +x install.sh
./install.sh
```

**Portas já em uso:**
Edite `.env` e mude as portas:
```
PORT=3001
FRONTEND_PORT=8081
```

**Docker não inicia:**
```bash
# Verificar se Docker está rodando
docker ps

# Reiniciar serviços
docker-compose down
docker-compose up -d
```

## Estrutura do Projeto

```
fenix-ai-os/
├── install.sh          # Script de instalação 0-click
├── docker-compose.yml  # Serviços containerizados
├── .env                # Variáveis de ambiente
├── crm/
│   ├── backend/        # API Node.js + WhatsApp
│   └── frontend/       # React + Vite
├── engine/             # Motor de IA principal
├── ai-os/              # Sistema operacional IA
├── platform/           # Plataforma base
└── memory/             # Memória do sistema
```

## Scripts Disponíveis

### Raiz do Projeto
```bash
npm run dev                 # Inicia servidor principal
npm run build               # Build TypeScript
npm run analyze:project     # Análise do projeto
npm run analyze:crm         # Análise específica do CRM
npm run test:engine         # Testes do engine
```

### Backend
```bash
npm run dev                 # Development mode
npm start                   # Production mode
```

### Frontend
```bash
npm run dev                 # Development server
npm run build               # Production build
npm run preview             # Preview production build
```

## Próximos Passos

Após a instalação:

1. **Configure suas APIs** no `.env`
2. **Inicie os serviços** (backend + frontend)
3. **Acesse o dashboard** em http://localhost:8080
4. **Conecte ao WhatsApp** via QR Code
5. **Configure agentes IA** conforme necessidade

## Suporte

- 📄 [Documentação Completa](./docs/)
- 🐛 [Reportar Bugs](../../issues)
- 💡 [Sugestões](../../discussions)

---

**FENIX AI OS** - Sistema Operacional de IA Autônoma
Versão: 1.0.0
