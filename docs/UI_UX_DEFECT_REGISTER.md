# Fênix OS — Defect Register & Resolution Ledger

**Document Version:** 1.0.0  
**Timestamp:** 2026-11-04T02:12:00Z  
**Standard:** Zero-Mock Engineering & Systematic Root-Cause Debugging  
**Audit Harness:** Playwright Edge Chromium (`ai-engine/grg/scripts/audit-and-capture-all.js`)  

---

## 1. Summary of Defect Classifications

| Defect ID | Severity | View Affected | Category | Resolution Status |
|-----------|----------|---------------|----------|-------------------|
| **DEF-01** | **Critical (Fatal)** | `view-agents` | Runtime Exception (ReferenceError) | **RESOLVED & VERIFIED** |
| **DEF-02** | **High** | `view-memory` | Canvas Zero-Size / Unprojected WebGL | **RESOLVED & VERIFIED** |
| **DEF-03** | **High** | `view-browser` | Recursive Iframe Shell Embedding | **RESOLVED & VERIFIED** |
| **DEF-04** | **Medium** | `view-runtime` | Artificial Control Disabling | **RESOLVED & VERIFIED** |
| **DEF-05** | **Medium** | `view-projects` | Binary Status Oversimplification | **RESOLVED & VERIFIED** |
| **DEF-06** | **Medium** | `view-command` / SPA | Routing Display Synchronization | **RESOLVED & VERIFIED** |
| **DEF-07** | **High** | `view-city` / Agents | Avatar Resolution 404 Errors | **RESOLVED & VERIFIED** |
| **DEF-08** | **High** | `view-command` | Command Route Alias Hijack | **RESOLVED & VERIFIED** |
| **DEF-09** | **Medium** | `view-memory` | Obsidian Central Sidebar Disconnect | **RESOLVED & VERIFIED** |
| **DEF-10** | **Medium** | `view-browser` | Synthetic Random TOTP & Mock Alert | **RESOLVED & VERIFIED** |
| **DEF-11** | **Medium** | `view-operations` | Agent Inspector Placeholder Button | **RESOLVED & VERIFIED** |
| **DEF-12** | **Medium** | `view-projects` | Status Counter NaN & Missing Filters | **RESOLVED & VERIFIED** |
| **DEF-13** | **Medium** | Infra / Compose | Missing Heartbeat Variable in Compose | **RESOLVED & VERIFIED** |

---

## 2. Detailed Defect Investigations & Resolutions

### DEF-01: Uncaught `ReferenceError: statusLabel is not defined` in Agents Roster

- **Severity:** Critical (Fatal Functional Bug)
- **Affected File:** `ai-engine/grg/public/fenix-v11-interactions.js` (Line 835)
- **Symptom:** The Workforce & Agents screen remained frozen indefinitely on `"Conectando à frota de agentes..."`. No agent cards were rendered, and clicking on the view gave the impression that the agent fleet was down or unconfigured.
- **Empirical Diagnosis (via Playwright Console Listener):**
  ```text
  [BROWSER ERROR] [FENIX] Falha ao carregar agentes: ReferenceError: statusLabel is not defined
      at renderCard (http://127.0.0.1:4400/fenix-v11-interactions.js:835:184)
      at Array.map (<anonymous>)
      at window.fenixLoadAgents (http://127.0.0.1:4400/fenix-v11-interactions.js:859:32)
  ```
- **Root Cause:** In `renderCard(agent)`, the template literal accessed `${escape(statusLabel)}`, but `statusLabel` was never declared or computed in the function scope. When the API response arrived, the map loop crashed immediately on the first card, caught by `catch (e)`, which showed an error notice and left the loading indicator visible.
- **Remediation:**
  In `ai-engine/grg/public/fenix-v11-interactions.js`, declared `statusLabel` using `window.FenixAgentRosterFilter?.classifyAgent(agent)`:
  ```javascript
  const classification = window.FenixAgentRosterFilter?.classifyAgent(agent) || 'OTHER';
  const rawStatus = String(agent.state || agent.status || 'SEM ESTADO');
  const statusLabel = classification === 'WORKING' ? 'EM EXECUÇÃO' : classification === 'AVAILABLE' ? 'DISPONÍVEL' : rawStatus.toUpperCase();
  ```
  Furthermore, updated squad filtering to use `classifyAgent(a)` rather than solely `a.status` to ensure strict synchronization with top KPI counters.
- **Verification Evidence:**
  - Syntax check: `node -c ai-engine/grg/public/fenix-v11-interactions.js` exited 0.
  - Re-run Playwright audit: `agents-1440x900.png` captured with all cards fully rendered.
  - Zero browser errors logged for `view-agents`.

---

### DEF-02: Zero-Dimension Initialization & Missing Resize Observer in Graph Brain

- **Severity:** High
- **Affected File:** `ai-engine/grg/public/memory-live.js` (Line 657)
- **Symptom:** When opening the Memory view, the central graph area appeared black or empty, despite the backend API (`/api/v2/graph/data?full=true`) returning 1,645 nodes and 6,263 edges.
- **Empirical Diagnosis:**
  When the application shell booted on `#command` or `#city`, `view-memory` had `display: none`. Calling `init3DNeuralBrain()` during this hidden phase resulted in `canvas.parentElement.getBoundingClientRect()` returning `width: 0, height: 0`. The canvas initialized to 1x1 pixels. Because `neuralBrainResizeObserver` was declared as `null` but never instantiated or attached, switching tabs never re-measured the container.
- **Remediation:**
  Instantiated a native `ResizeObserver` observing `canvas.parentElement`:
  ```javascript
  if (window.ResizeObserver && !neuralBrainResizeObserver) {
    neuralBrainResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 20 && entry.contentRect.height > 20) {
          const nw = Math.round(entry.contentRect.width);
          const nh = Math.round(entry.contentRect.height);
          if (Math.abs(neuralBrainSize.width - nw) > 4 || Math.abs(neuralBrainSize.height - nh) > 4) {
            init3DNeuralBrain();
          }
        }
      }
    });
    neuralBrainResizeObserver.observe(canvas.parentElement);
  }
  ```
  Additionally, wired `window.showView('memory')` in `fenix-core-controller.js` to invoke `window.fenixMountMemoryView()` or `window.loadMemoryView()`.
- **Verification Evidence:**
  - Syntax check: `node -c ai-engine/grg/public/memory-live.js` exited 0.
  - `memory-1440x900.png` captures the multi-node constellation with dynamic relations and labels.

---

### DEF-03: Recursive Shell Embedding in Browser Agent Instance (BAI)

- **Severity:** High (Architectural & Performance Risk)
- **Affected File:** `ai-engine/grg/public/index.html` (Line 4479)
- **Symptom:** When navigating to `#browser`, the main viewport embedded an iframe loading `/app`. This caused the entire Fênix OS shell (header, sidebar, 14 views, WebGL canvas, SSE connections) to boot recursively inside itself.
- **Empirical Diagnosis:**
  Inspection of static HTML revealed:
  ```html
  <iframe id="baiViewportFrame" class="bai-viewport-frame" src="/app" title="BAI Live Session Preview"></iframe>
  ```
  This doubled CPU and memory consumption and caused competing SSE socket subscriptions.
- **Remediation:**
  Replaced the recursive `src="/app"` with a clean standby stage:
  - Rendered `#baiStandbyOverlay` explaining the Browser Agent Instance's isolated Chromium engine and sandbox parameters.
  - Set iframe `src="about:blank"` with `display: none` until explicit user navigation occurs.
  - Updated `baiNavigateTo(url)` in `fenix-bai-browser.js` to reveal the iframe, hide the standby overlay, and update live latency chips.
- **Verification Evidence:**
  - Zero recursion.
  - Browser view text length increased from 595 to 793 characters with full instance status cards.

---

### DEF-04: Artificially Disabled Autonomous Loop Controls in Runtime View

- **Severity:** Medium
- **Affected File:** `ai-engine/grg/public/fenix-core-controller.js` (Line 1027)
- **Symptom:** In the Living Runtime screen (`view-runtime`), the action buttons `autonomousCycleBtn`, `tickBtn`, and `qaRerunBtn` were greyed out and labeled `" · Em desenvolvimento"`, despite the backend supporting `/api/v2/autonomous/cycle` and `/api/v2/autonomous/tick`.
- **Empirical Diagnosis:**
  Found explicit mock suppression code:
  ```javascript
  ['autonomousCycleBtn','tickBtn','qaRerunBtn'].forEach(id=>{const el=byId(id);if(el){el.disabled=true;el.title='Em desenvolvimento...';el.textContent+=' · Em desenvolvimento';}});
  ```
- **Remediation:**
  Removed the artificial suppression loop. Connected each button with asynchronous click handlers targeting real endpoints with loading state management, disabled toggle during in-flight requests, and user notifications via `showNotification`.
- **Verification Evidence:**
  - Syntax check: `node -c ai-engine/grg/public/fenix-core-controller.js` exited 0.
  - Runtime view buttons are interactive and responsive.

---

### DEF-05: Binary Status Oversimplification in Project Hub

- **Severity:** Medium
- **Affected File:** `ai-engine/grg/public/project-hub-live.js` (Line 102)
- **Symptom:** Projects were classified strictly as binary `online` or `offline`, masking actionable states such as `DEGRADED`, `ERROR`, or `SEM PORTAS` (when no frontend or backend bindings were configured).
- **Remediation:**
  Refactored `operationalStatus(project)` to distinguish:
  - `online`: live port responding.
  - `degraded`: partially responding or high latency.
  - `error`: connection refused or 5xx.
  - `not_configured`: missing port bindings.
  - `unknown`: unmeasured / awaiting poll.
- **Verification Evidence:**
  - Syntax check: `node -c ai-engine/grg/public/project-hub-live.js` exited 0.
  - Projects view text length jumped from 72 characters to 9,678 characters of real project metadata.

---

### DEF-06: DOM Display Inconsistency in Router (`window.showView`)

- **Severity:** Medium
- **Affected File:** `ai-engine/grg/public/fenix-core-controller.js` (Line 638)
- **Symptom:** Certain views (such as `view-command`) did not properly clear `display: none` when navigated to via `showView(id)` if another delegate function had hooked the call.
- **Remediation:**
  Enforced unconditional DOM visibility switching in `window.showView`:
  ```javascript
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active');
    v.style.display = 'none';
  });
  const target = document.getElementById('view-' + viewName);
  if (target) {
    target.classList.add('active');
    target.style.display = '';
  }
  ```
- **Verification Evidence:**
  - All 14 views reliably transition to `display: flex !important` and receive active styling.

---

### DEF-07: Avatar URL Stringification Defect & 404 on `/CEO` and `/[object Object]`

- **Severity:** High
- **Affected Files:** `ai-engine/grg/src/company/ceo-agent.js`, `ai-engine/grg/public/index.html`, `ai-engine/grg/public/city-reality-engine.js`
- **Symptom:** Browser logged HTTP 404 errors attempting to load `http://127.0.0.1:4400/CEO` and `http://127.0.0.1:4400/[object%20Object]`.
- **Empirical Diagnosis:**
  1. `ceo-agent.js` had `avatar: 'CEO'`.
  2. `index.html` line 6566 and `city-reality-engine.js` line 425 interpolated `${ag.avatar}` directly into `<img src="${avatarSrc}">`.
  3. When `ag.avatar` was `'CEO'`, the browser fetched `/CEO` (404 Not Found).
  4. When `ag.avatar` was an object (`{ avatarUrl: '...' }`), it converted to string `"[object Object]"`, requesting `/[object%20Object]` (404 Not Found).
- **Remediation:**
  1. Updated `ceo-agent.js` to define valid path `avatar: '/assets/agents/carlos_avatar.png'`.
  2. Implemented safe avatar URL resolution in both `index.html` and `city-reality-engine.js`, verifying URL protocol or prefix before usage and falling back cleanly to asset placeholders.
- **Verification Evidence:**
  - `docs/audit-reconstructed-report.json` confirmed 0 requests to `/CEO` and `/[object Object]`.

---

### DEF-08: Canonical `view-command` Hijacked by Router Alias to `city`

- **Severity:** High
- **Affected Files:** `ai-engine/grg/public/index.html`, `ai-engine/grg/public/fenix-core-controller.js`
- **Symptom:** During automated Playwright audit, `view-command` reported `visible: false, width: 0, height: 0`.
- **Empirical Diagnosis:**
  In `index.html` line 5762, `ROUTE_ALIASES` explicitly mapped `'command': 'city'`. Any call to `showView('command')` was converted to `'city'`, suppressing the canonical command center layout.
- **Remediation:**
  1. Removed `'command': 'city'` alias from `ROUTE_ALIASES` in `index.html`.
  2. Ensured `originalShowView` controls view visibility with `display: flex !important` and prevents conflicting double-hiding.
- **Verification Evidence:**
  - Playwright audit report confirmed `view-command`: `exists: true, visible: true, width: 1202, height: 804, textLen: 2429`.

---

### DEF-09: Central Memory Obsidian Sidebar & Search Integration

- **Severity:** Medium
- **Affected File:** `ai-engine/grg/public/memory-live.js`
- **Symptom:** In `view-memory`, the top Obsidian sidebar (`#fenixMemClusterName`, `#fenixMemClusterCount`, `#fenixMemConfVal`, `#fenixMemRecVal`, `#fenixMemTopicsList`) remained displaying `—` even after graph entities were loaded.
- **Empirical Diagnosis:**
  `memory-live.js` rendered detailed cards exclusively into `#fmlDetail` in the lower container without synchronizing the upper Obsidian HUD.
- **Remediation:**
  Extended `renderDetail()` to dynamically update both `#fmlDetail` and the upper Obsidian sidebar elements with real entity properties, relation counts, and neighbor lists. Wired `window.fenixSearchMemory` to filter the live graph.
- **Verification Evidence:**
  - Re-run audit screenshot `memory-1440x900.png` shows populated metadata and active node relations.

---

### DEF-10: Synthetic Random 2FA TOTP and Mock AdsPower Alert in Browser View

- **Severity:** Medium (Rule II Zero-Mock Violation)
- **Affected File:** `ai-engine/grg/public/fenix-bai-browser.js`
- **Symptom:** `generateBaiTotp()` used `Math.floor(100000 + Math.random() * 900000)` and `exportBaiToAdsPower()` threw a dummy alert.
- **Remediation:**
  Replaced with authentic API verification against `/api/v2/browser/instance/:id/totp` and real JSON blob configuration download for AdsPower profiles.
- **Verification Evidence:**
  - Passed `node ai-engine/grg/test/frontend-honesty.test.js` (19/19).

---

### DEF-11: Agent Inspector "Em desenvolvimento" Button Suppression

- **Severity:** Medium
- **Affected File:** `ai-engine/grg/public/fenix-operational-os.js`
- **Symptom:** When opening the agent inspector, the execution button rendered as disabled `🚧 Em desenvolvimento` if capability keywords were not matched in the array.
- **Remediation:**
  Replaced with active `⚡ Executar Ciclo` button connected to `/api/v2/runtime/tick` with real feedback.
- **Verification Evidence:**
  - Inspector is fully operational for all runtime agents.

---

### DEF-12: Status Counter NaN and Missing Filter Pills in Project Hub

- **Severity:** Medium
- **Affected File:** `ai-engine/grg/public/project-hub-live.js`
- **Symptom:** When `operationalStatus(p).status` was `'degraded'`, `'error'`, or `'not_configured'`, `statusCounts[status] += 1` resulted in `NaN`. The toolbar also lacked filter buttons for these states.
- **Remediation:**
  Initialized all 6 status keys in `statusCounts` reducer, added filter pill buttons for `degraded`, `error`, and `not_configured`, and wired badges.
- **Verification Evidence:**
  - All status counters display valid integer numbers.

---

### DEF-13: Missing Heartbeat Interval Variable in Docker Compose Allowlist

- **Severity:** Medium
- **Affected File:** `ai-engine/grg/docker-compose.enterprise.yml`
- **Symptom:** `compose-runtime-env.test.js` failed assertion: `AssertionError: variaveis lidas pelo runtime e ausentes do compose: FENIX_WORKER_HEARTBEAT_INTERVAL_MS`.
- **Remediation:**
  Added `FENIX_WORKER_HEARTBEAT_INTERVAL_MS: ${FENIX_WORKER_HEARTBEAT_INTERVAL_MS:-}` to the compose environment block.
- **Verification Evidence:**
  - `node ai-engine/grg/test/compose-runtime-env.test.js` passed 8/8 tests.

