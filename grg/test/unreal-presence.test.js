'use strict';

/**
 * FÊNIX OS — FASE 17.1: UNREAL PRESENCE TEST
 * ===========================================
 * Validates spatial presence, office layout, multi-floor cutaways,
 * and social interactions (conversations, meetings, and war room).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { CANONICAL_WORKSTATIONS } = require('../src/api/unreal-world-routes');

const REPO_ROOT = path.resolve(__dirname, '../../../');
const UNREAL_ROOT = path.join(REPO_ROOT, 'unreal', 'FenixCity');

test('UNREAL-PRESENCE: 1. Canonical Workstation Registry has 20 Desks Across 4 Departments', () => {
  assert.equal(CANONICAL_WORKSTATIONS.length, 20, 'Must have exactly 20 canonical workstations');

  const deptCounts = {
    EXECUTIVE: 0,
    ENGINEERING: 0,
    RESEARCH: 0,
    OPERATIONS: 0
  };

  for (const ws of CANONICAL_WORKSTATIONS) {
    assert.ok(ws.workstationId, 'Every workstation must have an ID');
    assert.ok(ws.name, 'Every workstation must have a name');
    assert.ok(ws.floor >= 1 && ws.floor <= 3, 'Floor must be between 1 and 3');
    deptCounts[ws.department] = (deptCounts[ws.department] || 0) + 1;
  }

  assert.equal(deptCounts.EXECUTIVE, 4, 'Executive department must have 4 workstations');
  assert.equal(deptCounts.ENGINEERING, 6, 'Engineering department must have 6 workstations');
  assert.equal(deptCounts.RESEARCH, 5, 'Research department must have 5 workstations');
  assert.equal(deptCounts.OPERATIONS, 5, 'Operations department must have 5 workstations');
});

test('UNREAL-PRESENCE: 2. Building HQ Spire supports 3-Floor Cutaways for Internal Inspection', () => {
  const buildingCpp = fs.readFileSync(path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'World', 'FenixBuildingHQ.cpp'), 'utf-8');

  assert.ok(buildingCpp.includes('SetFloorCutaway'), 'Must implement SetFloorCutaway');
  assert.ok(buildingCpp.includes('ResetExteriorView'), 'Must implement ResetExteriorView');
  assert.ok(buildingCpp.includes('ExteriorFacadeMesh->SetVisibility'), 'Cutaway must toggle exterior facade visibility');
  assert.ok(buildingCpp.includes('RoofMesh->SetVisibility'), 'Cutaway must toggle roof visibility');
});

test('UNREAL-PRESENCE: 3. Social Interaction Events Dispatched in EventBridge & Handled in WorldState', () => {
  const bridgeCpp = fs.readFileSync(path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'Bridge', 'FenixEventBridge.cpp'), 'utf-8');
  const worldStateCpp = fs.readFileSync(path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'World', 'FenixWorldState.cpp'), 'utf-8');

  // EventBridge dispatches conversation messages
  assert.ok(bridgeCpp.includes('OnConversationStarted'), 'Bridge must dispatch OnConversationStarted');
  assert.ok(bridgeCpp.includes('OnConversationMessage'), 'Bridge must dispatch OnConversationMessage');

  // WorldState handles speech bubbles and peer collaboration
  assert.ok(worldStateCpp.includes('HandleConversationStarted'), 'WorldState must handle conversation start');
  assert.ok(worldStateCpp.includes('HandleConversationMessage'), 'WorldState must render conversation messages');
});
