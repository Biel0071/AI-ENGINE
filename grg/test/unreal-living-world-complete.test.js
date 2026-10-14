'use strict';

/**
 * FÊNIX OS — UNREAL LIVING WORLD COMPLETE VERIFICATION SUITE (Fases 17.3 a 17.15)
 * ==============================================================================
 * Validates the full-stack real capabilities of the Unreal Engine 5 Spatial Living World:
 * 1. Phase 17.3: Playable World Engine, Mission Lifecycle, Hardware Telemetry, Pixel Streaming
 * 2. Phase 17.4: Modular 9 Professions Character Customization
 * 3. Phase 17.5: Living City Generation across 7 Spatial Districts
 * 4. Phase 17.6: Autonomous Embodied Agent OODA Cognitive Loop
 * 5. Phase 17.7: Social Graph, Inter-Agent Interactions & Meetings
 * 6. Phase 17.8: Living Office Functional Rooms & Interactive Physical Props
 * 7. Phase 17.9: Personal Embodied Operator Companion
 * 8. Phase 17.10: World Story Engine & Spatial Cinematic Triggers
 * 9. Phase 17.11: Population Simulation Scalability (20 -> 50 -> 100 Agents)
 * 10. Phase 17.12 to 17.15: Canonical Frontend Integration & Zero-Mock Compliance
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '../../../');
const UNREAL_ROOT = path.join(REPO_ROOT, 'unreal', 'FenixCity');
const PUBLIC_ROOT = path.join(REPO_ROOT, 'ai-engine', 'grg', 'public');

const { handleUnrealWorldRoutes, CANONICAL_WORKSTATIONS, CANONICAL_DISTRICTS, PROFESSION_PROFILES } = require('../src/api/unreal-world-routes');

// Helper to simulate request
function createMockHttp(method, pathname, body = null) {
  let resStatus = null;
  let resHeaders = {};
  let resBody = null;

  const req = {
    method,
    headers: { authorization: 'Bearer test-token' }
  };

  const res = {
    setHeader: (k, v) => { resHeaders[k] = v; },
    end: () => {}
  };

  const url = new URL(`http://127.0.0.1:4400${pathname}`);

  const sendJson = (r, status, payload) => {
    resStatus = status;
    resBody = payload;
    return true;
  };

  const readJson = async () => body;

  const app = {
    bus: {
      emit: () => {}
    }
  };

  return { req, res, url, app, sendJson, readJson, getResult: () => ({ status: resStatus, body: resBody }) };
}

test('FASE 17.3 - First Playable World: Mission Lifecycle & Hardware Telemetry', async () => {
  // 1. Dispatch mission
  const mockDispatch = createMockHttp('POST', '/api/v2/unreal/dispatch-mission', {
    agentId: 'agent-backend',
    title: 'Compilar kernel e executar testes de regressao',
    prompt: 'Executar pipeline C++'
  });
  const handledDispatch = await handleUnrealWorldRoutes(
    mockDispatch.req, mockDispatch.res, mockDispatch.url, mockDispatch.app, mockDispatch.sendJson, mockDispatch.readJson
  );
  assert.equal(handledDispatch, true);
  const dispatchRes = mockDispatch.getResult();
  assert.equal(dispatchRes.status, 200);
  assert.equal(dispatchRes.body.ok, true);
  assert.equal(dispatchRes.body.mission.state, 'WORKING');

  // 2. Query World Snapshot to verify agent is WORKING at workstation
  const mockSnap = createMockHttp('GET', '/api/v2/unreal/world-snapshot');
  await handleUnrealWorldRoutes(mockSnap.req, mockSnap.res, mockSnap.url, mockSnap.app, mockSnap.sendJson, mockSnap.readJson);
  const snapRes = mockSnap.getResult();
  const backendAgent = snapRes.body.agents.find(a => a.agentId === 'agent-backend');
  assert.ok(backendAgent);
  assert.equal(backendAgent.state, 'WORKING');

  // 3. Complete mission
  const mockComplete = createMockHttp('POST', '/api/v2/unreal/complete-mission', { agentId: 'agent-backend' });
  await handleUnrealWorldRoutes(mockComplete.req, mockComplete.res, mockComplete.url, mockComplete.app, mockComplete.sendJson, mockComplete.readJson);
  const compRes = mockComplete.getResult();
  assert.equal(compRes.status, 200);

  // 4. Hardware Telemetry
  const mockTelem = createMockHttp('GET', '/api/v2/unreal/telemetry');
  await handleUnrealWorldRoutes(mockTelem.req, mockTelem.res, mockTelem.url, mockTelem.app, mockTelem.sendJson, mockTelem.readJson);
  const telemRes = mockTelem.getResult();
  assert.equal(telemRes.status, 200);
  assert.equal(telemRes.body.hardware.gpu, 'NVIDIA GeForce RTX 3050 Ti Laptop GPU');
  assert.equal(telemRes.body.hardware.targetFps, 60);
  assert.equal(telemRes.body.hardware.vramTotalMb, 4096);

  // 5. Stream config
  const mockStream = createMockHttp('GET', '/api/v2/unreal/stream-config');
  await handleUnrealWorldRoutes(mockStream.req, mockStream.res, mockStream.url, mockStream.app, mockStream.sendJson, mockStream.readJson);
  const streamRes = mockStream.getResult();
  assert.equal(streamRes.status, 200);
  assert.equal(streamRes.body.signalingUrl, 'ws://127.0.0.1:8888');
});

test('FASE 17.4 - Character Customization: Modular 9 Professions', async () => {
  const compH = path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'Agents', 'FenixCharacterCustomizationComponent.h');
  const compCpp = path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'Agents', 'FenixCharacterCustomizationComponent.cpp');
  assert.ok(fs.existsSync(compH), 'FenixCharacterCustomizationComponent.h must exist');
  assert.ok(fs.existsSync(compCpp), 'FenixCharacterCustomizationComponent.cpp must exist');

  const mockProf = createMockHttp('GET', '/api/v2/unreal/agent-profiles');
  await handleUnrealWorldRoutes(mockProf.req, mockProf.res, mockProf.url, mockProf.app, mockProf.sendJson, mockProf.readJson);
  const profRes = mockProf.getResult();
  assert.equal(profRes.status, 200);
  assert.equal(profRes.body.totalProfessions, 9);

  const professions = profRes.body.professions.map(p => p.profession);
  assert.deepEqual(professions, ['CEO', 'BACKEND', 'FRONTEND', 'SECURITY', 'QA', 'DATABASE', 'DOCS', 'DESIGN', 'RESEARCH']);
});

test('FASE 17.5 - Living City Generation: 7 Canonical Districts', async () => {
  const distH = path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'World', 'FenixDistrictManager.h');
  const distCpp = path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'World', 'FenixDistrictManager.cpp');
  assert.ok(fs.existsSync(distH), 'FenixDistrictManager.h must exist');
  assert.ok(fs.existsSync(distCpp), 'FenixDistrictManager.cpp must exist');

  const mockDist = createMockHttp('GET', '/api/v2/unreal/districts');
  await handleUnrealWorldRoutes(mockDist.req, mockDist.res, mockDist.url, mockDist.app, mockDist.sendJson, mockDist.readJson);
  const distRes = mockDist.getResult();
  assert.equal(distRes.status, 200);
  assert.equal(distRes.body.totalDistricts, 7);

  const districtIds = distRes.body.districts.map(d => d.id);
  assert.ok(districtIds.includes('dist-hq'));
  assert.ok(districtIds.includes('dist-eng'));
  assert.ok(districtIds.includes('dist-res'));
  assert.ok(districtIds.includes('dist-des'));
  assert.ok(districtIds.includes('dist-data'));
  assert.ok(districtIds.includes('dist-sec'));
  assert.ok(districtIds.includes('dist-ops'));
});

test('FASE 17.6 - Autonomous Embodied Agent: 8-Stage OODA Cognitive Loop', async () => {
  const cogH = path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'Agents', 'FenixAgentCognitiveComponent.h');
  const cogCpp = path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'Agents', 'FenixAgentCognitiveComponent.cpp');
  assert.ok(fs.existsSync(cogH), 'FenixAgentCognitiveComponent.h must exist');
  assert.ok(fs.existsSync(cogCpp), 'FenixAgentCognitiveComponent.cpp must exist');

  const mockOoda = createMockHttp('POST', '/api/v2/unreal/agent-cognitive-tick', {
    agentId: 'agent-backend',
    environmentalStimulus: 'CI_BUILD_VERIFICATION'
  });
  await handleUnrealWorldRoutes(mockOoda.req, mockOoda.res, mockOoda.url, mockOoda.app, mockOoda.sendJson, mockOoda.readJson);
  const oodaRes = mockOoda.getResult();
  assert.equal(oodaRes.status, 200);
  assert.equal(oodaRes.body.oodaCycle.stages.length, 8);
  const stages = oodaRes.body.oodaCycle.stages.map(s => s.stage);
  assert.deepEqual(stages, [
    'PERCEPTION', 'CONTEXT', 'PRIORITY', 'OBJECTIVE',
    'PLAN', 'ACTION', 'OBSERVATION', 'MEMORY'
  ]);
});

test('FASE 17.7 - Social Life & Social Graph Integration', async () => {
  const socH = path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'Agents', 'FenixSocialInteractionComponent.h');
  const socCpp = path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'Agents', 'FenixSocialInteractionComponent.cpp');
  assert.ok(fs.existsSync(socH), 'FenixSocialInteractionComponent.h must exist');
  assert.ok(fs.existsSync(socCpp), 'FenixSocialInteractionComponent.cpp must exist');

  const mockSoc = createMockHttp('GET', '/api/v2/unreal/social-graph');
  await handleUnrealWorldRoutes(mockSoc.req, mockSoc.res, mockSoc.url, mockSoc.app, mockSoc.sendJson, mockSoc.readJson);
  const socRes = mockSoc.getResult();
  assert.equal(socRes.status, 200);
  assert.ok(socRes.body.nodes.length >= 20);
  assert.ok(socRes.body.edges.length >= 5);

  const mockInteract = createMockHttp('POST', '/api/v2/unreal/social-interaction', {
    initiatorId: 'agent-backend',
    targetId: 'agent-qa',
    interactionType: 'REQUEST_HELP'
  });
  await handleUnrealWorldRoutes(mockInteract.req, mockInteract.res, mockInteract.url, mockInteract.app, mockInteract.sendJson, mockInteract.readJson);
  const intRes = mockInteract.getResult();
  assert.equal(intRes.status, 200);
  assert.equal(intRes.body.interaction.initiatorId, 'agent-backend');
});

test('FASE 17.8 - Living Offices: Interactive Props & Meeting Rooms', async () => {
  const propH = path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'World', 'FenixInteractiveProp.h');
  const propCpp = path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'World', 'FenixInteractiveProp.cpp');
  const roomH = path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'World', 'FenixMeetingRoom.h');
  const roomCpp = path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'World', 'FenixMeetingRoom.cpp');
  assert.ok(fs.existsSync(propH), 'FenixInteractiveProp.h must exist');
  assert.ok(fs.existsSync(propCpp), 'FenixInteractiveProp.cpp must exist');
  assert.ok(fs.existsSync(roomH), 'FenixMeetingRoom.h must exist');
  assert.ok(fs.existsSync(roomCpp), 'FenixMeetingRoom.cpp must exist');

  const mockProps = createMockHttp('GET', '/api/v2/unreal/office-props');
  await handleUnrealWorldRoutes(mockProps.req, mockProps.res, mockProps.url, mockProps.app, mockProps.sendJson, mockProps.readJson);
  const propsRes = mockProps.getResult();
  assert.equal(propsRes.status, 200);
  assert.ok(propsRes.body.props.length >= 5);
});

test('FASE 17.9 - Personal Embodied Agent: Operator Companion', async () => {
  const compH = path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'Agents', 'FenixOperatorCompanion.h');
  const compCpp = path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'Agents', 'FenixOperatorCompanion.cpp');
  assert.ok(fs.existsSync(compH), 'FenixOperatorCompanion.h must exist');
  assert.ok(fs.existsSync(compCpp), 'FenixOperatorCompanion.cpp must exist');

  const mockComp = createMockHttp('GET', '/api/v2/unreal/companion');
  await handleUnrealWorldRoutes(mockComp.req, mockComp.res, mockComp.url, mockComp.app, mockComp.sendJson, mockComp.readJson);
  const compRes = mockComp.getResult();
  assert.equal(compRes.status, 200);
  assert.equal(compRes.body.companion.id, 'agent-companion');
  assert.ok(compRes.body.companion.filteredAlerts.length >= 1);
});

test('FASE 17.10 - World Story Engine: Spatial Narrative & Cinematics', async () => {
  const storyH = path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'World', 'FenixWorldStoryEngine.h');
  const storyCpp = path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'World', 'FenixWorldStoryEngine.cpp');
  assert.ok(fs.existsSync(storyH), 'FenixWorldStoryEngine.h must exist');
  assert.ok(fs.existsSync(storyCpp), 'FenixWorldStoryEngine.cpp must exist');

  const mockStory = createMockHttp('POST', '/api/v2/unreal/trigger-cinematic', {
    alertType: 'SECURITY_ALERT',
    message: 'Perimeter scan initiated'
  });
  await handleUnrealWorldRoutes(mockStory.req, mockStory.res, mockStory.url, mockStory.app, mockStory.sendJson, mockStory.readJson);
  const storyRes = mockStory.getResult();
  assert.equal(storyRes.status, 200);
  assert.equal(storyRes.body.cinematic.alertType, 'SECURITY_ALERT');
});

test('FASE 17.11 - Population Simulation Benchmark (20, 50, 100 Agents)', async () => {
  const crowdH = path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'World', 'FenixCrowdManager.h');
  const crowdCpp = path.join(UNREAL_ROOT, 'Source', 'FenixCity', 'World', 'FenixCrowdManager.cpp');
  assert.ok(fs.existsSync(crowdH), 'FenixCrowdManager.h must exist');
  assert.ok(fs.existsSync(crowdCpp), 'FenixCrowdManager.cpp must exist');

  const mockPop = createMockHttp('GET', '/api/v2/unreal/population-benchmark');
  await handleUnrealWorldRoutes(mockPop.req, mockPop.res, mockPop.url, mockPop.app, mockPop.sendJson, mockPop.readJson);
  const popRes = mockPop.getResult();
  assert.equal(popRes.status, 200);
  assert.equal(popRes.body.benchmarks.length, 3);
  assert.equal(popRes.body.benchmarks[0].agentCount, 20);
  assert.equal(popRes.body.benchmarks[1].agentCount, 50);
  assert.equal(popRes.body.benchmarks[2].agentCount, 100);
});

test('FASE 17.12 a 17.15 - Canonical Frontend Integration & Zero-Mock Compliance', () => {
  const indexHtml = fs.readFileSync(path.join(PUBLIC_ROOT, 'index.html'), 'utf-8');
  const unrealLive = fs.readFileSync(path.join(PUBLIC_ROOT, 'unreal-world-live.js'), 'utf-8');
  const unrealCss = fs.readFileSync(path.join(PUBLIC_ROOT, 'unreal-world.css'), 'utf-8');

  // Verify elements exist in HTML
  assert.ok(indexHtml.includes('id="fenixUnrealDeck"'), 'fenixUnrealDeck must exist in index.html');
  assert.ok(indexHtml.includes('id="btnCityModeUnreal"'), 'btnCityModeUnreal must exist in fenixCityModeTabs');
  assert.ok(indexHtml.includes('id="unrealWorldCanvas"'), 'unrealWorldCanvas must exist');
  assert.ok(indexHtml.includes('/unreal-world-live.js'), 'unreal-world-live.js must be loaded');
  assert.ok(indexHtml.includes('/unreal-world.css'), 'unreal-world.css must be loaded');

  // Verify Zero-Mock compliance in static HTML: initial slots show '—'
  assert.ok(indexHtml.includes('id="unrealHudFps">—</span>'), 'FPS slot must start with honest absence marker');
  assert.ok(indexHtml.includes('id="unrealHudVram">—</span>'), 'VRAM slot must start with honest absence marker');
  assert.ok(indexHtml.includes('id="unrealHudAgents">—</span>'), 'Agents slot must start with honest absence marker');

  // Verify controller has required methods
  assert.ok(unrealLive.includes('dispatchMission'), 'dispatchMission must exist');
  assert.ok(unrealLive.includes('completeMission'), 'completeMission must exist');
  assert.ok(unrealLive.includes('runCognitiveTick'), 'runCognitiveTick must exist');
  assert.ok(unrealLive.includes('triggerSocialInteraction'), 'triggerSocialInteraction must exist');
  assert.ok(unrealLive.includes('triggerCinematic'), 'triggerCinematic must exist');
  assert.ok(unrealLive.includes('panToDistrict'), 'panToDistrict must exist');
});
