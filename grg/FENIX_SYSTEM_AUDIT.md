# FÊNIX Ω∞ — AUDITORIA DE SISTEMA

Gerado por leitura direta do repositório em `ai-engine/grg`. Nenhum número aqui é
declarado: cada um vem de um scan do código real (`tmp-audit.js`, descartado após a
geração) ou de um comando verificável indicado ao lado.

## 1. Números do repositório

| Métrica | Valor | Fonte |
|---|---|---|
| Arquivos JavaScript em `src/` | 161 | scan |
| Módulos de topo em `src/` | 46 | scan |
| Linhas de código em `src/` | 18.768 | scan de linhas |
| Arquivos de teste | 69 | scan `test/*.test.js` |
| Testes passando | 69/69 | `node --test test/` (~146 s) |
| Rotas HTTP | 192 (91 GET, 101 POST) | scan de `server.js` |
| Marcadores de dívida (TODO/FIXME/HACK) | 1 | scan |
| Módulos simulados/stub | 0 | `simulation-audit` |
| Sinais falsos (métrica inventada) | 0 | `simulation-audit` |
| Dependências de runtime | 5 (`pg`, `redis`, `bullmq`, `jose`, `@aws-sdk/client-s3`) | `package.json` |

O código é honesto por medição: zero módulos `simulated`, zero `stub`, zero sinais
falsos. Um único marcador de dívida em todo o `src/`. Isto **não** é um repositório em
ruínas que precisa de reescrita — é uma base madura com um problema de forma específico.

## 2. Camadas mapeadas

- **Backend / API**: 192 rotas em `src/server.js`, autorizadas por `controlPlane`.
- **Runtime permanente**: `src/runtime/living-runtime.js` — 11 loops, 6 serviços por role
  (worker, scheduler, living-runtime, research, observability, health), lease por role.
- **Workers / filas**: `bullmq` + `src/runtime/job-engine.js`; fila Redis obrigatória em produção.
- **Banco**: Postgres via `pg`; estado da aplicação é documento único JSON (schema v28),
  reserializado a cada escrita. Migrations em `src/infrastructure/database/migrations/`.
- **Frontend**: `public/` — 5 arquivos, 572 linhas. Painel único que atualiza a cada 5 s
  de endpoints reais. Polling, sem SSE/WebSocket.
- **Observabilidade**: `src/operations/observability-center.js` + exporter Prometheus.
- **Governança**: `readiness-matrix`, `gatekeeper` (PRODUCTION_LOCK), `production-readiness`,
  `simulation-audit` — todos derivam veredito de artefato, nenhum declara estado.
- **Docker / VPS**: `docker-compose.enterprise.yml` + override de logging; runbook de go-live.
- **Integrações**: apenas `repo-intel/github-connector.js`. Sem OAuth de saída.

## 3. Duplicação — o débito estrutural principal

Existem **oito superfícies cognitivas paralelas** que se sobrepõem conceitualmente:

| Módulo | Arquivos | Testado diretamente? |
|---|---|---|
| `omega` | 9 | não |
| `omega-infinity` | 6 | não |
| `cognitive` | 11 | parcial |
| `keos` | 4 | não |
| `nexus` | 4 | não |
| `uios` | 4 | não |
| `scos` | 4 | não |
| `memory` | 4 | sim |

`unified-cognitive-core`, `meta-consciousness`, `cognitive-core`,
`capability-operating-system` e `knowledge-operating-system` são cinco nomes para camadas
do mesmo conceito. **35 desses arquivos não têm teste direto** — são a maior concentração
de risco não coberto do repositório.

Consequência direta para qualquer plano de evolução: **"criar" um Living Runtime, Mission
Engine, Knowledge Graph, Memory Engine, Capability Registry ou Evolution Engine
adicionaria uma nona superfície** — os seis já existem (§4). O trabalho correto é
consolidar e cobrir, não recriar.

## 4. O que já existe (e não deve ser recriado)

| Organismo pedido | Já existe em |
|---|---|
| Living Runtime | `src/runtime/living-runtime.js` (11 loops) |
| Mission Engine | `src/missions/mission-kernel.js` + `mission-planner.js` |
| Knowledge Graph | `src/knowledge-graph/` + `src/memory/knowledge-genome.js` |
| Memory Engine | `src/memory/memory-engine.js` |
| Capability Registry | `src/capabilities/capability-registry.js` |
| Evolution Engine | `src/evolution/` + `src/omega-infinity/self-evolution-kernel.js` |
| Skill Engine | `src/plugins/plugin-skills-ecosystem.js` |
| Identidade permanente | `src/kernel/organism-identity.js` (**novo, esta sessão** — ainda não ligado ao app.js) |

## 5. Riscos e lacunas reais

1. **35 arquivos cognitivos sem teste direto** — regressão silenciosa possível nas 8 superfícies.
2. **Custo de escrita do store**: documento único reserializado a cada `update` — medido em
   8,74 MB / 1,5 s em produção. Retenção por bytes mitiga, mas coleções de alta escrita
   pertencem a sink externo.
3. **Sem CI/CD**: `.github/` está vazio. Comandos que assumem "executar pipeline de CI" não
   têm o pipeline.
4. **Sem OAuth de saída**: zero `oauth2|access_token|refresh_token|client_secret` em `src/`.
   Toda integração de terceiros (Meta, Google) é lacuna, não evolução.
5. **Sem transporte realtime**: painel é polling de 5 s.
6. **Chave de criptografia derivada de string literal** em `src/security/cognitive-encryption.js:9`
   — qualquer um com o repo tem a chave. Não usar esse módulo para credencial de tenant.
7. **Árvore git suja**: 118 arquivos modificados/novos de sprints anteriores. `git add .`
   empacotaria mudanças não revisadas.

## 6. Oportunidades (ordenadas por relação valor/risco)

1. **Cobrir as 8 superfícies com teste** antes de qualquer consolidação — rede de segurança primeiro.
2. **Ligar `organism-identity` ao boot** e persistir no schema — pequeno, fecha a Fase 2.
3. **Capability Contract por níveis** (planejado) — torna maturidade medível em vez de declarada.
4. **CI mínimo** (`node --test` em push) — o gate que os comandos assumem existir.
5. **Consolidar as superfícies cognitivas** — o maior ganho de simplicidade, mas o maior risco;
   só depois de (1).
