# ADR-0002: Enterprise foundation primitives before external adapters

- Status: accepted
- Date: 2026-07-27
- Scope: GRG FÊNIX kernel persistence and operational reliability

## Context

The Alpha kernel had one useful store port and an in-process event bus, but no explicit state migrations, durable delivery protocol, idempotency contract, resilience policy, backup integrity check or aggregated readiness model. Connecting PostgreSQL, Redis and a queue directly at every call site would couple the domain to infrastructure and make rollback unsafe.

## Decision

Introduce tested infrastructure-neutral primitives first:

1. State schema v5 with ordered, recorded, forward-only migrations and rejection of newer unknown schemas.
2. Idempotency records identified by tenant, operation and key; reuse with a different canonical payload is rejected.
3. Outbox events with deduplication, claim ownership, attempts and explicit published/failed transitions.
4. Inbox consumption once per tenant, consumer and event ID.
5. Bounded exponential retry and circuit breaker state transitions.
6. File backup with SHA-256 manifest verification and atomic restore for the local adapter.
7. Aggregated readiness where optional dependencies can degrade without marking the kernel unavailable.

These services are exposed by the composition root. `/health` now executes real probes and returns `503` when a critical probe fails.

## Consequences

- A failed store mutation no longer poisons the serialization queue; subsequent writes can proceed.
- File state upgrades are persisted immediately and preserve existing domain collections.
- The outbox is durable in the configured state store, but existing domain emitters are not yet transactionally migrated to it. Until that migration is complete, the in-process event bus remains a non-durable compatibility path.
- Local backup is a recovery mechanism for the development adapter, not the final off-site/immutable backup architecture.
- PostgreSQL, Redis/BullMQ and S3-compatible adapters can implement these contracts incrementally without changing business services.

## Rollback

Runtime rollback is safe only while no state has been written with an unsupported newer schema. Code at schema v4 must not open a v5 file. Restore the pre-upgrade backup or keep the v5 migration reader. Operational adapter rollbacks must drain claimed outbox work before switching providers.
