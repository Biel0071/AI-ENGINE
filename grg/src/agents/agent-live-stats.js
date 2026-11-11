'use strict';
// Fase 2 (2026-11-11): estatísticas REAIS por agente, derivadas do runtime — jobs, etapas de
// missão e chamadas de IA (aiCalls.jobId). Nada é estimado: sem atividade, o agente diz isso.

const ACTIVE = new Set(['RUNNING', 'DISPATCHED', 'STARTING']);
const FAILED = new Set(['FAILED', 'DEAD_LETTER']);

function jobAgentKeys(job) {
  const a = job && job.agent;
  if (!a) return [];
  if (typeof a === 'string') return [a];
  return [a.id, a.name].filter(Boolean);
}

function taskText(job) {
  const p = job && job.payload;
  const raw = (p && (p.prompt || p.objective || p.title)) || job.title || job.type || '';
  return String(raw).replace(/\s+/g, ' ').trim().slice(0, 160) || null;
}

function summarize(jobs, steps, callsByJob) {
  const calls = jobs.flatMap((j) => callsByJob.get(j.id) || []);
  const tokens = calls.reduce((sum, c) => sum + (Number(c.totalTokens) || (Number(c.promptTokens) || 0) + (Number(c.completionTokens) || 0)), 0);
  const lastCall = calls.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] || null;
  const running = jobs.filter((j) => ACTIVE.has(j.status));
  const times = [...jobs.map((j) => j.completedAt || j.startedAt || j.createdAt), ...steps.map((s) => s.updatedAt), ...calls.map((c) => c.createdAt)]
    .map((t) => Date.parse(t)).filter(Number.isFinite);
  const history = jobs.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 5)
    .map((j) => ({ id: j.id, type: j.type, status: j.status, at: j.createdAt, task: taskText(j), error: j.error ? String(j.error.message || j.error).slice(0, 160) : null }));
  return {
    status: running.length ? 'EXECUTANDO' : (jobs.length || steps.length ? 'OCIOSO' : 'SEM_ATIVIDADE'),
    currentTask: running.length ? taskText(running.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0]) : null,
    jobs: {
      total: jobs.length,
      running: running.length,
      succeeded: jobs.filter((j) => j.status === 'SUCCEEDED').length,
      failed: jobs.filter((j) => FAILED.has(j.status)).length,
    },
    missions: new Set(steps.map((s) => s.missionId)).size,
    tokens,
    lastModel: lastCall ? (lastCall.model || null) : null,
    lastProvider: lastCall ? (lastCall.provider || null) : null,
    lastActivityAt: times.length ? new Date(Math.max(...times)).toISOString() : null,
    history,
  };
}

function computeAgentLiveStats({ roster = [], state = {}, tenantId }) {
  const jobs = (state.runtimeJobs || []).filter((j) => j.tenantId === tenantId);
  const steps = (state.missionSteps || []).filter((s) => s.tenantId === tenantId);
  const callsByJob = new Map();
  for (const call of state.aiCalls || []) {
    if (call.tenantId !== tenantId || !call.jobId) continue;
    if (!callsByJob.has(call.jobId)) callsByJob.set(call.jobId, []);
    callsByJob.get(call.jobId).push(call);
  }
  const claimedJobs = new Set();
  const agents = roster.map((agent) => {
    const keys = new Set([agent.id, agent.name].filter(Boolean));
    const role = String(agent.role || '').toLowerCase();
    const mine = jobs.filter((j) => jobAgentKeys(j).some((k) => keys.has(k)));
    mine.forEach((j) => claimedJobs.add(j.id));
    const mySteps = steps.filter((s) => role && String(s.agent || '').toLowerCase() === role);
    return { ...agent, live: summarize(mine, mySteps, callsByJob) };
  });
  // Trabalho real de quem não está no catálogo (ex.: "Developer Agent") aparece, não some.
  const byName = new Map();
  for (const job of jobs) {
    if (claimedJobs.has(job.id)) continue;
    const name = jobAgentKeys(job)[0];
    if (!name) continue;
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(job);
  }
  const unmatched = [...byName.entries()].map(([name, list]) => ({ name, ...summarize(list, [], callsByJob) }));
  return { agents, unmatched };
}

module.exports = { computeAgentLiveStats };