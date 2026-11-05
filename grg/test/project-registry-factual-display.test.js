'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../public/project-hub-live.js'), 'utf8');
const registry = fs.readFileSync(path.join(__dirname, '../src/projects/project-registry.js'), 'utf8');

test('Project Hub prefers the measured runtime probe over the registry default status', () => {
  assert.equal(/project\.runtimeStatus/.test(source), true, 'displayed status must use the health probe result');
  assert.equal(/runtimeStatus\s*\|\|\s*project\.status/.test(source), false, 'stale status must not mask a failed probe');
});

test('Project Hub does not fill missing project facts with invented counts or versions', () => {
  for (const value of ['1 agente (Orquestrador)', 'Sincronizada (Kernel ativo)', 'v2.5 (Canonical Genome)', 'Auto-descoberta ativa']) {
    assert.equal(source.includes(value), false, `must not invent ${value}`);
  }
  assert.equal(/project\.updatedAt\s*\|\|\s*new Date\(\)/.test(registry), false, 'project activity cannot default to the time of a read');
});
