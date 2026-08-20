# FÊNIX OS — FRONTEND ARCHITECTURE (SINGLE SOURCE OF TRUTH)
> **ARQUITETURA DEFINITIVA DO FRONTEND CONSOLIDADO**  
> **Data**: 2026-08-20  

---

## 1. PRINCÍPIO DA FONTE ÚNICA DA VERDADE (SINGLE SOURCE OF TRUTH)

O FÊNIX OS possui **EXATAMENTE UM** frontend oficial em produção.

* **OFFICIAL_ENTRYPOINT**: [`ai-engine/grg/public/index.html`](file:///c:/projetos/ai-engine-core/ai-engine/grg/public/index.html)
* **OFFICIAL_LOGIC_ENGINE**: [`ai-engine/grg/public/unified-app.js`](file:///c:/projetos/ai-engine-core/ai-engine/grg/public/unified-app.js)
* **OFFICIAL_DESIGN_SYSTEM**: [`ai-engine/grg/public/unified.css`](file:///c:/projetos/ai-engine-core/ai-engine/grg/public/unified.css)
* **OFFICIAL_SERVER_SERVE_PATH**: `c:\projetos\ai-engine-core\ai-engine\grg\public` servido diretamente na porta `4400`.

---

## 2. ARQUITETURA ESTRUTURAL DA APLICAÇÃO ÚNICA

```text
                           ┌───────────────────────────────┐
                           │      FENIX OS UNIFIED APP     │
                           └───────────────┬───────────────┘
                                           │
       ┌───────────────────────────────────┼───────────────────────────────────┐
       │                                   │                                   │
       ▼                                   ▼                                   ▼
┌──────────────┐                  ┌─────────────────┐                 ┌────────────────┐
│   TOPBAR     │                  │  UNIFIED ROUTER │                 │ DUAL-MODEL BAR │
│ Telemetria   │                  │   & WORKSPACE   │                 │ Modelo 1 + 2   │
│ Real da VPS  │                  └────────┬────────┘                 └────────────────┘
└──────────────┘                           │
       ┌───────────────┬───────────────────┼───────────────────┬───────────────┐
       ▼               ▼                   ▼                   ▼               ▼
 🏙️ AI CITY       💻 IDE PRO        ⚡ OPERAÇÕES 24/7    📁 PROJETOS      🤖 AGENTES
  3D Canvas     Visual + Code       Jobs + DAG + Human     Multi-Tenant    19 Especialistas
  Tráfego Neon  File Tree + Term    Aprovações e Prop.     No Disco Real   Roster & Status
       │               │                   │                   │               │
       └───────────────┴───────────────────┼───────────────────┴───────────────┘
                                           │
                                           ▼
                           ┌───────────────────────────────┐
                           │      UNIFIED STATE & BUS      │
                           │  projects, activeProject,     │
                           │  activeModel, ws/sse events   │
                           └───────────────┬───────────────┘
                                           │
                                           ▼
                           ┌───────────────────────────────┐
                           │      BACKEND REST + WS        │
                           │   /api/v2/* (Zero Mocks)      │
                           └───────────────────────────────┘
```

---

## 3. AS REGRAS INVIOLÁVEIS DO FRONTEND

1. **PROIBIDO CRIAR NOVOS FRONTENDS**: Qualquer solicitação de nova tela ou recurso deve ser adicionada como uma nova view ou componente dentro de `grg/public/index.html` e `grg/public/unified-app.js`.
2. **PROIBIDO CRIAR SHELLS PARALELOS**: Toda funcionalidade herda a barra superior de telemetria, a barra lateral de navegação e o seletor dual de modelos.
3. **PROIBIDO MOCKS SILENCIOSOS**: Se um endpoint de backend não responder, a interface exibe `"Indisponível"` ou `"0"`. Nunca inventa valores aleatórios.
4. **PERSISTÊNCIA NO DISCO**: A árvore de arquivos da IDE reflete o diretório do projeto no disco através da rota `/api/v2/projects/:id/files`.
