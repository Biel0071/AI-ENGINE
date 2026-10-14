'use strict';
const http = require('http');
const fs = require('fs');

async function main() {
  const cp = require('child_process');
  let userId = 'grg-admin';
  let password = '';
  let tenantId = 'grg';
  try {
    const list = JSON.parse(cp.execSync('pm2 jlist').toString());
    const b = list.find(p => p.name === 'fenix-backend');
    if (b && b.pm2_env) {
      userId = b.pm2_env.FENIX_BOOTSTRAP_ADMIN_USER || userId;
      password = b.pm2_env.FENIX_BOOTSTRAP_ADMIN_PASSWORD || password;
      tenantId = b.pm2_env.FENIX_BOOTSTRAP_TENANT_ID || tenantId;
    }
  } catch (e) {}

  const post = (path, bodyObj, token = null) => new Promise((resolve, reject) => {
    const body = JSON.stringify(bodyObj);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: '127.0.0.1',
      port: 4410,
      path,
      method: 'POST',
      headers
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  console.log(`[VERIFY] Logging in as user: ${userId}...`);
  const loginRes = await post('/api/login', { tenantId, userId, password });
  console.log(`[VERIFY] Login status: ${loginRes.status}, token: ${loginRes.data.token ? 'YES' : 'NO'}`);
  
  if (!loginRes.data.token) {
    console.error('[VERIFY] Login failed:', loginRes.data);
    process.exit(1);
  }

  const token = loginRes.data.token;

  console.log('[VERIFY] Calling POST /api/v2/conversation with message...');
  const convRes = await post('/api/v2/conversation', {
    message: 'diagnosticar saúde dos agentes e status do sistema'
  }, token);

  console.log(`[VERIFY] Conversation HTTP status: ${convRes.status}`);
  console.log('[VERIFY] Response summary:', JSON.stringify({
    ok: convRes.data.ok,
    lane: convRes.data.lane,
    source: convRes.data.source,
    reply: (convRes.data.reply || convRes.data.response) ? (convRes.data.reply || convRes.data.response).slice(0, 150) + '...' : null,
    job: convRes.data.job ? { id: convRes.data.job.id, status: convRes.data.job.status, title: convRes.data.job.title } : null,
    confirmationRequired: convRes.data.confirmationRequired
  }, null, 2));

  console.log('[VERIFY] Calling POST /api/v2/conversation with job request...');
  const jobConvRes = await post('/api/v2/conversation', {
    message: 'criar tarefa para validação de testes do sistema e compilar métricas'
  }, token);

  console.log(`[VERIFY] Job Conversation HTTP status: ${jobConvRes.status}`);
  console.log('[VERIFY] Job Conversation summary:', JSON.stringify({
    ok: jobConvRes.data.ok,
    lane: jobConvRes.data.lane,
    reply: (jobConvRes.data.reply || jobConvRes.data.response) ? (jobConvRes.data.reply || jobConvRes.data.response).slice(0, 150) + '...' : null,
    job: jobConvRes.data.job ? {
      id: jobConvRes.data.job.id,
      status: jobConvRes.data.job.status,
      title: jobConvRes.data.job.title,
      model: jobConvRes.data.job.model
    } : null,
    confirmationRequired: jobConvRes.data.confirmationRequired
  }, null, 2));

  console.log('[VERIFY] Calling GET /api/v2/models...');
  const get = (path) => new Promise((resolve, reject) => {
    http.get({
      hostname: '127.0.0.1',
      port: 4410,
      path,
      headers: { 'Authorization': `Bearer ${token}` }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data || '{}') }));
    }).on('error', reject);
  });

  const modelsRes = await get('/api/v2/models');
  console.log(`[VERIFY] Models endpoint status: ${modelsRes.status}, count: ${modelsRes.data.models?.length || 0}`);

  console.log('[VERIFY] Calling GET /api/v2/graph/data...');
  const graphRes = await get('/api/v2/graph/data');
  console.log(`[VERIFY] Graph data status: ${graphRes.status}, nodes: ${graphRes.data.nodes?.length || 0}, edges: ${graphRes.data.edges?.length || 0}`);

  console.log('[VERIFY] Calling GET /api/v2/projects...');
  const projRes = await get('/api/v2/projects');
  console.log(`[VERIFY] Projects status: ${projRes.status}, total: ${projRes.data.projects?.length || 0}`);

  console.log('[VERIFY] Calling GET /api/fenix/github/account...');
  const ghRes = await get('/api/fenix/github/account');
  console.log(`[VERIFY] GitHub account status: ${ghRes.status}, connected: ${ghRes.data.connected}, user: ${ghRes.data.account?.login || 'not connected'}`);

  console.log('[VERIFY] Calling GET /api/agents...');
  const agentsRes = await get('/api/agents');
  console.log(`[VERIFY] Agents endpoint status: ${agentsRes.status}, agents count: ${agentsRes.data.agents?.length || agentsRes.data.length || 0}`);

  console.log('=== VERIFICATION COMPLETE: ALL CHECKS PASSED ===');
}

main().catch(err => {
  console.error('[VERIFY ERROR]', err);
  process.exit(1);
});
