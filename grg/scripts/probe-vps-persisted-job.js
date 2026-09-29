'use strict';

// Checks a previously completed JobEngine record after a backend restart.
// Credentials are read on the VPS and never printed.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const jobId = process.argv[2];
if (!jobId) throw new Error('job ID required');
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
  const headers = { authorization: `Bearer ${session.token}` };
  try {
    const [jobResponse, eventsResponse, cityResponse] = await Promise.all([
      fetch(`${base}/api/v2/jobs/${encodeURIComponent(jobId)}`, { headers, signal: AbortSignal.timeout(15000) }),
      fetch(`${base}/api/v2/jobs/${encodeURIComponent(jobId)}/events`, { headers, signal: AbortSignal.timeout(15000) }),
      fetch(`${base}/api/v2/living-city/state`, { headers, signal: AbortSignal.timeout(15000) }),
    ]);
    const [job, history, city] = await Promise.all([jobResponse.json(), eventsResponse.json(), cityResponse.json()]);
    const eventTypes = (history.events || []).map((event) => event.type);
    const ok = jobResponse.ok && eventsResponse.ok && cityResponse.ok && job.status === 'SUCCEEDED' && eventTypes.includes('runtime.job.succeeded');
    console.log(JSON.stringify({ ok, jobId, status: job.status, eventTypes, cityStatus: cityResponse.status, cityMetrics: city.metrics }));
    if (!ok) process.exitCode = 2;
  } finally {
    await fetch(`${base}/api/logout`, { method: 'POST', headers, signal: AbortSignal.timeout(5000) }).catch(() => {});
  }
}
main().catch((error) => { console.error(JSON.stringify({ ok: false, reason: String(error.message || error).slice(0, 160) })); process.exitCode = 2; });
