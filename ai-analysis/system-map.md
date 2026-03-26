# System Map

## Scope
- Project: ai-engine-core/ai-engine
- Objective in repository docs: reusable AI orchestration engine.
- Main observed executable behavior: compiled artifacts in dist.

## Top-level structure (observed)
- cli/
- core/
- crm/
- dist/
- engine/
- future/
- generated/
- intelligence/
- interface/
- src/
- system/
- templates/

## Runtime-relevant areas for intelligence/evolution
- dist/core/engine.js
- dist/modules/*.js
- dist/memory/memory.store.js
- dist/modules/shared/generate-system.js
- engine/memory/*.json
- generated/continuous-learning-cycle/**
- system/docs/*.md

## State map

### A) Active compiled logic
- dist/api/routes.js exposes POST /process.
- dist/core/engine.js orchestrates validate -> sanitize -> classify -> response generation -> memory save.
- dist/modules contains classifier/processor/response modules.
- dist/memory/memory.store.js keeps in-memory rolling history (max 2000 entries).

### B) Learning/evolution memory artifacts
- engine/memory/changes-runtime.json
- engine/memory/decisions-runtime.json
- engine/memory/organizations-runtime.json
- engine/memory/solution-library-runtime.json
- engine/memory/knowledge-fallback.json
- Some runtime stores are currently empty arrays (for example design-patterns and design-system runtime files).

### C) Generated intelligence outputs
- generated/continuous-learning-cycle/backend/src/modules/continuous-learning-cycle/*
- Contains architecture, business rules, auto-features, events, queue handler, service/repository/controller skeletons.

### D) Governance and process docs
- system/docs/KNOWLEDGE-PIPELINE-PROMPT.md
- system/docs/STABILITY-V1.0.0.md
- system/docs/REORGANIZATION-REPORT-V1.0.0.md
- system/docs/USAGE.md
- system/docs/USAGE-REPORT.md

## Important structural observation
- Multiple source-layer folders (src, intelligence, engine submodules) exist, but many are empty in this snapshot.
- Operational behavior verified in this workspace is concentrated in dist plus memory JSON history files.
