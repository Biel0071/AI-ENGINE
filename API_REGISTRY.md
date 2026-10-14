# API_REGISTRY.md

Endpoints extraídos diretamente dos handlers (url.pathname === '...'). Fonte: skeleton indexado.

## `archive/retired-frontends/grg_temp_backup/src/api/cloud-routes.js` — 6 endpoints

- `/api/dev/jobs`
- `/api/dev/missions`
- `/api/dev/orchestration/diagnostics`
- `/api/dev/projects`
- `/api/dev/tasks`
- `/api/v2/agentic/execute`

## `archive/retired-frontends/grg_temp_backup/src/api/developer-routes.js` — 13 endpoints

- `/api/agents/swarm`
- `/api/dev/ai/transform-file`
- `/api/dev/connections`
- `/api/dev/diagnostics`
- `/api/dev/fs`
- `/api/dev/fs/file`
- `/api/dev/fs/move`
- `/api/dev/git/status`
- `/api/dev/pipeline/discover`
- `/api/dev/pipeline/execute`
- `/api/dev/pipeline/jobs`
- `/api/dev/projects/clone`
- `/api/dev/terminal`

## `archive/retired-frontends/grg_temp_backup/src/api/product-experience-routes.js` — 71 endpoints

- `/api/v2/agentic/execute`
- `/api/v2/agents/live-states`
- `/api/v2/agents/orchestrate`
- `/api/v2/ai-platform/chat`
- `/api/v2/ai-platform/status`
- `/api/v2/ai/providers`
- `/api/v2/city/state`
- `/api/v2/compiler/compile`
- `/api/v2/compiler/skills`
- `/api/v2/computer/audit-log`
- `/api/v2/computer/execute-action`
- `/api/v2/connections`
- `/api/v2/connections/oauth/callback`
- `/api/v2/connections/request`
- `/api/v2/context/build`
- `/api/v2/cross-project/query`
- `/api/v2/devices`
- `/api/v2/devices/GRG-WINDOWS-01/screen/live`
- `/api/v2/devices/auth/challenge`
- `/api/v2/devices/auth/verify`
- `/api/v2/devices/emergency-stop`
- `/api/v2/devices/mobile/groups`
- `/api/v2/devices/mobile/pairing/claim`
- `/api/v2/devices/mobile/pairing/create`
- `/api/v2/devices/register`
- `/api/v2/devices/windows/screen/live`
- `/api/v2/economy/compress-context`
- `/api/v2/economy/mode`
- `/api/v2/economy/record-call`
- `/api/v2/economy/report`
- `/api/v2/events/stream`
- `/api/v2/factory/rebuild`
- `/api/v2/frontend-reality/audit`
- `/api/v2/frontend-reality/click-test`
- `/api/v2/frontend-reality/correlate`
- `/api/v2/frontend-reality/design-system`
- `/api/v2/frontend-reality/navigation-graph`
- `/api/v2/frontend-reality/repair`
- `/api/v2/frontend-reality/scan`
- `/api/v2/frontend-reality/screens`
- `/api/v2/jarvis/daily-operations`
- `/api/v2/jarvis/heartbeat/tick`
- `/api/v2/jarvis/jobs`
- `/api/v2/jarvis/jobs/queue`
- `/api/v2/jarvis/jobs/submit`
- `/api/v2/jarvis/opportunities`
- `/api/v2/memory/development`
- `/api/v2/memory/development/patterns`
- `/api/v2/memory/development/record`
- `/api/v2/memory/development/retrieve`
- `/api/v2/mind/ingest`
- `/api/v2/mind/memory/conversations`
- `/api/v2/mind/models`
- `/api/v2/mind/research`
- `/api/v2/mind/vision`
- `/api/v2/model-router/registry`
- `/api/v2/model-router/route`
- `/api/v2/onboarding/import`
- `/api/v2/projects`
- `/api/v2/projects/discover/scan`
- `/api/v2/projects/discovered`
- `/api/v2/projects/github`
- `/api/v2/reality/enforce`
- `/api/v2/telemetry/full`
- `/api/v2/vision/apply-visual-change`
- `/api/v2/vision/inspect-element`
- `/api/v2/visual/mutate`
- `/api/v2/voice/alexa`
- `/api/v2/voice/alexa/health`
- `/api/v2/voice/alexa/status`
- `/api/v2/voice/desktop/ingest`

## `archive/retired-frontends/grg_temp_backup/src/chat/live-chat-routes.js` — 4 endpoints

- `/api/chat/abort`
- `/api/chat/conversations`
- `/api/chat/preferences`
- `/api/chat/stream`

## `archive/retired-frontends/grg_temp_backup/src/devices/agent-runtime/windows-agent.js` — 2 endpoints

- `/health`
- `/voice/talk`

## `archive/retired-frontends/grg_temp_backup/src/execution/job-worker.js` — 1 endpoints

- `/api/clients`

## `archive/retired-frontends/grg_temp_backup/src/knowledge/knowledge-routes.js` — 10 endpoints

- `/api/artifacts`
- `/api/conversations`
- `/api/kernel`
- `/api/knowledge`
- `/api/memory`
- `/api/missions`
- `/api/provider-health`
- `/api/providers`
- `/api/storage`
- `/api/vector`

## `archive/retired-frontends/grg_temp_backup/src/missions/mission-routes.js` — 7 endpoints

- `/api/estimates`
- `/api/jobs`
- `/api/orchestrator/status`
- `/api/plans`
- `/api/providers`
- `/api/workers`
- `/api/workers/health`

## `archive/retired-frontends/grg_temp_backup/src/server.js` — 206 endpoints

- `/api/agents/cycles`
- `/api/agents/delegations`
- `/api/agents/knowledge-proposals`
- `/api/agents/panel`
- `/api/agents/swarm`
- `/api/agents/swarm/events`
- `/api/agents/tasks`
- `/api/ai/router/select`
- `/api/ai/telemetry`
- `/api/approvals`
- `/api/audit`
- `/api/avatar/message`
- `/api/capabilities`
- `/api/chat`
- `/api/city`
- `/api/city/npc/chat`
- `/api/city/npc/list`
- `/api/city/rebuild`
- `/api/cognitive/access-grants`
- `/api/cognitive/avatar/improvements`
- `/api/cognitive/avatar/state`
- `/api/cognitive/background/run`
- `/api/cognitive/context`
- `/api/cognitive/cycle`
- `/api/cognitive/dashboard`
- `/api/cognitive/entities`
- `/api/cognitive/goals`
- `/api/cognitive/hypotheses`
- `/api/cognitive/knowledge-sharing-policies`
- `/api/cognitive/search`
- `/api/company/calendar`
- `/api/company/daily-analysis`
- `/api/connection`
- `/api/connection/check`
- `/api/connectors`
- `/api/context`
- `/api/cross-project/analysis`
- `/api/digital-twin/city-state`
- `/api/digital-twin/operational`
- `/api/discovery-network/inventory`
- `/api/discovery-network/scan`
- `/api/events`
- `/api/evolution`
- `/api/evolution-proposals`
- `/api/evolution/backlog`
- `/api/execution/sandbox`
- `/api/execution/scripts`
- `/api/execution/signers`
- `/api/execution/tools`
- `/api/executive/decompose`
- `/api/executive/programs`
- `/api/fabric/enroll`
- `/api/fabric/enrollments`
- `/api/factory/demands`
- `/api/factory/generate`
- `/api/governance/gatekeeper`
- `/api/governance/production-readiness`
- `/api/governance/readiness-matrix`
- `/api/governance/simulation-audit`
- `/api/graph`
- `/api/hypotheses`
- `/api/insights`
- `/api/inspections`
- `/api/keos/adapters/ai`
- `/api/keos/adapters/tech`
- `/api/keos/constitution/index`
- `/api/keos/constitution/load-sparse`
- `/api/keos/pipeline/promote`
- `/api/keos/ucp/process`
- `/api/knowledge-federation/publications`
- `/api/knowledge-federation/publish`
- `/api/knowledge-genome/capsules`
- `/api/knowledge-graph/anomalies`
- `/api/knowledge-graph/entities`
- `/api/knowledge-graph/path`
- `/api/knowledge-graph/relationships`
- `/api/learning/procedural`
- `/api/learning/reuse`
- `/api/login`
- `/api/logout`
- `/api/me`
- `/api/memories`
- `/api/memories/consolidate`
- `/api/memories/search`
- `/api/missions`
- `/api/missions/avatar-state`
- `/api/missions/plan`
- `/api/missions/plans`
- `/api/models/catalog`
- `/api/models/execute`
- `/api/multimodal/ingest`
- `/api/nexus/bus/emit`
- `/api/nexus/command-center`
- `/api/nexus/marketplace/list`
- `/api/nexus/marketplace/publish`
- `/api/nexus/simulate-impact`
- `/api/nexus/timeline/feed`
- `/api/nexus/ucc/status`
- `/api/observability/metrics`
- `/api/observability/series`
- `/api/observability/series/sample`
- `/api/office`
- `/api/oidc/config`
- `/api/omega-infinity/crystal/state`
- `/api/omega-infinity/dna/compile`
- `/api/omega-infinity/laws/verify`
- `/api/omega-infinity/meta/index`
- `/api/omega-infinity/physics/universe`
- `/api/omega-infinity/reality/feedback`
- `/api/omega/brains/fuse`
- `/api/omega/brains/list`
- `/api/omega/council/evaluate`
- `/api/omega/council/members`
- `/api/omega/economy/route-check`
- `/api/omega/fabric/atoms`
- `/api/omega/fabric/density`
- `/api/omega/research/scan`
- `/api/omega/v2/consensus/debate`
- `/api/omega/v2/consensus/models`
- `/api/omega/v2/context/expand`
- `/api/omega/v2/human-twin/autopilot`
- `/api/omega/v2/human-twin/cop`
- `/api/omega/v2/recursive/refine`
- `/api/onedeploy/analyzers/backend`
- `/api/onedeploy/analyzers/frontend`
- `/api/onedeploy/continuous-improvement/idle-scan`
- `/api/onedeploy/e2e/run`
- `/api/onedeploy/run-pipeline`
- `/api/onedeploy/scan-project`
- `/api/onedeploy/smoke-tests/run`
- `/api/operations/activate`
- `/api/operations/assurances`
- `/api/operations/daily-intelligence`
- `/api/operations/deploys`
- `/api/operations/deploys/rollback`
- `/api/operations/history`
- `/api/operations/observability/metrics`
- `/api/operations/schedules`
- `/api/operations/stability-report`
- `/api/operations/state`
- `/api/ops/github/issues`
- `/api/ops/github/orgs`
- `/api/ops/github/prs`
- `/api/ops/master-node/self-deploy`
- `/api/ops/master-node/status`
- `/api/ops/vps/plans`
- `/api/ops/vps/servers`
- `/api/optimization/distill`
- `/api/optimization/health-index`
- `/api/optimization/never-repeat-check`
- `/api/orchestrate`
- `/api/orchestrator/mission/approve`
- `/api/orchestrator/mission/decompose`
- `/api/organism/identity`
- `/api/overview`
- `/api/performance/hot-memory`
- `/api/performance/predictive-prefetch`
- `/api/performance/speed-score`
- `/api/plugins/install`
- `/api/plugins/marketplace`
- `/api/projects`
- `/api/registry`
- `/api/repositories`
- `/api/rollbacks`
- `/api/runtime`
- `/api/runtime/capabilities`
- `/api/runtime/jobs`
- `/api/runtime/schedules`
- `/api/runtime/services`
- `/api/runtime/tick`
- `/api/runtime/work`
- `/api/scos/design-families/list`
- `/api/scos/design-tokens`
- `/api/scos/evolution/metrics`
- `/api/scos/factory/generate-multi-design`
- `/api/scos/factory/slices`
- `/api/scos/factory/sync-contract`
- `/api/scos/genome/structure`
- `/api/scos/visual-reasoning`
- `/api/security/encryption/status`
- `/api/security/encryption/tokenize`
- `/api/skills`
- `/api/skills/evolution`
- `/api/skills/select`
- `/api/system/boot-status`
- `/api/test/event`
- `/api/twins`
- `/api/uios/capos/list`
- `/api/uios/capos/register`
- `/api/uios/compiler/compile`
- `/api/uios/factory/create`
- `/api/uios/kos/manifest`
- `/api/uios/kos/semantic-load`
- `/api/uios/world-model/state`
- `/api/versions`
- `/api/versions/diff`
- `/api/workforces`
- `/api/workspace/eca/daily-brief`
- `/api/workspace/eca/decision`
- `/api/workspace/eca/evening-report`
- `/api/workspace/eca/inbox`
- `/api/workspace/mode`
- `/api/workspace/presence/config`
- `/health`
- `/metrics`
- `/runtime/snapshot`

## `archive/retired-frontends/grg_temp_backup2/src/api/cloud-routes.js` — 6 endpoints

- `/api/dev/jobs`
- `/api/dev/missions`
- `/api/dev/orchestration/diagnostics`
- `/api/dev/projects`
- `/api/dev/tasks`
- `/api/v2/agentic/execute`

## `archive/retired-frontends/grg_temp_backup2/src/api/developer-routes.js` — 13 endpoints

- `/api/agents/swarm`
- `/api/dev/ai/transform-file`
- `/api/dev/connections`
- `/api/dev/diagnostics`
- `/api/dev/fs`
- `/api/dev/fs/file`
- `/api/dev/fs/move`
- `/api/dev/git/status`
- `/api/dev/pipeline/discover`
- `/api/dev/pipeline/execute`
- `/api/dev/pipeline/jobs`
- `/api/dev/projects/clone`
- `/api/dev/terminal`

## `archive/retired-frontends/grg_temp_backup2/src/api/product-experience-routes.js` — 71 endpoints

- `/api/v2/agentic/execute`
- `/api/v2/agents/live-states`
- `/api/v2/agents/orchestrate`
- `/api/v2/ai-platform/chat`
- `/api/v2/ai-platform/status`
- `/api/v2/ai/providers`
- `/api/v2/city/state`
- `/api/v2/compiler/compile`
- `/api/v2/compiler/skills`
- `/api/v2/computer/audit-log`
- `/api/v2/computer/execute-action`
- `/api/v2/connections`
- `/api/v2/connections/oauth/callback`
- `/api/v2/connections/request`
- `/api/v2/context/build`
- `/api/v2/cross-project/query`
- `/api/v2/devices`
- `/api/v2/devices/GRG-WINDOWS-01/screen/live`
- `/api/v2/devices/auth/challenge`
- `/api/v2/devices/auth/verify`
- `/api/v2/devices/emergency-stop`
- `/api/v2/devices/mobile/groups`
- `/api/v2/devices/mobile/pairing/claim`
- `/api/v2/devices/mobile/pairing/create`
- `/api/v2/devices/register`
- `/api/v2/devices/windows/screen/live`
- `/api/v2/economy/compress-context`
- `/api/v2/economy/mode`
- `/api/v2/economy/record-call`
- `/api/v2/economy/report`
- `/api/v2/events/stream`
- `/api/v2/factory/rebuild`
- `/api/v2/frontend-reality/audit`
- `/api/v2/frontend-reality/click-test`
- `/api/v2/frontend-reality/correlate`
- `/api/v2/frontend-reality/design-system`
- `/api/v2/frontend-reality/navigation-graph`
- `/api/v2/frontend-reality/repair`
- `/api/v2/frontend-reality/scan`
- `/api/v2/frontend-reality/screens`
- `/api/v2/jarvis/daily-operations`
- `/api/v2/jarvis/heartbeat/tick`
- `/api/v2/jarvis/jobs`
- `/api/v2/jarvis/jobs/queue`
- `/api/v2/jarvis/jobs/submit`
- `/api/v2/jarvis/opportunities`
- `/api/v2/memory/development`
- `/api/v2/memory/development/patterns`
- `/api/v2/memory/development/record`
- `/api/v2/memory/development/retrieve`
- `/api/v2/mind/ingest`
- `/api/v2/mind/memory/conversations`
- `/api/v2/mind/models`
- `/api/v2/mind/research`
- `/api/v2/mind/vision`
- `/api/v2/model-router/registry`
- `/api/v2/model-router/route`
- `/api/v2/onboarding/import`
- `/api/v2/projects`
- `/api/v2/projects/discover/scan`
- `/api/v2/projects/discovered`
- `/api/v2/projects/github`
- `/api/v2/reality/enforce`
- `/api/v2/telemetry/full`
- `/api/v2/vision/apply-visual-change`
- `/api/v2/vision/inspect-element`
- `/api/v2/visual/mutate`
- `/api/v2/voice/alexa`
- `/api/v2/voice/alexa/health`
- `/api/v2/voice/alexa/status`
- `/api/v2/voice/desktop/ingest`

## `archive/retired-frontends/grg_temp_backup2/src/chat/live-chat-routes.js` — 4 endpoints

- `/api/chat/abort`
- `/api/chat/conversations`
- `/api/chat/preferences`
- `/api/chat/stream`

## `archive/retired-frontends/grg_temp_backup2/src/devices/agent-runtime/windows-agent.js` — 2 endpoints

- `/health`
- `/voice/talk`

## `archive/retired-frontends/grg_temp_backup2/src/execution/job-worker.js` — 1 endpoints

- `/api/clients`

## `archive/retired-frontends/grg_temp_backup2/src/knowledge/knowledge-routes.js` — 10 endpoints

- `/api/artifacts`
- `/api/conversations`
- `/api/kernel`
- `/api/knowledge`
- `/api/memory`
- `/api/missions`
- `/api/provider-health`
- `/api/providers`
- `/api/storage`
- `/api/vector`

## `archive/retired-frontends/grg_temp_backup2/src/missions/mission-routes.js` — 7 endpoints

- `/api/estimates`
- `/api/jobs`
- `/api/orchestrator/status`
- `/api/plans`
- `/api/providers`
- `/api/workers`
- `/api/workers/health`

## `archive/retired-frontends/grg_temp_backup2/src/server.js` — 206 endpoints

- `/api/agents/cycles`
- `/api/agents/delegations`
- `/api/agents/knowledge-proposals`
- `/api/agents/panel`
- `/api/agents/swarm`
- `/api/agents/swarm/events`
- `/api/agents/tasks`
- `/api/ai/router/select`
- `/api/ai/telemetry`
- `/api/approvals`
- `/api/audit`
- `/api/avatar/message`
- `/api/capabilities`
- `/api/chat`
- `/api/city`
- `/api/city/npc/chat`
- `/api/city/npc/list`
- `/api/city/rebuild`
- `/api/cognitive/access-grants`
- `/api/cognitive/avatar/improvements`
- `/api/cognitive/avatar/state`
- `/api/cognitive/background/run`
- `/api/cognitive/context`
- `/api/cognitive/cycle`
- `/api/cognitive/dashboard`
- `/api/cognitive/entities`
- `/api/cognitive/goals`
- `/api/cognitive/hypotheses`
- `/api/cognitive/knowledge-sharing-policies`
- `/api/cognitive/search`
- `/api/company/calendar`
- `/api/company/daily-analysis`
- `/api/connection`
- `/api/connection/check`
- `/api/connectors`
- `/api/context`
- `/api/cross-project/analysis`
- `/api/digital-twin/city-state`
- `/api/digital-twin/operational`
- `/api/discovery-network/inventory`
- `/api/discovery-network/scan`
- `/api/events`
- `/api/evolution`
- `/api/evolution-proposals`
- `/api/evolution/backlog`
- `/api/execution/sandbox`
- `/api/execution/scripts`
- `/api/execution/signers`
- `/api/execution/tools`
- `/api/executive/decompose`
- `/api/executive/programs`
- `/api/fabric/enroll`
- `/api/fabric/enrollments`
- `/api/factory/demands`
- `/api/factory/generate`
- `/api/governance/gatekeeper`
- `/api/governance/production-readiness`
- `/api/governance/readiness-matrix`
- `/api/governance/simulation-audit`
- `/api/graph`
- `/api/hypotheses`
- `/api/insights`
- `/api/inspections`
- `/api/keos/adapters/ai`
- `/api/keos/adapters/tech`
- `/api/keos/constitution/index`
- `/api/keos/constitution/load-sparse`
- `/api/keos/pipeline/promote`
- `/api/keos/ucp/process`
- `/api/knowledge-federation/publications`
- `/api/knowledge-federation/publish`
- `/api/knowledge-genome/capsules`
- `/api/knowledge-graph/anomalies`
- `/api/knowledge-graph/entities`
- `/api/knowledge-graph/path`
- `/api/knowledge-graph/relationships`
- `/api/learning/procedural`
- `/api/learning/reuse`
- `/api/login`
- `/api/logout`
- `/api/me`
- `/api/memories`
- `/api/memories/consolidate`
- `/api/memories/search`
- `/api/missions`
- `/api/missions/avatar-state`
- `/api/missions/plan`
- `/api/missions/plans`
- `/api/models/catalog`
- `/api/models/execute`
- `/api/multimodal/ingest`
- `/api/nexus/bus/emit`
- `/api/nexus/command-center`
- `/api/nexus/marketplace/list`
- `/api/nexus/marketplace/publish`
- `/api/nexus/simulate-impact`
- `/api/nexus/timeline/feed`
- `/api/nexus/ucc/status`
- `/api/observability/metrics`
- `/api/observability/series`
- `/api/observability/series/sample`
- `/api/office`
- `/api/oidc/config`
- `/api/omega-infinity/crystal/state`
- `/api/omega-infinity/dna/compile`
- `/api/omega-infinity/laws/verify`
- `/api/omega-infinity/meta/index`
- `/api/omega-infinity/physics/universe`
- `/api/omega-infinity/reality/feedback`
- `/api/omega/brains/fuse`
- `/api/omega/brains/list`
- `/api/omega/council/evaluate`
- `/api/omega/council/members`
- `/api/omega/economy/route-check`
- `/api/omega/fabric/atoms`
- `/api/omega/fabric/density`
- `/api/omega/research/scan`
- `/api/omega/v2/consensus/debate`
- `/api/omega/v2/consensus/models`
- `/api/omega/v2/context/expand`
- `/api/omega/v2/human-twin/autopilot`
- `/api/omega/v2/human-twin/cop`
- `/api/omega/v2/recursive/refine`
- `/api/onedeploy/analyzers/backend`
- `/api/onedeploy/analyzers/frontend`
- `/api/onedeploy/continuous-improvement/idle-scan`
- `/api/onedeploy/e2e/run`
- `/api/onedeploy/run-pipeline`
- `/api/onedeploy/scan-project`
- `/api/onedeploy/smoke-tests/run`
- `/api/operations/activate`
- `/api/operations/assurances`
- `/api/operations/daily-intelligence`
- `/api/operations/deploys`
- `/api/operations/deploys/rollback`
- `/api/operations/history`
- `/api/operations/observability/metrics`
- `/api/operations/schedules`
- `/api/operations/stability-report`
- `/api/operations/state`
- `/api/ops/github/issues`
- `/api/ops/github/orgs`
- `/api/ops/github/prs`
- `/api/ops/master-node/self-deploy`
- `/api/ops/master-node/status`
- `/api/ops/vps/plans`
- `/api/ops/vps/servers`
- `/api/optimization/distill`
- `/api/optimization/health-index`
- `/api/optimization/never-repeat-check`
- `/api/orchestrate`
- `/api/orchestrator/mission/approve`
- `/api/orchestrator/mission/decompose`
- `/api/organism/identity`
- `/api/overview`
- `/api/performance/hot-memory`
- `/api/performance/predictive-prefetch`
- `/api/performance/speed-score`
- `/api/plugins/install`
- `/api/plugins/marketplace`
- `/api/projects`
- `/api/registry`
- `/api/repositories`
- `/api/rollbacks`
- `/api/runtime`
- `/api/runtime/capabilities`
- `/api/runtime/jobs`
- `/api/runtime/schedules`
- `/api/runtime/services`
- `/api/runtime/tick`
- `/api/runtime/work`
- `/api/scos/design-families/list`
- `/api/scos/design-tokens`
- `/api/scos/evolution/metrics`
- `/api/scos/factory/generate-multi-design`
- `/api/scos/factory/slices`
- `/api/scos/factory/sync-contract`
- `/api/scos/genome/structure`
- `/api/scos/visual-reasoning`
- `/api/security/encryption/status`
- `/api/security/encryption/tokenize`
- `/api/skills`
- `/api/skills/evolution`
- `/api/skills/select`
- `/api/system/boot-status`
- `/api/test/event`
- `/api/twins`
- `/api/uios/capos/list`
- `/api/uios/capos/register`
- `/api/uios/compiler/compile`
- `/api/uios/factory/create`
- `/api/uios/kos/manifest`
- `/api/uios/kos/semantic-load`
- `/api/uios/world-model/state`
- `/api/versions`
- `/api/versions/diff`
- `/api/workforces`
- `/api/workspace/eca/daily-brief`
- `/api/workspace/eca/decision`
- `/api/workspace/eca/evening-report`
- `/api/workspace/eca/inbox`
- `/api/workspace/mode`
- `/api/workspace/presence/config`
- `/health`
- `/metrics`
- `/runtime/snapshot`

## `archive/retired-frontends/scratch_frontend_evolution/candidate/public/fenix-v11-interactions.js` — 4 endpoints

- `GET /api/v2/graph/data`
- `GET /api/v2/graph/stats`
- `GET /api/v2/living-city/agents`
- `GET /api/v2/runtime/full-status`

## `archive/retired-frontends/scratch_frontend_evolution/preview.cjs` — 2 endpoints

- `/events`
- `/health`

## `archive/retired-frontends/vps_source/grg/src/api/cloud-routes.js` — 3 endpoints

- `/api/dev/jobs`
- `/api/dev/projects`
- `/api/dev/tasks`

## `archive/retired-frontends/vps_source/grg/src/api/developer-routes.js` — 10 endpoints

- `/api/dev/ai/transform-file`
- `/api/dev/fs`
- `/api/dev/fs/delete`
- `/api/dev/fs/file`
- `/api/dev/fs/mkdir`
- `/api/dev/fs/move`
- `/api/dev/pipeline`
- `/api/dev/projects/clone`
- `/api/dev/small-task`
- `/api/dev/terminal`

## `archive/retired-frontends/vps_source/grg/src/api/orchestration-routes.js` — 2 endpoints

- `/api/orchestration/events`
- `/api/orchestration/requests`

## `archive/retired-frontends/vps_source/grg/src/api/product-experience-routes.js` — 75 endpoints

- `/api/v2/agentic/execute`
- `/api/v2/agents/live-states`
- `/api/v2/agents/orchestrate`
- `/api/v2/ai-platform/chat`
- `/api/v2/ai-platform/status`
- `/api/v2/ai/providers`
- `/api/v2/city/state`
- `/api/v2/compiler/compile`
- `/api/v2/compiler/skills`
- `/api/v2/computer/audit-log`
- `/api/v2/computer/execute-action`
- `/api/v2/connections`
- `/api/v2/connections/oauth/callback`
- `/api/v2/connections/request`
- `/api/v2/context/build`
- `/api/v2/cross-project/query`
- `/api/v2/devices`
- `/api/v2/devices/GRG-WINDOWS-01/screen/live`
- `/api/v2/devices/auth/challenge`
- `/api/v2/devices/auth/verify`
- `/api/v2/devices/emergency-stop`
- `/api/v2/devices/mobile/groups`
- `/api/v2/devices/mobile/pairing/claim`
- `/api/v2/devices/mobile/pairing/create`
- `/api/v2/devices/register`
- `/api/v2/devices/windows/screen/live`
- `/api/v2/economy/compress-context`
- `/api/v2/economy/mode`
- `/api/v2/economy/record-call`
- `/api/v2/economy/report`
- `/api/v2/events/stream`
- `/api/v2/factory/rebuild`
- `/api/v2/frontend-reality/audit`
- `/api/v2/frontend-reality/click-test`
- `/api/v2/frontend-reality/correlate`
- `/api/v2/frontend-reality/design-system`
- `/api/v2/frontend-reality/navigation-graph`
- `/api/v2/frontend-reality/repair`
- `/api/v2/frontend-reality/scan`
- `/api/v2/frontend-reality/screens`
- `/api/v2/jarvis/daily-operations`
- `/api/v2/jarvis/heartbeat/tick`
- `/api/v2/jarvis/jobs`
- `/api/v2/jarvis/jobs/queue`
- `/api/v2/jarvis/jobs/submit`
- `/api/v2/jarvis/opportunities`
- `/api/v2/memory/development`
- `/api/v2/memory/development/patterns`
- `/api/v2/memory/development/record`
- `/api/v2/memory/development/retrieve`
- `/api/v2/mind/ingest`
- `/api/v2/mind/memory/conversations`
- `/api/v2/mind/models`
- `/api/v2/mind/research`
- `/api/v2/mind/vision`
- `/api/v2/model-router/registry`
- `/api/v2/model-router/route`
- `/api/v2/onboarding/import`
- `/api/v2/projects`
- `/api/v2/projects/discover/scan`
- `/api/v2/projects/discovered`
- `/api/v2/projects/github`
- `/api/v2/proxy/vps-docs`
- `/api/v2/proxy/vps-health`
- `/api/v2/reality/enforce`
- `/api/v2/telemetry/full`
- `/api/v2/test-fail`
- `/api/v2/vision/apply-visual-change`
- `/api/v2/vision/inspect-element`
- `/api/v2/visual/mutate`
- `/api/v2/voice/alexa`
- `/api/v2/voice/alexa/health`
- `/api/v2/voice/alexa/status`
- `/api/v2/voice/desktop/ingest`
- `/api/v2/vps-chat`

## `archive/retired-frontends/vps_source/grg/src/api/project-mirror-routes.js` — 7 endpoints

- `/api/project-mirror`
- `/api/project-mirror/asset`
- `/api/project-mirror/preview`
- `/api/project-mirror/projects`
- `/api/project-mirror/scan`
- `/api/project-mirror/screens`
- `/api/project-mirror/source`

## `archive/retired-frontends/vps_source/grg/src/api/projects-registry-routes.js` — 1 endpoints

- `/api/v2/projects-registry`

## `archive/retired-frontends/vps_source/grg/src/api/runtime-full-status.js` — 1 endpoints

- `/api/v2/runtime/full-status`

## `archive/retired-frontends/vps_source/grg/src/api/universal-job-routes.js` — 5 endpoints

- `/api/jobs`
- `/api/v2/jobs`
- `/api/v2/jobs/run-batch`
- `/api/v2/system/status`
- `/api/workers`

## `archive/retired-frontends/vps_source/grg/src/chat/live-chat-routes.js` — 4 endpoints

- `/api/chat/abort`
- `/api/chat/conversations`
- `/api/chat/preferences`
- `/api/chat/stream`

## `archive/retired-frontends/vps_source/grg/src/devices/agent-runtime/windows-agent.js` — 2 endpoints

- `/health`
- `/voice/talk`

## `archive/retired-frontends/vps_source/grg/src/eventing/fenix-event-bus.js` — 2 endpoints

- `/api/v2/events/history`
- `/api/v2/events/stream`

## `archive/retired-frontends/vps_source/grg/src/knowledge/knowledge-routes.js` — 10 endpoints

- `/api/artifacts`
- `/api/conversations`
- `/api/kernel`
- `/api/knowledge`
- `/api/memory`
- `/api/missions`
- `/api/provider-health`
- `/api/providers`
- `/api/storage`
- `/api/vector`

## `archive/retired-frontends/vps_source/grg/src/missions/mission-routes.js` — 7 endpoints

- `/api/estimates`
- `/api/jobs`
- `/api/orchestrator/status`
- `/api/plans`
- `/api/providers`
- `/api/workers`
- `/api/workers/health`

## `archive/retired-frontends/vps_source/grg/src/server.js` — 234 endpoints

- `/api/agents/cycles`
- `/api/agents/delegations`
- `/api/agents/knowledge-proposals`
- `/api/agents/panel`
- `/api/agents/swarm`
- `/api/agents/swarm/events`
- `/api/agents/tasks`
- `/api/ai/router/select`
- `/api/ai/telemetry`
- `/api/approvals`
- `/api/audit`
- `/api/autonomous/cycle`
- `/api/avatar/message`
- `/api/capabilities`
- `/api/chat`
- `/api/chat/intent`
- `/api/city`
- `/api/city/npc/chat`
- `/api/city/npc/list`
- `/api/city/rebuild`
- `/api/cognitive/access-grants`
- `/api/cognitive/avatar/improvements`
- `/api/cognitive/avatar/state`
- `/api/cognitive/background/run`
- `/api/cognitive/context`
- `/api/cognitive/cycle`
- `/api/cognitive/dashboard`
- `/api/cognitive/entities`
- `/api/cognitive/goals`
- `/api/cognitive/hypotheses`
- `/api/cognitive/knowledge-sharing-policies`
- `/api/cognitive/search`
- `/api/company/calendar`
- `/api/company/daily-analysis`
- `/api/connection`
- `/api/connection/check`
- `/api/connectors`
- `/api/context`
- `/api/cross-project/analysis`
- `/api/digital-twin/city-state`
- `/api/digital-twin/operational`
- `/api/discovery-network/inventory`
- `/api/discovery-network/scan`
- `/api/events`
- `/api/evolution`
- `/api/evolution-proposals`
- `/api/evolution/backlog`
- `/api/execution/sandbox`
- `/api/execution/scripts`
- `/api/execution/signers`
- `/api/execution/tools`
- `/api/executive/decompose`
- `/api/executive/programs`
- `/api/fabric/enroll`
- `/api/fabric/enrollments`
- `/api/factory/demands`
- `/api/factory/generate`
- `/api/fenix/jobs`
- `/api/fenix/memory/invalidate`
- `/api/fenix/memory/metrics`
- `/api/fenix/memory/promote`
- `/api/fenix/memory/reuse`
- `/api/fenix/memory/search`
- `/api/fenix/mission-events`
- `/api/fenix/missions`
- `/api/fenix/projects`
- `/api/fenix/providers`
- `/api/governance/gatekeeper`
- `/api/governance/production-readiness`
- `/api/governance/readiness-matrix`
- `/api/governance/simulation-audit`
- `/api/graph`
- `/api/hypotheses`
- `/api/insights`
- `/api/inspections`
- `/api/jobs`
- `/api/keos/adapters/ai`
- `/api/keos/adapters/tech`
- `/api/keos/constitution/index`
- `/api/keos/constitution/load-sparse`
- `/api/keos/pipeline/promote`
- `/api/keos/ucp/process`
- `/api/knowledge-federation/ingest`
- `/api/knowledge-federation/publications`
- `/api/knowledge-federation/publish`
- `/api/knowledge-genome/capsules`
- `/api/knowledge-graph/anomalies`
- `/api/knowledge-graph/entities`
- `/api/knowledge-graph/path`
- `/api/knowledge-graph/relationships`
- `/api/login`
- `/api/logout`
- `/api/me`
- `/api/memories`
- `/api/memories/consolidate`
- `/api/memories/search`
- `/api/memory/consolidate`
- `/api/memory/search`
- `/api/memory/write`
- `/api/missions`
- `/api/missions/avatar-state`
- `/api/missions/plan`
- `/api/missions/plans`
- `/api/missions/reconcile`
- `/api/models/catalog`
- `/api/models/execute`
- `/api/multimodal/ingest`
- `/api/nexus/bus/emit`
- `/api/nexus/command-center`
- `/api/nexus/marketplace/list`
- `/api/nexus/marketplace/publish`
- `/api/nexus/simulate-impact`
- `/api/nexus/timeline/feed`
- `/api/nexus/ucc/status`
- `/api/observability/live`
- `/api/observability/metrics`
- `/api/observability/series`
- `/api/observability/series/sample`
- `/api/office`
- `/api/oidc/config`
- `/api/omega-infinity/crystal/state`
- `/api/omega-infinity/dna/compile`
- `/api/omega-infinity/laws/verify`
- `/api/omega-infinity/meta/index`
- `/api/omega-infinity/physics/universe`
- `/api/omega-infinity/reality/feedback`
- `/api/omega/brains/fuse`
- `/api/omega/brains/list`
- `/api/omega/council/evaluate`
- `/api/omega/council/members`
- `/api/omega/economy/route-check`
- `/api/omega/fabric/atoms`
- `/api/omega/fabric/density`
- `/api/omega/research/scan`
- `/api/omega/v2/consensus/debate`
- `/api/omega/v2/consensus/models`
- `/api/omega/v2/context/expand`
- `/api/omega/v2/human-twin/autopilot`
- `/api/omega/v2/human-twin/cop`
- `/api/omega/v2/recursive/refine`
- `/api/onedeploy/analyzers/backend`
- `/api/onedeploy/analyzers/frontend`
- `/api/onedeploy/continuous-improvement/idle-scan`
- `/api/onedeploy/e2e/run`
- `/api/onedeploy/run-pipeline`
- `/api/onedeploy/scan-project`
- `/api/onedeploy/smoke-tests/run`
- `/api/operations/activate`
- `/api/operations/assurances`
- `/api/operations/daily-intelligence`
- `/api/operations/deploys`
- `/api/operations/deploys/rollback`
- `/api/operations/history`
- `/api/operations/observability/metrics`
- `/api/operations/schedules`
- `/api/operations/stability-report`
- `/api/operations/state`
- `/api/ops/github/issues`
- `/api/ops/github/orgs`
- `/api/ops/github/prs`
- `/api/ops/master-node/self-deploy`
- `/api/ops/master-node/status`
- `/api/ops/vps/plans`
- `/api/ops/vps/servers`
- `/api/optimization/distill`
- `/api/optimization/health-index`
- `/api/optimization/never-repeat-check`
- `/api/orchestrate`
- `/api/orchestrator/mission/approve`
- `/api/orchestrator/mission/decompose`
- `/api/organism/identity`
- `/api/overview`
- `/api/performance/hot-memory`
- `/api/performance/predictive-prefetch`
- `/api/performance/speed-score`
- `/api/plugins/install`
- `/api/plugins/marketplace`
- `/api/projects`
- `/api/registry`
- `/api/repositories`
- `/api/rollbacks`
- `/api/runtime`
- `/api/runtime/ai/health`
- `/api/runtime/ai/usage`
- `/api/runtime/capabilities`
- `/api/runtime/jobs`
- `/api/runtime/schedules`
- `/api/runtime/services`
- `/api/runtime/tick`
- `/api/runtime/work`
- `/api/scos/design-families/list`
- `/api/scos/design-tokens`
- `/api/scos/evolution/metrics`
- `/api/scos/factory/generate-multi-design`
- `/api/scos/factory/slices`
- `/api/scos/factory/sync-contract`
- `/api/scos/genome/structure`
- `/api/scos/visual-reasoning`
- `/api/search`
- `/api/security/encryption/status`
- `/api/security/encryption/tokenize`
- `/api/skills`
- `/api/skills/evolution`
- `/api/skills/select`
- `/api/system/boot-status`
- `/api/system/observability`
- `/api/test/event`
- `/api/twins`
- `/api/uios/capos/list`
- `/api/uios/capos/register`
- `/api/uios/compiler/compile`
- `/api/uios/factory/create`
- `/api/uios/kos/manifest`
- `/api/uios/kos/semantic-load`
- `/api/uios/world-model/state`
- `/api/v2/jobs/enqueue`
- `/api/v2/public/events`
- `/api/v2/public/projects`
- `/api/v2/public/status`
- `/api/versions`
- `/api/versions/diff`
- `/api/workforces`
- `/api/workspace/eca/daily-brief`
- `/api/workspace/eca/decision`
- `/api/workspace/eca/evening-report`
- `/api/workspace/eca/inbox`
- `/api/workspace/mode`
- `/api/workspace/presence/config`
- `/favicon.ico`
- `/health`
- `/metrics`
- `/runtime/ai/health`
- `/runtime/ai/usage`
- `/runtime/snapshot`

## `engine/projectIntelligence/build.js` — 1 endpoints

- `...`

## `engine/projectIntelligence/lib.js` — 1 endpoints

- `/api/x`

## `future/drafts/legacy-root/generated/campaign_system/backend/src/app.ts` — 1 endpoints

- `GET /health`

## `grg/public/fenix-v11-interactions.js` — 4 endpoints

- `GET /api/v2/graph/data`
- `GET /api/v2/graph/stats`
- `GET /api/v2/living-city/agents`
- `GET /api/v2/runtime/full-status`

## `grg/public/fenix-world-3d.js` — 1 endpoints

- `GET /api/v2/stream`

## `grg/qa/remote-snapshot/live-server.js` — 208 endpoints

- `/api/agents/cycles`
- `/api/agents/delegations`
- `/api/agents/knowledge-proposals`
- `/api/agents/panel`
- `/api/agents/swarm`
- `/api/agents/swarm/events`
- `/api/agents/tasks`
- `/api/ai/router/select`
- `/api/ai/telemetry`
- `/api/approvals`
- `/api/audit`
- `/api/autonomous/cycle`
- `/api/avatar/message`
- `/api/capabilities`
- `/api/chat`
- `/api/city`
- `/api/city/npc/chat`
- `/api/city/npc/list`
- `/api/city/rebuild`
- `/api/cognitive/access-grants`
- `/api/cognitive/avatar/improvements`
- `/api/cognitive/avatar/state`
- `/api/cognitive/background/run`
- `/api/cognitive/context`
- `/api/cognitive/cycle`
- `/api/cognitive/dashboard`
- `/api/cognitive/entities`
- `/api/cognitive/goals`
- `/api/cognitive/hypotheses`
- `/api/cognitive/knowledge-sharing-policies`
- `/api/cognitive/search`
- `/api/company/calendar`
- `/api/company/daily-analysis`
- `/api/connection`
- `/api/connection/check`
- `/api/connectors`
- `/api/context`
- `/api/cross-project/analysis`
- `/api/dev/pipeline`
- `/api/digital-twin/city-state`
- `/api/digital-twin/operational`
- `/api/discovery-network/inventory`
- `/api/discovery-network/scan`
- `/api/events`
- `/api/evolution`
- `/api/evolution-proposals`
- `/api/evolution/backlog`
- `/api/execution/sandbox`
- `/api/execution/scripts`
- `/api/execution/signers`
- `/api/execution/tools`
- `/api/executive/decompose`
- `/api/executive/programs`
- `/api/fabric/enroll`
- `/api/fabric/enrollments`
- `/api/factory/demands`
- `/api/factory/generate`
- `/api/governance/gatekeeper`
- `/api/governance/production-readiness`
- `/api/governance/readiness-matrix`
- `/api/governance/simulation-audit`
- `/api/graph`
- `/api/hypotheses`
- `/api/insights`
- `/api/inspections`
- `/api/keos/adapters/ai`
- `/api/keos/adapters/tech`
- `/api/keos/constitution/index`
- `/api/keos/constitution/load-sparse`
- `/api/keos/pipeline/promote`
- `/api/keos/ucp/process`
- `/api/knowledge-federation/publications`
- `/api/knowledge-federation/publish`
- `/api/knowledge-genome/capsules`
- `/api/knowledge-graph/anomalies`
- `/api/knowledge-graph/entities`
- `/api/knowledge-graph/path`
- `/api/knowledge-graph/relationships`
- `/api/login`
- `/api/logout`
- `/api/me`
- `/api/memories`
- `/api/memories/consolidate`
- `/api/memories/search`
- `/api/memory/consolidate`
- `/api/memory/search`
- `/api/memory/write`
- `/api/missions`
- `/api/missions/avatar-state`
- `/api/missions/plan`
- `/api/missions/plans`
- `/api/models/catalog`
- `/api/models/execute`
- `/api/multimodal/ingest`
- `/api/nexus/bus/emit`
- `/api/nexus/command-center`
- `/api/nexus/marketplace/list`
- `/api/nexus/marketplace/publish`
- `/api/nexus/simulate-impact`
- `/api/nexus/timeline/feed`
- `/api/nexus/ucc/status`
- `/api/observability/metrics`
- `/api/observability/series`
- `/api/observability/series/sample`
- `/api/office`
- `/api/oidc/config`
- `/api/omega-infinity/crystal/state`
- `/api/omega-infinity/dna/compile`
- `/api/omega-infinity/laws/verify`
- `/api/omega-infinity/meta/index`
- `/api/omega-infinity/physics/universe`
- `/api/omega-infinity/reality/feedback`
- `/api/omega/brains/fuse`
- `/api/omega/brains/list`
- `/api/omega/council/evaluate`
- `/api/omega/council/members`
- `/api/omega/economy/route-check`
- `/api/omega/fabric/atoms`
- `/api/omega/fabric/density`
- `/api/omega/research/scan`
- `/api/omega/v2/consensus/debate`
- `/api/omega/v2/consensus/models`
- `/api/omega/v2/context/expand`
- `/api/omega/v2/human-twin/autopilot`
- `/api/omega/v2/human-twin/cop`
- `/api/omega/v2/recursive/refine`
- `/api/onedeploy/analyzers/backend`
- `/api/onedeploy/analyzers/frontend`
- `/api/onedeploy/continuous-improvement/idle-scan`
- `/api/onedeploy/e2e/run`
- `/api/onedeploy/run-pipeline`
- `/api/onedeploy/scan-project`
- `/api/onedeploy/smoke-tests/run`
- `/api/operations/activate`
- `/api/operations/assurances`
- `/api/operations/daily-intelligence`
- `/api/operations/deploys`
- `/api/operations/deploys/rollback`
- `/api/operations/history`
- `/api/operations/observability/metrics`
- `/api/operations/schedules`
- `/api/operations/stability-report`
- `/api/operations/state`
- `/api/ops/github/issues`
- `/api/ops/github/orgs`
- `/api/ops/github/prs`
- `/api/ops/master-node/self-deploy`
- `/api/ops/master-node/status`
- `/api/ops/vps/plans`
- `/api/ops/vps/servers`
- `/api/optimization/distill`
- `/api/optimization/health-index`
- `/api/optimization/never-repeat-check`
- `/api/orchestrate`
- `/api/orchestrator/mission/approve`
- `/api/orchestrator/mission/decompose`
- `/api/organism/identity`
- `/api/overview`
- `/api/performance/hot-memory`
- `/api/performance/predictive-prefetch`
- `/api/performance/speed-score`
- `/api/plugins/install`
- `/api/plugins/marketplace`
- `/api/projects`
- `/api/registry`
- `/api/repositories`
- `/api/rollbacks`
- `/api/runtime`
- `/api/runtime/capabilities`
- `/api/runtime/jobs`
- `/api/runtime/schedules`
- `/api/runtime/services`
- `/api/runtime/tick`
- `/api/runtime/work`
- `/api/scos/design-families/list`
- `/api/scos/design-tokens`
- `/api/scos/evolution/metrics`
- `/api/scos/factory/generate-multi-design`
- `/api/scos/factory/slices`
- `/api/scos/factory/sync-contract`
- `/api/scos/genome/structure`
- `/api/scos/visual-reasoning`
- `/api/security/encryption/status`
- `/api/security/encryption/tokenize`
- `/api/skills`
- `/api/skills/evolution`
- `/api/skills/select`
- `/api/system/boot-status`
- `/api/test/event`
- `/api/twins`
- `/api/uios/capos/list`
- `/api/uios/capos/register`
- `/api/uios/compiler/compile`
- `/api/uios/factory/create`
- `/api/uios/kos/manifest`
- `/api/uios/kos/semantic-load`
- `/api/uios/world-model/state`
- `/api/versions`
- `/api/versions/diff`
- `/api/workforces`
- `/api/workspace/eca/daily-brief`
- `/api/workspace/eca/decision`
- `/api/workspace/eca/evening-report`
- `/api/workspace/eca/inbox`
- `/api/workspace/mode`
- `/api/workspace/presence/config`
- `/health`
- `/metrics`

## `grg/qa-results/vps-active-agent/server.js` — 235 endpoints

- `/api/agents/cycles`
- `/api/agents/delegations`
- `/api/agents/knowledge-proposals`
- `/api/agents/panel`
- `/api/agents/swarm`
- `/api/agents/swarm/events`
- `/api/agents/tasks`
- `/api/ai/router/select`
- `/api/ai/telemetry`
- `/api/approvals`
- `/api/audit`
- `/api/autonomous/cycle`
- `/api/avatar/message`
- `/api/capabilities`
- `/api/chat`
- `/api/chat/intent`
- `/api/city`
- `/api/city/npc/chat`
- `/api/city/npc/list`
- `/api/city/rebuild`
- `/api/cognitive/access-grants`
- `/api/cognitive/avatar/improvements`
- `/api/cognitive/avatar/state`
- `/api/cognitive/background/run`
- `/api/cognitive/context`
- `/api/cognitive/cycle`
- `/api/cognitive/dashboard`
- `/api/cognitive/entities`
- `/api/cognitive/goals`
- `/api/cognitive/hypotheses`
- `/api/cognitive/knowledge-sharing-policies`
- `/api/cognitive/search`
- `/api/company/calendar`
- `/api/company/daily-analysis`
- `/api/connection`
- `/api/connection/check`
- `/api/connectors`
- `/api/context`
- `/api/cross-project/analysis`
- `/api/digital-twin/city-state`
- `/api/digital-twin/operational`
- `/api/discovery-network/inventory`
- `/api/discovery-network/scan`
- `/api/events`
- `/api/evolution`
- `/api/evolution-proposals`
- `/api/evolution/backlog`
- `/api/execution/sandbox`
- `/api/execution/scripts`
- `/api/execution/signers`
- `/api/execution/tools`
- `/api/executive/decompose`
- `/api/executive/programs`
- `/api/fabric/enroll`
- `/api/fabric/enrollments`
- `/api/factory/demands`
- `/api/factory/generate`
- `/api/fenix/jobs`
- `/api/fenix/memory/invalidate`
- `/api/fenix/memory/metrics`
- `/api/fenix/memory/promote`
- `/api/fenix/memory/reuse`
- `/api/fenix/memory/search`
- `/api/fenix/mission-events`
- `/api/fenix/missions`
- `/api/fenix/projects`
- `/api/fenix/providers`
- `/api/governance/gatekeeper`
- `/api/governance/production-readiness`
- `/api/governance/readiness-matrix`
- `/api/governance/simulation-audit`
- `/api/graph`
- `/api/hypotheses`
- `/api/insights`
- `/api/inspections`
- `/api/jobs`
- `/api/keos/adapters/ai`
- `/api/keos/adapters/tech`
- `/api/keos/constitution/index`
- `/api/keos/constitution/load-sparse`
- `/api/keos/pipeline/promote`
- `/api/keos/ucp/process`
- `/api/knowledge-federation/ingest`
- `/api/knowledge-federation/publications`
- `/api/knowledge-federation/publish`
- `/api/knowledge-genome/capsules`
- `/api/knowledge-graph/anomalies`
- `/api/knowledge-graph/entities`
- `/api/knowledge-graph/path`
- `/api/knowledge-graph/relationships`
- `/api/login`
- `/api/logout`
- `/api/me`
- `/api/memories`
- `/api/memories/consolidate`
- `/api/memories/search`
- `/api/memory/consolidate`
- `/api/memory/search`
- `/api/memory/write`
- `/api/missions`
- `/api/missions/avatar-state`
- `/api/missions/plan`
- `/api/missions/plans`
- `/api/missions/reconcile`
- `/api/models/catalog`
- `/api/models/execute`
- `/api/multimodal/ingest`
- `/api/nexus/bus/emit`
- `/api/nexus/command-center`
- `/api/nexus/marketplace/list`
- `/api/nexus/marketplace/publish`
- `/api/nexus/simulate-impact`
- `/api/nexus/timeline/feed`
- `/api/nexus/ucc/status`
- `/api/observability/live`
- `/api/observability/metrics`
- `/api/observability/series`
- `/api/observability/series/sample`
- `/api/office`
- `/api/oidc/config`
- `/api/omega-infinity/crystal/state`
- `/api/omega-infinity/dna/compile`
- `/api/omega-infinity/laws/verify`
- `/api/omega-infinity/meta/index`
- `/api/omega-infinity/physics/universe`
- `/api/omega-infinity/reality/feedback`
- `/api/omega/brains/fuse`
- `/api/omega/brains/list`
- `/api/omega/council/evaluate`
- `/api/omega/council/members`
- `/api/omega/economy/route-check`
- `/api/omega/fabric/atoms`
- `/api/omega/fabric/density`
- `/api/omega/research/scan`
- `/api/omega/v2/consensus/debate`
- `/api/omega/v2/consensus/models`
- `/api/omega/v2/context/expand`
- `/api/omega/v2/human-twin/autopilot`
- `/api/omega/v2/human-twin/cop`
- `/api/omega/v2/recursive/refine`
- `/api/onedeploy/analyzers/backend`
- `/api/onedeploy/analyzers/frontend`
- `/api/onedeploy/continuous-improvement/idle-scan`
- `/api/onedeploy/e2e/run`
- `/api/onedeploy/run-pipeline`
- `/api/onedeploy/scan-project`
- `/api/onedeploy/smoke-tests/run`
- `/api/operations/activate`
- `/api/operations/assurances`
- `/api/operations/daily-intelligence`
- `/api/operations/deploys`
- `/api/operations/deploys/rollback`
- `/api/operations/history`
- `/api/operations/observability/metrics`
- `/api/operations/schedules`
- `/api/operations/stability-report`
- `/api/operations/state`
- `/api/ops/github/issues`
- `/api/ops/github/orgs`
- `/api/ops/github/prs`
- `/api/ops/master-node/self-deploy`
- `/api/ops/master-node/status`
- `/api/ops/vps/plans`
- `/api/ops/vps/servers`
- `/api/optimization/distill`
- `/api/optimization/health-index`
- `/api/optimization/never-repeat-check`
- `/api/orchestrate`
- `/api/orchestrator/mission/approve`
- `/api/orchestrator/mission/decompose`
- `/api/organism/identity`
- `/api/overview`
- `/api/performance/hot-memory`
- `/api/performance/predictive-prefetch`
- `/api/performance/speed-score`
- `/api/plugins/install`
- `/api/plugins/marketplace`
- `/api/projects`
- `/api/registry`
- `/api/repositories`
- `/api/rollbacks`
- `/api/runtime`
- `/api/runtime/ai/health`
- `/api/runtime/ai/usage`
- `/api/runtime/capabilities`
- `/api/runtime/jobs`
- `/api/runtime/schedules`
- `/api/runtime/services`
- `/api/runtime/tick`
- `/api/runtime/work`
- `/api/scos/design-families/list`
- `/api/scos/design-tokens`
- `/api/scos/evolution/metrics`
- `/api/scos/factory/generate-multi-design`
- `/api/scos/factory/slices`
- `/api/scos/factory/sync-contract`
- `/api/scos/genome/structure`
- `/api/scos/visual-reasoning`
- `/api/search`
- `/api/security/encryption/status`
- `/api/security/encryption/tokenize`
- `/api/skills`
- `/api/skills/evolution`
- `/api/skills/select`
- `/api/system/boot-status`
- `/api/system/observability`
- `/api/test/event`
- `/api/twins`
- `/api/uios/capos/list`
- `/api/uios/capos/register`
- `/api/uios/compiler/compile`
- `/api/uios/factory/create`
- `/api/uios/kos/manifest`
- `/api/uios/kos/semantic-load`
- `/api/uios/world-model/state`
- `/api/v2/jobs/enqueue`
- `/api/v2/public/events`
- `/api/v2/public/projects`
- `/api/v2/public/queue`
- `/api/v2/public/status`
- `/api/versions`
- `/api/versions/diff`
- `/api/workforces`
- `/api/workspace/eca/daily-brief`
- `/api/workspace/eca/decision`
- `/api/workspace/eca/evening-report`
- `/api/workspace/eca/inbox`
- `/api/workspace/mode`
- `/api/workspace/presence/config`
- `/favicon.ico`
- `/health`
- `/metrics`
- `/runtime/ai/health`
- `/runtime/ai/usage`
- `/runtime/snapshot`

## `grg/qa-results/vps-active-agent/universal-system-routes.remote.js` — 43 endpoints

- `/api/v2/city/event`
- `/api/v2/fenix/engine/health`
- `/api/v2/fenix/engine/status`
- `/api/v2/fenix/intelligence/agents`
- `/api/v2/fenix/intelligence/analyze`
- `/api/v2/fenix/intelligence/execute`
- `/api/v2/fenix/intelligence/mission`
- `/api/v2/fenix/intelligence/missions`
- `/api/v2/fenix/intelligence/plan`
- `/api/v2/fenix/intelligence/request`
- `/api/v2/fenix/intelligence/review`
- `/api/v2/intelligence/dashboard-v2`
- `/api/v2/intelligence/request`
- `/api/v2/learning/metrics`
- `/api/v2/learning/task`
- `/api/v2/living-city/unreal/manifest`
- `/api/v2/living-city/unreal/payload`
- `/api/v2/living-city/world-state`
- `/api/v2/memory/capability/lookup`
- `/api/v2/memory/capability/match`
- `/api/v2/memory/conflict`
- `/api/v2/memory/errors`
- `/api/v2/memory/experiences`
- `/api/v2/memory/feedback`
- `/api/v2/memory/knowledge`
- `/api/v2/memory/levels`
- `/api/v2/memory/reborn`
- `/api/v2/memory/reborn/consolidate`
- `/api/v2/memory/trace-impact`
- `/api/v2/memory/trace-why`
- `/api/v2/mirror/impact-analysis`
- `/api/v2/mirror/projects`
- `/api/v2/mirror/screen-graph`
- `/api/v2/mirror/screen-graph/query`
- `/api/v2/mirror/screens`
- `/api/v2/model-memory`
- `/api/v2/observatory/evolution`
- `/api/v2/observatory/gaps`
- `/api/v2/observatory/summary`
- `/api/v2/observatory/twins/project`
- `/api/v2/observatory/twins/screen`
- `/api/v2/observatory/unknowns`
- `/api/v2/observatory/visual-dna`

## `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/api/cloud-routes.js` — 3 endpoints

- `/api/dev/jobs`
- `/api/dev/projects`
- `/api/dev/tasks`

## `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/api/developer-routes.js` — 10 endpoints

- `/api/dev/ai/transform-file`
- `/api/dev/fs`
- `/api/dev/fs/delete`
- `/api/dev/fs/file`
- `/api/dev/fs/mkdir`
- `/api/dev/fs/move`
- `/api/dev/pipeline`
- `/api/dev/projects/clone`
- `/api/dev/small-task`
- `/api/dev/terminal`

## `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/api/living-city-routes.js` — 12 endpoints

- `GET /api/v2/intelligence/dashboard`
- `GET /api/v2/living-city/agent/:id`
- `GET /api/v2/living-city/agents`
- `GET /api/v2/living-city/districts`
- `GET /api/v2/living-city/state`
- `GET /api/v2/living-city/world-model`
- `GET /api/v2/memory/skills`
- `GET /api/v2/memory/snapshot`
- `GET /api/v2/model-registry`
- `POST /api/v2/living-city/agent/:id/experience`
- `POST /api/v2/living-city/agent/:id/meet`
- `POST /api/v2/memory/experience`

## `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/api/orchestration-routes.js` — 2 endpoints

- `/api/orchestration/events`
- `/api/orchestration/requests`

## `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/api/product-experience-routes.js` — 75 endpoints

- `/api/v2/agentic/execute`
- `/api/v2/agents/live-states`
- `/api/v2/agents/orchestrate`
- `/api/v2/ai-platform/chat`
- `/api/v2/ai-platform/status`
- `/api/v2/ai/providers`
- `/api/v2/city/state`
- `/api/v2/compiler/compile`
- `/api/v2/compiler/skills`
- `/api/v2/computer/audit-log`
- `/api/v2/computer/execute-action`
- `/api/v2/connections`
- `/api/v2/connections/oauth/callback`
- `/api/v2/connections/request`
- `/api/v2/context/build`
- `/api/v2/cross-project/query`
- `/api/v2/devices`
- `/api/v2/devices/GRG-WINDOWS-01/screen/live`
- `/api/v2/devices/auth/challenge`
- `/api/v2/devices/auth/verify`
- `/api/v2/devices/emergency-stop`
- `/api/v2/devices/mobile/groups`
- `/api/v2/devices/mobile/pairing/claim`
- `/api/v2/devices/mobile/pairing/create`
- `/api/v2/devices/register`
- `/api/v2/devices/windows/screen/live`
- `/api/v2/economy/compress-context`
- `/api/v2/economy/mode`
- `/api/v2/economy/record-call`
- `/api/v2/economy/report`
- `/api/v2/events/stream`
- `/api/v2/factory/rebuild`
- `/api/v2/frontend-reality/audit`
- `/api/v2/frontend-reality/click-test`
- `/api/v2/frontend-reality/correlate`
- `/api/v2/frontend-reality/design-system`
- `/api/v2/frontend-reality/navigation-graph`
- `/api/v2/frontend-reality/repair`
- `/api/v2/frontend-reality/scan`
- `/api/v2/frontend-reality/screens`
- `/api/v2/jarvis/daily-operations`
- `/api/v2/jarvis/heartbeat/tick`
- `/api/v2/jarvis/jobs`
- `/api/v2/jarvis/jobs/queue`
- `/api/v2/jarvis/jobs/submit`
- `/api/v2/jarvis/opportunities`
- `/api/v2/memory/development`
- `/api/v2/memory/development/patterns`
- `/api/v2/memory/development/record`
- `/api/v2/memory/development/retrieve`
- `/api/v2/mind/ingest`
- `/api/v2/mind/memory/conversations`
- `/api/v2/mind/models`
- `/api/v2/mind/research`
- `/api/v2/mind/vision`
- `/api/v2/model-router/registry`
- `/api/v2/model-router/route`
- `/api/v2/onboarding/import`
- `/api/v2/projects`
- `/api/v2/projects/discover/scan`
- `/api/v2/projects/discovered`
- `/api/v2/projects/github`
- `/api/v2/proxy/vps-docs`
- `/api/v2/proxy/vps-health`
- `/api/v2/reality/enforce`
- `/api/v2/telemetry/full`
- `/api/v2/test-fail`
- `/api/v2/vision/apply-visual-change`
- `/api/v2/vision/inspect-element`
- `/api/v2/visual/mutate`
- `/api/v2/voice/alexa`
- `/api/v2/voice/alexa/health`
- `/api/v2/voice/alexa/status`
- `/api/v2/voice/desktop/ingest`
- `/api/v2/vps-chat`

## `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/api/project-mirror-routes.js` — 7 endpoints

- `/api/project-mirror`
- `/api/project-mirror/asset`
- `/api/project-mirror/preview`
- `/api/project-mirror/projects`
- `/api/project-mirror/scan`
- `/api/project-mirror/screens`
- `/api/project-mirror/source`

## `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/api/projects-registry-routes.js` — 1 endpoints

- `/api/v2/projects-registry`

## `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/api/runtime-full-status.js` — 1 endpoints

- `/api/v2/runtime/full-status`

## `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/api/universal-job-routes.js` — 5 endpoints

- `/api/jobs`
- `/api/v2/jobs`
- `/api/v2/jobs/run-batch`
- `/api/v2/system/status`
- `/api/workers`

## `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/api/universal-system-routes.js` — 8 endpoints

- `/api/v2/city/event`
- `/api/v2/intelligence/dashboard-v2`
- `/api/v2/learning/metrics`
- `/api/v2/learning/task`
- `/api/v2/memory/errors`
- `/api/v2/memory/experiences`
- `/api/v2/memory/knowledge`
- `/api/v2/model-memory`

## `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/chat/live-chat-routes.js` — 4 endpoints

- `/api/chat/abort`
- `/api/chat/conversations`
- `/api/chat/preferences`
- `/api/chat/stream`

## `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/devices/agent-runtime/windows-agent.js` — 2 endpoints

- `/health`
- `/voice/talk`

## `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/eventing/fenix-event-bus.js` — 2 endpoints

- `/api/v2/events/history`
- `/api/v2/events/stream`

## `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/knowledge/knowledge-routes.js` — 10 endpoints

- `/api/artifacts`
- `/api/conversations`
- `/api/kernel`
- `/api/knowledge`
- `/api/memory`
- `/api/missions`
- `/api/provider-health`
- `/api/providers`
- `/api/storage`
- `/api/vector`

## `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/missions/mission-routes.js` — 7 endpoints

- `/api/estimates`
- `/api/jobs`
- `/api/orchestrator/status`
- `/api/plans`
- `/api/providers`
- `/api/workers`
- `/api/workers/health`

## `grg/qa-results/zero-regression-20260914/vps-active-source/grg/src/server.js` — 235 endpoints

- `/api/agents/cycles`
- `/api/agents/delegations`
- `/api/agents/knowledge-proposals`
- `/api/agents/panel`
- `/api/agents/swarm`
- `/api/agents/swarm/events`
- `/api/agents/tasks`
- `/api/ai/router/select`
- `/api/ai/telemetry`
- `/api/approvals`
- `/api/audit`
- `/api/autonomous/cycle`
- `/api/avatar/message`
- `/api/capabilities`
- `/api/chat`
- `/api/chat/intent`
- `/api/city`
- `/api/city/npc/chat`
- `/api/city/npc/list`
- `/api/city/rebuild`
- `/api/cognitive/access-grants`
- `/api/cognitive/avatar/improvements`
- `/api/cognitive/avatar/state`
- `/api/cognitive/background/run`
- `/api/cognitive/context`
- `/api/cognitive/cycle`
- `/api/cognitive/dashboard`
- `/api/cognitive/entities`
- `/api/cognitive/goals`
- `/api/cognitive/hypotheses`
- `/api/cognitive/knowledge-sharing-policies`
- `/api/cognitive/search`
- `/api/company/calendar`
- `/api/company/daily-analysis`
- `/api/connection`
- `/api/connection/check`
- `/api/connectors`
- `/api/context`
- `/api/cross-project/analysis`
- `/api/digital-twin/city-state`
- `/api/digital-twin/operational`
- `/api/discovery-network/inventory`
- `/api/discovery-network/scan`
- `/api/events`
- `/api/evolution`
- `/api/evolution-proposals`
- `/api/evolution/backlog`
- `/api/execution/sandbox`
- `/api/execution/scripts`
- `/api/execution/signers`
- `/api/execution/tools`
- `/api/executive/decompose`
- `/api/executive/programs`
- `/api/fabric/enroll`
- `/api/fabric/enrollments`
- `/api/factory/demands`
- `/api/factory/generate`
- `/api/fenix/jobs`
- `/api/fenix/memory/invalidate`
- `/api/fenix/memory/metrics`
- `/api/fenix/memory/promote`
- `/api/fenix/memory/reuse`
- `/api/fenix/memory/search`
- `/api/fenix/mission-events`
- `/api/fenix/missions`
- `/api/fenix/projects`
- `/api/fenix/providers`
- `/api/governance/gatekeeper`
- `/api/governance/production-readiness`
- `/api/governance/readiness-matrix`
- `/api/governance/simulation-audit`
- `/api/graph`
- `/api/hypotheses`
- `/api/insights`
- `/api/inspections`
- `/api/jobs`
- `/api/keos/adapters/ai`
- `/api/keos/adapters/tech`
- `/api/keos/constitution/index`
- `/api/keos/constitution/load-sparse`
- `/api/keos/pipeline/promote`
- `/api/keos/ucp/process`
- `/api/knowledge-federation/ingest`
- `/api/knowledge-federation/publications`
- `/api/knowledge-federation/publish`
- `/api/knowledge-genome/capsules`
- `/api/knowledge-graph/anomalies`
- `/api/knowledge-graph/entities`
- `/api/knowledge-graph/path`
- `/api/knowledge-graph/relationships`
- `/api/login`
- `/api/logout`
- `/api/me`
- `/api/memories`
- `/api/memories/consolidate`
- `/api/memories/search`
- `/api/memory/consolidate`
- `/api/memory/search`
- `/api/memory/write`
- `/api/missions`
- `/api/missions/avatar-state`
- `/api/missions/plan`
- `/api/missions/plans`
- `/api/missions/reconcile`
- `/api/models/catalog`
- `/api/models/execute`
- `/api/multimodal/ingest`
- `/api/nexus/bus/emit`
- `/api/nexus/command-center`
- `/api/nexus/marketplace/list`
- `/api/nexus/marketplace/publish`
- `/api/nexus/simulate-impact`
- `/api/nexus/timeline/feed`
- `/api/nexus/ucc/status`
- `/api/observability/live`
- `/api/observability/metrics`
- `/api/observability/series`
- `/api/observability/series/sample`
- `/api/office`
- `/api/oidc/config`
- `/api/omega-infinity/crystal/state`
- `/api/omega-infinity/dna/compile`
- `/api/omega-infinity/laws/verify`
- `/api/omega-infinity/meta/index`
- `/api/omega-infinity/physics/universe`
- `/api/omega-infinity/reality/feedback`
- `/api/omega/brains/fuse`
- `/api/omega/brains/list`
- `/api/omega/council/evaluate`
- `/api/omega/council/members`
- `/api/omega/economy/route-check`
- `/api/omega/fabric/atoms`
- `/api/omega/fabric/density`
- `/api/omega/research/scan`
- `/api/omega/v2/consensus/debate`
- `/api/omega/v2/consensus/models`
- `/api/omega/v2/context/expand`
- `/api/omega/v2/human-twin/autopilot`
- `/api/omega/v2/human-twin/cop`
- `/api/omega/v2/recursive/refine`
- `/api/onedeploy/analyzers/backend`
- `/api/onedeploy/analyzers/frontend`
- `/api/onedeploy/continuous-improvement/idle-scan`
- `/api/onedeploy/e2e/run`
- `/api/onedeploy/run-pipeline`
- `/api/onedeploy/scan-project`
- `/api/onedeploy/smoke-tests/run`
- `/api/operations/activate`
- `/api/operations/assurances`
- `/api/operations/daily-intelligence`
- `/api/operations/deploys`
- `/api/operations/deploys/rollback`
- `/api/operations/history`
- `/api/operations/observability/metrics`
- `/api/operations/schedules`
- `/api/operations/stability-report`
- `/api/operations/state`
- `/api/ops/github/issues`
- `/api/ops/github/orgs`
- `/api/ops/github/prs`
- `/api/ops/master-node/self-deploy`
- `/api/ops/master-node/status`
- `/api/ops/vps/plans`
- `/api/ops/vps/servers`
- `/api/optimization/distill`
- `/api/optimization/health-index`
- `/api/optimization/never-repeat-check`
- `/api/orchestrate`
- `/api/orchestrator/mission/approve`
- `/api/orchestrator/mission/decompose`
- `/api/organism/identity`
- `/api/overview`
- `/api/performance/hot-memory`
- `/api/performance/predictive-prefetch`
- `/api/performance/speed-score`
- `/api/plugins/install`
- `/api/plugins/marketplace`
- `/api/projects`
- `/api/registry`
- `/api/repositories`
- `/api/rollbacks`
- `/api/runtime`
- `/api/runtime/ai/health`
- `/api/runtime/ai/usage`
- `/api/runtime/capabilities`
- `/api/runtime/jobs`
- `/api/runtime/schedules`
- `/api/runtime/services`
- `/api/runtime/tick`
- `/api/runtime/work`
- `/api/scos/design-families/list`
- `/api/scos/design-tokens`
- `/api/scos/evolution/metrics`
- `/api/scos/factory/generate-multi-design`
- `/api/scos/factory/slices`
- `/api/scos/factory/sync-contract`
- `/api/scos/genome/structure`
- `/api/scos/visual-reasoning`
- `/api/search`
- `/api/security/encryption/status`
- `/api/security/encryption/tokenize`
- `/api/skills`
- `/api/skills/evolution`
- `/api/skills/select`
- `/api/system/boot-status`
- `/api/system/observability`
- `/api/test/event`
- `/api/twins`
- `/api/uios/capos/list`
- `/api/uios/capos/register`
- `/api/uios/compiler/compile`
- `/api/uios/factory/create`
- `/api/uios/kos/manifest`
- `/api/uios/kos/semantic-load`
- `/api/uios/world-model/state`
- `/api/v2/jobs/enqueue`
- `/api/v2/public/events`
- `/api/v2/public/projects`
- `/api/v2/public/queue`
- `/api/v2/public/status`
- `/api/versions`
- `/api/versions/diff`
- `/api/workforces`
- `/api/workspace/eca/daily-brief`
- `/api/workspace/eca/decision`
- `/api/workspace/eca/evening-report`
- `/api/workspace/eca/inbox`
- `/api/workspace/mode`
- `/api/workspace/presence/config`
- `/favicon.ico`
- `/health`
- `/metrics`
- `/runtime/ai/health`
- `/runtime/ai/usage`
- `/runtime/snapshot`

## `grg/scripts/patch-server-login.js` — 1 endpoints

- `/api/login`

## `grg/src/api/cloud-routes.js` — 3 endpoints

- `/api/dev/jobs`
- `/api/dev/projects`
- `/api/dev/tasks`

## `grg/src/api/developer-routes.js` — 10 endpoints

- `/api/dev/ai/transform-file`
- `/api/dev/fs`
- `/api/dev/fs/delete`
- `/api/dev/fs/file`
- `/api/dev/fs/mkdir`
- `/api/dev/fs/move`
- `/api/dev/pipeline`
- `/api/dev/projects/clone`
- `/api/dev/small-task`
- `/api/dev/terminal`

## `grg/src/api/living-city-routes.js` — 13 endpoints

- `/api/v2/living-city/agent/message`
- `/api/v2/living-city/command`
- `/api/v2/living-city/commands`
- `/api/v2/living-city/companies`
- `/api/v2/living-city/constructions`
- `/api/v2/living-city/director/trigger`
- `/api/v2/living-city/events`
- `/api/v2/living-city/events/stream`
- `/api/v2/living-city/mutation`
- `/api/v2/living-city/network-graph`
- `/api/v2/living-city/projects`
- `/api/v2/living-city/vehicles`
- `/api/v2/living-city/world-state`

## `grg/src/api/media-routes.js` — 2 endpoints

- `/api/media/assets`
- `/api/media/search`

## `grg/src/api/orchestration-routes.js` — 2 endpoints

- `/api/orchestration/events`
- `/api/orchestration/requests`

## `grg/src/api/product-experience-routes.js` — 75 endpoints

- `/api/v2/agentic/execute`
- `/api/v2/agents/live-states`
- `/api/v2/agents/orchestrate`
- `/api/v2/ai-platform/chat`
- `/api/v2/ai-platform/status`
- `/api/v2/ai/providers`
- `/api/v2/city/state`
- `/api/v2/compiler/compile`
- `/api/v2/compiler/skills`
- `/api/v2/computer/audit-log`
- `/api/v2/computer/execute-action`
- `/api/v2/connections`
- `/api/v2/connections/oauth/callback`
- `/api/v2/connections/request`
- `/api/v2/context/build`
- `/api/v2/cross-project/query`
- `/api/v2/devices`
- `/api/v2/devices/GRG-WINDOWS-01/screen/live`
- `/api/v2/devices/auth/challenge`
- `/api/v2/devices/auth/verify`
- `/api/v2/devices/emergency-stop`
- `/api/v2/devices/mobile/groups`
- `/api/v2/devices/mobile/pairing/claim`
- `/api/v2/devices/mobile/pairing/create`
- `/api/v2/devices/register`
- `/api/v2/devices/windows/screen/live`
- `/api/v2/economy/compress-context`
- `/api/v2/economy/mode`
- `/api/v2/economy/record-call`
- `/api/v2/economy/report`
- `/api/v2/events/stream`
- `/api/v2/factory/rebuild`
- `/api/v2/frontend-reality/audit`
- `/api/v2/frontend-reality/click-test`
- `/api/v2/frontend-reality/correlate`
- `/api/v2/frontend-reality/design-system`
- `/api/v2/frontend-reality/navigation-graph`
- `/api/v2/frontend-reality/repair`
- `/api/v2/frontend-reality/scan`
- `/api/v2/frontend-reality/screens`
- `/api/v2/jarvis/daily-operations`
- `/api/v2/jarvis/heartbeat/tick`
- `/api/v2/jarvis/jobs`
- `/api/v2/jarvis/jobs/queue`
- `/api/v2/jarvis/jobs/submit`
- `/api/v2/jarvis/opportunities`
- `/api/v2/memory/development`
- `/api/v2/memory/development/patterns`
- `/api/v2/memory/development/record`
- `/api/v2/memory/development/retrieve`
- `/api/v2/mind/ingest`
- `/api/v2/mind/memory/conversations`
- `/api/v2/mind/models`
- `/api/v2/mind/research`
- `/api/v2/mind/vision`
- `/api/v2/model-router/registry`
- `/api/v2/model-router/route`
- `/api/v2/onboarding/import`
- `/api/v2/projects`
- `/api/v2/projects/discover/scan`
- `/api/v2/projects/discovered`
- `/api/v2/projects/github`
- `/api/v2/proxy/vps-docs`
- `/api/v2/proxy/vps-health`
- `/api/v2/reality/enforce`
- `/api/v2/telemetry/full`
- `/api/v2/test-fail`
- `/api/v2/vision/apply-visual-change`
- `/api/v2/vision/inspect-element`
- `/api/v2/visual/mutate`
- `/api/v2/voice/alexa`
- `/api/v2/voice/alexa/health`
- `/api/v2/voice/alexa/status`
- `/api/v2/voice/desktop/ingest`
- `/api/v2/vps-chat`

## `grg/src/api/project-git-routes.js` — 8 endpoints

- `/api/fenix/github/account`
- `/api/fenix/github/connect`
- `/api/fenix/github/disconnect`
- `/api/fenix/github/repos`
- `/api/fenix/github/repos/activate`
- `/api/fenix/github/repos/create`
- `/api/fenix/projects/clone`
- `/api/project-git/deploy`

## `grg/src/api/project-mirror-routes.js` — 8 endpoints

- `/api/project-mirror`
- `/api/project-mirror/asset`
- `/api/project-mirror/file`
- `/api/project-mirror/preview`
- `/api/project-mirror/projects`
- `/api/project-mirror/scan`
- `/api/project-mirror/screens`
- `/api/project-mirror/source`

## `grg/src/api/projects-registry-routes.js` — 1 endpoints

- `/api/v2/projects-registry`

## `grg/src/api/runtime-full-status.js` — 1 endpoints

- `/api/v2/runtime/full-status`

## `grg/src/api/universal-job-routes.js` — 5 endpoints

- `/api/v2/jobs`
- `/api/v2/jobs/run-batch`
- `/api/v2/queue/status`
- `/api/v2/system/status`
- `/api/workers`

## `grg/src/chat/live-chat-routes.js` — 4 endpoints

- `/api/chat/abort`
- `/api/chat/conversations`
- `/api/chat/preferences`
- `/api/chat/stream`

## `grg/src/devices/agent-runtime/windows-agent.js` — 2 endpoints

- `/health`
- `/voice/talk`

## `grg/src/eventing/fenix-event-bus.js` — 2 endpoints

- `/api/v2/events/history`
- `/api/v2/events/stream`

## `grg/src/evolution/fenix-evolution-worker.js` — 8 endpoints

- `/health`
- `/queue`
- `/queue/enqueue`
- `/session/abort`
- `/session/pause`
- `/session/resume`
- `/status`
- `/tick`

## `grg/src/knowledge/knowledge-routes.js` — 10 endpoints

- `/api/artifacts`
- `/api/conversations`
- `/api/kernel`
- `/api/knowledge`
- `/api/memory`
- `/api/missions`
- `/api/provider-health`
- `/api/providers`
- `/api/storage`
- `/api/vector`

## `grg/src/missions/mission-routes.js` — 7 endpoints

- `/api/estimates`
- `/api/jobs`
- `/api/orchestrator/status`
- `/api/plans`
- `/api/providers`
- `/api/workers`
- `/api/workers/health`

## `grg/src/ops/fenix-supervisor.js` — 2 endpoints

- `/health`
- `/status`

## `grg/src/server.js` — 246 endpoints

- `/api/agents/cycles`
- `/api/agents/delegations`
- `/api/agents/knowledge-proposals`
- `/api/agents/panel`
- `/api/agents/swarm`
- `/api/agents/swarm/events`
- `/api/agents/tasks`
- `/api/ai/cascade`
- `/api/ai/classify`
- `/api/ai/handoff`
- `/api/ai/lanes`
- `/api/ai/router/select`
- `/api/ai/telemetry`
- `/api/api-platform/health`
- `/api/approvals`
- `/api/audit`
- `/api/autonomous/cycle`
- `/api/avatar/message`
- `/api/capabilities`
- `/api/chat`
- `/api/chat/intent`
- `/api/city`
- `/api/city/live-stream`
- `/api/city/npc/chat`
- `/api/city/npc/list`
- `/api/city/rebuild`
- `/api/cognitive/access-grants`
- `/api/cognitive/avatar/improvements`
- `/api/cognitive/avatar/state`
- `/api/cognitive/background/run`
- `/api/cognitive/context`
- `/api/cognitive/cycle`
- `/api/cognitive/dashboard`
- `/api/cognitive/entities`
- `/api/cognitive/goals`
- `/api/cognitive/hypotheses`
- `/api/cognitive/knowledge-sharing-policies`
- `/api/cognitive/search`
- `/api/company/calendar`
- `/api/company/daily-analysis`
- `/api/connection`
- `/api/connection/check`
- `/api/connectors`
- `/api/context`
- `/api/cross-project/analysis`
- `/api/digital-twin/city-state`
- `/api/digital-twin/operational`
- `/api/discovery-network/inventory`
- `/api/discovery-network/scan`
- `/api/events`
- `/api/evolution`
- `/api/evolution-proposals`
- `/api/evolution/backlog`
- `/api/execution/sandbox`
- `/api/execution/scripts`
- `/api/execution/signers`
- `/api/execution/tools`
- `/api/executive/decompose`
- `/api/executive/programs`
- `/api/fabric/enroll`
- `/api/fabric/enrollments`
- `/api/factory/demands`
- `/api/factory/generate`
- `/api/fenix/jobs`
- `/api/fenix/memory/invalidate`
- `/api/fenix/memory/metrics`
- `/api/fenix/memory/promote`
- `/api/fenix/memory/reuse`
- `/api/fenix/memory/search`
- `/api/fenix/mission-events`
- `/api/fenix/missions`
- `/api/fenix/projects`
- `/api/fenix/providers`
- `/api/governance/gatekeeper`
- `/api/governance/production-readiness`
- `/api/governance/readiness-matrix`
- `/api/governance/simulation-audit`
- `/api/graph`
- `/api/heart/economy`
- `/api/heart/fast-lane`
- `/api/heart/recover`
- `/api/heart/schedules`
- `/api/heart/status`
- `/api/heart/stream`
- `/api/heart/timers`
- `/api/hypotheses`
- `/api/insights`
- `/api/inspections`
- `/api/jobs`
- `/api/keos/adapters/ai`
- `/api/keos/adapters/tech`
- `/api/keos/constitution/index`
- `/api/keos/constitution/load-sparse`
- `/api/keos/pipeline/promote`
- `/api/keos/ucp/process`
- `/api/knowledge-federation/ingest`
- `/api/knowledge-federation/publications`
- `/api/knowledge-federation/publish`
- `/api/knowledge-genome/capsules`
- `/api/knowledge-graph/anomalies`
- `/api/knowledge-graph/entities`
- `/api/knowledge-graph/path`
- `/api/knowledge-graph/relationships`
- `/api/login`
- `/api/logout`
- `/api/me`
- `/api/memories`
- `/api/memories/consolidate`
- `/api/memories/search`
- `/api/memory/consolidate`
- `/api/memory/search`
- `/api/memory/write`
- `/api/missions`
- `/api/missions/avatar-state`
- `/api/missions/plan`
- `/api/missions/plans`
- `/api/missions/reconcile`
- `/api/models/catalog`
- `/api/models/execute`
- `/api/multimodal/ingest`
- `/api/nexus/bus/emit`
- `/api/nexus/command-center`
- `/api/nexus/marketplace/list`
- `/api/nexus/marketplace/publish`
- `/api/nexus/simulate-impact`
- `/api/nexus/timeline/feed`
- `/api/nexus/ucc/status`
- `/api/observability/live`
- `/api/observability/metrics`
- `/api/observability/series`
- `/api/observability/series/sample`
- `/api/office`
- `/api/oidc/config`
- `/api/omega-infinity/crystal/state`
- `/api/omega-infinity/dna/compile`
- `/api/omega-infinity/laws/verify`
- `/api/omega-infinity/meta/index`
- `/api/omega-infinity/physics/universe`
- `/api/omega-infinity/reality/feedback`
- `/api/omega/brains/fuse`
- `/api/omega/brains/list`
- `/api/omega/council/evaluate`
- `/api/omega/council/members`
- `/api/omega/economy/route-check`
- `/api/omega/fabric/atoms`
- `/api/omega/fabric/density`
- `/api/omega/research/scan`
- `/api/omega/v2/consensus/debate`
- `/api/omega/v2/consensus/models`
- `/api/omega/v2/context/expand`
- `/api/omega/v2/human-twin/autopilot`
- `/api/omega/v2/human-twin/cop`
- `/api/omega/v2/recursive/refine`
- `/api/onedeploy/analyzers/backend`
- `/api/onedeploy/analyzers/frontend`
- `/api/onedeploy/continuous-improvement/idle-scan`
- `/api/onedeploy/e2e/run`
- `/api/onedeploy/run-pipeline`
- `/api/onedeploy/scan-project`
- `/api/onedeploy/smoke-tests/run`
- `/api/operations/activate`
- `/api/operations/assurances`
- `/api/operations/daily-intelligence`
- `/api/operations/deploys`
- `/api/operations/deploys/rollback`
- `/api/operations/history`
- `/api/operations/observability/metrics`
- `/api/operations/schedules`
- `/api/operations/stability-report`
- `/api/operations/state`
- `/api/ops/github/issues`
- `/api/ops/github/orgs`
- `/api/ops/github/prs`
- `/api/ops/master-node/self-deploy`
- `/api/ops/master-node/status`
- `/api/ops/vps/plans`
- `/api/ops/vps/servers`
- `/api/optimization/distill`
- `/api/optimization/health-index`
- `/api/optimization/never-repeat-check`
- `/api/orchestrate`
- `/api/orchestrator/mission/approve`
- `/api/orchestrator/mission/decompose`
- `/api/organism/identity`
- `/api/overview`
- `/api/performance/hot-memory`
- `/api/performance/predictive-prefetch`
- `/api/performance/speed-score`
- `/api/plugins/install`
- `/api/plugins/marketplace`
- `/api/projects`
- `/api/registry`
- `/api/repositories`
- `/api/rollbacks`
- `/api/runtime`
- `/api/runtime/ai/health`
- `/api/runtime/ai/usage`
- `/api/runtime/capabilities`
- `/api/runtime/jobs`
- `/api/runtime/schedules`
- `/api/runtime/services`
- `/api/runtime/tick`
- `/api/runtime/work`
- `/api/scos/design-families/list`
- `/api/scos/design-tokens`
- `/api/scos/evolution/metrics`
- `/api/scos/factory/generate-multi-design`
- `/api/scos/factory/slices`
- `/api/scos/factory/sync-contract`
- `/api/scos/genome/structure`
- `/api/scos/visual-reasoning`
- `/api/search`
- `/api/security/encryption/status`
- `/api/security/encryption/tokenize`
- `/api/skills`
- `/api/skills/evolution`
- `/api/skills/select`
- `/api/system/boot-status`
- `/api/system/health`
- `/api/system/observability`
- `/api/test/event`
- `/api/twins`
- `/api/uios/capos/list`
- `/api/uios/capos/register`
- `/api/uios/compiler/compile`
- `/api/uios/factory/create`
- `/api/uios/kos/manifest`
- `/api/uios/kos/semantic-load`
- `/api/uios/world-model/state`
- `/api/v2/api-platform/health`
- `/api/v2/system/health`
- `/api/versions`
- `/api/versions/diff`
- `/api/workforces`
- `/api/workspace/eca/daily-brief`
- `/api/workspace/eca/decision`
- `/api/workspace/eca/evening-report`
- `/api/workspace/eca/inbox`
- `/api/workspace/mode`
- `/api/workspace/presence/config`
- `/favicon.ico`
- `/health`
- `/metrics`
- `/runtime/ai/health`
- `/runtime/ai/usage`
- `/runtime/snapshot`

## `grg/test/chat.test.js` — 1 endpoints

- `POST /api/messages`

## `grg/test/digital-twin.test.js` — 2 endpoints

- `GET /health`
- `POST /api/messages`

## `grg/test/project-mirror.test.js` — 2 endpoints

- `GET /v1/providers`
- `POST /v1/text`

## `grg/test/project-understanding-evidence-map.test.js` — 1 endpoints

- `GET /api/health`

## `grg/test/project-understanding-kernel-analysis.test.js` — 1 endpoints

- `GET /api/health`

## `grg/test/project-understanding-workspace-ui.test.js` — 1 endpoints

- `GET /api/health`

## `grg/test/repo-intel.test.js` — 2 endpoints

- `GET /conversations`
- `POST /messages`

## `patch_backend.js` — 1 endpoints

- `/api/dev/pipeline`

## `patch_jobs_backend.js` — 1 endpoints

- `/api/dev/jobs`

## `platform/http/server.js` — 4 endpoints

- `/api/chat`
- `/api/dashboard`
- `/api/runtime`
- `/api/system`

## `platform/src/http/server-v2.js` — 18 endpoints

- `/api/v2/acep/compile`
- `/api/v2/acep/maturity`
- `/api/v2/acep/overview`
- `/api/v2/acep/simulate`
- `/api/v2/audit-logs`
- `/api/v2/auth/token`
- `/api/v2/graph`
- `/api/v2/lcr/chat`
- `/api/v2/lcr/realtime/audio`
- `/api/v2/lcr/realtime/interrupt`
- `/api/v2/lcr/realtime/session`
- `/api/v2/lcr/realtime/stream`
- `/api/v2/lcr/status`
- `/api/v2/members`
- `/api/v2/memory`
- `/api/v2/overview`
- `/api/v2/projects`
- `/health`

## `platform/src/http/server.js` — 4 endpoints

- `/api/v1/graph`
- `/api/v1/overview`
- `/api/v1/projects`
- `/health`

## `projects/API-PLATAFORM/apps/api/src/app.ts` — 4 endpoints

- `GET /`
- `GET /health`
- `GET /metrics`
- `GET /v1/health`

## `projects/API-PLATAFORM/apps/api/src/routes/admin/index.ts` — 1 endpoints

- `POST /login`

## `projects/API-PLATAFORM/apps/api/src/routes/v1/index.ts` — 41 endpoints

- `GET /comfyui/progress/:promptId`
- `GET /comfyui/queue`
- `GET /config`
- `GET /images/:id/file`
- `GET /jobs/:id`
- `GET /jobs/stats`
- `GET /models`
- `GET /providers`
- `GET /queue/status`
- `GET /runtime`
- `GET /sync/cluster`
- `POST /audio`
- `POST /chat`
- `POST /comfyui/cancel`
- `POST /config`
- `POST /controlnet`
- `POST /embed`
- `POST /embedding`
- `POST /history`
- `POST /image`
- `POST /image-gallery`
- `POST /image-multiangle`
- `POST /image-to-image`
- `POST /inpaint`
- `POST /jobs`
- `POST /jobs/batch`
- `POST /jobs/status`
- `POST /mission`
- `POST /ocr`
- `POST /outpaint`
- `POST /queue/enqueue`
- `POST /remove-background`
- `POST /sync/heartbeat`
- `POST /system/update`
- `POST /text`
- `POST /upload`
- `POST /upscale`
- `POST /video`
- `POST /video-to-image`
- `POST /vision`
- `POST /workflow`

## `projects/API-PLATAFORM/apps/api/src/routes/v1/memory.ts` — 2 endpoints

- `GET /memory/stats`
- `POST /memory/feedback`

## `projects/API-PLATAFORM/apps/api/src/routes/v1/reverse.ts` — 5 endpoints

- `DELETE /reverse/connectors/:id`
- `GET /reverse/connectors`
- `PATCH /reverse/connectors/:id`
- `POST /reverse/connectors`
- `POST /reverse/connectors/:id/poll`

## `projects/API-PLATAFORM/scripts/patch2.js` — 1 endpoints

- `POST /messages`

## `scratch_backend_jobs.js` — 1 endpoints

- `/api/dev/jobs`

## `temp_artifacts/fenix-clients-phase2/src/server.js` — 1 endpoints

- `/api/clients`

