const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');

const exec = promisify(execFile);
const active = new Set();
const directory = process.env.FENIX_DEPLOY_JOBS_DIR || path.resolve(__dirname, '../../.data/deploy-jobs');

function file(projectId) { return path.join(directory, `${projectId.replace(/[^A-Za-z0-9_-]/g, '_')}.json`); }
function builtFile(projectId) { return path.join(directory, `${projectId.replace(/[^A-Za-z0-9_-]/g, '_')}.built-head`); }
function builtHead(projectId) { try { return fs.readFileSync(builtFile(projectId), 'utf8').trim(); } catch { return null; } }
function save(job) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const target = file(job.projectId);
  const staging = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(staging, JSON.stringify(job), { mode: 0o600 });
  fs.renameSync(staging, target);
}
function latest(projectId) {
  try {
    const job = JSON.parse(fs.readFileSync(file(projectId), 'utf8'));
    if (job.status === 'RUNNING' && !active.has(projectId)) return { ...job, status: 'INTERRUPTED', error: 'O backend reiniciou durante o deploy; verifique a API antes de tentar novamente' };
    return job;
  } catch { return null; }
}
function dockerEnvironment() {
  const names = ['PATH', 'HOME', 'USER', 'LOGNAME', 'DOCKER_CONFIG'];
  return { ...Object.fromEntries(names.filter((name) => process.env[name]).map((name) => [name, process.env[name]])), DOCKER_HOST: process.env.API_PLATFORM_DOCKER_HOST || 'unix:///var/run/docker.sock', COMPOSE_PARALLEL_LIMIT: '1' };
}
async function verify(root) {
  let lastState = 'sem leitura dos contêineres';
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const { stdout } = await exec('docker', ['inspect', '--format', '{{.State.Health.Status}}', 'api-platform-api-1', 'api-platform-worker-1', 'api-platform-dashboard-1'], { cwd: root, env: dockerEnvironment(), timeout: 15_000, maxBuffer: 100_000 });
      const states = stdout.trim().split(/\s+/);
      lastState = `api=${states[0] || '?'} worker=${states[1] || '?'} dashboard=${states[2] || '?'}`;
      if (states[0] === 'healthy' && states[1] === 'healthy' && states[2] === 'healthy') {
        const { stdout: health } = await exec('curl', ['-fsS', '--max-time', '8', 'http://209.50.241.22:3001/health'], { timeout: 10_000, maxBuffer: 100_000 });
        const { stdout: login } = await exec('curl', ['-sS', '--max-time', '8', '-o', '/dev/null', '-w', '%{http_code} %{content_type}', '-H', 'Content-Type: application/json', '-d', '{}', 'http://127.0.0.1:8081/admin/login'], { timeout: 10_000, maxBuffer: 100_000 });
        if (health && /^4\d\d application\/json/.test(login.trim())) return;
        lastState = `API ou proxy do dashboard sem resposta JSON (${login.trim()})`;
      }
    } catch (error) { lastState = String(error.message || error).slice(0, 100); }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw new Error(`API ou worker não ficou saudável após o deploy (${lastState})`);
}
function start(projectId, root, head, rebuild = true) {
  if (active.has(projectId)) return { conflict: true, job: latest(projectId) };
  if (!rebuild && builtHead(projectId) !== head) return { error: 'As imagens existentes não foram validadas para este commit; execute build e deploy' };
  const job = { projectId, head, mode: rebuild ? 'BUILD_AND_DEPLOY' : 'REAPPLY_EXISTING_IMAGES', status: 'RUNNING', startedAt: new Date().toISOString(), finishedAt: null, error: null };
  active.add(projectId); save(job);
  const logFile = path.join(directory, `${projectId.replace(/[^A-Za-z0-9_-]/g, '_')}.log`);
  const log = fs.createWriteStream(logFile, { flags: 'w', mode: 0o600 });
  const args = ['compose', '--progress', 'plain', 'up', '-d', ...(rebuild ? ['--build'] : []), '--no-deps', 'api', 'worker'];
  const child = spawn('docker', args, { cwd: root, env: dockerEnvironment(), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false });
  let settled = false;
  const finish = async (error) => {
    if (settled) return; settled = true;
    try {
      if (error) throw error;
      await exec('docker', ['compose', 'restart', 'dashboard'], { cwd: root, env: dockerEnvironment(), timeout: 90_000, maxBuffer: 100_000 });
      await verify(root);
      job.status = 'SUCCEEDED';
      if (rebuild) fs.writeFileSync(builtFile(projectId), head, { mode: 0o600 });
    } catch (failure) {
      job.status = 'FAILED';
      job.error = String(failure.message || failure).slice(0, 300);
    } finally { job.finishedAt = new Date().toISOString(); save(job); active.delete(projectId); log.end(); }
  };
  child.on('error', finish);
  child.on('close', (code) => finish(code === 0 ? null : new Error(`docker compose saiu com código ${code}`)));
  return { conflict: false, job };
}

module.exports = { latest, start };
