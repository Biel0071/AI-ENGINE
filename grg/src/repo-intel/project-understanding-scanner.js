'use strict';

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const IGNORED_DIRECTORIES = new Set([
  '.git', 'node_modules', '.next', '.nuxt', 'dist', 'build', 'coverage',
  'logs', 'tmp', 'vendor', '.venv', 'venv', '__pycache__'
]);
const IGNORED_FILES = /^(?:\.env(?:\..*)?|.*\.(?:pem|key|p12|pfx|crt|cer|der)|id_rsa(?:\.pub)?|credentials(?:\..*)?|secrets?(?:\..*)?)$/i;
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts']);
const MAX_SOURCE_BYTES = 256 * 1024;
const MAX_TOTAL_SOURCE_BYTES = 8 * 1024 * 1024;

class ProjectUnderstandingScanner {
  constructor(options = {}) {
    this.maxFiles = Number.isInteger(options.maxFiles) && options.maxFiles > 0 ? options.maxFiles : 25000;
  }

  async scan(rootPath) {
    const absoluteRoot = await fs.realpath(path.resolve(rootPath));
    const files = [];
    let truncated = false;
    const walk = async (relativeDirectory = '') => {
      if (files.length >= this.maxFiles) { truncated = true; return; }
      const directory = path.join(absoluteRoot, relativeDirectory);
      let entries;
      try { entries = await fs.readdir(directory, { withFileTypes: true }); } catch { return; }
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (files.length >= this.maxFiles) { truncated = true; break; }
        if (entry.isSymbolicLink()) continue;
        const relative = path.posix.join(relativeDirectory.split(path.sep).join('/'), entry.name).replace(/^\.\//, '');
        if (entry.isDirectory()) {
          if (!IGNORED_DIRECTORIES.has(entry.name.toLowerCase())) await walk(relative);
        } else if (entry.isFile() && !IGNORED_FILES.test(entry.name)) {
          let stat;
          try { stat = await fs.stat(path.join(absoluteRoot, relative)); } catch { continue; }
          files.push({ path: relative, name: entry.name, extension: path.extname(entry.name).toLowerCase(), size: stat.size });
        }
      }
    };
    await walk();

    const filePaths = new Set(files.map((file) => file.path));
    const evidence = [];
    const warnings = [];
    const packageFiles = files.filter((file) => file.name === 'package.json');
    const dependencies = [];
    for (const file of packageFiles) {
      const manifest = await this.readJson(absoluteRoot, file, warnings);
      if (!manifest) continue;
      for (const section of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
        const entries = manifest[section];
        if (!entries || typeof entries !== 'object' || Array.isArray(entries)) continue;
        for (const [name, version] of Object.entries(entries)) {
          dependencies.push({ name, version: safeVersion(version), section, manifest: file.path });
        }
      }
    }
    dependencies.sort((a, b) => a.name.localeCompare(b.name) || a.manifest.localeCompare(b.manifest));

    const detectedStack = this.detectStack(files, dependencies);
    const entryPoints = this.findEntryPoints(filePaths);
    const tests = files.filter((file) => /(^|\/)(?:test|tests|__tests__)(\/|$)/i.test(file.path) || /\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(file.name))
      .map((file) => ({ path: file.path, status: 'NOT_RUN', evidence: 'test file exists' }));
    const components = files.filter((file) => ['.jsx', '.tsx', '.vue', '.svelte'].includes(file.extension) && (/\/components?\//i.test(`/${file.path}`) || /\/pages?\//i.test(`/${file.path}`) || /\/(?:app)\//i.test(`/${file.path}`)))
      .map((file) => { const name = path.basename(file.name, file.extension); return { path: file.path, file: file.path, name, componentName: name, evidence: 'component-like source path and extension' }; });

    const sourceContents = new Map();
    const sourceEvidence = [];
    let sourceBytes = 0;
    let sourceCoverageTruncated = false;
    let sourceReadFailures = 0;
    for (const file of files) {
      if (!SOURCE_EXTENSIONS.has(file.extension)) continue;
      const remaining = MAX_TOTAL_SOURCE_BYTES - sourceBytes;
      if (remaining <= 0 && file.size > 0) {
        sourceCoverageTruncated = true;
        sourceEvidence.push(sourceObservation(file, Buffer.alloc(0), false));
        continue;
      }
      const bytesToRead = Math.min(file.size, MAX_SOURCE_BYTES, remaining);
      if (bytesToRead < file.size) sourceCoverageTruncated = true;
      try {
        const handle = await fs.open(path.join(absoluteRoot, file.path), 'r');
        const buffer = Buffer.alloc(bytesToRead);
        let bytesRead = 0;
        try { ({ bytesRead } = await handle.read(buffer, 0, bytesToRead, 0)); } finally { await handle.close(); }
        const observedBytes = buffer.subarray(0, bytesRead);
        const content = observedBytes.toString('utf8');
        sourceContents.set(file.path, content);
        sourceBytes += bytesRead;
        sourceEvidence.push(sourceObservation(file, observedBytes, bytesRead === file.size));
        if (bytesRead !== file.size) sourceCoverageTruncated = true;
      } catch {
        sourceReadFailures += 1;
        sourceEvidence.push({ path: file.path, observedBytes: 0, coverage: 'UNAVAILABLE', sha256: null, observedPrefixSha256: null });
        warnings.push(`Could not read source file: ${file.path}`);
      }
    }
    const imports = [];
    const routes = [];
    for (const [sourcePath, content] of sourceContents) {
      for (const match of content.matchAll(/\b(?:import\s+(?:[^'";]+?\s+from\s+)?|export\s+[^'";]+?\s+from\s+|require\s*\(|import\s*\()(['"])(\.{1,2}\/[^'"\n]+)\1\s*\)?/g)) {
        const specifier = match[2];
        const target = resolveLocalImport(sourcePath, specifier, filePaths);
        if (target) imports.push({ from: sourcePath, to: target, specifier });
      }
      for (const match of content.matchAll(/\b(?:app|router|server|fastify|api)\s*\.\s*(get|post|put|patch|delete|head|options)\s*\(\s*(['"`])([^'"`\n]+)\2/gi)) {
        routes.push({ method: match[1].toUpperCase(), path: match[3].split('?')[0].slice(0, 256), file: sourcePath, evidence: 'literal route declaration' });
      }
      for (const match of content.matchAll(/\breq\.method\s*===?\s*(['"])(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\1[\s\S]{0,240}?\burl\.pathname\s*===?\s*(['"])([^'"\n]+)\3/gi)) {
        routes.push({ method: match[2].toUpperCase(), path: match[4].split('?')[0].slice(0, 256), file: sourcePath, evidence: 'request method and pathname condition' });
      }
    }
    imports.sort((a, b) => `${a.from}:${a.to}`.localeCompare(`${b.from}:${b.to}`));
    routes.sort((a, b) => `${a.method}:${a.path}:${a.file}`.localeCompare(`${b.method}:${b.path}:${b.file}`));
    const routeKeys = new Set();
    const uniqueRoutes = routes.filter((route) => {
      const key = `${route.method}\0${route.path}\0${route.file}`;
      if (routeKeys.has(key)) return false;
      routeKeys.add(key);
      return true;
    });

    const databaseFiles = files.filter((file) => /\.(?:prisma|sql)$/i.test(file.name) || /(^|\/)migrations?\//i.test(file.path));
    const databasePackages = dependencies.filter((dependency) => /^(?:pg|postgres|mysql2?|better-sqlite3|sqlite3|mongoose|prisma|@prisma\/client|sequelize|typeorm|knex)$/i.test(dependency.name));
    const database = {
      status: databaseFiles.length || databasePackages.length ? 'EVIDENCE_FOUND' : 'NOT_DETECTED',
      type: databaseFiles.some((file) => file.extension === '.prisma') ? 'Prisma schema file' : databaseFiles.some((file) => file.extension === '.sql') ? 'SQL schema file' : databasePackages.length ? 'Driver declared; runtime not verified' : 'Unknown',
      schemaFiles: databaseFiles.map((file) => file.path),
      declaredPackages: databasePackages.map((item) => item.name)
    };
    const integrations = dependencies.filter((dependency) => /openai|anthropic|@google\/generative-ai|stripe|baileys|whatsapp|supabase|firebase|redis|amqplib|bullmq/i.test(dependency.name))
      .map((dependency) => ({ name: dependency.name, manifest: dependency.manifest, evidence: `declared in ${dependency.section}` }));
    const observationDigest = createObservationDigest(files, sourceEvidence, {
      detectedStack, dependencies, entryPoints, routes: uniqueRoutes, database, components, tests, imports, integrations
    });

    const systemMap = { nodes: [], edges: [] };
    const addNode = (id, type, label, metadata = {}) => systemMap.nodes.push({ id, type, label, metadata });
    addNode('project:root', 'PROJECT', path.basename(absoluteRoot), { evidence: 'workspace root', observationDigest });
    const sourceEvidenceByPath = new Map(sourceEvidence.map((item) => [item.path, item]));
    for (const file of files) {
      const observed = sourceEvidenceByPath.get(file.path);
      addNode(`file:${file.path}`, 'FILE', file.path, {
        bytes: file.size,
        evidence: 'filesystem inventory',
        ...(observed ? { contentEvidenceId: observed.evidenceId || null, contentSha256: observed.sha256, contentCoverage: observed.coverage } : {})
      });
    }
    for (const file of components) addNode(`component:${file.path}`, 'COMPONENT', file.name, { path: file.path, evidence: file.evidence });
    for (const file of tests) addNode(`test:${file.path}`, 'TEST', file.path, { status: file.status, evidence: file.evidence });
    for (const route of uniqueRoutes) addNode(`api:${route.method}:${route.path}:${route.file}`, 'API', `${route.method} ${route.path}`, { file: route.file, evidence: route.evidence });
    for (const dependency of dependencies) addNode(`dependency:${dependency.name}`, 'DEPENDENCY', dependency.name, { version: dependency.version, manifest: dependency.manifest, evidence: `declared in ${dependency.section}` });
    for (const file of files) systemMap.edges.push({ from: 'project:root', to: `file:${file.path}`, type: 'CONTAINS' });
    for (const component of components) systemMap.edges.push({ from: `file:${component.path}`, to: `component:${component.path}`, type: 'IMPLEMENTS' });
    for (const item of tests) systemMap.edges.push({ from: `file:${item.path}`, to: `test:${item.path}`, type: 'TEST_FILE' });
    for (const route of uniqueRoutes) systemMap.edges.push({ from: `file:${route.file}`, to: `api:${route.method}:${route.path}:${route.file}`, type: 'DECLARES' });
    for (const dependency of dependencies) systemMap.edges.push({ from: `file:${dependency.manifest}`, to: `dependency:${dependency.name}`, type: 'DECLARES_DEPENDENCY' });
    for (const edge of imports) systemMap.edges.push({ from: `file:${edge.from}`, to: `file:${edge.to}`, type: 'IMPORTS' });
    evidence.push(...[
      { kind: 'filesystem', items: files.length, status: truncated ? 'PARTIAL' : 'OBSERVED' },
      { kind: 'source', items: sourceContents.size, status: sourceCoverageTruncated || sourceReadFailures > 0 ? 'PARTIAL' : 'OBSERVED' },
      { kind: 'package-manifest', items: packageFiles.length, status: packageFiles.length ? 'OBSERVED' : 'NOT_FOUND' }
    ]);

    return {
      status: 'PARTIAL_OBSERVATION',
      coverage: {
        status: truncated || sourceCoverageTruncated || sourceReadFailures > 0 ? 'PARTIAL' : 'OBSERVED',
        truncated,
        sourceCoverageTruncated,
        sourceReadFailures,
        filesObserved: files.length,
        sourceFilesObserved: sourceEvidence.length,
        sourceFilesRead: sourceContents.size,
        sourceBytesRead: sourceBytes,
        fileLimit: this.maxFiles
      },
      observationDigest,
      sourceEvidence,
      targetContentUntrusted: true,
      totalFiles: files.length,
      files: files.map(({ path: filePath, extension, size }) => ({ path: filePath, extension, size })),
      detectedStack,
      dependencies,
      entryPoints,
      routes: uniqueRoutes,
      database,
      components,
      tests,
      imports,
      moduleGraph: { nodes: files.filter((file) => SOURCE_EXTENSIONS.has(file.extension)).map((file) => file.path), edges: imports },
      integrations,
      evidence,
      warnings,
      systemMap,
      scannedAt: new Date().toISOString()
    };
  }

  async readJson(root, file, warnings) {
    if (file.size > 1024 * 1024) {
      warnings.push(`Manifest exceeds the 1 MiB read limit: ${file.path}`);
      return null;
    }
    try {
      const content = await fs.readFile(path.join(root, file.path), 'utf8');
      return JSON.parse(content);
    } catch {
      warnings.push(`Could not parse manifest: ${file.path}`);
      return null;
    }
  }

  detectStack(files, dependencies = []) {
    const names = new Set(dependencies.map((item) => item.name));
    const result = [];
    const add = (name, evidence) => result.push({ name, confidence: 1, evidence });
    if (files.some((file) => file.name === 'package.json')) add('nodejs', 'package.json exists');
    if (names.has('react')) add('react', 'react dependency declared in package manifest');
    if (names.has('next')) add('nextjs', 'next dependency declared in package manifest');
    if (names.has('vite')) add('vite', 'vite dependency declared in package manifest');
    if (files.some((file) => file.extension === '.ts' || file.extension === '.tsx' || file.name.startsWith('tsconfig'))) add('typescript', 'TypeScript source or config file exists');
    if (files.some((file) => file.extension === '.vue')) add('vue', 'Vue source file exists');
    if (files.some((file) => file.name === 'Dockerfile' || file.name === 'docker-compose.yml' || file.name === 'compose.yaml')) add('docker', 'Docker configuration file exists');
    if (files.some((file) => file.extension === '.py' || file.name === 'pyproject.toml' || file.name === 'requirements.txt')) add('python', 'Python source or manifest exists');
    return result;
  }

  findEntryPoints(filePaths) {
    const candidates = ['index.js', 'index.ts', 'server.js', 'server.ts', 'main.js', 'main.ts', 'app.js', 'app.ts', 'src/main.tsx', 'src/App.tsx', 'src/index.tsx'];
    return [...filePaths].filter((filePath) => candidates.includes(filePath) || candidates.includes(path.posix.basename(filePath))).map((filePath) => ({ path: filePath, evidence: 'conventional entry file name' }));
  }
}

function sourceObservation(file, bytes, complete) {
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  const identity = crypto.createHash('sha256').update(`${file.path}\0${complete ? digest : `prefix:${bytes.length}:${digest}`}`).digest('hex');
  return {
    evidenceId: `ev_source_${identity}`,
    path: file.path,
    observedBytes: bytes.length,
    coverage: complete ? 'COMPLETE' : 'PARTIAL',
    sha256: complete ? digest : null,
    observedPrefixSha256: complete ? null : digest
  };
}

function createObservationDigest(files, sourceEvidence, findings) {
  const inventory = files.map(({ path: filePath, extension, size }) => ({ path: filePath, extension, size }));
  return crypto.createHash('sha256')
    .update(JSON.stringify({ schemaVersion: 1, inventory, sourceEvidence, findings }))
    .digest('hex');
}

function resolveLocalImport(source, specifier, filePaths) {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(source), specifier));
  if (base.startsWith('../') && base.split('/')[0] === '..') return null;
  const candidates = [base, ...['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.json'].map((extension) => `${base}${extension}`), ...['index.js', 'index.jsx', 'index.ts', 'index.tsx'].map((name) => `${base}/${name}`)];
  return candidates.find((candidate) => filePaths.has(candidate)) || null;
}

function safeVersion(value) {
  const declaration = String(value ?? '');
  return /^[\w.*+^~<>=| -]{1,64}$/.test(declaration) ? declaration : '[non-standard declaration]';
}

module.exports = { ProjectUnderstandingScanner };
