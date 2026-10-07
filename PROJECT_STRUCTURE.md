# PROJECT_STRUCTURE.md — FÊNIX OS

Gerado automaticamente por `engine/projectIntelligence/build.js` em 2026-10-07T16:42:00.538Z. Derivado da realidade do código.

## Topo do repositório (1022 arquivos, sem node_modules/.git)

| Diretório | Arquivos | Finalidade (verificada no código) |
|---|---|---|
| `grg/` | 336 | FÊNIX OS canônico — backend Node (src/server.js, porta 4400) + frontend canônico public/index.html (Live Workspace) + office.html |
| `graphify-out/` | 237 | Grafo/AST cache gerados por ferramenta externa — regenerável |
| `engine/` | 95 | Motor de IA reutilizável (análise, AST tree-sitter, memória, codeIntelligence) |
| `ai-os/` | 92 | Documentos operacionais do FÊNIX (memória de decisões, prompts, repositórios registrados) |
| `future/` | 79 | Rascunhos/legado (legacy-root) — inativo |
| `generated/` | 60 | Saídas geradas pelo engine (smoke/dashboards) — NÃO editar |
| `docs/` | 34 | Documentação geral |
| `platform/` | 26 | Control Plane v2 legado do AI-ENGINE (porta 4310) — dashboard próprio em public/ |
| `ai-analysis/` | 14 | Análises congeladas (freeze) — gerado |
| `crm/` | 11 | CRM ZapAI (backend Baileys/WhatsApp + frontend Vite) — projeto satélite |
| `memory/` | 7 | Memória de projetos (ai-engine, zapai-crm) |
| `system/` | 6 | Docs de sistema |
| `.github/` | 2 | CI/CD (workflows) |
| `.env/` | 1 | A classificar |
| `.gitignore/` | 1 | A classificar |
| `ACTION_REGISTRY.md/` | 1 | A classificar |
| `API_REGISTRY.md/` | 1 | A classificar |
| `ARCHITECTURE_MEMORY.md/` | 1 | A classificar |
| `CHANGELOG.md/` | 1 | A classificar |
| `CLAUDE.md/` | 1 | A classificar |
| `DECISION_MEMORY.md/` | 1 | A classificar |
| `FAST_UNDERSTANDING_ENGINE.md/` | 1 | A classificar |
| `INTEGRATION_REGISTRY.md/` | 1 | A classificar |
| `LICENSE/` | 1 | A classificar |
| `PROJECT_GRAPH.md/` | 1 | A classificar |
| `PROJECT_SKELETON.md/` | 1 | A classificar |
| `PROJECT_STRUCTURE.md/` | 1 | A classificar |
| `README.md/` | 1 | A classificar |
| `SCREEN_REGISTRY.md/` | 1 | A classificar |
| `TASK_MEMORY.md/` | 1 | A classificar |
| `docker-compose.yml/` | 1 | A classificar |
| `package-lock.json/` | 1 | A classificar |
| `package.json/` | 1 | A classificar |
| `scripts/` | 1 | Scripts utilitários (analyze-crm) |
| `tsconfig.engine.json/` | 1 | A classificar |
| `tsconfig.json/` | 1 | A classificar |

## Entrypoints reais

- **Backend canônico**: `grg/src/server.js` → `grg/src/app.js` (composition root). Porta padrão `4400` (env PORT).
- **Frontend canônico**: `grg/public/index.html` (+ `app.js`, `design-system.css`, `fenix.css`, `city-overrides.css`, `office.css`). Servido estaticamente por server.js. Rota alternativa: `/office` → `grg/public/office.html`.
- **Login**: `grg/public/login.html` (`/GRG-login`).
- **Control Plane legado**: `platform/src/index-v2.js` (porta 4310, http/server-v2.js).
- **Engine CLI**: `package.json` bin `ai-engine` → `cli/index.js`; scripts: analyze:project (engine/runAnalysis.js), test:engine.
- **Worker/agendamento**: schedules garantidos no boot do grg server; execução via `/api/runtime/work` e BullMQ (grg/src/infrastructure/queue/bullmq-runtime.js).
- **Deploy**: `grg/Dockerfile`, `grg/docker-compose.enterprise.yml`, `grg/start.sh`, `grg/ops/*` (backup/restore/rollback/healthcheck/observability/keycloak/reverse-proxy), compose raiz (qdrant + docling).

## Classificação estrutural (FASE 16)

| Classe | Arquivos |
|---|---|
| ACTIVE | 541 |
| GENERATED | 306 |
| TEST | 76 |
| LEGACY | 76 |

## Configuração

- `.env` (raiz): chaves PORT, FRONTEND_URL, OPENAI_API_KEY(redacted), DATABASE_URL, DEFAULT_COMPANY_ID, AI_ENGINE_CMD, ENGINE_MONITOR_INTERVAL_MS — valores nunca indexados.
- `grg/src/infrastructure/config.js`: carrega Postgres/Redis/S3/Qdrant opcionais.
- `grg/src/security/config.js+: política de segurança/bootstrap admin/OIDC.
- `docker-compose.yml`: serviços qdrant (6333) e docling (8000).

## Runtime

- Node >= 18 (testado em v20). Testes: `cd grg && node --test test/` (suite principal), `cd platform && node --test test/*.test.js`, `npm run test:engine`.
