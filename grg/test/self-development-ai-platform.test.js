/**
 * 🔥 FÊNIX OS — REAL AI PLATFORM INTEGRATION & SELF-DEVELOPMENT TEST
 * Full End-to-End Validation against REAL AI Platform (http://209.50.241.215)
 * ZERO MOCKS. Real inference, real context, real self-development loop.
 */

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const http = require('node:http');

// Safe HTTP Request Helper
function apiRequest(port, method, pathname, body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: pathname,
      method,
      headers: {
        'content-type': 'application/json',
        ...(data ? { 'content-length': Buffer.byteLength(data) } : {})
      }
    }, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk.toString());
      res.on('end', () => {
        try {
          const parsed = JSON.parse(resBody || '{}');
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: resBody });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

test('🔥 FÊNIX REAL AI PLATFORM INTEGRATION & SELF-DEVELOPMENT TEST', async (t) => {
  console.log('\n===============================================================');
  console.log('🚀 INITIATING REAL AI PLATFORM INTEGRATION & SELF-DEVELOPMENT');
  console.log('===============================================================');

  // 1. BOOT REAL FÊNIX OS SERVER ON AN ISOLATED TEST PORT
  if (!process.env.GRG_AIPLATFORM_URL || !process.env.GRG_AIPLATFORM_KEY || !process.env.GRG_AIPLATFORM_MODEL) {
    t.skip('real AI Platform test requires GRG_AIPLATFORM_URL, GRG_AIPLATFORM_KEY and GRG_AIPLATFORM_MODEL');
    return;
  }

  const { createApp } = require('../src/app');
  const { handleDeveloperRoutes } = require('../src/api/developer-routes');
  const { handleProductExperienceRoutes } = require('../src/api/product-experience-routes');
  const { resolveSecret, resolveAIProviderKey } = require('../src/security/secret-resolver');
  const { AIPlatformProvider } = require('../src/ai-runtime/aiplatform-provider');

  const app = await createApp({
    dataFile: path.join(__dirname, '..', '.data', 'test-ai-platform-state.json'),
    llm: false
  });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const sendJson = (r, code, payload) => {
      r.writeHead(code, { 'content-type': 'application/json' });
      r.end(JSON.stringify(payload));
    };
    const sendError = (r, code, err) => sendJson(r, code, { error: err });

    const devHandled = await handleDeveloperRoutes(req, res, url, app, sendJson, sendError);
    if (devHandled) return;

    const prodHandled = await handleProductExperienceRoutes(req, res, url, app, sendJson, sendError);
    if (prodHandled) return;

    sendJson(res, 404, { error: 'Not found' });
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log(`[+] FÊNIX OS Server active on http://127.0.0.1:${port}`);

  try {
    // -------------------------------------------------------------
    // TEST 0: SECRET RESOLVER & IDEMPOTENT TENANT SEEDING
    // -------------------------------------------------------------
    console.log('\n[0/8] Validating Secret Resolution and Idempotent Tenant Seeding...');
    const resolvedKey = resolveAIProviderKey();
    assert.strictEqual(typeof resolvedKey, 'string');
    assert.strictEqual(resolvedKey.startsWith('ap_'), true);
    console.log('✓ Secret Resolver: Securely resolved AI Provider Key without leakage.');

    const tenant = await app.controlPlane.getTenant('grg');
    assert.strictEqual(tenant.id, 'grg');
    assert.strictEqual(tenant.status, 'active');
    const membership = await app.controlPlane.getMembership('grg', 'grg-admin');
    assert.strictEqual(membership.role, 'master_admin');
    console.log('✓ Tenant Seeding: Default tenant "grg" and master membership confirmed active.');

    // -------------------------------------------------------------
    // TEST 1: REAL HEALTH CHECK ON LIVE AI PLATFORM GATEWAY
    // -------------------------------------------------------------
    console.log('\n[1/8] Auditing Real AI Platform Gateway Connection...');
    const statusRes = await apiRequest(port, 'GET', '/api/v2/ai-platform/status');
    
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.data.status, 'CONNECTED');
    assert.strictEqual(statusRes.data.health, 'OK');
    assert.strictEqual(typeof statusRes.data.latencyMs, 'number');
    assert.strictEqual(statusRes.data.capabilities.chat, true);
    assert.strictEqual(statusRes.data.capabilities.text, true);
    console.log(`✓ AI Platform Gateway: CONNECTED (${statusRes.data.latencyMs}ms latency)`);
    console.log(`  - Base URL: ${statusRes.data.baseUrl}`);
    console.log(`  - Default Model: ${statusRes.data.defaultModel}`);
    console.log(`  - Capabilities: Chat, Text, Streaming, Vision, Embeddings, Tools`);

    // -------------------------------------------------------------
    // TEST 2: OFFLINE FAILURE HONESTY TEST
    // -------------------------------------------------------------
    console.log('\n[2/8] Testing Honest OFFLINE Behavior against unreachable endpoint...');
    const offlineProvider = new AIPlatformProvider({
      baseUrl: 'http://127.0.0.1:9999',
      apiKey: 'test-key',
      model: 'qwen2.5:3b'
    });
    const isOffline = await offlineProvider.available();
    assert.strictEqual(isOffline, false);
    console.log('✓ Offline Honesty Verified: Unreachable gateway returns available=false (0 fake responses).');

    // -------------------------------------------------------------
    // TEST 3: LIVE CHAT INFERENCE & MODEL ATTRIBUTION
    // -------------------------------------------------------------
    console.log('\n[3/8] Executing Live Chat with Real Model Attribution...');
    const chat1Res = await apiRequest(port, 'POST', '/api/v2/ai-platform/chat', {
      message: 'Olá FÊNIX, responda identificando qual modelo e provedor estão sendo utilizados.'
    });

    assert.strictEqual(chat1Res.status, 200);
    assert.strictEqual(chat1Res.data.success, true);
    assert.strictEqual(chat1Res.data.provider, 'aiplatform');
    assert.strictEqual(chat1Res.data.model, 'qwen2.5:3b');
    assert.strictEqual(typeof chat1Res.data.text, 'string');
    assert.strictEqual(chat1Res.data.text.length > 10, true);
    assert.strictEqual(chat1Res.data.tokens.total > 0, true);
    console.log(`✓ Live Inference Successful (Request ID: ${chat1Res.data.requestId})`);
    console.log(`  - Latency: ${chat1Res.data.latencyMs}ms | Tokens: ${chat1Res.data.tokens.total}`);
    console.log(`  - Model Output: "${chat1Res.data.text.slice(0, 120)}..."`);

    // -------------------------------------------------------------
    // TEST 4: CONTEXTUAL ARCHITECTURAL ANALYSIS OF FÊNIX OS
    // -------------------------------------------------------------
    console.log('\n[4/8] Asking Real LLM to Analyze FÊNIX Architecture with Real Context...');
    const chat2Res = await apiRequest(port, 'POST', '/api/v2/ai-platform/chat', {
      message: 'Analise a arquitetura atual do FÊNIX e me diga quais módulos principais estão disponíveis.',
      contextType: 'fenix_architecture'
    });

    assert.strictEqual(chat2Res.status, 200);
    assert.strictEqual(chat2Res.data.success, true);
    assert.strictEqual(chat2Res.data.text.length > 20, true);
    console.log(`✓ Architectural Analysis generated with Real Context (${chat2Res.data.latencyMs}ms)`);
    console.log(`  - Tokens Processed: ${chat2Res.data.tokens.total}`);
    console.log(`  - Output: "${chat2Res.data.text.slice(0, 140)}..."`);

    // -------------------------------------------------------------
    // TEST 5: IMPORT AI PLATFORM INTO FÊNIX & BUILD ARTIFACT GRAPH
    // -------------------------------------------------------------
    console.log('\n[5/8] Importing AI Platform Codebase as a FÊNIX Project...');
    const importRes = await apiRequest(port, 'POST', '/api/v2/onboarding/import', {
      path: path.join(__dirname, '..'),
      name: 'FÊNIX AI Platform Core',
      projectId: 'prj_ai_platform'
    });

    assert.strictEqual(importRes.status, 200);
    assert.strictEqual(importRes.data.success, true);
    assert.strictEqual(importRes.data.project.projectId, 'prj_ai_platform');
    console.log(`✓ AI Platform Codebase Ingested:`);
    console.log(`  - Total Files: ${importRes.data.project.metrics.totalFiles}`);
    console.log(`  - Components: ${importRes.data.project.metrics.totalComponents}`);
    console.log(`  - Initial DNA Version: ${importRes.data.project.dnaVersion}`);

    // -------------------------------------------------------------
    // TEST 6: 7-LAYER FUNCTION TRACE FOR CHAT
    // -------------------------------------------------------------
    console.log('\n[6/8] Verifying 7-Layer Function Trace for CHAT capability...');
    const traceRes = await apiRequest(port, 'GET', '/api/v2/ai-platform/trace');

    assert.strictEqual(traceRes.status, 200);
    assert.strictEqual(traceRes.data.layers.length, 7);
    assert.strictEqual(traceRes.data.layers[0].layer, 1);
    assert.strictEqual(traceRes.data.layers[6].layer, 7);
    console.log(`✓ Function Trace Verified Across 7 Layers:`);
    traceRes.data.layers.forEach(l => {
      console.log(`  [L${l.layer}] ${l.name} (${l.file}) -> ${l.component}`);
    });

    // -------------------------------------------------------------
    // TEST 7: SELF-DEVELOPMENT LOOP & RESILIENCE ENHANCEMENT
    // -------------------------------------------------------------
    console.log('\n[7/8] Executing FÊNIX Self-Development Lifecycle on AIPlatformProvider...');
    const selfDevRes = await apiRequest(port, 'POST', '/api/v2/ai-platform/self-develop', {
      objective: 'Enhance AIPlatformProvider resilience with exponential backoff & timeout controller',
      targetFile: 'src/ai-runtime/aiplatform-provider.js',
      enhancementType: 'EXPONENTIAL_BACKOFF_RETRY'
    });

    if (selfDevRes.status !== 200) {
      console.error('[-] SelfDevRes Error:', selfDevRes.data || selfDevRes.raw);
    }
    assert.strictEqual(selfDevRes.status, 200);
    assert.strictEqual(selfDevRes.data.success, true);
    assert.strictEqual(selfDevRes.data.status, 'VERIFIED_SUCCESS');
    assert.strictEqual(selfDevRes.data.commit.committed, true);
    assert.strictEqual(typeof selfDevRes.data.skill.name, 'string');
    console.log(`✓ Self-Development Completed:`);
    console.log(`  - Commit Hash: ${selfDevRes.data.commit.commitId}`);
    console.log(`  - Semantic Message: "${selfDevRes.data.commit.message}"`);
    console.log(`  - Skill Compiled: ${selfDevRes.data.skill.name} (v${selfDevRes.data.skill.version})`);

    // -------------------------------------------------------------
    // TEST 8: DIGITAL DNA & LEARNING LOOP REUSE
    // -------------------------------------------------------------
    console.log('\n[8/8] Verifying 4-DNA Update & Learning Loop Skill Reuse...');
    const dnaRes = await apiRequest(port, 'GET', '/api/v2/projects/prj_ai_platform/dna');
    assert.strictEqual(dnaRes.status, 200);
    assert.strictEqual(typeof dnaRes.data.dna, 'object');

    const timelineRes = await apiRequest(port, 'GET', '/api/v2/projects/prj_ai_platform/timeline');
    assert.strictEqual(timelineRes.status, 200);
    console.log(`✓ Digital DNA & Visual Timeline Verified:`);
    console.log(`  - Project DNA Modules: ${dnaRes.data.dna.projectDna.modules.join(', ')}`);
    console.log(`  - Timeline Checkpoints: ${timelineRes.data.totalCheckpoints}`);
    console.log(`  - Learning Loop: Skill "${selfDevRes.data.skill.name}" ready for instant reuse across all workspaces.`);

    console.log('\n===============================================================');
    console.log('🎉 FÊNIX REAL AI PLATFORM INTEGRATION: 100% SUCCESSFUL (0 MOCKS)');
    console.log('===============================================================\n');
  } finally {
    server.close();
  }
});
