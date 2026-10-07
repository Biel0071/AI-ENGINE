# SCREEN_REGISTRY.md

Registry das telas REAIS encontradas no código (não inventado). O frontend canônico do FÊNIX é `grg/public/index.html`; não existe React/Vue no core — vanilla JS com helper `api()` em `grg/public/app.js`.

## WORLD/LIVE-WORKSPACE — Painel FÊNIX OS Live Workspace

- route: `/`
- entrypoint: `grg/public/index.html`
- script: `grg/public/app.js`
- css: `fenix.css`, `design-system.css`, `styles.css`, `city-overrides.css`
- APIs consumidas: —
- seções/painéis: #command; #missions (Mission Workspace); #hotmemory (Hot Memory L0-L5); #knowledge (Knowledge Workspace KOS)
- status: CANÔNICO/ATIVO

## OFFICE — Empresas (SaaS Builder)

- route: `/office`
- entrypoint: `grg/public/office.html`
- script: `grg/public/office.js`
- css: `office.css`
- APIs consumidas: —
- seções/painéis: companies/lojas
- status: CANÔNICO/ATIVO

## LOGIN — Autenticação GRG

- route: `/GRG-login`
- entrypoint: `grg/public/login.html`
- script: `(inline)`
- css: —
- APIs consumidas: `/api/login`, `/api/logout`, `/api/oidc/config`
- seções/painéis: OIDC bootstrap
- status: CANÔNICO/ATIVO

## CONTROL-PLANE-LEGACY — AI-ENGINE Control Plane v2 (legado)

- route: `http://127.0.0.1:4310`
- entrypoint: `platform/public/index.html`
- script: `platform/public/app-v2.js`
- css: `platform/public/styles.css`
- APIs consumidas: `/api/v2/overview`, `/api/v2/projects`, `/api/v2/graph`, `/api/v2/memory`, `/api/v2/members`, `/api/v2/acep/*`, `/api/v2/lcr/*`
- seções/painéis: ACEP; LCR; Graph
- status: LEGADO (plataforma paralela antiga, preservar)

## Nota sobre nomenclatura pedida vs. real

As telas WORLD/WORK/BUILD/MEMORY/CONTROL/AGENTS existem como **âncoras/seções** dentro de index.html (#missions, #hotmemory, #knowledge, #command) servidas pela API `/api/city` (World/City Map via ai-city) — não como rotas SPA separadas. Registrar isso evita criar frontends paralelos.
