'use strict';
/**
 * Project Mirror API Routes
 * GET  /api/project-mirror          — snapshot do projeto ativo
 * GET  /api/project-mirror/screens  — telas descobertas
 * GET  /api/project-mirror/screen/:name — detalhe de uma tela
 * POST /api/project-mirror/scan     — força novo scan (body: { projectPath })
 */

const path = require('node:path');
const fs = require('node:fs/promises');
const { scanProject } = require('../project-mirror/scanner');
const { extractScreens } = require('../project-mirror/screen-extractor');

// In-memory cache: one snapshot per projectPath (keyed by resolved abs path)
const cache = new Map();
const CACHE_TTL_MS = 60_000; // 1 min

const PREVIEW_CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.webp': 'image/webp',
};

const pendingScans = new Map();

async function getSnapshot(projectPath) {
  const abs = path.resolve(projectPath);
  const cached = cache.get(abs);
  
  // SWR: Se tiver cache recente (10s), retorna logo
  if (cached && Date.now() - cached.ts < 10000) return cached.data;

  // Se ja tem um scan em andamento
  if (pendingScans.has(abs)) {
    // Retorna o cache stale (SWR) se existir, senao aguarda o scan
    if (cached) return cached.data;
    return pendingScans.get(abs);
  }

  // Inicia um novo scan em background
  const scanPromise = (async () => {
    try {
      const scan = await scanProject(abs);
      const screens = await extractScreens(abs, scan);
      const snapshot = { ...scan, screens };
      cache.set(abs, { ts: Date.now(), data: snapshot });
      return snapshot;
    } finally {
      pendingScans.delete(abs);
    }
  })();

  pendingScans.set(abs, scanPromise);

  // Retorna o cache stale (SWR) se existir, senao aguarda o scan novo (Cold Start)
  if (cached) return cached.data;
  return scanPromise;
}

function resolveActiveProject(app) {
  // Use env override or fallback to the FÊNIX directory itself
  const envPath = process.env.FENIX_ACTIVE_PROJECT;
  if (envPath) return envPath;
  // Default: the directory containing this server (two levels up from src/)
  return path.resolve(__dirname, '..', '..');
}

function authorizeProjectPath(projectPath, app) {
  const candidate = path.resolve(projectPath);
  const roots = [app.fileSystemService?.workspaceRoot, process.env.FENIX_ACTIVE_PROJECT].filter(Boolean).map((root) => path.resolve(root));
  if (!roots.length) return candidate;
  const allowed = roots.some((root) => {
    const relative = path.relative(root, candidate);
    return !relative.startsWith('..') && !path.isAbsolute(relative);
  });
  if (!allowed) throw new Error('project path is outside the authorized workspace');
  return candidate;
}

function resolveProjectFile(projectPath, relativeFile, app) {
  const root = authorizeProjectPath(projectPath, app);
  const fileWithoutQuery = String(relativeFile || '').split(/[?#]/)[0];
  const clean = String(fileWithoutQuery).replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
  if (!clean || path.isAbsolute(clean) || clean.split('/').includes('..')) throw new Error('valid project-relative file is required');
  const target = path.resolve(root, clean);
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('file is outside the selected project');
  return { root, target, relativeFile: clean };
}

async function discoverProjects(app) {
  const workspaceRoot = path.resolve(app.fileSystemService?.workspaceRoot || resolveActiveProject(app));
  const candidates = new Set([workspaceRoot]);
  for (const folder of ['projects', 'apps']) {
    const container = path.join(workspaceRoot, folder);
    let entries = [];
    try { entries = await fs.readdir(container, { withFileTypes: true }); } catch { /* optional */ }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const candidate = path.join(container, entry.name);
      try {
        await fs.access(path.join(candidate, 'package.json'));
        candidates.add(candidate);
      } catch { /* only expose project roots with a package manifest */ }
    }
  }
  const projects = [];
  for (const candidate of candidates) {
    const snapshot = await getSnapshot(candidate);
    projects.push({
      projectId: snapshot.projectId,
      workspaceId: snapshot.workspaceId,
      name: snapshot.name,
      path: snapshot.path,
      screens: snapshot.screens.length,
      stack: snapshot.tech,
      git: snapshot.git,
    });
  }
  return projects;
}

function rewritePreviewAssets(html, projectPath, htmlFile) {
  const baseDir = path.posix.dirname(String(htmlFile).replace(/\\/g, '/'));
  return html.replace(/\b(src|href)=(['"])([^'"#]+)\2/gi, (whole, attr, quote, rawValue) => {
    if (/^(?:https?:|data:|blob:|mailto:|javascript:)/i.test(rawValue)) return whole;
    const withoutQuery = rawValue.split('?')[0];
    if (!/\.(?:css|js|mjs|json|png|svg|webp|jpg|jpeg|gif|ico|woff2?|ttf)$/i.test(withoutQuery)) return whole;
    const assetFile = rawValue.startsWith('/')
      ? path.posix.join(baseDir, rawValue.replace(/^\/+/, ''))
      : path.posix.normalize(path.posix.join(baseDir, rawValue));
    const assetUrl = `/api/project-mirror/asset?path=${encodeURIComponent(projectPath)}&file=${encodeURIComponent(assetFile)}`;
    return `${attr}=${quote}${assetUrl}${quote}`;
  });
}

const PREVIEW_WRAPPER_CSS = `
<style id="fenix-preview-reset">
  :root {
    --bg: #0f172a; --bg2: #1e293b; --accent: #38bdf8; --text: #e2e8f0;
    --text2: #94a3b8; --border: rgba(56,189,248,0.15); --success: #22c55e;
    --warn: #f59e0b; --danger: #ef4444; --radius: 8px;
  }
  *, *::before, *::after { box-sizing: border-box; }
  html, body { background: var(--bg) !important; color: var(--text) !important;
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif !important;
    font-size: 14px; line-height: 1.6; margin: 0; padding: 16px; }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  h1,h2,h3,h4 { color: var(--text); margin: 0 0 12px; font-weight: 700; }
  h1 { font-size: 1.5rem; background: linear-gradient(135deg, var(--accent), #818cf8);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  h2 { font-size: 1.2rem; color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { background: var(--bg2); color: var(--accent); font-size: 11px; text-transform: uppercase;
    letter-spacing: .08em; padding: 8px 12px; border-bottom: 1px solid var(--border); text-align: left; }
  td { padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); color: var(--text2); }
  tr:hover td { background: rgba(56,189,248,0.05); color: var(--text); }
  input, select, textarea { background: var(--bg2) !important; border: 1px solid var(--border) !important;
    color: var(--text) !important; border-radius: var(--radius); padding: 8px 12px; width: 100%; outline: none; }
  input:focus, select:focus { border-color: var(--accent) !important; box-shadow: 0 0 0 3px rgba(56,189,248,.15); }
  button, [type=submit], [type=button] {
    background: linear-gradient(135deg, var(--accent), #6366f1) !important;
    color: #fff !important; border: none !important; border-radius: var(--radius); padding: 8px 18px;
    cursor: pointer; font-weight: 600; font-size: 13px; transition: opacity .2s; }
  button:hover { opacity: .85; }
  form { background: var(--bg2); padding: 20px; border-radius: 12px;
    border: 1px solid var(--border); margin: 12px 0; }
  ul, ol { padding-left: 20px; }
  li { color: var(--text2); margin: 4px 0; }
  li a { color: var(--accent); }
  .nav, nav { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0;
    background: var(--bg2); padding: 10px; border-radius: var(--radius); border: 1px solid var(--border); }
  .nav a, nav a { color: var(--accent); font-size: 13px; padding: 4px 10px;
    border-radius: 6px; border: 1px solid transparent; }
  .nav a:hover, nav a:hover { background: rgba(56,189,248,.12); border-color: var(--border); text-decoration: none; }
  pre, code { background: var(--bg2); color: #a5f3fc; border-radius: 6px; padding: 2px 6px;
    font-family: 'JetBrains Mono', monospace; font-size: 12px; }
  pre { padding: 12px; overflow-x: auto; border: 1px solid var(--border); }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .badge-ok { background: rgba(34,197,94,.2); color: var(--success); }
  .badge-warn { background: rgba(245,158,11,.2); color: var(--warn); }
  .badge-err { background: rgba(239,68,68,.2); color: var(--danger); }
  /* Fenix Preview Banner */
  #fenix-preview-banner {
    position: fixed; top: 0; right: 0; left: 0; z-index: 9999;
    background: linear-gradient(90deg, rgba(15,23,42,.95), rgba(30,41,59,.95));
    border-bottom: 1px solid var(--border); padding: 6px 16px;
    display: flex; align-items: center; gap: 10px; font-size: 11px; color: var(--text2);
    backdrop-filter: blur(8px);
  }
  #fenix-preview-banner .dot { width:8px;height:8px;border-radius:50%;background:var(--accent);
    box-shadow:0 0 6px var(--accent); animation: blink 1.5s infinite; }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
  body { padding-top: 40px !important; }
</style>
<div id="fenix-preview-banner">
  <div class="dot"></div>
  <span>FÊNIX Preview — API-PLATAFORM · Modo: Analisador Ativo</span>
</div>
`;

function injectPreviewStyle(html) {
  // Already has full HTML structure — just inject before </head> or before <body>
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, PREVIEW_WRAPPER_CSS + '</head>');
  if (/<body/i.test(html)) return html.replace(/<body([^>]*)>/i, `<body$1>${PREVIEW_WRAPPER_CSS}`);
  // Bare HTML — wrap it entirely
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Preview</title></head><body>${PREVIEW_WRAPPER_CSS}${html}</body></html>`;
}

async function handleProjectMirrorRoutes(req, res, url, app, sendJson, readJson, identity) {
  const { tenantId, actorId } = identity;

  // Require at least runtime:read permission
  try {
    await app.controlPlane.authorize(tenantId, actorId, 'runtime:read');
  } catch {
    sendJson(res, 403, { error: 'forbidden' });
    return true;
  }

  // GET /api/project-mirror/projects — project roots available to the visual stitcher.
  if (req.method === 'GET' && url.pathname === '/api/project-mirror/projects') {
    try {
      sendJson(res, 200, { projects: await discoverProjects(app) });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return true;
  }

  // Same-origin preview of a real project HTML file. Asset URLs are rewritten to
  // the guarded asset route, keeping iframe inspection and element selection real.
  if (req.method === 'GET' && url.pathname === '/api/project-mirror/preview') {
    try {
      const projectPath = url.searchParams.get('path') || resolveActiveProject(app);
      const { target, root, relativeFile } = resolveProjectFile(projectPath, url.searchParams.get('file'), app);
      if (path.extname(target).toLowerCase() !== '.html') throw new Error('preview requires an HTML file');
      const html = injectPreviewStyle(rewritePreviewAssets(await fs.readFile(target, 'utf8'), root, relativeFile));
      res.setHeader?.('x-frame-options', 'SAMEORIGIN');
      res.writeHead(200, { 'content-type': PREVIEW_CONTENT_TYPES['.html'], 'cache-control': 'no-store' });
      res.end(html);
    } catch (error) {
      sendJson(res, /required|outside|HTML/.test(error.message) ? 400 : 404, { error: error.message });
    }
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/project-mirror/asset') {
    try {
      const projectPath = url.searchParams.get('path') || resolveActiveProject(app);
      const { target } = resolveProjectFile(projectPath, url.searchParams.get('file'), app);
      const stat = await fs.stat(target);
      if (!stat.isFile() || stat.size > 5_000_000) throw new Error('preview asset is unavailable or exceeds 5 MB');
      const contentType = PREVIEW_CONTENT_TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream';
      res.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
      res.end(await fs.readFile(target));
    } catch (error) {
      sendJson(res, /required|outside|exceeds/.test(error.message) ? 400 : 404, { error: error.message });
    }
    return true;
  }

  // GET /api/project-mirror
  if (req.method === 'GET' && url.pathname === '/api/project-mirror') {
    try {
      const projectPath = authorizeProjectPath(url.searchParams.get('path') || resolveActiveProject(app), app);
      const snapshot = await getSnapshot(projectPath);
      // Strip full file list to keep response lean
      const { files: f, ...rest } = snapshot;
      sendJson(res, 200, {
        ...rest,
        files: { total: f.total, byType: f.byType },
      });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return true;
  }

  // GET /api/project-mirror/screens
  if (req.method === 'GET' && url.pathname === '/api/project-mirror/screens') {
    try {
      const projectPath = authorizeProjectPath(url.searchParams.get('path') || resolveActiveProject(app), app);
      const snapshot = await getSnapshot(projectPath);
      sendJson(res, 200, { projectPath: snapshot.path, screens: snapshot.screens });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return true;
  }

  // GET /api/project-mirror/source?file=public/index.html&line=120
  // Read-only source access anchored to the selected project. This is the CODE
  // pane contract; it never falls back to sample text.
  if (req.method === 'GET' && url.pathname === '/api/project-mirror/source') {
    try {
      const projectPath = authorizeProjectPath(url.searchParams.get('path') || resolveActiveProject(app), app);
      const { root, target, relativeFile } = resolveProjectFile(projectPath, url.searchParams.get('file'), app);
      const stat = await fs.stat(target);
      if (!stat.isFile()) throw new Error('source target is not a file');
      if (stat.size > 500_000) throw new Error('source file exceeds the 500 KB editor limit');
      const content = await fs.readFile(target, 'utf8');
      const requestedLine = Math.max(1, Number(url.searchParams.get('line') || 1));
      sendJson(res, 200, { projectPath: root, file: relativeFile, line: requestedLine, content, bytes: stat.size });
    } catch (error) {
      sendJson(res, /required|outside|limit/.test(error.message) ? 400 : 404, { error: error.message });
    }
    return true;
  }

  // GET /api/project-mirror/screen/:name
  const screenMatch = url.pathname.match(/^\/api\/project-mirror\/screen\/([^/]+)$/);
  if (req.method === 'GET' && screenMatch) {
    try {
      const name = decodeURIComponent(screenMatch[1]);
      const projectPath = authorizeProjectPath(url.searchParams.get('path') || resolveActiveProject(app), app);
      const snapshot = await getSnapshot(projectPath);
      const screen = snapshot.screens.find((s) => s.id === name || s.name === name);
      if (!screen) {
        sendJson(res, 404, { error: `screen not found: ${name}` });
        return true;
      }
      // Enrich with related APIs (routes that might be used by this screen)
      const relatedApis = snapshot.apis.filter((api) =>
        api.path.toLowerCase().includes(name.toLowerCase()) ||
        api.file.toLowerCase().includes(name.toLowerCase())
      );
      const projectPrefix = snapshot.git?.projectRelativePath && snapshot.git.projectRelativePath !== '.'
        ? `${snapshot.git.projectRelativePath}/`
        : '';
      const sourceFiles = (screen.sourceFiles || [{ file: screen.file, line: screen.sourceLine || 1 }]).map((source) => ({
        ...source,
        repositoryFile: `${projectPrefix}${source.file}`,
      }));
      sendJson(res, 200, {
        screen: { ...screen, sourceFiles, apiDependencies: relatedApis },
        relatedApis,
        projectPath: snapshot.path,
        projectId: snapshot.projectId,
        workspaceId: snapshot.workspaceId,
        git: snapshot.git,
      });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return true;
  }

  // POST /api/project-mirror/scan — force fresh scan
  if (req.method === 'POST' && url.pathname === '/api/project-mirror/scan') {
    try {
      // Require runtime:execute for forced scan
      await app.controlPlane.authorize(tenantId, actorId, 'runtime:execute').catch(() => {
        throw new Error('insufficient permissions for scan operation');
      });
      const body = await readJson(req);
      const projectPath = authorizeProjectPath(body.projectPath || resolveActiveProject(app), app);
      // Invalidate cache
      cache.delete(path.resolve(projectPath));
      const snapshot = await getSnapshot(projectPath);
      const { files: f, ...rest } = snapshot;
      sendJson(res, 200, {
        ...rest,
        files: { total: f.total, byType: f.byType },
        cacheInvalidated: true,
      });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return true;
  }

  return false;
}

module.exports = { handleProjectMirrorRoutes, authorizeProjectPath };
