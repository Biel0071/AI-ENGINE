'use strict';
// Ferramentas MCP do FÊNIX Universal Hub (2026-11-11): qualquer IDE com MCP (Claude Code, Codex,
// Antigravity...) usa o mesmo FÊNIX com o próprio token fxc_.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { TOOLS, handleRpc } = require('../bin/fenix-mcp');
const { FenixHttpClient } = require('../src/clients/fenix-http-client');

function recordingClient() {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url: url.replace('http://fenix.test', ''), method: opts.method, body: opts.body ? JSON.parse(opts.body) : undefined, auth: opts.headers.authorization });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  return { calls, client: new FenixHttpClient({ baseUrl: 'http://fenix.test', token: 'fxc_test', fetchImpl }) };
}
const call = (client, name, args) => handleRpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, client);

test('hub tools are listed', () => {
  const names = TOOLS.map((t) => t.name);
  for (const name of ['fenix_hub_whoami', 'fenix_hub_context', 'fenix_knowledge_search', 'fenix_knowledge_record', 'fenix_message_send', 'fenix_messages', 'fenix_lock_file', 'fenix_unlock_file', 'fenix_hub_clients']) {
    assert.ok(names.includes(name), name);
  }
});

test('hub tools call the real hub routes with the tool token', async () => {
  const { calls, client } = recordingClient();
  await call(client, 'fenix_hub_context', { projectId: 'fenix-os' });
  await call(client, 'fenix_knowledge_search', { q: 'AgentRegistry', projectId: 'fenix-os', class: 'technical_discovery' });
  await call(client, 'fenix_knowledge_record', { class: 'technical_discovery', content: 'achado', projectId: 'fenix-os', files: 'a.js, b.js' });
  await call(client, 'fenix_message_send', { receiver: 'OPENAI_CODEX', message_type: 'TASK_REQUEST', project_id: 'fenix-os', payload: '{"files":["a.js"]}' });
  await call(client, 'fenix_messages', { correlationId: 'c1' });
  await call(client, 'fenix_lock_file', { projectId: 'fenix-os', path: 'a.js' });
  await call(client, 'fenix_unlock_file', { projectId: 'fenix-os', path: 'a.js' });
  assert.deepEqual(calls.map((c) => `${c.method} ${c.url}`), [
    'GET /api/v2/hub/context?projectId=fenix-os&depth=compact',
    'GET /api/v2/hub/knowledge?q=AgentRegistry&projectId=fenix-os&class=technical_discovery',
    'POST /api/v2/hub/knowledge',
    'POST /api/v2/hub/messages',
    'GET /api/v2/hub/messages?correlationId=c1',
    'POST /api/v2/hub/locks',
    'DELETE /api/v2/hub/locks',
  ]);
  assert.deepEqual(calls[2].body.files, ['a.js', 'b.js']);
  assert.deepEqual(calls[3].body.payload, { files: ['a.js'] });
  assert.ok(calls.every((c) => c.auth === 'Bearer fxc_test'));
});

test('an invalid JSON payload is reported, not sent', async () => {
  const { calls, client } = recordingClient();
  const res = await call(client, 'fenix_message_send', { receiver: 'FENIX', message_type: 'IDEA', payload: '{quebrado' });
  assert.equal(res.result.isError, true);
  assert.equal(calls.length, 0);
});