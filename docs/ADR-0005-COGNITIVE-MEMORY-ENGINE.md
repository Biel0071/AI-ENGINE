# ADR-0005: Versioned cognitive memory with provenance and tenant isolation

- Status: accepted
- Date: 2026-07-27
- Scope: episodic, semantic, working, project and organization memory

## Decision

Introduce `MemoryEngine` as the governed memory boundary instead of allowing new modules to append arbitrary text directly to legacy `memoryEvents`.

Each memory has:

- tenant ownership and a typed scope (`episodic`, `semantic`, `working`, `project`, `organization`);
- immutable version history and an optional stable key for controlled evolution;
- source type/reference/evidence, confidence and classification;
- project/organization validation inside the tenant;
- retention timestamp, soft-deletion tombstone and deletion reason;
- an outbox record for vector indexing;
- a tenant memory revision used to invalidate retrieval caches.

Working memory is visible only to its owner. Restricted memory can be written/read only by administrators. All retrieval first applies authorization and tenant/scope filters, then combines lexical, vector and confidence scores. A Qdrant adapter uses one collection with mandatory tenant payload filtering, following Qdrant's recommended payload-partitioned multitenancy model.

Episodic consolidation creates a reusable semantic/project/organization memory with explicit evidence links to every source version. Sources remain available and are marked with the consolidated target; consolidation never silently destroys evidence.

## State and compatibility

State schema v6 adds `memories` and `memoryVersions`. The legacy `memoryEvents` collection remains read-compatible while producers are migrated incrementally. It is not renamed or deleted.

The local deterministic hash embedding is suitable for contract tests and lexical augmentation, not production semantic quality. Production must inject a reviewed embedding model with the same vector dimension as Qdrant.

## Failure semantics

The canonical memory and indexing outbox event are committed together. If immediate Qdrant indexing fails, the outbox remains pending and a sanitized failure event is emitted; canonical knowledge is not lost. Query degrades to lexical retrieval when the vector store is unavailable.

## Privacy and forgetting

`forget` removes the vector point and leaves an auditable tombstone/version record. This is application-level logical deletion; regulated erasure also requires executing and documenting provider backup/retention procedures. Qdrant and database backups must follow the same approved retention policy.
