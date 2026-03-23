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

class ImprovementMemoryStore {
  constructor(options = {}) {
    this.baseDir = options.baseDir || __dirname;
    this.files = {
      analyses: path.join(this.baseDir, 'analyses-history.json'),
      improvements: path.join(this.baseDir, 'applied-improvements-history.json'),
      patterns: path.join(this.baseDir, 'learned-patterns-history.json'),
      bestPractices: path.join(this.baseDir, 'best-practices-history.json'),
      refactors: path.join(this.baseDir, 'successful-refactors-history.json'),
      uiImprovements: path.join(this.baseDir, 'ui-improvements-history.json'),
    };
    this.maxRecords = Number(options.maxRecords || 500);
    this.cacheTtlMs = Number(options.cacheTtlMs || 3000);
    this.cacheSnapshot = null;
    this.cacheAt = 0;
  }

  async initialize() {
    await fs.mkdir(this.baseDir, { recursive: true });

    const pairs = Object.values(this.files).map(async (filePath) => {
      const content = await readJson(filePath, null);
      if (content === null) {
        await fs.writeFile(filePath, '[]\n', 'utf8');
      }
    });

    await Promise.all(pairs);
  }

  async appendRecord(filePath, record) {
    const current = await readJson(filePath, []);
    const next = [...current, record].slice(-this.maxRecords);
    await fs.writeFile(filePath, JSON.stringify(next, null, 2) + '\n', 'utf8');
    this.cacheSnapshot = null;
    this.cacheAt = 0;
    return record;
  }

  async saveAnalysis(analysis = {}) {
    await this.initialize();
    return this.appendRecord(this.files.analyses, {
      createdAt: new Date().toISOString(),
      analysis,
    });
  }

  async saveImprovement(improvement = {}) {
    await this.initialize();
    return this.appendRecord(this.files.improvements, {
      createdAt: new Date().toISOString(),
      improvement,
    });
  }

  async savePattern(pattern = {}) {
    await this.initialize();
    return this.appendRecord(this.files.patterns, {
      createdAt: new Date().toISOString(),
      pattern,
    });
  }

  async saveBestPractice(practice = {}) {
    await this.initialize();
    return this.appendRecord(this.files.bestPractices, {
      createdAt: new Date().toISOString(),
      practice,
    });
  }

  async saveSuccessfulRefactor(refactor = {}) {
    await this.initialize();
    return this.appendRecord(this.files.refactors, {
      createdAt: new Date().toISOString(),
      refactor,
    });
  }

  async saveUIImprovement(entry = {}) {
    await this.initialize();
    return this.appendRecord(this.files.uiImprovements, {
      createdAt: new Date().toISOString(),
      uiImprovement: entry,
    });
  }

  async getSnapshot() {
    await this.initialize();

    const now = Date.now();
    if (this.cacheSnapshot && now - this.cacheAt <= this.cacheTtlMs) {
      return this.cacheSnapshot;
    }

    const [analyses, improvements, patterns, bestPractices, refactors, uiImprovements] = await Promise.all([
      readJson(this.files.analyses, []),
      readJson(this.files.improvements, []),
      readJson(this.files.patterns, []),
      readJson(this.files.bestPractices, []),
      readJson(this.files.refactors, []),
      readJson(this.files.uiImprovements, []),
    ]);

    const snapshot = {
      analyses,
      improvements,
      patterns,
      bestPractices,
      refactors,
      uiImprovements,
    };

    this.cacheSnapshot = snapshot;
    this.cacheAt = now;

    return snapshot;
  }
}

module.exports = {
  ImprovementMemoryStore,
};
