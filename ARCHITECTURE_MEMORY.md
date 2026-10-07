# ARCHITECTURE_MEMORY.md — FÊNIX OS

> Derivado do índice real (`engine/projectIntelligence/output/skeleton.json` + `graph.json`).
> Tipo: ARCHITECTURE | confidence: alta (verificado no código em 2026-10-08) | status: ATIVA

## Camadas reais (STACK verificado)

```
grg/  (FÊNIX OS canônico — Node >= 18, HTTP puro, sem framework)
├── src/server.js        entrypoint HTTP (porta 4400), rotas /api/* (~185 handlers), estáticos de public/
├── src/app.js           composition root — monta TODOS os serviços (MemoryStore/FileStore → PostgresStore quando configurado)
├── src/kernel/          store, event-bus, access-control, errors, ids, organism-identity, retention, state-migrations
├── src/control-plane/   ControlPlane (tenants, memberships, authorize)
├── src/auth/            AuthService + OidcVerifier (jose; Keycloak em ops/keycloak)
├── src/ai-city/         World/City map (/api/city) + NPC engine
├── src/missions/        MissionKernel + mission planner (/api/missions*)
├── src/memory/          MemoryEngine + QdrantVectorStore (/api/memories*)
├── src/knowledge-graph/ KnowledgeGraph (/api/knowledge-graph*)
├── src/eventing/        EventStore + FabricEventBus (/api/events)
├── src/fabric/          FenixFabric, ServiceRegistry, IdentityProvider (enroll /api/fabric/*)
├── src/runtime/         Deployer + job engine via BullMQ (/api/runtime/jobs|schedules|tick|work)
├── src/execution/       tools, scripts, signers, sandbox (/api/execution/*)
├── src/infrastructure/  adapters externos: postgres-store, redis-cache/rate-limiter, bullmq-runtime, s3-object-store, messaging (outbox/inbox/idempotency), observability, backup
├── src/repo-intel/      RepositoryIntelligence, GitHubConnector, PortfolioService, CloningGitHostAdapter
├── src/ai-runtime/      provider-registry, ai-router, ai-gateway, providers (OpenAI-compat/Ollama)
├── src/governance/      PolicyEngine, ApprovalEngine, Gatekeeper, AuditTrail, readiness
├── src/omega*/ keos/ scos/ uios/ nexus/ …  motores cognitivos/UI com APIs próprias (/api/omega*, /api/keos*, /api/scos*, /api/uios*, /api/nexus*)
└── public/              FRONTEND CANÔNICO: index.html + app.js (+ office.html/js, login.html)

platform/  Control Plane v2 LEGADO do AI-ENGINE (porta 4310; /api/v2/*; ACEP/LCR/graph) — preservar separado.
engine/    Motor de IA reutilizável raiz (projectScanner, codeIntelligence c/ tree-sitter, memory stores, runAnalysis).
crm/       Satélite ZapAI (Baileys/WhatsApp backend + frontend Vite).
ai-os/     Documentação operacional e memória de decisões (MEMORY/decisions/*.md).
docker-compose.yml: qdrant:6333 + docling:8000. grg/docker-compose.enterprise.yml: stack completa.
```

## Fluxo de dados verificado

- UI `app.js` chama helper `api(path)` → Bearer token (localStorage `grg_token`) → `/api/*` no server 4400 → serviço da composition root → Store (File `.data/state.json` local-first; Postgres quando DATABASE_URL presente) → EventBus/EventStore.
- `/api/city` alimenta o mapa World; `/api/overview` alimenta o console; `/api/operations/state` alimenta ativação; refresh token via `/api/oidc/config`.
- Worker: schedules garantidos no boot; execução fora do startup (comentário explícito em server.js sobre colisão SERIALIZABLE api+worker — não reintroduzir).

## Invariantes a respeitar (de testes existentes)

- `grg/test/frontend-runtime-safety.test.js` protege o runtime do frontend canônico.
- `grg/test/e2e-http.test.js` cobre contratos HTTP.
- 68 arquivos de teste em `grg/test/` — rodar `cd grg && node --test test/` antes/depois de mudanças no core.
