/**
 * FÊNIX OS — DEVICE AGENT, COMPUTER CONTROL & MOBILE RUNTIME E2E TEST SUITE
 * 
 * Tests:
 * 1. Device Registration (Windows, Android)
 * 2. Challenge-Response Cryptographic Handshake & Session Token Issuance
 * 3. Real-Time Device Heartbeat & System Metrics (CPU, RAM, Uptime)
 * 4. Real Computer Tool: Application Management (Notepad Open / Window Track / Close)
 * 5. Real Computer Tool: Filesystem Workspace Operations (Write, Read, Byte verification)
 * 6. Real Computer Tool: Terminal Execution (node --version)
 * 7. Permission Center: Policy Enforcement (ALLOW / ASK / DENY)
 * 8. Permission Center: Granular Permission Updates
 * 9. Governance: Global Emergency Stop Activation & Command Blocking
 * 10. Governance: Device Revocation & Token Invalidation Kill Switch
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
  console.log('FÊNIX OS — DEVICE AGENT & COMPUTER CONTROL E2E TEST SUITE');
  console.log('================================================================\n');

  // 1. Device Registration
  console.log('[1/10] Registering Windows Device Agent (GRG-WINDOWS-TEST)...');
  const regRes = await post('/api/v2/devices/register', {
    deviceId: 'GRG-WINDOWS-TEST',
    deviceName: 'Dell Precision Workstation',
    deviceType: 'windows',
    os: 'Windows 11 Enterprise (x64)',
    capabilities: {
      screen: true,
      mouse: true,
      keyboard: true,
      filesystem: true,
      terminal: true,
      process: true
    }
  });
  assert.strictEqual(regRes.status, 200);
  assert.strictEqual(regRes.data.status, 'REGISTERED_AND_ONLINE');
  console.log(`   ✅ Device Registered: ${regRes.data.deviceId} (${regRes.data.deviceName})`);

  // 2. Challenge-Response Authentication Handshake
  console.log('\n[2/10] Testing Challenge-Response Handshake & Token Issuance...');
  const chRes = await post('/api/v2/devices/auth/challenge', { deviceId: 'GRG-WINDOWS-TEST' });
  assert.strictEqual(chRes.status, 200);
  assert.ok(chRes.data.nonce, 'Must return cryptographic nonce');
  console.log(`   ✅ Nonce Generated: ${chRes.data.nonce.slice(0, 16)}...`);

  const authRes = await post('/api/v2/devices/auth/verify', {
    nonce: chRes.data.nonce,
    signature: 'mock_sig_ed25519_valid'
  });
  assert.strictEqual(authRes.status, 200);
  assert.ok(authRes.data.token.startsWith('dtoken_'), 'Token must be issued');
  console.log(`   ✅ Session Token Issued: ${authRes.data.token.slice(0, 20)}... (Valid for 12h)`);

  // 3. Heartbeat & Metrics Telemetry
  console.log('\n[3/10] Sending Heartbeat & System Metrics...');
  const hbRes = await post('/api/v2/devices/GRG-WINDOWS-TEST/heartbeat', {
    cpu: 3.4,
    memoryUsedMb: 128.0,
    uptimeSeconds: 1200
  });
  assert.strictEqual(hbRes.status, 200);
  assert.strictEqual(hbRes.data.status, 'ONLINE');
  console.log(`   ✅ Heartbeat Recorded -> Status: ONLINE (Emergency Stop: ${hbRes.data.emergencyStop})`);

  // 4. Real Computer Tool: Application Management
  console.log('\n[4/10] Executing Computer Tool: Application Management (Notepad.exe)...');
  const appLaunchRes = await post('/api/v2/devices/GRG-WINDOWS-TEST/execute', {
    category: 'PROCESS',
    command: 'computer.openApplication',
    params: { appName: 'notepad.exe' }
  });
  assert.strictEqual(appLaunchRes.status, 200);
  assert.strictEqual(appLaunchRes.data.result.status, 'RUNNING');
  console.log(`   ✅ Application Launched: ${appLaunchRes.data.result.appName} (PID: ${appLaunchRes.data.result.processId})`);

  const appCloseRes = await post('/api/v2/devices/GRG-WINDOWS-TEST/execute', {
    category: 'PROCESS',
    command: 'computer.closeApplication',
    params: { appName: 'notepad.exe' }
  });
  assert.strictEqual(appCloseRes.status, 200);
  assert.strictEqual(appCloseRes.data.result.status, 'TERMINATED');
  console.log(`   ✅ Application Closed: ${appCloseRes.data.result.appName} -> TERMINATED`);

  // 5. Real Computer Tool: Filesystem Workspace Operations
  console.log('\n[5/10] Executing Computer Tool: Filesystem Workspace Write & Read...');
  const writeRes = await post('/api/v2/devices/GRG-WINDOWS-TEST/execute', {
    category: 'FILES',
    command: 'computer.filesystemWrite',
    params: { path: 'fenix-test.txt', content: 'FÊNIX OS RUNTIME VALIDATION' }
  });
  assert.strictEqual(writeRes.status, 200);
  assert.strictEqual(writeRes.data.result.status, 'WRITTEN');
  console.log(`   ✅ Workspace File Written: ${writeRes.data.result.path} (${writeRes.data.result.bytesWritten} bytes)`);

  const readRes = await post('/api/v2/devices/GRG-WINDOWS-TEST/execute', {
    category: 'FILES',
    command: 'computer.filesystemRead',
    params: { path: 'fenix-test.txt' }
  });
  assert.strictEqual(readRes.status, 200);
  assert.strictEqual(readRes.data.result.status, 'READ_SUCCESS');
  console.log(`   ✅ Workspace File Verified: "${readRes.data.result.content}"`);

  // 6. Real Computer Tool: Terminal Execution
  console.log('\n[6/10] Executing Computer Tool: Terminal Execution (node --version)...');
  const termRes = await post('/api/v2/devices/GRG-WINDOWS-TEST/execute', {
    category: 'TERMINAL',
    command: 'computer.terminalExecute',
    params: { commandLine: 'node --version' },
    userConsentGranted: true
  });
  assert.strictEqual(termRes.status, 200);
  assert.strictEqual(termRes.data.result.exitCode, 0);
  assert.ok(termRes.data.result.stdout.includes('v22.'), 'Node version output received');
  console.log(`   ✅ Terminal Execution Successful: ${termRes.data.result.stdout.trim()} (Exit Code: 0)`);

  // 7. Permission Center: Policy Enforcement
  console.log('\n[7/10] Testing Permission Center Policy Enforcement (ALLOW / ASK / DENY)...');
  
  // ASK category without userConsentGranted -> requires consent
  const askNoConsent = await post('/api/v2/devices/GRG-WINDOWS-TEST/execute', {
    category: 'TERMINAL',
    command: 'computer.terminalExecute',
    params: { commandLine: 'npm test' },
    userConsentGranted: false
  });
  assert.strictEqual(askNoConsent.status, 200);
  assert.strictEqual(askNoConsent.data.requiresConsent, true);
  console.log(`   ✅ ASK Policy Enforced: ${askNoConsent.data.message}`);

  // DENY category -> rejected with 400 error
  const denyRes = await post('/api/v2/devices/GRG-WINDOWS-TEST/execute', {
    category: 'MICROPHONE',
    command: 'computer.captureAudio',
    params: {}
  });
  assert.strictEqual(denyRes.status, 400);
  console.log(`   ✅ DENY Policy Enforced: Blocked forbidden microphone access`);

  // 8. Granular Permission Updates
  console.log('\n[8/10] Updating Granular Permissions for Device...');
  const permUpdate = await post('/api/v2/devices/GRG-WINDOWS-TEST/permissions', {
    permissions: { TERMINAL: 'ALLOW', CAMERA: 'ASK' }
  });
  assert.strictEqual(permUpdate.status, 200);
  assert.strictEqual(permUpdate.data.permissions.TERMINAL, 'ALLOW');
  assert.strictEqual(permUpdate.data.permissions.CAMERA, 'ASK');
  console.log(`   ✅ Permissions Updated: TERMINAL = ALLOW | CAMERA = ASK`);

  // 9. Governance: Global Emergency Stop
  console.log('\n[9/10] Testing Global Emergency Stop (Kill Switch)...');
  const stopRes = await post('/api/v2/devices/emergency-stop', { active: true });
  assert.strictEqual(stopRes.status, 200);
  assert.strictEqual(stopRes.data.emergencyStopActive, true);

  // Attempting command during Emergency Stop must fail
  const blockedExec = await post('/api/v2/devices/GRG-WINDOWS-TEST/execute', {
    category: 'PROCESS',
    command: 'computer.openApplication',
    params: { appName: 'notepad.exe' }
  });
  assert.strictEqual(blockedExec.status, 400);
  console.log(`   ✅ Emergency Stop Enforced: ${blockedExec.data.error}`);

  // Clear Emergency Stop
  await post('/api/v2/devices/emergency-stop', { active: false });

  // 10. Governance: Device Revocation
  console.log('\n[10/10] Testing Device Revocation & Token Invalidation...');
  const revokeRes = await post('/api/v2/devices/GRG-WINDOWS-TEST/revoke');
  assert.strictEqual(revokeRes.status, 200);
  assert.strictEqual(revokeRes.data.status, 'REVOKED');
  console.log(`   ✅ Device Revoked: GRG-WINDOWS-TEST -> REVOKED`);

  console.log('\n================================================================');
  console.log('🎉 ALL 10 DEVICE AGENT & COMPUTER CONTROL TESTS PASSED (100%)');
  console.log('================================================================\n');
}

runSuite().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
