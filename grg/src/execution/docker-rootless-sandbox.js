const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');
const { execFile } = require('node:child_process');
const { ValidationError } = require('../kernel/errors');

const execFileAsync = promisify(execFile);
const ROOTLESS_SOCKET = /^unix:\/\/\/run\/user\/\d+\/docker\.sock$/;

class DockerRootlessSandbox {
  constructor({ workspaceRoot, dockerHost, exec = execFileAsync, enforceRootless = true, tempRoot = os.tmpdir() } = {}) {
    if (!workspaceRoot) throw new ValidationError('sandbox requires an authorized workspace root');
    this.workspaceRoot = path.resolve(workspaceRoot); this.dockerHost = dockerHost || process.env.DOCKER_HOST || ''; this.exec = exec; this.tempRoot = path.resolve(tempRoot); this.productionSafe = enforceRootless;
    if (enforceRootless && !ROOTLESS_SOCKET.test(this.dockerHost)) throw new ValidationError('sandbox requires a rootless Docker socket');
  }
  async run({ executionId, tool, argv, workspacePath, limits, network = 'none', environment = {} }) {
    if (!tool.allowedNetworks.includes(network) || (network !== 'none' && !/^[a-z0-9][a-z0-9_.-]{0,62}$/.test(network))) throw new ValidationError('sandbox network is not authorized for this tool');
    const temp = fs.mkdtempSync(path.join(this.tempRoot, 'fenix-sandbox-'));
    const workdir = path.join(temp, 'workspace'); fs.mkdirSync(workdir);
    try {
      if (workspacePath) { const source = this.#workspace(workspacePath); fs.cpSync(source, workdir, { recursive: true, dereference: false }); }
      const environmentFile = writeEnvironmentFile(temp, environment);
      const args = dockerArgs({ executionId, tool, argv, workdir, limits, network, environmentFile });
      const result = await this.exec('docker', args, { windowsHide: true, timeout: limits.timeoutMs + 5_000, maxBuffer: 10_000_000, env: { ...process.env, DOCKER_HOST: this.dockerHost } });
      return { exitCode: 0, stdout: String(result.stdout || ''), stderr: String(result.stderr || ''), sandbox: { driver: 'docker-rootless', network, image: tool.image, limits } };
    } catch (error) {
      error.sandboxOutput = { exitCode: Number.isInteger(error.code) ? error.code : 1, stdout: String(error.stdout || ''), stderr: String(error.stderr || error.message || '') };
      throw error;
    } finally { fs.rmSync(temp, { recursive: true, force: true }); }
  }
  #workspace(input) { const resolved = path.resolve(input); const relative = path.relative(this.workspaceRoot, resolved); if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new ValidationError('workspace is outside the authorized root'); return resolved; }
}

function dockerArgs({ executionId, tool, argv, workdir, limits, network, environmentFile = null }) {
  const args = ['run', '--rm', '--name', `fenix-sbx-${String(executionId).slice(0, 12)}`, '--label', `grg.execution=${executionId}`, '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--pids-limit', String(limits.pids), '--memory', `${limits.memoryMb}m`, '--cpus', String(limits.cpuUnits / 1000), '--network', network, '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m', '--mount', `type=bind,src=${workdir},dst=/workspace`, '--workdir', '/workspace'];
  if (environmentFile) args.push('--env-file', environmentFile);
  return [...args, tool.image, ...argv];
}
function writeEnvironmentFile(temp, environment) { const entries = Object.entries(environment); if (!entries.length) return null; const lines = entries.map(([key, value]) => { if (!/^[A-Z][A-Z0-9_]{0,60}$/.test(key) || String(value).length > 1000 || /[\n\r]/.test(String(value))) throw new ValidationError('invalid sandbox environment variable'); return `${key}=${value}`; }); const file = path.join(temp, 'sandbox.env'); fs.writeFileSync(file, `${lines.join('\n')}\n`, { mode: 0o600 }); return file; }
module.exports = { DockerRootlessSandbox, dockerArgs, ROOTLESS_SOCKET, writeEnvironmentFile };
