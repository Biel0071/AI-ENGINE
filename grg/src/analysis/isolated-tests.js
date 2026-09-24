'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { DockerRootlessSandbox, ROOTLESS_SOCKET } = require('../execution/docker-rootless-sandbox');
const { allowedFile, redact } = require('./evidence');
const exec = promisify(execFile);
function createTestRunner({ configFile, dockerHost } = {}) {
  if (!configFile || !ROOTLESS_SOCKET.test(dockerHost || '')) return null;
  return async (project, { run, cancelled }) => {
    const config = JSON.parse(await fs.readFile(configFile, 'utf8'));
    const suite = config.projects?.[project.id];
    if (!suite) return { status: 'não executado', reason: 'Suíte não configurada pelo operador para este projeto.' };
    if (!project.path || path.resolve(suite.workspace) !== path.resolve(project.path)) return { status: 'não executado', reason: 'Workspace não corresponde ao autorizado para a suíte.' };
    if (!Array.isArray(suite.argv) || !suite.argv.length || suite.argv.some(v => typeof v !== 'string') || !/^\S+@sha256:[a-f0-9]{64}$/.test(suite.image || '')) throw new Error('Suíte exige argv e imagem fixada por digest.');
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'fenix-analysis-tests-'));
    const workspace = path.join(temp, 'project');
    const executionId = `${run.id.slice(0, 6)}${Date.now().toString(36)}`;
    let cancelTimer;
    const startedAt = new Date().toISOString(), start = Date.now();
    try {
      await fs.cp(project.path, workspace, { recursive: true, dereference: false, filter: async source => {
        if (!(await fs.lstat(source)).isSymbolicLink() && allowedFile(path.basename(source)) && !/\.npmrc|\.netrc|\.gitconfig|\.session|\.sqlite|\.db$/i.test(source)) return true;
        return false;
      } });
      if (await cancelled()) return { status: 'não executado', reason: 'Cancelado antes de iniciar.' };
      const sandbox = new DockerRootlessSandbox({ workspaceRoot: temp, dockerHost });
      let killed = false;
      const kill = () => exec('docker', ['rm', '-f', `fenix-sbx-${executionId.slice(0, 12)}`], { windowsHide: true, timeout: 10000, env: { PATH: process.env.PATH, DOCKER_HOST: dockerHost } }).catch(() => {});
      cancelTimer = setInterval(async () => { if (!killed && await cancelled()) { killed = true; await kill(); } }, 1000); cancelTimer.unref?.();
      const limits = { timeoutMs: Math.min(3600000, Math.max(1000, Number(suite.timeoutMs) || 300000)), memoryMb: 1024, cpuUnits: 1000, pids: 128 };
      try {
        const result = await sandbox.run({ executionId, tool: { image: suite.image, allowedNetworks: ['none'] }, argv: suite.argv, workspacePath: workspace, limits, network: 'none', environment: { CI: '1', NODE_ENV: 'test' } });
        return redact({ status: killed ? 'cancelado' : 'aprovado', argv: suite.argv, image: suite.image, startedAt, durationMs: Date.now() - start, ...result });
      } catch (e) { return redact({ status: killed ? 'cancelado' : 'reprovado', argv: suite.argv, image: suite.image, startedAt, durationMs: Date.now() - start, ...e.sandboxOutput, error: e.message }); }
      finally { await kill(); }
    } finally { clearInterval(cancelTimer); await fs.rm(temp, { recursive: true, force: true }); }
  };
}
module.exports = { createTestRunner };
