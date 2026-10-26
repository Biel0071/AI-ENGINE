/**
 * Test Suite: Stitch & Miro Spatial Screen Flow (Fase 47)
 * Validates:
 * 1. Screen Registry Multi-Project Parity (fenix-os, zapai-crm, api-platform)
 * 2. Stage Ordering & Wireframe Layout Archetypes
 * 3. Navigation Transitions & Cross-Project Couplings
 * 4. FenixFlowGraph.mountScreenFlow Contract & Zero-Mock Compliance
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const pageRegistry = require('../src/projects/page-registry');

test('1. Multi-Project Screen Registry Parity', async (t) => {
  const { nodes, edges, projects, stages } = pageRegistry.getScreensGraph();

  assert.ok(nodes.length >= 30, `Expected at least 30 screens, got ${nodes.length}`);
  assert.ok(edges.length >= 40, `Expected at least 40 edges, got ${edges.length}`);
  assert.ok(projects.length >= 3, `Expected at least 3 projects, got ${projects.length}`);

  const projectIds = projects.map(p => p.id);
  assert.ok(projectIds.includes('fenix-os'), 'fenix-os must be registered');
  assert.ok(projectIds.includes('zapai-crm'), 'zapai-crm must be registered');
  assert.ok(projectIds.includes('api-platform'), 'api-platform must be registered');

  // Verify all screens have valid mandatory attributes
  nodes.forEach(screen => {
    assert.ok(screen.id, 'Screen must have id');
    assert.ok(screen.project, `Screen ${screen.id} must have project`);
    assert.ok(screen.route, `Screen ${screen.id} must have route`);
    assert.ok(screen.title, `Screen ${screen.id} must have title`);
    assert.ok(screen.component, `Screen ${screen.id} must have component`);
    assert.ok(screen.stage, `Screen ${screen.id} must have journey stage`);
    assert.ok(screen.layoutType, `Screen ${screen.id} must have layoutType`);
  });
});

test('2. Stage Ordering & Layout Archetypes', async (t) => {
  const { stages, nodes } = pageRegistry.getScreensGraph();

  const validStages = ['AUTH', 'DASHBOARD', 'OPERATIONS', 'BUILDER', 'GOVERNANCE'];
  validStages.forEach(st => {
    assert.ok(stages[st], `Stage ${st} must be defined in STAGES`);
    assert.ok(stages[st].label, `Stage ${st} must have label`);
  });

  const validLayoutTypes = new Set(['auth', 'dashboard', 'inbox', 'table', 'builder', 'editor', 'spatial', 'grid', 'analytics', 'settings', 'console']);
  nodes.forEach(screen => {
    assert.ok(validLayoutTypes.has(screen.layoutType), `Invalid layoutType "${screen.layoutType}" on screen ${screen.id}`);
  });

  // Verify Fênix canonical views
  const fenixViews = ['fenix-command-center', 'fenix-ai-city', 'fenix-agents', 'fenix-operations', 'fenix-visual-ide', 'fenix-memory', 'fenix-knowledge', 'fenix-flowgraph'];
  fenixViews.forEach(v => {
    assert.ok(nodes.some(n => n.id === v), `Fênix core view ${v} must be present`);
  });

  // Verify ZapAI screens
  const zapaiViews = ['zapai-dashboard', 'zapai-inbox', 'zapai-contacts', 'zapai-campaigns', 'zapai-flows'];
  zapaiViews.forEach(v => {
    assert.ok(nodes.some(n => n.id === v), `ZapAI view ${v} must be present`);
  });

  // Verify API Platform screens
  const apViews = ['ap-overview', 'ap-providers', 'ap-keys', 'ap-workflows'];
  apViews.forEach(v => {
    assert.ok(nodes.some(n => n.id === v), `API Platform view ${v} must be present`);
  });
});

test('3. Navigation Transitions & Cross-Project Couplings', async (t) => {
  const { nodes, edges } = pageRegistry.getScreensGraph();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // Verify every edge points to a known node
  edges.forEach(edge => {
    assert.ok(nodeMap.has(edge.source), `Edge source "${edge.source}" must exist`);
    assert.ok(nodeMap.has(edge.target), `Edge target "${edge.target}" must exist`);
    assert.ok(edge.label, `Edge between ${edge.source} and ${edge.target} must have a label`);
  });

  // Verify cross-project coupled systems
  const crossEdges = edges.filter(e => e.crossProject);
  assert.ok(crossEdges.length >= 6, `Expected at least 6 cross-project couplings, got ${crossEdges.length}`);

  // ZapAI flows to API Platform workflows
  const zapaiToAp = crossEdges.find(e => e.source === 'zapai-flows' && e.target === 'ap-workflows');
  assert.ok(zapaiToAp, 'ZapAI flows must couple to API Platform workflows');

  // API Platform providers to Fênix MCP
  const apToFenixMcp = crossEdges.find(e => e.source === 'ap-providers' && e.target === 'fenix-mcp');
  assert.ok(apToFenixMcp, 'API Platform providers must couple to Fênix MCP');

  // Fênix IDE to ZapAI flows
  const fenixIdeToZap = crossEdges.find(e => e.source === 'fenix-visual-ide' && e.target === 'zapai-flows');
  assert.ok(fenixIdeToZap, 'Fênix IDE must couple to ZapAI flows');
});

test('4. Frontend Engine & Canonical HTML Contracts', async (t) => {
  const flowGraphJs = fs.readFileSync(path.resolve(__dirname, '../public/fenix-flow-graph.js'), 'utf8');
  const indexHtml = fs.readFileSync(path.resolve(__dirname, '../public/index.html'), 'utf8');
  const flowGraphCss = fs.readFileSync(path.resolve(__dirname, '../public/fenix-flow-graph.css'), 'utf8');

  // Contract: StitchMiroScreenEngine exists
  assert.ok(flowGraphJs.includes('class StitchMiroScreenEngine'), 'fenix-flow-graph.js must define StitchMiroScreenEngine');
  assert.ok(flowGraphJs.includes('mountScreenFlow'), 'fenix-flow-graph.js must expose mountScreenFlow');

  // Contract: Index HTML delegates 'screens' tab to mountScreenFlow
  assert.ok(indexHtml.includes('window.FenixFlowGraph.mountScreenFlow'), 'index.html must invoke mountScreenFlow for screens flow');

  // Contract: CSS contains Stitch & Miro spatial board rules
  assert.ok(flowGraphCss.includes('.ffg-stitch-board'), 'fenix-flow-graph.css must include .ffg-stitch-board');
  assert.ok(flowGraphCss.includes('.ffg-stitch-screen-card'), 'fenix-flow-graph.css must include .ffg-stitch-screen-card');
  assert.ok(flowGraphCss.includes('.ffg-stitch-spline'), 'fenix-flow-graph.css must include .ffg-stitch-spline');
});
