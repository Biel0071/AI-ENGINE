/* Read-only HTTP contract probe. It never creates missions/jobs and never fabricates data. */
const fs = require('fs');
const path = require('path');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'qa', 'frontend-screen-manifest.json'), 'utf8'));
const base = (process.env.FENIX_URL || 'http://127.0.0.1:4400').replace(/\/app\/?(?:\?.*)?$/, '').replace(/\/$/, '');
const endpoints = [...new Set(Object.values(manifest.screens).flatMap(screen => screen.readEndpoints || []))];

(async () => {
  const results = [];
  for (const endpoint of endpoints) {
    try {
      const signal = AbortSignal.timeout(Number(process.env.FENIX_PROBE_TIMEOUT || 2500));
      const response = await fetch(`${base}${endpoint}`, { redirect: 'manual', signal });
      results.push({ endpoint, status: response.status, category: response.status === 401 || response.status === 403 ? 'protected-route' : response.ok ? 'available' : response.status === 404 ? 'missing-route' : 'server-response' });
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
