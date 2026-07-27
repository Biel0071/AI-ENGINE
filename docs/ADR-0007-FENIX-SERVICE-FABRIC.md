# ADR-0007: FÊNIX Service Fabric, Registry and durable Event Store

- Status: accepted
- Date: 2026-07-27
- Scope: automatic system enrollment and event-mediated integration

## Decision

No new subsystem integration may call another product subsystem directly. New integrations publish immutable event envelopes through `FabricEventBus`; projections and consumers update their own state independently.

State schema v8 adds:

- a typed Registry for services, APIs, databases, containers, workers, agents, tools, templates, plugins, skills, MCP servers, models, prompts, policies and secret references;
- immutable Registry version snapshots;
- a per-stream Event Store with sequence numbers, optimistic version checks, idempotency keys and SHA-256 hash chains;
- Fabric enrollment state with explicit progress/failure status.

Enrollment performs identity issuance, Registry activation, durable event publication, Knowledge Graph projection, observability declaration and AI City placement declaration. The projection consumes `fabric.service.registered`; the Fabric does not invoke the Knowledge Graph directly.

## Identity and secrets

Development uses an Ed25519 identity with a SPIFFE-shaped URI. The private key is returned exactly once and is never persisted, published or audited. Production refuses to start the Fabric with this local issuer and requires an injected Vault, step-ca or SPIFFE/SPIRE-backed identity provider.

Events and Registry metadata reject fields shaped like passwords, API keys, tokens, credentials or private keys. Secret Registry entries contain references only; secret values remain in the external secret manager.

## Event contract

Event envelopes carry tenant, stream, sequence, type, source, subject, correlation/causation IDs, classification, timestamps and hash-chain integrity. Payload schemas are versioned by event type rather than by coupling consumers to database structures.

Existing Alpha modules still use the in-process compatibility bus. They will move to the durable Fabric contract incrementally; this ADR does not claim that migration is complete.

## Recovery

An enrollment is idempotent by tenant/service/version. If a projection fails after the event was stored, retry republishes the same durable event and reuses the stored public identity. A lost one-time private key is never regenerated under the same identity; operators must rotate/re-enroll through the identity provider.
