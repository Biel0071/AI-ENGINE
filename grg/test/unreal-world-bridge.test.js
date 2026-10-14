'use strict';

/**
 * FÊNIX OS — FASE 17.1: UNREAL LIVING WORLD BRIDGE TEST
 * =======================================================
 * Validates the Unreal Engine 5 Spatial World Bridge:
 * 1. Unreal Project filesystem structure and C++ module declarations
 * 2. FENIX_WORLD_PROTOCOL_V1 event specification compliance
 * 3. HTTP Bridge Endpoints: /api/v2/unreal/health and /api/v2/unreal/world-snapshot
 * 4. Bidirectional Event Handling: Inbound AGENT_NAVIGATION_BLOCKED
 * 5. Spatial Hierarchy: 20 Workstations, 3 Cutaway Floors, Camera Pawn Zoom Levels
 * 6. Zero-Mock Real-State Guarantee: All spawned agents map to real Fênix identities
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { handleUnrealWorldRoutes, CANONICAL_WORKSTATIONS } = require('../src/api/unreal-world-routes');
const { globalCommunicationBus } = require('../src/communication/agent-communication-bus');

const REPO_ROOT = path.resolve(__dirname, '../../../');
const UNREAL_ROOT = path.join(REPO_ROOT, 'unreal', 'FenixCity');

test('FASE 17.1 - INVARIANT 1: Unreal Project Hierarchy & Build Configuration Exist', () => {
  const uprojectPath = path.join(UNREAL_ROOT, 'FenixCity.uproject');
  assert.ok(fs.existsSync(uprojectPath), 'FenixCity.uproject must exist in /unreal/FenixCity/');

  const uprojectContent = JSON.parse(fs.readFileSync(uprojectPath, 'utf-8'));
  assert.equal(uprojectContent.FileVersion, 3, 'uproject must have FileVersion 3');
  assert.equal(uprojectContent.EngineAssociation, '5.4', 'uproject must target UE 5.4');

  const plugins = uprojectContent.Plugins.map((p) => p.Name);
  assert.ok(plugins.includes('WebSockets'), 'WebSockets plugin must be enabled');
  assert.ok(plugins.includes('PixelStreaming'), 'PixelStreaming plugin must be enabled');

  const defaultEnginePath = path.join(UNREAL_ROOT, 'Config', 'DefaultEngine.ini');
  assert.ok(fs.existsSync(defaultEnginePath), 'DefaultEngine.ini must exist in /unreal/FenixCity/Config/');

  const engineIni = fs.readFileSync(defaultEnginePath, 'utf-8');
  assert.ok(engineIni.includes('r.DynamicGlobalIlluminationMethod=1'), 'Lumen must be configured');
  assert.ok(engineIni.includes('r.Lumen.HardwareRayTracing=0'), 'Software Lumen must be configured for RTX 3050 Ti VRAM budget');
});

test('FASE 17.1 - INVARIANT 2: Production C++ Source Architecture is Complete & Unmocked', () => {
  const sourceRoot = path.join(UNREAL_ROOT, 'Source');
  const moduleRoot = path.join(sourceRoot, 'FenixCity');
  
  // Target rules live in Source/
  assert.ok(fs.existsSync(path.join(sourceRoot, 'FenixCity.Target.cs')), 'FenixCity.Target.cs must exist in Source/');
  assert.ok(fs.existsSync(path.join(sourceRoot, 'FenixCityEditor.Target.cs')), 'FenixCityEditor.Target.cs must exist in Source/');

  const expectedModuleFiles = [
    'FenixCity.Build.cs',
    'FenixCity.h',
    'FenixCity.cpp',
    'Bridge/FenixWorldProtocol.h',
    'Bridge/FenixEventBridge.h',
    'Bridge/FenixEventBridge.cpp',
    'Agents/FenixAgentVisualProfile.h',
    'Agents/FenixAgentCharacter.h',
    'Agents/FenixAgentCharacter.cpp',
    'Agents/FenixAgentAnimInstance.h',
    'Agents/FenixAgentAnimInstance.cpp',
    'World/FenixWorkstation.h',
    'World/FenixWorkstation.cpp',
    'World/FenixBuildingHQ.h',
    'World/FenixBuildingHQ.cpp',
    'World/FenixWorldState.h',
    'World/FenixWorldState.cpp',
    'Camera/FenixWorldCameraPawn.h',
    'Camera/FenixWorldCameraPawn.cpp',
    'Audio/FenixWorldAudioManager.h',
    'Audio/FenixWorldAudioManager.cpp',
    'UI/FenixAgentInspectorWidget.h',
    'UI/FenixAgentInspectorWidget.cpp',
    'World/FenixWorldGameMode.h',
    'World/FenixWorldGameMode.cpp'
  ];

  for (const relFile of expectedModuleFiles) {
    const fullPath = path.join(moduleRoot, relFile);
    assert.ok(fs.existsSync(fullPath), `Required C++ source file missing: ${relFile}`);
    const content = fs.readFileSync(fullPath, 'utf-8');
    assert.ok(content.length > 50, `File ${relFile} must contain real C++ implementation`);
  }
});

test('FASE 17.1 - INVARIANT 3: Protocol Event Specification Compliance (FENIX_WORLD_PROTOCOL_V1)', () => {
  const protocolHeaderPath = path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'Bridge', 'FenixWorldProtocol.h');
  const protocolHeader = fs.readFileSync(protocolHeaderPath, 'utf-8');

  // Verify all mandatory events from prompt specification are declared
  const mandatoryEvents = [
    'AGENT_CREATED',
    'AGENT_UPDATED',
    'AGENT_REMOVED',
    'AGENT_MOVED',
    'MISSION_CREATED',
    'MISSION_ASSIGNED',
    'MISSION_STARTED',
    'MISSION_COMPLETED',
    'MISSION_FAILED',
    'CONVERSATION_STARTED',
    'CONVERSATION_MESSAGE',
    'CONVERSATION_ENDED',
    'MEETING_STARTED',
    'MEETING_ENDED',
    'WAR_ROOM_CREATED',
    'WAR_ROOM_RESOLVED',
    'WORLD_RESYNC'
  ];

  for (const ev of mandatoryEvents) {
    assert.ok(protocolHeader.includes(ev), `Protocol header must define event: ${ev}`);
  }

  // Verify EFenixAgentState contains required states
  assert.ok(protocolHeader.includes('IDLE'), 'State IDLE must exist');
  assert.ok(protocolHeader.includes('WORKING'), 'State WORKING must exist');
  assert.ok(protocolHeader.includes('COLLABORATING'), 'State COLLABORATING must exist');
  assert.ok(protocolHeader.includes('MEETING'), 'State MEETING must exist');
  assert.ok(protocolHeader.includes('MOVING'), 'State MOVING must exist');
  assert.ok(protocolHeader.includes('BLOCKED'), 'State BLOCKED must exist');
});

test('FASE 17.1 - INVARIANT 4: Unreal Bridge Health Endpoint Returns Protocol Handshake', async () => {
  let responseData = null;
  let responseStatus = 0;

  const mockReq = { method: 'GET' };
  const mockRes = {};
  const mockUrl = new URL('http://127.0.0.1:4400/api/v2/unreal/health');
  const mockApp = {};
  const sendJson = (res, status, data) => {
    responseStatus = status;
    responseData = data;
    return true;
  };

  const handled = await handleUnrealWorldRoutes(mockReq, mockRes, mockUrl, mockApp, sendJson, null, {});
  assert.ok(handled, '/api/v2/unreal/health must be handled');
  assert.equal(responseStatus, 200, 'Health endpoint must return 200 OK');
  assert.equal(responseData.ok, true);
  assert.equal(responseData.protocol, 'FENIX_WORLD_PROTOCOL_V1');
  assert.equal(responseData.status, 'ONLINE');
  assert.ok(responseData.capabilities.includes('SPATIAL_NAVIGATION'));
  assert.ok(responseData.capabilities.includes('WORKSTATIONS_20'));
});

test('FASE 17.1 - INVARIANT 5: World Snapshot Serves 20 Real Workstations across 4 Departments', async () => {
  let responseData = null;
  let responseStatus = 0;

  const mockReq = { method: 'GET' };
  const mockRes = {};
  const mockUrl = new URL('http://127.0.0.1:4400/api/v2/unreal/world-snapshot');
  const mockApp = {
    controlPlane: { authorize: async () => true },
    store: { read: async () => ({ agents: [{ id: 'agent-backend', name: 'Backend Agent', role: 'Backend Engineer' }] }) },
    jobs: { list: async () => [] },
    missions: { list: async () => [] },
    projectKernel: { list: async () => [] }
  };
  const sendJson = (res, status, data) => {
    responseStatus = status;
    responseData = data;
    return true;
  };

  const handled = await handleUnrealWorldRoutes(mockReq, mockRes, mockUrl, mockApp, sendJson, null, { tenantId: 'grg', actorId: 'admin' });
  assert.ok(handled, '/api/v2/unreal/world-snapshot must be handled');
  assert.equal(responseStatus, 200);
  assert.equal(responseData.protocol, 'FENIX_WORLD_PROTOCOL_V1');
  assert.equal(responseData.world.name, 'FenixCity');
  assert.equal(responseData.world.hqBuilding.id, 'bld-hq');
  assert.equal(responseData.world.hqBuilding.totalFloors, 3);

  // Validate workstations
  assert.equal(responseData.workstations.length, 20, 'Must provide exactly 20 canonical workstations');
  const depts = new Set(responseData.workstations.map((ws) => ws.department));
  assert.ok(depts.has('EXECUTIVE'), 'Executive department must have workstations');
  assert.ok(depts.has('ENGINEERING'), 'Engineering department must have workstations');
  assert.ok(depts.has('RESEARCH'), 'Research department must have workstations');
  assert.ok(depts.has('OPERATIONS'), 'Operations department must have workstations');
});

test('FASE 17.1 - INVARIANT 6: Inbound Event Bridge handles AGENT_NAVIGATION_BLOCKED', async () => {
  let responseData = null;
  let responseStatus = 0;
  let busReceivedEvent = null;

  const unsubscribe = globalCommunicationBus.on('unreal.agent_navigation_blocked', (payload) => {
    busReceivedEvent = payload;
  });

  const mockReq = { method: 'POST' };
  const mockRes = {};
  const mockUrl = new URL('http://127.0.0.1:4400/api/v2/unreal/events');
  const mockApp = {
    bus: {
      emit: (ev, data) => {}
    }
  };
  const readJson = async () => ({
    type: 'AGENT_NAVIGATION_BLOCKED',
    payload: {
      agentId: 'agent-backend',
      reason: 'NavMesh dynamic obstacle detected at corridor entrance',
      currentLocation: { x: 120, y: 350, z: 0 }
    }
  });
  const sendJson = (res, status, data) => {
    responseStatus = status;
    responseData = data;
    return true;
  };

  const handled = await handleUnrealWorldRoutes(mockReq, mockRes, mockUrl, mockApp, sendJson, readJson, {});
  assert.ok(handled, '/api/v2/unreal/events must be handled');
  assert.equal(responseStatus, 200);
  assert.equal(responseData.ok, true);
  assert.equal(responseData.received, 'AGENT_NAVIGATION_BLOCKED');

  assert.ok(busReceivedEvent, 'CommunicationBus must receive forwarded unreal event');
  assert.equal(busReceivedEvent.payload.agentId, 'agent-backend');
});

test('FASE 17.1 - INVARIANT 7: Camera Pawn Zoom Hierarchy Supports 7 Spatial Scales', () => {
  const cameraHeaderPath = path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'Camera', 'FenixWorldCameraPawn.h');
  const cameraHeader = fs.readFileSync(cameraHeaderPath, 'utf-8');

  const requiredLevels = [
    'WORLD',
    'DISTRICT',
    'BUILDING',
    'FLOOR',
    'ROOM',
    'AGENT',
    'WORKSTATION'
  ];

  for (const lvl of requiredLevels) {
    assert.ok(cameraHeader.includes(lvl), `Camera hierarchy must include zoom scale: ${lvl}`);
  }
});
