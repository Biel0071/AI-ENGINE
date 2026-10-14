'use strict';
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const root = '/root/fenix-agent-probe-20260923';
  const processes = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8', timeout: 5000 }));
  const env = processes.find((entry) => entry.name === 'fenix-backend')?.pm2_env || {};
  const base = 'http://127.0.0.1:4410';
  const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenantId: env.FENIX_BOOTSTRAP_TENANT_ID || 'grg', userId: env.FENIX_BOOTSTRAP_ADMIN_USER, password: env.FENIX_BOOTSTRAP_ADMIN_PASSWORD }) });
  const session = await login.json();
  if (!login.ok || !session.token) throw new Error(`login HTTP ${login.status}`);
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${session.token}` };
  try {
    const projectId = 'fenix-agent-probe-20260923';
    const projectsResponse = await fetch(`${base}/api/projects`, { headers });
    const projectsBody = await projectsResponse.json();
    const projects = Array.isArray(projectsBody) ? projectsBody : (projectsBody.projects || []);
    if (!projects.some((item) => item.id === projectId)) {
      const created = await fetch(`${base}/api/fenix/projects`, { method: 'POST', headers, body: JSON.stringify({ id: projectId, name: 'Isolated Agent Probe', workspace: root, branch: 'probe', lifecycle: 'EVOLUTION' }) });
      if (created.status !== 201) throw new Error(`project HTTP ${created.status}`);
    }
    const prompt = 'Create proof.js containing exactly: module.exports = { verified: true }; Include one test command: node --check proof.js. Return a JSON object with operations, tests, validationPassed=true, commit=false. Do not use Markdown.';
    const submitted = await fetch(`${base}/api/v2/jobs`, { method: 'POST', headers, body: JSON.stringify({ type: 'agent.execute', source: 'api', projectId, prompt, requiredCapabilities: ['backend'], riskLevel: 'LOW', maxAttempts: 1, payload: { projectId, prompt } }) });
    const createdJob = await submitted.json();
    if (submitted.status !== 202 || !createdJob.jobId) throw new Error(`job submit HTTP ${submitted.status}`);
    console.log(JSON.stringify({ stage: 'submitted', jobId: createdJob.jobId }));
    let job;
    const deadline = Date.now() + 180000;
    do {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const response = await fetch(`${base}/api/v2/jobs/${createdJob.jobId}`, { headers, signal: AbortSignal.timeout(10000) });
      job = await response.json();
      if (!response.ok) throw new Error(`job lookup HTTP ${response.status}`);
    } while (!['SUCCEEDED', 'FAILED', 'DEAD_LETTER', 'CANCELLED'].includes(job.status) && Date.now() < deadline);
    const eventsResponse = await fetch(`${base}/api/v2/jobs/${createdJob.jobId}/events`, { headers });
    const events = await eventsResponse.json();
    const proofPath = path.join(root, 'proof.js');
    const fileExists = fs.existsSync(proofPath);
    const fileValid = fileExists && fs.readFileSync(proofPath, 'utf8').trim() === 'module.exports = { verified: true };';
    console.log(JSON.stringify({ stage: 'result', jobId: createdJob.jobId, status: job.status, provider: job.result?.provider || null, model: job.result?.model || null, testsPassed: job.result?.testsPassed ?? null, fileExists, fileValid, eventCount: events.events?.length || 0, errorName: job.error?.name || null, errorMessage: String(job.error?.message || '').slice(0, 250) }));
    if (job.status !== 'SUCCEEDED' || !fileValid || job.result?.testsPassed !== true) process.exitCode = 2;
  } finally {
    await fetch(`${base}/api/logout`, { method: 'POST', headers }).catch(() => {});
  }
}
main().catch((error) => { console.error(JSON.stringify({ stage: 'probe-error', reason: String(error.message || error).slice(0, 250) })); process.exitCode = 2; });
