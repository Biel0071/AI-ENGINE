/* Merge static map and real QA evidence without upgrading missing runtime evidence to PASS. */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); }
  catch { return fallback; }
};
const map = read('qa/screen-function-map.json', { screens: [] });
const plan = read('qa-results/screen-qa-plan.json', { activities: [] });
const navigation = read('qa-results/frontend-navigation-qa.json', { navigation: [], blocked: null, summary: {} });
const contracts = read('qa-results/screen-contract-probe.json', { results: [], summary: {} });
const navByScreen = Object.fromEntries((navigation.navigation || []).map(item => [item.view, item]));
const contractByEndpoint = Object.fromEntries((contracts.results || []).map(item => [item.endpoint, item]));
// A static navigation PASS is not enough when every screen data endpoint is
// protected. Keep the report explicit instead of presenting an unauthenticated
// shell as a fully verified application.
const authenticationBlocked = Number(contracts.summary?.protected || 0) > 0
  && Number(contracts.summary?.available || 0) <= 1;
const rows = (map.screens || []).map(screen => ({
  screen: screen.name,
  domain: Object.entries(map.domains || {}).find(([, names]) => names.includes(screen.name))?.[0] || 'unmapped',
  purpose: screen.purpose,
  staticView: screen.viewPresentInHtml === true,
  backendContract: screen.status === 'backend-ready',
  navigation: authenticationBlocked || navigation.blocked ? 'BLOCKED_AUTH' : (navByScreen[screen.name]?.ok === true ? 'PASS' : 'NOT_RUN'),
  endpointEvidence: (screen.endpoints || []).map(item => ({ endpoint: item.endpoint, backendDeclared: item.backend === true, runtime: contractByEndpoint[item.endpoint]?.status || 'NOT_PROBED' }))
}));
const out = path.resolve(process.env.FENIX_READINESS_OUT || path.join(root, 'qa-results', 'screen-readiness-report.json'));
fs.mkdirSync(path.dirname(out), { recursive: true });
const report = { generatedAt: new Date().toISOString(), policy: 'evidence-separated-no-mock', domains: Object.keys(map.domains || {}).length, screens: rows.length, authenticationBlocked, navigationSummary: navigation.summary || {}, contractSummary: contracts.summary || {}, rows };
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ domains: report.domains, screens: report.screens, output: out, navigationBlocked: authenticationBlocked || Boolean(navigation.blocked) }, null, 2));
