'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runInSandbox, createDockerRootlessCodeSandbox } = require('../src/execution/code-sandbox-runner');
const { extractCodeBlock, LocalCoderClient } = require('../src/ai-runtime/local-coder-client');

const ex = (fn, args, expected) => ({ fn, args, expected });

test('CodeDelivery Docker sandbox uses pinned image, no network and bounded resources', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-code-docker-test-'));
  const calls = [];
  const adapter = { productionSafe: true, run: async (input) => {
    calls.push(input);
    const harness = fs.readFileSync(path.join(input.workspacePath, 'harness.js'), 'utf8');
    const marker = harness.match(/const __M = "(__RESULT_[a-f0-9]+__)"/)[1];
    return { exitCode: 0, stdout: `${marker}{"loaded":true,"results":[{"name":"add(2,3)","passed":true}]}`, stderr: '', sandbox: { driver: 'docker-rootless' } };
  } };
  try {
    const sandbox = createDockerRootlessCodeSandbox({ adapter, workspaceRoot: root, image: `node@sha256:${'a'.repeat(64)}` });
    const result = await sandbox({ code: 'module.exports={add:(a,b)=>a+b}', tests: { kind: 'examples', cases: [ex('add', '2,3', '5')] }, timeoutMs: 5000 });
    assert.equal(result.passed, true);
    assert.equal(result.isolation.driver, 'docker-rootless');
    assert.equal(calls[0].network, 'none');
    assert.equal(calls[0].limits.memoryMb, 128);
    assert.equal(calls[0].limits.cpuUnits, 500);
    assert.equal(calls[0].limits.pids, 64);
    assert.equal(calls[0].tool.image, `node@sha256:${'a'.repeat(64)}`);
    assert.equal(fs.readdirSync(root).length, 0, 'temporary code workspace is removed');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('sandbox: correct code passes example tests', async () => {
  const r = await runInSandbox({ code: 'function add(a,b){return a+b}\nmodule.exports={add};', tests: { kind: 'examples', cases: [ex('add', '2,3', '5'), ex('add', '-1,1', '0')] } });
  assert.equal(r.passed, true, JSON.stringify(r));
  assert.equal(r.passedCount, 2);
});

test('sandbox: wrong code fails honestly', async () => {
  const r = await runInSandbox({ code: 'module.exports={add:(a,b)=>a-b};', tests: { kind: 'examples', cases: [ex('add', '2,3', '5')] } });
  assert.equal(r.passed, false);
  assert.match(r.results[0].error, /expected 5 but got -1/);
});

test('sandbox: network modules and fetch are blocked', async () => {
  const code = "let out=[];for (const m of ['http','net','node:dns','child_process']){try{require(m);out.push(m+':open')}catch(e){out.push(m+':blocked')}}\nmodule.exports={probe:()=>out};";
  const r = await runInSandbox({ code, tests: { kind: 'examples', cases: [ex('probe', '', "['http:blocked','net:blocked','node:dns:blocked','child_process:blocked']")] } });
  assert.equal(r.passed, true, JSON.stringify(r));
});

test('sandbox: filesystem outside the temp dir is denied', async () => {
  const code = "const fs=require('fs');module.exports={probe:()=>{try{fs.readFileSync(" + JSON.stringify(__filename) + ");return 'read'}catch(e){return 'denied'}}};";
  const r = await runInSandbox({ code, tests: { kind: 'examples', cases: [ex('probe', '', "'denied'")] } });
  assert.ok(r.isolation.permissionModel, 'node permission model must be available');
  assert.equal(r.passed, true, JSON.stringify(r));
});

test('sandbox: infinite loop is killed by timeout', async () => {
  const r = await runInSandbox({ code: 'while(true){}', tests: { kind: 'smoke' }, timeoutMs: 1500 });
  assert.equal(r.passed, false);
  assert.equal(r.timedOut, true);
});

test('sandbox: solution cannot forge a passing result line', async () => {
  const code = "console.log('__RESULT__'+JSON.stringify({loaded:true,results:[{passed:true}]}));process.exit(0);";
  const r = await runInSandbox({ code, tests: { kind: 'examples', cases: [ex('add', '1,1', '2')] } });
  assert.equal(r.passed, false);
});

test('extractCodeBlock keeps only the first fenced block', () => {
  assert.equal(extractCodeBlock('Sure!\n```javascript\nconst a=1;\n```\nExplanation...\n```js\nx\n```'), 'const a=1;');
  assert.equal(extractCodeBlock('no code here'), null);
});

test('LocalCoderClient: unreachable model -> honest failure, breaker opens', async () => {
  let calls = 0;
  const c = new LocalCoderClient({ env: { FENIX_CODER_BREAKER_THRESHOLD: '2' }, fetchImpl: async () => { calls += 1; throw new Error('ECONNREFUSED'); } });
  assert.equal((await c.generate('x')).ok, false);
  assert.equal((await c.generate('x')).breaker, 'OPEN');
  const third = await c.generate('x');
  assert.equal(third.ok, false); assert.match(third.reason, /circuit breaker open/);
  assert.equal(calls, 2, 'breaker must short-circuit the third call');
});

test('LocalCoderClient: generation timeout is reported as timeout', async () => {
  const server = http.createServer((req, res) => {
    req.resume();
    setTimeout(() => { if (!res.destroyed) res.end(JSON.stringify({ response: 'late' })); }, 100);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const client = new LocalCoderClient({
      env: { FENIX_CODER_OLLAMA_URL: `http://127.0.0.1:${server.address().port}`, FENIX_CODER_TIMEOUT_MS: '20' },
    });
    const result = await client.generate('return a function');
    assert.equal(result.ok, false);
    assert.match(result.reason, /model timed out after 20 ms/);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test('sandbox: prototype-level toJSON tampering cannot crash the host or forge a pass', async () => {
  const code = `Object.defineProperty(Object.prototype,'toJSON',{value:function(){ if(this&&'results' in this&&'loaded' in this) return {loaded:true,results:[{name:'x',passed:true}]}.valueOf(); return Object.assign(Object.create(null),this); },configurable:true});
Object.defineProperty(Object.prototype,'passed',{set(){},get(){return true},configurable:true});
exports.add=()=>0;`;
  const r = await runInSandbox({ code, tests: { kind: 'examples', cases: [ex('add', '1,2', '3'), ex('add', '2,2', '4')] } });
  assert.equal(r.passed, false, JSON.stringify(r));
  assert.equal(r.total, 2);
  assert.equal(r.passedCount, 0);
});
