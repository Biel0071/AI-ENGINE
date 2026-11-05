/* Build an evidence-separated improvement queue from the real screen map and QA plan. */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const map = JSON.parse(fs.readFileSync(path.join(root, 'qa', 'screen-function-map.json'), 'utf8'));
const plan = JSON.parse(fs.readFileSync(path.join(root, 'qa-results', 'screen-qa-plan.json'), 'utf8'));
const navigationPath = path.join(root, 'qa-results', 'frontend-navigation-qa.json');
const navigation = fs.existsSync(navigationPath) ? JSON.parse(fs.readFileSync(navigationPath, 'utf8')) : {};
const contractsPath = path.join(root, 'qa-results', 'screen-contract-probe.json');
const contracts = fs.existsSync(contractsPath) ? JSON.parse(fs.readFileSync(contractsPath, 'utf8')) : {};
const navigationBlocked = Boolean(navigation.blocked);
const navigationStatus = navigationBlocked
  ? (navigation.blocked.component === 'authentication' ? 'BLOCKED_AUTH' : 'BLOCKED_RUNTIME')
  : null;
const navByScreen = Object.fromEntries((navigation.navigation || []).map(item => [item.view, item]));
const activitiesByScreen = Object.fromEntries((plan.activities || []).map(item => [item.screen, item]));

const items = map.screens.map(screen => {
  const nav = navByScreen[screen.name];
  const activity = activitiesByScreen[screen.name];
  const missingAsset = screen.endpoints.filter(item => !item.asset).map(item => item.endpoint);
  const screenApiBlocked = screen.endpoints.some(item => contracts.results?.find(result => result.endpoint === item.endpoint)?.category === 'protected-route');
  const screenAuthBlocked = navigationStatus === 'BLOCKED_AUTH' || screenApiBlocked;
  const priority = screenAuthBlocked || navigationStatus === 'BLOCKED_RUNTIME'
    || !screen.viewPresentInHtml || screen.endpoints.some(item => !item.backend)
    ? 'P1'
    : 'P2';
  const status = screenAuthBlocked
    ? 'BLOCKED_AUTH'
    : navigationStatus === 'BLOCKED_RUNTIME' ? 'BLOCKED_RUNTIME'
    : nav ? (nav.ok ? 'PASS' : 'FAIL') : 'NOT_RUN';
  return {
    id: `screen.${screen.name}`,
    priority,
    domain: screen.domain,
    screen: screen.name,
    purpose: screen.purpose,
    currentEvidence: {
      htmlView: screen.viewPresentInHtml,
      backendContract: screen.endpoints.every(item => item.backend),
      assetEndpoints: screen.endpoints.filter(item => item.asset).map(item => item.endpoint),
      unreferencedExpectedEndpoints: missingAsset,
      navigation: status,
      browserNavigation: navigationStatus || (nav ? (nav.ok ? 'PASS' : 'FAIL') : 'NOT_RUN'),
      apiAccess: screenApiBlocked ? 'BLOCKED_AUTH' : 'NOT_BLOCKED',
      navigationError: nav?.error || navigation.blocked?.error || null
    },
    nextActions: [
      'abrir hash real da tela',
      'confirmar view visível',
      'executar scroll',
      'clicar somente controles seguros sem mutação',
      ...(missingAsset.length ? ['ligar cada endpoint ao módulo de tela e adicionar teste de contrato'] : []),
      ...(screen.name === 'command' ? ['validar POST /api/fenix/missions com sessão autenticada e confirmar missionId'] : [])
    ],
    qaActivity: activity?.id || null,
    policy: 'evidence-separated-no-mock'
  };
});

const result = {
  generatedAt: new Date().toISOString(),
  source: { map: 'qa/screen-function-map.json', plan: 'qa-results/screen-qa-plan.json', navigation: 'qa-results/frontend-navigation-qa.json' },
  summary: {
    screens: items.length,
    priorities: Object.fromEntries(['P0', 'P1', 'P2'].map(priority => [priority, items.filter(item => item.priority === priority).length])),
    blockedAuth: items.filter(item => item.currentEvidence.navigation === 'BLOCKED_AUTH').length,
    blockedRuntime: items.filter(item => item.currentEvidence.browserNavigation === 'BLOCKED_RUNTIME').length,
    missingAssetContracts: items.filter(item => item.currentEvidence.unreferencedExpectedEndpoints.length).length
  },
  items
};
const out = path.join(root, 'qa-results', 'screen-improvement-queue.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result.summary, output: out }, null, 2));
