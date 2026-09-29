# FÊNIX OS — MEMÓRIA ATIVA & MAPA VIVO DO PROJETO (SINGLE SOURCE OF TRUTH)

> **DIRETIVA COGNITIVA GLOBAL PARA TODOS OS AGENTES (ANTIGRAVITY, CODEX, GEMINI, CLAUDE, CURSOR, FÊNIX SELF-EVOLUTION)**
> Este documento é a **Memória Ativa Oficial e Mapa Vivo do Projeto Fênix OS**.
> **REGRA DE OURO VI**: Todo e qualquer agente que iniciar uma sessão neste repositório **DEVE OBRIGATORIAMENTE LER** este arquivo antes de executar qualquer ação. Ao concluir qualquer modificação relevante, deve **ATUALIZAR** a seção de *"Últimas Modificações"* e registrar os avanços realizados, unificando todo o trabalho em **uma coisa só**.

---

## 1. RESUMO EXECUTIVO DO ESTADO ATUAL

- **Data da Última Sincronização**: 29/09/2026 17:33:20 (Atualização Automática)
- **Status Geral**: OPERACIONAL & AUDITÁVEL (100% Zero-Mock Compliance)
- **Frontend Canônico Único**: [ai-engine/grg/public/index.html](file:///c:/projetos/ai-engine-core/ai-engine/grg/public/index.html) (14 views vanilla integradas + Marketplace)
- **Servidor de Aplicação**: [ai-engine/grg/src/server.js](file:///c:/projetos/ai-engine-core/ai-engine/grg/src/server.js) (Porta 4400 Local / Porta 4410 VPS)
- **Gateway / Proxy Reverso**: [ai-engine/grg/gateway/frontend-gateway.js](file:///c:/projetos/ai-engine-core/ai-engine/grg/gateway/frontend-gateway.js) (Porta 3000)
- **Infraestrutura VPS (`209.50.241.22`)**:
  - `PM2 #16` (`fenix-backend`): Online (:4410)
  - `PM2 #17` (`fenix-frontend`): Online (:3000 com paridade dual em `/opt/fenix-os/public/` e `/opt/fenix-os/grg/public/`)
  - `Docker API Platform` (:3001 - `api-platform-api-1`): Fastify + Prisma + BullMQ UP há 37h+
  - `Docker Postgres 16` (:5433 - `api-platform-postgres-1`): Banco relacional da API Platform
  - `Docker Redis 7` (:6380 - `api-platform-redis-1`): Cache e mensageria BullMQ
  - `Ollama Host Service` (:11434): Qwen 2.5 (0.5B e 3B), Qwen 3.5 0.8B, DeepSeek R1 1.5B
- **Bateria de Testes Canônica Obrigatória (100% PASS)**:
  - `architecture-guard.test.js`: 5/5 Aprovado (Zero shells paralelas)
  - `frontend-honesty.test.js`: 19/19 Aprovado (Zero métricas fabricadas)
  - `frontend-runtime-safety.test.js`: 5/5 Aprovado (Segurança de API e IDE)
  - `e2e-smoke.test.js`: 1/1 Aprovado (Navegação completa E2E, Auth, WebSocket, Avatar)

---

## 2. AUDITORIA HISTÓRICA DOS FRONTENDS (G1 A G4) & MOTIVO DA UNIFICAÇÃO

O sistema passou por 4 gerações sucessivas de frontends ao longo de sua evolução:

1. **Geração 1 (Julho/Agosto - Protótipo Tabular em `root_index.html`)**:
   - Interface monolítica inicial com tabelas estáticas de missões e agentes.
   - Limitada: não suportava navegação em abas reativas, nem Cidade Isométrica 3D, nem IDE.
2. **Geração 2 (Agosto - Divisão de Portas em `platform/public/`)**:
   - Tentativa de separar o cockpit em portas diferentes (3000 frontend, 8080/4000 backend).
   - Gerava problemas de CORS, perda de sessão WebSocket e duplicação de autenticação.
3. **Geração 3 (Agosto/Setembro - Experimentos Paralelos em `scratch/`)**:
   - Criação de shells isoladas (`scratch_index.html`, `scratch_frontend_evolution`).
   - Introduzia o grave risco de "Split-Brain": correções eram feitas em arquivos de teste enquanto a produção usava outro, violando a integridade do sistema.
4. **Geração 4 (Atual Canônica — `ai-engine/grg/public/index.html`)**:
   - **A ÚNICA FONTE CANÔNICA DA VERDADE (Single Source of Truth - Regra I)**.
   - Vanilla JS puro, modular, de altíssimo desempenho, integrando 14 views + Marketplace em um único shell.
   - Protegida por testes dinâmicos (`architecture-guard.test.js`), que falham se qualquer outro arquivo `index.html` for criado fora de `grg/public/` ou `archive/`.

---

## 3. INTEGRAÇÃO REAL DA API PLATFORM (VPS 209.50.241.22:3001)

A API Platform rodando na VPS é o motor de inteligência e inferência central do ecossistema:

1. **Topologia de Produção na VPS**:
   - **Porta 3001**: Fastify API (`api-platform-api-1`) rodando em container Docker.
   - **Porta 8081**: Dashboard estático da API Platform (`api-platform-dashboard-1`).
   - **Porta 5433**: PostgreSQL 16 (`api-platform-postgres-1`).
   - **Porta 6380**: Redis 7 (`api-platform-redis-1`) gerenciando queues BullMQ.
   - **Porta 11434**: Ollama host systemd service com suporte a múltiplos modelos locais.
2. **Modelos Instalados e Descobertos**:
   - `qwen2.5:0.5b` (397 MB): Modelo ultrarrápido para chat e triagem rápida no CPU.
   - `qwen3.5:0.8b` (873 MB): Modelo de visão e tool calling.
   - `deepseek-r1:1.5b` (1.1 GB): Modelo com cadeia de raciocínio (thinking).
   - `qwen2.5:3b` (1.9 GB): Modelo encorpado para tarefas complexas.
3. **Chave de Produção Validada**:
   - Chave ativa recuperada do banco de dados: `ap_live_96e854c33c1bbac06ba6e8dd7b2e70a6114c29a4a914d428`.
   - Gravada em `.secrets/ai_provider_key` e resolvida deterministicamente pelo `secret-resolver.js`.
4. **Rotas e Proxies Nativos no Fênix**:
   - `GET /api/v2/api-platform/health`: Faz proxy e retorna estado medido, uptime, latência e status dos componentes da VPS.
   - `POST /api/v2/api-platform/test-chat`: Executa prompt real na API Platform contra o modelo selecionado.
   - `POST /api/v2/api-platform/deploy`: Executa comando remoto seguro via SSH na VPS para atualizar/reiniciar o container.

---

## 4. CONTROLE VISUAL NA CIDADE ISOMÉTRICA (AI LIVING CITY)

Dentro do motor 3D isométrico da Cidade (`iso-city.js` e `command-center.js`):

1. **Edifício do AI District / Data Center**:
   - Ao clicar no distrito de IA (`ai-district`) ou solicitar inspeção de departamento, abre-se o modal especializado `DEPARTMENT WORKSPACE: AI DISTRICT`.
2. **Telemetria ao Vivo da VPS**:
   - Status da conexão: `ONLINE (3001)`.
   - Host & Engine: `209.50.241.22 (Fastify)`.
   - Modelos Ativos: `Qwen 2.5 (0.5B/3B) + DeepSeek R1`.
   - Banco & Fila: `Postgres 16 + Redis 7 BullMQ`.
   - Uptime e Latência medidos em tempo real via `/api/v2/api-platform/health`.
3. **Ações Rápidas Integradas**:
   - **Programar na IDE**: Alterna instantaneamente para `view-ide`, selecionando o projeto `api-platform` para edição.
   - **Reiniciar / Deploy VPS**: Aciona `/api/v2/api-platform/deploy` e exibe o log de execução do Docker na tela.
   - **Testar Chat IA**: Envia um ping cognitivo e renderiza a resposta da LLM diretamente no painel.

---

## 5. PROGRAMAÇÃO E WORKSPACE GITHUB NA VISUAL IDE

1. **Repositório Clonado**:
   - Repositório `https://github.com/Biel0071/AI-LLM.git` clonado em `c:\projetos\ai-engine-core\projects\API-PLATAFORM`.
2. **Integração com Project Kernel & Registry**:
   - `grg/src/projects/project-registry.js` e `project-kernel.js` mapeiam o projeto como `api-platform`.
   - `handleProjectWorkspaceRoutes` em `project-workspace-routes.js` permite ler a árvore de arquivos, visualizar código e salvar modificações com versionamento SHA-256 e gravação na memória do Fênix.
3. **Deployer Dedicado**:
   - Script `ai-engine/grg/scripts/deploy-api-platform.js` para automação de sincronização e restart do serviço na VPS.

---

## 6. LOG DE ÚLTIMAS MODIFICAÇÕES (CRONOLOGIA VIVA)

| Data / Hora | Autor / Agente | Arquivos Afetados | Descrição da Mudança & Impacto |
| :--- | :--- | :--- | :--- |
| **24/09 11:35** | Antigravity | `universal-system-routes.js`, `command-center.js`, `project-workspace-routes.js`, `project-kernel.js`, `secret-resolver.js`, `deploy-api-platform.js`, `deploy.bat` | Integração completa da API Platform (VPS 209.50.241.22:3001) ao Fênix; clonagem do repo em `projects/API-PLATAFORM` mapeado na Visual IDE; controle visual no modal da Cidade Isométrica; deployer automatizado; 100% dos testes passando. |
| **24/09 10:45** | Antigravity | `ACTIVE_PROJECT_MEMORY.md`, `sync-active-memory.js`, `GEMINI.md`, `AGENTS.md` | Criação da Memória Ativa Unificada e Mapa Vivo do Projeto; institucionalização da Regra VI. |
| **24/09 10:27** | Codex | `grg/public/iso-city.js` | Rotação de câmera isométrica em 4 quadrantes, persistência em localStorage e contadores reais. |
| **24/09 10:26** | Codex / Biel | `deploy.bat` | Correção de escape de caracteres em echo titles no script canônico de deploy para VPS. |
| **24/09 10:26** | Codex | `grg/public/fenix-core-controller.js` | Controlador de estado único `window.__FENIX_STATE__` com consumo seguro de APIs reais. |
| **24/09 10:13** | Codex | `grg/public/index.html` | Remoção de métricas fictícias estáticas do Command Center e adoção do marcador honesto `—`. |
| **24/09 10:08** | Codex | `grg/public/marketplace-live.js`, `.css` | Separação da tela de Marketplace de MCP; consumo de `/api/skills` e `/api/connectors`. |
| **24/09 08:58** | Codex | `grg/public/project-hub-live.js`, `.css` | Catálogo autenticado de projetos em evolução integrado ao Project Kernel. |
| **24/09 08:53** | Codex | `grg/public/project-ide-live.js` | IDE conectada a arquivos reais de workspaces com suporte a edição, salvamento e análise. |
| **24/09 08:42** | Codex | `grg/src/execution/docker-rootless-sandbox.js` | Execução isolada em containers Docker rootless para agentes autônomos. |
| **22/09 21:26** | Biel0071 | Commit `6118b034` (7 arquivos) | Institucionalização das 5 Regras de Ouro e Gatekeeper em `AGENTS.md`, `GEMINI.md` e `CLAUDE.md`. |
| **09/09 18:17** | Biel0071 | Commit `af107515` | Enforce de autenticação SSH baseada em chave (`grg_fenix_vps`) eliminando senhas em texto puro. |
| **09/09 12:25** | Biel0071 | Commit `cc0f2f87` (V7) | Runtime autônomo com Qwen na VPS, fila persistente de jobs e mapeamento dos 3 projetos vitais. |
| **09/09 10:02** | Biel0071 | Commit `8c6d02f7` (V6) | Overhaul de Game Art V6, kits modulares de pixel-art, interiores e screenshots Playwright. |

---

## 7. MAPA VIVO DO PROJETO (INVENTÁRIO 360°)

```
c:\projetos\ai-engine-core\
│
├── ACTIVE_PROJECT_MEMORY.md     <-- ESTA MEMÓRIA ATIVA & MAPA VIVO (Single Source of Truth)
├── GEMINI.md                    <-- Constituição do modelo Gemini / Antigravity
├── CLAUDE.md                    <-- Diretrizes para Claude / Anthropic
├── .cursorrules                 <-- Diretrizes para Cursor IDE
├── .agents/
│   └── AGENTS.md                <-- Constituição suprema multiagente (15 cérebros, regras invioláveis)
│
├── projects/                    <-- Workspaces clonados gerenciados pelo Project Kernel
│   └── API-PLATAFORM/           <-- Repo GitHub Biel0071/AI-LLM (programável na IDE)
│       ├── apps/api/            <-- Fastify backend API
│       ├── apps/dashboard/      <-- Dashboard web
│       ├── apps/worker/         <-- BullMQ background workers
│       └── packages/shared/     <-- Providers (Ollama, Gemini, Claude, etc.)
│
└── ai-engine/                   <-- Repositório central de código do Fênix OS
    ├── deploy.bat               <-- Script canônico de deploy para VPS (209.50.241.22)
    ├── package.json             <-- Dependências locais e scripts
    ├── .secrets/
    │   └── ai_provider_key      <-- Chave autêntica de produção para a API Platform
    │
    ├── memory/                  <-- Memória estática e ontológica
    │   ├── ACTIVE_PROJECT_MEMORY.md <-- Espelho canônico desta memória
    │   ├── DIGITAL_GENOME_INDEX.json <-- Registro de genomas e componentes
    │   ├── SYSTEM_GRAPH.md      <-- Grafo de dependências do sistema
    │   └── projects/            <-- Memórias locais por projeto
    │
    └── grg/                     <-- Core de Execução do Fênix OS
        ├── public/              <-- FONTE CANÔNICA ÚNICA DO FRONTEND (Regra I)
        │   ├── index.html       <-- O único shell oficial de todas as 14 views
        │   ├── unified-app.js   <-- Roteamento mestre, SSE, navegação e comandos
        │   ├── fenix-core-controller.js <-- Estado global (window.__FENIX_STATE__)
        │   ├── iso-city.js      <-- Motor 3D Isométrico com rotação 4-vias e câmera
        │   ├── project-hub-live.js <-- Catálogo vivo de projetos
        │   ├── project-ide-live.js <-- IDE viva com edição de arquivos de workspace
        │   ├── marketplace-live.js <-- Catálogo de skills e conectores
        │   ├── command-center.js<-- Lógica do Command Center, City modals e dispatch
        │   ├── unified.css      <-- Estilos globais e componentes visuais
        │   ├── pixi-city-renderer.js <-- Renderizador Pixi para cidade procedural
        │   └── pixi-character-system.js <-- Anatomia 2.5D RPG e animações de agentes
        │
        ├── src/                 <-- BACKEND E SERVIÇOS DO RUNTIME
        │   ├── server.js        <-- Servidor Express, ativação do Kernel e workers locais
        │   ├── app.js           <-- Configuração de middlewares e rotas Express
        │   ├── api/             <-- Endpoints REST (universal-system-routes.js)
        │   ├── security/        <-- secret-resolver.js e controle de chaves
        │   ├── projects/        <-- project-kernel.js e project-registry.js
        │   └── evolution/       <-- autonomous-evolution-kernel.js
        │
        ├── scripts/             <-- Utilitários de Governança e Deploy
        │   ├── sync-active-memory.js   <-- Sincronizador da Memória Ativa
        │   └── deploy-api-platform.js  <-- Deployer da API Platform na VPS
        │
        └── test/                <-- SUÍTE DE TESTES DE GOVERNANÇA (Regra IV)
            ├── architecture-guard.test.js  <-- Verificação da Fonte Canônica Única
            ├── frontend-honesty.test.js    <-- Auditoria Zero-Mock de Telemetria
            ├── frontend-runtime-safety.test.js <-- Validação de Segurança de Rotas/IDE
            └── e2e-smoke.test.js           <-- Teste E2E de Ponta a Ponta
```

---

## 8. MATRIZ DAS 14 VIEWS DO FRONTEND CANÔNICO

| ID da View | Nome / Propósito | Arquivo de Lógica / Componente | Endpoints Consumidos |
| :--- | :--- | :--- | :--- |
| `view-command` | **Command Center**: Dashboard executivo e chat de comando | `command-center.js`, `unified-app.js` | `/api/overview`, `/api/missions`, `/api/v2/city/state` |
| `view-city` | **AI Living City**: Cidade 3D isométrica viva com agentes e edifícios | `iso-city.js`, `pixi-city-renderer.js`, `command-center.js` | `/api/v2/living-city/agents`, `/api/v2/api-platform/health` |
| `view-agents` | **Esquadrão de Agentes**: Inspeção de agentes, status e chat direto | `fenix-core-controller.js`, `unified-app.js` | `/api/v2/living-city/agents`, `/api/agents` |
| `view-ide` | **Visual IDE**: Editor de código e gerenciamento de arquivos de projeto | `project-ide-live.js` | `/api/fenix/projects`, `/api/fenix/projects/:id/tree`, `/file` |
| `view-operations` | **Operações & Jobs**: Fila de execução, missões em curso e histórico | `unified-app.js` | `/api/missions`, `/api/v2/universal/jobs` |
| `view-runtime` | **Runtime & Kernel**: Saúde do sistema, processos PM2, RAM e CPU | `unified-app.js`, `fenix-core-controller.js` | `/api/v2/system/health`, `/api/observability/metrics` |
| `view-projects` | **Project Hub**: Catálogo de workspaces e sincronização de repositórios | `project-hub-live.js` | `/api/fenix/projects`, `/api/projects` |
| `view-memory` | **Memória & Ontologia**: Inspeciona memórias consolidadas e vetores | `unified-app.js` | `/api/v2/memory/query`, `/api/memory/overview` |
| `view-knowledge` | **Base de Conhecimento**: RAG semântico, documentos e artigos | `unified-app.js` | `/api/knowledge/search`, `/api/knowledge/stats` |
| `view-mcp` | **Protocolo MCP**: Servidores e ferramentas de contexto Model Context Protocol | `unified-app.js` | `/api/v2/mcp/servers`, `/api/v2/mcp/tools` |
| `view-browser` | **Browser Assistant**: Automação web e navegação assistida por IA | `unified-app.js` | `/api/v2/browser/sessions`, `/api/v2/browser/act` |
| `view-observability` | **Observabilidade**: Métricas de telemetria, logs de erro e traces | `unified-app.js` | `/api/observability/metrics`, `/api/observability/errors` |
| `view-terminal` | **Terminal Host**: Terminal seguro para comandos no runtime | `unified-app.js` | `/api/v2/terminal/session`, `/api/v2/terminal/exec` |
| `view-flowgraph` | **Grafo de Fluxo**: Visualização topológica do DAG de execução de missões | `unified-app.js` | `/api/v2/flowgraph/dag`, `/api/missions/active/dag` |
| *Modal / Tab* | **Marketplace**: Catálogo de capacidades, conectores e skills | `marketplace-live.js` | `/api/skills`, `/api/connectors` |

---

## 9. COMO MANTER ESTA MEMÓRIA ATIVA (INSTRUÇÃO DE SINCRONIZAÇÃO)

Sempre que concluir um ciclo de trabalho, execute o comando de sincronização:

```powershell
# Executa a sincronização determinística da Memória Ativa:
node ai-engine/grg/scripts/sync-active-memory.js
```

Em seguida, execute a validação de segurança e conformidade:
```powershell
node ai-engine/grg/test/architecture-guard.test.js
node ai-engine/grg/test/frontend-honesty.test.js
node ai-engine/grg/test/frontend-runtime-safety.test.js
node ai-engine/grg/test/e2e-smoke.test.js
```
