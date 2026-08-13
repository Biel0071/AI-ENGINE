---
name: fenix-dev-workflow
description: Make safe, focused code changes in AI-ENGINE/FENIX with tests and minimal context.
trigger: [implementar, corrigir, refatorar, teste, build, bug, feature, backend, frontend]
domains: [backend, frontend, qa, devops]
---

# FENIX Dev Workflow

Use for implementation tasks.

Workflow:
- Start with `git status --short`; preserve user changes.
- Use `rg` for discovery and read only files needed for the task.
- Prefer existing services, stores, permissions, and event patterns over new architecture.
- Keep changes scoped and add focused tests when touching backend contracts or UI behavior.
- Run syntax checks for changed JS and targeted `node --test` suites.
- If an endpoint is used by the frontend, validate the real HTTP response.

Safety:
- Never fabricate success for deploy, provider health, workers, readiness, OIDC, or browser clicks.
- Avoid persisting full prompts or skill bodies in events; store ids, scores, and summaries.
- Do not revert unrelated dirty files.

Output expected:
- Files changed.
- Tests run and result.
- Remaining risk or blocked external dependency.
