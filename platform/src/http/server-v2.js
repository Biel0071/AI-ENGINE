const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { ConflictError, NotFoundError } = require('../services/control-plane');
const { ForbiddenError } = require('../domain/access-control');

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error('Request body is too large');
  }
  return body ? JSON.parse(body) : {};
}

function contextFrom(request) {
  return {
    tenantId: String(request.headers['x-tenant-id'] || '').trim(),
    actorId: String(request.headers['x-user-id'] || '').trim(),
  };
}

async function serveStatic(publicRoot, pathname, response) {
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  const resolved = path.resolve(publicRoot, requested);
  if (!resolved.startsWith(path.resolve(publicRoot))) return false;
  try {
    let content = await fs.readFile(resolved);
    if (requested === 'index.html') {
      content = Buffer.from(content.toString('utf8').replace('/app.js', '/app-v2.js'));
    }
    response.writeHead(200, { 'content-type': CONTENT_TYPES[path.extname(resolved)] || 'application/octet-stream' });
    response.end(content);
    return true;
  } catch {
    return false;
  }
}

function createHttpServerV2({ service, publicRoot }) {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    try {
      if (request.method === 'GET' && url.pathname === '/health') {
        return sendJson(response, 200, { ok: true, service: 'ai-engine-control-plane', apiVersion: 2, system: 'ACEP_FENIX_OMEGA', lcr: 'ONLINE_247' });
      }
      if (!url.pathname.startsWith('/api/')) {
        const served = await serveStatic(publicRoot, url.pathname, response);
        if (!served) sendJson(response, 404, { error: 'Not found' });
        return;
      }

      const { tenantId, actorId } = contextFrom(request);
      if (!tenantId || !actorId) {
        return sendJson(response, 400, { error: 'x-tenant-id and x-user-id headers are required' });
      }

      // Existing endpoints
      if (request.method === 'GET' && url.pathname === '/api/v2/overview') {
        return sendJson(response, 200, await service.getOverviewFor(tenantId, actorId));
      }
      if (request.method === 'GET' && url.pathname === '/api/v2/projects') {
        return sendJson(response, 200, { projects: await service.listProjectsFor(tenantId, actorId) });
      }
      if (request.method === 'POST' && url.pathname === '/api/v2/projects') {
        return sendJson(response, 201, await service.registerProjectFor(tenantId, actorId, await readJson(request)));
      }
      if (request.method === 'GET' && url.pathname === '/api/v2/graph') {
        return sendJson(response, 200, await service.getGraphFor(tenantId, actorId));
      }
      if (request.method === 'GET' && url.pathname === '/api/v2/memory') {
        return sendJson(response, 200, { events: await service.getProgressiveMemory(tenantId, actorId, url.searchParams.get('projectId')) });
      }
      if (request.method === 'GET' && url.pathname === '/api/v2/members') {
        return sendJson(response, 200, { members: await service.listMembers(tenantId, actorId) });
      }
      if (request.method === 'POST' && url.pathname === '/api/v2/members') {
        return sendJson(response, 201, await service.addMember(tenantId, actorId, await readJson(request)));
      }

      // ACEP Ω∞ Endpoints
      if (request.method === 'GET' && url.pathname === '/api/v2/acep/overview') {
        return sendJson(response, 200, await service.getAcepOverview(tenantId, actorId));
      }
      if (request.method === 'GET' && url.pathname === '/api/v2/acep/maturity') {
        return sendJson(response, 200, await service.getMaturityFramework(tenantId, actorId));
      }
      if (request.method === 'POST' && url.pathname === '/api/v2/acep/simulate') {
        return sendJson(response, 200, await service.simulateMutation(tenantId, actorId, await readJson(request)));
      }
      if (request.method === 'POST' && url.pathname === '/api/v2/acep/compile') {
        return sendJson(response, 201, await service.compileMission(tenantId, actorId, await readJson(request)));
      }

      // LCR Living Cognitive Runtime Endpoints
      if (request.method === 'GET' && url.pathname === '/api/v2/lcr/status') {
        return sendJson(response, 200, await service.getLcrStatus(tenantId, actorId));
      }
      if (request.method === 'POST' && url.pathname === '/api/v2/lcr/chat') {
        return sendJson(response, 200, await service.processLcrChat(tenantId, actorId, await readJson(request)));
      }

      // Realtime Duplex Voice & Streaming Endpoints
      if (request.method === 'POST' && url.pathname === '/api/v2/lcr/realtime/session') {
        return sendJson(response, 201, await service.createRealtimeSession(tenantId, actorId, await readJson(request)));
      }
      if (request.method === 'POST' && url.pathname === '/api/v2/lcr/realtime/interrupt') {
        const body = await readJson(request);
        return sendJson(response, 200, await service.interruptRealtimeSession(tenantId, actorId, body.sessionId));
      }
      if (request.method === 'POST' && url.pathname === '/api/v2/lcr/realtime/audio') {
        const body = await readJson(request);
        return sendJson(response, 200, await service.processRealtimeAudio(tenantId, actorId, body.sessionId, body.audioChunk));
      }
      if (request.method === 'GET' && url.pathname === '/api/v2/lcr/realtime/stream') {
        const sessionId = url.searchParams.get('sessionId');
        const prompt = url.searchParams.get('prompt') || 'Olá Fênix';
        if (!sessionId) return sendJson(response, 400, { error: 'sessionId é obrigatório' });

        response.writeHead(200, {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-cache',
          'connection': 'keep-alive'
        });

        for await (const chunk of service.streamRealtimeDuplex(sessionId, prompt)) {
          response.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
        response.end();
        return;
      }

      const analysis = url.pathname.match(/^\/api\/v2\/projects\/([^/]+)\/actions\/analyze$/);
      if (request.method === 'POST' && analysis) {
        return sendJson(response, 202, await service.requestAnalysisFor(tenantId, actorId, analysis[1], await readJson(request)));
      }
      const deployment = url.pathname.match(/^\/api\/v2\/projects\/([^/]+)\/deployments$/);
      if (request.method === 'POST' && deployment) {
        return sendJson(response, 202, await service.requestDeploymentFor(tenantId, actorId, deployment[1], await readJson(request)));
      }
      const memory = url.pathname.match(/^\/api\/v2\/projects\/([^/]+)\/memory$/);
      if (request.method === 'POST' && memory) {
        return sendJson(response, 201, await service.remember(tenantId, actorId, memory[1], await readJson(request)));
      }
      return sendJson(response, 404, { error: 'Route not found' });
    } catch (error) {
      const statusCode = error instanceof ForbiddenError ? 403
        : error instanceof NotFoundError ? 404
          : error instanceof ConflictError ? 409 : 400;
      return sendJson(response, statusCode, { error: error.message || 'Unexpected error' });
    }
  });
}

module.exports = { createHttpServerV2 };
