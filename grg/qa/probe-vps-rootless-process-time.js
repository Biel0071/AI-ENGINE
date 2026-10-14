'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DockerRootlessSandbox } = require('/opt/fenix-os/grg/src/execution/docker-rootless-sandbox');

async function main() {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-rootless-cpu-'));
  const repo = path.join(parent, 'repo');
  fs.mkdirSync(repo);
  fs.writeFileSync(path.join(repo, 'proof.js'), 'console.log("FENIX_SANDBOX_PROOF")\n');
  try {
    const sandbox = new DockerRootlessSandbox({ workspaceRoot: parent, dockerHost: 'unix:///run/user/1001/docker.sock', cpuMode: 'process-time' });
    const result = await sandbox.run({ executionId: `probe-${Date.now()}`, tool: { image: 'node:22-alpine', allowedNetworks: ['none'] }, argv: ['node', 'proof.js'], workspacePath: repo, limits: { timeoutMs: 15000, pids: 64, memoryMb: 256, cpuUnits: 1000 }, network: 'none' });
    const ok = result.exitCode === 0 && result.stdout.trim() === 'FENIX_SANDBOX_PROOF' && result.sandbox.cpuMode === 'process-time';
    console.log(JSON.stringify({ ok, exitCode: result.exitCode, outputMatches: result.stdout.trim() === 'FENIX_SANDBOX_PROOF', driver: result.sandbox.driver, cpuMode: result.sandbox.cpuMode }));
    if (!ok) process.exitCode = 2;
  } finally { fs.rmSync(parent, { recursive: true, force: true }); }
}
main().catch((error) => { console.error(error.sandboxOutput || error.message); process.exitCode = 1; });
