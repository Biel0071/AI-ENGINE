'use strict';

const scanner = require('../projects/local-project-status-scanner');

function broadcastProjectStatus(app, statusData) {
  if (!app?.wss?.clients) return;
  const payload = JSON.stringify({
    type: 'project.status.updated',
    timestamp: Date.now(),
    data: statusData
  });
  for (const client of app.wss.clients) {
    if (client.readyState === 1 /* OPEN */) {
      try { client.send(payload); } catch (_) {}
    }
  }
}

async function handleLocalProjectManagementRoutes(req, res, url, app, sendJson, readJson, auth) {
  const { pathname } = url;
  const jsonOut = (r, code, data) => {
    if (typeof sendJson === 'function') {
      sendJson(r, code, data);
    } else {
      r.writeHead(code, { 'Content-Type': 'application/json' });
      r.end(JSON.stringify(data));
    }
    return true;
  };

  // 1. GET /api/v2/projects/catalog-status
  if (req.method === 'GET' && (pathname === '/api/v2/projects/catalog-status' || pathname === '/api/projects/catalog-status')) {
    try {
      const forceRefresh = url.searchParams.get('refresh') === 'true';
      const statusMap = await scanner.scanAll(forceRefresh);
      const list = Object.values(statusMap);
      const onlineCount = list.filter((p) => p.online).length;
      return jsonOut(res, 200, {
        ok: true,
        timestamp: Date.now(),
        total: list.length,
        scannedCount: list.length,
        onlineCount,
        offlineCount: list.length - onlineCount,
        projects: statusMap
      });
    } catch (err) {
      return jsonOut(res, 500, { ok: false, error: err.message });
    }
  }

  // 2. POST /api/v2/projects/:id/check
  const checkMatch = pathname.match(/^\/api\/v2\/projects\/([^/]+)\/check$/);
  if (req.method === 'POST' && checkMatch) {
    const projectId = decodeURIComponent(checkMatch[1]);
    try {
      const updated = await scanner.scanOne(projectId);
      if (!updated) return jsonOut(res, 404, { ok: false, error: 'Projeto não encontrado no catálogo' });
      broadcastProjectStatus(app, { [updated.id]: updated });
      return jsonOut(res, 200, { ok: true, project: updated });
    } catch (err) {
      return jsonOut(res, 500, { ok: false, error: err.message });
    }
  }

  // 3. POST /api/v2/projects/:id/start
  const startMatch = pathname.match(/^\/api\/v2\/projects\/([^/]+)\/start$/);
  if (req.method === 'POST' && startMatch) {
    const projectId = decodeURIComponent(startMatch[1]);
    try {
      const result = scanner.startProject(projectId);
      // Agenda um reteste em 2 segundos e 5 segundos para propagar status
      setTimeout(async () => {
        try {
          const retested = await scanner.scanOne(projectId);
          if (retested) broadcastProjectStatus(app, { [retested.id]: retested });
        } catch (_) {}
      }, 2000);
      setTimeout(async () => {
        try {
          const retested = await scanner.scanOne(projectId);
          if (retested) broadcastProjectStatus(app, { [retested.id]: retested });
        } catch (_) {}
      }, 5000);
      return jsonOut(res, 200, { ok: true, ...result });
    } catch (err) {
      return jsonOut(res, 400, { ok: false, error: err.message });
    }
  }

  // 4. POST /api/v2/projects/:id/open-folder
  const folderMatch = pathname.match(/^\/api\/v2\/projects\/([^/]+)\/open-folder$/);
  if (req.method === 'POST' && folderMatch) {
    const projectId = decodeURIComponent(folderMatch[1]);
    try {
      const result = scanner.openProjectFolder(projectId);
      return jsonOut(res, 200, { ok: true, ...result });
    } catch (err) {
      return jsonOut(res, 400, { ok: false, error: err.message });
    }
  }

  // 5. GET /api/v2/projects/:id/logs
  const logsMatch = pathname.match(/^\/api\/v2\/projects\/([^/]+)\/logs$/);
  if (req.method === 'GET' && logsMatch) {
    const projectId = decodeURIComponent(logsMatch[1]);
    const maxLines = parseInt(url.searchParams.get('lines') || '100', 10);
    try {
      const logs = scanner.getProjectLogs(projectId, maxLines);
      return jsonOut(res, 200, { ok: true, ...logs });
    } catch (err) {
      return jsonOut(res, 500, { ok: false, error: err.message });
    }
  }

  return false;
}

module.exports = {
  handleLocalProjectManagementRoutes,
  broadcastProjectStatus
};
