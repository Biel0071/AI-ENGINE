/**
 * FÊNIX OS — CROSS-CONTEXT SELECTION TEST SUITE
 * 
 * Mandated by Reality Reset V16 (Requirement 34):
 * - Selecionar API Platform (projeto) DEVE mudar o contexto do Copilot para 'PROJECT: api-platform',
 *   e NÃO deve selecionar Depósito Mais (empresa). O estado `selectedCompany` deve permanecer `null`.
 * - Cross-context transitions between PROJECT, COMPANY, AGENT, MISSION, WORLD_ENTITY.
 * - Eradication of hardcoded selection fallbacks in frontend controllers.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Setup Node EventTarget for testing window event emissions
const { EventEmitter } = require('node:events');
const eventBus = new EventEmitter();

global.window = {
  dispatchEvent: (event) => {
    eventBus.emit(event.type, event.detail);
  },
  CustomEvent: class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  }
};
global.CustomEvent = global.window.CustomEvent;

const { GlobalSelectionStore } = require('../public/global-selection-store.js');

test('cross-context: GlobalSelectionStore initializes with NULL state across all entity types', () => {
  const store = new GlobalSelectionStore();
  const state = store.state;

  assert.equal(state.selectedEntity, null, 'selectedEntity must initialize as null');
  assert.equal(state.selectedCompany, null, 'selectedCompany must initialize as null');
  assert.equal(state.selectedProject, null, 'selectedProject must initialize as null');
  assert.equal(state.selectedAgent, null, 'selectedAgent must initialize as null');
  assert.equal(state.selectedMission, null, 'selectedMission must initialize as null');
  assert.equal(state.selectedSystem, null, 'selectedSystem must initialize as null');
  assert.equal(state.selectedWorldEntity, null, 'selectedWorldEntity must initialize as null');
});

test('cross-context: Selecting API Platform (project) sets PROJECT context and leaves selectedCompany NULL', (t, done) => {
  const store = new GlobalSelectionStore();
  let copilotContextReceived = null;
  let projectSelectedReceived = null;
  let companySelectedTriggered = false;

  const onCopilot = (detail) => { copilotContextReceived = detail; };
  const onProject = (detail) => { projectSelectedReceived = detail; };
  const onCompany = () => { companySelectedTriggered = true; };

  eventBus.on('copilot:context-changed', onCopilot);
  eventBus.on('project:selected', onProject);
  eventBus.on('company:selected', onCompany);

  // Perform project selection
  store.select('project', 'api-platform', {
    id: 'api-platform',
    name: 'API Platform',
    organization: 'GRG AI Systems'
  });

  // Verify internal state
  const state = store.state;
  assert.ok(state.selectedEntity, 'selectedEntity must be set');
  assert.equal(state.selectedEntity.type, 'project');
  assert.equal(state.selectedEntity.id, 'api-platform');

  assert.ok(state.selectedProject, 'selectedProject must be set');
  assert.equal(state.selectedProject.id, 'api-platform');

  // CRITICAL REQUIREMENT: selectedCompany MUST be null!
  assert.equal(state.selectedCompany, null, 'selectedCompany MUST remain null when selecting a project');
  assert.equal(companySelectedTriggered, false, 'company:selected event MUST NOT be fired when selecting a project');

  // Verify Copilot context updated to PROJECT
  assert.ok(copilotContextReceived, 'copilot:context-changed must be fired');
  assert.equal(copilotContextReceived.contextType, 'PROJECT');
  assert.equal(copilotContextReceived.contextId, 'api-platform');

  // Verify project:selected fired
  assert.ok(projectSelectedReceived, 'project:selected must be fired');
  assert.equal(projectSelectedReceived.projectId, 'api-platform');

  // Cleanup listeners
  eventBus.off('copilot:context-changed', onCopilot);
  eventBus.off('project:selected', onProject);
  eventBus.off('company:selected', onCompany);
  done();
});

test('cross-context: Clean transition from PROJECT to AGENT cleans up previous project state', () => {
  const store = new GlobalSelectionStore();

  // 1. Select project
  store.select('project', 'api-platform', { id: 'api-platform' });
  assert.equal(store.state.selectedProject?.id, 'api-platform');

  // 2. Select agent
  let copilotDetail = null;
  const onCopilot = (d) => { copilotDetail = d; };
  eventBus.on('copilot:context-changed', onCopilot);

  store.select('agent', 'agent-core-01', {
    id: 'agent-core-01',
    name: 'Core Agent',
    role: 'Kernel Specialist'
  });

  const state = store.state;
  assert.equal(state.selectedEntity.type, 'agent');
  assert.equal(state.selectedEntity.id, 'agent-core-01');
  assert.equal(state.selectedAgent?.id, 'agent-core-01');
  assert.equal(state.selectedProject, null, 'Previous selectedProject must be cleaned up');
  assert.equal(state.selectedCompany, null, 'selectedCompany must be null');

  assert.equal(copilotDetail?.contextType, 'AGENT');
  assert.equal(copilotDetail?.contextId, 'agent-core-01');

  eventBus.off('copilot:context-changed', onCopilot);
});

test('cross-context: Selecting a company sets company context and cleans up agent/project', () => {
  const store = new GlobalSelectionStore();

  // 1. Select agent first
  store.select('agent', 'agent-01', { id: 'agent-01' });
  assert.equal(store.state.selectedAgent?.id, 'agent-01');

  // 2. Select company
  let copilotDetail = null;
  const onCopilot = (d) => { copilotDetail = d; };
  eventBus.on('copilot:context-changed', onCopilot);

  store.select('company', 'acme-logistics', {
    id: 'acme-logistics',
    name: 'Acme Logistics',
    status: 'ACTIVE'
  });

  const state = store.state;
  assert.equal(state.selectedEntity.type, 'company');
  assert.equal(state.selectedEntity.id, 'acme-logistics');
  assert.equal(state.selectedCompany?.id, 'acme-logistics');
  assert.equal(state.selectedAgent, null, 'Previous selectedAgent must be cleared');
  assert.equal(state.selectedProject, null, 'selectedProject must be null');

  assert.equal(copilotDetail?.contextType, 'COMPANY');
  assert.equal(copilotDetail?.contextId, 'acme-logistics');

  eventBus.off('copilot:context-changed', onCopilot);
});

test('cross-context: clearSelection resets all selection slots and returns Copilot to GLOBAL', () => {
  const store = new GlobalSelectionStore();
  store.select('project', 'api-platform', { id: 'api-platform' });

  let copilotDetail = null;
  const onCopilot = (d) => { copilotDetail = d; };
  eventBus.on('copilot:context-changed', onCopilot);

  store.clearSelection();

  const state = store.state;
  assert.equal(state.selectedEntity, null);
  assert.equal(state.selectedCompany, null);
  assert.equal(state.selectedProject, null);
  assert.equal(state.selectedAgent, null);

  assert.equal(copilotDetail?.contextType, 'GLOBAL');
  assert.equal(copilotDetail?.contextId, null);

  eventBus.off('copilot:context-changed', onCopilot);
});

test('cross-context: codebase integrity checks for selection fallbacks', () => {
  const GRG_DIR = path.resolve(__dirname, '..');

  // 1. Check index.html does not have hardcoded active company cards
  const indexHtml = fs.readFileSync(path.join(GRG_DIR, 'public', 'index.html'), 'utf8');
  assert.doesNotMatch(
    indexHtml,
    /class="fenix-sidebar-company-card active"[^>]*>[\s\S]*?Depósito Mais/i,
    'index.html must not contain hardcoded active Depósito Mais company card'
  );

  // 2. Check office-live.js does not force Depósito Mais for agents named camila/andre/etc.
  const officeLive = fs.readFileSync(path.join(GRG_DIR, 'public', 'office-live.js'), 'utf8');
  assert.doesNotMatch(
    officeLive,
    /agent\.id\.includes\(['"]camila['"]\)\s*\|\|\s*agent\.id\.includes\(['"]andre['"]\)/,
    'office-live.js must not force Depósito Mais by agent id substring'
  );

  // 3. Check fenix-world-3d.js does not fallback to deposito-mais on company click
  const world3d = fs.readFileSync(path.join(GRG_DIR, 'public', 'fenix-world-3d.js'), 'utf8');
  assert.doesNotMatch(
    world3d,
    /this\.focusDistrict\(data\.districtId\s*\|\|\s*['"]deposito-mais['"]\)/,
    'fenix-world-3d.js must not fallback to deposito-mais in _handleCanvasClick'
  );

  // 4. Check fenix-world-3d.js hero district is logistics
  assert.match(
    world3d,
    /\{\s*id:\s*['"]logistics['"],\s*name:\s*['"]INDUSTRIAL HUB['"]/,
    'fenix-world-3d.js must use logistics district instead of deposito-mais'
  );
});
