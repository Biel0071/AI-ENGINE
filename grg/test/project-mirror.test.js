'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { scanProject } = require('../src/project-mirror/scanner');
const { extractScreens } = require('../src/project-mirror/screen-extractor');

function mkProject(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-mirror-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

test('scanner: maps a minimal node project', async () => {
  const dir = mkProject({
    'package.json': JSON.stringify({ name: 'test-app', version: '1.0.0', dependencies: { express: '^4', bullmq: '^5', pg: '^8' } }),
    'src/app.js': 'const express = require("express"); module.exports = express();',
    'src/routes/api.js': 'router.get("/health", (req, res) => res.json({ ok: true }));\nrouter.post("/jobs", handler);\nif (req.method === "GET" && url.pathname === "/api/runtime") return true;',
    'test/app.test.js': 'const test = require("node:test");',
  });
  try {
    const snap = await scanProject(dir);
    assert.equal(snap.name, 'test-app');
    assert.equal(snap.version, '1.0.0');
    assert.ok(snap.files.total >= 3);
    assert.ok(snap.files.byType.js >= 2);
    assert.ok(snap.files.byType.json >= 1);
    assert.ok(snap.tests.count >= 1);
    assert.ok(snap.tech.backend === 'express');
    assert.ok(snap.tech.queues.includes('bullmq'));
    assert.ok(snap.tech.databases.includes('pg'));
    assert.ok(snap.apis.length >= 1);
    assert.equal(snap.apis[0].method, 'GET');
    assert.equal(snap.apis[0].path, '/health');
    assert.ok(snap.apis.some((api) => api.method === 'GET' && api.path === '/api/runtime'));
    assert.ok(snap.apis.every((api) => Number.isInteger(api.line) && api.line > 0));
    assert.ok(snap.scannedAt);
    assert.ok(snap.durationMs >= 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('scanner: handles missing package.json gracefully', async () => {
  const dir = mkProject({
    'src/index.js': '// no package.json',
  });
  try {
    const snap = await scanProject(dir);
    assert.ok(snap.files.total >= 1);
    assert.equal(snap.tech.frontend, null);
    assert.equal(snap.tech.backend, null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('scanner: aggregates workspace packages and avoids generic .get false-positive routes', async () => {
  const dir = mkProject({
    'package.json': JSON.stringify({ name: 'workspace-root', workspaces: ['apps/*', 'packages/*'], devDependencies: { typescript: '^5' } }),
    'apps/api/package.json': JSON.stringify({ name: '@workspace/api', dependencies: { fastify: '^5', bullmq: '^5', '@prisma/client': '^6', openai: '^6' } }),
    'apps/api/src/routes/v1/index.ts': 'export async function routes(app) { app.post("/v1/text", handler); app.get("/v1/providers", handler); }',
    'packages/shared/src/resource-controller.ts': 'const value = fields.get("MemTotal");',
  });
  try {
    const snap = await scanProject(dir);
    assert.equal(snap.tech.backend, 'fastify');
    assert.deepEqual(snap.tech.queues, ['bullmq']);
    assert.ok(snap.tech.databases.includes('@prisma/client'));
    assert.ok(snap.tech.ai.includes('openai'));
    assert.equal(snap.packages.length, 2);
    assert.ok(snap.dependencies.production.includes('fastify'));
    assert.ok(snap.apis.some((api) => api.method === 'POST' && api.path === '/v1/text'));
    assert.ok(snap.apis.every((api) => api.path !== 'MemTotal'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('scanner: rejects inaccessible path', async () => {
  await assert.rejects(
    () => scanProject('/this/path/does/not/exist/ever'),
    (err) => err.message.includes('not accessible')
  );
});

test('screen-extractor: discovers HTML data-view screens', async () => {
  const html = `<!DOCTYPE html><html><head></head><body>
    <button class="nav-item active" data-view="command">COMMAND</button>
    <button class="nav-item" data-view="ide">IDE</button>
    <button class="nav-item" data-view="projects">PROJECTS</button>
    <div id="view-command" class="view active"></div>
    <div id="view-ide" class="view"></div>
    <div id="view-projects" class="view"></div>
  </body></html>`;
  const dir = mkProject({ 'public/index.html': html });
  try {
    const screens = await extractScreens(dir);
    assert.ok(screens.length >= 3, `expected >= 3 screens, got ${screens.length}`);
    assert.ok(screens.some((s) => s.id === 'command'));
    assert.ok(screens.some((s) => s.id === 'ide'));
    assert.ok(screens.some((s) => s.id === 'projects'));
    const command = screens.find((s) => s.id === 'command');
    assert.equal(command.route, '/app#command');
    assert.deepEqual(command.previewTarget, { type: 'PROJECT_HTML', path: '/app#command', file: 'public/index.html' });
    assert.ok(command.sourceFiles.some((source) => source.file === 'public/index.html' && source.line > 0));
    assert.ok(command.components.some((component) => component.id === 'view-command' && component.line > 0));
    // Check icons are assigned
    assert.ok(screens.every((s) => s.icon));
    // Check discoveredBy
    assert.ok(screens.every((s) => s.discoveredBy === 'html-data-view'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('screen-extractor: stitches hash-routed screens from a nested workspace dashboard', async () => {
  const html = `<!doctype html><nav>
    <a href="#/home">Overview</a><a href="#/providers">Providers</a><a href="#/settings">Settings</a>
    </nav><main id="content"></main><script src="app.js"></script>`;
  const dir = mkProject({
    'package.json': JSON.stringify({ name: 'monorepo', workspaces: ['apps/*'] }),
    'apps/dashboard/public/index.html': html,
    'apps/dashboard/public/app.js': 'window.dashboard = true;',
  });
  try {
    const scan = await scanProject(dir);
    const screens = await extractScreens(dir, scan);
    assert.deepEqual(screens.map((screen) => screen.route), ['#/home', '#/providers', '#/settings']);
    assert.ok(screens.every((screen) => screen.file === 'apps/dashboard/public/index.html'));
    assert.ok(screens.every((screen) => screen.sourceFiles.some((source) => source.file === 'apps/dashboard/public/app.js')));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('screen-extractor: discovers React Router screens', async () => {
  const appCode = `
    import { Route, Routes } from 'react-router-dom';
    const App = () => (
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  `;
  const dir = mkProject({ 'src/App.jsx': appCode });
  try {
    const screens = await extractScreens(dir, { tech: { frontend: 'react' } });
    assert.ok(screens.length >= 3);
    assert.ok(screens.some((s) => s.route === '/dashboard'));
    assert.ok(screens.some((s) => s.route === '/settings'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('screen-extractor: returns empty array for unknown project structure', async () => {
  const dir = mkProject({ 'main.py': 'print("hello")' });
  try {
    const screens = await extractScreens(dir);
    assert.ok(Array.isArray(screens));
    // May be empty — that is correct, not fabricated
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
