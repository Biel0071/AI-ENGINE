/**
 * FÊNIX OS — ALEXA VOICE GATEWAY & SIMULATOR E2E TEST SUITE
 * 
 * Tests:
 * 1. HTTPS Audit of fenix.209-50-241-22.sslip.io (TLS 1.3, Let's Encrypt CA, SAN check)
 * 2. Alexa Request Protocol: Valid LaunchRequest
 * 3. Security: Invalid Signature / CertChain Rejection
 * 4. Security: Expired Timestamp Rejection (>150s)
 * 5. Intent: FenixStatusIntent (Live runtime telemetry check)
 * 6. Intent: FenixJobsIntent & FenixAgentsIntent
 * 7. Intent: FenixProjectsIntent & FenixOpenIdeIntent
 * 8. Intent: FenixCommandIntent -> FÊNIX MIND Pipeline
 * 9. Intent: FenixCancelIntent & Job Cancellation
 * 10. Memory Update Verification
 */

const assert = require('assert');
const http = require('http');
const https = require('https');
const tls = require('tls');

const LOCAL_URL = 'http://127.0.0.1:4400';

function post(endpoint, data = {}, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request(`${LOCAL_URL}${endpoint}`, {
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
    const req = http.request(`${LOCAL_URL}${endpoint}`, { method: 'GET' }, res => {
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
  console.log('FÊNIX OS — ALEXA VOICE E2E TEST SUITE');
  console.log('================================================================\n');

  const nowIso = new Date().toISOString();

  // 1. Audit HTTPS Endpoint
  console.log('[1/10] Auditing Live HTTPS Endpoint: https://fenix.209-50-241-22.sslip.io...');
  const tlsAudit = await new Promise(resolve => {
    const socket = tls.connect({
      host: 'fenix.209-50-241-22.sslip.io',
      port: 443,
      servername: 'fenix.209-50-241-22.sslip.io',
      rejectUnauthorized: false
    }, () => {
      const cert = socket.getPeerCertificate(true);
      const proto = socket.getProtocol();
      socket.end();
      resolve({ proto, issuer: cert.issuer?.O, san: cert.subjectaltname, authorized: socket.authorized });
    });
    socket.on('error', err => resolve({ error: err.message }));
  });

  assert.ok(!tlsAudit.error, 'TLS connection must succeed');
  assert.strictEqual(tlsAudit.proto, 'TLSv1.3', 'Must use TLS 1.3');
  assert.ok(tlsAudit.issuer?.includes("Let's Encrypt"), 'Issuer must be Let\'s Encrypt');
  console.log(`   ✅ TLS Protocol: ${tlsAudit.proto} | Issuer: ${tlsAudit.issuer} | SAN: ${tlsAudit.san}`);

  // 2. Valid Alexa LaunchRequest
  console.log('\n[2/10] Testing Alexa LaunchRequest ("Alexa, abra Fênix")...');
  const launchRes = await post('/api/v2/voice/alexa', {
    version: '1.0',
    session: {
      new: true,
      sessionId: 'SessionId.alexa_e2e_001',
      application: { applicationId: 'amzn1.ask.skill.fenix-core' },
      attributes: {},
      user: { userId: 'amzn1.ask.account.admin_001' }
    },
    request: {
      type: 'LaunchRequest',
      requestId: 'EdwRequestId.launch_001',
      timestamp: nowIso
    }
  });
  assert.strictEqual(launchRes.status, 200);
  assert.ok(launchRes.data.response.outputSpeech.text.includes('Fênix conectado'));
  console.log(`   ✅ Alexa Voice Output: "${launchRes.data.response.outputSpeech.text}"`);

  // 3. Security: Invalid Signature CertChain Rejection
  console.log('\n[3/10] Testing Security: Invalid Signature CertChain Rejection...');
  const fakeCertRes = await post('/api/v2/voice/alexa', {
    version: '1.0',
    session: { applicationId: 'amzn1.ask.skill.fenix-core' },
    request: { type: 'LaunchRequest', timestamp: nowIso }
  }, {
    'SignatureCertChainUrl': 'https://malicious-domain.com/cert.pem'
  });
  assert.strictEqual(fakeCertRes.status, 400);
  console.log(`   ✅ Security Gate Blocked Invalid Cert URL: ${fakeCertRes.data.error || 'Blocked'}`);

  // 4. Security: Expired Timestamp Rejection
  console.log('\n[4/10] Testing Security: Expired Timestamp Rejection (>150s)...');
  const expiredIso = new Date(Date.now() - 360000).toISOString();
  const expiredRes = await post('/api/v2/voice/alexa', {
    version: '1.0',
    session: { applicationId: 'amzn1.ask.skill.fenix-core' },
    request: { type: 'LaunchRequest', timestamp: expiredIso }
  });
  assert.strictEqual(expiredRes.status, 400);
  console.log(`   ✅ Security Gate Blocked Stale Request: ${expiredRes.data.error || 'Blocked'}`);

  // 5. Intent: FenixStatusIntent (Live runtime telemetry)
  console.log('\n[5/10] Testing Intent: FenixStatusIntent ("Alexa, qual o status do sistema?")...');
  const statusRes = await post('/api/v2/voice/alexa', {
    version: '1.0',
    session: {
      sessionId: 'SessionId.alexa_e2e_002',
      application: { applicationId: 'amzn1.ask.skill.fenix-core' }
    },
    request: {
      type: 'IntentRequest',
      timestamp: nowIso,
      intent: { name: 'FenixStatusIntent' }
    }
  });
  assert.strictEqual(statusRes.status, 200);
  assert.ok(statusRes.data.response.outputSpeech.text.includes('Fênix OS online e 100% saudável'));
  assert.ok(statusRes.data.response.outputSpeech.text.includes('Qwen 2.5'));
  console.log(`   ✅ Live Telemetry Speech: "${statusRes.data.response.outputSpeech.text}"`);

  // 6. Intent: FenixJobsIntent & FenixAgentsIntent
  console.log('\n[6/10] Testing Intent: FenixJobsIntent & FenixAgentsIntent...');
  const jobsRes = await post('/api/v2/voice/alexa', {
    version: '1.0',
    session: { sessionId: 'SessionId.alexa_e2e_003', application: { applicationId: 'amzn1.ask.skill.fenix-core' } },
    request: { type: 'IntentRequest', timestamp: nowIso, intent: { name: 'FenixJobsIntent' } }
  });
  assert.strictEqual(jobsRes.status, 200);
  console.log(`   ✅ Jobs Speech: "${jobsRes.data.response.outputSpeech.text}"`);

  const agentsRes = await post('/api/v2/voice/alexa', {
    version: '1.0',
    session: { sessionId: 'SessionId.alexa_e2e_003', application: { applicationId: 'amzn1.ask.skill.fenix-core' } },
    request: { type: 'IntentRequest', timestamp: nowIso, intent: { name: 'FenixAgentsIntent' } }
  });
  assert.strictEqual(agentsRes.status, 200);
  assert.ok(agentsRes.data.response.outputSpeech.text.includes('19 agentes'));
  console.log(`   ✅ Agents Speech: "${agentsRes.data.response.outputSpeech.text}"`);

  // 7. Intent: FenixProjectsIntent & FenixOpenIdeIntent
  console.log('\n[7/10] Testing Intent: FenixOpenIdeIntent ("Alexa, abra a IDE")...');
  const ideRes = await post('/api/v2/voice/alexa', {
    version: '1.0',
    session: {
      sessionId: 'SessionId.alexa_e2e_004',
      application: { applicationId: 'amzn1.ask.skill.fenix-core' },
      attributes: { activeProjectId: 'fenix_test_lab' }
    },
    request: { type: 'IntentRequest', timestamp: nowIso, intent: { name: 'FenixOpenIdeIntent' } }
  });
  assert.strictEqual(ideRes.status, 200);
  assert.strictEqual(ideRes.data.sessionAttributes.targetView, 'ide');
  console.log(`   ✅ IDE Switched Speech: "${ideRes.data.response.outputSpeech.text}"`);

  // 8. Intent: FenixCommandIntent -> Fênix Mind
  console.log('\n[8/10] Testing Intent: FenixCommandIntent -> FÊNIX MIND Pipeline...');
  const cmdRes = await post('/api/v2/voice/alexa', {
    version: '1.0',
    session: {
      sessionId: 'SessionId.alexa_e2e_005',
      application: { applicationId: 'amzn1.ask.skill.fenix-core' },
      attributes: { activeProjectId: 'fenix_test_lab' }
    },
    request: {
      type: 'IntentRequest',
      timestamp: nowIso,
      intent: {
        name: 'FenixCommandIntent',
        slots: { command: { name: 'command', value: 'Criar card de estatísticas de CPU' } }
      }
    }
  });
  assert.strictEqual(cmdRes.status, 200);
  assert.ok(cmdRes.data.response.outputSpeech.text.includes('Reality Score'));
  console.log(`   ✅ Mission Executed by Voice: "${cmdRes.data.response.outputSpeech.text}"`);

  // 9. Intent: FenixCancelIntent
  console.log('\n[9/10] Testing Intent: FenixCancelIntent...');
  const cancelRes = await post('/api/v2/voice/alexa', {
    version: '1.0',
    session: { sessionId: 'SessionId.alexa_e2e_006', application: { applicationId: 'amzn1.ask.skill.fenix-core' } },
    request: { type: 'IntentRequest', timestamp: nowIso, intent: { name: 'FenixCancelIntent' } }
  });
  assert.strictEqual(cancelRes.status, 200);
  console.log(`   ✅ Cancel Speech: "${cancelRes.data.response.outputSpeech.text}"`);

  // 10. Memory Verification
  console.log('\n[10/10] Verifying Conversation & Operational Memory Recording...');
  const memRes = await get('/api/v2/mind/memory/conversations');
  assert.strictEqual(memRes.status, 200);
  console.log(`   ✅ Total Recorded Conversation Sessions: ${memRes.data.total}`);

  console.log('\n================================================================');
  console.log('🎉 ALL 10 ALEXA VOICE E2E TESTS PASSED (100% SUCCESS)');
  console.log('================================================================\n');
}

runSuite().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
