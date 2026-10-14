# Fênix City Reference Manifest

## Provenance

The three PNGs are the visual references supplied by the user in this conversation. They are copied byte-for-byte into this manifest so they remain available for local QA. The displayed UI inside the images shows `27/09/2026 00:42`; this is only text rendered in the reference and is not treated as a verified capture timestamp. A separate workflow reference video was later supplied and is recorded in `video-reference-01.json`; it is not copied into this repository.

| ID | Intended comparison | Dimensions | SHA-256 |
| --- | --- | --- | --- |
| `reference-01-control-room.png` | City-to-building-to-agent workflow, task form, IDE and execution panels | 1536×1024 | `b8442b499d8ba62927757e0dcacabdb9832a355e70061dc5ed9ff09977f7b23a` |
| `reference-02-district-interiors.png` | Distinct work districts and readable interiors, ambient activity and small live status panels | 1536×1024 | `5957a82fc2239ebb72c2ea2b4d1860e43fd6a4e4d049249bc88b5945ba78eb00` |
| `reference-03-world-map.png` | Dense, legible global city with varied neighborhoods, landmarks and live operational strip | 1536×1024 | `829756b2f8e1b2fa1067b3a4cab6f786752e8430f0d6cc05d4cb0310eb4af541` |

### Workflow reference video

`video-reference-01.json` records the user-supplied `1001647635.mp4` by SHA-256 and media metadata. Sampled frames show a workflow organized around observing a target application, inspecting its UI structure, creating a clone, then comparing the result. The video is design input; its displayed scores and claims are not Fênix measurements or proof that its demonstrated clone works.

## Current baseline (2026-10-13)

The public VPS shell loads `FenixWorld3D` as its effective 3D renderer; `IsoCity` remains a fallback. The checkout and VPS shell/renderer assets differ by content and hash, so local screenshots do not prove production parity. Source inspection shows the renderer uses a fixed rectangular island, orthogonal cross roads, a small set of fixed districts and mostly box-shaped massing. Agent positions are derived from role/district aliases and offsets; they are not movement telemetry. Projects and jobs are read from real APIs, while the city also merges seeded agents and stored projection data. The browser screenshot available in this audit shows a sparse dark scene and compressed overlays; exact authenticated VPS values are `UNKNOWN` because an authenticated browser capture was not available in this audit.

## Local renderer capture (2026-10-13 13:43 -03:00)

`local-world-after-layout.png` was captured at 1536×1024 from the checkout's `grg/public/index.html#city` using the local static preview at `127.0.0.1:8890`. SHA-256: `ebd55c33cf1abfb369846de6c1103ca9f03e999861c4d7ee914c52e7a1c53466`. The renderer initialized with 25 top-level scene objects, 2,838 draw calls and 50,448 triangles in the headless capture. These are scene counters, not a frame-rate or hardware benchmark. The visible render includes the eight operational districts plus 12 explicitly non-interactive scenery blocks. It does not prove API health: the static preview received 119 HTTP error responses while trying to reach backend routes and reported no uncaught page errors. It also did not contain authenticated agents/jobs. The added facade textures improve neighborhood detail, but the capture remains low-poly and materially less dense and varied than the supplied references; the persistent navigation, cockpit and timeline still reduce the map's usable area.

## Comparison contract

| Axis | Required evidence | Current status |
| --- | --- | --- |
| Visual | World, district/building and agent-station captures at wide and narrow viewports; silhouette, color hierarchy, readable detail and unclipped UI compared to the three references | `PARTIAL`: screenshots exist from earlier QA, but no reproducible current wide/narrow capture pair has been recorded against these source references in this manifest |
| Behavioral | Real project/building selection, agent detail/chat, real job activity and navigation back to the same camera/context | `PARTIAL`: source exposes these paths; full authenticated end-to-end flow is not certified |
| Temporal | Only show construction/activity/progress when backed by timestamped events; loading/disconnected/stale states are explicit | `BROKEN/PARTIAL`: city data includes seeded agents and inferred positions; stale-state presentation requires verification |
| Operational | API/runtime health, source/version identity, latency, resource use, queue and restart persistence come from measured runtime data | `PARTIAL`: VPS health is reachable but port 3000/4410 and container 4400 differ; CPU steal and disk pressure were measured; no full restart persistence certification |

## Visual and functional acceptance

- Keep one active 3D renderer and retain the existing camera, API, entity selection and navigation contracts.
- At world zoom, distinguish neighborhoods by architecture, terrain, lighting and silhouette without covering the scene in oversized cards.
- At building zoom, provide readable entrances/interiors for the selected system or project.
- At agent zoom, identify the selected agent and show only its real assignment, state, actions and linked project/job.
- Map projects, agents, jobs and failures to persisted/API-backed entities. Label inferred placement as layout, never as live movement.
- Preserve camera/context after opening a project, IDE, agent or job and returning to the world.
- Show `loading`, `stale`, `disconnected` and measured timestamps distinctly; never substitute seed values or fixed percentages for missing telemetry.
- Record matching screenshots and source/runtime identity for every visual verification run.

## Local self-perception pilot (2026-10-14)

The supplied 75.02-second workflow video was reviewed again at representative frames. It presents observation, mapping, clean-room reconstruction, diff, and parity as separate stages. Its displayed score remains an unverified claim from the reference; Fênix reports no parity percentage from this pilot.

### Implemented evidence path

- A completed system analysis now writes a versioned Memory Fabric record with a stable key per analysis. The entry summarizes the observed projects, screen IDs, module paths, API paths, relationships, source revision/hash, capture coverage, test outcomes, synthesis status, and verification state. It links back to the authenticated analysis artifact.
- Graph Brain stores a tenant-scoped `KNOWLEDGE` node linked to the corresponding project scope. Tenant and project IDs are hashed in graph node IDs; tenant metadata remains available for existing graph-route filtering. Re-running an analysis updates the same memory and graph node and does not duplicate the project edge.
- Analysis details, report JSON, and the Project Hub panel expose `PASS`, `FAIL`, `BLOCKED`, or `NOT_VERIFIED`. No configured isolated suite yields `NOT_VERIFIED`; an unavailable or incomplete suite yields `BLOCKED`; a failed suite yields `FAIL`; `PASS` requires approved isolated suites for every project in scope.
- The Project Hub now shows this status and its reason as text, with a responsive status treatment. The mobile check at 390×844 confirms the status card does not overflow.

### Validation evidence

| Check | Result |
| --- | --- |
| Analysis, memory, hierarchy, conversation, and project-map focused suites | `33/33 PASS` |
| Analysis memory survives reopening `FileStore`; Graph Brain survives reopening its JSON store; retry keeps one memory and edge | `PASS` |
| Authenticated Project Hub browser flow, including a real PNG capture and the visible `NOT_VERIFIED` state | `1/1 PASS` |
| Local API and Graph Brain restart on the VPS | `NOT RUN` |
| External provider synthesis | `NOT VERIFIED`; no real provider result was available in the isolated local run |

The authenticated browser test ran with the local server's relational, Redis, and vector drivers degraded to in-memory/local fallback. Its observability reads returned HTTP 503 under that environment. The optional company absorption read returned 404 because that fixture project had not been absorbed; the Project Hub treats this as a normal empty state. These responses are not evidence that production VPS storage or provider health works.

The full `npm test` suite is still red elsewhere in the dirty workspace. Examples include Alexa and desktop-agent E2E suites, `api-platform-life-reality.test.js`, `api-platform-world-engine.test.js`, `compose-runtime-env.test.js`, `empty-state.test.js`, `screen-shell-assets.test.js`, `self-hosting-e2e.test.js`, `vps-chat-contract.test.js`, and world-runtime suites. This pilot is local only and does not establish checkout/VPS source parity or authorize a production deployment.

## Local startup and responsive remediation (2026-10-14)

- With no route in the URL, startup now opens the City and normalizes the URL to `#city`; explicit routes such as `#memory` remain available. A stale saved view no longer overrides a fresh root visit.
- The responsive shell reflows at tablet and mobile widths, keeps the navigation from covering the active screen, lets the docked chat reserve workspace width, and makes the legacy and current Memory layouts fit narrow screens. A first visit starts with chat collapsed; a saved open preference is retained.
- Browser geometry regression checks passed locally at 797×1258, 390×844 and 1440×900, including Memory with chat open at tablet width. `shell-startup-responsive.test.js` and `copilot-layout.test.js` passed; JavaScript syntax checks passed.
- `screen-shell-assets.test.js` still fails its existing inventory assertions (it expects 14 navigation entries and five old groups, while the current shell exposes seven entries); this check does not cover route startup or responsive geometry.
- These checks use a local static preview, so API telemetry and authenticated production rendering were not verified. No VPS deployment or production change was made.
