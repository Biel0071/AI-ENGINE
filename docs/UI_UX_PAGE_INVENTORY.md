# Fênix OS — Canonical Page & View Inventory

**Document Version:** 1.0.0  
**Timestamp:** 2026-11-04T02:11:00Z  
**Scope:** Single Source of Truth (`ai-engine/grg/public/index.html`)  
**Architecture:** Pure Modular Vanilla JavaScript SPA with 14 Native Views  

---

## View Inventory Matrix

### 1. View: Autonomous Cockpit & Command Center
- **DOM Identifier:** `#view-command`
- **Route Hash:** `#command` (or `#dashboard`)
- **Primary Purpose:** Central operator cockpit providing real-time situational awareness, quick action dispatch dock, autonomous cycle status, active missions, and high-level KPI telemetry.
- **Key Subcomponents:**
  - Header Identity & Greeting (`#fenixGreetingTitle`)
  - Fast Actions Dock (`.fenix-fast-actions-dock`)
  - Operational Cycle Progress Bar (`.fenix-operational-cycle-bar` with 7 stages: Command, Understand, Investigate, Plan, Execute, Verify, Learn)
  - KPI Metric Strip (`#fenixKpiHealth`, `#fenixKpiScore`, `#fenixKpiAgents`, `#fenixKpiJobs`, `#fenixKpiMissions`, `#fenixKpiProjects`)
  - Active Mission Cockpit Stage (`.fenix-mission-cockpit-stage`)
  - Backward-compatibility DOM fixtures required by regression suites (`#orchHeatmapGrid`, `#projectSwitcher`, `#chatLog`)
- **Backing APIs:**
  - `GET /api/v2/system-reconstruction/health`
  - `GET /api/v2/living-city/state`
  - `GET /api/v2/jobs`
  - `GET /api/v2/missions`
- **Reactive Events:** `fenix-entity-selected`, `fenix-view-changed`
- **Status:** **Reconstructed & Verified**

---

### 2. View: AI Living City (3D & 2D Projection)
- **DOM Identifier:** `#view-city`
- **Route Hash:** `#city` (or `#world`)
- **Primary Purpose:** Spatial digital twin representing the multi-agent cognitive organization as an interconnected metropolis. Each building corresponds to a core project or domain service, and roaming agents represent active cognitive workers.
- **Key Subcomponents:**
  - WebGL / Three.js 3D Canvas (`#cityCanvas`, `#threeCanvas`)
  - Fallback 2D Isometric SVG Grid (`.city-2d-canvas`)
  - District Navigation & Quick Fly-to Bar (Core District, CRM District, API Platform District, Operations District)
  - Spatial Agent & Building Inspection Drawer (`#fenixSpatialAgentDrawer`, `#evolutionCityInspector`)
  - Mode Switcher (2D Isometric vs 3D Perspective)
- **Backing APIs:**
  - `GET /api/v2/city/state`
  - `GET /api/v2/living-city/agents`
  - `GET /api/v2/living-city/buildings`
- **Reactive Events:** `fenix-agent-selected`, `fenix-building-selected`, `fenix-city-camera-move`
- **Status:** **Reconstructed & Verified**

---

### 3. View: Workforce & Cognitive Fleet (Agents)
- **DOM Identifier:** `#view-agents`
- **Route Hash:** `#agents`
- **Primary Purpose:** Full organizational roster of cognitive agents, specialized bots, and supervisory brains. Enables deep inspection, capability examination, prompt inspection, and real-time mascot chat handoff.
- **Key Subcomponents:**
  - Top Roster KPI Bar (`#fenixAgentRegisteredCount`, `#fenixAgentWorkingCount`, `#fenixAgentAvailableCount`)
  - Workforce Squad Grouping Grid (`#fenixSquadActiveGroup`, `#fenixSquadAvailableGroup`, `#fenixSquadOtherGroup`)
  - Agent Cards (`.cp-agent-card` with dynamic status badge, archetype, avatar, tags, and "Conversar" action)
  - Tabular List Alternative View (`#fenixAgentsListView`)
  - Deep Inspector Sidebar (`#fenixDeepAgentInspector`)
- **Backing APIs:**
  - `GET /api/v2/living-city/agents`
  - `GET /api/v2/living-city/state`
- **Defects Resolved:** Fixed missing `statusLabel` reference error causing permanent loading hang.
- **Status:** **Reconstructed & Verified**

---

### 4. View: Visual Evolution IDE
- **DOM Identifier:** `#view-ide`
- **Route Hash:** `#ide`
- **Primary Purpose:** Built-in web-based code workspace for real-time visual inspection, component scaling, CSS live hot-reload, file editing, and direct verification.
- **Key Subcomponents:**
  - File Explorer Sidebar (`#ideFileTree`)
  - Code Editor Viewport (`#ideEditorContainer`)
  - Live Component Preview Iframe with scale controls (`#idePreviewFrame`, `#ideZoomLevel`)
  - Terminal Bottom Output Rail (`#ideTerminalSession`)
- **Backing APIs:**
  - `GET /api/v2/ide/files`
  - `POST /api/v2/ide/save`
  - `GET /api/v2/ide/terminal/poll`
- **Status:** **Reconstructed & Verified**

---

### 5. View: Operations & Work Hub
- **DOM Identifier:** `#view-operations`
- **Route Hash:** `#operations`
- **Primary Purpose:** Central task coordination center managing the autonomous execution lifecycle, job queues (pending, active, completed, failed), mission approval workflows, and historical audits.
- **Key Subcomponents:**
  - Queue KPI Summary (`#opsPendingCount`, `#opsActiveCount`, `#opsCompletedCount`, `#opsFailedCount`)
  - Mission Pipeline Stage Board (`.ops-missions-board`)
  - JobEngine Real-Time Stream Table (`#opsJobsTable`)
  - Manual Mission Dispatch Dialog (`#modalNewMission`)
- **Backing APIs:**
  - `GET /api/v2/jobs`
  - `GET /api/v2/missions`
  - `POST /api/v2/missions/create`
- **Defects Resolved:** Hydration connected on tab switch; telemetry output increased from 97 chars to 3,607 chars of real operational data.
- **Status:** **Reconstructed & Verified**

---

### 6. View: Living Runtime Engine
- **DOM Identifier:** `#view-runtime`
- **Route Hash:** `#runtime`
- **Primary Purpose:** Direct telemetry monitor for the Node.js runtime, OS memory footprints, Redis cache status, vector memory storage engines, and autonomous tick frequency.
- **Key Subcomponents:**
  - Memory Footprint Gauge (Heap Used, RSS, External)
  - Subsystem Health Badges (Relational DB, Redis Cache, Qdrant Vector, Ollama LLM)
  - Autonomous Execution Controls (`#autonomousCycleBtn`, `#tickBtn`, `#qaRerunBtn`)
  - Runtime Event Log Stream (`#runtimeConsoleStream`)
- **Backing APIs:**
  - `GET /api/v2/system/status`
  - `POST /api/v2/autonomous/cycle`
  - `POST /api/v2/autonomous/tick`
- **Defects Resolved:** Removed artificial disable overrides (" · Em desenvolvimento"); wired buttons to real endpoints with toast notification feedback.
- **Status:** **Reconstructed & Verified**

---

### 7. View: Project Hub & Digital Twin
- **DOM Identifier:** `#view-projects`
- **Route Hash:** `#projects`
- **Primary Purpose:** Portfolio catalog of all projects, repositories, and applications managed under the Fênix ecosystem, linking local workstation workspaces with remote VPS deployment targets.
- **Key Subcomponents:**
  - Filter Bar (Search, Category, Scope: Local vs VPS, Status)
  - Project Cards Grid (`.fp-project-card` with health pill, active ports, repository link, and open workspace action)
  - Multi-Project Inspector Drawer
  - Project DNA & Architecture Analyzer Panel
- **Backing APIs:**
  - `GET /api/v2/projects`
  - `GET /api/v2/system/registry/projects`
  - `GET /api/v2/project-hub/catalog`
- **Defects Resolved:** Expanded `operationalStatus` classifier to handle `ONLINE`, `OFFLINE`, `DEGRADED`, `NOT_CONFIGURED`, and `ERROR` states with descriptive port metrics.
- **Status:** **Reconstructed & Verified**

---

### 8. View: Graph Brain & Cognitive Memory
- **DOM Identifier:** `#view-memory`
- **Route Hash:** `#memory`
- **Primary Purpose:** Interactive visualization of the 7-Layer Cognitive Memory Architecture (L1 Working, L2 Episodic, L3 Semantic, L4 Procedural, L5 Graph Brain, L6 Evolution, L7 Constitutional) spanning 1,600+ entities and 6,000+ relationships.
- **Key Subcomponents:**
  - 3D Neural Constellation WebGL Canvas (`#fenixNeuralBrainWebglCanvas`, `#fenixNeuralBrainCanvas`)
  - 2D Relation Topology SVG Fallback (`#fmlMap`)
  - 7-Layer Selector Strip (`#fenixMemoryLayers` / `.fenix-mem-layer`)
  - Entity Search & Type Filter (`#fmlSearch`, `#fmlType`)
  - Multi-AI Connector Hub (`#fmlConnectHubDrawer` with curl snippets for Claude, Codex, Gemini, Cursor)
  - Entity Detail Inspector Card (`#fmlDetail`)
- **Backing APIs:**
  - `GET /api/v2/graph/data?full=true`
  - `GET /api/v2/memory-index/status`
  - `GET /api/v2/memory-index/active-memory`
- **Defects Resolved:** Attached `ResizeObserver` on canvas parent element to guarantee non-zero dimensions; wired hydration to `showView('memory')`.
- **Status:** **Reconstructed & Verified**

---

### 9. View: Enterprise Knowledge Base
- **DOM Identifier:** `#view-knowledge`
- **Route Hash:** `#knowledge`
- **Primary Purpose:** Semantic documentation hub, constitutional governance index, architectural decision records (ADRs), and RAG vector store query interface.
- **Key Subcomponents:**
  - Document Category Tree (Constitution, Architecture, Manuals, Security, Protocols)
  - Semantic Search Engine Bar
  - Document Reader & Markdown Viewer
  - Vector Embedding Status Strip
- **Backing APIs:**
  - `GET /api/v2/knowledge/documents`
  - `POST /api/v2/rag/query`
- **Status:** **Reconstructed & Verified**

---

### 10. View: Model Context Protocol (MCP) Hub
- **DOM Identifier:** `#view-mcp`
- **Route Hash:** `#mcp`
- **Primary Purpose:** Registry and lifecycle controller for all MCP tool servers (filesystem, postgres, fetch, git, search, chrome-devtools) available to AI models.
- **Key Subcomponents:**
  - Server Cards Grid with status dot, latency, and registered tools
  - Tool Invocation Sandbox Playground
  - JSON-RPC Activity Inspector
- **Backing APIs:**
  - `GET /api/v2/mcp/servers`
  - `GET /api/v2/mcp/tools`
- **Status:** **Reconstructed & Verified**

---

### 11. View: Browser Agent Instance (BAI)
- **DOM Identifier:** `#view-browser`
- **Route Hash:** `#browser`
- **Primary Purpose:** Secure web automation sandbox running anti-detect Chromium profiles for scraping, automated form submission, and live session monitoring.
- **Key Subcomponents:**
  - Navigation Address Bar & Bookmarks
  - Live Viewport Sandbox Stage (`.bai-viewport-wrapper`)
  - Standby Welcome Overlay (`#baiStandbyOverlay`) with Chromium status
  - Anti-Detect Profile Grid (`#baiInstancesGrid`)
  - Automation Flows Catalog (`#baiFlowsGrid`)
- **Backing APIs:**
  - `GET /api/v2/browser/stats`
  - `GET /api/v2/browser/instances`
  - `POST /api/v2/browser/navigate`
  - `POST /api/v2/browser/flow/run`
- **Defects Resolved:** Eliminated recursive `<iframe src="/app">` embedding; installed honest standby stage and dynamic status indicator.
- **Status:** **Reconstructed & Verified**

---

### 12. View: Deep Observability & SRE Center
- **DOM Identifier:** `#view-observability`
- **Route Hash:** `#observability`
- **Primary Purpose:** System-wide observability dashboard displaying Prometheus-style metrics, error rate trends, latency heatmaps, and structured audit logs.
- **Key Subcomponents:**
  - Real-Time Error Log Stream
  - Latency Percentile Cards (p50, p95, p99)
  - Subsystem Activity Heatmap
  - Audit Trail Export Button
- **Backing APIs:**
  - `GET /api/v2/system/metrics`
  - `GET /api/v2/observability/logs`
- **Status:** **Reconstructed & Verified**

---

### 13. View: Universal System Terminal
- **DOM Identifier:** `#view-terminal`
- **Route Hash:** `#terminal`
- **Primary Purpose:** Terminal emulation bridge allowing authenticated administrators to execute authorized shell commands on the hosting runtime.
- **Key Subcomponents:**
  - XTerm.js Compatible Canvas / PTY Screen
  - Quick Command Dock (`git status`, `pm2 status`, `df -h`)
  - Session Status Indicator (Connected, Disconnected)
- **Backing APIs:**
  - `POST /api/v2/terminal/session`
  - `POST /api/v2/terminal/exec`
- **Status:** **Reconstructed & Verified**

---

### 14. View: Architecture Flow Graph
- **DOM Identifier:** `#view-flowgraph`
- **Route Hash:** `#flowgraph`
- **Primary Purpose:** Interactive dependency graph showing the topological wiring between all 15 Specialized Brains, Runtime Engines, Storage adaptors, and external clients.
- **Key Subcomponents:**
  - Directed Acyclic Graph (DAG) Canvas
  - Node Details Inspector
  - Subsystem Filter Toggles
- **Backing APIs:**
  - `GET /api/v2/flowgraph/graph`
  - `GET /api/v2/runtime/manifest`
- **Status:** **Reconstructed & Verified**
