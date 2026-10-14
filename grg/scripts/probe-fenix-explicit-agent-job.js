'use strict';
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

async function main() {
  const processes = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8', timeout: 5000 }));
  const env = processes.find((entry) => entry.name === 'fenix-backend')?.pm2_env || {};
  const base = 'http://127.0.0.1:4410';
  const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenantId: env.FENIX_BOOTSTRAP_TENANT_ID || 'grg', userId: env.FENIX_BOOTSTRAP_ADMIN_USER, password: env.FENIX_BOOTSTRAP_ADMIN_PASSWORD }) });
  const session = await login.json(); if (!login.ok || !session.token) throw new Error(`login HTTP ${login.status}`);
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${session.token}` };
  try {
    const projectId = 'fenix-agent-probe-20260923';
    const response = await fetch(`${base}/api/v2/jobs`, { method: 'POST', headers, body: JSON.stringify({ type: 'agent.workspace.execute', source: 'api', projectId, prompt: 'Create and validate a proof file in the isolated Git repository', requiredCapabilities: ['backend'], riskLevel: 'LOW', maxAttempts: 1, payload: { projectId, operations: [{ operation: 'create', path: 'proof.js', content: 'module.exports = { verified: true };\n' }], tests: ['node --check proof.js'], validationPassed: true, commit: false } }) });
    const submitted = await response.json(); if (response.status !== 202 || !submitted.jobId) throw new Error(`submit HTTP ${response.status}`);
    console.log(JSON.stringify({ stage: 'submitted', jobId: submitted.jobId }));
    let job;
    const deadline = Date.now() + 60000;
    do {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const fetched = await fetch(`${base}/api/v2/jobs/${submitted.jobId}`, { headers });
      job = await fetched.json();
      if (!fetched.ok) throw new Error(`lookup HTTP ${fetched.status}`);
    } while (!['SUCCEEDED', 'FAILED', 'DEAD_LETTER', 'CANCELLED'].includes(job.status) && Date.now() < deadline);
    const eventsResponse = await fetch(`${base}/api/v2/jobs/${submitted.jobId}/events`, { headers });
    const events = await eventsResponse.json();
    const file = '/root/fenix-agent-probe-20260923/proof.js';
    const fileValid = fs.existsSync(file) && fs.readFileSync(file, 'utf8') === 'module.exports = { verified: true };\n';
    console.log(JSON.stringify({ stage: 'result', jobId: submitted.jobId, status: job.status, testsPassed: job.result?.testsPassed ?? null, result: job.result?.result || null, fileValid, eventCount: events.events?.length || 0, error: job.error?.message || null }));
    if (job.status !== 'SUCCEEDED' || job.result?.testsPassed !== true || !fileValid || !events.events?.length) process.exitCode = 2;
  } finally { await fetch(`${base}/api/logout`, { method: 'POST', headers }).catch(() => {}); }
}
main().catch((error) => { console.error(JSON.stringify({ stage: 'probe-error', reason: String(error.message || error).slice(0, 250) })); process.exitCode = 2; });
