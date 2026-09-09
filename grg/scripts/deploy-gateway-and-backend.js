const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const SSH_CONFIG = {
  host: '209.50.241.22',
  port: 22,
  username: 'root',
  password: 'S53yi4RYq8j4DCGp',
  readyTimeout: 20000
};

const ECOSYSTEM_CONFIG = `
module.exports = {
  apps: [
    {
      name: 'fenix-backend',
      script: 'src/server.js',
      cwd: '/opt/fenix-os/grg',
      env: {
        NODE_ENV: 'development',
        PORT: 4410,
        FENIX_PORT: 4410,
        FENIX_BIND_HOST: '127.0.0.1',
        FENIX_BOOTSTRAP_ADMIN_USER: 'grg-admin',
        FENIX_BOOTSTRAP_ADMIN_PASSWORD: 'admin123',
        FENIX_ALLOW_DEV_HEADERS: '1',
        FENIX_ENV: 'development',
        FENIX_AI_DEFAULT_PROVIDER: 'ollama',
        FENIX_AI_DEFAULT_MODEL: 'qwen2.5:3b',
        GRG_AIPLATFORM_URL: 'http://209.50.241.22:3001',
        GRG_AIPLATFORM_KEY: 'ap_live_96e854c33c1bbac06ba6e8dd7b2e70a6114c29a4a914d428',
        GRG_AIPLATFORM_MODEL: 'qwen2.5:3b',
        FENIX_ENABLE_OLLAMA: '1'
      }
    },
    {
      name: 'fenix-frontend',
      script: '/opt/fenix-os/frontend-gateway.js',
      cwd: '/opt/fenix-os',
      env: {
        PORT: 3000,
        BACKEND_PORT: 4410
      }
    }
  ]
};
`;

const GATEWAY_CODE = `
const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');

const PORT = 3000;
const BACKEND_PORT = 4410;
const PUBLIC_DIR = '/opt/fenix-os/public';

let cachedToken = '';

async function loginToBackend() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      tenantId: 'grg',
      userId: 'grg-admin',
      password: 'admin123'
    });
    const req = http.request({
      host: '127.0.0.1',
      port: BACKEND_PORT,
      path: '/api/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 3000
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed && parsed.token) {
            cachedToken = parsed.token;
            console.log('[Gateway] Acquired admin session token successfully.');
            return resolve(true);
          }
        } catch (e) {}
        resolve(false);
      });
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.write(postData);
    req.end();
  });
}

// Token acquisition loop
(async function ensureToken() {
  while (!cachedToken) {
    await loginToBackend();
    if (!cachedToken) await new Promise(r => setTimeout(r, 2000));
  }
  setInterval(loginToBackend, 60 * 60 * 1000);
})();

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

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const pathname = parsedUrl.pathname;

  // 1. API routes -> proxy to backend
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
    if (cachedToken && !headers['authorization'] && !String(headers['cookie'] || '').includes('fenix_session')) {
      headers['authorization'] = 'Bearer ' + cachedToken;
      headers['cookie'] = (headers['cookie'] ? headers['cookie'] + '; ' : '') + 'fenix_session=' + encodeURIComponent(cachedToken);
    }

    const proxyReq = http.request({
      host: '127.0.0.1',
      port: BACKEND_PORT,
      path: req.url,
      method: req.method,
      headers
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Fênix Backend initializing...', details: err.message }));
    });

    req.pipe(proxyReq);
    return;
  }

  // 2. HTML serving with token pre-injection
  let relPath = pathname === '/' ? 'index.html' : pathname.replace(/^\\//, '');
  if (relPath === 'app' || relPath === 'app/' || relPath === 'city') {
    relPath = 'index.html';
  }

  if (relPath === 'index.html') {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      let content = fs.readFileSync(indexPath, 'utf8');
      if (cachedToken) {
        const injectScript = \`
  <script>
    (function() {
      var tok = '\${cachedToken}';
      if (!localStorage.getItem('token') || !localStorage.getItem('grg_token')) {
        localStorage.setItem('token', tok);
        localStorage.setItem('grg_token', tok);
        localStorage.setItem('fenix_token', tok);
      }
      document.cookie = 'fenix_session=' + encodeURIComponent(tok) + '; path=/; SameSite=Lax';
    })();
  </script>\`;
        content = content.replace('<head>', '<head>' + injectScript);
      }
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      });
      return res.end(content);
    }
  }

  // 3. Static files
  const filePath = path.join(PUBLIC_DIR, relPath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // Fallback for paths without extension -> SPA index.html
  if (!path.extname(pathname)) {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(indexPath).pipe(res);
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found: ' + pathname);
});

// WebSocket upgrade proxy
server.on('upgrade', (req, clientSocket, head) => {
  let targetUrl = req.url;
  if (cachedToken && !targetUrl.includes('token=')) {
    targetUrl += (targetUrl.includes('?') ? '&' : '?') + 'token=' + cachedToken;
  }
  const headers = { ...req.headers };
  if (cachedToken && !headers['authorization']) {
    headers['authorization'] = 'Bearer ' + cachedToken;
  }

  const backendSocket = net.connect(BACKEND_PORT, '127.0.0.1', () => {
    backendSocket.write(
      req.method + ' ' + targetUrl + ' HTTP/' + req.httpVersion + '\\r\\n' +
      Object.entries(headers).map(([k, v]) => k + ': ' + v).join('\\r\\n') +
      '\\r\\n\\r\\n'
    );
    if (head && head.length) backendSocket.write(head);
    clientSocket.pipe(backendSocket);
    backendSocket.pipe(clientSocket);
  });
  backendSocket.on('error', () => clientSocket.destroy());
  clientSocket.on('error', () => backendSocket.destroy());
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Fênix Unified Frontend & API Gateway listening on http://0.0.0.0:' + PORT);
});
`;

function execRemote(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code) => resolve({ code, stdout, stderr }))
            .on('data', (d) => { stdout += d; process.stdout.write(d); })
            .stderr.on('data', (d) => { stderr += d; process.stderr.write(d); });
    });
  });
}

async function run() {
  const conn = new Client();
  console.log('Connecting to VPS SSH...');
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve).on('error', reject).connect(SSH_CONFIG);
  });
  console.log('Connected to SSH.');

  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, s) => err ? reject(err) : resolve(s));
  });

  // 1. Upload ecosystem config
  console.log('Writing /opt/fenix-os/ecosystem.config.js ...');
  await new Promise((resolve, reject) => {
    const ws = sftp.createWriteStream('/opt/fenix-os/ecosystem.config.js');
    ws.on('close', resolve);
    ws.on('error', reject);
    ws.end(ECOSYSTEM_CONFIG);
  });

  // 2. Upload gateway script
  console.log('Writing /opt/fenix-os/frontend-gateway.js ...');
  await new Promise((resolve, reject) => {
    const ws = sftp.createWriteStream('/opt/fenix-os/frontend-gateway.js');
    ws.on('close', resolve);
    ws.on('error', reject);
    ws.end(GATEWAY_CODE);
  });

  sftp.end();

  // 3. Restart PM2 processes with ecosystem
  console.log('Restarting services in PM2 with proper environment variables...');
  const startCmd = `
    pm2 delete fenix-backend 2>/dev/null || true
    pm2 delete fenix-frontend 2>/dev/null || true
    pm2 start /opt/fenix-os/ecosystem.config.js
    pm2 save
    sleep 4
    pm2 status
  `;

  await execRemote(conn, startCmd);

  conn.end();
  console.log('PM2 restart and configuration finished!');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
