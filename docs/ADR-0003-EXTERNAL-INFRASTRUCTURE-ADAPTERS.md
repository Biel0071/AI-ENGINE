# ADR-0003: Configurable external infrastructure adapters

- Status: accepted
- Date: 2026-07-27
- Scope: PostgreSQL, Redis, BullMQ and S3-compatible object storage

## Decision

The composition root selects infrastructure through configuration while preserving the existing domain ports:

- `DATABASE_URL` selects `PostgresStore`; without it, development may use file/memory adapters.
- `REDIS_URL` enables a tenant-namespaced Redis cache.
- `FENIX_QUEUE_REDIS_URL` enables BullMQ; it falls back to `REDIS_URL` when not set.
- `FENIX_S3_BUCKET` enables the S3 adapter. `FENIX_S3_ENDPOINT` is optional for AWS and required for most compatible services.
- production server startup fails closed when PostgreSQL, Redis or object storage is not configured.

`PostgresStore.update` uses a serializable transaction, row lock and bounded retry for serialization/deadlock failures. The current compatibility record is one JSONB kernel document; this removes local JSON as the production persistence medium without rewriting domain services. Normalizing tenant-owned aggregates into RLS tables remains a later migration and is not claimed as complete here.

The Redis adapter always prefixes keys with tenant ID. BullMQ jobs support deterministic `jobId`, bounded attempts and exponential backoff. Object keys always begin with tenant ID and payload SHA-256 is stored and verified.

## Security

The local Compose file binds database ports to loopback and reads PostgreSQL/Redis passwords from Compose secrets. No credential is committed or embedded in process command arguments. Production should use a managed secret store or workload identity; S3 static credentials are optional so an AWS role/default credential chain can be used.

No MinIO image is pinned in this repository. At the implementation date, the upstream project advised users to build the latest security release for containers and its public security page listed a newer 2026 advisory. The S3 contract therefore accepts a maintained MinIO build or managed S3 endpoint without silently shipping an image that may be vulnerable.

## Verification and limitations

- Adapter contract tests run with deterministic fakes.
- Compose syntax is validated with `docker compose config`.
- Dependency audit reports zero known vulnerabilities at high severity or above.
- A live integration test was not run because the local Docker engine was unavailable. This is an explicit remaining validation gate before production use.

## Rollback

Unset the external adapter variables to return to the local adapter in development. Production refuses this fallback. Before database rollback, stop writers, drain queues, export and verify state, then use the reviewed rollback SQL under `migrations/rollback/` only if loss of the target schema is intended.
