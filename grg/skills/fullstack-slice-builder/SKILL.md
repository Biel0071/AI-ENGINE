---
name: fullstack-slice-builder
description: Build one real frontend plus backend feature slice in FENIX. Use when an objective asks to create a screen, API, CRM/ERP/SaaS module, active dev agent, or front/back contract together.
triggers:
  - fullstack
  - frontend
  - backend
  - modulo real
  - skill ativa
  - criar tela
domains:
  - software-factory
  - frontend
  - backend
  - agent-dev
---
# Fullstack Slice Builder

Use this skill to transform a feature request into one runtime-backed slice instead of only mock UI.

Workflow:
1. Select the smallest useful entity, fields, and actions.
2. Create the slice through `POST /api/scos/factory/slices`.
3. Use the returned contract as the shared source for frontend controls and backend routes.
4. Validate with `GET /api/scos/factory/slices/:id/data`.
5. Add at least one real record with `POST /api/scos/factory/slices/:id/data`.

Context budget:
- Load only this skill and the selected slice contract for routine agent work.
- Do not place secrets, tokens, passwords, or provider keys in events, prompts, records, or skill context.
