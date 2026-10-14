'use strict';

const { MediaSearchError } = require('../media/media-search-service');

async function handleMediaRoutes(req, res, url, app, sendJson, readJson, identity) {
  const { tenantId, actorId } = identity || {};
  try {
    if (req.method === 'GET' && url.pathname === '/api/media/search') {
      await app.controlPlane.authorize(tenantId, actorId, 'runtime:read');
      const result = await app.mediaSearch.search({
        query: url.searchParams.get('query'),
        type: url.searchParams.get('type') || 'image',
        limit: url.searchParams.has('limit') ? Number(url.searchParams.get('limit')) : 8,
        source: url.searchParams.get('source') || 'wikimedia-commons',
      });
      return sendJson(res, 200, { ok: true, ...result });
    }
    if (req.method === 'GET' && url.pathname === '/api/media/assets') {
      await app.controlPlane.authorize(tenantId, actorId, 'runtime:read');
      const assets = await app.worldAssetRegistry.list(tenantId, { limit: url.searchParams.has('limit') ? Number(url.searchParams.get('limit')) : 100 });
      return sendJson(res, 200, { ok: true, assets });
    }
    if (req.method === 'POST' && url.pathname === '/api/media/assets') {
      await app.controlPlane.authorize(tenantId, actorId, 'runtime:write');
      const body = await readJson(req);
      const result = await app.worldAssetRegistry.register(tenantId, actorId, body);
      return sendJson(res, result.created ? 201 : 200, { ok: true, ...result });
    }
    return false;
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : error instanceof MediaSearchError ? error.status : 500;
    const code = error.code || (status === 500 ? 'MEDIA_ROUTE_FAILED' : 'REQUEST_REJECTED');
    return sendJson(res, status, { ok: false, error: { code, message: error.message } });
  }
}

module.exports = { handleMediaRoutes };
