'use strict';
// Entrega A — autonomia: cascata de modelos com feedback dos testes, BLOQUEADO honesto quando o
// modelo local falta (missão preservada, tentativa não consumida) e retomada quando ele volta.
// Ollama simulado por um servidor HTTP local; nada aqui finge sucesso: o sandbox roda o código.
process.env.FENIX_TEST_MODE = 'true';
setTimeout(() => { console.error('[entrega-a-autonomy] HARD TIMEOUT 240s -> FAIL'); process.exit(124); }, 240_000).unref();
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createApp } = require('../src/app');
const { checkModelMemory, parseMeminfo } = require('../src/runtime/resource-guard');

const TENANT = 'entrega-a';
const ACTOR = 'operator';
const ADD_REQUEST = 'crie uma função add que soma dois números: add(2, 3) => 5, add(-1, 1) => 0';
const GOOD = '```js\nfunction add(a, b) { return a + b; }\nmodule.exports = { add };\n```';
const BAD = '```js\nfunction add(a, b) { return a - b; }\nmodule.exports = { add };\n```';

function mockOllama(responder) {
  const state = { up: true, calls: [] };
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (d) => { body += d; });
    req.on('end', () => {
      if (!state.up) { req.socket.destroy(); return; }
      const parsed = JSON.parse(body || '{}');
      if (req.url === '/api/generate') state.calls.push(parsed);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ model: parsed.model, response: responder(parsed), eval_count: 20, prompt_eval_count: 30, done: true }));
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, state, url: `http://127.0.0.1:${server.address().port}` })));
}

async function makeApp(env) {
  const app = await createApp({ dataFile: null, env: { FENIX_CODE_DELIVERY_CLAIM_WAIT_MS: '200', ...env } });
  await app.controlPlane.createTenant({ id: TENANT, name: 'Entrega A' }, ACTOR);
  return app;
}

function startWorker(app, id = 'fenix-runtime-worker-test') {
  let stop = false;
  const loop = (async () => { while (!stop) { await app.jobs.runBatch(id, 1); await new Promise((r) => setTimeout(r, 50)); } })();
  return async () => { stop = true; await loop; };
}

// 60 s: com a suíte inteira rodando em paralelo a máquina fica saturada e o ciclo
// bloqueio -> nova tentativa -> sandbox pode levar mais de 20 s. Só o prazo muda; as asserções não.
async function waitFor(fn, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > deadline) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 50));
  }
}

test('cascade: first model fails the tests, second model gets the failure as feedback and passes', async () => {
  const ollama = await mockOllama((req) => (req.model === 'coder-small' ? BAD : GOOD));
  const app = await makeApp({ FENIX_CODER_OLLAMA_URL: ollama.url, FENIX_CODER_CASCADE: 'coder-small,general-3b', FENIX_CODER_NUM_THREAD: '3' });
  try {
    const out = await app.chat.handle(TENANT, ACTOR, ADD_REQUEST);
    assert.equal(out.facts.deliveryStatus, 'TESTS_PASSED', JSON.stringify(out.facts));
    assert.deepEqual(ollama.state.calls.map((c) => c.model), ['coder-small', 'general-3b']);
    assert.equal(ollama.state.calls[0].options.num_thread, 3);
    assert.match(ollama.state.calls[1].prompt, /a - b/, 'second prompt must carry the previous code');
    assert.match(ollama.state.calls[1].prompt, /add\(2, 3\)/, 'second prompt must carry the failing test');
    const state = await app.store.read();
    const delivery = state.missions.find((m) => m.id === out.facts.missionId).delivery;
    assert.equal(delivery.attempts.length, 2);
    assert.deepEqual(delivery.attempts.map((a) => [a.model, a.status]), [['coder-small', 'TESTS_FAILED'], ['general-3b', 'TESTS_PASSED']]);
    assert.equal(delivery.model, 'general-3b');
    assert.equal(out.facts.missionStatus, 'SUCCEEDED');
  } finally { await app.close(); ollama.server.close(); }
});

test('cascade: every model fails -> TESTS_FAILED with all attempts recorded, mission FAILED', async () => {
  const ollama = await mockOllama(() => BAD);
  const app = await makeApp({ FENIX_CODER_OLLAMA_URL: ollama.url, FENIX_CODER_CASCADE: 'coder-small,general-3b' });
  try {
    const out = await app.chat.handle(TENANT, ACTOR, ADD_REQUEST);
    assert.equal(out.facts.deliveryStatus, 'TESTS_FAILED');
    const state = await app.store.read();
    const mission = state.missions.find((m) => m.id === out.facts.missionId);
    assert.equal(mission.delivery.attempts.length, 2);
    assert.equal(mission.status, 'FAILED');
  } finally { await app.close(); ollama.server.close(); }
});

test('without FENIX_CODER_CASCADE a single model and a single attempt are used (previous behaviour)', async () => {
  const ollama = await mockOllama(() => BAD);
  const app = await makeApp({ FENIX_CODER_OLLAMA_URL: ollama.url, FENIX_CODER_MODEL: 'only-model' });
  try {
    const out = await app.chat.handle(TENANT, ACTOR, ADD_REQUEST);
    assert.equal(out.facts.deliveryStatus, 'TESTS_FAILED');
    assert.deepEqual(ollama.state.calls.map((c) => c.model), ['only-model']);
  } finally { await app.close(); ollama.server.close(); }
});

test('Ollama down -> job BLOCKED (attempt not consumed), mission preserved as BLOCKED, honest reply, no code', async () => {
  const ollama = await mockOllama(() => GOOD);
  ollama.state.up = false;
  const app = await makeApp({ FENIX_CODER_OLLAMA_URL: ollama.url, FENIX_CODER_TIMEOUT_MS: '2000', FENIX_CODE_DELIVERY_INLINE: '0', FENIX_CODE_DELIVERY_WAIT_MS: '15000', FENIX_BLOCKED_RETRY_MS: '60000' });
  const stopWorker = startWorker(app);
  try {
    const out = await app.chat.handle(TENANT, ACTOR, ADD_REQUEST);
    assert.equal(out.facts.deliveryStatus, 'BLOCKED', JSON.stringify(out.facts));
    assert.equal(out.facts.code, null);
    assert.equal(out.facts.tests, null);
    assert.match(out.reply, /bloquead/i);
    assert.match(out.reply, /Nenhum código foi gerado/);
    const job = await app.jobs.getInternal(TENANT, out.facts.jobId);
    assert.equal(job.status, 'BLOCKED');
    assert.equal(job.blockedOn, 'ollama');
    assert.equal(job.attempts, 0, 'a blocked dependency must not consume an attempt');
    assert.ok(job.blockedSince);
    const mission = await app.missions.get(TENANT, ACTOR, out.facts.missionId);
    assert.equal(mission.status, 'BLOCKED');
    const state = await app.store.read();
    assert.equal(state.missions.find((m) => m.id === out.facts.missionId).delivery, undefined, 'nothing is persisted as a delivery');
  } finally { await stopWorker(); await app.close(); ollama.server.close(); }
});

test('Ollama comes back -> the same blocked job resumes and the mission finishes SUCCEEDED', async () => {
  const ollama = await mockOllama(() => GOOD);
  ollama.state.up = false;
  const app = await makeApp({ FENIX_CODER_OLLAMA_URL: ollama.url, FENIX_CODER_TIMEOUT_MS: '2000', FENIX_CODER_BREAKER_COOLDOWN_MS: '0', FENIX_CODE_DELIVERY_INLINE: '0', FENIX_CODE_DELIVERY_WAIT_MS: '15000', FENIX_BLOCKED_RETRY_MS: '300' });
  const stopWorker = startWorker(app);
  try {
    const out = await app.chat.handle(TENANT, ACTOR, ADD_REQUEST);
    assert.equal(out.facts.deliveryStatus, 'BLOCKED');
    ollama.state.up = true;
    const job = await waitFor(async () => { const j = await app.jobs.getInternal(TENANT, out.facts.jobId); return j.status === 'SUCCEEDED' ? j : null; });
    assert.equal(job.attempts, 1, 'only the run that actually reached the model counts as an attempt');
    assert.equal(job.result.deliveryStatus, 'TESTS_PASSED');
    const mission = await waitFor(async () => { const m = await app.missions.get(TENANT, ACTOR, out.facts.missionId); return m.status === 'SUCCEEDED' ? m : null; });
    assert.equal(mission.status, 'SUCCEEDED');
    const state = await app.store.read();
    const sameMissionJobs = state.runtimeJobs.filter((j) => j.missionId === out.facts.missionId && j.type === 'code.deliver');
    assert.equal(sameMissionJobs.length, 1, 'resume reuses the same job, no duplicate');
  } finally { await stopWorker(); await app.close(); ollama.server.close(); }
});

test('a BLOCKED job is cancelled immediately and a block longer than the limit becomes DEAD_LETTER', async () => {
  const ollama = await mockOllama(() => GOOD);
  ollama.state.up = false;
  const app = await makeApp({ FENIX_CODER_OLLAMA_URL: ollama.url, FENIX_CODER_TIMEOUT_MS: '1000', FENIX_CODER_BREAKER_COOLDOWN_MS: '0', FENIX_CODE_DELIVERY_INLINE: '0', FENIX_CODE_DELIVERY_WAIT_MS: '10000', FENIX_BLOCKED_RETRY_MS: '100', FENIX_BLOCKED_MAX_MS: '600000' });
  const stopWorker = startWorker(app);
  try {
    const out = await app.chat.handle(TENANT, ACTOR, ADD_REQUEST);
    assert.equal(out.facts.deliveryStatus, 'BLOCKED');
    const cancelled = await app.jobs.cancel(TENANT, ACTOR, out.facts.jobId);
    assert.equal(cancelled.status, 'CANCELLED');
  } finally { await stopWorker(); await app.close(); }

  const app2 = await makeApp({ FENIX_CODER_OLLAMA_URL: ollama.url, FENIX_CODER_TIMEOUT_MS: '1000', FENIX_CODER_BREAKER_COOLDOWN_MS: '0', FENIX_CODE_DELIVERY_INLINE: '0', FENIX_CODE_DELIVERY_WAIT_MS: '10000', FENIX_BLOCKED_RETRY_MS: '100', FENIX_BLOCKED_MAX_MS: '400' });
  const stopWorker2 = startWorker(app2);
  try {
    const out = await app2.chat.handle(TENANT, ACTOR, ADD_REQUEST);
    const job = await waitFor(async () => { const j = await app2.jobs.getInternal(TENANT, out.facts.jobId); return j.status === 'DEAD_LETTER' ? j : null; });
    assert.match(job.error.message, /blocked/i);
    const mission = await waitFor(async () => { const m = await app2.missions.get(TENANT, ACTOR, out.facts.missionId); return m.status === 'FAILED' ? m : null; });
    assert.equal(mission.status, 'FAILED');
  } finally { await stopWorker2(); await app2.close(); ollama.server.close(); }
});

test('resource guard: blocks when available RAM is below model size + margin, allows a loaded model, unknown never blocks', () => {
  const meminfo = parseMeminfo('MemTotal:       6062080 kB\nMemAvailable:    1048576 kB\nSwapTotal:      4194300 kB\nSwapFree:       2097150 kB\n');
  assert.equal(meminfo.availableMb, 1024);
  assert.equal(meminfo.swapUsedMb, 2048);
  const gb = 1024 ** 3;
  assert.equal(checkModelMemory({ meminfo, modelBytes: 2 * gb, loaded: false, marginMb: 512 }).ok, false);
  assert.equal(checkModelMemory({ meminfo, modelBytes: 0.4 * gb, loaded: false, marginMb: 512 }).ok, true);
  assert.equal(checkModelMemory({ meminfo, modelBytes: 2 * gb, loaded: true, marginMb: 512 }).ok, true);
  const unknown = checkModelMemory({ meminfo: null, modelBytes: 2 * gb, loaded: false, marginMb: 512 });
  assert.equal(unknown.ok, true);
  assert.equal(unknown.status, 'UNKNOWN');
});