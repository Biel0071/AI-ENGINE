'use strict';
// Fase 0 (2026-11-11): sem GPU a Cidade bloqueava o navegador 3-25 s por operacao. O motor
// passa a medir o custo de cada quadro e, se a media passar de 50 ms, cai para qualidade
// baixa e espaca os quadros -- exceto quando o usuario escolheu "alto" manualmente.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/fenix-world-3d.js'), 'utf8');
const context = { THREE: {}, window: { addEventListener() {}, localStorage: { getItem: () => null } }, document: { readyState: 'loading', addEventListener() {} } };
vm.runInNewContext(source, context);
const proto = context.window.FenixWorld3DEngine.prototype;

function fakeEngine() {
  const calls = [];
  return { calls, setQualityProfile(p) { calls.push(`quality:${p}`); }, setVisualDensity(d) { calls.push(`density:${d}`); } };
}

test('heavy frames switch the city to low quality once', () => {
  context.window.localStorage.getItem = () => null;
  const engine = fakeEngine();
  for (let i = 0; i < 15; i += 1) proto._recordFrameCost.call(engine, 120);
  assert.deepEqual(engine.calls, ['quality:low', 'density:low']);
  assert.equal(engine._autoDegraded, true);
});

test('light frames never degrade quality', () => {
  context.window.localStorage.getItem = () => null;
  const engine = fakeEngine();
  for (let i = 0; i < 30; i += 1) proto._recordFrameCost.call(engine, 10);
  assert.deepEqual(engine.calls, []);
});

test('a manual "high" choice by the user is respected', () => {
  context.window.localStorage.getItem = (key) => (key === 'fenix_quality_profile' ? 'high' : null);
  const engine = fakeEngine();
  for (let i = 0; i < 15; i += 1) proto._recordFrameCost.call(engine, 120);
  assert.deepEqual(engine.calls, []);
});

test('frame interval grows with the measured cost, capped at 2 s', () => {
  assert.equal(proto._adaptiveFrameIntervalMs.call({}, 40), 40);
  assert.equal(proto._adaptiveFrameIntervalMs.call({ _frameCostEma: 120 }, 40), 480);
  assert.equal(proto._adaptiveFrameIntervalMs.call({ _frameCostEma: 5000 }, 40), 2000);
});
// Medido em 2026-11-11: com o 3D pausado a pagina ocupa 0,76 s a cada 15 s; desenhando por
// software (sem GPU) ocupa 17,4 s. O motor detecta o renderizador por software e desenha em
// meia resolucao, sem sombras, a ~1 quadro por segundo.
test('software WebGL renderers are recognised', () => {
  const detect = proto._isSoftwareRendererName;
  for (const name of ['Google SwiftShader', 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)', 'llvmpipe (LLVM 15.0.7, 256 bits)', 'Microsoft Basic Render Driver', 'softpipe']) {
    assert.equal(detect(name), true, name);
  }
  for (const name of ['ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)', 'Apple M2', 'Mali-G78', '', null]) {
    assert.equal(detect(name), false, String(name));
  }
});

test('software rendering slows the frame loop to about one frame per second', () => {
  const engine = { _softwareRendering: true, _isCompactViewport: () => false, _adaptiveFrameIntervalMs: proto._adaptiveFrameIntervalMs };
  context.navigator = { webdriver: false, userAgent: 'Mozilla/5.0' };
  assert.ok(proto._getRenderFrameIntervalMs.call(engine) >= 1000);
  engine._softwareRendering = false;
  assert.ok(proto._getRenderFrameIntervalMs.call(engine) < 100);
});
// Medido em 2026-11-11: a cena tinha 60 luzes dinamicas (cada uma calculada em todo pixel de
// todo material). O orcamento mantem so as luzes pontuais mais fortes acesas.
function sceneWith(lights) {
  return { traverse(fn) { lights.forEach(fn); } };
}
function pointLight(id, intensity, distance, visible = true) {
  return { id, isPointLight: true, intensity, distance, visible, userData: {} };
}

test('light budget keeps only the strongest point lights on', () => {
  const lights = [pointLight('a', 5.5, 42), pointLight('b', 1.1, 5), pointLight('c', 3.2, 30), pointLight('d', 1.2, 5)];
  const engine = { scene: sceneWith(lights) };
  const changed = proto._applyLightBudget.call(engine, 2);
  assert.equal(changed, true);
  assert.deepEqual(lights.filter((l) => l.visible).map((l) => l.id).sort(), ['a', 'c']);
  assert.equal(proto._applyLightBudget.call(engine, 2), false, 'second pass changes nothing');
});

test('light budget never turns on a light that other code switched off', () => {
  const lights = [pointLight('a', 5, 40), pointLight('off', 9, 99, false)];
  proto._applyLightBudget.call({ scene: sceneWith(lights) }, 8);
  assert.equal(lights.find((l) => l.id === 'off').visible, false);
});

test('raising the budget turns budget-hidden lights back on', () => {
  const lights = [pointLight('a', 5, 40), pointLight('b', 1, 5)];
  const engine = { scene: sceneWith(lights) };
  proto._applyLightBudget.call(engine, 1);
  assert.equal(lights[1].visible, false);
  proto._applyLightBudget.call(engine, 8);
  assert.equal(lights[1].visible, true);
});