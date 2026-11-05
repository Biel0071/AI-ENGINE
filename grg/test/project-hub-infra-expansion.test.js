const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Project Hub Infra Expansion: HTML & Script Contracts', () => {
  const indexPath = path.resolve(__dirname, '..', 'public', 'index.html');
  const indexHtml = fs.readFileSync(indexPath, 'utf8');

  // Verify Topbar VPS Live link exists and points to real VPS
  assert.match(indexHtml, /id="fnxTopbarVpsBtn"/, 'Topbar VPS Live button must be present in index.html');
  assert.match(indexHtml, /href="http:\/\/209\.50\.241\.22:3000"/, 'Topbar VPS Live link must point to http://209.50.241.22:3000');

  const hubJsPath = path.resolve(__dirname, '..', 'public', 'project-hub-live.js');
  const hubJs = fs.readFileSync(hubJsPath, 'utf8');

  // Verify Project Hub header VPS link
  assert.match(hubJs, /id="flpVpsCloudBtn"/, 'Project Hub header must have flpVpsCloudBtn');
  assert.match(hubJs, /http:\/\/209\.50\.241\.22:3000/, 'Project Hub header button must point to VPS URL');

  // Verify Quick Project Switcher bar
  assert.match(hubJs, /flp-quick-switcher-bar/, 'Quick switcher bar CSS class must be present');
  assert.match(hubJs, /role="tablist"/, 'Quick switcher bar must have role=tablist');
  assert.match(hubJs, /flp-qs-item/, 'Quick switcher items must have flp-qs-item class');

  // Verify Live Preview & Browser Tab
  assert.match(hubJs, /flp-live-preview-box/, 'Live preview box container must be defined');
  assert.match(hubJs, /flp-preview-frame/, 'Responsive iframe preview must be supported');
  assert.match(hubJs, /flp-preview-viewport-btn/, 'Responsive viewport device buttons must be present');

  // Verify IDE & Explorer integration in Code Tab
  assert.match(hubJs, /Visualização de Código Fonte & IDE/, 'Code Tab must offer IDE inspection');
  assert.match(hubJs, /Abrir no Visual IDE/, 'Code Tab must offer action to open in Fênix IDE');
  assert.match(hubJs, /Abrir no Explorer/, 'Code Tab must offer action to open directory in Explorer');

  // Verify Categories & Filters
  assert.match(hubJs, /flpCatCountAll/, 'Category pill counters must be dynamic');
  assert.match(hubJs, /flpCatCountLovable/, 'Lovable counter must be present');
  assert.match(hubJs, /flpCatCountCrm/, 'CRM & WhatsApp counter must be present');
  assert.match(hubJs, /flpCatCountFenix/, 'Fênix & Core counter must be present');
});

test('Project Status Scanner: Multi-mode launch support', () => {
  const scannerPath = path.resolve(__dirname, '..', 'src', 'projects', 'local-project-status-scanner.js');
  const scannerCode = fs.readFileSync(scannerPath, 'utf8');

  assert.match(scannerCode, /entry\.mode === 'file'/, 'Status scanner must support mode: file');
  assert.match(scannerCode, /entry\.mode === 'folder'/, 'Status scanner must support mode: folder');
  assert.match(scannerCode, /openProjectFolder/, 'Status scanner must export or implement openProjectFolder');
});

test('Fenix OS PWA & Desktop Shortcuts Contract', () => {
  const publicDir = path.resolve(__dirname, '..', 'public');
  const manifestPath = path.join(publicDir, 'manifest.json');
  assert.equal(fs.existsSync(manifestPath), true, 'manifest.json must exist');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.name, 'Fênix OS - Spatial AI Operating System');
  assert.equal(manifest.display, 'standalone');

  const indexPath = path.join(publicDir, 'index.html');
  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  assert.match(indexHtml, /rel="manifest"/, 'index.html must link to manifest.json');
  assert.match(indexHtml, /id="fnxInstallAppBtn"/, 'index.html must have install app button');

  const desktopLnk = 'C:\\Users\\Dell\\Desktop\\Fenix OS.lnk';
  assert.equal(fs.existsSync(desktopLnk), true, 'Desktop Fenix OS shortcut must exist');

  const projetosLnk = 'C:\\Users\\Dell\\Desktop\\PROJETOS\\Fenix OS.lnk';
  assert.equal(fs.existsSync(projetosLnk), true, 'PROJETOS Fenix OS shortcut must exist');
});

