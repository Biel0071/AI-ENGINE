# PROJECT_GRAPH.md

Grafo FILE→MODULE→API/EVENT derivado do índice. Consultas: "quem usa este módulo?" → tabela CONSUMERS abaixo (fonte completa em output/graph.json).

- Nós (arquivos): 999
- Arestas IMPORTS: 674
- Endpoints expostos: 227
- Referências quebradas: 115

## Arquivos mais consumidos (top 25)

| Arquivo | Consumidores |
|---|---|
| `grg/src/kernel/errors.js` | 104: `grg/src/agents/agent-swarm.js`, `grg/src/agents/autonomous-agent-ecosystem.js`, `grg/src/ai-city/npc-city-engine.js`, `grg/src/ai-runtime/ai-gateway.js`, `grg/src/ai-runtime/model-orchestrator.js`… |
| `grg/src/kernel/ids.js` | 83: `grg/src/agents/agent-swarm.js`, `grg/src/agents/autonomous-agent-ecosystem.js`, `grg/src/ai-city/npc-city-engine.js`, `grg/src/ai-runtime/ai-gateway.js`, `grg/src/app-factory/app-factory.js`… |
| `grg/src/app.js` | 47: `grg/scripts/acoplar-multi.js`, `grg/scripts/acoplar-repo.js`, `grg/src/runtime/worker.js`, `grg/src/server.js`, `grg/test/ai-city.test.js`… |
| `grg/src/kernel/store.js` | 20: `grg/src/app.js`, `grg/src/infrastructure/database/postgres-store.js`, `grg/test/ai-gateway-enterprise.test.js`, `grg/test/ai-runtime.test.js`, `grg/test/cognitive-hierarchy.test.js`… |
| `grg/src/eventing/event-store.js` | 16: `grg/src/agents/autonomous-agent-ecosystem.js`, `grg/src/app.js`, `grg/src/capabilities/capability-registry.js`, `grg/src/cognitive/cognitive-core.js`, `grg/src/discovery-network/discovery-network.js`… |
| `grg/src/kernel/event-bus.js` | 13: `grg/src/app.js`, `grg/test/ai-gateway-enterprise.test.js`, `grg/test/ai-runtime.test.js`, `grg/test/cognitive-hierarchy.test.js`, `grg/test/cognitive-inspection.test.js`… |
| `grg/src/control-plane/control-plane.js` | 13: `grg/src/app.js`, `grg/test/ai-gateway-enterprise.test.js`, `grg/test/ai-runtime.test.js`, `grg/test/cognitive-hierarchy.test.js`, `grg/test/cognitive-inspection.test.js`… |
| `grg/src/repo-intel/ports.js` | 12: `grg/src/app.js`, `grg/test/chat-llm.test.js`, `grg/test/chat.test.js`, `grg/test/digital-twin.test.js`, `grg/test/discovery.test.js`… |
| `grg/src/kernel/measurement.js` | 10: `grg/src/ai-runtime/ai-router.js`, `grg/src/connectors/ai-provider-adapter.js`, `grg/src/connectors/connector-runtime.js`, `grg/src/connectors/github-connector-adapter.js`, `grg/src/executive/executive-brain.js`… |
| `grg/src/ai-runtime/providers.js` | 7: `grg/src/ai-runtime/ai-gateway.js`, `grg/src/ai-runtime/http-providers.js`, `grg/src/ai-runtime/provider-registry.js`, `grg/test/ai-runtime.test.js`, `grg/test/product.test.js`… |
| `grg/src/ai-runtime/ai-gateway.js` | 6: `grg/src/app.js`, `grg/test/ai-gateway-enterprise.test.js`, `grg/test/ai-runtime.test.js`, `grg/test/product.test.js`, `grg/test/runtime.test.js`… |
| `grg/src/security/config.js` | 6: `grg/src/app.js`, `grg/src/runtime/worker.js`, `grg/src/server.js`, `grg/test/cognitive-council-voting.test.js`, `grg/test/production-deploy.test.js`… |
| `grg/src/governance/approval-engine.js` | 5: `grg/src/app.js`, `grg/src/execution/sandbox-execution-engine.js`, `grg/src/execution/script-library.js`, `grg/src/inspection/inspection-report.js`, `grg/test/sandbox-execution.test.js` |
| `platform/src/services/control-plane.js` | 5: `platform/src/http/server-v2.js`, `platform/src/http/server.js`, `platform/src/index.js`, `platform/src/services/control-plane-v2.js`, `platform/test/control-plane.test.js` |
| `engine/projectScanner.js` | 4: `engine/intelligenceLayer.js`, `engine/tests/analyzer.test.js`, `engine/tests/diagnostics.test.js`, `engine/tests/scanner.test.js` |
| `grg/src/infrastructure/resilience/retry.js` | 4: `grg/src/ai-runtime/ai-gateway.js`, `grg/src/infrastructure/database/postgres-store.js`, `grg/src/research/source-client.js`, `grg/test/enterprise-foundation.test.js` |
| `grg/src/repo-intel/repository-intelligence.js` | 4: `grg/src/app.js`, `grg/test/product.test.js`, `grg/test/repo-intel.test.js`, `grg/test/software-factory.test.js` |
| `grg/src/software-factory/software-factory.js` | 4: `grg/src/app.js`, `grg/test/product.test.js`, `grg/test/runtime.test.js`, `grg/test/software-factory.test.js` |
| `grg/src/governance/simulation-audit.js` | 4: `grg/src/app.js`, `grg/src/governance/gatekeeper.js`, `grg/src/governance/readiness-matrix.js`, `grg/src/governance/readiness-matrix.js` |
| `grg/src/memory/memory-engine.js` | 4: `grg/src/app.js`, `grg/test/cognitive-hierarchy.test.js`, `grg/test/cognitive-inspection.test.js`, `grg/test/memory-engine.test.js` |
| `grg/src/operations/operational-activation.js` | 4: `grg/src/app.js`, `grg/src/operations/operational-components.js`, `grg/test/mission-planner-ga.test.js`, `grg/test/operational-activation.test.js` |
| `grg/src/connectors/connector-contract.js` | 4: `grg/src/connectors/ai-provider-adapter.js`, `grg/src/connectors/connector-runtime.js`, `grg/src/connectors/github-connector-adapter.js`, `grg/test/connector-runtime.test.js` |
| `grg/src/kernel/state-migrations.js` | 4: `grg/src/control-plane/control-plane.js`, `grg/src/infrastructure/database/postgres-store.js`, `grg/src/kernel/store.js`, `grg/test/enterprise-foundation.test.js` |
| `platform/src/store/json-store.js` | 4: `platform/src/index-v2.js`, `platform/src/index.js`, `platform/test/control-plane-v2.test.js`, `platform/test/control-plane.test.js` |
| `engine/architectureAnalyzer.js` | 3: `engine/intelligenceLayer.js`, `engine/tests/analyzer.test.js`, `engine/tests/diagnostics.test.js` |

## BROKEN REFERENCES (verificar antes de mover/apagar)

- engine/agents/index.js -> ./analyzerAgent
- engine/agents/index.js -> ./plannerAgent
- engine/agents/index.js -> ./frontendAgent
- engine/agents/index.js -> ./backendAgent
- engine/analyzer/index.js -> ../dev-engine/analyzer
- engine/analyzer/project-scanner.js -> ../project-scanner
- engine/analyzer/projectAnalyzer.js -> ../../src/api/project-analyzer
- engine/generators/codeGenerator.js -> ../../src/api/code-generator
- engine/generators/feature-generator.js -> ../../templates/stack/t3-base.template
- engine/generators/saas-generator.js -> ../dev-engine/saasGenerator
- engine/intelligenceLayer.js -> ../dist/core/engine
- engine/intelligenceLayer.js -> ../dist/memory/memory.store
- future/drafts/legacy-root/generated/billing-suite/backend/src/modules/billing-suite/billing-suite.controller.ts -> ./billing-suite.service
- future/drafts/legacy-root/generated/billing-suite/backend/src/modules/billing-suite/billing-suite.routes.ts -> ./billing-suite.controller
- future/drafts/legacy-root/generated/billing-suite/backend/src/modules/billing-suite/billing-suite.service.ts -> ./billing-suite.repository
- future/drafts/legacy-root/generated/billing-suite/frontend/src/modules/billing-suite/BillingSuiteModule.tsx -> ../../services/billing-suiteApi
- future/drafts/legacy-root/generated/billing-suite/frontend/src/pages/billing-suite/index.tsx -> ../../components/layout/AppSidebar
- future/drafts/legacy-root/generated/billing-suite/frontend/src/pages/billing-suite/index.tsx -> ../../components/layout/AppHeader
- future/drafts/legacy-root/generated/billing-suite/frontend/src/pages/billing-suite/index.tsx -> ../../components/ui/UiCard
- future/drafts/legacy-root/generated/billing-suite/frontend/src/pages/billing-suite/index.tsx -> ../../components/ui/UiDataTable
- future/drafts/legacy-root/generated/billing-suite/frontend/src/pages/billing-suite/index.tsx -> ../../components/forms/billing-suiteForm
- future/drafts/legacy-root/generated/billing-suite/frontend/src/services/billing-suiteApi.ts -> ../services/http/request
- future/drafts/legacy-root/generated/campaign_system/backend/src/app.ts -> ./modules/campaigns/campaign.routes
- future/drafts/legacy-root/generated/campaign_system/backend/src/app.ts -> ./shared/http/error-handler
- future/drafts/legacy-root/generated/campaign_system/backend/src/app.ts -> ./shared/http/not-found
- future/drafts/legacy-root/generated/campaign_system/backend/src/controllers/campaign.controller.ts -> ../services/campaign.service
- future/drafts/legacy-root/generated/campaign_system/backend/src/modules/campaigns/campaign.controller.ts -> ./campaign.service
- future/drafts/legacy-root/generated/campaign_system/backend/src/modules/campaigns/campaign.repository.ts -> ../../infra/database/prisma
- future/drafts/legacy-root/generated/campaign_system/backend/src/modules/campaigns/campaign.repository.ts -> ./campaign.dto
- future/drafts/legacy-root/generated/campaign_system/backend/src/modules/campaigns/campaign.routes.ts -> ./campaign.controller
- future/drafts/legacy-root/generated/campaign_system/backend/src/modules/campaigns/campaign.routes.ts -> ../../shared/http/asyncHandler
- future/drafts/legacy-root/generated/campaign_system/backend/src/modules/campaigns/campaign.service.ts -> ../../shared/errors/AppError
- future/drafts/legacy-root/generated/campaign_system/backend/src/modules/campaigns/campaign.service.ts -> ./campaign.repository
- future/drafts/legacy-root/generated/campaign_system/backend/src/modules/campaigns/campaign.service.ts -> ./campaign.dto
- future/drafts/legacy-root/generated/campaign_system/backend/src/repositories/campaign.repository.ts -> ../lib/prisma
- future/drafts/legacy-root/generated/campaign_system/backend/src/routes/campaign.routes.ts -> ../controllers/campaign.controller
- future/drafts/legacy-root/generated/campaign_system/backend/src/server.ts -> ./app
- future/drafts/legacy-root/generated/campaign_system/backend/src/server.ts -> ./config/env
- future/drafts/legacy-root/generated/campaign_system/backend/src/services/campaign.service.ts -> ../repositories/campaign.repository
- future/drafts/legacy-root/generated/campaign_system/backend/src/shared/http/error-handler.ts -> ../errors/AppError
- future/drafts/legacy-root/generated/campaign_system/frontend/src/App.tsx -> ./components/CampaignBuilder
- future/drafts/legacy-root/generated/campaign_system/frontend/src/App.tsx -> ./components/CampaignList
- future/drafts/legacy-root/generated/campaign_system/frontend/src/App.tsx -> ./components/HistoryPanel
- future/drafts/legacy-root/generated/campaign_system/frontend/src/App.tsx -> ./components/PreviewPanel
- future/drafts/legacy-root/generated/campaign_system/frontend/src/App.tsx -> ./components/ui/EmptyState
- future/drafts/legacy-root/generated/campaign_system/frontend/src/App.tsx -> ./components/ui/LoadingState
- future/drafts/legacy-root/generated/campaign_system/frontend/src/App.tsx -> ./layout/DashboardLayout
- future/drafts/legacy-root/generated/campaign_system/frontend/src/App.tsx -> ./services/http/client
- future/drafts/legacy-root/generated/campaign_system/frontend/src/App.tsx -> ./services/campaignApi
- future/drafts/legacy-root/generated/campaign_system/frontend/src/components/CampaignBuilder.tsx -> ./ui/Button
