'use strict';
const { execFileSync } = require('node:child_process');
async function main() {
  const id = process.argv[2]; if (!id) throw new Error('job id required');
  const processes = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8', timeout: 5000 }));
  const env = processes.find((entry) => entry.name === 'fenix-backend')?.pm2_env || {};
  const base = 'http://127.0.0.1:4410';
  const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenantId: env.FENIX_BOOTSTRAP_TENANT_ID || 'grg', userId: env.FENIX_BOOTSTRAP_ADMIN_USER, password: env.FENIX_BOOTSTRAP_ADMIN_PASSWORD }) });
  const session = await login.json(); if (!login.ok || !session.token) throw new Error(`login HTTP ${login.status}`);
  const headers = { authorization: `Bearer ${session.token}` };
  try {
    const response = await fetch(`${base}/api/v2/jobs/${id}`, { headers });
    const job = await response.json();
    console.log(JSON.stringify({ statusCode: response.status, id: job.id, status: job.status, stage: job.currentStage, attempts: job.attempts, maxAttempts: job.maxAttempts, startedAt: job.startedAt, heartbeatAt: job.heartbeatAt, updatedAt: job.updatedAt, timeoutMs: job.limits?.timeoutMs, workerId: job.workerId, agent: job.agent?.agentId, error: job.error, result: job.result ? { provider: job.result.provider, model: job.result.model, testsPassed: job.result.testsPassed, result: job.result.result } : null }));
  } finally { await fetch(`${base}/api/logout`, { method: 'POST', headers }).catch(() => {}); }
}
main().catch((error) => { console.error(JSON.stringify({ reason: String(error.message || error).slice(0, 150) })); process.exitCode = 2; });
