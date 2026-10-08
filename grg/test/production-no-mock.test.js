/**
 * FÊNIX OS — PRODUCTION ZERO-MOCK VERIFICATION TEST SUITE
 *
 * Verifies that production frontend (public/) and backend (src/) do not contain:
 * 1. Hardcoded fake telemetry bundles (R$ 124k, agentsCount: 12, operationsCount: 382, missionsCount: 7)
 * 2. Hardcoded fallback selections to 'deposito-mais'
 * 3. Seeded mock enterprise entities in CompanyBrain, CompanyRegistry, WorldStateEngine
 * 4. Fake counters (20, 7, 6, 12, (12), 3, 98%) in updateSidebarCounters
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const GRG_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(GRG_DIR, 'public');
const SRC_DIR = path.join(GRG_DIR, 'src');

test('production: no hardcoded fake telemetry strings (R$ 124k) in public/ or src/', () => {
  const checkDirs = [PUBLIC_DIR, SRC_DIR];
  const forbiddenPatterns = [
    /revenueMonthly\s*:\s*['"]R\$\s*124k['"]/i,
    /agentsCount\s*:\s*12\b.*operationsCount\s*:\s*382\b/,
    /operationsCount\s*:\s*382\b/,
    /\bactiveInspectCompanyId\s*\|\|\s*['"]deposito-mais['"]/i,
    /window\.FenixSidebar\?\.openInspector\?\.?\(['"]deposito-mais['"]\)/
  ];

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name !== 'node_modules' && ent.name !== '.data' && ent.name !== 'archive') {
          scanDir(fullPath);
        }
      } else if (ent.isFile() && (ent.name.endsWith('.js') || ent.name.endsWith('.html'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const pat of forbiddenPatterns) {
          assert.equal(
            pat.test(content),
            false,
            `Forbidden mock pattern ${pat} detected in production file: ${path.relative(GRG_DIR, fullPath)}`
          );
        }
      }
    }
  }

  checkDirs.forEach(scanDir);
});

test('production: company-brain contains zero pre-seeded mock companies', () => {
  const companyBrainPath = path.join(SRC_DIR, 'company', 'company-brain.js');
  assert.ok(fs.existsSync(companyBrainPath), 'company-brain.js must exist');
  const code = fs.readFileSync(companyBrainPath, 'utf8');
  assert.match(code, /const CANONICAL_COMPANIES = Object\.freeze\(\[\]\)/, 'CANONICAL_COMPANIES in company-brain must be empty');
  assert.doesNotMatch(code, /deposito-mais/, 'company-brain must not contain deposito-mais mock');
});

test('production: world-state-engine initializes with clean state and requires sourceId', () => {
  const worldStatePath = path.join(SRC_DIR, 'world-model', 'world-state-engine.js');
  assert.ok(fs.existsSync(worldStatePath), 'world-state-engine.js must exist');
  const code = fs.readFileSync(worldStatePath, 'utf8');
  assert.match(code, /const CANONICAL_COMPANIES_DATA = \{\}/, 'CANONICAL_COMPANIES_DATA must be empty');
  assert.match(code, /const CANONICAL_AGENTS_DATA = \{\}/, 'CANONICAL_AGENTS_DATA must be empty');
  assert.match(code, /if \(!entity \|\| !entity\.sourceId\) \{[\s\S]*return null;/, 'Entities without sourceId must return null (ghost entity prevention)');
});

test('production: global-selection-store starts with selectedEntity = null', () => {
  const gssPath = path.join(PUBLIC_DIR, 'global-selection-store.js');
  assert.ok(fs.existsSync(gssPath), 'global-selection-store.js must exist');
  const code = fs.readFileSync(gssPath, 'utf8');
  assert.match(code, /selectedEntity:\s*null/, 'Initial selection must be null');
  assert.match(code, /this\._listeners = new Set\(\);/, 'Listeners must be initialized');
});

test('production: city-reality-engine has empty CANONICAL_COMPANIES and null initial company', () => {
  const cityRealityPath = path.join(PUBLIC_DIR, 'city-reality-engine.js');
  assert.ok(fs.existsSync(cityRealityPath), 'city-reality-engine.js must exist');
  const code = fs.readFileSync(cityRealityPath, 'utf8');
  assert.match(code, /const CANONICAL_COMPANIES = Object\.freeze\(\[\]\);/, 'CANONICAL_COMPANIES in city-reality-engine must be empty');
  assert.match(code, /this\.activeCompanyId = null;/, 'Initial activeCompanyId must be null');
  assert.match(code, /this\.activeCompany = null;/, 'Initial activeCompany must be null');
  assert.doesNotMatch(code, /activeCompanyId = ['"]deposito-mais['"]/, 'activeCompanyId must never default to deposito-mais');
});

test('production: iso-city hero buildings do not hardcode deposito-mais or permanent pin', () => {
  const isoCityPath = path.join(PUBLIC_DIR, 'iso-city.js');
  assert.ok(fs.existsSync(isoCityPath), 'iso-city.js must exist');
  const code = fs.readFileSync(isoCityPath, 'utf8');
  assert.doesNotMatch(code, /id:\s*['"]deposito-mais['"].*nx:/, 'HERO_BUILDINGS must not contain hardcoded deposito-mais');
  assert.doesNotMatch(code, /this\._heroHitboxes\.find\(b => b\.id === ['"]deposito-mais['"]\)/, 'Floating pin must not be pinned to deposito-mais');
  assert.match(code, /_drawEmptyWorldOverlay/, '_drawEmptyWorldOverlay must exist to render clean empty world state');
});

test('production: fenix-mascot-sidebar inspector does not default to deposito-mais', () => {
  const sidebarPath = path.join(PUBLIC_DIR, 'fenix-mascot-sidebar.js');
  assert.ok(fs.existsSync(sidebarPath), 'fenix-mascot-sidebar.js must exist');
  const code = fs.readFileSync(sidebarPath, 'utf8');
  assert.doesNotMatch(code, /renderInspector\(state\.activeInspectCompanyId \|\| ['"]deposito-mais['"]\)/, 'renderInspector must not default to deposito-mais');
  assert.doesNotMatch(code, /state\.activeInspectCompanyId = companyId \|\| state\.activeInspectCompanyId \|\| ['"]deposito-mais['"]/, 'openInspector must not default to deposito-mais');
  assert.match(code, /fsb-inspector-empty/, 'Empty selection state must be supported in inspector');
  assert.match(code, /renderProjectInspector/, 'Project inspector must exist');
  assert.match(code, /renderAgentInspector/, 'Agent inspector must exist');
});

test('production: unified-app updateSidebarCounters does not inject fake numbers (20, 7, 6, 12, 98%)', () => {
  const unifiedAppPath = path.join(PUBLIC_DIR, 'unified-app.js');
  assert.ok(fs.existsSync(unifiedAppPath), 'unified-app.js must exist');
  const code = fs.readFileSync(unifiedAppPath, 'utf8');
  const updateSection = code.match(/window\.updateSidebarCounters\s*=\s*function[\s\S]*?^};/m)?.[0] || '';
  assert.ok(updateSection.length > 0, 'updateSidebarCounters function must be found');
  assert.doesNotMatch(updateSection, /:\s*['"]20['"]/, 'fake "20" agents fallback must not exist');
  assert.doesNotMatch(updateSection, /:\s*['"]7['"]/, 'fake "7" missions fallback must not exist');
  assert.doesNotMatch(updateSection, /:\s*['"]6['"]/, 'fake "6" projects fallback must not exist');
  assert.doesNotMatch(updateSection, /:\s*['"]12['"]/, 'fake "12" events fallback must not exist');
  assert.doesNotMatch(updateSection, /:\s*['"]\(12\)['"]/, 'fake "(12)" companies fallback must not exist');
  assert.doesNotMatch(updateSection, /:\s*['"]98%['"]/, 'fake "98%" system health fallback must not exist');
});

test('production: city notifications are rendered from API events without seeded alerts', () => {
  const index = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
  const city = fs.readFileSync(path.join(PUBLIC_DIR, 'city-reality-engine.js'), 'utf8');
  const world = fs.readFileSync(path.join(PUBLIC_DIR, 'fenix-world-3d.js'), 'utf8');
  assert.doesNotMatch(index, /(?:CRITICAL|WARNING|SUCCESS)<\/span>[\s\S]{0,600}(?:Qdrant \/ Redis Latency Check|Fila Zerada|Missão #42 Concluída)/i);
  assert.doesNotMatch(index, /(?:Todos|Críticos|Avisos|Info) \([0-9]+\)/);
  assert.doesNotMatch(index, /(?:\+12%|\+3%|\+18%|\+0\.4%|Alertas \(2\)|100% REAL)/);
  assert.doesNotMatch(city, /0 alertas críticos ativos|Telemetria operando em modo nominal de alta fidelidade/i);
  assert.doesNotMatch(world, /99\.99%|12\.4k|0 Alertas|Fila Zerada/);
  assert.match(city, /window\.fenixRenderAlerts\s*=\s*\(\)\s*=>/);
  assert.match(city, /window\.state\?\.data\?\.events/);
});
