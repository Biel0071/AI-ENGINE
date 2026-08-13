---
name: fenix-production-qa
description: Validate FENIX in VPS/production using real URLs, browser clicks, endpoints, and rollback-aware deploy checks.
trigger: [vps, deploy, produção, producao, url, browser, click, login, oidc, health, nginx]
domains: [devops, qa, frontend, observability, security]
---

# FENIX Production QA

Use when validating VPS, deployment, login, frontend, or production readiness.

Checks:
- Public URL: `https://fenix.209-50-241-22.sslip.io`.
- Health: `/health` must return `200` and `status:"ready"`.
- App: `/app` must serve the intended frontend asset version.
- Login: `/api/oidc/config` must point to public HTTPS-compatible auth and callback URLs.
- Frontend QA: open the served URL, click navigation first, then buttons in visible panels.
- Record console errors, failed requests, redirect target, screenshot path, and exact HTTP statuses.

Deploy rule:
- Do not upload code to the VPS or restart production without explicit user approval.
- Preserve other VPS systems; target only FENIX paths/containers.
- Keep a rollback note and verify app/health after deployment.
