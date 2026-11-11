'use strict';
// LEVEL 2 (2026-11-11): indicadores de convergência com números REAIS (nada de "100%" ou "24/7").
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeConvergence } = require('../src/hub/convergence');

const NOW = Date.parse('2026-11-11T12:00:00Z');
const mem = (provider, cls, extra = {}) => ({ tenantId: 'grg', status: 'ACTIVE', tags: ['hub', `class:${cls}`, `provider:${provider.toLowerCase()}`, `validation:${cls === 'unvalidated_suggestion' ? 'unvalidated' : cls === 'execution_evidence' ? 'evidence' : 'reported'}`], createdAt: '2026-11-11T10:00:00Z', ...extra });
const state = {
  memories: [
    mem('CLAUDE_CODE', 'technical_discovery'), mem('OPENAI_CODEX', 'technical_discovery'), mem('OPENAI_CODEX', 'execution_evidence'),
    mem('ANTIGRAVITY', 'unvalidated_suggestion'), { tenantId: 'grg', status: 'ACTIVE', tags: ['other'] },
    { ...mem('CLAUDE_CODE', 'technical_discovery'), tenantId: 'outro' },
  ],
  hubMessages: [
    { tenantId: 'grg', message_id: 'a', correlation_id: 'a', message_type: 'TASK_REQUEST', sender: { provider: 'CLAUDE_CODE' }, timestamp: '2026-11-11T10:00:00Z' },
    { tenantId: 'grg', message_id: 'b', correlation_id: 'a', message_type: 'TEST_RESULT', sender: { provider: 'OPENAI_CODEX' }, timestamp: '2026-11-11T10:05:00Z' },
    { tenantId: 'grg', message_id: 'c', correlation_id: 'c', message_type: 'IDEA', sender: { provider: 'ANTIGRAVITY' }, timestamp: '2026-11-11T10:06:00Z' },
  ],
  missions: [
    { id: 'm1', tenantId: 'grg', requestedBy: 'fenix-director', status: 'SUCCEEDED' },
    { id: 'm2', tenantId: 'grg', requestedBy: 'fenix-director', status: 'CANCELLED' },
    { id: 'm3', tenantId: 'grg', requestedBy: 'grg-admin', status: 'RUNNING' },
  ],
  runtimeJobs: [
    { id: 'j1', tenantId: 'grg', type: 'development.execute', missionId: 'm1' },
    { id: 'j2', tenantId: 'grg', type: 'inspection.run', missionId: 'm1' },
  ],
  aiCalls: [
    { tenantId: 'grg', jobId: 'j1', missionId: 'm1', provider: 'aiplatform', totalTokens: 1200, costUsd: 0.002, createdAt: '2026-11-11T10:00:00Z' },
    { tenantId: 'grg', jobId: 'j2', missionId: 'm1', provider: 'aiplatform', totalTokens: 300, costUsd: 0.001, createdAt: '2026-11-11T10:00:00Z' },
    { tenantId: 'grg', jobId: null, provider: 'ollama', totalTokens: 50, createdAt: '2026-11-11T10:00:00Z' },
  ],
  workerHeartbeats: [
    { tenantId: 'grg', workerId: 'w1', lastSeenAt: '2026-11-11T11:59:00Z' },
    { tenantId: 'grg', workerId: 'w2', lastSeenAt: '2026-11-10T11:00:00Z' },
  ],
};

test('intelligence counts knowledge by tool and how much is validated', () => {
  const c = computeConvergence({ state, tenantId: 'grg', now: NOW });
  assert.equal(c.intelligence.knowledge, 4);
  assert.deepEqual(c.intelligence.byProvider, { CLAUDE_CODE: 1, OPENAI_CODEX: 2, ANTIGRAVITY: 1 });
  assert.equal(c.intelligence.validated, 1);
  assert.equal(c.intelligence.unvalidatedSuggestions, 1);
  assert.equal(c.intelligence.claudeContributions, 1);
});

test('collaboration counts threads that crossed tools and proposals', () => {
  const c = computeConvergence({ state, tenantId: 'grg', now: NOW });
  assert.equal(c.collaboration.crossToolThreads, 1);
  assert.equal(c.collaboration.messages, 3);
  assert.equal(c.collaboration.proposals, 2); // 1 IDEA + 1 sugestão não validada
  assert.equal(c.collaboration.directorMissions, 2);
});

test('evolution reports real workers, VPS code tokens and cost per mission', () => {
  const c = computeConvergence({ state, tenantId: 'grg', now: NOW });
  assert.equal(c.evolution.workersActive, 1);
  assert.equal(c.evolution.vpsCodeTokens, 1200);
  assert.equal(c.evolution.missionsSucceeded, 1);
  assert.equal(c.evolution.costUsd, 0.003);
  assert.deepEqual(c.evolution.costByMission[0], { missionId: 'm1', costUsd: 0.003, tokens: 1500 });
});

test('an empty system reports zeros, not targets', () => {
  const c = computeConvergence({ state: {}, tenantId: 'grg', now: NOW });
  assert.equal(c.intelligence.knowledge, 0);
  assert.equal(c.evolution.workersActive, 0);
  assert.equal(c.collaboration.crossToolThreads, 0);
});