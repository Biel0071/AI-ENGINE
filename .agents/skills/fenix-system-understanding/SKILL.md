---
name: fenix-system-understanding
description: Understand the AI-ENGINE/FENIX architecture quickly without loading the whole repository.
trigger: [architecture, entender, sistema, mapa, runtime, api, agents, skills, capability]
domains: [architecture, backend, ai, knowledge]
---

# FENIX System Understanding

Use when an agent needs to understand the system before changing it.

Fast map:
- `grg/` is the main FENIX runtime: auth, API server, agents, missions, runtime, AI router, connectors, office, AI City, deploy governance, and unified frontend.
- `platform/` is the older control-plane/dashboard layer with its own tests.
- `engine/` is reusable analysis/orchestration code.
- `graphify-out/` is the existing knowledge graph; use it for architecture questions before reading broad file sets.
- `grg/public/index.html` + `grg/public/unified-app.js` + `grg/public/unified.css` are the official unified frontend served by `/app`.

Source-of-truth order:
1. Running endpoint or test result.
2. Local source code.
3. Graphify query/report.
4. Docs and historical reports.

Do not infer production state from docs. Measure `/health`, relevant `/api/*` endpoints, logs, and browser behavior.
