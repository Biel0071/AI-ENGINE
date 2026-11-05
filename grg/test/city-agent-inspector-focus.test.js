const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../public/fenix-v11-interactions.js'), 'utf8');
const worldSource = fs.readFileSync(path.join(__dirname, '../public/fenix-world-3d.js'), 'utf8');
const sidebarSource = fs.readFileSync(path.join(__dirname, '../public/fenix-mascot-sidebar.js'), 'utf8').replace(/\r/g, '');

function loadFocusAgent() {
  const method = worldSource.match(/    focusAgent\(agentId\) \{[\s\S]*?(?=\n    toggleDayNight\()/)?.[0];
  assert.ok(method, 'World3D focusAgent method exists');
  return new Function('T', 'districtPoint', `return ({${method.trim()}}).focusAgent;`)(
    { Vector3: class Vector3 { constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } } },
    (district, x, y, z) => ({ district, x, y, z })
  );
}

test('Inspector City action waits for runtime data and focuses the selected real agent', async () => {
  const fn = source.match(/window\.fenixFocusAgentInCity\s*=\s*function\(\)\s*\{[\s\S]*?\n  \};/)?.[0];
  assert.ok(fn, 'Ver na Cidade handler exists');
  let ready = false;
  let selected = null;
  let pending = Promise.resolve();
  const world = {
    agents: new Map([['agent-debug', { id: 'agent-debug', name: 'Debug Agent', mesh: { position: { x: 3, y: 0.8, z: 5 } } }]]),
    async syncRealData() { await Promise.resolve(); ready = true; },
    selectAgent(id) { assert.equal(ready, true); selected = id; this.selectedAgent = this.agents.get(id); },
    setSemanticLevel(level) { assert.equal(level, 'agent'); assert.equal(this.selectedAgent?.id, selected); }
  };
  const window = { fenixWorld3D: world, showView(view) { assert.equal(view, 'city'); } };
  const context = {
    window,
    document: { getElementById(id) { return id === 'agentInspId' ? { textContent: 'Debug' } : null; } },
    setTimeout(callback) { pending = callback(); }
  };
  vm.runInNewContext(fn, context);
  window.fenixFocusAgentInCity();
  await pending;
  assert.equal(selected, 'agent-debug');
});

test('known agent IDs focus their measured runtime mesh before legacy building coordinates', () => {
  const focusAgent = loadFocusAgent();
  const focused = [];
  const agent = { id: 'agent-api-ops', mesh: { position: { x: 13, y: 1.1, z: -8 } } };
  const world = {
    agents: new Map([[agent.id, agent]]),
    focusEntity(...args) { focused.push(args); },
    focusFloor() { assert.fail('measured agent focus should not select a legacy floor'); }
  };

  focusAgent.call(world, agent.id);

  assert.equal(focused.length, 1);
  assert.deepEqual([focused[0][0].x, focused[0][0].y, focused[0][0].z], [13, 2.5, -8]);
});

test('legacy building focus remains available when the agent has no measured position', () => {
  const focusAgent = loadFocusAgent();
  const focused = [];
  const floors = [];
  const world = {
    agents: new Map([['agent-api-ops', { id: 'agent-api-ops' }]]),
    focusEntity(...args) { focused.push(args); },
    focusFloor(floor) { floors.push(floor); }
  };

  focusAgent.call(world, 'agent-api-ops');

  assert.deepEqual(floors, [1]);
  assert.equal(focused.length, 1);
  assert.equal(focused[0][0].district, 'api-platform');
});

test('opening an agent in City closes its profile dossier before navigation', () => {
  const fn = source.match(/window\.fenixFocusAgentInCity\s*=\s*function\(\)\s*\{[\s\S]*?\n  \};/)?.[0];
  assert.ok(fn, 'Ver na Cidade handler exists');
  const calls = [];
  let pending;
  const window = {
    fenixCloseAgentDossier() { calls.push('close-dossier'); },
    showView(view) { calls.push(`show-${view}`); }
  };
  const context = {
    window,
    document: { getElementById(id) { return id === 'agentInspId' ? { textContent: 'agent-api-ops' } : null; } },
    setTimeout(callback) { pending = callback; }
  };

  vm.runInNewContext(fn, context);
  window.fenixFocusAgentInCity();

  assert.deepEqual(calls, ['close-dossier', 'show-city']);
  assert.equal(typeof pending, 'function');
});

test('agent selection does not open a second dossier over the canonical Inspector', async () => {
  const start = sidebarSource.indexOf('    hookAgentCards() {');
  const end = sidebarSource.indexOf('\n    }\n  };', start);
  assert.ok(start >= 0 && end > start, 'agent card hook exists');
  const method = sidebarSource.slice(start, end + '\n    }'.length);
  let onClick;
  let afterClick;
  const calls = [];
  const document = {
    addEventListener(event, callback) { if (event === 'click') onClick = callback; },
    getElementById() { return { classList: { contains: () => true } }; }
  };
  const roster = {
    openModal(...args) { calls.push(['open', ...args]); },
    closeModal() { calls.push(['close']); }
  };
  const hook = new Function('document', 'AgentRosterRPG', 'setTimeout', `return ({${method.trim()}}).hookAgentCards;`)(document, roster, callback => { afterClick = callback; });
  hook();
  onClick({ target: { closest: () => ({ dataset: { agentId: 'agent-api-ops', agentStatus: 'AVAILABLE' }, querySelector(selector) { return { textContent: selector.endsWith('name') ? 'Alex - API Operations' : 'API Engineer' }; } }) } });
  assert.deepEqual(calls, []);
  afterClick();

  assert.deepEqual(calls, [['close']]);
});
