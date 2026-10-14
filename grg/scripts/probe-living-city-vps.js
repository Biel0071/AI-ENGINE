'use strict';

// Authenticated read-only VPS probe; never prints credentials or tokens.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

const envFile = '/opt/fenix-os/grg/.env';
const configured = fs.existsSync(envFile) ? Object.fromEntries(fs.readFileSync(envFile, 'utf8').split(/\r?\n/).map((line) => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  return match ? [match[1], match[2].replace(/^['"]|['"]$/g, '')] : [];
}).filter((item) => item.length === 2)) : {};

async function main() {
  const processes = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8', timeout: 8000 }));
  const env = { ...configured, ...(processes.find((item) => item.name === 'fenix-backend')?.pm2_env || {}) };
  const base = 'http://127.0.0.1:4410';
  const login = await fetch(`${base}/api/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenantId: env.FENIX_BOOTSTRAP_TENANT_ID || 'grg', userId: env.FENIX_BOOTSTRAP_ADMIN_USER, password: env.FENIX_BOOTSTRAP_ADMIN_PASSWORD }),
    signal: AbortSignal.timeout(12000),
  });
  const session = await login.json();
  if (!login.ok || !session.token) throw new Error(`login HTTP ${login.status}`);
  try {
    const headers = { authorization: `Bearer ${session.token}` };
    const [agentsResponse, stateResponse] = await Promise.all([
      fetch(`${base}/api/v2/living-city/agents`, { headers, signal: AbortSignal.timeout(15000) }),
      fetch(`${base}/api/v2/living-city/state`, { headers, signal: AbortSignal.timeout(15000) }),
    ]);
    const [agents, state] = await Promise.all([agentsResponse.json(), stateResponse.json()]);
    const ok = agentsResponse.ok && stateResponse.ok && Array.isArray(agents.agents) && agents.count === agents.agents.length && state.metrics?.registeredAgents === agents.count;
    console.log(JSON.stringify({ ok, agentsStatus: agentsResponse.status, stateStatus: stateResponse.status, agents: agents.count, metrics: state.metrics, source: state.source }));
    if (!ok) process.exitCode = 2;
  } finally {
    await fetch(`${base}/api/logout`, { method: 'POST', headers: { authorization: `Bearer ${session.token}` }, signal: AbortSignal.timeout(5000) }).catch(() => {});
  }
}

main().catch((error) => { console.error(JSON.stringify({ ok: false, reason: String(error.message || error).slice(0, 150) })); process.exitCode = 2; });
