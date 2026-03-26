# Rules For AI-ENGINE Analysis

## Purpose
Define strict rules for analyzing AI-ENGINE as a learning/evolution system in this repository snapshot.

## Evidence rules
1. Prioritize executable evidence from dist files and concrete memory JSON histories.
2. If source and compiled layers diverge, report divergence explicitly.
3. Mark planned capabilities as planned unless executable code path was verified.

## Scope rules
1. Focus on learning, intelligence generation, and evolution traces.
2. Do not mix CRM runtime diagnosis into AI-ENGINE analysis scope.
3. Use generated/* as output evidence of evolution cycles, not as base runtime core.

## Source-of-truth order
1. dist/api/routes.js and dist/core/engine.js
2. dist/modules/* and dist/memory/memory.store.js
3. engine/memory/*.json
4. generated/<feature> artifacts
5. system/docs governance docs

## Diagnostic rules
1. Treat broken startup script paths as operational blockers.
2. Distinguish blockers from planned improvements.
3. Include file-level references for every finding.

## Reporting template
1. Current executable intelligence flow.
2. Current learning persistence model.
3. Current evolution mechanism and evidence.
4. Gaps, drifts, and migration risks.
5. Minimal stabilization actions.

## Safety rules
1. No destructive restructuring during analysis.
2. Preserve memory history files.
3. Keep analysis factual and reproducible from repository files only.
