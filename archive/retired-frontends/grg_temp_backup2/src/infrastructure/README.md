# Enterprise foundation adapters

This directory contains operational adapters around the cognitive/domain kernel. The domain continues to depend on the small `read/update` store port and can be migrated without a rewrite.

Implemented and tested:

- `resilience/`: bounded exponential retry and a closed/open/half-open circuit breaker;
- `messaging/`: idempotency records plus transactional-state outbox and inbox primitives;
- `backup/`: file backup, SHA-256 manifest validation and atomic restore;
- `monitoring/`: critical/optional health probe aggregation.

The local `MemoryStore` and `FileStore` remain development adapters. They are not presented as substitutes for PostgreSQL, Redis, BullMQ or object storage in production. External adapters will preserve these contracts and be introduced behind configuration flags.
