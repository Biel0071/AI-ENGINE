'use strict';
// FÊNIX Universal Hub — comportamento HTTP real com três ferramentas conectadas ao mesmo FÊNIX.
// Cobre os 10 passos pedidos pelo dono (2026-11-11) + segurança (escopo, revogação, travas).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { start } = require('../src/server');
const { loadSecurityConfig } = require('../src/security/config');

const ADMIN = { tenantId: 'grg', userId: 'grg-admin', password: crypto.randomBytes(24).toString('base64url') };
let server; let base; let dataFile; let adminToken;
const tokens = {};

async function boot() {
  const securityConfig = loadSecurityConfig({ FENIX_ENV: 'test' });
  server = await start(0, {
    dataFile, llm: false, securityConfig, operationalActivation: false, autonomousEvolution: false, worldSimulation: false,
    bootstrapAdmin: { ...ADMIN, tenantName: 'GRG Hub Test', name: 'Hub Admin', role: 'master_admin' },
  });
  base = `http://127.0.0.1:${server.address().port}`;
  const r = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...ADMIN, rememberMe: false }) });
  adminToken = (await r.json()).token;
}
async function call(token, method, p, body) {
  const r = await fetch(`${base}${p}`, { method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

before(async () => {
  dataFile = path.join(os.tmpdir(), `grg-hub-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.json`);
  const { globalRealityOperatorKernel } = require('../src/reality-operator/reality-operator-kernel');
  const { DevelopmentMemory } = require('../src/memory/development-memory');
  globalRealityOperatorKernel.memoryEngine = new DevelopmentMemory({ memoryDir: fs.mkdtempSync(path.join(os.tmpdir(), 'grg-hub-devmem-')) });
  await boot();
  for (const provider of ['CLAUDE_CODE', 'OPENAI_CODEX', 'ANTIGRAVITY']) {
    const res = await call(adminToken, 'POST', '/api/v2/hub/clients', { provider, label: provider.toLowerCase() });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.match(res.body.token, /^fxc_/);
    assert.equal(res.body.client.tokenHash, undefined, 'token hash never leaves the server');
    tokens[provider] = res.body.token;
  }
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  try { fs.unlinkSync(dataFile); } catch {}
});

test('each tool has its own identity, distinct from the human owner', async () => {
  const me = await call(tokens.CLAUDE_CODE, 'GET', '/api/v2/hub/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.identity.provider, 'CLAUDE_CODE');
  assert.equal(me.body.ownerUserId, 'grg-admin');
  const human = await call(adminToken, 'GET', '/api/v2/hub/me');
  assert.equal(human.body.identity.provider, 'USER_MANUAL');
});

test('Claude queries, Codex records a discovery, Antigravity retrieves it with authorship', async () => {
  const empty = await call(tokens.CLAUDE_CODE, 'GET', '/api/v2/hub/knowledge?q=AgentRegistry');
  assert.equal(empty.status, 200);
  assert.equal(empty.body.items.length, 0);
  const rec = await call(tokens.OPENAI_CODEX, 'POST', '/api/v2/hub/knowledge', {
    class: 'technical_discovery', projectId: 'fenix-os', title: 'AgentRegistry não atualiza status',
    content: 'O AgentRegistry mantém status antigo depois que o job termina.', files: ['src/agents/agent-registry.js'], evidence: ['test/agent-registry.test.js'],
  });
  assert.equal(rec.status, 201, JSON.stringify(rec.body));
  const found = await call(tokens.ANTIGRAVITY, 'GET', '/api/v2/hub/knowledge?q=AgentRegistry&projectId=fenix-os');
  assert.equal(found.status, 200);
  assert.equal(found.body.items.length, 1);
  assert.equal(found.body.items[0].provider, 'OPENAI_CODEX');
  assert.equal(found.body.items[0].class, 'technical_discovery');
  assert.match(found.body.items[0].author, /^OPENAI_CODEX:aic_/);
});

test('task request flows from Claude to Codex and the result comes back on the same thread', async () => {
  const req = await call(tokens.CLAUDE_CODE, 'POST', '/api/v2/hub/messages', {
    receiver: 'OPENAI_CODEX', project_id: 'fenix-os', message_type: 'TASK_REQUEST',
    requested_action: 'Corrigir atualização de status no AgentRegistry', payload: { files: ['src/agents/agent-registry.js'] },
  });
  assert.equal(req.status, 201, JSON.stringify(req.body));
  const thread = req.body.message.correlation_id;
  const inbox = await call(tokens.OPENAI_CODEX, 'GET', '/api/v2/hub/messages?projectId=fenix-os&type=TASK_REQUEST');
  assert.ok(inbox.body.messages.some((m) => m.message_id === req.body.message.message_id), 'Codex receives the task');
  const antigravityInbox = await call(tokens.ANTIGRAVITY, 'GET', '/api/v2/hub/messages?type=TASK_REQUEST');
  assert.equal(antigravityInbox.body.messages.length, 0, 'a message to Codex is not delivered to Antigravity');
  const reply = await call(tokens.OPENAI_CODEX, 'POST', '/api/v2/hub/messages', {
    receiver: 'CLAUDE_CODE', project_id: 'fenix-os', message_type: 'TEST_RESULT', correlation_id: thread, payload: { passed: 12, failed: 0 },
  });
  assert.equal(reply.status, 201);
  const conversation = await call(tokens.CLAUDE_CODE, 'GET', `/api/v2/hub/messages?correlationId=${thread}`);
  assert.deepEqual(conversation.body.messages.map((m) => m.message_type), ['TASK_REQUEST', 'TEST_RESULT']);
  assert.equal(conversation.body.messages[1].sender.provider, 'OPENAI_CODEX');
});

test('compact context shows discoveries, evidence, inbox and presence', async () => {
  await call(tokens.OPENAI_CODEX, 'POST', '/api/v2/hub/knowledge', { class: 'execution_evidence', projectId: 'fenix-os', content: '12 testes passaram depois da correção.' });
  const ctx = await call(tokens.CLAUDE_CODE, 'GET', '/api/v2/hub/context?projectId=fenix-os');
  assert.equal(ctx.status, 200);
  assert.ok(ctx.body.context.discoveries.length >= 1);
  assert.ok(ctx.body.context.recentEvidence.length >= 1);
  assert.ok(ctx.body.context.inbox.some((m) => m.type === 'TEST_RESULT'));
  assert.ok(ctx.body.context.presence.some((c) => c.provider === 'OPENAI_CODEX'));
  assert.ok(JSON.stringify(ctx.body.context).length < 8000, 'compact context stays small');
});

test('file locks stop two tools from editing the same file silently', async () => {
  const a = await call(tokens.CLAUDE_CODE, 'POST', '/api/v2/hub/locks', { projectId: 'fenix-os', path: 'src/agents/agent-registry.js', reason: 'refatoração' });
  assert.equal(a.status, 201);
  const b = await call(tokens.OPENAI_CODEX, 'POST', '/api/v2/hub/locks', { projectId: 'fenix-os', path: 'src/agents/agent-registry.js' });
  assert.equal(b.status, 409);
  assert.equal(b.body.holder.provider, 'CLAUDE_CODE');
  const rel = await call(tokens.CLAUDE_CODE, 'DELETE', '/api/v2/hub/locks', { projectId: 'fenix-os', path: 'src/agents/agent-registry.js' });
  assert.equal(rel.body.released, true);
  const c = await call(tokens.OPENAI_CODEX, 'POST', '/api/v2/hub/locks', { projectId: 'fenix-os', path: 'src/agents/agent-registry.js' });
  assert.equal(c.status, 201);
});

test('AI tools cannot approve, administer or reach routes outside the hub', async () => {
  assert.equal((await call(tokens.CLAUDE_CODE, 'POST', '/api/v2/hub/clients', { provider: 'OTHER_LLM' })).status, 403);
  assert.equal((await call(tokens.CLAUDE_CODE, 'POST', '/api/v2/jobs/any-job/approve', {})).status, 403);
  assert.equal((await call(tokens.CLAUDE_CODE, 'POST', '/api/v2/jobs', { prompt: 'x' })).status, 403, 'no jobs:submit scope by default');
  assert.equal((await call(tokens.CLAUDE_CODE, 'GET', '/api/v2/admin/users')).status, 403);
  assert.equal((await call('fxc_token_que_nao_existe', 'GET', '/api/v2/hub/me')).status, 401);
});

test('duplicate messages are merged and unknown types rejected', async () => {
  const body = { receiver: 'FENIX', message_type: 'IDEA', payload: { text: 'Cidade com dia e noite' } };
  const first = await call(tokens.ANTIGRAVITY, 'POST', '/api/v2/hub/messages', body);
  const second = await call(tokens.ANTIGRAVITY, 'POST', '/api/v2/hub/messages', body);
  assert.equal(second.body.message.message_id, first.body.message.message_id);
  assert.equal(second.body.message.duplicate, true);
  assert.equal((await call(tokens.ANTIGRAVITY, 'POST', '/api/v2/hub/messages', { message_type: 'GOSSIP' })).status, 400);
});

test('the owner sees every tool and every message', async () => {
  const clients = await call(adminToken, 'GET', '/api/v2/hub/clients');
  assert.deepEqual(clients.body.clients.map((c) => c.provider).sort(), ['ANTIGRAVITY', 'CLAUDE_CODE', 'OPENAI_CODEX']);
  const all = await call(adminToken, 'GET', '/api/v2/hub/messages');
  assert.ok(all.body.messages.length >= 3);
});

test('knowledge about a project that is only in the disk registry is kept and found by project', async () => {
  const rec = await call(tokens.OPENAI_CODEX, 'POST', '/api/v2/hub/knowledge', { class: 'technical_discovery', projectId: 'local-somente-registro', content: 'Descoberta num projeto descoberto no disco, ainda não cadastrado.' });
  assert.equal(rec.status, 201, JSON.stringify(rec.body));
  assert.equal(rec.body.knowledge.projectId, 'local-somente-registro');
  const found = await call(tokens.ANTIGRAVITY, 'GET', '/api/v2/hub/knowledge?q=descoberta&projectId=local-somente-registro');
  assert.equal(found.body.items.length, 1);
  const listed = await call(tokens.ANTIGRAVITY, 'GET', '/api/v2/hub/knowledge?projectId=local-somente-registro');
  assert.equal(listed.body.items.length, 1);
});

test('everything survives a server restart; a revoked tool loses access', async () => {
  await new Promise((resolve) => server.close(resolve));
  await boot();
  const found = await call(tokens.ANTIGRAVITY, 'GET', '/api/v2/hub/knowledge?q=AgentRegistry');
  assert.equal(found.status, 200);
  assert.equal(found.body.items.length, 1, 'knowledge persisted');
  const thread = await call(tokens.CLAUDE_CODE, 'GET', '/api/v2/hub/messages?type=TEST_RESULT');
  assert.equal(thread.body.messages.length, 1, 'messages persisted');
  const list = await call(adminToken, 'GET', '/api/v2/hub/clients');
  const codex = list.body.clients.find((c) => c.provider === 'OPENAI_CODEX');
  assert.equal((await call(adminToken, 'POST', `/api/v2/hub/clients/${codex.id}/revoke`, {})).status, 200);
  assert.equal((await call(tokens.OPENAI_CODEX, 'GET', '/api/v2/hub/me')).status, 401);
});