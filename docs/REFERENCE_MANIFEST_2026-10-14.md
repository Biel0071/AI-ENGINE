# Fênix source and runtime reference manifest

Audit date: 2026-10-14 (America/Sao_Paulo)
Last runtime observation: 2026-10-14 15:29:49 UTC

This manifest records the source and runtime identities observed before the requested VPS publication. It contains no credentials. Runtime measurements are point-in-time samples, not capacity guarantees.

## Repository identity

- Workspace: `C:\projetos\ai-engine-core\ai-engine`
- Branch: `fenix/operational-os-20260924`
- Code snapshot `HEAD` at runtime observation: `60d23d8da56459fd63342a2a4614c917d20a2ee7` (`fix: link conversation audit to governed mission runtime`).
- GitHub branch `origin/fenix/operational-os-20260924` pointed to that same code snapshot after push and fetch.
- VPS bare repository branch `master`: `435d0d29f0027e6c603af37d8cd4fd99281cc9b3`.
- At that code snapshot, the local feature branch and VPS `master` shared merge base `4609d5ace5a5e0c97c5c288e2e871f9a5f454a97`; local had 656 commits not in VPS `master`, and VPS had 145 commits not in local.
- At that snapshot, the local feature branch and GitHub `main` shared that merge base; local had 656 commits not in `main`, and `main` had 94 commits not in local.
- At that observation, the working tree contained 1,838 changed or untracked paths, including retired frontend archives, QA results, backups, runtime state, and code. They are not a deployable release set; code snapshot `60d23d8d` contains only the reviewed conversation/job/audit changes and their tests.

## VPS runtime identity

- User-facing Fênix process: host Node process serving port `3000`, running from `/opt/fenix-os/grg/src/server.js` under `pm2-root.service`.
- Host worker: `/opt/fenix-os/grg/src/runtime/worker.js`, also in the root PM2 systemd cgroup.
- Fênix Docker API: container `grg-fenix-enterprise-api-1`, image `grg/fenix:1.0.0-rc.22`, port `4400`; source bind mounts resolve under `/opt/grg-fenix/source`, separate from the host process tree.
- API Platform: container `api-platform-api-1`, public port `3001`; worker and dashboard are also running.
- Persistent services observed active: PostgreSQL, Redis, Qdrant, MinIO, and Keycloak. Docker services use restart policies; the host Fênix processes are supervised by the PM2 systemd service.
- At the latest observation, `pm2-root.service` was active. The front shell routes `/`, `/GRG-login`, and `/app` on port `3000` returned HTTP 200. Port `4400` root and `/health` returned HTTP 200; `/api/health` returned 401, so that protected route is not a public health probe. The API Platform container was marked healthy and bound to `209.50.241.22:3001`; probing `127.0.0.1:3001` was invalid because it does not bind to loopback.
- The latest point-in-time sample showed the Fênix enterprise API container at about 120% CPU and its PostgreSQL container at 58%; the host Fênix Node processes were about 24%, 18%, and 18%. Root filesystem use was 93% with 7.5 GB available. These are short samples, not sustained measurements.
- A previous provider probe reported `INVALID_API_KEY` for API Platform and Ollama unavailable. Provider connectivity was not re-probed during the latest runtime observation, so usable AI capacity remains unverified.

## Publication mechanism and gate

- `/opt/git/fenix.git` has a `post-receive` hook that unconditionally checks out `master`, runs `docker compose down`, and rebuilds/starts the backend and frontend stacks. It does not filter the pushed ref.
- A push to any branch of that bare repository can therefore interrupt the current service. The GitHub feature-branch push did not trigger the VPS hook.
- A non-mutating `git merge-tree` simulation between code snapshot `60d23d8d` and VPS `master` reports 113 conflict entries. No merge or checkout was attempted on the VPS.
- **Publication status: not deployed.** The local and VPS histories diverge, the separate Docker source mount must be reconciled with the host runtime, and the unconditional down/rebuild hook would interrupt production. Disk usage and CPU load add resource pressure.

## REA compatibility proof

- Official npm package tested in an isolated temporary directory: `rea-agents@6.5.0`.
- Host Node version: `v26.7.0`; the Fênix API container was observed at Node `v22.17.1`, below REA's declared minimum `^22.19.0 || ^24.11.0 || >=26.0.0`.
- `analyze-javascript-application` successfully analyzed a synthetic one-file JavaScript fixture and returned immutable Evidence with subject SHA-256 `e26b66a24b798f86139549f0bcb5d82bb997aee56fcdbe3ef34e16767147aaaf`, 7 application graph nodes, and 6 edges.
- This proves the official REA analyzer can run in the local host environment. It does not prove REA is installed in or integrated with the VPS runtime.

## Verification state

- The platform package test suite passed: 25 tests, 0 failures.
- The full `grg` suite ran serially against the broad working tree: 1,278 tests, 1,191 passed, 76 failed, and 11 skipped (about 11 minutes). Failures span provider, mission, workspace, UI reality, and legacy integration contracts; the full branch is not publishable as one release.
- The pushed commit was reconstructed in a clean temporary worktree, then its conversation, mission, approval, audit, JobEngine, and memory tests passed: 9/9. The focused evidence/reconstruction/project-understanding group passed 23/23 in an earlier serial run.
- REA proof used a synthetic fixture only; no production project was executed by REA.
