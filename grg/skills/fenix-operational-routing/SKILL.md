---
name: fenix-operational-routing
description: Route FENIX work to the smallest capable agent context, using measured state before action.
trigger: [runtime, deploy, health, api, connector, mission, agent, vps, production]
domains: [architecture, devops, observability, planner, ai]
tokens: 420
---

# FENIX Operational Routing

Use this skill when a task touches runtime health, deployment, API integration, connectors, missions, or VPS operations.

Rules:
- Read measured system state first: health, readiness, logs, route contracts, and current deployed URL.
- Select one specialist owner and only the supporting skills needed for that owner.
- Prefer existing services and endpoints over new abstractions.
- Never mark deployment, provider connectivity, security, or tests as successful without measured evidence.
- Return a compact work packet: objective, selected agent, required endpoints, risk level, validation command, and rollback note.

Token discipline:
- Do not load full docs when a registry summary or endpoint contract is enough.
- Use selected skill context under the requested token budget.
- Preserve correlation IDs and failed endpoint bodies instead of paraphrasing vague errors.
