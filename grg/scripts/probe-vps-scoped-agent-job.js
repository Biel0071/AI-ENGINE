'use strict';

// Runs a read-only validation job against the registered API Platform workspace.
// Credentials stay in memory and are never printed.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const configured = Object.fromEntries(fs.readFileSync('/opt/fenix-os/grg/.env', 'utf8').split(/\r?\n/).map((line) => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  return match ? [match[1], match[2].replace(/^['"]|['"]$/g, '')] : [];
}).filter((item) => item.length === 2));
const processes = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8', timeout: 8000 }));
const env = { ...configured, ...(processes.find((item) => item.name === 'fenix-backend')?.pm2_env || {}) };
const base = 'http://127.0.0.1:4410';
const failTest = process.argv.includes('--fail-test');

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
    const projects = (await request('/api/fenix/projects')).projects;
    const project = projects.find((item) => item.workspace === '/root/api-gratis' || item.workspace?.endsWith('/api-gratis'));
    if (!project) throw new Error(`API Platform workspace is not registered among ${JSON.stringify(projects.map((item) => ({ id: item.id, name: item.name, workspace: item.workspace })))}`);
    const entities = (await request('/api/cognitive/entities')).entities;
    const team = entities.find((item) => item.type === 'COMPANY' && item.name === 'Fênix Operações');
    const agent = team && (await request(`/api/cognitive/entities/${team.id}/agents`)).agents.find((item) => item.name === 'Inventário de Infraestrutura');
    if (!agent) throw new Error('dynamic agent is not registered');
    const submitted = await request('/api/v2/jobs', { method: 'POST', body: JSON.stringify({ type: 'agent.workspace.execute', source: 'api', projectId: project.id, agentId: agent.id, maxAttempts: 1, riskLevel: 'LOW', payload: { projectId: project.id, operations: [], tests: [failTest ? 'node --check fenix-missing-validation-file.js' : 'node --check app_front.js'], commit: false } }) });
    let job;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      job = await request(`/api/v2/jobs/${submitted.jobId}`);
      if (['SUCCEEDED', 'DEAD_LETTER', 'FAILED', 'CANCELLED'].includes(job.status)) break;
    }
    const expectedStatus = failTest ? 'DEAD_LETTER' : 'SUCCEEDED';
    const expectedEvent = failTest ? 'runtime.job.dead_letter' : 'runtime.job.succeeded';
    let events = [];
    for (let attempt = 0; attempt < 10; attempt += 1) {
      events = (await request(`/api/v2/jobs/${submitted.jobId}/events`)).events.map((event) => event.type);
      if (events.includes(expectedEvent)) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    const sandboxDriver = job?.result?.tests?.[0]?.sandbox?.driver;
    const ok = job?.status === expectedStatus && job.agent?.agentId === agent.id && (failTest ? /validation tests failed/.test(job.error?.message || '') : job.result?.testsPassed === true && job.result?.filesChanged?.length === 0 && sandboxDriver === 'docker-rootless') && ['runtime.job.queued', 'runtime.job.started', expectedEvent].every((type) => events.includes(type));
    console.log(JSON.stringify({ ok, jobId: submitted.jobId, status: job?.status, agentId: job?.agent?.agentId, projectId: project.id, result: job?.result?.result, testsPassed: job?.result?.testsPassed, sandboxDriver, filesChanged: job?.result?.filesChanged, error: job?.error?.message, events }));
    if (!ok) process.exitCode = 2;
  } finally {
    await fetch(`${base}/api/logout`, { method: 'POST', headers, signal: AbortSignal.timeout(5000) }).catch(() => {});
  }
}
main().catch((error) => { console.error(JSON.stringify({ ok: false, reason: String(error.message || error).slice(0, 1000) })); process.exitCode = 2; });
