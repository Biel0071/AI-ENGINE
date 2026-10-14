'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { VisualComparator } = require('../src/reconstruction/visual-comparator');
const { SystemLevelEvaluator } = require('../src/reconstruction/system-level-evaluator');
const { VisualLoopEngine } = require('../src/reconstruction/visual-loop-engine');
const { SystemMapExplorer } = require('../src/reconstruction/system-map-explorer');
const { VisualDnaEngine } = require('../src/reconstruction/visual-dna-engine');
const { UrlToSystemEngine } = require('../src/reconstruction/url-to-system');
const { SystemTwinEngine } = require('../src/reconstruction/system-twin');
const { handleUniversalSystemRoutes } = require('../src/api/universal-system-routes');

async function callSystemRoute(method, route, body = {}) {
  let response = null;
  const handled = await handleUniversalSystemRoutes(
    { method, body },
    {},
    new URL(`http://localhost${route}`),
    (_res, statusCode, payload) => { response = { statusCode, payload }; return true; },
    async () => body,
    { tenantId: 'test', actorId: 'test' },
    {}
  );
  return { handled, ...response };
}

test('visual comparator does not treat image byte size as pixel similarity', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-visual-diff-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const referenceImage = path.join(dir, 'reference.png');
  const currentImage = path.join(dir, 'current.png');
  fs.writeFileSync(referenceImage, Buffer.from([0, 1, 2, 3]));
  fs.writeFileSync(currentImage, Buffer.from([4, 5, 6, 7]));
  const comparator = new VisualComparator({ storagePath: path.join(dir, 'history.json') });

  const result = comparator.compare({ referenceImage, currentImage });

  assert.equal(result.measurementStatus, 'NOT_MEASURED');
  assert.equal(result.diffPercentage, null);
  assert.equal(result.fidelityScore, null);
  assert.equal(result.passed, null);
  assert.equal(result.verdict, 'VISUAL_COMPARISON_UNAVAILABLE');
});

test('visual comparator measures actual changed pixels in same-size PNGs', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-pixel-diff-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const referenceImage = path.join(dir, 'reference.png');
  const currentImage = path.join(dir, 'current.png');
  const redImage = encodeRgbPng(2, 2, Buffer.from([
    255, 0, 0, 255, 0, 0,
    255, 0, 0, 255, 0, 0
  ]));
  const onePixelChanged = encodeRgbPng(2, 2, Buffer.from([
    0, 0, 255, 255, 0, 0,
    255, 0, 0, 255, 0, 0
  ]));
  fs.writeFileSync(referenceImage, redImage);
  fs.writeFileSync(currentImage, onePixelChanged);
  const comparator = new VisualComparator({ storagePath: path.join(dir, 'history.json') });

  const result = comparator.compare({ referenceImage, currentImage, pixelTolerance: 0 });

  assert.equal(result.measurementStatus, 'MEASURED');
  assert.equal(result.measurementMethod, 'PIXEL_RGBA_THRESHOLD');
  assert.equal(result.imageEvidence.reference.width, 2);
  assert.equal(result.imageEvidence.current.height, 2);
  assert.equal(result.pixelDiff.changedPixels, 1);
  assert.equal(result.pixelDiff.totalPixels, 4);
  assert.deepEqual(result.viewport, { width: 2, height: 2 });
  assert.equal(result.maximumDiffPercent, 15);
  assert.equal(result.diffPercentage, 25);
  assert.equal(result.fidelityScore, 75);
  assert.equal(result.passed, false);
});

test('maturity evaluator keeps missing and partial dimensions unknown', () => {
  const evaluator = new SystemLevelEvaluator();
  const empty = evaluator.evaluateSystem({});
  assert.equal(empty.status, 'NOT_EVALUATED');
  assert.equal(empty.aggregateScore, null);
  assert.equal(empty.level, null);
  assert.ok(Object.values(empty.dimensions).every((dimension) => dimension.points === null));

  const partial = evaluator.evaluateSystem({ evidence: {
    visual: { points: 82, artifactId: 'comparison-12', source: 'pixel-diff', verifiedAt: '2026-10-13T12:00:00.000Z' }
  } });
  assert.equal(partial.status, 'PARTIAL');
  assert.equal(partial.evaluatedDimensions, 1);
  assert.equal(partial.aggregateScore, 82);
  assert.equal(partial.level, null);
});

test('visual DNA contains only measured browser styles and reports empty evidence as unknown', () => {
  const engine = new VisualDnaEngine();
  const empty = engine.extractVisualDna({});
  assert.equal(empty.status, 'NOT_MEASURED');
  assert.equal(empty.designTokens, null);

  const observed = engine.extractVisualDna({
    observationStatus: 'BROWSER_OBSERVED',
    viewport: { width: 1280, height: 800 },
    elements: [{ category: 'BUTTON', computedStyle: {
      color: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(0, 128, 255)',
      fontFamily: 'Inter',
      fontSize: '14px',
      borderRadius: '6px',
      padding: '8px 12px'
    } }]
  });
  assert.equal(observed.status, 'PARTIAL');
  assert.equal(observed.designTokens.colors.buttonBackgrounds[0], 'rgb(0, 128, 255)');
  assert.equal(observed.designTokens.typography.fontFamilies[0], 'Inter');
  assert.equal(observed.responsiveRules, null);
});

test('URL analysis does not invent APIs, flows, tests, dependencies, or delegated jobs', async () => {
  const engine = new UrlToSystemEngine({
    systemObserver: { observeUrl: async () => ({
      ok: true,
      targetOk: true,
      targetUrl: 'https://example.test/',
      title: 'Example',
      statusCode: 200,
      driver: 'http-probe',
      observationStatus: 'STATIC_HTML_ONLY',
      latencyMs: 3,
      elements: [],
      routes: [],
      apis: [],
      network: { totalRequests: 1, apisCount: 0, requests: [] },
      screenshot: null
    }) },
    visualDnaEngine: { extractVisualDna: () => ({ status: 'NOT_MEASURED', designTokens: null }) },
    architectureDetector: { detectArchitecture: () => { throw new Error('architecture inference should not run'); } },
    systemTwinEngine: { createOrUpdateTwin: (twin) => twin }
  });

  const result = await engine.analyzeAndPlan('https://example.test/?api_key=private-value&view=city');

  assert.equal(result.status, 'PARTIAL_OBSERVATION');
  assert.equal(result.targetUrl, 'https://example.test/?api_key=%5BREDACTED%5D&view=city');
  assert.equal(result.systemTwin.sourceUrl, result.targetUrl);
  assert.equal(JSON.stringify(result).includes('private-value'), false);
  assert.deepEqual(result.flows, []);
  assert.deepEqual(result.apis, []);
  assert.deepEqual(result.data, []);
  assert.deepEqual(result.dependencies, []);
  assert.deepEqual(result.tests, []);
  assert.deepEqual(result.estimatedJobs, []);
  assert.deepEqual(result.actions, []);
  assert.equal(result.visualDna.status, 'NOT_MEASURED');
});

test('URL analysis failure does not persist a twin or claim a scan', async () => {
  let observeCalls = 0;
  let twinWrites = 0;
  const engine = new UrlToSystemEngine({
    systemObserver: { observeUrl: async () => { observeCalls += 1; return { targetOk: false, statusCode: 401, observationStatus: 'BROWSER_OBSERVED' }; } },
    systemTwinEngine: { createOrUpdateTwin: () => { twinWrites += 1; } }
  });

  const invalid = await engine.analyzeAndPlan('file:///etc/passwd');
  const unauthorized = await engine.analyzeAndPlan('https://example.test/private');

  assert.equal(invalid.status, 'OBSERVATION_FAILED');
  assert.equal(unauthorized.status, 'OBSERVATION_FAILED');
  assert.equal(unauthorized.observationSummary.status, 'BROWSER_OBSERVED');
  assert.equal(observeCalls, 1);
  assert.equal(twinWrites, 0);
});

test('system map contains only entities present in the supplied twin', () => {
  const map = new SystemMapExplorer().generateSystemMap({
    id: 'system:fixture',
    name: 'Fixture',
    pages: [{ id: 'page:home', title: 'Home', url: '/' }],
    components: ['Header']
  });
  const nodeTypes = map.graph.nodes.map((node) => node.group);

  assert.deepEqual(nodeTypes, ['SYSTEM', 'PAGE', 'COMPONENT']);
  assert.equal(map.graph.nodes.every((node) => node.properties.verificationStatus === 'NOT_VERIFIED'), true);
  assert.equal(map.graph.edges.every((edge) => edge.verificationStatus === 'NOT_VERIFIED'), true);
  assert.equal(map.graph.nodes.some((node) => node.group === 'AGENT' || node.group === 'DATABASE' || node.group === 'TEST'), false);
});

test('system twin leaves inaccessible architecture and execution facets unknown', (t) => {
  const storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-system-twin-test-'));
  t.after(() => fs.rmSync(storageDir, { recursive: true, force: true }));
  const engine = new SystemTwinEngine({ storageDir });

  const twin = engine.createOrUpdateTwin({ name: 'Observed target', status: 'PARTIAL_OBSERVATION' });

  assert.deepEqual(twin.pages, []);
  assert.deepEqual(twin.flows, []);
  assert.deepEqual(twin.components, []);
  assert.equal(twin.frontend, null);
  assert.equal(twin.backend, null);
  assert.deepEqual(twin.services, []);
  assert.deepEqual(twin.agents, []);
  assert.equal(twin.memory, null);
  assert.equal(twin.git, null);
});

test('reconstruction routes do not invent a Fênix twin, visual DNA, or successful chat', async () => {
  const level = await callSystemRoute('GET', '/api/v2/system-reconstruction/level?id=missing-test-twin');
  const map = await callSystemRoute('GET', '/api/v2/system-reconstruction/system-map?id=missing-test-twin');
  const dna = await callSystemRoute('GET', '/api/v2/system-reconstruction/visual-dna?id=missing-test-twin');
  const observation = await callSystemRoute('POST', '/api/v2/system-reconstruction/observe');
  const chat = await callSystemRoute('POST', '/api/v2/system-reconstruction/chat', { message: 'melhore a cidade' });

  assert.equal(level.payload.level.status, 'NOT_EVALUATED');
  assert.equal(level.payload.level.level, null);
  assert.equal(map.payload.status, 'NOT_DISCOVERED');
  assert.equal(map.payload.systemMap, null);
  assert.equal(dna.payload.status, 'NOT_DISCOVERED');
  assert.equal(dna.payload.visualDna, null);
  assert.equal(observation.statusCode, 400);
  assert.equal(chat.statusCode, 501);
  assert.match(chat.payload.error, /nenhuma missão ou job foi criado/i);
});

test('visual loop does not create a fix, a score, or convergence without real execution', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-visual-loop-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  let observeCalls = 0;
  const engine = new VisualLoopEngine({
    artifactsDir: dir,
    observer: { observeUrl: async () => { observeCalls += 1; return { ok: true, driver: 'http-probe', screenshot: null, observationStatus: 'STATIC_HTML_ONLY' }; } }
  });

  const result = await engine.runVisualLoop({ url: 'http://127.0.0.1:8890', maxCycles: 3 });

  assert.equal(observeCalls, 1);
  assert.equal(result.status, 'NOT_MEASURED');
  assert.equal(result.converged, false);
  assert.equal(result.finalFidelityScore, null);
  assert.equal(result.totalCyclesExecuted, 0);
  assert.deepEqual(result.cycles, []);
});

function encodeRgbPng(width, height, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const scanlines = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (width * 3 + 1);
    scanlines[rowOffset] = 0;
    rgb.copy(scanlines, rowOffset + 1, y * width * 3, (y + 1) * width * 3);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(scanlines)),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

function pngChunk(type, data) {
  const name = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])), 0);
  return Buffer.concat([length, name, data, checksum]);
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
