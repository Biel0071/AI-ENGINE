# GRG FÊNIX enterprise infrastructure runbook

## Local stack

1. Copy `grg/.env.enterprise.example` to `grg/.env.enterprise`.
2. Create `grg/secrets/postgres_password.txt` and `grg/secrets/redis_password.txt` with strong unique values. The directory is ignored by Git.
3. Replace both `CHANGE_ME` values in the local application URLs. Do not commit the resulting env file.
4. Run `docker compose --env-file .env.enterprise -f docker-compose.enterprise.yml up -d`.
5. Confirm `docker compose ... ps` reports PostgreSQL, Redis and Qdrant healthy.
6. Configure a maintained AWS S3 or S3-compatible bucket and export the `FENIX_S3_*` variables.
7. Start the server and require `/health` to return HTTP 200 with all critical probes ready.

## Migration

The Compose initialization mounts `0001_kernel_state.sql` for a new empty database. Existing databases can apply the numbered SQL under an operator-controlled transaction. The runtime adapter also creates its compatibility table idempotently, then migrates the kernel document to the current state schema.

Before changing adapters:

1. stop new write traffic;
2. wait for active requests and queue workers to finish;
3. create and verify a source backup;
4. import the state into PostgreSQL;
5. compare tenant/project/session/audit counts;
6. start one canary instance with external adapters;
7. test login, audit-chain verification, approval and preview deployment;
8. switch traffic only after `/health` remains ready.

## Recovery

- PostgreSQL: use provider point-in-time recovery or a verified logical/physical backup.
- Redis/BullMQ: Redis is not the system of record; restore queue data only from a compatible snapshot and reconcile against outbox state.
- S3: enable bucket versioning, retention and lifecycle policies at the provider.
- Kernel file adapter: `FileBackupService.verify()` must pass before `restore()` is allowed.

Never execute rollback SQL until the exact target database and verified backup are recorded in the change ticket/approval trail.
