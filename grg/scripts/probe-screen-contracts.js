/* Read-only HTTP contract probe. It never creates missions/jobs and never fabricates data. */
const fs = require('fs');
const path = require('path');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'qa', 'frontend-screen-manifest.json'), 'utf8'));
const base = (process.env.FENIX_URL || 'http://127.0.0.1:4400').replace(/\/app\/?(?:\?.*)?$/, '').replace(/\/$/, '');
const endpoints = [...new Set(Object.values(manifest.screens).flatMap(screen => screen.readEndpoints || []))];
const token = String(process.env.FENIX_QA_TOKEN || '').trim();
const postOnly = new Set(['/api/v2/vision/inspect-element', '/api/dev/terminal']);

(async () => {
  const results = [];
  for (const endpoint of endpoints) {
    try {
      const signal = AbortSignal.timeout(Number(process.env.FENIX_PROBE_TIMEOUT || 10000));
      const method = postOnly.has(endpoint) ? 'POST' : 'GET';
      const response = await fetch(`${base}${endpoint}`, { method, redirect: 'manual', signal, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(method === 'POST' ? { 'content-type': 'application/json' } : {}) }, ...(method === 'POST' ? { body: '{}' } : {}) });
      results.push({ endpoint, method, status: response.status, category: response.status === 401 || response.status === 403 ? 'protected-route' : response.status === 404 ? 'missing-route' : response.ok || response.status === 400 || response.status === 422 ? 'available' : 'server-response' });
    } catch (error) {
      results.push({ endpoint, status: null, category: 'unreachable', error: error.message });
    }
  }
  const result = { base, checkedAt: new Date().toISOString(), results, summary: { total: results.length, available: results.filter(item => item.category === 'available').length, protected: results.filter(item => item.category === 'protected-route').length, missing: results.filter(item => item.category === 'missing-route').length, other: results.filter(item => !['available', 'protected-route', 'missing-route'].includes(item.category)).length } };
  const out = process.env.FENIX_CONTRACT_PROBE_OUT || path.join(__dirname, '..', 'qa-results', 'screen-contract-probe.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result.summary, null, 2));
  console.log(`Evidence: ${out}`);
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
