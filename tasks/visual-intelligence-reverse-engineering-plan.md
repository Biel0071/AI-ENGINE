# GRG Visual Intelligence and System Reconstruction

## Objective

Turn user-provided images, videos, websites, repositories, documents, diagrams, and system demonstrations into a reviewable, evidence-backed model; compare that model with GRG; and, only after review, create an isolated implementation that is independently tested. The system must distinguish what it observed from what it inferred or could not determine.

The accompanying references also propose a measured hardware/model lab, specialized virtual departments, independent QA, and a navigable City GRG. These are connected roadmap items, not claims that those capabilities already work.

## Current evidence and constraints

- `grg/src/reconstruction/video-decoder.js` already probes video metadata, extracts a bounded set of frames, stores artifacts, and can request a Whisper transcript. Its current input is a server-side path under an allowlisted reference directory.
- `/api/v2/system-reconstruction/video` in `grg/src/api/universal-system-routes.js` accepts a video path; it is not a general user upload flow.
- `/screen-to-system` reports `501` because no vision provider is connected.
- `grg/src/reconstruction/universal-reconstruction-engine.js` does not yet connect visual analysis, code generation, sandbox execution, and independent review.
- `grg/src/cognitive/multimodal-pipeline.js` currently labels image/video content without proving OCR or visual understanding. `SystemAbsorptionEngine.absorbVisualSpec` can synthesize default elements and a fidelity score; do not use those values as evidence.
- Existing `MissionKernel`, job queue, shared workers, sandbox, tests, and City rendering are the intended reuse points. Do not create an always-on process/model for every virtual agent.
- Video reference claims about model size, memory, speed, or capability are hypotheses until measured on the actual hardware and model revision.

## Product contract

Every observation/result records a source artifact hash, page or frame timestamp, method/model, status, and confidence. Claims use exactly these evidence classes:

- `OBSERVED`: visible or encoded directly in the supplied source.
- `INFERRED`: a plausible explanation supported by named evidence.
- `UNKNOWN`: not established by the available material.
- `VERIFIED`: confirmed by permitted exploration, source code, or a reproducible test.

An unavailable provider, OCR failure, timeout, or missing interaction evidence must produce an explicit `BLOCKED` or partial result. It must never produce a fabricated success score. Private references stay local unless the user explicitly authorizes a compatible external provider.

## Implementation slices

### 1. Reliable reference ingestion and evidence timeline

- Accept bounded image/video uploads into an immutable, project-scoped reference artifact; retain source hash and metadata.
- Reuse the existing decoder; add adaptive keyframe/scene sampling, perceptual deduplication, timestamp preservation, and resource limits.
- Run real OCR and a capability-checked vision provider. Preserve per-frame descriptions, text, detected regions, confidence, and failure states.
- Present the frame timeline for manual correction. Never claim interaction behavior from a static frame.

**Acceptance:** one sample screen-recording and one image yield reproducible metadata, timestamped frames, OCR/vision evidence, and a truthful partial/blocked state when any provider is unavailable. Invalid, oversized, traversal, and unsupported inputs are rejected without writing outside the artifact root.

### 2. Functional and architectural reconstruction

- Group repeated screens and derive candidate states, transitions, navigation, components, requirements, and test cases from ordered evidence.
- Keep observed actions separate from inferred click effects and unknown backend behavior.
- For websites, repositories, PDFs, and diagrams, use type-specific readers and record the source locations used.
- Compare the resulting specification with GRG code and existing capabilities; output reuse, gaps, risks, and a small implementation plan.

**Acceptance:** a multi-state reference produces a source-linked timeline, state graph, functional requirements, and unknowns that a reviewer can edit; no unsupported server architecture is presented as fact.

### 3. Controlled reconstruction loop

- Convert an approved plan into a dependency graph using existing mission/job records and shared workers.
- Run implementation in an isolated workspace; run the relevant test suite and capture before/after screenshots or other domain evidence.
- Let an independent QA/review pass reject the implementation and return evidence to engineering. Preserve artifacts, diffs, model/tool use, resource cost, and test results.
- Require explicit approval before integration, publication, or deployment.

**Acceptance:** an intentionally failing result is rejected with evidence; a passing result is reproducible and reviewable; neither builder nor swarm director can self-certify success.

### 4. Measured model and hardware routing

- Detect CPU, RAM, GPU/VRAM, installed models, providers, and reachable nodes.
- Benchmark actual supported tasks and record model/version, quantization, latency, memory, quality/eval, and cost.
- Route small deterministic/classification work locally when measured; use a multimodal-capable provider only for tasks it actually supports; honor per-mission budgets, concurrency, cancellation, and cache.
- Treat distributed inference as a capability to prove, not an assumption based on a video demonstration.

**Acceptance:** a repeatable benchmark and routing decision show measurements and a fallback; unsupported model/modalities are rejected or marked blocked.

### 5. Operational City GRG

- Bind the overview, company, building/floor, room/workstation, and agent views to actual mission, job, worker, model, machine, cost, and evidence records.
- Represent availability truthfully; idle agents appear available, and active workers show a real mission and latest event.
- Keep spatial expansion modular and connected to persistent organization/departments rather than decorative, duplicated entities.

**Acceptance:** selecting a worker or workstation opens the same persisted task/evidence shown by operations APIs; the UI cannot invent activity or completion.

## Order and gates

1. Remove or quarantine false visual-analysis claims; add tests for truthful `BLOCKED`/partial behavior.
2. Complete image ingestion and one short MP4 vertical slice with timestamps, OCR, and a real, capability-checked vision response.
3. Persist/edit the evidence-backed system specification and compare it against one GRG project.
4. Create one sandbox mission and independent QA result from that specification.
5. Add model/hardware measurements and route only after benchmark evidence.
6. Connect operational data to City GRG layers.
7. Expand to site, repository, document, diagram, and physical-process adapters one at a time with acceptance examples.

## Not an acceptance claim

“Understands any system” is a long-term direction. Completion is demonstrated per input class, provider capability, and tested flow. Visual similarity alone does not prove functional equivalence, hidden business logic, data flow, security, or internal architecture.
