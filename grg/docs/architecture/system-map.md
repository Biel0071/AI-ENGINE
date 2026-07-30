# FÊNIX — Mapa do Sistema

> Mapa dos 47 domínios de `src/`, com a classificação **medida** pelo auditor do projeto
> (2026-07-29) e a responsabilidade real de cada um. `sim.` = classificação do
> `simulationAudit`. Sinais = sinais falsos detectados.

## Legenda

- **impl** = `implemented`, 0 sinal falso
- **part** = `partial`, funcional com lacunas
- **SIM** = `simulated`, tem número de inteligência escrito à mão
- Serviço = nome em `app.*` (o que o resto do sistema consegue chamar)

---

## Núcleo (o que sustenta tudo)

| Pasta | sim. | Serviço | Responsabilidade |
|---|---|---|---|
| `kernel/` | part | `store` | Estado. Documento único, migrações (schema 33), retenção, ids, erros, medição (`measured()`/`unknown()`) |
| `control-plane/` | impl | `controlPlane` | Tenant, org, customer, membership, **authorize()** — todo serviço passa por aqui |
| `eventing/` | part | `eventStore`, `fabricEvents` | Event store append-only + barramento. `assertNoSecrets()` |
| `runtime/` | part | `jobs`, `registry`, `health` | Fila real (`submit/runBatch/recoverStale/schedule/tick`), worker, lease de líder, living-runtime |
| `infrastructure/` | part | `redis`, `objects`, `vectorStore` | Adaptadores: Postgres, Redis, S3/MinIO, Qdrant, resiliência (retry), config |
| `security/` | part | `security`, `policy`, `gatekeeper` | Autenticação, política, PRODUCTION_LOCK |
| `auth/` | part | `auth` | OIDC/Keycloak, sessão, `contextFrom` |

## Execução de trabalho

| Pasta | sim. | Serviço | Responsabilidade |
|---|---|---|---|
| `missions/` | **impl** | `missions`, `missionPlanner`, `missionCompiler`, `missionArtifacts` | Missão como DAG governado. `create/start/reconcile/approveStep`. Catálogo com nível GREEN/YELLOW/RED |
| `execution/` | part | `tools`, `scripts`, `sandbox` | Registro de ferramenta, allowlist de script assinado, execução em sandbox. **Allowlists vazias** |
| `executive/` | part | `executiveBrain` | Programa → missões, decomposição, priorização, custo, replanejamento |
| `orchestrator/` | part | `orchestrator` | `buildFromPrompt` |
| `workforce/` | impl | `workforce` | Employees/templates por nicho |
| `agents/` | SIM (0 sinais) | `agentSwarm`, `agentEcosystem` | **15 especialistas** registrados; ecossistema de task cognitiva (**0 agentes cognitivos no store**) |

## Conhecimento e memória

| Pasta | sim. | Serviço | Responsabilidade |
|---|---|---|---|
| `memory/` | part | `memory`, `knowledgeGenome` | Memória versionada com escopo e provenance, TTL, consolidação, embedding local. **REAL, medido** |
| `knowledge-graph/` | **impl** | `knowledgeGraph` | Entidades, relações, `shortestPath`, `neighborhood`, `impact`, `anomalies`. **REAL, medido** |
| `federation/` | part | `federation`, `brainFederation` | Publicação/fusão de conhecimento entre domínios |
| `research/` | impl | `researchSource`, `autonomousResearch` | Fonte externa com allowlist e cache (desligada por padrão) |
| `cognitive/` | **SIM** (9) | `cognitiveCore`, `cognitiveCouncil`, `hypothesisEngine`, +8 | Ciclo cognitivo, hipóteses, conselho, marketplace, otimização, presença |
| `discovery/` | impl | `discovery` | Classificação e spec de recurso descoberto |
| `discovery-network/` | part | `discoveryNetwork` | Varredura de inventário |

## Repositório e fábrica

| Pasta | sim. | Serviço | Responsabilidade |
|---|---|---|---|
| `repo-intel/` | part (4) | `repoIntel`, `github`, `githubOps` | Clone real, análise, snapshot com `fileCount`/`revision`, PR/issue/branch no GitHub |
| `inspection/` | impl | `inspection` | Inspeção de projeto, propostas, twin |
| `software-factory/` | part | `factory` | `discover/plan/generate/listProjects` |
| `app-factory/` | impl | `appFactory` | 8 build targets |
| `product/` | impl | `product` | White label, design system, plano, assinatura, invoice, módulos |
| `connectors/` | part | `connectors` | Runtime de conector com **estado derivado** (12 métodos de contrato). `github` + `ai:echo` |

## IA

| Pasta | sim. | Serviço | Responsabilidade |
|---|---|---|---|
| `ai-runtime/` | part | `aiGateway`, `aiRouter`, `llm`, `modelOrchestrator`, `modelEconomy` | Gateway com breaker/budget/cache/telemetria, roteamento por evidência, catálogo de modelo. `llm` é `null` sem chave (não fabrica) |
| `chat/` | part (2) | `chat`, `conversations` | Roteador de intenção determinístico + LLM, fatos do store, histórico, preferências |

## Operação

| Pasta | sim. | Serviço | Responsabilidade |
|---|---|---|---|
| `operations/` | **SIM** (19) | `operationalActivation` | Varredura de 26 componentes, readiness, investigação, daily intelligence, stability |
| `governance/` | part | `readinessMatrix`, `simulationAudit`, `productionReadiness`, `assistedMode` | **O auditor que produziu este mapa.** Matriz de prontidão, gate de produção |
| `ops/` | part (8) | `vpsOps`, `backup` | Plano de operação em VPS, backup/restore/verify |
| `onedeploy/` | **SIM** (26) | `oneDeploy`, `deployer`, `deployCenter` | Pipeline de deploy, rollback |
| `performance/` | **SIM** (9) | `cognitivePerformance` | Hot memory, pacing, speed score, prefetch |
| `versioning/` | impl | `versionEngine` | Versão por recurso, diff, changeset, proposta de rollback |
| `evolution/` | impl | `evolution` | Padrões, insights, propostas de evolução |
| `digital-twin/` | impl | `digitalTwin` | Gêmeo operacional, conselho |
| `ai-city/` | part | `aiCity` | Projeção espacial do sistema (nós/arestas por evento) |
| `fabric/` | part | `fabric` | Enrollment de serviço no tecido |

## Camadas cognitivas superiores (onde está a dívida)

| Pasta | sim. | Serviço | Observação |
|---|---|---|---|
| `omega-infinity/` | **SIM (33)** | `cognitiveLaws`, `metaConsciousness`, `livingPhysics`, `selfEvolutionKernel`, `cognitiveDnaCompiler` | Maior concentração de `hardcoded-score`/`hardcoded-verdict` do repo |
| `omega/` | **SIM (30)** | `masterNode`, `recursiveIntelligence`, `collectiveIntelligence`, `cognitiveAtomsFabric`, +5 | 9 arquivos, 30 sinais |
| `keos/` | **SIM (18)** | `kos`, `expandedConstitutionIndex`, `cognitiveEncryption` | Constituição/índice semântico |
| `uios/` | **SIM (9)** | `masterAvatar`, `adminAvatar`, `npcCity` | Camada de avatar/UI |
| `scos/` | **SIM (7)** | `eca`, `companyDailyAnalysis`, `humanDigitalTwin` | Briefing, inbox, autopilot |
| `nexus/` | **SIM (8)** | `nexusTimeline`, `ucc`, `ucp`, `contextExpansion` | Timeline e canal cognitivo |
| `workspace/` | **SIM (5)** | `workspaceModes`, `crossProjectLearning`, `creationEvolution` | Modos de workspace |
| `plugins/` | **SIM (4)** | `pluginSkills` | Marketplace de skill |

---

## Store: 143 coleções por família

| Família | Coleções (amostra) |
|---|---|
| Tenancy | `tenants orgs customers memberships users sessions domains licenses` |
| Missão | `missions missionSteps missionPlans missionEvents missionArtifacts missionBenchmarks missionPlaybooks missionSummaries missionContextRefs` |
| Runtime | `runtimeJobs runtimeSchedules deadLetters workerHeartbeats livingRuntimeTicks livingRuntimeLeases outbox idempotencyKeys` |
| Conhecimento | `knowledgeEntities knowledgeRelationships knowledgePublications knowledgePromotionProposals knowledgeSharingPolicies graphEdges` |
| Memória | `memories memoryEvents memoryVersions` |
| Cognitivo | `cognitiveAgents cognitiveAtoms cognitiveCycles cognitiveDecisions cognitiveEntities cognitiveEvents cognitiveGoals cognitiveHypotheses cognitiveObservations cognitiveReflections cognitiveValidations cognitiveWorkspaces cognitiveCursors cognitiveAccessGrants cognitiveMarketplaceItems` |
| Operação | `operationalActivationRuns operationalComponentHistory operationalComponentStates operationalInvestigations operationalReadinessReports operationalStabilityReports operationalTwins operationalAssurances` |
| Auditoria/evento | `auditEvents domainEvents executionTimeline` |
| Versionamento | `resourceVersions changeSets serviceVersions rollbackProposals migrationHistory schemaVersion` |
| Execução | `toolDefinitions scriptDefinitions scriptSigners sandboxExecutions` |
| Conector | `connectorRegistry connectorMetrics connectorEvents` |
| Cidade | `cityNodes cityEdges cityProjectionStates` |
| IA | `aiCalls aiCache aiRouterDecisions` |
| Produto | `subscriptions invoices plans designSystems brands moduleSets marketplaceInstalls` |
| Agentes | `agentTasks agentCycles agentSummaries employees employeeTemplates workforces` |

## Grafo de dependência (quem chama quem)

```
controlPlane.authorize()  ◄── TODOS os serviços (sem exceção medida)
store.update()            ◄── TODOS (documento único: é o gargalo compartilhado)
fabricEvents.publish()    ──► aiCity, versionEngine, digitalTwin, audit, capabilityRegistry,
                               cognitiveLearning, missions, agentEcosystem  (8 escritas)
jobs.runBatch()           ──► handlers registrados em app.js (missions, operations, cognitive,
                               agents, factory, sandbox, discovery)
missions.attach()         ◄── runtime.job.{succeeded,dead_letter,cancelled}
worker (líder)            ──► jobs.tick → missions.reconcile → jobs.recoverStale → runBatch
```
