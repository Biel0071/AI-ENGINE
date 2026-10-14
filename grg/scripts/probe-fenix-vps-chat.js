'use strict';

// Authenticated, read-only inference probe. Prints no credentials, token, or model output.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

function readLocalEnv() {
  const path = '/opt/fenix-os/grg/.env';
  if (!fs.existsSync(path)) return {};
  return Object.fromEntries(fs.readFileSync(path, 'utf8').split(/\r?\n/).map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    return match ? [match[1], match[2].replace(/^['"]|['"]$/g, '')] : [];
  }).filter((pair) => pair.length === 2));
}

async function main() {
  const processes = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8', timeout: 5000 }));
  const env = { ...readLocalEnv(), ...(processes.find((entry) => entry.name === 'fenix-backend')?.pm2_env || {}) };
  const userId = env.FENIX_BOOTSTRAP_ADMIN_USER;
  const password = env.FENIX_BOOTSTRAP_ADMIN_PASSWORD;
  if (!userId || !password) {
    console.log(JSON.stringify({ login: 'unavailable', reason: 'bootstrap credentials not configured in backend environment' }));
    process.exitCode = 2;
    return;
  }
  const baseUrl = 'http://127.0.0.1:4410';
  const rejected = await fetch(`${baseUrl}/api/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenantId: env.FENIX_BOOTSTRAP_TENANT_ID || 'grg', userId, password: 'admin123' }),
    signal: AbortSignal.timeout(8000)
  });
  if (rejected.ok) {
    console.log(JSON.stringify({ staticPasswordRejected: false, chat: 'not attempted' }));
    process.exitCode = 2;
    return;
  }
  const login = await fetch(`${baseUrl}/api/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tenantId: env.FENIX_BOOTSTRAP_TENANT_ID || 'grg', userId, password }),
    signal: AbortSignal.timeout(8000)
  });
  const session = await login.json();
  if (!login.ok || !session.token) {
    console.log(JSON.stringify({ loginStatus: login.status, chat: 'not attempted' }));
    process.exitCode = 2;
    return;
  }
  try {
    const response = await fetch(`${baseUrl}/api/v2/vps-chat`, {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${session.token}` },
      body: JSON.stringify({ prompt: 'Responda apenas FENIX_E2E_OK', model: env.GRG_AIPLATFORM_MODEL || 'qwen2.5:0.5b' }),
      signal: AbortSignal.timeout(60000)
    });
    const body = await response.json();
    const text = body.response || '';
    const valid = response.ok && body.success === true && text.trim().length > 0 && !/\[fallback response\]|engineering report/i.test(text);
    console.log(JSON.stringify({ staticPasswordRejected: true, loginStatus: login.status, chatStatus: response.status, validInference: valid, textLength: text.length }));
    if (!valid) process.exitCode = 2;
  } finally {
    await fetch(`${baseUrl}/api/logout`, { method: 'POST', headers: { authorization: `Bearer ${session.token}` }, signal: AbortSignal.timeout(5000) }).catch(() => {});
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ probe: 'failed', reason: error.name === 'TimeoutError' ? 'timeout' : String(error.message || error).slice(0, 120) }));
  process.exitCode = 2;
});
