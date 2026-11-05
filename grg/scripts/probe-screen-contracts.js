/* Read-only HTTP contract probe. Action endpoints are reported but never invoked. */
const fs = require('fs');
const path = require('path');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'qa', 'frontend-screen-manifest.json'), 'utf8'));
const base = (process.env.FENIX_URL || 'http://127.0.0.1:4400').replace(/\/app\/?(?:\?.*)?$/, '').replace(/\/$/, '');
const endpoints = [...new Set(Object.values(manifest.screens).flatMap(screen => screen.readEndpoints || []))]
  .map(endpoint => ({ endpoint, method: 'GET' }));
const actionEndpoints = [...new Map(Object.values(manifest.screens)
  .flatMap(screen => screen.actionEndpoints || [])
  .map(action => [action.endpoint, action])).values()];
const token = String(process.env.FENIX_QA_TOKEN || '').trim();
(async () => {
  const results = actionEndpoints.map(action => ({
    endpoint: action.endpoint,
    method: action.method,
    category: 'not-probed-action',
    reason: 'Action endpoints are cataloged statically and are never invoked by the read-only probe.'
  }));
  for (const contract of endpoints) {
    const { endpoint, method } = contract;
    try {
      const defaultTimeout = Number(process.env.FENIX_PROBE_TIMEOUT || 10000);
      const signal = AbortSignal.timeout(endpoint === '/api/connectors' ? Math.max(defaultTimeout, 30000) : defaultTimeout);
      const response = await fetch(`${base}${endpoint}`, { method, redirect: 'manual', signal, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}) } });
      results.push({ endpoint, method, status: response.status, category: response.status === 401 || response.status === 403 ? 'protected-route' : response.status === 404 ? 'missing-route' : response.ok || response.status === 400 || response.status === 422 ? 'available' : 'server-response' });
    } catch (error) {
      results.push({ endpoint, status: null, category: 'unreachable', error: error.message });
    }
  }
  const result = { base, checkedAt: new Date().toISOString(), results, summary: { total: results.length, readProbed: endpoints.length, actionsNotProbed: actionEndpoints.length, available: results.filter(item => item.category === 'available').length, protected: results.filter(item => item.category === 'protected-route').length, missing: results.filter(item => item.category === 'missing-route').length, other: results.filter(item => ['unreachable', 'server-response'].includes(item.category)).length } };
  const out = process.env.FENIX_CONTRACT_PROBE_OUT || path.join(__dirname, '..', 'qa-results', 'screen-contract-probe.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result.summary, null, 2));
  console.log(`Evidence: ${out}`);
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
