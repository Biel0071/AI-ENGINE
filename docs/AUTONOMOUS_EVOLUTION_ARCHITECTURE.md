# AUTONOMOUS EVOLUTION ARCHITECTURE (FÊNIX OS V6)

**Status:** HOMOLOGADO E OPERACIONAL (24/7)
**Fonte Canônica:** `ai-engine/grg/src/evolution/fenix-autonomous-loop.js`, `ai-engine/grg/src/evolution/autonomous-mission-queue.js`, `ai-engine/grg/src/services/rea-intelligence-engine.js`

---

## 1. Visão Geral

O **Fênix Autonomous Evolution Engine (V6)** transforma o FÊNIX OS em um sistema operacional de engenharia contínua que:
1. Observa o próprio ecossistema e os 44 projetos cadastrados no `ProjectKernel`.
2. Detecta problemas reais de código, UI, runtime, testes, segurança e persistência.
3. Prioriza melhorias por impacto, urgência, risco e orçamento (`P0` a `P7`) com deduplicação por `problemHash` (SHA-256).
4. Roteia tarefas de forma coordenada entre os **três canais de execução** (`API Platform — VPS`, `Antigravity` e `Codex`), respeitando a disponibilidade real de cada ambiente.
5. Executa testes automatizados reais (`exitCode === 0`) e exige revisão independente (`validatorAgentId !== authorAgentId`) antes de homologar qualquer entrega.

---

## 2. Os 12 Subsistemas V6 Operacionais

| # | Subsistema | Implementação Canônica | Função Operacional |
|---|---|---|---|
| 1 | `EvolutionScheduler` | `FenixAutonomousLoop.getSchedulesStatus()` / `EvolutionScheduler` | Executa as 3 cadências configuráveis (Saúde 5m, Qualidade 30m, Evolução 2h) com throttling por carga. |
| 2 | `ProjectObserver` | `FenixAutonomousLoop._buildProjectContext()` + `ReaIntelligenceEngine` | Monitora os 44 projetos cadastrados no `ProjectKernel`, portas, rotas, logs e árvore de arquivos. |
| 3 | `CodeQualityScanner` | `FenixAutonomousLoop.runProactiveScan()` | Detecta erros de sintaxe, acoplamento, handlers ausentes e violações de contrato. |
| 4 | `VisualQualityScanner` | `frontend-honesty.test.js` (19 invariantes) + `city-world-sync.test.js` (15 invariantes) | Audita DOM real, ausência de mocks, alinhamento de HUD e sincronia 2.5D/3D. |
| 5 | `RuntimeHealthMonitor` | `FenixAutonomousLoop._checkSystemOverload()` + `StorageManager` | Monitora CPU, RAM, filas, SSE e estado dos drivers PostgreSQL, Redis e Qdrant. |
| 6 | `ImprovementBacklog` | `AutonomousMissionQueue` (`memory/AUTONOMOUS_EVOLUTION_QUEUE.json`) | Fila persistida em disco com recuperação automática pós-cold-restart sem duplicação. |
| 7 | `MissionPrioritizer` | `AutonomousMissionQueue.enqueue()` / `prioritizeMission()` | Ordena missões de `P0` (produção parada) a `P7` (novas capacidades). |
| 8 | `ProviderExecutionRouter` | `FenixAutonomousLoop.routeToProvider()` + `ReaIntelligenceEngine.dispatchUniversalAdapterTask()` | Roteia entre `api-platform-vps`, `antigravity` e `codex` com probe real e failover automático. |
| 9 | `SharedMissionContract` | `AutonomousMissionQueue.toSharedMissionContract()` / `handoffMissionProvider()` | Contrato canônico de 19 campos compartilhado entre ambientes sem perda de contexto ou locks. |
| 10 | `EvolutionEvidenceRegistry` | `FenixAutonomousLoop._evidenceRegistry` + `EvolutionMemory` | Armazena hashes SHA-256 antes/depois, saídas de testes, screenshots e diffs auditáveis. |
| 11 | `RegressionMonitor` | `FenixAutonomousLoop._bugFingerprints` + suíte obrigatória de testes | Impede regressão de bugs já verificados (`VERIFIED`) e aciona rollback automático se testes falharem. |
| 12 | `ResourceBudgetController` | `FenixAutonomousLoop._budget` (`providerUsage` + `projectUsage`) | Controla limites de tokens, custo USD e chamadas por ciclo, projeto e provider. |

---

## 3. Três Cadências Configuráveis e Controle de Sobrecarga

- **Saúde (`health` — padrão: a cada 5 minutos / `300.000 ms`)**: Verifica APIs, filas, workers, erros e recursos de host (`POST /api/v2/autonomous/v6/cadence` com `{"cadenceId":"health"}`).
- **Qualidade (`quality` — padrão: a cada 30 minutos / `1.800.000 ms`)**: Verifica bugs abertos, testes automatizados, regressões e integridade de interfaces (`{"cadenceId":"quality"}`).
- **Evolução (`evolution` — padrão: a cada 2 horas / `7.200.000 ms`)**: Executa missões priorizadas e melhorias aprovadas (`{"cadenceId":"evolution"}`).
- **Throttling Automático**: Quando `RuntimeHealthMonitor` detecta sobrecarga (`memUsageRatio > 0.94` ou `cpuLoadRatio > 0.92` ou `externalApiPaused === true`), o intervalo efetivo das cadências é dobrado automaticamente (`effectiveIntervalMs = intervalMs * 2`).
