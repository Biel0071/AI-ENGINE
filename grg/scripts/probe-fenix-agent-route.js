'use strict';

const { execFileSync } = require('node:child_process');

async function main() {
  const processes = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8', timeout: 5000 }));
  const env = processes.find((entry) => entry.name === 'fenix-backend')?.pm2_env || {};
  const base = 'http://127.0.0.1:4410';
  const route = `${base}/api/v2/agents/orchestrate`;
  const anonymous = await fetch(route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: 'none', prompt: 'inspect' }) });
  const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenantId: env.FENIX_BOOTSTRAP_TENANT_ID || 'grg', userId: env.FENIX_BOOTSTRAP_ADMIN_USER, password: env.FENIX_BOOTSTRAP_ADMIN_PASSWORD }) });
  const session = await login.json();
  if (!login.ok || !session.token) throw new Error(`login HTTP ${login.status}`);
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${session.token}` };
  try {
    const invalid = await fetch(route, { method: 'POST', headers, body: JSON.stringify({ projectId: 'missing-project', prompt: 'inspect' }) });
    const projectsResponse = await fetch(`${base}/api/projects`, { headers });
    const projectsBody = await projectsResponse.json();
    const projects = Array.isArray(projectsBody) ? projectsBody : (projectsBody.projects || []);
    let project = projects.find((item) => item.id === 'api-platform-live' && item.workspace);
    if (!project) {
      const created = await fetch(`${base}/api/fenix/projects`, { method: 'POST', headers, body: JSON.stringify({ id: 'api-platform-live', name: 'API Platform Live', workspace: '/root/api-gratis', branch: 'main', lifecycle: 'EVOLUTION' }) });
      if (created.status !== 201) throw new Error(`project registration HTTP ${created.status}`);
      project = await created.json();
    }
    let submittedStatus = null; let jobStatus = null; let jobId = null;
    if (project) {
      const submitted = await fetch(route, { method: 'POST', headers, body: JSON.stringify({ projectId: project.id, prompt: 'Inspect project without edits', policy: { requireApproval: true } }) });
      submittedStatus = submitted.status;
      const result = await submitted.json();
      jobId = result.jobId || null;
      if (jobId) {
        const fetched = await fetch(`${base}/api/v2/jobs/${jobId}`, { headers });
        const job = await fetched.json();
        jobStatus = job.status;
      }
    }
    const result = { anonymous: anonymous.status, invalidProject: invalid.status, projectId: project.id, submittedStatus, jobStatus, jobId };
    console.log(JSON.stringify(result));
    if (anonymous.status !== 401 || invalid.status !== 400 || (project && (submittedStatus !== 202 || jobStatus !== 'AWAITING_APPROVAL'))) process.exitCode = 2;
  } finally {
    await fetch(`${base}/api/logout`, { method: 'POST', headers }).catch(() => {});
  }
}

main().catch((error) => { console.error(JSON.stringify({ reason: String(error.message || error).slice(0, 150) })); process.exitCode = 2; });
