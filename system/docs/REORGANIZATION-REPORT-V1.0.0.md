# Reorganization Report V1.0.0

Date: 2026-03-23

## Objective

Reorganize AI Engine into professional layers while preserving current behavior and public API.

## Public API (unchanged)

- organizeProject
- analyzeProject
- generateFeature
- suggestStructureImprovements

## Folder Classification

- core: orchestrator, runtime, engine backbone
- intelligence: analyzer, generators, memory, patterns, agents, providers
- interface: adapters, interfaces/contracts, prompts, ui-reader
- system: tools, docs, planner, diagnostics, project mappers/scanners, support modules
- future: ideas, experiments, drafts and legacy content

## Moved To Production Layers

- analyzer -> intelligence/analyzer
- generators -> intelligence/generators
- memory -> intelligence/memory
- patterns -> intelligence/patterns
- agents -> intelligence/agents
- providers -> intelligence/providers
- dev-engine -> intelligence/dev-engine
- adapters -> interface/adapters
- interfaces -> interface/interfaces
- prompts -> interface/prompts
- ui-reader -> interface/ui-reader
- runtime/* -> core/runtime/*
- docs -> system/docs
- tools -> system/tools
- planner -> system/planner
- dom-mapper -> system/dom-mapper
- executor -> system/executor
- project-map -> system/project-map
- project-scanner -> system/project-scanner
- diagnostics -> system/diagnostics
- builders -> system/builders
- dev-assistant -> system/dev-assistant

## Moved To Future

- core/commandParser.js -> future/experiments/core/commandParser.js
- core/projectScanner.js -> future/experiments/core/projectScanner.js
- core/promptBuilder.js -> future/experiments/core/promptBuilder.js
- memory/stateMemory.js -> future/experiments/memory/stateMemory.js
- tools/actionExecutor.js -> future/experiments/tools/actionExecutor.js
- analyzers/index.js -> future/ideas/analyzers/index.js
- runtime/ (legacy root folder) -> future/drafts/runtime-legacy/
- engine/ (legacy compatibility tree) -> future/ideas/engine-legacy/
- brain/ -> future/drafts/legacy-root/brain/
- data/ -> future/drafts/legacy-root/data/
- design-brain/ -> future/drafts/legacy-root/design-brain/
- knowledge/ -> future/drafts/legacy-root/knowledge/
- learning/ -> future/drafts/legacy-root/learning/
- generated/ -> future/drafts/legacy-root/generated/
- src/ -> future/drafts/legacy-root/src/
- analyzers/ (folder) -> future/drafts/legacy-root/analyzers/
- dist-engine/ (legacy root output) -> future/drafts/dist-engine-legacy/

## Build Output Layer

- TypeScript outDir moved to `system/dist-engine`
- Runtime CLI updated to load build artifacts from `system/dist-engine`

## Import Path Adjustments

Only path references were adjusted where required by moved folders. Internal logic of modules was preserved.

## Validation

- Public API loaded successfully from index.js
- stable:check passed (`audit:structure` + `build:engine`)
- TypeScript build completed after path updates
- CLI smoke test passed (`node core/runtime/cli.js map .`)

## Notes

- No files were deleted
- Legacy and future work were preserved under future/
- Engine is now layered for production usage and future evolution
