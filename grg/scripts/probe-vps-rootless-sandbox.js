'use strict';

const { DockerRootlessSandbox } = require('/opt/fenix-os/grg/src/execution/docker-rootless-sandbox');

async function main() {
  const dockerHost = 'unix:///run/user/1001/docker.sock';
  const sandbox = new DockerRootlessSandbox({ workspaceRoot: '/opt/fenix-os/grg/.data/workspaces', dockerHost, enforceRootless: true });
  const result = await sandbox.run({
    executionId: `fenix-probe-${Date.now()}`,
    tool: { image: 'node@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293', allowedNetworks: ['none'] },
    argv: ['node', '-e', 'console.log("FENIX_SANDBOX_OK")'],
    limits: { timeoutMs: 30_000, memoryMb: 128, cpuUnits: 500, pids: 64 },
    network: 'none',
  });
  const ok = result.exitCode === 0 && result.stdout.trim() === 'FENIX_SANDBOX_OK' && result.sandbox.driver === 'docker-rootless';
  console.log(JSON.stringify({ ok, exitCode: result.exitCode, output: result.stdout.trim(), driver: result.sandbox.driver, network: result.sandbox.network, image: result.sandbox.image }));
  if (!ok) process.exitCode = 2;
}
main().catch((error) => { console.error(JSON.stringify({ ok: false, reason: String(error.message || error).slice(0, 500), stderr: String(error.sandboxOutput?.stderr || '').slice(0, 500) })); process.exitCode = 2; });
