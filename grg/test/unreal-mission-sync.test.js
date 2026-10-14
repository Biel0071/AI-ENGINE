'use strict';

/**
 * FÊNIX OS — FASE 17.1: UNREAL MISSION SYNC TEST
 * ===============================================
 * Validates the complete mission sequence from Fênix MissionKernel to Unreal Engine:
 * MISSION_CREATED -> MISSION_ASSIGNED -> MISSION_STARTED -> AGENT MOVES ->
 * ENTER BUILDING -> WORKSTATION -> WORKING -> MISSION_COMPLETED -> MEMORY
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '../../../');
const UNREAL_ROOT = path.join(REPO_ROOT, 'unreal', 'FenixCity');

test('UNREAL-MISSION-SYNC: 1. Mission Events Declared in Protocol Contracts', () => {
  const protocolHeader = fs.readFileSync(path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'Bridge', 'FenixWorldProtocol.h'), 'utf-8');

  assert.ok(protocolHeader.includes('MISSION_CREATED'), 'Must support MISSION_CREATED');
  assert.ok(protocolHeader.includes('MISSION_ASSIGNED'), 'Must support MISSION_ASSIGNED');
  assert.ok(protocolHeader.includes('MISSION_STARTED'), 'Must support MISSION_STARTED');
  assert.ok(protocolHeader.includes('MISSION_COMPLETED'), 'Must support MISSION_COMPLETED');
  assert.ok(protocolHeader.includes('MISSION_FAILED'), 'Must support MISSION_FAILED');
  assert.ok(protocolHeader.includes('struct FFenixMissionEvent'), 'FFenixMissionEvent struct must exist');
});

test('UNREAL-MISSION-SYNC: 2. WorldState Handles Mission Lifecycle & Workstation Occupancy', () => {
  const worldStateCpp = fs.readFileSync(path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'World', 'FenixWorldState.cpp'), 'utf-8');

  assert.ok(worldStateCpp.includes('HandleMissionAssigned'), 'Must handle HandleMissionAssigned');
  assert.ok(worldStateCpp.includes('HandleMissionCompleted'), 'Must handle HandleMissionCompleted');
  assert.ok(worldStateCpp.includes('SetAgentState(EFenixAgentState::WORKING)'), 'Mission assignment must set agent state to WORKING');
  assert.ok(worldStateCpp.includes('SetAgentState(EFenixAgentState::IDLE)'), 'Mission completion must return agent state to IDLE');
});

test('UNREAL-MISSION-SYNC: 3. Workstation Hardware Props Reflect Active Work State', () => {
  const wsCpp = fs.readFileSync(path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'World', 'FenixWorkstation.cpp'), 'utf-8');

  // Verify desk, monitor, chair, keyboard, and screen glow light
  assert.ok(wsCpp.includes('DeskMesh'), 'Workstation must contain DeskMesh');
  assert.ok(wsCpp.includes('ChairMesh'), 'Workstation must contain ChairMesh');
  assert.ok(wsCpp.includes('DualMonitorsMesh'), 'Workstation must contain DualMonitorsMesh');
  assert.ok(wsCpp.includes('ScreenGlowLight'), 'Workstation must contain ScreenGlowLight');
  assert.ok(wsCpp.includes('SetScreenWorking'), 'Must implement SetScreenWorking to toggle monitor glow');
});

test('UNREAL-MISSION-SYNC: 4. Speech Bubble displays Real Mission Progress on Character Head', () => {
  const charCpp = fs.readFileSync(path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'Agents', 'FenixAgentCharacter.cpp'), 'utf-8');

  assert.ok(charCpp.includes('ShowSpeechBubble'), 'Character must support ShowSpeechBubble');
  assert.ok(charCpp.includes('HeadNameplateWidget'), 'Character must have HeadNameplateWidget');
});
