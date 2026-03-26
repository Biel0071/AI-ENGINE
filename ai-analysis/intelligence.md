# Intelligence

## Intelligence primitives observed

### Intent intelligence
- dist/modules/lead.classifier.js
- Rule-based keyword classification returning:
  - sales
  - support
  - follow_up
  - general
- Each intent returns a confidence score.

### Response intelligence
- dist/modules/response.generator.js
- Intent-conditioned response templates with contextual insertion of user message.

### Input quality intelligence
- dist/modules/message.processor.js
- Input contract validation and normalization of user message text.

### Retrieval/context intelligence (documented + runtime traces)
- system/docs/KNOWLEDGE-PIPELINE-PROMPT.md defines target pipeline:
  - parse structured docs
  - chunk
  - embed
  - store in vector DB
  - retrieve context before generation
- engine/memory/knowledge-fallback.json shows fallback contextual artifacts persisted when retrieval dependency is unavailable.
- decisions-runtime.json records context readiness and retrieval fallback metadata.

### Structural intelligence
- dist/api/project-analyzer.js scans project trees and writes memory/project-map.json.
- Classification dimensions include pages, components, backend files, and routes.

## Intelligence maturity notes (observed)
- Runtime inference path is deterministic/modular and operational in dist.
- Persistent memory traces exist and include strategy metadata.
- Repository contains many planned/legacy intelligence domains, but active behavior verified here is concentrated in dist + engine/memory histories.
