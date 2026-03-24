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

function normalizeText(value = '') {
  return String(value || '').trim().toLowerCase();
}

function scoreSolution(entry = {}, criteria = {}) {
  let score = 0;

  const problemType = normalizeText(criteria.problemType);
  const solutionPattern = normalizeText(criteria.solutionPattern);
  const query = normalizeText(criteria.query);

  if (problemType && normalizeText(entry.problemType) === problemType) {
    score += 4;
  }

  if (solutionPattern && normalizeText(entry.solutionPattern).includes(solutionPattern)) {
    score += 3;
  }

  if (query) {
    const haystack = [
      entry.patternIdentified,
      entry.solutionApplied,
      entry.impact,
      entry.context && entry.context.notes ? entry.context.notes : '',
    ]
      .map((part) => normalizeText(part))
      .join(' ');

    if (haystack.includes(query)) {
      score += 2;
    }
  }

  const outcomeScore = Number(entry.outcomeScore || 0);
  score += Math.max(0, Math.min(1, outcomeScore));

  return score;
}

class MemoryManager {
  constructor(options = {}) {
    this.baseDir = options.baseDir || path.join(__dirname, '..', '..', 'engine', 'memory');
    this.patternsFile = options.patternsFile || path.join(this.baseDir, 'patterns-runtime.json');
    this.organizationsFile = options.organizationsFile || path.join(this.baseDir, 'organizations-runtime.json');
    this.decisionsFile = options.decisionsFile || path.join(this.baseDir, 'decisions-runtime.json');
    this.changesFile = options.changesFile || path.join(this.baseDir, 'changes-runtime.json');
    this.solutionLibraryFile = options.solutionLibraryFile || path.join(this.baseDir, 'solution-library-runtime.json');
  }

  async ensure() {
    await fs.mkdir(this.baseDir, { recursive: true });

    const files = [
      this.patternsFile,
      this.organizationsFile,
      this.decisionsFile,
      this.changesFile,
      this.solutionLibraryFile,
    ];
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

  async saveResolvedSolution(payload = {}) {
    await this.ensure();

    return this.append(this.solutionLibraryFile, {
      createdAt: new Date().toISOString(),
      problemType: String(payload.problemType || 'general'),
      solutionPattern: String(payload.solutionPattern || 'default-pattern'),
      patternIdentified: String(payload.patternIdentified || ''),
      solutionApplied: String(payload.solutionApplied || ''),
      context: payload.context && typeof payload.context === 'object' ? payload.context : {},
      impact: String(payload.impact || ''),
      outcomeScore: Number(payload.outcomeScore || 0.8),
      tags: Array.isArray(payload.tags) ? payload.tags : [],
    });
  }

  async searchSolutions(criteria = {}) {
    await this.ensure();

    const current = await readJson(this.solutionLibraryFile, []);
    const limit = Number(criteria.limit || 5);

    return current
      .map((entry) => ({
        ...entry,
        _score: scoreSolution(entry, criteria),
      }))
      .filter((entry) => entry._score > 0)
      .sort((left, right) => right._score - left._score)
      .slice(0, limit)
      .map(({ _score, ...entry }) => entry);
  }

  async findBestSolution(criteria = {}) {
    const solutions = await this.searchSolutions({
      ...criteria,
      limit: 1,
    });

    return solutions[0] || null;
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
