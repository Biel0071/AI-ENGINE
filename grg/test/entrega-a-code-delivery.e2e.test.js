'use strict';
// Entrega A end-to-end: chat -> mission (MissionPlanner CODE) -> Orchestrator delegates to Developer
// -> runtime job code.deliver -> Ollama (mocked HTTP server, or real when OLLAMA_URL is set)
// -> code extraction -> sandbox tests -> persisted on mission -> chat reply.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createApp } = require('../src/app');

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

test('LIVE (optional): real Ollama at OLLAMA_URL', { skip: !process.env.OLLAMA_URL && 'set OLLAMA_URL to run against a real Ollama' }, async () => {
  const app = await makeApp({ FENIX_CODER_OLLAMA_URL: process.env.OLLAMA_URL, FENIX_CODER_MODEL: process.env.FENIX_CODER_MODEL || 'qwen2.5-coder:1.5b', FENIX_CODER_TIMEOUT_MS: '120000', FENIX_CODE_DELIVERY_WAIT_MS: '150000' });
  try {
    const out = await app.chat.handle(TENANT, ACTOR, ADD_REQUEST);
    console.log('[live]', out.reply);
    assert.notEqual(out.facts.deliveryStatus, 'MODEL_UNAVAILABLE', out.facts.reason || '');
    assert.ok(['TESTS_PASSED', 'TESTS_FAILED', 'NO_CODE_EXTRACTED'].includes(out.facts.deliveryStatus));
    assert.equal(out.facts.deliveryStatus, 'TESTS_PASSED', 'real model should solve add(a,b)');
  } finally { await app.close(); }
});
