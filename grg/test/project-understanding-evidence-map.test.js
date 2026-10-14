'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ProjectUnderstandingScanner } = require('../src/repo-intel/project-understanding-scanner');

test('project scanner builds a source-backed map of files, local imports, API routes, components, and tests', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-project-map-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, 'package.json', JSON.stringify({ dependencies: { express: 'git+https://user:token-secret@example.test/express', react: '^19.0.0' } }));
  write(root, 'src/app.js', "import { value } from './lib.js';\nconst app = require('express')();\napp.get('/api/health', () => value);\n");
  write(root, 'src/lib.js', 'export const value = 1;\n');
  write(root, 'public/pages/dashboard.jsx', 'export function Dashboard() { return null; }\n');
  write(root, 'test/app.test.js', "const app = require('../src/app');\n");
  write(root, '.env', 'SHOULD_NOT_APPEAR=secret-value');

  const report = await new ProjectUnderstandingScanner().scan(root);

  assert.equal(report.status, 'PARTIAL_OBSERVATION');
  assert.ok(report.files.some((file) => file.path === 'src/app.js'));
  assert.equal(report.files.some((file) => file.path === '.env'), false);
  assert.deepEqual(report.dependencies.map((item) => item.name), ['express', 'react']);
  assert.deepEqual(report.routes.map((route) => `${route.method} ${route.path}`), ['GET /api/health']);
  assert.ok(report.components.some((component) => component.path === 'public/pages/dashboard.jsx'));
  assert.deepEqual(report.tests.map((item) => item.path), ['test/app.test.js']);
  assert.ok(report.tests.every((item) => item.status === 'NOT_RUN'));
  assert.ok(report.moduleGraph.edges.some((edge) => edge.from === 'src/app.js' && edge.to === 'src/lib.js'));
  assert.ok(report.systemMap.nodes.some((node) => node.type === 'API' && node.label === 'GET /api/health'));
  assert.ok(report.systemMap.edges.some((edge) => edge.type === 'IMPORTS' && edge.from === 'file:src/app.js' && edge.to === 'file:src/lib.js'));
  assert.equal(JSON.stringify(report).includes('SHOULD_NOT_APPEAR'), false);
  assert.equal(JSON.stringify(report).includes('secret-value'), false);
  assert.equal(JSON.stringify(report).includes('token-secret'), false);
  assert.ok(report.dependencies.find((item) => item.name === 'express').version.startsWith('['));
});

test('project scanner bounds source reads and reports partial source coverage', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-project-map-source-cap-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, 'large.js', `// ${'x'.repeat(256 * 1024)}`);

  const report = await new ProjectUnderstandingScanner().scan(root);

  assert.equal(report.coverage.status, 'PARTIAL');
  assert.equal(report.coverage.sourceCoverageTruncated, true);
  assert.equal(report.coverage.sourceBytesRead, 256 * 1024);
});

test('project scanner records when traversal is truncated instead of claiming complete coverage', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-project-map-cap-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, 'a.js', 'const a = 1;');
  write(root, 'b.js', 'const b = 2;');

  const report = await new ProjectUnderstandingScanner({ maxFiles: 1 }).scan(root);

  assert.equal(report.coverage.status, 'PARTIAL');
  assert.equal(report.coverage.truncated, true);
  assert.equal(report.totalFiles, 1);
});

test('project scanner assigns stable evidence digests to observed source and flags partial file reads', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-project-evidence-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, 'src/app.js', 'export const value = 1;\n');
  write(root, 'src/large.js', `// ${'x'.repeat(256 * 1024)}`);

  const scanner = new ProjectUnderstandingScanner();
  const first = await scanner.scan(root);
  const second = await scanner.scan(root);
  const complete = first.sourceEvidence.find((item) => item.path === 'src/app.js');
  const partial = first.sourceEvidence.find((item) => item.path === 'src/large.js');

  assert.match(first.observationDigest, /^[a-f0-9]{64}$/);
  assert.equal(second.observationDigest, first.observationDigest);
  assert.equal(complete.coverage, 'COMPLETE');
  assert.match(complete.sha256, /^[a-f0-9]{64}$/);
  assert.equal(partial.coverage, 'PARTIAL');
  assert.equal(partial.sha256, null);
  assert.match(partial.observedPrefixSha256, /^[a-f0-9]{64}$/);

  write(root, 'src/app.js', 'export const value = 2;\n');
  const changed = await scanner.scan(root);
  assert.notEqual(changed.observationDigest, first.observationDigest);
});

test('reverse engineering report does not invent code counts or agent success rates', async (t) => {
  const { ReverseEngineeringEngine } = require('../src/repo-intel/reverse-engineering-engine');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-reverse-evidence-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  write(root, 'src/app.js', 'export const value = 1;\n');

  const report = await new ReverseEngineeringEngine().ingestAndAnalyze(root, { projectId: 'evidence-fixture' });

  assert.equal(report.metrics.estimatedTotalFunctions, undefined);
  assert.equal(report.initialDna.agentDna.taskSuccessRate, null);
  assert.match(report.analysisEvidence.observationDigest, /^[a-f0-9]{64}$/);
  assert.equal(report.analysisEvidence.targetContentUntrusted, true);
  assert.equal(report.analysisEvidence.coverage.status, 'OBSERVED');
});

function write(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}
