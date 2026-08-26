'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

function readClients(root) {
  return JSON.parse(fs.readFileSync(path.join(root, 'data', 'clients.json'), 'utf8'));
}

function writeClients(root, clients) {
  fs.writeFileSync(path.join(root, 'data', 'clients.json'), JSON.stringify(clients, null, 2), 'utf8');
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'content-type': type });
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
}

function staticFile(root, pathname) {
  const clean = pathname === '/' ? '/index.html' : pathname;
  const file = path.join(root, 'public', clean.replace(/^\//, ''));
  if (!file.startsWith(path.join(root, 'public')) || !fs.existsSync(file)) return null;
  return file;
}

function createServer({ root = process.cwd() } = {}) {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (req.method === 'GET' && url.pathname === '/api/clients') {
      return send(res, 200, { clients: readClients(root) });
    }
    if (req.method === 'POST' && url.pathname === '/api/clients') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        const input = body ? JSON.parse(body) : {};
        const clients = readClients(root);
        const client = {
          id: input.id || 'CLI-' + String(Date.now()).slice(-6),
          name: String(input.name || '').trim(),
          segment: String(input.segment || 'General').trim(),
          owner: String(input.owner || 'Fenix').trim(),
          status: String(input.status || 'Onboarding').trim(),
          mrr: Number(input.mrr || 0),
          health: Number(input.health || 70)
        };
        if (!client.name) return send(res, 400, { error: 'name is required' });
        clients.push(client);
        writeClients(root, clients);
        send(res, 201, { client });
      });
      return;
    }
    const file = staticFile(root, url.pathname);
    if (!file) return send(res, 404, { error: 'not found' });
    const ext = path.extname(file);
    const type = ext === '.css' ? 'text/css; charset=utf-8' : ext === '.js' ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8';
    send(res, 200, fs.readFileSync(file, 'utf8'), type);
  });
}

function start(port = process.env.PORT || 0, options = {}) {
  const server = createServer(options);
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if (require.main === module) {
  start(process.env.PORT || 4500, { root: path.join(__dirname, '..') }).then((server) => {
    console.log('clients app listening on ' + server.address().port);
  });
}

module.exports = { createServer, start };
