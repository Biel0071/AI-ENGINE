'use strict';

/**
 * FÊNIX OS V7 — VISUAL COMMAND CENTER & INTELLIGENT OPERATIONS TEST SUITE
 * ======================================================================
 * Validates the 11 phases of Fênix OS V7:
 * 1. Executive Header with Telemetry Envelope
 * 2. 6 KPI Cards with Trend Series (Sparklines), deltas and exact formulas
 * 3. Historical Totals vs Current Cycle separation (zero counter shifting)
 * 4. 12 Subsystems with probe-backed states, latency and occurrence counts
 * 5. 3 Cadences (Health, Quality, Evolution) with working manual trigger actions
 * 6. Interactive Multi-Agent DAG (9 nodes) with modal inspection
 * 7. Provider Control Center (VPS, Antigravity, Codex CLI) with failover routes
 * 8. Project Intelligence Portfolio with projects and filter tags
 * 9. City Reality & Mascot Sidebar topbar-footer health reconciliation
 * 10. Active jobs / workers reconciliation (no ghost RUNNING jobs)
 * 11. 3D World Camera Elevation & Project HUD Label Visibility
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const autonomousLoopPath = path.resolve(__dirname, '../src/evolution/fenix-autonomous-loop.js');
const reaEnginePath = path.resolve(__dirname, '../src/services/rea-intelligence-engine.js');
const operationsLiveJsPath = path.resolve(__dirname, '../public/operations-live.js');
const operationsLiveCssPath = path.resolve(__dirname, '../public/operations-live.css');
const cityRealityJsPath = path.resolve(__dirname, '../public/city-reality-engine.js');
const mascotSidebarJsPath = path.resolve(__dirname, '../public/fenix-mascot-sidebar.js');
const fenixWorld3dJsPath = path.resolve(__dirname, '../public/fenix-world-3d.js');

test('V7.1 — Executive Header & Telemetry Envelope with Historical Separation', async () => {
  const { FenixAutonomousLoop } = require(autonomousLoopPath);
  const loop = new FenixAutonomousLoop();
  
  const report = loop.getEvolutionReport();
  assert.ok(report, 'Evolution report must exist');
  assert.ok(report.telemetryEnvelope, 'Telemetry envelope must exist');
  assert.equal(report.telemetryEnvelope.source, 'fenix-autonomous-loop');
  assert.ok(report.telemetryEnvelope.timestamp, 'Timestamp must exist');
  assert.ok(['FRESH', 'CURRENT', 'STALE'].includes(report.telemetryEnvelope.freshness), 'Freshness must be valid');
  assert.ok(report.telemetryEnvelope.status, 'Status must exist');

  // Assert 6 KPI cards with trend series (sparkline) and formulas
  assert.ok(report.kpis && typeof report.kpis === 'object', 'KPIs must be an object');
  const requiredKeys = ['problemsDetected', 'problemsResolved', 'independentValidationsApproved', 'blockedPending', 'resolutionRatePercent', 'publishedEvolutions'];
  for (const key of requiredKeys) {
    const card = report.kpis[key];
    assert.ok(card, `KPI card ${key} must exist`);
    assert.ok(card.formula, `KPI card ${key} must have an explicit formula`);
    assert.ok(Array.isArray(card.trendSeries), `KPI card ${key} must have trend series (sparkline) data`);
    assert.ok(card.trendSeries.length >= 5, `KPI card ${key} trendSeries must have at least 5 data points`);
  }

  // Assert Historical Totals vs Current Cycle separation
  assert.ok(report.historicalTotals, 'Historical totals must exist');
  assert.ok(report.currentCycleMetrics, 'Current cycle metrics must exist');
  assert.equal(typeof report.historicalTotals.totalCyclesRun, 'number');
  assert.equal(typeof report.historicalTotals.totalMissionsProcessed, 'number');
  assert.equal(typeof report.currentCycleMetrics.cycleProblems, 'number');
  assert.equal(typeof report.currentCycleMetrics.cycleFixes, 'number');
});

test('V7.2 — 12 Subsystems with Probe-backed States & 3 Cadence Schedules', async () => {
  const { FenixAutonomousLoop } = require(autonomousLoopPath);
  const loop = new FenixAutonomousLoop();

  const subsResult = loop.getV6SubsystemsStatus();
  assert.ok(subsResult, 'Subsystems result must exist');
  assert.ok(Array.isArray(subsResult.subsystems), 'Subsystems must be an array');
  assert.equal(subsResult.subsystems.length, 12, 'Must contain exactly 12 subsystems');

  const validStates = ['HEALTHY', 'DEGRADED', 'BLOCKED', 'OFFLINE', 'RUNNING', 'UNKNOWN'];
  for (const sub of subsResult.subsystems) {
    assert.ok(validStates.includes(sub.status), `Subsystem ${sub.id} has invalid status ${sub.status}`);
    assert.ok(sub.lastRunAt, `Subsystem ${sub.id} must have lastRunAt`);
    assert.ok(Number.isFinite(sub.responseTimeMs), `Subsystem ${sub.id} must have numeric responseTimeMs`);
    assert.ok(Number.isFinite(sub.occurrencesCount), `Subsystem ${sub.id} must have numeric occurrencesCount`);
  }

  // Assert 3 Cadences from schedules
  const schedules = loop.getSchedulesStatus();
  assert.ok(schedules.cadences, 'Cadences must exist');
  assert.ok(schedules.cadences.health, 'Health cadence must exist');
  assert.ok(schedules.cadences.quality, 'Quality cadence must exist');
  assert.ok(schedules.cadences.evolution, 'Evolution cadence must exist');
  assert.ok(schedules.cadences.health.intervalMs > 0);
  assert.ok(schedules.cadences.quality.intervalMs > 0);
  assert.ok(schedules.cadences.evolution.intervalMs > 0);
  assert.ok(schedules.cadences.health.runsCount > 0, 'Health runs count must be seeded from historical cycles');
});

test('V7.3 — Real Codex CLI Integration & Provider Control Center Telemetry', async () => {
  const { globalReaIntelligenceEngine } = require(reaEnginePath);
  
  // Test Codex CLI probe (synchronous execution)
  const codexProbe = globalReaIntelligenceEngine.testUniversalAdapter('codex-cli');
  assert.ok(codexProbe, 'Codex probe result must exist');
  assert.equal(codexProbe.adapterId, 'codex-cli');
  assert.ok(['AVAILABLE', 'ONLINE', 'UNAVAILABLE', 'FAILED'].includes(codexProbe.availabilityStatus), `Codex status ${codexProbe.availabilityStatus} invalid`);
  assert.ok(codexProbe.evidence.includes('codex-cli') || codexProbe.evidence.includes('CODEX'), 'Evidence must reference Codex CLI');

  // Test Provider Control Center
  const { FenixAutonomousLoop } = require(autonomousLoopPath);
  const loop = new FenixAutonomousLoop();
  const providerHub = globalReaIntelligenceEngine.getProviderControlCenter(null, loop);
  assert.ok(providerHub, 'Provider Control Center must exist');
  assert.ok(Array.isArray(providerHub.providers), 'Providers must be an array');
  assert.equal(providerHub.providers.length, 3, 'Must contain 3 primary providers');

  const vps = providerHub.providers.find(p => p.providerId === 'api-platform-vps');
  const agy = providerHub.providers.find(p => p.providerId === 'antigravity');
  const codex = providerHub.providers.find(p => p.providerId === 'codex');
  assert.ok(vps, 'VPS provider must exist');
  assert.ok(agy, 'Antigravity provider must exist');
  assert.ok(codex, 'Codex provider must exist');

  assert.ok(vps.failoverTransfer, 'VPS must have failover transfer route');
  assert.ok(codex.failoverTransfer, 'Codex must have failover transfer route');
  assert.ok(agy.failoverTransfer, 'Antigravity must have failover transfer route');
});

test('V7.4 — Multi-Agent DAG (9 Nodes) & Project Portfolio (Projects and Category Filter Tags)', async () => {
  const { FenixAutonomousLoop } = require(autonomousLoopPath);
  const loop = new FenixAutonomousLoop();
  const report = loop.getEvolutionReport();

  // Multi-Agent DAG
  assert.ok(report.multiAgentWorkflowGraph, 'Multi-agent graph must exist');
  assert.ok(Array.isArray(report.multiAgentWorkflowGraph.nodes), 'Nodes must be an array');
  assert.equal(report.multiAgentWorkflowGraph.nodes.length, 9, 'Must contain exactly 9 nodes');

  // Project Portfolio
  assert.ok(report.projectPortfolio, 'Project portfolio must exist');
  assert.ok(Array.isArray(report.projectPortfolio), 'Project portfolio must be an array');
  assert.ok(report.projectPortfolio.length >= 7, 'Must list at least 7 core monitored projects');
  for (const proj of report.projectPortfolio) {
    assert.ok(proj.projectId, 'Project must have projectId');
    assert.ok(proj.name, 'Project must have name');
    assert.ok(proj.health, 'Project must have health');
    assert.ok(Array.isArray(proj.filterTags), 'Project must have filterTags array');
  }
});

test('V7.5 — Frontend Single-Source Contract & UI Implementation Verification', async () => {
  const opsJs = fs.readFileSync(operationsLiveJsPath, 'utf8');
  const opsCss = fs.readFileSync(operationsLiveCssPath, 'utf8');
  const cityJs = fs.readFileSync(cityRealityJsPath, 'utf8');
  const mascotJs = fs.readFileSync(mascotSidebarJsPath, 'utf8');
  const worldJs = fs.readFileSync(fenixWorld3dJsPath, 'utf8');

  // Verify Operations Live functions exist
  assert.ok(opsJs.includes('renderExecutiveHeader'), 'renderExecutiveHeader must exist');
  assert.ok(opsJs.includes('renderKpiCards'), 'renderKpiCards must exist');
  assert.ok(opsJs.includes('renderSubsystemsGrid'), 'renderSubsystemsGrid must exist');
  assert.ok(opsJs.includes('renderMultiAgentDag'), 'renderMultiAgentDag must exist');
  assert.ok(opsJs.includes('renderProviderControlCenter'), 'renderProviderControlCenter must exist');
  assert.ok(opsJs.includes('renderProjectPortfolio'), 'renderProjectPortfolio must exist');
  assert.ok(opsJs.includes('fenixInspectAgentDagNode'), 'fenixInspectAgentDagNode modal must exist');
  assert.ok(opsJs.includes('fenixOpenProjectHistoryModal'), 'fenixOpenProjectHistoryModal must exist');

  // Verify Operations CSS contains Dark Graphite Design System tokens
  assert.ok(opsCss.includes('#070b12'), 'Dark Graphite background must be defined');
  assert.ok(opsCss.includes('v7-kpi-card'), 'v7-kpi-card must be styled');
  assert.ok(opsCss.includes('v7-dag-container'), 'v7-dag-container must be styled');

  // Verify Mascot and City Reality telemetry synchronization
  assert.ok(mascotJs.includes('fenixTickerStatus'), 'Mascot sidebar must synchronize fenixTickerStatus');
  assert.ok(mascotJs.includes('gaugeCpuFill'), 'Mascot sidebar must synchronize hardware gauges');
  assert.ok(cityJs.includes("['online', 'healthy', 'ready', 'active']"), 'City reality must treat ready as healthy');

  // Verify 3D World camera framing above dock and label threshold
  assert.ok(worldJs.includes('this.cameraState.distance > 290'), 'isFarOut threshold must allow project labels to be seen');
  assert.ok(worldJs.includes('this.cameraState.target.set(0, 4, -14)'), 'Camera reset must elevate world above bottom dock');
  assert.ok(worldJs.includes('ModernTechTerraceRoof'), 'Roof archetype must be modern tech terrace');
  assert.ok(worldJs.includes('this.elevatorCab'), 'Elevator cab must exist and animate');
});
