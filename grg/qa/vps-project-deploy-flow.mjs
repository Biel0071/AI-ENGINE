import { execFileSync } from 'node:child_process';

const base = 'http://209.50.241.22:3000';
const endpoint = `${base}/api/fenix/projects/api-platform-live/git`;
const credentials = JSON.parse(execFileSync('ssh', ['-i', 'C:/Users/Dell/.ssh/grg_fenix_vps', '-o', 'BatchMode=yes', 'root@209.50.241.22', 'node /tmp/vps-city-qa-credentials.js'], { encoding: 'utf8', timeout: 20000 }));
const session = JSON.parse(execFileSync('curl.exe', ['-fsS', '--max-time', '30', '-H', 'content-type: application/json', '--data-binary', '@-', `${base}/api/login`], { input: JSON.stringify(credentials), encoding: 'utf8', timeout: 35000 }));
if (!session.token) throw new Error('Login sem sessão');
function call(url, body) {
  const args = ['-fsS', '--max-time', '40', '-H', `authorization: Bearer ${session.token}`, '-H', 'content-type: application/json'];
  if (body) args.push('--data-binary', '@-');
  args.push(url);
  return JSON.parse(execFileSync('curl.exe', args, { input: body ? JSON.stringify(body) : undefined, encoding: 'utf8', timeout: 45000 }));
}
const current = call(endpoint);
if (current.status) throw new Error('Workspace contém alterações sem commit');
const rebuild = process.env.FENIX_REAPPLY_IMAGES !== '1';
const launched = call(`${endpoint}/deploy`, { expectedHead: current.head, rebuild });
if (launched.job?.status !== 'RUNNING') throw new Error(`Deploy não iniciou: ${JSON.stringify(launched)}`);
console.log(JSON.stringify({ status: 'RUNNING', head: current.head.slice(0, 12), rebuild }));
let finished = false;
for (let attempt = 0; attempt < 90; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 10000));
  const job = call(`${endpoint}/deploy`).job;
  if (job?.status === 'RUNNING') continue;
  console.log(JSON.stringify({ status: job?.status || 'MISSING', head: job?.head?.slice(0, 12), error: job?.error || null, durationSeconds: job?.finishedAt ? Math.round((new Date(job.finishedAt) - new Date(job.startedAt)) / 1000) : null }));
  if (job?.status !== 'SUCCEEDED') process.exitCode = 2;
  finished = true;
  break;
}
if (!finished) throw new Error('Deploy não concluiu em 15 minutos');
