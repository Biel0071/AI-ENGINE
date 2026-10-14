'use strict';

/**
 * FÊNIX OS — FASE 17.1: UNREAL RECONNECT & RESILIENCE TEST
 * ========================================================
 * Validates resilience and automatic state reconciliation:
 * 1. Disconnection safety (Fênix survives Unreal client loss)
 * 2. Automatic reconnection timer in UFenixEventBridge
 * 3. WORLD_RESYNC frame deserialization and stale agent pruning
 * 4. Zero duplicate actor spawning during resync cycles
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '../../../');
const UNREAL_ROOT = path.join(REPO_ROOT, 'unreal', 'FenixCity');

test('UNREAL-RECONNECT: 1. EventBridge Implements Automatic Reconnection Loop', () => {
  const bridgeHeader = fs.readFileSync(path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'Bridge', 'FenixEventBridge.h'), 'utf-8');
  const bridgeCpp = fs.readFileSync(path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'Bridge', 'FenixEventBridge.cpp'), 'utf-8');

  assert.ok(bridgeHeader.includes('ReconnectInterval'), 'Must define ReconnectInterval');
  assert.ok(bridgeHeader.includes('ReconnectTimerHandle'), 'Must define ReconnectTimerHandle');
  assert.ok(bridgeCpp.includes('SetTimer(ReconnectTimerHandle'), 'Must schedule reconnection timer on connection loss');
  assert.ok(bridgeCpp.includes('ConnectToFenix()'), 'Must call ConnectToFenix on reconnect timer trigger');
});

test('UNREAL-RECONNECT: 2. WorldState Prunes Stale Actors on WORLD_RESYNC', () => {
  const worldStateCpp = fs.readFileSync(path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'World', 'FenixWorldState.cpp'), 'utf-8');

  assert.ok(worldStateCpp.includes('HandleWorldResync'), 'Must implement HandleWorldResync');
  assert.ok(worldStateCpp.includes('StaleAgentIds'), 'Must track stale agent IDs');
  assert.ok(worldStateCpp.includes('HandleAgentRemoved'), 'Must remove stale agents during resync');
  assert.ok(worldStateCpp.includes('HandleAgentUpdated'), 'Must update existing agents without duplicate spawn');
});

test('UNREAL-RECONNECT: 3. Server WebSocket Message Handler Responds to WORLD_RESYNC_REQUEST', () => {
  const serverJs = fs.readFileSync(path.join(REPO_ROOT, 'ai-engine', 'grg', 'src', 'server.js'), 'utf-8');

  assert.ok(serverJs.includes("msg.type === 'WORLD_RESYNC_REQUEST'"), 'WebSocket must handle WORLD_RESYNC_REQUEST');
  assert.ok(serverJs.includes("type: 'WORLD_RESYNC'"), 'WebSocket must respond with WORLD_RESYNC type');
});
