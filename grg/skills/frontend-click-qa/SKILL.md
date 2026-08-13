---
name: frontend-click-qa
description: Validate dashboards by opening the real URL, clicking visible controls, and separating clickbugs from backend state.
trigger: [frontend, front, ui, click, button, browser, playwright, dashboard, tela]
domains: [frontend, qa, ux]
tokens: 360
---

# Frontend Click QA

Use this skill for front-end validation, dashboard merges, browser tests, and clickbug hunting.

Workflow:
- Open the actual served URL, not only the local HTML file.
- Record redirects, title, visible route, console errors, failed requests, and screenshot path.
- Click navigation first, then buttons inside the currently visible view.
- If a button times out, diagnose whether a modal, hidden view, disabled state, overlay, or backend wait caused it.
- Classify findings as UI clickbug, backend endpoint error, auth/config issue, or expected empty state.

Validation output:
- URL tested.
- Auth/session method used.
- Navigation result count.
- Button result count.
- Screenshots and exact failing endpoint/status when present.
