# FÊNIX OS — SCREEN INVENTORY (INVENTÁRIO COMPLETO DO FRONTEND)
**Data de Emissão**: `01/10/2026`  
**Escopo**: Mapeamento Detalhado das 14 Views Canônicas e Telas do Shell Único  
**Fonte da Verdade**: `ai-engine/grg/public/index.html` e módulos complementares  
**Conformidade**: Zero-Mock Factual UI (Testes `frontend-honesty.test.js` & `architecture-guard.test.js`)

---

## 1. Matriz Resumo das Telas Canônicas

| ID da Tela | Nome da Tela | Rota / Âncora | DOM ID | Controladores Principais | APIs Consumidas |
|---|---|---|---|---|---|
| **SCR-COMMAND** | Unified Command Center | `/app#command` | `#view-command` | `unified-app.js`, `command-center.js` | `/api/overview`, `/api/avatar/message`, `/api/events` |
| **SCR-CITY** | Isometric AI City Twin | `/app#city` | `#view-city` | `iso-city.js`, `pixi-city-renderer.js` | `/api/city`, `/api/v2/living-city/agents`, `/api/events` |
| **SCR-AGENTS** | Workforce & Agent Enxame | `/app#agents` | `#view-agents` | `unified-app.js`, `fenix-core-controller.js` | `/api/overview`, `/api/agents`, `/api/jobs` |
| **SCR-IDE** | Visual Code Studio IDE | `/app#ide` | `#view-ide` | `project-ide-live.js`, `fenix-visual-ide.js` | `/api/projects`, `/api/projects/:id/fs`, `/api/projects/:id/git` |
| **SCR-OPERATIONS** | Operations & Reciprocity Rail | `/app#operations` | `#view-operations`| `operations-live.js`, `dev-pipeline-client.js`| `/api/v2/engineering/reciprocity/verify`, `/api/observability/metrics` |
| **SCR-RUNTIME** | Runtime Cockpit & Gauges | `/app#runtime` | `#view-runtime` | `runtime-cockpit.js`, `live-runtime.js` | `/api/runtime`, `/api/runtime/services`, `/health` |
| **SCR-PROJECTS** | Project Hub & DNA Portfolio | `/app#projects` | `#view-projects` | `project-hub-live.js`, `project-hub-controller.js` | `/api/projects`, `/api/connectors/github/repositories` |
| **SCR-MEMORY** | Memory Fabric & Knowledge Base | `/app#memory` | `#view-memory` | `memory-live.js`, `unified-app.js` | `/api/overview`, `/api/skills` |
| **SCR-KNOWLEDGE** | Semantic Knowledge Graph | `/app#knowledge` | `#view-knowledge`| `unified-app.js` | `/api/overview` |
| **SCR-MCP** | Model Context Protocol Tools | `/app#mcp` | `#view-mcp` | `connections-panel.js`, `unified-app.js` | `/api/connectors`, `/api/skills` |
| **SCR-BROWSER** | Browser Automation Viewport | `/app#browser` | `#view-browser` | `unified-app.js` | `/api/overview` |
| **SCR-OBSERVABILITY**| Observability Radar & Metrics | `/app#observability`| `#view-observability`| `observatory-client.js` | `/api/observability/metrics` |
| **SCR-TERMINAL** | Interactive Shell & Terminal | `/app#terminal` | `#view-terminal` | `unified-app.js` | `/api/runtime` |
| **SCR-FLOWGRAPH** | DAG & Mission Workflow Graph | `/app#flowgraph` | `#view-flowgraph` | `fenix-flow-graph.js` | `/api/missions`, `/api/events` |
| **SCR-LOGIN** | W3C Credential Gateway | `/login` | `#loginForm` | `login.html` | `/api/login`, `/api/me` |
| **SCR-MARKETPLACE** | Skills & Plugins Marketplace | `/app#marketplace` | `#view-marketplace`| `marketplace-live.js` | `/api/skills` |

---

## 2. Detalhamento Factual das 14 Telas Canônicas

### 2.1 SCR-COMMAND: Unified Command Center
- **Objetivo**: Centro de comando para despacho de objetivos de alto nível, telemetria em tempo real e orquestração.
- **Hierarquia Visual**: HUD superior com badges de integridade, chat com streaming SSE, e dock lateral de atalhos rápidos.
- **Estado Reativo**: Mensagens, avatar em atividade, eventos do barramento.
- **Honestidade**: Indicador de ausência factual (`—`) até recepção do primeiro payload válido da API.

### 2.2 SCR-CITY: Isometric AI City & Digital Twin
- **Objetivo**: Gêmeo digital em 2.5D/3D (Pixi.js 8 e Three.js) do runtime real do Fênix OS.
- **Distritos Modelados**:
  1. *Core District*: Kernel e processos vitais.
  2. *Academy District*: Aprendizado e procedural memory.
  3. *Foundry District*: Software Factory e criação de código.
  4. *Port District*: Gateways de rede, WebSocket e comunicação com VPS.
  5. *Sanctuary District*: Segurança, Zero-Trust e RBAC.
- **Interação**: Clique em agentes ou prédios abre o inspetor de telemetria com estado real do processo e evidências.

### 2.3 SCR-IDE: Visual Code Studio & Project Kernel
- **Objetivo**: Ambiente de desenvolvimento autônomo e colaborativo integrado ao SO.
- **Dimensões**: 100% largura e altura, sem margens limitadas ou caixas comprimidas.
- **Recursos**: Árvore de arquivos virtualizada, syntax highlighting, diff de git, console integrado e terminal de execução segura.

### 2.4 SCR-OPERATIONS: Reciprocity & Continuous Engineering
- **Objetivo**: Trilho de operações 24/7 com auditoria da Regra Constitucional Nº 1 (Reciprocidade Full-Stack).
- **Recursos**: Verificador de reciprocidade (`verifyReciprocity`), gerador de clientes de API e gerador de schemas de banco a partir de especificações.

### 2.5 SCR-RUNTIME: Runtime Cockpit & Service Gauges
- **Objetivo**: Inspeção detalhada de hardware virtual, uso de CPU (user seconds), RAM heap (MB), serviços PM2 e nós do cluster mesh.
- **Status do Nó**: Exibe conectividade local (`node-pc-local`) e remota (`node-vps-primary`).

### 2.6 SCR-LOGIN: Autenticação & Gestão de Credenciais W3C
- **Objetivo**: Gateway de entrada seguro com suporte a manter conectado (`fenix_session` com validade de 30 dias).
- **Integração W3C**: Suporte nativo à **Credential Management API** (`navigator.credentials.store`), permitindo o salvamento seguro e preenchimento automático de senhas nos navegadores modernos.
- **Auto-Login**: Restauração de sessão instantânea pelo endpoint `/api/me`.

---

## 3. Conformidade Visual e Anti-Regressão

O inventário comprova que:
1. Todas as 14 views residem estritamente dentro da fonte canônica única (`index.html`).
2. Não existem shells paralelas nem mocks visuais.
3. Toda tela possui dependências de backend mapeadas e equilibradas (Reciprocidade 100%).
