'use strict';
// Entrega A end-to-end: chat -> mission (MissionPlanner CODE) -> Orchestrator delegates to Developer
// -> runtime job code.deliver -> Ollama (mocked HTTP server, or real when OLLAMA_URL is set)
// -> code extraction -> sandbox tests -> persisted on mission -> chat reply.
// Hermetic test mode: no self-healing watchdog and no BullMQ/Redis dispatch from the process-global
// JobQueueManager (it loads grg/.data/jobs-v8.json and would otherwise retry leftover jobs forever,
// which is what kept a previous run of this file alive for ~2 h). Must be set before requiring app.
process.env.FENIX_TEST_MODE = 'true';
// Last-resort guard: whatever handle leaks, the file never outlives 5 min (unref'd: does not keep it alive).
setTimeout(() => { console.error('[entrega-a] HARD TIMEOUT 300s: open handles kept the process alive -> FAIL'); process.exit(124); }, 300_000).unref();
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createApp } = require('../src/app');
const { CodeDelivery } = require('../src/execution/code-delivery-pipeline');

const TENANT = 'entrega-a';
const ACTOR = 'operator';

function mockOllama(responder) {
  const calls = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (d) => { body += d; });
    req.on('end', () => {
      const parsed = JSON.parse(body || '{}');
      calls.push({ path: req.url, body: parsed });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ model: parsed.model, response: responder(parsed), eval_count: 42, prompt_eval_count: 58, done: true }));
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, calls, url: `http://127.0.0.1:${server.address().port}` })));
}

async function makeApp(env) {
  const app = await createApp({ dataFile: null, env: { ...env, FENIX_CODE_DELIVERY_CLAIM_WAIT_MS: env.FENIX_CODE_DELIVERY_CLAIM_WAIT_MS || '200' } });
  await app.controlPlane.createTenant({ id: TENANT, name: 'Entrega A' }, ACTOR);
  return app;
}

const ADD_REQUEST = 'crie uma função add que soma dois números: add(2, 3) => 5, add(-1, 1) => 0';

test('production code delivery rejects the non-production-safe default sandbox', () => {
  assert.throws(
    () => new CodeDelivery({ app: {}, env: { FENIX_ENV: 'production' } }),
    /production code delivery requires an explicitly production-safe sandbox adapter/,
  );
});

test('app wires CodeDelivery to rootless sandbox with bounded CPU mode and pinned image', async () => {
  const app = await createApp({ dataFile: null, env: {
    FENIX_SANDBOX_DRIVER: 'docker-rootless',
    DOCKER_HOST: 'unix:///run/user/1001/docker.sock',
    FENIX_AGENT_TEST_IMAGE: `node@sha256:${'a'.repeat(64)}`,
  } });
  try {
    assert.equal(app.sandbox.adapter.cpuMode, 'process-time');
    assert.equal(app.codeDelivery.sandbox.productionSafe, true);
  } finally { await app.close(); }
});

// qwen2.5-coder:1.5b style: correct code, then unrequested prose (measured on the VPS).
const QWEN_STYLE_OK = 'Here is the function:\n```javascript\nfunction add(a, b) {\n  return a + b;\n}\nmodule.exports = { add };\n```\nThis function takes two numbers and returns their sum. You can also use it like this:\n```js\nconsole.log(add(1,2))\n```';

test('chat intent routing: code request -> build_code, system request stays generate', async () => {
  const app = await makeApp({ FENIX_CODER_OLLAMA_URL: 'http://127.0.0.1:9' });
  try {
    assert.equal(app.chat.detectIntent(ADD_REQUEST).kind, 'build_code');
    assert.equal(app.chat.detectIntent('write a function that reverses a string').kind, 'build_code');
    assert.equal(app.chat.detectIntent('gerar um CRM de WhatsApp com IA').kind, 'generate');
  } finally { await app.close(); }
});

test('E2E (mocked Ollama): passing code -> mission SUCCEEDED, delivery persisted, honest reply', async () => {
  const ollama = await mockOllama(() => QWEN_STYLE_OK);
  const app = await makeApp({ FENIX_CODER_OLLAMA_URL: ollama.url, FENIX_CODER_MODEL: 'qwen2.5-coder:1.5b' });
  try {
    const out = await app.chat.handle(TENANT, ACTOR, ADD_REQUEST);
    assert.equal(out.intent, 'build_code');
    const f = out.facts;
    assert.equal(f.deliveryStatus, 'TESTS_PASSED', JSON.stringify(f));
    assert.equal(f.managerAgentId, 'Orchestrator');
    assert.equal(f.subAgentId, 'Developer');
    assert.equal(f.model, 'qwen2.5-coder:1.5b');
    assert.equal(f.tests.total, 2); assert.equal(f.tests.passedCount, 2);
    assert.ok(!/console\.log/.test(f.code), 'prose and the second block after the first code block must be dropped');
    assert.equal(ollama.calls.length, 1);
    assert.match(ollama.calls[0].body.prompt, /add\(2, 3\) returns 5/);
    assert.equal(ollama.calls[0].body.stream, false);

    const mission = await app.missions.get(TENANT, ACTOR, f.missionId);
    assert.equal(mission.status, 'SUCCEEDED');
    const state = await app.store.read();
    const stored = state.missions.find((m) => m.id === f.missionId);
    assert.equal(stored.delivery.deliveryStatus, 'TESTS_PASSED');
    assert.equal(stored.delivery.jobId, f.jobId);
    assert.equal(stored.delivery.metrics.tokens, 100);
    assert.match(stored.delivery.code, /function add/);
    const job = state.runtimeJobs.find((j) => j.id === f.jobId);
    assert.equal(job.type, 'code.deliver');
    assert.equal(job.missionId, f.missionId);
    assert.equal(job.status, 'SUCCEEDED');

    assert.match(out.reply, new RegExp(f.missionId));
    assert.match(out.reply, /Orchestrator → subagente: Developer/);
    assert.match(out.reply, /2\/2 passaram/);
    const dev = app.agentRegistry.get('Developer');
    assert.ok(dev.tasksCompleted >= 1);
  } finally { await app.close(); ollama.server.close(); }
});

test('E2E (mocked Ollama): wrong code -> TESTS_FAILED, mission FAILED, no repair job', async () => {
  const ollama = await mockOllama(() => '```js\nmodule.exports = { add: (a, b) => a - b };\n```');
  const app = await makeApp({ FENIX_CODER_OLLAMA_URL: ollama.url });
  try {
    const out = await app.chat.handle(TENANT, ACTOR, ADD_REQUEST);
    assert.equal(out.facts.deliveryStatus, 'TESTS_FAILED');
    assert.equal(out.action.ok, false);
    const mission = await app.missions.get(TENANT, ACTOR, out.facts.missionId);
    assert.equal(mission.status, 'FAILED');
    const state = await app.store.read();
    assert.equal(state.runtimeJobs.filter((j) => j.missionId === out.facts.missionId && j.type === 'mission.repair').length, 0);
    assert.match(out.reply, /FALHOU/);
  } finally { await app.close(); ollama.server.close(); }
});

test('E2E: model unreachable -> MODEL_UNAVAILABLE reported, no code fabricated', async () => {
  const app = await makeApp({ FENIX_CODER_OLLAMA_URL: 'http://127.0.0.1:9', FENIX_CODER_TIMEOUT_MS: '2000' });
  try {
    const out = await app.chat.handle(TENANT, ACTOR, ADD_REQUEST);
    assert.equal(out.facts.deliveryStatus, 'MODEL_UNAVAILABLE');
    assert.equal(out.facts.code, null);
    assert.equal(out.facts.tests, null);
    assert.match(out.reply, /Modelo local indisponível/);
    const mission = await app.missions.get(TENANT, ACTOR, out.facts.missionId);
    assert.equal(mission.status, 'FAILED');
  } finally { await app.close(); }
});

test('E2E: a separate runtime worker claims the code.deliver job (no inline fallback)', async () => {
  const ollama = await mockOllama(() => QWEN_STYLE_OK);
  const app = await makeApp({ FENIX_CODER_OLLAMA_URL: ollama.url, FENIX_CODE_DELIVERY_INLINE: '0', FENIX_CODE_DELIVERY_WAIT_MS: '15000' });
  let stop = false;
  // Emulates fenix-runtime-worker's polling path (runtime/worker.js -> app.jobs.runBatch).
  const worker = (async () => { while (!stop) { await app.jobs.runBatch('fenix-runtime-worker-test', 1); await new Promise((r) => setTimeout(r, 100)); } })();
  try {
    const out = await app.chat.handle(TENANT, ACTOR, ADD_REQUEST);
    assert.equal(out.facts.deliveryStatus, 'TESTS_PASSED', JSON.stringify(out.facts));
    assert.equal(out.facts.workerId, 'fenix-runtime-worker-test');
  } finally { stop = true; await worker; await app.close(); ollama.server.close(); }
});

test('E2E waits for MissionKernel terminal projection after the job completes', async () => {
  const ollama = await mockOllama(() => QWEN_STYLE_OK);
  const app = await makeApp({ FENIX_CODER_OLLAMA_URL: ollama.url });
  const originalGet = app.missions.get.bind(app.missions);
  let staleReadInjected = false;
  app.missions.get = async (...args) => {
    const mission = await originalGet(...args);
    if (!staleReadInjected && mission?.status === 'SUCCEEDED') {
      staleReadInjected = true;
      return { ...mission, status: 'RUNNING' };
    }
    return mission;
  };
  try {
    const out = await app.chat.handle(TENANT, ACTOR, ADD_REQUEST);
    assert.equal(staleReadInjected, true);
    assert.equal(out.facts.missionStatus, 'SUCCEEDED', JSON.stringify(out.facts));
    assert.equal(out.facts.deliveryStatus, 'TESTS_PASSED');
  } finally { await app.close(); ollama.server.close(); }
});

// Bounded: 5 s reachability probe (unreachable => BLOCKED = test failure, non-zero exit; not a hang), 120 s model timeout,
// 180 s hard test timeout. Prints a single machine-readable [live-result] JSON line.
test('LIVE (optional): real Ollama at OLLAMA_URL', { skip: !process.env.OLLAMA_URL && 'set OLLAMA_URL to run against a real Ollama', timeout: 180_000 }, async (t) => {
  const url = String(process.env.OLLAMA_URL).replace(/\/+$/, '');
  const model = process.env.FENIX_CODER_MODEL || 'qwen2.5-coder:1.5b';
  let tags;
  try {
    const r = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(5000) });
    tags = await r.json();
  } catch (e) {
    console.log('[live-result]', JSON.stringify({ verdict: 'BLOCKED', url, reason: `unreachable: ${e.name}: ${e.message}` }));
    // BLOCKED must never read as PASS: fail the test so node:test exits 1 (verified).
    assert.fail(`BLOCKED: ${url} unreachable (${e.message})`);
  }
  if (!(tags.models || []).some((m) => m.name === model)) {
    console.log('[live-result]', JSON.stringify({ verdict: 'BLOCKED', url, reason: `model ${model} not pulled`, models: (tags.models || []).map((m) => m.name) }));
    assert.fail(`BLOCKED: model ${model} not available at ${url}`);
  }
  // LIVE_SEPARATE_WORKER=1: disable the inline fallback and let a separate runBatch loop (same path
  // as fenix-runtime-worker) claim the code.deliver job.
  const separate = process.env.LIVE_SEPARATE_WORKER === '1';
  const app = await makeApp({ FENIX_CODER_OLLAMA_URL: url, FENIX_CODER_MODEL: model, FENIX_CODER_TIMEOUT_MS: '120000', FENIX_CODE_DELIVERY_WAIT_MS: '150000', ...(separate ? { FENIX_CODE_DELIVERY_INLINE: '0' } : {}) });
  let stop = false;
  const worker = separate ? (async () => { while (!stop) { await app.jobs.runBatch('fenix-runtime-worker-live', 1); await new Promise((r) => setTimeout(r, 200)); } })() : null;
  try {
    const t0 = Date.now();
    const out = await app.chat.handle(TENANT, ACTOR, ADD_REQUEST);
    const f = out.facts || {};
    const stored = (await app.store.read()).missions.find((m) => m.id === f.missionId);
    console.log('[live-result]', JSON.stringify({ verdict: f.deliveryStatus === 'TESTS_PASSED' ? 'PASS' : 'FAIL', wallMs: Date.now() - t0, deliveryStatus: f.deliveryStatus, reason: f.reason || null, model: f.model, metrics: stored?.delivery?.metrics || null, missionStatus: (await app.missions.get(TENANT, ACTOR, f.missionId).catch(() => null))?.status || null, persisted: !!stored?.delivery, tests: f.tests, missionId: f.missionId, jobId: f.jobId, workerId: f.workerId, managerAgentId: f.managerAgentId, subAgentId: f.subAgentId, code: f.code }));
    console.log('[live]', out.reply);
    assert.notEqual(out.facts.deliveryStatus, 'MODEL_UNAVAILABLE', out.facts.reason || '');
    assert.ok(['TESTS_PASSED', 'TESTS_FAILED', 'NO_CODE_EXTRACTED'].includes(out.facts.deliveryStatus));
    assert.equal(out.facts.deliveryStatus, 'TESTS_PASSED', 'real model should solve add(a,b)');
  } finally { stop = true; if (worker) await worker; await app.close(); }
});
