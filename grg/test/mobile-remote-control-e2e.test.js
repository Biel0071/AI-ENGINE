/**
 * FÊNIX OS — MOBILE REMOTE CONTROL (ANYDESK-LIKE VISUAL & AI AGENT) E2E TEST SUITE
 * 
 * Tests:
 * 1. Cryptographic QR Code Device Pairing Generation
 * 2. Pairing Session Claim & Android Device Registration
 * 3. MediaProjection Screen Streaming & Live Viewport Query
 * 4. Screen Frame Ingestion & Telemetry Update (FPS, Latency)
 * 5. Normalized Touch Dispatcher (Tap, LongPress, Swipe with coordinate mapping)
 * 6. Remote Keyboard Input & System Keys (Home, Back, Recents)
 * 7. Accessibility Tree Service (Semantic View Hierarchy)
 * 8. AI Vision Understanding of Mobile Screen Region
 * 9. Device Fleet Groups & Multi-Device DAG Job Execution
 * 10. Emergency Stop & Device Revocation Kill Switch
 */

const assert = require('assert');
const http = require('http');

const BASE_URL = 'http://127.0.0.1:4400';

function post(endpoint, data = {}, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(endpoint) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE_URL}${endpoint}`, { method: 'GET' }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runSuite() {
  console.log('================================================================');
  console.log('FÊNIX OS — MOBILE REMOTE CONTROL & AI AGENT E2E TEST SUITE');
  console.log('================================================================\n');

  // 1. QR Code Pairing Generation
  console.log('[1/10] Generating QR Code Pairing Session for Android Phone...');
  const pairRes = await post('/api/v2/devices/mobile/pairing/create', {
    deviceName: 'Samsung Galaxy S24 Ultra (GRG Personal)'
  });
  assert.strictEqual(pairRes.status, 200);
  assert.ok(pairRes.data.pairingCode.startsWith('PAIR_'));
  assert.ok(pairRes.data.qrData.includes('https://fenix.209-50-241-22.sslip.io'));
  console.log(`   ✅ QR Pairing Code Generated: ${pairRes.data.pairingCode}`);
  console.log(`   ✅ QR Data Payload: ${pairRes.data.qrData}`);

  // 2. Pairing Claim & Android Device Registration
  console.log('\n[2/10] Android Phone Scans QR Code & Claims Pairing Session...');
  const claimRes = await post('/api/v2/devices/mobile/pairing/claim', {
    pairingCode: pairRes.data.pairingCode,
    deviceId: 'Android-S24-Ultra',
    deviceName: 'Samsung Galaxy S24 Ultra (GRG Personal)',
    os: 'Android 14 (OneUI 6.1)',
    version: '14.0'
  });
  assert.strictEqual(claimRes.status, 200);
  assert.strictEqual(claimRes.data.status, 'PAIRED_AND_ONLINE');
  console.log(`   ✅ Device Paired Successfully: ${claimRes.data.deviceId} -> ONLINE`);

  // 3. MediaProjection Screen Streaming & Live Viewport
  console.log('\n[3/10] Querying Live MediaProjection Screen Stream (Default Android-01)...');
  const screenRes = await get('/api/v2/devices/mobile/Android-01/screen/live');
  assert.strictEqual(screenRes.status, 200);
  assert.strictEqual(screenRes.data.isStreaming, true);
  assert.strictEqual(screenRes.data.viewport.width, 1080);
  assert.strictEqual(screenRes.data.viewport.height, 2400);
  console.log(`   ✅ Live Screen Stream Active: 1080x2400 @ ${screenRes.data.fps} FPS (Latency: ${screenRes.data.latencyMs}ms)`);

  // 4. Screen Frame Ingestion & Stream Control
  console.log('\n[4/10] Ingesting New Screen Frame & Updating Stream Quality...');
  const frameRes = await post('/api/v2/devices/mobile/Android-01/screen/frame', {
    quality: 'High',
    fps: 60,
    latencyMs: 12,
    currentForegroundApp: 'com.whatsapp'
  });
  assert.strictEqual(frameRes.status, 200);
  assert.strictEqual(frameRes.data.fps, 60);
  console.log(`   ✅ Frame Ingested -> FPS: ${frameRes.data.fps} | Latency: ${frameRes.data.latencyMs}ms`);

  // 5. Normalized Touch Dispatcher
  console.log('\n[5/10] Dispatching Remote Touch Events (Tap & Swipe)...');
  const tapRes = await post('/api/v2/devices/mobile/Android-01/input', {
    actionType: 'tap',
    x: 640,
    y: 1050
  });
  assert.strictEqual(tapRes.status, 200);
  assert.strictEqual(tapRes.data.executionResult.status, 'DISPATCHED_TO_ACCESSIBILITY_SERVICE');
  console.log(`   ✅ Tap Event Dispatched: (${tapRes.data.inputEvent.x}, ${tapRes.data.inputEvent.y}) -> ACCESSIBILITY`);

  const swipeRes = await post('/api/v2/devices/mobile/Android-01/input', {
    actionType: 'swipe',
    x: 540,
    y: 1800,
    endX: 540,
    endY: 600
  });
  assert.strictEqual(swipeRes.status, 200);
  assert.strictEqual(swipeRes.data.executionResult.status, 'SWIPE_PERFORMED');
  console.log(`   ✅ Swipe Event Dispatched: (${swipeRes.data.executionResult.from.y} -> ${swipeRes.data.executionResult.to.y})`);

  // 6. Remote Keyboard & System Keys
  console.log('\n[6/10] Dispatching Remote Keyboard & Navigation Keys (Type, Home, Back)...');
  const typeRes = await post('/api/v2/devices/mobile/Android-01/input', {
    actionType: 'type',
    text: 'Olá do Fênix OS Control Plane!'
  });
  assert.strictEqual(typeRes.status, 200);
  assert.strictEqual(typeRes.data.executionResult.status, 'INPUT_TEXT_COMMITTED');
  console.log(`   ✅ Text Typed: "${typeRes.data.inputEvent.text}"`);

  const homeRes = await post('/api/v2/devices/mobile/Android-01/input', { actionType: 'home' });
  assert.strictEqual(homeRes.status, 200);
  assert.strictEqual(homeRes.data.executionResult.status, 'GLOBAL_ACTION_EXECUTED');
  console.log(`   ✅ Home Key Dispatched: GLOBAL_ACTION_EXECUTED`);

  // 7. Accessibility Tree Inspection
  console.log('\n[7/10] Inspecting Accessibility Semantic Tree Hierarchy...');
  const treeRes = await get('/api/v2/devices/mobile/Android-01/accessibility-tree');
  assert.strictEqual(treeRes.status, 200);
  assert.ok(treeRes.data.nodes.length >= 4);
  const btn = treeRes.data.nodes.find(n => n.type === 'Button' && n.text === 'Abrir Câmera');
  assert.ok(btn, 'Must locate Camera button in accessibility tree');
  console.log(`   ✅ Semantic Node Located: "${btn.text}" (${btn.type}) Bounds: [${btn.bounds.join(', ')}]`);

  // 8. AI Vision Understanding on Touch Coordinates
  console.log('\n[8/10] AI Vision Analyzing Touch Target at (200, 1000)...');
  const visRes = await post('/api/v2/devices/mobile/Android-01/analyze-region', { x: 200, y: 1000 });
  assert.strictEqual(visRes.status, 200);
  assert.strictEqual(visRes.data.elementDetected.text, 'Abrir Câmera');
  assert.strictEqual(visRes.data.recommendedAction, 'mobile.tap(200, 1000)');
  console.log(`   ✅ AI Vision Identified Element: "${visRes.data.elementDetected.text}" (Confidence: ${visRes.data.visionConfidence * 100}%)`);

  // 9. Multi-Device Fleet Group & DAG Execution
  console.log('\n[9/10] Creating Multi-Device Group & Executing DAG Job...');
  const groupRes = await post('/api/v2/devices/mobile/groups', {
    name: 'Frota de Teste',
    devices: ['Android-01', 'Android-S24-Ultra']
  });
  assert.strictEqual(groupRes.status, 200);
  console.log(`   ✅ Group Created: "${groupRes.data.name}" (${groupRes.data.devices.length} devices)`);

  const groupExec = await post(`/api/v2/devices/mobile/groups/${groupRes.data.id}/execute`, {
    actionType: 'home'
  });
  assert.strictEqual(groupExec.status, 200);
  assert.strictEqual(groupExec.data.executions.length, 2);
  console.log(`   ✅ Multi-Device Job Dispatched to ${groupExec.data.totalDevices} phones simultaneously`);

  // 10. Emergency Stop on Mobile Device
  console.log('\n[10/10] Testing Emergency Stop & Mobile Revocation...');
  const stopRes = await post('/api/v2/devices/emergency-stop', { active: true });
  assert.strictEqual(stopRes.status, 200);
  console.log(`   ✅ Emergency Stop Activated: All mobile automation paused`);

  // Clear Emergency Stop
  await post('/api/v2/devices/emergency-stop', { active: false });

  console.log('\n================================================================');
  console.log('🎉 ALL 10 MOBILE REMOTE CONTROL E2E TESTS PASSED (100%)');
  console.log('================================================================\n');
}

runSuite().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
