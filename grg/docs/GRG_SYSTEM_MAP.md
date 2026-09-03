# GRG System Map

Status snapshot: 2026-09-03. This is an inventory of the existing runtime, not a redesign.

## Runtime path

`HTTP/UI -> intent/chat -> MissionPlanner/MissionKernel -> JobEngine -> local worker -> handlers -> EventBus/SSE -> validation/artifacts -> memory/evolution`

## Components

| Area | Evidence | Status |
|---|---|---|
| FÊNIX server/kernel | `src/server.js`, `src/kernel/runtime-kernel.js` | WORKING |
| AI Gateway | `src/ai-runtime/*`, API Platform `/v1` | WORKING |
| Missions/DAG | `src/missions/*`, `src/runtime/job-engine.js` | WORKING |
| Agents | `src/agents/*`, `src/missions/workers/*` | WORKING |
| Skills | `src/skills/*` | WORKING |
| Tools | `src/execution/tool-registry.js`, sandbox | PARTIAL |
| Events/realtime | EventBus, WebSocket bridge, SSE | WORKING |
| Projects/codebase | Project Mirror, repo-intel, graphify output | WORKING/PARTIAL |
| Memory/knowledge | `src/memory/*`, knowledge graph, local vector | WORKING/PARTIAL |
| Browser/visual QA | browser QA stage and frontend verifier | PARTIAL |
| MCP | connectors/MCP routes and resources | PARTIAL |
| Persistence | FileStore; Postgres/Redis adapters | WORKING/PARTIAL |
| Evolution | `src/evolution/evolution-engine.js` | WORKING |

## Verified behavior

- 14 application routes render with no browser errors.
- Mission Runtime completes a real health/report DAG and persists events.
- AI Platform returns live model output through `/api/v2/ai-platform/chat`.
- 44 focused runtime/API/evolution/security tests pass.

## Known boundary

The current local process uses FileStore, in-memory cache and local vector storage when external URLs are not configured. Production deployment requires environment-specific database, Redis, vector and provider credentials.
