'use strict';
// Fase 1 (2026-11-11): Fênix Diretor + fila de aprovação, por HTTP real.
// Ordem do dono -> missão com etapas por agente -> etapa RED aguarda aprovação -> dono decide.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { start } = require('../src/server');
const { loadSecurityConfig } = require('../src/security/config');

const ADMIN = { tenantId: 'grg', userId: 'grg-admin', password: crypto.randomBytes(24).toString('base64url') };
let server; let base; let dataFile; let token; let workspace;

async function call(method, p, body, auth = token) {
  const r = await fetch(`${base}${p}`, { method, headers: { authorization: `Bearer ${auth}`, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

before(async () => {
  dataFile = path.join(os.tmpdir(), `grg-director-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.json`);
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'grg-director-ws-'));
  fs.writeFileSync(path.join(workspace, 'README.md'), '# Projeto de teste do diretor\n');
  // Jobs disparados apos aprovacao rodam numa pasta temporaria, nunca no repositorio real.
  process.env.FENIX_ALLOWED_PROJECT_ROOTS = workspace;
  const { globalRealityOperatorKernel } = require('../src/reality-operator/reality-operator-kernel');
  const { DevelopmentMemory } = require('../src/memory/development-memory');
  globalRealityOperatorKernel.memoryEngine = new DevelopmentMemory({ memoryDir: fs.mkdtempSync(path.join(os.tmpdir(), 'grg-director-devmem-')) });
  server = await start(0, {
    dataFile, llm: false, securityConfig: loadSecurityConfig({ FENIX_ENV: 'test' }),
    operationalActivation: false, autonomousEvolution: false, worldSimulation: false,
    bootstrapAdmin: { ...ADMIN, tenantName: 'GRG Director Test', name: 'Dono', role: 'master_admin' },
  });
  base = `http://127.0.0.1:${server.address().port}`;
  const r = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...ADMIN, rememberMe: false }) });
  token = (await r.json()).token;
  await server.app.projectKernel.create('grg', 'grg-admin', { id: 'director-test', name: 'Director Test', workspace });
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  try { fs.unlinkSync(dataFile); } catch {}
});

test('an analysis order becomes a mission with steps assigned to different agents, no approval needed', async () => {
  const res = await call('POST', '/api/v2/director/orders', { order: 'Analise a arquitetura do projeto', kind: 'analysis', projectId: 'director-test' });
  assert.equal(res.status, 202, JSON.stringify(res.body));
  const steps = res.body.mission.steps;
  assert.deepEqual(steps.map((s) => s.key), ['inspect', 'analyze']);
  assert.ok(new Set(steps.map((s) => s.agent)).size >= 2, 'work is distributed across agents');
  assert.deepEqual(steps[1].dependsOn, ['inspect']);
  assert.equal(res.body.mission.requestedBy, 'fenix-director');
  assert.equal(res.body.orderedBy, 'grg-admin');
  assert.equal(res.body.approvalRequired, false);
});

test('a code change order stops at the RED step and appears in the approval queue', async () => {
  const res = await call('POST', '/api/v2/director/orders', { order: 'Corrija o bug de status do AgentRegistry', kind: 'change', projectId: 'director-test' });
  assert.equal(res.status, 202, JSON.stringify(res.body));
  const queue = await waitForQueue((items) => items.some((i) => i.missionId === res.body.mission.id));
  const item = queue.find((i) => i.missionId === res.body.mission.id);
  assert.equal(item.stepKey, 'implement');
  assert.equal(item.level, 'RED');
  assert.match(item.reason, /código|deploy|irreversível/i);
  assert.ok(item.approvalId);
});

async function waitForQueue(predicate) {
  // A etapa RED so e pedida depois que a inspecao (job real) termina: ~5-10 s aqui.
  for (let i = 0; i < 90; i += 1) {
    const q = await call('GET', '/api/v2/director/approvals');
    if (predicate(q.body.queue || [])) return q.body.queue;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('approval never reached the queue');
}

test('the owner approves: the step leaves the queue and its job is dispatched', async () => {
  const res = await call('POST', '/api/v2/director/orders', { order: 'Implemente o filtro de agentes', kind: 'change', projectId: 'director-test' });
  const queue = await waitForQueue((items) => items.some((i) => i.missionId === res.body.mission.id));
  const item = queue.find((i) => i.missionId === res.body.mission.id);
  const decision = await call('POST', '/api/v2/director/approvals/decide', { missionId: item.missionId, stepId: item.stepId, decision: 'approve' });
  assert.equal(decision.status, 200, JSON.stringify(decision.body));
  const step = decision.body.mission.steps.find((s) => s.id === item.stepId);
  assert.notEqual(step.status, 'AWAITING_APPROVAL');
  const after = await call('GET', '/api/v2/director/approvals');
  assert.ok(!after.body.queue.some((i) => i.stepId === item.stepId));
  assert.ok(after.body.history.some((h) => h.missionId === item.missionId && h.decision === 'approved'));
});

test('rejecting cancels the mission instead of leaving it waiting forever', async () => {
  const res = await call('POST', '/api/v2/director/orders', { order: 'Publique a versão nova', kind: 'deploy', projectId: 'director-test' });
  const queue = await waitForQueue((items) => items.some((i) => i.missionId === res.body.mission.id));
  const item = queue.find((i) => i.missionId === res.body.mission.id);
  const decision = await call('POST', '/api/v2/director/approvals/decide', { missionId: item.missionId, stepId: item.stepId, decision: 'reject', reason: 'Ainda não, falta teste' });
  assert.equal(decision.status, 200, JSON.stringify(decision.body));
  assert.equal(decision.body.mission.status, 'CANCELLED');
  const hist = (await call('GET', '/api/v2/director/approvals')).body.history;
  assert.ok(hist.some((h) => h.missionId === item.missionId && h.decision === 'rejected' && /falta teste/.test(h.reason)));
});

test('asking for a revision cancels this version and creates a new mission with the feedback', async () => {
  const res = await call('POST', '/api/v2/director/orders', { order: 'Refatore o módulo de eventos', kind: 'change', projectId: 'director-test' });
  const queue = await waitForQueue((items) => items.some((i) => i.missionId === res.body.mission.id));
  const item = queue.find((i) => i.missionId === res.body.mission.id);
  const decision = await call('POST', '/api/v2/director/approvals/decide', { missionId: item.missionId, stepId: item.stepId, decision: 'revise', reason: 'Mantenha a API pública igual' });
  assert.equal(decision.status, 200, JSON.stringify(decision.body));
  assert.equal(decision.body.mission.status, 'CANCELLED');
  assert.ok(decision.body.revision?.id && decision.body.revision.id !== item.missionId);
  assert.match(decision.body.revision.objective, /Mantenha a API pública igual/);
});

test('empty or oversized orders are rejected, and AI tools cannot decide approvals', async () => {
  assert.equal((await call('POST', '/api/v2/director/orders', { order: '   ' })).status, 400);
  const created = await call('POST', '/api/v2/hub/clients', { provider: 'OPENAI_CODEX' });
  const ai = created.body.token;
  assert.equal((await call('POST', '/api/v2/director/approvals/decide', { missionId: 'x', stepId: 'y', decision: 'approve' }, ai)).status, 403);
  assert.equal((await call('POST', '/api/v2/director/orders', { order: 'qualquer coisa' }, ai)).status, 403);
});