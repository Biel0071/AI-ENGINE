'use strict';
// LEVEL 2 (2026-11-11): indicadores de convergência com números REAIS, derivados do estado.
// Inteligência = conhecimento compartilhado pelas ferramentas; Colaboração = trabalho que cruzou
// ferramentas; Evolução = workers ativos, código gerado pela VPS, missões concluídas e custo.
// Sem dado, zero — nunca metas ("100%", "24/7") apresentadas como medição.

const CODE_JOBS = new Set(['development.execute', 'factory.generate', 'agent.workspace.execute', 'agent.execute']);
const WORKER_ACTIVE_MS = 3 * 60 * 1000;
const tagValue = (tags, prefix) => (tags || []).find((t) => t.startsWith(prefix))?.slice(prefix.length) || null;
const round = (n) => Math.round(n * 1e6) / 1e6;

function computeConvergence({ state = {}, tenantId, now = Date.now() }) {
  const mine = (list) => (Array.isArray(list) ? list : []).filter((item) => item && item.tenantId === tenantId);

  const knowledge = mine(state.memories).filter((m) => m.status === 'ACTIVE' && (m.tags || []).includes('hub'));
  const byProvider = {};
  for (const m of knowledge) {
    const p = (tagValue(m.tags, 'provider:') || 'unknown').toUpperCase();
    byProvider[p] = (byProvider[p] || 0) + 1;
  }
  const validated = knowledge.filter((m) => tagValue(m.tags, 'validation:') === 'evidence').length;
  const unvalidatedSuggestions = knowledge.filter((m) => tagValue(m.tags, 'validation:') === 'unvalidated').length;

  const messages = mine(state.hubMessages);
  const threads = new Map();
  for (const msg of messages) {
    const key = msg.correlation_id || msg.message_id;
    if (!threads.has(key)) threads.set(key, new Set());
    threads.get(key).add(msg.sender?.provider || 'unknown');
  }
  const crossToolThreads = [...threads.values()].filter((providers) => providers.size > 1).length;
  const ideas = messages.filter((m) => ['IDEA', 'CODE_PROPOSAL'].includes(m.message_type)).length;
  const missions = mine(state.missions);
  const directorMissions = missions.filter((m) => m.requestedBy === 'fenix-director');

  const jobsById = new Map(mine(state.runtimeJobs).map((j) => [j.id, j]));
  const calls = mine(state.aiCalls);
  const vpsCodeTokens = calls.filter((c) => c.provider === 'aiplatform' && c.jobId && CODE_JOBS.has(jobsById.get(c.jobId)?.type))
    .reduce((sum, c) => sum + (Number(c.totalTokens) || 0), 0);
  const byMission = new Map();
  for (const call of calls) {
    if (!call.missionId) continue;
    const entry = byMission.get(call.missionId) || { missionId: call.missionId, costUsd: 0, tokens: 0 };
    entry.costUsd += Number(call.costUsd) || 0;
    entry.tokens += Number(call.totalTokens) || 0;
    byMission.set(call.missionId, entry);
  }
  const costByMission = [...byMission.values()].map((e) => ({ ...e, costUsd: round(e.costUsd) })).sort((a, b) => b.costUsd - a.costUsd).slice(0, 10);
  // Heartbeats de worker são globais (sem tenantId).
  const workersActive = (state.workerHeartbeats || []).filter((w) => (!w.tenantId || w.tenantId === tenantId)
    && now - Date.parse(w.lastSeenAt || 0) <= WORKER_ACTIVE_MS).length;

  return {
    generatedAt: new Date(now).toISOString(),
    intelligence: {
      knowledge: knowledge.length, byProvider, validated, unvalidatedSuggestions,
      claudeContributions: byProvider.CLAUDE_CODE || 0,
      source: 'memórias do hub (MemoryEngine, tag hub)',
    },
    collaboration: {
      messages: messages.length, crossToolThreads, proposals: ideas + unvalidatedSuggestions,
      directorMissions: directorMissions.length,
      source: 'mensagens do hub (fio = correlation_id) e missões pedidas pelo fenix-director',
    },
    evolution: {
      workersActive, vpsCodeTokens,
      missionsSucceeded: missions.filter((m) => m.status === 'SUCCEEDED').length,
      costUsd: round(calls.reduce((sum, c) => sum + (Number(c.costUsd) || 0), 0)),
      costByMission,
      source: 'heartbeats de worker (≤ 3 min), aiCalls do provedor aiplatform em jobs de código, missões',
    },
  };
}

module.exports = { computeConvergence };