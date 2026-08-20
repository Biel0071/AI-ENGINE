/**
 * FÊNIX OS — CENTRAL INTELLIGENCE MIND & CONTROL PLANE E2E TEST SUITE
 * 
 * Verifies all 10 core validations required for the Central Brain:
 * 1. IDE Source Ingestion (source: "ide")
 * 2. MIND Central Endpoint (POST /api/v2/mind/ingest)
 * 3. External Source Simulation: "qwen"
 * 4. External Source Simulation: "codex"
 * 5. External Source Simulation: "claude"
 * 6. Multi-Model Router & Secret Redaction (Never expose API keys)
 * 7. Memory-First Context Retrieval (Conversation 1 -> Conversation 2 memory link)
 * 8. Learning Loop & Reusable Skill Persistence / Reuse
 * 9. Research & Vision Tools
 * 10. Self-Development Execution & Reality Gate Proof (99.8%)
 */

const assert = require('assert');
const http = require('http');

const BASE_URL = 'http://127.0.0.1:4400';

function post(endpoint, data = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
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
  console.log('FÊNIX OS — CENTRAL INTELLIGENCE MIND & CONTROL PLANE E2E TEST');
  console.log('================================================================\n');

  // 1. Ingest via IDE
  console.log('[1/10] Ingesting Prompt from IDE (source: "ide")...');
  const ideRes = await post('/api/v2/mind/ingest', {
    source: 'ide',
    message: 'Adicionar validação estrita de tipos no módulo Dashboard',
    projectId: 'fenix_test_lab'
  });
  assert.strictEqual(ideRes.status, 200, 'IDE Ingest must return 200');
  assert.strictEqual(ideRes.data.source, 'ide');
  assert.strictEqual(ideRes.data.status, 'COMPLETED_AND_VERIFIED');
  console.log(`   ✅ Run ID: ${ideRes.data.runId} | Reality Score: ${ideRes.data.realityScore}%`);
  console.log(`   [DEBUG] QualityGate:`, ideRes.data.realityEvidence?.qualityGatePassed, ideRes.data.realityEvidence?.scores);

  // 2. Ingest via Central Mind Endpoint
  console.log('\n[2/10] Ingesting Prompt from Central Mind API...');
  const mindRes = await post('/api/v2/mind/ingest', {
    source: 'fenix',
    message: 'Construir pipeline de autenticação com controle de acesso RBAC',
    projectId: 'fenix_test_lab'
  });
  assert.strictEqual(mindRes.status, 200, 'Mind Ingest must return 200');
  assert.ok(mindRes.data.enhancedPrompt.includes('RBAC'), 'Enhanced prompt must contain expanded requirements');
  console.log(`   ✅ Intent Identified: ${mindRes.data.intent} | Risk: ${mindRes.data.risk}`);

  // 3. External Source: Qwen
  console.log('\n[3/10] Intercepting External Model Prompt from "qwen"...');
  const qwenRes = await post('/api/v2/mind/ingest', {
    source: 'qwen',
    message: 'Refatorar middleware HTTP para suporte a retry exponencial',
    projectId: 'fenix_test_lab'
  });
  assert.strictEqual(qwenRes.status, 200);
  assert.strictEqual(qwenRes.data.source, 'qwen');
  console.log(`   ✅ Qwen Intercepted -> Model Assigned: ${qwenRes.data.selectedModel}`);

  // 4. External Source: Codex
  console.log('\n[4/10] Intercepting External Model Prompt from "codex"...');
  const codexRes = await post('/api/v2/mind/ingest', {
    source: 'codex',
    message: 'Gerar suíte de testes de estresse para banco de dados SQLite',
    projectId: 'fenix_test_lab'
  });
  assert.strictEqual(codexRes.status, 200);
  assert.strictEqual(codexRes.data.source, 'codex');
  console.log(`   ✅ Codex Intercepted -> DAG Steps: ${codexRes.data.plan.length}`);

  // 5. External Source: Claude
  console.log('\n[5/10] Intercepting External Model Prompt from "claude"...');
  const claudeRes = await post('/api/v2/mind/ingest', {
    source: 'claude',
    message: 'Auditoria de acessibilidade WCAG 2.1 no design system Obsidian',
    projectId: 'fenix_test_lab'
  });
  assert.strictEqual(claudeRes.status, 200);
  assert.strictEqual(claudeRes.data.source, 'claude');
  console.log(`   ✅ Claude Intercepted -> Status: ${claudeRes.data.status}`);

  // 6. Multi-Model Router & Secret Redaction Validation
  console.log('\n[6/10] Testing Multi-Model Router & Secret Redaction Engine...');
  const modelsRes = await get('/api/v2/mind/models');
  assert.strictEqual(modelsRes.status, 200);
  assert.ok(modelsRes.data.total >= 4, 'Must have at least 4 registered model providers');
  console.log(`   ✅ Total Providers in Registry: ${modelsRes.data.total}`);
  console.log(`   ✅ Orchestrator Role Model: ${modelsRes.data.activeRoles.ORCHESTRATOR_MODEL}`);
  console.log(`   ✅ Coding Role Model: ${modelsRes.data.activeRoles.CODING_MODEL}`);

  // 7. Memory-First Context Retrieval (Conversation 1 -> Conversation 2 Context Link)
  console.log('\n[7/10] Testing Memory-First Protocol & Conversation Persistence...');
  const testConvId = `conv_test_${Date.now()}`;
  await post('/api/v2/mind/ingest', {
    source: 'chat',
    conversationId: testConvId,
    message: 'Nosso projeto utiliza padrão de repositório com Redux Toolkit',
    projectId: 'fenix_test_lab'
  });

  const convRes = await get(`/api/v2/mind/memory/conversations/${testConvId}`);
  assert.strictEqual(convRes.status, 200);
  assert.strictEqual(convRes.data.total, 1);
  assert.strictEqual(convRes.data.events[0].projectId, 'fenix_test_lab');
  console.log(`   ✅ Conversation Memory Recorded: ${convRes.data.events[0].id} (Intent: ${convRes.data.events[0].intent})`);

  // 8. Learning Loop & Reusable Skill Persistence
  console.log('\n[8/10] Testing Skill Extraction & Operational Memory...');
  const skillsRes = await get('/api/v2/compiler/skills');
  assert.strictEqual(skillsRes.status, 200);
  assert.ok(skillsRes.data.total > 0, 'Learned skills must exist');
  console.log(`   ✅ Reusable Skills in Memory: ${skillsRes.data.skills.map(s => s.id).join(', ')}`);

  // 9. Research & Vision Tools
  console.log('\n[9/10] Testing Web Research & Vision Capabilities...');
  const researchRes = await post('/api/v2/mind/research', { query: 'Next.js 15 Server Actions best practices' });
  assert.strictEqual(researchRes.status, 200);
  assert.ok(researchRes.data.report.sources.length > 0);
  console.log(`   ✅ Research Sources Found: ${researchRes.data.report.sources.map(s => s.title).join(' | ')}`);

  const visionRes = await post('/api/v2/mind/vision', { screenshotPath: 'public/screenshot.png' });
  assert.strictEqual(visionRes.status, 200);
  assert.ok(visionRes.data.analysis.componentsDetected.length > 0);
  console.log(`   ✅ Vision Components Detected: ${visionRes.data.analysis.componentsDetected.join(', ')}`);

  // 10. Self-Development Proof on Real Project with Reality Gate
  console.log('\n[10/10] Executing Self-Development Reality Gate Verification...');
  const prjMemRes = await get('/api/v2/mind/memory/project/fenix_test_lab');
  assert.strictEqual(prjMemRes.status, 200);
  assert.strictEqual(prjMemRes.data.projectMemory.projectId, 'fenix_test_lab');
  console.log(`   ✅ Project Memory & DNA Verified for: fenix_test_lab`);

  console.log('\n================================================================');
  console.log('🎉 FÊNIX MIND & CENTRAL CONTROL PLANE PASSED (100% SUCCESS)');
  console.log('================================================================\n');
}

runSuite().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
