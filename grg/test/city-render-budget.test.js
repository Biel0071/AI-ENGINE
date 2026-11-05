const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/fenix-world-3d.js'), 'utf8');
const context = {
  AbortSignal,
  THREE: {},
  navigator: { hardwareConcurrency: 12, webdriver: false, userAgent: 'Chrome' },
  localStorage: { getItem() { return null; } },
  window: { addEventListener() {}, localStorage: { getItem() { return null; } }, matchMedia() { return { matches: false }; } },
  document: { readyState: 'loading', addEventListener() {} },
};
vm.runInNewContext(source, context);

function createWorld() {
  return Object.create(context.window.FenixWorld3DEngine.prototype);
}

test('3D City limits desktop rendering to 24 fps while preserving regular animation', () => {
  const world = createWorld();
  assert.equal(world._getRenderFrameIntervalMs(), 1000 / 24);
  assert.equal(world._shouldRenderFrame(1000), true);
  assert.equal(world._shouldRenderFrame(1010), false);
  assert.equal(world._shouldRenderFrame(1050), true);
});

test('3D City caps compact render work and uses a lower headless frame budget', () => {
  const world = createWorld();
  context.window.matchMedia = () => ({ matches: true });
  assert.equal(world._getRenderFrameIntervalMs(), 1000 / 16);
  assert.equal(world._isCompactViewport(), true);
  context.window.matchMedia = () => ({ matches: false });
  assert.equal(world._isCompactViewport(), false);
  context.navigator.webdriver = true;
  assert.equal(world._getRenderFrameIntervalMs(), 100);
});

test('compact 3D City caps render resolution to reduce GPU fill work', () => {
  assert.match(source, /const pixelRatio = Math\.min\(window\.devicePixelRatio \|\| 1, compactViewport \? 1 : 1\.25\)/);
  assert.match(source, /this\.renderer\.setPixelRatio\(pixelRatio\)/);
});

test('3D City keeps the compact pixel-ratio cap after sidebar and viewport resizes', () => {
  const world = createWorld();
  let pixelRatio = null;
  world.host = { clientWidth: 800, clientHeight: 600, getBoundingClientRect: () => ({ width: 800, height: 600 }) };
  world.camera = { aspect: 1, fov: 38, updateProjectionMatrix() {} };
  world.cameraState = { preferenceDistance: 70, targetDistance: 70 };
  world.renderer = { setSize() {}, setPixelRatio(value) { pixelRatio = value; } };
  world._isCompactViewport = () => true;
  context.window.devicePixelRatio = 2;

  world.resize();

  assert.equal(pixelRatio, 1, 'a compact viewport must keep the same pixel budget after ResizeObserver fires');
});

test('warehouse interior meshes stay out of the city draw until the roof cutaway opens', () => {
  const start = source.indexOf('    _initWarehouseInterior(hub, whW, whD, apronH) {');
  const end = source.indexOf('    /*', start + 8);
  const interior = source.slice(start, end);
  const animationStart = source.indexOf('    _animate() {');
  const animationEnd = source.indexOf('    dispose() {', animationStart);
  const animate = source.slice(animationStart, animationEnd);

  assert.match(interior, /interior\.visible\s*=\s*false/,
    'the 2,000+ mesh warehouse interior should be hidden in the initial city view');
  assert.match(interior, /this\.warehouseInteriorGroup\s*=\s*interior/,
    'the cutaway LOD should retain a reference to the real interior group');
  assert.match(animate, /this\.warehouseInteriorGroup\.visible\s*=\s*shouldCutaway\s*\|\|\s*this\.cutawayState\.progress\s*>\s*0\.05/,
    'interior details should appear during and after a real roof cutaway transition');
  assert.match(animate, /this\.cameraState\.distance\s*<\s*60\s*&&\s*distToDep\s*<\s*32/,
    'the canonical warehouse focus distance of 56 should open the interior cutaway');
});

test('3D City skips duplicate renderer resizes for the same host dimensions', () => {
  const world = createWorld();
  let setSizeCalls = 0;
  world.host = { clientWidth: 800, clientHeight: 600, getBoundingClientRect: () => ({ width: 800, height: 600 }) };
  world.camera = { aspect: 4 / 3, fov: 38, updateProjectionMatrix() {} };
  world.cameraState = { preferenceDistance: 70, targetDistance: 70 };
  world.renderer = { setSize() { setSizeCalls++; }, setPixelRatio() {} };
  world._isCompactViewport = () => true;
  world._lastRendererWidth = 800;
  world._lastRendererHeight = 600;
  world._lastRendererPixelRatio = 1;

  world.resize();

  assert.equal(setSizeCalls, 0, 'ResizeObserver and window resize can report the same layout in succession');
});

test('3D City schedules render callbacks at its frame budget instead of waking every display frame', () => {
  const world = createWorld();
  let scheduled;
  let requestCount = 0;
  world._animationTimerId = null;
  world._animationFrameId = null;
  world._isMounted = true;
  world._isDisposed = false;
  world._animate = () => {};
  world._getRenderFrameIntervalMs = () => 50;
  context.setTimeout = (callback, delay) => { scheduled = { callback, delay }; return 7; };
  context.requestAnimationFrame = callback => { requestCount++; assert.equal(callback, world._animate); return 11; };

  world._scheduleNextAnimationFrame();
  world._scheduleNextAnimationFrame();
  assert.equal(scheduled.delay, 50 - 1000 / 60,
    'wait until just before the next target frame so RAF adds only the display synchronization delay');
  assert.equal(requestCount, 0);
  scheduled.callback();
  assert.equal(requestCount, 1);
  assert.equal(world._animationFrameId, 11);
});

test('City does not animate warehouse equipment as an active job without a real job ID', () => {
  const start = source.indexOf('    _animate() {');
  const end = source.indexOf('    dispose() {', start);
  const animate = source.slice(start, end);
  assert.ok(start >= 0 && end > start, 'world animation loop should be available');
  assert.match(animate, /if \(this\.forkliftGroup && this\.forkliftState\?\.jobId\) \{/,
    'forklift motion must be tied to an actual assigned job');
});

test('idle City pauses decorative movement until the runtime reports active work', () => {
  const start = source.indexOf('    _animate() {');
  const end = source.indexOf('    dispose() {', start);
  const animate = source.slice(start, end);
  assert.ok(/if \(hasMeasuredRuntimeWork\) \{\s*if \(this\.apiNeuralCore\)/.test(animate),
    'the neural core should not rotate while the measured job count is zero');
  assert.ok(/this\.camilaGroup && String\(this\.camilaState\?\.action \|\| ''\)\.toUpperCase\(\) === 'WORKING'/.test(animate),
    'the named agent breathing animation should follow her measured work state');
  assert.ok(/const agentIsWorking = \(agentRecord\.activity\?\.key \|\| this\._resolveAgentActivity\(agentRecord\)\.key\) === 'working';/.test(animate),
    'agent idle gestures should use the agent state projected from runtime data');
  assert.ok(/Math\.sin\(aTime \* 3\.2\) \* 0\.08 : 0/.test(animate),
    'idle role badges should remain fixed instead of bobbing continuously');
  assert.ok(/if \(hasMeasuredRuntimeWork && this\.apiDataPackets/.test(animate),
    'decorative data packets should move only while jobs are actually running');
  assert.ok(/this\._initDataFlowPipelines\(\);\s*this\.dataPulses\.forEach\(\(pulse\) => \{ if \(pulse\.mesh\) pulse\.mesh\.visible = false; \}\);/.test(source),
    'data pulses should remain hidden until the first measured runtime snapshot arrives');
});

test('City keeps the idle map still and animates data lanes only for measured running jobs', () => {
  const start = source.indexOf('    _animate() {');
  const end = source.indexOf('    dispose() {', start);
  const animate = source.slice(start, end);
  assert.match(source, /this\.dataPulses\?\.forEach\(\(pulse\) => \{ if \(pulse\.mesh\) pulse\.mesh\.visible = this\.activeRuntimeJobs > 0; \}\)/);
  assert.match(animate, /const hasMeasuredRuntimeWork = this\.activeRuntimeJobs > 0/);
  assert.match(animate, /if \(hasMeasuredRuntimeWork\) \{/);
  assert.doesNotMatch(animate, /advanceLaneTraffic/,
    'decorative road traffic should remain parked instead of implying live system activity');
});

test('City does not publish a hardcoded Camila task before job telemetry arrives', () => {
  assert.doesNotMatch(source, /WMS: Inspeção Lote #4410/);
  assert.match(source, /status:\s*'AVAILABLE',[\s\S]*?state:\s*'AVAILABLE'/);
});

test('2D City fallback keeps a bounded frame budget outside headless QA', () => {
  const city2d = fs.readFileSync(path.join(__dirname, '../public/iso-city.js'), 'utf8');
  assert.match(city2d, /_getRenderFrameIntervalMs\(\)\s*\{[\s\S]*?if \(isHeadless\) return 100;[\s\S]*?return isCompact \? 1000 \/ 24 : 1000 \/ 30;/);
  assert.match(city2d, /if \(!this\._shouldDrawFrame\(t\)\)\s*\{\s*requestAnimationFrame\(loop\);\s*return;\s*\}/,
    'the 2D renderer should not update and redraw at the display refresh rate');
});

test('City minimap waits for its next visible snapshot instead of polling every frame', () => {
  const city2d = fs.readFileSync(path.join(__dirname, '../public/iso-city.js'), 'utf8');
  const minimap = city2d.match(/let minimapLoopRunning = false;[\s\S]*?minimap\.addEventListener\('click'/);
  assert.ok(minimap, 'minimap render loop should remain scoped to its instance');
  assert.match(minimap[0], /setTimeout\(renderMinimap,\s*500\)/,
    'the minimap should schedule work at its 2 Hz paint rate');
  assert.doesNotMatch(minimap[0], /requestAnimationFrame\(renderMinimap\)/,
    'waiting for the next minimap paint should not wake every display frame');
  assert.match(minimap[0], /fenix:viewchanged/,
    'the minimap should restart when the operator returns to the City');
});

test('pool status refreshes only while visible and accelerates when its panel is open', () => {
  const source = fs.readFileSync(path.join(__dirname, '../public/fenix-dynamic-agent-hud.js'), 'utf8');
  assert.match(source, /if \(!document\.hidden\s*&&\s*this\.panelEl\?\.classList\.contains\('open'\)\)\s*this\.fetchPoolState\(\)/);
  assert.match(source, /if \(open\)\s*this\.fetchPoolState\(\)/);
});

test('hidden Command panels and status tables are not refreshed in the background', () => {
  const commandCenter = fs.readFileSync(path.join(__dirname, '../public/command-center.js'), 'utf8');
  const interactions = fs.readFileSync(path.join(__dirname, '../public/fenix-v11-interactions.js'), 'utf8');
  assert.match(commandCenter, /setInterval\(\(\) => \{ if \(commandViewActive\(\) && !document\.hidden\) renderPanels\(\); \}, 15000\)/);
  assert.match(commandCenter, /setInterval\(\(\) => \{ if \(commandViewActive\(\) && !document\.hidden\) syncActivityStream\(\); \}, 10000\)/);
  assert.match(interactions, /if \(document\.hidden \|\| !document\.getElementById\('view-command'\)\?\.classList\.contains\('active'\)\) return;/);
});
