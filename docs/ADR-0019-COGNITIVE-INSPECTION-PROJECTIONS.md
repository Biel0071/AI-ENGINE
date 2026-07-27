# ADR-0019 — Cognitive Inspection Projections

## Status

Accepted — V2.5.2.2 first vertical slice.

## Decision

Project analysis executes only through a registered and signed Sandbox recipe. The Kernel never scans or executes project files. It accepts one versioned JSON report and acts only as validator and projector.

Required flow:

`Authorized Workspace → Signed Sandbox Inspection → Schema Validation → Event Store → Knowledge Graph → Inspection Twin → Memory → AI City → Evolution Proposals`

## Evidence rules

- every entity and relationship requires file-level evidence;
- every risk and evolution proposal requires evidence;
- dangling relationships, duplicate keys, traversal references and secret-shaped fields are rejected;
- reports are capped at 10 MB, 10,000 entities and 20,000 relationships;
- the normalized report receives a deterministic SHA-256 hash;
- failures are persisted as failed inspection runs and durable events;
- proposals are always created with `executionAllowed: false`.

## Read-only guarantee

The Inspection Engine exposes no branch, write, pull-request, merge, deploy or infrastructure mutation method. Its Sandbox environment is named `inspection`, defaults to network `none`, and uses the immutable signed script selected by operations.

## Projections

- Knowledge Graph receives typed entities, temporal relationships, confidence and provenance;
- indexed documents become document entities;
- the Inspection Twin is append-only and marks only the latest subject revision current;
- Memory stores a concise evidence reference;
- AI City consumes discovered-entity events and represents the project as a district;
- Evolution proposals remain review-only.

## Deferred

The signed scanner container, language-specific deep analyzers, quality metrics, Playwright smoke recipes and natural-language graph-only answer synthesis are subsequent V2.5.2.2 slices.
