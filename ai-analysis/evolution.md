# Evolution

## Evolution mechanisms currently evidenced

### 1) Strategy-aware generation
- Generated artifacts include strategy metadata fields such as:
  - preGenerationDecision: context-first
  - generationMode: stable-freeze or adaptive-product
  - shouldExpandFeatures
  - prioritizeProvenSolutions
- Source evidence:
  - generated/continuous-learning-cycle/...auto-features.json
  - engine/memory/decisions-runtime.json

### 2) Automatic feature expansion
- Auto-feature suggestions are generated with rationale and target screens.
- Source evidence:
  - generated/continuous-learning-cycle/...auto-features.json

### 3) Event/queue-ready module generation
- Generated module templates include events and queue handler files.
- Source evidence:
  - generated/continuous-learning-cycle/...events.ts
  - generated/continuous-learning-cycle/...queue-handler.ts

### 4) Solution pattern accumulation
- solution-library-runtime.json stores applied pattern summaries, context, tags and outcome score.
- This functions as a practical evolution memory for future cycles.

### 5) Organization/refactor evolution traces
- organizations-runtime.json records structure changes with applied rules and before-state folder inventory.
- changes-runtime.json records generated/refined cycles and impact metrics.

## Evolution constraints observed now
- package.json scripts point to server.js, while verified executable API entry is in dist/api/routes.js.
- Many non-dist source folders are sparse in this snapshot, indicating evolution history across reorganizations and partial migration.
- Therefore, current reliable execution baseline is compiled dist + memory histories + generated outputs.
