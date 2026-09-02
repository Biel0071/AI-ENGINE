/* Static inventory of the served frontend snapshot. No execution or mutation. */
const fs = require('fs');
const path = require('path');
const htmlPath = process.env.FENIX_HTML || path.join(__dirname, '..', 'qa', 'remote-snapshot', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'qa', 'frontend-screen-manifest.json'), 'utf8'));
const assetDir = process.env.FENIX_ASSET_DIR || path.dirname(htmlPath);
const assetText = fs.readdirSync(assetDir, { withFileTypes: true }).filter(entry => entry.isFile() && /\.m?js$/i.test(entry.name)).map(entry => fs.readFileSync(path.join(assetDir, entry.name), 'utf8')).join('\n');
const result = { htmlPath, screens: [] };
for (const name of Object.keys(manifest.screens)) {
  const marker = new RegExp(`<[^>]+(?:id=["']view-${name}["'])`, 'i').exec(html);
  const start = marker ? marker.index : -1;
  const next = start >= 0 ? html.slice(start + marker[0].length).search(/<[^>]+id=["']view-[^"']+["']/i) : -1;
  const body = start >= 0 ? html.slice(start, next >= 0 ? start + marker[0].length + next : undefined) : '';
  const buttons = [...body.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)].map(m => ({ label: m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), attrs: m[1].trim() }));
  const forms = [...body.matchAll(/<form\b([^>]*)>/gi)].map(m => m[1].trim());
  const links = [...body.matchAll(/<a\b([^>]*)>/gi)].map(m => m[1].trim());
  const declaredEndpoints = [...new Set((body.match(/\/(?:api|health)[A-Za-z0-9_?=./:${}-]*/g) || []))];
  const expectedEndpoints = manifest.screens[name].readEndpoints || [];
  const runtimeEndpoints = expectedEndpoints.filter(endpoint => assetText.includes(endpoint));
  result.screens.push({ name, domain: Object.entries(manifest.domains).find(([, items]) => items.includes(name))?.[0] || 'unmapped', found: start >= 0, buttons, forms, links, endpoints: { declared: declaredEndpoints, expected: expectedEndpoints, foundInAssets: runtimeEndpoints, missingExpected: expectedEndpoints.filter(endpoint => !runtimeEndpoints.includes(endpoint)) } });
}
result.summary = { total: result.screens.length, found: result.screens.filter(s => s.found).length, buttons: result.screens.reduce((n, s) => n + s.buttons.length, 0), forms: result.screens.reduce((n, s) => n + s.forms.length, 0), declaredEndpoints: [...new Set(result.screens.flatMap(s => s.endpoints.declared))].length, expectedEndpoints: [...new Set(result.screens.flatMap(s => s.endpoints.expected))].length, screensWithMissingExpectedEndpoints: result.screens.filter(s => s.endpoints.missingExpected.length).map(s => s.name) };
const out = process.env.FENIX_INVENTORY_OUT || path.join(path.dirname(htmlPath), 'screen-control-inventory.json');
fs.writeFileSync(out, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result.summary, null, 2));
console.log(`Evidence: ${out}`);
