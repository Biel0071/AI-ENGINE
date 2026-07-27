# ADR-0018 — Trusted Sandbox Execution Foundation

## Status

Accepted — V2.5.2 foundation slice.

## Decision

FÊNIX does not execute arbitrary commands. Execution is allowed only when all of the following are true:

1. the tool is registered with a digest-pinned container image;
2. an Ed25519 trusted signer has signed the exact script manifest;
3. the script version and manifest hash are immutable;
4. every runtime parameter matches a signed validation schema;
5. the caller has Runtime permission and scope access;
6. production has a matching, single-use, independently approved authorization;
7. the execution occurs through the Sandbox Engine and produces audit, event and timeline records.

## Isolation profile

The production adapter uses Docker Rootless with:

- ephemeral `--rm` containers;
- read-only root filesystem;
- all Linux capabilities dropped;
- `no-new-privileges`;
- CPU, memory, PID and timeout limits;
- isolated temporary workspace copied from an authorized root;
- network `none` by default and allowlisted named networks;
- `noexec`, `nosuid` temporary filesystem;
- environment passed through a mode-0600 temporary file;
- automatic cleanup in a `finally` block;
- direct process invocation without shell interpolation.

Images must be pinned with `@sha256`. Tags such as `latest` are rejected.

## Runtime flow

`Job Engine → SandboxExecutionEngine → Signed Script → Tool Registry → Rootless Adapter → Audit/Event/Timeline`

The Kernel only coordinates state and policy. It never runs project code.

## Persistence

Schema version 17 adds:

- `toolDefinitions`;
- `scriptSigners`;
- `scriptDefinitions`;
- `sandboxExecutions`;
- `executionTimeline`.

## Deferred

Inspection recipes, Playwright images, smoke-test orchestration, SAST, Git branches and Pull Requests will be registered consumers of this foundation. They are not considered complete by this ADR.
