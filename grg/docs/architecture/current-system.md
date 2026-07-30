# FÊNIX — Sistema Atual (medido)

> Documento de **medição**, não de intenção. Cada número aqui foi obtido executando o sistema
> em 2026-07-29, não lendo a documentação. Onde não houve medição, está escrito "não medido".
> Método: `createApp()` real + `simulationAudit.audit()` (o auditor do próprio projeto) +
> consultas ao Postgres de produção na VPS `.22`.

## 1. Números

| Dimensão | Medido |
|---|---|
| Módulos JS em `src/` | 171 |
| Linhas em `src/` | 16.532 |
| Domínios (pastas de `src/`) | 47 |
| Serviços wired em `createApp()` | 143 |
| Coleções no store | 143 |
| Versão do schema | 33 |
| Rotas HTTP | 244 (97 GET, 103 POST + variantes) |
| Arquivos de teste | 78 |
| Dependências de produção | 5 diretas (`pg`, `redis`, `bullmq`, `jose`, `@aws-sdk/client-s3`), 41 instaladas |
| Markdown na raiz | 40+ (144 no repo) |

O sistema **não é um esqueleto**. É grande, está wired e roda em produção. O problema não é
ausência de código — é que parte dele não faz o que o nome promete.

## 2. Classificação por medição (auditor do projeto)

`app.simulationAudit.audit()` classificou os 48 módulos. Total: **193 sinais falsos**.

| Classificação | Módulos | Leitura |
|---|---|---|
| `production` | **0** | nenhum módulo atinge o nível mais alto |
| `implemented` | 13 | núcleo limpo, sem sinal falso |
| `partial` | 22 | funcional com lacunas |
| `stub` | 0 | — |
| `simulated` | 13 | **187 dos 193 sinais falsos** |

### Os 13 simulados (onde está a dívida)

| Módulo | Sinais | Arqs |
|---|---|---|
| `omega-infinity` | 33 | 6 |
| `omega` | 30 | 9 |
| `onedeploy` | 26 | 4 |
| `operations` | 19 | 6 |
| `keos` | 18 | 4 |
| `cognitive` | 9 | 11 |
| `performance` | 9 | 1 |
| `uios` | 9 | 4 |
| `nexus` | 8 | 4 |
| `scos` | 7 | 4 |
| `workspace` | 5 | 3 |
| `plugins` | 4 | 1 |
| `agents` | 0 | 2 |

Padrão: **as camadas "cognitivas" de cima são as simuladas** (`omega`, `omega-infinity`,
`keos`, `uios`, `scos`, `nexus`, `performance`). Os sinais são `hardcoded-score`,
`hardcoded-percent-string`, `hardcoded-verdict`, `hardcoded-confidence`, `hardcoded-delta` —
isto é, **números de inteligência escritos à mão**.

### Os 13 limpos (o núcleo)

`missions`, `kernel`, `control-plane`, `knowledge-graph`, `memory`, `versioning`,
`digital-twin`, `discovery`, `inspection`, `capabilities`, `evolution`, `app-factory`,
`product`, `research`, `workforce`.

## 3. Capacidades testadas por execução

Critério: **REAL só com evidência de tarefa concluída.** "A rota existe" não conta.

| # | Capacidade | Veredito | Evidência medida |
|---|---|---|---|
| 1 | Missão ponta a ponta | **REAL** | `PLANNED → SUCCEEDED` em 16 s sem chamada externa; trilha `mission.created → started → step.dispatched → step.completed → completed`; job `discovery.scan SUCCEEDED` |
| 2 | Governança RED | **REAL** | passo `generate` parou em `AWAITING_APPROVAL`, `approvalId` presente, `jobId: null` |
| 3 | Memória | **REAL** | `remember` + `query` devolveu 1; persistiu 1 memória + 1 versão; `history()` retorna |
| 4 | Knowledge Graph | **REAL** | `upsertEntity` ×2 + `relate` + `shortestPath` devolveu caminho com 2 nós |
| 5 | Agent swarm | **REAL** | 15 especialistas registrados (architect, backend, frontend, ux, qa, devops, db, security, docs, obs, ai, memory, knowledge, twin, planner) |
| 6 | Connectors | **REAL** | 2 registrados (`github`, `ai:echo`); estado **derivado** (`CONFIGURED`, `source: derived:authenticate + selfTest`), não literal |
| 7 | Fila / worker | **REAL** | worker em produção, 0 erros e 0 conflitos em janela limpa de 7 min |
| 8 | Factory targets | **REAL** | 8 targets |
| 9 | Sandbox (recusa) | **REAL** | recusou `scriptId` não autorizado: `authorized script not found` |
| 10 | **Busca web** | **FABRICA** | devolveu **2 resultados** para `zzqx-termo-que-nao-existe-9271`. Sem HTTP. É a única capacidade que **mente ativamente** |
| 11 | **Execução de comando** | **SCAFFOLD** | `scripts.register` existe, allowlist com **0 scripts** → nada a executar |
| 12 | **Tool registry** | **SCAFFOLD** | `tools.register` existe, **0 tools** registradas |
| 13 | **Agentes cognitivos** | **SCAFFOLD** | 15 especialistas no swarm, mas **0 `cognitiveAgents`** no store; `agentEcosystem.cycle()` falha com `cognitive agent not found: undefined` |
| 14 | LLM | **CONDICIONAL** | `app.llm` é `null` sem chave (correto: não fabrica); em produção o gateway está wired com aiplatform |
| 15 | Auto-melhoria | **NÃO EXISTE** | sem gerador/aplicador de diff |

## 4. Arquitetura efetiva

```
Navegador (public/index.html, 7117 bytes)
   │  HTTPS  fenix.209-50-241-22.sslip.io
   ▼
openresty (Docker root)  ──TLS──►  api :4400 (Docker rootless, usuário fenix)
                                     │
                    ┌────────────────┼────────────────┬──────────────┐
                    ▼                ▼                ▼              ▼
              Postgres 17.9      Redis (lease,    Qdrant        MinIO (S3)
              fenix.kernel_state  bullmq)        (vetor)
              DOCUMENTO ÚNICO
                    ▲
                    │
              worker (node src/runtime/worker.js)
                 ciclo: lease de líder → schedules → reconcile de missões
                        → recoverStale → runBatch
```

**Fato estrutural que domina tudo:** o estado é **um único documento jsonb**
(`fenix.kernel_state`, `state_key='global'`). Toda escrita reserializa o documento inteiro sob
`ISOLATION LEVEL SERIALIZABLE`. Medido: doc 5,4 MB → `update()` no-op **~0,9 s**; doc 607 kB →
**~430 ms**. **Um evento publicado custa 8 escritas** (event store + digital twin + ai-city +
global-version + audit + eventos derivados que reentram).

Consequência medida: com ~61 escritas/min a API sozinha saturava o store, e jobs morriam com
`40001` e `worker heartbeat expired` — **por não conseguirem escrever**, não por defeito próprio.

## 5. Fluxos reais

**Comando → execução (provado):**
```
chat.speak() → detectIntent (determinístico; 'help' é o default) → facts do store
   → missions.create() [PLANNED, steps do catálogo governado]
   → worker (líder) → missions.reconcile({autoStart}) → missions.start()
   → #dispatchReady → policyLevel RED? ─sim→ AWAITING_APPROVAL (para aqui)
                                       └─não→ jobs.submit()
   → jobs.runBatch() → handler → runtime.job.succeeded
   → missions.projectJobEvent() → progresso → #finalize → SUCCEEDED
```

**Evento → projeções (o custo):**
```
fabricEvents.publish() → eventStore.append() [1 escrita]
   → emit(tipo) + emit('fabric.event')
        ├─ aiCityProjection.apply()      [1 escrita] → emit('city.updated')      ─┐
        ├─ globalVersionEngine.record()  [1 escrita] → emit('version.recorded')  ─┤ reentram
        ├─ digitalTwin.projectOperational() [1 escrita]                           ─┘
        └─ auditTrail (bus '*')          [1 escrita]
   TOTAL MEDIDO: 8 escritas por evento
```

## 6. Catálogo governado de passos de missão

`MISSION_STEP_CATALOG` (`src/missions/mission-kernel.js:7`) — missão **não aceita objetivo
livre**: exige `steps[]` (1–50) de tipos catalogados.

| Tipo | Job | Nível |
|---|---|---|
| `discover`, `inspect`, `analyze`, `agent-observe`, `activate`, `daily-intelligence` | vários | GREEN |
| `validate` | `sandbox.execute` | YELLOW |
| `generate`, `orchestrate` | `factory.generate`, `project.orchestrate` | **RED (aprovação humana)** |

## 7. Segurança

- Produção: **Keycloak OIDC apenas.** `/api/login` responde `local password login is disabled`;
  dev headers desligados (`auth.js:141`).
- Secrets por arquivo montado (`/run/secrets/*`), nunca no store — `assertNoSecrets()` bloqueia
  payload de evento e saída de probe (existe caminho `SECRET_OUTPUT_REJECTED` medido).
- Containers: `read_only`, `cap_drop: ALL`, `no-new-privileges`, tmpfs em `/tmp`.
- Trilha de auditoria com `hash`/`previousHash` (encadeada) e `verify()`.

## 8. Observabilidade

Existe: `/health` com checks por componente derivados (`security-plane`, `state-store`,
`redis`, `queue`, `object-storage`, `ai-providers`), Prometheus no compose, `metrics.render()`,
`auditEvents`, `domainEvents`, `livingRuntimeTicks`, `workerHeartbeats`.

Falta: tracing distribuído, alertas acionáveis, e um sink externo de log — hoje **o histórico
mora no documento de estado**, o que encarece toda escrita (ver `technical-debt.md`).

## 9. Deploy

`docker-compose.enterprise.yml`: 8 serviços (api, worker, postgres, redis, qdrant, minio,
prometheus, keycloak) + 2 redes. Rollback em uma linha via `FENIX_VERSION` comentado no
`.env.production`. Versão em produção no fim desta medição: **rc.18**.

**Armadilha medida:** o bloco `environment` do compose é uma **allowlist** — variável no
`.env.production` não chega ao container se não estiver listada. `FENIX_MISSION_AUTOSTART=1`
ficou inerte por isso, com o deploy reportando sucesso.

## 10. O que não foi medido

- Frontend: `public/index.html` (7117 bytes) + `app.js`. Não há framework, rotas SPA, design
  system ou store de estado — é uma página única. **Não medido**: comportamento em mobile.
- Mobile/Flutter: não existe no repo.
- Kubernetes: não existe (só Compose).
- Testes: 78 arquivos, 73 passam, **5 falham em `main`** (pré-existentes, não regressão):
  `chat`, `cognitive-council-voting`, `keos-uios-coverage`, `omega-infinity-coverage`,
  `v61-operation-genesis`.
