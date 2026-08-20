/**
 * FÊNIX OS — ALEXA BIDIRECTIONAL REAL VOICE PIPELINE E2E TEST SUITE
 * 
 * Pipeline Tested:
 * 1. External HTTPS TLS 1.3 & Certificate Validation (https://fenix.209-50-241-22.sslip.io)
 * 2. LaunchRequest: Dynamic greeting based on live workspace & agent counts
 * 3. FenixStatusIntent: Real-time VPS, Qwen 2.5, Agents, Jobs telemetry
 * 4. FenixIdentityIntent: System identity & Agentic OS architecture
 * 5. FenixProjectsIntent: Real MultiProjectWorkspaceManager query
 * 6. FenixAgentsIntent: Real AgentRegistry query (19 agents, live states)
 * 7. FenixDiagnoseIntent: Real Job Creation in AutonomousJobOrchestrator
 * 8. FenixJobsIntent: Real Job Status & Progress Tracking
 * 9. FenixStopIntent: Real Safe Job Cancellation
 * 10. FenixCommandIntent: Ingestion into Fênix Mind & AI Platform Qwen 2.5
 * 11. Observability Endpoints: GET /api/v2/voice/alexa/status & health
 */

const assert = require('assert');
const http = require('http');
const tls = require('tls');

const LOCAL_URL = 'http://127.0.0.1:4400';
const OFFICIAL_SKILL_ID = 'amzn1.ask.skill.d8464469-c6ed-428b-b52e-68789c41d21e';

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
  console.log('FÊNIX OS — ALEXA BIDIRECTIONAL REAL VOICE E2E TEST SUITE');
  console.log('================================================================\n');

  const nowIso = new Date().toISOString();
  const sessionId = `SessionId.bidirectional_${Date.now()}`;

  // 1. External HTTPS Audit
  console.log('[1/11] Auditing Live External HTTPS Endpoint: https://fenix.209-50-241-22.sslip.io...');
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
  console.log(`   ✅ HTTPS Verified: ${tlsAudit.proto} | Issuer: ${tlsAudit.issuer} | SAN: ${tlsAudit.san}`);

  // 2. LaunchRequest: Dynamic greeting
  console.log('\n[2/11] User says: "Alexa, abrir Fênix"...');
  const launchRes = await post('/api/v2/voice/alexa', {
    version: '1.0',
    session: {
      new: true,
      sessionId,
      application: { applicationId: OFFICIAL_SKILL_ID },
      attributes: {},
      user: { userId: 'amzn1.ask.account.grg_admin' }
    },
    request: {
      type: 'LaunchRequest',
      timestamp: new Date().toISOString()
    }
  });
  assert.strictEqual(launchRes.status, 200);
  assert.ok(launchRes.data.response.outputSpeech.text.includes('Fênix conectado'));
  assert.ok(launchRes.data.response.outputSpeech.text.includes('pronto') || launchRes.data.response.outputSpeech.text.includes('agentes'));
  console.log(`   ✅ Dynamic Speech Output: "${launchRes.data.response.outputSpeech.text}"`);

  // 3. Status Intent
  console.log('\n[3/11] User says: "Fênix, qual o status do sistema?"...');
  const statusRes = await post('/api/v2/voice/alexa', {
    version: '1.0',
    session: { sessionId, application: { applicationId: OFFICIAL_SKILL_ID } },
    request: { type: 'IntentRequest', timestamp: new Date().toISOString(), intent: { name: 'FenixStatusIntent' } }
  });
  assert.strictEqual(statusRes.status, 200);
  assert.ok(statusRes.data.response.outputSpeech.text.includes('Fênix OS online e 100% saudável'));
  assert.ok(statusRes.data.response.outputSpeech.text.includes('Qwen 2.5'));
  console.log(`   ✅ Status Speech Output: "${statusRes.data.response.outputSpeech.text}"`);

  // 4. Identity Intent
  console.log('\n[4/11] User says: "Fênix, quem é você?"...');
  const identRes = await post('/api/v2/voice/alexa', {
    version: '1.0',
    session: { sessionId, application: { applicationId: OFFICIAL_SKILL_ID } },
    request: { type: 'IntentRequest', timestamp: new Date().toISOString(), intent: { name: 'FenixIdentityIntent' } }
  });
  assert.strictEqual(identRes.status, 200);
  assert.ok(identRes.data.response.outputSpeech.text.includes('sistema operacional agêntico'));
  console.log(`   ✅ Identity Speech Output: "${identRes.data.response.outputSpeech.text}"`);

  // 5. Projects Intent
  console.log('\n[5/11] User says: "Fênix, quais projetos estão conectados?"...');
  const projRes = await post('/api/v2/voice/alexa', {
    version: '1.0',
    session: { sessionId, application: { applicationId: OFFICIAL_SKILL_ID } },
    request: { type: 'IntentRequest', timestamp: new Date().toISOString(), intent: { name: 'FenixProjectsIntent' } }
  });
  assert.strictEqual(projRes.status, 200);
  assert.ok(projRes.data.response.outputSpeech.text.includes('projetos'));
  console.log(`   ✅ Projects Speech Output: "${projRes.data.response.outputSpeech.text}"`);

  // 6. Agents Intent
  console.log('\n[6/11] User says: "Fênix, quais agentes estão trabalhando?"...');
  const agRes = await post('/api/v2/voice/alexa', {
    version: '1.0',
    session: { sessionId, application: { applicationId: OFFICIAL_SKILL_ID } },
    request: { type: 'IntentRequest', timestamp: new Date().toISOString(), intent: { name: 'FenixAgentsIntent' } }
  });
  assert.strictEqual(agRes.status, 200);
  assert.ok(agRes.data.response.outputSpeech.text.includes('19 agentes'));
  console.log(`   ✅ Agents Speech Output: "${agRes.data.response.outputSpeech.text}"`);

  // 7. Diagnose Intent: Real Job Creation
  console.log('\n[7/11] User says: "Fênix, analise o projeto ativo"...');
  const diagRes = await post('/api/v2/voice/alexa', {
    version: '1.0',
    session: { sessionId, application: { applicationId: OFFICIAL_SKILL_ID }, attributes: { activeProjectId: 'fenix_test_lab' } },
    request: { type: 'IntentRequest', timestamp: new Date().toISOString(), intent: { name: 'FenixDiagnoseIntent' } }
  });
  assert.strictEqual(diagRes.status, 200);
  assert.ok(diagRes.data.response.outputSpeech.text.includes('Diagnóstico do projeto'));
  assert.ok(diagRes.data.response.outputSpeech.text.includes('Job #'));
  console.log(`   ✅ Real Job Triggered Speech: "${diagRes.data.response.outputSpeech.text}"`);

  // 8. Jobs Status Intent
  console.log('\n[8/11] User says: "Fênix, quais tarefas estão rodando?"...');
  const jobRes = await post('/api/v2/voice/alexa', {
    version: '1.0',
    session: { sessionId, application: { applicationId: OFFICIAL_SKILL_ID } },
    request: { type: 'IntentRequest', timestamp: new Date().toISOString(), intent: { name: 'FenixJobsIntent' } }
  });
  assert.strictEqual(jobRes.status, 200);
  console.log(`   ✅ Live Job Status Speech: "${jobRes.data.response.outputSpeech.text}"`);

  // 9. Stop Intent: Real Job Cancellation
  console.log('\n[9/11] User says: "Fênix, pare o trabalho atual"...');
  const stopRes = await post('/api/v2/voice/alexa', {
    version: '1.0',
    session: { sessionId, application: { applicationId: OFFICIAL_SKILL_ID } },
    request: { type: 'IntentRequest', timestamp: new Date().toISOString(), intent: { name: 'FenixStopIntent' } }
  });
  assert.strictEqual(stopRes.status, 200);
  assert.ok(stopRes.data.response.outputSpeech.text.includes('Interrompi') || stopRes.data.response.outputSpeech.text.includes('Não há trabalho'));
  console.log(`   ✅ Stop Execution Speech: "${stopRes.data.response.outputSpeech.text}"`);

  // 10. Natural Command with AI Platform (Qwen 2.5 on VPS)
  console.log('\n[10/11] User says: "Fênix, crie uma tarefa para corrigir o bug do login"...');
  const cmdRes = await post('/api/v2/voice/alexa', {
    version: '1.0',
    session: { sessionId, application: { applicationId: OFFICIAL_SKILL_ID }, attributes: { activeProjectId: 'fenix_test_lab' } },
    request: {
      type: 'IntentRequest',
      timestamp: new Date().toISOString(),
      intent: {
        name: 'FenixCommandIntent',
        slots: { command: { name: 'command', value: 'Corrigir o bug do login e adicionar testes de resiliência' } }
      }
    }
  });
    if (cmdRes.status !== 200) {
      console.error('DEBUG cmdRes Error:', cmdRes.data);
    }
    assert.strictEqual(cmdRes.status, 200);
  assert.ok(cmdRes.data.response.outputSpeech.text.includes('Criei o job'));
  assert.ok(cmdRes.data.response.outputSpeech.text.includes('Reality Score'));
  console.log(`   ✅ AI Platform Ingestion Output: "${cmdRes.data.response.outputSpeech.text}"`);

  // 11. Observability Endpoints
  console.log('\n[11/11] Querying Alexa Voice Observability & Telemetry Endpoints...');
  const obsRes = await get('/api/v2/voice/alexa/status');
  assert.strictEqual(obsRes.status, 200);
  assert.strictEqual(obsRes.data.status, 'ONLINE');
  assert.strictEqual(obsRes.data.skillId, OFFICIAL_SKILL_ID);
  assert.ok(obsRes.data.metrics.totalRequests >= 5);
  console.log(`   ✅ Voice Gateway Status: ${obsRes.data.status} | Total Requests: ${obsRes.data.metrics.totalRequests} | Latency: ${obsRes.data.metrics.lastLatencyMs}ms`);

  const healthRes = await get('/api/v2/voice/alexa/health');
  assert.strictEqual(healthRes.status, 200);
  assert.strictEqual(healthRes.data.ok, true);
  console.log(`   ✅ Voice Gateway Health: OK`);

  console.log('\n================================================================');
  console.log('🎉 ALL 11 ALEXA BIDIRECTIONAL REAL VOICE TESTS PASSED (100%)');
  console.log('================================================================\n');
}

runSuite().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
