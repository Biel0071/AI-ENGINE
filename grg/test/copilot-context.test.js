'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const sidebarSource = fs.readFileSync(path.join(publicDir, 'fenix-mascot-sidebar.js'), 'utf8');

test('copilot-context: Context Bar displays PROJ, FILE, MODE and AGENT', () => {
  assert.ok(sidebarSource.includes('fsbContextBar'), 'Context bar container must be built');
  assert.ok(sidebarSource.includes('fsbCtxProject'), 'Project pill must exist');
  assert.ok(sidebarSource.includes('fsbCtxFile'), 'File pill must exist');
  assert.ok(sidebarSource.includes('fsbCtxMode'), 'Mode pill must exist');
  assert.ok(sidebarSource.includes('fsbCtxAgent'), 'Agent pill must exist');
});

test('copilot-context: Contextual action chips dynamically change per mode', () => {
  assert.ok(sidebarSource.includes('fsbChipsRow'), 'Chips container must exist');
  assert.ok(sidebarSource.includes('Explicar Código'), 'Code mode actions must be present');
  assert.ok(sidebarSource.includes('Inspecionar Layout') || sidebarSource.includes('Analisar UI'), 'Preview mode actions must be present');
});

test('copilot-context: Diff container supports Apply and Reject actions', () => {
  assert.ok(sidebarSource.includes('fsbDiffContainer'), 'Diff container must exist');
  assert.ok(sidebarSource.includes('fsbDiffCode'), 'Diff code container must exist');
  assert.ok(sidebarSource.includes('Aplicar no Editor'), 'Apply diff action must exist');
  assert.ok(sidebarSource.includes('Rejeitar'), 'Reject diff action must exist');
});
