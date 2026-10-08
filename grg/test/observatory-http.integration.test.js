const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { start } = require('../src/server');

test('authenticated observatory routes use runtime records and preserve unavailable audit state', async (t) => {
  const dataFile = path.join(os.tmpdir(), `fenix-observatory-${crypto.randomUUID()}.json`);
  const credentials = {
    tenantId: `observatory-${crypto.randomUUID()}`,
    userId: 'observatory-admin',
    password: crypto.randomBytes(24).toString('base64url'),
  };
  const server = await start(0, {
    dataFile,
    llm: false,
    bootstrapAdmin: { ...credentials, tenantName: 'Observatory Test', name: 'Observatory Admin', role: 'master_admin' },
  });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    try { fs.unlinkSync(dataFile); } catch {}
  });

  const base = `http://127.0.0.1:${server.address().port}`;
  const login = await fetch(`${base}/api/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials),
  }).then((response) => response.json());
  const headers = { authorization: `Bearer ${login.token}` };

  const unauthenticated = await fetch(`${base}/api/v2/reality/score`);
  assert.equal(unauthenticated.status, 401);

  const scoreResponse = await fetch(`${base}/api/v2/reality/score`, { headers });
  const score = await scoreResponse.json();
  assert.equal(scoreResponse.status, 200);
  assert.equal(score.status, 'NOT_EVALUATED');
  assert.equal(score.score, null);

  const summaryResponse = await fetch(`${base}/api/v2/observatory/summary`, { headers });
  const summary = await summaryResponse.json();
  const projectResponse = await fetch(`${base}/api/v2/public/projects`, { headers });
  const projectPayload = await projectResponse.json();
  assert.equal(summaryResponse.status, 200);
  assert.equal(projectResponse.status, 200);
  assert.equal(summary.source, 'measured');
  assert.equal(summary.metrics.totalProjects, projectPayload.projects.length);
  assert.equal(summary.services.worker, null);

  const screensResponse = await fetch(`${base}/api/v2/observatory/twins/screen`, { headers });
  const screens = await screensResponse.json();
  assert.equal(screensResponse.status, 200);
  assert.ok(screens.count > 0);
  assert.ok(screens.screens.every((screen) => screen.maturityLevel === 'UNVERIFIED'));

  const gapsResponse = await fetch(`${base}/api/v2/observatory/gaps`, { headers });
  const gaps = await gapsResponse.json();
  assert.equal(gapsResponse.status, 503);
  assert.equal(gaps.status, 'UNAVAILABLE');
  assert.equal(gaps.gaps, null);
});
