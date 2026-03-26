const fs = require('fs/promises');
const path = require('path');

async function readJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function summarizeLayers(files) {
  const counters = new Map([
    ['api', 0],
    ['services', 0],
    ['controllers', 0],
    ['ui', 0],
    ['data', 0],
  ]);

  for (const file of files) {
    const p = file.path.toLowerCase().replace(/\\/g, '/');
    if (/(^|\/)api(\/|$)/.test(p) || /(^|\/)routes(\/|$)/.test(p)) {
      counters.set('api', counters.get('api') + 1);
    }
    if (/(^|\/)service(\/|$)/.test(p) || /(^|\/)services(\/|$)/.test(p)) {
      counters.set('services', counters.get('services') + 1);
    }
    if (/(^|\/)controller(\/|$)/.test(p) || /(^|\/)controllers(\/|$)/.test(p)) {
      counters.set('controllers', counters.get('controllers') + 1);
    }
    if (/(^|\/)frontend(\/|$)/.test(p) || /(^|\/)views(\/|$)/.test(p) || p.endsWith('.tsx') || p.endsWith('.jsx')) {
      counters.set('ui', counters.get('ui') + 1);
    }
    if (/(^|\/)data(\/|$)/.test(p) || /(^|\/)repository(\/|$)/.test(p) || /(^|\/)repositories(\/|$)/.test(p)) {
      counters.set('data', counters.get('data') + 1);
    }
  }

  return Array.from(counters.entries())
    .filter(([, count]) => count > 0)
    .map(([name, count]) => ({
      name,
      files: count,
      confidence: Math.min(1, Number((0.45 + count / 80).toFixed(2))),
    }));
}

function inferFlows(layers) {
  const names = new Set(layers.map((layer) => layer.name));
  const flows = [];

  if (names.has('api') && names.has('services')) {
    flows.push({
      name: 'api-to-services',
      from: 'api',
      to: 'services',
      confidence: 0.82,
      sources: ['layer-detection:api', 'layer-detection:services'],
    });
  }
  if (names.has('services') && names.has('data')) {
    flows.push({
      name: 'services-to-data',
      from: 'services',
      to: 'data',
      confidence: 0.78,
      sources: ['layer-detection:services', 'layer-detection:data'],
    });
  }
  if (names.has('ui') && names.has('api')) {
    flows.push({
      name: 'ui-to-api',
      from: 'ui',
      to: 'api',
      confidence: 0.76,
      sources: ['layer-detection:ui', 'layer-detection:api'],
    });
  }

  return flows;
}

function detectBottlenecks(files) {
  const byFolder = new Map();
  for (const file of files) {
    const folder = path.dirname(file.path).split(path.sep).join('/');
    byFolder.set(folder, (byFolder.get(folder) || 0) + 1);
  }

  return Array.from(byFolder.entries())
    .filter(([, count]) => count >= 20)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([folder, count]) => ({
      area: folder,
      reason: 'high-file-density',
      count,
      confidence: Math.min(1, Number((0.5 + count / 120).toFixed(2))),
      sources: [folder],
    }));
}

async function detectDependencies(rootPath) {
  const packageJsonPath = path.join(rootPath, 'package.json');
  const pkg = await readJson(packageJsonPath);
  if (!pkg) {
    return [];
  }

  const deps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };

  return Object.entries(deps).map(([name, version]) => ({
    name,
    version,
    confidence: 1,
    sources: ['package.json'],
  }));
}

async function analyzeArchitecture(scanResult) {
  const layers = summarizeLayers(scanResult.files);
  const flows = inferFlows(layers);
  const dependencies = await detectDependencies(scanResult.rootPath);
  const bottlenecks = detectBottlenecks(scanResult.files);

  return {
    layers,
    flows,
    dependencies,
    bottlenecks,
    confidence: 0.83,
    sources: [
      ...(scanResult.entryPoints || []).map((entry) => entry.path),
      'package.json',
    ],
  };
}

module.exports = {
  analyzeArchitecture,
};
