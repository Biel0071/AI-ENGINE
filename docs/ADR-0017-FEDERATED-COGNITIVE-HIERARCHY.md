# ADR-0017 — Federated Cognitive Hierarchy

## Status

Accepted — V2.5 foundation slice.

## Context

Tenant isolation alone is insufficient for a federated cognitive ecosystem. A tenant can contain multiple organizations, companies, stores, departments and projects. Memory and agents must be scoped to these entities, with sharing denied unless an explicit Knowledge Hub policy permits it.

## Decision

Introduce `CognitiveHierarchy` as the authority for cognitive identities, workspaces, agents, scope grants and knowledge-sharing policies.

The hierarchy is:

`MASTER → ORGANIZATION/COMPANY/GLOBAL_SERVICE → STORE/DEPARTMENT/PROJECT`

Rules:

- every entity receives a stable `fenix://` identity and one workspace;
- every project receives the standard specialized agent identities;
- the Master Avatar is a coordinator with `executionAllowed: false`;
- non-administrators require an explicit scope grant;
- grants may inherit downward, never sideways;
- hierarchical memory is filtered by the caller's accessible scope IDs;
- stable memory keys are unique within their scope, not across the whole tenant;
- cross-scope knowledge sharing is denied by default;
- a sharing policy names source, target, knowledge kinds and allowed classifications;
- tenant boundaries remain mandatory and cannot be bypassed by a sharing policy.

## Persistence

State schema version 16 adds:

- `cognitiveEntities`;
- `cognitiveWorkspaces`;
- `cognitiveAgents`;
- `cognitiveAccessGrants`;
- `knowledgeSharingPolicies`.

The migration is additive and preserves all V1 collections.

## Security invariants

1. Only members with `member:manage` can initialize or modify the hierarchy.
2. Only administrators implicitly see all scopes.
3. Employee and subadmin access is explicit and scope-bound.
4. An entity cannot use a parent from another tenant.
5. A memory cannot claim a scope type that differs from its entity type.
6. Restricted knowledge is not shareable unless the policy explicitly allows it.
7. Agent identities do not grant Runtime permission.

## Deferred slices

This ADR does not implement autonomous agents, Git mutation, voice, workspace UI or production deployment. Those capabilities must consume this authority and continue through AI Gateway, Approval Engine and Runtime.

## Verification

Automated tests cover hierarchy creation, invalid parents, tenant isolation, inherited grants, scoped memory retrieval, stable-key isolation and deny-by-default sharing.
