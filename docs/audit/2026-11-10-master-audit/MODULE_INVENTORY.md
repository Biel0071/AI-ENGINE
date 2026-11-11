# MODULE_INVENTORY — FÊNIX OS

Data: 2026-11-10. Métricas obtidas com `find`/`wc` no repositório `ai-engine`.

## 1. Tamanho

| Área | Valor |
|---|---|
| Backend `grg/src` | 552 arquivos `.js`, **122.111 linhas**, 90 diretórios de topo |
| Frontend `grg/public` | 83 `.js` + 53 `.css`; `index.html` 8.474 linhas; maiores: `fenix-world-3d.js` 12.968, `iso-city.js` 8.365, `project-hub-live.js` 7.685, `fenix-mascot-sidebar.js` 6.733 |
| Rotas | 34 arquivos em `src/api` (24 importados por `server.js` + 7 via `universal-system-routes`) + ~338 comparações inline em `server.js` |
| Testes | 476 `*.test.js` (1.879 casos) |
| Repositório git | 5.937 arquivos versionados, ~460 MB no HEAD, pack 634 MiB; 752 commits |
| Árvore de trabalho | **707 entradas sujas** (657 não rastreadas, 42 modificadas) |

## 2. Maiores subsistemas do backend (linhas)

| Diretório | Linhas | Observação |
|---|---|---|
| `api/` | 17.894 | `universal-system-routes.js` concentra 113 handlers, só 14 com `authorize` |
| `evolution/` | 11.668 | `fenix-autonomous-loop.js` 3.152 linhas |
| `services/` | 8.201 | |
| `reconstruction/` | 4.168 | métricas aleatórias em `dynamic-workforce.js` |
| `execution/` | 3.973 | contém o 2º sistema de filas (`job-queue-manager.js`, `fenix-worker.js`) |
| `world-model/` | 3.726 | WorldSimulation (outro produtor de estado da cidade) |
| `projects/` | 3.250 | registro estático + ProjectKernel |
| `product/` | 3.091 | |
| `runtime/` | 2.722 | JobEngine, worker, LivingRuntime |
| `memory/` | 2.492 | embeddings por hash |
| `kernel/` | 2.347 | stores |
| `ai-runtime/` | 2.244 | **caminho de IA canônico** |

## 3. Diretórios mortos ou órfãos

| Diretório | Situação | Evidência |
|---|---|---|
| `air/`, `clients/`, `context/`, `utils/`, `watch/` | nenhum `require` externo | varredura de `require` relativos |
| `models/`, `queue/` | vazios (0 `.js`) | `find` |
| `cognition/`, `cli/`, `infrastructure/ai-gateway` | só alcançados por `runtime/daemon.js`, que nada inicia | — |
| `automation/`, `compiler/`, `connections/`, `mind/`, `vision/`, `voice/` | sem teste e sem ligação em `app.js` | [HIPÓTESE: mortos; `mind/` é usado por `product-experience-routes`] |
| `software-factory/visual-engine.js` | nenhum consumidor | — |
| `api/cloud-routes.js` | nenhum consumidor | — |

**Todos** ainda são carregados no boot pelo scan do Kernel (`core/Kernel.js:135`).

## 4. Duplicações

### 4.1 Sistemas paralelos

| Função | Implementações concorrentes |
|---|---|
| Fila de jobs | `runtime/job-engine.js` (canônico) × `execution/job-queue-manager.js` + `execution/fenix-worker.js` |
| Roteamento de modelos | 8 (ver AI_INFRASTRUCTURE_AUDIT §3) |
| Registro de projetos | `projects/project-registry.js` (array fixo) × `projects/project-kernel.js` × `core/Registries.ProjectRegistry` (vazio) × `workspaceManager.registerProject` × `KnowledgeEngine.projectStore` |
| Missões | `MissionKernel` × `knowledgeEngine.missionStore` |
| Memória | `MemoryEngine` × `CognitiveMemoryEngine` × `EngineeringMemory` × `KnowledgeGenome` × `KnowledgeEngine` |
| Padrões | `PatternLibrary` (3 instâncias) × `KnowledgeEngine.patternStore` |
| Estado da cidade | `AICityProjection` × `NpcCityEngine` × `CityLiveBridge` × `living-city-routes` × `WorldSimulation` × `DigitalTwin` |
| Loop autônomo | instância do servidor × instâncias por rota × `getGlobalAutonomousLoop()` |
| Renderizador da cidade (frontend) | `fenix-world-3d.js` (ativo) × `iso-city.js` (fallback) × `unified-app.js:1494 initCityCanvas` (morto) × `pixi-*` (6 arquivos órfãos) × `fenix-world-engine.js` (órfão) |
| Roteador do frontend | inline em `index.html` (ativo) × `unified-app.js:145` × 2º roteador dormente em `fenix-core-controller.js:969-1039` |

### 4.2 Endpoints sombreados (a 1ª correspondência vence)

| Endpoint | Vence | Inalcançável |
|---|---|---|
| `GET /api/me` | `server.js:624` | `server.js:853` |
| `GET /api/system/boot-status` | `server.js:241` | `server.js:1416` |
| `GET /api/missions` | `api/product-api-routes.js:70` | `knowledge/knowledge-routes.js:107` |
| `GET /api/evolution` | `api/product-api-routes.js:202` | `server.js:1422` |
| `GET /api/v2/knowledge` | `api/observatory-routes.js:135` | `api/universal-system-routes.js:1532` |
| `GET /api/v2/projects` | `api/universal-system-routes.js:1299` | `api/product-experience-routes.js:362` |
| `/api/workers`, `/api/jobs` | `api/universal-job-routes.js:405`, `server.js:969` | `missions/mission-routes.js:64,87` |
| `POST /api/v2/jobs`, `GET /api/v2/providers` | `universal-job-routes.js:305`, `universal-system-routes.js:795` | `api/conversation-routes.js:1686,1819` |
| `/api/providers` | `missions/mission-routes.js:75` | `knowledge/knowledge-routes.js:29` |

## 5. Higiene do repositório

| Item | Quantidade |
|---|---|
| Arquivos > 1 MB versionados | 35 (inclui `grg/node-v20.11.1-win-x64/node.exe` 66,8 MB, `vps-active-source.tar.gz` 50,3 MB, `graphify-out/graph.json` 28,5 MB) |
| Arquivos compactados versionados | 16 (`.tar.gz`, `.tgz`, `.tar`) |
| PNG/JPG versionados | 822 (~196 MB) |
| Scripts ad-hoc `patch*/scratch_*/fix*` na raiz de `ai-engine/` | 44 (versionados) |
| Scripts ad-hoc na raiz de `grg/` | 51 |
| Scripts ad-hoc em `C:\projetos\ai-engine-core` (fora do git) | 10+ |
| Markdown versionados | 412 (≥41 "REPORT/CERTIFICATION" nas raízes) |
| Arquivos com nomes acidentais | `{`, `'users'`, `'users')`, `,` |
| Logs versionados | 3 (`grg/server.log.err`, `real_server_log.txt`, `server_crash_log.txt`) |
| `.dockerignore` | **ausente** (`Dockerfile.backend` faz `COPY . .`) |
| `grg/.data/` | 71 `.tmp` órfãos, 1 `.corrupt`, 38 `factory-worker-<PID>.json` |