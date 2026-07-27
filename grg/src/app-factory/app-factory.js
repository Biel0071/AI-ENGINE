const { uuid } = require('../kernel/ids');
const { ValidationError, NotFoundError } = require('../kernel/errors');

// App Factory: empacota um projeto para múltiplos destinos a partir da base comum.
// Packagers locais/mock produzem artefatos determinísticos. Adapters reais (gradle/xcode/
// electron-builder/tauri/web-ext) implementam a mesma interface build().

class MockPackager {
  constructor(target, ext) { this.target = target; this.ext = ext; }
  async build({ projectId, version }) {
    const filename = `${projectId}-${version}.${this.ext}`;
    const checksum = require('node:crypto').createHash('sha256').update(filename).digest('hex').slice(0, 16);
    return { filename, checksum, sizeKb: 128, logs: [`[${this.target}] built ${filename}`] };
  }
}

const DEFAULT_PACKAGERS = () => ({
  pwa: new MockPackager('pwa', 'zip'),
  electron: new MockPackager('electron', 'exe'),
  tauri: new MockPackager('tauri', 'msi'),
  android: new MockPackager('android', 'apk'),
  'android-aab': new MockPackager('android-aab', 'aab'),
  ios: new MockPackager('ios', 'ipa'),
  'extension-chrome': new MockPackager('extension-chrome', 'crx'),
  'extension-firefox': new MockPackager('extension-firefox', 'xpi'),
});

class AppFactory {
  constructor({ store, bus, controlPlane, packagers }) {
    this.store = store; this.bus = bus; this.cp = controlPlane;
    this.packagers = packagers || DEFAULT_PACKAGERS();
  }

  targets() { return Object.keys(this.packagers); }

  async build(tenantId, actorId, projectId, input = {}) {
    await this.cp.authorize(tenantId, actorId, 'build:create');
    const state = await this.store.read();
    const project = state.projects.find((p) => p.tenantId === tenantId && p.id === projectId);
    if (!project) throw new NotFoundError(`Project not found: ${projectId}`);
    const target = input.target;
    const packager = this.packagers[target];
    if (!packager) throw new ValidationError(`Unsupported build target: ${target}`);
    const version = input.version || '1.0.0';

    const buildTarget = { id: uuid(), tenantId, projectId, target, version, status: 'built', createdAt: now() };
    const result = await packager.build({ projectId, version });
    const artifact = {
      id: uuid(), tenantId, projectId, buildTargetId: buildTarget.id, target,
      filename: result.filename, checksum: result.checksum, sizeKb: result.sizeKb,
      signed: !!input.sign, logs: result.logs, createdAt: now(),
    };
    await this.store.update((s) => {
      s.buildTargets.push(buildTarget);
      s.artifacts.push(artifact);
      s.memoryEvents.push({
        id: uuid(), tenantId, projectId, actorId, kind: 'app-built',
        summary: `Built ${target} artifact ${result.filename}`,
        evidence: [`artifact:${artifact.id}`], confidence: 1, createdAt: now(),
      });
      return s;
    });
    await this.bus.emit('app.built', { tenantId, projectId, target, artifactId: artifact.id });
    return artifact;
  }

  async listArtifacts(tenantId, actorId, projectId = null) {
    await this.cp.authorize(tenantId, actorId, 'project:read');
    const state = await this.store.read();
    return state.artifacts.filter((a) => a.tenantId === tenantId && (!projectId || a.projectId === projectId));
  }
}

function now() { return new Date().toISOString(); }

module.exports = { AppFactory, MockPackager, DEFAULT_PACKAGERS };
