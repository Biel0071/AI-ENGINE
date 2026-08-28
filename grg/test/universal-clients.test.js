const test = require('node:test');
const assert = require('node:assert/strict');
const { FenixHttpClient } = require('../src/clients/fenix-http-client');
const { TOOLS, handleRpc } = require('../bin/fenix-mcp');

test('HTTP client sends every IDE through the authenticated v2 contract', async () => {
  const calls = [];
  const client = new FenixHttpClient({
    baseUrl: 'https://fenix.example/', token: 'session-token',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, status: 200, text: async () => JSON.stringify({ ok: true }) };
    },
  });
  await client.submit({ prompt: 'work', source: 'windsurf' });
  await client.events('job/1');
  await client.diff('job/1');
  await client.approve('job/1');
  assert.equal(calls[0].url, 'https://fenix.example/api/v2/jobs');
  assert.equal(calls[0].options.headers.authorization, 'Bearer session-token');
  assert.equal(JSON.parse(calls[0].options.body).source, 'windsurf');
  assert.match(calls[1].url, /job%2F1\/events$/);
  assert.match(calls[2].url, /job%2F1\/diff$/);
  assert.match(calls[3].url, /job%2F1\/approve$/);
});

test('MCP exposes only adapters over the canonical FENIX client', async () => {
  const names = TOOLS.map((item) => item.name);
  for (const required of ['fenix_submit_job', 'fenix_get_job', 'fenix_get_job_events', 'fenix_get_system_status', 'fenix_cancel_job', 'fenix_approve_job', 'fenix_reject_job']) assert.ok(names.includes(required));
  const calls = [];
  const client = {
    async submit(input) { calls.push(input); return { jobId: 'j1', status: 'QUEUED' }; },
  };
  const response = await handleRpc({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'fenix_submit_job', arguments: { prompt: 'inspect', source: 'codex' } } }, client);
  assert.equal(response.id, 7);
  assert.equal(calls[0].source, 'codex');
  assert.match(response.result.content[0].text, /"jobId": "j1"/);
});
