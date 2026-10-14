'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('Visual Reality Gate: Single Agent Inspector Contract', () => {
  const fenixOpPath = path.join(__dirname, '../public/fenix-operational-os.js');
  const officeLivePath = path.join(__dirname, '../public/office-live.js');
  const isoCityPath = path.join(__dirname, '../public/iso-city.js');

  const fenixOpSrc = fs.readFileSync(fenixOpPath, 'utf8');
  const officeLiveSrc = fs.readFileSync(officeLivePath, 'utf8');
  const isoCitySrc = fs.readFileSync(isoCityPath, 'utf8');

  // 1. openSpatialAgentChat must delegate to fenixShowWorldAgentInspector and close spatial chat
  assert.ok(
    fenixOpSrc.includes('window.closeSpatialChat?.()') && fenixOpSrc.includes('window.fenixShowWorldAgentInspector(agent)'),
    'openSpatialAgentChat must close spatial chat and delegate to fenixShowWorldAgentInspector'
  );

  // 2. fenixShowWorldAgentInspector must close spatial chat to prevent dual modals
  assert.ok(
    officeLiveSrc.includes('window.closeSpatialChat()'),
    'fenixShowWorldAgentInspector must close parallel spatial chat'
  );

  // 3. fenixShowWorldAgentInspector buttons have proper IDs
  assert.ok(
    officeLiveSrc.includes('id="fenixWorldAgentInspectorClose"'),
    'Inspector must have canonical close button id'
  );
  assert.ok(
    officeLiveSrc.includes('id="worldAgentChatSendBtn"'),
    'Inspector must have canonical send button id'
  );

  // 4. iso-city click handler must close spatial chat and only invoke fenixShowWorldAgentInspector
  assert.ok(
    isoCitySrc.includes('window.fenixShowWorldAgentInspector(agent)') &&
    !isoCitySrc.includes('window.openSpatialAgentChat(agent, sc)'),
    'iso-city must not open duplicate spatial chat on agent click'
  );
});

test('Visual Reality Gate: Strict 6-Tier LOD Policy in iso-city.js', () => {
  const isoCityPath = path.join(__dirname, '../public/iso-city.js');
  const isoCitySrc = fs.readFileSync(isoCityPath, 'utf8');

  // Verify the 6 tiers are explicitly coded in _updateZoomDisplay
  assert.ok(isoCitySrc.includes("'L0 MACRO WORLD'"), 'Tier 0 must be L0 MACRO WORLD');
  assert.ok(isoCitySrc.includes("'L1 DISTRITO'"), 'Tier 1 must be L1 DISTRITO');
  assert.ok(isoCitySrc.includes("'L2 EDIFÍCIO'"), 'Tier 2 must be L2 EDIFÍCIO');
  assert.ok(isoCitySrc.includes("'L3 CORTE INTERIOR'"), 'Tier 3 must be L3 CORTE INTERIOR');
  assert.ok(isoCitySrc.includes("'L4 AGENTE'"), 'Tier 4 must be L4 AGENTE');
  assert.ok(isoCitySrc.includes("'L5 ESTAÇÃO'"), 'Tier 5 must be L5 ESTAÇÃO');

  // Verify duplicate _updateZoomDisplay was removed
  const occurrences = (isoCitySrc.match(/_updateZoomDisplay\s*\(\)\s*\{/g) || []).length;
  assert.equal(occurrences, 1, 'There must be exactly ONE canonical _updateZoomDisplay method');
});

test('Visual Reality Gate: Single-Building Cutaway Policy at Tier 3+ (zoom >= 2.7)', () => {
  const isoCityPath = path.join(__dirname, '../public/iso-city.js');
  const isoCitySrc = fs.readFileSync(isoCityPath, 'utf8');

  // Cutaway threshold must be zoom >= 2.7
  assert.ok(
    isoCitySrc.includes('zoom >= 2.7'),
    'Cutaways must strictly only open at Tier 3+ (zoom >= 2.7)'
  );

  // Must determine single closest canonical landmark
  assert.ok(
    isoCitySrc.includes('closestBuildingKey'),
    'Must determine single closest canonical landmark for cutaways'
  );

  // Floor label banner must use clamped capsule pill
  assert.ok(
    isoCitySrc.includes('Clamped Capsule Pill') || isoCitySrc.includes('pillY - 11'),
    'Floor label banner must be bounded in a capsule pill'
  );
});

test('Visual Reality Gate: Company Selection & Token Resolution in city-reality-engine.js', () => {
  const enginePath = path.join(__dirname, '../public/city-reality-engine.js');
  const engineSrc = fs.readFileSync(enginePath, 'utf8');

  // Must support reading grg_token from localStorage
  assert.ok(
    engineSrc.includes("localStorage.getItem('grg_token')"),
    'Must resolve grg_token from localStorage in getAuthToken'
  );

  // Company records must come from the API; an offline fallback would fabricate live city data.
  assert.ok(
    !/CANONICAL_COMPANIES|zapai-crm|deposito-mais/.test(engineSrc),
    'The city source must not contain a seeded company fallback'
  );

  // selectCompany must dispatch fenix:company-selected and sync with fenixCity
  assert.ok(
    engineSrc.includes('fenix:company-selected'),
    'selectCompany must dispatch fenix:company-selected event'
  );
  assert.ok(
    engineSrc.includes('window.fenixCity.state.selectedCompanyId = comp.companyId'),
    'selectCompany must synchronize selectedCompanyId with fenixCity'
  );
});
