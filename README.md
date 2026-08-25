# 🚀 FENIX AI OS - Sistema Operacional de IA Autônoma

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/your-org/fenix-ai-os)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

**Sistema operacional completo para IA autônoma com CRM integrado, agentes inteligentes e memória cognitiva.**

## ⚡ Instalação 0-Click

### Linux/macOS

```bash
git clone <url-do-repositorio> fenix-ai-os
cd fenix-ai-os
chmod +x install.sh
./install.sh
```

### Windows (PowerShell)

```powershell
git clone <url-do-repositorio> fenix-ai-os
cd fenix-ai-os
.\install.ps1
```

📖 **Guia completo de instalação:** [README_INSTALL.md](README_INSTALL.md)

## 🎯 Funcionalidades Principais

### 🤖 Agentes IA Autônomos
- Sistema multi-agentes com capacidades cognitivas
- Memória vetorial com Qdrant
- Aprendizado contínuo e auto-melhoria
- Orquestração inteligente de tarefas

### 💼 CRM Integrado
- Gestão completa de clientes
- Integração WhatsApp (Baileys)
- Dashboard em tempo real
- Automação de atendimento

### 🧠 Motor Cognitivo
- Processamento de linguagem natural
- Análise de código inteligente
- Geração de insights automáticos
- Graph analysis de dependências

### 🔒 Enterprise Ready
- Segurança governada
- Observabilidade completa
- Deploy em produção
- Escalabilidade horizontal

## 🏗️ Arquitetura

```
fenix-ai-os/
├── 📦 install.sh / install.ps1    # Instalação 0-click
├── 🐳 docker-compose.yml          # Serviços containerizados
├── ⚙️ .env                        # Configurações
├── 🖥️ crm/
│   ├── backend/                   # API Node.js + WhatsApp
│   └── frontend/                  # React + Vite + TypeScript
├── 🧠 engine/                     # Motor de IA principal
├── 🤖 ai-os/                      # Sistema operacional IA
├── 🏛️ platform/                   # Plataforma base
└── 💾 memory/                     # Memória do sistema
```

## 🚀 Quick Start

```bash
# 1. Instalar (automático)
./install.sh

# 2. Configurar chaves de API
nano .env

# 3. Iniciar backend
cd crm/backend && npm run dev

# 4. Iniciar frontend (outro terminal)
cd crm/frontend && npm run dev

# 5. Acessar
# Frontend: http://localhost:8080
# Backend: http://localhost:3000
```

## 🛠️ Stack Tecnológico

| Componente | Tecnologia |
|------------|-----------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS |
| **Backend** | Node.js, Express, Socket.IO |
| **IA/ML** | OpenAI, Anthropic, Qdrant Vector DB |
| **WhatsApp** | Baileys |
| **Database** | MongoDB, Redis |
| **Docs** | Docling (IBM) |
| **Agents** | Sistema multi-agente autônomo |

## 📚 Documentação

- 📖 [Guia de Instalação](README_INSTALL.md)
- 🏗️ [Arquitetura do Sistema](docs/ARCHITECTURE_CURRENT.md)
- 🚀 [Roadmap](ai-os/ROADMAP.md)
- 📋 [Backlog](ai-os/BACKLOG.md)
- 🧠 [Capacidades IA](ai-os/CAPABILITIES/)

## 🔧 Scripts Disponíveis

### Raiz
```bash
npm run dev                 # Servidor principal
npm run build               # Build TypeScript
npm run analyze:project     # Análise completa
npm run test:engine         # Testes
```

### Backend
```bash
npm run dev                 # Development
npm start                   # Production
```

### Frontend
```bash
npm run dev                 # Dev server
npm run build               # Build production
npm run preview             # Preview
```

## 🌟 Destaques

✨ **Instalação 0-Click** - Setup automático completo  
🎯 **Agentes Autônomos** - IA que trabalha por você  
📊 **CRM Inteligente** - Gestão com IA integrada  
🔗 **WhatsApp Nativo** - Conexão direta via Baileys  
🧠 **Memória Vetorial** - Aprendizado contínuo  
🚀 **Production Ready** - Pronto para deploy  

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Pull Request

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

- 📧 Email: suporte@fenixai.os
- 💬 Issues: [GitHub Issues](../../issues)
- 📖 Docs: [Documentação Completa](docs/)

---

**FENIX AI OS** - Renascendo das cinzas da complexidade 🐦‍🔥
