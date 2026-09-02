/* Generate a deterministic, read-only activity plan from the real screen manifest. */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'qa', 'frontend-screen-manifest.json'), 'utf8'));
const map = JSON.parse(fs.readFileSync(path.join(root, 'qa', 'screen-function-map.json'), 'utf8'));
const activities = [];
const mapByScreen = Object.fromEntries((map.screens || []).map(item => [item.name, item]));

for (const [domain, screens] of Object.entries(manifest.domains)) {
  for (const screen of screens) {
    const contract = manifest.screens[screen] || {};
    activities.push({
      id: `${domain}.${screen}.navigation`,
      domain,
      screen,
      mode: 'read-only',
      steps: [
        { action: 'navigate', selector: `[data-view="${screen}"], [data-nav="${screen}"]` },
        { action: 'assert-visible-view', selector: `#view-${screen}` },
        { action: 'scroll', deltaY: 700 },
        { action: 'click-safe-visible-controls', max: 8 }
      ],
      endpoints: contract.readEndpoints || [],
      backendEvidence: mapByScreen[screen]?.status === 'backend-ready'
    });
  }
}

const out = path.resolve(process.env.FENIX_QA_PLAN_OUT || path.join(root, 'qa-results', 'screen-qa-plan.json'));
fs.mkdirSync(path.dirname(out), { recursive: true });
const result = { generatedAt: new Date().toISOString(), policy: 'no-mock-read-only', domains: Object.keys(manifest.domains).length, screens: activities.length, activities };
fs.writeFileSync(out, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ domains: result.domains, screens: result.screens, output: out }, null, 2));
