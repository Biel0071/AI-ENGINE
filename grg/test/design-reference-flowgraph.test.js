'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const { start } = require('../src/server');

test('Flow Graph exposes selected official product capabilities and Fênix gaps', async (t) => {
  const dataFile = path.join(os.tmpdir(), `fenix-design-graph-${crypto.randomUUID()}.json`);
  const password = crypto.randomBytes(24).toString('base64url');
  let server;
  let browser;
  t.after(async () => {
    await browser?.close();
    if (server) {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(() => resolve()));
    }
    await fs.rm(dataFile, { force: true });
  });

  server = await start(0, {
    dataFile, llm: false, localRuntimeWorker: false,
    bootstrapAdmin: { tenantId: 'grg', userId: 'design-graph-admin', password, tenantName: 'Design Graph Test', name: 'Design Graph Admin', role: 'master_admin' },
  });
  await server.app.projectKernel.create('grg', 'design-graph-admin', {
    id: 'design-graph-fixture', name: 'Design Graph Fixture', workspace: process.cwd(), branch: 'test-fixture',
  });
  const planMemory = await server.app.memory.remember('grg', 'design-graph-admin', {
    kind: 'project', projectId: 'design-graph-fixture', title: 'Plano REA · tela inicial',
    stableKey: 'rea-plan:design-graph-fixture:visual-selection', confidence: 1,
    classification: 'internal', provenance: { type: 'rea-plan', reference: 'design-graph-fixture', evidence: [] },
    content: JSON.stringify({
      version: 1, projectId: 'design-graph-fixture', objective: 'Refinar a tela inicial', analysis: 'A seleção foi observada no preview.',
      scope: 'PROJECT', selectionContext: { projectId: 'design-graph-fixture', screenId: 'home', route: '/app#home', element: { selector: '#hero' } },
    }),
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const loginResponse = await fetch(`${base}/api/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenantId: 'grg', userId: 'design-graph-admin', password }),
  });
  const login = await loginResponse.json();
  assert.equal(loginResponse.status, 200);
  const cookie = loginResponse.headers.get('set-cookie')?.split(';')[0];

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const [cookieName, cookieValue] = cookie.split('=', 2);
  await context.addCookies([{ name: cookieName, value: cookieValue, domain: '127.0.0.1', path: '/' }]);
  await context.addInitScript((token) => { localStorage.setItem('grg_token', token); localStorage.setItem('fenix_token', token); }, login.token);
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${base}/index.html#projects`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.FenixDesignReference && window.fenixOpenFlowGraph));

  await page.evaluate(async () => {
    await window.FenixDesignReference.apply({ id: 'design-graph-fixture', name: 'Design Graph Fixture' }, {
      referenceSources: ['google-stitch-canvas'], visualDirection: 'hig-adaptive',
    });
    await window.fenixOpenFlowGraph({
      context: 'PROJECT', entityId: 'project:design-graph-fixture',
      absorptionReport: { projectId: 'design-graph-fixture', screens: [{ screenId: 'home', route: '/app#home', title: 'Home' }] },
    });
  });
  await page.waitForFunction(() => Boolean(window.FenixFlowGraph.findNode('design-capability:design-graph-fixture:google-stitch-canvas:0')));
  await page.waitForFunction((memoryId) => Boolean(window.FenixFlowGraph.findNode(`visual-selection:design-graph-fixture:${memoryId}`)), planMemory.id);

  const graphEvidence = await page.evaluate((memoryId) => {
    const sourceId = 'reference:design-graph-fixture:google-stitch-canvas';
    const capabilityId = 'design-capability:design-graph-fixture:google-stitch-canvas:1';
    return {
      source: window.FenixFlowGraph.findNode(sourceId),
      capability: window.FenixFlowGraph.findNode(capabilityId),
      edge: window.FenixFlowGraph.findEdges(sourceId, capabilityId).find((item) => item.type === 'DERIVED_FROM') || null,
      unselected: window.FenixFlowGraph.findNode('reference:design-graph-fixture:lovable-editor'),
      visualSelectionEdge: window.FenixFlowGraph.findEdges(
        `visual-selection:design-graph-fixture:${memoryId}`,
        'screen:design-graph-fixture:home'
      ).find((item) => item.type === 'DERIVED_FROM') || null,
    };
  }, planMemory.id);

  assert.equal(graphEvidence.source?.properties?.integration, 'MANUAL_READ_ONLY');
  assert.equal(graphEvidence.capability?.title, 'Canvas com telas conectadas e protótipo navegável');
  assert.equal(graphEvidence.capability?.status, 'PARTIAL');
  assert.match(graphEvidence.capability?.metadata?.fenix || '', /protótipo clicável ainda ausente/);
  assert.match(graphEvidence.capability?.metadata?.evidence || '', /fenix-flow-graph\.js/);
  assert.equal(graphEvidence.edge?.properties?.integration, 'MANUAL_READ_ONLY');
  assert.equal(graphEvidence.unselected ?? null, null, 'unselected product references must not enter the project graph');
  assert.equal(graphEvidence.visualSelectionEdge?.properties?.memoryId, planMemory.id,
    'a preview selection must retain its saved project-memory provenance when linked to the absorbed screen');

  const capabilityNode = page.locator('.ffg-node[data-id="design-capability:design-graph-fixture:google-stitch-canvas:1"]');
  const originalPosition = await capabilityNode.evaluate((node) => ({ left: node.style.left, top: node.style.top }));
  const bounds = await capabilityNode.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 72, bounds.y + bounds.height / 2 + 48, { steps: 6 });
  await page.mouse.up();
  await page.waitForFunction((id) => {
    const node = document.querySelector(`.ffg-node[data-id="${id}"]`);
    return node && node.dataset.layoutSaved === 'true';
  }, 'design-capability:design-graph-fixture:google-stitch-canvas:1');
  const movedPosition = await capabilityNode.evaluate((node) => ({ left: node.style.left, top: node.style.top }));
  assert.notDeepEqual(movedPosition, originalPosition, 'dragging a graph card should reposition it');

  await page.evaluate(async () => {
    window.FenixFlowGraph.close();
    await window.fenixOpenFlowGraph({ context: 'PROJECT', entityId: 'project:design-graph-fixture' });
  });
  await page.waitForFunction((position) => {
    const node = document.querySelector('.ffg-node[data-id="design-capability:design-graph-fixture:google-stitch-canvas:1"]');
    return node && node.style.left === position.left && node.style.top === position.top;
  }, movedPosition);
  await page.getByRole('button', { name: 'Restaurar disposição automática' }).click();
  await page.waitForFunction((position) => {
    const node = document.querySelector('.ffg-node[data-id="design-capability:design-graph-fixture:google-stitch-canvas:1"]');
    return node && node.style.left !== position.left && node.style.top !== position.top;
  }, movedPosition);
});
