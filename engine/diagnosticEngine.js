const fs = require('fs/promises');
const path = require('path');
const { builtinModules } = require('module');

const IMPORT_RE = /from\s+['\"]([^'\"]+)['\"]|require\(\s*['\"]([^'\"]+)['\"]\s*\)/g;
const NON_RUNTIME_RE = /(^|\/)(future|drafts|legacy|generated)(\/|$)/;

function isNonRuntimePath(filePath) {
  const normalized = String(filePath || '').toLowerCase().replace(/\\/g, '/');
  return NON_RUNTIME_RE.test(normalized);
}

async function readJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function detectMissingDependencies(scanResult) {
  const pkg = await readJson(path.join(scanResult.rootPath, 'package.json'));
  const deps = new Set([
    ...Object.keys((pkg && pkg.dependencies) || {}),
    ...Object.keys((pkg && pkg.devDependencies) || {}),
    ...builtinModules,
    ...builtinModules.map((name) => `node:${name}`),
  ]);

  const codeFiles = scanResult.files.filter(
    (file) => /\.(js|ts|jsx|tsx)$/.test(file.path) && !isNonRuntimePath(file.path)
  );
  const imported = new Map();

  for (const file of codeFiles.slice(0, 1200)) {
    try {
      const fullPath = path.join(scanResult.rootPath, file.path);
      const content = await fs.readFile(fullPath, 'utf8');
      let match;
      while ((match = IMPORT_RE.exec(content)) !== null) {
        const depName = match[1] || match[2];
        if (!depName || depName.startsWith('.') || depName.startsWith('/')) {
          continue;
        }
        const packageName = depName.startsWith('@')
          ? depName.split('/').slice(0, 2).join('/')
          : depName.split('/')[0];
        if (!imported.has(packageName)) {
          imported.set(packageName, new Set());
        }
        imported.get(packageName).add(file.path);
      }
    } catch {
      // Intentionally ignore unreadable files.
    }
  }

  const missing = [];
  for (const [dep, sources] of imported.entries()) {
    if (deps.has(dep)) {
      continue;
    }
    missing.push({
      dependency: dep,
      severity: 'high',
      message: `Dependencia importada sem registro no package.json: ${dep}`,
      confidence: 0.72,
      sources: Array.from(sources).slice(0, 12),
    });
  }
  return missing;
}

function detectUnusedCandidates(scanResult) {
  const patterns = ['/future/', '/drafts/', '/legacy/', '.old.', '.bak.'];
  return scanResult.files
    .filter((file) => patterns.some((pattern) => file.path.toLowerCase().includes(pattern)))
    .slice(0, 100)
    .map((file) => ({
      file: file.path,
      message: 'Arquivo em area historica/legada (candidato a codigo nao utilizado).',
      confidence: 0.45,
      sources: [file.path],
    }));
}

function detectBrokenRoutes(scanResult) {
  const routeFiles = scanResult.files.filter((file) => /route|routes/.test(file.path.toLowerCase()));
  if (routeFiles.length === 0) {
    return [];
  }

  if ((scanResult.entryPoints || []).length > 0) {
    return [];
  }

  return routeFiles.slice(0, 30).map((file) => ({
    file: file.path,
    severity: 'medium',
    message: 'Arquivo de rota sem entrypoint detectado automaticamente.',
    confidence: 0.63,
    sources: [file.path],
  }));
}

async function runDiagnostics(scanResult, architecture) {
  const missingDependencies = await detectMissingDependencies(scanResult);
  const unusedCode = detectUnusedCandidates(scanResult);
  const brokenRoutes = detectBrokenRoutes(scanResult);
  const bottlenecks = architecture.bottlenecks || [];

  const issues = [
    ...missingDependencies.map((item) => ({
      type: 'missing-dependency',
      severity: item.severity,
      message: item.message,
      confidence: item.confidence,
      sources: item.sources,
    })),
    ...brokenRoutes.map((item) => ({
      type: 'route-entrypoint-risk',
      severity: item.severity,
      message: item.message,
      confidence: item.confidence,
      sources: item.sources,
    })),
    ...bottlenecks.map((item) => ({
      type: 'bottleneck',
      severity: item.count > 80 ? 'high' : 'medium',
      message: `Possivel gargalo estrutural em ${item.area}.`,
      confidence: item.confidence,
      sources: item.sources,
    })),
  ];

  return {
    unusedCode,
    brokenRoutes,
    missingDependencies,
    bottlenecks,
    issues,
    confidence: 0.74,
    sources: issues.flatMap((issue) => issue.sources || []).slice(0, 120),
  };
}

module.exports = {
  runDiagnostics,
};
