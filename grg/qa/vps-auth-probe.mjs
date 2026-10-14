import { execFileSync } from 'node:child_process';

const credentials = JSON.parse(execFileSync('ssh', ['-i', 'C:/Users/Dell/.ssh/grg_fenix_vps', '-o', 'BatchMode=yes', 'root@209.50.241.22', 'node /tmp/vps-city-qa-credentials.js'], { encoding: 'utf8', timeout: 20000 }));
const started = Date.now();
try {
  const response = await fetch('http://209.50.241.22:3000/api/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(credentials), signal: AbortSignal.timeout(60000)
  });
  const body = await response.json().catch(() => ({}));
  console.log(JSON.stringify({ status: response.status, durationMs: Date.now() - started, hasToken: Boolean(body.token), error: body.error || null }));
  if (response.ok && body.token) await fetch('http://209.50.241.22:3000/api/logout', { method: 'POST', headers: { authorization: `Bearer ${body.token}` }, signal: AbortSignal.timeout(10000) }).catch(() => {});
} catch (error) {
  console.log(JSON.stringify({ durationMs: Date.now() - started, error: error.message }));
  process.exitCode = 1;
}
