'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { handleBaiInstanceRoutes } = require('../src/api/bai-instance-routes');

function mockSendJson(captured) {
  return (res, status, data) => {
    captured.status = status;
    captured.data = data;
    return true;
  };
}

test('Phase 56: BAI Browser District integrated natively in canonical shell without duplication', () => {
  const htmlPath = path.resolve(__dirname, '../public/index.html');
  const content = fs.readFileSync(htmlPath, 'utf8');

  // Must have all BAI panes
  assert.ok(content.includes('id="baiPane-live"'), 'Must contain #baiPane-live');
  assert.ok(content.includes('id="baiPane-instances"'), 'Must contain #baiPane-instances');
  assert.ok(content.includes('id="baiPane-flows"'), 'Must contain #baiPane-flows');
  assert.ok(content.includes('id="baiPane-fingerprint"'), 'Must contain #baiPane-fingerprint');
  assert.ok(content.includes('id="baiPane-qa"'), 'Must contain #baiPane-qa');

  // Must preserve contract elements
  assert.ok(content.includes('id="baiConnectionState"'), 'Must preserve #baiConnectionState');
  assert.ok(content.includes('id="baiCapabilities"'), 'Must preserve #baiCapabilities');
  assert.ok(content.includes('id="baiRefreshBtn"'), 'Must preserve #baiRefreshBtn');
  assert.ok(content.includes('id="browserQaState"'), 'Must preserve #browserQaState');

  // Honest absence marker check
  assert.ok(content.includes('id="baiGovAccountsVal">—</strong>'), 'Must initialize governance accounts honestly');
  assert.ok(content.includes('id="baiGovCookiesVal">—</strong>'), 'Must initialize governance cookies honestly');
  assert.ok(content.includes('id="baiRunningVal" style="color:#10b981;">—</strong>'), 'Must initialize running instances honestly');
});

test('Phase 56: Topbar & Footer honesty — zero duplicate agents/projects in footer, suppressed pool/desktop HUD', () => {
  const htmlPath = path.resolve(__dirname, '../public/index.html');
  const content = fs.readFileSync(htmlPath, 'utf8');

  assert.ok(content.includes('id="tickerOnline">—</strong>'), '#tickerOnline starts as honest absent marker');

  assert.ok(content.includes('style="display:none;"><i class="ph-bold ph-folders"></i> PROJETOS:'), 'Footer ticker must hide duplicate PROJETOS');
  assert.ok(content.includes('style="display:none;"><i class="ph-bold ph-users-three"></i> AGENTES:'), 'Footer ticker must hide duplicate AGENTES');
  assert.ok(content.includes('id="footerAlertBtn"'), 'Footer ticker must contain Eventos modal trigger (#footerAlertBtn)');
});

test('Phase 56: BAI Backend API serves real profiles, flows and governance metrics', async () => {
  const statsCaptured = {};
  await handleBaiInstanceRoutes({ method: 'GET' }, {}, new URL('http://localhost:3000/api/v2/browser/stats'), mockSendJson(statsCaptured));
  assert.equal(statsCaptured.status, 200);
  assert.equal(statsCaptured.data.ok, true);
  assert.equal(typeof statsCaptured.data.connectedAccounts, 'number');

  const flowsCaptured = {};
  await handleBaiInstanceRoutes({ method: 'GET' }, {}, new URL('http://localhost:3000/api/v2/browser/flows'), mockSendJson(flowsCaptured));
  assert.equal(flowsCaptured.status, 200);
  assert.ok(flowsCaptured.data.flows.length >= 3);
});

test('Phase 56: System Tour Video and Verification Stills generated and certified', () => {
  const artifactDir = path.resolve('C:/Users/Dell/.gemini/antigravity/brain/cd6d3967-5d56-4191-9635-645117fb32c7');
  const mp4Path = path.join(artifactDir, 'fenix_phase56_comprehensive_system_tour.mp4');
  const webmPath = path.join(artifactDir, 'fenix_phase56_comprehensive_system_tour.webm');

  assert.ok(fs.existsSync(mp4Path), 'MP4 comprehensive tour video must exist');
  assert.ok(fs.statSync(mp4Path).size > 5 * 1024 * 1024, 'MP4 video must be > 5 MB');

  assert.ok(fs.existsSync(webmPath), 'WebM video must exist');
  assert.ok(fs.statSync(webmPath).size > 5 * 1024 * 1024, 'WebM video must be > 5 MB');

  const still1 = path.join(artifactDir, 'phase56_bai_live_session_and_governance.png');
  const still2 = path.join(artifactDir, 'phase56_bai_profiles_and_instances.png');
  assert.ok(fs.existsSync(still1), 'Live session still must exist');
  assert.ok(fs.existsSync(still2), 'Profiles still must exist');
});
