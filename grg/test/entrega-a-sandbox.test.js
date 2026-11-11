'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { runInSandbox } = require('../src/execution/code-sandbox-runner');
const { extractCodeBlock, LocalCoderClient } = require('../src/ai-runtime/local-coder-client');

const ex = (fn, args, expected) => ({ fn, args, expected });

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
