const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { execFile } = require('node:child_process');
const { ValidationError } = require('../kernel/errors');

const execFileAsync = promisify(execFile);
const SAFE_ID = /^[a-z0-9][a-z0-9-]{0,62}$/;

class DockerDeployAdapter {
  constructor({ generatedRoot, publicBaseUrl = 'http://127.0.0.1', network = 'fenix-apps', exec = execFileAsync } = {}) {
    if (!generatedRoot) throw new ValidationError('Docker deploy adapter requires generatedRoot');
    this.generatedRoot = path.resolve(generatedRoot);
    this.publicBaseUrl = publicBaseUrl.replace(/\/$/, '');
    this.network = network; this.exec = exec; this.productionSafe = true; this.name = 'docker';
  }
  async deploy({ project, environment, revision }) {
    validate(project?.id, environment); const context = this.#context(project);
    const name = `fenix-${project.id}-${environment}`; const image = `fenix/${project.id}:${environment}`; const previous = `${image}-previous`; const port = stablePort(project.id, environment); const logs = [];
    if (await this.#exists('image', image)) await this.#run(['image', 'tag', image, previous], logs);
    await this.#run(['build', '--pull', '--label', `grg.project=${project.id}`, '--label', `grg.revision=${revision}`, '-t', image, context], logs);
    if (await this.#exists('container', name)) await this.#run(['container', 'rm', '-f', name], logs);
    await this.#run(runArgs(name, image, port, this.network), logs);
    return { url: `${this.publicBaseUrl}:${port}`, logs, metadata: { containerName: name, image, previousImage: previous, port } };
  }
  async rollback({ projectId, environment }) {
    validate(projectId, environment); const name = `fenix-${projectId}-${environment}`; const image = `fenix/${projectId}:${environment}-previous`; const port = stablePort(projectId, environment); const logs = [];
    if (!(await this.#exists('image', image))) throw new ValidationError(`rollback image not found: ${image}`);
    if (await this.#exists('container', name)) await this.#run(['container', 'rm', '-f', name], logs);
    await this.#run(runArgs(name, image, port, this.network), logs);
    return { logs, metadata: { containerName: name, image, port } };
  }
  #context(project) { const resolved = path.resolve(project.outputPath || ''); const relative = path.relative(this.generatedRoot, resolved); if (!project.outputPath || relative.startsWith('..') || path.isAbsolute(relative)) throw new ValidationError('project outputPath is outside generatedRoot'); return resolved; }
  async #exists(kind, name) { try { await this.exec('docker', [kind, 'inspect', name], execOptions(15_000)); return true; } catch { return false; } }
  async #run(args, logs) { const result = await this.exec('docker', args, execOptions(10 * 60_000)); if (result.stdout) logs.push(String(result.stdout).trim()); if (result.stderr) logs.push(String(result.stderr).trim()); }
}

function runArgs(name, image, port, network) { return ['run', '-d', '--name', name, '--restart', 'unless-stopped', '--network', network, '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--pids-limit', '128', '--memory', '512m', '--cpus', '1', '--tmpfs', '/tmp:rw,noexec,nosuid,size=64m', '-p', `127.0.0.1:${port}:3000`, image]; }
function execOptions(timeout) { return { windowsHide: true, timeout, maxBuffer: 10_000_000 }; }
function validate(projectId, environment) { if (!SAFE_ID.test(String(projectId)) || !['preview', 'staging', 'production'].includes(environment)) throw new ValidationError('invalid Docker deployment identity'); }
function stablePort(projectId, environment) { const value = crypto.createHash('sha256').update(`${projectId}:${environment}`).digest().readUInt16BE(0); return 20_000 + (value % 20_000); }

module.exports = { DockerDeployAdapter, stablePort, runArgs };
