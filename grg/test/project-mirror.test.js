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
    'src/routes/api.js': 'router.get("/health", (req, res) => res.json({ ok: true }));\nrouter.post("/jobs", handler);',
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
    // Check icons are assigned
    assert.ok(screens.every((s) => s.icon));
    // Check discoveredBy
    assert.ok(screens.every((s) => s.discoveredBy === 'html-data-view'));
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
