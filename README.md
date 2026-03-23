# AI Engine

AI Engine is a reusable automation tool that can organize project structure, analyze architecture, and generate SaaS features with a consistent workflow.

This package is designed to run independently and be embedded in multiple projects.

## Stable Release

Current stable baseline: V1.0.0

Stability goals for this baseline:

- frozen public API
- consistent folder organization and naming
- structure and usage audit reports for multi-project adoption

## Stable Public API

The engine exposes only these four functions:

- `organizeProject(projectPath, options?)`
- `analyzeProject(projectPath, options?)`
- `generateFeature(projectPath, feature, options?)`
- `suggestStructureImprovements(projectAnalysis)`

## What It Does

- Organizes projects into a scalable structure
- Applies dynamic structure rules from `intelligence/patterns/structure-rules.json`
- Runs structure scoring and improvement suggestions
- Detects frontend/backend/routes/components
- Generates feature baseline (UI + backend module skeleton) using reusable generators
- Persists memory patterns for future project reuse
- Uses optional external AI layer for analysis, UI guidance, and code improvement

## Engine Structure (Frozen)

- `core/` (engine principal, orchestrator, runtime)
- `intelligence/` (analyzer, generators, memory, patterns, ai)
- `interface/` (adapters, prompts, UI readers, external contracts)
- `system/` (tools, docs internos, support modules)
- `future/` (ideas, experiments, drafts)
- `templates/`

## AI Configuration

AI integration is optional and only active when environment key is available.

Required env var:

- `AI_API_KEY`

Optional env vars:

- `AI_PROVIDER` (default: `openai-compatible`)
- `AI_API_BASE_URL` (default: `https://api.openai.com/v1`)
- `AI_MODEL` (default: `gpt-4o-mini`)
- `AI_TIMEOUT_MS` (default: `20000`)

Main AI modules:

- `intelligence/ai/aiConfig.js`
- `intelligence/ai/aiProvider.js`
- `intelligence/ai/aiMemoryBridge.js`
- `intelligence/ai/index.js`

## Core vs Future

Production/stable path (V1.0.0):

- keep runtime-critical modules in `core/`, `intelligence/`, `interface/`, `system/`
- keep stable public API in `index.js`

Future evolution path (non-critical and archived code):

- `future/ideas/`
- `future/experiments/`
- `future/drafts/`

Use `future/` for code not used by current production flow but preserved for future iterations.

Rule for evolving the engine:

1. build and validate new code inside `future/`
2. prove usage with imports/tests
3. only then promote to production folders

## Folder Visualization And Usage Audit

Run:

- `npm run audit:structure`

Generated files:

- `system/docs/FOLDER-VISUALIZATION.md`
- `system/docs/USAGE-REPORT.md`

These reports help identify:

- folder/subfolder layout
- what is being used by local imports
- potential unused files
- unresolved local imports

## Usage

```js
const {
  organizeProject,
  analyzeProject,
  generateFeature,
  suggestStructureImprovements,
} = require('./index');

async function run() {
  const organization = await organizeProject('C:/my-project', { dryRun: true });

  const analysis = await analyzeProject('C:/my-project');

  const suggestions = suggestStructureImprovements({
    scoreBoard: organization.scoreBoard,
    duplicateGroups: organization.improvements?.duplicateGroups || [],
  });

  const result = await generateFeature('C:/my-project', 'inbox');

  console.log({
    moved: organization.totals?.moved,
    routes: analysis.routes.length,
    generatedFiles: result.files.length,
    suggestions: suggestions.suggestions.length,
  });
}

run().catch(console.error);
```

## Integrating In Other Projects

1. Add AI Engine as a dependency or copy as an internal package.
2. Import only the stable API from `index.js`.
3. Keep your own project root path as the first argument.
4. Use `dryRun: true` before applying organization changes in production repos.

## Notes

- The engine does not require CRM runtime dependencies for the stable API above.
- Dynamic structure rules can be changed without code edits in `intelligence/patterns/structure-rules.json`.
- Memory files are stored under `intelligence/memory/` for reuse across executions.
- AI token is never hardcoded and must be provided via environment variables.
