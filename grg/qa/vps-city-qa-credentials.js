'use strict';
// Invoked only over SSH by the visual probe; stdout is captured in memory.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const envFile = '/opt/fenix-os/grg/.env';
const configured = fs.existsSync(envFile) ? Object.fromEntries(fs.readFileSync(envFile, 'utf8').split(/\r?\n/).map((line) => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  return match ? [match[1], match[2].replace(/^['"]|['"]$/g, '')] : [];
}).filter((item) => item.length === 2)) : {};
const processes = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8', timeout: 8000 }));
const env = { ...configured, ...(processes.find((item) => item.name === 'fenix-backend')?.pm2_env || {}) };
process.stdout.write(JSON.stringify({ tenantId: env.FENIX_BOOTSTRAP_TENANT_ID || 'grg', userId: env.FENIX_BOOTSTRAP_ADMIN_USER, password: env.FENIX_BOOTSTRAP_ADMIN_PASSWORD }));
