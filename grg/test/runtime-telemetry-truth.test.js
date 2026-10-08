'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { resolveProjectWorkingDirectory } = require('../src/api/project-working-directory');
const { getFullStatus } = require('../src/api/runtime-full-status');

test('runtime full status derives queue counters from tenant-scoped persisted JobEngine jobs', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: true, status: 200 });
  try {
    const full = await getFullStatus({
      store: { read: async () => ({
        runtimeJobs: [
          { id: 'queued-a', tenantId: 'tenant-a', status: 'QUEUED' },
          { id: 'running-a', tenantId: 'tenant-a', status: 'RUNNING' },
          { id: 'failed-a', tenantId: 'tenant-a', status: 'DEAD_LETTER' },
          { id: 'other-tenant', tenantId: 'tenant-b', status: 'RUNNING' },
          { id: 'unscoped', status: 'QUEUED' },
        ],
        deadLetters: [], cognitiveAgents: [], memories: [],
      }) },
    }, 'tenant-a');

    assert.equal(full.runtime.queue.source, 'JobEngine');
    assert.equal(full.runtime.queue.total, 3);
    assert.equal(full.runtime.queue.queued, 1);
    assert.equal(full.runtime.queue.running, 1);
    assert.equal(full.runtime.queue.failed, 1);
    assert.equal(full.runtime.queue.isPaused, null);
  } finally {
    global.fetch = originalFetch;
  }
});

test('terminal cwd defaults to project root and rejects paths outside it', (t) => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-terminal-root-'));
  const root = path.join(parent, 'project');
  const outside = path.join(parent, 'outside');
  fs.mkdirSync(root);
  fs.mkdirSync(outside);
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));

  assert.equal(resolveProjectWorkingDirectory(root), fs.realpathSync(root));
  assert.equal(resolveProjectWorkingDirectory(root, outside), null);
  assert.equal(resolveProjectWorkingDirectory(root, '..'), null);
});
test('terminal cwd rejects symlink escapes and non-directories', (t) => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-terminal-link-'));
  const root = path.join(parent, 'project');
  const outside = path.join(parent, 'outside');
  fs.mkdirSync(root);
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(root, 'file.txt'), 'file');
  const link = path.join(root, 'escape');
  try { fs.symlinkSync(outside, link, 'junction'); } catch (error) {
    t.skip(`Symlink creation unavailable: ${error.message}`);
    return;
  }
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));

  assert.equal(resolveProjectWorkingDirectory(root, link), null);
  assert.equal(resolveProjectWorkingDirectory(root, path.join(root, 'file.txt')), null);
});

test('runtime services UI renders only telemetry from runtime APIs', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'fenix-operational-os.js'), 'utf8');
  const start = source.indexOf('window.fenixRenderRuntimeServices = async function ()');
  const end = source.indexOf('// 13. KNOWLEDGE RELATIONSHIPS EXPLORER', start);
  assert.ok(start >= 0 && end > start, 'runtime renderer must exist');
  const renderer = source.slice(start, end);

  assert.match(renderer, /\/api\/v2\/runtime\/full-status/);
  assert.doesNotMatch(renderer, /AlmaLinux 9|5\.4\.3|27\.5\.1|7\.2\.7|16\.8|0\.5\.11|1\.25\.3|DISABLED BY OPERATOR/);
  assert.doesNotMatch(renderer, /maxCapacity:\s*8|redisPersistence:\s*['"]CONNECTED|STANDBY_READY|supervisor-orchestration|ecosystem-status/);
  assert.match(renderer, /UNAVAILABLE|Indisponível/);
});

test('infrastructure UI distinguishes unavailable telemetry from an empty measured inventory', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const start = source.indexOf('window.loadInfrastructureView = async function()');
  const end = source.indexOf('// window.fenixInspectJob', start);
  assert.ok(start >= 0 && end > start, 'infrastructure view must exist');
  const view = source.slice(start, end);

  assert.match(view, /realityResponse\.ok/);
  assert.match(view, /sourceStatus\?\.docker/);
  assert.match(view, /sourceStatus\?\.pm2/);
  assert.doesNotMatch(view, /Linux 5\.14|overall \|\| 'OPERATIONAL'/);
});
