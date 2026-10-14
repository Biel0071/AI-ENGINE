# Implementation Plan: Fênix Reality Compiler First Vertical Slice

## Overview

Continue the existing Fênix convergence by giving the active World3D renderer one owner, then connect a real organization intent to an ontology-backed blueprint, persistent world entities, Graph Brain relationships, the canonical event stream, and the existing City renderer. The first slice materializes one organization and one visible workspace building for an existing project. Departments, agents, jobs, AI planning, and procedural expansion remain later slices.

## Architecture Decisions

- Keep the existing `/api/v2/living-city/command`, `WorldStateEngine`, `WorldCommandEngine`, Graph Brain, and World3D renderer as the canonical path.
- Keep the server authoritative and persist the blueprint and materialized entities in the existing world-state store.
- Resolve the project from the selected project ID and reject unknown projects; do not invent project data or seed agents.
- Use deterministic compilation for the first slice and leave provider-backed planning out until it can be validated safely.
- Preserve the legacy `fenixCity` interface as an alias to the active World3D engine; do not create a second renderer.

## Task List

### Phase 0: Canonical City ownership
- [ ] Ensure the visible World3D engine is the sole City renderer and legacy controls resolve to it.
- [ ] Verify City agent sync, camera controls, focus, and legacy boot guards.

### Phase 1: Reality Compiler and persistence
- [x] Add an extensible ontology and deterministic organization-intent compiler.
- [x] Produce a versioned blueprint with project relationships and a construction plan.
- [x] Implement idempotent organization/building materialization in the existing WorldStateEngine store.
- [x] Add Graph Brain nodes/edges and canonical world events.
  - Implementation and local tests are complete; production materialization remains blocked by the missing authenticated browser session.

### Phase 2: Existing UI/API vertical slice
- [x] Route organization intents through the existing living-city command API.
- [x] Pass the selected project ID from the existing Command Center.
- [x] Refresh/focus the real building in the existing World3D renderer.
- [ ] Verify intent → blueprint → persisted state → graph → event → browser world with an authenticated production request.
  - The cockpit's duplicate input IDs were fixed and deployed. The only production POST attempted returned 401 before materialization.

### Phase 3: VPS verification and reports
- [x] Back up the exact deployed files and state before a targeted VPS deployment.
- [ ] Verify persistence across browser reload and a controlled process restart.
- [x] Create the evidence report with observed PASS/FAIL/PENDING states.
- [ ] Complete the requested VPS evidence matrix; only reboot the VPS after every production gate passes.
  - See `FENIX_WORLD_ENGINE_STATUS.md`; full City/NPC/SSE/AI/reboot certification remains pending.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Existing renderer call sites expect the legacy city object | Controls or inspectors stop working | Expose the existing World3D instance through `fenixCity` and test aliases before deployment |
| Production world state is persistent and already contains user data | Accidental overwrite or duplicate entities | Use the existing state file, deterministic IDs, idempotency checks, and a file backup before deploy |
| Local and deployed source trees diverge | Deployment could overwrite unrelated VPS changes | Compare target files and back up only the exact paths; deploy a narrow patch |
| Browser rendering many runtime entities can be expensive | Browser freeze | First slice renders one newly materialized building; no bulk agent spawning |

## Phase 4: Evidence-backed system perception pilot
- [x] Replace the video decoder's synthetic walkthrough with bounded FFprobe/FFmpeg metadata and frame extraction.
- [x] Persist decoder manifests and expose report/frame reads through the existing system-reconstruction API.
- [x] Make architecture classification unknown by default and attach evidence sources to observed claims.
- [ ] Add an authenticated reference upload flow into the server-owned video library.
- [x] Scan a registered project workspace into a persistent, bounded file/import/route/component/test evidence map through Project Kernel.
- [x] Add a native System Intelligence tab in Project Hub for measured inventory, evidence, gaps, and explicit `NOT_RUN` test status.
- [x] Link the persisted project perception map to the existing System Twin and Graph Brain with idempotent, tenant-scoped evidence nodes.
- [x] Browser validate the canonical System Intelligence tab against an authenticated API instance, including same-tenant Twin/Graph reads and cross-tenant denial.
- [ ] Prove the pilot against the Fênix workspace with browser captures, API/runtime traces, tests, and persistence across restart.

## Phase 5: Session recovery and navigation reliability
- [x] Reproduce a valid login cookie paired with a stale browser Bearer token and verify the request recovers through the cookie.
- [x] Preserve normal Bearer and cookie-only authentication flows.
- [ ] Validate session refresh and navigation on the authenticated production browser.

## Open Questions

- The first slice intentionally materializes the organization and workspace building only. Departments, rooms, agent assignment, and jobs are not claimed as implemented.
- The current Graph Brain is JSON-backed; a database-backed graph persistence migration is outside this first slice.
