const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function readJsonSync(filePath, fallback) {
  try {
    const raw = fsSync.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

class DesignSystemMemoryStore {
  constructor(options = {}) {
    this.baseDir = options.baseDir || __dirname;
    this.designSystemFile = path.join(this.baseDir, 'design-system-memory.json');
    this.designPatternsFile = path.join(this.baseDir, 'design-patterns-memory.json');
    this.maxRecords = Number(options.maxRecords || 120);
    this.cacheTtlMs = Number(options.cacheTtlMs || 5000);
    this.cache = null;
    this.cacheAt = 0;
  }

  async initialize() {
    await fs.mkdir(this.baseDir, { recursive: true });

    const files = [this.designSystemFile, this.designPatternsFile];
    for (const filePath of files) {
      const current = await readJson(filePath, null);
      if (current === null) {
        await fs.writeFile(filePath, '[]\n', 'utf8');
      }
    }
  }

  initializeSync() {
    fsSync.mkdirSync(this.baseDir, { recursive: true });

    const files = [this.designSystemFile, this.designPatternsFile];
    for (const filePath of files) {
      const current = readJsonSync(filePath, null);
      if (current === null) {
        fsSync.writeFileSync(filePath, '[]\n', 'utf8');
      }
    }
  }

  clearCache() {
    this.cache = null;
    this.cacheAt = 0;
  }

  async append(filePath, entry) {
    const current = await readJson(filePath, []);
    const next = [...current, entry].slice(-this.maxRecords);
    await fs.writeFile(filePath, JSON.stringify(next, null, 2) + '\n', 'utf8');
    this.clearCache();
    return entry;
  }

  appendSync(filePath, entry) {
    const current = readJsonSync(filePath, []);
    const next = [...current, entry].slice(-this.maxRecords);
    fsSync.writeFileSync(filePath, JSON.stringify(next, null, 2) + '\n', 'utf8');
    this.clearCache();
    return entry;
  }

  async saveDesignSystem(payload = {}) {
    await this.initialize();

    const record = {
      createdAt: new Date().toISOString(),
      memory: {
        designSystem: {
          name: String(payload.name || 'whatsapp-inspired-premium'),
          tokens: payload.tokens || {},
          components: Array.isArray(payload.components) ? payload.components : [],
          patterns: Array.isArray(payload.patterns) ? payload.patterns : [],
          source: String(payload.source || 'extracted_from_ui'),
        },
      },
    };

    return this.append(this.designSystemFile, record);
  }

  saveDesignSystemSync(payload = {}) {
    this.initializeSync();

    const record = {
      createdAt: new Date().toISOString(),
      memory: {
        designSystem: {
          name: String(payload.name || 'whatsapp-inspired-premium'),
          tokens: payload.tokens || {},
          components: Array.isArray(payload.components) ? payload.components : [],
          patterns: Array.isArray(payload.patterns) ? payload.patterns : [],
          source: String(payload.source || 'extracted_from_ui'),
        },
      },
    };

    return this.appendSync(this.designSystemFile, record);
  }

  async saveDesignPatterns(patterns = {}) {
    await this.initialize();

    const record = {
      createdAt: new Date().toISOString(),
      memory: {
        designPatterns: {
          chatLayout: patterns.chatLayout || {},
          sidebarLayout: patterns.sidebarLayout || {},
          messageFlowUI: patterns.messageFlowUI || {},
        },
      },
    };

    return this.append(this.designPatternsFile, record);
  }

  saveDesignPatternsSync(patterns = {}) {
    this.initializeSync();

    const record = {
      createdAt: new Date().toISOString(),
      memory: {
        designPatterns: {
          chatLayout: patterns.chatLayout || {},
          sidebarLayout: patterns.sidebarLayout || {},
          messageFlowUI: patterns.messageFlowUI || {},
        },
      },
    };

    return this.appendSync(this.designPatternsFile, record);
  }

  async getSnapshot() {
    await this.initialize();

    const now = Date.now();
    if (this.cache && now - this.cacheAt <= this.cacheTtlMs) {
      return this.cache;
    }

    const [designSystems, designPatterns] = await Promise.all([
      readJson(this.designSystemFile, []),
      readJson(this.designPatternsFile, []),
    ]);

    const snapshot = {
      designSystems,
      designPatterns,
    };

    this.cache = snapshot;
    this.cacheAt = now;

    return snapshot;
  }

  async getLatestDesignSystem() {
    const snapshot = await this.getSnapshot();
    const records = snapshot.designSystems || [];
    if (!records.length) {
      return null;
    }

    const latest = records[records.length - 1];
    return latest && latest.memory && latest.memory.designSystem ? latest.memory.designSystem : null;
  }
}

module.exports = {
  DesignSystemMemoryStore,
};
