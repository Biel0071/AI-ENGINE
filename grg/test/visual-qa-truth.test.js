'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildVisualQaDashboard } = require('../src/api/universal-system-routes');

test('visual QA without a report or screenshots is NOT_RUN with no fabricated result', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-visual-qa-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const dashboard = buildVisualQaDashboard({ reportPath: path.join(root, 'missing.json'), screenshotDirs: [] });

  assert.deepEqual(dashboard.summary, {
    total: 0,
    passed: null,
    failed: null,
    screenshotsTaken: 0,
    status: 'NOT_RUN',
  });
  assert.deepEqual(dashboard.results, []);
});

test('captured screenshots are not represented as passed tests or zero-diff baselines', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-visual-qa-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const screenshots = path.join(root, 'screens_current');
  fs.mkdirSync(screenshots);
  fs.writeFileSync(path.join(screenshots, 'city.png'), Buffer.from('image'));

  const dashboard = buildVisualQaDashboard({ reportPath: path.join(root, 'missing.json'), screenshotDirs: [screenshots] });

  assert.equal(dashboard.summary.total, 1);
  assert.equal(dashboard.summary.screenshotsTaken, 1);
  assert.equal(dashboard.summary.passed, null);
  assert.equal(dashboard.summary.failed, null);
  assert.equal(dashboard.summary.status, 'CAPTURES_ONLY');
  assert.equal(dashboard.results[0].status, 'CAPTURED');
  assert.equal(Object.hasOwn(dashboard.results[0], 'diffPercent'), false);
  assert.equal(Object.hasOwn(dashboard.results[0], 'baseline'), false);
});

test('operations dashboard has no seeded missions or sample job presented as live', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'fenix-core-controller.js'), 'utf8');
  assert.doesNotMatch(source, /System Self-Improvement Loop|Agent Capacity Auto-Tuning|Visual QA Regression Certification/);
  assert.doesNotMatch(source, /Auditoria Visual de 14 Telas|screensCertified\s*:\s*14/);
});

test('operational views do not invent online workers, providers, telemetry, or QA passes', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'fenix-core-controller.js'), 'utf8');
  assert.doesNotMatch(source, /ar\.ready\s*\|\|\s*15|ar\.capacity\s*\|\|\s*20/);
  assert.doesNotMatch(source, /totalEvents\s*=\s*events\.length\s*\|\|\s*24|size\s*\|\|\s*7/);
  assert.doesNotMatch(source, /100% PASS|ZERO COLISÕES CERTIFICADO|● PASSED/);
  assert.doesNotMatch(source, /Local Ollama LLM|Code Generation Engine|Autonomous Reasoning Gateway/);
});

test('operations progress and ETA are shown only when provided by the job runtime', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'operations-live.js'), 'utf8');
  assert.doesNotMatch(source, /\?\s*45\s*\)/);
  assert.doesNotMatch(source, /~15s restantes/);
  assert.match(source, /Progresso não informado pelo runtime/);
  assert.match(source, /ETA não informado/);
});
