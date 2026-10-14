'use strict';
const http = require('http');
const cp = require('child_process');

async function main() {
  const list = JSON.parse(cp.execSync('pm2 jlist').toString());
  const b = list.find(p => p.name === 'fenix-backend');
  const userId = b.pm2_env.FENIX_BOOTSTRAP_ADMIN_USER || 'grg-admin';
  const password = b.pm2_env.FENIX_BOOTSTRAP_ADMIN_PASSWORD || '';
  const tenantId = b.pm2_env.FENIX_BOOTSTRAP_TENANT_ID || 'grg';

  const post = (path, bodyObj) => new Promise((resolve, reject) => {
    const body = JSON.stringify(bodyObj);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 4410,
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data || '{}') }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  const loginRes = await post('/api/login', { tenantId, userId, password });
  const token = loginRes.data.token;

  const get = (urlPath) => new Promise((resolve, reject) => {
    http.get({
      hostname: '127.0.0.1',
      port: 4410,
      path: urlPath,
      headers: { 'Authorization': `Bearer ${token}` }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    }).on('error', reject);
  });

  const projs = await get('/api/fenix/projects');
  console.log('GET /api/fenix/projects status:', projs.status);
  console.log('Projects list:', projs.data.projects?.map(p => ({ id: p.id, name: p.name, workspace: p.workspace })));

  const firstProj = projs.data.projects?.[0];
  if (firstProj) {
    const tree = await get(`/api/fenix/projects/${encodeURIComponent(firstProj.id)}/tree`);
    console.log(`Tree for ${firstProj.id}: status ${tree.status}, count: ${tree.data.tree?.length}`);
    if (tree.data.tree?.length) {
      const findFirstFile = (nodes) => {
        for (const item of nodes) {
          if (item.type === 'file') return item;
          if (item.type === 'directory' && item.children) {
            const sub = findFirstFile(item.children);
            if (sub) return sub;
          }
        }
        return null;
      };
      const first = findFirstFile(tree.data.tree);
      console.log('findFirstFile result:', first);
      if (first) {
        const fileRes = await get(`/api/fenix/projects/${encodeURIComponent(firstProj.id)}/file?path=${encodeURIComponent(first.path)}`);
        console.log(`Open file "${first.path}" status:`, fileRes.status, fileRes.data);
      }
    }
  }
}

main().catch(console.error);
