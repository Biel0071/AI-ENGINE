# Architecture

## High-level model (observed)

### 1) Processing core
- Entry endpoint: dist/api/routes.js (POST /process).
- Core orchestrator: dist/core/engine.js.
- Steps:
  1. validateInput (dist/modules/message.processor.js)
  2. sanitizeMessage (dist/modules/message.processor.js)
  3. classify intent (dist/modules/lead.classifier.js)
  4. generate response (dist/modules/response.generator.js)
  5. persist interaction in memory store (dist/memory/memory.store.js)

### 2) Memory architecture
- Online memory:
  - dist/memory/memory.store.js uses in-process array.
  - Retention cap: 2000 entries.
  - Query primitive: findBySender(from).
- Runtime learning history (file-based):
  - engine/memory/*.json stores decisions, changes, organization runs, solution patterns and fallback knowledge vectors.

### 3) Generation architecture
- Generator orchestrator:
  - dist/modules/shared/generate-system.js
- Responsibilities:
  - interpret feature prompt
  - generate backend/frontend/api files
  - write outputs to generated/<feature-slug>
  - update memory/features.json and memory/ui-patterns.json

### 4) Intelligence governance layer
- system/docs files define operating model:
  - freeze baseline and public API constraints
  - reorganization/layering report
  - usage and static reference health
  - knowledge pipeline intent (Docling + Qdrant integration target)

## Architectural characteristics
- Decoupled inference pipeline (validation/classification/response modules).
- Lightweight memory in runtime plus persistent JSON traces for evolution history.
- Generation engine with context-first strategy metadata in artifacts.
- Strong evidence of transition/reorganization phase: compiled runtime active, many source folders sparse.
