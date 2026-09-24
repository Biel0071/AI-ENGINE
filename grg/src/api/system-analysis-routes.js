'use strict';
async function handleSystemAnalysisRoutes(req, res, url, app, sendJson, readJson, { tenantId, actorId }) {
  const base = '/api/system-analyses';
  if (url.pathname !== base && !url.pathname.startsWith(base + '/')) return false;
  const service = app.systemAnalyses;
  res.setHeader('cache-control', 'no-store');
  if (url.pathname === base) {
    if (req.method === 'GET') return sendJson(res, 200, { analyses: await service.list(tenantId, actorId) });
    if (req.method === 'POST') return sendJson(res, 202, await service.create(tenantId, actorId, await readJson(req)));
  }
  const match = url.pathname.match(/^\/api\/system-analyses\/([a-f0-9-]+)(?:\/(cancel|retry|artifacts)(?:\/(.+))?)?$/);
  if (match) {
    const [, id, action, file] = match;
    if (req.method === 'GET' && !action) return sendJson(res, 200, await service.get(tenantId, actorId, id));
    if (req.method === 'POST' && action === 'cancel') return sendJson(res, 202, await service.cancel(tenantId, actorId, id));
    if (req.method === 'POST' && action === 'retry') return sendJson(res, 202, await service.retry(tenantId, actorId, id));
    if (req.method === 'GET' && action === 'artifacts' && file) {
      const artifact = await service.artifact(tenantId, actorId, id, decodeURIComponent(file));
      res.writeHead(200, { 'content-type': artifact.type, 'content-length': artifact.data.length, 'content-disposition': `attachment; filename="${artifact.name.split('/').pop()}"`, 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox" });
      res.end(artifact.data); return true;
    }
  }
  return sendJson(res, 404, { error: 'Rota de análise não encontrada.' });
}
module.exports = { handleSystemAnalysisRoutes };
