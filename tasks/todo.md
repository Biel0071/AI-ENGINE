# Fênix Reality Compiler Slice

- [ ] Phase 0: finish verifying sole City renderer, agent sync, camera controls, and compatibility controls.
- [x] Phase 1 implementation: compile organization intent into ontology/blueprint, persist entities idempotently, and link Graph Brain/events.
- [x] Phase 2 wiring: connect the existing Command Center to the canonical route and refresh/focus the existing World3D renderer.
- [x] Phase 3 targeted deploy: create backups, deploy the runtime files, and confirm backend/frontend health.
- [x] Write `FENIX_WORLD_ENGINE_STATUS.md` with observed evidence and explicit gaps.
- [ ] Authenticate the production browser session, submit the organization intent once, and verify persisted blueprint/entities/graph/event.
- [ ] Verify the generated building in City after browser reload and a controlled process restart.
- [ ] Complete NPC/SSE/chat/mission/job/memory/AI-offline/Ollama/schema-33/restart checks.
- [ ] Reboot the VPS only after every preceding production gate passes; verify the app again after reboot.

## Checkpoint: First vertical slice

- [x] Focused local Reality Compiler tests pass (6/6); the published frontend bundle passes Node syntax validation.
- [ ] One authenticated production intent is idempotently materialized for the real selected project.
- [ ] Blueprint, organization, building, Graph Brain edges, and event are verified from production runtime state.
- [ ] The existing browser shows and can inspect the generated building after reload.

Current blocker: the real POST returned HTTP 401 (`not authenticated - login at /GRG-login`). The login page is open for the user to authenticate with the existing credential; no password is requested in chat.

## Perception Engine pilot (from the supplied workflow video)

- [x] Replace synthetic video screens/actions with bounded FFprobe metadata and FFmpeg frame extraction.
- [x] Store a manifest with the video hash, measured media metadata, sampled frames, and explicit `NOT_VERIFIED` content analysis.
- [x] Serve persisted frame evidence through the authenticated system-reconstruction API.
- [x] Remove unsupported architecture defaults; report only package, network, route, and runtime evidence that was provided.
- [ ] Upload references from the browser into the server-owned library.
- [x] Map a registered project workspace into a persistent bounded file/import/route/component/test evidence artifact in Project Kernel.
- [x] Add the native Project Hub System Intelligence tab with measured coverage and `NOT_RUN` test status.
- [x] Link project perception to System Twin and Graph Brain with evidence labels and idempotent graph edges.
- [x] Browser validate the tab against an authenticated API instance, including tenant scoping.
- [ ] Complete the pilot's authenticated VPS run and restart persistence checks.

## Session recovery
- [x] Allow a valid login cookie to recover requests that carry a stale Bearer token.
- [x] Keep Bearer-only and cookie-only login request paths working.
- [ ] Validate session recovery and full navigation against the authenticated VPS browser.
