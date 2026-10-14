'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const routes = fs.readFileSync(path.resolve(__dirname, '../src/api/universal-system-routes.js'), 'utf8');
const commandCenter = fs.readFileSync(path.resolve(__dirname, '../public/command-center.js'), 'utf8');

test('universal routes do not keep a duplicate fabricated API Platform health handler', () => {
  assert.equal(routes.includes("pathname === '/api/v2/api-platform/health'"), false, 'the server health route is the single source of truth');
  assert.equal(routes.includes("pathname === '/api/v2/system/health'"), false, 'system telemetry must come from the authenticated runtime route');
  assert.equal(routes.includes('Coupled Local Runtime'), false, 'health cannot claim a provider that was not measured');
});

test('API Platform chat and deployment controls do not hardcode VPS credentials or targets', () => {
  assert.equal(routes.includes('C:/Users/Dell/.ssh/grg_fenix_vps'), false, 'SSH private key path cannot be embedded in a route');
  assert.equal(routes.includes('docker restart api-platform-api-1'), false, 'legacy deployment cannot run an unapproved command');
  assert.equal(routes.includes("hostname: '209.50.241.22'"), false, 'API calls must use the configured platform URL');
  assert.equal(routes.includes("model: 'qwen2.5:3b'"), false, 'API calls must use the configured model');
});

test('API Platform screen routes deployment through the audited Operations flow', () => {
  assert.equal(commandCenter.includes("fetch('/api/v2/api-platform/deploy'"), false, 'the screen cannot invoke the retired direct-deploy route');
  assert.equal(commandCenter.includes('Reiniciar / Deploy VPS'), false, 'the screen must not imply an unapproved immediate restart');
});
