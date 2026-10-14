const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicRoot = path.join(__dirname, '../public');
const html = fs.readFileSync(path.join(publicRoot, 'index.html'), 'utf8');
const isoCity = fs.readFileSync(path.join(publicRoot, 'iso-city.js'), 'utf8');
const reality = fs.readFileSync(path.join(publicRoot, 'city-reality-engine.js'), 'utf8');
const sidebar = fs.readFileSync(path.join(publicRoot, 'fenix-mascot-sidebar.js'), 'utf8');
const world = fs.readFileSync(path.join(publicRoot, 'fenix-world-3d.js'), 'utf8');
const unifiedApp = fs.readFileSync(path.join(publicRoot, 'unified-app.js'), 'utf8');
const cityCss = fs.readFileSync(path.join(publicRoot, 'city-reality.css'), 'utf8');

test('City exposes one live minimap canvas and no fixed screenshot thumbnail', () => {
  assert.equal((html.match(/id="fenixMinimap"/g) || []).length, 1);
  assert.match(html, /<canvas[^>]*id="fenixMinimap"/);
  assert.doesNotMatch(html, /id="fnxSidebarMinimap"|id="fenixFloatingMinimap"|id="dockMiniMapCanvas"|fenix-city-canvas-hd\.png/);
  assert.match(cityCss, /\.fnx-sidebar-minimap\s*\{\s*display:\s*none\s*!important;/);
  assert.match(html, /id="fenixTickerStatus" data-state="unavailable"/);
  assert.match(world, /dynamicBuildings\.values\(\)/);
  assert.match(world, /this\.agents\.values\(\)/);
  assert.match(world, /this\.focusEntity\(new T\.Vector3\(worldX/);
});

test('snapshot and heartbeat transport messages are not shown as system events', () => {
  assert.match(isoCity, /'snapshot', 'runtime\.snapshot'/);
  assert.match(sidebar, /type === 'snapshot'/);
  assert.match(reality, /data\.events = data\.events\.filter/);
  assert.match(reality, /ignoredTypes\.has\(type\)/);
  assert.match(reality, /\['runtime-event', 'event-stream'\]\.includes\(String\(detail\.source \|\| ''\)\)/);
  assert.match(reality, /const alerts = counts\.critical \+ counts\.warning/);
  assert.match(reality, /notificationBadge\.style\.display = !events \|\| alerts === 0 \? 'none' : 'flex'/);
  assert.match(reality, /window\.__fenixSystemEvents = events;[\s\S]{0,180}window\.fenixRenderAlerts\?\.\(\);/);
  assert.doesNotMatch(sidebar, /EVENTO ACEITO/);
});

test('footer alerts, telemetry and status come from API measurements', () => {
  assert.match(reality, /\/api\/v2\/events\/history\?limit=100/);
  assert.match(reality, /hostTelemetry\?\.cpu\?\.percent|system\?\.cpu/);
  assert.doesNotMatch(reality, /alertBtn\.textContent\s*=\s*'0'/);
  assert.doesNotMatch(reality, /20°C Céu Limpo|24°C Ensolarado/);
  assert.doesNotMatch(sidebar, /const host = window\.location\?\.host/);
});

test('API error envelopes never become entity counts and KPIs count active entities', () => {
  const start = unifiedApp.indexOf('window.updateSidebarCounters = function(snapshot) {');
  const end = unifiedApp.indexOf('\nwindow.renderSidebarCompanies', start);
  assert.ok(start >= 0 && end > start, 'counter renderer is available');
  const counterRenderer = unifiedApp.slice(start, end);
  const elements = new Map();
  const sandbox = {
    window: { FENIX: { live: {} }, fenixRenderAlerts() {} },
    document: { getElementById(id) {
      if (!elements.has(id)) elements.set(id, { textContent: '' });
      return elements.get(id);
    } }
  };
  require('node:vm').runInNewContext(counterRenderer, sandbox);

  sandbox.window.updateSidebarCounters({
    agents: { __error: 'HTTP 503' },
    missions: { __error: 'HTTP 404' }
  });
  assert.equal(elements.get('topKpiAgentsVal').textContent, '—');
  assert.equal(elements.get('topKpiMissionsVal').textContent, '—');

  sandbox.window.FENIX.live.agents = [];
  sandbox.window.FENIX.live.missions = [];
  sandbox.window.updateSidebarCounters({ agents: { __error: 'HTTP 503' }, missions: { __error: 'HTTP 404' } });
  assert.equal(elements.get('topKpiAgentsVal').textContent, '—');
  assert.equal(elements.get('topKpiMissionsVal').textContent, '—');

  sandbox.window.updateSidebarCounters({
    agents: { agents: [{ status: 'online' }, { status: 'offline' }] },
    missions: { missions: [{ status: 'running' }, { status: 'completed' }, { status: 'pending' }] }
  });
  assert.equal(elements.get('topKpiAgentsVal').textContent, '1');
  assert.equal(elements.get('topKpiMissionsVal').textContent, '1');
});

test('empty default live arrays stay unavailable until a collection was measured', () => {
  const start = unifiedApp.indexOf('window.updateSidebarCounters = function(snapshot) {');
  const end = unifiedApp.indexOf('\nwindow.renderSidebarCompanies', start);
  const elements = new Map();
  const sandbox = {
    window: { FENIX: { live: { snapshotMeasured: true, agents: [], missions: [] } }, fenixRenderAlerts() {} },
    document: { getElementById(id) {
      if (!elements.has(id)) elements.set(id, { textContent: '' });
      return elements.get(id);
    } }
  };
  require('node:vm').runInNewContext(unifiedApp.slice(start, end), sandbox);

  sandbox.window.updateSidebarCounters({ health: { status: 'degraded' } });

  assert.equal(elements.get('topKpiAgentsVal').textContent, '—');
  assert.equal(elements.get('topKpiMissionsVal').textContent, '—');
  assert.match(unifiedApp, /agentsMeasured === true && Array\.isArray\(window\.FENIX\.live\.agents\)/);
});

test('header and event panel distinguish API failure from measured empty data', () => {
  const headerStart = unifiedApp.indexOf('function renderHeader() {');
  const headerEnd = unifiedApp.indexOf('\nfunction renderCommand() {', headerStart);
  const commandStart = headerEnd + 1;
  const commandEnd = unifiedApp.indexOf('\nfunction renderRuntime() {', commandStart);
  const values = new Map();
  const agentTable = { innerHTML: '', querySelectorAll: () => [] };
  const eventStream = { innerHTML: '' };
  const sandbox = {
    state: { data: { health: { __error: 'HTTP 404' }, agents: { __error: 'HTTP 404' }, events: { __error: 'HTTP 404' } }, projects: [], repos: [], jobs: [], events: [] },
    localStorage: { getItem: () => null },
    window: { FENIX: { live: { snapshotMeasured: false, eventsMeasured: false, events: [] } } },
    document: { getElementById(id) { return id === 'agentList' ? agentTable : id === 'eventStream' ? eventStream : null; } },
    $: (id) => id === 'agentList' ? agentTable : id === 'eventStream' ? eventStream : null,
    text: (id, value) => values.set(id, value),
    escapeHtml: (value) => String(value),
    esc: (value) => String(value)
  };
  require('node:vm').runInNewContext(`${unifiedApp.slice(headerStart, headerEnd)}\n${unifiedApp.slice(commandStart, commandEnd)}`, sandbox);

  sandbox.renderHeader();
  sandbox.renderCommand();
  assert.equal(values.get('kpiAgents'), '—');
  assert.equal(values.get('eventCount'), 'Eventos indisponíveis');
  assert.match(agentTable.innerHTML, /indisponív/);
  assert.match(eventStream.innerHTML, /indisponíveis/i);
});

test('shell contains no fixed weather, notification count, or stale indicator assets', () => {
  assert.doesNotMatch(html, /São Paulo 24°C|Ter, 10 Dez 15:42|fnx-user-badge-num[^>]*>\s*2\s*</);
  assert.match(html, /id="fnxNotifCount" hidden[^>]*style="display:none"/);
  assert.doesNotMatch(sidebar, /Fênix OS Online/);
  assert.doesNotMatch(reality, /Operação saudável com telemetria nominal/);
  assert.match(html, /iso-city\.js\?v=4/);
  assert.match(html, /fenix-world-3d\.js\?v=13-city-district-labels-20261013/);
});

test('operations drawer shows unavailable when live jobs and health have not been measured', () => {
  const start = unifiedApp.indexOf('window.fenixToggleCityOps = function() {');
  const end = unifiedApp.indexOf('// Hub 4: Cognitive Brain Unified Switcher', start);
  assert.ok(start >= 0 && end > start, 'operations drawer renderer is available');
  const elements = new Map([
    ['fenixCityOpsDrawer', { style: { display: 'none' } }],
    ['cityOpsDrawerContent', { innerHTML: '' }]
  ]);
  const sandbox = {
    escapeHtml(value) { return String(value); },
    window: {
      state: { jobs: [], data: { jobs: { __error: 'HTTP 503' }, events: { __error: 'HTTP 401' } } },
      FENIX: { live: { snapshotMeasured: false, health: {} } }
    },
    document: { getElementById(id) { return elements.get(id) || null; } }
  };
  require('node:vm').runInNewContext(unifiedApp.slice(start, end), sandbox);
  sandbox.window.fenixToggleCityOps();
  const content = elements.get('cityOpsDrawerContent').innerHTML;
  assert.match(content, /INDISPONÍVEL/);
  assert.match(content, /color:#94A3B8; font-weight:700; font-size:11px/);
  assert.match(content, />—</);
  assert.doesNotMatch(content, /BullMQ|ONLINE|INCIDENTES[\s\S]{0,200}>0</);
});

test('city cockpit does not infer standby or online from empty unmeasured state', () => {
  const start = unifiedApp.indexOf('window.fenixToggleCityCockpit = function() {');
  const end = unifiedApp.indexOf('window.fenixToggleCityOps = function() {', start);
  assert.ok(start >= 0 && end > start, 'city cockpit renderer is available');
  const elements = new Map([
    ['fenixCityCockpitDrawer', { style: { display: 'none' } }],
    ['cityCockpitDrawerContent', { innerHTML: '' }]
  ]);
  const sandbox = {
    escapeHtml(value) { return String(value); },
    window: {
      state: { data: { agents: { __error: 'HTTP 503' }, missions: { __error: 'HTTP 404' } } },
      FENIX: { live: { snapshotMeasured: false, agents: [], missions: [] } }
    },
    document: { getElementById(id) { return elements.get(id) || null; } }
  };
  require('node:vm').runInNewContext(unifiedApp.slice(start, end), sandbox);
  sandbox.window.fenixToggleCityCockpit();
  const content = elements.get('cityCockpitDrawerContent').innerHTML;
  assert.match(content, /INDISPONÍVEL/);
  assert.match(content, /Missões indisponíveis nesta leitura/);
  assert.match(content, /Agentes indisponíveis nesta leitura/);
  assert.match(content, /color:#94A3B8; font-weight:700;/);
  assert.doesNotMatch(content, /STANDBY|Autonomous Evolution Worker/);
});
