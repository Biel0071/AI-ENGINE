'use strict';
// Tokens por job: a chamada de IA feita dentro de um job fica registrada com o jobId,
// e a rota /api/v2/jobs/:id/usage soma so as chamadas daquele job.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const { handleUniversalJobRoutes } = require('../src/api/universal-job-routes');

async function callUsage(app, jobId) {
  let captured = null;
  const res = {};
  const sendJson = (_res, status, body) => { captured = { status, body }; };
  const url = new URL(`http://x/api/v2/jobs/${jobId}/usage`);
  const handled = await handleUniversalJobRoutes({ method: 'GET' }, res, url, app, sendJson, async () => ({}), { tenantId: 'usage-test', actorId: 'operator' });
  assert.equal(handled, true);
  return captured;
}

test('AI calls made inside a job are recorded with its jobId and summed per job', async () => {
  const app = await createApp({
    dataFile: null,
    providers: { fake: { complete: async () => ({ text: 'ok', model: 'fake-model', promptTokens: 12, completionTokens: 8 }) } },
    routes: { default: { provider: 'fake', model: 'fake-model', maxOutputTokens: 50 } },
  });
  try {
    await app.controlPlane.createTenant({ id: 'usage-test', name: 'Usage Test' }, 'operator');
    app.jobs.register('test.ai-call', async (payload, context) => {
      const first = await app.aiGateway.invoke(context.tenantId, context.actorId, { prompt: `primeira ${payload.n}` });
      const second = await app.aiGateway.invoke(context.tenantId, context.actorId, { prompt: `segunda ${payload.n}` });
      return { first: first.text, second: second.text };
    });
    const jobA = await app.jobs.submit('usage-test', 'operator', { type: 'test.ai-call', source: 'api', payload: { n: 1 } });
    const jobB = await app.jobs.submit('usage-test', 'operator', { type: 'test.ai-call', source: 'api', payload: { n: 2 } });
    const done = await app.jobs.runBatch('usage-worker', 2);
    assert.ok(done.every((job) => job.status === 'SUCCEEDED'));

    // Uma chamada fora de job nao pode ser atribuida a nenhum job.
    await app.aiGateway.invoke('usage-test', 'operator', { prompt: 'fora de job' });

    const state = await app.store.read();
    const calls = state.aiCalls.filter((call) => call.tenantId === 'usage-test');
    assert.equal(calls.length, 5);
    assert.equal(calls.filter((call) => call.jobId === jobA.id).length, 2);
    assert.equal(calls.filter((call) => call.jobId === jobB.id).length, 2);
    assert.equal(calls.filter((call) => call.jobId === null).length, 1);

    const usageA = await callUsage(app, jobA.id);
    assert.equal(usageA.status, 200);
    assert.equal(usageA.body.tracked, true);
    assert.equal(usageA.body.calls, 2);
    assert.equal(usageA.body.totalTokens, calls.filter((call) => call.jobId === jobA.id).reduce((t, c) => t + c.totalTokens, 0));

    const unknown = await callUsage(app, 'job-que-nao-existe');
    assert.equal(unknown.body.tracked, false);
    assert.equal(unknown.body.totalTokens, 0);
  } finally {
    await app.close();
  }
});