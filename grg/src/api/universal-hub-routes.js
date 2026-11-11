'use strict';
// Rotas do FÊNIX Universal Hub (/api/v2/hub/*). Ver src/hub/universal-hub.js.
const { httpStatusFor } = require('../kernel/errors');

// Um token de ferramenta de IA (fxc_) age em nome do dono, mas só no hub e em algumas leituras.
// Aprovar, rejeitar, desfazer, deploy e administrar conexões continuam exclusivos de humanos.
const AI_CLIENT_READ_PREFIXES = ['/api/v2/hub/', '/api/v2/jobs', '/api/v2/system/status', '/api/project-mirror', '/api/v2/memory-index', '/api/me'];
function aiClientRouteDecision(method, pathname, scopes = []) {
  const m = String(method || 'GET').toUpperCase();
  const p = String(pathname || '');
  if (p.startsWith('/api/v2/hub/clients') && m !== 'GET') return { allowed: false, reason: 'Somente humanos administram conexões de IA.' };
  if (p.startsWith('/api/v2/hub/')) return { allowed: true };
  if (['GET', 'HEAD'].includes(m)) {
    return AI_CLIENT_READ_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix))
      ? { allowed: true }
      : { allowed: false, reason: 'Rota não liberada para ferramentas de IA.' };
  }
  if (m === 'POST' && p === '/api/v2/jobs') {
    return scopes.includes('jobs:submit') ? { allowed: true } : { allowed: false, reason: 'Conexão sem o escopo jobs:submit.' };
  }
  return { allowed: false, reason: 'Ação reservada a humanos (aprovação, deploy, exclusão ou administração).' };
}

async function handleUniversalHubRoutes(req, res, url, app, sendJson, readJson, cx) {
  if (!url.pathname.startsWith('/api/v2/hub/')) return false;
  const hub = app?.hub;
  if (!hub) { sendJson(res, 503, { error: 'HUB_UNAVAILABLE' }); return true; }
  const q = url.searchParams;
  const send = (status, body) => { sendJson(res, status, body); return true; };
  try {
    const p = url.pathname;
    const m = req.method;
    if (m === 'GET' && p === '/api/v2/hub/me') {
      const { UniversalHub } = require('../hub/universal-hub');
      return send(200, { ok: true, identity: UniversalHub.identity(cx), scopes: cx.aiClient?.scopes || null, tenantId: cx.tenantId, ownerUserId: cx.actorId });
    }
    if (p === '/api/v2/hub/clients') {
      if (m === 'GET') return send(200, { ok: true, clients: await hub.listClients(cx) });
      if (m === 'POST') return send(201, { ok: true, ...(await hub.createClient(cx, await readJson(req))) });
    }
    const revoke = p.match(/^\/api\/v2\/hub\/clients\/([^/]+)\/revoke$/);
    if (revoke && m === 'POST') return send(200, { ok: true, client: await hub.revokeClient(cx, decodeURIComponent(revoke[1])) });
    // LEVEL 2: indicadores de convergência (números reais derivados do estado).
    if (m === 'GET' && p === '/api/v2/hub/convergence') {
      await app.controlPlane.authorize(cx.tenantId, cx.actorId, 'runtime:read');
      const { computeConvergence } = require('../hub/convergence');
      return send(200, { ok: true, convergence: computeConvergence({ state: await app.store.read(), tenantId: cx.tenantId }) });
    }
    if (m === 'GET' && p === '/api/v2/hub/context') {
      return send(200, { ok: true, context: await hub.context(cx, { projectId: q.get('projectId'), depth: q.get('depth') || 'compact' }) });
    }
    if (p === '/api/v2/hub/knowledge') {
      if (m === 'POST') return send(201, { ok: true, knowledge: await hub.recordKnowledge(cx, await readJson(req)) });
      if (m === 'GET') {
        return send(200, { ok: true, items: await hub.searchKnowledge(cx, {
          q: q.get('q') || '', projectId: q.get('projectId'), knowledgeClass: q.get('class'), provider: q.get('provider'), limit: q.get('limit'),
        }) });
      }
    }
    if (p === '/api/v2/hub/messages') {
      if (m === 'POST') return send(201, { ok: true, message: await hub.sendMessage(cx, await readJson(req)) });
      if (m === 'GET') {
        return send(200, { ok: true, messages: await hub.inbox(cx, {
          projectId: q.get('projectId'), since: q.get('since'), type: q.get('type'), correlationId: q.get('correlationId'), limit: q.get('limit'),
        }) });
      }
    }
    if (p === '/api/v2/hub/locks') {
      if (m === 'GET') return send(200, { ok: true, locks: await hub.listLocks(cx, { projectId: q.get('projectId') }) });
      if (m === 'POST') return send(201, { ok: true, lock: await hub.acquireLock(cx, await readJson(req)) });
      if (m === 'DELETE') {
        const body = await readJson(req).catch(() => ({}));
        return send(200, { ok: true, ...(await hub.releaseLock(cx, { projectId: body.projectId || q.get('projectId'), path: body.path || q.get('path') })) });
      }
    }
    return send(404, { error: 'hub route not found' });
  } catch (error) {
    const status = httpStatusFor(error);
    return send(status, { error: error.message, code: error.code || null, ...(error.holder ? { holder: error.holder } : {}) });
  }
}

module.exports = { handleUniversalHubRoutes, aiClientRouteDecision };