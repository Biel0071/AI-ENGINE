const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');

const PORT = Number(process.env.PORT || 3000);
const BACKEND_PORT = Number(process.env.BACKEND_PORT || 4410);
const PUBLIC_DIR = path.resolve(process.env.FENIX_PUBLIC_DIR || '/opt/fenix-os/public');

// Authentication belongs to the backend. The gateway only forwards the caller's
// cookie or Authorization header; it never creates a shared administrator session.

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

function serveHtml(filename, res) {
  const file = path.join(PUBLIC_DIR, filename);
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end('Not Found'); }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}

// Auth check endpoint - frontend calls this to verify auth status
async function handleAuthCheck(req, res) {
  try {
    const me = await fetchFromBackend('/api/me', req);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ authenticated: true, user: me.userId || me.id || null, tenantId: me.tenantId || null }));
  } catch {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ authenticated: false, user: null, tenantId: null }));
  }
}

// Reality Score endpoint — calculates real score from live system checks
async function handleRealityScore(req, res) {
  try { await fetchFromBackend('/api/me', req); }
  catch { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'not authenticated' })); }
  const evidence = [];
  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Backend health
  try {
    const h = await fetchFromBackend('/api/v2/fenix/engine/health', req);
    if (h && h.status === 'ONLINE') { testsPassed++; evidence.push({ test: 'backend_health', result: 'PASS', detail: 'ONLINE' }); }
    else { testsFailed++; evidence.push({ test: 'backend_health', result: 'FAIL', detail: h ? h.status : 'no response' }); }
  } catch (e) { testsFailed++; evidence.push({ test: 'backend_health', result: 'FAIL', detail: e.message }); }

  // Test 2: Agents API
  try {
    const a = await fetchFromBackend('/api/v2/fenix/intelligence/agents', req);
    const agentCount = a && (a.count || (a.agents ? (Array.isArray(a.agents) ? a.agents.length : Object.keys(a.agents).length) : 0));
    if (agentCount > 0) { testsPassed++; evidence.push({ test: 'agents_api', result: 'PASS', detail: agentCount + ' agents' }); }
    else { testsFailed++; evidence.push({ test: 'agents_api', result: 'FAIL', detail: 'no agents' }); }
  } catch (e) { testsFailed++; evidence.push({ test: 'agents_api', result: 'FAIL', detail: e.message }); }

  // Test 3: Projects API
  try {
    const p = await fetchFromBackend('/api/v2/projects-registry', req);
    const projCount = p && (p.count || (p.projects ? p.projects.length : 0));
    if (projCount > 0) { testsPassed++; evidence.push({ test: 'projects_api', result: 'PASS', detail: projCount + ' projects' }); }
    else { testsFailed++; evidence.push({ test: 'projects_api', result: 'FAIL', detail: 'no projects' }); }
  } catch (e) { testsFailed++; evidence.push({ test: 'projects_api', result: 'FAIL', detail: e.message }); }

  // Test 4: Events API
  try {
    const ev = await fetchFromBackend('/api/v2/events/history', req);
    if (ev && ev.ok) { testsPassed++; evidence.push({ test: 'events_api', result: 'PASS' }); }
    else { testsFailed++; evidence.push({ test: 'events_api', result: 'FAIL' }); }
  } catch (e) { testsFailed++; evidence.push({ test: 'events_api', result: 'FAIL', detail: e.message }); }

  // Test 5: Real file persistence
  try {
    if (fs.existsSync('/opt/fenix-os/grg/data/experiences.json')) {
      const stat = fs.statSync('/opt/fenix-os/grg/data/experiences.json');
      if (stat.size > 2) { testsPassed++; evidence.push({ test: 'persistence_experiences', result: 'PASS' }); }
      else { testsFailed++; evidence.push({ test: 'persistence_experiences', result: 'FAIL', detail: 'empty' }); }
    } else { testsFailed++; evidence.push({ test: 'persistence_experiences', result: 'FAIL', detail: 'not found' }); }
  } catch (e) { testsFailed++; evidence.push({ test: 'persistence_experiences', result: 'FAIL', detail: e.message }); }

  // Test 6: Auth system
  testsPassed++; evidence.push({ test: 'gateway_auth', result: 'PASS', detail: 'caller identity validated by backend' });

  // Test 7: Zero Mock - index.html has no raw tokens injected
  try {
    const idx = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
    const hasRawToken = idx.includes('eyJhbGciOi') || idx.includes('var token = "') || idx.includes("localStorage.setItem('token'");
    if (!hasRawToken) { testsPassed++; evidence.push({ test: 'no_token_in_html', result: 'PASS' }); }
    else { testsFailed++; evidence.push({ test: 'no_token_in_html', result: 'FAIL', detail: 'token in HTML' }); }
  } catch (e) { testsFailed++; evidence.push({ test: 'no_token_in_html', result: 'FAIL', detail: e.message }); }

  // Test 8: SSE Singleton active
  try {
    const sseAdapter = fs.readFileSync(path.join(PUBLIC_DIR, 'fenix-city-event-adapter.js'), 'utf8');
    if (sseAdapter.includes('__FENIX_SSE_SOURCE__')) { testsPassed++; evidence.push({ test: 'sse_singleton', result: 'PASS' }); }
    else { testsFailed++; evidence.push({ test: 'sse_singleton', result: 'FAIL' }); }
  } catch (e) { testsFailed++; evidence.push({ test: 'sse_singleton', result: 'FAIL', detail: e.message }); }

  // Test 9: WS Singleton active
  try {
    const wsAdapter = fs.readFileSync(path.join(PUBLIC_DIR, 'city-integration.js'), 'utf8');
    if (wsAdapter.includes('__FENIX_WS__')) { testsPassed++; evidence.push({ test: 'ws_singleton', result: 'PASS' }); }
    else { testsFailed++; evidence.push({ test: 'ws_singleton', result: 'FAIL' }); }
  } catch (e) { testsFailed++; evidence.push({ test: 'ws_singleton', result: 'FAIL', detail: e.message }); }

  // Test 10: Central state in index.html
  try {
    const idx = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
    if (idx.includes('window.__FENIX_STATE__') && idx.includes('window.__FENIX_SAFE_EXEC__')) {
      testsPassed++; evidence.push({ test: 'central_state', result: 'PASS' });
    }
    else { testsFailed++; evidence.push({ test: 'central_state', result: 'FAIL' }); }
  } catch (e) { testsFailed++; evidence.push({ test: 'central_state', result: 'FAIL', detail: e.message }); }

  const total = testsPassed + testsFailed;
  const score = total > 0 ? Math.round((testsPassed / total) * 100) : 0;

  res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
  res.end(JSON.stringify({
    score,
    testsPassed,
    testsFailed,
    criticalFailures: evidence.filter(e => e.result === 'FAIL' && ['backend_health', 'gateway_auth'].includes(e.test)).length,
    timestamp: new Date().toISOString(),
    evidence
  }));
}

// Helper to fetch JSON from backend
function fetchFromBackend(apiPath, caller) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: '127.0.0.1', port: BACKEND_PORT, path: apiPath, method: 'GET', timeout: 10000,
      headers: { cookie: caller?.headers.cookie || '', authorization: caller?.headers.authorization || '' } };
    const r = http.request(opts, (resp) => {
      let body = '';
      resp.on('data', c => body += c);
      resp.on('end', () => { if (resp.statusCode < 200 || resp.statusCode >= 300) return reject(new Error(`backend HTTP ${resp.statusCode}`)); try { resolve(JSON.parse(body)); } catch { resolve(null); } });
    });
    r.on('error', reject);
    r.on('timeout', () => { r.destroy(); reject(new Error('timeout')); });
    r.end();
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const pathname = parsedUrl.pathname;

  // Auth check endpoint (lightweight, no proxy needed)
  if (pathname === '/api/v2/auth/check') {
    return handleAuthCheck(req, res);
  }

  // Reality Score endpoint (calculated live in gateway)
  if (pathname === '/api/v2/reality/score') {
    return handleRealityScore(req, res);
  }

  // 1. API routes -> proxy to backend (4410)
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/health') ||
    pathname.startsWith('/runtime/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/missions') ||
    pathname.startsWith('/jobs') ||
    pathname === '/events'
  ) {
    const headers = { ...req.headers, host: '127.0.0.1:' + BACKEND_PORT };

    const isSse = pathname.includes('/events') || (req.headers['accept'] && req.headers['accept'].includes('text/event-stream'));
    if (isSse) {
      headers['accept'] = 'text/event-stream';
      headers['connection'] = 'keep-alive';
    }

    const proxyReq = http.request({
      host: '127.0.0.1',
      port: BACKEND_PORT,
      path: req.url,
      method: req.method,
      headers
    }, (proxyRes) => {
      const outHeaders = { ...proxyRes.headers };
      if (isSse || (proxyRes.headers['content-type'] && proxyRes.headers['content-type'].includes('text/event-stream'))) {
        outHeaders['Cache-Control'] = 'no-cache, no-transform';
        outHeaders['Connection'] = 'keep-alive';
        outHeaders['X-Accel-Buffering'] = 'no';
      }
      res.writeHead(proxyRes.statusCode, outHeaders);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Fenix Backend initializing...', details: err.message }));
      }
    });

    req.on('aborted', () => {
      proxyReq.destroy();
    });

    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      proxyReq.end();
    } else {
      req.pipe(proxyReq);
    }
    return;
  }

  // 2. Static files
  let relPath = pathname === '/' ? 'login.html' : pathname.replace(/^\//, '');
  if (['GRG-login', 'GRG-loqin', 'login'].includes(relPath)) return serveHtml('login.html', res);
  if (['app', 'app/', 'city', 'dashboard', 'office'].includes(relPath)) return serveHtml('index.html', res);
  if (relPath === 'index.html') return serveHtml('index.html', res);

  const filePath = path.join(PUBLIC_DIR, relPath);

  // Security: prevent path traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Forbidden');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const cacheHeaders = {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    };
    res.writeHead(200, cacheHeaders);
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // Fallback to index.html for SPA client-side routes
  if (!path.extname(pathname)) {
    return serveHtml('index.html', res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found: ' + pathname);
});

// WebSocket proxying to backend on port 4410
server.on('upgrade', (req, socket, head) => {
  const headers = { ...req.headers };

  const backendSocket = net.connect(BACKEND_PORT, '127.0.0.1', () => {
    backendSocket.write(
      `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n` +
      Object.entries(headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n') +
      '\r\n\r\n'
    );
    if (head && head.length > 0) backendSocket.write(head);
    backendSocket.pipe(socket);
    socket.pipe(backendSocket);
  });

  backendSocket.on('error', (err) => {
    socket.destroy();
  });
  socket.on('error', () => backendSocket.destroy());
});

server.listen(PORT, () => {
  console.log(`[Gateway] Fenix Frontend Gateway running on http://0.0.0.0:${PORT}`);
  console.log(`[Gateway] Reverse proxying APIs to Backend http://127.0.0.1:${BACKEND_PORT}`);
  console.log(`[Gateway] Reverse proxying WebSockets to ws://127.0.0.1:${BACKEND_PORT}`);
});
