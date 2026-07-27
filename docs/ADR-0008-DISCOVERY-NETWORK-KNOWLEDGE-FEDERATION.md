# ADR-0008: Authorized Discovery Network and Knowledge Federation

- Status: accepted
- Date: 2026-07-27
- Scope: VPS inventory and controlled cross-system knowledge sharing

## Discovery Network

Discovery uses explicit probes injected into the control plane. A scan can select only configured probe names; unknown probes are rejected. The built-in Docker probe is opt-in (`FENIX_DISCOVERY_DOCKER=1`), executes `docker ps` with a fixed argument array and never invokes a shell or accepts user-supplied command arguments.

Resources are normalized, diffed against the previous probe inventory and published as `detected`, `changed` or `missing` events. A Registry projection consumes those events. Scanning one probe never marks resources owned by another probe as missing.

Probe output containing credential-shaped fields is rejected before inventory persistence or event publication. Container discovery collects identity, image, state, port mapping, networks and mounts; it does not inspect environment variables or file contents.

## Knowledge Federation

Systems publish bounded structured knowledge containing publisher, topic, statement, facts, confidence, classification, scope and provenance. They do not publish database rows or credentials.

`knowledge.published` is stored in the Event Store. Independent projections create a versioned cognitive memory and a Knowledge Graph entity with the event as provenance. Re-publishing a stable publisher/key evolves the same memory instead of copying it across product databases.

## State and APIs

Schema v9 adds discovery scans, discovered resources and knowledge publication state.

- `POST /api/discovery-network/scan`
- `GET /api/discovery-network/inventory`
- `POST /api/knowledge-federation/publish`
- `GET /api/knowledge-federation/publications`

## Limitations

Only the Docker CLI probe is bundled. PostgreSQL, Redis, Nginx, Traefik, Git, volumes, logs and metrics require dedicated least-privilege probes; no generic remote shell scanner will be added. Distributed consumer offsets and dead-letter replay remain a later event-runtime increment.
