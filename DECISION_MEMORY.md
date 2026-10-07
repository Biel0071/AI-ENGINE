# DECISION_MEMORY.md — FÊNIX OS

> Memória de decisões arquiteturais. **Toda decisão nova deve consultar este arquivo antes.**
> Entradas derivadas da realidade do código + decisões já registradas em `ai-os/MEMORY/decisions/`.
> Formato: id | type | scope | source | timestamp | confidence | status

---

## DECISION-001 — Frontend canônico
- **Decisão**: O frontend canônico do FÊNIX OS é `grg/public/index.html` (Live Workspace), servido estaticamente por `grg/src/server.js`, com helper de API em `grg/public/app.js`. Não existe React/Vue no core; é vanilla JS.
- **Source**: `grg/src/server.js` (const PUBLIC = grg/public), `grg/public/index.html`, teste `grg/test/frontend-runtime-safety.test.js`.
- **timestamp**: verificado em 2026-10-08 | **confidence**: alta | **status**: ATIVA
- **Proibição derivada**: NÃO criar index.html alternativo nem frontend paralelo. `platform/public/` é o Control Plane LEGADO (porta 4310) — preservar, não fundir.

## DECISION-002 — World / City Map
- **Decisão**: A "World" é a seção #command/cityMap de `index.html`, alimentada por `GET /api/city` → `app.aiCity.map` (`grg/src/ai-city/*`), com rebuild via `POST /api/city/rebuild` e NPCs via `/api/city/npc/*`.
- **Source**: `grg/src/server.js` rotas /api/city*, `grg/public/app.js` (state.city), `grg/test/ai-city.test.js`.
- **confidence**: alta | **status**: ATIVA

## DECISION-003 — Backend canônico e porta
- **Decisão**: Backend canônico = `grg/src/server.js` (HTTP puro Node, porta padrão **4400** via env PORT), composition root `grg/src/app.js`. Control Plane legado AI-ENGINE roda separado em `platform/` (porta **4310**).
- **Source**: `grg/src/server.js:start()`, `platform/src/index-v2.js`, CLAUDE.md.
- **confidence**: alta | **status**: ATIVA

## DECISION-004 — Memory
- **Decisão**: Memória operacional do FÊNIX = `MemoryEngine` (`grg/src/memory/memory-engine.js`) + `QdrantVectorStore` (vetores, compose porta 6333) + KnowledgeGraph (`grg/src/knowledge-graph/`). APIs: `/api/memories*`. Decisões documentacionais vivem em `ai-os/MEMORY/decisions/*.md` (15 arquivos reais).
- **confidence**: alta | **status**: ATIVA

## DECISION-005 — Arquitetura de eventos
- **Decisão**: EventBus no kernel (`grg/src/kernel/event-bus.js`), EventStore (`grg/src/eventing/event-store.js`), FabricEventBus (`grg/src/eventing/fabric-event-bus.js`), Outbox/Inbox/Idempotency em `grg/src/infrastructure/messaging/`. Contrato documentado em `grg/EVENT_ARCHITECTURE.md`.
- **confidence**: alta | **status**: ATIVA

## DECISION-006 — Design System
- **Decisão**: CSS do frontend canônico: `design-system.css` (tokens), `fenix.css`, `city-overrides.css`, `styles.css`, `office.css`. SCOS mantém design tokens vivos via `/api/scos/design-tokens` e `/api/scos/design-families/list`.
- **Source**: `grg/public/*.css`, rotas scos em server.js.
- **confidence**: alta | **status**: ATIVA

## DECISION-007 — LLM / Provider Orbit
- **Decisão**: Providers construídos por env (`grg/src/ai-runtime/provider-registry.js: buildProvidersFromEnv`), roteamento por `ai-router.js`, gateway `ai-gateway.js`. Decisão histórica registrada: **Ollama como LLM real** (`ai-os/MEMORY/decisions/2026-07-24-ollama-llm-real.md`). Chat desligável via `GRG_LLM=0` (modo regras).
- **confidence**: alta | **status**: ATIVA

## DECISION-008 — Autonomia congelada
- **Decisão**: Arquitetura 100% congelada (CLAUDE.md): não criar novos motores/camadas; política de autonomia em 5 níveis (`AUTONOMY_LEVELS_POLICY.json`). Esta ferramenta de inteligência (`engine/projectIntelligence/`) é **camada de leitura/índice**, não um novo motor do FÊNIX — não toca contratos públicos.
- **confidence**: alta | **status**: ATIVA

## DECISION-009 — Segurança do índice
- **Decisão**: O índice nunca armazena valores de segredos: `.env` é indexado apenas com nomes de chaves; chaves contendo SECRET/TOKEN/PASSWORD/API_KEY/COOKIE/AUTHORIZATION são redigidas (`lib.js: SECRET_KEY_PATTERN`, `scanForLeaks` no audit confirma zero vazamentos).
- **confidence**: alta | **status**: ATIVA

## PENDENTES (não decidir sem evidência)
- P-001: As telas AGENTS/BROWSER/CHAT/RUNTIME/CONNECTORS/SECURITY/OBSERVABILITY do briefing existem como **seções/âncoras** dentro do index.html canônico ou como APIs (/api/agents/*, /api/connectors, /api/security/*) — não como rotas SPA separadas. Qualquer migração para rotas exige proposta + validação (REGRA ZERO).
