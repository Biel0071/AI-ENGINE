# INTEGRATION_REGISTRY.md

Integrações verificadas por arquivo-fonte real (nenhuma invenção):

| Integração | Source files | Lib/Protocol | Config | Consumidores |
|---|---|---|---|---|
| Postgres | `grg/src/infrastructure/database/postgres-store.js` | pg | DATABASE_URL via infrastructure/config.js | app.js (store primário quando configurado) |
| Redis | `grg/src/infrastructure/redis/redis-cache.js + redis-rate-limiter.js` | redis | REDIS_URL/queue | cache, rate-limit, BullMQ |
| BullMQ (Job Engine) | `grg/src/infrastructure/queue/bullmq-runtime.js` | bullmq | queueRedisUrl | runtime/jobs, schedules, worker /api/runtime/work |
| Qdrant (vetores) | `grg/src/memory/qdrant-vector-store.js` | @qdrant client via fetch | QDRANT_URL; compose porta 6333 | MemoryEngine, knowledge search |
| S3/MinIO | `grg/src/infrastructure/storage/s3-object-store.js` | @aws-sdk/client-s3 | S3_* env | backups, artefatos |
| GitHub | `grg/src/repo-intel/github-connector.js + cloning-git-host.js` | API REST/auth | GITHUB token (redacted) | PortfolioService, RepositoryIntelligence, ops/github |
| AI Providers / Ollama | `grg/src/ai-runtime/provider-registry.js + ai-router.js + ai-gateway.js` | OpenAI-compat + local | GRG_LLM, provider envs; decisão registrada: Ollama real | ChatAgent, MasterAvatar, geração de código |
| OIDC/Keycloak | `grg/src/auth/oidc-verifier.js + grg/ops/keycloak` | jose | securityConfig.bootstrapOidc | /api/login, /api/oidc/config |
| Docling (docs) | `docker-compose.yml` | container | porta 8000 | ingestão multimodal /api/multimodal/ingest |
| Baileys/WhatsApp | `crm/backend/baileys` | whatsapp | sessões em crm/backend/crm/sessions (gitignored) | CRM satélite (não é o core FÊNIX) |
| Playwright/browser | `grg/src/execution (sandbox) + onedeploy e2e` | — | FENIX_SMOKE_BASE_URL | inspections, e2e/run, smoke-tests |

Status de saúde: `/health` (grg server, inclui progresso da ativação operacional em background) e HealthRegistry (grg/src/infrastructure/monitoring/health-registry.js). Observabilidade: `/api/observability/metrics`, `/api/operations/observability/metrics` e `grg/ops/observability`.
