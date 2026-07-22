const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { ConflictError, NotFoundError } = require('../services/control-plane');

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
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

function tenantIdFrom(request) {
  return String(request.headers['x-tenant-id'] || '').trim();
}

async function serveStatic(publicRoot, pathname, response) {
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  const resolved = path.resolve(publicRoot, requested);
  if (!resolved.startsWith(path.resolve(publicRoot))) return false;

  try {
    const content = await fs.readFile(resolved);
    response.writeHead(200, { 'content-type': CONTENT_TYPES[path.extname(resolved)] || 'application/octet-stream' });
    response.end(content);
    return true;
  } catch {
    return false;
  }
}

function createHttpServer({ service, publicRoot }) {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');

    try {
      if (request.method === 'GET' && url.pathname === '/health') {
        return sendJson(response, 200, { ok: true, service: 'ai-engine-control-plane' });
      }

      if (!url.pathname.startsWith('/api/')) {
        const served = await serveStatic(publicRoot, url.pathname, response);
        if (!served) sendJson(response, 404, { error: 'Not found' });
        return;
      }

      const tenantId = tenantIdFrom(request);
      if (!tenantId) return sendJson(response, 400, { error: 'x-tenant-id header is required' });

      if (request.method === 'GET' && url.pathname === '/api/v1/overview') {
        return sendJson(response, 200, await service.getOverview(tenantId));
      }
      if (request.method === 'GET' && url.pathname === '/api/v1/projects') {
        return sendJson(response, 200, { projects: await service.listProjects(tenantId) });
      }
      if (request.method === 'POST' && url.pathname === '/api/v1/projects') {
        return sendJson(response, 201, await service.registerProject(tenantId, await readJson(request)));
      }
      if (request.method === 'GET' && url.pathname === '/api/v1/graph') {
        return sendJson(response, 200, await service.getGraph(tenantId));
      }

      const analysisMatch = url.pathname.match(/^\/api\/v1\/projects\/([^/]+)\/actions\/analyze$/);
      if (request.method === 'POST' && analysisMatch) {
        return sendJson(response, 202, await service.requestAnalysis(tenantId, analysisMatch[1], await readJson(request)));
      }

      const deploymentMatch = url.pathname.match(/^\/api\/v1\/projects\/([^/]+)\/deployments$/);
      if (request.method === 'POST' && deploymentMatch) {
        return sendJson(response, 202, await service.requestDeployment(tenantId, deploymentMatch[1], await readJson(request)));
      }

      return sendJson(response, 404, { error: 'Route not found' });
    } catch (error) {
      const statusCode = error instanceof NotFoundError ? 404 : error instanceof ConflictError ? 409 : 400;
      return sendJson(response, statusCode, { error: error.message || 'Unexpected error' });
    }
  });
}

module.exports = { createHttpServer };
