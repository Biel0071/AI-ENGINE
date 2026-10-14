# PROJECT_GRAPH.md

Grafo FILE→MODULE→API/EVENT derivado do índice. Consultas: "quem usa este módulo?" → tabela CONSUMERS abaixo (fonte completa em output/graph.json).

- Nós (arquivos): 5155
- Arestas IMPORTS: 4776
- Endpoints expostos: 2581
- Referências quebradas: 896

## Arquivos mais consumidos (top 25)

| Arquivo | Consumidores |
|---|---|
| `grg/src/kernel/errors.js` | 115: `grg/src/agents/agent-job-assignment.js`, `grg/src/agents/agent-swarm.js`, `grg/src/agents/autonomous-agent-ecosystem.js`, `grg/src/ai-city/npc-city-engine.js`, `grg/src/ai-city/perception-engine.js`… |
| `archive/retired-frontends/vps_source/grg/src/kernel/errors.js` | 102: `archive/retired-frontends/vps_source/grg/src/agents/agent-swarm.js`, `archive/retired-frontends/vps_source/grg/src/agents/autonomous-agent-ecosystem.js`, `archive/retired-frontends/vps_source/grg/src/ai-city/npc-city-engine.js`, `archive/retired-frontends/vps_source/grg/src/ai-city/perception-engine.js`, `archive/retired-frontends/vps_source/grg/src/ai-runtime/ai-gateway.js`… |
| `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/kernel/errors.js` | 102: `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/agents/agent-swarm.js`, `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/agents/autonomous-agent-ecosystem.js`, `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/ai-city/npc-city-engine.js`, `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/ai-city/perception-engine.js`, `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/ai-runtime/ai-gateway.js`… |
| `grg/src/kernel/ids.js` | 97: `grg/src/agents/agent-swarm.js`, `grg/src/agents/agent-workspace-executor.js`, `grg/src/agents/autonomous-agent-ecosystem.js`, `grg/src/ai-city/perception-engine.js`, `grg/src/ai-runtime/ai-gateway.js`… |
| `archive/retired-frontends/grg_temp_backup/src/kernel/errors.js` | 96: `archive/retired-frontends/grg_temp_backup/src/agents/agent-swarm.js`, `archive/retired-frontends/grg_temp_backup/src/agents/autonomous-agent-ecosystem.js`, `archive/retired-frontends/grg_temp_backup/src/ai-city/npc-city-engine.js`, `archive/retired-frontends/grg_temp_backup/src/ai-city/perception-engine.js`, `archive/retired-frontends/grg_temp_backup/src/ai-runtime/ai-gateway.js`… |
| `archive/retired-frontends/grg_temp_backup2/src/kernel/errors.js` | 96: `archive/retired-frontends/grg_temp_backup2/src/agents/agent-swarm.js`, `archive/retired-frontends/grg_temp_backup2/src/agents/autonomous-agent-ecosystem.js`, `archive/retired-frontends/grg_temp_backup2/src/ai-city/npc-city-engine.js`, `archive/retired-frontends/grg_temp_backup2/src/ai-city/perception-engine.js`, `archive/retired-frontends/grg_temp_backup2/src/ai-runtime/ai-gateway.js`… |
| `archive/retired-frontends/vps_source/grg/src/kernel/ids.js` | 92: `archive/retired-frontends/vps_source/grg/src/agents/agent-swarm.js`, `archive/retired-frontends/vps_source/grg/src/agents/agent-workspace-executor.js`, `archive/retired-frontends/vps_source/grg/src/agents/autonomous-agent-ecosystem.js`, `archive/retired-frontends/vps_source/grg/src/ai-city/perception-engine.js`, `archive/retired-frontends/vps_source/grg/src/ai-runtime/ai-gateway.js`… |
| `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/kernel/ids.js` | 92: `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/agents/agent-swarm.js`, `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/agents/agent-workspace-executor.js`, `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/agents/autonomous-agent-ecosystem.js`, `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/ai-city/perception-engine.js`, `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/ai-runtime/ai-gateway.js`… |
| `archive/retired-frontends/grg_temp_backup/src/kernel/ids.js` | 86: `archive/retired-frontends/grg_temp_backup/src/agents/agent-swarm.js`, `archive/retired-frontends/grg_temp_backup/src/agents/autonomous-agent-ecosystem.js`, `archive/retired-frontends/grg_temp_backup/src/ai-city/perception-engine.js`, `archive/retired-frontends/grg_temp_backup/src/ai-runtime/ai-gateway.js`, `archive/retired-frontends/grg_temp_backup/src/app-factory/app-factory.js`… |
| `archive/retired-frontends/grg_temp_backup2/src/kernel/ids.js` | 86: `archive/retired-frontends/grg_temp_backup2/src/agents/agent-swarm.js`, `archive/retired-frontends/grg_temp_backup2/src/agents/autonomous-agent-ecosystem.js`, `archive/retired-frontends/grg_temp_backup2/src/ai-city/perception-engine.js`, `archive/retired-frontends/grg_temp_backup2/src/ai-runtime/ai-gateway.js`, `archive/retired-frontends/grg_temp_backup2/src/app-factory/app-factory.js`… |
| `grg/src/app.js` | 80: `grg/qa/run-persisted-repair-proof.js`, `grg/scripts/acoplar-multi.js`, `grg/scripts/acoplar-repo.js`, `grg/src/runtime/worker.js`, `grg/src/server.js`… |
| `grg/src/kernel/module.js` | 48: `grg/src/ai/token-economy-engine.js`, `grg/src/automation/computer-control-agent.js`, `grg/src/cli/runtime-console.js`, `grg/src/cognition/cognitive-bank.js`, `grg/src/cognition/digital-twin.js`… |
| `archive/retired-frontends/grg_temp_backup/src/kernel/module.js` | 46: `archive/retired-frontends/grg_temp_backup/src/ai/token-economy-engine.js`, `archive/retired-frontends/grg_temp_backup/src/automation/computer-control-agent.js`, `archive/retired-frontends/grg_temp_backup/src/cli/runtime-console.js`, `archive/retired-frontends/grg_temp_backup/src/cognition/cognitive-bank.js`, `archive/retired-frontends/grg_temp_backup/src/cognition/digital-twin.js`… |
| `archive/retired-frontends/grg_temp_backup2/src/kernel/module.js` | 46: `archive/retired-frontends/grg_temp_backup2/src/ai/token-economy-engine.js`, `archive/retired-frontends/grg_temp_backup2/src/automation/computer-control-agent.js`, `archive/retired-frontends/grg_temp_backup2/src/cli/runtime-console.js`, `archive/retired-frontends/grg_temp_backup2/src/cognition/cognitive-bank.js`, `archive/retired-frontends/grg_temp_backup2/src/cognition/digital-twin.js`… |
| `archive/retired-frontends/vps_source/grg/src/kernel/module.js` | 46: `archive/retired-frontends/vps_source/grg/src/ai/token-economy-engine.js`, `archive/retired-frontends/vps_source/grg/src/automation/computer-control-agent.js`, `archive/retired-frontends/vps_source/grg/src/cli/runtime-console.js`, `archive/retired-frontends/vps_source/grg/src/cognition/cognitive-bank.js`, `archive/retired-frontends/vps_source/grg/src/cognition/digital-twin.js`… |
| `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/kernel/module.js` | 46: `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/ai/token-economy-engine.js`, `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/automation/computer-control-agent.js`, `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/cli/runtime-console.js`, `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/cognition/cognitive-bank.js`, `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/cognition/digital-twin.js`… |
| `grg/src/kernel/store.js` | 38: `grg/check.js`, `grg/src/app.js`, `grg/src/infrastructure/database/postgres-store.js`, `grg/src/infrastructure/database/sqlite-store.js`, `grg/test/ai-gateway-enterprise.test.js`… |
| `grg/src/server.js` | 38: `grg/qa/city-runtime-job-flow-playwright.mjs`, `grg/qa/dynamic-agent-ui-playwright.mjs`, `grg/qa/project-ide-live-playwright.mjs`, `grg/qa/sidebar-conversation-continuity-playwright.mjs`, `grg/qa/system-analysis-server.cjs`… |
| `archive/retired-frontends/grg_temp_backup/src/kernel/states.js` | 37: `archive/retired-frontends/grg_temp_backup/src/ai/token-economy-engine.js`, `archive/retired-frontends/grg_temp_backup/src/automation/computer-control-agent.js`, `archive/retired-frontends/grg_temp_backup/src/cli/runtime-console.js`, `archive/retired-frontends/grg_temp_backup/src/cognition/cognitive-bank.js`, `archive/retired-frontends/grg_temp_backup/src/cognition/digital-twin.js`… |
| `archive/retired-frontends/grg_temp_backup2/src/kernel/states.js` | 37: `archive/retired-frontends/grg_temp_backup2/src/ai/token-economy-engine.js`, `archive/retired-frontends/grg_temp_backup2/src/automation/computer-control-agent.js`, `archive/retired-frontends/grg_temp_backup2/src/cli/runtime-console.js`, `archive/retired-frontends/grg_temp_backup2/src/cognition/cognitive-bank.js`, `archive/retired-frontends/grg_temp_backup2/src/cognition/digital-twin.js`… |
| `archive/retired-frontends/vps_source/grg/src/kernel/states.js` | 37: `archive/retired-frontends/vps_source/grg/src/ai/token-economy-engine.js`, `archive/retired-frontends/vps_source/grg/src/automation/computer-control-agent.js`, `archive/retired-frontends/vps_source/grg/src/cli/runtime-console.js`, `archive/retired-frontends/vps_source/grg/src/cognition/cognitive-bank.js`, `archive/retired-frontends/vps_source/grg/src/cognition/digital-twin.js`… |
| `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/kernel/states.js` | 37: `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/ai/token-economy-engine.js`, `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/automation/computer-control-agent.js`, `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/cli/runtime-console.js`, `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/cognition/cognitive-bank.js`, `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/cognition/digital-twin.js`… |
| `grg/src/kernel/states.js` | 37: `grg/src/ai/token-economy-engine.js`, `grg/src/automation/computer-control-agent.js`, `grg/src/cli/runtime-console.js`, `grg/src/cognition/cognitive-bank.js`, `grg/src/cognition/digital-twin.js`… |
| `grg/src/kernel/measurement.js` | 26: `grg/src/ai-runtime/ai-router.js`, `grg/src/ai-runtime/api-connection-manager.js`, `grg/src/cognitive/external-search.js`, `grg/src/company/company-brain.js`, `grg/src/connectors/ai-provider-adapter.js`… |
| `archive/retired-frontends/grg_temp_backup/src/kernel/measurement.js` | 24: `archive/retired-frontends/grg_temp_backup/src/ai-runtime/ai-router.js`, `archive/retired-frontends/grg_temp_backup/src/ai-runtime/api-connection-manager.js`, `archive/retired-frontends/grg_temp_backup/src/cognitive/external-search.js`, `archive/retired-frontends/grg_temp_backup/src/connectors/ai-provider-adapter.js`, `archive/retired-frontends/grg_temp_backup/src/connectors/connector-runtime.js`… |

## BROKEN REFERENCES (verificar antes de mover/apagar)

- archive/frontend/grg-apps-ai-city/src/App.tsx -> ./core/RuntimeClient
- archive/frontend/grg-apps-ai-city/src/App.tsx -> ./core/EventBus
- archive/frontend/grg-apps-ai-city/src/App.tsx -> ./districts/KnowledgeDistrict
- archive/frontend/grg-apps-ai-city/src/App.tsx -> ./districts/WorkersDistrict
- archive/frontend/grg-apps-ai-city/src/App.tsx -> ./districts/EvolutionDistrict
- archive/frontend/grg-apps-ai-city/src/App.tsx -> ./districts/DeveloperDistrict
- archive/frontend/grg-apps-ai-city/src/core/RuntimeClient.ts -> ./EventBus
- archive/frontend/grg-apps-ai-city/src/districts/DeveloperDistrict.tsx -> ../App
- archive/frontend/grg-apps-ai-city/src/districts/EvolutionDistrict.tsx -> ../App
- archive/frontend/grg-apps-ai-city/src/districts/KnowledgeDistrict.tsx -> ../App
- archive/frontend/grg-apps-ai-city/src/districts/WorkersDistrict.tsx -> ../App
- archive/retired-frontends/grg_temp_backup/src/compiler/prompt-compiler.js -> ./components/Dashboard
- archive/retired-frontends/grg_temp_backup/src/compiler/prompt-compiler.js -> ./components/${featureComponentName}
- archive/retired-frontends/grg_temp_backup/src/compiler/prompt-compiler.js -> ./App
- archive/retired-frontends/grg_temp_backup/src/infrastructure/node-registry.js -> ../../kernel/module
- archive/retired-frontends/grg_temp_backup/src/infrastructure/node-registry.js -> ../../kernel/states
- archive/retired-frontends/grg_temp_backup/src/operations/operational-components.js -> ../../package.json
- archive/retired-frontends/grg_temp_backup/src/research/web-research-agent.js -> ../../kernel/module
- archive/retired-frontends/grg_temp_backup/src/skills/learning-loop.js -> ../../kernel/module
- archive/retired-frontends/grg_temp_backup/src/software-factory/software-factory.js -> ./modules/${m}
- archive/retired-frontends/grg_temp_backup/src/software-factory/software-factory.js -> ../src/index
- archive/retired-frontends/grg_temp_backup/src/watch/fenix-watch.js -> ../../kernel/module
- archive/retired-frontends/grg_temp_backup2/src/compiler/prompt-compiler.js -> ./components/Dashboard
- archive/retired-frontends/grg_temp_backup2/src/compiler/prompt-compiler.js -> ./components/${featureComponentName}
- archive/retired-frontends/grg_temp_backup2/src/compiler/prompt-compiler.js -> ./App
- archive/retired-frontends/grg_temp_backup2/src/infrastructure/node-registry.js -> ../../kernel/module
- archive/retired-frontends/grg_temp_backup2/src/infrastructure/node-registry.js -> ../../kernel/states
- archive/retired-frontends/grg_temp_backup2/src/operations/operational-components.js -> ../../package.json
- archive/retired-frontends/grg_temp_backup2/src/research/web-research-agent.js -> ../../kernel/module
- archive/retired-frontends/grg_temp_backup2/src/skills/learning-loop.js -> ../../kernel/module
- archive/retired-frontends/grg_temp_backup2/src/software-factory/software-factory.js -> ./modules/${m}
- archive/retired-frontends/grg_temp_backup2/src/software-factory/software-factory.js -> ../src/index
- archive/retired-frontends/grg_temp_backup2/src/watch/fenix-watch.js -> ../../kernel/module
- archive/retired-frontends/scratch_frontend_evolution/candidate/public/fenix-v11-interactions.js -> ../services/authService
- archive/retired-frontends/scratch_frontend_evolution/candidate/public/fenix-v11-interactions.js -> ../services/jwt.service
- archive/retired-frontends/vps_source/grg/src/compiler/prompt-compiler.js -> ./components/Dashboard
- archive/retired-frontends/vps_source/grg/src/compiler/prompt-compiler.js -> ./components/${featureComponentName}
- archive/retired-frontends/vps_source/grg/src/compiler/prompt-compiler.js -> ./App
- archive/retired-frontends/vps_source/grg/src/infrastructure/node-registry.js -> ../../kernel/module
- archive/retired-frontends/vps_source/grg/src/infrastructure/node-registry.js -> ../../kernel/states
- archive/retired-frontends/vps_source/grg/src/operations/operational-components.js -> ../../package.json
- archive/retired-frontends/vps_source/grg/src/research/web-research-agent.js -> ../../kernel/module
- archive/retired-frontends/vps_source/grg/src/skills/learning-loop.js -> ../../kernel/module
- archive/retired-frontends/vps_source/grg/src/software-factory/software-factory.js -> ./modules/${m}
- archive/retired-frontends/vps_source/grg/src/software-factory/software-factory.js -> ../src/index
- archive/retired-frontends/vps_source/grg/src/watch/fenix-watch.js -> ../../kernel/module
- engine/agents/index.js -> ./analyzerAgent
- engine/agents/index.js -> ./plannerAgent
- engine/agents/index.js -> ./frontendAgent
- engine/agents/index.js -> ./backendAgent
