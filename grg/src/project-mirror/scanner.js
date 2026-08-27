'use strict';
/**
 * Project Mirror — Scanner
 * Analisa estaticamente um projeto no filesystem e retorna um mapa real.
 * NUNCA inventa dados. Tudo vem de fs, package.json, análise de arquivos.
 */

const fs = require('node:fs/promises');
const path = require('node:path');

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
      if (entry.isDirectory()) await walk(full);
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
  const databases = ['pg', 'mysql2', 'mongoose', 'prisma', '@supabase/supabase-js', 'sqlite3', 'better-sqlite3'].filter((d) => deps[d]);
  const ai = ['openai', 'anthropic', '@anthropic-ai/sdk', '@google/generative-ai', 'langchain'].filter((a) => deps[a]);
  return { frontend, backend, queues, databases, ai };
}

async function detectApis(projectPath, files) {
  const routes = [];
  const routeFiles = files.filter((f) => /(route|router|controller|api)\.(js|ts)$/i.test(f) || f.startsWith('src/api/') || f.startsWith('src/routes/'));
  for (const file of routeFiles.slice(0, 20)) {
    try {
      const content = await fs.readFile(path.join(projectPath, file), 'utf8');
      const matches = [...content.matchAll(/\.(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]+)['"`]/gi)];
      for (const [, method, route] of matches) {
        routes.push({ method: method.toUpperCase(), path: route, file, definedAt: file });
      }
    } catch { /* skip */ }
  }
  return routes.slice(0, 100);
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

  const byType = files.reduce((acc, f) => {
    const type = classifyFile(f);
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const tech = await detectTech(pkg);
  const [apis, services, queues] = await Promise.all([
    detectApis(absPath, files),
    detectServices(absPath, files),
    detectQueues(absPath, files, pkg),
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
    tech,
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
      count: Object.keys(pkg?.dependencies || {}).length + Object.keys(pkg?.devDependencies || {}).length,
      production: Object.keys(pkg?.dependencies || {}),
      development: Object.keys(pkg?.devDependencies || {}),
    },
    scripts: pkg?.scripts || {},
  };
}

module.exports = { scanProject };
