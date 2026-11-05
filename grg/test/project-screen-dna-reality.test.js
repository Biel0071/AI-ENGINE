const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../public/project-hub-live.js'), 'utf8');
const styles = fs.readFileSync(path.join(__dirname, '../public/project-hub-live.css'), 'utf8');
const shell = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
const { getAllPages } = require('../src/projects/page-registry');

test('legacy command links route to City and project Screen DNA has a direct entry', () => {
  assert.match(shell, /'command':\s*'city'/);
  assert.match(shell, /projectTab === 'screens'.*openProjectScreenDNA/s);
  assert.match(source, /window\.openProjectScreenDNA = async \(projectId\)/);
  assert.match(source, /state\.workspaceTab = 'screens'/);
});

test('Screen DNA uses a project canvas backed by observed screens', () => {
  for (const pattern of [/flp-dna-board/, /getProjectScreens\(project\)/, /screen\.screenshotPath/, /screen\.route/]) {
    assert.equal(pattern.test(source), true, `missing real-data canvas marker ${pattern}`);
  }
});

test('Project Hub exposes a portfolio-wide screen catalog that opens the selected project Screen DNA', () => {
  assert.match(source, /id="flpModeScreens"/);
  assert.match(source, /function renderScreenPortfolio\(/);
  assert.match(source, /for \(const project of state\.projects\)/);
  assert.match(source, /Abrir projeto e telas/);
  assert.match(source, /loadRegisteredScreens\(project\)/);
});

test('Screen DNA inspector does not substitute fabricated screenshots, DOM, code, or similarity', () => {
  for (const pattern of [/Tela Principal \(Login & Auth\)/, /prj_api_plataform_real_screen\.png/, /api_platform_reconstructed_login\.png/, /98\.5%/, /HTML DOM TREE \(Playwright Ingested Snapshot\)/]) {
    assert.equal(pattern.test(source), false, `fabricated inspector data remains: ${pattern}`);
  }
});

test('Fenix visual references resolve to existing files and are labeled historical', () => {
  const publicDir = path.join(__dirname, '../public');
  const fenixPages = getAllPages('fenix-os');
  const capturedPages = fenixPages.filter((page) => page.screenshot);

  assert.equal(capturedPages.length, 4);
  for (const page of capturedPages) {
    assert.equal(fs.existsSync(path.join(publicDir, page.screenshot)), true, `${page.id} points to missing ${page.screenshot}`);
    assert.equal(page.screenshotFreshness, 'ARCHIVED', `${page.id} must disclose its old capture`);
    assert.equal(page.screenshotCapturedOn, '2026-09-21');
  }
});

test('Project Hub can show registered archived screens when no runtime capture exists', () => {
  assert.ok(source.includes("state.registeredScreens.get(project.id)"), 'project view falls back to registered captures');
  assert.ok(source.includes('/api/v2/pages?projectId='), 'screen fallback reads the page registry');
  assert.ok(source.includes('capturas históricas'), 'archived screenshots are labeled as old');
});

test('Screen DNA merges project, absorption, and registry entries by route and can map a workspace from the tab', () => {
  assert.match(source, /const sources = \[/);
  assert.match(source, /if \(route && applicationId\) key = `app:/);
  assert.match(source, /new Map\(\)/);
  assert.match(source, /Mapear telas do projeto/);
  assert.match(source, /\/api\/v2\/company\/projects\/absorb/);
  assert.match(source, /não cria capturas nem mede a tela em execução/);
});

test('Screen DNA distinguishes measured DOM and registered images from missing visual evidence', () => {
  const renderer = source.slice(source.indexOf('function renderScreensTab'), source.indexOf('function renderFilesTab'));
  const inspector = source.slice(source.indexOf('function renderInspectorContent'), source.indexOf('function renderGit'));
  assert.match(renderer, /DOM não medido/);
  assert.match(renderer, /Sem captura visual/);
  assert.match(renderer, /componentEvidence/);
  assert.doesNotMatch(renderer, /Array\.isArray\(screen\.components\)/);
  assert.match(inspector, /Origem não registrada/);
  assert.match(inspector, /Arquivo de origem/);
  assert.doesNotMatch(inspector, /Array\.isArray\(screen\.components\)/);
});

test('Screen DNA presents source discovery, DOM measurement, captures, and app scope separately', () => {
  assert.match(source, /screen\.captureStatus === 'CAPTURED'/);
  assert.match(source, /screen\.domInspectionStatus === 'INSPECTED'/);
  assert.match(source, /screen\.applicationId/);
  assert.match(source, /screen\.name \|\| screen\.title \|\| screen\.screenId/);
  assert.match(source, /img\.naturalWidth < 64 \|\| img\.naturalHeight < 36/);
  assert.match(source, /layoutEvidenceStatus === 'INFERRED_FROM_ROUTE'/);
  assert.match(source, /confidenceStatus === 'BROWSER_OBSERVED'/);
});

test('Screen DNA visual system uses calm system typography, consistent previews, and narrow-screen layout', () => {
  assert.match(styles, /font-family:-apple-system,BlinkMacSystemFont/);
  assert.match(styles, /aspect-ratio:16\/10/);
  assert.match(styles, /@media\(max-width:700px\).*flp-dna-nodes\{grid-template-columns:1fr\}/);
  assert.doesNotMatch(styles, /background-image:radial-gradient\(rgba\(126,187,201/);
});

test('Screen DNA groups real screens by route branch and labels inferred file groups', () => {
  const renderer = source.slice(source.indexOf('function renderScreensTab'), source.indexOf('function renderFilesTab'));
  assert.match(renderer, /groupScreensByBranch\(filteredScreens\.slice\(0,\s*screenLimit\)\)/);
  assert.match(renderer, /flp-dna-branch/);
  assert.match(renderer, /Grupo inferido pelo arquivo/);
  assert.match(source, /function groupScreensByBranch\(/);
});

test('Screen DNA has per-project search, evidence filter, and grid/list controls', () => {
  const renderer = source.slice(source.indexOf('function renderScreensTab'), source.indexOf('function renderFilesTab'));
  assert.match(renderer, /flpDnaSearch/);
  assert.match(renderer, /flpDnaCaptureFilter/);
  assert.match(renderer, /dataset\.dnaLayout/);
  assert.match(renderer, /dataset\.captureState/);
  assert.match(styles, /flp-dna-canvas\.is-list \.flp-dna-nodes/);
  assert.match(renderer, /img\.loading = 'lazy'/);
});

test('Screen DNA project node shows only catalog logo and version metadata that exist', () => {
  const renderer = source.slice(source.indexOf('function renderScreensTab'), source.indexOf('function renderFilesTab'));
  assert.match(renderer, /project\.logoUrl/);
  assert.match(renderer, /project\.projectVersion \|\| project\.currentVersion/);
  assert.match(renderer, /flp-dna-project-logo/);
});

test('company project view never presents unmeasured service claims as live facts', () => {
  const renderer = source.slice(source.indexOf('function renderCompanyTab'), source.indexOf('function renderApisTab'));
  assert.doesNotMatch(renderer, /<\s*200ms|Autonomous Execution|100% ATIVO|100% PASS|ONLINE \(:6380\)|\|\| 4/);
  assert.match(renderer, /Não medid[oa]|Não informado|Não mapead[oa]/);
  assert.doesNotMatch(renderer, /panel\.innerHTML|onclick=/);
  assert.match(renderer, /addEventListener\('click'/);
});

test('project cards count only screens present in Screen DNA sources', () => {
  assert.match(source, /const screensCount = getProjectScreens\(project\)\.length/);
  assert.doesNotMatch(source, /project\.id === 'api-platform-live' \? 1 : 0/);
});
