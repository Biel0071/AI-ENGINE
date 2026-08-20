# FÊNIX OS — FRONTEND INVENTORY & COMPONENT CATALOG
> **DOCUMENTO OFICIAL DE AUDITORIA FORENSE E CONSOLIDAÇÃO DE UI**  
> **Data**: 2026-08-20  
> **Status**: CONSOLIDADO / SINGLE SOURCE OF TRUTH DEFINIDA  

---

## 1. RESUMO EXECUTIVO DO INVENTÁRIO

A auditoria forense do repositório `ai-engine-core` identificou **5 ecossistemas de frontend / templates de interface** distintos gerados em diferentes fases do projeto.

Abaixo está o inventário detalhado de cada implementação analisada.

---

## 2. INVENTÁRIO DETALHADO DOS FRONTENDS

### 🟢 [FRONTEND-01] FÊNIX UNIFIED OPERATIONAL SHELL (OFICIAL)
* **Frontend ID**: `FE-OFFICIAL-UNIFIED`
* **Path**: [`ai-engine/grg/public/`](file:///c:/projetos/ai-engine-core/ai-engine/grg/public)
* **Entry point**: `grg/public/index.html` + `grg/public/unified-app.js`
* **CSS / Design System**: `grg/public/unified.css` (Obsidian Dark Glassmorphism + Cyberpunk)
* **Framework**: Native Vanilla JS (Zero-Build Runtime Resiliente) + Canvas 2D/3D + WebSockets
* **Router**: Single Page Hash / Tab Router (`#city`, `#ide`, `#operations`, `#projects`, `#agents`, `#metrics`, `#dna`, `#memory`, `#settings`, `#marketplace`)
* **Components**:
  * Topbar Telemetria (Status AI Platform VPS, Modelo Ativo, Latência ms, Créditos, Status Geral)
  * AI City 3D Isométrica Interativa (Canvas de alta densidade, tráfego neon, agentes vivos em movimento, monumento central)
  * Chat Lateral Fênix JARVIS (24/7 background agent dispatcher)
  * IDE Lovable-Style Integrada (Visual Preview, Code Editor, File Tree no disco, Terminal Integrado)
  * Painel de Operações 24/7 (Daily Operations, Fila de Aprovações Pendentes, Oportunidades Cross-Project, Fila DAG de Jobs)
  * 4-DNA Model Quad Grid (Estrutural, Comportamental, Visual, Evolutivo)
  * Painel de Agentes Vivos (19/19 agentes em produção)
  * Métricas em Tempo Real (Prometheus + Memory + CPU + Eventos)
* **State**: Global Unified Reactive State (`state = { view, activeProjectId, activeFile, activeModel, zoom, panX, panY, cityState, ... }`)
* **API**: `http://localhost:4400` / `http://209.50.241.22:4400` (`/api/v2/*`, `/api/v2/city/state`, `/api/v2/jarvis/*`, `/api/v2/agentic/*`, `/events`)
* **Dependencies**: Native Web APIs, WebSocket, Canvas API
* **Used by**: Fênix Kernel, Servidor Principal, VPS Production Gateway
* **Last modified**: 2026-08-20
* **Tests**: `grg/test/agentic-development-e2e.test.js`, `grg/test/jarvis-autonomous-orchestrator-e2e.test.js`
* **Status**: **OFFICIAL (FONTE ÚNICA DA VERDADE)**

---

### 🟡 [FRONTEND-02] FÊNIX AI CITY VITE PROTOTYPE (EXPERIMENTAL / PARCIAL)
* **Frontend ID**: `FE-EXP-AI-CITY-REACT`
* **Path**: [`ai-engine/grg/apps/ai-city/`](file:///c:/projetos/ai-engine-core/ai-engine/grg/apps/ai-city)
* **Entry point**: `grg/apps/ai-city/index.html` + `src/main.tsx` + `src/App.tsx`
* **CSS**: `src/index.css`
* **Framework**: React 18 + Vite + TypeScript + Monaco Editor + Xterm.js
* **Router**: State-based modal views
* **Components**: `KnowledgeDistrict.tsx`, `WorkersDistrict.tsx`, `EvolutionDistrict.tsx`, `DeveloperDistrict.tsx`
* **State**: Local React `useState` + `EventBus`
* **API**: Hardcoded VPS URLs (`http://209.50.241.22:4410`, `http://209.50.241.215:4400/api/dev/*`)
* **Dependencies**: `@monaco-editor/react`, `xterm`, `lucide-react`, `vite`, `typescript`
* **Used by**: Protótipo de desenvolvimento anterior
* **Tests**: Nenhum teste unitário associado
* **Status**: **EXPERIMENTAL / DUPLICATE** (Funcionalidades migradas para o Shell Oficial; movido para `/archive/frontend/grg-apps-ai-city/`)

---

### 🔴 [FRONTEND-03] PLATFORM LIVING DASHBOARD (LEGACY V2)
* **Frontend ID**: `FE-LEGACY-PLATFORM-V2`
* **Path**: [`ai-engine/platform/public/`](file:///c:/projetos/ai-engine-core/ai-engine/platform/public)
* **Entry point**: `platform/public/index.html` + `platform/public/app-v2.js` + `platform/public/app.js`
* **CSS**: `platform/public/styles.css`
* **Framework**: Vanilla JS
* **Router**: Tab Router baseado em `.nav-tab`
* **Components**: Métricas de repositórios, busca de projetos, lista de projetos conectados, log de eventos
* **State**: Local JS `state = { projects, graph, acep, maturity, lcr }`
* **API**: Endpoints legados de tenant (`/api/dashboard`, `/api/chat`, headers `x-tenant-id`, `x-user-id`)
* **Dependencies**: Zero
* **Status**: **LEGACY** (Substituído integralmente pelas views de Projetos e Métricas do Shell Oficial; movido para `/archive/frontend/platform-public/`)

---

### 🔴 [FRONTEND-04] CRM FRONTEND PLACEHOLDER (PARTIAL / DRAFT)
* **Frontend ID**: `FE-DRAFT-CRM`
* **Path**: [`ai-engine/crm/frontend/`](file:///c:/projetos/ai-engine-core/ai-engine/crm/frontend)
* **Entry point**: `crm/frontend/dist/index.html`
* **Framework**: React Vite Template (Sem componentes implementados — apenas READMEs)
* **Status**: **PARTIAL / EMPTY PLACEHOLDER** (Arquivado em `/archive/frontend/crm-frontend/`)

---

### ⚪ [FRONTEND-05] TEMPLATES GERADOS POR TESTES E PROJETOS GERADOS (STARTERS)
* **Frontend ID**: `FE-GENERATED-SCAFFOLDS`
* **Path**: [`ai-engine/grg/generated/`](file:///c:/projetos/ai-engine-core/ai-engine/grg/generated) (ex: `fenix_test_lab`) e `ai-engine/generated/`
* **Entry point**: `generated/*/starter/index.html`
* **Finalidade**: Projetos de teste gerados pelo pipeline agêntico no disco para edição na IDE
* **Status**: **WORKSPACE DATA** (Gerenciados pelo `MultiProjectWorkspaceManager`)

---

## 3. TABELA CONSOLIDADORA DE STATUS

| Frontend ID | Path | Framework | Status | Ação Forense |
| :--- | :--- | :--- | :--- | :--- |
| **FE-OFFICIAL-UNIFIED** | `grg/public/` | Native Vanilla + Canvas + WS | **OFFICIAL** | **MANTER COMO FONTE DA VERDADE ÚNICA** |
| **FE-EXP-AI-CITY-REACT** | `grg/apps/ai-city/` | React 18 + Vite | **EXPERIMENTAL** | Mapear features, migrar e arquivar |
| **FE-LEGACY-PLATFORM-V2** | `platform/public/` | Vanilla JS Legado | **LEGACY** | Mapear features, migrar e arquivar |
| **FE-DRAFT-CRM** | `crm/frontend/` | Vite Draft | **PARTIAL** | Arquivar |
| **FE-GENERATED-SCAFFOLDS** | `grg/generated/` | Output do Runtime | **WORKSPACE DATA** | Manter no disco isolado |
