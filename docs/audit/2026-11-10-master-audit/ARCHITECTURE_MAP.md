# ARCHITECTURE_MAP — FÊNIX OS (estado real, 2026-11-10)

Fonte: código em `ai-engine/grg/src` e `ai-engine/grg/public`. Documentação **não** foi tomada como prova.

## 1. Topologia de processos

```
                       Internet
                          │ 443 (openresty / nginx)
                          ▼
             ┌──────────────────────────┐
             │  api  (src/server.js)    │  ← http.createServer com 1 handler de ~1.600 linhas
             │  porta 4400 (127.0.0.1)  │     (server.js:202-1810)
             │                          │
             │  • Kernel.boot() → require() de TODO .js de src/ (core/Kernel.js:120-152)
             │  • createApp()  → ~150 serviços em um objeto `app` (app.js)
             │  • WebSocket (ws) + SSE /api/v2/events/stream
             │  • consome a fila de jobs a cada 1 s (server.js:1966-2001)
             │  • FenixAutonomousLoop (server.js:2018) + AutonomousEvolution + WorldSimulation
             └────────────┬─────────────┘
                          │ mesmo Postgres / Redis
             ┌────────────▼─────────────┐
             │ worker (src/runtime/worker.js) │ ← chama createApp() DE NOVO (worker.js:22)
             │ • BullMQ 'fenix-runtime' │     cópia própria de cada singleton
             │ • LivingRuntime (11 loops, worker.js:57-67)
             └────────────┬─────────────┘
                          │
   ┌───────────┬──────────┼───────────┬────────────┬──────────┬─────────┐
   ▼           ▼          ▼           ▼            ▼          ▼         ▼
 Postgres   Redis      Qdrant      MinIO       Ollama    Keycloak  Prometheus
 (1 linha   (BullMQ,   (hash       (S3)        (:latest,  (OIDC)
  JSON =    rate       embeddings)              sem limite
  TODO o    limit)                              de memória)
  estado)
```
Fonte: `grg/docker-compose.enterprise.yml`; ✔ `/health` de produção confirma postgres/redis/qdrant/bullmq.

Entradas existentes que **nada inicia**: `runtime/daemon.js`, `evolution/fenix-evolution-worker.js` (porta 4420), `ops/fenix-supervisor.js`. `ecosystem.config.js` (PM2) lança `LEGACY_PM2_CONFIG_DISABLED`.

## 2. Fluxo de uma requisição

```
req → server.js handler
  1. rotas públicas inline (health, boot-status, runtime/services, runtime/ai/usage, test/event…)   ← SEM AUTH
  2. mission-routes (/api/providers|plans|estimates|orchestrator)                                   ← SEM AUTH
  3. /api/login, /api/logout, /api/v2/preview/dev-session                                           ← SEM AUTH
  4. arquivo estático (public/)  ← inclui .bak e backups
  5. security.authenticate()  → 401 se não houver sessão
     (exceto images/creative-studio/public/projects → identidade fabricada 'grg/system-service')
  6. cadeia linear de 24+ handleXRoutes(...) (server.js:634-851)
  7. ~338 comparações inline `url.pathname === …`
  8. 404 (server.js:1800)
```
Primeira correspondência vence → **rotas duplicadas ficam inalcançáveis** (ver MODULE_INVENTORY §4).

## 3. Componentes centrais — integração real

| Componente | Implementação | Instanciado por | Chamado por | Status |
|---|---|---|---|---|
| Kernel | `core/Kernel.js:29` | `server.js:85` | `/api/runtime/services`, flag do `/health`, 1 registro de voz | **PARCIAL / cosmético** (`activateModules` é no-op, `:100-109`) |
| MissionKernel | `missions/mission-kernel.js:25` | `app.js:441` | rotas, `worker.js:99`, `server.js:1987`, loop autônomo | **INTEGRADO** (concorrente: `knowledgeEngine.missionStore`, `app.js:554`) |
| JobEngine (`app.jobs`) | `runtime/job-engine.js:56` | `app.js:268` | worker, servidor | **INTEGRADO** (retries + DLQ) |
| JobQueueManager | `execution/job-queue-manager.js:41` | singleton de módulo | conversation-routes, self-healing | **DUPLICADO** (store `jobs-v8.json`, fila `fenix-jobs`, worker próprio) |
| AgentRegistry | `agents/agent-registry.js:8` | `app.js:265` + 3 outras instâncias | snapshot, assignment, rotas | **PARCIAL + DUPLICADO**, sem tenant |
| Memory Fabric | `memory/memory-fabric.js:45` | `app.js:248` | jobs, projeções, conversas | **INTEGRADO** (1 provedor; Graphiti/Zep = stubs) |
| Graph Brain | `brain/graph-brain.js:26` | singleton `:191` | `app.graphBrain` + 10 módulos | **INTEGRADO, global, sem tenant**, arquivo JSON sem lock |
| Project Registry | `projects/project-registry.js:12` | **array fixo** | ~8 módulos de rotas | **DUPLICADO** (4–5 fontes de projetos) |
| Project Mirror | `project-mirror/scanner.js` | funções | rotas, central-orchestrator, chat | **INTEGRADO** |
| Project DNA | `product/project-dna.js:16` | absorption, ai-orchestrator | absorptionEngine | **PARCIAL** (padrões fixos Express/Postgres) |
| Pattern Library | `memory/pattern-library.js:28` | singleton + 2 | absorption, reconstruction | **PARCIAL** (só memória, perde no reinício) |
| Visual Engine | `software-factory/visual-engine.js:5` | ninguém | ninguém | **MORTO** |
| AI Gateway | `ai-runtime/ai-gateway.js:8` | `app.js:171` | amplamente | **INTEGRADO** |
| AI Gateway (infra) | `infrastructure/ai-gateway/ai-gateway.js:9` | só daemon | — | **MORTO** |
| Model Router | 4 implementações (ver AI_INFRASTRUCTURE_AUDIT §3) | vários | vários | **DUPLICADO** |
| Fast Lane | `execution/fast-lane-engine.js` | funções | só `conversation-routes` | **PARCIAL** (só chat) |
| Job Lane | contador em `routing/model-router.js:64` | — | — | **CONCEITO** (não há módulo) |
| Runtime Manager | — | — | — | **INEXISTENTE** |
| AI City (backend) | `ai-city/ai-city-projection.js:37` | `app.js:264` | `/api/city` | **INTEGRADO + DUPLICADO** (≥4 produtores de estado da cidade: NpcCityEngine, CityLiveBridge, living-city-routes, WorldSimulation, DigitalTwin) |
| LivingRuntime | `runtime/living-runtime.js:347` | só `worker.js:57` | worker | **PARCIAL** (ausente em execução de processo único) |
| FenixAutonomousLoop | `evolution/fenix-autonomous-loop.js:189` (3.152 linhas) | `server.js:2018` + rotas + global | timer | **INTEGRADO + DUPLICADO** (`getGlobalAutonomousLoop()` cria 2º loop sem `app`) |

Duplicações dentro do próprio `app.js`: `LiveBootKernel`, `RuntimeKernel`, `CapabilityMarketplace` construídos 2× (`:448-454` e `:1029-1031`); chave `gitRead` definida 2× (`:541`, `:548`).

## 4. Dependências circulares

- `server.js:31` → `evolution/fenix-autonomous-loop.js:3082` → `require('../server')`.
- O scan do Kernel re-requer `server.js`, `runtime/worker.js` (que requer `../app`) e `app.js` enquanto `server.js` ainda carrega. Funciona por causa do cache de módulos e dos guardas `require.main` [HIPÓTESE].
- `app` passado a construtores (`SelfHealing :637`, `ChatAgent :1004`, `SystemAnalysis :1049`, `FenixHeart :1059`) — referência circular em tempo de execução.

## 5. Persistência

| Store | Onde | Escopo |
|---|---|---|
| Documento único `kernel_state` (`global`) | Postgres (prod) / SQLite (local padrão) / arquivo / memória | quase todo o estado, chaveado por `tenantId` dentro do JSON |
| `jobs-v8.json` | `grg/.data/` | JobQueueManager (duplicado) |
| `graph_brain.json` | `grg/src/.data/` | GraphBrain, sem tenant, sem lock |
| StorageManager | Postgres/SQLite/memória | KnowledgeEngine (missões, projetos, padrões duplicados) |
| memória volátil | processo | PatternLibrary, AgentRegistry, sessões em cache |

## 6. Frontend

```
login.html  (alias de "/")  →  index.html (8.474 linhas, 19 views, ~70 scripts externos + ~20 blocos inline, 50 folhas de estilo)
   ├─ unified-app.js (síncrono, 3.132 linhas)      → define showView "base"
   ├─ roteador canônico inline (index.html:6243-6394) → substitui window.showView
   ├─ fenix-core-controller.js (defer)            → envolve o roteador; tem um 2º roteador dormente
   ├─ cidade: fenix-world-3d.js (12.968 linhas, Three.js, A*) cria #cityCanvas3D
   │          iso-city.js só como fallback 2D em #cityCanvas
   │          + fenix-spatial-city (canvases próprios), unreal-world-live, city-reality-engine
   ├─ tempo real: 1 WebSocket (live-runtime.js) + SSE compartilhado + 1 SSE duplicado (fenix-spatial-city.js:2589)
   └─ fenix-bootstrap.js injeta 6 scripts em tempo de execução
Órfãos: 11 JS (inclui toda a pilha pixi-*) e 6 CSS.
```

## 7. Implantação (contradição documentada)

| Fonte | Diz | Realidade |
|---|---|---|
| `CLAUDE.md` (Regra V) | deploy só via `ai-engine/deploy.bat`, PM2 #17, `/opt/fenix-os/public` | `ai-engine/deploy.bat` e `ecosystem.config.js` estão **desativados** (saem com "retired/legacy") |
| `C:\projetos\ai-engine-core\deploy.bat` (fora do git) | ~100 `scp` como root para duas webroots | sem build nem verificação |
| `grg/deploy-unified-front-vps.sh` + `docker-compose.enterprise.yml` | Docker em `/opt/grg-fenix/source/grg` | **[HIPÓTESE forte]** é o caminho realmente em uso (produção mostra Postgres/Redis/Qdrant/BullMQ, que só existem no compose enterprise) |
| `docker-compose.enterprise.yml` | imagem do api | monta `./src:/app/src:ro` e 4 arquivos `public/*.js` do host por cima da imagem → **o código em execução é o checkout do host, não a imagem** |