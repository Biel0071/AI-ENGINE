const fs = require('fs/promises');
const path = require('path');

const DEFAULT_IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  '.next',
  'coverage',
  'logs',
]);

const ENTRY_POINT_NAMES = new Set([
  'server.js',
  'server.ts',
  'main.js',
  'main.ts',
  'app.js',
  'app.ts',
  'index.js',
  'index.ts',
]);

const LEGACY_PATH_RE = /(^|\/)(future|drafts|legacy)(\/|$)/;

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function createNode() {
  return { files: [], folders: {} };
}

function addToTree(tree, relFilePath) {
  const parts = toPosix(relFilePath).split('/');
  let cursor = tree;
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    const isFile = i === parts.length - 1;
    if (isFile) {
      cursor.files.push(part);
      return;
    }
    if (!cursor.folders[part]) {
      cursor.folders[part] = createNode();
    }
    cursor = cursor.folders[part];
  }
}

function getTagsForPath(relFilePath) {
  const normalized = toPosix(relFilePath).toLowerCase();
  const name = path.basename(normalized);
  const tags = new Set();

  if (
    normalized.includes('/routes/') ||
    normalized.includes('/controllers/') ||
    /^routes\./.test(name)
  ) {
    tags.add('backend');
  }
  if (
    normalized.includes('/frontend/') ||
    normalized.includes('/views/') ||
    normalized.endsWith('.tsx') ||
    normalized.endsWith('.jsx')
  ) {
    tags.add('frontend');
  }
  if (normalized.includes('/services/') || normalized.includes('/service/')) {
    tags.add('services');
  }
  if (
    name === 'package.json' ||
    name.startsWith('tsconfig') ||
    name === '.env' ||
    normalized.includes('/config/') ||
    normalized.endsWith('.yml') ||
    normalized.endsWith('.yaml')
  ) {
    tags.add('configs');
  }
  if (normalized.includes('/api/')) {
    tags.add('api');
  }
  if (normalized.includes('/dist/')) {
    tags.add('runtime-artifact');
  }
  return Array.from(tags);
}

function isLegacyPath(relFilePath) {
  const normalized = toPosix(relFilePath).toLowerCase();
  return LEGACY_PATH_RE.test(normalized);
}

function detectStack(files) {
  const scores = new Map();

  function mark(name, sourcePath, score) {
    const current = scores.get(name) || { score: 0, sources: new Set() };
    current.score += score;
    current.sources.add(sourcePath);
    scores.set(name, current);
  }

  for (const file of files) {
    const p = file.path.toLowerCase();
    const name = path.basename(p);
    if (name === 'package.json') mark('nodejs', file.path, 0.8);
    if (name.startsWith('tsconfig') || p.endsWith('.ts') || p.endsWith('.tsx')) {
      mark('typescript', file.path, 0.6);
    }
    if (p.endsWith('.tsx') || p.endsWith('.jsx') || p.includes('/react/')) {
      mark('react', file.path, 0.7);
    }
    if (name === 'docker-compose.yml' || name === 'dockerfile') {
      mark('docker', file.path, 0.9);
    }
    if (name === 'requirements.txt' || name === 'pyproject.toml') {
      mark('python', file.path, 0.8);
    }
  }

  return Array.from(scores.entries())
    .map(([name, data]) => ({
      name,
      confidence: Math.min(1, Number((data.score / 2).toFixed(2))),
      sources: Array.from(data.sources),
    }))
    .sort((a, b) => b.confidence - a.confidence);
}

async function walkDirectory(rootPath, currentPath, files, structure, options) {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && options.ignoredDirs.has(entry.name)) {
      continue;
    }
    const absolute = path.join(currentPath, entry.name);
    const relative = toPosix(path.relative(rootPath, absolute));
    if (entry.isDirectory()) {
      await walkDirectory(rootPath, absolute, files, structure, options);
      continue;
    }

    const stat = await fs.stat(absolute);
    const tags = getTagsForPath(relative);
    files.push({
      path: relative,
      size: stat.size,
      tags,
      confidence: 1,
      sources: [relative],
    });
    addToTree(structure, relative);

    if (files.length >= options.maxFiles) {
      return;
    }
  }
}

async function scanProject(rootPath, options = {}) {
  const absoluteRoot = path.resolve(rootPath);
  const files = [];
  const structure = createNode();
  const entryPoints = [];

  const scannerOptions = {
    maxFiles: Number(options.maxFiles || 12000),
    ignoredDirs: new Set([...(options.ignoredDirs || []), ...DEFAULT_IGNORED_DIRS]),
  };

  await walkDirectory(absoluteRoot, absoluteRoot, files, structure, scannerOptions);

  for (const file of files) {
    const name = path.basename(file.path).toLowerCase();
    if (!ENTRY_POINT_NAMES.has(name)) {
      continue;
    }
    if (isLegacyPath(file.path)) {
      continue;
    }
    entryPoints.push({
      path: file.path,
      confidence: name.startsWith('index') ? 0.7 : 0.95,
      sources: [file.path],
    });
  }

  const detectedStack = detectStack(files);

  return {
    rootPath: absoluteRoot,
    files,
    structure,
    detectedStack,
    entryPoints,
    confidence: 0.9,
    sources: files.slice(0, 50).map((file) => file.path),
  };
}

module.exports = {
  scanProject,
};
