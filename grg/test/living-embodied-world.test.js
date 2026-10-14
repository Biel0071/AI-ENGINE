'use strict';

/**
 * FÊNIX OS — FASE 15: LIVING 2.5D WORLD & EMBODIED AGENT CITY TEST
 * Verifies the canonical World3D city and its retained 2.5D compatibility assets,
 * characters exist within space with pixel sprites and workstations,
 * and office interactions (conversations, meetings, war room) drive real embodied agent behaviors.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_PUBLIC = path.resolve(__dirname, '../public');
const HTML_PATH = path.join(ROOT_PUBLIC, 'index.html');
const ISO_CITY_PATH = path.join(ROOT_PUBLIC, 'iso-city.js');
const PIXEL_ENGINE_PATH = path.join(ROOT_PUBLIC, 'fenix-pixel-engine.js');
const OFFICE_LIVE_PATH = path.join(ROOT_PUBLIC, 'office-live.js');

test('FASE 15 - INVARIANT 1: Canonical Shell selects World3D and retains city compatibility assets', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf-8');

  // Verify scripts are included
  assert.ok(html.includes('/fenix-pixel-engine.js'), 'fenix-pixel-engine.js must be loaded in index.html');
  assert.ok(html.includes('/iso-city.js'), 'iso-city.js must be loaded in index.html');

  // World3D is the visible runtime; legacy 2D assets remain loaded for shared shell hooks.
  assert.ok(html.includes('window.FENIX_WORLD_3D = true;'), 'window.FENIX_WORLD_3D must select the visible renderer');
});

test('FASE 15 - INVARIANT 2: 2.5D Canvas is Hero and Host to Overlays without being Hidden', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf-8');

  // Verify city canvas and floating overlays
  assert.ok(html.includes('id="cityCanvas"'), 'cityCanvas must exist');
  assert.ok(html.includes('id="fenixCityWorldArea"'), 'fenixCityWorldArea must exist');
  assert.ok(html.includes('id="fenixOfficeFloatingHUD"'), 'fenixOfficeFloatingHUD must exist');
  assert.ok(html.includes('id="fenixWorldAgentInspector"'), 'fenixWorldAgentInspector must exist');
  assert.ok(html.includes('id="fenixWorldFeedDrawer"'), 'fenixWorldFeedDrawer must exist');
});

test('FASE 15 - INVARIANT 3: Mode Switcher keeps Canvas Visible across World, Office, and Feed modes', () => {
  const officeLive = fs.readFileSync(OFFICE_LIVE_PATH, 'utf-8');

  // Verify worldArea is set to display block, never hidden
  assert.ok(
    officeLive.includes("worldArea.style.setProperty('display', 'block', 'important');"),
    'worldArea must always remain display: block across modes'
  );

  // Verify office mode pans/zooms into command-center / dev-loft
  assert.ok(officeLive.includes("window.fenixCity.panToDistrict('command-center')"), 'office mode must pan camera into command-center');

  // Verify feed drawer integration
  assert.ok(officeLive.includes('renderFeedDrawer'), 'renderFeedDrawer must exist');
  assert.ok(officeLive.includes('fenixCloseFeedDrawer'), 'fenixCloseFeedDrawer must exist');
});

test('FASE 15 - INVARIANT 4: iso-city connects to /api/v2/office/state and Embodies Spatial Presence', () => {
  const isoCity = fs.readFileSync(ISO_CITY_PATH, 'utf-8');

  // Verify office state API consumption
  assert.ok(isoCity.includes('/api/v2/office/state'), 'iso-city must fetch /api/v2/office/state');

  // Verify spatial conversation handling
  assert.ok(isoCity.includes('activeConversations'), 'iso-city must map activeConversations');

  // Verify spatial meeting handling
  assert.ok(isoCity.includes('activeMeetings'), 'iso-city must map activeMeetings');

  // Verify war room handling
  assert.ok(isoCity.includes('warRoomActive') || isoCity.includes('WAR_ROOM'), 'iso-city must map war room alerts');
});

test('FASE 15 - INVARIANT 5: On-World Inspector opens on Agent Click without Navigating Away', () => {
  const isoCity = fs.readFileSync(ISO_CITY_PATH, 'utf-8');

  // Verify click handler uses fenixShowWorldAgentInspector
  assert.ok(
    isoCity.includes('window.fenixShowWorldAgentInspector(agent)'),
    'Clicking agent must open on-world inspector instead of navigating away'
  );

  const officeLive = fs.readFileSync(OFFICE_LIVE_PATH, 'utf-8');
  assert.ok(
    officeLive.includes('window.fenixShowWorldAgentInspector = function'),
    'fenixShowWorldAgentInspector must be implemented'
  );
  assert.ok(
    officeLive.includes('window.fenixToggleFollowAgent'),
    'fenixToggleFollowAgent must be implemented'
  );
});

test('FASE 15 - INVARIANT 6: Zero-Mock Integrity — No Math.random in iso-city simulation', () => {
  const isoCity = fs.readFileSync(ISO_CITY_PATH, 'utf-8');
  
  // Verify strict determinism: no Math.random() calls allowed in iso-city
  const matches = isoCity.match(/Math\.random\s*\(/g);
  assert.equal(matches, null, 'iso-city must NOT contain any Math.random() calls');
});

test('FASE 15 - INVARIANT 7: On-World Building Inspector & Landmark Portal Integration', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf-8');
  const isoCity = fs.readFileSync(ISO_CITY_PATH, 'utf-8');
  const officeLive = fs.readFileSync(OFFICE_LIVE_PATH, 'utf-8');

  // Verify building inspector in HTML
  assert.ok(html.includes('id="fenixWorldBuildingInspector"'), 'fenixWorldBuildingInspector must exist in index.html');

  // Verify portals and stations
  assert.ok(isoCity.includes('CANONICAL_BUILDING_PORTALS'), 'CANONICAL_BUILDING_PORTALS must exist');
  assert.ok(isoCity.includes("'agent.ceo'"), 'CEO agent station must be mapped');

  // Verify clicking landmark opens on-world building inspector
  assert.ok(
    isoCity.includes('window.fenixShowWorldBuildingInspector(distHit)'),
    'Clicking district must open building inspector on canvas'
  );
  assert.ok(
    officeLive.includes('window.fenixShowWorldBuildingInspector = function'),
    'fenixShowWorldBuildingInspector must be implemented'
  );
});

test('FASE 15 - INVARIANT 8: Embodied Missions & Real-Time Job Tags on Nameplates', () => {
  const isoCity = fs.readFileSync(ISO_CITY_PATH, 'utf-8');

  // Verify nameplate renders active job/mission badge above agent head
  assert.ok(
    isoCity.includes('agent.currentJobId') && isoCity.includes('agent.missionId'),
    'iso-city must inspect currentJobId and missionId'
  );
  assert.ok(
    isoCity.includes('JOB #') && isoCity.includes('MIS #'),
    'iso-city must render JOB # or MIS # chip above nameplate'
  );
});

test('FASE 15 - INVARIANT 9: Spontaneous Group Conversation between Idle Neighbors', () => {
  const isoCity = fs.readFileSync(ISO_CITY_PATH, 'utf-8');

  // Verify proximity social conversation logic
  assert.ok(
    isoCity.includes('agent.socialTimer') && (isoCity.includes('peerDist < 1.35') || isoCity.includes('pdist < 1.35')),
    'iso-city must implement social proximity interaction between neighboring agents'
  );
});

test('FASE 15 - INVARIANT 10: Multi-Floor Cutaway Architecture', () => {
  const isoCity = fs.readFileSync(ISO_CITY_PATH, 'utf-8');
  const html = fs.readFileSync(HTML_PATH, 'utf-8');

  assert.ok(isoCity.includes('CANONICAL_BUILDING_FLOORS'), 'Must define CANONICAL_BUILDING_FLOORS');
  assert.ok(isoCity.includes('setActiveFloor('), 'Must implement setActiveFloor method');
  assert.ok(isoCity.includes('getActiveFloor('), 'Must implement getActiveFloor method');
  assert.ok(html.includes('id="cityFloorSelector"'), 'HTML must contain #cityFloorSelector');
  assert.ok(isoCity.includes('updateFloorSelector('), 'Must implement updateFloorSelector');
});

test('FASE 15 - INVARIANT 11: 15-Level Semantic Zoom & Breadcrumb Navigation', () => {
  const isoCity = fs.readFileSync(ISO_CITY_PATH, 'utf-8');
  const html = fs.readFileSync(HTML_PATH, 'utf-8');

  assert.ok(html.includes('id="cityBreadcrumb"'), 'HTML must contain #cityBreadcrumb');
  assert.ok(isoCity.includes('updateBreadcrumbs('), 'Must implement updateBreadcrumbs');
  assert.ok(isoCity.includes('navigateToLevel('), 'Must implement navigateToLevel');
  assert.ok(isoCity.includes('L6 AGENTE HABBO') || isoCity.includes('AGENTE HABBO'), 'Must include close-up Habbo zoom label');
});

test('FASE 15 - INVARIANT 12: Workstation Inspection & Round-Trip IDE Binding', () => {
  const isoCity = fs.readFileSync(ISO_CITY_PATH, 'utf-8');
  const html = fs.readFileSync(HTML_PATH, 'utf-8');

  assert.ok(html.includes('id="fenixStationPreviewModal"'), 'HTML must contain #fenixStationPreviewModal');
  assert.ok(html.includes('openStationInIDE'), 'Station preview must have openStationInIDE action');
  assert.ok(isoCity.includes('openStationPreview('), 'Must implement openStationPreview');
  assert.ok(isoCity.includes('window.openStationInIDE ='), 'Must expose window.openStationInIDE');
  assert.ok(isoCity.includes('fenix_city_return_available'), 'Must set fenix_city_return_available for round-trip return');
});

test('FASE 15 - INVARIANT 13: Procedural Pixel Engine Floor & Cutaway Cache', () => {
  const pixelEnginePath = path.join(__dirname, '../public/fenix-pixel-engine.js');
  const pixelEngine = fs.readFileSync(pixelEnginePath, 'utf-8');

  assert.ok(pixelEngine.includes('Cache.floors'), 'Must cache procedural floor textures');
  assert.ok(pixelEngine.includes('Cache.cutaways'), 'Must cache cutaway walls with skyline windows');
  assert.ok(pixelEngine.includes('Cache.workstations'), 'Must cache workstation props');
});


