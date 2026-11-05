'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { summarizeConnections, createBrainPosition, groupNeighborRelations, selectVisibleNodes, uniqueVisualRelations } = require('../public/memory-brain-layout');

const renderer = fs.readFileSync(path.join(__dirname, '../public/memory-live.js'), 'utf8');
const shell = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');

test('memory canvas belongs to the live shell and exposes an explicit 2D relation view', () => {
  assert.match(shell, /memory-brain-layout\.js\?v=6-eight-focus-links[\s\S]*memory-brain-webgl\.js\?v=1-threejs-points[\s\S]*memory-live\.js\?v=16-focus-edge-budget/);
  assert.match(renderer, /<canvas id="fenixNeuralBrainCanvas"/);
  assert.match(renderer, /fenixNeuralBrainWebglCanvas/);
  assert.match(renderer, /const fallbackCanvas/);
  assert.match(renderer, /<svg id="fmlMap"/);
  assert.match(renderer, /id="btnToggle3DNeuralBrain"/);
  assert.match(renderer, /getElementById\('fmlMap'\)/);
  assert.match(renderer, /onclick="window\.fenixToggle3DNeuralBrain/);
  assert.match(renderer, /uniqueVisualRelations\(sourceNodes, links\)/);
  assert.match(renderer, /graphSummary\.relationCount/);
});

test('memory graph summary counts only supplied real edges and preserves isolates', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const edges = [{ from: 'a', to: 'b', type: 'OBSERVED' }, { from: 'missing', to: 'c', type: 'INVALID' }];

  assert.deepEqual(summarizeConnections(nodes, edges, 'c'), {
    nodeCount: 3,
    relationCount: 1,
    isolatedCount: 1,
    isolatedIds: ['c'],
    selectedRelationCount: 0,
    selectedNeighborIds: [],
  });
  assert.deepEqual(summarizeConnections(nodes, [
    { from: 'a', to: 'b', type: 'READS' },
    { from: 'a', to: 'b', type: 'DERIVED_FROM' },
  ], 'b'), {
    nodeCount: 3,
    relationCount: 2,
    isolatedCount: 1,
    isolatedIds: ['c'],
    selectedRelationCount: 2,
    selectedNeighborIds: ['a'],
  });
});

test('memory brain layout forms two stable lobes and keeps a selected node with its real neighbors in the render limit', () => {
  const positions = Array.from({ length: 500 }, (_, index) => createBrainPosition(`memory:${index}`));
  const repeat = createBrainPosition('memory:0');
  assert.deepEqual(repeat, positions[0]);
  assert.ok(positions.every((point) => point.x <= -12 || point.x >= 12), 'hemispheres retain a central cleft');
  assert.ok(positions.every((point) => Math.abs(point.x) < 180 && Math.abs(point.y) < 150 && Math.abs(point.z) < 110));
  assert.deepEqual(new Set(positions.map((point) => point.hemisphere)), new Set(['left', 'right']));
  assert.deepEqual(new Set(positions.map((point) => point.lobe)), new Set(['frontal', 'parietal', 'occipital', 'temporal']));

  const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const edges = [{ from: 'd', to: 'a' }, { from: 'd', to: 'c' }];
  assert.deepEqual(selectVisibleNodes(nodes, edges, 'd', 3).map((node) => node.id), ['d', 'a', 'c']);

  const starNodes = [{ id: 'hub' }, ...Array.from({ length: 14 }, (_, index) => ({ id: `neighbor:${index}` }))];
  const repeatedEdges = Array.from({ length: 600 }, (_, index) => ({ from: 'hub', to: `neighbor:${index % 14}`, type: `TYPE_${index % 3}` }));
  const summary = summarizeConnections(starNodes, repeatedEdges, 'hub');
  assert.equal(summary.selectedRelationCount, 600);
  assert.equal(summary.selectedNeighborIds.length, 14);
  assert.equal(uniqueVisualRelations(starNodes, repeatedEdges).length, 14);
  const neighborGroups = groupNeighborRelations(repeatedEdges, 'hub');
  assert.equal(neighborGroups.length, 14);
  assert.equal(neighborGroups.reduce((count, neighbor) => count + neighbor.count, 0), 600);
  assert.deepEqual(neighborGroups[0].types, ['TYPE_0', 'TYPE_1', 'TYPE_2']);
});

test('memory brain positions distribute independently through both hemispheres', () => {
  const points = Array.from({ length: 2400 }, (_, index) => createBrainPosition(`memory:node:${index}`));
  for (const hemisphere of ['left', 'right']) {
    const sample = points.filter((point) => point.hemisphere === hemisphere);
    assert.ok(sample.length > 1000 && sample.length < 1400, `${hemisphere} hemisphere should receive a balanced node sample`);
    const meanY = sample.reduce((sum, point) => sum + point.y, 0) / sample.length;
    const meanZ = sample.reduce((sum, point) => sum + point.z, 0) / sample.length;
    const meanAbsX = sample.reduce((sum, point) => sum + Math.abs(point.x), 0) / sample.length;
    const covariance = sample.reduce((sum, point) => sum + (Math.abs(point.x) - meanAbsX) * (point.y - meanY), 0);
    const varianceX = sample.reduce((sum, point) => sum + (Math.abs(point.x) - meanAbsX) ** 2, 0);
    const varianceY = sample.reduce((sum, point) => sum + (point.y - meanY) ** 2, 0);
    assert.ok(Math.abs(meanY) < 8 && Math.abs(meanZ) < 8, `${hemisphere} points should not drift toward one side`);
    assert.ok(Math.abs(covariance / Math.sqrt(varianceX * varianceY)) < 0.18, `${hemisphere} shell should not collapse into a correlated arc`);
  }
});

test('memory renderer mounts the 3D canvas and reports isolated-node state in the 2D view', async (t) => {
  const memoryCss = fs.readFileSync(path.join(__dirname, '../public/memory-live.css'), 'utf8');
  const server = http.createServer((request, response) => {
    if (request.url === '/memory-live.css') {
      response.writeHead(200, { 'content-type': 'text/css' });
      response.end(memoryCss);
      return;
    }
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/memory-live.css"><style>html,body,#view-memory{width:100%;height:100%;margin:0}</style></head><body><main id="view-memory" class="active"></main></body></html>');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  t.after(async () => {
    await browser.close();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  });

  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(() => {
    window.__brainRafRequests = 0;
    const nativeRequestAnimationFrame = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => {
      window.__brainRafRequests += 1;
      return nativeRequestAnimationFrame(callback);
    };
    window.fetch = async (url) => ({
      ok: true,
      status: 200,
      json: async () => String(url).includes('/api/v2/graph/data') ? {
        nodes: [
          { id: 'project:a', type: 'PROJECT', properties: { name: 'Connected project' } },
          { id: 'task:b', type: 'TASK', properties: { name: 'Observed task' } },
          { id: 'memory:c', type: 'MEMORY', properties: { name: 'Isolated memory' } },
          ...Array.from({ length: 197 }, (_, index) => ({ id: `memory:node:${index}`, type: ['PAGE', 'PATTERN', 'PROJECT'][index % 3], properties: { name: `Knowledge entity ${index + 1}` } })),
          ...Array.from({ length: 2628 }, (_, index) => ({ id: `memory:scale:${index}`, type: ['PAGE', 'PATTERN', 'PROJECT', 'MEMORY'][index % 4], properties: { name: `Scale entity ${index + 1}` } })),
        ],
        edges: [
          { from: 'project:a', to: 'task:b', type: 'OBSERVED' },
          ...Array.from({ length: 600 }, (_, index) => ({ from: 'project:a', to: `memory:node:${index % 14}`, type: `RELATED_${index % 3}` })),
          ...Array.from({ length: 12927 }, (_, index) => ({ from: `memory:node:${index % 197}`, to: `memory:node:${(index + 1) % 197}`, type: `GRAPH_${index % 5}` })),
        ],
        stats: { totalNodes: 2828, totalEdges: 13528, nodeTypes: { PROJECT: 67, TASK: 1, MEMORY: 657, PAGE: 721, PATTERN: 721 } },
      } : { ok: true, status: { totalIndexedFiles: 2 } },
    });
  });
  const publicRoot = path.join(__dirname, '../public');
  await page.addScriptTag({ path: path.join(publicRoot, 'memory-brain-layout.js') });
  await page.addScriptTag({ path: path.join(publicRoot, 'memory-provenance.js') });
  await page.addScriptTag({ path: path.join(publicRoot, 'memory-live.js') });
  await page.waitForFunction(() => Boolean(window.loadMemoryView && document.querySelector('#fenixNeuralBrainCanvas')?.width));

  const mounted = await page.evaluate(() => ({
    canvasParent: document.querySelector('#fenixNeuralBrainCanvas')?.parentElement?.className,
    canvasDisplay: document.querySelector('#fenixNeuralBrainCanvas')?.style.display,
    svgDisplay: document.querySelector('#fmlMap')?.style.display,
  }));
  assert.equal(mounted.canvasParent, 'fml-network-view');
  assert.equal(mounted.canvasDisplay, 'block');
  assert.equal(mounted.svgDisplay, 'none');
  assert.equal(await page.locator('#fenixNeuralBrainCanvas').evaluate((canvas) => canvas.width / canvas.clientWidth), 2, 'canvas backing store should match the device pixel ratio');
  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForFunction(() => {
      const canvas = document.querySelector('#fenixNeuralBrainCanvas');
      return canvas && Math.abs(canvas.width / canvas.clientWidth - Math.min(2, window.devicePixelRatio || 1)) < 0.02;
    });
    const geometry = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      root: document.querySelector('.fml-root').getBoundingClientRect().width,
      canvas: document.querySelector('#fenixNeuralBrainCanvas').getBoundingClientRect().width,
    }));
    assert.ok(geometry.document <= geometry.viewport + 1, `${width}px memory view should not overflow horizontally: ${JSON.stringify(geometry)}`);
    assert.ok(geometry.canvas > 0, `${width}px memory canvas should remain available`);
    assert.equal(await page.locator('#fenixNeuralBrainCanvas').evaluate((canvas) => canvas.width / canvas.clientWidth), 2, `${width}px canvas should remain crisp after resize`);
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(80);
  await page.evaluate(() => { window.__brainRafRequests = 0; });
  await page.waitForTimeout(120);
  assert.equal(await page.evaluate(() => window.__brainRafRequests), 0, 'the idle graph must not repaint continuously');
  const canvasBox = await page.locator('#fenixNeuralBrainCanvas').boundingBox();
  const selectedPoint = await page.evaluate(() => {
    const canvas = document.querySelector('#fenixNeuralBrainCanvas');
    const point = window.FenixMemoryBrainLayout.createBrainPosition('project:a');
    const width = canvas.clientWidth, height = canvas.clientHeight;
    const focal = 340;
    const x = point.x;
    const z1 = point.z;
    const y = point.y * Math.cos(0.2) - z1 * Math.sin(0.2);
    const z = point.y * Math.sin(0.2) + z1 * Math.cos(0.2);
    const scale = focal / (focal + z);
    return { x: width / 2 + x * scale, y: height / 2 + y * scale };
  });
  await page.mouse.click(canvasBox.x + selectedPoint.x, canvasBox.y + selectedPoint.y);
  assert.equal(await page.locator('#fmlDetail h2').textContent(), 'Connected project', 'canvas hit testing should use CSS coordinates at DPR 2');
  await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + canvasBox.width / 2 + 32, canvasBox.y + canvasBox.height / 2 + 12, { steps: 3 });
  await page.mouse.up();
  assert.ok(await page.evaluate(() => window.__brainRafRequests > 1), 'dragging the graph should schedule an interactive repaint');
  if (process.env.FENIX_MEMORY_QA_SCREENSHOT_PATH) await page.screenshot({ path: process.env.FENIX_MEMORY_QA_SCREENSHOT_PATH });

  await page.evaluate(() => window.fenixSelectMemoryNode('project:a'));
  assert.equal(await page.locator('#fmlSelectedEdges').textContent(), '15');
  assert.match(await page.locator('#fmlMapNote').textContent(), /601 registros de relação · 15 entidades vizinhas/);
  assert.match(await page.locator('#fmlDetail h3').textContent(), /Vizinhos \(15\) · 601 registros/);
  assert.equal(await page.locator('#fmlDetail .fml-relation').count(), 15, 'details show one navigable row per neighbor, not repeated records');

  await page.evaluate(() => window.fenixSelectMemoryNode('memory:c'));
  await page.locator('#btnToggle3DNeuralBrain').click();
  assert.equal(await page.locator('#fmlMap').evaluate((element) => element.style.display), 'block');
  assert.equal(await page.locator('#fmlMapNote').getAttribute('role'), 'status');
  assert.match(await page.locator('#fmlMapNote').textContent(), /não possui relações registradas/i);
});

