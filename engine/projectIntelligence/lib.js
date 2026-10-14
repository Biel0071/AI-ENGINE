// FÊNIX OS — Project Intelligence 20X
// Biblioteca central: descoberta, hashing, skeleton (regex-AST leve), grafo e cache.
// Fonte de verdade: o código real. Nada aqui inventa arquitetura.
'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(__dirname, 'output');

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.data',
  '__pycache__', '.venv', 'venv', '.cache',
]);

// FASE 24 — segurança do índice: nunca armazenar valores de segredos.
const SECRET_KEY_PATTERN = /(SECRET|TOKEN|PASSWORD|PASSWD|API_?KEY|COOKIE|AUTHORIZATION|CREDENTIAL|PRIVATE_KEY)/i;
const ENV_LINE_RE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/;

function sha1(text) {
  return crypto.createHash('sha1').update(text).digest('hex');
}

function redactEnv(text) {
  return text.split('\n').map((line) => {
    const m = line.match(ENV_LINE_RE);
    if (!m) return line.replace(/(\w)/g, '·'); // não vaza conteúdo de linhas não-chave/valor
    const [, key] = m;
    if (SECRET_KEY_PATTERN.test(key)) return `${key}=<REDACTED>`;
    return `${key}=${m[2]}`;
  }).join('\n');
}

async function walk(absDir, rootAbs, acc = []) {
  let entries;
  try { entries = await fsp.readdir(absDir, { withFileTypes: true }); } catch { return acc; }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      await walk(path.join(absDir, entry.name), rootAbs, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    const abs = path.join(absDir, entry.name);
    const rel = path.relative(rootAbs, abs).split(path.sep).join('/');
    acc.push(rel);
  }
  return acc;
}

const TEXT_EXT = new Set(['.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx', '.json', '.css', '.html', '.md', '.yml', '.yaml', '.sh', '.env', '.sql', '.txt']);
const INDEXABLE = new Set([...TEXT_EXT, '.py', '.toml', '.xml', '.svg']);

function extOf(rel) { return path.extname(rel).toLowerCase(); }
function isIndexable(rel) { return INDEXABLE.has(extOf(rel)); }

// ---------- SKELETON (FASE 2/3 — estrutural sem AST completa; regex determinístico) ----------

function skeletonJs(source) {
  const sk = { imports: [], requires: [], exports: [], classes: [], functions: [], endpoints: [], events: [], stores: [] };
  const seen = new Set();
  const push = (arr, v) => { if (v && !seen.has(arr + '|' + v)) { seen.add(arr + '|' + v); arr.push(v); } };

  for (const m of source.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)) push(sk.requires, m[1]);
  for (const m of source.matchAll(/^import\s+(?:[\s\S]*?)\s*from\s+['"]([^'"]+)['"]/gm)) push(sk.imports, m[1]);
  for (const m of source.matchAll(/module\.exports(?:\.(\w+))?\s*=/g)) push(sk.exports, m[1] ? `module.exports.${m[1]}` : 'module.exports');
  for (const m of source.matchAll(/export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/g)) push(sk.exports, m[1]);
  for (const m of source.matchAll(/class\s+(\w+)/g)) push(sk.classes, m[1]);
  for (const m of source.matchAll(/function\s+(\w+)\s*\(/g)) push(sk.functions, m[1]);
  for (const m of source.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>/g)) push(sk.functions, m[1]);
  // Endpoints HTTP registrados no estilo do repo: url.pathname === '/api/x' / startsWith
  for (const m of source.matchAll(/url\.pathname\s*(?:===|startsWith)\s*'([^']+)'/g)) push(sk.endpoints, m[1]);
  for (const m of source.matchAll(/app\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/g)) push(sk.endpoints, `${m[1].toUpperCase()} ${m[2]}`);
  // Eventos (emissores/ouvintes convencionais)
  for (const m of source.matchAll(/\.(emit|on|listen)\(\s*['"`]([\w.:*-]+)['"`]/g)) push(sk.events, `${m[1]}:${m[2]}`);
  return sk;
}

function skeletonCss(source) {
  const classes = new Set();
  for (const m of source.matchAll(/\.-?[_a-zA-Z][\w-]*(?=[\s,.:{>\[])/g)) classes.add(m[0].slice(1));
  const tokens = [...source.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]);
  const media = [...source.matchAll(/@media[^{]+/g)].map((m) => m[0].trim());
  return { classes: [...classes], tokens, mediaQueries: media };
}

function skeletonHtml(source) {
  const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  const scripts = [...source.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  const links = [...source.matchAll(/<link[^>]+href="([^"]+)"/g)].map((m) => m[1]);
  const fetches = [...source.matchAll(/['"](\/api\/[^'"\s]+)['"]/g)].map((m) => m[1]);
  return { ids: [...new Set(ids)], scripts, links, apiRefs: [...new Set(fetches)] };
}

function skeletonMd(source) {
  const headings = [...source.matchAll(/^#{1,4}\s+(.+)$/gm)].map((m) => m[1].trim());
  const commands = [...source.matchAll(/```bash\n([\s\S]*?)```/g)].flatMap((m) => m[1].split('\n').filter((l) => l.trim() && !l.startsWith('#')));
  return { headings, commands: commands.map((c) => c.trim()) };
}

function skeletonJson(source) {
  try {
    const parsed = JSON.parse(source);
    const keys = parsed && typeof parsed === 'object' ? Object.keys(parsed) : [];
    return { topKeys: keys, valid: true };
  } catch { return { topKeys: [], valid: false }; }
}

function buildSkeleton(rel, source) {
  const ext = extOf(rel);
  if (ext === '.js' || ext === '.cjs' || ext === '.mjs' || ext === '.ts' || ext === '.tsx' || ext === '.jsx') return { language: 'javascript', ...skeletonJs(source) };
  if (ext === '.css') return { language: 'css', ...skeletonCss(source) };
  if (ext === '.html') return { language: 'html', ...skeletonHtml(source) };
  if (ext === '.md') return { language: 'markdown', ...skeletonMd(source) };
  if (ext === '.json') return { language: 'json', ...skeletonJson(source) };
  if (ext === '.env') return { language: 'env', security: 'values-redacted', ...skeletonEnv(source) };
  return { language: ext.slice(1) };
}

function skeletonEnv(source) {
  const keys = [];
  for (const line of source.split('\n')) {
    const m = line.match(ENV_LINE_RE);
    if (m) keys.push(SECRET_KEY_PATTERN.test(m[1]) ? `${m[1]}=<REDACTED>` : m[1]);
  }
  return { keys };
}

// ---------- CLASSIFICAÇÃO (FASE 16) ----------

function classifyFile(rel) {
  const parts = rel.split('/');
  const top = parts[0];
  if (parts.includes('node_modules')) return 'DEPENDENCY';
  if (top === 'generated') return 'GENERATED';
  if (rel.startsWith('graphify-out/') || rel.startsWith('ai-analysis/')) return 'GENERATED';
  if (/(^|\/)(\.tmp-|tmp)/.test(rel) || rel.endsWith('.log')) return 'TEMPORARY';
  if (parts.some((p) => p === 'test' || p === 'tests' || p === '__tests__') || /\.(test|spec)\.[cm]?j?s[x]?$/.test(rel)) return 'TEST';
  if (top === 'future' || top === 'crm' || rel.startsWith('engine/')) return parts.includes('legacy-root') || top === 'future' ? 'LEGACY' : 'ACTIVE';
  return 'ACTIVE';
}

function moduleOf(rel) {
  const parts = rel.split('/');
  if (parts[0] === 'grg' && parts[1] === 'src') return `grg/src/${parts[2] || ''}`;
  if (parts.length > 1 && !['package.json', 'package-lock.json'].includes(parts[1])) return `${parts[0]}/${parts[1]}`;
  return parts[0];
}

// ---------- INCREMENTAL INDEX (FASE 7) ----------

async function loadCache() {
  const file = path.join(OUTPUT_DIR, 'index-cache.json');
  try { return JSON.parse(await fsp.readFile(file, 'utf8')); } catch { return { version: 1, files: {} }; }
}

async function saveCache(cache) {
  await fsp.mkdir(OUTPUT_DIR, { recursive: true });
  await fsp.writeFile(path.join(OUTPUT_DIR, 'index-cache.json'), JSON.stringify(cache));
}

// Retorna { skeleton, changed } por arquivo; reutiliza cache quando hash não mudou.
async function indexFiles(rootAbs, relFiles) {
  const cache = await loadCache();
  const results = {};
  let reused = 0, reread = 0;
  const nextFiles = {};
  for (const rel of relFiles) {
    const abs = path.join(rootAbs, rel);
    let stat;
    try { stat = await fsp.stat(abs); } catch { continue; }
    if (stat.size > 1_500_000) { nextFiles[rel] = { hash: 'SKIP_LARGE', size: stat.size }; continue; }
    const source = await fsp.readFile(abs, 'utf8').catch(() => null);
    if (source === null) continue;
    const hash = sha1(source);
    const prev = cache.files[rel];
    if (prev && prev.hash === hash) {
      results[rel] = { skeleton: prev.skeleton, changed: false, size: stat.size, lines: prev.lines };
      nextFiles[rel] = prev;
      reused++;
    } else {
      const sk = buildSkeleton(rel, extOf(rel) === '.env' ? redactEnv(source) : source);
      const lines = source.split('\n').length;
      results[rel] = { skeleton: sk, changed: true, size: stat.size, lines };
      nextFiles[rel] = { hash, skeleton: sk, lines, indexedAt: new Date().toISOString() };
      reread++;
    }
  }
  const removed = Object.keys(cache.files).filter((f) => !nextFiles[f]);
  await saveCache({ version: 1, files: nextFiles, updatedAt: new Date().toISOString() });
  return { results, stats: { reused, reread, removedFromIndex: removed.length } };
}

// ---------- GRAPH (FASE 4) ----------

function buildGraph(indexed) {
  const edges = [];
  const fileSet = new Set(Object.keys(indexed));
  for (const [rel, info] of Object.entries(indexed)) {
    const sk = info.skeleton || {};
    const deps = [...(sk.requires || []), ...(sk.imports || [])];
    for (const dep of deps) {
      if (!dep.startsWith('.')) { edges.push({ from: rel, type: 'DEPENDS_ON_PACKAGE', to: dep }); continue; }
      const resolved = resolveLocal(dep, rel, fileSet);
      if (resolved) edges.push({ from: rel, type: 'IMPORTS', to: resolved });
      else edges.push({ from: rel, type: 'BROKEN_REFERENCE', to: dep });
    }
    for (const ep of sk.endpoints || []) edges.push({ from: rel, type: 'EXPOSES_ENDPOINT', to: ep });
    for (const ev of sk.events || []) edges.push({ from: rel, type: ev.startsWith('emit') ? 'EMITS' : 'LISTENS', to: ev });
    for (const cls of sk.classes || []) edges.push({ from: rel, type: 'DEFINES_CLASS', to: cls });
  }
  return edges;
}

function resolveLocal(dep, fromRel, fileSet) {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), dep));
  const candidates = [base, base + '.js', base + '.cjs', base + '.mjs', base + '.json', base + '.css', base + '.html', base + '.md', path.posix.join(base, 'index.js')];
  return candidates.find((c) => fileSet.has(c)) || null;
}

module.exports = {
  ROOT, OUTPUT_DIR, walk, isIndexable, sha1, redactEnv, buildSkeleton,
  classifyFile, moduleOf, indexFiles, loadCache, saveCache, buildGraph, IGNORE_DIRS,
};
