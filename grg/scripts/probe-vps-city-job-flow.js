'use strict';

// Runs a bounded, authorized Docker inventory through the public JobEngine API.
// Outputs only status and event types, never credentials, tokens, or inventory.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const configured = Object.fromEntries(fs.readFileSync('/opt/fenix-os/grg/.env', 'utf8').split(/\r?\n/).map((line) => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  return match ? [match[1], match[2].replace(/^['"]|['"]$/g, '')] : [];
}).filter((item) => item.length === 2));
const processes = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8', timeout: 8000 }));
const env = { ...configured, ...(processes.find((item) => item.name === 'fenix-backend')?.pm2_env || {}) };
const base = 'http://127.0.0.1:4410';

async function main() {
  const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenantId: env.FENIX_BOOTSTRAP_TENANT_ID || 'grg', userId: env.FENIX_BOOTSTRAP_ADMIN_USER, password: env.FENIX_BOOTSTRAP_ADMIN_PASSWORD }), signal: AbortSignal.timeout(12000) });
  const session = await login.json();
  if (!login.ok || !session.token) throw new Error(`login HTTP ${login.status}`);
  const headers = { authorization: `Bearer ${session.token}`, 'content-type': 'application/json' };
  try {
    const submittedResponse = await fetch(`${base}/api/v2/jobs`, { method: 'POST', headers, body: JSON.stringify({ type: 'discovery.scan', source: 'api', riskLevel: 'LOW', maxAttempts: 1, payload: { probes: ['docker'] } }), signal: AbortSignal.timeout(12000) });
    const submitted = await submittedResponse.json();
    if (submittedResponse.status !== 202 || !submitted.jobId) throw new Error(`submit HTTP ${submittedResponse.status}: ${String(submitted.error || submitted.message || submitted.code || 'unknown').slice(0, 120)}`);
    let job;
    for (let attempt = 0; attempt < 24; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const response = await fetch(`${base}/api/v2/jobs/${submitted.jobId}`, { headers, signal: AbortSignal.timeout(10000) });
      job = await response.json();
      if (['SUCCEEDED', 'DEAD_LETTER', 'FAILED', 'CANCELLED'].includes(job.status)) break;
    }
    const [eventsResponse, cityResponse] = await Promise.all([
      fetch(`${base}/api/v2/jobs/${submitted.jobId}/events`, { headers, signal: AbortSignal.timeout(12000) }),
      fetch(`${base}/api/v2/living-city/state`, { headers, signal: AbortSignal.timeout(12000) }),
    ]);
    const [history, city] = await Promise.all([eventsResponse.json(), cityResponse.json()]);
    const types = (history.events || []).map((event) => event.type);
    const ok = job?.status === 'SUCCEEDED' && ['runtime.job.queued', 'runtime.job.started', 'runtime.job.succeeded'].every((type) => types.includes(type)) && cityResponse.ok;
    console.log(JSON.stringify({ ok, jobId: submitted.jobId, status: job?.status, events: types, cityMetrics: city.metrics, eventsStatus: eventsResponse.status, cityStatus: cityResponse.status }));
    if (!ok) process.exitCode = 2;
  } finally {
    await fetch(`${base}/api/logout`, { method: 'POST', headers, signal: AbortSignal.timeout(5000) }).catch(() => {});
  }
}

main().catch((error) => { console.error(JSON.stringify({ ok: false, reason: String(error.message || error).slice(0, 150) })); process.exitCode = 2; });
