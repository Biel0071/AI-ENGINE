'use strict';

// Exercises login -> canonical JobEngine -> Docker discovery -> persisted result/events.
// Prints status and counts only; credentials remain in process memory.
const { execFileSync } = require('node:child_process');

async function main() {
  const processes = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8', timeout: 5000 }));
  const env = processes.find((entry) => entry.name === 'fenix-backend')?.pm2_env || {};
  if (!env.FENIX_BOOTSTRAP_ADMIN_USER || !env.FENIX_BOOTSTRAP_ADMIN_PASSWORD) throw new Error('bootstrap login unavailable');
  const base = 'http://127.0.0.1:4410';
  const login = await fetch(`${base}/api/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenantId: env.FENIX_BOOTSTRAP_TENANT_ID || 'grg', userId: env.FENIX_BOOTSTRAP_ADMIN_USER, password: env.FENIX_BOOTSTRAP_ADMIN_PASSWORD }),
    signal: AbortSignal.timeout(8000)
  });
  const session = await login.json();
  if (!login.ok || !session.token) throw new Error(`login HTTP ${login.status}`);
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${session.token}` };
  let jobId = process.argv[2] || null;
  try {
    if (!jobId) {
      const submitted = await fetch(`${base}/api/v2/jobs`, {
      method: 'POST', headers,
      body: JSON.stringify({ type: 'discovery.scan', payload: { probes: ['docker'] }, source: 'api', riskLevel: 'LOW', maxAttempts: 1 }),
      signal: AbortSignal.timeout(15000)
    });
    const created = await submitted.json();
      jobId = created.jobId;
      if (submitted.status !== 202 || !jobId) throw new Error(`submit HTTP ${submitted.status}`);
    }
    let job;
    const deadline = Date.now() + 45000;
    do {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const response = await fetch(`${base}/api/v2/jobs/${encodeURIComponent(jobId)}`, { headers, signal: AbortSignal.timeout(5000) });
      job = await response.json();
      if (!response.ok) throw new Error(`job lookup HTTP ${response.status}`);
    } while (!['SUCCEEDED', 'FAILED', 'DEAD_LETTER', 'CANCELLED'].includes(job.status) && Date.now() < deadline);
    const eventsResponse = await fetch(`${base}/api/v2/jobs/${encodeURIComponent(jobId)}/events`, { headers, signal: AbortSignal.timeout(5000) });
    const events = await eventsResponse.json();
    const inventoryResponse = await fetch(`${base}/api/discovery-network/inventory`, { headers, signal: AbortSignal.timeout(5000) });
    const inventory = await inventoryResponse.json();
    const result = {
      jobId,
      status: job.status,
      resourceCount: job.result?.scan?.resourceCount ?? null,
      eventCount: Array.isArray(events.events) ? events.events.length : null,
      inventoryCount: Array.isArray(inventory.resources) ? inventory.resources.length : null,
      errorName: job.error?.name || null
    };
    console.log(JSON.stringify(result));
    if (job.status !== 'SUCCEEDED' || !result.resourceCount || !result.eventCount || !result.inventoryCount) process.exitCode = 2;
  } finally {
    await fetch(`${base}/api/logout`, { method: 'POST', headers, signal: AbortSignal.timeout(5000) }).catch(() => {});
  }
}

main().catch((error) => { console.error(JSON.stringify({ probe: 'failed', reason: String(error.message || error).slice(0, 120) })); process.exitCode = 2; });
