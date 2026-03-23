const fs = require('fs/promises');
const path = require('path');

function normalizeRecord(record = {}) {
  return {
    ...record,
    feature: String(record.feature || '').trim().toLowerCase(),
    createdAt: record.createdAt || new Date().toISOString(),
  };
}

function tokenize(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .split(/[\s_-]+/)
    .filter(Boolean);
}

function capList(value, limit = 120) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, limit);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

class MemoryManager {
  constructor(options = {}) {
    this.baseDir = options.baseDir || __dirname;
    this.paths = {
      features: options.featuresPath || path.join(this.baseDir, 'features.json'),
      uiPatterns: options.uiPatternsPath || path.join(this.baseDir, 'ui-patterns.json'),
      structures: options.structuresPath || path.join(this.baseDir, 'structures.json'),
      structurePatterns: options.structurePatternsPath || path.join(this.baseDir, 'structure-patterns.json'),
      aiLearnings: options.aiLearningsPath || path.join(this.baseDir, 'ai-learnings.json'),
    };

    this.cache = {
      features: [],
      uiPatterns: [],
      structures: [],
      structurePatterns: [],
      aiLearnings: [],
    };
  }

  async ensureStore() {
    await fs.mkdir(this.baseDir, { recursive: true });

    for (const targetPath of Object.values(this.paths)) {
      if (!(await fileExists(targetPath))) {
        await fs.writeFile(targetPath, '[]\n', 'utf8');
      }
    }
  }

  async readJsonArray(filePath) {
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async writeJsonArray(filePath, payload) {
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  }

  async load() {
    await this.ensureStore();

    const [features, uiPatterns, structures, structurePatterns, aiLearnings] = await Promise.all([
      this.readJsonArray(this.paths.features),
      this.readJsonArray(this.paths.uiPatterns),
      this.readJsonArray(this.paths.structures),
      this.readJsonArray(this.paths.structurePatterns),
      this.readJsonArray(this.paths.aiLearnings),
    ]);

    this.cache = {
      features: features.map((entry) => normalizeRecord(entry)),
      uiPatterns,
      structures,
      structurePatterns,
      aiLearnings,
    };

    return this.cache;
  }

  findPatterns(query, options = {}) {
    const source = this.cache.features || [];
    const queryTokens = new Set(tokenize(query));
    const limit = Number(options.limit || 5);

    if (queryTokens.size === 0) {
      return source.slice(-limit);
    }

    return source
      .map((entry) => {
        const entryTokens = new Set(tokenize(entry.feature));
        let score = 0;

        for (const token of queryTokens) {
          if (entryTokens.has(token)) {
            score += 1;
          }
        }

        if (entry.feature.includes(String(query).toLowerCase())) {
          score += 1;
        }

        return { entry, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.entry);
  }

  async savePattern(feature, result = {}) {
    if (!this.cache.features) {
      await this.load();
    }

    const normalizedFeature = String(feature || '').trim().toLowerCase();
    if (!normalizedFeature) {
      return null;
    }

    const record = normalizeRecord({
      feature: normalizedFeature,
      plan: result.plan || [],
      summary: result.summary || null,
      generatedFiles: result.files || [],
      projectSummary: result.projectSummary || null,
      uiPattern: result.uiPattern || null,
    });

    const features = [...this.cache.features, record].slice(-200);
    this.cache.features = features;

    if (record.uiPattern) {
      const uiPatternRecord = {
        feature: normalizedFeature,
        createdAt: record.createdAt,
        ...record.uiPattern,
      };
      this.cache.uiPatterns = [...this.cache.uiPatterns, uiPatternRecord].slice(-200);
    }

    const structureRecord = {
      feature: normalizedFeature,
      createdAt: record.createdAt,
      reusableModules: (result.summary && result.summary.reusableModules) || [],
      files: (result.files || []).map((item) => item.path),
    };
    this.cache.structures = [...this.cache.structures, structureRecord].slice(-200);

    await Promise.all([
      this.writeJsonArray(this.paths.features, this.cache.features),
      this.writeJsonArray(this.paths.uiPatterns, this.cache.uiPatterns),
      this.writeJsonArray(this.paths.structures, this.cache.structures),
    ]);

    return record;
  }

  async saveOrganization(feature, organization = {}) {
    if (!this.cache.structures) {
      await this.load();
    }

    const normalizedFeature = String(feature || '').trim().toLowerCase() || 'global';
    const rawAnalysis = organization.analysis || {};
    const analysis = {
      frontend: capList(rawAnalysis.frontend),
      backend: capList(rawAnalysis.backend),
      utils: capList(rawAnalysis.utils),
      services: capList(rawAnalysis.services),
      ignoredCount: Array.isArray(rawAnalysis.ignored) ? rawAnalysis.ignored.length : 0,
    };

    const record = {
      feature: normalizedFeature,
      createdAt: new Date().toISOString(),
      projectRoot: organization.projectRoot || null,
      skipped: organization.skipped === true,
      reason: organization.reason || null,
      moved: Array.isArray(organization.moves) ? organization.moves.length : 0,
      duplicatesRemoved: Array.isArray(organization.duplicatesRemoved) ? organization.duplicatesRemoved.length : 0,
      directories: capList(organization.createdDirectories, 40),
      analysis,
      ruleFilePath: organization.ruleFilePath || null,
      ruleCount: Array.isArray(organization.rules) ? organization.rules.length : 0,
    };

    this.cache.structures = [...this.cache.structures, record].slice(-300);

    const scoreBoard = Array.isArray(organization.scoreBoard) ? organization.scoreBoard : [];
    const averageScore =
      scoreBoard.length === 0
        ? 0
        : Math.round(scoreBoard.reduce((sum, item) => sum + Number(item.score || 0), 0) / scoreBoard.length);

    if (!organization.skipped && averageScore >= 85) {
      const structurePattern = {
        feature: normalizedFeature,
        createdAt: record.createdAt,
        averageScore,
        directories: record.directories,
        rules: capList(organization.rules, 50),
      };
      this.cache.structurePatterns = [...this.cache.structurePatterns, structurePattern].slice(-150);
    }

    await Promise.all([
      this.writeJsonArray(this.paths.structures, this.cache.structures),
      this.writeJsonArray(this.paths.structurePatterns, this.cache.structurePatterns),
    ]);

    return record;
  }

  getStructurePatterns(options = {}) {
    const limit = Number(options.limit || 5);
    return (this.cache.structurePatterns || []).slice(-limit);
  }

  async saveAILearning(record = {}) {
    if (!this.cache.aiLearnings) {
      await this.load();
    }

    const normalized = {
      createdAt: record.createdAt || new Date().toISOString(),
      type: String(record.type || 'general').toLowerCase(),
      inputSummary: String(record.inputSummary || ''),
      outputSummary: String(record.outputSummary || ''),
      metadata: record.metadata || {},
    };

    this.cache.aiLearnings = [...this.cache.aiLearnings, normalized].slice(-400);
    await this.writeJsonArray(this.paths.aiLearnings, this.cache.aiLearnings);

    return normalized;
  }

  getAILearnings(options = {}) {
    const limit = Number(options.limit || 10);
    return (this.cache.aiLearnings || []).slice(-limit);
  }
}

module.exports = {
  MemoryManager,
};
