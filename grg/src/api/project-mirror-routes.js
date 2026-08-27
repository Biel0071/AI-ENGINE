'use strict';
/**
 * Project Mirror API Routes
 * GET  /api/project-mirror          — snapshot do projeto ativo
 * GET  /api/project-mirror/screens  — telas descobertas
 * GET  /api/project-mirror/screen/:name — detalhe de uma tela
 * POST /api/project-mirror/scan     — força novo scan (body: { projectPath })
 */

const path = require('node:path');
const { scanProject } = require('../project-mirror/scanner');
const { extractScreens } = require('../project-mirror/screen-extractor');

// In-memory cache: one snapshot per projectPath (keyed by resolved abs path)
const cache = new Map();
const CACHE_TTL_MS = 60_000; // 1 min

async function getSnapshot(projectPath) {
  const abs = path.resolve(projectPath);
  const cached = cache.get(abs);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  const scan = await scanProject(abs);
  const screens = await extractScreens(abs, scan);
  const snapshot = { ...scan, screens };
  cache.set(abs, { ts: Date.now(), data: snapshot });
  return snapshot;
}

function resolveActiveProject(app) {
  // Use env override or fallback to the FÊNIX directory itself
  const envPath = process.env.FENIX_ACTIVE_PROJECT;
  if (envPath) return envPath;
  // Default: the directory containing this server (two levels up from src/)
  return path.resolve(__dirname, '..', '..');
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

  // GET /api/project-mirror
  if (req.method === 'GET' && url.pathname === '/api/project-mirror') {
    try {
      const projectPath = url.searchParams.get('path') || resolveActiveProject(app);
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
      const projectPath = url.searchParams.get('path') || resolveActiveProject(app);
      const snapshot = await getSnapshot(projectPath);
      sendJson(res, 200, { projectPath: snapshot.path, screens: snapshot.screens });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
    return true;
  }

  // GET /api/project-mirror/screen/:name
  const screenMatch = url.pathname.match(/^\/api\/project-mirror\/screen\/([^/]+)$/);
  if (req.method === 'GET' && screenMatch) {
    try {
      const name = decodeURIComponent(screenMatch[1]);
      const projectPath = url.searchParams.get('path') || resolveActiveProject(app);
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
      sendJson(res, 200, { screen, relatedApis, projectPath: snapshot.path });
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
      const projectPath = body.projectPath || resolveActiveProject(app);
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

module.exports = { handleProjectMirrorRoutes };
