const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { chromium } = require('playwright');

test('memory brain uses a real WebGL point cloud with rotatable and selectable entities', async (t) => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 900, height: 600 }, deviceScaleFactor: 2 });
  await page.setContent('<main style="width:720px;height:420px"><canvas id="brain"></canvas></main>');
  const publicRoot = path.join(__dirname, '../public');
  await page.addScriptTag({ path: path.join(publicRoot, 'vendor/three.min.js') });
  await page.addScriptTag({ path: path.join(publicRoot, 'memory-brain-webgl.js') });
  const result = await page.evaluate(() => {
    const canvas = document.querySelector('#brain');
    const renderer = window.FenixMemoryBrainWebGL.create(canvas);
    const points = [
      { id: 'project:a', x: -54, y: 8, z: 4, item: { id: 'project:a' } },
      { id: 'memory:b', x: 46, y: -12, z: -8, item: { id: 'memory:b' } },
      { id: 'task:c', x: 0, y: 40, z: 20, item: { id: 'task:c' } },
    ];
    renderer.setGraph(points, [{ from: 'project:a', to: 'memory:b' }], 'project:a', new Set(['memory:b']), () => '#55e6c1');
    renderer.resize(720, 420, 2);
    const initial = renderer.render({ x: 0.2, y: 0 }, 1);
    const rotated = renderer.render({ x: 0.2, y: 0.5 }, 1);
    const zoomed = renderer.render({ x: 0.2, y: 0.5 }, 1.4);
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return {
      webgl: Boolean(gl),
      backingWidth: canvas.width,
      backingHeight: canvas.height,
      ids: initial.map((hit) => hit.id),
      initialSelected: initial.find((hit) => hit.id === 'project:a'),
      rotatedSelected: rotated.find((hit) => hit.id === 'project:a'),
      zoomedSelected: zoomed.find((hit) => hit.id === 'project:a'),
      litPixelCount: pixels.filter((value, index) => index % 4 !== 3 && value > 24).length,
    };
  });
  assert.equal(result.webgl, true);
  assert.equal(result.backingWidth, 1440);
  assert.equal(result.backingHeight, 840);
  assert.deepEqual(result.ids.sort(), ['memory:b', 'project:a', 'task:c']);
  assert.notEqual(result.initialSelected.x, result.rotatedSelected.x, 'rotation should move projected hit targets');
  assert.notEqual(result.rotatedSelected.x, result.zoomedSelected.x, 'zoom should move projected hit targets');
  assert.ok(result.litPixelCount > 100, 'WebGL should draw visible pixels for the memory graph');
});

test('memory view selects the Three.js renderer when it is available', async (t) => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.setContent('<main id="view-memory" class="active" style="width:1280px;height:800px"></main>');
  await page.addStyleTag({ content: 'html,body{width:100%;height:100%;margin:0}#view-memory{width:100%;height:100%}' + fs.readFileSync(path.join(__dirname, '../public/memory-live.css'), 'utf8') });
  await page.evaluate(() => {
    window.fenixGetAuthToken = () => '';
    window.fetch = async (url) => { window.__graphRequestUrl = String(url); return ({ ok: true, status: 200, json: async () => ({
      nodes: [
        { id: 'project:a', type: 'PROJECT', properties: { name: 'Fênix' } },
        ...Array.from({ length: 2827 }, (_, index) => ({ id: `memory:node:${index}`, type: ['MEMORY', 'TASK', 'PAGE', 'PATTERN'][index % 4], properties: { name: `Entidade ${index + 1}` } })),
      ],
      edges: [
        ...Array.from({ length: 600 }, (_, index) => ({ from: 'project:a', to: `memory:node:${index % 14}`, type: `CONTAINS_${index % 3}` })),
        ...Array.from({ length: 12928 }, (_, index) => ({ from: `memory:node:${20 + Math.floor(index / 2802)}`, to: `memory:node:${25 + (index % 2802)}`, type: `RELATED_${index % 5}` })),
      ],
      stats: { totalNodes: 2828, totalEdges: 13528, nodeTypes: { PROJECT: 1, MEMORY: 707, TASK: 707, PAGE: 707, PATTERN: 706 } },
    }) }); };
  });
  const publicRoot = path.join(__dirname, '../public');
  for (const script of ['vendor/three.min.js', 'memory-brain-layout.js', 'memory-provenance.js', 'memory-brain-webgl.js']) {
    await page.addScriptTag({ path: path.join(publicRoot, script) });
  }
  await page.evaluate(() => { window.__memoryRenderStartedAt = performance.now(); });
  await page.addScriptTag({ path: path.join(publicRoot, 'memory-live.js') });
  await page.waitForTimeout(500);
  const statusText = await page.locator('#fmlCanvasStatus').textContent().catch(() => 'canvas status ausente');
  assert.equal(await page.evaluate(() => window.__graphRequestUrl), '/api/v2/graph/data?full=true', 'the memory view should request the complete graph supported by the API');
  const visibleNodeCount = Number(statusText.match(/^(\d+)\/2828 entidades/)?.[1]);
  assert.equal(visibleNodeCount, 2828, `desktop memory view should render every entity in the observed Graph Brain payload; got "${statusText}"; page errors: ${pageErrors.join('; ')}`);
  assert.match(statusText, /2400\/12942 ligações visuais/, 'desktop view should disclose the rendered relation sample and full unique-pair count');
  const renderMs = await page.evaluate(() => performance.now() - window.__memoryRenderStartedAt);
  assert.ok(renderMs < 5000, `2.8k-node WebGL fixture should become visible within 5 seconds, took ${renderMs.toFixed(0)} ms`);
  const canvas = page.locator('#fenixNeuralBrainCanvas');
  assert.equal(await canvas.evaluate((element) => Boolean(element.getContext('webgl2') || element.getContext('webgl'))), true);
  assert.equal(await canvas.evaluate((element) => element.width / element.clientWidth), 2);
  if (process.env.FENIX_MEMORY_WEBGL_QA_SCREENSHOT_PATH) await page.screenshot({ path: process.env.FENIX_MEMORY_WEBGL_QA_SCREENSHOT_PATH });
  await page.evaluate(() => {
    window.__brainRafRequests = 0;
    const request = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => { window.__brainRafRequests += 1; return request(callback); };
  });
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 48, box.y + box.height / 2 + 16, { steps: 3 });
  await page.mouse.up();
  await page.waitForTimeout(80);
  assert.ok(await page.evaluate(() => window.__brainRafRequests > 0), 'dragging the integrated WebGL graph should schedule a rotated render');
  await page.evaluate(() => window.fenixSelectMemoryNode('project:a'));
  assert.match(await page.locator('#fmlCanvasStatus').textContent(), /13528 registros de relação · seleção Fênix/);
});
