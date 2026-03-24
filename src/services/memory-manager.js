const fs = require('fs/promises');
const path = require('path');

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

class MemoryManager {
  constructor(options = {}) {
    this.baseDir = options.baseDir || path.join(__dirname, '..', '..', 'engine', 'memory');
    this.patternsFile = options.patternsFile || path.join(this.baseDir, 'patterns-runtime.json');
    this.organizationsFile = options.organizationsFile || path.join(this.baseDir, 'organizations-runtime.json');
    this.decisionsFile = options.decisionsFile || path.join(this.baseDir, 'decisions-runtime.json');
    this.changesFile = options.changesFile || path.join(this.baseDir, 'changes-runtime.json');
  }

  async ensure() {
    await fs.mkdir(this.baseDir, { recursive: true });

    const files = [this.patternsFile, this.organizationsFile, this.decisionsFile, this.changesFile];
    for (const filePath of files) {
      const current = await readJson(filePath, null);
      if (current === null) {
        await fs.writeFile(filePath, '[]\n', 'utf8');
      }
    }
  }

  async load() {
    await this.ensure();
    return this;
  }

  async append(filePath, item) {
    const current = await readJson(filePath, []);
    const next = [...current, item].slice(-400);
    await fs.writeFile(filePath, JSON.stringify(next, null, 2) + '\n', 'utf8');
    return item;
  }

  async saveOrganization(feature = '', organization = {}) {
    await this.ensure();
    return this.append(this.organizationsFile, {
      createdAt: new Date().toISOString(),
      feature,
      organization,
    });
  }

  async savePattern(feature = '', payload = {}) {
    await this.ensure();
    return this.append(this.patternsFile, {
      createdAt: new Date().toISOString(),
      feature,
      payload,
    });
  }

  async saveDecision(feature = '', decision = {}) {
    await this.ensure();
    return this.append(this.decisionsFile, {
      createdAt: new Date().toISOString(),
      feature,
      decision,
    });
  }

  async saveChange(change = '', reason = '', impact = '') {
    await this.ensure();
    return this.append(this.changesFile, {
      createdAt: new Date().toISOString(),
      change,
      reason,
      impact,
    });
  }

  getStructurePatterns({ limit = 8 } = {}) {
    return [
      'modular-folder-boundaries',
      'token-driven-ui',
      'service-repository-separation',
      'event-and-queue-support',
    ].slice(0, Number(limit || 8));
  }

  findPatterns(feature = '', { limit = 5 } = {}) {
    const base = [
      `premium-ui-${feature}`,
      `backend-modularity-${feature}`,
      'safe-refactor-first',
      'design-system-enforcement',
      'test-before-refactor',
    ];
    return base.slice(0, Number(limit || 5));
  }
}

module.exports = {
  MemoryManager,
};
