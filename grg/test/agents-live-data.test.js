'use strict';
// Fase 2 (2026-11-11): agentes com dados reais. O catálogo inventava efficiency/uptime/qualidade
// (Math.random), uma missão "System Optimization" e status ONLINE com batimento "agora".
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DynamicWorkforce } = require('../src/reconstruction/dynamic-workforce');
const { computeAgentLiveStats } = require('../src/agents/agent-live-stats');

test('the agent catalogue carries no invented numbers or fake liveness', () => {
  const wf = new DynamicWorkforce();
  for (const agent of wf.getAllAgents()) {
    assert.equal(agent.metrics, null, `${agent.id} metrics must be unknown, not random`);
    assert.deepEqual(agent.missions, [], `${agent.id} has no fake mission`);
    assert.equal(agent.heartbeat, null, `${agent.id} heartbeat is not "now"`);
    assert.equal(agent.memoryCount, null);
    assert.equal(agent.status, 'REGISTERED');
  }
  assert.ok(wf.getExecutors().every((e) => e.latencyMs === null && e.status === 'UNKNOWN'));
});

const NOW = Date.parse('2026-11-11T12:00:00Z');
const roster = [
  { id: 'agent-architect', role: 'ARCHITECT', name: 'Chief Architect' },
  { id: 'agent-qa', role: 'QA', name: 'Visual QA Specialist' },
  { id: 'agent-security', role: 'SECURITY', name: 'Security & Auth Auditor' },
];
const state = {
  runtimeJobs: [
    { id: 'j1', tenantId: 'grg', type: 'inspection.run', status: 'SUCCEEDED', agent: 'Chief Architect', createdAt: '2026-11-11T10:00:00Z', completedAt: '2026-11-11T10:02:00Z' },
    { id: 'j2', tenantId: 'grg', type: 'inspection.run', status: 'RUNNING', agent: { id: 'agent-architect' }, createdAt: '2026-11-11T11:50:00Z', payload: { prompt: 'Inspecionar o AgentRegistry' } },
    { id: 'j3', tenantId: 'grg', type: 'development.execute', status: 'FAILED', agent: 'Developer Agent', createdAt: '2026-11-11T09:00:00Z', error: { message: 'tests failed' } },
    { id: 'jx', tenantId: 'other', type: 'x', status: 'RUNNING', agent: 'Chief Architect', createdAt: '2026-11-11T11:59:00Z' },
  ],
  missionSteps: [
    { id: 's1', tenantId: 'grg', missionId: 'm1', agent: 'architect', key: 'inspect', status: 'SUCCEEDED', jobId: 'j1', updatedAt: '2026-11-11T10:02:00Z' },
    { id: 's2', tenantId: 'grg', missionId: 'm2', agent: 'qa', key: 'browser-qa', status: 'PLANNED', updatedAt: '2026-11-11T11:00:00Z' },
  ],
  aiCalls: [
    { tenantId: 'grg', jobId: 'j1', provider: 'ollama', model: 'qwen2.5:3b', totalTokens: 400, createdAt: '2026-11-11T10:01:00Z' },
    { tenantId: 'grg', jobId: 'j2', provider: 'ollama', model: 'qwen2.5-coder:1.5b', promptTokens: 100, completionTokens: 50, createdAt: '2026-11-11T11:55:00Z' },
    { tenantId: 'grg', jobId: 'j3', provider: 'openai', totalTokens: 999, createdAt: '2026-11-11T09:01:00Z' },
  ],
};

test('stats come from jobs, mission steps and AI calls of that agent only', () => {
  const { agents } = computeAgentLiveStats({ roster, state, tenantId: 'grg', now: NOW });
  const arch = agents.find((a) => a.id === 'agent-architect');
  assert.equal(arch.live.status, 'EXECUTANDO');
  assert.equal(arch.live.currentTask, 'Inspecionar o AgentRegistry');
  assert.deepEqual(arch.live.jobs, { total: 2, running: 1, succeeded: 1, failed: 0 });
  assert.equal(arch.live.tokens, 550);
  assert.equal(arch.live.lastModel, 'qwen2.5-coder:1.5b');
  assert.equal(arch.live.lastProvider, 'ollama');
  assert.equal(arch.live.missions, 1);
  assert.equal(arch.live.lastActivityAt, '2026-11-11T11:55:00.000Z');
  assert.equal(arch.live.history[0].id, 'j2');
});

test('an agent with only a planned step is idle; one with nothing is honest about it', () => {
  const { agents } = computeAgentLiveStats({ roster, state, tenantId: 'grg', now: NOW });
  const qa = agents.find((a) => a.id === 'agent-qa');
  assert.equal(qa.live.status, 'OCIOSO');
  assert.equal(qa.live.tokens, 0);
  assert.equal(qa.live.lastModel, null);
  const sec = agents.find((a) => a.id === 'agent-security');
  assert.equal(sec.live.status, 'SEM_ATIVIDADE');
  assert.equal(sec.live.lastActivityAt, null);
});

test('work done by workers outside the catalogue is reported, not hidden', () => {
  const { unmatched } = computeAgentLiveStats({ roster, state, tenantId: 'grg', now: NOW });
  const dev = unmatched.find((u) => u.name === 'Developer Agent');
  assert.ok(dev, 'Developer Agent appears as an unmatched worker');
  assert.deepEqual(dev.jobs, { total: 1, running: 0, succeeded: 0, failed: 1 });
  assert.equal(dev.tokens, 999);
});