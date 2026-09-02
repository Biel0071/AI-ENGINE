/* Build a repeatable frontend/backend function map. Read-only; no mocks or mutations. */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'qa', 'frontend-screen-manifest.json'), 'utf8'));
// Default to the canonical shell that is built/served by this repository. A
// snapshot is still supported explicitly for historical comparison, but must
// never silently override the current implementation.
const htmlPath = process.env.FENIX_HTML || path.join(root, 'public', 'index.html');
const assetDir = process.env.FENIX_ASSET_DIR || path.join(root, 'public');
const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '';
const assets = fs.existsSync(assetDir) ? fs.readdirSync(assetDir).filter(name => /\.m?js$/i.test(name)).map(name => fs.readFileSync(path.join(assetDir, name), 'utf8')).join('\n') : '';

function backendHas(endpoint) {
  try { return !!execFileSync('rg', ['-l', '--fixed-strings', endpoint, path.join(root, 'src')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return false; }
}

const domainByScreen = Object.fromEntries(Object.entries(manifest.domains).flatMap(([domain, screens]) => screens.map(screen => [screen, domain])));
const screens = Object.entries(manifest.screens).map(([name, spec]) => {
  const expected = spec.readEndpoints || [];
  const endpoints = expected.map(endpoint => ({ endpoint, backend: backendHas(endpoint), asset: assets.includes(endpoint) }));
  const marker = new RegExp(`<[^>]+id=["']view-${name}["']`, 'i');
  return {
    name,
    domain: domainByScreen[name] || 'unmapped',
    purpose: spec.purpose,
    viewPresentInHtml: marker.test(html),
    endpoints,
    status: endpoints.every(item => item.backend) && marker.test(html) ? 'backend-ready' : 'needs-review'
  };
});
const result = {
  generatedAt: new Date().toISOString(),
  source: { manifest: path.relative(root, path.join(root, 'qa', 'frontend-screen-manifest.json')), html: path.relative(root, htmlPath), assetDir: path.relative(root, assetDir) },
  domains: manifest.domains,
  screens,
  summary: {
    screens: screens.length,
    backendReady: screens.filter(screen => screen.status === 'backend-ready').length,
    needsReview: screens.filter(screen => screen.status === 'needs-review').length,
    endpointContracts: screens.reduce((total, screen) => total + screen.endpoints.length, 0),
    backendContracts: screens.reduce((total, screen) => total + screen.endpoints.filter(item => item.backend).length, 0),
    assetReferences: screens.reduce((total, screen) => total + screen.endpoints.filter(item => item.asset).length, 0)
  }
};
const out = process.env.FENIX_FUNCTION_MAP_OUT || path.join(root, 'qa', 'screen-function-map.json');
fs.writeFileSync(out, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result.summary, null, 2));
console.log(`Evidence: ${out}`);
