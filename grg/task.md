# Task: Fênix City V6 — Game Art Production & VPS Deployment

## Deliverables Checklist
- [x] **V6 Game Art Production Overhaul (`public/pixi-game-art-pipeline.js`, `public/pixi-character-system.js`, `public/pixi-building-interior.js`)**
  - [x] Elimination of procedural primitive look in favor of Asset-First architecture.
  - [x] Golden Slice 2.0 (Development District: Fênix HQ, Dev Loft / ZapAI CRM, AI Platform & VPS Inference Hub, Central Café Kiosk, Station, Plaza, Avenue).
  - [x] 2.5D RPG Character system with anatomical layers (skin, hair, face, outfit, hands, shoes, contact shadow) and 4-frame animation across 8 states (IDLE, WALK, WORK, THINK, COMMUNICATE, SUCCESS, ERROR).
  - [x] Multi-floor building interiors with cutaway walls, desks, dual monitors, servers, sprint boards, and seated animated agents.
  - [x] Zero-HUD Photo Mode (`v6-art-pure-world.png`).
- [x] **Multi-Project Mapping in Fênix City**
  - [x] `ai-engine-core` (Fênix OS HQ)
  - [x] `zapai-final` (ZapAI CRM Dev Loft)
  - [x] `api-platform` (AI Platform & VPS Hub)
  - [x] In-game IDE deep links, code inspection, and live application preview modals (Desktop, Tablet, Mobile).
- [x] **VPS Infrastructure & Deployment (`209.50.241.22`)**
  - [x] Docker containers healthy: `api-platform-api-1` (:3001), `api-platform-dashboard-1` (:8081), `grg-fenix-enterprise-ollama-1` (:11434), postgres & redis.
  - [x] PM2 services online: `fenix-backend` (fixed missing core module, now online on :4410), `fenix-frontend` (serving synced public assets on :3000), `zapflow-api` (:4025), `auto-healer`, `vps-guardian`.
  - [x] Synced all V6 frontend and backend assets (`public/*` and `src/*`) to VPS `/opt/fenix-os/` and `/root/fenix_deploy/`.
  - [x] Verified real AI inference via `http://209.50.241.22:3001/v1/chat/completions` using model `ollama/qwen2.5:3b`.
- [x] **Quality Gates & Verification**
  - [x] `node qa/pixi-v6-art-quality-gate.js` (PASS — CITY_VISUAL_SCORE: 100/100, 11/11 gates passed).
  - [x] `node qa/pixi-v4-master-gate-test.js` (PASS — 8/8 gates passed).
  - [x] `npm run qa:layout-gate` (PASS — 42/42 screens passed, 0 failures).
  - [x] 8 Production Screenshots captured and mirrored to brain artifacts.
  - [x] Git committed and pushed to `origin main-1.0.0` (`8c6d02f7`).
