const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const fsSync = require('fs');

const IGNORE_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'dist-engine',
  'build',
  'generated',
  '.next',
  '.turbo',
  'coverage',
  '.vscode',
]);

const ROOT_KEEP_FILES = new Set([
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'tsconfig.json',
  'tsconfig.engine.json',
  'vite.config.ts',
  'vite.config.js',
  'next.config.js',
  'next.config.mjs',
  '.env',
  '.env.example',
  'README.md',
]);

const STANDARD_DIRS = [
  'src/core',
  'src/modules',
  'src/components',
  'src/pages',
  'src/services',
  'src/api',
  'src/hooks',
  'src/store',
  'src/utils',
  'src/types',
  'engine/memory',
  'engine/patterns',
  'engine/agents',
  'engine/generators',
  'engine/analyzer',
];

const DEFAULT_DYNAMIC_RULES = {
  rules: [
    { match: 'controller', target: 'src/api' },
    { match: 'service', target: 'src/services' },
    { match: 'hook', target: 'src/hooks' },
    { match: 'use', target: 'src/hooks' },
    { match: 'page', target: 'src/pages' },
    { match: 'component', target: 'src/components' },
  ],
};

function loadEngineConfig() {
  const configPath = path.resolve(__dirname, '..', '..', 'ai-engine.config.json');

  try {
    const raw = fsSync.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function normalizePart(value) {
  return String(value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase();
}

function normalizeFileName(fileName) {
  const extension = path.extname(fileName);
  const name = fileName.slice(0, fileName.length - extension.length);
  const normalized = normalizePart(name) || 'file';
  return `${normalized}${extension.toLowerCase()}`;
}

function toUnixPath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function targetRoot(filePath) {
  const normalized = toUnixPath(filePath);
  const tokens = normalized.split('/');
  if (tokens.length >= 2) {
    return `${tokens[0]}/${tokens[1]}`;
  }
  return tokens[0] || '';
}

function isSourceCodeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']).has(ext);
}

function isReactFile(filePath, content) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.tsx' && ext !== '.jsx') {
    return false;
  }

  return /react|jsx|tsx|useState|useEffect|return\s*\(/i.test(content);
}

function inferModuleName(relativePath) {
  const normalized = toUnixPath(relativePath).toLowerCase();
  const tokens = normalized.split('/').filter(Boolean);
  const skip = new Set(['src', 'backend', 'frontend', 'modules', 'module', 'pages', 'components']);

  for (const token of tokens) {
    if (token.length < 3 || skip.has(token)) {
      continue;
    }

    if (/^[a-z0-9-]+$/.test(token)) {
      return normalizePart(token);
    }
  }

  return 'shared';
}

function normalizeRule(rule = {}) {
  const match = String(rule.match || '').trim().toLowerCase();
  const target = String(rule.target || '').trim().replace(/\\/g, '/');
  if (!match || !target) {
    return null;
  }

  return { match, target };
}

function classifyByDynamicRules(relativePath, fileName, content = '', rules = []) {
  const normalizedPath = toUnixPath(relativePath).toLowerCase();
  const baseLower = fileName.toLowerCase();
  const searchable = `${normalizedPath} ${baseLower} ${String(content || '').toLowerCase()}`;

  for (const rawRule of rules) {
    const rule = normalizeRule(rawRule);
    if (!rule) {
      continue;
    }

    if (searchable.includes(rule.match)) {
      return `${rule.target}/${normalizeFileName(fileName)}`;
    }
  }

  return null;
}

function classifyTarget(relativePath, fileName, content = '', rules = []) {
  const normalizedPath = toUnixPath(relativePath).toLowerCase();
  const baseLower = fileName.toLowerCase();

  const dynamicTarget = classifyByDynamicRules(relativePath, fileName, content, rules);
  if (dynamicTarget) {
    return dynamicTarget;
  }

  if (normalizedPath.startsWith('engine/')) {
    return normalizedPath;
  }

  if (normalizedPath.includes('/memory/') || baseLower.includes('memory')) {
    return `engine/memory/${normalizeFileName(fileName)}`;
  }

  if (normalizedPath.includes('/pattern') || baseLower.includes('pattern')) {
    return `engine/patterns/${normalizeFileName(fileName)}`;
  }

  if (normalizedPath.includes('/agents/') || baseLower.includes('agent')) {
    return `engine/agents/${normalizeFileName(fileName)}`;
  }

  if (normalizedPath.includes('/generators/') || baseLower.includes('generator')) {
    return `engine/generators/${normalizeFileName(fileName)}`;
  }

  if (normalizedPath.includes('/analyzer/') || baseLower.includes('analyzer') || baseLower.includes('scanner')) {
    return `engine/analyzer/${normalizeFileName(fileName)}`;
  }

  if (baseLower.includes('controller') || baseLower.includes('route') || baseLower.includes('router')) {
    return `src/api/${normalizeFileName(fileName)}`;
  }

  if (baseLower.includes('service') || normalizedPath.includes('/services/')) {
    return `src/services/${normalizeFileName(fileName)}`;
  }

  if (baseLower.includes('hook') || baseLower.startsWith('use') || normalizedPath.includes('/hooks/')) {
    return `src/hooks/${normalizeFileName(fileName)}`;
  }

  if (baseLower.includes('store') || baseLower.includes('state') || normalizedPath.includes('/store/')) {
    return `src/store/${normalizeFileName(fileName)}`;
  }

  if (
    baseLower.includes('type') ||
    baseLower.endsWith('.d.ts') ||
    normalizedPath.includes('/types/') ||
    /interface\s+[A-Z]|type\s+[A-Z]/.test(content)
  ) {
    return `src/types/${normalizeFileName(fileName)}`;
  }

  if (baseLower.includes('util') || baseLower.includes('helper') || normalizedPath.includes('/utils/')) {
    return `src/utils/${normalizeFileName(fileName)}`;
  }

  if (baseLower.includes('orchestrator') || baseLower.includes('runtime') || baseLower.includes('engine')) {
    return `src/core/${normalizeFileName(fileName)}`;
  }

  if (isReactFile(relativePath, content)) {
    if (
      baseLower.includes('page') ||
      baseLower.includes('screen') ||
      baseLower.includes('view') ||
      normalizedPath.includes('/pages/')
    ) {
      return `src/pages/${normalizeFileName(fileName)}`;
    }

    return `src/components/${normalizeFileName(fileName)}`;
  }

  if (normalizedPath.includes('/frontend/')) {
    return `src/components/${normalizeFileName(fileName)}`;
  }

  if (normalizedPath.includes('/backend/')) {
    return `src/api/${normalizeFileName(fileName)}`;
  }

  if (isSourceCodeFile(relativePath)) {
    const moduleName = inferModuleName(relativePath);
    return `src/modules/${moduleName}/${normalizeFileName(fileName)}`;
  }

  return null;
}

function scoreFilePlacement(relativePath, targetRelativePath) {
  if (!targetRelativePath) {
    return {
      score: 45,
      status: 'unknown',
      reason: 'No matching rule',
    };
  }

  const current = toUnixPath(relativePath);
  const target = toUnixPath(targetRelativePath);

  if (current === target) {
    return {
      score: 100,
      status: 'correct',
      reason: 'Exact match',
    };
  }

  if (targetRoot(current) === targetRoot(target)) {
    return {
      score: 75,
      status: 'needs-normalization',
      reason: 'Same target area with inconsistent naming/path',
    };
  }

  return {
    score: 25,
    status: 'misplaced',
    reason: 'Outside expected target area',
  };
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function hashFile(filePath) {
  const content = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

class StructureOrganizer {
  constructor(options = {}) {
    const config = loadEngineConfig();
    const envSafeMode = String(process.env.AI_ENGINE_SAFE_MODE || '').trim().toLowerCase();
    const configSafeMode = config.SAFE_MODE !== false;
    const defaultSafeMode = envSafeMode ? envSafeMode !== 'false' : configSafeMode;

    const envAllowAuto = String(process.env.AI_ENGINE_ALLOW_AUTO_STRUCTURE_CHANGES || '').trim().toLowerCase();
    const configAllowAuto = config.allowAutoStructureChanges === true;
    const defaultAllowAuto = envAllowAuto ? envAllowAuto === 'true' : configAllowAuto;

    this.options = {
      dryRun: options.dryRun === true,
      safeMode: options.safeMode !== false && defaultSafeMode,
      allowAutoStructureChanges:
        Object.prototype.hasOwnProperty.call(options, 'allowAutoStructureChanges')
          ? options.allowAutoStructureChanges === true
          : defaultAllowAuto,
      allowEngineRepoReorganization: options.allowEngineRepoReorganization === true,
      ...options,
    };

    if (this.options.safeMode || !this.options.allowAutoStructureChanges) {
      this.options.dryRun = true;
    }
  }

  log(message) {
    if (this.options.silent === true) {
      return;
    }

    console.log(`[organizer] ${message}`);
  }

  async ensureRuleFile(projectRoot) {
    const ruleFilePath = path.join(projectRoot, 'intelligence', 'patterns', 'structure-rules.json');
    await fs.mkdir(path.dirname(ruleFilePath), { recursive: true });

    if (!(await exists(ruleFilePath))) {
      await fs.writeFile(ruleFilePath, JSON.stringify(DEFAULT_DYNAMIC_RULES, null, 2) + '\n', 'utf8');
    }

    return ruleFilePath;
  }

  mergeRules(baseRules = [], reusablePatterns = []) {
    const merged = [];
    const seen = new Set();

    const addRule = (candidate) => {
      const rule = normalizeRule(candidate);
      if (!rule) {
        return;
      }

      const key = `${rule.match}::${rule.target}`;
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      merged.push(rule);
    };

    for (const rule of baseRules) {
      addRule(rule);
    }

    for (const pattern of reusablePatterns) {
      const patternRules = Array.isArray(pattern && pattern.rules) ? pattern.rules : [];
      for (const rule of patternRules) {
        addRule(rule);
      }
    }

    return merged;
  }

  async loadDynamicRules(projectRoot, reusablePatterns = []) {
    const ruleFilePath = await this.ensureRuleFile(projectRoot);

    try {
      const raw = await fs.readFile(ruleFilePath, 'utf8');
      const parsed = JSON.parse(raw);
      const rules = Array.isArray(parsed.rules) ? parsed.rules.map(normalizeRule).filter(Boolean) : [];
      const mergedRules = this.mergeRules(rules, reusablePatterns);

      return {
        ruleFilePath,
        rules: mergedRules.length > 0 ? mergedRules : DEFAULT_DYNAMIC_RULES.rules,
        reusedPatternCount: Array.isArray(reusablePatterns) ? reusablePatterns.length : 0,
      };
    } catch {
      const mergedRules = this.mergeRules(DEFAULT_DYNAMIC_RULES.rules, reusablePatterns);
      return {
        ruleFilePath,
        rules: mergedRules,
        reusedPatternCount: Array.isArray(reusablePatterns) ? reusablePatterns.length : 0,
      };
    }
  }

  async createStandardDirs(projectRoot) {
    if (this.options.dryRun || this.options.safeMode || !this.options.allowAutoStructureChanges) {
      return;
    }

    for (const target of STANDARD_DIRS) {
      await fs.mkdir(path.join(projectRoot, target), { recursive: true });
    }
  }

  async listProject(projectRoot) {
    const folders = [];
    const files = [];

    const walk = async (currentPath) => {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && IGNORE_DIRS.has(entry.name)) {
          continue;
        }

        const absolutePath = path.join(currentPath, entry.name);
        const relativePath = path.relative(projectRoot, absolutePath);

        if (entry.isDirectory()) {
          folders.push(relativePath);
          await walk(absolutePath);
        } else {
          files.push(relativePath);
        }
      }
    };

    await walk(projectRoot);

    return {
      folders,
      files,
    };
  }

  isEngineRepositoryLayout(projectRoot, inventory) {
    const hasCore = inventory.folders.some((item) => toUnixPath(item) === 'core');
    const hasGenerators = inventory.folders.some((item) => toUnixPath(item) === 'generators');
    const hasMemory = inventory.folders.some((item) => toUnixPath(item) === 'memory');
    const hasAnalyzer = inventory.folders.some((item) => toUnixPath(item) === 'analyzer');
    const hasIndex = inventory.files.some((item) => toUnixPath(item) === 'index.js');

    if (!hasCore || !hasGenerators || !hasMemory || !hasAnalyzer || !hasIndex) {
      return false;
    }

    const rootName = path.basename(projectRoot).toLowerCase();
    return rootName.includes('ai-engine') || rootName === 'engine';
  }

  async buildPlan(projectRoot, inventory, rules = []) {
    const analysis = {
      frontend: [],
      backend: [],
      utils: [],
      services: [],
      ignored: [],
    };

    const movePlan = [];
    const scoreBoard = [];

    for (const relativeFilePath of inventory.files) {
      const normalized = toUnixPath(relativeFilePath);
      const fileName = path.basename(relativeFilePath);

      if (ROOT_KEEP_FILES.has(fileName)) {
        analysis.ignored.push(relativeFilePath);
        continue;
      }

      if (normalized.startsWith('src/') || normalized.startsWith('engine/')) {
        analysis.ignored.push(relativeFilePath);
        continue;
      }

      const absolutePath = path.join(projectRoot, relativeFilePath);
      let content = '';
      if (isSourceCodeFile(relativeFilePath)) {
        try {
          content = await fs.readFile(absolutePath, 'utf8');
        } catch {
          content = '';
        }
      }

      const targetRelativePath = classifyTarget(relativeFilePath, fileName, content, rules);
      const scoreMeta = scoreFilePlacement(relativeFilePath, targetRelativePath);

      if (!targetRelativePath) {
        analysis.ignored.push(relativeFilePath);
        scoreBoard.push({
          file: relativeFilePath,
          target: null,
          score: scoreMeta.score,
          status: scoreMeta.status,
          reason: scoreMeta.reason,
        });
        this.log(`suggested improvement ${relativeFilePath} -> no matched rule`);
        continue;
      }

      const normalizedTarget = toUnixPath(targetRelativePath);
      if (normalizedTarget.startsWith('src/components')) {
        analysis.frontend.push(relativeFilePath);
      }
      if (normalizedTarget.startsWith('src/pages')) {
        analysis.frontend.push(relativeFilePath);
      }
      if (normalizedTarget.startsWith('src/api')) {
        analysis.backend.push(relativeFilePath);
      }
      if (normalizedTarget.startsWith('src/utils')) {
        analysis.utils.push(relativeFilePath);
      }
      if (normalizedTarget.startsWith('src/services')) {
        analysis.services.push(relativeFilePath);
      }

      scoreBoard.push({
        file: relativeFilePath,
        target: targetRelativePath,
        score: scoreMeta.score,
        status: scoreMeta.status,
        reason: scoreMeta.reason,
      });

      if (toUnixPath(relativeFilePath) !== normalizedTarget || scoreMeta.score < 90) {
        movePlan.push({
          from: relativeFilePath,
          to: targetRelativePath,
          score: scoreMeta.score,
          reason: scoreMeta.reason,
        });
      } else {
        this.log(`already correct ${relativeFilePath}`);
      }
    }

    return {
      analysis,
      movePlan,
      scoreBoard,
    };
  }

  async findDuplicateGroups(projectRoot, files = []) {
    const hashMap = new Map();

    for (const relativeFilePath of files) {
      const absolutePath = path.join(projectRoot, relativeFilePath);
      if (!(await exists(absolutePath))) {
        continue;
      }

      const digest = await hashFile(absolutePath);
      if (!hashMap.has(digest)) {
        hashMap.set(digest, []);
      }

      hashMap.get(digest).push(relativeFilePath);
    }

    return Array.from(hashMap.values()).filter((group) => group.length > 1);
  }

  suggestStructureImprovements(projectAnalysis = {}) {
    const scoreBoard = Array.isArray(projectAnalysis.scoreBoard) ? projectAnalysis.scoreBoard : [];
    const duplicateGroups = Array.isArray(projectAnalysis.duplicateGroups) ? projectAnalysis.duplicateGroups : [];
    const misplacedFiles = scoreBoard.filter((item) => item.score < 90);

    const suggestions = [];
    for (const item of misplacedFiles.slice(0, 100)) {
      if (item.target) {
        suggestions.push(`Move ${item.file} to ${item.target}`);
      } else {
        suggestions.push(`Create a new rule for ${item.file}`);
      }
    }

    for (const group of duplicateGroups.slice(0, 30)) {
      suggestions.push(`Resolve duplicate files: ${group.join(', ')}`);
    }

    return {
      misplacedFiles,
      duplicateGroups,
      suggestions,
    };
  }

  async resolveCollision(projectRoot, desiredTargetRelativePath, sourceAbsolutePath) {
    const parsed = path.parse(desiredTargetRelativePath);
    let counter = 1;
    let finalRelativePath = desiredTargetRelativePath;
    let finalAbsolutePath = path.join(projectRoot, finalRelativePath);

    while (await exists(finalAbsolutePath)) {
      const sameContent = (await hashFile(finalAbsolutePath)) === (await hashFile(sourceAbsolutePath));
      if (sameContent) {
        return {
          relativePath: finalRelativePath,
          absolutePath: finalAbsolutePath,
          duplicate: true,
        };
      }

      finalRelativePath = path.join(parsed.dir, `${parsed.name}-${counter}${parsed.ext}`);
      finalAbsolutePath = path.join(projectRoot, finalRelativePath);
      counter += 1;
    }

    return {
      relativePath: finalRelativePath,
      absolutePath: finalAbsolutePath,
      duplicate: false,
    };
  }

  async applyPlan(projectRoot, movePlan) {
    const applied = [];
    const duplicatesRemoved = [];
    const preview = [];

    for (const operation of movePlan) {
      const fromAbsolutePath = path.join(projectRoot, operation.from);
      if (!(await exists(fromAbsolutePath))) {
        continue;
      }

      const collision = await this.resolveCollision(projectRoot, operation.to, fromAbsolutePath);

      if (collision.duplicate) {
        this.log(`suggested improvement duplicate ${operation.from} already in ${collision.relativePath}`);
        if (!this.options.dryRun && !this.options.safeMode && this.options.allowAutoStructureChanges) {
          await fs.rm(fromAbsolutePath, { force: true });
          duplicatesRemoved.push(operation.from);
        } else {
          preview.push({
            action: 'duplicate',
            from: operation.from,
            to: collision.relativePath,
            score: operation.score,
          });
        }
        continue;
      }

      if (this.options.dryRun || this.options.safeMode || !this.options.allowAutoStructureChanges) {
        preview.push({
          action: 'move',
          from: operation.from,
          to: collision.relativePath,
          score: operation.score,
        });
      } else {
        await fs.mkdir(path.dirname(collision.absolutePath), { recursive: true });
        await fs.rename(fromAbsolutePath, collision.absolutePath);
        this.log(`moving ${operation.from} -> ${collision.relativePath}`);
        applied.push({
          from: operation.from,
          to: collision.relativePath,
          score: operation.score,
          reason: operation.reason,
        });
      }
    }

    return {
      applied,
      duplicatesRemoved,
      preview,
    };
  }

  async organizeProject(projectPath, runOptions = {}) {
    const config = loadEngineConfig();
    const envSafeMode = String(process.env.AI_ENGINE_SAFE_MODE || '').trim().toLowerCase();
    const configSafeMode = config.SAFE_MODE !== false;
    const defaultSafeMode = envSafeMode ? envSafeMode !== 'false' : configSafeMode;

    const envAllowAuto = String(process.env.AI_ENGINE_ALLOW_AUTO_STRUCTURE_CHANGES || '').trim().toLowerCase();
    const configAllowAuto = config.allowAutoStructureChanges === true;
    const defaultAllowAuto = envAllowAuto ? envAllowAuto === 'true' : configAllowAuto;

    this.options = {
      ...this.options,
      ...runOptions,
      safeMode:
        runOptions && Object.prototype.hasOwnProperty.call(runOptions, 'safeMode')
          ? runOptions.safeMode !== false
          : this.options.safeMode !== false && defaultSafeMode,
      allowAutoStructureChanges:
        runOptions && Object.prototype.hasOwnProperty.call(runOptions, 'allowAutoStructureChanges')
          ? runOptions.allowAutoStructureChanges === true
          : this.options.allowAutoStructureChanges === true || defaultAllowAuto,
      dryRun: (runOptions && runOptions.dryRun === true) || this.options.dryRun === true,
    };

    const safeModeActive = this.options.safeMode === true;
    const structuralChangesAllowed = !safeModeActive && this.options.allowAutoStructureChanges === true;

    if (!structuralChangesAllowed) {
      this.options.dryRun = true;
      this.log('SAFE MODE ACTIVE - no structural changes applied');
    }

    const projectRoot = path.resolve(projectPath || process.cwd());

    const before = await this.listProject(projectRoot);
    const reusablePatterns = Array.isArray(runOptions.structurePatterns) ? runOptions.structurePatterns : [];
    const { ruleFilePath, rules, reusedPatternCount } = await this.loadDynamicRules(projectRoot, reusablePatterns);

    const shouldSkip =
      !this.options.allowEngineRepoReorganization &&
      this.isEngineRepositoryLayout(projectRoot, before);

    await this.createStandardDirs(projectRoot);

    if (shouldSkip) {
      const afterSkip = await this.listProject(projectRoot);
      return {
        skipped: true,
        reason: 'Detected engine repository layout. Reorganization skipped in safe mode.',
        dryRun: this.options.dryRun,
        safeModeActive,
        allowAutoStructureChanges: this.options.allowAutoStructureChanges === true,
        structuralChangesAllowed,
        projectRoot,
        ruleFilePath,
        rules,
        reusedPatternCount,
        before,
        after: afterSkip,
        analysis: {
          frontend: [],
          backend: [],
          utils: [],
          services: [],
          ignored: before.files,
        },
        createdDirectories: STANDARD_DIRS,
        moves: [],
        duplicatesRemoved: [],
        preview: [],
        scoreBoard: [],
        improvements: {
          misplacedFiles: [],
          duplicateGroups: [],
          suggestions: [],
        },
      };
    }

    const { analysis, movePlan, scoreBoard } = await this.buildPlan(projectRoot, before, rules);
    const duplicateGroups = await this.findDuplicateGroups(projectRoot, before.files);
    const improvements = this.suggestStructureImprovements({ scoreBoard, duplicateGroups });
    const applied = await this.applyPlan(projectRoot, movePlan);
    const after = await this.listProject(projectRoot);

    for (const suggestion of improvements.suggestions.slice(0, 30)) {
      this.log(`suggested improvement ${suggestion}`);
    }

    return {
      skipped: false,
      dryRun: this.options.dryRun,
      safeModeActive,
      allowAutoStructureChanges: this.options.allowAutoStructureChanges === true,
      structuralChangesAllowed,
      projectRoot,
      ruleFilePath,
      rules,
      reusedPatternCount,
      before,
      after,
      analysis,
      scoreBoard,
      improvements,
      createdDirectories: STANDARD_DIRS,
      moves: applied.applied,
      duplicatesRemoved: applied.duplicatesRemoved,
      preview: applied.preview,
      totals: {
        filesBefore: before.files.length,
        filesAfter: after.files.length,
        moved: applied.applied.length,
        duplicatesRemoved: applied.duplicatesRemoved.length,
      },
    };
  }
}

async function organizeProject(projectPath, options = {}) {
  const organizer = new StructureOrganizer(options);
  return organizer.organizeProject(projectPath, options);
}

function suggestStructureImprovements(projectAnalysis) {
  const organizer = new StructureOrganizer({ silent: true });
  return organizer.suggestStructureImprovements(projectAnalysis || {});
}

module.exports = {
  StructureOrganizer,
  organizeProject,
  suggestStructureImprovements,
};
