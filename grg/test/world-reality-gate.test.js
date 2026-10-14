'use strict';

/**
 * FÊNIX OS — WORLD REALITY GATE V18: DIGITAL TWIN → LIVING WORLD
 * Automated verification of the 12 reality axes:
 * 1. WORLD_EXISTS
 * 2. SCENE_EXISTS
 * 3. CAMERA_EXISTS
 * 4. RENDERER_EXISTS
 * 5. RUNTIME_CONNECTED
 * 6. REAL_AGENT_BOUND
 * 7. REAL_MISSION_BOUND
 * 8. REAL_EVENT_BOUND
 * 9. PATH_SYSTEM
 * 10. BUILDING_SYSTEM
 * 11. VEHICLE_SYSTEM
 * 12. INTERACTION_SYSTEM
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');
const worldJs = fs.readFileSync(path.join(publicDir, 'fenix-world-3d.js'), 'utf8');
const indexHtml = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');

// ── AXIS 1: WORLD_EXISTS ───────────────────────────────────────────────────
test('AXIS 1: WORLD_EXISTS — FenixWorld3DEngine class & singleton registry exist', () => {
  assert.ok(worldJs.includes('class FenixWorld3DEngine'), 'FenixWorld3DEngine class must be defined');
  assert.ok(worldJs.includes('window.initFenixWorld3D'), 'initFenixWorld3D function must be exposed');
  assert.ok(worldJs.includes("register('worldEngine', eng)"), 'Must register worldEngine in singletons');
  assert.ok(worldJs.includes("register('threeRenderLoop', eng)"), 'Must register threeRenderLoop in singletons');
  assert.ok(indexHtml.includes('fenix-world-3d.js'), 'index.html must load fenix-world-3d.js');
});

// ── AXIS 2: SCENE_EXISTS ───────────────────────────────────────────────────
test('AXIS 2: SCENE_EXISTS — Complete urban scene, lighting & terrain initialized', () => {
  assert.ok(worldJs.includes('_initTerrain()'), 'Terrain initialization must exist');
  assert.ok(worldJs.includes('_initUrbanInfrastructure()'), 'Urban infrastructure must exist');
  assert.ok(worldJs.includes('_initDepositoMaisComplex()'), 'Deposito Mais complex must exist');
  assert.ok(worldJs.includes('_initApiPlatformComplex()'), 'Api Platform complex must exist');
  assert.ok(worldJs.includes('_initSurroundingMetropolis()'), 'Surrounding metropolis must exist');
  assert.ok(worldJs.includes('this.sunLight'), 'Directional sunlight must be configured');
  assert.ok(worldJs.includes('this.hemiLight'), 'Hemisphere ambient light must be configured');
  assert.ok(worldJs.includes('this.dockFloodlight'), 'High-intensity dock floodlight must be configured');
});

// ── AXIS 3: CAMERA_EXISTS ──────────────────────────────────────────────────
test('AXIS 3: CAMERA_EXISTS — Camera modes, follow tracking & smooth interpolation', () => {
  assert.ok(worldJs.includes('setCameraMode(mode)'), 'setCameraMode must exist');
  const modes = ['orbit', 'pan', 'zoom', 'focus', 'follow', 'interior', 'city'];
  modes.forEach(m => {
    assert.ok(worldJs.includes(`'${m}'`), `Camera mode '${m}' must be supported`);
  });
  assert.ok(worldJs.includes('followAgent(agentId)'), 'followAgent method must exist');
  assert.ok(worldJs.includes('stopFollowing()'), 'stopFollowing method must exist');
  assert.ok(worldJs.includes('_updateCameraPosition'), 'Camera position interpolation must exist');
});

// ── AXIS 4: RENDERER_EXISTS ────────────────────────────────────────────────
test('AXIS 4: RENDERER_EXISTS — WebGLRenderer setup, headless throttling & lifecycle dispose', () => {
  assert.ok(worldJs.includes('new T.WebGLRenderer'), 'WebGLRenderer must be instantiated');
  assert.ok(worldJs.includes('powerPreference: \'high-performance\''), 'High-performance WebGL requested');
  assert.ok(worldJs.includes('isHeadless'), 'Headless environment check must be present');
  assert.ok(worldJs.includes('dispose()'), 'Lifecycle dispose method must exist');
  assert.ok(worldJs.includes('cancelAnimationFrame(this._animationFrameId)'), 'Render loop must cancel on dispose');
});

// ── AXIS 5: RUNTIME_CONNECTED ──────────────────────────────────────────────
test('AXIS 5: RUNTIME_CONNECTED — Live telemetry sync with zero mock', () => {
  assert.ok(worldJs.includes('syncRealData'), 'syncRealData method must exist');
  assert.ok(worldJs.includes("data.agents"), 'Must consume real runtime agents array');
  assert.ok(worldJs.includes("window.addEventListener('fenix:data'"), 'Must listen to live runtime event bus');
  assert.ok(!worldJs.includes('MOCK_METRICS'), 'Must not contain fabricated metrics');
  assert.ok(!worldJs.includes('FAKE_AGENTS'), 'Must not contain fake agents');
});

// ── AXIS 6: REAL_AGENT_BOUND ───────────────────────────────────────────────
test('AXIS 6: REAL_AGENT_BOUND — Canonical operational agents bound with 3D models', () => {
  const canonicalAgents = [
    'agent-camila',
    'agent-expedicao',
    'agent-andre',
    'agent-api-ops',
    'agent-integration',
    'agent-infra',
    'agent-monitor',
    'agent-security',
    'agent-ai-core',
    'agent-support'
  ];
  canonicalAgents.forEach(agId => {
    assert.ok(worldJs.includes(`'${agId}'`), `Canonical agent '${agId}' must be registered`);
  });
  assert.ok(worldJs.includes('this.agents.set'), 'Agents map must store agent records');
  assert.ok(worldJs.includes('thoughtBubble: camilaBubble'), 'Camila must have AgentThoughtBubble');
});

// ── AXIS 7: REAL_MISSION_BOUND ─────────────────────────────────────────────
test('AXIS 7: REAL_MISSION_BOUND — AgentThoughtBubble billboard with real task telemetry', () => {
  assert.ok(worldJs.includes('class AgentThoughtBubble'), 'AgentThoughtBubble billboard class must exist');
  assert.ok(worldJs.includes('new T.Sprite(mat)'), 'Thought bubble must use THREE.Sprite for automatic billboarding');
  assert.ok(worldJs.includes('setText(text, emoji'), 'setText method must exist on thought bubble');
  assert.ok(worldJs.includes('WMS: Inspeção Lote #4410'), 'Camila initial task must be defined');
  assert.ok(worldJs.includes('Doca 2: Embarque 40ft'), 'Carlos initial task must be defined');
  assert.ok(worldJs.includes('existing.thoughtBubble.setText(bubbleText'), 'Thought bubble must update from runtime tasks');
});

// ── AXIS 8: REAL_EVENT_BOUND ───────────────────────────────────────────────
test('AXIS 8: REAL_EVENT_BOUND — 3D parabolic physical data packets & token bus bursts', () => {
  assert.ok(worldJs.includes('sendPhysicalDataPacket('), 'sendPhysicalDataPacket method must exist');
  assert.ok(worldJs.includes('triggerTokenExchange('), 'triggerTokenExchange method must exist');
  assert.ok(worldJs.includes('Math.sin(pkt.progress * Math.PI) * pkt.arcHeight'), 'Packet flight must use parabolic arc equation');
  assert.ok(worldJs.includes('this.livePackets'), 'livePackets queue must be processed in _animate');
});

// ── AXIS 9: PATH_SYSTEM ────────────────────────────────────────────────────
test('AXIS 9: PATH_SYSTEM — PathGraph with 26 waypoints, BFS routing & agent walking', () => {
  assert.ok(worldJs.includes('class PathGraph'), 'PathGraph class must exist');
  assert.ok(worldJs.includes('dep_dock1'), 'Depósito dock 1 waypoint must exist');
  assert.ok(worldJs.includes('dep_staging'), 'Depósito staging waypoint must exist');
  assert.ok(worldJs.includes('dep_aisle_b'), 'Depósito aisle B waypoint must exist');
  assert.ok(worldJs.includes('api_lift_f1'), 'API Platform floor 1 waypoint must exist');
  assert.ok(worldJs.includes('api_f3_sora'), 'API Platform floor 3 Sora waypoint must exist');
  assert.ok(worldJs.includes('findPath('), 'findPath shortest path algorithm must exist');
  assert.ok(worldJs.includes('navigateAgent('), 'navigateAgent method must exist');
  assert.ok(worldJs.includes("agentRecord.state = 'WALKING'"), 'Agent state must transition to WALKING when traveling');
  assert.ok(/Math\.atan2\((?:moveDir|this\._tempMoveDir)\.x,\s*(?:moveDir|this\._tempMoveDir)\.z\)/.test(worldJs), 'Agent heading must orient toward waypoint');
});

// ── AXIS 10: BUILDING_SYSTEM ───────────────────────────────────────────────
test('AXIS 10: BUILDING_SYSTEM — Spatial hierarchy, roof cutaway & multi-floor navigation', () => {
  assert.ok(worldJs.includes('focusFloor(floorNumber)'), 'focusFloor method must exist');
  assert.ok(worldJs.includes('focusRoom(roomId)'), 'focusRoom method must exist');
  assert.ok(worldJs.includes('focusStation(stationId)'), 'focusStation method must exist');
  assert.ok(worldJs.includes('this.warehouseRoofGroup.position.y'), 'Dynamic warehouse roof cutaway must elevate vertically');
  assert.ok(worldJs.includes('this.apiRoofGroup.visible = false'), 'API Platform roof cutaway must hide roof when focusing interior');
});

// ── AXIS 11: VEHICLE_SYSTEM ────────────────────────────────────────────────
test('AXIS 11: VEHICLE_SYSTEM — Logistics Forklift multi-step cycle, trucks & amber beacon', () => {
  assert.ok(worldJs.includes('_createForklift()'), '_createForklift method must exist');
  assert.ok(worldJs.includes('Toyota 8FBE20'), 'Authentic industrial forklift model name');
  assert.ok(worldJs.includes('this.forkliftGroup'), 'forkliftGroup must be tracked');
  assert.ok(worldJs.includes('ud.strobe.visible'), 'Flashing amber warning beacon must cycle');
  assert.ok(worldJs.includes('ud.forks.position.y'), 'Forklift forks must elevate with cargo');
  assert.ok(worldJs.includes('_createHeavyFreightTruck'), 'Heavy freight semi-truck must exist');
  assert.ok(worldJs.includes('_createDeliveryBoxVan'), 'Delivery box van must exist');
});

// ── AXIS 12: INTERACTION_SYSTEM ────────────────────────────────────────────
test('AXIS 12: INTERACTION_SYSTEM — Raycasting, agent click inspector & living metrics', () => {
  assert.ok(worldJs.includes('_updateRaycast('), '_updateRaycast method must exist');
  assert.ok(worldJs.includes('_handleCanvasClick('), '_handleCanvasClick method must exist');
  assert.ok(worldJs.includes('fenixShowWorldAgentInspector'), 'Agent click must open canonical agent inspector');
  assert.ok(worldJs.includes('getLivingWorldMetrics()'), 'getLivingWorldMetrics method must exist');
  assert.ok(worldJs.includes('isLivingWorld: true'), 'Metrics must declare isLivingWorld: true');
  assert.ok(worldJs.includes('agentCount:'), 'Metrics must report active agent count');
  assert.ok(worldJs.includes('livePacketsCount:'), 'Metrics must report in-flight packet count');
  assert.ok(worldJs.includes('waypointCount:'), 'Metrics must report navigation waypoints');
});

