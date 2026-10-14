'use strict';
const { execFileSync } = require('node:child_process');
async function main() {
  const processes = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8', timeout: 5000 }));
  const env = processes.find((entry) => entry.name === 'fenix-backend')?.pm2_env || {};
  const base = 'http://127.0.0.1:4410';
  const login = await fetch(`${base}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenantId: env.FENIX_BOOTSTRAP_TENANT_ID || 'grg', userId: env.FENIX_BOOTSTRAP_ADMIN_USER, password: env.FENIX_BOOTSTRAP_ADMIN_PASSWORD }) });
  const session = await login.json(); if (!login.ok || !session.token) throw new Error(`login HTTP ${login.status}`);
  const headers = { authorization: `Bearer ${session.token}` };
  try {
    const response = await fetch(`${base}/api/fenix/projects/fenix-agent-probe-20260923/artifacts`, { headers });
    const body = await response.json();
    const matching = (body.artifacts || []).filter((item) => item.type === 'FENIX_AGENT_EXECUTION_REPORT');
    console.log(JSON.stringify({ statusCode: response.status, executionReports: matching.length }));
    if (response.status !== 200 || !matching.length) process.exitCode = 2;
  } finally { await fetch(`${base}/api/logout`, { method: 'POST', headers }).catch(() => {}); }
}
main().catch((error) => { console.error(JSON.stringify({ reason: String(error.message || error).slice(0, 150) })); process.exitCode = 2; });
