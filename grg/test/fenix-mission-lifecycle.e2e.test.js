const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { start } = require('../src/server');

test('mission lifecycle keeps API state, jobs and events consistent', async () => {
  const admin = { tenantId: 'fenix-lifecycle', userId: 'lifecycle-admin', password: crypto.randomBytes(24).toString('base64url') };
  const dataFile = path.join(os.tmpdir(), `fenix-lifecycle-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  const server = await start(0, { dataFile, llm: false, bootstrapAdmin: { ...admin, tenantName: 'FENIX Lifecycle', name: 'Lifecycle Admin', role: 'master_admin' } });
  const base = `http://127.0.0.1:${server.address().port}`;
  const json = (value) => JSON.stringify(value);
  try {
    const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: json(admin) }).then((r) => r.json());
    assert.ok(login.token);
    const headers = { authorization: `Bearer ${login.token}`, 'content-type': 'application/json' };
    const created = await fetch(`${base}/api/fenix/missions`, { method: 'POST', headers, body: json({ title: 'Lifecycle proof', objective: 'Provar estado real', steps: [{ key: 'discover', type: 'discover' }] }) }).then((r) => r.json());
    assert.ok(created.missionId);

    let mission;
    for (let i = 0; i < 20; i += 1) {
      mission = await fetch(`${base}/api/fenix/missions/${created.missionId}`, { headers }).then((r) => r.json());
      if (['RUNNING', 'SUCCEEDED', 'FAILED'].includes(mission.status)) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.ok(['RUNNING', 'SUCCEEDED'].includes(mission.status));
    if (mission.status === 'RUNNING') {
      const paused = await fetch(`${base}/api/fenix/missions/${created.missionId}/pause`, { method: 'POST', headers, body: '{}' }).then((r) => r.json());
      assert.equal(paused.status, 'PAUSED');
      const resumed = await fetch(`${base}/api/fenix/missions/${created.missionId}/resume`, { method: 'POST', headers, body: '{}' }).then((r) => r.json());
      assert.equal(resumed.status, 'RUNNING');
    }

    const terminal = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED']);
    for (let i = 0; i < 120 && !terminal.has(mission.status); i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      mission = await fetch(`${base}/api/fenix/missions/${created.missionId}`, { headers }).then((r) => r.json());
    }
    assert.equal(mission.status, 'SUCCEEDED');
    assert.equal(mission.progress, 100);
    assert.ok(mission.steps.every((step) => step.status === 'SUCCEEDED'));
    assert.ok(mission.events.some((event) => event.type === 'mission.paused') || mission.events.some((event) => event.type === 'mission.completed'));
    assert.ok(mission.events.some((event) => event.type === 'mission.completed'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    try { fs.unlinkSync(dataFile); } catch {}
  }
});
