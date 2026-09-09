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

const GATEWAY_CODE = `
const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');

const PORT = 3000;
const BACKEND_PORT = 4410;
const PUBLIC_DIR = '/opt/fenix-os/public';

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

  // 1. If API or backend route, proxy to backend
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/health') ||
    pathname.startsWith('/runtime/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/missions') ||
    pathname.startsWith('/jobs') ||
    pathname === '/events'
  ) {
    const proxyReq = http.request({
      host: '127.0.0.1',
      port: BACKEND_PORT,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        host: '127.0.0.1:' + BACKEND_PORT
      }
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

  // 2. Static file serving
  let relPath = pathname === '/' ? 'index.html' : pathname.replace(/^\\//, '');
  if (relPath === 'app' || relPath === 'app/' || relPath === 'city') {
    relPath = 'index.html';
  }
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
  const backendSocket = net.connect(BACKEND_PORT, '127.0.0.1', () => {
    backendSocket.write(
      req.method + ' ' + req.url + ' HTTP/' + req.httpVersion + '\\r\\n' +
      Object.entries(req.headers).map(([k, v]) => k + ': ' + v).join('\\r\\n') +
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
  console.log('Connecting to VPS...');
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve).on('error', reject).connect(SSH_CONFIG);
  });
  console.log('Connected to SSH.');

  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, s) => err ? reject(err) : resolve(s));
  });

  // 1. Upload tarball
  console.log('Uploading v6-deploy.tar.gz (2MB)...');
  const tarPath = path.join(__dirname, '..', 'v6-deploy.tar.gz');
  await new Promise((resolve, reject) => {
    sftp.fastPut(tarPath, '/tmp/v6-deploy.tar.gz', (err) => err ? reject(err) : resolve());
  });
  console.log('✓ Tarball uploaded to /tmp/v6-deploy.tar.gz');

  // 2. Upload gateway script
  console.log('Uploading gateway script to /opt/fenix-os/frontend-gateway.js...');
  await new Promise((resolve, reject) => {
    const ws = sftp.createWriteStream('/opt/fenix-os/frontend-gateway.js');
    ws.on('close', resolve);
    ws.on('error', reject);
    ws.end(GATEWAY_CODE);
  });
  console.log('✓ Gateway script uploaded.');

  sftp.end();

  // 3. Extract and configure services
  console.log('Extracting assets on VPS...');
  const extractCmd = `
    # 1. Clean and extract public to /opt/fenix-os/public
    mkdir -p /opt/fenix-os/public
    tar -xzf /tmp/v6-deploy.tar.gz -C /opt/fenix-os/
    
    # 2. Extract into /opt/fenix-os/grg
    mkdir -p /opt/fenix-os/grg
    tar -xzf /tmp/v6-deploy.tar.gz -C /opt/fenix-os/grg/

    # 3. Extract into /root/fenix_deploy
    mkdir -p /root/fenix_deploy
    tar -xzf /tmp/v6-deploy.tar.gz -C /root/fenix_deploy/

    # 4. Configure PM2 fenix-frontend to use frontend-gateway.js
    pm2 delete fenix-frontend 2>/dev/null || true
    pm2 start /opt/fenix-os/frontend-gateway.js --name fenix-frontend

    # 5. Restart fenix-backend
    pm2 restart fenix-backend

    # 6. Save PM2 config
    pm2 save

    sleep 4
    pm2 status
  `;

  console.log('Running extraction & restart commands...');
  const res = await execRemote(conn, extractCmd);
  console.log('Exit code:', res.code);

  conn.end();
  console.log('Deployment completed!');
}

run().catch(err => {
  console.error('Deploy error:', err);
  process.exit(1);
});
