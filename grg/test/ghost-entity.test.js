/**
 * FÊNIX OS — GHOST ENTITY & REALITY CONSISTENCY TEST SUITE
 * 
 * Verifies:
 * 1. Non-existent company returns null / 404 (does NOT fabricate or fallback to mock)
 * 2. Non-existent agent is not found and cannot be ghosted without sourceId
 * 3. Initial global selection is null (not Depósito Mais)
 * 4. Selecting API Platform sets context to PROJECT / COMPANY: api-platform (not Depósito Mais)
 * 5. WorldStateEngine strictly enforces Section 11: entities without sourceId return null
 * 6. Clean empty state (0 companies, 0 agents) contains zero fabricated entities
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('fs');

// 1. Backend Registry / Brain modules
const { CompanyBrain } = require('../src/company/company-brain');
const { getCompanyRegistry } = require('../src/company/company-registry');
const { AgentRegistry } = require('../src/agents/agent-registry');
const { getWorldStateEngine } = require('../src/world-model/world-state-engine');

const companyBrain = new CompanyBrain();
const companyRegistry = getCompanyRegistry();
const agentRegistry = new AgentRegistry();
const worldStateEngine = getWorldStateEngine();

test('ghost-entity: non-existent company returns null and does not fabricate a mock', async () => {
  const comp = await companyBrain.getCompany('grg', 'non-existent-company-999');
  assert.equal(comp, null, 'Non-existent company must return null, never fabricate a fallback company');

  const regComp = companyRegistry.get('non-existent-company-999');
  assert.equal(regComp, null, 'CompanyRegistry must return null for unregistered company');
});

test('ghost-entity: WorldStateEngine rejects entities without sourceId (Ghost Entity Prevention)', () => {
  // Section 11: "Toda entidade visual no Fênix DEVE ser uma projeção direta de um modelo do mundo persistido com sourceId"
  const ghostEntity = {
    sourceType: 'AGENT',
    name: 'Ghost Agent',
    x: 10,
    y: 10
    // sourceId missing!
  };

  const registered = worldStateEngine.registerEntity(ghostEntity);
  assert.equal(registered, null, 'registerEntity must return null when sourceId is missing');

  // Valid entity with sourceId
  const validEntity = {
    sourceId: 'real-agent-001',
    sourceType: 'AGENT',
    name: 'Real Agent',
    x: 5,
    y: 5
  };
  const registeredValid = worldStateEngine.registerEntity(validEntity);
  assert.ok(registeredValid, 'registerEntity must succeed when sourceId is provided');
  assert.equal(registeredValid.sourceId, 'real-agent-001');
});

test('ghost-entity: AgentRegistry rejects or reports non-existent agent as null', () => {
  const nonExistent = agentRegistry.get('ghost-agent-xyz');
  assert.equal(nonExistent, null, 'AgentRegistry.get must return null for non-existent agent');
});

test('ghost-entity: GlobalSelectionStore initializes with selectedEntity = null', () => {
  // Load GlobalSelectionStore in a mock window environment
  const originalWindow = global.window;
  const mockWindow = {
    dispatchEvent: () => {},
    CustomEvent: class {
      constructor(name, opts) {
        this.name = name;
        this.detail = opts?.detail;
      }
    }
  };
  global.window = mockWindow;

  // Evaluate global-selection-store.js in this context
  const gssCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'global-selection-store.js'), 'utf8');
  eval(gssCode);

  const store = mockWindow.GlobalSelectionStore;
  assert.ok(store, 'GlobalSelectionStore must be initialized on window');
  assert.equal(store.selectedEntity, null, 'Initial selection must be strictly null (not Depósito Mais)');
  assert.equal(store.selectedCompany, null, 'Initial company must be null');
  assert.equal(store.selectedProject, null, 'Initial project must be null');

  // Test selecting API Platform project
  store.select('project', 'api-platform', { name: 'API Platform' });
  assert.equal(store.selectedEntity.type, 'project');
  assert.equal(store.selectedEntity.id, 'api-platform');
  assert.equal(store.selectedProject.id, 'api-platform');
  assert.notEqual(store.selectedEntity.id, 'deposito-mais');

  // Test clear selection
  store.clearSelection();
  assert.equal(store.selectedEntity, null, 'Selection must return to null on clear');

  global.window = originalWindow;
});

test('ghost-entity: clean empty state contains 0 ghost companies and 0 ghost agents', () => {
  const snapshot = worldStateEngine.getSnapshot();
  assert.equal(snapshot.companies.length, 0, 'Companies in empty state must be empty array');
  assert.equal(snapshot.agents.length, 0, 'Agents in empty state must be empty array');
  assert.deepEqual(snapshot.buildings, {}, 'Buildings in empty state must be empty object');
  assert.equal(snapshot.counts.companies, 0, 'Company count must be 0');
  assert.equal(snapshot.counts.agents, 0, 'Agent count must be 0');
});
