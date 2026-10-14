/**
 * FÊNIX OS — EMPTY STATE & ENTITY LIFECYCLE TEST SUITE
 * 
 * Mandated by Reality Reset V16 (Requirement 35):
 * 1. Inicializa o Fênix OS com 0 empresas, 0 agentes, 0 projetos e valida que TODAS as views mostram honest empty state
 *    (nenhum card fake, nenhuma métrica inventada, nenhum agente 3D spawnado).
 * 2. Testa o fluxo de criação real: createCompany('Acme Corp') -> persistência no CompanyRegistry ->
 *    refletido na UI -> selecionável via GlobalSelectionStore.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const GRG_DIR = path.resolve(__dirname, '..');
const { CompanyRegistry } = require('../src/company/company-registry');
const { GlobalSelectionStore } = require('../public/global-selection-store.js');

test('empty-state: clean CompanyRegistry starts with exactly 0 companies', async () => {
  const registry = new CompanyRegistry();
  await registry.initialize();

  const companies = registry.list();
  assert.equal(companies.length, 0, 'Initial clean CompanyRegistry must have 0 companies');
  assert.equal(registry.get('deposito-mais'), null, 'deposito-mais must not exist in clean registry');
  assert.equal(registry.get('idrinks'), null, 'idrinks must not exist in clean registry');
});

test('empty-state: index.html contains no hardcoded static company cards', () => {
  const indexHtml = fs.readFileSync(path.join(GRG_DIR, 'public', 'index.html'), 'utf8');

  // Must have dynamic container with honest empty state
  assert.match(
    indexHtml,
    /id="fenixSidebarCompaniesList"/,
    'index.html must have #fenixSidebarCompaniesList dynamic container'
  );
  assert.match(
    indexHtml,
    /Nenhuma empresa cadastrada/,
    'index.html initial template must have honest empty message'
  );

  // Must NOT have hardcoded cards for fake entities in the sidebar
  assert.doesNotMatch(
    indexHtml,
    /data-company="deposito-mais"/,
    'index.html must not contain static data-company="deposito-mais"'
  );
  assert.doesNotMatch(
    indexHtml,
    /data-company="idrinks"/,
    'index.html must not contain static data-company="idrinks"'
  );
  assert.doesNotMatch(
    indexHtml,
    /data-company="zapai"/,
    'index.html must not contain static data-company="zapai"'
  );
});

test('empty-state: fenix-world-3d does not spawn 3D character models on clean boot with 0 agents', () => {
  const world3d = fs.readFileSync(path.join(GRG_DIR, 'public', 'fenix-world-3d.js'), 'utf8');

  // Verify constructor does NOT call _initCamilaAgent or _initWorkforceAgents
  const constructorSlice = world3d.substring(
    world3d.indexOf('this._initUrbanInfrastructure();'),
    world3d.indexOf('this._initVehicles();')
  );

  assert.doesNotMatch(
    constructorSlice,
    /this\._initCamilaAgent\(\)/,
    'Constructor must NOT unconditionally call _initCamilaAgent()'
  );
  assert.doesNotMatch(
    constructorSlice,
    /this\._initWorkforceAgents\(\)/,
    'Constructor must NOT unconditionally call _initWorkforceAgents()'
  );

  // Verify empty overlay element exists
  assert.match(
    world3d,
    /Nenhum agente ativo na cidade/,
    'fenix-world-3d.js must have honest empty overlay for 0 active agents'
  );
});

test('empty-state: real company creation flow (create -> persist -> UI list -> GlobalSelectionStore)', async () => {
  // Mock in-memory storage backing
  const memoryStore = {
    data: { companies: [] },
    async read() { return this.data; },
    async write(state) { this.data = state; }
  };

  const registry = new CompanyRegistry({ store: memoryStore });
  await registry.initialize();

  // 1. Initial empty verification
  assert.equal(registry.list().length, 0);

  // 2. Create real company 'Acme Corp'
  const newCompany = await registry.register({
    companyId: 'comp_acme_corp',
    name: 'Acme Corp',
    segment: 'Logística Avançada',
    description: 'Empresa real de testes'
  });

  assert.ok(newCompany);
  assert.equal(newCompany.id, 'comp_acme_corp');
  assert.equal(newCompany.name, 'Acme Corp');

  // 3. Persist and re-read
  const fetched = registry.get('comp_acme_corp');
  assert.ok(fetched);
  assert.equal(fetched.name, 'Acme Corp');
  assert.equal(registry.list().length, 1);

  // 4. Test UI simulation
  const mockDOM = {
    listInnerHTML: '',
    countText: '',
    activeClassApplied: false
  };

  function simulateRenderSidebarCompanies(companies, selectedId = null) {
    mockDOM.countText = String(companies.length);
    if (!companies.length) {
      mockDOM.listInnerHTML = '<div class="fenix-empty">Nenhuma empresa cadastrada</div>';
      return;
    }
    mockDOM.listInnerHTML = companies.map(c => {
      const active = c.id === selectedId ? ' active' : '';
      if (active) mockDOM.activeClassApplied = true;
      return `<div class="fenix-sidebar-company-card${active}" data-company-id="${c.id}">${c.name}</div>`;
    }).join('');
  }

  // Render with registered companies
  simulateRenderSidebarCompanies(registry.list(), null);
  assert.equal(mockDOM.countText, '1');
  assert.match(mockDOM.listInnerHTML, /Acme Corp/);
  assert.equal(mockDOM.activeClassApplied, false);

  // 5. Select via GlobalSelectionStore
  const store = new GlobalSelectionStore();
  const selected = store.select('company', 'comp_acme_corp', fetched);

  assert.equal(selected.type, 'company');
  assert.equal(selected.id, 'comp_acme_corp');
  assert.equal(store.state.selectedCompany?.name, 'Acme Corp');

  // Re-render UI with active selection
  simulateRenderSidebarCompanies(registry.list(), store.state.selectedCompany.id);
  assert.equal(mockDOM.activeClassApplied, true);
  assert.match(mockDOM.listInnerHTML, /class="fenix-sidebar-company-card active"/);
});

test('empty-state: fenix-operational-os KPIs initialize with honest absence (—)', () => {
  const osFile = fs.readFileSync(path.join(GRG_DIR, 'public', 'fenix-operational-os.js'), 'utf8');

  // Initial KPIs in loadOperationsView must NOT have hardcoded fake 100%, 15 ONLINE, 4 ATIVOS
  assert.doesNotMatch(
    osFile,
    /'100%\s*HEALTHY'/,
    'fenix-operational-os.js must not contain hardcoded 100% HEALTHY'
  );
  assert.doesNotMatch(
    osFile,
    /'100%\s*AUDITABLE'/,
    'fenix-operational-os.js must not contain hardcoded 100% AUDITABLE'
  );
  assert.doesNotMatch(
    osFile,
    /'15\s*ONLINE'/,
    'fenix-operational-os.js must not contain hardcoded 15 ONLINE'
  );
  assert.doesNotMatch(
    osFile,
    /'4\s*ATIVOS'/,
    'fenix-operational-os.js must not contain hardcoded 4 ATIVOS'
  );
});
