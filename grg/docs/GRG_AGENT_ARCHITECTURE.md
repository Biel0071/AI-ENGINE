# GRG Agent Architecture

An agent is `role + model + skills + tools + permissions + memory + knowledge + autonomy`.

The registry is in `src/agents/agent-registry.js`; definitions are in `agent-definitions.js`; execution and workspace changes are isolated by `agent-execution-runtime.js` and `agent-workspace-executor.js`.

Initial departments are represented by specialized agents (planner, architect, frontend, backend, database, QA, security, DevOps, documentation and deploy). The orchestrator assigns concrete jobs and emits lifecycle events. Handoffs must carry mission, job, context, permissions and result references.

Next implementation: normalize agent health/metrics and expose a durable handoff record in the same Mission Runtime.
