'use strict';

// Idempotent live proof for the dynamic team and agent. Never prints credentials.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const configured = Object.fromEntries(fs.readFileSync('/opt/fenix-os/grg/.env', 'utf8').split(/\r?\n/).map((line) => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  return match ? [match[1], match[2].replace(/^['"]|['"]$/g, '')] : [];
}).filter((item) => item.length === 2));
const processes = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8', timeout: 8000 }));
const env = { ...configured, ...(processes.find((item) => item.name === 'fenix-backend')?.pm2_env || {}) };
const base = 'http://127.0.0.1:4410';
const verifyOnly = process.argv.includes('--verify');

async function main() {
  const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenantId: env.FENIX_BOOTSTRAP_TENANT_ID || 'grg', userId: env.FENIX_BOOTSTRAP_ADMIN_USER, password: env.FENIX_BOOTSTRAP_ADMIN_PASSWORD }), signal: AbortSignal.timeout(12000) });
  const session = await login.json();
  if (!login.ok || !session.token) throw new Error(`login HTTP ${login.status}`);
  const headers = { authorization: `Bearer ${session.token}`, 'content-type': 'application/json' };
  const request = async (url, options = {}) => {
    const response = await fetch(`${base}${url}`, { headers, signal: AbortSignal.timeout(15000), ...options });
    const data = await response.json();
    if (!response.ok) throw new Error(`${url} HTTP ${response.status}: ${String(data.error || data.message || 'unknown').slice(0, 100)}`);
    return data;
  };
  try {
    let entity = (await request('/api/cognitive/entities')).entities.find((item) => item.type === 'COMPANY' && item.name === 'Fênix Operações');
    if (!entity && !verifyOnly) entity = await request('/api/cognitive/entities', { method: 'POST', body: JSON.stringify({ type: 'company', name: 'Fênix Operações', seedAgents: false }) });
    if (!entity) throw new Error('operational cognitive team was not persisted');
    let agent = (await request(`/api/cognitive/entities/${entity.id}/agents`)).agents.find((item) => item.name === 'Inventário de Infraestrutura');
    if (!agent && !verifyOnly) agent = await request(`/api/cognitive/entities/${entity.id}/agents`, { method: 'POST', body: JSON.stringify({ name: 'Inventário de Infraestrutura', role: 'inventario-infraestrutura', description: 'Executa inventário autorizado pelo JobEngine' }) });
    if (!agent) throw new Error('dynamic infrastructure agent was not persisted');
    const city = await request('/api/v2/living-city/agents');
    const projected = city.agents.find((item) => item.id === agent.id);
    if (!projected || projected.kind !== 'cognitive') throw new Error('dynamic agent is missing from City projection');
    let jobId = null; let status = null; let eventTypes = [];
    if (!verifyOnly) {
      const submitted = await request('/api/v2/jobs', { method: 'POST', body: JSON.stringify({ type: 'discovery.scan', source: 'api', agentId: agent.id, maxAttempts: 1, riskLevel: 'LOW', payload: { probes: ['docker'] } }) });
      jobId = submitted.jobId;
      let job;
      for (let attempt = 0; attempt < 24; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        job = await request(`/api/v2/jobs/${jobId}`);
        if (['SUCCEEDED', 'DEAD_LETTER', 'FAILED', 'CANCELLED'].includes(job.status)) break;
      }
      status = job?.status;
      if (job?.agent?.agentId !== agent.id) throw new Error('job lost its assigned agent identity');
      eventTypes = (await request(`/api/v2/jobs/${jobId}/events`)).events.map((event) => event.type);
      if (status !== 'SUCCEEDED' || !['runtime.job.queued', 'runtime.job.started', 'runtime.job.succeeded'].every((type) => eventTypes.includes(type))) throw new Error(`job flow incomplete: ${status}`);
    }
    console.log(JSON.stringify({ ok: true, verifyOnly, entityId: entity.id, agentId: agent.id, cityCount: city.count, jobId, status, events: eventTypes }));
  } finally {
    await fetch(`${base}/api/logout`, { method: 'POST', headers, signal: AbortSignal.timeout(5000) }).catch(() => {});
  }
}

main().catch((error) => { console.error(JSON.stringify({ ok: false, reason: String(error.message || error).slice(0, 150) })); process.exitCode = 2; });
