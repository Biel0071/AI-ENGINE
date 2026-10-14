'use strict';
/**
 * Project Mirror — Scanner
 * Analisa estaticamente um projeto no filesystem e retorna um mapa real.
 * NUNCA inventa dados. Tudo vem de fs, package.json, análise de arquivos.
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const runFile = promisify(execFile);

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '__pycache__', 'graphify-out', 'temp_backup', 'temp_backup2']);
const MAX_FILES = 2000;

async function walkDir(rootDir, maxFiles = MAX_FILES) {
  const files = [];
  async function walk(dir) {
    if (files.length >= maxFiles) return;
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (files.length >= maxFiles) break;
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // A nested Git checkout is another project, not part of this project's
        // mirror. It is exposed independently by the multi-project stitcher.
        try {
          await fs.access(path.join(full, '.git'));
          continue;
        } catch { /* regular directory */ }
        await walk(full);
      }
      else if (entry.isFile()) files.push(path.relative(rootDir, full).replace(/\\/g, '/'));
    }
  }
  await walk(rootDir);
  return files;
}

function classifyFile(filePath) {
  const lower = filePath.toLowerCase();
  if (/\.(test|spec)\.(js|ts|jsx|tsx|py)$/.test(lower)) return 'test';
  if (/\/(test|tests|__tests__)\//.test(lower)) return 'test';
  if (/\.(css|scss|sass|less)$/.test(lower)) return 'style';
  if (/\.(html?)$/.test(lower)) return 'html';
  if (/\.(js|mjs|cjs)$/.test(lower)) return 'js';
  if (/\.(ts|tsx)$/.test(lower)) return 'ts';
  if (/\.(jsx)$/.test(lower)) return 'jsx';
  if (/\.(py)$/.test(lower)) return 'python';
  if (/\.(go)$/.test(lower)) return 'go';
  if (/\.(json)$/.test(lower)) return 'json';
  if (/\.(md|mdx)$/.test(lower)) return 'markdown';
  if (/\.(yml|yaml)$/.test(lower)) return 'yaml';
  return 'other';
}

async function readJsonFile(filePath) {
  try { return JSON.parse(await fs.readFile(filePath, 'utf8')); } catch { return null; }
}

async function detectTech(pkg) {
  if (!pkg) return { frontend: null, backend: null, queues: [], databases: [], ai: [] };
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const frontend = deps.react ? 'react' : deps.vue ? 'vue' : deps['@angular/core'] ? 'angular' : deps.svelte ? 'svelte' : null;
  const backend = deps.express ? 'express' : deps.fastify ? 'fastify' : deps.koa ? 'koa' : deps.hono ? 'hono' : null;
  const queues = ['bullmq', 'bull', 'bee-queue', 'agenda'].filter((q) => deps[q]);
  const databases = ['pg', 'mysql2', 'mongoose', 'prisma', '@prisma/client', '@supabase/supabase-js', 'sqlite3', 'better-sqlite3'].filter((d) => deps[d]);
  const ai = ['openai', 'anthropic', '@anthropic-ai/sdk', '@google/generative-ai', '@google/genai', 'langchain'].filter((a) => deps[a]);
  return { frontend, backend, queues, databases, ai };
}

async function loadPackageInventory(projectPath, files, rootPkg) {
  const packageFiles = [...new Set(['package.json', ...files.filter((file) => /(^|\/)package\.json$/i.test(file))])];
  const packages = [];
  const dependencies = {};
  const devDependencies = {};
  for (const file of packageFiles) {
    const pkg = file === 'package.json' ? rootPkg : await readJsonFile(path.join(projectPath, file));
    if (!pkg) continue;
    Object.assign(dependencies, pkg.dependencies || {});
    Object.assign(devDependencies, pkg.devDependencies || {});
    packages.push({
      name: pkg.name || path.dirname(file).replace(/\\/g, '/'),
      version: pkg.version || null,
      file,
      dependencyCount: Object.keys(pkg.dependencies || {}).length + Object.keys(pkg.devDependencies || {}).length,
    });
  }
  return {
    packages,
    aggregate: { dependencies, devDependencies },
  };
}

async function detectApis(projectPath, files) {
  const routes = [];
  const routeFiles = files.filter((f) => /(route|router|controller|api)\.(js|ts)$/i.test(f) || /(^|\/)src\/(api|routes)\//i.test(f));
  for (const file of routeFiles.slice(0, 100)) {
    try {
      const content = await fs.readFile(path.join(projectPath, file), 'utf8');
      const lines = content.split(/\r?\n/);
      const patterns = [
        /\b(?:app|router|server|fastify|route)\s*\.\s*(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
        /req\.method\s*===?\s*['"`](GET|POST|PUT|PATCH|DELETE)['"`][^\n]*url\.pathname\s*===?\s*['"`]([^'"`]+)['"`]/gi,
      ];
      for (const pattern of patterns) {
        for (const match of content.matchAll(pattern)) {
          const offset = match.index || 0;
          const line = content.slice(0, offset).split(/\r?\n/).length;
          routes.push({ method: match[1].toUpperCase(), path: match[2], file, line, definedAt: `${file}:${line}` });
        }
      }
      for (let index = 0; index < lines.length; index += 1) {
        const method = lines[index].match(/req\.method\s*===?\s*['"`](GET|POST|PUT|PATCH|DELETE)['"`]/i)?.[1];
        const route = lines[index].match(/url\.pathname\s*===?\s*['"`]([^'"`]+)['"`]/)?.[1];
        if (method && route) routes.push({ method: method.toUpperCase(), path: route, file, line: index + 1, definedAt: `${file}:${index + 1}` });
      }
    } catch { /* skip */ }
  }
  return [...new Map(routes.map((route) => [`${route.method}:${route.path}:${route.file}`, route])).values()].slice(0, 200);
}

async function detectGit(projectPath) {
  try {
    const [{ stdout: root }, { stdout: branch }, { stdout: status }] = await Promise.all([
      runFile('git', ['rev-parse', '--show-toplevel'], { cwd: projectPath, timeout: 10_000 }),
      runFile('git', ['branch', '--show-current'], { cwd: projectPath, timeout: 10_000 }),
      runFile('git', ['status', '--short'], { cwd: projectPath, timeout: 10_000, maxBuffer: 512_000 }),
    ]);
    const repositoryRoot = path.resolve(root.trim());
    const projectRelativePath = path.relative(repositoryRoot, projectPath).replace(/\\/g, '/') || '.';
    const changes = status.trim().split(/\r?\n/).filter(Boolean);
    return { available: true, statusAvailable: true, repositoryRoot, projectRelativePath, branch: branch.trim() || null, dirty: changes.length > 0, changes: changes.slice(0, 100) };
  } catch (error) {
    let cursor = path.resolve(projectPath);
    while (true) {
      try {
        await fs.stat(path.join(cursor, '.git'));
        let branch = null;
        try {
          const head = (await fs.readFile(path.join(cursor, '.git', 'HEAD'), 'utf8')).trim();
          branch = head.startsWith('ref: refs/heads/') ? head.slice('ref: refs/heads/'.length) : null;
        } catch { /* .git may be a worktree pointer file */ }
        return {
          available: true,
          statusAvailable: false,
          repositoryRoot: cursor,
          projectRelativePath: path.relative(cursor, projectPath).replace(/\\/g, '/') || '.',
          branch,
          dirty: null,
          changes: [],
          error: `git status unavailable: ${String(error.message || error).slice(0, 240)}`,
        };
      } catch { /* keep walking */ }
      const parent = path.dirname(cursor);
      if (parent === cursor) break;
      cursor = parent;
    }
    return { available: false, statusAvailable: false, repositoryRoot: null, projectRelativePath: null, branch: null, dirty: null, changes: [], error: String(error.message || error).slice(0, 300) };
  }
}

async function detectServices(projectPath, files) {
  const services = [];
  const svcFiles = files.filter((f) => /\/(service|services|worker|workers)\//i.test(f) && /\.(js|ts)$/.test(f));
  for (const file of svcFiles.slice(0, 30)) {
    const name = path.basename(file, path.extname(file));
    services.push({ name, file, type: /worker/i.test(file) ? 'worker' : 'service' });
  }
  return services;
}

async function detectQueues(projectPath, files, pkg) {
  const deps = { ...pkg?.dependencies, ...pkg?.devDependencies };
  if (!deps.bullmq && !deps.bull) return [];
  const queueFiles = files.filter((f) => /queue/i.test(f) && /\.(js|ts)$/.test(f));
  const queues = [];
  for (const file of queueFiles.slice(0, 10)) {
    try {
      const content = await fs.readFile(path.join(projectPath, file), 'utf8');
      const names = [...content.matchAll(/new\s+(?:Queue|Worker)\s*\(\s*['"`]([^'"`]+)['"`]/g)].map(([, n]) => n);
      for (const name of names) queues.push({ name, file, engine: deps.bullmq ? 'bullmq' : 'bull' });
    } catch { /* skip */ }
  }
  return [...new Map(queues.map((q) => [q.name, q])).values()];
}

/**
 * Main scanner function.
 * @param {string} projectPath - Absolute path to the project root.
 * @returns {Promise<object>} ProjectMirror snapshot.
 */
async function scanProject(projectPath) {
  const startedAt = Date.now();
  const absPath = path.resolve(projectPath);

  // Verify the path exists
  try { await fs.access(absPath); } catch {
    throw new Error(`Project path not accessible: ${absPath}`);
  }

  const [files, pkg] = await Promise.all([
    walkDir(absPath),
    readJsonFile(path.join(absPath, 'package.json')),
  ]);
  const packageInventory = await loadPackageInventory(absPath, files, pkg);

  const byType = files.reduce((acc, f) => {
    const type = classifyFile(f);
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const tech = await detectTech(packageInventory.aggregate);
  const [apis, services, queues, git] = await Promise.all([
    detectApis(absPath, files),
    detectServices(absPath, files),
    detectQueues(absPath, files, packageInventory.aggregate),
    detectGit(absPath),
  ]);

  const testFiles = files.filter((f) => classifyFile(f) === 'test');
  const workers = services.filter((s) => s.type === 'worker');
  const svcList = services.filter((s) => s.type === 'service');

  const scannedAt = new Date().toISOString();
  const durationMs = Date.now() - startedAt;

  return {
    scannedAt,
    durationMs,
    path: absPath,
    name: pkg?.name || path.basename(absPath),
    version: pkg?.version || null,
    description: pkg?.description || null,
    projectId: `${pkg?.name || path.basename(absPath)}:${Buffer.from(absPath).toString('base64url').slice(0, 16)}`,
    workspaceId: Buffer.from(absPath).toString('base64url').slice(0, 32),
    git,
    tech,
    packages: packageInventory.packages,
    files: {
      total: files.length,
      byType,
      list: files, // full list available for detailed inspection
    },
    apis: apis.slice(0, 100),
    services: svcList,
    workers,
    queues,
    tests: {
      count: testFiles.length,
      files: testFiles,
    },
    dependencies: {
      count: Object.keys(packageInventory.aggregate.dependencies).length + Object.keys(packageInventory.aggregate.devDependencies).length,
      production: Object.keys(packageInventory.aggregate.dependencies),
      development: Object.keys(packageInventory.aggregate.devDependencies),
    },
    scripts: pkg?.scripts || {},
    designSystem: {
      sourceFiles: files.filter((file) => /(^|\/)(design-system|tokens|theme|variables|unified)\.(css|scss|sass|less|js|ts)$/i.test(file)).slice(0, 30),
    },
    runtime: {
      docker: files.filter((file) => /(^|\/)(docker-compose[^/]*\.ya?ml|Dockerfile)$/i.test(file)).slice(0, 20),
      scripts: Object.keys(pkg?.scripts || {}),
    },
  };
}

module.exports = { scanProject, detectApis, detectGit, loadPackageInventory };
