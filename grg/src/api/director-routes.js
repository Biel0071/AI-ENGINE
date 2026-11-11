'use strict';
// Rotas do Fênix Diretor (Fase 1). Ver src/missions/fenix-director.js.
const { httpStatusFor } = require('../kernel/errors');

async function handleDirectorRoutes(req, res, url, app, sendJson, readJson, cx) {
  if (!url.pathname.startsWith('/api/v2/director/')) return false;
  const director = app?.director;
  if (!director) { sendJson(res, 503, { error: 'DIRECTOR_UNAVAILABLE' }); return true; }
  const send = (status, body) => { sendJson(res, status, body); return true; };
  try {
    if (req.method === 'POST' && url.pathname === '/api/v2/director/orders') return send(202, { ok: true, ...(await director.submitOrder(cx, await readJson(req))) });
    if (req.method === 'GET' && url.pathname === '/api/v2/director/approvals') return send(200, { ok: true, ...(await director.approvalQueue(cx, { historyLimit: url.searchParams.get('historyLimit') })) });
    if (req.method === 'POST' && url.pathname === '/api/v2/director/approvals/decide') return send(200, { ok: true, ...(await director.decide(cx, await readJson(req))) });
    return send(404, { error: 'director route not found' });
  } catch (error) {
    const status = error.code === 'PROJECT_NOT_FOUND' ? 404 : (error.code === 'PROJECT_WORKSPACE_OUTSIDE_ALLOWED_ROOT' ? 403 : httpStatusFor(error));
    return send(status, { error: error.message, code: error.code || null });
  }
}

module.exports = { handleDirectorRoutes };