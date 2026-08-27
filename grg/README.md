# GRG Services OS — implementação local-first

Implementação executável do GRG Services OS: um Sistema Operacional para Engenharia de Software
com IA. Arquitetura hexagonal (ports & adapters), multi-tenant, event-driven. Roda 100% offline
com adapters locais; adapters reais (Postgres, LiteLLM, GitHub, packagers) plugam a mesma interface.

Especificação/decisões vivem em `../ai-os/`. Aqui está o código dos planos.

## Rodar

```bash
# testes (Node >= 18)
node --test test/

# painel + API (http://127.0.0.1:4400)
node src/server.js
```

O runtime universal para IDEs usa `POST /api/v2/jobs`, BullMQ, worker persistente, worktree isolado e gates reais. CLI e MCP são apenas adaptadores desse contrato. Consulte [`docs/UNIVERSAL_ORCHESTRATOR.md`](docs/UNIVERSAL_ORCHESTRATOR.md).

## Planos implementados (todos com testes)

| Plano | Módulo | Fase |
|---|---|---|
| Kernel (event bus, store, ids, erros) | `src/kernel/` | 1 |
| Control Plane (tenant/org/cliente, RBAC/ABAC) | `src/control-plane/` | 1 |
| Repository Intelligence (connect, scan, snapshot, grafo, memória) | `src/repo-intel/` | 2 |
| AI Runtime (gateway multi-provedor, cache, budget, telemetria) | `src/ai-runtime/` | 3 |
| Software Factory (plan → reuse → generate delta → validate) | `src/software-factory/` | 4 |
| Universal Runtime (deploy preview/staging/prod, rollback) | `src/runtime/` | 5 |
| White Label + Design + Marketplace + Billing | `src/product/` | 6 |
| App Factory (pwa/electron/tauri/android/ios/extensões) | `src/app-factory/` | 7 |
| AI Orchestrator (meta-agente ponta-a-ponta) | `src/orchestrator/` | 7 |
| Painel Master (HTTP API + dashboard) | `src/server.js`, `public/` | 7 |

## Arquitetura (ports & adapters)

O domínio fala com `ports`; a infra são `adapters`. Trocar tecnologia = trocar adapter:

- **Store**: `MemoryStore`/`FileStore` (local) → adapter Postgres+RLS.
- **Git host**: `LocalGitHostAdapter` → GitHub App / GitLab / Bitbucket.
- **AI provider**: `EchoProvider` (determinístico) → OpenAI / Anthropic / Gemini / Ollama (via gateway estilo LiteLLM).
- **Deploy**: `MockProviderAdapter` → Cloudflare / AWS / K8s / VPS.
- **Packager**: `MockPackager` → gradle / xcode / electron-builder / tauri / web-ext.

## Fluxo ponta-a-ponta (Orchestrator)

```
prompt → plan (descobre reutilização no catálogo)
       → generate (cria SÓ o inexistente, reusa capabilities)
       → deploy preview
       → build artefatos (opcional)
       → memória evolutiva + grafo atualizados
```

Exemplo via API:

```bash
curl -X POST http://127.0.0.1:4400/api/orchestrate \
  -H "x-tenant-id: grg" -H "x-user-id: grg-admin" -H "content-type: application/json" \
  -d '{"name":"ZapLoja","prompt":"CRM WhatsApp com IA e checkout PIX","target":"node","buildTargets":["pwa","android"]}'
```

## O que é real vs. o que é adapter local

- **Real e testado**: toda a lógica de domínio (isolamento multi-tenant, RBAC, reutilização de
  capabilities, análise de repositório, cache/budget de tokens, geração por delta, deploy com
  aprovação, white label/PlanGate, billing, empacotamento, orquestração, API HTTP).
- **Adapter local/mock** (troca por real sem tocar no domínio): git host, provider de IA,
  provedores de deploy, packagers de app, persistência.

## Endpoints

`GET /health` · `GET /api/overview` · `GET /api/projects` · `GET /api/repositories` ·
`GET /api/graph` · `GET /api/ai/telemetry` · `POST /api/repositories` ·
`POST /api/repositories/:id/analyze` · `POST /api/factory/generate` · `POST /api/orchestrate`

Toda rota `/api/*` protegida exige Bearer token. Headers `x-tenant-id` e `x-user-id` existem apenas
como ponte de migração local quando `FENIX_ALLOW_DEV_HEADERS=1`.

## Enterprise Operations Foundation

O schema de estado v5 possui histÃ³rico explÃ­cito de migraÃ§Ã£o. O composition root tambÃ©m expÃµe
`app.idempotency`, `app.outbox`, `app.inbox`, `app.backup` e `app.health`. Retry e circuit breaker
ficam em `src/infrastructure/resilience`.

Esses sÃ£o contratos estÃ¡veis para os prÃ³ximos adapters de PostgreSQL, Redis/BullMQ e object
storage. As implementaÃ§Ãµes atuais em arquivo/memÃ³ria continuam sendo adapters de desenvolvimento.
Garantias e limitaÃ§Ãµes estÃ£o em `docs/ADR-0002-ENTERPRISE-FOUNDATION-PRIMITIVES.md`.

Adapters externos sÃ£o ativados por `DATABASE_URL`, `REDIS_URL`, `FENIX_QUEUE_REDIS_URL` e
`FENIX_S3_BUCKET`. Em production eles sÃ£o obrigatÃ³rios; o servidor nÃ£o regride silenciosamente
para JSON local. A stack local de PostgreSQL/Redis estÃ¡ em `docker-compose.enterprise.yml`, com
senhas fornecidas por arquivos de secrets. Veja `docs/RUNBOOK_ENTERPRISE_INFRA.md`.

O AI Gateway aceita OpenAI, Anthropic, Gemini, Groq e endpoints locais OpenAI-compatible por
configuraÃ§Ã£o. Rotas possuem fallback ordenado, retry limitado, circuit breaker, cache com TTL,
reserva atÃ´mica de tokens/custo e rate limit Redis por tenant. Consulte
`docs/ADR-0004-AI-GATEWAY-ENTERPRISE.md` e `.env.example`.

O `MemoryEngine` v6 registra memÃ³ria episÃ³dica, semÃ¢ntica, de trabalho, projeto e organizaÃ§Ã£o
com proveniÃªncia, classificaÃ§Ã£o, versÃµes, retenÃ§Ã£o, tombstone e consolidaÃ§Ã£o. A busca combina
texto, confianÃ§a e Qdrant sem atravessar tenants. API: `POST /api/memories`,
`GET /api/memories/search`, `GET /api/memories/:id/history`,
`POST /api/memories/consolidate` e `DELETE /api/memories/:id`.

O Knowledge Graph v7 possui entidades versionadas, relaÃ§Ãµes temporais, proveniÃªncia,
neighborhood, caminho dirigido, impacto ponderado e detecÃ§Ã£o de anomalias. Os endpoints novos
ficam em `/api/knowledge-graph`; `/api/graph` continua como compatibilidade legada.

O FÃŠNIX Fabric v8 registra sistemas, entrega identidade uma vez, mantÃ©m versÃµes no Registry,
publica eventos durÃ¡veis com hash chain e projeta o sistema no Knowledge Graph por evento.
Endpoints: `POST /api/fabric/enroll`, `GET /api/fabric/enrollments`, `GET /api/registry` e
`GET /api/events`. Em production, o emissor local de identidade Ã© recusado.

A Discovery Network v9 executa somente probes autorizados; Docker Ã© opt-in com
`FENIX_DISCOVERY_DOCKER=1`. Recursos detectados/alterados/ausentes entram no Registry por eventos.
A Knowledge Federation publica fatos estruturados em `/api/knowledge-federation/publish`, que sÃ£o
projetados em memÃ³ria e grafo sem copiar bancos entre CRM, ERP, Factory ou AI City.

O Global Version Engine v10 transforma cada evento durável do Fabric em uma versão
imutável por recurso, com snapshot, autoria, motivo, correlação e diff por campo.
Rollback publica um comando durável; em produção exige aprovação independente e de uso único.
APIs: `GET /api/versions`, `GET /api/versions/diff`, `POST /api/rollbacks` e
`POST /api/rollbacks/:id/dispatch`.

A AI City v11 é uma projeção viva do Event Store na hierarquia Tenant → City → District →
Building → Floor → Room → System → Service → Process → Event. Nós determinísticos exibem
estado e atividade e podem ser reconstruídos com `POST /api/city/rebuild`; o mapa tenant-scoped
fica em `GET /api/city`.

O Runtime v12 centraliza trabalho assíncrono registrado. Possui fila persistente, prioridade,
limites declarados, timeout, heartbeat, retry exponencial, cancelamento cooperativo, scheduler
e Dead Letter Queue. Os handlers iniciais são `factory.generate`, `project.orchestrate` e
`discovery.scan`. APIs operacionais ficam sob `/api/runtime`; produção usa Redis/BullMQ.

Deploy de produção falha fechado sem adapter real. Com `FENIX_DEPLOY_DRIVER=docker`, projetos
gerados recebem Dockerfile não-root e o adapter executa build/run reais, preserva a imagem anterior
e aplica isolamento de filesystem, capabilities, privilégios, PIDs, CPU, memória e rede. Adapters e
packagers determinísticos continuam disponíveis apenas em desenvolvimento (`productionSafe=false`).

O Capability Registry v13 registra módulos operacionais independentes no Service Fabric, mantendo
versões, owner, permissões, recursos, quotas, saúde, métricas, documentação, testes e changelog.
Execuções atualizam o catálogo apenas por eventos do Runtime. APIs: `GET/POST /api/capabilities`,
`GET /api/capabilities/:id` e `GET /api/capabilities/:id/history`.

O Cognitive Core v14 implementa o ciclo governado Observe → Context → Hypothesis → Policy →
Approval → Runtime → Validation → Reflection → Learning. Ele não executa trabalho nem chama Memory
ou Knowledge diretamente. APIs de goals, contexto, ciclo, hipóteses e dashboard ficam em
`/api/cognitive`.

## Security e Governance Foundation

O servidor não cria mais usuários ou senhas automaticamente. Para provisionamento local, copie
`.env.example`, defina `FENIX_BOOTSTRAP_ADMIN_USER` e `FENIX_BOOTSTRAP_ADMIN_PASSWORD` e remova os
valores após o primeiro login. Bootstrap e identity headers são recusados quando
`FENIX_ENV=production`.

Em HTTP, o fluxo padrão é:

1. `POST /api/login` recebe tenant, usuário e senha;
2. o bearer bruto é devolvido uma vez; somente seu hash é persistido;
3. `POST /api/logout` revoga a sessão persistentemente;
4. toda resposta recebe request ID e headers defensivos;
5. eventos e decisões são registrados no Audit Trail encadeado;
6. operações críticas usam Approval Engine e aprovação de uso único.

Endpoints de governança:

- `GET /api/audit`;
- `GET /api/approvals`;
- `POST /api/approvals`;
- `POST /api/approvals/:id/approve`.

`FENIX_ALLOW_DEV_HEADERS=1` existe apenas para migração local. O valor padrão é desligado.
