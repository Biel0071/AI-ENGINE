'use strict';

const { execFileSync } = require('node:child_process');
const WebSocket = require('/opt/fenix-os/grg/node_modules/ws');

async function connect(token) {
  return new Promise((resolve) => {
    const socket = new WebSocket('ws://127.0.0.1:4410/events', token ? { headers: { authorization: `Bearer ${token}` } } : undefined);
    const timer = setTimeout(() => { socket.terminate(); resolve(false); }, 5000);
    socket.once('open', () => { clearTimeout(timer); socket.close(); resolve(true); });
    socket.once('error', () => { clearTimeout(timer); resolve(false); });
  });
}

async function main() {
  const processes = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8', timeout: 5000 }));
  const env = processes.find((entry) => entry.name === 'fenix-backend')?.pm2_env || {};
  const login = await fetch('http://127.0.0.1:4410/api/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenantId: env.FENIX_BOOTSTRAP_TENANT_ID || 'grg', userId: env.FENIX_BOOTSTRAP_ADMIN_USER, password: env.FENIX_BOOTSTRAP_ADMIN_PASSWORD })
  });
  const session = await login.json();
  if (!login.ok || !session.token) throw new Error('login failed');
  const anonymous = await connect(null);
  const authenticated = await connect(session.token);
  await fetch('http://127.0.0.1:4410/api/logout', { method: 'POST', headers: { authorization: `Bearer ${session.token}` } });
  console.log(JSON.stringify({ anonymous, authenticated }));
  if (anonymous || !authenticated) process.exitCode = 2;
}

main().catch((error) => { console.error(JSON.stringify({ reason: String(error.message || error) })); process.exitCode = 2; });
