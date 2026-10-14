const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const run = promisify(execFile);
class DockerCliProbe {
  constructor({ executable = 'docker', timeoutMs = 10_000, exec = run } = {}) { this.name = 'docker'; this.executable = executable; this.timeoutMs = timeoutMs; this.exec = exec; }
  async scan() {
    const { stdout } = await this.exec(this.executable, ['ps', '--no-trunc', '--format', '{{json .}}'], { timeout: this.timeoutMs, windowsHide: true, maxBuffer: 2_000_000 });
    return String(stdout).split(/\r?\n/).filter(Boolean).map((line) => { const row = JSON.parse(line); return { kind: 'container', externalId: row.ID, name: row.Names, version: row.Image, attributes: { state: row.State, status: row.Status, networks: row.Networks, mounts: row.Mounts }, endpoints: row.Ports ? [{ protocol: 'docker-port-map', value: row.Ports }] : [], capabilities: ['container-runtime'], dependencies: [row.Image] }; });
  }
}
module.exports = { DockerCliProbe };
