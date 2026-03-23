# Usage Report

Generated at: 2026-03-23T14:30:27.294Z

Used folders (based on local imports/requires):

- engine/generators -> 4 references
- engine/agents -> 3 references
- src/api -> 3 references
- src/services -> 2 references
- core -> 2 references
- intelligence -> 2 references
- src/hooks -> 2 references
- . -> 1 references
- src/modules -> 1 references
- engine/analyzer -> 1 references
- templates/stack -> 1 references
- system -> 1 references
- src -> 1 references
- src/pages -> 1 references

Total source files: 89
Total referenced source files: 25
Potentially unreferenced source files: 57
Unresolved local imports: 125

Potentially unreferenced source files (top 80):

- core/build-placeholder.ts
- core/runtime/cli.js
- engine/agents/agent-runtime.js
- engine/agents/automation-agent.js
- engine/agents/campaign-agent.js
- engine/agents/conversation-agent.js
- engine/analyzer/analyzer.js
- engine/analyzer/project-scanner.js
- engine/generators/saas-generator.js
- engine/memory/ai-memory-bridge.js
- engine/memory/conversation-memory.js
- engine/memory/state-memory.js
- intelligence/analyzer/projectAnalyzer.js
- src/api/campaign-system-template.ts
- src/api/index.ts
- src/api/project-analyzer.ts
- src/api/project-scanner.js
- src/api/prompt-builder.ts
- src/api/saas-generator.js
- src/api/self-improving-engine.js
- src/components/campaign-system-template.ts
- src/components/orchestrator.js
- src/components/types.ts
- src/core/engine-api-1.js
- src/core/engine-api.js
- src/core/self-improving-engine.js
- src/hooks/ai-provider.js
- src/hooks/index-1.js
- src/hooks/interpreter.ts
- src/hooks/openai-provider.js
- src/modules/core/architecture-map.js
- src/modules/core/context-manager.js
- src/modules/core/module-registry.js
- src/modules/intelligence/ai-config.js
- src/modules/intelligence/command-parser.js
- src/modules/intelligence/llm-provider.js
- src/modules/interface/automation-adapter.js
- src/modules/interface/crmadapter.js
- src/modules/interface/default-automation-adapter.js
- src/modules/interface/default-crmadapter.js
- src/modules/interface/default-messaging-adapter.js
- src/modules/interface/messaging-adapter.js
- src/modules/interface/prompt-builder.js
- src/modules/shared/generate-system.ts
- src/modules/system/action-executor.js
- src/modules/system/command-parser.js
- src/modules/system/index-1.js
- src/modules/system/index-2.js
- src/modules/system/index-3.js
- src/modules/system/project-map.js
- src/services/index-1.ts
- src/services/index.ts
- src/services/modifier.ts
- src/types/dev-runner.ts
- src/types/update-system.ts
- src/utils/utils.js
- system/tools/structureAudit.js

Unresolved local imports (top 40):

- from engine/agents/index.js -> ./analyzerAgent
- from engine/agents/index.js -> ./plannerAgent
- from engine/agents/index.js -> ./frontendAgent
- from engine/agents/index.js -> ./backendAgent
- from engine/analyzer/index.js -> ../dev-engine/analyzer
- from engine/analyzer/project-scanner.js -> ../project-scanner
- from engine/generators/saas-generator.js -> ../dev-engine/saasGenerator
- from src/api/campaign-system-template.ts -> ../../core/types
- from src/api/code-generator.js -> ../services/http/request
- from src/api/index.ts -> ../../../core/prompt-builder
- from src/api/index.ts -> ../../../core/types
- from src/api/index.ts -> ../../../templates/backend/campaign-system.template
- from src/api/index.ts -> ../errors/AppError
- from src/api/index.ts -> ../../infra/database/prisma
- from src/api/index.ts -> ./campaign.dto
- from src/api/index.ts -> ../../shared/errors/AppError
- from src/api/index.ts -> ./campaign.repository
- from src/api/index.ts -> ./campaign.dto
- from src/api/index.ts -> ./campaign.service
- from src/api/index.ts -> ./campaign.controller
- from src/api/index.ts -> ../../shared/http/asyncHandler
- from src/api/index.ts -> ./modules/campaigns/campaign.routes
- from src/api/index.ts -> ./shared/http/error-handler
- from src/api/index.ts -> ./shared/http/not-found
- from src/api/index.ts -> ./app
- from src/api/index.ts -> ./config/env
- from src/api/prompt-builder.ts -> ./types
- from src/api/saas-generator.js -> ../lib/api
- from src/api/saas-generator.js -> ../../components/ui/input
- from src/api/saas-generator.js -> ../../components/ui/button
- from src/api/saas-generator.js -> ./projectScanner
- from src/api/saas-generator.js -> ./utils
- from src/api/saas-generator.js -> ./routes/integrations
- from src/api/self-improving-engine.js -> ../ui/card
- from src/components/campaign-system-template.ts -> ../../core/types
- from src/components/orchestrator.js -> ../intelligence/memory/memoryManager
- from src/components/orchestrator.js -> ../intelligence/generators/featureGenerator
- from src/components/orchestrator.js -> ./structureOrganizer
- from src/components/orchestrator.js -> ../intelligence/agents/analyzerAgent
- from src/components/orchestrator.js -> ../intelligence/agents/plannerAgent
